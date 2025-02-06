import * as api from "./api";
import * as Plot from "@observablehq/plot";
import { evaluateNdarray, inferDtype } from "./binary";
import { serializeEvent } from "./utils";

function resolveReference(path, obj) {
  return path.split(".").reduce((acc, key) => acc[key], obj);
}

// genstudio is on window so that ESM scripts can access it
window.genstudio = {api};
window.d3 = api.d3
window.html = api.html
window.React = api.React

// moduleCache is on window so that multiple copies of this script can share it
window.moduleCache = window.moduleCache || new Map();

export async function createEvalEnv(imports) {
  const envImports = {};

  // Helper to evaluate non-ESM code in a controlled scope
  function evaluateScriptWithImports(source, scope) {
    try {
      window.genstudio.imports = envImports;
      return new Function(...Object.keys(scope), source)(...Object.values(scope));
    } finally {
      delete window.genstudio.imports;
    }
  }

  for (const spec of imports) {
    try {
      if (!spec.source) {
        throw new Error('source must be specified');
      }

      let module;
      const format = spec.format || 'esm'; // Default to ESM

      // Check cache first
      if (moduleCache.has(spec.source)) {
        module = moduleCache.get(spec.source);
      } else {
        if (format === 'esm') {
          // Handle ESM modules
          if (spec.source.startsWith('http')) {
            module = await import(spec.source);
          } else {
            const sourceBlob = new Blob([spec.source], { type: 'text/javascript' });
            const url = URL.createObjectURL(sourceBlob);
            try {
              module = await import(url);
            } finally {
              URL.revokeObjectURL(url);
            }
          }
        } else {
          // Handle non-ESM scripts
          let source;
          if (spec.source.startsWith('http')) {
            const response = await fetch(spec.source);
            source = await response.text();
          } else {
            source = spec.source;
          }

          // Create a module-like object from the evaluated script
          const exports = {};
          const moduleScope = {
            exports,
            module: { exports }
          };
          evaluateScriptWithImports(source, moduleScope);
          module = moduleScope.module.exports;
        }

        // Cache the loaded module
        moduleCache.set(spec.source, module);
      }

      // Handle default export
      if (spec.default) {
        if (!module.default) {
          throw new Error(`No default export found in module ${spec.source}`);
        }
        envImports[spec.default] = module.default;
      }

      // Handle namespace alias
      if (spec.alias) {
        envImports[spec.alias] = module;
      }

      // Handle refers
      if (spec.refer) {
        for (const key of spec.refer) {
          if (!(key in module)) {
            throw new Error(`${key} not found in module`);
          }
          const newName = spec.rename?.[key] || key;
          envImports[newName] = module[key];
        }
      }

      // Handle refer_all
      if (spec.refer_all) {
        const excludeSet = new Set(spec.exclude || []);
        for (const [key, value] of Object.entries(module)) {
          if (key !== 'default' && !excludeSet.has(key)) {
            envImports[key] = value;
          }
        }
      }

    } catch (e) {
      console.error(`Failed to process import:`, e);
      console.error(`Spec:`, spec);
    }
  }
  return { genstudio: {api}, ...envImports };;
}

export function evaluate(node, $state, experimental, buffers) {
  if (node === null || typeof node !== "object") return node;
  if (Array.isArray(node))
    return node.map((item) => evaluate(item, $state, experimental, buffers));
  if (node.constructor !== Object) {
    if (node instanceof DataView) {
      return node;
    }
    return node;
  }

  switch (node["__type__"]) {
    case "function":
      const fn = resolveReference(node.path, api);
      if (!fn) {
        console.error("Function not found", node);
        return null;
      }
      // functions marked as macros are passed unevaluated args + $state (for selective evaluation)
      const args = fn.macro
        ? [$state, ...node.args]
        : evaluate(node.args, $state, experimental, buffers);
      if (fn.prototype?.constructor === fn) {
        return new fn(...args);
      } else {
        return fn(...args);
      }
    case "js_ref":
      return resolveReference(node.path, api);
    case "js_source":

      let source = node.expression ? `return ${node.value.trimLeft()}` : node.value;
      source = node.params?.length ? source.replace(/%(\d+)/g, (_, i) => `p${parseInt(i) - 1}`) : source;

      const paramValues = (node.params || []).map((p) => evaluate(p, $state, experimental, buffers));
      const paramNames = paramValues.map((_, i) => `p${i}`);

      const env = $state.__evalEnv;

      return new Function("$state", ...Object.keys(env),   ...paramNames, source)(
                           $state,  ...Object.values(env), ...paramValues);
    case "datetime":
      return new Date(node.value);
    case "ref":
      return $state.__computed(node.state_key);
    case "callback":
      if (experimental) {
        return (e) =>
          experimental.invoke("handle_callback", {
            id: node.id,
            event: serializeEvent(e),
          });
      } else {
        return undefined;
      }
    case "ndarray":
      if (node.array) {
        return node.array
      }
      if (node.data?.__type__ === "buffer") {
        node.data = buffers[node.data.index];
      }
      if (node.__buffer_index__ !== undefined) {
        node.data = buffers[node.__buffer_index__]
      }
      node.array = evaluateNdarray(node)
      return node.array;
    default:
      return Object.fromEntries(
        Object.entries(node).map(([key, value]) => [
          key,
          evaluate(value, $state, experimental, buffers),
        ])
      );
  }
}

export function collectBuffers(data) {
  const buffers = [];

  function traverse(value) {
    // Handle ArrayBuffer and TypedArray instances
    if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
      const index = buffers.length;
      buffers.push(value);

      // Add metadata about the array type
      const metadata = {
        __buffer_index__: index,
        __type__: "ndarray",
        dtype: inferDtype(value),
      };

      // Add shape if available
      if (value instanceof ArrayBuffer) {
        metadata.shape = [value.byteLength];
      } else {
        metadata.shape = [value.length];
      }

      return metadata;
    }

    // Handle arrays recursively
    if (Array.isArray(value)) {
      return value.map(traverse);
    }

    // Handle objects recursively
    if (value && typeof value === "object") {
      const result = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = traverse(val);
      }
      return result;
    }

    // Return primitives as-is
    return value;
  }

  return [traverse(data), buffers];
}

export function replaceBuffers(data, buffers) {
  function traverse(value) {
    if (value && typeof value === "object") {
      if (value.__type__ === "ndarray" && value.__buffer_index__ !== undefined) {
        value.data = buffers[value.__buffer_index__]
        delete value.__buffer_index__
        return value;
      }
      if (Array.isArray(value)) {
        return value.map(traverse);
      }
      const result = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = traverse(val);
      }
      return result;
    }
    return value;
  }
  return traverse(data);
}
