#!/usr/bin/env node

/**
 * Simple runner for the Merkle Tree demonstration
 * Usage: npm run demo:merkle or node dist/demo/run-merkle-demo.js
 */

import { runMerkleTreeDemo } from './merkle-tree-demo';

async function main() {
  console.log('🚀 Starting Indexed Merkle Tree Demonstration\n');
  
  try {
    await runMerkleTreeDemo();
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

main();
