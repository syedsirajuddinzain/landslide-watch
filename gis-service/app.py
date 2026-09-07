"""
LANDSLIDE WATCH — Python GIS Microservice
Flask API for terrain, soil, and land cover processing.
Falls back gracefully to public APIs if local GIS files are not present.
"""
from flask import Flask, request, jsonify
import os, json, math, logging
from dem_processor import process_dem
from soil_processor import process_soil
from land_cover_processor import process_land_cover

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'gis-microservice', 'version': '1.0.0'})

@app.route('/process-dem', methods=['POST'])
def dem_endpoint():
    data = request.json
    location_id = data.get('locationId')
    lat = data.get('lat')
    lon = data.get('lon')
    if not all([location_id, lat, lon]):
        return jsonify({'error': 'locationId, lat, lon required'}), 400
    try:
        result = process_dem(location_id, float(lat), float(lon))
        return jsonify(result)
    except Exception as e:
        logger.error(f"DEM processing failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/soil', methods=['POST'])
def soil_endpoint():
    data = request.json
    location_id = data.get('locationId')
    lat = data.get('lat')
    lon = data.get('lon')
    if not all([location_id, lat, lon]):
        return jsonify({'error': 'locationId, lat, lon required'}), 400
    try:
        result = process_soil(location_id, float(lat), float(lon))
        return jsonify(result)
    except Exception as e:
        logger.error(f"Soil processing failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/landcover', methods=['POST'])
def landcover_endpoint():
    data = request.json
    location_id = data.get('locationId')
    lat = data.get('lat')
    lon = data.get('lon')
    if not all([location_id, lat, lon]):
        return jsonify({'error': 'locationId, lat, lon required'}), 400
    try:
        result = process_land_cover(location_id, float(lat), float(lon))
        return jsonify(result)
    except Exception as e:
        logger.error(f"Land cover processing failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/proximity', methods=['POST'])
def proximity_endpoint():
    """Calculate proximity to features from GeoJSON files"""
    data = request.json
    lat = data.get('lat')
    lon = data.get('lon')
    feature_type = data.get('type', 'river')
    if not lat or not lon:
        return jsonify({'error': 'lat, lon required'}), 400
    # Simple haversine-based proximity lookup
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    geojson_path = os.path.join(data_dir, f'{feature_type}.geojson')
    if not os.path.exists(geojson_path):
        return jsonify({'distanceKm': None, 'note': f'No local {feature_type} data available'}), 200
    try:
        with open(geojson_path) as f:
            features = json.load(f)
        min_dist = float('inf')
        for feat in features.get('features', []):
            coords = feat.get('geometry', {}).get('coordinates', [])
            if feat['geometry']['type'] == 'Point':
                d = haversine(lat, lon, coords[1], coords[0])
                min_dist = min(min_dist, d)
        return jsonify({'distanceKm': round(min_dist, 2) if min_dist != float('inf') else None})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    logger.info(f"GIS Microservice starting on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
