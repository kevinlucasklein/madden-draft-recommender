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

playerRouter.get('/full', (async (_req: Request, res: Response) => {
    try {
        const query = `
        SELECT 
            p.player_id,
            p.first_name,
            p.last_name,
            p.height,
            p.weight,
            p.college,
            p.handedness,
            p.age,
            p.jersey_num,
            p.years_pro,
            pr.overall_rating,
            pr.iteration_label,
            pa1.ability_label as ability1,
            pa2.ability_label as ability2,
            pa3.ability_label as ability3,
            pa4.ability_label as ability4,
            pa5.ability_label as ability5,
            pa6.ability_label as ability6,
            a.label as archetype_label,
            t.name as team_name,
            t.label as team_label,
            pos.code as position,
            pos.position_type,
            ps.acceleration,
            ps.agility,
            ps.jumping,
            ps.stamina,
            ps.strength,
            ps.awareness,
            ps.bcvision,
            ps.block_shedding,
            ps.break_sack,
            ps.break_tackle,
            ps.carrying,
            ps.catch_in_traffic,
            ps.catching,
            ps.change_of_direction,
            ps.deep_route_running,
            ps.finesse_moves,
            ps.hit_power,
            ps.impact_blocking,
            ps.injury,
            ps.juke_move,
            ps.kick_accuracy,
            ps.kick_power,
            ps.kick_return,
            ps.lead_block,
            ps.man_coverage,
            ps.medium_route_running,
            ps.pass_block,
            ps.pass_block_finesse,
            ps.pass_block_power,
            ps.play_action,
            ps.play_recognition,
            ps.power_moves,
            ps.press,
            ps.pursuit,
            ps.release,
            ps.run_block,
            ps.run_block_finesse,
            ps.run_block_power,
            ps.running_style,
            ps.short_route_running,
            ps.spectacular_catch,
            ps.speed,
            ps.spin_move,
            ps.stiff_arm,
            ps.tackle,
            ps.throw_accuracy_deep,
            ps.throw_accuracy_mid,
            ps.throw_accuracy_short,
            ps.throw_on_the_run,
            ps.throw_power,
            ps.throw_under_pressure,
            ps.toughness,
            ps.trucking,
            ps.zone_coverage,
            pa.player_type,
            pa.original_position_score,
            pa.best_position_score,
            pa.normalized_score,
            pa.suggested_position,
            pa.position_change_recommended,
            pa.age_adjusted_score,
            pa.projected_pick,
            pa.rank
        FROM players p
        LEFT JOIN player_ratings pr ON p.player_id = pr.player_id
        LEFT JOIN player_abilities pa1 ON p.player_id = pa1.player_id AND pa1.ability_order = 1
        LEFT JOIN player_abilities pa2 ON p.player_id = pa2.player_id AND pa2.ability_order = 2
        LEFT JOIN player_abilities pa3 ON p.player_id = pa3.player_id AND pa3.ability_order = 3
        LEFT JOIN player_abilities pa4 ON p.player_id = pa4.player_id AND pa4.ability_order = 4
        LEFT JOIN player_abilities pa5 ON p.player_id = pa5.player_id AND pa5.ability_order = 5
        LEFT JOIN player_abilities pa6 ON p.player_id = pa6.player_id AND pa6.ability_order = 6
        LEFT JOIN archetypes a ON pr.archetype_id = a.archetype_id
        LEFT JOIN teams t ON pr.team_id = t.team_id
        LEFT JOIN positions pos ON pr.position_id = pos.position_id
        LEFT JOIN player_stats ps ON p.player_id = ps.player_id
        LEFT JOIN player_analysis pa ON p.player_id = pa.player_id
        ORDER BY pr.overall_rating DESC NULLS LAST`;
            
        const result = await AppDataSource.query(query);
        console.log(`Query successful. Found ${result.length} players`);
        res.json(result);
    } catch (error) {
        console.error('Detailed error:', error);
        res.status(500).json({ 
            message: "Error fetching player data", 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
}) as RequestHandler);

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

// GET player by ID - Move this AFTER /full
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