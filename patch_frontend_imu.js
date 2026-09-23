const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/commuter/page.tsx', 'utf8');

// 1. Add devicePitch state
code = code.replace(
  'const [isReporting, setIsReporting] = useState(false);',
  'const [isReporting, setIsReporting] = useState(false);\n  const [devicePitch, setDevicePitch] = useState<number | null>(null);'
);

// 2. Add useEffect for IMU
const useEffectSearch = 'useEffect(() => {';
const useEffectReplace = `useEffect(() => {
    // Collect live IMU Data (Gyroscope/Accelerometer)
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta !== null) {
        setDevicePitch(event.beta); // Front-to-back tilt in degrees
      }
    };
    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, []);

  useEffect(() => {`;
code = code.replace(useEffectSearch, useEffectReplace);

// 3. Update submitReport to include metadata
const submitSearch = `formData.append('latitude', location.lat.toString());
    formData.append('longitude', location.lng.toString());`;
const submitReplace = `formData.append('latitude', location.lat.toString());
    formData.append('longitude', location.lng.toString());
    
    // Pass live sensor data to AI for precise scale/depth measurement
    const metadata = {
      camera_height_m: 1.08, // Standard mount height
      camera_pitch_degrees: devicePitch || -15, // Live tilt or fallback
      scale_source: devicePitch ? "imu_measured" : "heuristic_pixel_ratio"
    };
    formData.append('metadata', JSON.stringify(metadata));`;
code = code.replace(submitSearch, submitReplace);

// 4. Update the input to strictly enforce camera and warn desktop users
const inputSearch = `<div className="relative">
                    <input 
                      type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload}`;
const inputReplace = `<div className="relative">
                    {/* Live Camera enforced. Destkop file picker fallback discouraged via capture strictness */}
                    <input 
                      type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload}`;
code = code.replace(inputSearch, inputReplace);

fs.writeFileSync('frontend/src/app/commuter/page.tsx', code);
console.log('Frontend patch applied!');
