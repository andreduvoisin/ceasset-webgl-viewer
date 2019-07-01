import React from "react";
import * as THREE from "three";
import CEAssetLoader from "./CEAssetLoader";
import ThreeAsset from "./ThreeAsset";
import Stats from "stats.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as dat from "dat.gui";

class Three extends React.Component {
  scene = new THREE.Scene();
  renderer!: THREE.WebGLRenderer;
  rendererMount!: HTMLDivElement;

  camera!: THREE.PerspectiveCamera;
  clock = new THREE.Clock();
  controls!: OrbitControls;

  assets: { [name: string]: ThreeAsset } = {};

  skeletonHelper!: THREE.SkeletonHelper;

  mixer!: THREE.AnimationMixer;

  // TODO: I'm sure there's a more idiomatic React way to use dat.gui.
  gui!: dat.GUI;

  modelNames = ["Quarterback Pass", "Thriller Part 2", "Zombie Stand Up"];
  previousModel = this.modelNames[1];
  animationIndex = 0;
  params = {
    enableMesh: true,
    enableSkeleton: false,
    model: this.previousModel
  };

  stats!: Stats;
  statsMount!: HTMLDivElement;

  async componentDidMount() {
    this.initializeRenderer();
    this.initializeCamera();
    this.initializeOrbitControls();
    this.initializeGui();
    this.initializeStats();

    await this.loadAllAssets();
    this.addMeshesToScene();
    this.playAnimation(this.animationIndex);

    this.addSkeletonHelperToScene();
    this.addGridHelperToScene();

    this.enableMesh(this.params.enableMesh);
    this.enableSkeleton(this.params.enableSkeleton);

    window.addEventListener("resize", this.onWindowResize.bind(this));

    await this.animate();
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
      10000
    );
    this.camera.position.set(0, 200, 650);
  }

  initializeOrbitControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 100, 0);
    this.controls.update();
  }

  initializeGui() {
    this.gui = new dat.GUI();

    this.gui
      .add(this.params, "enableMesh")
      .onFinishChange(this.enableMesh.bind(this));

    this.gui
      .add(this.params, "enableSkeleton")
      .onFinishChange(this.enableSkeleton.bind(this));

    this.gui
      .add(this.params, "model", this.modelNames)
      .onFinishChange(this.changeModel.bind(this));
  }

  enableMesh(enabled: boolean) {
    this.assets[this.params.model].meshes.forEach(mesh => {
      mesh.visible = enabled;
    });
  }

  enableSkeleton(enabled: boolean) {
    this.skeletonHelper.visible = enabled;
  }

  changeModel(newModelName: string) {
    this.removeSkeletonHelperFromScene();
    this.addSkeletonHelperToScene();

    this.stopAnimation(this.animationIndex);
    this.resetAnimation(this.animationIndex);
    this.playAnimation(this.animationIndex);

    for (const [name, asset] of Object.entries(this.assets)) {
      const visible = name === newModelName && this.params.enableMesh;
      asset.meshes.forEach(mesh => {
        mesh.visible = visible;
      });
    }

    this.previousModel = newModelName;
  }

  initializeStats() {
    this.stats = new Stats();
    this.stats.showPanel(0);
    this.statsMount.appendChild(this.stats.dom);
  }

  async loadAllAssets() {
    const promises: Promise<void>[] = [];
    this.modelNames.forEach(choice => {
      promises.push(this.loadAsset(choice));
    });
    await Promise.all(promises);
  }

  async loadAsset(name: string) {
    if (this.assets[name] !== undefined) {
      return;
    }

    const assetLoader = new CEAssetLoader(`assets/${name}.ceasset`);
    this.assets[name] = await assetLoader.load();
  }

  onWindowResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
  }

  addMeshesToScene() {
    for (const asset of Object.values(this.assets)) {
      asset.meshes.forEach(mesh => {
        mesh.visible = false;
        this.scene.add(mesh);
      });
    }
  }

  playAnimation(animationIndex: number) {
    const rootBone = this.assets[this.params.model].skeleton.bones[0];
    this.mixer = new THREE.AnimationMixer(rootBone);
    const action = this.mixer.clipAction(
      this.assets[this.params.model].animations[animationIndex]
    );
    action.play();
  }

  stopAnimation(animationIndex: number) {
    const action = this.mixer.clipAction(
      this.assets[this.previousModel].animations[animationIndex]
    );
    action.stop();
  }

  resetAnimation(animationIndex: number) {
    const action = this.mixer.clipAction(
      this.assets[this.previousModel].animations[animationIndex]
    );
    action.reset();
  }

  addSkeletonHelperToScene() {
    const rootBone = this.assets[this.params.model].skeleton.bones[0];
    this.skeletonHelper = new THREE.SkeletonHelper(rootBone);
    this.skeletonHelper.visible = this.params.enableSkeleton;
    this.scene.add(this.skeletonHelper);
  }

  removeSkeletonHelperFromScene() {
    this.scene.remove(this.skeletonHelper);
  }

  addGridHelperToScene() {
    const gridHelper = new THREE.GridHelper(1000, 10);
    this.scene.add(gridHelper);
  }

  async animate() {
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
