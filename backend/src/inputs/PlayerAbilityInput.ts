import { InputType, Field, Int } from 'type-graphql';

@InputType()
export class CreatePlayerAbilityInput {
    @Field(() => Int)
    playerId!: number;

    @Field(() => Int, { nullable: true })
    ratingId?: number;

    @Field()
    abilityLabel!: string;

    @Field(() => Int)
    abilityOrder!: number;
}

@InputType()
export class UpdatePlayerAbilityInput {
    @Field(() => String, { nullable: true })
    abilityLabel?: string;

    @Field(() => Int, { nullable: true })
    abilityOrder?: number;

    @Field(() => Int, { nullable: true })
    ratingId?: number;
}