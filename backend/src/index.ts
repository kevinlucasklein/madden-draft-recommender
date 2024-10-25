import 'reflect-metadata'; // This must be the first import
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { json } from 'body-parser';
import cors from 'cors';
import { buildSchema } from 'type-graphql';
import { AppDataSource } from './config/database';

// Import all resolvers
import { PlayerResolver } from './resolvers/PlayerResolver';
import { TeamResolver } from './resolvers/TeamResolver';
import { PositionResolver } from './resolvers/PositionResolver';
import { ArchetypeResolver } from './resolvers/ArchetypeResolver';
import { PlayerRatingResolver } from './resolvers/PlayerRatingResolver';
import { PlayerAbilityResolver } from './resolvers/PlayerAbilityResolver';
import { PlayerStatsResolver } from './resolvers/PlayerStatsResolver';
import { PlayerAnalysisResolver } from './resolvers/PlayerAnalysisResolver';

async function bootstrap() {
    // Initialize TypeORM
    await AppDataSource.initialize();

    // Create Express app
    const app = express();

    // Build TypeGraphQL schema
    const schema = await buildSchema({
        resolvers: [
            PlayerResolver,
            TeamResolver,
            PositionResolver,
            ArchetypeResolver,
            PlayerRatingResolver,
            PlayerAbilityResolver,
            PlayerStatsResolver,
            PlayerAnalysisResolver
        ],
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