### 🫧 Phase 0 – Idle / Breathing Pose
**Purpose:**  
Keep Mega Swampert alive and heavy‑looking while at rest. Very small rhythmic movements simulate breathing and balance.

#### 🦴 Torso Sequence
- **Upper Torso (Belly):**  
  - Gentle breathing motion — rotate X ± 2–3°.  
  - Inhale → chest lifts slightly; exhale → chest drops slightly.  
  - Add a minor Y‑translation (± 0.02) synchronized with rotation.  

- **Connector (Hyperboloid):**  
  - Follows belly motion with a small offset.  
  - Rotates X ± 3° and translates Y ± 0.02–0.03 to stay physically connected.  
  - Moves downward as belly drops, upward as belly rises.  

- **Rump (Tail Area):**  
  - Mostly stable anchor point.  
  - Optional micro counter‑rotation (~ 1–2° on X) for subtle spine flex.  

#### 💪 Arm Sequence
- Each upper arm yaws inward by about 2–3° for a slight stance‑correction tension.  
- Optionally alternate the timing per arm (out of phase a bit) for asymmetrical realism.  

#### ⏱️ Timing
- One full breathing loop ≈ 2.5 – 3 seconds.  
- Motion follows a smooth sinusoidal pattern (`sin(t)` or `easeInOutSine`).  

#### 🎨 Visual Result
Swampert’s belly and connector move together in a calm, heavy breathing rhythm while the arms subtly adjust their stance.  
The motion feels alive and transitions seamlessly into **Phase 1 – Stand Up & Power Up**.


### ⚡ Phase 1 – Stand Up & Power Up
**Purpose:**  
Build tension and gather power through the torso and arms in preparation for the slam.

#### 🦴 Torso Sequence (Rump → Connector → Belly)
1. **Rump / Tail Section**
   - Rotates upward around local X‑axis by **+5 – +8°**.  
   - Starts first, initiating the upward wave through the spine.

2. **Connector (Hyperboloid Section)**
   - Begins immediately after rump starts moving.  
   - **Translates Y +0.1 – +0.15** to stay attached.  
   - **Rotates X +3 – +5°** and stretches slightly (**scaleY ≈ 1.05**).  
   - Finishes a bit later than rump for fluid continuity.

3. **Belly / Upper Torso**
   - Starts about one‑quarter into rump’s motion.  
   - **Translates Y +0.25.**  
   - **Rotates X −10°** to lift chest backward.  
   - Ends higher than start, forming an **S‑curve** from tail to head.

> Overall result: a smooth upward wave travels **rump → connector → belly**, coiling energy through the body and creating a powerful ready stance.

---

#### 💪 Arm & Hand Sequence
- **Shoulders:** rotate backward and slightly outward to open chest.  
- **Forearms:** roll on their long axes until **orange pads face outward**.  
- **Forearm + Finger Group:** rotates so forearm becomes roughly **horizontal (~90°)** when raised.  
- **Fingers:** curl inward **25–30°** for a semi‑clenched, charged look.  
- **Head:** remains oriented forward toward the target.

All motions overlap with torso movement; transitions are eased for organic flow.

---

#### ⏱️ Timing & Motion
- Total duration ≈ **1 second**.  
- Wave order: rump starts → connector follows → belly finishes.  
- Use `easeInOutSine` for a natural, muscle‑driven motion curve.  

#### 🎨 Visual Result
Swampert ends Phase 1 with chest high and arms coiled back, radiating tension.  
Every line of motion points toward the coming **Ground Slam (Phase 2)**.

### 💥 Phase 2 – Ground Slam
**Purpose:**  
Release all stored tension from Phase 1 in a heavy downward wave. The torso drives power through the arms, culminating in a ground‑shaking impact that spawns the boulder.

#### 🦴 Torso Sequence (Front → Back Wave)
1. **Rump / Tail Section**  
   - Begins first, reversing the Phase 1 motion.  
   - Rotates **downward on X −5 → −8°**, returning toward neutral.  
   - Acts as the trigger for the downward wave.

2. **Connector (Hyperboloid)**  
   - Follows after a brief delay (**0.05 – 0.1 s**).  
   - **Translates Y −0.1 → −0.15** to follow rump.  
   - **Compresses (scaleY ≈ 0.95)** and **rotates X ≈ −5°** to absorb impact.  
   - Functions as a flexible spine spring carrying motion forward.

3. **Belly / Upper Torso**  
   - Starts ≈ 0.15 s after connector begins.  
   - **Rotates X +18 → +22°** forward and **translates Y −0.05 → −0.1** (slightly below neutral).  
   - Uses `easeInCubic` for fast acceleration into the slam.  

> The compression wave travels **front‑to‑back**, belly striking first, connector absorbing shock, rump following through with slight upward rebound.

---

#### 💪 Arm & Hand Sequence
- **Shoulders:** swing arms downward rapidly (~60° around shoulder pivot).  
- **Forearms / Palms:** maintain rolled orientation with **orange pads side**.  
- **Fingers:** extend just before impact, then curl again immediately afterward.  
- Arms lead the visual impact; torso follows through milliseconds later.

---

#### 🌋 Impact & Environment
- **Whole‑Body Compression:** `scaleY ≈ 0.93` at contact → return to 1.0 over 0.2 s.  
- **Camera Shake (optional):** ± 0.02 Y translation for roughly 0.1 s.  
- **Boulder Spawn:**  
  - Triggered on impact frame.  
  - **scaleY 0 → 1**, **translateY −0.4 → 0**, `easeOutBack` over ~1 s.  
- Optional **dust/energy flash** for aesthetic punch.

---

#### ⏱️ Timing Overview

| Element | Offset | Duration | Ease | Purpose |
|:--|:--|:--|:--|:--|
| Rump | 0.00 s | 0.7 s | easeInCubic | Start of downward chain |
| Connector | +0.05 s | 0.6 s | easeInOutSine | Transmits force |
| Belly | +0.15 s | 0.6 s | easeInCubic | Main body drop |
| Shoulders / Arms | 0.00 s | 0.4 s | easeInCubic | Main strike |
| Fingers | +0.25 s | 0.2 s | linear | Curl / release detail |
| Boulder Spawn | +0.35 s | 1.0 s | easeOutBack | Target appears |

---

#### 🎨 Visual Result
Swampert’s weight slams downward; chest and arms strike hard as the torso compresses.  
The tail flicks slightly on recoil, and a glowing boulder bursts from the ground at the moment of impact — the climax of the buildup from Phase 1.

### 🪨 Phase 3 – Boulder Emergence
**Purpose:**  
Following the ground impact, the boulder rises dramatically from below the surface—appearing like a solidified pulse of Swampert’s energy.

#### 🧱 Boulder Setup
- **Shape:**  
  - Procedural quadric (hyperboloid or paraboloid) with low‑amplitude vertex noise for a rough, rocky surface.  
  - Slight vertical flattening near the base for grounded look.  
  - Non‑uniform scaling (a:b:c ≈ 0.8 : 1.0 : 0.6) for organic asymmetry.  
  - Faint blue emissive tint for energy effect.  
  - Formula approximation:  
    \[
    \frac{x^2}{a^2} + \frac{y^2}{b^2} - \frac{z^2}{c^2} = 1
    \]

#### 🌀 Motion Sequence
1. **Spawn (Impact Frame)**
   - Appears below ground plane: `translateY = −0.4`, `scale = 0.0`.  
   - May hold a dim blue glow indicating formation energy.

2. **Rise**
   - Over **1.0 s**, boulder **translates upward (Y −0.4 → 0)** and **scales 0 → 1**.  
   - Uses `easeOutBack` for a forceful burst followed by settling.  
   - Optional slow spin on Y (~30° total) for extra motion interest.

3. **Hold**
   - After reaching ground level, pause **0.3–0.5 s** before next phase.  
   - Serves as a brief idle moment to focus viewer attention.

#### 🌈 Aesthetic / Lighting
- Gradual brightness increase (0.5 → 1.0 intensity) as it rises.  
- Optional flash or ring burst at base to simulate dust/energy reaction.

#### ⏱️ Timing Overview

| Action | Duration | Ease | Notes |
|:--|:--|:--|:--|
| Spawn beneath ground | instant | — | Triggered by impact frame |
| Rise & scale up | 1.0 s | easeOutBack | Main motion |
| Hold | 0.3–0.5 s | linear | Transition buffer |
| Optional spin | synchronous | easeInOutSine | Adds subtle realism |

#### 🎨 Visual Result
A rough, glowing boulder bursts upward from the point of contact, connecting visually to the power of the ground slam.  
It rests for a moment, suspended and emanating faint energy before entering **Phase 3.5 – Boulder Hover & Rotation**.


### 💧 Phase 4 – Beam Charge
**Purpose:**  
Swampert opens its mouth and channels energy to form the initial water beam.  
The ellipsoid core and helical coil appear, spinning and glowing as power builds before the attack.

#### 🦴 Mouth & Head
- **Jaw Rotation:** open mouth around **15°** (local X‑axis).  
  - Use `easeOutCubic` for smooth, deliberate motion.  
- Optional **head tilt backward (~5°)** to show power draw.  
- Hold the open position for ~0.3 s before the firing phase.

---

#### 🌐 Beam Core (Ellipsoid)
- Spawns at mouth opening.  
  - Initial transform: `scaleZ = 0.1` (compressed).  
  - Bright cyan/blue core color with faint white center glow.  
- Begins slow **rotation around Z‑axis** (~120°/s).  
- Optional pulsing **scaleX/scaleY ±5%** for living energy effect.

---

#### 🔁 Helical Coil
- Generated procedurally using helix formula:  
  \[
  x = r \cos{\theta}, \quad y = r \sin{\theta}, \quad z = p \theta
  \]
- Parent to ellipsoid transform for perfect alignment.  
- Rotates faster than core (~1.3×).  
- Slight oscillation in radius for dynamic visual motion.  

---

#### ⚡ Lighting & Energy Build‑Up
- Brightness/emission ramps **0.4 → 1.0 intensity** over ~1 s.  
- Optional glow halo or bloom around beam tip.  
- Add subtle radial ring at mouth expanding outward (radius ~0.2) to show energy flux.

---

#### 🪨 Boulder Synchronization
- While beam charges, the boulder drifts **forward on Z ≈ +0.3**.  
- Maintains rotation from Phase 3.5 but with reduced amplitude.  
- Suggests Swampert’s energy field pulling the boulder inward.

---

#### ⏱️ Timing Overview

| Action | Duration | Ease | Notes |
|:--|:--|:--|:--|
| Jaw open | 0.4 s | easeOutCubic | Power draw pose |
| Beam core appear | 0.2 s | linear | Core materializes |
| Coil spawn & rotation | 0.3 s | easeInSine | Smooth spiral start |
| Charge glow intensifies | 0.8 s | easeInCubic | Full‑energy ramp |
| Boulder drift | 0.8 s | easeOutSine | Subtle forward pull |

---

#### 🎨 Visual Result
Swampert’s mouth emits a bright cyan glow as the beam core and coil spin alive.  
The boulder floats slightly closer, held by the building energy field.  
The scene peaks with tension, primed for **Phase 5 – Water Drill Fire**.


### 🚀 Phase 5 – Water Drill Fire
**Purpose:**  
Unleash the built‑up energy as a spinning, extending "water drill" beam that shoots forward and slams into the boulder.

#### 💧 Beam Core (Ellipsoid)
- Begins charged from Phase 4.  
- **Pivot / Origin:**  
  - Set at the mouth attachment point so the beam **extends forward only**.  
  - Prevents backward scaling that could clip through Swampert’s head.  
  - If geometry origin cannot be moved, apply per‑frame translation compensation:  
    ```
    translateZ = 0.5 * beamLength * (scaleZ - 1)
    ```
- **Scaling:** `scaleZ` animates **0.1 → ~3.0** over ~1.4 s (`easeOutCubic`).  
- **Rotation:** continuous spin around Z‑axis; speed ramps **120° → 180°/s**.  
- Optional minor overshoot or pull‑back for whip effect at max length.  

---

#### 🔁 Helical Coil
- Parented to beam core; shares the same forward‑pivot behavior.  
- Spins ~1.3× faster than the core.  
- Coil **stretches in Z** with beam extension.  
- Slight tightening of helix pitch during spin‑up to suggest compressed energy.  
- Optional transparency or brightness oscillation for fluid appearance.

---

#### 🎯 Impact Setup
- Beam tip reaches boulder at the end of its extension.  
- Add a **short 2–3 frame anticipation pause** before impact for cinematic weight.  
- Collision triggers:  
  1. **Phase 5.5 – Impact Cone Burst** effect.  
  2. **Boulder Knockback** (translational burst and rotation).

---

#### ⚡ Lighting & Effects
- Brightness ramps **1.0 → 1.2 intensity** through the firing phase.  
- Optional distortion shimmer along beam edges for "water pressure" look.  
- Add faint mist or particle spray near mouth for realism.  
- Coil rim may emit brief white highlights at peak rotation.

---

#### 🪨 Boulder Behavior
- Maintains hover spin and oscillation until impact.  
- Slightly slows rotation just before collision to emphasize hit clarity.

---

#### ⏱️ Timing Overview

| Action | Duration | Ease | Notes |
|:--|:--|:--|:--|
| Beam Z‑scale extension | 1.4 s | easeOutCubic | Extends forward only |
| Coil spin‑up | 1.4 s | linear | Matches beam extension |
| Brightness ramp | parallel | easeInCubic | Peaking near impact |
| Impact frame | ~1.4 s | — | Triggers Phase 5.5 |

---

#### 🎨 Visual Result
Swampert fires a spiraling torrent of energy straight from its mouth.  
The beam drills forward, glowing brighter as it reaches full stretch and connects with the hovering boulder.  
The strike detonates into the **Impact Cone Burst**, marking the climax of the attack.


### 💥 Phase 5.5 – Impact Cone Burst
**Purpose:**  
Visually sell the strike and energy release as the beam collides with the boulder.  
A brief, bright burst cone and shockwave complete the attack’s climax.

#### 🔷 Cone Effect
- **Spawn:**  
  - Triggered exactly when the beam tip contacts the boulder.  
  - Base of cone anchored to beam tip; axis aligned with beam direction.  
  - Initial scale: `scaleX = scaleY = scaleZ = 0.1`.  
  - Bright saturated blue color with soft white inner glow.  
  - Additive blending or glow shader optional for intensity.

- **Expansion & Fade:**  
  - Over **0.25 s**, cone expands outward:  
    - `scaleX,Y : 0.1 → 1.5`  
    - `scaleZ : 0.1 → 1.0`  
  - Fade alpha **1.0 → 0.0** at the same time (energy dispersal).  
  - Use `easeOutCubic` for fast burst with smooth fall‑off.  
  - Remain parented to beam tip during expansion to maintain alignment.

---

#### ⚡ Lighting & Additional Visuals
- Temporary brightness spike: beam and cone intensities +0.2 for one frame.  
- Optional white flash overlay for extra punch.  
- Add a faint radial **shockwave disk** perpendicular to beam axis (scaling quad or ring).

---

#### 🪨 Boulder Reaction
- On impact:  
  - **Translate Z +2 → +3 units** (forward / outward).  
  - **Translate Y +0.3** for lift.  
  - Apply quick random rotations on all axes (±15–25°/frame for ~0.2 s).  
  - Fade brightness to 0 or remove object after launch.

---

#### 🌊 Beam Dissipation Bridge
- As cone fades, begin retraction sequence for Phase 6:  
  - Beam’s `scaleZ` decreases gradually.  
  - Coil brightness drops to 0.  
  - Timing overlap ensures seamless transition from explosion to cooldown.

---

#### ⏱️ Timing Overview

| Event | Duration | Ease | Notes |
|:--|:--|:--|:--|
| Cone expansion / fade | 0.25 s | easeOutCubic | Main impact burst |
| Brightness spike / flash | 0.05 s | linear | Instant highlight |
| Boulder launch / spin | 0.30 s | easeOutBack | Knockback reaction |
| Transition to Phase 6 | Immediately after | — | Starts beam retraction |

---

#### 🎨 Visual Result
At collision, a glowing cone bursts outward, releasing compressed energy.  
Light flares, the boulder is blasted away with a spin, and swirling particles fade as the beam collapses—perfectly setting up **Phase 6 – Beam Dissipation & Cool‑Down**.



### 🌊 Phase 6 – Beam Dissipation & Cool‑Down
**Purpose:**  
Gracefully end the water‑drill attack. The beam retracts, energy fades, and Swampert settles back into its idle breathing loop.

#### 💧 Beam Retraction
- Begins right after the Impact Cone fades.  
- **Scale Z:** shrink **from full length → 0** in ~0.6 s (`easeInCubic`).  
- Core + coil brightness fade **1.0 → 0.0** simultaneously.  
- Keep pivot fixed at the mouth (same as Phase 5) so the beam retracts **forward only**.  
- Optional trailing particles or distortion collapsing inward.

---

#### 🔁 Coil Vanish
- Coil alpha fades quickly (**0.3 s**).  
- Rotation continues but visually disappears.  
- Optional final bright tip flash before vanishing.

---

#### 🦴 Mouth & Head Reset
- After beam vanishes:  
  - **Close jaw** (reverse of Phase 4) in ~0.4 s `easeInOutSine`.  
  - Small **head tilt forward** for exhaustion/recoil.  
  - Light **torso compression** (`scaleY 0.98 → 1.0`) as muscles relax.

---

#### 💪 Torso & Arm Relaxation
- Torso gradually returns to neutral:  
  - **Belly rotate X +20° → 0°** over 0.7 s.  
  - **Connector + rump** follow sequentially (≈ 0.1 s delay each, `easeOutSine`).  
- Arms swing back to resting pose; shoulders reverse prior slam movement.  
- Fingers uncurl naturally—no snapping motion.

---

#### 🫧 Transition Back to Idle
- Once reset (~1.5 s total):  
  - Resume **Phase 0 breathing motion** for connector & belly.  
  - Retain faint glow for one inhale–exhale cycle, then fade to base color.

---

#### ⏱️ Timing Overview
| Action | Duration | Ease | Notes |
|:--|:--|:--|:--|
| Beam retract + fade | 0.6 s | easeInCubic | Core & coil brightness fade |
| Coil vanish | 0.3 s | linear | Unwinds into nothing |
| Mouth/jaw close | 0.4 s | easeInOutSine | Starts after beam retract |
| Torso/arm reset | 0.7 s | easeOutSine | Return to idle pose |
| Resume idle | after reset | — | Reconnect to Phase 0 |

---

#### 🎨 Visual Result
The beam collapses inward; glow fades as Swampert exhales.  
Torso and arms relax back into the heavy calm of Phase 0, completing a seamless loop: **power‑up → attack → cool‑down → idle.**