# SIH Demo Guide — Landslide Watch

## Setup Before Demo

1. Start all three services (backend, gis-service, frontend)
2. Ensure seed script has been run and data is populated
3. Login as `admin@landslidewatch.in` and trigger a manual ingestion:
   - Click the refresh icon in the navbar, OR
   - POST to `http://localhost:4000/api/ingestion/trigger`
4. Verify locations appear in Command Center

---

## Full Demo Flow (10–15 minutes)

### Step 1 — Login (30 sec)
- Open `http://localhost:3000`
- Login as `authority@landslidewatch.in` / `Authority@SIH2026`
- Show: professional dark UI, role-based login

### Step 2 — Command Center (1 min)
- Show: stat cards (20 locations, active alerts, heavy rain count)
- Show: live risk map with color-coded markers
- Show: risk distribution pie chart
- Point to: "This is pulling live rainfall from Open-Meteo API"

### Step 3 — Live Risk Map (1 min)
- Navigate to `/map`
- Show: full-screen map, layer controls
- Toggle: base layers (dark → satellite → terrain)
- Show: historical landslide events (purple markers)
- Click a high-risk marker, show popup

### Step 4 — Location Details (3 min)
- Click a location with HIGH or CRITICAL risk (e.g., Shillong, Aizawl)
- Show: hazard score + impact score + priority score ring
- Show: contributing factors with actual input values
- Show: rainfall data (24h, 72h cumulative from Open-Meteo)
- Show: terrain data (slope in degrees from SRTM)
- Show: soil type from SoilGrids
- Show: historical landslides within 25km
- Show: exposed infrastructure count
- Show: "Why is this location at risk?" — auto-generated explanation
- Show: Recommendations section

### Step 5 — Early Warning Simulation (3 min)
**This is the technical centrepiece of the demo.**

- Scroll to bottom of Location Details page
- Click "Run Simulation"
- Watch steps animate (backend processes each through real risk engine)
- Show: score climbing Step 1→5: ~25 → ~42 → ~58 → ~72 → ~87
- Show: risk level changing: LOW → MODERATE → HIGH → CRITICAL
- Alert is generated automatically and persisted

### Step 6 — Alert Workflow (2 min)
- Navigate to Alert Center
- Show: new CRITICAL alert with reason and contributing factors
- Click "Acknowledge" → status changes to ACKNOWLEDGED
- Click "Start Investigation" → status changes to INVESTIGATING
- Type resolution notes, click "Mark Resolved"
- Show: alert now shows RESOLVED with timestamp and user

### Step 7 — Response Center (30 sec)
- Navigate to Response Center
- Show: pre-populated recommended actions for CRITICAL level
- Emphasize: "These are decision-support recommendations — field verification required"

### Step 8 — Data Sources (30 sec)
- Navigate to Data Sources
- Show: each data provider, status (LIVE/STATIC), last success time

---

## Key Technical Points to Emphasize

1. **No fake data** — Rainfall from Open-Meteo API (real), terrain from SRTM (real), soil from SoilGrids (real)
2. **Backend processing** — simulation goes through actual risk engine, not frontend JavaScript
3. **Persistence** — all assessments, alerts, and audit logs stored in Firebase Firestore
4. **Full audit trail** — alert workflow stores who acted and when
5. **Configurable** — risk weights and thresholds adjustable by admin
6. **Scientific honesty** — disclaimer shown, no false accuracy claims

---

## Backup Plan (if internet is unavailable)

If external APIs fail:
- Rainfall: system uses last cached values from Firestore (STALE quality flag)
- Terrain/Soil: estimated values are seeded during initialization
- All simulation and alert flows still work with cached data

---

## Common Questions

**Q: Is this real data?**  
A: Yes — rainfall from Open-Meteo (real-time), terrain from SRTM (real elevation), soil from SoilGrids, OSM for infrastructure, NASA COOLR for historical events.

**Q: How accurate are the risk scores?**  
A: The methodology is based on established susceptibility factors. The weights and thresholds are prototype values that would need local calibration by geotechnical experts before operational deployment.

**Q: Can it send real alerts?**  
A: Currently generates in-app alerts. Email/SMS (SendGrid/Twilio) integration is architecturally ready — just needs API keys added.

**Q: How does the simulation work?**  
A: It sends each rainfall scenario to the backend, which runs it through the exact same risk engine used for live data. The results are stored in Firebase and appear in all pages in real time.
