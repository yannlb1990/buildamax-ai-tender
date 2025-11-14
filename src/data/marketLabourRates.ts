// Australian Market Labour Rates by State (2025)
// Source: Master Builders Association & HIA Industry Standards
// Rates are per hour including super and on-costs

export interface LabourRate {
  trade: string;
  NSW: number;
  VIC: number;
  QLD: number;
  SA: number;
  WA: number;
  TAS: number;
  NT: number;
  ACT: number;
}

export const MARKET_LABOUR_RATES: LabourRate[] = [
  { trade: "Carpenter", NSW: 95, VIC: 90, QLD: 85, SA: 82, WA: 98, TAS: 80, NT: 105, ACT: 92 },
  { trade: "Plumber", NSW: 105, VIC: 100, QLD: 95, SA: 92, WA: 110, TAS: 90, NT: 115, ACT: 102 },
  { trade: "Electrician", NSW: 110, VIC: 105, QLD: 100, SA: 95, WA: 115, TAS: 95, NT: 120, ACT: 108 },
  { trade: "Bricklayer", NSW: 90, VIC: 85, QLD: 80, SA: 78, WA: 92, TAS: 75, NT: 95, ACT: 88 },
  { trade: "Plasterer", NSW: 85, VIC: 80, QLD: 78, SA: 75, WA: 88, TAS: 72, NT: 92, ACT: 82 },
  { trade: "Painter", NSW: 80, VIC: 75, QLD: 72, SA: 70, WA: 82, TAS: 68, NT: 85, ACT: 78 },
  { trade: "Tiler", NSW: 90, VIC: 85, QLD: 82, SA: 80, WA: 92, TAS: 78, NT: 95, ACT: 88 },
  { trade: "Concreter", NSW: 95, VIC: 90, QLD: 85, SA: 82, WA: 98, TAS: 80, NT: 102, ACT: 92 },
  { trade: "Roofer", NSW: 100, VIC: 95, QLD: 90, SA: 88, WA: 105, TAS: 85, NT: 110, ACT: 98 },
  { trade: "Landscaper", NSW: 85, VIC: 80, QLD: 75, SA: 72, WA: 88, TAS: 70, NT: 90, ACT: 82 },
  { trade: "Renderer", NSW: 88, VIC: 83, QLD: 80, SA: 78, WA: 90, TAS: 75, NT: 92, ACT: 85 },
  { trade: "Floor Sander", NSW: 82, VIC: 78, QLD: 75, SA: 72, WA: 85, TAS: 70, NT: 88, ACT: 80 },
  { trade: "Glazier", NSW: 92, VIC: 88, QLD: 85, SA: 82, WA: 95, TAS: 80, NT: 98, ACT: 90 },
  { trade: "Stonemason", NSW: 105, VIC: 100, QLD: 95, SA: 92, WA: 110, TAS: 88, NT: 115, ACT: 102 },
  { trade: "Scaffolder", NSW: 90, VIC: 85, QLD: 82, SA: 80, WA: 92, TAS: 78, NT: 95, ACT: 88 },
  { trade: "Demolition Worker", NSW: 75, VIC: 70, QLD: 68, SA: 65, WA: 78, TAS: 62, NT: 80, ACT: 72 },
  { trade: "General Labourer", NSW: 65, VIC: 60, QLD: 58, SA: 55, WA: 68, TAS: 52, NT: 70, ACT: 62 },
  { trade: "Crane Operator", NSW: 120, VIC: 115, QLD: 110, SA: 105, WA: 125, TAS: 100, NT: 130, ACT: 118 },
  { trade: "Excavator Operator", NSW: 110, VIC: 105, QLD: 100, SA: 95, WA: 115, TAS: 92, NT: 120, ACT: 108 },
  { trade: "Bobcat Operator", NSW: 95, VIC: 90, QLD: 88, SA: 85, WA: 98, TAS: 82, NT: 102, ACT: 92 },
  { trade: "Steel Fixer", NSW: 98, VIC: 92, QLD: 88, SA: 85, WA: 102, TAS: 82, NT: 105, ACT: 95 },
  { trade: "Formwork Carpenter", NSW: 100, VIC: 95, QLD: 90, SA: 88, WA: 105, TAS: 85, NT: 110, ACT: 98 },
  { trade: "Waterproofer", NSW: 90, VIC: 85, QLD: 82, SA: 80, WA: 92, TAS: 78, NT: 95, ACT: 88 },
  { trade: "Insulation Installer", NSW: 70, VIC: 65, QLD: 62, SA: 60, WA: 72, TAS: 58, NT: 75, ACT: 68 },
  { trade: "Gutter Installer", NSW: 85, VIC: 80, QLD: 78, SA: 75, WA: 88, TAS: 72, NT: 90, ACT: 82 },
  { trade: "HVAC Technician", NSW: 108, VIC: 102, QLD: 98, SA: 95, WA: 112, TAS: 92, NT: 118, ACT: 105 },
  { trade: "Cabinetmaker", NSW: 95, VIC: 90, QLD: 85, SA: 82, WA: 98, TAS: 80, NT: 102, ACT: 92 },
  { trade: "Shopfitter", NSW: 92, VIC: 88, QLD: 85, SA: 82, WA: 95, TAS: 80, NT: 98, ACT: 90 },
  { trade: "Ceiling Fixer", NSW: 88, VIC: 83, QLD: 80, SA: 78, WA: 90, TAS: 75, NT: 92, ACT: 85 },
  { trade: "Cladding Installer", NSW: 90, VIC: 85, QLD: 82, SA: 80, WA: 92, TAS: 78, NT: 95, ACT: 88 },
];

export const getStateRate = (trade: string, state: keyof Omit<LabourRate, 'trade'>) => {
  const rateEntry = MARKET_LABOUR_RATES.find(r => r.trade === trade);
  return rateEntry ? rateEntry[state] : 90; // Default to $90/hr if not found
};

export const getAllTrades = () => {
  return MARKET_LABOUR_RATES.map(r => r.trade);
};

export const getAverageRate = (trade: string) => {
  const rateEntry = MARKET_LABOUR_RATES.find(r => r.trade === trade);
  if (!rateEntry) return 90;
  
  const rates = [rateEntry.NSW, rateEntry.VIC, rateEntry.QLD, rateEntry.SA, rateEntry.WA, rateEntry.TAS, rateEntry.NT, rateEntry.ACT];
  return Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length);
};