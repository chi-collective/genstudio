import { $StateContext, AUTOGRID_MIN as AUTOGRID_MIN_WIDTH } from "./context";
import { MarkSpec, PlotSpec } from "./plot";
import * as Plot from "@observablehq/plot";
import bylight from "bylight";
import * as d3 from "d3";
import MarkdownIt from "markdown-it";
import * as mobxReact from "mobx-react-lite";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import * as render from "./plot/render";
import {Grid, Row, Column} from "./layout"
import { joinClasses, tw } from "./utils";
const { useState, useEffect, useContext, useRef, useCallback } = React
import Katex from "katex";
import markdownItKatex from "./markdown-it-katex";
import * as scene3d from "./scene3d/scene3d"

export { render, scene3d };

export const CONTAINER_PADDING = 10;
const KATEX_CSS_URL = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"

let katexCssLoaded = false;
function loadKatexCss() {
    if (katexCssLoaded) return;
    if (!document.querySelector(`link[href="${KATEX_CSS_URL}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = KATEX_CSS_URL;
        document.head.appendChild(link);
    }
    katexCssLoaded = true;
}

export function katex(tex) {
    const containerRef = useRef(null);

    loadKatexCss();

    useEffect(() => {
        if (containerRef.current) {
            try {
                Katex.render(tex, containerRef.current, {
                    throwOnError: false
                });
            } catch (error) {
                console.error('Error rendering KaTeX:', error);
            }
        }
    }, [tex]);

    return <div ref={containerRef} />;
}

const MarkdownItInstance = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    quotes: `""''`,


});

MarkdownItInstance.use(markdownItKatex)

export function md(options, text) {
    if (typeof options === 'string' && !text) {
        text = options;
        options = {};
    }
    loadKatexCss();

    return <div className={tw(joinClasses("prose", options.className))} dangerouslySetInnerHTML={{ __html: MarkdownItInstance.render(text) }} />;
}

export const Slider = mobxReact.observer(
    function (options) {
        let { state_key,
            fps,
            label,
            loop = true,
            init, range, rangeFrom, showValue, tail, step,
            controls,
            className,
            style } = options;

        // Set default controls based on fps
        if (!controls) {
            controls = fps ? ["slider", "play"] : ["slider"];
        }
        controls = controls || []
        if (options.showSlider === false) {
            controls = controls.filter(control => control !== "slider");
        }
        if (options.showFps === true) {
            controls.push("fps");
        }

        let rangeMin, rangeMax;
        if (rangeFrom) {
            // determine range dynamically based on last index of rangeFrom
            rangeMin = 0;
            rangeMax = rangeFrom.length - 1;
        } else if (typeof range === 'number') {
            // range may be specified a number representing the length of a collection
            rangeMin = 0;
            rangeMax = range - 1;
        } else if (range) {
            [rangeMin, rangeMax] = range;
        }

        step = step || 1;

        const $state = useContext($StateContext);
        const isAnimated = fps === 'raf' || (typeof fps === 'number' && fps > 0);
        const [isPlaying, setIsPlaying] = useState(isAnimated);
        const lastFrameTimeRef = useRef(performance.now());
        const frameCountRef = useRef(0);
        const lastLogTimeRef = useRef(performance.now());
        const [currentFps, setCurrentFps] = useState(0);

        useEffect(() => {
            if ($state[state_key] === undefined) {
                if (init === undefined) {
                    if (rangeMin === undefined) {
                        throw new Error("Slider: 'init', 'rangeFrom', or 'range' must be defined");
                    }
                    $state[state_key] = rangeMin;
                } else {
                    $state[state_key] = init;
                }
            }
        }, [init, rangeMin, rangeMax, state_key]);

        const sliderValue = clamp($state[state_key] ?? rangeMin, rangeMin, rangeMax);

        const updateFrameAndState = useCallback(() => {
            const now = performance.now();
            frameCountRef.current++;

            // Log FPS once per second
            if (now - lastLogTimeRef.current >= 500) {
                const fps = frameCountRef.current * 1000 / (now - lastLogTimeRef.current);
                setCurrentFps(Math.round(fps));
                frameCountRef.current = 0;
                lastLogTimeRef.current = now;
            }

            lastFrameTimeRef.current = now;

            $state[state_key] = (prevValue) => {
                const nextValue = (prevValue || 0) + step;
                if (nextValue > rangeMax) {
                    if (tail) {
                        return rangeMax;
                    } else if (loop) {
                        return rangeMin;
                    } else {
                        setIsPlaying(false);
                        return rangeMax;
                    }
                }
                return nextValue;
            };
        }, [step, rangeMax, tail, loop, $state, state_key]);

        useEffect(() => {
            let animationFrameId;
            let intervalId;

            if (isAnimated && isPlaying) {
                if (fps === 'raf') {
                    const animate = () => {
                        updateFrameAndState();
                        animationFrameId = requestAnimationFrame(animate);
                    };

                    animationFrameId = requestAnimationFrame(animate);
                } else {
                    intervalId = setInterval(updateFrameAndState, 1000 / fps);
                }
            }

            return () => {
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                if (intervalId) clearInterval(intervalId);
            };
        }, [isPlaying, fps, updateFrameAndState]);

        const handleSliderChange = useCallback((value) => {
            setIsPlaying(false);
            $state[state_key] = Number(value);
        }, [$state, state_key]);

        const togglePlayPause = useCallback(() => setIsPlaying((prev) => !prev), []);

        if (controls.length === 0) return null;

        return (
            <div className={tw(joinClasses("text-xs", className))} style={style}>
                <div className={tw("flex flex-col my-2 gap-2 w-full")}>
                    <span className={tw("flex gap-1")}>
                        {label && <label className={tw("font-semibold")}>{label}</label>}
                        {showValue && <span>{$state[state_key]}</span>}
                    </span>

                    <div className={tw("flex gap-1 items-center justify-center")}>
                        {controls?.includes("slider") && (
                            <input
                                type="range"
                                min={rangeMin}
                                max={rangeMax}
                                step={step}
                                value={sliderValue}
                                onChange={(e) => handleSliderChange(e.target.value)}
                                className={tw("w-full outline-none")}
                            />
                        )}
                        {controls?.includes("play") && isAnimated && (
                            <div onClick={togglePlayPause} className={tw("cursor-pointer")}>
                                {isPlaying ? pauseIcon : playIcon}
                            </div>
                        )}
                    </div>

                    {controls?.includes("fps") && isPlaying && (
                        <div className={tw("text-center text-gray-500 mt-1")}>
                            {currentFps} FPS
                        </div>
                    )}
                </div>
            </div>
        );
    }
)

export function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

export class InitialState {
    render() { }
}

export class OnStateChange {
    // this could be a way of "mounting" a ref callback. eg.
    // a_plot | Plot.onChange({})

    // alternatively, on a widget we could do something like
    // widget.onChange({"foo": cb})

    // alternatively, one might want to sync some state, like
    // widget.sync("foo", "bar")
    // and then read the synced values via widget.foo

    constructor(name, callback) {
        this.name = name
        this.callback = callback
    }
    render() {
        const $state = useContext($StateContext);
        useEffect(() => {
            return mobx.autorun(() => {
                this.callback($state[this.name])
            })
        },
            [this.name, this.callback])
    }
}

const playIcon = <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M8 5v14l11-7z"></path></svg>;
const pauseIcon = <svg viewBox="0 24 24" width="24" height="24"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>;

export const Frames = mobxReact.observer(
    function (props) {
        const { state_key, frames } = props
        const $state = useContext($StateContext);

        if (!Array.isArray(frames)) {
            return <div className={tw("text-red-500")}>Error: 'frames' must be an array.</div>;
        }

        const index = $state[state_key] ?? 0;
        if (!Number.isInteger(index) || index < 0 || index >= frames.length) {
            return <div className={tw("text-red-500")}>Error: Invalid index. $state[{state_key}] ({index}) must be a valid index of the frames array (length: {frames.length}).</div>;
        }

        return node(frames[index]);
    }
)
export class Bylight {
    constructor(source, patterns, props = {}) {
        this.patterns = patterns;
        this.source = source;
        this.props = props;
    }

    render() {
        const preRef = React.useRef(null);

        React.useEffect(() => {
            if (preRef.current && this.patterns) {
                bylight.highlight(preRef.current, this.patterns);
            }
        }, [this.source, this.patterns]);

        return React.createElement('pre', {
            ref: preRef,
            className: this.props.className
        }, this.source);
    }
}

export function repeat(data) {
    const length = data.length
    return (_, i) => data[i % length]

}
export { d3, MarkSpec, Plot, PlotSpec, React, ReactDOM, Row, Column, Grid };

function renderArray($state, value) {
    const [element, ...args] = value
    const maybeElement = element && $state.evaluate(element)
    const elementType = typeof maybeElement
    if (elementType === 'string' || elementType === 'function' || (typeof maybeElement === 'object' && maybeElement !== null && "$$typeof" in maybeElement)) {
        return Hiccup(maybeElement, ...args)
    } else {
        return <React.Fragment>{value.map(node)}</React.Fragment>;
    }
}

function DOMElementWrapper({ element }) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
            containerRef.current.appendChild(element);
        }
        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [element]);

    return <div ref={containerRef} />;
}

// Node is a reactive component that lazily evaluates AST expressions using $state.evaluate().
// Values are only evaluated when rendered, and the component automatically re-renders
// when any $state dependencies change, thanks to mobx-react observer.

export const Node = mobxReact.observer(
    function ({ value }) {
        const $state = useContext($StateContext)

        // handle pre-evaluated arrays
        if (Array.isArray(value)) {
            return renderArray($state, value)
        }

        const evaluatedValue = $state.evaluate(value)

        // handle post-evaluated arrays (eg. arrays that came from a Plot.js expression)
        if (Array.isArray(evaluatedValue)) {
            return renderArray($state, evaluatedValue)
        }
        if (typeof evaluatedValue === 'object' && evaluatedValue !== null && 'render' in evaluatedValue) {
            return evaluatedValue.render();
        }

        if (evaluatedValue instanceof HTMLElement || evaluatedValue instanceof SVGElement) {
            return <DOMElementWrapper element={evaluatedValue} />;
        }

        if (typeof evaluatedValue === 'string' || typeof evaluatedValue === 'number') {
            return <span>{evaluatedValue}</span>;
        }

        return evaluatedValue;
    }
)

function isProps(props) {
    return props?.constructor === Object && !props.__type__ && !React.isValidElement(props);
}

export function Hiccup(tag, props, ...children) {
    const $state = useContext($StateContext)

    if (!isProps(props)) {
        children.unshift(props);
        props = {};
    }

    const evaluatedProps = $state.evaluate(props)
    // console.log('Props ', ...Object.entries(props).flat(), )
    // console.log('EProps', ...Object.entries(evaluatedProps).flat())
    // console.log("---------")


    if (evaluatedProps.class) {
        evaluatedProps.className = evaluatedProps.class;
        delete evaluatedProps.class;
    }

    let baseTag = tag;
    if (tag === "<>") {
        baseTag = React.Fragment;
    } else if (typeof tag === 'string') {
        let id, classes
        [baseTag, ...classes] = tag.split('.');
        [baseTag, id] = baseTag.split('#');

        if (id) { evaluatedProps.id = id; }

        if (classes.length > 0) {
            if (evaluatedProps.className) {
                classes.push(evaluatedProps.className);
            }
            evaluatedProps.className = classes.join(' ');
        }
    }

    if (evaluatedProps.className) {
        evaluatedProps.className = tw(evaluatedProps.className)
    }

    if (!children.length) {
        return React.createElement(baseTag, evaluatedProps)
    }

    return React.createElement(baseTag, evaluatedProps, children.map(node));
}

export function html(element) {
    return Hiccup(...element)
}

function parsePairs(args) {
    const pairs = [];
    let valueElse;

    for (let i = 0; i < args.length; i += 2) {
        // If we have an odd number of remaining args, the last one is else
        if (i === args.length - 1) {
            valueElse = args[i];
            break;
        }
        pairs.push([args[i], args[i + 1]]);
    }

    return [pairs, valueElse];
}

// Evaluates test conditions one at a time until a match is found
// Only the matching valueIf expression is evaluated and rendered
export function COND($state, ...args) {
    const [pairs, valueElse] = parsePairs(args);
    for (const [test, valueIf] of pairs) {
        const condition = $state.evaluate(test)
        if (condition) {
            return $state.evaluate(valueIf)
        }
    }
    if (valueElse) {
        return $state.evaluate(valueElse)
    }
}
COND.macro = true

// Similar to cond but matches against a specific value
// Only evaluates the matching branch
export function CASE($state, value, ...args) {
    const [pairs, valueElse] = parsePairs(args);

    const matchValue = $state.evaluate(value);
    for (const [test, valueIf] of pairs) {
        if (matchValue === test) {
            return $state.evaluate(valueIf)
        }
    }
    if (valueElse) {
        return $state.evaluate(valueElse)
    }
}
CASE.macro = true

function node(child, i) {
    if (child == null) return;
    if (typeof child === 'string' || typeof child === 'number') return <span key={i}>{child}</span>;

    // raw objects can be passed through as arguments to
    // parent components
    if (child.constructor === Object && !child.__type__) return child;

    return <Node key={i} value={child} />
}
