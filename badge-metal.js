/* Small, local WebGL renderer for the metal only. Card text remains accessible HTML. */
window.createBadgeMetal = function createBadgeMetal(stage) {
  const canvas = stage.querySelector('.badge-metal-canvas');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) return null;
  let layout;
  let solid;
  let occluder;
  let lost = false;
  const vertexSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec2 aMaterial;
    uniform vec3 uAngles;
    uniform vec2 uOffset;
    uniform vec4 uLayout;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vRoughness;
    vec3 rx(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}
    vec3 ry(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}
    vec3 rz(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x-s*p.y,s*p.x+c*p.y,p.z);}
    void main(){
      float turn=uAngles.z*aMaterial.y;
      vec3 p=rz(rx(ry(aPosition,turn),uAngles.y),uAngles.x)+vec3(uOffset,0.);
      vNormal=rz(rx(ry(aNormal,turn),uAngles.y),uAngles.x);
      vPosition=p;
      vRoughness=aMaterial.x;
      float w=uLayout.w-p.z;
      float near=100.,far=3000.;
      gl_Position=vec4(2.*uLayout.w*p.x/uLayout.x,
        (1.-2.*uLayout.z/uLayout.y)*w-2.*uLayout.w*p.y/uLayout.y,
        (far+near)/(far-near)*w-2.*far*near/(far-near),w);
    }`;
  const fragmentSource = `
    precision highp float;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vRoughness;
    float band(float x,float center,float width){return exp(-pow((x-center)/width,2.));}
    void main(){
      vec3 n=normalize(vNormal);
      vec3 view=normalize(vec3(0.,0.,1500.)-vPosition);
      vec3 reflected=reflect(-view,n);
      float rough=vRoughness;
      // Two tall softboxes, a dark studio flag and the broad ceiling reflection.
      float tall=1.-smoothstep(.68,.92,abs(reflected.y));
      float softbox=band(reflected.x,-.48,.065+rough*.11)*tall*2.8;
      float fill=band(reflected.x,.62,.12+rough*.13)*tall*1.3;
      float ceiling=(1.-smoothstep(-.75,-.22,reflected.y))*.32;
      float broad=band(reflected.x,-.08,.45)*.16;
      vec3 environment=vec3(.035,.042,.05)+vec3(softbox+fill+ceiling+broad);
      float fresnel=.78+.22*pow(1.-max(dot(n,view),0.),5.);
      float rim=pow(max(dot(n,normalize(vec3(-.45,-.65,1.))),0.),28.)*.2;
      float grain=sin(vPosition.y*23.+sin(vPosition.x*3.))*rough*.022;
      float coating=mix(1.,.27,smoothstep(.5,.8,rough));
      vec3 light=(environment*fresnel+rim+grain)*coating;
      vec3 color=pow(1.-exp(-max(light,vec3(.01))*1.3),vec3(1./2.2));
      gl_FragColor=vec4(color,1.);
    }`;
  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(result);
      gl.deleteShader(result);
      throw new Error(error);
    }
    return result;
  }
  let program;
  try {
    program = gl.createProgram();
    const vertex = shader(gl.VERTEX_SHADER, vertexSource);
    const fragment = shader(gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch {
    if (program) gl.deleteProgram(program);
    return null;
  }
  const attributes = ['aPosition', 'aNormal', 'aMaterial'].map(name => gl.getAttribLocation(program, name));
  const uniforms = Object.fromEntries(['uAngles', 'uOffset', 'uLayout'].map(name => [name, gl.getUniformLocation(program, name)]));
  const normalize = v => { const length = Math.hypot(...v) || 1; return v.map(x => x / length); };
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const minus = (a, b) => a.map((value, i) => value - b[i]);
  const meshes = [];
  function tube(points, radius, roughness, turn, closed = false) {
    const rings = [], vertices = [], sides = 12;
    points.forEach((point, i) => {
      const before = points[i === 0 ? closed ? points.length - 2 : 0 : i - 1];
      const after = points[i === points.length - 1 ? closed ? 1 : i : i + 1];
      const tangent = normalize(minus(after, before));
      const axis = Math.abs(tangent[2]) < .9 ? [0,0,1] : [0,1,0];
      const n1 = normalize(cross(tangent, axis)), n2 = cross(tangent, n1);
      rings.push(Array.from({ length: sides }, (_, j) => {
        const angle = j / sides * Math.PI * 2;
        const n = n1.map((v, k) => v * Math.cos(angle) + n2[k] * Math.sin(angle));
        return [...point.map((v, k) => v + radius * n[k]), ...n, roughness, turn];
      }));
    });
    for (let i = 0; i < rings.length - 1; i += 1) {
      for (let j = 0; j < sides; j += 1) {
        const next = (j + 1) % sides;
        vertices.push(...rings[i][j], ...rings[i+1][j], ...rings[i][next],
          ...rings[i][next], ...rings[i+1][j], ...rings[i+1][next]);
      }
    }
    meshes.push(...vertices);
  }
  function circle(radius, center, axis = 'z') {
    return Array.from({ length: 65 }, (_, i) => {
      const a = i / 64 * Math.PI * 2, c = Math.cos(a)*radius, s = Math.sin(a)*radius;
      return axis === 'z' ? [center[0]+c,center[1]+s,center[2]] : [center[0]+c,center[1],center[2]+s];
    });
  }
  function cubic(a, b, c, d, steps = 18) {
    return Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps, s = 1-t;
      return a.map((v, k) => s*s*s*v + 3*s*s*t*b[k] + 3*s*t*t*c[k] + t*t*t*d[k]);
    });
  }
  // The upper D-ring stays with the fabric. The cylindrical swivel admits a full turn.
  const ring = [];
  [[13,-69,-90],[13,-61,0],[-13,-61,90],[-13,-69,180]].forEach(([cx,cy,start]) => {
    for (let i=0;i<=12;i+=1) {
      const a=(start+i*90/12)*Math.PI/180;
      ring.push([cx+8*Math.cos(a),cy+8*Math.sin(a),0]);
    }
  });
  ring.push(ring[0]);
  tube(ring, 2.3, .24, 0, true);
  tube([[0,-53,0],[0,-41,0]], 4.3, .18, 0);
  tube(circle(4.2,[0,-51,0],'y'), .9, .08, 0, true);
  tube(circle(4.3,[0,-42,0],'y'), 1.1, .08, 1, true);
  // An open, rounded spring clasp, with a separate gate and its hinge.
  const hook = [
    ...cubic([0,-42,0],[-2,-32,0],[-11,-22,0],[-11,-12,0]),
    ...cubic([-11,-12,0],[-11,2,0],[11,2,0],[11,-12,0]).slice(1),
    ...cubic([11,-12,0],[11,-15,0],[10,-18,0],[9,-20,0],8).slice(1)
  ];
  tube(hook, 2.1, .08, 1);
  tube([[1.1,-37.5,0],[8.9,-20.4,0]], 1.65, .05, 1);
  tube(circle(1.65,[9,-20,1.4]), .6, .1, 1, true);
  // Front and reverse eyelet flanges share the card's local origin and turn.
  tube(circle(8.2,[0,0,1.65]), 1.8, .7, 1, true);
  tube(circle(8.2,[0,0,-1.65]), 1.8, .7, 1, true);
  tube(circle(6.45,[0,0,0]), .75, .8, 1, true);
  function upload(vertices) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    return { buffer, count: vertices.length / 8 };
  }
  solid = upload(meshes);
  function cardMask(width, height, eyeletY) {
    const vertices = [], corners = [
      Math.atan2(-eyeletY,-width/2), Math.atan2(-eyeletY,width/2),
      Math.atan2(height-eyeletY,width/2), Math.atan2(height-eyeletY,-width/2)
    ];
    const angles = [...Array.from({length:96},(_,i)=>i*Math.PI*2/96),
      ...corners.map(a=>(a+Math.PI*2)%(Math.PI*2))].sort((a,b)=>a-b);
    angles.push(angles[0]+Math.PI*2);
    function point(a, z, outer) {
      const dx=Math.cos(a),dy=Math.sin(a);
      const distance=outer ? Math.min(width/2/Math.max(1e-9,Math.abs(dx)),
        (dy<0?eyeletY:height-eyeletY)/Math.max(1e-9,Math.abs(dy))) : 6.3;
      return [dx*distance,dy*distance,z,0,0,z>0?1:-1,.5,1];
    }
    for (const z of [-1.2,1.2]) for(let i=0;i<angles.length-1;i+=1) {
      const a=point(angles[i],z,false),b=point(angles[i],z,true);
      const c=point(angles[i+1],z,false),d=point(angles[i+1],z,true);
      vertices.push(...a,...b,...c,...c,...b,...d);
    }
    return upload(vertices);
  }
  function draw(mesh) {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
    attributes.forEach((attribute, i) => {
      gl.enableVertexAttribArray(attribute);
      gl.vertexAttribPointer(attribute, i === 2 ? 2 : 3, gl.FLOAT, false, 32, [0,12,24][i]);
    });
    gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
  }
  function resize(geometry) {
    if (lost) return;
    const changed = !layout || layout.cardWidth !== geometry.cardWidth || layout.cardHeight !== geometry.cardHeight;
    layout = { ...geometry };
    // Supersampling keeps the narrow chrome highlights smooth on standard-density screens.
    const ratio = 2;
    canvas.width = Math.round(layout.width*ratio);
    canvas.height = Math.round(layout.height*ratio);
    gl.viewport(0,0,canvas.width,canvas.height);
    if (changed) {
      if (occluder) gl.deleteBuffer(occluder.buffer);
      occluder = cardMask(layout.cardWidth,layout.cardHeight,layout.eyeletY);
    }
  }
  function render(pose) {
    if (lost || !layout) return;
    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const rad = Math.PI/180;
    gl.uniform3f(uniforms.uAngles,pose.roll.value*rad,pose.pitch.value*rad,pose.twist.value*rad);
    gl.uniform2f(uniforms.uOffset,pose.x.value,pose.y.value);
    gl.uniform4f(uniforms.uLayout,layout.width,layout.height,layout.pivotY,1500);
    // An invisible depth-only card prevents metal from drawing through its surfaces.
    gl.colorMask(false,false,false,false);
    draw(occluder);
    gl.colorMask(true,true,true,true);
    draw(solid);
    stage.dataset.hardware = 'webgl';
  }
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    lost = true;
    stage.dataset.hardware = 'fallback';
    stage.dispatchEvent(new Event('badge-hardware-change'));
  });
  // A page reload can recreate the renderer; the aligned SVG fallback stays usable meanwhile.
  return { resize, render };
};
