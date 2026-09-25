import re
import os

file_path = 'ai-service/main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the FastAPI endpoint signature
old_sig = 'async def analyze_image(file: UploadFile = File(...)):'
new_sig = 'async def analyze_image(file: UploadFile = File(...), metadata: str = Form(default="{}")):'
content = content.replace(old_sig, new_sig)

# Replace the internal logic to parse metadata
old_logic = """        # In future, metadata comes from frontend request (ARCore or EXIF)
        mock_metadata = {"scale_source": "ar_measured"}
        
        depth = S4_estimate_depth(img, detection.get("mock_mask"))
        geometry = S3_resolve_scale(rim, mock_metadata, detection)"""

new_logic = """        import json
        try:
            parsed_meta = json.loads(metadata)
        except:
            parsed_meta = {}
            
        if not parsed_meta:
            parsed_meta = {"scale_source": "heuristic_pixel_ratio"}
            
        depth = S4_estimate_depth(img, detection.get("mock_mask"))
        geometry = S3_resolve_scale(rim, parsed_meta, detection)"""

content = content.replace(old_logic, new_logic)

# Also fix the missing FastAPI Form import if it's not there
if 'from fastapi import' in content and 'Form' not in content:
    content = re.sub(r'(from fastapi import\s+.*?)(UploadFile|File)(.*?)', r'\1\2, Form\3', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Backend endpoint metadata extraction patched!")
