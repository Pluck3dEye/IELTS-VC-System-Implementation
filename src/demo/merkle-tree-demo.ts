import { ZKManager } from '../core/zk-manager';
import { IELTSCredential } from '../types';

/**
 * Demonstration of how the Indexed Merkle Tree works in the VC System
 * This file shows step-by-step how credentials are added to the tree,
 * how the tree structure changes, and how proofs are generated.
 */
export class MerkleTreeDemo {
  private zkManager: ZKManager;

  constructor() {
    this.zkManager = new ZKManager();
  }

  async demonstrateIndexedMerkleTree(): Promise<void> {
    console.log('🌳 INDEXED MERKLE TREE DEMONSTRATION');
    console.log('=====================================\n');

    // Initialize the ZK Manager (which creates the Indexed Merkle Tree)
    console.log('1. Initializing Indexed Merkle Tree...');
    await this.zkManager.initialize();
    console.log('   ✅ Tree initialized with Poseidon hash function');
    console.log(`   📊 Initial tree root: ${this.zkManager.getMerkleRoot()}`);
    console.log('');

    // Create sample IELTS credentials
    const credentials = this.createSampleCredentials();

    // Demonstrate adding credentials one by one
    console.log('2. Adding credentials to the Indexed Merkle Tree...');
    console.log('   The tree maintains a sorted order and allows for efficient proofs\n');

    for (let i = 0; i < credentials.length; i++) {
      const credential = credentials[i];
      
      console.log(`   Adding Credential ${i + 1}: ${credential.name}`);
      console.log(`   Credential ID: ${credential.id}`);
      
      // Get root before insertion
      const rootBefore = this.zkManager.getMerkleRoot();
      console.log(`   Root before: ${rootBefore}`);
      
      // Add credential to tree
      const index = await this.zkManager.addCredential(credential);
      
      // Get root after insertion
      const rootAfter = this.zkManager.getMerkleRoot();
      console.log(`   Root after:  ${rootAfter}`);
      console.log(`   Tree index:  ${index}`);
      console.log(`   Root changed: ${rootBefore !== rootAfter ? '✅ Yes' : '❌ No'}`);
      console.log('');
    }

    // Show the current state of the tree
    await this.showTreeState();

    // Demonstrate ZK proof generation
    await this.demonstrateZKProofs(credentials);

    // Demonstrate proof verification
    await this.demonstrateProofVerification(credentials[0]);

    console.log('🎉 Indexed Merkle Tree demonstration completed!');
  }

  private async showTreeState(): Promise<void> {
    console.log('3. Current Tree State');
    console.log('   =================');
    console.log(`   🌳 Current Merkle Root: ${this.zkManager.getMerkleRoot()}`);
    console.log(`   📊 Number of credentials stored: ${this.zkManager['credentials'].size}`);
    console.log('');
    
    // Show all leaf nodes (credential hashes)
    console.log('   Leaf Nodes (Credential Hashes):');
    const leafNodes = this.zkManager['leafNodes'];
    let counter = 0;
    for (const [credentialId, hash] of leafNodes) {
      console.log(`   ${counter}: ${hash.toString().substring(0, 20)}... (${credentialId})`);
      counter++;
    }
    console.log('');
  }

  private async demonstrateZKProofs(credentials: IELTSCredential[]): Promise<void> {
    console.log('4. Zero-Knowledge Proof Generation');
    console.log('   ================================');
    console.log('   ZK proofs allow selective disclosure without revealing full credential\n');

    const testCredential = credentials[0];
    
    // Generate proof with selective disclosure
    console.log(`   Generating ZK proof for: ${testCredential.name}`);
    console.log('   Revealing only: name, overall score');
    
    try {
      const zkProof = await this.zkManager.generateZKProof(
        testCredential.id,
        ['name', 'scores.overall']
      );

      console.log('   ✅ ZK Proof generated successfully!');
      console.log(`   Proof Type: ${zkProof.type}`);
      console.log(`   Merkle Root in Proof: ${zkProof.merkleRoot}`);
      console.log(`   Revealed Attributes:`);
      Object.entries(zkProof.revealedAttributes).forEach(([key, value]) => {
        console.log(`     - ${key}: ${value}`);
      });
      console.log(`   ZK Proof Structure:`);
      console.log(`     - Leaf: ${zkProof.zkProof.leaf.substring(0, 20)}...`);
      console.log(`     - Root: ${zkProof.zkProof.root}`);
      console.log('');

      // Demonstrate proof with minimum score requirements
      console.log('   Generating ZK proof with minimum score requirements...');
      try {
        const zkProofWithReqs = await this.zkManager.generateZKProof(
          testCredential.id,
          ['name', 'scores.overall'],
          { overall: 7.0, speaking: 7.0 } // Minimum requirements
        );
        console.log('   ✅ Proof with score requirements generated successfully!');
      } catch (error) {
        console.log(`   ❌ Proof failed: ${(error as Error).message}`);
      }
      console.log('');

    } catch (error) {
      console.log(`   ❌ Failed to generate ZK proof: ${(error as Error).message}`);
    }
  }

  private async demonstrateProofVerification(credential: IELTSCredential): Promise<void> {
    console.log('5. Zero-Knowledge Proof Verification');
    console.log('   ==================================');
    console.log('   Verification ensures proof integrity without access to original data\n');

    try {
      // Generate a proof first
      const zkProof = await this.zkManager.generateZKProof(
        credential.id,
        ['name', 'scores.overall']
      );

      console.log('   Verifying the generated ZK proof...');
      const isValid = await this.zkManager.verifyZKProof(zkProof);
      
      console.log(`   Verification Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      
      if (isValid) {
        console.log('   ✅ Proof verification successful!');
        console.log('   The proof demonstrates:');
        console.log('     - Credential exists in the merkle tree');
        console.log('     - Revealed attributes are authentic');
        console.log('     - Hidden attributes remain private');
      }
      console.log('');

      // Demonstrate verification with expected root
      console.log('   Verifying proof against expected merkle root...');
      const currentRoot = this.zkManager.getMerkleRoot();
      const isValidWithRoot = await this.zkManager.verifyZKProof(zkProof, currentRoot);
      console.log(`   Root Verification: ${isValidWithRoot ? '✅ MATCHES' : '❌ MISMATCH'}`);
      console.log('');

    } catch (error) {
      console.log(`   ❌ Verification failed: ${(error as Error).message}`);
    }
  }

  private createSampleCredentials(): IELTSCredential[] {
    return [
      {
        id: 'demo-credential-1',
        holder: 'did:example:holder:alice',
        name: 'Alice Johnson',
        dateOfBirth: '1995-03-15',
        scores: {
          listening: 8.5,
          reading: 8.0,
          writing: 7.5,
          speaking: 8.0,
          overall: 8.0
        },
        certificationDate: '2024-01-15',
        expiryDate: '2026-01-15',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024001001'
      },
      {
        id: 'demo-credential-2',
        holder: 'did:example:holder:bob',
        name: 'Bob Smith',
        dateOfBirth: '1992-07-22',
        scores: {
          listening: 7.0,
          reading: 7.5,
          writing: 6.5,
          speaking: 7.0,
          overall: 7.0
        },
        certificationDate: '2024-02-10',
        expiryDate: '2026-02-10',
        testCenter: 'IDP Sydney',
        certificateNumber: 'IDP2024002001'
      },
      {
        id: 'demo-credential-3',
        holder: 'did:example:holder:charlie',
        name: 'Charlie Brown',
        dateOfBirth: '1988-11-30',
        scores: {
          listening: 9.0,
          reading: 8.5,
          writing: 8.0,
          speaking: 8.5,
          overall: 8.5
        },
        certificationDate: '2024-03-05',
        expiryDate: '2026-03-05',
        testCenter: 'British Council Manchester',
        certificateNumber: 'BC2024003001'
      }
    ];
  }
}

// Function to run the demonstration
export async function runMerkleTreeDemo(): Promise<void> {
  const demo = new MerkleTreeDemo();
  await demo.demonstrateIndexedMerkleTree();
}

// Run demonstration if this file is executed directly
if (require.main === module) {
  runMerkleTreeDemo().catch(console.error);
}
