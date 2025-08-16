import { 
  IELTSCredential, 
  ZKProof, 
  RangeProofResult, 
  SetMembershipProofResult, 
  AggregatedProofResult, 
  AggregationType 
} from './types';
import { MerkleTreeManager } from './merkle-tree-manager';
import { ProofGenerator } from './proof-generator';
import { HashingUtils } from './hashing-utils';

export class AdvancedProofs {
  private merkleTreeManager: MerkleTreeManager;
  private proofGenerator: ProofGenerator;
  private hashingUtils: HashingUtils;

  constructor(
    merkleTreeManager: MerkleTreeManager, 
    proofGenerator: ProofGenerator,
    hashingUtils: HashingUtils
  ) {
    this.merkleTreeManager = merkleTreeManager;
    this.proofGenerator = proofGenerator;
    this.hashingUtils = hashingUtils;
  }

  async generateRangeProof(
    credentialId: string,
    field: string,
    minValue: number,
    maxValue: number
  ): Promise<RangeProofResult> {
    const credential = this.merkleTreeManager.getCredential(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    let actualValue: number;
    if (field.startsWith('scores.')) {
      const scoreType = field.split('.')[1];
      actualValue = credential.scores[scoreType as keyof typeof credential.scores];
    } else {
      throw new Error(`Range proofs not supported for field: ${field}`);
    }

    const inRange = actualValue >= minValue && actualValue <= maxValue;
    
    // Generate a ZK proof that includes range information
    const zkProof = await this.proofGenerator.generateZKProof(
      credentialId,
      [field], // Reveal the field value
      inRange ? { [field.split('.')[1]]: minValue } : undefined
    );

    // Add range proof metadata
    (zkProof as any).rangeProof = {
      field,
      minValue,
      maxValue,
      provenInRange: inRange
    };

    return {
      proof: zkProof,
      inRange,
      actualInRange: inRange
    };
  }

  async generateSetMembershipProof(
    credentialId: string,
    field: string,
    validSet: (string | number)[]
  ): Promise<SetMembershipProofResult> {
    const credential = this.merkleTreeManager.getCredential(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    let actualValue: string | number;
    if (field.startsWith('scores.')) {
      const scoreType = field.split('.')[1];
      actualValue = credential.scores[scoreType as keyof typeof credential.scores];
    } else {
      actualValue = (credential as any)[field];
    }

    const isMember = validSet.includes(actualValue);
    
    // Generate a ZK proof with set membership information
    const zkProof = await this.proofGenerator.generateZKProof(
      credentialId,
      isMember ? [field] : [] // Only reveal field if it's in the valid set
    );

    // Add set membership metadata
    // Convert validSet to numeric values that can be hashed
    const poseidonHash = this.hashingUtils.getPoseidonHash();
    const numericSet = validSet.map(v => Math.floor(Number(v) * 100)); // Convert 7.5 to 750 for hashing
    const validSetHash = poseidonHash(numericSet);
    (zkProof as any).setMembershipProof = {
      field,
      validSetHash: validSetHash.toString(),
      provenMembership: isMember
    };

    return {
      proof: zkProof,
      isMember
    };
  }

  async generateAggregatedProof(
    credentialIds: string[],
    aggregationType: AggregationType,
    field: string,
    threshold?: number
  ): Promise<AggregatedProofResult> {
    if (credentialIds.length === 0) {
      throw new Error('No credentials provided for aggregation');
    }

    const values: number[] = [];
    const validCredentials: IELTSCredential[] = [];

    for (const credentialId of credentialIds) {
      const credential = this.merkleTreeManager.getCredential(credentialId);
      if (!credential) {
        throw new Error(`Credential not found: ${credentialId}`);
      }
      
      let value: number;
      if (field.startsWith('scores.')) {
        const scoreType = field.split('.')[1];
        value = credential.scores[scoreType as keyof typeof credential.scores];
      } else {
        throw new Error(`Aggregation not supported for field: ${field}`);
      }
      
      values.push(value);
      validCredentials.push(credential);
    }

    let aggregatedValue: number;
    switch (aggregationType) {
      case 'average':
        aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
        break;
      case 'minimum':
        aggregatedValue = Math.min(...values);
        break;
      case 'maximum':
        aggregatedValue = Math.max(...values);
        break;
      case 'count':
        aggregatedValue = values.length;
        break;
      default:
        throw new Error(`Unsupported aggregation type: ${aggregationType}`);
    }

    const meetsThreshold = threshold ? aggregatedValue >= threshold : true;

    // Generate aggregated proof structure
    const aggregatedProof = {
      type: 'AggregatedMerkleTreeProof2023',
      created: new Date().toISOString(),
      proofPurpose: 'aggregation',
      credentialCount: credentialIds.length,
      aggregationType,
      field,
      aggregatedValue: meetsThreshold ? aggregatedValue : undefined, // Only reveal if threshold met
      threshold,
      meetsThreshold,
      merkleRoots: [this.merkleTreeManager.getRoot()],
      individualProofs: [] // In production, would contain actual individual proofs
    };

    return {
      proof: aggregatedProof,
      aggregatedValue,
      meetsThreshold
    };
  }
}
