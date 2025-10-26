// anim/attack_assets.js
// Prettier print width: 80

/* eslint-disable no-undef */

// Attack assets for Phase 2+ (boulder + water beam)
// Design: mirrors Mega* modules so you can pose/animate similarly.
//
// API:
//   const assets = AttackAssets.init(gl);
//   const pose = AttackAssets.createPose();
//   const api = AttackAssets.makePoseAPI(pose);
//   AttackAssets.draw(gl, programInfo, assets, viewMatrix, overrides?, pose?);
//
// Shader requirements (same as your Mega* parts):
//   attributes: aVertexPosition (vec3), aVertexColor (vec4)
//   uniforms:   uModelViewMatrix (mat4), uProjectionMatrix (mat4),
//               uModelMatrix (mat4) – world matrix used for rim/reflection

(function (global) {
  const COLOR_ROCK = [0.35, 0.33, 0.32, 1.0];
  const COLOR_ROCK2 = [0.26, 0.25, 0.24, 1.0];
  const COLOR_BEAM = [0.3, 0.8, 1.0, 1.0];
  const COLOR_COIL = [0.6, 0.9, 1.0, 1.0];
  const COLOR_CONE = [0.7, 0.9, 1.0, 1.0];

  const DEFAULTS = {
    group: {
      translate: [0, 0, 0],
      rotate: { angle: 0, axis: [0, 1, 0] },
      scale: [1, 1, 1],
    },

    // Boulder geo params
    boulder: {
      radius: [0.9, 1.1, 0.7], // non-uniform base
      lat: 36,
      lon: 36,
      noiseAmp: 0.12,
      noiseFreq: 3.0,
      seed: 1337,
    },

    // Beam core (ellipsoid you will stretch on Z via pose)
    beamCore: {
      radius: 0.25,
      lat: 24,
      lon: 24,
      color: COLOR_BEAM,
    },

    // Coil helix tube
    coil: {
      helixRadius: 0.28, // distance from axis
      tubeRadius: 0.05, // coil thickness
      turns: 6.0,
      height: 3.0, // matches a beam of ~3 units
      segAlong: 128,
      segAround: 10,
      color: COLOR_COIL,
    },
    // Cone burst
    cone: {
      radius: 0.5, // base radius at scale 1
      height: 0.7, // height at scale 1
      segments: 32,
      color: COLOR_CONE,
    },
  };

  const Groups = {
    root: "root",
    // Boulder nodes
    boulder: {
      root: "boulder.root",
    },
    // Beam nodes
    beam: {
      root: "beam.root", // move entire beam (core + coil)
      core: "beam.core",
      coil: "beam.coil",
      cone: "beam.cone",
    },
  };

  // TRS helpers
  function makeTRS() {
    return { t: [0, 0, 0], r: [], s: [1, 1, 1] };
  }
  function cloneTRS(trs) {
    return {
      t: trs.t ? trs.t.slice() : [0, 0, 0],
      r: Array.isArray(trs.r) ? trs.r.map((x) => ({ ...x })) : [],
      s: trs.s ? trs.s.slice() : [1, 1, 1],
    };
  }
  function applyTRS(m, trs) {
    if (!trs) return;
    if (trs.t) mat4.translate(m, m, trs.t);
    if (Array.isArray(trs.r)) {
      for (const rot of trs.r) {
        if (!rot || typeof rot.angle !== "number" || !rot.axis) continue;
        mat4.rotate(m, m, rot.angle, rot.axis);
      }
    }
    if (trs.s) mat4.scale(m, m, trs.s);
  }

  function createPose() {
    return {
      root: makeTRS(),
      boulder: { root: makeTRS() },
      beam: {
        root: makeTRS(),
        core: makeTRS(),
        coil: makeTRS(),
        cone: makeTRS(),
      },
    };
  }

  function makePoseAPI(pose) {
    function ops(trs) {
      return {
        translate(v) {
          trs.t[0] += v[0];
          trs.t[1] += v[1];
          trs.t[2] += v[2];
          return this;
        },
        rotate(a, ax) {
          trs.r.push({ angle: a, axis: ax.slice() });
          return this;
        },
        scale(v) {
          trs.s[0] *= v[0];
          trs.s[1] *= v[1];
          trs.s[2] *= v[2];
          return this;
        },
        reset() {
          trs.t = [0, 0, 0];
          trs.r = [];
          trs.s = [1, 1, 1];
          return this;
        },
        get() {
          return cloneTRS(trs);
        },
      };
    }
    return {
      root: ops(pose.root),
      boulder: { root: ops(pose.boulder.root) },
      beam: {
        root: ops(pose.beam.root),
        core: ops(pose.beam.core),
        coil: ops(pose.beam.coil),
        cone: ops(pose.beam.cone),
      },
    };
  }

  function deepMerge(base, extra) {
    if (extra == null || typeof extra !== "object") return base;
    const out = Array.isArray(base) ? base.slice() : { ...base };
    for (const k of Object.keys(extra)) {
      const bv = base[k];
      const ev = extra[k];
      if (
        ev &&
        typeof ev === "object" &&
        !Array.isArray(ev) &&
        bv &&
        typeof bv === "object" &&
        !Array.isArray(bv)
      ) {
        out[k] = deepMerge(bv, ev);
      } else {
        out[k] = Array.isArray(ev) ? ev.slice() : ev;
      }
    }
    return out;
  }

  // -----------------------------------------------------------
  // Geometry

  // Pseudo-random
  function hash(n) {
    const s = Math.sin(n) * 43758.5453;
    return s - Math.floor(s);
  }
  function noise3(x, y, z, seed) {
    // simple value noise blend
    const i = Math.floor(x),
      j = Math.floor(y),
      k = Math.floor(z);
    const fx = x - i,
      fy = y - j,
      fz = z - k;

    function h(ix, iy, iz) {
      return hash(ix * 157.0 + iy * 311.0 + iz * 659.0 + seed * 97.0);
    }
    function lerp(a, b, t) {
      return a + (b - a) * t;
    }
    function smooth(t) {
      return t * t * (3.0 - 2.0 * t);
    }

    const c000 = h(i, j, k);
    const c100 = h(i + 1, j, k);
    const c010 = h(i, j + 1, k);
    const c110 = h(i + 1, j + 1, k);
    const c001 = h(i, j, k + 1);
    const c101 = h(i + 1, j, k + 1);
    const c011 = h(i, j + 1, k + 1);
    const c111 = h(i + 1, j + 1, k + 1);

    const sx = smooth(fx),
      sy = smooth(fy),
      sz = smooth(fz);

    const nx00 = lerp(c000, c100, sx);
    const nx10 = lerp(c010, c110, sx);
    const nx01 = lerp(c001, c101, sx);
    const nx11 = lerp(c011, c111, sx);

    const nxy0 = lerp(nx00, nx10, sy);
    const nxy1 = lerp(nx01, nx11, sy);

    return lerp(nxy0, nxy1, sz) * 2.0 - 1.0;
  }

  function createNoisyEllipsoid(gl, colorA, colorB, lat, lon, radii, amp, freq, seed) {
    const positions = [];
    const colors = [];
    const indices = [];
    const [a, b, c] = radii;

    for (let i = 0; i <= lat; i++) {
      const theta = (i * Math.PI) / lat; // 0..pi
      const st = Math.sin(theta);
      const ct = Math.cos(theta);
      for (let j = 0; j <= lon; j++) {
        const phi = (j * 2 * Math.PI) / lon;
        const sp = Math.sin(phi);
        const cp = Math.cos(phi);

        // Base ellipsoid point
        const ex = a * cp * st;
        const ey = b * ct;
        const ez = c * sp * st;

        // Noise along normal-ish direction
        const n = noise3(ex * freq, ey * freq, ez * freq, seed);
        const k = 1.0 + amp * n;

        const x = ex * k;
        const y = ey * k;
        const z = ez * k;

        positions.push(x, y, z);

        // Slight vertical color ramp (y blend)
        const t = Math.max(0, Math.min(1, (y / (b * 1.2) + 1) * 0.5));
        const r = colorA[0] * (1 - t) + colorB[0] * t;
        const g = colorA[1] * (1 - t) + colorB[1] * t;
        const bl = colorA[2] * (1 - t) + colorB[2] * t;
        const al = colorA[3] * (1 - t) + colorB[3] * t;
        colors.push(r, g, bl, al);
      }
    }
    for (let i = 0; i < lat; i++) {
      for (let j = 0; j < lon; j++) {
        const a0 = i * (lon + 1) + j;
        const b0 = a0 + lon + 1;
        indices.push(a0, b0, a0 + 1);
        indices.push(b0, b0 + 1, a0 + 1);
      }
    }
    return makeBufferSet(gl, positions, colors, indices);
  }

  function createEllipsoid(gl, color, lat, lon, r) {
    const positions = [];
    const colors = [];
    const indices = [];
    for (let i = 0; i <= lat; i++) {
      const t = (i * Math.PI) / lat;
      const st = Math.sin(t),
        ct = Math.cos(t);
      for (let j = 0; j <= lon; j++) {
        const p = (j * 2 * Math.PI) / lon;
        const sp = Math.sin(p),
          cp = Math.cos(p);
        positions.push(r * cp * st, r * ct, r * sp * st);
        colors.push(color[0], color[1], color[2], color[3]);
      }
    }
    for (let i = 0; i < lat; i++) {
      for (let j = 0; j < lon; j++) {
        const a0 = i * (lon + 1) + j;
        const b0 = a0 + lon + 1;
        indices.push(a0, b0, a0 + 1);
        indices.push(b0, b0 + 1, a0 + 1);
      }
    }
    return makeBufferSet(gl, positions, colors, indices);
  }

  // Helix tube generator (circular cross-section)
  function createHelixTube(gl, color, helixR, tubeR, turns, height, segAlong, segAround) {
    const positions = [];
    const colors = [];
    const indices = [];

    const totalAngle = turns * Math.PI * 2.0;

    for (let i = 0; i <= segAlong; i++) {
      const u = i / segAlong;
      const ang = totalAngle * u;
      const z = height * u; // align along +Z for convenience

      // Helix center line
      const cx = helixR * Math.cos(ang);
      const cy = helixR * Math.sin(ang);
      const cz = z;

      // Tangent approx for frame (derivative)
      const tx = -helixR * Math.sin(ang) * totalAngle;
      const ty = helixR * Math.cos(ang) * totalAngle;
      const tz = height;

      // Build a simple frame: N ~ normalized cross(T, up) then B ~ cross(T, N)
      const tlen = Math.hypot(tx, ty, tz) || 1;
      const txn = tx / tlen,
        tyn = ty / tlen,
        tzn = tz / tlen;

      // up vector (0,0,1) usually ok since helix progresses in z
      const ux = 0,
        uy = 0,
        uz = 1;
      // N = normalize(T x up)
      let nx = tyn * uz - tzn * uy;
      let ny = tzn * ux - txn * uz;
      let nz = txn * uy - tyn * ux;
      const nlen = Math.hypot(nx, ny, nz) || 1;
      nx /= nlen;
      ny /= nlen;
      nz /= nlen;
      // B = T x N
      const bx = tyn * nz - tzn * ny;
      const by = tzn * nx - txn * nz;
      const bz = txn * ny - tyn * nx;

      for (let j = 0; j <= segAround; j++) {
        const v = (j / segAround) * Math.PI * 2.0;
        const cs = Math.cos(v),
          sn = Math.sin(v);

        const px = cx + tubeR * (nx * cs + bx * sn);
        const py = cy + tubeR * (ny * cs + by * sn);
        const pz = cz + tubeR * (nz * cs + bz * sn);

        positions.push(px, py, pz);
        colors.push(color[0], color[1], color[2], color[3]);
      }
    }

    const stride = segAround + 1;
    for (let i = 0; i < segAlong; i++) {
      for (let j = 0; j < segAround; j++) {
        const a = i * stride + j;
        const b = (i + 1) * stride + j;
        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }
    

    return makeBufferSet(gl, positions, colors, indices);
  }
  // Cone generator (base at 0, tip at +Z height)
  function createCone(gl, color, radius, height, seg) {
    const positions = [];
    const colors = [];
    const indices = [];

    // Tip
    positions.push(0, 0, height);
    // Brighter tip color for the "glow"
    colors.push(
      Math.min(1.5, color[0] * 1.5),
      Math.min(1.5, color[1] * 1.5),
      Math.min(1.5, color[2] * 1.5),
      color[3]
    );

    // Base circle
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2.0;
      positions.push(radius * Math.cos(a), radius * Math.sin(a), 0);
      colors.push(color[0], color[1], color[2], color[3]);
    }

    // Indices for cone sides
    const tipIdx = 0;
    const baseStartIdx = 1;
    for (let i = 0; i < seg; i++) {
      indices.push(tipIdx, baseStartIdx + i, baseStartIdx + i + 1);
    }

    // Base cap (so it's not hollow)
    const centerIdx = positions.length / 3;
    positions.push(0, 0, 0); // Center of base
    colors.push(color[0], color[1], color[2], color[3]);
    for (let i = 0; i < seg; i++) {
      // Connect center to base edge
      indices.push(centerIdx, baseStartIdx + i + 1, baseStartIdx + i);
    }

    return makeBufferSet(gl, positions, colors, indices);
  }

  function makeBufferSet(gl, positions, colors, indices) {
    const position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const color = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, color);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return { position, color, indices: ibo, vertexCount: indices.length };
  }

  // -----------------------------------------------------------
  function init(gl, options) {
    const cfg = deepMerge(DEFAULTS, options || {});

    // Boulder geometry
    const b = cfg.boulder;
    const boulder = createNoisyEllipsoid(
      gl,
      COLOR_ROCK,
      COLOR_ROCK2,
      b.lat,
      b.lon,
      b.radius,
      b.noiseAmp,
      b.noiseFreq,
      b.seed
    );

    // Beam core
    const bc = cfg.beamCore;
    const beamCore = createEllipsoid(gl, bc.color || COLOR_BEAM, bc.lat, bc.lon, bc.radius);

    // Coil
    const co = cfg.coil;
    const coil = createHelixTube(
      gl,
      co.color || COLOR_COIL,
      co.helixRadius,
      co.tubeRadius,
      co.turns,
      co.height,
      co.segAlong,
      co.segAround
    );
    // Cone
    const cn = cfg.cone;
    const cone = createCone(
      gl,
      cn.color || COLOR_CONE,
      cn.radius,
      cn.height,
      cn.segments
    );

    return { boulder, beamCore, coil ,cone};
  }

  // -----------------------------------------------------------
  function draw(gl, programInfo, buffers, viewMatrix, overrides, pose) {
    const cfg = deepMerge(DEFAULTS, overrides || {});
    const P = pose || null;

    const root = mat4.clone(viewMatrix);
    if (cfg.group && cfg.group.translate) mat4.translate(root, root, cfg.group.translate);
    if (cfg.group && cfg.group.rotate && cfg.group.rotate.angle) {
      mat4.rotate(root, root, cfg.group.rotate.angle, cfg.group.rotate.axis || [0, 1, 0]);
    }
    if (cfg.group && cfg.group.scale) mat4.scale(root, root, cfg.group.scale);
    if (P && P.root) applyTRS(root, P.root);

    function drawSet(set, m) {
      gl.bindBuffer(gl.ARRAY_BUFFER, set.position);
      gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

      gl.bindBuffer(gl.ARRAY_BUFFER, set.color);
      gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, set.indices);
      gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, m);
      gl.drawElements(gl.TRIANGLES, set.vertexCount, gl.UNSIGNED_SHORT, 0);
    }

    // Boulder
    {
      const m = mat4.clone(root);
      if (P && P.boulder && P.boulder.root) applyTRS(m, P.boulder.root);
      drawSet(buffers.boulder, m);
    }

    // Beam root
    const beamRoot = mat4.clone(root);
    if (P && P.beam && P.beam.root) applyTRS(beamRoot, P.beam.root);

    // Beam core (ellipsoid stretched via P.beam.core scale Z)
    {
      const m = mat4.clone(beamRoot);
      if (P && P.beam && P.beam.core) applyTRS(m, P.beam.core);
      drawSet(buffers.beamCore, m);
    }

    // Coil (parented to beam root, then coil local)
    {
      const m = mat4.clone(beamRoot);
      if (P && P.beam && P.beam.coil) applyTRS(m, P.beam.coil);
      drawSet(buffers.coil, m);
    }
    // Cone (parented to beam root, then cone local)
    if (buffers.cone) {
      // <--- ADDED BLOCK
      const m = mat4.clone(beamRoot);
      if (P && P.beam && P.beam.cone) applyTRS(m, P.beam.cone);
      drawSet(buffers.cone, m);
    }
  }

  global.AttackAssets = {
    init,
    draw,
    createPose,
    makePoseAPI,
    Groups,
    defaults: DEFAULTS,
  };
})(typeof window !== "undefined" ? window : this);