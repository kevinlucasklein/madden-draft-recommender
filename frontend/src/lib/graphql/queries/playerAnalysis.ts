import { gql } from '@apollo/client/core';

export const GET_PLAYERS_WITH_ANALYSIS = gql`
  query GetPlayersWithAnalysis {
    players {
      id
      firstName
      lastName
      age
      position {
        name
      }
      ratings {
        overall  # Changed from overallRating to overall
      }
      analysis {
        bestPosition
        normalizedScore
        positionScores
        primaryArchetype
        secondaryArchetype
        specialTraits
        versatilePositions
      }
    }
  }
`;

// For a single player with more detail:
export const GET_PLAYER_ANALYSIS = gql`
  query GetPlayerAnalysis($playerId: ID!) {
    player(id: $playerId) {
      id
      firstName
      lastName
      age
      position {
        name
      }
      ratings {
        overall
      }
      analysis {
        bestPosition
        normalizedScore
        positionScores
        topPositions {
          position
          score
        }
        viablePositionCount
        primaryArchetype
        secondaryArchetype
        versatilePositions
        specialTraits
      }
    }
  }
`;