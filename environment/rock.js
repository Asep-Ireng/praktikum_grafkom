export class Rock {
  GL = null;
  SHADER_PROGRAM = null;

  _position = null;
  _color = null;
  _normal = null;
  _MMatrix = null;

  OBJECT_VERTEX = null;
  OBJECT_FACES = null;

  vertex = [];
  faces = [];

  POSITION_MATRIX = LIBSMudkip.get_I4();
  MOVE_MATRIX = LIBSMudkip.get_I4();
  MODEL_MATRIX = LIBSMudkip.get_I4();

  // Rock storage
  rocks = [];

  // Seeded random number generator
  _seed = 12345;

  _randomRadius(minR, maxR) {
  const u = this._seededRandom();                 // 0..1
  return Math.sqrt(minR*minR + u*(maxR*maxR - minR*minR));
}

  constructor(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, opts = {}) {
    this.GL = GL;
    this.SHADER_PROGRAM = SHADER_PROGRAM;
    this._position = _position;
    this._color = _color;
    this._normal = _normal;
    this._MMatrix = _Mmatrix;

    // Configuration
    this.groundRadius = opts.groundRadius ?? 35;
    this.numClusters = opts.numClusters ?? 6;
    this.numScattered = opts.numScattered ?? 5;

    // Puddle locations for collision avoidance
    this.puddles = opts.puddles ?? [
      { x: -5, z: 3, radius: 1.8 },
      { x: 6, z: -4, radius: 2.0 },
      { x: 0, z: 7, radius: 1.5 }
    ];

    // Seed for consistent rock placement
    this._seed = opts.seed ?? 12345;

    // Color palettes
    this.baseGray = [0.30, 0.30, 0.35];
    this.baseBrown = [0.35, 0.30, 0.25];

    // Generate all rocks
    this._generateAllRocks();
    this._buildGeometry();
  }

  // Seeded random number generator (LCG algorithm)
  _seededRandom() {
    this._seed = (this._seed * 9301 + 49297) % 233280;
    return this._seed / 233280;
  }

  // Random helper using seeded random
  _random(min, max) {
    return min + this._seededRandom() * (max - min);
  }

  // Check if position is valid (not in puddle)
  _isValidPosition(x, z, minDistance = 2.5) {
    for (const puddle of this.puddles) {
      const dx = x - puddle.x;
      const dz = z - puddle.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < puddle.radius + minDistance) {
        return false;
      }
    }
    return true;
  }

  // Generate random position on circular ground
  _getRandomPosition(minRadius, maxRadius, maxAttempts = 20) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const angle = this._seededRandom() * Math.PI * 2;
      const radius = this._randomRadius(minRadius, maxRadius);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      if (this._isValidPosition(x, z)) {
        return { x, z };
      }
    }

    // Fallback: return position even if not perfect
    const angle = this._seededRandom() * Math.PI * 2;
    const radius = this._random(minRadius, maxRadius);
    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius
    };
  }

  // Get random color variation
  _getRandomColor() {
    const useGray = this._seededRandom() > 0.5;
    const baseColor = useGray ? this.baseGray : this.baseBrown;

    return [
      Math.max(0, Math.min(1, baseColor[0] + this._random(-0.05, 0.05))),
      Math.max(0, Math.min(1, baseColor[1] + this._random(-0.05, 0.05))),
      Math.max(0, Math.min(1, baseColor[2] + this._random(-0.05, 0.05)))
    ];
  }

  _scatterUniform(count, minR, maxR) {
  const pts = [];
  const sector = (Math.PI * 2) / count;

  for (let i = 0; i < count; i++) {
    // sudut dasar per sektor + jitter kecil
    const angle = i * sector + this._random(-sector * 0.3, sector * 0.3);
    const r = this._randomRadius(minR, maxR);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    if (this._isValidPosition(x, z)) pts.push({ x, z });
  }
  return pts;
}

  // Generate all rocks (clusters + scattered)
  _generateAllRocks() {
  // ======== 1️⃣ Generate clustered rocks (tumpukan) ========
  for (let i = 0; i < this.numClusters; i++) {
    // Lokasi cluster agak di tengah–pinggir
    const clusterPos = this._getRandomPosition(10, this.groundRadius * 0.8);
    const numRocksInCluster = Math.floor(this._random(3, 6)); // 3–5 batu per cluster
    this._generateCluster(clusterPos.x, clusterPos.z, numRocksInCluster);
  }

  // ======== 2️⃣ Generate uniformly scattered rocks ========
  const uniformPts = this._scatterUniform(
    Math.max(24, this.numScattered), // banyak titik melingkar
    4,                               // radius minimum
    this.groundRadius * 0.95         // hampir ke tepi
  );

  for (const pos of uniformPts) {
    const type = this._seededRandom() > 0.5 ? "smooth" : "angular";
    const size = this._random(0.35, 1.4);

    this.rocks.push({
      type,
      x: pos.x,
      y: 0,
      z: pos.z,
      size,
      rotX: this._random(0, Math.PI * 2),
      rotY: this._random(0, Math.PI * 2),
      rotZ: this._random(0, Math.PI * 2),
      color: this._getRandomColor(),
      scaleX: this._random(0.8, 1.2),
      scaleY: this._random(0.7, 0.9),
      scaleZ: this._random(0.8, 1.2),
    });
  }
}

  // Generate a cluster of stacked rocks
  _generateCluster(baseX, baseZ, numRocks) {
    const clusterRocks = [];

    // Sort rocks by size (largest first)
    const sizes = [];
    for (let i = 0; i < numRocks; i++) {
      sizes.push(this._random(0.6, 2.5));
    }
    sizes.sort((a, b) => b - a); // Descending

    let currentY = 0;
    let lastRadius = 0;

    for (let i = 0; i < numRocks; i++) {
      const size = sizes[i];
      const type = this._seededRandom() > 0.5 ? 'smooth' : 'angular';

      // Calculate position
      let x = baseX;
      let z = baseZ;
      let y = currentY;

      // Add offset for stacking (not first rock)
      if (i > 0) {
        const offsetAngle = this._random(0, Math.PI * 2);
        const offsetDist = this._random(0, lastRadius * 0.5);
        x += Math.cos(offsetAngle) * offsetDist;
        z += Math.sin(offsetAngle) * offsetDist;

        // Overlap factor for natural stacking
        const overlapFactor = 0.3;
        y = currentY - (size * overlapFactor);
      }

      const rock = {
        type: type,
        x: x,
        y: y,
        z: z,
        size: size,
        rotX: this._random(-0.3, 0.3),
        rotY: this._random(0, Math.PI * 2),
        rotZ: this._random(-0.3, 0.3),
        color: this._getRandomColor(),
        scaleX: this._random(0.8, 1.2),
        scaleY: this._random(0.7, 0.9),
        scaleZ: this._random(0.8, 1.2)
      };

      clusterRocks.push(rock);

      // Update for next iteration
      lastRadius = size * Math.max(rock.scaleX, rock.scaleZ);
      currentY += size * rock.scaleY * 0.7; // Stack height
    }

    // Add all cluster rocks to main array
    this.rocks.push(...clusterRocks);
  }

  // Generate ellipsoid geometry for a single rock
  _generateRockGeometry(type, size, scaleX, scaleY, scaleZ, color) {
    const vertices = [];
    const faces = [];

    // Adjust segments based on type
    const segments = type === 'angular' ? 10 : 20;
    const rings = type === 'angular' ? 8 : 14;

    // Ellipsoid radii
    const rx = size * scaleX;
    const ry = size * scaleY;
    const rz = size * scaleZ;

    const vertexOffset = this.vertex.length / 9; // Current vertex count

    // Generate vertices
    for (let ring = 0; ring <= rings; ring++) {
      const v = ring / rings;
      const phi = v * Math.PI; // 0 to PI

      for (let seg = 0; seg <= segments; seg++) {
        const u = seg / segments;
        const theta = u * Math.PI * 2; // 0 to 2PI

        // Spherical to Cartesian (ellipsoid)
        let x = rx * Math.sin(phi) * Math.cos(theta);
        let y = ry * Math.cos(phi);
        let z = rz * Math.sin(phi) * Math.sin(theta);

        // Add deformation for organic look
        if (type === 'smooth') {
          // Smooth deformation
          const noise = Math.sin(theta * 3) * Math.cos(phi * 2) * 0.15;
          const scale = 1.0 + noise;
          x *= scale;
          y *= scale;
          z *= scale;
        } else {
          // Angular deformation (more random)
          const noiseX = Math.sin(theta * 5 + phi * 3) * 0.2;
          const noiseY = Math.cos(theta * 3 + phi * 5) * 0.2;
          const noiseZ = Math.sin(theta * 4 + phi * 4) * 0.2;
          x *= (1.0 + noiseX);
          y *= (1.0 + noiseY);
          z *= (1.0 + noiseZ);
        }

        // Calculate normal (for ellipsoid)
        let nx = x / (rx * rx);
        let ny = y / (ry * ry);
        let nz = z / (rz * rz);
        const nLen = Math.hypot(nx, ny, nz) || 1;
        nx /= nLen;
        ny /= nLen;
        nz /= nLen;

        // Color variation per vertex
        const colorVar = this._random(-0.02, 0.02);
        const r = Math.max(0, Math.min(1, color[0] + colorVar));
        const g = Math.max(0, Math.min(1, color[1] + colorVar));
        const b = Math.max(0, Math.min(1, color[2] + colorVar));

        vertices.push(x, y, z, nx, ny, nz, r, g, b);
      }
    }

    // Generate faces
    for (let ring = 0; ring < rings; ring++) {
      for (let seg = 0; seg < segments; seg++) {
        const a = vertexOffset + ring * (segments + 1) + seg;
        const b = a + 1;
        const c = a + (segments + 1);
        const d = c + 1;

        // Two triangles per quad
        faces.push(a, c, b);
        faces.push(b, c, d);
      }
    }

    return { vertices, faces };
  }

  // Build complete geometry for all rocks
  _buildGeometry() {
    for (const rock of this.rocks) {
      const geom = this._generateRockGeometry(
        rock.type,
        rock.size,
        rock.scaleX,
        rock.scaleY,
        rock.scaleZ,
        rock.color
      );

      // Transform vertices to world position
      const cosRX = Math.cos(rock.rotX);
      const sinRX = Math.sin(rock.rotX);
      const cosRY = Math.cos(rock.rotY);
      const sinRY = Math.sin(rock.rotY);
      const cosRZ = Math.cos(rock.rotZ);
      const sinRZ = Math.sin(rock.rotZ);

      for (let i = 0; i < geom.vertices.length; i += 9) {
        let x = geom.vertices[i];
        let y = geom.vertices[i + 1];
        let z = geom.vertices[i + 2];
        let nx = geom.vertices[i + 3];
        let ny = geom.vertices[i + 4];
        let nz = geom.vertices[i + 5];

        // Rotate around Y (yaw)
        let tx = x * cosRY + z * sinRY;
        let tz = -x * sinRY + z * cosRY;
        x = tx;
        z = tz;

        let tnx = nx * cosRY + nz * sinRY;
        let tnz = -nx * sinRY + nz * cosRY;
        nx = tnx;
        nz = tnz;

        // Rotate around X (pitch) - small rotation
        let ty = y * cosRX - z * sinRX;
        tz = y * sinRX + z * cosRX;
        y = ty;

        let tny = ny * cosRX - nz * sinRX;
        tnz = ny * sinRX + nz * cosRX;
        ny = tny;
        nz = tnz;

        // Rotate around Z (roll) - small rotation
        tx = x * cosRZ - y * sinRZ;
        ty = x * sinRZ + y * cosRZ;
        x = tx;
        y = ty;

        tnx = nx * cosRZ - ny * sinRZ;
        tny = nx * sinRZ + ny * cosRZ;
        nx = tnx;
        ny = tny;

        // Translate to world position
        x += rock.x;
        y += rock.y;
        z += rock.z;

        // Add to main vertex array
        this.vertex.push(
          x, y, z,
          nx, ny, nz,
          geom.vertices[i + 6],  // r
          geom.vertices[i + 7],  // g
          geom.vertices[i + 8]   // b
        );
      }

      // Add faces
      this.faces.push(...geom.faces);
    }
  }

  setup() {
    const GL = this.GL;

    this.OBJECT_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(this.vertex), GL.STATIC_DRAW);

    this.OBJECT_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.faces), GL.STATIC_DRAW);
  }

  render(PARENT_MATRIX) {
    const GL = this.GL;
    const M = LIBSMudkip.get_I4();
    LIBSMudkip.mul(M, PARENT_MATRIX, this.POSITION_MATRIX);
    LIBSMudkip.mul(M, M, this.MOVE_MATRIX);
    this.MODEL_MATRIX = M;

    GL.useProgram(this.SHADER_PROGRAM);
    GL.uniformMatrix4fv(this._MMatrix, false, this.MODEL_MATRIX);

    const normalMat3 = LIBSMudkip.get_normal_matrix(this.MODEL_MATRIX);
    const uNormalMatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "normalMatrix");
    GL.uniformMatrix3fv(uNormalMatrix, false, normalMat3);

    GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, 36, 0);
    GL.vertexAttribPointer(this._normal,   3, GL.FLOAT, false, 36, 12);
    GL.vertexAttribPointer(this._color,    3, GL.FLOAT, false, 36, 24);
    GL.enableVertexAttribArray(this._normal);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    GL.drawElements(GL.TRIANGLES, this.faces.length, GL.UNSIGNED_SHORT, 0);
  }
}
