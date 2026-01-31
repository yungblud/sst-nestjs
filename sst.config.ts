export default $config({
  app(input) {
    return {
      name: 'aws-nestjs-lambda',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
    };
  },
  async run() {
    const api = new sst.aws.Function('NestjsApi', {
      handler: 'src/lambda.handler',
      url: true, // Lambda Function URL 활성화
      nodejs: {
        esbuild: {
          bundle: true,
          minify: true,
        },
      },
      timeout: '30 seconds',
      memory: '1024 MB',
    });

    return {
      url: api.url,
    };
  },
});
