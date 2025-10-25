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