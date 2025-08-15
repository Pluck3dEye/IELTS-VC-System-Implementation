import { IELTSCredential, BBSProof } from '../types';

// Import BBS signatures library - fail if not available
const bbsSignatures = require('@mattrglobal/bbs-signatures');

export class BBSManager {
  private keyPair: any;

  constructor() {
    this.keyPair = null;
  }

  async generateKeyPair(): Promise<void> {
    this.keyPair = await bbsSignatures.generateBls12381G2KeyPair();
  }

  getPublicKey(): Uint8Array {
    if (!this.keyPair) {
      throw new Error('Key pair not generated');
    }
    return this.keyPair.publicKey;
  }

  async signCredential(credential: IELTSCredential): Promise<BBSProof> {
    if (!this.keyPair) {
      throw new Error('Key pair not generated');
    }

    // Convert credential to message array
    const messages = this.credentialToMessages(credential);
    
    // Use blsSign (not regular sign) with proper message format
    const signature = await bbsSignatures.blsSign({
      keyPair: this.keyPair,
      messages: messages.map(msg => new TextEncoder().encode(msg))
    });

    return {
      type: 'BbsBlsSignature2020',
      created: new Date().toISOString(),
      proofPurpose: 'assertionMethod',
      verificationMethod: 'did:example:issuer#key-1',
      signature,
      publicKey: this.keyPair.publicKey
    };
  }

  async verifyCredential(credential: IELTSCredential, proof: BBSProof): Promise<boolean> {
    const messages = this.credentialToMessages(credential);
    
    const result = await bbsSignatures.blsVerify({
      publicKey: proof.publicKey,
      messages: messages.map(msg => new TextEncoder().encode(msg)),
      signature: proof.signature
    });
    
    return result.verified === true;
  }

  async createSelectiveDisclosureProof(
    credential: IELTSCredential, 
    proof: BBSProof, 
    revealedIndices: number[]
  ): Promise<any> {
    const messages = this.credentialToMessages(credential);
    
    return await bbsSignatures.blsCreateProof({
      signature: proof.signature,
      publicKey: proof.publicKey,
      messages: messages.map(msg => new TextEncoder().encode(msg)),
      revealed: revealedIndices,
      nonce: new TextEncoder().encode('nonce-' + Date.now())
    });
  }

  async verifySelectiveDisclosureProof(
    proof: any,
    revealedMessages: string[],
    publicKey: Uint8Array,
    nonce?: string
  ): Promise<boolean> {
    const result = await bbsSignatures.blsVerifyProof({
      proof,
      publicKey,
      messages: revealedMessages.map(msg => new TextEncoder().encode(msg)),
      nonce: new TextEncoder().encode(nonce || 'nonce-' + Date.now())
    });
    
    return result.verified === true;
  }

  private credentialToMessages(credential: IELTSCredential): string[] {
    return [
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
    ];
  }
}
