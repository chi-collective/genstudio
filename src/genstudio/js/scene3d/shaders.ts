/******************************************************
 * 2) Constants and Camera Functions
 ******************************************************/

/**
 * Global lighting configuration for the 3D scene.
 * Uses a simple Blinn-Phong lighting model with ambient, diffuse, and specular components.
 */
export const LIGHTING = {
    /** Ambient light intensity, affects overall scene brightness */
    AMBIENT_INTENSITY: 0.4,

    /** Diffuse light intensity, affects surface shading based on light direction */
    DIFFUSE_INTENSITY: 0.6,

    /** Specular highlight intensity */
    SPECULAR_INTENSITY: 0.2,

    /** Specular power/shininess, higher values create sharper highlights */
    SPECULAR_POWER: 20.0,

    /** Light direction components relative to camera */
    DIRECTION: {
        /** Right component of light direction */
        RIGHT: 0.2,
        /** Up component of light direction */
        UP: 0.5,
        /** Forward component of light direction */
        FORWARD: 0,
    }
} as const;

// Common shader code templates
export const cameraStruct = /*wgsl*/`
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

export const lightingConstants = /*wgsl*/`
const AMBIENT_INTENSITY = ${LIGHTING.AMBIENT_INTENSITY}f;
const DIFFUSE_INTENSITY = ${LIGHTING.DIFFUSE_INTENSITY}f;
const SPECULAR_INTENSITY = ${LIGHTING.SPECULAR_INTENSITY}f;
const SPECULAR_POWER = ${LIGHTING.SPECULAR_POWER}f;`;

export const lightingCalc = /*wgsl*/`
fn calculateLighting(baseColor: vec3<f32>, normal: vec3<f32>, worldPos: vec3<f32>) -> vec3<f32> {
  let N = normalize(normal);
  let L = normalize(camera.lightDir);
  let V = normalize(camera.cameraPos - worldPos);

  let lambert = max(dot(N, L), 0.0);
  let ambient = AMBIENT_INTENSITY;
  var color = baseColor * (ambient + lambert * DIFFUSE_INTENSITY);

  let H = normalize(L + V);
  let spec = pow(max(dot(N, H), 0.0), SPECULAR_POWER);
  color += vec3<f32>(1.0) * spec * SPECULAR_INTENSITY;

  return color;
}`;

// Standardize VSOut struct for regular rendering
const standardVSOut = /*wgsl*/`
struct VSOut {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec3<f32>,
  @location(1) alpha: f32,
  @location(2) worldPos: vec3<f32>,
  @location(3) normal: vec3<f32>
};`;

// Standardize VSOut struct for picking
const pickingVSOut = /*wgsl*/`
struct VSOut {
  @builtin(position) position: vec4<f32>,
  @location(0) pickID: f32
};`;

export const billboardVertCode = /*wgsl*/`
${cameraStruct}
${standardVSOut}

@vertex
fn vs_main(
  @location(0) localPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) position: vec3<f32>,
  @location(3) size: f32,
  @location(4) color: vec3<f32>,
  @location(5) alpha: f32
)-> VSOut {
  // Create camera-facing orientation
  let right = camera.cameraRight;
  let up = camera.cameraUp;

  // Transform quad vertices to world space
  let scaledRight = right * (localPos.x * size);
  let scaledUp = up * (localPos.y * size);
  let worldPos = position + scaledRight + scaledUp;

  var out: VSOut;
  out.position = camera.mvp * vec4<f32>(worldPos, 1.0);
  out.color = color;
  out.alpha = alpha;
  out.worldPos = worldPos;
  out.normal = normal;
  return out;
}`;

export const billboardPickingVertCode = /*wgsl*/`
${cameraStruct}
${pickingVSOut}

@vertex
fn vs_main(
  @location(0) localPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) position: vec3<f32>,
  @location(3) size: f32,
  @location(4) pickID: f32
)-> VSOut {
  // Create camera-facing orientation
  let right = camera.cameraRight;
  let up = camera.cameraUp;

  // Transform quad vertices to world space
  let scaledRight = right * (localPos.x * size);
  let scaledUp = up * (localPos.y * size);
  let worldPos = position + scaledRight + scaledUp;

  var out: VSOut;
  out.position = camera.mvp * vec4<f32>(worldPos, 1.0);
  out.pickID = pickID;
  return out;
}`;

export const billboardFragCode = /*wgsl*/`
@fragment
fn fs_main(
  @location(0) color: vec3<f32>,
  @location(1) alpha: f32,
  @location(2) worldPos: vec3<f32>,
  @location(3) normal: vec3<f32>
)-> @location(0) vec4<f32> {
  return vec4<f32>(color, alpha);
}`;

export const ellipsoidVertCode = /*wgsl*/`
${cameraStruct}
${standardVSOut}

@vertex
fn vs_main(
  @location(0) localPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) position: vec3<f32>,
  @location(3) size: vec3<f32>,
  @location(4) color: vec3<f32>,
  @location(5) alpha: f32
)-> VSOut {
  let worldPos = position + (localPos * size);
  let scaledNorm = normalize(normal / size);

  var out: VSOut;
  out.position = camera.mvp * vec4<f32>(worldPos, 1.0);
  out.color = color;
  out.alpha = alpha;
  out.worldPos = worldPos;
  out.normal = scaledNorm;
  return out;
}`;

export const ellipsoidPickingVertCode = /*wgsl*/`
${cameraStruct}
${pickingVSOut}

@vertex
fn vs_main(
  @location(0) localPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) position: vec3<f32>,
  @location(3) size: vec3<f32>,
  @location(4) pickID: f32
)-> VSOut {
  let worldPos = position + (localPos * size);
  var out: VSOut;
  out.position = camera.mvp * vec4<f32>(worldPos, 1.0);
  out.pickID = pickID;
  return out;
}`;

export const ellipsoidFragCode = /*wgsl*/`
${cameraStruct}
${lightingConstants}
${lightingCalc}

@fragment
fn fs_main(
  @location(0) color: vec3<f32>,
  @location(1) alpha: f32,
  @location(2) worldPos: vec3<f32>,
  @location(3) normal: vec3<f32>
)-> @location(0) vec4<f32> {
  let litColor = calculateLighting(color, normal, worldPos);
  return vec4<f32>(litColor, alpha);
}`;

export const ringVertCode = /*wgsl*/`
${cameraStruct}
${standardVSOut}

@vertex
fn vs_main(
  @builtin(instance_index) instID: u32,
  @location(0) localPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) position: vec3<f32>,
  @location(3) size: vec3<f32>,
  @location(4) color: vec3<f32>,
  @location(5) alpha: f32
)-> VSOut {
  let ringIndex = i32(instID % 3u);
  var lp = localPos;
  // rotate the ring geometry differently for x-y-z rings
  if(ringIndex == 0) {
    let tmp = lp.z;
    lp.z = -lp.y;
    lp.y = tmp;
  } else if(ringIndex == 1) {
    let px = lp.x;
    lp.x = -lp.y;
    lp.y = px;
    let pz = lp.z;
    lp.z = lp.x;
    lp.x = pz;
  }
  lp *= size;
  let worldPos = position + lp;

  var out: VSOut;
  out.position = camera.mvp * vec4<f32>(worldPos, 1.0);
  out.color = color;
  out.alpha = alpha;
  out.worldPos = worldPos;
  out.normal = normal;
  return out;
}`;

export const ringFragCode = /*wgsl*/`
@fragment
fn fs_main(
  @location(0) color: vec3<f32>,
  @location(1) alpha: f32,
  @location(2) worldPos: vec3<f32>,
  @location(3) normal: vec3<f32>
)-> @location(0) vec4<f32> {
  // simple color (no shading)
  return vec4<f32>(color, alpha);
}`;

export const cuboidVertCode = /*wgsl*/`
${cameraStruct}
${standardVSOut}

@vertex
fn vs_main(
  @location(0) localPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) position: vec3<f32>,
  @location(3) size: vec3<f32>,
  @location(4) color: vec3<f32>,
  @location(5) alpha: f32
)-> VSOut {
  let worldPos = position + (localPos * size);
  let scaledNorm = normalize(normal / size);

  var out: VSOut;
  out.position = camera.mvp * vec4<f32>(worldPos, 1.0);
  out.color = color;
  out.alpha = alpha;
  out.worldPos = worldPos;
  out.normal = scaledNorm;
  return out;
}`;

export const cuboidPickingVertCode = /*wgsl*/`
${cameraStruct}
${pickingVSOut}

@vertex
fn vs_main(
  @location(0) localPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) position: vec3<f32>,
  @location(3) size: vec3<f32>,
  @location(4) pickID: f32
)-> VSOut {
  let worldPos = position + (localPos * size);
  var out: VSOut;
  out.position = camera.mvp * vec4<f32>(worldPos, 1.0);
  out.pickID = pickID;
  return out;
}`;

export const cuboidFragCode = /*wgsl*/`
${cameraStruct}
${lightingConstants}
${lightingCalc}

@fragment
fn fs_main(
  @location(0) color: vec3<f32>,
  @location(1) alpha: f32,
  @location(2) worldPos: vec3<f32>,
  @location(3) normal: vec3<f32>
)-> @location(0) vec4<f32> {
  let litColor = calculateLighting(color, normal, worldPos);
  return vec4<f32>(litColor, alpha);
}`;

export const lineBeamVertCode = /*wgsl*/`
${cameraStruct}
${standardVSOut}

@vertex
fn vs_main(
  @location(0) localPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) startPos: vec3<f32>,
  @location(3) endPos: vec3<f32>,
  @location(4) size: f32,
  @location(5) color: vec3<f32>,
  @location(6) alpha: f32
)-> VSOut {
  let segDir = endPos - startPos;
  let length = max(length(segDir), 0.000001);
  let zDir = normalize(segDir);

  // Build basis vectors
  var tempUp = vec3<f32>(0,0,1);
  if (abs(dot(zDir, tempUp)) > 0.99) {
    tempUp = vec3<f32>(0,1,0);
  }
  let xDir = normalize(cross(zDir, tempUp));
  let yDir = cross(zDir, xDir);

  // Transform to world space
  let localX = localPos.x * size;
  let localY = localPos.y * size;
  let localZ = localPos.z * length;
  let worldPos = startPos
    + xDir * localX
    + yDir * localY
    + zDir * localZ;

  // Transform normal to world space
  let worldNorm = normalize(
    xDir * normal.x +
    yDir * normal.y +
    zDir * normal.z
  );

  var out: VSOut;
  out.position = camera.mvp * vec4<f32>(worldPos, 1.0);
  out.color = color;
  out.alpha = alpha;
  out.worldPos = worldPos;
  out.normal = worldNorm;
  return out;
}`;

export const lineBeamFragCode = /*wgsl*/`
${cameraStruct}
${lightingConstants}
${lightingCalc}

@fragment
fn fs_main(
  @location(0) color: vec3<f32>,
  @location(1) alpha: f32,
  @location(2) worldPos: vec3<f32>,
  @location(3) normal: vec3<f32>
)-> @location(0) vec4<f32> {
  let litColor = calculateLighting(color, normal, worldPos);
  return vec4<f32>(litColor, alpha);
}`;

export const lineBeamPickingVertCode = /*wgsl*/`
${cameraStruct}
${pickingVSOut}

@vertex
fn vs_main(
  @location(0) localPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) startPos: vec3<f32>,
  @location(3) endPos: vec3<f32>,
  @location(4) size: f32,
  @location(5) pickID: f32
)-> VSOut {
  let segDir = endPos - startPos;
  let length = max(length(segDir), 0.000001);
  let zDir = normalize(segDir);

  // Build basis vectors
  var tempUp = vec3<f32>(0,0,1);
  if (abs(dot(zDir, tempUp)) > 0.99) {
    tempUp = vec3<f32>(0,1,0);
  }
  let xDir = normalize(cross(zDir, tempUp));
  let yDir = cross(zDir, xDir);

  // Transform to world space
  let localX = localPos.x * size;
  let localY = localPos.y * size;
  let localZ = localPos.z * length;
  let worldPos = startPos
    + xDir * localX
    + yDir * localY
    + zDir * localZ;

  var out: VSOut;
  out.position = camera.mvp * vec4<f32>(worldPos, 1.0);
  out.pickID = pickID;
  return out;
}`;

export const pickingFragCode = /*wgsl*/`
@fragment
fn fs_pick(@location(0) pickID: f32)-> @location(0) vec4<f32> {
  let iID = u32(pickID);
  let r = f32(iID & 255u)/255.0;
  let g = f32((iID>>8)&255u)/255.0;
  let b = f32((iID>>16)&255u)/255.0;
  return vec4<f32>(r,g,b,1.0);
}`;

export const ringPickingVertCode = /*wgsl*/`
${cameraStruct}
${pickingVSOut}

@vertex
fn vs_main(
  @builtin(instance_index) instID: u32,
  @location(0) localPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) position: vec3<f32>,
  @location(3) size: vec3<f32>,
  @location(4) pickID: f32
)-> VSOut {
  let ringIndex = i32(instID % 3u);
  var lp = localPos;
  if(ringIndex == 0) {
    let tmp = lp.z;
    lp.z = -lp.y;
    lp.y = tmp;
  } else if(ringIndex == 1) {
    let px = lp.x;
    lp.x = -lp.y;
    lp.y = px;
    let pz = lp.z;
    lp.z = lp.x;
    lp.x = pz;
  }
  lp *= size;
  let worldPos = position + lp;
  var out: VSOut;
  out.position = camera.mvp * vec4<f32>(worldPos, 1.0);
  out.pickID = pickID;
  return out;
}`;



// Helper function to create vertex buffer layouts
function createVertexBufferLayout(
  attributes: Array<[number, GPUVertexFormat]>,
  stepMode: GPUVertexStepMode = 'vertex'
): VertexBufferLayout {
  let offset = 0;
  const formattedAttrs = attributes.map(([location, format]) => {
    const attr = {
      shaderLocation: location,
      offset,
      format
    };
    // Add to offset based on format size
    offset += format.includes('x3') ? 12 : format.includes('x2') ? 8 : 4;
    return attr;
  });

  return {
    arrayStride: offset,
    stepMode,
    attributes: formattedAttrs
  };
}

// Common vertex buffer layouts
export const POINT_CLOUD_GEOMETRY_LAYOUT = createVertexBufferLayout([
  [0, 'float32x3'], // position
  [1, 'float32x3']  // normal
]);

export const POINT_CLOUD_INSTANCE_LAYOUT = createVertexBufferLayout([
  [2, 'float32x3'], // position
  [3, 'float32'],   // size
  [4, 'float32x3'], // color
  [5, 'float32']    // alpha
], 'instance');

export const POINT_CLOUD_PICKING_INSTANCE_LAYOUT = createVertexBufferLayout([
  [2, 'float32x3'], // position
  [3, 'float32'],   // size
  [4, 'float32']    // pickID
], 'instance');

export const MESH_GEOMETRY_LAYOUT = createVertexBufferLayout([
  [0, 'float32x3'], // position
  [1, 'float32x3']  // normal
]);

export const ELLIPSOID_INSTANCE_LAYOUT = createVertexBufferLayout([
  [2, 'float32x3'], // position
  [3, 'float32x3'], // size
  [4, 'float32x3'], // color
  [5, 'float32']    // alpha
], 'instance');

export const ELLIPSOID_PICKING_INSTANCE_LAYOUT = createVertexBufferLayout([
  [2, 'float32x3'], // position
  [3, 'float32x3'], // size
  [4, 'float32']    // pickID
], 'instance');

export const LINE_BEAM_INSTANCE_LAYOUT = createVertexBufferLayout([
  [2, 'float32x3'], // startPos (position1)
  [3, 'float32x3'], // endPos (position2)
  [4, 'float32'],   // size
  [5, 'float32x3'], // color
  [6, 'float32']    // alpha
], 'instance');

export const LINE_BEAM_PICKING_INSTANCE_LAYOUT = createVertexBufferLayout([
  [2, 'float32x3'], // startPos (position1)
  [3, 'float32x3'], // endPos (position2)
  [4, 'float32'],   // size
  [5, 'float32']    // pickID
], 'instance');

export const CUBOID_INSTANCE_LAYOUT = createVertexBufferLayout([
  [2, 'float32x3'], // position
  [3, 'float32x3'], // size
  [4, 'float32x3'], // color
  [5, 'float32']    // alpha
], 'instance');

export const CUBOID_PICKING_INSTANCE_LAYOUT = createVertexBufferLayout([
  [2, 'float32x3'], // position
  [3, 'float32x3'], // size
  [4, 'float32']    // pickID
], 'instance');

export const RING_INSTANCE_LAYOUT = createVertexBufferLayout([
  [2, 'float32x3'], // position
  [3, 'float32x3'], // size
  [4, 'float32x3'], // color
  [5, 'float32']    // alpha
], 'instance');

export const RING_PICKING_INSTANCE_LAYOUT = createVertexBufferLayout([
  [2, 'float32x3'], // position
  [3, 'float32x3'], // size
  [4, 'float32']    // pickID
], 'instance');
