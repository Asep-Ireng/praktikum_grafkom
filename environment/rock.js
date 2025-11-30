export class Rock {
  GL = null;
  SHADER_PROGRAM = null;
  _position = null;
  _color = null;
  _normal = null;
  _MMatrix = null;
  vertex = [];
  faces = [];
  POSITION_MATRIX = LIBSMudkip.get_I4();
  MOVE_MATRIX = LIBSMudkip.get_I4();
  MODEL_MATRIX = LIBSMudkip.get_I4();
  rocks = [];
  _seed = 12345;

  constructor(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, opts = {}) {
    this.GL = GL;
    this.SHADER_PROGRAM = SHADER_PROGRAM;
    this._position = _position;
    this._color = _color;
    this._normal = _normal;
    this._MMatrix = _Mmatrix;
    this.groundRadius = opts.groundRadius ?? 65;
    this.numClusters = opts.numClusters ?? 6;
    this.numScattered = opts.numScattered ?? 5;
    this.puddles = opts.puddles ?? [];
    this._seed = opts.seed ?? 12345;
    this.baseGray = [0.30, 0.30, 0.35];
    this.baseBrown = [0.35, 0.30, 0.25];
    this._generateAllRocks();
    this._buildGeometry();
  }

  _seededRandom() {
    this._seed = (this._seed * 9301 + 49297) % 233280;
    return this._seed / 233280;
  }
  _random(min, max) { return min + this._seededRandom() * (max - min); }
  _randomRadius(minR, maxR) {
    const u = this._seededRandom();
    return Math.sqrt(minR*minR + u*(maxR*maxR - minR*minR));
  }

  _isValidPosition(x, z, minDistance = 2.5) {
    for (const puddle of this.puddles) {
      const dx = x - puddle.x;
      const dz = z - puddle.z;
      if (Math.sqrt(dx * dx + dz * dz) < puddle.radius + minDistance) return false;
    }
    return true;
  }

  _getRandomPosition(minRadius, maxRadius) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const angle = this._seededRandom() * Math.PI * 2;
      const radius = this._randomRadius(minRadius, maxRadius);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (this._isValidPosition(x, z)) return { x, z };
    }
    const angle = this._seededRandom() * Math.PI * 2;
    const radius = this._random(minRadius, maxRadius);
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  }

  _getRandomColor() {
    const useGray = this._seededRandom() > 0.5;
    const baseColor = useGray ? this.baseGray : this.baseBrown;
    return [
      Math.max(0, Math.min(1, baseColor[0] + this._random(-0.05, 0.05))),
      Math.max(0, Math.min(1, baseColor[1] + this._random(-0.05, 0.05))),
      Math.max(0, Math.min(1, baseColor[2] + this._random(-0.05, 0.05)))
    ];
  }

  _generateAllRocks() {
    for (let i = 0; i < this.numClusters; i++) {
      const clusterPos = this._getRandomPosition(10, this.groundRadius * 0.8);
      this._generateCluster(clusterPos.x, clusterPos.z, Math.floor(this._random(3, 6)));
    }
    const count = Math.max(24, this.numScattered);
    for (let i = 0; i < count; i++) {
      const pos = this._getRandomPosition(10, this.groundRadius * 0.95);
      this.rocks.push({
        type: this._seededRandom() > 0.5 ? "smooth" : "angular",
        x: pos.x, y: 0, z: pos.z,
        size: this._random(0.35, 1.4),
        rotX: this._random(0, Math.PI * 2), rotY: this._random(0, Math.PI * 2), rotZ: this._random(0, Math.PI * 2),
        color: this._getRandomColor(),
        scaleX: this._random(0.8, 1.2), scaleY: this._random(0.7, 0.9), scaleZ: this._random(0.8, 1.2),
      });
    }
  }

  _generateCluster(baseX, baseZ, numRocks) {
    let currentY = 0;
    for (let i = 0; i < numRocks; i++) {
      let x = baseX, z = baseZ, y = currentY;
      const size = this._random(0.6, 2.5);
      if (i > 0) {
        const offsetAngle = this._random(0, Math.PI * 2);
        const offsetDist = this._random(0, 1.0);
        x += Math.cos(offsetAngle) * offsetDist;
        z += Math.sin(offsetAngle) * offsetDist;
        y = currentY - (size * 0.3);
      }
      this.rocks.push({
        type: this._seededRandom() > 0.5 ? 'smooth' : 'angular',
        x: x, y: y, z: z, size: size,
        rotX: this._random(-0.3, 0.3), rotY: this._random(0, Math.PI * 2), rotZ: this._random(-0.3, 0.3),
        color: this._getRandomColor(),
        scaleX: this._random(0.8, 1.2), scaleY: this._random(0.7, 0.9), scaleZ: this._random(0.8, 1.2)
      });
      currentY += size * 0.7; 
    }
  }

  _generateRockGeometry(type, size, scaleX, scaleY, scaleZ, color) {
    const vertices = [], faces = [];
    const segments = type === 'angular' ? 10 : 20;
    const rings = type === 'angular' ? 8 : 14;
    const rx = size * scaleX, ry = size * scaleY, rz = size * scaleZ;
    const vOffset = this.vertex.length / 9;

    for (let ring = 0; ring <= rings; ring++) {
      const v = ring / rings;
      const phi = v * Math.PI;
      for (let seg = 0; seg <= segments; seg++) {
        const u = seg / segments;
        const theta = u * Math.PI * 2;
        let x = rx * Math.sin(phi) * Math.cos(theta);
        let y = ry * Math.cos(phi);
        let z = rz * Math.sin(phi) * Math.sin(theta);

        if (type === 'smooth') {
          const scale = 1.0 + Math.sin(theta * 3) * Math.cos(phi * 2) * 0.15;
          x *= scale; y *= scale; z *= scale;
        } else {
          x *= (1.0 + Math.sin(theta * 5 + phi * 3) * 0.2);
          y *= (1.0 + Math.cos(theta * 3 + phi * 5) * 0.2);
          z *= (1.0 + Math.sin(theta * 4 + phi * 4) * 0.2);
        }

        let nx = x/(rx*rx), ny = y/(ry*ry), nz = z/(rz*rz);
        const nLen = Math.hypot(nx, ny, nz) || 1;
        
        const r = Math.max(0, Math.min(1, color[0] + this._random(-0.02, 0.02)));
        const g = Math.max(0, Math.min(1, color[1] + this._random(-0.02, 0.02)));
        const b = Math.max(0, Math.min(1, color[2] + this._random(-0.02, 0.02)));
        vertices.push(x, y, z, nx/nLen, ny/nLen, nz/nLen, r, g, b);
      }
    }
    for (let ring = 0; ring < rings; ring++) {
      for (let seg = 0; seg < segments; seg++) {
        const a = vOffset + ring * (segments + 1) + seg;
        const b = a + 1, c = a + (segments + 1), d = c + 1;
        faces.push(a, c, b); faces.push(b, c, d);
      }
    }
    return { vertices, faces };
  }

  _buildGeometry() {
    for (const rock of this.rocks) {
      const geom = this._generateRockGeometry(rock.type, rock.size, rock.scaleX, rock.scaleY, rock.scaleZ, rock.color);
      const cosX = Math.cos(rock.rotX), sinX = Math.sin(rock.rotX);
      const cosY = Math.cos(rock.rotY), sinY = Math.sin(rock.rotY);
      const cosZ = Math.cos(rock.rotZ), sinZ = Math.sin(rock.rotZ);

      for (let i = 0; i < geom.vertices.length; i += 9) {
        let x = geom.vertices[i], y = geom.vertices[i+1], z = geom.vertices[i+2];
        let nx = geom.vertices[i+3], ny = geom.vertices[i+4], nz = geom.vertices[i+5];

        let tx = x*cosY + z*sinY, tz = -x*sinY + z*cosY; x=tx; z=tz;
        let tnx = nx*cosY + nz*sinY, tnz = -nx*sinY + nz*cosY; nx=tnx; nz=tnz;

        let ty = y*cosX - z*sinX; tz = y*sinX + z*cosX; y=ty; z=tz;
        let tny = ny*cosX - nz*sinX; tnz = ny*sinX + nz*cosX; ny=tny; nz=tnz;

        tx = x*cosZ - y*sinZ; ty = x*sinZ + y*cosZ; x=tx; y=ty;
        tnx = nx*cosZ - ny*sinZ; tny = nx*sinZ + ny*cosZ; nx=tnx; ny=tny;

        this.vertex.push(x + rock.x, y + rock.y, z + rock.z, nx, ny, nz, geom.vertices[i+6], geom.vertices[i+7], geom.vertices[i+8]);
      }
      this.faces.push(...geom.faces);
    }
  }

  setup() {
    this.OBJECT_VERTEX = this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    this.GL.bufferData(this.GL.ARRAY_BUFFER, new Float32Array(this.vertex), this.GL.STATIC_DRAW);
    this.OBJECT_FACES = this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    this.GL.bufferData(this.GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.faces), this.GL.STATIC_DRAW);
  }

  render(PARENT_MATRIX) {
    const GL = this.GL;
    const M = LIBSMudkip.get_I4();
    LIBSMudkip.mul(M, PARENT_MATRIX, this.POSITION_MATRIX);
    LIBSMudkip.mul(M, M, this.MOVE_MATRIX);
    this.MODEL_MATRIX = M;

    GL.useProgram(this.SHADER_PROGRAM);
    GL.uniformMatrix4fv(this._MMatrix, false, this.MODEL_MATRIX);
    
    // IMPORTANT: Send normal matrix for the new shader
    const normalMat3 = LIBSMudkip.get_normal_matrix(this.MODEL_MATRIX);
    const uNormalMatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "normalMatrix");
    if(uNormalMatrix) GL.uniformMatrix3fv(uNormalMatrix, false, normalMat3);

    GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, 36, 0);
    GL.vertexAttribPointer(this._normal,   3, GL.FLOAT, false, 36, 12);
    GL.vertexAttribPointer(this._color,    3, GL.FLOAT, false, 36, 24);
    GL.enableVertexAttribArray(this._normal);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    GL.drawElements(GL.TRIANGLES, this.faces.length, GL.UNSIGNED_SHORT, 0);
  }
}