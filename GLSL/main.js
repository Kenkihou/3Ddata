import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// シーン、カメラ、レンダラーのセットアップ
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('app').appendChild(renderer.domElement);

camera.position.set(-5, 0, 0); 
//camera.lookAt(100, 100, 0);

// コントロール
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false; 
controls.dampingFactor = 0.05;
controls.maxPolarAngle = 75 * (Math.PI / 180); // 90度をラジアンに変換
controls.maxDistance = 20; 
controls.minDistance = 3; // 必要に応じて、ターゲットに近づける最小距離も設定できます

// 光源
const ambientLight = new THREE.AmbientLight(0x404040, 3);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(50, 100, 50);
directionalLight.castShadow = true;
scene.add(directionalLight);

// GLSLシェーダーの読み込み
let vertexShader, fragmentShader;
Promise.all([
    fetch('./shaders/vertex.vert').then(res => res.text()),
    fetch('./shaders/fragment.frag').then(res => res.text())
]).then(([vertText, fragText]) => {
    vertexShader = vertText;
    fragmentShader = fragText;
    loadModels(); // シェーダーが読み込まれてからモデルをロード
}).catch(error => {
    console.error('Error loading shaders:', error);
});

let customMaterial;
let measuredHeTexture; 
let buildingAttributesData = {}; // JSONから読み込んだ属性データとmaxObjectIdを格納するオブジェクト

// 属性JSONとGLBモデルのロード
async function loadModels() {
    try {
        const response = await fetch('./assets/building_attributes.json');
        buildingAttributesData = await response.json(); 
        const allMeshAttributes = buildingAttributesData.attributes; // すべてのメッシュ属性配列
        const maxObjectId = buildingAttributesData.maxObjectId; 

        console.log('All mesh attributes loaded:', allMeshAttributes);
        console.log('Max Object ID from JSON:', maxObjectId);

        const maxObjects = allMeshAttributes.length; // すべてのオブジェクト数
        const textureWidth = Math.ceil(Math.sqrt(maxObjects));
        const textureHeight = Math.ceil(maxObjects / textureWidth);

        const data = new Float32Array(textureWidth * textureHeight * 4); 

        for(let i = 0; i < data.length; i++) {
            data[i] = 0.0;
        }

        allMeshAttributes.forEach((attr) => {
            const objectId = attr.objectId;
            const x_coord = objectId % textureWidth;
            const y_coord = Math.floor(objectId / textureWidth);

            const index_in_data = (y_coord * textureWidth + x_coord) * 4; 

            data[index_in_data] = attr.measuredHe; 
        });

        measuredHeTexture = new THREE.DataTexture(
            data,
            textureWidth,
            textureHeight,
            THREE.RGBAFormat,
            THREE.FloatType
        );
        measuredHeTexture.needsUpdate = true;
        measuredHeTexture.flipY = false;

        console.log('measuredHe texture created:', measuredHeTexture);

    } catch (error) {
        console.error('Error loading mesh attributes:', error);
        return;
    }

    const loader = new GLTFLoader();
    loader.load(
        './assets/buildings.glb',
        (gltf) => {
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    console.log("Processing mesh:", child.name);
                    // 今回は全てのメッシュに texcoord_4 (ObjectIdUV) が付与されるので、
                    // 必ず customMaterial を適用するように変更します。
                    // child.geometry.attributes.texcoord_4 の有無での分岐は削除します。

                    if (!customMaterial) { // マテリアルがまだ作成されていなければ作成
                        customMaterial = new THREE.ShaderMaterial({
                            vertexShader: vertexShader,
                            fragmentShader: fragmentShader,
                            uniforms: {
                                uColorMode: { value: 0 },
                                uMeasuredHeTexture: { value: measuredHeTexture },
                                uTextureSize: { value: new THREE.Vector2(measuredHeTexture.image.width, measuredHeTexture.image.height) },
                                uResetColor: { value: new THREE.Color(0xcccccc) }, // デフォルトのリセット色
                                uColor10mUnder: { value: new THREE.Color(0xff0000) }, // 10m以下 (赤)
                                uColor10m15m: { value: new THREE.Color(0x0000ff) },   // 10m超15m以下 (青)
                                uColor15mOver: { value: new THREE.Color(0x00ff00) },  // 15m超 (緑)
                                uMaxObjectIdValue: { value: buildingAttributesData.maxObjectId } 
                            },
                            side: THREE.DoubleSide // 両面描画
                        });
                        console.log("Custom material initialized.");
                    }
                    child.material = customMaterial; // すべてのメッシュにカスタムマテリアルを適用
                    console.log('Applied custom material to mesh:', child.name);
                    
                    // 位置調整 (変更なし)
                    const bbox = new THREE.Box3().setFromObject(child);
                    const center = new THREE.Vector3();
                    bbox.getCenter(center);
                    child.position.sub(center); 
                }
            });
            scene.add(gltf.scene);

            const bboxScene = new THREE.Box3().setFromObject(gltf.scene);
            const centerScene = new THREE.Vector3();
            bboxScene.getCenter(centerScene);
        camera.lookAt(centerScene.x, centerScene.y, centerScene.z);
        // controls.target もモデル全体の中心に設定
        controls.target.copy(centerScene);

            console.log('GLB model loaded.');
            animate(); 
        },
        (xhr) => {
            //console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
            console.error('Error loading GLB model:', error);
        }
    );
}

// ボタンイベントリスナー (変更なし)
document.getElementById('btn-reset').addEventListener('click', () => {
    if (customMaterial) customMaterial.uniforms.uColorMode.value = 0;
});
document.getElementById('btn-10m-under').addEventListener('click', () => {
    if (customMaterial) customMaterial.uniforms.uColorMode.value = 1;
});
document.getElementById('btn-10m-15m').addEventListener('click', () => {
    if (customMaterial) customMaterial.uniforms.uColorMode.value = 2;
});
document.getElementById('btn-15m-over').addEventListener('click', () => {
    if (customMaterial) customMaterial.uniforms.uColorMode.value = 3;
});

// アニメーションループ (変更なし)
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// ウィンドウリサイズ対応 (変更なし)
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});