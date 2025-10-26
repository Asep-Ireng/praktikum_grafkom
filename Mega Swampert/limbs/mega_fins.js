// mega_fin_builder.js
// Mega Swampert — Center Fin builder (spline -> biased offset -> ribbon fill)
// Pure WebGL (no Three.js). Requires glMatrix (mat4).
// Your HTML must provide shaders with ids "shader-vs" and "shader-fs"
// that pass through aVertexPosition (vec3) and aVertexColor (vec4).
//
// How to tune the shape:
// - Edit CONTROL_PTS for the top edge of the fin in the YZ plane
//   (order: back z<0 -> crest -> front z>0).
// - BAND_OFFSET controls how far the bottom edge is from the top (thickness).
// - BIAS_Z pushes the bottom edge toward +Z (to make the outer edge sharp).
// - TIP_PULL pulls the bottom edge forward along the tangent near the tip.
// - TAPER_TIP scales BAND_OFFSET down near the tip so it "pinches" to a point.

// -------------------------------------------------------------
// Hardcoded params you can tweak
const SHOW_FILL = true; // draw the filled fin ribbon
const SAMPLES_PER_SEG = 22; // spline sampling density per segment

// Bottom-line shaping (use non-negative TIP_PULL and TAPER_TIP)
const BAND_OFFSET = 0.20; // overall thickness between curves
const BIAS_Z = 0.18; // constant +Z push for sharp outer edge
const TIP_PULL = 0.62; // pull forward along tangent near the tip (0..1)
const TAPER_TIP = -0.20; // shrink thickness near the very tip (0..1)

// Control points for the top edge (YZ). Keep roughly convex.
const CONTROL_PTS = [
  // y, z
  [2.05, -6.5],
  [2.25, -1.4],
  [1.7, -0.1],
  [1.8, 0.25], // crest
  [2.2, 0.85],
  [1.35, 1.7],
  [0.1, 2.05],
];

// Colors
const FIN_COLOR = [0.16, 0.16, 0.2, 1.0]; // dark grey (fill)
const LINE_COLOR = [0.95, 0.6, 0.1, 1.0]; // orange outline

// -------------------------------------------------------------
// Camera
let lastTime = 0;
let cameraRotationX = -0.15;
let cameraRotationY = 0.25;
let cameraZoomZ = -6.5;

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

  // Shaders from HTML
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

  // Build geometry
  const built = buildFin(gl, CONTROL_PTS, {
    samplesPerSegment: SAMPLES_PER_SEG,
    bandOffset: BAND_OFFSET,
    biasZ: BIAS_Z,
    tipPull: TIP_PULL,
    taperTip: TAPER_TIP,
  });

  // Mouse camera controls
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
      cameraZoomZ = Math.max(-30.0, Math.min(-3.0, cameraZoomZ));
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

    drawScene(gl, programInfo, built, dt);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

// -------------------------------------------------------------
// Build pipeline (spline -> biased offset -> ribbon fill)

function buildFin(gl, controlPtsYZ, params) {
  const samplesPerSegment = params.samplesPerSegment;
  const bandOffset = params.bandOffset;
  const biasZ = params.biasZ;
  const tipPull = params.tipPull;
  const taperTip = params.taperTip;

  // 1) Sample the top curve
  const top = sampleCRSpline(controlPtsYZ, samplesPerSegment);

  // 2) Generate bottom curve with offset + bias + tip shaping
  const bottom = makeBiasedBottomCurve(top, {
    offset: -bandOffset, // move "down" from the top curve
    biasZ,
    tipPull,
    taperTip,
  });

  // 3) Fill between them
  const ribbon = createRibbonFinGeometry(gl, FIN_COLOR, top, bottom);

  // 4) Outline for preview
  const outline = createPolylineBuffer(gl, LINE_COLOR, top);

  return { ribbon, outline };
}

// Build bottom curve with bias/taper/pull — clamped to avoid negative widening
function makeBiasedBottomCurve(top, cfg) {
  const n = top.length;
  const out = new Array(n);
  const tVec = new Array(n);

  // helpers
  const norm = (v) => {
    const l = Math.hypot(v[0], v[1]) || 1e-6;
    return [v[0] / l, v[1] / l];
  };
  const smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // clamp incoming params (prevents negative “ballooning”)
  const tipPull = Math.max(0, cfg.tipPull ?? 0);
  const taperTip = clamp01(cfg.taperTip ?? 0);
  const biasZ = cfg.biasZ ?? 0;
  const offset = cfg.offset ?? -0.28;

  // tangents
  for (let i = 0; i < n; i++) {
    const p0 = top[Math.max(0, i - 1)];
    const p1 = top[Math.min(n - 1, i + 1)];
    tVec[i] = norm([p1[0] - p0[0], p1[1] - p0[1]]); // [dy, dz]
  }

  for (let i = 0; i < n; i++) {
    const u = i / (n - 1); // 0 -> back, 1 -> tip/front
    const t = tVec[i]; // tangent [dy, dz]
    const nrm = norm([-t[1], t[0]]); // left normal

    // shrink the offset only near the front (u ~ 0.65..1.0)
    const taper = 1.0 - taperTip * smooth(0.65, 1.0, u);

    // start from normal offset
    let y = top[i][0] + nrm[0] * offset * taper;
    let z = top[i][1] + nrm[1] * offset * taper;

    // push to +Z for a sharper outer edge
    z += biasZ;

    // pull forward along the tangent only near the tip
    const w = smooth(0.65, 1.0, u);
    y += t[0] * tipPull * w;
    z += t[1] * tipPull * w;

    out[i] = [y, z];
  }
  return out;
}

// Ribbon mesh between two polylines (same length)
function createRibbonFinGeometry(gl, color, top, bottom) {
  const n = Math.min(top.length, bottom.length);
  const positions = [];
  const colors = [];
  const indices = [];

  for (let i = 0; i < n; i++) {
    const ty = top[i][0],
      tz = top[i][1];
    const by = bottom[i][0],
      bz = bottom[i][1];

    // Thin sheet: X=0 for both rows (you can extrude along X later if needed)
    positions.push(0, ty, tz);
    colors.push(...color);
    positions.push(0, by, bz);
    colors.push(...color);
  }

  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c);
    indices.push(c, b, d);
  }

  const position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const colorBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  const index = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  return {
    position,
    color: colorBuf,
    indices: index,
    vertexCount: indices.length,
    mode: "triangles",
  };
}

// Centripetal Catmull–Rom spline (YZ)
function sampleCRSpline(pts, samplesPerSegment) {
  const n = pts.length;
  if (n < 2) return pts.slice();

  const out = [];
  const alpha = 0.5;
  const clamp = (i) => Math.max(0, Math.min(n - 1, i));

  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[clamp(i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[clamp(i + 2)];

    const t0 = 0;
    const t1 = t0 + Math.pow(dist(p0, p1), alpha);
    const t2 = t1 + Math.pow(dist(p1, p2), alpha);
    const t3 = t2 + Math.pow(dist(p2, p3), alpha);

    for (let s = 0; s < samplesPerSegment; s++) {
      const t = t1 + ((t2 - t1) * s) / samplesPerSegment;
      const A1 = mix2(p0, p1, (t1 - t) / (t1 - t0), (t - t0) / (t1 - t0));
      const A2 = mix2(p1, p2, (t2 - t) / (t2 - t1), (t - t1) / (t2 - t1));
      const A3 = mix2(p2, p3, (t3 - t) / (t3 - t2), (t - t2) / (t3 - t2));

      const B1 = mix2(A1, A2, (t2 - t) / (t2 - t0), (t - t0) / (t2 - t0));
      const B2 = mix2(A2, A3, (t3 - t) / (t3 - t1), (t - t1) / (t3 - t1));

      const C = mix2(B1, B2, (t2 - t) / (t2 - t1), (t - t1) / (t2 - t1));
      out.push(C);
    }
  }
  out.push(pts[n - 1]);
  return out;

  function dist(a, b) {
    const dy = b[0] - a[0];
    const dz = b[1] - a[1];
    return Math.hypot(dy, dz);
  }
  function mix2(a, b, wa, wb) {
    return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb];
  }
}

// Polyline buffer (just for viewing the top curve)
function createPolylineBuffer(gl, color, pts) {
  const positions = [];
  const colors = [];
  const indices = [];

  for (let i = 0; i < pts.length; i++) {
    const [y, z] = pts[i];
    positions.push(0, y, z);
    colors.push(...color);
    if (i < pts.length - 1) indices.push(i, i + 1);
  }

  const position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const colorBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  const index = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  return {
    position,
    color: colorBuf,
    indices: index,
    vertexCount: indices.length,
    mode: "lines",
  };
}

// -------------------------------------------------------------
// Draw scene
function drawScene(gl, programInfo, built, dt) {
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

  const finM = mat4.clone(view);

  if (SHOW_FILL) {
    drawSet(gl, programInfo, built.ribbon, finM, gl.TRIANGLES);
  }
  drawSet(gl, programInfo, built.outline, finM, gl.LINES);
}

function drawSet(gl, programInfo, set, m, primitive) {
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
  gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, m);
  gl.drawElements(primitive, set.vertexCount, gl.UNSIGNED_SHORT, 0);
}

// -------------------------------------------------------------
// Shader helpers
function initShaderProgram(gl, vsSource, fsSource) {
  const vs = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(
      "Unable to initialize the shader program: " +
        gl.getProgramInfoLog(program)
    );
    return null;
  }
  return program;
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