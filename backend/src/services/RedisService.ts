import IORedis from 'ioredis';
import { Service } from 'typedi';
import dotenv from 'dotenv';

dotenv.config();

@Service()
export class RedisService {
    private static instance: RedisService;
    private client: IORedis;
    private readonly DEFAULT_TTL = parseInt(process.env.REDIS_TTL || '604800');
    private readonly RETRY_MAX = parseInt(process.env.REDIS_RETRY_MAX || '2000');
    private readonly RETRY_INCREMENT = parseInt(process.env.REDIS_RETRY_INCREMENT || '50');

    private constructor() {
        this.client = new IORedis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
            retryStrategy: (times) => {
                return Math.min(times * this.RETRY_INCREMENT, this.RETRY_MAX);
            }
        });

        this.client.on('error', (err) => console.error('Redis Client Error:', err));
        this.client.on('connect', () => console.log('Redis Client Connected'));
    }

    static getInstance(): RedisService {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }

    async get<T>(key: string): Promise<T | null> {
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
    }

    async set(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
        await this.client.set(key, JSON.stringify(value), 'EX', ttl);
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    async clearCache(): Promise<void> {
        await this.client.flushall();
    }
}