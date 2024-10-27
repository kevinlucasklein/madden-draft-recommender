import { ApolloClient, InMemoryCache } from '@apollo/client/core';

export const client = new ApolloClient({
    uri: 'http://localhost:3000/graphql', // Note the /graphql endpoint
    cache: new InMemoryCache()
});