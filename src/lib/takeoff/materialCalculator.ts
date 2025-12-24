// Smart Material Calculator for Australian Construction
// Automatically calculates ALL related materials from a single measurement

import { EnhancedMeasurement } from '@/components/takeoff/TakeoffTableEnhanced';
import { getMaterialCost, getMaterialById, MATERIAL_DATABASE } from './materialDatabase';

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

// Default wall height in metres
const DEFAULT_WALL_HEIGHT = 2.4;

// Stud spacing in metres
const STUD_SPACING = 0.6;

// Noggin rows per wall height
const NOGGIN_ROWS = 3;

// Screws per m² of plasterboard
const SCREWS_PER_M2 = 30;

// Jointing compound kg per m²
const COMPOUND_PER_M2 = 0.3;

// Tile adhesive kg per m²
const TILE_ADHESIVE_PER_M2 = 4;

// Grout kg per m²
const GROUT_PER_M2 = 1.5;

/**
 * Calculate wall materials from a line/rectangle measurement
 */
function calculateWallMaterials(measurement: EnhancedMeasurement): CalculatedMaterial[] {
  const materials: CalculatedMaterial[] = [];
  
  // Get wall length (realValue for line, or perimeter for rectangle)
  const wallLength = measurement.type === 'line' 
    ? measurement.realValue 
    : measurement.dimensions 
      ? (measurement.dimensions.width + measurement.dimensions.height) * 2 
      : measurement.realValue;
  
  const wallHeight = measurement.dimensions?.height || DEFAULT_WALL_HEIGHT;
  const wallArea = wallLength * wallHeight;
  const liningSides = measurement.liningSides === 'both' ? 2 : 1;

  // ===== FRAMING =====
  if (measurement.framing) {
    const isTimber = measurement.framing.toLowerCase().includes('timber');
    const studSize = measurement.framing.includes('90') ? '90' : '70';
    
    // Calculate stud count: (length / spacing) + 1
    const studCount = Math.ceil(wallLength / STUD_SPACING) + 1;
    const totalStudLength = studCount * wallHeight;
    
    materials.push({
      name: `${studSize}mm ${isTimber ? 'Timber' : 'Steel'} Stud`,
      quantity: Number(totalStudLength.toFixed(2)),
      unit: 'LM',
      category: 'Framing',
      nccCode: 'B1.2',
      asStandard: isTimber ? 'AS 1684.2' : 'AS/NZS 4600',
      description: `Vertical studs @ ${STUD_SPACING * 1000}mm centers`,
      isRequired: true,
      calculationMethod: `${wallLength.toFixed(1)}m ÷ ${STUD_SPACING}m + 1 = ${studCount} studs × ${wallHeight}m = ${totalStudLength.toFixed(1)}m`,
    });

    // Plates (top + bottom)
    const plateLength = wallLength * 2;
    materials.push({
      name: `${studSize}mm ${isTimber ? 'Timber Plate' : 'Steel Track'}`,
      quantity: Number(plateLength.toFixed(2)),
      unit: 'LM',
      category: 'Framing',
      nccCode: 'B1.2',
      asStandard: isTimber ? 'AS 1684.2' : 'AS/NZS 4600',
      description: 'Top and bottom plates',
      isRequired: true,
      calculationMethod: `${wallLength.toFixed(1)}m × 2 (top + bottom) = ${plateLength.toFixed(1)}m`,
    });

    // Noggins (horizontal bracing)
    const nogginsPerBay = NOGGIN_ROWS;
    const totalNogginLength = (studCount - 1) * STUD_SPACING * nogginsPerBay;
    materials.push({
      name: `${studSize}mm ${isTimber ? 'Timber Noggin' : 'Steel Nogging'}`,
      quantity: Number(totalNogginLength.toFixed(2)),
      unit: 'LM',
      category: 'Framing',
      nccCode: 'B1.2',
      asStandard: isTimber ? 'AS 1684.2' : 'AS/NZS 4600',
      description: `${nogginsPerBay} rows of horizontal bracing`,
      isRequired: true,
      calculationMethod: `${studCount - 1} bays × ${STUD_SPACING}m × ${nogginsPerBay} rows = ${totalNogginLength.toFixed(1)}m`,
    });

    // Nails for timber framing
    if (isTimber) {
      const nailsPerStud = 8;
      const totalNails = studCount * nailsPerStud + (studCount - 1) * nogginsPerBay * 4;
      materials.push({
        name: '90mm Galvanized Nails',
        quantity: Math.ceil(totalNails),
        unit: 'EA',
        category: 'Fixings',
        asStandard: 'AS 2329.1',
        description: 'Framing nails',
        isRequired: true,
        calculationMethod: `${studCount} studs × ${nailsPerStud} + noggins = ${Math.ceil(totalNails)} nails`,
      });
    }
  }

  // ===== LINING =====
  if (measurement.lining) {
    const isVillaboard = measurement.lining.toLowerCase().includes('villaboard');
    const liningThickness = measurement.lining.includes('13') ? '13' : 
                           measurement.lining.includes('16') ? '16' : '10';
    
    const liningArea = wallArea * liningSides * 1.10; // 10% waste
    
    materials.push({
      name: isVillaboard ? '6mm Villaboard' : `${liningThickness}mm Plasterboard`,
      quantity: Number(liningArea.toFixed(2)),
      unit: 'M2',
      category: 'Lining',
      nccCode: isVillaboard ? 'F1.9' : 'C1.8',
      asStandard: isVillaboard ? 'AS 3740' : 'AS/NZS 2588',
      description: `${liningSides === 2 ? 'Both sides' : 'One side'} + 10% waste`,
      isRequired: true,
      calculationMethod: `${wallArea.toFixed(1)}m² × ${liningSides} sides × 1.10 waste = ${liningArea.toFixed(1)}m²`,
    });

    // Screws
    const screwCount = Math.ceil(liningArea * SCREWS_PER_M2);
    materials.push({
      name: 'Plasterboard Screws',
      quantity: screwCount,
      unit: 'EA',
      category: 'Fixings',
      asStandard: 'AS 2589',
      description: `${SCREWS_PER_M2} per m²`,
      isRequired: true,
      calculationMethod: `${liningArea.toFixed(1)}m² × ${SCREWS_PER_M2}/m² = ${screwCount}`,
    });

    // Jointing compound
    const compoundKg = liningArea * COMPOUND_PER_M2;
    materials.push({
      name: 'Jointing Compound',
      quantity: Number(compoundKg.toFixed(2)),
      unit: 'kg',
      category: 'Finishing',
      asStandard: 'AS/NZS 2589',
      description: `${COMPOUND_PER_M2}kg per m²`,
      isRequired: true,
      calculationMethod: `${liningArea.toFixed(1)}m² × ${COMPOUND_PER_M2}kg/m² = ${compoundKg.toFixed(1)}kg`,
    });

    // Paper tape (1 roll per ~50m of joints)
    const studCountEstimate = Math.ceil(wallLength / STUD_SPACING) + 1;
    const jointLength = (wallLength * (liningSides === 2 ? 4 : 2)) + (wallHeight * studCountEstimate);
    const tapeRolls = Math.ceil(jointLength / 75);
    materials.push({
      name: 'Paper Tape',
      quantity: tapeRolls,
      unit: 'roll',
      category: 'Finishing',
      asStandard: 'AS/NZS 2589',
      description: '75m rolls',
      isRequired: true,
      calculationMethod: `~${jointLength.toFixed(0)}m joints ÷ 75m/roll = ${tapeRolls} rolls`,
    });
  }

  // ===== INSULATION =====
  if (measurement.insulation) {
    const rValue = measurement.insulation.includes('3.0') ? 'R3.0' : 
                   measurement.insulation.includes('4.0') ? 'R4.0' : 'R2.5';
    
    const insulationArea = wallArea * 1.10; // 10% waste
    
    materials.push({
      name: `${rValue} Insulation Batts`,
      quantity: Number(insulationArea.toFixed(2)),
      unit: 'M2',
      category: 'Insulation',
      nccCode: 'J1.2',
      asStandard: 'AS/NZS 4859.1',
      description: '10% waste included',
      isRequired: true,
      calculationMethod: `${wallArea.toFixed(1)}m² × 1.10 waste = ${insulationArea.toFixed(1)}m²`,
    });
  }

  // ===== WET AREA WATERPROOFING =====
  const isWetArea = ['Bathroom', 'Ensuite', 'WC', 'Laundry'].includes(measurement.area || '');
  if (isWetArea && measurement.lining) {
    const waterproofArea = wallArea * 1.20; // 20% for upturns
    materials.push({
      name: 'Waterproofing Membrane',
      quantity: Number(waterproofArea.toFixed(2)),
      unit: 'M2',
      category: 'Waterproofing',
      nccCode: 'F1.9',
      asStandard: 'AS 3740',
      description: 'Wet area walls + 20% for upturns',
      isRequired: true,
      calculationMethod: `${wallArea.toFixed(1)}m² × 1.20 = ${waterproofArea.toFixed(1)}m²`,
    });

    // Corner/joint tape
    const tapeLength = wallLength * 2 + wallHeight * 4;
    materials.push({
      name: 'Waterproofing Sealing Tape',
      quantity: Number(tapeLength.toFixed(1)),
      unit: 'LM',
      category: 'Waterproofing',
      nccCode: 'F1.9',
      asStandard: 'AS 3740',
      description: 'Corner and joint sealing',
      isRequired: true,
      calculationMethod: `Corners + joints = ${tapeLength.toFixed(1)}m`,
    });
  }

  return materials;
}

/**
 * Calculate floor materials from an area measurement
 */
function calculateFloorMaterials(measurement: EnhancedMeasurement): CalculatedMaterial[] {
  const materials: CalculatedMaterial[] = [];
  
  const floorArea = measurement.realValue;
  const perimeter = measurement.dimensions 
    ? (measurement.dimensions.width + measurement.dimensions.height) * 2
    : Math.sqrt(floorArea) * 4; // Estimate perimeter

  const isWetArea = ['Bathroom', 'Ensuite', 'WC', 'Laundry', 'Kitchen'].includes(measurement.area || '');

  // ===== FLOORING BASED ON TYPE =====
  if (measurement.flooring) {
    const flooringType = measurement.flooring.toLowerCase();

    if (flooringType.includes('tile')) {
      // Tiles
      const tileArea = floorArea * 1.08; // 8% waste
      materials.push({
        name: flooringType.includes('porcelain') ? 'Porcelain Floor Tiles' : 'Ceramic Floor Tiles',
        quantity: Number(tileArea.toFixed(2)),
        unit: 'M2',
        category: 'Flooring',
        nccCode: 'D2.14',
        asStandard: 'AS 4586',
        description: '8% waste included',
        isRequired: true,
        calculationMethod: `${floorArea.toFixed(1)}m² × 1.08 waste = ${tileArea.toFixed(1)}m²`,
      });

      // Adhesive
      const adhesiveKg = floorArea * TILE_ADHESIVE_PER_M2;
      materials.push({
        name: 'Tile Adhesive',
        quantity: Number(adhesiveKg.toFixed(1)),
        unit: 'kg',
        category: 'Flooring',
        asStandard: 'AS 4992',
        description: `${TILE_ADHESIVE_PER_M2}kg per m²`,
        isRequired: true,
        calculationMethod: `${floorArea.toFixed(1)}m² × ${TILE_ADHESIVE_PER_M2}kg/m² = ${adhesiveKg.toFixed(1)}kg`,
      });

      // Grout
      const groutKg = floorArea * GROUT_PER_M2;
      materials.push({
        name: 'Tile Grout',
        quantity: Number(groutKg.toFixed(1)),
        unit: 'kg',
        category: 'Flooring',
        asStandard: 'AS 4992',
        description: `${GROUT_PER_M2}kg per m²`,
        isRequired: true,
        calculationMethod: `${floorArea.toFixed(1)}m² × ${GROUT_PER_M2}kg/m² = ${groutKg.toFixed(1)}kg`,
      });
    } else if (flooringType.includes('timber')) {
      const timberArea = floorArea * 1.08;
      materials.push({
        name: 'Timber Flooring',
        quantity: Number(timberArea.toFixed(2)),
        unit: 'M2',
        category: 'Flooring',
        nccCode: 'D2.14',
        asStandard: 'AS/NZS 1080.1',
        description: '8% waste included',
        isRequired: true,
        calculationMethod: `${floorArea.toFixed(1)}m² × 1.08 waste = ${timberArea.toFixed(1)}m²`,
      });
    } else if (flooringType.includes('vinyl') || flooringType.includes('lvt')) {
      const vinylArea = floorArea * 1.07;
      materials.push({
        name: 'LVT Vinyl Planks',
        quantity: Number(vinylArea.toFixed(2)),
        unit: 'M2',
        category: 'Flooring',
        nccCode: 'D2.14',
        asStandard: 'AS 4586',
        description: '7% waste included',
        isRequired: true,
        calculationMethod: `${floorArea.toFixed(1)}m² × 1.07 waste = ${vinylArea.toFixed(1)}m²`,
      });
    } else if (flooringType.includes('carpet')) {
      const carpetArea = floorArea * 1.10;
      materials.push({
        name: 'Carpet',
        quantity: Number(carpetArea.toFixed(2)),
        unit: 'M2',
        category: 'Flooring',
        nccCode: 'D2.14',
        asStandard: 'AS 4586',
        description: '10% waste included',
        isRequired: true,
        calculationMethod: `${floorArea.toFixed(1)}m² × 1.10 waste = ${carpetArea.toFixed(1)}m²`,
      });

      // Underlay
      materials.push({
        name: 'Carpet Underlay',
        quantity: Number((floorArea * 1.05).toFixed(2)),
        unit: 'M2',
        category: 'Flooring',
        description: '5% waste included',
        isRequired: true,
        calculationMethod: `${floorArea.toFixed(1)}m² × 1.05 waste`,
      });

      // Gripper strips
      materials.push({
        name: 'Gripper Strips',
        quantity: Number(perimeter.toFixed(1)),
        unit: 'LM',
        category: 'Flooring',
        description: 'Perimeter gripper',
        isRequired: true,
        calculationMethod: `Perimeter = ${perimeter.toFixed(1)}m`,
      });
    } else if (flooringType.includes('epoxy')) {
      // Epoxy coverage: ~6m² per litre
      const epoxyCoverage = 6;
      const epoxy = (floorArea / epoxyCoverage) * 2; // 2 coats
      materials.push({
        name: 'Epoxy Floor Coating',
        quantity: Number(epoxy.toFixed(1)),
        unit: 'L',
        category: 'Paint',
        asStandard: 'AS 3727',
        description: '2 coats @ 6m²/L',
        isRequired: true,
        calculationMethod: `${floorArea.toFixed(1)}m² ÷ ${epoxyCoverage}m²/L × 2 coats = ${epoxy.toFixed(1)}L`,
      });
    }
  }

  // ===== WET AREA WATERPROOFING =====
  if (isWetArea) {
    const waterproofArea = floorArea * 1.20; // 20% for wall upturns
    materials.push({
      name: 'Waterproofing Membrane',
      quantity: Number(waterproofArea.toFixed(2)),
      unit: 'M2',
      category: 'Waterproofing',
      nccCode: 'F1.9',
      asStandard: 'AS 3740',
      description: 'Floor + 200mm wall upturns',
      isRequired: true,
      calculationMethod: `${floorArea.toFixed(1)}m² × 1.20 = ${waterproofArea.toFixed(1)}m²`,
    });

    // Floor-wall junction tape
    materials.push({
      name: 'Waterproofing Sealing Tape',
      quantity: Number(perimeter.toFixed(1)),
      unit: 'LM',
      category: 'Waterproofing',
      nccCode: 'F1.9',
      asStandard: 'AS 3740',
      description: 'Floor-wall junction',
      isRequired: true,
      calculationMethod: `Perimeter = ${perimeter.toFixed(1)}m`,
    });
  }

  return materials;
}

/**
 * Generate warnings based on measurement configuration
 */
function generateWarnings(measurement: EnhancedMeasurement): string[] {
  const warnings: string[] = [];
  const isWallType = measurement.structureType?.includes('wall');
  const isExternalWall = measurement.structureType === 'external_wall';
  const isWetArea = ['Bathroom', 'Ensuite', 'WC', 'Laundry'].includes(measurement.area || '');

  if (isWallType && !measurement.framing) {
    warnings.push('No framing specified - wall materials cannot be calculated');
  }

  if (isExternalWall && !measurement.insulation) {
    warnings.push('External walls require insulation per NCC J1.2');
  }

  if (isWetArea && measurement.lining && !measurement.lining.toLowerCase().includes('villaboard')) {
    // This is more of a suggestion, but could be a warning
  }

  if (isWetArea && measurement.structureType === 'floor' && !measurement.flooring?.toLowerCase().includes('tile')) {
    warnings.push('Wet area floors typically require tiled finish per NCC F1.9');
  }

  return warnings;
}

/**
 * Generate suggestions based on measurement configuration
 */
function generateSuggestions(measurement: EnhancedMeasurement): string[] {
  const suggestions: string[] = [];
  const isWetArea = ['Bathroom', 'Ensuite', 'WC', 'Laundry'].includes(measurement.area || '');
  const isExternalWall = measurement.structureType === 'external_wall';

  if (isWetArea && measurement.lining && !measurement.lining.toLowerCase().includes('villaboard')) {
    suggestions.push('Wet areas: Consider using Villaboard instead of standard plasterboard per AS 3740');
  }

  if (isExternalWall && !measurement.insulation) {
    suggestions.push('Add insulation: Consider R2.5+ batts for external walls (NCC J1.2)');
  }

  if (isExternalWall && measurement.insulation?.includes('R2.5')) {
    suggestions.push('For improved thermal performance, consider upgrading to R3.0 or R4.0 batts');
  }

  if (measurement.structureType === 'internal_wall' && measurement.liningSides !== 'both') {
    suggestions.push('Internal walls typically have lining on both sides');
  }

  return suggestions;
}

/**
 * Main function: Calculate all related materials from a measurement
 */
export function calculateRelatedMaterials(measurement: EnhancedMeasurement): MaterialCalculationResult {
  const isWallType = measurement.structureType?.includes('wall') || measurement.type === 'line';
  const isFloorType = measurement.structureType === 'floor' || 
                      (measurement.type === 'rectangle' && !measurement.structureType?.includes('wall')) ||
                      measurement.type === 'polygon';

  let materials: CalculatedMaterial[] = [];

  if (isWallType && (measurement.framing || measurement.lining || measurement.insulation)) {
    materials = calculateWallMaterials(measurement);
  } else if (isFloorType && measurement.flooring) {
    materials = calculateFloorMaterials(measurement);
  }

  const warnings = generateWarnings(measurement);
  const suggestions = generateSuggestions(measurement);

  return {
    materials,
    warnings,
    suggestions,
  };
}

/**
 * Get material count summary
 */
export function getMaterialSummary(result: MaterialCalculationResult): { 
  totalItems: number; 
  categories: string[]; 
  hasWarnings: boolean;
} {
  const categories = [...new Set(result.materials.map(m => m.category))];
  return {
    totalItems: result.materials.length,
    categories,
    hasWarnings: result.warnings.length > 0,
  };
}
