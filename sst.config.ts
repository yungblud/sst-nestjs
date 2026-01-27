/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'aws-nestjs-container',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
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
