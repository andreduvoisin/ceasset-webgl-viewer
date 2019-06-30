import CEVertex from "./CEVertex";

class CEMesh {
  vertices!: CEVertex[];
  indices!: Uint32Array;

  diffuseMapName!: string;
  specularMapName!: string;
  normalMapName!: string;

  diffuseIndex!: number;
  specularIndex!: number;
  normalIndex!: number;
}

export default CEMesh;
