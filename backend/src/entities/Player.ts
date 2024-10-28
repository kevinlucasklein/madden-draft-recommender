import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, Int } from 'type-graphql';
import { Team } from './Team';
import { Position } from './Position';
import { Archetype } from './Archetype';
import { PlayerRating } from './PlayerRating';
import { PlayerStats } from './PlayerStats';
import { PlayerAbility } from './PlayerAbility';
import { PlayerAnalysis } from './PlayerAnalysis';
import { DraftData } from './DraftData';

@ObjectType()
@Entity('players')
export class Player {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'player_id' })
    id!: number;

    @Field(() => String, { nullable: true })
    @Column({ name: 'first_name', nullable: true })
    firstName?: string;

    @Field(() => String, { nullable: true })
    @Column({ name: 'last_name', nullable: true })
    lastName?: string;

    @Field(() => String, { nullable: true })
    @Column({ nullable: true })
    height?: string;

    @Field(() => Int, { nullable: true })
    @Column({ nullable: true })
    weight?: number;

    @Field(() => String, { nullable: true })
    @Column({ nullable: true })
    college?: string;

    @Field(() => String, { nullable: true })
    @Column({ nullable: true })
    handedness?: string;

    @Field(() => Int, { nullable: true })
    @Column({ nullable: true })
    age?: number;

    @Field(() => Int, { nullable: true })
    @Column({ name: 'jersey_num', nullable: true })
    jerseyNumber?: number;

    @Field(() => Int, { nullable: true })
    @Column({ name: 'years_pro', nullable: true })
    yearsPro?: number;

    // Relations
    @Field(() => Position, { nullable: true })
    position?: Position;

    @Field(() => Team, { nullable: true })
    team?: Team;

    @Field(() => Archetype, { nullable: true })
    archetype?: Archetype;

    @Field(() => [PlayerAbility], { nullable: true })
    @OneToMany(() => PlayerAbility, ability => ability.player)
    abilities?: PlayerAbility[];

    @Field(() => [PlayerRating], { nullable: true })
    @OneToMany(() => PlayerRating, rating => rating.player)
    ratings?: PlayerRating[];

    @Field(() => [PlayerStats], { nullable: true })
    @OneToMany(() => PlayerStats, stats => stats.player)
    stats?: PlayerStats[];

    @Field(() => PlayerAnalysis)
    @OneToOne(() => PlayerAnalysis, analysis => analysis.player)
    analysis!: PlayerAnalysis;

    // Add this to your existing Player entity
    @Field(() => DraftData, { nullable: true })
    @OneToOne(() => DraftData, draftData => draftData.player, { nullable: true })
    draftData?: DraftData;
}