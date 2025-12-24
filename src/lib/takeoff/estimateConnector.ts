/**
 * Estimate Connector
 * Converts measurements and calculated materials into cost items
 */

import { CostItem, MeasurementUnit } from './types';
import { CalculatedMaterial } from './materialCalculator';
import { MATERIAL_DATABASE, getMaterialById } from './materialDatabase';

/**
 * Convert a calculated material to a cost item
 */
export function calculatedMaterialToCostItem(
  material: CalculatedMaterial,
  measurementId: string
): CostItem {
  // Try to find material in database to get cost
  let unitCost = 0;
  let supplierCode: string | undefined;

  // Search database for matching material
  const materialId = Object.keys(MATERIAL_DATABASE).find(id => {
    const dbMaterial = MATERIAL_DATABASE[id];
    return dbMaterial.name.toLowerCase().includes(material.name.toLowerCase()) ||
           material.name.toLowerCase().includes(dbMaterial.name.toLowerCase());
  });

  if (materialId) {
    const dbMaterial = MATERIAL_DATABASE[materialId];
    unitCost = dbMaterial.typicalCost || 0;
    supplierCode = dbMaterial.id;
  }

  // Map material unit to MeasurementUnit
  let mappedUnit: MeasurementUnit = 'count';
  if (material.unit.includes('M2') || material.unit === 'M2') {
    mappedUnit = 'M2';
  } else if (material.unit.includes('M3') || material.unit === 'M3') {
    mappedUnit = 'M3';
  } else if (material.unit.includes('LM') || material.unit.toLowerCase().includes('lm')) {
    mappedUnit = 'LM';
  }

  const quantity = material.quantity;
  const wasteFactor = 0; // Already included in quantity calculation
  const subtotal = quantity * unitCost;

  return {
    id: `cost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    category: material.category,
    name: material.name,
    description: `${material.description}${material.nccCode ? ` (NCC ${material.nccCode})` : ''}${material.asStandard ? ` - ${material.asStandard}` : ''}`,
    unit: mappedUnit,
    unitCost,
    quantity,
    linkedMeasurements: [measurementId],
    wasteFactor,
    supplierCode,
    notes: `Auto-calculated from measurement. ${material.calculationMethod}`,
    subtotal
  };
}

/**
 * Convert multiple calculated materials to cost items
 */
export function calculatedMaterialsToCostItems(
  materials: CalculatedMaterial[],
  measurementId: string
): CostItem[] {
  return materials.map(material => calculatedMaterialToCostItem(material, measurementId));
}

/**
 * Group cost items by category
 */
export function groupCostItemsByCategory(costItems: CostItem[]): Record<string, CostItem[]> {
  return costItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, CostItem[]>);
}

/**
 * Calculate total cost from cost items
 */
export function calculateTotalCost(costItems: CostItem[]): {
  subtotal: number;
  totalQuantities: Record<MeasurementUnit, number>;
  byCategory: Record<string, number>;
} {
  const subtotal = costItems.reduce((sum, item) => sum + item.subtotal, 0);

  const totalQuantities = costItems.reduce((acc, item) => {
    acc[item.unit] = (acc[item.unit] || 0) + item.quantity;
    return acc;
  }, {} as Record<MeasurementUnit, number>);

  const byCategory = costItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.subtotal;
    return acc;
  }, {} as Record<string, number>);

  return { subtotal, totalQuantities, byCategory };
}

/**
 * Merge duplicate cost items (same name and unit)
 */
export function mergeDuplicateCostItems(costItems: CostItem[]): CostItem[] {
  const merged: Record<string, CostItem> = {};

  costItems.forEach(item => {
    const key = `${item.name}-${item.unit}`;

    if (merged[key]) {
      // Merge quantities
      merged[key].quantity += item.quantity;
      merged[key].subtotal += item.subtotal;
      // Merge linked measurements
      merged[key].linkedMeasurements = [
        ...new Set([...merged[key].linkedMeasurements, ...item.linkedMeasurements])
      ];
      // Append notes
      if (item.notes && !merged[key].notes?.includes(item.notes)) {
        merged[key].notes = `${merged[key].notes || ''}\n${item.notes}`;
      }
    } else {
      merged[key] = { ...item };
    }
  });

  return Object.values(merged);
}
