import re

file_path = 'ai-service/main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Using regex to match the old S3_resolve_scale regardless of hidden unicode characters
s3_regex = re.compile(r'def S3_resolve_scale\(rim, metadata\):.*?solidity\": 0\.81\n    \}', re.DOTALL)

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

content = re.sub(s3_regex, s3_new, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed S3_resolve_scale signature!")
