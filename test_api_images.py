import requests
import json
import os

url = 'https://pavesafe-ai-service.onrender.com/analyze'

images = {
    'Deep Urban': r'C:\Users\user\.gemini\antigravity\brain\7b07b21a-7395-4efe-a008-a0a7d1c0cc7b\pothole_deep_urban_1790018181044.jpg',
    'Wet Suburban': r'C:\Users\user\.gemini\antigravity\brain\7b07b21a-7395-4efe-a008-a0a7d1c0cc7b\pothole_wet_suburban_1790018194007.jpg',
    'Wide Highway': r'C:\Users\user\.gemini\antigravity\brain\7b07b21a-7395-4efe-a008-a0a7d1c0cc7b\pothole_wide_highway_1790018483978.jpg',
    'Shallow Cluster': r'C:\Users\user\.gemini\antigravity\brain\7b07b21a-7395-4efe-a008-a0a7d1c0cc7b\pothole_cluster_shallow_1790018501366.jpg',
    'Dangerous Curb': r'C:\Users\user\.gemini\antigravity\brain\7b07b21a-7395-4efe-a008-a0a7d1c0cc7b\pothole_curb_dangerous_1790018512579.jpg'
}

for name, path in images.items():
    print(f'Testing {name}...')
    try:
        with open(path, 'rb') as f:
            files = {'file': (os.path.basename(path), f, 'image/jpeg')}
            response = requests.post(url, files=files, timeout=60)
            if response.status_code == 200:
                data = response.json()
                print(f'  [✓] Success!')
                print(f'      - Detection: {data.get("detection", {}).get("class")} (Confidence: {data.get("detection", {}).get("confidence")})')
                print(f'      - Depth: {data.get("depth", {}).get("ordinal")} (via Shadow Contrast)')
                print(f'      - Risk: {data.get("commuter_risk", {}).get("bicycles")}')
            else:
                print(f'  [X] Failed! HTTP {response.status_code}: {response.text}')
    except Exception as e:
        print(f'  [X] Error! {str(e)}')
    print('-'*40)
