from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import io

app = FastAPI(title="PaveSafe AI Microservice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "PaveSafe AI Microservice is running"}

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """
    Placeholder endpoint for AI pothole detection.
    In a real scenario, you would load a trained YOLO or Mask R-CNN model here,
    run inference on the image, and calculate severity based on depth/width.
    """
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"severity": "Unknown", "error": "Could not decode image"}

        # MOCK AI LOGIC:
        # We just return a random severity for demonstration purposes
        # Later, replace this with: results = model(img) ...
        
        import random
        # Random integer between 1 and 10
        severity = random.randint(1, 10)

        return {
            "severity": severity,
            "filename": file.filename,
            "message": "Analysis complete"
        }
    except Exception as e:
        return {"severity": "Unknown", "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
