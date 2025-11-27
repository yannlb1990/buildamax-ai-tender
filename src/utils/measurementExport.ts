interface Measurement {
  id: string;
  measurement_type: 'linear' | 'area';
  label: string | null;
  real_value: number | null;
  real_unit: string | null;
  trade: string | null;
  points: any;
}

export const exportMeasurementsToCSV = (measurements: Measurement[], planPageId: string) => {
  const headers = ['measurement_id', 'type', 'label', 'length_m', 'area_m2', 'category'];
  
  const rows = measurements.map(m => [
    m.id,
    m.measurement_type,
    m.label || '',
    m.measurement_type === 'linear' ? (m.real_value || 0).toFixed(2) : '',
    m.measurement_type === 'area' ? (m.real_value || 0).toFixed(2) : '',
    m.trade || ''
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `measurements_${planPageId.slice(0, 8)}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportMeasurementsToJSON = (measurements: Measurement[], planPageId: string) => {
  const linesMeasurements = measurements.filter(m => m.measurement_type === 'linear');
  const areaMeasurements = measurements.filter(m => m.measurement_type === 'area');
  
  const totalArea = areaMeasurements.reduce((sum, m) => sum + (m.real_value || 0), 0);

  const exportData = {
    plan_id: planPageId,
    measurements: measurements.map(m => ({
      measurement_id: m.id,
      type: m.measurement_type,
      label: m.label || '',
      length_m: m.measurement_type === 'linear' ? m.real_value : null,
      area_m2: m.measurement_type === 'area' ? m.real_value : null,
      category: m.trade || null,
      points: m.points
    })),
    totals: {
      total_lines: linesMeasurements.length,
      total_areas: areaMeasurements.length,
      total_area_m2: parseFloat(totalArea.toFixed(2))
    }
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `measurements_${planPageId.slice(0, 8)}_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
