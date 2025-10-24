// Mega Swampert (Head + Cheek Base + Spikes + Eyes + Nose) — Pure WebGL
// Assumes glMatrix (mat4) is loaded and shaders are provided in HTML
// via <script id="shader-vs"> and <script id="shader-fs">.

// -------------------------------------------------------------
// Camera + time
let objectRotation = 0.0;
let lastTime = 0;
let cameraRotationX = 0;
let cameraRotationY = 0;
let cameraZoomZ = -6.0;

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// window.onload = function () {
//   main();
// };

function main() {
  const canvas = document.getElementById("glCanvas");
  const gl = canvas.getContext("webgl");
  if (!gl) {
    console.error("WebGL not supported.");
    return;
  }

  // Responsive canvas
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Shaders (already in HTML)
  const vsSource = document.getElementById("shader-vs").textContent;
  const fsSource = document.getElementById("shader-fs").textContent;

  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
  if (!shaderProgram) return;

  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
      vertexColor: gl.getAttribLocation(shaderProgram, "aVertexColor"),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(
        shaderProgram,
        "uProjectionMatrix"
      ),
      modelViewMatrix: gl.getUniformLocation(
        shaderProgram,
        "uModelViewMatrix"
      ),
    },
  };

  const buffers = initMegaSwampertHeadBuffers(gl);

  // Mouse controls
  canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });
  canvas.addEventListener("mouseup", () => {
    isDragging = false;
  });
  canvas.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    cameraRotationY += dx * 0.005;
    cameraRotationX += dy * 0.005;
    cameraRotationX = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, cameraRotationX)
    );
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    cameraZoomZ += e.deltaY * 0.01;
    cameraZoomZ = Math.max(-20.0, Math.min(-1.0, cameraZoomZ));
  });

  // Render loop
  function render(now) {
    now *= 0.001;
    const deltaTime = now - lastTime;
    lastTime = now;

    if (
      canvas.width !== canvas.clientWidth ||
      canvas.height !== canvas.clientHeight
    ) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }

    drawScene(gl, programInfo, buffers, deltaTime);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

// -------------------------------------------------------------
// Shader compilation/link
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error(
      "Unable to initialize the shader program: " +
        gl.getProgramInfoLog(shaderProgram)
    );
    return null;
  }
  return shaderProgram;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(
      "An error occurred compiling the shaders: " +
        gl.getShaderInfoLog(shader)
    );
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// -------------------------------------------------------------
// Geometry: hemisphere (split sphere)
function createHemisphereGeometry(
  isTopHemisphere,
  color,
  latitudeBands,
  longitudeBands,
  radius,
  offsetY
) {
  const positions = [];
  const colors = [];
  const indices = [];

  const startLat = isTopHemisphere ? 0 : Math.floor(latitudeBands / 2);
  theEndLat = isTopHemisphere ? Math.ceil(latitudeBands / 2) : latitudeBands;
  var endLat = theEndLat;

  for (let lat = startLat; lat <= endLat; lat++) {
    const theta = (lat * Math.PI) / latitudeBands;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= longitudeBands; lon++) {
      const phi = (lon * 2 * Math.PI) / longitudeBands;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = cosPhi * sinTheta;
      const y = cosTheta;
      const z = sinPhi * sinTheta;

      positions.push(radius * x);
      positions.push(radius * y + (isTopHemisphere ? offsetY : -offsetY));
      positions.push(radius * z);
      colors.push(...color);
    }
  }

  const effectiveLatBands = endLat - startLat;
  for (let lat = 0; lat < effectiveLatBands; lat++) {
    for (let lon = 0; lon < longitudeBands; lon++) {
      const first = lat * (longitudeBands + 1) + lon;
      const second = first + longitudeBands + 1;
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return { positions, colors, indices };
}

// -------------------------------------------------------------
// Geometry: zig-zag ring for the cheek line
function createGroovesGeometry(gl, color, segments, amplitude, height, radius) {
  const positions = [];
  const colors = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const angle = (i * 2 * Math.PI) / segments;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const waveY = (i % 2 === 0 ? 1 : -1) * amplitude;

    positions.push(x, waveY + height / 2, z);
    colors.push(...color);

    positions.push(x, waveY - height / 2, z);
    colors.push(...color);
  }

  for (let i = 0; i < segments; i++) {
    const i0 = i * 2;
    const i1 = i * 2 + 1;
    const i2 = (i + 1) * 2;
    const i3 = (i + 1) * 2 + 1;
    indices.push(i0, i1, i2);
    indices.push(i1, i3, i2);
  }

  const position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const colorBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  const index = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );

  return {
    position,
    color: colorBuf,
    indices: index,
    vertexCount: indices.length,
  };
}

// -------------------------------------------------------------
// Geometry: cheek pad base (circular segment extruded along Z)
function createCheekBaseGeometry(gl, color, radius, xCut, thickness, segments) {
  const positions = [];
  const colors = [];
  const indices = [];
  const halfT = thickness * 0.5;

  const eps = 1e-5;
  xCut = Math.max(-radius + eps, Math.min(radius - eps, xCut));
  const yCut = Math.sqrt(radius * radius - xCut * xCut);

  const aTop = Math.atan2(yCut, xCut);
  const aBot = -aTop;

  const boundary = [];
  boundary.push(xCut, yCut, 0);
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const a = aTop + (aBot - aTop) * t;
    boundary.push(radius * Math.cos(a), radius * Math.sin(a), 0);
  }
  boundary.push(xCut, -yCut, 0);

  const n = boundary.length / 3;

  for (let i = 0; i < n; i++) {
    positions.push(boundary[i * 3 + 0], boundary[i * 3 + 1], +halfT);
    colors.push(...color);
  }
  for (let i = 0; i < n; i++) {
    positions.push(boundary[i * 3 + 0], boundary[i * 3 + 1], -halfT);
    colors.push(...color);
  }

  for (let i = 1; i < n - 1; i++) indices.push(0, i, i + 1);

  const N = n;
  for (let i = 1; i < n - 1; i++) indices.push(N + 0, N + i + 1, N + i);

  for (let i = 0; i < n; i++) {
    const i0f = i;
    const i1f = (i + 1) % n;
    const i0b = i0f + N;
    const i1b = i1f + N;
    indices.push(i0f, i0b, i1f);
    indices.push(i1f, i0b, i1b);
  }

  const position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const colorBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  const index = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );

  return {
    position,
    color: colorBuf,
    indices: index,
    vertexCount: indices.length,
  };
}

// -------------------------------------------------------------
// Geometry: reusable UNIT cone (axis +X, base at x=0, tip at x=1)
function createUnitConeGeometry(gl, color, segments) {
  const positions = [];
  const colors = [];
  const indices = [];

  for (let i = 0; i < segments; i++) {
    const a = (i * 2 * Math.PI) / segments;
    const y = Math.cos(a);
    const z = Math.sin(a);
    positions.push(0, y, z);
    colors.push(...color);
  }
  const tipIndex = positions.length / 3;
  positions.push(1, 0, 0);
  colors.push(...color);

  const baseCenterIndex = positions.length / 3;
  positions.push(0, 0, 0);
  colors.push(...color);

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(i, next, tipIndex);
  }
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(baseCenterIndex, next, i);
  }

  const position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const colorBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  const index = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );

  return {
    position,
    color: colorBuf,
    indices: index,
    vertexCount: indices.length,
  };
}

// -------------------------------------------------------------
// Geometry: ellipse disc (extruded along +Z)
// Useful for eyes and nostrils
function createEllipseDiscGeometry(gl, color, rx, ry, thickness, segments) {
  const h = thickness * 0.5;
  const positions = [];
  const colors = [];
  const indices = [];

  // front center
  positions.push(0, 0, h);
  colors.push(...color);
  // front ring
  for (let i = 0; i < segments; i++) {
    const a = (i * 2 * Math.PI) / segments;
    positions.push(rx * Math.cos(a), ry * Math.sin(a), h);
    colors.push(...color);
  }
  // back center
  const backCenter = positions.length / 3;
  positions.push(0, 0, -h);
  colors.push(...color);
  // back ring
  const backRingStart = positions.length / 3;
  for (let i = 0; i < segments; i++) {
    const a = (i * 2 * Math.PI) / segments;
    positions.push(rx * Math.cos(a), ry * Math.sin(a), -h);
    colors.push(...color);
  }

  // front fan
  for (let i = 0; i < segments; i++) {
    const a0 = 1 + i;
    const a1 = 1 + ((i + 1) % segments);
    indices.push(0, a0, a1);
  }
  // back fan (reverse)
  for (let i = 0; i < segments; i++) {
    const b0 = backRingStart + i;
    const b1 = backRingStart + ((i + 1) % segments);
    indices.push(backCenter, b1, b0);
  }
  // side quads
  for (let i = 0; i < segments; i++) {
    const f0 = 1 + i;
    const f1 = 1 + ((i + 1) % segments);
    const b0 = backRingStart + i;
    const b1 = backRingStart + ((i + 1) % segments);
    indices.push(f0, b0, f1);
    indices.push(f1, b0, b1);
  }

  const position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const colorBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  const index = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );

  return {
    position,
    color: colorBuf,
    indices: index,
    vertexCount: indices.length,
  };
}

// -------------------------------------------------------------
// Create buffers for the Mega Swampert head parts
function initMegaSwampertHeadBuffers(gl) {
  const latitudeBands = 30;
  const longitudeBands = 30;
  const radius = 1.0;
  const hemisphereOffsetY = 0.0;

  const blue = [0.2, 0.4, 1.0, 1.0];
  const white = [0.95, 0.95, 0.95, 1.0];
  const darkGrey = [0.14, 0.14, 0.14, 1.0];
  const orange = [1.0, 0.6, 0.0, 1.0];
  const iris = [0.98, 0.75, 0.24, 1.0]; // golden/orange eye
  const black = [0.06, 0.06, 0.06, 1.0];

  // Head hemispheres
  const topData = createHemisphereGeometry(
    true,
    blue,
    latitudeBands,
    longitudeBands,
    radius,
    hemisphereOffsetY
  );
  const topPos = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, topPos);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(topData.positions),
    gl.STATIC_DRAW
  );

  const topCol = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, topCol);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(topData.colors),
    gl.STATIC_DRAW
  );

  const topIdx = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, topIdx);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(topData.indices),
    gl.STATIC_DRAW
  );

  const bottomData = createHemisphereGeometry(
    false,
    white,
    latitudeBands,
    longitudeBands,
    radius,
    hemisphereOffsetY
  );
  const botPos = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, botPos);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(bottomData.positions),
    gl.STATIC_DRAW
  );

  const botCol = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, botCol);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(bottomData.colors),
    gl.STATIC_DRAW
  );

  const botIdx = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, botIdx);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(bottomData.indices),
    gl.STATIC_DRAW
  );

  // Zig-zag ring
  const grooves = createGroovesGeometry(
    gl,
    darkGrey,
    24,
    0.06,
    0.03,
    radius * 1.05
  );

  // Cheek pads (segment plates)
  const cheekRadius = 1.0;
  const cheekXCut = 0.5;
  const cheekThickness = 0.2;
  const cheekSegments = 24;

  const rightCheekPad = createCheekBaseGeometry(
    gl,
    orange,
    cheekRadius,
    cheekXCut,
    cheekThickness,
    cheekSegments
  );
  const leftCheekPad = createCheekBaseGeometry(
    gl,
    orange,
    cheekRadius,
    cheekXCut,
    cheekThickness,
    cheekSegments
  );

  // Reusable unit cone for the spikes
  const cone = createUnitConeGeometry(gl, orange, 28);

  // Eyes and nostrils geometry (reused for both sides)
  const eyeIris = createEllipseDiscGeometry(gl, iris, 0.20, 0.16, 0.06, 36);
  const eyePupil = createEllipseDiscGeometry(gl, black, 0.08, 0.10, 0.05, 30);
  const eyeHighlight = createEllipseDiscGeometry(
    gl,
    white,
    0.03,
    0.03,
    0.025,
    18
  );
  const nostril = createEllipseDiscGeometry(
    gl,
    darkGrey,
    0.035,
    0.02,
    0.02,
    20
  );

  return {
    top: {
      position: topPos,
      color: topCol,
      indices: topIdx,
      vertexCount: topData.indices.length,
    },
    bottom: {
      position: botPos,
      color: botCol,
      indices: botIdx,
      vertexCount: bottomData.indices.length,
    },
    grooves,
    rightCheekPad,
    leftCheekPad,
    cone,
    eyeIris,
    eyePupil,
    eyeHighlight,
    nostril,
  };
}

// -------------------------------------------------------------
// Draw
function drawScene(gl, programInfo, buffers, deltaTime) {
  gl.clearColor(0.1, 0.1, 0.1, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Projection
  const projectionMatrix = mat4.create();
  mat4.perspective(
    projectionMatrix,
    (45 * Math.PI) / 180,
    gl.canvas.clientWidth / gl.canvas.clientHeight,
    0.1,
    100.0
  );

  // View (camera)
  const viewMatrix = mat4.create();
  mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, cameraZoomZ]);
  mat4.rotate(viewMatrix, viewMatrix, cameraRotationX, [1, 0, 0]);
  mat4.rotate(viewMatrix, viewMatrix, cameraRotationY, [0, 1, 0]);

  gl.useProgram(programInfo.program);
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    projectionMatrix
  );

  function drawBufferSet(bufferSet, modelViewMatrix) {
    if (
      !bufferSet ||
      !bufferSet.position ||
      !bufferSet.color ||
      !bufferSet.indices
    ) {
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.position);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.color);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexColor,
      4,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferSet.indices);
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix
    );
    gl.drawElements(gl.TRIANGLES, bufferSet.vertexCount, gl.UNSIGNED_SHORT, 0);
  }

  // Head top hemisphere
  const topM = mat4.clone(viewMatrix);
  mat4.scale(topM, topM, [1.3, 1.2, 1.1]);
  drawBufferSet(buffers.top, topM);

  // Head bottom hemisphere (slightly flattened)
  const botM = mat4.clone(viewMatrix);
  mat4.scale(botM, botM, [1.3, 0.7, 1.1]);
  drawBufferSet(buffers.bottom, botM);

  // Zig-zag ring
  const grooveM = mat4.clone(viewMatrix);
  mat4.scale(grooveM, grooveM, [1.3, 2.0, 1.1]);
  drawBufferSet(buffers.grooves, grooveM);

  // Right cheek pad
  const rightPadM = mat4.clone(viewMatrix);
  mat4.translate(rightPadM, rightPadM, [1.0, 0.02, 0.0]);
  mat4.rotate(rightPadM, rightPadM, -Math.PI / 2, [1.1, 1, -0.1]);
  mat4.rotate(rightPadM, rightPadM, Math.PI / 10, [2, 4, 0.7]);
  mat4.scale(rightPadM, rightPadM, [0.8, 1.0, 2.0]);
  drawBufferSet(buffers.rightCheekPad, rightPadM);

  // Left cheek pad — perfect mirror of the right
  const leftPadM = mat4.clone(viewMatrix);
  mat4.scale(leftPadM, leftPadM, [-1, 1, 1]);
  mat4.translate(leftPadM, leftPadM, [1.0, 0.02, 0.0]);
  mat4.rotate(leftPadM, leftPadM, -Math.PI / 2, [1.1, 1, -0.1]);
  mat4.rotate(leftPadM, leftPadM, Math.PI / 10, [2, 4, 0.7]);
  mat4.scale(leftPadM, leftPadM, [0.8, 1.0, 2.0]);
  drawBufferSet(buffers.leftCheekPad, leftPadM);

  // -------- Spikes (3 cones) per side -----------------------
  function placeCone(baseFrame, offset, tiltZ, sweepY, length, radius) {
    const m = mat4.clone(baseFrame);
    mat4.translate(m, m, offset);
    mat4.rotate(m, m, tiltZ, [0, 0, 1]);
    mat4.rotate(m, m, sweepY, [0, 1, 0]);
    mat4.scale(m, m, [length, radius, radius]);
    drawBufferSet(buffers.cone, m);
  }

  function buildSpikeFrame(side) {
    const m = mat4.clone(viewMatrix);
    mat4.scale(m, m, [side * 1.8, 1.4, 1.2]);
    mat4.translate(m, m, [0.7, 0.14, 0.4]);
    mat4.rotate(m, m, -Math.PI / 2, [2.0, 1, -0.1]);
    mat4.rotate(m, m, Math.PI / 10, [2, 4, 0.7]);
    return m;
  }

  const leftFrame = buildSpikeFrame(-1);
  placeCone(leftFrame, [0.18, 0.30, 0.06], 0.6, -0.4, 1.65, 0.16);
  placeCone(leftFrame, [0.14, 0.08, -0.0], 0.18, -0.55, 1.25, 0.145);
  placeCone(leftFrame, [0.12, -0.22, -0.08], -0.5, -0.42, 1.10, 0.135);

  const rightFrame = buildSpikeFrame(+1);
  placeCone(rightFrame, [0.18, 0.30, 0.06], 0.6, -0.4, 1.65, 0.16);
  placeCone(rightFrame, [0.14, 0.08, -0.0], 0.18, -0.55, 1.25, 0.145);
  placeCone(rightFrame, [0.12, -0.22, -0.08], -0.5, -0.42, 1.10, 0.135);
  // ----------------------------------------------------------

// -------------------- Eyes (angry) -------------------------
function drawEye(side) {
  // side: +1 = right, -1 = left
  const base = mat4.clone(viewMatrix);

  // Place a bit higher and farther out from center
  mat4.translate(base, base, [side * 0.56, 0.40, 0.90]);

  // Outward yaw, slight forward pitch, strong roll so inner corner is lower
  mat4.rotate(base, base, side * 0.32, [0, 1, 0]);   // yaw outward
  mat4.rotate(base, base, 0.15, [1, 0, 0]);          // pitch
  mat4.rotate(base, base, side * -0.65, [0, 0, 1]);  // roll -> angry slant

  // Iris
  const irisM = mat4.clone(base);
  drawBufferSet(buffers.eyeIris, irisM);

  // Pupil: toward INNER side and a bit upward, slightly forward
  const pupilM = mat4.clone(base);
  mat4.translate(pupilM, pupilM, [-0.05 * side, 0.03, 0.055]);
  drawBufferSet(buffers.eyePupil, pupilM);

  // Highlight near outer/top
  const hiM = mat4.clone(base);
  mat4.translate(hiM, hiM, [0.06 * side, 0.08, 0.07]);
  drawBufferSet(buffers.eyeHighlight, hiM);
}

drawEye(+1);
drawEye(-1);
// ----------------------------------------------------------
// -------------------- Nose (nostrils) ---------------------
function drawNostril(side) {
  const m = mat4.clone(viewMatrix);

  // Place near the snout tip, a bit lower, slightly inwards
  mat4.translate(m, m, [side * 0.11, 0.21, 1.1]);

  // Orient to lie on the snout surface: yaw outward, small pitch down,
  // and roll so the ellipse leans with the snout ridge
  mat4.rotate(m, m, side * 0.35, [0, 1, 0]); // yaw outward
  mat4.rotate(m, m, -0.15, [1, 0, 0]);       // pitch
  mat4.rotate(m, m, side * 0.25, [0, 0, 1]); // roll

  // Slight scale tweak if you want a bit larger nostrils
  // mat4.scale(m, m, [1.0, 1.1, 1.0]);

  drawBufferSet(buffers.nostril, m);
}

drawNostril(+1);
drawNostril(-1);
// ----------------------------------------------------------
}