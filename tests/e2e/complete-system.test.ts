import { Issuer } from '../../src/components/issuer';
import { Holder } from '../../src/components/holder';
import { Verifier } from '../../src/components/verifier';
import { Registry } from '../../src/components/registry';

describe('End-to-End IELTS VC System Tests', () => {
  describe('Complete IELTS Verification Workflow', () => {
    test('should demonstrate full IELTS VC system functionality', async () => {
      // Initialize all components
      const issuer = new Issuer('did:example:issuer:british-council');
      const holder = new Holder('did:example:holder:john-doe');
      const verifier = new Verifier('did:example:verifier:university');
      const registry = new Registry();

      await issuer.initialize();
      await holder.initialize();
      await verifier.initialize();
      await registry.initialize();

      // Set up trust relationships
      verifier.addTrustedIssuer('did:example:issuer:british-council');
      holder.addTrustedIssuer('did:example:issuer:british-council');

      // 1. Issue IELTS Credential
      const credentialData = {
        holder: 'did:example:holder:john-doe',
        name: 'John Doe',
        dateOfBirth: '1990-01-15',
        scores: {
          listening: 8.0,
          reading: 7.5,
          writing: 7.0,
          speaking: 8.5,
          overall: 8.0
        },
        certificationDate: '2024-08-01',
        expiryDate: '2026-08-01',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024001'
      };

      const verifiableCredential = await issuer.issueIELTSCredential(credentialData);
      
      expect(verifiableCredential).toBeDefined();
      expect(verifiableCredential.credentialSubject.name).toBe('John Doe');
      expect(verifiableCredential.credentialSubject.scores.overall).toBe(8.0);
      expect(verifiableCredential.issuer).toBe('did:example:issuer:british-council');
      expect(verifiableCredential.proof).toBeDefined();
      expect(verifiableCredential.proof.signature).toBeInstanceOf(Uint8Array);

      // 2. Register credential in registry
      await registry.registerCredential(verifiableCredential);
      
      expect(registry.getCredentialStatus(verifiableCredential.id)).toBe('valid');
      expect(registry.isCredentialRevoked(verifiableCredential.id)).toBe(false);

      // 3. Holder stores credential
      await holder.storeCredential(verifiableCredential);
      
      const storedCredentials = holder.getCredentials();
      expect(storedCredentials).toHaveLength(1);
      expect(storedCredentials[0].id).toBe(verifiableCredential.id);
      expect(storedCredentials[0].credentialSubject.name).toBe('John Doe');

      // 4. Create presentation request (University admission)
      const presentationRequest = verifier.createPresentationRequest(
        ['name', 'scores.overall', 'scores.speaking'],
        'University admission verification',
        { overall: 7.0, speaking: 7.5 }
      );

      expect(presentationRequest).toBeDefined();
      expect(presentationRequest.requiredFields).toContain('name');
      expect(presentationRequest.requiredFields).toContain('scores.overall');
      expect(presentationRequest.requiredFields).toContain('scores.speaking');
      expect(presentationRequest.minimumScores?.overall).toBe(7.0);
      expect(presentationRequest.minimumScores?.speaking).toBe(7.5);

      // 5. Holder creates verifiable presentation
      const presentation = await holder.createPresentation(presentationRequest);
      
      expect(presentation).toBeDefined();
      expect(presentation.holder).toBe('did:example:holder:john-doe');
      expect(presentation.verifiableCredential).toHaveLength(1);
      expect(presentation.verifiableCredential[0].id).toBe(verifiableCredential.id);
      expect(presentation.proof).toBeDefined();
      expect(presentation.proof.type).toBe('IndexedMerkleTreeProof2023');
      expect(presentation.proof.merkleRoot).toBeDefined();
      expect(presentation.proof.revealedAttributes).toBeDefined();
      expect(presentation.proof.revealedAttributes.name).toBe('John Doe');
      expect(presentation.proof.revealedAttributes['scores.overall']).toBe(8.0);
      expect(presentation.proof.revealedAttributes['scores.speaking']).toBe(8.5);

      // 6. Verifier validates presentation
      const verificationResult = await verifier.verifyPresentation(presentation, presentationRequest);
      
      expect(verificationResult).toBeDefined();
      expect(verificationResult.isValid).toBe(true);
      
      // Check all validation details
      expect(verificationResult.details.credentialValid).toBe(true);
      expect(verificationResult.details.issuerTrusted).toBe(true);
      expect(verificationResult.details.zkProofValid).toBe(true);
      expect(verificationResult.details.requirementsMet).toBe(true);
      expect(verificationResult.details.notRevoked).toBe(true);
      
      // Check revealed data
      expect(verificationResult.revealedData.name).toBe('John Doe');
      expect(verificationResult.revealedData['scores.overall']).toBe(8.0);
      expect(verificationResult.revealedData['scores.speaking']).toBe(8.5);
      
      // Verify private data is not leaked
      expect(verificationResult.revealedData.dateOfBirth).toBeUndefined();
      expect(verificationResult.revealedData['scores.listening']).toBeUndefined();
      expect(verificationResult.revealedData['scores.reading']).toBeUndefined();
      expect(verificationResult.revealedData['scores.writing']).toBeUndefined();
      expect(verificationResult.revealedData.certificateNumber).toBeUndefined();

      // 7. Test selective disclosure with different requirements
      const employmentRequest = verifier.createPresentationRequest(
        ['scores.speaking', 'scores.writing'],
        'Employment verification',
        { speaking: 8.0, writing: 6.0 }
      );

      const employmentPresentation = await holder.createPresentation(employmentRequest);
      const employmentResult = await verifier.verifyPresentation(employmentPresentation, employmentRequest);

      expect(employmentResult.isValid).toBe(true);
      expect(employmentResult.revealedData['scores.speaking']).toBe(8.5);
      expect(employmentResult.revealedData['scores.writing']).toBe(7.0);
      expect(employmentResult.revealedData.name).toBeUndefined(); // Not requested
      expect(employmentResult.revealedData['scores.overall']).toBeUndefined(); // Not requested

      // 8. Test credential revocation workflow
      const verifierWithRegistry = new Verifier('did:example:verifier:university-with-registry', registry);
      await verifierWithRegistry.initialize();
      verifierWithRegistry.addTrustedIssuer('did:example:issuer:british-council');

      // Should pass before revocation
      let registryVerificationResult = await verifierWithRegistry.verifyPresentation(presentation, presentationRequest);
      expect(registryVerificationResult.isValid).toBe(true);
      expect(registryVerificationResult.details.notRevoked).toBe(true);

      // Revoke credential
      const revocationResult = await registry.revokeCredential(
        verifiableCredential.id,
        'did:example:issuer:british-council'
      );
      expect(revocationResult).toBe(true);
      expect(registry.isCredentialRevoked(verifiableCredential.id)).toBe(true);

      // Should fail after revocation
      registryVerificationResult = await verifierWithRegistry.verifyPresentation(presentation, presentationRequest);
      expect(registryVerificationResult.isValid).toBe(false);
      expect(registryVerificationResult.details.notRevoked).toBe(false);

      // 9. Test minimum score enforcement
      const strictRequest = verifier.createPresentationRequest(
        ['name'],
        'Strict requirement test',
        { overall: 8.5 } // Higher than actual score of 8.0
      );

      // Should fail to create presentation
      await expect(holder.createPresentation(strictRequest)).rejects.toThrow('Minimum score requirement not met');

      console.log('✅ Complete IELTS VC system workflow successfully demonstrated');
    }, 120000); // 2 minute timeout for comprehensive test

    test('should handle multiple credentials and credential selection', async () => {
      const issuer = new Issuer('did:example:issuer:british-council');
      const holder = new Holder('did:example:holder:multi-cert');
      const verifier = new Verifier('did:example:verifier:selector');

      await issuer.initialize();
      await holder.initialize();
      await verifier.initialize();

      verifier.addTrustedIssuer('did:example:issuer:british-council');
      holder.addTrustedIssuer('did:example:issuer:british-council');

      // Create multiple credentials with different scores and dates
      const oldCredential = {
        holder: 'did:example:holder:multi-cert',
        name: 'Multi Cert User',
        dateOfBirth: '1992-05-20',
        scores: { listening: 7.0, reading: 7.0, writing: 6.5, speaking: 7.5, overall: 7.0 },
        certificationDate: '2024-01-01',
        expiryDate: '2026-01-01',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024-OLD'
      };

      const newCredential = {
        holder: 'did:example:holder:multi-cert',
        name: 'Multi Cert User',
        dateOfBirth: '1992-05-20',
        scores: { listening: 8.5, reading: 8.0, writing: 7.5, speaking: 8.5, overall: 8.0 },
        certificationDate: '2024-08-01',
        expiryDate: '2026-08-01',
        testCenter: 'British Council Cambridge',
        certificateNumber: 'BC2024-NEW'
      };

      const expiredCredential = {
        holder: 'did:example:holder:multi-cert',
        name: 'Multi Cert User',
        dateOfBirth: '1992-05-20',
        scores: { listening: 9.0, reading: 9.0, writing: 9.0, speaking: 9.0, overall: 9.0 },
        certificationDate: '2022-01-01',
        expiryDate: '2024-01-01', // Already expired
        testCenter: 'British Council Oxford',
        certificateNumber: 'BC2022-EXP'
      };

      const vc1 = await issuer.issueIELTSCredential(oldCredential);
      const vc2 = await issuer.issueIELTSCredential(newCredential);
      const vc3 = await issuer.issueIELTSCredential(expiredCredential);

      await holder.storeCredential(vc1);
      await holder.storeCredential(vc2);
      await holder.storeCredential(vc3);

      expect(holder.getCredentials()).toHaveLength(3);

      // Request with moderate requirements - should select newer, better credential
      const moderateRequest = verifier.createPresentationRequest(
        ['scores.overall', 'certificationDate'],
        'Moderate requirement test',
        { overall: 7.5 }
      );

      const presentation = await holder.createPresentation(moderateRequest);
      const selectedCredential = presentation.verifiableCredential[0];

      // Should select the new credential (vc2) - not expired, meets requirements, best scores
      expect(selectedCredential.id).toBe(vc2.id);
      expect(selectedCredential.credentialSubject.scores.overall).toBe(8.0);
      expect(selectedCredential.credentialSubject.certificateNumber).toBe('BC2024-NEW');

      // Verify the presentation
      const result = await verifier.verifyPresentation(presentation, moderateRequest);
      expect(result.isValid).toBe(true);
      expect(result.revealedData['scores.overall']).toBe(8.0);
      expect(result.revealedData.certificationDate).toBe('2024-08-01');

      console.log('✅ Multiple credential selection working correctly');
    }, 90000);
  });
});
