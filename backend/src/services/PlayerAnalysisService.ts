import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { PlayerAnalysis } from '../entities/PlayerAnalysis';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { CreatePlayerAnalysisInput, UpdatePlayerAnalysisInput } from '../inputs/PlayerAnalysisInput';
import { POSITION_STAT_WEIGHTS, POSITION_THRESHOLDS, determinePlayerArchetype } from '../config/positionStats';
import { Player } from '../entities/Player';

@Service()
export class PlayerAnalysisService {
    private analysisRepository: Repository<PlayerAnalysis>;
    private playerRepository: Repository<Player>;
    private redisService: RedisService;

    constructor() {
        this.analysisRepository = AppDataSource.getRepository(PlayerAnalysis);
        this.playerRepository = AppDataSource.getRepository(Player);
        this.redisService = RedisService.getInstance();
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

    async analyzePlayer(playerId: number): Promise<PlayerAnalysis> {
        try {
            // Get player with stats
            const player = await this.playerRepository.findOne({
                where: { id: playerId },
                relations: ['stats', 'ratings']
            });
    
            if (!player?.stats?.[0]) {
                throw new Error('Player stats not found');
            }
    
            const stats = player.stats[0];
            const positionScores = new Map<string, number>();
            let bestPosition = '';
            let bestScore = 0;
    
            // Calculate score for each position
            for (const [position, weights] of Object.entries(POSITION_STAT_WEIGHTS)) {
                let score = 0;
                let totalWeight = 0;
    
                for (const [stat, weight] of Object.entries(weights)) {
                    // Ensure values are numbers
                    const statValue = Number(stats[stat as keyof typeof stats]) || 0;
                    const posThresholds = POSITION_THRESHOLDS[position as keyof typeof POSITION_THRESHOLDS];
                    if (!posThresholds) continue;
                    
                    const threshold = Number(posThresholds[stat as keyof typeof posThresholds]) || 0;
                    if (threshold === 0) continue; // Skip if no threshold defined
                    
                    // Calculate how close the stat is to the ideal threshold
                    const statScore = Math.min(statValue / threshold, 1.2);
                    score += Number(statScore) * Number(weight);
                    totalWeight += Number(weight);
                }
    
                // Normalize score to 0-100
                const normalizedScore = (score / totalWeight) * 100;
                positionScores.set(position, normalizedScore);
    
                if (normalizedScore > bestScore) {
                    bestScore = normalizedScore;
                    bestPosition = position;
                }
            }
    
            // Get enhanced player archetype analysis
            const archetype = determinePlayerArchetype(stats, bestPosition);
    
            // Create or update player analysis
            const analysis = await this.findByPlayer(playerId) || this.analysisRepository.create({
                player: { id: playerId }
            });
    
            // Update analysis with enhanced data
            analysis.normalizedScore = bestScore;
            analysis.suggestedPosition = bestPosition;
            analysis.positionScores = Object.fromEntries(positionScores);
            analysis.playerType = archetype.primaryType;
            analysis.secondaryType = archetype.secondaryType;
            analysis.alternatePositions = archetype.versatility.slice(1); // Skip primary position
            analysis.specialTraits = archetype.specialTraits;
            analysis.strengthsWeaknesses = this.analyzeStrengthsWeaknesses(stats, bestPosition);
    
            const saved = await this.analysisRepository.save(analysis);
            await this.updateRanks();
            return saved;
        } catch (error) {
            console.error('Error in analyzePlayer:', error);
            throw error;
        }
    }
    private determinePlayerType(stats: any, position: string): string {
        const pos = position as keyof typeof POSITION_THRESHOLDS;
        if (!POSITION_THRESHOLDS[pos]) return 'Unknown';

        switch (pos) {
            case 'QB':
                return stats.throwPower > 90 ? 'Strong Arm' :
                       stats.speed > 85 ? 'Scrambler' :
                       stats.throwAccuracyShort > 90 ? 'West Coast' :
                       'Balanced';
            // Add other positions...
            default:
                return 'Unknown';
        }
    }

    private analyzeStrengthsWeaknesses(stats: any, position: string): string {
        const strengths: string[] = [];
        const weaknesses: string[] = [];
        const pos = position as keyof typeof POSITION_THRESHOLDS;
        const thresholds = POSITION_THRESHOLDS[pos];
        
        if (!thresholds) return 'Position not recognized';

        for (const [stat, threshold] of Object.entries(thresholds)) {
            const value = stats[stat as keyof typeof stats];
            if (value >= threshold * 1.1) {
                strengths.push(stat);
            } else if (value <= threshold * 0.9) {
                weaknesses.push(stat);
            }
        }

        return `Strengths: ${strengths.join(', ')}. Weaknesses: ${weaknesses.join(', ')}.`;
    }
}