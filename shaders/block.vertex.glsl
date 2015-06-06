attribute vec3 offset;
attribute float data;

uniform float time;

varying vec3 vPos;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vOffset;

varying float vType;
varying float vSide;
varying float vShade;

void main() {
  vNormal = normal;
  vOffset = offset;

  float on = 1.0;

  if (on >= 1.0) {
    vec3 newPosition = position;

    vPos = (modelMatrix * vec4(newPosition, 1.0)).xyz;

    float type = floor(mod(data, 256.0));
    float side = floor(mod(data / 256.0, 256.0));
    float shade = floor(data / 65536.0);

    // Number of textures per cube
    float sideCount = 8.0;

    // Number block types
    float typeCount = 8.0;

    float isSide = 0.0;

    if (side == 0.0 || side == 1.0 || side == 4.0 || side == 5.0) {
      isSide = 1.0;
    }

    vUv.x = uv.x * (1.0 / sideCount) + isSide * (1.0 / sideCount);
    vUv.y = uv.y * (1.0 / typeCount) + type * (1.0 / typeCount);

    if (type == 3.0) {
        vPos.y += sin(time / 3.0) / 4.0 - 0.5;
    }

    if (type == 4.0) {
        // Webcam uses original coords
        vUv = uv;
    }

    vSide = side + 0.1;
    vType = type + 0.1;
    vShade = shade + 0.1;

    /*if (type == 1.0) {
        //vPos.x += sin((vPos.y + vPos.x) / 4.0 + time / 3.0) * 20.0;
        vPos.x += sin((vPos.z + vPos.x + vPos.y) / 4.0 + time / 3.0) * 5.0;
        vPos.y += cos((vPos.z + vPos.x + vPos.y) / 4.0 + time / 3.0) * 5.0;
        vPos.z += sin((vPos.z + vPos.x + vPos.y) / 4.0 + time / 3.0) * 5.0;
    }*/

    gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0);
  } else {
    gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
  }
}
