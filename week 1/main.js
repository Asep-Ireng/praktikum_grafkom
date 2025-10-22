function main() {
    var CANVAS = document.getElementById("mycanvas");

    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    // WEBGL CONTEXT
    /** @type (WebGLRenderContext) **/
    var GL;
    try {
        GL = CANVAS.getContext("webgl", { antialias: true });
    } catch (e) {
        alert ("WebGL context cannot be initialized");
        console.log(e);
        return false;
    }

    // SHADERS
    var shader_vertex_source = `
    attribute vec2 position;
    attribute vec3 color;
    varying vec3 vColor;
   
    void main(void) {
        gl_Position = vec4(position, 0., 1.);
        gl_PointSize = 20.0;
        vColor = color;
    }`;

    var shader_fragment_source = `
    precision mediump float;
    // uniform vec3 uColor;
    varying vec3 vColor;
   
    void main(void) {
        // gl_FragColor = vec4(uColor, 1.);
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
    }
    var shader_vertex = compile_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");
    var shader_fragment = compile_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");

    var SHADER_PROGRAM = GL.createProgram();
    GL.attachShader(SHADER_PROGRAM, shader_vertex);
    GL.attachShader(SHADER_PROGRAM, shader_fragment);

    GL.linkProgram(SHADER_PROGRAM);

    var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
    var _color = GL.getAttribLocation(SHADER_PROGRAM, "color");

    GL.enableVertexAttribArray(_position);
    GL.enableVertexAttribArray(_color);

    GL.useProgram(SHADER_PROGRAM);
    var uniform_color = GL.getUniformLocation(SHADER_PROGRAM, "uColor");


    // POINTS
    var triangle_vertex = [
    //   x   y 
    //     -0.5, -0.5, // index 0
    //     1, 0, 0, // rgb index 0

    //     -0.5, 0.5, // index 1
    //     1, 1, 0, // rgb index 1

    //     0, 0.5, // index 2
    //     0, 1, 0, // rgb index 2

    //    0, -0.5, // index 3
    //    0 , 0, 1 // rgb index 3

        -0.3, -0.7, // index 0
        1, 0, 0, // rgb index 0

        -0.3, 0.3, // index 1
        1, 0, 0, // rgb index 1

        0.3, 0.3, // index 2
        1, 0, 0, // rgb index 2

       0.3, -0.7, // index 3
       1, 0, 0, // rgb index 3

    ];

    var atap_vertex = [
        -0.5,  0.3,  
       0, 1, 0,

        0, 0.9, 
        0, 1, 0,

        0.5, 0.3,
        0,1,0
    ];

    var pintu_vertex = [
        -0.1, -0.7, // index 0
        0, 0, 1, // rgb index 0

        -0.1, 0.1, // index 1
        0, 0, 1, // rgb index 1

        0.1, 0.1, // index 2
        0, 0, 1, // rgb index 2

       0.1, -0.7, // index 3
       0, 0, 1, // rgb index 3
    ];



    // Bindbuffer --> menampung value supaya bisa di draw
    var TRIANGLE_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, TRIANGLE_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(triangle_vertex), GL.STATIC_DRAW);

    var ATAP_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, ATAP_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(atap_vertex), GL.STATIC_DRAW);

    var PINTU_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, PINTU_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(pintu_vertex), GL.STATIC_DRAW);

      var triangle_faces = [
        // ambil dari index triangle_vertex
        0, 1, 2,
        0, 2, 3,
    ];

      var atap_faces = [
        // ambil dari index triangle_vertex
        0, 1, 2,
    ];

    var pintu_faces = [
        // ambil dari index triangle_vertex
        0, 1, 2,
        0, 2, 3
    ];


        // Bindbuffer faces 
    var TRIANGLE_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, TRIANGLE_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangle_faces), GL.STATIC_DRAW);

    var ATAP_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, ATAP_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(atap_faces), GL.STATIC_DRAW);

    var PINTU_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, PINTU_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(pintu_faces), GL.STATIC_DRAW);


    // Drawing    r    g    b    a(transparancy)
    GL.clearColor(0.0, 0.5, 0.5, 0.0);
    var animate = function() {
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT);

        // Draw stuff here...
        GL.bindBuffer(GL.ARRAY_BUFFER, TRIANGLE_VERTEX);
        GL.vertexAttribPointer(_position, 2, GL.FLOAT, false, 4 * (2 + 3), 0);
        GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * (2+3), 4*2);
        GL.uniform3f(uniform_color, 1, 1, 1); // r g b
        // GL.drawArrays(GL.TRIANGLES, 0, triangle_vertex.length/2);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, TRIANGLE_FACES);
        GL.drawElements(GL.TRIANGLE_FAN, triangle_faces.length, GL.UNSIGNED_SHORT, 0);

        
        GL.bindBuffer(GL.ARRAY_BUFFER, ATAP_VERTEX);
        GL.vertexAttribPointer(_position, 2, GL.FLOAT, false, 4 * (2 + 3), 0);
        GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * (2+3), 4*2);
        GL.uniform3f(uniform_color, 1, 1, 1); // r g b
        // GL.drawArrays(GL.TRIANGLES, 0, triangle_vertex.length/2);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, ATAP_FACES);
        GL.drawElements(GL.TRIANGLES, atap_faces.length, GL.UNSIGNED_SHORT, 0);

        GL.bindBuffer(GL.ARRAY_BUFFER, PINTU_VERTEX);
        GL.vertexAttribPointer(_position, 2, GL.FLOAT, false, 4 * (2 + 3), 0);
        GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * (2+3), 4*2);
        GL.uniform3f(uniform_color, 1, 1, 1); // r g b
        // GL.drawArrays(GL.TRIANGLES, 0, triangle_vertex.length/2);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, PINTU_FACES);
        GL.drawElements(GL.TRIANGLE_FAN, pintu_faces.length, GL.UNSIGNED_SHORT, 0);

        GL.flush();
        window.requestAnimationFrame(animate);
    };
    animate();
}
window.addEventListener('load', main);