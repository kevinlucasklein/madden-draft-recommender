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
          id
          normalizedScore
          positionScores
          viablePositions {
            position
            score
            percentageAboveAverage
          }
          basePositionTierScore
          positionTier
          ageMultiplier
          developmentMultiplier
          schemeFitScore
          versatilityBonus
          preDraftCompositeScore
          adjustedScore
          secondaryPositions {
            position
            score
            tier
            isElite
          }
        }
      }
      recommendationScore
      reason
    }
  }
`;