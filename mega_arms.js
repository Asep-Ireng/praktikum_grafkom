// mega_arms.js (modular, reusable, GROUPED transforms, no canvas/shaders/loop)
// Mega Swampert — Left & Right arms
// Upper arm (ellipsoid) + forearm (ellipsoid) + palm (hemisphere)
// + 3 fingers + 3 orange pads
//
// Usage:
//   const arms = MegaArms.init(gl);
//   ...
//   MegaArms.draw(gl, programInfo, arms, viewMatrix, {
//     group: {
//       translate: [0, 0, 0],
//       rotate: { angle: 0, axis: [0, 1, 0] },
//       scale: [1, 1, 1],
//     },
//     // any other per-part overrides can go here
//   });
//
// Requires: glMatrix (mat4). Your shader must provide:
//   attributes: aVertexPosition (vec3), aVertexColor (vec4)
//   uniforms:   uModelViewMatrix (mat4) per draw,
//               uProjectionMatrix (mat4) set by your app per frame.

(function (global) {
  // -----------------------------------------------------------
  // Color palette
  //  const ARM_BLUE = [0.18, 0.55, 0.95, 1.0];
  const ARM_BLUE = [0.58, 0.55, 0.95, 1.0];
  const FINGER_DARK = [0.1, 0.1, 0.12, 1.0];
  const PAD_ORANGE = [1.0, 0.6, 0.0, 1.0];

  // -----------------------------------------------------------
  // Shape scales (ellipsoids) and base sizes
  const UPPER_SCALE = [1.55, 1.2, 2.15]; // shoulder bulb
  const FOREARM_SCALE = [1.75, 1.55, 2.65]; // huge forearm
  const PALM_SCALE = [1.2, 0.7, 1.1]; // palm thickness in Y

  const FINGER_BASE_RADIUS = 0.68; // finger sphere before scaling
  const FINGER_SCALE = [0.85, 0.85, 1.68]; // x width, y height, z length

  // -----------------------------------------------------------
  // Pose / placement (torso space). Left arm mirrors X via 'side'.
  const SHOULDER_OFFSET = [5.55, 0.7, 1.72];

  // Upper arm orientation
  const UPPER_PITCH_FWD = 0.15; // rotate around X (raise forward)
  const UPPER_ROLL_OUT = -0.3; // rotate around Z (splay outward)

  // Forearm anchor relative to shoulder (in torso space)
  const ELBOW_FROM_SHOULDER = [-0.1, -0.2, 2.22];

  // Forearm orientation
  const FOREARM_PITCH_FWD = -0.12; // X (bend)
  const FOREARM_ROLL_OUT = 0.12; // Z (splay)
  const FOREARM_YAW_OUT = -0.12; // Y (toe-out). Multiplied by 'side'.

  // Palm (wrist) placement/orientation relative to forearm center
  const PALM_DROP = 1.05; // move down from forearm
  const PALM_FORWARD = 0.53; // move forward from forearm
  const PALM_PITCH = -0.12; // pitch palm downward
  const WRIST_YAW = 0.12; // yaw palm (multiplied by 'side')
  const WRIST_ROLL = 0.03; // roll palm (multiplied by 'side')

  // Orange pads on forearm (forearm local frame)
  const PAD_CENTER_OFF = [0.0, 1.42, 0.46];
  const PAD_SIDE_X = 1.5; // +/- X
  const PAD_SIDE_OFF = [1.0, 0.6, 0.22];
  const PAD_TILT_X = 0.1; // slight wrap over forearm (rotate X)
  const PAD_CENTER_SCALE = [0.8, 0.33, 1.2];
  const PAD_SIDE_SCALE = [0.55, 0.48, 0.9];

  // Finger cluster base offsets (palm local)
  const FINGER_FORWARD = 3.05;
  const FINGER_DOWN = 0.6;
  const FINGER_SPREAD_X = 1.8;
  const FINGER_MID_OFFSET_X = 0.0;
  const FINGER_ROW_Z_BIAS = -0.28;

  // Rotate the whole finger cluster relative to palm
  const FINGER_CLUSTER_ROT = {
    pitch: -0.4, // curl all down
    yaw: 0.0, // toe-out/in (multiplied by 'side')
    roll: 0.0, // fan (multiplied by 'side')
  };

  // Per-finger curl/spread (left, middle, right)
  const FINGER_ROT = [
    { pitch: -0.26, yaw: -0.04, roll: 0.0 }, // left
    { pitch: -0.32, yaw: 0.0, roll: 0.0 }, // middle
    { pitch: -0.26, yaw: 0.04, roll: 0.0 }, // right
  ];

  const DEFAULTS = {
    // GROUP transform applied to the whole arm assembly (both sides)
    group: {
      translate: [0, 0, 0],
      rotate: { angle: 1.0, axis: [1, 0, 0] },
      scale: [1, 1, 1],
    },

    // placement
    SHOULDER_OFFSET,
    ELBOW_FROM_SHOULDER,

    // orientations
    UPPER_PITCH_FWD,
    UPPER_ROLL_OUT,
    UPPER_YAW_OUT: 0.0,  
    FOREARM_PITCH_FWD,
    FOREARM_ROLL_OUT,
    FOREARM_YAW_OUT,

    // palm/wrist
    PALM_DROP,
    PALM_FORWARD,
    PALM_PITCH,
    WRIST_YAW,
    WRIST_ROLL,

    // scales
    UPPER_SCALE,
    FOREARM_SCALE,
    PALM_SCALE,
    FINGER_SCALE,

    // pads
    PAD_CENTER_OFF,
    PAD_SIDE_X,
    PAD_SIDE_OFF,
    PAD_TILT_X,
    PAD_CENTER_SCALE,
    PAD_SIDE_SCALE,

    // fingers layout/rot
    FINGER_FORWARD,
    FINGER_DOWN,
    FINGER_SPREAD_X,
    FINGER_MID_OFFSET_X,
    FINGER_ROW_Z_BIAS,
    FINGER_CLUSTER_ROT,
    FINGER_ROT,

    // geometry base sizes
    FINGER_BASE_RADIUS,

    // whether to flip the palm hemisphere (we use upper hemi geometry)
    flipUpperHemispherePalm: true,
  };

  // -----------------------------------------------------------
  // Public: build GL buffers for arms
  function init(gl) {
    const lat = 36;
    const lon = 36;

    const upper = makeBufferSet(gl, createSphereArrays(ARM_BLUE, lat, lon, 1.0));
    const forearm = makeBufferSet(
      gl,
      createSphereArrays(ARM_BLUE, lat, lon, 1.0)
    );

    // Palm: UPPER hemisphere (y >= 0), flipped at draw so dome faces down
    const palm = makeBufferSet(
      gl,
      createHemisphereYArrays(ARM_BLUE, 0.75, lat, lon, false)
    );

    // Fingers: bigger base radius
    const finger = makeBufferSet(
      gl,
      createSphereArrays(FINGER_DARK, 24, 24, DEFAULTS.FINGER_BASE_RADIUS)
    );

    // Orange pads
    const padCenter = makeBufferSet(
      gl,
      createSphereArrays(PAD_ORANGE, 24, 24, 1.0)
    );
    const padSide = makeBufferSet(
      gl,
      createSphereArrays(PAD_ORANGE, 24, 24, 1.0)
    );

    return { upper, forearm, palm, finger, padCenter, padSide };
  }

  // -----------------------------------------------------------
  // Public: draw both arms into provided view matrix (supports GROUP transform)
  // Caller must bind program and set uProjectionMatrix before calling draw.
  function draw(gl, programInfo, buffers, viewMatrix, overrides) {
    const cfg = deepMerge(DEFAULTS, overrides || {});

    // Build group/root matrix once
    const root = mat4.clone(viewMatrix);
    if (cfg.group && cfg.group.translate) {
      mat4.translate(root, root, cfg.group.translate);
    }
    if (cfg.group && cfg.group.rotate && cfg.group.rotate.angle) {
      mat4.rotate(root, root, cfg.group.rotate.angle, cfg.group.rotate.axis || [0, 1, 0]);
    }
    if (cfg.group && cfg.group.scale) {
      mat4.scale(root, root, cfg.group.scale);
    }

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

  function drawArm(side) {
  // 1) Shoulder frame: affects the whole arm chain
  const shoulder = [
    cfg.SHOULDER_OFFSET[0] * side,  
    cfg.SHOULDER_OFFSET[1],
    cfg.SHOULDER_OFFSET[2],
  ];
  const shoulderFrame = mat4.clone(root);
  mat4.translate(shoulderFrame, shoulderFrame, shoulder);

  // Order: yaw (sideways) -> pitch (raise) -> roll (splay)
  mat4.rotate(shoulderFrame, shoulderFrame, side * cfg.UPPER_YAW_OUT, [0, 1, 0]);
  mat4.rotate(shoulderFrame, shoulderFrame, cfg.UPPER_PITCH_FWD, [1, 0, 0]);
  mat4.rotate(shoulderFrame, shoulderFrame, side * cfg.UPPER_ROLL_OUT, [0, 0, 1]);

  // 2) Upper arm on the shoulder frame
  const upM = mat4.clone(shoulderFrame);
  mat4.scale(upM, upM, cfg.UPPER_SCALE);
  drawSet(buffers.upper, upM);

  // 3) Forearm base = shoulder frame translated by local elbow offset
  const faBase = mat4.clone(shoulderFrame);
  mat4.translate(faBase, faBase, [
    cfg.ELBOW_FROM_SHOULDER[0] * side,
    cfg.ELBOW_FROM_SHOULDER[1],
    cfg.ELBOW_FROM_SHOULDER[2],
  ]);

  // 4) Forearm on that base (its own bend/splay/yaw)
  const faM = mat4.clone(faBase);
  mat4.rotate(faM, faM, cfg.FOREARM_PITCH_FWD, [1, 0, 0]);
  mat4.rotate(faM, faM, side * cfg.FOREARM_ROLL_OUT, [0, 0, 1]);
  mat4.rotate(faM, faM, side * cfg.FOREARM_YAW_OUT, [0, 1, 0]);
  mat4.scale(faM, faM, cfg.FOREARM_SCALE);
  drawSet(buffers.forearm, faM);

  // 5) Palm inherits forearm frame
  const palmM = mat4.clone(faBase);
  mat4.rotate(palmM, palmM, cfg.FOREARM_PITCH_FWD, [1, 0, 0]);
  mat4.rotate(palmM, palmM, side * cfg.FOREARM_ROLL_OUT, [0, 0, 1]);
  mat4.rotate(palmM, palmM, side * cfg.FOREARM_YAW_OUT, [0, 1, 0]);
  mat4.translate(palmM, palmM, [0, -cfg.PALM_DROP, cfg.PALM_FORWARD]);
  if (cfg.flipUpperHemispherePalm) mat4.rotate(palmM, palmM, Math.PI, [1, 0, 0]);
  mat4.rotate(palmM, palmM, cfg.PALM_PITCH, [1, 0, 0]);
  mat4.rotate(palmM, palmM, side * cfg.WRIST_YAW, [0, 1, 0]);
  mat4.rotate(palmM, palmM, side * cfg.WRIST_ROLL, [0, 0, 1]);
  mat4.scale(palmM, palmM, cfg.PALM_SCALE);
  drawSet(buffers.palm, palmM);

  // 6) Pads use faBase too
  const pcM = mat4.clone(faBase);
  mat4.rotate(pcM, pcM, cfg.FOREARM_PITCH_FWD, [1, 0, 0]);
  mat4.rotate(pcM, pcM, side * cfg.FOREARM_ROLL_OUT, [0, 0, 1]);
  mat4.rotate(pcM, pcM, side * cfg.FOREARM_YAW_OUT, [0, 1, 0]);
  mat4.translate(pcM, pcM, cfg.PAD_CENTER_OFF);
  mat4.rotate(pcM, pcM, cfg.PAD_TILT_X, [1, 0, 0]);
  mat4.scale(pcM, pcM, cfg.PAD_CENTER_SCALE);
  drawSet(buffers.padCenter, pcM);

  for (const sgn of [-1, +1]) {
    const psM = mat4.clone(faBase);
    mat4.rotate(psM, psM, cfg.FOREARM_PITCH_FWD, [1, 0, 0]);
    mat4.rotate(psM, psM, side * cfg.FOREARM_ROLL_OUT, [0, 0, 1]);
    mat4.rotate(psM, psM, side * cfg.FOREARM_YAW_OUT, [0, 1, 0]);
    mat4.translate(psM, psM, [cfg.PAD_SIDE_X * sgn, cfg.PAD_SIDE_OFF[1], cfg.PAD_SIDE_OFF[2]]);
    mat4.rotate(psM, psM, cfg.PAD_TILT_X * 1.2, [1, 0, 0]);
    mat4.scale(psM, psM, cfg.PAD_SIDE_SCALE);
    drawSet(buffers.padSide, psM);
  }

  // 7) Fingers: base from faBase
  const fingersBase = [
    [-cfg.FINGER_SPREAD_X * 0.6, cfg.FINGER_DOWN, cfg.FINGER_FORWARD - 0.02],
    [cfg.FINGER_MID_OFFSET_X, cfg.FINGER_DOWN, cfg.FINGER_FORWARD + cfg.FINGER_ROW_Z_BIAS],
    [cfg.FINGER_SPREAD_X * 0.6, cfg.FINGER_DOWN, cfg.FINGER_FORWARD - 0.02],
  ];

  for (let i = 0; i < 3; i++) {
    const fM = mat4.clone(faBase);
    mat4.rotate(fM, fM, cfg.FOREARM_PITCH_FWD, [1, 0, 0]);
    mat4.rotate(fM, fM, side * cfg.FOREARM_ROLL_OUT, [0, 0, 1]);
    mat4.rotate(fM, fM, side * cfg.FOREARM_YAW_OUT, [0, 1, 0]);
    mat4.translate(fM, fM, [0, -cfg.PALM_DROP, 0]);
    mat4.rotate(fM, fM, cfg.FINGER_CLUSTER_ROT.pitch, [1, 0, 0]);
    mat4.rotate(fM, fM, side * cfg.FINGER_CLUSTER_ROT.yaw, [0, 1, 0]);
    mat4.rotate(fM, fM, side * cfg.FINGER_CLUSTER_ROT.roll, [0, 0, 1]);
    mat4.translate(fM, fM, [fingersBase[i][0] * side, fingersBase[i][1], fingersBase[i][2]]);
    mat4.rotate(fM, fM, cfg.FINGER_ROT[i].pitch, [1, 0, 0]);
    mat4.rotate(fM, fM, side * cfg.FINGER_ROT[i].yaw, [0, 1, 0]);
    mat4.rotate(fM, fM, side * cfg.FINGER_ROT[i].roll, [0, 0, 1]);
    mat4.scale(fM, fM, cfg.FINGER_SCALE);
    drawSet(buffers.finger, fM);
  }
}

    drawArm(+1);
    drawArm(-1);
  }

  // -----------------------------------------------------------
  // Geometry array generators (arrays only; buffer creation below)

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

  // Hemisphere along Y; if lower==true keep y<=0 (dome down), else y>=0 (dome up)
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

  // -----------------------------------------------------------
  // GL buffer wrapper

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

  // Public API
  global.MegaArms = {
    init,
    draw,
    defaults: DEFAULTS,
  };
})(typeof window !== "undefined" ? window : this);