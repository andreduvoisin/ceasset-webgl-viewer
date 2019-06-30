import React from "react";
import * as THREE from "three";
import CEAssetLoader from "./three/CEAssetLoader";

class Three extends React.Component {
  scene: THREE.Scene = new THREE.Scene();
  renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();

  camera: THREE.Camera = new THREE.Camera();
  clock: THREE.Clock = new THREE.Clock();

  mixer!: THREE.AnimationMixer;

  mount!: HTMLDivElement;

  async componentDidMount() {
    this.onWindowResize();
    window.addEventListener("resize", this.onWindowResize.bind(this));

    const assetLoader = new CEAssetLoader("assets/Quarterback Pass.ceasset");
    const asset = await assetLoader.load();

    asset.meshes.forEach(mesh => {
      this.scene.add(mesh);
    });

    const rootBone = asset.skeleton.bones[0];
    this.mixer = new THREE.AnimationMixer(rootBone);
    const action = this.mixer.clipAction(asset.animations[1]);
    action.play();

    const skeletonHelper = new THREE.SkeletonHelper(rootBone);
    this.scene.add(skeletonHelper);

    this.mount.appendChild(this.renderer.domElement);

    this.animate();
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();
    this.mixer.update(deltaTime);

    this.renderer.render(this.scene, this.camera);
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
    this.camera.position.z = 200;
  }

  render() {
    return (
      <div
        ref={ref => {
          if (ref != null) {
            this.mount = ref;
          }
        }}
      />
    );
  }
}

export default Three;
