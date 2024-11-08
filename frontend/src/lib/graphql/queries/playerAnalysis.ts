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
        overall
      }
      analysis {
        bestPosition
        normalizedScore
        positionScores
        positionRanks  # Added this line
        primaryArchetype
        secondaryArchetype
        specialTraits
        versatilePositions
      }
    }
  }
`;

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
        positionRanks  # Added this line
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