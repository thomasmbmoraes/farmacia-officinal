// ================================================================
// utils/importacao-dicionario.js
// Dicionário de inferência para o parser de importação.
//
// REGRA CRÍTICA: nunca inventar categorias.
// Se não bater com certeza, retorna null.
// O usuário revisa na tela antes de confirmar.
// ================================================================

// Categorias — deve bater exatamente com os nomes em seed.sql
export const DICIONARIO_CATEGORIAS = [
  {
    categoria: 'Vitaminas',
    termos: [
      'vitamina', 'vitamin', 'vit ',
      'coenzima', 'coq10',
      'omega', 'omeg', 'oleo de peixe',
      'zinco', 'magnesio', 'calcio', 'ferro', 'selenio',
      'biotina', 'colina', 'inositol',
      'niacinamida', 'riboflavina',
      'acido folico', 'folato',
      'berberina',
      'colesterol', 'resveratrol',
    ],
  },
  {
    categoria: 'Óleos Essenciais',
    termos: [
      'oleo essencial',
      'lavanda', 'eucalipto', 'hortela', 'menta', 'peppermint',
      'melaleuca', 'tea tree', 'bergamota', 'ylang',
      'neroli', 'frankincense', 'incenso', 'citronela',
      'gerânio', 'geranio', 'palmarosa',
    ],
  },
  {
    categoria: 'Óleos Vegetais',
    termos: [
      'oleo vegetal', 'oleo de coco', 'oleo de amendoa', 'oleo de amendo',
      'oleo de semente', 'rosa mosqueta', 'oleo de argan', 'argan',
      'oleo de jojoba', 'jojoba', 'oleo de macadamia', 'macadamia',
      'oleo de pracaxi', 'pracaxi', 'oleo de baoba', 'baoba',
      'oleo de ucuuba', 'ucuuba', 'oleo de abacate', 'oleo de girassol',
      'oleo de ricio', 'mamona',
    ],
  },
  {
    categoria: 'Extratos',
    termos: [
      'extrato seco', 'extrato fluido', 'extrato de',
    ],
  },
  {
    categoria: 'Hidrolatos',
    termos: [
      'hidrolato', 'agua floral', 'agua de rosas', 'agua de lavanda',
    ],
  },
  {
    categoria: 'Tinturas',
    termos: [
      'tintura mae', 'tintura de', 'tincture',
    ],
  },
  {
    categoria: 'Fitoterápicos',
    termos: [
      'fitoterapico', 'alcachofra', 'cardo mariano', 'silimarina',
      'ginkgo', 'ginseng', 'valeriana', 'passiflora',
      'espinheira santa', 'boldo', 'guaco', 'pfaffia',
      'ashwagandha', 'rhodiola', 'maca', 'tribulus',
    ],
  },
  {
    categoria: 'Sabonetes',
    termos: [
      'sabonete', 'syndet', 'body wash', 'gel de banho',
    ],
  },
  {
    categoria: 'Pomadas',
    termos: [
      'pomada', 'unguento', 'pasta dermatologica',
    ],
  },
  {
    categoria: 'Cremes',
    termos: [
      'creme', 'hidratante', 'locao', 'loção', 'gel creme', 'fluido', 'serum',
    ],
  },
  {
    categoria: 'Mel',
    termos: [
      'mel de abelha', 'geleia real', 'propolis', 'própolis', 'apiterapia',
    ],
  },
  {
    categoria: 'Chás',
    termos: [
      'cha de', 'chá de', 'erva mate', 'camomila', 'erva cidreira',
      'hibisco', 'gengibre em po', 'canela em po',
    ],
  },
  {
    categoria: 'Sais',
    termos: [
      'sal de banho', 'sais de banho', 'sal do himalaia', 'sal rosa',
      'epsom', 'sulfato de magnesio',
    ],
  },
  {
    categoria: 'Cápsulas',
    termos: [
      'capsulas', 'capsula', 'caps ', 'cps ',
    ],
  },
  // 'Outros' nunca é inferido — só por escolha manual
];

// Apresentações
export const DICIONARIO_APRESENTACOES = [
  { apresentacao: 'Cápsulas',    termos: ['capsulas', 'capsula', 'caps', 'cps'] },
  { apresentacao: 'Comprimidos', termos: ['comprimido', 'comp ', 'dragea'] },
  { apresentacao: 'Gotas',       termos: ['gotas', 'gota', 'drops'] },
  { apresentacao: 'Gel',         termos: [' gel ', 'gel-'] },
  { apresentacao: 'Creme',       termos: ['creme', 'cream'] },
  { apresentacao: 'Pomada',      termos: ['pomada', 'unguento'] },
  { apresentacao: 'Óleo',        termos: ['oleo', ' oil '] },
  { apresentacao: 'Xarope',      termos: ['xarope', 'syrup'] },
  { apresentacao: 'Sachê',       termos: ['sache', 'sachet'] },
  { apresentacao: 'Spray',       termos: ['spray'] },
  { apresentacao: 'Sabonete',    termos: ['sabonete'] },
  { apresentacao: 'Chá',         termos: [' cha ', ' chá '] },
  { apresentacao: 'Pó',          termos: [' po ', ' pó ', 'powder'] },
];

// Regex para extrair dosagem: 500mg, 10ml, 1g, 200mcg, 50ui, 5%
export const REGEX_DOSAGEM = /\d+[\.,]?\d*\s?(mg|ml|mcg|µg|ui|iu|g|kg|%)/i;

// Regex para extrair quantidade por embalagem: "60 cápsulas", "30caps"
export const REGEX_QTD_EMBALAGEM = /(\d+)\s?(capsulas?|caps?|cps?|comprimidos?|comp?|sachês?|saches?|ml|g\b)/i;
