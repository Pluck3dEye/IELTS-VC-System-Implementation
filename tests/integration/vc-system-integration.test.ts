import { Issuer } from '../../src/components/issuer';
import { Holder } from '../../src/components/holder';
import { Verifier } from '../../src/components/verifier';
import { Registry } from '../../src/components/registry';
import { IELTSCredential } from '../../src/types';

describe('VC System Integration Tests', () => {
  let issuer: Issuer;
  let holder: Holder;
  let verifier: Verifier;
  let registry: Registry;

  beforeEach(async () => {
    issuer = new Issuer('did:example:issuer:british-council');
    holder = new Holder('did:example:holder:john-doe');
    verifier = new Verifier('did:example:verifier:university');
    registry = new Registry();

    await issuer.initialize();
    await holder.initialize();
    await verifier.initialize();
    await registry.initialize();

    // Set up trust relationships
    verifier.addTrustedIssuer('did:example:issuer:british-council');
    holder.addTrustedIssuer('did:example:issuer:british-council');
  }, 30000);

  describe('Full Credential Lifecycle', () => {
    test('should complete end-to-end credential workflow', async () => {
      // 1. Issue credential
      const credentialData: Omit<IELTSCredential, 'id'> = {
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
        certificationDate: '2024-01-01',
        expiryDate: '2026-01-01',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024001'
      };

      const verifiableCredential = await issuer.issueIELTSCredential(credentialData);
      expect(verifiableCredential).toBeDefined();
      expect(verifiableCredential.credentialSubject.name).toBe('John Doe');

      // 2. Register credential
      const registryEntry = await registry.registerCredential(verifiableCredential);
      expect(registryEntry).toBeDefined();
      expect(registry.getCredentialStatus(verifiableCredential.id)).toBe('valid');

      // 3. Store credential in holder
      await holder.storeCredential(verifiableCredential);
      const storedCredentials = holder.getCredentials();
      expect(storedCredentials).toHaveLength(1);
      expect(storedCredentials[0].id).toBe(verifiableCredential.id);

      // 4. Create presentation request
      const presentationRequest = verifier.createPresentationRequest(
        ['name', 'scores.overall'],
        'University admission verification'
      );
      expect(presentationRequest).toBeDefined();

      // 5. Create verifiable presentation
      const presentation = await holder.createPresentation(presentationRequest);
      expect(presentation).toBeDefined();
      expect(presentation.verifiableCredential).toHaveLength(1);

      // 6. Verify presentation
      const verificationResult = await verifier.verifyPresentation(presentation, presentationRequest);
      expect(verificationResult.isValid).toBe(true);
      expect(verificationResult.details.credentialValid).toBe(true);
      expect(verificationResult.details.issuerTrusted).toBe(true);
      expect(verificationResult.details.zkProofValid).toBe(true);
      expect(verificationResult.details.requirementsMet).toBe(true);
      expect(verificationResult.details.notRevoked).toBe(true);

      // 7. Check revealed data
      expect(verificationResult.revealedData.name).toBe('John Doe');
      expect(verificationResult.revealedData['scores.overall']).toBe(8.0);
    }, 60000);

    test('should handle multiple credentials from same holder', async () => {
      // Issue multiple credentials
      const credential1Data = {
        holder: 'did:example:holder:john-doe',
        name: 'John Doe',
        dateOfBirth: '1990-01-15',
        scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.5, overall: 8.0 },
        certificationDate: '2024-01-01',
        expiryDate: '2026-01-01',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024001'
      };

      const credential2Data = {
        holder: 'did:example:holder:john-doe',
        name: 'John Doe',
        dateOfBirth: '1990-01-15',
        scores: { listening: 8.5, reading: 8.0, writing: 8.0, speaking: 8.5, overall: 8.5 },
        certificationDate: '2024-06-01',
        expiryDate: '2026-06-01',
        testCenter: 'British Council Manchester',
        certificateNumber: 'BC2024002'
      };

      const vc1 = await issuer.issueIELTSCredential(credential1Data);
      const vc2 = await issuer.issueIELTSCredential(credential2Data);

      await holder.storeCredential(vc1);
      await holder.storeCredential(vc2);

      const storedCredentials = holder.getCredentials();
      expect(storedCredentials).toHaveLength(2);

      // Create presentation - should select the best matching credential
      const request = verifier.createPresentationRequest(['scores.overall'], 'Test');
      const presentation = await holder.createPresentation(request);
      
      // Should select the credential with higher score (vc2)
      expect(presentation.verifiableCredential[0].credentialSubject.scores.overall).toBe(8.5);
    }, 60000);

    test('should handle credential revocation', async () => {
      // Issue and store credential
      const credentialData = {
        holder: 'did:example:holder:john-doe',
        name: 'John Doe',
        dateOfBirth: '1990-01-15',
        scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.5, overall: 8.0 },
        certificationDate: '2024-01-01',
        expiryDate: '2026-01-01',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024001'
      };

      const vc = await issuer.issueIELTSCredential(credentialData);
      await registry.registerCredential(vc);
      await holder.storeCredential(vc);

      // Verify it works initially
      const request1 = verifier.createPresentationRequest(['name'], 'Test');
      const presentation1 = await holder.createPresentation(request1);
      
      const verifierWithRegistry = new Verifier('did:example:verifier:university', registry);
      await verifierWithRegistry.initialize();
      verifierWithRegistry.addTrustedIssuer('did:example:issuer:british-council');
      
      let result = await verifierWithRegistry.verifyPresentation(presentation1, request1);
      expect(result.isValid).toBe(true);
      expect(result.details.notRevoked).toBe(true);

      // Revoke credential
      await registry.revokeCredential(vc.id, 'did:example:issuer:british-council');
      expect(registry.isCredentialRevoked(vc.id)).toBe(true);

      // Verify it now fails
      const request2 = verifier.createPresentationRequest(['name'], 'Test');
      const presentation2 = await holder.createPresentation(request2);
      result = await verifierWithRegistry.verifyPresentation(presentation2, request2);
      
      expect(result.isValid).toBe(false);
      expect(result.details.notRevoked).toBe(false);
    }, 60000);
  });

  describe('Error Scenarios', () => {
    test('should reject credential from untrusted issuer', async () => {
      const untrustedIssuer = new Issuer('did:example:issuer:malicious');
      await untrustedIssuer.initialize();

      const credentialData = {
        holder: 'did:example:holder:john-doe',
        name: 'Fake John',
        dateOfBirth: '1990-01-15',
        scores: { listening: 9.0, reading: 9.0, writing: 9.0, speaking: 9.0, overall: 9.0 },
        certificationDate: '2024-01-01',
        expiryDate: '2026-01-01',
        testCenter: 'Fake Center',
        certificateNumber: 'FAKE001'
      };

      const fakeCredential = await untrustedIssuer.issueIELTSCredential(credentialData);

      // Holder should reject untrusted credential
      await expect(holder.storeCredential(fakeCredential)).rejects.toThrow('Credential rejected: Untrusted issuer');
    }, 60000);

    test('should reject presentation with insufficient scores', async () => {
      const credentialData = {
        holder: 'did:example:holder:john-doe',
        name: 'John Doe',
        dateOfBirth: '1990-01-15',
        scores: { listening: 6.0, reading: 6.0, writing: 6.0, speaking: 6.0, overall: 6.0 },
        certificationDate: '2024-01-01',
        expiryDate: '2026-01-01',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024001'
      };

      const vc = await issuer.issueIELTSCredential(credentialData);
      await holder.storeCredential(vc);

      // Request with minimum score requirements that are too high
      const request = verifier.createPresentationRequest(
        ['scores.overall'],
        'High requirement test',
        { overall: 8.0 } // Credential only has 6.0
      );

      // Should fail when creating ZK proof due to minimum score requirement
      await expect(holder.createPresentation(request)).rejects.toThrow('Minimum score requirement not met');
    }, 60000);

    test('should handle missing credentials gracefully', async () => {
      // Try to create presentation without any stored credentials
      const request = verifier.createPresentationRequest(['name'], 'Test');
      
      await expect(holder.createPresentation(request)).rejects.toThrow('No matching credentials found');
    }, 30000);
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple concurrent operations', async () => {
      const credentialPromises = Array.from({ length: 5 }, (_, i) => {
        const credentialData = {
          holder: `did:example:holder:user${i}`,
          name: `User ${i}`,
          dateOfBirth: '1990-01-15',
          scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.5, overall: 8.0 },
          certificationDate: '2024-01-01',
          expiryDate: '2026-01-01',
          testCenter: 'British Council London',
          certificateNumber: `BC202400${i}`
        };
        return issuer.issueIELTSCredential(credentialData);
      });

      const credentials = await Promise.all(credentialPromises);
      expect(credentials).toHaveLength(5);

      // All credentials should be valid and unique
      const ids = credentials.map(vc => vc.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    }, 60000);
  });
});
