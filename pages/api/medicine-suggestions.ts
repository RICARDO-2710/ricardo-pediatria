import type { NextApiRequest, NextApiResponse } from "next";

type MedicineSuggestionsResponse = {
  query: string;
  suggestions: string[];
};

const LOCAL_MEDICINE_CATALOG = [
  "Amoxicilina",
  "Amoxicilina + Clavulanato",
  "Ampicilina",
  "Azitromicina",
  "Claritromicina",
  "Eritromicina",
  "Cefalexina",
  "Cefadroxila",
  "Ceftriaxona",
  "Cefuroxima",
  "Cefepima",
  "Penicilina benzatina",
  "Sulfametoxazol + Trimetoprima",
  "Clindamicina",
  "Metronidazol",
  "Nitrofurantoína",
  "Albendazol",
  "Mebendazol",
  "Ivermectina",
  "Oseltamivir",
  "Aciclovir",
  "Paracetamol",
  "Dipirona",
  "Ibuprofeno",
  "Naproxeno",
  "Cetoprofeno",
  "Diclofenaco",
  "Prednisolona",
  "Prednisona",
  "Dexametasona",
  "Hidrocortisona",
  "Budesonida",
  "Beclometasona",
  "Salbutamol",
  "Fenoterol",
  "Ipratrópio",
  "Montelucaste",
  "Loratadina",
  "Desloratadina",
  "Cetirizina",
  "Levocetirizina",
  "Dexclorfeniramina",
  "Prometazina",
  "Dimenidrinato",
  "Ondansetrona",
  "Domperidona",
  "Bromoprida",
  "Omeprazol",
  "Lansoprazol",
  "Pantoprazol",
  "Esomeprazol",
  "Famotidina",
  "Hidróxido de alumínio",
  "Simeticona",
  "Racecadotrila",
  "Sais para reidratação oral",
  "Lactulose",
  "Polietilenoglicol",
  "Bisacodil",
  "Picossulfato de sódio",
  "Óleo mineral",
  "Vitamina D",
  "Vitamina C",
  "Sulfato ferroso",
  "Ácido fólico",
  "Complexo B",
  "Cálcio carbonato",
  "Zinco",
  "Multivitamínico pediátrico",
  "Levodropropizina",
  "Dropropizina",
  "Acetilcisteína",
  "Ambroxol",
  "Bromexina",
  "Carbocisteína",
  "Guaifenesina",
  "Nimesulida",
  "Clonazepam",
  "Diazepam",
  "Midazolam",
  "Valproato de sódio",
  "Carbamazepina",
  "Oxcarbazepina",
  "Levetiracetam",
  "Fenobarbital",
  "Fenitoína",
  "Topiramato",
  "Lamotrigina",
  "Risperidona",
  "Quetiapina",
  "Aripiprazol",
  "Fluoxetina",
  "Sertralina",
  "Escitalopram",
  "Metilfenidato",
  "Atomoxetina",
  "Clonidina",
  "Enalapril",
  "Captopril",
  "Losartana",
  "Amlodipino",
  "Propranolol",
  "Furosemida",
  "Hidroclorotiazida",
  "Espironolactona",
  "Digoxina",
  "Insulina regular",
  "Insulina NPH",
  "Insulina glargina",
  "Metformina",
  "Glibenclamida",
  "Levotiroxina",
  "Metimazol",
  "Propiltiouracil",
  "Hidroxicloroquina",
  "Azatioprina",
  "Metotrexato",
  "Ciclosporina",
  "Tacrolimo",
  "Mupirocina",
  "Neomicina + Bacitracina",
  "Fusidato de sódio",
  "Cetoconazol",
  "Miconazol",
  "Fluconazol",
  "Itraconazol",
  "Nistatina",
  "Permetrina",
  "Benzoato de benzila",
  "Óxido de zinco",
  "Hidrocortisona creme",
  "Betametasona creme",
  "Tacrolimo pomada",
  "Pimecrolimo",
  "Colagenase",
  "Curativo de prata",
  "Timolol colírio",
  "Tobramicina colírio",
  "Ciprofloxacino colírio",
  "Dexametasona colírio",
  "Lubrificante ocular",
  "Soro fisiológico nasal",
  "Budesonida nasal",
  "Mometasona nasal",
  "Oximetazolina",
  "Fenilefrina",
  "Amoxicilina suspensão oral",
  "Azitromicina suspensão oral",
  "Ibuprofeno gotas",
  "Paracetamol gotas",
  "Dipirona gotas",
  "Loratadina xarope",
  "Cetirizina gotas",
  "Prednisolona solução oral",
  "Montelucaste sachê",
  "Sulfato ferroso gotas",
  "Vitamina D gotas",
];

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function rankAndFilterSuggestions(query: string, allSuggestions: string[]) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  const dedupe = new Set<string>();
  const filtered = allSuggestions
    .map((name) => String(name || "").trim())
    .filter(Boolean)
    .filter((name) => {
      const key = normalizeText(name);
      if (!key || dedupe.has(key)) return false;
      dedupe.add(key);
      return key.includes(normalizedQuery);
    });

  return filtered.sort((a, b) => {
    const aa = normalizeText(a);
    const bb = normalizeText(b);
    const aStarts = aa.startsWith(normalizedQuery) ? 0 : 1;
    const bStarts = bb.startsWith(normalizedQuery) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return aa.localeCompare(bb, "pt-BR");
  });
}

async function fetchRxNormNames(query: string): Promise<string[]> {
  const endpoint = `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(query)}`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ricardo-pediatria/1.0 (+medicine-suggestions)",
    },
  });

  if (!response.ok) {
    throw new Error(`Falha no catálogo externo (HTTP ${response.status})`);
  }

  const data = (await response.json()) as any;
  const conceptGroups = Array.isArray(data?.drugGroup?.conceptGroup) ? data.drugGroup.conceptGroup : [];
  const names: string[] = [];

  for (const group of conceptGroups) {
    const conceptProperties = Array.isArray(group?.conceptProperties) ? group.conceptProperties : [];
    for (const item of conceptProperties) {
      const name = String(item?.name || "").trim();
      if (name) names.push(name);
    }
  }

  return names;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query = String((req.body as any)?.query || "").trim();
  if (!query) {
    return res.status(400).json({ error: "Informe o nome do medicamento." });
  }

  try {
    let externalSuggestions: string[] = [];

    try {
      externalSuggestions = await fetchRxNormNames(query);
    } catch {
      externalSuggestions = [];
    }

    const merged = [...externalSuggestions, ...LOCAL_MEDICINE_CATALOG];
    const suggestions = rankAndFilterSuggestions(query, merged).slice(0, 60);

    const payload: MedicineSuggestionsResponse = {
      query,
      suggestions,
    };

    return res.status(200).json(payload);
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Não foi possível carregar sugestões de medicamentos.",
    });
  }
}
