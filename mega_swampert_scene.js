// mega_swampert_scene.js
// Prettier print width: 80

/* eslint-disable no-undef */

/**
 * Lightweight check for mat4 from gl-matrix in either global style:
 * - window.mat4 (UMD)
 * - window.glMatrix.mat4 (UMD namespace)
 */
const _mat4 =
  (globalThis.glMatrix && globalThis.glMatrix.mat4) || globalThis.mat4;

if (!_mat4) {
  throw new Error(
    "[MegaSwampert] gl-matrix not found. Include gl-matrix before this module."
  );
}

/**
 * Minimal shader sources (flat color per-vertex).
 */
const VS_SOURCE = `
attribute vec4 aVertexPosition;
attribute vec4 aVertexColor;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying lowp vec4 vColor;

void main(void) {
  gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
  vColor = aVertexColor;
}
`.trim();

const FS_SOURCE = `
varying lowp vec4 vColor;
void main(void) {
  gl_FragColor = vColor;
}
`.trim();

/**
 * Compile + link a WebGL shader program.
 */
function createProgram(gl, vsSource, fsSource) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vsSource);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(vs);
    gl.deleteShader(vs);
    throw new Error(`[MegaSwampert] VS compile error: ${log || "unknown"}`);
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fsSource);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(fs);
    gl.deleteShader(fs);
    gl.deleteShader(vs);
    throw new Error(`[MegaSwampert] FS compile error: ${log || "unknown"}`);
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  // Shaders can be deleted after linking
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`[MegaSwampert] Program link error: ${log || "unknown"}`);
  }

  return prog;
}

/**
 * Create the Mega Swampert scene on a canvas.
 *
 * @param {HTMLCanvasElement|string} canvas Canvas element or its id
 * @param {object} [options]
 * @param {boolean} [options.attachControls=true] Attach mouse orbit + wheel zoom
 * @param {boolean} [options.autoResize=true] Auto-resize canvas to client size
 * @param {number[]} [options.clearColor=[0.07,0.07,0.07,1]] RGBA
 * @param {number} [options.fovDeg=45]
 * @param {number} [options.near=0.1]
 * @param {number} [options.far=100.0]
 * @param {number} [options.initialRotX=0]
 * @param {number} [options.initialRotY=0]
 * @param {number} [options.initialZoomZ=-9.0] Negative values move away
 */
export function createMegaSwampert(canvas, options = {}) {
  const mat4 = _mat4;

  const {
    attachControls = true,
    autoResize = true,
    clearColor = [0.07, 0.07, 0.07, 1.0],
    fovDeg = 45,
    near = 0.1,
    far = 100.0,
    initialRotX = 0,
    initialRotY = 0,
    initialZoomZ = -9.0,
  } = options;

  const canvasEl =
    typeof canvas === "string" ? document.getElementById(canvas) : canvas;

  if (!canvasEl || !(canvasEl instanceof HTMLCanvasElement)) {
    throw new Error(
      "[MegaSwampert] Invalid canvas. Pass a canvas element or its id."
    );
  }

  const gl = canvasEl.getContext("webgl");
  if (!gl) {
    throw new Error("[MegaSwampert] WebGL not supported on this browser.");
  }

  // Build program
  const program = createProgram(gl, VS_SOURCE, FS_SOURCE);

  const programInfo = {
    program,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(program, "aVertexPosition"),
      vertexColor: gl.getAttribLocation(program, "aVertexColor"),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(program, "uProjectionMatrix"),
      modelViewMatrix: gl.getUniformLocation(program, "uModelViewMatrix"),
    },
  };

  // Init modular parts (assumes global MegaTorso/MegaLegs/MegaArms/MegaHead)
  if (
    !globalThis.MegaTorso ||
    !globalThis.MegaLegs ||
    !globalThis.MegaArms ||
    !globalThis.MegaHead
  ) {
    throw new Error(
      "[MegaSwampert] Missing modules. Ensure mega_torso.js, mega_legs.js, mega_arms.js, mega_head.js are loaded."
    );
  }

  const torso = globalThis.MegaTorso.init(gl);
  const legs = globalThis.MegaLegs.init(gl);
  const arms = globalThis.MegaArms.init(gl);
  const head = globalThis.MegaHead.init(gl);

  // Camera state
  let cameraRotationX = initialRotX;
  let cameraRotationY = initialRotY;
  let cameraZoomZ = initialZoomZ;

  // Interaction state
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  // Animation state
  let animationId = null;
  let lastTime = 0;

  function resize() {
    const w = canvasEl.clientWidth || canvasEl.width;
    const h = canvasEl.clientHeight || canvasEl.height || 1;
    if (canvasEl.width !== w || canvasEl.height !== h) {
      canvasEl.width = w;
      canvasEl.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function onMouseDown(e) {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
  function onMouseUp() {
    isDragging = false;
  }
  function onMouseLeave() {
    isDragging = false;
  }
  function onMouseMove(e) {
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
  }
  function onWheel(e) {
    e.preventDefault();
    cameraZoomZ += e.deltaY * 0.01;
    cameraZoomZ = Math.max(-30.0, Math.min(-4.0, cameraZoomZ));
  }

  function attachInput() {
    if (!attachControls) return;
    canvasEl.addEventListener("mousedown", onMouseDown);
    canvasEl.addEventListener("mouseup", onMouseUp);
    canvasEl.addEventListener("mouseleave", onMouseLeave);
    canvasEl.addEventListener("mousemove", onMouseMove);
    canvasEl.addEventListener("wheel", onWheel, { passive: false });
  }

  function detachInput() {
    canvasEl.removeEventListener("mousedown", onMouseDown);
    canvasEl.removeEventListener("mouseup", onMouseUp);
    canvasEl.removeEventListener("mouseleave", onMouseLeave);
    canvasEl.removeEventListener("mousemove", onMouseMove);
    canvasEl.removeEventListener("wheel", onWheel);
  }

  function drawFrame(nowMs) {
    const now = nowMs * 0.001;
    const dt = now - lastTime;
    lastTime = now;

    if (autoResize) resize();

    gl.clearColor(
      clearColor[0],
      clearColor[1],
      clearColor[2],
      clearColor[3]
    );
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const projectionMatrix = mat4.create();
    const aspect =
      (gl.canvas && gl.canvas.clientWidth / gl.canvas.clientHeight) || 1.0;

    mat4.perspective(
      projectionMatrix,
      (fovDeg * Math.PI) / 180,
      aspect,
      near,
      far
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

    // 1) Torso at origin
    globalThis.MegaTorso.draw(gl, programInfo, torso, view);

    // 2) Head — seated above and slightly forward
    const headRoot = mat4.clone(view);
    mat4.translate(headRoot, headRoot, [0.0, 1.55, 0.8]);
    globalThis.MegaHead.draw(gl, programInfo, head, headRoot);

    // 3) Legs
    globalThis.MegaLegs.draw(gl, programInfo, legs, view);

    // 4) Arms
    globalThis.MegaArms.draw(gl, programInfo, arms, view);

    return dt; // In case caller wants timing
  }

  function loop(now) {
    drawFrame(now);
    animationId = requestAnimationFrame(loop);
  }

  function start() {
    if (animationId != null) return;
    lastTime = 0;
    attachInput();
    animationId = requestAnimationFrame(loop);
  }

  function stop() {
    if (animationId != null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  function renderOnce() {
    // render a single frame (no loop)
    const now = performance.now();
    drawFrame(now);
  }

  function dispose() {
    stop();
    detachInput();
    // Note: If your part modules expose destroy(), call them here.
    // gl.deleteProgram(program); // You can do this if you won't reuse it.
  }

  function setCamera({ rotX, rotY, zoomZ }) {
    if (typeof rotX === "number") cameraRotationX = rotX;
    if (typeof rotY === "number") cameraRotationY = rotY;
    if (typeof zoomZ === "number") cameraZoomZ = zoomZ;
  }

  function setClearColorRGBA(r, g, b, a) {
    clearColor[0] = r;
    clearColor[1] = g;
    clearColor[2] = b;
    clearColor[3] = a;
  }

  return {
    gl,
    canvas: canvasEl,
    start,
    stop,
    renderOnce,
    dispose,
    setCamera,
    setClearColor: setClearColorRGBA,
    // Expose for advanced users
    programInfo,
    parts: { torso, legs, arms, head },
  };
}

/**
 * Convenience: create and immediately start rendering.
 * Returns the same controller as createMegaSwampert.
 */
export function renderMegaSwampert(canvas, options = {}) {
  const scene = createMegaSwampert(canvas, options);
  scene.start();
  return scene;
}