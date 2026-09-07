"""land_cover_processor.py — ESA WorldCover or estimated land cover for NER India"""
import os, logging
from datetime import datetime

logger = logging.getLogger(__name__)
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data', 'landcover')

# NER India land cover susceptibility by dominant class
LC_SUSCEPTIBILITY = {
    'Tree cover':          0.30,  # Dense forest stabilizes slopes but adds weight
    'Shrubland':           0.45,
    'Grassland':           0.55,
    'Cropland':            0.60,  # Agriculture removes root structure
    'Built-up':            0.65,  # Impervious surfaces increase runoff
    'Bare/sparse vegetation': 0.85,  # Highest susceptibility
    'Snow and ice':        0.50,
    'Permanent water bodies': 0.20,
    'Herbaceous wetland':  0.40,
    'Mangroves':           0.25,
    'Moss and lichen':     0.35,
    'Forest':              0.30,
    'Unknown':             0.45,
}

# NER India state-based estimated profiles (used as fallback)
NER_LC_PROFILES = {
    'Assam':     {'dominantClass': 'Cropland',   'forest': 38, 'cropland': 44, 'grassland': 10, 'builtup': 6, 'water': 2, 'susceptibility': 0.55},
    'Meghalaya': {'dominantClass': 'Tree cover', 'forest': 72, 'cropland': 14, 'grassland': 8, 'builtup': 5, 'water': 1, 'susceptibility': 0.33},
    'Nagaland':  {'dominantClass': 'Tree cover', 'forest': 76, 'cropland': 11, 'grassland': 7, 'builtup': 4, 'water': 2, 'susceptibility': 0.30},
    'Manipur':   {'dominantClass': 'Tree cover', 'forest': 67, 'cropland': 19, 'grassland': 8, 'builtup': 5, 'water': 1, 'susceptibility': 0.34},
    'Mizoram':   {'dominantClass': 'Tree cover', 'forest': 86, 'cropland': 8, 'grassland': 3, 'builtup': 2, 'water': 1, 'susceptibility': 0.27},
    'Sikkim':    {'dominantClass': 'Tree cover', 'forest': 82, 'cropland': 10, 'grassland': 4, 'builtup': 3, 'water': 1, 'susceptibility': 0.28},
    'Arunachal Pradesh': {'dominantClass': 'Tree cover', 'forest': 90, 'cropland': 5, 'grassland': 3, 'builtup': 1, 'water': 1, 'susceptibility': 0.25},
    'Tripura':   {'dominantClass': 'Tree cover', 'forest': 55, 'cropland': 32, 'grassland': 7, 'builtup': 5, 'water': 1, 'susceptibility': 0.40},
}

def process_land_cover(location_id: str, lat: float, lon: float, state: str = 'Unknown') -> dict:
    """Try to read local ESA WorldCover GeoTIFF, fall back to estimated NER profiles."""
    tif_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.tif')] if os.path.exists(DATA_DIR) else []

    if tif_files:
        result = _process_worldcover(location_id, lat, lon, tif_files)
        if result: return result

    return _estimated_landcover(location_id, lat, lon, state)

def _process_worldcover(location_id: str, lat: float, lon: float, tif_files: list) -> dict | None:
    try:
        import rasterio
        from rasterio.transform import rowcol

        # ESA WorldCover class map
        CLASS_MAP = {
            10: 'Tree cover', 20: 'Shrubland', 30: 'Grassland', 40: 'Cropland',
            50: 'Built-up', 60: 'Bare/sparse vegetation', 70: 'Snow and ice',
            80: 'Permanent water bodies', 90: 'Herbaceous wetland', 95: 'Mangroves', 100: 'Moss and lichen'
        }

        tif_path = os.path.join(DATA_DIR, tif_files[0])
        with rasterio.open(tif_path) as src:
            if not (src.bounds.left <= lon <= src.bounds.right and src.bounds.bottom <= lat <= src.bounds.top):
                logger.warning(f"Location ({lat},{lon}) outside WorldCover tile bounds")
                return None
            row, col = rowcol(src.transform, lon, lat)
            row = max(0, min(row, src.height-1))
            col = max(0, min(col, src.width-1))
            val = int(src.read(1, window=rasterio.windows.Window(col, row, 1, 1))[0][0])
            dominant = CLASS_MAP.get(val, 'Unknown')
            susceptibility = LC_SUSCEPTIBILITY.get(dominant, 0.45)
            return {
                'locationId': location_id,
                'dominantClass': dominant,
                'classification': {dominant: 100},
                'source': 'ESA WorldCover 2021 (local GeoTIFF)',
                'year': 2021,
                'landCoverSusceptibility': susceptibility,
                'qualityFlag': 'GOOD',
            }
    except ImportError:
        logger.warning("rasterio not installed for land cover processing")
        return None
    except Exception as e:
        logger.error(f"WorldCover processing error: {e}")
        return None

def _estimated_landcover(location_id: str, lat: float, lon: float, state: str) -> dict:
    profile = NER_LC_PROFILES.get(state, {'dominantClass': 'Tree cover', 'forest': 65, 'cropland': 20, 'grassland': 8, 'builtup': 5, 'water': 2, 'susceptibility': 0.35})
    classification = {'Tree cover': profile.get('forest', 60), 'Cropland': profile.get('cropland', 20), 'Grassland': profile.get('grassland', 10), 'Built-up': profile.get('builtup', 5), 'Water': profile.get('water', 5)}
    return {
        'locationId': location_id,
        'dominantClass': profile['dominantClass'],
        'classification': classification,
        'source': 'ESA WorldCover 2021 (NER state-level estimate)',
        'year': 2021,
        'landCoverSusceptibility': profile['susceptibility'],
        'qualityFlag': 'ESTIMATED',
    }
