/**
 * Parse REDIS_URL into a BullMQ-compatible connection object.
 *
 * Using a plain options object (rather than an ioredis instance) avoids the
 * type clash between the top-level `ioredis` and the copy bundled inside
 * `bullmq`. `maxRetriesPerRequest: null` is required by BullMQ for the blocking
 * commands its workers rely on.
 */
export function redisConnection() {
  const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  };
}
