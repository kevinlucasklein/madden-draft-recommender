import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { PlayerAnalysis } from '../entities/PlayerAnalysis';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { CreatePlayerAnalysisInput, UpdatePlayerAnalysisInput } from '../inputs/PlayerAnalysisInput';
import { POSITION_STAT_WEIGHTS, POSITION_THRESHOLDS, determinePlayerArchetype } from '../config/positionStats';
import { Player } from '../entities/Player';
import { PlayerStats, PlayerStatsIndexed } from '../entities/PlayerStats';
import fs from 'fs';
import path from 'path';


type StatWeight = {
    [key: string]: number;
};

type PositionWeights = {
    [key: string]: StatWeight;
};

// Define interfaces for our types
interface PositionThreshold {
    minWeight: number;
    maxWeight?: number;  // Optional for positions like DT that only have min
    penalty: number;
}

type PositionAgeFactor = {
    QB: number;
    K: number;
    P: number;
    RB: number;
    FB: number;
    WR: number;
    CB: number;
    SS: number;
    FS: number;
    TE: number;
    DE: number;
    LOLB: number;
    ROLB: number;
    DT: number;
    NT: number;
    C: number;
    G: number;
    LG: number;
    RG: number;
    LT: number;
    RT: number;
    MLB: number;
};

interface PlayerArchetype {
    primaryType: string;
    secondaryType?: string;
    versatility: string[];
    specialTraits: string[];
}

@Service()
export class PlayerAnalysisService {
    private analysisRepository: Repository<PlayerAnalysis>;
    private playerRepository: Repository<Player>;
    private redisService: RedisService;
    private statsRepository: Repository<PlayerStats>;
    private logFile: string;

    constructor() {
        this.analysisRepository = AppDataSource.getRepository(PlayerAnalysis);
        this.playerRepository = AppDataSource.getRepository(Player);
        this.redisService = RedisService.getInstance();
        this.statsRepository = AppDataSource.getRepository(PlayerStats);
        
        // Use absolute path from project root
        const projectRoot = path.resolve(__dirname, '../../');
        const logsDir = path.join(projectRoot, 'logs');
        
        try {
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            this.logFile = path.join(logsDir, 'player-analysis.log');
            
            // Test write access
            fs.appendFileSync(this.logFile, `Service initialized at ${new Date().toISOString()}\n`);
            console.log(`Logging to: ${this.logFile}`);
        } catch (error) {
            console.error('Error setting up log file:', error);
            // Fallback to console logging if file logging fails
            this.log = (message: string) => console.log(`[PlayerAnalysis] ${message}`);
        }
    }

    private log(message: string) {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp}: ${message}\n`;
        
        try {
            fs.appendFileSync(this.logFile, logMessage);
        } catch (error) {
            console.log(`[PlayerAnalysis] ${message}`);
            console.error('Error writing to log file:', error);
        }
    }

    private async clearAnalysisCache(id?: number, playerId?: number) {
        if (id) {
            await this.redisService.del(`analysis:${id}`);
        }
        if (playerId) {
            await this.redisService.del(`analysis:player:${playerId}`);
        }
        await this.redisService.del('analyses:all');
    }

    
    private calculatePositionScore(
        stats: PlayerStatsIndexed, 
        position: keyof typeof POSITION_STAT_WEIGHTS, 
        player: Player
    ): number {
        const weights = POSITION_STAT_WEIGHTS[position];
        if (!weights) {
            this.log(`No weights found for position: ${position}`);
            return 0;
        }
    
        let totalScore = 0;
        let totalWeight = 0;
        const missingStats: string[] = [];
    
        // Calculate base score
        for (const [stat, weight] of Object.entries(weights)) {
            const statValue = stats[stat];
            if (typeof statValue === 'number') {  // Only use number values
                totalScore += statValue * weight;
                totalWeight += weight;
            } else {
                missingStats.push(stat);
            }
        }
    
        let score = totalWeight > 0 ? (totalScore / totalWeight) : 0;
    
        // Apply body type adjustments
        const threshold = POSITION_THRESHOLDS[position] as PositionThreshold;
        if (threshold && player.weight) {
            let shouldPenalize = false;
            
            if (threshold.minWeight && player.weight < threshold.minWeight) {
                shouldPenalize = true;
                this.log(`${player.firstName} ${player.lastName} too light for ${position}: ${player.weight} < ${threshold.minWeight}`);
            }
            
            if ('maxWeight' in threshold && threshold.maxWeight && player.weight > threshold.maxWeight) {
                shouldPenalize = true;
                this.log(`${player.firstName} ${player.lastName} too heavy for ${position}: ${player.weight} > ${threshold.maxWeight}`);
            }
    
            if (shouldPenalize) {
                score *= (1 - threshold.penalty);
                this.log(`Applied ${threshold.penalty * 100}% penalty to ${position} score for ${player.firstName} ${player.lastName}`);
            }
        }
    
        // Apply age adjustment if age is available
        if (typeof player.age === 'number') {
            score = this.calculateAgeAdjustedScore(score, player.age, position);
            this.log(`Age-adjusted score for ${player.firstName} ${player.lastName} at ${position}: ${score}`);
        } else {
            this.log(`No age data available for ${player.firstName} ${player.lastName}, skipping age adjustment`);
        }
    
        return score;
    }

    private calculateAgeAdjustedScore(rawScore: number, age: number, position: string): number {
        const AGE_MODIFIERS = {
            YOUNG_PROSPECT: { maxAge: 23, modifier: 1.08 },
            DEVELOPING: { maxAge: 26, modifier: 1.04 },
            PRIME: { maxAge: 29, modifier: 1.0 },
            VETERAN: { maxAge: 32, modifier: 0.97 },
            AGING: { maxAge: 35, modifier: 0.94 },
            TWILIGHT: { maxAge: Infinity, modifier: 0.90 }
        };
    
        // Expanded position factors based on physical demands and longevity
        const POSITION_AGE_FACTORS: PositionAgeFactor = {
            // Skill Positions (High Impact/Speed Dependent)
            RB: 0.96,  // Running backs decline fastest due to physical toll
            FB: 0.97,  // Fullbacks similar to RB but slightly better longevity
            WR: 0.98,  // Speed-dependent but less contact than RB
            CB: 0.98,  // Heavily dependent on speed and agility
            
            // Hybrid Positions (Mixed Physical/Skill)
            SS: 0.99,  // Strong safeties face more physical demands
            FS: 0.99,  // Free safeties slightly better longevity than SS
            TE: 0.99,  // Tight ends balance receiving and blocking
            
            // Edge Positions (Power/Speed Mix)
            DE: 0.99,  // Edge rushers rely on explosion and power
            LOLB: 0.99,
            ROLB: 0.99,
            
            // Interior Positions (Power/Technique)
            DT: 1.00,  // Interior linemen rely more on technique
            NT: 1.00,
            C: 1.00,   // Centers rely on technique and mental game
            G: 1.00,   // Guards similar to center
            LG: 1.00,
            RG: 1.00,
            
            // Tackle Positions
            LT: 1.00,  // Tackles balance technique and athleticism
            RT: 1.00,
            
            // Linebacker
            MLB: 0.99, // Middle linebackers balance physical/mental
            
            // Low Impact Positions (Skill/Mental Focus)
            QB: 1.03,  // Quarterbacks often improve with experience
            K: 1.03,   // Kickers have longest careers
            P: 1.03    // Punters similar to kickers
        };
    
        // Get age modifier
        let modifier = AGE_MODIFIERS.TWILIGHT.modifier;
        for (const bracket of Object.values(AGE_MODIFIERS)) {
            if (age <= bracket.maxAge) {
                modifier = bracket.modifier;
                break;
            }
        }
    
        // Type-safe position factor lookup
        const positionFactor = (POSITION_AGE_FACTORS as Record<string, number>)[position] || 1.0;
        const finalModifier = modifier * positionFactor;
    
        this.log(`Age adjustment for ${position}: Base modifier ${modifier}, Position factor ${positionFactor}, Final ${finalModifier}`);
        return rawScore * finalModifier;
    }

    private async updatePositionRanks(): Promise<void> {
        try {
            // Get all analyses
            const analyses = await this.analysisRepository.find();
            
            // Group analyses by position scores
            const positionGroups: Record<string, PlayerAnalysis[]> = {};
            
            analyses.forEach(analysis => {
                Object.entries(analysis.positionScores).forEach(([position, score]) => {
                    if (!positionGroups[position]) {
                        positionGroups[position] = [];
                    }
                    positionGroups[position].push(analysis);
                });
            });
    
            // Sort and rank each position group
            const updates = analyses.map(analysis => {
                const positionRanks: Record<string, number> = {};
                
                Object.entries(analysis.positionScores).forEach(([position, score]) => {
                    const positionList = positionGroups[position];
                    // Sort by score descending
                    positionList.sort((a, b) => 
                        (b.positionScores[position] || 0) - (a.positionScores[position] || 0)
                    );
                    // Find index of current analysis
                    const rank = positionList.findIndex(a => a.id === analysis.id) + 1;
                    positionRanks[position] = rank;
                });
    
                return {
                    ...analysis,
                    positionRanks
                };
            });
    
            // Batch save all updates
            await this.analysisRepository.save(updates);
            await this.clearAnalysisCache();
            
            this.log('Position ranks updated successfully');
        } catch (error) {
            this.log(`Error updating position ranks: ${error}`);
            throw error;
        }
    }

    async analyzePlayer(playerId: number): Promise<PlayerAnalysis> {
        // Cache the position weights lookup
        const positionWeights = Object.entries(POSITION_STAT_WEIGHTS);
        
        const player = await this.playerRepository
            .createQueryBuilder('player')
            .leftJoinAndSelect('player.ratings', 'ratings')
            .leftJoinAndSelect('ratings.position', 'position')
            .leftJoinAndSelect('player.stats', 'stats')
            .where('player.id = :id', { id: playerId })
            .getOne();
    
        if (!player) {
            throw new Error('Player not found');
        }
    
        if (!player.ratings?.[0]?.position) {  // Check position through ratings
            throw new Error(`No position found for player ${playerId}`);
        }
    
        if (!player.stats || player.stats.length === 0) {
            throw new Error(`No stats found for player ${playerId}`);
        }
    
        const currentStats = player.stats[player.stats.length - 1];
    
        // Calculate scores for each position more efficiently
        const positionScores: Record<string, number> = {};
        const calculations = positionWeights.map(([position, weights]) => {
            const score = this.calculatePositionScore(
                currentStats,
                position as keyof typeof POSITION_STAT_WEIGHTS,
                player
            );
            return [position, score] as [string, number];
        });
    
        // Assign all scores at once
        calculations.forEach(([position, score]) => {
            positionScores[position] = score;
        });
        
        const sortedPositions = Object.entries(positionScores)
            .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
            .map(([position, score]) => ({
                position,
                score
            }));
        
        const bestPosition = sortedPositions[0].position;
        // Use the score directly from positionScores to maintain precision
        const bestScore = positionScores[bestPosition];
        
        const topPositions = sortedPositions.filter(pos => 
            pos.score > Math.max(50, bestScore * 0.75)
        );

        this.log(`Best position: ${bestPosition} (${bestScore})`);
        this.log(`Viable positions: ${topPositions.map(p => `${p.position}:${p.score}`).join(', ')}`);
    
        const archetype = determinePlayerArchetype(currentStats, bestPosition);
    
        // Batch the database operations
        const analysis = await this.analysisRepository.save({
            id: (await this.findByPlayer(playerId))?.id,
            player: { id: playerId },
            positionScores,
            bestPosition,
            normalizedScore: bestScore,
            primaryArchetype: archetype.primaryType,
            secondaryArchetype: archetype.secondaryType,
            versatilePositions: archetype.versatility,
            specialTraits: archetype.specialTraits,
            topPositions,
            viablePositionCount: topPositions.length
        });

        await this.clearAnalysisCache(analysis.id, playerId);
        return analysis;
    }

    async analyzeAllPlayers(): Promise<void> {
        try {
            // Clear the log file before starting
            fs.writeFileSync(this.logFile, '');
            console.log('Starting analysis of all players...');
            
            // Get all players in one query with necessary relations
            const players = await this.playerRepository
                .createQueryBuilder('player')
                .leftJoinAndSelect('player.ratings', 'ratings')
                .leftJoinAndSelect('ratings.position', 'position')
                .leftJoinAndSelect('player.stats', 'stats')
                .getMany();
            
            this.log(`Found ${players.length} players to analyze`);
            console.log(`Found ${players.length} players to analyze`);
            
            // Process players in batches
            const BATCH_SIZE = 50;
            const batches = [];
            
            for (let i = 0; i < players.length; i += BATCH_SIZE) {
                const batch = players.slice(i, i + BATCH_SIZE);
                batches.push(batch);
            }
    
            // Process each batch concurrently
            for (const batch of batches) {
                await Promise.all(batch.map(async (player) => {
                    try {
                        console.log(`Analyzing player ${player.id}: ${player.firstName} ${player.lastName}`);
                        const analysis = await this.analyzePlayer(player.id);
                        
                        // Batch save the analyses
                        return analysis;
                    } catch (err) {
                        const error = err as Error;
                        this.log(`Error analyzing player ${player.id}: ${error.message}`);
                        console.error(`Error analyzing player ${player.id}:`, error);
                        return null;
                    }
                }));
                
                // Small delay between batches to prevent overwhelming the DB
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        
            // Update ranks after all analyses are complete
            // Update overall ranks and position ranks
            try {
                await this.updateRanks();
                await this.updatePositionRanks();
                this.log('Ranks updated successfully');
            } catch (err) {
                const error = err as Error;
                this.log(`Error updating ranks: ${error.message}`);
                console.error('Error updating ranks:', error);
            }
            
            this.log('Analysis complete');
            console.log('Analysis complete');
        } catch (error) {
            console.error('Error in analyzeAllPlayers:', error);
            throw error;
        }
    }

    async findAll(): Promise<PlayerAnalysis[]> {
        try {
            const cacheKey = 'analyses:all';
            const cached = await this.redisService.get<PlayerAnalysis[]>(cacheKey);
            
            if (cached) {
                console.log('Returning cached player analyses');
                return cached;
            }

            console.log('Fetching player analyses from database');
            const analyses = await this.analysisRepository.find({
                relations: {
                    player: true,
                    rating: true
                },
                order: {
                    rank: 'ASC'
                }
            });

            await this.redisService.set(cacheKey, analyses);
            return analyses;
        } catch (error) {
            console.error('Error in findAll:', error);
            throw error;
        }
    }

    async findOne(id: number): Promise<PlayerAnalysis | null> {
        try {
            const cacheKey = `analysis:${id}`;
            const cached = await this.redisService.get<PlayerAnalysis>(cacheKey);

            if (cached) return cached;

            const analysis = await this.analysisRepository.findOne({
                where: { id },
                relations: {
                    player: true,
                    rating: true
                }
            });

            if (analysis) {
                await this.redisService.set(cacheKey, analysis);
            }
            return analysis;
        } catch (error) {
            console.error(`Error in findOne for id ${id}:`, error);
            return null;
        }
    }

    async findByPlayer(playerId: number): Promise<PlayerAnalysis | null> {
        try {
            const cacheKey = `analysis:player:${playerId}`;
            const cached = await this.redisService.get<PlayerAnalysis>(cacheKey);

            if (cached) return cached;

            const analysis = await this.analysisRepository.findOne({
                where: {
                    player: { id: playerId }
                },
                relations: {
                    player: true,
                    rating: true
                }
            });

            if (analysis) {
                await this.redisService.set(cacheKey, analysis);
            }
            return analysis;
        } catch (error) {
            console.error(`Error in findByPlayer for playerId ${playerId}:`, error);
            return null;
        }
    }

    async create(input: CreatePlayerAnalysisInput): Promise<PlayerAnalysis> {
        try {
            const analysis = this.analysisRepository.create({
                player: { id: input.playerId },
                rating: input.ratingId ? { id: input.ratingId } : undefined,
                ...input
            });

            const saved = await this.analysisRepository.save(analysis);
            await this.clearAnalysisCache(undefined, input.playerId);
            return saved;
        } catch (error) {
            console.error('Error in create:', error);
            throw error;
        }
    }

    async update(id: number, input: UpdatePlayerAnalysisInput): Promise<PlayerAnalysis> {
        try {
            const analysis = await this.analysisRepository.findOneOrFail({
                where: { id },
                relations: {
                    player: true,
                    rating: true
                }
            });

            Object.assign(analysis, input);

            if (input.ratingId !== undefined) {
                analysis.rating = input.ratingId ? { id: input.ratingId } as any : undefined;
            }

            const updated = await this.analysisRepository.save(analysis);
            await this.clearAnalysisCache(id, analysis.player.id);
            return updated;
        } catch (error) {
            console.error(`Error in update for id ${id}:`, error);
            throw error;
        }
    }

    async delete(id: number): Promise<boolean> {
        try {
            const analysis = await this.analysisRepository.findOne({
                where: { id },
                relations: ['player']
            });
            
            if (analysis) {
                const result = await this.analysisRepository.delete(id);
                await this.clearAnalysisCache(id, analysis.player.id);
                return !!result.affected;
            }
            return false;
        } catch (error) {
            console.error(`Error in delete for id ${id}:`, error);
            return false;
        }
    }

    async updateRanks(): Promise<void> {
        try {
            const analyses = await this.analysisRepository.find({
                order: {
                    normalizedScore: 'DESC'
                }
            });

            const updates = analyses.map((analysis, index) => {
                analysis.rank = index + 1;
                return analysis;
            });

            await this.analysisRepository.save(updates);
            await this.clearAnalysisCache();
        } catch (error) {
            console.error('Error in updateRanks:', error);
            throw error;
        }
    }
}