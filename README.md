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

## Available Scripts

Here is a list of the most important scripts available in `package.json`:

-   `npm run build`: Compiles TypeScript to JavaScript.
-   `npm start`: Runs the compiled JavaScript application.
-   `npm run dev`: Runs the application in development mode using `ts-node`.
-   `npm run clean`: Removes the `dist` directory.
-   `npm test`: Runs all tests.
-   `npm run demo`: Runs an interactive demo of the system.

## Project Structure

The project is organized as follows:

-   `src/`: Contains the source code.
    -   `components/`: Core components of the VC system (Holder, Issuer, Verifier, Registry).
    -   `core/`: Cryptographic primitives (BBS+ signatures, ZK proofs).
    -   `demo/`: Interactive demo scripts.
    -   `types/`: TypeScript type definitions.
-   `tests/`: Contains all test files.
    -   `unit/`, `integration/`, `e2e/`, `security/`, `system/`: Different categories of tests.
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
