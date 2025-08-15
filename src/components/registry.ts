import { RegistryEntry, VerifiableCredential } from '../types';
import { ZKManager } from '../core/zk-manager';

export class Registry {
  private entries: Map<string, RegistryEntry>;
  private zkManager: ZKManager;
  private merkleTreeIndices: Map<string, number>;

  constructor() {
    this.entries = new Map();
    this.zkManager = new ZKManager();
    this.merkleTreeIndices = new Map();
  }

  async initialize(): Promise<void> {
    await this.zkManager.initialize();
  }

  async registerCredential(credential: VerifiableCredential): Promise<RegistryEntry> {
    const entry: RegistryEntry = {
      credentialId: credential.id,
      issuer: credential.issuer,
      holder: credential.credentialSubject.holder,
      issuanceDate: credential.issuanceDate,
      revoked: false
    };

    // Add to merkle tree for integrity
    const treeIndex = await this.zkManager.addCredential(credential.credentialSubject);
    entry.merkleTreeIndex = treeIndex;
    this.merkleTreeIndices.set(credential.id, treeIndex);

    this.entries.set(credential.id, entry);
    console.log(`Credential registered in registry: ${credential.id}`);
    
    return entry;
  }

  async revokeCredential(credentialId: string, issuer: string): Promise<boolean> {
    const entry = this.entries.get(credentialId);
    if (!entry) {
      return false; // Credential not found
    }

    if (entry.issuer !== issuer) {
      return false; // Unauthorized revocation attempt
    }

    entry.revoked = true;
    this.entries.set(credentialId, entry);
    
    console.log(`Credential revoked in registry: ${credentialId}`);
    return true;
  }

  isCredentialRevoked(credentialId: string): boolean {
    const entry = this.entries.get(credentialId);
    return entry ? entry.revoked : false;
  }

  getCredentialStatus(credentialId: string): string {
    const entry = this.entries.get(credentialId);
    if (!entry) {
      return 'not_found';
    }
    return entry.revoked ? 'revoked' : 'valid';
  }

  async verifyCredentialIntegrity(credentialId: string): Promise<boolean> {
    const entry = this.entries.get(credentialId);
    if (!entry || !entry.merkleTreeIndex) {
      return false;
    }

    // In a full implementation, this would verify the merkle proof
    // For now, we just check if the entry exists and is not revoked
    return !entry.revoked;
  }

  getMerkleRoot(): string {
    return this.zkManager.getMerkleRoot();
  }

  getAllEntries(): RegistryEntry[] {
    return Array.from(this.entries.values());
  }

  getEntriesByIssuer(issuer: string): RegistryEntry[] {
    return Array.from(this.entries.values()).filter(entry => entry.issuer === issuer);
  }

  getEntriesByHolder(holder: string): RegistryEntry[] {
    return Array.from(this.entries.values()).filter(entry => entry.holder === holder);
  }
}
