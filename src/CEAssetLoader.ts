import CEAssetImporter from "./ceasset/importer/CEAssetImporter";
import ThreeAsset from "./ThreeAsset";
import * as THREE from "three";
import { BufferGeometry, SkinnedMesh } from "three";
import CEMesh from "./ceasset/data/mesh/CEMesh";
import CETexture from "./ceasset/data/texture/CETexture";
import CESkeleton from "./ceasset/data/skeleton/CESkeleton";
import CEAnimation from "./ceasset/data/animation/CEAnimation";

// TODO: Figure out the three.js Loader paradigm and implement.
class CEAssetLoader {
  private readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  async load(): Promise<ThreeAsset> {
    const buffer = await this.fetchFile();

    const ceAssetImporter = new CEAssetImporter(buffer);
    const ceAsset = ceAssetImporter.import();

    const geometries = this.parseGeometries(ceAsset.meshes);
    const material = this.parseMaterial(ceAsset.texture);

    const threeAsset = new ThreeAsset();
    threeAsset.skeleton = this.parseSkeleton(ceAsset.skeleton);
    threeAsset.meshes = this.createSkinnedMeshes(
      geometries,
      material,
      threeAsset.skeleton
    );
    threeAsset.animations = this.parseAnimationClips(
      ceAsset.animations,
      threeAsset.skeleton
    );

    return threeAsset;
  }

  private async fetchFile(): Promise<ArrayBuffer> {
    const response = await fetch(this.url);
    return response.arrayBuffer();
  }

  private createSkinnedMeshes(
    geometries: THREE.BufferGeometry[],
    material: THREE.MeshBasicMaterial,
    skeleton: THREE.Skeleton
  ): SkinnedMesh[] {
    const skinnedMeshes: SkinnedMesh[] = [];

    geometries.forEach(geometry => {
      const skinnedMesh = new THREE.SkinnedMesh(geometry, material);

      const rootBone = skeleton.bones[0];
      skinnedMesh.add(rootBone);
      skinnedMesh.bind(skeleton, new THREE.Matrix4());

      skinnedMeshes.push(skinnedMesh);
    });

    return skinnedMeshes;
  }

  private parseGeometries(meshes: CEMesh[]): BufferGeometry[] {
    const geometries: BufferGeometry[] = [];

    meshes.forEach(mesh => {
      const geometry = this.parseGeometry(mesh);
      geometries.push(geometry);
    });

    return geometries;
  }

  private parseGeometry(mesh: CEMesh): BufferGeometry {
    const geometry = new BufferGeometry();

    const verticesCount: number = mesh.vertices.length;

    const positionStride = 3;
    const positions = new Float32Array(verticesCount * positionStride);

    const uvStride = 2;
    const uvs = new Float32Array(verticesCount * uvStride);

    const skinIndicesStride = 4;
    const skinIndices = new Uint8Array(verticesCount * skinIndicesStride);

    const skinWeightsStride = 4;
    const skinWeights = new Float32Array(verticesCount * skinWeightsStride);

    for (let vertexIndex = 0; vertexIndex < verticesCount; ++vertexIndex) {
      const vertex = mesh.vertices[vertexIndex];

      const positionIndex = vertexIndex * positionStride;
      positions[positionIndex] = vertex.position[0];
      positions[positionIndex + 1] = vertex.position[1];
      positions[positionIndex + 2] = vertex.position[2];

      const uvIndex = vertexIndex * uvStride;
      uvs[uvIndex] = vertex.uv[0];
      uvs[uvIndex + 1] = vertex.uv[1];

      const skinIndicesIndex = vertexIndex * skinIndicesStride;
      skinIndices[skinIndicesIndex] = vertex.jointIndices[0];
      skinIndices[skinIndicesIndex + 1] = vertex.jointIndices[1];
      skinIndices[skinIndicesIndex + 2] = vertex.jointIndices[2];
      skinIndices[skinIndicesIndex + 3] = vertex.jointIndices[3];

      const skinWeightsIndex = vertexIndex * skinWeightsStride;
      skinWeights[skinWeightsIndex] = vertex.jointWeights[0];
      skinWeights[skinWeightsIndex + 1] = vertex.jointWeights[1];
      skinWeights[skinWeightsIndex + 2] = vertex.jointWeights[2];
      skinWeights[skinWeightsIndex + 3] =
        1.0 -
        (vertex.jointWeights[0] +
          vertex.jointWeights[1] +
          vertex.jointWeights[2]);
    }

    geometry.addAttribute(
      "position",
      new THREE.BufferAttribute(positions, positionStride)
    );

    geometry.addAttribute("uv", new THREE.BufferAttribute(uvs, uvStride));

    geometry.addAttribute(
      "skinIndex",
      new THREE.BufferAttribute(skinIndices, skinIndicesStride)
    );

    geometry.addAttribute(
      "skinWeight",
      new THREE.BufferAttribute(skinWeights, skinWeightsStride)
    );

    geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));

    return geometry;
  }

  private parseMaterial(texture: CETexture): THREE.MeshBasicMaterial {
    const dataTexture = new THREE.DataTexture(
      texture.data,
      texture.width,
      texture.height,
      texture.channels === 3 ? THREE.RGBFormat : THREE.RGBAFormat
    );

    // dataTexture.wrapS = THREE.RepeatWrapping;
    // dataTexture.wrapT = THREE.RepeatWrapping;
    // dataTexture.minFilter = THREE.LinearMipMapLinearFilter; // TODO: This filter breaks WebGL.
    // dataTexture.magFilter = THREE.LinearFilter;

    dataTexture.needsUpdate = true;

    return new THREE.MeshBasicMaterial({
      map: dataTexture,
      skinning: true
    });
  }

  private parseSkeleton(skeleton: CESkeleton): THREE.Skeleton {
    const bones: THREE.Bone[] = [];
    const boneInverses: THREE.Matrix4[] = [];

    skeleton.joints.forEach(joint => {
      const bone = new THREE.Bone();
      bone.name = joint.name;
      if (joint.parentIndex !== -1) {
        bones[joint.parentIndex].add(bone);
      }
      bones.push(bone);

      const boneInverse = new THREE.Matrix4();
      for (let i = 0; i < 16; ++i) {
        boneInverse.elements[i] = joint.inverseBindPose[i];
      }
      boneInverses.push(boneInverse);
    });

    return new THREE.Skeleton(bones, boneInverses);
  }

  private parseAnimationClips(
    animations: CEAnimation[],
    skeleton: THREE.Skeleton
  ): THREE.AnimationClip[] {
    const animationClips: THREE.AnimationClip[] = [];

    animations.forEach(animation => {
      const animationClip = this.parseAnimationClip(animation, skeleton);
      animationClips.push(animationClip);
    });

    return animationClips;
  }

  private parseAnimationClip(
    animation: CEAnimation,
    skeleton: THREE.Skeleton
  ): THREE.AnimationClip {
    const keyframeTracks: THREE.KeyframeTrack[] = [];

    animation.translations.forEach((translationKeys, jointIndex) => {
      const times: number[] = [];
      const values: number[] = [];

      translationKeys.forEach(translationKey => {
        times.push(translationKey.time);

        translationKey.translation.forEach(value => {
          values.push(value);
        });
      });

      const translationTrack = new THREE.VectorKeyframeTrack(
        `${skeleton.bones[jointIndex].uuid}.position`,
        times,
        values,
        THREE.InterpolateLinear
      );
      keyframeTracks.push(translationTrack);
    });

    animation.rotations.forEach((rotationKeys, jointIndex) => {
      const times: number[] = [];
      const values: number[] = [];

      rotationKeys.forEach(rotationKey => {
        times.push(rotationKey.time);

        rotationKey.rotation.forEach(value => {
          values.push(value);
        });
      });

      const rotationTrack = new THREE.QuaternionKeyframeTrack(
        `${skeleton.bones[jointIndex].uuid}.quaternion`,
        times,
        values,
        THREE.InterpolateLinear
      );
      keyframeTracks.push(rotationTrack);
    });

    animation.scales.forEach((scaleKeys, jointIndex) => {
      const times: number[] = [];
      const values: number[] = [];

      scaleKeys.forEach(scaleKey => {
        times.push(scaleKey.time);

        scaleKey.scale.forEach(value => {
          values.push(value);
        });
      });

      const scaleTrack = new THREE.VectorKeyframeTrack(
        `${skeleton.bones[jointIndex].uuid}.scale`,
        times,
        values,
        THREE.InterpolateLinear
      );
      keyframeTracks.push(scaleTrack);
    });

    return new THREE.AnimationClip(
      animation.name,
      animation.duration,
      keyframeTracks
    );
  }
}

export default CEAssetLoader;
