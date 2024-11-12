import { ObjectType, Field } from 'type-graphql';
import { Player } from '../entities/Player';

@ObjectType()
export class PositionAssignment {
    @Field()
    position!: string;

    @Field(() => Player)
    player!: Player;

    @Field()
    score!: number;

    @Field()
    isSecondaryPosition!: boolean;
}

@ObjectType()
export class PositionNeed {
    @Field()
    needed!: number;

    @Field()
    priority!: number;
}

@ObjectType()
export class OptimizedRosterResponse {
    @Field(() => [[String, [PositionAssignment]]])
    optimizedRoster!: [string, PositionAssignment[]][];

    @Field(() => [[String, PositionNeed]])
    positionNeeds!: [string, PositionNeed][];
}