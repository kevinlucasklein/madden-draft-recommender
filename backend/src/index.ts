// src/index.ts
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { playerRouter } from './routes/playerRoutes';
import { AppDataSource } from './config/database';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/players', playerRouter);

AppDataSource.initialize()
    .then(() => {
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
            console.log(`Database connection established`);
        });
    })
    .catch(error => console.log('TypeORM connection error: ', error));