import { gql } from '@apollo/client/core';

export const GET_ROSTER_REQUIREMENTS = gql`
  query GetRosterRequirements {
    rosterRequirements {
      position
      minimumPlayers
      maximumPlayers
      positionGroup
      isRequired
    }
  }
`;