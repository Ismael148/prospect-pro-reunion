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

    // Two targeted searches: Google Maps (best for businesses without websites) + general
    const searchQueries = [
      `site:google.com/maps ${query} ${zone} La Réunion`,
      `${query} ${zone} La Réunion téléphone adresse -site:facebook.com -site:instagram.com`,
    ];

    console.log('Searching prospects with queries:', searchQueries);

    const responses: any[] = [];
    for (const sq of searchQueries) {
      try {
        const res = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: sq,
            limit: 20,
          }),
        });
        const searchData = await res.json();
        if (!res.ok) {
          console.error(`Firecrawl error [${res.status}] for query "${sq}":`, JSON.stringify(searchData));
          if (res.status === 402) {
            throw new Error('Crédits Firecrawl insuffisants. Veuillez recharger votre compte Firecrawl.');
          }
          continue; // Skip this query but try the next one
        }
        responses.push(searchData);
      } catch (e) {
        if (e instanceof Error && e.message.includes('Crédits')) throw e;
        console.error(`Search query failed: "${sq}"`, e);
      }
    }

    if (responses.length === 0) {
      throw new Error('Aucun résultat de recherche disponible');
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
  phone?: string;
  city?: string;
  sector?: string;
  has_website: boolean;
  google_maps_url?: string;
  source_url?: string;
  source_platform?: string;
}

function parseSearchResults(results: SearchResult[], query: string, zone: string): ParsedProspect[] {
  const prospectMap = new Map<string, ParsedProspect>();

  // Directories/aggregators to ignore
  const skipDomains = ['pagesjaunes', 'alentoor', 'kelest', 'facebook.com', 'instagram.com', 'tripadvisor', 'yelp', 'linternaute', 'justacote', 'horaires.lefigaro'];

  for (const result of results) {
    if (!result.title) continue;

    const url = (result.url || '').toLowerCase();

    // Skip directory pages (but allow google.com/maps)
    if (skipDomains.some(d => url.includes(d))) continue;

    // Skip aggregator titles
    const titleLower = result.title.toLowerCase();
    if (titleLower.includes('meilleures') || titleLower.includes('top ') || titleLower.includes('annuaire') || titleLower.includes('liste des')) continue;

    // Clean business name
    let businessName = result.title
      .replace(/ - Google Maps$/i, '')
      .replace(/ · .*$/i, '')
      .replace(/ - Avis.*$/i, '')
      .replace(/ - Horaires.*$/i, '')
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!businessName || businessName.length < 2) continue;

    const key = businessName.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, '');
    if (key.length < 2) continue;

    const existing = prospectMap.get(key);
    // Detect platform from URL
    const platform = detectPlatform(url);

    const prospect: ParsedProspect = existing || {
      business_name: businessName,
      city: zone,
      sector: query,
      has_website: false,
      source_url: result.url || undefined,
      source_platform: platform,
    };

    const content = result.markdown || result.description || '';

    // Extract phone
    if (!prospect.phone) {
      const phonePatterns = [
        /(?:\+262|0262)[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/,
        /(?:06|07)\d[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/,
        /(?:0[1-9])[\s.-]?(?:\d{2}[\s.-]?){4}/,
      ];
      for (const pattern of phonePatterns) {
        const match = content.match(pattern);
        if (match) {
          prospect.phone = match[0].replace(/[\s.-]/g, '');
          break;
        }
    }

    // Extract address from content
    if (!prospect.address) {
      const addressPatterns = [
        // Full address with postal code: "12 rue des Lilas, 97410 Saint-Pierre"
        /(\d{1,4}[\s,]*(?:rue|avenue|ave|boulevard|blvd|chemin|impasse|allée|route|rte|place|lot|résidence|lotissement|zone|za|zi|zac)[^,\n]{3,60},?\s*974\d{2}\s+[A-ZÀ-Ÿ][\wÀ-ÿ\s-]{2,30})/i,
        // Street + postal code
        /(\d{1,4}[\s,]*(?:rue|avenue|ave|boulevard|blvd|chemin|impasse|allée|route|rte|place|lot)[^,\n]{3,60})/i,
        // Postal code + city
        /(974\d{2}\s+[A-ZÀ-Ÿ][\wÀ-ÿ\s-]{2,30})/,
      ];
      for (const pattern of addressPatterns) {
        const match = content.match(pattern);
        if (match) {
          let addr = (match[1] || match[0]).trim().replace(/[,;.]+$/, '').trim();
          if (addr.length >= 5 && addr.length <= 120) {
            prospect.address = addr;
            break;
          }
        }
      }
    }
    }

    // Google Maps URL
    if (!prospect.google_maps_url && url.includes('google.com/maps')) {
      prospect.google_maps_url = result.url;
    }

    // Detect website (to filter out businesses that already have one)
    if (!prospect.has_website) {
      const siteMatch = content.match(/(?:site\s*(?:web|internet)?\s*[:\-–]?\s*)?(?:https?:\/\/|www\.)([\w.-]+\.[a-z]{2,})/i);
      if (siteMatch) {
        const domain = siteMatch[1].toLowerCase();
        if (!domain.includes('google') && !skipDomains.some(d => domain.includes(d))) {
          prospect.has_website = true;
        }
      }
    }

    prospectMap.set(key, prospect);
  }

  // Only businesses WITHOUT a website and WITH a phone
  return Array.from(prospectMap.values()).filter(
    (p) => !p.has_website && p.phone
  );
}

function detectPlatform(url: string): string {
  if (url.includes('google.com/maps') || url.includes('goo.gl/maps')) return 'google_maps';
  if (url.includes('facebook.com')) return 'facebook';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('pagesjaunes.fr')) return 'pagesjaunes';
  if (url.includes('tripadvisor')) return 'tripadvisor';
  if (url.includes('yelp.com')) return 'yelp';
  return 'web';
}
