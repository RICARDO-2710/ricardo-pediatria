import type { NextApiRequest, NextApiResponse } from "next";

type MedicineOffer = {
  title: string;
  price: number;
  storeName: string;
  url: string;
};

type MedicineSearchResponse = {
  query: string;
  lowestPrice: MedicineOffer | null;
  offers: MedicineOffer[];
  priceWarning?: string | null;
  leaflet: {
    title: string;
    summary: string;
    sourceUrl: string;
  } | null;
  leafletSearchUrl: string;
};

function normalizeQuery(value: string) {
  return (value || "").trim();
}

function buildLeafletSearchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(`bula ${query} anvisa`)}`;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildQueryTokens(query: string) {
  return normalizeText(query)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

function titleLooksRelatedToQuery(title: string, query: string) {
  const normalizedTitle = normalizeText(title);
  const tokens = buildQueryTokens(query);
  if (tokens.length === 0) return true;
  return tokens.some((token) => normalizedTitle.includes(token));
}

function normalizeStoreName(value: string) {
  return normalizeText(value);
}

function isTargetStore(storeName: string) {
  const normalized = normalizeStoreName(storeName);
  return (
    normalized.includes("drogasil") ||
    normalized.includes("pague menos") ||
    normalized.includes("paguemenos") ||
    normalized.includes("farmacias pague menos")
  );
}

function dedupeAndSortOffers(offers: MedicineOffer[]) {
  const dedupe = new Set<string>();
  const unique: MedicineOffer[] = [];

  for (const offer of offers) {
    const key = `${offer.url}__${normalizeStoreName(offer.storeName)}__${offer.price}`;
    if (dedupe.has(key)) continue;
    dedupe.add(key);
    unique.push(offer);
  }

  unique.sort((a, b) => a.price - b.price);
  return unique;
}

async function fetchPagueMenosOffers(query: string): Promise<MedicineOffer[]> {
  const endpoint = `https://www.paguemenos.com.br/api/io/_v/api/intelligent-search/product_search/trade-policy/1?query=${encodeURIComponent(
    query
  )}`;
  const res = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ricardo-pediatria/1.0 (+medicine-search)",
    },
  });

  if (!res.ok) {
    throw new Error(`Falha ao consultar Pague Menos (HTTP ${res.status})`);
  }

  const payload = (await res.json()) as any;
  const products = Array.isArray(payload?.products) ? payload.products : [];
  const offers: MedicineOffer[] = [];

  for (const product of products) {
    const title = String(product?.productName || "Oferta sem título").trim();
    if (!titleLooksRelatedToQuery(title, query)) continue;

    const link = String(product?.link || "").trim();
    const url = link
      ? link.startsWith("http")
        ? link
        : `https://www.paguemenos.com.br${link}`
      : "";
    if (!url) continue;

    const items = Array.isArray(product?.items) ? product.items : [];
    for (const item of items) {
      const sellers = Array.isArray(item?.sellers) ? item.sellers : [];
      for (const seller of sellers) {
        const sellerName = String(seller?.sellerName || "Farmácias Pague Menos").trim();
        if (!isTargetStore(sellerName)) continue;

        const price = Number(seller?.commertialOffer?.Price ?? NaN);
        if (!Number.isFinite(price) || price <= 0) continue;

        offers.push({
          title,
          price,
          storeName: sellerName,
          url,
        });
      }
    }
  }

  return dedupeAndSortOffers(offers);
}

async function fetchMarketOffersFromConsultaRemedios(query: string): Promise<MedicineOffer[]> {
  const endpoint = `https://www.consultaremedios.com.br/busca?termo=${encodeURIComponent(query)}`;

  const res = await fetch(endpoint, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "ricardo-pediatria/1.0 (+medicine-search)",
    },
  });

  if (!res.ok) {
    throw new Error(`Falha ao consultar Consulta Remédios (HTTP ${res.status})`);
  }

  const html = await res.text();

  const blockRegex =
    /"value":"(\/[^"\\]*\/p)"[\s\S]{0,1600}?"sellerName":"([^"\\]*(?:\\.[^"\\]*)*)"[\s\S]{0,1400}?"price":(\d+(?:\.\d+)?)/gi;

  const clean = (value: string) =>
    value
      .replace(/\\\//g, "/")
      .replace(/\\"/g, '"')
      .replace(/\\u0026/g, "&")
      .trim();

  const titleFromHref = (href: string) => {
    const normalized = href.replace(/^https?:\/\/[^/]+/i, "");
    const segments = normalized.split("/").filter(Boolean);
    const slug = segments[0] || "medicamento";
    return slug
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const parsed: MedicineOffer[] = [];
  const dedupe = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(html)) !== null) {
    const href = clean(match[1] || "");
    const storeName = clean(match[2] || "");
    const price = Number(match[3]);

    if (!href || !storeName) continue;
    if (!isTargetStore(storeName)) continue;
    if (!Number.isFinite(price) || price <= 0) continue;

    const url = href.startsWith("http") ? href : `https://www.consultaremedios.com.br${href}`;
    const title = titleFromHref(url);
    const dedupeKey = `${url}__${storeName}__${price}`;
    if (dedupe.has(dedupeKey)) continue;
    dedupe.add(dedupeKey);

    parsed.push({
      title,
      price,
      storeName,
      url,
    });

    if (parsed.length >= 30) break;
  }

  return dedupeAndSortOffers(parsed);
}

function buildOpenFdaSearchVariants(query: string) {
  const escaped = query.replace(/"/g, "").trim();
  return [
    `openfda.brand_name:\"${escaped}\"`,
    `openfda.generic_name:\"${escaped}\"`,
  ];
}

function pickLeafletSummary(row: any): string {
  const first = (value: any) => {
    if (Array.isArray(value) && value[0]) return String(value[0]);
    return "";
  };

  const chunks = [
    first(row?.indications_and_usage),
    first(row?.dosage_and_administration),
    first(row?.warnings),
  ]
    .map((s) => s.trim())
    .filter(Boolean);

  const merged = chunks.join("\n\n").slice(0, 1800);
  return merged || "Resumo de bula indisponível para esse medicamento.";
}

async function fetchLeaflet(query: string): Promise<MedicineSearchResponse["leaflet"]> {
  const variants = buildOpenFdaSearchVariants(query);

  for (const variant of variants) {
    const endpoint = `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(variant)}&limit=1`;
    const res = await fetch(endpoint);

    if (!res.ok) {
      continue;
    }

    const data = (await res.json()) as any;
    const row = Array.isArray(data?.results) ? data.results[0] : null;
    if (!row) continue;

    const title =
      (Array.isArray(row?.openfda?.brand_name) && row.openfda.brand_name[0]) ||
      (Array.isArray(row?.openfda?.generic_name) && row.openfda.generic_name[0]) ||
      query;

    return {
      title: String(title),
      summary: pickLeafletSummary(row),
      sourceUrl: "https://open.fda.gov/apis/drug/label/",
    };
  }

  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query = normalizeQuery(String((req.body as any)?.query || ""));
  if (!query) {
    return res.status(400).json({ error: "Informe o nome do medicamento." });
  }

  try {
    let offers: MedicineOffer[] = [];
    let priceWarning: string | null = null;
    const gathered: MedicineOffer[] = [];
    const providerWarnings: string[] = [];

    try {
      const pagueMenosOffers = await fetchPagueMenosOffers(query);
      gathered.push(...pagueMenosOffers);
    } catch (priceErr) {
      console.error("medicine-search pague menos provider failed", priceErr);
      providerWarnings.push("Pague Menos indisponível no momento");
    }

    try {
      const consultaRemediosOffers = await fetchMarketOffersFromConsultaRemedios(query);
      gathered.push(...consultaRemediosOffers);
    } catch (priceErr) {
      console.error("medicine-search consulta remedios provider failed", priceErr);
      providerWarnings.push("Drogasil indisponível no momento");
    }

    offers = dedupeAndSortOffers(gathered);
    if (offers.length === 0) {
      priceWarning =
        "Não encontrei preços em Drogasil ou Pague Menos para esse medicamento no momento." +
        (providerWarnings.length ? ` (${providerWarnings.join("; ")})` : "");
    } else if (providerWarnings.length) {
      priceWarning = `Resultados parciais: ${providerWarnings.join("; ")}.`;
    }

    let leaflet: MedicineSearchResponse["leaflet"] = null;
    try {
      leaflet = await fetchLeaflet(query);
    } catch (leafletErr) {
      console.error("medicine-search leaflet provider failed", leafletErr);
      leaflet = null;
    }

    const payload: MedicineSearchResponse = {
      query,
      lowestPrice: offers[0] || null,
      offers,
      priceWarning,
      leaflet,
      leafletSearchUrl: buildLeafletSearchUrl(query),
    };

    return res.status(200).json(payload);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Falha ao buscar medicamento" });
  }
}
