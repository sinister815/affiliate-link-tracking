import IORedis from 'ioredis'
import dotenv from "dotenv"
dotenv.config({
    path: '.env'
})
console.log("redis",process.env.REDIS_URL)


export const connection = new IORedis(
    process.env.REDIS_URL,
    {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
    tls : {}
});
connection.on('connect', () => {
    console.log('✅ Redis connected successfully!');
});

connection.on('error', (err) => {
    console.error('❌ Redis Connection Error:', err.message);
}); 