// environment/palm_tree.js

export class PalmTree {
  GL = null;
  SHADER_PROGRAM = null;

  _position = null;
  _color = null;
  _normal = null;
  _MMatrix = null;

  vertex = [];
  faces = [];
  
  VERTEX_BUFFER = null;
  FACES_BUFFER = null;

  POSITION_MATRIX = LIBSMudkip.get_I4();
  MOVE_MATRIX = LIBSMudkip.get_I4();
  MODEL_MATRIX = LIBSMudkip.get_I4();

  trees = [];
  _seed = 123;

  constructor(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, opts = {}) {
    this.GL = GL;
    this.SHADER_PROGRAM = SHADER_PROGRAM;
    this._position = _position;
    this._color = _color;
    this._normal = _normal;
    this._MMatrix = _Mmatrix;

    this.islandRadius = opts.islandRadius ?? 65;
    this.numTrees = opts.numTrees ?? 8;
    this._seed = opts.seed ?? 456;

    // Colors
    this.trunkColor = [0.55, 0.40, 0.25]; // Wood brown
    this.leafColor = [0.15, 0.60, 0.10];  // Palm green
    this.coconutColor = [0.25, 0.15, 0.05]; // Dark brown

    this._generateTrees();
    this.setup();
  }

  _seededRandom() {
    this._seed = (this._seed * 9301 + 49297) % 233280;
    return this._seed / 233280;
  }
  _random(min, max) { return min + this._seededRandom() * (max - min); }

  _generateTrees() {
    const count = this.numTrees;
    
    for(let i=0; i<count; i++) {
        // Place on island, scattering them away from the center
        const angle = this._seededRandom() * Math.PI * 2;
        // Place between 25% and 90% of the radius
        const r = this._random(15, this.islandRadius * 0.9); 
        
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const y = 0; // On ground
        
        const height = this._random(9, 15);
        const leanX = this._random(-4, 4); // Random lean direction
        const leanZ = this._random(-4, 4);
        
        this._buildSingleTree(x, y, z, height, leanX, leanZ);
    }
  }

  _buildSingleTree(x, y, z, h, leanX, leanZ) {
    // 1. Trunk (Segmented Cylinder)
    const segments = 7; 
    const rings = 10;
    const baseR = 0.7;
    const topR = 0.4;
    const vOffset = this.vertex.length / 9;
    
    // Generate trunk vertices
    for(let i=0; i<=rings; i++) {
        const v = i/rings;
        const ringY = y + v * h;
        
        // Curve the trunk using a quadratic curve
        const curveX = x + (leanX * v * v); 
        const curveZ = z + (leanZ * v * v);
        
        const r = baseR * (1-v) + topR * v;
        
        for(let j=0; j<=segments; j++) {
            const u = j/segments;
            const theta = u * Math.PI * 2;
            
            const px = Math.cos(theta) * r;
            const pz = Math.sin(theta) * r;
            
            // Simple normal approximation (pointing out)
            this.vertex.push(
                curveX + px, ringY, curveZ + pz,
                Math.cos(theta), 0, Math.sin(theta), 
                this.trunkColor[0], this.trunkColor[1], this.trunkColor[2]
            );
        }
    }
    
    // Trunk Faces
    for(let i=0; i<rings; i++) {
        for(let j=0; j<segments; j++) {
            const start = vOffset + i*(segments+1) + j;
            const next = start + (segments+1);
            this.faces.push(start, next, start+1);
            this.faces.push(start+1, next, next+1);
        }
    }

    // 2. Palm Fronds (Leaves) at the top
    const topX = x + leanX;
    const topZ = z + leanZ;
    const topY = y + h;
    const numFronds = 8;
    
    for(let i=0; i<numFronds; i++) {
        const angle = (i/numFronds) * Math.PI * 2 + this._random(0, 0.5);
        this._buildFrond(topX, topY, topZ, angle);
    }

    // 3. Coconuts (small spheres under leaves)
    for(let i=0; i<3; i++) {
        const angle = (i/3) * Math.PI * 2;
        this._buildCoconut(topX + Math.cos(angle)*0.5, topY - 0.4, topZ + Math.sin(angle)*0.5);
    }
  }

  _buildFrond(ox, oy, oz, angle) {
      const length = this._random(7, 10);
      const segs = 6;
      const vOff = this.vertex.length / 9;
      const wid = 0.9; // Leaf width

      // A frond is a curved strip
      for(let i=0; i<=segs; i++) {
          const t = i/segs;
          
          // Arch logic: Go up slightly then droop down significantly
          const dist = t * length;
          const lift = Math.sin(t * Math.PI) * 1.5 - (t*t*4.0); 
          
          const fx = ox + Math.cos(angle) * dist;
          const fz = oz + Math.sin(angle) * dist;
          const fy = oy + lift;

          const nx = -Math.sin(angle);
          const nz = Math.cos(angle);
          
          // Left vertex
          this.vertex.push(
              fx - nx*wid*(1-t), fy, fz - nz*wid*(1-t),
              0, 1, 0,
              this.leafColor[0], this.leafColor[1], this.leafColor[2]
          );
          // Right vertex
          this.vertex.push(
              fx + nx*wid*(1-t), fy, fz + nz*wid*(1-t),
              0, 1, 0,
              this.leafColor[0], this.leafColor[1], this.leafColor[2]
          );
      }

      for(let i=0; i<segs; i++) {
          const base = vOff + i*2;
          this.faces.push(base, base+2, base+1);
          this.faces.push(base+1, base+2, base+3);
      }
  }

  _buildCoconut(x, y, z) {
      const r = 0.35;
      const segs = 5; const rings=5; 
      const vOff = this.vertex.length/9;
      
      for(let i=0; i<=rings; i++) {
          const v = i/rings;
          const phi = v * Math.PI;
          for(let j=0; j<=segs; j++) {
              const u = j/segs;
              const theta = u * Math.PI * 2;
              const px = Math.sin(phi)*Math.cos(theta)*r;
              const py = Math.cos(phi)*r;
              const pz = Math.sin(phi)*Math.sin(theta)*r;
              this.vertex.push(x+px, y+py, z+pz, px/r, py/r, pz/r, ...this.coconutColor);
          }
      }
      for(let i=0; i<rings; i++) {
          for(let j=0; j<segs; j++) {
              const b = vOff + i*(segs+1) + j;
              const n = b + (segs+1);
              this.faces.push(b, n, b+1);
              this.faces.push(b+1, n, n+1);
          }
      }
  }

  setup() {
    const GL = this.GL;
    this.VERTEX_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, this.VERTEX_BUFFER);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(this.vertex), GL.STATIC_DRAW);

    this.FACES_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.FACES_BUFFER);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.faces), GL.STATIC_DRAW);
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
    GL.uniformMatrix4fv(this._MMatrix, false, this.MODEL_MATRIX);

    GL.bindBuffer(GL.ARRAY_BUFFER, this.VERTEX_BUFFER);
    GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, 36, 0);
    GL.vertexAttribPointer(this._normal, 3, GL.FLOAT, false, 36, 12);
    GL.vertexAttribPointer(this._color, 3, GL.FLOAT, false, 36, 24);
    GL.enableVertexAttribArray(this._normal);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.FACES_BUFFER);
    GL.drawElements(GL.TRIANGLES, this.faces.length, GL.UNSIGNED_SHORT, 0);
  }
}