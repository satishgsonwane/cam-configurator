import numpy as np
import json
import os
from scipy import interpolate
import random

try:
    from .field_generator import generate_field_data
    from .equations import get_line_equation,find_intersections
except ImportError:
    from field_generator import generate_field_data
    from equations import get_line_equation,find_intersections
    
# Get the directory where the script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
config_path = os.path.join(script_dir, "AI_configs", "config.json")
operation_settings_path = os.path.join(script_dir, "AI_configs", "cameraconfig.json")

def smooth_error(error, error_range=0.5, scale=2):
    error = np.clip(error, -error_range, error_range)
    return np.sign(error)*abs(error_range*(error/error_range)**scale)
def adjust_error(error, last_error):
    factor = 0.5
    
    # Element-wise copysign
    same_sign = np.copysign(1, error) == np.copysign(1, last_error)
    
    # Calculate adjusted error when signs are the same
    abs_error = np.abs(error)
    abs_last_error = np.abs(last_error)
    adj_error_same_sign = np.minimum(abs_error, (1 + factor) * np.maximum(abs_last_error, 0.1))
    adj_error_same_sign = np.copysign(adj_error_same_sign, error)
    
    # Calculate adjusted error when signs are different
    adj_error_diff_sign = np.minimum(np.minimum(0.1, factor), abs_error)
    adj_error_diff_sign = np.copysign(adj_error_diff_sign, error)
    
    # Combine results using where
    adj_error = np.where(same_sign, adj_error_same_sign, adj_error_diff_sign)
    
    return adj_error

class Field:
    __slots__ = ["width","height","landmarks"]
    def __init__(self, width=106, height=68):
        self.width = width
        self.height = height
        self.landmarks = generate_field_data(self.width,self.height)

class Camera:
    __slots__ = ["id","ip","port","operation_mode","framing_mode","role","status","camerapos","field",
                "height","side_lines","panrange","tiltrange","zoom_multiplier","calibration_data",
                "calibration_landmarks_ids","landmarks","field_width","field_height","tilt_per_meter",
                "tilt_delta_factor","tilt_offset","pan_per_meter","pan_delta_factor","pan_offset","reset_pan",
                "reset_tilt","reset_zoom","LUT_pan","LUT_tilt","LUT_zoom_pan","LUT_zoom_tilt",
                "ZMIN","ZMAX","FOVXMIN","FOVXMAX","FOVYMIN","FOVYMAX","PMIN","PMAX","TMIN","TMAX",
                "diag_field_dist","scanning_data","is_broadcasting","last_error_x","last_error_y",
                "distance_sidelines","filtered_side_lines"]
    def __init__(self,camid,cameraposition,camera_height,
                 panrange,tiltrange,zoom_multiplier,
                 calibration_data,reset_position,field,
                 zoombreakpoints,xfov,yfov,scanning_data,
                 ip,port,mode,framing_mode,role,status):
        self.id = camid
        self.ip = ip
        self.port = port
        self.operation_mode = mode
        self.status = status
        self.framing_mode = framing_mode
        self.role = role
        self.camerapos = np.array(cameraposition)
        self.field = field
        self.height = camera_height #camera height
        self.side_lines = np.array([[0,1,0],
                        [1,0,0],
                        [1,0,-self.field.width],
                        [0,1,-self.field.height]])
         
        self.panrange = panrange # pan range of camera
        self.tiltrange = tiltrange # tilt range of camera
        self.zoom_multiplier = zoom_multiplier # zoom multiplier of camera
        self.calibration_data = {int(key)-1:value for key,value in calibration_data.items()} # actual pan tilt values for calibration landmarks
        self.calibration_landmarks_ids = list(self.calibration_data.keys()) # ids of calibration landmarks
        self.landmarks = self.field.landmarks # world coordinates of landmarks considering lanmark id 1 as origin (0,0)
        self.field_width = self.field.width
        self.field_height = self.field.height
        self.tilt_per_meter,self.tilt_delta_factor,self.tilt_offset = self._get_tilt_delta() 
        self.pan_per_meter,self.pan_delta_factor,self.pan_offset = self._get_pan_delta()
        self.reset_pan = reset_position.get("pan")
        self.reset_tilt = reset_position.get("tilt")
        self.reset_zoom = reset_position.get("zoom")
        self.LUT_pan = interpolate.interp1d(zoombreakpoints, xfov, fill_value = "interpolate")
        self.LUT_tilt = interpolate.interp1d(zoombreakpoints, yfov, fill_value = "interpolate")
        self.LUT_zoom_pan = interpolate.interp1d(xfov, zoombreakpoints, fill_value = "interpolate")
        self.LUT_zoom_tilt = interpolate.interp1d(yfov, zoombreakpoints, fill_value = "interpolate")
        self.ZMIN,self.ZMAX = min(zoombreakpoints),max(zoombreakpoints)
        self.FOVXMIN,self.FOVXMAX = min(xfov),max(xfov)
        self.FOVYMIN,self.FOVYMAX = min(yfov),max(yfov)
        self.PMIN,self.PMAX = self.panrange
        self.TMIN,self.TMAX = self.tiltrange
        self.diag_field_dist = np.sqrt(np.square(self.field_height)+np.square(self.field_width))
        self.scanning_data = scanning_data
        self.is_broadcasting = False
        self.last_error_x = 0
        self.last_error_y = 0
        self.distance_sidelines = self._distances_from_side_lines()
        self.filtered_side_lines = self.side_lines[self.distance_sidelines.argsort()][self._check_camera_position():,:]

    def _check_camera_position(self):
        outside_height = self.camerapos[1] > self.field_height or self.camerapos[1] < 0
        outside_width = self.camerapos[0] > self.field_width or self.camerapos[0] < 0
        #print("outside_height",outside_height)
        #print("outside_width",outside_width)
        if outside_height and outside_width:
            return 2
        elif outside_height or outside_width:
            return 1
    def get_pt_from_landmark_id(self,landmark_id):
        x,y = self.landmarks[landmark_id-1]
        pt = self.xy_to_pt(np.array([[x,y]]))
        pan = pt[...,0]
        tilt = pt[...,1]
        return {"pan":pan,"tilt":tilt}
    def check_calibration(self):
        landmark_pairs = [random.sample(range(len(self.landmarks)),2) for _ in range(10000)]
        pan_delta_factors = []
        tilt_delta_factors = []
        pan_offsets = []
        tilt_offsets = []

        for landmark_pair in landmark_pairs:
            x1,y1 = self.landmarks[landmark_pair[0]]
            x2,y2 = self.landmarks[landmark_pair[1]]
            distance_cam_base_to_landmark1 = np.linalg.norm(np.array([x1,y1]) - self.camerapos)
            distance_cam_base_to_landmark2 = np.linalg.norm(np.array([x2,y2]) - self.camerapos)
            pt1 = self.xy_to_pt(np.array([[x1,y1]]))
            pt2 = self.xy_to_pt(np.array([[x2,y2]]))
            theta_1 = self._get_theta(np.array([[x1,y1]]),distance_cam_base_to_landmark1)
            theta_2 = self._get_theta(np.array([[x2,y2]]),distance_cam_base_to_landmark2)
            phi_1 = np.rad2deg(np.arctan(distance_cam_base_to_landmark1/self.height))
            phi_2 = np.rad2deg(np.arctan(distance_cam_base_to_landmark2/self.height))
            pan_delta_factor = abs(theta_1 - theta_2)/abs(pt1[...,0] - pt2[...,0])
            tilt_delta_factor = abs(phi_1 - phi_2)/abs(distance_cam_base_to_landmark1 - distance_cam_base_to_landmark2)
            pan_offset = theta_1 - pt1[...,0]*pan_delta_factor
            tilt_offset = phi_1 - pt1[...,1]*tilt_delta_factor
            pan_delta_factors.append(pan_delta_factor)
            tilt_delta_factors.append(tilt_delta_factor)
            pan_offsets.append(pan_offset)
            tilt_offsets.append(tilt_offset)

        # print(np.mean(pan_delta_factors),np.std(pan_delta_factors))
        # print(np.mean(tilt_delta_factors),np.std(tilt_delta_factors))
        # print(np.mean(pan_offsets),np.std(pan_offsets))
        # print(np.mean(tilt_offsets),np.std(tilt_offsets))
        return {"PAN_STD_1":np.std(pan_delta_factors),"TILT_STD_1":np.std(tilt_delta_factors),
                "PAN_STD_2":np.std(pan_offsets),"TILT_STD_2":np.std(tilt_offsets)}
        #check for pan_offset and tilt_offset and pan_delta_factor and tilt_delta_factor for various landmarks
        
    def _distances_from_side_lines(self):
        numerator = np.abs(np.dot(self.side_lines[:,:2],self.camerapos) + self.side_lines[:,2])
        denominator = np.sqrt(np.square(self.side_lines[:,0]) + np.square(self.side_lines[:,1]))
        distance = numerator/denominator
        return distance


    def _get_theta(self, point, distance_cam_base_to_point):
        #print("point",point,type(point))
        if isinstance(point,np.ndarray):
            opposite_side = point[...,0] - self.camerapos[0]
            #print("opposite_side",opposite_side)
            theta = np.rad2deg(np.arcsin(opposite_side / distance_cam_base_to_point))
            #print("theta",theta)
            condition = self.camerapos[1] < point[...,1]
            #print("condition",condition)
            #print("theta",theta)
            theta[condition] = np.where(theta[condition] >= 0,
                                        180 - theta[condition],
                                        -(180 - np.abs(theta[condition])))
        
            return theta
        else:
            opposite_side = point[0] - self.camerapos[0]
            if self.camerapos[1] >= point[1]:
                theta = np.rad2deg(np.arcsin(opposite_side/distance_cam_base_to_point))
            elif self.camerapos[1] < point[1]:
                temp_theta = np.rad2deg(np.arcsin(opposite_side/distance_cam_base_to_point))
                if temp_theta >= 0:
                    theta = 180 - temp_theta
                else:
                    theta = -(180 - abs(temp_theta))
            return theta
       


    def _pan_tilt_limiter(self,pan,tilt):
        pan = max(min(pan,self.panrange[1]),self.panrange[0])
        tilt = max(min(tilt,self.tiltrange[1]),self.tiltrange[0])
        return pan,tilt
    
    def _get_pan_delta(self):
        #get actual pan values for calibration landmarks and calculate pan delta
        pan_landmark1 = self.calibration_data.get(self.calibration_landmarks_ids[0])[0]
        pan_landmark2 = self.calibration_data.get(self.calibration_landmarks_ids[1])[0]
        pan_delta = abs(pan_landmark1 - pan_landmark2)
        #get distance of camera base to calibration landmarks and calculate theta delta
        distance_cam_base_to_landmark1 = np.linalg.norm(np.array(self.landmarks[int(self.calibration_landmarks_ids[0])]) - self.camerapos)
        distance_cam_base_to_landmark2 = np.linalg.norm(np.array(self.landmarks[int(self.calibration_landmarks_ids[1])]) - self.camerapos)
        theta_1 = self._get_theta(self.landmarks[int(self.calibration_landmarks_ids[0])],distance_cam_base_to_landmark1)
        theta_2 = self._get_theta(self.landmarks[int(self.calibration_landmarks_ids[1])],distance_cam_base_to_landmark2)
        theta_delta = abs(theta_1 - theta_2)
        #calculate pan delta factor
        pan_delta_factor = theta_delta/pan_delta
        #calculate theta offset
        theta_1_read = pan_landmark1*pan_delta_factor
        theta_2_read = pan_landmark2*pan_delta_factor
        theta_offset1 = theta_1 - theta_1_read
        theta_offset2 = theta_2 - theta_2_read
        pan_per_meter = theta_delta/abs(distance_cam_base_to_landmark1 - distance_cam_base_to_landmark2)
        return pan_per_meter,pan_delta_factor,(theta_offset1+theta_offset2)/2
  
    def _get_tilt_delta(self):
        #get actual tilt values for calibration landmarks and calculate tilt delta
        tilt_landmark1 = self.calibration_data.get(self.calibration_landmarks_ids[0])[1]
        tilt_landmark2 = self.calibration_data.get(self.calibration_landmarks_ids[1])[1]
        tilt_delta = abs(tilt_landmark1 - tilt_landmark2)
        #get distance of camera base to calibration landmarks and calculate phi delta
        distance_cam_base_to_landmark1 = np.linalg.norm(np.array(self.landmarks[int(self.calibration_landmarks_ids[0])]) - self.camerapos)
        distance_cam_base_to_landmark2 = np.linalg.norm(np.array(self.landmarks[int(self.calibration_landmarks_ids[1])]) - self.camerapos)
        phi_1 = np.rad2deg(np.arctan(distance_cam_base_to_landmark1/self.height))
        phi_2 = np.rad2deg(np.arctan(distance_cam_base_to_landmark2/self.height))
        phi_delta = abs(phi_1 - phi_2)
        #calculate tilt delta factor
        tilt_delta_factor = phi_delta/tilt_delta
        #calculate phi offset
        phi_1_read = tilt_landmark1*tilt_delta_factor
        phi_2_read = tilt_landmark2*tilt_delta_factor
        phi_offset1 = phi_1 - phi_1_read
        phi_offset2 = phi_2 - phi_2_read
        tilt_per_meter = phi_delta/abs(distance_cam_base_to_landmark1 - distance_cam_base_to_landmark2) 
        return tilt_per_meter,tilt_delta_factor,(phi_offset1+phi_offset2)/2
    
    def pt_to_xy(self,PT):
        """Pan tilt values from camera to world coordinates"""
        x_y_dist = np.zeros((PT.shape[0],5))
        pan = PT[...,0]
        tilt = PT[...,1]
        phi = tilt*self.tilt_delta_factor + self.tilt_offset
        #print("PHI",phi)
        distance_cam_base_to_point = abs(np.tan(np.deg2rad(phi))*self.height)
        distance_cam_base_to_point = np.clip(distance_cam_base_to_point,0,self.diag_field_dist) 
        theta = pan*self.pan_delta_factor + self.pan_offset
        y =  distance_cam_base_to_point*np.cos(np.deg2rad(theta))
        x =  distance_cam_base_to_point*np.sin(np.deg2rad(theta))
        y_origin = self.camerapos[1] - y
        x_origin = self.camerapos[0] + x
        x_y_dist[...,0] = x_origin
        x_y_dist[...,1] = y_origin
        try:
            xy = np.stack((x_origin,y_origin),axis=-1)
            lines = get_line_equation(xy,self.camerapos)
            intersection = find_intersections(lines,self.filtered_side_lines)
            dist_cam_base_to_boundaries = np.linalg.norm(intersection - self.camerapos,axis=2)
            min_dist_cam_base_to_boundaries = np.min(dist_cam_base_to_boundaries,axis=1)
            phi_max = np.rad2deg(np.arctan(min_dist_cam_base_to_boundaries/self.height))
            delta_phi = phi  - phi_max  
            adjusted_phi = np.where(delta_phi > 0, phi_max - delta_phi ,phi)
            adjusted_distance_cam_base_to_point = abs(np.tan(np.deg2rad(adjusted_phi))*self.height)
            x_y_dist[...,2] = adjusted_distance_cam_base_to_point
        except:
            x_y_dist[...,2] = distance_cam_base_to_point
        x_y_dist[...,3] = distance_cam_base_to_point
        x_y_dist[...,4] = phi
        print("Phi",phi)
        print("theta",theta)
        return x_y_dist
    
    def xy_to_pt(self,xy):
        """World coordinates to pan tilt values of camera"""
        
        pt_dist = np.zeros((xy.shape[0],3))
        #distance_cam_base_to_point = np.linalg.norm(np.array([x,y]) - self.camerapos)
        distance_cam_base_to_point = np.linalg.norm(xy - self.camerapos,axis=1)
        phi = np.rad2deg(np.arctan(distance_cam_base_to_point/self.height))
        #print("PHI",phi)
        tilt = (phi - self.tilt_offset)/self.tilt_delta_factor
        #print("TILT",tilt)
        theta = self._get_theta(xy,distance_cam_base_to_point)
        pan = (theta - self.pan_offset)/self.pan_delta_factor
        #print("Phi",phi)
        #print("theta",theta)
        #print("Pan",pan)
        pt_dist[...,0] = pan
        pt_dist[...,1] = tilt
        pt_dist[...,2] = distance_cam_base_to_point
        return pt_dist
    
    def transformPTZ(self,PTZ,ball,target_x=0.5,target_y=0.5,smooth=False,max_shift=0.3):
        #print("PTZ",PTZ)
        ptz_adjusted = np.zeros((ball.shape[0],3))
        P = PTZ["panposition"]
        T = PTZ["tiltposition"]
        Z = PTZ["zoomposition"]
        Z = max(min(Z, self.ZMAX), self.ZMIN)
        ball_x_center = (ball[...,0] + ball[...,2])/2   
        ball_y_center = ball[...,3] #(ball[...,1] + ball[...,3])/2
        if smooth:
            shift = max_shift*(1 - (Z/self.ZMAX))
            #shift = 0.25
            target_y = target_y + shift
            distance_error_x = smooth_error(ball_x_center - target_x, target_x)
            #distance_error_x = adjust_error(distance_error_x, self.last_error_x)
            #Error Adjustments from Ease in and Ease out
            distance_error_y = smooth_error(ball_y_center - target_y, target_y-shift)
            #distance_error_y = adjust_error(distance_error_y, self.last_error_y)
            #self.last_error_x = distance_error_x
            #self.last_error_y = distance_error_y

        else:
            distance_error_x = ball_x_center - target_x
            distance_error_y = ball_y_center - target_y
        
        pan_offset_base = self.LUT_pan(Z)
        tilt_offset_base = self.LUT_tilt(Z)
        #adjust the pan_offset_base depending on the distance from the camera
        xy = self.pt_to_xy(np.array([[P,T]]))
        distance_cam_base_to_point = np.linalg.norm(xy[...,0:2] - self.camerapos,axis=1)
        pan_offset = pan_offset_base#* np.arctan(distance_cam_base_to_point/self.height) #* (1 - distance_cam_base_to_point/self.diag_field_dist)
        tilt_offset = tilt_offset_base#* np.arctan(distance_cam_base_to_point/self.height)# * (1 - distance_cam_base_to_point/self.diag_field_dist)
       
        pan_adj = distance_error_x * pan_offset
        tilt_adj = distance_error_y * tilt_offset
        ptz_adjusted[...,0] = P + pan_adj
        ptz_adjusted[...,1] = T - tilt_adj
        ptz_adjusted[...,2] = Z
        return ptz_adjusted  
     
    def get_tilt_adjustment(self,T,zoom,max_shift=0.3):
        zoom = max(min(zoom, self.ZMAX), self.ZMIN)
        shift = max_shift*(1 - (zoom/self.ZMAX))
        #shift = 0.25
        tilt_offset = self.LUT_tilt(zoom)
        T = T + shift * tilt_offset
        return max(min(T, self.TMAX), self.TMIN)
    def ptz_adjustment_for_boundary_conditions(self,P,T,Z,PTZ):
        current_zoom = PTZ["zoomposition"]# TODO: need to check performance with last zoom
        T = max(min(T, self.TMAX), self.TMIN)
        if self.PMIN <= P <= self.PMAX:
            Z = max(min(Z, self.ZMAX), self.ZMIN)     
        else:
            current_fov = self.LUT_pan(current_zoom)
            if P < self.PMIN:
                pan_diff = abs(P - self.PMIN)
            else:
                pan_diff = abs(self.PMAX - P )
            diff_fov = (current_fov/2) - pan_diff
            new_fov = (current_fov-diff_fov)*1.5
            new_fov = max(min(new_fov, self.FOVXMAX), self.FOVXMIN)
            updated_zoom_by_fov = self.LUT_zoom_pan(new_fov)
            print("PAN is not in range so updating_zoom_by_fov",updated_zoom_by_fov)
            #print(type(updated_zoom_by_fov))
            Z = max(min(Z, updated_zoom_by_fov), self.ZMIN)
            P = max(min(P, self.PMAX), self.PMIN)

        return P,T,int(Z)
       

def get_camera_configs():
    cameras = {}
    try:
        with open(config_path) as file:
            with open(operation_settings_path) as op_file:
                op_data = json.load(op_file)
                data = json.load(file)
                cam_config = data.get("camera_config")
                field_config = data.get("field_config")
                scanning_data = data.get("scan_positions")
                zoom_data = data.get("zoom_factor")
                operation_config =op_data.get("camera_config")   
                #operation_mode = op_data.get("operation_mode")
                #framing_mode = op_data.get("framing_mode")
                if field_config is not None:
                    field_height = field_config.get("height")
                    field_width = field_config.get("width")
                    field = Field(field_width,field_height)

                    if cam_config is not None:
                        for camdata,opdata in zip(cam_config,operation_config):
                            camid = camdata.get("camera_id")
                            operation_mode = opdata.get("operation_mode")
                            framing_mode = opdata.get("framing_mode")
                            role = opdata.get("role")
                            status = opdata.get("status")

                            camera_height = camdata.get("camera_height")
                            cameraposition = camdata.get("cameraposition")
                            panrange = camdata.get("panrange")
                            tiltrange = camdata.get("tiltrange")
                            zoom_multiplier = zoom_data.get(framing_mode) #camdata.get("zoom_factor")
                            calibration_data = camdata.get("calibration_data")
                            reset_position = camdata.get("reset_position")
                            zoombreakpoints = camdata.get("zoombreakpoints")
                            xfov = camdata.get("xfov")
                            yfov = camdata.get("yfov")
                            ip = camdata.get("ip")
                            port = camdata.get("port")
                            
                            cameras[f"camera{camid}"] = Camera(camid,cameraposition,camera_height,panrange,tiltrange,zoom_multiplier,calibration_data,reset_position,field,
                                                                zoombreakpoints,xfov,yfov,scanning_data,ip,port,operation_mode,framing_mode,role,status)
            return cameras

                    


    except FileNotFoundError:
        print("Config file not found")
        exit(-1)


if __name__ == "__main__":
    import sys
    import json

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
            
        results = cam.check_calibration()
        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

