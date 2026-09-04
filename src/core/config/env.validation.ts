import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  APP_NAME: Joi.string().default('nero-bank-backend'),
  API_PREFIX: Joi.string().default('api'),
  API_VERSION: Joi.string().default('1'),
  CORS_ORIGIN: Joi.string().default('*'),

  // Database
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USERNAME: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().allow('').required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_LOGGING: Joi.boolean().default(false),
  DATABASE_SYNCHRONIZE: Joi.boolean().default(false),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  // Rate limiting
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),

  // Sentry
  SENTRY_DSN: Joi.string().allow('').optional(),

  // Turnkey
  TURNKEY_API_BASE_URL: Joi.string().uri().required(),
  TURNKEY_API_PUBLIC_KEY: Joi.string().required(),
  TURNKEY_API_PRIVATE_KEY: Joi.string().required(),
  TURNKEY_ORGANIZATION_ID: Joi.string().required(),

  // Safe
  SAFE_API_BASE_URL: Joi.string().uri().required(),
  SAFE_TX_SERVICE_URL: Joi.string().uri().required(),
  SAFE_API_KEY: Joi.string().required(),
  // Optional - @safe-global/protocol-kit's RPC endpoint. Defaults to PIMLICO_API_BASE_URL
  // (already this project's sole chain-RPC access point) when unset.
  SAFE_RPC_URL: Joi.string().uri().optional(),

  // Pimlico
  PIMLICO_API_BASE_URL: Joi.string().uri().required(),
  PIMLICO_API_KEY: Joi.string().required(),
  PIMLICO_SPONSORSHIP_POLICY_ID: Joi.string().allow('').optional(),
  GAS_SPONSORSHIP_USER_DAILY_CAP_WEI: Joi.string().allow('').optional(),
  GAS_SPONSORSHIP_USER_MONTHLY_CAP_WEI: Joi.string().allow('').optional(),

  // 1inch
  ONEINCH_API_BASE_URL: Joi.string().uri().required(),
  ONEINCH_API_KEY: Joi.string().required(),

  // LiFi
  LIFI_API_BASE_URL: Joi.string().uri().required(),
  LIFI_API_KEY: Joi.string().required(),
  LIFI_INTEGRATOR_ID: Joi.string().allow('').optional(),

  //swap
  SWAP_FEE_PERCENTAGE: Joi.number().min(0).max(3).default(0),
  SWAP_FEE_RECIPIENT_ADDRESS: Joi.string().allow('').optional(),

  // Sumsub
  SUMSUB_API_BASE_URL: Joi.string().uri().required(),
  SUMSUB_APP_TOKEN: Joi.string().required(),
  SUMSUB_SECRET_KEY: Joi.string().required(),

  // Rain
  RAIN_API_BASE_URL: Joi.string().uri().required(),
  RAIN_API_KEY: Joi.string().required(),
  RAIN_WEBHOOK_SECRET: Joi.string().required(),

  // Baanx
  BAANX_API_BASE_URL: Joi.string().uri().required(),
  BAANX_API_KEY: Joi.string().required(),
  BAANX_WEBHOOK_SECRET: Joi.string().required(),

  // SendGrid (guardian/recovery transactional email)
  SENDGRID_API_BASE_URL: Joi.string().uri().required(),
  SENDGRID_API_KEY: Joi.string().required(),
  SENDGRID_FROM_EMAIL: Joi.string().email().required(),
  SENDGRID_FROM_NAME: Joi.string().default('Nero Bank'),
  SENDGRID_GUARDIAN_INVITATION_TEMPLATE_ID: Joi.string().allow('').optional(),
  SENDGRID_RECOVERY_REQUESTED_TEMPLATE_ID: Joi.string().allow('').optional(),
  SENDGRID_RECOVERY_COMPLETED_TEMPLATE_ID: Joi.string().allow('').optional(),

  // Relayer (guardian recovery gas sponsorship - submits SocialRecoveryModule
  // transactions on behalf of guardians/users, who never pay gas themselves)
  RELAYER_PRIVATE_KEY: Joi.string().required(),
  RELAYER_CHAIN_ID: Joi.number().default(8453),

  // Safe SocialRecoveryModule (guardian recovery execution)
  SAFE_RECOVERY_MODULE_ADDRESS: Joi.string().allow('').optional(),
});
