import BufferStream from "../../BufferStream";
import CEAssetType from "../data/asset/CEAssetType";
import CESkeleton from "../data/skeleton/CESkeleton";
import CEJoint from "../data/skeleton/CEJoint";
import CEMesh from "../data/mesh/CEMesh";
import CEVertex from "../data/mesh/CEVertex";
import CEAnimation from "../data/animation/CEAnimation";
import CETranslationKey from "../data/animation/CETranslationKey";
import CERotationKey from "../data/animation/CERotationKey";
import CEScaleKey from "../data/animation/CEScaleKey";
import CETexture from "../data/texture/CETexture";

class CEAssetDeserializer {
  private bufferStream: BufferStream;

  constructor(bufferStream: BufferStream) {
    this.bufferStream = bufferStream;
  }

  readAndVerifyHeader(): boolean {
    return (
      this.bufferStream.getChar() === "C" &&
      this.bufferStream.getChar() === "E" &&
      this.bufferStream.getChar() === "A" &&
      this.bufferStream.getChar() === "S" &&
      this.bufferStream.getChar() === "S" &&
      this.bufferStream.getChar() === "E" &&
      this.bufferStream.getChar() === "T" &&
      this.bufferStream.getChar() === "\0"
    );
  }

  readAssetType(): CEAssetType {
    // enum AssetType
    return this.bufferStream.getInt32();
  }

  readSkeleton(): CESkeleton {
    const skeleton = new CESkeleton();
    skeleton.joints = [];

    // unsigned jointCount;
    const jointCount = this.bufferStream.getUint32();

    for (let jointIndex = 0; jointIndex < jointCount; ++jointIndex) {
      const joint = new CEJoint();

      // glm::mat4 inverseBindPose;
      joint.inverseBindPose = new Float32Array(16);
      for (let i = 0; i < 16; ++i) {
        joint.inverseBindPose[i] = this.bufferStream.getFloat32();
      }

      // std::string name;
      joint.name = this.bufferStream.getString();

      // short parentIndex;
      joint.parentIndex = this.bufferStream.getInt16();

      skeleton.joints.push(joint);
    }

    return skeleton;
  }

  readMesh(): CEMesh {
    const mesh = new CEMesh();

    // unsigned verticesCount;
    const verticesCount = this.bufferStream.getUint32();

    // std::vector<Vertex1P1UV4J> m_vertices;
    mesh.vertices = [];

    for (let vertexIndex = 0; vertexIndex < verticesCount; ++vertexIndex) {
      const vertex = new CEVertex();

      // glm::vec3 position;
      vertex.position = new Float32Array(3);
      vertex.position[0] = this.bufferStream.getFloat32();
      vertex.position[1] = this.bufferStream.getFloat32();
      vertex.position[2] = this.bufferStream.getFloat32();

      // float uv[2];
      vertex.uv = new Float32Array(2);
      vertex.uv[0] = this.bufferStream.getFloat32();
      vertex.uv[1] = this.bufferStream.getFloat32();

      // uint8_t jointIndices[4];
      vertex.jointIndices = new Uint8Array(4);
      vertex.jointIndices[0] = this.bufferStream.getInt8();
      vertex.jointIndices[1] = this.bufferStream.getInt8();
      vertex.jointIndices[2] = this.bufferStream.getInt8();
      vertex.jointIndices[3] = this.bufferStream.getInt8();

      // float jointWeights[3];
      vertex.jointWeights = new Float32Array(3);
      vertex.jointWeights[0] = this.bufferStream.getFloat32();
      vertex.jointWeights[1] = this.bufferStream.getFloat32();
      vertex.jointWeights[2] = this.bufferStream.getFloat32();

      mesh.vertices.push(vertex);
    }

    // unsigned indicesCount;
    const indicesCount = this.bufferStream.getUint32();

    // std::vector<unsigned int> m_indices;
    mesh.indices = new Uint32Array(indicesCount);

    for (let indexIndex = 0; indexIndex < indicesCount; ++indexIndex) {
      mesh.indices[indexIndex] = this.bufferStream.getUint32();
    }

    // std::string m_diffuseMapName;
    mesh.diffuseMapName = this.bufferStream.getString();

    // std::string m_specularMapName;
    mesh.specularMapName = this.bufferStream.getString();

    // std::string m_normalMapName;
    mesh.normalMapName = this.bufferStream.getString();

    // uint8_t m_diffuseIndex;
    mesh.diffuseIndex = this.bufferStream.getInt8();

    // uint8_t m_specularIndex;
    mesh.specularIndex = this.bufferStream.getInt8();

    // uint8_t m_normalIndex;
    mesh.normalIndex = this.bufferStream.getInt8();

    return mesh;
  }

  readAnimation(): CEAnimation {
    const animation = new CEAnimation();

    // std::string name;
    animation.name = this.bufferStream.getString();

    // unsigned componentsCount;
    const translationComponentCount = this.bufferStream.getUint32();

    // std::vector<std::vector<TranslationKey>> translations;
    animation.translations = Array(translationComponentCount);

    for (
      let componentIndex = 0;
      componentIndex < translationComponentCount;
      ++componentIndex
    ) {
      // unsigned keyCount;
      const keyCount = this.bufferStream.getUint32();

      animation.translations[componentIndex] = Array(keyCount);

      for (let keyIndex = 0; keyIndex < keyCount; ++keyIndex) {
        const translationKey = new CETranslationKey();

        // glm::vec3 translation;
        translationKey.translation = new Float32Array(3);
        translationKey.translation[0] = this.bufferStream.getFloat32();
        translationKey.translation[1] = this.bufferStream.getFloat32();
        translationKey.translation[2] = this.bufferStream.getFloat32();

        // float time;
        translationKey.time = this.bufferStream.getFloat32();

        animation.translations[componentIndex][keyIndex] = translationKey;
      }
    }

    // unsigned componentsCount;
    const rotationComponentCount = this.bufferStream.getUint32();

    // std::vector<std::vector<RotationKey>> rotations;
    animation.rotations = Array(rotationComponentCount);

    for (
      let componentIndex = 0;
      componentIndex < rotationComponentCount;
      ++componentIndex
    ) {
      // unsigned keyCount;
      const keyCount = this.bufferStream.getUint32();

      animation.rotations[componentIndex] = Array(keyCount);

      for (let keyIndex = 0; keyIndex < keyCount; ++keyIndex) {
        const rotationKey = new CERotationKey();

        // glm::quat rotation;
        rotationKey.rotation = new Float32Array(4);
        rotationKey.rotation[0] = this.bufferStream.getFloat32();
        rotationKey.rotation[1] = this.bufferStream.getFloat32();
        rotationKey.rotation[2] = this.bufferStream.getFloat32();
        rotationKey.rotation[3] = this.bufferStream.getFloat32();

        // float time;
        rotationKey.time = this.bufferStream.getFloat32();

        animation.rotations[componentIndex][keyIndex] = rotationKey;
      }
    }

    // unsigned componentsCount;
    const scaleComponentCount = this.bufferStream.getUint32();

    // std::vector<std::vector<ScaleKey>> scales;
    animation.scales = Array(scaleComponentCount);

    for (
      let componentIndex = 0;
      componentIndex < scaleComponentCount;
      ++componentIndex
    ) {
      // unsigned keyCount;
      const keyCount = this.bufferStream.getUint32();

      animation.scales[componentIndex] = Array(keyCount);

      for (let keyIndex = 0; keyIndex < keyCount; ++keyIndex) {
        const scaleKey = new CEScaleKey();

        // glm::vec3 scale;
        scaleKey.scale = new Float32Array(3);
        scaleKey.scale[0] = this.bufferStream.getFloat32();
        scaleKey.scale[1] = this.bufferStream.getFloat32();
        scaleKey.scale[2] = this.bufferStream.getFloat32();

        // float time;
        scaleKey.time = this.bufferStream.getFloat32();

        animation.scales[componentIndex][keyIndex] = scaleKey;
      }
    }

    // float duration;
    animation.duration = this.bufferStream.getFloat32();

    return animation;
  }

  readTexture(): CETexture {
    const texture = new CETexture();

    // int width;
    texture.width = this.bufferStream.getInt32();
    // int height;
    texture.height = this.bufferStream.getInt32();
    // int channels;
    texture.channels = this.bufferStream.getInt32();

    const size = texture.width * texture.height * texture.channels;

    // std::vector<std::byte> data;
    texture.data = new Uint8Array(size);
    for (let i = 0; i < size; ++i) {
      texture.data[i] = this.bufferStream.getByte();
    }

    return texture;
  }
}

export default CEAssetDeserializer;
