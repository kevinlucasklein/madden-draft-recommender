import { gql } from '@apollo/client/core';

export const ANALYZE_ALL_PLAYERS = gql`
    mutation AnalyzeAllPlayers {
        analyzeAllPlayers
    }
`;