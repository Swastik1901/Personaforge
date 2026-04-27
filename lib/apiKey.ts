import crypto from 'crypto'

/**
 * Generate a secure API key with sk_ prefix
 * Format: sk_<32 random characters>
 */
export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(24)
  const key = randomBytes.toString('base64')
    .replace(/\+/g, '')
    .replace(/\//g, '')
    .replace(/=/g, '')
    .slice(0, 32)
  
  return `sk_${key}`
}

/**
 * Hash an API key for secure storage
 * Uses SHA-256 for fast constant-time comparison
 */
export function hashApiKey(apiKey: string): string {
  return crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex')
}

/**
 * Extract the prefix from an API key for indexing
 * Returns first 12 characters (sk_XXXXXXXX)
 */
export function getKeyPrefix(apiKey: string): string {
  return apiKey.slice(0, 12)
}

/**
 * Mask an API key for display
 * Shows: sk_abc...xyz
 */
export function maskApiKey(prefix: string): string {
  return `${prefix}${'*'.repeat(20)}${prefix.slice(-4)}`
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(a, 'utf-8'),
    Buffer.from(b, 'utf-8')
  )
}
