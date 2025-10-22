// Lathe.js
export class Lathe {
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

        const controlPoints = opts.controlPoints ?? [[0.5, 1, 0], [0.5, 0, 0]];
        const segments = opts.segments ?? 20;
        const profileSegments = opts.profileSegments ?? 20;
        this.color = opts.color ?? [0.5, 0.5, 0.5, 1.0];
        this.shininess = opts.shininess ?? 10.0;

        const scaleX = opts.scaleX ?? 1.0;
        const scaleZ = opts.scaleZ ?? 1.0;

        this.LIBS.translateX(this.POSITION_MATRIX, opts.x ?? 0);
        this.LIBS.translateY(this.POSITION_MATRIX, opts.y ?? 0);
        this.LIBS.translateZ(this.POSITION_MATRIX, opts.z ?? 0);
        this.LIBS.rotateX(this.POSITION_MATRIX, opts.rx ?? 0);
        this.LIBS.rotateY(this.POSITION_MATRIX, opts.ry ?? 0);
        this.LIBS.rotateZ(this.POSITION_MATRIX, opts.rz ?? 0);

        this._buildGeometry(controlPoints, segments, profileSegments, scaleX, scaleZ);
    }
    
    _getBezierPoint(t, p0, p1, p2, p3) {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;

        const p = [
            uuu * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + ttt * p3[0],
            uuu * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + ttt * p3[1],
            0
        ];
        return p;
    }

    _buildGeometry(controlPoints, segments, profileSegments, scaleX, scaleZ) {
        const profilePoints = [];
        for (let i = 0; i < controlPoints.length - 3; i += 3) {
            for (let j = 0; j <= profileSegments; j++) {
                const t = j / profileSegments;
                profilePoints.push(this._getBezierPoint(t, controlPoints[i], controlPoints[i+1], controlPoints[i+2], controlPoints[i+3]));
            }
        }
        
        for (let i = 0; i < profilePoints.length; i++) {
            for (let j = 0; j <= segments; j++) {
                const angle = (j / segments) * 2 * Math.PI;
                const point = profilePoints[i];
                
                const x = point[0] * scaleX * Math.cos(angle);
                const y = point[1];
                const z = point[0] * scaleZ * Math.sin(angle);
                this.vertices.push(x, y, z);
                
                const normal = [x / (scaleX * scaleX), 0, z / (scaleZ * scaleZ)];
                const len = Math.sqrt(normal[0]*normal[0] + normal[1]*normal[1] + normal[2]*normal[2]);
                this.normals.push(normal[0]/len, normal[1]/len, normal[2]/len);
            }
        }
        
        for (let i = 0; i < profilePoints.length - 1; i++) {
            for (let j = 0; j < segments; j++) {
                const first = i * (segments + 1) + j;
                const second = first + segments + 1;
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