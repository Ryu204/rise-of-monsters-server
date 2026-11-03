import { database } from "@src/db";
import { refreshTokenTable } from "@src/models/refreshToken";
import { inArray, isNotNull, lt, or } from "drizzle-orm";
import { err, ok, type Result } from "neverthrow";

const BATCH_SIZE = 1000;
const MAX_BATCHES_PER_RUN = 50;
const GRACE_MS = 24 * 60 * 60 * 1000;

export async function cleanupRefreshTokens(): Promise<Result<void, string>> {
  const cutoff = new Date(Date.now() - GRACE_MS);
  let total = 0;

  for (let i = 0; i < MAX_BATCHES_PER_RUN; i++) {
    try {
      const deleted = await database
        .delete(refreshTokenTable)
        .where(
          inArray(
            refreshTokenTable.tokenHash,
            database
              .select({ hash: refreshTokenTable.tokenHash })
              .from(refreshTokenTable)
              .where(
                or(
                  lt(refreshTokenTable.familyExpiresAt, cutoff),
                  isNotNull(refreshTokenTable.revokedAt),
                ),
              )
              .limit(BATCH_SIZE),
          ),
        )
        .returning({ hash: refreshTokenTable.tokenHash });

      total += deleted.length;
      console.log(`[Cleanup refresh tokens] Removed ${deleted.length} entries`);
      if (deleted.length < BATCH_SIZE) break;
      await new Promise((r) => setTimeout(r, 1000));
    } catch (e) {
      const msg = `${e}`;
      console.error(`[Cleanup refresh tokens] Error: ${msg}`);
      return err(msg);
    }
  }

  return ok();
}
