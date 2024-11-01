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
        try {
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Redis get error for key ${key}:`, error);
            return null;
        }
    }

    async set(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
        try {
            await this.client.set(key, JSON.stringify(value), 'EX', ttl);
        } catch (error) {
            console.error(`Redis set error for key ${key}:`, error);
        }
    }

    async del(key: string): Promise<void> {
        try {
            await this.client.del(key);
        } catch (error) {
            console.error(`Redis del error for key ${key}:`, error);
        }
    }

    async clearCache(): Promise<void> {
        try {
            await this.client.flushall();
        } catch (error) {
            console.error('Redis clearCache error:', error);
        }
    }

    async delByPattern(pattern: string): Promise<void> {
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(...keys);
            }
        } catch (error) {
            console.error(`Redis delByPattern error for pattern ${pattern}:`, error);
        }
    }

    async exists(key: string): Promise<boolean> {
        try {
            return (await this.client.exists(key)) === 1;
        } catch (error) {
            console.error(`Redis exists error for key ${key}:`, error);
            return false;
        }
    }
}