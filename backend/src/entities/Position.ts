import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
@Entity('positions')
export class Position {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'position_id' })
    id!: number;

    @Field()
    @Column()
    code!: string;

    @Field()
    @Column({ name: 'short_label' })
    name!: string;  // This will be queried as 'name'

    @Field()
    @Column({ name: 'position_type' })
    type!: string;  // This will be queried as 'type'
}