// Global test setup
beforeAll(async () => {
  // Setup global test environment
  console.log('🧪 Setting up test environment...');
  
  // Suppress BBS warnings during tests
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0];
    if (typeof message === 'string' && 
        (message.includes('BBS') || 
         message.includes('mock implementation') ||
         message.includes('mock mode'))) {
      // Suppress these warnings during tests
      return;
    }
    originalWarn.apply(console, args);
  };
});

afterAll(async () => {
  // Cleanup after all tests
  console.log('🧹 Cleaning up test environment...');
});

// Extend Jest matchers if needed
expect.extend({
  toBeValidCredential(received) {
    const pass = received && 
                 received.id && 
                 received.type && 
                 received.issuer && 
                 received.credentialSubject &&
                 received.proof;
    
    return {
      message: () => `Expected ${received} to be a valid credential`,
      pass,
    };
  },
});
