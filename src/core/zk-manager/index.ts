import { 
  IELTSCredential, 
  ZKProof, 
  TreeMetrics, 
  PerformanceReport,
  RangeProofResult,
  SetMembershipProofResult,
  AggregatedProofResult,
  AggregationType
} from './types';

import { HashingUtils } from './hashing-utils';
import { PerformanceManager } from './performance-manager';
import { MerkleTreeManager } from './merkle-tree-manager';
import { ProofGenerator } from './proof-generator';
import { ProofVerifier } from './proof-verifier';
import { StateManager } from './state-manager';
import { AdvancedProofs } from './advanced-proofs';

export class ZKManager {
  private hashingUtils: HashingUtils;
  private performanceManager: PerformanceManager;
  private merkleTreeManager: MerkleTreeManager;
  private proofGenerator: ProofGenerator;
  private proofVerifier: ProofVerifier;
  private stateManager: StateManager;
  private advancedProofs: AdvancedProofs;

  constructor(depth: number = 20) {
    // Initialize utilities
    this.hashingUtils = new HashingUtils();
    this.performanceManager = new PerformanceManager();
    
    // Initialize managers
    this.merkleTreeManager = new MerkleTreeManager(this.hashingUtils);
    this.proofGenerator = new ProofGenerator(this.merkleTreeManager, this.hashingUtils);
    this.proofVerifier = new ProofVerifier(this.merkleTreeManager, this.hashingUtils);
    this.stateManager = new StateManager(this.merkleTreeManager, this.hashingUtils);
    this.advancedProofs = new AdvancedProofs(this.merkleTreeManager, this.proofGenerator, this.hashingUtils);
  }

  async initialize(): Promise<void> {
    await this.hashingUtils.initialize();
    await this.merkleTreeManager.initialize();
  }

  // Credential Management
  async addCredential(credential: IELTSCredential): Promise<number> {
    const startTime = Date.now();
    
    // Initialize if not already done
    if (!this.hashingUtils.getPoseidonHash()) {
      await this.initialize();
    }

    try {
      const index = await this.merkleTreeManager.addCredential(credential);
      
      // Update performance metrics
      const endTime = Date.now();
      this.performanceManager.recordCredentialAddition(endTime - startTime);
      
      return index;
    } catch (error) {
      throw error;
    }
  }

  async addCredentialsBatch(credentials: IELTSCredential[]): Promise<number[]> {
    return this.merkleTreeManager.addCredentialsBatch(credentials);
  }

  // Proof Generation
  async generateZKProof(
    credentialId: string,
    revealedFields: string[],
    minimumScores?: Record<string, number>
  ): Promise<ZKProof> {
    const startTime = Date.now();
    
    try {
      const proof = await this.proofGenerator.generateZKProof(credentialId, revealedFields, minimumScores);
      
      // Update performance metrics
      const endTime = Date.now();
      this.performanceManager.recordProofGeneration(endTime - startTime);
      
      return proof;
    } catch (error) {
      throw error;
    }
  }

  async generateZKProofsBatch(
    credentialIds: string[],
    revealedFields: string[],
    minimumScores?: Record<string, number>
  ): Promise<(ZKProof | null)[]> {
    return this.proofGenerator.generateZKProofsBatch(credentialIds, revealedFields, minimumScores);
  }

  // Proof Verification
  async verifyZKProof(proof: ZKProof, expectedRoot?: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const result = await this.proofVerifier.verifyZKProof(proof, expectedRoot);
      
      // Update performance metrics
      const endTime = Date.now();
      this.performanceManager.recordProofVerification(endTime - startTime);
      
      return result;
    } catch (error) {
      console.error('ZK proof verification failed:', error);
      return false;
    }
  }

  // Advanced Proof Features
  async generateRangeProof(
    credentialId: string,
    field: string,
    minValue: number,
    maxValue: number
  ): Promise<RangeProofResult> {
    return this.advancedProofs.generateRangeProof(credentialId, field, minValue, maxValue);
  }

  async generateSetMembershipProof(
    credentialId: string,
    field: string,
    validSet: (string | number)[]
  ): Promise<SetMembershipProofResult> {
    return this.advancedProofs.generateSetMembershipProof(credentialId, field, validSet);
  }

  async generateAggregatedProof(
    credentialIds: string[],
    aggregationType: AggregationType,
    field: string,
    threshold?: number
  ): Promise<AggregatedProofResult> {
    return this.advancedProofs.generateAggregatedProof(credentialIds, aggregationType, field, threshold);
  }

  // State Management
  async saveTreeState(filePath: string): Promise<void> {
    return this.stateManager.saveTreeState(filePath);
  }

  async loadTreeState(filePath: string): Promise<void> {
    return this.stateManager.loadTreeState(filePath);
  }

  // Metrics and Information
  getMerkleRoot(): string {
    return this.merkleTreeManager.getRoot();
  }

  getTreeMetrics(): TreeMetrics {
    return this.merkleTreeManager.getMetrics();
  }

  getPerformanceMetrics(): PerformanceReport {
    return this.performanceManager.getMetrics();
  }

  resetPerformanceMetrics(): void {
    this.performanceManager.reset();
  }
}
