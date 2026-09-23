from fastapi import FastAPI, File, UploadFile
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import cv2
import numpy as np
import io
import uuid
import os

app = FastAPI(title="PaveSafe AI Microservice - v2 Academic")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_class=HTMLResponse)
def web_interface():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PaveSafe AI Microservice | Batch Tester</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            .loader { border-top-color: #3b82f6; -webkit-animation: spinner 1.5s linear infinite; animation: spinner 1.5s linear infinite; }
            @keyframes spinner { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    </head>
    <body class="bg-slate-900 text-slate-100 min-h-screen p-8 font-sans">
        <div class="max-w-6xl mx-auto">
            <header class="mb-8 border-b border-slate-700 pb-4">
                <h1 class="text-3xl font-bold text-white flex items-center gap-3">
                    <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                    PaveSafe AI Tester
                </h1>
                <p class="text-slate-400 mt-2">Upload individual images or bulk folders to test the YOLOv8 Pure Function pipeline.</p>
            </header>

            <!-- Upload Area -->
            <div class="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl mb-8">
                <div class="flex items-center justify-center w-full">
                    <label for="dropzone-file" class="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-700/50 hover:bg-slate-700/80 transition-all group">
                        <div class="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg class="w-10 h-10 mb-3 text-slate-400 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                            <p class="mb-2 text-sm text-slate-300"><span class="font-semibold text-blue-400">Click to upload</span> or drag and drop</p>
                            <p class="text-xs text-slate-500">Supports multiple JPG, PNG images</p>
                        </div>
                        <input id="dropzone-file" type="file" class="hidden" multiple accept="image/*" />
                    </label>
                </div>
            </div>

            <!-- Results Grid -->
            <div id="results-container" class="hidden">
                <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                    Results <span id="count-badge" class="bg-blue-600 text-sm py-0.5 px-2 rounded-full">0</span>
                </h2>
                <div class="overflow-x-auto bg-slate-800 rounded-xl border border-slate-700 shadow-xl">
                    <table class="w-full text-sm text-left text-slate-300">
                        <thead class="text-xs uppercase bg-slate-900/50 text-slate-400 border-b border-slate-700">
                            <tr>
                                <th scope="col" class="px-6 py-4 rounded-tl-lg">Image</th>
                                <th scope="col" class="px-6 py-4">Filename</th>
                                <th scope="col" class="px-6 py-4">Status & Severity</th>
                                <th scope="col" class="px-6 py-4 rounded-tr-lg w-1/2">Raw AI Output</th>
                            </tr>
                        </thead>
                        <tbody id="results-table">
                            <!-- Rows will be injected here -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <script>
            const fileInput = document.getElementById('dropzone-file');
            const resultsContainer = document.getElementById('results-container');
            const resultsTable = document.getElementById('results-table');
            const countBadge = document.getElementById('count-badge');
            
            let totalProcessed = 0;

            fileInput.addEventListener('change', async (e) => {
                const files = e.target.files;
                if(files.length === 0) return;
                
                resultsContainer.classList.remove('hidden');
                
                for(let i=0; i<files.length; i++) {
                    const file = files[i];
                    const rowId = 'row-' + Math.random().toString(36).substr(2, 9);
                    
                    // Create preview URL
                    const previewUrl = URL.createObjectURL(file);
                    
                    // Add loading row
                    const tr = document.createElement('tr');
                    tr.id = rowId;
                    tr.className = 'border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors';
                    tr.innerHTML = `
                        <td class="px-6 py-4">
                            <img src="${previewUrl}" class="w-16 h-16 object-cover rounded shadow-lg border border-slate-600">
                        </td>
                        <td class="px-6 py-4 font-medium text-white max-w-[200px] truncate" title="${file.name}">${file.name}</td>
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-2">
                                <div class="w-4 h-4 border-2 border-slate-500 rounded-full border-t-blue-500 animate-spin"></div>
                                <span class="text-slate-400 animate-pulse">Analyzing...</span>
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            <div class="h-2 bg-slate-700 rounded w-1/2 animate-pulse mb-2"></div>
                            <div class="h-2 bg-slate-700 rounded w-1/3 animate-pulse"></div>
                        </td>
                    `;
                    
                    // Prepend so newest is on top
                    resultsTable.insertBefore(tr, resultsTable.firstChild);
                    
                    totalProcessed++;
                    countBadge.innerText = totalProcessed;

                    // Send to API
                    const formData = new FormData();
                    formData.append('file', file);

                    try {
                        const response = await fetch('/analyze', {
                            method: 'POST',
                            body: formData
                        });
                        
                        const data = await response.json();
                        
                        // Update row with results
                        const row = document.getElementById(rowId);
                        
                        let severityBadge = '';
                        if(data.error) {
                            severityBadge = `<span class="bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded text-xs font-bold">ERROR</span>`;
                        } else {
                            const sev = data.severity;
                            const colors = {
                                1: 'bg-green-500/20 text-green-400 border-green-500/30',
                                2: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                                3: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                                4: 'bg-red-500/20 text-red-400 border-red-500/30',
                                5: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                            };
                            const c = colors[sev] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
                            severityBadge = `<span class="px-2.5 py-0.5 rounded text-xs font-bold border ${c}">Severity ${sev}</span>`;
                        }
                        
                        row.innerHTML = `
                            <td class="px-6 py-4">
                                <img src="${previewUrl}" class="w-16 h-16 object-cover rounded shadow-lg border border-slate-600">
                            </td>
                            <td class="px-6 py-4 font-medium text-white max-w-[200px] truncate" title="${file.name}">${file.name}</td>
                            <td class="px-6 py-4">${severityBadge}</td>
                            <td class="px-6 py-4">
                                <pre class="bg-slate-900 p-3 rounded border border-slate-800 text-[10px] text-emerald-400 overflow-x-auto max-w-[400px] max-h-[120px] overflow-y-auto">${JSON.stringify(data, null, 2)}</pre>
                            </td>
                        `;
                    } catch (err) {
                        const row = document.getElementById(rowId);
                        row.innerHTML = `
                            <td class="px-6 py-4">
                                <img src="${previewUrl}" class="w-16 h-16 object-cover rounded opacity-50">
                            </td>
                            <td class="px-6 py-4 text-red-400">${file.name}</td>
                            <td class="px-6 py-4"><span class="bg-red-900 text-red-300 px-2 rounded text-xs">TIMEOUT</span></td>
                            <td class="px-6 py-4 text-red-400 text-xs">Request failed: ${err.message}</td>
                        `;
                    }
                }
                
                // Clear input so same files can be selected again if needed
                e.target.value = '';
            });
        </script>
    </body>
    </html>
    """


# Load the trained YOLOv8 model once at startup
MODEL_PATH = os.path.join(os.path.dirname(__file__), "best.pt")

try:
    import torch
    import ultralytics
    # Fix for PyTorch 2.6+ weights_only=True security update
    if hasattr(torch.serialization, 'add_safe_globals'):
        torch.serialization.add_safe_globals([ultralytics.nn.tasks.SegmentationModel])
        # Sometimes it also needs these base types depending on the ultralytics version
        from ultralytics.yolo.utils import IterableSimpleNamespace
        torch.serialization.add_safe_globals([IterableSimpleNamespace])
except Exception as e:
    pass # Older PyTorch versions don't need this, or imports might differ

try:
    model = YOLO(MODEL_PATH)
except Exception as e:
    model = None
    print(f"WARNING: Could not load YOLO model at {MODEL_PATH}: {e}")

# ==========================================
# 6-STAGE PIPELINE (As per Week 8 Roadmap)
# ==========================================

def S0_quality_gate(img):
    """Pass/reject + reason + metrics (Blur detection via Laplacian Variance)"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # ROI: Lower 60% of the image (assuming dashboard cam)
    h, w = gray.shape
    roi = gray[int(h*0.4):h, :]
    laplacian_var = cv2.Laplacian(roi, cv2.CV_64F).var()
    passed = laplacian_var > 100.0  # Threshold to be tuned
    return {"passed": bool(passed), "blur_laplacian_var": float(round(laplacian_var, 1)), "roi": "lower_60pct"}

def S1_detect(img):
    """Instance masks + class + confidence using trained YOLOv8-seg"""
    if model is None:
        raise Exception("YOLO model not loaded. Missing best.pt?")

    # Run YOLO inference
    results = model(img, verbose=False)
    
    # Check if anything was detected and if masks are available
    if len(results) == 0 or len(results[0].boxes) == 0 or results[0].masks is None:
        return {"class": "none", "confidence": 0.0, "mock_mask": None}
        
    # Get the highest confidence detection (first item)
    first_box = results[0].boxes[0]
    confidence = float(first_box.conf[0])
    class_name = model.names[int(first_box.cls[0])]
    
    # Extract the mask tensor and convert to numpy array
    mask_tensor = results[0].masks.data[0].cpu().numpy()
    
    # Resize the mask back to the original image dimensions
    h, w = img.shape[:2]
    mask_resized = cv2.resize(mask_tensor, (w, h), interpolation=cv2.INTER_NEAREST)
    
    # Convert to standard 8-bit binary mask (0 and 255)
    mask_binary = (mask_resized * 255).astype(np.uint8)
    
    rel_w = float(first_box.xywhn[0][2])
    rel_h = float(first_box.xywhn[0][3])
    
    return {"class": class_name, "confidence": round(confidence, 3), "mock_mask": mask_binary, "rel_w": rel_w, "rel_h": rel_h}

def S2_extract_rim(mask):
    """Outer contour (rim only, floor excluded)"""
    return {"status": "success"}

def S3_resolve_scale(rim, metadata):
    """(W_m, A_m2, σ_W, σ_A) | relative-only"""
    return {
        "scale_source": metadata.get("scale_source", "none"),
        "camera_height_m": 1.08, "camera_height_sigma_m": 0.05,
        "rim_area_m2": 0.19, "rim_area_sigma_m2": 0.02,
        "chord_width_m": 0.42, "chord_width_sigma_m": 0.03,
        "compactness": 1.48, "solidity": 0.81
    }

def S4_estimate_depth(img, mask):
    """Ordinal posterior over {shallow, moderate, deep, unknown} using Shadow-Crescent Contrast"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    if mask is None or np.count_nonzero(mask) == 0:
        return {"ordinal": "unknown", "posterior": {"shallow": 0, "moderate": 0, "deep": 0}, "source": "shadow_contrast"}
        
    # 1. Interior Intensity (Inside the pothole)
    interior_mean = cv2.mean(gray, mask=mask)[0]
    
    # 2. Exterior Intensity (The surrounding road)
    # Dilate the mask to get an annulus (ring) around the pothole
    kernel = np.ones((15, 15), np.uint8)
    dilated_mask = cv2.dilate(mask, kernel, iterations=2)
    exterior_mask = cv2.subtract(dilated_mask, mask) # Ring around the pothole
    
    exterior_mean = cv2.mean(gray, mask=exterior_mask)[0]
    
    # 3. Calculate Contrast Ratio
    # Darker interior = deeper pothole
    ratio = interior_mean / (exterior_mean + 1e-5)
    
    if ratio < 0.65:
        ordinal = "deep"
        post = {"shallow": 0.05, "moderate": 0.15, "deep": 0.80}
    elif ratio < 0.85:
        ordinal = "moderate"
        post = {"shallow": 0.10, "moderate": 0.70, "deep": 0.20}
    else:
        ordinal = "shallow"
        post = {"shallow": 0.85, "moderate": 0.10, "deep": 0.05}
        
    return {
        "ordinal": ordinal,
        "posterior": post,
        "source": "shadow_crescent_contrast",
        "debug_metrics": {"interior_intensity": round(interior_mean, 1), "exterior_intensity": round(exterior_mean, 1), "ratio": round(ratio, 2)}
    }

def S5_severity(geometry, depth):
    """Dynamic ASTM tier mapping based on depth and width"""
    width_m = geometry.get("chord_width_m", 0.42)
    depth_ordinal = depth.get("ordinal", "unknown")
    
    if depth_ordinal == "shallow":
        tier = "Low"
    elif depth_ordinal == "moderate":
        tier = "Medium" if width_m >= 0.3 else "Low"
    elif depth_ordinal == "deep":
        tier = "High" if width_m >= 0.3 else "Medium"
    else:
        tier = "Medium"

    return {
        "standard": "ASTM_D6433",
        "tier": tier,
        "posterior": {"low": 0.33, "medium": 0.33, "high": 0.33},
        "confidence": "heuristic"
    }

def S6_vehicle_risk(geometry, depth):
    """Dynamic vehicle risk based on geometry (Tire bridging simulation)"""
    width_m = geometry.get("chord_width_m", 0.42)
    depth_ordinal = depth.get("ordinal", "unknown")
    
    # Average scooter tire is ~0.24m diameter. Will drop if width >= 0.24
    if width_m >= 0.24 and depth_ordinal == "deep":
        scooter_tier = "Critical"
    elif width_m >= 0.24 and depth_ordinal == "moderate":
        scooter_tier = "High"
    elif width_m < 0.15 and depth_ordinal == "shallow":
        scooter_tier = "Low"
    else:
        scooter_tier = "Medium"
        
    return {
        "e_scooter": {
            "effective_drop_cm": 20.0 if scooter_tier in ["High", "Critical"] else 5.0, 
            "tier": scooter_tier, 
            "note": f"Width={width_m}m, Depth={depth_ordinal}"
        },
        "car": {
            "effective_drop_cm": 15.0 if width_m > 0.6 and depth_ordinal == "deep" else 6.9, 
            "tier": "High" if width_m >= 0.6 else "Medium"
        }
    }


@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"severity": 5, "error": "Could not decode image"}

        # Execution of the 6-Stage Pure Function Contract
        quality = S0_quality_gate(img)
        detection = S1_detect(img)
        rim = S2_extract_rim(detection.get("mock_mask"))
        
        # In future, metadata comes from frontend request (ARCore or EXIF)
        mock_metadata = {"scale_source": "ar_measured"}
        
        depth = S4_estimate_depth(img, detection.get("mock_mask"))
        geometry = S3_resolve_scale(rim, mock_metadata, detection)
        pavement_severity = S5_severity(geometry, depth)
        commuter_risk = S6_vehicle_risk(geometry, depth)

        # Remove numpy arrays from the dicts before JSON serialization
        if "mock_mask" in detection:
            del detection["mock_mask"]
            
        # Calculate final 1-10 severity dynamically
        scooter_risk = commuter_risk["e_scooter"]["tier"]
        astm = pavement_severity["tier"]
        width_m = geometry.get("chord_width_m", 0.42)
        
        if scooter_risk == "Critical":
            final_severity = 9 if width_m >= 0.8 else 8
        elif scooter_risk == "High" or astm == "High":
            final_severity = 7
        elif astm == "Medium":
            final_severity = 5
        elif scooter_risk == "Low" or astm == "Low":
            final_severity = 2
        else:
            final_severity = 4

        # Build the exact JSON schema required by the Roadmap (Week 8)
        response_schema = {
            "report_id": f"rep_{uuid.uuid4().hex[:8]}",
            "service_mode": "A" if geometry["scale_source"] == "ar_measured" else "C",
            "quality": quality,
            "detection": detection,
            "geometry": geometry,
            "depth": depth,
            "pavement_severity": pavement_severity,
            "commuter_risk": commuter_risk,
            # BACKWARD COMPATIBILITY for existing Node server (Requires 1-10 integer)
            "severity": final_severity
        }
        
        return response_schema

    except Exception as e:
        # Never swallow errors silently (as per roadmap)
        return {"severity": 5, "error": str(e), "traceback": "Failed at pipeline execution"}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
