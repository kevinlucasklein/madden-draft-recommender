import { InputType, Field, Int } from 'type-graphql';

@InputType()
export class CreateDraftDataInput {
    @Field(() => Int)
    player_id!: number;

    @Field(() => Int)
    overall_pick!: number;

    @Field(() => Int)
    round!: number;

    @Field(() => Int)
    round_pick!: number;
}

@InputType()
export class UpdateDraftDataInput {
    @Field(() => Int, { nullable: true })
    overall_pick?: number;

    @Field(() => Int, { nullable: true })
    round?: number;

    @Field(() => Int, { nullable: true })
    round_pick?: number;
}