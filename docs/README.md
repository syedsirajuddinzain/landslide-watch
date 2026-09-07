# 🏔️ Landslide Watch — SIH26001

**NER Landslide Risk Assessment & Early Warning Dashboard**  
Smart India Hackathon 2026 · Problem ID: SIH26001 · Domain: NER Landslide Risk

---

## ⚠️ Scientific Disclaimer

This is a **decision-support system**. Risk scores require local calibration and validation by qualified geotechnical professionals before operational deployment. **Do not issue evacuation orders based solely on this system.** All alerts must be verified by field teams before taking action.

---

## 🏗️ Architecture

```
Open-Meteo API (Rainfall)
SoilGrids API  (Soil)       →  Backend Ingestion  →  Firestore DB  →  Risk Engine  →  Express API  →  React Frontend
OpenTopoData   (Terrain)                                                             ↓
OpenStreetMap  (Infra)                                                          Alert Engine
NASA COOLR     (Landslides)                                                          ↓
                                                                           In-App Notifications
```

**Stack:** React 18 + TypeScript · Node.js/Express · Firebase Firestore · Python GIS Microservice · Leaflet · Recharts · Tailwind CSS

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- Firebase project (already configured in `.env`)

### 1. Install Backend
```bash
cd backend
npm install
```

### 2. Install Frontend
```bash
cd frontend
npm install
```

### 3. Install Python GIS Service
```bash
cd gis-service
pip install -r requirements.txt
```

### 4. Seed Database (FIRST TIME ONLY)
```bash
cd backend
npx ts-node scripts/create-admin-user.ts
npx ts-node scripts/seed-locations.ts
```

### 5. Start All Services

**Terminal 1 — Backend:**
```bash
cd backend && npm run dev
```

**Terminal 2 — GIS Service (optional but improves terrain data):**
```bash
cd gis-service && python app.py
```

**Terminal 3 — Frontend:**
```bash
cd frontend && npm run dev
```

### 6. Open Browser
```
http://localhost:3000
```

---

## 👤 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@landslidewatch.in | Admin@SIH2026 |
| Authority | authority@landslidewatch.in | Authority@SIH2026 |
| Viewer | viewer@landslidewatch.in | Viewer@SIH2026 |

---

## 📊 Data Sources

| Source | Data | Key Required | Cost |
|--------|------|-------------|------|
| Open-Meteo | Rainfall + Forecast | ❌ | Free |
| ISRIC SoilGrids | Soil properties | ❌ | Free |
| OpenTopoData (SRTM) | Elevation + Slope | ❌ | Free |
| OpenStreetMap (Overpass) | Infrastructure | ❌ | Free |
| NASA COOLR | Historical Landslides | ❌ | Free |
| Firebase | Database + Auth | ✅ (configured) | Free tier |

---

## 🗺️ Monitored Locations (20 across 13 NER districts)

Assam: Kamrup, Goalpara, Dima Hasao  
Meghalaya: East Khasi Hills, West Jaintia Hills  
Nagaland: Kohima, Wokha  
Manipur: Senapati, Ukhrul  
Mizoram: Aizawl, Champhai  
Sikkim: East Sikkim, South Sikkim  

---

## 🧪 Run Tests

```bash
cd backend && npm test
```

---

## 🎬 SIH Demo Flow

1. Login as `authority@landslidewatch.in`
2. View Command Center — see all 20 monitored locations
3. Click Live Risk Map — explore NER with risk overlays
4. Select a location (e.g., Shillong or Aizawl)
5. View rainfall, terrain, soil, historical events, exposure
6. See hazard score, impact score, risk explanation
7. Run Early-Warning Simulation (bottom of Location Details)
8. Watch risk escalate: MODERATE → HIGH → CRITICAL through backend
9. Alert appears in Alert Center
10. Acknowledge → Investigate → Resolve
11. View Response Center recommendations

---

## 📁 Project Structure

```
landslide-watch/
├── frontend/          # React + Vite + TypeScript
├── backend/           # Node.js + Express + TypeScript
│   ├── src/engine/    # Risk Engine (riskEngine.ts, alertEngine.ts)
│   ├── src/ingestion/ # Data ingestion (Open-Meteo, OSM)
│   ├── src/routes/    # REST API routes
│   └── tests/         # Jest test suite
├── gis-service/       # Python Flask microservice (terrain, soil, landcover)
├── docs/              # Full documentation
└── scripts/           # Setup scripts
```

See `docs/ARCHITECTURE.md` for full system design.
