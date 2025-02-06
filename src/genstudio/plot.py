# %%
# ruff: noqa: F401
import json
from typing import Any, Dict, List, Union, Optional

import pathlib

import genstudio.plot_defs as plot_defs
from genstudio.layout import (
    Column,
    onChange,
    Ref,
    Grid,
    Hiccup,
    JSCall,
    JSCode,
    JSExpr,
    JSRef,
    Row,
    ref,
    js,
    LayoutItem,
)

from genstudio.plot_defs import (
    area,
    areaX,
    areaY,
    arrow,
    auto,
    autoSpec,
    axisFx,
    axisFy,
    axisX,
    axisY,
    barX,
    barY,
    bin,
    binX,
    binY,
    bollinger,
    bollingerX,
    bollingerY,
    boxX,
    boxY,
    cell,
    cellX,
    cellY,
    centroid,
    circle,
    cluster,
    column,
    contour,
    crosshair,
    crosshairX,
    crosshairY,
    delaunayLink,
    delaunayMesh,
    density,
    differenceX,
    differenceY,
    dodgeX,
    dodgeY,
    dot,
    dotX,
    dotY,
    filter,
    find,
    formatIsoDate,
    formatMonth,
    formatNumber,
    formatWeekday,
    frame,
    geo,
    geoCentroid,
    graticule,
    gridFx,
    gridFy,
    gridX,
    gridY,
    group,
    groupX,
    groupY,
    groupZ,
    hexagon,
    hexbin,
    hexgrid,
    hull,
    image,
    initializer,
    interpolatorBarycentric,
    interpolatorRandomWalk,
    legend,
    line,
    linearRegressionX,
    linearRegressionY,
    lineX,
    lineY,
    link,
    map,
    mapX,
    mapY,
    marks,
    normalize,
    normalizeX,
    normalizeY,
    numberInterval,
    pointer,
    pointerX,
    pointerY,
    raster,
    rect,
    rectX,
    rectY,
    reverse,
    ruleX,
    ruleY,
    scale,
    select,
    selectFirst,
    selectLast,
    selectMaxX,
    selectMaxY,
    selectMinX,
    selectMinY,
    shiftX,
    shiftY,
    shuffle,
    sort,
    sphere,
    spike,
    stackX,
    stackX1,
    stackX2,
    stackY,
    stackY1,
    stackY2,
    text,
    textX,
    textY,
    tickX,
    tickY,
    timeInterval,
    tip,
    transform,
    tree,
    treeLink,
    treeNode,
    utcInterval,
    valueof,
    vector,
    vectorX,
    vectorY,
    voronoi,
    voronoiMesh,
    waffleX,
    waffleY,
    window,
    windowX,
    windowY,
)
from genstudio.plot_spec import MarkSpec, PlotSpec, new
from genstudio.util import configure

# This module provides a composable way to create interactive plots using Observable Plot
# and AnyWidget, built on the work of pyobsplot.
#
# See:
# - https://observablehq.com/plot/
# - https://github.com/manzt/anywidget
# - https://github.com/juba/pyobsplot
#
#
# Key features:
# - Create plot specifications declaratively by combining marks, options and transformations
# - Compose plot specs using + operator to layer marks and merge options
# - Render specs to interactive plot widgets, with lazy evaluation and caching
# - Easily create grids to compare small multiples
# - Includes shortcuts for common options like grid lines, color legends, margins

html = Hiccup
"""Wraps a Hiccup-style list to be rendered as an interactive widget in the JavaScript runtime."""

repeat = JSRef("repeat")
"""For passing columnar data to Observable.Plot which should repeat/cycle.
eg. for a set of 'xs' that are to be repeated for each set of `ys`."""


def cond(*pairs: Union[JSCode, str, list, Any]) -> JSCall:
    """Render content based on conditions, like Clojure's cond.

    Takes pairs of test/expression arguments, evaluating each test in order.
    When a test is truthy, returns its corresponding expression.
    An optional final argument serves as the "else" expression.

    Args:
        *args: Alternating test/expression pairs, with optional final else expression

    Example:
        Plot.cond(
            Plot.js("$state.detail == 'a'"), ["div", "Details for A"],
            Plot.js("$state.detail == 'b'"), ["div", "Details for B"],
            "No details selected"  # else case
        )

        # Without else:
        Plot.cond(
            Plot.js("$state.detail"), ["div", Plot.js("$state.detail")]
        )
    """
    return JSCall("COND", pairs)


def case(value: Union[JSCode, str, Any], *pairs: Union[str, list, Any]) -> JSCall:
    """Render content based on matching a value against cases, like a switch statement.

    Takes a value to match against, followed by pairs of case/expression arguments.
    When a case matches the value, returns its corresponding expression.
    An optional final argument serves as the default expression.

    Args:
        value: The value to match against cases
        *args: Alternating case/expression pairs, with optional final default expression

    Example:
        Plot.case(Plot.js("$state.selected"),
            "a", ["div", "Selected A"],
            "b", ["div", "Selected B"],
            ["div", "Nothing selected"]  # default case
        )
    """
    return JSCall("CASE", [value, *pairs])


def plot(options: dict[str, Any]) -> PlotSpec:
    """Create a new plot from options and marks."""
    plot_options = options.copy()
    plot_marks = plot_options.pop("marks", [])
    return new(plot_options, *plot_marks)


def _rename_key(d, prev_k, new_k):
    return {k if k != prev_k else new_k: v for k, v in d.items()}


def _get_choice(ch, path):
    ch = ch.get_sample() if getattr(ch, "get_sample", None) else ch

    def _get(value, path):
        if not path:
            return value
        segment = path[0]
        if not isinstance(segment, dict):
            return _get(value(segment), path[1:])
        elif ... in segment:
            v = value.get_value()
            if hasattr(value, "get_submap") and v is None:
                v = value.get_submap(...)
            return _get(v, path[1:])
        elif "leaves" in segment:
            return value
        else:
            raise TypeError(
                f"Invalid path segment, expected ... or 'leaves' key, got {segment}"
            )

    value = _get(ch, path)
    value = value.get_value() if hasattr(value, "get_value") else value

    if any(isinstance(elem, dict) for elem in path):
        return Dimensioned(value, path)
    else:
        return value


def _is_choicemap(data):
    current_class = data.__class__
    while current_class:
        if current_class.__name__ == "ChoiceMap":
            return True
        current_class = current_class.__base__
    return False


def get_in(data: Union[Dict, Any], path: List[Union[str, Dict]]) -> Any:
    """
    Reads data from a nested structure, giving names to dimensions and leaves along the way.

    This function traverses nested data structures like dictionaries and lists, allowing you to extract
    and label nested dimensions. It supports Python dicts/lists as well as GenJAX traces and choicemaps.

    Args:
        data: The nested data structure to traverse. Can be a dict, list, or GenJAX object.
        path: A list of path segments describing how to traverse the data. Each segment can be:
            - A string key to index into a dict
            - A dict with {...} to traverse a list dimension, giving it a name
            - A dict with "leaves" to mark terminal values

    Returns:
        Either a Dimensioned object containing the extracted data and dimension metadata,
        or the raw extracted value if no dimensions were named in the path.

    Example:
        data = {"a": [{"val": 1}, {"val": 2}]}
        result = get_in(data, ["a", {...: "items"}, "val"])
        # Returns Dimensioned object with value=[1, 2] and dimension named "items"
    """
    data = data.get_sample() if getattr(data, "get_sample", None) else data  # type: ignore
    if _is_choicemap(data):
        return _get_choice(data, path)

    def process_segment(value: Any, remaining_path: List[Union[str, Dict]]) -> Any:
        for i, segment in enumerate(remaining_path):
            if isinstance(segment, dict):
                if ... in segment:
                    if isinstance(value, list):
                        return [
                            process_segment(v, remaining_path[i + 1 :]) for v in value
                        ]
                    else:
                        raise TypeError(
                            f"Expected list at path index {i}, got {type(value).__name__}"
                        )
                elif "leaves" in segment:
                    return value  # Leaves are terminal, no further traversal
                else:
                    raise TypeError(
                        f"Invalid path segment, expected ... or 'leaves' key, got {segment}"
                    )
            else:
                value = value[segment]
        return value

    value = process_segment(data, path)

    if any(isinstance(elem, dict) for elem in path):
        return Dimensioned(value, path)
    else:
        return value


# Test case to verify traversal of more than one dimension
def _test_get_in():
    data = {"a": [{"b": [{"c": 1}, {"c": 2}]}, {"b": [{"c": 3}, {"c": 4}]}]}

    result = get_in(data, ["a", {...: "first"}, "b", {...: "second"}, "c"])
    assert isinstance(
        result, Dimensioned
    ), f"Expected Dimensioned, got {type(result).__name__}"
    assert result.value == [
        [1, 2],
        [3, 4],
    ], f"Expected [[1, 2], [3, 4]], got {result.value}"
    assert isinstance(
        result.dimensions, list
    ), f"Expected dimensions to be a list, got {type(result.dimensions).__name__}"
    assert (
        len(result.dimensions) == 2
    ), f"Expected 2 dimensions, got {len(result.dimensions)}"
    assert (
        [d["key"] for d in result.dimensions] == ["first", "second"]
    ), f"Expected dimension keys to be ['first', 'second'], got {[d['key'] for d in result.dimensions]}"

    flattened = get_in(
        data, ["a", {...: "first"}, "b", {...: "second"}, "c", {"leaves": "c"}]
    ).flatten()
    assert flattened == [
        {"first": 0, "second": 0, "c": 1},
        {"first": 0, "second": 1, "c": 2},
        {"first": 1, "second": 0, "c": 3},
        {"first": 1, "second": 1, "c": 4},
    ], f"Expected flattened result to be [{{...}}, ...], got {flattened}"

    def test_deeper_nesting():
        data = {
            "x": [
                {"y": [{"z": [{"a": 5}, {"a": 6}]}, {"z": [{"a": 7}, {"a": 8}]}]},
                {"y": [{"z": [{"a": 9}, {"a": 10}]}, {"z": [{"a": 11}, {"a": 12}]}]},
            ]
        }

        result = get_in(
            data,
            ["x", {...: "level1"}, "y", {...: "level2"}, "z", {...: "level3"}, "a"],
        )
        assert isinstance(result, Dimensioned), "Expected Dimensioned object"
        assert result.value == [
            [[5, 6], [7, 8]],
            [[9, 10], [11, 12]],
        ], f"Expected nested list of values, got {result.value}"
        assert len(result.dimensions) == 3, "Expected 3 dimensions"
        assert [d["key"] for d in result.dimensions] == [
            "level1",
            "level2",
            "level3",
        ], "Dimension keys do not match expected values"

        flattened = get_in(
            data,
            [
                "x",
                {...: "level1"},
                "y",
                {...: "level2"},
                "z",
                {...: "level3"},
                "a",
                {"leaves": "a"},
            ],
        ).flatten()
        assert flattened == [
            {"level1": 0, "level2": 0, "level3": 0, "a": 5},
            {"level1": 0, "level2": 0, "level3": 1, "a": 6},
            {"level1": 0, "level2": 1, "level3": 0, "a": 7},
            {"level1": 0, "level2": 1, "level3": 1, "a": 8},
            {"level1": 1, "level2": 0, "level3": 0, "a": 9},
            {"level1": 1, "level2": 0, "level3": 1, "a": 10},
            {"level1": 1, "level2": 1, "level3": 0, "a": 11},
            {"level1": 1, "level2": 1, "level3": 1, "a": 12},
        ], f"Expected flattened result to be [{{...}}, ...], got {flattened}"

    test_deeper_nesting()

    print("tests passed")


def ellipse(values: Any, options: dict[str, Any] = {}, **kwargs) -> PlotSpec:
    """
    Returns a new ellipse mark for the given *values* and *options*.

    If neither **x** nor **y** are specified, *values* is assumed to be an array of
    pairs [[*x₀*, *y₀*], [*x₁*, *y₁*], [*x₂*, *y₂*, …] such that **x** = [*x₀*,
    *x₁*, *x₂*, …] and **y** = [*y₀*, *y₁*, *y₂*, …].

    The **rx** and **ry** options specify the x and y radii respectively. If only
    **r** is specified, it is used for both radii. The optional **rotate** option
    specifies rotation in degrees.

    Additional styling options such as **fill**, **stroke**, and **strokeWidth**
    can be specified to customize the appearance of the ellipses.

    Args:
        values: The data for the ellipses.
        options: Additional options for customizing the ellipses.
        **kwargs: Additional keyword arguments to be merged with options.

    Returns:
        A PlotSpec object representing the ellipse mark.
    """
    return PlotSpec(MarkSpec("ellipse", values, {**options, **kwargs}))


def pixels(
    pixelData: list[float] | JSCode | Any,  # Raw pixel data or JSCode
    *,
    imageWidth: int | JSCode | None = None,
    imageHeight: int | JSCode | None = None,
    x: float | JSCode = 0,
    y: float | JSCode = 0,
    width: float | JSCode | None = None,
    height: float | JSCode | None = None,
) -> PlotSpec:
    """
    A custom mark for efficiently rendering a single image from raw RGB(A) pixel data.
    Unlike most Observable Plot marks which render multiple elements from data arrays,
    this mark renders a single image from a flat array of pixel values.

    Args:
        pixelData: Raw pixel data as a flat array in either RGB format [r,g,b,r,g,b,...]
                  or RGBA format [r,g,b,a,r,g,b,a,...]. Each value should be 0-255.
        imageWidth: Width of the source image in pixels
        imageHeight: Height of the source image in pixels
        x: X coordinate of top-left corner in plot coordinates (default: 0)
        y: Y coordinate of top-left corner in plot coordinates (default: 0)
        width: Displayed width in plot coordinates (defaults to imageWidth)
        height: Displayed height in plot coordinates (defaults to imageHeight)

    Returns:
        A PlotSpec object representing the pixel image mark
    """
    options = {
        "imageWidth": imageWidth,
        "imageHeight": imageHeight,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
    }
    return PlotSpec(MarkSpec("pixels", pixelData, options))


def scaled_circle(x, y, r, **kwargs):
    """
    Convenience function to create a single circular ellipse mark at position (x,y) with radius r.

    See ellipse() for additional styling options that can be passed as kwargs.

    Args:
        x: X coordinate of circle center
        y: Y coordinate of circle center
        r: Radius of the circle
        **kwargs: Additional styling options passed to ellipse()

    Returns:
        A PlotSpec object representing the circular ellipse mark.
    """
    return ellipse([[x, y]], r=r, **kwargs)


def events(options: dict[str, Any] = {}, **kwargs) -> PlotSpec:
    """
    Captures events on a plot.

    Args:
        options: Callback functions. Supported: `onClick`, `onMouseMove`, `onMouseDown`, `onDrawStart`, `onDraw`, `onDrawEnd`.
        **kwargs: Additional keyword arguments to be merged with options.

    Each callback receives an event object with:

    - `type`, the event name
    - `x`, the x coordinate
    - `y`, the y coordinate
    - for draw events, `startTime`

    Returns:
        A PlotSpec object representing the events mark.
    """
    return PlotSpec(MarkSpec("events", [], {**options, **kwargs}))


def img(values, options: dict[str, Any] = {}, **kwargs) -> PlotSpec:
    """
    The image mark renders images on the plot. The **src** option specifies the
    image source, while **x**, **y**, **width**, and **height** define the image's
    position and size in the x/y scales. This differs from the built-in Observable Plot
    image mark, which specifies width/height in pixels.

    Args:
        values: The data for the images.
        options: Options for customizing the images.
        **kwargs: Additional keyword arguments to be merged with options.

    Returns:
        A PlotSpec object representing the image mark.

    The following options are supported:
    - `src`: The source path of the image.
    - `x`: The x-coordinate of the top-left corner.
    - `y`: The y-coordinate of the top-left corner.
    - `width`: The width of the image.
    - `height`: The height of the image.
    """
    return PlotSpec(MarkSpec("img", values, {**options, **kwargs}))


def constantly(x: Any) -> JSCode:
    """
    Returns a javascript function which always returns `x`.

    Typically used to specify a constant property for all values passed to a mark,
    eg. `plot.dot(values, fill=plot.constantly('My Label'))`. In this example, the
    fill color will be assigned (from a color scale) and show up in the color legend.
    """
    x = json.dumps(x)
    return js(f"()=>{x}")


def small_multiples(*specs, **options):
    """Alias for [[Grid]]"""
    return Grid(*specs, **options)


def histogram(
    values,
    thresholds=None,
    interval=None,
    domain=None,
    cumulative=False,
    layout={"width": 200, "height": 200, "inset": 0},
    **plot_opts,
) -> PlotSpec:
    """
    Create a histogram plot from the given values.

    Args:

    values (list or array-like): The data values to be binned and plotted.
    mark (str): 'rectY' or 'dot'.
    thresholds (str, int, list, or callable, optional): The thresholds option may be specified as a named method or a variety of other ways:

    - `auto` (default): Scott’s rule, capped at 200.
    - `freedman-diaconis`: The Freedman–Diaconis rule.
    - `scott`: Scott’s normal reference rule.
    - `sturges`: Sturges’ formula.
    - A count (int) representing the desired number of bins.
    - An array of n threshold values for n - 1 bins.
    - An interval or time interval (for temporal binning).
    - A function that returns an array, count, or time interval.

     Returns:
      PlotSpec: A plot specification for a histogram with the y-axis representing the count of values in each bin.
    """
    bin_options = {"x": {}, "tip": True, **plot_opts}
    for option, value in [
        ("thresholds", thresholds),
        ("interval", interval),
        ("domain", domain),
    ]:
        if value is not None:
            bin_options["x"][option] = value
    if cumulative:
        bin_options["y"] = {"cumulative": True}
    return rectY(values, binX({"y": "count"}, bin_options)) + ruleY([0]) + layout


Histogram = histogram


def identity():
    """Returns a JavaScript identity function.

    This function creates a JavaScript snippet that represents an identity function,
    which returns its input unchanged.

    Returns:
        A JavaScript function that returns its first argument unchanged.
    """
    return js("(x) => x")


identity.for_json = lambda: identity()  # allow bare Plot.identity


def index():
    """Returns a JavaScript function that returns the index of each data point.

    In Observable Plot, this function is useful for creating channels based on
    the position of data points in the dataset, rather than their values.

    Returns:
        A JavaScript function that takes two arguments (data, index) and returns the index.
    """
    return js("(data, index) => index")


index.for_json = lambda: index()


def grid(x=None, y=None):
    """Sets grid lines for x and/or y axes."""
    # no arguments
    if x is None and y is None:
        return {"grid": True}
    return {
        "x": {"grid": x if x is not None else False},
        "y": {"grid": y if y is not None else False},
    }


def hideAxis(x=None, y=None):
    """Sets `{"axis": None}` for specified axes."""
    # no arguments
    if x is None and y is None:
        return {"axis": None}
    return {"x": {"axis": None if x else True}, "y": {"axis": None if y else True}}


def colorLegend():
    """Sets `{"color": {"legend": True}}`."""
    return {"color": {"legend": True}}


color_legend = colorLegend  # backwards compat


def clip() -> dict:
    """Sets `{"clip": True}`."""
    return {"clip": True}


def title(title: Any) -> dict:
    """Sets `{"title": title}`."""
    return {"title": title}


def subtitle(subtitle: Any) -> dict:
    """Sets `{"subtitle": subtitle}`."""
    return {"subtitle": subtitle}


def caption(caption: Any) -> dict:
    """Sets `{"caption": caption}`."""
    return {"caption": caption}


def width(width: Any) -> dict:
    """Sets `{"width": width}`."""
    return {"width": width}


def height(height: Any) -> dict:
    """Sets `{"height": height}`."""
    return {"height": height}


def size(size: Any, height: Any = None) -> dict:
    """Sets width and height, using size for both if height not specified."""
    return {"width": size, "height": height or size}


def aspectRatio(r: Any) -> dict:
    """Sets `{"aspectRatio": r}`."""
    return {"aspectRatio": r}


aspect_ratio = aspectRatio  # backwards compat


def inset(i: Any) -> dict:
    """Sets `{"inset": i}`."""
    return {"inset": i}


def colorScheme(name: Any) -> dict:
    """Sets `{"color": {"scheme": <name>}}`."""
    # See https://observablehq.com/plot/features/scales#color-scales
    return {"color": {"scheme": name}}


def domainX(d: Any) -> dict:
    """Sets `{"x": {"domain": d}}`."""
    return {"x": {"domain": d}}


def domainY(d: Any) -> dict:
    """Sets `{"y": {"domain": d}}`."""
    return {"y": {"domain": d}}


def domain(x: Any, y: Any = None) -> dict:
    """Sets domain for x and optionally y scales."""
    return {"x": {"domain": x}, "y": {"domain": y or x}}


def colorMap(mappings: Any) -> dict:
    """
    Adds colors to the plot's color_map. More than one colorMap can be specified
    and colors will be merged. This is a way of dynamically building up a color scale,
    keeping color definitions colocated with their use. The name used for a color
    will show up in the color legend, if displayed.

    Colors defined in this way must be used with `Plot.constantly(<name>)`.

    Example:

    ```
    plot = (
        Plot.dot(data, fill=Plot.constantly("car"))
        + Plot.colorMap({"car": "blue"})
        + Plot.colorLegend()
    )
    ```

    In JavaScript, colors provided via `colorMap` are merged into a
    `{color: {domain: [...], range: [...]}}` object.
    """
    return {"color_map": mappings}


color_map = colorMap  # backwards compat


def margin(*args: Any) -> dict:
    """
    Set margin values for a plot using CSS-style margin shorthand.

    Supported arities:
        margin(all)
        margin(vertical, horizontal)
        margin(top, horizontal, bottom)
        margin(top, right, bottom, left)

    Args:
        *args: Margin values as integers or floats, following CSS margin shorthand rules

    Returns:
        A dictionary mapping margin properties to their values
    """
    if len(args) == 1:
        return {"margin": args[0]}
    elif len(args) == 2:
        return {
            "marginTop": args[0],
            "marginBottom": args[0],
            "marginLeft": args[1],
            "marginRight": args[1],
        }
    elif len(args) == 3:
        return {
            "marginTop": args[0],
            "marginLeft": args[1],
            "marginRight": args[1],
            "marginBottom": args[2],
        }
    elif len(args) == 4:
        return {
            "marginTop": args[0],
            "marginRight": args[1],
            "marginBottom": args[2],
            "marginLeft": args[3],
        }
    else:
        raise ValueError(f"Invalid number of arguments: {len(args)}")


def md(text: str, **kwargs: Any) -> JSCall:
    """Render a string as Markdown, in a LayoutItem."""
    return JSRef("md")(kwargs, text)


katex = JSRef("katex")
"""Render a TeX string, in a LayoutItem."""


def doc(fn):
    """
    Decorator to display the docstring of a python function formatted as Markdown.

    Args:
        fn: The function whose docstring to display.

    Returns:
        A JSCall instance
    """

    if fn.__doc__:
        name = fn.__name__
        doc = fn.__doc__.strip()  # Strip leading/trailing whitespace
        # Dedent the docstring to avoid unintended code blocks
        doc = "\n".join(line.strip() for line in doc.split("\n"))
        module = fn.__module__
        module = "Plot" if fn.__module__.endswith("plot_defs") else module
        title = f"<span style='padding-right: 10px;'>{module}.{name}</span>"
        return md(
            f"""
<div class="doc-header">{title}</div>
<div class="doc-content">

{doc}

</div>
"""
        )
    else:
        return md("No docstring available.")


# %%

_Frames = JSRef("Frames")


def Frames(
    frames: list[Any] | Ref,
    key: str | None = None,
    slider: bool = True,
    tail: bool = False,
    **opts: Any,
) -> LayoutItem:
    """
    Create an animated plot that cycles through a list of frames.

    Args:
        frames (list): A list of plot specifications or renderable objects to animate.
        key (str | None): The state key to use for the frame index. If None, uses "frame".
        slider (bool): Whether to show the slider control. Defaults to True.
        tail (bool): Whether animation should stop at the end. Defaults to False.
        **opts: Additional options for the animation, such as fps (frames per second).

    Returns:
        A Hiccup-style representation of the animated plot.
    """
    frames = ref(frames)
    if key is None:
        key = "frame"
        return Hiccup([_Frames, {"state_key": key, "frames": frames}]) | Slider(
            key,
            rangeFrom=frames,
            tail=tail,
            visible=slider,
            **opts,
        )
    else:
        return Hiccup([_Frames, {"state_key": key, "frames": frames}])


def initialState(
    values: dict[str, Any], sync: Union[set[str], bool, None] = None
) -> JSCall:
    """
    Initializes state variables in the Plot widget.

    Args:
        values (dict[str, Any]): A dictionary mapping state variable names to their initial values.
        sync (Union[set[str], bool, None], optional): Controls which state variables are synced between Python and JavaScript.
            If True, all variables are synced. If a set, only variables in the set are synced.
            If None or False, no variables are synced. Defaults to None.

    Returns:
        InitialState: An object that initializes the state variables when rendered.

    Example:
        >>> Plot.initialState({"count": 0, "name": "foo"})  # Initialize without sync
        >>> Plot.initialState({"count": 0}, sync=True)  # Sync all variables
        >>> Plot.initialState({"x": 0, "y": 1}, sync={"x"})  # Only sync "x"
    """

    sync_set = set(values.keys()) if sync is True else (sync or set())

    return JSCall(
        "InitialState",
        [Ref(v, state_key=k, sync=(k in sync_set)) for k, v in values.items()],
    )


initial_state = initialState


_Slider = JSRef("Slider")


def Slider(
    key: Union[str, JSExpr],
    init: Any = None,
    range: Optional[Union[int, float, List[Union[int, float]], JSExpr]] = None,
    rangeFrom: Any = None,
    fps: Optional[Union[int, str, JSExpr]] = None,
    step: Union[int, float, JSExpr] = 1,
    tail: Union[bool, JSExpr] = False,
    loop: Union[bool, JSExpr] = True,
    label: Optional[Union[str, JSExpr]] = None,
    showValue: Union[bool, JSExpr] = False,
    controls: Optional[Union[List[str], JSExpr, bool]] = None,
    className: Optional[str] = None,
    style: Optional[Dict[str, Any]] = None,
    **kwargs: Any,
):
    """
    Creates a slider with reactive functionality, allowing for dynamic interaction and animation.

    Args:
        key (str): The key for the reactive variable in the state.
        init (Any, optional): Initial value for the variable.
        range (Union[int, List[int]], optional):  A list of two values, `[from, until]` (inclusive), to be traversed by `step`. Or a single value `n` which becomes `[from, n-1]`, aligned with python's range(n).
        rangeFrom (Any, optional): Derive the range from the length of this (ref) argument.
        fps (int, optional): Frames per second for animation through the range. If > 0, enables animation.
        step (int, optional): Step size for the range. Defaults to 1.
        tail (bool, optional): If True, animation stops at the end of the range. Defaults to False.
        loop (bool, optional): If True, animation loops back to start when reaching the end. Defaults to True.
        label (str, optional): Label for the slider.
        showValue (bool, optional): If True, shows the current value immediately after the label.
        controls (list, optional): List of controls to display, such as ["slider", "play", "fps"]. Defaults to ["slider"] if fps is not set, otherwise ["slider", "play"].
        **kwargs: Additional keyword arguments.

    Returns:
        Slider: A Slider component with the specified options.

    Example:
        >>> Plot.Slider("frame", init=0, range=100, fps=30, label="Frame")
    """

    if init is None and range is None and rangeFrom is None:
        raise ValueError("Slider: 'init', 'range', or 'rangeFrom' must be defined")
    if tail and rangeFrom is None:
        raise ValueError("Slider: 'tail' can only be used when 'rangeFrom' is provided")
    init = (
        Ref(init, state_key=key, sync=True) if init is not None else js(f"$state.{key}")
    )
    slider_options = {
        "state_key": key,
        "init": init,
        "range": range,
        "rangeFrom": rangeFrom,
        "fps": fps,
        "step": step,
        "tail": tail,
        "loop": loop,
        "label": label,
        "showValue": showValue,
        "controls": controls,
        "className": className,
        "style": style,
        "kind": "Slider",
        **kwargs,
    }

    return Hiccup([_Slider, slider_options])


def renderChildEvents(options: dict[str, Any] = {}, **kwargs) -> JSRef:
    """
    Creates a render function that adds drag-and-drop and click functionality to child elements of a plot.
    Must be passed as the 'render' option to a mark, e.g.:

        Plot.dot(data, render=Plot.renderChildEvents(
            onDrag=update_position,
            onClick=handle_click
        ))

    This function enhances the rendering of plot elements by adding interactive behaviors such as dragging, clicking, and tracking position changes. It's designed to work with Observable Plot's rendering pipeline.

    Args:
        options (dict): Configuration options for the child events
        **kwargs: Event handlers passed as keyword arguments:
            - `onDragStart` (callable): Callback function called when dragging starts
            - `onDrag` (callable): Callback function called during dragging
            - `onDragEnd` (callable): Callback function called when dragging ends
            - `onClick` (callable): Callback function called when a child element is clicked

    Returns:
        A render function to be used in the Observable Plot rendering pipeline.
    """
    return JSRef("render.childEvents")({**options, **kwargs})


render = JSRef("render")
bylight = JSRef("Bylight")
"""Creates a highlighted code block using the [Bylight library](https://mhuebert.github.io/bylight/).

Args:
    source (str): The source text/code to highlight
    patterns (list): A list of patterns to highlight. Each pattern can be either:
        - A string to match literally
        - A dict with 'match' (required) and 'color' (optional) keys
    props (dict, optional): Additional properties to pass to the pre element. Defaults to {}.

Example:
    ```python
    Plot.bylight('''
        def hello():
            print("Hello World!")
    ''', ["def", "print"])
    ```

Returns:
    A Bylight component that renders the highlighted code block.
"""

Bylight = bylight  # backwards compat


class Dimensioned:
    def __init__(self, value, path):
        self.value = value
        self.dimensions = [
            _rename_key(segment, ..., "key")
            for segment in path
            if isinstance(segment, dict)
        ]

    def shape(self):
        shape = ()
        current_value = self.value
        for dimension in self.dimensions:
            if "leaves" not in dimension:
                shape += (len(current_value),)
                current_value = current_value[0]
        return shape

    def names(self):
        return [
            dimension.get("key", dimension.get("leaves"))
            for dimension in self.dimensions
        ]

    def __repr__(self):
        return f"<Dimensioned shape={self.shape()}, names={self.names()}>"

    def size(self, name):
        names = self.names()
        shape = self.shape()
        if name in names:
            return shape[names.index(name)]
        raise ValueError(f"Dimension with name '{name}' not found")

    def flatten(self):
        # flattens the data in python, rather than js.
        # currently we are not using/recommending this
        # but it may be useful later or for debugging.
        leaf = (
            self.dimensions[-1]["leaves"]
            if isinstance(self.dimensions[-1], dict) and "leaves" in self.dimensions[-1]
            else None
        )
        dimensions = self.dimensions[:-1] if leaf else self.dimensions

        def _flatten(value, dims, prefix=None):
            if not dims:
                value = {leaf: value} if leaf else value
                return [prefix | value] if prefix else [value]
            results = []
            dim_key = dims[0]["key"]
            for i, v in enumerate(value):
                new_prefix = {**prefix, dim_key: i} if prefix else {dim_key: i}
                results.extend(_flatten(v, dims[1:], new_prefix))
            return results

        return _flatten(self.value, dimensions)

    def for_json(self):
        return {"value": self.value, "dimensions": self.dimensions}


def dimensions(data, dimensions=[], leaves=None):
    """
    Attaches dimension metadata, for further processing in JavaScript.
    """
    dimensions = [{"key": d} for d in dimensions]
    dimensions = [*dimensions, {"leaves": leaves}] if leaves else dimensions
    return Dimensioned(data, dimensions)


def Import(
    source: str,
    alias: Optional[str] = None,
    default: Optional[str] = None,
    refer: Optional[list[str]] = None,
    refer_all: bool = False,
    rename: Optional[dict[str, str]] = None,
    exclude: Optional[list[str]] = None,
    format: str = "esm",
) -> LayoutItem:
    """Import JavaScript code into the GenStudio environment.

    Args:
        source: JavaScript source code. Can be:
            - Inline JavaScript code
            - URL starting with http(s):// for remote modules
            - Local file path starting with path: prefix
        alias: Namespace alias for the entire module
        default: Name for the default export
        refer: Set of names to import directly, or True to import all
        refer_all: Alternative to refer=True
        rename: Dict of original->new names for referred imports
        exclude: Set of names to exclude when using refer_all
        format: Module format ('esm' or 'commonjs')

    Examples:
        # CDN import with namespace alias
        >>> Plot.Import(
        ...     source="https://cdn.skypack.dev/lodash-es",
        ...     alias="_",
        ...     refer=["flattenDeep", "partition"],
        ...     rename={"flattenDeep": "deepFlatten"}
        ... )

        # Local file import
        >>> Plot.Import(
        ...     source="path:src/app/utils.js",  # relative to working directory
        ...     refer=["formatDate"]
        ... )

        # Inline source with refer_all
        >>> Plot.Import(
        ...     source='''
        ...     export const add = (a, b) => a + b;
        ...     export const subtract = (a, b) => a - b;
        ...     ''',
        ...     refer_all=True,
        ...     exclude=["subtract"]
        ... )

        # Default export handling
        >>> Plot.Import(
        ...     source="https://cdn.skypack.dev/d3-scale",
        ...     default="createScale"
        ... )
    """

    # Create spec for the import
    spec: dict[str, Union[str, list[str], bool, dict[str, str]]] = {"format": format}

    # Handle source based on prefix
    if source.startswith("path:"):
        path = source[5:]  # Remove 'path:' prefix
        try:
            resolved_path = pathlib.Path.cwd() / path
            with open(resolved_path) as f:
                spec["source"] = f.read()
        except Exception as e:
            raise ValueError(f"Failed to load file at {path}: {e}")
    else:
        spec["source"] = source

    if alias:
        spec["alias"] = alias
    if default:
        spec["default"] = str(default)
    if refer:
        spec["refer"] = refer
    if refer_all:
        spec["refer_all"] = True
    if rename:
        spec["rename"] = rename
    if exclude:
        spec["exclude"] = exclude

    class RequireItem(LayoutItem):
        def __init__(self, spec):
            super().__init__()
            # Store as a list of specs instead of dict
            self._state_imports = [spec]

        def for_json(self):
            return None

    return RequireItem(spec)


# Add this near the top of the file, after the imports
__all__ = [
    # ## Interactivity
    "events",
    "Frames",
    "Slider",
    "renderChildEvents",
    "onChange",
    # ## Layout
    # Useful for layouts and custom views.
    # Note that syntax sugar exists for `Column` (`|`) and `Row` (`&`) using operator overloading.
    # ```
    # (A & B) | C # A & B on one row, with C below.
    # ```
    "Column",
    "Grid",
    "Row",
    "cond",
    "case",
    "html",
    "md",
    "JSExpr",
    # ## JavaScript Interop
    "js",
    "ref",
    # ## Plot: Mark utilities
    # Useful for constructing arguments to pass to Mark functions.
    "constantly",
    "identity",
    "index",
    # ## Plot: Marks
    # The following are the original JavaScript docs for the built-in Observable Plot marks.
    # Usage is slightly different from Python.
    "area",
    "areaX",
    "areaY",
    "arrow",
    "auto",
    "barX",
    "barY",
    "boxX",
    "boxY",
    "cell",
    "cellX",
    "cellY",
    "circle",
    "dot",
    "dotX",
    "dotY",
    "image",
    "line",
    "lineX",
    "lineY",
    "link",
    "rect",
    "rectX",
    "rectY",
    "ruleX",
    "ruleY",
    "spike",
    "text",
    "textX",
    "textY",
    "vector",
    "vectorX",
    "vectorY",
    "waffleX",
    "waffleY",
    # ## Plot: Transforms
    "bin",
    "binX",
    "binY",
    "bollinger",
    "bollingerX",
    "bollingerY",
    "centroid",
    "cluster",
    "density",
    "differenceX",
    "differenceY",
    "dodgeX",
    "dodgeY",
    "filter",
    "find",
    "group",
    "groupX",
    "groupY",
    "groupZ",
    "hexbin",
    "hull",
    "map",
    "mapX",
    "mapY",
    "normalize",
    "normalizeX",
    "normalizeY",
    "reverse",
    "select",
    "selectFirst",
    "selectLast",
    "selectMaxX",
    "selectMaxY",
    "selectMinX",
    "selectMinY",
    "shiftX",
    "shiftY",
    "shuffle",
    "sort",
    "stackX",
    "stackX1",
    "stackX2",
    "stackY",
    "stackY1",
    "stackY2",
    "transform",
    "window",
    "windowX",
    "windowY",
    # ## Plot: Axes and grids
    "axisFx",
    "axisFy",
    "axisX",
    "axisY",
    "gridFx",
    "gridFy",
    "gridX",
    "gridY",
    "tickX",
    "tickY",
    # ## Plot: Geo features
    "geo",
    "geoCentroid",
    "graticule",
    "sphere",
    # ## Plot: Delaunay/Voronoi
    "delaunayLink",
    "delaunayMesh",
    "voronoi",
    "voronoiMesh",
    # ## Plot: Trees and networks
    "tree",
    "treeLink",
    "treeNode",
    # ## Plot: Interactivity
    "crosshair",
    "crosshairX",
    "crosshairY",
    "pointer",
    "pointerX",
    "pointerY",
    "tip",
    # ## Plot: Formatting and interpolation
    "formatIsoDate",
    "formatMonth",
    "formatNumber",
    "formatWeekday",
    "interpolatorBarycentric",
    "interpolatorRandomWalk",
    "numberInterval",
    "timeInterval",
    "utcInterval",
    # ## Plot: Other utilities
    "new",
    "frame",
    "hexagon",
    "hexgrid",
    "legend",
    "linearRegressionX",
    "linearRegressionY",
    "raster",
    "scale",
    "valueof",
    # ## Plot: Options Helpers
    "aspectRatio",
    "caption",
    "clip",
    "colorLegend",
    "colorMap",
    "colorScheme",
    "domain",
    "domainX",
    "domainY",
    "grid",
    "height",
    "hideAxis",
    "inset",
    "margin",
    "repeat",
    "size",
    "subtitle",
    "title",
    "width",
    # ## Custom plot functions
    "ellipse",
    "histogram",
    "img",
    "bylight",
    # ## Utility functions
    "doc",
    "initialState",
    "get_in",
    "dimensions",
    "Import",
]
