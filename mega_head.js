// mega_head.js (modular, reusable, grouped transforms, no canvas/shaders/loop)
// Mega Swampert — Head (top/bottom hemispheres, cheek pads, spikes, eyes,
// nose, eyebrows)
//
// Usage:
//   const head = MegaHead.init(gl);
//   // In your render loop:
//   MegaHead.draw(gl, programInfo, head, viewMatrix, {
//     group: { translate: [0, 1.6, 0.8], scale: [1.0, 1.0, 1.0] }
//     // ...optional per-part overrides (see defaults below)
//   });
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
    // Group transform applied to the ENTIRE head assembly
    group: {
      translate: [0, -2.6, 2],
      // Optional rotation for the whole head
      rotate: { angle: 0.3, axis: [1, 0, 0] },
      scale: [1.4, 1.4, 1.4],
    },

    top: {
      scale: [1.3, 1.2, 1.1],
      translate: [0, 0, 0],
    },
    bottom: {
      scale: [1.3, 0.7, 1.1],
      translate: [0, 0, 0],
    },
    grooves: {
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
      frameTranslate: [0.8, 0.54, 0.],
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
          offset: [0.14, -0.12, -0.20],
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
  // Public: draw into provided view matrix (with GROUPED transform)
  function draw(gl, programInfo, buffers, viewMatrix, overrides) {
    const cfg = deepMerge(DEFAULTS, overrides || {});

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
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

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

    // Top hemisphere
    {
      const m = mat4.clone(root);
      mat4.scale(m, m, cfg.top.scale);
      mat4.translate(m, m, cfg.top.translate);
      drawSet(buffers.top, m);
    }

    // Bottom hemisphere
    {
      const m = mat4.clone(root);
      mat4.scale(m, m, cfg.bottom.scale);
      mat4.translate(m, m, cfg.bottom.translate);
      drawSet(buffers.bottom, m);
    }

    // Zig-zag ring
    {
      const m = mat4.clone(root);
      mat4.scale(m, m, cfg.grooves.scale);
      mat4.translate(m, m, cfg.grooves.translate);
      drawSet(buffers.grooves, m);
    }

    // Right cheek pad
    {
      const m = mat4.clone(root);
      mat4.translate(m, m, cfg.rightCheekPad.translate);
      mat4.rotate(
        m,
        m,
        cfg.rightCheekPad.rotateA.angle,
        cfg.rightCheekPad.rotateA.axis
      );
      mat4.rotate(
        m,
        m,
        cfg.rightCheekPad.rotateB.angle,
        cfg.rightCheekPad.rotateB.axis
      );
      mat4.scale(m, m, cfg.rightCheekPad.scale);
      drawSet(buffers.rightCheekPad, m);
    }

    // Left cheek pad (mirror X)
    {
      const m = mat4.clone(root);
      if (cfg.leftCheekPad.mirrorX) mat4.scale(m, m, [-1, 1, 1]);
      mat4.translate(m, m, cfg.leftCheekPad.translate);
      mat4.rotate(
        m,
        m,
        cfg.leftCheekPad.rotateA.angle,
        cfg.leftCheekPad.rotateA.axis
      );
      mat4.rotate(
        m,
        m,
        cfg.leftCheekPad.rotateB.angle,
        cfg.leftCheekPad.rotateB.axis
      );
      mat4.scale(m, m, cfg.leftCheekPad.scale);
      drawSet(buffers.leftCheekPad, m);
    }

    // Spikes (3 cones per side)
    function buildSpikeFrame(side) {
      const m = mat4.clone(root);
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
    function placeCone(baseFrame, spec) {
      const m = mat4.clone(baseFrame);
      mat4.translate(m, m, spec.offset);
      mat4.rotate(m, m, spec.tiltZ, [0, 0, 1]);
      mat4.rotate(m, m, spec.sweepY, [0, 1, 0]);
      mat4.scale(m, m, [spec.len, spec.r, spec.r]);
      drawSet(buffers.cone, m);
    }

    const frameL = buildSpikeFrame(-1);
    const frameR = buildSpikeFrame(+1);
    for (const c of cfg.spikes.cones) {
      placeCone(frameL, c);
      placeCone(frameR, c);
    }

    // Eyes (angry)
    function drawEye(side) {
      const base = mat4.clone(root);
      mat4.translate(base, base, [
        cfg.eye.baseTranslate[0] * side,
        cfg.eye.baseTranslate[1],
        cfg.eye.baseTranslate[2],
      ]);
      mat4.rotate(base, base, side * cfg.eye.yawOut, [0, 1, 0]);
      mat4.rotate(base, base, cfg.eye.pitch, [1, 0, 0]);
      mat4.rotate(base, base, side * cfg.eye.rollIn, [0, 0, 1]);

      // Iris
      drawSet(buffers.eyeIris, base);

      // Pupil
      const pupilM = mat4.clone(base);
      mat4.translate(pupilM, pupilM, [
        cfg.eye.pupilOffset[0] * side,
        cfg.eye.pupilOffset[1],
        cfg.eye.pupilOffset[2],
      ]);
      drawSet(buffers.eyePupil, pupilM);

      // Highlight
      const hiM = mat4.clone(base);
      mat4.translate(hiM, hiM, [
        cfg.eye.highlightOffset[0] * side,
        cfg.eye.highlightOffset[1],
        cfg.eye.highlightOffset[2],
      ]);
      drawSet(buffers.eyeHighlight, hiM);
    }
    drawEye(+1);
    drawEye(-1);

    // Eyebrows (angry slant)
    function drawEyebrow(side) {
      const m = mat4.clone(root);
      mat4.translate(m, m, [
        cfg.eyebrow.baseTranslate[0] * side +
          cfg.eyebrow.offset[0] * side,
        cfg.eyebrow.baseTranslate[1] + cfg.eyebrow.offset[1],
        cfg.eyebrow.baseTranslate[2] + cfg.eyebrow.offset[2],
      ]);
      mat4.rotate(m, m, side * cfg.eyebrow.yawOut, [0, 1, 0]);
      mat4.rotate(m, m, cfg.eyebrow.pitch, [1, 0, 0]);
      mat4.rotate(m, m, side * cfg.eyebrow.rollIn, [0, 0, 1]);
      drawSet(buffers.eyebrow, m);
    }
    drawEyebrow(+1);
    drawEyebrow(-1);

    // Nostrils
    function drawNostril(side) {
      const m = mat4.clone(root);
      mat4.translate(m, m, [
        cfg.nostril.translate[0] * side,
        cfg.nostril.translate[1],
        cfg.nostril.translate[2],
      ]);
      mat4.rotate(m, m, side * cfg.nostril.yawOut, [0, 1, 0]);
      mat4.rotate(m, m, cfg.nostril.pitchDown, [1, 0, 0]);
      mat4.rotate(m, m, side * cfg.nostril.roll, [0, 0, 1]);
      drawSet(buffers.nostril, m);
    }
    drawNostril(+1);
    drawNostril(-1);
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
      -hw, -hh, +hz,
      +hw, -hh, +hz,
      +hw, +hh, +hz,
      -hw, +hh, +hz,
      // back (z = -hz)
      -hw, -hh, -hz,
      +hw, -hh, -hz,
      +hw, +hh, -hz,
      -hw, +hh, -hz,
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
    defaults: DEFAULTS,
  };
})(typeof window !== "undefined" ? window : this);