import { InputType, Field, Int, Float } from 'type-graphql';

@InputType()
export class CreateDraftRecommendationInput {
    @Field(() => Int)
    sessionId!: number;

    @Field(() => Int)
    playerId!: number;

    @Field(() => Int)
    roundNumber!: number;

    @Field(() => Int)
    pickNumber!: number;

    @Field(() => Float)
    recommendationScore!: number;

    @Field()
    reason!: string;
}

@InputType()
export class UpdateDraftRecommendationInput {
    @Field(() => Float, { nullable: true })
    recommendationScore?: number;

    @Field({ nullable: true })
    reason?: string;
}

@InputType()
export class GenerateRecommendationsInput {
    @Field(() => Int)
    sessionId: number;

    @Field(() => Int)
    roundNumber: number;

    @Field(() => Int)
    pickNumber: number;

    @Field(() => Boolean)
    isSnakeDraft: boolean;

    @Field(() => Int)
    limit: number;
}
