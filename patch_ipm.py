import re

file_path = 'ai-service/main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new mathematical S3 function with IPM
s3_new = """def S3_resolve_scale(rim, metadata, detection):
    \"\"\"(W_m, A_m2, I_W, I_A) | Inverse Perspective Mapping (IPM) Trigonometry\"\"\"
    import math
    rel_w = detection.get("rel_w", 0.15)
    rel_h = detection.get("rel_h", 0.15)
    
    scale_source = metadata.get("scale_source", "heuristic_pixel_ratio")
    
    if scale_source == "imu_measured":
        # IPM (Inverse Perspective Mapping) Trigonometry
        h = float(metadata.get("camera_height_m", 1.08))
        raw_pitch = float(metadata.get("camera_pitch_degrees", 45.0))
        
        # Convert IMU beta (0=flat, 90=upright) to ray angle relative to ground
        # If upright (90), looking at horizon (0 deg to ground).
        # If flat (0), looking straight down (90 deg to ground).
        angle_to_ground = max(5.0, 90.0 - abs(raw_pitch)) 
        
        angle_rad = math.radians(angle_to_ground)
        
        # Direct distance from the camera lens to the center of the frame on the ground
        direct_distance = h / math.sin(angle_rad)
        
        # Standard smartphone horizontal FOV ~60 degrees
        fov_h_rad = math.radians(60.0)
        
        # Physical width of the entire frame at that distance
        frame_width_m = 2.0 * direct_distance * math.tan(fov_h_rad / 2.0)
        
        # Calculate actual physical dimensions of the pothole
        chord_width_m = round(rel_w * frame_width_m, 2)
        frame_height_m = frame_width_m * 1.333 # Assume 4:3 aspect ratio
        rim_area_m2 = round((rel_w * frame_width_m) * (rel_h * frame_height_m), 3)
    else:
        # Fallback Heuristic (Static 2.8m frame width)
        chord_width_m = round(rel_w * 2.8, 2)
        rim_area_m2 = round((rel_w * 2.8) * (rel_h * 2.8), 3)
        
    return {
        "scale_source": scale_source,
        "camera_height_m": 1.08, "camera_height_sigma_m": 0.05,
        "rim_area_m2": rim_area_m2, "rim_area_sigma_m2": 0.02,
        "chord_width_m": chord_width_m, "chord_width_sigma_m": 0.03,
        "compactness": 1.48, "solidity": 0.81
    }"""

# Use Regex to replace the old S3_resolve_scale safely
s3_regex = re.compile(r'def S3_resolve_scale\(rim, metadata, detection\):.*?solidity\": 0\.81\n    \}', re.DOTALL)
content = re.sub(s3_regex, s3_new, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("IPM Trigonometry successfully injected into S3_resolve_scale!")
