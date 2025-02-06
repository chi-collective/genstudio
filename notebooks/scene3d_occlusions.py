import numpy as np
from genstudio.scene3d import (
    PointCloud,
    Ellipsoid,
    EllipsoidAxes,
    Cuboid,
    deco,
    LineBeams,
)
import genstudio.plot as Plot
import math


def create_demo_scene():
    """Create a demo scene to demonstrate occlusions with point cloud intersecting other primitives."""
    # 1. Create a point cloud that passes through all shapes
    n_points = 1000
    x = np.linspace(-1.5, 1.5, n_points)  # Reduced range to match tighter spacing
    y = np.zeros(n_points)
    z = np.zeros(n_points)

    # Create positions array
    positions = np.column_stack([x, y, z])

    # Create uniform colors for visibility
    colors = np.tile([0.0, 1.0, 0.0], (n_points, 1))  # Green line

    # Create uniform scales for points
    scales = np.full(n_points, 0.02)

    # Create the base scene with shared elements
    base_scene = (
        PointCloud(
            positions,
            colors,
            scales,
            onHover=Plot.js(
                "(i) => $state.update({hover_point: typeof i === 'number' ? [i] : null})"
            ),
            decorations=[
                {
                    "indexes": Plot.js("$state.hover_point"),
                    "color": [1, 1, 0],
                    "scale": 1.5,
                }
            ],
        )
        +
        # # Add some line strips that weave through the scene
        LineBeams(
            positions=np.array(
                [
                    # X axis
                    0.0,
                    2.0,
                    0.0,
                    0,  # Start at origin, offset up
                    2.0,
                    2.0,
                    0.0,
                    0,  # Extend in X direction
                    # Y axis
                    0.0,
                    2.0,
                    0.0,
                    1,  # Start at origin again
                    0.0,
                    4.0,
                    0.0,
                    1,  # Extend in Y direction
                    # Z axis
                    0.0,
                    2.0,
                    0.0,
                    2,  # Start at origin again
                    0.0,
                    2.0,
                    2.0,
                    2,  # Extend in Z direction
                ],
                dtype=np.float32,
            ),
            color=np.array([1.0, 0.0, 0.0]),
            colors=np.array(
                [
                    [1.0, 0.0, 0.0],  # Red for X axis
                    [0.0, 1.0, 0.0],  # Green for Y axis
                    [0.0, 0.0, 1.0],  # Blue for Z axis
                ],
                dtype=np.float32,
            ),
            radius=0.02,
            onHover=Plot.js("(i) => $state.update({hover_line: i})"),
            decorations=[
                deco([0], alpha=0.5),
                deco(
                    Plot.js("$state.hover_line ? [$state.hover_line] : []"), alpha=0.2
                ),
            ],
        )
        +
        # Ellipsoids - one pair
        Ellipsoid(
            centers=np.array(
                [
                    [-1.2, 0.0, 0.0],  # First (solid)
                    [-0.8, 0.0, 0.0],  # Second (semi-transparent)
                ]
            ),
            radii=np.array(
                [
                    [0.3, 0.15, 0.2],  # Elongated in x, compressed in y
                    [0.15, 0.3, 0.2],  # Elongated in y, compressed in x
                ]
            ),
            colors=np.array(
                [
                    [1.0, 0.0, 0.0],
                    [1.0, 0.0, 0.0],
                ]
            ),
            decorations=[deco([1], alpha=0.5)],  # Make second one semi-transparent
        )
        +
        # Ellipsoid axes - one pair
        EllipsoidAxes(
            centers=np.array(
                [
                    [-0.2, 0.0, 0.0],  # First (solid)
                    [0.2, 0.0, 0.0],  # Second (semi-transparent)
                ]
            ),
            radii=np.array(
                [
                    [0.2, 0.3, 0.15],  # Non-uniform axes
                    [0.3, 0.15, 0.2],  # Different non-uniform axes
                ]
            ),
            colors=np.array(
                [
                    [0.0, 1.0, 0.0],
                    [0.0, 1.0, 0.0],
                ]
            ),
            decorations=[deco([1], alpha=0.5)],  # Make second one semi-transparent
        )
        +
        # Cuboids - one pair
        Cuboid(
            centers=np.array(
                [
                    [0.8, 0.0, 0.0],  # First (solid)
                    [1.2, 0.0, 0.0],  # Second (semi-transparent)
                ]
            ),
            sizes=np.array(
                [
                    [0.3, 0.4, 0.2],  # Non-uniform sizes
                    [0.4, 0.2, 0.3],  # Different non-uniform sizes
                ]
            ),
            colors=np.array(
                [
                    [0.0, 0.0, 1.0],
                    [0.0, 0.0, 1.0],
                ]
            ),
            decorations=[deco([1], alpha=0.5)],  # Make second one semi-transparent
        )
    )
    controlled_camera = {
        "camera": Plot.js("$state.camera"),
        "onCameraChange": Plot.js("(camera) => $state.update({camera})"),
    }

    # Create a layout with two scenes side by side
    scene = (
        (base_scene + controlled_camera & base_scene + controlled_camera)
        | base_scene
        | Plot.initialState(
            {
                "camera": {
                    "position": [
                        2.5 * math.sin(0.2) * math.sin(1.0),  # x - adjusted distance
                        2.5 * math.cos(1.0),  # y - adjusted distance
                        2.5 * math.sin(0.2) * math.cos(1.0),  # z - adjusted distance
                    ],
                    "target": [0, 0, 0],
                    "up": [0, 1, 0],
                    "fov": math.degrees(math.pi / 3),
                    "near": 0.01,
                    "far": 100.0,
                }
            }
        )
    )

    return scene


create_demo_scene()
