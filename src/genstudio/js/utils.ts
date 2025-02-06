import * as Twind from "@twind/core";
import presetAutoprefix from "@twind/preset-autoprefix";
import presetTailwind from "@twind/preset-tailwind";
import presetTypography from "@twind/preset-typography";
import * as React from "react";
const { useState, useEffect, useRef } = React


const twindConfig = Twind.defineConfig({
  presets: [presetAutoprefix(), presetTailwind(), presetTypography()],
})

export const tw = Twind.twind(twindConfig, Twind.cssom())

export const flatten = (data, dimensions) => {
  let leaves;
  if (typeof dimensions[dimensions.length - 1] === 'object' && 'leaves' in dimensions[dimensions.length - 1]) {
    leaves = dimensions[dimensions.length - 1]['leaves'];
    dimensions = dimensions.slice(0, -1);
  }

  const _flat = (data, dim, prefix = null) => {
    if (!dim.length) {
      data = leaves ? { [leaves]: data } : data
      return prefix ? [{ ...prefix, ...data }] : [data];
    }

    const results = [];
    const dimName = typeof dim[0] === 'string' ? dim[0] : dim[0].key;
    for (let i = 0; i < data.length; i++) {
      const newPrefix = prefix ? { ...prefix, [dimName]: i } : { [dimName]: i };
      results.push(..._flat(data[i], dim.slice(1), newPrefix));
    }
    return results;
  };
  return _flat(data, dimensions);
}

export function binding(varName, varValue, f) {
  const prevValue = window[varName]
  window[varName] = varValue
  const ret = f()
  window[varName] = prevValue
  return ret
}

export function useCellUnmounted(el) {
  // for Python Interactive Output in VS Code, detect when this element
  // is unmounted & save that state on the element itself.
  // We have to directly read from the ancestor DOM because none of our
  // cell output is preserved across reload.
  useEffect(() => {
    let observer;
    // .output_container is stable across refresh
    const outputContainer = el?.closest(".output_container")
    // .widgetarea contains all the notebook's cells
    const widgetarea = outputContainer?.closest(".widgetarea")
    if (el && !el.initialized && widgetarea) {
      el.initialized = true;

      const mutationCallback = (mutationsList, observer) => {
        for (let mutation of mutationsList) {
          if (mutation.type === 'childList' && !widgetarea.contains(outputContainer)) {
            el.unmounted = true
            observer.disconnect();
            break;
          }
        }
      };
      observer = new MutationObserver(mutationCallback);
      observer.observe(widgetarea, { childList: true, subtree: true });
    }
    return () => observer?.disconnect()
  }, [el]);
  return el?.unmounted
}

export function useElementWidth(el) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (el) {
      const handleResize = () => setWidth(el.offsetWidth ? el.offsetWidth : document.body.offsetWidth);
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [el]);

  return width
}

export function serializeEvent(e) {
  if (e.constructor === Object) {
    return e;
  }

  // Handle React synthetic events and native events
  const event = e?.nativeEvent || e;
  const target = event?.target || event;

  // Base event data that's common across all events
  const baseEventData = {
    type: event.type,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey
  };

  // Input state data if the event comes from a form control
  const inputStateData = target?.tagName?.match(/^(INPUT|SELECT|TEXTAREA)$/i) ? {
    value: target.type === 'select-multiple'
      ? Array.from(target.selectedOptions || [], opt => opt.value)
      : target.value,
    checked: target.type === 'checkbox' || target.type === 'radio'
      ? target.checked
      : undefined,
    files: target.type === 'file'
      ? Array.from(target.files || [], file => ({
          name: file.name,
          type: file.type,
          size: file.size
        }))
      : undefined,
    target: target.id || target.name || undefined
  } : {};

  // Event-specific data
  const eventData = {
    mousedown: () => ({ clientX: event.clientX, clientY: event.clientY, button: event.button }),
    mouseup: () => ({ clientX: event.clientX, clientY: event.clientY, button: event.button }),
    mousemove: () => ({ clientX: event.clientX, clientY: event.clientY, button: event.button }),
    click: () => ({ clientX: event.clientX, clientY: event.clientY, button: event.button }),
    keydown: () => ({ key: event.key, code: event.code }),
    keyup: () => ({ key: event.key, code: event.code }),
    keypress: () => ({ key: event.key, code: event.code }),
    submit: () => {
      event.preventDefault();
      return { formData: Object.fromEntries(new FormData(target)) };
    }
  }[event.type]?.() || {};

  return {
    ...baseEventData,
    ...inputStateData,
    ...eventData
  };
}

function debounce(func, wait, leading = true) {
  let timeout;
  let isInitial = true;

  return function executedFunction(...args) {
    if (leading && isInitial) {
      isInitial = false;
      func(...args);
      return;
    }

    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function useContainerWidth(threshold: number = 10): [React.RefObject<HTMLDivElement | null>, number] {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState<number>(0);
  const lastWidthRef = React.useRef<number>(0);
  const DEBOUNCE: boolean = false;

  React.useEffect(() => {
    if (!containerRef.current) return;

    const handleWidth = (width: number) => {
      const diff = Math.abs(width - lastWidthRef.current);
      if (diff >= threshold) {
        lastWidthRef.current = width;
        setContainerWidth(width);
      }
    };

    const widthHandler = DEBOUNCE ? debounce(handleWidth, 100) : handleWidth;

    const observer = new ResizeObserver(entries =>
      widthHandler(entries[0].contentRect.width)
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [DEBOUNCE]);

  return [containerRef, containerWidth];
}


/**
 * Joins CSS class names, filtering out falsy values.
 * @param {...string} classes - Class names to join
 * @returns {string} Combined class names string
 */
export function joinClasses(...classes) {
  let result = classes[0] || "";
  for (let i = 1; i < classes.length; i++) {
    if (classes[i]) result += " " + classes[i];
  }
  return result;
}

/**
 * Deep equality check that only traverses plain objects and arrays.
 * All other types (including TypedArrays) are compared by identity.
 */
export function shallowDeepEqual(a: any, b: any): boolean {
    if (a === b) return true;

    // Check if both are arrays OR both are plain objects
    const aIsArray = Array.isArray(a);
    const bIsArray = Array.isArray(b);
    const aIsPlainObj = a && a.constructor === Object && Object.getPrototypeOf(a) === Object.prototype;
    const bIsPlainObj = b && b.constructor === Object && Object.getPrototypeOf(b) === Object.prototype;

    if ((aIsArray && bIsArray) || (aIsPlainObj && bIsPlainObj)) {
        const keys = Object.keys(a);
        if (keys.length !== Object.keys(b).length) return false;

        return keys.every(key => (
            Object.prototype.hasOwnProperty.call(b, key) &&
            shallowDeepEqual(a[key], b[key])
        ));
    }

    return a === b;
}


export function useShallowMemo<T>(value: T): T {
  const ref = useRef<T>();

  if (!ref.current || !shallowDeepEqual(value, ref.current)) {
      ref.current = value;
  }

  return ref.current;
}
