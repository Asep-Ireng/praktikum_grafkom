// mega_arms.js
// Mega Swampert — Left & Right arms (full tuning version)
// Upper arm (ellipsoid) + forearm (ellipsoid) + palm (hemisphere) + 3 fingers
// + 3 orange pads on the forearm (center big, two small sides)
//
// Pure WebGL. Requires glMatrix (mat4) and HTML shaders "shader-vs"/"shader-fs"
// (aVertexPosition vec3, aVertexColor vec4, uProjectionMatrix, uModelViewMatrix).

// -------------------------------------------------------------
// COLOR PALETTE
const ARM_BLUE = [0.18, 0.55, 0.95, 1.0];
const FINGER_DARK = [0.10, 0.10, 0.12, 1.0];
const PAD_ORANGE = [1.0, 0.60, 0.0, 1.0];

// -------------------------------------------------------------
// SHAPE SCALES (ellipsoids)
const UPPER_SCALE = [1.55, 1.20, 2.15]; // shoulder bulb
const FOREARM_SCALE = [1.75, 1.55, 2.65]; // huge forearm
const PALM_SCALE = [1.20, 0.70, 1.10]; // palm thickness in Y

// Fingers (base sphere radius then scaled)
const FINGER_BASE_RADIUS = 0.68;
const FINGER_SCALE = [1.25, 0.85, 1.68]; // x width, y height, z length

// -------------------------------------------------------------
// POSE / PLACEMENT (edit these to tune everything)

// Shoulder to arm placement (torso space). Left arm mirrors X.
const SHOULDER_OFFSET = [2.55, 0.70, 0.72];

// Upper arm orientation
const UPPER_PITCH_FWD = 0.15; // rotate around X (raise forward)
const UPPER_ROLL_OUT = 0.10;   // rotate around Z (splay outward)

// Forearm anchor relative to shoulder (in torso space)
const ELBOW_FROM_SHOULDER = [-0.10, -0.2, 2.22];

// Forearm orientation (lower-arm)
const FOREARM_PITCH_FWD = -0.12; // X (bend)
const FOREARM_ROLL_OUT = 0.12;   // Z (splay)
const FOREARM_YAW_OUT = -0.12;    // Y (toe-out). Multiplied by 'side'.

// Palm (wrist) placement/orientation relative to forearm center
const PALM_DROP = 1.05;   // move down from forearm
const PALM_FORWARD = 0.53; // move forward from forearm
const PALM_PITCH = -0.12;  // pitch palm downward
const WRIST_YAW = 0.12;    // yaw palm (multiplied by 'side')
const WRIST_ROLL = 0.03;   // roll palm (multiplied by 'side')

// Orange pads on forearm (forearm local frame)
const PAD_CENTER_OFF = [0.00, 1.42, 0.46]; // center pad: lift (y) and forward (z)
const PAD_SIDE_X = 1.50;                   // side pad lateral offset (+/- X)
const PAD_SIDE_OFF = [1.00, 0.60, 0.22];   // side pad lift/forward
const PAD_TILT_X = 0.1;                  // slight wrap over forearm (rotate X)
const PAD_CENTER_SCALE = [0.80, 0.33, 1.20];
const PAD_SIDE_SCALE = [0.55, 0.48, 0.90];

// Finger cluster base offsets (palm local)
const FINGER_FORWARD = 1.55;
const FINGER_DOWN = 1.60;
const FINGER_SPREAD_X = 1.90;
const FINGER_MID_OFFSET_X = 0.00;
const FINGER_ROW_Z_BIAS = 0.08;

// Rotate the whole finger cluster relative to palm
const FINGER_CLUSTER_ROT = {
  pitch: 0.60, // curl all down
  yaw:   0.00,  // toe-out/in (multiplied by 'side')
  roll:  0.00,  // fan (multiplied by 'side')
};

// Per-finger curl/spread (left, middle, right)
const FINGER_ROT = [
  { pitch: -0.26, yaw:  0.14, roll: 0.00 }, // left finger
  { pitch: -0.32, yaw:  0.00, roll: 0.00 }, // middle (most curled)
  { pitch: -0.26, yaw: -0.14, roll: 0.00 }, // right finger
];

// -------------------------------------------------------------
// CAMERA
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

  const buffers = initArmBuffers(gl);

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
// BUFFERS
function initArmBuffers(gl) {
  const lat = 36;
  const lon = 36;

  const upper = makeBufferSet(gl, createSphereArrays(ARM_BLUE, lat, lon, 1.0));
  const forearm = makeBufferSet(gl, createSphereArrays(ARM_BLUE, lat, lon, 1.0));

  // Palm: UPPER hemisphere (y>=0) then flipped so dome faces down
  const palm = makeBufferSet(
    gl,
    createHemisphereYArrays(ARM_BLUE, 0.75, lat, lon, false)
  );

  // Fingers: bigger base radius
  const finger = makeBufferSet(
    gl,
    createSphereArrays(FINGER_DARK, 24, 24, FINGER_BASE_RADIUS)
  );

  // Orange pads
  const padCenter = makeBufferSet(
    gl,
    createSphereArrays(PAD_ORANGE, 24, 24, 1.0)
  );
  const padSide = makeBufferSet(gl, createSphereArrays(PAD_ORANGE, 24, 24, 1.0));

  return { upper, forearm, palm, finger, padCenter, padSide };
}

// -------------------------------------------------------------
// DRAW
function drawScene(gl, programInfo, buffers, dt) {
  gl.clearColor(0.1, 0.1, 0.1, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const projectionMatrix = mat4.create();
  mat4.perspective(
    projectionMatrix,
    (45 * Math.PI) / 180,
    gl.canvas.clientWidth / gl.canvas.clientHeight,
    0.1,
    100.0
  );

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

  drawArm(+1);
  drawArm(-1);

  function drawArm(side) {
    // Upper arm
    const upM = mat4.clone(view);
    const shoulder = [
      SHOULDER_OFFSET[0] * side,
      SHOULDER_OFFSET[2],
      SHOULDER_OFFSET[2],
    ];
    mat4.translate(upM, upM, shoulder);
    mat4.rotate(upM, upM, UPPER_PITCH_FWD, [1, 0, 0]);
    mat4.rotate(upM, upM, side * UPPER_ROLL_OUT, [0, 0, 1]);
    mat4.scale(upM, upM, UPPER_SCALE);
    drawSet(buffers.upper, upM);

    // Forearm
    const foreCenter = [
      shoulder[0] + ELBOW_FROM_SHOULDER[0] * side,
      shoulder[1] + ELBOW_FROM_SHOULDER[1],
      shoulder[2] + ELBOW_FROM_SHOULDER[2],
    ];
    const faM = mat4.clone(view);
    mat4.translate(faM, faM, foreCenter);
    mat4.rotate(faM, faM, FOREARM_PITCH_FWD, [1, 0, 0]);
    mat4.rotate(faM, faM, side * FOREARM_ROLL_OUT, [0, 0, 1]);
    mat4.rotate(faM, faM, side * FOREARM_YAW_OUT, [0, 1, 0]); // extra yaw
    mat4.scale(faM, faM, FOREARM_SCALE);
    drawSet(buffers.forearm, faM);

    // Palm (hemisphere): inherit lower-arm yaw via applying same rotations,
    // then flip + wrist tuning (pitch/yaw/roll)
    const palmM = mat4.clone(view);
    mat4.translate(palmM, palmM, foreCenter);
    mat4.rotate(palmM, palmM, FOREARM_PITCH_FWD, [1, 0, 0]);
    mat4.rotate(palmM, palmM, side * FOREARM_ROLL_OUT, [0, 0, 1]);
    mat4.rotate(palmM, palmM, side * FOREARM_YAW_OUT, [0, 1, 0]);
    mat4.translate(palmM, palmM, [0, -PALM_DROP, PALM_FORWARD]);
    mat4.rotate(palmM, palmM, Math.PI, [1, 0, 0]); // flip upper hemisphere
    mat4.rotate(palmM, palmM, PALM_PITCH, [1, 0, 0]);
    mat4.rotate(palmM, palmM, side * WRIST_YAW, [0, 1, 0]);
    mat4.rotate(palmM, palmM, side * WRIST_ROLL, [0, 0, 1]);
    mat4.scale(palmM, palmM, PALM_SCALE);
    drawSet(buffers.palm, palmM);

    // Orange pads — forearm-local (reuse forearm rotations)
    // Center pad
    const pcM = mat4.clone(view);
    mat4.translate(pcM, pcM, foreCenter);
    mat4.rotate(pcM, pcM, FOREARM_PITCH_FWD, [1, 0, 0]);
    mat4.rotate(pcM, pcM, side * FOREARM_ROLL_OUT, [0, 0, 1]);
    mat4.rotate(pcM, pcM, side * FOREARM_YAW_OUT, [0, 1, 0]);
    mat4.translate(pcM, pcM, PAD_CENTER_OFF);
    mat4.rotate(pcM, pcM, PAD_TILT_X, [1, 0, 0]);
    mat4.scale(pcM, pcM, PAD_CENTER_SCALE);
    drawSet(buffers.padCenter, pcM);

    // Side pads (mirror in X)
    for (const sgn of [-1, +1]) {
      const psM = mat4.clone(view);
      mat4.translate(psM, psM, foreCenter);
      mat4.rotate(psM, psM, FOREARM_PITCH_FWD, [1, 0, 0]);
      mat4.rotate(psM, psM, side * FOREARM_ROLL_OUT, [0, 0, 1]);
      mat4.rotate(psM, psM, side * FOREARM_YAW_OUT, [0, 1, 0]);
      mat4.translate(psM, psM, [
        PAD_SIDE_X * sgn,
        PAD_SIDE_OFF[1],
        PAD_SIDE_OFF[2],
      ]);
      mat4.rotate(psM, psM, PAD_TILT_X * 1.2, [1, 0, 0]);
      mat4.scale(psM, psM, PAD_SIDE_SCALE);
      drawSet(buffers.padSide, psM);
    }

    // Fingers: build under palm (use palm local), with cluster rotations then per-finger curl
    const fingers = [
      [-FINGER_SPREAD_X * 0.6, FINGER_DOWN, FINGER_FORWARD - 0.02], // left
      [ FINGER_MID_OFFSET_X,   FINGER_DOWN, FINGER_FORWARD + FINGER_ROW_Z_BIAS], // mid
      [ FINGER_SPREAD_X * 0.6, FINGER_DOWN, FINGER_FORWARD - 0.02], // right
    ];

    for (let i = 0; i < 3; i++) {
      const fM = mat4.clone(view);
      mat4.translate(fM, fM, foreCenter);
      // inherit forearm orientation for the palm frame
      mat4.rotate(fM, fM, FOREARM_PITCH_FWD, [1, 0, 0]);
      mat4.rotate(fM, fM, side * FOREARM_ROLL_OUT, [0, 0, 1]);
      mat4.rotate(fM, fM, side * FOREARM_YAW_OUT, [0, 1, 0]);
      // move to palm plane
      mat4.translate(fM, fM, [0, -PALM_DROP, 0]);
      // cluster rotation (about palm)
      mat4.rotate(fM, fM, FINGER_CLUSTER_ROT.pitch, [1, 0, 0]);
      mat4.rotate(fM, fM, side * FINGER_CLUSTER_ROT.yaw, [0, 1, 0]);
      mat4.rotate(fM, fM, side * FINGER_CLUSTER_ROT.roll, [0, 0, 1]);
      // per-finger base offset (mirror X)
      mat4.translate(fM, fM, [
        fingers[i][0] * side,
        fingers[i][1],
        fingers[i][2],
      ]);
      // per-finger curl/spread
      mat4.rotate(fM, fM, FINGER_ROT[i].pitch, [1, 0, 0]);
      mat4.rotate(fM, fM, side * FINGER_ROT[i].yaw, [0, 1, 0]);
      mat4.rotate(fM, fM, side * FINGER_ROT[i].roll, [0, 0, 1]);
      // size
      mat4.scale(fM, fM, FINGER_SCALE);
      drawSet(buffers.finger, fM);
    }
  }
}

// -------------------------------------------------------------
// GEOMETRY ARRAY GENERATORS

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

// Hemisphere along Y; if lower==true keep y<=0 (dome down), else y>=0 (dome up)
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
// GL WRAPPERS + SHADER HELPERS

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