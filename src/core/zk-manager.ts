import { IndexedMerkleTree } from '@jayanth-kumar-morem/indexed-merkle-tree';
import { IELTSCredential, ZKProof } from '../types';

// Import circomlibjs
const circomlibjs = require('circomlibjs');

export class ZKManager {
  private merkleTree: IndexedMerkleTree | null;
  private credentials: Map<string, IELTSCredential>;
  private leafNodes: Map<string, bigint>;
  private poseidonHash: any;

  constructor(depth: number = 20) {
    this.merkleTree = null;
    this.credentials = new Map();
    this.leafNodes = new Map();
    this.poseidonHash = null;
  }

  async initialize(): Promise<void> {
    // Build the Poseidon hash function
    this.poseidonHash = await circomlibjs.buildPoseidon();
    
    // Create the merkle tree (no parameters needed)
    this.merkleTree = new IndexedMerkleTree();
  }

  async addCredential(credential: IELTSCredential): Promise<number> {
    // Initialize if not already done
    if (!this.merkleTree || !this.poseidonHash) {
      await this.initialize();
    }

    // Hash the credential
    const credentialHash = await this.hashCredential(credential);
    
    // Add to merkle tree - the library handles indexing internally
    await this.merkleTree!.insert(credentialHash);
    
    // Store credential reference and hash
    this.credentials.set(credential.id, credential);
    this.leafNodes.set(credential.id, credentialHash);
    
    // Return a simple index based on our internal tracking
    return this.credentials.size - 1;
  }

  async generateZKProof(
    credentialId: string,
    revealedFields: string[],
    minimumScores?: Record<string, number>
  ): Promise<ZKProof> {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    const credentialHash = this.leafNodes.get(credentialId);
    if (!credentialHash) {
      throw new Error('Credential hash not found');
    }

    // Generate a simple merkle proof structure
    const merkleProof = {
      leaf: credentialHash.toString(),
      path: [], // Simplified - in real implementation would contain actual path
      indices: [],
      root: this.getMerkleTreeRoot()
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

    return {
      type: 'IndexedMerkleTreeProof2023',
      created: new Date().toISOString(),
      proofPurpose: 'authentication',
      merkleRoot: this.getMerkleTreeRoot(),
      zkProof: merkleProof,
      revealedAttributes
    };
  }

  async verifyZKProof(proof: ZKProof, expectedRoot?: string): Promise<boolean> {
    try {
      // Verify merkle proof structure
      if (!proof.zkProof || !proof.merkleRoot) {
        return false;
      }

      // If expected root is provided, verify it matches
      if (expectedRoot && proof.merkleRoot !== expectedRoot) {
        return false;
      }

      // In a proper ZK system, we would verify the proof independently
      // without needing to match our local tree state.
      // For this demo, we verify the proof structure and that it has a valid merkle root
      const hasValidStructure = this.verifyMerkleProof(proof.zkProof);
      const hasValidRoot = !!(proof.merkleRoot && proof.merkleRoot !== '0');
      
      return hasValidStructure && hasValidRoot;
    } catch (error) {
      console.error('ZK proof verification failed:', error);
      return false;
    }
  }

  private verifyMerkleProof(merkleProof: any): boolean {
    // Basic merkle proof verification
    // In a production system, this would verify the actual merkle path
    return !!(merkleProof && merkleProof.leaf && merkleProof.root);
  }

  getMerkleRoot(): string {
    return this.getMerkleTreeRoot();
  }

  private getMerkleTreeRoot(): string {
    // Check if tree is initialized
    if (!this.merkleTree) {
      return '0';
    }
    
    // Get root from the indexed merkle tree
    try {
      return this.merkleTree.root.toString();
    } catch (error) {
      // If the library doesn't expose root directly, use a simplified calculation
      const leaves = Array.from(this.leafNodes.values());
      if (leaves.length === 0) {
        return '0';
      }
      
      // Calculate merkle root using Poseidon hash
      let currentLevel = leaves;
      while (currentLevel.length > 1) {
        const nextLevel: bigint[] = [];
        for (let i = 0; i < currentLevel.length; i += 2) {
          const left = currentLevel[i];
          const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : BigInt(0);
          nextLevel.push(this.poseidonHash([left, right]));
        }
        currentLevel = nextLevel;
      }
      
      return currentLevel[0].toString();
    }
  }

  private async hashCredential(credential: IELTSCredential): Promise<bigint> {
    // Create a deterministic hash of the credential using Poseidon
    const data = [
      credential.id,
      credential.holder,
      credential.name,
      credential.dateOfBirth,
      credential.scores.listening.toString(),
      credential.scores.reading.toString(),
      credential.scores.writing.toString(),
      credential.scores.speaking.toString(),
      credential.scores.overall.toString(),
      credential.certificationDate,
      credential.expiryDate,
      credential.testCenter,
      credential.certificateNumber
    ].join('|');

    const dataBytes = new TextEncoder().encode(data);
    const chunks: bigint[] = [];
    
    // Split data into chunks that fit into bigint
    for (let i = 0; i < dataBytes.length; i += 31) {
      const chunk = dataBytes.slice(i, i + 31);
      let value = BigInt(0);
      for (let j = 0; j < chunk.length; j++) {
        value = (value << BigInt(8)) | BigInt(chunk[j]);
      }
      chunks.push(value);
    }

    // Hash the chunks using Poseidon
    let hash;
    if (chunks.length === 1) {
      hash = this.poseidonHash([chunks[0]]);
    } else {
      hash = this.poseidonHash(chunks);
    }
    
    // Convert Poseidon hash result to bigint
    if (hash instanceof Uint8Array) {
      // Convert Uint8Array to BigInt
      let result = BigInt(0);
      for (let i = 0; i < hash.length; i++) {
        result = (result << BigInt(8)) | BigInt(hash[i]);
      }
      return result;
    } else if (typeof hash === 'bigint') {
      return hash;
    } else {
      // Try to convert to bigint
      return BigInt(hash);
    }
  }
}
