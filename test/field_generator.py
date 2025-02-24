import cv2
import numpy as np

scale = 1

# Constants
MIDPOINT_CIRCLE_RADIUS = 9.1440 * scale
PENALTY_SPOT_RADIUS = 0.1143 * scale
CENTER_SPOT_RADIUS = 0.1143 * scale
LINE_WIDTH = max(0.1143 * scale,1)
PENALTY_SPOT_OFFSET = 10.9728 * scale
GOAL_WIDTH = 7.3152 * scale
GOAL_DEPTH = 2.7432 * scale
PENALTY_AREA_OFFSET = 16.4592 * scale
GOAL_AREA_OFFSET = 5.4864 * scale
QUARTER_CIRCLE_RADIUS = 0.9144 * scale

FIELD_OFFSET = 0 * scale
WHITE = (255, 255, 255)

NUMBER_OF_CORNERS_TO_TRACK = 35#25

# Will be parameters
#meters = True
width = 105
height = 68

def generate_field_data(width_, height_):
    global width
    global height

    width = width_ * scale
    height = height_ * scale

    fieldCorners = [0] * NUMBER_OF_CORNERS_TO_TRACK

    # Create blank image
    #image = np.zeros((height + FIELD_OFFSET*2, width + FIELD_OFFSET*2, 3), np.uint8)

    # Make background green
    #image[:, :,] = (0, 153, 0)

    # Add field outlines
    fieldCorners = addfieldOutlines(fieldCorners)

    # Add penalty areas and penalty spots
    fieldCorners = addPenaltyOutlines(fieldCorners)

    # Add goal areas
    fieldCorners = addGoalAreaOutlines(fieldCorners)

    # Add goals
    fieldCorners = addGoals(fieldCorners)

    # Add remaining corners
    fieldCorners = addarc(fieldCorners)
    
    return fieldCorners


def find_line_eq(x1, y1, x2, y2):
    # Calculate slope (m) and y-intercept (b) of the line
    m = (y2 - y1) / (x2 - x1)
    b = y1 - m * x1
    return m, b
def circle_line_intersection(xc, yc, r, x1, y1, x2, y2):
    if x1 == x2:  # Vertical line
        # Substitute x = x1 in the circle's equation
        a = 1
        b = -2 * yc
        c = yc**2 - r**2 + (x1 - xc)**2
        delta = b**2 - 4 * a * c
        #print(delta)
        if delta < 0:
            return []
        else:
            y1 = (-b + np.sqrt(delta)) / (2 * a)
            y2 = (-b - np.sqrt(delta)) / (2 * a)
            return [(x1, y1), (x1, y2)]
    else:
        # Non-vertical line
        m = (y2 - y1) / (x2 - x1)
        b = y1 - m * x1
        a = 1 + m**2
        b = 2 * (m * (b - yc) - xc)
        c = xc**2 + (b - yc)**2 - r**2
        delta = b**2 - 4 * a * c
        #print(delta)
        if delta < 0:
            return []
        else:
            x1 = (-b + np.sqrt(delta)) / (2 * a)
            x2 = (-b - np.sqrt(delta)) / (2 * a)
            y1 = m * x1 + b,0
            y2 = m * x2 + b,0
            return [(x1, y1), (x2, y2)]
def addarc(fieldCorners):
    #print(fieldCorners[31],fieldCorners[10],fieldCorners[12])
    xc,yc,r = fieldCorners[31][0],fieldCorners[31][1],MIDPOINT_CIRCLE_RADIUS
    fieldCorners[26],fieldCorners[25] = circle_line_intersection(xc,yc,r,fieldCorners[10][0],fieldCorners[10][1],fieldCorners[12][0],fieldCorners[12][1])
    #print(fieldCorners[25],fieldCorners[26])#,fieldCorners[20])
    xc,yc,r = fieldCorners[32][0],fieldCorners[32][1],MIDPOINT_CIRCLE_RADIUS
    fieldCorners[28],fieldCorners[27] = circle_line_intersection(xc,yc,r,fieldCorners[17][0],fieldCorners[17][1],fieldCorners[19][0],fieldCorners[19][1])
    return fieldCorners
def addfieldOutlines(fieldCorners):
    
    topLeftCorner = (FIELD_OFFSET, FIELD_OFFSET)
    topRightCorner = (width + FIELD_OFFSET, FIELD_OFFSET)
    bottomLeftCorner = (FIELD_OFFSET, height + FIELD_OFFSET)
    bottomRightCorner = (width + FIELD_OFFSET, height + FIELD_OFFSET)

    midfieldPoint = (width/2 + FIELD_OFFSET, height/2 + FIELD_OFFSET)
    midfieldPointTop = ((width/2) + FIELD_OFFSET, FIELD_OFFSET)
    midfieldPointBottom = ((width/2) + FIELD_OFFSET, height + FIELD_OFFSET)

    # Save corners
    fieldCorners[0] = topLeftCorner
    fieldCorners[1] = midfieldPointTop
    fieldCorners[2] = topRightCorner
    fieldCorners[3] = bottomLeftCorner
    fieldCorners[4] = midfieldPointBottom
    fieldCorners[5] = bottomRightCorner
    fieldCorners[6] = (midfieldPoint[0], midfieldPoint[1] - MIDPOINT_CIRCLE_RADIUS)
    fieldCorners[7] = midfieldPoint
    fieldCorners[8] = (midfieldPoint[0], midfieldPoint[1] + MIDPOINT_CIRCLE_RADIUS)

    
    
    return fieldCorners

def addPenaltyOutlines(fieldCorners):

    # Left side
    penaltySpot = (PENALTY_SPOT_OFFSET + FIELD_OFFSET, (height/2) + FIELD_OFFSET)
    topLeftCorner = (FIELD_OFFSET, (height/2) - (GOAL_WIDTH/2) - PENALTY_AREA_OFFSET + FIELD_OFFSET)
    topRightCorner = (FIELD_OFFSET + PENALTY_AREA_OFFSET, (height/2) - (GOAL_WIDTH/2) - PENALTY_AREA_OFFSET + FIELD_OFFSET)
    bottomLeftCorner = (FIELD_OFFSET, (height/2) + (GOAL_WIDTH/2) + PENALTY_AREA_OFFSET + FIELD_OFFSET)
    bottomRightCorner = (FIELD_OFFSET + PENALTY_AREA_OFFSET, (height/2) + (GOAL_WIDTH/2) + PENALTY_AREA_OFFSET + FIELD_OFFSET)

    # Save corners
    fieldCorners[9] = topLeftCorner
    fieldCorners[10] = topRightCorner
    fieldCorners[11] = bottomLeftCorner
    fieldCorners[12] = bottomRightCorner
    fieldCorners[31] = penaltySpot

    

    # Right side
    penaltySpot = (width - PENALTY_SPOT_OFFSET + FIELD_OFFSET, (height/2) + FIELD_OFFSET)
    topLeftCorner = (width - PENALTY_AREA_OFFSET + FIELD_OFFSET, (height/2) - (GOAL_WIDTH/2) - PENALTY_AREA_OFFSET + FIELD_OFFSET)
    topRightCorner = (width + FIELD_OFFSET, (height/2) - (GOAL_WIDTH/2) - PENALTY_AREA_OFFSET + FIELD_OFFSET)
    bottomLeftCorner = (width - PENALTY_AREA_OFFSET + FIELD_OFFSET, (height/2) + (GOAL_WIDTH/2) + PENALTY_AREA_OFFSET + FIELD_OFFSET)
    bottomRightCorner = (width + FIELD_OFFSET, (height/2) + (GOAL_WIDTH/2) + PENALTY_AREA_OFFSET + FIELD_OFFSET)

    # Save corners
    fieldCorners[17] = topLeftCorner
    fieldCorners[18] = topRightCorner
    fieldCorners[19] = bottomLeftCorner
    fieldCorners[20] = bottomRightCorner
    fieldCorners[32] = penaltySpot
    

    return  fieldCorners

def addGoalAreaOutlines(fieldCorners):

    # Left side
    topLeftCorner = (FIELD_OFFSET, (height/2) - (GOAL_WIDTH/2) - GOAL_AREA_OFFSET + FIELD_OFFSET)
    topRightCorner = (FIELD_OFFSET + GOAL_AREA_OFFSET, (height/2) - (GOAL_WIDTH/2) - GOAL_AREA_OFFSET + FIELD_OFFSET)
    bottomLeftCorner = (FIELD_OFFSET, (height/2) + (GOAL_WIDTH/2) + GOAL_AREA_OFFSET + FIELD_OFFSET)
    bottomRightCorner = (FIELD_OFFSET + GOAL_AREA_OFFSET, (height/2) + (GOAL_WIDTH/2) + GOAL_AREA_OFFSET + FIELD_OFFSET)

    # Save corners
    fieldCorners[13] = topLeftCorner
    fieldCorners[14] = topRightCorner
    fieldCorners[15] = bottomLeftCorner
    fieldCorners[16] = bottomRightCorner

    # Top line

    # Right side
    topLeftCorner = (width - GOAL_AREA_OFFSET + FIELD_OFFSET, (height/2) - (GOAL_WIDTH/2) - GOAL_AREA_OFFSET + FIELD_OFFSET)
    topRightCorner = (width + FIELD_OFFSET, (height/2) - (GOAL_WIDTH/2) - GOAL_AREA_OFFSET + FIELD_OFFSET)
    bottomLeftCorner = (width - GOAL_AREA_OFFSET + FIELD_OFFSET, (height/2) + (GOAL_WIDTH/2) + GOAL_AREA_OFFSET + FIELD_OFFSET)
    bottomRightCorner = (width + FIELD_OFFSET, (height/2) + (GOAL_WIDTH/2) + GOAL_AREA_OFFSET + FIELD_OFFSET)

    # Save corners
    fieldCorners[21] = topLeftCorner
    fieldCorners[22] = topRightCorner
    fieldCorners[23] = bottomLeftCorner
    fieldCorners[24] = bottomRightCorner
    
    # Top line
    

    return fieldCorners

def addGoals(fieldCorners):

     # Left side
    topLeftCorner = (FIELD_OFFSET - GOAL_DEPTH, (height/2) - (GOAL_WIDTH/2) + FIELD_OFFSET)
    topRightCorner = (FIELD_OFFSET, (height/2) - (GOAL_WIDTH/2) + FIELD_OFFSET)
    bottomLeftCorner = (FIELD_OFFSET - GOAL_DEPTH, (height/2) + (GOAL_WIDTH/2) + FIELD_OFFSET)
    bottomRightCorner = (FIELD_OFFSET, (height/2) + (GOAL_WIDTH/2) + FIELD_OFFSET)

    # Save corners
    fieldCorners[29] = topRightCorner
    fieldCorners[30] = bottomRightCorner

    # Right side
    topLeftCorner = (width + FIELD_OFFSET + GOAL_DEPTH, (height/2) - (GOAL_WIDTH/2) + FIELD_OFFSET)
    topRightCorner = (width + FIELD_OFFSET, (height/2) - (GOAL_WIDTH/2) + FIELD_OFFSET)
    bottomLeftCorner = (width + FIELD_OFFSET + GOAL_DEPTH, (height/2) + (GOAL_WIDTH/2) + FIELD_OFFSET)
    bottomRightCorner = (width + FIELD_OFFSET, (height/2) + (GOAL_WIDTH/2) + FIELD_OFFSET)

    # Save corners
    fieldCorners[33] = topRightCorner
    fieldCorners[34] = bottomRightCorner

    

    return fieldCorners

if __name__ == "__main__":
    corners = generate_field_data(105, 68)
    print(corners[32])
   