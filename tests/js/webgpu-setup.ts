export const setupWebGPU = () => {
  // Define WebGPU shader stage constants
  (globalThis as any).GPUShaderStage = {
    VERTEX: 1,
    FRAGMENT: 2,
    COMPUTE: 4
  };

  // Define WebGPU buffer usage constants
  (globalThis as any).GPUBufferUsage = {
    VERTEX: 1,
    INDEX: 2,
    UNIFORM: 4,
    STORAGE: 8,
    COPY_DST: 16,
    COPY_SRC: 32,
    MAP_READ: 64,
    MAP_WRITE: 128
  };

  // Define WebGPU texture usage constants
  (globalThis as any).GPUTextureUsage = {
    RENDER_ATTACHMENT: 1,
    COPY_SRC: 2,
    COPY_DST: 4,
    TEXTURE_BINDING: 8
  };

  // Define WebGPU color write flags
  (globalThis as any).GPUColorWrite = {
    RED: 1,
    GREEN: 2,
    BLUE: 4,
    ALPHA: 8,
    ALL: 0xF
  };

  // Define WebGPU map mode constants
  (globalThis as any).GPUMapMode = {
    READ: 1,
    WRITE: 2
  };

  // Define WebGPU load operations
  (globalThis as any).GPULoadOp = {
    LOAD: 'load',
    CLEAR: 'clear'
  };

  // Define WebGPU store operations
  (globalThis as any).GPUStoreOp = {
    STORE: 'store',
    DISCARD: 'discard'
  };

  // Define WebGPU primitive topology
  (globalThis as any).GPUPrimitiveTopology = {
    POINT_LIST: 'point-list',
    LINE_LIST: 'line-list',
    LINE_STRIP: 'line-strip',
    TRIANGLE_LIST: 'triangle-list',
    TRIANGLE_STRIP: 'triangle-strip'
  };

  // Define WebGPU vertex formats
  (globalThis as any).GPUVertexFormat = {
    UINT8X2: 'uint8x2',
    UINT8X4: 'uint8x4',
    SINT8X2: 'sint8x2',
    SINT8X4: 'sint8x4',
    UNORM8X2: 'unorm8x2',
    UNORM8X4: 'unorm8x4',
    SNORM8X2: 'snorm8x2',
    SNORM8X4: 'snorm8x4',
    UINT16X2: 'uint16x2',
    UINT16X4: 'uint16x4',
    SINT16X2: 'sint16x2',
    SINT16X4: 'sint16x4',
    UNORM16X2: 'unorm16x2',
    UNORM16X4: 'unorm16x4',
    SNORM16X2: 'snorm16x2',
    SNORM16X4: 'snorm16x4',
    FLOAT16X2: 'float16x2',
    FLOAT16X4: 'float16x4',
    FLOAT32: 'float32',
    FLOAT32X2: 'float32x2',
    FLOAT32X3: 'float32x3',
    FLOAT32X4: 'float32x4',
    UINT32: 'uint32',
    UINT32X2: 'uint32x2',
    UINT32X3: 'uint32x3',
    UINT32X4: 'uint32x4',
    SINT32: 'sint32',
    SINT32X2: 'sint32x2',
    SINT32X3: 'sint32x3',
    SINT32X4: 'sint32x4'
  };

  // Define WebGPU vertex step modes
  (globalThis as any).GPUVertexStepMode = {
    VERTEX: 'vertex',
    INSTANCE: 'instance'
  };

  // Define WebGPU cull modes
  (globalThis as any).GPUCullMode = {
    NONE: 'none',
    FRONT: 'front',
    BACK: 'back'
  };

  // Define WebGPU compare functions
  (globalThis as any).GPUCompareFunction = {
    NEVER: 'never',
    LESS: 'less',
    EQUAL: 'equal',
    LESS_EQUAL: 'less-equal',
    GREATER: 'greater',
    NOT_EQUAL: 'not-equal',
    GREATER_EQUAL: 'greater-equal',
    ALWAYS: 'always'
  };

  // Define WebGPU blend factors
  (globalThis as any).GPUBlendFactor = {
    ZERO: 'zero',
    ONE: 'one',
    SRC: 'src',
    ONE_MINUS_SRC: 'one-minus-src',
    SRC_ALPHA: 'src-alpha',
    ONE_MINUS_SRC_ALPHA: 'one-minus-src-alpha',
    DST: 'dst',
    ONE_MINUS_DST: 'one-minus-dst',
    DST_ALPHA: 'dst-alpha',
    ONE_MINUS_DST_ALPHA: 'one-minus-dst-alpha',
    SRC_ALPHA_SATURATED: 'src-alpha-saturated',
    CONSTANT: 'constant',
    ONE_MINUS_CONSTANT: 'one-minus-constant'
  };

  // Define WebGPU blend operations
  (globalThis as any).GPUBlendOperation = {
    ADD: 'add',
    SUBTRACT: 'subtract',
    REVERSE_SUBTRACT: 'reverse-subtract',
    MIN: 'min',
    MAX: 'max'
  };
};

export const cleanupWebGPU = () => {
  // Clean up all WebGPU globals
  const constants = [
    'GPUShaderStage',
    'GPUBufferUsage',
    'GPUTextureUsage',
    'GPUColorWrite',
    'GPUMapMode',
    'GPULoadOp',
    'GPUStoreOp',
    'GPUPrimitiveTopology',
    'GPUVertexFormat',
    'GPUVertexStepMode',
    'GPUCullMode',
    'GPUCompareFunction',
    'GPUBlendFactor',
    'GPUBlendOperation'
  ];

  for (const constant of constants) {
    delete (globalThis as any)[constant];
  }
};
