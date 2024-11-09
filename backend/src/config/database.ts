import { DataSource } from 'typeorm';
import { Player } from '../entities/Player';
import { Team } from '../entities/Team';
import { Position } from '../entities/Position';
import { Archetype } from '../entities/Archetype';
import { PlayerRating } from '../entities/PlayerRating';
import { PlayerAbility } from '../entities/PlayerAbility';
import { PlayerStats } from '../entities/PlayerStats';
import { PlayerAnalysis } from '../entities/PlayerAnalysis';
import { RosterRequirement } from '../entities/RosterRequirement';
import { DraftSession } from '../entities/DraftSession';
import { DraftPick } from '../entities/DraftPick';
import { DraftRecommendation } from '../entities/DraftRecommendation';
import { DraftData } from '../entities/DraftData';
import { DraftBoardPick, DraftBoardResponse } from '../entities/DraftBoard';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD,
    database: "madden",  // Explicitly set this to "madden"
    entities: [
        Player,
        Team,
        Position,
        Archetype,
        PlayerRating,
        PlayerAbility,
        PlayerStats,
        PlayerAnalysis,
        RosterRequirement,
        DraftSession,
        DraftPick,
        DraftRecommendation,
        DraftData,
        DraftBoardPick,
        DraftBoardResponse
    ],
    synchronize: false,
    logging: true,
    extra: {
        max: 30 // connection pool size
    }
});