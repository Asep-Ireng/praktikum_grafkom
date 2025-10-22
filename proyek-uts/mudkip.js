import { ellipsoid } from "./ellipsoid.js";
import{lingkaran} from "./lingkaran-setengah.js";
import{group} from "./group.js";
import{cone} from "./cone.js";
import { mudkipBody } from "./mudkip-body.js";
import { spherocylinder } from "./spherocylinder.js";
import { BellyPatch } from "./belly-patch.js";
import { BellyOutline } from "./belly-outline.js";
import { MudkipTail } from "./mudkip-tail.js";
import { MudkipAnimation } from "./mudkip-animation.js";


function main() {
    /** @type {HTMLCanvasElement} */
    var CANVAS = document.getElementById("mycanvas");
    const dpr = window.devicePixelRatio || 1;
    CANVAS.width = window.innerWidth * dpr;
    CANVAS.height = window.innerHeight * dpr;
    CANVAS.style.width = window.innerWidth + 'px';
    CANVAS.style.height = window.innerHeight + 'px';


    /*===================== GET WEBGL CONTEXT ===================== */
/** @type {WebGLRenderingContext} */
    var GL;
    try {
        GL = CANVAS.getContext("webgl", { 
            antialias: true,
            alpha: false,
            premultipliedAlpha: false 
        });
    } catch (e) {
        alert("WebGL context cannot be initialized");
        return false;
    }


    /*========================= SHADERS ========================= */
var shader_vertex_source = `
    attribute vec3 position;
    attribute vec3 color;
    attribute vec3 normal;

    uniform mat4 Pmatrix;   // Projection matrix
    uniform mat4 Vmatrix;   // View matrix
    uniform mat4 Mmatrix;   // Model matrix
    uniform mat3 normalMatrix; // Inverse-transpose of Mmatrix (dari JS)

    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vFragPos;

    void main(void) {
        // posisi vertex di world space
        vec4 worldPos = Mmatrix * vec4(position, 1.0);
        gl_Position = Pmatrix * Vmatrix * worldPos;

        vColor = color;
        vFragPos = worldPos.xyz;

        // ubah normal ke world space & normalisasi
        vNormal = normalize(normalMatrix * normal);
    }`;


var shader_fragment_source = `
    precision mediump float;

    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vFragPos;

    uniform vec3 lightDir1;   // lampu utama (key light)
    uniform vec3 lightCol1;
    uniform vec3 lightDir2;   // lampu isi (fill light)
    uniform vec3 lightCol2;

    uniform vec3 viewPos;     // posisi kamera

    // kontrol pencahayaan (bisa diubah runtime dari JS)
    uniform float uAmbient;
    uniform float uDiffuse;
    uniform float uSpecular;
    uniform float uShininess;

    uniform vec3 hemiSky;    // contoh: vec3(0.92, 0.97, 1.00)
    uniform vec3 hemiGround; // contoh: vec3(0.65, 0.70, 0.75)
    void main(void) {
        vec3 N = normalize(vNormal);
        vec3 V = normalize(viewPos - vFragPos);

        vec3 L1 = normalize(-lightDir1);
        float diff1 = clamp(dot(N, L1) * 0.5 + 0.5, 0.0, 1.0);
        vec3 H1 = normalize(L1 + V);
        float spec1 = pow(max(dot(N, H1), 0.0), uShininess);

        vec3 L2 = normalize(-lightDir2);
        float diff2 = clamp(dot(N, L2) * 0.5 + 0.5, 0.0, 1.0);
        vec3 H2 = normalize(L2 + V);
        float spec2 = pow(max(dot(N, H2), 0.0), uShininess);

        // --- Komponen pencahayaan ---
        vec3 ambient  = uAmbient * vec3(1.0); // ambient netral
        vec3 diffuse  = uDiffuse * (diff1 * lightCol1 + 0.5 * diff2 * lightCol2);
        vec3 specular = uSpecular * (spec1 * lightCol1 + 0.5 * spec2 * lightCol2);

        vec3 lighting = ambient + diffuse + specular;
        vec3 finalColor = vColor * lighting;

        gl_FragColor = vec4(finalColor, 1.0);
    }`;


    var compile_shader = function (source, type, typeString) {
        var shader = GL.createShader(type);
        GL.shaderSource(shader, source);
        GL.compileShader(shader);
        if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
            alert("ERROR IN " + typeString + " SHADER: " + GL.getShaderInfoLog(shader));
            return false;
        }
        return shader;
    };
    var shader_vertex = compile_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");
    var shader_fragment = compile_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");


    var SHADER_PROGRAM = GL.createProgram();
    GL.attachShader(SHADER_PROGRAM, shader_vertex);
    GL.attachShader(SHADER_PROGRAM, shader_fragment);


    GL.linkProgram(SHADER_PROGRAM);


    var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
    GL.enableVertexAttribArray(_position);


    var _color = GL.getAttribLocation(SHADER_PROGRAM, "color");
    GL.enableVertexAttribArray(_color);

    var _normal = GL.getAttribLocation(SHADER_PROGRAM, "normal"); 
    GL.enableVertexAttribArray(_normal);      

    var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
    var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");

    const uNormalMatrix = GL.getUniformLocation(SHADER_PROGRAM, "normalMatrix");
    const uLightDirection = GL.getUniformLocation(SHADER_PROGRAM, "lightDirection");
    const uLightColor = GL.getUniformLocation(SHADER_PROGRAM, "lightColor");
    const uViewPos = GL.getUniformLocation(SHADER_PROGRAM, "viewPos");


    GL.useProgram(SHADER_PROGRAM);

    const uLightDir1 = GL.getUniformLocation(SHADER_PROGRAM, "lightDir1");
    const uLightCol1 = GL.getUniformLocation(SHADER_PROGRAM, "lightCol1");
    const uLightDir2 = GL.getUniformLocation(SHADER_PROGRAM, "lightDir2");
    const uLightCol2 = GL.getUniformLocation(SHADER_PROGRAM, "lightCol2");

    const uAmbient   = GL.getUniformLocation(SHADER_PROGRAM, "uAmbient");
    const uDiffuse   = GL.getUniformLocation(SHADER_PROGRAM, "uDiffuse");
    const uSpecular  = GL.getUniformLocation(SHADER_PROGRAM, "uSpecular");
    const uShininess = GL.getUniformLocation(SHADER_PROGRAM, "uShininess");


GL.uniform3f(uLightDir1, -0.35, 0.80, -0.55); 
GL.uniform3f(uLightCol1,  1.00, 1.00, 1.00);

GL.uniform3f(uLightDir2,  0.40, -.20, 0.60);
GL.uniform3f(uLightCol2,  0.70, 0.80, 1.00); 
GL.uniform1f(uAmbient,   0.45);
GL.uniform1f(uDiffuse,   0.70);
GL.uniform1f(uSpecular,  0.20);
GL.uniform1f(uShininess, 22.0);

GL.uniform3f(uViewPos, 0.0, 0.0, 3.0);

const Kepala = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 1.6, ry: 1.4, rz: 1.7, segments: 48, rings: 32, color: [123 / 255, 185 / 255, 239 / 255] 
});
LIBS.set_I4(Kepala.POSITION_MATRIX);
LIBS.translateY(Kepala.POSITION_MATRIX,  1.4); 
LIBS.translateZ(Kepala.POSITION_MATRIX,  1.1); 
LIBS.set_I4(Kepala.MOVE_MATRIX);
LIBS.rotateX(Kepala.MOVE_MATRIX, 0.08); 

const PipiKanan = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
  rx: 0.6, ry: 0.8, rz: 0.8, segments: 36, rings: 24, color: [255/255, 173/255, 66/255] });
LIBS.translateX(PipiKanan.POSITION_MATRIX,  1.1);
LIBS.translateY(PipiKanan.POSITION_MATRIX, -0.1);
         
const ConeKanan = new cone(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
  radiusBottom: 0.26, radiusTop: 0.02, height: 0.90, segments: 32, color: [255/255, 173/255, 66/255]});
LIBS.set_I4(ConeKanan.POSITION_MATRIX);
LIBS.rotateY(ConeKanan.POSITION_MATRIX, -8 * Math.PI/180); 
LIBS.translateY(ConeKanan.POSITION_MATRIX, -0.06);
LIBS.translateX(ConeKanan.POSITION_MATRIX, 0.5);
LIBS.scale(ConeKanan.MOVE_MATRIX, 1.0, 0.95, 0.75);

const ConeKananAtas = new cone(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
  radiusBottom: 0.26, radiusTop: 0.02,height: 0.90, segments: 32, color: [255/255, 173/255, 66/255]});
LIBS.set_I4(ConeKananAtas.POSITION_MATRIX);
LIBS.rotateZ(ConeKananAtas.POSITION_MATRIX, 45 * Math.PI/180);
LIBS.rotateY(ConeKananAtas.POSITION_MATRIX, -8 * Math.PI/180);
LIBS.translateY(ConeKananAtas.POSITION_MATRIX, 0.04); 
LIBS.translateX(ConeKananAtas.POSITION_MATRIX, 0.4);  
LIBS.scale(ConeKananAtas.MOVE_MATRIX, 1.0, 0.95, 0.75);

const ConeKananBawah = new cone(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
  radiusBottom: 0.26, radiusTop: 0.02, height: 0.90, segments: 32, color: [255/255, 173/255, 66/255]});
LIBS.set_I4(ConeKananBawah.POSITION_MATRIX);
LIBS.rotateZ(ConeKananBawah.POSITION_MATRIX, -48 * Math.PI/180);  
LIBS.rotateY(ConeKananBawah.POSITION_MATRIX, -8 * Math.PI/180);  
LIBS.translateY(ConeKananBawah.POSITION_MATRIX, -0.04); 
LIBS.translateX(ConeKananBawah.POSITION_MATRIX, 0.4); 
LIBS.scale(ConeKananBawah.MOVE_MATRIX, 1.0, 0.95, 0.75);

const PipiKiri = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
  rx: 0.6, ry: 0.8, rz: 0.8, segments: 36, rings: 24, color: [255/255, 173/255, 66/255]});
LIBS.translateX(PipiKiri.POSITION_MATRIX, -1.1);
LIBS.translateY(PipiKiri.POSITION_MATRIX, -0.1);

const ConeKiri = new cone(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
  radiusBottom: 0.26, radiusTop: 0.02, height: 0.90, segments: 32, color: [255/255, 173/255, 66/255]});
LIBS.set_I4(ConeKiri.POSITION_MATRIX);
LIBS.rotateY(ConeKiri.POSITION_MATRIX, Math.PI);
LIBS.rotateY(ConeKiri.POSITION_MATRIX, -8 * Math.PI/180);  
LIBS.translateY(ConeKiri.POSITION_MATRIX, -0.06);  
LIBS.translateX(ConeKiri.POSITION_MATRIX, -0.5); 
LIBS.scale(ConeKiri.MOVE_MATRIX, 1.0, 0.95, 0.75);

const ConeKiriAtas = new cone(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
  radiusBottom: 0.26, radiusTop: 0.02, height: 0.80, segments: 32, color: [255/255, 173/255, 66/255]});
LIBS.set_I4(ConeKiriAtas.POSITION_MATRIX);
LIBS.rotateZ(ConeKiriAtas.POSITION_MATRIX, 138 * Math.PI/180);  
LIBS.rotateY(ConeKiriAtas.POSITION_MATRIX, 8 * Math.PI/180);
LIBS.translateY(ConeKiriAtas.POSITION_MATRIX, 0.1);  
LIBS.translateX(ConeKiriAtas.POSITION_MATRIX, -0.4); 
LIBS.scale(ConeKiriAtas.MOVE_MATRIX, 1.0, 0.95, 0.75);

const ConeKiriBawah = new cone(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
  radiusBottom: 0.26, radiusTop: 0.02, height: 0.80, segments: 32, color: [255/255, 173/255, 66/255]});
LIBS.set_I4(ConeKiriBawah.POSITION_MATRIX);
LIBS.rotateZ(ConeKiriBawah.POSITION_MATRIX, -138 * Math.PI/180); 
LIBS.rotateY(ConeKiriBawah.POSITION_MATRIX, 8 * Math.PI/180);  
LIBS.translateY(ConeKiriBawah.POSITION_MATRIX, -0.2);       
LIBS.translateX(ConeKiriBawah.POSITION_MATRIX, -0.4);    
LIBS.scale(ConeKiriBawah.MOVE_MATRIX, 1.0, 0.95, 0.75);

const Dagu = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
  rx: 1.6, ry: 1.4, rz: 1.70, segments: 64, rings: 32, color: [198/255,222/255,247/255],
  phiStart: -Math.PI/2, phiEnd:   -Math.PI/17,
  thetaStart: 0, thetaEnd: Math.PI });
LIBS.translateY(Dagu.POSITION_MATRIX, -0.02);  
LIBS.translateZ(Dagu.POSITION_MATRIX, 0.0); 

const GarisPemisah = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
  rx: 1.62, ry: 1.5, rz: 1.75, segments: 64, rings: 6, color: [0, 0, 0],            
  phiStart: -Math.PI/17 - 0.01, phiEnd:   -Math.PI/17 + 0.01,
  thetaStart: Math.PI/8, thetaEnd:   Math.PI*7/8 });
LIBS.translateY(GarisPemisah.POSITION_MATRIX, -0.02);
LIBS.translateZ(GarisPemisah.POSITION_MATRIX, -0.05);

const HidungKanan = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
  rx: 0.015, ry: 0.025, rz: 0.01, segments: 12, rings: 8, color: [0, 0, 0]});
LIBS.set_I4(HidungKanan.POSITION_MATRIX);
LIBS.translateX(HidungKanan.POSITION_MATRIX, 0.17);
LIBS.translateY(HidungKanan.POSITION_MATRIX, -0.1);
LIBS.translateZ(HidungKanan.POSITION_MATRIX, 1.68);   

const HidungKiri = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
  rx: 0.015, ry: 0.025, rz: 0.01, segments: 12, rings: 8, color: [0, 0, 0]});
LIBS.set_I4(HidungKiri.POSITION_MATRIX);
LIBS.translateX(HidungKiri.POSITION_MATRIX, -0.15);
LIBS.translateY(HidungKiri.POSITION_MATRIX, -0.1);
LIBS.translateZ(HidungKiri.POSITION_MATRIX, 1.68);

const EyeL = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
  rx: 0.18, ry: 0.26, rz: 0.15, segments: 36, rings: 24, color: [0.02, 0.02, 0.02]});
LIBS.translateX(EyeL.POSITION_MATRIX, -0.58);
LIBS.translateY(EyeL.POSITION_MATRIX,  0.15);
LIBS.translateZ(EyeL.POSITION_MATRIX,  1.5);
LIBS.scale(EyeL.POSITION_MATRIX, 1.0, 1.05, 0.95);
LIBS.rotateY(EyeL.POSITION_MATRIX,  +0.08);   

const EyeL_Hi = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
  rx: 0.08, ry: 0.108, rz: 0.05, color: [1,1,1] });
LIBS.translateX(EyeL_Hi.POSITION_MATRIX, -0.06); 
LIBS.translateY(EyeL_Hi.POSITION_MATRIX,  +0.09); 
LIBS.translateZ(EyeL_Hi.POSITION_MATRIX,  +0.1);
LIBS.rotateZ(EyeL_Hi.POSITION_MATRIX, -0.12);   

const EyeL_Sh = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
  rx: 0.07, ry: 0.11, rz: 0.05, color: [107/255, 86/255, 96/255]});
LIBS.translateX(EyeL_Sh.POSITION_MATRIX,  +0.008); 
LIBS.translateY(EyeL_Sh.POSITION_MATRIX,  -0.07); 
LIBS.translateZ(EyeL_Sh.POSITION_MATRIX,  +0.11); 
LIBS.scale   (EyeL_Sh.POSITION_MATRIX, 1.10, 0.85, 1.00); 
LIBS.rotateZ (EyeL_Sh.POSITION_MATRIX,  -0.30);        

const EyeR = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
  rx: 0.18, ry: 0.26, rz: 0.15, segments: 36, rings: 24, color: [0.02, 0.02, 0.02]});
LIBS.translateX(EyeR.POSITION_MATRIX,  0.58);
LIBS.translateY(EyeR.POSITION_MATRIX,  0.15);
LIBS.translateZ(EyeR.POSITION_MATRIX,  1.5);

const EyeR_Hi = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
  rx: 0.08, ry: 0.13, rz: 0.05, color: [1,1,1]});
LIBS.translateX(EyeR_Hi.POSITION_MATRIX, -0.01);
LIBS.translateY(EyeR_Hi.POSITION_MATRIX,  0.08);
LIBS.translateZ(EyeR_Hi.POSITION_MATRIX,  0.11);
LIBS.rotateY(EyeR.POSITION_MATRIX,  -0.08);

const EyeR_Sh = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
  rx: 0.08, ry: 0.10, rz: 0.05, color: [107/255, 86/255, 96/255]});
LIBS.translateX(EyeR_Sh.POSITION_MATRIX,  +0.07);   
LIBS.translateY(EyeR_Sh.POSITION_MATRIX,  -0.06);  
LIBS.translateZ(EyeR_Sh.POSITION_MATRIX,  +0.095); 
LIBS.scale(EyeR_Sh.POSITION_MATRIX, 1.10, 0.85, 1.00);
LIBS.rotateZ(EyeR_Sh.POSITION_MATRIX, -0.30);  

const SiripTengah = new ellipsoid(GL, SHADER_PROGRAM, _position, _color,_normal,  _Mmatrix, {
  rx: 0.19, ry: 2.1, rz: 0.8, segments: 24, rings: 16, color: [123 / 255, 190 / 255, 239 / 255]});

const FIN = {
  BASE_Y: 1.2,
  BASE_Z: -0.1,
  RY: 2.1,
  PIVOT_BASE: true,
  MODE: 'bouncy', 
  TIME_SCALE: 1.0,
  ANG_MAX: 20 * Math.PI / 180,    
  BOUNCE_FREQUENCY: 1.0,  
  BOUNCE_DAMPING: 0.3,  
  ANG_RIGHT:  18 * Math.PI / 180,
  ANG_LEFT:  -15 * Math.PI / 180,
  ANG_RIGHT_SM: 6 * Math.PI / 180,
};

function easeOutQuad(x){ return 1 - (1 - x)*(1 - x); }
function easeInCubic(x){ return x*x*x; }
function easeOutBack(x){ const c=1.70158; const s=1.525*c; x -= 1; return 1 + (x*x*((c+1)*x + c)); }

let t0Fin = performance.now();

function getFinAngle(nowMs){
  const tReal = (nowMs - t0Fin) * 0.001;
  const tScaled = tReal / FIN.TIME_SCALE;
  
  if (FIN.MODE === 'bouncy') {
    const baseFreq = FIN.BOUNCE_FREQUENCY;
    const baseCycle = Math.sin(tScaled * Math.PI * 2 * baseFreq);
    const bounceFreq = baseFreq * 4; 
    const bouncePhase = tScaled * Math.PI * 2 * bounceFreq;
    const bounceIntensity = Math.abs(baseCycle); 
    const bounce = Math.sin(bouncePhase) * FIN.BOUNCE_DAMPING * bounceIntensity;

    const angle = FIN.ANG_MAX * (baseCycle + bounce * 0.3);
    return angle;
  } else {
    let t = tScaled % FIN_TOTAL;
    const D = FIN.DUR;
    
    if (t < D.holdStart) return 0.0; 
    t -= D.holdStart;
    
    if (t < D.toRight){
      const k = easeOutQuad(t / D.toRight);
      return FIN.ANG_RIGHT * k;
    }
    t -= D.toRight;
    
    if (t < D.toLeftFast){
      const k = easeInCubic(t / D.toLeftFast);
      return (FIN.ANG_RIGHT * (1-k)) + (FIN.ANG_LEFT * k);
    }
    t -= D.toLeftFast;
    
    if (t < D.bounceBack){
      const k = easeOutBack(t / D.bounceBack);
      return (FIN.ANG_LEFT * (1-k)) + (FIN.ANG_RIGHT_SM * k);
    }
    t -= D.bounceBack;
    
    if (t < D.toCenter){
      const k = easeOutQuad(t / D.toCenter);
      return (FIN.ANG_RIGHT_SM * (1-k));
    }
    t -= D.toCenter;
    
    if (t < D.holdEnd) return 0.0;
    
    return 0.0;
  }
}

function updateSiripTengah(nowMs){
  const angle = getFinAngle(nowMs);
  LIBS.set_I4(SiripTengah.POSITION_MATRIX);

  if (FIN.PIVOT_BASE){
    LIBS.translateY(SiripTengah.POSITION_MATRIX, +FIN.RY);
    LIBS.rotateZ(SiripTengah.POSITION_MATRIX, angle);
    LIBS.translateY(SiripTengah.POSITION_MATRIX, -FIN.RY);
  } else {
    LIBS.rotateZ(SiripTengah.POSITION_MATRIX, angle);
  }
  LIBS.translateY(SiripTengah.POSITION_MATRIX, FIN.BASE_Y);
  LIBS.translateZ(SiripTengah.POSITION_MATRIX, FIN.BASE_Z);
}

const STRIPE_WIDTH = 0.045;
const GAP_BOTTOM   = 1.8;   
const GAP_TOP      = 0.06;  
const EPSX         = 0.012;
const THETA_CENTER_RIGHT = -0.50;
const THETA_CENTER_LEFT  = -0.20; 

const GarisSiripKanan = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _normal,_Mmatrix, {
  rx: 0.19, ry: 2.1, rz: 0.8, segments: 96, rings: 64, color: [0,0,0],
  phiStart: -Math.PI/2 + GAP_BOTTOM, phiEnd:    Math.PI/2  - GAP_TOP,
  thetaStart: THETA_CENTER_RIGHT - STRIPE_WIDTH/2, thetaEnd:   THETA_CENTER_RIGHT + STRIPE_WIDTH/2,});
LIBS.set_I4(GarisSiripKanan.POSITION_MATRIX);
LIBS.translateX(GarisSiripKanan.POSITION_MATRIX, +EPSX);
LIBS.translateZ(GarisSiripKanan.POSITION_MATRIX, -0.08); 

const GarisSiripKiri = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _normal,_Mmatrix, {
  rx: 0.19, ry: 2.1, rz: 0.8, segments: 96, rings: 64, color: [0,0,0],
  phiStart: -Math.PI/2 + GAP_BOTTOM, phiEnd:    Math.PI/2  - GAP_TOP,
  thetaStart: THETA_CENTER_LEFT - STRIPE_WIDTH/2, thetaEnd:   THETA_CENTER_LEFT + STRIPE_WIDTH/2,});
LIBS.set_I4(GarisSiripKiri.POSITION_MATRIX);
LIBS.translateX(GarisSiripKiri.POSITION_MATRIX, 0.012);
LIBS.translateZ(GarisSiripKiri.POSITION_MATRIX, 0.22);

const thetaBackA = Math.PI + 0.20;

const GarisSiripKananK = new lingkaran(GL, SHADER_PROGRAM, _position, _color,_normal, _Mmatrix, {
  rx: 0.19, ry: 2.1, rz: 0.8, segments: 48, rings: 32, color: [0,0,0],
  phiStart: -Math.PI/2 + GAP_BOTTOM, phiEnd:    Math.PI/2  - GAP_TOP,
  thetaStart: thetaBackA - STRIPE_WIDTH/2, thetaEnd:   thetaBackA + STRIPE_WIDTH/2,});
LIBS.set_I4(GarisSiripKananK.POSITION_MATRIX);
LIBS.translateX(GarisSiripKananK.POSITION_MATRIX, -0.012); 
LIBS.translateZ(GarisSiripKananK.POSITION_MATRIX, 0.22); 

const GarisSiripKiriK = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _normal,_Mmatrix, {
  rx: 0.19, ry: 2.1, rz: 0.8, segments: 48, rings: 32, color: [0,0,0],
  phiStart: -Math.PI/2 + GAP_BOTTOM, phiEnd:    Math.PI/2  - GAP_TOP,
  thetaStart: thetaBackA - STRIPE_WIDTH/2, thetaEnd:   thetaBackA + STRIPE_WIDTH/2,});
LIBS.set_I4(GarisSiripKiriK.POSITION_MATRIX);
LIBS.translateX(GarisSiripKiriK.POSITION_MATRIX, -0.012); 
LIBS.translateZ(GarisSiripKiriK.POSITION_MATRIX, -0.15); 

const BODY_COLOR = [123 / 255, 190 / 255, 239 / 255];
const BELLY_COLOR = [198/255, 222/255, 247/255];

const BODY_CONFIG = {
  rx: 1.2, ry: 1.0, rz: 1.7,
  flattenStartPhi: -0.22,
  flattenStrength: 0.65,
  flattenPlaneRatio: 0.92,
  flattenSharpness: 2.0,
  flattenLateralTaper: 0.1,
};

const Badan = new mudkipBody(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix,{
    ...BODY_CONFIG,
    color: BODY_COLOR,
  }
);
LIBS.set_I4(Badan.POSITION_MATRIX);
LIBS.translateY(Badan.POSITION_MATRIX, -0.05);
LIBS.translateZ(Badan.POSITION_MATRIX, -0.25);
LIBS.rotateX(Badan.POSITION_MATRIX, -0.06);

const BellyPatchDepan = new BellyPatch(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix,{
    widthTop: 1.15,
    widthBottom: 0.95,
    length: 5.0,  
    segments: 48,
    stacks: 128,
    color: BELLY_COLOR,

    bodyRx: BODY_CONFIG.rx,
    bodyRy: BODY_CONFIG.ry,
    bodyRz: BODY_CONFIG.rz,
    surfaceEpsilon: 0.04,
  }
);
LIBS.set_I4(BellyPatchDepan.POSITION_MATRIX);
LIBS.translateZ(BellyPatchDepan.POSITION_MATRIX, +0.02);
LIBS.translateY(BellyPatchDepan.POSITION_MATRIX, -0.009);

const OutlineKiri = new BellyOutline(GL, SHADER_PROGRAM, _position, _color,  _Mmatrix, {
  side: "left",
  width: 0.02,              
  length: 5.0,               
  widthTop: 1.15,
  widthBottom: 0.95,
  segments: 2,                
  stacks: 128,                  
  color: [0,0,0],
  bodyRx: BODY_CONFIG.rx,
  bodyRy: BODY_CONFIG.ry,
  bodyRz: BODY_CONFIG.rz,
  surfaceEpsilon: 0.04,
});
LIBS.set_I4(OutlineKiri.POSITION_MATRIX);
LIBS.translateZ(OutlineKiri.POSITION_MATRIX, +0.02);
LIBS.translateY(OutlineKiri.POSITION_MATRIX, -0.009);

const OutlineKanan = new BellyOutline(GL, SHADER_PROGRAM, _position, _color, _Mmatrix, {
  side: "right",
  width: 0.02,
  length: 5.0,
  widthTop: 1.15,
  widthBottom: 0.95,
  segments: 2,
  stacks: 128,
  color: [0,0,0],
  bodyRx: BODY_CONFIG.rx,
  bodyRy: BODY_CONFIG.ry,
  bodyRz: BODY_CONFIG.rz,
  surfaceEpsilon: 0.04,
});
LIBS.set_I4(OutlineKanan.POSITION_MATRIX);
LIBS.translateZ(OutlineKanan.POSITION_MATRIX, +0.02);
LIBS.translateY(OutlineKanan.POSITION_MATRIX, -0.009);

const BellyLineBelakang = new BellyPatch(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix,{
    widthTop:   1.0,         
    widthBottom:1.0,          
    length:     0.02,  
    segments:   48,
    stacks:     2,        
    color:      [0,0,0],   
    bodyRx: BODY_CONFIG.rx,
    bodyRy: BODY_CONFIG.ry,
    bodyRz: BODY_CONFIG.rz,
    surfaceEpsilon: 0.045    
  }
);
LIBS.set_I4(BellyLineBelakang.POSITION_MATRIX);
LIBS.rotateX(BellyLineBelakang.POSITION_MATRIX, Math.PI/2); 
LIBS.translateZ(BellyLineBelakang.POSITION_MATRIX,  -0.67); 
LIBS.translateY(BellyLineBelakang.POSITION_MATRIX,  -0.02);

const kakiKananDepan = new spherocylinder(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix,{
    radiusTop: 0.3, 
    taper: 0.75,     
    height: 1.5,      
    capRx: 0.24, 
    capRy: 0.18, 
    capRz: 0.28,   
    forwardBias: 0.12,     
    segments: 24, stacks: 3, capRings: 12,    
    color: BODY_COLOR,
    name: "kaki_kanan_depan",
  }
);
LIBS.set_I4(kakiKananDepan.POSITION_MATRIX);
LIBS.translateX(kakiKananDepan.POSITION_MATRIX, +BODY_CONFIG.rx * 0.8);
LIBS.translateY(kakiKananDepan.POSITION_MATRIX, -BODY_CONFIG.ry * 1.10 + (1.5 * 0.5) - 0.03);
LIBS.translateZ(kakiKananDepan.POSITION_MATRIX, +BODY_CONFIG.rz * 0.36);
LIBS.rotateX(kakiKananDepan.POSITION_MATRIX, Math.PI);
LIBS.rotateX(kakiKananDepan.POSITION_MATRIX, -0.05);   
LIBS.rotateZ(kakiKananDepan.POSITION_MATRIX, 0.18);  

const alasKananDepan = new lingkaran(
  GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix,
  { rx: 0.27, ry: 0.25, rz: 0.45, segments: 40, rings: 12, color: BODY_COLOR, phiStart: -Math.PI/2, phiEnd: 0, thetaStart: 0, thetaEnd: Math.PI * 2,});
LIBS.set_I4(alasKananDepan.POSITION_MATRIX);
LIBS.rotateZ(alasKananDepan.POSITION_MATRIX, 0.16);
LIBS.rotateX(alasKananDepan.POSITION_MATRIX, 0.18);
LIBS.rotateY(alasKananDepan.POSITION_MATRIX, 0.0); 
LIBS.translateY(alasKananDepan.POSITION_MATRIX, 0.98);
LIBS.translateZ(alasKananDepan.POSITION_MATRIX, -0.14);

const KakiKananBelakang = new spherocylinder(
  GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix,
  { radiusTop: 0.36, taper: 0.75, height: 1.5, capRx: 0.24, capRy: 0.18, capRz: 0.25, segments: 40, stacks: 3, capRings: 12,
    color: BODY_COLOR,        
    name: "kaki_kanan_belakang",
  }
);
LIBS.set_I4(KakiKananBelakang.POSITION_MATRIX);
LIBS.translateX(KakiKananBelakang.POSITION_MATRIX, +BODY_CONFIG.rx * 0.68);
LIBS.translateY(KakiKananBelakang.POSITION_MATRIX, -BODY_CONFIG.ry * 1.10 + (1.7 * 0.5) - 0.03);
LIBS.translateZ(KakiKananBelakang.POSITION_MATRIX, -BODY_CONFIG.rz * 0.6);
LIBS.rotateX(KakiKananBelakang.POSITION_MATRIX, Math.PI);
LIBS.rotateX(KakiKananBelakang.POSITION_MATRIX, 0.36);
LIBS.rotateZ(KakiKananBelakang.POSITION_MATRIX, 0.16);

const alasKananBelakang = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix,{
    rx: 0.27,
    ry: 0.25, 
    rz: 0.45,   
    segments: 40,
    rings: 12,
    color: BODY_COLOR,  
    phiStart: -Math.PI/2,    
    phiEnd: 0,              
    thetaStart: 0,
    thetaEnd: Math.PI * 2,   
  }
);
LIBS.set_I4(alasKananBelakang.POSITION_MATRIX);
LIBS.rotateZ(alasKananBelakang.POSITION_MATRIX, 0.16);
LIBS.rotateX(alasKananBelakang.POSITION_MATRIX, -0.20);
LIBS.rotateY(alasKananBelakang.POSITION_MATRIX, 0.0);
LIBS.translateY(alasKananBelakang.POSITION_MATRIX, 0.92);
LIBS.translateZ(alasKananBelakang.POSITION_MATRIX, -0.14);

const kakiKiriDepan = new spherocylinder(GL, SHADER_PROGRAM, _position, _color, _normal,_Mmatrix,{
    radiusTop: 0.3,    
    taper: 0.75,    
    height: 1.5,        
    capRx: 0.24, 
    capRy: 0.18, 
    capRz: 0.28,    
    color: BODY_COLOR,
  }
);
LIBS.set_I4(kakiKiriDepan.POSITION_MATRIX);
LIBS.translateX(kakiKiriDepan.POSITION_MATRIX, +BODY_CONFIG.rx * -0.8);
LIBS.translateY(kakiKiriDepan.POSITION_MATRIX, -BODY_CONFIG.ry * 1.10 + (1.5 * 0.5) - 0.03);
LIBS.translateZ(kakiKiriDepan.POSITION_MATRIX, +BODY_CONFIG.rz * 0.35);
LIBS.rotateX(kakiKiriDepan.POSITION_MATRIX, Math.PI);
LIBS.rotateX(kakiKiriDepan.POSITION_MATRIX, -0.05); 
LIBS.rotateZ(kakiKiriDepan.POSITION_MATRIX, -0.18); 

const alasKiriDepan = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _normal,_Mmatrix,{
    rx: 0.27,
    ry: 0.25,   
    rz: 0.45,    
    segments: 40,
    rings: 12,
    color: BODY_COLOR,
    phiStart: -Math.PI/2,    
    phiEnd: 0,             
    thetaStart: 0,
    thetaEnd: Math.PI * 2,  
  }
);
LIBS.set_I4(alasKiriDepan.POSITION_MATRIX);
LIBS.rotateZ(alasKiriDepan.POSITION_MATRIX, -0.16);
LIBS.rotateX(alasKiriDepan.POSITION_MATRIX, 0.18);
LIBS.rotateY(alasKiriDepan.POSITION_MATRIX, 0.0);  
LIBS.translateY(alasKiriDepan.POSITION_MATRIX, 0.98);
LIBS.translateZ(alasKiriDepan.POSITION_MATRIX, -0.14);

function makeKuku(xOffset) {
  const obj = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _normal,_Mmatrix,{
      rx: 0.01, ry: 0.08, rz: 0.006,   
      segments: 8, rings: 2, color: [0, 0, 0],
      thetaStart: 0, thetaEnd: Math.PI * 2,
      phiStart: -Math.PI/2, phiEnd: Math.PI/2,
    }
  );
  LIBS.set_I4(obj.POSITION_MATRIX);
  LIBS.rotateX(obj.POSITION_MATRIX, -(Math.PI / 4)); 
  LIBS.translateX(obj.POSITION_MATRIX, xOffset);  
  LIBS.translateY(obj.POSITION_MATRIX, -0.075);    
  LIBS.translateZ(obj.POSITION_MATRIX, -0.42);   
  LIBS.rotateX(obj.POSITION_MATRIX, 0.10);
  return obj;
}

const kukuKiridepan1 = makeKuku(-0.09);
const kukuKiridepan2 = makeKuku(+0.09);
const kukuKanandepan1 = makeKuku(-0.09);
const kukuKanandepan2 = makeKuku(+0.09);
const kukuKananbelakang1 = makeKuku(-0.09);
const kukuKananbelakang2 = makeKuku(+0.09);
const kukuKiribelakang1 = makeKuku(-0.09);
const kukuKiribelakang2 = makeKuku(+0.09);

const KakiKiriBelakang = new spherocylinder(GL, SHADER_PROGRAM, _position, _color, _normal,_Mmatrix,{
    radiusTop: 0.36,         
    taper: 0.75,           
    height: 1.3,           
    capRx: 0.24, 
    capRy: 0.25, 
    capRz: 0.28, 
    segments: 40, stacks: 3, capRings: 12, color: BODY_COLOR,        
  }
);
LIBS.set_I4(KakiKiriBelakang.POSITION_MATRIX);
LIBS.translateX(KakiKiriBelakang.POSITION_MATRIX, +BODY_CONFIG.rx * -0.68);
LIBS.translateY(KakiKiriBelakang.POSITION_MATRIX, -BODY_CONFIG.ry * 1.10 + (1.7 * 0.5) - 0.03
);

LIBS.translateZ(KakiKiriBelakang.POSITION_MATRIX, -BODY_CONFIG.rz * 0.6);
LIBS.rotateX(KakiKiriBelakang.POSITION_MATRIX, Math.PI);
LIBS.rotateX(KakiKiriBelakang.POSITION_MATRIX, 0.36);
LIBS.rotateZ(KakiKiriBelakang.POSITION_MATRIX, -0.16);

const alasKiriBelakang = new lingkaran(GL, SHADER_PROGRAM, _position, _color,_normal, _Mmatrix,{ 
  rx: 0.27, ry: 0.25, rz: 0.45,   
    segments: 40,
    rings: 12,
    color: BODY_COLOR, 
    phiStart: -Math.PI/2, phiEnd: 0,             
    thetaStart: 0, thetaEnd: Math.PI * 2,  
  }
);
LIBS.set_I4(alasKiriBelakang.POSITION_MATRIX);
LIBS.rotateZ(alasKiriBelakang.POSITION_MATRIX, -0.16);
LIBS.rotateX(alasKiriBelakang.POSITION_MATRIX, -0.20);
LIBS.translateY(alasKiriBelakang.POSITION_MATRIX, 0.92);
LIBS.translateZ(alasKiriBelakang.POSITION_MATRIX, -0.14);

function applyPawRaise(leg, raiseAmount) {
  if (raiseAmount === 0) {
    return;  
  }
  const raiseAngle = (Math.PI / 4) * raiseAmount; 
  const legHeight = 1.5;
  LIBS.translateY(leg.MOVE_MATRIX, legHeight / 2);
  LIBS.rotateX(leg.MOVE_MATRIX, -raiseAngle); 
  LIBS.translateY(leg.MOVE_MATRIX, -legHeight / 2);
}

const tail = new MudkipTail(
  GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix,
  {
    length:     1.3, baseHeight: 0.15, tipHeight:  1.2, baseWidth:  0.02, tipWidth:   0.1,   
    segments: 34, slices: 34, curve: 0.0, color: [198/255,222/255,247/255],
  }
);

const TAIL = {
  MODE: 'sin',          
  START_LEFT: false,    
  AMP_DEG: 24,        
  FREQ_HZ: 1.8,     
  ANG_RIGHT:  24 * Math.PI/180,
  ANG_LEFT:  -24 * Math.PI/180,
  TIME_SCALE: 1.0,
  DUR: {                
    toRight:   0.12,  
    toLeft:    0.22,    
    toCenter:  0.12   
  }
};
function easeInOutQuad(x){ return x<0.5 ? 2*x*x : 1 - Math.pow(-2*x+2,2)/2; }
let t0Tail = performance.now();

function getTailAngle(nowMs){
  const sign = TAIL.START_LEFT ? -1 : 1;
  const t = (nowMs - t0Tail) * 0.001;

  if (TAIL.MODE === 'sin'){
    const A = (TAIL.AMP_DEG * Math.PI / 180);
    const ang = A * Math.sin(2*Math.PI*TAIL.FREQ_HZ*t);
    return sign * ang;
  }

  const D = TAIL.DUR;
  const total = (D.toRight + D.toLeft + D.toCenter) * (TAIL.TIME_SCALE || 1.0);
  let u = t % total;

  const sRight = D.toRight * (TAIL.TIME_SCALE || 1.0);
  if (u < sRight){
    const k = easeInOutQuad(u / sRight);
    return sign * (TAIL.ANG_RIGHT * k);
  }
  u -= sRight;

  const sLeft = D.toLeft * (TAIL.TIME_SCALE || 1.0);
  if (u < sLeft){
    const k = easeInOutQuad(u / sLeft);
    return sign * (TAIL.ANG_RIGHT*(1-k) + TAIL.ANG_LEFT*k);
  }
  u -= sLeft;

  const sCenter = D.toCenter * (TAIL.TIME_SCALE || 1.0);
  const k = easeInOutQuad(Math.min(1, u / sCenter));
  return sign * (TAIL.ANG_LEFT*(1-k) + 0.0*k);
}

function updateTail(nowMs){
  const ang = getTailAngle(nowMs);
  LIBS.set_I4(tail.POSITION_MATRIX);
  LIBS.rotateZ(tail.POSITION_MATRIX, Math.PI / 2);
  LIBS.rotateX(tail.POSITION_MATRIX, LIBS.degToRad(20));
  LIBS.scale(tail.POSITION_MATRIX, 1.5, 2.5, 1.5);
  LIBS.translateZ(tail.POSITION_MATRIX, -(BODY_CONFIG.rz * 1.00));
  LIBS.translateY(tail.POSITION_MATRIX, -0.06);
  LIBS.rotateY(tail.POSITION_MATRIX, ang);
}

const BODY_PARTS = {
  head: Kepala,
  body: Badan,
  legs: {
    frontLeft:  kakiKiriDepan,
    frontRight: kakiKananDepan,
    backLeft:   KakiKiriBelakang,
    backRight:  KakiKananBelakang,
  }
};

const ORIGINAL_TRANSFORMS = {
  body: {
    posY: -0.05,
    posZ: -0.25,
    rotX: -0.06,
  },
  head: {
    posY: 1.4,
    posZ: 1.1,
    rotX: 0.08,
  },
};

const mudkipAnim = new MudkipAnimation(BODY_PARTS);

function applyLegCurl(leg, curlAmount) {
  if (curlAmount === 0) {
    // Reset ke posisi default
    LIBS.set_I4(leg.MOVE_MATRIX);
    return;
  }
  LIBS.set_I4(leg.MOVE_MATRIX);
  const maxCurlAngle = Math.PI / 3;  
  const curlAngle = maxCurlAngle * curlAmount;
  const legHeight = 1.5;  
  LIBS.translateY(leg.MOVE_MATRIX, legHeight / 2);
  LIBS.rotateX(leg.MOVE_MATRIX, -curlAngle);  
  LIBS.translateY(leg.MOVE_MATRIX, -legHeight / 2);
}

function applyAnimation() {
  const anim = mudkipAnim.getAnimationData();
  LIBS.set_I4(Rig.POSITION_MATRIX);
  LIBS.translateX(Rig.POSITION_MATRIX, anim.bodyOffset.x);
  LIBS.translateY(Rig.POSITION_MATRIX, anim.bodyOffset.y);
  LIBS.translateZ(Rig.POSITION_MATRIX, anim.bodyOffset.z);
  LIBS.set_I4(Badan.MOVE_MATRIX);
  if (anim.bodySquash !== 1.0) {
    LIBS.scale(Badan.MOVE_MATRIX, 1.0, anim.bodySquash, 1.0);
  }
  LIBS.set_I4(Kepala.MOVE_MATRIX);
  if (anim.headStretch !== 0) {
    LIBS.translateY(Kepala.MOVE_MATRIX, anim.headStretch);
  }
  LIBS.rotateX(Kepala.MOVE_MATRIX, 0.08 + anim.headTilt.x);
  LIBS.rotateY(Kepala.MOVE_MATRIX, anim.headTilt.y);
  LIBS.rotateZ(Kepala.MOVE_MATRIX, anim.headTilt.z);  
  applyLegCurl(BODY_PARTS.legs.frontLeft,  anim.legCurls.fl);
  applyLegCurl(BODY_PARTS.legs.frontRight, anim.legCurls.fr);
  applyLegCurl(BODY_PARTS.legs.backLeft,   anim.legCurls.bl);
  applyLegCurl(BODY_PARTS.legs.backRight,  anim.legCurls.br);
  applyPawRaise(BODY_PARTS.legs.frontLeft,  anim.pawRaise.fl);
  applyPawRaise(BODY_PARTS.legs.frontRight, anim.pawRaise.fr);
  applyPawRaise(BODY_PARTS.legs.backLeft,   anim.pawRaise.bl);
  applyPawRaise(BODY_PARTS.legs.backRight,  anim.pawRaise.br);
}








// Hierarki
const Rig = new group(_Mmatrix);

// rig -> (badan, kepala)

// kepala -> (mata, pipi, dagu)
PipiKanan.childs.push(ConeKanan, ConeKananAtas, ConeKananBawah);
PipiKiri.childs.push(ConeKiri, ConeKiriAtas, ConeKiriBawah);
EyeL.childs.push(EyeL_Hi, EyeL_Sh); EyeR.childs.push(EyeR_Hi, EyeR_Sh);
Dagu.childs.push(HidungKanan, HidungKiri);
Kepala.childs.push(PipiKanan, PipiKiri, Dagu, EyeL, EyeR, GarisPemisah);

SiripTengah.childs.push(GarisSiripKanan, GarisSiripKiri, GarisSiripKananK, GarisSiripKiriK);
Kepala.childs.push(SiripTengah);
 
alasKiriDepan.childs.push(kukuKiridepan1, kukuKiridepan2);
alasKananDepan.childs.push(kukuKanandepan1, kukuKanandepan2);
alasKananBelakang.childs.push(kukuKananbelakang1, kukuKananbelakang2);
alasKiriBelakang.childs.push(kukuKiribelakang1, kukuKiribelakang2);

kakiKananDepan.childs.push(alasKananDepan);
KakiKananBelakang.childs.push(alasKananBelakang);
kakiKiriDepan.childs.push(alasKiriDepan);
KakiKiriBelakang.childs.push(alasKiriBelakang);
Badan.childs.push(tail, kakiKiriDepan, kakiKananDepan, KakiKananBelakang, KakiKiriBelakang);

BellyPatchDepan.childs.push(BellyLineBelakang);
Badan.childs.push(BellyPatchDepan, OutlineKiri, OutlineKanan);

Rig.childs.push(Badan);
Badan.childs.push(Kepala);

Rig.setup(); // Setup rig sebagai root baru

    /*========================= MATRICES ========================= */
   
    var PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    var VIEWMATRIX = LIBS.get_I4();

    LIBS.translateZ(VIEWMATRIX, -18);

    var THETA = 0, PHI = 0;
    var drag = false;
    var x_prev, y_prev;
    var FRICTION = 0.05;
    var dX = 0, dY = 0;

    var mouseDown = function (e) {
        drag = true;
        x_prev = e.pageX, y_prev = e.pageY;
        e.preventDefault();
        return false;
    };

    var mouseUp = function (e) {
        drag = false;
    };

    var mouseMove = function (e) {
        if (!drag) return false;
        
        // ===== FIX: Scale mouse movement dengan DPR =====
        dX = (e.pageX - x_prev) * 2 * Math.PI / (CANVAS.width / dpr);
        dY = (e.pageY - y_prev) * 2 * Math.PI / (CANVAS.height / dpr);
        
        THETA += dX;
        PHI += dY;
        x_prev = e.pageX, y_prev = e.pageY;
        e.preventDefault();
    };

    CANVAS.addEventListener("mousedown", mouseDown, false);
    CANVAS.addEventListener("mouseup", mouseUp, false);
    CANVAS.addEventListener("mouseout", mouseUp, false);
    CANVAS.addEventListener("mousemove", mouseMove, false);

    var SPEED = 0.05;

    var keyDown = function (e) {
        if (e.key === 'w') {
            dY -= SPEED;
        }
        else if (e.key === 'a') {
            dX -= SPEED;
        }
        else if (e.key === 's') {
            dY += SPEED;
        }
        else if (e.key === 'd') {
            dX += SPEED;
        }
    };

    window.addEventListener("keydown", keyDown, false);

    // ===== BONUS: Handle window resize =====
    window.addEventListener('resize', function() {
        CANVAS.width = window.innerWidth * dpr;
        CANVAS.height = window.innerHeight * dpr;
        CANVAS.style.width = window.innerWidth + 'px';
        CANVAS.style.height = window.innerHeight + 'px';
        
        // Update projection matrix dengan aspect ratio baru
        PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    });

    /*========================= DRAWING ========================= */
    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearColor(0.5, 0.5, 0.5, 1.0);
    GL.clearDepth(1.0);

    var time_prev = 0;
    var animate = function (time) {
        // ===== Viewport sudah correct dengan canvas actual size =====
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
      
        GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);

        LIBS.set_I4(Rig.MOVE_MATRIX);
        LIBS.rotateY(Rig.MOVE_MATRIX, THETA); 
        LIBS.rotateX(Rig.MOVE_MATRIX, PHI); 
        updateTail(time);
        updateSiripTengah(time);
         mudkipAnim.update(time);
        applyAnimation();
        Rig.render(LIBS.get_I4());

        if (!drag) {
            dX *= (1 - FRICTION);
            dY *= (1 - FRICTION);
            THETA += dX;
            PHI += dY;
        }

        GL.flush();
        window.requestAnimationFrame(animate);
    };

    animate(0);
}

window.addEventListener('load', main);

