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

    // Search for businesses, prioritizing those without websites
    const searches = [
      `${query} ${zone} La Réunion adresse téléphone email -site web -www`,
      `${query} ${zone} 974 La Réunion site:pagesjaunes.fr`,
    ];

    console.log('Searching prospects with queries:', searches);

    const responses = await Promise.all(
      searches.map(async (q) => {
        const res = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: q,
            limit: 20,
            scrapeOptions: {
              formats: ['markdown'],
              onlyMainContent: true,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          console.error(`Firecrawl error [${res.status}]:`, JSON.stringify(data));
          if (res.status === 402) {
            throw new Error('Crédits Firecrawl insuffisants. Veuillez recharger votre compte Firecrawl ou connectez-vous avec le code promo LOVABLE50 pour 50% de réduction.');
          }
          throw new Error(data.error || `Firecrawl error: ${res.status}`);
        }
        return data;
      })
    );

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

  for (const result of results) {
    if (!result.title) continue;

    let businessName = result.title
      .replace(/ - Google Maps$/i, '')
      .replace(/ \| Pages Jaunes$/i, '')
      .replace(/ - Avis.*$/i, '')
      .replace(/ - Horaires.*$/i, '')
      .replace(/ à [\w-]+.*$/i, '')
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!businessName || businessName.length < 2) continue;

    const key = businessName.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, '');
    if (key.length < 2) continue;

    // Get or create prospect entry (merge data from multiple sources)
    const existing = prospectMap.get(key);
    const prospect: ParsedProspect = existing || {
      business_name: businessName,
      city: zone,
      sector: query,
      has_website: false,
    };

    const content = result.markdown || result.description || '';

    // --- Extract phone (French formats: 0X XX XX XX XX, +262 X XX XX XX XX) ---
    const phonePatterns = [
      /(?:\+262|0262)[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/,  // Réunion landline
      /(?:06|07)\d[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/,       // Mobile
      /(?:0[1-9])[\s.-]?(?:\d{2}[\s.-]?){4}/,                   // General French
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

    // --- Extract email ---
    if (!prospect.email) {
      const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        const email = emailMatch[0].toLowerCase();
        // Skip generic/spam emails
        if (!email.includes('example') && !email.includes('noreply') && !email.includes('pagesjaunes') && !email.includes('google')) {
          prospect.email = email;
        }
      }
    }

    // --- Extract address (multiple patterns for Réunion addresses) ---
    if (!prospect.address) {
      const addressPatterns = [
        // Numbered street addresses: "12 rue des Lilas, 97400 Saint-Denis"
        /(\d{1,4}[\s,]*(?:rue|avenue|ave|boulevard|blvd|chemin|impasse|allée|route|rte|place|lot|résidence|lotissement|zone|za|zi|zac)[^,\n]{3,60})/i,
        // Addresses with postal code: "97400 Saint-Denis" or similar
        /(\d{1,4}[^,\n]{3,40},?\s*974\d{2}\s+[A-ZÀ-Ÿ][\wÀ-ÿ-]+)/i,
        // Just postal code + city
        /(974\d{2}\s+[A-ZÀ-Ÿ][\wÀ-ÿ\s-]{2,30})/,
        // "Adresse :" pattern from structured pages
        /(?:adresse|localisation|situé)\s*[:\-–]\s*([^\n]{5,80})/i,
      ];
      for (const pattern of addressPatterns) {
        const match = content.match(pattern);
        if (match) {
          let addr = (match[1] || match[0]).trim();
          // Clean up trailing punctuation
          addr = addr.replace(/[,;.]+$/, '').trim();
          if (addr.length >= 5 && addr.length <= 120) {
            prospect.address = addr;
            break;
          }
        }
      }
    }

    // --- Extract rating ---
    if (!prospect.rating) {
      const ratingPatterns = [
        /(\d[.,]\d)\s*(?:\/\s*5|étoile|star|★)/i,
        /note\s*[:\-–]?\s*(\d[.,]\d)/i,
        /(\d[.,]\d)\s*sur\s*5/i,
      ];
      for (const pattern of ratingPatterns) {
        const match = content.match(pattern);
        if (match) {
          prospect.rating = parseFloat(match[1].replace(',', '.'));
          break;
        }
      }
    }

    // --- Extract reviews count ---
    if (!prospect.reviews_count) {
      const reviewsMatch = content.match(/(\d+)\s*(?:avis|review|commentaire|note)/i);
      if (reviewsMatch) {
        prospect.reviews_count = parseInt(reviewsMatch[1]);
      }
    }

    // --- Google Maps URL ---
    if (!prospect.google_maps_url && result.url?.includes('google.com/maps')) {
      prospect.google_maps_url = result.url;
    }

    // --- Website ---
    if (!prospect.website) {
      const urlMatch = content.match(/(?:site\s*(?:web|internet)?\s*[:\-–]?\s*)?(?:https?:\/\/|www\.)([\w.-]+\.[a-z]{2,}(?:\/[\w.-]*)?)/i);
      if (urlMatch) {
        const domain = urlMatch[1].toLowerCase();
        if (!domain.includes('google') && !domain.includes('pagesjaunes') && !domain.includes('facebook') && !domain.includes('instagram')) {
          prospect.website = domain.startsWith('http') ? domain : `https://${domain}`;
          prospect.has_website = true;
        }
      }
    }

    prospectMap.set(key, prospect);
  }

  // Filter: only keep prospects with at least an address or phone
  return Array.from(prospectMap.values()).filter(
    (p) => p.address || p.phone || p.email
  );
}
