import { ObjectType, Field, Int } from "type-graphql";
import { Player } from "../entities/Player";

@ObjectType()
export class DraftBoardPick {
    @Field(() => Int)
    overall_pick: number;

    @Field(() => Int)
    round_pick: number;

    @Field(() => Player)
    player: Player;
}

@ObjectType()
export class DraftBoardResponse {
    @Field(() => Int)
    round: number;

    @Field(() => [DraftBoardPick])
    picks: DraftBoardPick[];
}