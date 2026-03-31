import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

// ─── Assessment status helpers ───────────────────────────────────────────────

const STATUS_KEY = (assessmentId: string) => `assessment:status:${assessmentId}`;
const STATUS_TTL = 60 * 60 * 24 * 7; // 7 days

export async function setAssessmentStatus(
  assessmentId: string,
  status: string,
): Promise<void> {
  await redis.setex(STATUS_KEY(assessmentId), STATUS_TTL, status);
}

export async function getAssessmentStatus(assessmentId: string): Promise<string | null> {
  return redis.get(STATUS_KEY(assessmentId));
}

// ─── Session progress cache (survives brief disconnects §TEST-08) ─────────────

const SESSION_KEY = (uuid: string) => `session:progress:${uuid}`;
const SESSION_TTL = 60 * 60 * 4; // 4 hours

export async function cacheSessionProgress(uuid: string, data: unknown): Promise<void> {
  await redis.setex(SESSION_KEY(uuid), SESSION_TTL, JSON.stringify(data));
}

export async function getSessionProgress(uuid: string): Promise<unknown | null> {
  const raw = await redis.get(SESSION_KEY(uuid));
  return raw ? JSON.parse(raw) : null;
}

export async function clearSessionProgress(uuid: string): Promise<void> {
  await redis.del(SESSION_KEY(uuid));
}
