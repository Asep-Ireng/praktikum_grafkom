

1. inverted sphere skybox with texture
2. tiled ground plane
3. waterfall made from a scrolling flow texture + normalmap-based lighting/refraction illusion
4. small particle splash idea + render-order / GL state tips

I'll keep it straightforward so you can plug the pieces into your existing render loop.

---

# Plan (short)

* **Sky**: big sphere centered on camera, normals inverted, depth write off (or draw first with depth test but move camera inside). Use single textured fragment shader. Animate if desired (slow rotation).
* **Ground**: flat plane, tiled UVs, standard diffuse + tiling.
* **Waterfall**: single vertical quad (or set of overlapping quads) with a **flow** texture and a **flow normal map**. In the fragment shader:

  * scroll UVs with time to simulate falling water,
  * use normal map to perturb lighting and to offset sampling of a background/reflection texture (simple fake refraction),
  * alpha-blend with soft alpha mask (noise) so edges look wispy.
* **Particles**: basic GPU/CPU particle system that spawns points at waterfall base (gravity + upward splash impulse). Render as additive textured point sprites or small quads.
* **Render order & GL states**:

  * Sky first (depth write off, depth test less-equal ok).
  * Ground and opaque models next (depth write on).
  * Waterfall (alpha blended) last. Enable `gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);` and **disable depth write** for waterfall (`gl.depthMask(false)`) so semi-transparent parts don't incorrectly occlude. For particles use additive blend (`gl.blendFunc(gl.SRC_ALPHA, gl.ONE)`).

---

# Key snippets

> Note: assumes you already have WebGL init, shader compile/link helpers, and a texture loader.

## 1) Sky sphere (geometry + simple shader)

Create a latitude-longitude sphere with inverted normals (or multiply normal by -1 in vertex shader).

Vertex shader (sky):

```glsl
attribute vec3 aPosition;
attribute vec2 aUV;
uniform mat4 uViewProj; // use camera's view * proj but remove translation from view so sphere follows camera
varying vec2 vUV;
void main() {
  vUV = aUV;
  gl_Position = uViewProj * vec4(aPosition, 1.0);
}
```

Fragment shader (sky):

```glsl
precision mediump float;
varying vec2 vUV;
uniform sampler2D uSkyTex;
void main() {
  vec4 c = texture2D(uSkyTex, vUV);
  gl_FragColor = c;
}
```

JS notes:

* Build sphere around origin with radius large enough (e.g. 1000). Make UVs equirectangular matching your texture (u=lon, v=lat).
* **Important**: Either invert normals when generating or simply in vertex shader avoid lighting (we don't need normals). Instead ensure camera position baked into view matrix: remove translation so sphere stays glued to camera (set view matrix translation to 0 before multiplying).
* Render sky first. `gl.depthMask(false); gl.disable(gl.CULL_FACE);` (or `gl.cullFace(gl.FRONT)` if normals inverted). Then after draw: `gl.depthMask(true);`

## 2) Ground plane (tiled texture)

Vertex shader:

```glsl
attribute vec3 aPosition;
attribute vec2 aUV;
uniform mat4 uModelViewProj;
varying vec2 vUV;
void main(){
  vUV = aUV;
  gl_Position = uModelViewProj * vec4(aPosition,1.0);
}
```

Fragment shader:

```glsl
precision mediump float;
varying vec2 vUV;
uniform sampler2D uGroundTex;
uniform float uTile; // e.g. 10.0 to tile 10x
void main(){
  vec2 uv = vUV * uTile;
  vec4 c = texture2D(uGroundTex, fract(uv));
  gl_FragColor = c;
}
```

Make the plane large and place slightly below model origin. Use normalmap if needed.

## 3) Waterfall shader (flow + normal + alpha)

This is the main bit. Use two textures:

* `uFlowTex` — the alpha/flow image (grayscale or RGBA with alpha)
* `uFlowNormal` — normal map representing streaks (RGB normal in tangent space)
* Optionally `uBG` — a blurred background texture to sample for refraction (if you can produce a grab pass).

Vertex shader (waterfall quad):

```glsl
attribute vec3 aPosition;
attribute vec2 aUV;
uniform mat4 uModelViewProj;
varying vec2 vUV;
varying vec3 vPosition;
void main(){
  vUV = aUV;
  vPosition = aPosition;
  gl_Position = uModelViewProj * vec4(aPosition,1.0);
}
```

Fragment shader (water):

```glsl
precision mediump float;
varying vec2 vUV;
uniform float uTime;
uniform sampler2D uFlowTex;     // grayscale/rgba mask (flow alpha)
uniform sampler2D uFlowNormal;  // normal map for ripples
uniform sampler2D uBgTex;       // optional background for fake refraction
uniform vec3 uLightDir;         // normalized light
uniform float uScrollSpeed;     // e.g. 1.2
uniform float uStrength;        // refraction strength
void main(){
  // scroll UV downward (v decreasing) to animate falling water
  vec2 uvFlow = vUV + vec2(0.0, -uTime * uScrollSpeed);

  // sample flow mask and normal
  vec4 flowMask = texture2D(uFlowTex, uvFlow);
  vec3 n = texture2D(uFlowNormal, uvFlow).rgb * 2.0 - 1.0; // convert from [0,1] to [-1,1]

  // simple lighting: fresnel-ish + specular
  float ndotl = max(dot(normalize(n), normalize(uLightDir)), 0.0);
  float spec = pow(ndotl, 32.0) * 0.8;

  // fake refraction: offset bg sample by normal.x/normal.y * strength
  vec2 refrUV = vUV + n.xy * uStrength;
  vec4 bg = texture2D(uBgTex, refrUV);

  // color of water is tinted bg + spec highlights
  vec3 waterColor = mix(bg.rgb * 0.9, vec3(0.6,0.7,0.9), 0.25) + spec;

  // use the flowMask alpha (or luminance) as transparency mask
  float alpha = flowMask.a; // or use flowMask.r or luminance
  // soften edges by noise (optional)
  // alpha *= smoothstep(0.15, 0.85, flowMask.r);

  gl_FragColor = vec4(waterColor, alpha * 0.9); // slightly translucent
}
```

JS tips:

* Create a tall quad made of multiple vertical segments so you can distort vertices later if wanted. Place it at the waterfall location.
* Provide `uTime` uniform updated each frame.
* `uBgTex` can be a low-res framebuffer copy of the scene behind the waterfall (grab pass) — optional. If you can't do grab pass, use a blurred sky/ground texture or sample the sky/scene texture.
* Set `gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);`

## 4) Particle splash (simple CPU-based)

* Keep an array of particles `{pos, vel, life, size}`.
* Each frame update: `vel += gravity*dt; pos += vel*dt; life -= dt`.
* Render as small quads (billboards) or point sprites:

  * Use additive blending: `gl.blendFunc(gl.SRC_ALPHA, gl.ONE)`.
  * Use a circular sprite texture (splash/glow).
* Spawn near waterfall base with random upward velocities and short lifetime.

Minimal pseudo:

```js
function spawnSplash(x, y, z, amount) {
  for(let i=0;i<amount;i++){
    particles.push({
      pos: [x + randRange(-0.2,0.2), y, z + randRange(-0.2,0.2)],
      vel: [randRange(-0.5,0.5), randRange(1.0,3.0), randRange(-0.5,0.5)],
      life: randRange(0.4,1.2),
      size: randRange(0.02,0.1)
    });
  }
}
```

---

# GL state & performance notes

* Batch waterfall into as few quads as possible. Overdraw kills perf for transparent layers.
* If you have many transparent layers, sort by distance and render back-to-front (painful). Better: keep waterfall as a single object with alpha and no depth writes.
* Use small normal / flow textures (256–512) with repeat wrapping and mipmaps.
* For particle count, keep under a few hundred if CPU-updated. For large counts use a GPU particle system (more complex).
* If you want foam at the bottom: spawn a textured quad with foam sprite plus animated dissolve (fade out scale & alpha), or paint foam onto ground normalmap where water hits.

---

# Asset ideas

* Flow texture: vertical streaks (grayscale) with alpha. You can animate different layers at different speeds for depth.
* Normal map: same streaks encoded as normal to get specular detail.
* Foam sprite: circular, soft alpha with noise.
* If you use equirect sky texture, sphere UVs must match (long-lat).

---

# Small complete example: waterfall render order (pseudo-JS)

```js
function render() {
  // update time uniform
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // 1. Sky
  gl.depthMask(false);
  useProgram(skyProg);
  setUniforms(...);
  draw(skySphere);
  gl.depthMask(true);

  // 2. Opaque scene (ground, model)
  useProgram(geomProg);
  draw(ground);
  draw(swampModel);

  // 3. Grab background for waterfall if you want refraction (optional)
  // - render scene to framebuffer or copy pixels to texture (grab pass)

  // 4. Waterfall (transparent)
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  useProgram(waterProg);
  setUniform(uTime,...);
  bindTexture(uFlowTex, ...);
  bindTexture(uFlowNormal, ...);
  bindTexture(uBgTex, ...);
  draw(waterQuad);
  gl.depthMask(true);

  // 5. Particles (additive)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  draw(particleSystem);

  requestAnimationFrame(render);
}
```

---

# Quick tips & tuning

* **Speed**: Change `uScrollSpeed` per waterfall layer. Use 2–3 layered quads with different speeds for depth.
* **Edge softness**: Multiply flow mask by a vertical gradient to fade the sides.
* **Foam**: At the bottom, spawn sprites that grow and fade.
* **Sound cue**: play waterfall sound and spawn particles synced with intensity.
* **Quality**: if you care about refraction, implement grab-pass by rendering scene (without waterfall) into a texture and sample it in the water shader.
