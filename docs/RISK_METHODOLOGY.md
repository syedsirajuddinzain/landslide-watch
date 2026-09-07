# Risk Methodology — Landslide Watch SIH26001

## Overview

The Landslide Watch risk engine computes a **landslide risk score (0–100)** for each monitored location by combining multiple environmental and exposure factors.

## ⚠️ Important Limitations

- Thresholds and weights in this system are **prototype values** based on general landslide susceptibility literature.
- They have **not been calibrated or validated** against actual NER India landslide occurrence data.
- Operational deployment requires calibration by qualified geotechnical professionals using regional historical data.
- This system does **not guarantee** that a landslide will or will not occur.

---

## Input Factors

| Factor | Source | Unit | Weight |
|--------|--------|------|--------|
| Rainfall (current + 24h + 72h + forecast) | Open-Meteo | mm | 0.35 |
| Terrain slope | SRTM via OpenTopoData | degrees | 0.25 |
| Soil susceptibility | SoilGrids | 0–1 index | 0.15 |
| Land cover susceptibility | ESA WorldCover | 0–1 index | 0.10 |
| Drainage proximity | OpenStreetMap | km | 0.10 |
| Historical events | NASA COOLR | count/25km | 0.05 |

All weights are configurable via Admin → Settings.

---

## Normalization

Each factor is normalized to 0–1 before weighting:

**Rainfall Score:**
```
score = 0.25×(current/20) + 0.30×(24h/100) + 0.25×(72h/200) + 0.10×(fc6h/30) + 0.10×(fc24h/80)
```
Capped at 1.0. Thresholds based on IMD heavy rainfall classifications.

**Slope Score (sigmoid-like):**
- < 5°: very low (×0.04 per degree)
- 5–15°: low
- 15–25°: moderate
- 25–35°: high
- > 35°: very high (→ 1.0)

**Drainage Score:** 1/(1 + distance_km) — closer to drainage = higher risk

**Historical Score:** min(events_count / 5, 1.0)

---

## Hazard Score

```
hazardScore = 100 × Σ(weight_i × normalizedScore_i)
```

Range: 0–100

---

## Impact Score

Considers exposed population and infrastructure within 5km:

```
impactScore = 100 × (0.6 × popScore + 0.4 × infraScore)
popScore = min(population / 10000, 1)
infraScore = min((roads×0.3 + schools×1.5 + hospitals×2.0 + bridges×1.0) / 15, 1)
```

---

## Priority Score (Final Risk Score)

```
finalScore = 0.7 × hazardScore + 0.3 × impactScore
```

---

## Risk Levels

| Score | Level |
|-------|-------|
| < 40 | LOW |
| 40–64 | MODERATE |
| 65–79 | HIGH |
| ≥ 80 | CRITICAL |

Thresholds configurable via Admin → Settings.

---

## Trend Calculation

Compared against the immediately preceding assessment:
- **RISING**: +5% or more
- **FALLING**: –5% or more
- **STABLE**: within ±5%

---

## Alert Generation

Alerts are generated when `riskLevel ≥ HIGH` AND no unresolved alert exists within the past 4 hours for the same location.

Alert is stored in Firestore with full audit trail.
