import { InputType, Field } from 'type-graphql';

@InputType()
export class CreatePositionInput {
    @Field()
    code!: string;

    @Field()
    name!: string;

    @Field()
    type!: string;
}

@InputType()
export class UpdatePositionInput {
    @Field({ nullable: true })
    code?: string;

    @Field({ nullable: true })
    name?: string;

    @Field({ nullable: true })
    type?: string;
}