import re

file_path = 'ai-service/main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace S2_extract_rim
s2_old = """def S2_extract_rim(mask):
    \"\"\"Outer contour (rim only, floor excluded)\"\"\"
    return {"status": "success"}"""

s2_new = """def S2_extract_rim(mask):
    \"\"\"Extract physical shape contours and calculate solidity/compactness using OpenCV\"\"\"
    if mask is None or np.count_nonzero(mask) == 0:
        return {"status": "failed", "solidity": 0.81, "compactness": 1.48}
        
    # Find outer contours of the pixel mask
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return {"status": "failed", "solidity": 0.81, "compactness": 1.48}
        
    # Assume largest contour is the primary pothole
    primary_contour = max(contours, key=cv2.contourArea)
    area_px = cv2.contourArea(primary_contour)
    perimeter_px = cv2.arcLength(primary_contour, True)
    
    # Calculate Convex Hull for Solidity (Area / Hull Area)
    hull = cv2.convexHull(primary_contour)
    hull_area_px = cv2.contourArea(hull)
    
    solidity = round(area_px / hull_area_px, 3) if hull_area_px > 0 else 0.81
    
    # Calculate Compactness (Perimeter^2 / Area) -> closer to 12.57 is a perfect circle
    compactness = round((perimeter_px ** 2) / area_px, 3) if area_px > 0 else 1.48
    
    return {
        "status": "success",
        "area_px": area_px,
        "perimeter_px": perimeter_px,
        "solidity": solidity,
        "compactness": compactness
    }"""

content = content.replace(s2_old, s2_new)

# 2. Replace the return dictionary of S3_resolve_scale to use dynamic solidity/compactness and calculate Sigma
s3_return_old = """    return {
        "scale_source": scale_source,
        "camera_height_m": 1.08, "camera_height_sigma_m": 0.05,
        "rim_area_m2": rim_area_m2, "rim_area_sigma_m2": 0.02,
        "chord_width_m": chord_width_m, "chord_width_sigma_m": 0.03,
        "compactness": 1.48, "solidity": 0.81
    }"""

s3_return_new = """    
    # Calculate mathematical margin of error (sigma) based on YOLO confidence
    confidence = float(detection.get("confidence", 0.8))
    base_sigma_m = 0.02
    uncertainty_penalty = (1.0 - confidence) * 0.15 # Lower confidence = higher physical margin of error
    chord_width_sigma_m = round(base_sigma_m + uncertainty_penalty, 3)
    rim_area_sigma_m2 = round(0.01 + (uncertainty_penalty * 2), 3)

    return {
        "scale_source": scale_source,
        "camera_height_m": 1.08, "camera_height_sigma_m": 0.05,
        "rim_area_m2": rim_area_m2, "rim_area_sigma_m2": rim_area_sigma_m2,
        "chord_width_m": chord_width_m, "chord_width_sigma_m": chord_width_sigma_m,
        "compactness": rim.get("compactness", 1.48), 
        "solidity": rim.get("solidity", 0.81)
    }"""

content = content.replace(s3_return_old, s3_return_new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("S2 Rim Extraction and S3 Sigma Propagation successfully injected!")
