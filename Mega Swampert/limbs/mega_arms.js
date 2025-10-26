// mega_arms.js (modular, reusable, GROUPED transforms, no canvas/shaders/loop)
// Mega Swampert — Left & Right arms
// Upper arm (ellipsoid) + forearm (ellipsoid) + palm (hemisphere)
// + 3 fingers + 3 orange pads
//
// New rig API (for animation):
//   - MegaArms.createPose(): build a hierarchical TRS pose object
//   - MegaArms.makePoseAPI(pose): convenient mutators per group
//   - MegaArms.Groups: string keys for addressing parts (for masks, etc.)
//   - MegaArms.draw(..., overrides, pose, cameraView): optional pose + renderMask
//
// Added nodes to fix animation ergonomics:
//   - clavicle: pre-shoulder (applied before baked shoulder yaw/pitch/roll).
//   - arm:      post-baked pivot at shoulder (whole chain).
//   - liftWS:   world-space post-translate (fixed path).
//   - rotateWS: world-space post-rotate around shoulder pivot (fixed path).
//   - UPPER_ANCHOR_FRAC_Y: re-anchors upper mesh so hinge looks right.

(function (global) {
  const ARM_BLUE = [0.18, 0.55, 0.95, 1.0];
  const FINGER_DARK = [0.1, 0.1, 0.12, 1.0];
  const PAD_ORANGE = [1.0, 0.6, 0.0, 1.0];

  const UPPER_SCALE = [1.1, 1.2, 2.15];
  const FOREARM_SCALE = [1.75, 1.55, 2.65];
  const PALM_SCALE = [1.2, 0.7, 1.1];

  const FINGER_BASE_RADIUS = 0.68;
  const FINGER_SCALE = [0.7, 0.65, 1.48];

  const SHOULDER_OFFSET = [3.0, 0.7, 1.72];

  const UPPER_PITCH_FWD = 0.15;
  const UPPER_ROLL_OUT = -0.3;
  const UPPER_YAW = 0.0;
  const UPPER_YAW_OUT = 0.6;

  const ELBOW_FROM_SHOULDER = [-0.1, -0.2, 2.22];

  const FOREARM_PITCH_FWD = -0.12;
  const FOREARM_ROLL_OUT = 0.12;
  const FOREARM_YAW_OUT = -0.62;
  const FOREARM_TRANSLATE = [-0.5, 0.0, 0.0];

  const PALM_DROP = 1.05;
  const PALM_FORWARD = 0.53;
  const PALM_PITCH = -0.12;
  const WRIST_YAW = 0.12;
  const WRIST_ROLL = 0.03;

  const PAD_CENTER_OFF = [0.0, 1.42, 0.46];
  const PAD_SIDE_X = 1.5;
  const PAD_SIDE_OFF = [1.0, 0.6, 0.22];
  const PAD_TILT_X = 0.1;
  const PAD_CENTER_SCALE = [0.8, 0.33, 1.2];
  const PAD_SIDE_SCALE = [0.55, 0.48, 0.9];

  const FINGER_FORWARD = 3.05;
  const FINGER_DOWN = -0.5;
  const FINGER_SPREAD_X = 1.8;
  const FINGER_MID_OFFSET_X = 0.0;
  const FINGER_ROW_Z_BIAS = -0.28;

  const FINGER_MID_OFFSET = [0.0, 0.0, 0.3];
  const FINGER_SIDE_OFFSET = [0.0, 0.0, -0.5];

  const FINGER_CLUSTER_ROT = { pitch: -0.7, yaw: 0.0, roll: 0.0 };

  const FINGER_ROT = [
    { pitch: -0.26, yaw: -0.04, roll: 0.0 },
    { pitch: -0.32, yaw: 0.0, roll: 0.0 },
    { pitch: -0.26, yaw: 0.04, roll: 0.0 },
  ];

  const DEFAULTS = {
    group: {
      translate: [0, 0, 0],
      rotate: { angle: 1.0, axis: [1, 0, 0] },
      scale: [1, 1, 1],
    },

    SHOULDER_OFFSET,
    ELBOW_FROM_SHOULDER,

    UPPER_PITCH_FWD,
    UPPER_ROLL_OUT,
    UPPER_YAW,
    UPPER_YAW_OUT,
    FOREARM_PITCH_FWD,
    FOREARM_ROLL_OUT,
    FOREARM_YAW_OUT,
    FOREARM_TRANSLATE,

    PALM_DROP,
    PALM_FORWARD,
    PALM_PITCH,
    WRIST_YAW,
    WRIST_ROLL,

    UPPER_SCALE,
    FOREARM_SCALE,
    PALM_SCALE,
    FINGER_SCALE,

    PAD_CENTER_OFF,
    PAD_SIDE_X,
    PAD_SIDE_OFF,
    PAD_TILT_X,
    PAD_CENTER_SCALE,
    PAD_SIDE_SCALE,

    FINGER_FORWARD,
    FINGER_DOWN,
    FINGER_SPREAD_X,
    FINGER_MID_OFFSET_X,
    FINGER_ROW_Z_BIAS,
    FINGER_MID_OFFSET,
    FINGER_SIDE_OFFSET,
    FINGER_CLUSTER_ROT,
    FINGER_ROT,
   // the half-extent along each local axis [x,y,z]. 1.0 on z ≈ cap at pivot.
FINGER_ANCHOR_FRAC: [0.0, -1.0, 0.5],

// Extra per‑axis bias in scaled local units (use to nudge out/in if needed)
FINGER_ANCHOR_BIAS: [0.0, 1.5, 0.0],

    FINGER_BASE_RADIUS,

    flipUpperHemispherePalm: true,
    UPPER_ANCHOR_FRAC_Y: 1.0,
  };

  const Groups = {
    root: "root",
    left: {
      clavicle: "left.clavicle",
      arm: "left.arm",
      shoulder: "left.shoulder",
      upper: "left.upper",
      forearm: "left.forearm",
      wrist: "left.wrist",
      liftWS: "left.liftWS",
      rotateWS: "left.rotateWS",
      lowerRotateWS: "left.lowerRotateWS",  
      lowerLiftWS: "left.lowerLiftWS",
      fingers: {
        cluster: "left.fingers.cluster",
        finger0: "left.fingers.0",
        finger1: "left.fingers.1",
        finger2: "left.fingers.2",
      },
    },
    right: {
      clavicle: "right.clavicle",
      arm: "right.arm",
      shoulder: "right.shoulder",
      upper: "right.upper",
      forearm: "right.forearm",
      wrist: "right.wrist",
      liftWS: "right.liftWS",
      rotateWS: "right.rotateWS",
      lowerRotateWS: "right.lowerRotateWS", 
      lowerLiftWS: "right.lowerLiftWS",
      fingers: {
        cluster: "right.fingers.cluster",
        finger0: "right.fingers.0",
        finger1: "right.fingers.1",
        finger2: "right.fingers.2",
      },
    },
  };

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

  // Build a pre-multiply matrix for a world-space translate: Mv = V T W V^-1
  function premulWorldTranslateInView(m, vWorld, V, Vinv) {
    if (!vWorld || !V) return;
    const T = mat4.create();
    mat4.translate(T, T, vWorld);
    const Wv = mat4.create();
    mat4.multiply(Wv, V, T);
    mat4.multiply(Wv, Wv, Vinv);
    mat4.multiply(m, Wv, m);
  }

  // Build a pre-multiply for world rotation around world pivot
  function premulWorldRotateAroundInView(m, angle, axisWorld, pivotWorld, V, Vinv) {
    if (!V || !angle) return;
    const T = mat4.create();
    const R = mat4.create();
    const Tinv = mat4.create();
    mat4.translate(T, T, pivotWorld);
    mat4.rotate(R, R, angle, axisWorld || [0, 1, 0]);
    mat4.translate(Tinv, Tinv, [-pivotWorld[0], -pivotWorld[1], -pivotWorld[2]]);
    const W = mat4.create();
    mat4.multiply(W, T, R);
    mat4.multiply(W, W, Tinv);
    const Wv = mat4.create();
    mat4.multiply(Wv, V, W);
    mat4.multiply(Wv, Wv, Vinv);
    mat4.multiply(m, Wv, m);
  }

  // Clavicle in torso/world space (compensate future shoulder rotations)
  function applyClavicleWorld(shoulderFrame, clavTRS, shoulderTRS, side, cfg) {
    if (!clavTRS) return;

    const yaw = side * (cfg.UPPER_YAW + (cfg.UPPER_YAW_OUT || 0.0));
    const pitch = cfg.UPPER_PITCH_FWD;
    const roll = side * cfg.UPPER_ROLL_OUT;

    function rotAxis(v, angle, axis) {
      const [x, y, z] = v;
      const [ax, ay, az] = axis;
      const len = Math.hypot(ax, ay, az) || 1;
      const ux = ax / len, uy = ay / len, uz = az / len;
      const c = Math.cos(angle), s = Math.sin(angle), ic = 1 - c;
      const rx = (c + ux * ux * ic) * x + (ux * uy * ic - uz * s) * y + (ux * uz * ic + uy * s) * z;
      const ry = (uy * ux * ic + uz * s) * x + (c + uy * uy * ic) * y + (uy * uz * ic - ux * s) * z;
      const rz = (uz * ux * ic - uy * s) * x + (uz * uy * ic + ux * s) * y + (c + uz * uz * ic) * z;
      return [rx, ry, rz];
    }

    function invBaked(v) {
      v = rotAxis(v, -roll, [0, 0, 1]);
      v = rotAxis(v, -pitch, [1, 0, 0]);
      v = rotAxis(v, -yaw, [0, 1, 0]);
      return v;
    }
    function invShoulder(v) {
      const rr = shoulderTRS && Array.isArray(shoulderTRS.r) ? shoulderTRS.r : null;
      if (!rr || rr.length === 0) return v;
      for (let i = rr.length - 1; i >= 0; i--) {
        const r = rr[i];
        if (!r || typeof r.angle !== "number" || !r.axis) continue;
        v = rotAxis(v, -r.angle, r.axis);
      }
      return v;
    }

    if (clavTRS.t) {
      let tLocal = clavTRS.t.slice();
      tLocal = invBaked(tLocal);
      tLocal = invShoulder(tLocal);
      mat4.translate(shoulderFrame, shoulderFrame, tLocal);
    }
    if (Array.isArray(clavTRS.r)) {
      for (const r of clavTRS.r) {
        if (!r || typeof r.angle !== "number" || !r.axis) continue;
        mat4.rotate(shoulderFrame, shoulderFrame, r.angle, r.axis);
      }
    }
    if (clavTRS.s) {
      mat4.scale(shoulderFrame, shoulderFrame, clavTRS.s);
    }
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
      left: {
        clavicle: makeTRS(),
        arm: makeTRS(),
        shoulder: makeTRS(),
        upper: makeTRS(),
        forearm: makeTRS(),
        wrist: makeTRS(),
        liftWS: makeTRS(),
        rotateWS: makeTRS(),
        lowerRotateWS: makeTRS(),   
        lowerLiftWS: makeTRS(),    
        fingers: { cluster: makeTRS(), per: [makeTRS(), makeTRS(), makeTRS()] },
      },
      right: {
        clavicle: makeTRS(),
        arm: makeTRS(),
        shoulder: makeTRS(),
        upper: makeTRS(),
        forearm: makeTRS(),
        wrist: makeTRS(),
        liftWS: makeTRS(),
        rotateWS: makeTRS(),
        lowerRotateWS: makeTRS(),   
        lowerLiftWS: makeTRS(),     
        fingers: { cluster: makeTRS(), per: [makeTRS(), makeTRS(), makeTRS()] },
      },
    };
  }

  function makePoseAPI(pose) {
    function ops(trs) {
      return {
        translate(v) { trs.t[0]+=v[0]; trs.t[1]+=v[1]; trs.t[2]+=v[2]; return this; },
        rotate(angle, axis) { trs.r.push({ angle, axis: axis.slice() }); return this; },
        scale(v) { trs.s[0]*=v[0]; trs.s[1]*=v[1]; trs.s[2]*=v[2]; return this; },
        reset() { trs.t=[0,0,0]; trs.r=[]; trs.s=[1,1,1]; return this; },
        get() { return cloneTRS(trs); },
      };
    }
    return {
      root: ops(pose.root),
      left: {
        clavicle: ops(pose.left.clavicle),
        arm: ops(pose.left.arm),
        shoulder: ops(pose.left.shoulder),
        upper: ops(pose.left.upper),
        forearm: ops(pose.left.forearm),
        wrist: ops(pose.left.wrist),
        liftWS: ops(pose.left.liftWS),
        rotateWS: ops(pose.left.rotateWS),
        lowerRotateWS: ops(pose.left.lowerRotateWS), 
        lowerLiftWS: ops(pose.left.lowerLiftWS),     
        fingers: {
          cluster: ops(pose.left.fingers.cluster),
          finger0: ops(pose.left.fingers.per[0]),
          finger1: ops(pose.left.fingers.per[1]),
          finger2: ops(pose.left.fingers.per[2]),
        },
      },
      right: {
        clavicle: ops(pose.right.clavicle),
        arm: ops(pose.right.arm),
        shoulder: ops(pose.right.shoulder),
        upper: ops(pose.right.upper),
        forearm: ops(pose.right.forearm),
        wrist: ops(pose.right.wrist),
        liftWS: ops(pose.right.liftWS),
        rotateWS: ops(pose.right.rotateWS),
        lowerRotateWS: ops(pose.right.lowerRotateWS), 
        lowerLiftWS: ops(pose.right.lowerLiftWS),     
        fingers: {
          cluster: ops(pose.right.fingers.cluster),
          finger0: ops(pose.right.fingers.per[0]),
          finger1: ops(pose.right.fingers.per[1]),
          finger2: ops(pose.right.fingers.per[2]),
        },
      },
    };
  }

  function init(gl) {
    const lat = 36, lon = 36;
    const upper = makeBufferSet(gl, createSphereArrays(ARM_BLUE, lat, lon, 1.0));
    const forearm = makeBufferSet(gl, createSphereArrays(ARM_BLUE, lat, lon, 1.0));
    const palm = makeBufferSet(gl, createHemisphereYArrays(ARM_BLUE, 0.75, lat, lon, false));
    const finger = makeBufferSet(gl, createSphereArrays(FINGER_DARK, 24, 24, DEFAULTS.FINGER_BASE_RADIUS));
    const padCenter = makeBufferSet(gl, createSphereArrays(PAD_ORANGE, 24, 24, 1.0));
    const padSide = makeBufferSet(gl, createSphereArrays(PAD_ORANGE, 24, 24, 1.0));
    return { upper, forearm, palm, finger, padCenter, padSide };
  }

  // draw(gl, programInfo, buffers, modelViewRoot, overrides?, pose?, cameraView?)
  function draw(gl, programInfo, buffers, viewModel, overrides, pose, cameraView) {
    const cfg = deepMerge(DEFAULTS, overrides || {});
    const P = pose || null;
    const V = cameraView || null;
    const Vinv = V ? mat4.invert(mat4.create(), V) : null;

    const mask = cfg.renderMask || null;
    function visible(key) {
      if (!mask) return true;
      if (mask instanceof Set) return mask.has(key);
      if (typeof mask === "object") return !!mask[key];
      return true;
    }

    const root = mat4.clone(viewModel);
    if (cfg.group && cfg.group.translate) mat4.translate(root, root, cfg.group.translate);
    if (cfg.group && cfg.group.rotate && cfg.group.rotate.angle)
      mat4.rotate(root, root, cfg.group.rotate.angle, cfg.group.rotate.axis || [0, 1, 0]);
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

    function drawArm(side) {
  const sideName = side === 1 ? "right" : "left";
  const PS = P ? P[sideName] : null;

  // 1) Shoulder frame
  const shoulder = [
    cfg.SHOULDER_OFFSET[0] * side,
    cfg.SHOULDER_OFFSET[1],
    cfg.SHOULDER_OFFSET[2],
  ];
  const shoulderFrame = mat4.clone(root);
  mat4.translate(shoulderFrame, shoulderFrame, shoulder);

  // Pre-shoulder (torso/world) TRS
  if (PS && PS.clavicle) {
    applyClavicleWorld(shoulderFrame, PS.clavicle, PS?.shoulder, side, cfg);
  }

  // Baked base pose
  mat4.rotate(
    shoulderFrame,
    shoulderFrame,
    side * (cfg.UPPER_YAW + (cfg.UPPER_YAW_OUT || 0.0)),
    [0, 1, 0]
  );
  mat4.rotate(shoulderFrame, shoulderFrame, cfg.UPPER_PITCH_FWD, [1, 0, 0]);
  mat4.rotate(shoulderFrame, shoulderFrame, side * cfg.UPPER_ROLL_OUT, [
    0, 0, 1,
  ]);

  // Whole-arm (post-baked) TRS
  if (PS && PS.arm) applyTRS(shoulderFrame, PS.arm);
  if (PS && PS.shoulder) applyTRS(shoulderFrame, PS.shoulder);

  // Shoulder pivot (world)
  const pivotView = [shoulderFrame[12], shoulderFrame[13], shoulderFrame[14], 1];
  let pivotWorld = [0, 0, 0];
  if (Vinv) {
    const p = vec4Transform(Vinv, pivotView);
    pivotWorld = [p[0], p[1], p[2]];
  }

  // World ops at shoulder
  const rotW =
    PS && PS.rotateWS && Array.isArray(PS.rotateWS.r) ? PS.rotateWS.r : null;
  const liftV =
    PS && PS.liftWS && PS.liftWS.t ? [PS.liftWS.t[0], PS.liftWS.t[1], PS.liftWS.t[2]] : null;

  function applyWorldOps(m) {
    if (rotW && V && Vinv) {
      for (const r of rotW) {
        if (!r || typeof r.angle !== "number" || !r.axis) continue;
        premulWorldRotateAroundInView(m, r.angle, r.axis, pivotWorld, V, Vinv);
      }
    }
    if (liftV && V && Vinv) {
      premulWorldTranslateInView(m, liftV, V, Vinv);
    }
  }

  // 2) Forearm base (elbow)
  const faBase = mat4.clone(shoulderFrame);
  mat4.translate(faBase, faBase, [
    cfg.ELBOW_FROM_SHOULDER[0] * side,
    cfg.ELBOW_FROM_SHOULDER[1],
    cfg.ELBOW_FROM_SHOULDER[2],
  ]);
  if (PS && PS.forearm) applyTRS(faBase, PS.forearm);

  // Elbow pivot (world) for lower chain ops
  let pivotElbowWorld = [0, 0, 0];
  if (Vinv) {
    const pE = vec4Transform(Vinv, [faBase[12], faBase[13], faBase[14], 1]);
    pivotElbowWorld = [pE[0], pE[1], pE[2]];
  }
  const rotWLower =
    PS && PS.lowerRotateWS && Array.isArray(PS.lowerRotateWS.r)
      ? PS.lowerRotateWS.r
      : null;
  const liftVLower = PS && PS.lowerLiftWS && PS.lowerLiftWS.t ? PS.lowerLiftWS.t : null;

  function applyWorldOpsLower(m) {
    if (rotWLower && V && Vinv) {
      for (const r of rotWLower) {
        if (!r || typeof r.angle !== "number" || !r.axis) continue;
        premulWorldRotateAroundInView(m, r.angle, r.axis, pivotElbowWorld, V, Vinv);
      }
    }
    if (liftVLower && V && Vinv) {
      premulWorldTranslateInView(m, liftVLower, V, Vinv);
    }
  }

  // 3) Upper (mesh)
  const upM = mat4.clone(shoulderFrame);
  if (PS && PS.upper) applyTRS(upM, PS.upper);
  mat4.scale(upM, upM, cfg.UPPER_SCALE);
  if (cfg.UPPER_ANCHOR_FRAC_Y) {
    mat4.translate(upM, upM, [0, -cfg.UPPER_SCALE[1] * cfg.UPPER_ANCHOR_FRAC_Y, 0]);
  }
  applyWorldOps(upM);
  if (visible(`${sideName}.upper`)) drawSet(buffers.upper, upM);

  // 4) Forearm (mesh)
  const faM = mat4.clone(faBase);
  mat4.rotate(faM, faM, cfg.FOREARM_PITCH_FWD, [1, 0, 0]);
  mat4.rotate(faM, faM, side * cfg.FOREARM_ROLL_OUT, [0, 0, 1]);
  mat4.translate(faM, faM, [
    cfg.FOREARM_TRANSLATE[0] * side,
    cfg.FOREARM_TRANSLATE[1],
    cfg.FOREARM_TRANSLATE[2],
  ]);
  mat4.rotate(faM, faM, side * cfg.FOREARM_YAW_OUT, [0, 1, 0]);
  mat4.scale(faM, faM, cfg.FOREARM_SCALE);
  applyWorldOps(faM);
  applyWorldOpsLower(faM);
  if (visible(`${sideName}.forearm`)) drawSet(buffers.forearm, faM);

  // 5) Palm
  const palmM = mat4.clone(faBase);
  mat4.rotate(palmM, palmM, cfg.FOREARM_PITCH_FWD, [1, 0, 0]);
  mat4.rotate(palmM, palmM, side * cfg.FOREARM_ROLL_OUT, [0, 0, 1]);
  mat4.translate(palmM, palmM, [
    cfg.FOREARM_TRANSLATE[0] * side,
    cfg.FOREARM_TRANSLATE[1],
    cfg.FOREARM_TRANSLATE[2],
  ]);
  mat4.rotate(palmM, palmM, side * cfg.FOREARM_YAW_OUT, [0, 1, 0]);
  mat4.translate(palmM, palmM, [0, -cfg.PALM_DROP, cfg.PALM_FORWARD]);
  if (PS && PS.wrist) applyTRS(palmM, PS.wrist);
  if (cfg.flipUpperHemispherePalm) mat4.rotate(palmM, palmM, Math.PI, [1, 0, 0]);
  mat4.rotate(palmM, palmM, cfg.PALM_PITCH, [1, 0, 0]);
  mat4.rotate(palmM, palmM, side * cfg.WRIST_YAW, [0, 1, 0]);
  mat4.rotate(palmM, palmM, side * cfg.WRIST_ROLL, [0, 0, 1]);
  mat4.scale(palmM, palmM, cfg.PALM_SCALE);
  applyWorldOps(palmM);
  applyWorldOpsLower(palmM);
  if (visible(`${sideName}.palm`)) drawSet(buffers.palm, palmM);

  // 6) Pad center
  const pcM = mat4.clone(faBase);
  mat4.rotate(pcM, pcM, cfg.FOREARM_PITCH_FWD, [1, 0, 0]);
  mat4.rotate(pcM, pcM, side * cfg.FOREARM_ROLL_OUT, [0, 0, 1]);
  mat4.translate(pcM, pcM, [
    cfg.FOREARM_TRANSLATE[0] * side,
    cfg.FOREARM_TRANSLATE[1],
    cfg.FOREARM_TRANSLATE[2],
  ]);
  mat4.rotate(pcM, pcM, side * cfg.FOREARM_YAW_OUT, [0, 1, 0]);
  mat4.translate(pcM, pcM, cfg.PAD_CENTER_OFF);
  mat4.rotate(pcM, pcM, cfg.PAD_TILT_X, [1, 0, 0]);
  mat4.scale(pcM, pcM, cfg.PAD_CENTER_SCALE);
  applyWorldOps(pcM);
  applyWorldOpsLower(pcM);
  if (visible(`${sideName}.padCenter`)) drawSet(buffers.padCenter, pcM);

  // 7) Pad sides
  for (const sgn of [-1, +1]) {
    const psM = mat4.clone(faBase);
    mat4.rotate(psM, psM, cfg.FOREARM_PITCH_FWD, [1, 0, 0]);
    mat4.rotate(psM, psM, side * cfg.FOREARM_ROLL_OUT, [0, 0, 1]);
    mat4.translate(psM, psM, [
      cfg.FOREARM_TRANSLATE[0] * side,
      cfg.FOREARM_TRANSLATE[1],
      cfg.FOREARM_TRANSLATE[2],
    ]);
    mat4.rotate(psM, psM, side * cfg.FOREARM_YAW_OUT, [0, 1, 0]);
    mat4.translate(psM, psM, [
      cfg.PAD_SIDE_X * sgn,
      cfg.PAD_SIDE_OFF[1],
      cfg.PAD_SIDE_OFF[2],
    ]);
    mat4.rotate(psM, psM, cfg.PAD_TILT_X * 1.2, [1, 0, 0]);
    mat4.scale(psM, psM, cfg.PAD_SIDE_SCALE);
    applyWorldOps(psM);
    applyWorldOpsLower(psM);
    const key = sgn < 0 ? `${sideName}.padSideL` : `${sideName}.padSideR`;
    if (visible(key)) drawSet(buffers.padSide, psM);
  }

  // 8) Fingers (per-finger pivot at base)
  const fingersBase = [
    [-cfg.FINGER_SPREAD_X * 0.6, cfg.FINGER_DOWN, cfg.FINGER_FORWARD - 0.02],
    [cfg.FINGER_MID_OFFSET_X, cfg.FINGER_DOWN, cfg.FINGER_FORWARD + cfg.FINGER_ROW_Z_BIAS],
    [ cfg.FINGER_SPREAD_X * 0.6, cfg.FINGER_DOWN, cfg.FINGER_FORWARD - 0.02],
  ];
  const frac = cfg.FINGER_ANCHOR_FRAC || [0, 0, 1];
  const bias = cfg.FINGER_ANCHOR_BIAS || [0, 0, 0];
  const r = cfg.FINGER_BASE_RADIUS || 0;
  const sx = (cfg.FINGER_SCALE ? cfg.FINGER_SCALE[0] : 1);
  const sy = (cfg.FINGER_SCALE ? cfg.FINGER_SCALE[1] : 1);
  const sz = (cfg.FINGER_SCALE ? cfg.FINGER_SCALE[2] : 1);

  for (let i = 0; i < 3; i++) {
    const fM = mat4.clone(faBase);
    mat4.rotate(fM, fM, cfg.FOREARM_PITCH_FWD, [1, 0, 0]);
    mat4.rotate(fM, fM, side * cfg.FOREARM_ROLL_OUT, [0, 0, 1]);
    mat4.translate(fM, fM, [
      cfg.FOREARM_TRANSLATE[0] * side,
      cfg.FOREARM_TRANSLATE[1],
      cfg.FOREARM_TRANSLATE[2],
    ]);
    mat4.rotate(fM, fM, side * cfg.FOREARM_YAW_OUT, [0, 1, 0]);
    mat4.translate(fM, fM, [0, -cfg.PALM_DROP, 0]);

    if (PS && PS.wrist) applyTRS(fM, PS.wrist);

    // Base anchor
    const [bx, by, bz] = fingersBase[i];
    const off = i === 1 ? cfg.FINGER_MID_OFFSET : cfg.FINGER_SIDE_OFFSET;
    const [dx, dy, dz] = off;
    const fx = (bx + dx) * side;
    const fy = by + dy;
    const fz = bz + dz;

    // Pull back per-axis by half-extents (scaled), then apply bias
    const pullX = (frac[0] || 0) * r * sx;
    const pullY = (frac[1] || 0) * r * sy;
    const pullZ = (frac[2] || 0) * r * sz;
    const ax = fx - side * pullX + side * (bias[0] || 0);
    const ay = fy - pullY       +        (bias[1] || 0);
    const az = fz - pullZ       +        (bias[2] || 0);

    // Translate so pivot is at the finger base
    mat4.translate(fM, fM, [ax, ay, az]);

    // User cluster TRS (anim)
    if (PS && PS.fingers && PS.fingers.cluster) {
      applyTRS(fM, PS.fingers.cluster);
    }

    // Built-in cluster rotation
    mat4.rotate(fM, fM, cfg.FINGER_CLUSTER_ROT.pitch, [1, 0, 0]);
    mat4.rotate(fM, fM, side * cfg.FINGER_CLUSTER_ROT.yaw, [0, 1, 0]);
    mat4.rotate(fM, fM, side * cfg.FINGER_CLUSTER_ROT.roll, [0, 0, 1]);

    // Optional per-finger TRS before curls
    if (PS && PS.fingers && PS.fingers.per && PS.fingers.per[i]) {
      applyTRS(fM, PS.fingers.per[i]);
    }

    // Curls/spread
    mat4.rotate(fM, fM, cfg.FINGER_ROT[i].pitch, [1, 0, 0]);
    mat4.rotate(fM, fM, side * cfg.FINGER_ROT[i].yaw, [0, 1, 0]);
    mat4.rotate(fM, fM, side * cfg.FINGER_ROT[i].roll, [0, 0, 1]);

    // Scale to ellipsoid (no post-scale translate)
    mat4.scale(fM, fM, cfg.FINGER_SCALE);

    applyWorldOps(fM);
    applyWorldOpsLower(fM);
    if (visible(`${sideName}.finger${i}`)) drawSet(buffers.finger, fM);
  }
}

    drawArm(+1);
    drawArm(-1);
  }

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

  function createHemisphereYArrays(color, radius, latBands, lonBands, lower) {
    const positions = [];
    const colors = [];
    const indices = [];
    const startLat = lower ? Math.ceil(latBands / 2) : 0;
    const endLat = lower ? latBands : Math.floor(latBands / 2);
    for (let lat = startLat; lat <= endLat; lat++) {
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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.positions), gl.STATIC_DRAW);
    const color = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, color);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.colors), gl.STATIC_DRAW);
    const indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.indices), gl.STATIC_DRAW);
    return { position, color, indices, vertexCount: data.indices.length };
  }

  function deepMerge(base, extra) {
    if (extra == null || typeof extra !== "object") return base;
    const out = Array.isArray(base) ? base.slice() : { ...base };
    for (const k of Object.keys(extra)) {
      const bv = base[k], ev = extra[k];
      if (ev && typeof ev === "object" && !Array.isArray(ev) && bv && typeof bv === "object" && !Array.isArray(bv)) {
        out[k] = deepMerge(bv, ev);
      } else {
        out[k] = Array.isArray(ev) ? ev.slice() : ev;
      }
    }
    return out;
  }

  // Small vec4 x mat helper
  function vec4Transform(M, v4) {
    const x = v4[0], y = v4[1], z = v4[2], w = v4[3] ?? 1;
    const r = new Float32Array(4);
    r[0] = M[0] * x + M[4] * y + M[8] * z + M[12] * w;
    r[1] = M[1] * x + M[5] * y + M[9] * z + M[13] * w;
    r[2] = M[2] * x + M[6] * y + M[10] * z + M[14] * w;
    r[3] = M[3] * x + M[7] * y + M[11] * z + M[15] * w;
    if (r[3] && Math.abs(r[3]) > 1e-6) {
      r[0] /= r[3]; r[1] /= r[3]; r[2] /= r[3]; r[3] = 1;
    }
    return r;
  }

  global.MegaArms = { init, draw, createPose, makePoseAPI, Groups, defaults: DEFAULTS };
})(typeof window !== "undefined" ? window : this);