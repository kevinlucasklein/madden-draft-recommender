import { gql } from '@apollo/client/core';

export const GENERATE_RECOMMENDATIONS = gql`
  mutation GenerateRecommendations($input: GenerateRecommendationsInput!) {
    generateRecommendations(input: $input) {
      id
      player {
        id
        firstName
        lastName
        ratings {
          overallRating
          position {
            name
            code
          }
        }
        draftData {
          overall_pick
          round
          round_pick
        }
        analysis {
          bestPosition
          normalizedScore
          positionScores
          primaryArchetype
          secondaryArchetype
          specialTraits
          viablePositions {
            position
            score
            percentageAboveAverage
          }
          viablePositionCount
        }
      }
      recommendationScore
      reason
      suggestedPositions {  # Optional: Add if you want to include position suggestions
        position
        score
        reason
      }
    }
  }
`;