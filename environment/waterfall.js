export class Waterfall {
  GL = null;
  SHADER_PROGRAM = null;

  _position = null;
  _color = null;
  _normal = null;
  _MMatrix = null;

  rockVertex = []; rockFaces = [];
  waterVertex = []; waterFaces = [];
  splashVertex = []; splashFaces = [];
  
  ROCK_VERTEX_BUFFER = null; ROCK_FACES_BUFFER = null;
  WATER_VERTEX_BUFFER = null; WATER_FACES_BUFFER = null;
  SPLASH_VERTEX_BUFFER = null; SPLASH_FACES_BUFFER = null;

  POSITION_MATRIX = LIBSMudkip.get_I4();
  MOVE_MATRIX = LIBSMudkip.get_I4();
  MODEL_MATRIX = LIBSMudkip.get_I4();

  waterOffset = 0;
  splashTime = 0;
  _seed = 54321;

  constructor(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, opts = {}) {
    this.GL = GL;
    this.SHADER_PROGRAM = SHADER_PROGRAM;
    this._position = _position;
    this._color = _color;
    this._normal = _normal;
    this._MMatrix = _Mmatrix;

    // --- CONFIGURATION ---
    this.centerZ = opts.centerZ ?? -55;
    this.width = opts.width ?? 140;
    this.height = opts.height ?? 45;
    this.curveDepth = opts.curveDepth ?? 35;
    this.waterLevel = opts.waterLevel ?? -2.2;
    
    // Colors
    // FIX: Changed from Grey-Black to distinct Dark Brown
    this.rockColor = opts.rockColor ?? [0.45, 0.30, 0.20]; 

    this.waterColor = opts.waterColor ?? [0.25, 0.75, 0.90]; 
    this.splashColor = [1.0, 1.0, 1.0]; 

    this._generateEnvironment();
  }

  _seededRandom() {
    this._seed = (this._seed * 9301 + 49297) % 233280;
    return this._seed / 233280;
  }
  _random(min, max) { return min + this._seededRandom() * (max - min); }

  _generateEnvironment() {
    const steps = 14; 
    
    // 1. Build Rock Cliff
    for(let i = 0; i < steps; i++) {
      const t = (i / (steps - 1)) * 2 - 1; 
      const x = t * (this.width / 2);
      const z = this.centerZ + (t * t) * this.curveDepth; 
      this._buildCliffColumn(x, z, this.height);
    }

    // 2. Build Water Curtain
    this._buildContinuousCurtain();

    // 3. Build Splash
    this._buildContinuousSplash();
  }

  _buildContinuousCurtain() {
    const segmentsX = 50; 
    const segmentsY = 20; 
    const vertexOffset = this.waterVertex.length / 9;

    const topY = this.waterLevel + this.height * 0.75; 
    const bottomY = this.waterLevel - 4.0;
    const totalDrop = topY - bottomY;

    for (let i = 0; i <= segmentsX; i++) {
      const u = i / segmentsX;
      const t = u * 2 - 1; 
      
      const baseX = t * (this.width / 2);
      const curveZ = this.centerZ + (t * t) * this.curveDepth;

      let nx = -2 * t * (this.curveDepth / (this.width/2));
      let nz = 1.0;
      let ny = 0.5; 
      const len = Math.hypot(nx, ny, nz);
      nx/=len; ny/=len; nz/=len;

      const ridgeOffset = Math.sin(u * Math.PI * 12.0) * 1.2 + Math.sin(u * Math.PI * 24.0) * 0.5;

      for (let j = 0; j <= segmentsY; j++) {
        const v = j / segmentsY; 
        const y = bottomY + totalDrop * v; 
        
        const fallProgress = 1.0 - v; 
        const currentOffsetZ = 0.0 + (14.0 * fallProgress * fallProgress);

        const noiseX = Math.sin(v * 12.0 + u * 5.0) * 0.6;
        const noiseZ = Math.cos(v * 10.0 + u * 12.0) * 0.4;

        const cMix = v * 0.3; 
        const r = Math.min(1.0, this.waterColor[0] + cMix);
        const g = Math.min(1.0, this.waterColor[1] + cMix);
        const b = Math.min(1.0, this.waterColor[2] + cMix);

        this.waterVertex.push(
          baseX + noiseX, 
          y, 
          curveZ + currentOffsetZ + noiseZ + ridgeOffset, 
          nx, ny, nz,
          r, g, b
        );
      }
    }

    for (let i = 0; i < segmentsX; i++) {
      for (let j = 0; j < segmentsY; j++) {
        const col = segmentsY + 1;
        const a = vertexOffset + i * col + j;
        const b = a + 1;
        const c = a + col;
        const d = c + 1;
        this.waterFaces.push(a, b, c); this.waterFaces.push(b, d, c);
        this.waterFaces.push(a, c, b); this.waterFaces.push(b, c, d);
      }
    }
  }

  _buildContinuousSplash() {
    const segments = 35; 
    const waterOffsetZ = 12.0; 

    for(let i=0; i<segments; i++) {
       const t = (i / (segments - 1)) * 2 - 1; 
       if (Math.abs(t) > 0.9) continue; 

       const x = t * (this.width / 2);
       const curveZ = this.centerZ + (t * t) * this.curveDepth;
       const z = curveZ + waterOffsetZ;
       
       const jx = x + this._random(-2.0, 2.0);
       const jz = z + this._random(-1.5, 1.5);
       
       const r = this._random(6.0, 11.0);

       this._addSplashRipple(jx, this.waterLevel + 1.5, jz, r);
    }
  }

  _buildCliffColumn(bx, bz, totalHeight) {
    const rocksPerCol = 4; 
    let cy = this.waterLevel - 2; 
    
    for(let k=0; k<rocksPerCol; k++) {
      const hRatio = k / rocksPerCol; 
      const rw = this._random(12, 18) * (1.2 - hRatio * 0.4); 
      const rh = this._random(12, 20); 
      const rd = this._random(10, 14);
      
      const rx = bx + this._random(-2, 2);
      const rz = bz + this._random(-1, 1);
      
      const rotY = this._random(-0.1, 0.1); 

      this._addBlockyRock(this.rockVertex, this.rockFaces, rx, cy, rz, rw, rh, rd, rotY);
      cy += rh * 0.75; 
    }
  }

  _addBlockyRock(vertices, faces, x, y, z, rx, ry, rz, rotY) {
    const vertexOffset = vertices.length / 9;
    const segments = 7; 
    const rings = 6; 
    const cosR = Math.cos(rotY);
    const sinR = Math.sin(rotY);

    for (let ring = 0; ring <= rings; ring++) {
      const v = ring / rings;
      const phi = (v - 0.5) * Math.PI; 

      for (let seg = 0; seg <= segments; seg++) {
        const u = seg / segments;
        const theta = u * Math.PI * 2;

        let lx = Math.sign(Math.cos(theta)) * Math.pow(Math.abs(Math.cos(theta)), 0.8) * rx * Math.cos(phi);
        let lz = Math.sign(Math.sin(theta)) * Math.pow(Math.abs(Math.sin(theta)), 0.8) * rz * Math.cos(phi);
        let ly = ry * Math.sin(phi);

        if (lz > 0) {
            lz *= 0.1; 
        }

        lx += this._random(-0.5, 0.5);
        ly += this._random(-0.5, 0.5);
        lz += this._random(-0.5, 0.5);

        const fx = x + (lx * cosR - lz * sinR);
        const fy = y + ly + (ry/2); 
        const fz = z + (lx * sinR + lz * cosR);

        const nx = lx/rx; const ny = ly/ry; const nz = lz/rz;

        vertices.push(fx, fy, fz, nx, ny, nz, ...this.rockColor);
      }
    }
    for (let ring = 0; ring < rings; ring++) {
      for (let seg = 0; seg < segments; seg++) {
        const a = vertexOffset + ring * (segments + 1) + seg;
        const b = a + 1;
        const c = a + (segments + 1);
        const d = c + 1;
        faces.push(a, c, b); faces.push(b, c, d);
      }
    }
  }

  _addSplashRipple(x, y, z, radius) {
     const vertexOffset = this.splashVertex.length / 9;
     const segments = 12;
     
     this.splashVertex.push(x, y, z, 0, 1, 0, ...this.splashColor);
     
     for(let i=0; i<=segments; i++) {
         const a = (i/segments) * Math.PI * 2;
         const sx = Math.cos(a) * radius;
         const sz = Math.sin(a) * radius * 0.6; 
         this.splashVertex.push(x+sx, y, z+sz, 0,1,0, ...this.splashColor);
     }
     for(let i=0; i<segments; i++) {
         this.splashFaces.push(vertexOffset, vertexOffset+1+i, vertexOffset+1+((i+1)%segments));
     }
  }

  updateAnimation(time) {
    this.waterOffset = (time * 0.001 * 2.0) % 1.0;
    this.splashTime = time * 0.001;
  }

  setup() {
    const GL = this.GL;
    this.ROCK_VERTEX_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, this.ROCK_VERTEX_BUFFER);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(this.rockVertex), GL.STATIC_DRAW);
    this.ROCK_FACES_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.ROCK_FACES_BUFFER);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.rockFaces), GL.STATIC_DRAW);

    this.WATER_VERTEX_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, this.WATER_VERTEX_BUFFER);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(this.waterVertex), GL.STATIC_DRAW);
    this.WATER_FACES_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.WATER_FACES_BUFFER);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.waterFaces), GL.STATIC_DRAW);

    this.SPLASH_VERTEX_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, this.SPLASH_VERTEX_BUFFER);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(this.splashVertex), GL.STATIC_DRAW);
    this.SPLASH_FACES_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.SPLASH_FACES_BUFFER);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.splashFaces), GL.STATIC_DRAW);
  }

  render(PARENT_MATRIX) {
    const GL = this.GL;
    const M = LIBSMudkip.get_I4();
    LIBSMudkip.mul(M, PARENT_MATRIX, this.POSITION_MATRIX);
    LIBSMudkip.mul(M, M, this.MOVE_MATRIX);
    this.MODEL_MATRIX = M;

    GL.useProgram(this.SHADER_PROGRAM);
    const normalMat3 = LIBSMudkip.get_normal_matrix(this.MODEL_MATRIX);
    GL.uniformMatrix3fv(GL.getUniformLocation(this.SHADER_PROGRAM, "normalMatrix"), false, normalMat3);

    // 1. Rocks
    GL.uniformMatrix4fv(this._MMatrix, false, this.MODEL_MATRIX);
    this._bindAndDraw(this.ROCK_VERTEX_BUFFER, this.ROCK_FACES_BUFFER, this.rockFaces.length);

    // 2. Water Streams
    GL.enable(GL.BLEND);
    GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
    GL.depthMask(false);
    
    const animatedM = LIBSMudkip.get_I4();
    LIBSMudkip.mul(animatedM, M, LIBSMudkip.get_I4());
    const flow = Math.sin(this.waterOffset * Math.PI * 2) * 0.1;
    LIBSMudkip.translateY(animatedM, flow); 
    GL.uniformMatrix4fv(this._MMatrix, false, animatedM);
    
    this._bindAndDraw(this.WATER_VERTEX_BUFFER, this.WATER_FACES_BUFFER, this.waterFaces.length);

    // 3. Splash
    GL.blendFunc(GL.SRC_ALPHA, GL.ONE); 
    const scale = 1.0 + Math.sin(this.splashTime * 5) * 0.15;
    const splashM = LIBSMudkip.get_I4();
    LIBSMudkip.mul(splashM, M, LIBSMudkip.get_I4());
    LIBSMudkip.scale(splashM, scale, 1.0, scale); 
    GL.uniformMatrix4fv(this._MMatrix, false, splashM);
    
    this._bindAndDraw(this.SPLASH_VERTEX_BUFFER, this.SPLASH_FACES_BUFFER, this.splashFaces.length);

    GL.depthMask(true);
    GL.disable(GL.BLEND);
  }

  _bindAndDraw(vBuf, iBuf, count) {
    const GL = this.GL;
    GL.bindBuffer(GL.ARRAY_BUFFER, vBuf);
    GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, 36, 0);
    GL.vertexAttribPointer(this._normal, 3, GL.FLOAT, false, 36, 12);
    GL.vertexAttribPointer(this._color, 3, GL.FLOAT, false, 36, 24);
    GL.enableVertexAttribArray(this._normal);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, iBuf);
    GL.drawElements(GL.TRIANGLES, count, GL.UNSIGNED_SHORT, 0);
  }
}