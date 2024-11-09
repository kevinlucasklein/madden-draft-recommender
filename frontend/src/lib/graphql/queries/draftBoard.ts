import { gql } from '@apollo/client/core';

export const GET_DRAFT_BOARD = gql`
  query GetDraftBoard($roundNumber: Int!) {
    getDraftBoard(roundNumber: $roundNumber) {
      round
      picks {
        overall_pick
        round_pick
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
            primaryArchetype
            secondaryArchetype
            viablePositions {
              position
              score
              percentageAboveAverage
            }
            specialTraits
          }
        }
      }
    }
  }
`;

    // Add refresh mutation
    export const REFRESH_DRAFT_BOARD = gql`
        mutation RefreshDraftBoard($roundNumber: Int!) {
            refreshDraftBoard(roundNumber: $roundNumber) {
                round
                picks {
                        overall_pick
                        round_pick
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
                            primaryArchetype
                            secondaryArchetype
                            viablePositions {
                            position
                            score
                            percentageAboveAverage
                            }
                            specialTraits
                        }
                        }
                    }
                    }
                }
                `;

// Add interfaces for type safety
export interface DraftBoardPick {
  overall_pick: number;
  round_pick: number;
  player: {
    id: number;
    firstName: string;
    lastName: string;
    ratings: {
      overallRating: number;
      position: {
        name: string;
        code: string;
      };
    }[];
    analysis: {
      bestPosition: string;
      primaryArchetype: string;
      secondaryArchetype: string;
      viablePositions: {
        position: string;
        score: number;
      }[];
      specialTraits: string[];
    };
    draftData: {
      overall_pick: number;
      round: number;
      round_pick: number;
    };
  };
}

export interface DraftBoardRound {
  round: number;
  picks: DraftBoardPick[];
}