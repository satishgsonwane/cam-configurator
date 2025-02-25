import sys
import json
from utils import *

if len(sys.argv) < 2:
    print(json.dumps({"error": "No camera ID provided"}))
    sys.exit(1)

try:
    cameras = get_camera_configs()
    selected_camera = f"camera{sys.argv[1]}"
    cam = cameras.get(selected_camera)
    
    if not cam:
        print(json.dumps({"error": f"Camera {sys.argv[1]} not found"}))
        sys.exit(1)
        
    # Test all landmarks for the selected camera
    for i in range(1, 36):
        print(cam.get_pt_from_landmark_id(i))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)

