/**
 * Generates a consistent, unique, human-friendly Nerd Code for any user ID or email.
 * E.g.: "NERD-8492" or "NERD-A72F"
 */
export function generateNerdCode(userIdOrEmail: string): string {
  if (!userIdOrEmail) return 'NERD-0000';

  let hash = 0;
  for (let i = 0; i < userIdOrEmail.length; i++) {
    const char = userIdOrEmail.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }

  const positiveHash = Math.abs(hash);
  const codeNum = (positiveHash % 9000) + 1000; // 4-digit number between 1000-9999
  return `NERD-${codeNum}`;
}

/**
 * Creates a unique direct channel ID for two user codes regardless of order.
 * E.g.: direct:NERD-1234:NERD-5678
 */
export function getDirectChannelId(userCodeA: string, userCodeB: string): string {
  const sorted = [userCodeA.toUpperCase(), userCodeB.toUpperCase()].sort();
  return `direct:${sorted[0]}:${sorted[1]}`;
}
