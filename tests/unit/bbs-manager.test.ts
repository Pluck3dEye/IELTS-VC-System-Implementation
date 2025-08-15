import { BBSManager } from '../../src/core/bbs-manager';
import { IELTSCredential } from '../../src/types';

describe('BBSManager', () => {
  let bbsManager: BBSManager;
  let testCredential: IELTSCredential;

  beforeEach(async () => {
    bbsManager = new BBSManager();
    await bbsManager.generateKeyPair();
    
    testCredential = {
      id: 'test-credential-1',
      holder: 'did:example:holder:test',
      name: 'Test User',
      dateOfBirth: '1990-01-01',
      scores: {
        listening: 8.0,
        reading: 7.5,
        writing: 7.0,
        speaking: 8.5,
        overall: 7.5
      },
      certificationDate: '2024-01-01',
      expiryDate: '2026-01-01',
      testCenter: 'Test Center',
      certificateNumber: 'TEST001'
    };
  }, 30000);

  test('should initialize properly', () => {
    expect(bbsManager).toBeDefined();
    expect(testCredential).toBeDefined();
    expect(testCredential.name).toBe('Test User');
  });
});
