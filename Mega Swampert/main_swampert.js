// Mega Swampert/main_swampert.js

import { Sky } from "../environment/sky.js";
import { Ground, createPuddles } from "../environment/ground.js";
import { Water } from "../environment/water.js";
import { Rock } from "../environment/rock.js";
import { Waterfall } from "../environment/waterfall.js";
import { PalmTree } from "../environment/palm_tree.js"; // NEW IMPORT
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
  uSunDir, uSunColor,
  uSkyUpColor, uSkyDownColor, uAmbientStrength,
  uBaseColor, uReflectivityBase, uReflectFlatBias, uRoughness,
  uRimStrength, uRimColor,
  uUseEnvMap, uEnvMap, 
} = env.uniforms;

GL.useProgram(ENV_PROG);
GL.uniform3f(uSunDir, -0.3, -1.0, -0.15);
GL.uniform3f(uSunColor, 1.0, 0.92, 0.78);
GL.uniform3f(uSkyUpColor, 0.58, 0.74, 0.96);
GL.uniform3f(uSkyDownColor, 0.24, 0.2, 0.16);
GL.uniform1f(uAmbientStrength, 0.16);
GL.uniform3f(uBaseColor, 1.0, 1.0, 1.0);
GL.uniform1f(uReflectivityBase, 0.02);
GL.uniform1f(uReflectFlatBias, 0.1); 
GL.uniform1f(uRoughness, 0.88); 
GL.uniform1f(uRimStrength, 0.08);
GL.uniform3f(uRimColor, 1.0, 1.0, 1.0);
GL.uniform1i(uUseEnvMap, 0);

// Camera
let cameraPosition = [0, 15, 80]; // Zoomed out further for big island
let cameraFront = [0, 0, -1];
let cameraUp = [0, 1, 0];
let yaw = -90.0;
let pitch = -12.0;
const mouseSensitivity = 0.2;
const cameraSpeed = 0.8; 
const keys = {};
let dragging = false;
let lastX = 0;
let lastY = 0;

let PROJ = LIBSMudkip.get_projection(40, CANVAS.width / CANVAS.height, 0.1, 1200);

function updateCameraFront() {
  const yawRad = (yaw * Math.PI) / 180;
  const pitchRad = (pitch * Math.PI) / 180;
  cameraFront[0] = Math.cos(yawRad) * Math.cos(pitchRad);
  cameraFront[1] = Math.sin(pitchRad);
  cameraFront[2] = Math.sin(yawRad) * Math.cos(pitchRad);
  const n = LIBSMudkip.normalize(cameraFront);
  cameraFront[0] = n[0]; cameraFront[1] = n[1]; cameraFront[2] = n[2];
}
function updateFPS() {
  const s = cameraSpeed;
  if (keys["w"]) { cameraPosition[0] += cameraFront[0] * s; cameraPosition[1] += cameraFront[1] * s; cameraPosition[2] += cameraFront[2] * s; }
  if (keys["s"]) { cameraPosition[0] -= cameraFront[0] * s; cameraPosition[1] -= cameraFront[1] * s; cameraPosition[2] -= cameraFront[2] * s; }
  if (keys["a"]) { const right = LIBSMudkip.normalize(LIBSMudkip.cross(cameraFront, cameraUp)); cameraPosition[0] -= right[0] * s; cameraPosition[1] -= right[1] * s; cameraPosition[2] -= right[2] * s; }
  if (keys["d"]) { const right = LIBSMudkip.normalize(LIBSMudkip.cross(cameraFront, cameraUp)); cameraPosition[0] += right[0] * s; cameraPosition[1] += right[1] * s; cameraPosition[2] += right[2] * s; }
  if (keys[" "]) cameraPosition[1] += s;
}

CANVAS.addEventListener("mousedown", (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; CANVAS.style.cursor = "grabbing"; });
CANVAS.addEventListener("mouseup", () => { dragging = false; CANVAS.style.cursor = "grab"; });
CANVAS.addEventListener("mouseleave", () => { dragging = false; CANVAS.style.cursor = "grab"; });
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
  PROJ = LIBSMudkip.get_projection(40, CANVAS.width / CANVAS.height, 0.1, 1200);
});
updateCameraFront();

// --- 1. SKY ---
const sky = new Sky(GL, { texturePath: "../environment/skybox.jpg" });
sky.setup();

// --- 2. BIGGER ISLAND (Radius 65) ---
// Puddles must now cover 65 radius
const puddles = createPuddles(60, 65, 12345, {
  minRadius: 1.5,
  maxRadius: 4.0,
  minDistFromCenter: 3.0,
  maxDistFromCenter: 65 * 0.85, 
  minDistBetweenPuddles: 2.5,
});

const ground = new Ground(GL, ENV_PROG, aPos, aCol, aNor, uM, {
  radius: 65,           // EXPANDED
  cliffHeight: 2.5,
  segments: 128,       
  noiseAmplitude: 0.7,  
  topColor: [0.82, 0.74, 0.55], 
  puddles,
});
ground.setup();

// --- 3. BIGGER WATER ---
const water = new Water(GL, ENV_PROG, aPos, aCol, aNor, uM, {
  size: 900,            // HUGE
  waterLevel: -2.2,
  waveAmplitude: 0.35,
  waveScale: 0.15,      
  segments: 128,
  shallowColor: [0.2, 0.7, 0.85],
  deepColor: [0.05, 0.2, 0.45],
});
water.setup();

// --- 4. MORE ROCKS (Radius 65) ---
const rocks = new Rock(GL, ENV_PROG, aPos, aCol, aNor, uM, {
  groundRadius: 65,     // MATCH GROUND
  numClusters: 18,      // MORE CLUSTERS
  numScattered: 80,     // MORE ROCKS (Doubled)
  puddles,
  seed: 98765,
});
rocks.setup();

// --- 5. TREES (New) ---
const trees = new PalmTree(GL, ENV_PROG, aPos, aCol, aNor, uM, {
  islandRadius: 65,
  numTrees: 12,         // Added trees
  seed: 456
});

// --- 6. MOVED WATERFALL ---
const waterfall = new Waterfall(GL, ENV_PROG, aPos, aCol, aNor, uM, {
  centerZ: -80,         // PUSHED BACK to accommodate island
  width: 200,           // WIDER
  height: 55,           // TALLER
  curveDepth: 45,      
  waterLevel: -2.2,
  numStreams: 9,
  streamWidth: 4.0,
  seed: 54321,
});
waterfall.setup();

// --- 7. SWAMPERT ---
const mega = createMegaSwampertModel(GL, {
  position: [-3, 5.4, 0],
  rotationEuler: [0, Math.PI * 0.08, 0],
  scale: [1, 1, 1],
  headOffset: [0.0, 1.55, 0.8],
});
const atk = AttackAssets.init(GL, {
  beamCore: { radius: 0.32 },          
  coil: { helixRadius: 0.56, tubeRadius: 0.07 }, 
});
const atkPose = AttackAssets.createPose();
const atkRig = AttackAssets.makePoseAPI(atkPose);

mega.setReflection({
  reflectivity: 0.0, 
  rimStrength: 0.2, 
  skyUpColor: [0.58, 0.74, 0.96], 
  skyDownColor: [0.24, 0.2, 0.16], 
});

const rigs = mega.getRigs();
const phases = createSwampertPhases(rigs, atkRig);
phases.setPhase("idle");
let lastTime = 0;

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

  GL.useProgram(ENV_PROG);
  GL.uniformMatrix4fv(uP, false, PROJ);
  GL.uniformMatrix4fv(uV, false, viewMatrix);
  GL.uniform3f(uViewPos, cameraPosition[0], cameraPosition[1], cameraPosition[2]);

  const normalI = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  GL.uniformMatrix3fv(uN, false, normalI);

  GL.enableVertexAttribArray(aPos);
  GL.enableVertexAttribArray(aCol);
  GL.enableVertexAttribArray(aNor);

  // Render Scene
  const skyModel = mat4.create();
  mat4.rotateY(skyModel, skyModel, time * 0.00002);
  sky.render(PROJ, viewMatrix, skyModel);

  ground.render(MODEL_I);
  rocks.render(MODEL_I);
  trees.render(MODEL_I); // RENDER TREES
  water.updateWaves(time);
  water.render(MODEL_I);
  waterfall.updateAnimation(time);
  waterfall.render(MODEL_I);

  const dt = lastTime === 0 ? 0 : (time - lastTime) * 0.001;
  lastTime = time;
  
  const HEAD_OFFSET = [0.0, 1.55, 0.8];
  const M = mega.getModelMatrix();

  const headPos = [
    M[12] + M[0] * HEAD_OFFSET[0] + M[4] * HEAD_OFFSET[1] + M[8] * HEAD_OFFSET[2],
    M[13] + M[1] * HEAD_OFFSET[0] + M[5] * HEAD_OFFSET[1] + M[9] * HEAD_OFFSET[2],
    M[14] + M[2] * HEAD_OFFSET[0] + M[6] * HEAD_OFFSET[1] + M[10] * HEAD_OFFSET[2],
  ];

  function norm(v) {
    const L = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / L, v[1] / L, v[2] / L];
  }
  const headFwd = norm([M[8], M[9], M[10]]); 
  const headRight = norm([M[0], M[1], M[2]]); 

  phases.setAnchors({ headPos, headFwd, headRight });
  phases.update(dt);

  mega.draw(PROJ, viewMatrix);
  GL.useProgram(mega.programInfo.program);
  AttackAssets.draw(GL, mega.programInfo, atk, viewMatrix, undefined, atkPose);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);