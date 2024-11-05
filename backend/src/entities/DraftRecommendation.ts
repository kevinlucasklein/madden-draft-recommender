import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, Int, Float } from 'type-graphql';
import { DraftSession } from './DraftSession';
import { Player } from './Player';

@ObjectType()
@Entity('draft_recommendations')
export class DraftRecommendation {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'recommendation_id' })
    id!: number;

    @Field(() => DraftSession)
    @ManyToOne(() => DraftSession, session => session.recommendations)
    @JoinColumn({ name: 'session_id' })
    session!: DraftSession;

    @Field(() => Player)
    @ManyToOne(() => Player)
    @JoinColumn({ name: 'player_id' })
    player!: Player;

    @Field(() => Int)
    @Column({ name: 'round_number' })
    roundNumber!: number;

    @Field(() => Int)
    @Column({ name: 'pick_number' })
    pickNumber!: number;

    @Field(() => Float)  // Make sure this is Float, not Int
    @Column({ 
        name: 'recommendation_score', 
        type: 'float',  // Explicitly set the column type
        precision: 10,  // Add precision
        scale: 6       // Add scale for decimal places
    })
    recommendationScore!: number;

    @Field()
    @Column()
    reason!: string;
}