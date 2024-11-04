import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, Int, Float } from 'type-graphql';
import { Player } from './Player';
import { PlayerRating } from './PlayerRating';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType()
@Entity('player_analysis')
export class PlayerAnalysis {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'analysis_id' })
    id!: number;

    @Field(() => Player)
    @OneToOne(() => Player)
    @JoinColumn({ name: 'player_id' })
    player!: Player;

    @Field(() => PlayerRating, { nullable: true })
    @OneToOne(() => PlayerRating)
    @JoinColumn({ name: 'rating_id' })
    rating?: PlayerRating;

    @Field({ nullable: true })
    @Column({ name: 'player_type' })
    playerType?: string;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'original_position_score' })
    originalPositionScore?: number;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'best_position_score' })
    bestPositionScore?: number;

    @Field()
    @Column('float')
    normalizedScore!: number;

    @Field()
    @Column()
    suggestedPosition!: string;

    @Field(() => GraphQLJSONObject)
    @Column('jsonb')
    positionScores!: Record<string, number>;

    @Field()
    @Column('text')
    strengthsWeaknesses!: string;

    @Field({ nullable: true })
    @Column({ name: 'position_change_recommended' })
    positionChangeRecommended?: boolean;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'age_adjusted_score' })
    ageAdjustedScore?: number;

    @Field(() => Int, { nullable: true })
    @Column({ name: 'projected_pick' })
    projectedPick?: number;

    @Field(() => Int, { nullable: true })
    @Column()
    rank?: number;

    @Field(() => String, { nullable: true })
    @Column({ nullable: true })
    secondaryType?: string;

    @Field(() => [String])
    @Column('text', { array: true, default: [] })
    alternatePositions: string[];

    @Field(() => [String])
    @Column('text', { array: true, default: [] })
    specialTraits: string[];
}