import { DataSource } from 'typeorm';
import { Player } from '../entities/Player';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD,
    database: "madden",  // Explicitly set this to "madden"
    entities: [Player],
    synchronize: false,
    logging: true,
    extra: {
        max: 30 // connection pool size
    }
});