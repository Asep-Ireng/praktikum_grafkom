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
            gl_FragColor = vec4(vColor, 1.0);
        }`;

  function compile_shader(source, type, typeString) {
    var shader = GL.createShader(type);
    GL.shaderSource(shader, source);
    GL.compileShader(shader);
    if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
      alert("ERROR IN " + typeString + " SHADER: " + GL.getShaderInfoLog(shader));
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


  function attachPadWithPivot(parent, padParams, color, attachPos, yawDeg, rollDeg, side) {
    // side: +1 = right, -1 = left (controls body offset sign)
    const padBody = createShoulderPad(GL, padParams, color);

    // pivot at the attach point on the torso
    const pivot = {
      id: `padPivot_${side > 0 ? "R" : "L"}`,
      mesh: null,
      geom: null,
      transform: LIBS.makeTransform(attachPos[0], attachPos[1], attachPos[2]),
      children: [padBody],
    };

    // shift the pad so its near end sits at the pivot
    padBody.transform.position = [side * (padParams.padLen / 2), 0, 0];

    // aim: yaw around Y (forward/back), roll around Z (up/down at far end)
    pivot.transform.rotation = [
      0,
      LIBS.degToRad(yawDeg),
      LIBS.degToRad(rollDeg),
    ];

    // overall composite scale (length/thick/width) if needed
    pivot.transform.scale = [1.0, 0.6, 1.0];

    parent.children.push(pivot);
    return { pivot, padBody };
  }

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
  const torsoT = {
    position: [0.0, 0.0, 0.0],
    rotation: [0.2, 0.0, 0.0],
    scale: [1.15, 1.8, 1.1],
  };
  const torsoB = {
    position: [0.0, -2.0, 3.0],
    rotation: [0.15, 0.0, 0.0],
    scale: [1.15, 1.8, 1.1],
  };
  const headT = {
    position: [0.0, torsoDims.b + -2.5 * headDims.b, -1.6],
    rotation: [LIBS.degToRad(-8), 0.0, 0.0],
    scale: [1.4, 1.6, 1.5],
  };

  // Colors
  const torsoColor = [0.15, 0.35, 0.85];
  const headColor = [0.2, 0.55, 0.95];

  // ============== GEOMETRY ==============
  const torsoGeo = LIBS.generateEllipsoid(
    torsoDims.a,
    torsoDims.b,
    torsoDims.c,
    torsoDims.su,
    torsoDims.sv
  );
  const torsoGeo2 = LIBS.generateEllipsoid(
    torsoDims.a,
    torsoDims.b,
    torsoDims.c,
    torsoDims.su,
    torsoDims.sv
  );

  // 1) Squash only the bottom (under part) without touching the top
  LIBS.squashStretchY(torsoGeo.vertices, torsoDims.b, {
    kBottom: 0.10,
    kTop: -0.10,
    power: 1.4,
    preserveVolume: false,
  });

  // Option B: make a back hump (top-only, leaves belly alone)
  LIBS.stretchBackTopY(torsoGeo.vertices, torsoDims.b, torsoDims.c, {
    k: 1.2,
    powerZ: 6.0,
    powerY: 2.0,
    preserveVolume: true,
  });

  LIBS.overrideColor(torsoGeo.vertices, ...torsoColor);
  const torsoMesh = createMesh(GL, torsoGeo);

  LIBS.overrideColor(torsoGeo2.vertices, ...torsoColor);
  const torsoMesh2 = createMesh(GL, torsoGeo2);

  const headGeo = LIBS.generateEllipsoid(
    headDims.a,
    headDims.b,
    headDims.c,
    headDims.su,
    headDims.sv
  );
  LIBS.overrideColor(headGeo.vertices, ...headColor);
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
    transform: LIBS.makeTransform(
      torsoT.position[0],
      torsoT.position[1],
      torsoT.position[2]
    ),
    children: [],
  };
  const torsoNode2 = {
    id: "torsoB",
    mesh: torsoMesh2,
    geom: {
      type: "ellipsoid",
      params: torsoDims,
      color: torsoColor,
    },
    transform: LIBS.makeTransform(
      torsoB.position[0],
      torsoB.position[1],
      torsoB.position[2]
    ),
    children: [],
  };

  torsoNode.transform.rotation = torsoT.rotation.slice();
  torsoNode.transform.scale = torsoT.scale.slice();
  torsoNode2.transform.rotation = torsoB.rotation.slice();
  torsoNode2.transform.scale = torsoB.scale.slice();

  const headNode = {
    id: "head",
    mesh: headMesh,
    geom: {
      type: "ellipsoid",
      params: headDims,
      color: headColor,
    },
    transform: LIBS.makeTransform(
      headT.position[0],
      headT.position[1],
      headT.position[2]
    ),
    children: [],
  };
  headNode.transform.rotation = headT.rotation.slice();
  headNode.transform.scale = headT.scale.slice();
  // -------------------- example usage --------------------
// call this after torsoNode/headNode exists in your scene (tweak attach/Z/Y/X as needed):
// for a right-side cheek:
createCheek(GL, torsoNode, {
  a: 0.9, b: 0.58, c: 0.55,
  attach: [1.05, 0.45, -0.55], // move this to fit your model
  uDegMin: -20, uDegMax: 60,
  vDegMin: -50, vDegMax: 20,
  thickness: 0.055,
  color: [0.95, 0.45, 0.15]
});

// for left side flip X attach (optional):
// createCheek(torsoNode, { attach: [-1.05,0.45,-0.55], color: [0.95,0.45,0.15], vDegMin: -20, vDegMax: 50 });


  const ORANGE = [0.95, 0.45, 0.15];
  const padParams = {
    padLen: 1.6,
    padRy: 0.55,
    padRz: 0.42,
    capAx: 0.55,
    capBy: 0.55,
    capCz: 0.42,
  };

  attachPadWithPivot(
    torsoNode,
    padParams,
    ORANGE,
    [-1.25, 0.15, -0.1], // left attach point
    +100, // yaw
    +10, // roll
    -0.5 // side = left (-1)
  );

  attachPadWithPivot(
    torsoNode,
    padParams,
    ORANGE,
    [1.25, 0.55, -0.2], // right attach point
    -18, // yaw
    -12, // roll
    +1 // side = right
  );

  const rootNode = {
    id: "root",
    transform: LIBS.makeTransform(),
    children: [torsoNode, torsoNode2, headNode],
  };

  // ============== CAMERA / MOUSE ORBIT ONLY ==============
  var PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
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

// ---------------- WebGL helper that depends on gl (kept in main.js) ---------------
function createMesh(gl, geom) {
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geom.vertices), gl.STATIC_DRAW);

  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geom.faces), gl.STATIC_DRAW);

  return { vbo, ibo, count: geom.faces.length, facesCount: geom.faces.length };
}

// ---- serialization helpers (remain in main.js) ----
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
    g = LIBS.generateEllipsoid(p.a, p.b, p.c, p.su, p.sv);
    LIBS.overrideColor(g.vertices, ...geom.color);
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
    transform: LIBS.makeTransform(),
    children: prefab.children.map((p) => instantiatePart(gl, p)),
  };
}

// ----------------- createShoulderPad stays in main.js (uses GL) -----------------
function createShoulderPad(gl, params, color) {
  const {
    padLen, padRy, padRz,
    capAx, capBy, capCz,
    segCyl = 64, segEll = 48
  } = params;

  // geometry (use LIBS helpers)
  const cylGeo = LIBS.generateCylinderX(padRy, padRz, padLen, segCyl, true);
  LIBS.tint(cylGeo.vertices, ...color);
  const capLGeo = LIBS.generateEllipsoidHalfX(capAx, capBy, capCz, 24, segEll, -1);
  LIBS.tint(capLGeo.vertices, ...color);
  const capRGeo = LIBS.generateEllipsoidHalfX(capAx, capBy, capCz, 24, segEll, +1);
  LIBS.tint(capRGeo.vertices, ...color);

  // meshes
  const cylMesh = createMesh(gl, cylGeo);
  const capLMesh = createMesh(gl, capLGeo);
  const capRMesh = createMesh(gl, capRGeo);

  // nodes
  const group = { id: "shoulderPad", mesh: null, geom: null, transform: LIBS.makeTransform(0, 0, 0), children: [] };

  const cylNode = { id: "padCyl", mesh: cylMesh, geom: null, transform: LIBS.makeTransform(0, 0, 0), children: [] };
  const capLNode = { id: "padCapL", mesh: capLMesh, geom: null, transform: LIBS.makeTransform(-padLen / 2, 0, 0), children: [] };
  const capRNode = { id: "padCapR", mesh: capRMesh, geom: null, transform: LIBS.makeTransform(padLen / 2, 0, 0), children: [] };

  group.children.push(cylNode, capLNode, capRNode);
  return group;
}


function generateEllipsoidSector(a, b, c, stacks, sectors, uMin, uMax, vMin, vMax) {
  const vertices = [];
  const faces = [];
  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  const da = a || 1e-6, db = b || 1e-6, dc = c || 1e-6;

  for (let i = 0; i <= stacks; i++) {
    const u = uMin + (i / stacks) * (uMax - uMin);
    const cu = Math.cos(u), su = Math.sin(u);
    for (let j = 0; j <= sectors; j++) {
      const v = vMin + (j / sectors) * (vMax - vMin);
      const cv = Math.cos(v), sv = Math.sin(v);
      const x = a * cv * cu;
      const y = b * su;
      const z = c * sv * cu;
      const r = clamp01(x / (2 * da) + 0.5);
      const g = clamp01(y / (2 * db) + 0.5);
      const bl = clamp01(z / (2 * dc) + 0.5);
      vertices.push(x, y, z, r, g, bl);
    }
  }

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

function generateEllipsoidShellSector(a, b, c, stacks, sectors, uMin, uMax, vMin, vMax, thickness = 0.06) {
  const outer = generateEllipsoidSector(a, b, c, stacks, sectors, uMin, uMax, vMin, vMax);
  const ai = a * (1 - thickness), bi = b * (1 - thickness), ci = c * (1 - thickness);
  const inner = generateEllipsoidSector(ai, bi, ci, stacks, sectors, uMin, uMax, vMin, vMax);

  const verts = outer.vertices.slice();
  const innerOffset = verts.length / 6;
  for (let i = 0; i < inner.vertices.length; i += 6) {
    verts.push(inner.vertices[i + 0], inner.vertices[i + 1], inner.vertices[i + 2],
               inner.vertices[i + 3], inner.vertices[i + 4], inner.vertices[i + 5]);
  }

  const faces = outer.faces.slice();

  // inner faces (flip winding)
  for (let i = 0; i < stacks; i++) {
    for (let j = 0; j < sectors; j++) {
      const first = innerOffset + i * (sectors + 1) + j;
      const second = first + 1;
      const third = first + (sectors + 1);
      const fourth = third + 1;
      faces.push(first, fourth, second, first, third, fourth);
    }
  }

  // stitch edges (vMin seam, vMax seam, uMin edge, uMax edge)
  // seam vMin (j=0)
  for (let i = 0; i < stacks; i++) {
    const oA = i * (sectors + 1) + 0;
    const oB = (i + 1) * (sectors + 1) + 0;
    const iA = innerOffset + i * (sectors + 1) + 0;
    const iB = innerOffset + (i + 1) * (sectors + 1) + 0;
    faces.push(oA, oB, iB, oA, iB, iA);
  }
  // seam vMax (j=sectors)
  for (let i = 0; i < stacks; i++) {
    const oA = i * (sectors + 1) + sectors;
    const oB = (i + 1) * (sectors + 1) + sectors;
    const iA = innerOffset + i * (sectors + 1) + sectors;
    const iB = innerOffset + (i + 1) * (sectors + 1) + sectors;
    faces.push(oB, oA, iA, oB, iA, iB);
  }
  // seam uMin (i=0)
  for (let j = 0; j < sectors; j++) {
    const oA = 0 * (sectors + 1) + j;
    const oB = 0 * (sectors + 1) + (j + 1);
    const iA = innerOffset + 0 * (sectors + 1) + j;
    const iB = innerOffset + 0 * (sectors + 1) + (j + 1);
    faces.push(oB, oA, iA, oB, iA, iB);
  }
  // seam uMax (i=stacks)
  for (let j = 0; j < sectors; j++) {
    const oA = stacks * (sectors + 1) + j;
    const oB = stacks * (sectors + 1) + (j + 1);
    const iA = innerOffset + stacks * (sectors + 1) + j;
    const iB = innerOffset + stacks * (sectors + 1) + (j + 1);
    faces.push(oA, oB, iB, oA, iB, iA);
  }

  return { vertices: verts, faces: faces };
}

function createCheek(GL, parentNode, options = {}) {
  // small local vector helpers with fallbacks to LIBS or global helpers
  const vecNormalize = (v) => (typeof LIBS !== "undefined" && LIBS.normalize) ? LIBS.normalize(v) : (typeof normalize === "function" ? normalize(v) : (function(){const m=Math.hypot(v[0],v[1],v[2])||1; return [v[0]/m,v[1]/m,v[2]/m];})());
  const vecAdd = (a,b) => (typeof LIBS !== "undefined" && LIBS.add) ? LIBS.add(a,b) : (typeof add === "function" ? add(a,b) : [a[0]+b[0],a[1]+b[1],a[2]+b[2]]);
  const vecScale = (v,s) => (typeof LIBS !== "undefined" && LIBS.scaleVec) ? LIBS.scaleVec(v,s) : (typeof LIBS !== "undefined" && LIBS.scaleV ? LIBS.scaleV(v,s) : (typeof scale === "function" ? scale(v,s) : [v[0]*s,v[1]*s,v[2]*s]));

  const opt = Object.assign({
    a: 0.9, b: 0.6, c: 0.55,
    stacks: 24, sectors: 36,
    uDegMin: -20, uDegMax: 60,
    vDegMin: -40, vDegMax: 40,
    thickness: 0.055,
    color: [0.95, 0.45, 0.15],
    attach: [1.05, 0.45, -0.55],
    rot: [0.0, 0.0, (typeof LIBS!=="undefined"?LIBS.degToRad(8):Math.PI*8/180)]
  }, options);

  const uMin = (typeof LIBS!=="undefined"?LIBS.degToRad(opt.uDegMin):(opt.uDegMin*Math.PI/180));
  const uMax = (typeof LIBS!=="undefined"?LIBS.degToRad(opt.uDegMax):(opt.uDegMax*Math.PI/180));
  const vMin = (typeof LIBS!=="undefined"?LIBS.degToRad(opt.vDegMin):(opt.vDegMin*Math.PI/180));
  const vMax = (typeof LIBS!=="undefined"?LIBS.degToRad(opt.vDegMax):(opt.vDegMax*Math.PI/180));

  // shell geometry
  const shellGeo = generateEllipsoidShellSector(opt.a,opt.b,opt.c,opt.stacks,opt.sectors,uMin,uMax,vMin,vMax,opt.thickness);
  // color and mesh
  if (typeof LIBS !== "undefined" && LIBS.tint) LIBS.tint(shellGeo.vertices, ...opt.color);
  else { for (let i=0;i<shellGeo.vertices.length;i+=6){ shellGeo.vertices[i+3]=opt.color[0]; shellGeo.vertices[i+4]=opt.color[1]; shellGeo.vertices[i+5]=opt.color[2]; } }
  const shellMesh = createMesh(GL, shellGeo);

  // node
  const cheekNode = { id:"cheek", mesh:null, geom:{type:"cheekShell"}, transform:(typeof LIBS!=="undefined"?LIBS.makeTransform(opt.attach[0],opt.attach[1],opt.attach[2]):makeTransform(opt.attach[0],opt.attach[1],opt.attach[2])), children:[] };
  cheekNode.transform.rotation = opt.rot.slice();
  cheekNode.transform.scale = [1,1,1];

  const shellNode = { id:"cheekShell", mesh:shellMesh, geom:{type:"ellipsoidSector", params:{a:opt.a,b:opt.b,c:opt.c}, color:opt.color}, transform:(typeof LIBS!=="undefined"?LIBS.makeTransform(0,0,0):makeTransform(0,0,0)), children:[] };
  cheekNode.children.push(shellNode);

  // samples for spikes
  const uSamples = [0.5*(uMin+uMax), uMax*0.8 + uMin*0.2, uMin*0.6 + uMax*0.4];
  const vSamples = [vMax*0.6, 0.5*(vMin+vMax), vMin*0.6];
  const smallDims = [[0.26,0.12,0.12],[0.24,0.10,0.10],[0.18,0.09,0.09]];

  for (let k=0;k<3;k++){
    const u = uSamples[k], v = vSamples[k];
    const x = opt.a * Math.cos(v) * Math.cos(u);
    const y = opt.b * Math.sin(u);
    const z = opt.c * Math.sin(v) * Math.cos(u);

    // approximate normal in ellipsoid space: (x/a^2, y/b^2, z/c^2)
    const nApprox = vecNormalize([ x/(opt.a*opt.a), y/(opt.b*opt.b), z/(opt.c*opt.c) ]);
    const offset = 0.06 + 0.03 * k;
    const outPos = vecAdd([x,y,z], vecScale(nApprox, offset));

    // small ellipsoid
    const sd = smallDims[k];
    const smallG = (typeof LIBS!=="undefined" && LIBS.generateEllipsoid) ? LIBS.generateEllipsoid(sd[0],sd[1],sd[2],18,28) : generateEllipsoid(sd[0],sd[1],sd[2],18,28);
    if (typeof LIBS !== "undefined" && LIBS.tint) LIBS.tint(smallG.vertices, ...opt.color);
    else { for (let i=0;i<smallG.vertices.length;i+=6){ smallG.vertices[i+3]=opt.color[0]; smallG.vertices[i+4]=opt.color[1]; smallG.vertices[i+5]=opt.color[2]; } }
    const smallMesh = createMesh(GL, smallG);

    // orientation (basic)
    const yaw = Math.atan2(nApprox[2], nApprox[0]);
    const pitch = Math.asin(Math.max(-1, Math.min(1, -nApprox[1])));

    const smallNode = { id:`cheekSpike_${k}`, mesh:smallMesh, geom:{type:"ellipsoid", params:{a:sd[0],b:sd[1],c:sd[2]}, color:opt.color}, transform:(typeof LIBS!=="undefined"?LIBS.makeTransform(outPos[0],outPos[1],outPos[2]):makeTransform(outPos[0],outPos[1],outPos[2])), children:[] };
    smallNode.transform.rotation = [pitch, yaw, 0.0];
    cheekNode.children.push(smallNode);
  }

  parentNode.children.push(cheekNode);
  return cheekNode;
}

