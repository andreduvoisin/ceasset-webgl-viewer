import CESkeleton from "./CESkeleton";
import CEMesh from "./CEMesh";
import CEAnimation from "./CEAnimation";
import CETexture from "./CETexture";

class CEAsset {
  skeleton!: CESkeleton;
  meshes!: CEMesh[];
  animations!: CEAnimation[];
  texture!: CETexture;
}

export default CEAsset;
