import { InputType, Field, Int, Float } from 'type-graphql';

@InputType()
export class CreatePlayerRatingInput {
    @Field(() => Int)
    playerId!: number;

    @Field(() => Float)
    overallRating!: number;

    @Field()
    iterationLabel!: string;

    @Field(() => Int, { nullable: true })
    teamId?: number;

    @Field(() => Int, { nullable: true })
    positionId?: number;

    @Field(() => Int, { nullable: true })
    archetypeId?: number;
}

@InputType()
export class UpdatePlayerRatingInput {
    @Field(() => Float, { nullable: true })
    overallRating?: number;

    @Field({ nullable: true })
    iterationLabel?: string;

    @Field(() => Int, { nullable: true })
    teamId?: number;

    @Field(() => Int, { nullable: true })
    positionId?: number;

    @Field(() => Int, { nullable: true })
    archetypeId?: number;
}