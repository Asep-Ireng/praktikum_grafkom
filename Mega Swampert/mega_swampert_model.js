// mega_swampert_model.js
// Prettier print width: 80

/* eslint-disable no-undef */

/**
 * Requires gl-matrix (mat4) either on globalThis.mat4 or
 * globalThis.glMatrix.mat4
 * Requires MegaTorso, MegaLegs, MegaArms, MegaHead globally (UMD scripts)
 */

const _mat4 =
  (globalThis.glMatrix && globalThis.glMatrix.mat4) || globalThis.mat4;

if (!_mat4) {
  throw new Error(
    "[MegaSwampert] gl-matrix not found. Include gl-matrix before this module."
  );
}

function createProgram(gl, vs, fs) {
  const v = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(v, vs);
  gl.compileShader(v);
  if (!gl.getShaderParameter(v, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(v);
    gl.deleteShader(v);
    throw new Error(`[MegaSwampert] VS compile error: ${log || "unknown"}`);
  }

  const f = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(f, fs);
  gl.compileShader(f);
  if (!gl.getShaderParameter(f, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(f);
    gl.deleteShader(f);
    gl.deleteShader(v);
    throw new Error(`[MegaSwampert] FS compile error: ${log || "unknown"}`);
  }

  const p = gl.createProgram();
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  gl.deleteShader(v);
  gl.deleteShader(f);

  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(
      `[MegaSwampert] Program link error: ${log || "unknown"}`
    );
  }

  return p;
}

/**
 * Vertex shader:
 * - position + color only (matches Mega* modules)
 * - computes world position using uModelMatrix (per-part)
 * - computes radial approximate normal from part origin in world space
 */
const VS = `
attribute vec4 aVertexPosition;
attribute vec4 aVertexColor;

uniform mat4 uModelViewMatrix; // provided by Mega* draw
uniform mat4 uProjectionMatrix;
uniform mat4 uModelMatrix;     // world transform for current part

varying lowp vec4 vColor;
varying vec3 vWorldPos;
varying vec3 vApproxNormal;

void main(void) {
  // Clip position (pipeline expected by the modular parts)
  gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;

  vColor = aVertexColor;

  // World-space position for reflection/rim
  vec4 wpos4 = uModelMatrix * aVertexPosition;
  vWorldPos = wpos4.xyz;

  // Part origin in world space (uModelMatrix * (0,0,0,1))
  vec3 origin = (uModelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;

  // Radial normal from part origin (stylized but coherent for this model)
  vec3 n = vWorldPos - origin;
  float len = max(length(n), 1e-6);
  vApproxNormal = n / len;
}
`.trim();

/**
 * Fragment shader:
 * - Fresnel reflection with optional cube map
 * - Procedural sky/ground fallback if no env map
 * - Rim light
 */
const FS = `
precision mediump float;

varying lowp vec4 vColor;
varying vec3 vWorldPos;
varying vec3 vApproxNormal;

uniform vec3 uCameraPos;

// Reflection controls (global-ish)
uniform bool  uUseEnvMap;
uniform samplerCube uEnvMap;

uniform vec3  uSkyUpColor;
uniform vec3  uSkyDownColor;
uniform float uReflectivity;   // base reflectivity 0..1
uniform float uRimStrength;    // 0..1

// Helpers
float fresnelSchlick(float cosTheta, float F0) {
  return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

vec3 fakeEnvColor(vec3 dir) {
  // Simple procedural sky/ground
  float t = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 sky = mix(uSkyDownColor, uSkyUpColor, t);
  vec3 ground = uSkyDownColor;
  return mix(ground, sky, step(0.0, dir.y));
}

void main(void) {
  vec3 N = normalize(vApproxNormal);
  vec3 V = normalize(uCameraPos - vWorldPos);
  vec3 R = reflect(-V, N);

  vec3 envCol = uUseEnvMap ? textureCube(uEnvMap, R).rgb : fakeEnvColor(R);

  // Fresnel based on view angle
  float F = fresnelSchlick(max(dot(N, V), 0.0), clamp(uReflectivity, 0.0, 1.0));

  // Rim to accent silhouette
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * uRimStrength;

  vec3 base = vColor.rgb;
  vec3 mixed = mix(base, envCol, F) + rim;

  gl_FragColor = vec4(clamp(mixed, 0.0, 1.0), vColor.a);
}
`.trim();

/**
 * Create a grouped Mega Swampert model with reflections and a single root
 * transform. You can move/rotate/scale the whole character easily.
 *
 * @param {WebGLRenderingContext} gl
 * @param {object} [options]
 * @param {number[]} [options.headOffset=[0,1.55,0.8]] Local head offset
 * @param {number[]} [options.position=[0,0,0]]
 * @param {number[]} [options.rotationEuler=[0,0,0]] Radians [rx, ry, rz]
 * @param {number[]} [options.scale=[1,1,1]]
 */
export function createMegaSwampertModel(gl, options = {}) {
  const mat4 = _mat4;

  if (
    !globalThis.MegaTorso ||
    !globalThis.MegaLegs ||
    !globalThis.MegaArms ||
    !globalThis.MegaHead
  ) {
    throw new Error(
      "[MegaSwampert] Missing parts. Load mega_torso.js, mega_legs.js, mega_arms.js, mega_head.js first."
    );
  }

  const {
    headOffset = [0.0, 1.55, 0.8],
    position = [0, 0, 0],
    rotationEuler = [0, 0, 0],
    scale = [1, 1, 1],
  } = options;

  const program = createProgram(gl, VS, FS);
  const programInfo = {
    program,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(program, "aVertexPosition"),
      vertexColor: gl.getAttribLocation(program, "aVertexColor"),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(program, "uProjectionMatrix"),
      modelViewMatrix: gl.getUniformLocation(program, "uModelViewMatrix"),
      modelMatrix: gl.getUniformLocation(program, "uModelMatrix"),
      cameraPos: gl.getUniformLocation(program, "uCameraPos"),
      // reflection controls
      useEnvMap: gl.getUniformLocation(program, "uUseEnvMap"),
      envMap: gl.getUniformLocation(program, "uEnvMap"),
      skyUp: gl.getUniformLocation(program, "uSkyUpColor"),
      skyDown: gl.getUniformLocation(program, "uSkyDownColor"),
      reflectivity: gl.getUniformLocation(program, "uReflectivity"),
      rimStrength: gl.getUniformLocation(program, "uRimStrength"),
    },
  };

  // Sensible defaults (match your global environment look)
  gl.useProgram(programInfo.program);
  gl.uniform1i(programInfo.uniformLocations.useEnvMap, 0);
  gl.uniform3f(programInfo.uniformLocations.skyUp, 0.58, 0.74, 0.96);
  gl.uniform3f(programInfo.uniformLocations.skyDown, 0.24, 0.2, 0.16);
  gl.uniform1f(programInfo.uniformLocations.reflectivity, 0.08);
  gl.uniform1f(programInfo.uniformLocations.rimStrength, 0.1);

  // Init parts (geometry buffers)
  const torso = globalThis.MegaTorso.init(gl);
  const legs = globalThis.MegaLegs.init(gl);
  const arms = globalThis.MegaArms.init(gl);
  const head = globalThis.MegaHead.init(gl);

  // Poses + Rig APIs (animation mutates these every frame)
  const headPose = globalThis.MegaHead.createPose();
  const torsoPose = globalThis.MegaTorso.createPose();
  const armsPose = globalThis.MegaArms.createPose();
  const legsPose = globalThis.MegaLegs.createPose();

  const headRig = globalThis.MegaHead.makePoseAPI(headPose);
  const torsoRig = globalThis.MegaTorso.makePoseAPI(torsoPose);
  const armsRig = globalThis.MegaArms.makePoseAPI(armsPose);
  const legsRig = globalThis.MegaLegs.makePoseAPI(legsPose);

  // Root transform (grouping)
  const model = {
    position: position.slice(),
    rotationEuler: rotationEuler.slice(),
    scale: scale.slice(),
    headOffset: headOffset.slice(),
    modelMatrix: mat4.create(),
  };

  function updateModelMatrix() {
    const m = mat4.create();
    mat4.translate(m, m, model.position);
    mat4.rotateX(m, m, model.rotationEuler[0]);
    mat4.rotateY(m, m, model.rotationEuler[1]);
    mat4.rotateZ(m, m, model.rotationEuler[2]);
    mat4.scale(m, m, model.scale);
    model.modelMatrix = m;
  }
  updateModelMatrix();

  function setPosition(x, y, z) {
    model.position[0] = x;
    model.position[1] = y;
    model.position[2] = z;
    updateModelMatrix();
  }

  function setRotationEuler(rx, ry, rz) {
    model.rotationEuler[0] = rx;
    model.rotationEuler[1] = ry;
    model.rotationEuler[2] = rz;
    updateModelMatrix();
  }

  function setScale(sx, sy, sz) {
    model.scale[0] = sx;
    model.scale[1] = sy;
    model.scale[2] = sz;
    updateModelMatrix();
  }

  function setHeadOffset(x, y, z) {
    model.headOffset[0] = x;
    model.headOffset[1] = y;
    model.headOffset[2] = z;
  }

  // Optional: control reflection/rim at runtime
  function setReflection(opts = {}) {
    gl.useProgram(programInfo.program);
    if (opts.reflectivity != null) {
      gl.uniform1f(
        programInfo.uniformLocations.reflectivity,
        opts.reflectivity
      );
    }
    if (opts.rimStrength != null) {
      gl.uniform1f(
        programInfo.uniformLocations.rimStrength,
        opts.rimStrength
      );
    }
    if (opts.skyUpColor) {
      gl.uniform3f(
        programInfo.uniformLocations.skyUp,
        opts.skyUpColor[0],
        opts.skyUpColor[1],
        opts.skyUpColor[2]
      );
    }
    if (opts.skyDownColor) {
      gl.uniform3f(
        programInfo.uniformLocations.skyDown,
        opts.skyDownColor[0],
        opts.skyDownColor[1],
        opts.skyDownColor[2]
      );
    }
  }

  // Optional: enable a cube map for true reflections
  function setEnvMap(texture, unit = 0) {
    gl.useProgram(programInfo.program);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    gl.uniform1i(programInfo.uniformLocations.envMap, unit);
    gl.uniform1i(programInfo.uniformLocations.useEnvMap, 1);
  }
  function clearEnvMap() {
    gl.useProgram(programInfo.program);
    gl.uniform1i(programInfo.uniformLocations.useEnvMap, 0);
  }

  // Draw the grouped character with given projection and view matrices
  function draw(projectionMatrix, viewMatrix) {
    // Build modelView from view * model
    const modelViewRoot = mat4.create();
    mat4.multiply(modelViewRoot, viewMatrix, model.modelMatrix);

    // Camera position from inverse view
    const invView = mat4.create();
    mat4.invert(invView, viewMatrix);
    const camX = invView[12];
    const camY = invView[13];
    const camZ = invView[14];

    gl.useProgram(programInfo.program);
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix
    );
    gl.uniform3f(programInfo.uniformLocations.cameraPos, camX, camY, camZ);

    // Helper: upload current part world matrix (for reflections)
    const partModel = mat4.create();

    // Torso
    mat4.multiply(partModel, invView, modelViewRoot); // == model matrix
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelMatrix,
      false,
      partModel
    );
    globalThis.MegaTorso.draw(
      gl,
      programInfo,
      torso,
      modelViewRoot,
      undefined,
      torsoPose
    );

    // Head (offset above root) — not rigged here
    const headModelView = mat4.clone(modelViewRoot);
    _mat4.translate(headModelView, headModelView, model.headOffset);
    mat4.multiply(partModel, invView, headModelView);
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelMatrix,
      false,
      partModel
    );
    globalThis.MegaHead.draw(
      gl, 
      programInfo,
       head,
        headModelView,
        undefined,
        headPose);

    // Legs
    mat4.multiply(partModel, invView, modelViewRoot);
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelMatrix,
      false,
      partModel
    );
    globalThis.MegaLegs.draw(
      gl,
      programInfo,
      legs,
      modelViewRoot,
      undefined,
      legsPose
    );

    // Arms
    mat4.multiply(partModel, invView, modelViewRoot);
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelMatrix,
      false,
      partModel
    );
    globalThis.MegaArms.draw(
      gl,
      programInfo,
      arms,
      modelViewRoot,
      undefined,
      armsPose,
      viewMatrix,
    );
  }

  function dispose() {
    // If your part modules expose .destroy(gl, part) you can call them here.
    // gl.deleteProgram(program);
  }

  return {
    programInfo, // exposed in case you want advanced control
    parts: { torso, legs, arms, head },
    draw,
    // Expose rig APIs so an animation module can mutate them
    getRigs: () => ({
      head: headRig,
      torso: torsoRig,
      arms: armsRig,
      legs: legsRig,
      // head: headRig (add when you rig the head)
    }),
    setPosition,
    setRotationEuler,
    setScale,
    setHeadOffset,
    setReflection,
    setEnvMap,
    clearEnvMap,
    getModelMatrix: () => model.modelMatrix,
    dispose,
  };
}