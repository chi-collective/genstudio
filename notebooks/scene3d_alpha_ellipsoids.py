import numpy as np
from genstudio.scene3d import Ellipsoid, Cuboid
import genstudio.plot as Plot
import math
from genstudio.plot import js


def generate_cluster_centers(n_clusters, bounds=(-3, 3)):
    """Generate random cluster center positions."""
    return np.random.uniform(low=bounds[0], high=bounds[1], size=(n_clusters, 3))


def generate_cluster_positions(center, n_items, spread=0.5):
    """Generate gaussian-distributed positions around a center."""
    return np.random.normal(loc=center, scale=spread, size=(n_items, 3))


def generate_cluster_colors(n_items, base_color=None, variation=0.1):
    """Generate colors for a cluster with variation around a base color."""
    if base_color is None:
        base_color = np.random.random(3).astype(np.float32)
    return np.clip(
        np.random.normal(loc=base_color, scale=variation, size=(n_items, 3)),
        0,
        1,
    ).astype(np.float32)


def calculate_distance_based_values(
    positions, center, alpha_range=(0.01, 0.8), scale_range=(0.3, 1.0)
):
    """Calculate alpha and scale values based on distance from center."""
    distances = np.linalg.norm(positions - center, axis=1)
    alphas = np.clip(1.0 - distances / 2, alpha_range[0], alpha_range[1])
    scales = np.clip(1.0 - distances / 3, scale_range[0], scale_range[1])
    return alphas, scales


def get_default_camera():
    """Return default camera settings."""
    return {
        "camera": {
            "position": [8, 8, 8],
            "target": [0, 0, 0],
            "up": [0, 1, 0],
            "fov": math.degrees(math.pi / 3),
            "near": 0.01,
            "far": 100.0,
        }
    }


def create_gaussian_ellipsoids_scene():
    """Create a scene with clusters of gaussian-distributed ellipsoids."""
    n_clusters = 15
    n_ellipsoids_per_cluster = 30

    cluster_centers = generate_cluster_centers(n_clusters)

    centers = []
    colors = []
    alphas = []
    radii = []

    for center in cluster_centers:
        positions = generate_cluster_positions(center, n_ellipsoids_per_cluster)
        centers.extend(positions)

        cluster_colors = generate_cluster_colors(n_ellipsoids_per_cluster)
        colors.extend(cluster_colors)

        cluster_alphas, scales = calculate_distance_based_values(positions, center)
        alphas.extend(cluster_alphas)

        base_radius = np.random.uniform(0.1, 0.2)
        cluster_radii = np.array(
            [[base_radius, base_radius, base_radius]] * n_ellipsoids_per_cluster
        )
        cluster_radii *= scales[:, np.newaxis]
        radii.extend(cluster_radii)

    return Ellipsoid(
        centers=np.array(centers),
        radii=np.array(radii),
        colors=np.array(colors),
        alphas=np.array(alphas),
    ) | Plot.initialState(get_default_camera())


def create_gaussian_cuboids_scene():
    """Create a scene with clusters of gaussian-distributed cuboids."""
    n_clusters = 12
    n_cuboids_per_cluster = 25

    cluster_centers = generate_cluster_centers(n_clusters)

    centers = []
    colors = []
    alphas = []
    sizes = []
    rotations = []

    for center in cluster_centers:
        positions = generate_cluster_positions(
            center, n_cuboids_per_cluster, spread=0.6
        )
        centers.extend(positions)

        cluster_colors = generate_cluster_colors(n_cuboids_per_cluster)
        colors.extend(cluster_colors)

        cluster_alphas, scales = calculate_distance_based_values(
            positions, center, alpha_range=(0.15, 0.85), scale_range=(0.4, 1.0)
        )
        alphas.extend(cluster_alphas)

        # Random base size for this cluster
        base_size = np.random.uniform(0.15, 0.25)
        cluster_sizes = np.array(
            [[base_size, base_size, base_size]] * n_cuboids_per_cluster
        )
        cluster_sizes *= scales[:, np.newaxis]
        sizes.extend(cluster_sizes)

        # Random rotations for each cuboid
        cluster_rotations = np.random.uniform(
            0, 2 * np.pi, size=(n_cuboids_per_cluster, 3)
        )
        rotations.extend(cluster_rotations)

    return Cuboid(
        centers=np.array(centers),
        sizes=np.array(sizes),
        colors=np.array(colors),
        alphas=np.array(alphas),
        rotations=np.array(rotations),
    ) | Plot.initialState(get_default_camera())


# Create and display both scenes
ellipsoid_scene = create_gaussian_ellipsoids_scene()
cuboid_scene = create_gaussian_cuboids_scene()

# Display ellipsoid scene
ellipsoid_scene

# Display cuboid scene
cuboid_scene


def create_animated_clusters_scene(
    n_frames=60, n_clusters=15, n_ellipsoids_per_cluster=1000
):
    """Create an animated scene where cluster centers stay fixed but members regenerate each frame.

    Returns a Plot layout with animation controls.
    """
    # Fixed cluster centers that won't change between frames
    cluster_centers = generate_cluster_centers(n_clusters)

    # Generate one fixed random color per cluster
    cluster_fixed_colors = generate_cluster_colors(n_clusters)

    # Pre-generate all frame data
    centers_frames = []
    colors_frames = []
    alphas_frames = []
    radii_frames = []

    for frame in range(n_frames):
        frame_centers = []
        frame_colors = []
        frame_alphas = []
        frame_radii = []

        # Generate new random positions/properties for each cluster
        for cluster_idx, center in enumerate(cluster_centers):
            positions = generate_cluster_positions(
                center, n_ellipsoids_per_cluster, spread=0.6
            )
            frame_centers.extend(positions)

            # Use the fixed color for this cluster
            cluster_colors = np.tile(
                cluster_fixed_colors[cluster_idx], (n_ellipsoids_per_cluster, 1)
            )
            frame_colors.extend(cluster_colors)

            cluster_alphas, scales = calculate_distance_based_values(
                positions, center, alpha_range=(0.15, 0.85), scale_range=(0.4, 1.0)
            )
            frame_alphas.extend(cluster_alphas)

            base_radius = np.random.uniform(0.15, 0.25)
            cluster_radii = np.array(
                [[base_radius, base_radius, base_radius]] * n_ellipsoids_per_cluster
            )
            cluster_radii *= scales[:, np.newaxis]
            frame_radii.extend(cluster_radii)

        # Store arrays for this frame - reshape to match expected format and ensure float32
        centers_frames.append(np.array(frame_centers, dtype=np.float32).flatten())
        colors_frames.append(np.array(frame_colors, dtype=np.float32).flatten())
        alphas_frames.append(np.array(frame_alphas, dtype=np.float32).flatten())
        radii_frames.append(np.array(frame_radii, dtype=np.float32).flatten())

    # Create the animated scene
    scene = (
        Ellipsoid(
            centers=js("$state.centers[$state.frame]"),
            colors=js("$state.colors[$state.frame]"),
            alphas=js("$state.alphas[$state.frame]"),
            radii=js("$state.radii[$state.frame]"),
        )
        + {"controls": ["fps"]}
        | Plot.Slider("frame", 0, range=n_frames, fps="raf")
        | Plot.initialState(
            {
                "frame": 0,
                "centers": centers_frames,
                "colors": colors_frames,
                "alphas": alphas_frames,
                "radii": radii_frames,
                "camera": get_default_camera(),
            }
        )
    )

    return scene


# Display animated clusters scene
animated_scene = create_animated_clusters_scene()
animated_scene

# %% Test transparency sorting with overlapping ellipsoids
print("Testing transparency sorting with overlapping ellipsoids...")

test_scene = Ellipsoid(
    centers=np.array(
        [
            [0, 0, 0],  # Back ellipsoid
            [0, 0, 0.5],  # Middle ellipsoid
            [0, 0, 1.0],  # Front ellipsoid
        ]
    ),
    colors=np.array(
        [
            [0, 1, 0],  # Green for all
            [0, 1, 0],
            [0, 1, 0],
        ]
    ),
    alphas=np.array([0.9, 0.5, 0.2]),  # High to low alpha from back to front
    radius=[0.5, 0.5, 0.5],  # Same size for all
) + (
    {
        "defaultCamera": {
            "position": [2, 2, 2],
            "target": [0, 0, 0.5],  # Center the view on middle of ellipsoids
            "up": [0, 0, 1],
            "fov": 45,
            "near": 0.1,
            "far": 100,
        }
    }
)

test_scene
