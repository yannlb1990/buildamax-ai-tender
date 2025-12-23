// Structure assembly options for wall/column measurements

export const STRUCTURE_TYPES = [
  { value: 'external_wall', label: 'External Wall' },
  { value: 'internal_wall', label: 'Internal Wall' },
  { value: 'load_bearing', label: 'Load Bearing Wall' },
  { value: 'non_load_bearing', label: 'Non Load Bearing Wall' },
  { value: 'column', label: 'Column' },
  { value: 'floor', label: 'Floor' },
  { value: 'wet_area', label: 'Wet Area' },
] as const;

export const FRAMING_OPTIONS = [
  { value: 'timber_70mm_mgp10', label: 'Timber 70mm (MGP10)' },
  { value: 'timber_90mm_mgp12', label: 'Timber 90mm (MGP12)' },
  { value: 'steel_stud_64mm', label: 'Steel Stud 64mm' },
  { value: 'steel_stud_92mm', label: 'Steel Stud 92mm' },
  { value: 'other', label: 'Other' },
] as const;

export const LINING_OPTIONS = [
  { value: 'plasterboard_10mm', label: 'Plasterboard 10mm' },
  { value: 'plasterboard_13mm', label: 'Plasterboard 13mm' },
  { value: 'fibre_cement', label: 'Fibre Cement' },
  { value: 'none', label: 'None' },
] as const;

export const INSULATION_OPTIONS = [
  { value: 'r2.0', label: 'R2.0' },
  { value: 'r2.5', label: 'R2.5' },
  { value: 'r3.0', label: 'R3.0' },
  { value: 'acoustic', label: 'Acoustic Batts' },
  { value: 'none', label: 'None' },
] as const;

export const FLOORING_OPTIONS = [
  { value: 'tiles_bedding', label: 'Tiles + Bedding' },
  { value: 'vinyl', label: 'Vinyl' },
  { value: 'waterproofing', label: 'Waterproofing' },
  { value: 'other', label: 'Other' },
] as const;

export const LINING_SIDES_OPTIONS = [
  { value: 'one', label: 'One Side' },
  { value: 'both', label: 'Both Sides' },
] as const;

// NCC Code mapping based on structure and material selections
export const NCC_MAPPINGS: Record<string, Record<string, string>> = {
  external_wall: {
    plasterboard_10mm: 'NCC C1.9',
    plasterboard_13mm: 'NCC C1.9',
    fibre_cement: 'NCC C1.10',
  },
  internal_wall: {
    plasterboard_10mm: 'NCC C1.9',
    plasterboard_13mm: 'NCC C1.9',
  },
  load_bearing: {
    timber_70mm_mgp10: 'AS 1684.2',
    timber_90mm_mgp12: 'AS 1684.2',
    steel_stud_64mm: 'AS 4100',
    steel_stud_92mm: 'AS 4100',
  },
  wet_area: {
    waterproofing: 'NCC F1.7',
    tiles_bedding: 'NCC F1.7',
  },
  floor: {
    concrete: 'AS 3600',
    tiles_bedding: 'NCC F2.3',
  },
};

export const getNccCode = (
  structureType?: string,
  lining?: string,
  framing?: string,
  flooring?: string
): string => {
  if (!structureType) return '';
  const mapping = NCC_MAPPINGS[structureType];
  if (!mapping) return '';
  return mapping[lining || ''] || mapping[framing || ''] || mapping[flooring || ''] || '';
};
