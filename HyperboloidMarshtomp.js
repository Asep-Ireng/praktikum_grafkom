// Hyperboloid.js
export class Hyperboloid {
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

        const a = opts.a ?? 0.2;
        const c = opts.c ?? 0.2;
        const height = opts.height ?? 1.0;
        const stacks = opts.stacks ?? 30;
        const sectors = opts.sectors ?? 30;
        this.color = opts.color ?? [0.5, 0.5, 0.5, 1.0];
        this.shininess = opts.shininess ?? 10.0;
        
        const u_min = opts.u_min ?? -1.0;
        const u_max = opts.u_max ?? 1.0;

        this.LIBS.translateX(this.POSITION_MATRIX, opts.x ?? 0);
        this.LIBS.translateY(this.POSITION_MATRIX, opts.y ?? 0);
        this.LIBS.translateZ(this.POSITION_MATRIX, opts.z ?? 0);
        this.LIBS.rotateX(this.POSITION_MATRIX, opts.rx ?? 0);
        this.LIBS.rotateY(this.POSITION_MATRIX, opts.ry ?? 0);
        this.LIBS.rotateZ(this.POSITION_MATRIX, opts.rz ?? 0);

        this._buildGeometry(a, c, height, stacks, sectors, u_min, u_max);
    }

    _buildGeometry(a, c, height, stacks, sectors, u_min, u_max) {
        for (let i = 0; i <= stacks; i++) {
            const u_ratio = i / stacks;
            const u = u_min + u_ratio * (u_max - u_min);

            for (let j = 0; j <= sectors; j++) {
                const v_ratio = j / sectors;
                const v = -Math.PI + v_ratio * (Math.PI * 2);

                // Persamaan parametrik untuk Hyperboloid
                const x = a * Math.cosh(u) * Math.cos(v);
                const y = height * Math.sinh(u); // Sumbu Y sebagai tinggi
                const z = c * Math.cosh(u) * Math.sin(v);
                this.vertices.push(x, y, z);

                // Normal untuk hyperboloid
                const nx = (2 * x) / (a * a);
                const ny = (-2 * y) / (height * height);
                const nz = (2 * z) / (c * c);
                const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
                this.normals.push(nx/len, ny/len, nz/len);
            }
        }

        for (let i = 0; i < stacks; i++) {
            for (let j = 0; j < sectors; j++) {
                const first = i * (sectors + 1) + j;
                const second = first + sectors + 1;
                this.indices.push(first, second, first + 1);
                this.indices.push(second, second + 1, first + 1);
            }
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

        this.childs.forEach(child => child.setup());
    }

    render(PARENT_MATRIX, PARENT_NORMAL_MATRIX) { 
        const MODEL_MATRIX = this.LIBS.get_I4();
        this.LIBS.mul(MODEL_MATRIX, PARENT_MATRIX, this.POSITION_MATRIX);
        this.LIBS.mul(MODEL_MATRIX, MODEL_MATRIX, this.MOVE_MATRIX);

        const NORMAL_MATRIX = this.LIBS.getNormalMatrix(MODEL_MATRIX);
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