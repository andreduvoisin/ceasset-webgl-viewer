import CETranslationKey from "./CETranslationKey";
import CERotationKey from "./CERotationKey";
import CEScaleKey from "./CEScaleKey";

class CEAnimation {
  name!: string;
  translations!: CETranslationKey[][];
  rotations!: CERotationKey[][];
  scales!: CEScaleKey[][];
  duration!: number;
}

export default CEAnimation;
