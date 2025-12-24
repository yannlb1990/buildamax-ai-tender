/**
 * Material Database with NCC Codes and Australian Standards
 * Comprehensive database for construction materials with regulatory references
 */

export interface MaterialData {
  id: string;
  name: string;
  category: string;
  nccCode: string[];
  asStandard: string[];
  description: string;
  unit: string;
  typicalCost?: number; // $ per unit (optional)
  specifications?: string[];
}

/**
 * Comprehensive Material Database
 */
export const MATERIAL_DATABASE: Record<string, MaterialData> = {
  // === FRAMING MATERIALS ===
  'timber_stud_90': {
    id: 'timber_stud_90',
    name: '90mm Timber Stud (F7)',
    category: 'Framing',
    nccCode: ['B1.2', 'B1.4'],
    asStandard: ['AS 1684.2', 'AS 1720.1'],
    description: '90×45mm MGP10 or F7 timber stud',
    unit: 'LM',
    typicalCost: 3.50,
    specifications: ['Min F7 grade', 'H2 treatment for wet areas', '90×45mm nominal']
  },
  'timber_stud_70': {
    id: 'timber_stud_70',
    name: '70mm Timber Stud (F7)',
    category: 'Framing',
    nccCode: ['B1.2', 'B1.4'],
    asStandard: ['AS 1684.2', 'AS 1720.1'],
    description: '70×35mm MGP10 or F7 timber stud',
    unit: 'LM',
    typicalCost: 2.80,
    specifications: ['Min F7 grade', 'H2 treatment', '70×35mm nominal']
  },
  'steel_stud_90': {
    id: 'steel_stud_90',
    name: '90mm Steel Stud (0.55BMT)',
    category: 'Framing',
    nccCode: ['B1.2', 'B1.4'],
    asStandard: ['AS/NZS 4600', 'AS 1397'],
    description: '90mm steel stud 0.55mm BMT',
    unit: 'LM',
    typicalCost: 4.20,
    specifications: ['0.55mm base metal thickness', 'G300 coating', '90mm depth']
  },
  'steel_stud_70': {
    id: 'steel_stud_70',
    name: '70mm Steel Stud (0.55BMT)',
    category: 'Framing',
    nccCode: ['B1.2', 'B1.4'],
    asStandard: ['AS/NZS 4600', 'AS 1397'],
    description: '70mm steel stud 0.55mm BMT',
    unit: 'LM',
    typicalCost: 3.80,
    specifications: ['0.55mm BMT', 'G300 coating', '70mm depth']
  },

  // === LINING MATERIALS ===
  'plasterboard_10mm': {
    id: 'plasterboard_10mm',
    name: '10mm Plasterboard',
    category: 'Lining',
    nccCode: ['C1.8', 'C3.2'],
    asStandard: ['AS/NZS 2588', 'AS/NZS 2589'],
    description: 'Standard 10mm gypsum plasterboard',
    unit: 'M2',
    typicalCost: 8.50,
    specifications: ['1200×2400mm sheet', '10mm thickness', 'Square edge or tapered']
  },
  'plasterboard_13mm': {
    id: 'plasterboard_13mm',
    name: '13mm Plasterboard',
    category: 'Lining',
    nccCode: ['C1.8', 'C3.2'],
    asStandard: ['AS/NZS 2588', 'AS/NZS 2589'],
    description: 'Fire-rated 13mm gypsum plasterboard',
    unit: 'M2',
    typicalCost: 10.20,
    specifications: ['1200×2400mm sheet', '13mm thickness', 'Type A fire rating']
  },
  'plasterboard_16mm': {
    id: 'plasterboard_16mm',
    name: '16mm Plasterboard',
    category: 'Lining',
    nccCode: ['C1.8', 'C3.2', 'F1.2'],
    asStandard: ['AS/NZS 2588', 'AS/NZS 2589'],
    description: '16mm fire-rated plasterboard',
    unit: 'M2',
    typicalCost: 12.80,
    specifications: ['1200×2400mm sheet', '16mm thickness', 'Type A fire rating', '60min FRL']
  },
  'villaboard_6mm': {
    id: 'villaboard_6mm',
    name: '6mm Villaboard',
    category: 'Lining',
    nccCode: ['C1.8', 'F1.9'],
    asStandard: ['AS/NZS 2908.2', 'AS 3740'],
    description: '6mm fibre cement sheet for wet areas',
    unit: 'M2',
    typicalCost: 18.50,
    specifications: ['1200×2400mm sheet', '6mm thickness', 'Wet area approved']
  },

  // === INSULATION ===
  'insulation_r25': {
    id: 'insulation_r25',
    name: 'R2.5 Glasswool Batts',
    category: 'Insulation',
    nccCode: ['J1.2', 'J1.3'],
    asStandard: ['AS/NZS 4859.1'],
    description: 'R2.5 wall insulation batts',
    unit: 'M2',
    typicalCost: 6.50,
    specifications: ['R2.5 thermal resistance', '90mm wall batts', 'Non-combustible']
  },
  'insulation_r30': {
    id: 'insulation_r30',
    name: 'R3.0 Glasswool Batts',
    category: 'Insulation',
    nccCode: ['J1.2', 'J1.3'],
    asStandard: ['AS/NZS 4859.1'],
    description: 'R3.0 wall insulation batts',
    unit: 'M2',
    typicalCost: 7.80,
    specifications: ['R3.0 thermal resistance', '90mm wall batts', 'Non-combustible']
  },
  'insulation_r40': {
    id: 'insulation_r40',
    name: 'R4.0 Glasswool Batts',
    category: 'Insulation',
    nccCode: ['J1.2', 'J1.3'],
    asStandard: ['AS/NZS 4859.1'],
    description: 'R4.0 ceiling insulation batts',
    unit: 'M2',
    typicalCost: 9.20,
    specifications: ['R4.0 thermal resistance', '200mm ceiling batts', 'Non-combustible']
  },

  // === WATERPROOFING ===
  'waterproof_membrane': {
    id: 'waterproof_membrane',
    name: 'Waterproofing Membrane',
    category: 'Waterproofing',
    nccCode: ['F1.9'],
    asStandard: ['AS 3740', 'AS 4858'],
    description: 'Liquid waterproofing membrane for wet areas',
    unit: 'M2',
    typicalCost: 12.00,
    specifications: ['2 coat system', 'AS 3740 compliant', 'Min 1mm DFT']
  },
  'waterproof_tape': {
    id: 'waterproof_tape',
    name: 'Waterproof Sealing Tape',
    category: 'Waterproofing',
    nccCode: ['F1.9'],
    asStandard: ['AS 3740'],
    description: 'Self-adhesive waterproof tape for joints',
    unit: 'LM',
    typicalCost: 4.50,
    specifications: ['Min 100mm width', 'AS 3740 compliant', 'Bond breaker tape']
  },

  // === FLOORING ===
  'tiles_ceramic': {
    id: 'tiles_ceramic',
    name: 'Ceramic Floor Tiles',
    category: 'Flooring',
    nccCode: ['C1.14'],
    asStandard: ['AS 4459.10', 'AS 4586'],
    description: 'Ceramic floor tiles',
    unit: 'M2',
    typicalCost: 35.00,
    specifications: ['Min Grade 3 PEI rating', 'R10-R11 slip rating', '300×300mm or larger']
  },
  'tiles_porcelain': {
    id: 'tiles_porcelain',
    name: 'Porcelain Floor Tiles',
    category: 'Flooring',
    nccCode: ['C1.14'],
    asStandard: ['AS 4459.10', 'AS 4586'],
    description: 'Porcelain floor tiles',
    unit: 'M2',
    typicalCost: 55.00,
    specifications: ['Min Grade 4 PEI rating', 'R11 slip rating', 'Rectified edge']
  },
  'tile_adhesive': {
    id: 'tile_adhesive',
    name: 'Flexible Tile Adhesive',
    category: 'Flooring',
    nccCode: ['C1.14'],
    asStandard: ['AS ISO 13007.1'],
    description: 'Polymer modified tile adhesive',
    unit: 'kg',
    typicalCost: 1.20,
    specifications: ['C2S1 classification', '3-5kg/m² coverage', 'Flexible']
  },
  'tile_grout': {
    id: 'tile_grout',
    name: 'Tile Grout',
    category: 'Flooring',
    nccCode: ['C1.14'],
    asStandard: ['AS ISO 13007.3'],
    description: 'Cementitious tile grout',
    unit: 'kg',
    typicalCost: 2.80,
    specifications: ['CG2 classification', 'Water resistant', '2-3mm joints']
  },
  'timber_flooring_hardwood': {
    id: 'timber_flooring_hardwood',
    name: 'Hardwood Timber Flooring',
    category: 'Flooring',
    nccCode: ['C1.14'],
    asStandard: ['AS/NZS 1080.1', 'AS 3884'],
    description: 'Solid hardwood flooring',
    unit: 'M2',
    typicalCost: 85.00,
    specifications: ['19mm thickness', 'Tongue & groove', 'Grade 1 select']
  },
  'vinyl_lvt': {
    id: 'vinyl_lvt',
    name: 'Luxury Vinyl Tile (LVT)',
    category: 'Flooring',
    nccCode: ['C1.14'],
    asStandard: ['AS 4266', 'AS ISO 10874'],
    description: 'Luxury vinyl tile flooring',
    unit: 'M2',
    typicalCost: 45.00,
    specifications: ['Min Class 23 wear', '4-5mm thickness', 'Click system']
  },
  'carpet_commercial': {
    id: 'carpet_commercial',
    name: 'Commercial Carpet',
    category: 'Flooring',
    nccCode: ['C1.14'],
    asStandard: ['AS/NZS 4288', 'AS ISO 10874'],
    description: 'Commercial grade carpet',
    unit: 'M2',
    typicalCost: 38.00,
    specifications: ['Contract grade', 'Heavy duty rating', 'Stain resistant']
  },

  // === FIXINGS ===
  'screws_plasterboard': {
    id: 'screws_plasterboard',
    name: 'Plasterboard Screws 25mm',
    category: 'Fixings',
    nccCode: [],
    asStandard: ['AS 2589'],
    description: 'Self-tapping plasterboard screws',
    unit: 'ea',
    typicalCost: 0.02,
    specifications: ['25mm length', 'Fine thread', 'Bugle head']
  },
  'screws_steel_frame': {
    id: 'screws_steel_frame',
    name: 'Type 17 Screws 14g × 25mm',
    category: 'Fixings',
    nccCode: [],
    asStandard: ['AS 3566.1'],
    description: 'Self-drilling screws for steel framing',
    unit: 'ea',
    typicalCost: 0.08,
    specifications: ['Type 17 point', '14 gauge', '25mm length']
  },
  'nails_timber_frame': {
    id: 'nails_timber_frame',
    name: '90mm Galvanized Nails',
    category: 'Fixings',
    nccCode: [],
    asStandard: ['AS 2329.1'],
    description: 'Bright galvanized nails for timber framing',
    unit: 'ea',
    typicalCost: 0.03,
    specifications: ['90mm length', '3.15mm shank', 'Galvanized']
  },

  // === FINISHING ===
  'jointing_compound': {
    id: 'jointing_compound',
    name: 'Jointing Compound',
    category: 'Finishing',
    nccCode: [],
    asStandard: ['AS/NZS 2589'],
    description: 'Plasterboard jointing compound',
    unit: 'kg',
    typicalCost: 1.50,
    specifications: ['Multi-purpose compound', '0.3kg/m² coverage', 'Low shrinkage']
  },
  'paper_tape': {
    id: 'paper_tape',
    name: 'Paper Jointing Tape',
    category: 'Finishing',
    nccCode: [],
    asStandard: ['AS/NZS 2589'],
    description: 'Paper tape for plasterboard joints',
    unit: 'LM',
    typicalCost: 0.15,
    specifications: ['50mm width', 'Perforated', 'High strength']
  },
  'corner_bead': {
    id: 'corner_bead',
    name: 'Metal Corner Bead',
    category: 'Finishing',
    nccCode: [],
    asStandard: ['AS/NZS 2589'],
    description: 'Galvanized steel corner bead',
    unit: 'LM',
    typicalCost: 2.20,
    specifications: ['25×25mm nose', 'Galvanized', 'Rigid profile']
  },

  // === PAINT ===
  'paint_sealer': {
    id: 'paint_sealer',
    name: 'Acrylic Sealer/Undercoat',
    category: 'Paint',
    nccCode: ['C3.8'],
    asStandard: ['AS/NZS 4548'],
    description: 'Acrylic sealer undercoat',
    unit: 'L',
    typicalCost: 12.00,
    specifications: ['10-12m²/L coverage', 'Low VOC', 'Quick dry']
  },
  'paint_acrylic': {
    id: 'paint_acrylic',
    name: 'Acrylic Wall Paint',
    category: 'Paint',
    nccCode: ['C3.8'],
    asStandard: ['AS/NZS 4548'],
    description: 'Low sheen acrylic paint',
    unit: 'L',
    typicalCost: 15.00,
    specifications: ['12-14m²/L coverage per coat', 'Low VOC', '2 coat system']
  },

  // === CONCRETE ===
  'concrete_sealer': {
    id: 'concrete_sealer',
    name: 'Concrete Sealer',
    category: 'Flooring',
    nccCode: ['C1.14'],
    asStandard: ['AS 3727'],
    description: 'Acrylic concrete sealer',
    unit: 'L',
    typicalCost: 18.00,
    specifications: ['6-8m²/L per coat', 'UV stable', '2 coat system']
  },
  'epoxy_coating': {
    id: 'epoxy_coating',
    name: 'Epoxy Floor Coating',
    category: 'Flooring',
    nccCode: ['C1.14'],
    asStandard: ['AS 3727'],
    description: '2-pack epoxy floor coating',
    unit: 'L',
    typicalCost: 45.00,
    specifications: ['5-6m²/L per coat', 'Chemical resistant', 'High gloss']
  },
  'epoxy_primer': {
    id: 'epoxy_primer',
    name: 'Epoxy Primer',
    category: 'Flooring',
    nccCode: [],
    asStandard: ['AS 3727'],
    description: 'Epoxy primer for concrete',
    unit: 'L',
    typicalCost: 38.00,
    specifications: ['7-9m²/L coverage', 'Penetrating primer', 'Moisture tolerant']
  },
};

/**
 * Search materials by keyword
 */
export function searchMaterials(query: string): MaterialData[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(MATERIAL_DATABASE).filter(material =>
    material.name.toLowerCase().includes(lowerQuery) ||
    material.category.toLowerCase().includes(lowerQuery) ||
    material.description.toLowerCase().includes(lowerQuery) ||
    material.asStandard.some(std => std.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get materials by category
 */
export function getMaterialsByCategory(category: string): MaterialData[] {
  return Object.values(MATERIAL_DATABASE).filter(
    material => material.category === category
  );
}

/**
 * Get material by ID
 */
export function getMaterialById(id: string): MaterialData | undefined {
  return MATERIAL_DATABASE[id];
}

/**
 * Get all NCC codes
 */
export function getAllNCCCodes(): string[] {
  const codes = new Set<string>();
  Object.values(MATERIAL_DATABASE).forEach(material => {
    material.nccCode.forEach(code => codes.add(code));
  });
  return Array.from(codes).sort();
}

/**
 * Get all AS standards
 */
export function getAllASStandards(): string[] {
  const standards = new Set<string>();
  Object.values(MATERIAL_DATABASE).forEach(material => {
    material.asStandard.forEach(std => standards.add(std));
  });
  return Array.from(standards).sort();
}

/**
 * Get materials by NCC code
 */
export function getMaterialsByNCCCode(nccCode: string): MaterialData[] {
  return Object.values(MATERIAL_DATABASE).filter(material =>
    material.nccCode.includes(nccCode)
  );
}

/**
 * Get materials by AS standard
 */
export function getMaterialsByASStandard(asStandard: string): MaterialData[] {
  return Object.values(MATERIAL_DATABASE).filter(material =>
    material.asStandard.includes(asStandard)
  );
}
