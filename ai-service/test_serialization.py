import requests
import os

url = 'http://localhost:8000/analyze'

# Just create a dummy image
import cv2
import numpy as np
dummy_img = np.zeros((640, 640, 3), dtype=np.uint8)
cv2.imwrite('dummy.jpg', dummy_img)

# Assuming the server is running or we can just import main.py directly
