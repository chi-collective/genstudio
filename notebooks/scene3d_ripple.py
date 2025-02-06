import numpy as np
import math

import genstudio.plot as Plot
from genstudio.plot import js
from genstudio.scene3d import PointCloud, Ellipsoid, deco


# ----------------- 1) Ripple Grid (Point Cloud) -----------------
def create_ripple_grid(n_x=200, n_y=200, n_frames=30):
    """Create frames of a 2D grid of points in the XY plane with sinusoidal ripple over time.

    Returns:
        xyz_frames: shape (n_frames, n_points*3), the coordinates for each frame, flattened
        rgb: shape (n_points*3), constant color data
    """
    # 1. Create the base grid in [x, y]
    x_vals = np.linspace(-1.0, 1.0, n_x)
    y_vals = np.linspace(-1.0, 1.0, n_y)
    xx, yy = np.meshgrid(x_vals, y_vals)

    # Flatten to a list of (x,y) pairs
    n_points = n_x * n_y
    base_xy = np.column_stack([xx.flatten(), yy.flatten()])

    # 2. We'll pre-allocate an array to hold the animated frames.
    xyz_frames = np.zeros((n_frames, n_points * 3), dtype=np.float32)

    # 3. Create ripple in Z dimension. We'll do something like:
    #    z = amplitude * sin( wavefreq*(x + y) + time*speed )
    #    You can adjust amplitude, wavefreq, speed as desired.
    amplitude = 0.2
    wavefreq = 4.0
    speed = 2.0

    # 4. Generate each frame
    for frame_i in range(n_frames):
        t = frame_i / float(n_frames) * 2.0 * math.pi * speed
        # Calculate the z for each point
        z_vals = amplitude * np.sin(wavefreq * (base_xy[:, 0] + base_xy[:, 1]) + t)
        # Combine x, y, z
        frame_xyz = np.column_stack([base_xy[:, 0], base_xy[:, 1], z_vals])
        # Flatten to shape (n_points*3,)
        xyz_frames[frame_i] = frame_xyz.flatten()

    # 5. Assign colors. Here we do a simple grayscale or you can do something fancy.
    #    We'll map (x,y) to a color range for fun.
    #    Convert positions to 0..1 range for the color mapping
    #    We'll just do a simple gradient color based on x,y for demonstration.
    x_norm = (base_xy[:, 0] + 1) / 2
    y_norm = (base_xy[:, 1] + 1) / 2
    # Let's make a color scheme that transitions from green->blue with x,y
    # R = x, G = y, B = 1 - x
    # or do whatever you like
    r = x_norm
    g = y_norm
    b = 1.0 - x_norm
    rgb = np.column_stack([r, g, b]).astype(np.float32).flatten()

    return xyz_frames, rgb


# ----------------- 2) Morphing Ellipsoids -----------------
def create_morphing_ellipsoids(
    n_ellipsoids=300, n_frames=60
):  # More frames for smoother motion
    """
    Generate per-frame positions/radii for a segmented insect-like creature.
    Each ellipsoid represents one body segment that follows the segment in front of it,
    like train cars following a track. The creature moves in a curved path,
    like a snake chasing but never catching its tail.

    Returns:
        centers_frames: shape (n_frames, n_ellipsoids, 3)
        radii_frames:   shape (n_frames, n_ellipsoids, 3)
        colors:         shape (n_ellipsoids, 3)
    """
    # Each ellipsoid is a body segment
    n_segments = n_ellipsoids

    # Create colors for the segments - dark insect-like coloring
    colors = np.zeros((n_segments, 3), dtype=np.float32)
    t = np.linspace(0, 1, n_segments)
    colors[:] = np.column_stack([0.2 + 0.1 * t, 0.2 + 0.05 * t, 0.1 + 0.05 * t])

    centers_frames = np.zeros((n_frames, n_segments, 3), dtype=np.float32)
    radii_frames = np.zeros((n_frames, n_segments, 3), dtype=np.float32)

    # Path parameters
    path_radius = 3.0  # Size of spiral path
    bump_height = 0.3  # How high the bumps go
    bump_freq = 3.0  # Frequency of bumps

    # Total angle the worm spans (120 degrees = 1/3 of circle)
    total_angle = math.pi * 2 / 3
    # Angle between segments stays constant regardless of n_segments
    segment_spacing = total_angle / (n_segments - 1)

    for frame_i in range(n_frames):
        t = 2.0 * math.pi * frame_i / float(n_frames)

        # For each segment
        for i in range(n_segments):
            # Each segment follows the same path but spaced by fixed angle
            segment_t = t - (i * segment_spacing)

            # Circular path
            x = path_radius * math.cos(segment_t)
            y = path_radius * math.sin(segment_t)

            # Add bumpy height variation
            z = bump_height * math.sin(segment_t * bump_freq)

            centers_frames[frame_i, i] = [x, y, z]

            # Size varies slightly along body
            body_taper = 1.0 - 0.3 * (i / n_segments)  # Taper towards tail
            base_size = 0.3 * body_taper

            # Segments are elongated horizontally
            radii_frames[frame_i, i] = [
                base_size * 1.2,  # length
                base_size * 0.8,  # width
                base_size * 0.7,  # height
            ]

    return centers_frames, radii_frames, colors


# ----------------- Putting it all together in a Plot -----------------
def create_ripple_and_morph_scene():
    """
    Create a scene with:
      1) A ripple grid of points
      2) Three vehicle-like convoys navigating a virtual city

    Returns a Plot layout.
    """
    # 1. Generate data for the ripple grid
    n_frames = 120  # More frames for slower motion
    grid_xyz_frames, grid_rgb = create_ripple_grid(n_frames=n_frames)

    # 2. Generate data for morphing ellipsoids
    ellipsoid_centers, ellipsoid_radii, ellipsoid_colors = create_morphing_ellipsoids(
        n_frames=n_frames
    )

    # We'll set up a default camera that can see everything nicely
    camera = {
        "position": [8.0, 8.0, 6.0],  # Moved further back and up for better overview
        "target": [0, 0, 0],
        "up": [0, 0, 1],
        "fov": 35,  # Narrower FOV for less perspective distortion
        "near": 0.1,
        "far": 100.0,
    }

    # 3. Create the Scenes
    # Note: we can define separate scenes or combine them into a single scene
    #       by simply adding the geometry. Here, let's show them side-by-side.

    # First scene: the ripple grid
    scene_grid = PointCloud(
        positions=js("$state.grid_xyz[$state.frame]"),
        colors=js("$state.grid_rgb"),
        size=0.01,  # each point scale
        onHover=js("(i) => $state.update({hover_point: i})"),
        decorations=[
            deco(
                js("$state.hover_point ? [$state.hover_point] : []"),
                color=[1, 1, 0],
                scale=1.5,
            ),
        ],
    ) + {
        "onCameraChange": js("(cam) => $state.update({camera: cam})"),
        "camera": js("$state.camera"),
        "controls": ["fps"],
    }

    # Second scene: the morphing ellipsoids with opacity decorations
    scene_ellipsoids = Ellipsoid(
        centers=js("$state.ellipsoid_centers[$state.frame]"),
        radii=js("$state.ellipsoid_radii[$state.frame]"),
        colors=js("$state.ellipsoid_colors"),
        decorations=[
            # Vary opacity based on position in snake
            deco(list(range(30)), alpha=0.7),  # First snake more transparent
            deco(list(range(30, 60)), alpha=0.9),  # Second snake more solid
            deco(list(range(60, 90)), alpha=0.9),  # Third snake more solid
            # Add some highlights
            deco(
                [0, 30], color=[1, 1, 0], alpha=0.8, scale=1.2
            ),  # Highlight lead ellipsoids
            deco(
                [30, 60], color=[1, 1, 0], alpha=0.8, scale=1.2
            ),  # Highlight lead ellipsoids
            deco(
                [60, 90], color=[1, 1, 0], alpha=0.8, scale=1.2
            ),  # Highlight lead ellipsoids
        ],
    ) + {
        "onCameraChange": js("(cam) => $state.update({camera: cam})"),
        "camera": js("$state.camera"),
        "controls": ["fps"],
    }

    layout = (
        Plot.initialState(
            {
                "camera": camera,
                "frame": 0,  # current frame in the animation
                "grid_xyz": grid_xyz_frames,
                "grid_rgb": grid_rgb,
                "ellipsoid_centers": ellipsoid_centers.reshape(
                    n_frames, -1
                ),  # Flatten to (n_frames, n_ellipsoids*3)
                "ellipsoid_radii": ellipsoid_radii.reshape(
                    n_frames, -1
                ),  # Flatten to (n_frames, n_ellipsoids*3)
                "ellipsoid_colors": ellipsoid_colors.flatten(),  # Flatten to (n_ellipsoids*3,)
                "hover_point": None,
            }
        )
        | Plot.Slider("frame", range=n_frames, fps="raf")
        | (scene_grid & scene_ellipsoids)
    )

    return layout


# Call create_ripple_and_morph_scene to get the final layout
create_ripple_and_morph_scene()
