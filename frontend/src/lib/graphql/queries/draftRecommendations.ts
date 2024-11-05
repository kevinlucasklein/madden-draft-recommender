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
      }
      recommendationScore
      reason
    }
  }
`;