# %% [markdown]
# # Scene3D Quickstart
#
# In this guide we demonstrate how to create interactive 3D scenes using GenStudio’s Scene3D components.
#
# Scene3D builds on the same data and composition paradigms as GenStudio Plot but adds support for WebGPU–powered 3D primitives.
#
# We will show how to:
#
# - Create basic 3D primitives (point clouds, ellipsoids, cuboids, etc.)
# - Combine components into a scene using the `+` operator
# - Configure camera parameters
# - Use decorations to override instance properties
#

# %%
import genstudio.scene3d as Scene3D
import numpy as np

# %% [markdown]
# ## 1. Creating a Basic 3D Scene with a Point Cloud
#
# Let’s start by creating a simple point cloud. Our point cloud takes an array of 3D coordinates and an array of colors.
#
# The `PointCloud` function accepts additional parameters like a default point size and optional per‑point settings.

# %%
# Define some 3D positions and corresponding colors.
positions = np.array(
    [
        [-0.5, -0.5, -0.5],
        [0.5, -0.5, -0.5],
        [0.5, 0.5, -0.5],
        [-0.5, 0.5, -0.5],
        [-0.5, -0.5, 0.5],
        [0.5, -0.5, 0.5],
        [0.5, 0.5, 0.5],
        [-0.5, 0.5, 0.5],
    ],
    dtype=np.float32,
)

colors = np.array(
    [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        [1, 1, 0],
        [1, 0, 1],
        [0, 1, 1],
        [1, 1, 1],
        [0.5, 0.5, 0.5],
    ],
    dtype=np.float32,
)

# Create the point cloud component.
point_cloud = Scene3D.PointCloud(
    positions=positions,
    colors=colors,
    size=0.1,  # Default size for all points
)

# %% [markdown]
# Next, we combine the point cloud with a camera configuration. The camera is specified in a properties dictionary using the key `"defaultCamera"`.

# %%
scene_pc = point_cloud + {
    "defaultCamera": {
        "position": [5, 5, 5],
        "target": [0, 0, 0],
        "up": [0, 0, 1],
        "fov": 45,
        "near": 0.1,
        "far": 100,
    }
}

scene_pc

# %% [markdown]
# ## 2. Adding Other 3D Primitives
#
# Scene3D supports multiple primitive types. For example, let’s create an ellipsoid and a cuboid.

# %%
# Create an ellipsoid component.
centers = np.array(
    [
        [0, 0, 0],
        [1.5, 0, 0],
    ],
    dtype=np.float32,
)

ellipsoid = Scene3D.Ellipsoid(
    centers=centers,
    radius=[0.5, 0.5, 0.5],  # Can be a single value or a list per instance
    colors=np.array(
        [
            [0, 1, 1],  # cyan
            [1, 0, 1],  # magenta
        ],
        dtype=np.float32,
    ),
    alphas=np.array([1.0, 0.5]),  # Opaque and semi-transparent
)

# Create a cuboid component.
cuboid = Scene3D.Cuboid(
    centers=np.array([[0, 2, 0.5]], dtype=np.float32),
    size=[1, 1, 1],
    color=[1, 0.5, 0],  # orange
    alpha=0.8,
)

# %% [markdown]
# ## 3. Combining Components into a Single Scene
#
# Use the `+` operator to overlay multiple scene components. The order of addition controls the rendering order.

# %%
(
    ellipsoid
    + cuboid
    + {
        "defaultCamera": {
            "position": [5, 5, 5],
            "target": [0, 0, 0.5],
            "up": [0, 0, 1],
            "fov": 45,
            "near": 0.1,
            "far": 100,
        }
    }
)

# %% [markdown]
# ## 4. Using Decorations to Override Instance Properties
#
# Decorations allow you to override visual properties for specific instances within a component.
#
# For example, you might want to highlight one cuboid in a set of multiple cuboids by changing its color, opacity, or scale.

# %%
# Define centers and colors for three cuboids.
cuboid_centers = np.array(
    [
        [0, 0, 0],
        [0, 0, 0.5],
        [0, 0, 1.0],
    ],
    dtype=np.float32,
)

cuboid_colors = np.array(
    [
        [0.8, 0.8, 0.8],
        [0.8, 0.8, 0.8],
        [0.8, 0.8, 0.8],
    ],
    dtype=np.float32,
)

# Create a cuboid component with a decoration on the second instance.
Scene3D.Cuboid(
    centers=cuboid_centers,
    colors=cuboid_colors,
    size=[0.8, 0.8, 0.8],
    decorations=[
        # Override instance index 1: change color to red, set opacity to 0.5, and scale up by 1.2.
        Scene3D.deco(1, color=[1.0, 0.0, 0.0], alpha=0.5, scale=1.2)
    ],
)

# %% [markdown]
# ## 5. Advanced Scene Composition
#
# You can mix multiple types of primitives into a single scene.
#
# In the example below, a point cloud, an ellipsoid, and a cuboid are layered to form a composite scene.
#
# The rendering order (and thus occlusion) is determined by the order in which components are added.

# %%
# Reuse or create new components for a composite scene.
point_cloud2 = Scene3D.PointCloud(
    positions=np.array([[0, 0, 0], [1, 1, 1]], dtype=np.float32),
    colors=np.array([[0, 0, 1], [0, 0, 1]], dtype=np.float32),
    size=0.1,
)

ellipsoid2 = Scene3D.Ellipsoid(
    centers=np.array([[0.5, 0.5, 0.5]], dtype=np.float32),
    radius=[0.5, 0.5, 0.5],
    color=[0, 1, 0],
    alpha=0.7,
)

cuboid2 = Scene3D.Cuboid(
    centers=np.array([[1, 0, 0.5]], dtype=np.float32),
    size=[1, 1, 1],
    color=[1, 0, 0],
    alpha=0.5,
)

(
    point_cloud2
    + ellipsoid2
    + cuboid2
    + {
        "defaultCamera": {
            "position": [3, 3, 3],
            "target": [0.5, 0.5, 0.5],
            "up": [0, 0, 1],
            "fov": 45,
            "near": 0.1,
            "far": 100,
        }
    }
)
