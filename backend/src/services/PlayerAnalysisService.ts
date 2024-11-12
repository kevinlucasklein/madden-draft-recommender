import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { PlayerAnalysis } from '../entities/PlayerAnalysis';
import { AppDataSource } from '../config/database';
import { RedisService } from './RedisService';
import { CreatePlayerAnalysisInput, UpdatePlayerAnalysisInput } from '../inputs/PlayerAnalysisInput';
import { POSITION_STAT_THRESHOLDS, POSITION_TIER_THRESHOLDS, POSITION_STAT_WEIGHTS, Position, SchemeRequirements, SCHEME_THRESHOLDS, PlayerSchemeScores, SchemeScores } from '../config/positionStats';
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

    private normalizeScore(rawScore: number, allScores: number[]): number {
        if (allScores.length === 0) return 50; // Default to average if no comparison scores
        
        // Calculate mean and standard deviation
        const mean = allScores.reduce((a, b) => a + b) / allScores.length;
        const stdDev = Math.sqrt(
            allScores.map(x => Math.pow(x - mean, 2))
                  .reduce((a, b) => a + b) / allScores.length
        );
    
        // Convert to z-score and scale to 0-100 range
        const zScore = (rawScore - mean) / stdDev;
        return Math.min(100, Math.max(0, 50 + (zScore * 15)));
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
                    stats.throwAccuracyDeep !== undefined &&
                    stats.throwOnTheRun !== undefined &&
                    stats.throwPower >= thresholds.throwPower &&
                    stats.throwAccuracyShort >= thresholds.throwAccuracyShort &&
                    stats.throwAccuracyMid >= thresholds.throwAccuracyMid &&
                    stats.throwAccuracyDeep >= thresholds.throwAccuracyDeep &&
                    stats.throwOnTheRun >= thresholds.throwOnTheRun) {
                    bonus += 0.1;
                }
    
                const mobilityThresholds = POSITION_STAT_THRESHOLDS.QB.goodMobility;
                if (stats.speed !== undefined && 
                    stats.acceleration !== undefined &&
                    stats.agility !== undefined &&
                    stats.speed >= mobilityThresholds.speed &&
                    stats.acceleration >= mobilityThresholds.acceleration &&
                    stats.agility >= mobilityThresholds.agility) {
                    bonus += 0.05;
                }
                break;
            }

            case 'HB': {
                const thresholds = POSITION_STAT_THRESHOLDS.HB.elite;
                if (stats.speed !== undefined && 
                    stats.acceleration !== undefined &&
                    stats.agility !== undefined &&
                    stats.carrying !== undefined &&
                    stats.speed >= thresholds.speed &&
                    stats.acceleration >= thresholds.acceleration &&
                    stats.agility >= thresholds.agility &&
                    stats.carrying >= thresholds.carrying) {
                    bonus += 0.1;
                }
    
                const powerThresholds = POSITION_STAT_THRESHOLDS.HB.powerBack;
                if (stats.trucking !== undefined && 
                    stats.breakTackle !== undefined &&
                    stats.strength !== undefined &&
                    stats.trucking >= powerThresholds.trucking &&
                    stats.breakTackle >= powerThresholds.breakTackle &&
                    stats.strength >= powerThresholds.strength) {
                    bonus += 0.05;
                }
                break;
            }
            case 'FB': {
                const thresholds = POSITION_STAT_THRESHOLDS.FB.elite;
                if (stats.impactBlocking !== undefined && 
                    stats.leadBlock !== undefined &&
                    stats.strength !== undefined &&
                    stats.impactBlocking >= thresholds.impactBlocking &&
                    stats.leadBlock >= thresholds.leadBlock &&
                    stats.strength >= thresholds.strength) {
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
                    stats.acceleration !== undefined &&
                    stats.catching !== undefined &&
                    stats.shortRouteRunning !== undefined &&     
                    stats.mediumRouteRunning !== undefined &&
                    stats.speed >= thresholds.speed &&
                    stats.acceleration >= thresholds.acceleration &&
                    stats.catching >= thresholds.catching &&
                    stats.shortRouteRunning >= thresholds.shortRouteRunning &&
                    stats.mediumRouteRunning >= thresholds.mediumRouteRunning) {
                    bonus += 0.1;
                }
                
                const deepThreatThresholds = POSITION_STAT_THRESHOLDS.WR.deepThreat;
                if (stats.speed !== undefined && 
                    stats.deepRouteRunning !== undefined &&
                    stats.speed >= deepThreatThresholds.speed &&
                    stats.deepRouteRunning >= deepThreatThresholds.deepRouteRunning) {
                    bonus += 0.05;
                }

                const possessionThresholds = POSITION_STAT_THRESHOLDS.WR.possession;
                if (stats.catching !== undefined && 
                    stats.catchInTraffic !== undefined &&
                    stats.shortRouteRunning !== undefined &&
                    stats.catching >= possessionThresholds.catching &&
                    stats.catchInTraffic >= possessionThresholds.catchInTraffic &&
                    stats.shortRouteRunning >= possessionThresholds.shortRouteRunning) {
                    bonus += 0.05;
                }
                break;
            }
            case 'TE': {
                const thresholds = POSITION_STAT_THRESHOLDS.TE.elite;
                if (stats.catching !== undefined && 
                    stats.shortRouteRunning !== undefined &&
                    stats.strength !== undefined &&
                    stats.mediumRouteRunning !== undefined &&
                    stats.catching >= thresholds.catching &&
                    stats.shortRouteRunning >= thresholds.shortRouteRunning &&
                    stats.mediumRouteRunning >= thresholds.mediumRouteRunning &&
                    stats.strength >= thresholds.strength) {
                    bonus += 0.1;
                }
    
                const blockingThresholds = POSITION_STAT_THRESHOLDS.TE.blocking;
                if (stats.runBlock !== undefined && 
                    stats.impactBlocking !== undefined &&
                    stats.strength !== undefined &&
                    stats.runBlock >= blockingThresholds.runBlock &&
                    stats.impactBlocking >= blockingThresholds.impactBlocking &&
                    stats.strength >= blockingThresholds.strength) {
                    bonus += 0.05;
                }
                break;
            }
            case 'LT': {
                const thresholds = POSITION_STAT_THRESHOLDS.LT.elite;
                if (stats.passBlockPower !== undefined && 
                    stats.passBlockFinesse !== undefined &&
                    stats.strength !== undefined &&
                    stats.passBlockPower >= thresholds.passBlockPower &&
                    stats.passBlockFinesse >= thresholds.passBlockFinesse &&
                    stats.strength >= thresholds.strength) {
                    bonus += 0.1;
                }
    
                const runBlockThresholds = POSITION_STAT_THRESHOLDS.LT.runBlocking;
                if (stats.runBlock !== undefined && 
                    stats.impactBlocking !== undefined &&
                    stats.runBlock >= runBlockThresholds.runBlock &&
                    stats.impactBlocking >= runBlockThresholds.impactBlocking) {
                    bonus += 0.05;
                }
                break;
            }
            case 'RT': {
                const thresholds = POSITION_STAT_THRESHOLDS.RT.elite;
                if (stats.passBlockPower !== undefined && 
                    stats.passBlockFinesse !== undefined &&
                    stats.strength !== undefined &&
                    stats.passBlockPower >= thresholds.passBlockPower &&
                    stats.passBlockFinesse >= thresholds.passBlockFinesse &&
                    stats.strength >= thresholds.strength) {
                    bonus += 0.1;
                }
    
                const runBlockThresholds = POSITION_STAT_THRESHOLDS.RT.runBlocking;
                if (stats.runBlock !== undefined && 
                    stats.impactBlocking !== undefined &&
                    stats.runBlock >= runBlockThresholds.runBlock &&
                    stats.impactBlocking >= runBlockThresholds.impactBlocking) {
                    bonus += 0.05;
                }
                break;
            }
            case 'LG': {
                const thresholds = POSITION_STAT_THRESHOLDS.LG.elite;
                if (stats.runBlock !== undefined && 
                    stats.impactBlocking !== undefined &&
                    stats.strength !== undefined &&
                    stats.runBlock >= thresholds.runBlock &&
                    stats.impactBlocking >= thresholds.impactBlocking &&
                    stats.strength >= thresholds.strength) {
                    bonus += 0.1;
                }
    
                const passBlockThresholds = POSITION_STAT_THRESHOLDS.LG.passBlocking;
                if (stats.passBlockPower !== undefined && 
                    stats.passBlockFinesse !== undefined &&
                    stats.passBlockPower >= passBlockThresholds.passBlockPower &&
                    stats.passBlockFinesse >= passBlockThresholds.passBlockFinesse) {
                    bonus += 0.05;
                }
                break;
            }
            case 'RG': {
                const thresholds = POSITION_STAT_THRESHOLDS.RG.elite;
                if (stats.runBlock !== undefined && 
                    stats.impactBlocking !== undefined &&
                    stats.strength !== undefined &&
                    stats.runBlock >= thresholds.runBlock &&
                    stats.impactBlocking >= thresholds.impactBlocking &&
                    stats.strength >= thresholds.strength) {
                    bonus += 0.1;
                }
    
                const passBlockThresholds = POSITION_STAT_THRESHOLDS.RG.passBlocking;
                if (stats.passBlockPower !== undefined && 
                    stats.passBlockFinesse !== undefined &&
                    stats.passBlockPower >= passBlockThresholds.passBlockPower &&
                    stats.passBlockFinesse >= passBlockThresholds.passBlockFinesse) {
                    bonus += 0.05;
                }
                break;
            }
            case 'C': {
                const thresholds = POSITION_STAT_THRESHOLDS.C.elite;
                if (stats.runBlock !== undefined && 
                    stats.impactBlocking !== undefined &&
                    stats.strength !== undefined &&
                    stats.runBlock >= thresholds.runBlock &&
                    stats.impactBlocking >= thresholds.impactBlocking &&
                    stats.strength >= thresholds.strength) {
                    bonus += 0.1;
                }
    
                const passBlockThresholds = POSITION_STAT_THRESHOLDS.C.passBlocking;
                if (stats.passBlockPower !== undefined && 
                    stats.passBlockFinesse !== undefined &&
                    stats.passBlockPower >= passBlockThresholds.passBlockPower &&
                    stats.passBlockFinesse >= passBlockThresholds.passBlockFinesse) {
                    bonus += 0.05;
                }
                break;
            }
            case 'LE': {
                const thresholds = POSITION_STAT_THRESHOLDS.LE.elite;
                if (stats.blockShedding !== undefined && 
                    stats.powerMoves !== undefined &&
                    stats.strength !== undefined &&
                    stats.tackle !== undefined &&
                    stats.blockShedding >= thresholds.blockShedding &&
                    stats.powerMoves >= thresholds.powerMoves &&
                    stats.strength >= thresholds.strength &&
                    stats.tackle >= thresholds.tackle) {
                    bonus += 0.1;
                }
    
                const runStopThresholds = POSITION_STAT_THRESHOLDS.LE.runStop;
                if (stats.pursuit !== undefined && 
                    stats.finesseMoves !== undefined &&
                    stats.speed !== undefined &&
                    stats.pursuit >= runStopThresholds.pursuit &&
                    stats.finesseMoves >= runStopThresholds.finesseMoves &&
                    stats.speed >= runStopThresholds.speed) {
                    bonus += 0.05;
                }
                break;
            }
            case 'RE': {
                const thresholds = POSITION_STAT_THRESHOLDS.RE.elite;
                if (stats.powerMoves !== undefined && 
                    stats.finesseMoves !== undefined &&
                    stats.strength !== undefined &&
                    stats.speed !== undefined &&
                    stats.powerMoves >= thresholds.powerMoves &&
                    stats.finesseMoves >= thresholds.finesseMoves &&
                    stats.strength >= thresholds.strength &&
                    stats.speed >= thresholds.speed) {
                    bonus += 0.1;
                }
    
                const athleticThresholds = POSITION_STAT_THRESHOLDS.RE.athletic;
                if (stats.acceleration !== undefined &&
                    stats.pursuit !== undefined &&
                    stats.blockShedding !== undefined &&
                    stats.acceleration >= athleticThresholds.acceleration &&
                    stats.pursuit >= athleticThresholds.pursuit &&
                    stats.blockShedding >= athleticThresholds.blockShedding) {
                    bonus += 0.05;
                }
                break;
            }
            case 'DT': {
                const thresholds = POSITION_STAT_THRESHOLDS.DT.elite;
                if (stats.blockShedding !== undefined && 
                    stats.powerMoves !== undefined &&
                    stats.strength !== undefined &&
                    stats.blockShedding >= thresholds.blockShedding &&
                    stats.powerMoves >= thresholds.powerMoves &&
                    stats.strength >= thresholds.strength) {
                    bonus += 0.1;
                }
    
                const passRushThresholds = POSITION_STAT_THRESHOLDS.DT.passRush;
                if (stats.finesseMoves !== undefined && 
                    stats.acceleration !== undefined &&
                    stats.pursuit !== undefined &&
                    stats.finesseMoves >= passRushThresholds.finesseMoves &&
                    stats.acceleration >= passRushThresholds.acceleration &&
                    stats.pursuit >= passRushThresholds.pursuit) {
                    bonus += 0.05;
                }
                break;
            }
            case 'MLB': {
                const thresholds = POSITION_STAT_THRESHOLDS.MLB.elite;
                if (stats.tackle !== undefined && 
                    stats.pursuit !== undefined &&
                    stats.hitPower !== undefined &&
                    stats.playRecognition !== undefined &&
                    stats.tackle >= thresholds.tackle &&
                    stats.pursuit >= thresholds.pursuit &&
                    stats.hitPower >= thresholds.hitPower &&
                    stats.playRecognition >= thresholds.playRecognition) {
                    bonus += 0.1;
                }
    
                const coverageThresholds = POSITION_STAT_THRESHOLDS.MLB.coverage;
                if (stats.zoneCoverage !== undefined && 
                    stats.speed !== undefined &&
                    stats.acceleration !== undefined &&
                    stats.zoneCoverage >= coverageThresholds.zoneCoverage &&
                    stats.speed >= coverageThresholds.speed &&
                    stats.acceleration >= coverageThresholds.acceleration) {
                    bonus += 0.05;
                }
                break;
            }
            case 'LOLB': {
                const thresholds = POSITION_STAT_THRESHOLDS.LOLB.elite;
                if (stats.tackle !== undefined && 
                    stats.pursuit !== undefined &&
                    stats.hitPower !== undefined &&
                    stats.playRecognition !== undefined &&
                    stats.tackle >= thresholds.tackle &&
                    stats.pursuit >= thresholds.pursuit &&
                    stats.hitPower >= thresholds.hitPower &&
                    stats.playRecognition >= thresholds.playRecognition) {
                    bonus += 0.1;
                }

                const coverageThresholds = POSITION_STAT_THRESHOLDS.LOLB.coverage;
                if (stats.zoneCoverage !== undefined && 
                    stats.speed !== undefined &&
                    stats.acceleration !== undefined &&
                    stats.zoneCoverage >= coverageThresholds.zoneCoverage &&
                    stats.speed >= coverageThresholds.speed &&
                    stats.acceleration >= coverageThresholds.acceleration) {
                    bonus += 0.05;
                }
            }
            case 'ROLB': {
                const thresholds = POSITION_STAT_THRESHOLDS.ROLB.elite;
                if (stats.tackle !== undefined && 
                    stats.pursuit !== undefined &&
                    stats.hitPower !== undefined &&
                    stats.playRecognition !== undefined &&
                    stats.tackle >= thresholds.tackle &&
                    stats.pursuit >= thresholds.pursuit &&
                    stats.hitPower >= thresholds.hitPower &&
                    stats.playRecognition >= thresholds.playRecognition) {
                    bonus += 0.1;
                }
    
                const coverageThresholds = POSITION_STAT_THRESHOLDS.ROLB.coverage;
                if (stats.zoneCoverage !== undefined && 
                    stats.speed !== undefined &&
                    stats.acceleration !== undefined &&
                    stats.zoneCoverage >= coverageThresholds.zoneCoverage &&
                    stats.speed >= coverageThresholds.speed &&
                    stats.acceleration >= coverageThresholds.acceleration) {
                    bonus += 0.05;
                }
                break;
            }
            case 'CB': {
                const thresholds = POSITION_STAT_THRESHOLDS.CB.elite;
                if (stats.speed !== undefined && 
                    stats.acceleration !== undefined &&
                    stats.manCoverage !== undefined &&
                    stats.zoneCoverage !== undefined &&
                    stats.speed >= thresholds.speed &&
                    stats.acceleration >= thresholds.acceleration &&
                    stats.manCoverage >= thresholds.manCoverage &&
                    stats.zoneCoverage >= thresholds.zoneCoverage) {
                    bonus += 0.1;
                }
    
                const manThresholds = POSITION_STAT_THRESHOLDS.CB.manSpecialist;
                if (stats.manCoverage !== undefined && 
                    stats.press !== undefined &&
                    stats.manCoverage >= manThresholds.manCoverage &&
                    stats.press >= manThresholds.press) {
                    bonus += 0.05;
                }

                const zoneThresholds = POSITION_STAT_THRESHOLDS.CB.zoneSpecialist;
                if (stats.zoneCoverage !== undefined && 
                    stats.playRecognition !== undefined &&
                    stats.zoneCoverage >= zoneThresholds.zoneCoverage &&
                    stats.playRecognition >= zoneThresholds.playRecognition) {
                    bonus += 0.05;
                }
                break;
            }
            case 'FS': {
                const thresholds = POSITION_STAT_THRESHOLDS.FS.elite;
                if (stats.zoneCoverage !== undefined && 
                    stats.speed !== undefined &&
                    stats.acceleration !== undefined &&
                    stats.pursuit !== undefined &&
                    stats.zoneCoverage >= thresholds.zoneCoverage &&
                    stats.speed >= thresholds.speed &&
                    stats.acceleration >= thresholds.acceleration &&
                    stats.pursuit >= thresholds.pursuit) {
                    bonus += 0.1;
                }
                
                const coverageThresholds = POSITION_STAT_THRESHOLDS.FS.coverage;
                if (stats.playRecognition !== undefined && 
                    stats.tackle !== undefined &&
                    stats.playRecognition >= coverageThresholds.playRecognition &&
                    stats.tackle >= coverageThresholds.tackle) {
                    bonus += 0.05;
                }
            }
            case 'SS': {
                const thresholds = POSITION_STAT_THRESHOLDS.SS.elite;
                if (stats.zoneCoverage !== undefined && 
                    stats.speed !== undefined &&
                    stats.hitPower !== undefined &&
                    stats.tackle !== undefined &&
                    stats.zoneCoverage >= thresholds.zoneCoverage &&
                    stats.speed >= thresholds.speed &&
                    stats.hitPower >= thresholds.hitPower &&
                    stats.tackle >= thresholds.tackle) {
                    bonus += 0.1;
                }
    
                const runSupportThresholds = POSITION_STAT_THRESHOLDS.SS.runSupport;
                if (stats.pursuit !== undefined && 
                    stats.blockShedding !== undefined &&
                    stats.pursuit >= runSupportThresholds.pursuit &&
                    stats.blockShedding >= runSupportThresholds.blockShedding) {
                    bonus += 0.05;
                }
                break;
            }
            case 'K': {
                const thresholds = POSITION_STAT_THRESHOLDS.K.elite;
                if (stats.kickPower !== undefined && 
                    stats.kickAccuracy !== undefined &&
                    stats.kickPower >= thresholds.kickPower &&
                    stats.kickAccuracy >= thresholds.kickAccuracy) {
                    bonus += 0.1;
                }
            }
            case 'P': {
                const thresholds = POSITION_STAT_THRESHOLDS.P.elite;
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

    private async testPositionFlexibility(player: Player, primaryPosition: Position): Promise<{
        secondaryPositions: Map<Position, number>;
        versatilityBonus: number;
    }> {
        const secondaryPositions = new Map<Position, number>();
        let totalVersatilityBonus = 0;
    
        // Get player's stats
        const stats = player.stats?.[0] as PlayerStats;
        if (!stats) return { 
            secondaryPositions, 
            versatilityBonus: 0
        };
    
        // Test based on primary position group
        switch(primaryPosition) {
            case 'CB':
            case 'FS':
            case 'SS': {
                // Only test for FS if not already FS
                const fsScore = primaryPosition !== 'FS' ? 
                    this.testForSafety(stats, 'FS') : undefined;
                        
                // Only test for SS if not already SS
                const ssScore = primaryPosition !== 'SS' ? 
                    this.testForSafety(stats, 'SS') : undefined;
                        
                // Only test CB if not already a CB
                const cbScore = primaryPosition !== 'CB' ? 
                    this.testForCornerback(stats) : undefined;
                    
                // CB flexibility
                if (cbScore?.meetsThreshold) {
                    secondaryPositions.set('CB', cbScore.score);
                    totalVersatilityBonus += cbScore.bonus;
                }
                
                // Safety flexibility
                if (fsScore?.meetsThreshold) {
                    secondaryPositions.set('FS', fsScore.score);
                    totalVersatilityBonus += fsScore.bonus;
                }
                if (ssScore?.meetsThreshold) {
                    secondaryPositions.set('SS', ssScore.score);
                    totalVersatilityBonus += ssScore.bonus;
                }
                break;
            }
    
            case 'RE':
            case 'LE':
            case 'DT':
            case 'LOLB':
            case 'ROLB': {
                // Only test edge if not already an edge player
                const edgeScore = (primaryPosition !== 'RE' && primaryPosition !== 'LE') ? 
                    this.testForEdge(stats, 'RE') : undefined;
                        
                // Only test DT if not already a DT
                const dtScore = primaryPosition !== 'DT' ? 
                    this.testForDT(stats) : undefined;
                        
                // Only test OLB if not already an OLB
                const olbScore = (primaryPosition !== 'LOLB' && primaryPosition !== 'ROLB') ? 
                    this.testForOLB(stats, 'ROLB') : undefined;
    
                if (primaryPosition !== 'RE' && edgeScore?.meetsThreshold) {
                    secondaryPositions.set('RE', edgeScore.score);
                    totalVersatilityBonus += edgeScore.bonus;
                }
                if (primaryPosition !== 'LE' && edgeScore?.meetsThreshold) {
                    secondaryPositions.set('LE', edgeScore.score);
                    totalVersatilityBonus += edgeScore.bonus;
                }
                if (primaryPosition !== 'DT' && dtScore?.meetsThreshold) {
                    secondaryPositions.set('DT', dtScore.score);
                    totalVersatilityBonus += dtScore.bonus;
                }
                if (primaryPosition !== 'LOLB' && primaryPosition !== 'ROLB' && olbScore?.meetsThreshold) {
                    secondaryPositions.set('LOLB', olbScore.score);
                    secondaryPositions.set('ROLB', olbScore.score);
                    totalVersatilityBonus += olbScore.bonus;
                }
                break;
            }
    
            // O-Line Position Testing
            case 'LT':
            case 'RT':
            case 'LG':
            case 'RG':
            case 'C': {
                // Only test tackle if not already a tackle
                const tackleScore = (primaryPosition !== 'LT' && primaryPosition !== 'RT') ? 
                    this.testForTackle(stats, 'RT') : undefined;

                // Only test guard if not already a guard
                const guardScore = (primaryPosition !== 'LG' && primaryPosition !== 'RG') ? 
                    this.testForGuard(stats, 'RG') : undefined;

                // Only test center if not already a center
                const centerScore = primaryPosition !== 'C' ? 
                    this.testForCenter(stats) : undefined;

                // Tackle flexibility
                if (tackleScore?.meetsThreshold) {
                    secondaryPositions.set('LT', tackleScore.score);
                    secondaryPositions.set('RT', tackleScore.score);
                    totalVersatilityBonus += tackleScore.bonus;
                }

                // Guard flexibility
                if (guardScore?.meetsThreshold) {
                    secondaryPositions.set('LG', guardScore.score);
                    secondaryPositions.set('RG', guardScore.score);
                    totalVersatilityBonus += guardScore.bonus;
                }

                // Center flexibility
                if (centerScore?.meetsThreshold) {
                    secondaryPositions.set('C', centerScore.score);
                    totalVersatilityBonus += centerScore.bonus;
                }
                break;
            }
    
            // Linebacker Position Testing
            case 'MLB': {
                const olbScore = this.testForOLB(stats, 'ROLB');
                if (olbScore.meetsThreshold) {
                    secondaryPositions.set('LOLB', olbScore.score);
                    secondaryPositions.set('ROLB', olbScore.score);
                    totalVersatilityBonus += olbScore.bonus;
                }
                break;
            }

                    // Offensive Skill Positions
            case 'QB': {
                const hbScore = this.testForHB(stats);
                const wrScore = this.testForWR(stats);
                const teScore = this.testForTE(stats);
                
                // Athletic QB that could play RB
                if (hbScore.meetsThreshold) {
                    secondaryPositions.set('HB', hbScore.score);
                    totalVersatilityBonus += hbScore.bonus;
                }

                // QB that could play WR (rare but possible)
                if (wrScore.meetsThreshold) {
                    secondaryPositions.set('WR', wrScore.score);
                    totalVersatilityBonus += wrScore.bonus;
                }

                // QB that could play TE
                if (teScore.meetsThreshold) {
                    secondaryPositions.set('TE', teScore.score);
                    totalVersatilityBonus += teScore.bonus;
                }
                break;
            }

            case 'HB': {
                const wrScore = this.testForWR(stats);
                const teScore = this.testForTE(stats);
                const qbScore = this.testForQB(stats);
                
                // RB that could play slot WR
                if (wrScore.meetsThreshold) {
                    secondaryPositions.set('WR', wrScore.score);
                    totalVersatilityBonus += wrScore.bonus;
                }

                // Bigger RB that could play TE
                if (teScore.meetsThreshold) {
                    secondaryPositions.set('TE', teScore.score);
                    totalVersatilityBonus += teScore.bonus;
                }

                // Small RB that could play QB
                if (qbScore.meetsThreshold) {
                    secondaryPositions.set('QB', qbScore.score);
                    totalVersatilityBonus += qbScore.bonus;
                }
                break;
            }

            case 'WR': {
                const hbScore = this.testForHB(stats);
                const teScore = this.testForTE(stats);
                const qbScore = this.testForQB(stats);
                
                // Bigger WR that could play TE
                if (teScore.meetsThreshold) {
                    secondaryPositions.set('TE', teScore.score);
                    totalVersatilityBonus += teScore.bonus;
                }

                // Smaller WR that could play RB
                if (hbScore.meetsThreshold) {
                    secondaryPositions.set('HB', hbScore.score);
                    totalVersatilityBonus += hbScore.bonus;
                }

                // Small WR that could play QB
                if (qbScore.meetsThreshold) {
                    secondaryPositions.set('QB', qbScore.score);
                    totalVersatilityBonus += qbScore.bonus;
                }
                break;
            }

            case 'TE': {
                const wrScore = this.testForWR(stats);
                const hbScore = this.testForHB(stats);
                const qbScore = this.testForQB(stats);
                
                // Athletic TE that could play WR
                if (wrScore.meetsThreshold) {
                    secondaryPositions.set('WR', wrScore.score);
                    totalVersatilityBonus += wrScore.bonus;
                }

                // TE that could play FB/HB
                if (hbScore.meetsThreshold) {
                    secondaryPositions.set('HB', hbScore.score);
                    totalVersatilityBonus += hbScore.bonus;
                }

                // TE that could play QB
                if (qbScore.meetsThreshold) {
                    secondaryPositions.set('QB', qbScore.score);
                    totalVersatilityBonus += qbScore.bonus;
                }
                break;
            }
        }

        // Normalize secondary position scores
        for (const [position, score] of secondaryPositions) {
            const normalizedScore = Math.min(100, Math.max(0, (score / 10))); // Simple normalization
            secondaryPositions.set(position, normalizedScore);
        }

        return {
            secondaryPositions,
            versatilityBonus: Math.min(0.2, totalVersatilityBonus)
            };
        }

    // Example of a position test method
    private testForSafety(stats: PlayerStats, targetPosition: 'FS' | 'SS'): {
        meetsThreshold: boolean,
        score: number,
        bonus: number
    } {
        const weights = POSITION_STAT_WEIGHTS[targetPosition];
        const fsThresholds = POSITION_STAT_THRESHOLDS.FS;
        const ssThresholds = POSITION_STAT_THRESHOLDS.SS;
        
        // Check required stats
        const requiredStats = Object.keys(weights);
        if (requiredStats.some(stat => typeof stats[stat as keyof PlayerStats] === 'undefined')) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Define minimum thresholds based on position
        const minThresholds = targetPosition === 'FS' ? {
            zoneCoverage: fsThresholds.elite.zoneCoverage - 10, // 75
            speed: fsThresholds.elite.speed - 10,               // 80
            acceleration: fsThresholds.elite.acceleration - 10,  // 80
            pursuit: fsThresholds.elite.pursuit - 10,           // 75
            playRecognition: fsThresholds.coverage.playRecognition - 10, // 75
            tackle: fsThresholds.coverage.tackle - 10           // 65
        } : {
            hitPower: ssThresholds.elite.hitPower - 10,        // 75
            zoneCoverage: ssThresholds.elite.zoneCoverage - 10, // 70
            tackle: ssThresholds.elite.tackle - 10,             // 75
            speed: ssThresholds.elite.speed - 10,               // 75
            pursuit: ssThresholds.runSupport.pursuit - 10,      // 75
            blockShedding: ssThresholds.runSupport.blockShedding - 10 // 65
        };
    
        // Check minimums
        if (Object.entries(minThresholds).some(([stat, threshold]) => {
            const statValue = stats[stat as keyof PlayerStats];
            return typeof statValue === 'undefined' || statValue < threshold;
        })) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Calculate weighted score
        let score = 0;
        for (const [stat, weight] of Object.entries(weights)) {
            const statValue = stats[stat as keyof PlayerStats];
            if (typeof statValue === 'number') {
                score += (statValue / 100) * weight;
            }
        }
        score *= 100;
    
        // Position-specific bonus calculations
        let bonus = 0.05;
        if (targetPosition === 'FS') {
            const meetsElite = stats.zoneCoverage! >= fsThresholds.elite.zoneCoverage &&
                              stats.speed! >= fsThresholds.elite.speed &&
                              stats.acceleration! >= fsThresholds.elite.acceleration &&
                              stats.pursuit! >= fsThresholds.elite.pursuit;
    
            const meetsCoverage = stats.playRecognition! >= fsThresholds.coverage.playRecognition &&
                                 stats.tackle! >= fsThresholds.coverage.tackle;
    
            if (meetsElite && meetsCoverage) {
                bonus = 0.15; // Elite coverage safety with good tackling
            } else if (meetsElite) {
                bonus = 0.1;  // Elite coverage safety
            }
        } else { // SS
            const meetsElite = stats.hitPower! >= ssThresholds.elite.hitPower &&
                              stats.zoneCoverage! >= ssThresholds.elite.zoneCoverage &&
                              stats.tackle! >= ssThresholds.elite.tackle &&
                              stats.speed! >= ssThresholds.elite.speed;
    
            const meetsRunSupport = stats.pursuit! >= ssThresholds.runSupport.pursuit &&
                                   stats.blockShedding! >= ssThresholds.runSupport.blockShedding;
    
            if (meetsElite && meetsRunSupport) {
                bonus = 0.15; // Elite strong safety with good run support
            } else if (meetsElite) {
                bonus = 0.1;  // Elite strong safety
            }
        }
    
        return { meetsThreshold: true, score, bonus };
    }

    private testForCornerback(stats: PlayerStats): {
        meetsThreshold: boolean,
        score: number,
        bonus: number
    } {
        const weights = POSITION_STAT_WEIGHTS.CB;
        const thresholds = POSITION_STAT_THRESHOLDS.CB;
        
        // Check required stats
        const requiredStats = Object.keys(weights);
        if (requiredStats.some(stat => typeof stats[stat as keyof PlayerStats] === 'undefined')) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Define minimum thresholds (10 points below elite)
        const minThresholds = {
            speed: thresholds.elite.speed - 10,           // 80
            acceleration: thresholds.elite.acceleration - 10, // 80
            manCoverage: thresholds.elite.manCoverage - 10,  // 75
            zoneCoverage: thresholds.elite.zoneCoverage - 10, // 75
            press: thresholds.manSpecialist.press - 10,      // 75
            playRecognition: thresholds.zoneSpecialist.playRecognition - 10 // 75
        };
    
        // Check minimums
        if (Object.entries(minThresholds).some(([stat, threshold]) => {
            const statValue = stats[stat as keyof PlayerStats];
            return typeof statValue === 'undefined' || (typeof statValue === 'number' && statValue < threshold);
        })) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
        // Calculate weighted score
        let score = 0;
        for (const [stat, weight] of Object.entries(weights)) {
            const statValue = stats[stat as keyof PlayerStats];
            if (typeof statValue === 'number') {
                score += (statValue / 100) * weight;
            }
        }
        score *= 100;
    
        // Bonus calculations based on specializations
        let bonus = 0.05;
        
        const meetsElite = stats.speed! >= thresholds.elite.speed &&
                           stats.acceleration! >= thresholds.elite.acceleration &&
                           stats.manCoverage! >= thresholds.elite.manCoverage &&
                           stats.zoneCoverage! >= thresholds.elite.zoneCoverage;
    
        const meetsManSpecialist = stats.manCoverage! >= thresholds.manSpecialist.manCoverage &&
                                  stats.press! >= thresholds.manSpecialist.press;
    
        const meetsZoneSpecialist = stats.zoneCoverage! >= thresholds.zoneSpecialist.zoneCoverage &&
                                   stats.playRecognition! >= thresholds.zoneSpecialist.playRecognition;
    
        if (meetsElite && (meetsManSpecialist || meetsZoneSpecialist)) {
            bonus = 0.15; // Elite corner with specialization
        } else if (meetsElite || meetsManSpecialist || meetsZoneSpecialist) {
            bonus = 0.1;  // Either elite overall or specialized
        }
    
        return { meetsThreshold: true, score, bonus };
    }

    private testForEdge(stats: PlayerStats, targetPosition: 'RE' | 'LE'): {
        meetsThreshold: boolean,
        score: number,
        bonus: number
    } {
        const weights = POSITION_STAT_WEIGHTS[targetPosition];
        const reThresholds = POSITION_STAT_THRESHOLDS.RE;
        const leThresholds = POSITION_STAT_THRESHOLDS.LE;
        
        // Check required stats
        const requiredStats = Object.keys(weights);
        if (requiredStats.some(stat => typeof stats[stat as keyof PlayerStats] === 'undefined')) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Define minimum thresholds based on position
        const minThresholds = targetPosition === 'RE' ? {
            powerMoves: reThresholds.elite.powerMoves - 10,      // 75
            finesseMoves: reThresholds.elite.finesseMoves - 10,  // 75
            speed: reThresholds.elite.speed - 10,                // 75
            strength: reThresholds.elite.strength - 10,          // 70
            acceleration: reThresholds.athletic.acceleration - 10,// 75
            pursuit: reThresholds.athletic.pursuit - 10,         // 70
            blockShedding: reThresholds.athletic.blockShedding - 10 // 70
        } : {
            blockShedding: leThresholds.elite.blockShedding - 10,// 75
            powerMoves: leThresholds.elite.powerMoves - 10,      // 75
            strength: leThresholds.elite.strength - 10,          // 75
            tackle: leThresholds.elite.tackle - 10,              // 70
            pursuit: leThresholds.runStop.pursuit - 10,          // 70
            finesseMoves: leThresholds.runStop.finesseMoves - 10,// 70
            speed: leThresholds.runStop.speed - 10               // 70
        };
    
        // Check minimums
        if (Object.entries(minThresholds).some(([stat, threshold]) => {
            const statValue = stats[stat as keyof PlayerStats];
            return typeof statValue === 'undefined' || statValue < threshold;
        })) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Calculate weighted score
        let score = 0;
        for (const [stat, weight] of Object.entries(weights)) {
            const statValue = stats[stat as keyof PlayerStats];
            if (typeof statValue === 'number') {
                score += (statValue / 100) * weight;
            }
        }
        score *= 100;
    
        // Position-specific bonus calculations
        let bonus = 0.05;
        if (targetPosition === 'RE') {
            const meetsElite = stats.powerMoves! >= reThresholds.elite.powerMoves &&
                              stats.finesseMoves! >= reThresholds.elite.finesseMoves &&
                              stats.speed! >= reThresholds.elite.speed &&
                              stats.strength! >= reThresholds.elite.strength;
    
            const meetsAthletic = stats.acceleration! >= reThresholds.athletic.acceleration &&
                                 stats.pursuit! >= reThresholds.athletic.pursuit &&
                                 stats.blockShedding! >= reThresholds.athletic.blockShedding;
    
            if (meetsElite && meetsAthletic) {
                bonus = 0.15; // Elite pass rusher with good athleticism
            } else if (meetsElite) {
                bonus = 0.1;  // Elite pass rusher
            }
        } else { // LE
            const meetsElite = stats.blockShedding! >= leThresholds.elite.blockShedding &&
                              stats.powerMoves! >= leThresholds.elite.powerMoves &&
                              stats.strength! >= leThresholds.elite.strength &&
                              stats.tackle! >= leThresholds.elite.tackle;
    
            const meetsRunStop = stats.pursuit! >= leThresholds.runStop.pursuit &&
                                stats.finesseMoves! >= leThresholds.runStop.finesseMoves &&
                                stats.speed! >= leThresholds.runStop.speed;
    
            if (meetsElite && meetsRunStop) {
                bonus = 0.15; // Elite run stopper with good pursuit
            } else if (meetsElite) {
                bonus = 0.1;  // Elite run stopper
            }
        }
    
        return { meetsThreshold: true, score, bonus };
    }


    private testForDT(stats: PlayerStats): {
        meetsThreshold: boolean,
        score: number,
        bonus: number
    } {
        const weights = POSITION_STAT_WEIGHTS.DT;
        const thresholds = POSITION_STAT_THRESHOLDS.DT;
        
        // Check required stats
        const requiredStats = Object.keys(weights);
        if (requiredStats.some(stat => typeof stats[stat as keyof PlayerStats] === 'undefined')) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Define minimum thresholds (10 points below elite/passRush)
        const minThresholds = {
            blockShedding: thresholds.elite.blockShedding - 10,  // 75
            powerMoves: thresholds.elite.powerMoves - 10,        // 75
            strength: thresholds.elite.strength - 10,            // 75
            finesseMoves: thresholds.passRush.finesseMoves - 10, // 70
            acceleration: thresholds.passRush.acceleration - 10,  // 70
            pursuit: thresholds.passRush.pursuit - 10            // 65
        };
    
        // Check minimums
        if (Object.entries(minThresholds).some(([stat, threshold]) => {
            const statValue = stats[stat as keyof PlayerStats];
            return typeof statValue === 'undefined' || (typeof statValue === 'number' && statValue < threshold);
        })) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
        // Calculate weighted score
        let score = 0;
        for (const [stat, weight] of Object.entries(weights)) {
            const statValue = stats[stat as keyof PlayerStats];
            if (typeof statValue === 'number') {
                score += (statValue / 100) * weight;
            }
        }
        score *= 100;
    
        // Bonus calculations
        let bonus = 0.05;
        
        const meetsElite = stats.blockShedding! >= thresholds.elite.blockShedding &&
                           stats.powerMoves! >= thresholds.elite.powerMoves &&
                           stats.strength! >= thresholds.elite.strength;
    
        const meetsPassRush = stats.finesseMoves! >= thresholds.passRush.finesseMoves &&
                             stats.acceleration! >= thresholds.passRush.acceleration &&
                             stats.pursuit! >= thresholds.passRush.pursuit;
    
        if (meetsElite && meetsPassRush) {
            bonus = 0.15; // Elite run stopper with pass rush ability
        } else if (meetsElite || meetsPassRush) {
            bonus = 0.1;  // Either elite run stopper or good pass rusher
        }
    
        return { meetsThreshold: true, score, bonus };
    }

    private testForOLB(stats: PlayerStats, targetPosition: 'LOLB' | 'ROLB'): {
        meetsThreshold: boolean,
        score: number,
        bonus: number
    } {
        const weights = POSITION_STAT_WEIGHTS[targetPosition];
        const thresholds = POSITION_STAT_THRESHOLDS.ROLB
        
        // Check required stats
        const requiredStats = Object.keys(weights);
        if (requiredStats.some(stat => typeof stats[stat as keyof PlayerStats] === 'undefined')) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Define minimum thresholds (10 points below elite/coverage)
        const minThresholds = {
            tackle: thresholds.elite.tackle - 10,           // 75
            pursuit: thresholds.elite.pursuit - 10,         // 75
            hitPower: thresholds.elite.hitPower - 10,       // 70
            playRecognition: thresholds.elite.playRecognition - 10, // 70
            zoneCoverage: thresholds.coverage.zoneCoverage - 10,   // 70
            speed: thresholds.coverage.speed - 10,          // 75
            acceleration: thresholds.coverage.acceleration - 10     // 75
        };
    
        // Check minimums
        if (Object.entries(minThresholds).some(([stat, threshold]) => {
            const statValue = stats[stat as keyof PlayerStats];
            return typeof statValue === 'undefined' || (typeof statValue === 'number' && statValue < threshold);
        })) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
        // Calculate weighted score
        let score = 0;
        for (const [stat, weight] of Object.entries(weights)) {
            const statValue = stats[stat as keyof PlayerStats];
            if (typeof statValue === 'number') {
                score += (statValue / 100) * weight;
            }
        }
        score *= 100;
    
        // Bonus calculations
        let bonus = 0.05;
        
        const meetsElite = stats.tackle! >= thresholds.elite.tackle &&
                           stats.pursuit! >= thresholds.elite.pursuit &&
                           stats.hitPower! >= thresholds.elite.hitPower &&
                           stats.playRecognition! >= thresholds.elite.playRecognition;
    
        const meetsCoverage = stats.zoneCoverage! >= thresholds.coverage.zoneCoverage &&
                             stats.speed! >= thresholds.coverage.speed &&
                             stats.acceleration! >= thresholds.coverage.acceleration;
    
        if (meetsElite && meetsCoverage) {
            bonus = 0.15; // Elite run stopper with good coverage
        } else if (meetsElite || meetsCoverage) {
            bonus = 0.1;  // Either elite run stopper or good in coverage
        }
    
        return { meetsThreshold: true, score, bonus };
    }

    private testForTackle(stats: PlayerStats, targetPosition: 'LT' | 'RT'): {
        meetsThreshold: boolean,
        score: number,
        bonus: number
    } {
        const weights = POSITION_STAT_WEIGHTS[targetPosition];
        const thresholds = POSITION_STAT_THRESHOLDS.RT
        
        // Check required stats
        const requiredStats = Object.keys(weights);
        if (requiredStats.some(stat => typeof stats[stat as keyof PlayerStats] === 'undefined')) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Define minimum thresholds (10 points below elite/runBlocking)
        const minThresholds = {
            passBlockPower: thresholds.elite.passBlockPower - 10,   // 75
            passBlockFinesse: thresholds.elite.passBlockFinesse - 10, // 75
            strength: thresholds.elite.strength - 10,               // 75
            runBlock: thresholds.runBlocking.runBlock - 10,        // 75
            impactBlocking: thresholds.runBlocking.impactBlocking - 10 // 75
        };
    
        // Check minimums
        if (Object.entries(minThresholds).some(([stat, threshold]) => {
            const statValue = stats[stat as keyof PlayerStats];
            return typeof statValue === 'undefined' || (typeof statValue === 'number' && statValue < threshold);
        })) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Calculate weighted score
        let score = 0;
        for (const [stat, weight] of Object.entries(weights)) {
            const statValue = stats[stat as keyof PlayerStats];
            if (typeof statValue === 'number') {
                score += (statValue / 100) * weight;
            }
        }
        score *= 100;
    
        // Bonus calculations
        let bonus = 0.05;
        
        const meetsElite = stats.passBlockPower! >= thresholds.elite.passBlockPower &&
                           stats.passBlockFinesse! >= thresholds.elite.passBlockFinesse &&
                           stats.strength! >= thresholds.elite.strength;
    
        const meetsRunBlocking = stats.runBlock! >= thresholds.runBlocking.runBlock &&
                                stats.impactBlocking! >= thresholds.runBlocking.impactBlocking;
    
        if (meetsElite && meetsRunBlocking) {
            bonus = 0.15; // Elite pass protector with good run blocking
        } else if (meetsElite || meetsRunBlocking) {
            bonus = 0.1;  // Either elite pass protector or good run blocker
        }
    
        return { meetsThreshold: true, score, bonus };
    }

    private testForGuard(stats: PlayerStats, targetPosition: 'LG' | 'RG'): {
        meetsThreshold: boolean,
        score: number,
        bonus: number
    } {
        const weights = POSITION_STAT_WEIGHTS[targetPosition];
        const thresholds = POSITION_STAT_THRESHOLDS.RG
        
        // Check required stats
        const requiredStats = Object.keys(weights);
        if (requiredStats.some(stat => typeof stats[stat as keyof PlayerStats] === 'undefined')) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Define minimum thresholds (10 points below elite/passBlocking)
        const minThresholds = {
            runBlock: thresholds.elite.runBlock - 10,           // 75
            impactBlocking: thresholds.elite.impactBlocking - 10, // 75
            strength: thresholds.elite.strength - 10,           // 75
            passBlockPower: thresholds.passBlocking.passBlockPower - 10,     // 75
            passBlockFinesse: thresholds.passBlocking.passBlockFinesse - 10  // 70
        };
    
        // Check minimums
        if (Object.entries(minThresholds).some(([stat, threshold]) => {
            const statValue = stats[stat as keyof PlayerStats];
            return typeof statValue === 'undefined' || (typeof statValue === 'number' && statValue < threshold);
        })) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Calculate weighted score
        let score = 0;
        for (const [stat, weight] of Object.entries(weights)) {
            const statValue = stats[stat as keyof PlayerStats];
            if (typeof statValue === 'number') {
                score += (statValue / 100) * weight;
            }
        }
        score *= 100;
    
        // Bonus calculations
        let bonus = 0.05;
        
        const meetsElite = stats.runBlock! >= thresholds.elite.runBlock &&
                           stats.impactBlocking! >= thresholds.elite.impactBlocking &&
                           stats.strength! >= thresholds.elite.strength;
    
        const meetsPassBlocking = stats.passBlockPower! >= thresholds.passBlocking.passBlockPower &&
                                 stats.passBlockFinesse! >= thresholds.passBlocking.passBlockFinesse;
    
        if (meetsElite && meetsPassBlocking) {
            bonus = 0.15; // Elite run blocker with good pass protection
        } else if (meetsElite || meetsPassBlocking) {
            bonus = 0.1;  // Either elite run blocker or good pass protector
        }
    
        return { meetsThreshold: true, score, bonus };
    }

    private testForCenter(stats: PlayerStats): {
        meetsThreshold: boolean,
        score: number,
        bonus: number
    } {
        const weights = POSITION_STAT_WEIGHTS.C;
        const thresholds = POSITION_STAT_THRESHOLDS.C;
        
        // Check required stats
        const requiredStats = Object.keys(weights);
        if (requiredStats.some(stat => typeof stats[stat as keyof PlayerStats] === 'undefined')) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Define minimum thresholds (10 points below elite/passBlocking)
        const minThresholds = {
            runBlock: thresholds.elite.runBlock - 10,           // 75
            impactBlocking: thresholds.elite.impactBlocking - 10, // 75
            strength: thresholds.elite.strength - 10,           // 75
            passBlockPower: thresholds.passBlocking.passBlockPower - 10,     // 75
            passBlockFinesse: thresholds.passBlocking.passBlockFinesse - 10  // 70
        };
    
        // Check minimums
        if (Object.entries(minThresholds).some(([stat, threshold]) => {
            const statValue = stats[stat as keyof PlayerStats];
            return typeof statValue === 'undefined' || (typeof statValue === 'number' && statValue < threshold);
        })) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Calculate weighted score
        let score = 0;
        for (const [stat, weight] of Object.entries(weights)) {
            const statValue = stats[stat as keyof PlayerStats];
            if (typeof statValue === 'number') {
                score += (statValue / 100) * weight;
            }
        }
        score *= 100;
    
        // Bonus calculations
        let bonus = 0.05;
        
        const meetsElite = stats.runBlock! >= thresholds.elite.runBlock &&
                           stats.impactBlocking! >= thresholds.elite.impactBlocking &&
                           stats.strength! >= thresholds.elite.strength;
    
        const meetsPassBlocking = stats.passBlockPower! >= thresholds.passBlocking.passBlockPower &&
                                 stats.passBlockFinesse! >= thresholds.passBlocking.passBlockFinesse;
    
        if (meetsElite && meetsPassBlocking) {
            bonus = 0.15; // Elite run blocker with good pass protection
        } else if (meetsElite || meetsPassBlocking) {
            bonus = 0.1;  // Either elite run blocker or good pass protector
        }
    
        return { meetsThreshold: true, score, bonus };
    }

    // Test methods for offensive positions
    private testForWR(stats: PlayerStats): {
        meetsThreshold: boolean,
        score: number,
        bonus: number
    } {
        const weights = POSITION_STAT_WEIGHTS.WR;
        const thresholds = POSITION_STAT_THRESHOLDS.WR;
        
        // Check required stats
        const requiredStats = Object.keys(weights);
        if (requiredStats.some(stat => typeof stats[stat as keyof PlayerStats] === 'undefined')) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Define minimum thresholds (10 points below elite/specializations)
        const minThresholds = {
            speed: thresholds.elite.speed - 10,                 // 80
            acceleration: thresholds.elite.acceleration - 10,    // 80
            catching: thresholds.elite.catching - 10,           // 75
            shortRouteRunning: thresholds.elite.shortRouteRunning - 10,   // 75
            mediumRouteRunning: thresholds.elite.mediumRouteRunning - 10, // 75
            deepRouteRunning: thresholds.deepThreat.deepRouteRunning - 10, // 75
            catchInTraffic: thresholds.possession.catchInTraffic - 10     // 75
        };
    
        // Check minimums
        if (Object.entries(minThresholds).some(([stat, threshold]) => {
            const statValue = stats[stat as keyof PlayerStats];
            return typeof statValue === 'undefined' || (typeof statValue === 'number' && statValue < threshold);
        })) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Calculate weighted score
        let score = 0;
        for (const [stat, weight] of Object.entries(weights)) {
            const statValue = stats[stat as keyof PlayerStats];
            if (typeof statValue === 'number') {
                score += (statValue / 100) * weight;
            }
        }
        score *= 100;
    
        // Bonus calculations
        let bonus = 0.05;
        
        const meetsElite = stats.speed! >= thresholds.elite.speed &&
                           stats.acceleration! >= thresholds.elite.acceleration &&
                           stats.catching! >= thresholds.elite.catching &&
                           stats.shortRouteRunning! >= thresholds.elite.shortRouteRunning &&
                           stats.mediumRouteRunning! >= thresholds.elite.mediumRouteRunning;
    
        const meetsDeepThreat = stats.speed! >= thresholds.deepThreat.speed &&
                               stats.deepRouteRunning! >= thresholds.deepThreat.deepRouteRunning;
    
        const meetsPossession = stats.catching! >= thresholds.possession.catching &&
                               stats.catchInTraffic! >= thresholds.possession.catchInTraffic &&
                               stats.shortRouteRunning! >= thresholds.possession.shortRouteRunning;
    
        if (meetsElite && (meetsDeepThreat || meetsPossession)) {
            bonus = 0.15; // Elite receiver with a specialization
        } else if (meetsElite || meetsDeepThreat || meetsPossession) {
            bonus = 0.1;  // Either elite overall or specialized
        }
    
        return { meetsThreshold: true, score, bonus };
    }

    private testForHB(stats: PlayerStats): {
        meetsThreshold: boolean,
        score: number,
        bonus: number
    } {
        const weights = POSITION_STAT_WEIGHTS.HB;
        const thresholds = POSITION_STAT_THRESHOLDS.HB;
        
        // Check required stats
        const requiredStats = Object.keys(weights);
        if (requiredStats.some(stat => typeof stats[stat as keyof PlayerStats] === 'undefined')) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Define minimum thresholds (10 points below elite/powerBack)
        const minThresholds = {
            speed: thresholds.elite.speed - 10,           // 80
            acceleration: thresholds.elite.acceleration - 10, // 80
            agility: thresholds.elite.agility - 10,       // 78
            carrying: thresholds.elite.carrying - 10,     // 75
            trucking: thresholds.powerBack.trucking - 10,     // 75
            breakTackle: thresholds.powerBack.breakTackle - 10, // 75
            strength: thresholds.powerBack.strength - 10      // 70
        };
    
        // Check minimums
        if (Object.entries(minThresholds).some(([stat, threshold]) => {
            const statValue = stats[stat as keyof PlayerStats];
            return typeof statValue === 'undefined' || (typeof statValue === 'number' && statValue < threshold);
        })) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Calculate weighted score
        let score = 0;
        for (const [stat, weight] of Object.entries(weights)) {
            const statValue = stats[stat as keyof PlayerStats];
            if (typeof statValue === 'number') {
                score += (statValue / 100) * weight;
            }
        }
        score *= 100;
    
        // Bonus calculations
        let bonus = 0.05;
        
        const meetsElite = stats.speed! >= thresholds.elite.speed &&
                           stats.acceleration! >= thresholds.elite.acceleration &&
                           stats.agility! >= thresholds.elite.agility &&
                           stats.carrying! >= thresholds.elite.carrying;
    
        const meetsPowerBack = stats.trucking! >= thresholds.powerBack.trucking &&
                              stats.breakTackle! >= thresholds.powerBack.breakTackle &&
                              stats.strength! >= thresholds.powerBack.strength;
    
        if (meetsElite && meetsPowerBack) {
            bonus = 0.15; // Elite speed back with power running ability
        } else if (meetsElite || meetsPowerBack) {
            bonus = 0.1;  // Either elite speed back or power back
        }
    
        return { meetsThreshold: true, score, bonus };
    }

    private testForTE(stats: PlayerStats): {
        meetsThreshold: boolean,
        score: number,
        bonus: number
    } {
        const weights = POSITION_STAT_WEIGHTS.TE;
        const thresholds = POSITION_STAT_THRESHOLDS.TE;
        
        // Check required stats
        const requiredStats = Object.keys(weights);
        if (requiredStats.some(stat => typeof stats[stat as keyof PlayerStats] === 'undefined')) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Define minimum thresholds (10 points below elite/blocking)
        const minThresholds = {
            catching: thresholds.elite.catching - 10,           // 75
            shortRouteRunning: thresholds.elite.shortRouteRunning - 10, // 70
            mediumRouteRunning: thresholds.elite.mediumRouteRunning - 10, // 70
            strength: thresholds.elite.strength - 10,           // 65
            runBlock: thresholds.blocking.runBlock - 10,        // 70
            impactBlocking: thresholds.blocking.impactBlocking - 10  // 70
        };
    
        // Check minimums
        if (Object.entries(minThresholds).some(([stat, threshold]) => {
            const statValue = stats[stat as keyof PlayerStats];
            return typeof statValue === 'undefined' || (typeof statValue === 'number' && statValue < threshold);
        })) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Calculate weighted score
        let score = 0;
        for (const [stat, weight] of Object.entries(weights)) {
            const statValue = stats[stat as keyof PlayerStats];
            if (typeof statValue === 'number') {
                score += (statValue / 100) * weight;
            }
        }
        score *= 100;
    
        // Bonus calculations
        let bonus = 0.05;
        
        const meetsElite = stats.catching! >= thresholds.elite.catching &&
                           stats.shortRouteRunning! >= thresholds.elite.shortRouteRunning &&
                           stats.mediumRouteRunning! >= thresholds.elite.mediumRouteRunning &&
                           stats.strength! >= thresholds.elite.strength;
    
        const meetsBlocking = stats.runBlock! >= thresholds.blocking.runBlock &&
                             stats.impactBlocking! >= thresholds.blocking.impactBlocking &&
                             stats.strength! >= thresholds.blocking.strength;
    
        if (meetsElite && meetsBlocking) {
            bonus = 0.15; // Elite receiving TE with good blocking
        } else if (meetsElite || meetsBlocking) {
            bonus = 0.1;  // Either elite receiver or good blocker
        }
    
        return { meetsThreshold: true, score, bonus };
    }

    private testForQB(stats: PlayerStats): {
        meetsThreshold: boolean,
        score: number,
        bonus: number
    } {
        const weights = POSITION_STAT_WEIGHTS.QB;
        const thresholds = POSITION_STAT_THRESHOLDS.QB;
        
        // Check required stats
        const requiredStats = Object.keys(weights);
        if (requiredStats.some(stat => typeof stats[stat as keyof PlayerStats] === 'undefined')) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Define minimum thresholds (10 points below elite/goodMobility)
        const minThresholds = {
            throwPower: thresholds.elite.throwPower - 10,           // 80
            throwAccuracyShort: thresholds.elite.throwAccuracyShort - 10, // 75
            throwAccuracyMid: thresholds.elite.throwAccuracyMid - 10,   // 75
            throwAccuracyDeep: thresholds.elite.throwAccuracyDeep - 10, // 75
            throwOnTheRun: thresholds.elite.throwOnTheRun - 10,     // 75
            speed: thresholds.goodMobility.speed - 10,              // 75
            acceleration: thresholds.goodMobility.acceleration - 10, // 75
            agility: thresholds.goodMobility.agility - 10           // 75
        };
    
        // Check minimums
        if (Object.entries(minThresholds).some(([stat, threshold]) => {
            const statValue = stats[stat as keyof PlayerStats];
            return typeof statValue === 'undefined' || (typeof statValue === 'number' && statValue < threshold);
        })) {
            return { meetsThreshold: false, score: 0, bonus: 0 };
        }
    
        // Calculate weighted score
        let score = 0;
        for (const [stat, weight] of Object.entries(weights)) {
            const statValue = stats[stat as keyof PlayerStats];
            if (typeof statValue === 'number') {
                score += (statValue / 100) * weight;
            }
        }
        score *= 100;
    
        // Bonus calculations
        let bonus = 0.05;
        
        const meetsElite = stats.throwPower! >= thresholds.elite.throwPower &&
                           stats.throwAccuracyShort! >= thresholds.elite.throwAccuracyShort &&
                           stats.throwAccuracyMid! >= thresholds.elite.throwAccuracyMid &&
                           stats.throwAccuracyDeep! >= thresholds.elite.throwAccuracyDeep &&
                           stats.throwOnTheRun! >= thresholds.elite.throwOnTheRun;
    
        const meetsMobility = stats.speed! >= thresholds.goodMobility.speed &&
                             stats.acceleration! >= thresholds.goodMobility.acceleration &&
                             stats.agility! >= thresholds.goodMobility.agility;
    
        if (meetsElite && meetsMobility) {
            bonus = 0.15; // Elite passer with good mobility
        } else if (meetsElite || meetsMobility) {
            bonus = 0.1;  // Either elite passer or mobile QB
        }
    
        return { meetsThreshold: true, score, bonus };
    }

    private async calculateSchemeSpecificScores(
        players: Player[], 
        position: Position,
        secondaryPositions: Map<number, { 
            secondaryPositions: Map<Position, number>, 
            versatilityBonus: number 
        }>
    ): Promise<Map<number, { 
        primary: { gunBunchFit: number, nickelFit: number },
        secondary: Record<Position, { gunBunchFit: number, nickelFit: number }> 
    }>> {
        const scores = new Map();
        const gunBunchScores: number[] = [];
        const nickelScores: number[] = [];
    
        // First pass: calculate raw scores
        for (const player of players) {
            if (!player.stats?.[0]) continue;
            const stats = player.stats[0];
    
            // Initialize scores object for this player
            const playerScores = {
                primary: { gunBunchFit: 0, nickelFit: 0 },
                secondary: {} as Record<Position, { gunBunchFit: number, nickelFit: number }>
            };
    
            // Calculate primary position scores
            switch(position) {
                case 'QB':
                    playerScores.primary.gunBunchFit = this.calculateGunBunchQBFit(stats);
                    break;
                case 'WR':
                    playerScores.primary.gunBunchFit = this.calculateGunBunchWRFit(stats);
                    break;
                case 'HB':
                    playerScores.primary.gunBunchFit = this.calculateGunBunchHBFit(stats);
                    break;
                case 'TE':
                    console.log('Calculating TE scheme fit for player:', player.id);
                    playerScores.primary.gunBunchFit = this.calculateGunBunchTEFit(stats);
                    console.log('Raw Gun Bunch fit score:', playerScores.primary.gunBunchFit);
                    break;
                case 'LT':
                case 'RT':
                case 'LG':
                case 'RG':
                case 'C':
                    playerScores.primary.gunBunchFit = this.calculateGunBunchOLFit(stats, position);
                    break;
                case 'CB':
                case 'FS':
                case 'SS':
                    playerScores.primary.nickelFit = this.calculateNickelDBFit(stats, position);
                    break;
                case 'LOLB':
                case 'MLB':
                case 'ROLB':
                    playerScores.primary.nickelFit = this.calculateNickelLBFit(stats, position);
                    break;
                case 'LE':
                case 'RE':
                case 'DT':
                    playerScores.primary.nickelFit = this.calculateNickelDLFit(stats, position);
                    break;
            }
    
            // Get and calculate secondary position scores
            const existingAnalysis = await this.findByPlayer(player.id);
            if (existingAnalysis?.secondaryPositions) {
                for (const secondaryPos of existingAnalysis.secondaryPositions) {
                    const pos = secondaryPos.position as Position;
                    playerScores.secondary[pos] = { gunBunchFit: 0, nickelFit: 0 };
    
                    switch(pos) {
                        case 'QB':
                            playerScores.secondary[pos].gunBunchFit = this.calculateGunBunchQBFit(stats);
                            break;
                        case 'WR':
                            playerScores.secondary[pos].gunBunchFit = this.calculateGunBunchWRFit(stats);
                            break;
                        case 'HB':
                            playerScores.secondary[pos].gunBunchFit = this.calculateGunBunchHBFit(stats);
                            break;
                        case 'TE':
                            console.log('Calculating TE scheme fit for player:', player.id);
                            playerScores.primary.gunBunchFit = this.calculateGunBunchTEFit(stats);
                            console.log('Raw Gun Bunch fit score:', playerScores.primary.gunBunchFit);
                            break;
                        case 'LT':
                        case 'RT':
                        case 'LG':
                        case 'RG':
                        case 'C':
                            playerScores.secondary[pos].gunBunchFit = this.calculateGunBunchOLFit(stats, pos);
                            break;
                        case 'CB':
                        case 'FS':
                        case 'SS':
                            playerScores.secondary[pos].nickelFit = this.calculateNickelDBFit(stats, pos);
                            break;
                        case 'LOLB':
                        case 'MLB':
                        case 'ROLB':
                            playerScores.secondary[pos].nickelFit = this.calculateNickelLBFit(stats, pos);
                            break;
                        case 'LE':
                        case 'RE':
                        case 'DT':
                            playerScores.secondary[pos].nickelFit = this.calculateNickelDLFit(stats, pos);
                            break;
                    }
                }
            }
    
            // Store raw scores for normalization
            if (playerScores.primary.gunBunchFit > 0) gunBunchScores.push(playerScores.primary.gunBunchFit);
            if (playerScores.primary.nickelFit > 0) nickelScores.push(playerScores.primary.nickelFit);

            // Also store secondary position scores for normalization
            Object.values(playerScores.secondary).forEach(scores => {
                if (scores.gunBunchFit > 0) gunBunchScores.push(scores.gunBunchFit);
                if (scores.nickelFit > 0) nickelScores.push(scores.nickelFit);
            });

            scores.set(player.id, playerScores);
        }

        // Second pass: normalize all scores
        if (gunBunchScores.length > 0) {
            const gunBunchMean = gunBunchScores.reduce((a, b) => a + b) / gunBunchScores.length;
            const gunBunchStdDev = Math.sqrt(
                gunBunchScores.map(x => Math.pow(x - gunBunchMean, 2))
                    .reduce((a, b) => a + b) / gunBunchScores.length
            );
    
            // Normalize all Gun Bunch scores with less compression (25 instead of 15)
            for (const [playerId, playerScores] of scores as Map<number, PlayerSchemeScores>) {
                // Normalize primary position Gun Bunch score
                if (playerScores.primary.gunBunchFit > 0) {
                    const zScore = (playerScores.primary.gunBunchFit - gunBunchMean) / gunBunchStdDev;
                    playerScores.primary.gunBunchFit = Math.min(100, Math.max(0, 50 + (zScore * 25)));
                }
    
                // Normalize secondary positions Gun Bunch scores
                Object.values(playerScores.secondary).forEach((posScores: SchemeScores) => {
                    if (posScores.gunBunchFit > 0) {
                        const zScore = (posScores.gunBunchFit - gunBunchMean) / gunBunchStdDev;
                        posScores.gunBunchFit = Math.min(100, Math.max(0, 50 + (zScore * 25)));
                    }
                });
            }
        }
    
        // Similar adjustment for Nickel scores
        if (nickelScores.length > 0) {
            const nickelMean = nickelScores.reduce((a, b) => a + b) / nickelScores.length;
            const nickelStdDev = Math.sqrt(
                nickelScores.map(x => Math.pow(x - nickelMean, 2))
                    .reduce((a, b) => a + b) / nickelScores.length
            );
    
            for (const [playerId, playerScores] of scores as Map<number, PlayerSchemeScores>) {
                if (playerScores.primary.nickelFit > 0) {
                    const zScore = (playerScores.primary.nickelFit - nickelMean) / nickelStdDev;
                    playerScores.primary.nickelFit = Math.min(100, Math.max(0, 50 + (zScore * 25)));
                }
    
                Object.values(playerScores.secondary).forEach((posScores: SchemeScores) => {
                    if (posScores.nickelFit > 0) {
                        const zScore = (posScores.nickelFit - nickelMean) / nickelStdDev;
                        posScores.nickelFit = Math.min(100, Math.max(0, 50 + (zScore * 25)));
                    }
                });
            }
        }
    
        return scores;
    }

    private calculateGunBunchQBFit(stats: PlayerStats): number {
        const weights = {
            accuracy: 0.7,    // Accuracy is most important
            mobility: 0.3     // Mobility is secondary but important
        };
    
        // Calculate accuracy score (70% weight)
        const accuracyScore = (
            ((stats.throwAccuracyShort || 0) * 1.2) +  // Short accuracy most important
            ((stats.throwAccuracyMid || 0) * 1.1) +    // Mid accuracy next
            ((stats.throwOnTheRun || 0) * 1.1) +       // Throw on run important
            ((stats.throwPower || 0) * 0.8) +          // Some arm strength needed
            ((stats.playAction || 0) * 0.8)            // Play action useful
        ) / 5.0;  // Normalized to ~100
    
        // Calculate mobility score (30% weight)
        const mobilityScore = (
            ((stats.speed || 0) * 1.0) +
            ((stats.acceleration || 0) * 0.9) +
            ((stats.agility || 0) * 0.8) +
            ((stats.throwOnTheRun || 0) * 0.8)    // Count throw on run in both categories
        ) / 3.5;  // Normalized to ~100
    
        // Calculate base score
        let finalScore = (
            accuracyScore * weights.accuracy + 
            mobilityScore * weights.mobility
        );
    
        // Bonus calculations
        const bonuses = [];
        
        // Elite accuracy bonus
        if (stats.throwAccuracyShort && stats.throwAccuracyShort >= 90 &&
            stats.throwAccuracyMid && stats.throwAccuracyMid >= 85) {
            bonuses.push(0.15); // 15% bonus
        }
    
        // Mobility threat bonus
        if (stats.speed && stats.speed >= 85 &&
            stats.acceleration && stats.acceleration >= 85 &&
            stats.throwOnTheRun && stats.throwOnTheRun >= 85) {
            bonuses.push(0.12); // 12% bonus
        }
    
        // Quick release bonus (new)
        if (stats.throwPower && stats.throwPower >= 85 &&
            stats.playAction && stats.playAction >= 85) {
            bonuses.push(0.10); // 10% bonus
        }
    
        // Apply bonuses
        const totalBonus = bonuses.reduce((sum, bonus) => sum + bonus, 0);
        finalScore = finalScore * (1 + totalBonus);
    
        return Math.min(100, finalScore);
    }

    private calculateGunBunchWRFit(stats: PlayerStats): number {
        const weights = {
            routeRunning: 0.6,    // Route running most important
            receiving: 0.4        // Receiving ability secondary
        };
    
        // Calculate route running score (60% weight)
        const routeRunningScore = (
            ((stats.shortRouteRunning || 0) * 1.3) +   // Short routes crucial
            ((stats.mediumRouteRunning || 0) * 1.2) +  // Medium routes important
            ((stats.deepRouteRunning || 0) * 0.8) +    // Deep routes less emphasis
            ((stats.agility || 0) * 0.8) +             // Agility helps routes
            ((stats.acceleration || 0) * 0.7)          // Acceleration for breaks
        ) / 4.8;  // Normalized to ~100
    
        // Calculate receiving score (40% weight)
        const receivingScore = (
            ((stats.catching || 0) * 1.2) +
            ((stats.catchInTraffic || 0) * 1.1) +
            ((stats.release || 0) * 0.9) +           // Release important vs press
            ((stats.awareness || 0) * 0.8) +         // Finding soft spots
            ((stats.jumping || 0) * 0.7)            // Contested catches
        ) / 4.7;  // Normalized to ~100
    
        // Calculate base score
        let finalScore = (
            routeRunningScore * weights.routeRunning + 
            receivingScore * weights.receiving
        );
    
        // Bonus calculations
        const bonuses = [];
        
        // Elite route runner bonus
        if (stats.shortRouteRunning && stats.shortRouteRunning >= 90 &&
            stats.mediumRouteRunning && stats.mediumRouteRunning >= 85) {
            bonuses.push(0.15); // 15% bonus
        }
    
        // Slot receiver bonus
        if (stats.catching && stats.catching >= 85 &&
            stats.catchInTraffic && stats.catchInTraffic >= 85 &&
            stats.shortRouteRunning && stats.shortRouteRunning >= 85) {
            bonuses.push(0.12); // 12% bonus
        }
    
        // YAC threat bonus
        if (stats.speed && stats.speed >= 90 &&
            stats.acceleration && stats.acceleration >= 90 &&
            stats.agility && stats.agility >= 85) {
            bonuses.push(0.10); // 10% bonus
        }
    
        // Apply bonuses
        const totalBonus = bonuses.reduce((sum, bonus) => sum + bonus, 0);
        finalScore = finalScore * (1 + totalBonus);
    
        return Math.min(100, finalScore);
    }

    private calculateGunBunchHBFit(stats: PlayerStats): number {
        const weights = {
            receiving: 0.7,    // Receiving most important for Gun Bunch
            blocking: 0.3      // Pass blocking still important
        };
    
        // Calculate receiving score (70% weight)
        const receivingScore = (
            ((stats.catching || 0) * 1.2) +          // Catching most crucial
            ((stats.shortRouteRunning || 0) * 1.1) + // Short routes important
            ((stats.mediumRouteRunning || 0) * 0.9) +// Medium routes useful
            ((stats.catchInTraffic || 0) * 1.0) +    // CIT for checkdowns
            ((stats.acceleration || 0) * 0.8)        // Acceleration for routes
        ) / 5.0;  // Normalized to ~100
    
        // Calculate pass blocking score (30% weight)
        const blockingScore = (
            ((stats.passBlock || 0) * 1.2) +        // Pass blocking primary
            ((stats.awareness || 0) * 1.0) +        // Awareness for blitz pickup
            ((stats.strength || 0) * 0.8) +         // Strength helps in protection
            ((stats.impactBlocking || 0) * 0.7)     // General blocking ability
        ) / 3.7;  // Normalized to ~100
    
        // Calculate base score
        let finalScore = (
            receivingScore * weights.receiving + 
            blockingScore * weights.blocking
        );
    
        // Bonus calculations
        const bonuses = [];
        
        // Receiving specialist bonus
        if (stats.catching && stats.catching >= 85 &&
            stats.shortRouteRunning && stats.shortRouteRunning >= 80) {
            bonuses.push(0.15); // 15% bonus for elite receiving backs
        }
    
        // Pass protection specialist bonus
        if (stats.passBlock && stats.passBlock >= 85 &&
            stats.awareness && stats.awareness >= 80) {
            bonuses.push(0.12); // 12% bonus for elite pass protectors
        }
    
        // Third down back bonus
        if (stats.catching && stats.catching >= 80 &&
            stats.passBlock && stats.passBlock >= 75 &&
            stats.awareness && stats.awareness >= 75 &&
            stats.acceleration && stats.acceleration >= 85) {
            bonuses.push(0.10); // 10% bonus for complete third down backs
        }
    
        // YAC threat bonus (new)
        if (stats.speed && stats.speed >= 90 &&
            stats.acceleration && stats.acceleration >= 90 &&
            stats.breakTackle && stats.breakTackle >= 85) {
            bonuses.push(0.08); // 8% bonus for explosive players
        }
    
        // Apply bonuses
        const totalBonus = bonuses.reduce((sum, bonus) => sum + bonus, 0);
        finalScore = finalScore * (1 + totalBonus);
    
        return Math.min(100, finalScore);
    }

    private calculateGunBunchTEFit(stats: PlayerStats): number {
        const weights = {
            receiving: 0.7,
            blocking: 0.3
        };
    
        // Calculate receiving score (70% weight)
        const receivingScore = (
            ((stats.catching || 0) * 1.2) +
            ((stats.shortRouteRunning || 0) * 1.1) +
            ((stats.mediumRouteRunning || 0) * 1.1) +
            ((stats.catchInTraffic || 0) * 1.1) +
            ((stats.speed || 0) * 0.8)
        ) / 5.3;  // This normalizes to roughly 0-100
    
        // Calculate pass blocking score (30% weight)
        const blockingScore = (
            ((stats.passBlock || 0) * 1.0) +
            ((stats.impactBlocking || 0) * 0.8) +
            ((stats.strength || 0) * 0.7)
        ) / 2.5;  // This normalizes to roughly 0-100
    
        // Calculate base score (will be 0-100)
        let finalScore = (
            (receivingScore * weights.receiving) + 
            (blockingScore * weights.blocking)
        );
    
        // Bonus calculations
        const bonuses = [];
        
        // Elite receiving bonus
        if (stats.catching && stats.catching >= 85 &&
            stats.shortRouteRunning && stats.shortRouteRunning >= 80 &&
            stats.mediumRouteRunning && stats.mediumRouteRunning >= 80) {
            bonuses.push(0.15);
        }
    
        // Seam threat bonus
        if (stats.speed && stats.speed >= 85 &&
            stats.acceleration && stats.acceleration >= 85 &&
            stats.mediumRouteRunning && stats.mediumRouteRunning >= 80) {
            bonuses.push(0.12);
        }
    
        // YAC threat bonus
        if (stats.speed && stats.speed >= 80 &&
            stats.acceleration && stats.acceleration >= 80 &&
            stats.breakTackle && stats.breakTackle >= 75) {
            bonuses.push(0.10);
        }
    
        // Apply bonuses
        const totalBonus = bonuses.reduce((sum, bonus) => sum + bonus, 0);
        finalScore = finalScore * (1 + totalBonus);
    
        return Math.min(100, finalScore);
    }

    private calculateGunBunchOLFit(stats: PlayerStats, position: Position): number {
        // Position-specific weights
        const weights = {
            passBlock: position === 'LT' || position === 'RT' ? 0.8 : 0.7,  // Tackles need better pass pro
            runBlock: position === 'LT' || position === 'RT' ? 0.2 : 0.3
        };
    
        // Calculate pass blocking score (primary focus)
        const passBlockScore = (
            ((stats.passBlockPower || 0) * 1.2) +     // Power most important
            ((stats.passBlockFinesse || 0) * 1.1) +   // Finesse next
            ((stats.strength || 0) * 0.9) +           // Strength helps
            ((stats.awareness || 0) * 1.0) +          // Awareness for blitzes
            ((stats.acceleration || 0) * 0.8)         // Quick feet
        ) / 5.0;  // Normalized to ~100
    
        // Calculate run blocking score (secondary but important)
        const runBlockScore = (
            ((stats.runBlock || 0) * 1.2) +           // Run blocking base
            ((stats.impactBlocking || 0) * 1.0) +     // Impact blocking
            ((stats.strength || 0) * 0.9) +           // Strength
            ((stats.acceleration || 0) * 0.7)         // Getting to second level
        ) / 3.8;  // Normalized to ~100
    
        // Calculate base score
        let finalScore = (
            passBlockScore * weights.passBlock + 
            runBlockScore * weights.runBlock
        );
    
        // Position-specific bonuses
        const bonuses = [];
    
        switch(position) {
            case 'LT':
                // Elite pass protector bonus
                if (stats.passBlockPower && stats.passBlockPower >= 90 &&
                    stats.passBlockFinesse && stats.passBlockFinesse >= 90) {
                    bonuses.push(0.15); // 15% bonus for elite pass protection
                }
                // Athletic tackle bonus
                if (stats.acceleration && stats.acceleration >= 85 &&
                    stats.agility && stats.agility >= 85) {
                    bonuses.push(0.10); // 10% bonus for athleticism
                }
                break;
    
            case 'RT':
                // Balanced protection bonus
                if (stats.passBlockPower && stats.passBlockPower >= 85 &&
                    stats.passBlockFinesse && stats.passBlockFinesse >= 85 &&
                    stats.runBlock && stats.runBlock >= 80) {
                    bonuses.push(0.12); // 12% bonus for balanced protection
                }
                break;
    
            case 'LG':
            case 'RG':
                // Interior pass protection bonus
                if (stats.passBlockPower && stats.passBlockPower >= 85 &&
                    stats.strength && stats.strength >= 85) {
                    bonuses.push(0.12); // 12% bonus for strong interior protection
                }
                // Pull blocking bonus
                if (stats.acceleration && stats.acceleration >= 80 &&
                    stats.runBlock && stats.runBlock >= 85) {
                    bonuses.push(0.08); // 8% bonus for pull blocking
                }
                break;
    
            case 'C':
                // Smart center bonus
                if (stats.awareness && stats.awareness >= 90 &&
                    stats.passBlockPower && stats.passBlockPower >= 85) {
                    bonuses.push(0.12); // 12% bonus for smart pass protecting center
                }
                // Line call bonus
                if (stats.awareness && stats.awareness >= 90 &&
                    stats.strength && stats.strength >= 85) {
                    bonuses.push(0.10); // 10% bonus for elite awareness and strength
                }
                break;
        }
    
        // Universal bonuses
        // Elite awareness bonus (important for picking up blitzes)
        if (stats.awareness && stats.awareness >= 90) {
            bonuses.push(0.08); // 8% bonus for elite awareness
        }
    
        // Complete blocker bonus
        if (stats.passBlockPower && stats.passBlockPower >= 85 &&
            stats.passBlockFinesse && stats.passBlockFinesse >= 85 &&
            stats.strength && stats.strength >= 85 &&
            stats.awareness && stats.awareness >= 85) {
            bonuses.push(0.10); // 10% bonus for complete blockers
        }
    
        // Apply bonuses
        const totalBonus = bonuses.reduce((sum, bonus) => sum + bonus, 0);
        finalScore = finalScore * (1 + totalBonus);
    
        return Math.min(100, finalScore);
    }

    private calculateNickelDBFit(stats: PlayerStats, position: Position): number {
        // Position-specific weights
        const weights = {
            man: position === 'CB' ? 0.7 : 0.3,      // CBs need better man coverage
            zone: position === 'CB' ? 0.3 : 0.5,     // Safeties need better zone
            physical: position === 'SS' ? 0.3 : 0.2   // SS needs more physical traits
        };
    
        // Calculate man coverage score
        const manScore = (
            ((stats.manCoverage || 0) * 1.3) +     // Man coverage most important
            ((stats.press || 0) * 1.1) +           // Press ability
            ((stats.acceleration || 0) * 1.0) +     // Quick breaks
            ((stats.agility || 0) * 0.9) +         // Change of direction
            ((stats.speed || 0) * 0.8)             // Speed helps everywhere
        ) / 5.1;  // Normalized to ~100
    
        // Calculate zone coverage score
        const zoneScore = (
            ((stats.zoneCoverage || 0) * 1.3) +    // Zone coverage primary
            ((stats.playRecognition || 0) * 1.2) + // Reading plays
            ((stats.awareness || 0) * 1.1) +       // General awareness
            ((stats.acceleration || 0) * 0.8) +    // Getting to spots
            ((stats.jumping || 0) * 0.7)           // Ball skills
        ) / 5.1;  // Normalized to ~100
    
        // Calculate physical/athleticism score
        const physicalScore = (
            ((stats.speed || 0) * 1.1) +           // Speed
            ((stats.acceleration || 0) * 1.0) +     // Acceleration
            ((stats.tackle || 0) * 1.0) +          // Tackling
            ((stats.hitPower || 0) * 0.9) +        // Hit power
            ((stats.strength || 0) * 0.8)          // Strength for press/tackles
        ) / 4.8;  // Normalized to ~100
    
        // Calculate base score
        let finalScore = (
            manScore * weights.man + 
            zoneScore * weights.zone +
            physicalScore * weights.physical
        );
    
        // Position-specific bonuses
        const bonuses = [];
    
        switch(position) {
            case 'CB':
                // Elite man coverage bonus
                if (stats.manCoverage && stats.manCoverage >= 90 &&
                    stats.press && stats.press >= 85) {
                    bonuses.push(0.15); // 15% bonus for elite man coverage
                }
                
                // Press specialist bonus
                if (stats.press && stats.press >= 90 &&
                    stats.strength && stats.strength >= 80) {
                    bonuses.push(0.12); // 12% bonus for press ability
                }
    
                // Mirror technique bonus
                if (stats.agility && stats.agility >= 90 &&
                    stats.acceleration && stats.acceleration >= 90) {
                    bonuses.push(0.10); // 10% bonus for elite movement
                }
                break;
    
            case 'FS':
                // Elite coverage safety bonus
                if (stats.zoneCoverage && stats.zoneCoverage >= 90 &&
                    stats.playRecognition && stats.playRecognition >= 90) {
                    bonuses.push(0.15); // 15% bonus for elite zone coverage
                }
                
                // Range bonus
                if (stats.speed && stats.speed >= 90 &&
                    stats.acceleration && stats.acceleration >= 90) {
                    bonuses.push(0.12); // 12% bonus for elite range
                }
    
                // Ball hawk bonus
                if (stats.jumping && stats.jumping >= 85 &&
                    stats.awareness && stats.awareness >= 85) {
                    bonuses.push(0.10); // 10% bonus for playmaking
                }
                break;
    
            case 'SS':
                // Hybrid safety bonus
                if (stats.zoneCoverage && stats.zoneCoverage >= 85 &&
                    stats.tackle && stats.tackle >= 85 &&
                    stats.hitPower && stats.hitPower >= 85) {
                    bonuses.push(0.15); // 15% bonus for complete SS
                }
                
                // Box safety bonus
                if (stats.tackle && stats.tackle >= 90 &&
                    stats.hitPower && stats.hitPower >= 90) {
                    bonuses.push(0.12); // 12% bonus for elite physical play
                }
    
                // Coverage linebacker bonus
                if (stats.zoneCoverage && stats.zoneCoverage >= 85 &&
                    stats.speed && stats.speed >= 85) {
                    bonuses.push(0.10); // 10% bonus for coverage ability
                }
                break;
        }
    
        // Universal bonuses
        // Elite athleticism bonus
        if (stats.speed && stats.speed >= 95 &&
            stats.acceleration && stats.acceleration >= 95) {
            bonuses.push(0.10); // 10% bonus for exceptional athleticism
        }
    
        // Complete defender bonus
        if (stats.tackle && stats.tackle >= 80 &&
            stats.zoneCoverage && stats.zoneCoverage >= 80 &&
            stats.manCoverage && stats.manCoverage >= 80) {
            bonuses.push(0.08); // 8% bonus for well-rounded skills
        }
    
        // Apply bonuses
        const totalBonus = bonuses.reduce((sum, bonus) => sum + bonus, 0);
        finalScore = finalScore * (1 + totalBonus);
    
        return Math.min(100, finalScore);
    }

    private calculateNickelLBFit(stats: PlayerStats, position: Position): number {
        // Position-specific weights
        const weights = {
            blitz: position === 'MLB' ? 0.5 : 0.6,    // OLBs blitz more
            coverage: position === 'MLB' ? 0.3 : 0.2,  // MLB needs better coverage
            physical: position === 'MLB' ? 0.2 : 0.2   // Physical traits equal
        };
    
        // Calculate blitzing score (crucial for Mug look)
        const blitzScore = (
            ((stats.powerMoves || 0) * 1.2) +      // Power moves primary
            ((stats.finesseMoves || 0) * 1.1) +    // Finesse moves
            ((stats.acceleration || 0) * 1.0) +     // Quick first step
            ((stats.pursuit || 0) * 0.9) +         // Chase down
            ((stats.speed || 0) * 0.8)             // Overall speed
        ) / 5.0;  // Normalized to ~100
    
        // Calculate coverage score
        const coverageScore = (
            ((stats.zoneCoverage || 0) * 1.2) +    // Zone primary
            ((stats.manCoverage || 0) * 1.1) +     // Man coverage
            ((stats.playRecognition || 0) * 1.1) + // Reading plays
            ((stats.awareness || 0) * 0.9) +       // General awareness
            ((stats.speed || 0) * 0.8)             // Coverage speed
        ) / 5.1;  // Normalized to ~100
    
        // Calculate physical/run defense score
        const physicalScore = (
            ((stats.tackle || 0) * 1.2) +          // Tackling primary
            ((stats.hitPower || 0) * 1.1) +        // Hit power
            ((stats.blockShedding || 0) * 1.0) +   // Shed blocks
            ((stats.strength || 0) * 0.9) +        // Base strength
            ((stats.pursuit || 0) * 0.8)           // Chase down
        ) / 5.0;  // Normalized to ~100
    
        // Calculate base score
        let finalScore = (
            blitzScore * weights.blitz + 
            coverageScore * weights.coverage +
            physicalScore * weights.physical
        );
    
        // Position-specific bonuses
        const bonuses = [];
    
        switch(position) {
            case 'LOLB':
            case 'ROLB':
                // Elite pass rusher bonus
                if (stats.powerMoves && stats.powerMoves >= 85 &&
                    stats.finesseMoves && stats.finesseMoves >= 85 &&
                    stats.acceleration && stats.acceleration >= 90) {
                    bonuses.push(0.15); // 15% bonus for elite pass rushing
                }
                
                // Speed rusher bonus
                if (stats.speed && stats.speed >= 90 &&
                    stats.acceleration && stats.acceleration >= 90) {
                    bonuses.push(0.12); // 12% bonus for elite speed rushing
                }
    
                // Complete edge bonus
                if (stats.tackle && stats.tackle >= 85 &&
                    stats.pursuit && stats.pursuit >= 85 &&
                    stats.blockShedding && stats.blockShedding >= 85) {
                    bonuses.push(0.10); // 10% bonus for complete edge player
                }
                break;
    
            case 'MLB':
                // Coverage linebacker bonus
                if (stats.zoneCoverage && stats.zoneCoverage >= 85 &&
                    stats.playRecognition && stats.playRecognition >= 90) {
                    bonuses.push(0.15); // 15% bonus for elite coverage MLB
                }
                
                // Run stopper bonus
                if (stats.tackle && stats.tackle >= 90 &&
                    stats.blockShedding && stats.blockShedding >= 85 &&
                    stats.hitPower && stats.hitPower >= 85) {
                    bonuses.push(0.12); // 12% bonus for elite run stopping
                }
    
                // Field general bonus
                if (stats.awareness && stats.awareness >= 90 &&
                    stats.playRecognition && stats.playRecognition >= 90) {
                    bonuses.push(0.10); // 10% bonus for defensive QB
                }
                break;
        }
    
        // Universal scheme-specific bonuses
        
        // Blitz specialist bonus
        if (stats.acceleration && stats.acceleration >= 90 &&
            ((stats.powerMoves && stats.powerMoves >= 85) || 
             (stats.finesseMoves && stats.finesseMoves >= 85))) {
            bonuses.push(0.10); // 10% bonus for elite blitzing
        }
    
        // Coverage versatility bonus
        if (stats.zoneCoverage && stats.zoneCoverage >= 80 &&
            stats.manCoverage && stats.manCoverage >= 80 &&
            stats.speed && stats.speed >= 85) {
            bonuses.push(0.08); // 8% bonus for coverage versatility
        }
    
        // Complete linebacker bonus
        if (stats.tackle && stats.tackle >= 85 &&
            stats.zoneCoverage && stats.zoneCoverage >= 80 &&
            stats.pursuit && stats.pursuit >= 85 &&
            stats.playRecognition && stats.playRecognition >= 85) {
            bonuses.push(0.10); // 10% bonus for complete LB
        }
    
        // Apply bonuses
        const totalBonus = bonuses.reduce((sum, bonus) => sum + bonus, 0);
        finalScore = finalScore * (1 + totalBonus);
    
        return Math.min(100, finalScore);
    }

    private calculateNickelDLFit(stats: PlayerStats, position: Position): number {
        // Position-specific weights
        const weights = {
            passRush: position === 'DT' ? 0.5 : 0.6,    // Ends need more pass rush
            speed: position === 'DT' ? 0.2 : 0.3,       // Speed for ends
            power: position === 'DT' ? 0.3 : 0.1        // Power for tackles
        };
    
        // Calculate pass rush score (primary focus)
        const passRushScore = (
            ((stats.powerMoves || 0) * 1.2) +       // Power moves primary
            ((stats.finesseMoves || 0) * 1.1) +     // Finesse moves
            ((stats.blockShedding || 0) * 1.0) +    // Shed blocks
            ((stats.acceleration || 0) * 0.9) +     // First step
            ((stats.strength || 0) * 0.8)           // Base strength
        ) / 5.0;  // Normalized to ~100
    
        // Calculate speed/athleticism score
        const speedScore = (
            ((stats.speed || 0) * 1.2) +           // Speed primary
            ((stats.acceleration || 0) * 1.1) +     // Acceleration
            ((stats.agility || 0) * 1.0) +         // Agility
            ((stats.pursuit || 0) * 0.9) +         // Chase down
            ((stats.stamina || 0) * 0.8)           // Endurance
        ) / 5.0;  // Normalized to ~100
    
        // Calculate power/strength score
        const powerScore = (
            ((stats.strength || 0) * 1.2) +        // Strength primary
            ((stats.tackle || 0) * 1.1) +          // Tackling
            ((stats.blockShedding || 0) * 1.0) +   // Shed blocks
            ((stats.hitPower || 0) * 0.9) +        // Impact
            ((stats.pursuit || 0) * 0.8)           // Chase down
        ) / 5.0;  // Normalized to ~100
    
        // Calculate base score
        let finalScore = (
            passRushScore * weights.passRush + 
            speedScore * weights.speed +
            powerScore * weights.power
        );
    
        // Position-specific bonuses
        const bonuses = [];
    
        switch(position) {
            case 'LE':
            case 'RE':
                // Elite speed rusher bonus
                if (stats.speed && stats.speed >= 85 &&
                    stats.acceleration && stats.acceleration >= 90) {
                    bonuses.push(0.15); // 15% bonus for elite speed rushing
                }
                
                // Elite pass rusher bonus
                if (stats.finesseMoves && stats.finesseMoves >= 90 &&
                    stats.powerMoves && stats.powerMoves >= 85) {
                    bonuses.push(0.12); // 12% bonus for elite pass rushing
                }
    
                // Explosive first step bonus
                if (stats.acceleration && stats.acceleration >= 90 &&
                    stats.agility && stats.agility >= 85) {
                    bonuses.push(0.10); // 10% bonus for explosiveness
                }
    
                // Complete edge bonus
                if (stats.pursuit && stats.pursuit >= 85 &&
                    stats.tackle && stats.tackle >= 85 &&
                    stats.blockShedding && stats.blockShedding >= 85) {
                    bonuses.push(0.08); // 8% bonus for complete edge player
                }
                break;
    
            case 'DT':
                // Penetrating DT bonus
                if (stats.acceleration && stats.acceleration >= 85 &&
                    stats.blockShedding && stats.blockShedding >= 90) {
                    bonuses.push(0.15); // 15% bonus for elite penetration
                }
                
                // Pass rushing DT bonus
                if (stats.powerMoves && stats.powerMoves >= 90 &&
                    stats.finesseMoves && stats.finesseMoves >= 80) {
                    bonuses.push(0.12); // 12% bonus for pass rushing DT
                }
    
                // Quick DT bonus
                if (stats.speed && stats.speed >= 80 &&
                    stats.acceleration && stats.acceleration >= 85) {
                    bonuses.push(0.10); // 10% bonus for athletic DT
                }
    
                // Anchor bonus
                if (stats.strength && stats.strength >= 90 &&
                    stats.blockShedding && stats.blockShedding >= 85) {
                    bonuses.push(0.08); // 8% bonus for strong anchor
                }
                break;
        }
    
        // Universal scheme-specific bonuses
        
        // Elite athleticism bonus
        if (stats.speed && stats.speed >= 85 &&
            stats.acceleration && stats.acceleration >= 90 &&
            stats.agility && stats.agility >= 85) {
            bonuses.push(0.10); // 10% bonus for exceptional athleticism
        }
    
        // Complete pass rusher bonus
        if (stats.powerMoves && stats.powerMoves >= 85 &&
            stats.finesseMoves && stats.finesseMoves >= 85 &&
            stats.blockShedding && stats.blockShedding >= 85) {
            bonuses.push(0.10); // 10% bonus for complete pass rusher
        }
    
        // Motor bonus
        if (stats.pursuit && stats.pursuit >= 85 &&
            stats.stamina && stats.stamina >= 85) {
            bonuses.push(0.05); // 5% bonus for high motor
        }
    
        // Apply bonuses
        const totalBonus = bonuses.reduce((sum, bonus) => sum + bonus, 0);
        finalScore = finalScore * (1 + totalBonus);
    
        return Math.min(100, finalScore);
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
            const players = await AppDataSource
                .getRepository(Player)
                .createQueryBuilder('player')
                .innerJoinAndSelect('player.stats', 'stats')
                .innerJoinAndSelect('player.ratings', 'rating')
                .innerJoin('rating.position', 'position')
                .leftJoinAndSelect('player.draftData', 'draftData')
                .where('position.short_label = :positionCode', { positionCode })
                .getMany();
    
            const normalizedScores = await this.normalizePositionScores(players, positionCode as Position);
            const adjustedScores = new Map<number, number>();
            const playerSecondaryPositions = new Map<number, { 
                secondaryPositions: Map<Position, number>, 
                versatilityBonus: number 
            }>();
    
            // First pass: calculate scores and test secondary positions
            for (const [playerId, normalizedScore] of normalizedScores) {
                const player = players.find(p => p.id === playerId);
                if (!player) continue;
    
                const ageMultiplier = this.calculateAgeMultiplier(player.age);
                const devMultiplier = this.calculateDevTraitMultiplier(player.draftData?.developmentTrait ?? 0);
                
                // Store versatility testing results for later use
                const positionInfo = await this.testPositionFlexibility(
                    player, 
                    positionCode as Position
                );
                playerSecondaryPositions.set(playerId, positionInfo);
    
                // Apply all multipliers including versatility
                const adjustedScore = normalizedScore * ageMultiplier * devMultiplier * (1 + positionInfo.versatilityBonus);
                adjustedScores.set(playerId, adjustedScore);
            }
            
            // Now calculate scheme scores with secondary position information
            const schemeScores = await this.calculateSchemeSpecificScores(
                players, 
                positionCode as Position, 
                playerSecondaryPositions
            );
    
            // Re-normalize adjusted scores (but NOT scheme scores)
            const values = Array.from(adjustedScores.values());
            if (values.length === 0) return;

            const mean = values.reduce((a, b) => a + b) / values.length;
            const stdDev = Math.sqrt(
                values.map(x => Math.pow(x - mean, 2))
                    .reduce((a, b) => a + b) / values.length
            );    
    
            const analysisUpdates: PlayerAnalysis[] = [];
    
            for (const [playerId, adjustedScore] of adjustedScores) {
                const player = players.find(p => p.id === playerId);
                if (!player || !player.stats?.[0]) continue;
            
                const baseScore = normalizedScores.get(playerId) || 0;
                const ageMultiplier = this.calculateAgeMultiplier(player.age);
                const devMultiplier = this.calculateDevTraitMultiplier(player.draftData?.developmentTrait ?? 0);
                const positionInfo = playerSecondaryPositions.get(playerId);
            
                let analysis = await this.findByPlayer(playerId);
                if (!analysis) {
                    analysis = new PlayerAnalysis();
                    analysis.player = { id: playerId } as Player;
                }
            
                // Store all the information
                analysis.normalizedScore = baseScore;
                analysis.basePositionTierScore = baseScore;
                analysis.ageMultiplier = ageMultiplier;
                analysis.developmentMultiplier = devMultiplier;
                analysis.versatilityBonus = positionInfo?.versatilityBonus || 0;
                
                // Store secondary positions and their scores
                if (positionInfo) {
                    analysis.secondaryPositions = this.convertToSecondaryPositions(positionInfo.secondaryPositions);
                }
            
                // Calculate final score with all factors
                const zScore = (adjustedScore - mean) / stdDev;
                analysis.adjustedScore = Math.min(100, Math.max(0, 50 + (zScore * 15)));
                
                // Get scheme-specific ratings from schemeScores
                const playerSchemeScores = schemeScores.get(playerId);
                if (playerSchemeScores) {
                    analysis.schemeSpecificRatings = playerSchemeScores.primary;
                }
                
                analysis.positionTier = this.assignTier(analysis.adjustedScore, positionCode as Position);
                analysis.calculatedAt = new Date();
            
                analysisUpdates.push(analysis);
            }
    
            await queryRunner.manager.save(PlayerAnalysis, analysisUpdates);
            await queryRunner.commitTransaction();
    
        } catch (error) {
            await queryRunner.rollbackTransaction();
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

    async recalculateWithSecondaryPositions(): Promise<void> {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
    
        try {
            // Get all player analyses with necessary relations
            const analyses = await queryRunner.manager
                .createQueryBuilder(PlayerAnalysis, 'analysis')
                .leftJoinAndSelect('analysis.player', 'player')
                .leftJoinAndSelect('player.stats', 'stats')
                .leftJoinAndSelect('player.ratings', 'ratings')
                .leftJoinAndSelect('ratings.position', 'position')
                .select([
                    'analysis.id',
                    'analysis.normalizedScore',
                    'analysis.secondaryPositions',  // Explicitly select this
                    'analysis.versatilityBonus',
                    'player.id',
                    'player.firstName',
                    'player.lastName',
                    'stats',
                    'ratings',
                    'position'
                ])
                .getMany();

            // Add debug logging
            console.log(`Found ${analyses.length} analyses`);
            console.log('Sample analysis:', JSON.stringify({
                id: analyses[0]?.id,
                secondaryPositions: analyses[0]?.secondaryPositions
            }, null, 2));
    
            // Add debug logging
            console.log(`Found ${analyses.length} analyses`);
            console.log('Sample analysis secondary positions:', analyses[0]?.secondaryPositions);
    
            // First, collect all scores for each position
            const positionScores = new Map<Position, Map<number, number>>();

            // Initialize maps for all positions
            const allPositions = new Set<Position>();
            for (const analysis of analyses) {
                // Add primary position
                const primaryPosition = analysis.player.ratings?.[0]?.position?.code as Position;
                allPositions.add(primaryPosition);
                
                // Add secondary positions
                if (analysis.secondaryPositions) {
                    for (const secondaryPos of analysis.secondaryPositions) {
                        allPositions.add(secondaryPos.position as Position);
                    }
                }
            }

            // Initialize score maps for all positions
            for (const position of allPositions) {
                positionScores.set(position, new Map());
            }

            // Collect all scores
            for (const analysis of analyses) {
                const primaryPosition = analysis.player.ratings?.[0]?.position?.code as Position;
                
                // Add primary position score
                if (analysis.normalizedScore) {
                    positionScores.get(primaryPosition)?.set(analysis.player.id, analysis.normalizedScore);
                }

                // Add secondary position scores
                if (analysis.secondaryPositions) {
                    for (const secondaryPos of analysis.secondaryPositions) {
                        if (secondaryPos.score) {
                            positionScores.get(secondaryPos.position as Position)?.set(
                                analysis.player.id, 
                                secondaryPos.score
                            );
                        }
                    }
                }
            }
    
            // Re-normalize scores for each position
            const updatedAnalyses: PlayerAnalysis[] = [];
    
            // Debug log for scores
            for (const [position, scores] of positionScores) {
                console.log(`Position ${position} has ${scores.size} scores:`, 
                    Array.from(scores.values()).slice(0, 5)
                );
            }

            // Then normalize scores for each position
            for (const [position, scores] of positionScores) {
                // Convert all scores to numbers and filter out invalid values
                const values = Array.from(scores.values())
                    .map(score => typeof score === 'string' ? parseFloat(score) : score)
                    .filter(score => 
                        score != null && 
                        !isNaN(score) && 
                        score !== undefined
                    );
                
                if (values.length === 0) {
                    console.log(`No valid scores for position ${position}, skipping`);
                    continue;
                }

                const mean = values.reduce((a, b) => a + b) / values.length;
                const stdDev = Math.sqrt(
                    values.map(x => Math.pow(x - mean, 2))
                        .reduce((a, b) => a + b) / values.length
                );

                console.log(`Position ${position} stats:`, {
                    mean: mean.toFixed(2),
                    stdDev: stdDev.toFixed(2),
                    numScores: values.length,
                    sampleScores: values.slice(0, 5).map(s => typeof s === 'number' ? s.toFixed(2) : s)
                });

                // Update scores for each player
                for (const analysis of analyses) {
                    let updated = false;
                    const primaryPosition = analysis.player.ratings?.[0]?.position?.code as Position;

                    // Preserve existing secondary positions if they exist
                    if (analysis.secondaryPositions && analysis.secondaryPositions.length > 0) {
                        const updatedSecondaryPositions = analysis.secondaryPositions.map(secondaryPos => {
                            if (secondaryPos.position === position) {
                                const score = scores.get(analysis.player.id);
                                const numericScore = typeof score === 'string' ? parseFloat(score) : score;
                                
                                if (numericScore !== undefined && numericScore !== null && !isNaN(numericScore)) {
                                    const zScore = (numericScore - mean) / stdDev;
                                    if (isNaN(zScore)) {
                                        console.log(`Warning: NaN zScore for player ${analysis.player.id}`, {
                                            score: numericScore,
                                            mean,
                                            stdDev
                                        });
                                        return secondaryPos; // Keep existing score if calculation fails
                                    }
                                    const normalizedScore = Math.min(100, Math.max(0, 50 + (zScore * 15)));
                                    updated = true;
                                    return {
                                        ...secondaryPos,
                                        score: normalizedScore,
                                        tier: this.assignTier(normalizedScore, position as Position),
                                        isElite: normalizedScore >= 80
                                    };
                                }
                            }
                            return secondaryPos;
                        });
                        
                        if (updated) {
                            analysis.secondaryPositions = updatedSecondaryPositions;
                        }
                    }

                    if (updated) {
                        updatedAnalyses.push(analysis);
                    }
                }
            }
    
            // Before saving, verify the data
            for (const analysis of updatedAnalyses) {
                if (analysis.secondaryPositions) {
                    console.log(`Saving analysis for player ${analysis.player.id}:`, {
                        secondaryPositions: analysis.secondaryPositions.map(pos => ({
                            position: pos.position,
                            score: pos.score
                        }))
                    });
                }
            }

            // Save all updated analyses
            if (updatedAnalyses.length > 0) {
                await queryRunner.manager.save(PlayerAnalysis, updatedAnalyses);
            }
    
            await queryRunner.commitTransaction();
        } catch (error) {
            console.error('Error in recalculateWithSecondaryPositions:', error);
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    private convertToSecondaryPositions(
        secondaryPositions: Map<Position, number>
    ): Array<{position: string; score: number; tier: number; isElite: boolean}> {
        const ELITE_THRESHOLD = 80;
    
        return Array.from(secondaryPositions.entries()).map(([position, score]) => {
            // Normalize the score to 0-100 range
            const normalizedScore = Math.min(100, Math.max(0, score));
            
            return {
                position,
                score: normalizedScore,
                tier: this.assignTier(normalizedScore, position),
                isElite: normalizedScore >= ELITE_THRESHOLD
            };
        });
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