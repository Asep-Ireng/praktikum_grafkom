import { LIBS } from "./libs.js";
import { ellipsoid } from "./ellipsoid.js";
import { lingkaran } from "./lingkaran-setengah.js";
import { group } from "./group.js";
import { mudkipLeg } from "./mudkip-leg.js";
import { mudkipBody } from "./mudkip-body.js";

function main() {
  /** @type {HTMLCanvasElement} */
  var CANVAS = document.getElementById("mycanvas");
  CANVAS.width = window.innerWidth;
  CANVAS.height = window.innerHeight;

  /*===================== GET WEBGL CONTEXT ===================== */
  /** @type {WebGLRenderingContext} */
  var GL;
  try {
    GL = CANVAS.getContext("webgl", { antialias: true });
  } catch (e) {
    alert("WebGL context cannot be initialized");
    return false;
  }

  /*========================= SHADERS ========================= */
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

  var compile_shader = function (source, type, typeString) {
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
  };
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

  var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
  GL.enableVertexAttribArray(_position);

  var _color = GL.getAttribLocation(SHADER_PROGRAM, "color");
  GL.enableVertexAttribArray(_color);

  var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
  var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
  var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");

  GL.useProgram(SHADER_PROGRAM);

  const Kepala = new ellipsoid(
    GL,
    SHADER_PROGRAM,
    _position,
    _color,
    _Mmatrix,
    {
      rx: 1.6,
      ry: 1.4,
      rz: 1.7, // agak bulat
      segments: 48,
      rings: 32,
      color: [123 / 255, 206 / 255, 239 / 255], // biru muda
    }
  );

  LIBS.set_I4(Kepala.POSITION_MATRIX);
  LIBS.translateY(Kepala.POSITION_MATRIX, 1.4); // tinggi kepala
  LIBS.translateZ(Kepala.POSITION_MATRIX, 1.1); // “nempel” ke depan badan
  LIBS.set_I4(Kepala.MOVE_MATRIX);
  LIBS.rotateX(Kepala.MOVE_MATRIX, 0.08);

  // Kita juga terapkan rotasi agar kepala "duduk" dengan benar di badan yang miring

  // Pipi kanan (orange)
  const PipiKanan = new ellipsoid(
    GL,
    SHADER_PROGRAM,
    _position,
    _color,
    _Mmatrix,
    {
      rx: 0.6,
      ry: 0.8,
      rz: 0.8, // lebih lonjong
      segments: 36,
      rings: 24,
      color: [255 / 255, 173 / 255, 66 / 255], // oranye (kuning dulu)
    }
  );
  LIBS.translateX(PipiKanan.POSITION_MATRIX, 1.1);
  LIBS.translateY(PipiKanan.POSITION_MATRIX, -0.1);

  // Pipi kiri (mirror)
  const PipiKiri = new ellipsoid(
    GL,
    SHADER_PROGRAM,
    _position,
    _color,
    _Mmatrix,
    {
      rx: 0.6,
      ry: 0.8,
      rz: 0.8,
      segments: 36,
      rings: 24,
      color: [255 / 255, 173 / 255, 66 / 255],
    }
  );
  LIBS.translateX(PipiKiri.POSITION_MATRIX, -1.1);
  LIBS.translateY(PipiKiri.POSITION_MATRIX, -0.1);

  // Bagian bawah kepala (putih, setengah ellipsoid)
  const eps = 0.01; // ~0.6°
  const Dagu = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _Mmatrix, {
    rx: 1.6,
    ry: 1.4,
    rz: 1.82,
    segments: 64,
    rings: 32,
    color: [198 / 255, 222 / 255, 247 / 255],
    phiStart: -Math.PI / 2,
    phiEnd: -Math.PI / 17, // <— bukan 0, sedikit di bawah ekuator
    thetaStart: 0,
    thetaEnd: Math.PI,
  });

  // kecilkan dikit & geser sangat kecil agar tidak z-fighting
  LIBS.translateY(Dagu.POSITION_MATRIX, -0.02);
  LIBS.translateZ(Dagu.POSITION_MATRIX, -0.06);

  // ==== MATA KIRI (putih di kiri-atas, abu2 di kanan-bawah) ====
  const EyeL = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _Mmatrix, {
    rx: 0.18,
    ry: 0.26,
    rz: 0.15,
    segments: 36,
    rings: 24,
    color: [0.02, 0.02, 0.02],
  });
  LIBS.translateX(EyeL.POSITION_MATRIX, -0.58);
  LIBS.translateY(EyeL.POSITION_MATRIX, 0.15);
  LIBS.translateZ(EyeL.POSITION_MATRIX, 1.5);
  LIBS.scale(EyeL.POSITION_MATRIX, 1.0, 1.05, 0.95);
  LIBS.rotateY(EyeL.POSITION_MATRIX, +0.08); // rotasi bola mata (opsional)

  // — highlight putih: KIRI-ATAS —
  const EyeL_Hi = new ellipsoid(
    GL,
    SHADER_PROGRAM,
    _position,
    _color,
    _Mmatrix,
    {
      rx: 0.08,
      ry: 0.108,
      rz: 0.05,
      color: [1, 1, 1],
    }
  );
  LIBS.translateX(EyeL_Hi.POSITION_MATRIX, -0.06); // kiri
  LIBS.translateY(EyeL_Hi.POSITION_MATRIX, +0.09); // atas
  LIBS.translateZ(EyeL_Hi.POSITION_MATRIX, +0.1); // keluar dikit
  LIBS.rotateZ(EyeL_Hi.POSITION_MATRIX, -0.12); // sedikit miring

  // — sheen abu-abu: KANAN-BAWAH —
  const EyeL_Sh = new ellipsoid(
    GL,
    SHADER_PROGRAM,
    _position,
    _color,
    _Mmatrix,
    {
      rx: 0.07,
      ry: 0.11,
      rz: 0.05,
      color: [107 / 255, 86 / 255, 96 / 255],
    }
  );
  LIBS.translateX(EyeL_Sh.POSITION_MATRIX, +0.008); // kanan
  LIBS.translateY(EyeL_Sh.POSITION_MATRIX, -0.07); // bawah
  LIBS.translateZ(EyeL_Sh.POSITION_MATRIX, +0.11); // keluar dikit
  LIBS.scale(EyeL_Sh.POSITION_MATRIX, 1.1, 0.85, 1.0); // pipihkan
  LIBS.rotateZ(EyeL_Sh.POSITION_MATRIX, -0.3); // tilt ke bawah-kanan

  EyeL.childs.push(EyeL_Hi);
  EyeL.childs.push(EyeL_Sh);

  // ===== Mata kanan (mirror X dari kiri) =====
  const EyeR = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _Mmatrix, {
    rx: 0.18,
    ry: 0.26,
    rz: 0.15,
    segments: 36,
    rings: 24,
    color: [0.02, 0.02, 0.02],
  });
  LIBS.translateX(EyeR.POSITION_MATRIX, 0.58);
  LIBS.translateY(EyeR.POSITION_MATRIX, 0.15);
  LIBS.translateZ(EyeR.POSITION_MATRIX, 1.5);

  // BAGIAN PUTIH
  const EyeR_Hi = new ellipsoid(
    GL,
    SHADER_PROGRAM,
    _position,
    _color,
    _Mmatrix,
    {
      rx: 0.08,
      ry: 0.13,
      rz: 0.05,
      color: [1, 1, 1],
    }
  );
  LIBS.translateX(EyeR_Hi.POSITION_MATRIX, -0.01); // tetap “kiri-atas” relatif mata (jadi arah kiri lokal)
  LIBS.translateY(EyeR_Hi.POSITION_MATRIX, 0.08);
  LIBS.translateZ(EyeR_Hi.POSITION_MATRIX, 0.11);
  LIBS.rotateY(EyeR.POSITION_MATRIX, -0.08);

  // BAGIAN ABU-ABU
  // Abu-abu di UJUNG KANAN mata kanan
  const EyeR_Sh = new ellipsoid(
    GL,
    SHADER_PROGRAM,
    _position,
    _color,
    _Mmatrix,
    {
      rx: 0.08,
      ry: 0.1,
      rz: 0.05, // sama seperti kiri (boleh tweak kecil)
      color: [107 / 255, 86 / 255, 96 / 255],
    }
  );

  // Dorong ke kanan, agak turun, dan sedikit keluar
  LIBS.translateX(EyeR_Sh.POSITION_MATRIX, +0.07); // >> geser ke tepi kanan
  LIBS.translateY(EyeR_Sh.POSITION_MATRIX, -0.06); // sedikit ke bawah
  LIBS.translateZ(EyeR_Sh.POSITION_MATRIX, +0.095); // keluar dikit biar tidak tembus

  // Biar bentuknya “oval nempel tepi”, pipihkan & putar sedikit
  LIBS.scale(EyeR_Sh.POSITION_MATRIX, 1.1, 0.85, 1.0);
  LIBS.rotateZ(EyeR_Sh.POSITION_MATRIX, -0.3);

  EyeR.childs.push(EyeR_Hi);
  EyeR.childs.push(EyeR_Sh);

  const BODY_COLOR = [123 / 255, 190 / 255, 239 / 255];
  const BELLY_COLOR = [198 / 255, 222 / 255, 247 / 255];

  const BODY_CONFIG = {
    rx: 1.45,
    ry: 1.12,
    rz: 1.85,
    flattenStartPhi: -0.22,
    flattenStrength: 0.5,
    flattenPlaneRatio: 0.88,
    flattenSharpness: 1.35,
    flattenLateralTaper: 0.16,
  };

  const BELLY_REGION = {
    upperOffset: 0.32,
    halfWidthRatio: 0.6,
    halfLengthRatio: 0.8,
    taper: 0.45,
  };

  // === Badan utama ===
  const Badan = new mudkipBody(
    GL,
    SHADER_PROGRAM,
    _position,
    _color,
    _Mmatrix,
    {
      ...BODY_CONFIG,
      color: BODY_COLOR,
      vertexColor: ({ x, y, z }) => {
        const limitZ = BODY_CONFIG.rz * BELLY_REGION.halfLengthRatio;
        const absZ = Math.abs(z);
        if (absZ > limitZ) {
          return null;
        }

        const bellyPlaneY = -BODY_CONFIG.ry * BODY_CONFIG.flattenPlaneRatio;
        const bellyUpperY = bellyPlaneY + BELLY_REGION.upperOffset;
        const verticalFactor = Math.max(0, Math.min(1, (bellyUpperY - y) / BELLY_REGION.upperOffset));
        if (verticalFactor <= 0) {
          return null;
        }

        const zFactor = absZ / limitZ;
        const adaptiveWidth =
          BODY_CONFIG.rx * BELLY_REGION.halfWidthRatio * (1 - BELLY_REGION.taper * zFactor);

        if (Math.abs(x) > adaptiveWidth) {
          return null;
        }

        return BELLY_COLOR;
      },
    }
  );
  LIBS.set_I4(Badan.POSITION_MATRIX);
  LIBS.translateY(Badan.POSITION_MATRIX, -0.05);
  LIBS.translateZ(Badan.POSITION_MATRIX, -0.25);
  LIBS.rotateX(Badan.POSITION_MATRIX, -0.06);

  // === KAKI (custom mudkipLeg) ===
  const LEG_COLOR = [123 / 255, 190 / 255, 239 / 255];
  const LEG_CONFIG = {
    height: 0.96,
    topOffset: 0.24,
    topRadiusX: 0.54,
    topRadiusZ: 0.50,
    midRadiusX: 0.44,
    midRadiusZ: 0.42,
    ankleRadiusX: 0.32,
    ankleRadiusZ: 0.31,
    footRadiusX: 0.34,
    footRadiusZ: 0.35,
    footHeightRatio: 0.32,
    toeLength: 0.06,
    heelCut: 0.04,
    flatten: 0.40,
    color: LEG_COLOR,
  };

  const LegFrontRight = new mudkipLeg(
    GL,
    SHADER_PROGRAM,
    _position,
    _color,
    _Mmatrix,
    {
      ...LEG_CONFIG,
      innerDirection: -1,
    }
  );
  LIBS.set_I4(LegFrontRight.POSITION_MATRIX);
  LIBS.translateX(LegFrontRight.POSITION_MATRIX, 1.18);
  LIBS.translateY(LegFrontRight.POSITION_MATRIX, -0.76);
  LIBS.translateZ(LegFrontRight.POSITION_MATRIX, 0.80);

  const LegFrontLeft = new mudkipLeg(
    GL,
    SHADER_PROGRAM,
    _position,
    _color,
    _Mmatrix,
    {
      ...LEG_CONFIG,
      innerDirection: 1,
    }
  );
  LIBS.set_I4(LegFrontLeft.POSITION_MATRIX);
  LIBS.translateX(LegFrontLeft.POSITION_MATRIX, -1.18);
  LIBS.translateY(LegFrontLeft.POSITION_MATRIX, -0.76);
  LIBS.translateZ(LegFrontLeft.POSITION_MATRIX, 0.80);

  const LegBackRight = new mudkipLeg(
    GL,
    SHADER_PROGRAM,
    _position,
    _color,
    _Mmatrix,
    {
      ...LEG_CONFIG,
      innerDirection: -1,
      footRadiusX: LEG_CONFIG.footRadiusX * 0.92,
      footRadiusZ: LEG_CONFIG.footRadiusZ * 0.90,
      toeLength: LEG_CONFIG.toeLength * 0.60,
    }
  );
  LIBS.set_I4(LegBackRight.POSITION_MATRIX);
  LIBS.translateX(LegBackRight.POSITION_MATRIX, 1.02);
  LIBS.translateY(LegBackRight.POSITION_MATRIX, -0.82);
  LIBS.translateZ(LegBackRight.POSITION_MATRIX, -0.70);

  const LegBackLeft = new mudkipLeg(
    GL,
    SHADER_PROGRAM,
    _position,
    _color,
    _Mmatrix,
    {
      ...LEG_CONFIG,
      innerDirection: 1,
      footRadiusX: LEG_CONFIG.footRadiusX * 0.92,
      footRadiusZ: LEG_CONFIG.footRadiusZ * 0.90,
      toeLength: LEG_CONFIG.toeLength * 0.60,
    }
  );
  LIBS.set_I4(LegBackLeft.POSITION_MATRIX);
  LIBS.translateX(LegBackLeft.POSITION_MATRIX, -1.02);
  LIBS.translateY(LegBackLeft.POSITION_MATRIX, -0.82);
  LIBS.translateZ(LegBackLeft.POSITION_MATRIX, -0.70);

  // Hierarki
  const Rig = new group(_Mmatrix);

  // rig -> (badan, kepala, 4 kaki)
  // badan -> 4 kaki (sebagai child badan agar ikut transformasi badan)
  Badan.childs.push(LegFrontRight);
  Badan.childs.push(LegFrontLeft);
  Badan.childs.push(LegBackRight);
  Badan.childs.push(LegBackLeft);

  // kepala -> (mata, pipi, dagu)
  Kepala.childs.push(PipiKanan);
  Kepala.childs.push(PipiKiri);
  Kepala.childs.push(Dagu);
  Kepala.childs.push(EyeL);
  Kepala.childs.push(EyeR);

  Rig.childs.push(Badan);
  Rig.childs.push(Kepala);

  Rig.setup(); // Setup rig sebagai root baru

  /*========================= MATRICES ========================= */

  var PROJMATRIX = LIBS.get_projection(
    40,
    CANVAS.width / CANVAS.height,
    1,
    100
  );
  // var MOVEMATRIX = LIBS.get_I4();
  var VIEWMATRIX = LIBS.get_I4();

  LIBS.translateZ(VIEWMATRIX, -15);

  var THETA = 0,
    PHI = 0;
  var drag = false;
  var x_prev, y_prev;
  var FRICTION = 0.05;
  var dX = 0,
    dY = 0;

  var mouseDown = function (e) {
    drag = true;
    (x_prev = e.pageX), (y_prev = e.pageY);
    e.preventDefault();
    return false;
  };

  var mouseUp = function (e) {
    drag = false;
  };

  var mouseMove = function (e) {
    if (!drag) return false;
    dX = ((e.pageX - x_prev) * 2 * Math.PI) / CANVAS.width;
    dY = ((e.pageY - y_prev) * 2 * Math.PI) / CANVAS.height;
    THETA += dX;
    PHI += dY;
    (x_prev = e.pageX), (y_prev = e.pageY);
    e.preventDefault();
  };

  CANVAS.addEventListener("mousedown", mouseDown, false);
  CANVAS.addEventListener("mouseup", mouseUp, false);
  CANVAS.addEventListener("mouseout", mouseUp, false);
  CANVAS.addEventListener("mousemove", mouseMove, false);

  var SPEED = 0.05;

  var keyDown = function (e) {
    if (e.key === "w") {
      dY -= SPEED;
    } else if (e.key === "a") {
      dX -= SPEED;
    } else if (e.key === "s") {
      dY += SPEED;
    } else if (e.key === "d") {
      dX += SPEED;
    }
  };

  window.addEventListener("keydown", keyDown, false);

  /*========================= DRAWING ========================= */
  GL.enable(GL.DEPTH_TEST);
  GL.depthFunc(GL.LEQUAL);
  GL.clearColor(0.0, 0.0, 0.0, 1.0);
  GL.clearDepth(1.0);

  var time_prev = 0;
  var animate = function (time) {
    GL.viewport(0, 0, CANVAS.width, CANVAS.height);
    GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

    GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
    GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);

    // Reset rotasi manual tiap frame
    LIBS.set_I4(Rig.MOVE_MATRIX);
    LIBS.rotateY(Rig.MOVE_MATRIX, THETA); // drag kiri-kanan
    LIBS.rotateX(Rig.MOVE_MATRIX, PHI); // drag atas-bawah
    Rig.render(LIBS.get_I4());

    if (!drag) {
      dX *= 1 - FRICTION;
      dY *= 1 - FRICTION;
      THETA += dX;
      PHI += dY;
    }

    // Kepala.render(LIBS.get_I4());

    GL.flush();
    window.requestAnimationFrame(animate);
  };

  animate(0);
}
window.addEventListener("load", main);


















