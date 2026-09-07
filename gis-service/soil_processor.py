"""soil_processor.py — Fetches soil data from SoilGrids REST API"""
import logging, requests
from datetime import datetime

logger = logging.getLogger(__name__)

def classify_soil_type(clay, sand, silt):
    if clay > 40: return 'Clay'
    if sand > 70: return 'Sandy'
    if silt > 50: return 'Silty'
    if clay > 25 and sand > 25: return 'Sandy Clay Loam'
    if clay > 20: return 'Clay Loam'
    return 'Loam'

def compute_susceptibility(clay, bd, oc):
    s = 0.5 * min(clay/50, 1) + 0.3 * max(0, (1.8-bd)/1.0) + 0.2 * max(0, 1-oc/10)
    return round(min(s, 1.0) * 100) / 100

def process_soil(location_id: str, lat: float, lon: float) -> dict:
    try:
        from urllib.parse import urlencode
        params = [('lat', lat), ('lon', lon), ('number_of_nearest_neighbours', 1)]
        for p in ['clay','sand','silt','bdod','soc']:
            params.append(('property', p))
        params.append(('depth', '0-5cm'))
        params.append(('value', 'mean'))
        url = f"https://rest.isric.org/soilgrids/v2.0/properties/query?{urlencode(params)}"
        res = requests.get(url, timeout=15)
        res.raise_for_status()
        layers = res.json().get('properties', {}).get('layers', [])
        def get(name):
            l = next((x for x in layers if x['name'] == name), None)
            return l['depths'][0]['values']['mean'] if l and l['depths'] else None
        clay = (get('clay') or 250) / 10
        sand = (get('sand') or 450) / 10
        silt = (get('silt') or 300) / 10
        bd   = (get('bdod') or 130) / 100
        oc   = (get('soc')  or 20)  / 10
        return {
            'locationId': location_id,
            'soilType': classify_soil_type(clay, sand, silt),
            'clay_pct': round(clay*10)/10, 'sand_pct': round(sand*10)/10, 'silt_pct': round(silt*10)/10,
            'bulkDensity': round(bd*100)/100, 'organicCarbon': round(oc*10)/10,
            'waterRetentionIndex': round((clay*0.5+silt*0.3)/100*100)/100,
            'soilSusceptibility': compute_susceptibility(clay, bd, oc),
            'source': 'ISRIC SoilGrids v2 (GIS Service)', 'fetchedAt': datetime.utcnow().isoformat()+'Z', 'qualityFlag': 'GOOD'
        }
    except Exception as e:
        logger.error(f"SoilGrids failed: {e}")
        return {
            'locationId': location_id, 'soilType': 'Loam (Estimated)',
            'clay_pct': 30.0, 'sand_pct': 40.0, 'silt_pct': 30.0,
            'bulkDensity': 1.3, 'organicCarbon': 2.0, 'waterRetentionIndex': 0.5,
            'soilSusceptibility': 0.5,
            'source': 'Estimated', 'fetchedAt': datetime.utcnow().isoformat()+'Z', 'qualityFlag': 'ESTIMATED'
        }
