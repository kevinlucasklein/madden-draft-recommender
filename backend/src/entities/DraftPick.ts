import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, Int } from 'type-graphql';
import { DraftSession } from './DraftSession';
import { Player } from './Player';

@ObjectType()
@Entity('draft_picks')
export class DraftPick {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'pick_id' })
    id!: number;

    @Field(() => DraftSession)
    @ManyToOne(() => DraftSession, session => session.picks)
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

    @Field()
    @Column({ name: 'drafted_position' })
    draftedPosition!: string;

    @Field()
    @Column({ name: 'picked_at' })
    pickedAt!: Date;
}