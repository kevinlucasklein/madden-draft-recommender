import 'reflect-metadata'; // This must be the first import
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { json } from 'body-parser';
import cors from 'cors';
import { buildSchema } from 'type-graphql';
import { PlayerResolver } from './resolvers/PlayerResolver';
import { AppDataSource } from './config/database';

async function bootstrap() {
    // Initialize TypeORM
    await AppDataSource.initialize();

    // Create Express app
    const app = express();

    // Build TypeGraphQL schema
    const schema = await buildSchema({
        resolvers: [PlayerResolver],
        validate: false,
        emitSchemaFile: true, // This will generate schema file
    });

    // Create Apollo Server
    const apolloServer = new ApolloServer({
        schema,
    });

    // Start Apollo Server
    await apolloServer.start();

    // Apply middleware
    app.use(
        '/graphql',
        cors<cors.CorsRequest>(),
        json(),
        expressMiddleware(apolloServer)
    );

    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}/graphql`);
    });
}

bootstrap().catch(error => {
    console.error(error);
    process.exit(1);
});