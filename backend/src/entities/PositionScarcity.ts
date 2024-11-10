import { ObjectType, Field, Int, Float } from 'type-graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { DraftSession } from './DraftSession';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';


@ObjectType()
@Entity('position_scarcity')
export class PositionScarcity {
    @Field(() => Int)
    @PrimaryGeneratedColumn()
    id!: number;

    @Field(() => DraftSession)
    @ManyToOne(() => DraftSession)
    @JoinColumn({ name: 'session_id' })
    session!: DraftSession;

    @Field()
    @Column()
    position!: string;

    @Field(() => Int)
    @Column({ name: 'round_number' })
    roundNumber!: number;

    @Field(() => Int)
    @Column({ name: 'pick_number' })
    pickNumber!: number;

    // Tier tracking
    @Field(() => GraphQLJSONObject)
    @Column('jsonb', { name: 'tier_data' })
    tierData!: {
        tier1Total: number;
        tier1Remaining: number;
        tier2Total: number;
        tier2Remaining: number;
        tier3Total: number;
        tier3Remaining: number;
    };

    // Current scarcity metrics
    @Field(() => GraphQLJSONObject)
    @Column('jsonb', { name: 'scarcity_metrics' })
    scarcityMetrics!: {
        currentScarcityMultiplier: number;
        positionImportance: number;
        schemeSpecificValue: number;
    };

    // Position run tracking
    @Field(() => GraphQLJSONObject)
    @Column('jsonb', { name: 'run_metrics' })
    runMetrics!: {
        lastPicksAtPosition: number;    // How many of last X picks were this position
        projectedRunLikelihood: number; // 0-1 chance of position run
        averagePicksBetweenSelection: number;
    };

    @Field(() => GraphQLJSONObject)
    @Column('jsonb', { name: 'scheme_impact' })
    schemeImpact!: {
        gunBunchValue?: number;  // How valuable for Gun Bunch
        nickelValue?: number;    // How valuable for Nickel
        positionPriority: number // Overall scheme priority
    };

    @Field()
    @Column({ name: 'last_updated' })
    lastUpdated!: Date;
}