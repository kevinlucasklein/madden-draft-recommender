import { Resolver, Query, Arg, Int, Mutation } from "type-graphql";
import { DraftData } from "../entities/DraftData";
import { AppDataSource } from '../config/database';

@Resolver(DraftData)
export class DraftDataResolver {
  @Query(() => [DraftData])
  async draftData(): Promise<DraftData[]> {
    try {
      return await AppDataSource.getRepository(DraftData).find({ 
        relations: ["player"],
        order: { overall_pick: 'ASC' }
      });
    } catch (error) {
      console.error('Error fetching draft data:', error);
      throw new Error('Failed to fetch draft data');
    }
  }

  @Query(() => DraftData, { nullable: true })
  async draftDataById(@Arg("player_id", () => Int) player_id: number): Promise<DraftData | null> {
    try {
      return await AppDataSource.getRepository(DraftData).findOne({ 
        where: { player_id }, 
        relations: ["player"] 
      });
    } catch (error) {
      console.error('Error fetching draft data by ID:', error);
      return null;
    }
  }

  @Mutation(() => DraftData)
  async createDraftData(
    @Arg("player_id", () => Int) player_id: number,
    @Arg("overall_pick", () => Int) overall_pick: number,
    @Arg("round", () => Int) round: number,
    @Arg("round_pick", () => Int) round_pick: number,
  ): Promise<DraftData> {
    try {
      const repository = AppDataSource.getRepository(DraftData);
      
      // Check if draft data already exists for this player
      const existing = await repository.findOne({ where: { player_id } });
      if (existing) {
        throw new Error('Draft data already exists for this player');
      }

      const draftData = repository.create({
        player_id,
        overall_pick,
        round,
        round_pick,
      });

      return await repository.save(draftData);
    } catch (error) {
      console.error('Error creating draft data:', error);
      throw error;
    }
  }
}