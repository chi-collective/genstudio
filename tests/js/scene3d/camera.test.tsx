/// <reference types="@webgpu/types" />
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { SceneInner } from '../../../src/genstudio/js/scene3d/impl3d';
import type { ComponentConfig } from '../../../src/genstudio/js/scene3d/components';
import type { CameraParams } from '../../../src/genstudio/js/scene3d/camera3d';
import { setupWebGPU, cleanupWebGPU } from '../webgpu-setup';

describe('Scene3D Camera Controls', () => {
  let container: HTMLDivElement;
  let mockDevice: GPUDevice;
  let mockQueue: GPUQueue;
  let mockContext: GPUCanvasContext;

  beforeEach(() => {
    // Set up fake timers first
    vi.useFakeTimers();

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
    vi.useRealTimers();
    cleanupWebGPU();
  });

  describe('Camera Controls', () => {
    it('should handle controlled camera state', async () => {
      const onCameraChange = vi.fn();
      const controlledCamera: CameraParams = {
        position: new Float32Array([0, 0, 5]),
        target: new Float32Array([0, 0, 0]),
        up: new Float32Array([0, 1, 0]),
        fov: 45,
        near: 0.1,
        far: 1000
      };

      let result;
      await act(async () => {
        result = render(
          <SceneInner
            components={[]}
            containerWidth={800}
            containerHeight={600}
            camera={controlledCamera}
            onCameraChange={onCameraChange}
          />
        );
      });

      const canvas = result!.container.querySelector('canvas');

      // Simulate orbit
      await act(async () => {
        fireEvent.mouseDown(canvas!, { clientX: 0, clientY: 0, button: 0 });
        fireEvent.mouseMove(canvas!, { clientX: 100, clientY: 0 });
        fireEvent.mouseUp(canvas!);
      });

      expect(onCameraChange).toHaveBeenCalled();
      const newCamera = onCameraChange.mock.calls[0][0];
      expect(newCamera.position).not.toEqual(controlledCamera.position);
    });

    it('should handle zoom', async () => {
      const onCameraChange = vi.fn();

      let result;
      await act(async () => {
        result = render(
          <SceneInner
            components={[]}
            containerWidth={800}
            containerHeight={600}
            onCameraChange={onCameraChange}
          />
        );
      });

      const canvas = result!.container.querySelector('canvas');

      // Simulate zoom
      await act(async () => {
        fireEvent.wheel(canvas!, { deltaY: 100 });
      });

      expect(onCameraChange).toHaveBeenCalled();
      const newCamera = onCameraChange.mock.calls[0][0];
      expect(newCamera.position[2]).toBeDefined();
    });

    it('should handle pan', async () => {
      const onCameraChange = vi.fn();
      const initialCamera: CameraParams = {
        position: new Float32Array([0, 0, 5]),
        target: new Float32Array([0, 0, 0]),
        up: new Float32Array([0, 1, 0]),
        fov: 45,
        near: 0.1,
        far: 1000
      };

      let result;
      await act(async () => {
        result = render(
          <SceneInner
            components={[]}
            containerWidth={800}
            containerHeight={600}
            camera={initialCamera}
            onCameraChange={onCameraChange}
          />
        );
      });

      const canvas = result!.container.querySelector('canvas');

      // Wait for initial setup
      await vi.runAllTimersAsync();

      // Simulate pan with middle mouse button (button=1) or shift+left click
      await act(async () => {
        fireEvent.mouseDown(canvas!, { clientX: 0, clientY: 0, button: 0, shiftKey: true });
        await vi.runAllTimersAsync();
        fireEvent.mouseMove(canvas!, { clientX: 100, clientY: 100, buttons: 1 });
        await vi.runAllTimersAsync();
        fireEvent.mouseUp(canvas!);
        await vi.runAllTimersAsync();
      });

      expect(onCameraChange).toHaveBeenCalled();
      const newCamera = onCameraChange.mock.calls[0][0];
      expect(Array.from(newCamera.target)).not.toEqual(Array.from(initialCamera.target));
    });

  });
});
