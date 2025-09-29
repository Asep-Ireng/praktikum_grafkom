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


  function attachPadWithPivot(parent, padParams, color, attachPos, yawDeg, rollDeg, side) {
  // side: +1 = right, -1 = left (controls body offset sign)
  const padBody = createShoulderPad(GL, padParams, color);

  // pivot at the attach point on the torso
  const pivot = {
    id: `padPivot_${side > 0 ? "R" : "L"}`,
    mesh: null,
    geom: null,
    transform: makeTransform(attachPos[0], attachPos[1], attachPos[2]),
    children: [padBody],
  };

  // shift the pad so its near end sits at the pivot
  padBody.transform.position = [side * (padParams.padLen / 2), 0, 0];

  // aim: yaw around Y (forward/back), roll around Z (up/down at far end)
  pivot.transform.rotation = [
    0,
    LIBS.degToRad(yawDeg),   // + yaw points outward/forward (adjust)
    LIBS.degToRad(rollDeg),  // negative rolls the far end downward
  ];

  // overall composite scale (length/thick/width) if needed
  pivot.transform.scale = [1.0, 0.6, 1.0]; // your previous thickness squeeze

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
  // Torso: at origin
  const torsoT = {
    position: [0.0, 0.0, 0.0],
    rotation: [0.2, 0.0, 0.0],
    scale: [1.15, 1.8, 1.1],
  };
  // Torso: at origin
  const torsoB = {
    position: [0.0, -2.0, 3.0],
    rotation: [0.15, 0.0, 0.0],
    scale: [1.15, 1.8, 1.1],
  };
  // Head: start above torso. Tweak these numbers by hand and reload.
  const headT = {
    position: [0.0, torsoDims.b + -2.5 * headDims.b, -1.6],
    rotation: [LIBS.degToRad(-8), 0.0, 0.0], // tilt a bit forward
    scale: [1.4, 1.6, 1.5],
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
    const torsoGeo2 = generateEllipsoid(
    torsoDims.a,
    torsoDims.b,
    torsoDims.c,
    torsoDims.su,
    torsoDims.sv
  );
  // 1) Squash only the bottom (under part) without touching the top
squashStretchY(torsoGeo.vertices, torsoDims.b, {
  kBottom: 0.10,    // 25% flatter at very bottom
  kTop: -0.10,
  power: 1.4,
  preserveVolume: false
});


// 2) Make only the top taller without changing the bottom
// (uncomment if you want additional top stretch)
// squashStretchY(torsoGeo.vertices, torsoDims.b, {
//   kTop: -0.30,     // +15% at top
//   kBottom: 0.0,
//   power: 1.2
// });

// Option A: raise the whole back (top and bottom) a bit
//  stretchYByZ(torsoGeo.vertices, torsoDims.c, 
//     { back: 0.30,
//          power: 1.3, 
//          preserveVolume: true });

// Option B: make a back hump (top-only, leaves belly alone)
stretchBackTopY(torsoGeo.vertices, torsoDims.b, torsoDims.c, {
  k: 1.2,          // ~22% taller at extreme back-top
  powerZ: 6.0,      // sharper near back end
  powerY: 2.0,      // smoother from middle to top
  preserveVolume: true
});



// 3) Optionally widen the top in X/Z without affecting bottom
// taperXZ(torsoGeo.vertices, torsoDims.b, { top: 0.08, bottom: 0.0, power: 1.2 });
  overrideColor(torsoGeo.vertices, ...torsoColor);
  const torsoMesh = createMesh(GL, torsoGeo);
  overrideColor(torsoGeo2.vertices, ...torsoColor);
  const torsoMesh2 = createMesh(GL, torsoGeo2);

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
    const torsoNode2 = {
    id: "torso",
    mesh: torsoMesh2,
    geom: {
      type: "ellipsoid",
      params: torsoDims,
      color: torsoColor,
    },
    transform: makeTransform(
      torsoB.position[0],
      torsoB.position[1],
      torsoB.position[2]
    ),
    children: [],
  };
  // apply rotation/scale from torsoT
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
    transform: makeTransform(
      headT.position[0],
      headT.position[1],
      headT.position[2]
    ),
    children: [],
  };
  headNode.transform.rotation = headT.rotation.slice();
  headNode.transform.scale = headT.scale.slice();

// Orange color
const orange = [0.95, 0.45, 0.15];


const ORANGE = [0.95, 0.45, 0.15];
const padParams = {
  padLen: 1.6,   // cylinder length
  padRy: 0.55,   // thickness (Y radius)
  padRz: 0.42,   // width (Z radius)
  capAx: 0.55,   // half-ellipsoid length along X
  capBy: 0.55,   // match thickness
  capCz: 0.42    // match width
};


attachPadWithPivot(
  torsoNode,
  padParams,
  ORANGE,
  [-1.25, 0.55, -0.2], // left attach point
  +120,                 // yaw: slight forward aim
  +20,                 // roll: far end up a bit on left
  -2.0                  // side = left
);

attachPadWithPivot(
  torsoNode,
  padParams,
  ORANGE,
  [ 1.25, 0.55, -0.2], // right attach point
  -18,                 // yaw opposite
  -12,                 // roll negative => far end down on right near head
  +1                   // side = right
);


  // ======= Extended model: limbs, tail, eyes, cheeks, beads =======
  // We'll build forearms (big), 3-finger hands, hind legs, tail + fin,
  // cheek patches, eyes and throat beads. All nodes follow the same
  // node format used earlier: { id, mesh, geom, transform, children }.

  // small helper: make an ellipsoid mesh with given radii and color
  function makeEllipsoidNode(id, a,b,c, segU=32, segV=24, colorArr=[0.2,0.4,0.9]) {
    const geo = generateEllipsoid(a,b,c, segU, segV);
    overrideColor(geo.vertices, ...colorArr);
    const mesh = createMesh(GL, geo);
    return { id, mesh, geom: { type: "ellipsoid", params: {a,b,c}, color: colorArr }, transform: makeTransform(), children: [] };
  }

  // make a cylinder-x node (used for tail spine)
  function makeCylinderXNode(id, ry, rz, len, seg=32, colorArr=[0.2,0.4,0.9]) {
    const geo = generateCylinderX(ry, rz, len, seg, true);
    overrideColor(geo.vertices, ...colorArr);
    const mesh = createMesh(GL, geo);
    return { id, mesh, geom: { type: "cylinderX", params: {ry,rz,len}, color: colorArr }, transform: makeTransform(), children: [] };
  }

  // make a cone (pointing +X) node
  function makeConeXNode(id, baseR, tipR, len, seg=24, colorArr=[0.2,0.4,0.9]) {
    const geo = generateCone(baseR, tipR, len, seg);
    overrideColor(geo.vertices, ...colorArr);
    const mesh = createMesh(GL, geo);
    return { id, mesh, geom: { type: "cone", params: {baseR,tipR,len}, color: colorArr }, transform: makeTransform(), children: [] };
  }

  // Colors for details
  const CHEEK = [0.95, 0.22, 0.28];    // red cheek patches
  const BLACK = [0.06, 0.06, 0.06];
  const UNDERSIDE = [Math.max(0, torsoColor[0]-0.06), Math.max(0, torsoColor[1]-0.08), Math.max(0, torsoColor[2]-0.1)];

  // ---------------- Forearms + hands ----------------
  // Attach points on torso: roughly in front-lower sides (tweak if needed)
  const foreAttachL = [-1.0, -0.25, 0.6];
  const foreAttachR = [ 1.0, -0.25, 0.6];

  function buildForearm(side /* -1 left, +1 right */ , attach) {
    // upper forearm (big)
    const upper = makeEllipsoidNode(`upperArm_${side>0?'R':'L'}`, 0.45, 0.55, 0.48, 36, 24, torsoColor);
    // lower forearm
    const lower = makeEllipsoidNode(`lowerArm_${side>0?'R':'L'}`, 0.42, 0.5, 0.42, 36, 18, torsoColor);
    // palm (slightly flattened)
    const palm = makeEllipsoidNode(`palm_${side>0?'R':'L'}`, 0.36, 0.22, 0.48, 24, 18, torsoColor);

    // fingers: 3 cones spread
    const fingerLen = 0.6;
    const fingerR = 0.14;
    const fingers = [];
    for (let i=0;i<3;i++) {
      const f = makeConeXNode(`finger_${side>0?'R':'L'}_${i}`, fingerR*(1 - i*0.12), 0.02, fingerLen, 18, UNDERSIDE);
      // tilt and spread a little; parented to palm
      f.transform.rotation = [0, 0, LIBS.degToRad( (i-1)*12 * side )];
      f.transform.position = [ side * (0.28 + i*0.03), 0.0, -0.06 + i*0.06 ];
      // tip should point forward (+X) already by cone orientation
      fingers.push(f);
    }

    // set transforms (local spaces)
    upper.transform.position = [ side * 0.2, -0.05, 0.0 ];
    upper.transform.rotation = [ LIBS.degToRad(-20), 0, 0 ];
    lower.transform.position = [ side * 0.8, 0.0, 0.05 ];
    lower.transform.rotation = [ LIBS.degToRad(-8), 0, 0 ];
    palm.transform.position  = [ side * 1.25, 0.05, 0.0 ];
    palm.transform.rotation  = [ LIBS.degToRad(0), 0, 0 ];

    // wire them up: upper -> lower -> palm -> fingers
    lower.children.push(palm);
    fingers.forEach(f => palm.children.push(f));
    upper.children.push(lower);

    // create pivot at attachment point on torso
    const pivot = { id: `forePivot_${side>0?'R':'L'}`, mesh: null, geom: null,
                    transform: makeTransform(attach[0], attach[1], attach[2]),
                    children: [upper] };

    // rotate yaw slightly outward, pitch a bit to make arms rest on ground
    pivot.transform.rotation = [ 0, LIBS.degToRad( side * 18 ), LIBS.degToRad(-10) ];
    pivot.transform.scale = [1.05, 1.05, 1.05];

    return pivot;
  }

  const foreL = buildForearm(-1, foreAttachL);
  const foreR = buildForearm(+1, foreAttachR);

  // ---------------- Hind legs ----------------
  const hindAttachL = [-0.9, -1.15, -0.4]; // back-bottom sides
  const hindAttachR = [ 0.9, -1.15, -0.4];

  function buildHindLeg(side, attach) {
    const thigh = makeEllipsoidNode(`thigh_${side>0?'R':'L'}`, 0.55, 0.65, 0.48, 36, 24, torsoColor);
    const shin  = makeEllipsoidNode(`shin_${side>0?'R':'L'}`, 0.48, 0.45, 0.42, 36, 20, torsoColor);
    const foot  = makeEllipsoidNode(`foot_${side>0?'R':'L'}`, 0.40, 0.28, 0.55, 28, 18, torsoColor);

    // three toes as cones
    const toes = [];
    for (let i=0;i<3;i++) {
      const t = makeConeXNode(`toe_${side>0?'R':'L'}_${i}`, 0.11, 0.02, 0.28, 18, UNDERSIDE);
      t.transform.position = [ side * (0.32 + i*0.04), 0.0, -0.06 + i*0.06 ];
      t.transform.rotation = [ LIBS.degToRad(-6), 0, LIBS.degToRad( (i-1)*8 * side ) ];
      toes.push(t);
    }

    thigh.transform.position = [ side * -0.05, -0.2, -0.05 ];
    thigh.transform.rotation = [ LIBS.degToRad(12), 0, 0 ];
    shin.transform.position = [ side * 0.38, -0.35, 0.05 ];
    shin.transform.rotation = [ LIBS.degToRad(-14), 0, 0 ];
    foot.transform.position = [ side * 0.8, -0.55, 0.08 ];
    foot.transform.rotation = [ LIBS.degToRad(-6), 0, 0 ];

    toes.forEach(t => foot.children.push(t));
    shin.children.push(foot);
    thigh.children.push(shin);

    const pivot = { id: `hindPivot_${side>0?'R':'L'}`, mesh: null, geom: null,
                    transform: makeTransform(attach[0], attach[1], attach[2]),
                    children: [thigh] };
    pivot.transform.rotation = [0, LIBS.degToRad(side * -6), 0];

    return pivot;
  }

  const hindL = buildHindLeg(-1, hindAttachL);
  const hindR = buildHindLeg(+1, hindAttachR);

  // ---------------- Tail + fin ----------------
  // Tail spine as cylinder along +X, anchored at rear of torso
  const tailLen = 2.2;
  const tailSpine = makeCylinderXNode("tailSpine", 0.16, 0.12, tailLen, 48, torsoColor);
  // tail fin (flat) — use ellipsoid half mirrored to make fin-like shape
  const tailFinGeo = generateEllipsoidHalfX(0.08, 0.6, 0.9, 18, 24, +1);
  overrideColor(tailFinGeo.vertices, ...headColor);
  const tailFinMesh = createMesh(GL, tailFinGeo);
  const tailFinNode = { id: "tailFin", mesh: tailFinMesh, geom: { type: "halfEllipsoid", params: {a:0.08,b:0.6,c:0.9}, color: headColor }, transform: makeTransform(tailLen/2, 0, 0), children: [] };

  tailSpine.children.push(tailFinNode);
  // pivot placement: back end of torso (tweak if necessary)
  const tailPivot = { id: "tailPivot", mesh: null, geom: null,
                      transform: makeTransform(0.0, -0.15, -torsoDims.c*0.9),
                      children: [tailSpine] };
  tailPivot.transform.rotation = [LIBS.degToRad(-6), 0, 0];

  // ---------------- Head details: eyes, cheeks, beads ----------------
  // eyes: small dark ellipsoids on face, parented to headNode
  const eyeL = makeEllipsoidNode("eyeL", 0.06, 0.06, 0.03, 12, 8, BLACK);
  eyeL.transform.position = [ -0.22, 0.08, 0.28 ];
  eyeL.transform.rotation = [0, LIBS.degToRad(6), 0];

  const eyeR = makeEllipsoidNode("eyeR", 0.06, 0.06, 0.03, 12, 8, BLACK);
  eyeR.transform.position = [ -0.22, 0.08, -0.28 ];
  eyeR.transform.rotation = [0, LIBS.degToRad(-6), 0];

  // cheek patches (orange/red flat-ish ellipsoids)
  const cheekL = makeEllipsoidNode("cheekL", 0.14, 0.08, 0.12, 18, 12, CHEEK);
  cheekL.transform.position = [ 0.06, -0.06, 0.38 ];
  cheekL.transform.rotation = [ LIBS.degToRad(-12), LIBS.degToRad(10), 0 ];
  cheekL.transform.scale = [1.0, 0.7, 1.1];

  const cheekR = makeEllipsoidNode("cheekR", 0.14, 0.08, 0.12, 18, 12, CHEEK);
  cheekR.transform.position = [ 0.06, -0.06, -0.38 ];
  cheekR.transform.rotation = [ LIBS.degToRad(-12), LIBS.degToRad(-10), 0 ];
  cheekR.transform.scale = [1.0, 0.7, 1.1];

  // throat beads: three small spheres under chin
  const beadColor = [0.06, 0.06, 0.06];
  const beadNodes = [];
  for (let i=0;i<3;i++){
    const b = makeEllipsoidNode(`bead${i}`, 0.06, 0.06, 0.06, 12, 10, beadColor);
    b.transform.position = [ 0.02 + i*0.06, -0.18 - i*0.01, 0.0 ];
    beadNodes.push(b);
  }

  // crest fins (red/orange) on head top — two elongated cones/ellipsoids
  const crestL = makeEllipsoidNode("crestL", 0.08, 0.36, 0.02, 20, 10, ORANGE);
  crestL.transform.position = [ -0.35, 0.38, 0.18 ];
  crestL.transform.rotation = [ LIBS.degToRad(8), LIBS.degToRad(28), LIBS.degToRad(24) ];
  crestL.transform.scale = [1.0, 1.2, 1.0];

  const crestR = makeEllipsoidNode("crestR", 0.08, 0.36, 0.02, 20, 10, ORANGE);
  crestR.transform.position = [ -0.35, 0.38, -0.18 ];
  crestR.transform.rotation = [ LIBS.degToRad(8), LIBS.degToRad(-28), LIBS.degToRad(-24) ];
  crestR.transform.scale = [1.0, 1.2, 1.0];

  // attach head details as children of headNode
  headNode.children.push(eyeL, eyeR, cheekL, cheekR, crestL, crestR);
  beadNodes.forEach(b => headNode.children.push(b));

  // ---------------- Final root and assembly ----------------




// 3) Root (head detached for now)
  const rootNode = {
    id: "root",
    transform: makeTransform(),
    children: [ torsoNode, torsoNode2, headNode,
                foreL, foreR, hindL, hindR, tailPivot ]
  };

  // slight global pose tweaks
  foreL.transform.rotation = foreL.transform.rotation || [0,0,0];
  foreR.transform.rotation = foreR.transform.rotation || [0,0,0];
  tailPivot.transform.rotation = tailPivot.transform.rotation || [0,0,0];


  // Build the universal band once (works with any TRS you set above)
// const bandGeo = generateBlendBandRobust(
//   torsoDims, torsoT,
//   headDims,  headT,
//   { segments: 96, inflate: 0.012, color: torsoColor }
// );
// const bandMesh = createMesh(GL, bandGeo);
// const bandNode = {
//   id: "fuseBand",
//   mesh: bandMesh,
//   geom: { type: "blendBand" },
//   transform: makeTransform(0,0,0),
//   children: []
// };
// rootNode.children.push(bandNode);

  // Make head a child of torso so it stays attached
  //torsoNode.children.push(headNode);

   //const rootNode = { id: "root", transform: makeTransform(), children: [torsoNode] };


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

// y-based squash/stretch along local Y
function squashStretchY(interleaved, b, opts = {}) {
  const kTop = opts.kTop ?? 0.0;     // +0.2 => +20% at the very top only
  const kBottom = opts.kBottom ?? 0; // +0.2 => -20% at the very bottom only
  const power = opts.power ?? 1.0;   // >1 makes the effect concentrate near tips
  const preserveVolume = opts.preserveVolume ?? false;

  for (let i = 0; i < interleaved.length; i += 6) {
    const x = interleaved[i];
    const y = interleaved[i + 1];
    const z = interleaved[i + 2];

    const t = Math.max(-1, Math.min(1, y / b)); // normalize to [-1, 1]
    const wTop = t > 0 ? Math.pow(t, power) : 0;
    const wBot = t < 0 ? Math.pow(-t, power) : 0;

    const sy = 1 + kTop * wTop - kBottom * wBot; // top stretches, bottom squashes
    let sx = 1,
      sz = 1;
    if (preserveVolume) {
      const v = 1 / Math.sqrt(Math.max(0.0001, sy)); // crude volume comp
      sx = v;
      sz = v;
    }

    interleaved[i] = x * sx;
    interleaved[i + 1] = y * sy;
    interleaved[i + 2] = z * sz;
  }
}

// optional: taper XZ (make top/bottom wider/narrower) without changing Y
function taperXZ(interleaved, b, opts = {}) {
  const top = opts.top ?? 0.0;       // +0.1 => +10% wider at top
  const bottom = opts.bottom ?? 0.0; // +0.1 => +10% wider at bottom
  const power = opts.power ?? 1.0;

  for (let i = 0; i < interleaved.length; i += 6) {
    const y = interleaved[i + 1];
    const t = Math.max(-1, Math.min(1, y / b));
    const wTop = t > 0 ? Math.pow(t, power) : 0;
    const wBot = t < 0 ? Math.pow(-t, power) : 0;
    const s = 1 + top * wTop + bottom * wBot;

    interleaved[i] *= s;     // X
    interleaved[i + 2] *= s; // Z
  }
}

// Stretch Y based on Z position (back/front). Works on interleaved [x,y,z,r,g,b].
function stretchYByZ(interleaved, c, opts = {}) {
  const back = opts.back ?? 0.0;     // +0.2 => +20% taller at the very back (z = +c)
  const front = opts.front ?? 0.0;   // +0.2 => +20% taller at the very front (z = -c)
  const power = opts.power ?? 1.0;   // falloff sharpness
  const preserveVolume = opts.preserveVolume ?? false;

  for (let i = 0; i < interleaved.length; i += 6) {
    const x = interleaved[i + 0];
    const y = interleaved[i + 1];
    const z = interleaved[i + 2];

    const zn = Math.max(-1, Math.min(1, z / c)); // [-1 .. 1]
    const wBack = zn > 0 ? Math.pow(zn, power) : 0;
    const wFront = zn < 0 ? Math.pow(-zn, power) : 0;

    const sy = 1 + back * wBack + front * wFront;

    let sx = 1, sz = 1;
    if (preserveVolume) {
      const v = 1 / Math.sqrt(Math.max(0.0001, sy));
      sx = v; sz = v;
    }

    interleaved[i + 0] = x * sx;
    interleaved[i + 1] = y * sy;
    interleaved[i + 2] = z * sz;
  }
}

// Stretch only the TOP half, and only toward the back
function stretchBackTopY(interleaved, b, c, opts = {}) {
  const k = opts.k ?? 0.2;           // amount at very back-top
  const powerZ = opts.powerZ ?? 1.4; // back falloff sharpness
  const powerY = opts.powerY ?? 1.2; // top falloff sharpness
  const preserveVolume = opts.preserveVolume ?? false;

  for (let i = 0; i < interleaved.length; i += 6) {
    const x = interleaved[i + 0];
    const y = interleaved[i + 1];
    const z = interleaved[i + 2];

    const zn = Math.max(-1, Math.min(1, z / c)); // back = +1 (assuming head at negative Z)
    const yn = Math.max(-1, Math.min(1, y / b)); // top = +1
    const wZ = zn > 0 ? Math.pow(zn, powerZ) : 0; // only back
    const wY = yn > 0 ? Math.pow(yn, powerY) : 0; // only top
    const sy = 1 + k * (wZ * wY);

    let sx = 1, sz = 1;
    if (preserveVolume) {
      const v = 1 / Math.sqrt(Math.max(0.0001, sy));
      sx = v; sz = v;
    }

    interleaved[i + 0] = x * sx;
    interleaved[i + 1] = y * sy;
    interleaved[i + 2] = z * sz;
  }
}



// apply TRS (same order as drawNode: S -> Rx -> Ry -> Rz -> T)
function transformPointTRS(p, T) {
  let x = p[0] * T.scale[0];
  let y = p[1] * T.scale[1];
  let z = p[2] * T.scale[2];

  // Rx
  const cx = Math.cos(T.rotation[0]), sx = Math.sin(T.rotation[0]);
  let y1 = y * cx - z * sx;
  let z1 = y * sx + z * cx;
  y = y1; z = z1;

  // Ry
  const cy = Math.cos(T.rotation[1]), sy = Math.sin(T.rotation[1]);
  let x2 = x * cy + z * sy;
  let z2 = -x * sy + z * cy;
  x = x2; z = z2;

  // Rz
  const cz = Math.cos(T.rotation[2]), sz = Math.sin(T.rotation[2]);
  let x3 = x * cz - y * sz;
  let y3 = x * sz + y * cz;
  x = x3; y = y3;

  // T
  x += T.position[0];
  y += T.position[1];
  z += T.position[2];
  return [x, y, z];
}

// ellipse radii of an ellipsoid slice at z0 (in that ellipsoid's local space)
function sliceRadiiAtZ(a, b, c, z0) {
  const t = 1 - (z0 * z0) / (c * c);
  const s = t > 0 ? Math.sqrt(t) : 0;
  return [a * s, b * s];
}

// Build a band bridging a torso slice at zTorso and a head slice at zHead
function generateBlendBand(torsoDims, torsoT, headDims, headT, opts = {}) {
  const seg = opts.segments ?? 64;
  const zTorso = opts.zTorso ?? -0.9; // front side of torso (head is at -Z)
  const zHead = opts.zHead ?? +0.5;   // back side of head (toward torso)
  const color = opts.color ?? [0.15, 0.35, 0.85];

  const verts = [];
  const faces = [];

  // precompute radii
  const [rtx, rty] = sliceRadiiAtZ(
    torsoDims.a, torsoDims.b, torsoDims.c, zTorso
  );
  const [rhx, rhy] = sliceRadiiAtZ(
    headDims.a, headDims.b, headDims.c, zHead
  );

  // two rings: ring 0 = torso, ring 1 = head
  const ringTorso = [];
  const ringHead = [];

  for (let i = 0; i <= seg; i++) {
    const u = (i / seg) * 2 * Math.PI;
    const cu = Math.cos(u), su = Math.sin(u);

    // torso local point on slice
    const ptT = [rtx * cu, rty * su, zTorso];
    // head local point on slice (its back side)
    const ptH = [rhx * cu, rhy * su, zHead];

    // to world (root) via TRS
    const pTw = transformPointTRS(ptT, torsoT);
    const pHw = transformPointTRS(ptH, headT);

    ringTorso.push(pTw);
    ringHead.push(pHw);
  }

  // interleave as one vertex array: first torso ring, then head ring
  for (let i = 0; i <= seg; i++) {
    const p = ringTorso[i];
    verts.push(p[0], p[1], p[2], color[0], color[1], color[2]);
  }
  const offsetHead = verts.length / 6;
  for (let i = 0; i <= seg; i++) {
    const p = ringHead[i];
    verts.push(p[0], p[1], p[2], color[0], color[1], color[2]);
  }

  // connect quads between the two rings
  for (let i = 0; i < seg; i++) {
    const a = i;
    const b = i + 1;
    const c = offsetHead + i;
    const d = offsetHead + i + 1;
    // two triangles: a-b-d and a-d-c
    faces.push(a, b, d, a, d, c);
  }

  return { vertices: verts, faces };
}

// ---------- TRS helpers (inverse) ----------
function worldToLocalPoint(pw, T) {
  // subtract translation
  let x = pw[0] - T.position[0];
  let y = pw[1] - T.position[1];
  let z = pw[2] - T.position[2];
  // inverse Rz, Ry, Rx (reverse order of application)
  const cz = Math.cos(-T.rotation[2]),
    sz = Math.sin(-T.rotation[2]);
  let x1 = x * cz - y * sz,
    y1 = x * sz + y * cz;
  x = x1;
  y = y1;

  const cy = Math.cos(-T.rotation[1]),
    sy = Math.sin(-T.rotation[1]);
  let x2 = x * cy + z * sy,
    z2 = -x * sy + z * cy;
  x = x2;
  z = z2;

  const cx = Math.cos(-T.rotation[0]),
    sx = Math.sin(-T.rotation[0]);
  let y3 = y * cx - z * sx,
    z3 = y * sx + z * cx;
  y = y3;
  z = z3;

  // inverse scale
  return [x / T.scale[0], y / T.scale[1], z / T.scale[2]];
}

function worldToLocalDir(dw, T) {
  // directions ignore translation; apply inverse Rz,Ry,Rx and inv scale
  let x = dw[0],
    y = dw[1],
    z = dw[2];

  const cz = Math.cos(-T.rotation[2]),
    sz = Math.sin(-T.rotation[2]);
  let x1 = x * cz - y * sz,
    y1 = x * sz + y * cz;
  x = x1;
  y = y1;

  const cy = Math.cos(-T.rotation[1]),
    sy = Math.sin(-T.rotation[1]);
  let x2 = x * cy + z * sy,
    z2 = -x * sy + z * cy;
  x = x2;
  z = z2;

  const cx = Math.cos(-T.rotation[0]),
    sx = Math.sin(-T.rotation[0]);
  let y3 = y * cx - z * sx,
    z3 = y * sx + z * cx;
  y = y3;
  z = z3;

  return [x / T.scale[0], y / T.scale[1], z / T.scale[2]];
}

// line–ellipsoid intersection in LOCAL space of that ellipsoid
// Ellipsoid: (x/a)^2 + (y/b)^2 + (z/c)^2 = 1
// Ray: p(t) = p0 + t * v
function intersectRayEllipsoidLocal(p0, v, a, b, c) {
  const A =
    (v[0] * v[0]) / (a * a) +
    (v[1] * v[1]) / (b * b) +
    (v[2] * v[2]) / (c * c);
  const B =
    (2 * p0[0] * v[0]) / (a * a) +
    (2 * p0[1] * v[1]) / (b * b) +
    (2 * p0[2] * v[2]) / (c * c);
  const C =
    (p0[0] * p0[0]) / (a * a) +
    (p0[1] * p0[1]) / (b * b) +
    (p0[2] * p0[2]) / (c * c) -
    1.0;

  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;
  const sd = Math.sqrt(Math.max(0, disc));
  const t1 = (-B - sd) / (2 * A);
  const t2 = (-B + sd) / (2 * A);
  // we want the intersection nearest to the ray origin (|t| minimum, prefer t>0)
  let cand = [];
  if (Number.isFinite(t1)) cand.push(t1);
  if (Number.isFinite(t2)) cand.push(t2);
  if (cand.length === 0) return null;
  // pick smallest positive; if none positive, pick the one with minimal |t|
  const pos = cand.filter((t) => t > 0).sort((a, b) => a - b);
  if (pos.length > 0) return pos[0];
  cand.sort((a, b) => Math.abs(a) - Math.abs(b));
  return cand[0];
}

function normalize(v) {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
}
function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function scale(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

// Orthonormal basis for plane with normal n
function planeBasis(n) {
  const nN = normalize(n);
  const tmp = Math.abs(nN[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
  const u = normalize(cross(nN, tmp));
  const v = normalize(cross(nN, u));
  return { n: nN, u, v };
}

// Auto-seam: find centers, seam normal, and a mid plane origin
function seamPlane(torsoDims, torsoT, headDims, headT) {
  const CT = torsoT.position;
  const CH = headT.position;
  const n = normalize(sub(CH, CT)); // points from torso -> head

  // find surface points along the center-to-center line
  // torso side
  const p0T_local = [0, 0, 0];
  const vT_local = worldToLocalDir(n, torsoT);
  const tT = intersectRayEllipsoidLocal(
    p0T_local,
    vT_local,
    torsoDims.a,
    torsoDims.b,
    torsoDims.c
  );
  // world point: pos + RS * (v_local * t)
  const pT_world = add(
    torsoT.position,
    (function () {
      // rebuild RS*(v_local*t) using forward rotations/scales
      let x = vT_local[0] * tT * torsoT.scale[0];
      let y = vT_local[1] * tT * torsoT.scale[1];
      let z = vT_local[2] * tT * torsoT.scale[2];
      // Rx
      const cx = Math.cos(torsoT.rotation[0]),
        sx = Math.sin(torsoT.rotation[0]);
      let y1 = y * cx - z * sx,
        z1 = y * sx + z * cx;
      y = y1;
      z = z1;
      // Ry
      const cy = Math.cos(torsoT.rotation[1]),
        sy = Math.sin(torsoT.rotation[1]);
      let x2 = x * cy + z * sy,
        z2 = -x * sy + z * cy;
      x = x2;
      z = z2;
      // Rz
      const cz = Math.cos(torsoT.rotation[2]),
        sz = Math.sin(torsoT.rotation[2]);
      let x3 = x * cz - y * sz,
        y3 = x * sz + y * cz;
      x = x3;
      y = y3;
      return [x, y, z];
    })()
  );

  // head side (opposite direction)
  const vH_world = scale(n, -1);
  const p0H_local = [0, 0, 0];
  const vH_local = worldToLocalDir(vH_world, headT);
  const tH = intersectRayEllipsoidLocal(
    p0H_local,
    vH_local,
    headDims.a,
    headDims.b,
    headDims.c
  );
  const pH_world = add(
    headT.position,
    (function () {
      let x = vH_local[0] * tH * headT.scale[0];
      let y = vH_local[1] * tH * headT.scale[1];
      let z = vH_local[2] * tH * headT.scale[2];
      const cx = Math.cos(headT.rotation[0]),
        sx = Math.sin(headT.rotation[0]);
      let y1 = y * cx - z * sx,
        z1 = y * sx + z * cx;
      y = y1;
      z = z1;
      const cy = Math.cos(headT.rotation[1]),
        sy = Math.sin(headT.rotation[1]);
      let x2 = x * cy + z * sy,
        z2 = -x * sy + z * cy;
      x = x2;
      z = z2;
      const cz = Math.cos(headT.rotation[2]),
        sz = Math.sin(headT.rotation[2]);
      let x3 = x * cz - y * sz,
        y3 = x * sz + y * cz;
      x = x3;
      y = y3;
      return [x, y, z];
    })()
  );

  const O = scale(add(pT_world, pH_world), 0.5); // plane origin midway
  return { O, n };
}

// Ray-plane-based intersection with transformed ellipsoid
function intersectFromPlanePoint(O, s, dims, T) {
  // transform O, s to local of this ellipsoid
  const p0 = worldToLocalPoint(O, T);
  const v = worldToLocalDir(s, T);
  const t = intersectRayEllipsoidLocal(p0, v, dims.a, dims.b, dims.c);
  if (t == null) return null;
  // world point = O + s * t_world; BUT t is in local param.
  // Safer: compute local point and transform forward.
  const pl = [p0[0] + v[0] * t, p0[1] + v[1] * t, p0[2] + v[2] * t];
  return transformPointTRS(pl, T);
}

// Generic, transform-agnostic blend band
function generateBlendBandUniversal(
  torsoDims,
  torsoT,
  headDims,
  headT,
  opts = {}
) {
  const seg = opts.segments ?? 96;
  const inflate = opts.inflate ?? 0.01; // push out to avoid z-fighting
  const color = opts.color ?? [0.15, 0.35, 0.85];

  const { O, n } = seamPlane(torsoDims, torsoT, headDims, headT);
  const { u, v } = planeBasis(n);

  const verts = [];
  const faces = [];

  const ringT = [];
  const ringH = [];

  for (let i = 0; i <= seg; i++) {
    const phi = (i / seg) * 2 * Math.PI;
    const s = normalize(
      add(scale(u, Math.cos(phi)), scale(v, Math.sin(phi)))
    );

    const pT = intersectFromPlanePoint(O, s, torsoDims, torsoT);
    const pH = intersectFromPlanePoint(O, s, headDims, headT);
    if (!pT || !pH) {
      // fallback: duplicate previous to keep indexing valid
      const lastT = ringT.length ? ringT[ringT.length - 1] : O;
      const lastH = ringH.length ? ringH[ringH.length - 1] : O;
      ringT.push(lastT);
      ringH.push(lastH);
      continue;
    }

    // inflate outward from O along s to avoid z-fighting
    ringT.push(add(pT, scale(s, inflate)));
    ringH.push(add(pH, scale(s, inflate)));
  }

  for (let i = 0; i <= seg; i++) {
    const p = ringT[i];
    verts.push(p[0], p[1], p[2], color[0], color[1], color[2]);
  }
  const offH = verts.length / 6;
  for (let i = 0; i <= seg; i++) {
    const p = ringH[i];
    verts.push(p[0], p[1], p[2], color[0], color[1], color[2]);
  }

  for (let i = 0; i < seg; i++) {
    const a = i;
    const b = i + 1;
    const c = offH + i;
    const d = offH + i + 1;
    faces.push(a, b, d, a, d, c);
  }

  return { vertices: verts, faces };
}

function normalize(v){const m=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/m,v[1]/m,v[2]/m];}
function add(a,b){return [a[0]+b[0],a[1]+b[1],a[2]+b[2]];}
function sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function scale(v,s){return [v[0]*s,v[1]*s,v[2]*s];}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function planeBasis(n){const nn=normalize(n);const tmp=Math.abs(nn[1])<0.99?[0,1,0]:[1,0,0];const u=normalize(cross(nn,tmp));const v=normalize(cross(nn,u));return {n:nn,u,v};}

// forward dir (RS only)
function transformDirTRS(d,T){
  let x=d[0]*T.scale[0], y=d[1]*T.scale[1], z=d[2]*T.scale[2];
  const cx=Math.cos(T.rotation[0]), sx=Math.sin(T.rotation[0]);
  let y1=y*cx - z*sx, z1=y*sx + z*cx; y=y1; z=z1;
  const cy=Math.cos(T.rotation[1]), sy=Math.sin(T.rotation[1]);
  let x2=x*cy + z*sy, z2=-x*sy + z*cy; x=x2; z=z2;
  const cz=Math.cos(T.rotation[2]), sz=Math.sin(T.rotation[2]);
  let x3=x*cz - y*sz, y3=x*sz + y*cz; x=x3; y=y3;
  return [x,y,z];
}

// inverse TRS
function worldToLocalPoint(pw,T){
  let x=pw[0]-T.position[0], y=pw[1]-T.position[1], z=pw[2]-T.position[2];
  const cz=Math.cos(-T.rotation[2]), sz=Math.sin(-T.rotation[2]);
  let x1=x*cz - y*sz, y1=x*sz + y*cz; x=x1; y=y1;
  const cy=Math.cos(-T.rotation[1]), sy=Math.sin(-T.rotation[1]);
  let x2=x*cy + z*sy, z2=-x*sy + z*cy; x=x2; z=z2;
  const cx=Math.cos(-T.rotation[0]), sx=Math.sin(-T.rotation[0]);
  let y3=y*cx - z*sx, z3=y*sx + z*cx; y=y3; z=z3;
  return [x/T.scale[0], y/T.scale[1], z/T.scale[2]];
}
function worldToLocalDir(dw,T){
  let x=dw[0], y=dw[1], z=dw[2];
  const cz=Math.cos(-T.rotation[2]), sz=Math.sin(-T.rotation[2]);
  let x1=x*cz - y*sz, y1=x*sz + y*cz; x=x1; y=y1;
  const cy=Math.cos(-T.rotation[1]), sy=Math.sin(-T.rotation[1]);
  let x2=x*cy + z*sy, z2=-x*sy + z*cy; x=x2; z=z2;
  const cx=Math.cos(-T.rotation[0]), sx=Math.sin(-T.rotation[0]);
  let y3=y*cx - z*sx, z3=y*sx + z*cx; y=y3; z=z3;
  return [x/T.scale[0], y/T.scale[1], z/T.scale[2]];
}

function transformPointTRS(p,T){
  let x=p[0]*T.scale[0], y=p[1]*T.scale[1], z=p[2]*T.scale[2];
  const cx=Math.cos(T.rotation[0]), sx=Math.sin(T.rotation[0]);
  let y1=y*cx - z*sx, z1=y*sx + z*cx; y=y1; z=z1;
  const cy=Math.cos(T.rotation[1]), sy=Math.sin(T.rotation[1]);
  let x2=x*cy + z*sy, z2=-x*sy + z*cy; x=x2; z=z2;
  const cz=Math.cos(T.rotation[2]), sz=Math.sin(T.rotation[2]);
  let x3=x*cz - y*sz, y3=x*sz + y*cz; x=x3; y=y3;
  return [x+T.position[0], y+T.position[1], z+T.position[2]];
}

// quadratic roots for ray–ellipsoid in local space
function rayEllipsoidRoots(p0,v,a,b,c){
  const A=(v[0]*v[0])/(a*a)+(v[1]*v[1])/(b*b)+(v[2]*v[2])/(c*c);
  const B=2*((p0[0]*v[0])/(a*a)+(p0[1]*v[1])/(b*b)+(p0[2]*v[2])/(c*c));
  const C=(p0[0]*p0[0])/(a*a)+(p0[1]*p0[1])/(b*b)+(p0[2]*p0[2])/(c*c)-1;
  const D=B*B-4*A*C; if(D<0) return null;
  const s=Math.sqrt(Math.max(0,D)); const t1=(-B-s)/(2*A); const t2=(-B+s)/(2*A);
  return [t1,t2]; // usually symmetric about center when starting at ellipse center
}

// auto seam plane from center line
function seamPlane(tDims, torsoT, hDims, headT) {
  const CT = torsoT.position;
  const CH = headT.position;
  const n = normalize(sub(CH, CT)); // torso -> head

  // torso side
  const vT_local = worldToLocalDir(n, torsoT);
  const rootsT = rayEllipsoidRoots([0, 0, 0], vT_local, tDims.a, tDims.b, tDims.c);
  const tTor = rootsT ? Math.min(Math.abs(rootsT[0]), Math.abs(rootsT[1])) : 0;
  const pT = transformPointTRS(
    [vT_local[0] * tTor, vT_local[1] * tTor, vT_local[2] * tTor],
    torsoT
  );

  // head side (opposite direction)
  const vH_local = worldToLocalDir(scale(n, -1), headT);
  const rootsH = rayEllipsoidRoots([0, 0, 0], vH_local, hDims.a, hDims.b, hDims.c);
  const tHdr = rootsH ? Math.min(Math.abs(rootsH[0]), Math.abs(rootsH[1])) : 0;
  const pH = transformPointTRS(
    [vH_local[0] * tHdr, vH_local[1] * tHdr, vH_local[2] * tHdr],
    headT
  );

  const O = scale(add(pT, pH), 0.5); // plane origin at the midpoint
  return { O, n };
}

// robust ring of intersection between plane (O,n) and ellipsoid (dims,T)
function ringOnPlaneEllipsoid(dims,T,O,n,segments){
  // plane in local
  let nL=worldToLocalDir(n,T); nL=normalize(nL);
  const OL=worldToLocalPoint(O,T);
  const dL = nL[0]*OL[0] + nL[1]*OL[1] + nL[2]*OL[2];

  // ellipse center on plane: x0 = A^-1 n * (d / (n^T A^-1 n)), A^-1=diag(a^2,b^2,c^2)
  const Ainvn=[dims.a*dims.a*nL[0], dims.b*dims.b*nL[1], dims.c*dims.c*nL[2]];
  const denom = nL[0]*Ainvn[0] + nL[1]*Ainvn[1] + nL[2]*Ainvn[2] || 1;
  const x0L = scale(Ainvn, dL/denom);

  // in-plane basis in local
  const tmp = Math.abs(nL[1])<0.99 ? [0,1,0] : [1,0,0];
  const uL = normalize(cross(nL,tmp));
  const vL = normalize(cross(nL,uL));

  const pts = [];
  for(let i=0;i<=segments;i++){
    const phi = (i/segments)*2*Math.PI;
    let sL = normalize(add(scale(uL,Math.cos(phi)), scale(vL,Math.sin(phi))));
    const roots = rayEllipsoidRoots(x0L, sL, dims.a, dims.b, dims.c);
    if(!roots){ pts.push(transformPointTRS(x0L,T)); continue; }
    // choose farther boundary from center |t| max
    const t = Math.abs(roots[0]) > Math.abs(roots[1]) ? roots[0] : roots[1];
    const pL = [x0L[0]+sL[0]*t, x0L[1]+sL[1]*t, x0L[2]+sL[2]*t];
    pts.push(transformPointTRS(pL,T));
  }
  return pts;
}

function generateBlendBandRobust(tDims,tT,hDims,hT,opts={}){
  const seg=opts.segments??96;
  const inflate=opts.inflate??0.01;
  const color=opts.color??[0.15,0.35,0.85];

  const {O,n}=seamPlane(tDims,tT,hDims,hT);
  const basis = planeBasis(n); // for inflate dir only

  const ringT = ringOnPlaneEllipsoid(tDims,tT,O,n,seg);
  const ringH = ringOnPlaneEllipsoid(hDims,hT,O,n,seg);

  const verts=[]; const faces=[];
  for(let i=0;i<=seg;i++){
    const phi=(i/seg)*2*Math.PI;
    const sW = normalize(add(scale(basis.u,Math.cos(phi)), scale(basis.v,Math.sin(phi))));
    const p = add(ringT[i], scale(sW, inflate));
    verts.push(p[0],p[1],p[2], color[0],color[1],color[2]);
  }
  const offH = verts.length/6;
  for(let i=0;i<=seg;i++){
    const phi=(i/seg)*2*Math.PI;
    const sW = normalize(add(scale(basis.u,Math.cos(phi)), scale(basis.v,Math.sin(phi))));
    const p = add(ringH[i], scale(sW, inflate));
    verts.push(p[0],p[1],p[2], color[0],color[1],color[2]);
  }
  for(let i=0;i<seg;i++){
    const a=i, b=i+1, c=offH+i, d=offH+i+1;
    faces.push(a,b,d, a,d,c);
  }
  return {vertices:verts, faces};
}

// Frustum/cone (z from 0..h). rTop can be 0 for a sharp cone.
function generateCone(rTop, rBottom, h, seg = 48) {
  const verts = [], faces = [];
  for (let i = 0; i <= seg; i++) {
    const u = (i / seg) * 2 * Math.PI;
    const cu = Math.cos(u), su = Math.sin(u);
    // bottom ring (z=0)
    verts.push(rBottom * cu, rBottom * su, 0, 1, 0.5, 0); // color placeholder
    // top ring (z=h)
    verts.push(rTop * cu, rTop * su, h, 1, 0.5, 0);
  }
  for (let i = 0; i < seg; i++) {
    const a = 2 * i;
    const b = a + 2;
    const c = a + 1;
    const d = b + 1;
    faces.push(a, b, d, a, d, c); // side quad
  }
  // cap bottom (optional)
  for (let i = 1; i < seg - 1; i++) faces.push(0, 2 * i, 2 * (i + 1));
  // cap top if rTop > 0
  if (rTop > 0) {
    const base = 1;
    for (let i = 1; i < seg - 1; i++) faces.push(base, 2 * (i + 1) + 1, 2 * i + 1);
  }
  return { vertices: verts, faces };
}

// Elliptical “pad” (just ellipsoid you already have) helper color override
function tint(interleaved, r, g, b) {
  for (let i = 0; i < interleaved.length; i += 6) {
    interleaved[i + 3] = r; interleaved[i + 4] = g; interleaved[i + 5] = b;
  }
}


// Ellipsoid half along X axis (side: +1 => x>=0, -1 => x<=0), open at x=0
function generateEllipsoidHalfX(
  a = 0.6,
  b = 0.45,
  c = 0.4,
  stacks = 24,
  sectorsHalf = 48,
  side = +1
) {
  const vertices = [];
  const faces = [];
  // u in [-pi/2, pi/2] (latitude), v spans half circle in X
  const vStart = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  const vEnd = side > 0 ? Math.PI / 2 : (3 * Math.PI) / 2;

  for (let i = 0; i <= stacks; i++) {
    const u = -Math.PI / 2 + (i / stacks) * Math.PI;
    const cu = Math.cos(u);
    const su = Math.sin(u);
    for (let j = 0; j <= sectorsHalf; j++) {
      const v = vStart + (j / sectorsHalf) * (vEnd - vStart);
      const cv = Math.cos(v);
      const sv = Math.sin(v);
      const x = a * cv * cu;
      const y = b * su;
      const z = c * sv * cu;
      // color placeholder; will tint later
      vertices.push(x, y, z, 1, 0.5, 0.15);
    }
  }
  const cols = sectorsHalf + 1;
  for (let i = 0; i < stacks; i++) {
    for (let j = 0; j < sectorsHalf; j++) {
      const a0 = i * cols + j;
      const a1 = a0 + 1;
      const b0 = a0 + cols;
      const b1 = b0 + 1;
      faces.push(a0, a1, b1, a0, b1, b0);
    }
  }
  return { vertices, faces };
}

// Cylinder along X (elliptical cross-section ry, rz), with end caps
function generateCylinderX(ry = 0.45, rz = 0.35, len = 1.4, seg = 64, caps = true) {
  const vertices = [];
  const faces = [];
  const x0 = -len / 2;
  const x1 = +len / 2;

  // side vertices: for each angle, two x-slices
  for (let i = 0; i <= seg; i++) {
    const t = (i / seg) * 2 * Math.PI;
    const y = ry * Math.cos(t);
    const z = rz * Math.sin(t);
    // left ring (x0)
    vertices.push(x0, y, z, 1, 0.5, 0.15);
    // right ring (x1)
    vertices.push(x1, y, z, 1, 0.5, 0.15);
  }
  // side indices
  for (let i = 0; i < seg; i++) {
    const a = 2 * i;
    const b = a + 2;
    const c = a + 1;
    const d = b + 1;
    faces.push(a, b, d, a, d, c);
  }

  if (caps) {
    // centers
    const idxCenterL = vertices.length / 6;
    vertices.push(x0, 0, 0, 1, 0.5, 0.15);
    const idxCenterR = idxCenterL + 1;
    vertices.push(x1, 0, 0, 1, 0.5, 0.15);

    // left cap
    for (let i = 0; i < seg; i++) {
      const a = 2 * i;
      const b = 2 * ((i + 1) % seg);
      faces.push(idxCenterL, b, a);
    }
    // right cap
    for (let i = 0; i < seg; i++) {
      const a = 2 * i + 1;
      const b = 2 * ((i + 1) % seg) + 1;
      faces.push(idxCenterR, a, b);
    }
  }
  return { vertices, faces };
}

// color utility
function tint(interleaved, r, g, b) {
  for (let i = 0; i < interleaved.length; i += 6) {
    interleaved[i + 3] = r;
    interleaved[i + 4] = g;
    interleaved[i + 5] = b;
  }
}


function createShoulderPad(gl, params, color) {
  const {
    padLen, padRy, padRz,           // cylinder length and radii (Y,Z)
    capAx, capBy, capCz,            // half-ellipsoid radii (X,Y,Z)
    segCyl = 64, segEll = 48
  } = params;

  // geometry
  const cylGeo = generateCylinderX(padRy, padRz, padLen, segCyl, true);
  tint(cylGeo.vertices, ...color);
  const capLGeo = generateEllipsoidHalfX(capAx, capBy, capCz, 24, segEll, -1);
  tint(capLGeo.vertices, ...color);
  const capRGeo = generateEllipsoidHalfX(capAx, capBy, capCz, 24, segEll, +1);
  tint(capRGeo.vertices, ...color);

  // meshes
  const cylMesh  = createMesh(gl, cylGeo);
  const capLMesh = createMesh(gl, capLGeo);
  const capRMesh = createMesh(gl, capRGeo);

  // nodes
  const group = { id: "shoulderPad", mesh: null, geom: null,
                  transform: makeTransform(0, 0, 0), children: [] };

  const cylNode  = { id: "padCyl", mesh: cylMesh,  geom: null,
                     transform: makeTransform(0, 0, 0), children: [] };
  const capLNode = { id: "padCapL", mesh: capLMesh, geom: null,
                     transform: makeTransform(-padLen / 2, 0, 0), children: [] };
  const capRNode = { id: "padCapR", mesh: capRMesh, geom: null,
                     transform: makeTransform( padLen / 2, 0, 0), children: [] };

  group.children.push(cylNode, capLNode, capRNode);
  return group;
}

