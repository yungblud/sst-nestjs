// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
const dotenv = require('dotenv');

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
dotenv.config();

export default $config({
  app(input) {
    return {
      name: 'aws-nestjs-container',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
      providers: {
        aws: {
          region: process.env.AWS_REGION,
          profile: process.env.AWS_PROFILE,
        },
      },
    };
  },
  async run() {
    const vpc = new sst.aws.Vpc(process.env.AWS_VPC);
    const cluster = new sst.aws.Cluster(process.env.AWS_CLUSTER, { vpc });
    new sst.aws.Service(process.env.AWS_SERVICE, {
      cluster,
      dev: {
        command: 'pnpm run start:dev',
      },
    });
  },
});
