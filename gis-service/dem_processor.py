"""
DEM Processor — reads SRTM GeoTIFF if available, otherwise falls back to OpenTopoData API.
"""
import os, math, logging
import requests
from datetime import datetime

logger = logging.getLogger(__name__)
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data', 'dem')

def compute_slope_susceptibility(slope_deg: float) -> float:
    if slope_deg <= 5: return 0.1
    if slope_deg <= 15: return 0.3
    if slope_deg <= 25: return 0.6
    if slope_deg <= 35: return 0.85
    return 1.0

def process_dem(location_id: str, lat: float, lon: float) -> dict:
    """Try rasterio (local GeoTIFF) first, fall back to OpenTopoData API."""
    dem_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.tif') or f.endswith('.hgt')] if os.path.exists(DATA_DIR) else []

    if dem_files:
        return _process_with_rasterio(location_id, lat, lon, dem_files)
    else:
        logger.info(f"No local DEM files found. Using OpenTopoData API for {location_id}")
        return _process_with_opentopodata(location_id, lat, lon)

def _process_with_rasterio(location_id: str, lat: float, lon: float, dem_files: list) -> dict:
    try:
        import rasterio
        import numpy as np
        from rasterio.transform import rowcol

        dem_path = os.path.join(DATA_DIR, dem_files[0])
        with rasterio.open(dem_path) as src:
            # Sample center + 8 surrounding points for slope
            offsets = [(0,0),(0.005,0),(-0.005,0),(0,0.005),(0,-0.005),(0.003,0.003),(-0.003,0.003),(0.003,-0.003),(-0.003,-0.003)]
            elevations = []
            for dlat, dlon in offsets:
                row, col = rowcol(src.transform, lon+dlon, lat+dlat)
                row = max(0, min(row, src.height-1))
                col = max(0, min(col, src.width-1))
                val = src.read(1, window=rasterio.windows.Window(col, row, 1, 1))[0][0]
                elevations.append(float(val) if val != src.nodata else 300)

            center_elev = elevations[0]
            lat_dist = 0.005 * 111000
            lon_dist = 0.005 * math.cos(lat * math.pi / 180) * 111000
            slopes = [
                abs((elevations[1] - elevations[2]) / (2 * lat_dist)) * (180/math.pi),
                abs((elevations[3] - elevations[4]) / (2 * lon_dist)) * (180/math.pi),
            ]
            avg_slope = sum(slopes) / len(slopes)
            max_slope = max(slopes) * 1.3

        return {
            'locationId': location_id,
            'elevation_m': round(center_elev),
            'avgSlope_deg': round(avg_slope * 10) / 10,
            'maxSlope_deg': round(max_slope * 10) / 10,
            'slopeSusceptibility': round(compute_slope_susceptibility(avg_slope) * 100) / 100,
            'dem_source': f'SRTM GeoTIFF (local: {dem_files[0]})',
            'processedAt': datetime.utcnow().isoformat() + 'Z',
            'qualityFlag': 'GOOD',
        }
    except ImportError:
        logger.warning("rasterio not installed. Falling back to OpenTopoData.")
        return _process_with_opentopodata(location_id, lat, lon)
    except Exception as e:
        logger.error(f"Rasterio processing failed: {e}. Falling back.")
        return _process_with_opentopodata(location_id, lat, lon)

def _process_with_opentopodata(location_id: str, lat: float, lon: float) -> dict:
    offsets = [(0,0),(0.005,0),(-0.005,0),(0,0.005),(0,-0.005)]
    locations_str = '|'.join([f"{lat+dlat:.5f},{lon+dlon:.5f}" for dlat,dlon in offsets])
    try:
        res = requests.get('https://api.opentopodata.org/v1/srtm90m', params={'locations': locations_str, 'interpolation': 'bilinear'}, timeout=15)
        res.raise_for_status()
        elevs = [r['elevation'] or 300 for r in res.json()['results']]
        center_elev = elevs[0]
        lat_dist = 0.005 * 111000
        lon_dist = 0.005 * math.cos(lat * math.pi / 180) * 111000
        slopes = [
            abs((elevs[1] - elevs[2]) / (2 * lat_dist)) * (180/math.pi),
            abs((elevs[3] - elevs[4]) / (2 * lon_dist)) * (180/math.pi),
        ]
        avg_slope = sum(slopes) / max(len(slopes), 1)
        max_slope = max(slopes) * 1.3 if slopes else avg_slope * 1.3
        return {
            'locationId': location_id,
            'elevation_m': round(center_elev),
            'avgSlope_deg': round(avg_slope * 10) / 10,
            'maxSlope_deg': round(max_slope * 10) / 10,
            'slopeSusceptibility': round(compute_slope_susceptibility(avg_slope) * 100) / 100,
            'dem_source': 'OpenTopoData SRTM 90m (API)',
            'processedAt': datetime.utcnow().isoformat() + 'Z',
            'qualityFlag': 'GOOD',
        }
    except Exception as e:
        logger.error(f"OpenTopoData also failed: {e}")
        return {
            'locationId': location_id,
            'elevation_m': 400,
            'avgSlope_deg': 18.0,
            'maxSlope_deg': 26.0,
            'slopeSusceptibility': 0.55,
            'dem_source': 'Estimated (NER typical)',
            'processedAt': datetime.utcnow().isoformat() + 'Z',
            'qualityFlag': 'ESTIMATED',
        }
