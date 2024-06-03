# %%
import copy
import json
import re

import gen.studio.util as util
from gen.studio.js_modules import JSRef, Hiccup, js, js_call
from gen.studio.widget import Widget

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
# - Easily create grids of small multiples
# - Includes shortcuts for common options like grid lines, color legends, margins

OBSERVABLE_PLOT_METADATA = json.load(
    open(util.PARENT_PATH / "scripts" / "observable_plot_metadata.json")
)

d3 = JSRef("d3")
Math = JSRef("Math")
View = JSRef("View")
class Dimensioned:
    def __init__(self, dimensions, leaf=None, value=None):
        self.value = value
        self.leaf = leaf
        self.dimensions = dimensions

    def to_json(self): 
        return View.flattenDimensions(self.value, self.dimensions, self.leaf)
    
def rename_key(d, prev_k, new_k):
    return {k if k != prev_k else new_k: v for k, v in d.items()}

def get_choice(tr, path):
    """
    Retrieve a choice value from a trace using a list of keys.
    Dimension instances are treated like ... but also return dimension info.
    """
    choices = tr.get_choices()
    dimensions = [rename_key(segment, ..., 'key') for segment in path if isinstance(segment, dict) and ... in segment]
    path = [... if (isinstance(segment, dict) and ... in segment) else segment for segment in path]
    lastSegment = path and path[-1]
    leaf = lastSegment if isinstance(lastSegment, dict) and 'as' in lastSegment else None
    path = path[:-1] if leaf else path
    if isinstance(path[-1], set):
        # If the last entry in address is a set, we want to retrieve multiple values
        # from the choices and return them as a dictionary with keys from the set.
        keys = path[-1]
        value = choices[*path[:-1]]
        value = {key: value[key] for key in keys}
    else:
        # If the last entry is not a set, proceed as normal
        value = choices[*path]
    
    if dimensions:
        return Dimensioned(dimensions, leaf=leaf, value=value)
    else:
        return value


def get_in(data, path, toplevel=True):
    result = data
    dimensions = [rename_key(segment, ..., 'key') for segment in path if isinstance(segment, dict) and ... in segment]
    lastSegment = path and path[-1]
    leaf = lastSegment if isinstance(lastSegment, dict) and 'as' in lastSegment else None
    for i, part in enumerate(path):
        if isinstance(part, dict) and ... in part:
            part = ...
        if part == ...:
            if isinstance(result, list):
                result = [get_in(sub_result, path[i+1:], False) for sub_result in result]
                break
            else:
                raise TypeError(f"Expected list at path index {i}, got {type(result).__name__}")
        elif isinstance(part, dict) and 'as' in part:
            break
        else:
            result = result[part]
    if toplevel and dimensions:
        return Dimensioned(dimensions, leaf=leaf, value=result)
    else:
        return result


# Test case to verify traversal of more than one dimension
def test_get_in():
    data = {
        'a': [
            {'b': [{'c': 1}, {'c': 2}]},
            {'b': [{'c': 3}, {'c': 4}]}
        ]
    }
    path = ['a', {...: 'first'}, 'b', {...: 'second'}, 'c']
    result = get_in(data, path)
    assert isinstance(result, Dimensioned), f"Expected Dimensioned, got {type(result).__name__}"
    assert result.value == [[1, 2], [3, 4]], f"Expected [[1, 2], [3, 4]], got {result.value}"
    assert isinstance(result.dimensions, list), f"Expected dimensions to be a list, got {type(result.dimensions).__name__}"
    assert len(result.dimensions) == 2, f"Expected 2 dimensions, got {len(result.dimensions)}"
    assert [d['key'] for d in result.dimensions] == ['first', 'second'], f"Expected dimension keys to be ['first', 'second'], got {[d['key'] for d in result.dimensions]}"
    
    flattened = get_in(data, ['a', {...: 'first'}, 'b', {...: 'second'}, {'c'}]).flatten()
    
    assert flattened == [
        {'first': 0, 'second': 0, 'c': 1},
        {'first': 0, 'second': 1, 'c': 2},
        {'first': 1, 'second': 0, 'c': 3},
        {'first': 1, 'second': 1, 'c': 4}
    ], f"Expected flattened result to be [{{...}}, ...], got {flattened}"
    
    print('tests passed')

# test_get_in()

#%%
def plot_spec(x):
    return PlotSpec(x)


def _plot_fn(fn_name, meta):
    """
    Returns a wrapping function for an Observable.Plot mark, accepting a positional values argument
    (where applicable) options, which may be a single dict and/or keyword arguments.
    """
    kind = meta["kind"]
    doc = meta["doc"]
    if fn_name in ["hexgrid", "grid", "gridX", "gridY", "gridFx", "gridFy", "frame"]:
        # no values argument
        def parse_args(spec={}, **kwargs):
            return [{**spec, **kwargs}]

        return JSRef(
            "Plot", fn_name, parse_args=parse_args, wrap_ret=plot_spec, doc=doc
        )
    elif kind == "marks":

        def parse_args(values, spec={}, **kwargs):
            return [fn_name, values, {**spec, **kwargs}]

        return JSRef(
            "View",
            "MarkSpec",
            parse_args=parse_args,
            wrap_ret=plot_spec,
            doc=doc,
            label=fn_name,
        )
    else:
        return JSRef("Plot", fn_name, doc=doc)


_plot_fns = {
    name: _plot_fn(name, meta) for name, meta in OBSERVABLE_PLOT_METADATA.items()
}

# Re-export the dynamically constructed MarkSpec functions
globals().update(_plot_fns)


plot_options = {
    "small": {"width": 250, "height": 175, "inset": 10},
    "default": {"width": 500, "height": 350, "inset": 20},
}


def _deep_merge(dict1, dict2):
    """
    Recursively merge two dictionaries.
    Values in dict2 overwrite values in dict1. If both values are dictionaries, recursively merge them.
    """

    for k, v in dict2.items():
        if k in dict1 and isinstance(dict1[k], dict) and isinstance(v, dict):
            dict1[k] = _deep_merge(dict1[k], v)
        elif isinstance(v, dict):
            dict1[k] = copy.deepcopy(v)
        else:
            dict1[k] = v
    return dict1


def _add_list(spec, marks, to_add):
    # mutates spec & marks, returns nothing
    for new_spec in to_add:
        if isinstance(new_spec, dict):
            _add_dict(spec, marks, new_spec)
        elif isinstance(new_spec, PlotSpec):
            _add_dict(spec, marks, new_spec.spec)
        elif isinstance(new_spec, (list, tuple)):
            _add_list(spec, marks, new_spec)
        else:
            raise ValueError(f"Invalid plot specification: {new_spec}")


def _add_dict(spec, marks, to_add):
    # mutates spec & marks, returns nothing
    if "pyobsplot-type" in to_add:
        marks.append(to_add)
    else:
        spec = _deep_merge(spec, to_add)
        new_marks = to_add.get("marks", None)
        if new_marks:
            _add_list(spec, marks, new_marks)


def _add(spec, marks, to_add):
    # mutates spec & marks, returns nothing
    if isinstance(to_add, (list, tuple)):
        _add_list(spec, marks, to_add)
    elif isinstance(to_add, dict):
        _add_dict(spec, marks, to_add)
    elif isinstance(to_add, PlotSpec):
        _add_dict(spec, marks, to_add.spec)
    else:
        raise TypeError(
            f"Unsupported operand type(s) for +: 'PlotSpec' and '{type(to_add).__name__}'"
        )


class PlotSpec:
    """
    Represents a specification for an plot (in Observable Plot).

    PlotSpecs can be composed using the + operator. When combined, marks accumulate
    and plot options are merged. Lists of marks or dicts of plot options can also be
    added directly to a PlotSpec.

    IPython plot widgets are created lazily when the spec is viewed in a notebook,
    and then cached for efficiency.

    Args:
        *specs: PlotSpecs, lists of marks, or dicts of plot options to initialize with.
        **kwargs: Additional plot options passed as keyword arguments.
    """

    def __init__(self, *specs, **kwargs):
        marks = []
        self.spec = spec = {"marks": []}
        if specs:
            _add_list(spec, marks, specs)
        if kwargs:
            _add_dict(spec, marks, kwargs)
        spec["marks"] = marks
        self._plot = None

    def __add__(self, to_add):
        """
        Combine this PlotSpec with another PlotSpec, list of marks, or dict of options.

        Args:
            to_add: The PlotSpec, list of marks, or dict of options to add.

        Returns:
            A new PlotSpec with the combined marks and options.
        """
        spec = self.spec.copy()
        marks = spec["marks"].copy()
        _add(spec, marks, to_add)
        spec["marks"] = marks
        return PlotSpec(spec)

    def plot(self):
        """
        Lazily generate & cache the widget for this PlotSpec.
        """
        if self._plot is None:
            self._plot = Widget(
                View.PlotSpec(
                    {
                        **plot_options["default"],
                        **self.spec,
                    }
                )
            )
        return self._plot

    def reset(self, *specs, **kwargs):
        """
        Reset this PlotSpec's options and marks to those from the given specs.

        Reuses the existing plot widget.

        Args:
            *specs: PlotSpecs, lists of marks, or dicts of plot options to reset to.
            **kwargs: Additional options to reset.
        """
        self.spec = PlotSpec(*specs, **kwargs).spec
        self.plot().data = {**plot_options["default"], **self.spec}

    def update(self, *specs, marks=None, **kwargs):
        """
        Update this PlotSpec's options and marks in-place.

        Reuses the existing plot widget.

        Args:
            *specs: PlotSpecs, lists of marks, or dicts of plot options to update with.
            marks (list, optional): List of marks to replace existing marks with.
                If provided, overwrites rather than adds to existing marks.
            **kwargs: Additional options to update.
        """
        if specs:
            self.spec = (self + specs).spec
        if marks is not None:
            self.spec["marks"] = marks
        self.spec.update(kwargs)
        self.plot().data = self.spec

    def _repr_mimebundle_(self, include=None, exclude=None):
        return self.plot()._repr_mimebundle_()

    def to_json(self):
        return View.PlotSpec({**plot_options["default"], **self.spec})


def new(*specs, **kwargs):
    """Create a new PlotSpec from the given specs and options."""
    return PlotSpec(specs, **kwargs)


def constantly(x):
    """
    Returns a javascript function which always returns `x`.

    Typically used to specify a constant property for all values passed to a mark,
    eg. plot.dot(values, fill=plot.constantly('My Label')). In this example, the
    fill color will be assigned (from a color scale) and show up in the color legend.
    """
    x = json.dumps(x)
    return js(f"()=>{x}")


def small_multiples(plotspecs, plot_opts={}, layout_opts={}):
    """
    Create a grid of small multiple plots from the given list of plot specifications.

    Args:
        plotspecs (list): A list of PlotSpecs to render as small multiples.
        plot_opts (dict, optional): Options to apply to each individual plot.
            Defaults to the 'small' preset if not provided.
        layout_opts (dict, optional): Options to pass to the Layout of the GridBox.

    Returns:
        ipywidgets.GridBox: A grid box containing the rendered small multiple plots.
    """
    plot_opts = {**plot_options["small"], **plot_opts}
    layout_opts = {
        "grid_template_columns": "repeat(auto-fit, minmax(200px, 1fr))",
        **layout_opts,
    }

    return Hiccup(
        [
            "div.grid.black",
            {
                "style": {
                    "display": "grid",
                    "grid-template-columns": "repeat(auto-fit, minmax(200px, 1fr))",
                }
            },
            *[(plotspec + plot_opts) for plotspec in plotspecs],
        ]
    )


def partial_plot(plot_fn, default_spec):
    """
    Returns plot fn with default options, retaining metadata.
    """

    def inner(values, spec={}, **kwargs):
        return plot_fn(values, {**default_spec, **spec, **kwargs})

    inner.__doc__ = plot_fn.__doc__
    inner.__name__ = plot_fn.__name__
    inner.doc = plot_fn.doc
    return inner

dot = partial_plot(_plot_fns["dot"], {"fill": "currentColor"})

def histogram(values, mark='rectY', thresholds='auto'):
    """
Create a histogram plot from the given values.

Args:
     
values (list or array-like): The data values to be binned and plotted.
mark (str): 'rectY' or 'dot'.
thresholds (str, int, list, or callable, optional): The thresholds option may be specified as a named method or a variety of other ways:
  
- 'auto' (default): Scott’s rule, capped at 200.
- 'freedman-diaconis': The Freedman–Diaconis rule.
- 'scott': Scott’s normal reference rule.
- 'sturges': Sturges’ formula.
- A count (int) representing the desired number of bins.
- An array of n threshold values for n - 1 bins.
- An interval or time interval (for temporal binning).
- A function that returns an array, count, or time interval.

 Returns:
  PlotSpec: A plot specification for a histogram with the y-axis representing the count of values in each bin.
    """
    opts = {'x': {'thresholds': thresholds}}
    if mark == 'rectY':
        return rectY(values, binX({'y': 'count'}, opts)) + ruleY([0])
    elif mark == 'dot':
        return dot(values, binX({'r': 'count'}, opts))

#%%

class PlotSpecWithDefault:
    """
    A class that wraps a mark function with defaults when called with no arguments.

    An instance of MarkDefault can be used directly as a PlotSpec or
    called as a function to customize the behaviour of the mark.

    Args:
        fn_name (str): The name of the mark function to wrap.
        default (dict): The default options for the mark.
    """

    def __init__(self, fn_name, *default_args):
        fn = _plot_fns[fn_name]
        self.__name__ = fn.__name__
        self.__doc__ = fn.__doc__
        self.default_args = default_args
        self.fn = fn

    def __call__(self, *args, **kwargs):
        if not args and not kwargs:
            return new(self.fn(*self.default_args))
        return self.fn(*args, **kwargs)

    def _repr_mimebundle_(self, **kwargs):
        return self.fn._repr_mimebundle_(**kwargs)


frame = PlotSpecWithDefault("frame", {"stroke": "#dddddd"})
ruleY = PlotSpecWithDefault("ruleY", [0])
ruleX = PlotSpecWithDefault("ruleX", [0])

# The following convenience dicts can be added directly to PlotSpecs to declare additional behaviour.

grid_y = {"y": {"grid": True}}
grid_x = {"x": {"grid": True}}
grid = {"grid": True}
color_legend = {"color": {"legend": True}}
clip = {"clip": True}


def title(title):
    return {"title": title}


def subtitle(subtitle):
    return {"subtitle": subtitle}


def caption(caption):
    return {"caption": caption}


def width(width):
    return {"width": width}


def height(height):
    return {"height": height}


def size(size, height=None):
    return {"width": size, "height": height or size}


def aspect_ratio(r):
    return {"aspectRatio": r}


def inset(i):
    return {"inset": i}


def color_scheme(name):
    # See https://observablehq.com/plot/features/scales#color-scales
    return {"color": {"scheme": name}}


def domainX(d):
    return {"x": {"domain": d}}


def domainY(d):
    return {"y": {"domain": d}}


def domain(xd, yd=None):
    return {"x": {"domain": xd}, "y": {"domain": yd or xd}}


def color_map(mappings):
    return {
        "color": {"domain": list(mappings.keys()), "range": list(mappings.values())}
    }


def margin(*args):
    """
    Set margin values for a plot using CSS-style margin shorthand.

    Supported arities:
        margin(all)
        margin(vertical, horizontal)
        margin(top, horizontal, bottom)
        margin(top, right, bottom, left)

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


# barX
# For reference - other options supported by plots
example_plot_options = {
    "title": "TITLE",
    "subtitle": "SUBTITLE",
    "caption": "CAPTION",
    "width": "100px",
    "height": "100px",
    "grid": True,
    "inset": 10,
    "aspectRatio": 1,
    "style": {"font-size": "100px"},  # css string also works
    "clip": True,
}


def doc_str(functionName):
    return OBSERVABLE_PLOT_METADATA[functionName]["doc"]


def doc(plot_fn):
    """
    Decorator to display the docstring of a plot function nicely formatted as Markdown.

    Args:
        plot_fn: The plot function whose docstring to display.

    Returns:
        A JSCall instance
    """

    if plot_fn.__doc__:
        name = plot_fn.__name__
        doc = plot_fn.__doc__
        meta = OBSERVABLE_PLOT_METADATA.get(name, None)
        title = (
            f"<span style='font-size: 20px; padding-right: 10px;'>Plot.{name}</span>"
        )
        url = (
            f"https://observablehq.com/plot/{meta['kind']}/{re.search(r'([a-z]+)', name).group(1)}"
            if meta
            else None
        )
        return js_call(
            "View",
            "md",
            f"""
<div style="display: block; gap: 10px; border-bottom: 1px solid #ddd; padding: 10px 0;">
{title} 
<a style='color: #777; text-decoration: none;' href="{url}">Examples &#8599;</a></div>

"""
            + doc,
        )
    else:
        return js_call("View", "md", "No docstring available.")


# dot([[0, 0], [0, 1], [1, 1], [2, 3], [4, 2], [4, 0]])
