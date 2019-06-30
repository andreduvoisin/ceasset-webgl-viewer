import CEAsset from "../data/CEAsset";
import BufferStream from "../../BufferStream";
import CEAssetType from "../data/CEAssetType";
import CEAssetDeserializer from "../deserializer/CEAssetDeserializer";

class CEAssetImporter {
  fileName: string;

  constructor(fileName: string) {
    this.fileName = fileName;
  }

  async import(): Promise<CEAsset> {
    const buffer = await this.fetchFile();
    const bufferStream = new BufferStream(buffer, true);
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

  private async fetchFile(): Promise<ArrayBuffer> {
    const response = await fetch(this.fileName);
    return response.arrayBuffer();
  }
}

export default CEAssetImporter;
