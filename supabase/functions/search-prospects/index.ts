const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { query, zone } = await req.json();

    if (!query || !zone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query et zone sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl non configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search for businesses - single optimized query to save credits
    const searchQuery = `${query} ${zone} La Réunion adresse téléphone`;

    console.log('Searching prospects with query:', searchQuery);

    const res = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 30,
      }),
    });
    const searchData = await res.json();
    if (!res.ok) {
      console.error(`Firecrawl error [${res.status}]:`, JSON.stringify(searchData));
      if (res.status === 402) {
        throw new Error('Crédits Firecrawl insuffisants. Veuillez recharger votre compte Firecrawl ou connectez-vous avec le code promo LOVABLE50 pour 50% de réduction.');
      }
      throw new Error(searchData.error || `Firecrawl error: ${res.status}`);
    }

    const responses = [searchData];

    // Merge results from both searches
    const allResults: SearchResult[] = [];
    for (const data of responses) {
      if (data.data) {
        allResults.push(...data.data);
      }
    }

    console.log(`Raw results: ${allResults.length}`);

    const prospects = parseSearchResults(allResults, query, zone);

    console.log(`Parsed ${prospects.length} prospects`);

    return new Response(
      JSON.stringify({ success: true, prospects }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error searching prospects:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface SearchResult {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string;
}

interface ParsedProspect {
  business_name: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  has_website: boolean;
  sector?: string;
  rating?: number;
  reviews_count?: number;
  google_maps_url?: string;
}

function parseSearchResults(results: SearchResult[], query: string, zone: string): ParsedProspect[] {
  const prospectMap = new Map<string, ParsedProspect>();

  // Skip aggregator/directory pages
  const skipDomains = ['pagesjaunes', 'google.com/maps', 'alentoor', 'kelest', 'facebook', 'instagram', 'tripadvisor', 'yelp', 'reunion.fr', 'linternaute', 'justacote'];

  for (const result of results) {
    if (!result.title) continue;

    // Skip directory/aggregator results
    const url = (result.url || '').toLowerCase();
    if (skipDomains.some(d => url.includes(d))) continue;

    // Skip titles that look like directories
    const titleLower = result.title.toLowerCase();
    if (titleLower.includes('meilleures') || titleLower.includes('top ') || titleLower.includes('annuaire') || titleLower.includes('liste des')) continue;

    let businessName = result.title
      .replace(/ - Google Maps$/i, '')
      .replace(/ \| Pages Jaunes$/i, '')
      .replace(/ - Avis.*$/i, '')
      .replace(/ - Horaires.*$/i, '')
      .replace(/ - Instagram$/i, '')
      .replace(/ - Facebook$/i, '')
      .replace(/ à [\w-]+.*$/i, '')
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s*[|–—].*$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!businessName || businessName.length < 2) continue;

    const key = businessName.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, '');
    if (key.length < 2) continue;

    const existing = prospectMap.get(key);
    const prospect: ParsedProspect = existing || {
      business_name: businessName,
      city: zone,
      sector: query,
      has_website: false,
    };

    const content = result.markdown || result.description || '';

    // Extract phone
    const phonePatterns = [
      /(?:\+262|0262)[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/,
      /(?:06|07)\d[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/,
      /(?:0[1-9])[\s.-]?(?:\d{2}[\s.-]?){4}/,
    ];
    if (!prospect.phone) {
      for (const pattern of phonePatterns) {
        const match = content.match(pattern);
        if (match) {
          prospect.phone = match[0].replace(/[\s.-]/g, '');
          break;
        }
      }
    }

    // Detect if business has a website
    if (!prospect.has_website) {
      const urlMatch = content.match(/(?:site\s*(?:web|internet)?\s*[:\-–]?\s*)?(?:https?:\/\/|www\.)([\w.-]+\.[a-z]{2,})/i);
      if (urlMatch) {
        const domain = urlMatch[1].toLowerCase();
        if (!skipDomains.some(d => domain.includes(d))) {
          prospect.has_website = true;
        }
      }
    }

    prospectMap.set(key, prospect);
  }

  // Only return businesses WITHOUT a website and WITH a phone number
  return Array.from(prospectMap.values()).filter(
    (p) => !p.has_website && p.phone
  );
}
