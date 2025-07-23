-- Create subscription plans table
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  stripe_price_id_monthly VARCHAR(255),
  stripe_price_id_yearly VARCHAR(255),
  features JSONB DEFAULT '[]'::jsonb,
  limits JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user subscriptions table
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment history table
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id),
  stripe_payment_intent_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON subscription_plans
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Insert default subscription plans (without Stripe IDs - add these later)
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features, limits)
VALUES
  (
    'free',
    'Free',
    'Perfect for personal use',
    0,
    0,
    '["3 mind maps", "50 nodes per map", "Basic export", "Community support"]'::jsonb,
    '{"mindMaps": 3, "nodesPerMap": 50, "aiSuggestions": 10}'::jsonb
  ),
  (
    'pro',
    'Pro',
    'For professionals and teams',
    12,
    120,
    '["Unlimited mind maps", "Unlimited nodes", "AI-powered suggestions", "Real-time collaboration", "Priority support", "Advanced export options"]'::jsonb,
    '{"mindMaps": -1, "nodesPerMap": -1, "aiSuggestions": -1}'::jsonb
  ),
  (
    'enterprise',
    'Enterprise',
    'For large teams and organizations',
    29,
    290,
    '["Everything in Pro", "SSO integration", "Advanced analytics", "Dedicated support", "Custom integrations", "SLA guarantee"]'::jsonb,
    '{"mindMaps": -1, "nodesPerMap": -1, "aiSuggestions": -1}'::jsonb
  );

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Subscription plans are readable by everyone
CREATE POLICY "Subscription plans are viewable by everyone" ON subscription_plans
  FOR SELECT TO authenticated, anon
  USING (is_active = true);

-- Users can only view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Service role can manage all subscriptions
CREATE POLICY "Service role can manage subscriptions" ON user_subscriptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own payment history
CREATE POLICY "Users can view own payment history" ON payment_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Service role can manage payment history
CREATE POLICY "Service role can manage payment history" ON payment_history
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to get user's active subscription
CREATE OR REPLACE FUNCTION get_user_subscription(user_uuid UUID)
RETURNS TABLE (
  plan_name VARCHAR,
  plan_display_name VARCHAR,
  status VARCHAR,
  features JSONB,
  limits JSONB,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.name,
    sp.display_name,
    us.status,
    sp.features,
    sp.limits,
    us.current_period_end,
    us.cancel_at_period_end
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = user_uuid
    AND us.status IN ('active', 'trialing')
  ORDER BY us.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_subscription(UUID) TO authenticated;
