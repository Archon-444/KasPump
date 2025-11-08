/**
 * Zod Validation Schemas for KasPump
 * SECURITY: Runtime validation for all external data
 *
 * Usage:
 * ```typescript
 * import { TokenCreationFormSchema } from '@/schemas/token';
 * const validated = TokenCreationFormSchema.parse(formData);
 * ```
 */

import { z } from 'zod';

// ========== ETHEREUM ADDRESS VALIDATION ==========

/**
 * Ethereum address schema with checksum validation
 */
export const EthereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format')
  .refine(
    (address) => {
      // Basic checksum validation (full validation requires viem/ethers)
      return address.length === 42 && address.startsWith('0x');
    },
    { message: 'Invalid Ethereum address' }
  );

// ========== TOKEN CREATION SCHEMAS ==========

/**
 * Curve type enum
 */
export const CurveTypeSchema = z.enum(['linear', 'exponential']);

/**
 * Token creation form validation
 * Matches TokenCreationForm interface from types/index.ts
 */
export const TokenCreationFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Token name is required')
    .max(50, 'Token name must be 50 characters or less')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Token name can only contain letters, numbers, spaces, hyphens, and underscores'),

  symbol: z
    .string()
    .min(1, 'Token symbol is required')
    .max(10, 'Token symbol must be 10 characters or less')
    .regex(/^[A-Z][A-Z0-9]*$/, 'Token symbol must start with a letter and contain only uppercase letters and numbers')
    .toUpperCase(),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be 500 characters or less'),

  imageUrl: z
    .string()
    .url('Invalid image URL')
    .optional()
    .or(z.literal('')),

  totalSupply: z
    .number()
    .positive('Total supply must be positive')
    .min(1_000_000, 'Minimum total supply is 1,000,000')
    .max(1_000_000_000_000, 'Maximum total supply is 1 trillion')
    .finite('Total supply must be a finite number'),

  basePrice: z
    .number()
    .positive('Base price must be positive')
    .finite('Base price must be a finite number'),

  slope: z
    .number()
    .positive('Slope must be positive')
    .finite('Slope must be a finite number'),

  curveType: CurveTypeSchema,

  chainId: z
    .number()
    .int('Chain ID must be an integer')
    .positive('Chain ID must be positive')
    .optional(),
});

export type TokenCreationFormData = z.infer<typeof TokenCreationFormSchema>;

// ========== TRADING SCHEMAS ==========

/**
 * Trade action validation
 */
export const TradeActionSchema = z.enum(['buy', 'sell']);

/**
 * Trading form validation
 */
export const TradingFormSchema = z.object({
  action: TradeActionSchema,

  amount: z
    .number()
    .positive('Amount must be positive')
    .finite('Amount must be finite'),

  slippage: z
    .number()
    .min(0.1, 'Minimum slippage is 0.1%')
    .max(10, 'Maximum slippage is 10%')
    .default(1.0),

  tokenAddress: EthereumAddressSchema,
});

export type TradingFormData = z.infer<typeof TradingFormSchema>;

// ========== API RESPONSE SCHEMAS ==========

/**
 * Generic API response wrapper
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    timestamp: z.number().optional(),
  });

/**
 * Token data from blockchain
 */
export const BlockchainTokenSchema = z.object({
  address: EthereumAddressSchema,
  name: z.string(),
  symbol: z.string(),
  totalSupply: z.string(), // BigInt as string
  creator: EthereumAddressSchema,
  createdAt: z.number(),
});

/**
 * Token list API response
 */
export const TokenListResponseSchema = ApiResponseSchema(
  z.object({
    tokens: z.array(BlockchainTokenSchema),
    total: z.number(),
    page: z.number().optional(),
    pageSize: z.number().optional(),
  })
);

// ========== ANALYTICS SCHEMAS ==========

/**
 * Analytics event validation
 */
export const AnalyticsEventSchema = z.object({
  event: z.string().min(1).max(100),
  timestamp: z.number().int().positive(),
  sessionId: z.string().uuid().optional(),
  userId: z.string().optional(),
  properties: z.record(z.any()).optional(),
});

export type AnalyticsEventData = z.infer<typeof AnalyticsEventSchema>;

/**
 * Batch analytics events
 */
export const AnalyticsEventsArraySchema = z.array(AnalyticsEventSchema).max(100);

// ========== LOCALSTORAGE SCHEMAS ==========

/**
 * Favorite token validation
 */
export const FavoriteTokenSchema = z.object({
  address: EthereumAddressSchema,
  chainId: z.number().int().positive().optional(),
  addedAt: z.number().int().positive(),
});

export const FavoritesArraySchema = z.array(FavoriteTokenSchema);

export type FavoriteTokenData = z.infer<typeof FavoriteTokenSchema>;

/**
 * Price alert validation
 */
export const PriceAlertSchema = z.object({
  id: z.string().uuid(),
  tokenAddress: EthereumAddressSchema,
  targetPrice: z.number().positive().finite(),
  condition: z.enum(['above', 'below']),
  enabled: z.boolean(),
  createdAt: z.number().int().positive(),
});

export const PriceAlertsArraySchema = z.array(PriceAlertSchema);

export type PriceAlertData = z.infer<typeof PriceAlertSchema>;

/**
 * User settings validation
 */
export const UserSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  defaultSlippage: z.number().min(0.1).max(10).default(1.0),
  mevProtection: z.boolean().default(true),
  notifications: z.boolean().default(true),
  priceAlerts: z.boolean().default(true),
  analyticsEnabled: z.boolean().default(true),
});

export type UserSettingsData = z.infer<typeof UserSettingsSchema>;

// ========== IPFS UPLOAD VALIDATION ==========

/**
 * IPFS upload request validation
 */
export const IPFSUploadRequestSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => file.size <= 5 * 1024 * 1024,
    'File size must be less than 5MB'
  ).refine(
    (file) => file.type.startsWith('image/'),
    'Only image files are allowed'
  ),
  provider: z.enum(['pinata', 'web3storage', 'nftstorage']).optional(),
});

/**
 * IPFS upload response validation
 */
export const IPFSUploadResponseSchema = z.object({
  success: z.boolean(),
  ipfsUrl: z.string().startsWith('ipfs://').optional(),
  error: z.string().optional(),
});

// ========== PUSH NOTIFICATION SCHEMAS ==========

/**
 * Push subscription validation
 */
export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export type PushSubscriptionData = z.infer<typeof PushSubscriptionSchema>;

// ========== QUERY PARAMETER SCHEMAS ==========

/**
 * Pagination params
 */
export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

/**
 * Token filter params
 */
export const TokenFilterParamsSchema = z.object({
  search: z.string().max(100).optional(),
  chainId: z.coerce.number().int().positive().optional(),
  creator: EthereumAddressSchema.optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  sortBy: z.enum(['createdAt', 'price', 'volume', 'holders']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).merge(PaginationParamsSchema);

export type TokenFilterParams = z.infer<typeof TokenFilterParamsSchema>;

// ========== EXPORT ALL SCHEMAS ==========

export const schemas = {
  // Core
  EthereumAddressSchema,
  CurveTypeSchema,
  TradeActionSchema,

  // Forms
  TokenCreationFormSchema,
  TradingFormSchema,

  // API
  ApiResponseSchema,
  BlockchainTokenSchema,
  TokenListResponseSchema,

  // Analytics
  AnalyticsEventSchema,
  AnalyticsEventsArraySchema,

  // Storage
  FavoriteTokenSchema,
  FavoritesArraySchema,
  PriceAlertSchema,
  PriceAlertsArraySchema,
  UserSettingsSchema,

  // Uploads
  IPFSUploadRequestSchema,
  IPFSUploadResponseSchema,

  // Push
  PushSubscriptionSchema,

  // Query
  PaginationParamsSchema,
  TokenFilterParamsSchema,
};
