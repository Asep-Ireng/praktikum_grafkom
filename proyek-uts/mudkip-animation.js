export class MudkipAnimation {
  constructor(bodyParts, config = {}) {
    this.parts = {
      head: bodyParts.head,
      body: bodyParts.body,
      legs: bodyParts.legs,
    };

    this.durations = {
      anticipation: 0.25,
      airborne:     0.50,
      landing:      0.20,
      hold:         0.2,
      
      anticipation2: 0.25,
      airborne2:     0.50,
      landing2:      0.30,
      holdDown:      0.6,   
      
      anticipation3: 0.25,
      airborne3:     0.50,
      landing3:      0.20,
      holdFinal:     1.2,  
      
      pawRaise:  0.4,  
      pawHold:   0.3,   
      pawLower:  0.7,  
      
      pawRaise2: 0.4,
      pawHold2:  1.0,
      pawLower2: 0.7,
      restHold:  2.0, 
    };


    this.jump = {
      backwardDist: -1.8,
      forwardDist:  2.5,
      height:       0.9,
      legCurl:      0.3,
      headDownTilt: 0.3,
      squashAmount: 0.15,

      pawRaiseAngle: Math.PI / 4, 
      headTiltSide: 0.3,  
    };

    this.animData = {
      bodyOffset: { x: 0, y: 0, z: 0 },
      bodySquash: 1.0,
      headTilt:   { x: 0, y: 0, z: 0 },
      headStretch: 0,
      legCurls:   { fl: 0, fr: 0, bl: 0, br: 0 },
      pawRaise: { fl: 0, fr: 0, bl: 0, br: 0 },
      eyeScale: 1.0,
    };

    this.phase = 'anticipation';
    this.phaseTime = 0;
    this.prevHeadTilt = 0;
    this.lastTime = performance.now();
  }

  easeInOutQuad(t) {
    return t < 0.5 ? 2*t*t : 1 - 2*(1-t)*(1-t);
  }
  
  easeOutQuad(t) {
    return 1 - (1-t)*(1-t);
  }
  
  easeInQuad(t) {
    return t*t;
  }

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
  } else if (this.phase === 'pawRaise') {
    this.phase = 'pawHold';
  } else if (this.phase === 'pawHold') {
    this.phase = 'pawLower';
  } else if (this.phase === 'pawLower') {
    this.phase = 'pawRaise2'; 
  } else if (this.phase === 'pawRaise2') {
    this.phase = 'pawHold2';
  } else if (this.phase === 'pawHold2') {
    this.phase = 'pawLower2';
  } else if (this.phase === 'pawLower2') {
    this.phase = 'restHold';
  } else if (this.phase === 'restHold') {
    this.phase = 'anticipation';  
  }
}

  updateCurrentPhase() {
    this.animData.bodyOffset = { x: 0, y: 0, z: 0 };
    this.animData.bodySquash = 1.0;
    this.animData.headTilt = { x: 0, y: 0, z: 0 };
    this.animData.headStretch = 0;
    this.animData.legCurls = { fl: 0, fr: 0, bl: 0, br: 0 };
    this.animData.pawRaise = { fl: 0, fr: 0, bl: 0, br: 0 };

    const t = this.phaseTime;
    const d = this.durations[this.phase];
    const progress = Math.min(t / d, 1.0);

    if (this.phase === 'anticipation') {
      const ease = this.easeInOutQuad(progress);
      this.animData.bodyOffset.y = -0.25 * ease;
      
    } else if (this.phase === 'airborne') {
      const horizEase = this.easeInOutQuad(progress);
      this.animData.bodyOffset.z = this.jump.backwardDist * horizEase; 
      
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
      this.animData.bodyOffset.z = this.jump.backwardDist;  
      this.animData.bodyOffset.y = 0;
      
      this.animData.bodySquash = 1.0;
      this.animData.headTilt.x = 0;
      
      const bendAmount = 0.2 * Math.sin(progress * Math.PI);
      this.animData.legCurls = { fl: bendAmount, fr: bendAmount, bl: bendAmount, br: bendAmount };
      
    } else if (this.phase === 'hold') {
      this.animData.bodyOffset.z = this.jump.backwardDist;  
      this.animData.bodyOffset.y = 0;
      
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
  
  let stretchAmount = 0;
  if (progress < 0.3) {
    stretchAmount = progress / 0.3;
  } else if (progress < 0.6) {
    stretchAmount = 1.0;
  } else {
    stretchAmount = 1.0 - (progress - 0.6) / 0.4;
  }
  
  const stretchCurve = this.easeInOutQuad(stretchAmount);
  this.animData.headStretch = 0.2 * stretchCurve;  

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
  
  if (progress > 0.99) {
    this.prevHeadTilt = this.animData.headTilt.x;
  }
  
  const stretchEase = this.easeOutQuad(progress);
  this.animData.headStretch = 0.25 * (1 - stretchEase);
}else if (this.phase === 'holdDown') {
  this.animData.bodyOffset.z = this.jump.forwardDist;
  this.animData.bodyOffset.y = 0;
  this.animData.headTilt.x = this.jump.headDownTilt; 
  this.animData.headStretch = 0;  
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
        this.animData.headTilt.x = this.jump.headDownTilt * (1 - headEase);  
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

          const t = this.phaseTime;
          
          if (t < 0.2) {
            this.animData.eyeScale = 1.0;
            
          } else if (t < 0.4) {
            const p = (t - 0.2) / 0.2;
            const ease = this.easeOutQuad(p);
            this.animData.eyeScale = 1.0 + 0.3 * ease;
            
          } else if (t < 0.6) {
            this.animData.eyeScale = 1.3;
            
          } else if (t < 1.0) {
            const p = (t - 0.6) / 0.4;
            const ease = this.easeInOutQuad(p);
            this.animData.eyeScale = 1.3 - 0.3 * ease;
            
          } else {
            this.animData.eyeScale = 1.0;
          }
        } else if (this.phase === 'pawRaise') {
          this.animData.bodyOffset.z = 0;
          this.animData.bodyOffset.y = 0;
          
          const ease = this.easeInOutQuad(progress);
    
          this.animData.headTilt.x = 0;
          this.animData.headTilt.y = 0;
          this.animData.headTilt.z = this.jump.headTiltSide * ease;
          this.animData.pawRaise.fl = 0;     
          this.animData.pawRaise.fr = ease; 
          this.animData.pawRaise.bl = 0;
          this.animData.pawRaise.br = 0;

        } else if (this.phase === 'pawLower') {
          this.animData.bodyOffset.z = 0;
          this.animData.bodyOffset.y = 0;
          
          const easeDown = this.easeInOutQuad(progress);
          this.animData.headTilt.x = 0;
          this.animData.headTilt.y = 0;
          this.animData.headTilt.z = this.jump.headTiltSide * (1 - easeDown); 
          this.animData.pawRaise.fl = 0;
          this.animData.pawRaise.fr = 1.0 - easeDown;  
          this.animData.pawRaise.bl = 0;
          this.animData.pawRaise.br = 0;

        } else if (this.phase === 'pawHold') {
          this.animData.bodyOffset.z = 0;
          this.animData.bodyOffset.y = 0;
          this.animData.headTilt.x = 0;
          this.animData.headTilt.y = 0;
          this.animData.headTilt.z = this.jump.headTiltSide; 
          this.animData.pawRaise.fl = 0;
          this.animData.pawRaise.fr = 1.0; 
          this.animData.pawRaise.bl = 0;
          this.animData.pawRaise.br = 0;

        } else if (this.phase === 'pawRaise2') {
          this.animData.bodyOffset.z = 0;
          this.animData.bodyOffset.y = 0;
          const ease = this.easeInOutQuad(progress);
          this.animData.headTilt.x = 0;
          this.animData.headTilt.y = 0;
          this.animData.headTilt.z = -this.jump.headTiltSide * ease; 
          this.animData.pawRaise.fl = ease;  
          this.animData.pawRaise.fr = 0;     
          this.animData.pawRaise.bl = 0;
          this.animData.pawRaise.br = 0;
          
        } else if (this.phase === 'pawHold2') {
          this.animData.bodyOffset.z = 0;
          this.animData.bodyOffset.y = 0;
          this.animData.headTilt.x = 0;
          this.animData.headTilt.y = 0;
          this.animData.headTilt.z = -this.jump.headTiltSide;  
          this.animData.pawRaise.fl = 1.0;  
          this.animData.pawRaise.fr = 0;
          this.animData.pawRaise.bl = 0;
          this.animData.pawRaise.br = 0;
          
        } else if (this.phase === 'pawLower2') {
          this.animData.bodyOffset.z = 0;
          this.animData.bodyOffset.y = 0;

          const easeDown = this.easeInOutQuad(progress);
          this.animData.headTilt.x = 0;
          this.animData.headTilt.y = 0;
          this.animData.headTilt.z = -this.jump.headTiltSide * (1 - easeDown);  
          this.animData.pawRaise.fl = 1.0 - easeDown;  
          this.animData.pawRaise.fr = 0;
          this.animData.pawRaise.bl = 0;
          this.animData.pawRaise.br = 0;

        } else if (this.phase === 'restHold') {
          this.animData.bodyOffset.z = 0;
          this.animData.bodyOffset.y = 0;
          this.animData.headTilt.x = 0;
          this.animData.headTilt.y = 0;
          this.animData.headTilt.z = 0;
          this.animData.pawRaise.fl = 0;
          this.animData.pawRaise.fr = 0;  
          this.animData.pawRaise.bl = 0;
          this.animData.pawRaise.br = 0;
        }
        }

  getAnimationData() {
    return this.animData;
  }
}  