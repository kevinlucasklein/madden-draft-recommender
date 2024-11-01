import { Resolver, Query } from 'type-graphql';
import { PlayerAbility } from '../entities/PlayerAbility';
import { AppDataSource } from '../config/database';
import { Service } from 'typedi';

@Service()
@Resolver(of => PlayerAbility)
export class PlayerAbilityResolver {
    @Query(() => [PlayerAbility])
    async playerAbilities() {
        const playerAbilityRepository = AppDataSource.getRepository(PlayerAbility);
        return await playerAbilityRepository.find({
            relations: {
                player: true,
                rating: true
            }
        });
    }
}