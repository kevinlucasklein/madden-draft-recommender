import { ObjectType, Field, Int } from "type-graphql";
import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from "typeorm";
import { Player } from "./Player";

@ObjectType()
@Entity('draft_data')  // Add table name
export class DraftData {
  @Field(() => Int)
  @PrimaryColumn()
  player_id: number;

  @Field(() => Int)
  @Column()
  overall_pick: number;

  @Field(() => Int)
  @Column()
  round: number;

  @Field(() => Int)
  @Column()
  round_pick: number;

  @Field(() => Int)
  @Column({ name: 'development_trait', type: 'int', default: 0 })
  developmentTrait: number;

  @Field(() => Player)
  @OneToOne(() => Player, player => player.draftData)
  @JoinColumn({ name: "player_id" })
  player: Player;
}