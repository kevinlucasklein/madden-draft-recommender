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

    @Field(() => Float)
    @Column({ name: 'recommendation_score' })
    recommendationScore!: number;

    @Field()
    @Column()
    reason!: string;
}