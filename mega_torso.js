// mega_torso.js (modular, reusable, no canvas/shaders/render loop)
// Mega Swampert — Torso (main body sphere, rump sphere, belly band, center fin,
// fin bottom cap)
//
// Usage:
//   const torso = MegaTorso.init(gl);
//   ...
//   MegaTorso.draw(gl, programInfo, torso, viewMatrix, { /* overrides */ });
//
// Requires: glMatrix (mat4). Your shader must provide:
//   attributes: aVertexPosition (vec3), aVertexColor (vec4)
//   uniforms:   uModelViewMatrix (mat4) per draw,
//               uProjectionMatrix (mat4) set by your app per frame.

(function (global) {
  // -----------------------------------------------------------
  // Colors
  const COLOR_BLUE = [0.18, 0.55, 0.95, 1.0];
  const COLOR_BELLY = [0.97, 0.97, 0.97, 1.0];
  const COLOR_FIN_DARK = [0.16, 0.16, 0.2, 1.0];

  // -----------------------------------------------------------
  // Default draw transforms (torso-local)
  const DEFAULTS = {
    torso: {
      scale: [2.8, 1.85, 3.6],
      translate: [0.0, -0.02, 0.0],
    },
    rump: {
      translate: [0.0, -1.88, -4.95],
      scale: [1.55, 1.6, 2.35],
      rotateX: 0.0, // optional
    },
    belly: {
      scale: [2.82, 1.72, 3.55],
      translate: [0.0, -0.22, 0.0],
    },
    centerFin: {
      translate: [0.0, -2.0, 0.05],
      rotateX: -0.32,
      scale: [1.35, 2.35, 2.35],
    },
    finCap: {
      translate: [0.0, -2.55, -3.95],
      rotateX: 0.42,
      scale: [1.3, 5.3, 5.3],
    },
  };

  // Center fin curve parameters (geometry-time)
  const CENTER_FIN_PARAMS = {
    samplesPerSegment: 22,
    bandOffset: 0.2,
    biasZ: 0.18,
    tipPull: 0.62,
    taperTip: 0.2,
    extrudeX: 0.22,
    controlPts: [
      [2.05, -6.5],
      [2.25, -1.4],
      [1.7, -0.1],
      [1.8, 0.25],
      [2.2, 0.85],
      [1.35, 1.7],
      [0.1, 2.05],
    ],
  };

  // Belly band lathe profile (geometry-time)
  const BELLY_CONFIG = {
    zStart: -1.6,
    zEnd: 1.1,
    zSegments: 48,
    angStart: Math.PI * 0.95,
    angEnd: Math.PI * 1.95,
    angSegments: 96,
  };

  // -----------------------------------------------------------
  // Public: build GL buffers for torso parts
  function init(gl) {
    // Torso main body (sphere arrays -> buffers)
    const torsoSphere = createSphereGeometry(COLOR_BLUE, 48, 48, 1.0);
    const torso = makeBufferSet(gl, torsoSphere);

    // Rump sphere (hip bulge)
    const rumpSphereArrays = createSphereGeometry(COLOR_BLUE, 36, 36, 1.0);
    const rumpSphere = makeBufferSet(gl, rumpSphereArrays);

    // Belly band (lathe band, created directly as GL buffers)
    const bellyBand = createLatheBandGeometry(
      gl,
      COLOR_BELLY,
      BELLY_CONFIG.zStart,
      BELLY_CONFIG.zEnd,
      BELLY_CONFIG.zSegments,
      BELLY_CONFIG.angStart,
      BELLY_CONFIG.angEnd,
      BELLY_CONFIG.angSegments,
      (z) => {
        const t =
          (z - BELLY_CONFIG.zStart) /
          (BELLY_CONFIG.zEnd - BELLY_CONFIG.zStart);
        const bell = Math.sin(Math.PI * t);
        const rx = 1.04 + 0.2 * bell;
        const ry = 0.86 + 0.14 * bell;
        return [rx, ry];
      }
    );

    // Center fin (spline ribbon, created directly as GL buffers)
    const centerFin = buildCenterFinFromParams(
      gl,
      COLOR_FIN_DARK,
      CENTER_FIN_PARAMS
    );

    // Fin bottom cap (half-disk extruded)
    const finCap = createHalfDiskExtrudedX(gl, COLOR_FIN_DARK, 0.6, 0.22, 28);

    return {
      torso,
      rumpSphere,
      bellyBand,
      centerFin,
      finCap,
    };
  }

  // -----------------------------------------------------------
  // Public: draw into provided viewMatrix
  function draw(gl, programInfo, buffers, viewMatrix, overrides) {
    const cfg = deepMerge(DEFAULTS, overrides || {});

    function drawSet(set, m) {
      gl.bindBuffer(gl.ARRAY_BUFFER, set.position);
      gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        3,
        gl.FLOAT,
        false,
        0,
        0
      );
      gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexPosition
      );

      gl.bindBuffer(gl.ARRAY_BUFFER, set.color);
      gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor,
        4,
        gl.FLOAT,
        false,
        0,
        0
      );
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, set.indices);
      gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        m
      );
      gl.drawElements(gl.TRIANGLES, set.vertexCount, gl.UNSIGNED_SHORT, 0);
    }

    // Torso (main blue body)
    {
      const m = mat4.clone(viewMatrix);
      mat4.scale(m, m, cfg.torso.scale);
      mat4.translate(m, m, cfg.torso.translate);
      drawSet(buffers.torso, m);
    }

    // Rump sphere (hip bulge)
    {
      const m = mat4.clone(viewMatrix);
      mat4.translate(m, m, cfg.rump.translate);
      if (cfg.rump.rotateX) mat4.rotate(m, m, cfg.rump.rotateX, [1, 0, 0]);
      mat4.scale(m, m, cfg.rump.scale);
      drawSet(buffers.rumpSphere, m);
    }

    // Belly band — fully under the blue torso (wide wrap)
    {
      const m = mat4.clone(viewMatrix);
      mat4.scale(m, m, cfg.belly.scale);
      mat4.translate(m, m, cfg.belly.translate);
      drawSet(buffers.bellyBand, m);
    }

    // Center fin
    {
      const m = mat4.clone(viewMatrix);
      mat4.translate(m, m, cfg.centerFin.translate);
      mat4.rotate(m, m, cfg.centerFin.rotateX, [1, 0, 0]);
      mat4.scale(m, m, cfg.centerFin.scale);
      drawSet(buffers.centerFin, m);
    }

    // Fin bottom cap (half-disk) at tail underside
    {
      const m = mat4.clone(viewMatrix);
      mat4.translate(m, m, cfg.finCap.translate);
      mat4.rotate(m, m, cfg.finCap.rotateX, [1, 0, 0]);
      mat4.scale(m, m, cfg.finCap.scale);
      drawSet(buffers.finCap, m);
    }
  }

  // -----------------------------------------------------------
  // Geometry helpers (arrays or GL buffers)

  function createSphereGeometry(color, latBands, lonBands, radius) {
    const positions = [];
    const colors = [];
    const indices = [];

    for (let lat = 0; lat <= latBands; lat++) {
      const theta = (lat * Math.PI) / latBands;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      for (let lon = 0; lon <= lonBands; lon++) {
        const phi = (lon * 2 * Math.PI) / lonBands;
        const sinP = Math.sin(phi);
        const cosP = Math.cos(phi);

        const x = radius * cosP * sinT;
        const y = radius * cosT;
        const z = radius * sinP * sinT;

        positions.push(x, y, z);
        colors.push(...color);
      }
    }

    for (let lat = 0; lat < latBands; lat++) {
      for (let lon = 0; lon < lonBands; lon++) {
        const first = lat * (lonBands + 1) + lon;
        const second = first + lonBands + 1;
        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    return { positions, colors, indices };
  }

  function createLatheBandGeometry(
    gl,
    color,
    zStart,
    zEnd,
    zSegments,
    angStart,
    angEnd,
    angSegments,
    radiusFn
  ) {
    const positions = [];
    const colors = [];
    const indices = [];

    const cols = angSegments + 1;

    for (let i = 0; i <= zSegments; i++) {
      const t = i / zSegments;
      const z = zStart + (zEnd - zStart) * t;
      const [rx, ry] = radiusFn(z);

      for (let j = 0; j <= angSegments; j++) {
        const u = j / angSegments;
        const a = angStart + (angEnd - angStart) * u;
        const x = rx * Math.cos(a);
        const y = ry * Math.sin(a);
        positions.push(x, y, z);
        colors.push(...color);
      }
    }

    for (let i = 0; i < zSegments; i++) {
      for (let j = 0; j < angSegments; j++) {
        const i0 = i * cols + j;
        const i1 = i0 + 1;
        const i2 = (i + 1) * cols + j;
        const i3 = i2 + 1;
        indices.push(i0, i2, i1);
        indices.push(i1, i2, i3);
      }
    }

    const position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(positions),
      gl.STATIC_DRAW
    );

    const colorBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    const index = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices),
      gl.STATIC_DRAW
    );

    return {
      position,
      color: colorBuf,
      indices: index,
      vertexCount: indices.length,
    };
  }

  function createExtrudedPolygonYZ(gl, color, points, thickness) {
    const halfT = thickness * 0.5;
    const positions = [];
    const colors = [];
    const indices = [];
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const [y, z] = points[i];
      positions.push(+halfT, y, z);
      colors.push(...color);
    }
    for (let i = 0; i < n; i++) {
      const [y, z] = points[i];
      positions.push(-halfT, y, z);
      colors.push(...color);
    }

    for (let i = 1; i < n - 1; i++) indices.push(0, i, i + 1);
    const N = n;
    for (let i = 1; i < n - 1; i++) indices.push(N + 0, N + i + 1, N + i);

    for (let i = 0; i < n; i++) {
      const i0 = i;
      const i1 = (i + 1) % n;
      const j0 = N + i0;
      const j1 = N + i1;
      indices.push(i0, j0, i1);
      indices.push(i1, j0, j1);
    }

    const position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(positions),
      gl.STATIC_DRAW
    );

    const colorBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    const index = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices),
      gl.STATIC_DRAW
    );

    return {
      position,
      color: colorBuf,
      indices: index,
      vertexCount: indices.length,
    };
  }

  function createRibbonSolidX(gl, color, top, bottom, thicknessX) {
    const halfT = thicknessX * 0.5;
    const n = Math.min(top.length, bottom.length);

    const positions = [];
    const colors = [];
    const indices = [];

    const idx = (i, kind) => i * 4 + kind; // 0:FT 1:FB 2:BT 3:BB

    for (let i = 0; i < n; i++) {
      const ty = top[i][0],
        tz = top[i][1];
      const by = bottom[i][0],
        bz = bottom[i][1];

      positions.push(+halfT, ty, tz);
      colors.push(...color);
      positions.push(+halfT, by, bz);
      colors.push(...color);

      positions.push(-halfT, ty, tz);
      colors.push(...color);
      positions.push(-halfT, by, bz);
      colors.push(...color);
    }

    for (let i = 0; i < n - 1; i++) {
      const a = idx(i, 0),
        b = idx(i, 1),
        c = idx(i + 1, 0),
        d = idx(i + 1, 1);
      indices.push(a, b, c);
      indices.push(c, b, d);
    }
    for (let i = 0; i < n - 1; i++) {
      const a = idx(i, 2),
        b = idx(i, 3),
        c = idx(i + 1, 2),
        d = idx(i + 1, 3);
      indices.push(c, b, a);
      indices.push(d, b, c);
    }
    for (let i = 0; i < n - 1; i++) {
      const ft0 = idx(i, 0),
        bt0 = idx(i, 2);
      const ft1 = idx(i + 1, 0),
        bt1 = idx(i + 1, 2);
      indices.push(ft0, bt0, ft1);
      indices.push(ft1, bt0, bt1);
    }
    for (let i = 0; i < n - 1; i++) {
      const fb0 = idx(i, 1),
        bb0 = idx(i, 3);
      const fb1 = idx(i + 1, 1),
        bb1 = idx(i + 1, 3);
      indices.push(fb1, bb0, fb0);
      indices.push(fb1, bb1, bb0);
    }

    const position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(positions),
      gl.STATIC_DRAW
    );

    const colorBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    const index = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices),
      gl.STATIC_DRAW
    );

    return {
      position,
      color: colorBuf,
      indices: index,
      vertexCount: indices.length,
    };
  }

  // Half-disk in YZ (flat at y=0, arc downward) extruded along X
  function createHalfDiskExtrudedX(gl, color, radius, thicknessX, segments) {
    const poly = [];
    poly.push([0, radius]);
    for (let i = 1; i < segments; i++) {
      const t = (i / segments) * Math.PI;
      const y = -radius * Math.sin(t);
      const z = radius * Math.cos(t);
      poly.push([y, z]);
    }
    poly.push([0, -radius]);
    return createExtrudedPolygonYZ(gl, color, poly, thicknessX);
  }

  // -----------------------------------------------------------
  // Fin helpers (spline -> biased bottom)

  function sampleCRSpline(pts, samplesPerSegment) {
    const n = pts.length;
    if (n < 2) return pts.slice();
    const out = [];
    const alpha = 0.5;
    const clamp = (i) => Math.max(0, Math.min(n - 1, i));

    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[clamp(i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[clamp(i + 2)];

      const t0 = 0;
      const t1 = t0 + Math.pow(dist(p0, p1), alpha);
      const t2 = t1 + Math.pow(dist(p1, p2), alpha);
      const t3 = t2 + Math.pow(dist(p2, p3), alpha);

      for (let s = 0; s < samplesPerSegment; s++) {
        const t = t1 + ((t2 - t1) * s) / samplesPerSegment;
        const A1 = mix2(p0, p1, (t1 - t) / (t1 - t0), (t - t0) / (t1 - t0));
        const A2 = mix2(p1, p2, (t2 - t) / (t2 - t1), (t - t1) / (t2 - t1));
        const A3 = mix2(p2, p3, (t3 - t) / (t3 - t2), (t - t2) / (t3 - t2));

        const B1 = mix2(A1, A2, (t2 - t) / (t2 - t0), (t - t0) / (t2 - t0));
        const B2 = mix2(A2, A3, (t3 - t) / (t3 - t1), (t - t1) / (t3 - t1));

        const C = mix2(B1, B2, (t2 - t) / (t2 - t1), (t - t1) / (t2 - t1));
        out.push(C);
      }
    }
    out.push(pts[n - 1]);
    return out;

    function dist(a, b) {
      const dy = b[0] - a[0];
      const dz = b[1] - a[1];
      return Math.hypot(dy, dz);
    }
    function mix2(a, b, wa, wb) {
      return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb];
    }
  }

  function makeBiasedBottomCurve(top, cfg) {
    const n = top.length;
    const out = new Array(n);
    const tangents = new Array(n);
    const norm = (v) => {
      const l = Math.hypot(v[0], v[1]) || 1e-6;
      return [v[0] / l, v[1] / l];
    };
    const smooth = (a, b, x) => {
      const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };

    const tipPull = Math.max(0, cfg.tipPull ?? 0);
    const taperTip = Math.max(0, Math.min(1, Math.abs(cfg.taperTip ?? 0)));
    const biasZ = cfg.biasZ ?? 0;
    const offset = cfg.offset ?? -0.28;

    for (let i = 0; i < n; i++) {
      const p0 = top[Math.max(0, i - 1)];
      const p1 = top[Math.min(n - 1, i + 1)];
      tangents[i] = norm([p1[0] - p0[0], p1[1] - p0[1]]);
    }

    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const t = tangents[i];
      const nrm = norm([-t[1], t[0]]);
      const taper = 1.0 - taperTip * smooth(0.65, 1.0, u);

      let y = top[i][0] + nrm[0] * offset * taper;
      let z = top[i][1] + nrm[1] * offset * taper;
      z += biasZ;

      const w = smooth(0.65, 1.0, u);
      y += t[0] * tipPull * w;
      z += t[1] * tipPull * w;

      out[i] = [y, z];
    }
    return out;
  }

  function buildCenterFinFromParams(gl, color, params) {
    const top = sampleCRSpline(params.controlPts, params.samplesPerSegment);
    const bottom = makeBiasedBottomCurve(top, {
      offset: -params.bandOffset,
      biasZ: params.biasZ,
      tipPull: params.tipPull,
      taperTip: params.taperTip,
    });
    return createRibbonSolidX(gl, color, top, bottom, params.extrudeX);
  }

  // -----------------------------------------------------------
  // GL buffer wrapper for array geometries

  function makeBufferSet(gl, data) {
    const position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(data.positions),
      gl.STATIC_DRAW
    );

    const color = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, color);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(data.colors),
      gl.STATIC_DRAW
    );

    const indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(data.indices),
      gl.STATIC_DRAW
    );

    return {
      position,
      color,
      indices,
      vertexCount: data.indices.length,
    };
  }

  // -----------------------------------------------------------
  // Utility: deep-ish merge for nested config objects
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

  // Public API
  global.MegaTorso = {
    init,
    draw,
    defaults: DEFAULTS,
  };
})(typeof window !== "undefined" ? window : this);