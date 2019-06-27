import React from "react";
import * as THREE from "three";

class Three extends React.Component {
  scene: THREE.Scene = new THREE.Scene();
  renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();

  camera: THREE.Camera;
  cube: THREE.Mesh;

  mount: any; // TODO: ???

  constructor(props: any) {
    super(props);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.cube = new THREE.Mesh(geometry, material);
  }

  componentDidMount(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene.add(this.cube);

    this.camera.position.z = 5;

    this.mount.appendChild(this.renderer.domElement);

    this.animate();
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    this.cube.rotation.x += 0.01;
    this.cube.rotation.y += 0.01;

    this.renderer.render(this.scene, this.camera);
  }

  render() {
    return <div ref={ref => (this.mount = ref)} />;
  }
}

export default Three;
