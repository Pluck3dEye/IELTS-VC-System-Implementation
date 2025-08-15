import { ZKManager } from '../../src/core/zk-manager';
import { IELTSCredential } from '../../src/types';

describe('ZKManager Advanced Features', () => {
  let zkManager: ZKManager;

  beforeEach(async () => {
    zkManager = new ZKManager();
    await zkManager.initialize();
  });

  describe('Batch Operations', () => {
    test('should add multiple credentials in batch', async () => {
      const credentials: IELTSCredential[] = [
        {
          id: 'batch-cred-1',
          holder: 'did:example:holder:alice',
          name: 'Alice Batch',
          dateOfBirth: '1995-01-01',
          scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
          certificationDate: '2024-01-01',
          expiryDate: '2026-01-01',
          testCenter: 'Batch Center 1',
          certificateNumber: 'BATCH001'
        },
        {
          id: 'batch-cred-2',
          holder: 'did:example:holder:bob',
          name: 'Bob Batch',
          dateOfBirth: '1992-01-01',
          scores: { listening: 7.0, reading: 8.0, writing: 6.5, speaking: 7.5, overall: 7.0 },
          certificationDate: '2024-02-01',
          expiryDate: '2026-02-01',
          testCenter: 'Batch Center 2',
          certificateNumber: 'BATCH002'
        }
      ];

      const indices = await zkManager.addCredentialsBatch(credentials);
      
      expect(indices).toHaveLength(2);
      expect(indices[0]).toBe(0);
      expect(indices[1]).toBe(1);
    }, 30000);

    test('should generate multiple ZK proofs in batch', async () => {
      const credential1: IELTSCredential = {
        id: 'batch-proof-1',
        holder: 'did:example:holder:alice',
        name: 'Alice Proof',
        dateOfBirth: '1995-01-01',
        scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
        certificationDate: '2024-01-01',
        expiryDate: '2026-01-01',
        testCenter: 'Proof Center 1',
        certificateNumber: 'PROOF001'
      };

      const credential2: IELTSCredential = {
        id: 'batch-proof-2',
        holder: 'did:example:holder:bob',
        name: 'Bob Proof',
        dateOfBirth: '1992-01-01',
        scores: { listening: 7.0, reading: 8.0, writing: 6.5, speaking: 7.5, overall: 7.0 },
        certificationDate: '2024-02-01',
        expiryDate: '2026-02-01',
        testCenter: 'Proof Center 2',
        certificateNumber: 'PROOF002'
      };

      await zkManager.addCredential(credential1);
      await zkManager.addCredential(credential2);

      const proofs = await zkManager.generateZKProofsBatch(
        ['batch-proof-1', 'batch-proof-2'],
        ['name', 'scores.overall']
      );

      expect(proofs).toHaveLength(2);
      expect(proofs[0]).toBeTruthy();
      expect(proofs[1]).toBeTruthy();
      expect(proofs[0]?.type).toBe('IndexedMerkleTreeProof2023');
      expect(proofs[1]?.type).toBe('IndexedMerkleTreeProof2023');
    }, 30000);
  });

  describe('Performance Monitoring', () => {
    test('should track performance metrics', async () => {
      // Reset metrics first
      zkManager.resetPerformanceMetrics();

      const credential: IELTSCredential = {
        id: 'perf-test-cred',
        holder: 'did:example:holder:alice',
        name: 'Alice Performance',
        dateOfBirth: '1995-01-01',
        scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
        certificationDate: '2024-01-01',
        expiryDate: '2026-01-01',
        testCenter: 'Performance Center',
        certificateNumber: 'PERF001'
      };

      await zkManager.addCredential(credential);
      const zkProof = await zkManager.generateZKProof('perf-test-cred', ['name']);
      await zkManager.verifyZKProof(zkProof);

      const metrics = zkManager.getPerformanceMetrics();
      
      expect(metrics.operations.credentialAdditions).toBe(1);
      expect(metrics.operations.proofGenerations).toBe(1);
      expect(metrics.operations.proofVerifications).toBe(1);
      expect(metrics.averageTimes.credentialAddition).toBeGreaterThanOrEqual(0);
      expect(metrics.averageTimes.proofGeneration).toBeGreaterThanOrEqual(0);
      expect(metrics.averageTimes.proofVerification).toBeGreaterThanOrEqual(0);
    }, 30000);

    test('should provide tree metrics', async () => {
      const credential: IELTSCredential = {
        id: 'metrics-cred',
        holder: 'did:example:holder:alice',
        name: 'Alice Metrics',
        dateOfBirth: '1995-01-01',
        scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
        certificationDate: '2024-01-01',
        expiryDate: '2026-01-01',
        testCenter: 'Metrics Center',
        certificateNumber: 'METRICS001'
      };

      await zkManager.addCredential(credential);
      const metrics = zkManager.getTreeMetrics();

      expect(metrics.totalCredentials).toBe(1);
      expect(metrics.treeSize).toBeGreaterThan(0);
      expect(metrics.treeRoot).toBeTruthy();
      expect(metrics.depth).toBe(32);
      expect(metrics.memoryUsage.credentials).toBe(1);
      expect(metrics.memoryUsage.leafNodes).toBe(1);
      expect(metrics.memoryUsage.indices).toBe(1);
    }, 30000);
  });

  describe('Advanced ZK Features', () => {
    test('should generate range proofs', async () => {
      const credential: IELTSCredential = {
        id: 'range-proof-cred',
        holder: 'did:example:holder:alice',
        name: 'Alice Range',
        dateOfBirth: '1995-01-01',
        scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
        certificationDate: '2024-01-01',
        expiryDate: '2026-01-01',
        testCenter: 'Range Center',
        certificateNumber: 'RANGE001'
      };

      await zkManager.addCredential(credential);
      
      // Test range proof with value in range
      const inRangeResult = await zkManager.generateRangeProof(
        'range-proof-cred',
        'scores.overall',
        7.0,
        8.0
      );

      expect(inRangeResult.inRange).toBe(true);
      expect(inRangeResult.actualInRange).toBe(true);
      expect(inRangeResult.proof).toBeTruthy();

      // Test range proof with value out of range
      const outOfRangeResult = await zkManager.generateRangeProof(
        'range-proof-cred',
        'scores.overall',
        8.0,
        9.0
      );

      expect(outOfRangeResult.inRange).toBe(false);
      expect(outOfRangeResult.actualInRange).toBe(false);
    }, 30000);

    test('should generate set membership proofs', async () => {
      const credential: IELTSCredential = {
        id: 'set-membership-cred',
        holder: 'did:example:holder:alice',
        name: 'Alice Set',
        dateOfBirth: '1995-01-01',
        scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
        certificationDate: '2024-01-01',
        expiryDate: '2026-01-01',
        testCenter: 'Set Center',
        certificateNumber: 'SET001'
      };

      await zkManager.addCredential(credential);
      
      // Test set membership with valid value
      const memberResult = await zkManager.generateSetMembershipProof(
        'set-membership-cred',
        'scores.overall',
        [7.0, 7.5, 8.0, 8.5]
      );

      expect(memberResult.isMember).toBe(true);
      expect(memberResult.proof).toBeTruthy();

      // Test set membership with invalid value
      const nonMemberResult = await zkManager.generateSetMembershipProof(
        'set-membership-cred',
        'scores.overall',
        [6.0, 6.5, 9.0]
      );

      expect(nonMemberResult.isMember).toBe(false);
    }, 30000);

    test('should generate aggregated proofs', async () => {
      const credentials: IELTSCredential[] = [
        {
          id: 'agg-cred-1',
          holder: 'did:example:holder:alice',
          name: 'Alice Agg',
          dateOfBirth: '1995-01-01',
          scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
          certificationDate: '2024-01-01',
          expiryDate: '2026-01-01',
          testCenter: 'Agg Center 1',
          certificateNumber: 'AGG001'
        },
        {
          id: 'agg-cred-2',
          holder: 'did:example:holder:bob',
          name: 'Bob Agg',
          dateOfBirth: '1992-01-01',
          scores: { listening: 7.0, reading: 8.0, writing: 6.5, speaking: 7.5, overall: 7.0 },
          certificationDate: '2024-02-01',
          expiryDate: '2026-02-01',
          testCenter: 'Agg Center 2',
          certificateNumber: 'AGG002'
        }
      ];

      await zkManager.addCredentialsBatch(credentials);

      // Test average aggregation
      const avgResult = await zkManager.generateAggregatedProof(
        ['agg-cred-1', 'agg-cred-2'],
        'average',
        'scores.overall',
        7.0
      );

      expect(avgResult.aggregatedValue).toBe(7.25); // (7.5 + 7.0) / 2
      expect(avgResult.meetsThreshold).toBe(true);

      // Test minimum aggregation
      const minResult = await zkManager.generateAggregatedProof(
        ['agg-cred-1', 'agg-cred-2'],
        'minimum',
        'scores.overall'
      );

      expect(minResult.aggregatedValue).toBe(7.0);
    }, 30000);
  });

  describe('Tree State Persistence', () => {
    test('should save and load tree state', async () => {
      const credential: IELTSCredential = {
        id: 'persistence-cred',
        holder: 'did:example:holder:alice',
        name: 'Alice Persistence',
        dateOfBirth: '1995-01-01',
        scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
        certificationDate: '2024-01-01',
        expiryDate: '2026-01-01',
        testCenter: 'Persistence Center',
        certificateNumber: 'PERSIST001'
      };

      await zkManager.addCredential(credential);
      const originalRoot = zkManager.getMerkleRoot();
      const originalMetrics = zkManager.getTreeMetrics();

      // Save state
      const filePath = './test-tree-state.json';
      await zkManager.saveTreeState(filePath);

      // Create new manager and load state
      const newZkManager = new ZKManager();
      await newZkManager.loadTreeState(filePath);

      const loadedRoot = newZkManager.getMerkleRoot();
      const loadedMetrics = newZkManager.getTreeMetrics();

      expect(loadedRoot).toBe(originalRoot);
      expect(loadedMetrics.totalCredentials).toBe(originalMetrics.totalCredentials);
      expect(loadedMetrics.treeSize).toBe(originalMetrics.treeSize);

      // Cleanup
      const fs = require('fs');
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (fs.existsSync(filePath.replace('.json', '-state.json'))) {
        fs.unlinkSync(filePath.replace('.json', '-state.json'));
      }
    }, 30000);
  });
});
