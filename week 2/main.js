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

    var cube_vertex = [
        0,0,-1,1,0, 0 // titik pusat
    ];

    let radius = 1.0;
    for(let i = 0; i <= 360; i +=10) {
        let x = radius * Math.cos(LIBS.degToRad(i));
        let y = radius * Math.sin(LIBS.degToRad(i));
        let z = -1;
        let colors = [1, 0, 0]; //red
        cube_vertex.push(x,y,z, ...colors);
    }

    cube_vertex.push(0, 0, 1, 1, 0, 0)
    for(let i = 0; i <= 360; i +=10) {
        let x = radius * Math.cos(LIBS.degToRad(i));
        let y = radius * Math.sin(LIBS.degToRad(i));
        let z = 1;
        let colors = [1, 0, 0]; //red
        cube_vertex.push(x,y,z, ...colors);
    }

    // POINTS:
    // var cube_vertex = [
    // -1, -1, -1, 0, 0, 0,
    //  1, -1, -1, 1, 0, 0,
    //  1,  1, -1, 1, 1, 0,
    // -1,  1, -1, 0, 1, 0,
    // -1, -1,  1, 0, 0, 1,
    //  1, -1,  1, 1, 0, 1,
    //  1,  1,  1, 1, 1, 1,
    // -1,  1,  1, 0, 1, 1
// ];


var cube_faces = [];

for(let i = 1; i < cube_vertex.length / 6 / 2 -1; i++) {
    cube_faces.push(0, i, i+1);
}

for(let i = cube_vertex.length / 6 / 2 + 2; i < cube_vertex.length / 6; i++) {
    cube_faces.push(cube_vertex.length / 6 / 2 + 1, i, i+1);
}

for(let i = 1; i < cube_vertex.length / 6 / 2; i++) {
    let a = i; // 1
    let b = i+1; // 2
    let c = i+cube_vertex.length / 6 / 2; //38
    let d = i+cube_vertex.length / 6 / 2 + 1; // 39
    cube_faces.push(a, b, c);
    cube_faces.push(b, c, d);
}





   

    var CUBE_VERTEX = GL.createBuffer();
GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(cube_vertex), GL.STATIC_DRAW);

var CUBE_FACES = GL.createBuffer();
GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(cube_faces), GL.STATIC_DRAW);

var PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
var MOVEMATRIX = LIBS.get_I4();
var VIEWMATRIX = LIBS.get_I4();

LIBS.translateZ(VIEWMATRIX, -6);

// event
var THETA = 0, PHI = 0;
var drag = false;
var x_prev, y_prev;
var FRICTION = 0.05;
var dX = 0, dY = 0;
var SPEED = 0.05;


window.addEventListener("keydown", keyDown, false);

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
/*========================= DRAWING ========================= */
GL.enable(GL.DEPTH_TEST);
GL.depthFunc(GL.LEQUAL);
GL.clearColor(0.0, 0.0, 0.0, 1.0);
GL.clearDepth(1.0);

var time_prev = 0;
var animate = function (time) {
    GL.viewport(0, 0, CANVAS.width, CANVAS.height);
    GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

    var dt = time - time_prev;
    time_prev = time;

    

    // LIBS.rotateZ(MOVEMATRIX, dt * 0.001);
    // LIBS.rotateY(MOVEMATRIX, dt * 0.001);
    // LIBS.rotateX(MOVEMATRIX, dt * 0.001);


    LIBS.set_I4(MOVEMATRIX);
LIBS.rotateY(MOVEMATRIX, THETA);
LIBS.rotateX(MOVEMATRIX, PHI);

    // Tambahkan friction pada animate
if (!drag) {
    dX *= (1 - FRICTION);
    dY *= (1 - FRICTION);
    THETA += dX;
    PHI += dY;
}

    GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
    GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);
    GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX);

    GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
    GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * (3 + 3), 0);
    GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * (3 + 3), 4 * 3);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
    GL.drawElements(GL.TRIANGLES, cube_faces.length, GL.UNSIGNED_SHORT, 0);
    
    GL.flush();
    requestAnimationFrame(animate);

    
};
animate(0);
}
window.addEventListener('load', main);