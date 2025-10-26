// mega_head.js (modular, reusable, grouped transforms, no canvas/shaders/loop)
// Mega Swampert — Head (top/bottom hemispheres, cheek pads, spikes, eyes,
// nose, eyebrows, grooves upper/lower)
//
// New rig API (for animation):
//   - MegaHead.createPose(): build a hierarchical TRS pose object
//   - MegaHead.makePoseAPI(pose): convenient mutators per group
//   - MegaHead.Groups: string keys for addressing parts (for masks, etc.)
//   - MegaHead.draw(..., overrides, pose): optional pose + renderMask
//
// Usage:
//   const head = MegaHead.init(gl);
//   const pose = MegaHead.createPose();
//   const api = MegaHead.makePoseAPI(pose);
//   // In your render loop:
//   MegaHead.draw(gl, programInfo, head, viewMatrix, {
//     group: { translate: [0, 1.6, 0.8], scale: [1.0, 1.0, 1.0] },
//     // Optional: renderMask as Set or object of booleans
//     // renderMask: new Set(["head.upper", "head.jaw", "head.groovesLower"]),
//     // Optional: override jaw pivot (hinge) if desired
//     // jawPivot: [0, 0, 0.6],
//   }, pose);
//
// Requires: glMatrix (mat4). Your shader must provide:
//   attributes: aVertexPosition (vec3), aVertexColor (vec4)
//   uniforms:   uModelViewMatrix (mat4) per draw,
//               uProjectionMatrix (mat4) set by your app per frame.

(function (global) {
  // -----------------------------------------------------------
  // Palette
  const BLUE = [0.18, 0.55, 0.95, 1.0];
  const WHITE = [0.95, 0.95, 0.95, 1.0];
  const DARK = [0.14, 0.14, 0.14, 1.0];
  const ORANGE = [1.0, 0.6, 0.0, 1.0];
  const IRIS = [0.98, 0.75, 0.24, 1.0];
  const BLACK = [0.06, 0.06, 0.06, 1.0];

  // -----------------------------------------------------------
  // Defaults for draw-time transforms
  const DEFAULTS = {
    // Group transform for the entire head assembly (pre-rig root)
    group: {
      translate: [0, -2.6, 2],
      rotate: { angle: 0.3, axis: [1, 0, 0] },
      scale: [1.4, 1.4, 1.4],
    },

    // Optional jaw hinge pivot in head space (used for jaw rotations)
    jawPivot: [0, 0, 0], // override per model if needed, e.g. [0, 0, 0.6]

    top: {
      scale: [1.3, 1.2, 1.1],
      translate: [0, 0, 0],
    },
    bottom: {
      scale: [1.3, 0.7, 1.1],
      translate: [0, 0, 0],
    },

    // Grooves: two rings, one following upper, one following jaw (lower)
    grooves: {
      scale: [1.3, 2.0, 1.1],
      translate: [0, 0, 0],
    },
    groovesLower: {
      scale: [1.3, 2.0, 1.1],
      translate: [0, 0, 0],
    },

    rightCheekPad: {
      translate: [0.9, 0.22, -0.4],
      rotateA: { angle: -Math.PI / 2, axis: [1.1, 1, -0.1] },
      rotateB: { angle: Math.PI / 10, axis: [2, 2, 0.7] },
      scale: [1.3, 1.5, 3.5],
    },
    leftCheekPad: {
      mirrorX: true,
      translate: [0.9, 0.22, -0.4],
      rotateA: { angle: -Math.PI / 2, axis: [1.1, 1, -0.1] },
      rotateB: { angle: Math.PI / 10, axis: [2, 2, 0.7] },
      scale: [1.3, 1.5, 3.5],
    },
    spikes: {
      frameScale: [1.7, 1.5, 2.7], // X is signed by 'side'
      frameTranslate: [0.8, 0.54, 0.0],
      frameRotateA: { angle: -Math.PI / 2, axis: [1.2, 0.8, -0.1] },
      frameRotateB: { angle: Math.PI / 10, axis: [2, 2, 1.7] },
      cones: [
        {
          offset: [0.15, 0.08, -0.06],
          tiltZ: 0.8,
          sweepY: 0.22,
          len: 1.65,
          r: 0.18,
        },
        {
          offset: [0.14, -0.12, -0.2],
          tiltZ: 0.58,
          sweepY: 0.22,
          len: 1.25,
          r: 0.165,
        },
        {
          offset: [0.12, -0.32, -0.28],
          tiltZ: -0.18,
          sweepY: 0.22,
          len: 0.8,
          r: 0.145,
        },
      ],
    },
    eye: {
      baseTranslate: [0.56, 0.4, 0.9], // X is signed by 'side'
      yawOut: 0.32,
      pitch: 0.15,
      rollIn: 0.65, // negative rolls inner corner down on right (+side)
      pupilOffset: [-0.05, 0.03, 0.055], // X is signed by 'side'
      highlightOffset: [0.06, 0.08, 0.07], // X is signed by 'side'
    },
    nostril: {
      translate: [0.11, 0.21, 1.1], // X is signed by 'side'
      yawOut: 0.35,
      pitchDown: -0.15,
      roll: 0.25,
    },
    // Eyebrows (thin prisms), mirrored on X per side
    eyebrow: {
      baseTranslate: [0.58, 0.62, 0.93],
      yawOut: 0.32,
      pitch: 0.12,
      rollIn: 0.2,
      size: { w: 0.32, h: 0.06, t: 0.03 },
      offset: [0.0, 0.0, 0.0],
    },
  };

  // Geometry-time params
  const HEMI_BANDS = { lat: 30, lon: 30, radius: 1.0, offsetY: 0.0 };
  const GROOVE = {
    segments: 20,
    amplitude: 0.06,
    height: 0.03,
    radius: 1.0 * 1.05,
  };
  // Cheek pad: taper so edges/top/bottom are thinner
  const CHEEK = {
    radius: 1.0,
    xCut: 0.5,
    thickness: 0.2,
    segments: 24,
    edge: { narrow: 1.4, spread: 0.08 },
    topBottom: { narrow: 0.75, spread: 0.1 },
  };
  const CONE_SEGMENTS = 28;
  const EYE = {
    irisRx: 0.2,
    irisRy: 0.16,
    irisT: 0.06,
    irisSeg: 36,
    pupilRx: 0.08,
    pupilRy: 0.1,
    pupilT: 0.05,
    pupilSeg: 30,
    hiR: 0.03,
    hiT: 0.025,
    hiSeg: 18,
  };
  const NOSTRIL = { rx: 0.035, ry: 0.02, t: 0.02, seg: 20 };

  // -----------------------------------------------------------
  // Group registry (names to target in animation/masks)
  const Groups = {
    root: "root",
    head: "head", // full head pivot (upper + jaw)
    upper: "head.upper", // blue/top half pivot
    jaw: "head.jaw", // white/bottom half (jaw) pivot
    grooves: "head.grooves", // grooves ring following upper
    groovesLower: "head.groovesLower", // grooves ring following jaw/lower
    cheek: {
      left: "head.cheek.left",
      right: "head.cheek.right",
    },
    spikes: {
      left: "head.spikes.left",
      right: "head.spikes.right",
    },
    eyes: {
      left: {
        cluster: "head.eyeL.cluster",
        iris: "head.eyeL.iris",
        pupil: "head.eyeL.pupil",
        highlight: "head.eyeL.highlight",
      },
      right: {
        cluster: "head.eyeR.cluster",
        iris: "head.eyeR.iris",
        pupil: "head.eyeR.pupil",
        highlight: "head.eyeR.highlight",
      },
    },
    eyebrow: {
      left: "head.eyebrow.left",
      right: "head.eyebrow.right",
    },
    nostril: {
      left: "head.nostril.left",
      right: "head.nostril.right",
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
  function applyTRSAtPivot(m, trs, pivot) {
    if (!trs) return;
    const p = pivot || [0, 0, 0];
    if (p[0] !== 0 || p[1] !== 0 || p[2] !== 0) {
      mat4.translate(m, m, p);
      applyTRS(m, trs);
      mat4.translate(m, m, [-p[0], -p[1], -p[2]]);
    } else {
      applyTRS(m, trs);
    }
  }

  // Create a new identity pose object for all groups
  function createPose() {
    return {
      root: makeTRS(), // pre-head global
      head: makeTRS(), // full-head pivot (affects upper + jaw + children)
      upper: makeTRS(), // upper/top half pivot
      jaw: makeTRS(), // bottom/jaw pivot (uses jawPivot)
      grooves: makeTRS(), // grooves following upper
      groovesLower: makeTRS(), // grooves following jaw/lower

      cheek: {
        left: makeTRS(),
        right: makeTRS(),
      },
      spikes: {
        left: makeTRS(),
        right: makeTRS(),
      },
      eyes: {
        left: {
          cluster: makeTRS(),
          iris: makeTRS(),
          pupil: makeTRS(),
          highlight: makeTRS(),
        },
        right: {
          cluster: makeTRS(),
          iris: makeTRS(),
          pupil: makeTRS(),
          highlight: makeTRS(),
        },
      },
      eyebrow: {
        left: makeTRS(),
        right: makeTRS(),
      },
      nostril: {
        left: makeTRS(),
        right: makeTRS(),
      },
    };
  }

  // Pose API: returns convenient mutators per group
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
      head: ops(pose.head),
      upper: ops(pose.upper),
      jaw: ops(pose.jaw),
      grooves: ops(pose.grooves),
      groovesLower: ops(pose.groovesLower),
      cheek: {
        left: ops(pose.cheek.left),
        right: ops(pose.cheek.right),
      },
      spikes: {
        left: ops(pose.spikes.left),
        right: ops(pose.spikes.right),
      },
      eyes: {
        left: {
          cluster: ops(pose.eyes.left.cluster),
          iris: ops(pose.eyes.left.iris),
          pupil: ops(pose.eyes.left.pupil),
          highlight: ops(pose.eyes.left.highlight),
        },
        right: {
          cluster: ops(pose.eyes.right.cluster),
          iris: ops(pose.eyes.right.iris),
          pupil: ops(pose.eyes.right.pupil),
          highlight: ops(pose.eyes.right.highlight),
        },
      },
      eyebrow: {
        left: ops(pose.eyebrow.left),
        right: ops(pose.eyebrow.right),
      },
      nostril: {
        left: ops(pose.nostril.left),
        right: ops(pose.nostril.right),
      },
    };
  }

  // -----------------------------------------------------------
  // Public: build GL buffers for head parts
  function init(gl) {
    // Hemispheres (arrays -> buffers)
    const topArrays = createHemisphereGeometry(
      true,
      BLUE,
      HEMI_BANDS.lat,
      HEMI_BANDS.lon,
      HEMI_BANDS.radius,
      HEMI_BANDS.offsetY
    );
    const top = makeBufferSet(gl, topArrays);

    const bottomArrays = createHemisphereGeometry(
      false,
      WHITE,
      HEMI_BANDS.lat,
      HEMI_BANDS.lon,
      HEMI_BANDS.radius,
      HEMI_BANDS.offsetY
    );
    const bottom = makeBufferSet(gl, bottomArrays);

    // Zig-zag cheek ring (already returns GL buffers)
    const grooves = createGroovesGeometry(
      gl,
      DARK,
      GROOVE.segments,
      GROOVE.amplitude,
      GROOVE.height,
      GROOVE.radius
    );

    // Cheek pads (circular segment extruded with taper)
    const rightCheekPad = createCheekBaseGeometry(
      gl,
      ORANGE,
      CHEEK.radius,
      CHEEK.xCut,
      CHEEK.thickness,
      CHEEK.segments,
      { edge: CHEEK.edge, topBottom: CHEEK.topBottom }
    );
    const leftCheekPad = createCheekBaseGeometry(
      gl,
      ORANGE,
      CHEEK.radius,
      CHEEK.xCut,
      CHEEK.thickness,
      CHEEK.segments,
      { edge: CHEEK.edge, topBottom: CHEEK.topBottom }
    );

    // Reusable cone for spikes
    const cone = createUnitConeGeometry(gl, ORANGE, CONE_SEGMENTS);

    // Eyes + nostrils (ellipse discs)
    const eyeIris = createEllipseDiscGeometry(
      gl,
      IRIS,
      EYE.irisRx,
      EYE.irisRy,
      EYE.irisT,
      EYE.irisSeg
    );
    const eyePupil = createEllipseDiscGeometry(
      gl,
      BLACK,
      EYE.pupilRx,
      EYE.pupilRy,
      EYE.pupilT,
      EYE.pupilSeg
    );
    const eyeHighlight = createEllipseDiscGeometry(
      gl,
      WHITE,
      EYE.hiR,
      EYE.hiR,
      EYE.hiT,
      EYE.hiSeg
    );
    const nostril = createEllipseDiscGeometry(
      gl,
      DARK,
      NOSTRIL.rx,
      NOSTRIL.ry,
      NOSTRIL.t,
      NOSTRIL.seg
    );

    // Eyebrow prism (reused for both sides)
    const eyebrow = createRectPrismGeometry(
      gl,
      BLACK,
      DEFAULTS.eyebrow.size.w,
      DEFAULTS.eyebrow.size.h,
      DEFAULTS.eyebrow.size.t
    );

    return {
      top,
      bottom,
      grooves,
      rightCheekPad,
      leftCheekPad,
      cone,
      eyeIris,
      eyePupil,
      eyeHighlight,
      nostril,
      eyebrow,
    };
  }

  // -----------------------------------------------------------
  // Public: draw into provided view matrix (with GROUP transform + pose)
  // Signature: draw(gl, programInfo, buffers, viewMatrix, overrides?, pose?)
  function draw(gl, programInfo, buffers, viewMatrix, overrides, pose) {
    const cfg = deepMerge(DEFAULTS, overrides || {});
    const P = pose || null;

    const mask = cfg.renderMask || null;
    function visible(key) {
      if (!mask) return true;
      if (mask instanceof Set) return mask.has(key);
      if (typeof mask === "object") return !!mask[key];
      return true;
    }

    // Build a root/group matrix that moves/scales the WHOLE head
    const root = mat4.clone(viewMatrix);
    // Order: translate -> rotate -> scale (keeps translation unscaled)
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

    // Head frame (affects both upper and jaw)
    const headFrame = mat4.clone(root);
    if (P && P.head) applyTRS(headFrame, P.head);

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

    // -------------------------
    // UPPER HEAD FRAME (blue)
    const upperFrame = mat4.clone(headFrame);
    if (P && P.upper) applyTRS(upperFrame, P.upper);

    // Top hemisphere (blue)
    {
      const m = mat4.clone(upperFrame);
      mat4.scale(m, m, cfg.top.scale);
      mat4.translate(m, m, cfg.top.translate);
      if (visible(Groups.upper)) drawSet(buffers.top, m);
    }

    // Zig-zag ring (attach to upper)
    {
      const m = mat4.clone(upperFrame);
      if (P && P.grooves) applyTRS(m, P.grooves);
      mat4.scale(m, m, cfg.grooves.scale);
      mat4.translate(m, m, cfg.grooves.translate);
      if (visible(Groups.grooves)) drawSet(buffers.grooves, m);
    }

    // Cheek pads (follow upper)
    {
      // Right cheek
      const mR = mat4.clone(upperFrame);
      if (P && P.cheek && P.cheek.right) applyTRS(mR, P.cheek.right);
      mat4.translate(mR, mR, cfg.rightCheekPad.translate);
      mat4.rotate(
        mR,
        mR,
        cfg.rightCheekPad.rotateA.angle,
        cfg.rightCheekPad.rotateA.axis
      );
      mat4.rotate(
        mR,
        mR,
        cfg.rightCheekPad.rotateB.angle,
        cfg.rightCheekPad.rotateB.axis
      );
      mat4.scale(mR, mR, cfg.rightCheekPad.scale);
      if (visible(Groups.cheek.right)) drawSet(buffers.rightCheekPad, mR);

      // Left cheek (mirror X)
      const mL = mat4.clone(upperFrame);
      if (P && P.cheek && P.cheek.left) applyTRS(mL, P.cheek.left);
      if (cfg.leftCheekPad.mirrorX) mat4.scale(mL, mL, [-1, 1, 1]);
      mat4.translate(mL, mL, cfg.leftCheekPad.translate);
      mat4.rotate(
        mL,
        mL,
        cfg.leftCheekPad.rotateA.angle,
        cfg.leftCheekPad.rotateA.axis
      );
      mat4.rotate(
        mL,
        mL,
        cfg.leftCheekPad.rotateB.angle,
        cfg.leftCheekPad.rotateB.axis
      );
      mat4.scale(mL, mL, cfg.leftCheekPad.scale);
      if (visible(Groups.cheek.left)) drawSet(buffers.leftCheekPad, mL);
    }

    // Spikes (3 cones per side) - follow upper
    function buildSpikeFrame(side) {
      const m = mat4.clone(upperFrame);
      // Pose per side
      if (P && P.spikes) {
        if (side === -1 && P.spikes.left) applyTRS(m, P.spikes.left);
        if (side === +1 && P.spikes.right) applyTRS(m, P.spikes.right);
      }
      // X scale is signed by side
      mat4.scale(m, m, [
        cfg.spikes.frameScale[0] * side,
        cfg.spikes.frameScale[1],
        cfg.spikes.frameScale[2],
      ]);
      mat4.translate(m, m, cfg.spikes.frameTranslate);
      mat4.rotate(
        m,
        m,
        cfg.spikes.frameRotateA.angle,
        cfg.spikes.frameRotateA.axis
      );
      mat4.rotate(
        m,
        m,
        cfg.spikes.frameRotateB.angle,
        cfg.spikes.frameRotateB.axis
      );
      return m;
    }
    function placeCone(baseFrame, spec, maskKey) {
      const m = mat4.clone(baseFrame);
      mat4.translate(m, m, spec.offset);
      mat4.rotate(m, m, spec.tiltZ, [0, 0, 1]);
      mat4.rotate(m, m, spec.sweepY, [0, 1, 0]);
      mat4.scale(m, m, [spec.len, spec.r, spec.r]);
      if (visible(maskKey)) drawSet(buffers.cone, m);
    }

    const frameL = buildSpikeFrame(-1);
    const frameR = buildSpikeFrame(+1);
    for (const c of cfg.spikes.cones) {
      placeCone(frameL, c, Groups.spikes.left);
      placeCone(frameR, c, Groups.spikes.right);
    }

    // Eyes (follow upper)
    function drawEye(side) {
      const maskBase =
        side === 1 ? Groups.eyes.right : Groups.eyes.left;

      const base = mat4.clone(upperFrame);
      // Pose: eye cluster
      if (P && P.eyes) {
        if (side === -1 && P.eyes.left && P.eyes.left.cluster) {
          applyTRS(base, P.eyes.left.cluster);
        }
        if (side === +1 && P.eyes.right && P.eyes.right.cluster) {
          applyTRS(base, P.eyes.right.cluster);
        }
      }
      mat4.translate(base, base, [
        cfg.eye.baseTranslate[0] * side,
        cfg.eye.baseTranslate[1],
        cfg.eye.baseTranslate[2],
      ]);
      mat4.rotate(base, base, side * cfg.eye.yawOut, [0, 1, 0]);
      mat4.rotate(base, base, cfg.eye.pitch, [1, 0, 0]);
      mat4.rotate(base, base, side * cfg.eye.rollIn, [0, 0, 1]);

      // Iris
      if (visible(maskBase.iris)) drawSet(buffers.eyeIris, base);

      // Pupil
      const pupilM = mat4.clone(base);
      mat4.translate(pupilM, pupilM, [
        cfg.eye.pupilOffset[0] * side,
        cfg.eye.pupilOffset[1],
        cfg.eye.pupilOffset[2],
      ]);
      if (P && P.eyes) {
        const pTRS =
          side === -1
            ? P.eyes.left && P.eyes.left.pupil
            : P.eyes.right && P.eyes.right.pupil;
        if (pTRS) applyTRS(pupilM, pTRS);
      }
      if (visible(maskBase.pupil)) drawSet(buffers.eyePupil, pupilM);

      // Highlight
      const hiM = mat4.clone(base);
      mat4.translate(hiM, hiM, [
        cfg.eye.highlightOffset[0] * side,
        cfg.eye.highlightOffset[1],
        cfg.eye.highlightOffset[2],
      ]);
      if (P && P.eyes) {
        const hTRS =
          side === -1
            ? P.eyes.left && P.eyes.left.highlight
            : P.eyes.right && P.eyes.right.highlight;
        if (hTRS) applyTRS(hiM, hTRS);
      }
      if (visible(maskBase.highlight)) drawSet(buffers.eyeHighlight, hiM);
    }
    drawEye(+1);
    drawEye(-1);

    // Eyebrows (angry slant) - follow upper
    function drawEyebrow(side) {
      const m = mat4.clone(upperFrame);
      if (P && P.eyebrow) {
        if (side === -1 && P.eyebrow.left) applyTRS(m, P.eyebrow.left);
        if (side === +1 && P.eyebrow.right) applyTRS(m, P.eyebrow.right);
      }
      mat4.translate(m, m, [
        cfg.eyebrow.baseTranslate[0] * side +
          cfg.eyebrow.offset[0] * side,
        cfg.eyebrow.baseTranslate[1] + cfg.eyebrow.offset[1],
        cfg.eyebrow.baseTranslate[2] + cfg.eyebrow.offset[2],
      ]);
      mat4.rotate(m, m, side * cfg.eyebrow.yawOut, [0, 1, 0]);
      mat4.rotate(m, m, cfg.eyebrow.pitch, [1, 0, 0]);
      mat4.rotate(m, m, side * cfg.eyebrow.rollIn, [0, 0, 1]);
      const key = side === -1 ? Groups.eyebrow.left : Groups.eyebrow.right;
      if (visible(key)) drawSet(buffers.eyebrow, m);
    }
    drawEyebrow(+1);
    drawEyebrow(-1);

    // Nostrils (follow upper)
    function drawNostril(side) {
      const m = mat4.clone(upperFrame);
      if (P && P.nostril) {
        if (side === -1 && P.nostril.left) applyTRS(m, P.nostril.left);
        if (side === +1 && P.nostril.right) applyTRS(m, P.nostril.right);
      }
      mat4.translate(m, m, [
        cfg.nostril.translate[0] * side,
        cfg.nostril.translate[1],
        cfg.nostril.translate[2],
      ]);
      mat4.rotate(m, m, side * cfg.nostril.yawOut, [0, 1, 0]);
      mat4.rotate(m, m, cfg.nostril.pitchDown, [1, 0, 0]);
      mat4.rotate(m, m, side * cfg.nostril.roll, [0, 0, 1]);
      const key =
        side === -1 ? Groups.nostril.left : Groups.nostril.right;
      if (visible(key)) drawSet(buffers.nostril, m);
    }
    drawNostril(+1);
    drawNostril(-1);

    // -------------------------
    // JAW FRAME (white/bottom hemisphere)
    const jawFrame = mat4.clone(headFrame);
    if (P && P.jaw) applyTRSAtPivot(jawFrame, P.jaw, cfg.jawPivot);

    // Grooves attached to jaw (lower)
    {
      const m = mat4.clone(jawFrame);
      if (P && P.groovesLower) applyTRS(m, P.groovesLower);
      mat4.scale(m, m, cfg.groovesLower.scale);
      mat4.translate(m, m, cfg.groovesLower.translate);
      if (visible(Groups.groovesLower)) drawSet(buffers.grooves, m);
    }

    // Bottom hemisphere (jaw)
    {
      const m = mat4.clone(jawFrame);
      mat4.scale(m, m, cfg.bottom.scale);
      mat4.translate(m, m, cfg.bottom.translate);
      if (visible(Groups.jaw)) drawSet(buffers.bottom, m);
    }
  }

  // -----------------------------------------------------------
  // Geometry: hemisphere (split sphere) -> arrays
  function createHemisphereGeometry(
    isTopHemisphere,
    color,
    latitudeBands,
    longitudeBands,
    radius,
    offsetY
  ) {
    const positions = [];
    const colors = [];
    const indices = [];

    const startLat = isTopHemisphere ? 0 : Math.floor(latitudeBands / 2);
    const endLat = isTopHemisphere
      ? Math.ceil(latitudeBands / 2)
      : latitudeBands;

    for (let lat = startLat; lat <= endLat; lat++) {
      const theta = (lat * Math.PI) / latitudeBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= longitudeBands; lon++) {
        const phi = (lon * 2 * Math.PI) / longitudeBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;

        positions.push(radius * x);
        positions.push(
          radius * y + (isTopHemisphere ? offsetY : -offsetY)
        );
        positions.push(radius * z);
        colors.push(...color);
      }
    }

    const effectiveLatBands = endLat - startLat;
    for (let lat = 0; lat < effectiveLatBands; lat++) {
      for (let lon = 0; lon < longitudeBands; lon++) {
        const first = lat * (longitudeBands + 1) + lon;
        const second = first + longitudeBands + 1;
        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    return { positions, colors, indices };
  }

  // -----------------------------------------------------------
  // Geometry: zig-zag ring for the cheek line (returns GL buffers)
  function createGroovesGeometry(
    gl,
    color,
    segments,
    amplitude,
    height,
    radius
  ) {
    const positions = [];
    const colors = [];
    const indices = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i * 2 * Math.PI) / segments;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const waveY = (i % 2 === 0 ? 1 : -1) * amplitude;

      positions.push(x, waveY + height / 2, z);
      colors.push(...color);

      positions.push(x, waveY - height / 2, z);
      colors.push(...color);
    }

    for (let i = 0; i < segments; i++) {
      const i0 = i * 2;
      const i1 = i * 2 + 1;
      const i2 = (i + 1) * 2;
      const i3 = (i + 1) * 2 + 1;
      indices.push(i0, i1, i2);
      indices.push(i1, i3, i2);
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
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(colors),
      gl.STATIC_DRAW
    );

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

  // -----------------------------------------------------------
  // Geometry: cheek pad base (circular segment extruded along Z) -> GL buffers
  function createCheekBaseGeometry(
    gl,
    color,
    radius,
    xCut,
    thickness,
    segments,
    taperOpts
  ) {
    const positions = [];
    const colors = [];
    const indices = [];
    const halfT = thickness * 0.5;

    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const smoothstep = (e0, e1, x) => {
      const t = clamp01((x - e0) / Math.max(1e-6, e1 - e0));
      return t * t * (3 - 2 * t);
    };
    const edge = (taperOpts && taperOpts.edge) || {
      narrow: 0,
      spread: 0.6,
    };
    const tb =
      (taperOpts && taperOpts.topBottom) || { narrow: 0, spread: 0.2 };

    const eps = 1e-5;
    xCut = Math.max(-radius + eps, Math.min(radius - eps, xCut));
    const yCut = Math.sqrt(radius * radius - xCut * xCut);

    const aTop = Math.atan2(yCut, xCut);
    const aBot = -aTop;

    const boundary = [];
    boundary.push(xCut, yCut, 0);
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const a = aTop + (aBot - aTop) * t;
      boundary.push(radius * Math.cos(a), radius * Math.sin(a), 0);
    }
    boundary.push(xCut, -yCut, 0);

    const n = boundary.length / 3;

    // front/back with variable local thickness: narrower at ends and top/bottom
    const endSpreadCount = Math.max(1, Math.floor((n - 1) * edge.spread));
    for (let i = 0; i < n; i++) {
      const x = boundary[i * 3 + 0];
      const y = boundary[i * 3 + 1];
      const dEnd = Math.min(i, n - 1 - i);
      const endProx = 1 - clamp01(dEnd / Math.max(1, endSpreadCount));
      const yNorm = Math.min(1, Math.abs(y) / Math.max(1e-6, yCut));
      const tbProx = smoothstep(1 - tb.spread, 1, yNorm);
      const scale = 1 - Math.max(edge.narrow * endProx, tb.narrow * tbProx);
      const h = Math.max(halfT * 0.3, halfT * scale);
      positions.push(x, y, +h);
      colors.push(...color);
    }
    for (let i = 0; i < n; i++) {
      const x = boundary[i * 3 + 0];
      const y = boundary[i * 3 + 1];
      const dEnd = Math.min(i, n - 1 - i);
      const endProx = 1 - clamp01(dEnd / Math.max(1, endSpreadCount));
      const yNorm = Math.min(1, Math.abs(y) / Math.max(1e-6, yCut));
      const tbProx = smoothstep(1 - tb.spread, 1, yNorm);
      const scale = 1 - Math.max(edge.narrow * endProx, tb.narrow * tbProx);
      const h = Math.max(halfT * 0.3, halfT * scale);
      positions.push(x, y, -h);
      colors.push(...color);
    }

    // caps
    for (let i = 1; i < n - 1; i++) indices.push(0, i, i + 1);
    const N = n;
    for (let i = 1; i < n - 1; i++)
      indices.push(N + 0, N + i + 1, N + i);

    // side walls
    for (let i = 0; i < n; i++) {
      const i0f = i;
      const i1f = (i + 1) % n;
      const i0b = i0f + N;
      const i1b = i1f + N;
      indices.push(i0f, i0b, i1f);
      indices.push(i1f, i0b, i1b);
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
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(colors),
      gl.STATIC_DRAW
    );

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

  // -----------------------------------------------------------
  // Geometry: reusable UNIT cone (axis +X, base at x=0, tip at x=1) -> GL
  // buffers
  function createUnitConeGeometry(gl, color, segments) {
    const positions = [];
    const colors = [];
    const indices = [];

    for (let i = 0; i < segments; i++) {
      const a = (i * 2 * Math.PI) / segments;
      const y = Math.cos(a);
      const z = Math.sin(a);
      positions.push(0, y, z);
      colors.push(...color);
    }
    const tipIndex = positions.length / 3;
    positions.push(1, 0, 0);
    colors.push(...color);

    const baseCenterIndex = positions.length / 3;
    positions.push(0, 0, 0);
    colors.push(...color);

    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      indices.push(i, next, tipIndex);
    }
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      indices.push(baseCenterIndex, next, i);
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
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(colors),
      gl.STATIC_DRAW
    );

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

  // -----------------------------------------------------------
  // Geometry: ellipse disc (extruded along +Z) -> GL buffers
  function createEllipseDiscGeometry(
    gl,
    color,
    rx,
    ry,
    thickness,
    segments
  ) {
    const h = thickness * 0.5;
    const positions = [];
    const colors = [];
    const indices = [];

    // front center
    positions.push(0, 0, h);
    colors.push(...color);
    // front ring
    for (let i = 0; i < segments; i++) {
      const a = (i * 2 * Math.PI) / segments;
      positions.push(rx * Math.cos(a), ry * Math.sin(a), h);
      colors.push(...color);
    }
    // back center
    const backCenter = positions.length / 3;
    positions.push(0, 0, -h);
    colors.push(...color);
    // back ring
    const backRingStart = positions.length / 3;
    for (let i = 0; i < segments; i++) {
      const a = (i * 2 * Math.PI) / segments;
      positions.push(rx * Math.cos(a), ry * Math.sin(a), -h);
      colors.push(...color);
    }

    // front fan
    for (let i = 0; i < segments; i++) {
      const a0 = 1 + i;
      const a1 = 1 + ((i + 1) % segments);
      indices.push(0, a0, a1);
    }
    // back fan (reverse)
    for (let i = 0; i < segments; i++) {
      const b0 = backRingStart + i;
      const b1 = backRingStart + ((i + 1) % segments);
      indices.push(backCenter, b1, b0);
    }
    // side quads
    for (let i = 0; i < segments; i++) {
      const f0 = 1 + i;
      const f1 = 1 + ((i + 1) % segments);
      const b0 = backRingStart + i;
      const b1 = backRingStart + ((i + 1) % segments);
      indices.push(f0, b0, f1);
      indices.push(f1, b0, b1);
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
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(colors),
      gl.STATIC_DRAW
    );

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

  // -----------------------------------------------------------
  // Geometry: simple rectangular prism centered at origin -> GL buffers
  function createRectPrismGeometry(gl, color, w, h, t) {
    const hw = w * 0.5;
    const hh = h * 0.5;
    const hz = t * 0.5;
    const positions = [
      // front (z = +hz)
      -hw,
      -hh,
      +hz,
      +hw,
      -hh,
      +hz,
      +hw,
      +hh,
      +hz,
      -hw,
      +hh,
      +hz,
      // back (z = -hz)
      -hw,
      -hh,
      -hz,
      +hw,
      -hh,
      -hz,
      +hw,
      +hh,
      -hz,
      -hw,
      +hh,
      -hz,
    ];
    const colors = [];
    for (let i = 0; i < 8; i++) colors.push(...color);
    const indices = [
      // front
      0, 1, 2, 0, 2, 3,
      // back
      5, 4, 7, 5, 7, 6,
      // sides
      0, 4, 1, 1, 4, 5, // bottom
      1, 5, 2, 2, 5, 6, // right
      2, 6, 3, 3, 6, 7, // top
      3, 7, 0, 0, 7, 4, // left
    ];

    const position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(positions),
      gl.STATIC_DRAW
    );

    const colorBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(colors),
      gl.STATIC_DRAW
    );

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

  // -----------------------------------------------------------
  // GL wrapper for array geometries
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
  global.MegaHead = {
    init,
    draw,
    createPose,
    makePoseAPI,
    Groups,
    defaults: DEFAULTS,
  };
})(typeof window !== "undefined" ? window : this);