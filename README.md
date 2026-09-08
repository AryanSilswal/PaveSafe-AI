# PaveSafe AI: Intelligent Pothole Detection & Route Safety Optimization Platform

This project is built as a highly scalable microservice architecture. It is fully configured to be deployed **online for totally free** using modern cloud providers.

## 🚀 Free Deployment Guide

To deploy this project to the internet without paying for servers, follow these three steps:

### 1. Database (Supabase) - *Free PostgreSQL + PostGIS*
1. Go to [Supabase](https://supabase.com) and create a new project.
2. Go to your Project Settings -> Database and find your **Connection string (URI)**.
3. In the Supabase SQL Editor, copy and paste the contents of `backend/init.sql` and run it to create your tables and enable PostGIS.

### 2. Backend & AI Service (Render) - *Free Docker Hosting*
We have included a `render.yaml` Blueprint file which makes deploying the backend services a 1-click process.
1. Push this entire code repository to your own GitHub account.
2. Go to [Render](https://render.com), log in, and click **New+** -> **Blueprint**.
3. Connect your GitHub repository. Render will automatically detect the `render.yaml` file and prepare both the `pavesafe-backend` and `pavesafe-ai-service`.
4. During setup, Render will ask you for the `DATABASE_URL`. Paste the connection string you got from Supabase here.
5. Click **Apply**. Render will now build and deploy both of your backend Docker containers for free!
6. Once deployed, copy the live URL of your `pavesafe-backend` (it will look like `https://pavesafe-backend-xxxx.onrender.com`).

### 3. Frontend (Vercel) - *Free Next.js Hosting*
1. Go to [Vercel](https://vercel.com) and click **Add New...** -> **Project**.
2. Connect your GitHub repository and select the `frontend` folder as the Root Directory.
3. Before clicking deploy, expand the **Environment Variables** section and add:
   - `NEXT_PUBLIC_MAPBOX_TOKEN` = `[Your Mapbox Public Token]`
   - `NEXT_PUBLIC_API_URL` = `[The live Render URL of your backend]`
4. Click **Deploy**. Vercel will build your Next.js application and provide you with a live, public URL.

---

## How to Run Locally (For Development)

If you just want to test it on your own computer, you can use Docker Compose:

1. Add your Mapbox token to `docker-compose.yml` under the frontend environment variables.
2. Open a terminal in this folder and run:
   ```bash
   docker-compose up --build
   ```
3. Access the app at `http://localhost:3000`.

## Architecture Overview

- `frontend/`: Next.js 14 (App Router) with Tailwind CSS and React Map GL.
- `backend/`: Node.js Express API. Connects to PostGIS for spatial queries and routes images to the AI service.
- `ai-service/`: Python FastAPI microservice using OpenCV. Currently contains placeholder logic for severity detection (ready for YOLO / Mask R-CNN PyTorch weights).
- `render.yaml`: Infrastructure-as-code for automated free cloud deployment.
- `docker-compose.yml`: Local orchestrator for development.
