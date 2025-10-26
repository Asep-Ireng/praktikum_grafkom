// mega_swampert_model.js - MODIFIED TO USE MUDKIP-STYLE LIGHTING
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
 * - Passes world position and calculated normal to fragment shader.
 */
const VS = `
attribute vec4 aVertexPosition;
attribute vec4 aVertexColor;

uniform mat4 uModelViewMatrix; // provided by Mega* draw
uniform mat4 uProjectionMatrix;
uniform mat4 uModelMatrix;     // world transform for current part

varying lowp vec4 vColor;
varying vec3 vWorldPos;
varying vec3 vApproxNormal; // This will now act like vNormal

void main(void) {
  // Clip position (pipeline expected by the modular parts)
  gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;

  vColor = aVertexColor;

  // World-space position for lighting calculations in FS
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
 * - Implements Mudkip's Phong-like lighting model
 * - Uses vApproxNormal (radial normal) for lighting calculations
 * - Ignores reflection/rim controls for simplicity, focusing on Mudkip's style
 */
const FS = `
precision mediump float;

varying lowp vec4 vColor;
varying vec3 vWorldPos;
varying vec3 vApproxNormal; // Now used for lighting

uniform vec3 uCameraPos; // From Mudkip's shader: viewPos
uniform vec3 uLightDir1; // From Mudkip's shader
uniform vec3 uLightCol1; // From Mudkip's shader
uniform vec3 uLightDir2; // From Mudkip's shader
uniform vec3 uLightCol2; // From Mudkip's shader
uniform float uAmbient;  // From Mudkip's shader
uniform float uDiffuse;  // From Mudkip's shader
uniform float uSpecular; // From Mudkip's shader
uniform float uShininess; // From Mudkip's shader

void main(void) {
  vec3 N = normalize(vApproxNormal); // Use our calculated radial normal
  vec3 V = normalize(uCameraPos - vWorldPos); // Vector from fragment to camera

  // Light 1 calculations (Mudkip style)
  vec3 L1 = normalize(-uLightDir1); // Light direction
  float diff1 = clamp(dot(N, L1) * 0.5 + 0.5, 0.0, 1.0); // Diffuse term
  vec3 H1 = normalize(L1 + V); // Halfway vector
  float spec1 = pow(max(dot(N, H1), 0.0), uShininess); // Specular term

  // Light 2 calculations (Mudkip style)
  vec3 L2 = normalize(-uLightDir2); // Light direction
  float diff2 = clamp(dot(N, L2) * 0.5 + 0.5, 0.0, 1.0); // Diffuse term
  vec3 H2 = normalize(L2 + V); // Halfway vector
  float spec2 = pow(max(dot(N, H2), 0.0), uShininess); // Specular term

  // Combine lighting components
  vec3 ambient = uAmbient * vec3(1.0);
  vec3 diffuse = uDiffuse * (diff1 * uLightCol1 + 0.5 * diff2 * uLightCol2);
  vec3 specular = uSpecular * (spec1 * uLightCol1 + 0.5 * spec2 * uLightCol2);
  vec3 lighting = ambient + diffuse + specular;

  vec3 finalColor = vColor.rgb * lighting;
  gl_FragColor = vec4(finalColor, vColor.a);
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

      // --- Mudkip-style lighting uniforms ---
      lightDir1: gl.getUniformLocation(program, "uLightDir1"),
      lightCol1: gl.getUniformLocation(program, "uLightCol1"),
      lightDir2: gl.getUniformLocation(program, "uLightDir2"),
      lightCol2: gl.getUniformLocation(program, "uLightCol2"),
      ambient: gl.getUniformLocation(program, "uAmbient"),
      diffuse: gl.getUniformLocation(program, "uDiffuse"),
      specular: gl.getUniformLocation(program, "uSpecular"),
      shininess: gl.getUniformLocation(program, "uShininess"),
      // --- END Mudkip lighting uniforms ---

      // Reflection controls (these are now ignored by the FS, but kept for compatibility/future)
      useEnvMap: gl.getUniformLocation(program, "uUseEnvMap"),
      envMap: gl.getUniformLocation(program, "uEnvMap"),
      skyUp: gl.getUniformLocation(program, "uSkyUpColor"),
      skyDown: gl.getUniformLocation(program, "uSkyDownColor"),
      reflectivity: gl.getUniformLocation(program, "uReflectivity"),
      rimStrength: gl.getUniformLocation(program, "uRimStrength"),
    },
  };

  // Set initial lighting/material defaults (matching Mudkip's typical settings)
  gl.useProgram(programInfo.program);
  gl.uniform3f(programInfo.uniformLocations.lightDir1, -0.35, 0.80, -0.55);
  gl.uniform3f(programInfo.uniformLocations.lightCol1, 1.00, 1.00, 1.00);
  gl.uniform3f(programInfo.uniformLocations.lightDir2, 0.40, -0.20, 0.60);
  gl.uniform3f(programInfo.uniformLocations.lightCol2, 0.70, 0.80, 1.00);
  gl.uniform1f(programInfo.uniformLocations.ambient, 0.45);
  gl.uniform1f(programInfo.uniformLocations.diffuse, 0.70);
  gl.uniform1f(programInfo.uniformLocations.specular, 0.20);
  gl.uniform1f(programInfo.uniformLocations.shininess, 22.0);

  // Original reflection defaults (still set, but FS no longer uses them directly)
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
  // This function still exists, but the FS now ignores these uniforms.
  function setReflection(opts = {}) {
    gl.useProgram(programInfo.program);
    // These calls will still update the uniforms, but the current FS doesn't use them.
    if (opts.reflectivity != null) gl.uniform1f(programInfo.uniformLocations.reflectivity, opts.reflectivity);
    if (opts.rimStrength != null) gl.uniform1f(programInfo.uniformLocations.rimStrength, opts.rimStrength);
    if (opts.skyUpColor) gl.uniform3f(programInfo.uniformLocations.skyUp, opts.skyUpColor[0], opts.skyUpColor[1], opts.skyUpColor[2]);
    if (opts.skyDownColor) gl.uniform3f(programInfo.uniformLocations.skyDown, opts.skyDownColor[0], opts.skyDownColor[1], opts.skyDownColor[2]);
  }

  // Optional: enable a cube map for true reflections
  // This function still exists, but the FS now ignores these uniforms.
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

  /**
   * Sets the lighting parameters for Mega Swampert, mimicking Mudkip's shader.
   * Call this from main.js inside the animation loop to keep lighting consistent.
   * @param {WebGLRenderingContext} gl
   * @param {object} mudkipLighting - object containing lightDir1, lightCol1, etc.
   */
  function setMudkipLighting(gl, mudkipLighting) {
      gl.useProgram(programInfo.program);
      gl.uniform3f(programInfo.uniformLocations.lightDir1, mudkipLighting.lightDir1[0], mudkipLighting.lightDir1[1], mudkipLighting.lightDir1[2]);
      gl.uniform3f(programInfo.uniformLocations.lightCol1, mudkipLighting.lightCol1[0], mudkipLighting.lightCol1[1], mudkipLighting.lightCol1[2]);
      gl.uniform3f(programInfo.uniformLocations.lightDir2, mudkipLighting.lightDir2[0], mudkipLighting.lightDir2[1], mudkipLighting.lightDir2[2]);
      gl.uniform3f(programInfo.uniformLocations.lightCol2, mudkipLighting.lightCol2[0], mudkipLighting.lightCol2[1], mudkipLighting.lightCol2[2]);
      gl.uniform1f(programInfo.uniformLocations.ambient, mudkipLighting.uAmbient);
      gl.uniform1f(programInfo.uniformLocations.diffuse, mudkipLighting.uDiffuse);
      gl.uniform1f(programInfo.uniformLocations.specular, mudkipLighting.uSpecular);
      gl.uniform1f(programInfo.uniformLocations.shininess, mudkipLighting.uShininess);
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

    // Head (offset above root)
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
    setMudkipLighting, // New function to update lighting
    // Expose rig APIs so an animation module can mutate them
    getRigs: () => ({
      head: headRig,
      torso: torsoRig,
      arms: armsRig,
      legs: legsRig,
    }),
    setPosition,
    setRotationEuler,
    setScale,
    setHeadOffset,
    setReflection, // Reflection properties are now ignored by FS, but API remains.
    setEnvMap,     // EnvMap is now ignored by FS, but API remains.
    clearEnvMap,   // ClearEnvMap is now ignored by FS, but API remains.
    getModelMatrix: () => model.modelMatrix,
    dispose,
  };
}