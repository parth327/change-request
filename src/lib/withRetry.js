// Retries a DB operation on transient connection failures (P1001: can't
// reach the server, P1002: timed out, P1017: connection closed) — the kind
// of blip a flaky network link or a cold-starting Neon compute produces,
// where the underlying operation never actually ran and is safe to redo —
// and on P2034, which Prisma raises when a Serializable transaction loses
// a write conflict to a concurrent one (see workflow.applyDecision) and
// explicitly documents as safe/expected to retry.
function isTransientDbError(err) {
  if (!err) return false;
  if (["P1001", "P1002", "P1017", "P2034"].includes(err.code)) return true;
  return /can't reach database server|timed out|connection.*closed/i.test(String(err.message));
}

async function withRetry(fn, { retries = 3, delayMs = 800 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientDbError(err) || attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw lastErr;
}

module.exports = { withRetry, isTransientDbError };
