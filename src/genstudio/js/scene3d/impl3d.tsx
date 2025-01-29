/// <reference types="react" />

import * as glMatrix from 'gl-matrix';
import React, {
  // DO NOT require MouseEvent
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { throttle } from '../utils';
import { createCubeGeometry, createSphereGeometry, createTorusGeometry } from './geometry';

import {
  CameraParams,
  CameraState,
  DEFAULT_CAMERA,
  createCameraParams,
  createCameraState,
  orbit,
  pan,
  zoom
} from './camera3d';

/******************************************************
 * 1) Types and Interfaces
 ******************************************************/
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
}

export interface DynamicBuffers {
  renderBuffer: GPUBuffer;
  pickingBuffer: GPUBuffer;
  renderOffset: number;  // Current offset into render buffer
  pickingOffset: number; // Current offset into picking buffer
}

export interface SceneInnerProps {
    components: any[];
    containerWidth: number;
    containerHeight: number;
    style?: React.CSSProperties;
    camera?: CameraParams;
    defaultCamera?: CameraParams;
    onCameraChange?: (camera: CameraParams) => void;
}

/******************************************************
 * 2) Constants and Camera Functions
 ******************************************************/
const LIGHTING = {
    AMBIENT_INTENSITY: 0.4,
    DIFFUSE_INTENSITY: 0.6,
    SPECULAR_INTENSITY: 0.2,
    SPECULAR_POWER: 20.0,
    DIRECTION: {
        RIGHT: 0.2,
        UP: 0.5,
        FORWARD: 0,
    }
} as const;

/******************************************************
 * 3) Data Structures & Primitive Specs
 ******************************************************/
interface PrimitiveSpec<E> {
  /** Get the number of instances in this component */
  getCount(component: E): number;

  /** Build vertex buffer data for rendering */
  buildRenderData(component: E): Float32Array | null;

  /** Build vertex buffer data for picking */
  buildPickingData(component: E, baseID: number): Float32Array | null;

  /** The default rendering configuration for this primitive type */
  renderConfig: RenderConfig;

  /** Return (or lazily create) the GPU render pipeline for this type */
  getRenderPipeline(
    device: GPUDevice,
    bindGroupLayout: GPUBindGroupLayout,
    cache: Map<string, PipelineCacheEntry>
  ): GPURenderPipeline;

  /** Return (or lazily create) the GPU picking pipeline for this type */
  getPickingPipeline(
    device: GPUDevice,
    bindGroupLayout: GPUBindGroupLayout,
    cache: Map<string, PipelineCacheEntry>
  ): GPURenderPipeline;

  /** Create a RenderObject that references geometry + the two pipelines */
  createRenderObject(
    pipeline: GPURenderPipeline,
    pickingPipeline: GPURenderPipeline,
    instanceBufferInfo: BufferInfo | null,
    pickingBufferInfo: BufferInfo | null,
    instanceCount: number,
    resources: GeometryResources
  ): RenderObject;
}

interface Decoration {
  indexes: number[];
  color?: [number, number, number];
  alpha?: number;
  scale?: number;
  minSize?: number;
}

/** Configuration for how a primitive type should be rendered */
interface RenderConfig {
  /** How faces should be culled */
  cullMode: GPUCullMode;
  /** How vertices should be interpreted */
  topology: GPUPrimitiveTopology;
}

/** ===================== POINT CLOUD ===================== **/
export interface PointCloudComponentConfig {
  type: 'PointCloud';
  positions: Float32Array;
  colors?: Float32Array;
  color: [number, number, number];  // Required singular option
  sizes?: Float32Array;  // Per-point sizes in scene units
  size: number;  // Default size in scene units
  decorations?: Decoration[];
  onHover?: (index: number|null) => void;
  onClick?: (index: number) => void;
}

const pointCloudSpec: PrimitiveSpec<PointCloudComponentConfig> = {
  // Data transformation methods
  getCount(elem) {
    return elem.positions.length / 3;
  },

  buildRenderData(elem) {
    const { positions, colors, color, sizes, size } = elem;
    const count = positions.length / 3;
    if(count === 0) return null;

    // (pos.x, pos.y, pos.z, color.r, color.g, color.b, alpha, size)
    const arr = new Float32Array(count * 8);

    // Initialize default values outside the loop
    const hasColors = colors && colors.length === count*3;
    for(let i=0; i<count; i++){
      arr[i*8+0] = positions[i*3+0];
      arr[i*8+1] = positions[i*3+1];
      arr[i*8+2] = positions[i*3+2];
      if(hasColors){
        arr[i*8+3] = colors[i*3+0];
        arr[i*8+4] = colors[i*3+1];
        arr[i*8+5] = colors[i*3+2];
      } else {
        arr[i*8+3] = color[0];
        arr[i*8+4] = color[1];
        arr[i*8+5] = color[2];
      }
      arr[i*8+6] = 1.0; // alpha
      arr[i*8+7] = sizes ? sizes[i] : size;
    }
    // decorations (keep using scale for decorations since it's a multiplier)
    if(elem.decorations){
      for(const dec of elem.decorations){
        for(const idx of dec.indexes){
          if(idx<0||idx>=count) continue;
          if(dec.color){
            arr[idx*8+3] = dec.color[0];
            arr[idx*8+4] = dec.color[1];
            arr[idx*8+5] = dec.color[2];
          }
          if(dec.alpha !== undefined){
            arr[idx*8+6] = dec.alpha;
          }
          if(dec.scale !== undefined){
            arr[idx*8+7] *= dec.scale;
          }
          if(dec.minSize !== undefined){
            if(arr[idx*8+7] < dec.minSize) arr[idx*8+7] = dec.minSize;
          }
        }
      }
    }
    return arr;
  },

  buildPickingData(elem, baseID) {
    const { positions, sizes, size } = elem;
    const count = positions.length / 3;
    if(count===0) return null;

    // (pos.x, pos.y, pos.z, pickID, size)
    const arr = new Float32Array(count*5);
    for(let i=0; i<count; i++){
      arr[i*5+0] = positions[i*3+0];
      arr[i*5+1] = positions[i*3+1];
      arr[i*5+2] = positions[i*3+2];
      arr[i*5+3] = baseID + i;
      arr[i*5+4] = sizes ? sizes[i] : size;
    }
    return arr;
  },

  // Rendering configuration
  renderConfig: {
    cullMode: 'none',
    topology: 'triangle-list'
  },

  // Pipeline creation methods
  getRenderPipeline(device, bindGroupLayout, cache) {
    const format = navigator.gpu.getPreferredCanvasFormat();
    return getOrCreatePipeline(
      device,
      "PointCloudShading",
      () => createRenderPipeline(device, bindGroupLayout, {
        vertexShader: billboardVertCode,
        fragmentShader: billboardFragCode,
        vertexEntryPoint: 'vs_main',
        fragmentEntryPoint: 'fs_main',
        bufferLayouts: [POINT_CLOUD_GEOMETRY_LAYOUT, POINT_CLOUD_INSTANCE_LAYOUT],
        primitive: this.renderConfig,
        blend: {
          color: {
            srcFactor: 'src-alpha',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add'
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add'
          }
        },
        depthStencil: {
          format: 'depth24plus',
          depthWriteEnabled: true,
          depthCompare: 'less'
        }
      }, format),
      cache
    );
  },

  getPickingPipeline(device, bindGroupLayout, cache) {
    return getOrCreatePipeline(
      device,
      "PointCloudPicking",
      () => createRenderPipeline(device, bindGroupLayout, {
        vertexShader: pickingVertCode,
        fragmentShader: pickingVertCode,
        vertexEntryPoint: 'vs_pointcloud',
        fragmentEntryPoint: 'fs_pick',
        bufferLayouts: [POINT_CLOUD_GEOMETRY_LAYOUT, POINT_CLOUD_PICKING_INSTANCE_LAYOUT]
      }, 'rgba8unorm'),
      cache
    );
  },

  createRenderObject(pipeline, pickingPipeline, instanceBufferInfo, pickingBufferInfo, instanceCount, resources) {
    if(!resources.billboardQuad){
      throw new Error("No billboard geometry available (not yet initialized).");
    }
    const { vb, ib } = resources.billboardQuad;

    return {
      pipeline,
      vertexBuffers: [vb, instanceBufferInfo!] as [GPUBuffer, BufferInfo],
      indexBuffer: ib,
      indexCount: 6,
      instanceCount,

      pickingPipeline,
      pickingVertexBuffers: [vb, pickingBufferInfo!] as [GPUBuffer, BufferInfo],
      pickingIndexBuffer: ib,
      pickingIndexCount: 6,
      pickingInstanceCount: instanceCount,

      componentIndex: -1,
      pickingDataStale: true,
    };
  }
};

/** ===================== ELLIPSOID ===================== **/
export interface EllipsoidComponentConfig {
  type: 'Ellipsoid';
  centers: Float32Array;
  radii?: Float32Array;
  radius: [number, number, number];  // Required singular option
  colors?: Float32Array;
  color: [number, number, number];  // Required singular option
  decorations?: Decoration[];
  onHover?: (index: number|null) => void;
  onClick?: (index: number) => void;
}

const ellipsoidSpec: PrimitiveSpec<EllipsoidComponentConfig> = {
  getCount(elem){
    return elem.centers.length / 3;
  },
  buildRenderData(elem){
    const { centers, radii, radius, colors, color } = elem;
    const count = centers.length / 3;
    if(count===0)return null;

    // (center.x, center.y, center.z, scale.x, scale.y, scale.z, color.r, color.g, color.b, alpha)
    const arr = new Float32Array(count*10);
    const hasColors = colors && colors.length===count*3;
    const hasRadii = radii && radii.length===count*3;

    for(let i=0; i<count; i++){
      arr[i*10+0] = centers[i*3+0];
      arr[i*10+1] = centers[i*3+1];
      arr[i*10+2] = centers[i*3+2];
      if(hasRadii) {
        arr[i*10+3] = radii[i*3+0];
        arr[i*10+4] = radii[i*3+1];
        arr[i*10+5] = radii[i*3+2];
      } else {
        arr[i*10+3] = radius[0];
        arr[i*10+4] = radius[1];
        arr[i*10+5] = radius[2];
      }
      if(hasColors){
        arr[i*10+6] = colors[i*3+0];
        arr[i*10+7] = colors[i*3+1];
        arr[i*10+8] = colors[i*3+2];
      } else {
        arr[i*10+6] = color[0];
        arr[i*10+7] = color[1];
        arr[i*10+8] = color[2];
      }
      arr[i*10+9] = 1.0;
    }
    // decorations
    if(elem.decorations){
      for(const dec of elem.decorations){
        for(const idx of dec.indexes){
          if(idx<0||idx>=count) continue;
          if(dec.color){
            arr[idx*10+6] = dec.color[0];
            arr[idx*10+7] = dec.color[1];
            arr[idx*10+8] = dec.color[2];
          }
          if(dec.alpha!==undefined){
            arr[idx*10+9] = dec.alpha;
          }
          if(dec.scale!==undefined){
            arr[idx*10+3]*=dec.scale;
            arr[idx*10+4]*=dec.scale;
            arr[idx*10+5]*=dec.scale;
          }
          if(dec.minSize!==undefined){
            if(arr[idx*10+3]<dec.minSize) arr[idx*10+3] = dec.minSize;
            if(arr[idx*10+4]<dec.minSize) arr[idx*10+4] = dec.minSize;
            if(arr[idx*10+5]<dec.minSize) arr[idx*10+5] = dec.minSize;
          }
        }
      }
    }
    return arr;
  },
  buildPickingData(elem, baseID){
    const { centers, radii, radius } = elem;
    const count=centers.length/3;
    if(count===0)return null;

    // (pos.x, pos.y, pos.z, scale.x, scale.y, scale.z, pickID)
    const arr = new Float32Array(count*7);
    const hasRadii = radii && radii.length===count*3;

    for(let i=0; i<count; i++){
      arr[i*7+0] = centers[i*3+0];
      arr[i*7+1] = centers[i*3+1];
      arr[i*7+2] = centers[i*3+2];
      if(hasRadii) {
        arr[i*7+3] = radii[i*3+0];
        arr[i*7+4] = radii[i*3+1];
        arr[i*7+5] = radii[i*3+2];
      } else {
        arr[i*7+3] = radius[0];
        arr[i*7+4] = radius[1];
        arr[i*7+5] = radius[2];
      }
      arr[i*7+6] = baseID + i;
    }
    return arr;
  },
  renderConfig: {
    cullMode: 'back',
    topology: 'triangle-list'
  },
  getRenderPipeline(device, bindGroupLayout, cache) {
    const format = navigator.gpu.getPreferredCanvasFormat();
    return getOrCreatePipeline(
      device,
      "EllipsoidShading",
      () => createTranslucentGeometryPipeline(device, bindGroupLayout, {
        vertexShader: ellipsoidVertCode,
        fragmentShader: ellipsoidFragCode,
        vertexEntryPoint: 'vs_main',
        fragmentEntryPoint: 'fs_main',
        bufferLayouts: [MESH_GEOMETRY_LAYOUT, ELLIPSOID_INSTANCE_LAYOUT]
      }, format, ellipsoidSpec),
      cache
    );
  },

  getPickingPipeline(device, bindGroupLayout, cache) {
    return getOrCreatePipeline(
      device,
      "EllipsoidPicking",
      () => createRenderPipeline(device, bindGroupLayout, {
        vertexShader: pickingVertCode,
        fragmentShader: pickingVertCode,
        vertexEntryPoint: 'vs_ellipsoid',
        fragmentEntryPoint: 'fs_pick',
        bufferLayouts: [MESH_GEOMETRY_LAYOUT, MESH_PICKING_INSTANCE_LAYOUT]
      }, 'rgba8unorm'),
      cache
    );
  },

  createRenderObject(pipeline, pickingPipeline, instanceBufferInfo, pickingBufferInfo, instanceCount, resources) {
    if(!resources.sphereGeo) throw new Error("No sphere geometry available");
    const { vb, ib, indexCount } = resources.sphereGeo;
    return {
      pipeline,
      vertexBuffers: [vb, instanceBufferInfo!] as [GPUBuffer, BufferInfo],
      indexBuffer: ib,
      indexCount,
      instanceCount,

      pickingPipeline,
      pickingVertexBuffers: [vb, pickingBufferInfo!] as [GPUBuffer, BufferInfo],
      pickingIndexBuffer: ib,
      pickingIndexCount: indexCount,
      pickingInstanceCount: instanceCount,

      componentIndex: -1,
      pickingDataStale: true,
    };
  }
};

/** ===================== ELLIPSOID BOUNDS ===================== **/
export interface EllipsoidAxesComponentConfig {
  type: 'EllipsoidAxes';
  centers: Float32Array;
  radii?: Float32Array;
  radius: [number, number, number];  // Required singular option
  colors?: Float32Array;
  color: [number, number, number];  // Required singular option
  decorations?: Decoration[];
  onHover?: (index: number|null) => void;
  onClick?: (index: number) => void;
}

const ellipsoidAxesSpec: PrimitiveSpec<EllipsoidAxesComponentConfig> = {
  getCount(elem) {
    // each ellipsoid => 3 rings
    const c = elem.centers.length/3;
    return c*3;
  },
  buildRenderData(elem) {
    const { centers, radii, radius, colors } = elem;
    const count = centers.length/3;
    if(count===0)return null;

    const ringCount = count*3;
    // (pos.x,pos.y,pos.z, scale.x,scale.y,scale.z, color.r,g,b, alpha)
    const arr = new Float32Array(ringCount*10);
    const hasRadii = radii && radii.length===count*3;

    for(let i=0;i<count;i++){
      const cx=centers[i*3+0], cy=centers[i*3+1], cz=centers[i*3+2];
      const rx = hasRadii ? radii[i*3+0] : radius[0];
      const ry = hasRadii ? radii[i*3+1] : radius[1];
      const rz = hasRadii ? radii[i*3+2] : radius[2];
      let cr=1, cg=1, cb=1, alpha=1;
      if(colors && colors.length===count*3){
        cr=colors[i*3+0]; cg=colors[i*3+1]; cb=colors[i*3+2];
      }
      // decorations
      if(elem.decorations){
        for(const dec of elem.decorations){
          if(dec.indexes.includes(i)){
            if(dec.color){
              cr=dec.color[0]; cg=dec.color[1]; cb=dec.color[2];
            }
            if(dec.alpha!==undefined){
              alpha=dec.alpha;
            }
          }
        }
      }
      // fill 3 rings
      for(let ring=0; ring<3; ring++){
        const idx = i*3 + ring;
        arr[idx*10+0] = cx;
        arr[idx*10+1] = cy;
        arr[idx*10+2] = cz;
        arr[idx*10+3] = rx; arr[idx*10+4] = ry; arr[idx*10+5] = rz;
        arr[idx*10+6] = cr; arr[idx*10+7] = cg; arr[idx*10+8] = cb;
        arr[idx*10+9] = alpha;
      }
    }
    return arr;
  },
  buildPickingData(elem, baseID){
    const { centers, radii, radius } = elem;
    const count=centers.length/3;
    if(count===0)return null;
    const ringCount = count*3;
    const arr = new Float32Array(ringCount*7);
    const hasRadii = radii && radii.length===count*3;

    for(let i=0;i<count;i++){
      const cx=centers[i*3+0], cy=centers[i*3+1], cz=centers[i*3+2];
      const rx = hasRadii ? radii[i*3+0] : radius[0];
      const ry = hasRadii ? radii[i*3+1] : radius[1];
      const rz = hasRadii ? radii[i*3+2] : radius[2];
      const thisID = baseID + i;
      for(let ring=0; ring<3; ring++){
        const idx = i*3 + ring;
        arr[idx*7+0] = cx;
        arr[idx*7+1] = cy;
        arr[idx*7+2] = cz;
        arr[idx*7+3] = rx; arr[idx*7+4] = ry; arr[idx*7+5] = rz;
        arr[idx*7+6] = thisID;
      }
    }
    return arr;
  },
  renderConfig: {
    cullMode: 'back',
    topology: 'triangle-list'
  },
  getRenderPipeline(device, bindGroupLayout, cache) {
    const format = navigator.gpu.getPreferredCanvasFormat();
    return getOrCreatePipeline(
      device,
      "EllipsoidAxesShading",
      () => createTranslucentGeometryPipeline(device, bindGroupLayout, {
        vertexShader: ringVertCode,
        fragmentShader: ringFragCode,
        vertexEntryPoint: 'vs_main',
        fragmentEntryPoint: 'fs_main',
        bufferLayouts: [MESH_GEOMETRY_LAYOUT, ELLIPSOID_INSTANCE_LAYOUT],
        blend: {} // Use defaults
      }, format, ellipsoidAxesSpec),
      cache
    );
  },

  getPickingPipeline(device, bindGroupLayout, cache) {
    return getOrCreatePipeline(
      device,
      "EllipsoidAxesPicking",
      () => createRenderPipeline(device, bindGroupLayout, {
        vertexShader: pickingVertCode,
        fragmentShader: pickingVertCode,
        vertexEntryPoint: 'vs_bands',
        fragmentEntryPoint: 'fs_pick',
        bufferLayouts: [MESH_GEOMETRY_LAYOUT, MESH_PICKING_INSTANCE_LAYOUT]
      }, 'rgba8unorm'),
      cache
    );
  },

  createRenderObject(pipeline, pickingPipeline, instanceBufferInfo, pickingBufferInfo, instanceCount, resources) {
    if(!resources.ringGeo) throw new Error("No ring geometry available");
    const { vb, ib, indexCount } = resources.ringGeo;
    return {
      pipeline,
      vertexBuffers: [vb, instanceBufferInfo!] as [GPUBuffer, BufferInfo],
      indexBuffer: ib,
      indexCount,
      instanceCount,

      pickingPipeline,
      pickingVertexBuffers: [vb, pickingBufferInfo!] as [GPUBuffer, BufferInfo],
      pickingIndexBuffer: ib,
      pickingIndexCount: indexCount,
      pickingInstanceCount: instanceCount,

      componentIndex: -1,
      pickingDataStale: true,
    };
  }
};

/** ===================== CUBOID ===================== **/
export interface CuboidComponentConfig {
  type: 'Cuboid';
  centers: Float32Array;
  sizes: Float32Array;
  colors?: Float32Array;
  color: [number, number, number];  // Required singular option
  decorations?: Decoration[];
  onHover?: (index: number|null) => void;
  onClick?: (index: number) => void;
}

const cuboidSpec: PrimitiveSpec<CuboidComponentConfig> = {
  getCount(elem){
    return elem.centers.length / 3;
  },
  buildRenderData(elem){
    const { centers, sizes, colors, color } = elem;
    const count = centers.length / 3;
    if(count===0)return null;

    // (center.x, center.y, center.z, size.x, size.y, size.z, color.r, color.g, color.b, alpha)
    const arr = new Float32Array(count*10);
    const hasColors = colors && colors.length===count*3;

    for(let i=0; i<count; i++){
      arr[i*10+0] = centers[i*3+0];
      arr[i*10+1] = centers[i*3+1];
      arr[i*10+2] = centers[i*3+2];
      arr[i*10+3] = sizes[i*3+0] || 0.1;
      arr[i*10+4] = sizes[i*3+1] || 0.1;
      arr[i*10+5] = sizes[i*3+2] || 0.1;
      if(hasColors){
        arr[i*10+6] = colors[i*3+0];
        arr[i*10+7] = colors[i*3+1];
        arr[i*10+8] = colors[i*3+2];
      } else {
        arr[i*10+6] = color[0];
        arr[i*10+7] = color[1];
        arr[i*10+8] = color[2];
      }
      arr[i*10+9] = 1.0;
    }
    // decorations
    if(elem.decorations){
      for(const dec of elem.decorations){
        for(const idx of dec.indexes){
          if(idx<0||idx>=count) continue;
          if(dec.color){
            arr[idx*10+6] = dec.color[0];
            arr[idx*10+7] = dec.color[1];
            arr[idx*10+8] = dec.color[2];
          }
          if(dec.alpha!==undefined){
            arr[idx*10+9] = dec.alpha;
          }
          if(dec.scale!==undefined){
            arr[idx*10+3]*=dec.scale;
            arr[idx*10+4]*=dec.scale;
            arr[idx*10+5]*=dec.scale;
          }
          if(dec.minSize!==undefined){
            if(arr[idx*10+3]<dec.minSize) arr[idx*10+3] = dec.minSize;
            if(arr[idx*10+4]<dec.minSize) arr[idx*10+4] = dec.minSize;
            if(arr[idx*10+5]<dec.minSize) arr[idx*10+5] = dec.minSize;
          }
        }
      }
    }
    return arr;
  },
  buildPickingData(elem, baseID){
    const { centers, sizes } = elem;
    const count=centers.length/3;
    if(count===0)return null;

    // (center.x, center.y, center.z, size.x, size.y, size.z, pickID)
    const arr = new Float32Array(count*7);
    for(let i=0; i<count; i++){
      arr[i*7+0] = centers[i*3+0];
      arr[i*7+1] = centers[i*3+1];
      arr[i*7+2] = centers[i*3+2];
      arr[i*7+3] = sizes[i*3+0]||0.1;
      arr[i*7+4] = sizes[i*3+1]||0.1;
      arr[i*7+5] = sizes[i*3+2]||0.1;
      arr[i*7+6] = baseID + i;
    }
    return arr;
  },
  renderConfig: {
    cullMode: 'none',  // Cuboids need to be visible from both sides
    topology: 'triangle-list'
  },
  getRenderPipeline(device, bindGroupLayout, cache) {
    const format = navigator.gpu.getPreferredCanvasFormat();
    return getOrCreatePipeline(
      device,
      "CuboidShading",
      () => createTranslucentGeometryPipeline(device, bindGroupLayout, {
        vertexShader: cuboidVertCode,
        fragmentShader: cuboidFragCode,
        vertexEntryPoint: 'vs_main',
        fragmentEntryPoint: 'fs_main',
        bufferLayouts: [MESH_GEOMETRY_LAYOUT, ELLIPSOID_INSTANCE_LAYOUT]
      }, format, cuboidSpec),
      cache
    );
  },

  getPickingPipeline(device, bindGroupLayout, cache) {
    return getOrCreatePipeline(
      device,
      "CuboidPicking",
      () => createRenderPipeline(device, bindGroupLayout, {
        vertexShader: pickingVertCode,
        fragmentShader: pickingVertCode,
        vertexEntryPoint: 'vs_cuboid',
        fragmentEntryPoint: 'fs_pick',
        bufferLayouts: [MESH_GEOMETRY_LAYOUT, MESH_PICKING_INSTANCE_LAYOUT],
        primitive: this.renderConfig
      }, 'rgba8unorm'),
      cache
    );
  },

  createRenderObject(pipeline, pickingPipeline, instanceBufferInfo, pickingBufferInfo, instanceCount, resources) {
    if(!resources.cubeGeo) throw new Error("No cube geometry available");
    const { vb, ib, indexCount } = resources.cubeGeo;
    return {
      pipeline,
      vertexBuffers: [vb, instanceBufferInfo!] as [GPUBuffer, BufferInfo],
      indexBuffer: ib,
      indexCount,
      instanceCount,

      pickingPipeline,
      pickingVertexBuffers: [vb, pickingBufferInfo!] as [GPUBuffer, BufferInfo],
      pickingIndexBuffer: ib,
      pickingIndexCount: indexCount,
      pickingInstanceCount: instanceCount,

      componentIndex: -1,
      pickingDataStale: true,
    };
  }
};

/******************************************************
 * 4) Pipeline Cache Helper
 ******************************************************/
// Update the pipeline cache to include device reference
export interface PipelineCacheEntry {
  pipeline: GPURenderPipeline;
  device: GPUDevice;
}

function getOrCreatePipeline(
  device: GPUDevice,
  key: string,
  createFn: () => GPURenderPipeline,
  cache: Map<string, PipelineCacheEntry>  // This will be the instance cache
): GPURenderPipeline {
  const entry = cache.get(key);
  if (entry && entry.device === device) {
    return entry.pipeline;
  }

  // Create new pipeline and cache it with device reference
  const pipeline = createFn();
  cache.set(key, { pipeline, device });
  return pipeline;
}

/******************************************************
 * 5) Common Resources: Geometry, Layout, etc.
 ******************************************************/
export interface GeometryResources {
  sphereGeo: { vb: GPUBuffer; ib: GPUBuffer; indexCount: number } | null;
  ringGeo: { vb: GPUBuffer; ib: GPUBuffer; indexCount: number } | null;
  billboardQuad: { vb: GPUBuffer; ib: GPUBuffer } | null;
  cubeGeo: { vb: GPUBuffer; ib: GPUBuffer; indexCount: number } | null;
}

function initGeometryResources(device: GPUDevice, resources: GeometryResources) {
  // Create sphere geometry
  if(!resources.sphereGeo) {
    const { vertexData, indexData } = createSphereGeometry(32,48);  // Doubled from 16,24
    const vb = device.createBuffer({
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(vb,0,vertexData);
    const ib = device.createBuffer({
      size: indexData.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(ib,0,indexData);
    resources.sphereGeo = { vb, ib, indexCount: indexData.length };
  }

  // Create ring geometry
  if(!resources.ringGeo) {
    const { vertexData, indexData } = createTorusGeometry(1.0,0.03,40,12);
    const vb = device.createBuffer({
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(vb,0,vertexData);
    const ib = device.createBuffer({
      size: indexData.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(ib,0,indexData);
    resources.ringGeo = { vb, ib, indexCount: indexData.length };
  }

  // Create billboard quad geometry
  if(!resources.billboardQuad) {
    // Create a unit quad centered at origin, in the XY plane
    // Each vertex has position (xyz) and normal (xyz)
    const quadVerts = new Float32Array([
      // Position (xyz)     Normal (xyz)
      -0.5, -0.5, 0.0,     0.0, 0.0, 1.0,  // bottom-left
       0.5, -0.5, 0.0,     0.0, 0.0, 1.0,  // bottom-right
      -0.5,  0.5, 0.0,     0.0, 0.0, 1.0,  // top-left
       0.5,  0.5, 0.0,     0.0, 0.0, 1.0   // top-right
    ]);
    const quadIdx = new Uint16Array([0,1,2, 2,1,3]);
    const vb = device.createBuffer({
      size: quadVerts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(vb,0,quadVerts);
    const ib = device.createBuffer({
      size: quadIdx.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(ib,0,quadIdx);
    resources.billboardQuad = { vb, ib };
  }

  // Create cube geometry
  if(!resources.cubeGeo) {
    const cube = createCubeGeometry();
    const vb = device.createBuffer({
      size: cube.vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(vb, 0, cube.vertexData);
    const ib = device.createBuffer({
      size: cube.indexData.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(ib, 0, cube.indexData);
    resources.cubeGeo = { vb, ib, indexCount: cube.indexData.length };
  }
}

/******************************************************
 * 6) Pipeline Configuration Helpers
 ******************************************************/
interface VertexBufferLayout {
  arrayStride: number;
  stepMode?: GPUVertexStepMode;
  attributes: {
    shaderLocation: number;
    offset: number;
    format: GPUVertexFormat;
  }[];
}

interface PipelineConfig {
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
  colorWriteMask?: GPUColorWriteFlags;  // Add this to control color writes
}

function createRenderPipeline(
  device: GPUDevice,
  bindGroupLayout: GPUBindGroupLayout,
  config: PipelineConfig,
  format: GPUTextureFormat
): GPURenderPipeline {
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout]
  });

  // Get primitive configuration with defaults
  const primitiveConfig = {
    topology: config.primitive?.topology || 'triangle-list',
    cullMode: config.primitive?.cullMode || 'back'
  };

  return device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module: device.createShaderModule({ code: config.vertexShader }),
      entryPoint: config.vertexEntryPoint,
      buffers: config.bufferLayouts
    },
    fragment: {
      module: device.createShaderModule({ code: config.fragmentShader }),
      entryPoint: config.fragmentEntryPoint,
      targets: [{
        format,
        writeMask: config.colorWriteMask ?? GPUColorWrite.ALL,
        ...(config.blend && {
          blend: {
            color: config.blend.color || {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha'
            },
            alpha: config.blend.alpha || {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha'
            }
          }
        })
      }]
    },
    primitive: primitiveConfig,
    depthStencil: config.depthStencil || {
      format: 'depth24plus',
      depthWriteEnabled: true,
      depthCompare: 'less'
    }
  });
}

function createTranslucentGeometryPipeline(
  device: GPUDevice,
  bindGroupLayout: GPUBindGroupLayout,
  config: PipelineConfig,
  format: GPUTextureFormat,
  primitiveSpec: PrimitiveSpec<any>  // Take the primitive spec instead of just type
): GPURenderPipeline {
  return createRenderPipeline(device, bindGroupLayout, {
    ...config,
    primitive: primitiveSpec.renderConfig,
    blend: {
      color: {
        srcFactor: 'src-alpha',
        dstFactor: 'one-minus-src-alpha',
        operation: 'add'
      },
      alpha: {
        srcFactor: 'one',
        dstFactor: 'one-minus-src-alpha',
        operation: 'add'
      }
    },
    depthStencil: {
      format: 'depth24plus',
      depthWriteEnabled: true,
      depthCompare: 'less'
    }
  }, format);
}


// Common vertex buffer layouts
const POINT_CLOUD_GEOMETRY_LAYOUT: VertexBufferLayout = {
  arrayStride: 24,  // 6 floats * 4 bytes
  attributes: [
    {  // position xyz
      shaderLocation: 0,
      offset: 0,
      format: 'float32x3'
    },
    {  // normal xyz
      shaderLocation: 1,
      offset: 12,
      format: 'float32x3'
    }
  ]
};

const POINT_CLOUD_INSTANCE_LAYOUT: VertexBufferLayout = {
  arrayStride: 32,  // 8 floats * 4 bytes
  stepMode: 'instance',
  attributes: [
    {shaderLocation: 2, offset: 0,  format: 'float32x3'},  // instancePos
    {shaderLocation: 3, offset: 12, format: 'float32x3'},  // color
    {shaderLocation: 4, offset: 24, format: 'float32'},    // alpha
    {shaderLocation: 5, offset: 28, format: 'float32'}     // size
  ]
};

const POINT_CLOUD_PICKING_INSTANCE_LAYOUT: VertexBufferLayout = {
  arrayStride: 20,  // 5 floats * 4 bytes
  stepMode: 'instance',
  attributes: [
    {shaderLocation: 2, offset: 0,   format: 'float32x3'},  // instancePos
    {shaderLocation: 3, offset: 12,  format: 'float32'},    // pickID
    {shaderLocation: 4, offset: 16,  format: 'float32'}     // size
  ]
};

const MESH_GEOMETRY_LAYOUT: VertexBufferLayout = {
  arrayStride: 6*4,
  attributes: [
    {shaderLocation: 0, offset: 0,   format: 'float32x3'},
    {shaderLocation: 1, offset: 3*4, format: 'float32x3'}
  ]
};

const ELLIPSOID_INSTANCE_LAYOUT: VertexBufferLayout = {
  arrayStride: 10*4,
  stepMode: 'instance',
  attributes: [
    {shaderLocation: 2, offset: 0,     format: 'float32x3'},
    {shaderLocation: 3, offset: 3*4,   format: 'float32x3'},
    {shaderLocation: 4, offset: 6*4,   format: 'float32x3'},
    {shaderLocation: 5, offset: 9*4,   format: 'float32'}
  ]
};

const MESH_PICKING_INSTANCE_LAYOUT: VertexBufferLayout = {
  arrayStride: 7*4,
  stepMode: 'instance',
  attributes: [
    {shaderLocation: 2, offset: 0,   format: 'float32x3'},
    {shaderLocation: 3, offset: 3*4, format: 'float32x3'},
    {shaderLocation: 4, offset: 6*4, format: 'float32'}
  ]
};

/******************************************************
 * 7) Primitive Registry
 ******************************************************/
export type ComponentConfig =
  | PointCloudComponentConfig
  | EllipsoidComponentConfig
  | EllipsoidAxesComponentConfig
  | CuboidComponentConfig;

const primitiveRegistry: Record<ComponentConfig['type'], PrimitiveSpec<any>> = {
  PointCloud: pointCloudSpec,  // Use consolidated spec
  Ellipsoid: ellipsoidSpec,
  EllipsoidAxes: ellipsoidAxesSpec,
  Cuboid: cuboidSpec,
};


/******************************************************
 * 8) Scene
 ******************************************************/

export function SceneInner({
  components,
  containerWidth,
  containerHeight,
  style,
  camera: controlledCamera,
  defaultCamera,
  onCameraChange
}: SceneInnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // We'll store references to the GPU + other stuff in a ref object
  const gpuRef = useRef<{
    device: GPUDevice;
    context: GPUCanvasContext;
    uniformBuffer: GPUBuffer;
    uniformBindGroup: GPUBindGroup;
    bindGroupLayout: GPUBindGroupLayout;
    depthTexture: GPUTexture | null;
    pickTexture: GPUTexture | null;
    pickDepthTexture: GPUTexture | null;
    readbackBuffer: GPUBuffer;

    renderObjects: RenderObject[];
    componentBaseId: number[];
    idToComponent: ({componentIdx: number, instanceIdx: number} | null)[];
    pipelineCache: Map<string, PipelineCacheEntry>;  // Add this
    dynamicBuffers: DynamicBuffers | null;
    resources: GeometryResources;  // Add this
  } | null>(null);

  const [isReady, setIsReady] = useState(false);

  // Helper function to safely convert to array
  function toArray(value: [number, number, number] | Float32Array | undefined): [number, number, number] {
      if (!value) return [0, 0, 0];
      return Array.from(value) as [number, number, number];
  }

  // Update the camera initialization
  const [internalCamera, setInternalCamera] = useState<CameraState>(() => {
      const initial = defaultCamera || DEFAULT_CAMERA;
      return createCameraState(initial);
  });

  // Use the appropriate camera state based on whether we're controlled or not
  const activeCamera = useMemo(() => {
      if (controlledCamera) {
          return createCameraState(controlledCamera);
      }
      return internalCamera;
  }, [controlledCamera, internalCamera]);

  // Update handleCameraUpdate to use activeCamera
  const handleCameraUpdate = useCallback((updateFn: (camera: CameraState) => CameraState) => {
    const newCameraState = updateFn(activeCamera);

    if (controlledCamera) {
        onCameraChange?.(createCameraParams(newCameraState));
    } else {
        setInternalCamera(newCameraState);
        onCameraChange?.(createCameraParams(newCameraState));
    }
}, [activeCamera, controlledCamera, onCameraChange]);

  // We'll also track a picking lock
  const pickingLockRef = useRef(false);

  // Add hover state tracking
  const lastHoverState = useRef<{componentIdx: number, instanceIdx: number} | null>(null);

  /******************************************************
   * A) initWebGPU
   ******************************************************/
  const initWebGPU = useCallback(async()=>{
    if(!canvasRef.current) return;
    if(!navigator.gpu) {
      console.error("WebGPU not supported in this browser.");
      return;
    }
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if(!adapter) throw new Error("No GPU adapter found");
      const device = await adapter.requestDevice();

      const context = canvasRef.current.getContext('webgpu') as GPUCanvasContext;
      const format = navigator.gpu.getPreferredCanvasFormat();
      context.configure({ device, format, alphaMode:'premultiplied' });

      // Create bind group layout
      const bindGroupLayout = device.createBindGroupLayout({
        entries: [{
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {type:'uniform'}
        }]
      });

      // Create uniform buffer
      const uniformBufferSize=128;
      const uniformBuffer=device.createBuffer({
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });

      // Create bind group using the new layout
      const uniformBindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{ binding:0, resource:{ buffer:uniformBuffer } }]
      });

      // Readback buffer for picking
      const readbackBuffer = device.createBuffer({
        size: 256,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        label: 'Picking readback buffer'
      });

      // First create gpuRef.current with empty resources
      gpuRef.current = {
        device,
        context,
        uniformBuffer,
        uniformBindGroup,
        bindGroupLayout,
        depthTexture: null,
        pickTexture: null,
        pickDepthTexture: null,
        readbackBuffer,
        renderObjects: [],
        componentBaseId: [],
        idToComponent: [null],  // First ID (0) is reserved
        pipelineCache: new Map(),
        dynamicBuffers: null,
        resources: {
          sphereGeo: null,
          ringGeo: null,
          billboardQuad: null,
          cubeGeo: null
        }
      };

      // Now initialize geometry resources
      initGeometryResources(device, gpuRef.current.resources);

      setIsReady(true);
    } catch(err){
      console.error("initWebGPU error:", err);
    }
  },[]);

  /******************************************************
   * B) Depth & Pick textures
   ******************************************************/
  const createOrUpdateDepthTexture = useCallback(() => {
    if(!gpuRef.current || !canvasRef.current) return;
    const { device, depthTexture } = gpuRef.current;

    // Get the actual canvas size
    const canvas = canvasRef.current;
    const displayWidth = canvas.width;
    const displayHeight = canvas.height;

    if(depthTexture) depthTexture.destroy();
    const dt = device.createTexture({
        size: [displayWidth, displayHeight],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    gpuRef.current.depthTexture = dt;
}, []);

  const createOrUpdatePickTextures = useCallback(() => {
    if(!gpuRef.current || !canvasRef.current) return;
    const { device, pickTexture, pickDepthTexture } = gpuRef.current;

    // Get the actual canvas size
    const canvas = canvasRef.current;
    const displayWidth = canvas.width;
    const displayHeight = canvas.height;

    if(pickTexture) pickTexture.destroy();
    if(pickDepthTexture) pickDepthTexture.destroy();

    const colorTex = device.createTexture({
        size: [displayWidth, displayHeight],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
    });
    const depthTex = device.createTexture({
        size: [displayWidth, displayHeight],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    gpuRef.current.pickTexture = colorTex;
    gpuRef.current.pickDepthTexture = depthTex;
}, []);

  /******************************************************
   * C) Building the RenderObjects (no if/else)
   ******************************************************/
  // Move ID mapping logic to a separate function
  const buildComponentIdMapping = useCallback((components: ComponentConfig[]) => {
    if (!gpuRef.current) return;

    // Reset ID mapping
    gpuRef.current.idToComponent = [null];  // First ID (0) is reserved
    let currentID = 1;

    // Build new mapping
    components.forEach((elem, componentIdx) => {
      const spec = primitiveRegistry[elem.type];
      if (!spec) {
        gpuRef.current!.componentBaseId[componentIdx] = 0;
        return;
      }

      const count = spec.getCount(elem);
      gpuRef.current!.componentBaseId[componentIdx] = currentID;

      // Expand global ID table
      for (let j = 0; j < count; j++) {
        gpuRef.current!.idToComponent[currentID + j] = {
          componentIdx: componentIdx,
          instanceIdx: j
        };
      }
      currentID += count;
    });
  }, []);

  // Fix the calculateBufferSize function
  function calculateBufferSize(components: ComponentConfig[]): { renderSize: number, pickingSize: number } {
    let renderSize = 0;
    let pickingSize = 0;

    components.forEach(elem => {
      const spec = primitiveRegistry[elem.type];
      if (!spec) return;

      const count = spec.getCount(elem);
      const renderData = spec.buildRenderData(elem);
      const pickData = spec.buildPickingData(elem, 0);

      if (renderData) {
        // Calculate stride and ensure it's aligned to 4 bytes
        const floatsPerInstance = renderData.length / count;
        const renderStride = Math.ceil(floatsPerInstance) * 4;
        // Add to total size (not max)
        const alignedSize = renderStride * count;
        renderSize += alignedSize;
      }

      if (pickData) {
        // Calculate stride and ensure it's aligned to 4 bytes
        const floatsPerInstance = pickData.length / count;
        const pickStride = Math.ceil(floatsPerInstance) * 4;
        // Add to total size (not max)
        const alignedSize = pickStride * count;
        pickingSize += alignedSize;
      }
    });

    // Add generous padding (100%) and align to 4 bytes
    renderSize = Math.ceil((renderSize * 2) / 4) * 4;
    pickingSize = Math.ceil((pickingSize * 2) / 4) * 4;

    return { renderSize, pickingSize };
  }

  // Modify createDynamicBuffers to take specific sizes
  function createDynamicBuffers(device: GPUDevice, renderSize: number, pickingSize: number) {
    const renderBuffer = device.createBuffer({
      size: renderSize,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: false
    });

    const pickingBuffer = device.createBuffer({
      size: pickingSize,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: false
    });

    return {
      renderBuffer,
      pickingBuffer,
      renderOffset: 0,
      pickingOffset: 0
    };
  }

  // Update buildRenderObjects to use correct stride calculation
  function buildRenderObjects(components: ComponentConfig[]): RenderObject[] {
    if(!gpuRef.current) return [];
    const { device, bindGroupLayout, pipelineCache, resources } = gpuRef.current;

      // Calculate required buffer sizes
    const { renderSize, pickingSize } = calculateBufferSize(components);

    // Create or recreate dynamic buffers if needed
    if (!gpuRef.current.dynamicBuffers ||
        gpuRef.current.dynamicBuffers.renderBuffer.size < renderSize ||
        gpuRef.current.dynamicBuffers.pickingBuffer.size < pickingSize) {

      // Cleanup old buffers if they exist
      if (gpuRef.current.dynamicBuffers) {
        gpuRef.current.dynamicBuffers.renderBuffer.destroy();
        gpuRef.current.dynamicBuffers.pickingBuffer.destroy();
      }

      gpuRef.current.dynamicBuffers = createDynamicBuffers(device, renderSize, pickingSize);
    }
    const dynamicBuffers = gpuRef.current.dynamicBuffers!;

      // Reset buffer offsets
      dynamicBuffers.renderOffset = 0;
      dynamicBuffers.pickingOffset = 0;

      // Initialize componentBaseId array
      gpuRef.current.componentBaseId = [];

      // Build ID mapping
      buildComponentIdMapping(components);

    const validRenderObjects: RenderObject[] = [];

      components.forEach((elem, i) => {
      const spec = primitiveRegistry[elem.type];
      if(!spec) {
        console.warn(`Unknown primitive type: ${elem.type}`);
        return;
      }

      try {
        const count = spec.getCount(elem);
        if (count === 0) {
          console.warn(`Component ${i} (${elem.type}) has no instances`);
          return;
        }

        const renderData = spec.buildRenderData(elem);
        if (!renderData) {
          console.warn(`Failed to build render data for component ${i} (${elem.type})`);
          return;
        }

        let renderOffset = 0;
        let stride = 0;
        if(renderData.length > 0) {
          renderOffset = Math.ceil(dynamicBuffers.renderOffset / 4) * 4;
          // Calculate stride based on float count (4 bytes per float)
          const floatsPerInstance = renderData.length / count;
          stride = Math.ceil(floatsPerInstance) * 4;

          device.queue.writeBuffer(
            dynamicBuffers.renderBuffer,
            renderOffset,
            renderData.buffer,
            renderData.byteOffset,
            renderData.byteLength
          );
          dynamicBuffers.renderOffset = renderOffset + (stride * count);
        }

        const pipeline = spec.getRenderPipeline(device, bindGroupLayout, pipelineCache);
        if (!pipeline) {
          console.warn(`Failed to create pipeline for component ${i} (${elem.type})`);
          return;
        }

        // Create render object with dynamic buffer reference
        const baseRenderObject = spec.createRenderObject(
          pipeline,
          null!, // We'll set this later in ensurePickingData
          {  // Pass buffer info instead of buffer
            buffer: dynamicBuffers.renderBuffer,
            offset: renderOffset,
            stride: stride
          },
          null, // No picking buffer yet
          count,
          resources
        );

        if (!baseRenderObject.vertexBuffers || baseRenderObject.vertexBuffers.length !== 2) {
          console.warn(`Invalid vertex buffers for component ${i} (${elem.type})`);
          return;
        }

        const renderObject: RenderObject = {
          ...baseRenderObject,
          pickingPipeline: undefined,
          pickingVertexBuffers: [undefined, undefined] as [GPUBuffer | undefined, BufferInfo | undefined],
          pickingDataStale: true,
          componentIndex: i
        };

          validRenderObjects.push(renderObject);
      } catch (error) {
        console.error(`Error creating render object for component ${i} (${elem.type}):`, error);
      }
      });

    return validRenderObjects;
  }

  /******************************************************
   * D) Render pass (single call, no loop)
   ******************************************************/

  // Add validation helper
function isValidRenderObject(ro: RenderObject): ro is Required<Pick<RenderObject, 'pipeline' | 'vertexBuffers' | 'instanceCount'>> & {
  vertexBuffers: [GPUBuffer, BufferInfo];
} & RenderObject {
  return (
    ro.pipeline !== undefined &&
    Array.isArray(ro.vertexBuffers) &&
    ro.vertexBuffers.length === 2 &&
    ro.vertexBuffers[0] !== undefined &&
    ro.vertexBuffers[1] !== undefined &&
    'buffer' in ro.vertexBuffers[1] &&
    'offset' in ro.vertexBuffers[1] &&
    (ro.indexBuffer !== undefined || ro.vertexCount !== undefined) &&
    typeof ro.instanceCount === 'number' &&
    ro.instanceCount > 0
  );
}

  const renderFrame = useCallback((camState: CameraState) => {
    if(!gpuRef.current) return;
    const {
      device, context, uniformBuffer, uniformBindGroup,
      renderObjects, depthTexture
    } = gpuRef.current;

    // Update camera uniforms
    const aspect = containerWidth / containerHeight;
    const view = glMatrix.mat4.lookAt(
      glMatrix.mat4.create(),
      camState.position,
      camState.target,
      camState.up
    );

    const proj = glMatrix.mat4.perspective(
      glMatrix.mat4.create(),
      glMatrix.glMatrix.toRadian(camState.fov),
      aspect,
      camState.near,
      camState.far
    );

    // Compute MVP matrix
    const mvp = glMatrix.mat4.multiply(
      glMatrix.mat4.create(),
      proj,
      view
    );

    // Compute camera vectors for lighting
    const forward = glMatrix.vec3.sub(glMatrix.vec3.create(), camState.target, camState.position);
    const right = glMatrix.vec3.cross(glMatrix.vec3.create(), forward, camState.up);
    glMatrix.vec3.normalize(right, right);

    const camUp = glMatrix.vec3.cross(glMatrix.vec3.create(), right, forward);
    glMatrix.vec3.normalize(camUp, camUp);
    glMatrix.vec3.normalize(forward, forward);

    // Compute light direction in camera space
    const lightDir = glMatrix.vec3.create();
    glMatrix.vec3.scaleAndAdd(lightDir, lightDir, right, LIGHTING.DIRECTION.RIGHT);
    glMatrix.vec3.scaleAndAdd(lightDir, lightDir, camUp, LIGHTING.DIRECTION.UP);
    glMatrix.vec3.scaleAndAdd(lightDir, lightDir, forward, LIGHTING.DIRECTION.FORWARD);
    glMatrix.vec3.normalize(lightDir, lightDir);

    // Write uniforms
    const uniformData = new Float32Array([
      ...Array.from(mvp),
      right[0], right[1], right[2], 0,  // pad to vec4
      camUp[0], camUp[1], camUp[2], 0,  // pad to vec4
      lightDir[0], lightDir[1], lightDir[2], 0,  // pad to vec4
      camState.position[0], camState.position[1], camState.position[2], 0  // Add camera position
    ]);
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    // Begin render pass
    const cmd = device.createCommandEncoder();
    const pass = cmd.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store'
      }],
      depthStencilAttachment: depthTexture ? {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store'
      } : undefined
    });

    // Draw each object
    for(const ro of renderObjects) {
      if (!isValidRenderObject(ro)) {
        continue;
      }

      // Now TypeScript knows ro.pipeline is defined
      pass.setPipeline(ro.pipeline);
      pass.setBindGroup(0, uniformBindGroup);

      // And ro.vertexBuffers[0] is defined
      pass.setVertexBuffer(0, ro.vertexBuffers[0]);

      // And ro.vertexBuffers[1] is defined
      const instanceInfo = ro.vertexBuffers[1];
      pass.setVertexBuffer(1, instanceInfo.buffer, instanceInfo.offset);

      if(ro.indexBuffer) {
        pass.setIndexBuffer(ro.indexBuffer, 'uint16');
        pass.drawIndexed(ro.indexCount ?? 0, ro.instanceCount ?? 1);
      } else {
        pass.draw(ro.vertexCount ?? 0, ro.instanceCount ?? 1);
      }
    }

    pass.end();
    device.queue.submit([cmd.finish()]);
  }, [containerWidth, containerHeight]);

  /******************************************************
   * E) Pick pass (on hover/click)
   ******************************************************/
  async function pickAtScreenXY(screenX: number, screenY: number, mode: 'hover'|'click') {
    if(!gpuRef.current || !canvasRef.current || pickingLockRef.current) return;
    const pickingId = Date.now();
    const currentPickingId = pickingId;
    pickingLockRef.current = true;

    try {
      const {
        device, pickTexture, pickDepthTexture, readbackBuffer,
        uniformBindGroup, renderObjects, idToComponent
      } = gpuRef.current;
      if(!pickTexture || !pickDepthTexture || !readbackBuffer) return;
      if (currentPickingId !== pickingId) return;

      // Ensure picking data is ready for all objects
      renderObjects.forEach((ro, i) => {
        if (ro.pickingDataStale) {
          ensurePickingData(ro, components[i]);
        }
      });

      // Convert screen coordinates to device pixels
      const dpr = window.devicePixelRatio || 1;
      const pickX = Math.floor(screenX * dpr);
      const pickY = Math.floor(screenY * dpr);
      const displayWidth = Math.floor(containerWidth * dpr);
      const displayHeight = Math.floor(containerHeight * dpr);

      if(pickX < 0 || pickY < 0 || pickX >= displayWidth || pickY >= displayHeight) {
        if(mode === 'hover') handleHoverID(0);
        return;
      }

      const cmd = device.createCommandEncoder({label: 'Picking encoder'});
      const passDesc: GPURenderPassDescriptor = {
        colorAttachments:[{
          view: pickTexture.createView(),
          clearValue:{r:0,g:0,b:0,a:1},
          loadOp:'clear',
          storeOp:'store'
        }],
        depthStencilAttachment:{
          view: pickDepthTexture.createView(),
          depthClearValue:1.0,
          depthLoadOp:'clear',
          depthStoreOp:'store'
        }
      };
      const pass = cmd.beginRenderPass(passDesc);
      pass.setBindGroup(0, uniformBindGroup);

      for(const ro of renderObjects) {
        if (!ro.pickingPipeline || !ro.pickingVertexBuffers || ro.pickingVertexBuffers.length !== 2) {
          continue;
        }

        pass.setPipeline(ro.pickingPipeline);

        // Set geometry buffer (always first)
        const geometryBuffer = ro.pickingVertexBuffers[0];
        pass.setVertexBuffer(0, geometryBuffer);

        // Set instance buffer (always second)
        const instanceInfo = ro.pickingVertexBuffers[1];
        if (instanceInfo) {
          pass.setVertexBuffer(1, instanceInfo.buffer, instanceInfo.offset);
        }

        if(ro.pickingIndexBuffer) {
          pass.setIndexBuffer(ro.pickingIndexBuffer, 'uint16');
          pass.drawIndexed(ro.pickingIndexCount ?? 0, ro.pickingInstanceCount ?? 1);
        } else {
          pass.draw(ro.pickingVertexCount ?? 0, ro.pickingInstanceCount ?? 1);
        }
      }

      pass.end();

      cmd.copyTextureToBuffer(
        {texture: pickTexture, origin:{x:pickX,y:pickY}},
        {buffer: readbackBuffer, bytesPerRow:256, rowsPerImage:1},
        [1,1,1]
      );
      device.queue.submit([cmd.finish()]);

      if (currentPickingId !== pickingId) return;
      await readbackBuffer.mapAsync(GPUMapMode.READ);
      if (currentPickingId !== pickingId) {
        readbackBuffer.unmap();
        return;
      }
      const arr = new Uint8Array(readbackBuffer.getMappedRange());
      const r=arr[0], g=arr[1], b=arr[2];
      readbackBuffer.unmap();
      const pickedID = (b<<16)|(g<<8)|r;

      if(mode==='hover'){
        handleHoverID(pickedID);
      } else {
        handleClickID(pickedID);
      }
    } finally {
      pickingLockRef.current = false;
    }
  }

  function handleHoverID(pickedID: number) {
    if (!gpuRef.current) return;
    const { idToComponent } = gpuRef.current;

    // Get new hover state
    const newHoverState = idToComponent[pickedID] || null;

    // If hover state hasn't changed, do nothing
    if ((!lastHoverState.current && !newHoverState) ||
        (lastHoverState.current && newHoverState &&
         lastHoverState.current.componentIdx === newHoverState.componentIdx &&
         lastHoverState.current.instanceIdx === newHoverState.instanceIdx)) {
      return;
    }

    // Clear previous hover if it exists
    if (lastHoverState.current) {
      const prevComponent = components[lastHoverState.current.componentIdx];
      prevComponent?.onHover?.(null);
    }

    // Set new hover if it exists
    if (newHoverState) {
      const { componentIdx, instanceIdx } = newHoverState;
      if (componentIdx >= 0 && componentIdx < components.length) {
        components[componentIdx].onHover?.(instanceIdx);
      }
    }

    // Update last hover state
    lastHoverState.current = newHoverState;
  }

  function handleClickID(pickedID:number){
    if(!gpuRef.current) return;
    const {idToComponent} = gpuRef.current;
    const rec = idToComponent[pickedID];
    if(!rec) return;
    const {componentIdx, instanceIdx} = rec;
    if(componentIdx<0||componentIdx>=components.length) return;
    components[componentIdx].onClick?.(instanceIdx);
  }

  /******************************************************
   * F) Mouse Handling
   ******************************************************/
  interface MouseState {
    type: 'idle'|'dragging';
    button?: number;
    startX?: number;
    startY?: number;
    lastX?: number;
    lastY?: number;
    isShiftDown?: boolean;
    dragDistance?: number;
  }
  const mouseState=useRef<MouseState>({type:'idle'});

  // Add throttling for hover picking
  const throttledPickAtScreenXY = useCallback(
    throttle((x: number, y: number, mode: 'hover'|'click') => {
      pickAtScreenXY(x, y, mode);
    }, 32), // ~30fps
    [pickAtScreenXY]
  );

  // Rename to be more specific to scene3d
  const handleScene3dMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if(!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const st = mouseState.current;
    if(st.type === 'dragging' && st.lastX !== undefined && st.lastY !== undefined) {
        const dx = e.clientX - st.lastX;
        const dy = e.clientY - st.lastY;
        st.dragDistance = (st.dragDistance||0) + Math.sqrt(dx*dx + dy*dy);

        if(st.button === 2 || st.isShiftDown) {
            handleCameraUpdate(cam => pan(cam, dx, dy));
        } else if(st.button === 0) {
            handleCameraUpdate(cam => orbit(cam, dx, dy));
        }

        st.lastX = e.clientX;
        st.lastY = e.clientY;
    } else if(st.type === 'idle') {
        throttledPickAtScreenXY(x, y, 'hover');
    }
}, [handleCameraUpdate, throttledPickAtScreenXY]);

  const handleScene3dMouseDown = useCallback((e: MouseEvent) => {
    mouseState.current = {
      type: 'dragging',
      button: e.button,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      isShiftDown: e.shiftKey,
      dragDistance: 0
    };
    e.preventDefault();
  }, []);

  const handleScene3dMouseUp = useCallback((e: MouseEvent) => {
    const st = mouseState.current;
    if(st.type === 'dragging' && st.startX !== undefined && st.startY !== undefined) {
      if(!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if((st.dragDistance || 0) < 4) {
        pickAtScreenXY(x, y, 'click');
      }
    }
    mouseState.current = {type: 'idle'};
  }, [pickAtScreenXY]);

  const handleScene3dMouseLeave = useCallback(() => {
    mouseState.current = {type: 'idle'};
  }, []);

  // Update event listener references
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousemove', handleScene3dMouseMove);
    canvas.addEventListener('mousedown', handleScene3dMouseDown);
    canvas.addEventListener('mouseup', handleScene3dMouseUp);
    canvas.addEventListener('mouseleave', handleScene3dMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleScene3dMouseMove);
      canvas.removeEventListener('mousedown', handleScene3dMouseDown);
      canvas.removeEventListener('mouseup', handleScene3dMouseUp);
      canvas.removeEventListener('mouseleave', handleScene3dMouseLeave);
    };
  }, [handleScene3dMouseMove, handleScene3dMouseDown, handleScene3dMouseUp, handleScene3dMouseLeave]);

  /******************************************************
   * G) Lifecycle & Render-on-demand
   ******************************************************/
  // Init once
  useEffect(()=>{
    initWebGPU();
    return () => {
      if (gpuRef.current) {
        const { device, resources, pipelineCache } = gpuRef.current;

        device.queue.onSubmittedWorkDone().then(() => {
          // Cleanup instance resources
          resources.sphereGeo?.vb.destroy();
          resources.sphereGeo?.ib.destroy();
          // ... cleanup other geometries ...

          // Clear instance pipeline cache
          pipelineCache.clear();
        });
      }
    };
  },[initWebGPU]);

  // Create/recreate depth + pick textures
  useEffect(()=>{
    if(isReady){
      createOrUpdateDepthTexture();
      createOrUpdatePickTextures();
    }
  },[isReady, containerWidth, containerHeight, createOrUpdateDepthTexture, createOrUpdatePickTextures]);

  // Update the render-triggering effects
  useEffect(() => {
    if (isReady) {
      renderFrame(activeCamera);  // Always render with current camera (controlled or internal)
    }
  }, [isReady, activeCamera, renderFrame]); // Watch the camera value

  // Update canvas size effect
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.floor(containerWidth * dpr);
    const displayHeight = Math.floor(containerHeight * dpr);

    // Only update if size actually changed
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;

        // Update textures after canvas size change
        createOrUpdateDepthTexture();
        createOrUpdatePickTextures();
        renderFrame(activeCamera);
    }
}, [containerWidth, containerHeight, createOrUpdateDepthTexture, createOrUpdatePickTextures, renderFrame, activeCamera]);

  // Update components effect
  useEffect(() => {
    if (isReady && gpuRef.current) {
      const ros = buildRenderObjects(components);
      gpuRef.current.renderObjects = ros;
      renderFrame(activeCamera);
    }
  }, [isReady, components]); // Remove activeCamera dependency

  // Add separate effect just for camera updates
  useEffect(() => {
    if (isReady && gpuRef.current) {
      renderFrame(activeCamera);
    }
  }, [isReady, activeCamera, renderFrame]);

  // Wheel handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
        if (mouseState.current.type === 'idle') {
            e.preventDefault();
            handleCameraUpdate(cam => zoom(cam, e.deltaY));
        }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleCameraUpdate]);

  // Move ensurePickingData inside component
  const ensurePickingData = useCallback((renderObject: RenderObject, component: ComponentConfig) => {
    if (!renderObject.pickingDataStale) return;
    if (!gpuRef.current) return;

    const { device, bindGroupLayout, pipelineCache, resources } = gpuRef.current;

    // Calculate sizes before creating buffers
    const { renderSize, pickingSize } = calculateBufferSize(components);

    // Ensure dynamic buffers exist
    if (!gpuRef.current.dynamicBuffers) {
      gpuRef.current.dynamicBuffers = createDynamicBuffers(device, renderSize, pickingSize);
    }
    const dynamicBuffers = gpuRef.current.dynamicBuffers!;

    const spec = primitiveRegistry[component.type];
    if (!spec) return;

    // Build picking data
    const pickData = spec.buildPickingData(component, gpuRef.current.componentBaseId[renderObject.componentIndex]);
    if (pickData && pickData.length > 0) {
    const pickingOffset = Math.ceil(dynamicBuffers.pickingOffset / 4) * 4;
      // Calculate stride based on float count (4 bytes per float)
      const floatsPerInstance = pickData.length / renderObject.instanceCount!;
      const stride = Math.ceil(floatsPerInstance) * 4; // Align to 4 bytes

    device.queue.writeBuffer(
      dynamicBuffers.pickingBuffer,
      pickingOffset,
        pickData.buffer,
        pickData.byteOffset,
        pickData.byteLength
    );

      // Set picking buffers with offset info
      const geometryVB = renderObject.vertexBuffers[0];
    renderObject.pickingVertexBuffers = [
        geometryVB,
      {
        buffer: dynamicBuffers.pickingBuffer,
        offset: pickingOffset,
          stride: stride
      }
    ];

      dynamicBuffers.pickingOffset = pickingOffset + (stride * renderObject.instanceCount!);
    }

    // Get picking pipeline
    renderObject.pickingPipeline = spec.getPickingPipeline(device, bindGroupLayout, pipelineCache);

    // Copy over index buffer and counts from render object
    renderObject.pickingIndexBuffer = renderObject.indexBuffer;
    renderObject.pickingIndexCount = renderObject.indexCount;
    renderObject.pickingInstanceCount = renderObject.instanceCount;

    renderObject.pickingDataStale = false;
  }, [components, buildComponentIdMapping]);

  return (
    <div style={{ width: '100%', border: '1px solid #ccc' }}>
        <canvas
            ref={canvasRef}
            style={style}
        />
    </div>
  );
}

/******************************************************
 * 9) WGSL Shader Code
 ******************************************************/

// Common shader code templates
const cameraStruct = /*wgsl*/`
struct Camera {
  mvp: mat4x4<f32>,
  cameraRight: vec3<f32>,
  _pad1: f32,
  cameraUp: vec3<f32>,
  _pad2: f32,
  lightDir: vec3<f32>,
  _pad3: f32,
  cameraPos: vec3<f32>,
  _pad4: f32,
};
@group(0) @binding(0) var<uniform> camera : Camera;`;

const lightingConstants = /*wgsl*/`
const AMBIENT_INTENSITY = ${LIGHTING.AMBIENT_INTENSITY}f;
const DIFFUSE_INTENSITY = ${LIGHTING.DIFFUSE_INTENSITY}f;
const SPECULAR_INTENSITY = ${LIGHTING.SPECULAR_INTENSITY}f;
const SPECULAR_POWER = ${LIGHTING.SPECULAR_POWER}f;`;

const billboardVertCode = /*wgsl*/`
${cameraStruct}

struct VSOut {
  @builtin(position) Position: vec4<f32>,
  @location(0) color: vec3<f32>,
  @location(1) alpha: f32
};

@vertex
fn vs_main(
  @location(0) localPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) instancePos: vec3<f32>,
  @location(3) col: vec3<f32>,
  @location(4) alpha: f32,
  @location(5) size: f32
)-> VSOut {
  // Create camera-facing orientation
  let right = camera.cameraRight;
  let up = camera.cameraUp;

  // Transform quad vertices to world space
  let scaledRight = right * (localPos.x * size);
  let scaledUp = up * (localPos.y * size);
  let worldPos = instancePos + scaledRight + scaledUp;

  var out: VSOut;
  out.Position = camera.mvp * vec4<f32>(worldPos, 1.0);
  out.color = col;
  out.alpha = alpha;
  return out;
}`;

const billboardFragCode = /*wgsl*/`
@fragment
fn fs_main(@location(0) color: vec3<f32>, @location(1) alpha: f32)-> @location(0) vec4<f32> {
  return vec4<f32>(color, alpha);
}`;

const ellipsoidVertCode = /*wgsl*/`
${cameraStruct}

struct VSOut {
  @builtin(position) pos: vec4<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) baseColor: vec3<f32>,
  @location(3) alpha: f32,
  @location(4) worldPos: vec3<f32>,
  @location(5) instancePos: vec3<f32>
};

@vertex
fn vs_main(
  @location(0) inPos: vec3<f32>,
  @location(1) inNorm: vec3<f32>,
  @location(2) iPos: vec3<f32>,
  @location(3) iScale: vec3<f32>,
  @location(4) iColor: vec3<f32>,
  @location(5) iAlpha: f32
)-> VSOut {
  let worldPos = iPos + (inPos * iScale);
  let scaledNorm = normalize(inNorm / iScale);

  var out: VSOut;
  out.pos = camera.mvp * vec4<f32>(worldPos,1.0);
  out.normal = scaledNorm;
  out.baseColor = iColor;
  out.alpha = iAlpha;
  out.worldPos = worldPos;
  out.instancePos = iPos;
  return out;
}`;

const ellipsoidFragCode = /*wgsl*/`
${cameraStruct}
${lightingConstants}

@fragment
fn fs_main(
  @location(1) normal: vec3<f32>,
  @location(2) baseColor: vec3<f32>,
  @location(3) alpha: f32,
  @location(4) worldPos: vec3<f32>,
  @location(5) instancePos: vec3<f32>
)-> @location(0) vec4<f32> {
  let N = normalize(normal);
  let L = normalize(camera.lightDir);
  let V = normalize(camera.cameraPos - worldPos);

  let lambert = max(dot(N, L), 0.0);
  let ambient = AMBIENT_INTENSITY;
  var color = baseColor * (ambient + lambert * DIFFUSE_INTENSITY);

  let H = normalize(L + V);
  let spec = pow(max(dot(N, H), 0.0), SPECULAR_POWER);
  color += vec3<f32>(1.0) * spec * SPECULAR_INTENSITY;

  return vec4<f32>(color, alpha);
}`;

const ringVertCode = /*wgsl*/`
${cameraStruct}

struct VSOut {
  @builtin(position) pos: vec4<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) color: vec3<f32>,
  @location(3) alpha: f32,
  @location(4) worldPos: vec3<f32>,
};

@vertex
fn vs_main(
  @builtin(instance_index) instID: u32,
  @location(0) inPos: vec3<f32>,
  @location(1) inNorm: vec3<f32>,
  @location(2) center: vec3<f32>,
  @location(3) scale: vec3<f32>,
  @location(4) color: vec3<f32>,
  @location(5) alpha: f32
)-> VSOut {
  let ringIndex = i32(instID % 3u);
  var lp = inPos;
  // rotate the ring geometry differently for x-y-z rings
  if(ringIndex==0){
    let tmp = lp.z;
    lp.z = -lp.y;
    lp.y = tmp;
  } else if(ringIndex==1){
    let px = lp.x;
    lp.x = -lp.y;
    lp.y = px;
    let pz = lp.z;
    lp.z = lp.x;
    lp.x = pz;
  }
  lp *= scale;
  let wp = center + lp;
  var out: VSOut;
  out.pos = camera.mvp * vec4<f32>(wp,1.0);
  out.normal = inNorm;
  out.color = color;
  out.alpha = alpha;
  out.worldPos = wp;
  return out;
}`;

const ringFragCode = /*wgsl*/`
@fragment
fn fs_main(
  @location(1) n: vec3<f32>,
  @location(2) c: vec3<f32>,
  @location(3) a: f32,
  @location(4) wp: vec3<f32>
)-> @location(0) vec4<f32> {
  // simple color (no shading)
  return vec4<f32>(c, a);
}`;

const cuboidVertCode = /*wgsl*/`
${cameraStruct}

struct VSOut {
  @builtin(position) pos: vec4<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) baseColor: vec3<f32>,
  @location(3) alpha: f32,
  @location(4) worldPos: vec3<f32>
};

@vertex
fn vs_main(
  @location(0) inPos: vec3<f32>,
  @location(1) inNorm: vec3<f32>,
  @location(2) center: vec3<f32>,
  @location(3) size: vec3<f32>,
  @location(4) color: vec3<f32>,
  @location(5) alpha: f32
)-> VSOut {
  let worldPos = center + (inPos * size);
  let scaledNorm = normalize(inNorm / size);
  var out: VSOut;
  out.pos = camera.mvp * vec4<f32>(worldPos,1.0);
  out.normal = scaledNorm;
  out.baseColor = color;
  out.alpha = alpha;
  out.worldPos = worldPos;
  return out;
}`;

const cuboidFragCode = /*wgsl*/`
${cameraStruct}
${lightingConstants}

@fragment
fn fs_main(
  @location(1) normal: vec3<f32>,
  @location(2) baseColor: vec3<f32>,
  @location(3) alpha: f32,
  @location(4) worldPos: vec3<f32>
)-> @location(0) vec4<f32> {
  let N = normalize(normal);
  let L = normalize(camera.lightDir);
  let V = normalize(-worldPos);
  let lambert = max(dot(N,L), 0.0);
  let ambient = AMBIENT_INTENSITY;
  var color = baseColor * (ambient + lambert * DIFFUSE_INTENSITY);

  let H = normalize(L + V);
  let spec = pow(max(dot(N,H),0.0), SPECULAR_POWER);
  color += vec3<f32>(1.0) * spec * SPECULAR_INTENSITY;

  return vec4<f32>(color, alpha);
}`;

const pickingVertCode = /*wgsl*/`
${cameraStruct}

struct VSOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) pickID: f32
};

@vertex
fn vs_pointcloud(
  @location(0) localPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) instancePos: vec3<f32>,
  @location(3) pickID: f32,
  @location(4) size: f32
)-> VSOut {
  // Create camera-facing orientation
  let right = camera.cameraRight;
  let up = camera.cameraUp;

  // Transform quad vertices to world space
  let scaledRight = right * (localPos.x * size);
  let scaledUp = up * (localPos.y * size);
  let worldPos = instancePos + scaledRight + scaledUp;

  var out: VSOut;
  out.pos = camera.mvp * vec4<f32>(worldPos, 1.0);
  out.pickID = pickID;
  return out;
}

@vertex
fn vs_ellipsoid(
  @location(0) inPos: vec3<f32>,
  @location(1) inNorm: vec3<f32>,
  @location(2) iPos: vec3<f32>,
  @location(3) iScale: vec3<f32>,
  @location(4) pickID: f32
)-> VSOut {
  let wp = iPos + (inPos * iScale);
  var out: VSOut;
  out.pos = camera.mvp*vec4<f32>(wp,1.0);
  out.pickID = pickID;
  return out;
}

@vertex
fn vs_bands(
  @builtin(instance_index) instID:u32,
  @location(0) inPos: vec3<f32>,
  @location(1) inNorm: vec3<f32>,
  @location(2) center: vec3<f32>,
  @location(3) scale: vec3<f32>,
  @location(4) pickID: f32
)-> VSOut {
  let ringIndex=i32(instID%3u);
  var lp=inPos;
  if(ringIndex==0){
    let tmp=lp.z; lp.z=-lp.y; lp.y=tmp;
  } else if(ringIndex==1){
    let px=lp.x; lp.x=-lp.y; lp.y=px;
    let pz=lp.z; lp.z=lp.x; lp.x=pz;
  }
  lp*=scale;
  let wp=center+lp;
  var out:VSOut;
  out.pos=camera.mvp*vec4<f32>(wp,1.0);
  out.pickID=pickID;
  return out;
}

@vertex
fn vs_cuboid(
  @location(0) inPos: vec3<f32>,
  @location(1) inNorm: vec3<f32>,
  @location(2) center: vec3<f32>,
  @location(3) size: vec3<f32>,
  @location(4) pickID: f32
)-> VSOut {
  let wp = center + (inPos * size);
  var out: VSOut;
  out.pos = camera.mvp*vec4<f32>(wp,1.0);
  out.pickID = pickID;
  return out;
}

@fragment
fn fs_pick(@location(0) pickID: f32)-> @location(0) vec4<f32> {
  let iID = u32(pickID);
  let r = f32(iID & 255u)/255.0;
  let g = f32((iID>>8)&255u)/255.0;
  let b = f32((iID>>16)&255u)/255.0;
  return vec4<f32>(r,g,b,1.0);
}`;
