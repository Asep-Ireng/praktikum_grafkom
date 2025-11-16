// anim/mega_animation.js
// Prettier print width: 80

/* eslint-disable no-undef */

// This file drives animation by mutating rig pose APIs that you created
// via MegaTorso.makePoseAPI(...), MegaArms.makePoseAPI(...), etc.
// Expect `rigs` to look like:
// {
//   torso: MegaTorso.makePoseAPI(poseTorso),
//   arms:  MegaArms.makePoseAPI(poseArms),
//   legs:  MegaLegs.makePoseAPI(poseLegs)   // optional here
//   head:  MegaHead.makePoseAPI(poseHead)   // optional here
// }

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function easeInOutSine(t) {
  t = clamp01(t);
  return 0.5 - 0.5 * Math.cos(Math.PI * t);
}
function easeInCubic(t) {
  t = clamp01(t);
  return t * t * t;
}
function easeOutBack(t, s = 1.70158) {
  t = clamp01(t);
  const u = t - 1.0;
  return 1.0 + u * u * ((s + 1.0) * u + s);
}

function easeOutCubic(t) {
  t = clamp01(t);
  const u = 1.0 - t;
  return 1.0 - u * u * u;
}
function easeInSine(t) {
  t = clamp01(t);
  return 1.0 - Math.cos((Math.PI * 0.5) * t);
}
function easeOutSine(t) {
  t = clamp01(t);
  return Math.sin((Math.PI * 0.5) * t);
}

function deg(x) {
  return (x * Math.PI) / 180;
}

// axis helpers (operate on a single rig node)
function rotX(ops, a) {
  if (!ops || !a) return;
  ops.rotate(a, [1, 0, 0]);
}
function trX(ops, x) {
  if (!ops || (!x && x !== 0)) return;
  ops.translate([x, 0, 0]);
}
function scX(ops, s) {
    if (!ops || (!s && s !== 0)) return;
  ops.scale([s, 1, 1]);
}
function rotY(ops, a) {
  if (!ops || !a) return;
  ops.rotate(a, [0, 1, 0]);
}
function rotZ(ops, a) {
  if (!ops || !a) return;
  ops.rotate(a, [0, 0, 1]);
}
function trZ(ops, z) {
  if (!ops || (!z && z !== 0)) return;
  ops.translate([0, 0, z]);
}
function scZ(ops, s) {
    if (!ops || (!s && s !== 0)) return;
  ops.scale([1, 1, s]);
}
function trY(ops, y) {
  if (!ops || (!y && y !== 0)) return;
  ops.translate([0, y, 0]);
}
function scY(ops, s) {
  if (!ops || (!s && s !== 0)) return;
  ops.scale([1, s, 1]);
}

//time manager
function timeWrap(t, dur) {
  return (t % dur + dur) % dur; // 0..dur
}
function timePingPong(t, dur) {
  const u = (t % (2 * dur) + 2 * dur) % (2 * dur);
  return u <= dur ? u : 2 * dur - u; // 0->dur->0
}

function timePingPongHold(t, dur, hold = 0.15) {
  const cycle = 2 * dur + 2 * hold;
  let u = (t % cycle + cycle) % cycle;
  if (u < hold) return 0;
  u -= hold;
  if (u < dur) return u;
  u -= dur;
  if (u < hold) return dur;
  return dur - (u - hold);
}
// use: const tt = timePingPongHold(t, 1.0, 0.15);

/* --------------------------- Phase 0: Idle --------------------------- */
// Loop ~2.8 s
export function applyPhase0Idle(rigs, timeSeconds) {
  const T = Math.max(0, timeSeconds || 0);
  // Jaw: never cross into positive Y (no clipping), still breathe
  const w = (2 * Math.PI) / 2.8;

// 0..1 driver (smooth open/close, no sign flip)
const k1 = 0.5 - 0.5 * Math.cos(T * w); // 0..1

// Tune these (scene units): base gap + animated open
const jawBase = 0.010; // keep slightly open at all times
const jawAmp  = 0.152; // extra opening amount


  const s = Math.sin(T * w);

  // Head breathing (if rig nodes exist in your head rig)
  trY(rigs.head?.head, -0.15 * s);
  rotX(rigs.head?.head, deg(2.0) * s);
//   trY(rigs.head?.jaw, -0.0008 * s);
 trY(rigs.head?.jaw, -(jawBase + jawAmp * k1));

  // Torso breathing
  rotX(rigs.torso?.belly, deg(2.5) * s);
  trY(rigs.torso?.belly, 0.02 * s);

  rotX(rigs.torso?.connector, deg(3.0) * s);
  trY(rigs.torso?.connector, 0.025 * s);

  rotX(rigs.torso?.rump, deg(-1.0) * s);

  // Arms synced to breathing: inward on exhale (s < 0), outward on inhale
  const amp = deg(4.0);
  const amp2 = deg(0.5);
  const shape = 0.85;
  const k = Math.sign(s) * Math.pow(Math.abs(s), shape);

  // Left: inward yaw is negative; Right: inward yaw is positive
  rotX(rigs.arms?.left?.upper, amp * k);
  rotY(rigs.arms?.left?.upper, -amp * k);
  rotY(rigs.arms?.left?.forearm, amp2 * k);

  rotX(rigs.arms?.right?.upper, -amp * k);
  rotY(rigs.arms?.right?.forearm, -amp2 * k);
  rotY(rigs.arms?.right?.upper, amp * k);
}

/* ------------------------ Phase 1: Stand Up ------------------------- */
// Duration ~1.0 s, wave rump -> connector -> belly.
// Arms: shoulders back/out, forearms yaw/roll so pads face outward, raise to
// near horizontal, fingers curl.
export function applyPhase1StandUp(rigs, timeSeconds) {
  const t = Math.max(0, timeSeconds || 0);
  const dur = 1.0;

  // Torso wave timing (slight offsets), eased
  const kH = easeInOutSine((t-0.15) / 0.45); // overall height progress
  const kR = easeInOutSine((t - 0.0) / 0.70); // rump first
  const kC = easeInOutSine((t - 0.05) / 0.70); // connector follows
  const kB = easeInOutSine((t - 0.15) / 0.45); // belly last

  // Clamp factors [0,1]
  const cR = clamp01(kR);
  const cC = clamp01(kC);
  const cB = clamp01(kB);
  const cH = clamp01(kH);
 //head targets
    trY(rigs.head?.head, deg(lerp(0, 85, cH)));
    rotX(rigs.head?.head, deg(lerp(0, -25, cH)));

    rotX(rigs.head?.jaw, deg(lerp(0, 15, cH)));
  // Torso targets
  rotX(rigs.torso?.rump, deg(lerp(0, -10, cR)));

  trY(rigs.torso?.connector, lerp(0.0, 0.55, cC));
//   trZ(rigs.torso?.connector, lerp(0.0, 0.25, cC));
  rotX(rigs.torso?.connector, deg(lerp(0, -4, cC)));
  scZ(rigs.torso?.connector, 1.5 + 0.05 * cC); // stretch slightly

  trY(rigs.torso.belly, lerp(0.0, 1.35, cB));
  rotX(rigs.torso?.belly, deg(lerp(0, -20, cB))); // chest back

  // Arms: drive with overall stand-up progress (smooth over dur)
  const cA = clamp01(easeInOutSine(t / dur));

  // Shoulders: back (pitch -), outward (yaw opposite signs)
 
const liftL = 2.5;
const liftR= 2.0

//left

    trY(rigs.arms?.left?.liftWS, liftL * cA);
    trX(rigs.arms?.left?.liftWS, -0.8 * cA);
  rotX(rigs.arms?.left?.rotateWS, deg(-60) * cA);
  rotY(rigs.arms?.left?.lowerRotateWS, deg(-40) * cA);
  rotX(rigs.arms?.left?.lowerRotateWS, deg(-40) * cA);
  trZ(rigs.arms?.left?.lowerLiftWS, 1.5 * cA);

     rotX(rigs.arms?.left?.forearm, deg(55) * cA);
     rotX(rigs.arms?.left?.fingers?.cluster, deg(120) * cA);

  //right
   trY(rigs.arms?.right?.liftWS, liftL * cA);
    trX(rigs.arms?.right?.liftWS, 0.8 * cA);
   rotX(rigs.arms?.right?.rotateWS, deg(-60) * cA);
   rotY(rigs.arms?.right?.lowerRotateWS, deg(40) * cA);
   rotX(rigs.arms?.right?.lowerRotateWS, deg(-40) * cA);
   trZ(rigs.arms?.right?.lowerLiftWS, 1.5 * cA);
    rotX(rigs.arms?.right?.forearm, deg(55) * cA);
    rotX(rigs.arms?.right?.fingers?.cluster, deg(120) * cA);
}

/* ------------------------ Phase 2: Ground Slam ------------------------ */
// Torso: front->back compression wave. Arms: fast downward swing.
// Fingers: extend slightly near impact (then re-curl in later phases).
// Boulder: spawns at t≈0.35, rises and scales up over ~1.0s easeOutBack-ish.
export function applyPhase2Slam(rigs, atk, timeSeconds) {
  const t = Math.max(0, timeSeconds || 0);

  // Torso wave timings
  const cR = easeInCubic(clamp01((t - 0.0) / 0.7)); // rump (down)
  const cC = easeInOutSine(clamp01((t - 0.05) / 0.6)); // connector
  const cB = easeInCubic(clamp01((t - 0.15) / 0.6)); // belly (forward)

  // Rump: −7°
  rotX(rigs.torso?.rump, deg(lerp(0, -7, cR)));

  // Connector: Y −0.15, scaleY 0.95, rotX −5°
  trY(rigs.torso?.connector, lerp(0, -0.15, cC));
  scY(rigs.torso?.connector, lerp(1.0, 0.95, cC));
  rotX(rigs.torso?.connector, deg(lerp(0, -5, cC)));

  // Belly: +20° forward, Y −0.1
  rotX(rigs.torso?.belly, deg(lerp(0, 20, cB)));
  trY(rigs.torso?.belly, lerp(0, -0.1, cB));

  // Arms: fast downward swing (~0..0.4s)
  const cA = easeInCubic(clamp01(t / 0.4));

  rotX(rigs.arms?.left?.rotateWS, deg(+80) * cA);
  rotX(rigs.arms?.right?.rotateWS, deg(+80) * cA);

  // Keep pads side-ish
  rotY(rigs.arms?.left?.lowerRotateWS, deg(+20) * cA);
  rotY(rigs.arms?.right?.lowerRotateWS, deg(-20) * cA);

  // Slight elbow assist
  rotX(rigs.arms?.left?.lowerRotateWS, deg(+25) * cA);
  rotX(rigs.arms?.right?.lowerRotateWS, deg(+25) * cA);

  // Finger extension near impact (~0.25s window)
  const fExt = clamp01((t - 0.25) / 0.2);
  rotX(rigs.arms?.left?.fingers?.cluster, deg(lerp(-28, -5, fExt)));
  rotX(rigs.arms?.right?.fingers?.cluster, deg(lerp(-28, -5, fExt)));

  // Boulder spawn: start at ~0.35s, 1.0s rise/scale (easeOutBack)
  const root = atk?.boulder?.root;
  if (root) {
    const tb = clamp01((t - 0.35) / 1.0);

    // easeOutBack without function/number confusion
    const sb = (() => {
      const s = 1.70158;
      const u = tb - 1.0;
      return 1.0 + u * u * ((s + 1.0) * u + s);
    })();

    root.reset?.();
    root.translate([0.0, lerp(-0.4, 0.0, tb), 0.0]); // rise -0.4 -> 0.0
    root.scale([sb, sb, sb]); // scale 0 -> 1 with slight overshoot
  }
}


export function applyPhaseStandSlam(rigs, atk, timeSeconds, phaseOut) {
  const t = Math.max(0, timeSeconds || 0);

  // Segment durations (tweak to taste)
  const standDur = 1.0; // raise/charge
  const hold = 0.12; // visible pause before slam
  const slamDur = 1.4; // torso + fingers + boulder
  const endHold = 0.12; // brief pause after slam before looping
  const total = standDur + hold + slamDur + endHold;

  // Loop the whole sequence
  const tl = (t % total + total) % total;

  const standEnd = standDur;
  const slamStart = standEnd + hold;
  const slamEnd = slamStart + slamDur;

  if (phaseOut) {
    phaseOut.label =
      tl < standEnd
        ? "stand"
        : tl < slamStart
        ? "hold"
        : tl < slamEnd
        ? "slam"
        : "loopHold";
  }

  // Final pose of stand phase (used during hold and as slam baseline)
  function applyStandEndPose(scale = 1.0) {
    // Head baseline (match your stand end targets)
    // Note: you're using deg(85) as a translation. If you intended 0.85 units,
    // change deg(85) to 0.85.
    trY(rigs.head?.head, deg(105) * scale);
    rotX(rigs.head?.head, deg(-25) * scale);
    rotX(rigs.head?.jaw, deg(15) * scale);

    // Torso (final stand pose)
    rotX(rigs.torso?.rump, deg(-10) * scale);

    trY(rigs.torso?.connector, 0.55 * scale);
    rotX(rigs.torso?.connector, deg(-4) * scale);
    // Avoid scZ carry here to prevent scale popping between loops
    
    trY(rigs.torso?.belly, 1.35 * scale);
    rotX(rigs.torso?.belly, deg(-30) * scale);



    // Arms up and curled
    trY(rigs.arms?.left?.liftWS, 3.0 * scale);
    trX(rigs.arms?.left?.liftWS, -0.8 * scale);
    rotX(rigs.arms?.left?.rotateWS, deg(-60) * scale);
    rotY(rigs.arms?.left?.lowerRotateWS, deg(-40) * scale);
    rotX(rigs.arms?.left?.lowerRotateWS, deg(-40) * scale);
    trZ(rigs.arms?.left?.lowerLiftWS, 1.5 * scale);
    rotX(rigs.arms?.left?.forearm, deg(55) * scale);
    rotX(rigs.arms?.left?.fingers?.cluster, deg(120) * scale);
     
    trY(rigs.arms?.right?.liftWS, 3.0 * scale);
    trX(rigs.arms?.right?.liftWS, 0.8 * scale);
    rotX(rigs.arms?.right?.rotateWS, deg(-60) * scale);
    rotY(rigs.arms?.right?.lowerRotateWS, deg(40) * scale);
    rotX(rigs.arms?.right?.lowerRotateWS, deg(-40) * scale);
    trZ(rigs.arms?.right?.lowerLiftWS, 1.5 * scale);
    rotX(rigs.arms?.right?.forearm, deg(55) * scale);
    rotX(rigs.arms?.right?.fingers?.cluster, deg(120) * scale);

   
  }

  // Hide boulder outside the slam segment so it doesn't linger
  function hideBoulder() {
    const root = atk?.boulder?.root;
    if (!root) return;
    root.reset?.();
    root.scale?.([0, 0, 0]);
  }

  // A) Stand: 0..standEnd
  if (tl < standEnd) {
    const tt = tl;
    const dur = standDur;

    // Head (your current inputs)
    const kH = easeInOutSine((tt - 0.15) / 0.45);
    const cH = clamp01(kH);
    trY(rigs.head?.head, deg(lerp(0, 105, cH)));
    rotX(rigs.head?.head, deg(lerp(0, -25, cH)));
    rotX(rigs.head?.jaw, deg(lerp(0, 15, cH)));

    // Torso wave timing (slight offsets)
    const kR = easeInOutSine((tt - 0.0) / 0.7);
    const kC = easeInOutSine((tt - 0.05) / 0.7);
    const kB = easeInOutSine((tt - 0.15) / 0.45);
    const cR = clamp01(kR);
    const cC = clamp01(kC);
    const cB = clamp01(kB);

    rotX(rigs.torso?.rump, deg(lerp(0, -10, cR)));
    trY(rigs.torso?.connector, lerp(0.0, 0.55, cC));
    rotX(rigs.torso?.connector, deg(lerp(0, -4, cC)));
    scZ(rigs.torso?.connector, 1.5 + 0.05 * cC);
    trY(rigs.torso?.belly, lerp(0.0, 1.35, cB));
    rotX(rigs.torso?.belly, deg(lerp(0, -30, cB)));

    // Arms raise
    const cA = clamp01(easeInOutSine(tt + 0.1 / dur));
    trY(rigs.arms?.left?.liftWS, 3.0 * cA);
    trX(rigs.arms?.left?.liftWS, -0.8 * cA);
    rotX(rigs.arms?.left?.rotateWS, deg(-60) * cA);
    rotY(rigs.arms?.left?.lowerRotateWS, deg(-40) * cA);
    rotX(rigs.arms?.left?.lowerRotateWS, deg(-40) * cA);
    trZ(rigs.arms?.left?.lowerLiftWS, 1.5 * cA);
    rotX(rigs.arms?.left?.forearm, deg(55) * cA);
    rotX(rigs.arms?.left?.fingers?.cluster, deg(120) * cA);

    trY(rigs.arms?.right?.liftWS, 3.0 * cA);
    trX(rigs.arms?.right?.liftWS, 0.8 * cA);
    rotX(rigs.arms?.right?.rotateWS, deg(-60) * cA);
    rotY(rigs.arms?.right?.lowerRotateWS, deg(40) * cA);
    rotX(rigs.arms?.right?.lowerRotateWS, deg(-40) * cA);
    trZ(rigs.arms?.right?.lowerLiftWS, 1.5 * cA);
    rotX(rigs.arms?.right?.forearm, deg(55) * cA);
    rotX(rigs.arms?.right?.fingers?.cluster, deg(120) * cA);

    hideBoulder();
    return;
  }

  // B) Hold between stand and slam (freeze final stand pose — now includes head)
  if (tl < slamStart) {
    applyStandEndPose(0.5);
    hideBoulder();
    return;
  }

  // C + D) Slam section (with final loop hold)
  const t2 = Math.min(tl - slamStart, slamDur);

  // Carry: fade out stand pose during first 0.12s of slam (now includes head)
  const carry = Math.max(0, 1 - t2 / 0.12);
  if (carry > 0) applyStandEndPose(carry);

  // Head wave on slam (additive to carry)
  const headC = easeInCubic(clamp01((t2 - 0.0) / 0.2));
  const jawC= easeInCubic(clamp01((t2 - 0.10) / 0.2));

  rotX(rigs.head?.head, deg(lerp(0, 15, headC)));
  trY(rigs.head?.jaw, lerp(0, -0.2, jawC));

  // Torso wave
  const cR = easeInCubic(clamp01((t2 - 0.0) / 0.7));
  const cC = easeInOutSine(clamp01((t2 - 0.05) / 0.6));
  const cB = easeInCubic(clamp01((t2 - 0.0) / 0.2));

  //rotX(rigs.torso?.rump, deg(lerp(0, -7, cR)));

   scZ(rigs.torso?.connector,  1.5 + 0.05 * cC); // stretch slightly
  trY(rigs.torso?.connector, -0.15);
  scY(rigs.torso?.connector, lerp(1.0, 0.95, cC));
  //rotX(rigs.torso?.connector, deg(lerp(0, 5, cC)));

  // If you intended belly to move in slam, uncomment these:
   rotX(rigs.torso?.belly, deg(lerp(0, 4, cB)));
   trY(rigs.torso?.belly, lerp(0, -0.1, cB));

  // Arms
  const cA = easeInCubic(clamp01(t2 + 0.2 / 0.2));
  rotY(rigs.arms?.left?.forearm, deg(-10) * cA);
  rotY(rigs.arms?.right?.forearm, deg(+10) * cA);

  rotY(rigs.arms?.left?.lowerRotateWS, deg(+20) * cA);
  rotY(rigs.arms?.right?.lowerRotateWS, deg(-20) * cA);

  rotX(rigs.arms?.left?.lowerRotateWS, deg(+25) * cA);
  rotX(rigs.arms?.right?.lowerRotateWS, deg(+25) * cA);

  //fingers
const fExt = clamp01((t2 - 0.0) / 0.2);

rotX(rigs.arms?.right?.fingers?.cluster, deg(120) * fExt);
rotX(rigs.arms?.right?.fingers?.cluster, deg(lerp(28, -5, fExt)));
rotX(rigs.arms?.left?.fingers?.cluster, deg(120) * fExt);
rotX(rigs.arms?.left?.fingers?.cluster, deg(lerp(28, -5, fExt)));

  // Boulder (active during slam; frozen at end during loopHold)
  // const root = atk?.boulder?.root;
  // if (root) {
  //   const tb = clamp01((t2 - 0.35) / 1.0);
  //   const sb = easeOutBack(tb);
  //   root.reset?.();
  //   root.translate([0.0, lerp(-0.4, 0.0, tb), 0.0]);
  //   root.scale([sb, sb, sb]);
  // }
}

export function applyPhase3BoulderEmergence(atk, timeSeconds, anchors, opts) {
  const t = Math.max(0, timeSeconds || 0);
  const root = atk?.boulder?.root;
  if (!root) return;

  // Timing
  const riseDur = opts?.riseDur ?? 1.0;
  const holdDur = opts?.holdDur ?? 0.4;
  const total = riseDur + holdDur;
  const tl = (t % total + total) % total;

  // Anchors (world space)
  const headPos = anchors?.headPos || [0, 0, 0];
  const fwd = anchors?.headFwd || [0, 0, 1];
  const right = anchors?.headRight || [1, 0, 0];

  // Placement controls
  const ahead = opts?.ahead ?? 1.0; // forward distance
  const upBias = opts?.upBias ?? 0.0; // vertical offset
  const rightBias = opts?.rightBias ?? 0.0; // lateral offset (to the model's right)

  const baseX = headPos[0] + fwd[0] * ahead + right[0] * rightBias;
  const baseY = headPos[1] + upBias + right[1] * rightBias;
  const baseZ = headPos[2] + fwd[2] * ahead + right[2] * rightBias;

  // Progress
  const tb = tl < riseDur ? clamp01(tl / riseDur) : 1.0;

  // Scale 0->1 (easeOutBack), with asymmetry
  const s = easeOutBack(tb);
  const sx = (opts?.baseScaleX ?? 0.8) * s;
  const sy = (opts?.baseScaleY ?? 1.0) * s;
  const sz = (opts?.baseScaleZ ?? 0.6) * s;

  // Start depth below spawn point
  const startDepth = opts?.startDepth ?? 0.4; // was hardcoded -0.4
  const yOff = tl < riseDur ? lerp(-startDepth, 0.0, tb) : 0.0;

  // Optional spin (about 30 degrees total across rise)
  const spinDeg =
    (opts?.spinDeg ?? 30) * (tl < riseDur ? easeInOutSine(tb) : 1.0);

  root.reset?.();
  root.translate([baseX, baseY + yOff, baseZ]);
  root.rotate?.(deg(spinDeg), [0, 1, 0]);
  root.scale([sx, sy, sz]);
}
 // If you add brightness control later:
  // const bright = lerp(0.5, 1.0, tb);
  // root.setEmission?.(bright);


export function applyPhaseStandSlamAndBoulder(
  rigs,
  atk,
  timeSeconds,
  anchors,
  phaseOut,
  opts = {}
) {
  const t = Math.max(0, timeSeconds || 0);

  // Timings
  const standDur = opts.standDur ?? 1.0;
  const preHold = opts.preHold ?? 0.12; // stand→slam pause
  const slamDur = opts.slamDur ?? 1.4;  // full slam duration (keep it!)
  const riseDur = opts.riseDur ?? 0.5;  // boulder rise speed
  const postHold = opts.postHold ?? 0.0;

  // When to spawn boulder relative to slam
  // Use either absolute seconds or fraction of slam
  const impactAtSec =
    opts.impactAtSec != null
      ? Math.max(0, Math.min(slamDur, opts.impactAtSec))
      : Math.max(0, Math.min(1, opts.impactAt ?? 0.7)) * slamDur;

  // Loop timeline
  const total = standDur + preHold + slamDur + riseDur + postHold;
  const tl = (t % total + total) % total;

  const standEnd = standDur;
  const holdEnd = standEnd + preHold;
  const impactStart = holdEnd + impactAtSec; // start boulder inside the slam
  const slamEnd = holdEnd + slamDur;
  const riseEnd = impactStart + riseDur; // rise overlaps with last part of slam

  if (phaseOut) {
    phaseOut.label =
      tl < standEnd
        ? "stand"
        : tl < holdEnd
        ? "preHold"
        : tl < impactStart
        ? "slam-preImpact"
        : tl < slamEnd
        ? "slam-postImpact"
        : tl < riseEnd
        ? "rise"
        : "postHold";
  }

  function applyStandEndPose(scale = 1.0) {
    trY(rigs.head?.head, deg(105) * scale);
    rotX(rigs.head?.head, deg(-25) * scale);
    rotX(rigs.head?.jaw, deg(15) * scale);

    rotX(rigs.torso?.rump, deg(-10) * scale);
    trY(rigs.torso?.connector, 0.55 * scale);
    rotX(rigs.torso?.connector, deg(-4) * scale);

    trY(rigs.torso?.belly, 1.35 * scale);
    rotX(rigs.torso?.belly, deg(-30) * scale);

    trY(rigs.arms?.left?.liftWS, 3.0 * scale);
    trX(rigs.arms?.left?.liftWS, -0.8 * scale);
    rotX(rigs.arms?.left?.rotateWS, deg(-60) * scale);
    rotY(rigs.arms?.left?.lowerRotateWS, deg(-40) * scale);
    rotX(rigs.arms?.left?.lowerRotateWS, deg(-40) * scale);
    trZ(rigs.arms?.left?.lowerLiftWS, 1.5 * scale);
    rotX(rigs.arms?.left?.forearm, deg(55) * scale);
    rotX(rigs.arms?.left?.fingers?.cluster, deg(120) * scale);

    trY(rigs.arms?.right?.liftWS, 3.0 * scale);
    trX(rigs.arms?.right?.liftWS, 0.8 * scale);
    rotX(rigs.arms?.right?.rotateWS, deg(-60) * scale);
    rotY(rigs.arms?.right?.lowerRotateWS, deg(40) * scale);
    rotX(rigs.arms?.right?.lowerRotateWS, deg(-40) * scale);
    trZ(rigs.arms?.right?.lowerLiftWS, 1.5 * scale);
    rotX(rigs.arms?.right?.forearm, deg(55) * scale);
    rotX(rigs.arms?.right?.fingers?.cluster, deg(120) * scale);
  }

  // Exact slam-impact freeze pose (if you want to hold it after slam ends)
  function applySlamImpactPose(scale = 1.0) {
    rotX(rigs.head?.head, deg(15) * scale);
    trY(rigs.head?.jaw, -0.2 * scale);

    trY(rigs.torso?.connector, -0.15 * scale);
    scY(rigs.torso?.connector, lerp(1.0, 0.95, 1.0) * scale);
    scZ(rigs.torso?.connector, (1.5 + 0.05) ** scale);
    rotX(rigs.torso?.belly, deg(4) * scale);
    trY(rigs.torso?.belly, -0.1 * scale);

    rotY(rigs.arms?.left?.forearm, deg(-10) * scale);
    rotY(rigs.arms?.right?.forearm, deg(+10) * scale);
    rotY(rigs.arms?.left?.lowerRotateWS, deg(+20) * scale);
    rotY(rigs.arms?.right?.lowerRotateWS, deg(-20) * scale);
    rotX(rigs.arms?.left?.lowerRotateWS, deg(+25) * scale);
    rotX(rigs.arms?.right?.lowerRotateWS, deg(+25) * scale);

    rotX(rigs.arms?.left?.fingers?.cluster, deg(-5) * scale);
    rotX(rigs.arms?.right?.fingers?.cluster, deg(-5) * scale);
  }

  function hideBoulder() {
    const root = atk?.boulder?.root;
    if (!root) return;
    root.reset?.();
    root.scale?.([0, 0, 0]);
  }

  // A) Stand
  if (tl < standEnd) {
    const tt = tl;
    const dur = standDur;

    const kH = easeInOutSine((tt - 0.15) / 0.45);
    const cH = clamp01(kH);
    trY(rigs.head?.head, deg(lerp(0, 105, cH)));
    rotX(rigs.head?.head, deg(lerp(0, -25, cH)));
    rotX(rigs.head?.jaw, deg(lerp(0, 15, cH)));

    const kR = easeInOutSine((tt - 0.0) / 0.7);
    const kC = easeInOutSine((tt - 0.05) / 0.7);
    const kB = easeInOutSine((tt - 0.15) / 0.45);
    const cR = clamp01(kR);
    const cC = clamp01(kC);
    const cB = clamp01(kB);

    rotX(rigs.torso?.rump, deg(lerp(0, -10, cR)));
    trY(rigs.torso?.connector, lerp(0.0, 0.55, cC));
    rotX(rigs.torso?.connector, deg(lerp(0, -4, cC)));
    scZ(rigs.torso?.connector, 1.5 + 0.05 * cC);
    trY(rigs.torso?.belly, lerp(0.0, 1.35, cB));
    rotX(rigs.torso?.belly, deg(lerp(0, -30, cB)));

    const cA = clamp01(easeInOutSine(tt / dur));
    trY(rigs.arms?.left?.liftWS, 3.0 * cA);
    trX(rigs.arms?.left?.liftWS, -0.8 * cA);
    rotX(rigs.arms?.left?.rotateWS, deg(-60) * cA);
    rotY(rigs.arms?.left?.lowerRotateWS, deg(-40) * cA);
    rotX(rigs.arms?.left?.lowerRotateWS, deg(-40) * cA);
    trZ(rigs.arms?.left?.lowerLiftWS, 1.5 * cA);
    rotX(rigs.arms?.left?.forearm, deg(55) * cA);
    rotX(rigs.arms?.left?.fingers?.cluster, deg(120) * cA);

    trY(rigs.arms?.right?.liftWS, 3.0 * cA);
    trX(rigs.arms?.right?.liftWS, 0.8 * cA);
    rotX(rigs.arms?.right?.rotateWS, deg(-60) * cA);
    rotY(rigs.arms?.right?.lowerRotateWS, deg(40) * cA);
    rotX(rigs.arms?.right?.lowerRotateWS, deg(-40) * cA);
    trZ(rigs.arms?.right?.lowerLiftWS, 1.5 * cA);
    rotX(rigs.arms?.right?.forearm, deg(55) * cA);
    rotX(rigs.arms?.right?.fingers?.cluster, deg(120) * cA);

    hideBoulder();
    return;
  }

  // B) Pre-hold
  if (tl < holdEnd) {
     // Freeze exactly the stand end pose
   applyStandEndPose(1.0);
  // Also keep the connector Z-scale from stand end (1.5 + 0.05)
  scZ(rigs.torso?.connector, 1.55);
  hideBoulder();
  return;
  }

  // C) Slam (pre-impact): before impactStart, animate slam and hide boulder
if (tl < impactStart) {
  const t2 = tl - holdEnd;

  // Drivers
  const headC = easeInCubic(clamp01((t2 - 0.0) / 0.2));
  const jawC = easeInCubic(clamp01((t2 - 0.1) / 0.2));
  const cR = easeInCubic(clamp01((t2 - 0.0) / 0.7));   // rump
  const cC = easeInOutSine(clamp01((t2 - 0.05) / 0.6)); // connector
  const cB = easeInCubic(clamp01((t2 - 0.0) / 0.2));    // belly
  const cA = easeInCubic(clamp01((t2 + 0.2) / 0.2));    // arms

  // Blend progress (first 0.12s)
  const alpha = easeInOutSine(clamp01(t2 / 0.52));

  // Stand-end (match applyStandEndPose end)
  const S_headTY = deg(105);
  const S_headRX = deg(-25);

  const S_rumpRX = deg(-10);

  const S_connTY = 0.55;
  const S_connRX = deg(-4);
  const S_connSY = 1.0;
  const S_connSZ = 1.55; // 1.5 + 0.05

  const S_bellyTY = 1.35;
  const S_bellyRX = deg(-30);

  // Slam targets
  const L_headTY = 0.0; // you weren't moving head Y in slam; blend to 0
  const L_headRX = deg(lerp(0, 15, headC));
  const L_jawTY = lerp(0, -0.2, jawC);

  const L_rumpRX = deg(lerp(0, -7, cR));

  const L_connTY = -0.15;
  const L_connRX = deg(lerp(0, -5, cC));
  const L_connSY = lerp(1.0, 0.95, cC);
  const L_connSZ = 1.5 + 0.05 * cC;

  const L_bellyTY = lerp(0, -0.1, cB);
  const L_bellyRX = deg(lerp(0, 4, cB));

  // Single-writer, per-channel blends
  trY(rigs.head?.head, lerp(S_headTY, L_headTY, alpha));
  rotX(rigs.head?.head, lerp(S_headRX, L_headRX, alpha));
  trY(rigs.head?.jaw, L_jawTY);

  rotX(rigs.torso?.rump, lerp(S_rumpRX, L_rumpRX, alpha));

  trY(rigs.torso?.connector, lerp(S_connTY, L_connTY, alpha));
  rotX(rigs.torso?.connector, lerp(S_connRX, L_connRX, alpha));
  scY(rigs.torso?.connector, lerp(S_connSY, L_connSY, alpha));
  scZ(rigs.torso?.connector, lerp(S_connSZ, L_connSZ, alpha));

  trY(rigs.torso?.belly, lerp(S_bellyTY, L_bellyTY, alpha));
  rotX(rigs.torso?.belly, lerp(S_bellyRX, L_bellyRX, alpha));

  // Arms (keep stand lift/rot as base; blend channels that change)
  const S_L_liftY = 3.0, S_L_liftX = -0.8, S_L_rotX = deg(-60);
  const S_L_lowRY = deg(-40), S_L_lowRX = deg(-40), S_L_lowLZ = 1.5, S_L_foreRX = deg(55);
  const S_R_liftY = 3.0, S_R_liftX = 0.8, S_R_rotX = deg(-60);
  const S_R_lowRY = deg(40), S_R_lowRX = deg(-40), S_R_lowLZ = 1.5, S_R_foreRX = deg(55);

  const L_L_foreRY = deg(-10) * cA;
  const L_R_foreRY = deg(+10) * cA;
  const L_L_lowRY = deg(+20) * cA;
  const L_R_lowRY = deg(-20) * cA;
  const L_L_lowRX = deg(+25) * cA;
  const L_R_lowRX = deg(+25) * cA;

  // Left arm
  trY(rigs.arms?.left?.liftWS, S_L_liftY);
  trX(rigs.arms?.left?.liftWS, S_L_liftX);
  rotX(rigs.arms?.left?.rotateWS, S_L_rotX);
  rotY(rigs.arms?.left?.lowerRotateWS, lerp(S_L_lowRY, L_L_lowRY, alpha));
  rotX(rigs.arms?.left?.lowerRotateWS, lerp(S_L_lowRX, L_L_lowRX, alpha));
  trZ(rigs.arms?.left?.lowerLiftWS, S_L_lowLZ);
  rotX(rigs.arms?.left?.forearm, S_L_foreRX);
  rotY(rigs.arms?.left?.forearm, L_L_foreRY);

  // Right arm
  trY(rigs.arms?.right?.liftWS, S_R_liftY);
  trX(rigs.arms?.right?.liftWS, S_R_liftX);
  rotX(rigs.arms?.right?.rotateWS, S_R_rotX);
  rotY(rigs.arms?.right?.lowerRotateWS, lerp(S_R_lowRY, L_R_lowRY, alpha));
  rotX(rigs.arms?.right?.lowerRotateWS, lerp(S_R_lowRX, L_R_lowRX, alpha));
  trZ(rigs.arms?.right?.lowerLiftWS, S_R_lowLZ);
  rotX(rigs.arms?.right?.forearm, S_R_foreRX);
  rotY(rigs.arms?.right?.forearm, L_R_foreRY);

  // Fingers – keep curled or blend as you like
  rotX(rigs.arms?.left?.fingers?.cluster, deg(120));
  rotX(rigs.arms?.right?.fingers?.cluster, deg(120));

  hideBoulder();
  return;
}
  // D) Slam (post-impact) AND Boulder rise overlap
  if (tl < slamEnd) {
    const t2 = tl - holdEnd;               // slam local time
    const tRise = tl - impactStart;        // rise local time (>= 0 here)

    // Continue the slam animation exactly as above (so no visual change)
    const carry = Math.max(0, 1 - t2 / 0.12);
    if (carry > 0) applyStandEndPose(carry);

    const headC = easeInCubic(clamp01((t2 - 0.0) / 0.2));
    const jawC = easeInCubic(clamp01((t2 - 0.1) / 0.2));
    rotX(rigs.head?.head, deg(lerp(0, 15, headC)));
    trY(rigs.head?.jaw, lerp(0, -0.2, jawC));

    const cC = easeInOutSine(clamp01((t2 - 0.05) / 0.6));
    const cB = easeInCubic(clamp01((t2 - 0.0) / 0.2));
    scZ(rigs.torso?.connector, 1.5 + 0.05 * cC);
    trY(rigs.torso?.connector, -0.15);
    scY(rigs.torso?.connector, lerp(1.0, 0.95, cC));
    rotX(rigs.torso?.belly, deg(lerp(0, 4, cB)));
    trY(rigs.torso?.belly, lerp(0, -0.1, cB));

    const cA = easeInCubic(clamp01(t2 + 0.2 / 0.2));
    rotY(rigs.arms?.left?.forearm, deg(-10) * cA);
    rotY(rigs.arms?.right?.forearm, deg(+10) * cA);
    rotY(rigs.arms?.left?.lowerRotateWS, deg(+20) * cA);
    rotY(rigs.arms?.right?.lowerRotateWS, deg(-20) * cA);
    rotX(rigs.arms?.left?.lowerRotateWS, deg(+25) * cA);
    rotX(rigs.arms?.right?.lowerRotateWS, deg(+25) * cA);

    const fExt = clamp01((t2 - 0.0) / 0.2);
    rotX(rigs.arms?.right?.fingers?.cluster, deg(120) * fExt);
    rotX(rigs.arms?.right?.fingers?.cluster, deg(lerp(28, -5, fExt)));
    rotX(rigs.arms?.left?.fingers?.cluster, deg(120) * fExt);
    rotX(rigs.arms?.left?.fingers?.cluster, deg(lerp(28, -5, fExt)));

    // Boulder rise overlapping the end of slam
    const root = atk?.boulder?.root;
    if (root) {
      const headPos = anchors?.headPos || [0, 0, 0];
      const fwd = anchors?.headFwd || [0, 0, 1];
      const right = anchors?.headRight || [1, 0, 0];

      const ahead = opts.ahead ?? 7.2;
      const upBias = opts.upBias ?? -2.2;
      const rightBias = opts.rightBias ?? 0.0;

      const baseX = headPos[0] + fwd[0] * ahead + right[0] * rightBias;
      const baseY = headPos[1] + upBias + right[1] * rightBias;
      const baseZ = headPos[2] + fwd[2] * ahead + right[2] * rightBias;

      const tb = clamp01(tRise / riseDur);
      const sRaw = easeOutBack(tb, opts.outBackS ?? 1.70158);
      const s = (1 - (opts.minScale ?? 0)) * sRaw + (opts.minScale ?? 0);

      const sx = (opts.baseScaleX ?? 1.4) * s;
      const sy = (opts.baseScaleY ?? 1.2) * s;
      const sz = (opts.baseScaleZ ?? 1.4) * s;

      const startDepth = opts.startDepth ?? 0.25;
      const yOff = lerp(-startDepth, 0.0, tb);

      const spinDeg =
        (opts.spinDeg ?? 20) * (tb <= 0 ? 0 : easeInOutSine(tb));

      root.reset?.();
      root.translate([baseX, baseY + yOff, baseZ]);
      root.rotate?.(deg(spinDeg), [0, 1, 0]);
      root.scale([sx, sy, sz]);
    }
    return;
  }

  // E) After slam ends but rise still finishing: keep impact pose so there’s no snap
  if (tl < riseEnd) {
    const tRise = tl - impactStart;

    applySlamImpactPose(1.0);

    const root = atk?.boulder?.root;
    if (root) {
      const headPos = anchors?.headPos || [0, 0, 0];
      const fwd = anchors?.headFwd || [0, 0, 1];
      const right = anchors?.headRight || [1, 0, 0];

      const ahead = opts.ahead ?? 7.2;
      const upBias = opts.upBias ?? -2.2;
      const rightBias = opts.rightBias ?? 0.0;

      const baseX = headPos[0] + fwd[0] * ahead + right[0] * rightBias;
      const baseY = headPos[1] + upBias + right[1] * rightBias;
      const baseZ = headPos[2] + fwd[2] * ahead + right[2] * rightBias;

      const tb = clamp01(tRise / riseDur);
      const sRaw = easeOutBack(tb, opts.outBackS ?? 1.70158);
      const s = (1 - (opts.minScale ?? 0)) * sRaw + (opts.minScale ?? 0);

      const sx = (opts.baseScaleX ?? 1.4) * s;
      const sy = (opts.baseScaleY ?? 1.2) * s;
      const sz = (opts.baseScaleZ ?? 1.4) * s;

      const startDepth = opts.startDepth ?? 0.25;
      const yOff = lerp(-startDepth, 0.0, tb);

      const spinDeg =
        (opts.spinDeg ?? 20) * (tb <= 0 ? 0 : easeInOutSine(tb));

      root.reset?.();
      root.translate([baseX, baseY + yOff, baseZ]);
      root.rotate?.(deg(spinDeg), [0, 1, 0]);
      root.scale([sx, sy, sz]);
    }
    return;
  }

  // F) Post hold (optional)
  {
    // const freeze = 1.0 - clamp01(tRise / 0.2);
    //applySlamImpactPose(1.0); // or fade it out if you want
  }
}


export function applyPhase4BeamCharge(
  rigs,
  atk,
  timeSeconds,
  anchors,
  opts = {}
) {
  const t = Math.max(0, timeSeconds || 0);
  const beam = atk?.beam;
  const boulder = atk?.boulder;
  if (!beam || !beam.root || !beam.core || !beam.coil) return;

  // Timings (seconds)
  const jawOpenDur = opts.jawOpenDur ?? 0.4;
  const coreAppearDelay = opts.coreAppearDelay ?? 0.0;
  const coreAppearDur = opts.coreAppearDur ?? 0.2;
  const coilAppearDelay = opts.coilAppearDelay ?? 0.1;
  const coilAppearDur = opts.coilAppearDur ?? 0.3;
  const chargeRampDelay = opts.chargeRampDelay ?? 0.0;
  const chargeRampDur = opts.chargeRampDur ?? 0.8;

  // Mouth anchor (in front of head)
  const headPos = anchors?.headPos || [0, 0, 0];
  const fwd = anchors?.headFwd || [0, 0, 1];
  const up = anchors?.headUp || [0, 1, 0];
  const right = anchors?.headRight || [1, 0, 0];

  const mouthAhead = opts.mouthAhead ?? 0.9;
  const mouthUp = opts.mouthUp ?? 0.0;
  const mouthPos = [
    headPos[0] + fwd[0] * mouthAhead + up[0] * mouthUp,
    headPos[1] + fwd[1] * mouthAhead + up[1] * mouthUp,
    headPos[2] + fwd[2] * mouthAhead + up[2] * mouthUp,
  ];

  // Rotate beam Z-axis to face forward
  function alignZToDir(ops, dir) {
    const vz = [0, 0, 1];
    const d = Math.max(
      -1,
      Math.min(1, vz[0] * dir[0] + vz[1] * dir[1] + vz[2] * dir[2])
    );
    const ang = Math.acos(d);
    if (ang < 1e-5) return;
    if (Math.abs(ang - Math.PI) < 1e-5) {
      ops.rotate(Math.PI, [1, 0, 0]);
      return;
    }
    const ax = vz[1] * dir[2] - vz[2] * dir[1];
    const ay = vz[2] * dir[0] - vz[0] * dir[2];
    const az = vz[0] * dir[1] - vz[1] * dir[0];
    const L = Math.hypot(ax, ay, az) || 1;
    ops.rotate(ang, [ax / L, ay / L, az / L]);
  }

  // Jaw open + slight head tilt back
  const j = easeOutCubic(Math.min(1, t / jawOpenDur));
  const t1 = Math.max(0, timeSeconds || 0);
  const dur = 1.0;

  // Torso wave timing (slight offsets), eased
  const kH = easeInOutSine((t-0.15) / 0.45); // overall height progress
  const cH = clamp01(kH);
  const kB = easeInCubic((t - 0.0) / 0.72); // belly
  const cB = clamp01(kB);
  
 //head targets
 const headStartDeg = opts.headRotXStartDeg ?? 0;
 const headEndDeg = -5;
 rotX(rigs.head?.head, deg(lerp(headStartDeg, headEndDeg, cH)));
  rotX(rigs.head?.jaw, deg(lerp(0, 15, cH)));
const bellyChargeZ = opts.bellyChargeZ ?? 0.9; // set to 0.6 if you want
scZ(rigs.torso?.belly, lerp(1.0, bellyChargeZ, cB));  // rotX(rigs.head?.head, deg(lerp(0, -5, j)));
  //rotX(rigs.head?.jaw, deg(lerp(0, 15, j)));

  // Beam root at mouth, aligned to forward
   //beam.root.reset();
  beam.root.translate(mouthPos);
  alignZToDir(beam.root, fwd);

  // Charge amount
  const charge = clamp01((t - chargeRampDelay) / chargeRampDur);

  // Size/radius knobs
  const beamXY = opts.beamXY ?? 1.0; // overall XY radius (core + coil)
  const beamZSeedMul = opts.beamZSeedMul ?? 1.0; // multiplies both seed Zs

  // Core: compressed seed (ball-ish), XY pulse, short Z
  const coreAppear = clamp01((t - coreAppearDelay) / coreAppearDur);
  const coreRotSpeedDeg = opts.coreRotSpeedDeg ?? 120;
  const coreAngle = deg(coreRotSpeedDeg * t);
  const pulseAmp = opts.pulseAmp ?? 0.05;
  const pulseHz = opts.pulseHz ?? 2.0;
  const pulse = 1.0 + pulseAmp * Math.sin(2 * Math.PI * pulseHz * t);

  const coreXYBase = (opts.coreXYBase ?? 1.0) * beamXY;
  const coreSeedZ = (opts.coreSeedZ ?? 0.12) * beamZSeedMul;
  const coreZ = coreSeedZ * (1.0 + 0.2 * charge);

  beam.core.reset();
  beam.core.rotate(coreAngle, [0, 0, 1]);
  const coreXY = Math.max(1e-3, pulse * coreXYBase) * coreAppear;
  const coreSZ = Math.max(1e-3, coreZ) * coreAppear;
  beam.core.scale([coreXY, coreXY, coreSZ]);

  // Coil: compressed helix seed (short Z), slight XY radius oscillation
  const coilAppear = clamp01((t - coilAppearDelay) / coilAppearDur);
  const coilRotSpeedDeg = (opts.coilRotSpeedDeg ?? 120) * 1.3;
  const coilAngle = deg(coilRotSpeedDeg * t);
  const coilPulse = 1.0 + 0.05 * Math.sin(2 * Math.PI * (pulseHz * 1.1) * t);

  const coilXYBase = (opts.coilXYBase ?? 1.0) * beamXY;
  const coilSeedZ = (opts.coilSeedZ ?? 0.1) * beamZSeedMul;

  beam.coil.reset();
  beam.coil.rotate(coilAngle, [0, 0, 1]);
  const coilXY = Math.max(1e-3, coilXYBase * coilPulse) * coilAppear;
  const coilSZ = Math.max(1e-3, coilSeedZ) * coilAppear;
  beam.coil.scale([coilXY, coilXY, coilSZ]);

  // Boulder: gentle forward drift during charge
  const driftDur = opts.boulderDriftDur ?? 0.8;
  const driftDist = opts.boulderDriftDist ?? 0.3;
  const driftK = easeOutSine(Math.min(1, t / driftDur));
  if (boulder?.root) {
    const ahead = opts.boulderAhead ?? (opts.ahead ?? 7.2);
    const upBias = opts.boulderUpBias ?? (opts.upBias ?? -2.2);
    const rightBias = opts.boulderRightBias ?? (opts.rightBias ?? 0.0);

    const baseX = headPos[0] + fwd[0] * ahead + right[0] * rightBias;
    const baseY = headPos[1] + upBias + right[1] * rightBias;
    const baseZ = headPos[2] + fwd[2] * ahead + right[2] * rightBias;

    const driftX = fwd[0] * driftDist * driftK;
    const driftY = fwd[1] * driftDist * driftK;
    const driftZ = fwd[2] * driftDist * driftK;

    const sx = opts.boulderScaleX ?? (opts.baseScaleX ?? 1.4);
    const sy = opts.boulderScaleY ?? (opts.baseScaleY ?? 1.2);
    const sz2 = opts.boulderScaleZ ?? (opts.baseScaleZ ?? 1.4);

    boulder.root.reset();
    boulder.root.translate([baseX + driftX, baseY + driftY, baseZ + driftZ]);
    boulder.root.scale([sx, sy, sz2]);
  }

  // Optional emission ramp if your shader supports it:
  // const emission = lerp(0.4, 1.0, charge);
  // beam.core.setEmission?.(emission);
  // beam.coil.setEmission?.(emission);
}




//final?
// One-shot, full sequence: Stand → Slam (+boulder) → Relax → Beam Charge → Fire
// Keeps your Phase 1–3 logic exactly as before, adds a relax transition,
// then Phase 4 compressed seed and Phase 5 forward-only stretch and spin.
export function applyPhaseAll_AttackSequenceLoop(
  rigs,
  atk,
  timeSeconds,
  anchors,
  phaseOut,
  opts = {}
) {
  const t = Math.max(0, timeSeconds || 0);
  const beam = atk?.beam;
  const boulder = atk?.boulder;

  // Durations
  const standDur = opts.standDur ?? 1.0;
  const preHold = opts.preHold ?? 0.12;
  const slamDur = opts.slamDur ?? 1.0;
  const impactAtSec =
    opts.impactAtSec != null
      ? Math.max(0, Math.min(slamDur, opts.impactAtSec))
      : Math.max(0, Math.min(1, opts.impactAt ?? 0.7)) * slamDur;

  const riseDur = opts.riseDur ?? 0.35;

  // New: jaw-close bridge (keep slam pose, close jaw to neutral)
  const jawCloseDur = opts.jawCloseDur ?? 0.3;

  // Phase 4 (charge) timings
  const jawOpenDur = opts.jawOpenDur ?? 0.4;
  const coreAppearDelay = opts.coreAppearDelay ?? 0.0;
  const coreAppearDur = opts.coreAppearDur ?? 0.2;
  const coilAppearDelay = opts.coilAppearDelay ?? 0.1;
  const coilAppearDur = opts.coilAppearDur ?? 0.3;
  const chargeRampDelay = opts.chargeRampDelay ?? 0.0;
  const chargeRampDur = opts.chargeRampDur ?? 0.8;
  const chargeHold = opts.chargeHold ?? 0.15;

  // Phase 5 (fire)
  const fireDur = opts.fireDur ?? 1.4;
  const impactPause = opts.impactPause ?? 0.06;

  // Landmarks
  const standEnd = standDur;
  const holdEnd = standEnd + preHold;
  const impactStart = holdEnd + impactAtSec;
  const slamEnd = holdEnd + slamDur;
  const riseEnd = impactStart + riseDur;

  // Charge inner end (seed formation total)
  const chargeInnerEnd = Math.max(
    jawOpenDur,
    coreAppearDelay + coreAppearDur,
    coilAppearDelay + coilAppearDur,
    chargeRampDelay + chargeRampDur
  );

  // Bridge and charge windows
  const jawCloseEnd = riseEnd + jawCloseDur;
  const chargeStart = jawCloseEnd;
  const chargeEnd = chargeStart + chargeInnerEnd + chargeHold;

  const fireStart = chargeEnd;
  const fireEnd = fireStart + fireDur;
  const seqEnd = fireEnd + impactPause; // loop point

  // Loop timeline
  const tl = (t % seqEnd + seqEnd) % seqEnd;

  if (phaseOut) {
    phaseOut.label =
      tl < standEnd
        ? "stand"
        : tl < holdEnd
        ? "preHold"
        : tl < impactStart
        ? "slam-preImpact"
        : tl < slamEnd
        ? "slam-postImpact"
        : tl < riseEnd
        ? "rise"
        : tl < jawCloseEnd
        ? "jawClose"
        : tl < chargeEnd
        ? "charge"
        : tl < fireEnd
        ? "fire"
        : "impactPause";
  }

  // Shared anchors and mouth
  const headPos = anchors?.headPos || [0, 0, 0];
  const fwd = anchors?.headFwd || [0, 0, 1];
  const up = anchors?.headUp || [0, 1, 0];
  const right = anchors?.headRight || [1, 0, 0];

  const mouthAhead = opts.mouthAhead ?? 0.9;
  const mouthUp = opts.mouthUp ?? 0.0;
  const mouthPos = [
    headPos[0] + fwd[0] * mouthAhead + up[0] * mouthUp,
    headPos[1] + fwd[1] * mouthAhead + up[1] * mouthUp,
    headPos[2] + fwd[2] * mouthAhead + up[2] * mouthUp,
  ];

  function alignZToDir(ops, dir) {
    const vz = [0, 0, 1];
    const d = Math.max(
      -1,
      Math.min(1, vz[0] * dir[0] + vz[1] * dir[1] + vz[2] * dir[2])
    );
    const ang = Math.acos(d);
    if (ang < 1e-5) return;
    if (Math.abs(ang - Math.PI) < 1e-5) {
      ops.rotate(Math.PI, [1, 0, 0]);
      return;
    }
    const ax = vz[1] * dir[2] - vz[2] * dir[1];
    const ay = vz[2] * dir[0] - vz[0] * dir[2];
    const az = vz[0] * dir[1] - vz[1] * dir[0];
    const L = Math.hypot(ax, ay, az) || 1;
    ops.rotate(ang, [ax / L, ay / L, az / L]);
  }

  // Helpers from Phase 1–3
  function applyStandEndPose(scale = 1.0) {
    trY(rigs.head?.head, deg(105) * scale);
    rotX(rigs.head?.head, deg(-25) * scale);
    rotX(rigs.head?.jaw, deg(15) * scale);

    rotX(rigs.torso?.rump, deg(-10) * scale);
    trY(rigs.torso?.connector, 0.55 * scale);
    rotX(rigs.torso?.connector, deg(-4) * scale);

    trY(rigs.torso?.belly, 1.35 * scale);
    rotX(rigs.torso?.belly, deg(-30) * scale);

    trY(rigs.arms?.left?.liftWS, 3.0 * scale);
    trX(rigs.arms?.left?.liftWS, -0.8 * scale);
    rotX(rigs.arms?.left?.rotateWS, deg(-60) * scale);
    rotY(rigs.arms?.left?.lowerRotateWS, deg(-40) * scale);
    rotX(rigs.arms?.left?.lowerRotateWS, deg(-40) * scale);
    trZ(rigs.arms?.left?.lowerLiftWS, 1.5 * scale);
    rotX(rigs.arms?.left?.forearm, deg(55) * scale);
    rotX(rigs.arms?.left?.fingers?.cluster, deg(120) * scale);

    trY(rigs.arms?.right?.liftWS, 3.0 * scale);
    trX(rigs.arms?.right?.liftWS, 0.8 * scale);
    rotX(rigs.arms?.right?.rotateWS, deg(-60) * scale);
    rotY(rigs.arms?.right?.lowerRotateWS, deg(40) * scale);
    rotX(rigs.arms?.right?.lowerRotateWS, deg(-40) * scale);
    trZ(rigs.arms?.right?.lowerLiftWS, 1.5 * scale);
    rotX(rigs.arms?.right?.forearm, deg(55) * scale);
    rotX(rigs.arms?.right?.fingers?.cluster, deg(120) * scale);
  }

  function applySlamImpactPose(scale = 1.0) {
    rotX(rigs.head?.head, deg(15) * scale);
    trY(rigs.head?.jaw, -0.2 * scale);

    trY(rigs.torso?.connector, -0.15 * scale);
    scY(rigs.torso?.connector, lerp(1.0, 0.95, 1.0) * scale);
    scZ(rigs.torso?.connector, (1.5 + 0.05) ** scale);
    rotX(rigs.torso?.belly, deg(4) * scale);
    trY(rigs.torso?.belly, -0.1 * scale);

    rotY(rigs.arms?.left?.forearm, deg(-10) * scale);
    rotY(rigs.arms?.right?.forearm, deg(+10) * scale);
    rotY(rigs.arms?.left?.lowerRotateWS, deg(+20) * scale);
    rotY(rigs.arms?.right?.lowerRotateWS, deg(-20) * scale);
    rotX(rigs.arms?.left?.lowerRotateWS, deg(+25) * scale);
    rotX(rigs.arms?.right?.lowerRotateWS, deg(+25) * scale);

    rotX(rigs.arms?.left?.fingers?.cluster, deg(-5) * scale);
    rotX(rigs.arms?.right?.fingers?.cluster, deg(-5) * scale);
  }

  // New: keep slam body/arms/head (no jaw changes)
  function applySlamCarryPoseNoJaw(scale = 1.0) {
    //rotX(rigs.head?.head, deg(20) * scale);
    // Jaw untouched here

    trY(rigs.torso?.connector, -0.15 * scale);
    scY(rigs.torso?.connector, lerp(1.0, 0.95, 1.0) * scale);
    scZ(rigs.torso?.connector, (1.5 + 0.05) ** scale);
    rotX(rigs.torso?.belly, deg(4) * scale);
    trY(rigs.torso?.belly, -0.1 * scale);

    rotY(rigs.arms?.left?.forearm, deg(-10) * scale);
    rotY(rigs.arms?.right?.forearm, deg(5) * scale);
    rotY(rigs.arms?.left?.lowerRotateWS, deg(+20) * scale);
    rotY(rigs.arms?.right?.lowerRotateWS, deg(-20) * scale);
    rotX(rigs.arms?.left?.lowerRotateWS, deg(+25) * scale);
    rotX(rigs.arms?.right?.lowerRotateWS, deg(+25) * scale);
    const fCurl = opts.carryFingersDeg ?? 115; // degrees of curl
    rotX(rigs.arms?.left?.fingers?.cluster, deg(fCurl) * scale);
    rotX(rigs.arms?.right?.fingers?.cluster, deg(fCurl) * scale);
  }

  function hideBoulder() {
    const root = boulder?.root;
    if (!root) return;
    root.reset?.();
    root.scale?.([0, 0, 0]);
  }
  function hideBeam() {
    // Hide all the visual parts of the beam
    atk?.beam?.core?.scale?.([0, 0, 0]);
    atk?.beam?.coil?.scale?.([0, 0, 0]);
    atk?.beam?.cone?.scale?.([0, 0, 0]);
  }

  // A) Stand
  if (tl < standEnd) {
    const tt = tl;
    const dur = standDur;

    const kH = easeInOutSine((tt - 0.15) / 0.45);
    const cH = clamp01(kH);
    trY(rigs.head?.head, deg(lerp(0, 105, cH)));
    rotX(rigs.head?.head, deg(lerp(0, -25, cH)));
    rotX(rigs.head?.jaw, deg(lerp(0, 15, cH)));

    const kR = easeInOutSine((tt - 0.0) / 0.7);
    const kC = easeInOutSine((tt - 0.05) / 0.7);
    const kB = easeInOutSine((tt - 0.15) / 0.45);
    const cR = clamp01(kR);
    const cC = clamp01(kC);
    const cB = clamp01(kB);

    rotX(rigs.torso?.rump, deg(lerp(0, -10, cR)));
    trY(rigs.torso?.connector, lerp(0.0, 0.55, cC));
    rotX(rigs.torso?.connector, deg(lerp(0, -4, cC)));
    scZ(rigs.torso?.connector, 1.5 + 0.05 * cC);
    trY(rigs.torso?.belly, lerp(0.0, 1.35, cB));
    rotX(rigs.torso?.belly, deg(lerp(0, -30, cB)));

    const cA = clamp01(easeInOutSine(tt / dur));
    // trY(rigs.arms?.left?.liftWS, 3.0 * cA);
    // trX(rigs.arms?.left?.liftWS, -0.8 * cA);
    // rotX(rigs.arms?.left?.rotateWS, deg(-60) * cA);
    // rotY(rigs.arms?.left?.lowerRotateWS, deg(-40) * cA);
    // rotX(rigs.arms?.left?.lowerRotateWS, deg(-40) * cA);
    // trZ(rigs.arms?.left?.lowerLiftWS, 1.5 * cA);
    // rotX(rigs.arms?.left?.forearm, deg(85) * cA);
    // trX(rigs.arms?.left?.forearm, -0.4 * cA);
    // rotX(rigs.arms?.left?.fingers?.cluster, deg(120) * cA);
    trY(rigs.arms?.left?.liftWS, 3.0 * cA);
    trX(rigs.arms?.lowerLiftWS?.liftWS, -0.8 * cA);
    rotX(rigs.arms?.left?.rotateWS, deg(-60) * cA);
    rotY(rigs.arms?.left?.lowerRotateWS, deg(-40) * cA);
    rotX(rigs.arms?.left?.lowerRotateWS, deg(-40) * cA);
    trZ(rigs.arms?.left?.lowerLiftWS, 1.5 * cA);
    rotX(rigs.arms?.left?.forearm, deg(85) * cA);
    rotX(rigs.arms?.left?.fingers?.cluster, deg(120) * cA);

    trY(rigs.arms?.right?.liftWS, 3.0 * cA);
    trX(rigs.arms?.right?.liftWS, 0.8 * cA);
    rotX(rigs.arms?.right?.rotateWS, deg(-60) * cA);
    rotY(rigs.arms?.right?.lowerRotateWS, deg(40) * cA);
    rotX(rigs.arms?.right?.lowerRotateWS, deg(-40) * cA);
    trZ(rigs.arms?.right?.lowerLiftWS, 1.5 * cA);
    rotX(rigs.arms?.right?.forearm, deg(85) * cA);
    rotX(rigs.arms?.right?.fingers?.cluster, deg(120) * cA);

    hideBoulder();
    hideBeam();
    return;
  }

  // B) Pre-hold
  if (tl < holdEnd) {
    applyStandEndPose(1.0);
    hideBoulder();
    hideBeam();
    return;
  }

  // C) Slam pre-impact
  if (tl < impactStart) {
    const t2 = tl - holdEnd;

    const carry = Math.max(0, 1 - t2 / 0.12);
    if (carry > 0) applyStandEndPose(carry);

    const headC = easeInCubic(clamp01((t2 - 0.0) / 0.2));
    const jawC = easeInCubic(clamp01((t2 - 0.1) / 0.2));
    rotX(rigs.head?.head, deg(lerp(0, 15, headC)));
    trY(rigs.head?.jaw, lerp(0, -0.2, jawC));

    const cC = easeInOutSine(clamp01((t2 - 0.05) / 0.6));
    const cB = easeInCubic(clamp01((t2 - 0.0) / 0.2));
    scZ(rigs.torso?.connector, 1.5 + 0.05 * cC);
    trY(rigs.torso?.connector, -0.15);
    scY(rigs.torso?.connector, lerp(1.0, 0.95, cC));
    rotX(rigs.torso?.belly, deg(lerp(0, 4, cB)));
    trY(rigs.torso?.belly, lerp(0, -0.1, cB));

    const cA = easeInCubic(clamp01(t2 + 0.2 / 0.2));
    rotY(rigs.arms?.left?.forearm, deg(-10) * cA);
    rotY(rigs.arms?.right?.forearm, deg(+10) * cA);
    rotY(rigs.arms?.left?.lowerRotateWS, deg(+20) * cA);
    rotY(rigs.arms?.right?.lowerRotateWS, deg(-20) * cA);
    rotX(rigs.arms?.left?.lowerRotateWS, deg(+25) * cA);
    rotX(rigs.arms?.right?.lowerRotateWS, deg(+25) * cA);

    const fExt = clamp01((t2 - 0.0) / 0.2);
    rotX(rigs.arms?.right?.fingers?.cluster, deg(120) * fExt);
    rotX(rigs.arms?.right?.fingers?.cluster, deg(lerp(28, -5, fExt)));
    rotX(rigs.arms?.left?.fingers?.cluster, deg(120) * fExt);
    rotX(rigs.arms?.left?.fingers?.cluster, deg(lerp(28, -5, fExt)));

    hideBoulder();
    hideBeam();
    return;
  }

  // D) Slam post-impact + boulder rise overlap
  if (tl < slamEnd) {
    const t2 = tl - holdEnd;
    const tRise = tl - impactStart;

    const carry = Math.max(0, 1 - t2 / 0.12);
    if (carry > 0) applyStandEndPose(carry);

    const headC = easeInCubic(clamp01((t2 - 0.0) / 0.2));
    const jawC = easeInCubic(clamp01((t2 - 0.1) / 0.2));
    rotX(rigs.head?.head, deg(lerp(0, 15, headC)));
    //trY(rigs.head?.jaw, lerp(0, -0.2, jawC));

    const cC = easeInOutSine(clamp01((t2 - 0.05) / 0.6));
    const cB = easeInCubic(clamp01((t2 - 0.0) / 0.2));
    scZ(rigs.torso?.connector, 1.5 + 0.05 * cC);
    trY(rigs.torso?.connector, -0.15);
    scY(rigs.torso?.connector, lerp(1.0, 0.95, cC));
    rotX(rigs.torso?.belly, deg(lerp(0, 4, cB)));
    trY(rigs.torso?.belly, lerp(0, -0.1, cB));

    const cA = easeInCubic(clamp01(t2 + 0.2 / 0.2));
    rotY(rigs.arms?.left?.forearm, deg(-10) * cA);
    rotY(rigs.arms?.right?.forearm, deg(5) * cA);
    rotY(rigs.arms?.left?.lowerRotateWS, deg(+20) * cA);
    rotY(rigs.arms?.right?.lowerRotateWS, deg(-20) * cA);
    rotX(rigs.arms?.left?.lowerRotateWS, deg(+25) * cA);
    rotX(rigs.arms?.right?.lowerRotateWS, deg(+25) * cA);

    const fExt = clamp01((t2 - 0.0) / 0.2);
    rotX(rigs.arms?.right?.fingers?.cluster, deg(120) * fExt);
    rotX(rigs.arms?.right?.fingers?.cluster, deg(lerp(28, -5, fExt)));
    rotX(rigs.arms?.left?.fingers?.cluster, deg(120) * fExt);
    rotX(rigs.arms?.left?.fingers?.cluster, deg(lerp(28, -5, fExt)));

    if (boulder?.root) {
      const ahead = opts.ahead ?? 7.2;
      const upBias = opts.upBias ?? -2.2;
      const rightBias = opts.rightBias ?? 0.0;

      const baseX = headPos[0] + fwd[0] * ahead + right[0] * rightBias;
      const baseY = headPos[1] + upBias + right[1] * rightBias;
      const baseZ = headPos[2] + fwd[2] * ahead + right[2] * rightBias;

      const tb = clamp01(tRise / riseDur);
      const sRaw = easeOutBack(tb, opts.outBackS ?? 1.70158);
      const s = (1 - (opts.minScale ?? 0)) * sRaw + (opts.minScale ?? 0);

      const sx = (opts.baseScaleX ?? 1.4) * s;
      const sy = (opts.baseScaleY ?? 1.2) * s;
      const sz = (opts.baseScaleZ ?? 1.4) * s;

      const startDepth = opts.startDepth ?? 0.25;
      const yOff = lerp(-startDepth, 0.0, tb);

      const spinDeg = (opts.spinDeg ?? 20) * (tb <= 0 ? 0 : easeInOutSine(tb));

      boulder.root.reset?.();
      boulder.root.translate([baseX, baseY + yOff, baseZ]);
      boulder.root.rotate?.(deg(spinDeg), [0, 1, 0]);
      boulder.root.scale([sx, sy, sz]);
    }
    hideBeam();
    return;
  }

  // E) Rise finishing (after slam)
  if (tl < riseEnd) {
    const tRise = tl - impactStart;

    applySlamImpactPose(1.0);

    if (boulder?.root) {
      const ahead = opts.ahead ?? 7.2;
      const upBias = opts.upBias ?? -2.2;
      const rightBias = opts.rightBias ?? 0.0;

      const baseX = headPos[0] + fwd[0] * ahead + right[0] * rightBias;
      const baseY = headPos[1] + upBias + right[1] * rightBias;
      const baseZ = headPos[2] + fwd[2] * ahead + right[2] * rightBias;

      const tb = clamp01(tRise / riseDur);
      const sRaw = easeOutBack(tb, opts.outBackS ?? 1.70158);
      const s = (1 - (opts.minScale ?? 0)) * sRaw + (opts.minScale ?? 0);

      const sx = (opts.baseScaleX ?? 1.4) * s;
      const sy = (opts.baseScaleY ?? 1.2) * s;
      const sz = (opts.baseScaleZ ?? 1.4) * s;

      const startDepth = opts.startDepth ?? 0.25;
      const yOff = lerp(-startDepth, 0.0, tb);

      const spinDeg = (opts.spinDeg ?? 20) * (tb <= 0 ? 0 : easeInOutSine(tb));

      boulder.root.reset?.();
      boulder.root.translate([baseX, baseY + yOff, baseZ]);
      boulder.root.rotate?.(deg(spinDeg), [0, 1, 0]);
      boulder.root.scale([sx, sy, sz]);
    }
    hideBeam();
    return;
  }

  // F) JawClose bridge: keep slam body/arms/head, close jaw back to neutral
  if (tl < jawCloseEnd) {
    const k = easeInOutSine((tl - riseEnd) / Math.max(1e-6, jawCloseDur));
    //apply pose
    applySlamCarryPoseNoJaw(1.0);

    rotX(rigs.head?.head, deg(15));

    // translate Y from open (-0.2) to closed (0)
    trY(rigs.head?.jaw, lerp(-0.2, 0.0, k));

    // rotate X from a slight open to neutral (0)
    rotX(rigs.head?.jaw, 0.0);
    hideBoulder();
    hideBeam();
    return;
  }

  // G) Beam Charge — keep slam carry pose; jaw opens slowly via Phase 4
  if (tl < chargeEnd) {
    const tc = tl - chargeStart;
    applySlamCarryPoseNoJaw(1.0);
    applyPhase4BeamCharge(rigs, atk, tc, anchors, {
      headRotXStartDeg: 15,
      mouthAhead,
      mouthUp,

      jawOpenDur,
      coreAppearDelay,
      coreAppearDur,
      coilAppearDelay,
      coilAppearDur,
      chargeRampDelay,
      chargeRampDur,

      // visuals/size
      coreRotSpeedDeg: opts.coreRotSpeedDeg ?? 120,
      coilRotSpeedDeg: opts.coilRotSpeedDeg ?? 120,
      pulseAmp: opts.pulseAmp ?? 0.05,
      pulseHz: opts.pulseHz ?? 2.0,
      beamXY: opts.beamXY ?? 1.0,
      coreXYBase: opts.coreXYBase ?? 1.0,
      coilXYBase: opts.coilXYBase ?? 1.0,
      coreSeedZ: opts.coreSeedZ ?? 0.12,
      coilSeedZ: opts.coilSeedZ ?? 0.1,
      beamZSeedMul: opts.beamZSeedMul ?? 1.0,

      // boulder drift during charge
      boulderDriftDur: opts.boulderDriftDur ?? 0.8,
      boulderDriftDist: opts.boulderDriftDist ?? 0.3,

      ahead: opts.ahead ?? 7.2,
      upBias: opts.upBias ?? -2.2,
      rightBias: opts.rightBias ?? 0.0,
      baseScaleX: opts.baseScaleX ?? 1.4,
      baseScaleY: opts.baseScaleY ?? 1.2,
      baseScaleZ: opts.baseScaleZ ?? 1.4,
    });
    atk?.beam?.cone?.scale([0, 0, 0]);
    return;
  }

// H) Fire — keep charging pose (no neutral snap)
  if (!beam?.root || !beam.core || !beam.coil) return;

  const tf_raw = tl - fireStart; // 0..fireDur (e.g., 0..1.4)
  const tf_norm = tf_raw / Math.max(1e-6, fireDur); // 0..1.0
  const kFire = easeOutCubic(tf_norm); // 0..1.0 eased

  //Boulder push delay logic 
  const boulderPushDelay = opts.boulderPushDelay ?? 1.0; // Your 1.0s delay
  const boulderPushDur = Math.max(1e-6, fireDur - boulderPushDelay);
  const tf_boulder = Math.max(0, tf_raw - boulderPushDelay);
  const kBoulderPush = easeOutCubic(tf_boulder / boulderPushDur); // 0..1 for BOULDER

  

  // Keep slam carry pose; keep jaw/head in "charged" configuration
  applySlamCarryPoseNoJaw(1.0);
  rotX(rigs.head?.jaw, deg(15)); // jaw stays open during fire
  rotX(rigs.head?.head, deg(-5)); // slight tilt back like charge
// Smoothly restore belly Z from compressed (charge) -> normal (1.0) during Fire
{
  // Match the compressed target you used in charge (0.9 in your code)
  const bellyZ0 = opts.bellyChargeZ ?? 0.9;
  const k = easeInOutSine(kFire); // or easeOutCubic(kFire) if you want snappier
  scZ(rigs.torso?.belly, lerp(bellyZ0, 1.0, k));
  scZ(rigs.head?.head, lerp(1,1.2,k ))
}

// We MUST calculate the boulder position and cone 'tipZ' FIRST.
  let tipZ = 0; // This will be the cone's local Z position (to boulder CENTER)
  let boulderRadius = 0; // --- NEW: We will store the boulder's radius here

  if (boulder?.root) {
    // 1. Get base position (from opts)
    const ahead = opts.ahead ?? 7.2;
    const upBias = opts.upBias ?? -2.2;
    const rightBias = opts.rightBias ?? 0.0;
    const baseX = headPos[0] + fwd[0] * ahead + right[0] * rightBias;
    const baseY = headPos[1] + upBias + right[1] * rightBias;
    const baseZ = headPos[2] + fwd[2] * ahead + right[2] * rightBias;

    // 2. Get final drift from charge phase
    const driftDist = opts.boulderDriftDist ?? 0.3;
    const driftX = fwd[0] * driftDist;
    const driftY = fwd[1] * driftDist;
    const driftZ = fwd[2] * driftDist;
    const startX = baseX + driftX;
    const startY = baseY + driftY;
    const startZ = baseZ + driftZ;

    // 3. Get new "beam push" distance
    const pushDist = (opts.boulderPushDist ?? 8.0) * kBoulderPush; 
    const pushX = fwd[0] * pushDist;
    const pushY = fwd[1] * pushDist;
    const pushZ = fwd[2] * pushDist;

    // 4. Calculate final WORLD position
    const boulderWorldPos = [startX + pushX, startY + pushY, startZ + pushZ];

    // 5. Apply all transforms to boulder
    boulder.root.reset?.();
    boulder.root.translate(boulderWorldPos);
    const sx = opts.baseScaleX ?? 1.4;
    const sy = opts.baseScaleY ?? 1.2;
    const sz = opts.baseScaleZ ?? 1.4;
    boulder.root.scale([sx, sy, sz]);
    const spin = (opts.boulderPushSpin ?? 360) * kBoulderPush; 
    boulder.root.rotate?.(deg(spin), fwd);

    // 6. Calculate cone tipZ (distance from mouth to boulder along fwd)
    const vec = [
      boulderWorldPos[0] - mouthPos[0],
      boulderWorldPos[1] - mouthPos[1],
      boulderWorldPos[2] - mouthPos[2],
    ];
    // Dot product with forward vector
    tipZ = vec[0] * fwd[0] + vec[1] * fwd[1] + vec[2] * fwd[2];
    
    // --- NEW: Calculate boulder radius ---
    // (Assumes boulder mesh has a radius of 1.0)
    boulderRadius = (opts.baseScaleZ ?? 1.4) * 1.0; 
  }
  
  // --- NEW: Calculate the final, shorter beam length ---
  const beamLengthZ = Math.max(0, tipZ - boulderRadius);

  // Root placement/orientation
  beam.root.reset();
  beam.root.translate(mouthPos);
  alignZToDir(beam.root, fwd);

  // Use same seed/size as Phase 4, stretch forward
  const beamXY = opts.beamXY ?? 1.0;
  const coreXYBase = (opts.coreXYBase ?? 1.0) * beamXY;
  const coilXYBase = (opts.coilXYBase ?? 1.0) * beamXY;
  const coreSeedZ = opts.coreSeedZ ?? 0.12; // No longer needed
  const coilSeedZ = opts.coilSeedZ ?? 0.1; // No longer needed
  const coreFireZ = opts.coreFireZ ?? 3.0; // No longer needed
   const coilFireZ = opts.coilFireZ ?? 3.0; // No longer needed
  const coreSpin0 = opts.coreRotSpeedDeg ?? 120;
  const coreSpin1 = opts.coreSpinMaxDeg ?? 180;
  const coreSpin = coreSpin0 + (coreSpin1 - coreSpin0) * kFire;
  const coilSpin = coreSpin * 1.3;
  const pulseAmp = opts.pulseAmp ?? 0.05;
  const pulseHz = opts.pulseHz ?? 2.0;

// Core (NEW: Stretches to new shorter length)
  {
    const coreBaseHeight = (opts.beamCoreRadius ?? 0.25) * 2.0;

    // Calculate the scale needed to make the beam's length equal beamLengthZ
    const sZ = beamLengthZ / coreBaseHeight; // <--- USE NEW SHORTER LENGTH
    const sXY =
      coreXYBase *
      (1.0 + 0.03 * Math.sin(2 * Math.PI * (pulseHz * 0.8) * tl));

    beam.core.reset();
    
    // Move it forward by half its final length
    const comp = beamLengthZ * 0.5; // <--- USE NEW SHORTER LENGTH
    
    beam.core.translate([0, 0, comp]);
    beam.core.rotate(deg(coreSpin * tl), [0, 0, 1]);
    // beam.core.scale([0, 0, 0]); // <-- This was for debugging
    beam.core.scale([sXY, sXY, Math.max(1e-3, sZ)]); // Use the new dynamic scale
  }

// Coil
  let sZ_coil_final = 0; 
  {
    const sZ = coilSeedZ + (coilFireZ - coilSeedZ) * kFire;
    sZ_coil_final = sZ; 
    const sXY =
      coilXYBase *
      (1.0 + 0.03 * Math.sin(2 * Math.PI * (pulseHz * 1.1) * tl));

    beam.coil.reset();
    beam.coil.rotate(deg(coilSpin * tl), [0, 0, 1]);
  beam.coil.scale([sXY, sXY, Math.max(1e-3, sZ)]);
  }
  // --- CONE BURST LOGIC (Tied to boulder movement) ---
  if (atk?.beam?.cone) {
    
    // Check if we are within the boulder's push duration
    if (tf_boulder >= 0.0 && tf_boulder <= boulderPushDur && boulderPushDur > 0) { 
      
      const kConeEase = kBoulderPush; 
      
      const startScale = 0.1;
      const maxScale = 3.0; // Your new max size
      const s = lerp(startScale, maxScale, kConeEase);

      atk.beam.cone.reset();
      
      // 1. Rotate 180 deg to flip it
      atk.beam.cone.rotate(deg(180), [0, 1, 0]); 
      
      // 2. Translate the BASE to the boulder's SURFACE
      atk.beam.cone.translate([0, 0, tipZ - boulderRadius]); // <--- USE NEW POSITION
      
      // 3. Scale it up.
      atk.beam.cone.scale([
        Math.max(1e-3, s),
        Math.max(1e-3, s),
        Math.max(1e-3, s), 
      ]);
      
    } else {
      // After duration, hide it
       atk.beam.cone.reset();
       atk.beam.cone.scale([0, 0, 0]); // Hide it cleanly
    }
  }

}
/* -------------------------- Phase manager --------------------------- */
export function createSwampertPhases(rigs, atkRig) {
  let phase = "idle";
  let t = 0;
  const atk = atkRig || null;

  // Anchors fed from main each frame
  const anchors = { headPos: [0, 0, 0], headFwd: [0, 0, 1], headRight: [1, 0, 0] };
  function setPhase(name) {
    phase = name || "idle";
    t = 0;
  }

   function setAnchors(next) {
    if (!next) return;
    if (next.headPos) {
      anchors.headPos[0] = next.headPos[0];
      anchors.headPos[1] = next.headPos[1];
      anchors.headPos[2] = next.headPos[2];
    }
    if (next.headFwd) {
      anchors.headFwd[0] = next.headFwd[0];
      anchors.headFwd[1] = next.headFwd[1];
      anchors.headFwd[2] = next.headFwd[2];
    }
    if (next.headRight) {
      anchors.headRight[0] = next.headRight[0];
      anchors.headRight[1] = next.headRight[1];
      anchors.headRight[2] = next.headRight[2];
    }
  }

  function resetUsedNodes() {
    rigs.head?.head?.reset();
    rigs.head?.jaw?.reset?.();
    rigs.torso?.belly?.reset();
    rigs.torso?.connector?.reset();
    rigs.torso?.rump?.reset();
    rigs.arms?.left?.arm?.reset?.();
    rigs.arms?.right?.arm?.reset?.();
    rigs.arms?.left?.rotateWS?.reset?.();
    rigs.arms?.right?.rotateWS?.reset?.();
    rigs.arms?.left?.lowerRotateWS?.reset?.();
    rigs.arms?.right?.lowerRotateWS?.reset?.();
    rigs.arms?.left?.lowerLiftWS?.reset?.();
    rigs.arms?.right?.lowerLiftWS?.reset?.();
    rigs.arms?.left?.liftWS?.reset?.();
    rigs.arms?.right?.liftWS?.reset?.();
    rigs.arms?.left?.clavicle?.reset?.();
    rigs.arms?.right?.clavicle?.reset?.();
    rigs.arms?.left?.shoulder?.reset?.();
    rigs.arms?.right?.shoulder?.reset?.();
    rigs.arms?.left?.upper?.reset?.();
    rigs.arms?.right?.upper?.reset?.();
    rigs.arms?.left?.forearm?.reset?.();
    rigs.arms?.right?.forearm?.reset?.();
    rigs.arms?.left?.fingers?.cluster?.reset?.();
    rigs.arms?.right?.fingers?.cluster?.reset?.();
    atk?.boulder?.root?.reset?.();
    atk?.beam?.root?.reset?.();
    atk?.beam?.core?.reset?.();
    atk?.beam?.coil?.reset?.();
    atk?.beam?.cone?.reset?.();
  }

  const sub = { label: "stand" };

  function update(dt) {
    t += Math.max(0, dt || 0);
    resetUsedNodes();

    if (phase === "idle") {
      applyPhase0Idle(rigs, t);
    } else if (phase === "standUp") {
      const dur = 1.0;
      const hold = 0.15;
      const tt = timePingPongHold(t, dur, hold);
      applyPhase1StandUp(rigs, tt);
    } else if (phase === "slam") {
      applyPhase2Slam(rigs, atk, t);
    } else if (phase === "fullslam") {
      applyPhaseStandSlam(rigs, atk, t, sub);
    } else if (phase === "boulderRise") {
    applyPhase3BoulderEmergence(atk, t, anchors, {
    riseDur: 1.0,
    holdDur: 0.4,
    ahead: 7.2,      // move further in front of head
    upBias: -2.2,     // lift it up
    rightBias: 0.0,  // slide left/right (+ is to model's right)
    startDepth: 0.25, // start slightly below the spawn point
    spinDeg: 20,     // optional
    baseScaleX: 1.4, // make boulder larger
    baseScaleY: 1.2,
    baseScaleZ: 1.4,
  });
    } else if (phase === "attackLoop") {
      applyPhaseStandSlamAndBoulder(rigs, atk, t, anchors, sub, {
       // keep your slam timing
    standDur: 1.0,
  preHold: 0.12,
  slamDur: 1.0,         // keep your good-looking slam length
  impactAtSec: 0.15,    // boulder starts 0.65s into slam
  riseDur: 0.35,        // fast pop
  postHold: 0.0,

  // pop feel
  startDepth: 0.1,
  minScale: 0.15,
  outBackS: 2.4,

  // placement/size
  ahead: 7.2,
  upBias: -2.2,
  rightBias: 0.0,
  spinDeg: 20,
  baseScaleX: 1.4,
  baseScaleY: 1.2,
  baseScaleZ: 1.4,
      });

    }
    else if (phase === "beamCharge") {
  applyPhase4BeamCharge(rigs, atk, t, anchors, {
    // mouth anchoring
    mouthAhead: 3.9,
    mouthUp: -3.0,

    // timings
    jawOpenDur: 0.4,
    coreAppearDelay: 0.0,
    coreAppearDur: 0.2,
    coilAppearDelay: 0.1,
    coilAppearDur: 0.3,
    chargeRampDelay: 0.0,
    chargeRampDur: 0.8,

    // visuals
    coreRotSpeedDeg: 120,
    coilRotSpeedDeg: 120, // 1.3× applied inside
    pulseAmp: 0.05,
    pulseHz: 2.0,

    // size/radius controls (Phase 4 stays compressed in Z)
    beamXY: 1.4,        // overall radius multiplier (core+coil)
    coreXYBase: 1.1,    // extra width for core
    coilXYBase: 1.0,    // base width for coil
    coreSeedZ: 0.54,    // compressed seed thickness (core)
    coilSeedZ: 0.12,    // compressed seed thickness (coil)
    beamZSeedMul: 1.0,  // multiply both seed Zs together

    // boulder sync
    boulderDriftDur: 0.8,
    boulderDriftDist: 0.3,

    // reuse your Phase 3 placement/size
    ahead: 9.2,
    upBias: -2.2,
    rightBias: 0.0,
    baseScaleX: 1.4,
    baseScaleY: 1.2,
    baseScaleZ: 1.4,
  });
 } else if (phase === "attackAll") {
  // You can tweak any of these; these match what you’ve been using
  applyPhaseAll_AttackSequenceLoop(rigs, atk, t, anchors, sub, {
    // Phase 1–2
    standDur: 1.0,
    preHold: 0.12,
    slamDur: 1.0,
    impactAtSec: 0.15,
    riseDur: 0.35,

    // Transition (impact pose -> neutral)
    relaxDur: 0.35,

    // Phase 4 (charge)
    jawOpenDur: 0.4,
    coreAppearDelay: 0.0,
    coreAppearDur: 0.3,
    coilAppearDelay: 0.1,
    coilAppearDur: 0.3,
    chargeRampDelay: 0.0,
    chargeRampDur: 0.8,
    chargeHold: 0.85,

    // Phase 5 (fire)
    fireDur: 1.4,
    impactPause: 0.06,
    coneDur: 0.25, 
    coilHeight: 3.0,

    boulderPushDelay: 0.1,
    boulderPushDist: 15.0, // How far the beam pushes it
    boulderPushSpin: 180, // How much it spins during the push
    beamCoreRadius: 0.25,
    // Beam sizing/placement
   mouthAhead: 3.9,
    mouthUp: -3.0,
    beamXY: 1.4,
    coreXYBase: 1.1,
    coilXYBase: 1.0,
    coreSeedZ: 0.12,   // Phase 4 compressed seed
    coilSeedZ: 0.10,
    coreFireZ: 1.0,    // Phase 5 length
    coilFireZ: 4.0,

    // Boulder placement/size (Phase 3)
    ahead: 7.2,
    upBias: -2.2,
    rightBias: 0.0,
    startDepth: 0.25,
    spinDeg: 20,
    baseScaleX: 1.4,
    baseScaleY: 1.2,
    baseScaleZ: 1.4,
  });

  // Optional: auto-exit or loop
  // Track a tiny subphase timer to detect the end
  sub._prev = sub._prev || sub.label;
  sub._timer = (sub._timer || 0) + dt;
  if (sub.label !== sub._prev) {
    sub._timer = 0;
    sub._prev = sub.label;
  }
  // When the final "impactPause" holds long enough, switch phase
  if (sub.label === "impactPause" && sub._timer > 0.06) {
    // setPhase("idle");           // go idle
    // or setPhase("beamCharge");  // continue to charge loop
    // or setPhase("attackAll");   // loop the whole sequence
  }
}
 
 else {
      applyPhase0Idle(rigs, t);
    }
  }

  return {
    setPhase,
    setAnchors,
    update,
    get phase() {
      return phase;
    },
    get time() {
      return t;
    },
    get subphase() {
      return sub.label;
    },
  };
}