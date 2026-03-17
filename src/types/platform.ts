/**
 * Per-category score and optional note for a platform.
 */
export interface CategoryScore {
  score: number;
  note?: string;
}

/**
 * Category definition (from categories.json).
 * Used for labels and display order.
 */
export interface Category {
  id: string;
  label: string;
  description?: string;
  /** Optional guidance for AI when scoring this category; used when re-populating or when adding new platforms. */
  promptGuidance?: string;
}

/**
 * Platform/vendor product (from platforms.json).
 */
export interface Platform {
  id: string;
  name: string;
  description: string;
  websiteUrl: string;
  tags: string[];
  deploymentModel: string;
  pricingModel: string;
  targetCustomerSize: string;
  categories: Record<string, CategoryScore>;
  strengths: string[];
  weaknesses: string[];
  differentiators: string[];
  notes?: string;
  sourceUrls?: string[];
  updatedAt?: string;
}
