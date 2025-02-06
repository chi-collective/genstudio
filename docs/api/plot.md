# genstudio.plot {: .api .api-title }


## Interactivity

### events {: .api .api-member }

Captures events on a plot.

Parameters
{: .api .api-section }


- `options` (dict[str, Any]): Callback functions. Supported: `onClick`, `onMouseMove`, `onMouseDown`, `onDrawStart`, `onDraw`, `onDrawEnd`.

- `**kwargs`: Additional keyword arguments to be merged with options.


Each callback receives an event object with:

- `type`, the event name
- `x`, the x coordinate
- `y`, the y coordinate
- for draw events, `startTime`

Returns
{: .api .api-section }


- A PlotSpec object representing the events mark. (PlotSpec)



### Frames {: .api .api-member }

Create an animated plot that cycles through a list of frames.

Parameters
{: .api .api-section }


- `frames` (list): A list of plot specifications or renderable objects to animate.

- `key` (str | None): The state key to use for the frame index. If None, uses "frame".

- `slider` (bool): Whether to show the slider control. Defaults to True.

- `tail` (bool): Whether animation should stop at the end. Defaults to False.

- `**opts` (Any): Additional options for the animation, such as fps (frames per second).

Returns
{: .api .api-section }


- A Hiccup-style representation of the animated plot. (LayoutItem)



### Slider {: .api .api-member }

Creates a slider with reactive functionality, allowing for dynamic interaction and animation.

Parameters
{: .api .api-section }


- `key` (str): The key for the reactive variable in the state.

- `init` (Any): Initial value for the variable.

- `range` (Union[int, List[int]]): A list of two values, `[from, until]` (inclusive), to be traversed by `step`. Or a single value `n` which becomes `[from, n-1]`, aligned with python's range(n).

- `rangeFrom` (Any): Derive the range from the length of this (ref) argument.

- `fps` (int): Frames per second for animation through the range. If > 0, enables animation.

- `step` (int): Step size for the range. Defaults to 1.

- `tail` (bool): If True, animation stops at the end of the range. Defaults to False.

- `loop` (bool): If True, animation loops back to start when reaching the end. Defaults to True.

- `label` (str): Label for the slider.

- `showValue` (bool): If True, shows the current value immediately after the label.

- `controls` (list): List of controls to display, such as ["slider", "play", "fps"]. Defaults to ["slider"] if fps is not set, otherwise ["slider", "play"].

- `**kwargs` (Any): Additional keyword arguments.

Returns
{: .api .api-section }


- A Slider component with the specified options.



### renderChildEvents {: .api .api-member }

Creates a render function that adds drag-and-drop and click functionality to child elements of a plot.
Must be passed as the 'render' option to a mark, e.g.:

    Plot.dot(data, render=Plot.renderChildEvents(
        onDrag=update_position,
        onClick=handle_click
    ))

This function enhances the rendering of plot elements by adding interactive behaviors such as dragging, clicking, and tracking position changes. It's designed to work with Observable Plot's rendering pipeline.

Parameters
{: .api .api-section }


- `options` (dict): Configuration options for the child events

- `**kwargs`: Event handlers passed as keyword arguments:

    - `onDragStart` (callable): Callback function called when dragging starts

    - `onDrag` (callable): Callback function called during dragging

    - `onDragEnd` (callable): Callback function called when dragging ends

    - `onClick` (callable): Callback function called when a child element is clicked

Returns
{: .api .api-section }


- A render function to be used in the Observable Plot rendering pipeline. (JSRef)



### onChange {: .api .api-member }

Adds callbacks to be invoked when state changes.

Parameters
{: .api .api-section }


- `callbacks` (dict): A dictionary mapping state keys to callbacks, which are called with (widget, event) when the corresponding state changes.

Returns
{: .api .api-section }


- A Listener object that will be rendered to set up the event handlers.




## Layout


Useful for layouts and custom views.


Note that syntax sugar exists for `Column` (`|`) and `Row` (`&`) using operator overloading.


```


(A & B) | C # A & B on one row, with C below.


```

### Column {: .api .api-member }

Render children in a column.

Parameters
{: .api .api-section }


- `*items` (Any): Items to render in the column

- `**kwargs`: Additional options including:

    heights: List of flex sizes for each child. Can be:

        - Numbers for flex ratios (e.g. [1, 2] means second item is twice as tall)

        - Strings with fractions (e.g. ["1/2", "1/2"] for equal halves)

        - Strings with explicit sizes (e.g. ["100px", "200px"])

    gap: Gap size between items (default: 1)

    className: Additional CSS classes



### Grid {: .api .api-member }

Creates a responsive grid layout that automatically arranges child elements in a grid pattern.

The grid adjusts the number of columns based on the available width and minimum width per item.
Each item maintains consistent spacing controlled by gap parameters.

Parameters
{: .api .api-section }


- `*children`: Child elements to arrange in the grid.

- `**opts`: Grid options including:

    - minWidth (int): Minimum width for each grid item in pixels. Default is 165.

    - gap (int): Gap size for both row and column gaps. Default is 1.

    - rowGap (int): Vertical gap between rows. Overrides gap if specified.

    - colGap (int): Horizontal gap between columns. Overrides gap if specified.

    - cols (int): Fixed number of columns. If not set, columns are calculated based on minWidth.

    - minCols (int): Minimum number of columns. Default is 1.

    - maxCols (int): Maximum number of columns.

    - widths (List[Union[int, str]]): Array of column widths. Can be numbers (for fractions) or strings.

    - heights (List[Union[int, str]]): Array of row heights. Can be numbers (for fractions) or strings.

    - height (str): Container height.

    - style (dict): Additional CSS styles to apply to grid container.

    - className (str): Additional CSS classes to apply.

Returns
{: .api .api-section }


- A grid layout component that will be rendered in the JavaScript runtime.



### Row {: .api .api-member }

Render children in a row.

Parameters
{: .api .api-section }


- `*items` (Any): Items to render in the row

- `**kwargs`: Additional options including:

    widths: List of flex sizes for each child. Can be:

        - Numbers for flex ratios (e.g. [1, 2] means second item is twice as wide)

        - Strings with fractions (e.g. ["1/2", "1/2"] for equal halves)

        - Strings with explicit sizes (e.g. ["100px", "200px"])

    gap: Gap size between items (default: 1)

    className: Additional CSS classes



### cond {: .api .api-member }

Render content based on conditions, like Clojure's cond.

Takes pairs of test/expression arguments, evaluating each test in order.
When a test is truthy, returns its corresponding expression.
An optional final argument serves as the "else" expression.

Parameters
{: .api .api-section }


- `*args`: Alternating test/expression pairs, with optional final else expression



### case {: .api .api-member }

Render content based on matching a value against cases, like a switch statement.

Takes a value to match against, followed by pairs of case/expression arguments.
When a case matches the value, returns its corresponding expression.
An optional final argument serves as the default expression.

Parameters
{: .api .api-section }


- `value` (Union[JSCode, str, Any]): The value to match against cases

- `*args`: Alternating case/expression pairs, with optional final default expression



### html {: .api .api-member }

Wraps a Hiccup-style list to be rendered as an interactive widget in the JavaScript runtime.



### md {: .api .api-member }

Render a string as Markdown, in a LayoutItem.



### JSExpr {: .api .api-member }

A type alias representing JavaScript expressions that can be evaluated in the runtime.




## JavaScript Interop

### js {: .api .api-member }

Represents raw JavaScript code to be evaluated as a LayoutItem.

The code will be evaluated in a scope that includes:
- $state: Current plot state
- html: render HTML using a JavaScript hiccup syntax
- d3: D3.js library
- genstudio.api: roughly, the api exposed via the genstudio.plot module

Parameters
{: .api .api-section }


- `txt` (str): JavaScript code with optional %1, %2, etc. placeholders

- `*params` (Any): Values to substitute for %1, %2, etc. placeholders

- `expression` (bool): Whether to evaluate as expression or statement



### ref {: .api .api-member }

Wraps a value in a `Ref`, which allows for (1) deduplication of re-used values
during serialization, and (2) updating the value of refs in live widgets.

Parameters
{: .api .api-section }


- `value` (Any): Initial value for the reference. If this is already a Ref and no id is provided, returns it unchanged.

- `id` (str): Unique identifier for the reference. If not provided, a UUID will be generated.


Returns:
    Ref: A reference object containing the initial value and id.




## Plot: Mark utilities


Useful for constructing arguments to pass to Mark functions.

### constantly {: .api .api-member }

Returns a javascript function which always returns `x`.

Typically used to specify a constant property for all values passed to a mark,
eg. `plot.dot(values, fill=plot.constantly('My Label'))`. In this example, the
fill color will be assigned (from a color scale) and show up in the color legend.



### identity {: .api .api-member }

Returns a JavaScript identity function.

This function creates a JavaScript snippet that represents an identity function,
which returns its input unchanged.

Returns
{: .api .api-section }


- A JavaScript function that returns its first argument unchanged.



### index {: .api .api-member }

Returns a JavaScript function that returns the index of each data point.

In Observable Plot, this function is useful for creating channels based on
the position of data points in the dataset, rather than their values.

Returns
{: .api .api-section }


- A JavaScript function that takes two arguments (data, index) and returns the index.




## Plot: Marks


The following are the original JavaScript docs for the built-in Observable Plot marks.


Usage is slightly different from Python.

### area {: .api .api-member }

Returns a new area mark with the given *data* and *options*. The area mark is
rarely used directly; it is only needed when the baseline and topline have
neither *x* nor *y* values in common. Use areaY for a horizontal orientation
where the baseline and topline share *x* values, or areaX for a vertical
orientation where the baseline and topline share *y* values.



### areaX {: .api .api-member }

Returns a new vertically-oriented area mark for the given *data* and
*options*, where the baseline and topline share **y** values, as in a
time-series area chart where time goes up↑. For example, to plot Apple’s
daily stock price:

```js
Plot.areaX(aapl, {y: "Date", x: "Close"})
```

If neither **x1** nor **x2** is specified, an implicit stackX transform is
applied and **x** defaults to the identity function, assuming that *data* =
[*x₀*, *x₁*, *x₂*, …]. Otherwise, if only one of **x1** or **x2** is
specified, the other defaults to **x**, which defaults to zero.

If an **interval** is specified, **y** values are binned accordingly,
allowing zeroes for empty bins instead of interpolating across gaps. This is
recommended to “regularize” sampled data; for example, if your data
represents timestamped observations and you expect one observation per day,
use *day* as the **interval**.

Variable aesthetic channels are supported: if the **fill** is defined as a
channel, the area will be broken into contiguous overlapping sections when
the fill color changes; the fill color will apply to the interval spanning
the current data point and the following data point. This behavior also
applies to the **fillOpacity**, **stroke**, **strokeOpacity**,
**strokeWidth**, **opacity**, **href**, **title**, and **ariaLabel**
channels. When any of these channels are used, setting an explicit **z**
channel (possibly to null) is strongly recommended.



### areaY {: .api .api-member }

Returns a new horizontally-oriented area mark for the given *data* and
*options*, where the baseline and topline share **x** values, as in a
time-series area chart where time goes right→. For example, to plot Apple’s
daily stock price:

```js
Plot.areaY(aapl, {x: "Date", y: "Close"})
```

If neither **y1** nor **y2** is specified, an implicit stackY transform is
applied and **y** defaults to the identity function, assuming that *data* =
[*y₀*, *y₁*, *y₂*, …]. Otherwise, if only one of **y1** or **y2** is
specified, the other defaults to **y**, which defaults to zero.

If an **interval** is specified, **x** values are binned accordingly,
allowing zeroes for empty bins instead of interpolating across gaps. This is
recommended to “regularize” sampled data; for example, if your data
represents timestamped observations and you expect one observation per day,
use *day* as the **interval**.

Variable aesthetic channels are supported: if the **fill** is defined as a
channel, the area will be broken into contiguous overlapping sections when
the fill color changes; the fill color will apply to the interval spanning
the current data point and the following data point. This behavior also
applies to the **fillOpacity**, **stroke**, **strokeOpacity**,
**strokeWidth**, **opacity**, **href**, **title**, and **ariaLabel**
channels. When any of these channels are used, setting an explicit **z**
channel (possibly to null) is strongly recommended.



### arrow {: .api .api-member }

Returns a new arrow mark for the given *data* and *options*, drawing
(possibly swoopy) arrows connecting pairs of points. For example, to draw an
arrow connecting an observation from 1980 with an observation from 2015 in a
scatterplot of population and revenue inequality of U.S. cities:

```js
Plot.arrow(inequality, {x1: "POP_1980", y1: "R90_10_1980", x2: "POP_2015", y2: "R90_10_2015", bend: true})
```



### auto {: .api .api-member }

Returns a new mark whose implementation is chosen dynamically to best
represent the dimensions of the given *data* specified in *options*,
according to a few simple heuristics. The auto mark seeks to provide a useful
initial plot as quickly as possible through opinionated defaults, and to
accelerate exploratory analysis by letting you refine views with minimal
changes to code. For example, for a histogram of penguins binned by weight:

```js
Plot.auto(penguins, {x: "body_mass_g"})
```



### barX {: .api .api-member }

Returns a new horizontal bar mark for the given *data* and *options*; the
required *x* values should be quantitative or temporal, and the optional *y*
values should be ordinal. For example, for a horizontal bar chart of English
letter frequency:

```js
Plot.barX(alphabet, {x: "frequency", y: "letter"})
```

If neither **x1** nor **x2** nor **interval** is specified, an implicit
stackX transform is applied and **x** defaults to the identity function,
assuming that *data* = [*x₀*, *x₁*, *x₂*, …]. Otherwise if an **interval** is
specified, then **x1** and **x2** are derived from **x**, representing the
lower and upper bound of the containing interval, respectively. Otherwise, if
only one of **x1** or **x2** is specified, the other defaults to **x**, which
defaults to zero.

The optional **y** ordinal channel specifies the vertical position; it is
typically bound to the *y* scale, which must be a *band* scale. If the **y**
channel is not specified, the bar will span the vertical extent of the plot’s
frame. The barX mark is often used in conjunction with the groupY transform.
For a stacked histogram of penguins by species, colored by sex:

```js
Plot.barX(penguins, Plot.groupY({x: "count"}, {y: "species", fill: "sex"}))
```

If *y* is quantitative, use the rectX mark instead, possibly with a binY
transform. If *x* is ordinal, use the cell mark instead, possibly with a
group transform.

If *options* is undefined, then **y** defaults to the zero-based index of
*data* [0, 1, 2, …], allowing a quick bar chart from an array of numbers:

```js
Plot.barX([4, 9, 24, 46, 66, 7])
```



### barY {: .api .api-member }

Returns a new vertical bar mark for the given *data* and *options*; the
required *y* values should be quantitative or temporal, and the optional *x*
values should be ordinal. For example, for a vertical bar chart of English
letter frequency:

```js
Plot.barY(alphabet, {y: "frequency", x: "letter"})
```

If neither **y1** nor **y2** nor **interval** is specified, an implicit
stackY transform is applied and **y** defaults to the identity function,
assuming that *data* = [*y₀*, *y₁*, *y₂*, …]. Otherwise if an **interval** is
specified, then **y1** and **y2** are derived from **y**, representing the
lower and upper bound of the containing interval, respectively. Otherwise, if
only one of **y1** or **y2** is specified, the other defaults to **y**, which
defaults to zero.

The optional **x** ordinal channel specifies the horizontal position; it is
typically bound to the *x* scale, which must be a *band* scale. If the **x**
channel is not specified, the bar will span the horizontal extent of the
plot’s frame. The barY mark is often used in conjunction with the groupX
transform. For a stacked histogram of penguins by species, colored by sex:

```js
Plot.barY(penguins, Plot.groupX({y: "count"}, {x: "species", fill: "sex"}))
```

If *x* is quantitative, use the rectY mark instead, possibly with a binX
transform. If *y* is ordinal, use the cell mark instead, possibly with a
group transform.

If *options* is undefined, then **x** defaults to the zero-based index of
*data* [0, 1, 2, …], allowing a quick bar chart from an array of numbers:

```js
Plot.barY([4, 9, 24, 46, 66, 7])
```



### boxX {: .api .api-member }

Returns a box mark that draws horizontal boxplots where **x** is quantitative
or temporal and **y**, if present, is ordinal. The box mark is a compound
mark consisting of four marks:

- a rule representing the extreme values (not including outliers),
- a bar representing the interquartile range (trimmed to the data),
- a tick representing the median value, and
- a dot representing outliers, if any.

The given *options* are passed through to these underlying marks, with the
exception of the following options:

- **fill** - the fill color of the bar; defaults to gray
- **fillOpacity** - the fill opacity of the bar; defaults to 1
- **stroke** - the stroke color of the rule, tick, and dot; defaults to *currentColor*
- **strokeOpacity** - the stroke opacity of the rule, tick, and dot; defaults to 1
- **strokeWidth** - the stroke width of the tick; defaults to 2



### boxY {: .api .api-member }

Returns a box mark that draws vertical boxplots where **y** is quantitative
or temporal and **x**, if present, is ordinal. The box mark is a compound
mark consisting of four marks:

- a rule representing the extreme values (not including outliers),
- a bar representing the interquartile range (trimmed to the data),
- a tick representing the median value, and
- a dot representing outliers, if any.

The given *options* are passed through to these underlying marks, with the
exception of the following options:

- **fill** - the fill color of the bar; defaults to gray
- **fillOpacity** - the fill opacity of the bar; defaults to 1
- **stroke** - the stroke color of the rule, tick, and dot; defaults to *currentColor*
- **strokeOpacity** - the stroke opacity of the rule, tick, and dot; defaults to 1
- **strokeWidth** - the stroke width of the tick; defaults to 2



### cell {: .api .api-member }

Returns a rectangular cell mark for the given *data* and *options*. Along
with **x** and/or **y**, a **fill** channel is typically specified to encode
value as color. For example, for a heatmap of the IMDb ratings of Simpons
episodes by season:

```js
Plot.cell(simpsons, {x: "number_in_season", y: "season", fill: "imdb_rating"})
```

If neither **x** nor **y** are specified, *data* is assumed to be an array of
pairs [[*x₀*, *y₀*], [*x₁*, *y₁*], [*x₂*, *y₂*], …] such that **x** = [*x₀*,
*x₁*, *x₂*, …] and **y** = [*y₀*, *y₁*, *y₂*, …].

Both **x** and **y** should be ordinal; if only **x** is quantitative (or
temporal), use a barX mark; if only **y** is quantitative, use a barY mark;
if both are quantitative, use a rect mark.



### cellX {: .api .api-member }

Like cell, but **x** defaults to the zero-based index [0, 1, 2, …], and if
**stroke** is not a channel, **fill** defaults to the identity function,
assuming that *data* = [*x₀*, *x₁*, *x₂*, …]. For a quick horizontal stripe
map visualizating an array of numbers:

```js
Plot.cellX(values)
```



### cellY {: .api .api-member }

Like cell, but **y** defaults to the zero-based index [0, 1, 2, …], and if
**stroke** is not a channel, **fill** defaults to the identity function,
assuming that *data* = [*y₀*, *y₁*, *y₂*, …]. For a quick vertical stripe map
visualizating an array of numbers:

```js
Plot.cellY(values)
```



### circle {: .api .api-member }

Like dot, except that the **symbol** option is set to *circle*.



### dot {: .api .api-member }

Returns a new dot mark for the given *data* and *options* that draws circles,
or other symbols, as in a scatterplot. For example, a scatterplot of sales by
fruit type (category) and units sold (quantitative):

```js
Plot.dot(sales, {x: "units", y: "fruit"})
```

If either **x** or **y** is not specified, the default is determined by the
**frameAnchor** option. If none of **x**, **y**, and **frameAnchor** are
specified, *data* is assumed to be an array of pairs [[*x₀*, *y₀*], [*x₁*,
*y₁*], [*x₂*, *y₂*], …] such that **x** = [*x₀*, *x₁*, *x₂*, …] and **y** =
[*y₀*, *y₁*, *y₂*, …].

Dots are sorted by descending radius **r** by default to mitigate
overplotting; set the **sort** option to null to draw them in input order.



### dotX {: .api .api-member }

Like dot, except that **x** defaults to the identity function, assuming that
*data* = [*x₀*, *x₁*, *x₂*, …].

```js
Plot.dotX(cars.map(d => d["economy (mpg)"]))
```

If an **interval** is specified, such as *day*, **y** is transformed to the
middle of the interval.



### dotY {: .api .api-member }

Like dot, except that **y** defaults to the identity function, assuming that
*data* = [*y₀*, *y₁*, *y₂*, …].

```js
Plot.dotY(cars.map(d => d["economy (mpg)"]))
```

If an **interval** is specified, such as *day*, **x** is transformed to the
middle of the interval.



### image {: .api .api-member }

Returns a new image mark for the given *data* and *options* that draws images
as in a scatterplot. For example, portraits of U.S. presidents by date of
inauguration and favorability:

```js
Plot.image(presidents, {x: "inauguration", y: "favorability", src: "portrait"})
```

If either **x** or **y** is not specified, the default is determined by the
**frameAnchor** option. If none of **x**, **y**, and **frameAnchor** are
specified, *data* is assumed to be an array of pairs [[*x₀*, *y₀*], [*x₁*,
*y₁*], [*x₂*, *y₂*], …] such that **x** = [*x₀*, *x₁*, *x₂*, …] and **y** =
[*y₀*, *y₁*, *y₂*, …].



### line {: .api .api-member }

Returns a new line mark for the given *data* and *options* by connecting
control points. If neither the **x** nor **y** options are specified, *data*
is assumed to be an array of pairs [[*x₀*, *y₀*], [*x₁*, *y₁*], [*x₂*, *y₂*],
…] such that **x** = [*x₀*, *x₁*, *x₂*, …] and **y** = [*y₀*, *y₁*, *y₂*, …].

Points along the line are connected in input order. If there are multiple
series via the **z**, **fill**, or **stroke** channel, series are drawn in
input order such that the last series is drawn on top. Typically *data* is
already in sorted order, such as chronological for time series; if needed,
consider a **sort** transform.

If any **x** or **y** values are invalid (undefined, null, or NaN), the line
will be interrupted, resulting in a break that divides the line shape into
multiple segments. If a line segment consists of only a single point, it may
appear invisible unless rendered with rounded or square line caps. In
addition, some curves such as *cardinal-open* only render a visible segment
if it contains multiple points.

Variable aesthetic channels are supported: if the **stroke** is defined as a
channel, the line will be broken into contiguous overlapping segments when
the stroke color changes; the stroke color will apply to the interval
spanning the current data point and the following data point. This behavior
also applies to the **fill**, **fillOpacity**, **strokeOpacity**,
**strokeWidth**, **opacity**, **href**, **title**, and **ariaLabel**
channels. When any of these channels are used, setting an explicit **z**
channel (possibly to null) is strongly recommended.



### lineX {: .api .api-member }

Like line, except that **x** defaults to the identity function assuming that
*data* = [*x₀*, *x₁*, *x₂*, …] and **y** defaults to the zero-based index [0,
1, 2, …]. For example, to draw a vertical line chart of a temperature series:

```js
Plot.lineX(observations, {x: "temperature"})
```

The **interval** option is recommended to “regularize” sampled data via an
implicit binY transform. For example, if your data represents timestamped
temperature measurements and you expect one sample per day, use *day* as the
interval:

```js
Plot.lineX(observations, {y: "date", x: "temperature", interval: "day"})
```



### lineY {: .api .api-member }

Like line, except **y** defaults to the identity function and assumes that
*data* = [*y₀*, *y₁*, *y₂*, …] and **x** defaults to the zero-based index [0,
1, 2, …]. For example, to draw a horizontal line chart of a temperature
series:

```js
Plot.lineY(observations, {y: "temperature"})
```

The **interval** option is recommended to “regularize” sampled data via an
implicit binX transform. For example, if your data represents timestamped
temperature measurements and you expect one sample per day, use *day* as the
interval:

```js
Plot.lineY(observations, {x: "date", y: "temperature", interval: "day"})
```



### link {: .api .api-member }

Returns a new link mark for the given *data* and *options*, drawing line
segments (curves) connecting pairs of points. For example, to draw a link
connecting an observation from 1980 with an observation from 2015 in a
scatterplot of population and revenue inequality of U.S. cities:

```js
Plot.link(inequality, {x1: "POP_1980", y1: "R90_10_1980", x2: "POP_2015", y2: "R90_10_2015"})
```

If the plot uses a spherical **projection**, the default *auto* **curve**
will render links as geodesics; to draw a straight line instead, use the
*linear* **curve**.



### rect {: .api .api-member }

Returns a rect mark for the given *data* and *options*. The rectangle extends
horizontally from **x1** to **x2**, and vertically from **y1** to **y2**. The
position channels are often derived with a transform. For example, for a
heatmap of athletes, binned by weight and height:

```js
Plot.rect(athletes, Plot.bin({fill: "proportion"}, {x: "weight", y: "height"}))
```

When **y** extends from zero, for example for a histogram where the height of
each rect reflects a count of values, use the rectY mark for an implicit
stackY transform; similarly, if **x** extends from zero, use the rectX mark
for an implicit stackX transform.

If an **interval** is specified, then **x1** and **x2** are derived from
**x**, and **y1** and **y2** are derived from **y**, each representing the
lower and upper bound of the containing interval, respectively.

Both *x* and *y* should be quantitative or temporal; otherwise, use a bar or
cell mark.



### rectX {: .api .api-member }

Like rect, but if neither **x1** nor **x2** is specified, an implicit stackX
transform is applied to **x**, and if **x** is not specified, it defaults to
the identity function, assuming that *data* is an array of numbers [*x₀*,
*x₁*, *x₂*, …]. For example, for a vertical histogram of athletes by height
with rects aligned at *x* = 0:

```js
Plot.rectX(olympians, Plot.binY({x: "count"}, {y: "height"}))
```



### rectY {: .api .api-member }

Like rect, but if neither **y1** nor **y2** is specified, apply an implicit
stackY transform is applied to **y**, and if **y** is not specified, it
defaults to the identity function, assuming that *data* is an array of
numbers [*y₀*, *y₁*, *y₂*, …]. For example, for a horizontal histogram of
athletes by weight with rects aligned at *y* = 0:

```js
Plot.rectY(olympians, Plot.binX({y: "count"}, {x: "weight"}))
```



### ruleX {: .api .api-member }

Returns a new horizontally-positioned ruleX mark (a vertical line, |) for the
given *data* and *options*. The **x** channel specifies the rule’s horizontal
position and defaults to identity, assuming that *data* = [*x₀*, *x₁*, *x₂*,
…]; the optional **y1** and **y2** channels specify its vertical extent. For
example, for a candlestick chart of Apple’s daily stock price:

```js
Plot.ruleX(aapl, {x: "Date", y1: "Open", y2: "Close"})
```

The ruleX mark is often used to highlight specific *x* values. For example,
to draw a rule at *x* = 0:

```js
Plot.ruleX([0])
```

If *y* represents ordinal values, use a tickX mark instead.



### ruleY {: .api .api-member }

Returns a new vertically-positioned ruleY mark (a horizontal line, —) for the
given *data* and *options*. The **y** channel specifies the vertical position
of the rule and defaults to identity, assuming that *data* = [*y₀*, *y₁*,
*y₂*, …]; the optional **x1** and **x2** channels specify its horizontal
extent. For example, to bin Apple’s daily stock price by month, plotting a
sequence of barcodes showing monthly distributions:

```js
Plot.ruleY(aapl, {x: "Date", y: "Close", interval: "month"})
```

The ruleY mark is often used to highlight specific *y* values. For example,
to draw a rule at *y* = 0:

```js
Plot.ruleY([0])
```

If *x* represents ordinal values, use a tickY mark instead.



### spike {: .api .api-member }

Like vector, but with default *options* suitable for drawing a spike map. For
example, to show city populations:

```js
Plot.spike(cities, {x: "longitude", y: "latitude", stroke: "red", length: "population"})
```



### text {: .api .api-member }

    Returns a new text mark for the given *data* and *options*. The **text**
    channel specifies the textual contents of the mark, which may be preformatted
    with line breaks (
,
, or ), or wrapped or clipped using the
    **lineWidth** and **textOverflow** options.

    If **text** contains numbers or dates, a default formatter will be applied,
    and the **fontVariant** will default to *tabular-nums* instead of *normal*.
    For more control, consider [*number*.toLocaleString][1],
    [*date*.toLocaleString][2], [d3-format][3], or [d3-time-format][4]. If
    **text** is not specified, it defaults to the identity function for primitive
    data (such as numbers, dates, and strings), and to the zero-based index [0,
    1, 2, …] for objects (so that something identifying is visible by default).

    If either **x** or **y** is not specified, the default is determined by the
    **frameAnchor** option. If none of **x**, **y**, and **frameAnchor** are
    specified, *data* is assumed to be an array of pairs [[*x₀*, *y₀*], [*x₁*,
    *y₁*], [*x₂*, *y₂*], …] such that **x** = [*x₀*, *x₁*, *x₂*, …] and **y** =
    [*y₀*, *y₁*, *y₂*, …].

    [1]: https://observablehq.com/@mbostock/number-formatting
    [2]: https://observablehq.com/@mbostock/date-formatting
    [3]: https://d3js.org/d3-format
    [4]: https://d3js.org/d3-time-format



### textX {: .api .api-member }

Like text, but **x** defaults to the identity function, assuming that *data*
= [*x₀*, *x₁*, *x₂*, …]. For example to display tick label-like marks at the
top of the frame:

```js
Plot.textX([10, 15, 20, 25, 30], {frameAnchor: "top"})
```

If an **interval** is specified, such as *day*, **y** is transformed to the
middle of the interval.



### textY {: .api .api-member }

Like text, but **y** defaults to the identity function, assuming that *data*
= [*y₀*, *y₁*, *y₂*, …]. For example to display tick label-like marks on the
right of the frame:

```js
Plot.textY([10, 15, 20, 25, 30], {frameAnchor: "right"})
```

If an **interval** is specified, such as *day*, **x** is transformed to the
middle of the interval.



### vector {: .api .api-member }

Returns a new vector mark for the given *data* and *options*. For example, to
create a vector field from spatial samples of wind observations:

```js
Plot.vector(wind, {x: "longitude", y: "latitude", length: "speed", rotate: "direction"})
```

If none of **frameAnchor**, **x**, and **y** are specified, then **x** and
**y** default to accessors assuming that *data* contains tuples [[*x₀*,
*y₀*], [*x₁*, *y₁*], [*x₂*, *y₂*], …]



### vectorX {: .api .api-member }

Like vector, but **x** instead defaults to the identity function and **y**
defaults to null, assuming that *data* is an array of numbers [*x₀*, *x₁*,
*x₂*, …].



### vectorY {: .api .api-member }

Like vector, but **y** instead defaults to the identity function and **x**
defaults to null, assuming that *data* is an array of numbers [*y₀*, *y₁*,
*y₂*, …].



### waffleX {: .api .api-member }

Returns a new horizonta waffle mark for the given *data* and *options*; the
required *x* values should be quantitative, and the optional *y* values
should be ordinal. For example, for a horizontal waffle chart of Olympic
athletes by sport:

```js
Plot.waffleX(olympians, Plot.groupY({x: "count"}, {y: "sport"}))
```

If neither **x1** nor **x2** nor **interval** is specified, an implicit
stackX transform is applied and **x** defaults to the identity function,
assuming that *data* = [*x₀*, *x₁*, *x₂*, …]. Otherwise if an **interval** is
specified, then **x1** and **x2** are derived from **x**, representing the
lower and upper bound of the containing interval, respectively. Otherwise, if
only one of **x1** or **x2** is specified, the other defaults to **x**, which
defaults to zero.

The optional **y** ordinal channel specifies the vertical position; it is
typically bound to the *y* scale, which must be a *band* scale. If the **y**
channel is not specified, the waffle will span the vertical extent of the
plot’s frame. Because a waffle represents a discrete number of square cells,
it may not use all of the available bandwidth.

If *options* is undefined, then **y** defaults to the zero-based index of
*data* [0, 1, 2, …], allowing a quick waffle chart from an array of numbers:

```js
Plot.waffleX([4, 9, 24, 46, 66, 7])
```



### waffleY {: .api .api-member }

Returns a new vertical waffle mark for the given *data* and *options*; the
required *y* values should be quantitative, and the optional *x* values
should be ordinal. For example, for a vertical waffle chart of Olympic
athletes by sport:

```js
Plot.waffleY(olympians, Plot.groupX({y: "count"}, {x: "sport"}))
```

If neither **y1** nor **y2** nor **interval** is specified, an implicit
stackY transform is applied and **y** defaults to the identity function,
assuming that *data* = [*y₀*, *y₁*, *y₂*, …]. Otherwise if an **interval** is
specified, then **y1** and **y2** are derived from **y**, representing the
lower and upper bound of the containing interval, respectively. Otherwise, if
only one of **y1** or **y2** is specified, the other defaults to **y**, which
defaults to zero.

The optional **x** ordinal channel specifies the horizontal position; it is
typically bound to the *x* scale, which must be a *band* scale. If the **x**
channel is not specified, the waffle will span the horizontal extent of the
plot’s frame. Because a waffle represents a discrete number of square cells,
it may not use all of the available bandwidth.

If *options* is undefined, then **x** defaults to the zero-based index of
*data* [0, 1, 2, …], allowing a quick waffle chart from an array of numbers:

```js
Plot.waffleY([4, 9, 24, 46, 66, 7])
```




## Plot: Transforms

### bin {: .api .api-member }

Bins on the **x** and **y** channels; then subdivides bins on the first
channel of **z**, **fill**, or **stroke**, if any; and lastly for each
channel in the specified *outputs*, applies the corresponding *reduce* method
to produce new channel values from the binned input channel values. Each
*reduce* method may be one of:

- a named reducer implementation such as *count* or *sum*
- a function that takes an array of values and returns the reduced value
- an object that implements the *reduceIndex* method

For example, for a heatmap of observed culmen lengths and depths:

```js
Plot.rect(penguins, Plot.bin({fill: "count"}, {x: "culmen_depth_mm", y: "culmen_length_mm"}))
```

The bin transform is often used with the rect mark to make heatmaps; it is
intended for aggregating continuous quantitative or temporal data, such as
temperatures or times, into discrete bins. See the group transform for
ordinal or categorical data.

If neither **x** nor **y** are in *options*, then **x** and **y** default to
accessors assuming that *data* contains tuples [[*x₀*, *y₀*], [*x₁*, *y₁*],
[*x₂*, *y₂*], …]. If **x** is not in *outputs*, by default produces **x1**
and **x2** output channels representing the horizontal extent of each bin and
a **x** output channel representing the horizontal midpoint, say for for
labels. Likewise if **y** is not in *outputs*, by default produces **y1** and
**y2** output channels representing the vertical extent of each bin and a
**y** output channel representing the vertical midpoint. The **insetTop**,
**insetRight**, **insetBottom**, and **insetLeft** options default to 0.5.



### binX {: .api .api-member }

Bins on the **x** channel; then subdivides bins on the first channel of
**z**, **fill**, or **stroke**, if any; then further subdivides bins on the
**y** channel, if any and if none of **y**, **y1**, and **y2** are in
*outputs*; and lastly for each channel in the specified *outputs*, applies
the corresponding *reduce* method to produce new channel values from the
binned input channel values. Each *reduce* method may be one of:

- a named reducer implementation such as *count* or *sum*
- a function that takes an array of values and returns the reduced value
- an object that implements the *reduceIndex* method

For example, for a histogram of observed culmen lengths:

```js
Plot.rectY(penguins, Plot.binX({y: "count"}, {x: "culmen_length_mm"}))
```

The binX transform is often used with the rectY mark to make histograms; it
is intended for aggregating continuous quantitative or temporal data, such as
temperatures or times, into discrete bins. See the groupX transform for
ordinal or categorical data.

If **x** is not in *options*, it defaults to identity. If **x** is not in
*outputs*, by default produces **x1** and **x2** output channels representing
the extent of each bin and an **x** output channel representing the bin
midpoint, say for for labels. If **y** is not in outputs, **y1** and **y2**
will be dropped from the returned *options*. The **insetLeft** and
**insetRight** options default to 0.5.



### binY {: .api .api-member }

Bins on the **y** channel; then subdivides bins on the first channel of
**z**, **fill**, or **stroke**, if any; then further subdivides bins on the
**x** channel, if any and if none of **x**, **x1**, and **x2** are in
*outputs*; and lastly for each channel in the specified *outputs*, applies
the corresponding *reduce* method to produce new channel values from the
binned input channel values. Each *reduce* method may be one of:

- a named reducer implementation such as *count* or *sum*
- a function that takes an array of values and returns the reduced value
- an object that implements the *reduceIndex* method

For example, for a histogram of observed culmen lengths:

```js
Plot.rectX(penguins, Plot.binY({x: "count"}, {y: "culmen_length_mm"}))
```

The binY transform is often used with the rectX mark to make histograms; it
is intended for aggregating continuous quantitative or temporal data, such as
temperatures or times, into discrete bins. See the groupY transform for
ordinal or categorical data.

If **y** is not in *options*, it defaults to identity. If **y** is not in
*outputs*, by default produces **y1** and **y2** output channels representing
the extent of each bin and a **y** output channel representing the bin
midpoint, say for for labels. If **x** is not in outputs, **x1** and **x2**
will be dropped from the returned *options*. The **insetTop** and
**insetBottom** options default to 0.5.



### bollinger {: .api .api-member }

Given the specified bollinger *options*, returns a corresponding map
implementation for use with the map transform, allowing the bollinger
transform to be applied to arbitrary channels instead of only *x* and *y*.
For example, to compute the upper volatility band:

```js
Plot.map({y: Plot.bollinger({n: 20, k: 2})}, {x: "Date", y: "Close"})
```

Here the *k* option defaults to zero instead of two.



### bollingerX {: .api .api-member }

Returns a new vertically-oriented bollinger mark for the given *data* and
*options*, as in a time-series area chart where time goes up↑ (or down↓).

If the *x* option is not specified, it defaults to the identity function, as
when data is an array of numbers [*x*₀, *x*₁, *x*₂, …]. If the *y* option is
not specified, it defaults to [0, 1, 2, …].



### bollingerY {: .api .api-member }

Returns a new horizontally-oriented bollinger mark for the given *data* and
*options*, as in a time-series area chart where time goes right→ (or ←left).

If the *y* option is not specified, it defaults to the identity function, as
when data is an array of numbers [*y*₀, *y*₁, *y*₂, …]. If the *x* option is
not specified, it defaults to [0, 1, 2, …].



### centroid {: .api .api-member }

Given a **geometry** input channel of GeoJSON geometry, derives **x** and
**y** output channels representing the planar (projected) centroids of the
geometry. The centroids are computed in screen coordinates according to the
plot’s associated **projection** (or *x* and *y* scales), if any.

For centroids of spherical geometry, see Plot.geoCentroid.



### cluster {: .api .api-member }

Shorthand for the tree mark using [d3.cluster][1] as the **treeLayout**
option, placing leaf nodes of the tree at the same depth. Equivalent to:

```js
Plot.tree(data, {...options, treeLayout: d3.cluster, textLayout: "mirrored"})
```

[1]: https://d3js.org/d3-hierarchy/cluster



### density {: .api .api-member }

Returns a mark that draws contours representing the estimated density of the
two-dimensional points given by **x** and **y**, and possibly weighted by
**weight**. If either **x** or **y** is not specified, it defaults to the
respective middle of the plot’s frame.

If the **stroke** or **fill** is specified as *density*, a color channel is
constructed with values representing the density threshold value of each
contour.



### differenceX {: .api .api-member }

Returns a new horizontal difference mark for the given the specified *data*
and *options*, as in a time-series chart where time goes down↓ (or up↑).

The mark is a composite of a positive area, negative area, and line. The
positive area extends from the left of the frame to the line, and is clipped
by the area extending from the comparison to the right of the frame. The
negative area conversely extends from the right of the frame to the line, and
is clipped by the area extending from the comparison to the left of the
frame.



### differenceY {: .api .api-member }

Returns a new vertical difference mark for the given the specified *data* and
*options*, as in a time-series chart where time goes right→ (or ←left).

The mark is a composite of a positive area, negative area, and line. The
positive area extends from the bottom of the frame to the line, and is
clipped by the area extending from the comparison to the top of the frame.
The negative area conversely extends from the top of the frame to the line,
and is clipped by the area extending from the comparison to the bottom of the
frame.



### dodgeX {: .api .api-member }

Given a **y** position channel, derives a new **x** position channel that
places circles of the given radius **r** to avoid overlap. The order in which
circles are placed, which defaults to descending radius **r** to place the
largest circles first, significantly affects the overall layout; use the
**sort** or **reverse** mark options to change the order.

If *dodgeOptions* is a string, it is shorthand for the dodge **anchor**.



### dodgeY {: .api .api-member }

Given an **x** position channel, derives a new **y** position channel that
places circles of the given radius **r** to avoid overlap. The order in which
circles are placed, which defaults to descending radius **r** to place the
largest circles first, significantly affects the overall layout; use the
**sort** or **reverse** mark options to change the order.

If *dodgeOptions* is a string, it is shorthand for the dodge **anchor**.



### filter {: .api .api-member }

Applies a transform to *options* to filter the mark’s index according to the
given *test*, which can be a function (receiving the datum *d* and index *i*)
or a channel value definition such as a field name; only truthy values are
retained in the index. For example, to show only data whose body mass is
greater than 3,000g:

```js
Plot.filter((d) => d.body_mass_g > 3000, options)
```

Note that filtering only affects the rendered mark index, not the associated
channel values, and thus has no effect on imputed scale domains.



### find {: .api .api-member }

Given the specified *test* function, returns a corresponding reducer
implementation for use with the group or bin transform. The reducer returns
the first channel value for which the *test* function returns a truthy value.



### group {: .api .api-member }

Groups on the **x** and **y** channels; then subdivides groups on the first
channel of **z**, **fill**, or **stroke**, if any; and then for each channel
in the specified *outputs*, applies the corresponding *reduce* method to
produce new channel values from the grouped input channel values. Each
*reduce* method may be one of:

- a named reducer implementation such as *count* or *sum*
- a function that takes an array of values and returns the reduced value
- an object that implements the *reduceIndex* method

For example, for a heatmap of penguins by species and island:

```js
Plot.cell(penguins, Plot.group({fill: "count"}, {x: "island", y: "species"}))
```

The group transform is often used with the cell mark to make heatmaps; it is
intended for aggregating ordinal or categorical data, such as names. See the
bin transform for continuous data.

If neither **x** nor **y** are in *options*, then **x** and **y** default to
accessors assuming that *data* contains tuples [[*x₀*, *y₀*], [*x₁*, *y₁*],
[*x₂*, *y₂*], …]. If **x** is not in *outputs*, it defaults to *first*, and
the **x1** and **x2** channels, if any, will be dropped from the returned
*options*. Likewise if **y** is not in *outputs*, it defaults to *first*, and
the **y1** and **y2** channels, if any, will be dropped from the returned
*options*.



### groupX {: .api .api-member }

Groups on the **x** channel; then subdivides groups on the first channel of
**z**, **fill**, or **stroke**, if any; and then for each channel in the
specified *outputs*, applies the corresponding *reduce* method to produce new
channel values from the grouped input channel values. Each *reduce* method
may be one of:

- a named reducer implementation such as *count* or *sum*
- a function that takes an array of values and returns the reduced value
- an object that implements the *reduceIndex* method

For example, for a vertical bar chart of species by total mass:

```js
Plot.barY(penguins, Plot.groupX({y: "sum"}, {x: "species", y: "body_mass_g"}))
```

The groupX transform is often used with the barY mark to make bar charts; it
is intended for aggregating ordinal or categorical data, such as names. See
the binX transform for continuous data.

If **x** is not in *options*, it defaults to identity. If **x** is not in
*outputs*, it defaults to *first*, and the **x1** and **x2** channels, if
any, will be dropped from the returned *options*.



### groupY {: .api .api-member }

Groups on the **y** channel; then subdivides groups on the first channel of
**z**, **fill**, or **stroke**, if any; and then for each channel in the
specified *outputs*, applies the corresponding *reduce* method to produce new
channel values from the grouped input channel values. Each *reduce* method
may be one of:

- a named reducer implementation such as *count* or *sum*
- a function that takes an array of values and returns the reduced value
- an object that implements the *reduceIndex* method

For example, for a horizontal bar chart of species by total mass:

```js
Plot.barX(penguins, Plot.groupY({x: "sum"}, {y: "species", x: "body_mass_g"}))
```

The groupY transform is often used with the barX mark to make bar charts; it
is intended for aggregating ordinal or categorical data, such as names. See
the binY transform for continuous data.

If **y** is not in *options*, it defaults to identity. If **y** is not in
*outputs*, it defaults to *first*, and the **y1** and **y2** channels, if
any, will be dropped from the returned *options*.



### groupZ {: .api .api-member }

Groups on the first channel of **z**, **fill**, or **stroke**, if any, and
then for each channel in the specified *outputs*, applies the corresponding
*reduce* method to produce new channel values from the grouped input channel
values. Each *reduce* method may be one of:

- a named reducer implementation such as *count* or *sum*
- a function that takes an array of values and returns the reduced value
- an object that implements the *reduceIndex* method

For example, for a horizontal stacked bar chart:

```js
Plot.barX(penguins, Plot.groupZ({x: "proportion"}, {fill: "species"}))
```



### hexbin {: .api .api-member }

Bins hexagonally on the scaled **x** and **y** channels; then subdivides bins
on the first channel of **z**, **fill**, or **stroke**, if any; and lastly
for each channel in the specified *outputs*, applies the corresponding
*reduce* method to produce new channel values from the binned input channel
values. Each *reduce* method may be one of:

- a named reducer implementation such as *count* or *sum*
- a function that takes an array of values and returns the reduced value
- an object that implements the *reduceIndex* method

For example, for a heatmap of observed culmen lengths and depths:

```js
Plot.dot(penguins, Plot.hexbin({fill: "count"}, {x: "culmen_depth_mm", y: "culmen_length_mm"}))
```

The hexbin transform can be applied to any mark that consumes **x** and
**y**, such as the dot, image, text, and vector marks; it is intended for
aggregating continuous quantitative or temporal data, such as temperatures or
times, into discrete hexagonal bins. For the dot mark, the **symbol** option
defaults to *hexagon*, and the *r* option defaults to half the **binWidth**.
If a **fill** output channel is declared, the **stroke** option defaults to
*none*.

To draw empty hexagons, see the hexgrid mark.



### hull {: .api .api-member }

Returns a mark that draws a convex hull around the points given by the **x**
and **y** channels. The **stroke** option defaults to _currentColor_ and the
**fill** option defaults to _none_. When an aesthetic channel is specified
(such as **stroke** or **strokeWidth**), the hull inherits the corresponding
channel value from one of its constituent points arbitrarily.

If **z** is specified, the input points are grouped by *z*, producing a
separate hull for each group. If **z** is not specified, it defaults to the
**fill** channel, if any, or the **stroke** channel, if any.



### map {: .api .api-member }

Groups on the first channel of **z**, **fill**, or **stroke**, if any, and
then for each channel in the specified *outputs*, applies the corresponding
*map* method to produce new channel values for each series. Each *map* method
may be one of:

- a named map implementation such as *cumsum* or *rank*
- a function to be passed an array of values, returning new values
- an object that implements the *mapIndex* method

For example, to produce a cumulative sum of random numbers on the **y**
channel:

```js
Plot.map({y: "cumsum"}, {y: d3.randomNormal()})
```



### mapX {: .api .api-member }

Groups on the first channel of **z**, **fill**, or **stroke**, if any, and
then applies the specified *map* method to each of the **x**, **x1**, and
**x2** channels in the specified *options* to produce new channel values for
each series. The *map* method may be one of:

- a named map implementation such as *cumsum* or *rank*
- a function to be passed an array of values, returning new values
- an object that implements the *mapIndex* method

For example, to produce a cumulative sum of random numbers on the **x**
channel:

```js
Plot.mapX("cumsum", {x: d3.randomNormal()})
```



### mapY {: .api .api-member }

Groups on the first channel of **z**, **fill**, or **stroke**, if any, and
then applies the specified map method to each of the **y**, **y1**, and
**y2** channels in the specified *options* to produce new channel values for
each series. The *map* method may be one of:

- a named map implementation such as *cumsum* or *rank*
- a function to be passed an array of values, returning new values
- an object that implements the *mapIndex* method

For example, to produce a cumulative sum of random numbers on the **y**
channel:

```js
Plot.mapY("cumsum", {y: d3.randomNormal()})
```



### normalize {: .api .api-member }

Given a normalize *basis*, returns a corresponding map implementation for use
with the map transform, allowing the normalization of arbitrary channels
instead of only **x** and **y**. For example, to normalize the **title**
channel:

```js
Plot.map({title: Plot.normalize("first")}, {x: "Date", title: "Close", stroke: "Symbol"})
```



### normalizeX {: .api .api-member }

Groups data into series using the first channel of **z**, **fill**, or
**stroke** (if any), then derives new **x**, **x1**, and **x2** channels for
each corresponding input channel by normalizing to the given *basis*. For
example, if the series values are [*x₀*, *x₁*, *x₂*, …] and the *first* basis
is used, the derived series values would be [*x₀* / *x₀*, *x₁* / *x₀*, *x₂* /
*x₀*, …] as in an index chart.



### normalizeY {: .api .api-member }

Groups data into series using the first channel of **z**, **fill**, or
**stroke** (if any), then derives new **y**, **y1**, and **y2** channels for
each corresponding input channel by normalizing to the given *basis*. For
example, if the series values are [*y₀*, *y₁*, *y₂*, …] and the *first* basis
is used, the derived series values would be [*y₀* / *y₀*, *y₁* / *y₀*, *y₂* /
*y₀*, …] as in an index chart.



### reverse {: .api .api-member }

Applies a transform to *options* to reverse the order of the mark’s index,
say for reverse input order.



### select {: .api .api-member }

Groups on the first channel of **z**, **fill**, or **stroke**, if any, and
then selects points from each series based on the given *selector*. For
example to select the maximum point of the **y** channel, as selectMaxY:

```js
Plot.text(data, Plot.select({y: "max"}, options))
```



### selectFirst {: .api .api-member }

Groups on the first channel of **z**, **fill**, or **stroke**, if any, and
then selects the first point from each series in input order.



### selectLast {: .api .api-member }

Groups on the first channel of **z**, **fill**, or **stroke**, if any, and
then selects the last point from each series in input order.



### selectMaxX {: .api .api-member }

Groups on the first channel of **z**, **fill**, or **stroke**, if any, and
then selects the maximum point from each series based on **x** channel value.



### selectMaxY {: .api .api-member }

Groups on the first channel of **z**, **fill**, or **stroke**, if any, and
then selects the maximum point from each series based on **y** channel value.



### selectMinX {: .api .api-member }

Groups on the first channel of **z**, **fill**, or **stroke**, if any, and
then selects the minimum point from each series based on **x** channel value.



### selectMinY {: .api .api-member }

Groups on the first channel of **z**, **fill**, or **stroke**, if any, and
then selects the minimum point from each series based on **y** channel value.



### shiftX {: .api .api-member }

Groups data into series using the first channel of *z*, *fill*, or *stroke*
(if any), then derives *x1* and *x2* output channels by shifting the input
*x* channel according to the specified *interval*.



### shiftY {: .api .api-member }

Groups data into series using the first channel of *z*, *fill*, or *stroke*
(if any), then derives *y1* and *y2* output channels by shifting the input
*y* channel according to the specified *interval*.



### shuffle {: .api .api-member }

Applies a transform to *options* to randomly shuffles the mark’s index. If a
**seed** is specified, a linear congruential generator with the given seed is
used to generate random numbers deterministically; otherwise, Math.random is
used.



### sort {: .api .api-member }

Applies a transform to *options* to sort the mark’s index by the specified
*order*. The *order* is one of:

- a function for comparing data, returning a signed number
- a channel value definition for sorting given values in ascending order
- a {value, order} object for sorting given values
- a {channel, order} object for sorting the named channel’s values

For example, to render marks in order of ascending body mass:

```js
Plot.sort("body_mass_g", options)
```



### stackX {: .api .api-member }

Transforms a length channel **x** into starting and ending position channels
**x1** and **x2** by “stacking” elements that share a given **y** position.
The starting position of each element equals the ending position of the
preceding element in the stack. Non-positive values are stacked to the left
of zero, with **x2** to the left of **x1**. A new **x** channel is derived
that represents the midpoint between **x1** and **x2**, for example to place
a label. If not specified, the input channel **x** defaults to the constant
one.



### stackX1 {: .api .api-member }

Like **stackX**, but returns the starting position **x1** as the **x**
channel, for example to position a dot on the left-hand side of each element
of a stack.



### stackX2 {: .api .api-member }

Like **stackX**, but returns the starting position **x2** as the **x**
channel, for example to position a dot on the right-hand side of each element
of a stack.



### stackY {: .api .api-member }

Transforms a length channel **y** into starting and ending position channels
**y1** and **y2** by “stacking” elements that share a given **x** position.
The starting position of each element equals the ending position of the
preceding element in the stack. Non-positive values are stacked below zero,
with **y2** below **y1**. A new **y** channel is derived that represents the
midpoint between **y1** and **y2**, for example to place a label. If not
specified, the input channel **y** defaults to the constant one.



### stackY1 {: .api .api-member }

Like **stackY**, but returns the starting position **y1** as the **y**
channel, for example to position a dot at the bottom of each element of a
stack.



### stackY2 {: .api .api-member }

Like **stackY**, but returns the ending position **y2** as the **y** channel,
for example to position a dot at the top of each element of a stack.



### transform {: .api .api-member }

Given an *options* object that may specify some basic transforms (**filter**,
**sort**, or **reverse**) or a custom **transform**, composes those
transforms with the given *transform* function, returning a new *options*
object.

If a custom **transform** is present on the given *options*, any basic
transforms are ignored. Any additional input *options* are passed through in
the returned *options* object. This method facilitates applying basic
transforms prior to applying the given *transform* and is used internally by
Plot’s built-in transforms.

The given *transform* runs after the existing transforms in *options*. Throws
an error if the given *options* define an **initializer**, since mark
transforms must run before mark initializers.



### window {: .api .api-member }

Given the specified window *options*, returns a corresponding map
implementation for use with the map transform, allowing the window transform
to be applied to arbitrary channels instead of only *x* and *y*. For example,
to compute a rolling average for the *title* channel:

```js
Plot.map({title: Plot.window(24)}, {x: "Date", title: "Anomaly"})
```

If *options* is a number, it is shorthand for the window size **k**.



### windowX {: .api .api-member }

Groups data into series using the first channel of *z*, *fill*, or *stroke*
(if any), then derives new *x*, *x1*, and *x2* channels by computing a moving
window of channel values and deriving reduced values from the window. For
example, to compute a rolling average in *x*:

```js
Plot.windowX(24, {x: "Anomaly", y: "Date"});
```

If *windowOptions* is a number, it is shorthand for the window size **k**.



### windowY {: .api .api-member }

Groups data into series using the first channel of *z*, *fill*, or *stroke*
(if any), then derives new *y*, *y1*, and *y2* channels by computing a moving
window of channel values and deriving reduced values from the window. For
example, to compute a rolling average in *y*:

```js
Plot.windowY(24, {x: "Date", y: "Anomaly"});
```

If *windowOptions* is a number, it is shorthand for the window size **k**.




## Plot: Axes and grids

### axisFx {: .api .api-member }

Returns a new compound axis mark to document the visual encoding of the
horizontal facet position *fx* scale, comprised of (up to) three marks: a
vector for ticks, a text for tick labels, and another text for an axis label.
The *data* defaults to the *fx* scale’s domain; if desired, specify the axis
mark’s *data* explicitly, or use one of the **ticks**, **tickSpacing**, or
**interval** options.

The **facetAnchor** and **frameAnchor** options defaults to **anchor**. The
default margins likewise depend on **anchor** as follows; in order of
**marginTop**, **marginRight**, **marginBottom**, and **marginLeft**, in
pixels:

- *top* - 30, 20, 0, 20
- *bottom* - 0, 20, 30, 20

For simplicity, and for consistent layout across plots, default axis margins
are not affected by tick labels. If tick labels are too long, either increase
the margin or shorten the labels, say by using the **textOverflow** and
**lineWidth** options to clip, or using the **tickRotate** option to rotate.



### axisFy {: .api .api-member }

Returns a new compound axis mark to document the visual encoding of the
vertical facet position *fy* scale, comprised of (up to) three marks: a
vector for ticks, a text for tick labels, and another text for an axis label.
The *data* defaults to the *fy* scale’s domain; if desired, specify the axis
mark’s *data* explicitly, or use one of the **ticks**, **tickSpacing**, or
**interval** options.

The **facetAnchor** option defaults to *right-empty* if **anchor** is
*right*, and *left-empty* if **anchor** is *left*. The default margins
likewise depend on **anchor** as follows; in order of **marginTop**,
**marginRight**, **marginBottom**, and **marginLeft**, in pixels:

- *right* - 20, 40, 20, 0
- *left* - 20, 0, 20, 40

For simplicity, and for consistent layout across plots, default axis margins
are not affected by tick labels. If tick labels are too long, either increase
the margin or shorten the labels, say by using the **textOverflow** and
**lineWidth** options to clip.



### axisX {: .api .api-member }

Returns a new compound axis mark to document the visual encoding of the
horizontal position *x* scale, comprised of (up to) three marks: a vector for
ticks, a text for tick labels, and another text for an axis label. The *data*
defaults to tick values sampled from the *x* scale’s domain; if desired,
specify the axis mark’s *data* explicitly, or use one of the **ticks**,
**tickSpacing**, or **interval** options.

The **facetAnchor** option defaults to *bottom-empty* if **anchor** is
*bottom*, and *top-empty* if **anchor** is *top*. The default margins
likewise depend on **anchor** as follows; in order of **marginTop**,
**marginRight**, **marginBottom**, and **marginLeft**, in pixels:

- *top* - 30, 20, 0, 20
- *bottom* - 0, 20, 30, 20

For simplicity, and for consistent layout across plots, default axis margins
are not affected by tick labels. If tick labels are too long, either increase
the margin or shorten the labels: use the *k* SI-prefix tick format; use the
**transform** *x*-scale option to show thousands or millions; or use the
**textOverflow** and **lineWidth** options to clip; or use the **tickRotate**
option to rotate.



### axisY {: .api .api-member }

Returns a new compound axis mark to document the visual encoding of the
vertical position *y* scale, comprised of (up to) three marks: a vector for
ticks, a text for tick labels, and another text for an axis label. The *data*
defaults to tick values sampled from the *y* scale’s domain; if desired,
specify the axis mark’s *data* explicitly, or use one of the **ticks**,
**tickSpacing**, or **interval** options.

The **facetAnchor** option defaults to *right-empty* if **anchor** is
*right*, and *left-empty* if **anchor** is *left*. The default margins
likewise depend on **anchor** as follows; in order of **marginTop**,
**marginRight**, **marginBottom**, and **marginLeft**, in pixels:

- *right* - 20, 40, 20, 0
- *left* - 20, 0, 20, 40

For simplicity, and for consistent layout across plots, default axis margins
are not affected by tick labels. If tick labels are too long, either increase
the margin or shorten the labels: use the *k* SI-prefix tick format; use the
**transform** *y*-scale option to show thousands or millions; or use the
**textOverflow** and **lineWidth** options to clip.



### gridFx {: .api .api-member }

Returns a new horizontally-positioned ruleX mark (a vertical line, |) that
renders a grid for the *fx* scale. The *data* defaults to the *fx* scale’s
domain; if desired, specify the *data* explicitly, or use the **ticks**
option.



### gridFy {: .api .api-member }

Returns a new vertically-positioned ruleY mark (a horizontal line, —) that
renders a grid for the *fy* scale. The *data* defaults to the *fy* scale’s
domain; if desired, specify the *data* explicitly, or use the **ticks**
option.



### gridX {: .api .api-member }

Returns a new horizontally-positioned ruleX mark (a vertical line, |) that
renders a grid for the *x* scale. The *data* defaults to tick values sampled
from the *x* scale’s domain; if desired, specify the *data* explicitly, or
use one of the **ticks**, **tickSpacing**, or **interval** options.



### gridY {: .api .api-member }

Returns a new vertically-positioned ruleY mark (a horizontal line, —) that
renders a grid for the *y* scale. The *data* defaults to tick values sampled
from the *y* scale’s domain; if desired, specify the *data* explicitly, or
use one of the **ticks**, **tickSpacing**, or **interval** options.



### tickX {: .api .api-member }

Returns a new horizontally-positioned tickX mark (a vertical line, |) for the
given *data* and *options*. The **x** channel specifies the tick’s horizontal
position and defaults to identity, assuming that *data* = [*x₀*, *x₁*, *x₂*,
…]; the optional **y** ordinal channel specifies its vertical position. For
example, for a horizontal barcode plot of penguins’ weights:

```js
Plot.tickX(penguins, {x: "body_mass_g", y: "sex", stroke: "species"})
```

If *y* represents quantitative or temporal values, use a ruleX mark instead.



### tickY {: .api .api-member }

Returns a new vertically-positioned tickY mark (a horizontal line, —) for the
given *data* and *options*. The **y** channel specifies the vertical position
of the tick and defaults to identity, assuming that *data* = [*y₀*, *y₁*,
*y₂*, …]; the optional **x** ordinal channel specifies its horizontal
position. For example, for a vertical barcode plot of penguins’ weights:

```js
Plot.tickY(penguins, {y: "body_mass_g", x: "sex", stroke: "species"})
```

If *x* represents quantitative or temporal values, use a ruleY mark instead.




## Plot: Geo features

### geo {: .api .api-member }

Returns a new geo mark with the given *data* and *options*. The **geometry**
channel, which defaults to the identity function assuming that *data* is a
GeoJSON object or an iterable of GeoJSON objects, is projected to the plane
using the plot’s top-level **projection**. For example, for a choropleth map
of county polygons with a *rate* property:

```js
Plot.geo(counties, {fill: (d) => d.properties.rate})
```

If *data* is a GeoJSON feature collection, then the mark’s data is
*data*.features; if *data* is a GeoJSON geometry collection, then the mark’s
data is *data*.geometries; if *data* is some other GeoJSON object, then the
mark’s data is the single-element array [*data*].



### geoCentroid {: .api .api-member }

Given a **geometry** input channel of spherical GeoJSON geometry, derives
**x** and **y** output channels representing the spherical centroids of the
geometry.

For planar (projected) centroids, see Plot.centroid.



### graticule {: .api .api-member }

Returns a new geo mark whose *data* is a 10° global graticule. (For use with
a spherical **projection** only.) For more control, use [d3.geoGraticule][1]
with the geo mark.

[1]: https://d3js.org/d3-geo/shape#geoGraticule



### sphere {: .api .api-member }

Returns a new geo mark whose *data* is the outline of the sphere on the
projection’s plane. (For use with a spherical **projection** only.)




## Plot: Delaunay/Voronoi

### delaunayLink {: .api .api-member }

Returns a mark that draws links for each edge of the Delaunay triangulation
of the points given by the **x** and **y** channels. Like the link mark,
except that **x1**, **y1**, **x2**, and **y2** are derived automatically from
**x** and **y**. When an aesthetic channel is specified (such as **stroke**
or **strokeWidth**), the link inherits the corresponding channel value from
one of its two endpoints arbitrarily.

If **z** is specified, the input points are grouped by *z*, producing a
separate Delaunay triangulation for each group.



### delaunayMesh {: .api .api-member }

Returns a mark that draws a mesh of the Delaunay triangulation of the points
given by the **x** and **y** channels. The **stroke** option defaults to
_currentColor_, and the **strokeOpacity** defaults to 0.2; the **fill**
option is not supported. When an aesthetic channel is specified (such as
**stroke** or **strokeWidth**), the mesh inherits the corresponding channel
value from one of its constituent points arbitrarily.

If **z** is specified, the input points are grouped by *z*, producing a
separate Delaunay triangulation for each group.



### voronoi {: .api .api-member }

Returns a mark that draws polygons for each cell of the Voronoi tesselation
of the points given by the **x** and **y** channels.

If **z** is specified, the input points are grouped by *z*, producing a
separate Voronoi tesselation for each group.



### voronoiMesh {: .api .api-member }

Returns a mark that draws a mesh for the cell boundaries of the Voronoi
tesselation of the points given by the **x** and **y** channels. The
**stroke** option defaults to _currentColor_, and the **strokeOpacity**
defaults to 0.2. The **fill** option is not supported. When an aesthetic
channel is specified (such as **stroke** or **strokeWidth**), the mesh
inherits the corresponding channel value from one of its constituent points
arbitrarily.

If **z** is specified, the input points are grouped by *z*, producing a
separate Voronoi tesselation for each group.




## Plot: Trees and networks

### tree {: .api .api-member }

Returns a compound tree mark, with a link to display edges from parent to
child, a dot to display nodes, and a text to display node labels.

The tree layout is computed via the treeLink and treeNode transforms, which
transform a tabular dataset into a hierarchy according to the given **path**
input channel, which must contain **delimiter**-separated strings (forward
slash by default); then executes a tree layout algorithm, by default
[Reingold–Tilford’s “tidy” algorithm][1].

[1]: https://d3js.org/d3-hierarchy/tree



### treeLink {: .api .api-member }

Populates the *x1*, *y1*, *x2*, and *y2* channels, and applies the following
defaults: **curve** is *bump-x*, **stroke** is #555, **strokeWidth** is 1.5,
and **strokeOpacity** is 0.5. This transform is intended to be used with
link, arrow, and other two-point-based marks. This transform is rarely used
directly; see the tree mark.

The treeLink transform will derive output columns for any *options* that have
one of the following named link values:

* *node:name* - the child node’s name (the last part of its path)
* *node:path* - the child node’s full, normalized, slash-separated path
* *node:internal* - true if the child node is internal, or false for leaves
* *node:external* - true if the child node is a leaf, or false for external nodes
* *node:depth* - the distance from the child node to the root
* *node:height* - the distance from the child node to its deepest descendant
* *parent:name* - the parent node’s name (the last part of its path)
* *parent:path* - the parent node’s full, normalized, slash-separated path
* *parent:depth* - the distance from the parent node to the root
* *parent:height* - the distance from the parent node to its deepest descendant

In addition, if any option value is specified as an object with a **node**
method, a derived output column will be generated by invoking the **node**
method for each child node in the tree; likewise if any option value is
specified as an object with a **link** method, a derived output column will
be generated by invoking the **link** method for each link in the tree, being
passed two node arguments, the child and the parent.



### treeNode {: .api .api-member }

Populates the *x* and *y* channels with the positions for each node, and
applies a default **frameAnchor** based on the specified **treeAnchor**. This
transform is intended to be used with dot, text, and other point-based marks.
This transform is rarely used directly; see the tree mark.

The treeNode transform will derive output columns for any *options* that have
one of the following named node values:

* *node:name* - the node’s name (the last part of its path)
* *node:path* - the node’s full, normalized, slash-separated path
* *node:internal* - true if the node is internal, or false for leaves
* *node:external* - true if the node is a leaf, or false for internal nodes
* *node:depth* - the distance from the node to the root
* *node:height* - the distance from the node to its deepest descendant

In addition, if any option value is specified as an object with a **node**
method, a derived output column will be generated by invoking the **node**
method for each node in the tree.




## Plot: Interactivity

### crosshair {: .api .api-member }

Returns a new crosshair mark for the given *data* and *options*, drawing
horizontal and vertical rules centered at the point closest to the pointer.
The corresponding **x** and **y** values are also drawn just outside the
bottom and left sides of the frame, respectively, typically on top of the
axes. If either **x** or **y** is not specified, the crosshair will be
one-dimensional.



### crosshairX {: .api .api-member }

Like crosshair, but uses the pointerX transform: the determination of the
closest point is heavily weighted by the *x* (horizontal↔︎) position; this
should be used for plots where *x* represents the independent variable, such
as time in a time-series chart, or the aggregated dimension when grouping or
binning.



### crosshairY {: .api .api-member }

Like crosshair, but uses the pointerY transform: the determination of the
closest point is heavily weighted by the *y* (vertical↕︎) position; this
should be used for plots where *y* represents the independent variable, such
as time in a time-series chart, or the aggregated dimension when grouping or
binning.



### pointer {: .api .api-member }

Applies a render transform to the specified *options* to filter the mark
index such that only the point closest to the pointer is rendered; the mark
will re-render interactively in response to pointer events.



### pointerX {: .api .api-member }

Like the pointer transform, except the determination of the closest point
considers mostly the *x* (horizontal↔︎) position; this should be used for
plots where *x* is the dominant dimension, such as time in a time-series
chart, the binned quantitative dimension in a histogram, or the categorical
dimension of a bar chart.



### pointerY {: .api .api-member }

Like the pointer transform, except the determination of the closest point
considers mostly the *y* (vertical↕︎) position; this should be used for plots
where *y* is the dominant dimension, such as time in a time-series chart, the
binned quantitative dimension in a histogram, or the categorical dimension of
a bar chart.



### tip {: .api .api-member }

Returns a new tip mark for the given *data* and *options*.

If either **x** or **y** is not specified, the default is determined by the
**frameAnchor** option. If none of **x**, **y**, and **frameAnchor** are
specified, *data* is assumed to be an array of pairs [[*x₀*, *y₀*], [*x₁*,
*y₁*], [*x₂*, *y₂*], …] such that **x** = [*x₀*, *x₁*, *x₂*, …] and **y** =
[*y₀*, *y₁*, *y₂*, …].




## Plot: Formatting and interpolation

### formatIsoDate {: .api .api-member }

Given a *date*, returns the shortest equivalent ISO 8601 UTC string. If the
given *date* is not valid, returns `"Invalid Date"`.



### formatMonth {: .api .api-member }

Returns a function that formats a given month number (from 0 = January to 11
= December) according to the specified *locale* and *format*.

[1]: https://tools.ietf.org/html/bcp47
[2]: https://tc39.es/ecma402/#datetimeformat-objects



### formatNumber {: .api .api-member }

Returns a function that formats a given number according to the specified
*locale*.

[1]: https://tools.ietf.org/html/bcp47



### formatWeekday {: .api .api-member }

Returns a function that formats a given week day number (from 0 = Sunday to 6
= Saturday) according to the specified *locale* and *format*.

[1]: https://tools.ietf.org/html/bcp47
[2]: https://tc39.es/ecma402/#datetimeformat-objects



### interpolatorBarycentric {: .api .api-member }

Constructs a Delaunay triangulation of the samples, and then for each pixel
in the raster grid, determines the triangle that covers the pixel’s centroid
and interpolates the values associated with the triangle’s vertices using
[barycentric coordinates][1]. If the interpolated values are ordinal or
categorical (_i.e._, anything other than numbers or dates), then one of the
three values will be picked randomly weighted by the barycentric coordinates;
the given *random* number generator will be used, which defaults to a [linear
congruential generator][2] with a fixed seed (for deterministic results).

[1]: https://en.wikipedia.org/wiki/Barycentric_coordinate_system
[2]: https://d3js.org/d3-random#randomLcg



### interpolatorRandomWalk {: .api .api-member }

For each pixel in the raster grid, initiates a random walk, stopping when
either the walk is within a given distance (**minDistance**) of a sample or
the maximum allowable number of steps (**maxSteps**) have been taken, and
then assigning the current pixel the closest sample’s value. The random walk
uses the “walk on spheres” algorithm in two dimensions described by [Sawhney
and Crane][1], SIGGRAPH 2020.

[1]: https://www.cs.cmu.edu/~kmcrane/Projects/MonteCarloGeometryProcessing/index.html



### numberInterval {: .api .api-member }

Given a number *period*, returns a corresponding numeric range interval. If
*period* is a negative number, the returned interval uses 1 / -*period*,
allowing greater precision when *period* is a negative integer.



### timeInterval {: .api .api-member }

Given a string *period*, returns a corresponding local time nice interval.



### utcInterval {: .api .api-member }

Given a string *period*, returns a corresponding UTC nice interval.




## Plot: Other utilities

### new {: .api .api-member }

Create a new PlotSpec from the given specs and options.



### frame {: .api .api-member }

Draws a rectangle around the plot’s frame, or if an **anchor** is given, a
line on the given side. Useful for visual separation of facets, or in
conjunction with axes and grids to fill the frame’s background.



### hexagon {: .api .api-member }

Like dot, except that the **symbol** option is set to *hexagon*.



### hexgrid {: .api .api-member }

The hexgrid decoration mark complements the hexbin transform, showing the
outlines of all hexagons spanning the frame with a default **stroke** of
*currentColor* and a default **strokeOpacity** of 0.1, similar to the the
default axis grids. For example:

```js
Plot.plot({
  marks: [
    Plot.hexagon(Plot.hexbin({fill: "count"}, {binWidth: 12, x: "weight", y: "economy"})),
    Plot.hexgrid({binWidth: 12})
  ]
})
```

Note that the **binWidth** option of the hexgrid mark should match that of
the hexbin transform. The grid is clipped by the frame. This is a stroke-only
mark, and **fill** is not supported; to fill the frame, use the frame mark.



### legend {: .api .api-member }

Generates a standalone legend for the scale defined by the given *options*,
returning either an SVG or HTML element depending on the scale and the
desired legend type. Currently supports only *color*, *opacity*, and *symbol*
scales.



### linearRegressionX {: .api .api-member }

Like linearRegressionY, but where *x* is the dependent variable and *y* is
the independent variable. This orientation is infrequently used, but suitable
for example when visualizing a time-series where time goes up↑; use
linearRegressionY instead if time goes right→.



### linearRegressionY {: .api .api-member }

Returns a mark that draws [linear regression][1] lines with confidence bands,
representing the estimated relation of a dependent variable (*y*) on an
independent variable (*x*). For example to estimate the linear dependence of
horsepower (*hp*) on weight (*wt*):

```js
Plot.linearRegressionY(mtcars, {x: "wt", y: "hp"})
```

The linear regression line is fit using the [least squares][2] approach. See
Torben Jansen’s [“Linear regression with confidence bands”][3] and [this
StatExchange question][4] for details on the confidence interval calculation.

Multiple regressions can be produced by specifying a **z**, **fill**, or
**stroke** channel.

[1]: https://en.wikipedia.org/wiki/Linear_regression
[2]: https://en.wikipedia.org/wiki/Least_squares
[3]: https://observablehq.com/@toja/linear-regression-with-confidence-bands
[4]: https://stats.stackexchange.com/questions/101318/understanding-shape-and-calculation-of-confidence-bands-in-linear-regression



### raster {: .api .api-member }

Returns a raster mark which renders a raster image from spatial samples. If
*data* is provided, it represents discrete samples in abstract coordinates
**x** and **y**; the **fill** and **fillOpacity** channels specify further
abstract values (_e.g._, height in a topographic map) to be spatially
interpolated to produce an image.

```js
Plot.raster(volcano.values, {width: volcano.width, height: volcano.height})
```

The **fill** and **fillOpacity** channels may alternatively be specified as
functions *f*(*x*, *y*) to be evaluated at each pixel centroid of the raster
grid (without interpolation).

```js
Plot.raster({x1: -1, x2: 1, y1: -1, y2: 1, fill: (x, y) => Math.atan2(y, x)})
```

If **width** is specified, **x1** defaults to 0 and **x2** defaults to
**width**; likewise, if **height** is specified, **y1** defaults to 0 and
**y2** defaults to **height**. Otherwise, if *data* is specified, **x1**,
**y1**, **x2**, and **y2** respectively default to the frame’s left, top,
right, and bottom coordinates. Lastly, if *data* is not specified (as when
**value** is a function of *x* and *y*), you must specify all of **x1**,
**x2**, **y1**, and **y2** to define the raster domain.



### scale {: .api .api-member }

Returns a standalone scale given the specified scale *options*, which must
define exactly one named scale. For example, for a default *linear* *color*
scale:

```js
const color = Plot.scale({color: {type: "linear"}});
```



### valueof {: .api .api-member }

Given some *data* and a channel *value* definition (such as a field name or
function accessor), returns an array of the specified *type* containing the
corresponding values derived from *data*. If *type* is not specified, it
defaults to Array; otherwise it must be an Array or TypedArray subclass.

The returned array is not guaranteed to be new; when the *value* is a channel
transform or an array that is an instance of the given *type*, the array may
be returned as-is without making a copy.




## Plot: Options Helpers

### aspectRatio {: .api .api-member }

Sets `{"aspectRatio": r}`.



### caption {: .api .api-member }

Sets `{"caption": caption}`.



### clip {: .api .api-member }

Sets `{"clip": True}`.



### colorLegend {: .api .api-member }

Sets `{"color": {"legend": True}}`.



### colorMap {: .api .api-member }

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



### colorScheme {: .api .api-member }

Sets `{"color": {"scheme": <name>}}`.



### domain {: .api .api-member }

Sets domain for x and optionally y scales.



### domainX {: .api .api-member }

Sets `{"x": {"domain": d}}`.



### domainY {: .api .api-member }

Sets `{"y": {"domain": d}}`.



### grid {: .api .api-member }

Sets grid lines for x and/or y axes.



### height {: .api .api-member }

Sets `{"height": height}`.



### hideAxis {: .api .api-member }

Sets `{"axis": None}` for specified axes.



### inset {: .api .api-member }

Sets `{"inset": i}`.



### margin {: .api .api-member }

Set margin values for a plot using CSS-style margin shorthand.

Parameters
{: .api .api-section }


- `*args` (Any): Margin values as integers or floats, following CSS margin shorthand rules

Returns
{: .api .api-section }


- A dictionary mapping margin properties to their values (dict)



### repeat {: .api .api-member }

For passing columnar data to Observable.Plot which should repeat/cycle.
eg. for a set of 'xs' that are to be repeated for each set of `ys`.



### size {: .api .api-member }

Sets width and height, using size for both if height not specified.



### subtitle {: .api .api-member }

Sets `{"subtitle": subtitle}`.



### title {: .api .api-member }

Sets `{"title": title}`.



### width {: .api .api-member }

Sets `{"width": width}`.




## Custom plot functions

### ellipse {: .api .api-member }

Returns a new ellipse mark for the given *values* and *options*.

If neither **x** nor **y** are specified, *values* is assumed to be an array of
pairs [[*x₀*, *y₀*], [*x₁*, *y₁*], [*x₂*, *y₂*, …] such that **x** = [*x₀*,
*x₁*, *x₂*, …] and **y** = [*y₀*, *y₁*, *y₂*, …].

The **rx** and **ry** options specify the x and y radii respectively. If only
**r** is specified, it is used for both radii. The optional **rotate** option
specifies rotation in degrees.

Additional styling options such as **fill**, **stroke**, and **strokeWidth**
can be specified to customize the appearance of the ellipses.

Parameters
{: .api .api-section }


- `values` (Any): The data for the ellipses.

- `options` (dict[str, Any]): Additional options for customizing the ellipses.

- `**kwargs`: Additional keyword arguments to be merged with options.

Returns
{: .api .api-section }


- A PlotSpec object representing the ellipse mark. (PlotSpec)



### histogram {: .api .api-member }

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



### img {: .api .api-member }

The image mark renders images on the plot. The **src** option specifies the
image source, while **x**, **y**, **width**, and **height** define the image's
position and size in the x/y scales. This differs from the built-in Observable Plot
image mark, which specifies width/height in pixels.

Parameters
{: .api .api-section }


- `values`: The data for the images.

- `options` (dict[str, Any]): Options for customizing the images.

- `**kwargs`: Additional keyword arguments to be merged with options.

Returns
{: .api .api-section }


- A PlotSpec object representing the image mark. (PlotSpec)


The following options are supported:
- `src`: The source path of the image.
- `x`: The x-coordinate of the top-left corner.
- `y`: The y-coordinate of the top-left corner.
- `width`: The width of the image.
- `height`: The height of the image.



### bylight {: .api .api-member }

Creates a highlighted code block using the [Bylight library](https://mhuebert.github.io/bylight/).

Parameters
{: .api .api-section }


- `source` (str): The source text/code to highlight

- `patterns` (list): A list of patterns to highlight. Each pattern can be either:

    - A string to match literally

    - A dict with 'match' (required) and 'color' (optional) keys

- `props` (dict): Additional properties to pass to the pre element. Defaults to {}.

Returns
{: .api .api-section }


- A Bylight component that renders the highlighted code block.




## Utility functions

### doc {: .api .api-member }

Decorator to display the docstring of a python function formatted as Markdown.

Parameters
{: .api .api-section }


- `fn`: The function whose docstring to display.

Returns
{: .api .api-section }


- A JSCall instance



### initialState {: .api .api-member }

Initializes state variables in the Plot widget.

Parameters
{: .api .api-section }


- `values` (dict[str, Any]): A dictionary mapping state variable names to their initial values.

- `sync` (Union[set[str], bool, None]): Controls which state variables are synced between Python and JavaScript.

    If True, all variables are synced. If a set, only variables in the set are synced.

    If None or False, no variables are synced. Defaults to None.

Returns
{: .api .api-section }


- An object that initializes the state variables when rendered. (JSCall)



### get_in {: .api .api-member }

Reads data from a nested structure, giving names to dimensions and leaves along the way.

This function traverses nested data structures like dictionaries and lists, allowing you to extract
and label nested dimensions. It supports Python dicts/lists as well as GenJAX traces and choicemaps.

Parameters
{: .api .api-section }


- `data` (Union[Dict, Any]): The nested data structure to traverse. Can be a dict, list, or GenJAX object.

- `path` (List[Union[str, Dict]]): A list of path segments describing how to traverse the data. Each segment can be:

    - A string key to index into a dict

    - A dict with {...} to traverse a list dimension, giving it a name

    - A dict with "leaves" to mark terminal values

Returns
{: .api .api-section }


- Either a Dimensioned object containing the extracted data and dimension metadata, (Any)

- or the raw extracted value if no dimensions were named in the path. (Any)



### dimensions {: .api .api-member }

Attaches dimension metadata, for further processing in JavaScript.



### Import {: .api .api-member }

Import JavaScript code into the GenStudio environment.

Parameters
{: .api .api-section }


- `source` (str): JavaScript source code. Can be:

    - Inline JavaScript code

    - URL starting with http(s):// for remote modules

    - Local file path starting with path: prefix

- `alias` (Optional[str]): Namespace alias for the entire module

- `default` (Optional[str]): Name for the default export

- `refer` (Optional[list[str]]): Set of names to import directly, or True to import all

- `refer_all` (bool): Alternative to refer=True

- `rename` (Optional[dict[str, str]]): Dict of original->new names for referred imports

- `exclude` (Optional[list[str]]): Set of names to exclude when using refer_all

- `format` (str): Module format ('esm' or 'commonjs')

Examples
{: .api .api-section }


```python
[(<DocstringSectionKind.text: 'text'>, '# CDN import with namespace alias'), (<DocstringSectionKind.examples: 'examples'>, '>>> Plot.Import(\n...     source="https://cdn.skypack.dev/lodash-es",\n...     alias="_",\n...     refer=["flattenDeep", "partition"],\n...     rename={"flattenDeep": "deepFlatten"}\n... )'), (<DocstringSectionKind.text: 'text'>, '# Local file import'), (<DocstringSectionKind.examples: 'examples'>, '>>> Plot.Import(\n...     source="path:src/app/utils.js",  # relative to working directory\n...     refer=["formatDate"]\n... )'), (<DocstringSectionKind.text: 'text'>, '# Inline source with refer_all'), (<DocstringSectionKind.examples: 'examples'>, '>>> Plot.Import(\n...     source=\'\'\'\n...     export const add = (a, b) => a + b;\n...     export const subtract = (a, b) => a - b;\n...     \'\'\',\n...     refer_all=True,\n...     exclude=["subtract"]\n... )'), (<DocstringSectionKind.text: 'text'>, '# Default export handling'), (<DocstringSectionKind.examples: 'examples'>, '>>> Plot.Import(\n...     source="https://cdn.skypack.dev/d3-scale",\n...     default="createScale"\n... )')]
```
