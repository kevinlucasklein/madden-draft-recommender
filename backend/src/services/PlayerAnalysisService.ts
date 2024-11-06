import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { PlayerAnalysis } from '../entities/PlayerAnalysis';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { CreatePlayerAnalysisInput, UpdatePlayerAnalysisInput } from '../inputs/PlayerAnalysisInput';
import { POSITION_STAT_WEIGHTS, POSITION_THRESHOLDS, determinePlayerArchetype } from '../config/positionStats';
import { Player } from '../entities/Player';
import { PlayerStats } from '../entities/PlayerStats';


type StatWeight = {
    [key: string]: number;
};

type PositionWeights = {
    [key: string]: StatWeight;
};

type PositionThresholds = {
    [key: string]: StatWeight;
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

    constructor() {
        this.analysisRepository = AppDataSource.getRepository(PlayerAnalysis);
        this.playerRepository = AppDataSource.getRepository(Player);
        this.redisService = RedisService.getInstance();
        this.statsRepository = AppDataSource.getRepository(PlayerStats);
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

    
    private calculatePositionScore(stats: PlayerStats, position: keyof typeof POSITION_STAT_WEIGHTS): number {
        const weights = POSITION_STAT_WEIGHTS[position] as StatWeight;
        if (!weights) return 0;
    
        let totalScore = 0;
        let totalWeight = 0;
    
        // Calculate weighted score for each stat
        for (const [stat, weight] of Object.entries(weights)) {
            const statValue = stats[stat as keyof PlayerStats];
            if (typeof statValue === 'number' && typeof weight === 'number') {
                totalScore += statValue * weight;
                totalWeight += weight;
            }
        }
    
        // Normalize score to 0-100 scale
        const normalizedScore = totalWeight > 0 ? (totalScore / totalWeight) : 0;
    
        // Apply position-specific thresholds
        const thresholds = POSITION_THRESHOLDS[position] as StatWeight;
        if (thresholds) {
            for (const [stat, threshold] of Object.entries(thresholds)) {
                const statValue = stats[stat as keyof PlayerStats];
                if (typeof statValue === 'number' && typeof threshold === 'number' && statValue < threshold) {
                    return 0; // Player doesn't meet minimum requirements
                }
            }
        }
    
        return normalizedScore;
    }

    async analyzePlayer(playerId: number): Promise<PlayerAnalysis> {
        const player = await this.playerRepository.findOne({
            where: { id: playerId },
            relations: ['stats']
        });
    
        if (!player || !player.stats || player.stats.length === 0) {
            throw new Error('Player or stats not found');
        }
    
        // Get the most recent stats
        const currentStats = player.stats[player.stats.length - 1];
    
        // Calculate scores for each position
        const positionScores: Record<string, number> = {};
        for (const position of Object.keys(POSITION_STAT_WEIGHTS)) {
            positionScores[position] = this.calculatePositionScore(
                currentStats, 
                position as keyof typeof POSITION_STAT_WEIGHTS
            );
        }

        // Sort positions by score and get top positions
        const sortedPositions = Object.entries(positionScores)
            .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
            .map(([position, score]) => ({
                position,
                score: Math.round(score * 100) / 100 // Round to 2 decimal places
            }));

        const bestPosition = sortedPositions[0].position;
        const topPositions = sortedPositions.filter(pos => pos.score > 50); // Only keep viable positions

        const archetype = determinePlayerArchetype(currentStats, bestPosition);

        // Create or update analysis
        const analysis = await this.findByPlayer(playerId) || this.analysisRepository.create({
            player: { id: playerId }
        });
        
        Object.assign(analysis, {
            positionScores,
            bestPosition,
            normalizedScore: sortedPositions[0].score,
            primaryArchetype: archetype.primaryType,
            secondaryArchetype: archetype.secondaryType,
            versatilePositions: archetype.versatility,
            specialTraits: archetype.specialTraits,
            topPositions: topPositions, // Add sorted positions array
            viablePositionCount: topPositions.length
        });
        
        const saved = await this.analysisRepository.save(analysis);
        await this.clearAnalysisCache(analysis.id, playerId);
        return saved;
    }

    async analyzeAllPlayers(): Promise<void> {
        const players = await this.playerRepository.find();
        
        for (const player of players) {
            try {
                console.log(`Analyzing player ${player.id}: ${player.firstName} ${player.lastName}`);
                await this.analyzePlayer(player.id);
            } catch (error) {
                console.error(`Error analyzing player ${player.id}:`, error);
            }
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