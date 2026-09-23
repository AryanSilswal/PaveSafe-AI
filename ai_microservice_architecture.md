# PaveSafe AI Microservice: Architecture & Implementation Guide

This document details the architectural design, training methodology, and execution pipeline of the PaveSafe AI Microservice. The microservice is an asynchronous REST API built with FastAPI that processes commuter imagery, executes computer vision models, and mathematically grades pothole severity.

---

## 1. How the Model Was Trained (YOLOv8-seg)

Unlike standard object detection models that simply draw bounding boxes (squares) around objects, our microservice relies on a custom-trained **YOLOv8 Instance Segmentation (`YOLOv8-seg`)** model.

*   **Framework:** Ultralytics YOLOv8.
*   **Weights File:** `best.pt` *(Loaded into memory at `ai-service/main.py:196`)*.
*   **Dataset:** Trained on thousands of diverse road damage images (including various lighting conditions, water-filled potholes, and edge cases like manhole covers).
*   **Output:** Instead of just a bounding box, the model outputs a binary pixel mask (a polygon contour) that perfectly traces the jagged edges of the crater. This is critical for downstream mathematical analysis (Area and Depth).

---

## 2. Image Prerequisites & Input Conditions

Before an image is processed by the heavy YOLO tensor operations, it must pass a strict Quality Gate.

*   **Format:** The API accepts a standard `multipart/form-data` image upload via the `/analyze` endpoint (`ai-service/main.py:371`).
*   **Quality Requirement:** The image must not be heavily motion-blurred (e.g., from a speeding car hitting a bump).
*   **Metric Used:** **Laplacian Variance**.
    *   *Implementation:* `ai-service/main.py:226` (`laplacian_var = cv2.Laplacian(roi, cv2.CV_64F).var()`).
    *   *Mechanism:* The AI isolates the lower 60% of the image (the road surface) and calculates the variance of the Laplacian filter. If the variance is less than `100.0` (`ai-service/main.py:227`), the image is rejected for being too blurry.

---

## 3. The 6-Stage Pure Function Contract (How it works)

The AI execution is strictly decoupled into modular, mathematically verifiable steps known as the "6-Stage Pure Function Contract".

### S0: Quality Gate
*   **Line:** `ai-service/main.py:220` - `def S0_quality_gate(img):`
*   **Action:** Validates image clarity using OpenCV Laplacian Variance.

### S1: Detection & Mask Extraction
*   **Line:** `ai-service/main.py:230` - `def S1_detect(img):`
*   **Action:** Runs the YOLOv8 model on the image. Extracts the pixel mask and relative bounding box dimensions (`rel_w`, `rel_h`).

### S2: Rim Extraction
*   **Line:** `ai-service/main.py:262` - `def S2_extract_rim(mask):`
*   **Action:** Analyzes the outer contour of the binary mask to isolate the rim of the pothole.

### S3: Scale Resolution (Heuristic Pixel Mapping)
*   **Line:** `ai-service/main.py:266` - `def S3_resolve_scale(rim, metadata, detection):`
*   **Action:** Converts 2D flat pixels into physical real-world scale (Meters).
*   **Metric:** Because live ARCore metadata is not yet connected, it uses **Heuristic Pixel Mapping**. It assumes the camera width covers approximately 2.8 meters of physical road space, multiplying the relative pixel width by 2.8 to estimate physical width in meters.

### S4: Depth Estimation (Shadow-Crescent Contrast)
*   **Line:** `ai-service/main.py:283` - `def S4_estimate_depth(img, mask):`
*   **Action:** Calculates the 3D depth of the pothole using a 2D image without LiDAR.
*   **Metric:** **Shadow-Crescent Contrast Ratio** (`ai-service/main.py:303`).
    *   It measures the average pixel brightness *inside* the pothole mask.
    *   It dilates the mask by 15 pixels to measure the brightness of the healthy road *outside* the pothole.
    *   It calculates the ratio (`ratio = interior_mean / exterior_mean`). A ratio `< 0.65` implies a deep, dark shadow (Deep Pothole). A ratio between `0.65` and `0.85` implies a moderate depression.

### S5: Pavement Severity Scoring
*   **Line:** `ai-service/main.py:322` - `def S5_severity(geometry, depth):`
*   **Action:** Applies standardized civic engineering logic.
*   **Metric:** **ASTM D6433 Standard**. It groups the width and depth into an official structural classification (Low, Medium, or High).

### S6: Commuter Vehicle Risk (Tire Bridging Simulation)
*   **Line:** `ai-service/main.py:343` - `def S6_vehicle_risk(geometry, depth):`
*   **Action:** Simulates mechanical tire drop based on vehicle profiles.
*   **Metric:** A standard e-scooter tire has a diameter of roughly 0.24m. If the pothole width (`chord_width_m`) is `>= 0.24m` and the depth is deep, the scooter cannot "bridge" the gap and will drop in violently, yielding a "Critical" tier.

---

## 4. Final Output Generation

Once all 6 stages run, the `/analyze` endpoint compiles the metrics into a strict JSON schema (`ai-service/main.py:415`). 

Finally, a **Dynamic 1-10 Severity Integer** is calculated for backend legacy compatibility:
*   **Severity 9-10:** Width >= 0.8m + Critical Scooter Risk.
*   **Severity 8:** Width >= 0.24m + Critical Scooter Risk.
*   **Severity 7:** High ASTM structural risk.
*   **Severity 5:** Medium structural risk.
*   **Severity 2:** Shallow / Low risk.
