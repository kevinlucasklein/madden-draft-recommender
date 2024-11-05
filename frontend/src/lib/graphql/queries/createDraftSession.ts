import { gql } from '@apollo/client/core';

export const CREATE_DRAFT_SESSION = gql`
  mutation CreateDraftSession($input: CreateDraftSessionInput!) {
    createDraftSession(input: $input) {
      id
      draftPosition
      status
      rosterNeeds
    }
  }
`;