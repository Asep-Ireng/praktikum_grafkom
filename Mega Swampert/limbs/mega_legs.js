// mega_legs.js (modular, reusable, grouped transforms, no canvas/shaders/loop)
// Mega Swampert — Left & Right legs
// Thigh (ellipsoid) + Foot (hemisphere) with integrated slits/overlays
//
// New rig API (for animation):
//   - MegaLegs.createPose(): build a hierarchical TRS pose object
//   - MegaLegs.makePoseAPI(pose): convenient mutators per group
//   - MegaLegs.Groups: string keys for addressing parts (for masks, etc.)
//   - MegaLegs.draw(..., overrides?, pose?): optional pose + renderMask
//
// Group keys (for renderMask or reference):
//   - "left.thigh", "left.foot", "left.leg"
//   - "right.thigh", "right.foot", "right.leg"
//   - "root"
//
// Render mask tip:
//   Set renderMask to a Set or object of booleans. Foot includes slits.
//   Example:
//     { renderMask: new Set(["left.leg", "right.thigh"]) }
//
// Requires: glMatrix (mat4). Your shader must provide:
//   attributes: aVertexPosition (vec3), aVertexColor (vec4)
//   uniforms:   uModelViewMatrix (mat4) per draw,
//               uProjectionMatrix (mat4) set by your app per frame.

(function (global) {
  const LEG_BLUE = [0.18, 0.55, 0.95, 1.0];
  const SLIT_DARK = [0.04, 0.05, 0.06, 1.0];

  const THIGH_RADIUS = 1.0;
  const THIGH_SCALE = [0.55, 1.35, 0.95];

  const FOOT_RADIUS = 0.75;
  const FOOT_SCALE = [1.55, 1.0, 0.85];

  const HIP_OFFSET = [1.25, -0.55, 0.55];
  const THIGH_TILT_OUT = 0.2;
  const THIGH_TILT_FWD = -0.1;
  const ANKLE_DROP = 1.35;
  const FOOT_FORWARD = 0.45;

  const DEFAULTS = {
    group: {
      translate: [0, -3, -5],
      rotate: { angle: 0.07, axis: [1, 0, 0] },
      scale: [1.0, 1.2, 1.0],
    },

    HIP_OFFSET,
    THIGH_TILT_OUT,
    THIGH_TILT_FWD,
    ANKLE_DROP,
    FOOT_FORWARD,
    THIGH_SCALE,
    FOOT_SCALE,

    // Existing foot controls (back-compat)
    FOOT_YAW_OUT: 1.8, // yaw outward per side (applied with +/- side factor)
    FOOT_PITCH: -0.06, // base pitch

    // New foot transform options
    // Local offset applied after ankle drop/forward, before rotations.
    // X is mirrored by default across feet.
    FOOT_LOCAL_TRANSLATE: [0.2, 0.0, -0.2],
    FOOT_LOCAL_MIRROR_X: true,

    // Extra per-foot Euler rotations (applied after base pitch/yaw-out)
    FOOT_EXTRA_PITCH: -0.0, // radians around X
    FOOT_EXTRA_YAW: 0.0, // radians around Y
    FOOT_ROLL: 0.0, // radians around Z

    // Optional arbitrary-axis rotation applied last (after Euler extras)
    FOOT_ROTATE: { angle: 0.0, axis: [0, 0, 1] },

    flipUpperHemisphereFoot: false,

    FOOT_SLITS: {
      enabled: true,
      count: 2,
      spread: 0.2,
      width: 0.05,
      depth: 0.16,
      heightTop: 0.6,
      darken: 0.85,
      round: 3.0,
    },

    SIDE_SLITS: {
      enabled: false,
      count: 3,
      startZ: -0.6,
      spacingZ: 0.6,
      y: 0.15,
      outwardX: 1.15,
      inset: 0.03,
      scale: [0.12, 0.55, 0.9],
      latBands: 24,
      lonBands: 36,
      radius: 1.0,
    },

    // Center/front thin half-circle(s)
    FRONT_HALF: {
      enabled: true,
      // Base placement
      x: -0.4,
      y: 0.04,
      z: 0.0,
      inset: 0.03, // inward push along -Z
      scale: [0.04, 0.58, 0.42],
      radius: 0.8,
      latBands: 24,
      lonBands: 36,
      rot: { pitch: 1.6, yaw: 1.6, roll: 0.0 },
      color: SLIT_DARK,
      mirrorX: true, // x is "outward" on both feet

      // Duplication around the center
      count: 2, // 1=center only; 3=center+left/right; etc.
      spacingX: 0.46, // gap between neighboring slits along X
      spacingAxis: "x", // "x" | "y" | "z" (axis to spread along)
      spacingSpace: "slit", // "slit" = after orientation (recommended)

      // Optional outward "fan" for side slits
      fan: {
        yaw: -0.2, // toe-out per side slit (radians)
        roll: 0.0, // roll per side slit
        pitch: 0.0, // extra pitch per side slit
        outward: true, // if true, use side to make yaw/roll face outward
      },
    },
  };

  // -----------------------------------------------------------
  // Group registry (names to target in animation/masking)
  const Groups = {
    root: "root",
    left: {
      hip: "left.hip", // pivot for the whole leg chain (thigh + foot)
      thigh: "left.thigh", // mesh-only thigh adjustments
      ankle: "left.ankle", // pivot for foot (and slits)
      leg: "left.leg", // mask convenience: draw both thigh+foot
      foot: "left.foot", // mask key: foot (with slits)
    },
    right: {
      hip: "right.hip",
      thigh: "right.thigh",
      ankle: "right.ankle",
      leg: "right.leg",
      foot: "right.foot",
    },
  };

  // TRS helpers for poses
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

  // Pose object
  function createPose() {
    return {
      root: makeTRS(),
      left: { hip: makeTRS(), thigh: makeTRS(), ankle: makeTRS() },
      right: { hip: makeTRS(), thigh: makeTRS(), ankle: makeTRS() },
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
        rotate(angle, axis) {
          trs.r.push({ angle, axis: axis.slice() });
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
      left: {
        hip: ops(pose.left.hip),
        thigh: ops(pose.left.thigh),
        ankle: ops(pose.left.ankle),
      },
      right: {
        hip: ops(pose.right.hip),
        thigh: ops(pose.right.thigh),
        ankle: ops(pose.right.ankle),
      },
    };
  }

  // -----------------------------------------------------------
  function init(gl, options) {
    const cfg = deepMerge(DEFAULTS, options || {});
    const lat = 36;
    const lon = 36;

    const thighArrays = createSphereArrays(LEG_BLUE, lat, lon, THIGH_RADIUS);
    const thigh = makeBufferSet(gl, thighArrays);

    // Foot hemisphere with sculpted slits (integrated)
    const footArrays = createHemisphereYArrays(
      LEG_BLUE,
      FOOT_RADIUS,
      lat,
      lon,
      false, // upper hemisphere geometry -> can be flipped at draw
      cfg.FOOT_SLITS
    );
    const foot = makeBufferSet(gl, footArrays);

    let slitHemi = null;
    if (cfg.SIDE_SLITS && cfg.SIDE_SLITS.enabled) {
      const s = cfg.SIDE_SLITS;
      const slitArrays = createHemisphereYArrays(
        SLIT_DARK,
        s.radius,
        s.latBands,
        s.lonBands,
        false,
        null
      );
      slitHemi = makeBufferSet(gl, slitArrays);
    }

    let frontHalf = null;
    if (cfg.FRONT_HALF && cfg.FRONT_HALF.enabled) {
      const f = cfg.FRONT_HALF;
      const fhArrays = createHemisphereYArrays(
        f.color || SLIT_DARK,
        f.radius,
        f.latBands,
        f.lonBands,
        false,
        null
      );
      frontHalf = makeBufferSet(gl, fhArrays);
    }

    return { thigh, foot, slitHemi, frontHalf };
  }

  // Signature: draw(gl, programInfo, buffers, viewMatrix, overrides?, pose?)
  function draw(
    gl,
    programInfo,
    buffers,
    viewMatrix,
    overrides,
    pose
  ) {
    const cfg = deepMerge(DEFAULTS, overrides || {});
    const P = pose || null;
    const mask = cfg.renderMask || null;

    function isOn(obj, key) {
      if (!obj) return false;
      if (obj instanceof Set) return obj.has(key);
      if (typeof obj === "object") return !!obj[key];
      return false;
    }
    // visible helper with fallback to ".leg" for side-wide masking
    function visible(partKey) {
      if (!mask) return true;
      // partKey like "left.thigh" -> also allow "left.leg"
      const side = partKey.startsWith("left.")
        ? "left"
        : partKey.startsWith("right.")
        ? "right"
        : null;
      if (isOn(mask, partKey)) return true;
      if (side && isOn(mask, `${side}.leg`)) return true;
      return false;
    }

    // Root/group transform
    const root = mat4.clone(viewMatrix);
    if (cfg.group && cfg.group.translate) {
      mat4.translate(root, root, cfg.group.translate);
    }
    if (cfg.group && cfg.group.rotate && cfg.group.rotate.angle) {
      mat4.rotate(
        root,
        root,
        cfg.group.rotate.angle,
        cfg.group.rotate.axis || [0, 1, 0]
      );
    }
    if (cfg.group && cfg.group.scale) {
      mat4.scale(root, root, cfg.group.scale);
    }
    if (P && P.root) applyTRS(root, P.root);

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
      gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexColor
      );

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, set.indices);
      gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        m
      );
      gl.drawElements(gl.TRIANGLES, set.vertexCount, gl.UNSIGNED_SHORT, 0);
    }

    function drawLeg(side) {
      const sideName = side === 1 ? "right" : "left";
      const PS = P ? P[sideName] : null;

      // Hip frame (pivot for the entire leg chain)
      const hip = [
        cfg.HIP_OFFSET[0] * side,
        cfg.HIP_OFFSET[1],
        cfg.HIP_OFFSET[2],
      ];
      const hipFrame = mat4.clone(root);
      mat4.translate(hipFrame, hipFrame, hip);
      if (PS && PS.hip) applyTRS(hipFrame, PS.hip);

      // Thigh (mesh-only), retains original tilts
      const thighM = mat4.clone(hipFrame);
      mat4.rotate(thighM, thighM, side * cfg.THIGH_TILT_OUT, [0, 0, 1]);
      mat4.rotate(thighM, thighM, cfg.THIGH_TILT_FWD, [1, 0, 0]);
      if (PS && PS.thigh) applyTRS(thighM, PS.thigh);
      mat4.scale(thighM, thighM, cfg.THIGH_SCALE);
      if (visible(`${sideName}.thigh`)) drawSet(buffers.thigh, thighM);

      // Foot base at ankle (inherits hip transforms)
      const ankleBase = mat4.clone(hipFrame);
      mat4.translate(ankleBase, ankleBase, [
        0,
        -cfg.ANKLE_DROP,
        cfg.FOOT_FORWARD,
      ]);
      if (PS && PS.ankle) applyTRS(ankleBase, PS.ankle);

      // Foot (with slits) mesh
      const footM = mat4.clone(ankleBase);

      // Local offset before rotations; mirror X across feet if enabled
      if (cfg.FOOT_LOCAL_TRANSLATE) {
        const t = cfg.FOOT_LOCAL_TRANSLATE;
        const mirror =
          cfg.FOOT_LOCAL_MIRROR_X === undefined ||
          cfg.FOOT_LOCAL_MIRROR_X === true;
        const tx = (mirror ? side : 1) * (t[0] || 0);
        const ty = t[1] || 0;
        const tz = t[2] || 0;
        mat4.translate(footM, footM, [tx, ty, tz]);
      }

      if (cfg.flipUpperHemisphereFoot) {
        mat4.rotate(footM, footM, Math.PI, [1, 0, 0]);
      }

      // Base rotations (back-compat)
      if (cfg.FOOT_PITCH) {
        mat4.rotate(footM, footM, cfg.FOOT_PITCH, [1, 0, 0]);
      }
      if (cfg.FOOT_YAW_OUT) {
        mat4.rotate(footM, footM, side * cfg.FOOT_YAW_OUT, [0, 1, 0]);
      }

      // Extra Euler controls
      if (cfg.FOOT_EXTRA_PITCH) {
        mat4.rotate(footM, footM, cfg.FOOT_EXTRA_PITCH, [1, 0, 0]);
      }
      if (cfg.FOOT_EXTRA_YAW) {
        mat4.rotate(footM, footM, cfg.FOOT_EXTRA_YAW, [0, 1, 0]);
      }
      if (cfg.FOOT_ROLL) {
        mat4.rotate(footM, footM, cfg.FOOT_ROLL, [0, 0, 1]);
      }

      // Optional arbitrary-axis rotation
      if (cfg.FOOT_ROTATE && cfg.FOOT_ROTATE.angle) {
        mat4.rotate(
          footM,
          footM,
          cfg.FOOT_ROTATE.angle,
          cfg.FOOT_ROTATE.axis || [0, 0, 1]
        );
      }

      mat4.scale(footM, footM, cfg.FOOT_SCALE);

      const footVisible =
        visible(`${sideName}.foot`) || visible(`${sideName}.leg`);
      if (footVisible) {
        drawSet(buffers.foot, footM);

        // Front half-circle(s) (tied to foot visibility)
        if (
          cfg.FRONT_HALF &&
          cfg.FRONT_HALF.enabled &&
          buffers.frontHalf
        ) {
          const fh = cfg.FRONT_HALF;

          // Build symmetric offsets
          const n = Math.max(1, fh.count | 0);
          const sD = Math.max(0, fh.spacingX || 0);
          const offsets = [];
          if (n === 1) {
            offsets.push(0);
          } else if (n % 2 === 1) {
            offsets.push(0);
            for (let k = 1; k <= (n - 1) / 2; k++) {
              offsets.push(+k * sD, -k * sD);
            }
          } else {
            for (let k = 0; k < n / 2; k++) {
              const d = (k + 0.5) * sD;
              offsets.push(+d, -d);
            }
          }

          gl.enable(gl.POLYGON_OFFSET_FILL);
          gl.polygonOffset(1, 1);

          const baseX =
            (fh.x || 0.0) * (fh.mirrorX === false ? 1 : side);

          for (const d of offsets) {
            const m = mat4.clone(footM);
            // 1) Go to the center slit position
            mat4.translate(m, m, [
              baseX,
              fh.y,
              fh.z - Math.abs(fh.inset),
            ]);
            // 2) Orient slit to face forward, then apply user rot
            mat4.rotate(m, m, -Math.PI * 0.5, [1, 0, 0]); // face +Z
            if (fh.rot) {
              if (fh.rot.pitch) mat4.rotate(m, m, fh.rot.pitch, [1, 0, 0]);
              if (fh.rot.yaw) mat4.rotate(m, m, fh.rot.yaw, [0, 1, 0]);
              if (fh.rot.roll) mat4.rotate(m, m, fh.rot.roll, [0, 0, 1]);
            }
            // 3) Apply spacing in slit-local space along the chosen axis
            const ax = fh.spacingAxis || "x";
            const tx = ax === "x" ? d : 0;
            const ty = ax === "y" ? d : 0;
            const tz = ax === "z" ? d : 0;
            mat4.translate(m, m, [tx, ty, tz]);

            // Fan for side slits (dx sign decides left/right)
            if (fh.fan) {
              const lr = Math.sign(d) || 0; // 0 for center
              const outward = fh.fan.outward !== false ? side : 1;
              if (fh.fan.pitch)
                mat4.rotate(m, m, lr * fh.fan.pitch, [1, 0, 0]);
              if (fh.fan.yaw)
                mat4.rotate(m, m, outward * lr * fh.fan.yaw, [0, 1, 0]);
              if (fh.fan.roll)
                mat4.rotate(m, m, outward * lr * fh.fan.roll, [0, 0, 1]);
            }

            mat4.scale(m, m, fh.scale);
            drawSet(buffers.frontHalf, m);
          }

          gl.disable(gl.POLYGON_OFFSET_FILL);
        }

        // Optional side overlays (tied to foot visibility)
        if (
          cfg.SIDE_SLITS &&
          cfg.SIDE_SLITS.enabled &&
          buffers.slitHemi
        ) {
          const ss = cfg.SIDE_SLITS;
          gl.enable(gl.POLYGON_OFFSET_FILL);
          gl.polygonOffset(1, 1);
          for (let i = 0; i < ss.count; i++) {
            const m = mat4.clone(footM);
            const z = ss.startZ + i * ss.spacingZ;
            const x = side * ss.outwardX + -side * Math.abs(ss.inset);
            const y = ss.y;
            mat4.translate(m, m, [x, y, z]);
            mat4.rotate(m, m, side * Math.PI * 0.5, [0, 0, 1]);
            mat4.scale(m, m, ss.scale);
            drawSet(buffers.slitHemi, m);
          }
          gl.disable(gl.POLYGON_OFFSET_FILL);
        }
      }
    }

    drawLeg(+1);
    drawLeg(-1);
  }

  // --- Geometry generators ---
  function createSphereArrays(color, latBands, lonBands, radius) {
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

  // Helpers
  function clamp(x, a, b) {
    return Math.max(a, Math.min(b, x));
  }
  function smoothstep(e0, e1, x) {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function angleDist(a, b) {
    let d = Math.abs(a - b) % (2 * Math.PI);
    return d > Math.PI ? 2 * Math.PI - d : d;
  }
  function mix(a, b, t) {
    return a + (b - a) * t;
  }

  // Hemisphere along Y; lower=true keeps y<=0 (dome downward), else y>=0
  function createHemisphereYArrays(
    color,
    radius,
    latBands,
    lonBands,
    lower,
    slitOpts
  ) {
    const positions = [];
    const colors = [];
    const indices = [];

    const startLat = lower ? Math.ceil(latBands / 2) : 0;
    const endLat = lower ? latBands : Math.floor(latBands / 2);

    const useSlits = slitOpts && slitOpts.enabled;
    const frontPhi = Math.PI / 2; // +Z direction
    const nSlits = useSlits ? Math.max(1, slitOpts.count | 0) : 0;
    const spread = useSlits ? slitOpts.spread : 0;
    const halfW = useSlits ? Math.max(1e-4, slitOpts.width) : 0;
    const depth = useSlits ? clamp(slitOpts.depth, 0, 0.95) : 0;
    const heightTop = useSlits ? clamp(slitOpts.heightTop, 0, 1) : 0;
    const darken = useSlits ? clamp(slitOpts.darken, 0, 1) : 0;
    const round = useSlits ? Math.max(1, slitOpts.round) : 1;

    for (let lat = startLat; lat <= endLat; lat++) {
      const theta = (lat * Math.PI) / latBands;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      for (let lon = 0; lon <= lonBands; lon++) {
        const phi = (lon * 2 * Math.PI) / lonBands;
        const sinP = Math.sin(phi);
        const cosP = Math.cos(phi);

        let rScale = 1.0;
        let slitStrength = 0.0;

        if (useSlits) {
          let s = 0.0;
          const mid = (nSlits - 1) * 0.5;
          for (let i = 0; i < nSlits; i++) {
            const center = frontPhi + (i - mid) * spread;
            const d = angleDist(phi, center);
            const m = smoothstep(halfW, 0.0, d);
            if (m > s) s = m;
          }
          const yBase = radius * cosT;
          const h = smoothstep(heightTop * -radius, 0.0, yBase);
          slitStrength = Math.pow(s * h, round);
          rScale = 1.0 - depth * slitStrength;
        }

        const x = radius * rScale * cosP * sinT;
        const y = radius * rScale * cosT;
        const z = radius * rScale * sinP * sinT;

        positions.push(x, y, z);

        if (useSlits) {
          const r = mix(color[0], 0.0, slitStrength * darken);
          const g = mix(color[1], 0.0, slitStrength * darken);
          const b = mix(color[2], 0.0, slitStrength * darken);
          colors.push(r, g, b, color[3]);
        } else {
          colors.push(...color);
        }
      }
    }

    const eff = endLat - startLat;
    for (let lat = 0; lat < eff; lat++) {
      for (let lon = 0; lon < lonBands; lon++) {
        const first = lat * (lonBands + 1) + lon;
        const second = first + lonBands + 1;
        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    return { positions, colors, indices };
  }

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

  // Utility: shallow-deep merge for nested config objects
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

  global.MegaLegs = {
    init,
    draw,
    createPose,
    makePoseAPI,
    Groups,
    defaults: DEFAULTS,
  };
})(typeof window !== "undefined" ? window : this);