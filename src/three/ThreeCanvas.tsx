import React from "react";
import * as THREE from "three";
import CEAssetLoader from "./CEAssetLoader";
import ThreeAsset from "./ThreeAsset";
import Stats from "stats.js";

class Three extends React.Component {
  scene: THREE.Scene = new THREE.Scene();
  renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({
    antialias: true
  });
  rendererMount!: HTMLDivElement;

  camera: THREE.Camera = new THREE.Camera();
  clock: THREE.Clock = new THREE.Clock();

  mixer!: THREE.AnimationMixer;

  stats = new Stats();
  statsMount!: HTMLDivElement;

  async componentDidMount() {
    this.rendererMount.appendChild(this.renderer.domElement);

    this.onWindowResize();
    window.addEventListener("resize", this.onWindowResize.bind(this));

    this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    this.statsMount.appendChild(this.stats.dom);

    const assetLoader = new CEAssetLoader("assets/Quarterback Pass.ceasset");
    const asset = await assetLoader.load();
    this.addMeshesToScene(asset.meshes);
    this.addSkeletonHelperToScene(asset.skeleton);
    this.playAnimation(asset, 1);

    this.animate();
  }

  onWindowResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.camera.position.x = 0;
    this.camera.position.y = 100;
    this.camera.position.z = 500;
  }

  addMeshesToScene(meshes: THREE.SkinnedMesh[]) {
    meshes.forEach(mesh => {
      this.scene.add(mesh);
    });
  }

  addSkeletonHelperToScene(skeleton: THREE.Skeleton) {
    const rootBone = skeleton.bones[0];
    const skeletonHelper = new THREE.SkeletonHelper(rootBone);
    this.scene.add(skeletonHelper);
  }

  playAnimation(asset: ThreeAsset, animationIndex: number) {
    const rootBone = asset.skeleton.bones[0];
    this.mixer = new THREE.AnimationMixer(rootBone);
    const action = this.mixer.clipAction(asset.animations[animationIndex]);
    action.play();
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
