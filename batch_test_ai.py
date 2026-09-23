import os
import requests
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# Configuration
TEST_DIR = "test_dataset"
# Change this to "http://localhost:8000/analyze" if you are running the AI microservice locally
API_URL = "https://pavesafe-ai-service.onrender.com/analyze" 

def test_image(filepath):
    """Sends a single image to the AI microservice and returns the result."""
    filename = os.path.basename(filepath)
    
    try:
        with open(filepath, "rb") as f:
            files = {"file": (filename, f, "image/jpeg")}
            # Increased timeout to 120s for Render free-tier cold starts
            response = requests.post(API_URL, files=files, timeout=120)
            
        if response.status_code == 200:
            return {"filename": filename, "status": "success", "data": response.json()}
        else:
            return {"filename": filename, "status": "error", "error_code": response.status_code, "data": response.text}
            
    except Exception as e:
        return {"filename": filename, "status": "exception", "error": str(e)}

def main():
    if not os.path.exists(TEST_DIR):
        print(f"Error: Directory '{TEST_DIR}' not found. Please run generate_test_dataset.py first.")
        return

    image_files = [os.path.join(TEST_DIR, f) for f in os.listdir(TEST_DIR) if f.endswith(('.jpg', '.jpeg', '.png'))]
    
    if not image_files:
        print(f"No images found in '{TEST_DIR}'.")
        return

    print(f"Found {len(image_files)} images. Starting batch test against: {API_URL}")
    print("NOTE: The first image may take 30-60 seconds if the Render server is waking up.")
    print("-" * 60)
    
    results = []
    
    # Reduced max_workers to 2 to avoid crashing the Render free-tier CPU with concurrent YOLO inferences
    with ThreadPoolExecutor(max_workers=2) as executor:
        for result in executor.map(test_image, image_files):
            results.append(result)
            
            filename = result['filename']
            if result['status'] == 'success':
                data = result['data']
                
                if "error" in data:
                    print(f"[{filename}] ERROR: {data['error']}")
                else:
                    severity = data.get('severity', 'N/A')
                    print(f"[{filename}] SUCCESS | Severity: {severity}")
            else:
                print(f"[{filename}] HTTP ERROR: {result.get('error_code', result.get('error'))}")

    # Save complete detailed results to a JSON file
    output_file = "batch_test_results.json"
    with open(output_file, "w") as f:
        json.dump(results, f, indent=4)
        
    print("-" * 60)
    print(f"Batch test complete! Full detailed API responses saved to {output_file}")

if __name__ == "__main__":
    main()
