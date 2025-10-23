import { Ellipsoid } from '../Ellipsoid.js';
import { Cone } from '../Cone.js';
import { Hyperboloid } from '../Hyperboloid.js';
import { Lathe } from '../Lathe.js';
import { Fin } from '../Fin.js';
import { Cube } from './Cube.js';
import { Cylinder } from './Cylinder.js';
import { Arm } from './Arm.js';
import { FinSpline } from './FinSpline.js';

function main() {
  const CANVAS = document.getElementById("mycanvas");
  CANVAS.width = window.innerWidth;
  CANVAS.height = window.innerHeight;
  
  // ✅ Konteks WebGL disederhanakan, tidak perlu alpha
  const GL = CANVAS.getContext("webgl", { 
    antialias: true,
    alpha: false,
    premultipliedAlpha: false
  });
  
  if (!GL) {
    alert("WebGL context cannot be initialized");
    return;
  }

  const shader_vertex_source = `
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
      v_surfaceToView  = u_cameraPosition - worldPosition;
    }`;

  const shader_fragment_source = `
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
      vec3 ambient  = 0.22 * u_color.rgb;
      vec3 diffuse  = u_color.rgb * ndotl;
      vec3 specular = vec3(0.8) * spec;
      vec3 linear   = ambient + diffuse + specular + u_color.rgb * rim;
      vec3 srgb = pow(clamp(linear, 0.0, 1.0), vec3(1.0/2.2));
      gl_FragColor = vec4(srgb, u_color.a);
    }`;

  function compile_shader(src, type, label) {
    const sh = GL.createShader(type);
    GL.shaderSource(sh, src);
    GL.compileShader(sh);
    if (!GL.getShaderParameter(sh, GL.COMPILE_STATUS)) {
      alert("ERROR IN " + label + " SHADER: " + GL.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  const shader_vertex = compile_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");
  const shader_fragment = compile_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");
  const SHADER_PROGRAM = GL.createProgram();
  GL.attachShader(SHADER_PROGRAM, shader_vertex);
  GL.attachShader(SHADER_PROGRAM, shader_fragment);
  GL.linkProgram(SHADER_PROGRAM);

  const locations = {
    _Pmatrix: GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix"),
    _Vmatrix: GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix"),
    _Mmatrix: GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix"),
    _Nmatrix: GL.getUniformLocation(SHADER_PROGRAM, "Nmatrix"),
    _u_color: GL.getUniformLocation(SHADER_PROGRAM, "u_color"),
    _shininess: GL.getUniformLocation(SHADER_PROGRAM, "u_shininess"),
    _lightPosition: GL.getUniformLocation(SHADER_PROGRAM, "u_lightPosition"),
    _cameraPosition: GL.getUniformLocation(SHADER_PROGRAM, "u_cameraPosition"),
    _position: GL.getAttribLocation(SHADER_PROGRAM, "position"),
    _normal: GL.getAttribLocation(SHADER_PROGRAM, "normal")
  };
  GL.enableVertexAttribArray(locations._position);
  GL.enableVertexAttribArray(locations._normal);
  GL.useProgram(SHADER_PROGRAM);

  // ✅ State GL untuk Objek Solid
  GL.enable(GL.DEPTH_TEST);
  GL.depthFunc(GL.LEQUAL);
  GL.enable(GL.CULL_FACE);
  GL.cullFace(GL.BACK);
  GL.disable(GL.BLEND);        // Blending MATI
  GL.depthMask(true);           // Depth writing NYALA
  GL.clearColor(0.1, 0.15, 0.2, 1);

  // ======================== OBJECTS ========================
  const badan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 1.1, b: 1.2, c: 0.8,
    color: [85/255, 185/255, 235/255, 1],
    shininess: 20.0,
    v_min: Math.PI / 4,     // ✅ Fix Z-Fighting
    v_max: 2 * Math.PI - (Math.PI / 4)
  });

  const kepalaAtas = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 1.0, b: 0.8, c: 0.75,
    color: [85/255, 185/255, 235/255, 1],
    shininess: 30,
    stack: 200,
    sectors: 200,
    y: 1.5,
    v_min: Math.PI / 4,     // ✅ Fix Z-Fighting
    v_max: 2 * Math.PI - (Math.PI / 4)
  });

  const daguBawah = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 1.0, b: 0.81, c: 0.75,
    color: [173/255, 216/255, 230/255, 1],
    shininess: 30,
    stack: 200,
    sectors: 200,
    u_min: -Math.PI/2,
    u_max: -Math.PI/12,
    v_min: 0,
    v_max: Math.PI
  });

  const lingkaranPipiKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.5, b: 0.3, c: 0.5,
    color: [1, 150/255, 100/255, 1],
    shininess: 10,
    x: 0.7,
    rz: LIBS.degToRad(-90),
    ry: LIBS.degToRad(-15)
  });

  const lingkaranPipiKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.5, b: 0.3, c: 0.5,
    color: [1, 150/255, 100/255, 1],
    shininess: 10,
    x: -0.7,
    rz: LIBS.degToRad(90),
    ry: LIBS.degToRad(15)
  });

  const pipiKanan = new Cone(GL, LIBS, SHADER_PROGRAM, locations, {
    radius: 0.2,
    height: 0.9,
    color: [1, 150/255, 100/255, 1],
    shininess: 10,
    x: 0.95,
    rz: LIBS.degToRad(-90),
    ry: LIBS.degToRad(-15)
  });

  const pipiKiri = new Cone(GL, LIBS, SHADER_PROGRAM, locations, {
    radius: 0.2,
    height: 0.9,
    color: [1, 150/255, 100/255, 1],
    shininess: 10,
    x: -0.95,
    rz: LIBS.degToRad(90),
    ry: LIBS.degToRad(15)
  });

  const mataKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.2, b: 0.25, c: 0.05,
    color: [1, 150/255, 100/255, 1],
    shininess: 10,
    x: 0.4, y: 0.2, z: 0.63,
    rx: LIBS.degToRad(-16),
    ry: LIBS.degToRad(20)
  });

  const pupilKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.1, b: 0.12, c: 0.05,
    color: [0, 0, 0, 1],
    shininess: 5,
    z: 0.01
  });

  const kilauMataKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.04, b: 0.04, c: 0.05,
    color: [1, 1, 1, 1],
    shininess: 100,
    x: -0.03, y: 0.04, z: 0.02
  });

  const mataKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.2, b: 0.25, c: 0.05,
    color: [1, 150/255, 100/255, 1],
    shininess: 10,
    x: -0.4, y: 0.2, z: 0.63,
    rx: LIBS.degToRad(-16),
    ry: LIBS.degToRad(-20)
  });

  const pupilKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.1, b: 0.12, c: 0.05,
    color: [0, 0, 0, 1],
    shininess: 5,
    z: 0.01
  });

  const kilauMataKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.04, b: 0.04, c: 0.05,
    color: [1, 1, 1, 1],
    shininess: 100,
    x: 0.03, y: 0.04, z: 0.02
  });

  const hidungKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.05, b: 0.015, c: 0.01,
    color: [0.1, 0.1, 0.1, 1],
    shininess: 5,
    x: 0.15, y: -0.05, z: 0.74,
    rz: LIBS.degToRad(45)
  });

  const hidungKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.05, b: 0.015, c: 0.01,
    color: [0.1, 0.1, 0.1, 1],
    shininess: 5,
    x: -0.15, y: -0.05, z: 0.74,
    rz: LIBS.degToRad(-45)
  });

  const senyum = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.87, b: 0.02, c: 0.54,
    color: [0.1, 0.1, 0.1, 1],
    shininess: 5,
    y: -0.2, z: 0.2
  });

  const perut = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.85, b: 0.8, c: 0.4,
    color: [210/255, 180/255, 140/255, 1],
    shininess: 10,
    z: 0.48, y: -0.1,
    rx: LIBS.degToRad(5),
    v_min: 0,       // ✅ Fix Z-Fighting
    v_max: Math.PI
  });

  const kakiKanan = new Hyperboloid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.25, c: 0.25, height: 1,
    color: [85/255, 185/255, 235/255, 1],
    shininess: 10,
    x: 0.5, y: -1.5,
    u_min: 0, u_max: 0.7
  });

  const kakiKiri = new Hyperboloid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.25, c: 0.25, height: 1,
    color: [85/255, 185/255, 235/255, 1],
    shininess: 10,
    x: -0.5, y: -1.5,
    u_min: 0, u_max: 0.7
  });

  const jariKanan1 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.04, b: 0.04, c: 0.06,
    color: [0, 0, 0, 1],
    shininess: 1,
    x: 0.08, y: 0.032, z: 0.2
  });

  const jariKanan2 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.04, b: 0.04, c: 0.06,
    color: [0, 0, 0, 1],
    shininess: 1,
    x: -0.08, y: 0.032, z: 0.2
  });

  const jariKiri1 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.04, b: 0.04, c: 0.06,
    color: [0, 0, 0, 1],
    shininess: 1,
    x: 0.08, y: 0.032, z: 0.2
  });

  const jariKiri2 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.04, b: 0.04, c: 0.06,
    color: [0, 0, 0, 1],
    shininess: 1,
    x: -0.08, y: 0.032, z: 0.2
  });

  const telapakKakiKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.25, b: 0.02, c: 0.25,
    color: [85/255, 185/255, 235/255, 1],
    shininess: 10,
    y: 0
  });

  const telapakKakiKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.25, b: 0.02, c: 0.25,
    color: [85/255, 185/255, 235/255, 1],
    shininess: 10,
    y: 0
  });

  const controlPointsLengan = [
    [0.2, 0.4, 0], [0.3, 0.5, 0], [0.4, -0.6, 0], [0.45, -1.4, 0]
  ];

  const lenganKanan = new Lathe(GL, LIBS, SHADER_PROGRAM, locations, {
    controlPoints: controlPointsLengan,
    color: [85/255, 185/255, 235/255, 1],
    shininess: 10,
    x: 1.08, y: 0.2,
    rz: LIBS.degToRad(80),
    ry: LIBS.degToRad(90),
    rx: LIBS.degToRad(50),
    scaleX: 1, scaleZ: 0.4
  });

  const lenganKiri = new Lathe(GL, LIBS, SHADER_PROGRAM, locations, {
    controlPoints: controlPointsLengan,
    color: [85/255, 185/255, 235/255, 1],
    shininess: 10,
    x: -1.08, y: 0.2,
    rz: LIBS.degToRad(-80),
    ry: LIBS.degToRad(-90),
    rx: LIBS.degToRad(50),
    scaleX: 1, scaleZ: 0.4
  });

  const telapakTanganKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.45, b: 0.04, c: 0.18,
    color: [85/255, 185/255, 235/255, 1],
    shininess: 10,
    y: -1.4
  });

  const telapakTanganKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.45, b: 0.04, c: 0.18,
    color: [85/255, 185/255, 235/255, 1],
    shininess: 10,
    y: -1.4
  });

  const jariTanganKanan1 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.2, b: 0.3, c: 0.12,
    color: [85/255, 185/255, 235/255, 1],
    shininess: 5,
    x: -0.26, y: -0.1
  });

  const jariTanganKanan2 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.22, b: 0.3, c: 0.18,
    color: [85/255, 185/255, 235/255, 1],
    shininess: 5,
    x: -0.02, y: -0.1
  });

  const jariTanganKanan3 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.2, b: 0.3, c: 0.12,
    color: [85/255, 185/255, 235/255, 1],
    shininess: 5,
    x: 0.26, y: -0.1
  });

  const jariTanganKiri1 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.2, b: 0.3, c: 0.12,
    color: [85/255, 185/255, 235/255, 1],
    shininess: 5,
    x: -0.26, y: -0.1
  });

  const jariTanganKiri2 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.22, b: 0.3, c: 0.18,
    color: [85/255, 185/255, 235/255, 1],
    shininess: 5,
    x: -0.02, y: -0.1
  });

  const jariTanganKiri3 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.2, b: 0.3, c: 0.12,
    color: [85/255, 185/255, 235/255, 1],
    shininess: 5,
    x: 0.26, y: -0.1
  });

  const sirip = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.08, b: 1, c: 1.1,
    color: [60/255, 68/255, 82/255, 1],
    shininess: 8,
    u_min: 0, u_max: Math.PI,
    v_min: 0, v_max: Math.PI,
    x: 0, y: 0.45, z: 0.1,
    rx: LIBS.degToRad(-75)
  });

  const alasSirip = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 0.08, b: 0.01, c: 1.1,
    color: [60/255, 68/255, 82/255, 1],
    shininess: 8
  });

  const cpLeaf = [
    [0.1, 0.1, 0], [0.52, 0.1, 0], [0.32, 0.60, 0],
    [0.28, 0.90, 0], [0.22, 1.12, 0], [0.12, 1.32, 0], [0.02, 1.36, 0]
  ];

  const wingR = new Lathe(GL, LIBS, SHADER_PROGRAM, locations, {
    controlPoints: cpLeaf,
    color: [60/255, 68/255, 82/255, 1],
    shininess: 8,
    x: 0.45, y: -0.70, z: -1.15,
    ry: LIBS.degToRad(90),
    rx: LIBS.degToRad(10),
    rz: LIBS.degToRad(-10),
    scaleX: 1.5, scaleZ: 0.15
  });

  const wingL = new Lathe(GL, LIBS, SHADER_PROGRAM, locations, {
    controlPoints: cpLeaf,
    color: [60/255, 68/255, 82/255, 1],
    shininess: 8,
    x: -0.45, y: -0.70, z: -1.15,
    rx: LIBS.degToRad(10),
    ry: LIBS.degToRad(-90),
    rz: LIBS.degToRad(10),
    scaleX: 1.5, scaleZ: 0.15
  });

  // ❌ Shield object Dihapus

  // Build scene graph
  badan.childs.push(wingR, wingL);
  mataKanan.childs.push(pupilKanan, kilauMataKanan);
  mataKiri.childs.push(pupilKiri, kilauMataKiri);
  sirip.childs.push(alasSirip);
  kepalaAtas.childs.push(
    daguBawah, lingkaranPipiKanan, pipiKanan,
    lingkaranPipiKiri, pipiKiri, mataKanan, mataKiri,
    hidungKanan, hidungKiri, senyum, sirip
  );
  telapakKakiKanan.childs.push(jariKanan1, jariKanan2);
  telapakKakiKiri.childs.push(jariKiri1, jariKiri2);
  kakiKanan.childs.push(telapakKakiKanan);
  kakiKiri.childs.push(telapakKakiKiri);
  telapakTanganKanan.childs.push(jariTanganKanan1, jariTanganKanan2, jariTanganKanan3);
  telapakTanganKiri.childs.push(jariTanganKiri1, jariTanganKiri2, jariTanganKiri3);
  lenganKanan.childs.push(telapakTanganKanan);
  lenganKiri.childs.push(telapakTanganKiri);
  badan.childs.push(kepalaAtas, perut, kakiKanan, kakiKiri, lenganKanan, lenganKiri);

  // ❌ shield.setup() Dihapus
  badan.setup();

  // ================= ORBITAL CAMERA =================
  const PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 0.5, 100);
  const VIEWMATRIX = LIBS.get_I4();

  let camDistance = 10.0;
  let camTheta = 0;
  let camPhi = Math.PI / 3;
  const camRotSpeed = 0.008;
  const camZoomSpeed = 0.8;

  function getCameraPosition() {
    const x = camDistance * Math.sin(camPhi) * Math.sin(camTheta);
    const y = camDistance * Math.cos(camPhi);
    const z = camDistance * Math.sin(camPhi) * Math.cos(camTheta);
    return [x, y, z];
  }

  function buildView() {
    const camPos = getCameraPosition();
    const target = [position[0], 0, position[2]];
    LIBS.set_I4(VIEWMATRIX);
    LIBS.lookAt(VIEWMATRIX, camPos, target, [0, 1, 0]);
    GL.uniform3fv(locations._cameraPosition, camPos);
  }

  let dragging = false, x_prev = 0, y_prev = 0;

  CANVAS.addEventListener("mousedown", e => {
    dragging = true;
    x_prev = e.pageX;
    y_prev = e.pageY;
    e.preventDefault();
  });

  ["mouseup", "mouseout"].forEach(ev =>
    CANVAS.addEventListener(ev, () => { dragging = false; }, false)
  );

  CANVAS.addEventListener("mousemove", e => {
    if (!dragging) return;
    const dX = (e.pageX - x_prev);
    const dY = (e.pageY - y_prev);

    camTheta -= dX * camRotSpeed;
    camPhi = Math.max(0.1, Math.min(Math.PI - 0.1, camPhi + dY * camRotSpeed));

    x_prev = e.pageX;
    y_prev = e.pageY;
    e.preventDefault();
  }, false);

  CANVAS.addEventListener('wheel', e => {
    camDistance = Math.max(5, Math.min(25, camDistance + Math.sign(e.deltaY) * camZoomSpeed));
    e.preventDefault();
  }, { passive: false });

  const ROOT = LIBS.get_I4();

  function buildRoot() {
    LIBS.set_I4(ROOT);
  }

  // ================= State & Animation =================
  let bodyRotY = 0, bodyRotX = 0;
  let position = [0, 0, -20];
  let badanBaseY = 0;

  // ✅ State disederhanakan
  const STATE = {
    RUNNING: 0,
    JUMP_BACK: 1,
    IDLE: 2
  };
  let state = STATE.RUNNING;
  const RunSpeed = 3.0;
  const JumpDur = 0.7, JumpBackDist = 5.0, JumpHeight = 1.8;
  let jumpCount = 0, totalJumps = 2, jumpT = 0;
  let runTimer = 0, runDur = 1.6;

  let idleTimer = 0;
  const idleLoopDur = 3.0; // ✅ Durasi idle sebelum lari lagi

  // ❌ Variabel shield dihapus

  function poseRunning(t) {
    const smallSwing = Math.sin(t * 2) * LIBS.degToRad(20);

    LIBS.set_I4(lenganKanan.MOVE_MATRIX);
    LIBS.rotateX(lenganKanan.MOVE_MATRIX, LIBS.degToRad(-100));
    LIBS.rotateY(lenganKanan.MOVE_MATRIX, LIBS.degToRad(20));
    LIBS.rotateZ(lenganKanan.MOVE_MATRIX, smallSwing);

    LIBS.set_I4(lenganKiri.MOVE_MATRIX);
    LIBS.rotateX(lenganKiri.MOVE_MATRIX, LIBS.degToRad(-100));
    LIBS.rotateY(lenganKiri.MOVE_MATRIX, LIBS.degToRad(-20));
    LIBS.rotateZ(lenganKiri.MOVE_MATRIX, -smallSwing);

    const swing = 20, amp = 5;
    LIBS.set_I4(kakiKanan.MOVE_MATRIX);
    LIBS.rotateX(kakiKanan.MOVE_MATRIX, Math.sin(t * swing + Math.PI) * LIBS.degToRad(amp));

    LIBS.set_I4(kakiKiri.MOVE_MATRIX);
    LIBS.rotateX(kakiKiri.MOVE_MATRIX, Math.sin(t * swing) * LIBS.degToRad(amp));
  }

  function poseIdle(t) {
    const breathSpeed = 1.2, breathAmp = 0.03;
    const breathOffset = Math.sin(t * breathSpeed) * breathAmp;
    position[1] = badanBaseY + breathOffset;

    const armSwaySpeed = 1.5, armSwayAmp = 8;
    const armSwing = Math.sin(t * armSwaySpeed) * LIBS.degToRad(armSwayAmp);

    LIBS.set_I4(lenganKanan.MOVE_MATRIX);
    LIBS.rotateX(lenganKanan.MOVE_MATRIX, LIBS.degToRad(-20) + armSwing);

    LIBS.set_I4(lenganKiri.MOVE_MATRIX);
    LIBS.rotateX(lenganKiri.MOVE_MATRIX, LIBS.degToRad(-20) - armSwing);

    const headBobSpeed = 1.0, headBobAmp = 5;
    const headBob = Math.sin(t * headBobSpeed) * LIBS.degToRad(headBobAmp);

    LIBS.set_I4(kepalaAtas.MOVE_MATRIX);
    LIBS.rotateX(kepalaAtas.MOVE_MATRIX, headBob);

    LIBS.set_I4(kakiKanan.MOVE_MATRIX);
    LIBS.set_I4(kakiKiri.MOVE_MATRIX);
  }

  function poseJump(tNorm) {
    LIBS.set_I4(kakiKanan.MOVE_MATRIX);
    LIBS.set_I4(kakiKiri.MOVE_MATRIX);

    const zW = Math.sin(tNorm * Math.PI * 2) * LIBS.degToRad(10);
    const xL = LIBS.degToRad(-30);

    LIBS.set_I4(lenganKanan.MOVE_MATRIX);
    LIBS.rotateX(lenganKanan.MOVE_MATRIX, xL);
    LIBS.rotateZ(lenganKanan.MOVE_MATRIX, zW);

    LIBS.set_I4(lenganKiri.MOVE_MATRIX);
    LIBS.rotateX(lenganKiri.MOVE_MATRIX, xL);
    LIBS.rotateZ(lenganKiri.MOVE_MATRIX, -zW);
  }

  // ❌ Fungsi pose shield dihapus

  let lastTime = performance.now() / 1000;

  function animate() {
    const now = performance.now() / 1000;
    const dt = Math.min(0.033, now - lastTime);
    lastTime = now;

    if (state === STATE.RUNNING) {
      runTimer += dt;
      const fwd = [Math.sin(bodyRotY), 0, Math.cos(bodyRotY)];
      position[0] += fwd[0] * RunSpeed * dt;
      position[2] += fwd[2] * RunSpeed * dt;
      position[1] = badanBaseY;
      if (runTimer >= runDur) {
        runTimer = 0;
        state = STATE.JUMP_BACK;
        jumpT = 0;
      }
    }
    else if (state === STATE.JUMP_BACK) {
      jumpT = Math.min(1, jumpT + dt / JumpDur);
      const fwd = [Math.sin(bodyRotY), 0, Math.cos(bodyRotY)];
      const back = [-fwd[0], 0, -fwd[2]];
      position[0] += back[0] * (JumpBackDist * dt / JumpDur);
      position[2] += back[2] * (JumpBackDist * dt / JumpDur);
      position[1] = badanBaseY + 4 * JumpHeight * jumpT * (1 - jumpT);
      if (jumpT >= 1) {
        position[1] = badanBaseY;
        jumpCount += 1;
        if (jumpCount < totalJumps) {
          state = STATE.RUNNING;
          runTimer = 0;
        } else {
          state = STATE.IDLE;
          idleTimer = 0;
        }
      }
    }
    else if (state === STATE.IDLE) {
      idleTimer += dt;
      // ✅ Logika diganti: kembali lari setelah idle
      if (idleTimer >= idleLoopDur) { 
        state = STATE.RUNNING;
        runTimer = 0;
        jumpCount = 0;
        idleTimer = 0;
      }
    }
    // ❌ State shield dihapus

    if (state === STATE.RUNNING) {
      poseRunning(now);
    } else if (state === STATE.JUMP_BACK) {
      poseJump(jumpT);
    } else if (state === STATE.IDLE) {
      poseIdle(now);
    }
    // ❌ Pose shield dihapus

    LIBS.set_I4(badan.MOVE_MATRIX);
    if (LIBS.translate) {
      LIBS.translate(badan.MOVE_MATRIX, position[0], position[1], position[2]);
    } else {
      LIBS.translateX(badan.MOVE_MATRIX, position[0]);
      LIBS.translateY(badan.MOVE_MATRIX, position[1]);
      LIBS.translateZ(badan.MOVE_MATRIX, position[2]);
    }
    LIBS.rotateY(badan.MOVE_MATRIX, bodyRotY);
    LIBS.rotateX(badan.MOVE_MATRIX, bodyRotX);

    // ❌ Matriks shield dihapus
  
    buildRoot();
    buildView();

    // ✅ 5) Render (Versi Sederhana untuk Solid Objects)
    GL.viewport(0,0,CANVAS.width,CANVAS.height);
    GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

    GL.uniformMatrix4fv(locations._Pmatrix,false,PROJMATRIX);
    GL.uniformMatrix4fv(locations._Vmatrix,false,VIEWMATRIX);
    GL.uniform3fv(locations._lightPosition,[5,5,8]);

    // Langsung render badan. State GL sudah diatur di awal.
    badan.render(LIBS.get_I4(), LIBS.get_I4());
    
    // ❌ Logika Tahap 1, Tahap 2, dan Cleanup Dihapus

    GL.flush();
    requestAnimationFrame(animate);
  }

  animate();
}

window.addEventListener('load', main);