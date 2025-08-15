import { ZKManager } from '../../src/core/zk-manager';
import { IELTSCredential } from '../../src/types';

describe('Indexed Merkle Tree Demonstration', () => {
  let zkManager: ZKManager;

  beforeEach(async () => {
    zkManager = new ZKManager();
    await zkManager.initialize();
  });

  test('should demonstrate indexed merkle tree operations step by step', async () => {
    console.log('\n🌳 INDEXED MERKLE TREE TEST DEMONSTRATION');
    console.log('==========================================');

    // Initial state
    const initialRoot = zkManager.getMerkleRoot();
    console.log(`📊 Initial tree root: ${initialRoot}`);
    
    // Create test credentials
    const credential1: IELTSCredential = {
      id: 'test-cred-1',
      holder: 'did:example:holder:alice',
      name: 'Alice Test',
      dateOfBirth: '1995-01-01',
      scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
      certificationDate: '2024-01-01',
      expiryDate: '2026-01-01',
      testCenter: 'Test Center 1',
      certificateNumber: 'TEST001'
    };

    const credential2: IELTSCredential = {
      id: 'test-cred-2',
      holder: 'did:example:holder:bob',
      name: 'Bob Test',
      dateOfBirth: '1992-01-01',
      scores: { listening: 7.0, reading: 8.0, writing: 6.5, speaking: 7.5, overall: 7.0 },
      certificationDate: '2024-02-01',
      expiryDate: '2026-02-01',
      testCenter: 'Test Center 2',
      certificateNumber: 'TEST002'
    };

    // Add first credential
    console.log('\n📝 Adding first credential to tree...');
    const index1 = await zkManager.addCredential(credential1);
    const root1 = zkManager.getMerkleRoot();
    console.log(`   Index: ${index1}`);
    console.log(`   New root: ${root1}`);
    console.log(`   Root changed: ${initialRoot !== root1 ? 'Yes ✅' : 'No ❌'}`);

    // Add second credential
    console.log('\n📝 Adding second credential to tree...');
    const index2 = await zkManager.addCredential(credential2);
    const root2 = zkManager.getMerkleRoot();
    console.log(`   Index: ${index2}`);
    console.log(`   New root: ${root2}`);
    console.log(`   Root changed: ${root1 !== root2 ? 'Yes ✅' : 'No ❌'}`);

    // Generate ZK proof
    console.log('\n🔐 Generating ZK proof for first credential...');
    const zkProof = await zkManager.generateZKProof(
      credential1.id,
      ['name', 'scores.overall']
    );
    
    console.log(`   Proof type: ${zkProof.type}`);
    console.log(`   Merkle root in proof: ${zkProof.merkleRoot}`);
    console.log(`   Revealed attributes:`, zkProof.revealedAttributes);

    // Verify proof
    console.log('\n✅ Verifying ZK proof...');
    const isValid = await zkManager.verifyZKProof(zkProof);
    console.log(`   Proof valid: ${isValid ? 'Yes ✅' : 'No ❌'}`);

    // Assertions
    expect(initialRoot).not.toBe('0'); // IndexedMerkleTree starts with a default root
    expect(root1).not.toBe(initialRoot); // Root changed after first insertion
    expect(root2).not.toBe(root1); // Root changed after second insertion
    expect(index1).toBe(0);
    expect(index2).toBe(1);
    expect(zkProof.type).toBe('IndexedMerkleTreeProof2023');
    expect(isValid).toBe(true);

    console.log('\n🎉 Indexed Merkle Tree demonstration completed!\n');
  }, 30000);

  test('should demonstrate merkle proof generation and verification', async () => {
    console.log('\n🔍 MERKLE PROOF DEMONSTRATION');
    console.log('=============================');

    const testCredential: IELTSCredential = {
      id: 'proof-test-cred',
      holder: 'did:example:holder:charlie',
      name: 'Charlie Proof Test',
      dateOfBirth: '1990-01-01',
      scores: { listening: 9.0, reading: 8.5, writing: 8.0, speaking: 8.5, overall: 8.5 },
      certificationDate: '2024-03-01',
      expiryDate: '2026-03-01',
      testCenter: 'Proof Test Center',
      certificateNumber: 'PROOF001'
    };

    // Add credential
    await zkManager.addCredential(testCredential);
    const treeRoot = zkManager.getMerkleRoot();
    console.log(`🌳 Tree root: ${treeRoot}`);

    // Test different revelation scenarios
    const scenarios = [
      { fields: ['name'], description: 'Name only' },
      { fields: ['name', 'scores.overall'], description: 'Name and overall score' },
      { fields: ['scores.listening', 'scores.speaking'], description: 'Specific skill scores' }
    ];

    for (const scenario of scenarios) {
      console.log(`\n📋 Testing revelation: ${scenario.description}`);
      
      const proof = await zkManager.generateZKProof(testCredential.id, scenario.fields);
      const isValid = await zkManager.verifyZKProof(proof);
      
      console.log(`   Fields: ${scenario.fields.join(', ')}`);
      console.log(`   Revealed:`, Object.keys(proof.revealedAttributes));
      console.log(`   Proof valid: ${isValid ? 'Yes ✅' : 'No ❌'}`);
      console.log(`   Merkle root matches: ${proof.merkleRoot === treeRoot ? 'Yes ✅' : 'No ❌'}`);
      
      expect(isValid).toBe(true);
      expect(proof.merkleRoot).toBe(treeRoot);
    }

    console.log('\n🎉 Merkle proof demonstration completed!\n');
  }, 30000);
});
