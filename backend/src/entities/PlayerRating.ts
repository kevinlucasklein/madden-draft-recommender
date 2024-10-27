import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, Int, Float } from 'type-graphql';
import { Player } from './Player';
import { Team } from './Team';
import { Position } from './Position';
import { Archetype } from './Archetype';

@ObjectType()
@Entity('player_ratings')
export class PlayerRating {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'rating_id' })
    id!: number;

    @Field(() => Float)
    @Column({ name: 'overall_rating' })
    overallRating!: number;

    @Field()
    get overall(): number {  // Add a getter for 'overall'
        return this.overallRating;
    }

    @Field()
    @Column({ name: 'iteration_label' })
    iterationLabel!: string;

    @Field(() => Player)
    @ManyToOne(() => Player, (player: Player) => player.ratings)
    @JoinColumn({ name: 'player_id' })
    player!: Player;

    @Field(() => Team, { nullable: true })  // Add nullable: true
    @ManyToOne(() => Team)
    @JoinColumn({ name: 'team_id' })
    team?: Team;

    @Field(() => Position, { nullable: true })  // Add nullable: true
    @ManyToOne(() => Position)
    @JoinColumn({ name: 'position_id' })
    position?: Position;

    @Field(() => Archetype, { nullable: true })  // Add nullable: true
    @ManyToOne(() => Archetype)
    @JoinColumn({ name: 'archetype_id' })
    archetype?: Archetype;
}