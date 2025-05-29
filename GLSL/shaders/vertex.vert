// shaders/vertex.vert

// 組み込み変数 (position, normal, modelMatrix, viewMatrix, projectionMatrix) はThree.jsが自動的に提供するため、ここでは宣言しない。

// objectId を格納したUVマップがGLTFでは 'TEXCOORD_4' としてエクスポートされ、
// Three.jsでもその名前 'texcoord_4' のまま読み込まれていると仮定
attribute vec2 texcoord_4; // ★★★ここを texcoord_4 に変更★★★

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vObjectIdUV;

void main() {
    vNormal = normal; 
    vPosition = vec3(modelMatrix * vec4(position, 1.0)); 
    
    vObjectIdUV = texcoord_4; // ★★★ここも texcoord_4 に変更して、ObjectIdUVのデータを渡す★★★
    
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); 
}