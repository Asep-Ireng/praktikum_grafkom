// mega_legs.js
// Mega Swampert — Left & Right legs (bulky ellipsoid + hemispherical feet)
// Pure WebGL (no Three.js). Requires glMatrix (mat4) and HTML shaders
// with ids "shader-vs" and "shader-fs" (position+color pass-through).

// Colors and shape parameters
const LEG_BLUE = [0.18, 0.55, 0.95, 1.0];

// Thigh (ellipsoid) from a unit sphere scaled per-axis
const THIGH_RADIUS = 1.0;
const THIGH_SCALE = [0.85, 1.35, 0.95]; // x,y,z

// Foot (lower hemisphere, flat top)
const FOOT_RADIUS = 0.75;
const FOOT_SCALE = [1.45, 0.80, 1.25]; // X width, Y thickness, Z length

// Placement relative to torso origin; mirror X for left/right
const HIP_OFFSET = [1.65, -0.55, 0.55]; // [x,y,z] for RIGHT leg; left uses -x
const THIGH_TILT_OUT = 0.20; // radians (around Z), splay outward
const THIGH_TILT_FWD = -0.10; // radians (around X), lean forward slightly
const ANKLE_DROP = 1.35; // foot below thigh center
const FOOT_FORWARD = 0.15; // foot forward offset

// -------------------------------------------------------------
// Camera
let lastTime = 0;
let cameraRotationX = 0;
let cameraRotationY = 0;
let cameraZoomZ = -9.0;

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

    const buffers = initLegBuffers(gl);

    // Camera controls
    canvas.addEventListener("mousedown", (e) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });
    canvas.addEventListener("mouseup", () => (isDragging = false));
    canvas.addEventListener("mouseleave", () => (isDragging = false));
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
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        cameraZoomZ += e.deltaY * 0.01;
        cameraZoomZ = Math.max(-30.0, Math.min(-4.0, cameraZoomZ));
      },
      { passive: false }
    );

    // Render loop
    function render(now) {
      now *= 0.001;
      const dt = now - lastTime;
      lastTime = now;

      if (
        canvas.width !== canvas.clientWidth ||
        canvas.height !== canvas.clientHeight
      ) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      }

      drawScene(gl, programInfo, buffers, dt);
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

// -------------------------------------------------------------
// Buffers
function initLegBuffers(gl) {
  const lat = 36;
  const lon = 36;

  // Thigh arrays -> GL buffers
  const thighArrays = createSphereArrays(LEG_BLUE, lat, lon, THIGH_RADIUS);
  const thigh = makeBufferSet(gl, thighArrays);

  // Foot arrays (lower hemisphere, dome downward) -> GL buffers
// Use UPPER hemisphere, then flip in the draw step so the dome faces downward
const footArrays = createHemisphereYArrays(LEG_BLUE, FOOT_RADIUS, lat, lon, false);  const foot = makeBufferSet(gl, footArrays);

  return { thigh, foot };
}

// -------------------------------------------------------------
// Draw
function drawScene(gl, programInfo, buffers, dt) {
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

  // View
  const view = mat4.create();
  mat4.translate(view, view, [0, 0, cameraZoomZ]);
  mat4.rotate(view, view, cameraRotationX, [1, 0, 0]);
  mat4.rotate(view, view, cameraRotationY, [0, 1, 0]);

  gl.useProgram(programInfo.program);
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    projectionMatrix
  );

  function drawSet(set, m) {
    gl.bindBuffer(gl.ARRAY_BUFFER, set.position);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, set.color);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexColor,
      4,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, set.indices);
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      m
    );
    gl.drawElements(gl.TRIANGLES, set.vertexCount, gl.UNSIGNED_SHORT, 0);
  }

  // Right and left legs
  drawLeg(+1);
  drawLeg(-1);

  function drawLeg(side) {
    // Thigh (ellipsoid)
    const thighM = mat4.clone(view);
    const hip = [HIP_OFFSET[0] * side, HIP_OFFSET[1], HIP_OFFSET[2]];
    mat4.translate(thighM, thighM, hip);
    mat4.rotate(thighM, thighM, side * THIGH_TILT_OUT, [0, 0, 1]);
    mat4.rotate(thighM, thighM, THIGH_TILT_FWD, [1, 0, 0]);
    mat4.scale(thighM, thighM, THIGH_SCALE);
    drawSet(buffers.thigh, thighM);

 // Foot (hemisphere) — face forward
const FOOT_YAW_OUT = 1.5;  // outward yaw (radians); use 0 to be perfectly straight
const FOOT_PITCH   = -0.08; // tiny pitch so the sole sits flatter

const footM = mat4.clone(view);
mat4.translate(footM, footM, hip);
mat4.translate(footM, footM, [0, -ANKLE_DROP, FOOT_FORWARD]);

// If you built the foot from the UPPER hemisphere, flip so dome points down:
// mat4.rotate(footM, footM, Math.PI, [1, 0, 0]);

// Slight pitch for contact
mat4.rotate(footM, footM, FOOT_PITCH, [1, 0, 0]);

// Yaw so toes point forward (cancel toe-in/out)
// Positive 'side' is right leg; negative is left.
// Using -FOOT_YAW_OUT makes both feet turn the same "forward" direction.
mat4.rotate(footM, footM, side * (-FOOT_YAW_OUT), [0, 1, 0]);

// Keep a tiny roll if you like (often not needed)
// mat4.rotate(footM, footM, side * 0.02, [0, 0, 1]);

// Thicken/widen foot
mat4.scale(footM, footM, FOOT_SCALE);
drawSet(buffers.foot, footM);
  }
}

// -------------------------------------------------------------
// Geometry (arrays only; GL buffers created by makeBufferSet)

function createSphereArrays(color, latBands, lonBands, radius) {
  const positions = [];
  const colors = [];
  const indices = [];

  for (let lat = 0; lat <= latBands; lat++) {
    const theta = (lat * Math.PI) / latBands;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    for (let lon = 0; lon <= lonBands; lon++) {
      const phi = (lon * 2 * Math.PI) / lonBands;
      const sinP = Math.sin(phi);
      const cosP = Math.cos(phi);

      const x = radius * cosP * sinT;
      const y = radius * cosT;
      const z = radius * sinP * sinT;

      positions.push(x, y, z);
      colors.push(...color);
    }
  }

  for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < lonBands; lon++) {
      const first = lat * (lonBands + 1) + lon;
      const second = first + lonBands + 1;
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return { positions, colors, indices };
}

// Hemisphere oriented along Y (flat face at y=0).
// If lower=true we keep y<=0 (dome downward). If false, y>=0 (dome upward).
function createHemisphereYArrays(color, radius, latBands, lonBands, lower) {
  const positions = [];
  const colors = [];
  const indices = [];

  const startLat = lower ? Math.ceil(latBands / 2) : 0;
  const endLat = lower ? latBands : Math.floor(latBands / 2);

  for (let lat = startLat; lat <= endLat; lat++) {
    const theta = (lat * Math.PI) / latBands;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    for (let lon = 0; lon <= lonBands; lon++) {
      const phi = (lon * 2 * Math.PI) / lonBands;
      const sinP = Math.sin(phi);
      const cosP = Math.cos(phi);

      const x = radius * cosP * sinT;
      const y = radius * cosT;
      const z = radius * sinP * sinT;

      positions.push(x, y, z);
      colors.push(...color);
    }
  }

  const eff = endLat - startLat;
  for (let lat = 0; lat < eff; lat++) {
    for (let lon = 0; lon < lonBands; lon++) {
      const first = lat * (lonBands + 1) + lon;
      const second = first + lonBands + 1;
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return { positions, colors, indices };
}

// -------------------------------------------------------------
// GL wrappers + shader helpers

function makeBufferSet(gl, data) {
  const position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, position);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(data.positions),
    gl.STATIC_DRAW
  );

  const color = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, color);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(data.colors),
    gl.STATIC_DRAW
  );

  const indices = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(data.indices),
    gl.STATIC_DRAW
  );

  return {
    position,
    color,
    indices,
    vertexCount: data.indices.length,
  };
}

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