# 🏔️ Landslide Watch — SIH26001 (Final Delivery)

**Geospatial Landslide Risk Assessment, Early-Warning & Decision-Support Platform for Northeast India**  
Smart India Hackathon 2026 · Problem ID: **SIH26001** · Domain: **NER Landslide Risk**

---

## ⚠️ Scientific & Operational Disclaimer

This platform is an operational **decision-support system**. Risk scores and priority classifications provide objective computational indicators based on multi-factor physical datasets (SRTM topography, ISRIC SoilGrids, Open-Meteo precipitation, and OSM infrastructure). **Risk Score ≠ Landslide Probability**. All alerts require ground field verification by qualified disaster management authorities prior to civil protection orders or evacuations.

---

## 🚀 Key System Features

1. **20 Critical Monitored Locations across 13 NER Districts**:
   - **Assam**: Kamrup (Guwahati), Goalpara, Dima Hasao (Haflong)
   - **Meghalaya**: East Khasi Hills (Shillong, Cherrapunji/Sohra, Mawsynram), West Jaintia Hills (Jowai)
   - **Nagaland**: Kohima, Wokha
   - **Manipur**: Senapati, Ukhrul, Imphal East, Tamenglong
   - **Mizoram**: Aizawl, Champhai, Lunglei
   - **Sikkim**: East Sikkim (Gangtok), South Sikkim (Namchi), North Sikkim (Mangan)

2. **9-Layer Interactive GIS Map**:
   - Multi-Factor Hazard & Risk Overlay
   - Operational Priority Tier (P1–P4) Markers
   - Live 24h/72h Rainfall Accumulation Contours
   - SRTM DEM Topographical Slope Gradient
   - ISRIC SoilGrids Geotechnical Soil Susceptibility
   - Land Cover / Vegetation Classification
   - NASA COOLR & NDMA Historical Landslide Catalog
   - Hydrological Drainage & Stream Proximity Network
   - OSM Critical Infrastructure Lifeline Exposure (Hospitals, Schools, Bridges, Roads)

3. **Predictive Future Risk Horizons (+6h, +12h, +24h)**:
   - Numerical Weather Prediction (NWP) precipitation curve projections from Open-Meteo.
   - Antecedent Soil Moisture dynamic saturation index.

4. **"What Changed" Differential Environmental Telemetry**:
   - Computes cycle-over-cycle mathematical deltas for rainfall surges, soil pore pressure, and risk score escalation.

5. **Automated Historical Backtesting Engine**:
   - Validates multi-factor risk algorithms against real past disasters using the Open-Meteo Historical Weather Archive API.
   - Computes live Detection Rate (%), Lead Time (Hours), False Positive Rate, and Brier Score.

6. **Grounded AI Risk Analyst Assistant**:
   - Decision-support conversational agent grounded directly on real-time database state and telemetry evidence metrics.

7. **Disaster Response Center & Field Verification Workflow**:
   - Operational task dispatch board (Pending, In Progress, Completed).
   - On-site ground inspection logging interface for field teams.

8. **100% Dynamic Real Data**:
   - Zero hardcoded mock numbers, zero fake weather, zero static risk values.

---

## 🏗️ Architecture

```
[ Open-Meteo Realtime API ]   [ OpenTopoData SRTM DEM ]   [ ISRIC SoilGrids v2.0 ]   [ OSM Overpass API ]   [ NASA COOLR Catalog ]
            │                               │                           │                     │                     │
            └───────────────────────────────┴─────────────┬─────────────┴─────────────────────┴─────────────────────┘
                                                          ▼
                                            [ Background Ingestion Pipeline ]
                                                          │
                                                          ▼
                                            [ Firebase Firestore Database ]
                                                          │
                                                          ▼
                                            [ Multi-Factor Risk Orchestrator ]
                                            ├── Priority Engine (P1-P4)
                                            ├── Future Horizon (+6h/+12h/+24h)
                                            ├── What-Changed Delta Analyzer
                                            └── Historical Backtester
                                                          │
                                                          ▼
                                            [ Express REST API (TypeScript) ]
                                                          │
                                                          ▼
                                        [ React 18 + Vite + Tailwind Dashboard ]
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- Firebase project credentials in `backend/.env`

### 1. Install & Build Backend
```bash
cd backend
npm install
npm test          # Run all 17 unit tests
npm run build     # Compile TypeScript to dist/
```

### 2. Install & Build Frontend
```bash
cd frontend
npm install
npm run build     # Vite production bundle
```

### 3. Start Development Services

**Terminal 1 — Backend:**
```bash
cd backend && npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend && npm run dev
```

**Terminal 3 — Python GIS Microservice (Optional):**
```bash
cd gis-service && python app.py
```

### 4. Open in Browser
```
http://localhost:3000
```

---

## 👤 Role-Based Access Control (RBAC) Accounts

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| **Admin** | `admin@landslidewatch.in` | `Admin@SIH2026` | Full Control, Weights Calibration, System Audit Logs, User RBAC |
| **Authority** | `authority@landslidewatch.in` | `Authority@SIH2026` | Dispatch Response Tasks, Field Verifications, Alert Resolution |
| **Viewer** | `viewer@landslidewatch.in` | `Viewer@SIH2026` | Real-time Telemetry Read-only Access, Backtesting, GIS Map |

---

## 🧪 Automated Tests

```bash
cd backend && npm test
```
- Core risk formula normalization tests
- P1–P4 priority level calculation tests
- Future risk horizon projection tests
- Boundary threshold tests

---

## 📁 Repository Structure

```
landslide-watch/
├── backend/                  # Node.js + Express + TypeScript Backend
│   ├── src/engine/           # RiskEngine, BacktestingEngine, WhatChangedEngine, AIAnalystEngine
│   ├── src/ingestion/        # Open-Meteo, OpenTopoData, OSM Overpass, SoilGrids
│   ├── src/routes/           # API Endpoints (Risk, Response, Landslides, Analytics, Admin)
│   └── tests/                # Jest automated test suite (17/17 tests passing)
├── frontend/                 # React 18 + Vite + Tailwind CSS + Leaflet GIS
│   ├── src/components/       # 9-Layer RiskMap, AI Analyst Modal, SimulationPanel, Charts
│   ├── src/pages/            # 17 Dedicated Views (CommandCenter, LiveRiskMap, ResponseCenter...)
│   └── src/types/            # Synchronized TypeScript interfaces
├── gis-service/              # Python Flask microservice (DEM, slope, SoilGrids)
├── docs/                     # Full system specification and architecture documentation
└── scripts/                  # Seeding and utility scripts
```

