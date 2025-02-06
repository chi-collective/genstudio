export interface PipelineCacheEntry {
    pipeline: GPURenderPipeline;
    device: GPUDevice;
  }

export interface PrimitiveSpec<E> {
    /**
     * The type/name of this primitive spec
     */
    type: string;

    /**
     * Returns the number of instances in this component.
     */
    getCount(component: E): number;

    /**
     * Returns the number of floats needed per instance for render data.
     */
    getFloatsPerInstance(): number;

    /**
     * Returns the number of floats needed per instance for picking data.
     */
    getFloatsPerPicking(): number;

    /**
     * Returns the centers of all instances in this component.
     * Used for transparency sorting and distance calculations.
     * @returns Object containing centers array and stride, or undefined if not applicable
     */
    getCenters(component: E): Float32Array;

    /**
     * Builds vertex buffer data for rendering.
     * Populates the provided Float32Array with interleaved vertex attributes.
     * Returns true if data was populated, false if component has no renderable data.
     * @param component The component to build render data for
     * @param target The Float32Array to populate with render data
     * @param sortedIndices Optional array of indices for depth sorting
     */
    buildRenderData(component: E, target: Float32Array, sortedIndices?: Uint32Array): boolean;

    /**
     * Builds vertex buffer data for GPU-based picking.
     * Populates the provided Float32Array with picking data.
     * @param component The component to build picking data for
     * @param target The Float32Array to populate with picking data
     * @param baseID Starting ID for this component's instances
     * @param sortedIndices Optional array of indices for depth sorting
     */
    buildPickingData(component: E, target: Float32Array, baseID: number, sortedIndices?: Uint32Array): void;

    /**
     * Default WebGPU rendering configuration for this primitive type.
     * Specifies face culling and primitive topology.
     */
    renderConfig: RenderConfig;

    /**
     * Creates or retrieves a cached WebGPU render pipeline for this primitive.
     * @param device The WebGPU device
     * @param bindGroupLayout Layout for uniform bindings
     * @param cache Pipeline cache to prevent duplicate creation
     */
    getRenderPipeline(
      device: GPUDevice,
      bindGroupLayout: GPUBindGroupLayout,
      cache: Map<string, PipelineCacheEntry>
    ): GPURenderPipeline;

    /**
     * Creates or retrieves a cached WebGPU pipeline for picking.
     * @param device The WebGPU device
     * @param bindGroupLayout Layout for uniform bindings
     * @param cache Pipeline cache to prevent duplicate creation
     */
    getPickingPipeline(
      device: GPUDevice,
      bindGroupLayout: GPUBindGroupLayout,
      cache: Map<string, PipelineCacheEntry>
    ): GPURenderPipeline;

    /**
     * Creates the base geometry buffers needed for this primitive type.
     * These buffers are shared across all instances of the primitive.
     */
    createGeometryResource(device: GPUDevice): { vb: GPUBuffer; ib: GPUBuffer; indexCount: number; vertexCount: number };
  }


/** Configuration for how a primitive type should be rendered */
interface RenderConfig {
    /** How faces should be culled */
    cullMode: GPUCullMode;
    /** How vertices should be interpreted */
    topology: GPUPrimitiveTopology;
  }

export interface Decoration {
    indexes: number[];
    color?: [number, number, number];
    alpha?: number;
    scale?: number;
  }

export interface BaseComponentConfig {
    /**
     * Per-instance RGB color values as a Float32Array of RGB triplets.
     * Each instance requires 3 consecutive values in the range [0,1].
     */
    colors?: Float32Array;

    /**
     * Per-instance alpha (opacity) values.
     * Each value should be in the range [0,1].
     */
    alphas?: Float32Array;

    /**
     * Per-instance scale multipliers.
     * These multiply the base size/radius of each instance.
     */
    scales?: Float32Array;

    /**
     * Default RGB color applied to all instances without specific colors.
     * Values should be in range [0,1]. Defaults to [1,1,1] (white).
     */
    color?: [number, number, number];

    /**
     * Default alpha (opacity) for all instances without specific alpha.
     * Should be in range [0,1]. Defaults to 1.0.
     */
    alpha?: number;

    /**
     * Default scale multiplier for all instances without specific scale.
     * Defaults to 1.0.
     */
    scale?: number;

    /**
     * Callback fired when the mouse hovers over an instance.
     * The index parameter is the instance index, or null when hover ends.
     */
    onHover?: (index: number|null) => void;

    /**
     * Callback fired when an instance is clicked.
     * The index parameter is the clicked instance index.
     */
    onClick?: (index: number) => void;

    /**
     * Optional array of decorations to apply to specific instances.
     * Decorations can override colors, alpha, and scale for individual instances.
     */
    decorations?: Decoration[];
  }

  export interface VertexBufferLayout {
    arrayStride: number;
    stepMode?: GPUVertexStepMode;
    attributes: {
      shaderLocation: number;
      offset: number;
      format: GPUVertexFormat;
    }[];
  }

  export interface PipelineConfig {
    vertexShader: string;
    fragmentShader: string;
    vertexEntryPoint: string;
    fragmentEntryPoint: string;
    bufferLayouts: VertexBufferLayout[];
    primitive?: {
      topology?: GPUPrimitiveTopology;
      cullMode?: GPUCullMode;
    };
    blend?: {
      color?: GPUBlendComponent;
      alpha?: GPUBlendComponent;
    };
    depthStencil?: {
      format: GPUTextureFormat;
      depthWriteEnabled: boolean;
      depthCompare: GPUCompareFunction;
    };
    colorWriteMask?: number;  // Use number instead of GPUColorWrite
  }

export interface GeometryResource {
  vb: GPUBuffer;
  ib: GPUBuffer;
  indexCount?: number;
  vertexCount?: number;
}

export interface GeometryResources {
  PointCloud: GeometryResource | null;
  Ellipsoid: GeometryResource | null;
  EllipsoidAxes: GeometryResource | null;
  Cuboid: GeometryResource | null;
  LineBeams: GeometryResource | null;
}

export interface BufferInfo {
    buffer: GPUBuffer;
    offset: number;
    stride: number;
  }

  export interface RenderObject {
    pipeline?: GPURenderPipeline;
    vertexBuffers: Partial<[GPUBuffer, BufferInfo]>;  // Allow empty or partial arrays
    indexBuffer?: GPUBuffer;
    vertexCount?: number;
    indexCount?: number;
    instanceCount?: number;

    pickingPipeline?: GPURenderPipeline;
    pickingVertexBuffers: Partial<[GPUBuffer, BufferInfo]>;  // Allow empty or partial arrays
    pickingIndexBuffer?: GPUBuffer;
    pickingVertexCount?: number;
    pickingIndexCount?: number;
    pickingInstanceCount?: number;

    componentIndex: number;
    pickingDataStale: boolean;

    // Arrays owned by this RenderObject, reallocated only when count changes
    cachedRenderData: Float32Array;   // Make non-optional since all components must have render data
    cachedPickingData: Float32Array;  // Make non-optional since all components must have picking data
    lastRenderCount: number;          // Make non-optional since we always need to track this

    // Temporary sorting state
    sortedIndices?: Uint32Array;
    distances?: Float32Array;

    componentOffsets: ComponentOffset[];

    /** Reference to the primitive spec that created this render object */
    spec: PrimitiveSpec<any>;
  }

  export interface RenderObjectCache {
    [key: string]: RenderObject;  // Key is componentType, value is the most recent render object
  }

  export interface DynamicBuffers {
    renderBuffer: GPUBuffer;
    pickingBuffer: GPUBuffer;
    renderOffset: number;  // Current offset into render buffer
    pickingOffset: number; // Current offset into picking buffer
  }

  export interface ComponentOffset {
    componentIdx: number; // The index of the component in your overall component list.
    start: number;        // The first instance index in the combined buffer for this component.
    count: number;        // How many instances this component contributed.
  }
