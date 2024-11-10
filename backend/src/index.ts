import 'reflect-metadata'; // This must be the first import
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { json } from 'body-parser';
import cors from 'cors';
import { buildSchema } from 'type-graphql';
import { Container, ContainerInstance } from 'typedi';
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
import { RosterRequirementResolver } from './resolvers/RosterRequirementResolver';
import { DraftSessionResolver } from './resolvers/DraftSessionResolver';
import { DraftPickResolver } from './resolvers/DraftPickResolver';

interface MyContext {
    requestId: string;
    container: ContainerInstance;  // Changed from typeof Container
    req: express.Request;
    res: express.Response;
}

async function main() {
    try {
        // Initialize TypeORM
        await AppDataSource.initialize();
        console.log('Database connection established');

        const app = express();

        const schema = await buildSchema({
            resolvers: [
                PlayerResolver,
                TeamResolver,
                PositionResolver,
                ArchetypeResolver,
                PlayerRatingResolver,
                PlayerAbilityResolver,
                PlayerStatsResolver,
                PlayerAnalysisResolver,
                RosterRequirementResolver,
                DraftSessionResolver,
                DraftPickResolver,
            ],
            container: ({ context }) => context.container,
            validate: false,
            emitSchemaFile: process.env.NODE_ENV !== 'production',
        });

        const apolloServer = new ApolloServer<MyContext>({  // Add the type parameter here
            schema,
            csrfPrevention: true,
            cache: 'bounded',
            plugins: [
                {
                    requestDidStart: async () => ({
                        async willSendResponse(requestContext) {
                            // Cleanup scoped container
                            Container.reset(requestContext.contextValue.requestId);
                        },
                    }),
                },
            ],
        });

        await apolloServer.start();

        app.use(
            '/graphql',
            cors<cors.CorsRequest>({
                origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
                credentials: true,
            }),
            json(),
            expressMiddleware(apolloServer, {
                context: async ({ req, res }) => {
                    const requestId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
                    const container = Container.of(requestId); // Get scoped container
                    const context = { requestId, container, req, res };
                    container.set('context', context);
                    return context;
                },
            }),
        );

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}/graphql`);
        });
    } catch (error) {
        console.error('Error starting the server:', error);
        process.exit(1);
    }
}

// Add signal handlers for graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

main().catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
});