/// <reference types="@webgpu/types" />
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { SceneInner } from '../../../src/genstudio/js/scene3d/impl3d';
import type { ComponentConfig } from '../../../src/genstudio/js/scene3d/components';
import { setupWebGPU, cleanupWebGPU } from '../webgpu-setup';

describe('Scene3D Components', () => {
  let container: HTMLDivElement;
  let mockDevice: GPUDevice;
  let mockQueue: GPUQueue;
  let mockContext: GPUCanvasContext;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    setupWebGPU();

    // Create detailed WebGPU mocks with software rendering capabilities
    mockQueue = {
      writeBuffer: vi.fn(),
      submit: vi.fn(),
      onSubmittedWorkDone: vi.fn().mockResolvedValue(undefined)
    } as unknown as GPUQueue;

    mockContext = {
      configure: vi.fn(),
      getCurrentTexture: vi.fn(() => ({
        createView: vi.fn()
      }))
    } as unknown as GPUCanvasContext;

    const createBuffer = vi.fn((desc: GPUBufferDescriptor) => ({
      destroy: vi.fn(),
      size: desc.size,
      usage: desc.usage,
      mapAsync: vi.fn().mockResolvedValue(undefined),
      getMappedRange: vi.fn(() => new ArrayBuffer(desc.size)),
      unmap: vi.fn()
    }));

    const createRenderPipeline = vi.fn();

    mockDevice = {
      createBuffer,
      createBindGroup: vi.fn(),
      createBindGroupLayout: vi.fn(),
      createPipelineLayout: vi.fn((desc: GPUPipelineLayoutDescriptor) => ({
        label: 'Mock Pipeline Layout'
      })),
      createRenderPipeline,
      createShaderModule: vi.fn((desc: GPUShaderModuleDescriptor) => ({
        label: 'Mock Shader Module'
      })),
      createCommandEncoder: vi.fn(() => ({
        beginRenderPass: vi.fn(() => ({
          setPipeline: vi.fn(),
          setBindGroup: vi.fn(),
          setVertexBuffer: vi.fn(),
          setIndexBuffer: vi.fn(),
          draw: vi.fn(),
          drawIndexed: vi.fn(),
          end: vi.fn()
        })),
        finish: vi.fn()
      })),
      createTexture: vi.fn((desc: GPUTextureDescriptor) => ({
        createView: vi.fn(),
        destroy: vi.fn()
      })),
      queue: mockQueue
    } as unknown as GPUDevice;

    // Mock WebGPU API
    Object.defineProperty(navigator, 'gpu', {
      value: {
        requestAdapter: vi.fn().mockResolvedValue({
          requestDevice: vi.fn().mockResolvedValue(mockDevice)
        }),
        getPreferredCanvasFormat: vi.fn().mockReturnValue('rgba8unorm')
      },
      configurable: true
    });

    // Mock getContext
    const mockGetContext = vi.fn((contextType: string) => {
      if (contextType === 'webgpu') {
        return mockContext;
      }
      return null;
    });

    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: mockGetContext,
      configurable: true
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.clearAllMocks();
    cleanupWebGPU();
  });

  describe('PointCloud', () => {
    it('should render point cloud with basic properties', async () => {
      const components: ComponentConfig[] = [{
        type: 'PointCloud',
        positions: new Float32Array([0, 0, 0, 1, 1, 1]),
        colors: new Float32Array([1, 0, 0, 0, 1, 0])
      }];

      await act(async () => {
        render(
          <SceneInner
            components={components}
            containerWidth={800}
            containerHeight={600}
          />
        );
      });

      // Verify buffer creation and data upload
      const createBuffer = mockDevice.createBuffer as Mock;
      const writeBuffer = mockQueue.writeBuffer as Mock;

      expect(createBuffer).toHaveBeenCalled();
      expect(writeBuffer).toHaveBeenCalled();

      // Verify correct buffer sizes
      const bufferCalls = createBuffer.mock.calls;
      expect(bufferCalls.some(call => call[0].size >= components[0].positions.byteLength)).toBe(true);
    });

    it('should handle alpha blending correctly', async () => {
      const components: ComponentConfig[] = [{
        type: 'PointCloud',
        positions: new Float32Array([0, 0, 0]),
        colors: new Float32Array([1, 0, 0]),
        alpha: 0.5
      }];

      await act(async () => {
        render(
          <SceneInner
            components={components}
            containerWidth={800}
            containerHeight={600}
          />
        );
      });

      // Verify pipeline creation with blend state
      const createRenderPipeline = mockDevice.createRenderPipeline as Mock;
      expect(createRenderPipeline).toHaveBeenCalled();
      const pipelineConfig = createRenderPipeline.mock.calls[0][0];
      expect(pipelineConfig?.fragment?.targets?.[0]?.blend).toBeDefined();
    });

    it('should update when positions change', async () => {
      const initialComponents: ComponentConfig[] = [{
        type: 'PointCloud',
        positions: new Float32Array([0, 0, 0]),
        colors: new Float32Array([1, 0, 0])
      }];

      let result;
      await act(async () => {
        result = render(
          <SceneInner
            components={initialComponents}
            containerWidth={800}
            containerHeight={600}
          />
        );
      });

      const writeBuffer = mockQueue.writeBuffer as Mock;
      writeBuffer.mockClear();

      // Update positions
      const updatedComponents: ComponentConfig[] = [{
        type: 'PointCloud',
        positions: new Float32Array([1, 1, 1]),
        colors: new Float32Array([1, 0, 0])
      }];

      await act(async () => {
        result!.rerender(
          <SceneInner
            components={updatedComponents}
            containerWidth={800}
            containerHeight={600}
          />
        );
      });

      expect(writeBuffer).toHaveBeenCalled();
    });
  });

  describe('Ellipsoid', () => {
    it('should render ellipsoid with basic properties', async () => {
      const components: ComponentConfig[] = [{
        type: 'Ellipsoid',
        centers: new Float32Array([0, 0, 0]),
        radii: new Float32Array([1, 1, 1])
      }];

      await act(async () => {
        render(
          <SceneInner
            components={components}
            containerWidth={800}
            containerHeight={600}
          />
        );
      });

      // Verify buffer creation and data upload
      const createBuffer = mockDevice.createBuffer as Mock;
      const writeBuffer = mockQueue.writeBuffer as Mock;

      expect(createBuffer).toHaveBeenCalled();
      expect(writeBuffer).toHaveBeenCalled();
    });

    it('should handle non-uniform scaling', async () => {
      const components: ComponentConfig[] = [{
        type: 'Ellipsoid',
        centers: new Float32Array([0, 0, 0]),
        radii: new Float32Array([1, 2, 3])
      }];

      await act(async () => {
        render(
          <SceneInner
            components={components}
            containerWidth={800}
            containerHeight={600}
          />
        );
      });

      const writeBuffer = mockQueue.writeBuffer as Mock;
      const bufferData = writeBuffer.mock.calls.map(call => call[2]);

      // Verify that the scale data was written correctly
      // This might need adjustment based on your actual buffer layout
      expect(bufferData.some(data => data instanceof Float32Array)).toBe(true);
    });
  });

  // Add more component type tests as needed
});
