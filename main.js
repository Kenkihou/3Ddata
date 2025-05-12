import * as THREE from "three";
//import { FBXLoader } from 'https://unpkg.com/three@0.164.1/examples/jsm/loaders/FBXLoader.js'; // パスを確認
import {OrbitControls} from 'https://unpkg.com/three@0.164.1/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.164.1/examples/jsm/loaders/GLTFLoader.js'; // パスを確認

let scene, camera, renderer, mixer, clock;

init();
animate();

function init() {
  // シーン、カメラ、レンダラー、ライト等の基本的な設定（省略）
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeeeeee); // 背景色設定例
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
  const canvas = document.querySelector('#stage'); // HTML内のcanvas要素を取得
  renderer = new THREE.WebGLRenderer({
    canvas: canvas, // 取得したcanvas要素をレンダラーに渡す
    antialias: true
  });
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.outputEncoding = THREE.sRGBEncoding; // 色空間を正しく扱うため
  document.body.appendChild( renderer.domElement );

  // ライトの設定（例）
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  // カメラの位置
  camera.position.set(0, 1.5, 3);

  // OrbitControls（任意）
  const controls = new OrbitControls( camera, renderer.domElement );
      // --- ズーム距離の制限を設定 ---
      controls.minDistance = 5;  // カメラがターゲットに近づける最小距離 (例: 5)
      controls.maxDistance = 10; // カメラがターゲットから遠ざかれる最大距離 (例: 20)
      // --------------------------
  controls.target.set(0, 1, 0); // 注視点を調整
  controls.update();

  // 時間管理用Clock
  clock = new THREE.Clock();

  // GLTFLoaderのインスタンス化
  const loader = new GLTFLoader();

  // GLBファイルの読み込み
  loader.load(
      'dragon.glb', // あなたのGLBファイルへのパス
      ( gltf ) => {
          // 読み込み成功時の処理
          const model = gltf.scene;
          scene.add( model );

          // AnimationMixerを作成
          mixer = new THREE.AnimationMixer( model );

          // ファイル内のすべてのアニメーションを再生（または特定のアニメーションを選択）
          if (gltf.animations && gltf.animations.length) {
              gltf.animations.forEach( ( clip ) => {
                  mixer.clipAction( clip ).play();
              } );
              // もし特定のアニメーションだけ再生したい場合：
              // const action = mixer.clipAction( gltf.animations[0] ); // 例: 0番目のアニメーション
              // action.play();
          } else {
               console.warn('GLB file contains no animations.');
          }

          console.log('GLB loaded successfully!');

      },
      ( xhr ) => {
          // 読み込み進捗（任意）
          console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      },
      ( error ) => {
          // 読み込みエラー時の処理
          console.error( 'An error happened during loading GLB:', error );
      }
  );

  // ウィンドウリサイズ対応（任意）
  window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame( animate );

  // アニメーションミキサーの更新
  const delta = clock.getDelta(); // 前フレームからの経過時間を取得
  if ( mixer ) {
      mixer.update( delta );
  }

  // レンダリング
  renderer.render( scene, camera );
}