import IORedis from 'ioredis'
import dotenv from "dotenv"

dotenv.config({
    path: '.env'
})

const redisUrl = process.env.REDIS_URL

if (!redisUrl) {
  console.error('❌ REDIS_URL is not set')
  process.exit(1)
}

console.log("redis", redisUrl)

export const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 5000)
      return delay
    }
})

connection.on('connect', () => {
    console.log('✅ Redis connected successfully!')
})

connection.on('error', (err) => {
    console.error('❌ Redis Connection Error:', err.message)
})
