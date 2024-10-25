import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
@Entity('teams')
export class Team {
    @Field(() => Int)
    @PrimaryGeneratedColumn({ name: 'team_id' })
    id!: number;

    @Field({ nullable: true })  // Add nullable: true
    @Column()
    name!: string;

    @Field({ nullable: true })  // Add nullable: true
    @Column()
    label!: string;
}