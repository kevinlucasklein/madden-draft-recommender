import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { PlayerAnalysis } from '../entities/PlayerAnalysis';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { CreatePlayerAnalysisInput, UpdatePlayerAnalysisInput } from '../inputs/PlayerAnalysisInput';
import { POSITION_STAT_THRESHOLDS, POSITION_TIER_THRESHOLDS, POSITION_STAT_WEIGHTS, Position } from '../config/positionStats';
import { Player } from '../entities/Player';
import { PlayerStats, PlayerStatsIndexed } from '../entities/PlayerStats';
import fs from 'fs';
import path from 'path';

@Service()
export class PlayerAnalysisService {
    private readonly playerAnalysisRepository: Repository<PlayerAnalysis>;

    constructor(
        private readonly redisService: RedisService
    ) {
        this.playerAnalysisRepository = AppDataSource.getRepository(PlayerAnalysis);
    }

    async findByPlayer(playerId: number): Promise<PlayerAnalysis | null> {
        return this.playerAnalysisRepository.findOne({
            where: { player: { id: playerId } },
            relations: ['player', 'rating']
        });
    }

    // New normalization methods
    private async normalizePositionScores(players: Player[], position: Position): Promise<Map<number, number>> {
        const scores = new Map<number, number>();
        const weights = POSITION_STAT_WEIGHTS[position];

        if (!weights) return scores;

        for (const player of players) {
            let rawScore = 0;
            if (!player.stats || !Array.isArray(player.stats) || player.stats.length === 0) {
                continue;
            }
            
            const playerStats = player.stats[0] as PlayerStats;
            
            for (const [stat, weight] of Object.entries(weights)) {
                if (stat in playerStats && typeof playerStats[stat] === 'number') {
                    const statValue = playerStats[stat as keyof PlayerStats];
                    if (typeof statValue === 'number') {
                        rawScore += statValue * weight;
                    }
                }
            }

            const bonus = this.checkPositionSpecificBonuses(playerStats, position);
            rawScore *= bonus;

            scores.set(player.id, rawScore);
        }

        // Z-score normalization
        const values = Array.from(scores.values());
        if (values.length === 0) return scores;
        
        const mean = values.reduce((a, b) => a + b) / values.length;
        const stdDev = Math.sqrt(
            values.map(x => Math.pow(x - mean, 2))
                  .reduce((a, b) => a + b) / values.length
        );

        // Final normalization with position-specific scaling
        for (const [playerId, score] of scores) {
            const zScore = (score - mean) / stdDev;
            const normalizedScore = Math.min(100, Math.max(0, 50 + (zScore * 15)));
            scores.set(playerId, normalizedScore);
        }

        return scores;
    }

    private checkPositionSpecificBonuses(stats: PlayerStats, position: Position): number {
        let bonus = 1.0;
    
        if (!(position in POSITION_STAT_THRESHOLDS)) {
            return bonus;
        }
    
        switch(position) {
            case 'QB': {
                const thresholds = POSITION_STAT_THRESHOLDS.QB.elite;
                if (stats.throwPower !== undefined && 
                    stats.throwAccuracyShort !== undefined && 
                    stats.throwAccuracyMid !== undefined &&
                    stats.throwPower >= thresholds.throwPower &&
                    stats.throwAccuracyShort >= thresholds.throwAccuracyShort &&
                    stats.throwAccuracyMid >= thresholds.throwAccuracyMid) {
                    bonus += 0.1;
                }
    
                const mobilityThresholds = POSITION_STAT_THRESHOLDS.QB.goodMobility;
                if (stats.speed !== undefined && 
                    stats.acceleration !== undefined &&
                    stats.speed >= mobilityThresholds.speed &&
                    stats.acceleration >= mobilityThresholds.acceleration) {
                    bonus += 0.05;
                }
                break;
            }
            case 'HB': {
                const thresholds = POSITION_STAT_THRESHOLDS.RB.elite;
                if (stats.speed !== undefined && 
                    stats.acceleration !== undefined &&
                    stats.speed >= thresholds.speed &&
                    stats.acceleration >= thresholds.acceleration) {
                    bonus += 0.1;
                }
    
                const powerThresholds = POSITION_STAT_THRESHOLDS.RB.powerBack;
                if (stats.trucking !== undefined && 
                    stats.breakTackle !== undefined &&
                    stats.trucking >= powerThresholds.trucking &&
                    stats.breakTackle >= powerThresholds.breakTackle) {
                    bonus += 0.05;
                }
                break;
            }
            case 'FB': {
                const thresholds = POSITION_STAT_THRESHOLDS.FB.elite;
                if (stats.impactBlocking !== undefined && 
                    stats.leadBlock !== undefined &&
                    stats.impactBlocking >= thresholds.impactBlocking &&
                    stats.leadBlock >= thresholds.leadBlock) {
                    bonus += 0.1;
                }
    
                const receivingThresholds = POSITION_STAT_THRESHOLDS.FB.receiving;
                if (stats.catching !== undefined && 
                    stats.shortRouteRunning !== undefined &&
                    stats.catching >= receivingThresholds.catching &&
                    stats.shortRouteRunning >= receivingThresholds.shortRouteRunning) {
                    bonus += 0.05;
                }
                break;
            }
            case 'WR': {
                const thresholds = POSITION_STAT_THRESHOLDS.WR.elite;
                if (stats.speed !== undefined && 
                    stats.catching !== undefined &&
                    stats.speed >= thresholds.speed &&
                    stats.catching >= thresholds.catching) {
                    bonus += 0.1;
                }
    
                if (stats.shortRouteRunning !== undefined && 
                    stats.mediumRouteRunning !== undefined &&
                    stats.shortRouteRunning >= thresholds.shortRouteRunning &&
                    stats.mediumRouteRunning >= thresholds.mediumRouteRunning) {
                    bonus += 0.05;
                }
                break;
            }
            case 'TE': {
                const thresholds = POSITION_STAT_THRESHOLDS.TE.elite;
                if (stats.catching !== undefined && 
                    stats.shortRouteRunning !== undefined &&
                    stats.catching >= thresholds.catching &&
                    stats.shortRouteRunning >= thresholds.shortRouteRunning) {
                    bonus += 0.1;
                }
    
                const blockingThresholds = POSITION_STAT_THRESHOLDS.TE.blocking;
                if (stats.runBlock !== undefined && 
                    stats.impactBlocking !== undefined &&
                    stats.runBlock >= blockingThresholds.runBlock &&
                    stats.impactBlocking >= blockingThresholds.impactBlocking) {
                    bonus += 0.05;
                }
                break;
            }
            case 'LT':
            case 'RT': {
                const thresholds = POSITION_STAT_THRESHOLDS.OT.elite;
                if (stats.passBlockPower !== undefined && 
                    stats.passBlockFinesse !== undefined &&
                    stats.passBlockPower >= thresholds.passBlockPower &&
                    stats.passBlockFinesse >= thresholds.passBlockFinesse) {
                    bonus += 0.1;
                }
    
                const runBlockThresholds = POSITION_STAT_THRESHOLDS.OT.runBlocking;
                if (stats.runBlock !== undefined && 
                    stats.impactBlocking !== undefined &&
                    stats.runBlock >= runBlockThresholds.runBlock &&
                    stats.impactBlocking >= runBlockThresholds.impactBlocking) {
                    bonus += 0.05;
                }
                break;
            }
            case 'LG':
            case 'RG':
            case 'C': {
                const thresholds = POSITION_STAT_THRESHOLDS.IOL.elite;
                if (stats.runBlock !== undefined && 
                    stats.impactBlocking !== undefined &&
                    stats.runBlock >= thresholds.runBlock &&
                    stats.impactBlocking >= thresholds.impactBlocking) {
                    bonus += 0.1;
                }
    
                const passBlockThresholds = POSITION_STAT_THRESHOLDS.IOL.passBlocking;
                if (stats.passBlockPower !== undefined && 
                    stats.passBlockFinesse !== undefined &&
                    stats.passBlockPower >= passBlockThresholds.passBlockPower &&
                    stats.passBlockFinesse >= passBlockThresholds.passBlockFinesse) {
                    bonus += 0.05;
                }
                break;
            }
            case 'DE': {
                const thresholds = POSITION_STAT_THRESHOLDS.DE.elite;
                if (stats.powerMoves !== undefined && 
                    stats.finesseMoves !== undefined &&
                    stats.powerMoves >= thresholds.powerMoves &&
                    stats.finesseMoves >= thresholds.finesseMoves) {
                    bonus += 0.1;
                }
    
                const athleticThresholds = POSITION_STAT_THRESHOLDS.DE.athletic;
                if (stats.speed !== undefined && 
                    stats.acceleration !== undefined &&
                    stats.speed >= athleticThresholds.speed &&
                    stats.acceleration >= athleticThresholds.acceleration) {
                    bonus += 0.05;
                }
                break;
            }
            case 'DT': {
                const thresholds = POSITION_STAT_THRESHOLDS.DT.elite;
                if (stats.blockShedding !== undefined && 
                    stats.powerMoves !== undefined &&
                    stats.blockShedding >= thresholds.blockShedding &&
                    stats.powerMoves >= thresholds.powerMoves) {
                    bonus += 0.1;
                }
    
                const passRushThresholds = POSITION_STAT_THRESHOLDS.DT.passRush;
                if (stats.finesseMoves !== undefined && 
                    stats.acceleration !== undefined &&
                    stats.finesseMoves >= passRushThresholds.finesseMoves &&
                    stats.acceleration >= passRushThresholds.acceleration) {
                    bonus += 0.05;
                }
                break;
            }
            case 'MLB':
            case 'LOLB':
            case 'ROLB': {
                const thresholds = POSITION_STAT_THRESHOLDS.LB.elite;
                if (stats.tackle !== undefined && 
                    stats.pursuit !== undefined &&
                    stats.tackle >= thresholds.tackle &&
                    stats.pursuit >= thresholds.pursuit) {
                    bonus += 0.1;
                }
    
                const coverageThresholds = POSITION_STAT_THRESHOLDS.LB.coverage;
                if (stats.zoneCoverage !== undefined && 
                    stats.speed !== undefined &&
                    stats.zoneCoverage >= coverageThresholds.zoneCoverage &&
                    stats.speed >= coverageThresholds.speed) {
                    bonus += 0.05;
                }
                break;
            }
            case 'CB': {
                const thresholds = POSITION_STAT_THRESHOLDS.CB.elite;
                if (stats.speed !== undefined && 
                    stats.manCoverage !== undefined &&
                    stats.speed >= thresholds.speed &&
                    stats.manCoverage >= thresholds.manCoverage) {
                    bonus += 0.1;
                }
    
                const manThresholds = POSITION_STAT_THRESHOLDS.CB.manSpecialist;
                if (stats.manCoverage !== undefined && 
                    stats.press !== undefined &&
                    stats.manCoverage >= manThresholds.manCoverage &&
                    stats.press >= manThresholds.press) {
                    bonus += 0.05;
                }
                break;
            }
            case 'FS':
            case 'SS': {
                const thresholds = POSITION_STAT_THRESHOLDS.S.elite;
                if (stats.zoneCoverage !== undefined && 
                    stats.pursuit !== undefined &&
                    stats.zoneCoverage >= thresholds.zoneCoverage &&
                    stats.pursuit >= thresholds.pursuit) {
                    bonus += 0.1;
                }
    
                const runSupportThresholds = POSITION_STAT_THRESHOLDS.S.runSupport;
                if (stats.tackle !== undefined && 
                    stats.hitPower !== undefined &&
                    stats.tackle >= runSupportThresholds.tackle &&
                    stats.hitPower >= runSupportThresholds.hitPower) {
                    bonus += 0.05;
                }
                break;
            }
            case 'K':
            case 'P': {
                const thresholds = POSITION_STAT_THRESHOLDS.K.elite;
                if (stats.kickPower !== undefined && 
                    stats.kickAccuracy !== undefined &&
                    stats.kickPower >= thresholds.kickPower &&
                    stats.kickAccuracy >= thresholds.kickAccuracy) {
                    bonus += 0.1;
                }
                break;
            }
        }
    
        return bonus;
    }

    private assignTier(normalizedScore: number, position: Position): number {
        const thresholds = POSITION_TIER_THRESHOLDS[position];
        if (!thresholds) return this.assignDefaultTier(normalizedScore);

        if (normalizedScore >= thresholds.tier1) return 1;
        if (normalizedScore >= thresholds.tier2) return 2;
        if (normalizedScore >= thresholds.tier3) return 3;
        if (normalizedScore >= thresholds.tier4) return 4;
        return 5;
    }

    private assignDefaultTier(normalizedScore: number): number {
        if (normalizedScore >= 80) return 1;
        if (normalizedScore >= 65) return 2;
        if (normalizedScore >= 50) return 3;
        if (normalizedScore >= 35) return 4;
        return 5;
    }

    private calculateAgeMultiplier(age: number | undefined): number {
        // Default to worst multiplier if age is undefined
        if (age === undefined) return 0.8;
        
        if (age <= 23) return 1.2;
        if (age <= 26) return 1.1;
        if (age <= 29) return 1.0;
        if (age <= 32) return 0.9;
        return 0.8;  // 33+
    }

    private calculateDevTraitMultiplier(devTrait: number): number {
        switch(devTrait) {
            case 3: return 1.3;  // X-Factor: +0.3
            case 2: return 1.2;  // Superstar: +0.2
            case 1: return 1.1;  // Star: +0.1
            case 0:
            default: return 1.0; // Normal: +0
        }
    }

    async calculatePreDraftScores(positionCode: string): Promise<void> {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
    
        try {
            console.log('Starting query for position:', positionCode);
            
            const players = await AppDataSource
                .getRepository(Player)
                .createQueryBuilder('player')
                .innerJoinAndSelect('player.stats', 'stats')
                .innerJoinAndSelect('player.ratings', 'rating')
                .innerJoin('rating.position', 'position')
                .leftJoinAndSelect('player.draftData', 'draftData')
                .where('position.short_label = :positionCode', { positionCode })
                .getMany();
    
            console.log(`Found ${players.length} players with position ${positionCode}`);
            
            const normalizedScores = await this.normalizePositionScores(players, positionCode as Position);
            const adjustedScores = new Map<number, number>();
    
            // First pass: calculate all adjusted scores
            for (const [playerId, normalizedScore] of normalizedScores) {
                const player = players.find(p => p.id === playerId);
                if (!player) continue;
    
                const ageMultiplier = this.calculateAgeMultiplier(player.age);
                const devMultiplier = this.calculateDevTraitMultiplier(player.draftData?.developmentTrait ?? 0);
                const adjustedScore = normalizedScore * ageMultiplier * devMultiplier;
                
                adjustedScores.set(playerId, adjustedScore);
            }
    
            // Re-normalize adjusted scores
            const values = Array.from(adjustedScores.values());
            if (values.length === 0) return;
    
            const mean = values.reduce((a, b) => a + b) / values.length;
            const stdDev = Math.sqrt(
                values.map(x => Math.pow(x - mean, 2))
                      .reduce((a, b) => a + b) / values.length
            );
    
            const analysisUpdates: PlayerAnalysis[] = [];
    
            // Second pass: create analysis objects with re-normalized scores
            for (const [playerId, adjustedScore] of adjustedScores) {
                const player = players.find(p => p.id === playerId);
                if (!player) continue;
    
                const baseScore = normalizedScores.get(playerId) || 0;
                const ageMultiplier = this.calculateAgeMultiplier(player.age);
                const devMultiplier = this.calculateDevTraitMultiplier(player.draftData?.developmentTrait ?? 0);
                
                let analysis = await this.findByPlayer(playerId);
                if (!analysis) {
                    analysis = new PlayerAnalysis();
                    analysis.player = { id: playerId } as Player;
                }
    
                // Store base position evaluation
                analysis.normalizedScore = baseScore;
                analysis.basePositionTierScore = baseScore;
                
                // Store multipliers for reference
                analysis.ageMultiplier = ageMultiplier;
                analysis.developmentMultiplier = devMultiplier;
                
                // Calculate final normalized score
                const zScore = (adjustedScore - mean) / stdDev;
                analysis.adjustedScore = Math.min(100, Math.max(0, 50 + (zScore * 15)));
                
                // Assign tier based on final score
                analysis.positionTier = this.assignTier(analysis.adjustedScore, positionCode as Position);
                analysis.calculatedAt = new Date();
    
                analysisUpdates.push(analysis);
            }
    
            await queryRunner.manager.save(PlayerAnalysis, analysisUpdates);
            await queryRunner.commitTransaction();
            
            console.log(`Successfully updated ${analysisUpdates.length} player analyses`);
    
        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error('Error details:', error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async calculateAllPositionScores(): Promise<void> {
        const positions = Object.keys(POSITION_STAT_WEIGHTS) as Array<keyof typeof POSITION_STAT_WEIGHTS>;
        for (const position of positions) {
            await this.calculatePreDraftScores(position);
        }
    }


    async getTierDistribution(position: Position): Promise<Record<number, number>> {
        const analyses = await this.playerAnalysisRepository
            .createQueryBuilder('analysis')
            .leftJoin('analysis.player', 'player')
            .leftJoin('player.ratings', 'rating')
            .leftJoin('rating.position', 'position')
            .leftJoin('player.draftData', 'draftData')  // Add draft data
            .where('position.short_label = :position', { position })
            .select('analysis.positionTier')
            .getMany();
    
        return analyses.reduce((acc: Record<number, number>, analysis) => {
            const tier = analysis.positionTier || 5;
            acc[tier] = (acc[tier] || 0) + 1;
            return acc;
        }, {});
    }
    
    async getAnalysesByPosition(position: Position): Promise<PlayerAnalysis[]> {
        return this.playerAnalysisRepository
            .createQueryBuilder('analysis')
            .leftJoinAndSelect('analysis.player', 'player')
            .leftJoinAndSelect('player.ratings', 'rating')
            .leftJoinAndSelect('rating.position', 'position')
            .leftJoinAndSelect('player.draftData', 'draftData')  // Add draft data
            .where('position.short_label = :position', { position })
            .orderBy('analysis.adjustedScore', 'DESC')  // Order by adjusted score instead
            .getMany();
    }
}