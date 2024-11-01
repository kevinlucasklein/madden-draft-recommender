import { InputType, Field, Int } from 'type-graphql';

@InputType()
export class CreatePlayerInput {
    @Field()
    firstName!: string;

    @Field()
    lastName!: string;

    @Field()
    height!: string;

    @Field(() => Int)
    weight!: number;

    @Field()
    college!: string;

    @Field()
    handedness!: string;

    @Field(() => Int)
    age!: number;

    @Field(() => Int)
    jerseyNumber!: number;

    @Field(() => Int)
    yearsPro!: number;

    // Optional relations
    @Field(() => Int, { nullable: true })
    positionId?: number;

    @Field(() => Int, { nullable: true })
    teamId?: number;

    @Field(() => Int, { nullable: true })
    archetypeId?: number;
}

@InputType()
export class UpdatePlayerInput {
    @Field(() => String, { nullable: true })
    firstName?: string;

    @Field(() => String, { nullable: true })
    lastName?: string;

    @Field(() => String, { nullable: true })
    height?: string;

    @Field(() => Int, { nullable: true })
    weight?: number;

    @Field(() => String, { nullable: true })
    college?: string;

    @Field(() => String, { nullable: true })
    handedness?: string;

    @Field(() => Int, { nullable: true })
    age?: number;

    @Field(() => Int, { nullable: true })
    jerseyNumber?: number;

    @Field(() => Int, { nullable: true })
    yearsPro?: number;

    // Optional relations
    @Field(() => Int, { nullable: true })
    positionId?: number;

    @Field(() => Int, { nullable: true })
    teamId?: number;

    @Field(() => Int, { nullable: true })
    archetypeId?: number;
}