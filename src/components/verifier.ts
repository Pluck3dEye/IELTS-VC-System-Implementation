import { BBSManager } from '../core/bbs-manager';
import { ZKManager } from '../core/zk-manager';
import { VerifiablePresentation, PresentationRequest, VerifiableCredential } from '../types';
import { Registry } from './registry';

export class Verifier {
  private verifierId: string;
  private bbsManager: BBSManager;
  private zkManager: ZKManager;
  private trustedIssuers: Set<string>;
  private registry?: Registry;

  constructor(verifierId: string, registry?: Registry) {
    this.verifierId = verifierId;
    this.bbsManager = new BBSManager();
    this.zkManager = new ZKManager();
    this.trustedIssuers = new Set();
    this.registry = registry;
  }

  async initialize(): Promise<void> {
    await this.bbsManager.generateKeyPair();
    await this.zkManager.initialize();
  }

  addTrustedIssuer(issuerId: string): void {
    this.trustedIssuers.add(issuerId);
    console.log(`✅ Added trusted issuer: ${issuerId}`);
  }

  removeTrustedIssuer(issuerId: string): void {
    this.trustedIssuers.delete(issuerId);
    console.log(`❌ Removed trusted issuer: ${issuerId}`);
  }

  createPresentationRequest(
    requiredFields: string[],
    purpose: string,
    minimumScores?: Record<string, number>
  ): PresentationRequest {
    return {
      id: `request-${Date.now()}`,
      verifier: this.verifierId,
      requiredFields,
      minimumScores,
      purpose
    };
  }

  async verifyPresentation(presentation: VerifiablePresentation, request?: PresentationRequest): Promise<{
    isValid: boolean;
    details: {
      credentialValid: boolean;
      issuerTrusted: boolean;
      zkProofValid: boolean;
      requirementsMet: boolean;
      notRevoked: boolean;
    };
    revealedData: Record<string, any>;
  }> {
    const details = {
      credentialValid: false,
      issuerTrusted: false,
      zkProofValid: false,
      requirementsMet: false,
      notRevoked: true
    };

    try {
      // Check if presentation has credentials
      if (!presentation.verifiableCredential || presentation.verifiableCredential.length === 0) {
        return { isValid: false, details, revealedData: {} };
      }

      const credential = presentation.verifiableCredential[0];

      // 1. Check revocation status first if registry is available
      if (this.registry) {
        details.notRevoked = !this.registry.isCredentialRevoked(credential.id);
        if (!details.notRevoked) {
          console.log(`❌ Credential is revoked: ${credential.id}`);
        }
      }

      // 2. Verify issuer is trusted
      details.issuerTrusted = this.trustedIssuers.has(credential.issuer);
      if (!details.issuerTrusted) {
        console.log(`❌ Untrusted issuer: ${credential.issuer}`);
      }

      // 2. Verify credential signature
      details.credentialValid = await this.bbsManager.verifyCredential(
        credential.credentialSubject,
        credential.proof
      );

      // 3. Verify ZK proof
      details.zkProofValid = await this.zkManager.verifyZKProof(presentation.proof);

      // 4. Check if requirements are met based on revealed attributes
      details.requirementsMet = this.checkRequirements(presentation.proof.revealedAttributes, request);

      const isValid = details.credentialValid && 
                     details.issuerTrusted && 
                     details.zkProofValid && 
                     details.requirementsMet &&
                     details.notRevoked;

  console.log(`Presentation verification result: ${isValid ? 'VALID' : 'INVALID'}`);
      console.log(`   - Credential valid: ${details.credentialValid}`);
      console.log(`   - Issuer trusted: ${details.issuerTrusted}`);
      console.log(`   - ZK proof valid: ${details.zkProofValid}`);
      console.log(`   - Requirements met: ${details.requirementsMet}`);
      console.log(`   - Not revoked: ${details.notRevoked}`);

      return {
        isValid,
        details,
        revealedData: presentation.proof.revealedAttributes
      };

    } catch (error) {
      console.error('Verification error:', error);
      return { isValid: false, details, revealedData: {} };
    }
  }

  async verifySelectiveDisclosureProof(
    proof: any,
    revealedMessages: string[],
    issuerPublicKey: Uint8Array
  ): Promise<boolean> {
    try {
      return await this.bbsManager.verifySelectiveDisclosureProof(
        proof,
        revealedMessages,
        issuerPublicKey
      );
    } catch (error) {
      console.error('Selective disclosure verification failed:', error);
      return false;
    }
  }

  async verifyCredentialDirect(credential: VerifiableCredential): Promise<boolean> {
    // Direct verification without presentation layer
    const issuerTrusted = this.trustedIssuers.has(credential.issuer);
    if (!issuerTrusted) {
      return false;
    }

    return await this.bbsManager.verifyCredential(
      credential.credentialSubject,
      credential.proof
    );
  }

  private checkRequirements(revealedAttributes: Record<string, any>, request?: PresentationRequest): boolean {
    // If no specific request provided, accept any valid revealed attributes
    if (!request) {
      // Basic validation - just ensure we have some attributes
      return Object.keys(revealedAttributes).length > 0;
    } else {
      // Use the request's specific required fields
      for (const field of request.requiredFields) {
        if (revealedAttributes[field] === undefined) {
          console.log(`❌ Missing required field: ${field}`);
          return false;
        }
      }
      
      // Check minimum score requirements if specified
      if (request.minimumScores) {
        for (const [scoreType, minValue] of Object.entries(request.minimumScores)) {
          const scoreField = scoreType.startsWith('scores.') ? scoreType : `scores.${scoreType}`;
          const actualScore = revealedAttributes[scoreField];
          if (actualScore !== undefined && actualScore < minValue) {
            console.log(`❌ Score below minimum: ${scoreField} = ${actualScore} < ${minValue}`);
            return false;
          }
        }
      }
    }

    // Check overall score is reasonable
    if (revealedAttributes['scores.overall'] && 
        (revealedAttributes['scores.overall'] < 0 || revealedAttributes['scores.overall'] > 9)) {
      console.log(`❌ Invalid overall score: ${revealedAttributes['scores.overall']}`);
      return false;
    }

    return true;
  }

  getTrustedIssuers(): string[] {
    return Array.from(this.trustedIssuers);
  }
}
