import { InputType, Field, Int } from 'type-graphql';

@InputType()
export class CreateDraftSessionInput {
    @Field(() => Int)
    draftPosition!: number;

    @Field(() => String, { defaultValue: "ACTIVE" })
    status?: string;

    @Field(() => String)
    rosterNeeds!: string;  // This will be a JSON string
}

@InputType()
export class UpdateDraftSessionInput {
    @Field(() => String, { nullable: true })
    status?: string;

    @Field(() => String, { nullable: true })
    rosterNeeds?: string;
}