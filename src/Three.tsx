import React from "react";
import * as THREE from "three";

class Three extends React.Component {
  scene: THREE.Scene = new THREE.Scene();
  renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();

  camera: THREE.Camera = new THREE.Camera();
  // cube: THREE.Mesh;
  geometry: THREE.Geometry = new THREE.Geometry();
  mesh: THREE.SkinnedMesh = new THREE.SkinnedMesh();
  material: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial();
  skeleton: THREE.Skeleton = new THREE.Skeleton([]);

  mount: any; // TODO: What is this? How do you strongly type it?

  // constructor(props: any) {
  //   super(props);
  //
  //   // const geometry = new THREE.BoxGeometry(1, 1, 1);
  //   // const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  //   // this.cube = new THREE.Mesh(geometry, material);
  // }

  async componentDidMount() {
    this.onWindowResize();
    window.addEventListener("resize", this.onWindowResize.bind(this));

    await this.readFile();

    this.mesh = new THREE.SkinnedMesh(this.geometry, this.material);

    const rootBone = this.skeleton.bones[0];
    this.mesh.add(rootBone);
    this.mesh.bind(this.skeleton);

    this.scene.add(this.mesh);

    this.mount.appendChild(this.renderer.domElement);

    this.animate();
  }

  async readFile() {
    const buffer = await fetch("assets/Quarterback Pass.ceasset").then(result =>
      result.arrayBuffer()
    );

    const dataView = new DataView(buffer);

    if (!this.checkHeader(dataView)) {
      console.log("ceasset: bad header");
      return;
    }

    const littleEndian = true;

    let byteOffset = 8;

    while (byteOffset < dataView.byteLength) {
      const assetType = dataView.getInt32(byteOffset, littleEndian);
      byteOffset += 4;

      let char = 0;

      switch (assetType) {
        case 0: // skeleton
          console.log("skeleton");

          const bones: THREE.Bone[] = [];
          const boneInverses: THREE.Matrix4[] = [];

          // unsigned jointCount;
          const jointCount = dataView.getUint32(byteOffset, littleEndian);
          byteOffset += 4;

          for (let jointIndex = 0; jointIndex < jointCount; ++jointIndex) {
            // glm::mat4 inverseBindPose;
            const elements: number[] = [];
            for (let i = 0; i < 16; ++i) {
              elements.push(dataView.getFloat32(byteOffset, littleEndian));
              byteOffset += 4;
            }
            const inverseBindPose = new THREE.Matrix4();
            inverseBindPose.elements = elements;
            boneInverses.push(inverseBindPose);

            // std::string name;
            char = dataView.getInt8(byteOffset);
            ++byteOffset;
            while (char !== "\0".charCodeAt(0)) {
              char = dataView.getInt8(byteOffset);
              ++byteOffset;
            }

            // short parentIndex;
            const parentIndex = dataView.getInt16(byteOffset, littleEndian);
            byteOffset += 2;

            bones.push(new THREE.Bone());
            if (parentIndex !== -1) {
              bones[parentIndex].add(bones[bones.length - 1]);
            }
          }

          this.skeleton = new THREE.Skeleton(bones, boneInverses);

          break;

        case 1: // mesh
          console.log("mesh");

          // unsigned verticesCount;
          const verticesCount = dataView.getUint32(byteOffset, littleEndian);
          byteOffset += 4;

          // std::vector<Vertex1P1UV4J> m_vertices;
          const uvs: THREE.Vector2[] = [];
          for (
            let vertexIndex = 0;
            vertexIndex < verticesCount;
            ++vertexIndex
          ) {
            // glm::vec3 position;
            const x = dataView.getFloat32(byteOffset, littleEndian);
            byteOffset += 4;
            const y = dataView.getFloat32(byteOffset, littleEndian);
            byteOffset += 4;
            const z = dataView.getFloat32(byteOffset, littleEndian);
            byteOffset += 4;

            this.geometry.vertices.push(new THREE.Vector3(x, y, z));

            // float uv[2];
            const u = dataView.getFloat32(byteOffset, littleEndian);
            byteOffset += 4;
            const v = dataView.getFloat32(byteOffset, littleEndian);
            byteOffset += 4;

            uvs.push(new THREE.Vector2(u, v));

            // uint8_t jointIndices[4];
            const jointIndex0 = dataView.getInt8(byteOffset);
            byteOffset += 1;
            const jointIndex1 = dataView.getInt8(byteOffset);
            byteOffset += 1;
            const jointIndex2 = dataView.getInt8(byteOffset);
            byteOffset += 1;
            const jointIndex3 = dataView.getInt8(byteOffset);
            byteOffset += 1;

            this.geometry.skinIndices.push(
              new THREE.Vector4(
                jointIndex0,
                jointIndex1,
                jointIndex2,
                jointIndex3
              )
            );

            // float jointWeights[3];
            const jointWeight0 = dataView.getFloat32(byteOffset, littleEndian);
            byteOffset += 4;
            const jointWeight1 = dataView.getFloat32(byteOffset, littleEndian);
            byteOffset += 4;
            const jointWeight2 = dataView.getFloat32(byteOffset, littleEndian);
            byteOffset += 4;

            this.geometry.skinWeights.push(
              new THREE.Vector4(
                jointWeight0,
                jointWeight1,
                jointWeight2,
                1 - (jointWeight0 + jointWeight1 + jointWeight2)
              )
            );
          }
          this.geometry.verticesNeedUpdate = true;

          // for (let i = 0; i < uvs.length; i += 3) {}
          // console.log(this.geometry.faceVertexUvs);

          // unsigned indicesCount;
          const indicesCount = dataView.getUint32(byteOffset, littleEndian);
          byteOffset += 4;

          // std::vector<unsigned int> m_indices;
          for (let indexIndex = 0; indexIndex < indicesCount; indexIndex += 3) {
            const a = dataView.getUint32(byteOffset, littleEndian);
            byteOffset += 4;
            const b = dataView.getUint32(byteOffset, littleEndian);
            byteOffset += 4;
            const c = dataView.getUint32(byteOffset, littleEndian);
            byteOffset += 4;

            this.geometry.faces.push(new THREE.Face3(a, b, c));
            this.geometry.faceVertexUvs[0].push([uvs[a], uvs[b], uvs[c]]);
          }
          this.geometry.elementsNeedUpdate = true;
          this.geometry.uvsNeedUpdate = true;

          // std::string m_diffuseMapName;
          char = dataView.getInt8(byteOffset);
          ++byteOffset;
          while (char !== "\0".charCodeAt(0)) {
            char = dataView.getInt8(byteOffset);
            ++byteOffset;
          }

          // std::string m_specularMapName;
          char = dataView.getInt8(byteOffset);
          ++byteOffset;
          while (char !== "\0".charCodeAt(0)) {
            char = dataView.getInt8(byteOffset);
            ++byteOffset;
          }

          // std::string m_normalMapName;
          char = dataView.getInt8(byteOffset);
          ++byteOffset;
          while (char !== "\0".charCodeAt(0)) {
            char = dataView.getInt8(byteOffset);
            ++byteOffset;
          }

          // uint8_t m_diffuseIndex;
          dataView.getInt8(byteOffset);
          ++byteOffset;

          // uint8_t m_specularIndex;
          dataView.getInt8(byteOffset);
          ++byteOffset;

          // uint8_t m_normalIndex;
          dataView.getInt8(byteOffset);
          ++byteOffset;

          break;

        case 2: // animation
          console.log("animation");
          // std::string name;
          char = dataView.getInt8(byteOffset);
          ++byteOffset;
          while (char !== "\0".charCodeAt(0)) {
            char = dataView.getInt8(byteOffset);
            ++byteOffset;
          }

          // std::vector<std::vector<TranslationKey>> translations;
          // unsigned componentsCount;
          let componentsCount = dataView.getUint32(byteOffset, littleEndian);
          byteOffset += 4;
          for (
            let componentsIndex = 0;
            componentsIndex < componentsCount;
            ++componentsIndex
          ) {
            // unsigned keyCount;
            const keyCount = dataView.getUint32(byteOffset, littleEndian);
            byteOffset += 4;

            for (let keyIndex = 0; keyIndex < keyCount; ++keyIndex) {
              // glm::vec3 translation;
              dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;
              dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;
              dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;

              // float time;
              dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;
            }
          }

          // std::vector<std::vector<RotationKey>> rotations;
          // unsigned componentsCount;
          componentsCount = dataView.getUint32(byteOffset, littleEndian);
          byteOffset += 4;
          for (
            let componentsIndex = 0;
            componentsIndex < componentsCount;
            ++componentsIndex
          ) {
            // unsigned keyCount;
            const keyCount = dataView.getUint32(byteOffset, littleEndian);
            byteOffset += 4;

            for (let keyIndex = 0; keyIndex < keyCount; ++keyIndex) {
              // glm::quat rotation;
              dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;
              dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;
              dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;
              dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;

              // float time;
              dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;
            }
          }

          // std::vector<std::vector<ScaleKey>> scales;
          // unsigned componentsCount;
          componentsCount = dataView.getUint32(byteOffset, littleEndian);
          byteOffset += 4;
          for (
            let componentsIndex = 0;
            componentsIndex < componentsCount;
            ++componentsIndex
          ) {
            // unsigned keyCount;
            const keyCount = dataView.getUint32(byteOffset, littleEndian);
            byteOffset += 4;

            for (let keyIndex = 0; keyIndex < keyCount; ++keyIndex) {
              // glm::vec3 scale;
              dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;
              dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;
              dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;

              // float time;
              dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;
            }
          }

          // float duration;
          dataView.getFloat32(byteOffset, littleEndian);
          byteOffset += 4;

          break;

        case 3: // texture
          console.log("texture");

          // int width;
          const width = dataView.getInt32(byteOffset, littleEndian);
          byteOffset += 4;
          // int height;
          const height = dataView.getInt32(byteOffset, littleEndian);
          byteOffset += 4;
          // int channels;
          const channels = dataView.getInt32(byteOffset, littleEndian);
          byteOffset += 4;

          // std::vector<std::byte> data;
          const size = width * height * channels;
          const data = new Uint8Array(size);
          for (let i = 0; i < size; ++i) {
            data[i] = dataView.getUint8(byteOffset);
            ++byteOffset;
          }

          const texture = new THREE.DataTexture(
            data,
            width,
            height,
            channels === 3 ? THREE.RGBFormat : THREE.RGBAFormat
          );
          // texture.wrapS = THREE.RepeatWrapping;
          // texture.wrapT = THREE.RepeatWrapping;
          // texture.minFilter = THREE.LinearMipMapLinearFilter; // TODO: This filter breaks WebGL.
          // texture.magFilter = THREE.LinearFilter;
          texture.needsUpdate = true;

          // this.material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red material.
          this.material = new THREE.MeshBasicMaterial({
            map: texture,
            skinning: true
          });

          break;
      }
    }
  }

  checkHeader(dataView: DataView): boolean {
    return (
      dataView.getInt8(0) === "C".charCodeAt(0) &&
      dataView.getInt8(1) === "E".charCodeAt(0) &&
      dataView.getInt8(2) === "A".charCodeAt(0) &&
      dataView.getInt8(3) === "S".charCodeAt(0) &&
      dataView.getInt8(4) === "S".charCodeAt(0) &&
      dataView.getInt8(5) === "E".charCodeAt(0) &&
      dataView.getInt8(6) === "T".charCodeAt(0) &&
      dataView.getInt8(7) === "\0".charCodeAt(0)
    );
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    // this.rotateCube();

    this.renderer.render(this.scene, this.camera);
  }

  // rotateCube() {
  //   this.cube.rotation.x += 0.01;
  //   this.cube.rotation.y += 0.01;
  // }

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
    this.camera.position.z = 300;
  }

  render() {
    return <div ref={ref => (this.mount = ref)} />;
  }
}

export default Three;
