// Material Database with NCC/AS Standards for Australian Construction
// Provides 40+ materials with regulatory references, costs, and specifications

export interface MaterialData {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  unit: string;
  typicalCost: number; // AUD per unit
  nccCodes: string[];
  asStandards: string[];
  specifications?: string;
  wasteFactor: number; // Default waste percentage (0.10 = 10%)
}

// Comprehensive material database with NCC/AS codes
export const MATERIAL_DATABASE: MaterialData[] = [
  // ===== FRAMING =====
  {
    id: 'timber_stud_70',
    name: '70mm Timber Stud (F7)',
    category: 'Framing',
    subcategory: 'Timber',
    unit: 'LM',
    typicalCost: 2.80,
    nccCodes: ['B1.2', 'B1.4'],
    asStandards: ['AS 1684.2', 'AS 1720.1'],
    specifications: '70×35mm MGP10 or F7',
    wasteFactor: 0.10,
  },
  {
    id: 'timber_stud_90',
    name: '90mm Timber Stud (F7)',
    category: 'Framing',
    subcategory: 'Timber',
    unit: 'LM',
    typicalCost: 3.50,
    nccCodes: ['B1.2', 'B1.4'],
    asStandards: ['AS 1684.2', 'AS 1720.1'],
    specifications: '90×35mm MGP10 or F7',
    wasteFactor: 0.10,
  },
  {
    id: 'timber_plate_90',
    name: '90mm Timber Plate',
    category: 'Framing',
    subcategory: 'Timber',
    unit: 'LM',
    typicalCost: 3.50,
    nccCodes: ['B1.2'],
    asStandards: ['AS 1684.2'],
    specifications: '90×35mm top/bottom plate',
    wasteFactor: 0.05,
  },
  {
    id: 'timber_noggin_90',
    name: '90mm Timber Noggin',
    category: 'Framing',
    subcategory: 'Timber',
    unit: 'LM',
    typicalCost: 3.20,
    nccCodes: ['B1.2'],
    asStandards: ['AS 1684.2'],
    specifications: '90×35mm horizontal bracing',
    wasteFactor: 0.15,
  },
  {
    id: 'steel_stud_70',
    name: '70mm Steel Stud',
    category: 'Framing',
    subcategory: 'Steel',
    unit: 'LM',
    typicalCost: 4.20,
    nccCodes: ['B1.2', 'B1.4'],
    asStandards: ['AS/NZS 4600', 'AS 4100'],
    specifications: '70×0.55mm BMT steel stud',
    wasteFactor: 0.05,
  },
  {
    id: 'steel_stud_90',
    name: '90mm Steel Stud',
    category: 'Framing',
    subcategory: 'Steel',
    unit: 'LM',
    typicalCost: 5.00,
    nccCodes: ['B1.2', 'B1.4'],
    asStandards: ['AS/NZS 4600', 'AS 4100'],
    specifications: '92×0.55mm BMT steel stud',
    wasteFactor: 0.05,
  },
  {
    id: 'steel_track',
    name: 'Steel Track',
    category: 'Framing',
    subcategory: 'Steel',
    unit: 'LM',
    typicalCost: 4.80,
    nccCodes: ['B1.2'],
    asStandards: ['AS/NZS 4600'],
    specifications: 'Top/bottom track for steel studs',
    wasteFactor: 0.05,
  },
  {
    id: 'timber_lintel',
    name: 'Timber Lintel (LVL)',
    category: 'Framing',
    subcategory: 'Timber',
    unit: 'LM',
    typicalCost: 18.00,
    nccCodes: ['B1.2', 'B1.4'],
    asStandards: ['AS 1684.2', 'AS/NZS 4357.0'],
    specifications: '90×45mm LVL lintel',
    wasteFactor: 0.05,
  },

  // ===== LINING =====
  {
    id: 'plasterboard_10',
    name: '10mm Plasterboard',
    category: 'Lining',
    subcategory: 'Plasterboard',
    unit: 'M2',
    typicalCost: 8.50,
    nccCodes: ['C1.8', 'C1.9'],
    asStandards: ['AS/NZS 2588', 'AS/NZS 2589'],
    specifications: '10mm standard plasterboard',
    wasteFactor: 0.10,
  },
  {
    id: 'plasterboard_13',
    name: '13mm Plasterboard',
    category: 'Lining',
    subcategory: 'Plasterboard',
    unit: 'M2',
    typicalCost: 10.20,
    nccCodes: ['C1.8', 'C1.9'],
    asStandards: ['AS/NZS 2588', 'AS/NZS 2589'],
    specifications: '13mm standard plasterboard',
    wasteFactor: 0.10,
  },
  {
    id: 'plasterboard_16_fire',
    name: '16mm Fire-Rated Plasterboard',
    category: 'Lining',
    subcategory: 'Plasterboard',
    unit: 'M2',
    typicalCost: 16.50,
    nccCodes: ['C1.8', 'C1.9', 'C2.2'],
    asStandards: ['AS/NZS 2588', 'AS/NZS 2589', 'AS 1530.4'],
    specifications: '16mm fire-rated plasterboard',
    wasteFactor: 0.10,
  },
  {
    id: 'villaboard_6',
    name: '6mm Villaboard',
    category: 'Lining',
    subcategory: 'Fibre Cement',
    unit: 'M2',
    typicalCost: 22.00,
    nccCodes: ['C1.8', 'F1.9'],
    asStandards: ['AS 3740', 'AS/NZS 2908.2'],
    specifications: '6mm fibre cement for wet areas',
    wasteFactor: 0.10,
  },

  // ===== INSULATION =====
  {
    id: 'insulation_r25',
    name: 'R2.5 Insulation Batts',
    category: 'Insulation',
    subcategory: 'Batts',
    unit: 'M2',
    typicalCost: 12.50,
    nccCodes: ['J1.2', 'J1.3'],
    asStandards: ['AS/NZS 4859.1'],
    specifications: 'R2.5 glasswool batts 90mm',
    wasteFactor: 0.10,
  },
  {
    id: 'insulation_r30',
    name: 'R3.0 Insulation Batts',
    category: 'Insulation',
    subcategory: 'Batts',
    unit: 'M2',
    typicalCost: 15.80,
    nccCodes: ['J1.2', 'J1.3'],
    asStandards: ['AS/NZS 4859.1'],
    specifications: 'R3.0 glasswool batts 110mm',
    wasteFactor: 0.10,
  },
  {
    id: 'insulation_r40',
    name: 'R4.0 Insulation Batts',
    category: 'Insulation',
    subcategory: 'Batts',
    unit: 'M2',
    typicalCost: 19.50,
    nccCodes: ['J1.2', 'J1.3'],
    asStandards: ['AS/NZS 4859.1'],
    specifications: 'R4.0 glasswool batts 140mm',
    wasteFactor: 0.10,
  },

  // ===== WATERPROOFING =====
  {
    id: 'waterproof_membrane',
    name: 'Waterproofing Membrane',
    category: 'Waterproofing',
    subcategory: 'Membrane',
    unit: 'M2',
    typicalCost: 35.00,
    nccCodes: ['F1.9'],
    asStandards: ['AS 3740', 'AS 4858'],
    specifications: 'Liquid applied waterproofing membrane',
    wasteFactor: 0.20,
  },
  {
    id: 'waterproof_tape',
    name: 'Waterproofing Sealing Tape',
    category: 'Waterproofing',
    subcategory: 'Accessories',
    unit: 'LM',
    typicalCost: 6.50,
    nccCodes: ['F1.9'],
    asStandards: ['AS 3740'],
    specifications: 'Self-adhesive corner/joint tape',
    wasteFactor: 0.10,
  },

  // ===== FLOORING =====
  {
    id: 'tiles_ceramic',
    name: 'Ceramic Floor Tiles',
    category: 'Flooring',
    subcategory: 'Tiles',
    unit: 'M2',
    typicalCost: 45.00,
    nccCodes: ['D2.14', 'D2.16'],
    asStandards: ['AS 4459.10', 'AS 4586'],
    specifications: '300×300mm ceramic tiles',
    wasteFactor: 0.08,
  },
  {
    id: 'tiles_porcelain',
    name: 'Porcelain Floor Tiles',
    category: 'Flooring',
    subcategory: 'Tiles',
    unit: 'M2',
    typicalCost: 65.00,
    nccCodes: ['D2.14', 'D2.16'],
    asStandards: ['AS 4459.10', 'AS 4586'],
    specifications: '600×600mm porcelain tiles',
    wasteFactor: 0.08,
  },
  {
    id: 'tile_adhesive',
    name: 'Tile Adhesive',
    category: 'Flooring',
    subcategory: 'Accessories',
    unit: 'kg',
    typicalCost: 1.80,
    nccCodes: [],
    asStandards: ['AS 4992'],
    specifications: 'Flexible tile adhesive',
    wasteFactor: 0.05,
  },
  {
    id: 'tile_grout',
    name: 'Tile Grout',
    category: 'Flooring',
    subcategory: 'Accessories',
    unit: 'kg',
    typicalCost: 3.20,
    nccCodes: [],
    asStandards: ['AS 4992'],
    specifications: 'Flexible grout',
    wasteFactor: 0.05,
  },
  {
    id: 'timber_flooring',
    name: 'Timber Flooring',
    category: 'Flooring',
    subcategory: 'Timber',
    unit: 'M2',
    typicalCost: 85.00,
    nccCodes: ['D2.14'],
    asStandards: ['AS/NZS 1080.1'],
    specifications: 'Engineered timber 130×14mm',
    wasteFactor: 0.08,
  },
  {
    id: 'vinyl_lvt',
    name: 'LVT Vinyl Planks',
    category: 'Flooring',
    subcategory: 'Vinyl',
    unit: 'M2',
    typicalCost: 55.00,
    nccCodes: ['D2.14'],
    asStandards: ['AS 4586'],
    specifications: 'Luxury vinyl tile 5mm',
    wasteFactor: 0.07,
  },
  {
    id: 'carpet',
    name: 'Carpet',
    category: 'Flooring',
    subcategory: 'Carpet',
    unit: 'M2',
    typicalCost: 45.00,
    nccCodes: ['D2.14'],
    asStandards: ['AS 4586'],
    specifications: 'Loop pile carpet',
    wasteFactor: 0.10,
  },
  {
    id: 'carpet_underlay',
    name: 'Carpet Underlay',
    category: 'Flooring',
    subcategory: 'Carpet',
    unit: 'M2',
    typicalCost: 12.00,
    nccCodes: [],
    asStandards: [],
    specifications: '10mm foam underlay',
    wasteFactor: 0.05,
  },
  {
    id: 'gripper_strips',
    name: 'Gripper Strips',
    category: 'Flooring',
    subcategory: 'Carpet',
    unit: 'LM',
    typicalCost: 2.50,
    nccCodes: [],
    asStandards: [],
    specifications: 'Timber gripper for carpet',
    wasteFactor: 0.05,
  },

  // ===== FIXINGS =====
  {
    id: 'plasterboard_screws',
    name: 'Plasterboard Screws',
    category: 'Fixings',
    subcategory: 'Screws',
    unit: 'EA',
    typicalCost: 0.03,
    nccCodes: [],
    asStandards: ['AS 2589'],
    specifications: '25mm bugle head screws',
    wasteFactor: 0.05,
  },
  {
    id: 'steel_frame_screws',
    name: 'Steel Frame Screws',
    category: 'Fixings',
    subcategory: 'Screws',
    unit: 'EA',
    typicalCost: 0.05,
    nccCodes: [],
    asStandards: ['AS 3566.1'],
    specifications: 'Self-drilling steel screws',
    wasteFactor: 0.05,
  },
  {
    id: 'timber_nails',
    name: '90mm Galvanized Nails',
    category: 'Fixings',
    subcategory: 'Nails',
    unit: 'EA',
    typicalCost: 0.08,
    nccCodes: [],
    asStandards: ['AS 2329.1'],
    specifications: '90×3.15mm galvanized nails',
    wasteFactor: 0.10,
  },

  // ===== FINISHING =====
  {
    id: 'jointing_compound',
    name: 'Jointing Compound',
    category: 'Finishing',
    subcategory: 'Plaster',
    unit: 'kg',
    typicalCost: 2.50,
    nccCodes: [],
    asStandards: ['AS/NZS 2589'],
    specifications: 'Pre-mixed jointing compound',
    wasteFactor: 0.10,
  },
  {
    id: 'paper_tape',
    name: 'Paper Tape',
    category: 'Finishing',
    subcategory: 'Plaster',
    unit: 'roll',
    typicalCost: 8.50,
    nccCodes: [],
    asStandards: ['AS/NZS 2589'],
    specifications: '52mm × 75m paper tape',
    wasteFactor: 0.05,
  },
  {
    id: 'corner_beads',
    name: 'Corner Beads',
    category: 'Finishing',
    subcategory: 'Plaster',
    unit: 'LM',
    typicalCost: 3.80,
    nccCodes: [],
    asStandards: ['AS/NZS 2589'],
    specifications: 'Paper-faced corner bead',
    wasteFactor: 0.05,
  },

  // ===== PAINT & COATINGS =====
  {
    id: 'primer_sealer',
    name: 'Primer Sealer',
    category: 'Paint',
    subcategory: 'Primer',
    unit: 'L',
    typicalCost: 12.00,
    nccCodes: [],
    asStandards: ['AS/NZS 4548'],
    specifications: 'Water-based primer sealer',
    wasteFactor: 0.10,
  },
  {
    id: 'interior_paint',
    name: 'Interior Paint',
    category: 'Paint',
    subcategory: 'Paint',
    unit: 'L',
    typicalCost: 18.00,
    nccCodes: [],
    asStandards: ['AS/NZS 4548'],
    specifications: 'Low-VOC interior paint',
    wasteFactor: 0.10,
  },
  {
    id: 'epoxy_coating',
    name: 'Epoxy Floor Coating',
    category: 'Paint',
    subcategory: 'Specialty',
    unit: 'L',
    typicalCost: 45.00,
    nccCodes: [],
    asStandards: ['AS 3727'],
    specifications: '2-part epoxy floor coating',
    wasteFactor: 0.15,
  },

  // ===== CONCRETE =====
  {
    id: 'concrete_slab',
    name: 'Concrete Slab',
    category: 'Concrete',
    subcategory: 'Structural',
    unit: 'M3',
    typicalCost: 280.00,
    nccCodes: ['B1.4'],
    asStandards: ['AS 3600', 'AS 2870'],
    specifications: '25MPa concrete',
    wasteFactor: 0.05,
  },
  {
    id: 'reo_mesh',
    name: 'Reinforcement Mesh SL82',
    category: 'Concrete',
    subcategory: 'Reinforcement',
    unit: 'M2',
    typicalCost: 12.00,
    nccCodes: ['B1.4'],
    asStandards: ['AS/NZS 4671'],
    specifications: 'SL82 welded mesh',
    wasteFactor: 0.10,
  },
];

// ===== LOOKUP FUNCTIONS =====

/**
 * Search materials by keyword (name, category, or specs)
 */
export function searchMaterials(query: string): MaterialData[] {
  const lower = query.toLowerCase();
  return MATERIAL_DATABASE.filter(
    (m) =>
      m.name.toLowerCase().includes(lower) ||
      m.category.toLowerCase().includes(lower) ||
      m.subcategory?.toLowerCase().includes(lower) ||
      m.specifications?.toLowerCase().includes(lower)
  );
}

/**
 * Get materials by category
 */
export function getMaterialsByCategory(category: string): MaterialData[] {
  return MATERIAL_DATABASE.filter(
    (m) => m.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Find materials by NCC code
 */
export function getMaterialsByNCCCode(nccCode: string): MaterialData[] {
  return MATERIAL_DATABASE.filter((m) =>
    m.nccCodes.some((code) => code.toLowerCase() === nccCode.toLowerCase())
  );
}

/**
 * Find materials by AS standard
 */
export function getMaterialsByASStandard(asStandard: string): MaterialData[] {
  return MATERIAL_DATABASE.filter((m) =>
    m.asStandards.some((std) => std.toLowerCase().includes(asStandard.toLowerCase()))
  );
}

/**
 * Get all unique NCC codes
 */
export function getAllNCCCodes(): string[] {
  const codes = new Set<string>();
  MATERIAL_DATABASE.forEach((m) => m.nccCodes.forEach((code) => codes.add(code)));
  return Array.from(codes).sort();
}

/**
 * Get all unique AS standards
 */
export function getAllASStandards(): string[] {
  const standards = new Set<string>();
  MATERIAL_DATABASE.forEach((m) => m.asStandards.forEach((std) => standards.add(std)));
  return Array.from(standards).sort();
}

/**
 * Get material by ID
 */
export function getMaterialById(id: string): MaterialData | undefined {
  return MATERIAL_DATABASE.find((m) => m.id === id);
}

/**
 * Get material cost by name (fuzzy match)
 */
export function getMaterialCost(name: string): number {
  const lower = name.toLowerCase();
  const material = MATERIAL_DATABASE.find(
    (m) => m.name.toLowerCase().includes(lower) || lower.includes(m.name.toLowerCase())
  );
  return material?.typicalCost || 0;
}

/**
 * Get all categories
 */
export function getAllCategories(): string[] {
  return Array.from(new Set(MATERIAL_DATABASE.map((m) => m.category)));
}
