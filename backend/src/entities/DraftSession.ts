import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ObjectType, Field, Int } from 'type-graphql';
import { DraftPick } from './DraftPick';
import { DraftRecommendation } from './DraftRecommendation';

@ObjectType()
@Entity('draft_sessions')
export class DraftSession {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'session_id' })
    id!: number;

    @Field()
    @Column({ name: 'created_at' })
    createdAt!: Date;

    @Field(() => Int)
    @Column({ name: 'draft_position' })
    draftPosition!: number;

    @Field()
    @Column()
    status!: string;

    @Field(() => String)
    @Column({ name: 'roster_needs', type: 'jsonb' })
    rosterNeeds!: string;

    @Field(() => [DraftPick], { nullable: true })
    @OneToMany(() => DraftPick, pick => pick.session)
    picks?: DraftPick[];

    @Field(() => [DraftRecommendation], { nullable: true })
    @OneToMany(() => DraftRecommendation, recommendation => recommendation.session)
    recommendations?: DraftRecommendation[];
}