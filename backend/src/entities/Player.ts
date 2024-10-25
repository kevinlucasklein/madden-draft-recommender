import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne } from 'typeorm';
import { ObjectType, Field, Int } from 'type-graphql';
import { PlayerRating } from './PlayerRating';
import { PlayerAbility } from './PlayerAbility';
import { PlayerStats } from './PlayerStats';
import { PlayerAnalysis } from './PlayerAnalysis';

@ObjectType()
@Entity('players')
export class Player {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'player_id' })
    id!: number;

    @Field()
    @Column({ name: 'first_name' })
    firstName!: string;

    @Field()
    @Column({ name: 'last_name' })
    lastName!: string;

    @Field()
    @Column()
    height!: string;

    @Field(() => Int)
    @Column()
    weight!: number;

    @Field()
    @Column()
    college!: string;

    @Field()
    @Column()
    handedness!: string;

    @Field(() => Int)
    @Column()
    age!: number;

    @Field(() => Int)
    @Column({ name: 'jersey_num' })
    jerseyNumber!: number;

    @Field(() => Int)
    @Column({ name: 'years_pro' })
    yearsPro!: number;

    @Field(() => [PlayerRating], { nullable: true })
    @OneToMany(() => PlayerRating, (rating: PlayerRating) => rating.player)
    ratings?: PlayerRating[];

    @Field(() => [PlayerAbility], { nullable: true })
    @OneToMany(() => PlayerAbility, (ability: PlayerAbility) => ability.player)
    abilities?: PlayerAbility[];

    @Field(() => PlayerStats, { nullable: true })
    @OneToOne(() => PlayerStats, (stats: PlayerStats) => stats.player)
    stats?: PlayerStats;

    @Field(() => PlayerAnalysis, { nullable: true })
    @OneToOne(() => PlayerAnalysis, (analysis: PlayerAnalysis) => analysis.player)
    analysis?: PlayerAnalysis;
}