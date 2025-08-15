import { BBSManager } from '../core/bbs-manager';
import { ZKManager } from '../core/zk-manager';
import { VerifiableCredential, VerifiablePresentation, PresentationRequest, ZKProof } from '../types';

export class Holder {
  private holderId: string;
  private credentials: Map<string, VerifiableCredential>;
  private bbsManager: BBSManager;
  private zkManager: ZKManager;
  private trustedIssuers: Set<string>;

  constructor(holderId: string) {
    this.holderId = holderId;
    this.credentials = new Map();
    this.bbsManager = new BBSManager();
    this.zkManager = new ZKManager();
    this.trustedIssuers = new Set();
  }

  addTrustedIssuer(issuerId: string): void {
    this.trustedIssuers.add(issuerId);
    console.log(`✅ Added trusted issuer to holder: ${issuerId}`);
  }

  async initialize(): Promise<void> {
    await this.bbsManager.generateKeyPair();
    await this.zkManager.initialize();
  }

  async storeCredential(credential: VerifiableCredential): Promise<void> {
    // Check if issuer is trusted
    if (!this.trustedIssuers.has(credential.issuer)) {
      throw new Error('Credential rejected: Untrusted issuer');
    }

    // Verify the credential signature
    const isSignatureValid = await this.bbsManager.verifyCredential(
      credential.credentialSubject, 
      credential.proof
    );
    
    if (!isSignatureValid) {
      throw new Error('Credential rejected: Invalid signature');
    }

    // Basic integrity checks
    if (!credential.credentialSubject || !credential.proof) {
      throw new Error('Credential rejected: Missing required fields');
    }

    // Add to ZK manager for privacy features
    await this.zkManager.addCredential(credential.credentialSubject);
    
    this.credentials.set(credential.id, credential);
  console.log(`Credential stored for holder ${this.holderId}: ${credential.id}`);
  }

  async createPresentation(request: PresentationRequest): Promise<VerifiablePresentation> {
    // Find matching credentials
    const matchingCredentials = this.findMatchingCredentials(request);
    
    if (matchingCredentials.length === 0) {
      throw new Error('No matching credentials found for the request');
    }

    // Select the best credential based on requirements
    const credential = this.selectBestCredential(matchingCredentials, request);
    
    // Generate ZK proof with selective disclosure
    const zkProof = await this.zkManager.generateZKProof(
      credential.credentialSubject.id,
      request.requiredFields,
      request.minimumScores
    );

    const presentation: VerifiablePresentation = {
      id: `presentation-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      type: ['VerifiablePresentation', 'IELTSPresentation'],
      holder: this.holderId,
      verifiableCredential: [credential],
      proof: zkProof
    };

  console.log(`Presentation created for request: ${request.id}`);
  console.log(`Revealed fields: ${request.requiredFields.join(', ')}`);
    
    return presentation;
  }

  async createSelectiveDisclosurePresentation(
    credentialId: string,
    revealedFields: string[]
  ): Promise<any> {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    // Map field names to indices for BBS selective disclosure
    const fieldToIndex = this.getFieldMapping();
    const revealedIndices = revealedFields.map(field => fieldToIndex[field]).filter(idx => idx !== undefined);

    const selectiveProof = await this.bbsManager.createSelectiveDisclosureProof(
      credential.credentialSubject,
      credential.proof,
      revealedIndices
    );

  console.log(`Selective disclosure proof created for fields: ${revealedFields.join(', ')}`);
    
    return {
      proof: selectiveProof,
      revealedFields,
      credentialId
    };
  }

  getCredentials(): VerifiableCredential[] {
    return Array.from(this.credentials.values());
  }

  getCredentialById(id: string): VerifiableCredential | undefined {
    return this.credentials.get(id);
  }

  private findMatchingCredentials(request: PresentationRequest): VerifiableCredential[] {
    return Array.from(this.credentials.values()).filter(credential => {
      // Check if credential type matches
      if (!credential.type.includes('IELTSCredential')) {
        return false;
      }

      // Don't filter by minimum scores here - that should be done during ZK proof generation
      // This allows the credential to be considered, then the ZK proof will enforce requirements
      return true;
    });
  }

  private selectBestCredential(credentials: VerifiableCredential[], request: PresentationRequest): VerifiableCredential {
    if (credentials.length === 1) {
      return credentials[0];
    }

    // Sort credentials by various criteria to select the best one
    const sortedCredentials = credentials.slice().sort((a, b) => {
      // 1. Prefer non-expired credentials
      const aExpired = new Date(a.credentialSubject.expiryDate) < new Date();
      const bExpired = new Date(b.credentialSubject.expiryDate) < new Date();
      if (aExpired !== bExpired) {
        return aExpired ? 1 : -1;
      }

      // 2. Prefer more recent certifications
      const aCertDate = new Date(a.credentialSubject.certificationDate);
      const bCertDate = new Date(b.credentialSubject.certificationDate);
      if (aCertDate.getTime() !== bCertDate.getTime()) {
        return bCertDate.getTime() - aCertDate.getTime(); // More recent first
      }

      // 3. Prefer higher overall scores if score-based requirements
      if (request.minimumScores && request.minimumScores.overall !== undefined) {
        const aScore = a.credentialSubject.scores?.overall || 0;
        const bScore = b.credentialSubject.scores?.overall || 0;
        if (aScore !== bScore) {
          return bScore - aScore; // Higher score first
        }
      }

      // 4. Prefer credentials that better meet specific score requirements
      if (request.minimumScores) {
        let aAdvantage = 0;
        let bAdvantage = 0;
        
        for (const [scoreType, minValue] of Object.entries(request.minimumScores)) {
          const scoreField = scoreType === 'overall' ? 'overall' : scoreType;
          const aScores = a.credentialSubject.scores;
          const bScores = b.credentialSubject.scores;
          
          let aScore = 0;
          let bScore = 0;
          
          if (aScores && scoreField in aScores) {
            aScore = (aScores as any)[scoreField];
          }
          if (bScores && scoreField in bScores) {
            bScore = (bScores as any)[scoreField];
          }
          
          // Give advantage for exceeding requirements by more margin
          aAdvantage += Math.max(0, aScore - minValue);
          bAdvantage += Math.max(0, bScore - minValue);
        }
        
        if (aAdvantage !== bAdvantage) {
          return bAdvantage - aAdvantage;
        }
      }

      return 0; // Equal ranking
    });

    return sortedCredentials[0];
  }

  private getFieldMapping(): Record<string, number> {
    return {
      'id': 0,
      'holder': 1,
      'name': 2,
      'dateOfBirth': 3,
      'scores.listening': 4,
      'scores.reading': 5,
      'scores.writing': 6,
      'scores.speaking': 7,
      'scores.overall': 8,
      'certificationDate': 9,
      'expiryDate': 10,
      'testCenter': 11,
      'certificateNumber': 12
    };
  }
}

