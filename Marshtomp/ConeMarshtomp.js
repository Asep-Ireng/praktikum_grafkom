// ConeMarshtomp.js - FIXED
export class Cone {
    GL = null;
    SHADER_PROGRAM = null;
    _position = null;
    _normal = null;
    _Mmatrix = null;
    _Nmatrix = null;
    _u_color = null;
    _shininess = null;
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
        this._u_color = locations._u_color || null;
        this._shininess = locations._shininess || null;

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
        this.vertices.push(0, height, 0);
        this.normals.push(0, 1, 0);
        this.vertices.push(0, 0, 0);
        this.normals.push(0, -1, 0);

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * 2 * Math.PI;
            const x = radius * Math.cos(angle);
            const z = radius * Math.sin(angle);
            this.vertices.push(x, 0, z);

            const normal = [height * x, radius * radius, height * z];
            const len = Math.sqrt(normal[0]**2 + normal[1]**2 + normal[2]**2);
            this.normals.push(normal[0]/len, normal[1]/len, normal[2]/len);
        }

        for (let i = 0; i < segments; i++) {
            this.indices.push(0, 2 + i, 2 + i + 1);
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
        
        // Set matrices
        this.GL.uniformMatrix4fv(this._Mmatrix, false, MODEL_MATRIX);
        this.GL.uniformMatrix4fv(this._Nmatrix, false, NORMAL_MATRIX);

        // ✅ Set color uniforms ONLY ONCE with null check
        if (this._u_color !== null) {
            this.GL.uniform4fv(this._u_color, this.color);
        }
        if (this._shininess !== null) {
            this.GL.uniform1f(this._shininess, this.shininess);
        }

        // Bind buffers
        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
        this.GL.vertexAttribPointer(this._position, 3, this.GL.FLOAT, false, 0, 0);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_NORMAL);
        this.GL.vertexAttribPointer(this._normal, 3, this.GL.FLOAT, false, 0, 0);

        this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
        this.GL.drawElements(this.GL.TRIANGLES, this.indices.length, this.GL.UNSIGNED_SHORT, 0);

        this.childs.forEach(child => child.render(MODEL_MATRIX, NORMAL_MATRIX));
    }
}
