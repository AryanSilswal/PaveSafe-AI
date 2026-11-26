# 🎓 PaveSafe AI — Viva Preparation & Technical Reference Guide

This guide summarizes the architecture, mathematical pipeline, key report thresholds, expected viva questions, and SDG/CO/PSO mappings for **PaveSafe AI: Intelligent Pothole Detection & Route Safety Optimization Platform** (`ES-451`).

---

## 1. 30-Second Elevator Pitch
> *"PaveSafe AI is a smart-city road safety platform that detects, mathematically measures, and manages road potholes using crowdsourced smartphone photos and sensor fusion. Unlike basic detectors that only draw 2D bounding boxes, PaveSafe combines **YOLOv8-seg instance segmentation** with **smartphone gyroscope (IMU) pitch angles** and **Inverse Perspective Mapping (IPM)** to compute real-world dimensions in meters—without needing LiDAR hardware. It grades road damage against **ASTM D6433** civil engineering standards, warns commuters via **OSRM hazard-avoidance routing**, and provides authorities with a live **dispatch heatmap**."*

---

## 2. Problem Statement & Real-World Motivation
1. **Expensive Manual Surveys:** Laser profilometer inspection vans cost **₹1.5 to ₹4 crore**, limiting municipal surveys to once or twice a year.
2. **Monocular Scale Ambiguity:** Existing citizen portals accept uncalibrated 2D photos—a small 10 cm puddle close to the lens looks identical to a 1.5 m structural crater further away.
3. **Duplicate Reporting Overload:** Traditional grievance portals lack automated spatial deduplication.
4. **Micro-Mobility Vulnerability:** E-scooters and two-wheelers have small **8.5–10 inch wheels**; even shallow or moderate craters (`width >= 0.4m`) can cause front-wheel lockup and fatal rider ejection.
5. **Hazard-Blind Navigation:** Commercial maps optimize only for traffic/time and routinely route commuters onto severely damaged roads.

---

## 3. End-to-End System Workflow & 3-Tier Architecture

| Tier | Technologies | Responsibility |
| :--- | :--- | :--- |
| **Tier 1: Frontend** | Next.js 14, React, TypeScript, Tailwind CSS, Leaflet.js | Live camera capture (`getUserMedia`), IMU pitch capture (`DeviceOrientationEvent`), commuter safe routing, admin heatmap & dispatch dashboard |
| **Tier 2: Backend & Spatial DB** | Node.js, Express, Multer (RAM buffer), Axios, Cloudinary, PostgreSQL + PostGIS (Neon), Prisma, OSRM | API gateway, S2S proxy, `ST_DWithin` 15m spatial deduplication (GiST index), DBSCAN clustering, OSRM edge-weight penalties |
| **Tier 3: AI Microservice** | Python 3.11, FastAPI, PyTorch, Ultralytics YOLOv8-seg, OpenCV, NumPy | Stateless 6-Stage Deterministic Physics Pipeline, OOM memory governance (`1024px` resize + `gc.collect()`) |

---

## 4. YOLO Output & All Extracted/Compared Parameters

When an image is passed into **YOLOv8-seg** (`results = model(img)`), it outputs:
1. **`results[0].boxes`**: Confidence score (`conf`), class ID (`cls = 0` $\rightarrow$ `pothole`), pixel box (`xyxy`), and normalized coordinates (`xywhn`).
2. **`results[0].masks.data`**: Binary 2D pixel-level polygon mask tracing the exact crater contour.

### Parameters Extracted & Thresholds Compared (Stages S0–S6)

| Stage | Parameter | Purpose | Threshold / Rule |
| :--- | :--- | :--- | :--- |
| **S0: Quality Gate** | `laplacian_var` | Sharpness / motion blur check | Must be **`>= 100.0`** (else HTTP 400) |
| **S0: Quality Gate** | `mean_brightness` | Exposure / glare check | Must be **`40` to `230`** |
| **S1: YOLO Filter** | `confidence` & `masks` | Neural detection validity | Must be **`>= 0.35`** (else **HTTP 422**, no DB write) |
| **S2: OpenCV Rim** | `area_px`, `perimeter_px`, `solidity`, `compactness`, `chord_width_px` | Contour geometry via `findContours` & `minAreaRect` | `Solidity = A_px / ConvexHullArea`; `Compactness = P² / A` |
| **S3: IPM Scale** | `pitch_deg` ($\theta$), `h_cam` (`1.3m`) | Convert pixels to meters via $D = h / \tan(\theta)$ | Outputs **`chord_width_m`** & **`rim_area_m2`** |
| **S5: ASTM D6433** | `astm_tier` | Civil engineering severity grade | **High:** `Area >= 1.0 m²` or `Width >= 1.0 m`<br>**Med:** `Area >= 0.25 m²` or `Width >= 0.50 m`<br>**Low:** Below medium |
| **S6: Vehicle Risk** | `e_scooter` & `car` tiers | Dual-vehicle impact hazard | **Critical (9):** `Width >= 0.8m` or `Area >= 0.5m²`<br>**High (7):** `Width >= 0.4m` or `Area >= 0.15m²`<br>**Med (5):** `0.2m <= Width < 0.4m`<br>**Low (2):** `Width < 0.2m` & `Area < 0.05m²` |

---

## 5. Dual-Vehicle Risk & Frontend Composite Score
* **Does the user pick a vehicle?** No. Stage S6 (`S6_vehicle_risk`) automatically computes **both** `e_scooter` and `car` risk ratings for every pothole using standard wheel-diameter physics (8.5–10 inch e-scooter wheels vs. standard automobile tires).
* **What appears on the Frontend?** The AI microservice combines `e_scooter` risk and `ASTM` tier using a **worst-case safety rule** into a single **1–10 composite `severity` integer** (`9`, `8`, `7`, `5`, `4`, or `2`). Vulnerable two-wheelers set the safety floor—if a `0.4m` crater is High Risk for an e-scooter, the frontend displays `Severity 7/10` and triggers OSRM detour penalties (`Severity >= 7`).

---

## 6. Key Report Numbers & Literature Comparison
* **Spatial Deduplication:** `ST_DWithin` within a **15-meter radius** using a **GiST** index eliminates ~85% of duplicate reports.
* **Cloud OOM Protection:** Node.js **Multer** streams images in RAM (zero disk I/O), FastAPI downsamples 4K images to **`1024px`** max, and calls `gc.collect()` after every request to survive **512MB RAM** containers.
* **Why PaveSafe Outperforms Prior Literature (Table 7.1):**
  * *Maeda et al. (2018)* & *Arya et al. (2021)*: 2D bounding boxes only (no IPM sizing, no ASTM grading, no routing).
  * *Eriksson et al. (2008)*: 3-axis accelerometer only (reactive—vehicle must hit the pothole first).
  * *Koch et al. (2015)*: Static heuristic contours only.
  * *PaveSafe AI*: Proactive RGB + IMU Gyroscope + YOLOv8-seg polygons + Dynamic IPM + ASTM D6433 + OSRM Safe Routing.

---

## 7. Defending Engineering Contribution (vs. AI Code Generation)
> *"AI tools can generate isolated boilerplate, just like documentation—but cannot architect, calibrate, debug, or integrate a 3-tier cyber-physical system end-to-end. Our core engineering contributions include:"*
1. **Physics Redesign for Flooded Potholes:** Water-filled craters reflect the sky and hide shadows, breaking naive depth estimation; we redesigned Stage S5/S6 around area/chord-width ASTM overrides.
2. **Dataset & False-Positive Mitigation:** Tuning confidence thresholds (`0.35`) and enforcing deterministic `HTTP 422 -> HTTP 400` gates to protect PostgreSQL integrity.
3. **512MB RAM OOM Engineering:** Zero-disk RAM buffer streaming, `1024px` resizing, and explicit garbage collection (`Test Case TC-08`).
4. **Full-Stack Spatial Integration:** Wiring HTML5 `getUserMedia` + `DeviceOrientationEvent` $\rightarrow$ Express S2S Proxy $\rightarrow$ FastAPI $\rightarrow$ PostGIS `ST_DWithin` $\rightarrow$ OSRM edge penalties.

---

## 8. SDG, CO, and PSO Mapping

### UN Sustainable Development Goals (SDGs)
* **SDG 9 (Industry, Innovation, and Infrastructure):** Replaces ₹1.5–4 Cr laser vans with low-cost AI + smartphone infrastructure monitoring.
* **SDG 11 (Sustainable Cities and Communities — Target 11.2):** Enables smart-city road maintenance heatmaps and OSRM safe commuter routing.
* **SDG 3 (Good Health and Well-Being — Target 3.6):** Reduces road fatalities and injuries, especially for vulnerable two-wheeler/e-scooter riders.

### Course Outcomes (COs — `ES-451` Minor Project)
* **CO1:** Problem formulation & literature survey across road damage detection methodologies.
* **CO2:** 3-tier microservice architecture, 3NF PostGIS schema, DFDs, and 6-stage physics modeling.
* **CO3:** Implementation using modern tools (YOLOv8-seg, OpenCV, FastAPI, Next.js, Node.js, PostGIS, OSRM).
* **CO4:** System verification (8 black-box/integration test cases), teamwork, and technical documentation.

### Program Specific Outcomes (PSOs — B.Tech CSE)
* **PSO 1 (AI, Vision & Computational Modeling):** Applying deep learning (YOLOv8-seg), computer vision (OpenCV), and projective geometry (IPM) to extract real-world metrics.
* **PSO 2 (Full-Stack & Spatial Systems Engineering):** Architecting and deploying decoupled, cloud-ready applications using Next.js, Node.js, FastAPI, PostgreSQL/PostGIS, and Docker.
