import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
@Entity('roster_requirements')
export class RosterRequirement {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'requirement_id' })
    id!: number;

    @Field()
    @Column()
    position!: string;

    @Field(() => Int)
    @Column({ name: 'minimum_players' })
    minimumPlayers!: number;

    @Field(() => Int)
    @Column({ name: 'maximum_players' })
    maximumPlayers!: number;

    @Field()
    @Column({ name: 'position_group' })
    positionGroup!: string;

    @Field()
    @Column({ name: 'is_required' })
    isRequired!: boolean;
}