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

    // Base Position Analysis
    @Field(() => Float)
    @Column('decimal', { name: 'normalized_score', precision: 10, scale: 2 })
    normalizedScore!: number;

    @Field(() => Float)
    @Column({ name: 'base_position_tier_score' })
    basePositionTierScore!: number;

    @Field(() => Int)
    @Column({ name: 'position_tier' })
    positionTier!: number;

    // Age and Development
    @Field(() => Float)
    @Column({ name: 'age_multiplier' })
    ageMultiplier!: number;

    @Field(() => Float)
    @Column({ name: 'development_multiplier' })
    developmentMultiplier!: number;

    // Scheme Fit and Versatility
    @Field(() => Float)
    @Column({ name: 'scheme_fit_score' })
    schemeFitScore!: number;

    @Field(() => Float)
    @Column({ name: 'versatility_bonus' })
    versatilityBonus!: number;

    // Position Analysis
    @Field(() => [ViablePosition], { nullable: true })
    @Column('jsonb', { name: 'viable_positions' })
    viablePositions?: ViablePosition[];

    @Field(() => GraphQLJSONObject)
    @Column('jsonb', { name: 'position_scores' })
    positionScores!: Record<string, number>;

    // Draft Related
    @Field(() => Int, { nullable: true })
    @Column({ name: 'projected_pick' })
    projectedPick?: number;

    @Field(() => Float)
    @Column({ name: 'pre_draft_composite_score' })
    preDraftCompositeScore!: number;

    // Scheme Specific Ratings
    @Field(() => GraphQLJSONObject)
    @Column('jsonb', { name: 'scheme_specific_ratings' })
    schemeSpecificRatings!: {
        gunBunchFit?: number;
        nickelFit?: number;
    };

    // Position Specific Ratings
    @Field(() => GraphQLJSONObject)
    @Column('jsonb', { name: 'position_specific_ratings' })
    positionSpecificRatings!: Record<string, number>;

    @Field(() => Date, { nullable: true })
    @Column({ name: 'calculated_at', nullable: true })
    calculatedAt?: Date;

    @Field(() => Float, { nullable: true })
    @Column({ name: 'adjusted_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
    adjustedScore: number;

    @Field(() => [SecondaryPosition], { nullable: true })
    @Column({ name: 'secondary_positions', type: 'jsonb', nullable: true })
    secondaryPositions: Array<{
        position: string;
        score: number;
        tier: number;
        isElite: boolean;
    }>;
}

@ObjectType()
class ViablePosition {
    @Field()
    position!: string;

    @Field(() => Float)
    score!: number;

    @Field(() => Float)
    percentageAboveAverage!: number;
}

@ObjectType()
class SecondaryPosition {
    @Field()
    position!: string;

    @Field(() => Float)
    score!: number;

    @Field(() => Int)
    tier!: number;

    @Field(() => Boolean)
    isElite!: boolean;
}
