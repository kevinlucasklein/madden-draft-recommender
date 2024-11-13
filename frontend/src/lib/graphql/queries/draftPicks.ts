import { gql } from '@apollo/client/core';

export const CREATE_DRAFT_PICK = gql`
mutation CreateDraftPick(
  $sessionId: Float!,
  $playerId: Float!,
  $position: String!,
  $roundNumber: Int!,
  $pickNumber: Int!
) {
  addDraftPick(
    sessionId: $sessionId,
    playerId: $playerId,
    position: $position,
    roundNumber: $roundNumber,
    pickNumber: $pickNumber
  ) {
    id
    picks {
      id
      roundNumber
      pickNumber
      draftedPosition
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
      }
    }
    rosterNeeds
        }
    }
`;

export const GET_DRAFT_PICKS_BY_SESSION = gql`
    query GetDraftPicksBySession($sessionId: Int!) {
        draftPicksBySession(sessionId: $sessionId) {
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
            }
            roundNumber
            pickNumber
            draftedPosition
            pickedAt
        }
    }
`;