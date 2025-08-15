# Verifiable Credentials System for IELTS Certification

This project implements a Verifiable Credentials (VC) system for IELTS certification, utilizing BBS+ signatures for privacy-preserving selective disclosure and Zero-Knowledge (ZK) proofs for enhanced security and verification.

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
  - [Building the Project](#building-the-project)
  - [Running the Application](#running-the-application)
  - [Running in Development Mode](#running-in-development-mode)
- [Running Tests](#running-tests)
- [Merkle Tree Demonstrations](#merkle-tree-demonstrations)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Dependencies](#dependencies)
- [License](#license)

## Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

Make sure you have the following software installed:

- [Node.js](https://nodejs.org/) (v20.0.0 or later recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Navigate to the project directory:
    ```bash
    cd vc-system
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

## Usage

### Building the Project

To compile the TypeScript code into JavaScript, run the following command. The output will be in the `dist` directory.

```bash
npm run build
```

### Running the Application

After building the project, you can start the application with:

```bash
npm start
```

### Running in Development Mode

For development, you can run the project using `ts-node`, which will compile and run the code on the fly:

```bash
npm run dev
```

## Running Tests

This project uses Jest for testing. You can run the entire test suite with:

```bash
npm test
```

Specific test suites can be run with the following commands:

-   **Unit Tests:**
    ```bash
    npm run test:unit
    ```
-   **Integration Tests:**
    ```bash
    npm run test:integration
    ```
-   **End-to-End (E2E) Tests:**
    ```bash
    npm run test:e2e
    ```
-   **Security Tests:**
    ```bash
    npm run test:security
    ```
-   **Real-World Scenarios:**
    ```bash
    npm run test:real-world
    ```

You can also run tests in watch mode or generate a coverage report:

-   **Watch Mode:**
    ```bash
    npm run test:watch
    ```
-   **Coverage Report:**
    ```bash
    npm run test:coverage
    ```

## Merkle Tree Demonstrations

This project includes several ways to explore and understand how the Indexed Merkle Tree works in the Verifiable Credentials system. The Indexed Merkle Tree is a crucial component that maintains credential integrity while enabling Zero-Knowledge proofs.

### Interactive Merkle Tree Demo

Run a comprehensive demonstration that shows step-by-step how the Indexed Merkle Tree operates:

```bash
npm run demo:merkle
```

This demonstration will show you:
- Tree initialization with Poseidon hash function
- Adding credentials to the tree and watching root changes
- Current tree state with leaf nodes and root hash
- Zero-Knowledge proof generation with selective disclosure
- Proof verification and integrity checks

### Enhanced System Demo with Merkle Tree Logging

Run the main system demonstration with detailed merkle tree information:

```bash
npm run dev
```

This enhanced version includes:
- Merkle tree root logging during credential registration
- ZK proof structure details during presentation creation
- Tree index information for registered credentials

### Test-based Merkle Tree Demonstration

Run interactive tests that demonstrate merkle tree functionality:

```bash
npm test -- tests/demo/merkle-tree-demo.test.ts
```

This test suite shows:
- Step-by-step tree operations with assertions
- Different proof revelation scenarios (name only, scores, etc.)
- Proof verification with various field combinations
- Tree state validation at each step

### Understanding the Output

When running the merkle tree demonstrations, you'll see:

- **Tree Root**: A large number that uniquely represents the current tree state
- **Tree Index**: Sequential numbers (0, 1, 2...) assigned to each credential
- **Leaf Nodes**: Hash values representing individual credentials
- **ZK Proofs**: Cryptographic proofs that allow selective disclosure
- **Revealed Attributes**: Only the fields you choose to disclose

### Example Output

```
 INDEXED MERKLE TREE DEMONSTRATION
=====================================

1. Initializing Indexed Merkle Tree...
    Tree initialized with Poseidon hash function
    Initial tree root: 20904263309775236245566347617139780413277211320889904019085937429497372345062

2. Adding credentials to the Indexed Merkle Tree...
   Adding Credential 1: Alice Johnson
   Root before: 20904263309775236245566347617139780413277211320889904019085937429497372345062
   Root after:  635952219856768740976092005275438554701686686927562320539835476702228813184
   Tree index:  0
   Root changed: Yes
```

## Available Scripts

Here is a list of the most important scripts available in `package.json`:

-   `npm run build`: Compiles TypeScript to JavaScript.
-   `npm start`: Runs the compiled JavaScript application.
-   `npm run dev`: Runs the application in development mode using `ts-node`.
-   `npm run clean`: Removes the `dist` directory.
-   `npm test`: Runs all tests.
-   `npm run demo`: Runs an interactive demo of the system.
-   `npm run demo:merkle`: Runs the Indexed Merkle Tree demonstration.
-   `npm run demo:tree`: Alternative command for merkle tree demo.

## Project Structure

The project is organized as follows:

-   `src/`: Contains the source code.
    -   `components/`: Core components of the VC system (Holder, Issuer, Verifier, Registry).
    -   `core/`: Cryptographic primitives (BBS+ signatures, ZK proofs).
    -   `demo/`: Interactive demo scripts and merkle tree demonstrations.
    -   `types/`: TypeScript type definitions.
-   `tests/`: Contains all test files.
    -   `unit/`, `integration/`, `e2e/`, `security/`, `system/`: Different categories of tests.
    -   `demo/`: Demonstration and educational test files.
-   `dist/`: Compiled JavaScript output.

## Dependencies

### Main Dependencies

-   `@mattrglobal/bbs-signatures`: For creating and verifying BBS+ signatures.
-   `circomlibjs`: For cryptographic operations related to ZK proofs.
-   `@jayanth-kumar-morem/indexed-merkle-tree`: For Merkle tree operations.

### Development Dependencies

-   `typescript`: For TypeScript support.
-   `ts-node`: To run TypeScript code directly.
-   `jest`: For testing.
-   `rimraf`: For cleaning build artifacts.

## License

This project is licensed under the ISC License. See the `LICENSE` file for details.
