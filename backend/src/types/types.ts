import { Player } from '../entities/Player';
import { PlayerRating } from '../entities/PlayerRating';

// Existing interfaces
export interface IPlayerRelation {
    player: Player;
}

export interface IRatingRelation {
    rating: PlayerRating;
}

// New interfaces that might be useful
export interface ICacheService {
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    clearCache(): Promise<void>;
}

export interface IPlayerRelations {
    position?: boolean;
    team?: boolean;
    archetype?: boolean;
    abilities?: boolean;
    ratings?: boolean;
    stats?: boolean;
    analysis?: boolean;
    draftData?: boolean;
}