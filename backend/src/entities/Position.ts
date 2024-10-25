import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
@Entity('positions')
export class Position {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'position_id' })
    id!: number;

    @Field({ nullable: true })
    @Column()
    code!: string;

    @Field({ nullable: true })
    @Column({ name: 'short_label' })
    shortLabel!: string;

    @Field({ nullable: true })
    @Column({ name: 'position_type' })
    positionType!: string;
}