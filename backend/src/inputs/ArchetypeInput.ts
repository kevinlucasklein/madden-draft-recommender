import { InputType, Field } from 'type-graphql';

@InputType()
export class CreateArchetypeInput {
    @Field()
    label!: string;
}

@InputType()
export class UpdateArchetypeInput {
    @Field(() => String, { nullable: true })
    label?: string;
}