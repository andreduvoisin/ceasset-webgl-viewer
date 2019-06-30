import CESkeleton from "../skeleton/CESkeleton";
import CEMesh from "../mesh/CEMesh";
import CEAnimation from "../animation/CEAnimation";
import CETexture from "../texture/CETexture";

class CEAsset {
  skeleton!: CESkeleton;
  meshes!: CEMesh[];
  animations!: CEAnimation[];
  texture!: CETexture;
}

export default CEAsset;
