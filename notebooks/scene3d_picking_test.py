# %% Common imports and configuration
import numpy as np
from genstudio.scene3d import (
    Ellipsoid,
    Cuboid,
    LineBeams,
    PointCloud,
    deco,
    EllipsoidAxes,
)
from genstudio.plot import js

# Common camera parameters
DEFAULT_CAMERA = {"up": [0, 0, 1], "fov": 45, "near": 0.1, "far": 100}

# %% 1) Point Cloud Picking
print("Test 1: Point Cloud Picking.\nHover over points to highlight them in yellow.")

scene_points = PointCloud(
    positions=np.array([[-2, 0, 0], [-2, 0, 1], [-2, 1, 0], [-2, 1, 1]]),
    colors=np.array([[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1]]),
    size=0.2,
    alpha=0.7,
    onHover=js("(i) => $state.update({hover_point: typeof i === 'number' ? [i] : []})"),
    decorations=[
        deco(
            js("$state.hover_point"),
            color=[1, 1, 0],
            scale=1.5,
        ),
        deco([0], scale=4),
    ],
) + (
    {
        "defaultCamera": {
            **DEFAULT_CAMERA,
            "position": [-4, 2, 2],
            "target": [-2, 0.5, 0.5],
        }
    }
)

# 2) Ellipsoid Picking
print(
    "Test 2: Ellipsoid and Axes Picking.\nHover over ellipsoids or their axes to highlight them independently."
)

scene_ellipsoids = (
    Ellipsoid(
        centers=np.array([[0, 0, 0], [0, 1, 0], [0, 0.5, 1]]),
        colors=np.array([[1, 0, 0], [0, 1, 0], [0, 0, 1]]),
        radius=[0.4, 0.4, 0.4],
        alpha=0.7,
        onHover=js(
            "(i) => $state.update({hover_ellipsoid: typeof i === 'number' ? [i] : []})"
        ),
        decorations=[
            deco(
                js("$state.hover_ellipsoid"),
                color=[1, 1, 0],
                scale=1.2,
            ),
        ],
    )
    + Ellipsoid(
        centers=np.array([[-1, 0, 0], [-1, 1, 0], [-1, 0.5, 1]]),
        colors=np.array([[1, 0, 0], [0, 1, 0], [0, 0, 1]]),
        radius=[0.4, 0.4, 0.4],
        alpha=0.5,
        onHover=js(
            "(i) => $state.update({hover_ellipsoid_2: typeof i === 'number' ? [i] : []})"
        ),
        decorations=[
            deco(
                js("$state.hover_ellipsoid_2"),
                color=[1, 1, 0],
                scale=1.2,
            ),
        ],
    )
    + EllipsoidAxes(
        centers=np.array(
            [[1, 0, 0], [1, 1, 0], [1, 0.5, 1]]
        ),  # Offset by 1 in x direction
        radius=[0.4, 0.4, 0.4],
        alpha=0.8,
        onHover=js(
            "(i) => $state.update({hover_axes: typeof i === 'number' ? [i] : []})"
        ),
        decorations=[
            deco(
                js("$state.hover_axes"),
                color=[1, 1, 0],
            ),
        ],
    )
    + (
        {
            "defaultCamera": {
                **DEFAULT_CAMERA,
                "position": [2, 2, 2],
                "target": [
                    0.5,
                    0.5,
                    0.5,
                ],  # Adjusted target to center between ellipsoids and axes
            }
        }
    )
)

# 3) Cuboid Picking with Transparency
print(
    "Test 3: Cuboid Picking with Transparency.\nHover behavior with semi-transparent objects."
)

scene_cuboids = Cuboid(
    centers=np.array([[2, 0, 0], [2, 0, 1], [2, 0, 2]]),
    colors=np.array([[1, 0, 0], [0, 1, 0], [0, 0, 1]]),
    alphas=np.array([0.5, 0.7, 0.9]),
    size=0.8,
    onHover=js(
        "(i) => $state.update({hover_cuboid: typeof i === 'number' ? [i] : []})"
    ),
    decorations=[
        deco(
            js("$state.hover_cuboid"),
            color=[1, 1, 0],
            alpha=1.0,
            scale=1.1,
        ),
    ],
) + (
    {
        "defaultCamera": {
            **DEFAULT_CAMERA,
            "position": [4, 2, 2],
            "target": [2, 0, 0.5],
        }
    }
)

# 4) Line Beams Picking
print("Test 4: Line Beams Picking.\nHover over line segments.")

scene_beams = LineBeams(
    positions=np.array(
        [
            -2,
            -2,
            0,
            0,  # start x,y,z, dummy
            -1,
            -2,
            1,
            0,  # end x,y,z, dummy
            -1,
            -2,
            0,
            0,  # start of second beam
            -2,
            -2,
            1,
            0,  # end of second beam
        ],
        dtype=np.float32,
    ).reshape(-1),
    colors=np.array([[1, 0, 0], [0, 1, 0]]),
    size=0.1,
    alpha=0.7,
    onHover=js("(i) => $state.update({hover_beam: typeof i === 'number' ? [i] : []})"),
    decorations=[
        deco(
            js("$state.hover_beam"),
            color=[1, 1, 0],
        ),
    ],
) + (
    {
        "defaultCamera": {
            **DEFAULT_CAMERA,
            "position": [-4, -4, 2],
            "target": [-1.5, -2, 0.5],
        }
    }
)

# 5) Mixed Components Picking
print(
    "Test 5: Mixed Components Picking.\nTest picking behavior with overlapping different primitives."
)

mixed_scene = (
    Ellipsoid(
        centers=np.array([[2, -2, 0.5]]),
        colors=np.array([[1, 0, 0]]),
        radius=[0.5, 0.5, 0.5],
        onHover=js(
            "(i) => $state.update({hover_mixed_ellipsoid: typeof i === 'number' ? [i] : []})"
        ),
        decorations=[
            deco(
                js("$state.hover_mixed_ellipsoid"),
                color=[1, 1, 0],
            ),
        ],
    )
    + PointCloud(
        positions=np.array([[2, -2, 0], [2, -2, 1]]),
        colors=np.array([[0, 1, 0], [0, 0, 1]]),
        size=0.2,
        onHover=js(
            "(i) => $state.update({hover_mixed_point: typeof i === 'number' ? [i] : []})"
        ),
        decorations=[
            deco(
                js("$state.hover_mixed_point"),
                color=[1, 1, 0],
            ),
        ],
    )
    + (
        {
            "defaultCamera": {
                **DEFAULT_CAMERA,
                "position": [4, -4, 2],
                "target": [2, -2, 0.5],
            }
        }
    )
)

(scene_points & scene_beams | scene_cuboids & scene_ellipsoids | mixed_scene)

# %% 6) Generated Cuboid Grid Picking
print(
    "Test 6: Generated Cuboid Grid.\nHover over cuboids in a programmatically generated grid pattern."
)

# Generate a 4x4x2 grid of cuboids with systematic colors
x, y, z = np.meshgrid(
    np.linspace(4, 5.5, 4), np.linspace(-2, -0.5, 4), np.linspace(0, 1, 2)
)
positions = np.column_stack((x.ravel(), y.ravel(), z.ravel()))

# Generate colors based on position
colors = np.zeros((len(positions), 3))
colors[:, 0] = (positions[:, 0] - positions[:, 0].min()) / (
    positions[:, 0].max() - positions[:, 0].min()
)
colors[:, 1] = (positions[:, 1] - positions[:, 1].min()) / (
    positions[:, 1].max() - positions[:, 1].min()
)
colors[:, 2] = (positions[:, 2] - positions[:, 2].min()) / (
    positions[:, 2].max() - positions[:, 2].min()
)

scene_grid_cuboids = Cuboid(
    centers=positions,
    colors=colors,
    size=0.3,
    alpha=0.85,
    onHover=js(
        "(i) => $state.update({hover_grid_cuboid: typeof i === 'number' ? [i] : []})"
    ),
    decorations=[
        deco(
            js("$state.hover_grid_cuboid"),
            color=[1, 1, 0],
            scale=1.2,
        ),
    ],
) + (
    {
        "defaultCamera": {
            **DEFAULT_CAMERA,
            "position": [6, -4, 2],
            "target": [4.75, -1.25, 0.5],
        }
    }
)

(
    scene_points & scene_beams
    | scene_cuboids & scene_ellipsoids
    | mixed_scene & scene_grid_cuboids
)
