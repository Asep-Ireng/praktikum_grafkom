// mudkip-part.js - Mudkip Body Parts Definition
import { ellipsoid } from "./ellipsoidMudkip.js";
import { lingkaran } from "./lingkaran-setengahMudkip.js";
import { group } from "./groupMudkip.js";
import { cone } from "./coneMudkip.js";
import { mudkipBody } from "./mudkip-body.js";
import { spherocylinder } from "./spherocylinderMudkip.js";
import { BellyPatch } from "./belly-patch.js";
import { BellyOutline } from "./belly-outline.js";
import { MudkipTail } from "./mudkip-tail.js";

const BODY_COLOR = [123 / 255, 190 / 255, 239 / 255];
const BELLY_COLOR = [198/255, 222/255, 247/255];

const BODY_CONFIG = {
  rx: 1.2,
  ry: 1.0,
  rz: 1.7,
  flattenStartPhi: -0.22,
  flattenStrength: 0.65,
  flattenPlaneRatio: 0.92,
  flattenSharpness: 2.0,
  flattenLateralTaper: 0.1,
};

const FIN_CONFIG = {
  BASE_Y: 1.2,
  BASE_Z: -0.1,
  RY: 2.1,
  PIVOT_BASE: true,
  MODE: 'bouncy',
  TIME_SCALE: 1.0,
  ANG_MAX: 20 * Math.PI / 180,
  BOUNCE_FREQUENCY: 1.0,
  BOUNCE_DAMPING: 0.3,
};

const TAIL_CONFIG = {
  MODE: 'sin',
  START_LEFT: false,
  AMP_DEG: 24,
  FREQ_HZ: 1.8,
  TIME_SCALE: 1.0,
};

function makeKuku(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, xOffset) {
  const obj = new lingkaran(
    GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix,
    {
      rx: 0.01,
      ry: 0.08,
      rz: 0.006,
      segments: 8, rings: 2,
      color: [0, 0, 0],
      thetaStart: 0, thetaEnd: Math.PI * 2,
      phiStart: -Math.PI/2, phiEnd: Math.PI/2,
    }
  );
  LIBSMudkip.set_I4(obj.POSITION_MATRIX);
  LIBSMudkip.rotateX(obj.POSITION_MATRIX, -(Math.PI / 4));
  LIBSMudkip.translateX(obj.POSITION_MATRIX, xOffset);
  LIBSMudkip.translateY(obj.POSITION_MATRIX, -0.075);
  LIBSMudkip.translateZ(obj.POSITION_MATRIX, -0.42);
  LIBSMudkip.rotateX(obj.POSITION_MATRIX, 0.10);
  return obj;
}

export function createMudkipParts(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix) {
  
  const Kepala = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 1.6, ry: 1.4, rz: 1.7,
    segments: 48, rings: 32,
    color: BODY_COLOR
  });
  LIBSMudkip.set_I4(Kepala.POSITION_MATRIX);
  LIBSMudkip.translateY(Kepala.POSITION_MATRIX, 1.4);
  LIBSMudkip.translateZ(Kepala.POSITION_MATRIX, 1.1);
  LIBSMudkip.set_I4(Kepala.MOVE_MATRIX);
  LIBSMudkip.rotateX(Kepala.MOVE_MATRIX, 0.08);

  const PipiKanan = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.6, ry: 0.8, rz: 0.8,
    segments: 36, rings: 24,
    color: [255/255, 173/255, 66/255]
  });
  LIBSMudkip.translateX(PipiKanan.POSITION_MATRIX, 1.1);
  LIBSMudkip.translateY(PipiKanan.POSITION_MATRIX, -0.1);

  const PipiKiri = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.6, ry: 0.8, rz: 0.8,
    segments: 36, rings: 24,
    color: [255/255, 173/255, 66/255]
  });
  LIBSMudkip.translateX(PipiKiri.POSITION_MATRIX, -1.1);
  LIBSMudkip.translateY(PipiKiri.POSITION_MATRIX, -0.1);

  const ConeKanan = new cone(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    radiusBottom: 0.26, radiusTop: 0.02, height: 0.90, segments: 32,
    color: [255/255, 173/255, 66/255]
  });
  LIBSMudkip.set_I4(ConeKanan.POSITION_MATRIX);
  LIBSMudkip.rotateY(ConeKanan.POSITION_MATRIX, -8 * Math.PI/180);
  LIBSMudkip.translateY(ConeKanan.POSITION_MATRIX, -0.06);
  LIBSMudkip.translateX(ConeKanan.POSITION_MATRIX, 0.5);
  LIBSMudkip.scale(ConeKanan.MOVE_MATRIX, 1.0, 0.95, 0.75);

  const ConeKananAtas = new cone(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    radiusBottom: 0.26, radiusTop: 0.02, height: 0.90, segments: 32,
    color: [255/255, 173/255, 66/255]
  });
  LIBSMudkip.set_I4(ConeKananAtas.POSITION_MATRIX);
  LIBSMudkip.rotateZ(ConeKananAtas.POSITION_MATRIX, 45 * Math.PI/180);
  LIBSMudkip.rotateY(ConeKananAtas.POSITION_MATRIX, -8 * Math.PI/180);
  LIBSMudkip.translateY(ConeKananAtas.POSITION_MATRIX, 0.04);
  LIBSMudkip.translateX(ConeKananAtas.POSITION_MATRIX, 0.4);
  LIBSMudkip.scale(ConeKananAtas.MOVE_MATRIX, 1.0, 0.95, 0.75);

  const ConeKananBawah = new cone(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    radiusBottom: 0.26, radiusTop: 0.02, height: 0.90, segments: 32,
    color: [255/255, 173/255, 66/255]
  });
  LIBSMudkip.set_I4(ConeKananBawah.POSITION_MATRIX);
  LIBSMudkip.rotateZ(ConeKananBawah.POSITION_MATRIX, -48 * Math.PI/180);
  LIBSMudkip.rotateY(ConeKananBawah.POSITION_MATRIX, -8 * Math.PI/180);
  LIBSMudkip.translateY(ConeKananBawah.POSITION_MATRIX, -0.04);
  LIBSMudkip.translateX(ConeKananBawah.POSITION_MATRIX, 0.4);
  LIBSMudkip.scale(ConeKananBawah.MOVE_MATRIX, 1.0, 0.95, 0.75);

  const ConeKiri = new cone(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    radiusBottom: 0.26, radiusTop: 0.02, height: 0.90, segments: 32,
    color: [255/255, 173/255, 66/255]
  });
  LIBSMudkip.set_I4(ConeKiri.POSITION_MATRIX);
  LIBSMudkip.rotateY(ConeKiri.POSITION_MATRIX, Math.PI);
  LIBSMudkip.rotateY(ConeKiri.POSITION_MATRIX, -8 * Math.PI/180);
  LIBSMudkip.translateY(ConeKiri.POSITION_MATRIX, -0.06);
  LIBSMudkip.translateX(ConeKiri.POSITION_MATRIX, -0.5);
  LIBSMudkip.scale(ConeKiri.MOVE_MATRIX, 1.0, 0.95, 0.75);

  const ConeKiriAtas = new cone(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    radiusBottom: 0.26, radiusTop: 0.02, height: 0.80, segments: 32,
    color: [255/255, 173/255, 66/255]
  });
  LIBSMudkip.set_I4(ConeKiriAtas.POSITION_MATRIX);
  LIBSMudkip.rotateZ(ConeKiriAtas.POSITION_MATRIX, 138 * Math.PI/180);
  LIBSMudkip.rotateY(ConeKiriAtas.POSITION_MATRIX, 8 * Math.PI/180);
  LIBSMudkip.translateY(ConeKiriAtas.POSITION_MATRIX, 0.1);
  LIBSMudkip.translateX(ConeKiriAtas.POSITION_MATRIX, -0.4);
  LIBSMudkip.scale(ConeKiriAtas.MOVE_MATRIX, 1.0, 0.95, 0.75);

  const ConeKiriBawah = new cone(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    radiusBottom: 0.26, radiusTop: 0.02, height: 0.80, segments: 32,
    color: [255/255, 173/255, 66/255]
  });
  LIBSMudkip.set_I4(ConeKiriBawah.POSITION_MATRIX);
  LIBSMudkip.rotateZ(ConeKiriBawah.POSITION_MATRIX, -138 * Math.PI/180);
  LIBSMudkip.rotateY(ConeKiriBawah.POSITION_MATRIX, 8 * Math.PI/180);
  LIBSMudkip.translateY(ConeKiriBawah.POSITION_MATRIX, -0.2);
  LIBSMudkip.translateX(ConeKiriBawah.POSITION_MATRIX, -0.4);
  LIBSMudkip.scale(ConeKiriBawah.MOVE_MATRIX, 1.0, 0.95, 0.75);

  const Dagu = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 1.6, ry: 1.4, rz: 1.70,
    segments: 64, rings: 32,
    color: BELLY_COLOR,
    phiStart: -Math.PI/2,
    phiEnd: -Math.PI/17,
    thetaStart: 0, thetaEnd: Math.PI
  });
  LIBSMudkip.translateY(Dagu.POSITION_MATRIX, -0.02);
  LIBSMudkip.translateZ(Dagu.POSITION_MATRIX, 0.0);

  const GarisPemisah = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 1.62, ry: 1.5, rz: 1.75,
    segments: 64, rings: 6,
    color: [0, 0, 0],
    phiStart: -Math.PI/17 - 0.01,
    phiEnd: -Math.PI/17 + 0.01,
    thetaStart: Math.PI/8,
    thetaEnd: Math.PI*7/8
  });
  LIBSMudkip.translateY(GarisPemisah.POSITION_MATRIX, -0.02);
  LIBSMudkip.translateZ(GarisPemisah.POSITION_MATRIX, -0.05);

  const HidungKanan = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.015, ry: 0.025, rz: 0.01,
    segments: 12, rings: 8,
    color: [0, 0, 0]
  });
  LIBSMudkip.set_I4(HidungKanan.POSITION_MATRIX);
  LIBSMudkip.translateX(HidungKanan.POSITION_MATRIX, 0.17);
  LIBSMudkip.translateY(HidungKanan.POSITION_MATRIX, -0.1);
  LIBSMudkip.translateZ(HidungKanan.POSITION_MATRIX, 1.68);

  const HidungKiri = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.015, ry: 0.025, rz: 0.01,
    segments: 12, rings: 8,
    color: [0, 0, 0]
  });
  LIBSMudkip.set_I4(HidungKiri.POSITION_MATRIX);
  LIBSMudkip.translateX(HidungKiri.POSITION_MATRIX, -0.15);
  LIBSMudkip.translateY(HidungKiri.POSITION_MATRIX, -0.1);
  LIBSMudkip.translateZ(HidungKiri.POSITION_MATRIX, 1.68);

  const EyeL = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.18, ry: 0.26, rz: 0.15,
    segments: 36, rings: 24,
    color: [0.02, 0.02, 0.02]
  });
  LIBSMudkip.translateX(EyeL.POSITION_MATRIX, -0.58);
  LIBSMudkip.translateY(EyeL.POSITION_MATRIX, 0.15);
  LIBSMudkip.translateZ(EyeL.POSITION_MATRIX, 1.5);
  LIBSMudkip.scale(EyeL.POSITION_MATRIX, 1.0, 1.05, 0.95);
  LIBSMudkip.rotateY(EyeL.POSITION_MATRIX, +0.08);

  const EyeL_Hi = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.08, ry: 0.108, rz: 0.05,
    color: [1, 1, 1]
  });
  LIBSMudkip.translateX(EyeL_Hi.POSITION_MATRIX, -0.06);
  LIBSMudkip.translateY(EyeL_Hi.POSITION_MATRIX, +0.09);
  LIBSMudkip.translateZ(EyeL_Hi.POSITION_MATRIX, +0.1);
  LIBSMudkip.rotateZ(EyeL_Hi.POSITION_MATRIX, -0.12);

  const EyeL_Sh = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.07, ry: 0.11, rz: 0.05,
    color: [107/255, 86/255, 96/255]
  });
  LIBSMudkip.translateX(EyeL_Sh.POSITION_MATRIX, +0.008);
  LIBSMudkip.translateY(EyeL_Sh.POSITION_MATRIX, -0.07);
  LIBSMudkip.translateZ(EyeL_Sh.POSITION_MATRIX, +0.11);
  LIBSMudkip.scale(EyeL_Sh.POSITION_MATRIX, 1.10, 0.85, 1.00);
  LIBSMudkip.rotateZ(EyeL_Sh.POSITION_MATRIX, -0.30);

  const EyeR = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.18, ry: 0.26, rz: 0.15,
    segments: 36, rings: 24,
    color: [0.02, 0.02, 0.02]
  });
  LIBSMudkip.translateX(EyeR.POSITION_MATRIX, 0.58);
  LIBSMudkip.translateY(EyeR.POSITION_MATRIX, 0.15);
  LIBSMudkip.translateZ(EyeR.POSITION_MATRIX, 1.5);

  const EyeR_Hi = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.08, ry: 0.13, rz: 0.05,
    color: [1, 1, 1]
  });
  LIBSMudkip.translateX(EyeR_Hi.POSITION_MATRIX, -0.01);
  LIBSMudkip.translateY(EyeR_Hi.POSITION_MATRIX, 0.08);
  LIBSMudkip.translateZ(EyeR_Hi.POSITION_MATRIX, 0.11);
  LIBSMudkip.rotateY(EyeR.POSITION_MATRIX, -0.08);

  const EyeR_Sh = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.08, ry: 0.10, rz: 0.05,
    color: [107/255, 86/255, 96/255]
  });
  LIBSMudkip.translateX(EyeR_Sh.POSITION_MATRIX, +0.07);
  LIBSMudkip.translateY(EyeR_Sh.POSITION_MATRIX, -0.06);
  LIBSMudkip.translateZ(EyeR_Sh.POSITION_MATRIX, +0.095);
  LIBSMudkip.scale(EyeR_Sh.POSITION_MATRIX, 1.10, 0.85, 1.00);
  LIBSMudkip.rotateZ(EyeR_Sh.POSITION_MATRIX, -0.30);

  const SiripTengah = new ellipsoid(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.19, ry: 2.1, rz: 0.8,
    segments: 24, rings: 16,
    color: BODY_COLOR
  });

  const STRIPE_WIDTH = 0.045;
  const GAP_BOTTOM = 1.8;
  const GAP_TOP = 0.06;
  const EPSX = 0.012;
  const THETA_CENTER_RIGHT = -0.50;
  const THETA_CENTER_LEFT = -0.20;

  const GarisSiripKanan = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.19, ry: 2.1, rz: 0.8,
    segments: 96, rings: 64,
    color: [0, 0, 0],
    phiStart: -Math.PI/2 + GAP_BOTTOM,
    phiEnd: Math.PI/2 - GAP_TOP,
    thetaStart: THETA_CENTER_RIGHT - STRIPE_WIDTH/2,
    thetaEnd: THETA_CENTER_RIGHT + STRIPE_WIDTH/2,
  });
  LIBSMudkip.set_I4(GarisSiripKanan.POSITION_MATRIX);
  LIBSMudkip.translateX(GarisSiripKanan.POSITION_MATRIX, +EPSX);
  LIBSMudkip.translateZ(GarisSiripKanan.POSITION_MATRIX, -0.08);

  const GarisSiripKiri = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.19, ry: 2.1, rz: 0.8,
    segments: 96, rings: 64,
    color: [0, 0, 0],
    phiStart: -Math.PI/2 + GAP_BOTTOM,
    phiEnd: Math.PI/2 - GAP_TOP,
    thetaStart: THETA_CENTER_LEFT - STRIPE_WIDTH/2,
    thetaEnd: THETA_CENTER_LEFT + STRIPE_WIDTH/2,
  });
  LIBSMudkip.set_I4(GarisSiripKiri.POSITION_MATRIX);
  LIBSMudkip.translateX(GarisSiripKiri.POSITION_MATRIX, 0.012);
  LIBSMudkip.translateZ(GarisSiripKiri.POSITION_MATRIX, 0.22);

  const thetaBackA = Math.PI + 0.20;
  const GarisSiripKananK = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.19, ry: 2.1, rz: 0.8,
    segments: 48, rings: 32,
    color: [0, 0, 0],
    phiStart: -Math.PI/2 + GAP_BOTTOM,
    phiEnd: Math.PI/2 - GAP_TOP,
    thetaStart: thetaBackA - STRIPE_WIDTH/2,
    thetaEnd: thetaBackA + STRIPE_WIDTH/2,
  });
  LIBSMudkip.set_I4(GarisSiripKananK.POSITION_MATRIX);
  LIBSMudkip.translateX(GarisSiripKananK.POSITION_MATRIX, -0.012);
  LIBSMudkip.translateZ(GarisSiripKananK.POSITION_MATRIX, 0.22);

  const GarisSiripKiriK = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.19, ry: 2.1, rz: 0.8,
    segments: 48, rings: 32,
    color: [0, 0, 0],
    phiStart: -Math.PI/2 + GAP_BOTTOM,
    phiEnd: Math.PI/2 - GAP_TOP,
    thetaStart: thetaBackA - STRIPE_WIDTH/2,
    thetaEnd: thetaBackA + STRIPE_WIDTH/2,
  });
  LIBSMudkip.set_I4(GarisSiripKiriK.POSITION_MATRIX);
  LIBSMudkip.translateX(GarisSiripKiriK.POSITION_MATRIX, -0.012);
  LIBSMudkip.translateZ(GarisSiripKiriK.POSITION_MATRIX, -0.15);

  const Badan = new mudkipBody(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    ...BODY_CONFIG,
    color: BODY_COLOR,
  });
  LIBSMudkip.set_I4(Badan.POSITION_MATRIX);
  LIBSMudkip.translateY(Badan.POSITION_MATRIX, -0.05);
  LIBSMudkip.translateZ(Badan.POSITION_MATRIX, -0.25);
  LIBSMudkip.rotateX(Badan.POSITION_MATRIX, -0.06);

  const BellyPatchDepan = new BellyPatch(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
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
  });
  LIBSMudkip.set_I4(BellyPatchDepan.POSITION_MATRIX);
  LIBSMudkip.translateZ(BellyPatchDepan.POSITION_MATRIX, +0.02);
  LIBSMudkip.translateY(BellyPatchDepan.POSITION_MATRIX, -0.009);

  const OutlineKiri = new BellyOutline(GL, SHADER_PROGRAM, _position, _color, _Mmatrix, {
    side: "left",
    width: 0.02,
    length: 5.0,
    widthTop: 1.15,
    widthBottom: 0.95,
    segments: 2,
    stacks: 128,
    color: [0, 0, 0],
    bodyRx: BODY_CONFIG.rx,
    bodyRy: BODY_CONFIG.ry,
    bodyRz: BODY_CONFIG.rz,
    surfaceEpsilon: 0.04,
  });
  LIBSMudkip.set_I4(OutlineKiri.POSITION_MATRIX);
  LIBSMudkip.translateZ(OutlineKiri.POSITION_MATRIX, +0.02);
  LIBSMudkip.translateY(OutlineKiri.POSITION_MATRIX, -0.009);

  const OutlineKanan = new BellyOutline(GL, SHADER_PROGRAM, _position, _color, _Mmatrix, {
    side: "right",
    width: 0.02,
    length: 5.0,
    widthTop: 1.15,
    widthBottom: 0.95,
    segments: 2,
    stacks: 128,
    color: [0, 0, 0],
    bodyRx: BODY_CONFIG.rx,
    bodyRy: BODY_CONFIG.ry,
    bodyRz: BODY_CONFIG.rz,
    surfaceEpsilon: 0.04,
  });
  LIBSMudkip.set_I4(OutlineKanan.POSITION_MATRIX);
  LIBSMudkip.translateZ(OutlineKanan.POSITION_MATRIX, +0.02);
  LIBSMudkip.translateY(OutlineKanan.POSITION_MATRIX, -0.009);

  const BellyLineBelakang = new BellyPatch(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    widthTop: 1.0,
    widthBottom: 1.0,
    length: 0.02,
    segments: 48,
    stacks: 2,
    color: [0, 0, 0],
    bodyRx: BODY_CONFIG.rx,
    bodyRy: BODY_CONFIG.ry,
    bodyRz: BODY_CONFIG.rz,
    surfaceEpsilon: 0.045
  });
  LIBSMudkip.set_I4(BellyLineBelakang.POSITION_MATRIX);
  LIBSMudkip.rotateX(BellyLineBelakang.POSITION_MATRIX, Math.PI/2);
  LIBSMudkip.translateZ(BellyLineBelakang.POSITION_MATRIX, -0.67);
  LIBSMudkip.translateY(BellyLineBelakang.POSITION_MATRIX, -0.02);

  const kakiKananDepan = new spherocylinder(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
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
  });
  LIBSMudkip.set_I4(kakiKananDepan.POSITION_MATRIX);
  LIBSMudkip.translateX(kakiKananDepan.POSITION_MATRIX, +BODY_CONFIG.rx * 0.8);
  LIBSMudkip.translateY(kakiKananDepan.POSITION_MATRIX, -BODY_CONFIG.ry * 1.10 + (1.5 * 0.5) - 0.03);
  LIBSMudkip.translateZ(kakiKananDepan.POSITION_MATRIX, +BODY_CONFIG.rz * 0.36);
  LIBSMudkip.rotateX(kakiKananDepan.POSITION_MATRIX, Math.PI);
  LIBSMudkip.rotateX(kakiKananDepan.POSITION_MATRIX, -0.05);
  LIBSMudkip.rotateZ(kakiKananDepan.POSITION_MATRIX, 0.18);

  const alasKananDepan = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.27, ry: 0.25, rz: 0.45,
    segments: 40, rings: 12,
    color: BODY_COLOR,
    phiStart: -Math.PI/2, phiEnd: 0,
    thetaStart: 0, thetaEnd: Math.PI * 2,
  });
  LIBSMudkip.set_I4(alasKananDepan.POSITION_MATRIX);
  LIBSMudkip.rotateZ(alasKananDepan.POSITION_MATRIX, 0.16);
  LIBSMudkip.rotateX(alasKananDepan.POSITION_MATRIX, 0.18);
  LIBSMudkip.rotateY(alasKananDepan.POSITION_MATRIX, 0.0);
  LIBSMudkip.translateY(alasKananDepan.POSITION_MATRIX, 0.98);
  LIBSMudkip.translateZ(alasKananDepan.POSITION_MATRIX, -0.14);

  const kukuKanandepan1 = makeKuku(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, -0.09);
  const kukuKanandepan2 = makeKuku(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, +0.09);

  const KakiKananBelakang = new spherocylinder(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    radiusTop: 0.36, taper: 0.75, height: 1.5,
    capRx: 0.24, capRy: 0.18, capRz: 0.25,
    segments: 40, stacks: 3, capRings: 12,
    color: BODY_COLOR,
    name: "kaki_kanan_belakang",
  });
  LIBSMudkip.set_I4(KakiKananBelakang.POSITION_MATRIX);
  LIBSMudkip.translateX(KakiKananBelakang.POSITION_MATRIX, +BODY_CONFIG.rx * 0.68);
  LIBSMudkip.translateY(KakiKananBelakang.POSITION_MATRIX, -BODY_CONFIG.ry * 1.10 + (1.7 * 0.5) - 0.03);
  LIBSMudkip.translateZ(KakiKananBelakang.POSITION_MATRIX, -BODY_CONFIG.rz * 0.6);
  LIBSMudkip.rotateX(KakiKananBelakang.POSITION_MATRIX, Math.PI);
  LIBSMudkip.rotateX(KakiKananBelakang.POSITION_MATRIX, 0.36);
  LIBSMudkip.rotateZ(KakiKananBelakang.POSITION_MATRIX, 0.16);

  const alasKananBelakang = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.27, ry: 0.25, rz: 0.45,
    segments: 40, rings: 12,
    color: BODY_COLOR,
    phiStart: -Math.PI/2, phiEnd: 0,
    thetaStart: 0, thetaEnd: Math.PI * 2,
  });
  LIBSMudkip.set_I4(alasKananBelakang.POSITION_MATRIX);
  LIBSMudkip.rotateZ(alasKananBelakang.POSITION_MATRIX, 0.16);
  LIBSMudkip.rotateX(alasKananBelakang.POSITION_MATRIX, -0.20);
  LIBSMudkip.rotateY(alasKananBelakang.POSITION_MATRIX, 0.0);
  LIBSMudkip.translateY(alasKananBelakang.POSITION_MATRIX, 0.92);
  LIBSMudkip.translateZ(alasKananBelakang.POSITION_MATRIX, -0.14);

  const kukuKananbelakang1 = makeKuku(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, -0.09);
  const kukuKananbelakang2 = makeKuku(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, +0.09);

  const kakiKiriDepan = new spherocylinder(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    radiusTop: 0.3, taper: 0.75, height: 1.5,
    capRx: 0.24, capRy: 0.18, capRz: 0.28,
    color: BODY_COLOR,
    name: "kaki_kiri_depan",
  });
  LIBSMudkip.set_I4(kakiKiriDepan.POSITION_MATRIX);
  LIBSMudkip.translateX(kakiKiriDepan.POSITION_MATRIX, +BODY_CONFIG.rx * -0.8);
  LIBSMudkip.translateY(kakiKiriDepan.POSITION_MATRIX, -BODY_CONFIG.ry * 1.10 + (1.5 * 0.5) - 0.03);
  LIBSMudkip.translateZ(kakiKiriDepan.POSITION_MATRIX, +BODY_CONFIG.rz * 0.35);
  LIBSMudkip.rotateX(kakiKiriDepan.POSITION_MATRIX, Math.PI);
  LIBSMudkip.rotateX(kakiKiriDepan.POSITION_MATRIX, -0.05);
  LIBSMudkip.rotateZ(kakiKiriDepan.POSITION_MATRIX, -0.18);

  const alasKiriDepan = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.27, ry: 0.25, rz: 0.45,
    segments: 40, rings: 12,
    color: BODY_COLOR,
    phiStart: -Math.PI/2, phiEnd: 0,
    thetaStart: 0, thetaEnd: Math.PI * 2,
  });
  LIBSMudkip.set_I4(alasKiriDepan.POSITION_MATRIX);
  LIBSMudkip.rotateZ(alasKiriDepan.POSITION_MATRIX, -0.16);
  LIBSMudkip.rotateX(alasKiriDepan.POSITION_MATRIX, 0.18);
  LIBSMudkip.rotateY(alasKiriDepan.POSITION_MATRIX, 0.0);
  LIBSMudkip.translateY(alasKiriDepan.POSITION_MATRIX, 0.98);
  LIBSMudkip.translateZ(alasKiriDepan.POSITION_MATRIX, -0.14);

  const kukuKiridepan1 = makeKuku(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, -0.09);
  const kukuKiridepan2 = makeKuku(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, +0.09);

  const KakiKiriBelakang = new spherocylinder(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    radiusTop: 0.36, taper: 0.75, height: 1.3,
    capRx: 0.24, capRy: 0.25, capRz: 0.28,
    segments: 40, stacks: 3, capRings: 12,
    color: BODY_COLOR,
    name: "kaki_kiri_belakang",
  });
  LIBSMudkip.set_I4(KakiKiriBelakang.POSITION_MATRIX);
  LIBSMudkip.translateX(KakiKiriBelakang.POSITION_MATRIX, +BODY_CONFIG.rx * -0.68);
  LIBSMudkip.translateY(KakiKiriBelakang.POSITION_MATRIX, -BODY_CONFIG.ry * 1.10 + (1.7 * 0.5) - 0.03);
  LIBSMudkip.translateZ(KakiKiriBelakang.POSITION_MATRIX, -BODY_CONFIG.rz * 0.6);
  LIBSMudkip.rotateX(KakiKiriBelakang.POSITION_MATRIX, Math.PI);
  LIBSMudkip.rotateX(KakiKiriBelakang.POSITION_MATRIX, 0.36);
  LIBSMudkip.rotateZ(KakiKiriBelakang.POSITION_MATRIX, -0.16);

  const alasKiriBelakang = new lingkaran(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    rx: 0.27, ry: 0.25, rz: 0.45,
    segments: 40, rings: 12,
    color: BODY_COLOR,
    phiStart: -Math.PI/2, phiEnd: 0,
    thetaStart: 0, thetaEnd: Math.PI * 2,
  });
  LIBSMudkip.set_I4(alasKiriBelakang.POSITION_MATRIX);
  LIBSMudkip.rotateZ(alasKiriBelakang.POSITION_MATRIX, -0.16);
  LIBSMudkip.rotateX(alasKiriBelakang.POSITION_MATRIX, -0.20);
  LIBSMudkip.translateY(alasKiriBelakang.POSITION_MATRIX, 0.92);
  LIBSMudkip.translateZ(alasKiriBelakang.POSITION_MATRIX, -0.14);

  const kukuKiribelakang1 = makeKuku(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, -0.09);
  const kukuKiribelakang2 = makeKuku(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, +0.09);

  const tail = new MudkipTail(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
    length: 1.3,
    baseHeight: 0.15,
    tipHeight: 1.2,
    baseWidth: 0.02,
    tipWidth: 0.1,
    segments: 34,
    slices: 34,
    curve: 0.0,
    color: BELLY_COLOR,
  });

  // hierarki
  PipiKanan.childs.push(ConeKanan, ConeKananAtas, ConeKananBawah);
  PipiKiri.childs.push(ConeKiri, ConeKiriAtas, ConeKiriBawah);

  EyeL.childs.push(EyeL_Hi, EyeL_Sh);
  EyeR.childs.push(EyeR_Hi, EyeR_Sh);

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

  Badan.childs.push(Kepala);

  const CameraRig = new group(_Mmatrix);
  const MudkipRig = new group(_Mmatrix);
  CameraRig.childs.push(MudkipRig);
  MudkipRig.childs.push(Badan);

  return {
    CameraRig,
    MudkipRig,
    parts: {
      body: Badan,
      head: Kepala,
      tail: tail,
      fin: SiripTengah,
      legs: {
        frontLeft: kakiKiriDepan,
        frontRight: kakiKananDepan,
        backLeft: KakiKiriBelakang,
        backRight: KakiKananBelakang,
      },
      cheeks: {
        left: PipiKiri,
        right: PipiKanan,
      },
      eyes: {
        left: EyeL,
        right: EyeR,
      },
      belly: {
        patch: BellyPatchDepan,
        outlineLeft: OutlineKiri,
        outlineRight: OutlineKanan,
        backLine: BellyLineBelakang,
      },
    },
    config: {
      BODY_COLOR,
      BELLY_COLOR,
      BODY_CONFIG,
      FIN_CONFIG,
      TAIL_CONFIG,
    }
  };
}