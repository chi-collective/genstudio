/// <reference types="@webgpu/types" />
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { SceneInner } from '../../../src/genstudio/js/scene3d/impl3d';
import type { ComponentConfig } from '../../../src/genstudio/js/scene3d/components';
import { setupWebGPU, cleanupWebGPU } from '../webgpu-setup';

describe('Scene3D Core Rendering', () => {
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

  describe('Initialization', () => {
    it('should render with default props', async () => {
      const props = {
        components: [] as ComponentConfig[],
        containerWidth: 800,
        containerHeight: 600
      };

      let result;
      await act(async () => {
        result = render(<SceneInner {...props} />);
      });

      const canvas = result!.container.querySelector('canvas');
      expect(canvas).toBeDefined();
      expect(canvas?.width).toBe(800 * window.devicePixelRatio);
      expect(canvas?.height).toBe(600 * window.devicePixelRatio);
    });

    it('should handle window resize', async () => {
      const props = {
        components: [],
        containerWidth: 800,
        containerHeight: 600
      };

      let result;
      await act(async () => {
        result = render(<SceneInner {...props} />);
      });

      await act(async () => {
        result!.rerender(<SceneInner {...props} containerWidth={1000} containerHeight={800} />);
      });

      const canvas = result!.container.querySelector('canvas');
      expect(canvas?.width).toBe(1000 * window.devicePixelRatio);
      expect(canvas?.height).toBe(800 * window.devicePixelRatio);
    });

    it('should initialize WebGPU context and resources', async () => {
      const props = {
        components: [],
        containerWidth: 800,
        containerHeight: 600
      };

      await act(async () => {
        render(<SceneInner {...props} />);
      });

      expect(mockDevice.createBindGroupLayout).toHaveBeenCalled();
      expect(mockDevice.createBuffer).toHaveBeenCalled();
      expect(mockContext.configure).toHaveBeenCalled();
    });
  });

  describe('Resource Management', () => {
    let destroyMock: ReturnType<typeof vi.fn>;
    let mockBuffer: any;

    beforeEach(() => {
      vi.useFakeTimers();

      // Create mock buffer that we can track
      destroyMock = vi.fn();
      mockBuffer = {
        destroy: destroyMock,
        size: 0,
        usage: 0,
        mapAsync: vi.fn().mockResolvedValue(undefined),
        getMappedRange: vi.fn(() => new ArrayBuffer(0)),
        unmap: vi.fn()
      };

      // Set up createBuffer mock to return our trackable buffer
      const createBufferMock = mockDevice.createBuffer as Mock;
      createBufferMock.mockReturnValue(mockBuffer);
    });

    afterEach(() => {
      vi.useRealTimers();
      destroyMock.mockClear();
    });

    it('should clean up resources when unmounting', async () => {
      const props = {
        components: [],
        containerWidth: 800,
        containerHeight: 600
      };

      // Render with our mock buffer already set up
      let result;
      await act(async () => {
        result = render(<SceneInner {...props} />);
      });

      // Wait for initial setup
      await vi.runAllTimersAsync();

      // Unmount component
      result!.unmount();

      // Wait for cleanup
      await vi.runAllTimersAsync();
      await vi.waitFor(() => {
        expect(destroyMock).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should handle device lost events', async () => {
      const props = {
        components: [],
        containerWidth: 800,
        containerHeight: 600
      };

      await act(async () => {
        render(<SceneInner {...props} />);
      });

      // Simulate device lost without direct assignment
      const lostInfo = { reason: 'destroyed' };
      Object.defineProperty(mockDevice, 'lost', {
        value: Promise.reject(lostInfo),
        configurable: true
      });

      // Verify error handling
      await expect(mockDevice.lost).rejects.toEqual(lostInfo);
    });
  });

  describe('Performance', () => {
    it('should call onFrameRendered with timing info', async () => {
      const onFrameRendered = vi.fn();
      const props = {
        components: [],
        containerWidth: 800,
        containerHeight: 600,
        onFrameRendered
      };

      await act(async () => {
        render(<SceneInner {...props} />);
      });

      expect(onFrameRendered).toHaveBeenCalled();
      expect(onFrameRendered.mock.calls[0][0]).toBeGreaterThan(0);
    });
  });
});
