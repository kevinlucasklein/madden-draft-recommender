import { InputType, Field, Int, Float } from 'type-graphql';

@InputType()
export class CreatePlayerAnalysisInput {
    @Field(() => Int)
    playerId!: number;

    @Field(() => Int, { nullable: true })
    ratingId?: number;

    @Field({ nullable: true })
    playerType?: string;

    @Field(() => Float, { nullable: true })
    originalPositionScore?: number;

    @Field(() => Float, { nullable: true })
    bestPositionScore?: number;

    @Field(() => Float, { nullable: true })
    normalizedScore?: number;

    @Field({ nullable: true })
    suggestedPosition?: string;

    @Field({ nullable: true })
    positionChangeRecommended?: boolean;

    @Field(() => Float, { nullable: true })
    ageAdjustedScore?: number;

    @Field(() => Int, { nullable: true })
    projectedPick?: number;

    @Field(() => Int, { nullable: true })
    rank?: number;
}

@InputType()
export class UpdatePlayerAnalysisInput {
    @Field(() => Int, { nullable: true })
    ratingId?: number;

    @Field({ nullable: true })
    playerType?: string;

    @Field(() => Float, { nullable: true })
    originalPositionScore?: number;

    @Field(() => Float, { nullable: true })
    bestPositionScore?: number;

    @Field(() => Float, { nullable: true })
    normalizedScore?: number;

    @Field({ nullable: true })
    suggestedPosition?: string;

    @Field({ nullable: true })
    positionChangeRecommended?: boolean;

    @Field(() => Float, { nullable: true })
    ageAdjustedScore?: number;

    @Field(() => Int, { nullable: true })
    projectedPick?: number;

    @Field(() => Int, { nullable: true })
    rank?: number;
}