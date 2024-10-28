import { Resolver, Query, Mutation, Arg, Int, InputType, Field, FieldResolver, Root } from 'type-graphql';
import { Player } from '../entities/Player';
import { PlayerRating } from '../entities/PlayerRating';
import { AppDataSource } from '../config/database';
import { MoreThan } from 'typeorm';


@InputType()
class CreatePlayerInput {
    @Field()
    firstName!: string;

    @Field()
    lastName!: string;

    @Field()
    height!: string;

    @Field(() => Int)
    weight!: number;

    @Field()
    college!: string;

    @Field()
    handedness!: string;

    @Field(() => Int)
    age!: number;

    @Field(() => Int)
    jerseyNumber!: number;

    @Field(() => Int)
    yearsPro!: number;

    // Optional relations
    @Field(() => Int, { nullable: true })
    positionId?: number;

    @Field(() => Int, { nullable: true })
    teamId?: number;

    @Field(() => Int, { nullable: true })
    archetypeId?: number;
}

@InputType()
class UpdatePlayerInput {
    @Field(() => String, { nullable: true })
    firstName?: string;

    @Field(() => String, { nullable: true })
    lastName?: string;

    @Field(() => String, { nullable: true })
    height?: string;

    @Field(() => Int, { nullable: true })
    weight?: number;

    @Field(() => String, { nullable: true })
    college?: string;

    @Field(() => String, { nullable: true })
    handedness?: string;

    @Field(() => Int, { nullable: true })
    age?: number;

    @Field(() => Int, { nullable: true })
    jerseyNumber?: number;

    @Field(() => Int, { nullable: true })
    yearsPro?: number;

    // Optional relations
    @Field(() => Int, { nullable: true })
    positionId?: number;

    @Field(() => Int, { nullable: true })
    teamId?: number;

    @Field(() => Int, { nullable: true })
    archetypeId?: number;
}

@Resolver(of => Player)
export class PlayerResolver {
    @Query(() => [Player])
    async players() {
        const playerRepository = AppDataSource.getRepository(Player);
        return await playerRepository.find({
            relations: {
                ratings: {
                    position: true,
                    team: true,
                    archetype: true
                },
                abilities: true,
                stats: true,
                draftData: true
            },
            order: {
                id: 'ASC'
            }
        });
    }

    // Field resolvers for nested relations
    @FieldResolver()
    async position(@Root() player: Player) {
        const rating = await AppDataSource.getRepository(PlayerRating)
            .findOne({
                where: { player: { id: player.id } },
                relations: ['position'],
                order: { id: 'DESC' }
            });
        return rating?.position;
    }

    @FieldResolver()
    async team(@Root() player: Player) {
        const rating = await AppDataSource.getRepository(PlayerRating)
            .findOne({
                where: { player: { id: player.id } },
                relations: ['team'],
                order: { id: 'DESC' }
            });
        return rating?.team;
    }

    @FieldResolver()
    async archetype(@Root() player: Player) {
        const rating = await AppDataSource.getRepository(PlayerRating)
            .findOne({
                where: { player: { id: player.id } },
                relations: ['archetype'],
                order: { id: 'DESC' }
            });
        return rating?.archetype;
    }

    @Query(() => Player, { nullable: true })
    async player(
        @Arg('id', () => Int, { nullable: true }) id?: number
    ) {
        const playerRepository = AppDataSource.getRepository(Player);

        try {
            const whereCondition = id ? { id } : { id: MoreThan(0) };
            
            return await playerRepository.findOne({
                where: whereCondition,
                relations: {
                    position: true,
                    team: true,
                    archetype: true,
                    abilities: true,
                    ratings: true,
                    stats: true,
                    analysis: true
                },
                order: {
                    id: 'ASC'
                }
            });
        } catch (error) {
            console.error('Error finding player:', error);
            return null;
        }
    }

    @Mutation(() => Player)
    async createPlayer(
        @Arg('input') input: CreatePlayerInput
    ) {
        const playerRepository = AppDataSource.getRepository(Player);
        const player = playerRepository.create(input);
        return await playerRepository.save(player);
    }

    @Mutation(() => Player)
    async updatePlayer(
        @Arg('id', () => Int) id: number,
        @Arg('input') input: UpdatePlayerInput
    ) {
        const playerRepository = AppDataSource.getRepository(Player);
        const player = await playerRepository.findOneOrFail({ where: { id } });
        Object.assign(player, input);
        return await playerRepository.save(player);
    }

    @Mutation(() => Boolean)
    async deletePlayer(
        @Arg('id', () => Int) id: number
    ) {
        const playerRepository = AppDataSource.getRepository(Player);
        const result = await playerRepository.delete(id);
        return result.affected ? true : false;
    }
}

