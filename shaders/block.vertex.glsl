attribute vec3 offset;
attribute vec4 data;

uniform float time;

varying vec3 vPos;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vOffset;

varying float vType;
varying float vSide;
varying float vShade;
varying vec3 vColour;

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vNormal = normal;
  vOffset = offset;

  float on = 1.0;

  if (on >= 1.0) {
    vec3 newPosition = position;

    vPos = (modelMatrix * vec4(newPosition, 1.0)).xyz;

    float type = data.x;
    float side = data.y;
    float shade = data.z;
    float colour = data.w;

    // Number of textures per cube
    float sideCount = 8.0;

    // Number block types
    float typeCount = 8.0;

    float isSide = 0.0;

    if (side == 0.0 || side == 1.0 || side == 4.0 || side == 5.0) {
      isSide = 1.0;
    }
    
    vec2 uv2 = uv;
    
    uv2 = ((uv2 - 0.5) * (0.97)) + 0.5;

    vUv.x = uv2.x * (1.0 / sideCount) + isSide * (1.0 / sideCount);
    vUv.y = uv2.y * (1.0 / typeCount) + type * (1.0 / typeCount);

    /*if (type == 3.0) {
        vPos.y += sin(time / 3.0) / 4.0 - 0.5;
    }*/

    if (type == 4.0) {
        // Webcam uses original coords
        vUv = uv;
    }

    // Rounding hack...
    vSide = side + 0.1;
    vType = type + 0.1;
    vShade = shade + 0.1;

    vec3 hsl = vec3(colour / 255.0, 1.0, 0.5);
    vColour = hsv2rgb(hsl);

    /*if (type == 1.0) {
        //vPos.x += sin((vPos.y + vPos.x) / 4.0 + time / 3.0) * 20.0;
        vPos.x += sin((vPos.z + vPos.x + vPos.y) / 4.0 + time / 3.0) * 1.0;
        vPos.y += cos((vPos.z + vPos.x + vPos.y) / 4.0 + time / 3.0) * 1.0;
        vPos.z += sin((vPos.z + vPos.x + vPos.y) / 4.0 + time / 3.0) * 1.0;
    }*/
    
    if (type == 1.0) {
        //vPos.y += sin(vPos.x * vPos.z + time / 10.0);
    }

    gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0);
  } else {
    gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
  }
}
