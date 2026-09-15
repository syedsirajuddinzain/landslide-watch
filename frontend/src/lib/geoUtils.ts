/**
 * Geographic boundaries and validation for Northeast India (NER).
 * Landslide Watch operates strictly and exclusively across the 8 Northeast Indian States:
 * Assam, Meghalaya, Mizoram, Nagaland, Manipur, Sikkim, Arunachal Pradesh, Tripura.
 */

export const NER_STATES = [
  'Assam',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Manipur',
  'Sikkim',
  'Arunachal Pradesh',
  'Tripura',
] as const;

export type NERState = (typeof NER_STATES)[number];

// Bounding box for the entire Northeast Region of India
export const NER_BOUNDS = {
  minLat: 21.5,
  maxLat: 29.8,
  minLon: 87.8,
  maxLon: 97.5,
};

// Common non-NER Indian cities and keywords to quickly intercept text queries
export const NON_NER_KEYWORDS = [
  'delhi', 'new delhi', 'mumbai', 'bombay', 'bengaluru', 'bangalore',
  'chennai', 'madras', 'kolkata', 'calcutta', 'hyderabad', 'pune',
  'ahmedabad', 'jaipur', 'surat', 'lucknow', 'kanpur', 'nagpur',
  'indore', 'thane', 'bhopal', 'visakhapatnam', 'patna', 'vadodara',
  'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut',
  'rajkot', 'varanasi', 'srinagar', 'aurangabad', 'dhanbad', 'amritsar',
  'navi mumbai', 'allahabad', 'prayagraj', 'ranchi', 'howrah', 'coimbatore',
  'jabalpur', 'gwalior', 'vijayawada', 'jodhpur', 'madurai', 'raipur',
  'kota', 'chandigarh', 'kerala', 'tamil nadu', 'karnataka', 'maharashtra',
  'uttar pradesh', 'bihar', 'rajasthan', 'punjab', 'haryana', 'gujarat',
  'madhya pradesh', 'odisha', 'andhra pradesh', 'telangana', 'west bengal',
  'goa', 'uttarakhand', 'himachal pradesh', 'kashmir', 'ladakh',
];

export interface NERValidationResult {
  allowed: boolean;
  reason?: string;
  matchedState?: NERState;
}

/**
 * Validates whether coordinates and/or an optional location name are within Northeast India.
 */
export function isLocationInNER(lat: number, lon: number, locationName?: string): NERValidationResult {
  // Check location name text against non-NER keywords
  if (locationName) {
    const lower = locationName.toLowerCase().trim();
    for (const kw of NON_NER_KEYWORDS) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(lower)) {
        return {
          allowed: false,
          reason: `Location "${locationName}" is outside Northeast India. Landslide Watch operates exclusively across the 8 Northeast Indian States (Assam, Meghalaya, Mizoram, Nagaland, Manipur, Sikkim, Arunachal Pradesh, Tripura).`,
        };
      }
    }
  }

  // Check bounding box
  const inLat = lat >= NER_BOUNDS.minLat && lat <= NER_BOUNDS.maxLat;
  const inLon = lon >= NER_BOUNDS.minLon && lon <= NER_BOUNDS.maxLon;

  if (!inLat || !inLon) {
    return {
      allowed: false,
      reason: `Coordinates (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E) fall outside the Northeast India operational perimeter [Lat: 21.5°–29.8°N, Lon: 87.8°–97.5°E]. Locations outside the 8 Northeast States are not permitted.`,
    };
  }

  return {
    allowed: true,
  };
}

/**
 * Curated registry of NER Catchments and Monitored Areas across all 8 Northeast States.
 */
export interface CatchmentPreset {
  id: string;
  name: string;
  district: string;
  state: NERState;
  lat: number;
  lon: number;
  description: string;
}

export const NER_CATCHMENT_PRESETS: CatchmentPreset[] = [
  // Mizoram
  { id: 'aizawl', name: 'Aizawl Catchment', district: 'Aizawl', state: 'Mizoram', lat: 23.7307, lon: 92.7173, description: 'Mountain pass & urban ridge' },
  { id: 'durtlang', name: 'Durtlang North Ridge', district: 'Aizawl', state: 'Mizoram', lat: 23.7712, lon: 92.7305, description: 'Escarpment cut & cliff zone' },
  { id: 'champhai', name: 'Champhai Border Ridge', district: 'Champhai', state: 'Mizoram', lat: 23.4757, lon: 93.3297, description: 'Valley slopes & border highway' },
  { id: 'lunglei', name: 'Lunglei South Sector', district: 'Lunglei', state: 'Mizoram', lat: 22.8878, lon: 92.7417, description: 'Southern highland ridge' },

  // Meghalaya
  { id: 'shillong', name: 'Shillong Peak & Valley', district: 'East Khasi Hills', state: 'Meghalaya', lat: 25.5788, lon: 91.8933, description: 'Urban plateau & NH-6 bypass' },
  { id: 'cherrapunji', name: 'Cherrapunji (Sohra) Escarpment', district: 'East Khasi Hills', state: 'Meghalaya', lat: 25.27, lon: 91.73, description: 'High rainfall cliff gorges' },
  { id: 'mawsynram', name: 'Mawsynram Precipitation Belt', district: 'East Khasi Hills', state: 'Meghalaya', lat: 25.2974, lon: 91.5828, description: 'Highest pluvial saturation zone' },
  { id: 'jowai', name: 'Jowai District Headquarter', district: 'West Jaintia Hills', state: 'Meghalaya', lat: 25.4526, lon: 92.2038, description: 'Myntdu river valley slopes' },
  { id: 'nongstoin', name: 'Nongstoin Hill Sector', district: 'West Khasi Hills', state: 'Meghalaya', lat: 25.5167, lon: 91.2667, description: 'West Khasi mountain slopes' },

  // Sikkim
  { id: 'gangtok', name: 'Gangtok Urban Ridge', district: 'East Sikkim', state: 'Sikkim', lat: 27.3389, lon: 88.6065, description: 'Teesta valley active creeping slope' },
  { id: 'namchi', name: 'Namchi Hill Ridge', district: 'South Sikkim', state: 'Sikkim', lat: 27.1667, lon: 88.35, description: 'Damthang terraced gradient' },
  { id: 'mangan', name: 'Mangan Mountain Corridor', district: 'North Sikkim', state: 'Sikkim', lat: 27.5167, lon: 88.5333, description: 'North Sikkim high slide risk' },
  { id: 'gyalshing', name: 'Gyalshing West Ridge', district: 'West Sikkim', state: 'Sikkim', lat: 27.2833, lon: 88.25, description: 'West Sikkim foothills' },

  // Nagaland
  { id: 'kohima', name: 'Kohima Municipal Ridge', district: 'Kohima', state: 'Nagaland', lat: 25.6751, lon: 94.1086, description: 'NH-29 frequent road sinking' },
  { id: 'wokha', name: 'Wokha Hill Range', district: 'Wokha', state: 'Nagaland', lat: 26.0984, lon: 94.2616, description: 'Barail sandstone escarpments' },
  { id: 'viswema', name: 'Viswema Foothills Sector', district: 'Kohima', state: 'Nagaland', lat: 25.55, lon: 94.15, description: 'Dzükou valley approach road' },
  { id: 'mokokchung', name: 'Mokokchung Ridge', district: 'Mokokchung', state: 'Nagaland', lat: 26.3256, lon: 94.5244, description: 'Ao heartland hill slopes' },

  // Assam
  { id: 'haflong', name: 'Haflong Hill Station', district: 'Dima Hasao', state: 'Assam', lat: 25.1764, lon: 93.0182, description: 'Lumding-Badarpur railway cut' },
  { id: 'guwahati', name: 'Guwahati (Kamrup Hills)', district: 'Kamrup Metro', state: 'Assam', lat: 26.1445, lon: 91.7362, description: 'Urban hills & deep ravines' },
  { id: 'karbi_anglong', name: 'Diphu Valley Corridor', district: 'Karbi Anglong', state: 'Assam', lat: 25.843, lon: 93.431, description: 'Karbi plateau slopes' },

  // Manipur
  { id: 'senapati', name: 'Senapati Hill Slopes', district: 'Senapati', state: 'Manipur', lat: 25.2667, lon: 94.0167, description: 'NH-2 highway cutting incline' },
  { id: 'ukhrul', name: 'Ukhrul Mountain Sector', district: 'Ukhrul', state: 'Manipur', lat: 25.1167, lon: 94.3667, description: 'Shirui foothills slumps' },
  { id: 'tamenglong', name: 'Tamenglong Escarpment', district: 'Tamenglong', state: 'Manipur', lat: 24.9833, lon: 93.4833, description: 'Barak basin shale terrain' },

  // Arunachal Pradesh
  { id: 'tawang', name: 'Tawang High Pass', district: 'Tawang', state: 'Arunachal Pradesh', lat: 27.5861, lon: 91.8653, description: 'High altitude mountain transit' },
  { id: 'itanagar', name: 'Itanagar Capital Slopes', district: 'Papum Pare', state: 'Arunachal Pradesh', lat: 27.0844, lon: 93.6053, description: 'Siwalik sandstone drainage cuts' },

  // Tripura
  { id: 'jampui', name: 'Jampui Hills Ridge', district: 'North Tripura', state: 'Tripura', lat: 23.8333, lon: 92.2667, description: 'Highest elevation hill range' },
];
