export class Sky {
  GL = null;
  SHADER_PROGRAM = null;
  
  OBJECT_VERTEX = null;
  OBJECT_FACES = null;
  texture = null;
  
  _position = null;
  _uv = null;
  _Pmatrix = null;
  _Vmatrix = null;
  _Mmatrix = null;
  _sampler = null;

  cubeVertices = [];
  cubeFaces = [];

  constructor(GL, opts = {}) {
    this.GL = GL;
    this.texturePath = opts.texturePath || 'environment/skybox.jpg';
    
    this._createShaderProgram();
    this._createCubeGeometry();
    this._loadTexture();
  }

  _createShaderProgram() {
    const GL = this.GL;

    const vertexShaderSource = `
      attribute vec3 position;
      attribute vec2 uv;
      uniform mat4 Pmatrix, Vmatrix, Mmatrix;
      varying vec2 vUV;

      void main(void) {
        // Skybox trick: set z = w to always render at far plane
        vec4 pos = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.0);
        gl_Position = pos.xyww;
        vUV = uv;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform sampler2D sampler;
      varying vec2 vUV;

      void main(void) {
        gl_FragColor = texture2D(sampler, vUV);
      }
    `;

    const compileShader = (source, type, typeString) => {
      const shader = GL.createShader(type);
      GL.shaderSource(shader, source);
      GL.compileShader(shader);
      if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
        console.error(`ERROR IN ${typeString} SHADER: ${GL.getShaderInfoLog(shader)}`);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(vertexShaderSource, GL.VERTEX_SHADER, "VERTEX");
    const fragmentShader = compileShader(fragmentShaderSource, GL.FRAGMENT_SHADER, "FRAGMENT");

    this.SHADER_PROGRAM = GL.createProgram();
    GL.attachShader(this.SHADER_PROGRAM, vertexShader);
    GL.attachShader(this.SHADER_PROGRAM, fragmentShader);
    GL.linkProgram(this.SHADER_PROGRAM);

    if (!GL.getProgramParameter(this.SHADER_PROGRAM, GL.LINK_STATUS)) {
      console.error("ERROR linking shader program: " + GL.getProgramInfoLog(this.SHADER_PROGRAM));
    }

    this._position = GL.getAttribLocation(this.SHADER_PROGRAM, "position");
    this._uv = GL.getAttribLocation(this.SHADER_PROGRAM, "uv");
    this._Pmatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "Pmatrix");
    this._Vmatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "Vmatrix");
    this._Mmatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "Mmatrix");
    this._sampler = GL.getUniformLocation(this.SHADER_PROGRAM, "sampler");
  }

  _createCubeGeometry() {
    // Cube vertices with UV mapping for cross layout cubemap
    // Format: [x, y, z, u, v, ...]
    this.cubeVertices = [
      // Front face
      -1, -1, -1,   1/4, 1/3,
       1, -1, -1,   2/4, 1/3,
       1,  1, -1,   2/4, 2/3,
      -1,  1, -1,   1/4, 2/3,
      
      // Back face
      -1, -1,  1,   3/4, 1/3,
       1, -1,  1,   1.0, 1/3,
       1,  1,  1,   1.0, 2/3,
      -1,  1,  1,   3/4, 2/3,
      
      // Left face
      -1, -1, -1,   0.0, 1/3,
      -1,  1, -1,   0.0, 2/3,
      -1,  1,  1,   1/4, 2/3,
      -1, -1,  1,   1/4, 1/3,
      
      // Right face
       1, -1, -1,   2/4, 1/3,
       1,  1, -1,   2/4, 2/3,
       1,  1,  1,   3/4, 2/3,
       1, -1,  1,   3/4, 1/3,
      
      // Top face
      -1,  1, -1,   1/4, 2/3,
      -1,  1,  1,   1/4, 1.0,
       1,  1,  1,   2/4, 1.0,
       1,  1, -1,   2/4, 2/3,
      
      // Bottom face
      -1, -1, -1,   1/4, 0.0,
      -1, -1,  1,   1/4, 1/3,
       1, -1,  1,   2/4, 1/3,
       1, -1, -1,   2/4, 0.0,
    ];

    // Cube face indices
    this.cubeFaces = [
       0,  1,  2,   0,  2,  3,  // Front
       4,  5,  6,   4,  6,  7,  // Back
       8,  9, 10,   8, 10, 11,  // Left
      12, 13, 14,  12, 14, 15,  // Right
      16, 17, 18,  16, 18, 19,  // Top
      20, 21, 22,  20, 22, 23   // Bottom
    ];
  }

  _loadTexture() {
    const GL = this.GL;
    this.texture = GL.createTexture();
    
    const image = new Image();
    image.src = this.texturePath;
    
    image.onload = () => {
      GL.bindTexture(GL.TEXTURE_2D, this.texture);
      GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, true);
      GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, image);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
      GL.bindTexture(GL.TEXTURE_2D, null);
      
      console.log("Skybox texture loaded successfully");
    };

    image.onerror = () => {
      console.error("Failed to load skybox texture from: " + this.texturePath);
    };
  }

  setup() {
    const GL = this.GL;

    this.OBJECT_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(this.cubeVertices), GL.STATIC_DRAW);

    this.OBJECT_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.cubeFaces), GL.STATIC_DRAW);
  }

  render(projectionMatrix, viewMatrix, modelMatrix) {
    const GL = this.GL;

    // Change depth function to render skybox behind everything
    GL.depthFunc(GL.LEQUAL);
    
    GL.useProgram(this.SHADER_PROGRAM);

    // Create view matrix without translation (skybox follows camera)
    let skyboxViewMatrix = LIBSMudkip.get_I4();
    for (let i = 0; i < 16; i++) {
      skyboxViewMatrix[i] = viewMatrix[i];
    }
    // Remove translation component
    skyboxViewMatrix[12] = 0;
    skyboxViewMatrix[13] = 0;
    skyboxViewMatrix[14] = 0;

    // Set uniforms
    GL.uniformMatrix4fv(this._Pmatrix, false, projectionMatrix);
    GL.uniformMatrix4fv(this._Vmatrix, false, skyboxViewMatrix);
    GL.uniformMatrix4fv(this._Mmatrix, false, modelMatrix);

    // Bind buffers
    GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, 4 * 5, 0);
    GL.vertexAttribPointer(this._uv, 2, GL.FLOAT, false, 4 * 5, 4 * 3);
    GL.enableVertexAttribArray(this._position);
    GL.enableVertexAttribArray(this._uv);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);

    // Bind texture
    GL.activeTexture(GL.TEXTURE0);
    GL.uniform1i(this._sampler, 0);
    GL.bindTexture(GL.TEXTURE_2D, this.texture);

    // Draw skybox
    GL.drawElements(GL.TRIANGLES, this.cubeFaces.length, GL.UNSIGNED_SHORT, 0);

    // Restore default depth function
    GL.depthFunc(GL.LESS);
  }
}