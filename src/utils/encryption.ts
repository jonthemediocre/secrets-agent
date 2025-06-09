import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export class EncryptionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'EncryptionError';
  }
}

/**
 * Encrypt a string value using AES-256-GCM
 * @param text - The text to encrypt
 * @param password - The encryption key/password
 * @returns Promise<string> - Base64 encoded encrypted data with IV and auth tag
 */
export async function encrypt(text: string, password: string): Promise<string> {
  try {
    if (!text || typeof text !== 'string') {
      throw new EncryptionError('Text to encrypt must be a non-empty string');
    }
    
    if (!password || typeof password !== 'string') {
      throw new EncryptionError('Encryption password must be a non-empty string');
    }

    // Generate a random salt and IV
    const salt = randomBytes(32);
    const iv = randomBytes(16);
    
    // Derive key from password using scrypt
    const key = (await scryptAsync(password, salt, 32)) as Buffer;
    
    // Create cipher
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine salt, iv, authTag, and encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
    
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError('Failed to encrypt data', error as Error);
  }
}

/**
 * Decrypt a string value using AES-256-GCM
 * @param encryptedData - Base64 encoded encrypted data
 * @param password - The decryption key/password
 * @returns Promise<string> - The decrypted text
 */
export async function decrypt(encryptedData: string, password: string): Promise<string> {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new EncryptionError('Encrypted data must be a non-empty string');
    }
    
    if (!password || typeof password !== 'string') {
      throw new EncryptionError('Decryption password must be a non-empty string');
    }

    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64');
    
    if (combined.length < 32 + 16 + 16) { // salt + iv + authTag minimum
      throw new EncryptionError('Invalid encrypted data format');
    }
    
    // Extract components
    const salt = combined.subarray(0, 32);
    const iv = combined.subarray(32, 48);
    const authTag = combined.subarray(48, 64);
    const encrypted = combined.subarray(64);
    
    // Derive key from password using scrypt
    const key = (await scryptAsync(password, salt, 32)) as Buffer;
    
    // Create decipher
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
    
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError('Failed to decrypt data', error as Error);
  }
}

/**
 * Generate a secure random encryption key
 * @param length - Key length in bytes (default: 32 for AES-256)
 * @returns string - Base64 encoded random key
 */
export function generateEncryptionKey(length: number = 32): string {
  return randomBytes(length).toString('base64');
}

/**
 * Hash a password using scrypt for secure storage
 * @param password - The password to hash
 * @param salt - Optional salt (will generate if not provided)
 * @returns Promise<string> - Base64 encoded salt + hash
 */
export async function hashPassword(password: string, salt?: Buffer): Promise<string> {
  try {
    if (!password || typeof password !== 'string') {
      throw new EncryptionError('Password must be a non-empty string');
    }

    const passwordSalt = salt || randomBytes(32);
    const hash = (await scryptAsync(password, passwordSalt, 64)) as Buffer;
    
    // Combine salt and hash
    const combined = Buffer.concat([passwordSalt, hash]);
    return combined.toString('base64');
    
  } catch (error) {
    throw new EncryptionError('Failed to hash password', error as Error);
  }
}

/**
 * Verify a password against a hash
 * @param password - The password to verify
 * @param hashedPassword - The stored hash to verify against
 * @returns Promise<boolean> - True if password matches
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    if (!password || typeof password !== 'string') {
      throw new EncryptionError('Password must be a non-empty string');
    }
    
    if (!hashedPassword || typeof hashedPassword !== 'string') {
      throw new EncryptionError('Hashed password must be a non-empty string');
    }

    // Decode the stored hash
    const combined = Buffer.from(hashedPassword, 'base64');
    
    if (combined.length !== 96) { // 32 bytes salt + 64 bytes hash
      throw new EncryptionError('Invalid hash format');
    }
    
    const salt = combined.subarray(0, 32);
    const storedHash = combined.subarray(32);
    
    // Hash the provided password with the same salt
    const hash = (await scryptAsync(password, salt, 64)) as Buffer;
    
    // Compare hashes using constant-time comparison
    return hash.equals(storedHash);
    
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError('Failed to verify password', error as Error);
  }
} 