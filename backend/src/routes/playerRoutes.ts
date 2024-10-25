// src/routes/playerRoutes.ts
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Player } from '../entities/Player';
import { RequestHandler } from 'express-serve-static-core';

// Type definitions
interface PlayerParams {
    id: string;
}

interface CreatePlayerBody {
    firstName: string;
    lastName: string;
    position: string;
    overall: number;
    jerseyNumber?: number;
    team?: string;
    dateOfBirth?: Date;
    heightCm?: number;
    weightKg?: number;
}

export const playerRouter = Router();

// GET all players
playerRouter.get('/', (async (_req: Request, res: Response) => {
    try {
        const playerRepository = AppDataSource.getRepository(Player);
        const players = await playerRepository.find();
        res.json(players);
    } catch (error) {
        res.status(500).json({ message: "Error fetching players", error });
    }
}) as RequestHandler);

// GET player by ID
playerRouter.get('/:id', (async (req: Request<PlayerParams>, res: Response) => {
    try {
        const playerRepository = AppDataSource.getRepository(Player);
        const player = await playerRepository.findOne({
            where: { id: parseInt(req.params.id) }
        });
        if (!player) {
            return res.status(404).json({ message: "Player not found" });
        }
        res.json(player);
    } catch (error) {
        res.status(500).json({ message: "Error fetching player", error });
    }
}) as RequestHandler<PlayerParams>);

// POST new player
playerRouter.post('/', (async (req: Request<{}, {}, CreatePlayerBody>, res: Response) => {
    try {
        const playerRepository = AppDataSource.getRepository(Player);
        const newPlayer = playerRepository.create(req.body);
        const result = await playerRepository.save(newPlayer);
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ message: "Error creating player", error });
    }
}) as RequestHandler<{}, any, CreatePlayerBody>);

// PUT update player
playerRouter.put('/:id', (async (req: Request<PlayerParams, {}, Partial<CreatePlayerBody>>, res: Response) => {
    try {
        const playerRepository = AppDataSource.getRepository(Player);
        const player = await playerRepository.findOne({
            where: { id: parseInt(req.params.id) }
        });
        if (!player) {
            return res.status(404).json({ message: "Player not found" });
        }
        playerRepository.merge(player, req.body);
        const result = await playerRepository.save(player);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error updating player", error });
    }
}) as RequestHandler<PlayerParams, any, Partial<CreatePlayerBody>>);

// DELETE player
playerRouter.delete('/:id', (async (req: Request<PlayerParams>, res: Response) => {
    try {
        const playerRepository = AppDataSource.getRepository(Player);
        const result = await playerRepository.delete(req.params.id);
        if (result.affected === 0) {
            return res.status(404).json({ message: "Player not found" });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: "Error deleting player", error });
    }
}) as RequestHandler<PlayerParams>);