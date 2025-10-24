// mega_legs.js (modular, reusable, grouped transforms, no canvas/shaders/loop)
(function (global) {
  const LEG_BLUE = [0.18, 0.55, 0.95, 1.0];

  const THIGH_RADIUS = 1.0;
  const THIGH_SCALE = [0.85, 1.35, 0.95];

  const FOOT_RADIUS = 0.75;
  const FOOT_SCALE = [1.55, 1.0, 1.15];

  const HIP_OFFSET = [1.65, -0.55, 0.55];
  const THIGH_TILT_OUT = 0.2;
  const THIGH_TILT_FWD = -0.1;
  const ANKLE_DROP = 1.35;
  const FOOT_FORWARD = 0.45;

  const DEFAULTS = {
  group: {
      translate: [0, -3, 0],
      rotate: { angle: 0.0, axis: [0, 1, 0] }, // optional
      scale: [1.5, 1.5, 1.5],
    },

    HIP_OFFSET,
    THIGH_TILT_OUT,
    THIGH_TILT_FWD,
    ANKLE_DROP,
    FOOT_FORWARD,
    THIGH_SCALE,
    FOOT_SCALE,

    // Mild outward toe splay; set to 0 for perfectly forward
    FOOT_YAW_OUT: 1.4,
    // Slight downward pitch so the sole is flatter
    FOOT_PITCH: -0.06,

    // We now build the LOWER hemisphere, so no flip needed
    flipUpperHemisphereFoot: false,
  };

  function init(gl) {
    const lat = 36;
    const lon = 36;

    const thighArrays = createSphereArrays(LEG_BLUE, lat, lon, THIGH_RADIUS);
    const thigh = makeBufferSet(gl, thighArrays);

    // Use LOWER hemisphere so the dome already faces downward (y <= 0)
    const footArrays = createHemisphereYArrays(
      LEG_BLUE,
      FOOT_RADIUS,
      lat,
      lon,
      false // lower hemisphere
    );
    const foot = makeBufferSet(gl, footArrays);

    return { thigh, foot };
  }

  function draw(gl, programInfo, buffers, viewMatrix, overrides) {
    const cfg = Object.assign({}, DEFAULTS, overrides || {});
    const group = Object.assign(
      {},
      DEFAULTS.group,
      (overrides && overrides.group) || {}
    );

    const root = mat4.clone(viewMatrix);
    if (group.translate) mat4.translate(root, root, group.translate);
    if (group.rotate && group.rotate.angle) {
      mat4.rotate(root, root, group.rotate.angle, group.rotate.axis || [0, 1, 0]);
    }
    if (group.scale) mat4.scale(root, root, group.scale);

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

    function drawLeg(side) {
      // Thigh
      const thighM = mat4.clone(root);
      const hip = [
        cfg.HIP_OFFSET[0] * side,
        cfg.HIP_OFFSET[1],
        cfg.HIP_OFFSET[2],
      ];
      mat4.translate(thighM, thighM, hip);
      mat4.rotate(thighM, thighM, side * cfg.THIGH_TILT_OUT, [0, 0, 1]);
      mat4.rotate(thighM, thighM, cfg.THIGH_TILT_FWD, [1, 0, 0]);
      mat4.scale(thighM, thighM, cfg.THIGH_SCALE);
      drawSet(buffers.thigh, thighM);

      // Foot
      const footM = mat4.clone(root);
      mat4.translate(footM, footM, hip);
      mat4.translate(footM, footM, [0, -cfg.ANKLE_DROP, cfg.FOOT_FORWARD]);

      // Only flip if you switch back to upper hemisphere
      if (cfg.flipUpperHemisphereFoot) {
        mat4.rotate(footM, footM, Math.PI, [1, 0, 0]);
      }

      mat4.rotate(footM, footM, cfg.FOOT_PITCH, [1, 0, 0]);
      mat4.rotate(footM, footM, side * cfg.FOOT_YAW_OUT, [0, 1, 0]);
      mat4.scale(footM, footM, cfg.FOOT_SCALE);
      drawSet(buffers.foot, footM);
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

  // Hemisphere along Y; lower=true keeps y<=0 (dome downward), else y>=0
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

  global.MegaLegs = { init, draw, defaults: DEFAULTS };
})(typeof window !== "undefined" ? window : this);