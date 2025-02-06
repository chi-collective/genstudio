export type TypedArray = Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array;

/** Type representing arrays that contain BigInt values */
export type BigIntArray = BigInt64Array | BigUint64Array;

/**
 * Type guard to check if a value is a BigInt array type
 * @param value - Value to check
 * @returns True if the value is a BigInt array type (BigInt64Array or BigUint64Array)
 */
export function isBigIntArray(value: unknown): value is BigIntArray {
  return value instanceof BigInt64Array || value instanceof BigUint64Array;
}

/**
 * Converts a BigInt array (BigInt64Array/BigUint64Array) to a regular number array.
 * @param value - The array to convert
 * @returns A regular Array of numbers if input is a BigInt array, otherwise returns the input unchanged
 */
function convertBigIntArray(value: unknown): number[] | unknown {
  if (value instanceof BigInt64Array || value instanceof BigUint64Array) {
    return Array.from(value, Number);
  }
  return value;
}

/**
 * Reshapes a flat array into a nested array structure based on the provided dimensions.
 * The input array can be either a TypedArray (like Float32Array) or regular JavaScript Array.
 * The leaf arrays (deepest level) maintain the original array type, while the nested structure
 * uses regular JavaScript arrays.
 *
 * @param {TypedArray|Array} flat - The flat array to reshape
 * @param {number[]} dims - Array of dimensions specifying the desired shape
 * @param {number} [offset=0] - Starting offset into the flat array (used internally for recursion)
 * @returns {Array} A nested array matching the specified dimensions, with leaves maintaining the original type
 *
 * @example
 * // With regular Array
 * reshapeArray([1,2,3,4], [2,2])
 * // Returns: [[1,2], [3,4]]
 *
 * @example
 * // With TypedArray
 * const data = new Float32Array([1,2,3,4])
 * reshapeArray(data, [2,2])
 * // Returns nested arrays containing Float32Array slices:
 * // [Float32Array[1,2], Float32Array[3,4]]
 */
export function reshapeArray(flat, dims, offset = 0) {
  const [dim, ...restDims] = dims;

  if (restDims.length === 0) {
    const start = offset;
    const end = offset + dim;
    return flat.slice(start, end);
  }

  const stride = restDims.reduce((a, b) => a * b, 1);
  return Array.from({ length: dim }, (_, i) =>
    reshapeArray(flat, restDims, offset + i * stride)
  );
}

const dtypeMap = {
  'float32': Float32Array,
  'float64': Float64Array,
  'int8': Int8Array,
  'int16': Int16Array,
  'int32': Int32Array,
  'int64': BigInt64Array,
  'uint8': Uint8Array,
  'uint16': Uint16Array,
  'uint32': Uint32Array,
  'uint64': BigUint64Array,
  'uint8clamped': Uint8ClampedArray,
  'bigint64': BigInt64Array,
  'biguint64': BigUint64Array,
};

/**
 * Infers the numpy dtype for a TypedArray by examining its constructor name.
 *
 * @param {TypedArray} value - TypedArray to analyze
 * @returns {string} Numpy dtype string (e.g. 'float32', 'int32', etc)
 * @throws {Error} If input is not a TypedArray or ArrayBuffer
 */
export function inferDtype(value) {

  if (!(value instanceof ArrayBuffer || ArrayBuffer.isView(value))) {
    throw new Error('Value must be a TypedArray');
  }

  return value.constructor.name.toLowerCase().replace('array', '');
}

/**
 * Evaluates an ndarray node by converting the DataView buffer into a typed array
 * and optionally reshaping it into a multidimensional array.
 *
 * @param {Object} node - The ndarray node to evaluate
 * @param {DataView} node.data - The raw binary data as a DataView
 * @param {string} node.dtype - The numpy dtype string (e.g. 'float32', 'int32')
 * @param {number[]} node.shape - The shape of the array (e.g. [2,3] for 2x3 matrix)
 * @returns {TypedArray|Array} A typed array for 1D data, or nested array structure for multidimensional data
 */
export function evaluateNdarray(node) {
  const { data, dtype, shape } = node;
  const ArrayConstructor = dtypeMap[dtype] || Float64Array;

  // Create typed array directly from the DataView's buffer
  const flatArray = new ArrayConstructor(
    data.buffer,
    data.byteOffset,
    data.byteLength / ArrayConstructor.BYTES_PER_ELEMENT
  );

  // Convert BigInt arrays to regular number arrays
  const convertedArray = convertBigIntArray(flatArray);

  // If 1D, return the array directly
  if (shape.length <= 1) {
    return convertedArray;
  }

  return reshapeArray(convertedArray, shape);
}

/**
 * Estimates the size of a JSON string in bytes and returns a human readable string.
 * Uses TextEncoder to get accurate UTF-8 encoded size.
 *
 * @param {string} jsonString - The JSON string to measure
 * @returns {string} Human readable size with units (B, KB, or MB) and 2 decimal places for KB/MB
 */
export function estimateJSONSize(jsonString) {
  if (!jsonString) return '0 B';

  // Use TextEncoder to get accurate byte size for UTF-8 encoded string
  const encoder = new TextEncoder();
  const bytes = encoder.encode(jsonString).length;

  // Convert bytes to KB or MB
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
