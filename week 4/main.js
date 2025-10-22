function generateBSpline(controlPoint, m, degree) {
    var curves = [];
    var knotVector = [];
    var n = controlPoint.length / 2; 

    // Generate knot vector
    for (var i = 0; i < n + degree + 1; i++) {
        if (i < degree + 1) knotVector.push(0);
        else if (i >= n) knotVector.push(n - degree);
        else knotVector.push(i - degree);
    }

    // Basis function
    var basisFunc = function (i, j, t) {
        if (j == 0) {
            return (knotVector[i] <= t && t < knotVector[i + 1]) ? 1 : 0;
        }
        var den1 = knotVector[i + j] - knotVector[i];
        var den2 = knotVector[i + j + 1] - knotVector[i + 1];

        var term1 = 0, term2 = 0;
        if (den1 != 0 && !isNaN(den1)) {
            term1 = ((t - knotVector[i]) / den1) * basisFunc(i, j - 1, t);
        }
        if (den2 != 0 && !isNaN(den2)) {
            term2 = ((knotVector[i + j + 1] - t) / den2) * basisFunc(i + 1, j - 1, t);
        }
        return term1 + term2;
    };

    for (var t = 0; t < m; t++) {
        var x = 0, y = 0;
        var u = (t / m * (knotVector[n] - knotVector[degree])) + knotVector[degree];
        for (var key = 0; key < n; key++) {
            var C = basisFunc(key, degree, u);
            x += (controlPoint[key * 2] * C);
            y += (controlPoint[key * 2 + 1] * C);
        }
        curves.push(x);
        curves.push(y);
    }
    return curves;
}

function main() {
    var CANVAS = document.getElementById("mycanvas");

    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

        /*===================== GET WEBGL CONTEXT ===================== */
    /** @type {WebGLRenderingContext} */
    var GL;
    try {
        GL = CANVAS.getContext("webgl", { antialias: true });
    } catch (e) {
        alert("WebGL context cannot be initialized");
        return false;
    }

    /*========================= SHADERS ========================= */
    var shader_vertex_source = `
        attribute vec2 position;
 
        void main(void) {
            gl_Position = vec4(position, 0., 1.);
            gl_PointSize = 10.0;
        }`;


    var shader_fragment_source = `
        precision mediump float;
        uniform vec3 uColor;
        void main(void) {
            gl_FragColor = vec4(uColor, 1.);
        }`;
    
    var compile_shader = function (source, type, typeString) {
        var shader = GL.createShader(type);
        GL.shaderSource(shader, source);
        GL.compileShader(shader);
        if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
            alert("ERROR IN " + typeString + " SHADER: " + GL.getShaderInfoLog(shader));
            return false;
        }
        return shader;
    };
    var shader_vertex = compile_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");
    var shader_fragment = compile_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");

    
    var SHADER_PROGRAM = GL.createProgram();
    GL.attachShader(SHADER_PROGRAM, shader_vertex);
    GL.attachShader(SHADER_PROGRAM, shader_fragment);


    GL.linkProgram(SHADER_PROGRAM);


    var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");


    GL.enableVertexAttribArray(_position);
   
    GL.useProgram(SHADER_PROGRAM);
    var uniform_color = GL.getUniformLocation(SHADER_PROGRAM, "uColor");

        /*======================== THE SHAPES ======================== */
    // POINTS:
    // variabel triangle vertex menyimpan data dalam format x1, y1, x2, y2, dst.
  var bSpline_controlPoint = [
    -1.0, -1.0,
    -1.0,  1.0,
     1.0,  -1.0,
     1.0, 1.0
    ];

    var CONTROL_VERTEX = GL.createBuffer(); 
    GL.bindBuffer(GL.ARRAY_BUFFER, CONTROL_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(bSpline_controlPoint), GL.STATIC_DRAW);

    
    var bSpline_vertex = generateBSpline(bSpline_controlPoint, 20, 2);

    var SPLINE_VERTEX = GL.createBuffer();  
    GL.bindBuffer(GL.ARRAY_BUFFER, SPLINE_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(bSpline_vertex), GL.STATIC_DRAW);

        /*========================= DRAWING ========================= */
    GL.clearColor(0.0, 0.0, 0.0, 0.0);
    var animate = function () {
        GL.viewport(CANVAS.width/4, CANVAS.height/4, CANVAS.width/2, CANVAS.height/2);
        GL.clear(GL.COLOR_BUFFER_BIT);


        // [ ... ] Draw stuffs here
        GL.bindBuffer(GL.ARRAY_BUFFER, SPLINE_VERTEX);
        GL.vertexAttribPointer(_position, 2, GL.FLOAT, false, 4 * 2, 0);
        GL.uniform3f(uniform_color, 1, 1, 0);
        GL.drawArrays(GL.LINE_STRIP, 0, bSpline_vertex.length/2);
        GL.drawArrays(GL.POINTS, 0, bSpline_vertex.length/2);

        GL.bindBuffer(GL.ARRAY_BUFFER, CONTROL_VERTEX);
        GL.vertexAttribPointer(_position, 2, GL.FLOAT, false, 4 * 2, 0);
        GL.uniform3f(uniform_color, 0, 0, 1);
        GL.drawArrays(GL.LINE_STRIP, 0, bSpline_vertex.length/2);
        GL.uniform3f(uniform_color, 1, 0, 0);
        GL.drawArrays(GL.POINTS, 0, bSpline_vertex.length/2);


        GL.flush();
        window.requestAnimationFrame(animate);
    };
    animate();
}
window.addEventListener('load', main);