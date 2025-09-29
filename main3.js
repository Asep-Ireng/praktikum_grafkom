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
    var cube_vertex = [
        -1, -1, -1, 0, 0, 0,
        1, -1, -1, 1, 0, 0,
        1,  1, -1, 1, 1, 0,
        -1,  1, -1, 0, 1, 0,
        -1, -1,  1, 0, 0, 1,
        1, -1,  1, 1, 0, 1,
        1,  1,  1, 1, 1, 1,
        -1,  1,  1, 0, 1, 1
    ];

    var cube_faces = [
        0, 1, 2, 0, 2, 3,
        4, 5, 6, 4, 6, 7,
        0, 3, 7, 0, 4, 7,
        1, 2, 6, 1, 5, 6,
        2, 3, 6, 3, 7, 6,
        0, 1, 5, 0, 4, 5
    ];

    // // THE MESH (replace the cube section)
    var hyper = generateHyperboloidOneSheet(0.3, 0.3, 0.3, 36, 72, 0.2);

    // Interleaved: position(3) + color(3)
    var object_vertex = hyper.vertices;
    var object_faces = hyper.faces;

    // Generate smaller ellipsoid
    //var ellipsoid = generateEllipsoid(0.5, 0.35, 0.6, 32, 64);

    //var object_vertex = ellipsoid.vertices;
    //var object_faces = ellipsoid.faces;

    var OBJECT_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, OBJECT_VERTEX);
    GL.bufferData(
    GL.ARRAY_BUFFER,
    new Float32Array(object_vertex),
    GL.STATIC_DRAW
    );

    var OBJECT_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, OBJECT_FACES);
    GL.bufferData(
    GL.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(object_faces),
    GL.STATIC_DRAW
    );

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
    GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

    GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
    GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);
    GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX);

    LIBS.set_I4(MOVEMATRIX);
    LIBS.rotateY(MOVEMATRIX, THETA);
    LIBS.rotateX(MOVEMATRIX, PHI);

    GL.bindBuffer(GL.ARRAY_BUFFER, OBJECT_VERTEX);
    GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * 6, 0);
    GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * 6, 4 * 3);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, OBJECT_FACES);
    GL.drawElements(GL.TRIANGLES, object_faces.length, GL.UNSIGNED_SHORT, 0);


        GL.flush();
        window.requestAnimationFrame(animate);
    };
    animate(0);
}
window.addEventListener('load', main);


function generateHyperboloidOneSheet(
  a = 1,
  b = 1,
  c = 1,
  stacks = 36,
  sectors = 72,
  epsilon = 0.2
) {
  const vertices = [];
  const faces = [];

  // Param ranges (avoid singularities at ±π/2)
  const vMin = -Math.PI / 2 + epsilon;
  const vMax = Math.PI / 2 - epsilon;
  const uMin = -Math.PI;
  const uMax = Math.PI;

  // For color normalization
  const secMax = 1 / Math.cos(vMax);
  const tanMax = Math.tan(vMax);
  const clamp01 = (t) => Math.max(0, Math.min(1, t));

  for (let i = 0; i <= stacks; i++) {
    const v = vMin + (i / stacks) * (vMax - vMin);
    const secv = 1 / Math.cos(v);
    const tanv = Math.tan(v);

    for (let j = 0; j <= sectors; j++) {
      const u = uMin + (j / sectors) * (uMax - uMin);

      // Hyperboloid (one sheet)
      const x = a * secv * Math.cos(u);
      const y = b * secv * Math.sin(u);
      const z = c * tanv;

      // Simple position-based color, normalized to 0..1
      const r = clamp01(x / (2 * a * secMax) + 0.5);
      const g = clamp01(y / (2 * b * secMax) + 0.5);
      const bl = clamp01(z / (2 * c * tanMax) + 0.5);

      vertices.push(x, y, z, r, g, bl);
    }
  }

  // Indices (two triangles per quad)
  for (let i = 0; i < stacks; i++) {
    for (let j = 0; j < sectors; j++) {
      const first = i * (sectors + 1) + j;
      const second = first + 1;
      const third = first + (sectors + 1);
      const fourth = third + 1;
      faces.push(first, second, fourth, first, fourth, third);
    }
  }

  return { vertices, faces };
}


function generateEllipsoid(a = 1, b = 1, c = 1, stacks = 36, sectors = 72) {
  const vertices = [];
  const faces = [];

  // helper to keep colors in [0,1]
  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  const da = a || 1e-6, db = b || 1e-6, dc = c || 1e-6;

  // u: latitude in [-π/2, π/2], v: longitude in [-π, π]
  for (let i = 0; i <= stacks; i++) {
    const u = -Math.PI / 2 + (i / stacks) * Math.PI; // lat
    const cu = Math.cos(u);
    const su = Math.sin(u);

    for (let j = 0; j <= sectors; j++) {
      const v = -Math.PI + (j / sectors) * (2 * Math.PI); // lon
      const cv = Math.cos(v);
      const sv = Math.sin(v);

      // Ellipsoid parametric
      const x = a * cv * cu;
      const y = b * su;
      const z = c * sv * cu;

      // Simple position-based color, normalized to [0,1]
      const r = clamp01(x / (2 * da) + 0.5);
      const g = clamp01(y / (2 * db) + 0.5);
      const bl = clamp01(z / (2 * dc) + 0.5);

      vertices.push(x, y, z, r, g, bl);
    }
  }

  // indices (two triangles per quad)
  for (let i = 0; i < stacks; i++) {
    for (let j = 0; j < sectors; j++) {
      const first = i * (sectors + 1) + j;
      const second = first + 1;
      const third = first + (sectors + 1);
      const fourth = third + 1;
      faces.push(first, second, fourth, first, fourth, third);
    }
  }

  return { vertices, faces };
}