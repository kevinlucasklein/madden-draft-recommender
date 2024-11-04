import { InputType, Field } from 'type-graphql';

@InputType()
export class CreateTeamInput {
    @Field()
    name!: string;

    @Field()
    label!: string;
}

@InputType()
export class UpdateTeamInput {
    @Field({ nullable: true })
    name?: string;

    @Field({ nullable: true })
    label?: string;
}