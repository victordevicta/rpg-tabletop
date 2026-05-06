export default () => ({
  port: parseInt(process.env.API_PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID ?? '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
    redirectUri: process.env.DISCORD_REDIRECT_URI ?? '',
    botToken: process.env.DISCORD_BOT_TOKEN ?? '',
  },
  internalApiSecret: process.env.INTERNAL_API_SECRET ?? 'internal-secret',
  youtubeApiKey: process.env.YOUTUBE_API_KEY ?? '',
  spotify: {
    clientId:     process.env.SPOTIFY_CLIENT_ID     ?? '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER ?? 'local',
    s3Endpoint: process.env.S3_ENDPOINT ?? '',
    s3AccessKey: process.env.S3_ACCESS_KEY_ID ?? '',
    s3SecretKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    s3Bucket: process.env.S3_BUCKET ?? 'eldertable',
    s3Region: process.env.S3_REGION ?? 'auto',
    s3PublicUrl: process.env.S3_PUBLIC_URL ?? '',
  },
});
