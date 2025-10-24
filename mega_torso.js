// mega_torso.js (modular, reusable, no canvas/shaders/render loop)
// Mega Swampert — Torso (main body sphere, rump sphere, center fin, fin cap)
// Two-tone body: top hemisphere blue, bottom hemisphere white
//
// Hyperboloid connector (internal):
// - Private generator, created inside init, drawn in draw
// - Top ellipse width auto-matches belly’s flat width
// - Bottom ellipse width auto-matches rump’s flat width
// - Pitch/Yaw/Roll controls for orientation
// - Horizontal color split around the ring (same mapping top/bottom)
// - Fat controls:
//   • connector.fatXZ (draw-time X/Z fattener)
//   • connector.geom.fat (geometry-time radii multiplier)
//
// Requires: glMatrix (mat4). Your shader must provide:
//   attributes: aVertexPosition (vec3), aVertexColor (vec4)
//   uniforms:   uModelViewMatrix (mat4), uProjectionMatrix (mat4)

(function (global) {
  // -----------------------------------------------------------
  // Colors
  const COLOR_BLUE = [0.18, 0.55, 0.95, 1.0];
  const COLOR_BELLY = [0.97, 0.97, 0.97, 1.0];
  const COLOR_FIN_DARK = [0.16, 0.16, 0.2, 1.0];

  // -----------------------------------------------------------
  // Default draw transforms (torso-local, includes connector)
  // Angles are in radians (pitch=X, yaw=Y, roll=Z).
  const DEFAULTS = {
    torso: {
      scale: [2.8, 2.45, 3.6],
      translate: [0.0, -0.02, 0.0],
    },
    rump: {
      translate: [0.0, -1.88, -4.95],
      scale: [1.55, 1.6, 2.35],
      rotateX: -0.0,
    },
    connector: {
      translate: [0.0, -1.1, -3.0],
      pitch: 1.0, // rotateX
      yaw: 0.0, // rotateY
      roll: 0.0, // rotateZ
      // Quick fat control at draw time (X/Z only)
      fatXZ: 1.0,
      scale: [1.3, 0.6, 0.8],
      /*
             translate: [0.0, -1.1, -3.0],
      pitch: 1.0, // rotateX
      yaw: 0.0, // rotateY
      roll: 0.0, // rotateZ
      // Back-compat: if rotateX is provided in overrides, it maps to pitch
      scale: [1.3, 0.4, 0.8],
      */
    },
    centerFin: {
      translate: [0.0, -3.6, -2.4],
      rotateX: -0.32,
      scale: [0.8, 3.35, 4.35],
    },
    finCap: {
      translate: [0.0, -1.0, -6.2],
      rotateX: 0.32,
      scale: [1.3, 5.2, 5.7],
    },
  };

  // Center fin curve parameters (geometry-time)
  const CENTER_FIN_PARAMS = {
    samplesPerSegment: 32,
    bandOffset: 0.34,
    biasZ: 0.2,
    tipPull: 0.22,
    taperTip: 0.6,
    extrudeX: 0.22,
    bulgeMid: 0.3,
    bulgeCenter: 0.26,
    bulgeWidth: 0.24,
    controlPts: [
      [1.45, -2.5],
      [1.55, -1.57],
      [1.15, -0.8],
      [1.15, -0.2],
      [1.30, 0.2],
      [1.4, 0.45],
      [0.95, 1.1],
      [0.2, 1.23],
      [1.1, 0.55],
    ],
  };

 // Public: build GL buffers for torso parts (includes connector)
// Public: build GL buffers for torso parts (includes connector)
function init(gl, options) {
  const flatTorso = {
    chunk: 0.12,
    rotX: 0,
    rotY: 90,
    rotZ: -20,
    flip: true,
    feather: 0.0,
    ...(options?.connectFlat?.torso || {}),
  };
  const flatRump = {
    chunk: 0.12,
    rotX: 0,
    rotY: 90,
    rotZ: -20,
    flip: false,
    feather: 0.0,
    ...(options?.connectFlat?.rump || {}),
  };

  const torsoSphere = createSphereGeometryTwoToneFlat(
    COLOR_BLUE,
    COLOR_BELLY,
    48,
    48,
    1.0,
    flatTorso
  );
  const torso = makeBufferSet(gl, torsoSphere);

  const rumpSphereArrays = createSphereGeometryTwoToneFlat(
    COLOR_BLUE,
    COLOR_BELLY,
    36,
    36,
    1.0,
    flatRump
  );
  const rumpSphere = makeBufferSet(gl, rumpSphereArrays);

  const centerFin = buildCenterFinFromParams(
    gl,
    COLOR_FIN_DARK,
    CENTER_FIN_PARAMS
  );

  const finCap = createHalfDiskExtrudedX(
    gl,
    COLOR_FIN_DARK,
    0.6,
    0.22,
    26,
    options && options.finCapStretch
  );

  // Compute ellipse radii from the flat widths on belly and rump
  // For a unit sphere, plane = 1 - 2*chunk; r_flat = sqrt(1 - plane^2)
  const clamp01 = (x) => Math.max(0, Math.min(1, x ?? 0));
  const planeFromChunk = (c) => 1 - 2 * clamp01(c);
  const flatCircleRadius = (chunk) => {
    const p = planeFromChunk(chunk);
    return Math.sqrt(Math.max(0, 1 - p * p));
  };

  const rFlatBelly = flatCircleRadius(flatTorso.chunk);
  const rFlatRump = flatCircleRadius(flatRump.chunk);

  // Convert to world-space ellipse radii using each part's Y/Z scales
  const ryTopAuto = rFlatBelly * DEFAULTS.torso.scale[1];
  const rzTopAuto = rFlatBelly * DEFAULTS.torso.scale[2];
  const ryBotAuto = rFlatRump * DEFAULTS.rump.scale[1];
  const rzBotAuto = rFlatRump * DEFAULTS.rump.scale[2];

  // Build connector hyperboloid (internal, not exported)
  const connectorGeom = {
    height: 3.8,
    // Auto-matched ellipse radii from the flats (can be overridden)
    ryTop: ryTopAuto,
    rzTop: rzTopAuto,
    ryBot: ryBotAuto,
    rzBot: rzBotAuto,
    // Waist radii (narrowest point) — start equal to smaller end
    waistRy: Math.min(ryTopAuto, ryBotAuto) * 1.5,
    waistRz: Math.min(rzTopAuto, rzBotAuto) * 1.5,
    // Tessellation
    segAround: 64,
    segHeight: 24,
    // Coloring (angular seam softness fraction of π)
    colorTop: COLOR_BLUE,
    colorBottom: COLOR_BELLY,
    blendBand: 0.08,
    // allow explicit overrides via options.connector.geom
    ...(options?.connector?.geom || {}),
  };

  // INTERNAL: Manual connector ring overrides — edit here in this file.
  // Set enabled: true and fill any of the fields below to hard-override auto.
  const INTERNAL_CONNECTOR_RINGS = {
    enabled: true,
    // Circular radii (same X/Z): numbers
    topRadius: null,
    bottomRadius: null,
    // Elliptical radii [rx, rz]
    topRadii: [1.9, 2.5], // e.g., [2.6, 3.9]
    bottomRadii: [1.2, 1.9], // e.g., [1.7, 2.4]
    // Multipliers applied after the values above (or auto)
    topMul: 1,
    bottomMul: 1,
    // Optional: explicitly set waist (pinch). Leave null to auto-clamp.
    waistRy: null,
    waistRz: null,
    // Optional: geometry-wide fat multiplier (applies to all radii)
    fat: null,
  };

  // Helper to apply “manual radii” from an object that may look like:
  // { topRadius, bottomRadius, topRadii:[rx,rz], bottomRadii:[rx,rz],
  //   topMul, bottomMul, waistRy, waistRz, fat }
  function applyRadiiFrom(src) {
    if (!src) return;
    const g = src.geom ?? src;

    const hasNum = (v) => Number.isFinite(v);
    const hasPair = (v) => Array.isArray(v) && v.length >= 2;

    if (hasPair(g.topRadii)) {
      connectorGeom.ryTop = +g.topRadii[0];
      connectorGeom.rzTop = +g.topRadii[1];
    } else if (hasNum(g.topRadius)) {
      connectorGeom.ryTop = +g.topRadius;
      connectorGeom.rzTop = +g.topRadius;
    }

    if (hasPair(g.bottomRadii)) {
      connectorGeom.ryBot = +g.bottomRadii[0];
      connectorGeom.rzBot = +g.bottomRadii[1];
    } else if (hasNum(g.bottomRadius)) {
      connectorGeom.ryBot = +g.bottomRadius;
      connectorGeom.rzBot = +g.bottomRadius;
    }

    if (hasNum(g.topMul) && g.topMul !== 1) {
      connectorGeom.ryTop *= g.topMul;
      connectorGeom.rzTop *= g.topMul;
    }
    if (hasNum(g.bottomMul) && g.bottomMul !== 1) {
      connectorGeom.ryBot *= g.bottomMul;
      connectorGeom.rzBot *= g.bottomMul;
    }

    if (hasNum(g.waistRy)) connectorGeom.waistRy = +g.waistRy;
    if (hasNum(g.waistRz)) connectorGeom.waistRz = +g.waistRz;

    if (hasNum(g.fat) && g.fat !== 1) {
      const f = +g.fat;
      connectorGeom.ryTop *= f;
      connectorGeom.rzTop *= f;
      connectorGeom.ryBot *= f;
      connectorGeom.rzBot *= f;
      connectorGeom.waistRy *= f;
      connectorGeom.waistRz *= f;
    }
  }

  // Apply overrides: first any options, then internal (internal wins)
  applyRadiiFrom(options?.connector);
  applyRadiiFrom(options?.connector?.geom);
  if (INTERNAL_CONNECTOR_RINGS.enabled) applyRadiiFrom(INTERNAL_CONNECTOR_RINGS);

  // If waist not explicitly set, clamp it to not exceed end radii
  const waistExplicit =
    (options?.connector?.geom &&
      (Number.isFinite(options.connector.geom.waistRy) ||
        Number.isFinite(options.connector.geom.waistRz))) ||
    INTERNAL_CONNECTOR_RINGS.enabled &&
      (Number.isFinite(INTERNAL_CONNECTOR_RINGS.waistRy) ||
        Number.isFinite(INTERNAL_CONNECTOR_RINGS.waistRz));

  if (!waistExplicit) {
    connectorGeom.waistRy = Math.min(
      connectorGeom.waistRy,
      connectorGeom.ryTop,
      connectorGeom.ryBot
    );
    connectorGeom.waistRz = Math.min(
      connectorGeom.waistRz,
      connectorGeom.rzTop,
      connectorGeom.rzBot
    );
  }

  const connector = createHyperboloidOneSheet(gl, connectorGeom);

  return {
    torso,
    rumpSphere,
    centerFin,
    finCap,
    connector,
  };
}

  // -----------------------------------------------------------
  // Public: draw torso bits (hyperboloid is drawn via draw)
  function draw(gl, programInfo, buffers, viewMatrix, overrides) {
    const cfg = deepMerge(DEFAULTS, overrides || {});

    // Back-compat: rotateX maps to pitch if present
    if (
      cfg.connector &&
      cfg.connector.rotateX != null &&
      cfg.connector.pitch == null
    ) {
      cfg.connector.pitch = cfg.connector.rotateX;
    }

    // Optional degrees support if provided
    const deg2rad = (d) => (d * Math.PI) / 180;

    const pitch =
      (cfg.connector.pitchDeg != null
        ? deg2rad(cfg.connector.pitchDeg)
        : cfg.connector.pitch) || 0;
    const yaw =
      (cfg.connector.yawDeg != null
        ? deg2rad(cfg.connector.yawDeg)
        : cfg.connector.yaw) || 0;
    const roll =
      (cfg.connector.rollDeg != null
        ? deg2rad(cfg.connector.rollDeg)
        : cfg.connector.roll) || 0;

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

    {
      const m = mat4.clone(viewMatrix);
      mat4.scale(m, m, cfg.torso.scale);
      mat4.translate(m, m, cfg.torso.translate);
      drawSet(buffers.torso, m);
    }

    {
      const m = mat4.clone(viewMatrix);
      mat4.translate(m, m, cfg.rump.translate);
      if (cfg.rump.rotateX) mat4.rotate(m, m, cfg.rump.rotateX, [1, 0, 0]);
      mat4.scale(m, m, cfg.rump.scale);
      drawSet(buffers.rumpSphere, m);
    }

    // Connector hyperboloid with pitch-yaw-roll + fatXZ
    if (buffers.connector) {
      const m = mat4.clone(viewMatrix);
      mat4.translate(m, m, cfg.connector.translate);
      if (pitch) mat4.rotate(m, m, pitch, [1, 0, 0]);
      if (yaw) mat4.rotate(m, m, yaw, [0, 1, 0]);
      if (roll) mat4.rotate(m, m, roll, [0, 0, 1]);
      const fat = Math.max(0.001, cfg.connector.fatXZ ?? 1.0);
      if (fat !== 1.0) mat4.scale(m, m, [fat, 1, fat]);
      mat4.scale(m, m, cfg.connector.scale);
      drawSet(buffers.connector, m);
    }

    {
      const m = mat4.clone(viewMatrix);
      mat4.translate(m, m, cfg.centerFin.translate);
      mat4.rotate(m, m, cfg.centerFin.rotateX, [1, 0, 0]);
      mat4.scale(m, m, cfg.centerFin.scale);
      drawSet(buffers.centerFin, m);
    }

    {
      const m = mat4.clone(viewMatrix);
      mat4.translate(m, m, cfg.finCap.translate);
      mat4.rotate(m, m, cfg.finCap.rotateX, [1, 0, 0]);
      mat4.scale(m, m, cfg.finCap.scale);
      drawSet(buffers.finCap, m);
    }
  }

  // -----------------------------------------------------------
  // Public: generic draw for any mesh built by this module
  function drawMesh(gl, programInfo, bufferSet, modelViewMatrix) {
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.position);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.color);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexColor,
      4,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferSet.indices);
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix
    );
    gl.drawElements(
      gl.TRIANGLES,
      bufferSet.vertexCount,
      gl.UNSIGNED_SHORT,
      0
    );
  }

  // -----------------------------------------------------------
  // Private: Hyperboloid generator (smooth, curved surface)
  //
  // Geometry is centered at origin, axis along Y. Apply transforms at draw.
  function createHyperboloidOneSheet(gl, opts) {
    const o = {
      height: 2.0,
      segAround: 48,
      segHeight: 24,
      // Ellipse radii for top and bottom (X/Z axes)
      ryTop: 1.0,
      rzTop: 1.0,
      ryBot: 1.0,
      rzBot: 1.0,
      // Waist (narrowest) radii
      waistRy: ((opts?.ryTop ?? 1.0) + (opts?.ryBot ?? 1.0)) * 0.5 * 0.5,
      waistRz: ((opts?.rzTop ?? 1.0) + (opts?.rzBot ?? 1.0)) * 0.5 * 0.5,
      // Coloring: blendBand as angular seam softness (0..0.49)
      colorTop: COLOR_BLUE,
      colorBottom: COLOR_BELLY,
      blendBand: 0.08,
      ...(opts || {}),
    };

    const positions = [];
    const colors = [];
    const indices = [];

    const halfHeight = o.height / 2;
    const cols = o.segAround;
    const rows = o.segHeight;

    // Hyperboloid parameter solve (per axis)
    const solveParams = (rTop, rBot, rWaist) => {
      if (rWaist > rTop || rWaist > rBot) {
        console.warn(
          "Hyperboloid waist radius should be <= top/bottom radii."
        );
      }
      const T_sq = rTop * rTop - rWaist * rWaist;
      const B_sq = rBot * rBot - rWaist * rWaist;
      if (T_sq < 0 || B_sq < 0) return { k: 0, y_waist: 0 };
      const T = Math.sqrt(T_sq);
      const B = Math.sqrt(B_sq);
      const k = ((B + T) * (B + T)) / (o.height * o.height);
      const y_waist = ((B - T) / (2 * (B + T))) * o.height;
      return { k, y_waist };
    };

    const paramsX = solveParams(o.ryTop, o.ryBot, o.waistRy);
    const paramsZ = solveParams(o.rzTop, o.rzBot, o.waistRz);

    const getRadiusX = (y) =>
      Math.sqrt(
        o.waistRy * o.waistRy +
          paramsX.k * (y - paramsX.y_waist) * (y - paramsX.y_waist)
      );
    const getRadiusZ = (y) =>
      Math.sqrt(
        o.waistRz * o.waistRz +
          paramsZ.k * (y - paramsZ.y_waist) * (y - paramsZ.y_waist)
      );

    // Helpers
    const mix1 = (a, b, t) => a * (1 - t) + b * t;
    const smooth01 = (t) => t * t * (3 - 2 * t);
    const clamp01 = (x) => Math.max(0, Math.min(1, x));

    // Angular seam softness in radians (around theta = π)
    const seamW = Math.max(0, Math.min(0.49, o.blendBand || 0)) * Math.PI;

    // Vertices and colors
    for (let j = 0; j <= rows; j++) {
      const v = j / rows; // 0..1 bottom->top
      const y = -halfHeight + v * o.height;

      const rX = getRadiusX(y);
      const rZ = getRadiusZ(y);

      for (let i = 0; i <= cols; i++) {
        const u = i / cols;
        const theta = u * Math.PI * 2;

        const x = rX * Math.cos(theta);
        const z = rZ * Math.sin(theta);
        positions.push(x, y, z);

        // Horizontal split around ring with soft seam centered at π.
        // half=0 => white, half=1 => blue (same mapping at all heights).
        let half = theta < Math.PI ? 0 : 1;
        if (seamW > 0) {
          const tRaw = (theta - (Math.PI - seamW)) / (2 * seamW);
          const t = clamp01(tRaw);
          half =
            theta <= Math.PI - seamW
              ? 0
              : theta >= Math.PI + seamW
              ? 1
              : smooth01(t);
        }

        const s = half;

        colors.push(
          mix1(o.colorBottom[0], o.colorTop[0], s),
          mix1(o.colorBottom[1], o.colorTop[1], s),
          mix1(o.colorBottom[2], o.colorTop[2], s),
          mix1(o.colorBottom[3] ?? 1, o.colorTop[3] ?? 1, s)
        );
      }
    }

    // Indices
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = (cols + 1) * j + i;
        const b = a + cols + 1;
        const c = b + 1;
        const d = a + 1;
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    // Create GL buffers
    return makeBufferSet(gl, {
      positions,
      colors,
      indices,
    });
  }

  // -----------------------------------------------------------
  // Geometry helpers (arrays -> GL buffers)

  // Two-tone sphere with “flat chunk” (with optional feather + rotation)
  function createSphereGeometryTwoToneFlat(
    colorTop,
    colorBottom,
    latBands,
    lonBands,
    radius,
    flatOpt
  ) {
    const positions = [];
    const colors = [];
    const indices = [];

    const hasChunk = flatOpt && Number.isFinite(flatOpt.chunk);
    const rotX = ((flatOpt?.rotX || 0) * Math.PI) / 180;
    const rotY = ((flatOpt?.rotY || 0) * Math.PI) / 180;
    const rotZ = ((flatOpt?.rotZ || 0) * Math.PI) / 180;
    const flip = !!flatOpt?.flip;
    const feather = Math.max(0, flatOpt?.feather || 0);

    const legacy =
      flatOpt &&
      (flatOpt.axis === "x" ||
        flatOpt.axis === "y" ||
        flatOpt.axis === "z") &&
      Number.isFinite(flatOpt.cut);

    function rotForward(x, y, z) {
      const cx = Math.cos(rotX),
        sx = Math.sin(rotX);
      const cy = Math.cos(rotY),
        sy = Math.sin(rotY);
      const cz = Math.cos(rotZ),
        sz = Math.sin(rotZ);
      // Rx
      let y1 = y * cx - z * sx;
      let z1 = y * sx + z * cx;
      let x1 = x;
      // Ry
      let x2 = x1 * cy + z1 * sy;
      let z2 = -x1 * sy + z1 * cy;
      let y2 = y1;
      // Rz
      let x3 = x2 * cz - y2 * sz;
      let y3 = x2 * sz + y2 * cz;
      let z3 = z2;
      return [x3, y3, z3];
    }
    function rotInverse(x, y, z) {
      const cx = Math.cos(-rotX),
        sx = Math.sin(-rotX);
      const cy = Math.cos(-rotY),
        sy = Math.sin(-rotY);
      const cz = Math.cos(-rotZ),
        sz = Math.sin(-rotZ);
      // Rz(-)
      let x1 = x * cz - y * sz;
      let y1 = x * sz + y * cz;
      let z1 = z;
      // Ry(-)
      let x2 = x1 * cy + z1 * sy;
      let z2 = -x1 * sy + z1 * cy;
      let y2 = y1;
      // Rx(-)
      let y3 = y2 * cx - z2 * sx;
      let z3 = y2 * sx + z2 * cx;
      let x3 = x2;
      return [x3, y3, z3];
    }

    const bandClamp = (x) => Math.max(0, Math.min(1, x));

    for (let lat = 0; lat <= latBands; lat++) {
      const theta = (lat * Math.PI) / latBands;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      for (let lon = 0; lon <= lonBands; lon++) {
        const phi = (lon * 2 * Math.PI) / lonBands;
        const sinP = Math.sin(phi);
        const cosP = Math.cos(phi);

        let x = radius * cosP * sinT;
        let y = radius * cosT;
        let z = radius * sinP * sinT;

        if (hasChunk) {
          let [xr, yr, zr] = rotForward(x, y, z);
          const c = bandClamp(flatOpt.chunk || 0);
          let plane = 1 - 2 * c; // +1..-1
          if (flip) plane = -plane;
          plane *= radius;

          const beyond =
            (!flip && xr > plane) || (flip && xr < plane)
              ? Math.abs(xr - plane)
              : 0;

          if (beyond > 0) {
            if (feather <= 0) {
              xr = plane;
            } else {
              const t = Math.min(1, beyond / feather);
              xr = xr * (1 - t) + plane * t;
            }
          }
          [x, y, z] = rotInverse(xr, yr, zr);
        } else if (legacy) {
          const axis = flatOpt.axis;
          const cut = flatOpt.cut;
          const v = axis === "x" ? x : axis === "y" ? y : z;
          const beyond =
            cut >= 0 && v > cut ? v - cut : cut < 0 && v < cut ? cut - v : 0;
          let vClamped = v;
          if (beyond > 0) {
            if (feather <= 0) vClamped = cut;
            else {
              const t = Math.min(1, beyond / feather);
              vClamped = v * (1 - t) + cut * t;
            }
          }
          if (axis === "x") x = vClamped;
          else if (axis === "y") y = vClamped;
          else z = vClamped;
        }

        positions.push(x, y, z);
        const ccol = y >= 0 ? colorTop : colorBottom;
        colors.push(ccol[0], ccol[1], ccol[2], ccol[3]);
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

  function createExtrudedPolygonYZAxis(gl, color, points, thickness, axis) {
    const halfT = thickness * 0.5;
    const positions = [];
    const colors = [];
    const indices = [];
    const n = points.length;

    // Front layer
    for (let i = 0; i < n; i++) {
      const [y, z] = points[i];
      if (axis === "x") positions.push(+halfT, y, z);
      else positions.push(0.0, y, z + halfT);
      colors.push(...color);
    }
    // Back layer
    for (let i = 0; i < n; i++) {
      const [y, z] = points[i];
      if (axis === "x") positions.push(-halfT, y, z);
      else positions.push(0.0, y, z - halfT);
      colors.push(...color);
    }

    // Front cap fan
    for (let i = 1; i < n - 1; i++) indices.push(0, i, i + 1);
    // Back cap fan (reverse winding)
    const N = n;
    for (let i = 1; i < n - 1; i++) indices.push(N + 0, N + i + 1, N + i);

    // Side walls
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

  function createExtrudedPolygonYZ(gl, color, points, thickness) {
    return createExtrudedPolygonYZAxis(gl, color, points, thickness, "x");
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

  // Half-disk in YZ extruded along X or Z.
  function createHalfDiskExtrudedX(
    gl,
    color,
    radius,
    thickness,
    segments,
    opts
  ) {
    const o = {
      edgeStretchZ: 1.0,
      edgeStretchY: 1.0,
      edgeStretchLeftZ: null,
      edgeStretchRightZ: null,
      edgeFalloff: 0.35,
      extrudeAxis: "z",
      ...(opts || {}),
    };

    const poly = [];
    poly.push([0, radius]);
    for (let i = 1; i < segments; i++) {
      const t = (i / segments) * Math.PI;
      const y = -radius * Math.sin(t);
      const z = radius * Math.cos(t);
      poly.push([y, z]);
    }
    poly.push([0, -radius]);

    return createExtrudedPolygonYZAxis(
      gl,
      color,
      poly,
      thickness,
      o.extrudeAxis === "z" ? "z" : "x"
    );
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

    const bulgeA = Math.max(0, cfg.bulgeMid ?? 0);
    const bulgeC = Math.min(1, Math.max(0, cfg.bulgeCenter ?? 0.5));
    const bulgeW = Math.max(1e-3, cfg.bulgeWidth ?? 0.25);
    const gauss = (u) => {
      const d = (u - bulgeC) / bulgeW;
      return Math.exp(-0.5 * d * d);
    };

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

      const bulge = 1.0 + bulgeA * gauss(u);
      const offU = offset * taper * bulge;

      let y = top[i][0] + nrm[0] * offU;
      let z = top[i][1] + nrm[1] * offU;
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
      bulgeMid: params.bulgeMid,
      bulgeCenter: params.bulgeCenter,
      bulgeWidth: params.bulgeWidth,
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
    drawMesh,
    defaults: DEFAULTS,
  };
})(typeof window !== "undefined" ? window : this);