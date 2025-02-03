# %% Common imports and configuration
import numpy as np
from genstudio.scene3d import Ellipsoid, Cuboid, LineBeams, PointCloud, deco
from genstudio.plot import js

# Common camera parameters
DEFAULT_CAMERA = {"up": [0, 0, 1], "fov": 45, "near": 0.1, "far": 100}

# %% 1) Point Cloud Picking
print("Test 1: Point Cloud Picking.\nHover over points to highlight them in yellow.")

scene_points = PointCloud(
    positions=np.array([[-2, 0, 0], [-2, 0, 1], [-2, 1, 0], [-2, 1, 1]]),
    colors=np.array([[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1]]),
    size=0.2,
    onHover=js("(i) => $state.update({hover_point: typeof i === 'number' ? [i] : []})"),
    decorations=[
        deco(
            js("$state.hover_point"),
            color=[1, 1, 0],
            scale=1.5,
        ),
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
print("Test 2: Ellipsoid Picking.\nHover over ellipsoids to highlight them.")

scene_ellipsoids = Ellipsoid(
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
) + (
    {
        "defaultCamera": {
            **DEFAULT_CAMERA,
            "position": [2, 2, 2],
            "target": [0, 0.5, 0.5],
        }
    }
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
        "(i) => $state.update({hover_cuboid: typeof i === 'number' ? [i+1] : []})"
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
# %%
