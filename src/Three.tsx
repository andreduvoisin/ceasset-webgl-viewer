import React from "react";
import * as THREE from "three";
import BufferStream from "./BufferStream";
import CEAssetImporter from "./ceasset/importer/CEAssetImporter";

class Three extends React.Component {
  scene: THREE.Scene = new THREE.Scene();
  renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();

  camera: THREE.Camera = new THREE.Camera();
  geometry: THREE.BufferGeometry = new THREE.BufferGeometry();
  mesh: THREE.SkinnedMesh = new THREE.SkinnedMesh();
  material: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial();
  skeleton: THREE.Skeleton = new THREE.Skeleton([]);
  animations: THREE.AnimationClip[] = [];
  mixer: THREE.AnimationMixer = new THREE.AnimationMixer(this.mesh);
  clock: THREE.Clock = new THREE.Clock();

  mount!: HTMLDivElement;

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

    const assetImporter = new CEAssetImporter(
      "assets/Quarterback Pass.ceasset"
    );
    const asset = assetImporter.import();
    console.log(asset);

    const bufferStream = new BufferStream(buffer, true);

    if (!this.checkHeader(bufferStream)) {
      console.error("ceasset: bad header");
      return;
    }

    while (bufferStream.hasData()) {
      const assetType = bufferStream.getInt32();

      switch (assetType) {
        // skeleton
        case 0:
          const bones: THREE.Bone[] = [];
          const boneInverses: THREE.Matrix4[] = [];

          // unsigned jointCount;
          const jointCount = bufferStream.getUint32();

          for (let jointIndex = 0; jointIndex < jointCount; ++jointIndex) {
            // glm::mat4 inverseBindPose;
            const elements: number[] = [];
            for (let i = 0; i < 16; ++i) {
              elements.push(bufferStream.getFloat32());
            }
            const inverseBindPose = new THREE.Matrix4();
            inverseBindPose.elements = elements;
            boneInverses.push(inverseBindPose);

            // std::string name;
            bufferStream.getString();

            // short parentIndex;
            const parentIndex = bufferStream.getInt16();

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
          const verticesCount = bufferStream.getUint32();

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
            const x = bufferStream.getFloat32();
            const y = bufferStream.getFloat32();
            const z = bufferStream.getFloat32();

            const vertexStride = vertexIndex * 3;
            vertices[vertexStride] = x;
            vertices[vertexStride + 1] = y;
            vertices[vertexStride + 2] = z;

            // float uv[2];
            const u = bufferStream.getFloat32();
            const v = bufferStream.getFloat32();

            const uvsStride = vertexIndex * 2;
            uvs[uvsStride] = u;
            uvs[uvsStride + 1] = v;

            // uint8_t jointIndices[4];
            const jointIndex0 = bufferStream.getInt8();
            const jointIndex1 = bufferStream.getInt8();
            const jointIndex2 = bufferStream.getInt8();
            const jointIndex3 = bufferStream.getInt8();

            const skinIndexStride = vertexIndex * 4;
            skinIndices[skinIndexStride] = jointIndex0;
            skinIndices[skinIndexStride + 1] = jointIndex1;
            skinIndices[skinIndexStride + 2] = jointIndex2;
            skinIndices[skinIndexStride + 3] = jointIndex3;

            // float jointWeights[3];
            const jointWeight0 = bufferStream.getFloat32();
            const jointWeight1 = bufferStream.getFloat32();
            const jointWeight2 = bufferStream.getFloat32();

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
          const indicesCount = bufferStream.getUint32();

          // std::vector<unsigned int> m_indices;
          // TODO: Use BufferAttribute instead for efficiency.
          const indices: number[] = [];
          for (let indexIndex = 0; indexIndex < indicesCount; indexIndex += 3) {
            const a = bufferStream.getUint32();
            const b = bufferStream.getUint32();
            const c = bufferStream.getUint32();

            indices.push(a, b, c);
          }
          this.geometry.setIndex(indices);

          // std::string m_diffuseMapName;
          bufferStream.getString();

          // std::string m_specularMapName;
          bufferStream.getString();

          // std::string m_normalMapName;
          bufferStream.getString();

          // uint8_t m_diffuseIndex;
          bufferStream.getInt8();

          // uint8_t m_specularIndex;
          bufferStream.getInt8();

          // uint8_t m_normalIndex;
          bufferStream.getInt8();

          break;

        // animation
        case 2:
          // std::string name;
          bufferStream.getString();
          // TODO: Properly parse the name.
          // animation.name = name;

          const keyframeTracks: THREE.KeyframeTrack[] = [];

          // std::vector<std::vector<TranslationKey>> translations;
          // unsigned componentsCount;
          let componentsCount = bufferStream.getUint32();
          for (
            let componentsIndex = 0;
            componentsIndex < componentsCount;
            ++componentsIndex
          ) {
            let times: number[] = [];
            let values: number[] = [];

            // unsigned keyCount;
            const keyCount = bufferStream.getUint32();

            for (let keyIndex = 0; keyIndex < keyCount; ++keyIndex) {
              // glm::vec3 translation;
              const x = bufferStream.getFloat32();
              const y = bufferStream.getFloat32();
              const z = bufferStream.getFloat32();

              values.push(x, y, z);

              // float time;
              const time = bufferStream.getFloat32();

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
          componentsCount = bufferStream.getUint32();
          for (
            let componentsIndex = 0;
            componentsIndex < componentsCount;
            ++componentsIndex
          ) {
            let times: number[] = [];
            let values: number[] = [];

            // unsigned keyCount;
            const keyCount = bufferStream.getUint32();

            for (let keyIndex = 0; keyIndex < keyCount; ++keyIndex) {
              // glm::quat rotation;
              const x = bufferStream.getFloat32();
              const y = bufferStream.getFloat32();
              const z = bufferStream.getFloat32();
              const w = bufferStream.getFloat32();

              values.push(x, y, z, w);

              // float time;
              const time = bufferStream.getFloat32();

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
          componentsCount = bufferStream.getUint32();
          for (
            let componentsIndex = 0;
            componentsIndex < componentsCount;
            ++componentsIndex
          ) {
            let times: number[] = [];
            let values: number[] = [];

            // unsigned keyCount;
            const keyCount = bufferStream.getUint32();

            for (let keyIndex = 0; keyIndex < keyCount; ++keyIndex) {
              // glm::vec3 scale;
              const x = bufferStream.getFloat32();
              const y = bufferStream.getFloat32();
              const z = bufferStream.getFloat32();

              values.push(x, y, z);

              // float time;
              const time = bufferStream.getFloat32();

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
          const duration = bufferStream.getFloat32();

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
          const width = bufferStream.getInt32();
          // int height;
          const height = bufferStream.getInt32();
          // int channels;
          const channels = bufferStream.getInt32();

          // std::vector<std::byte> data;
          const size = width * height * channels;
          const data = new Uint8Array(size);
          for (let i = 0; i < size; ++i) {
            data[i] = bufferStream.getByte();
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

          this.material = new THREE.MeshBasicMaterial({
            map: texture,
            skinning: true
          });

          break;
      }
    }
  }

  checkHeader(bufferStream: BufferStream): boolean {
    return (
      bufferStream.getChar() === "C" &&
      bufferStream.getChar() === "E" &&
      bufferStream.getChar() === "A" &&
      bufferStream.getChar() === "S" &&
      bufferStream.getChar() === "S" &&
      bufferStream.getChar() === "E" &&
      bufferStream.getChar() === "T" &&
      bufferStream.getChar() === "\0"
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
