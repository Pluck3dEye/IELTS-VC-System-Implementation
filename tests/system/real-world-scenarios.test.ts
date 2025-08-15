import { Issuer } from '../../src/components/issuer';
import { Holder } from '../../src/components/holder';
import { Verifier } from '../../src/components/verifier';
import { Registry } from '../../src/components/registry';

describe('Real-World VC System Scenarios', () => {
  let issuer: Issuer;
  let holder: Holder;
  let verifier: Verifier;
  let registry: Registry;

  beforeEach(async () => {
    issuer = new Issuer('did:example:issuer:british-council');
    holder = new Holder('did:example:holder:alice');
    verifier = new Verifier('did:example:verifier:oxford-university');
    registry = new Registry();

    await issuer.initialize();
    await holder.initialize();
    await verifier.initialize();
    await registry.initialize();

    verifier.addTrustedIssuer('did:example:issuer:british-council');
    holder.addTrustedIssuer('did:example:issuer:british-council');
  }, 30000);

  describe('University Admission Scenario', () => {
    test('should handle university admission process', async () => {
      // Alice takes IELTS test and receives credential
      const aliceCredential = {
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
        certificationDate: '2024-08-01',
        expiryDate: '2026-08-01',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024-ALI-001'
      };

      // 1. British Council issues IELTS credential
      const verifiableCredential = await issuer.issueIELTSCredential(aliceCredential);
      await registry.registerCredential(verifiableCredential);
      await holder.storeCredential(verifiableCredential);

      // 2. Oxford University requests proof for admission (minimum overall score 7.0)
      const admissionRequest = verifier.createPresentationRequest(
        ['name', 'scores.overall', 'certificationDate'],
        'University admission verification',
        { overall: 7.0 }
      );

      // 3. Alice creates presentation revealing only required information
      const presentation = await holder.createPresentation(admissionRequest);
      
      // Verify presentation structure
      expect(presentation.holder).toBe('did:example:holder:alice');
      expect(presentation.verifiableCredential).toHaveLength(1);
      expect(presentation.proof).toBeDefined();

      // 4. Oxford verifies the presentation
      const verificationResult = await verifier.verifyPresentation(presentation, admissionRequest);
      
      expect(verificationResult.isValid).toBe(true);
      expect(verificationResult.revealedData.name).toBe('Alice Johnson');
      expect(verificationResult.revealedData['scores.overall']).toBe(8.0);
      expect(verificationResult.revealedData.certificationDate).toBe('2024-08-01');
      
      // Sensitive information should not be revealed
      expect(verificationResult.revealedData.dateOfBirth).toBeUndefined();
      expect(verificationResult.revealedData['scores.listening']).toBeUndefined();
    }, 60000);

    test('should reject insufficient scores for admission', async () => {
      const lowScoreCredential = {
        holder: 'did:example:holder:alice',
        name: 'Alice Johnson',
        dateOfBirth: '1995-03-15',
        scores: {
          listening: 6.0,
          reading: 6.0,
          writing: 6.0,
          speaking: 6.0,
          overall: 6.0
        },
        certificationDate: '2024-08-01',
        expiryDate: '2026-08-01',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024-ALI-002'
      };

      const vc = await issuer.issueIELTSCredential(lowScoreCredential);
      await holder.storeCredential(vc);

      // University requires minimum overall score of 7.5
      const strictRequest = verifier.createPresentationRequest(
        ['name', 'scores.overall'],
        'Competitive program admission',
        { overall: 7.5 }
      );

      // Should fail to create presentation due to insufficient scores
      await expect(holder.createPresentation(strictRequest)).rejects.toThrow('Minimum score requirement not met');
    }, 60000);
  });

  describe('Employment Verification Scenario', () => {
    test('should handle job application verification', async () => {
      const employeeCredential = {
        holder: 'did:example:holder:alice',
        name: 'Alice Johnson',
        dateOfBirth: '1995-03-15',
        scores: {
          listening: 8.0,
          reading: 8.5,
          writing: 7.5,
          speaking: 8.5,
          overall: 8.0
        },
        certificationDate: '2024-07-15',
        expiryDate: '2026-07-15',
        testCenter: 'British Council Cambridge',
        certificateNumber: 'BC2024-EMP-001'
      };

      const employer = new Verifier('did:example:verifier:multinational-corp');
      await employer.initialize();
      employer.addTrustedIssuer('did:example:issuer:british-council');

      const vc = await issuer.issueIELTSCredential(employeeCredential);
      await holder.storeCredential(vc);

      // Employer only needs to verify English proficiency (speaking and writing)
      const employmentRequest = employer.createPresentationRequest(
        ['name', 'scores.speaking', 'scores.writing'],
        'Employment English proficiency verification',
        { speaking: 7.0, writing: 7.0 }
      );

      const presentation = await holder.createPresentation(employmentRequest);
      const result = await employer.verifyPresentation(presentation, employmentRequest);

      expect(result.isValid).toBe(true);
      expect(result.revealedData['scores.speaking']).toBe(8.5);
      expect(result.revealedData['scores.writing']).toBe(7.5);
      
      // Other scores should not be revealed
      expect(result.revealedData['scores.listening']).toBeUndefined();
      expect(result.revealedData['scores.reading']).toBeUndefined();
      expect(result.revealedData['scores.overall']).toBeUndefined();
    }, 60000);
  });

  describe('Immigration Scenario', () => {
    test('should handle visa application process', async () => {
      const immigrantCredential = {
        holder: 'did:example:holder:alice',
        name: 'Alice Johnson',
        dateOfBirth: '1995-03-15',
        scores: {
          listening: 8.0,
          reading: 7.5,
          writing: 7.0,
          speaking: 8.0,
          overall: 7.5
        },
        certificationDate: '2024-06-01',
        expiryDate: '2026-06-01',
        testCenter: 'British Council Sydney',
        certificateNumber: 'BC2024-VIS-001'
      };

      const immigrationOffice = new Verifier('did:example:verifier:au-immigration');
      await immigrationOffice.initialize();
      immigrationOffice.addTrustedIssuer('did:example:issuer:british-council');

      const vc = await issuer.issueIELTSCredential(immigrantCredential);
      await registry.registerCredential(vc);
      await holder.storeCredential(vc);

      // Immigration requires all skill scores and certificate validity
      const visaRequest = immigrationOffice.createPresentationRequest(
        ['name', 'scores.listening', 'scores.reading', 'scores.writing', 'scores.speaking', 'certificationDate', 'expiryDate'],
        'Skilled migration visa application',
        { listening: 6.0, reading: 6.0, writing: 6.0, speaking: 6.0 }
      );

      const presentation = await holder.createPresentation(visaRequest);
      const result = await immigrationOffice.verifyPresentation(presentation, visaRequest);

      expect(result.isValid).toBe(true);
      expect(result.details.credentialValid).toBe(true);
      expect(result.details.notRevoked).toBe(true);
      
      // All required scores should be revealed
      expect(result.revealedData['scores.listening']).toBe(8.0);
      expect(result.revealedData['scores.reading']).toBe(7.5);
      expect(result.revealedData['scores.writing']).toBe(7.0);
      expect(result.revealedData['scores.speaking']).toBe(8.0);
      expect(result.revealedData.certificationDate).toBe('2024-06-01');
      expect(result.revealedData.expiryDate).toBe('2026-06-01');
      
      // Personal information should not be revealed unless explicitly requested
      expect(result.revealedData.dateOfBirth).toBeUndefined();
    }, 60000);
  });

  describe('Multi-Issuer Scenario', () => {
    test('should handle credentials from multiple trusted issuers', async () => {
      // Add another trusted issuer (IDP Education)
      const idpIssuer = new Issuer('did:example:issuer:idp-education');
      await idpIssuer.initialize();
      
      verifier.addTrustedIssuer('did:example:issuer:idp-education');
      holder.addTrustedIssuer('did:example:issuer:idp-education');

      // Alice has two IELTS certificates from different test centers
      const britishCouncilCredential = {
        holder: 'did:example:holder:alice',
        name: 'Alice Johnson',
        dateOfBirth: '1995-03-15',
        scores: { listening: 7.5, reading: 7.0, writing: 6.5, speaking: 7.0, overall: 7.0 },
        certificationDate: '2024-01-15',
        expiryDate: '2026-01-15',
        testCenter: 'British Council London',
        certificateNumber: 'BC2024-001'
      };

      const idpCredential = {
        holder: 'did:example:holder:alice',
        name: 'Alice Johnson',
        dateOfBirth: '1995-03-15',
        scores: { listening: 8.5, reading: 8.0, writing: 7.5, speaking: 8.0, overall: 8.0 },
        certificationDate: '2024-07-15',
        expiryDate: '2026-07-15',
        testCenter: 'IDP Melbourne',
        certificateNumber: 'IDP2024-001'
      };

      const bcVC = await issuer.issueIELTSCredential(britishCouncilCredential);
      const idpVC = await idpIssuer.issueIELTSCredential(idpCredential);

      await holder.storeCredential(bcVC);
      await holder.storeCredential(idpVC);

      // University requires minimum overall score of 7.5
      const request = verifier.createPresentationRequest(
        ['name', 'scores.overall', 'testCenter'],
        'Program admission',
        { overall: 7.5 }
      );

      // Should automatically select the better credential (IDP with 8.0 overall)
      const presentation = await holder.createPresentation(request);
      const result = await verifier.verifyPresentation(presentation, request);

      expect(result.isValid).toBe(true);
      expect(result.revealedData['scores.overall']).toBe(8.0);
      expect(result.revealedData.testCenter).toBe('IDP Melbourne');
    }, 60000);
  });

  describe('Credential Expiry Scenario', () => {
    test('should prefer non-expired credentials', async () => {
      const expiredCredential = {
        holder: 'did:example:holder:alice',
        name: 'Alice Johnson',
        dateOfBirth: '1995-03-15',
        scores: { listening: 9.0, reading: 9.0, writing: 9.0, speaking: 9.0, overall: 9.0 },
        certificationDate: '2022-01-01',
        expiryDate: '2024-01-01', // Expired
        testCenter: 'British Council London',
        certificateNumber: 'BC2022-001'
      };

      const validCredential = {
        holder: 'did:example:holder:alice',
        name: 'Alice Johnson',
        dateOfBirth: '1995-03-15',
        scores: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 8.0, overall: 7.5 },
        certificationDate: '2024-06-01',
        expiryDate: '2026-06-01', // Valid
        testCenter: 'British Council Cambridge',
        certificateNumber: 'BC2024-001'
      };

      const expiredVC = await issuer.issueIELTSCredential(expiredCredential);
      const validVC = await issuer.issueIELTSCredential(validCredential);

      await holder.storeCredential(expiredVC);
      await holder.storeCredential(validVC);

      const request = verifier.createPresentationRequest(['scores.overall'], 'Test');
      const presentation = await holder.createPresentation(request);

      // Should select the non-expired credential even though expired one has better scores
      expect(presentation.verifiableCredential[0].id).toBe(validVC.id);
      expect(presentation.verifiableCredential[0].credentialSubject.expiryDate).toBe('2026-06-01');
    }, 60000);
  });
});
