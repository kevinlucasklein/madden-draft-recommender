import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Player } from '../entities/Player';

export const getAllPlayers = async (req: Request, res: Response) => {
  try {
    const playerRepository = getRepository(Player);
    const players = await playerRepository.find();
    res.json(players);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching players' });
  }
};

// Add more controller functions as needed