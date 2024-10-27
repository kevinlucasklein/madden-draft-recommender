import { InputType, Field, Int } from 'type-graphql';

@InputType()
export class CreateDraftPickInput {
    @Field(() => Int)
    sessionId!: number;

    @Field(() => Int)
    playerId!: number;

    @Field(() => Int)
    roundNumber!: number;

    @Field(() => Int)
    pickNumber!: number;

    @Field()
    draftedPosition!: string;
}

@InputType()
export class UpdateDraftPickInput {
    @Field(() => Int, { nullable: true })
    playerId?: number;

    @Field(() => Int, { nullable: true })
    roundNumber?: number;

    @Field(() => Int, { nullable: true })
    pickNumber?: number;

    @Field({ nullable: true })
    draftedPosition?: string;
}