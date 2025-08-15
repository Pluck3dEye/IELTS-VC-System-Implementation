import { BBSManager } from '../core/bbs-manager';
import { ZKManager } from '../core/zk-manager';
import { IELTSCredential, VerifiableCredential, RegistryEntry } from '../types';

export class Issuer {
  private bbsManager: BBSManager;
  private zkManager: ZKManager;
  private issuerId: string;
  private issuedCredentials: Map<string, VerifiableCredential>;

  constructor(issuerId: string) {
    this.issuerId = issuerId;
    this.bbsManager = new BBSManager();
    this.zkManager = new ZKManager();
    this.issuedCredentials = new Map();
  }

  async initialize(): Promise<void> {
    await this.bbsManager.generateKeyPair();
    await this.zkManager.initialize();
  }

  async issueIELTSCredential(credentialData: IELTSCredential | Omit<IELTSCredential, 'id'>): Promise<VerifiableCredential> {
    // Use provided ID or generate unique credential ID
    const credentialId = 'id' in credentialData && credentialData.id 
      ? credentialData.id 
      : `ielts-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    const credential: IELTSCredential = 'id' in credentialData && credentialData.id
      ? credentialData as IELTSCredential
      : {
          id: credentialId,
          ...(credentialData as Omit<IELTSCredential, 'id'>)
        };

    // Sign with BBS
    const proof = await this.bbsManager.signCredential(credential);
    
    // Add to ZK merkle tree for privacy features
    await this.zkManager.addCredential(credential);

    const verifiableCredential: VerifiableCredential = {
      id: credentialId,
      type: ['VerifiableCredential', 'IELTSCredential'],
      issuer: this.issuerId,
      issuanceDate: new Date().toISOString(),
      credentialSubject: credential,
      proof
    };

    // Store issued credential
    this.issuedCredentials.set(credentialId, verifiableCredential);

    console.log(`✅ IELTS Credential issued for ${credential.name} with ID: ${credentialId}`);
    
    return verifiableCredential;
  }

  async revokeCredential(credentialId: string): Promise<boolean> {
    if (!this.issuedCredentials.has(credentialId)) {
      throw new Error('Credential not found');
    }

    // In a real implementation, this would update the blockchain registry
    this.issuedCredentials.delete(credentialId);
  console.log(`Credential ${credentialId} has been revoked`);
    
    return true;
  }

  getPublicKey(): Uint8Array {
    return this.bbsManager.getPublicKey();
  }

  getMerkleRoot(): string {
    return this.zkManager.getMerkleRoot();
  }

  getIssuedCredentials(): VerifiableCredential[] {
    return Array.from(this.issuedCredentials.values());
  }

  async verifyOwnCredential(credential: IELTSCredential): Promise<boolean> {
    const vc = this.issuedCredentials.get(credential.id);
    if (!vc) {
      return false;
    }
    
    return await this.bbsManager.verifyCredential(credential, vc.proof);
  }
}
