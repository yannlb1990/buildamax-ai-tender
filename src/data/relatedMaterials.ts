// Related Materials Database
// When a user selects a primary material, these related items are suggested

export interface RelatedMaterial {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantityFactor: number; // Multiplier based on primary quantity (e.g., 1.1 for 10% wastage)
  nccCode?: string;
  isRequired: boolean; // NCC/BCA required
  notes?: string;
}

export interface MaterialRelationship {
  primaryMaterial: string;
  primaryCategory: string;
  primaryUnit: string;
  relatedMaterials: RelatedMaterial[];
  nccReference?: string;
}

export const MATERIAL_RELATIONSHIPS: MaterialRelationship[] = [
  // ============================================
  // WALL FRAMING
  // ============================================
  {
    primaryMaterial: 'Wall Framing - 90mm Timber Stud',
    primaryCategory: 'Structural',
    primaryUnit: 'M2',
    nccReference: 'BCA Vol 2, Part 3.4.2',
    relatedMaterials: [
      {
        id: 'top-plate-90',
        name: 'Top Plate (90x45 F7 Timber)',
        category: 'Structural',
        unit: 'LM',
        quantityFactor: 0.4, // LM per M2 of wall
        nccCode: 'AS 1684.2',
        isRequired: true,
      },
      {
        id: 'bottom-plate-90',
        name: 'Bottom Plate (90x45 F7 Timber)',
        category: 'Structural',
        unit: 'LM',
        quantityFactor: 0.4,
        nccCode: 'AS 1684.2',
        isRequired: true,
      },
      {
        id: 'studs-90',
        name: 'Studs (90x45 F7 @ 450crs)',
        category: 'Structural',
        unit: 'LM',
        quantityFactor: 2.4, // ~2.4 LM per M2 for 2.7m walls @ 450crs
        nccCode: 'AS 1684.2',
        isRequired: true,
      },
      {
        id: 'noggings-90',
        name: 'Noggings (90x45 @ 1200crs)',
        category: 'Structural',
        unit: 'LM',
        quantityFactor: 0.35,
        nccCode: 'AS 1684.2',
        isRequired: true,
      },
      {
        id: 'insulation-r25',
        name: 'Wall Insulation (R2.5 Batts)',
        category: 'Insulation',
        unit: 'M2',
        quantityFactor: 1.05, // 5% wastage
        nccCode: 'BCA Section J',
        isRequired: true,
        notes: 'Required for external walls and inter-zone walls',
      },
      {
        id: 'plasterboard-10-int',
        name: 'Plasterboard Lining (10mm Internal)',
        category: 'Lining',
        unit: 'M2',
        quantityFactor: 1.1, // 10% wastage
        nccCode: 'AS/NZS 2588',
        isRequired: true,
      },
      {
        id: 'plasterboard-10-ext',
        name: 'Plasterboard Lining (10mm External Face)',
        category: 'Lining',
        unit: 'M2',
        quantityFactor: 1.1,
        isRequired: false,
        notes: 'Only if internal partition with lining both sides',
      },
      {
        id: 'fixing-screws',
        name: 'Fixing Screws (32mm Plasterboard)',
        category: 'Fixing',
        unit: 'box',
        quantityFactor: 0.01, // 1 box per 100 M2
        isRequired: true,
      },
      {
        id: 'framing-nails',
        name: 'Framing Nails (75mm Gal)',
        category: 'Fixing',
        unit: 'kg',
        quantityFactor: 0.15, // kg per M2
        isRequired: true,
      },
    ],
  },

  // ============================================
  // WALL FRAMING - 70mm Steel Stud
  // ============================================
  {
    primaryMaterial: 'Wall Framing - 70mm Steel Stud',
    primaryCategory: 'Structural',
    primaryUnit: 'M2',
    nccReference: 'BCA Vol 2, Part 3.4.2',
    relatedMaterials: [
      {
        id: 'track-70',
        name: 'Steel Track (70mm Top & Bottom)',
        category: 'Structural',
        unit: 'LM',
        quantityFactor: 0.8,
        isRequired: true,
      },
      {
        id: 'studs-steel-70',
        name: 'Steel Studs (70mm @ 600crs)',
        category: 'Structural',
        unit: 'LM',
        quantityFactor: 1.8,
        isRequired: true,
      },
      {
        id: 'insulation-r20',
        name: 'Wall Insulation (R2.0 Batts)',
        category: 'Insulation',
        unit: 'M2',
        quantityFactor: 1.05,
        nccCode: 'BCA Section J',
        isRequired: true,
      },
      {
        id: 'plasterboard-13',
        name: 'Plasterboard (13mm Fire Rated)',
        category: 'Lining',
        unit: 'M2',
        quantityFactor: 1.1,
        nccCode: 'AS/NZS 2588',
        isRequired: true,
      },
      {
        id: 'steel-screws',
        name: 'Self-Drilling Screws',
        category: 'Fixing',
        unit: 'box',
        quantityFactor: 0.015,
        isRequired: true,
      },
    ],
  },

  // ============================================
  // FLOOR TILING
  // ============================================
  {
    primaryMaterial: 'Floor Tiles - Ceramic/Porcelain',
    primaryCategory: 'Flooring',
    primaryUnit: 'M2',
    nccReference: 'AS 3958.1',
    relatedMaterials: [
      {
        id: 'tile-adhesive',
        name: 'Tile Adhesive (Premium Flex)',
        category: 'Adhesive',
        unit: 'bag',
        quantityFactor: 0.25, // 1 bag per 4 M2
        isRequired: true,
      },
      {
        id: 'grout',
        name: 'Tile Grout',
        category: 'Grout',
        unit: 'kg',
        quantityFactor: 0.5,
        isRequired: true,
      },
      {
        id: 'waterproofing',
        name: 'Waterproofing Membrane',
        category: 'Waterproofing',
        unit: 'M2',
        quantityFactor: 1.15,
        nccCode: 'AS 3740',
        isRequired: true,
        notes: 'Required for wet areas - bathroom, laundry, kitchen',
      },
      {
        id: 'screed',
        name: 'Floor Screed / Levelling Compound',
        category: 'Preparation',
        unit: 'M2',
        quantityFactor: 1.0,
        isRequired: false,
        notes: 'If floor requires levelling',
      },
      {
        id: 'tile-trim',
        name: 'Tile Edge Trim (Aluminium)',
        category: 'Finishing',
        unit: 'LM',
        quantityFactor: 0.3, // Approx perimeter factor
        isRequired: false,
      },
      {
        id: 'silicone',
        name: 'Silicone Sealant',
        category: 'Sealant',
        unit: 'tube',
        quantityFactor: 0.05,
        isRequired: true,
        notes: 'For perimeter and wet area joints',
      },
      {
        id: 'tile-spacers',
        name: 'Tile Spacers',
        category: 'Accessory',
        unit: 'pack',
        quantityFactor: 0.02,
        isRequired: true,
      },
    ],
  },

  // ============================================
  // CEILING LINING
  // ============================================
  {
    primaryMaterial: 'Ceiling Lining - 10mm Plasterboard',
    primaryCategory: 'Lining',
    primaryUnit: 'M2',
    nccReference: 'AS/NZS 2589',
    relatedMaterials: [
      {
        id: 'ceiling-battens',
        name: 'Ceiling Battens / Furring Channels',
        category: 'Structural',
        unit: 'LM',
        quantityFactor: 1.8, // @ 450crs
        isRequired: true,
      },
      {
        id: 'ceiling-insulation',
        name: 'Ceiling Insulation (R4.0 Batts)',
        category: 'Insulation',
        unit: 'M2',
        quantityFactor: 1.05,
        nccCode: 'BCA Section J',
        isRequired: true,
      },
      {
        id: 'cornice',
        name: 'Cornice (75mm Cove)',
        category: 'Finishing',
        unit: 'LM',
        quantityFactor: 0.4, // Approx perimeter to area ratio
        isRequired: false,
      },
      {
        id: 'ceiling-screws',
        name: 'Ceiling Screws (25mm)',
        category: 'Fixing',
        unit: 'box',
        quantityFactor: 0.012,
        isRequired: true,
      },
      {
        id: 'access-panel',
        name: 'Ceiling Access Panel (450x450)',
        category: 'Access',
        unit: 'each',
        quantityFactor: 0.02, // 1 per 50 M2
        isRequired: false,
        notes: 'Required for roof space access',
      },
      {
        id: 'cornice-adhesive',
        name: 'Cornice Adhesive',
        category: 'Adhesive',
        unit: 'bag',
        quantityFactor: 0.02,
        isRequired: false,
      },
    ],
  },

  // ============================================
  // EXTERNAL CLADDING
  // ============================================
  {
    primaryMaterial: 'External Cladding - Weatherboard',
    primaryCategory: 'Cladding',
    primaryUnit: 'M2',
    nccReference: 'BCA Vol 2, Part 3.5',
    relatedMaterials: [
      {
        id: 'wall-wrap',
        name: 'Wall Wrap / Building Paper',
        category: 'Membrane',
        unit: 'M2',
        quantityFactor: 1.15,
        nccCode: 'AS 4200.1',
        isRequired: true,
      },
      {
        id: 'battens-cladding',
        name: 'Cavity Battens (40x18)',
        category: 'Structural',
        unit: 'LM',
        quantityFactor: 1.8,
        isRequired: true,
        notes: 'For drained cavity system',
      },
      {
        id: 'cladding-nails',
        name: 'Cladding Nails (Stainless)',
        category: 'Fixing',
        unit: 'kg',
        quantityFactor: 0.15,
        isRequired: true,
      },
      {
        id: 'external-corners',
        name: 'External Corner Moulds',
        category: 'Finishing',
        unit: 'LM',
        quantityFactor: 0.15,
        isRequired: true,
      },
      {
        id: 'flashing',
        name: 'Window/Door Flashing',
        category: 'Flashing',
        unit: 'LM',
        quantityFactor: 0.25,
        nccCode: 'AS 4654.2',
        isRequired: true,
      },
      {
        id: 'sealant-external',
        name: 'External Sealant (Polyurethane)',
        category: 'Sealant',
        unit: 'tube',
        quantityFactor: 0.1,
        isRequired: true,
      },
    ],
  },

  // ============================================
  // ROOFING - Metal
  // ============================================
  {
    primaryMaterial: 'Roofing - Colorbond Metal',
    primaryCategory: 'Roofing',
    primaryUnit: 'M2',
    nccReference: 'AS 1562.1',
    relatedMaterials: [
      {
        id: 'roof-sarking',
        name: 'Roof Sarking / Insulation',
        category: 'Membrane',
        unit: 'M2',
        quantityFactor: 1.1,
        nccCode: 'BCA Section J',
        isRequired: true,
      },
      {
        id: 'roof-screws',
        name: 'Roofing Screws (Type 17)',
        category: 'Fixing',
        unit: 'box',
        quantityFactor: 0.05,
        isRequired: true,
      },
      {
        id: 'ridge-capping',
        name: 'Ridge Capping',
        category: 'Finishing',
        unit: 'LM',
        quantityFactor: 0.15,
        isRequired: true,
      },
      {
        id: 'barge-capping',
        name: 'Barge Capping',
        category: 'Finishing',
        unit: 'LM',
        quantityFactor: 0.1,
        isRequired: true,
      },
      {
        id: 'valley-gutter',
        name: 'Valley Gutter',
        category: 'Flashing',
        unit: 'LM',
        quantityFactor: 0.1,
        isRequired: false,
        notes: 'If roof has valleys',
      },
      {
        id: 'gutter',
        name: 'Gutter (Quad 115mm)',
        category: 'Drainage',
        unit: 'LM',
        quantityFactor: 0.3,
        isRequired: true,
      },
      {
        id: 'downpipe',
        name: 'Downpipe (90mm Round)',
        category: 'Drainage',
        unit: 'LM',
        quantityFactor: 0.15,
        isRequired: true,
      },
      {
        id: 'fascia',
        name: 'Fascia Board',
        category: 'Finishing',
        unit: 'LM',
        quantityFactor: 0.3,
        isRequired: true,
      },
    ],
  },

  // ============================================
  // CONCRETE SLAB
  // ============================================
  {
    primaryMaterial: 'Concrete Slab - 100mm',
    primaryCategory: 'Structural',
    primaryUnit: 'M2',
    nccReference: 'AS 2870',
    relatedMaterials: [
      {
        id: 'concrete-n25',
        name: 'Concrete (N25 - 100mm)',
        category: 'Concrete',
        unit: 'M3',
        quantityFactor: 0.1, // 100mm thick
        nccCode: 'AS 1379',
        isRequired: true,
      },
      {
        id: 'mesh-sl82',
        name: 'Steel Mesh (SL82)',
        category: 'Reinforcement',
        unit: 'M2',
        quantityFactor: 1.15,
        nccCode: 'AS 4671',
        isRequired: true,
      },
      {
        id: 'vapour-barrier',
        name: 'Vapour Barrier (200um Poly)',
        category: 'Membrane',
        unit: 'M2',
        quantityFactor: 1.2,
        isRequired: true,
      },
      {
        id: 'edge-form',
        name: 'Edge Formwork',
        category: 'Formwork',
        unit: 'LM',
        quantityFactor: 0.4, // Perimeter to area
        isRequired: true,
      },
      {
        id: 'bar-chairs',
        name: 'Bar Chairs / Spacers',
        category: 'Accessory',
        unit: 'each',
        quantityFactor: 4, // 4 per M2
        isRequired: true,
      },
      {
        id: 'slab-insulation',
        name: 'Underslab Insulation',
        category: 'Insulation',
        unit: 'M2',
        quantityFactor: 1.05,
        nccCode: 'BCA Section J',
        isRequired: false,
        notes: 'Required for climate zones 4-8',
      },
      {
        id: 'control-joint',
        name: 'Control Joint Strip',
        category: 'Joint',
        unit: 'LM',
        quantityFactor: 0.3,
        isRequired: true,
        notes: 'At 3m intervals',
      },
    ],
  },

  // ============================================
  // PAINTING - INTERNAL
  // ============================================
  {
    primaryMaterial: 'Painting - Internal Walls',
    primaryCategory: 'Finishing',
    primaryUnit: 'M2',
    nccReference: 'AS/NZS 2311',
    relatedMaterials: [
      {
        id: 'primer',
        name: 'Primer/Sealer',
        category: 'Paint',
        unit: 'L',
        quantityFactor: 0.1, // 10L per 100 M2
        isRequired: true,
      },
      {
        id: 'paint-2-coats',
        name: 'Acrylic Paint (2 coats)',
        category: 'Paint',
        unit: 'L',
        quantityFactor: 0.2, // 20L per 100 M2
        isRequired: true,
      },
      {
        id: 'filler',
        name: 'Gap Filler / Caulk',
        category: 'Preparation',
        unit: 'tube',
        quantityFactor: 0.03,
        isRequired: true,
      },
      {
        id: 'sandpaper',
        name: 'Sandpaper (Various Grits)',
        category: 'Preparation',
        unit: 'pack',
        quantityFactor: 0.01,
        isRequired: true,
      },
      {
        id: 'masking-tape',
        name: 'Masking Tape',
        category: 'Accessory',
        unit: 'roll',
        quantityFactor: 0.02,
        isRequired: true,
      },
      {
        id: 'drop-sheets',
        name: 'Drop Sheets',
        category: 'Protection',
        unit: 'each',
        quantityFactor: 0.005,
        isRequired: true,
      },
    ],
  },
];

// Helper function to get related materials for a primary material
export const getRelatedMaterials = (primaryMaterial: string): MaterialRelationship | undefined => {
  return MATERIAL_RELATIONSHIPS.find(
    (r) => r.primaryMaterial.toLowerCase() === primaryMaterial.toLowerCase()
  );
};

// Get all primary materials for dropdown
export const getPrimaryMaterials = (): string[] => {
  return MATERIAL_RELATIONSHIPS.map((r) => r.primaryMaterial);
};

// Get materials by category
export const getMaterialsByCategory = (category: string): MaterialRelationship[] => {
  return MATERIAL_RELATIONSHIPS.filter(
    (r) => r.primaryCategory.toLowerCase() === category.toLowerCase()
  );
};

// Calculate quantities for related materials
export const calculateRelatedQuantities = (
  primaryQuantity: number,
  relationship: MaterialRelationship
): Array<RelatedMaterial & { calculatedQuantity: number }> => {
  return relationship.relatedMaterials.map((material) => ({
    ...material,
    calculatedQuantity: Math.ceil(primaryQuantity * material.quantityFactor * 100) / 100,
  }));
};

export default MATERIAL_RELATIONSHIPS;
