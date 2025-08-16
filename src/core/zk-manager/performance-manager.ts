import { PerformanceMetrics, PerformanceReport } from './types';

export class PerformanceManager {
  private metrics: PerformanceMetrics;

  constructor() {
    this.metrics = {
      credentialAdditions: 0,
      proofGenerations: 0,
      proofVerifications: 0,
      totalAdditionTime: 0,
      totalProofGenerationTime: 0,
      totalProofVerificationTime: 0
    };
  }

  recordCredentialAddition(duration: number): void {
    this.metrics.credentialAdditions++;
    this.metrics.totalAdditionTime += duration;
  }

  recordProofGeneration(duration: number): void {
    this.metrics.proofGenerations++;
    this.metrics.totalProofGenerationTime += duration;
  }

  recordProofVerification(duration: number): void {
    this.metrics.proofVerifications++;
    this.metrics.totalProofVerificationTime += duration;
  }

  getMetrics(): PerformanceReport {
    return {
      operations: {
        credentialAdditions: this.metrics.credentialAdditions,
        proofGenerations: this.metrics.proofGenerations,
        proofVerifications: this.metrics.proofVerifications
      },
      averageTimes: {
        credentialAddition: this.metrics.credentialAdditions > 0 
          ? this.metrics.totalAdditionTime / this.metrics.credentialAdditions 
          : 0,
        proofGeneration: this.metrics.proofGenerations > 0 
          ? this.metrics.totalProofGenerationTime / this.metrics.proofGenerations 
          : 0,
        proofVerification: this.metrics.proofVerifications > 0 
          ? this.metrics.totalProofVerificationTime / this.metrics.proofVerifications 
          : 0
      },
      totalTimes: {
        credentialAddition: this.metrics.totalAdditionTime,
        proofGeneration: this.metrics.totalProofGenerationTime,
        proofVerification: this.metrics.totalProofVerificationTime
      }
    };
  }

  reset(): void {
    this.metrics = {
      credentialAdditions: 0,
      proofGenerations: 0,
      proofVerifications: 0,
      totalAdditionTime: 0,
      totalProofGenerationTime: 0,
      totalProofVerificationTime: 0
    };
  }
}
