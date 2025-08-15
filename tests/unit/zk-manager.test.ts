import { ZKManager } from '../../src/core/zk-manager';
import { IELTSCredential } from '../../src/types';

describe('ZKManager', () => {
  let zkManager: ZKManager;
  let testCredential: IELTSCredential;

  beforeEach(async () => {
    zkManager = new ZKManager();
    await zkManager.initialize();
    
    testCredential = {
      id: 'zk-test-credential-1',
      holder: 'did:example:holder:zktest',
      name: 'ZK Test User',
      dateOfBirth: '1995-05-15',
      scores: {
        listening: 8.5,
        reading: 8.0,
        writing: 7.5,
        speaking: 8.0,
        overall: 8.0
      },
      certificationDate: '2024-02-01',
      expiryDate: '2026-02-01',
      testCenter: 'ZK Test Center',
      certificateNumber: 'ZK001'
    };
  }, 30000);

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const newManager = new ZKManager();
      await expect(newManager.initialize()).resolves.not.toThrow();
    }, 30000);
  });

  describe('Credential Management', () => {
    test('should add credential to merkle tree', async () => {
      const index = await zkManager.addCredential(testCredential);
      
      expect(typeof index).toBe('number');
      expect(index).toBeGreaterThanOrEqual(0);
    }, 30000);

    test('should generate merkle root after adding credential', async () => {
      await zkManager.addCredential(testCredential);
      const root = zkManager.getMerkleRoot();
      
      expect(typeof root).toBe('string');
      expect(root).not.toBe('0');
      expect(root.length).toBeGreaterThan(0);
    }, 30000);

    test('should handle multiple credentials', async () => {
      const credential2 = { ...testCredential, id: 'zk-test-credential-2', name: 'User Two' };
      const credential3 = { ...testCredential, id: 'zk-test-credential-3', name: 'User Three' };
      
      const index1 = await zkManager.addCredential(testCredential);
      const index2 = await zkManager.addCredential(credential2);
      const index3 = await zkManager.addCredential(credential3);
      
      expect(index1).toBe(0);
      expect(index2).toBe(1);
      expect(index3).toBe(2);
      
      const root = zkManager.getMerkleRoot();
      expect(root).not.toBe('0');
    }, 30000);
  });

  describe('ZK Proof Generation', () => {
    test('should generate ZK proof with revealed fields', async () => {
      await zkManager.addCredential(testCredential);
      
      const zkProof = await zkManager.generateZKProof(
        testCredential.id,
        ['name', 'scores.overall']
      );
      
      expect(zkProof).toBeDefined();
      expect(zkProof.type).toBe('IndexedMerkleTreeProof2023');
      expect(zkProof.merkleRoot).toBeDefined();
      expect(zkProof.zkProof).toBeDefined();
      expect(zkProof.revealedAttributes).toBeDefined();
      expect(zkProof.revealedAttributes.name).toBe(testCredential.name);
      expect(zkProof.revealedAttributes['scores.overall']).toBe(testCredential.scores.overall);
    }, 30000);

    test('should enforce minimum score requirements', async () => {
      await zkManager.addCredential(testCredential);
      
      // This should succeed (testCredential has overall score of 8.0)
      const zkProof = await zkManager.generateZKProof(
        testCredential.id,
        ['name'],
        { overall: 7.5 }
      );
      expect(zkProof).toBeDefined();
      
      // This should fail (requirement is higher than actual score)
      await expect(
        zkManager.generateZKProof(
          testCredential.id,
          ['name'],
          { overall: 8.5 }
        )
      ).rejects.toThrow('Minimum score requirement not met');
    }, 30000);

    test('should handle selective disclosure of different score types', async () => {
      await zkManager.addCredential(testCredential);
      
      const zkProof = await zkManager.generateZKProof(
        testCredential.id,
        ['scores.listening', 'scores.reading', 'scores.writing', 'scores.speaking']
      );
      
      expect(zkProof.revealedAttributes['scores.listening']).toBe(8.5);
      expect(zkProof.revealedAttributes['scores.reading']).toBe(8.0);
      expect(zkProof.revealedAttributes['scores.writing']).toBe(7.5);
      expect(zkProof.revealedAttributes['scores.speaking']).toBe(8.0);
    }, 30000);

    test('should fail for non-existent credential', async () => {
      await expect(
        zkManager.generateZKProof('non-existent', ['name'])
      ).rejects.toThrow('Credential not found');
    }, 30000);
  });

  describe('ZK Proof Verification', () => {
    test('should verify valid ZK proof', async () => {
      await zkManager.addCredential(testCredential);
      
      const zkProof = await zkManager.generateZKProof(
        testCredential.id,
        ['name', 'scores.overall']
      );
      
      const isValid = await zkManager.verifyZKProof(zkProof);
      expect(isValid).toBe(true);
    }, 30000);

    test('should reject proof with missing components', async () => {
      const invalidProof = {
        type: 'IndexedMerkleTreeProof2023',
        created: new Date().toISOString(),
        proofPurpose: 'authentication',
        merkleRoot: '',
        zkProof: null,
        revealedAttributes: {}
      };
      
      const isValid = await zkManager.verifyZKProof(invalidProof);
      expect(isValid).toBe(false);
    }, 30000);

    test('should accept proof with valid structure and root', async () => {
      await zkManager.addCredential(testCredential);
      
      const validProof = {
        type: 'IndexedMerkleTreeProof2023',
        created: new Date().toISOString(),
        proofPurpose: 'authentication',
        merkleRoot: '12345678901234567890',
        zkProof: {
          leaf: '123',
          path: [],
          indices: [],
          root: '12345678901234567890'
        },
        revealedAttributes: { name: 'Test' }
      };
      
      const isValid = await zkManager.verifyZKProof(validProof);
      expect(isValid).toBe(true);
    }, 30000);
  });

  describe('Error Handling', () => {
    test('should handle uninitialized manager', async () => {
      const uninitializedManager = new ZKManager();
      
      // Should initialize automatically when adding credential
      await expect(
        uninitializedManager.addCredential(testCredential)
      ).resolves.not.toThrow();
    }, 30000);

    test('should handle credential with missing optional fields', async () => {
      const incompleteCredential = {
        ...testCredential,
        testCenter: undefined,
        certificateNumber: undefined
      };
      
      // Should still work as testCenter and certificateNumber are handled gracefully
      await expect(
        zkManager.addCredential(incompleteCredential as any)
      ).resolves.not.toThrow();
    }, 30000);
  });
});
