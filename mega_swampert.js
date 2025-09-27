function main() {
  /** @type {HTMLCanvasElement} */
  var CANVAS = document.getElementById("mycanvas");
  CANVAS.width = window.innerWidth;
  CANVAS.height = window.innerHeight;

  /** @type {WebGLRenderingContext} */
  var GL;
  try {
    GL = CANVAS.getContext("webgl", { antialias: true });
  } catch (e) {
    alert("WebGL context cannot be initialized");
    return false;
  }

  // ============== SHADERS ==============
  var shader_vertex_source = `
        attribute vec3 position;
        uniform mat4 Pmatrix, Vmatrix, Mmatrix;
        attribute vec3 color;
        varying vec3 vColor;
        void main(void) {
            gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.);
            vColor = color;
        }`;

  var shader_fragment_source = `
        precision mediump float;
        varying vec3 vColor;
        void main(void) {
            gl_FragColor = vec4(vColor, 1.);
        }`;

  function compile_shader(source, type, typeString) {
    var shader = GL.createShader(type);
    GL.shaderSource(shader, source);
    GL.compileShader(shader);
    if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
      alert(
        "ERROR IN " + typeString + " SHADER: " + GL.getShaderInfoLog(shader)
      );
      return false;
    }
    return shader;
  }

  var shader_vertex = compile_shader(
    shader_vertex_source,
    GL.VERTEX_SHADER,
    "VERTEX"
  );
  var shader_fragment = compile_shader(
    shader_fragment_source,
    GL.FRAGMENT_SHADER,
    "FRAGMENT"
  );

  var SHADER_PROGRAM = GL.createProgram();
  GL.attachShader(SHADER_PROGRAM, shader_vertex);
  GL.attachShader(SHADER_PROGRAM, shader_fragment);
  GL.linkProgram(SHADER_PROGRAM);
  if (!GL.getProgramParameter(SHADER_PROGRAM, GL.LINK_STATUS)) {
    console.error(GL.getProgramInfoLog(SHADER_PROGRAM));
  }

  var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
  GL.enableVertexAttribArray(_position);
  var _color = GL.getAttribLocation(SHADER_PROGRAM, "color");
  GL.enableVertexAttribArray(_color);

  var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
  var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
  var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");

  GL.useProgram(SHADER_PROGRAM);

  // inside main(), after GL.useProgram(...)
function drawNode(node, parentMatrix) {
  // local TRS
  const mLocal = LIBS.get_I4();
  LIBS.translateLocal(
    mLocal,
    node.transform.position[0],
    node.transform.position[1],
    node.transform.position[2]
  );
  LIBS.rotateX(mLocal, node.transform.rotation[0]);
  LIBS.rotateY(mLocal, node.transform.rotation[1]);
  LIBS.rotateZ(mLocal, node.transform.rotation[2]);
  LIBS.scale(
    mLocal,
    node.transform.scale[0],
    node.transform.scale[1],
    node.transform.scale[2]
  );

  // world = parent * local
  const mWorld = LIBS.get_I4();
  LIBS.mul(mWorld, parentMatrix, mLocal);

  if (node.mesh) {
    GL.uniformMatrix4fv(_Mmatrix, false, mWorld);
    GL.bindBuffer(GL.ARRAY_BUFFER, node.mesh.vbo);
    GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * 6, 0);
    GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * 6, 4 * 3);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, node.mesh.ibo);
    GL.drawElements(GL.TRIANGLES, node.mesh.count, GL.UNSIGNED_SHORT, 0);
  }
  if (node.children) {
    for (const c of node.children) drawNode(c, mWorld);
  }
}

  // ============== PARAMETERS YOU EDIT ==============
  // Morph (axes) + tesselation
  const torsoDims = { a: 1.6, b: 1.2, c: 2.1, su: 48, sv: 96 };
  const headDims = { a: 1.0, b: 0.75, c: 1.0, su: 40, sv: 80 };

  // Transforms (position in parent-local units, rotation in radians)
  // Torso: at origin
  const torsoT = {
    position: [0.0, 0.0, 0.0],
    rotation: [0.0, 0.0, 0.0],
    scale: [0.8, 1.1, 0.8],
  };

  // Head: start above torso. Tweak these numbers by hand and reload.
  const headT = {
    position: [0.0, torsoDims.b + -2.0 * headDims.b, -1.8],
    rotation: [LIBS.degToRad(-8), 0.0, 0.0], // tilt a bit forward
    scale: [1.4, 1.0, 1.2],
  };

  // Colors
  const torsoColor = [0.15, 0.35, 0.85];
  const headColor = [0.2, 0.55, 0.95];

  // ============== GEOMETRY ==============
  const torsoGeo = generateEllipsoid(
    torsoDims.a,
    torsoDims.b,
    torsoDims.c,
    torsoDims.su,
    torsoDims.sv
  );
  overrideColor(torsoGeo.vertices, ...torsoColor);
  const torsoMesh = createMesh(GL, torsoGeo);

  const headGeo = generateEllipsoid(
    headDims.a,
    headDims.b,
    headDims.c,
    headDims.su,
    headDims.sv
  );
  overrideColor(headGeo.vertices, ...headColor);
  const headMesh = createMesh(GL, headGeo);

  // ============== NODES (scene graph) ==============
  const torsoNode = {
    id: "torso",
    mesh: torsoMesh,
    geom: {
      type: "ellipsoid",
      params: torsoDims,
      color: torsoColor,
    },
    transform: makeTransform(
      torsoT.position[0],
      torsoT.position[1],
      torsoT.position[2]
    ),
    children: [],
  };
  // apply rotation/scale from torsoT
  torsoNode.transform.rotation = torsoT.rotation.slice();
  torsoNode.transform.scale = torsoT.scale.slice();

  const headNode = {
    id: "head",
    mesh: headMesh,
    geom: {
      type: "ellipsoid",
      params: headDims,
      color: headColor,
    },
    transform: makeTransform(
      headT.position[0],
      headT.position[1],
      headT.position[2]
    ),
    children: [],
  };
  headNode.transform.rotation = headT.rotation.slice();
  headNode.transform.scale = headT.scale.slice();

  // Make head a child of torso so it stays attached
  torsoNode.children.push(headNode);

  const rootNode = { id: "root", transform: makeTransform(), children: [torsoNode] };

  // ============== CAMERA / MOUSE ORBIT ONLY ==============
  var PROJMATRIX = LIBS.get_projection(
    40,
    CANVAS.width / CANVAS.height,
    1,
    100
  );
  var MOVEMATRIX = LIBS.get_I4();
  var VIEWMATRIX = LIBS.get_I4();
  LIBS.translateZ(VIEWMATRIX, -6);

  let THETA = 0,
    PHI = 0;
  let drag = false;
  let x_prev = 0,
    y_prev = 0;

  CANVAS.addEventListener(
    "mousedown",
    (e) => {
      drag = true;
      x_prev = e.pageX;
      y_prev = e.pageY;
      e.preventDefault();
    },
    false
  );
  CANVAS.addEventListener(
    "mouseup",
    () => {
      drag = false;
    },
    false
  );
  CANVAS.addEventListener(
    "mouseout",
    () => {
      drag = false;
    },
    false
  );
  CANVAS.addEventListener(
    "mousemove",
    (e) => {
      if (!drag) return;
      const dX = ((e.pageX - x_prev) * 2 * Math.PI) / CANVAS.width;
      const dY = ((e.pageY - y_prev) * 2 * Math.PI) / CANVAS.height;
      THETA += dX;
      PHI += dY;
      x_prev = e.pageX;
      y_prev = e.pageY;
      e.preventDefault();
    },
    false
  );

  // ============== RENDER LOOP ==============
  GL.enable(GL.DEPTH_TEST);
  GL.depthFunc(GL.LEQUAL);
  GL.clearColor(0.0, 0.0, 0.0, 1.0);
  GL.clearDepth(1.0);

  const animate = function () {
    GL.viewport(0, 0, CANVAS.width, CANVAS.height);
    GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

    GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
    GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);

    LIBS.set_I4(MOVEMATRIX);
    LIBS.rotateY(MOVEMATRIX, THETA);
    LIBS.rotateX(MOVEMATRIX, PHI);

    drawNode(rootNode, MOVEMATRIX);

    GL.flush();
    window.requestAnimationFrame(animate);
  };
  animate(0);
}
window.addEventListener("load", main);

function generateHyperboloidOneSheet(
  a = 1,
  b = 1,
  c = 1,
  stacks = 36,
  sectors = 72,
  epsilon = 0.2
) {
  const vertices = [];
  const faces = [];

  // Param ranges (avoid singularities at ±π/2)
  const vMin = -Math.PI / 2 + epsilon;
  const vMax = Math.PI / 2 - epsilon;
  const uMin = -Math.PI;
  const uMax = Math.PI;

  // For color normalization
  const secMax = 1 / Math.cos(vMax);
  const tanMax = Math.tan(vMax);
  const clamp01 = (t) => Math.max(0, Math.min(1, t));

  for (let i = 0; i <= stacks; i++) {
    const v = vMin + (i / stacks) * (vMax - vMin);
    const secv = 1 / Math.cos(v);
    const tanv = Math.tan(v);

    for (let j = 0; j <= sectors; j++) {
      const u = uMin + (j / sectors) * (uMax - uMin);

      // Hyperboloid (one sheet)
      const x = a * secv * Math.cos(u);
      const y = b * secv * Math.sin(u);
      const z = c * tanv;

      // Simple position-based color, normalized to 0..1
      const r = clamp01(x / (2 * a * secMax) + 0.5);
      const g = clamp01(y / (2 * b * secMax) + 0.5);
      const bl = clamp01(z / (2 * c * tanMax) + 0.5);

      vertices.push(x, y, z, r, g, bl);
    }
  }

  // Indices (two triangles per quad)
  for (let i = 0; i < stacks; i++) {
    for (let j = 0; j < sectors; j++) {
      const first = i * (sectors + 1) + j;
      const second = first + 1;
      const third = first + (sectors + 1);
      const fourth = third + 1;
      faces.push(first, second, fourth, first, fourth, third);
    }
  }

  return { vertices, faces };
}


function generateEllipsoid(a = 1, b = 1, c = 1, stacks = 36, sectors = 72) {
  const vertices = [];
  const faces = [];

  // helper to keep colors in [0,1]
  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  const da = a || 1e-6, db = b || 1e-6, dc = c || 1e-6;

  // u: latitude in [-π/2, π/2], v: longitude in [-π, π]
  for (let i = 0; i <= stacks; i++) {
    const u = -Math.PI / 2 + (i / stacks) * Math.PI; // lat
    const cu = Math.cos(u);
    const su = Math.sin(u);

    for (let j = 0; j <= sectors; j++) {
      const v = -Math.PI + (j / sectors) * (2 * Math.PI); // lon
      const cv = Math.cos(v);
      const sv = Math.sin(v);

      // Ellipsoid parametric
      const x = a * cv * cu;
      const y = b * su;
      const z = c * sv * cu;

      // Simple position-based color, normalized to [0,1]
      const r = clamp01(x / (2 * da) + 0.5);
      const g = clamp01(y / (2 * db) + 0.5);
      const bl = clamp01(z / (2 * dc) + 0.5);

      vertices.push(x, y, z, r, g, bl);
    }
  }

  // indices (two triangles per quad)
  for (let i = 0; i < stacks; i++) {
    for (let j = 0; j < sectors; j++) {
      const first = i * (sectors + 1) + j;
      const second = first + 1;
      const third = first + (sectors + 1);
      const fourth = third + 1;
      faces.push(first, second, fourth, first, fourth, third);
    }
  }

  return { vertices, faces };
}

function overrideColor(interleaved, r, g, b) {
  for (let i = 0; i < interleaved.length; i += 6) {
    interleaved[i + 3] = r;
    interleaved[i + 4] = g;
    interleaved[i + 5] = b;
  }
}

function createMesh(gl, geom) {
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(geom.vertices),
    gl.STATIC_DRAW
  );

  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(geom.faces),
    gl.STATIC_DRAW
  );

  return { vbo, ibo, count: geom.faces.length };
}

// ---- scene-graph minimal helpers ----
function makeTransform(px = 0, py = 0, pz = 0) {
  return {
    position: [px, py, pz],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  };
}

// function drawNode(node, parentMatrix) {
//   // local TRS
//   const mLocal = LIBS.get_I4();
//   // T
//   LIBS.translateLocal(
//     mLocal,
//     node.transform.position[0],
//     node.transform.position[1],
//     node.transform.position[2]
//   );
//   // R
//   LIBS.rotateX(mLocal, node.transform.rotation[0]);
//   LIBS.rotateY(mLocal, node.transform.rotation[1]);
//   LIBS.rotateZ(mLocal, node.transform.rotation[2]);
//   // S
//   LIBS.scale(
//     mLocal,
//     node.transform.scale[0],
//     node.transform.scale[1],
//     node.transform.scale[2]
//   );

//   // world = parent * local
//   const mWorld = LIBS.get_I4();
//   LIBS.mul(mWorld, parentMatrix, mLocal);

//   if (node.mesh) {
//     GL.uniformMatrix4fv(_Mmatrix, false, mWorld);
//     GL.bindBuffer(GL.ARRAY_BUFFER, node.mesh.vbo);
//     GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * 6, 0);
//     GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * 6, 4 * 3);
//     GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, node.mesh.ibo);
//     GL.drawElements(GL.TRIANGLES, node.mesh.count, GL.UNSIGNED_SHORT, 0);
//   }
//   if (node.children) {
//     for (const c of node.children) drawNode(c, mWorld);
//   }
// }

// ---- serialization helpers ----
function serializePart(node) {
  return {
    id: node.id,
    geom: node.geom, // {type, params, color}
    transform: node.transform,
  };
}
function serializePrefab(groupId, nodes) {
  return {
    id: groupId,
    type: "group",
    children: nodes.map(serializePart),
  };
}
function saveJSON(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj, null, 2));
}
function loadJSON(key) {
  const s = localStorage.getItem(key);
  return s ? JSON.parse(s) : null;
}

function buildMeshFromGeom(gl, geom) {
  let g;
  if (geom.type === "ellipsoid") {
    const p = geom.params;
    g = generateEllipsoid(p.a, p.b, p.c, p.su, p.sv);
    overrideColor(g.vertices, ...geom.color);
  } else {
    throw new Error("Unknown geom type: " + geom.type);
  }
  return createMesh(gl, g);
}
function instantiatePart(gl, partJson) {
  const mesh = buildMeshFromGeom(gl, partJson.geom);
  return {
    id: partJson.id,
    mesh,
    geom: partJson.geom,
    transform: JSON.parse(JSON.stringify(partJson.transform)),
    children: [],
  };
}
function loadPrefab(gl, key) {
  const prefab = loadJSON(key);
  if (!prefab) return null;
  return {
    id: prefab.id,
    transform: makeTransform(),
    children: prefab.children.map((p) => instantiatePart(gl, p)),
  };
}

//    GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
//     GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);
//     GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX);

//     LIBS.set_I4(MOVEMATRIX);
//     LIBS.rotateY(MOVEMATRIX, THETA);
//     LIBS.rotateX(MOVEMATRIX, PHI);

//     GL.bindBuffer(GL.ARRAY_BUFFER, OBJECT_VERTEX);
//     GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * 6, 0);
//     GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * 6, 4 * 3);

//     GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, OBJECT_FACES);
//     GL.drawElements(GL.TRIANGLES, object_faces.length, GL.UNSIGNED_SHORT, 0);