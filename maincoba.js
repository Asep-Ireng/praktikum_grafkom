import { Ellipsoid } from '../EllipsoidMarshtomp.js';
import { Cone } from '../ConeMarshtomp.js';
import { Hyperboloid } from '../HyperboloidMarshtomp.js';
import { Lathe } from '../LatheMarshtomp.js';


function main() {
  const CANVAS = document.getElementById("mycanvas");
  CANVAS.width = window.innerWidth;
  CANVAS.height = window.innerHeight;
  
  // ✅ FIX 1: WebGL Context TANPA alpha
  const GL = CANVAS.getContext("webgl", { 
    antialias: true,
    alpha: true,              
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
      v_surfaceToView  = u_cameraPosition - worldPosition;
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
      // gl_FragColor = vec4(srgb, u_color.a);
      gl_FragColor = vec4(srgb * u_color.a, u_color.a); // premultiply alpha
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

  // ✅ FIX 2: Setup GL State SEKALI di awal
  GL.enable(GL.DEPTH_TEST);
  GL.depthFunc(GL.LEQUAL);
  GL.enable(GL.BLEND);
  // GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
  GL.blendFunc(GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
  // GL.disable(GL.BLEND);        // ✅ Default: NO blending
  GL.depthMask(true);           // ✅ Default: depth writing ON
  // GL.clearColor(1, 1, 1, 1);
  GL.clearColor(0.1, 0.15, 0.2, 1);

  // ======================== OBJECTS ========================
  const badan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 1.1, b: 1.2, c: 0.8,
    color: [85/255, 185/255, 235/255, 1],
    shininess: 20
  });

  const kepalaAtas = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 1.0, b: 0.8, c: 0.75,
    color: [85/255, 185/255, 235/255, 1],
    shininess: 30,
    stack: 200,
    sectors: 200,
    y: 1.5,
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
    rx: LIBS.degToRad(5)
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

  // Shield hemisphere
  const shield = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    a: 5, b: 5, c: 5,
    color: [0.4, 0.8, 1.0, 0.5],
    shininess: 150,
    stack: 32,
    sectors: 32,
    u_min: 0,
    u_max: Math.PI/2,
    v_min: 0,
    v_max: 2 * Math.PI
  });

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
  badan.childs.push(kepalaAtas, perut, kakiKanan, kakiKiri, lenganKanan, lenganKiri, shield);

  badan.setup();

  const PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 0.5, 100);
  const VIEWMATRIX = LIBS.get_I4();

  // ==================== FPS CAMERA SETUP ====================

  // Variabel global untuk FPS camera
  let tpsCamera = {
      offset: [0, 2, 5],        // offset dari target (x, y, z)
      distance: 8,              // jarak dari karakter
      height: 3,                // tinggi kamera
      rotation: {
        yaw: 0,                 // rotasi horizontal
        pitch: 0.3              // rotasi vertikal (slight look down)
      },
      lookSpeed: 0.003,
      smoothing: 0.1            // camera smoothing (0-1, smaller = smoother)
  };

  // Target point yang dihitung dari rotation
  let cameraPosition = [0, 5, 10];
  let cameraTarget = [0, 0, 0];

  // Keyboard state
  let keys = {
    w: false,
    a: false,
    s: false,
    d: false
  };

  // Mouse control
  let isPointerLocked = false;

  // ==================== CAMERA FUNCTIONS ====================

  function updateCameraPosition() {
    //Target adlaah posisi karakter
    const targetPos = [position[0], position[1] + 1.5, position[2]];

    // Hitung arah pandangan dari yaw dan pitch
    const cosP = Math.cos(tpsCamera.rotation.pitch);
    const sinP = Math.sin(tpsCamera.rotation.pitch);
    const cosY = Math.cos(tpsCamera.rotation.yaw + bodyRotY);
    const sinY = Math.sin(tpsCamera.rotation.yaw + bodyRotY);

    //Desired camera position
    const desiredX = targetPos[0] - sinY * cosP * tpsCamera.distance;
    const desiredY = targetPos[1] + sinP * tpsCamera.distance + tpsCamera.height;
    const desiredZ = targetPos[2] + cosY * cosP * tpsCamera.distance;
    
    // Smooth camera movement (lerp)
    cameraPosition[0] += (desiredX - cameraPosition[0]) * tpsCamera.smoothing;
    cameraPosition[1] += (desiredY - cameraPosition[1]) * tpsCamera.smoothing;
    cameraPosition[2] += (desiredZ - cameraPosition[2]) * tpsCamera.smoothing;
    
    // Camera always looks at character
    cameraTarget[0] = targetPos[0];
    cameraTarget[1] = targetPos[1];
    cameraTarget[2] = targetPos[2];
  }

  function buildView() {
    updateCameraPosition();
    LIBS.set_I4(VIEWMATRIX);
    LIBS.lookAt(VIEWMATRIX, cameraPosition, cameraTarget, [0, 1, 0]);
    GL.uniform3fv(locations._cameraPosition, cameraPosition);
  }

  function updateCharacterMovement() {
    const speed = 0.08;
    
    // Hitung direction berdasarkan camera rotation
    const yaw = tpsCamera.rotation.yaw + bodyRotY;
    const forwardX = Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = Math.sin(yaw);
    
    let moveX = 0, moveZ = 0;
    
    // W - maju (relatif ke arah kamera)
    if (keys.w) {
      moveX += forwardX;
      moveZ += forwardZ;
    }
    // S - mundur
    if (keys.s) {
      moveX -= forwardX;
      moveZ -= forwardZ;
    }
    // A - strafe kiri
    if (keys.a) {
      moveX -= rightX;
      moveZ -= rightZ;
    }
    // D - strafe kanan
    if (keys.d) {
      moveX += rightX;
      moveZ += rightZ;
    }
    
    // Normalize movement vector
    if (moveX !== 0 || moveZ !== 0) {
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      moveX /= len;
      moveZ /= len;
      
      // Update position (hanya saat manual control)
      if (state === STATE.IDLE || state === STATE.SHIELD_HOLD) {
        position[0] += moveX * speed;
        position[2] += moveZ * speed;
        
        // Rotate character to face movement direction
        bodyRotY = Math.atan2(moveX, -moveZ);
      }
    }
  }

  // ==================== EVENT HANDLERS ====================

  function setupTPSControls(canvas) {
    // Keyboard events
    document.addEventListener('keydown', (e) => {
      switch(e.code) {
        case 'KeyW': keys.w = true; break;
        case 'KeyA': keys.a = true; break;
        case 'KeyS': keys.s = true; break;
        case 'KeyD': keys.d = true; break;
      }
    });
    
    document.addEventListener('keyup', (e) => {
      switch(e.code) {
        case 'KeyW': keys.w = false; break;
        case 'KeyA': keys.a = false; break;
        case 'KeyS': keys.s = false; break;
        case 'KeyD': keys.d = false; break;
      }
    });
    
    // Mouse look - klik untuk lock pointer
    CANVAS.addEventListener('click', () => {
      CANVAS.requestPointerLock();
    });
    
    // Pointer lock change event
    document.addEventListener('pointerlockchange', () => {
      isPointerLocked = document.pointerLockElement === CANVAS;
      if(isPointerLocked){
        CANVAS.style.cursor='none';
      }else{
        CANVAS.style.cursor = 'default';
      }
    });
    
    // Mouse movement untuk look around
    document.addEventListener('mousemove', (e) => {
      if (!isPointerLocked) return;
      
      // Update rotation berdasarkan mouse movement
      tpsCamera.rotation.yaw += e.movementX * tpsCamera.lookSpeed;
      tpsCamera.rotation.pitch -= e.movementY * tpsCamera.lookSpeed;
      
      tpsCamera.rotation.pitch = Math.max(-maxPitch, Math.min(maxPitch, tpsCamera.rotation.pitch));
    });
    
    // Mouse wheel untuk zoom in.out
    CANVAS.addEventListener('wheel', (e) => {
      e.preventDefault();
      tpsCamera.distance += e.deltaY * 0.01;
      tpsCamera.distance = Math.max(3, Math.min(15, tpsCamera.distance));
    }, {passive: false});
  }

  setupTPSControls();

  cameraPosition = [0, tpsCamera.height, tpsCamera.distance];

  const ROOT = LIBS.get_I4();

  function buildRoot() {
    LIBS.set_I4(ROOT);
    // No rotation - model stays at center
  }

  // ================= State & Animation =================
  let bodyRotY = 0, bodyRotX = 0;
  let position = [0, 0, -15];
  let badanBaseY = 0;

  const STATE = {
    RUNNING: 0,
    JUMP_BACK: 1,
    IDLE: 2,
    SHIELD_ACTIVATE: 3,
    SHIELD_HOLD: 4
  };
  let state = STATE.RUNNING;
  const RunSpeed = 3.0;
  const JumpDur = 0.7, JumpBackDist = 5.0, JumpHeight = 1.8;
  let jumpCount = 0, totalJumps = 2, jumpT = 0;
  let runTimer = 0, runDur = 1.6;

  let idleTimer = 0;
  const idleBeforeShieldDur = 2.0;

  let shieldActivateT = 0;
  const shieldActivateDur = 1.2;
  const shieldHoldDur = 2.5;
  let shieldHoldTimer = 0;
  let shieldScale = 0.0;

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

  function poseShieldActivate(tNorm) {
    const spreadAngle = tNorm * LIBS.degToRad(70);
    const upAngle = tNorm * LIBS.degToRad(-80);

    LIBS.set_I4(lenganKanan.MOVE_MATRIX);
    LIBS.rotateX(lenganKanan.MOVE_MATRIX, upAngle);
    LIBS.rotateZ(lenganKanan.MOVE_MATRIX, spreadAngle);

    LIBS.set_I4(lenganKiri.MOVE_MATRIX);
    LIBS.rotateX(lenganKiri.MOVE_MATRIX, upAngle);
    LIBS.rotateZ(lenganKiri.MOVE_MATRIX, -spreadAngle);

    LIBS.set_I4(kakiKanan.MOVE_MATRIX);
    LIBS.set_I4(kakiKiri.MOVE_MATRIX);

    const headLookUp = tNorm * LIBS.degToRad(-10);
    LIBS.set_I4(kepalaAtas.MOVE_MATRIX);
    LIBS.rotateX(kepalaAtas.MOVE_MATRIX, headLookUp);

    const easeOutCubic = 1 - Math.pow(1 - tNorm, 3);
    shieldScale = easeOutCubic;
  }

  function poseShieldHold(t) {
    const spreadAngle = LIBS.degToRad(70);
    const upAngle = LIBS.degToRad(-80);

    LIBS.set_I4(lenganKanan.MOVE_MATRIX);
    LIBS.rotateX(lenganKanan.MOVE_MATRIX, upAngle);
    LIBS.rotateZ(lenganKanan.MOVE_MATRIX, spreadAngle);

    LIBS.set_I4(lenganKiri.MOVE_MATRIX);
    LIBS.rotateX(lenganKiri.MOVE_MATRIX, upAngle);
    LIBS.rotateZ(lenganKiri.MOVE_MATRIX, -spreadAngle);

    LIBS.set_I4(kakiKanan.MOVE_MATRIX);
    LIBS.set_I4(kakiKiri.MOVE_MATRIX);

    LIBS.set_I4(kepalaAtas.MOVE_MATRIX);
    LIBS.rotateX(kepalaAtas.MOVE_MATRIX, LIBS.degToRad(-10));

    const pulseSpeed = 2.5;
    const pulseAmp = 0.05;
    const pulse = 1.0 + Math.sin(t * pulseSpeed) * pulseAmp;
    shieldScale = pulse;

    const breathSpeed = 1.5;
    const breathAmp = 0.02;
    const breathOffset = Math.sin(t * breathSpeed) * breathAmp;
    position[1] = badanBaseY + breathOffset;
  }

  let lastTime = performance.now() / 1000;

  function animate(currenTime) {
    const now = performance.now() / 1000;
    const dt = Math.min(0.033, now - lastTime);
    lastTime = now;

    updateCharacterMovement();

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
      if (idleTimer >= idleBeforeShieldDur) {
        state = STATE.SHIELD_ACTIVATE;
        shieldActivateT = 0;
        shieldHoldTimer = 0;
      }
    }
    else if (state === STATE.SHIELD_ACTIVATE) {
      shieldActivateT = Math.min(1, shieldActivateT + dt / shieldActivateDur);
      if (shieldActivateT >= 1) {
        state = STATE.SHIELD_HOLD;
        shieldHoldTimer = 0;
      }
    }
    else if (state === STATE.SHIELD_HOLD) {
      shieldHoldTimer += dt;
      if (shieldHoldTimer >= shieldHoldDur) {
        state = STATE.RUNNING;
        runTimer = 0;
        jumpCount = 0;
        shieldScale = 0;
        idleTimer = 0;
      }
    }

    if (state === STATE.RUNNING) {
      poseRunning(now);
      shieldScale = 0;
    } else if (state === STATE.JUMP_BACK) {
      poseJump(jumpT);
      shieldScale = 0;
    } else if (state === STATE.IDLE) {
      poseIdle(now);
      shieldScale = 0;
    } else if (state === STATE.SHIELD_ACTIVATE) {
      poseShieldActivate(shieldActivateT);
    } else if (state === STATE.SHIELD_HOLD) {
      poseShieldHold(now);
    }

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

    LIBS.set_I4(shield.MOVE_MATRIX);
    LIBS.translateY(shield.MOVE_MATRIX, -1.2);
    const m = shield.MOVE_MATRIX;
    for (let i = 0; i < 12; i++) {
      m[i] *= shieldScale;
    }
    buildRoot();
    buildView(); //TPS camera follows character

    // 5) Render
    GL.viewport(0,0,CANVAS.width,CANVAS.height);
    GL.clear(GL.COLOR_BUFFER_BIT|GL.DEPTH_BUFFER_BIT); // Ini sudah benar

    GL.uniformMatrix4fv(locations._Pmatrix,false,PROJMATRIX);
    GL.uniformMatrix4fv(locations._Vmatrix,false,VIEWMATRIX);
    GL.uniform3fv(locations._lightPosition,[5,5,8]);

    const ROOT_NORMAL = LIBS.getNormalMatrix(ROOT);
    badan.render(ROOT, ROOT_NORMAL); // Render model solid Anda
    
    GL.flush();
    requestAnimationFrame(animate);
  }
  animate();
}

window.addEventListener('load', main);
