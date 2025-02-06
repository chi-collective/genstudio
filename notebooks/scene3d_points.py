# %%
import genstudio.plot as Plot
import numpy as np
from genstudio.plot import js
from colorsys import hsv_to_rgb
from genstudio.scene3d import deco, PointCloud


def make_torus_knot(n_points: int):
    # Create a torus knot
    t = np.linspace(0, 4 * np.pi, n_points)
    p, q = 3, 2  # Parameters that determine knot shape
    R, r = 2, 1  # Major and minor radii

    # Torus knot parametric equations
    x = (R + r * np.cos(q * t)) * np.cos(p * t)
    y = (R + r * np.cos(q * t)) * np.sin(p * t)
    z = r * np.sin(q * t)

    # Add Gaussian noise to create volume
    noise_scale = 0.1
    x += np.random.normal(0, noise_scale, n_points)
    y += np.random.normal(0, noise_scale, n_points)
    z += np.random.normal(0, noise_scale, n_points)

    # Base color from position
    angle = np.arctan2(y, x)
    height = (z - z.min()) / (z.max() - z.min())
    radius = np.sqrt(x * x + y * y)
    radius_norm = (radius - radius.min()) / (radius.max() - radius.min())

    # Create hue that varies with angle and height
    hue = (angle / (2 * np.pi) + height) % 1.0
    # Saturation that varies with radius
    saturation = 0.8 + radius_norm * 0.2
    # Value/brightness
    value = 0.8 + np.random.uniform(0, 0.2, n_points)

    # Convert HSV to RGB - keep as float32 in [0,1] range
    colors = np.array([hsv_to_rgb(h, s, v) for h, s, v in zip(hue, saturation, value)])
    # No need to multiply by 255 or convert to uint8
    rgb = colors.reshape(-1, 3).astype(np.float32).flatten()

    # Prepare point cloud coordinates
    xyz = np.column_stack([x, y, z]).astype(np.float32).flatten()

    return xyz, rgb


def make_cube(n_points: int):
    # Create random points within a cube
    x = np.random.uniform(-1, 1, n_points)
    y = np.random.uniform(-1, 1, n_points)
    z = np.random.uniform(-1, 1, n_points)

    # Create colors based on position in cube
    # Normalize positions to 0-1 range for colors
    x_norm = (x + 1) / 2
    y_norm = (y + 1) / 2
    z_norm = (z + 1) / 2

    # Create hue that varies with position
    hue = (x_norm + y_norm + z_norm) / 3
    # Saturation varies with distance from center
    distance = np.sqrt(x * x + y * y + z * z)
    distance_norm = distance / np.sqrt(3)  # normalize by max possible distance
    saturation = 0.7 + 0.3 * distance_norm
    # Value varies with height
    value = 0.7 + 0.3 * z_norm

    # Convert HSV to RGB - keep as float32 in [0,1] range
    colors = np.array([hsv_to_rgb(h, s, v) for h, s, v in zip(hue, saturation, value)])
    rgb = colors.reshape(-1, 3).astype(np.float32).flatten()

    # Prepare point cloud coordinates
    xyz = np.column_stack([x, y, z]).astype(np.float32).flatten()

    return xyz, rgb


def make_wall(n_points: int):
    # Create points in a vertical plane (wall)
    x = np.zeros(n_points)  # All points at x=0
    y = np.random.uniform(-2, 2, n_points)
    z = np.random.uniform(-2, 2, n_points)

    # Create gradient colors based on position
    # Normalize y and z to 0-1 range for colors
    y_norm = (y + 2) / 4
    z_norm = (z + 2) / 4

    # Create hue that varies with vertical position
    hue = z_norm
    # Saturation varies with horizontal position
    saturation = 0.7 + 0.3 * y_norm
    # Value varies with a slight random component
    value = 0.7 + 0.3 * np.random.random(n_points)

    # Convert HSV to RGB - keep as float32 in [0,1] range
    colors = np.array([hsv_to_rgb(h, s, v) for h, s, v in zip(hue, saturation, value)])
    rgb = colors.reshape(-1, 3).astype(np.float32).flatten()

    # Prepare point cloud coordinates
    xyz = np.column_stack([x, y, z]).astype(np.float32).flatten()

    return xyz, rgb


def rotate_points(
    xyz: np.ndarray,
    n_frames: int = 10,
    origin: np.ndarray = np.array([0, 0, 0], dtype=np.float32),
    axis: str = "z",
) -> np.ndarray:
    """Rotate points around an axis over n_frames.

    Args:
        xyz: Flattened array of point coordinates in [x1,y1,z1,x2,y2,z2,...] format
        n_frames: Number of frames to generate
        origin: Point to rotate around, defaults to [0,0,0]
        axis: Axis to rotate around ('x', 'y' or 'z')

    Returns:
        (n_frames, N*3) array of rotated points, flattened for each frame
    """
    # Reshape flattened input to (N,3)
    xyz = xyz.reshape(-1, 3)
    input_dtype = xyz.dtype

    # Set default origin to [0,0,0]
    # if origin is None:
    #     origin = np.zeros(3, dtype=input_dtype)

    # Initialize output array with same dtype as input
    moved = np.zeros((n_frames, xyz.shape[0] * 3), dtype=input_dtype)

    # Generate rotation angles for each frame (up to but not including 360 degrees)
    angles = np.linspace(
        0, 2 * np.pi * (n_frames - 1) / n_frames, n_frames, dtype=input_dtype
    )

    # Center points around origin
    centered = xyz - origin

    # Apply rotation around specified axis
    for i in range(n_frames):
        angle = angles[i]
        rotated = centered.copy()

        if axis == "x":
            # Rotate around x-axis
            y = rotated[:, 1] * np.cos(angle) - rotated[:, 2] * np.sin(angle)
            z = rotated[:, 1] * np.sin(angle) + rotated[:, 2] * np.cos(angle)
            rotated[:, 1] = y
            rotated[:, 2] = z
        elif axis == "y":
            # Rotate around y-axis
            x = rotated[:, 0] * np.cos(angle) + rotated[:, 2] * np.sin(angle)
            z = -rotated[:, 0] * np.sin(angle) + rotated[:, 2] * np.cos(angle)
            rotated[:, 0] = x
            rotated[:, 2] = z
        else:  # z axis
            # Rotate around z-axis
            x = rotated[:, 0] * np.cos(angle) - rotated[:, 1] * np.sin(angle)
            y = rotated[:, 0] * np.sin(angle) + rotated[:, 1] * np.cos(angle)
            rotated[:, 0] = x
            rotated[:, 1] = y

        # Move back from origin and flatten
        moved[i] = (rotated + origin).flatten()

    return moved


# Camera parameters - positioned to see the spiral structure
camera = {
    "position": [7, 4, 4],
    "target": [0, 0, 0],
    "up": [0, 0, 1],
    "fov": 40,
    "near": 0.1,
    "far": 2000,
}


def scene(controlled, point_size, xyz, rgb, scale, select_region=False):
    cameraProps = (
        {"defaultCamera": camera}
        if not controlled
        else {
            "onCameraChange": js("(camera) => $state.update({'camera': camera})"),
            "camera": js("$state.camera"),
        }
    )
    return (
        PointCloud(
            positions=xyz,
            colors=rgb,
            scales=scale,
            alpha=Plot.js("$state.alpha ? 0.5 : null"),
            onHover=js("""(i) => {
                 $state.update({hovered: i})
                }"""),
            onClick=js(
                """(i) => $state.update({"selected_region_i": i})"""
                if select_region
                else """(i) => {
                $state.update({highlights: $state.highlights.includes(i) ? $state.highlights.filter(h => h !== i) : [...$state.highlights, i]});
                }"""
            ),
            decorations=[
                deco(js("$state.highlights || []"), color=[1.0, 1.0, 0.0], scale=2),
                deco(
                    js("$state.hovered ? [$state.hovered] : []"),
                    color=[0.0, 1.0, 0.0],
                    scale=2.0,
                    alpha=1.0,
                ),
            ],
            highlightColor=[1.0, 1.0, 0.0],
        )
        + cameraProps
        + {"controls": ["fps"]}
    )


def find_similar_colors(rgb, point_idx, threshold=0.1):
    """Find points with similar colors to the selected point.

    Args:
        rgb: Float32Array of RGB values in [0,1] range (flattened, so [r,g,b,r,g,b,...])
        point_idx: Index of the point to match (not the raw RGB array index)
        threshold: How close colors need to be to match (0-1 range)

    Returns:
        List of point indices that have similar colors
    """
    # Convert to numpy array and reshape to Nx3
    rgb_arr = np.array(rgb).reshape(-1, 3)

    # Get the reference color (the point we clicked)
    ref_color = rgb_arr[point_idx]

    # Calculate color differences using broadcasting
    # Values already in 0-1 range
    color_diffs = np.abs(rgb_arr - ref_color)

    # Find points where all RGB channels are within threshold
    matches = np.all(color_diffs <= threshold, axis=1)

    # Return list of matching point indices
    return np.where(matches)[0].tolist()


# Create point clouds with 50k points
NUM_POINTS = 100000
NUM_FRAMES = 30
torus_xyz, torus_rgb = make_torus_knot(NUM_POINTS)
cube_xyz, cube_rgb = make_cube(NUM_POINTS)
wall_xyz, wall_rgb = make_wall(NUM_POINTS)
torus_xyzs = rotate_points(torus_xyz, n_frames=NUM_FRAMES)
cube_xyzs = rotate_points(cube_xyz, n_frames=NUM_FRAMES)
wall_xyzs = rotate_points(wall_xyz, n_frames=NUM_FRAMES)

(
    Plot.initialState(
        {
            "camera": camera,
            "highlights": [],
            "hovered": [],
            "selected_region_i": None,
            "selected_region_indexes": [],
            "cube_xyz": cube_xyzs,
            "cube_rgb": cube_rgb,
            "torus_xyz": torus_xyzs,
            "torus_rgb": torus_rgb,
            "frame": 0,
            "alpha": False,
            "checkbox": False,
        },
        sync={"selected_region_i", "cube_rgb"},
    )
    | Plot.html(
        [
            "label",
            [
                "input",
                {
                    "type": "checkbox",
                    "checked": js("$state.alpha"),
                    "onChange": Plot.js(
                        "(e) => $state.update({alpha: e.target.checked})"
                    ),
                },
            ],
            "Show Alpha",
        ]
    )
    | Plot.Slider("frame", range=NUM_FRAMES, fps="raf")
    | scene(
        True,
        0.05,
        js("$state.torus_xyz[$state.frame]"),
        js("$state.torus_rgb"),
        np.random.uniform(0.005, 0.1, NUM_POINTS).astype(np.float32),
    )
    & scene(
        True,
        0.3,
        js("$state.torus_xyz[$state.frame]"),
        js("$state.torus_rgb"),
        np.ones(NUM_POINTS) * 0.05,
    )
    | scene(
        False,
        0.05,
        js("$state.cube_xyz[$state.frame]"),
        js("$state.cube_rgb"),
        np.ones(NUM_POINTS) * 0.025,
        True,
    )
    & scene(
        False,
        0.1,
        js("$state.cube_xyz[$state.frame]"),
        js("$state.cube_rgb"),
        np.random.uniform(0.001, 0.1, NUM_POINTS).astype(np.float32),
        True,
    )
    | Plot.onChange(
        {
            "selected_region_i": lambda w, e: w.state.update(
                {
                    "selected_region_indexes": find_similar_colors(
                        w.state.cube_rgb, e.value, 0.25
                    )
                }
            )
        }
    )
)

# %%
scene(False, 0.1, torus_xyz, torus_rgb, np.ones(NUM_POINTS) * 0.1)
# %%

(
    PointCloud(
        positions=torus_xyz,
        colors=torus_rgb,
        scales=np.ones(NUM_POINTS) * 0.005,
    )
    + {"defaultCamera": camera}
)
