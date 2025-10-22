import { Axes } from "./models/Axes.js";
import { ZubatLowerBody } from "./models/ZubatLowerBody.js";
import { ZubatUpperBody } from "./models/ZubatUpperBody.js";
import { ZubatTooth } from "./models/ZubatTooth.js";
import { ZubatEar } from "./models/ZubatEar.js";
import { ZubatWing } from "./models/ZubatWing.js";

function main() {
  const CANVAS = document.getElementById("mycanvas");
  CANVAS.width = window.innerWidth;
  CANVAS.height = window.innerHeight;

  let GL;
  try {
    GL = CANVAS.getContext("webgl", { antialias: true });
  } catch (e) {
    alert("WebGL tidak didukung!");
    return false;
  }

  GL.getExtension("OES_element_index_uint");

  // --- SHADERS ---
  const shader_vertex_source = `
        attribute vec3 position;
        attribute vec3 color;
        attribute vec3 normal;

        uniform mat4 Pmatrix, Vmatrix, Mmatrix;
        
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vView;

        void main(void) {
            gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.0);
            
            vNormal = normalize(mat3(Mmatrix) * normal); 
            vView = vec3(Vmatrix * Mmatrix * vec4(position, 1.));
            vColor = color;
        }`;

  const shader_fragment_source = `
        precision mediump float;
        
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vView;

        uniform vec3 lightDirection;
        uniform vec3 lightColor;
        uniform vec3 ambientColor;

        void main(void) {
            vec3 N = normalize(vNormal);
            vec3 L = normalize(lightDirection);
            vec3 V = normalize(-vView);
            vec3 R = reflect(-L, N);

            float diffuse = max(dot(N, L), 0.0);
            float specular = pow(max(dot(V, R), 0.0), 100.0);
            vec3 finalColor = ambientColor + (diffuse * lightColor) + (specular * lightColor);

            gl_FragColor = vec4(vColor * finalColor, 1.0);
        }`;

  // --- SHADER COMPILATION ---
  const compile_shader = (source, type) => {
    const shader = GL.createShader(type);
    GL.shaderSource(shader, source);
    GL.compileShader(shader);
    if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
      console.error(GL.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  };

  const SHADER_PROGRAM = GL.createProgram();
  GL.attachShader(
    SHADER_PROGRAM,
    compile_shader(shader_vertex_source, GL.VERTEX_SHADER)
  );
  GL.attachShader(
    SHADER_PROGRAM,
    compile_shader(shader_fragment_source, GL.FRAGMENT_SHADER)
  );
  GL.linkProgram(SHADER_PROGRAM);

  // --- SHADER UNIFORMS AND ATTRIBUTES ---
  const _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
  const _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
  const _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");
  const _lightDirection = GL.getUniformLocation(
    SHADER_PROGRAM,
    "lightDirection"
  );
  const _lightColor = GL.getUniformLocation(SHADER_PROGRAM, "lightColor");
  const _ambientColor = GL.getUniformLocation(SHADER_PROGRAM, "ambientColor");

  const _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
  const _color = GL.getAttribLocation(SHADER_PROGRAM, "color");
  const _normal = GL.getAttribLocation(SHADER_PROGRAM, "normal");

  GL.enableVertexAttribArray(_position);
  GL.enableVertexAttribArray(_color);
  GL.enableVertexAttribArray(_normal);
  GL.useProgram(SHADER_PROGRAM);

  // --- OBJECT INSTANTIATION ---
  const axes = new Axes(GL, _position, _color, _normal);
  const zubatLowerBody = new ZubatLowerBody(
    GL,
    _position,
    _color,
    _normal,
    2.5,
    1000,
    1000
  );
  const zubatUpperBody = new ZubatUpperBody(
    GL,
    _position,
    _color,
    _normal,
    2.5,
    1000,
    1000
  );

  // tooth
  const segments = 160;
  const rings = 1;
  const bluntness = 0.2;
  const tooth_UL = new ZubatTooth(
    GL,
    _position,
    _color,
    _normal,
    segments,
    rings,
    bluntness
  ); // Upper Left
  const tooth_UR = new ZubatTooth(
    GL,
    _position,
    _color,
    _normal,
    segments,
    rings,
    bluntness
  ); // Upper Right
  const tooth_LL = new ZubatTooth(
    GL,
    _position,
    _color,
    _normal,
    segments,
    rings,
    bluntness
  ); // Lower Left
  const tooth_LR = new ZubatTooth(
    GL,
    _position,
    _color,
    _normal,
    segments,
    rings,
    bluntness
  ); // Lower Right

  // Ears
  const earSegments = 20;
  const earRings = 10;
  const earBluntness = 0.3; // Ketumpulan ujung telinga
  const ear_L = new ZubatEar(
    GL,
    _position,
    _color,
    _normal,
    earSegments,
    earRings,
    earBluntness
  ); // Telinga Kiri
  const ear_R = new ZubatEar(
    GL,
    _position,
    _color,
    _normal,
    earSegments,
    earRings,
    earBluntness
  ); // Telinga Kanan

  // Wings
  const wing_L = new ZubatWing(GL, _position, _color, _normal); // Sayap Kiri
  const wing_R = new ZubatWing(GL, _position, _color, _normal); // Sayap Kanan

  // --- MATRICES AND CAMERA ---
  const PROJMATRIX = LIBS.get_projection(
    40,
    CANVAS.width / CANVAS.height,
    1,
    100
  );
  const VIEWMATRIX = LIBS.get_I4();

  // --- INTERACTION VARIABLES ---
  let THETA = 0,
    PHI = 0;
  let drag = false,
    x_prev = 0,
    y_prev = 0,
    dX = 0,
    dY = 0;
  let cameraZ = -10;
  const FRICTION = 0.95;

  // --- EVENT LISTENERS ---
  CANVAS.addEventListener("mousedown", (e) => {
    drag = true;
    x_prev = e.pageX;
    y_prev = e.pageY;
  });
  CANVAS.addEventListener("mouseup", () => {
    drag = false;
  });
  CANVAS.addEventListener("mouseout", () => {
    drag = false;
  });
  CANVAS.addEventListener("mousemove", (e) => {
    if (!drag) return;
    dX = ((e.pageX - x_prev) * 2 * Math.PI) / CANVAS.width;
    dY = ((e.pageY - y_prev) * 2 * Math.PI) / CANVAS.height;
    THETA += dX;
    PHI += dY;
    x_prev = e.pageX;
    y_prev = e.pageY;
  });
  CANVAS.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomSpeed = 0.01;
    cameraZ += e.deltaY * zoomSpeed;
    cameraZ = Math.max(-20, Math.min(-3, cameraZ));
  });

  // --- RENDER SETUP ---
  GL.enable(GL.DEPTH_TEST);
  GL.depthFunc(GL.LEQUAL);
  GL.clearColor(0.1, 0.1, 0.1, 1.0);
  GL.clearDepth(1.0);

  // --- ANIMATION LOOP ---
  const animate = (time) => {
    if (!drag) {
      dX *= FRICTION;
      dY *= FRICTION;
      THETA += dX;
      PHI += dY;
    }

    const modelMatrix = LIBS.get_I4();

    LIBS.set_I4(VIEWMATRIX);
    LIBS.translateZ(VIEWMATRIX, cameraZ);
    LIBS.rotateY(VIEWMATRIX, THETA);
    LIBS.rotateX(VIEWMATRIX, PHI);

    // ARAH PANDANG KAMERA DARI VIEW MATRIX
    const cameraDirection = [-VIEWMATRIX[2], -VIEWMATRIX[6], -VIEWMATRIX[10]];

    GL.viewport(0, 0, CANVAS.width, CANVAS.height);
    GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

    GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
    GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);

    // ARAH KAMERA SEBAGAI ARAH CAHAYA
    GL.uniform3fv(_lightDirection, cameraDirection);

    GL.uniform3fv(_lightColor, [1.0, 1.0, 1.0]);
    GL.uniform3fv(_ambientColor, [0.5, 0.5, 0.5]);

    axes.render(GL, _Mmatrix, modelMatrix);
    zubatLowerBody.render(GL, _Mmatrix, modelMatrix);
    zubatUpperBody.render(GL, _Mmatrix, modelMatrix);

    // --- RENDER & POSISIKAN TELINGA ---

    // TELINGA KIRI
    let M_TELINGA_L = LIBS.get_I4();
    LIBS.translateY(M_TELINGA_L, 4.3);
    LIBS.translateX(M_TELINGA_L, -1.5);
    LIBS.translateZ(M_TELINGA_L, 1.1); // improvement
    LIBS.rotateZ(M_TELINGA_L, 3.5); // Kemikiran
    LIBS.rotateY(M_TELINGA_L, -0.2); // Perputaran
    ear_L.render(GL, _Mmatrix, LIBS.multiply(modelMatrix, M_TELINGA_L));

    // TELINGA KANAN
    let M_TELINGA_R = LIBS.get_I4();
    LIBS.translateY(M_TELINGA_R, 4.3);
    LIBS.translateX(M_TELINGA_R, 1.5);
    LIBS.translateZ(M_TELINGA_R, 1.1); // improvement lagi
    LIBS.rotateZ(M_TELINGA_R, -3.5); // Kemikiran
    LIBS.rotateY(M_TELINGA_R, 0.2); // Perputaran
    ear_R.render(GL, _Mmatrix, LIBS.multiply(modelMatrix, M_TELINGA_R));

    // --- RENDER & POSITION TEETH ---
    // Lower Left Tooth
    let M_TARING_UL = LIBS.get_I4();
    LIBS.translateY(M_TARING_UL, 1.25);
    LIBS.translateX(M_TARING_UL, -0.5);
    LIBS.translateZ(M_TARING_UL, 1.7);
    LIBS.rotateZ(M_TARING_UL, 0.2);
    let M_FINAL_UL = LIBS.multiply(modelMatrix, M_TARING_UL);
    tooth_UL.render(GL, _Mmatrix, M_FINAL_UL);

    // Lower Right Tooth
    let M_TARING_UR = LIBS.get_I4();
    LIBS.translateY(M_TARING_UR, 1.25);
    LIBS.translateX(M_TARING_UR, 0.5);
    LIBS.translateZ(M_TARING_UR, 1.7);
    LIBS.rotateZ(M_TARING_UR, -0.2);
    let M_FINAL_UR = LIBS.multiply(modelMatrix, M_TARING_UR);
    tooth_UR.render(GL, _Mmatrix, M_FINAL_UR);

    // Upper Left Tooth
    let M_TARING_LL = LIBS.get_I4();
    LIBS.translateY(M_TARING_LL, 2.73);
    LIBS.translateX(M_TARING_LL, -0.3);
    LIBS.translateZ(M_TARING_LL, 1.8);
    LIBS.rotateX(M_TARING_LL, Math.PI);
    let M_FINAL_LL = LIBS.multiply(modelMatrix, M_TARING_LL);
    tooth_LL.render(GL, _Mmatrix, M_FINAL_LL);

    // Upper Right Tooth
    let M_TARING_LR = LIBS.get_I4();
    LIBS.translateY(M_TARING_LR, 2.73);
    LIBS.translateX(M_TARING_LR, 0.3);
    LIBS.translateZ(M_TARING_LR, 1.8);
    LIBS.rotateX(M_TARING_LR, Math.PI);
    let M_FINAL_LR = LIBS.multiply(modelMatrix, M_TARING_LR);
    tooth_LR.render(GL, _Mmatrix, M_FINAL_LR);

    // --- RENDER & POSISIKAN SAYAP ---

    // SAYAP KIRI
    let M_SAYAP_L = LIBS.get_I4();
    LIBS.scale(M_SAYAP_L, 1, 1, 1);
    LIBS.translateY(M_SAYAP_L, 0.0); // Posisikan di 'bahu'
    LIBS.translateX(M_SAYAP_L, 0.5);
    LIBS.rotateZ(M_SAYAP_L, 0.4); // Miringkan sedikit
    LIBS.rotateY(M_SAYAP_L, 0.2); // Buka sayapnya
    wing_L.render(GL, _Mmatrix, LIBS.multiply(modelMatrix, M_SAYAP_L));

    // SAYAP KANAN
    let M_SAYAP_R = LIBS.get_I4();
    LIBS.scale(M_SAYAP_R, -1, 1, 1); // Trik: Scale negatif untuk mencerminkan objek
    LIBS.translateY(M_SAYAP_R, 0.0);
    LIBS.translateX(M_SAYAP_R, -0.5);
    LIBS.rotateZ(M_SAYAP_R, -0.4);
    LIBS.rotateY(M_SAYAP_R, -0.2);
    wing_R.render(GL, _Mmatrix, LIBS.multiply(modelMatrix, M_SAYAP_R));

    GL.flush();
    window.requestAnimationFrame(animate);
  };

  animate(0);
}

main();
