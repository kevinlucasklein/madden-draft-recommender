import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, Int, Float } from 'type-graphql';
import { Player } from './Player';
import { PlayerRating } from './PlayerRating';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType()
class PositionScore {
    @Field()
    position!: string;

    @Field(() => Float)
    score!: number;
}

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
    @Column({ name: 'suggested_position' })  // This matches your DB column
    suggestedPosition!: string;

    @Field({ nullable: true })
    @Column({ name: 'position_change_recommended' })  // This matches your DB column
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

    @Field(() => String, { nullable: true })  // Make it nullable
    @Column({ name: 'best_position', nullable: true })
    bestPosition?: string;

    @Field(() => GraphQLJSONObject)
    @Column('jsonb', { name: 'position_scores' })
    positionScores!: Record<string, number>;

    @Field(() => Float)
    @Column('decimal', { name: 'normalized_score', precision: 10, scale: 2 })
    normalizedScore!: number;

    @Field(() => [PositionScore], { nullable: true })  // Changed to array of PositionScore
    @Column('jsonb', { name: 'top_positions', nullable: true })
    topPositions?: PositionScore[];

    @Field(() => Int, { nullable: true })  // Make it nullable
    @Column({ name: 'viable_position_count', nullable: true })
    viablePositionCount?: number;

    @Field(() => String, { nullable: true })  // Make it nullable
    @Column({ name: 'primary_archetype', nullable: true })
    primaryArchetype?: string;

    @Field(() => String, { nullable: true })
    @Column({ name: 'secondary_archetype', nullable: true })
    secondaryArchetype?: string;

    @Field(() => [String], { nullable: true })  // Make it nullable
    @Column('text', { array: true, name: 'special_traits', nullable: true })
    specialTraits?: string[];

    @Field(() => [String], { nullable: true })  // Make it nullable
    @Column('text', { array: true, name: 'versatile_positions', nullable: true })
    versatilePositions?: string[];

    @Field(() => GraphQLJSONObject, { nullable: true })
    @Column('jsonb', { name: 'position_ranks', nullable: true })
    positionRanks?: Record<string, number>;
}