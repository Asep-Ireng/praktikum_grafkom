// /environment/shaders.js

/* eslint-disable no-undef */

// Vertex shader: world-space position/normal, per-vertex color
const VS_SOURCE = `
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
}
`.trim();

// Fragment shader: one global "sun", hemispheric sky, Fresnel rim,
// optional cubemap reflections, and a procedural env fallback.
// Reflectivity is global and biased higher for flatter surfaces.
const FS_SOURCE = `
precision mediump float;

varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vFragPos;

uniform vec3 viewPos;

// Global sun
uniform vec3 uSunDir;     // direction TO sun (will use -dir for lighting)
uniform vec3 uSunColor;   // sun color/intensity

// Hemispheric sky
uniform vec3 uSkyUpColor;    // zenith color
uniform vec3 uSkyDownColor;  // ground/bounce color
uniform float uAmbientStrength; // flat ambient add

// Global material/reflection
uniform vec3  uBaseColor;       // global tint multiply
uniform float uReflectivityBase; // base reflectivity 0..1
uniform float uReflectFlatBias;  // extra reflectivity for flat surfaces (0..1)
uniform float uRoughness;        // 0..1 (spec width)
uniform float uRimStrength;      // 0..1
uniform vec3  uRimColor;

// Environment map (optional)
uniform bool        uUseEnvMap;
uniform samplerCube uEnvMap;

// Procedural fallback env colors
const vec3 SKY_TOP     = vec3(0.55, 0.72, 0.98);
const vec3 SKY_HORIZON = vec3(0.90, 0.93, 1.00);
const vec3 GROUND_COL  = vec3(0.10, 0.09, 0.08);

// Helpers
float fresnelSchlick(float cosTheta, float F0) {
  return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
float roughnessToShininess(float r) {
  return mix(128.0, 4.0, clamp(r, 0.0, 1.0));
}
vec3 fakeEnvColor(vec3 dir) {
  float t = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 sky = mix(SKY_HORIZON, SKY_TOP, t);
  vec3 ground = GROUND_COL;
  return mix(ground, sky, step(0.0, dir.y));
}

void main(void) {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(viewPos - vFragPos);

  // Sun light (directional)
  vec3 Ls = normalize(-uSunDir); // light comes FROM -uSunDir
  float NdotL = max(dot(N, Ls), 0.0);

  // Blinn-Phong specular from sun
  float shininess = roughnessToShininess(uRoughness);
  vec3 H = normalize(Ls + V);
  float specSun = pow(max(dot(N, H), 0.0), shininess);

  // Hemispheric diffuse from sky (based on up/down facing)
  float up = clamp(N.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 hemi = mix(uSkyDownColor, uSkyUpColor, up);

  // Classic components
  vec3 ambient  = uAmbientStrength * vec3(1.0);
  vec3 diffuse  = hemi * (0.35 + 0.65 * NdotL); // hemi + sun influence
  vec3 specular = uSunColor * specSun * 0.75;

  // Rim light (Fresnel-ish)
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * uRimStrength;
  vec3 rimTerm = rim * uRimColor;

  // Base color and lighting
  vec3 base = vColor * uBaseColor;
  vec3 lit = ambient + diffuse + specular;
  vec3 litBase = base * lit + rimTerm;

  // Reflections: slope-based bias so flatter surfaces reflect more
  float flatness = 1.0 - abs(N.y); // 0 vertical wall, 1 flat horizontal
  float reflectivity = clamp(uReflectivityBase + uReflectFlatBias * flatness, 0.0, 1.0);

  vec3 R = reflect(-V, N);
  vec3 envCol = uUseEnvMap ? textureCube(uEnvMap, R).rgb : fakeEnvColor(R);

  // Fresnel weighted mixing
  float F = fresnelSchlick(max(dot(N, V), 0.0), reflectivity);
  vec3 finalCol = mix(litBase, envCol, F);

  gl_FragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
}
`.trim();

function compile(gl, type, src, label) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`[env-shaders] ${label} compile: ${log || "unknown"}`);
  }
  return sh;
}
function link(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(`[env-shaders] link: ${log || "unknown"}`);
  }
  return p;
}

const CACHE = new WeakMap();

/**
 * Returns:
 * {
 *   program,
 *   attribs: { position, color, normal },
 *   uniforms: {
 *     Pmatrix, Vmatrix, Mmatrix, normalMatrix, viewPos,
 *     uSunDir, uSunColor,
 *     uSkyUpColor, uSkyDownColor, uAmbientStrength,
 *     uBaseColor, uReflectivityBase, uReflectFlatBias, uRoughness,
 *     uRimStrength, uRimColor,
 *     uUseEnvMap, uEnvMap
 *   }
 * }
 */
export function createEnvShaders(gl) {
  const hit = CACHE.get(gl);
  if (hit) return hit;

  const vs = compile(gl, gl.VERTEX_SHADER, VS_SOURCE, "VS");
  const fs = compile(gl, gl.FRAGMENT_SHADER, FS_SOURCE, "FS");
  const program = link(gl, vs, fs);

  const attribs = {
    position: gl.getAttribLocation(program, "position"),
    color: gl.getAttribLocation(program, "color"),
    normal: gl.getAttribLocation(program, "normal"),
  };

  const uniforms = {
    Pmatrix: gl.getUniformLocation(program, "Pmatrix"),
    Vmatrix: gl.getUniformLocation(program, "Vmatrix"),
    Mmatrix: gl.getUniformLocation(program, "Mmatrix"),
    normalMatrix: gl.getUniformLocation(program, "normalMatrix"),
    viewPos: gl.getUniformLocation(program, "viewPos"),

    uSunDir: gl.getUniformLocation(program, "uSunDir"),
    uSunColor: gl.getUniformLocation(program, "uSunColor"),

    uSkyUpColor: gl.getUniformLocation(program, "uSkyUpColor"),
    uSkyDownColor: gl.getUniformLocation(program, "uSkyDownColor"),
    uAmbientStrength: gl.getUniformLocation(program, "uAmbientStrength"),

    uBaseColor: gl.getUniformLocation(program, "uBaseColor"),
    uReflectivityBase: gl.getUniformLocation(program, "uReflectivityBase"),
    uReflectFlatBias: gl.getUniformLocation(program, "uReflectFlatBias"),
    uRoughness: gl.getUniformLocation(program, "uRoughness"),
    uRimStrength: gl.getUniformLocation(program, "uRimStrength"),
    uRimColor: gl.getUniformLocation(program, "uRimColor"),

    uUseEnvMap: gl.getUniformLocation(program, "uUseEnvMap"),
    uEnvMap: gl.getUniformLocation(program, "uEnvMap"),
  };

  const api = { program, attribs, uniforms };
  CACHE.set(gl, api);
  return api;
}

/**
 * Compute normal matrix (inverse-transpose of upper-left 3x3 of model).
 * out must be Float32Array(9). model is Float32Array(16).
 */
export function computeNormalMatrix(out, model) {
  const a00 = model[0], a01 = model[1], a02 = model[2];
  const a10 = model[4], a11 = model[5], a12 = model[6];
  const a20 = model[8], a21 = model[9], a22 = model[10];

  const b01 = a22 * a11 - a12 * a21;
  const b11 = -a22 * a10 + a12 * a20;
  const b21 = a21 * a10 - a11 * a20;

  let det = a00 * b01 + a01 * b11 + a02 * b21;
  if (!det) {
    out[0] = 1; out[1] = 0; out[2] = 0;
    out[3] = 0; out[4] = 1; out[5] = 0;
    out[6] = 0; out[7] = 0; out[8] = 1;
    return out;
  }
  det = 1.0 / det;

  out[0] = b01 * det;
  out[1] = (-a22 * a01 + a02 * a21) * det;
  out[2] = (a12 * a01 - a02 * a11) * det;

  out[3] = b11 * det;
  out[4] = (a22 * a00 - a02 * a20) * det;
  out[5] = (-a12 * a00 + a02 * a10) * det;

  out[6] = b21 * det;
  out[7] = (-a21 * a00 + a01 * a20) * det;
  out[8] = (a11 * a00 - a01 * a10) * det;

  // transpose
  const t01 = out[1], t02 = out[2], t12 = out[5];
  out[1] = out[3];
  out[2] = out[6];
  out[3] = t01;
  out[5] = out[7];
  out[6] = t02;
  out[7] = t12;

  return out;
}