import numpy as np
from genstudio.scene3d import PointCloud, Ellipsoid, EllipsoidAxes, Cuboid, deco
import genstudio.plot as Plot
import math


def create_demo_scene():
    """Create a demo scene with examples of all element types."""
    # 1. Create a point cloud in a spiral pattern
    n_points = 1000
    t = np.linspace(0, 10 * np.pi, n_points)
    r = t / 30
    x = r * np.cos(t)
    y = r * np.sin(t)
    z = t / 10

    # Create positions array
    positions = np.column_stack([x, y, z])

    # Create rainbow colors
    hue = t / t.max()
    colors = np.zeros((n_points, 3))
    # Red component
    colors[:, 0] = np.clip(1.5 - abs(3.0 * hue - 1.5), 0, 1)
    # Green component
    colors[:, 1] = np.clip(1.5 - abs(3.0 * hue - 3.0), 0, 1)
    # Blue component
    colors[:, 2] = np.clip(1.5 - abs(3.0 * hue - 4.5), 0, 1)

    # Create varying scales for points
    sizes = 0.01 + 0.02 * np.sin(t)

    # Create the base scene with shared elements
    base_scene = (
        PointCloud(
            positions,
            colors,
            sizes,
            onHover=Plot.js("(i) => $state.update({hover_point: i})"),
            decorations=[
                {
                    "indexes": Plot.js(
                        "$state.hover_point ? [$state.hover_point] : []"
                    ),
                    "color": [1, 1, 0],
                    "scale": 1.5,
                }
            ],
        )
        +
        # Ellipsoids with one highlighted
        Ellipsoid(
            centers=np.array([[0.5, 0.5, 0.5], [-0.5, -0.5, 0.5], [0.0, 0.0, 0.0]]),
            radii=np.array([[0.1, 0.2, 0.1], [0.2, 0.1, 0.1], [0.15, 0.15, 0.15]]),
            colors=np.array([[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]]),
            decorations=[deco([1], color=[1, 1, 0], alpha=0.8)],
        )
        +
        # Ellipsoid bounds with transparency
        EllipsoidAxes(
            centers=np.array([[0.8, 0.0, 0.0], [-0.8, 0.0, 0.0]]),
            radii=np.array([[0.2, 0.1, 0.1], [0.1, 0.2, 0.1]]),
            colors=np.array([[1.0, 0.5, 0.0], [0.0, 0.5, 1.0]]),
            decorations=[deco([0, 1], alpha=0.5)],
        )
        +
        # Cuboids with one enlarged
        Cuboid(
            centers=np.array([[0.0, -0.8, 0.0], [0.0, -0.8, 0.3]]),
            sizes=np.array([[0.3, 0.1, 0.2], [0.2, 0.1, 0.2]]),
            colors=np.array([[0.8, 0.2, 0.8], [0.2, 0.8, 0.8]]),
            decorations=[deco([0], scale=1.2)],
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
                        1.5 * math.sin(0.2) * math.sin(1.0),  # x
                        1.5 * math.cos(1.0),  # y
                        1.5 * math.sin(0.2) * math.cos(1.0),  # z
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
