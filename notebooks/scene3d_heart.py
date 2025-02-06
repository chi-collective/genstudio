# %%
import genstudio.plot as Plot
import genstudio.scene3d as Scene3D
from genstudio.plot import js

# %% [markdown]
# # Interactive Heart-Shaped Particle System
#
# This example demonstrates how to create an interactive 3D particle system
# where particles form a heart shape. We'll use JavaScript to generate the
# particles dynamically based on state parameters controlled by UI elements.

# %%
# Create the scene with interactive controls
(
    Plot.initialState(
        {
            "num_particles": 500000,
            "alpha": 1.0,
            "frame": 0,
            "point_size": 0.003,
            # Pre-generate frames using JavaScript
            "frames": js(
                """
                const n = 1000000;
                const num_frames = 30;
                const frames = [];  // Use regular array to store Float32Arrays

                // Pre-compute some values to speed up generation
                const uSteps = 50;
                const vSteps = 25;
                const uStep = (2 * Math.PI) / uSteps;
                const vStep = Math.PI / vSteps;
                const jitter = 0.1;
                const scale = 0.04;

                for (let frame = 0; frame < num_frames; frame++) {
                    const t = frame * (2 * Math.PI / num_frames); // Normalize t to complete one full cycle
                    const frameData = new Float32Array(n * 3);
                    let idx = 0;

                    // Generate points more uniformly through the volume
                    for (let i = 0; i < n; i++) {
                        // Use cube rejection method to fill the heart volume
                        let x, y, z;
                        do {
                            // Generate points in parametric space with volume filling
                            const u = Math.random() * 2 * Math.PI;
                            const v = Math.random() * Math.PI;
                            const r = Math.pow(Math.random(), 1/3); // Cube root for volume filling

                            // Heart shape parametric equations with radial scaling
                            x = 16 * Math.pow(Math.sin(u), 3) * r;
                            y = (13 * Math.cos(u) - 5 * Math.cos(2*u) - 2 * Math.cos(3*u) - Math.cos(4*u)) * r;
                            z = 8 * Math.sin(v) * r;

                            // Add subtle jitter for more natural look
                            const rx = (Math.random() - 0.5) * jitter * 0.5;
                            const ry = (Math.random() - 0.5) * jitter * 0.5;
                            const rz = (Math.random() - 0.5) * jitter * 0.5;

                            // Scale and animate
                            x = (x * scale + rx) * (1 + 0.1 * Math.sin(t + u));
                            y = (y * scale + ry) * (1 + 0.1 * Math.sin(t + v));
                            z = (z * scale + rz) * (1 + 0.1 * Math.cos(t + u));

                        } while (Math.random() > 0.8); // Rejection sampling for denser core

                        frameData[idx++] = x;
                        frameData[idx++] = y;
                        frameData[idx++] = z;
                    }

                    frames.push(frameData);
                }

                return frames;
            """,
                expression=False,
            ),
            # Pre-generate colors (these don't change per frame)
            "colors": js(
                """
                const n = 1000000;
                const colors = new Float32Array(n * 3);

                for (let i = 0; i < n; i++) {
                    // Create a gradient from red to pink based on height
                    const y = i / n;
                    colors[i*3] = 1.0;  // Red
                    colors[i*3 + 1] = 0.2 + y * 0.3;  // Green
                    colors[i*3 + 2] = 0.4 + y * 0.4;  // Blue
                }

                return colors;
            """,
                expression=False,
            ),
        }
    )
    | [
        "div.flex.gap-4.mb-4",
        # Particle count slider
        [
            "label.flex.items-center.gap-2",
            "Particles: ",
            [
                "input",
                {
                    "type": "range",
                    "min": 100,
                    "max": 1000000,
                    "step": 1000,
                    "value": js("$state.num_particles"),
                    "onChange": js(
                        """(e) => $state.update({num_particles: parseInt(e.target.value)})"""
                    ),
                },
            ],
            js("$state.num_particles"),
        ],
        # Alpha control
        [
            "label.flex.items-center.gap-2",
            "Alpha: ",
            [
                "input",
                {
                    "type": "range",
                    "min": 0,
                    "max": 1,
                    "step": 0.1,
                    "value": js("$state.alpha"),
                    "onChange": js(
                        "(e) => $state.update({alpha: parseFloat(e.target.value)})"
                    ),
                },
            ],
            js("$state.alpha"),
        ],
        # Point size control
        [
            "label.flex.items-center.gap-2",
            "Point Size: ",
            [
                "input",
                {
                    "type": "range",
                    "min": 0.00015,
                    "max": 0.02,
                    "step": 0.00001,
                    "value": js("$state.point_size"),
                    "onChange": js(
                        "(e) => $state.update({point_size: parseFloat(e.target.value)})"
                    ),
                },
            ],
            js("$state.point_size"),
        ],
    ]
    | Scene3D.PointCloud(
        # Use pre-generated frames based on animation state
        positions=js(
            "$state.frames[$state.frame % 30].slice(0, $state.num_particles*3)"
        ),
        colors=js("$state.colors.slice(0, $state.num_particles* 3 )"),
        size=js("$state.point_size"),
        alpha=js("$state.alpha"),
    )
    + {
        "defaultCamera": {
            "position": [0.1, 0.1, 2],  # Adjusted position to view the heart head-on
            "target": [0, 0, 0],  # Keeping the target at the center
            "up": [0, 1, 0],  # Adjusted up vector for correct orientation
            "fov": 45,
            "near": 0.1,
            "far": 100,
        },
        "controls": ["fps"],
    }
    | Plot.Slider("frame", range=120, fps="raf")
)
