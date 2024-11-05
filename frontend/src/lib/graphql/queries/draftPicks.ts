import { gql } from '@apollo/client/core';

export const CREATE_DRAFT_PICK = gql`
    mutation CreateDraftPick($input: CreateDraftPickInput!) {
        createDraftPick(input: $input) {
            id
            session {
                id
            }
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