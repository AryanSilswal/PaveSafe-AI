import re

file_path = 'ai-service/main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add GC import at the top
if 'import gc' not in content:
    content = content.replace('import cv2', 'import cv2\nimport gc')

# Inject resizing logic
old_logic = """        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:"""

new_logic = """        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"severity": 5, "error": "Could not decode image"}
            
        # OOM PROTECTION: Render Free Tier only has 512MB RAM.
        # A raw 4K smartphone photo takes ~100MB of RAM uncompressed. Resize it immediately.
        max_dim = 1024
        if img.shape[0] > max_dim or img.shape[1] > max_dim:
            scale = max_dim / max(img.shape[0], img.shape[1])
            img = cv2.resize(img, (0,0), fx=scale, fy=scale)
            
        if img is None: # Dummy check to replace the one we consumed"""

content = content.replace(old_logic, new_logic)

# Inject Garbage Collection at the very end of the endpoint
old_return = """        return response_schema

    except Exception as e:"""

new_return = """        # Force garbage collection to free up memory before the next request
        del img
        del contents
        del nparr
        gc.collect()
        
        return response_schema

    except Exception as e:"""

content = content.replace(old_return, new_return)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("OOM protection injected successfully!")
