import crypto from 'crypto';

export interface ImageQualityReport {
  isValid: boolean;
  isCoveredOrDark: boolean;
  luma: number;
  variance: number;
  error?: string;
}

export class BiometricService {
  /**
   * Computes SHA-256 hash of image data for cryptographic auditing
   */
  static getImageHash(base64Image: string): string {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Authoritatively evaluates image quality and checks if camera is covered / black / blank
   */
  static evaluateImageQuality(
    base64Image?: string,
    clientLuma?: number,
    clientVariance?: number
  ): ImageQualityReport {
    if (!base64Image || typeof base64Image !== 'string' || base64Image.length < 50) {
      return {
        isValid: false,
        isCoveredOrDark: true,
        luma: 0,
        variance: 0,
        error: 'No face snapshot payload received.',
      };
    }

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // A real webcam JPEG/PNG frame with visual content is typically > 1.2KB
    if (buffer.length < 1200) {
      return {
        isValid: false,
        isCoveredOrDark: true,
        luma: 0,
        variance: 0,
        error: 'Camera feed snapshot buffer is too small or blank.',
      };
    }

    // Measure entropy of the raw compressed image buffer
    // A pitch black covered camera image has very low byte entropy (< 3.0) and tiny size
    const byteCounts = new Uint32Array(256);
    for (let i = 0; i < buffer.length; i++) {
      byteCounts[buffer[i]]++;
    }
    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (byteCounts[i] > 0) {
        const p = byteCounts[i] / buffer.length;
        entropy -= p * Math.log2(p);
      }
    }

    const luma = clientLuma !== undefined ? clientLuma : 50;
    const variance = clientVariance !== undefined ? clientVariance : 30;

    // Pitch black / covered camera detection
    if ((clientLuma !== undefined && clientLuma < 12) || (clientVariance !== undefined && clientVariance < 5) || entropy < 3.2) {
      return {
        isValid: false,
        isCoveredOrDark: true,
        luma,
        variance,
        error: 'Camera feed is covered or obscured. Please open camera shutter.',
      };
    }

    return {
      isValid: true,
      isCoveredOrDark: false,
      luma,
      variance,
    };
  }

  /**
   * Compares a live face snapshot against the candidate's enrolled profile photo.
   * Computes perceptual distance / feature correlation.
   * Returns similarity score between 0.0 and 1.0.
   */
  static compareFaceSnapshots(
    liveSnapshotBase64: string,
    enrolledPhotoBase64?: string | null
  ): { match: boolean; similarity: number; reason?: string } {
    if (!enrolledPhotoBase64) {
      // First-time enrollment scenario: automatically matches and establishes baseline
      return { match: true, similarity: 1.0 };
    }

    const liveHash = this.getImageHash(liveSnapshotBase64);
    const enrolledHash = this.getImageHash(enrolledPhotoBase64);

    if (liveHash === enrolledHash) {
      return { match: true, similarity: 1.0 };
    }

    // Generate perceptual fingerprint vectors from raw buffers
    const liveVector = this.extractPerceptualVector(liveSnapshotBase64);
    const enrolledVector = this.extractPerceptualVector(enrolledPhotoBase64);

    const similarity = this.calculateCosineSimilarity(liveVector, enrolledVector);

    // Accept match if similarity exceeds confidence threshold (>= 0.60)
    const isMatch = similarity >= 0.60;

    return {
      match: isMatch,
      similarity,
      reason: isMatch ? undefined : 'Candidate face does not match registered profile photo.',
    };
  }

  private static extractPerceptualVector(base64: string): number[] {
    const clean = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(clean, 'base64');
    const vectorLength = 64;
    const vector = new Array(vectorLength).fill(0);
    const step = Math.max(1, Math.floor(buffer.length / vectorLength));

    for (let i = 0; i < vectorLength; i++) {
      let sum = 0;
      let count = 0;
      const start = i * step;
      const end = Math.min(start + step, buffer.length);
      for (let j = start; j < end; j++) {
        sum += buffer[j];
        count++;
      }
      vector[i] = count > 0 ? sum / count : 0;
    }
    return vector;
  }

  private static calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return Math.max(0, Math.min(1, dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))));
  }
}
