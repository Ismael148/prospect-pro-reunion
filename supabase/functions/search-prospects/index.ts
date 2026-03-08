const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
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

    // Use Firecrawl search to find businesses on Google Maps
    const searchQuery = `${query} ${zone} La Réunion site:google.com/maps OR site:pagesjaunes.fr`;

    console.log('Searching prospects:', searchQuery);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 20,
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Erreur Firecrawl: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the results to extract business information
    const prospects = parseSearchResults(data.data || [], query, zone);

    console.log(`Found ${prospects.length} prospects`);

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
  website?: string;
  sector?: string;
  rating?: number;
  reviews_count?: number;
  google_maps_url?: string;
}

function parseSearchResults(results: SearchResult[], query: string, zone: string): ParsedProspect[] {
  const prospects: ParsedProspect[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    if (!result.title) continue;

    // Clean the title to get business name
    let businessName = result.title
      .replace(/ - Google Maps$/i, '')
      .replace(/ \| Pages Jaunes$/i, '')
      .replace(/ - Avis.*$/i, '')
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .trim();

    if (!businessName || businessName.length < 2) continue;

    // Dedupe
    const key = businessName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const prospect: ParsedProspect = {
      business_name: businessName,
      city: zone,
      sector: query,
    };

    // Extract info from markdown content
    const content = result.markdown || result.description || '';

    // Try to extract phone number (French format)
    const phoneMatch = content.match(/(?:0[1-9])[\s.-]?(?:\d{2}[\s.-]?){4}/);
    if (phoneMatch) {
      prospect.phone = phoneMatch[0].replace(/[\s.-]/g, '');
    }

    // Try to extract rating
    const ratingMatch = content.match(/(\d[.,]\d)\s*(?:\/\s*5|étoile|star)/i);
    if (ratingMatch) {
      prospect.rating = parseFloat(ratingMatch[1].replace(',', '.'));
    }

    // Try to extract reviews count
    const reviewsMatch = content.match(/(\d+)\s*(?:avis|review|commentaire)/i);
    if (reviewsMatch) {
      prospect.reviews_count = parseInt(reviewsMatch[1]);
    }

    // Extract address patterns
    const addressMatch = content.match(/(\d+[^,\n]{5,50}(?:rue|avenue|boulevard|chemin|impasse|allée|route|place|lot)[^,\n]{3,50})/i);
    if (addressMatch) {
      prospect.address = addressMatch[1].trim();
    }

    // Google Maps URL
    if (result.url?.includes('google.com/maps')) {
      prospect.google_maps_url = result.url;
    }

    // Website from description
    const urlMatch = content.match(/(?:www\.|https?:\/\/)([^\s,]+\.[a-z]{2,})/i);
    if (urlMatch && !urlMatch[0].includes('google') && !urlMatch[0].includes('pagesjaunes')) {
      prospect.website = urlMatch[0].startsWith('http') ? urlMatch[0] : `https://${urlMatch[0]}`;
    }

    prospects.push(prospect);
  }

  return prospects;
}
