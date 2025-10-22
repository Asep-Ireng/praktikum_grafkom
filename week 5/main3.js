import { MyObject } from "./MyObject.js";

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
        uniform float greyScality;

        void main(void) {
            float greyScaleValue = (vColor.r + vColor.b + vColor.g) / 3.0;
            vec3 greyScaleColor = vec3(greyScaleValue, greyScaleValue, greyScaleValue);
            vec3 color = mix(vColor, greyScaleColor, greyScality);
            gl_FragColor = vec4(color, 1.0);
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

    var _greyscality = GL.getUniformLocation(SHADER_PROGRAM, "greyScality");

    GL.useProgram(SHADER_PROGRAM);


    var Object1 = new MyObject(GL, SHADER_PROGRAM, _position, _color, _Mmatrix);
    var Object2 = new MyObject(GL, SHADER_PROGRAM, _position, _color, _Mmatrix);

    Object1.childs.push(Object2);

    LIBS.scaleX(Object1.POSITION_MATRIX, 0.75);
    LIBS.scaleY(Object1.POSITION_MATRIX, 0.75);
    LIBS.scaleZ(Object1.POSITION_MATRIX, 0.75);

    LIBS.translateX(Object2.POSITION_MATRIX, 5);

    
    // var Object3 = new MyObject(GL, SHADER_PROGRAM, _position, _color, _Mmatrix);
   

    var PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    // var MOVEMATRIX = LIBS.get_I4();
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

    Object1.setup();

    var time_prev = 0;
    var animate = function (time) {
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT);

        var dt = time - time_prev;
        time_prev = time;

        // LIBS.rotateZ(MOVEMATRIX, dt*0.001);
        // LIBS.rotateY(MOVEMATRIX, dt*0.001);
        // LIBS.rotateX(MOVEMATRIX, dt*0.001);

        GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);
        // GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX);

        // LIBS.set_I4(MOVEMATRIX);
        // LIBS.rotateY(MOVEMATRIX, THETA);
        // LIBS.rotateX(MOVEMATRIX, PHI);

        

        if (!drag) {
            dX *= (1 - FRICTION);
            dY *= (1 - FRICTION);
            THETA += dX;
            PHI += dY;
        }

        // LIBS.set_I4(MOVEMATRIX);
var temp = LIBS.get_I4();

// Translasi -P1 = (0, 3, 0)
// LIBS.translateY(temp, 3);
// MOVEMATRIX = LIBS.multiply(MOVEMATRIX, temp);

// // Rotasi X 90°
// temp = LIBS.get_I4();
// LIBS.rotateX(temp, Math.PI/2);
// MOVEMATRIX = LIBS.multiply(MOVEMATRIX, temp);

// // Rotasi Y -45°
// temp = LIBS.get_I4();
// LIBS.rotateY(temp, -Math.PI/4);
// MOVEMATRIX = LIBS.multiply(MOVEMATRIX, temp);

// // Rotasi Z sesuai waktu
// temp = LIBS.get_I4();
// LIBS.rotateZ(temp, time * 0.001);
// MOVEMATRIX = LIBS.multiply(MOVEMATRIX, temp);

// // Balikkan Y
// temp = LIBS.get_I4();
// LIBS.rotateY(temp, Math.PI/4);
// MOVEMATRIX = LIBS.multiply(MOVEMATRIX, temp);

// // Balikkan X
// temp = LIBS.get_I4();
// LIBS.rotateX(temp, -Math.PI/2);
// MOVEMATRIX = LIBS.multiply(MOVEMATRIX, temp);

// // Translasi balik
// temp = LIBS.get_I4();
// LIBS.translateY(temp, -3);
// MOVEMATRIX = LIBS.multiply(MOVEMATRIX, temp);



        // GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
        // GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * (3 + 3), 0);
        // GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * (3 + 3), 4 * 3);
        // GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
        // GL.uniform1f(_greyscality, 0.7); // 0.0 = warna asli, 1.0 = greyscale penuh
        // GL.drawElements(GL.TRIANGLES, cube_faces.length, GL.UNSIGNED_SHORT, 0);


        LIBS.rotateY(Object1.MOVE_MATRIX, dt * 0.001);

        Object1.render(LIBS.get_I4());


        GL.flush();
        window.requestAnimationFrame(animate);
    };
    animate(0);
}
window.addEventListener('load', main);
