import CEAsset from "../data/asset/CEAsset";
import BufferStream from "../../BufferStream";
import CEAssetType from "../data/asset/CEAssetType";
import CEAssetDeserializer from "../deserializer/CEAssetDeserializer";

class CEAssetImporter {
  private readonly buffer: ArrayBuffer;

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
  }

  import(): CEAsset {
    const bufferStream = new BufferStream(this.buffer, true);
    const assetDeserializer = new CEAssetDeserializer(bufferStream);

    if (!assetDeserializer.readAndVerifyHeader()) {
      throw new Error("ceasset: bad header");
    }

    const asset = new CEAsset();

    while (bufferStream.hasData()) {
      const assetType = assetDeserializer.readAssetType();

      switch (assetType) {
        case CEAssetType.SKELETON:
          asset.skeleton = assetDeserializer.readSkeleton();
          break;

        case CEAssetType.MESH:
          const mesh = assetDeserializer.readMesh();

          if (asset.meshes === undefined) {
            asset.meshes = [];
          }

          asset.meshes.push(mesh);
          break;

        case CEAssetType.ANIMATION:
          const animation = assetDeserializer.readAnimation();

          if (asset.animations === undefined) {
            asset.animations = [];
          }

          asset.animations.push(animation);
          break;

        case CEAssetType.TEXTURE:
          asset.texture = assetDeserializer.readTexture();
          break;
      }
    }

    return asset;
  }
}

export default CEAssetImporter;
