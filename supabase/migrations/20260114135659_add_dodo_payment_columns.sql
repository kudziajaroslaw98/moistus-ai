-- Migration: Add Dodo Payments columns for Stripe to Dodo migration
-- This migration adds new columns alongside existing Stripe columns
-- Run cleanup migration after migration is complete to remove Stripe columns

-- Add Dodo columns to subscription_plans
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS dodo_product_id TEXT;

-- Add Dodo columns to user_subscriptions
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS dodo_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS dodo_customer_id TEXT;

-- Add unique constraint for Dodo subscription ID (for upsert operations)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_dodo_subscription_id
ON user_subscriptions(dodo_subscription_id)
WHERE dodo_subscription_id IS NOT NULL;

-- Add Dodo columns to payment_history
ALTER TABLE payment_history
ADD COLUMN IF NOT EXISTS dodo_payment_id TEXT;

-- Create index for Dodo customer lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_dodo_customer_id
ON user_subscriptions(dodo_customer_id)
WHERE dodo_customer_id IS NOT NULL;

-- Comment on new columns
COMMENT ON COLUMN subscription_plans.dodo_product_id IS 'Dodo Payments product ID';
COMMENT ON COLUMN user_subscriptions.dodo_subscription_id IS 'Dodo Payments subscription ID';
COMMENT ON COLUMN user_subscriptions.dodo_customer_id IS 'Dodo Payments customer ID';
COMMENT ON COLUMN payment_history.dodo_payment_id IS 'Dodo Payments payment/transaction ID';
