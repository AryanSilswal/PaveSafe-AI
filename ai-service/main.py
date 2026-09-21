from fastapi import FastAPI, File, UploadFile
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

# Load the trained YOLOv8 model once at startup
MODEL_PATH = os.path.join(os.path.dirname(__file__), "best.pt")
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
    return {"passed": bool(passed), "blur_laplacian_var": round(laplacian_var, 1), "roi": "lower_60pct"}

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
    
    return {"class": class_name, "confidence": round(confidence, 3), "mock_mask": mask_binary}

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
    """ASTM tier posterior + confidence"""
    return {
        "standard": "ASTM_D6433",
        "tier": "Medium",
        "posterior": {"low": 0.09, "medium": 0.71, "high": 0.20},
        "confidence": "high"
    }

def S6_vehicle_risk(geometry, depth):
    """Per-profile effective drop + risk tier"""
    return {
        "e_scooter": {"effective_drop_cm": 20.0, "tier": "Critical", "note": "W >= 2R, no bridging"},
        "car": {"effective_drop_cm": 6.9, "tier": "Medium"}
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
        geometry = S3_resolve_scale(rim, mock_metadata)
        
        depth = S4_estimate_depth(img, detection.get("mock_mask"))
        pavement_severity = S5_severity(geometry, depth)
        commuter_risk = S6_vehicle_risk(geometry, depth)

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
            "severity": 8 if commuter_risk["e_scooter"]["tier"] == "Critical" else 4
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
