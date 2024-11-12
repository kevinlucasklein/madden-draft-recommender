import { InputType, Field, Int } from 'type-graphql';

@InputType()
export class CreateDraftSessionInput {
    @Field(() => Int)
    draftPosition!: number;

    @Field(() => String, { nullable: true })
    rosterNeeds?: string;  // Now optional

    @Field(() => String, { defaultValue: "ACTIVE" })
    status?: string;
}

@InputType()
export class UpdateDraftSessionInput {
    @Field(() => String, { nullable: true })
    status?: string;

    @Field(() => String, { nullable: true })
    rosterNeeds?: string;
}