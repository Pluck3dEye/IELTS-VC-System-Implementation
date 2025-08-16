import { IndexedMerkleTree } from '@jayanth-kumar-morem/indexed-merkle-tree';
import { IELTSCredential } from './types';
import { MerkleTreeManager } from './merkle-tree-manager';
import { HashingUtils } from './hashing-utils';

export class StateManager {
  private merkleTreeManager: MerkleTreeManager;
  private hashingUtils: HashingUtils;

  constructor(merkleTreeManager: MerkleTreeManager, hashingUtils: HashingUtils) {
    this.merkleTreeManager = merkleTreeManager;
    this.hashingUtils = hashingUtils;
  }

  async saveTreeState(filePath: string): Promise<void> {
    const merkleTree = this.merkleTreeManager.getMerkleTree();
    if (!merkleTree) {
      throw new Error('Merkle tree not initialized');
    }

    try {
      // Save tree state using the library's built-in method
      await merkleTree.saveToFile(filePath);
      
      // Also save our internal mappings
      const additionalState = {
        credentials: Object.fromEntries(this.merkleTreeManager.getAllCredentials()),
        leafNodes: Object.fromEntries(
          Array.from(this.merkleTreeManager.getAllLeafNodes().entries()).map(([k, v]) => [k, v.toString()])
        ),
        credentialIndices: Object.fromEntries(this.merkleTreeManager.getAllCredentialIndices())
      };
      
      const fs = require('fs');
      const path = require('path');
      const stateFilePath = filePath.replace('.json', '-state.json');
      fs.writeFileSync(stateFilePath, JSON.stringify(additionalState, null, 2));
      
      console.log(`Tree state saved to ${filePath} and ${stateFilePath}`);
    } catch (error) {
      throw new Error(`Failed to save tree state: ${error}`);
    }
  }

  async loadTreeState(filePath: string): Promise<void> {
    try {
      const { IndexedMerkleTree } = require('@jayanth-kumar-morem/indexed-merkle-tree');
      
      // Load tree state using the library's built-in method
      const loadedTree = IndexedMerkleTree.loadFromFile(filePath);
      this.merkleTreeManager.setMerkleTree(loadedTree);
      
      // Load our internal mappings
      const fs = require('fs');
      const stateFilePath = filePath.replace('.json', '-state.json');
      
      if (fs.existsSync(stateFilePath)) {
        const additionalState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
        
        // Restore credentials
        const credentials = new Map<string, IELTSCredential>();
        for (const [id, credential] of Object.entries(additionalState.credentials)) {
          credentials.set(id, credential as IELTSCredential);
        }
        this.merkleTreeManager.setCredentials(credentials);
        
        // Restore leaf nodes
        const leafNodes = new Map<string, bigint>();
        for (const [id, hash] of Object.entries(additionalState.leafNodes)) {
          leafNodes.set(id, BigInt(hash as string));
        }
        this.merkleTreeManager.setLeafNodes(leafNodes);
        
        // Restore credential indices
        const credentialIndices = new Map<string, number>();
        for (const [id, index] of Object.entries(additionalState.credentialIndices)) {
          credentialIndices.set(id, index as number);
        }
        this.merkleTreeManager.setCredentialIndices(credentialIndices);
      }
      
      // Initialize Poseidon if not already done
      if (!this.hashingUtils.getPoseidonHash()) {
        await this.hashingUtils.initialize();
      }
      
      console.log(`Tree state loaded from ${filePath}`);
    } catch (error) {
      throw new Error(`Failed to load tree state: ${error}`);
    }
  }
}
