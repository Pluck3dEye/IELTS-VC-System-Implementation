import { IELTSCredential } from './types';

const circomlibjs = require('circomlibjs');

export class HashingUtils {
  private poseidonHash: any;

  async initialize(): Promise<void> {
    this.poseidonHash = await circomlibjs.buildPoseidon();
  }

  async hashCredential(credential: IELTSCredential): Promise<bigint> {
    if (!this.poseidonHash) {
      throw new Error('HashingUtils not initialized');
    }

    // Create a deterministic hash of the credential using Poseidon
    const data = [
      credential.id,
      credential.holder,
      credential.name,
      credential.dateOfBirth,
      credential.scores.listening.toString(),
      credential.scores.reading.toString(),
      credential.scores.writing.toString(),
      credential.scores.speaking.toString(),
      credential.scores.overall.toString(),
      credential.certificationDate,
      credential.expiryDate,
      credential.testCenter,
      credential.certificateNumber
    ].join('|');

    const dataBytes = new TextEncoder().encode(data);
    const chunks: bigint[] = [];
    
    // Split data into chunks that fit into bigint
    for (let i = 0; i < dataBytes.length; i += 31) {
      const chunk = dataBytes.slice(i, i + 31);
      let value = BigInt(0);
      for (let j = 0; j < chunk.length; j++) {
        value = (value << BigInt(8)) | BigInt(chunk[j]);
      }
      chunks.push(value);
    }

    // Hash the chunks using Poseidon
    let hash;
    if (chunks.length === 1) {
      hash = this.poseidonHash([chunks[0]]);
    } else {
      hash = this.poseidonHash(chunks);
    }
    
    // Convert Poseidon hash result to bigint using the helper method
    return this.convertPoseidonToBigInt(hash);
  }

  convertPoseidonToBigInt(hash: any): bigint {
    if (typeof hash === 'bigint') {
      return hash;
    } else if (hash instanceof Uint8Array) {
      let result = BigInt(0);
      for (let i = 0; i < hash.length; i++) {
        result = (result << BigInt(8)) | BigInt(hash[i]);
      }
      return result;
    } else if (Array.isArray(hash)) {
      let result = BigInt(0);
      for (let i = 0; i < hash.length; i++) {
        result = (result << BigInt(8)) | BigInt(hash[i]);
      }
      return result;
    } else {
      return BigInt(hash);
    }
  }

  getPoseidonHash(): any {
    return this.poseidonHash;
  }
}
