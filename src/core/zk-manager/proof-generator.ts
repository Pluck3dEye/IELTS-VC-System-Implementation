import { ZKProof, MerkleProof, IELTSCredential } from './types';
import { MerkleTreeManager } from './merkle-tree-manager';
import { HashingUtils } from './hashing-utils';

export class ProofGenerator {
  private merkleTreeManager: MerkleTreeManager;
  private hashingUtils: HashingUtils;

  constructor(merkleTreeManager: MerkleTreeManager, hashingUtils: HashingUtils) {
    this.merkleTreeManager = merkleTreeManager;
    this.hashingUtils = hashingUtils;
  }

  async generateZKProof(
    credentialId: string,
    revealedFields: string[],
    minimumScores?: Record<string, number>
  ): Promise<ZKProof> {
    const credential = this.merkleTreeManager.getCredential(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    const credentialHash = this.merkleTreeManager.getCredentialHash(credentialId);
    if (!credentialHash) {
      throw new Error('Credential hash not found');
    }

    const credentialIndex = this.merkleTreeManager.getCredentialIndex(credentialId);
    if (credentialIndex === undefined) {
      throw new Error('Credential index not found');
    }

    try {
      // Generate membership proof
      const membershipProof = this.merkleTreeManager.generateMembershipProof(credentialHash, credentialIndex);
      
      // Generate non-membership proof for demonstration (showing the credential exists)
      let nonMembershipProof;
      try {
        // Generate a non-membership proof for a value slightly different from our credential
        const queryValue = credentialHash + 1n;
        nonMembershipProof = this.merkleTreeManager.generateNonMembershipProof(queryValue);
      } catch (error) {
        console.warn('Could not generate non-membership proof:', error);
      }

      // Create enhanced merkle proof structure
      const merkleProof: MerkleProof = {
        leaf: credentialHash.toString(),
        path: membershipProof.siblings,
        indices: [credentialIndex],
        root: this.merkleTreeManager.getRoot(),
        membershipProof: membershipProof,
        nonMembershipProof: nonMembershipProof
      };
      
      // Create revealed attributes based on requested fields
      const revealedAttributes: Record<string, any> = {};
      for (const field of revealedFields) {
        if (field.includes('scores.')) {
          const scoreType = field.split('.')[1];
          revealedAttributes[field] = credential.scores[scoreType as keyof typeof credential.scores];
        } else {
          revealedAttributes[field] = (credential as any)[field];
        }
      }

      // Verify minimum scores if required
      if (minimumScores) {
        for (const [scoreType, minScore] of Object.entries(minimumScores)) {
          const actualScore = credential.scores[scoreType as keyof typeof credential.scores];
          if (actualScore < minScore) {
            throw new Error(`Minimum score requirement not met for ${scoreType}`);
          }
        }
      }

      const zkProof = {
        type: 'IndexedMerkleTreeProof2023',
        created: new Date().toISOString(),
        proofPurpose: 'authentication',
        merkleRoot: this.merkleTreeManager.getRoot(),
        zkProof: merkleProof,
        revealedAttributes
      };

      return zkProof;
    } catch (error) {
      console.error('ZK proof generation failed:', error);
      throw error;
    }
  }

  async generateZKProofsBatch(
    credentialIds: string[],
    revealedFields: string[],
    minimumScores?: Record<string, number>
  ): Promise<(ZKProof | null)[]> {
    const proofs: (ZKProof | null)[] = [];
    
    for (const credentialId of credentialIds) {
      try {
        const proof = await this.generateZKProof(credentialId, revealedFields, minimumScores);
        proofs.push(proof);
      } catch (error) {
        console.error(`Failed to generate proof for ${credentialId}:`, error);
        proofs.push(null);
      }
    }

    return proofs;
  }
}
