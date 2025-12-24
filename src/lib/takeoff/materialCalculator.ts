/**
 * Smart Material Calculator
 * Automatically calculates related materials based on measurement type and structure
 */

import { EnhancedMeasurement, StructureType } from './types';

export interface CalculatedMaterial {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  nccCode?: string;
  asStandard?: string;
  description: string;
  isRequired: boolean;
  calculationMethod: string;
}

export interface MaterialCalculationResult {
  materials: CalculatedMaterial[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Calculate materials required for a wall measurement
 */
export function calculateWallMaterials(measurement: EnhancedMeasurement): MaterialCalculationResult {
  const materials: CalculatedMaterial[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Base measurements
  const length = measurement.unit === 'LM' ? measurement.realValue : 0;
  const area = measurement.unit === 'M2' ? measurement.realValue : 0;
  const height = area > 0 && length > 0 ? area / length : 2.4; // Default 2.4m height

  // Calculate wall area if only length is provided
  const wallArea = area > 0 ? area : length * height;

  if (!measurement.structureType) {
    warnings.push('Structure type not specified - using default calculations');
  }

  // 1. FRAMING MATERIALS
  if (measurement.framing && !measurement.framing.includes('None')) {
    // Studs (vertical members) - 600mm centers + end studs
    const studCount = Math.ceil((length / 0.6) + 1);
    const studLength = height;
    const totalStudLength = studCount * studLength;

    materials.push({
      name: measurement.framing,
      quantity: totalStudLength,
      unit: 'LM',
      category: 'Framing',
      nccCode: 'B1.2',
      asStandard: 'AS 1684.2',
      description: `Vertical studs @ 600mm centers (${studCount} studs)`,
      isRequired: true,
      calculationMethod: `Length ${length.toFixed(2)}m ÷ 0.6m centers + 1 = ${studCount} studs × ${height}m height`
    });

    // Top and bottom plates
    const plateLength = length * 2; // Top and bottom
    materials.push({
      name: `${measurement.framing} - Plates`,
      quantity: plateLength,
      unit: 'LM',
      category: 'Framing',
      nccCode: 'B1.2',
      asStandard: 'AS 1684.2',
      description: 'Top and bottom plates',
      isRequired: true,
      calculationMethod: `${length.toFixed(2)}m × 2 (top + bottom)`
    });

    // Noggins (horizontal bracing) - typically 3 rows for 2.4m height
    const noggingRows = Math.ceil(height / 1.2);
    const noggingLength = length * noggingRows;
    materials.push({
      name: `${measurement.framing} - Noggins`,
      quantity: noggingLength,
      unit: 'LM',
      category: 'Framing',
      nccCode: 'B1.2',
      asStandard: 'AS 1684.2',
      description: `Horizontal noggins (${noggingRows} rows)`,
      isRequired: true,
      calculationMethod: `${length.toFixed(2)}m × ${noggingRows} rows`
    });

    // Fixings for timber framing
    if (measurement.framing.includes('Timber')) {
      // 90mm nails - approximately 50 per stud
      const nailCount = studCount * 50;
      materials.push({
        name: '90mm Galvanized Nails',
        quantity: Math.ceil(nailCount / 100), // Sold in boxes of 100
        unit: 'boxes',
        category: 'Fixings',
        asStandard: 'AS 2329.1',
        description: 'Frame nails for timber studs',
        isRequired: true,
        calculationMethod: `${studCount} studs × 50 nails ≈ ${nailCount} nails`
      });
    }

    // Fixings for steel framing
    if (measurement.framing.includes('Steel')) {
      // Self-drilling screws - Type 17 - 14g × 25mm
      const screwCount = studCount * 40;
      materials.push({
        name: 'Type 17 Screws 14g × 25mm',
        quantity: Math.ceil(screwCount / 100),
        unit: 'boxes',
        category: 'Fixings',
        asStandard: 'AS 3566.1',
        description: 'Self-drilling screws for steel frame',
        isRequired: true,
        calculationMethod: `${studCount} studs × 40 screws ≈ ${screwCount} screws`
      });
    }
  } else {
    warnings.push('No framing specified - framing materials not calculated');
  }

  // 2. INSULATION
  if (measurement.insulation && !measurement.insulation.includes('None')) {
    const insulationArea = wallArea;
    const wasteFactor = 1.1; // 10% waste

    materials.push({
      name: measurement.insulation,
      quantity: insulationArea * wasteFactor,
      unit: 'M2',
      category: 'Insulation',
      nccCode: 'J1.2',
      asStandard: 'AS/NZS 4859.1',
      description: 'Wall insulation batts',
      isRequired: measurement.structureType === 'external_wall',
      calculationMethod: `${wallArea.toFixed(2)}m² × 1.1 (10% waste)`
    });
  } else if (measurement.structureType === 'external_wall') {
    warnings.push('External walls require insulation per NCC J1.2');
    suggestions.push('Add insulation: Consider R2.5 or R3.0 batts for external walls');
  }

  // 3. LINING
  if (measurement.lining?.type && !measurement.lining.type.includes('None')) {
    const sides = measurement.lining.sides === 'both' ? 2 : 1;
    const liningArea = wallArea * sides;
    const wasteFactor = 1.1; // 10% waste for cutting

    materials.push({
      name: measurement.lining.type,
      quantity: liningArea * wasteFactor,
      unit: 'M2',
      category: 'Lining',
      nccCode: 'C1.8',
      asStandard: 'AS/NZS 2588',
      description: `Wall lining - ${sides === 2 ? 'both sides' : 'one side'}`,
      isRequired: true,
      calculationMethod: `${wallArea.toFixed(2)}m² × ${sides} side(s) × 1.1 (10% waste)`
    });

    // Plasterboard screws
    if (measurement.lining.type.includes('Plasterboard')) {
      // 25-30 screws per m²
      const screwsPerM2 = 30;
      const totalScrews = liningArea * screwsPerM2;

      materials.push({
        name: 'Plasterboard Screws 25mm',
        quantity: Math.ceil(totalScrews / 1000),
        unit: 'boxes (1000)',
        category: 'Fixings',
        asStandard: 'AS 2589',
        description: 'Self-tapping plasterboard screws',
        isRequired: true,
        calculationMethod: `${liningArea.toFixed(2)}m² × 30 screws/m² ≈ ${totalScrews.toFixed(0)} screws`
      });

      // Jointing compound
      const compoundPerM2 = 0.3; // kg per m²
      materials.push({
        name: 'Jointing Compound',
        quantity: Math.ceil((liningArea * compoundPerM2) / 20), // 20kg bags
        unit: 'bags (20kg)',
        category: 'Finishing',
        asStandard: 'AS/NZS 2589',
        description: 'Plasterboard jointing compound',
        isRequired: true,
        calculationMethod: `${liningArea.toFixed(2)}m² × 0.3kg/m² ≈ ${(liningArea * compoundPerM2).toFixed(1)}kg`
      });

      // Paper tape
      const tapeLength = wallArea / 2; // Approximate joint length
      materials.push({
        name: 'Paper Jointing Tape',
        quantity: Math.ceil(tapeLength / 75), // 75m rolls
        unit: 'rolls',
        category: 'Finishing',
        asStandard: 'AS/NZS 2589',
        description: 'Paper tape for plasterboard joints',
        isRequired: true,
        calculationMethod: `≈${tapeLength.toFixed(0)}m joint length`
      });
    }

    // Corner beads for plasterboard (external corners)
    if (measurement.lining.type.includes('Plasterboard')) {
      const cornerBeadLength = height * 2; // Estimate 2 corners
      materials.push({
        name: 'Metal Corner Bead',
        quantity: cornerBeadLength,
        unit: 'LM',
        category: 'Finishing',
        asStandard: 'AS/NZS 2589',
        description: 'External corner protection',
        isRequired: false,
        calculationMethod: `${height}m × 2 corners (estimated)`
      });
    }
  } else {
    warnings.push('No lining specified - lining materials not calculated');
  }

  // 4. SPECIAL REQUIREMENTS FOR WET AREAS
  if (measurement.structureType === 'wet_area') {
    // Waterproofing membrane
    materials.push({
      name: 'Waterproofing Membrane',
      quantity: wallArea * 1.15, // 15% waste/overlap
      unit: 'M2',
      category: 'Waterproofing',
      nccCode: 'F1.9',
      asStandard: 'AS 3740',
      description: 'Waterproofing for wet area walls',
      isRequired: true,
      calculationMethod: `${wallArea.toFixed(2)}m² × 1.15 (15% overlap)`
    });

    // Waterproof tape for joints
    const tapeLength = (length + height) * 2; // Perimeter estimate
    materials.push({
      name: 'Waterproof Sealing Tape',
      quantity: Math.ceil(tapeLength / 10), // 10m rolls
      unit: 'rolls',
      category: 'Waterproofing',
      asStandard: 'AS 3740',
      description: 'Tape for waterproofing joints',
      isRequired: true,
      calculationMethod: `Perimeter ≈${tapeLength.toFixed(0)}m`
    });

    if (!measurement.lining?.type?.includes('Villaboard')) {
      suggestions.push('Wet areas: Consider using Villaboard (cement sheet) instead of standard plasterboard');
    }
  }

  return { materials, warnings, suggestions };
}

/**
 * Calculate materials for floor measurement
 */
export function calculateFloorMaterials(measurement: EnhancedMeasurement): MaterialCalculationResult {
  const materials: CalculatedMaterial[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const area = measurement.unit === 'M2' ? measurement.realValue : 0;

  if (area === 0) {
    warnings.push('Floor measurement should be in M2 for accurate material calculation');
    return { materials, warnings, suggestions };
  }

  const wasteFactor = 1.1; // 10% waste

  // FLOORING MATERIALS
  if (measurement.flooring && !measurement.flooring.includes('None')) {

    // TILES
    if (measurement.flooring.includes('Tiles')) {
      // Tiles
      materials.push({
        name: 'Floor Tiles',
        quantity: area * wasteFactor,
        unit: 'M2',
        category: 'Flooring',
        nccCode: 'C1.14',
        asStandard: 'AS 4459.10',
        description: 'Ceramic/porcelain floor tiles',
        isRequired: true,
        calculationMethod: `${area.toFixed(2)}m² × 1.1 (10% waste)`
      });

      // Tile adhesive - 3-5 kg/m²
      const adhesivePerM2 = 4;
      materials.push({
        name: 'Tile Adhesive',
        quantity: Math.ceil((area * adhesivePerM2) / 20), // 20kg bags
        unit: 'bags (20kg)',
        category: 'Flooring',
        asStandard: 'AS ISO 13007.1',
        description: 'Flexible tile adhesive',
        isRequired: true,
        calculationMethod: `${area.toFixed(2)}m² × 4kg/m² ≈ ${(area * adhesivePerM2).toFixed(1)}kg`
      });

      // Grout - 1-2 kg/m²
      const groutPerM2 = 1.5;
      materials.push({
        name: 'Tile Grout',
        quantity: Math.ceil((area * groutPerM2) / 5), // 5kg bags
        unit: 'bags (5kg)',
        category: 'Flooring',
        asStandard: 'AS ISO 13007.3',
        description: 'Tile grout',
        isRequired: true,
        calculationMethod: `${area.toFixed(2)}m² × 1.5kg/m² ≈ ${(area * groutPerM2).toFixed(1)}kg`
      });

      // Tile spacers
      materials.push({
        name: 'Tile Spacers (3mm)',
        quantity: Math.ceil(area / 5), // 1 bag per 5m²
        unit: 'bags',
        category: 'Accessories',
        description: 'Tile spacers for consistent joints',
        isRequired: true,
        calculationMethod: `${area.toFixed(2)}m² ÷ 5 (coverage per bag)`
      });
    }

    // TIMBER FLOORING
    if (measurement.flooring.includes('Timber')) {
      materials.push({
        name: 'Timber Flooring',
        quantity: area * 1.15, // 15% waste for timber
        unit: 'M2',
        category: 'Flooring',
        nccCode: 'C1.14',
        asStandard: 'AS/NZS 1080.1',
        description: 'Hardwood timber flooring',
        isRequired: true,
        calculationMethod: `${area.toFixed(2)}m² × 1.15 (15% waste)`
      });

      // Timber flooring adhesive
      const adhesivePerM2 = 1.2; // kg/m²
      materials.push({
        name: 'Timber Floor Adhesive',
        quantity: Math.ceil((area * adhesivePerM2) / 15), // 15kg buckets
        unit: 'buckets (15kg)',
        category: 'Flooring',
        asStandard: 'AS/NZS 4266',
        description: 'Polyurethane floor adhesive',
        isRequired: true,
        calculationMethod: `${area.toFixed(2)}m² × 1.2kg/m²`
      });
    }

    // CARPET
    if (measurement.flooring.includes('Carpet')) {
      materials.push({
        name: 'Carpet',
        quantity: area * 1.08, // 8% waste
        unit: 'M2',
        category: 'Flooring',
        asStandard: 'AS/NZS 4288',
        description: 'Commercial grade carpet',
        isRequired: true,
        calculationMethod: `${area.toFixed(2)}m² × 1.08 (8% waste)`
      });

      // Carpet underlay
      materials.push({
        name: 'Carpet Underlay',
        quantity: area,
        unit: 'M2',
        category: 'Flooring',
        asStandard: 'AS/NZS 4288',
        description: 'Carpet underlay/padding',
        isRequired: true,
        calculationMethod: `${area.toFixed(2)}m²`
      });

      // Gripper strips (perimeter)
      const perimeter = Math.sqrt(area) * 4; // Rough estimate
      materials.push({
        name: 'Carpet Gripper Strips',
        quantity: perimeter,
        unit: 'LM',
        category: 'Flooring',
        description: 'Perimeter gripper strips',
        isRequired: true,
        calculationMethod: `Perimeter ≈${perimeter.toFixed(1)}m`
      });
    }

    // VINYL/LVT
    if (measurement.flooring.includes('Vinyl')) {
      materials.push({
        name: 'Vinyl Flooring',
        quantity: area * 1.1,
        unit: 'M2',
        category: 'Flooring',
        asStandard: 'AS 4266',
        description: 'Luxury vinyl tile/plank',
        isRequired: true,
        calculationMethod: `${area.toFixed(2)}m² × 1.1 (10% waste)`
      });

      // Vinyl adhesive
      const adhesivePerM2 = 0.3; // kg/m²
      materials.push({
        name: 'Vinyl Floor Adhesive',
        quantity: Math.ceil((area * adhesivePerM2) / 15),
        unit: 'buckets (15kg)',
        category: 'Flooring',
        description: 'Pressure-sensitive vinyl adhesive',
        isRequired: true,
        calculationMethod: `${area.toFixed(2)}m² × 0.3kg/m²`
      });
    }

    // CONCRETE/EPOXY
    if (measurement.flooring.includes('Concrete') || measurement.flooring.includes('Epoxy')) {
      // Concrete sealer/epoxy
      const coats = 2;
      const coveragePerCoat = 6; // m² per liter
      const litersNeeded = (area * coats) / coveragePerCoat;

      materials.push({
        name: measurement.flooring.includes('Epoxy') ? 'Epoxy Floor Coating' : 'Concrete Sealer',
        quantity: Math.ceil(litersNeeded / 4), // 4L kits
        unit: 'kits (4L)',
        category: 'Flooring',
        asStandard: 'AS 3727',
        description: `${coats} coat system`,
        isRequired: true,
        calculationMethod: `${area.toFixed(2)}m² × ${coats} coats ÷ 6m²/L ≈ ${litersNeeded.toFixed(1)}L`
      });

      // Concrete primer
      materials.push({
        name: 'Concrete Primer',
        quantity: Math.ceil((area / 8) / 4), // 8m²/L coverage, 4L kits
        unit: 'kits (4L)',
        category: 'Flooring',
        description: 'Epoxy primer for concrete',
        isRequired: true,
        calculationMethod: `${area.toFixed(2)}m² ÷ 8m²/L`
      });
    }
  }

  // WET AREA WATERPROOFING
  if (measurement.structureType === 'wet_area' || measurement.area === 'Bathroom' || measurement.area === 'Ensuite') {
    materials.push({
      name: 'Floor Waterproofing Membrane',
      quantity: area * 1.2, // 20% overlap
      unit: 'M2',
      category: 'Waterproofing',
      nccCode: 'F1.9',
      asStandard: 'AS 3740',
      description: 'Waterproofing for wet area floors',
      isRequired: true,
      calculationMethod: `${area.toFixed(2)}m² × 1.2 (20% overlap)`
    });

    // Waterproof tape for floor-wall joints
    const perimeter = Math.sqrt(area) * 4;
    materials.push({
      name: 'Waterproof Sealing Tape',
      quantity: Math.ceil(perimeter / 10),
      unit: 'rolls (10m)',
      category: 'Waterproofing',
      asStandard: 'AS 3740',
      description: 'Floor-wall junction tape',
      isRequired: true,
      calculationMethod: `Perimeter ≈${perimeter.toFixed(1)}m`
    });
  }

  return { materials, warnings, suggestions };
}

/**
 * Main calculation function - routes to appropriate calculator
 */
export function calculateRelatedMaterials(measurement: EnhancedMeasurement): MaterialCalculationResult {
  // Determine calculation type based on structure type and measurement type
  if (
    measurement.structureType?.includes('wall') ||
    measurement.type === 'line' ||
    measurement.structureType === 'load_bearing' ||
    measurement.structureType === 'non_load_bearing'
  ) {
    return calculateWallMaterials(measurement);
  }

  if (
    measurement.structureType === 'floor' ||
    measurement.type === 'rectangle' ||
    measurement.type === 'polygon' ||
    (measurement.type === 'circle' && measurement.flooring)
  ) {
    return calculateFloorMaterials(measurement);
  }

  // Default - no calculations
  return {
    materials: [],
    warnings: ['Unable to determine calculation type - please specify structure type'],
    suggestions: ['Add structure type and material selections for automatic calculations']
  };
}
