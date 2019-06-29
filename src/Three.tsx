import React from "react";
import * as THREE from "three";

class Three extends React.Component {
  scene: THREE.Scene = new THREE.Scene();
  renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();

  camera: THREE.Camera = new THREE.Camera();
  // cube: THREE.Mesh;
  geometry: THREE.BufferGeometry = new THREE.BufferGeometry();
  mesh: THREE.SkinnedMesh = new THREE.SkinnedMesh();
  material: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial();
  skeleton: THREE.Skeleton = new THREE.Skeleton([]);
  animations: THREE.AnimationClip[] = [];
  mixer: THREE.AnimationMixer = new THREE.AnimationMixer(this.mesh);
  clock: THREE.Clock = new THREE.Clock();

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
    this.mesh.bind(this.skeleton, new THREE.Matrix4());

    this.mixer = new THREE.AnimationMixer(rootBone);
    const action = this.mixer.clipAction(this.animations[1]);
    action.play();

    this.scene.add(this.mesh);

    const skeletonHelper = new THREE.SkeletonHelper(this.mesh);
    this.scene.add(skeletonHelper);

    this.mount.appendChild(this.renderer.domElement);

    this.animate();
  }

  async readFile() {
    const buffer = await fetch("assets/Quarterback Pass.ceasset").then(result =>
      result.arrayBuffer()
    );

    const dataView = new DataView(buffer);

    if (!this.checkHeader(dataView)) {
      console.error("ceasset: bad header");
      return;
    }

    const littleEndian = true;

    let byteOffset = 8;

    while (byteOffset < dataView.byteLength) {
      const assetType = dataView.getInt32(byteOffset, littleEndian);
      byteOffset += 4;

      let char = 0;

      switch (assetType) {
        // skeleton
        case 0:
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

            const bone = new THREE.Bone();
            if (parentIndex !== -1) {
              bones[parentIndex].add(bone);
            }
            bones.push(bone);
          }

          this.skeleton = new THREE.Skeleton(bones, boneInverses);

          break;

        // mesh
        case 1:
          // unsigned verticesCount;
          const verticesCount = dataView.getUint32(byteOffset, littleEndian);
          byteOffset += 4;

          // std::vector<Vertex1P1UV4J> m_vertices;
          const vertices = new Float32Array(verticesCount * 3);
          const uvs = new Float32Array(verticesCount * 2);
          const skinIndices = new Uint8Array(verticesCount * 4);
          const skinWeights = new Float32Array(verticesCount * 4);

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

            const vertexStride = vertexIndex * 3;
            vertices[vertexStride] = x;
            vertices[vertexStride + 1] = y;
            vertices[vertexStride + 2] = z;

            // float uv[2];
            const u = dataView.getFloat32(byteOffset, littleEndian);
            byteOffset += 4;
            const v = dataView.getFloat32(byteOffset, littleEndian);
            byteOffset += 4;

            const uvsStride = vertexIndex * 2;
            uvs[uvsStride] = u;
            uvs[uvsStride + 1] = v;

            // uint8_t jointIndices[4];
            const jointIndex0 = dataView.getInt8(byteOffset);
            byteOffset += 1;
            const jointIndex1 = dataView.getInt8(byteOffset);
            byteOffset += 1;
            const jointIndex2 = dataView.getInt8(byteOffset);
            byteOffset += 1;
            const jointIndex3 = dataView.getInt8(byteOffset);
            byteOffset += 1;

            const skinIndexStride = vertexIndex * 4;
            skinIndices[skinIndexStride] = jointIndex0;
            skinIndices[skinIndexStride + 1] = jointIndex1;
            skinIndices[skinIndexStride + 2] = jointIndex2;
            skinIndices[skinIndexStride + 3] = jointIndex3;

            // float jointWeights[3];
            const jointWeight0 = dataView.getFloat32(byteOffset, littleEndian);
            byteOffset += 4;
            const jointWeight1 = dataView.getFloat32(byteOffset, littleEndian);
            byteOffset += 4;
            const jointWeight2 = dataView.getFloat32(byteOffset, littleEndian);
            byteOffset += 4;

            const jointWeight3 =
              1.0 - (jointWeight0 + jointWeight1 + jointWeight2);

            const skinWeightStride = vertexIndex * 4;
            skinWeights[skinWeightStride] = jointWeight0;
            skinWeights[skinWeightStride + 1] = jointWeight1;
            skinWeights[skinWeightStride + 2] = jointWeight2;
            skinWeights[skinWeightStride + 3] = jointWeight3;
          }

          this.geometry.addAttribute(
            "position",
            new THREE.BufferAttribute(vertices, 3)
          );
          this.geometry.addAttribute("uv", new THREE.BufferAttribute(uvs, 2));
          this.geometry.addAttribute(
            "skinIndex",
            new THREE.BufferAttribute(skinIndices, 4)
          );
          this.geometry.addAttribute(
            "skinWeight",
            new THREE.BufferAttribute(skinWeights, 4)
          );

          // unsigned indicesCount;
          const indicesCount = dataView.getUint32(byteOffset, littleEndian);
          byteOffset += 4;

          // std::vector<unsigned int> m_indices;
          // TODO: Use BufferAttribute instead for efficiency.
          const indices: number[] = [];
          for (let indexIndex = 0; indexIndex < indicesCount; indexIndex += 3) {
            const a = dataView.getUint32(byteOffset, littleEndian);
            byteOffset += 4;
            const b = dataView.getUint32(byteOffset, littleEndian);
            byteOffset += 4;
            const c = dataView.getUint32(byteOffset, littleEndian);
            byteOffset += 4;

            indices.push(a, b, c);
          }
          this.geometry.setIndex(indices);

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

        // animation
        case 2:
          // std::string name;
          char = dataView.getInt8(byteOffset);
          ++byteOffset;
          while (char !== "\0".charCodeAt(0)) {
            char = dataView.getInt8(byteOffset);
            ++byteOffset;
          }
          // TODO: Properly parse the name.
          // animation.name = name;

          const keyframeTracks: THREE.KeyframeTrack[] = [];

          // std::vector<std::vector<TranslationKey>> translations;
          // unsigned componentsCount;
          let componentsCount = dataView.getUint32(byteOffset, littleEndian);
          byteOffset += 4;
          for (
            let componentsIndex = 0;
            componentsIndex < componentsCount;
            ++componentsIndex
          ) {
            let times: number[] = [];
            let values: number[] = [];

            // unsigned keyCount;
            const keyCount = dataView.getUint32(byteOffset, littleEndian);
            byteOffset += 4;

            for (let keyIndex = 0; keyIndex < keyCount; ++keyIndex) {
              // glm::vec3 translation;
              const x = dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;
              const y = dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;
              const z = dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;

              values.push(x, y, z);

              // float time;
              const time = dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;

              times.push(time);
            }

            const translationTrack = new THREE.VectorKeyframeTrack(
              `${this.skeleton.bones[componentsIndex].uuid}.position`,
              times,
              values,
              THREE.InterpolateLinear
            );
            keyframeTracks.push(translationTrack);
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
            let times: number[] = [];
            let values: number[] = [];

            // unsigned keyCount;
            const keyCount = dataView.getUint32(byteOffset, littleEndian);
            byteOffset += 4;

            for (let keyIndex = 0; keyIndex < keyCount; ++keyIndex) {
              // glm::quat rotation;
              const x = dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;
              const y = dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;
              const z = dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;
              const w = dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;

              values.push(x, y, z, w);

              // float time;
              const time = dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;

              times.push(time);
            }

            const rotationTrack = new THREE.QuaternionKeyframeTrack(
              `${this.skeleton.bones[componentsIndex].uuid}.quaternion`,
              times,
              values,
              THREE.InterpolateLinear
            );
            keyframeTracks.push(rotationTrack);
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
            let times: number[] = [];
            let values: number[] = [];

            // unsigned keyCount;
            const keyCount = dataView.getUint32(byteOffset, littleEndian);
            byteOffset += 4;

            for (let keyIndex = 0; keyIndex < keyCount; ++keyIndex) {
              // glm::vec3 scale;
              const x = dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;
              const y = dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;
              const z = dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;

              values.push(x, y, z);

              // float time;
              const time = dataView.getFloat32(byteOffset, littleEndian);
              byteOffset += 4;

              times.push(time);
            }

            const scaleTrack = new THREE.VectorKeyframeTrack(
              `${this.skeleton.bones[componentsIndex].uuid}.scale`,
              times,
              values,
              THREE.InterpolateLinear
            );
            keyframeTracks.push(scaleTrack);
          }

          // float duration;
          const duration = dataView.getFloat32(byteOffset, littleEndian);
          byteOffset += 4;

          const animation = new THREE.AnimationClip(
            "anim",
            duration,
            keyframeTracks
          );
          this.animations.push(animation);

          break;

        // texture
        case 3:
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
    return <div ref={ref => (this.mount = ref)} />;
  }
}

export default Three;
