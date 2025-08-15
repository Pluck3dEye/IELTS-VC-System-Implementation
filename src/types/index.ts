export interface IELTSCredential {
  id: string;
  holder: string;
  name: string;
  dateOfBirth: string;
  scores: {
    listening: number;
    reading: number;
    writing: number;
    speaking: number;
    overall: number;
  };
  certificationDate: string;
  expiryDate: string;
  testCenter: string;
  certificateNumber: string;
}

export interface VerifiableCredential {
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: IELTSCredential;
  proof: BBSProof;
}

export interface BBSProof {
  type: string;
  created: string;
  proofPurpose: string;
  verificationMethod: string;
  signature: Uint8Array;
  publicKey: Uint8Array;
}

export interface PresentationRequest {
  id: string;
  verifier: string;
  requiredFields: string[];
  minimumScores?: {
    listening?: number;
    reading?: number;
    writing?: number;
    speaking?: number;
    overall?: number;
  };
  purpose: string;
}

export interface VerifiablePresentation {
  id: string;
  type: string[];
  holder: string;
  verifiableCredential: VerifiableCredential[];
  proof: ZKProof;
}

export interface MerkleProof {
  leaf: string;
  path: string[];
  indices: number[];
  root: string;
  membershipProof?: {
    leafIndex: number;
    siblings: string[];
    directions: number[];
  };
  nonMembershipProof?: {
    query: string;
    preLeaf: {
      val: string;
      nextVal: string;
      nextIdx: number;
    };
    path: string[];
    directions: number[];
  };
}

export interface ZKProof {
  type: string;
  created: string;
  proofPurpose: string;
  merkleRoot: string;
  zkProof: MerkleProof;
  revealedAttributes: Record<string, any>;
}

export interface RegistryEntry {
  credentialId: string;
  issuer: string;
  holder: string;
  issuanceDate: string;
  revoked: boolean;
  merkleTreeIndex?: number;
}
