import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
@Entity('archetypes')
export class Archetype {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'archetype_id' })
    id!: number;

    @Field()
    @Column()
    label!: string;

    @Field()
    get name(): string {  // Add a getter for 'name'
        return this.label;
    }
}