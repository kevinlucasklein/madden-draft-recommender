import { InputType, Field, Int } from 'type-graphql';

@InputType()
export class CreateRosterRequirementInput {
    @Field()
    position!: string;

    @Field(() => Int)
    minimumPlayers!: number;

    @Field(() => Int)
    maximumPlayers!: number;

    @Field()
    positionGroup!: string;

    @Field()
    isRequired!: boolean;
}

@InputType()
export class UpdateRosterRequirementInput {
    @Field({ nullable: true })
    position?: string;

    @Field(() => Int, { nullable: true })
    minimumPlayers?: number;

    @Field(() => Int, { nullable: true })
    maximumPlayers?: number;

    @Field({ nullable: true })
    positionGroup?: string;

    @Field({ nullable: true })
    isRequired?: boolean;
}