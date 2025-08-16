import { IELTSCredential, ZKProof, MerkleProof } from '../../types';

export { IELTSCredential, ZKProof, MerkleProof };

export interface PerformanceMetrics {
  credentialAdditions: number;
  proofGenerations: number;
  proofVerifications: number;
  totalAdditionTime: number;
  totalProofGenerationTime: number;
  totalProofVerificationTime: number;
}

export interface MembershipProof {
  leafIndex: number;
  siblings: string[];
  directions: number[];
}

export interface NonMembershipProof {
  query: string;
  preLeaf: {
    val: string;
    nextVal: string;
    nextIdx: number;
  };
  path: string[];
  directions: number[];
}

export interface TreeMetrics {
  totalCredentials: number;
  treeSize: number;
  treeRoot: string;
  depth: number;
  memoryUsage: {
    credentials: number;
    leafNodes: number;
    indices: number;
  };
}

export interface PerformanceReport {
  operations: {
    credentialAdditions: number;
    proofGenerations: number;
    proofVerifications: number;
  };
  averageTimes: {
    credentialAddition: number;
    proofGeneration: number;
    proofVerification: number;
  };
  totalTimes: {
    credentialAddition: number;
    proofGeneration: number;
    proofVerification: number;
  };
}

export interface RangeProofResult {
  proof: ZKProof;
  inRange: boolean;
  actualInRange: boolean;
}

export interface SetMembershipProofResult {
  proof: ZKProof;
  isMember: boolean;
}

export interface AggregatedProofResult {
  proof: any;
  aggregatedValue: number;
  meetsThreshold: boolean;
}

export type AggregationType = 'average' | 'minimum' | 'maximum' | 'count';
