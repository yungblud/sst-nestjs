import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverlessExpress from '@vendia/serverless-express';
import { APIGatewayProxyHandler } from 'aws-lambda';
import express from 'express';
import { AppModule } from './app.module';

let cachedServer: ReturnType<typeof serverlessExpress>;

async function bootstrapServer() {
  if (!cachedServer) {
    const expressApp = express();
    const nestApp = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );

    nestApp.enableCors();
    await nestApp.init();

    cachedServer = serverlessExpress({ app: expressApp });
  }
  return cachedServer;
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
export const handler: APIGatewayProxyHandler = async (event, context) => {
  const server = await bootstrapServer();
  return await server(event, context, () => {
    console.log('cleanup');
  });
};
