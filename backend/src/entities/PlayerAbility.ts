import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, Int } from 'type-graphql';
import { Player } from './Player';
import { PlayerRating } from './PlayerRating';

@ObjectType()
@Entity('player_abilities')
export class PlayerAbility {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'ability_id' })
    id!: number;

    @Field(() => Player)
    @ManyToOne(() => Player, player => player.abilities)
    @JoinColumn({ name: 'player_id' })
    player!: Player;

    @Field(() => PlayerRating, { nullable: true })
    @ManyToOne(() => PlayerRating)
    @JoinColumn({ name: 'rating_id' })
    rating?: PlayerRating;

    @Field({ nullable: true })
    @Column({ name: 'ability_label' })
    abilityLabel?: string;

    @Field(() => Int)
    @Column({ name: 'ability_order' })
    abilityOrder!: number;
}