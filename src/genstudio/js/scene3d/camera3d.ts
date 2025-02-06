import * as glMatrix from 'gl-matrix';
import type { TypedArray } from '../binary';

export interface CameraParams {
    position: [number, number, number] | TypedArray;
    target: [number, number, number] | TypedArray;
    up: [number, number, number] | TypedArray;
    fov: number;
    near: number;
    far: number;
}

export interface CameraState {
    position: glMatrix.vec3;
    target: glMatrix.vec3;
    up: glMatrix.vec3;
    radius: number;
    phi: number;
    theta: number;
    fov: number;
    near: number;
    far: number;
}

export const DEFAULT_CAMERA: CameraParams = {
    position: [2, 2, 2],  // Simple diagonal view
    target: [0, 0, 0],
    up: [0, 1, 0],
    fov: 45,  // Slightly narrower FOV for better perspective
    near: 0.01,
    far: 100.0
};

export function createCameraState(params: CameraParams | null | undefined): CameraState {

    const p = {
        position: params?.position ?? DEFAULT_CAMERA.position,
        target: params?.target ?? DEFAULT_CAMERA.target,
        up: params?.up ?? DEFAULT_CAMERA.up,
        fov: params?.fov ?? DEFAULT_CAMERA.fov,
        near: params?.near ?? DEFAULT_CAMERA.near,
        far: params?.far ?? DEFAULT_CAMERA.far
    };

    const position = glMatrix.vec3.fromValues(p.position[0], p.position[1], p.position[2]);
    const target = glMatrix.vec3.fromValues(p.target[0], p.target[1], p.target[2]);
    const up = glMatrix.vec3.fromValues(p.up[0], p.up[1], p.up[2]);
    glMatrix.vec3.normalize(up, up);

    // The direction from target to position
    const dir = glMatrix.vec3.sub(glMatrix.vec3.create(), position, target);
    const radius = glMatrix.vec3.length(dir);

    if (radius > 1e-8) {
        glMatrix.vec3.scale(dir, dir, 1.0 / radius);
    }

    // We'll define phi as the angle from 'up' to 'dir'
    // phi = 0 means camera is aligned with up
    // phi = pi means camera is aligned opposite up
    const upDot = glMatrix.vec3.dot(up, dir);
    const phi = Math.acos(clamp(upDot, -1.0, 1.0));

    // We also need a reference axis to measure theta around 'up'
    const { refForward, refRight } = getReferenceFrame(up);
    // Project dir onto this local reference plane
    const x = glMatrix.vec3.dot(dir, refRight);
    const z = glMatrix.vec3.dot(dir, refForward);

    // theta = atan2(x, z) – rotating around the 'up' axis
    const theta = Math.atan2(x, z);

    return {
        position,
        target,
        up,
        radius,
        phi,
        theta,
        fov: p.fov,
        near: p.near,
        far: p.far
    };
}

export function createCameraParams(state: CameraState): CameraParams {
    return {
        position: Array.from(state.position) as [number, number, number],
        target: Array.from(state.target) as [number, number, number],
        up: Array.from(state.up) as [number, number, number],
        fov: state.fov,
        near: state.near,
        far: state.far
    };
}

/**
 * Orbit the camera around the target, using the camera's 'up' as the vertical axis.
 *
 * deltaX => horizontal orbit around 'up'
 * deltaY => vertical orbit around camera's local "right"
 */
export function orbit(camera: CameraState, deltaX: number, deltaY: number): CameraState {
    let { phi, theta, radius, up, target } = camera;

    // Adjust angles
    // (the 0.01 factor is just an orbit speed scalar that can be tweaked)
    theta -= deltaX * 0.01;
    phi   -= deltaY * 0.01;

    // Clamp phi to avoid gimbal lock at poles
    phi = Math.max(0.001, Math.min(Math.PI - 0.001, phi));

    // Build local reference frame from up
    const { refForward, refRight } = getReferenceFrame(up);

    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    // Recompute position in spherical coords around 'up'
    // position = target + radius * (cos(phi)*up + sin(phi)*cos(theta)*refForward + sin(phi)*sin(theta)*refRight)
    const newPosition = glMatrix.vec3.create();
    glMatrix.vec3.scaleAndAdd(newPosition, newPosition, up, cosPhi * radius);
    glMatrix.vec3.scaleAndAdd(newPosition, newPosition, refForward, sinPhi * cosTheta * radius);
    glMatrix.vec3.scaleAndAdd(newPosition, newPosition, refRight, sinPhi * sinTheta * radius);
    glMatrix.vec3.add(newPosition, target, newPosition);

    return {
        ...camera,
        position: newPosition,
        phi,
        theta
    };
}

/**
 * Pan the camera in the plane perpendicular to the view direction,
 * using the camera's 'up' as the orientation reference for 'right'.
 */
export function pan(camera: CameraState, deltaX: number, deltaY: number): CameraState {
    // forward = (target - position)
    const forward = glMatrix.vec3.sub(glMatrix.vec3.create(), camera.target, camera.position);
    // right = forward x up
    const right = glMatrix.vec3.cross(glMatrix.vec3.create(), forward, camera.up);
    glMatrix.vec3.normalize(right, right);

    // actualUp = right x forward
    const actualUp = glMatrix.vec3.cross(glMatrix.vec3.create(), right, forward);
    glMatrix.vec3.normalize(actualUp, actualUp);

    // Scale movement by distance from target
    const scale = camera.radius * 0.002;
    const movement = glMatrix.vec3.create();

    // Move along the local right/actualUp vectors
    glMatrix.vec3.scaleAndAdd(movement, movement, right, -deltaX * scale);
    glMatrix.vec3.scaleAndAdd(movement, movement, actualUp, deltaY * scale);

    // Update position and target
    const newPosition = glMatrix.vec3.add(glMatrix.vec3.create(), camera.position, movement);
    const newTarget = glMatrix.vec3.add(glMatrix.vec3.create(), camera.target, movement);

    return {
        ...camera,
        position: newPosition,
        target: newTarget
    };
}

/**
 * Zoom the camera in/out by scaling the camera's radius from the target,
 * moving the camera along the current view direction.
 */
export function zoom(camera: CameraState, deltaY: number): CameraState {
    // Exponential zoom factor
    const newRadius = Math.max(0.1, camera.radius * Math.exp(deltaY * 0.001));

    // Move the camera position accordingly
    const direction = glMatrix.vec3.sub(glMatrix.vec3.create(), camera.position, camera.target);
    glMatrix.vec3.normalize(direction, direction);

    const newPosition = glMatrix.vec3.scaleAndAdd(
        glMatrix.vec3.create(),
        camera.target,
        direction,
        newRadius
    );

    return {
        ...camera,
        position: newPosition,
        radius: newRadius
    };
}

export function getViewMatrix(camera: CameraState): Float32Array {
    return glMatrix.mat4.lookAt(
        glMatrix.mat4.create(),
        camera.position,
        camera.target,
        camera.up
    ) as Float32Array;
}

// Convert degrees to radians
function degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

// Create a perspective projection matrix, converting FOV from degrees
export function getProjectionMatrix(camera: CameraState, aspect: number): Float32Array {
    return glMatrix.mat4.perspective(
        glMatrix.mat4.create(),
        degreesToRadians(camera.fov), // Convert FOV to radians
        aspect,
        camera.near,
        camera.far
    ) as Float32Array;
}

/**
 * Build a local reference frame around the 'up' vector so we can
 * measure angles (phi/theta) consistently in an "any up" scenario.
 */
function getReferenceFrame(up: glMatrix.vec3): {
    refForward: glMatrix.vec3;
    refRight: glMatrix.vec3;
} {
    // Try worldForward = (0, 0, 1). If that's collinear with 'up', fallback to (1, 0, 0)
    const EPS = 1e-8;
    const worldForward = glMatrix.vec3.fromValues(0, 0, 1);
    let crossVal = glMatrix.vec3.cross(glMatrix.vec3.create(), up, worldForward);

    if (glMatrix.vec3.length(crossVal) < EPS) {
        // up is nearly parallel with (0,0,1)
        crossVal = glMatrix.vec3.cross(glMatrix.vec3.create(), up, glMatrix.vec3.fromValues(1, 0, 0));
    }
    glMatrix.vec3.normalize(crossVal, crossVal);
    const refRight = crossVal; // X-axis
    const refForward = glMatrix.vec3.cross(glMatrix.vec3.create(), refRight, up); // Z-axis
    glMatrix.vec3.normalize(refForward, refForward);

    return { refForward, refRight };
}

/** Clamps a value x to the [minVal, maxVal] range. */
function clamp(x: number, minVal: number, maxVal: number): number {
    return Math.max(minVal, Math.min(x, maxVal));
}
