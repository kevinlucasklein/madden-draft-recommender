import { gql } from '@apollo/client/core';

// First, let's update the GENERATE_RECOMMENDATIONS query to match your backend
export const GENERATE_RECOMMENDATIONS = gql`
  query GenerateRecommendations(
    $sessionId: Int!,
    $roundNumber: Int!,
    $pickNumber: Int!,
    $limit: Int!,
    $isSnakeDraft: Boolean!
  ) {
    draftRecommendations(
      sessionId: $sessionId,
      roundNumber: $roundNumber,
      pickNumber: $pickNumber,
      limit: $limit,
      isSnakeDraft: $isSnakeDraft
    ) {
      player {
        id
        firstName
        lastName
        analysis {
          adjustedScore
          positionTier
          ageMultiplier
          developmentMultiplier
          schemeFitScore
          versatilityBonus
          secondaryPositions {
            position
            score
            isElite
          }
        }
        ratings {
          position {
            name
            code
          }
          overallRating
        }
        draftData {
          round
          round_pick
          overall_pick
        }
      }
      recommendationScore
      reason
    }
  }
`;