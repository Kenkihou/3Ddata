// shaders/fragment.frag

uniform int uColorMode;
uniform sampler2D uMeasuredHeTexture;
uniform vec2 uTextureSize;
uniform vec3 uResetColor;
uniform vec3 uColor10mUnder;
uniform vec3 uColor10m15m;
uniform vec3 uColor15mOver;
uniform float uMaxObjectIdValue;

varying vec2 vObjectIdUV;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    // objectId の計算
    int objectId = int(round(vObjectIdUV.x * uMaxObjectIdValue));

    // objectId を 2D テクスチャのUV座標に変換
    float x_coord_pixel = float(objectId % int(uTextureSize.x));
    float y_coord_pixel = floor(float(objectId) / uTextureSize.x);
    
    vec2 texCoord = vec2(
        (x_coord_pixel + 0.5) / uTextureSize.x,
        (y_coord_pixel + 0.5) / uTextureSize.y
    );
    
    vec4 textureData = texture2D(uMeasuredHeTexture, texCoord);
    float measuredHe = textureData.r; // R成分にmeasuredHeを格納

    // 光の計算 (簡単な拡散反射光)
    vec3 lightDirection = normalize(vec3(50.0, 100.0, 50.0) - vPosition); 
    vec3 normal = normalize(vNormal); // 法線を正規化
    float diffuse = max(dot(normal, lightDirection), 0.0) * 0.7 + 0.3; 

    vec3 finalColor = uResetColor; // デフォルト色 (0xcccccc)

    // ★修正点★: measuredHe == 0.0 で地盤面を判定し、特定の色を適用
    // 浮動小数点数の比較は誤差を考慮し、範囲で比較するのが安全です
    if (measuredHe < 0.1 && measuredHe >= 0.0) { // 0に近い値の場合を地盤面とする
        finalColor = vec3(0.3, 0.3, 0.3); // 地盤面は暗めのグレー (RGB: 0.3, 0.3, 0.3)
    } 
    else if (uColorMode == 1) { // 10m以下 (赤)
        if (measuredHe > 0.0 && measuredHe <= 10.0) { // 0超10m以下
            finalColor = uColor10mUnder;
        } else {
            finalColor = uResetColor;
        }
    } else if (uColorMode == 2) { // 10m超15m以下 (青)
        if (measuredHe > 10.0 && measuredHe <= 15.0) {
            finalColor = uColor10m15m;
        } else {
            finalColor = uResetColor;
        }
    } else if (uColorMode == 3) { // 15m超 (緑)
        if (measuredHe > 15.0) {
            finalColor = uColor15mOver;
        } else {
            finalColor = uResetColor;
        }
    }

    gl_FragColor = vec4(finalColor * diffuse, 1.0);
}