import { MudkipAnimation } from "./mudkip-animation.js";

function applyLegCurl(leg, curlAmount) {
  // curlAmount: 0 = lurus, 1 = fully curled
  
  if (curlAmount === 0) {
    LIBSMudkip.set_I4(leg.MOVE_MATRIX);
    return;
  }
  
  LIBSMudkip.set_I4(leg.MOVE_MATRIX);
  
  // Rotate kaki ke atas (curl)
  // Pivot di pangkal kaki (top), rotate X (bend forward)
  const maxCurlAngle = Math.PI / 3;  // 60 derajat max curl
  const curlAngle = maxCurlAngle * curlAmount;
  
  // Translate ke pivot point (pangkal kaki)
  const legHeight = 1.5;  // height dari spherocylinder
  LIBSMudkip.translateY(leg.MOVE_MATRIX, legHeight / 2);
  LIBSMudkip.rotateX(leg.MOVE_MATRIX, -curlAngle);  
  LIBSMudkip.translateY(leg.MOVE_MATRIX, -legHeight / 2);
}

function applyPawRaise(leg, raiseAmount) {
  if (raiseAmount === 0) {
    return;  
  }
  
  const raiseAngle = (Math.PI / 4) * raiseAmount;  // max 45 degrees
  const legHeight = 1.5;
  
  LIBSMudkip.translateY(leg.MOVE_MATRIX, legHeight / 2);
  LIBSMudkip.rotateX(leg.MOVE_MATRIX, -raiseAngle); 
  LIBSMudkip.translateY(leg.MOVE_MATRIX, -legHeight / 2);
}

function easeOutQuad(x) { 
  return 1 - (1 - x) * (1 - x); 
}

function easeInCubic(x) { 
  return x * x * x; 
}

function easeOutBack(x) { 
  const c = 1.70158; 
  const s = 1.525 * c; 
  x -= 1; 
  return 1 + (x * x * ((c + 1) * x + c)); 
}

function easeInOutQuad(x) {
  return x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x);
}

// export animasi mudkip
export function setupMudkipAnimation(mudkipParts) {
  const { parts, config, MudkipRig } = mudkipParts;

  const mudkipAnim = new MudkipAnimation({
    head: parts.head,
    body: parts.body,
    legs: parts.legs,
  });

  let t0Tail = performance.now();
  let t0Fin = performance.now();

  function getFinAngle(nowMs) {
    const tReal = (nowMs - t0Fin) * 0.001;
    const tScaled = tReal / config.FIN_CONFIG.TIME_SCALE;
    
    if (config.FIN_CONFIG.MODE === 'bouncy') {
      const baseFreq = config.FIN_CONFIG.BOUNCE_FREQUENCY;
      const baseCycle = Math.sin(tScaled * Math.PI * 2 * baseFreq);
      
      const bounceFreq = baseFreq * 4;  
      const bouncePhase = tScaled * Math.PI * 2 * bounceFreq;
      
      const bounceIntensity = Math.abs(baseCycle); 
      const bounce = Math.sin(bouncePhase) * config.FIN_CONFIG.BOUNCE_DAMPING * bounceIntensity;
      
      const angle = config.FIN_CONFIG.ANG_MAX * (baseCycle + bounce * 0.3);
      
      return angle;
    } else {
      return 0.0;
    }
  }

  function updateFin(nowMs) {
    const angle = getFinAngle(nowMs);
    const fin = parts.fin;
    const FIN = config.FIN_CONFIG;

    LIBSMudkip.set_I4(fin.POSITION_MATRIX);

    if (FIN.PIVOT_BASE) {
      LIBSMudkip.translateY(fin.POSITION_MATRIX, +FIN.RY);
      LIBSMudkip.rotateZ(fin.POSITION_MATRIX, angle);
      LIBSMudkip.translateY(fin.POSITION_MATRIX, -FIN.RY);
    } else {
      LIBSMudkip.rotateZ(fin.POSITION_MATRIX, angle);
    }

    LIBSMudkip.translateY(fin.POSITION_MATRIX, FIN.BASE_Y);
    LIBSMudkip.translateZ(fin.POSITION_MATRIX, FIN.BASE_Z);
  }

  function getTailAngle(nowMs) {
    const TAIL = config.TAIL_CONFIG;
    const sign = TAIL.START_LEFT ? -1 : 1;
    const t = (nowMs - t0Tail) * 0.001;

    if (TAIL.MODE === 'sin') {
      const A = (TAIL.AMP_DEG * Math.PI / 180);
      const ang = A * Math.sin(2 * Math.PI * TAIL.FREQ_HZ * t);
      return sign * ang;
    }

    return 0.0;
  }

  function updateTail(nowMs) {
    const ang = getTailAngle(nowMs);
    const tail = parts.tail;

    LIBSMudkip.set_I4(tail.POSITION_MATRIX);
    LIBSMudkip.rotateZ(tail.POSITION_MATRIX, Math.PI / 2);
    LIBSMudkip.rotateX(tail.POSITION_MATRIX, LIBSMudkip.degToRad(20));
    LIBSMudkip.scale(tail.POSITION_MATRIX, 1.5, 2.5, 1.5);
    LIBSMudkip.translateZ(tail.POSITION_MATRIX, -(config.BODY_CONFIG.rz * 1.00));
    LIBSMudkip.translateY(tail.POSITION_MATRIX, -0.06);
    LIBSMudkip.rotateY(tail.POSITION_MATRIX, ang);
  }

  // animasi badan
  function applyAnimation() {
    const anim = mudkipAnim.getAnimationData();
    
    // posisi mudkip untuk jump
    LIBSMudkip.set_I4(MudkipRig.POSITION_MATRIX);
    LIBSMudkip.translateX(MudkipRig.POSITION_MATRIX, anim.bodyOffset.x);
    LIBSMudkip.translateY(MudkipRig.POSITION_MATRIX, 1.5 + anim.bodyOffset.y);
    LIBSMudkip.translateZ(MudkipRig.POSITION_MATRIX, anim.bodyOffset.z);
    
    LIBSMudkip.set_I4(parts.body.MOVE_MATRIX);
    if (anim.bodySquash !== 1.0) {
      LIBSMudkip.scale(parts.body.MOVE_MATRIX, 1.0, anim.bodySquash, 1.0);
    }
    
    LIBSMudkip.set_I4(parts.head.MOVE_MATRIX);
    if (anim.headStretch !== 0) {
      LIBSMudkip.translateY(parts.head.MOVE_MATRIX, anim.headStretch);
    }
    LIBSMudkip.rotateX(parts.head.MOVE_MATRIX, 0.08 + anim.headTilt.x);
    LIBSMudkip.rotateY(parts.head.MOVE_MATRIX, anim.headTilt.y);
    LIBSMudkip.rotateZ(parts.head.MOVE_MATRIX, anim.headTilt.z);
    
    applyLegCurl(parts.legs.frontLeft, anim.legCurls.fl);
    applyLegCurl(parts.legs.frontRight, anim.legCurls.fr);
    applyLegCurl(parts.legs.backLeft, anim.legCurls.bl);
    applyLegCurl(parts.legs.backRight, anim.legCurls.br);
    
    applyPawRaise(parts.legs.frontLeft, anim.pawRaise.fl);
    applyPawRaise(parts.legs.frontRight, anim.pawRaise.fr);
    applyPawRaise(parts.legs.backLeft, anim.pawRaise.bl);
    applyPawRaise(parts.legs.backRight, anim.pawRaise.br);
    
    if (anim.eyeScale !== 1.0) {
      LIBSMudkip.set_I4(parts.eyes.left.MOVE_MATRIX);
      LIBSMudkip.scale(parts.eyes.left.MOVE_MATRIX, anim.eyeScale, anim.eyeScale, anim.eyeScale);
      
      LIBSMudkip.set_I4(parts.eyes.right.MOVE_MATRIX);
      LIBSMudkip.scale(parts.eyes.right.MOVE_MATRIX, anim.eyeScale, anim.eyeScale, anim.eyeScale);
    } else {
      LIBSMudkip.set_I4(parts.eyes.left.MOVE_MATRIX);
      LIBSMudkip.set_I4(parts.eyes.right.MOVE_MATRIX);
    }
  }

  function getMudkipPosition() {
    const anim = mudkipAnim.getAnimationData();
    return [
      anim.bodyOffset.x,
      anim.bodyOffset.y,
      anim.bodyOffset.z
    ];
  }

  function update(timeMs) {
    mudkipAnim.update(timeMs);
  }

  return {
    update,
    updateTail,
    updateFin,
    applyAnimation,
    getMudkipPosition,
    
    _mudkipAnim: mudkipAnim,
  };
}