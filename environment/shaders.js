// /environment/shaders.js

/* eslint-disable no-undef */

// Vertex shader: Standard transform, passes Color and Normal
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
varying vec3 vWorldPos;

void main(void) {
  vec4 worldPos = Mmatrix * vec4(position, 1.0);
  gl_Position = Pmatrix * Vmatrix * worldPos;

  vColor = color;
  vWorldPos = worldPos.xyz;
  
  // Use actual normals from the mesh (unlike the model which guessed them)
  // This ensures flat ground looks flat and rocks look round.
  vNormal = normalize(normalMatrix * normal);
}
`.trim();

// Fragment shader: Exact match to MegaSwampert lighting
// Ambient + 2 Directional Lights (Main + Backlight) + Specular
const FS_SOURCE = `
precision mediump float;

varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vWorldPos;

uniform vec3 uCameraPos;

// Lighting Uniforms (Matching the Model)
uniform vec3 uLightDir1;
uniform vec3 uLightCol1;
uniform vec3 uLightDir2;
uniform vec3 uLightCol2;
uniform float uAmbient;
uniform float uDiffuse;
uniform float uSpecular;
uniform float uShininess;

void main(void) {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPos - vWorldPos);

  // Light 1 (Main Sun)
  vec3 L1 = normalize(-uLightDir1);
  float diff1 = clamp(dot(N, L1) * 0.5 + 0.5, 0.0, 1.0);
  vec3 H1 = normalize(L1 + V);
  float spec1 = pow(max(dot(N, H1), 0.0), uShininess);

  // Light 2 (Backlight/Bounce)
  vec3 L2 = normalize(-uLightDir2);
  float diff2 = clamp(dot(N, L2) * 0.5 + 0.5, 0.0, 1.0);
  vec3 H2 = normalize(L2 + V);
  float spec2 = pow(max(dot(N, H2), 0.0), uShininess);

  // Combine
  vec3 ambient = uAmbient * vec3(1.0);
  vec3 diffuse = uDiffuse * (diff1 * uLightCol1 + 0.5 * diff2 * uLightCol2);
  vec3 specular = uSpecular * (spec1 * uLightCol1 + 0.5 * spec2 * uLightCol2);

  vec3 lighting = ambient + diffuse + specular;

  gl_FragColor = vec4(vColor * lighting, 1.0);
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
    
    // New Lighting Uniforms
    uCameraPos: gl.getUniformLocation(program, "uCameraPos"),
    uLightDir1: gl.getUniformLocation(program, "uLightDir1"),
    uLightCol1: gl.getUniformLocation(program, "uLightCol1"),
    uLightDir2: gl.getUniformLocation(program, "uLightDir2"),
    uLightCol2: gl.getUniformLocation(program, "uLightCol2"),
    uAmbient: gl.getUniformLocation(program, "uAmbient"),
    uDiffuse: gl.getUniformLocation(program, "uDiffuse"),
    uSpecular: gl.getUniformLocation(program, "uSpecular"),
    uShininess: gl.getUniformLocation(program, "uShininess"),
    
    // Legacy uniforms (kept to avoid crash if referenced, but unused)
    uUseEnvMap: gl.getUniformLocation(program, "uUseEnvMap"),
    uEnvMap: gl.getUniformLocation(program, "uEnvMap"),
    uSkyUpColor: gl.getUniformLocation(program, "uSkyUpColor"),
    uSkyDownColor: gl.getUniformLocation(program, "uSkyDownColor"),
    uBaseColor: gl.getUniformLocation(program, "uBaseColor"),
  };

  const api = { program, attribs, uniforms };
  CACHE.set(gl, api);
  return api;
}