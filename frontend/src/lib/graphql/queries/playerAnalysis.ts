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
        positionRanks
        primaryArchetype
        secondaryArchetype
        specialTraits
        versatilePositions
        viablePositions {  # Add these fields
          position
          score
          percentageAboveAverage
        }
        viablePositionCount
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
        positionRanks
        topPositions {
          position
          score
        }
        viablePositionCount
        viablePositions {  # Add these fields
          position
          score
          percentageAboveAverage
        }
        primaryArchetype
        secondaryArchetype
        versatilePositions
        specialTraits
      }
    }
  }
`;