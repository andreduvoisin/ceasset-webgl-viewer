import React from "react";
import * as THREE from "three";
import CEAssetLoader from "./CEAssetLoader";
import ThreeAsset from "./ThreeAsset";
import Stats from "stats.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

class Three extends React.Component {
  scene = new THREE.Scene();
  renderer!: THREE.WebGLRenderer;
  rendererMount!: HTMLDivElement;

  camera!: THREE.PerspectiveCamera;
  clock = new THREE.Clock();
  controls!: OrbitControls;

  mixer!: THREE.AnimationMixer;

  stats!: Stats;
  statsMount!: HTMLDivElement;

  async componentDidMount() {
    this.initializeRenderer();
    this.initializeCamera();
    this.initializeOrbitControls();
    this.initializeStats();

    const assetLoader = new CEAssetLoader("assets/Quarterback Pass.ceasset");
    const asset = await assetLoader.load();
    this.addMeshesToScene(asset.meshes);
    this.playAnimation(asset, 1);

    this.addSkeletonHelperToScene(asset.skeleton);
    this.addGridHelperToScene();

    window.addEventListener("resize", this.onWindowResize.bind(this));

    this.animate();
  }

  initializeRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.rendererMount.appendChild(this.renderer.domElement);
  }

  initializeCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 100, 300);
  }

  initializeOrbitControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 100, 0);
    this.controls.update();
  }

  initializeStats() {
    this.stats = new Stats();
    this.stats.showPanel(0);
    this.statsMount.appendChild(this.stats.dom);
  }

  onWindowResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
  }

  addMeshesToScene(meshes: THREE.SkinnedMesh[]) {
    meshes.forEach(mesh => {
      this.scene.add(mesh);
    });
  }

  playAnimation(asset: ThreeAsset, animationIndex: number) {
    const rootBone = asset.skeleton.bones[0];
    this.mixer = new THREE.AnimationMixer(rootBone);
    const action = this.mixer.clipAction(asset.animations[animationIndex]);
    action.play();
  }

  addSkeletonHelperToScene(skeleton: THREE.Skeleton) {
    const rootBone = skeleton.bones[0];
    const skeletonHelper = new THREE.SkeletonHelper(rootBone);
    this.scene.add(skeletonHelper);
  }

  addGridHelperToScene() {
    const gridHelper = new THREE.GridHelper(1000, 10);
    this.scene.add(gridHelper);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    this.stats.begin();

    const deltaTime = this.clock.getDelta();
    this.mixer.update(deltaTime * this.mixer.timeScale);

    this.renderer.render(this.scene, this.camera);

    this.stats.end();
  }

  render() {
    return (
      <>
        <div
          ref={ref => {
            if (ref != null) {
              this.statsMount = ref;
            }
          }}
        />
        <div
          ref={ref => {
            if (ref != null) {
              this.rendererMount = ref;
            }
          }}
        />
      </>
    );
  }
}

export default Three;
