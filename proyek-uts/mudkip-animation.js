// mudkip-animation.js - FIXED VERSION
export class MudkipAnimation {
  constructor(bodyParts, config = {}) {
    this.parts = {
      head: bodyParts.head,
      body: bodyParts.body,
      legs: bodyParts.legs,

      
    };

    // ===== TIMING (dalam detik) =====
    this.durations = {
      anticipation: 0.25,
      airborne:     0.50,
      landing:      0.20,
      hold:         0.2,
      
      anticipation2: 0.25,
      airborne2:     0.50,
      landing2:      0.30,
      holdDown:      0.6,    // ← FIX: tambah ini (hilang!)
      
      anticipation3: 0.25,
      airborne3:     0.50,
      landing3:      0.20,
      holdFinal:     1.0,  
      
      pawRaise:  0.4,    // naik
      pawHold:   0.3,    // hold 1 detik
      pawLower:  0.7,  
      
      pawRaise2: 0.4,
      pawHold2:  1.0,
      pawLower2: 0.7,
      restHold:  2.0,  // turun bersamaan (kepala + kaki) 
    };

    // ===== JUMP PARAMETERS =====
    this.jump = {
      backwardDist: -1.8,
      forwardDist:  2.5,
      height:       0.9,
      legCurl:      0.3,
      headDownTilt: 0.3,
      squashAmount: 0.15,

      pawRaiseAngle: Math.PI / 4,  // 45° (π/4)
      headTiltSide: 0.3,  
    };

    // Animation data (CUMA 1x!)
    this.animData = {
      bodyOffset: { x: 0, y: 0, z: 0 },
      bodySquash: 1.0,
      headTilt:   { x: 0, y: 0, z: 0 },
      headStretch: 0,
      legCurls:   { fl: 0, fr: 0, bl: 0, br: 0 },
      pawRaise: { fl: 0, fr: 0, bl: 0, br: 0 },
    };

    // State management
    this.phase = 'anticipation';
    this.phaseTime = 0;
    this.prevHeadTilt = 0;
    this.lastTime = performance.now();
  }

  // ===== EASING FUNCTIONS =====
  easeInOutQuad(t) {
    return t < 0.5 ? 2*t*t : 1 - 2*(1-t)*(1-t);
  }
  
  easeOutQuad(t) {
    return 1 - (1-t)*(1-t);
  }
  
  easeInQuad(t) {
    return t*t;
  }

  // ===== UPDATE =====
  update(timeMs) {
    const dt = (timeMs - this.lastTime) * 0.001;
    this.lastTime = timeMs;
    
    this.phaseTime += dt;
    const duration = this.durations[this.phase];
    
    if (this.phaseTime >= duration) {
      this.phaseTime = 0;
      this.nextPhase();
    }

    this.updateCurrentPhase();
  }

  // ===== NEXT PHASE =====
  nextPhase() {
  if (this.phase === 'anticipation') {
    this.phase = 'airborne';
  } else if (this.phase === 'airborne') {
    this.phase = 'landing';
  } else if (this.phase === 'landing') {
    this.phase = 'hold';
  } else if (this.phase === 'hold') {
    this.phase = 'anticipation2';
  } else if (this.phase === 'anticipation2') {
    this.phase = 'airborne2';
  } else if (this.phase === 'airborne2') {
    this.phase = 'landing2';
  } else if (this.phase === 'landing2') {
    this.phase = 'holdDown';
  } else if (this.phase === 'holdDown') {
    this.phase = 'anticipation3';
  } else if (this.phase === 'anticipation3') {
    this.phase = 'airborne3';
  } else if (this.phase === 'airborne3') {
    this.phase = 'landing3';
  } else if (this.phase === 'landing3') {
    this.phase = 'holdFinal';
  } else if (this.phase === 'holdFinal') {
    this.phase = 'pawRaise';
    
  // ===== PAW SEQUENCE 1 =====
  } else if (this.phase === 'pawRaise') {
    this.phase = 'pawHold';
  } else if (this.phase === 'pawHold') {
    this.phase = 'pawLower';
  } else if (this.phase === 'pawLower') {
    this.phase = 'pawRaise2';  // ← FIX: tambah transition ini!
    
  // ===== PAW SEQUENCE 2 =====
  } else if (this.phase === 'pawRaise2') {
    this.phase = 'pawHold2';
  } else if (this.phase === 'pawHold2') {
    this.phase = 'pawLower2';
  } else if (this.phase === 'pawLower2') {
    this.phase = 'restHold';
    
  // ===== REST =====
  } else if (this.phase === 'restHold') {
    this.phase = 'anticipation';  // stay forever
  }
}
  // ===== UPDATE CURRENT PHASE =====
  updateCurrentPhase() {
    // Reset
    this.animData.bodyOffset = { x: 0, y: 0, z: 0 };
    this.animData.bodySquash = 1.0;
    this.animData.headTilt = { x: 0, y: 0, z: 0 };
    this.animData.headStretch = 0;
    this.animData.legCurls = { fl: 0, fr: 0, bl: 0, br: 0 };
    this.animData.pawRaise = { fl: 0, fr: 0, bl: 0, br: 0 };

    const t = this.phaseTime;
    const d = this.durations[this.phase];
    const progress = Math.min(t / d, 1.0);

    // ===== JUMP BACK 1 =====
    if (this.phase === 'anticipation') {
      const ease = this.easeInOutQuad(progress);
      this.animData.bodyOffset.y = -0.25 * ease;
      
    } else if (this.phase === 'airborne') {
      const horizEase = this.easeInOutQuad(progress);
      this.animData.bodyOffset.z = this.jump.backwardDist * horizEase;  // ← FIX: .x bukan .z
      
      const arc = 4 * this.jump.height * progress * (1 - progress);
      this.animData.bodyOffset.y = -0.25 + arc;
      
      this.animData.headTilt.x = 0;
      
      let curlAmount = 0;
      if (progress < 0.25) {
        curlAmount = this.jump.legCurl * (progress / 0.25);
      } else if (progress < 0.75) {
        curlAmount = this.jump.legCurl;
      } else {
        curlAmount = this.jump.legCurl * (1 - (progress - 0.75) / 0.25);
      }
      this.animData.legCurls = { fl: curlAmount, fr: curlAmount, bl: curlAmount, br: curlAmount };
      
    } else if (this.phase === 'landing') {
      this.animData.bodyOffset.z = this.jump.backwardDist;  // ← FIX: .x
      this.animData.bodyOffset.y = 0;
      
      this.animData.bodySquash = 1.0;
      this.animData.headTilt.x = 0;
      
      const bendAmount = 0.2 * Math.sin(progress * Math.PI);
      this.animData.legCurls = { fl: bendAmount, fr: bendAmount, bl: bendAmount, br: bendAmount };
      
    } else if (this.phase === 'hold') {
      this.animData.bodyOffset.z = this.jump.backwardDist;  // ← FIX: .x
      this.animData.bodyOffset.y = 0;
      
    // ===== JUMP FORWARD =====
    } else if (this.phase === 'anticipation2') {
      const ease = this.easeInOutQuad(progress);
      this.animData.bodyOffset.z = this.jump.backwardDist;
      this.animData.bodyOffset.y = -0.25 * ease;
      this.animData.headTilt.x = 0;
      
    } else if (this.phase === 'airborne2') {
  const horizEase = this.easeInOutQuad(progress);
  const startZ = this.jump.backwardDist;
  const endZ = this.jump.forwardDist;
  this.animData.bodyOffset.z = startZ + (endZ - startZ) * horizEase;
  
  const arc = 4 * this.jump.height * progress * (1 - progress);
  this.animData.bodyOffset.y = -0.25 + arc;
  
  // ===== HEAD STRETCH (excited jump) =====
  // Stretch paling tinggi di tengah jump (0.3-0.6)
  let stretchAmount = 0;
  if (progress < 0.3) {
    // Naik ke peak stretch
    stretchAmount = progress / 0.3;
  } else if (progress < 0.6) {
    // Hold at peak
    stretchAmount = 1.0;
  } else {
    // Turun dari peak
    stretchAmount = 1.0 - (progress - 0.6) / 0.4;
  }
  
  const stretchCurve = this.easeInOutQuad(stretchAmount);
  this.animData.headStretch = 0.2 * stretchCurve;  // stretch 0.25 unit
  // =======================================
  
  // ===== HEAD TILT (mulai turun di second half) =====
  if (progress < 0.5) {
    this.animData.headTilt.x = 0;
  } else {
    const p = (progress - 0.5) / 0.5;
    const headEase = this.easeInQuad(p);
    this.animData.headTilt.x = this.jump.headDownTilt * headEase * 0.6;
  }
      
      let curlAmount = 0;
      if (progress < 0.25) {
        curlAmount = this.jump.legCurl * (progress / 0.25);
      } else if (progress < 0.75) {
        curlAmount = this.jump.legCurl;
      } else {
        curlAmount = this.jump.legCurl * (1 - (progress - 0.75) / 0.25);
      }
      this.animData.legCurls = { fl: curlAmount, fr: curlAmount, bl: curlAmount, br: curlAmount };
      
    } else if (this.phase === 'landing2') {
  this.animData.bodyOffset.z = this.jump.forwardDist;
  this.animData.bodyOffset.y = 0;
  
  this.animData.bodySquash = 1.0;
  
  // ===== HEAD TILT dengan DAMPED BOUNCE =====
  const startTilt = this.jump.headDownTilt * 0.6;
  const fullDown = this.jump.headDownTilt;
  const overshoot = this.jump.headDownTilt * 1.3;
  
  if (progress < 0.25) {
    const p = progress / 0.25;
    const impactEase = this.easeInQuad(p);
    this.animData.headTilt.x = startTilt + (overshoot - startTilt) * impactEase;
    
  } else {
    const p = (progress - 0.25) / 0.75;
    
    const frequency = 2.5;
    const damping = 4.0;
    const oscillation = Math.sin(p * Math.PI * frequency) * Math.exp(-damping * p);
    
    const amplitude = overshoot - fullDown;
    
    this.animData.headTilt.x = fullDown + oscillation * amplitude;
  }
  
  // ===== SAVE HEAD TILT di akhir phase =====
  if (progress > 0.99) {
    this.prevHeadTilt = this.animData.headTilt.x;
  }
  // =========================================
  
  const stretchEase = this.easeOutQuad(progress);
  this.animData.headStretch = 0.25 * (1 - stretchEase);
}else if (this.phase === 'holdDown') {
  this.animData.bodyOffset.z = this.jump.forwardDist;
  this.animData.bodyOffset.y = 0;
  this.animData.headTilt.x = this.jump.headDownTilt;  // stay down
  this.animData.headStretch = 0;  // ← TAMBAH: no stretch saat hold
} else if (this.phase === 'anticipation3') {
      const ease = this.easeInOutQuad(progress);
      this.animData.bodyOffset.z = this.jump.forwardDist;
      this.animData.bodyOffset.y = -0.25 * ease;
      this.animData.headTilt.x = this.jump.headDownTilt;
      
    } else if (this.phase === 'airborne3') {
        const horizEase = this.easeInOutQuad(progress);
        const startZ = this.jump.forwardDist;
        const endZ = 0;
        this.animData.bodyOffset.z = startZ + (endZ - startZ) * horizEase;
        const arc = 4 * this.jump.height * progress * (1 - progress);
        this.animData.bodyOffset.y = -0.25 + arc;
        const headEase = this.easeOutQuad(progress);
        this.animData.headTilt.x = this.jump.headDownTilt * (1 - headEase);  // -0.15 → 0  
        let curlAmount = 0;
        if (progress < 0.25) {
            curlAmount = this.jump.legCurl * (progress / 0.25);
        } else if (progress < 0.75) {
            curlAmount = this.jump.legCurl;
        } else {
            curlAmount = this.jump.legCurl * (1 - (progress - 0.75) / 0.25);
        }
        this.animData.legCurls = { fl: curlAmount, fr: curlAmount, bl: curlAmount, br: curlAmount };
        } else if (this.phase === 'landing3') {
        this.animData.bodyOffset.z = 0;
        this.animData.bodyOffset.y = 0; 
        this.animData.bodySquash = 1.0;
        const headEase = this.easeOutQuad(progress);
        this.animData.headTilt.x = 0;    
        } else if (this.phase === 'holdFinal') {
        this.animData.bodyOffset.z = 0;
        this.animData.bodyOffset.y = 0;
        this.animData.headTilt.x = 0; 
        } else if (this.phase === 'pawRaise') {
  this.animData.bodyOffset.z = 0;
  this.animData.bodyOffset.y = 0;
  
  const ease = this.easeInOutQuad(progress);
  
  // ===== FIX 1: KEPALA TILT KIRI (positive Z) =====
  this.animData.headTilt.x = 0;
  this.animData.headTilt.y = 0;
  this.animData.headTilt.z = this.jump.headTiltSide * ease;  // ← positive = tilt LEFT
  // ===============================================
  
  // ===== FIX 2: KAKI KANAN DEPAN naik (bukan kiri) =====
  this.animData.pawRaise.fl = 0;     // kiri depan: turun
  this.animData.pawRaise.fr = ease;  // ← KANAN DEPAN: naik!
  this.animData.pawRaise.bl = 0;
  this.animData.pawRaise.br = 0;
  // ====================================================
} else if (this.phase === 'pawLower') {
  this.animData.bodyOffset.z = 0;
  this.animData.bodyOffset.y = 0;
  
  const easeDown = this.easeInOutQuad(progress);
  
  // ===== FIX 3: TURUN BERSAMAAN (kepala + kaki) =====
  // Kepala: dari tilt kiri → netral
  this.animData.headTilt.x = 0;
  this.animData.headTilt.y = 0;
  this.animData.headTilt.z = this.jump.headTiltSide * (1 - easeDown);  // ← POSITIVE (dari kiri)
  
  // Kaki kanan depan: dari atas → turun
  this.animData.pawRaise.fl = 0;
  this.animData.pawRaise.fr = 1.0 - easeDown;  // ← KANAN (fr), bukan kiri (fl)!
  this.animData.pawRaise.bl = 0;
  this.animData.pawRaise.br = 0;
  // ==============================================
} else if (this.phase === 'pawHold') {
  this.animData.bodyOffset.z = 0;
  this.animData.bodyOffset.y = 0;
  
  // Kepala: stay tilt kiri
  this.animData.headTilt.x = 0;
  this.animData.headTilt.y = 0;
  this.animData.headTilt.z = this.jump.headTiltSide;  // positive = tilt left
  
  // Kaki kanan depan: stay raised
  this.animData.pawRaise.fl = 0;
  this.animData.pawRaise.fr = 1.0;  // ← kanan depan tetap naik
  this.animData.pawRaise.bl = 0;
  this.animData.pawRaise.br = 0;
} else if (this.phase === 'pawRaise2') {
  // Angkat kaki KIRI + tilt kepala KANAN (mirror dari pawRaise)
  this.animData.bodyOffset.z = 0;
  this.animData.bodyOffset.y = 0;
  
  const ease = this.easeInOutQuad(progress);
  
  // KEPALA: tilt ke KANAN (negative Z)
  this.animData.headTilt.x = 0;
  this.animData.headTilt.y = 0;
  this.animData.headTilt.z = -this.jump.headTiltSide * ease;  // negative = tilt RIGHT
  
  // KAKI KIRI DEPAN: angkat
  this.animData.pawRaise.fl = ease;  // KIRI naik
  this.animData.pawRaise.fr = 0;     // kanan turun
  this.animData.pawRaise.bl = 0;
  this.animData.pawRaise.br = 0;
  
} else if (this.phase === 'pawHold2') {
  // Hold pose 2
  this.animData.bodyOffset.z = 0;
  this.animData.bodyOffset.y = 0;
  
  // Kepala: stay tilt kanan
  this.animData.headTilt.x = 0;
  this.animData.headTilt.y = 0;
  this.animData.headTilt.z = -this.jump.headTiltSide;  // negative = tilt right
  
  // Kaki kiri: stay raised
  this.animData.pawRaise.fl = 1.0;  // kiri tetap naik
  this.animData.pawRaise.fr = 0;
  this.animData.pawRaise.bl = 0;
  this.animData.pawRaise.br = 0;
  
} else if (this.phase === 'pawLower2') {
  // Turun bersamaan (kaki kiri + kepala)
  this.animData.bodyOffset.z = 0;
  this.animData.bodyOffset.y = 0;
  
  const easeDown = this.easeInOutQuad(progress);
  
  // Kepala: dari tilt kanan → netral
  this.animData.headTilt.x = 0;
  this.animData.headTilt.y = 0;
  this.animData.headTilt.z = -this.jump.headTiltSide * (1 - easeDown);  // -0.3 → 0
  
  // Kaki kiri: dari atas → turun
  this.animData.pawRaise.fl = 1.0 - easeDown;  // kiri turun
  this.animData.pawRaise.fr = 0;
  this.animData.pawRaise.bl = 0;
  this.animData.pawRaise.br = 0;
} else if (this.phase === 'restHold') {
  // Semua netral (stay forever)
  this.animData.bodyOffset.z = 0;
  this.animData.bodyOffset.y = 0;
  
  this.animData.headTilt.x = 0;
  this.animData.headTilt.y = 0;
  this.animData.headTilt.z = 0;  // netral
  
  this.animData.pawRaise.fl = 0;
  this.animData.pawRaise.fr = 0;  // turun
  this.animData.pawRaise.bl = 0;
  this.animData.pawRaise.br = 0;
}
  }

  // ===== GET DATA =====
  getAnimationData() {
    return this.animData;
  }
}  // ← CUMA 1 closing brace untuk class!