import {Plot, d3, React} from "./imports"
import { $StateContext, WidthContext, AUTOGRID_MIN } from "./context";
import { binding, flatten, html } from "./utils";
import {ellipse} from "./ellipse"

const Marks = {...Plot, ellipse: ellipse}
const { useEffect } = React
export const DEFAULT_PLOT_OPTIONS = { inset: 10 };

/**
 * Wrap plot specs so that our node renderer can identify them.
 */
export class PlotSpec {
    /**
     * Create a new plot spec.
     */
    constructor(spec) {
        this.spec = spec;
    }
}


export class MarkSpec {
    constructor(name, data, options) {
        if (!Marks[name]) {
            throw new Error(`Plot function "${name}" not found.`);
        }
        this.fn = Marks[name];

        options = { ...options }

        // handle dimensional data passed in the 1st position
        if (data.dimensions) {
            options.dimensions = data.dimensions
            data = data.value
        }

        // flatten dimensional data
        if (options.dimensions) {
            data = flatten(data, options.dimensions)
        }

        this.data = data;
        this.options = options;
        this.computed = {}
    }

    compute(width) {
        if (width && this.computed.forWidth == width) {
            return this.computed
        }
        this.extraMarks = [];
        let data = this.data
        let options = { ...this.options }
        let computed = {
            forWidth: width,
            extraMarks: [],
            plotOptions: { ...DEFAULT_PLOT_OPTIONS },
            fn: this.fn
        }

        // Below is where we add functionality to Observable.Plot by preprocessing
        // the data & options that are passed in.

        // handle columnar data in the 1st position
        if (data.constructor === Object && !('length' in data)) {
            let length = null
            data = {... data}
            for (let [key, value] of Object.entries(data)) {
                if (Array.isArray(value)) {
                    options[key] = value;
                    delete data[key]
                    length = value.length
                }
                if (length !== null) {
                    data.length = length
                }
            }
        }
        // handle facetWrap option (grid) with minWidth consideration
        // see https://github.com/observablehq/plot/pull/892/files
        if (options.facetGrid) {
            // Check if data is an array of objects
            if (!Array.isArray(data) || !data.every(item => typeof item === 'object' && item !== null)) {
                throw new Error("Invalid data format: facetGrid expects an array of objects");
            }
            const facetGrid = (typeof options.facetGrid === 'string') ? [options.facetGrid, {}] : options.facetGrid;
            const [key, gridOpts] = facetGrid;
            const keys = Array.from(d3.union(data.map((d) => d[key])));
            const index = new Map(keys.map((key, i) => [key, i]));

            // Calculate columns based on minWidth and containerWidth
            const minWidth = gridOpts.minWidth || AUTOGRID_MIN;
            const columns = gridOpts.columns || Math.floor(width / minWidth);
            const fx = (key) => index.get(key) % columns;
            const fy = (key) => Math.floor(index.get(key) / columns);
            options.fx = (d) => fx(d[key]);
            options.fy = (d) => fy(d[key]);
            computed.plotOptions = { ...computed.plotOptions, fx: { axis: null }, fy: { axis: null } };
            computed.extraMarks.push(Plot.text(keys, {
                fx, fy,
                frameAnchor: "top",
                dy: 4
            }));
        }
        computed.data = data;
        computed.options = options;
        this.computed = computed;
        return computed;
    }
}

function someObject(obj) {
    return Object.keys(obj).length === 0 ? null : obj;
}

export function readMark(mark, width) {

    if (!(mark instanceof MarkSpec)) {
        return mark;
    }
    let { fn, data, options, plotOptions, extraMarks } = mark.compute(width);
    mark = someObject(options) ? fn(data, options) : fn(data)
    mark.plotOptions = plotOptions;
    return [mark, ...extraMarks]
}

export function PlotView({ spec, $state, width }) {
    const [parent, setParent] = React.useState(null)
    const ref = React.useCallback(setParent)
    useEffect(() => {
        if (parent) {
            const startTime = performance.now();
            const plot = binding("$state", $state, () => Plot.plot(spec));
            const endTime = performance.now();
            plot.setAttribute('data-render-time-ms', `${endTime - startTime}`);
            parent.appendChild(plot);
            return () => parent.removeChild(plot)
        }
    }, [spec, parent, width])
    return html`
      <div ref=${ref}></div>
    `
}

function prepareSpec(spec, availableWidth) {
    // handle marks
    const marks = spec.marks.flatMap((m) => readMark(m, availableWidth))
    spec = {...spec,
            ...marks.reduce((acc, mark) => ({ ...acc, ...mark.plotOptions }), {}),
            marks: marks
    }
    // handle color_map
    if (spec.color_map) {
        const [domain, range] = [Object.keys(spec.color_map), Object.values(spec.color_map)];
        spec.color = spec.color
            ? {
                ...spec.color,
                domain: [...(spec.color.domain || []), ...domain],
                range: [...(spec.color.range || []), ...range]
              }
            : { domain, range };
        delete spec.color_map;
    }
    return spec
}

export function PlotWrapper({ spec }) {
    const [$state, set$state] = React.useContext($StateContext)
    const availableWidth = React.useContext(WidthContext)
    spec = prepareSpec(spec, spec.width ?? availableWidth)
    return html`<${PlotView} spec=${spec} $state=${$state} />`
}
