// ==================== MARSHTOMP ANIMATION CONTROLLER ====================

export class MarshtompAnimator {
  constructor(LIBS, parts) {
    this.LIBS = LIBS;
    this.parts = parts;  // ✅ Simpan reference ke parts
    
    // Animation state
    this.STATE = {
      RUNNING: 0,
      JUMP_BACK: 1,
      IDLE: 2,
      SHIELD_ACTIVATE: 3,
      SHIELD_HOLD: 4
    };
    
    this.state = this.STATE.RUNNING;
    this.bodyRotY = 0;
    this.bodyRotX = 0;
    this.position = [0, 0, -15];
    this.badanBaseY = 0;
    
    // Animation parameters
    this.RunSpeed = 4.0;
    this.JumpDur = 1.0;
    this.JumpBackDist = 8.0;
    this.JumpHeight = 2.2;
    this.jumpCount = 0;
    this.totalJumps = 2;
    this.jumpT = 0;
    this.runTimer = 0;
    this.runDur = 3.0;
    this.idleTimer = 0;
    this.idleBeforeShieldDur = 4.0;
    this.shieldActivateT = 0;
    this.shieldActivateDur = 1.2;
    this.shieldHoldDur = 2.5;
    this.shieldHoldTimer = 0;
    this.shieldScale = 0.0;

    // ✅ Idle animation state
    this.idleAnimState = 0;  // 0: breathing, 1: wave, 2: look around, 3: scratch head
    this.idleAnimTimer = 0;
    this.idleAnimDurations = [3.0, 2.5, 2.0, 2.0];  // durasi tiap animasi
    
    this.lastTime = performance.now() / 1000;
  }

  // ==================== POSE FUNCTIONS ====================

  poseRunning(t) {
    const smallSwing = Math.sin(t * 2) * this.LIBS.degToRad(20);

    // ✅ AKSES LEWAT this.parts
    this.LIBS.set_I4(this.parts.lenganKanan.MOVE_MATRIX);
    this.LIBS.rotateX(this.parts.lenganKanan.MOVE_MATRIX, this.LIBS.degToRad(-100));
    this.LIBS.rotateY(this.parts.lenganKanan.MOVE_MATRIX, this.LIBS.degToRad(20));
    this.LIBS.rotateZ(this.parts.lenganKanan.MOVE_MATRIX, smallSwing);

    this.LIBS.set_I4(this.parts.lenganKiri.MOVE_MATRIX);
    this.LIBS.rotateX(this.parts.lenganKiri.MOVE_MATRIX, this.LIBS.degToRad(-100));
    this.LIBS.rotateY(this.parts.lenganKiri.MOVE_MATRIX, this.LIBS.degToRad(-20));
    this.LIBS.rotateZ(this.parts.lenganKiri.MOVE_MATRIX, -smallSwing);

    const swing = 20, amp = 5;
    this.LIBS.set_I4(this.parts.kakiKanan.MOVE_MATRIX);
    this.LIBS.rotateX(this.parts.kakiKanan.MOVE_MATRIX, Math.sin(t * swing + Math.PI) * this.LIBS.degToRad(amp));

    this.LIBS.set_I4(this.parts.kakiKiri.MOVE_MATRIX);
    this.LIBS.rotateX(this.parts.kakiKiri.MOVE_MATRIX, Math.sin(t * swing) * this.LIBS.degToRad(amp));
  }

    // ✅ ENHANCED IDLE ANIMATION
    poseIdle(t) {
        // Base breathing animation (always active)
        const breathSpeed = 1.2, breathAmp = 0.05;
        const breathOffset = Math.sin(t * breathSpeed) * breathAmp;
        this.position[1] = this.badanBaseY + breathOffset;

        // Reset positions
        this.LIBS.set_I4(this.parts.kakiKanan.MOVE_MATRIX);
        this.LIBS.set_I4(this.parts.kakiKiri.MOVE_MATRIX);

        // Different idle animations based on state
        switch(this.idleAnimState) {
        case 0: // Breathing with subtle arm movement
            this.poseIdleBreathing(t);
            break;
        case 1: // Wave hand
            this.poseIdleWave(t);
            break;
        case 2: // Look around
            this.poseIdleLookAround(t);
            break;
        case 3: // Scratch head
            this.poseIdleScratchHead(t);
            break;
        }
    }

    // ✅ SUB-ANIMATION 1: Breathing
    poseIdleBreathing(t) {
        const armSwaySpeed = 1.5, armSwayAmp = 8;
        const armSwing = Math.sin(t * armSwaySpeed) * this.LIBS.degToRad(armSwayAmp);

        this.LIBS.set_I4(this.parts.lenganKanan.MOVE_MATRIX);
        this.LIBS.rotateX(this.parts.lenganKanan.MOVE_MATRIX, this.LIBS.degToRad(-20) + armSwing);

        this.LIBS.set_I4(this.parts.lenganKiri.MOVE_MATRIX);
        this.LIBS.rotateX(this.parts.lenganKiri.MOVE_MATRIX, this.LIBS.degToRad(-20) - armSwing);

        // Subtle head bob
        const headBobSpeed = 1.0, headBobAmp = 5;
        const headBob = Math.sin(t * headBobSpeed) * this.LIBS.degToRad(headBobAmp);

        this.LIBS.set_I4(this.parts.kepalaAtas.MOVE_MATRIX);
        this.LIBS.rotateX(this.parts.kepalaAtas.MOVE_MATRIX, headBob);
    }

  // ✅ SUB-ANIMATION 2: Wave Hand
    poseIdleWave(t) {
        const waveSpeed = 5.0;
        const wavePhase = (t * waveSpeed) % (Math.PI * 2);
        const waveAmp = Math.sin(wavePhase) * this.LIBS.degToRad(30);
        const armRaise = this.LIBS.degToRad(-90);

        // Right arm waves
        this.LIBS.set_I4(this.parts.lenganKanan.MOVE_MATRIX);
        this.LIBS.rotateX(this.parts.lenganKanan.MOVE_MATRIX, armRaise);
        this.LIBS.rotateZ(this.parts.lenganKanan.MOVE_MATRIX, this.LIBS.degToRad(45) + waveAmp);

        // Left arm down
        this.LIBS.set_I4(this.parts.lenganKiri.MOVE_MATRIX);
        this.LIBS.rotateX(this.parts.lenganKiri.MOVE_MATRIX, this.LIBS.degToRad(-20));

        // Head slightly tilted with smile
        this.LIBS.set_I4(this.parts.kepalaAtas.MOVE_MATRIX);
        this.LIBS.rotateZ(this.parts.kepalaAtas.MOVE_MATRIX, this.LIBS.degToRad(-10));
    }

    // ✅ SUB-ANIMATION 3: Look Around
    poseIdleLookAround(t) {
        const lookSpeed = 0.8;
        const lookPhase = (t * lookSpeed) % (Math.PI * 4);
        
        // Head rotates left and right
        let headRotY = 0;
        if (lookPhase < Math.PI) {
        // Look right
        headRotY = Math.sin(lookPhase) * this.LIBS.degToRad(40);
        } else if (lookPhase < Math.PI * 2) {
        // Look left
        headRotY = Math.sin(lookPhase) * this.LIBS.degToRad(-40);
        } else if (lookPhase < Math.PI * 3) {
        // Look up slightly
        const headRotX = Math.sin(lookPhase - Math.PI * 2) * this.LIBS.degToRad(-20);
        this.LIBS.set_I4(this.parts.kepalaAtas.MOVE_MATRIX);
        this.LIBS.rotateX(this.parts.kepalaAtas.MOVE_MATRIX, headRotX);
        
        // Arms neutral
        this.LIBS.set_I4(this.parts.lenganKanan.MOVE_MATRIX);
        this.LIBS.rotateX(this.parts.lenganKanan.MOVE_MATRIX, this.LIBS.degToRad(-20));
        this.LIBS.set_I4(this.parts.lenganKiri.MOVE_MATRIX);
        this.LIBS.rotateX(this.parts.lenganKiri.MOVE_MATRIX, this.LIBS.degToRad(-20));
        return;
        } else {
        // Back to center
        headRotY = 0;
        }

        this.LIBS.set_I4(this.parts.kepalaAtas.MOVE_MATRIX);
        this.LIBS.rotateY(this.parts.kepalaAtas.MOVE_MATRIX, headRotY);

        // Arms neutral
        this.LIBS.set_I4(this.parts.lenganKanan.MOVE_MATRIX);
        this.LIBS.rotateX(this.parts.lenganKanan.MOVE_MATRIX, this.LIBS.degToRad(-20));
        this.LIBS.set_I4(this.parts.lenganKiri.MOVE_MATRIX);
        this.LIBS.rotateX(this.parts.lenganKiri.MOVE_MATRIX, this.LIBS.degToRad(-20));
    }

    // ✅ SUB-ANIMATION 4: Scratch Head
    poseIdleScratchHead(t) {
        const scratchSpeed = 8.0;
        const scratchPhase = (t * scratchSpeed) % (Math.PI * 2);
        const scratchWiggle = Math.sin(scratchPhase) * this.LIBS.degToRad(15);

        // Right arm scratches head
        this.LIBS.set_I4(this.parts.lenganKanan.MOVE_MATRIX);
        this.LIBS.rotateX(this.parts.lenganKanan.MOVE_MATRIX, this.LIBS.degToRad(-120));
        this.LIBS.rotateZ(this.parts.lenganKanan.MOVE_MATRIX, this.LIBS.degToRad(60) + scratchWiggle);

        // Left arm down
        this.LIBS.set_I4(this.parts.lenganKiri.MOVE_MATRIX);
        this.LIBS.rotateX(this.parts.lenganKiri.MOVE_MATRIX, this.LIBS.degToRad(-20));

        // Head tilts slightly with confused look
        this.LIBS.set_I4(this.parts.kepalaAtas.MOVE_MATRIX);
        this.LIBS.rotateZ(this.parts.kepalaAtas.MOVE_MATRIX, this.LIBS.degToRad(15));
        this.LIBS.rotateX(this.parts.kepalaAtas.MOVE_MATRIX, this.LIBS.degToRad(-10));
    }


  poseJump(tNorm) {
    // ✅ AKSES LEWAT this.parts
    this.LIBS.set_I4(this.parts.kakiKanan.MOVE_MATRIX);
    this.LIBS.set_I4(this.parts.kakiKiri.MOVE_MATRIX);

    const zW = Math.sin(tNorm * Math.PI * 2) * this.LIBS.degToRad(10);
    const xL = this.LIBS.degToRad(-30);

    this.LIBS.set_I4(this.parts.lenganKanan.MOVE_MATRIX);
    this.LIBS.rotateX(this.parts.lenganKanan.MOVE_MATRIX, xL);
    this.LIBS.rotateZ(this.parts.lenganKanan.MOVE_MATRIX, zW);

    this.LIBS.set_I4(this.parts.lenganKiri.MOVE_MATRIX);
    this.LIBS.rotateX(this.parts.lenganKiri.MOVE_MATRIX, xL);
    this.LIBS.rotateZ(this.parts.lenganKiri.MOVE_MATRIX, -zW);
  }

  poseShieldActivate(tNorm) {
    const spreadAngle = tNorm * this.LIBS.degToRad(70);
    const upAngle = tNorm * this.LIBS.degToRad(-80);

    // ✅ AKSES LEWAT this.parts
    this.LIBS.set_I4(this.parts.lenganKanan.MOVE_MATRIX);
    this.LIBS.rotateX(this.parts.lenganKanan.MOVE_MATRIX, upAngle);
    this.LIBS.rotateZ(this.parts.lenganKanan.MOVE_MATRIX, spreadAngle);

    this.LIBS.set_I4(this.parts.lenganKiri.MOVE_MATRIX);
    this.LIBS.rotateX(this.parts.lenganKiri.MOVE_MATRIX, upAngle);
    this.LIBS.rotateZ(this.parts.lenganKiri.MOVE_MATRIX, -spreadAngle);

    this.LIBS.set_I4(this.parts.kakiKanan.MOVE_MATRIX);
    this.LIBS.set_I4(this.parts.kakiKiri.MOVE_MATRIX);

    const headLookUp = tNorm * this.LIBS.degToRad(-10);
    this.LIBS.set_I4(this.parts.kepalaAtas.MOVE_MATRIX);
    this.LIBS.rotateX(this.parts.kepalaAtas.MOVE_MATRIX, headLookUp);

    const easeOutCubic = 1 - Math.pow(1 - tNorm, 3);
    this.shieldScale = easeOutCubic;
  }

  poseShieldHold(t) {
    const spreadAngle = this.LIBS.degToRad(70);
    const upAngle = this.LIBS.degToRad(-80);

    // ✅ AKSES LEWAT this.parts
    this.LIBS.set_I4(this.parts.lenganKanan.MOVE_MATRIX);
    this.LIBS.rotateX(this.parts.lenganKanan.MOVE_MATRIX, upAngle);
    this.LIBS.rotateZ(this.parts.lenganKanan.MOVE_MATRIX, spreadAngle);

    this.LIBS.set_I4(this.parts.lenganKiri.MOVE_MATRIX);
    this.LIBS.rotateX(this.parts.lenganKiri.MOVE_MATRIX, upAngle);
    this.LIBS.rotateZ(this.parts.lenganKiri.MOVE_MATRIX, -spreadAngle);

    this.LIBS.set_I4(this.parts.kakiKanan.MOVE_MATRIX);
    this.LIBS.set_I4(this.parts.kakiKiri.MOVE_MATRIX);

    this.LIBS.set_I4(this.parts.kepalaAtas.MOVE_MATRIX);
    this.LIBS.rotateX(this.parts.kepalaAtas.MOVE_MATRIX, this.LIBS.degToRad(-10));

    const pulseSpeed = 2.5;
    const pulseAmp = 0.05;
    const pulse = 1.0 + Math.sin(t * pulseSpeed) * pulseAmp;
    this.shieldScale = pulse;

    const breathSpeed = 1.5;
    const breathAmp = 0.02;
    const breathOffset = Math.sin(t * breathSpeed) * breathAmp;
    this.position[1] = this.badanBaseY + breathOffset;
  }

  // ==================== UPDATE FUNCTION ====================

  update(keys) {
    const now = performance.now() / 1000;
    const dt = Math.min(0.033, now - this.lastTime);
    this.lastTime = now;

    // Manual character movement
    this.updateCharacterMovement(keys);

    // State machine
    if (this.state === this.STATE.RUNNING) {
      this.runTimer += dt;
      const fwd = [Math.sin(this.bodyRotY), 0, Math.cos(this.bodyRotY)];
      this.position[0] += fwd[0] * this.RunSpeed * dt;
      this.position[2] += fwd[2] * this.RunSpeed * dt;
      this.position[1] = this.badanBaseY;
      if (this.runTimer >= this.runDur) {
        this.runTimer = 0;
        this.state = this.STATE.JUMP_BACK;
        this.jumpT = 0;
      }
    }
    else if (this.state === this.STATE.JUMP_BACK) {
      this.jumpT = Math.min(1, this.jumpT + dt / this.JumpDur);
      const fwd = [Math.sin(this.bodyRotY), 0, Math.cos(this.bodyRotY)];
      const back = [-fwd[0], 0, -fwd[2]];
      this.position[0] += back[0] * (this.JumpBackDist * dt / this.JumpDur);
      this.position[2] += back[2] * (this.JumpBackDist * dt / this.JumpDur);
      this.position[1] = this.badanBaseY + 4 * this.JumpHeight * this.jumpT * (1 - this.jumpT);
      if (this.jumpT >= 1) {
        this.position[1] = this.badanBaseY;
        this.jumpCount += 1;
        if (this.jumpCount < this.totalJumps) {
          this.state = this.STATE.RUNNING;
          this.runTimer = 0;
        } else {
          this.state = this.STATE.IDLE;
          this.idleTimer = 0;
        }
      }
    }
    else if (this.state === this.STATE.IDLE) {
      this.idleTimer += dt;
      if (this.idleTimer >= this.idleBeforeShieldDur) {
        this.state = this.STATE.SHIELD_ACTIVATE;
        this.shieldActivateT = 0;
        this.shieldHoldTimer = 0;
      }
    }
    else if (this.state === this.STATE.SHIELD_ACTIVATE) {
      this.shieldActivateT = Math.min(1, this.shieldActivateT + dt / this.shieldActivateDur);
      if (this.shieldActivateT >= 1) {
        this.state = this.STATE.SHIELD_HOLD;
        this.shieldHoldTimer = 0;
      }
    }
    else if (this.state === this.STATE.SHIELD_HOLD) {
      this.shieldHoldTimer += dt;
      if (this.shieldHoldTimer >= this.shieldHoldDur) {
        this.state = this.STATE.RUNNING;
        this.runTimer = 0;
        this.jumpCount = 0;
        this.shieldScale = 0;
        this.idleTimer = 0;
      }
    }

    // Apply poses
    if (this.state === this.STATE.RUNNING) {
      this.poseRunning(now);
      this.shieldScale = 0;
    } else if (this.state === this.STATE.JUMP_BACK) {
      this.poseJump(this.jumpT);
      this.shieldScale = 0;
    } else if (this.state === this.STATE.IDLE) {
      this.poseIdle(now);
      this.shieldScale = 0;
    } else if (this.state === this.STATE.SHIELD_ACTIVATE) {
      this.poseShieldActivate(this.shieldActivateT);
    } else if (this.state === this.STATE.SHIELD_HOLD) {
      this.poseShieldHold(now);
    }

    // Update model transform
    // ✅ AKSES LEWAT this.parts
    this.LIBS.set_I4(this.parts.badan.MOVE_MATRIX);
    if (this.LIBS.translate) {
      this.LIBS.translate(this.parts.badan.MOVE_MATRIX, this.position[0], this.position[1], this.position[2]);
    } else {
      this.LIBS.translateX(this.parts.badan.MOVE_MATRIX, this.position[0]);
      this.LIBS.translateY(this.parts.badan.MOVE_MATRIX, this.position[1]);
      this.LIBS.translateZ(this.parts.badan.MOVE_MATRIX, this.position[2]);
    }
    this.LIBS.rotateY(this.parts.badan.MOVE_MATRIX, this.bodyRotY);
    this.LIBS.rotateX(this.parts.badan.MOVE_MATRIX, this.bodyRotX);

    // Update shield
    this.LIBS.set_I4(this.parts.shield.MOVE_MATRIX);
    this.LIBS.translateY(this.parts.shield.MOVE_MATRIX, -1.2);
    const m = this.parts.shield.MOVE_MATRIX;
    for (let i = 0; i < 12; i++) {
      m[i] *= this.shieldScale;
    }
  }

  updateCharacterMovement(keys) {
    const speed = 0.08;
    const yaw = this.bodyRotY;
    const forwardX = Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = Math.sin(yaw);
    
    let moveX = 0, moveZ = 0;
    
    if (keys.w) { moveX += forwardX; moveZ += forwardZ; }
    if (keys.s) { moveX -= forwardX; moveZ -= forwardZ; }
    if (keys.a) { moveX -= rightX; moveZ -= rightZ; }
    if (keys.d) { moveX += rightX; moveZ += rightZ; }
    
    if (moveX !== 0 || moveZ !== 0) {
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      moveX /= len;
      moveZ /= len;
      
      if (this.state === this.STATE.IDLE || this.state === this.STATE.SHIELD_HOLD) {
        this.position[0] += moveX * speed;
        this.position[2] += moveZ * speed;
        this.bodyRotY = Math.atan2(moveX, -moveZ);
      }
    }
  }
}
