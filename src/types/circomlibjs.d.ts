declare module 'circomlibjs' {
  export function poseidon(inputs: bigint[]): bigint;
  export function poseidon1(inputs: bigint[]): bigint;
  export function poseidon2(inputs: bigint[]): bigint;
  export function poseidon3(inputs: bigint[]): bigint;
  export function poseidon4(inputs: bigint[]): bigint;
  export const F1Field: any;
  export const babyjub: any;
  export const eddsa: any;
  export const mimc7: any;
  export const mimcsponge: any;
  export const pedersen: any;
  export const smt: any;
  
  // BBS+ signature types
  export interface BBSKeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }
  
  export interface BBSSignature {
    signature: Uint8Array;
    publicKey: Uint8Array;
  }
  
  export interface BBSVerificationResult {
    valid: boolean;
    error?: string;
  }

  // Add BBS+ functions for deterministic signing
  export interface BBSSignOptions {
    deterministicK?: boolean;
    nonce?: Uint8Array;
  }

  export function bbsSign(message: Uint8Array, secretKey: Uint8Array, options?: BBSSignOptions): Uint8Array;
  export function bbsVerify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean;
  export function bbsKeyGen(seed?: Uint8Array): BBSKeyPair;
}
