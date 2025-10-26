// Mega Swampert/main.js

import { Sky } from "../environment/sky.js";
import { Ground, createPuddles } from "../environment/ground.js";
import { Water } from "../environment/water.js";
import { Rock } from "../environment/rock.js";
import { Waterfall } from "../environment/waterfall.js";
import { createMegaSwampertModel } from "./mega_swampert_model.js";
import { createEnvShaders } from "../environment/shaders.js";
import { createSwampertPhases } from "./anim/mega_animation.js";
import "./anim/attack_assets.js";

const CANVAS = document.getElementById("mycanvas");
const dpr = window.devicePixelRatio || 1;
CANVAS.width = Math.max(1, Math.floor(window.innerWidth * dpr));
CANVAS.height = Math.max(1, Math.floor(window.innerHeight * dpr));
CANVAS.style.width = window.innerWidth + "px";
CANVAS.style.height = window.innerHeight + "px";

const GL = CANVAS.getContext("webgl", {
  antialias: true,
  alpha: false,
  premultipliedAlpha: false,
});
if (!GL) {
  alert("WebGL not supported");
  throw new Error("WebGL not supported");
}

// GL state
GL.enable(GL.DEPTH_TEST);
GL.depthFunc(GL.LEQUAL);
GL.enable(GL.BLEND);
GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
GL.clearColor(0.5, 0.5, 0.5, 1.0);

// Extra: reduce visual noise on animated surfaces
// GL.enable(GL.CULL_FACE);
GL.cullFace(GL.BACK);

// Build global environment shader
const env = createEnvShaders(GL);
const ENV_PROG = env.program;
const { position: aPos, color: aCol, normal: aNor } = env.attribs;
const {
  Pmatrix: uP,
  Vmatrix: uV,
  Mmatrix: uM,
  normalMatrix: uN,
  viewPos: uViewPos,

  uSunDir,
  uSunColor,

  uSkyUpColor,
  uSkyDownColor,
  uAmbientStrength,

  uBaseColor,
  uReflectivityBase,
  uReflectFlatBias,
  uRoughness,
  uRimStrength,
  uRimColor,

  uUseEnvMap,
  uEnvMap, // reserved if you bind a cubemap later
} = env.uniforms;

// Global lighting defaults (warm sun, brownish ground bounce)
GL.useProgram(ENV_PROG);

// Sun pointing from upper-right-front towards origin (warmer tone)
GL.uniform3f(uSunDir, -0.3, -1.0, -0.15);
GL.uniform3f(uSunColor, 1.0, 0.92, 0.78);

// Hemispheric sky: blue zenith, warm brown ground bounce
GL.uniform3f(uSkyUpColor, 0.58, 0.74, 0.96);
GL.uniform3f(uSkyDownColor, 0.24, 0.2, 0.16);
GL.uniform1f(uAmbientStrength, 0.16);

// Global material/reflection (calmer water, less shimmer)
GL.uniform3f(uBaseColor, 1.0, 1.0, 1.0);
GL.uniform1f(uReflectivityBase, 0.02); // base reflectivity (everything)
GL.uniform1f(uReflectFlatBias, 0.1); // extra for flat surfaces (water/platform)
GL.uniform1f(uRoughness, 0.88); // rougher = softer specular (less flicker)
GL.uniform1f(uRimStrength, 0.08);
GL.uniform3f(uRimColor, 1.0, 1.0, 1.0);

// Env map off by default (procedural fallback sky/ground)
GL.uniform1i(uUseEnvMap, 0);
// If you later load a cubemap, bind to TEXTURE0 and do:
// GL.activeTexture(GL.TEXTURE0); GL.bindTexture(GL.TEXTURE_CUBE_MAP, envTex);
// GL.uniform1i(uEnvMap, 0); GL.uniform1i(uUseEnvMap, 1);

// Camera (FPS) using LIBSMudkip from ../libsMudkip.js
let cameraPosition = [0, 3, 20];
let cameraFront = [0, 0, -1];
let cameraUp = [0, 1, 0];
let yaw = -90.0;
let pitch = 0.0;
const mouseSensitivity = 0.2;
const cameraSpeed = 0.2;
const keys = {};
let dragging = false;
let lastX = 0;
let lastY = 0;

let PROJ = LIBSMudkip.get_projection(
  40,
  CANVAS.width / CANVAS.height,
  0.1,
  800
);

function updateCameraFront() {
  const yawRad = (yaw * Math.PI) / 180;
  const pitchRad = (pitch * Math.PI) / 180;
  cameraFront[0] = Math.cos(yawRad) * Math.cos(pitchRad);
  cameraFront[1] = Math.sin(pitchRad);
  cameraFront[2] = Math.sin(yawRad) * Math.cos(pitchRad);
  const n = LIBSMudkip.normalize(cameraFront);
  cameraFront[0] = n[0];
  cameraFront[1] = n[1];
  cameraFront[2] = n[2];
}
function updateFPS() {
  const s = cameraSpeed;
  if (keys["w"]) {
    cameraPosition[0] += cameraFront[0] * s;
    cameraPosition[1] += cameraFront[1] * s;
    cameraPosition[2] += cameraFront[2] * s;
  }
  if (keys["s"]) {
    cameraPosition[0] -= cameraFront[0] * s;
    cameraPosition[1] -= cameraFront[1] * s;
    cameraPosition[2] -= cameraFront[2] * s;
  }
  if (keys["a"]) {
    const right = LIBSMudkip.normalize(LIBSMudkip.cross(cameraFront, cameraUp));
    cameraPosition[0] -= right[0] * s;
    cameraPosition[1] -= right[1] * s;
    cameraPosition[2] -= right[2] * s;
  }
  if (keys["d"]) {
    const right = LIBSMudkip.normalize(LIBSMudkip.cross(cameraFront, cameraUp));
    cameraPosition[0] += right[0] * s;
    cameraPosition[1] += right[1] * s;
    cameraPosition[2] += right[2] * s;
  }
  if (keys[" "]) cameraPosition[1] += s;
//   if (keys["shift"]) cameraPosition[1] -= s;
}

CANVAS.addEventListener("mousedown", (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  CANVAS.style.cursor = "grabbing";
});
CANVAS.addEventListener("mouseup", () => {
  dragging = false;
  CANVAS.style.cursor = "grab";
});
CANVAS.addEventListener("mouseleave", () => {
  dragging = false;
  CANVAS.style.cursor = "grab";
});
CANVAS.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  yaw += dx * mouseSensitivity;
  pitch -= dy * mouseSensitivity;
  pitch = Math.max(-89, Math.min(89, pitch));
  lastX = e.clientX;
  lastY = e.clientY;
  updateCameraFront();
});
CANVAS.style.cursor = "grab";
window.addEventListener("keydown", (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));
window.addEventListener("resize", () => {
  const d = window.devicePixelRatio || 1;
  CANVAS.width = Math.max(1, Math.floor(window.innerWidth * d));
  CANVAS.height = Math.max(1, Math.floor(window.innerHeight * d));
  CANVAS.style.width = window.innerWidth + "px";
  CANVAS.style.height = window.innerHeight + "px";
  GL.viewport(0, 0, CANVAS.width, CANVAS.height);
  PROJ = LIBSMudkip.get_projection(
    40,
    CANVAS.width / CANVAS.height,
    0.1,
    800
  );
});
updateCameraFront();

// Environment instances (note: texture path is one level up)
const sky = new Sky(GL, { texturePath: "../environment/skybox.jpg" });
sky.setup();

const puddles = createPuddles(35, 35, 12345, {
  minRadius: 0.4,
  maxRadius: 1.2,
  minDistFromCenter: 1.5,
  maxDistFromCenter: 35 * 0.95,
  minDistBetweenPuddles: 1.0,
});

const ground = new Ground(GL, ENV_PROG, aPos, aCol, aNor, uM, {
  radius: 35,
  cliffHeight: 1.5,
  segments: 64,
  noiseAmplitude: 0.05,
  puddles,
});
ground.setup();

const water = new Water(GL, ENV_PROG, aPos, aCol, aNor, uM, {
  size: 100,
  waterLevel: -2.0,
  waveAmplitude: 0.58,
  segments: 64,
});
water.setup();

const rocks = new Rock(GL, ENV_PROG, aPos, aCol, aNor, uM, {
  groundRadius: 35,
  numClusters: 6,
  numScattered: 20,
  puddles,
  seed: 98765,
});
rocks.setup();

const waterfall = new Waterfall(GL, ENV_PROG, aPos, aCol, aNor, uM, {
  position: [0, 0, -25],
  width: 22,
  height: 12,
  waterLevel: -2.0,
  numStreams: 15,
  streamWidth: 5.8,
  streamSpeed: 2.5,
  seed: 54321,
});
waterfall.setup();

// Mega Swampert (group root)
const mega = createMegaSwampertModel(GL, {
  position: [-3, 5.4, 0],
  rotationEuler: [0, Math.PI * 0.08, 0],
  scale: [1, 1, 1],
  headOffset: [0.0, 1.55, 0.8],
});
const atk = AttackAssets.init(GL, {
  beamCore: { radius: 0.32 },          // bigger base ellipsoid mesh
  coil: { helixRadius: 0.56, tubeRadius: 0.07 }, // wider coil + thicker tube
});
const atkPose = AttackAssets.createPose();
const atkRig = AttackAssets.makePoseAPI(atkPose);

// Match global sky and enable Fresnel reflections on the model
mega.setReflection({
  reflectivity: 0.0, // 0..1 how reflective the body is
  rimStrength: 0.2, // 0..1 rim light
  skyUpColor: [0.58, 0.74, 0.96], // same as uSkyUpColor
  skyDownColor: [0.24, 0.2, 0.16], // same as uSkyDownColor
});

// Animation controller (Phase 0 idle to start)
const rigs = mega.getRigs();
const phases = createSwampertPhases(rigs, atkRig);
phases.setPhase("attackAll");
let lastTime = 0;

// Matrices via gl-matrix for sky and Mega view
const mat4 = (globalThis.glMatrix && glMatrix.mat4) || globalThis.mat4;
const MODEL_I = mat4.create();

function animate(time) {
  GL.viewport(0, 0, CANVAS.width, CANVAS.height);
  GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

  updateFPS();

  const lookAt = [
    cameraPosition[0] + cameraFront[0],
    cameraPosition[1] + cameraFront[1],
    cameraPosition[2] + cameraFront[2],
  ];
  const viewMatrix = LIBSMudkip.lookAt(cameraPosition, lookAt, cameraUp);

  // Use global env program and set shared uniforms once per frame
  GL.useProgram(ENV_PROG);
  GL.uniformMatrix4fv(uP, false, PROJ);
  GL.uniformMatrix4fv(uV, false, viewMatrix);
  GL.uniform3f(uViewPos, cameraPosition[0], cameraPosition[1], cameraPosition[2]);

  // Identity normal matrix here; env objects can upload their own if needed
  const normalI = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  GL.uniformMatrix3fv(uN, false, normalI);

  // Ensure attributes are enabled (safety)
  GL.enableVertexAttribArray(aPos);
  GL.enableVertexAttribArray(aCol);
  GL.enableVertexAttribArray(aNor);

  // Sky (slow rotation)
  const skyModel = mat4.create();
  mat4.rotateY(skyModel, skyModel, time * 0.00002);
  sky.render(PROJ, viewMatrix, skyModel);

  // Environment (global lighting, no per-object material)
  ground.render(MODEL_I);
  rocks.render(MODEL_I);
  water.updateWaves(time);
  water.render(MODEL_I);
  waterfall.updateAnimation(time);
  waterfall.render(MODEL_I);

  // Update Swampert animation before drawing
  const dt = lastTime === 0 ? 0 : (time - lastTime) * 0.001;
  lastTime = time;
// Feed head anchors (world position, forward, right) each frame
const HEAD_OFFSET = [0.0, 1.55, 0.8];
const M = mega.getModelMatrix();

// Position = M * headOffset
const headPos = [
  M[12] + M[0] * HEAD_OFFSET[0] + M[4] * HEAD_OFFSET[1] + M[8] * HEAD_OFFSET[2],
  M[13] + M[1] * HEAD_OFFSET[0] + M[5] * HEAD_OFFSET[1] + M[9] * HEAD_OFFSET[2],
  M[14] + M[2] * HEAD_OFFSET[0] + M[6] * HEAD_OFFSET[1] + M[10] * HEAD_OFFSET[2],
];

// Basis vectors from model matrix columns
function norm(v) {
  const L = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / L, v[1] / L, v[2] / L];
}
const headFwd = norm([M[8], M[9], M[10]]); // +Z
const headRight = norm([M[0], M[1], M[2]]); // +X

phases.setAnchors({ headPos, headFwd, headRight });

phases.update(dt);

  // Draw Mega first (binds shader, sets projection and camera)
mega.draw(PROJ, viewMatrix);

// Now draw attack assets with the same shader state
// (optional safety; Mega.draw already bound it)
GL.useProgram(mega.programInfo.program);
AttackAssets.draw(GL, mega.programInfo, atk, viewMatrix, undefined, atkPose);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);