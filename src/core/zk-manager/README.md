# ZK Manager - Modular Architecture

This folder contains the refactored ZK Manager implementation, split into focused, maintainable modules.

## Architecture Overview

The ZK Manager has been decomposed into the following modules:

### Core Files

- **`index.ts`** - Main ZKManager class that orchestrates all components
- **`types.ts`** - Type definitions and interfaces

### Utility Modules

- **`hashing-utils.ts`** - Credential hashing and Poseidon utilities
- **`performance-manager.ts`** - Performance metrics tracking

### Core Functionality Modules

- **`merkle-tree-manager.ts`** - Merkle tree operations and credential storage
- **`proof-generator.ts`** - ZK proof generation logic
- **`proof-verifier.ts`** - ZK proof verification logic
- **`state-manager.ts`** - Tree state save/load functionality

### Advanced Features

- **`advanced-proofs.ts`** - Range proofs, set membership, and aggregated proofs

## Key Benefits of This Architecture

1. **Separation of Concerns**: Each module has a single, well-defined responsibility
2. **Maintainability**: Easier to understand, test, and modify individual components
3. **Reusability**: Components can be used independently or in different combinations
4. **Testability**: Each module can be unit tested in isolation
5. **Extensibility**: New features can be added without affecting existing modules

## Module Dependencies

```
ZKManager (index.ts)
├── HashingUtils
├── PerformanceManager
├── MerkleTreeManager
│   └── HashingUtils
├── ProofGenerator
│   ├── MerkleTreeManager
│   └── HashingUtils
├── ProofVerifier
│   ├── MerkleTreeManager
│   └── HashingUtils
├── StateManager
│   ├── MerkleTreeManager
│   └── HashingUtils
└── AdvancedProofs
    ├── MerkleTreeManager
    ├── ProofGenerator
    └── HashingUtils
```

## Usage

The main ZKManager class maintains the same public API as before, so existing code should continue to work without changes:

```typescript
import { ZKManager } from './zk-manager';

const zkManager = new ZKManager();
await zkManager.initialize();

// All existing methods are available
const index = await zkManager.addCredential(credential);
const proof = await zkManager.generateZKProof(credentialId, fields);
const isValid = await zkManager.verifyZKProof(proof);
```

## Migration from Monolithic Version

The original `zk-manager.ts` file has been replaced with this modular structure. All functionality has been preserved, but the code is now organized into logical, maintainable modules.

To use the new version, simply update your imports:

```typescript
// Old import
import { ZKManager } from '../core/zk-manager';

// New import (same API)
import { ZKManager } from '../core/zk-manager';
```

The API remains exactly the same, ensuring backward compatibility.
