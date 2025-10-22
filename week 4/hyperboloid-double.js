function generateHyperboloidTwoSheet(a, b, c, uStep, vStep, uMax) {
    var vertices = [];
    var faces = [];

    for (var i = 0; i <= uStep; i++) {
        // u dari 0 → uMax (positif), nanti digambar 2x (atas & bawah)
        var u = (i / uStep) * uMax;  

        for (var j = 0; j <= vStep; j++) {
            var v = j / vStep * 2 * Math.PI;

            // sheet atas
            var x1 = a * Math.sinh(u) * Math.cos(v);
            var y1 =  b * Math.cosh(u);
            var z1 = c * Math.sinh(u) * Math.sin(v);

            vertices.push(x1, y1, z1);
            vertices.push(...[x1, y1, z1].map(val => val / 5 + 0.5));

            // sheet bawah (y → negatif)
            var x2 = a * Math.sinh(u) * Math.cos(v);
            var y2 = -b * Math.cosh(u);
            var z2 = c * Math.sinh(u) * Math.sin(v);

            vertices.push(x2, y2, z2);
            vertices.push(...[x2, y2, z2].map(val => val / 5 + 0.5));
        }
    }

    // bikin faces mirip sphere, tapi hati2 karena kita punya dua sheet
    var rowLength = (vStep + 1) * 2; // 2 karena tiap u punya dua sheet
    for (var i = 0; i < uStep; i++) {
        for (var j = 0; j < vStep; j++) {
            var first = i * rowLength + j * 2;
            var second = first + 2;
            var third = first + rowLength;
            var fourth = third + 2;

            // sheet atas
            faces.push(first, second, fourth);
            faces.push(first, fourth, third);

            // sheet bawah
            var f2 = first + 1;
            var s2 = second + 1;
            var t2 = third + 1;
            var fo2 = fourth + 1;
            faces.push(f2, s2, fo2);
            faces.push(f2, fo2, t2);
        }
    }

    return { vertices, faces };
}




function main() {
    /** @type {HTMLCanvasElement} */
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
        attribute vec3 position;
        uniform mat4 Pmatrix, Vmatrix, Mmatrix;
        attribute vec3 color;
        varying vec3 vColor;

        void main(void) {
            gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.);
            vColor = color;
        }`;


    var shader_fragment_source = `
        precision mediump float;
        varying vec3 vColor;

        void main(void) {
            gl_FragColor = vec4(vColor, 1.);
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


    var _color = GL.getAttribLocation(SHADER_PROGRAM, "color");
    GL.enableVertexAttribArray(_color);

    var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
    var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");

    GL.useProgram(SHADER_PROGRAM);


    /*======================== THE TRIANGLE ======================== */
    // POINTS:
    var hyperboloid = generateHyperboloidTwoSheet(0.3, 0.3, 0.3, 40, 40, 2.0);
    var object_vertex = hyperboloid.vertices;
    var object_faces = hyperboloid.faces;


    // // Vertex + warna
    // var object_vertex = sphere.vertices;

    // // Faces
    // var object_faces = sphere.faces;

    // Buffer untuk vertex (posisi + warna)
    var OBJECT_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, OBJECT_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(object_vertex), GL.STATIC_DRAW);

    // Buffer untuk faces
    var OBJECT_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, OBJECT_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(object_faces), GL.STATIC_DRAW);

    var PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    var MOVEMATRIX = LIBS.get_I4();
    var VIEWMATRIX = LIBS.get_I4();

    LIBS.translateZ(VIEWMATRIX, -6);

    var THETA = 0, PHI = 0;
    var drag = false;
    var x_prev, y_prev;
    var FRICTION = 0.05;
    var dX = 0, dY = 0;

    var mouseDown = function (e) {
        drag = true;
        x_prev = e.pageX, y_prev = e.pageY;
        e.preventDefault();
        return false;
    };

    var mouseUp = function (e) {
        drag = false;
    };

    var mouseMove = function (e) {
        if (!drag) return false;
        dX = (e.pageX - x_prev) * 2 * Math.PI / CANVAS.width;
        dY = (e.pageY - y_prev) * 2 * Math.PI / CANVAS.height;
        THETA += dX;
        PHI += dY;
        x_prev = e.pageX, y_prev = e.pageY;
        e.preventDefault();
    };

    CANVAS.addEventListener("mousedown", mouseDown, false);
    CANVAS.addEventListener("mouseup", mouseUp, false);
    CANVAS.addEventListener("mouseout", mouseUp, false);
    CANVAS.addEventListener("mousemove", mouseMove, false);

    var SPEED = 0.05;

    var keyDown = function (e) {
        if (e.key === 'w') {
            dY -= SPEED;
        }
        else if (e.key === 'a') {
            dX -= SPEED;
        }
        else if (e.key === 's') {
            dY += SPEED;
        }
        else if (e.key === 'd') {
            dX += SPEED;
        }
    };

    window.addEventListener("keydown", keyDown, false);

    /*========================= DRAWING ========================= */
    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearColor(0.0, 0.0, 0.0, 1.0);
    GL.clearDepth(1.0);

    var time_prev = 0;
    var animate = function (time) {
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT);

        var dt = time - time_prev;
        time_prev = time;

        LIBS.rotateZ(MOVEMATRIX, dt*0.001);
        LIBS.rotateY(MOVEMATRIX, dt*0.001);
        LIBS.rotateX(MOVEMATRIX, dt*0.001);

        GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);
        GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX);

        LIBS.set_I4(MOVEMATRIX);
        LIBS.rotateY(MOVEMATRIX, THETA);
        LIBS.rotateX(MOVEMATRIX, PHI);

        if (!drag) {
            dX *= (1 - FRICTION);
            dY *= (1 - FRICTION);
            THETA += dX;
            PHI += dY;
        }

        
        GL.bindBuffer(GL.ARRAY_BUFFER, OBJECT_VERTEX);
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * (3 + 3), 0);
        GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * (3 + 3), 4 * 3);

        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, OBJECT_FACES);
        GL.drawElements(GL.TRIANGLES, object_faces.length, GL.UNSIGNED_SHORT, 0);


        GL.flush();
        window.requestAnimationFrame(animate);
    };
    animate(0);
}
window.addEventListener('load', main);