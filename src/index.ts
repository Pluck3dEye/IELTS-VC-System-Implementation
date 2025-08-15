import { Issuer } from './components/issuer';
import { Holder } from './components/holder';
import { Verifier } from './components/verifier';
import { Registry } from './components/registry';
import { IELTSCredential } from './types';

async function demonstrateVCSystem() {
  console.log('Starting IELTS VC System Demonstration\n');

  try {
    // Initialize components
    console.log('Initializing system components...');
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

    console.log('All components initialized successfully\n');

    // 1. Issue IELTS Credential
    console.log('Issuing IELTS Credential...');
    const ieltsData = {
      holder: 'did:example:holder:john-doe',
      name: 'John Doe',
      dateOfBirth: '1995-06-15',
      scores: {
        listening: 8.5,
        reading: 8.0,
        writing: 7.5,
        speaking: 8.0,
        overall: 8.0
      },
      certificationDate: '2024-01-15',
      expiryDate: '2026-01-15',
      testCenter: 'British Council London',
      certificateNumber: 'BC2024001234'
    };

    const credential = await issuer.issueIELTSCredential(ieltsData);
    console.log(`Credential issued with ID: ${credential.id}\n`);

    // Register credential
    await registry.registerCredential(credential);

    // 2. Holder stores credential
    console.log('Holder storing credential...');
    await holder.storeCredential(credential);
    console.log('Credential stored by holder\n');

    // 3. Create presentation request
    console.log('Creating presentation request...');
    const presentationRequest = verifier.createPresentationRequest(
      ['name', 'scores.overall', 'scores.speaking'],
      'University admission verification',
      { overall: 7.0, speaking: 7.0 }
    );
    console.log(`Presentation request created: ${presentationRequest.id}\n`);

    // 4. Holder creates presentation
    console.log('Creating verifiable presentation...');
    const presentation = await holder.createPresentation(presentationRequest);
    console.log('Presentation created with ZK proof\n');

    // 5. Verifier validates presentation
    console.log('Verifying presentation...');
    const verificationResult = await verifier.verifyPresentation(presentation);
    
    console.log('\nVERIFICATION RESULTS:');
    console.log(`Overall Valid: ${verificationResult.isValid ? 'Yes' : 'No'}`);
    console.log('Details:');
    console.log(`  - Credential Valid: ${verificationResult.details.credentialValid ? 'Yes' : 'No'}`);
    console.log(`  - Issuer Trusted: ${verificationResult.details.issuerTrusted ? 'Yes' : 'No'}`);
    console.log(`  - ZK Proof Valid: ${verificationResult.details.zkProofValid ? 'Yes' : 'No'}`);
    console.log(`  - Requirements Met: ${verificationResult.details.requirementsMet ? 'Yes' : 'No'}`);
    
    console.log('\nREVEALED DATA:');
    Object.entries(verificationResult.revealedData).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value}`);
    });

    // 6. Demonstrate selective disclosure
    console.log('\nDemonstrating selective disclosure...');
    const selectiveProof = await holder.createSelectiveDisclosurePresentation(
      credential.id,
      ['name', 'scores.overall']
    );
    console.log('✅ Selective disclosure proof created\n');

    // 7. Check registry status
  console.log('Checking registry status...');
    const registryStatus = registry.getCredentialStatus(credential.id);
    console.log(`Registry Status: ${registryStatus}`);
    console.log(`Revoked: ${registryStatus === 'revoked'}`);

  console.log('\nVC System demonstration completed successfully!');

  } catch (error) {
    console.error('❌ Error in demonstration:', error);
  }
}

// Export main components for external use
export { Issuer, Holder, Verifier, Registry };
export * from './types';

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateVCSystem();
}
