import cv2
import numpy as np
import os
import random

def create_synthetic_edge_cases(num_images=50, output_dir='test_dataset'):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    for i in range(num_images):
        # Create base asphalt texture
        base_color = random.randint(70, 110)
        img = np.full((512, 512, 3), base_color, dtype=np.uint8)
        
        # Add asphalt noise
        noise = np.random.randint(-20, 20, (512, 512, 3), dtype=np.int16)
        img = np.clip(img + noise, 0, 255).astype(np.uint8)
        
        # Decide edge case type
        case_type = random.choice([
            'single_large', 'many_small', 'no_potholes_tar', 
            'water_filled', 'manhole', 'motion_blur'
        ])
        
        if case_type == 'single_large':
            cx, cy = random.randint(150, 350), random.randint(150, 350)
            rx, ry = random.randint(60, 120), random.randint(40, 80)
            cv2.ellipse(img, (cx, cy), (rx, ry), random.randint(0, 180), 0, 360, (30, 30, 30), -1)
            # Add inner shadow
            cv2.ellipse(img, (cx, cy), (rx-10, ry-10), random.randint(0, 180), 0, 360, (20, 20, 20), -1)
            
        elif case_type == 'many_small':
            num_potholes = random.randint(5, 15)
            for _ in range(num_potholes):
                cx, cy = random.randint(50, 460), random.randint(50, 460)
                rx, ry = random.randint(10, 25), random.randint(8, 20)
                cv2.ellipse(img, (cx, cy), (rx, ry), random.randint(0, 180), 0, 360, (40, 40, 40), -1)
                
        elif case_type == 'no_potholes_tar':
            # Tar snakes
            for _ in range(5):
                pts = np.array([[random.randint(0, 512), random.randint(0, 512)] for _ in range(4)], np.int32)
                pts = pts.reshape((-1, 1, 2))
                cv2.polylines(img, [pts], isClosed=False, color=(25, 25, 25), thickness=random.randint(3, 8))
                
        elif case_type == 'water_filled':
            cx, cy = random.randint(150, 350), random.randint(150, 350)
            rx, ry = random.randint(50, 100), random.randint(30, 70)
            # Base dark pothole
            cv2.ellipse(img, (cx, cy), (rx, ry), 0, 0, 360, (40, 40, 40), -1)
            # Sky reflection (light blue/white)
            cv2.ellipse(img, (cx, cy), (rx-5, ry-5), 0, 0, 360, (200, 210, 220), -1)
            
        elif case_type == 'manhole':
            cx, cy = random.randint(150, 350), random.randint(150, 350)
            r = random.randint(50, 80)
            cv2.circle(img, (cx, cy), r, (60, 60, 60), -1)
            cv2.circle(img, (cx, cy), r, (40, 40, 40), 3) # Rim
            # Add grid lines
            for x in range(cx - r + 10, cx + r - 10, 15):
                cv2.line(img, (x, cy - r + 10), (x, cy + r - 10), (50, 50, 50), 2)
                
        # Apply motion blur if requested
        if case_type == 'motion_blur':
            # Create horizontal motion blur kernel
            kernel_size = 15
            kernel = np.zeros((kernel_size, kernel_size))
            kernel[int((kernel_size-1)/2), :] = np.ones(kernel_size)
            kernel /= kernel_size
            img = cv2.filter2D(img, -1, kernel)
            
        # Add slight Gaussian blur to all for realism
        img = cv2.GaussianBlur(img, (3, 3), 0)
        
        filename = f"{output_dir}/{i+1:03d}_{case_type}.jpg"
        cv2.imwrite(filename, img)
        print(f"Generated {filename}")

if __name__ == '__main__':
    create_synthetic_edge_cases(50)
    print("50 edge cases successfully generated in 'test_dataset' folder!")
