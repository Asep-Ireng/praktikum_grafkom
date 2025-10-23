import { MarshtompAnimator } from './marshtompAnimation.js';
import { createMarshtomp } from './marshtompMODEL.JS';

function main() {
  // ==================== SETUP WEBGL ====================
  
  const CANVAS = document.getElementById("mycanvas");
  CANVAS.width = window.innerWidth;
  CANVAS.height = window.innerHeight;

  const GL = CANVAS.getContext("webgl", {
    antialias: true,
    alpha: true,
    premultipliedAlpha: false
  });

  if (!GL) {
    alert("WebGL context cannot be initialized");
    return;
  }

  // ==================== SHADERS ====================

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
      gl_FragColor = vec4(srgb * u_color.a, u_color.a);
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

  // ==================== GL STATE ====================

  GL.enable(GL.DEPTH_TEST);
  GL.depthFunc(GL.LEQUAL);
  GL.enable(GL.BLEND);
  GL.blendFunc(GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
  GL.depthMask(true);
  GL.clearColor(0.1, 0.15, 0.2, 1);

  // ==================== CREATE MODEL ====================

  const { rootObject, animatableParts } = createMarshtomp(GL, LIBS, SHADER_PROGRAM, locations);

  // ==================== CREATE ANIMATOR ====================

  const animator = new MarshtompAnimator(LIBS, animatableParts);

  // ==================== CAMERA SETUP (TPS) ====================

  const PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 0.5, 100);
  const VIEWMATRIX = LIBS.get_I4();

  let tpsCamera = {
    distance: 8,
    height: 3,
    rotation: { yaw: 0, pitch: 0.3 },
    lookSpeed: 0.003,
    smoothing: 0.1
  };

  let cameraPosition = [0, 5, 10];
  let cameraTarget = [0, 0, 0];
  
  let keys = { w: false, a: false, s: false, d: false };
  let isPointerLocked = false;

  function updateCameraPosition() {
    const targetPos = [animator.position[0], animator.position[1] + 1.5, animator.position[2]];
    
    const cosP = Math.cos(tpsCamera.rotation.pitch);
    const sinP = Math.sin(tpsCamera.rotation.pitch);
    const cosY = Math.cos(tpsCamera.rotation.yaw + animator.bodyRotY);
    const sinY = Math.sin(tpsCamera.rotation.yaw + animator.bodyRotY);
    
    const desiredX = targetPos[0] - sinY * cosP * tpsCamera.distance;
    const desiredY = targetPos[1] + sinP * tpsCamera.distance + tpsCamera.height;
    const desiredZ = targetPos[2] + cosY * cosP * tpsCamera.distance;
    
    cameraPosition[0] += (desiredX - cameraPosition[0]) * tpsCamera.smoothing;
    cameraPosition[1] += (desiredY - cameraPosition[1]) * tpsCamera.smoothing;
    cameraPosition[2] += (desiredZ - cameraPosition[2]) * tpsCamera.smoothing;
    
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

  // ==================== INPUT HANDLERS ====================

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

  CANVAS.addEventListener('click', () => CANVAS.requestPointerLock());

  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === CANVAS;
    CANVAS.style.cursor = isPointerLocked ? 'none' : 'default';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isPointerLocked) return;
    tpsCamera.rotation.yaw -= e.movementX * tpsCamera.lookSpeed;
    tpsCamera.rotation.pitch -= e.movementY * tpsCamera.lookSpeed;
    const maxPitch = Math.PI / 2 - 0.1;
    tpsCamera.rotation.pitch = Math.max(-maxPitch, Math.min(maxPitch, tpsCamera.rotation.pitch));
  });

  CANVAS.addEventListener('wheel', (e) => {
    e.preventDefault();
    tpsCamera.distance += e.deltaY * 0.01;
    tpsCamera.distance = Math.max(3, Math.min(15, tpsCamera.distance));
  }, { passive: false });

  // ==================== RENDER LOOP ====================

  const ROOT = LIBS.get_I4();

  function buildRoot() {
    LIBS.set_I4(ROOT);
  }

  function animate() {
    // Update animation
    animator.update(keys);

    // Update camera and matrices
    buildRoot();
    buildView();

    // Render
    GL.viewport(0, 0, CANVAS.width, CANVAS.height);
    GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
    GL.uniformMatrix4fv(locations._Pmatrix, false, PROJMATRIX);
    GL.uniformMatrix4fv(locations._Vmatrix, false, VIEWMATRIX);
    GL.uniform3fv(locations._lightPosition, [5, 5, 8]);

    const ROOT_NORMAL = LIBS.getNormalMatrix(ROOT);
    rootObject.render(ROOT, ROOT_NORMAL);

    GL.flush();
    requestAnimationFrame(animate);
  }

  animate();
}

window.addEventListener('load', main);
