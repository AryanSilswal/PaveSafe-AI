# 🛣️ PaveSafe AI

**PaveSafe AI** is an advanced, AI-powered smart city infrastructure platform designed to detect, mathematically measure, and manage road hazards (potholes) using crowdsourced mobile imagery and sensor fusion.

By combining neural network computer vision (YOLOv8) with classical physics algorithms (OpenCV), PaveSafe automatically grades road damage against civil engineering standards (ASTM D6433) and reroutes commuters around critical hazards in real-time.

---

## ✨ Key Features

* **🧠 Custom YOLOv8-Seg AI:** A fine-tuned instance segmentation model trained on thousands of road hazards. It utilizes **Negative Mining** to completely ignore false positives like animals, shadows, speed bumps, and manhole covers.
* **📐 Sensor Fusion & Physics Engine:** By combining 2D image data with live smartphone Gyroscope (IMU) pitch metrics, the AI calculates the true 3-dimensional width of craters using Inverse Perspective Mapping (IPM)—without needing a LiDAR sensor.
* **📊 ASTM D6433 Severity Grading:** The AI automatically assigns a 1-10 severity score based on physical width and shadow-crescent depth estimation, evaluating the specific risk to both cars and e-scooters.
* **🗺️ Smart Commuter Routing:** Integrates with OSRM (Open Source Routing Machine) to calculate the safest route between two destinations, actively avoiding roads with critical, unpatched hazards.
* **🏢 Admin Dispatch Dashboard:** A dedicated portal for city maintenance crews to view a live heat map of road degradation, dispatch repair trucks, and update hazard statuses to "Resolved".

---

## 🏗️ System Architecture

PaveSafe operates on a highly decoupled, 3-tier microservice architecture:

1. **The Frontend (Next.js & React)**
   * Provides the Commuter Interface (reporting, routing, notifications) and the Admin Dashboard (dispatching, heatmaps).
   * Built with TailwindCSS and Leaflet.js for high-performance geospatial rendering.
2. **The Core Backend (Node.js & Express)**
   * Handles user authentication (JWT), PostgreSQL database management, and cloud image offloading (Cloudinary).
   * Acts as the secure middleman between the frontend and the AI.
3. **The AI Microservice (FastAPI & Python)**
   * A stateless, high-performance math and vision engine.
   * Runs the **6-Stage PaveSafe Pipeline** on every uploaded image, aggressively managing garbage collection (RAM) to survive on lightweight cloud instances.

---

## 🔬 The 6-Stage AI Physics Pipeline

When a commuter uploads a photo, the AI Microservice executes a deterministic pipeline:
* **S0 - Quality Gate:** Drops blurry images (Laplacian variance) to prevent garbage-in, garbage-out.
* **S1 - Neural Detection:** YOLOv8 draws precise, pixel-by-pixel polygon masks around every pothole in the frame.
* **S2 - Rim Extraction (OpenCV):** Calculates the Solidity and Compactness of the crater's edge.
* **S3 - Scale Resolution (IPM):** Uses the camera's trigonometric pitch to convert pixels into real-world meters.
* **S4 - Depth Estimation:** Analyzes shadow-crescent contrast to determine if the hole is shallow or deep.
* **S5 & S6 - Severity & Risk:** Prioritizes hazard width to dynamically calculate risk tiers for different vehicle types, catching flooded craters that mask their own depth.

---

## 💻 Tech Stack

* **Frontend:** Next.js, React, Tailwind CSS, Leaflet.js
* **Backend:** Node.js, Express, Axios
* **Database & Storage:** PostgreSQL (Neon), Cloudinary
* **AI & Physics:** Python, FastAPI, Ultralytics YOLOv8, OpenCV, PyTorch, NumPy
* **Routing:** OSRM (Open Source Routing Machine) API

---

## 🚧 Known Limitations & Future Scope

While highly robust, the current architecture has a few real-world constraints:
1. **Low Light / Nighttime:** The vision model relies on daylight textures and shadows. Severe motion blur or headlight glare will reduce mask accuracy.
2. **Repaired Roads (Tar Snakes):** Freshly filled black asphalt can sometimes trick the 2D visual sensors into flagging a repaired hole as a new one. Future iterations aim to integrate smartphone accelerometer data to confirm physical bumps.
3. **Desktop Uploads:** Accurate mathematical sizing relies on the mobile app's live Gyroscope data. Uploading from a desktop computer strips this metadata, forcing the AI to fallback on less accurate heuristic guessing.

---
*Built to make cities safer, one street at a time.*
