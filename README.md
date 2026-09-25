# PaveSafe AI 🛣️🤖

PaveSafe AI is an advanced, AI-powered municipal road hazard detection and dispatch platform. Designed as a comprehensive three-tier system (Frontend, Node.js Backend, and Python AI Microservice), it crowdsources pothole and road hazard data from commuters, analyzes the severity using computer vision, and provides city administrators with a robust dashboard to dispatch repair crews effectively.

This project is built with rigorous academic and scientific methodologies suitable for international conference publication, featuring a pure-function computer vision pipeline with explicit uncertainty propagation.

---

## 🏗️ System Architecture

The platform operates on a microservice architecture, ensuring separation of concerns and high scalability:

1. **Frontend Client (Next.js / React)**
   - **Hosting:** Vercel (branch: `openstreetmap-version`)
   - **Stack:** Next.js 16 (App Router), Tailwind CSS, Leaflet Maps, Lucide Icons.
   - **Role:** Delivers a mobile-optimized 100dvh Commuter PWA and a desktop-class Admin Dashboard.

2. **Core Backend (Node.js / Express)**
   - **Hosting:** Render (Free Tier)
   - **Stack:** Node.js, Express, PostgreSQL, Multer, Cloudinary SDK, JWT.
   - **Role:** Handles user authentication, gamification, database migrations, Cloudinary image streaming, and orchestrates calls to the AI microservice.

3. **AI Microservice (Python / FastAPI)**
   - **Hosting:** Render (Free Tier)
   - **Stack:** Python, FastAPI, OpenCV, PyTorch.
   - **Role:** Receives raw image buffers, executes the S0-S6 computer vision pipeline, and returns calculated severity scores.

---

## 🔬 AI Methodology & Computer Vision Pipeline

Due to the absence of stereo calibration files in the Pothole-600 dataset, absolute metric scale mapping (centimeter depth) was impossible. The system utilizes **Mode C (Relative/Ordinal Severity)**, relying on a shadow-crescent contrast heuristic to approximate depth and danger.

The pipeline executes as a series of pure functions:
* **S0 (Input):** Raw image ingestion.
* **S1 (Preprocessing):** Noise reduction and normalization.
* **S2 (Segmentation):** Isolating the pothole perimeter from the asphalt background.
* **S3 (Feature Extraction):** Analyzing the shadow-crescent ratio inside the segmented bounds.
* **S4 (Heuristic Evaluation):** Mapping contrast and shadow depth to a relative risk matrix.
* **S5 (Severity Scoring):** Outputting a normalized integer score (1-10).
* **S6 (Uncertainty Propagation):** Calculating the confidence interval of the prediction.

---

## ✨ Core Features

### 🚗 Commuter Module (Mobile-First)
* **Live Drive Mode:** Floating Waze-style UI. Uses the HTML5 Geolocation API (`watchPosition`) to track user speed and location.
* **Dynamic Geofence Warnings:** Calculates distance using the Haversine formula. The warning radius scales dynamically based on velocity: `30 meters + (Speed in m/s * 5 seconds)`.
* **Directional Cone Filtering:** Compares the user's GPS heading against the bearing to the hazard. Only alerts if the pothole is within a ±45° forward cone.
* **Audio Alerts:** Bypasses mobile autoplay restrictions to synthesize square-wave warning beeps via the Web Audio API.
* **Camera Integration:** Direct native camera capture for reporting new hazards.

### 🏢 Admin Dashboard (Desktop)
* **Advanced Data Grid:** Client-side multi-column sorting and filtering (by Status, Date Range, and Min/Max Severity).
* **Context-Aware CSV Export:** A custom export modal that allows administrators to export the entire raw database *or* strictly the currently filtered/sorted view.
* **Native Lightbox Image Viewer:** High-resolution hazard images open in a Z-indexed modal overlay, bypassing mobile popup blockers entirely.
* **Map & List Views:** Seamless toggling between geographical heatmaps and tabular data.
* **Dispatch Workflow:** Admins assign contractor names and resolution deadlines, moving hazards from `Reported` → `In Progress` → `Resolved`.

### 🎮 Gamification & Strict Penalty System
* **Points Economy:** Users earn **+5 points** only when an Admin successfully verifies and dispatches their reported hazard.
* **Rejection Penalties:** If a user submits a fake or blurry image, Admins can reject it. This immediately deducts **-20 points** from the user's account.
* **Sliding Window Ban Logic:** The PostgreSQL database tracks the last 10 reports for every user via a `recent_reports` JSONB array. If a user receives **5 rejections** within their last 10 reports, they are automatically banned for exactly 2 months and blocked from logging in.
* **Storage Optimization:** The moment an Admin clicks `Dispatch` or `Reject`, the backend executes a `cloudinary.uploader.destroy()` call, permanently wiping the image from Cloudinary to aggressively save cloud storage space.

---

## 🗄️ Database Schema (PostgreSQL)

The database utilizes spatial queries and strict constraints:
* `users` table: Maintains `id` (Primary Key), case-sensitive `username` (UNIQUE constraint), `password_hash`, `points`, `banned_until` (Timestamp), and `recent_reports` (JSONB).
* `hazards` table: Maintains PostGIS `location` (ST_Point, 4326), `severity`, `status`, `reporter_id` (Foreign Key), `image_url`, and `image_public_id`.
* `notifications` table: Handles system alerts for point rewards and dispatch updates.

---

## 🚀 Local Development Setup

### 1. Database
You will need a PostgreSQL database. Execute the initial migrations provided in the backend setup, or simply let `backend/server.js` run its boot-time `ALTER TABLE` checks to scaffold missing columns.

### 2. Backend (Node.js)
\`\`\`bash
cd backend
npm install
\`\`\`
Create a `.env` file in the `backend/` directory:
\`\`\`env
PORT=5000
DATABASE_URL=postgres://user:pass@localhost:5432/pavesafe
JWT_SECRET=your_super_secret_jwt_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
AI_SERVICE_URL=http://localhost:8000
\`\`\`
\`\`\`bash
npm run dev
\`\`\`

### 3. Frontend (Next.js)
\`\`\`bash
cd frontend
npm install
\`\`\`
Create a `.env.local` file in the `frontend/` directory:
\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:5000
\`\`\`
\`\`\`bash
npm run dev
\`\`\`

### 4. AI Service (Python)
\`\`\`bash
cd ai_service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
\`\`\`

---
*Developed for research and municipal safety.*

<!-- Non-effective change -->
