import numpy as np
import math
from genstudio.scene3d import Ellipsoid, Cuboid, PointCloud

# Common parameters for all tests
offset_angle = 45  # degrees
distance = 2.0
camera_config = {"fov": 120, "near": 0.1, "far": 100}

# Base camera parameters
cam_position = np.array([0, 0, 0])  # Origin for all tests
cam_up_z = np.array([0, 0, 1])  # Up vector for tests 1 & 2
cam_up_y = np.array([0, 1, 0])  # Up vector for test 3


# Helper function to compute an object position given a distance from the camera,
# a forward vector, an offset (e.g. right, up, etc.) and an angle (in degrees).
def compute_offset_position(distance, forward, offset_dir, angle_deg):
    angle_rad = math.radians(angle_deg)
    # The position is along a vector that is (cos(angle) * forward + sin(angle) * offset_dir)
    # (both forward and offset_dir must be normalized).
    return distance * (math.cos(angle_rad) * forward + math.sin(angle_rad) * offset_dir)


# %% Test 1: Camera looking along +X axis (with up = +Z)
print("""Test 1: Looking along +X, up = +Z
         yellow (up)
green      red      blue
        purple (down)""")

# Define the camera for Test 1
cam1_target = np.array([2, 0, 0])

# Compute camera axes
forward1 = cam1_target - cam_position
forward1 = forward1 / np.linalg.norm(forward1)  # (1,0,0)
right1 = np.cross(forward1, cam_up_z)
right1 = right1 / np.linalg.norm(right1)  # (0,-1,0)
left1 = -right1  # (0, 1, 0)

# Create objects for Test 1 with adjusted positions:
red_ellipsoid_pos = cam_position + distance * forward1
x_pos_target = Ellipsoid(
    centers=red_ellipsoid_pos,
    colors=np.array([[1, 0, 0]]),  # Red
    radius=[0.2, 0.2, 0.2],
)

green_cube_pos = cam_position + compute_offset_position(
    distance, forward1, left1, offset_angle
)
y_pos_target = Cuboid(
    centers=green_cube_pos,
    colors=np.array([[0, 1, 0]]),  # Green
    size=[0.4, 0.4, 0.4],
)

blue_cube_pos = cam_position + compute_offset_position(
    distance, forward1, right1, offset_angle
)
y_neg_target = Cuboid(
    centers=blue_cube_pos,
    colors=np.array([[0, 0, 1]]),  # Blue
    size=[0.4, 0.4, 0.4],
)

yellow_points_pos = cam_position + compute_offset_position(
    distance, forward1, cam_up_z, offset_angle
)
z_pos_target = PointCloud(
    positions=yellow_points_pos,
    colors=np.array([[1, 1, 0]]),  # Yellow
    size=0.3,
)

purple_points_pos = cam_position + compute_offset_position(
    distance, forward1, -cam_up_z, offset_angle
)
z_neg_target = PointCloud(
    positions=purple_points_pos,
    colors=np.array([[1, 0, 1]]),  # Purple
    size=0.3,
)

scene1 = (x_pos_target + y_pos_target + y_neg_target + z_pos_target + z_neg_target) + {
    "defaultCamera": {
        "position": cam_position,
        "target": cam1_target,  # Looking along +X
        "up": cam_up_z,
        **camera_config,
    }
}
scene1
# %%

# %% Test 2: Camera looking along +Y axis (with up = +Z)
print("""\nTest 2: Looking along +Y, up = +Z
         yellow (up)
           green
           red (right)
        purple (down)""")

cam2_target = np.array([0, 2, 0])

forward2 = cam2_target - cam_position
forward2 = forward2 / np.linalg.norm(forward2)  # (0,1,0)
right2 = np.cross(forward2, cam_up_z)
right2 = right2 / np.linalg.norm(right2)  # (1,0,0)

# Create objects for Test 2:
# Green cube directly ahead:
green_cube_pos2 = cam_position + distance * forward2
y_pos_target_2 = Cuboid(
    centers=green_cube_pos2,
    colors=np.array([[0, 1, 0]]),  # Green
    size=[0.4, 0.4, 0.4],
)

# Red ellipsoid 45° to the right:
red_ellipsoid_pos2 = cam_position + compute_offset_position(
    distance, forward2, right2, offset_angle
)
x_pos_target_2 = Ellipsoid(
    centers=red_ellipsoid_pos2,
    colors=np.array([[1, 0, 0]]),  # Red
    radius=[0.2, 0.2, 0.2],
)

# Yellow points 45° upward (using up):
yellow_points_pos2 = cam_position + compute_offset_position(
    distance, forward2, cam_up_z, offset_angle
)
z_pos_target_2 = PointCloud(
    positions=yellow_points_pos2,
    colors=np.array([[1, 1, 0]]),  # Yellow
    size=0.3,
)

# Purple points 45° downward:
purple_points_pos2 = cam_position + compute_offset_position(
    distance, forward2, -cam_up_z, offset_angle
)
z_neg_target_2 = PointCloud(
    positions=purple_points_pos2,
    colors=np.array([[1, 0, 1]]),  # Purple
    size=0.3,
)

scene2 = (x_pos_target_2 + y_pos_target_2 + z_pos_target_2 + z_neg_target_2) + {
    "defaultCamera": {
        "position": cam_position,
        "target": cam2_target,  # Looking along +Y
        "up": cam_up_z,
        **camera_config,
    }
}
scene2
# %%

# %% Test 3: Camera looking along +Z axis (with up = +Y)
print("""\nTest 3: Looking along +Z, up = +Y
         green (up)
red      yellow
         blue (down)""")

cam3_target = np.array([0, 0, 2])

forward3 = cam3_target - cam_position
forward3 = forward3 / np.linalg.norm(forward3)  # (0,0,1)
right3 = np.cross(forward3, cam_up_y)
right3 = right3 / np.linalg.norm(right3)  # (-1,0,0)
left3 = -right3  # (1,0,0)

# Yellow points directly ahead:
yellow_points_pos3 = cam_position + distance * forward3
z_pos_target_3 = PointCloud(
    positions=yellow_points_pos3,
    colors=np.array([[1, 1, 0]]),  # Yellow
    size=0.3,
)

# Red ellipsoid 45° to the left:
red_ellipsoid_pos3 = cam_position + compute_offset_position(
    distance, forward3, left3, offset_angle
)
x_pos_target_3 = Ellipsoid(
    centers=red_ellipsoid_pos3,
    colors=np.array([[1, 0, 0]]),  # Red
    radius=[0.2, 0.2, 0.2],
)

# Green cube 45° upward:
green_cube_pos3 = cam_position + compute_offset_position(
    distance, forward3, cam_up_y, offset_angle
)
y_pos_target_3 = Cuboid(
    centers=green_cube_pos3,
    colors=np.array([[0, 1, 0]]),  # Green
    size=[0.4, 0.4, 0.4],
)

# Blue cube 45° downward:
blue_cube_pos3 = cam_position + compute_offset_position(
    distance, forward3, -cam_up_y, offset_angle
)
y_neg_target_3 = Cuboid(
    centers=blue_cube_pos3,
    colors=np.array([[0, 0, 1]]),  # Blue
    size=[0.4, 0.4, 0.4],
)

scene3 = (x_pos_target_3 + y_pos_target_3 + y_neg_target_3 + z_pos_target_3) + {
    "defaultCamera": {
        "position": cam_position,
        "target": cam3_target,  # Looking along +Z
        "up": cam_up_y,
        **camera_config,
    }
}
scene3
