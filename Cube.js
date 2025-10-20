// Cube.js
// Kelas ini mendefinisikan geometri dan normal untuk sebuah balok
// agar memiliki shading yang rata (flat shading) untuk gaya low-poly.

export class Cube {
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

        this.color = opts.color ?? [0.5, 0.5, 0.5, 1.0];
        this.shininess = opts.shininess ?? 10.0;

        this.LIBS.translateX(this.POSITION_MATRIX, opts.x ?? 0);
        this.LIBS.translateY(this.POSITION_MATRIX, opts.y ?? 0);
        this.LIBS.translateZ(this.POSITION_MATRIX, opts.z ?? 0);
        this.LIBS.rotateX(this.POSITION_MATRIX, opts.rx ?? 0);
        this.LIBS.rotateY(this.POSITION_MATRIX, opts.ry ?? 0);
        this.LIBS.rotateZ(this.POSITION_MATRIX, opts.rz ?? 0);

        // Skala untuk membuat balok dari kubus
        const sx = opts.sx ?? 1.0;
        const sy = opts.sy ?? 1.0;
        const sz = opts.sz ?? 1.0;

        this._buildGeometry(sx, sy, sz);
    }

    _buildGeometry(sx, sy, sz) {
        // Mendefinisikan 8 titik sudut dari balok
        const v = [
            [-0.5*sx, -0.5*sy,  0.5*sz], [-0.5*sx,  0.5*sy,  0.5*sz],
            [ 0.5*sx,  0.5*sy,  0.5*sz], [ 0.5*sx, -0.5*sy,  0.5*sz],
            [-0.5*sx, -0.5*sy, -0.5*sz], [-0.5*sx,  0.5*sy, -0.5*sz],
            [ 0.5*sx,  0.5*sy, -0.5*sz], [ 0.5*sx, -0.5*sy, -0.5*sz]
        ];

        // Mendefinisikan 6 sisi dari balok
        const faces = [
            [0, 1, 2, 3], // Depan
            [7, 6, 5, 4], // Belakang
            [4, 5, 1, 0], // Kiri
            [3, 2, 6, 7], // Kanan
            [1, 5, 6, 2], // Atas
            [4, 0, 3, 7]  // Bawah
        ];

        // Mendefinisikan normal untuk setiap sisi (untuk flat shading)
        const n = [
            [0, 0, 1], [0, 0, -1], [-1, 0, 0],
            [1, 0, 0], [0, 1, 0], [0, -1, 0]
        ];

        let vertex_count = 0;
        for (let i = 0; i < faces.length; i++) {
            // Untuk setiap sisi, tambahkan 4 titik sudut
            const face = faces[i];
            for (let j = 0; j < 4; j++) {
                this.vertices.push(...v[face[j]]);
                this.normals.push(...n[i]); // Normal sama untuk 1 sisi
            }
            // Buat 2 segitiga dari 4 titik sudut
            this.indices.push(vertex_count, vertex_count + 1, vertex_count + 2);
            this.indices.push(vertex_count, vertex_count + 2, vertex_count + 3);
            vertex_count += 4;
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