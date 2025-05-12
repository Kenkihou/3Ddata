import * as THREE from "three"; // 最新版を使う場合、importmapなどで管理推奨
import { OrbitControls } from 'https://unpkg.com/three@0.164.1/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'https://unpkg.com/three@0.164.1/examples/jsm/controls/TransformControls.js'; // パスを確認
import { GLTFLoader } from 'https://unpkg.com/three@0.164.1/examples/jsm/loaders/GLTFLoader.js'; // パスを確認
// WebGPURenderer をインポート
import WebGPURenderer from 'https://unpkg.com/three@0.164.1/examples/jsm/renderers/webgpu/WebGPURenderer.js';
//import { DRACOLoader } from 'https://unpkg.com/three@0.142.0/examples/jsm/loaders/DRACOLoader.js';

// コード全体を async 関数で囲む
async function init() {

//////////レンダラーを作成///////////////////
const width = 1000; // 描画領域を指定
const height =800;

    // WebGPURenderer を作成
const renderer = new WebGPURenderer({
  canvas: document.querySelector('#stage'), //引数にはHTMLコード上に記載したcanvas要素の参照を渡す
  antialias: true // WebGPU backend でアンチエイリアスを試みる
    });
//renderer.setPixelRatio(window.devicePixelRatio); // スマホで見てもぼやけないようにする
//renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
renderer.setSize(width, height);
// renderer.setClearColor(0xefefef); // 代わりに Scene.background を使用

    // ★ レンダラーの非同期初期化
    try {
      await renderer.init();
      console.log("WebGPURenderer initialized successfully.");
  } catch (error) {
      console.error("Failed to initialize WebGPURenderer:", error);
      // ここでユーザーにエラーメッセージを表示したり、
      // WebGLRendererにフォールバックする処理を入れたりできます。
      alert("WebGPUの初期化に失敗しました。お使いのブラウザがWebGPUをサポートしていない可能性があります。");
      return; // 初期化失敗時は以降の処理を中断
  }

//////////ステージを作成///////////////////
const scene = new THREE.Scene();
// ★ 背景色の設定
scene.background = new THREE.Color(0xefefef);

//////////カメラを作成///////////////////
const initialCameraPosition = new THREE.Vector3(-180, 180, -180); // ★ 初期カメラ位置を保存
const camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);// near/far を調整
//camera.near = 50;
//camera.far = 5000;
camera.position.copy(initialCameraPosition); // ★ 保存した位置で初期化

// カメラコントローラーを作成
const controls = new OrbitControls(camera, renderer.domElement);
const initialControlsTarget = new THREE.Vector3(); // ★ 初期ターゲット位置（原点）を保存
controls.target.copy(initialControlsTarget);       // ★ 保存したターゲットで初期化
controls.update(); // ★ 初期ターゲットを反映させる
// controls.enableDamping = true; // スムーズな動き (任意)
// controls.dampingFactor = 0.05; // ダンピング係数 (任意)

// GLTF ローダーの作成
const gltfLoader = new GLTFLoader();

// GLB ファイルのパス
//const glbFilePath = '/R070504_7柱はり四方差し.glb'; //  GLB ファイルのパスを入力（Live server用）
const glbFilePath = 'R070504_7柱はり四方差し.glb'; //  GLB ファイルのパスを入力（実server用）

// TransformControls の変数をグローバルスコープで宣言
let transControls;
let transControls2;
let transControlsOu;
let transControlsOu2;
let transControlsShachi;
let transControlsShachi2;
let gltfScene; // gltf.scene を格納する変数

// Raycaster とマウスベクトルを追加
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// column2 と column2_wire を格納する変数を追加
let column2Object = null;
let column2WireObject = null;

// ★ 初期状態を保存するための変数を追加
const initialObjectPositions = {};
const controlledObjects = {}; // TransformControlsで操作するオブジェクトを管理

// GLB ファイルをロード
    // GLTFLoader のロード処理は非同期なので、Promise化すると async/await と組み合わせやすい
    function loadGLB(url) {
      return new Promise((resolve, reject) => {
          gltfLoader.load(url, resolve, undefined, reject);
      });
  }

  try {
      const gltf = await loadGLB(glbFilePath);
      gltfScene = gltf.scene;
      gltfScene.scale.set(20, 20, 20);
      scene.add(gltfScene);

      // --- column2 と column2_wire を取得し、初期表示を設定 ---
    column2Object = gltfScene.getObjectByName('column2');
    column2WireObject = gltfScene.getObjectByName('column2_wire');

    if (column2Object) {
       // 初期状態: column2 を表示
       column2Object.visible = true;
       console.log("column2 found and set to visible.");
    } else {
       console.warn('column2 という名前のオブジェクトが見つかりませんでした。');
    }
    if (column2WireObject) {
        // 初期状態: column2_wire を非表示
        column2WireObject.visible = false;
        console.log("column2_wire found and set to hidden.");
    } else {
        console.warn('column2_wire という名前のオブジェクトが見つかりませんでした。');
    }
  // --- ここまで追加 ---

    // --- TransformControlsを設定する関数 ---
    function setupTransformControls(objectName, axisToShow, positionLimits) {
      const targetObject = gltf.scene.getObjectByName(objectName);
      if (targetObject) {
          // ★ 初期位置を保存
          initialObjectPositions[objectName] = targetObject.position.clone();
          // ★ 操作対象オブジェクトとして記録
          controlledObjects[objectName] = targetObject;

          const tc = new TransformControls(camera, renderer.domElement);
          tc.showX = (axisToShow === 'x');
          tc.showY = (axisToShow === 'y');
          tc.showZ = (axisToShow === 'z');
          //tc.addEventListener('change', tick);
          tc.attach(targetObject);
          tc.setMode("translate");
          tc.addEventListener('dragging-changed', event => {
              controls.enabled = !event.value;
              if (!event.value) { // ドラッグ終了時
                  if (axisToShow === 'x') {
                      targetObject.position.x = Math.max(positionLimits.min, Math.min(positionLimits.max, targetObject.position.x));
                  } else if (axisToShow === 'y') {
                      targetObject.position.y = Math.max(positionLimits.min, Math.min(positionLimits.max, targetObject.position.y));
                  } else if (axisToShow === 'z') {
                       targetObject.position.z = Math.max(positionLimits.min, Math.min(positionLimits.max, targetObject.position.z));
                  }
              }
          });
          scene.add(tc);
          tc.setSize(0.5);
          return tc; // 作成したTransformControlsを返す
      } else {
          console.warn(`${objectName} という名前のオブジェクトが見つかりませんでした。`);
          return null;
      }
  }

  // --- 各オブジェクトにTransformControlsを設定 ---
  transControls = setupTransformControls('beam_totsu1', 'z', { min: 0.9, max: 5.8 });
  transControls2 = setupTransformControls('beam_totsu2', 'x', { min: 0.675, max: 5.675 });
  transControlsOu = setupTransformControls('beam_ou1', 'z', { min: -2.4, max: -0.9 });
  transControlsOu2 = setupTransformControls('beam_ou2', 'x', { min: -2.175, max: -0.675 });
  transControlsShachi = setupTransformControls('shachi1', 'y', { min: 1.2, max: 2.691 });
  transControlsShachi2 = setupTransformControls('shachi2', 'y', { min: -2.691, max: -1.2 }); // 最小/最大を修正

  // --- ダブルクリックイベントリスナーを追加 ---
  renderer.domElement.addEventListener('dblclick', onDoubleClick, false);

  } catch (error) {
    console.error('GLBファイルのロードまたは設定に失敗しました:', error);
    return; // エラー時は中断
}

//////////光源（light）を作成///////////////////
const ambientLight = new THREE.AmbientLight(0x404040, 0.4); // 環境光を追加 (全体を明るくする)
scene.add(ambientLight);

const light = new THREE.DirectionalLight(0xFFFFFF); // 平行光源
light.intensity = 1; // 光の強さを倍に
light.position.set(100,80, 60); // 光源の位置を指定
scene.add(light); // シーンに追加
    //ライトを表示
    const lightHelper = new THREE.DirectionalLightHelper(light,5);
    //scene.add(lightHelper);
const light2 = new THREE.DirectionalLight(0xFFFFFF); // 平行光源
light2.intensity = 2; // 光の強さを倍に
light2.position.set(-80,100, -60); // 光源の位置を指定
scene.add(light2); // シーンに追加
    //ライトを表示
    const lightHelper2 = new THREE.DirectionalLightHelper(light2,5);
    //scene.add(lightHelper2);
const light3 = new THREE.DirectionalLight(0xFFFFFF); // 平行光源
light3.intensity = 1.6 // 光の強さを倍に
light3.position.set(60,-80, 100); // 光源の位置を指定
scene.add(light3); // シーンに追加
        //ライトを表示
        const lightHelper3 = new THREE.DirectionalLightHelper(light3,5);
        //scene.add(lightHelper3);

    ////////// レンダリングループ //////////////
    // WebGPUでは renderer.setAnimationLoop を使うのが一般的
    renderer.setAnimationLoop(() => {
      // OrbitControls や他のアニメーション更新
      controls.update(); // enableDamping=true の場合などは特に重要

      // レンダリング
      renderer.render(scene, camera);
      // または非同期版 (より高度な制御が可能だが、通常はrenderで十分)
      // await renderer.renderAsync(scene, camera);
  });


/* // 毎フレーム時に実行されるループイベントです
    function tick() {// レンダリング
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    } */

// 初回のレンダリングループを開始
// tick(); // setAnimationLoop を使うため不要

    // ★ 初期化ボタンのイベントリスナーは init 関数の最後に移動
    const resetButton = document.getElementById('resetButton');
    if (resetButton) {
        resetButton.addEventListener('click', () => resetToInitialState(renderer, scene, camera, controls)); // renderer 等を渡す必要が生じる可能性
    } else {
        console.warn('Reset button with id "resetButton" not found.');
    }

    // ★ resetToInitialState 関数も init 関数内に移動するか、
    //    必要な変数 (renderer, scene, camera など) を引数で渡すように修正
    function resetToInitialState(currentRenderer, currentScene, currentCamera, currentControls) {
        console.log("Resetting to initial state...");

        // 1. カメラとOrbitControlsのリセット
        currentCamera.position.copy(initialCameraPosition);
        currentControls.target.copy(initialControlsTarget);
        currentControls.update();

        // 2. TransformControlsで操作されるオブジェクトの位置をリセット
        for (const objectName in initialObjectPositions) {
            if (controlledObjects[objectName] && initialObjectPositions[objectName]) {
                controlledObjects[objectName].position.copy(initialObjectPositions[objectName]);
            }
        }
        // TransformControlsギズモの更新 (必要であれば)
        /* if (transControls) transControls.update(); ... */

        // 3. column2 と column2_wire の表示状態をリセット
        if (column2Object) column2Object.visible = true;
        if (column2WireObject) column2WireObject.visible = false;
        console.log(`Reset visibility: column2=${column2Object?.visible}, column2_wire=${column2WireObject?.visible}`);

        // 4. レンダリングを強制的に更新 (setAnimationLoopを使っている場合、通常は不要だが念のため)
        currentRenderer.render(currentScene, currentCamera);
    }

    // ★ onDoubleClick 関数も同様に init 関数内に移動するか、引数を調整
    function onDoubleClick(event) {
    // gltfScene がロードされていない場合は何もしない
    if (!gltfScene || !column2Object || !column2WireObject) return;

    // マウス座標を正規化 (-1 to +1)
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycaster を設定
    raycaster.setFromCamera(mouse, camera);

    // gltfScene 全体の子オブジェクトとの交差を検出 (再帰的に探索)
    const intersects = raycaster.intersectObjects(gltfScene.children, true); // true で再帰的に探索

    if (intersects.length > 0) {
        let clickedObject = intersects[0].object;

        // ↓↓↓★★★ この行を追加またはコメント解除してください ★★★↓↓↓
        let targetColumnFound = false;
        // ↑↑↑★★★ この行を追加またはコメント解除してください ★★★↑↑↑

        // クリックされたオブジェクト、またはその親が 'column' で始まるかチェック
        let currentObject = clickedObject;
        while (currentObject && currentObject !== gltfScene) { // シーンのルートまで探索
            // currentObject.name が定義されているか確認してから startsWith を使用
            if (currentObject.name && currentObject.name.startsWith('column')) {
                targetColumnFound = true; // ← ここで true に設定
                console.log("Double clicked on column related object:", currentObject.name);
                break; // 'column'で始まるオブジェクトが見つかったら探索終了
            }
            currentObject = currentObject.parent; // 親オブジェクトへ移動
        }

        // 'column' で始まるオブジェクトがクリックされた場合
        if (targetColumnFound) { // ← ここで参照する前に上記で宣言が必要
            // column2 と column2_wire の表示/非表示を切り替える
            column2Object.visible = !column2Object.visible;
            column2WireObject.visible = !column2WireObject.visible;

            console.log(`column2 visibility: ${column2Object.visible}, column2_wire visibility: ${column2WireObject.visible}`);

            // ★ 状態変更を即座に反映させるために再描画
            //    (setAnimationLoopを使っている場合でも、クリック直後に反映させたい場合)
            renderer.render(scene, camera);
        }
    }
}
    renderer.domElement.addEventListener('dblclick', onDoubleClick, false); // イベントリスナー設定

} // init 関数の終わり

// 初期化処理を実行
init().catch(error => {
    console.error("Initialization failed:", error);
});