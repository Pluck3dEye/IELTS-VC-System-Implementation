import { Issuer } from '../../src/components/issuer';
import { Holder } from '../../src/components/holder';
import { Verifier } from '../../src/components/verifier';
import { Registry } from '../../src/components/registry';

describe('Security Tests', () => {
  let legitimateIssuer: Issuer;
  let maliciousIssuer: Issuer;
  let holder: Holder;
  let verifier: Verifier;
  let registry: Registry;

  beforeEach(async () => {
    legitimateIssuer = new Issuer('did:example:issuer:british-council');
    maliciousIssuer = new Issuer('did:example:issuer:fake-council');
    holder = new Holder('did:example:holder:alice');
    verifier = new Verifier('did:example:verifier:university');
    registry = new Registry();

    await legitimateIssuer.initialize();
    await maliciousIssuer.initialize();
    await holder.initialize();
    await verifier.initialize();
    await registry.initialize();

    // Only trust legitimate issuer
    verifier.addTrustedIssuer('did:example:issuer:british-council');
    holder.addTrustedIssuer('did:example:issuer:british-council');
  }, 30000);

  describe('Issuer Trust Validation', () => {
    test('should reject credentials from untrusted issuers', async () => {
      const fakeCredentialData = {
        holder: 'did:example:holder:alice',
        name: 'Alice Johnson',
        dateOfBirth: '1995-03-15',
        scores: { listening: 9.0, reading: 9.0, writing: 9.0, speaking: 9.0, overall: 9.0 },
        certificationDate: '2024-08-01',
        expiryDate: '2026-08-01',
        testCenter: 'Fake Test Center',
        certificateNumber: 'FAKE001'
      };

      const fakeCredential = await maliciousIssuer.issueIELTSCredential(fakeCredentialData);

      // Holder should reject the credential from untrusted issuer
      await expect(holder.storeCredential(fakeCredential)).rejects.toThrow('Credential rejected: Untrusted issuer');

      // Even if somehow the credential got through, verifier should reject it
      const presentation = {
        id: 'fake-presentation',
        type: ['VerifiablePresentation'],
        holder: 'did:example:holder:alice',
        verifiableCredential: [fakeCredential],
        proof: {
          type: 'IndexedMerkleTreeProof2023',
          created: new Date().toISOString(),
          proofPurpose: 'authentication',
          merkleRoot: '123456789',
          zkProof: { leaf: '123', path: [], indices: [], root: '123456789' },
          revealedAttributes: { name: 'Alice Johnson' }
        }
      };

      const result = await verifier.verifyPresentation(presentation);
      expect(result.isValid).toBe(false);
      expect(result.details.issuerTrusted).toBe(false);
    }, 60000);

    test('should validate legitimate credentials properly', async () => {
      const legitimateCredentialData = {
        holder: 'did:example:holder:alice',
        name: 'Alice Johnson',
        dateOfBirth: '1995-03-15',
        scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
        certificationDate: '2024-08-01',
        expiryDate: '2026-08-01',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024001'
      };

      const legitimateCredential = await legitimateIssuer.issueIELTSCredential(legitimateCredentialData);
      
      // Should be accepted by holder
      await expect(holder.storeCredential(legitimateCredential)).resolves.not.toThrow();

      const request = verifier.createPresentationRequest(['name'], 'Test');
      const presentation = await holder.createPresentation(request);
      const result = await verifier.verifyPresentation(presentation);

      expect(result.isValid).toBe(true);
      expect(result.details.issuerTrusted).toBe(true);
    }, 60000);
  });

  describe('Signature Tampering Protection', () => {
    test('should detect tampered credential signatures', async () => {
      const credentialData = {
        holder: 'did:example:holder:alice',
        name: 'Alice Johnson',
        dateOfBirth: '1995-03-15',
        scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
        certificationDate: '2024-08-01',
        expiryDate: '2026-08-01',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024001'
      };

      const credential = await legitimateIssuer.issueIELTSCredential(credentialData);
      await holder.storeCredential(credential);

      // Tamper with the credential scores
      const tamperedCredential = {
        ...credential,
        credentialSubject: {
          ...credential.credentialSubject,
          scores: {
            ...credential.credentialSubject.scores,
            overall: 9.0 // Changed from 7.5 to 9.0
          }
        }
      };

      const tamperedPresentation = {
        id: 'tampered-presentation',
        type: ['VerifiablePresentation'],
        holder: 'did:example:holder:alice',
        verifiableCredential: [tamperedCredential],
        proof: {
          type: 'IndexedMerkleTreeProof2023',
          created: new Date().toISOString(),
          proofPurpose: 'authentication',
          merkleRoot: '123456789',
          zkProof: { leaf: '123', path: [], indices: [], root: '123456789' },
          revealedAttributes: { name: 'Alice Johnson' }
        }
      };

      const result = await verifier.verifyPresentation(tamperedPresentation);
      expect(result.isValid).toBe(false);
      expect(result.details.credentialValid).toBe(false);
    }, 60000);

    test('should detect tampered signatures', async () => {
      const credentialData = {
        holder: 'did:example:holder:alice',
        name: 'Alice Johnson',
        dateOfBirth: '1995-03-15',
        scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
        certificationDate: '2024-08-01',
        expiryDate: '2026-08-01',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024001'
      };

      const credential = await legitimateIssuer.issueIELTSCredential(credentialData);
      
      // Tamper with the signature
      const tamperedCredential = {
        ...credential,
        proof: {
          ...credential.proof,
          signature: new Uint8Array([1, 2, 3, 4, 5]) // Invalid signature
        }
      };

      const tamperedPresentation = {
        id: 'tampered-presentation',
        type: ['VerifiablePresentation'],
        holder: 'did:example:holder:alice',
        verifiableCredential: [tamperedCredential],
        proof: {
          type: 'IndexedMerkleTreeProof2023',
          created: new Date().toISOString(),
          proofPurpose: 'authentication',
          merkleRoot: '123456789',
          zkProof: { leaf: '123', path: [], indices: [], root: '123456789' },
          revealedAttributes: { name: 'Alice Johnson' }
        }
      };

      const result = await verifier.verifyPresentation(tamperedPresentation);
      expect(result.isValid).toBe(false);
      expect(result.details.credentialValid).toBe(false);
    }, 60000);
  });

  describe('Privacy Protection', () => {
    test('should not leak unrevealed attributes', async () => {
      const credentialData = {
        holder: 'did:example:holder:alice',
        name: 'Alice Johnson',
        dateOfBirth: '1995-03-15', // Should not be revealed
        scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
        certificationDate: '2024-08-01',
        expiryDate: '2026-08-01',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024001' // Should not be revealed
      };

      const credential = await legitimateIssuer.issueIELTSCredential(credentialData);
      await holder.storeCredential(credential);

      // Only request name and overall score
      const request = verifier.createPresentationRequest(['name', 'scores.overall'], 'Privacy test');
      const presentation = await holder.createPresentation(request);
      const result = await verifier.verifyPresentation(presentation, request);

      expect(result.isValid).toBe(true);
      expect(result.revealedData.name).toBe('Alice Johnson');
      expect(result.revealedData['scores.overall']).toBe(7.5);

      // Private information should not be revealed
      expect(result.revealedData.dateOfBirth).toBeUndefined();
      expect(result.revealedData.certificateNumber).toBeUndefined();
      expect(result.revealedData['scores.listening']).toBeUndefined();
      expect(result.revealedData['scores.reading']).toBeUndefined();
      expect(result.revealedData['scores.writing']).toBeUndefined();
      expect(result.revealedData['scores.speaking']).toBeUndefined();
    }, 60000);

    test('should enforce minimum score requirements without revealing exact scores', async () => {
      const credentialData = {
        holder: 'did:example:holder:alice',
        name: 'Alice Johnson',
        dateOfBirth: '1995-03-15',
        scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
        certificationDate: '2024-08-01',
        expiryDate: '2026-08-01',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024001'
      };

      const credential = await legitimateIssuer.issueIELTSCredential(credentialData);
      await holder.storeCredential(credential);

      // Request proof that overall score is at least 7.0, but don't reveal the exact score
      const request = verifier.createPresentationRequest(
        ['name'],
        'Minimum score verification',
        { overall: 7.0 }
      );

      const presentation = await holder.createPresentation(request);
      const result = await verifier.verifyPresentation(presentation, request);

      expect(result.isValid).toBe(true);
      expect(result.details.requirementsMet).toBe(true);
      expect(result.revealedData.name).toBe('Alice Johnson');
      
      // Exact score should not be revealed unless explicitly requested
      expect(result.revealedData['scores.overall']).toBeUndefined();
    }, 60000);
  });

  describe('Revocation Security', () => {
    test('should prevent unauthorized revocation attempts', async () => {
      const credentialData = {
        holder: 'did:example:holder:alice',
        name: 'Alice Johnson',
        dateOfBirth: '1995-03-15',
        scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
        certificationDate: '2024-08-01',
        expiryDate: '2026-08-01',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024001'
      };

      const credential = await legitimateIssuer.issueIELTSCredential(credentialData);
      await registry.registerCredential(credential);

      // Malicious issuer tries to revoke the legitimate credential
      const revocationResult = await registry.revokeCredential(
        credential.id,
        'did:example:issuer:fake-council'
      );

      // Revocation should fail
      expect(revocationResult).toBe(false);
      expect(registry.isCredentialRevoked(credential.id)).toBe(false);
    }, 60000);

    test('should allow legitimate issuer to revoke their own credentials', async () => {
      const credentialData = {
        holder: 'did:example:holder:alice',
        name: 'Alice Johnson',
        dateOfBirth: '1995-03-15',
        scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
        certificationDate: '2024-08-01',
        expiryDate: '2026-08-01',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024001'
      };

      const credential = await legitimateIssuer.issueIELTSCredential(credentialData);
      await registry.registerCredential(credential);

      // Legitimate issuer revokes their own credential
      const revocationResult = await registry.revokeCredential(
        credential.id,
        'did:example:issuer:british-council'
      );

      expect(revocationResult).toBe(true);
      expect(registry.isCredentialRevoked(credential.id)).toBe(true);
    }, 60000);

    test('should fail verification after legitimate revocation', async () => {
      const credentialData = {
        holder: 'did:example:holder:alice',
        name: 'Alice Johnson',
        dateOfBirth: '1995-03-15',
        scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
        certificationDate: '2024-08-01',
        expiryDate: '2026-08-01',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024001'
      };

      const credential = await legitimateIssuer.issueIELTSCredential(credentialData);
      await registry.registerCredential(credential);
      await holder.storeCredential(credential);

      // Create verifier with access to registry
      const verifierWithRegistry = new Verifier('did:example:verifier:university', registry);
      await verifierWithRegistry.initialize();
      verifierWithRegistry.addTrustedIssuer('did:example:issuer:british-council');

      // Initially should pass verification
      const request1 = verifierWithRegistry.createPresentationRequest(['name'], 'Test');
      const presentation1 = await holder.createPresentation(request1);
      let result = await verifierWithRegistry.verifyPresentation(presentation1, request1);
      
      expect(result.isValid).toBe(true);
      expect(result.details.notRevoked).toBe(true);

      // Revoke the credential
      await registry.revokeCredential(credential.id, 'did:example:issuer:british-council');

      // Should now fail verification
      const request2 = verifierWithRegistry.createPresentationRequest(['name'], 'Test');
      const presentation2 = await holder.createPresentation(request2);
      result = await verifierWithRegistry.verifyPresentation(presentation2, request2);
      
      expect(result.isValid).toBe(false);
      expect(result.details.notRevoked).toBe(false);
    }, 60000);
  });

  describe('Replay Attack Prevention', () => {
    test('should generate unique presentations for each request', async () => {
      const credentialData = {
        holder: 'did:example:holder:alice',
        name: 'Alice Johnson',
        dateOfBirth: '1995-03-15',
        scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
        certificationDate: '2024-08-01',
        expiryDate: '2026-08-01',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024001'
      };

      const credential = await legitimateIssuer.issueIELTSCredential(credentialData);
      await holder.storeCredential(credential);

      const request1 = verifier.createPresentationRequest(['name'], 'First request');
      const request2 = verifier.createPresentationRequest(['name'], 'Second request');

      const presentation1 = await holder.createPresentation(request1);
      const presentation2 = await holder.createPresentation(request2);

      // Presentations should have unique IDs
      expect(presentation1.id).not.toBe(presentation2.id);

      // Both should be valid when verified separately
      const result1 = await verifier.verifyPresentation(presentation1, request1);
      const result2 = await verifier.verifyPresentation(presentation2, request2);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    }, 60000);
  });
});
