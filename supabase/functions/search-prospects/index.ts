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

    // Use Firecrawl search with scrapeOptions to get full page content (phones, addresses)
    const searchQueries = [
      `${query} ${zone} La Réunion téléphone adresse`,
      `${query} ${zone} 974 annuaire téléphone`,
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
            limit: 10,
            scrapeOptions: {
              formats: ['markdown'],
              onlyMainContent: true,
            },
          }),
        });
        const searchData = await res.json();
        if (!res.ok) {
          console.error(`Firecrawl error [${res.status}] for query "${sq}":`, JSON.stringify(searchData));
          if (res.status === 402) {
            throw new Error('Crédits Firecrawl insuffisants. Veuillez recharger votre compte Firecrawl.');
          }
          continue;
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
  phone?: string;
  city?: string;
  sector?: string;
  has_website: boolean;
  google_maps_url?: string;
  source_url?: string;
  source_platform?: string;
}

// Phone patterns for La Réunion (0262, 0692, 0693, 06xx, 07xx)
const PHONE_PATTERNS = [
  /(?:\+262|0262)[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/g,
  /(?:0693|0692|0691|0690)[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/g,
  /(?:06|07)\d[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/g,
  /(?:0[1-9])[\s.-]?(?:\d{2}[\s.-]?){4}/g,
];

// Directories/aggregators to skip as source but NOT to flag as "has website"
const DIRECTORY_DOMAINS = [
  'pagesjaunes', 'alentoor', 'kelest', 'facebook.com', 'instagram.com',
  'tripadvisor', 'yelp', 'linternaute', 'justacote', 'horaires.lefigaro',
  'youtube.com', 'twitter.com', 'tiktok.com', 'linkedin.com', 'mappy.com',
  'laposte.fr', 'societe.com', 'infogreffe', 'verif.com', 'annuaire',
  'kompass', 'europages', 'cylex', 'starofservice', 'habitatpresto',
  'houzz', 'hellowork', 'google.com', 'goo.gl', 'gralon.net',
  'local.fr', 'magicmaman.com', 'lejournaldesentreprises', 'manageo.fr',
];

function isDirectoryUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return DIRECTORY_DOMAINS.some(d => lower.includes(d));
}

function extractPhones(content: string): string[] {
  const phones: string[] = [];
  for (const pattern of PHONE_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      for (const m of matches) {
        const cleaned = m.replace(/[\s.-]/g, '');
        if (cleaned.length >= 10 && !phones.includes(cleaned)) {
          phones.push(cleaned);
        }
      }
    }
  }
  return phones;
}

function extractBusinessNames(content: string, query: string): string[] {
  // Try to find business names in markdown content (typically bold or headings)
  const names: string[] = [];
  const headingPattern = /^#{1,3}\s+(.+)$/gm;
  const boldPattern = /\*\*([^*]{3,60})\*\*/g;

  let match;
  while ((match = headingPattern.exec(content)) !== null) {
    const name = match[1].trim();
    if (name.length >= 3 && name.length <= 80 && !name.toLowerCase().includes('avis') && !name.toLowerCase().includes('annuaire')) {
      names.push(name);
    }
  }
  while ((match = boldPattern.exec(content)) !== null) {
    const name = match[1].trim();
    if (name.length >= 3 && name.length <= 80) {
      names.push(name);
    }
  }
  return names;
}

function parseSearchResults(results: SearchResult[], query: string, zone: string): ParsedProspect[] {
  const prospectMap = new Map<string, ParsedProspect>();

  for (const result of results) {
    if (!result.title) continue;

    const url = (result.url || '').toLowerCase();
    const titleLower = result.title.toLowerCase();

    // Skip aggregator listing pages
    if (titleLower.includes('meilleures') || titleLower.includes('top ') ||
        titleLower.includes('annuaire') || titleLower.includes('liste des') ||
        titleLower.includes('comparatif') || titleLower.includes('classement')) continue;

    const content = result.markdown || result.description || '';
    const isFromDirectory = isDirectoryUrl(url) || url.includes('google.com/maps');

    // ── Strategy 1: Extract individual businesses from directory pages ──
    if (isFromDirectory && content.length > 100) {
      // Directory pages often list multiple businesses — extract them
      const phones = extractPhones(content);
      const businessNames = extractBusinessNames(content, query);

      // Also look for business entries in structured format: "Name - phone"
      const entryPattern = /(?:^|\n)\s*(?:\d+[\.\)]\s*)?([A-ZÀ-Ÿ][A-Za-zÀ-ÿ\s&'-]{2,50})[\s–—-]+(?:.*?)((?:0262|0692|0693|06|07)\d[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2})/gm;
      let entryMatch;
      while ((entryMatch = entryPattern.exec(content)) !== null) {
        const bName = entryMatch[1].trim();
        const bPhone = entryMatch[2].replace(/[\s.-]/g, '');
        const key = bName.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, '');
        if (key.length >= 3 && !prospectMap.has(key)) {
          prospectMap.set(key, {
            business_name: bName,
            phone: bPhone,
            city: zone,
            sector: query,
            has_website: false,
            source_url: result.url || undefined,
            source_platform: detectPlatform(url),
          });
        }
      }

      // For phones found in content, try to associate with business names
      if (phones.length > 0 && businessNames.length > 0) {
        const minLen = Math.min(phones.length, businessNames.length);
        for (let i = 0; i < minLen; i++) {
          const key = businessNames[i].toLowerCase().replace(/[^a-zà-ÿ0-9]/g, '');
          if (key.length >= 3 && !prospectMap.has(key)) {
            prospectMap.set(key, {
              business_name: businessNames[i],
              phone: phones[i],
              city: zone,
              sector: query,
              has_website: false,
              source_url: result.url || undefined,
              source_platform: detectPlatform(url),
            });
          }
        }
      }

      // If only phones found (no structured names), use the page title as hint
      if (phones.length > 0 && prospectMap.size === 0) {
        // Just grab the first phone with a cleaned title
        let cleanTitle = result.title
          .replace(/\s*[-–—|]\s*Pages Jaunes.*$/i, '')
          .replace(/\s*[-–—|]\s*Annuaire.*$/i, '')
          .replace(/\s*[-–—|]\s*\d+\s*résultats?.*$/i, '')
          .trim();
        if (cleanTitle.length >= 3) {
          const key = cleanTitle.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, '');
          if (key.length >= 3 && !prospectMap.has(key)) {
            prospectMap.set(key, {
              business_name: cleanTitle,
              phone: phones[0],
              city: zone,
              sector: query,
              has_website: false,
              source_url: result.url || undefined,
              source_platform: detectPlatform(url),
            });
          }
        }
      }
      continue;
    }

    // ── Strategy 2: Non-directory result = individual business page ──
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
    const platform = detectPlatform(url);

    const prospect: ParsedProspect = existing || {
      business_name: businessName,
      city: zone,
      sector: query,
      has_website: false,
      source_url: result.url || undefined,
      source_platform: platform,
    };

    // Extract phone from content
    if (!prospect.phone) {
      const phones = extractPhones(content);
      if (phones.length > 0) {
        prospect.phone = phones[0];
      }
    }

    // Extract address
    if (!prospect.address) {
      const addressPatterns = [
        /(\d{1,4}[\s,]*(?:rue|avenue|ave|boulevard|blvd|chemin|impasse|allée|route|rte|place|lot|résidence|lotissement|zone|za|zi|zac)[^,\n]{3,60},?\s*974\d{2}\s+[A-ZÀ-Ÿ][\wÀ-ÿ\s-]{2,30})/i,
        /(\d{1,4}[\s,]*(?:rue|avenue|ave|boulevard|blvd|chemin|impasse|allée|route|rte|place|lot)[^,\n]{3,60})/i,
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

    // Google Maps URL
    if (!prospect.google_maps_url && url.includes('google.com/maps')) {
      prospect.google_maps_url = result.url;
    }

    // Website detection — ONLY check actual content for explicit website mentions
    // Do NOT flag a result's own URL as "having a website" (the search result URL is not the business's site)
    if (!prospect.has_website) {
      const websitePatterns = [
        /(?:site\s*(?:web|internet)?\s*[:\-–]?\s*)((?:https?:\/\/|www\.)([\w.-]+\.[a-z]{2,}))/i,
        /(?:visitez|voir|consulter|découvrir)\s+(?:notre|le|mon)\s+site/i,
      ];
      for (const pattern of websitePatterns) {
        const match = content.match(pattern);
        if (match) {
          const domain = (match[2] || match[1] || '').toLowerCase();
          const ignoreDomains = ['google', 'goo.gl', 'facebook', 'instagram', 'youtube', 'twitter', 'tiktok', ...DIRECTORY_DOMAINS];
          if (domain && !ignoreDomains.some(d => domain.includes(d))) {
            prospect.has_website = true;
            break;
          }
        }
      }
    }

    prospectMap.set(key, prospect);
  }

  // Return ALL found businesses — include those with or without phone
  // Sort: with phone first, then without
  const all = Array.from(prospectMap.values());
  all.sort((a, b) => {
    if (a.phone && !b.phone) return -1;
    if (!a.phone && b.phone) return 1;
    return 0;
  });

  console.log(`Parsed stats: total=${all.length}, with_phone=${all.filter(p => p.phone).length}, has_website=${all.filter(p => p.has_website).length}`);

  return all;
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
