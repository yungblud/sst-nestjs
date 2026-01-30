// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

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
    new sst.aws.Service('SstSampleAwsContainer', {
      dev: {
        command: 'pnpm run start:dev',
      },
    });
  },
});
