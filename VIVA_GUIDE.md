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

---

## 9. Core Concepts Deep Dive: IPM, IPM Scale & Confidence Score

### What is Inverse Perspective Mapping (IPM)?
* **Perspective Distortion:** A standard camera projects a 3D road onto a 2D angled photo, making near objects appear huge and distant craters appear tiny.
* **Inverse Mapping:** IPM mathematically **reverses** that tilted camera projection using trigonometry, camera height ($h_{\text{cam}} \approx 1.3\text{ m}$), and gyroscope pitch angle ($\theta$) to project 2D pixels back onto the flat 3D road plane (bird's-eye ground view).

### What is IPM Scale (`S_metric`)?
IPM Scale is the **meters-per-pixel conversion factor** for that image's tilt angle (`S3_resolve_scale`):
1. $D = \frac{h_{\text{cam}}}{\tan(\theta)}$ *(ground distance)*
2. $S_{\text{metric}} = \frac{D}{800.0}$ *(meters per pixel)*
3. $\text{Width (m)} = W_{\text{px}} \times S_{\text{metric}}$, and $\text{Area (m}^2\text{)} = A_{\text{px}} \times (S_{\text{metric}})^2$

### What is Confidence Score (`conf`)?
A probability (`0.0` to `1.0`) output by YOLOv8-seg showing how certain the model is that a region is a pothole. PaveSafe enforces a **`0.35` (`35%`)** cutoff—any frame below `0.35` raises **HTTP 422** so uncertain predictions never enter PostgreSQL.

---

## 10. Route Optimization & The 50-Meter Buffer Trade-off

### How Route Safety Scoring Works in Code
1. **Frontend (`commuter/page.tsx`):** Fetches the driving route geometry from the public **OSRM** API (`router.project-osrm.org/route/v1/driving/...`).
2. **Backend (`POST /api/routes/score`):** Converts the route coordinates into a PostGIS `LINESTRING` and queries:
   ```sql
   SELECT id, severity FROM hazards
   WHERE ST_DWithin(location, ST_GeomFromText($1, 4326), 50, true)
     AND status != 'Resolved'
   ```
3. **Safety Score Formula:** `safetyScore = Math.max(0, 100 - totalSeverity * 2)` (plus counts of `hazardsCount` and `criticalHazards` where `severity >= 8`).
4. **Alternative Routes:** Currently, the prototype scores the primary route from the public OSRM API; in full production (self-hosted OSRM or `alternatives=true`), road segments with `Severity >= 7` receive edge-weight penalties to force safer detours.

### Why a 50-Meter Buffer? (And Its Limitation)
* **Why 50m:** Accounts for urban smartphone GPS drift (**10–25m**) and sidewalk-to-centerline offset when commuters photograph potholes on wide multi-lane roads.
* **Limitation:** Near intersections, a 50m buffer can accidentally include a hazard on a perpendicular side street when driving straight.
* **Production Fix:** **Road-Segment Map Matching**—snapping each pothole at ingestion time to its exact OpenStreetMap `way_id` (road edge) so straight routes only count hazards on the exact traversed road segments.

---

## 11. YOLO Deep Dive: What, Why, and Version Choice

* **What is YOLO?** **You Only Look Once**—a single-stage CNN that processes the entire image in one forward pass (unlike two-stage detectors such as Mask R-CNN or Faster R-CNN).
* **What It Does in PaveSafe:** Simultaneously predicts class/confidence (`pothole`), bounding box (`xywhn`), and **pixel-level polygon mask (`masks.data`)** in ~30–40 ms on CPU.
* **Why YOLO over Mask R-CNN / Faster R-CNN:** Sub-40ms CPU speed, tiny memory footprint (survives 512MB RAM cloud containers), and clean FastAPI/PyTorch deployment.
* **Why `YOLOv8-seg` Specifically:**
  * **vs. Standard YOLOv8 (Detection):** Outputs pixel-accurate **polygon masks** instead of coarse rectangles that overestimate area ($\text{m}^2$).
  * **vs. Older Versions (`YOLOv5` / `YOLOv7`):** Uses an **anchor-free split head** and **C2f backbone**, handling irregular, jagged pothole shapes much better without rigid anchor boxes.

---

## 12. Detailed Breakdown of Stages S0 to S6 (`ai-service/main.py`)

### **Stage S0: Optical Quality Gate (`S0_quality_gate`)**
* **Goal:** Prevent *"garbage-in, garbage-out"* by catching blurry or badly exposed frames before running YOLO.
* **Logic:** Converts the lower 60% ROI to grayscale and computes **Laplacian Variance** (`cv2.Laplacian(roi, cv2.CV_64F).var()`). Images with `laplacian_var <= 100.0` (or mean brightness `< 40` / `> 230` per report spec) fail the quality gate.

### **Stage S1: Deep Neural Instance Segmentation (`S1_detect_all`)**
* **Goal:** Detect all potholes and extract pixel-level polygon masks.
* **Logic:** Runs **YOLOv8-seg** (on images downsampled to max `1024px` for 512MB RAM safety), filters detections at **`conf >= 0.35`**, and resizes each mask tensor to `(w, h)` as a binary `0/255` mask (`mock_mask`).
* **Failure Gate:** If no mask passes `0.35` (or `masks is None`), raises **HTTP 422 Unprocessable Entity** so Node.js blocks any PostgreSQL write.

### **Stage S2: Morphological Rim Geometry (`S2_extract_rim`)**
* **Goal:** Extract contour geometry from YOLO's binary mask using **OpenCV**.
* **Logic:** Uses `cv2.findContours` on the largest contour to compute `area_px`, `perimeter_px`, **`solidity`** (`area_px / convex_hull_area`), and **`compactness`** (`perimeter_px² / area_px`, where a circle $\approx 12.57$).

### **Stage S3: Sensor-Fused IPM Scale Resolution (`S3_resolve_scale`)**
* **Goal:** Convert 2D pixels into real-world meters ($\text{m}$) and area ($\text{m}^2$) without LiDAR.
* **Mode A (`imu_measured`):** Uses camera height ($h = 1.08\text{ m}$ in code / $\sim 1.3\text{ m}$ in report) and gyroscope pitch ($\theta$) with $\text{angle\_to\_ground} = \max(5^\circ, 90^\circ - |\text{pitch}|)$, $D = h / \sin(\text{angle\_to\_ground})$, and $60^\circ$ FOV to compute **`chord_width_m`** and **`rim_area_m2`**.
* **Mode B (`heuristic_pixel_ratio`):** Desktop fallback assuming a static `2.8m` frame width.
* **Uncertainty:** Computes confidence-based error margins (`chord_width_sigma_m`, `rim_area_sigma_m2`).

### **Stage S4: Depth Estimation (`S4_estimate_depth` — *Deprecated*)**
* **Why Deprecated:** Rainwater-filled potholes reflect the sky and hide internal shadows, breaking shadow-contrast depth estimation. Returns `"N/A (Area-Based)"` and defers to pure Area/Width grading in Stage S5 (which is why Figure 4.5 in the report skips from S3 to S5).

### **Stage S5: Civil Engineering Severity Grading (`S5_severity`)**
* **Goal:** Map physical dimensions to **ASTM D6433**:
  * **High:** `rim_area_m2 >= 1.0 m²` OR `chord_width_m >= 1.0 m`
  * **Medium:** `rim_area_m2 >= 0.25 m²` OR `chord_width_m >= 0.50 m`
  * **Low:** Below Medium thresholds

### **Stage S6: Dual-Vehicle Risk Evaluation (`S6_vehicle_risk`)**
* **Goal:** Evaluate risk separately for **E-Scooters** (8.5–10 inch wheels) vs. **Cars**:
  * **E-Scooter:** **Critical** (`width >= 0.8m` OR `area >= 0.5m²`), **High** (`width >= 0.4m` OR `area >= 0.15m²`), **Low** (`width < 0.2m` AND `area < 0.05m²`), else **Medium**.
  * **Car:** **High** if `width >= 0.8m`, else **Medium**.
* **Aggregation:** Loops over all detections in the frame, computes the **1–10 composite `severity`** (`9, 8, 7, 5, 4, 2`), and returns the **maximum severity** (`worst_hazard`) to Node.js.
