// Estimate Connector: Converts calculated materials to cost items
// Links to material database for pricing

import { CostItem, MeasurementUnit } from './types';
import { CalculatedMaterial } from './materialCalculator';
import { getMaterialCost, searchMaterials } from './materialDatabase';

/**
 * Convert a single calculated material to a cost item
 */
export function calculatedMaterialToCostItem(
  material: CalculatedMaterial,
  measurementId: string
): CostItem {
  // Look up cost from database
  const unitCost = getMaterialCost(material.name) || 0;
  
  // Map string unit to MeasurementUnit type
  const unitMap: Record<string, MeasurementUnit> = {
    'LM': 'LM',
    'M2': 'M2',
    'm²': 'M2',
    'M3': 'M3',
    'm³': 'M3',
    'EA': 'count',
    'ea': 'count',
    'kg': 'count',
    'L': 'count',
    'roll': 'count',
  };
  
  const mappedUnit = unitMap[material.unit] || 'count';
  
  // Build description with NCC/AS references
  const descParts: string[] = [material.description];
  if (material.nccCode) {
    descParts.push(`NCC ${material.nccCode}`);
  }
  if (material.asStandard) {
    descParts.push(material.asStandard);
  }
  
  return {
    id: `cost-${crypto.randomUUID().slice(0, 8)}`,
    category: material.category,
    name: material.name,
    description: descParts.join(' - '),
    unit: mappedUnit,
    unitCost,
    quantity: material.quantity,
    linkedMeasurements: [measurementId],
    wasteFactor: 0, // Already included in calculation
    supplierCode: material.name.toLowerCase().replace(/\s+/g, '_').slice(0, 30),
    notes: `Auto-calculated. ${material.calculationMethod}`,
    subtotal: Number((material.quantity * unitCost).toFixed(2)),
  };
}

/**
 * Convert array of calculated materials to cost items
 */
export function calculatedMaterialsToCostItems(
  materials: CalculatedMaterial[],
  measurementId: string
): CostItem[] {
  return materials.map(material => 
    calculatedMaterialToCostItem(material, measurementId)
  );
}

/**
 * Merge duplicate cost items (same name + unit)
 */
export function mergeDuplicateCostItems(costItems: CostItem[]): CostItem[] {
  const merged = new Map<string, CostItem>();
  
  for (const item of costItems) {
    const key = `${item.name}|${item.unit}`;
    
    if (merged.has(key)) {
      const existing = merged.get(key)!;
      
      // Merge quantities
      existing.quantity += item.quantity;
      
      // Merge linked measurements
      existing.linkedMeasurements = [
        ...new Set([...existing.linkedMeasurements, ...item.linkedMeasurements])
      ];
      
      // Append notes
      if (item.notes && !existing.notes?.includes(item.notes)) {
        existing.notes = existing.notes 
          ? `${existing.notes}\n${item.notes}`
          : item.notes;
      }
      
      // Recalculate subtotal
      existing.subtotal = Number((existing.quantity * existing.unitCost).toFixed(2));
    } else {
      merged.set(key, { ...item });
    }
  }
  
  return Array.from(merged.values());
}

/**
 * Calculate total cost from cost items
 */
export function calculateTotalCost(costItems: CostItem[]): {
  materials: number;
  total: number;
  itemCount: number;
} {
  const total = costItems.reduce((sum, item) => sum + item.subtotal, 0);
  
  return {
    materials: total,
    total,
    itemCount: costItems.length,
  };
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
