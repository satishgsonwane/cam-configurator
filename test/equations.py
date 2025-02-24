
import numpy as np

def get_line_equation(pt1,pt2):
    equation = np.zeros((pt1.shape[0],3))
    equation[...,0] = pt2[...,1] - pt1[...,1]
    equation[...,1] = pt1[...,0] - pt2[...,0]
    equation[...,2] = pt1[...,1]*pt2[...,0] - pt1[...,0]*pt2[...,1]
    return equation

def find_intersections(lines1, lines2):
    # Extract coefficients
    A1, B1, C1 = lines1[:, 0], lines1[:, 1], lines1[:, 2]
    A2, B2, C2 = lines2[:, 0], lines2[:, 1], lines2[:, 2]

    # Form the coefficients matrix for each pair of lines using broadcasting
    A1 = A1[:, np.newaxis]  # Shape (n, 1)
    B1 = B1[:, np.newaxis]  # Shape (n, 1)
    C1 = C1[:, np.newaxis]  # Shape (n, 1)

    A = np.stack((A1 * np.ones_like(A2), B1 * np.ones_like(B2)), axis=-1)  # Shape (n, m, 2)
    B = np.stack((A2 * np.ones_like(A1), B2 * np.ones_like(B1)), axis=-1)  # Shape (n, m, 2)

    # Combine the coefficients matrix for each pair of lines
    coef_matrix = np.stack((A, B), axis=-2)  # Shape (n, m, 2, 2)

    # Form the constants matrix for each pair of lines using broadcasting
    C = np.stack((-C1 * np.ones_like(C2), -C2 * np.ones_like(C1)), axis=-1)  # Shape (n, m, 2)

    # Solve the system of equations for each pair
    intersection_points = np.linalg.solve(coef_matrix, C)

    return intersection_points
