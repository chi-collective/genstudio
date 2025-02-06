# %% [markdown]
# # GenStudio LLM Interaction Guide
#
# ## Library Context
# GenStudio is a visualization library built for interactive data visualization in python using a declarative API. It features a flexible layout system and transparently exposes Observable Plot. It offers state management between python and the javascript view environment.
#
# Layout components (Row, Column, Grid) allow flexible arrangement of elements and can be composed using & (Row) and | (Column) operators. HTML (via React) can be created using "hiccup in python", and tailwind css classes are supported.
#
# There is a "state" api across both Python and JavaScript. In Python one sets initial state by including `Plot.initialState({key: value})` as a layout item (can be anywhere), and `Plot.onChange({key: callback})` to invoke functions when state changes. These onChange Callbacks receive (widget, event) arguments where event contains `"value"`. In Python one reads state via `widget.key`, resets via `widget.key = foo`, set multiple values via `widget.update({key: value})` or pass `widget.update` any number of `[key, operation, payload]` lists where operation can be "append", "concat", "setAt", or "reset". In JavaScript one reads state via `$state.key`, write via `$state.key = foo`, and updates via `$state.update({key: value})` or pass $state.update any number of operations as in python, eg. `$state.update(["foo", "append", 1], ["bar", "concat", [1, 2]], ["baz", "setAt", [index, value]])`.
#
# The `Plot.Slider` component not only shows a slider but can also cycle a state variable through a range of values at a specified fps, eg. `Plot.Slider(key, init, [0, 10], fps=3)` will cycle `key` from 0-10 inclusive starting at `init`. `fps="ref"` is also valid and uses requestAnimationFrame instead of a numeric interval. Range can be list of two values, `[from, until]` (inclusive), to be traversed by `step`. Or a single value `n` which becomes `[from, n-1]`, aligned with python's range(n). Thus if one wants to show a series of 'frames' one can do `Plot.Slider("frame", range=len(frames))` to cycle through all the valid indexes of `frames`.
# <examples>
# %%
# <example>
# User: Make a clickable yellow box that shows how many times it has been clicked.
# Assistant:
import genstudio.plot as Plot
from genstudio.plot import js

(
    Plot.initialState({"clicks": 0})
    | [
        "div",
        {
            "class": "bg-yellow-200 p-4",
            "onClick": Plot.js("(e) => $state.clicks = ($state.clicks || 0) + 1"),
        },
        Plot.js("`Clicked ${$state.clicks} times`"),
    ]
)
# </example>
# %%
# <example>
# User: Show an empty scatter plot. Let the user add points by clicking.
# Assistant:
import genstudio.plot as Plot

(
    Plot.initialState({"points": []})
    | Plot.dot((js("$state.points")))
    + Plot.events(
        {"onClick": js("(e) => $state.update(['points', 'append', [e.x, e.y]])")}
    )
    # explicitly set a domain to make 'space' for clicking
    + Plot.domain([0, 1])
)
# User: Great. Can you let me drag them around?
# Assistant:
import genstudio.plot as Plot

(
    Plot.initialState({"points": []})
    | Plot.dot(
        (Plot.js("$state.points")),
        r=10,  # larger, easier to drag
        render=Plot.renderChildEvents(
            {
                "onDrag": Plot.js(
                    """ (e) => {
                $state.update(["points", "setAt", [e.index, [e.x, e.y]]])
               }"""
                )
            }
        ),
    )
    + Plot.events(
        {"onClick": js("(e) => $state.update(['points', 'append', [e.x, e.y]])")}
    )
    + Plot.domain([0, 1])
)
# </example>
# %%
# <example>
# User: Show a scatter plot of points in a stair-like pattern next to Gauss's law in LaTeX. Add pastel background colors.
# Assistant:
import genstudio.plot as Plot
import numpy as np

x = np.arange(10) / 10
points = np.c_[
    x, x + (np.arange(10) % 3) / 10
]  # Creates stair-like pattern by adding 0, 0.1, 0.2 cyclically

plot1 = Plot.dot(points) + {"className": "bg-green-100"}
plot2 = Plot.md(
    r"""
$$\oint_{\partial \Omega} \mathbf{E} \cdot d\mathbf{S} = \frac{1}{\epsilon_0} \int_\Omega \rho \, dV$$
""",
    className="bg-yellow-100 p-3 flex items-center",
)

plot1 & plot2
# </example>
# %%
# <example>
# User: Show a green square connected to a blue circle using a thick red line. Show a legend. Build up the plot from small/composable parts.
# Assistant:
import genstudio.plot as Plot

# we'll specify colors using Plot.constantly and Plot.colorMap
# (if we use literal color values they won't show up in the legend)
square_plot = Plot.rect(
    [[0, 0.5, 0.5, 1]],
    x1="0",
    y1="1",
    x2="2",
    y2="3",
    # "Square" is the name of the color that will show up in the legend,
    # and is what we must specify in Plot.colorMap
    fill=Plot.constantly("Square"),
)

ellipse_plot = Plot.ellipse([[1, 0.5, 0.25]], fill=Plot.constantly("Circle"))

line_plot = Plot.line(
    [[0.25, 0.75], [1, 0.5]], strokeWidth=10, stroke=Plot.constantly("Line")
)

(
    square_plot
    + ellipse_plot
    + line_plot
    + Plot.colorMap({"Square": "green", "Circle": "blue", "Line": "red"})
    + Plot.colorLegend()
    + Plot.domain(x=[0, 1.5], y=[0, 1])
    + Plot.aspectRatio(1)  # necessary for square + circle to render proportionally
)
# </example>
# %%
# <example>
# User: Create an animated pixel display showing circular waves
# Assistant:
import genstudio.plot as Plot
import numpy as np
from genstudio.plot import js


def generate_pixels(width=100, height=100, num_frames=60):
    x, y = np.meshgrid(np.linspace(-4, 4, width), np.linspace(-4, 4, height))
    t = np.linspace(0, 2 * np.pi, num_frames)[:, None, None]
    r = np.sqrt(x**2 + y**2)

    intensity = np.sin(r - t) * 255  # Radial wave pattern

    # Stack 3 color channels (R,G,B) with phase shifts of 0, 2π/3, and 4π/3
    # Shape: [num_frames, height, width, 3]
    rgb = np.stack(
        [
            np.clip(intensity * np.sin(t + phase), 0, 255)
            for phase in [0, 2 * np.pi / 3, 4 * np.pi / 3]
        ],
        axis=-1,
    )

    # Reshape to [num_frames, width*height*3] for Plot.pixels
    # Each frame becomes a flat array of [R,G,B, R,G,B, ...] values
    return rgb.reshape(num_frames, -1).astype(np.uint8)


width = 50
height = 50
data = generate_pixels(width=width, height=height, num_frames=60)

(
    Plot.initialState(
        {"pixels": data, "width": width, "height": height, "frame": 0, "fps": 30}
    )
    | Plot.pixels(
        # reads the current frame from our generated pixels
        js("$state.pixels[$state.frame]"),
        imageWidth=js("$state.width"),
        imageHeight=js("$state.height"),
    )
    | Plot.Slider(
        "frame",
        rangeFrom=js("$state.pixels"),
        # could also show "slider" if desired
        controls=["play", "fps"],
        fps="raf",  # can also use a numeric value
    )
)

# </example>
# %%
# <example>
# User: Create an alphabet slideshow (controlled by click)
# Assistant:
import genstudio.plot as Plot
from genstudio.plot import js

(
    Plot.initialState({"frame": 0, "letters": "ABCDEFGHIJKLMNOPQRSTUVWXYZ"})
    | [
        "div.flex.items-center.justify-center.font-bold.select-none",
        {
            "onClick": js(
                """(e) => {
          e.preventDefault();
          const midPoint = e.currentTarget.offsetWidth / 2;
          if (e.clientX < midPoint) {
            // Click on left side - go back
            $state.frame = (prevValue) => prevValue === 0 ? $state.letters.length - 1 : prevValue - 1;
          } else {
            // Click on right side - go forward
            $state.frame = (prevValue) => prevValue === $state.letters.length - 1 ? 0 : prevValue + 1;
          }
          }"""
            )
        },
        ["div.text-[120px]", js("$state.letters[$state.frame]")],
        [
            "div.text-xl.absolute.left-0.top-0.bottom-0.right-[50%].flex.justify-start.items-center.p-2.opacity-0.hover:opacity-50",
            "←",
        ],
        [
            "div.text-xl.absolute.left-[50%].top-0.bottom-0.right-0.flex.justify-end.items-center.p-2.opacity-0.hover:opacity-50",
            "→",
        ],
    ]
)
# </example>
# %%
# <example>
# User: Create a simple live code editor that evaluates Python expressions
# Assistant:
import genstudio.plot as Plot
from genstudio.plot import js
import io
import sys

initial_source = """x = 42
y = [1, 2, 3]
print(f"x={x}, y={y}")"""


def with_out_str(fn):
    """evaluates fn and returns retval, stdout"""
    stdout = io.StringIO()
    sys.stdout = stdout
    try:
        value = fn()
    finally:
        out = stdout.getvalue()
        sys.stdout = sys.__stdout__
    return value, out


def evaluate(widget, _e):
    try:
        # Execute code and capture stdout
        _, out = with_out_str(lambda: exec(widget.state.toEval))

        # Update state with output if any, otherwise show "No output"
        widget.state.update({"result": out if out else "No output"})
    except Exception as e:
        widget.state.update({"result": f"Error: {str(e)}"})


(
    Plot.initialState({"result": "", "toEval": "", "source": initial_source})
    | Plot.onChange({"toEval": evaluate})
    | Plot.html(
        [
            "form.!flex.flex-col.gap-3",
            {
                "onSubmit": js(
                    "e => { e.preventDefault(); $state.toEval = $state.source}"
                )
            },
            [
                "div.bg-gray-100.p-4.rounded",
                js("$state.result || 'Result will appear here'"),
            ],
            [
                "textarea.whitespace-pre-wrap.text-[13px].p-3.rounded-md.bg-gray-100.h-[100px].font-mono",
                {
                    "onChange": js("(e) => $state.source = e.target.value"),
                    "value": js("$state.source"),
                    "onKeyDown": js(
                        "(e) => { if (e.ctrlKey && e.key === 'Enter') { e.stopPropagation(); $state.toEval = $state.source } }"
                    ),
                },
            ],
            [
                "div.flex.items-stretch.gap-2",
                [
                    "button.flex-auto.!bg-blue-500.!hover:bg-blue-600.text-white.text-center.px-4.py-2.rounded-md.cursor-pointer",
                    {"type": "submit"},
                    "Evaluate (Ctrl+Enter)",
                ],
                [
                    "button.px-4.py-2.border.rounded-md",
                    {
                        "onClick": js(
                            "() => $state.source = `"
                            + initial_source.replace("`", "\\`")
                            + "`"
                        )
                    },
                    "Reset",
                ],
            ],
        ]
    )
)
# </example>
# %%
# <example>
# <given-user-file-context>

# List of ancient civilizations with their temporal and geographic data
# Each dict has: name (str), start/end years (int), continent (str), peak_population (int)
from docs.examples.data import civilizations

# </given-user-file-context>
# User: Create a timeline visualization of the ancient civilizations I've defined above.
# Assistant:
import genstudio.plot as Plot

(
    Plot.barX(
        civilizations,
        {
            "x1": "start",
            "x2": "end",
            "y": "name",
            "fill": "continent",
            "sort": {"y": "x1"},
        },
    )
    + Plot.text(
        civilizations,
        {"text": "name", "x": "start", "y": "name", "textAnchor": "end", "dx": -3},
    )
    + {"axis": None, "marginLeft": 100}
    + Plot.colorLegend()
)
# </example>
# %%
# <example>
# User: What kinds of plots can I create with GenStudio? Please show me some examples.
# Assistant:
import genstudio.plot as Plot
import numpy as np

# Generate some sample data
x = np.linspace(0, 10, 100)
y = np.sin(x)
points = np.column_stack([x, y])
categories = ["A", "B", "C", "D"]
values = [23, 45, 12, 78]
cat_data = [{"category": c, "value": v} for c, v in zip(categories, values)]

# Create a grid of common plot types
(
    Plot.initialState({"title": "Common Plot Types"})
    | Plot.Grid(
        # Line plot
        Plot.line(points) + Plot.title("Line"),
        # Scatter plot
        Plot.dot(points) + Plot.title("Scatter"),
        # Area plot
        Plot.area(points) + Plot.title("Area"),
        # Bar chart
        Plot.barY(cat_data, x="category", y="value") + Plot.title("Bar"),
        # Histogram
        Plot.rectY(np.random.random(1000), Plot.binX({"y": "count"}))
        + Plot.title("Histogram"),
        # Box plot
        Plot.boxY(
            [{"group": "A", "value": v} for v in np.random.normal(0, 1, 100)]
            + [{"group": "B", "value": v} for v in np.random.normal(2, 0.5, 100)],
            x="group",
            y="value",
        )
        + Plot.title("Box"),
        # Heatmap
        Plot.rect(
            [
                [i, j, np.sin(i / 5) * np.cos(j / 5)]
                for i in range(20)
                for j in range(20)
            ],
            x="0",
            y="1",
            fill="2",
        )
        + Plot.title("Heatmap"),
        # Bubble plot
        Plot.dot(
            [
                [np.random.random(), np.random.random(), np.random.random() * 30]
                for _ in range(50)
            ],
            x="0",
            y="1",
            r="2",
        )
        + Plot.title("Bubble"),
        cols=3,
    )
    | Plot.md(
        """
GenStudio provides access to the full Observable Plot API, which includes many plot types:

- Basic: line, dot (scatter), area, rect
- Statistical: histogram, box, bin, density
- Categorical: bar, group, stack
- Specialized: hexbin, contour, arrow, link, vector
- And more: text, rule, frame, image, delaunay, voronoi

Each plot can be customized with various options for color, size, labels, etc.
See the [Observable Plot API documentation](https://observablehq.com/@observablehq/plot-api-reference)
for the complete reference.

Plots can be composed using:
- `+` operator to layer marks
- `&` operator to arrange horizontally
- `|` operator to arrange vertically
- `Plot.Grid()` for grid layouts

Interactive features include:
- Tooltips and hover effects
- Pan and zoom
- Click and drag selection
- Animation and transitions
- State management between Python and JavaScript
"""
    )
)
# </example>
# %%
# <example>
# <given-user-file-context>

# List of scientific discoveries with fields:
# year (int): publication year
# acceptance_delay (int): years until widespread acceptance
# scientist (str): discoverer name(s)
# discovery (str): name of discovery
# description (str): detailed explanation
from docs.examples.data import discoveries

# </given-user-file-context>
# User: Could you help me plot this dataset, showing a timeline of when each discovery was published and the period until it gained widespread acceptance? Include tooltips with the detailed descriptions.
# Assistant:
import genstudio.plot as Plot

(
    Plot.initialState({"discoveries": discoveries})
    |
    # Background grid
    Plot.gridX(tickSpacing=50)
    +
    # Timeline bars showing acceptance period
    Plot.rect(
        Plot.js("$state.discoveries"),
        {
            "x1": "year",
            "x2": Plot.js("d => d.year + d.acceptance_delay"),
            "y": "discovery",
            "height": 15,
            "fill": "steelblue",
            "fillOpacity": 0.3,
            "title": Plot.js(
                "d => `${d.discovery}\nPublished: ${d.year}\nFully accepted: ${d.year + d.acceptance_delay}`"
            ),
        },
    )
    +
    # Publication points
    Plot.dot(
        Plot.js("$state.discoveries"),
        {"x": "year", "y": "discovery", "r": 6, "fill": "steelblue"},
    )
    +
    # Discovery labels
    Plot.text(
        Plot.js("$state.discoveries"),
        {
            "x": "year",
            "y": "discovery",
            "text": "discovery",
            "dx": -10,
            "textAnchor": "end",
            "fontSize": 12,
        },
    )
    +
    # Tooltips with detailed information
    Plot.tip(
        Plot.js("$state.discoveries"),
        Plot.pointer(
            {
                "x": "year",
                "y": "discovery",
                "title": Plot.js(
                    "d => `${d.discovery} (${d.year})\n\n${d.description}`"
                ),
            }
        ),
    )
    + Plot.hideAxis(y=True)
    + Plot.margin(30, 0, 60, 100)
    | Plot.md(
        """
This timeline shows when major scientific discoveries were published (dots) and how long they took to achieve widespread acceptance (bars).
Hover over elements to see details about each discovery.
    """,
        className="text-md ",
    )
)
# </example>
# %%
# <example>
# User: Create a few-second motion animation showing a 2d spring animation where data comes from a numpy array. There are 3 dots, on the same horizontal line, oscillating horizontally at different speeds, not overlapping.
# Assistant:
import genstudio.plot as Plot
import numpy as np
from genstudio.plot import js


# Generate the animation frames
def generate_spring_motion(num_frames=60):
    t = np.linspace(0, 2 * np.pi, num_frames)

    # Create three oscillating points with different frequencies
    x1 = 0.3 + 0.1 * np.sin(t)  # 1x frequency
    x2 = 0.5 + 0.1 * np.sin(1.5 * t)  # 1.5x frequency
    x3 = 0.7 + 0.1 * np.sin(2 * t)  # 2x frequency

    # Stack into frames of [x, y] coordinates
    y = 0.5  # All points at same vertical position
    frames = np.stack(
        [
            np.column_stack([x1, np.full_like(x1, y)]),
            np.column_stack([x2, np.full_like(x2, y)]),
            np.column_stack([x3, np.full_like(x3, y)]),
        ],
        axis=1,
    )  # Shape: [num_frames, 3 points, 2 coords]

    return frames


frames = generate_spring_motion()

(
    Plot.initialState(
        {"frames": frames, "frame": 0, "colors": ["#ff6b6b", "#4ecdc4", "#45b7d1"]}
    )
    | Plot.dot(
        js("$state.frames[$state.frame]"), r=8, fill=js("(d, i) => $state.colors[i]")
    )
    + Plot.domain(x=[0, 1], y=[0, 1])
    + Plot.aspectRatio(1)
    + Plot.grid()
    | Plot.Slider(
        "frame",
        rangeFrom=js("$state.frames"),
        fps=30,
        controls=["play"],
    )
)
# </example>
# %%
# <example>
# <given-user-file-context>
data = [
    {"animal": "pigs", "country": "Great Britain", "count": 1354979},
    {"animal": "cattle", "country": "Great Britain", "count": 3962921},
    {"animal": "sheep", "country": "Great Britain", "count": 10931215},
    {"animal": "pigs", "country": "United States", "count": 6281935},
    {"animal": "cattle", "country": "United States", "count": 9917873},
    {"animal": "sheep", "country": "United States", "count": 7084151},
]
# </given-user-file-context>
# User: Create an isotype chart for this data using emoji.
# Assistant:
import genstudio.plot as Plot

(
    Plot.initialState({"data": data})
    | Plot.text(
        Plot.js("$state.data"),
        {
            "text": Plot.js(
                """d => {
                const emoji = {pigs: "🐷", cattle: "🐮", sheep: "🐑"};
                return emoji[d.animal].repeat(Math.round(d.count / 1e6))
            }"""
            ),
            "y": "animal",
            "fy": "country",  # facet vertically by country
            "dx": 10,  # space between axis label and emoji
            "fontSize": 30,
            "frameAnchor": "left",
        },
    )
    + Plot.axisFy({"fontSize": 14, "frameAnchor": "top", "dy": -5})
    + {  # compute a height to fit the data
        "height": Plot.js(
            """const rowHeight = 50;
               const animals = new Set($state.data.map(d => d.animal)).size
               const countries = new Set($state.data.map(d => d.country)).size
               const titleHeight = 20
               return animals * countries * rowHeight + titleHeight""",
            expression=False,
        ),
        "y": {"label": None},
        "fy": {"label": None},
    }
    + Plot.title("Live stock (millions)")
)

# </example>
# %%
# <example>
# <given-user-file-context>
# pulsar_data is a numpy array of [x, y, wave_index] points representing pulsar waves
# Each point has an x coordinate, y amplitude, and wave_index to identify which wave it belongs to
from docs.examples.data import pulsar_data

# </given-user-file-context>
# User: Create a visualization inspired by the PSR B1919+21 pulsar plot (also known as the "Unknown Pleasures" album cover) - I've imported the data above.
# Assistant:
# Here's a visualization that creates the iconic stacked wave effect:
# 1. Creates a stacked line plot with white lines on black background
# 2. Uses the `fy` parameter to create separate lines for each wave
# 3. Removes axes and adds appropriate styling to match the iconic look

import genstudio.plot as Plot

(
    Plot.initialState(
        {
            "data": pulsar_data,
            # compute # of waves, we need it to determine layout
            "waves": len(set(point[2] for point in pulsar_data)),
            "height": Plot.js("$state.waves * 35 + 120"),
        }
    )
    # stacked line plot
    | Plot.line(
        Plot.js("$state.data"),
        {
            "strokeWidth": 2,
            "stroke": "white",
            "fill": "black",
            # facet vertically to stack waves
            "fy": "2",  # wave identity is at index 2
        },
    )
    + {  # compute a height from the data (typical when using fy)
        "height": Plot.js("$state.height"),
        "width": Plot.js("$state.height * 0.75"),
        # reverse the fy scale so we occlude from back to front
        "fy": {"reverse": True},
        "className": "bg-black",
    }
    + Plot.hideAxis()
    + Plot.margin(160, 40, 60, 20)
    # the domain also needs to be computed from the data. can require hand tuning.
    + Plot.domainY(Plot.js("[0, d3.max($state.data, ([x, y]) => y) / 16]"))
)
#
# </example>
# %%
# <example>
# User: Create an interactive shape playground where shapes can be rotated and scaled
# Assistant:

import genstudio.plot as Plot
import numpy as np
from genstudio.plot import js


def generate_shapes(scale=1.0, rotation=0.0):
    # Convert rotation to radians
    theta = rotation * np.pi / 180

    # Rotation matrix
    def rotate(x, y):
        return [
            x * np.cos(theta) - y * np.sin(theta),
            x * np.sin(theta) + y * np.cos(theta),
        ]

    shapes = []
    # Triangle
    for x, y in [(0, 0), (1, 0), (0.5, 1), (0, 0)]:
        rx, ry = rotate(x * scale, y * scale)
        shapes.append([rx + 1, ry + 1, 0])

    # Square
    for x, y in [(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)]:
        rx, ry = rotate(x * scale, y * scale)
        shapes.append([rx + 3, ry + 1, 1])

    return shapes


def updateState(widget, _):
    widget.state.update(
        {"shapes": generate_shapes(widget.state.scale, widget.state.rotation)}
    )


(
    Plot.initialState({"shapes": generate_shapes(), "rotation": 0, "scale": 1.0})
    | Plot.onChange({"rotation": updateState, "scale": updateState})
    | Plot.line(
        js("$state.shapes"),
        {
            "z": "2",
            "stroke": Plot.js(
                """(d) => {
                const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1"];
                return colors[d[2]];
            }"""
            ),
            "strokeWidth": 2,
        },
    )
    + Plot.grid()
    + Plot.domain(x=[0, 6], y=[0, 2])
    | Plot.Slider("rotation", range=[0, 360], label="Rotation")
    | Plot.Slider("scale", range=[0.5, 2], step=0.1, label="Scale")
)
# </example>
# %%
# <example>
# %%
# User: Make a tabbed view with an example dot plot, details page, and settings screen with checkboxes.
# Assistant:
import genstudio.plot as Plot
from genstudio.plot import js


def tabs_view(tabs, contents):
    """Create a tabbed interface component.

    Args:
        tabs: List of tab names
        contents: List of content elements for each tab
    """
    tab_button_class = """
        px-4 py-2 cursor-pointer mr-2
        data-[active=true]:font-medium data-[active=true]:border-b-2 data-[active=true]:border-gray-800
        data-[active=false]:text-gray-500
        hover:text-gray-800
    """
    tab_content_class = """
        col-start-1 row-start-1 transition-opacity
        data-[active=true]:opacity-100
        data-[active=false]:opacity-0 data-[active=false]:pointer-events-none
        p-4
    """
    tab_container_class = "relative grid grid-cols-1 grid-rows-1 "

    return Plot.initialState({"tab": tabs[0]}) | [
        "div",
        {},
        [
            "div",
            {"class": "flex border-b border-gray-200"},
            *[
                [
                    "div",
                    {
                        "class": tab_button_class,
                        "data-active": js("$state.tab === '" + tab + "'"),
                        "onClick": Plot.js(f"() => $state.tab = '{tab}'"),
                    },
                    tab,
                ]
                for tab in tabs
            ],
        ],
        [
            "div",
            {"class": tab_container_class},
            *[
                [
                    "div",
                    {
                        "class": tab_content_class,
                        "data-active": js(f"$state.tab === '{tab}'"),
                    },
                    content,
                ]
                for tab, content in zip(tabs, contents)
            ],
        ],
    ]


# Example usage

tabs_view(
    ["Overview", "Details", "Settings"],
    [
        Plot.dot([[1, 1], [2, 2], [3, 1]]) + Plot.grid(),
        Plot.md("## Detailed Information\nThis is the details tab content."),
        [
            "div.p-4.bg-gray-50.rounded.flex.flex-col.gap-2",
            [
                "label.p-2.flex.items-center.gap-2",
                ["input", {"type": "checkbox"}],
                "Setting 1",
            ],
            [
                "label.p-2.flex.items-center.gap-2",
                ["input", {"type": "checkbox"}],
                "Setting 2",
            ],
        ],
    ],
)
# </example>
# %%
# <example>
# User: Render a 3d spiral point cloud.
# Assistant:
import genstudio.plot as Plot
import numpy as np
from genstudio.scene3d import PointCloud, Scene

# Create a spiral point cloud
n_points = 1000
t = np.linspace(0, 10 * np.pi, n_points)
r = t / 30
x = r * np.cos(t)
y = r * np.sin(t)
z = t / 10

# Stack into positions array
positions = np.column_stack([x, y, z])

# Create rainbow colors
hue = t / t.max()
colors = np.zeros((n_points, 3))
colors[:, 0] = np.clip(1.5 - abs(3.0 * hue - 1.5), 0, 1)  # Red
colors[:, 1] = np.clip(1.5 - abs(3.0 * hue - 3.0), 0, 1)  # Green
colors[:, 2] = np.clip(1.5 - abs(3.0 * hue - 4.5), 0, 1)  # Blue

# Create varying point sizes
sizes = 0.01 + 0.02 * np.sin(t)

(
    Plot.initialState({"hover_point": None})
    | Scene(
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
                    "color": [1, 1, 0],  # Yellow highlight
                    "scale": 1.5,  # Make highlighted point larger
                }
            ],
        ),
        # Set up camera position for good view
        {
            "defaultCamera": {
                "position": [2, 2, 5],
                "target": [0, 0, 0],
                "up": [0, 0, 1],
            }
        },
    )
)
# </example>
# %%
# <example>
# User: I want to visualize an animation of two spheres with opposite growing/shrinking motion, including interactive controls to play/pause the animation and adjust the camera. Show the scene twice (synchronized motion/camera), one with white spheres and one with pink spheres.
# Assistant:
import genstudio.plot as Plot
import numpy as np
from genstudio.scene3d import Ellipsoid, Scene


def generate_ellipsoid_frames(n_frames=60):
    """Generate frames of two ellipsoids growing/shrinking oppositely."""
    centers_frames = np.repeat(
        np.array([[-0.5, 0, 0], [0.5, 0, 0]])[np.newaxis, :, :], n_frames, axis=0
    )  # Centers frames
    t = np.linspace(0, 2 * np.pi, n_frames)  # Time array
    radii_frames = np.stack(
        [
            np.stack(
                [
                    0.1 + 0.05 * np.sin(t),
                    0.1 + 0.05 * np.sin(t),
                    0.1 + 0.05 * np.sin(t),
                ],
                axis=1,
            ),
            np.stack(
                [
                    0.15 - (0.1 + 0.05 * np.sin(t)),
                    0.15 - (0.1 + 0.05 * np.sin(t)),
                    0.15 - (0.1 + 0.05 * np.sin(t)),
                ],
                axis=1,
            ),
        ],
        axis=1,
    )  # Radii frames
    return centers_frames, radii_frames


# Generate animation frames
centers, radii = generate_ellipsoid_frames()

# Create colors (gradient from red to blue)
colors = np.stack([np.linspace(1, 0, 10), np.zeros(10), np.linspace(0, 1, 10)], axis=1)

ellipsoids = Ellipsoid(
    centers=Plot.js("$state.centers[$state.frame]"),
    radii=Plot.js("$state.radii[$state.frame]"),
    colors=Plot.js("$state.colors"),
)

camera = {
    "camera": Plot.js("$state.camera"),
    "onCameraChange": Plot.js("(camera) => $state.update({camera})"),
}

(
    Plot.initialState(
        {
            "frame": 0,
            "centers": centers.reshape(60, -1),  # Flatten to (n_frames, n_ellipsoids*3)
            "radii": radii.reshape(60, -1),  # Flatten to (n_frames, n_ellipsoids*3)
            "colors": colors.flatten(),  # Flatten to (n_ellipsoids*3,)
            "camera": {
                "position": [1, 1, 0],  # Closer camera position
                "target": [0, 0, 0],
                "up": [0, 0, 1],
            },
        }
    )
    | ellipsoids + camera & ellipsoids.merge(color=[1, 0, 1]) + camera
    | Plot.Slider(
        "frame",
        rangeFrom=Plot.js("$state.centers"),
        fps=30,
        controls=["play"],
    )
)
# </example>
# %%
# </examples>
