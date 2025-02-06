export function createSphereGeometry(stacks=16, slices=24) {
  const verts:number[]=[];
  const idxs:number[]=[];
  for(let i=0;i<=stacks;i++){
    const phi=(i/stacks)*Math.PI;
    const sp=Math.sin(phi), cp=Math.cos(phi);
    for(let j=0;j<=slices;j++){
      const theta=(j/slices)*2*Math.PI;
      const st=Math.sin(theta), ct=Math.cos(theta);
      const x=sp*ct, y=cp, z=sp*st;
      verts.push(x,y,z, x,y,z); // pos + normal
    }
  }
  for(let i=0;i<stacks;i++){
    for(let j=0;j<slices;j++){
      const row1=i*(slices+1)+j;
      const row2=(i+1)*(slices+1)+j;
      // Reverse winding order by swapping vertices
      idxs.push(row1,row1+1,row2, row1+1,row2+1,row2);  // Changed from (row1,row2,row1+1, row1+1,row2,row2+1)
    }
  }
  return {
    vertexData: new Float32Array(verts),
    indexData: new Uint16Array(idxs)
  };
}

export function createTorusGeometry(majorRadius:number, minorRadius:number, majorSegments:number, minorSegments:number) {
  const verts:number[]=[];
  const idxs:number[]=[];
  for(let j=0;j<=majorSegments;j++){
    const theta=(j/majorSegments)*2*Math.PI;
    const ct=Math.cos(theta), st=Math.sin(theta);
    for(let i=0;i<=minorSegments;i++){
      const phi=(i/minorSegments)*2*Math.PI;
      const cp=Math.cos(phi), sp=Math.sin(phi);
      const x=(majorRadius+minorRadius*cp)*ct;
      const y=(majorRadius+minorRadius*cp)*st;
      const z=minorRadius*sp;
      const nx=cp*ct, ny=cp*st, nz=sp;
      verts.push(x,y,z, nx,ny,nz);
    }
  }
  for(let j=0;j<majorSegments;j++){
    const row1=j*(minorSegments+1);
    const row2=(j+1)*(minorSegments+1);
    for(let i=0;i<minorSegments;i++){
      const a=row1+i, b=row1+i+1, c=row2+i, d=row2+i+1;
      idxs.push(a,b,c, b,d,c);
    }
  }
  return {
    vertexData: new Float32Array(verts),
    indexData: new Uint16Array(idxs)
  };
}

export function createCubeGeometry() {
  // 6 faces => 24 verts, 36 indices
  const positions: number[] = [
    // +X face (right) - when looking at it from right side
    0.5, -0.5, -0.5,   0.5, -0.5,  0.5,   0.5,  0.5, -0.5,   0.5,  0.5,  0.5,  // reordered: BL,BR,TL,TR
    // -X face (left) - when looking at it from left side
    -0.5, -0.5,  0.5,  -0.5, -0.5, -0.5,  -0.5,  0.5,  0.5,  -0.5,  0.5, -0.5,  // reordered: BL,BR,TL,TR
    // +Y face (top) - when looking down at it
    -0.5,  0.5, -0.5,   0.5,  0.5, -0.5,  -0.5,  0.5,  0.5,   0.5,  0.5,  0.5,  // reordered: BL,BR,TL,TR
    // -Y face (bottom) - when looking up at it
    -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,  -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,  // reordered: BL,BR,TL,TR
    // +Z face (front) - when looking at front
    -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,  -0.5,  0.5,  0.5,   0.5,  0.5,  0.5,  // reordered: BL,BR,TL,TR
    // -Z face (back) - when looking at it from behind
     0.5, -0.5, -0.5,  -0.5, -0.5, -0.5,   0.5,  0.5, -0.5,  -0.5,  0.5, -0.5,  // reordered: BL,BR,TL,TR
  ];

  // Normals stay the same as they define face orientation
  const normals: number[] = [
    // +X
    1,0,0, 1,0,0, 1,0,0, 1,0,0,
    // -X
    -1,0,0, -1,0,0, -1,0,0, -1,0,0,
    // +Y
    0,1,0, 0,1,0, 0,1,0, 0,1,0,
    // -Y
    0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
    // +Z
    0,0,1, 0,0,1, 0,0,1, 0,0,1,
    // -Z
    0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
  ];

  // For each face, define triangles in CCW order when viewed from outside
  const indices: number[] = [];
  for(let face=0; face<6; face++){
    const base = face*4;
    // All faces use same pattern: BL->BR->TL, BR->TR->TL
    indices.push(
      base+0, base+1, base+2,  // first triangle: BL->BR->TL
      base+1, base+3, base+2   // second triangle: BR->TR->TL
    );
  }

  // Interleave positions and normals
  const vertexData = new Float32Array(positions.length*2);
  for(let i=0; i<positions.length/3; i++){
    vertexData[i*6+0] = positions[i*3+0];
    vertexData[i*6+1] = positions[i*3+1];
    vertexData[i*6+2] = positions[i*3+2];
    vertexData[i*6+3] = normals[i*3+0];
    vertexData[i*6+4] = normals[i*3+1];
    vertexData[i*6+5] = normals[i*3+2];
  }
  return {
    vertexData,
    indexData: new Uint16Array(indices),
  };
}

/******************************************************
 * createBeamGeometry
 * Returns a "unit beam" from z=0..1, with rectangular cross-section of width=1.
 * Includes all six faces of the beam.
 ******************************************************/
export function createBeamGeometry() {
  const vertexData: number[] = [];
  const indexData: number[] = [];
  let vertexCount = 0;

  // Helper to add a quad face with normal
  function addQuad(
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    p4: [number, number, number],
    normal: [number, number, number]
  ) {
    // Add vertices with positions and normals
    vertexData.push(
      // First vertex
      p1[0], p1[1], p1[2],  normal[0], normal[1], normal[2],
      // Second vertex
      p2[0], p2[1], p2[2],  normal[0], normal[1], normal[2],
      // Third vertex
      p3[0], p3[1], p3[2],  normal[0], normal[1], normal[2],
      // Fourth vertex
      p4[0], p4[1], p4[2],  normal[0], normal[1], normal[2]
    );

    // Add indices for two triangles
    indexData.push(
      vertexCount + 0, vertexCount + 1, vertexCount + 2,
      vertexCount + 2, vertexCount + 1, vertexCount + 3
    );
    vertexCount += 4;
  }

  // Create the six faces of the beam
  // We'll create a beam centered in X and Y, extending from Z=0 to Z=1
  const w = 0.5;  // Half-width, so total width is 1

  // Front face (z = 0)
  addQuad(
    [-w, -w, 0], [w, -w, 0], [-w, w, 0], [w, w, 0],
    [0, 0, -1]
  );

  // Back face (z = 1)
  addQuad(
    [w, -w, 1], [-w, -w, 1], [w, w, 1], [-w, w, 1],
    [0, 0, 1]
  );

  // Right face (x = w)
  addQuad(
    [w, -w, 0], [w, -w, 1], [w, w, 0], [w, w, 1],
    [1, 0, 0]
  );

  // Left face (x = -w)
  addQuad(
    [-w, -w, 1], [-w, -w, 0], [-w, w, 1], [-w, w, 0],
    [-1, 0, 0]
  );

  // Top face (y = w)
  addQuad(
    [-w, w, 0], [w, w, 0], [-w, w, 1], [w, w, 1],
    [0, 1, 0]
  );

  // Bottom face (y = -w)
  addQuad(
    [-w, -w, 1], [w, -w, 1], [-w, -w, 0], [w, -w, 0],
    [0, -1, 0]
  );

  return {
    vertexData: new Float32Array(vertexData),
    indexData: new Uint16Array(indexData)
  };
}
