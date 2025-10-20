// Arm.js
// Kelas ini mendefinisikan geometri custom untuk lengan Marshtomp.
export class Arm {
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

        this._buildGeometry();
    }

    _buildGeometry() {
        // Mendefinisikan 8 titik sudut dari bentuk lengan
        // 4 titik atas (bahu, lebih sempit)
        const v0 = [-0.15,  0.6,  0.1]; // Kiri atas depan
        const v1 = [ 0.15,  0.6,  0.1]; // Kanan atas depan
        const v2 = [ 0.15,  0.6, -0.1]; // Kanan atas belakang
        const v3 = [-0.15,  0.6, -0.1]; // Kiri atas belakang

        // 4 titik bawah (tangan, lebih lebar)
        const v4 = [-0.3, -0.6,  0.1]; // Kiri bawah depan
        const v5 = [ 0.3, -0.6,  0.1]; // Kanan bawah depan
        const v6 = [ 0.3, -0.6, -0.1]; // Kanan bawah belakang
        const v7 = [-0.3, -0.6, -0.1]; // Kiri bawah belakang
        
        // Gabungkan semua titik
        const vertices = [ ...v0, ...v1, ...v2, ...v3, ...v4, ...v5, ...v6, ...v7 ];

        // Definisi sisi (wajah) menggunakan indeks dari array vertices
        // Setiap angka merepresentasikan satu titik (v0 adalah 0, v1 adalah 1, dst.)
        const faces = [
            0, 1, 5, 4, // Depan
            2, 3, 7, 6, // Belakang
            3, 0, 4, 7, // Samping kiri
            1, 2, 6, 5, // Samping kanan
            3, 2, 1, 0, // Atas (bahu)
            4, 5, 6, 7  // Bawah (tangan)
        ];
        
        // Loop untuk menyusun ulang vertices, normals, dan indices untuk WebGL
        for (let i = 0; i < faces.length; i += 4) {
            const quad = [faces[i], faces[i+1], faces[i+2], faces[i+3]];
            
            const p1 = [vertices[quad[0]*3], vertices[quad[0]*3+1], vertices[quad[0]*3+2]];
            const p2 = [vertices[quad[1]*3], vertices[quad[1]*3+1], vertices[quad[1]*3+2]];
            const p3 = [vertices[quad[2]*3], vertices[quad[2]*3+1], vertices[quad[2]*3+2]];
            
            // Hitung normal untuk flat shading
            const vec1 = this.LIBS.subtract(p2, p1);
            const vec2 = this.LIBS.subtract(p3, p1);
            const normal = this.LIBS.normalize(this.LIBS.cross(vec2, vec1));
            
            // Buat 2 segitiga dari 1 sisi segiempat
            const idx = this.vertices.length / 3;
            this.indices.push(idx, idx+1, idx+2, idx, idx+2, idx+3);

            for (let j = 0; j < 4; j++) {
                const pointIndex = quad[j];
                this.vertices.push(vertices[pointIndex*3], vertices[pointIndex*3+1], vertices[pointIndex*3+2]);
                this.normals.push(...normal);
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