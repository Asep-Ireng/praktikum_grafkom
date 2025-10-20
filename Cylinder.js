// Cylinder.js
export class Cylinder {
    GL = null;
    SHADER_PROGRAM = null;
    _position = null;
    _normal = null;
    _Mmatrix = null;
    _Nmatrix = null;
    LIBS = null;

    OBJECT_VERTEX = null;
    OBJECT_NORMAL = null;
    OBJECT_FACES = null;

    vertices = [];
    normals = [];
    indices = [];

    POSITION_MATRIX = null;
    MOVE_MATRIX = null;

    childs = [];

    constructor(GL, LIBS, SHADER_PROGRAM, locations, opts = {}) {
        this.GL = GL;
        this.LIBS = LIBS;
        this.SHADER_PROGRAM = SHADER_PROGRAM;
        this._position = locations._position;
        this._normal = locations._normal;
        this._Mmatrix = locations._Mmatrix;
        this._Nmatrix = locations._Nmatrix;
        this._u_color = locations._u_color;
        this._shininess = locations._shininess;
        
        this.POSITION_MATRIX = this.LIBS.get_I4();
        this.MOVE_MATRIX = this.LIBS.get_I4();

        const radius = opts.radius ?? 0.5;
        const height = opts.height ?? 1.0;
        const segments = opts.segments ?? 20;
        this.color = opts.color ?? [0.5, 0.5, 0.5, 1.0];
        this.shininess = opts.shininess ?? 10.0;

        this.LIBS.translateX(this.POSITION_MATRIX, opts.x ?? 0);
        this.LIBS.translateY(this.POSITION_MATRIX, opts.y ?? 0);
        this.LIBS.translateZ(this.POSITION_MATRIX, opts.z ?? 0);
        this.LIBS.rotateX(this.POSITION_MATRIX, opts.rx ?? 0);
        this.LIBS.rotateY(this.POSITION_MATRIX, opts.ry ?? 0);
        this.LIBS.rotateZ(this.POSITION_MATRIX, opts.rz ?? 0);

        this._buildGeometry(radius, height, segments);
    }

    _buildGeometry(radius, height, segments) {
        const halfHeight = height / 2;
        
        // Sisi samping
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * 2 * Math.PI;
            const x = radius * Math.cos(angle);
            const z = radius * Math.sin(angle);
            
            // Simpan vertex dan normal untuk sisi
            this.vertices.push(x, halfHeight, z);
            this.normals.push(x / radius, 0, z / radius);
            this.vertices.push(x, -halfHeight, z);
            this.normals.push(x / radius, 0, z / radius);
        }
        for (let i = 0; i < segments; i++) {
            const i0 = i * 2;
            const i1 = i0 + 1;
            const i2 = i0 + 2;
            const i3 = i0 + 3;
            this.indices.push(i0, i1, i2);
            this.indices.push(i1, i3, i2);
        }

        // Tutup Bawah
        const bottomCenterIndex = this.vertices.length / 3;
        this.vertices.push(0, -halfHeight, 0);
        this.normals.push(0, -1, 0);

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * 2 * Math.PI;
            const x = radius * Math.cos(angle);
            const z = radius * Math.sin(angle);
            this.vertices.push(x, -halfHeight, z);
            this.normals.push(0, -1, 0); // Normal mengarah ke bawah
        }
        
        const firstRingIndex = bottomCenterIndex + 1;
        for (let i = 0; i < segments; i++) {
            this.indices.push(bottomCenterIndex, firstRingIndex + i, firstRingIndex + i + 1);
        }
    }

    setup() {
        this.OBJECT_VERTEX = this.GL.createBuffer();
        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
        this.GL.bufferData(this.GL.ARRAY_BUFFER, new Float32Array(this.vertices), this.GL.STATIC_DRAW);

        this.OBJECT_NORMAL = this.GL.createBuffer();
        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_NORMAL);
        this.GL.bufferData(this.GL.ARRAY_BUFFER, new Float32Array(this.normals), this.GL.STATIC_DRAW);

        this.OBJECT_FACES = this.GL.createBuffer();
        this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
        this.GL.bufferData(this.GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), this.GL.STATIC_DRAW);

        // BAGIAN YANG HILANG SEBELUMNYA:
        this.childs.forEach(child => child.setup());
    }

    render(PARENT_MATRIX, PARENT_NORMAL_MATRIX) {
        const MODEL_MATRIX = this.LIBS.get_I4();
        this.LIBS.mul(MODEL_MATRIX, PARENT_MATRIX, this.POSITION_MATRIX);
        this.LIBS.mul(MODEL_MATRIX, MODEL_MATRIX, this.MOVE_MATRIX);
        
        const NORMAL_MATRIX = this.LIBS.get_I4();
        this.LIBS.mul(NORMAL_MATRIX, PARENT_NORMAL_MATRIX, this.POSITION_MATRIX);
        this.LIBS.mul(NORMAL_MATRIX, NORMAL_MATRIX, this.MOVE_MATRIX);

        this.GL.uniformMatrix4fv(this._Mmatrix, false, MODEL_MATRIX);
        this.GL.uniformMatrix4fv(this._Nmatrix, false, NORMAL_MATRIX);
        this.GL.uniform4fv(this._u_color, this.color);
        this.GL.uniform1f(this._shininess, this.shininess);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
        this.GL.vertexAttribPointer(this._position, 3, this.GL.FLOAT, false, 0, 0);
        
        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_NORMAL);
        this.GL.vertexAttribPointer(this._normal, 3, this.GL.FLOAT, false, 0, 0);

        this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
        this.GL.drawElements(this.GL.TRIANGLES, this.indices.length, this.GL.UNSIGNED_SHORT, 0);

        this.childs.forEach(child => child.render(MODEL_MATRIX, NORMAL_MATRIX));
    }
}