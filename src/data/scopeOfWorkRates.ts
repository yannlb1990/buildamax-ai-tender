// Australian Scope of Work Market Rates (2025)
// Rates include materials + labour (complete job pricing)
// Based on NSW market rates - adjust for other states

export interface SOWRate {
  trade: string;
  sow: string;
  unit: string;
  nswRate: number;
  vicRate: number;
  qldRate: number;
  description: string;
  category: string;
}

export const SCOPE_OF_WORK_RATES: SOWRate[] = [
  // CARPENTRY
  { trade: "Carpenter", sow: "Wall Framing 90mm", unit: "lm", nswRate: 45.00, vicRate: 42.00, qldRate: 40.00, description: "Frame 90mm stud wall incl materials", category: "Framing" },
  { trade: "Carpenter", sow: "Roof Framing Conventional", unit: "m²", nswRate: 57.20, vicRate: 54.00, qldRate: 51.00, description: "Timber roof frame incl battens", category: "Framing" },
  { trade: "Carpenter", sow: "Roof Framing Truss", unit: "m²", nswRate: 42.50, vicRate: 40.00, qldRate: 38.00, description: "Truss roof install incl battens", category: "Framing" },
  { trade: "Carpenter", sow: "Floor Frame Timber", unit: "m²", nswRate: 68.00, vicRate: 65.00, qldRate: 62.00, description: "Timber floor frame on bearers/joists", category: "Framing" },
  { trade: "Carpenter", sow: "Deck Construction Timber", unit: "m²", nswRate: 285.00, vicRate: 270.00, qldRate: 260.00, description: "Complete deck with handrails", category: "External" },
  { trade: "Carpenter", sow: "Door Hang Internal", unit: "ea", nswRate: 185.00, vicRate: 175.00, qldRate: 165.00, description: "Supply & hang hollow core door", category: "Fit Out" },
  { trade: "Carpenter", sow: "Door Hang External", unit: "ea", nswRate: 425.00, vicRate: 400.00, qldRate: 380.00, description: "Supply & hang solid timber door", category: "Fit Out" },
  { trade: "Carpenter", sow: "Window Frame Install", unit: "ea", nswRate: 320.00, vicRate: 300.00, qldRate: 285.00, description: "Install aluminium window frame", category: "Fit Out" },
  { trade: "Carpenter", sow: "Skirting & Architraves", unit: "lm", nswRate: 18.50, vicRate: 17.00, qldRate: 16.00, description: "Supply & install 67mm MDF", category: "Fit Out" },
  { trade: "Carpenter", sow: "Cornice Install", unit: "lm", nswRate: 16.00, vicRate: 15.00, qldRate: 14.00, description: "Install 90mm cornice", category: "Fit Out" },

  // ELECTRICAL
  { trade: "Electrician", sow: "Power Point Install", unit: "ea", nswRate: 150.60, vicRate: 145.00, qldRate: 140.00, description: "Supply & install double GPO", category: "First Fix" },
  { trade: "Electrician", sow: "Light Point Install", unit: "ea", nswRate: 125.00, vicRate: 120.00, qldRate: 115.00, description: "Install ceiling light point", category: "First Fix" },
  { trade: "Electrician", sow: "Switch Install", unit: "ea", nswRate: 95.00, vicRate: 90.00, qldRate: 85.00, description: "Supply & install light switch", category: "First Fix" },
  { trade: "Electrician", sow: "Downlight Install", unit: "ea", nswRate: 145.00, vicRate: 140.00, qldRate: 135.00, description: "Supply & install LED downlight", category: "Fit Out" },
  { trade: "Electrician", sow: "Exhaust Fan Install", unit: "ea", nswRate: 285.00, vicRate: 270.00, qldRate: 260.00, description: "Supply & install bathroom exhaust", category: "Fit Out" },
  { trade: "Electrician", sow: "Switchboard Install", unit: "ea", nswRate: 1850.00, vicRate: 1750.00, qldRate: 1650.00, description: "Supply & install switchboard", category: "First Fix" },
  { trade: "Electrician", sow: "Meter Box Install", unit: "ea", nswRate: 950.00, vicRate: 900.00, qldRate: 850.00, description: "Supply & install meter box", category: "First Fix" },
  { trade: "Electrician", sow: "Smoke Alarm Install", unit: "ea", nswRate: 165.00, vicRate: 155.00, qldRate: 150.00, description: "Supply & install hardwired smoke alarm", category: "Fit Out" },

  // PLUMBING
  { trade: "Plumber", sow: "Rough-in Complete House", unit: "m²", nswRate: 89.90, vicRate: 85.00, qldRate: 80.00, description: "Complete plumbing rough-in", category: "First Fix" },
  { trade: "Plumber", sow: "Toilet Installation", unit: "ea", nswRate: 450.00, vicRate: 420.00, qldRate: 400.00, description: "Supply & install toilet suite", category: "Fit Out" },
  { trade: "Plumber", sow: "Vanity & Basin Install", unit: "ea", nswRate: 520.00, vicRate: 490.00, qldRate: 470.00, description: "Supply & install vanity with basin", category: "Fit Out" },
  { trade: "Plumber", sow: "Kitchen Sink Install", unit: "ea", nswRate: 380.00, vicRate: 360.00, qldRate: 340.00, description: "Supply & install kitchen sink", category: "Fit Out" },
  { trade: "Plumber", sow: "Hot Water System Gas", unit: "ea", nswRate: 2850.00, vicRate: 2700.00, qldRate: 2600.00, description: "Supply & install gas HWS", category: "Fit Out" },
  { trade: "Plumber", sow: "Hot Water System Electric", unit: "ea", nswRate: 2200.00, vicRate: 2100.00, qldRate: 2000.00, description: "Supply & install electric HWS", category: "Fit Out" },
  { trade: "Plumber", sow: "Rainwater Tank 5000L", unit: "ea", nswRate: 3200.00, vicRate: 3000.00, qldRate: 2900.00, description: "Supply & install rainwater tank", category: "External" },
  { trade: "Plumber", sow: "Gas Line Installation", unit: "lm", nswRate: 95.00, vicRate: 90.00, qldRate: 85.00, description: "Install gas line per meter", category: "First Fix" },

  // BRICKLAYING
  { trade: "Bricklayer", sow: "Bricklaying Standard", unit: "m²", nswRate: 98.50, vicRate: 92.00, qldRate: 88.00, description: "Lay standard face brick wall", category: "Structure" },
  { trade: "Bricklayer", sow: "Bricklaying Feature", unit: "m²", nswRate: 125.00, vicRate: 118.00, qldRate: 112.00, description: "Lay feature/textured brick wall", category: "Structure" },
  { trade: "Bricklayer", sow: "Block Work Standard", unit: "m²", nswRate: 78.00, vicRate: 73.00, qldRate: 70.00, description: "Lay concrete blocks", category: "Structure" },
  { trade: "Bricklayer", sow: "Retaining Wall Brick", unit: "m²", nswRate: 185.00, vicRate: 175.00, qldRate: 165.00, description: "Build brick retaining wall", category: "External" },

  // PLASTERING
  { trade: "Plasterer", sow: "Plasterboard Ceiling", unit: "m²", nswRate: 28.50, vicRate: 26.00, qldRate: 25.00, description: "Supply & install ceiling sheets", category: "Lining" },
  { trade: "Plasterer", sow: "Plasterboard Walls", unit: "m²", nswRate: 25.00, vicRate: 23.00, qldRate: 22.00, description: "Supply & install wall sheets", category: "Lining" },
  { trade: "Plasterer", sow: "Plasterboard Stop & Set", unit: "m²", nswRate: 19.50, vicRate: 18.00, qldRate: 17.00, description: "Complete stopping & setting", category: "Lining" },
  { trade: "Plasterer", sow: "Render External Acrylic", unit: "m²", nswRate: 75.00, vicRate: 70.00, qldRate: 68.00, description: "Apply acrylic render system", category: "External" },
  { trade: "Plasterer", sow: "Cornice 90mm", unit: "lm", nswRate: 16.00, vicRate: 15.00, qldRate: 14.00, description: "Install 90mm cornice", category: "Lining" },

  // PAINTING
  { trade: "Painter", sow: "Interior Walls 2 Coats", unit: "m²", nswRate: 30.60, vicRate: 28.00, qldRate: 27.00, description: "Prep & paint 2 coats low sheen", category: "Finishing" },
  { trade: "Painter", sow: "Ceiling Paint 2 Coats", unit: "m²", nswRate: 26.00, vicRate: 24.00, qldRate: 23.00, description: "Prep & paint 2 coats ceiling white", category: "Finishing" },
  { trade: "Painter", sow: "Exterior Walls 2 Coats", unit: "m²", nswRate: 38.00, vicRate: 35.00, qldRate: 33.00, description: "Prep & paint 2 coats exterior", category: "Finishing" },
  { trade: "Painter", sow: "Door Paint Both Sides", unit: "ea", nswRate: 145.00, vicRate: 135.00, qldRate: 130.00, description: "Prep & paint door complete", category: "Finishing" },
  { trade: "Painter", sow: "Window Frame Paint", unit: "ea", nswRate: 125.00, vicRate: 115.00, qldRate: 110.00, description: "Prep & paint window frame", category: "Finishing" },

  // TILING
  { trade: "Tiler", sow: "Floor Tiling Supply & Install", unit: "m²", nswRate: 101.40, vicRate: 95.00, qldRate: 90.00, description: "Porcelain floor tiles complete", category: "Finishing" },
  { trade: "Tiler", sow: "Wall Tiling Supply & Install", unit: "m²", nswRate: 95.00, vicRate: 90.00, qldRate: 85.00, description: "Ceramic wall tiles complete", category: "Finishing" },
  { trade: "Tiler", sow: "Shower Recess Tiling", unit: "ea", nswRate: 1850.00, vicRate: 1750.00, qldRate: 1650.00, description: "Complete shower tiling waterproof", category: "Finishing" },
  { trade: "Tiler", sow: "Splashback Kitchen", unit: "lm", nswRate: 185.00, vicRate: 175.00, qldRate: 165.00, description: "Kitchen splashback 600mm high", category: "Finishing" },

  // CONCRETING
  { trade: "Concreter", sow: "Slab Pour & Finish", unit: "m²", nswRate: 77.20, vicRate: 72.00, qldRate: 68.00, description: "Pour concrete slab 100mm", category: "Footings" },
  { trade: "Concreter", sow: "Driveway Concrete", unit: "m²", nswRate: 95.00, vicRate: 90.00, qldRate: 85.00, description: "Pour & finish driveway 125mm", category: "External" },
  { trade: "Concreter", sow: "Footings Strip", unit: "lm", nswRate: 68.00, vicRate: 65.00, qldRate: 62.00, description: "Pour strip footings 300x600", category: "Footings" },
  { trade: "Concreter", sow: "Concrete Path", unit: "m²", nswRate: 85.00, vicRate: 80.00, qldRate: 75.00, description: "Pour path 75mm with mesh", category: "External" },

  // ROOFING
  { trade: "Roofer", sow: "Roof Installation Metal", unit: "m²", nswRate: 69.60, vicRate: 65.00, qldRate: 62.00, description: "Install Colorbond roofing", category: "Roofing" },
  { trade: "Roofer", sow: "Roof Installation Tiles", unit: "m²", nswRate: 95.00, vicRate: 90.00, qldRate: 85.00, description: "Install concrete roof tiles", category: "Roofing" },
  { trade: "Roofer", sow: "Guttering Install", unit: "lm", nswRate: 42.00, vicRate: 40.00, qldRate: 38.00, description: "Install Colorbond guttering", category: "Roofing" },
  { trade: "Roofer", sow: "Downpipes Install", unit: "lm", nswRate: 38.00, vicRate: 36.00, qldRate: 34.00, description: "Install Colorbond downpipes", category: "Roofing" },
  { trade: "Roofer", sow: "Fascia & Barge Install", unit: "lm", nswRate: 52.00, vicRate: 48.00, qldRate: 46.00, description: "Install fascia & barge boards", category: "Roofing" },

  // LANDSCAPING
  { trade: "Landscaper", sow: "Turf Laying", unit: "m²", nswRate: 32.00, vicRate: 30.00, qldRate: 28.00, description: "Prepare & lay turf", category: "Landscaping" },
  { trade: "Landscaper", sow: "Retaining Wall Sleeper", unit: "m²", nswRate: 285.00, vicRate: 270.00, qldRate: 260.00, description: "Timber sleeper retaining wall", category: "Landscaping" },
  { trade: "Landscaper", sow: "Paving Supply & Lay", unit: "m²", nswRate: 125.00, vicRate: 118.00, qldRate: 112.00, description: "Concrete pavers laid", category: "Landscaping" },
  { trade: "Landscaper", sow: "Garden Bed Preparation", unit: "m²", nswRate: 48.00, vicRate: 45.00, qldRate: 42.00, description: "Prepare garden beds with soil", category: "Landscaping" },
  { trade: "Landscaper", sow: "Fence Panel Colorbond", unit: "lm", nswRate: 185.00, vicRate: 175.00, qldRate: 165.00, description: "Install Colorbond fence 1.8m", category: "Landscaping" },

  // CLADDING
  { trade: "Cladding Installer", sow: "Weatherboard Installation", unit: "m²", nswRate: 85.00, vicRate: 80.00, qldRate: 75.00, description: "Install weatherboard cladding", category: "External" },
  { trade: "Cladding Installer", sow: "FC Sheet Cladding", unit: "m²", nswRate: 72.00, vicRate: 68.00, qldRate: 65.00, description: "Install FC sheet cladding", category: "External" },
  { trade: "Cladding Installer", sow: "Brick Veneer", unit: "m²", nswRate: 145.00, vicRate: 138.00, qldRate: 132.00, description: "Install brick veneer", category: "External" },

  // INSULATION
  { trade: "Insulation Installer", sow: "Ceiling Batts R2.5", unit: "m²", nswRate: 12.50, vicRate: 11.50, qldRate: 11.00, description: "Install ceiling batts R2.5", category: "Insulation" },
  { trade: "Insulation Installer", sow: "Wall Batts R2.0", unit: "m²", nswRate: 11.00, vicRate: 10.00, qldRate: 9.50, description: "Install wall batts R2.0", category: "Insulation" },

  // WATERPROOFING
  { trade: "Waterproofer", sow: "Shower Waterproofing", unit: "ea", nswRate: 850.00, vicRate: 800.00, qldRate: 750.00, description: "Complete shower waterproofing", category: "Waterproofing" },
  { trade: "Waterproofer", sow: "Balcony Waterproofing", unit: "m²", nswRate: 125.00, vicRate: 118.00, qldRate: 112.00, description: "Balcony membrane system", category: "Waterproofing" },

  // CABINETRY
  { trade: "Cabinetmaker", sow: "Kitchen Standard", unit: "lm", nswRate: 1850.00, vicRate: 1750.00, qldRate: 1650.00, description: "Standard kitchen per linear meter", category: "Fit Out" },
  { trade: "Cabinetmaker", sow: "Vanity Custom", unit: "ea", nswRate: 1450.00, vicRate: 1350.00, qldRate: 1300.00, description: "Custom bathroom vanity", category: "Fit Out" },
  { trade: "Cabinetmaker", sow: "Built-in Wardrobe", unit: "lm", nswRate: 950.00, vicRate: 900.00, qldRate: 850.00, description: "Built-in wardrobe per linear meter", category: "Fit Out" },
];

export const getSOWByTrade = (trade: string) => {
  return SCOPE_OF_WORK_RATES.filter(s => s.trade === trade);
};

export const getSOWByCategory = (category: string) => {
  return SCOPE_OF_WORK_RATES.filter(s => s.category === category);
};

export const searchSOW = (searchTerm: string) => {
  const term = searchTerm.toLowerCase();
  return SCOPE_OF_WORK_RATES.filter(s => 
    s.sow.toLowerCase().includes(term) || 
    s.trade.toLowerCase().includes(term) ||
    s.description.toLowerCase().includes(term)
  );
};

export const getSOWCategories = () => {
  return [...new Set(SCOPE_OF_WORK_RATES.map(s => s.category))];
};