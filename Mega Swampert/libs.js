// libs.js
// Core math / geometry / TRS / mesh generators used by main.js
// Include this first in your HTML: <script src="libs.js"></script>
var LIBS = {
  // ---- basic helpers ----
  degToRad: function(angle) { return (angle * Math.PI / 180); },

  get_projection: function(angle, a, zMin, zMax) {
    var tan = Math.tan(LIBS.degToRad(0.5 * angle));
    var A = -(zMax + zMin) / (zMax - zMin);
    var B = (-2 * zMax * zMin) / (zMax - zMin);
    return [
      0.5 / tan, 0, 0, 0,
      0, 0.5 * a / tan, 0, 0,
      0, 0, A, -1,
      0, 0, B, 0
    ];
  },

  get_I4: function() { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; },

  set_I4: function(m) {
    m[0]=1; m[1]=0; m[2]=0; m[3]=0;
    m[4]=0; m[5]=1; m[6]=0; m[7]=0;
    m[8]=0; m[9]=0; m[10]=1; m[11]=0;
    m[12]=0; m[13]=0; m[14]=0; m[15]=1;
  },

  rotateX: function(m, angle) {
    var c = Math.cos(angle), s = Math.sin(angle);
    var mv1 = m[1], mv5 = m[5], mv9 = m[9];
    m[1] = m[1] * c - m[2] * s; m[5] = m[5] * c - m[6] * s; m[9] = m[9] * c - m[10] * s;
    m[2] = m[2] * c + mv1 * s; m[6] = m[6] * c + mv5 * s; m[10] = m[10] * c + mv9 * s;
  },

  rotateY: function(m, angle) {
    var c = Math.cos(angle), s = Math.sin(angle);
    var mv0 = m[0], mv4 = m[4], mv8 = m[8];
    m[0] = c * m[0] + s * m[2]; m[4] = c * m[4] + s * m[6]; m[8] = c * m[8] + s * m[10];
    m[2] = c * m[2] - s * mv0; m[6] = c * m[6] - s * mv4; m[10] = c * m[10] - s * mv8;
  },

  rotateZ: function(m, angle) {
    var c = Math.cos(angle), s = Math.sin(angle);
    var mv0 = m[0], mv4 = m[4], mv8 = m[8];
    m[0] = c * m[0] - s * m[1]; m[4] = c * m[4] - s * m[5]; m[8] = c * m[8] - s * m[9];
    m[1] = c * m[1] + s * mv0; m[5] = c * m[5] + s * mv4; m[9] = c * m[9] + s * mv8;
  },

  translateZ: function(m, t) { m[14] += t; },
  translateX: function(m, t) { m[12] += t; },
  translateY: function(m, t) { m[13] += t; },

  set_position: function(m, x, y, z) { m[12]=x; m[13]=y; m[14]=z; },

  translateLocal: function(m, x, y, z) {
    // translate in local basis (using column-major layout)
    m[12] += x * m[0] + y * m[4] + z * m[8];
    m[13] += x * m[1] + y * m[5] + z * m[9];
    m[14] += x * m[2] + y * m[6] + z * m[10];
  },

  // column-major (OpenGL-style) mat4 multiply: out = a * b
  mul: function(out, a, b) {
    const a0=a[0], a1=a[1], a2=a[2], a3=a[3];
    const a4=a[4], a5=a[5], a6=a[6], a7=a[7];
    const a8=a[8], a9=a[9], a10=a[10], a11=a[11];
    const a12=a[12], a13=a[13], a14=a[14], a15=a[15];

    const b0=b[0], b1=b[1], b2=b[2], b3=b[3];
    const b4=b[4], b5=b[5], b6=b[6], b7=b[7];
    const b8=b[8], b9=b[9], b10=b[10], b11=b[11];
    const b12=b[12], b13=b[13], b14=b[14], b15=b[15];

    out[0] = a0*b0 + a4*b1 + a8*b2 + a12*b3;
    out[1] = a1*b0 + a5*b1 + a9*b2 + a13*b3;
    out[2] = a2*b0 + a6*b1 + a10*b2 + a14*b3;
    out[3] = a3*b0 + a7*b1 + a11*b2 + a15*b3;

    out[4] = a0*b4 + a4*b5 + a8*b6 + a12*b7;
    out[5] = a1*b4 + a5*b5 + a9*b6 + a13*b7;
    out[6] = a2*b4 + a6*b5 + a10*b6 + a14*b7;
    out[7] = a3*b4 + a7*b5 + a11*b6 + a15*b7;

    out[8] = a0*b8 + a4*b9 + a8*b10 + a12*b11;
    out[9] = a1*b8 + a5*b9 + a9*b10 + a13*b11;
    out[10] = a2*b8 + a6*b9 + a10*b10 + a14*b11;
    out[11] = a3*b8 + a7*b9 + a11*b10 + a15*b11;

    out[12] = a0*b12 + a4*b13 + a8*b14 + a12*b15;
    out[13] = a1*b12 + a5*b13 + a9*b14 + a13*b15;
    out[14] = a2*b12 + a6*b13 + a10*b14 + a14*b15;
    out[15] = a3*b12 + a7*b13 + a11*b14 + a15*b15;
  },

  scale: function(m, sx, sy, sz) {
    m[0] *= sx; m[1] *= sx; m[2] *= sx; m[3] *= sx;
    m[4] *= sy; m[5] *= sy; m[6] *= sy; m[7] *= sy;
    m[8] *= sz; m[9] *= sz; m[10] *= sz; m[11] *= sz;
  },

  composeTRS: function(t) {
    const m = LIBS.get_I4();
    LIBS.translateLocal(m, t.position[0], t.position[1], t.position[2]);
    LIBS.rotateX(m, t.rotation[0]); LIBS.rotateY(m, t.rotation[1]); LIBS.rotateZ(m, t.rotation[2]);
    LIBS.scale(m, t.scale[0], t.scale[1], t.scale[2]);
    return m;
  },

  // ---- vector helpers ----
  normalize: function(v) { const m = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0]/m, v[1]/m, v[2]/m]; },
  add: function(a,b) { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; },
  sub: function(a,b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; },
  scaleVec: function(v,s) { return [v[0]*s, v[1]*s, v[2]*s]; },
  dot: function(a,b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; },
  cross: function(a,b) { return [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]]; },

  // convenience TRS builder
  makeTransform: function(px=0,py=0,pz=0) { return { position:[px,py,pz], rotation:[0,0,0], scale:[1,1,1] }; },

  // ---- geometry generators (CPU-side) -------------------------------------------------
  generateEllipsoid: function(a=1,b=1,c=1, stacks=36, sectors=72) {
    const vertices = [], faces = [];
    const clamp01 = (t) => Math.max(0, Math.min(1, t));
    const da = a || 1e-6, db = b || 1e-6, dc = c || 1e-6;
    for (let i=0;i<=stacks;i++){
      const u = -Math.PI/2 + (i/stacks)*Math.PI; const cu = Math.cos(u), su = Math.sin(u);
      for (let j=0;j<=sectors;j++){
        const v = -Math.PI + (j/sectors)*(2*Math.PI); const cv = Math.cos(v), sv = Math.sin(v);
        const x = a * cv * cu; const y = b * su; const z = c * sv * cu;
        const r = clamp01(x/(2*da) + 0.5); const g = clamp01(y/(2*db) + 0.5); const bl = clamp01(z/(2*dc) + 0.5);
        vertices.push(x, y, z, r, g, bl);
      }
    }
    for (let i=0;i<stacks;i++){
      for (let j=0;j<sectors;j++){
        const first = i*(sectors+1) + j; const second = first + 1; const third = first + (sectors+1); const fourth = third + 1;
        faces.push(first, second, fourth, first, fourth, third);
      }
    }
    return { vertices, faces };
  },

  generateHyperboloidOneSheet: function(a=1,b=1,c=1, stacks=36, sectors=72, epsilon=0.2){
    const vertices=[], faces=[];
    const vMin = -Math.PI/2 + epsilon; const vMax = Math.PI/2 - epsilon; const uMin = -Math.PI; const uMax = Math.PI;
    const secMax = 1/Math.cos(vMax); const tanMax = Math.tan(vMax);
    const clamp01 = (t) => Math.max(0, Math.min(1, t));
    for(let i=0;i<=stacks;i++){
      const v = vMin + (i/stacks)*(vMax - vMin); const secv = 1/Math.cos(v); const tanv = Math.tan(v);
      for(let j=0;j<=sectors;j++){
        const u = uMin + (j/sectors)*(uMax - uMin);
        const x = a * secv * Math.cos(u); const y = b * secv * Math.sin(u); const z = c * tanv;
        const r = clamp01(x/(2*a*secMax) + 0.5); const g = clamp01(y/(2*b*secMax) + 0.5); const bl = clamp01(z/(2*c*tanMax) + 0.5);
        vertices.push(x,y,z,r,g,bl);
      }
    }
    for(let i=0;i<stacks;i++){ for(let j=0;j<sectors;j++){ const first = i*(sectors+1)+j; const second = first+1; const third = first+(sectors+1); const fourth = third+1; faces.push(first,second,fourth, first,fourth,third); }}
    return { vertices, faces };
  },

  overrideColor: function(interleaved, r,g,b){ for(let i=0;i<interleaved.length;i+=6){ interleaved[i+3]=r; interleaved[i+4]=g; interleaved[i+5]=b; } },

  // y-based squash/stretch along local Y
  squashStretchY: function(interleaved, b, opts={}){
    const kTop = opts.kTop ?? 0.0; const kBottom = opts.kBottom ?? 0; const power = opts.power ?? 1.0; const preserveVolume = opts.preserveVolume ?? false;
    for(let i=0;i<interleaved.length;i+=6){ const x=interleaved[i], y=interleaved[i+1], z=interleaved[i+2]; const t = Math.max(-1, Math.min(1, y/b)); const wTop = t>0 ? Math.pow(t,power) : 0; const wBot = t<0 ? Math.pow(-t,power) : 0; const sy = 1 + kTop*wTop - kBottom*wBot; let sx=1, sz=1; if(preserveVolume){ const v = 1/Math.sqrt(Math.max(0.0001, sy)); sx = v; sz = v; } interleaved[i] = x*sx; interleaved[i+1] = y*sy; interleaved[i+2] = z*sz; }
  },

  taperXZ: function(interleaved, b, opts={}){
    const top = opts.top ?? 0.0; const bottom = opts.bottom ?? 0.0; const power = opts.power ?? 1.0;
    for(let i=0;i<interleaved.length;i+=6){ const y=interleaved[i+1]; const t = Math.max(-1, Math.min(1, y/b)); const wTop = t>0 ? Math.pow(t,power) : 0; const wBot = t<0 ? Math.pow(-t,power) : 0; const s = 1 + top*wTop + bottom*wBot; interleaved[i] *= s; interleaved[i+2] *= s; }
  },

  stretchYByZ: function(interleaved, c, opts={}){
    const back = opts.back ?? 0.0; const front = opts.front ?? 0.0; const power = opts.power ?? 1.0; const preserveVolume = opts.preserveVolume ?? false;
    for(let i=0;i<interleaved.length;i+=6){ const x=interleaved[i+0], y=interleaved[i+1], z=interleaved[i+2]; const zn = Math.max(-1, Math.min(1, z/c)); const wBack = zn>0 ? Math.pow(zn,power) : 0; const wFront = zn<0 ? Math.pow(-zn,power) : 0; const sy = 1 + back*wBack + front*wFront; let sx=1, sz=1; if(preserveVolume){ const v = 1/Math.sqrt(Math.max(0.0001, sy)); sx=v; sz=v; } interleaved[i+0] = x*sx; interleaved[i+1] = y*sy; interleaved[i+2] = z*sz; }
  },

  stretchBackTopY: function(interleaved, b, c, opts={}){
    const k = opts.k ?? 0.2; const powerZ = opts.powerZ ?? 1.4; const powerY = opts.powerY ?? 1.2; const preserveVolume = opts.preserveVolume ?? false;
    for(let i=0;i<interleaved.length;i+=6){ const x=interleaved[i+0], y=interleaved[i+1], z=interleaved[i+2]; const zn = Math.max(-1, Math.min(1, z/c)); const yn = Math.max(-1, Math.min(1, y/b)); const wZ = zn>0 ? Math.pow(zn,powerZ) : 0; const wY = yn>0 ? Math.pow(yn,powerY) : 0; const sy = 1 + k*(wZ*wY); let sx=1, sz=1; if(preserveVolume){ const v = 1/Math.sqrt(Math.max(0.0001, sy)); sx=v; sz=v; } interleaved[i+0] = x*sx; interleaved[i+1] = y*sy; interleaved[i+2] = z*sz; }
  },

  // apply TRS to a point (S->Rx->Ry->Rz->T)
  transformPointTRS: function(p, T){
    let x = p[0] * T.scale[0]; let y = p[1] * T.scale[1]; let z = p[2] * T.scale[2];
    const cx = Math.cos(T.rotation[0]), sx = Math.sin(T.rotation[0]);
    let y1 = y*cx - z*sx, z1 = y*sx + z*cx; y = y1; z = z1;
    const cy = Math.cos(T.rotation[1]), sy = Math.sin(T.rotation[1]);
    let x2 = x*cy + z*sy, z2 = -x*sy + z*cy; x = x2; z = z2;
    const cz = Math.cos(T.rotation[2]), sz = Math.sin(T.rotation[2]);
    let x3 = x*cz - y*sz, y3 = x*sz + y*cz; x = x3; y = y3;
    x += T.position[0]; y += T.position[1]; z += T.position[2];
    return [x,y,z];
  },

  sliceRadiiAtZ: function(a,b,c,z0){ const t = 1 - (z0*z0)/(c*c); const s = t>0 ? Math.sqrt(t) : 0; return [a*s, b*s]; },

  generateBlendBand: function(torsoDims, torsoT, headDims, headT, opts={}){
    const seg = opts.segments ?? 64; const zTorso = opts.zTorso ?? -0.9; const zHead = opts.zHead ?? +0.5; const color = opts.color ?? [0.15,0.35,0.85];
    const verts = [], faces = [];
    const [rtx, rty] = LIBS.sliceRadiiAtZ(torsoDims.a, torsoDims.b, torsoDims.c, zTorso);
    const [rhx, rhy] = LIBS.sliceRadiiAtZ(headDims.a, headDims.b, headDims.c, zHead);
    const ringTorso = [], ringHead = [];
    for(let i=0;i<=seg;i++){ const u = (i/seg)*2*Math.PI; const cu=Math.cos(u), su=Math.sin(u); const ptT=[rtx*cu, rty*su, zTorso]; const ptH=[rhx*cu, rhy*su, zHead]; const pTw = LIBS.transformPointTRS(ptT, torsoT); const pHw = LIBS.transformPointTRS(ptH, headT); ringTorso.push(pTw); ringHead.push(pHw); }
    for(let i=0;i<=seg;i++){ const p = ringTorso[i]; verts.push(p[0],p[1],p[2], color[0],color[1],color[2]); }
    const offsetHead = verts.length/6; for(let i=0;i<=seg;i++){ const p = ringHead[i]; verts.push(p[0],p[1],p[2], color[0],color[1],color[2]); }
    for(let i=0;i<seg;i++){ const a=i, b=i+1, c=offsetHead+i, d=offsetHead+i+1; faces.push(a,b,d, a,d,c); }
    return { vertices: verts, faces };
  },

  planeBasis: function(n){ const nN = LIBS.normalize(n); const tmp = Math.abs(nN[1]) < 0.99 ? [0,1,0] : [1,0,0]; const u = LIBS.normalize(LIBS.cross(nN, tmp)); const v = LIBS.normalize(LIBS.cross(nN, u)); return { n: nN, u, v }; },

  intersectRayEllipsoidLocal: function(p0, v, a, b, c){
    const A = (v[0]*v[0])/(a*a) + (v[1]*v[1])/(b*b) + (v[2]*v[2])/(c*c);
    const B = 2*(p0[0]*v[0]/(a*a) + p0[1]*v[1]/(b*b) + p0[2]*v[2]/(c*c));
    const C = (p0[0]*p0[0])/(a*a) + (p0[1]*p0[1])/(b*b) + (p0[2]*p0[2])/(c*c) - 1.0;
    const disc = B*B - 4*A*C; if (disc < 0) return null; const sd = Math.sqrt(Math.max(0, disc)); const t1 = (-B - sd)/(2*A); const t2 = (-B + sd)/(2*A);
    const cand = []; if (Number.isFinite(t1)) cand.push(t1); if (Number.isFinite(t2)) cand.push(t2); if (cand.length === 0) return null;
    const pos = cand.filter(t=>t>0).sort((a,b)=>a-b); if (pos.length>0) return pos[0]; cand.sort((a,b)=>Math.abs(a)-Math.abs(b)); return cand[0];
  },

  worldToLocalPoint: function(pw, T){
    let x = pw[0] - T.position[0], y = pw[1] - T.position[1], z = pw[2] - T.position[2];
    const cz = Math.cos(-T.rotation[2]), sz = Math.sin(-T.rotation[2]); let x1 = x*cz - y*sz, y1 = x*sz + y*cz; x=x1; y=y1;
    const cy = Math.cos(-T.rotation[1]), sy = Math.sin(-T.rotation[1]); let x2 = x*cy + z*sy, z2 = -x*sy + z*cy; x=x2; z=z2;
    const cx = Math.cos(-T.rotation[0]), sx = Math.sin(-T.rotation[0]); let y3 = y*cx - z*sx, z3 = y*sx + z*cx; y=y3; z=z3;
    return [ x / T.scale[0], y / T.scale[1], z / T.scale[2] ];
  },

  worldToLocalDir: function(dw, T){
    let x = dw[0], y = dw[1], z = dw[2];
    const cz = Math.cos(-T.rotation[2]), sz = Math.sin(-T.rotation[2]); let x1 = x*cz - y*sz, y1 = x*sz + y*cz; x=x1; y=y1;
    const cy = Math.cos(-T.rotation[1]), sy = Math.sin(-T.rotation[1]); let x2 = x*cy + z*sy, z2 = -x*sy + z*cy; x=x2; z=z2;
    const cx = Math.cos(-T.rotation[0]), sx = Math.sin(-T.rotation[0]); let y3 = y*cx - z*sx, z3 = y*sx + z*cx; y=y3; z=z3;
    return [ x / T.scale[0], y / T.scale[1], z / T.scale[2] ];
  },

  transformDirTRS: function(d, T){
    let x = d[0] * T.scale[0], y = d[1] * T.scale[1], z = d[2] * T.scale[2];
    const cx = Math.cos(T.rotation[0]), sx = Math.sin(T.rotation[0]); let y1 = y*cx - z*sx, z1 = y*sx + z*cx; y=y1; z=z1;
    const cy = Math.cos(T.rotation[1]), sy = Math.sin(T.rotation[1]); let x2 = x*cy + z*sy, z2 = -x*sy + z*cy; x=x2; z=z2;
    const cz = Math.cos(T.rotation[2]), sz = Math.sin(T.rotation[2]); let x3 = x*cz - y*sz, y3 = x*sz + y*cz; x=x3; y=y3; return [x,y,z];
  },

  seamPlane: function(torsoDims, torsoT, headDims, headT){
    const CT = torsoT.position, CH = headT.position; const n = LIBS.normalize(LIBS.sub(CH, CT));
    // torso side
    const p0T_local = [0,0,0]; const vT_local = LIBS.worldToLocalDir(n, torsoT);
    const tT = LIBS.intersectRayEllipsoidLocal(p0T_local, vT_local, torsoDims.a, torsoDims.b, torsoDims.c);
    const pT_world = LIBS.add(torsoT.position, (function(){ let x = vT_local[0]*tT*torsoT.scale[0], y = vT_local[1]*tT*torsoT.scale[1], z = vT_local[2]*tT*torsoT.scale[2]; const cx=Math.cos(torsoT.rotation[0]), sx=Math.sin(torsoT.rotation[0]); let y1 = y*cx - z*sx, z1 = y*sx + z*cx; y=y1; z=z1; const cy=Math.cos(torsoT.rotation[1]), sy=Math.sin(torsoT.rotation[1]); let x2 = x*cy + z*sy, z2 = -x*sy + z*cy; x=x2; z=z2; const cz=Math.cos(torsoT.rotation[2]), sz=Math.sin(torsoT.rotation[2]); let x3 = x*cz - y*sz, y3 = x*sz + y*cz; x=x3; y=y3; return [x,y,z]; })());
    // head side
    const vH_world = LIBS.scaleVec(n, -1); const p0H_local = [0,0,0]; const vH_local = LIBS.worldToLocalDir(vH_world, headT);
    const tH = LIBS.intersectRayEllipsoidLocal(p0H_local, vH_local, headDims.a, headDims.b, headDims.c);
    const pH_world = LIBS.add(headT.position, (function(){ let x = vH_local[0]*tH*headT.scale[0], y = vH_local[1]*tH*headT.scale[1], z = vH_local[2]*tH*headT.scale[2]; const cx=Math.cos(headT.rotation[0]), sx=Math.sin(headT.rotation[0]); let y1 = y*cx - z*sx, z1 = y*sx + z*cx; y=y1; z=z1; const cy=Math.cos(headT.rotation[1]), sy=Math.sin(headT.rotation[1]); let x2 = x*cy + z*sy, z2 = -x*sy + z*cy; x=x2; z=z2; const cz=Math.cos(headT.rotation[2]), sz=Math.sin(headT.rotation[2]); let x3 = x*cz - y*sz, y3 = x*sz + y*cz; x=x3; y=y3; return [x,y,z]; })());
    const O = LIBS.scaleVec(LIBS.add(pT_world, pH_world), 0.5); return { O, n };
  },

  intersectFromPlanePoint: function(O, s, dims, T){
    const p0 = LIBS.worldToLocalPoint(O, T); const v = LIBS.worldToLocalDir(s, T);
    const t = LIBS.intersectRayEllipsoidLocal(p0, v, dims.a, dims.b, dims.c); if (t==null) return null;
    const pl = [ p0[0] + v[0]*t, p0[1] + v[1]*t, p0[2] + v[2]*t ]; return LIBS.transformPointTRS(pl, T);
  },

  generateBlendBandUniversal: function(torsoDims, torsoT, headDims, headT, opts={}){
    const seg = opts.segments ?? 96; const inflate = opts.inflate ?? 0.01; const color = opts.color ?? [0.15,0.35,0.85];
    const sp = LIBS.seamPlane(torsoDims, torsoT, headDims, headT); const O = sp.O, n = sp.n; const basis = LIBS.planeBasis(n);
    const u = basis.u, v = basis.v; const verts = [], faces = [], ringT = [], ringH = [];
    for(let i=0;i<=seg;i++){ const phi=(i/seg)*2*Math.PI; const s = LIBS.normalize(LIBS.add(LIBS.scaleVec(u, Math.cos(phi)), LIBS.scaleVec(v, Math.sin(phi)))); const pT = LIBS.intersectFromPlanePoint(O, s, torsoDims, torsoT); const pH = LIBS.intersectFromPlanePoint(O, s, headDims, headT); if(!pT || !pH){ const lastT = ringT.length ? ringT[ringT.length-1] : O; const lastH = ringH.length ? ringH[ringH.length-1] : O; ringT.push(lastT); ringH.push(lastH); continue; } ringT.push(LIBS.add(pT, LIBS.scaleVec(s, inflate))); ringH.push(LIBS.add(pH, LIBS.scaleVec(s, inflate))); }
    for(let i=0;i<=seg;i++){ const p = ringT[i]; verts.push(p[0],p[1],p[2], color[0],color[1],color[2]); }
    const offH = verts.length/6; for(let i=0;i<=seg;i++){ const p = ringH[i]; verts.push(p[0],p[1],p[2], color[0],color[1],color[2]); }
    for(let i=0;i<seg;i++){ const a=i, b=i+1, c=offH+i, d=offH+i+1; faces.push(a,b,d, a,d,c); }
    return { vertices: verts, faces };
  },

  generateCone: function(rTop, rBottom, h, seg=48){
    const verts=[], faces=[]; for(let i=0;i<=seg;i++){ const u=(i/seg)*2*Math.PI; const cu=Math.cos(u), su=Math.sin(u); verts.push(rBottom*cu, rBottom*su, 0, 1,0.5,0); verts.push(rTop*cu, rTop*su, h, 1,0.5,0); }
    for(let i=0;i<seg;i++){ const a=2*i, b=a+2, c=a+1, d=b+1; faces.push(a,b,d, a,d,c); }
    for(let i=1;i<seg-1;i++) faces.push(0, 2*i, 2*(i+1)); if(rTop>0){ const base=1; for(let i=1;i<seg-1;i++) faces.push(base, 2*(i+1)+1, 2*i+1); }
    return { vertices: verts, faces };
  },

  generateEllipsoidHalfX: function(a=0.6,b=0.45,c=0.4, stacks=24, sectorsHalf=48, side=+1){
    const vertices=[], faces=[]; const vStart = side>0 ? -Math.PI/2 : Math.PI/2; const vEnd = side>0 ? Math.PI/2 : (3*Math.PI)/2;
    for(let i=0;i<=stacks;i++){ const u=-Math.PI/2 + (i/stacks)*Math.PI; const cu=Math.cos(u), su=Math.sin(u);
      for(let j=0;j<=sectorsHalf;j++){ const v=vStart + (j/sectorsHalf)*(vEnd-vStart); const cv=Math.cos(v), sv=Math.sin(v); const x=a*cv*cu, y=b*su, z=c*sv*cu; vertices.push(x,y,z,1,0.5,0.15); }
    }
    const cols = sectorsHalf+1; for(let i=0;i<stacks;i++){ for(let j=0;j<sectorsHalf;j++){ const a0=i*cols + j; const a1=a0+1; const b0=a0+cols; const b1=b0+1; faces.push(a0,a1,b1, a0,b1,b0); }}
    return { vertices, faces };
  },

  generateCylinderX: function(ry=0.45, rz=0.35, len=1.4, seg=64, caps=true){
    const vertices=[], faces=[]; const x0 = -len/2, x1 = +len/2;
    for(let i=0;i<=seg;i++){ const t=(i/seg)*2*Math.PI; const y=ry*Math.cos(t), z=rz*Math.sin(t); vertices.push(x0,y,z,1,0.5,0.15); vertices.push(x1,y,z,1,0.5,0.15); }
    for(let i=0;i<seg;i++){ const a=2*i, b=a+2, c=a+1, d=b+1; faces.push(a,b,d, a,d,c); }
    if(caps){ const idxCenterL = vertices.length/6; vertices.push(x0,0,0,1,0.5,0.15); const idxCenterR = idxCenterL+1; vertices.push(x1,0,0,1,0.5,0.15);
      for(let i=0;i<seg;i++){ const a=2*i, b=2*((i+1)%seg); faces.push(idxCenterL, b, a); }
      for(let i=0;i<seg;i++){ const a=2*i+1, b=2*((i+1)%seg)+1; faces.push(idxCenterR, a, b); }
    }
    return { vertices, faces };
  },

  tint: function(interleaved, r,g,b){ for(let i=0;i<interleaved.length;i+=6){ interleaved[i+3]=r; interleaved[i+4]=g; interleaved[i+5]=b; } },

  rayEllipsoidRoots: function(p0,v,a,b,c){ const A=(v[0]*v[0])/(a*a)+(v[1]*v[1])/(b*b)+(v[2]*v[2])/(c*c); const B=2*((p0[0]*v[0])/(a*a)+(p0[1]*v[1])/(b*b)+(p0[2]*v[2])/(c*c)); const C=(p0[0]*p0[0])/(a*a)+(p0[1]*p0[1])/(b*b)+(p0[2]*p0[2])/(c*c)-1; const D=B*B-4*A*C; if(D<0) return null; const s=Math.sqrt(Math.max(0,D)); const t1=(-B-s)/(2*A); const t2=(-B+s)/(2*A); return [t1,t2]; },

  seamPlaneRobust: function(tDims, torsoT, hDims, headT){
    const CT = torsoT.position, CH = headT.position; const n = LIBS.normalize(LIBS.sub(CH,CT));
    const vT_local = LIBS.worldToLocalDir(n, torsoT); const rootsT = LIBS.rayEllipsoidRoots([0,0,0], vT_local, tDims.a, tDims.b, tDims.c); const tTor = rootsT ? Math.min(Math.abs(rootsT[0]), Math.abs(rootsT[1])) : 0;
    const pT = LIBS.transformPointTRS([vT_local[0]*tTor, vT_local[1]*tTor, vT_local[2]*tTor], torsoT);
    const vH_local = LIBS.worldToLocalDir(LIBS.scaleVec(n,-1), headT); const rootsH = LIBS.rayEllipsoidRoots([0,0,0], vH_local, hDims.a, hDims.b, hDims.c); const tHdr = rootsH ? Math.min(Math.abs(rootsH[0]), Math.abs(rootsH[1])) : 0;
    const pH = LIBS.transformPointTRS([vH_local[0]*tHdr, vH_local[1]*tHdr, vH_local[2]*tHdr], headT);
    const O = LIBS.scaleVec(LIBS.add(pT,pH), 0.5); return { O, n };
  },

  ringOnPlaneEllipsoid: function(dims, T, O, n, segments){
    let nL = LIBS.worldToLocalDir(n, T); nL = LIBS.normalize(nL); const OL = LIBS.worldToLocalPoint(O, T);
    const dL = nL[0]*OL[0] + nL[1]*OL[1] + nL[2]*OL[2];
    const Ainvn = [ dims.a*dims.a*nL[0], dims.b*dims.b*nL[1], dims.c*dims.c*nL[2] ];
    const denom = nL[0]*Ainvn[0] + nL[1]*Ainvn[1] + nL[2]*Ainvn[2] || 1;
    const x0L = LIBS.scaleVec(Ainvn, dL/denom);
    const tmp = Math.abs(nL[1]) < 0.99 ? [0,1,0] : [1,0,0]; const uL = LIBS.normalize(LIBS.cross(nL,tmp)); const vL = LIBS.normalize(LIBS.cross(nL,uL));
    const pts = [];
    for(let i=0;i<=segments;i++){
      const phi = (i/segments)*2*Math.PI; let sL = LIBS.normalize(LIBS.add(LIBS.scaleVec(uL, Math.cos(phi)), LIBS.scaleVec(vL, Math.sin(phi))));
      const roots = LIBS.rayEllipsoidRoots(x0L, sL, dims.a, dims.b, dims.c);
      if(!roots){ pts.push(LIBS.transformPointTRS(x0L, T)); continue; }
      const t = Math.abs(roots[0]) > Math.abs(roots[1]) ? roots[0] : roots[1]; const pL = [ x0L[0] + sL[0]*t, x0L[1] + sL[1]*t, x0L[2] + sL[2]*t ]; pts.push(LIBS.transformPointTRS(pL, T));
    }
    return pts;
  },

  generateBlendBandRobust: function(tDims, tT, hDims, hT, opts={}){
    const seg = opts.segments ?? 96; const inflate = opts.inflate ?? 0.01; const color = opts.color ?? [0.15,0.35,0.85];
    const sp = LIBS.seamPlaneRobust(tDims, tT, hDims, hT); const O = sp.O, n = sp.n; const basis = LIBS.planeBasis(n);
    const ringT = LIBS.ringOnPlaneEllipsoid(tDims, tT, O, n, seg); const ringH = LIBS.ringOnPlaneEllipsoid(hDims, hT, O, n, seg);
    const verts = [], faces = [];
    for(let i=0;i<=seg;i++){ const phi=(i/seg)*2*Math.PI; const sW = LIBS.normalize(LIBS.add(LIBS.scaleVec(basis.u, Math.cos(phi)), LIBS.scaleVec(basis.v, Math.sin(phi)))); const p = LIBS.add(ringT[i], LIBS.scaleVec(sW, inflate)); verts.push(p[0],p[1],p[2], color[0],color[1],color[2]); }
    const offH = verts.length/6; for(let i=0;i<=seg;i++){ const phi=(i/seg)*2*Math.PI; const sW = LIBS.normalize(LIBS.add(LIBS.scaleVec(basis.u, Math.cos(phi)), LIBS.scaleVec(basis.v, Math.sin(phi)))); const p = LIBS.add(ringH[i], LIBS.scaleVec(sW, inflate)); verts.push(p[0],p[1],p[2], color[0],color[1],color[2]); }
    for(let i=0;i<seg;i++){ const a=i, b=i+1, c=offH+i, d=offH+i+1; faces.push(a,b,d, a,d,c); }
    return { vertices: verts, faces };
  }

};
