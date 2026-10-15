import { syncGmailForUser as fullSyncGmailForUser } from "./gmail";

/**
 * Delegate to the full Gmail sync function in src/lib/gmail.ts to ensure accurate
 * transaction extraction, debit/credit classification, and amount parsing.
 */
export async function syncGmailForUser(userId: string): Promise<void> {
  await fullSyncGmailForUser(userId, true, undefined, true);
}

