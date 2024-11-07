import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, Int, Float } from 'type-graphql';
import { Player } from './Player';
import { PlayerRating } from './PlayerRating';

@ObjectType()
@Entity('player_stats')
export class PlayerStats {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'stat_id' })
    id!: number;

    @Field(() => Player)
    @OneToOne(() => Player)
    @JoinColumn({ name: 'player_id' })
    player!: Player;

    @Field(() => PlayerRating, { nullable: true })
    @OneToOne(() => PlayerRating)
    @JoinColumn({ name: 'rating_id' })
    rating?: PlayerRating;

    @Field(() => Float, { nullable: true })
    @Column({ type: 'float', nullable: true })
    acceleration?: number;

    @Field(() => Float, { nullable: true })
    @Column({ type: 'float', nullable: true })
    agility?: number;

    @Field(() => Float, { nullable: true })
    @Column({ type: 'float', nullable: true })
    jumping?: number;

    @Field(() => Float, { nullable: true })
    @Column({ type: 'float', nullable: true })
    stamina?: number;

    @Field(() => Float, { nullable: true })
    @Column({ type: 'float', nullable: true })
    strength?: number;

    @Field(() => Float, { nullable: true })
    @Column({ type: 'float', nullable: true })
    awareness?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'bcvision', nullable: true })
    bcvision!: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'block_shedding', type: 'float', nullable: true })
    blockShedding?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'break_sack', type: 'float', nullable: true })
    breakSack?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'break_tackle', type: 'float', nullable: true })
    breakTackle?: number;

    @Field(() => Float, { nullable: true })
    @Column({ type: 'float', nullable: true })
    carrying?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'catch_in_traffic', type: 'float', nullable: true })
    catchInTraffic?: number;

    @Field(() => Float, { nullable: true })
    @Column({ type: 'float', nullable: true })
    catching?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'change_of_direction', type: 'float', nullable: true })
    changeOfDirection?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'deep_route_running', type: 'float', nullable: true })
    deepRouteRunning?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'finesse_moves', type: 'float', nullable: true })
    finesseMoves?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'hit_power', type: 'float', nullable: true })
    hitPower?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'impact_blocking', type: 'float', nullable: true })
    impactBlocking?: number;

    @Field(() => Float, { nullable: true })
    @Column({ type: 'float', nullable: true })
    injury?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'juke_move', type: 'float', nullable: true })
    jukeMove?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'kick_accuracy', type: 'float', nullable: true })
    kickAccuracy?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'kick_power', type: 'float', nullable: true })
    kickPower?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'kick_return', type: 'float', nullable: true })
    kickReturn?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'lead_block', type: 'float', nullable: true })
    leadBlock?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'man_coverage', type: 'float', nullable: true })
    manCoverage?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'medium_route_running', type: 'float', nullable: true })
    mediumRouteRunning?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'pass_block', type: 'float', nullable: true })
    passBlock?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'pass_block_finesse', type: 'float', nullable: true })
    passBlockFinesse?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'pass_block_power', type: 'float', nullable: true })
    passBlockPower?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'play_action', type: 'float', nullable: true })
    playAction?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'play_recognition', type: 'float', nullable: true })
    playRecognition?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'power_moves', type: 'float', nullable: true })
    powerMoves?: number;

    @Field(() => Float, { nullable: true })
    @Column({ type: 'float', nullable: true })
    press?: number;

    @Field(() => Float, { nullable: true })
    @Column({ type: 'float', nullable: true })
    pursuit?: number;

    @Field(() => Float, { nullable: true })
    @Column({ type: 'float', nullable: true })
    release?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'run_block', type: 'float', nullable: true })
    runBlock?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'run_block_finesse', type: 'float', nullable: true })
    runBlockFinesse?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'run_block_power', type: 'float', nullable: true })
    runBlockPower?: number;

    @Field({ nullable: true })
    @Column({ name: 'running_style', type: 'varchar', length: 50, nullable: true })
    runningStyle?: string;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'short_route_running', type: 'float', nullable: true })
    shortRouteRunning?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'spectacular_catch', type: 'float', nullable: true })
    spectacularCatch?: number;

    @Field(() => Float, { nullable: true })
    @Column({ type: 'float', nullable: true })
    speed?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'spin_move', type: 'float', nullable: true })
    spinMove?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'stiff_arm', type: 'float', nullable: true })
    stiffArm?: number;

    @Field(() => Float, { nullable: true })
    @Column({ type: 'float', nullable: true })
    tackle?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'throw_accuracy_deep', type: 'float', nullable: true })
    throwAccuracyDeep?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'throw_accuracy_mid', type: 'float', nullable: true })
    throwAccuracyMid?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'throw_accuracy_short', type: 'float', nullable: true })
    throwAccuracyShort?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'throw_on_the_run', type: 'float', nullable: true })
    throwOnTheRun?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'throw_power', type: 'float', nullable: true })
    throwPower?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'throw_under_pressure', type: 'float', nullable: true })
    throwUnderPressure?: number;

    @Field(() => Float, { nullable: true })
    @Column({ type: 'float', nullable: true })
    toughness?: number;

    @Field(() => Float, { nullable: true })
    @Column({ type: 'float', nullable: true })
    trucking?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'zone_coverage', type: 'float', nullable: true })
    zoneCoverage?: number;

    // Add the index signature directly to the class
    [key: string]: number | string | Player | PlayerRating | undefined;

    }

    export interface PlayerStatsIndexed extends PlayerStats {
        [key: string]: number | string | Player | PlayerRating | undefined;
    }