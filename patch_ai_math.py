import os

file_path = 'ai-service/main.py'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Update S1_detect to return relative dimensions
s1_old = """    # Convert to standard 8-bit binary mask (0 and 255)
    mask_binary = (mask_resized * 255).astype(np.uint8)
    
    return {"class": class_name, "confidence": round(confidence, 3), "mock_mask": mask_binary}"""
s1_new = """    # Convert to standard 8-bit binary mask (0 and 255)
    mask_binary = (mask_resized * 255).astype(np.uint8)
    
    rel_w = float(first_box.xywhn[0][2])
    rel_h = float(first_box.xywhn[0][3])
    
    return {"class": class_name, "confidence": round(confidence, 3), "mock_mask": mask_binary, "rel_w": rel_w, "rel_h": rel_h}"""
content = content.replace(s1_old, s1_new)

# 2. Update S3_resolve_scale
s3_old = """def S3_resolve_scale(rim, metadata):
    \"\"\"(W_m, A_m2, I_W, I_A) | relative-only\"\"\"
    return {
        "scale_source": metadata.get("scale_source", "none"),
        "camera_height_m": 1.08, "camera_height_sigma_m": 0.05,
        "rim_area_m2": 0.19, "rim_area_sigma_m2": 0.02,
        "chord_width_m": 0.42, "chord_width_sigma_m": 0.03,
        "compactness": 1.48, "solidity": 0.81
    }"""
s3_new = """def S3_resolve_scale(rim, metadata, detection):
    \"\"\"(W_m, A_m2, I_W, I_A) | Dynamic heuristic pixel mapping\"\"\"
    rel_w = detection.get("rel_w", 0.15)
    rel_h = detection.get("rel_h", 0.15)
    
    # Heuristic: Assume image width covers ~2.8m of road width on average
    chord_width_m = round(rel_w * 2.8, 2)
    rim_area_m2 = round((rel_w * 2.8) * (rel_h * 2.8), 3)
    
    return {
        "scale_source": metadata.get("scale_source", "heuristic_pixel_ratio"),
        "camera_height_m": 1.08, "camera_height_sigma_m": 0.05,
        "rim_area_m2": rim_area_m2, "rim_area_sigma_m2": 0.02,
        "chord_width_m": chord_width_m, "chord_width_sigma_m": 0.03,
        "compactness": 1.48, "solidity": 0.81
    }"""
content = content.replace(s3_old, s3_new)

# 3. Update S5_severity
s5_old = """def S5_severity(geometry, depth):
    \"\"\"ASTM tier posterior + confidence\"\"\"
    return {
        "standard": "ASTM_D6433",
        "tier": "Medium",
        "posterior": {"low": 0.09, "medium": 0.71, "high": 0.20},
        "confidence": "high"
    }"""
s5_new = """def S5_severity(geometry, depth):
    \"\"\"Dynamic ASTM tier mapping based on depth and width\"\"\"
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
    }"""
content = content.replace(s5_old, s5_new)

# 4. Update S6_vehicle_risk
s6_old = """def S6_vehicle_risk(geometry, depth):
    \"\"\"Per-profile effective drop + risk tier\"\"\"
    return {
        "e_scooter": {"effective_drop_cm": 20.0, "tier": "Critical", "note": "W >= 2R, no bridging"},
        "car": {"effective_drop_cm": 6.9, "tier": "Medium"}
    }"""
s6_new = """def S6_vehicle_risk(geometry, depth):
    \"\"\"Dynamic vehicle risk based on geometry (Tire bridging simulation)\"\"\"
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
    }"""
content = content.replace(s6_old, s6_new)

# 5. Update /analyze endpoint
route_old = """        # In future, metadata comes from frontend request (ARCore or EXIF)
        mock_metadata = {"scale_source": "ar_measured"}
        geometry = S3_resolve_scale(rim, mock_metadata)
        
        depth = S4_estimate_depth(img, detection.get("mock_mask"))
        pavement_severity = S5_severity(geometry, depth)
        commuter_risk = S6_vehicle_risk(geometry, depth)

        # Remove numpy arrays from the dicts before JSON serialization
        if "mock_mask" in detection:
            del detection["mock_mask"]

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
        }"""
route_new = """        # In future, metadata comes from frontend request (ARCore or EXIF)
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
        }"""
content = content.replace(route_old, route_new)

with open(file_path, 'w') as f:
    f.write(content)

print("Successfully injected dynamic severity math into the AI microservice!")
