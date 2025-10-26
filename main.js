// main.js - COMBINED MUDKIP & MARSHTOMP WITH INDEPENDENT SHADERS
// Marshtomp: Static with TPS camera, transparent shield
// Mudkip: With environment and FPS camera

import { createMudkipParts } from './Mudkip/mudkip-part.js';
import { setupMudkipAnimation } from './Mudkip/mudkip-animasi.js';
import { createMarshtomp } from './marshtompModel.js';
import { MarshtompAnimator } from './marshtompAnimation.js';
import { Sky } from './environment/sky.js';
import { Ground, createPuddles } from './environment/ground.js';
import { Water } from './environment/water.js';
import { Rock } from './environment/rock.js';
import { Waterfall } from './environment/waterfall.js';
import {
  buildHeadGrouped, drawNode, LIBSSwampert,
  swampertBallGroupRef, swampertRockPivotRef, swampertRockNodeRef
} from './swampert/swampert/swampert.js';
import { generateParaboloid, makeMesh } from './swampert/swampert/swampert.js';

// === helper: rotate around arbitrary axis (Rodrigues) ===
function rotateAroundAxis(m, axis, angle) {
  let [x, y, z] = axis;
  const len = Math.hypot(x, y, z) || 1;
  x /= len; y /= len; z /= len;

  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;

  const R = new Float32Array([
    t*x*x + c,     t*x*y + s*z,  t*x*z - s*y,  0,
    t*x*y - s*z,   t*y*y + c,    t*y*z + s*x,  0,
    t*x*z + s*y,   t*y*z - s*x,  t*z*z + c,    0,
    0,             0,            0,            1
  ]);

  // m = m * R
  return LIBSSwampert.multiply(m, m, R);
}


function main() {

  // === DYNAMIC WATER COLOR (like Water.js) ===
  function getDynamicWaterColor(x, z, time, shallowColor = [0.40, 0.80, 1.00], deepColor = [0.004, 0.482, 0.573]) {
    const dist = Math.sqrt(x*x + z*z);
    const t = Math.min(dist / 3.0, 1.0); // radius kecil untuk paraboloid
    const mix = t * t;

    // gradien biru muda → biru tua
    const baseColor = [
      shallowColor[0] * (1 - mix) + deepColor[0] * mix,
      shallowColor[1] * (1 - mix) + deepColor[1] * mix,
      shallowColor[2] * (1 - mix) + deepColor[2] * mix
    ];

  // variasi halus seperti gelombang
  const wave = Math.sin(time * 0.002 + dist * 3.0) * 0.05;
  return [
    baseColor[0] + wave,
    baseColor[1] + wave,
    baseColor[2] + wave
  ];
}


  var CANVAS = document.getElementById("mycanvas");
  const dpr = window.devicePixelRatio || 1;
  CANVAS.width = window.innerWidth * dpr;
  CANVAS.height = window.innerHeight * dpr;
  CANVAS.style.width = window.innerWidth + 'px';
  CANVAS.style.height = window.innerHeight + 'px';

  var GL;
  try {
    GL = CANVAS.getContext("webgl", {
      antialias: true,
      alpha: false,
      premultipliedAlpha: false
    });
  } catch (e) {
    alert("WebGL context cannot be initialized");
    return false;
  }

  console.log('=== LIBS Check ===');
  console.log('LIBSMudkip:', typeof LIBSMudkip !== 'undefined' ? '✓ Loaded' : '✗ Not Found');
  console.log('LIBSMarshtomp:', typeof LIBSMarshtomp !== 'undefined' ? '✓ Loaded' : '✗ Not Found');

  var compile_shader = function (source, type, typeString) {
    var shader = GL.createShader(type);
    GL.shaderSource(shader, source);
    GL.compileShader(shader);
    if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
      console.error("ERROR IN " + typeString + " SHADER:", GL.getShaderInfoLog(shader));
      alert("ERROR IN " + typeString + " SHADER: " + GL.getShaderInfoLog(shader));
      return false;
    }
    return shader;
  };

  // ==================== MUDKIP SHADER PROGRAM ====================
  
  var shader_vertex_mudkip = `
    attribute vec3 position;
    attribute vec3 color;
    attribute vec3 normal;
    uniform mat4 Pmatrix;
    uniform mat4 Vmatrix;
    uniform mat4 Mmatrix;
    uniform mat3 normalMatrix;
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vFragPos;
    void main(void) {
      vec4 worldPos = Mmatrix * vec4(position, 1.0);
      gl_Position = Pmatrix * Vmatrix * worldPos;
      vColor = color;
      vFragPos = worldPos.xyz;
      vNormal = normalize(normalMatrix * normal);
    }`;

  var shader_fragment_mudkip = `
    precision mediump float;
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vFragPos;
    uniform vec3 lightDir1;
    uniform vec3 lightCol1;
    uniform vec3 lightDir2;
    uniform vec3 lightCol2;
    uniform vec3 viewPos;
    uniform float uAmbient;
    uniform float uDiffuse;
    uniform float uSpecular;
    uniform float uShininess;
    void main(void) {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(viewPos - vFragPos);
      vec3 L1 = normalize(-lightDir1);
      float diff1 = clamp(dot(N, L1) * 0.5 + 0.5, 0.0, 1.0);
      vec3 H1 = normalize(L1 + V);
      float spec1 = pow(max(dot(N, H1), 0.0), uShininess);
      vec3 L2 = normalize(-lightDir2);
      float diff2 = clamp(dot(N, L2) * 0.5 + 0.5, 0.0, 1.0);
      vec3 H2 = normalize(L2 + V);
      float spec2 = pow(max(dot(N, H2), 0.0), uShininess);
      vec3 ambient = uAmbient * vec3(1.0);
      vec3 diffuse = uDiffuse * (diff1 * lightCol1 + 0.5 * diff2 * lightCol2);
      vec3 specular = uSpecular * (spec1 * lightCol1 + 0.5 * spec2 * lightCol2);
      vec3 lighting = ambient + diffuse + specular;
      vec3 finalColor = vColor * lighting;
      gl_FragColor = vec4(finalColor, 1.0);
    }`;

  var shader_vertex_mudkip_compiled = compile_shader(shader_vertex_mudkip, GL.VERTEX_SHADER, "MUDKIP VERTEX");
  var shader_fragment_mudkip_compiled = compile_shader(shader_fragment_mudkip, GL.FRAGMENT_SHADER, "MUDKIP FRAGMENT");
  
  var SHADER_PROGRAM_MUDKIP = GL.createProgram();
  GL.attachShader(SHADER_PROGRAM_MUDKIP, shader_vertex_mudkip_compiled);
  GL.attachShader(SHADER_PROGRAM_MUDKIP, shader_fragment_mudkip_compiled);
  GL.linkProgram(SHADER_PROGRAM_MUDKIP);

  var mudkip_position = GL.getAttribLocation(SHADER_PROGRAM_MUDKIP, "position");
  var mudkip_color = GL.getAttribLocation(SHADER_PROGRAM_MUDKIP, "color");
  var mudkip_normal = GL.getAttribLocation(SHADER_PROGRAM_MUDKIP, "normal");
  var mudkip_Pmatrix = GL.getUniformLocation(SHADER_PROGRAM_MUDKIP, "Pmatrix");
  var mudkip_Vmatrix = GL.getUniformLocation(SHADER_PROGRAM_MUDKIP, "Vmatrix");
  var mudkip_Mmatrix = GL.getUniformLocation(SHADER_PROGRAM_MUDKIP, "Mmatrix");
  var mudkip_normalMatrix = GL.getUniformLocation(SHADER_PROGRAM_MUDKIP, "normalMatrix");
  var mudkip_viewPos = GL.getUniformLocation(SHADER_PROGRAM_MUDKIP, "viewPos");
  var mudkip_lightDir1 = GL.getUniformLocation(SHADER_PROGRAM_MUDKIP, "lightDir1");
  var mudkip_lightCol1 = GL.getUniformLocation(SHADER_PROGRAM_MUDKIP, "lightCol1");
  var mudkip_lightDir2 = GL.getUniformLocation(SHADER_PROGRAM_MUDKIP, "lightDir2");
  var mudkip_lightCol2 = GL.getUniformLocation(SHADER_PROGRAM_MUDKIP, "lightCol2");
  var mudkip_ambient = GL.getUniformLocation(SHADER_PROGRAM_MUDKIP, "uAmbient");
  var mudkip_diffuse = GL.getUniformLocation(SHADER_PROGRAM_MUDKIP, "uDiffuse");
  var mudkip_specular = GL.getUniformLocation(SHADER_PROGRAM_MUDKIP, "uSpecular");
  var mudkip_shininess = GL.getUniformLocation(SHADER_PROGRAM_MUDKIP, "uShininess");

  // ==================== MARSHTOMP SHADER PROGRAM (WITH TRANSPARENCY) ====================
  
  var shader_vertex_marshtomp = `
    attribute vec3 position;
    attribute vec3 normal;
    uniform mat4 Pmatrix, Vmatrix, Mmatrix, Nmatrix;
    varying vec3 v_normal, v_surfaceToLight, v_surfaceToView;
    uniform vec3 u_lightPosition, u_cameraPosition;
    void main(void){
      vec3 worldPosition = (Mmatrix * vec4(position,1.0)).xyz;
      gl_Position = Pmatrix * Vmatrix * vec4(worldPosition,1.0);
      v_normal = (Nmatrix * vec4(normal,0.0)).xyz;
      v_surfaceToLight = u_lightPosition - worldPosition;
      v_surfaceToView  = u_cameraPosition - worldPosition;
    }`;

  var shader_fragment_marshtomp = `
   precision mediump float;
    varying vec3 v_normal, v_surfaceToLight, v_surfaceToView;
    uniform vec4 u_color;
    uniform float u_shininess;
    void main(void){
        vec3 n = normalize(v_normal);
        vec3 l = normalize(v_surfaceToLight);
        vec3 v = normalize(v_surfaceToView);
        vec3 h = normalize(l + v);
        float ndotl = max(dot(n,l), 0.0);
        float spec  = pow(max(dot(n,h), 0.0), u_shininess);
        float rim   = pow(1.0 - max(dot(n,v), 0.0), 2.0) * 0.35;
        vec3 ambient  = 0.50 * u_color.rgb;
        vec3 diffuse  = u_color.rgb * ndotl;
        vec3 specular = vec3(1.5) * spec;
        vec3 linear   = ambient + diffuse + specular + u_color.rgb * rim;
        vec3 srgb = pow(clamp(linear, 0.0, 1.0), vec3(1.0/2.2));
        gl_FragColor = vec4(srgb, u_color.a);
        if(u_color.a < 0.01) discard;
    }`;

  var shader_vertex_marshtomp_compiled = compile_shader(shader_vertex_marshtomp, GL.VERTEX_SHADER, "MARSHTOMP VERTEX");
  var shader_fragment_marshtomp_compiled = compile_shader(shader_fragment_marshtomp, GL.FRAGMENT_SHADER, "MARSHTOMP FRAGMENT");
  
  var SHADER_PROGRAM_MARSHTOMP = GL.createProgram();
  GL.attachShader(SHADER_PROGRAM_MARSHTOMP, shader_vertex_marshtomp_compiled);
  GL.attachShader(SHADER_PROGRAM_MARSHTOMP, shader_fragment_marshtomp_compiled);
  GL.linkProgram(SHADER_PROGRAM_MARSHTOMP);

  var marshtomp_position = GL.getAttribLocation(SHADER_PROGRAM_MARSHTOMP, "position");
  var marshtomp_normal = GL.getAttribLocation(SHADER_PROGRAM_MARSHTOMP, "normal");
  var marshtomp_Pmatrix = GL.getUniformLocation(SHADER_PROGRAM_MARSHTOMP, "Pmatrix");
  var marshtomp_Vmatrix = GL.getUniformLocation(SHADER_PROGRAM_MARSHTOMP, "Vmatrix");
  var marshtomp_Mmatrix = GL.getUniformLocation(SHADER_PROGRAM_MARSHTOMP, "Mmatrix");
  var marshtomp_Nmatrix = GL.getUniformLocation(SHADER_PROGRAM_MARSHTOMP, "Nmatrix");
  var marshtomp_u_color = GL.getUniformLocation(SHADER_PROGRAM_MARSHTOMP, "u_color");
  var marshtomp_shininess = GL.getUniformLocation(SHADER_PROGRAM_MARSHTOMP, "u_shininess");
  var marshtomp_lightPosition = GL.getUniformLocation(SHADER_PROGRAM_MARSHTOMP, "u_lightPosition");
  var marshtomp_cameraPosition = GL.getUniformLocation(SHADER_PROGRAM_MARSHTOMP, "u_cameraPosition");
  var marshtomp_globalShininess = GL.getUniformLocation(SHADER_PROGRAM_MARSHTOMP, "u_globalShininess");
  var marshtomp_useGlobalShininess = GL.getUniformLocation(SHADER_PROGRAM_MARSHTOMP, "u_useGlobalShininess");

  // ==================== CREATE MUDKIP ====================
  console.log('Creating Mudkip...');
  
  GL.useProgram(SHADER_PROGRAM_MUDKIP);
  GL.enableVertexAttribArray(mudkip_position);
  GL.enableVertexAttribArray(mudkip_color);
  GL.enableVertexAttribArray(mudkip_normal);

  GL.uniform3f(mudkip_lightDir1, -0.35, 0.80, -0.55);
  GL.uniform3f(mudkip_lightCol1, 1.00, 1.00, 1.00);
  GL.uniform3f(mudkip_lightDir2, 0.40, -0.20, 0.60);
  GL.uniform3f(mudkip_lightCol2, 0.70, 0.80, 1.00);
  GL.uniform1f(mudkip_ambient, 0.45);
  GL.uniform1f(mudkip_diffuse, 0.70);
  GL.uniform1f(mudkip_specular, 0.20);
  GL.uniform1f(mudkip_shininess, 22.0);

  const mudkip = createMudkipParts(GL, SHADER_PROGRAM_MUDKIP, mudkip_position, mudkip_color, mudkip_normal, mudkip_Mmatrix);
  mudkip.CameraRig.setup();
  const animMudkip = setupMudkipAnimation(mudkip);

  LIBSMudkip.set_I4(mudkip.MudkipRig.POSITION_MATRIX);
  LIBSMudkip.translateX(mudkip.MudkipRig.POSITION_MATRIX, -8);

  // ==================== CREATE MARSHTOMP (STATIC, NO MOVEMENT) ====================
  console.log('Creating Marshtomp (static position)...');
  
  GL.useProgram(SHADER_PROGRAM_MARSHTOMP);
  GL.enableVertexAttribArray(marshtomp_position);
  GL.enableVertexAttribArray(marshtomp_useGlobalShininess);
  GL.enableVertexAttribArray(marshtomp_normal);

  const locationsMarshtomp = {
    _Pmatrix: marshtomp_Pmatrix,
    _Vmatrix: marshtomp_Vmatrix,
    _Mmatrix: marshtomp_Mmatrix,
    _Nmatrix: marshtomp_Nmatrix,
    _u_color: marshtomp_u_color,
    _shininess: marshtomp_shininess,
    _lightPosition: marshtomp_lightPosition,
    _cameraPosition: marshtomp_cameraPosition,
    _position: marshtomp_position,
    _normal: marshtomp_normal,
  };

  const { rootObject: marshtomp, animatableParts } = createMarshtomp(
    GL, 
    LIBSMarshtomp,
    SHADER_PROGRAM_MARSHTOMP, 
    locationsMarshtomp
  );

  const animMarshtomp = new MarshtompAnimator(LIBSMarshtomp, animatableParts);
  
  // ✅ Set static position - tidak bergerak kemana-mana
  animMarshtomp.position = [8, 1.5, 0];
  animMarshtomp.badanBaseY = 1.5;
  
  // ✅ Disable movement - animasi idle terus di tempat
  animMarshtomp.RunSpeed = 2;  // No forward movement
  animMarshtomp.JumpBackDist = 6;  // No backward jump

// ==================== SWAMPERT SHADER PROGRAM (SIMPLE) ====================
var shader_vertex_swampert = `
  attribute vec3 position;
  attribute vec3 color;
  uniform mat4 Pmatrix, Vmatrix, Mmatrix;
  varying vec3 vColor;
  void main(){
    gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position,1.0);
    vColor = color;
  }`;

var shader_fragment_swampert = `
  precision mediump float;
  varying vec3 vColor;
  void main(){ gl_FragColor = vec4(vColor,1.0); }`;

var shader_vertex_swampert_compiled = compile_shader(shader_vertex_swampert, GL.VERTEX_SHADER, "SWAMPERT VERTEX");
var shader_fragment_swampert_compiled = compile_shader(shader_fragment_swampert, GL.FRAGMENT_SHADER, "SWAMPERT FRAGMENT");

var SHADER_PROGRAM_SWAMPERT = GL.createProgram();
GL.attachShader(SHADER_PROGRAM_SWAMPERT, shader_vertex_swampert_compiled);
GL.attachShader(SHADER_PROGRAM_SWAMPERT, shader_fragment_swampert_compiled);
GL.linkProgram(SHADER_PROGRAM_SWAMPERT);

// ⭐ CEK LINK STATUS ⭐
if (!GL.getProgramParameter(SHADER_PROGRAM_SWAMPERT, GL.LINK_STATUS)) {
    console.error("SWAMPERT SHADER LINK ERROR:", GL.getProgramInfoLog(SHADER_PROGRAM_SWAMPERT));
}

var swampert_position = GL.getAttribLocation(SHADER_PROGRAM_SWAMPERT, "position");
var swampert_color = GL.getAttribLocation(SHADER_PROGRAM_SWAMPERT, "color");
var swampert_Pmatrix = GL.getUniformLocation(SHADER_PROGRAM_SWAMPERT, "Pmatrix");
var swampert_Vmatrix = GL.getUniformLocation(SHADER_PROGRAM_SWAMPERT, "Vmatrix");
var swampert_Mmatrix = GL.getUniformLocation(SHADER_PROGRAM_SWAMPERT, "Mmatrix");

// ==================== CREATE SWAMPERT ====================
console.log('Creating Swampert...');

// ⭐ GUNAKAN SWAMPERT LIBS (BUKAN MUDPIK LIBS) ⭐
const swampertRoot = buildHeadGrouped(GL);

console.log("Ball reference:", swampertBallGroupRef);

// Posisikan Swampert di scene (misalnya di tengah)
const SWAMPERT_MATRIX = LIBSSwampert.get_I4();  // ⭐ GANTI LIBS -> LIBSSwampert
LIBSSwampert.translate(SWAMPERT_MATRIX, [-8, 3, 0]); // ⭐ GANTI LIBS -> LIBSSwampert

// ⭐ SIMPAN UNTUK RENDER LOOP ⭐
let swampertAnimation = {
    active: true,
    position: 1.0,           // Posisi awal
    speed: 0.05,             // Lebih cepat
    maxDistance: 8.0,        // Jarak maksimum sebelum meledak
    state: "MOVING",         // "MOVING" atau "EXPLODING"
    explosionTimer: 0,       // Timer untuk efek ledakan
    explosionDuration: 30    // Durasi ledakan (frames)
};

// === PARABOLOID WATER SURFACE (STATIC) ===
// Import dari swampert.js sudah otomatis (pastikan sudah ditambahkan di export)
// Buat paraboloid seperti permukaan air berbentuk mangkuk
const waterGeo = generateParaboloid(3.0, 1.2, 32, 32, [0.2, 0.5, 0.9]);
// Tambahkan warna dinamis awal
waterGeo.dynamicColor = [0.4, 0.8, 1.0];
const waterMesh = makeMesh(GL, waterGeo.vertices, waterGeo.faces);
const waterNode = {
  mesh: waterMesh,
  local: LIBSSwampert.get_I4(),
  children: []
};

// ✅ Rotasi agar paraboloid menghadap ke atas (horizontal)
LIBSSwampert.rotateX(waterNode.local, -Math.PI / 2);

// ✅ Turunkan sedikit supaya di bawah kaki Swampert
LIBSSwampert.translate(waterNode.local, [-0.3, -0.3, 1.3]);

// Tambahkan ke scene di bawah Swampert
swampertRoot.children.push(waterNode);

// ✅ Variabel animasi paraboloid
let paraboloidWave = {
  baseScaleY: 1.0,
  amplitude: 0.15,   // tinggi gelombang air
  speed: 2.0         // kecepatan naik-turun
};

console.log("✅ Paraboloid water surface correctly positioned and rotated.");



  // ==================== ENVIRONMENT ====================
  GL.useProgram(SHADER_PROGRAM_MUDKIP);
  
  const sky = new Sky(GL, { texturePath: 'environment/skybox.jpg' });
  sky.setup();

  const water = new Water(GL, SHADER_PROGRAM_MUDKIP, mudkip_position, mudkip_color, mudkip_normal, mudkip_Mmatrix, {
    size: 100,
    waterLevel: -2.0,
    waveAmplitude: 0.58,
    segments: 64
  });
  water.setup();

  const veryManyPuddles = createPuddles(35, 35, 12345, {
    minRadius: 0.4,
    maxRadius: 1.2,
    minDistFromCenter: 1.5,
    maxDistFromCenter: 35 * 0.95,
    minDistBetweenPuddles: 1.0
  });

  const ground = new Ground(GL, SHADER_PROGRAM_MUDKIP, mudkip_position, mudkip_color, mudkip_normal, mudkip_Mmatrix, {
    radius: 35,
    cliffHeight: 1.5,
    segments: 64,
    noiseAmplitude: 0.05,
    puddles: veryManyPuddles
  });
  ground.setup();

  const rocks = new Rock(GL, SHADER_PROGRAM_MUDKIP, mudkip_position, mudkip_color, mudkip_normal, mudkip_Mmatrix, {
    groundRadius: 35,
    numClusters: 6,
    numScattered: 20,
    puddles: veryManyPuddles,
    seed: 98765
  });
  rocks.setup();

  const waterfall = new Waterfall(GL, SHADER_PROGRAM_MUDKIP, mudkip_position, mudkip_color, mudkip_normal, mudkip_Mmatrix, {
    position: [0, 0, -25],      // Behind ground
    width: 22,                   // Total width
    height: 12,                  // Height
    waterLevel: -2.0,            // Match ocean
    numStreams: 15,               // Number of water columns
    streamWidth: 5.8,            // Width of each stream
    streamSpeed: 2.5,            // Animation speed
    seed: 54321                  // For consistent generation
   });
    waterfall.setup();

  // ==================== FPS CAMERA ====================
  let cameraPosition = [0, 3, 20];
  let cameraFront = [0, 0, -1];
  let cameraUp = [0, 1, 0];
  let cameraSpeed = 0.2;
  let yaw = -90.0;
  let pitch = 0.0;
  let mouseSensitivity = 0.2;
  const keys = {};
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  var PROJMATRIX = LIBSMudkip.get_projection(40, CANVAS.width / CANVAS.height, 0.1, 800);

  CANVAS.addEventListener('mousedown', function(e) {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    CANVAS.style.cursor = 'grabbing';
  });

  CANVAS.addEventListener('mouseup', function() {
    isDragging = false;
    CANVAS.style.cursor = 'grab';
  });

  CANVAS.addEventListener('mouseleave', function() {
    isDragging = false;
    CANVAS.style.cursor = 'grab';
  });

  CANVAS.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;
    yaw += deltaX * mouseSensitivity;
    pitch -= deltaY * mouseSensitivity;
    pitch = Math.max(-89, Math.min(89, pitch));
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    updateCameraFront();
  });

  CANVAS.style.cursor = 'grab';

  window.addEventListener('keydown', function(e) {
    keys[e.key.toLowerCase()] = true;
  });

  window.addEventListener('keyup', function(e) {
    keys[e.key.toLowerCase()] = false;
  });

  function updateCameraFront() {
    const yawRad = yaw * Math.PI / 180;
    const pitchRad = pitch * Math.PI / 180;
    cameraFront[0] = Math.cos(yawRad) * Math.cos(pitchRad);
    cameraFront[1] = Math.sin(pitchRad);
    cameraFront[2] = Math.sin(yawRad) * Math.cos(pitchRad);
    const normalized = LIBSMudkip.normalize(cameraFront);
    cameraFront[0] = normalized[0];
    cameraFront[1] = normalized[1];
    cameraFront[2] = normalized[2];
  }

  function updateFPSCamera() {
    const speed = cameraSpeed;
    if (keys['w']) {
      cameraPosition[0] += cameraFront[0] * speed;
      cameraPosition[1] += cameraFront[1] * speed;
      cameraPosition[2] += cameraFront[2] * speed;
    }
    if (keys['s']) {
      cameraPosition[0] -= cameraFront[0] * speed;
      cameraPosition[1] -= cameraFront[1] * speed;
      cameraPosition[2] -= cameraFront[2] * speed;
    }
    if (keys['a']) {
      const right = LIBSMudkip.cross(cameraFront, cameraUp);
      const normalized = LIBSMudkip.normalize(right);
      cameraPosition[0] -= normalized[0] * speed;
      cameraPosition[1] -= normalized[1] * speed;
      cameraPosition[2] -= normalized[2] * speed;
    }
    if (keys['d']) {
      const right = LIBSMudkip.cross(cameraFront, cameraUp);
      const normalized = LIBSMudkip.normalize(right);
      cameraPosition[0] += normalized[0] * speed;
      cameraPosition[1] += normalized[1] * speed;
      cameraPosition[2] += normalized[2] * speed;
    }
    if (keys[' ']) {
      cameraPosition[1] += speed;
    }
    if (keys['shift']) {
      cameraPosition[1] -= speed;
    }
  }

  window.addEventListener('resize', function() {
    CANVAS.width = window.innerWidth * dpr;
    CANVAS.height = window.innerHeight * dpr;
    CANVAS.style.width = window.innerWidth + 'px';
    CANVAS.style.height = window.innerHeight + 'px';
    PROJMATRIX = LIBSMudkip.get_projection(40, CANVAS.width / CANVAS.height, 0.1, 800);
  });

  // ==================== GL STATE ====================
  GL.enable(GL.DEPTH_TEST);
  GL.depthFunc(GL.LEQUAL);
  GL.enable(GL.BLEND);
  GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
  GL.depthMask(true);
  GL.clearColor(0.5, 0.5, 0.5, 1.0);
//   GL.clearDepth(1.0);

  updateCameraFront();

  // ==================== ANIMATE ====================
  var animate = function (time) {
    GL.viewport(0, 0, CANVAS.width, CANVAS.height);
    GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

    updateFPSCamera();

    const lookAtPoint = [
      cameraPosition[0] + cameraFront[0],
      cameraPosition[1] + cameraFront[1],
      cameraPosition[2] + cameraFront[2]
    ];
    const viewMatrix = LIBSMudkip.lookAt(cameraPosition, lookAtPoint, cameraUp);

    // Update animations
    animMudkip.update(time);
    animMudkip.updateTail(time);
    animMudkip.updateFin(time);
    animMudkip.applyAnimation();

    // ✅ Update Marshtomp but keep position fixed
    const keysEmpty = { w: false, a: false, s: false, d: false };
    animMarshtomp.update(keysEmpty);  // No movement, only pose changes

    // ==================== RENDER ENVIRONMENT ====================
    GL.useProgram(SHADER_PROGRAM_MUDKIP);
    GL.uniformMatrix4fv(mudkip_Pmatrix, false, PROJMATRIX);
    GL.uniformMatrix4fv(mudkip_Vmatrix, false, viewMatrix);
    GL.uniform3f(mudkip_viewPos, cameraPosition[0], cameraPosition[1], cameraPosition[2]);

    GL.enableVertexAttribArray(mudkip_position);
    GL.enableVertexAttribArray(mudkip_color);
    GL.enableVertexAttribArray(mudkip_normal);

    let skyModelMatrix = LIBSMudkip.get_I4();
    let rotationSpeed = 0.00002;
    LIBSMudkip.rotateY(skyModelMatrix, time * rotationSpeed);
    sky.render(PROJMATRIX, viewMatrix, skyModelMatrix);

    ground.render(LIBSMudkip.get_I4());
    rocks.render(LIBSMudkip.get_I4());
    water.updateWaves(time);
    water.render(LIBSMudkip.get_I4());
    waterfall.updateAnimation(time);
    waterfall.render(LIBSMudkip.get_I4());

    mudkip.CameraRig.render(LIBSMudkip.get_I4());

    // ==================== RENDER MARSHTOMP ====================
    GL.useProgram(SHADER_PROGRAM_MARSHTOMP);
    GL.uniformMatrix4fv(marshtomp_Pmatrix, false, PROJMATRIX);
    GL.uniformMatrix4fv(marshtomp_Vmatrix, false, viewMatrix);
    GL.uniform3f(marshtomp_lightPosition, 8, 12, 8);
    GL.uniform3f(marshtomp_cameraPosition, cameraPosition[0], cameraPosition[1], cameraPosition[2]);

    // ✅ Set global shininess mode (sama seperti Mudkip)
    GL.uniform1f(marshtomp_globalShininess, 22.0);  // Same as Mudkip
    GL.uniform1i(marshtomp_useGlobalShininess, 1);  // 1 = use global, 0 = use per-object

    GL.enableVertexAttribArray(marshtomp_position);
    GL.enableVertexAttribArray(marshtomp_normal);

    const ROOT_MARSHTOMP = LIBSMarshtomp.get_I4();
    const ROOT_NORMAL_MARSHTOMP = LIBSMarshtomp.getNormalMatrix(ROOT_MARSHTOMP);
    
    marshtomp.render(ROOT_MARSHTOMP, ROOT_NORMAL_MARSHTOMP);

    // ==================== ANIMASI BOLA SWAMPERT ====================
   // ==================== ANIMASI BOLA SWAMPERT ====================
    if (swampertAnimation.active && swampertBallGroupRef) {
        
        if (swampertAnimation.state === "MOVING") {
            // ⭐ BOLA MAJU TERUS
            swampertAnimation.position += swampertAnimation.speed;
            
            LIBSSwampert.set_I4(swampertBallGroupRef.local);
            LIBSSwampert.translate(swampertBallGroupRef.local, [0, -0.1, swampertAnimation.position]);
            
            // ⭐ JIKA SAMPAI JAUH, LEDAKAN!
            if (swampertAnimation.position > swampertAnimation.maxDistance) {
                swampertAnimation.state = "EXPLODING";
                swampertAnimation.explosionTimer = 0;
                console.log("💥 BOOM! Bola meledak!");
            }
        }
        else if (swampertAnimation.state === "EXPLODING") {
            // ⭐ EFEK LEDAKAN (scale membesar)
            swampertAnimation.explosionTimer++;
            
            const explosionProgress = swampertAnimation.explosionTimer / swampertAnimation.explosionDuration;
            const scale = 1.0 + explosionProgress * 3.0; // Scale 1x → 4x
            
            LIBSSwampert.set_I4(swampertBallGroupRef.local);
            LIBSSwampert.translate(swampertBallGroupRef.local, [0, -0.1, swampertAnimation.position]);
            LIBSSwampert.scale(swampertBallGroupRef.local, [scale, scale, scale]);
            
            // ⭐ SETELAH LEDAKAN, RESET KE DEPAN MULUT
            if (swampertAnimation.explosionTimer >= swampertAnimation.explosionDuration) {
                swampertAnimation.state = "MOVING";
                swampertAnimation.position = 1.0; // Kembali ke depan mulut
                console.log("🔄 Bola kembali ke depan mulut!");
            }
        }
    }

      // ==================== ANIMASI PARABOLOID AIR MANCUR (DINAMIS) ====================
      if (waterNode) {
        let t = time * 0.001;

        // 1️⃣ gelombang vertikal halus
        let waveScale = paraboloidWave.baseScaleY + paraboloidWave.amplitude * Math.sin(t * paraboloidWave.speed);

        // 2️⃣ warna air berubah dinamis (mirip Water.js)
        const dynamicColor = getDynamicWaterColor(0, 0, t);

        // 3️⃣ reset matriks dan apply transformasi
        LIBSSwampert.set_I4(waterNode.local);
        
        LIBSSwampert.rotateX(waterNode.local, -Math.PI / 2);
        LIBSSwampert.translate(waterNode.local, [-0.2, -0.3, 1.3]);
        LIBSSwampert.scale(waterNode.local, [1.0, waveScale, 1.0]);

        // 4️⃣ update warna di vertex paraboloid
        const vertices = waterGeo.vertices;
        for (let i = 0; i < vertices.length; i += 6) {
          vertices[i + 3] = dynamicColor[0];
          vertices[i + 4] = dynamicColor[1];
          vertices[i + 5] = dynamicColor[2];
        }

        // re-upload warna baru ke GPU
        GL.bindBuffer(GL.ARRAY_BUFFER, waterNode.mesh.vbo);
        GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(vertices), GL.DYNAMIC_DRAW);
      }

    // === ROTATE SWAMPERT ROCK (pakai pivot dari swampert.js) ===
      // [CF1] SWAMPERT_ROCK_ORBIT_BEGIN
      if (swampertRockPivotRef) {
        const tSec = time * 0.001;

        // --- KNOBS (ubah sesuka kamu) ---
        const ORBIT_CENTER = [-0.55, -0.26, 0.52]; // pusat orbit relatif ke Swampert
        const ORBIT_RADIUS = { x: 0.22, z: 0.00 }; // kecilkan biar muter mepet Swampert
        const ORBIT_SPEED  = 1.4;                  // rad/s
        const ORBIT_PHASE  = Math.PI * 0.5;        // posisi awal (0..2π)
        const ORBIT_AXIS   = [3, 1, 0];            // [0,1,0] = lingkaran datar
        const ROCK_SCALE   = [0.90, 1.10, 0.90];   // opsional

        // 1) set pusat orbit (pivot dekat Swampert)
        LIBSSwampert.set_I4(swampertRockPivotRef.local);
        LIBSSwampert.translate(swampertRockPivotRef.local, ORBIT_CENTER);

        // 2) set radius orbit di CHILD (batunya)
        if (swampertRockNodeRef) {
          LIBSSwampert.set_I4(swampertRockNodeRef.local);
          LIBSSwampert.translate(swampertRockNodeRef.local, [ORBIT_RADIUS.x, 0.0, ORBIT_RADIUS.z]);
          LIBSSwampert.scale(swampertRockNodeRef.local, ROCK_SCALE);
        }

        // 3) putar pivot → child yang ter-offset ber-orbit
        rotateAroundAxis(swampertRockPivotRef.local, ORBIT_AXIS, ORBIT_PHASE + tSec * ORBIT_SPEED);
      }
      // [CF1] SWAMPERT_ROCK_ORBIT_END





    // ==================== RENDER SWAMPERT ====================

    // ✅ Tambahkan node global untuk memudahkan animasi/posisi Swampert
    const swampertBase = {
        mesh: null,
        local: LIBSSwampert.get_I4(),
        children: [swampertRoot]
    };
    LIBSSwampert.translate(swampertBase.local, [-8, 3.5, 0]);


    GL.useProgram(SHADER_PROGRAM_SWAMPERT);
    GL.uniformMatrix4fv(swampert_Pmatrix, false, PROJMATRIX);
    GL.uniformMatrix4fv(swampert_Vmatrix, false, viewMatrix);
    
    // Enable attributes
    GL.enableVertexAttribArray(swampert_position);
    GL.enableVertexAttribArray(swampert_color);
    
    // Render Swampert
    drawNode(GL, swampertRoot, SWAMPERT_MATRIX, {
        position: swampert_position,
        color: swampert_color,
        M: swampert_Mmatrix
    });

    GL.flush();
    window.requestAnimationFrame(animate);
  };

  animate(0);

  console.log('=== Scene Initialized ===');
  console.log('Mudkip: x=-8 (left)');
  console.log('Marshtomp: x=8 (right), y=1.0, STATIC (no movement)');
  console.log('Marshtomp shield: TRANSPARENT with alpha blending');
}

window.addEventListener('load', main);
