export interface MonitoredLocation {
  id: string;
  name: string;
  district: string;
  state: string;
  lat: number;
  lon: number;
}

export const MONITORED_NER_LOCATIONS: MonitoredLocation[] = [
  { id: 'aizawl', name: 'Aizawl', district: 'Aizawl', state: 'Mizoram', lat: 23.7307, lon: 92.7173 },
  { id: 'champhai', name: 'Champhai', district: 'Champhai', state: 'Mizoram', lat: 23.4566, lon: 93.3282 },
  { id: 'lunglei', name: 'Lunglei', district: 'Lunglei', state: 'Mizoram', lat: 22.8893, lon: 92.7381 },
  { id: 'gangtok', name: 'Gangtok', district: 'East Sikkim', state: 'Sikkim', lat: 27.3389, lon: 88.6138 },
  { id: 'namchi', name: 'Namchi', district: 'South Sikkim', state: 'Sikkim', lat: 27.1667, lon: 88.35 },
  { id: 'mangan', name: 'Mangan', district: 'North Sikkim', state: 'Sikkim', lat: 27.5112, lon: 88.5304 },
  { id: 'shillong', name: 'Shillong', district: 'East Khasi Hills', state: 'Meghalaya', lat: 25.5788, lon: 91.8933 },
  { id: 'cherrapunji', name: 'Cherrapunji (Sohra)', district: 'East Khasi Hills', state: 'Meghalaya', lat: 25.27, lon: 91.73 },
  { id: 'mawsynram', name: 'Mawsynram', district: 'East Khasi Hills', state: 'Meghalaya', lat: 25.3, lon: 91.58 },
  { id: 'jowai', name: 'Jowai', district: 'West Jaintia Hills', state: 'Meghalaya', lat: 25.45, lon: 92.2 },
  { id: 'kohima', name: 'Kohima', district: 'Kohima', state: 'Nagaland', lat: 25.6751, lon: 94.1086 },
  { id: 'wokha', name: 'Wokha', district: 'Wokha', state: 'Nagaland', lat: 26.1011, lon: 94.2611 },
  { id: 'haflong', name: 'Haflong', district: 'Dima Hasao', state: 'Assam', lat: 25.1764, lon: 93.0185 },
  { id: 'guwahati', name: 'Guwahati (Kamrup)', district: 'Kamrup Metro', state: 'Assam', lat: 26.1445, lon: 91.7362 },
  { id: 'goalpara', name: 'Goalpara', district: 'Goalpara', state: 'Assam', lat: 26.1772, lon: 90.6272 },
  { id: 'senapati', name: 'Senapati', district: 'Senapati', state: 'Manipur', lat: 25.26, lon: 94.02 },
  { id: 'ukhrul', name: 'Ukhrul', district: 'Ukhrul', state: 'Manipur', lat: 25.11, lon: 94.36 },
  { id: 'imphal_east', name: 'Imphal East', district: 'Imphal East', state: 'Manipur', lat: 24.817, lon: 93.95 },
  { id: 'tamenglong', name: 'Tamenglong', district: 'Tamenglong', state: 'Manipur', lat: 24.9833, lon: 93.4833 },
  { id: 'tawang', name: 'Tawang', district: 'Tawang', state: 'Arunachal Pradesh', lat: 27.5861, lon: 91.8594 },
];
