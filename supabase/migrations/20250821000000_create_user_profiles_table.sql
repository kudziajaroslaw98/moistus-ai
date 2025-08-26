-- Create user profiles table
-- This table stores extended user profile information and preferences
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  location VARCHAR(255),
  website TEXT,
  company VARCHAR(255),
  job_title VARCHAR(255),
  skills TEXT[], -- Array of skill strings
  social_links JSONB DEFAULT '{}'::jsonb, -- {twitter, linkedin, github, discord}
  preferences JSONB DEFAULT '{}'::jsonb, -- All user preferences as nested JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_profile UNIQUE (user_id),
  CONSTRAINT valid_website CHECK (website IS NULL OR website ~ '^https?://'),
  CONSTRAINT valid_social_links CHECK (
    social_links IS NULL OR (
      social_links ? 'twitter' = false OR (social_links->>'twitter') ~ '^https?://(www\.)?twitter\.com/' OR
      social_links ? 'linkedin' = false OR (social_links->>'linkedin') ~ '^https?://(www\.)?linkedin\.com/' OR
      social_links ? 'github' = false OR (social_links->>'github') ~ '^https?://(www\.)?github\.com/' OR
      social_links ? 'discord' = false OR length(social_links->>'discord') > 0
    )
  )
);

-- Create indexes for performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_display_name ON user_profiles(display_name);
CREATE INDEX idx_user_profiles_full_name ON user_profiles(full_name);
CREATE INDEX idx_user_profiles_skills ON user_profiles USING GIN(skills);
CREATE INDEX idx_user_profiles_social_links ON user_profiles USING GIN(social_links);
CREATE INDEX idx_user_profiles_preferences ON user_profiles USING GIN(preferences);

-- Create updated_at trigger
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own profile (one per user)
CREATE POLICY "Users can create own profile" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Public profiles are viewable by everyone (based on privacy settings)
CREATE POLICY "Public profiles viewable by all" ON user_profiles
  FOR SELECT TO authenticated, anon
  USING (
    preferences->>'profile_visibility' = 'public' OR
    preferences->'privacy'->>'profile_visibility' = 'public'
  );

-- Service role has full access
CREATE POLICY "Service role full access" ON user_profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Helper function to get user profile with preferences
CREATE OR REPLACE FUNCTION get_user_profile_with_preferences(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name VARCHAR,
  display_name VARCHAR,
  avatar_url TEXT,
  bio TEXT,
  location VARCHAR,
  website TEXT,
  company VARCHAR,
  job_title VARCHAR,
  skills TEXT[],
  social_links JSONB,
  theme VARCHAR,
  language VARCHAR,
  timezone VARCHAR,
  notifications JSONB,
  privacy JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id,
    up.user_id,
    up.full_name,
    up.display_name,
    up.avatar_url,
    up.bio,
    up.location,
    up.website,
    up.company,
    up.job_title,
    up.skills,
    up.social_links,
    COALESCE(up.preferences->>'theme', 'system')::VARCHAR as theme,
    COALESCE(up.preferences->>'language', 'en')::VARCHAR as language,
    COALESCE(up.preferences->>'timezone', 'UTC')::VARCHAR as timezone,
    COALESCE(up.preferences->'notifications', '{
      "email_comments": true,
      "email_mentions": true,
      "email_reactions": false,
      "push_comments": true,
      "push_mentions": true,
      "push_reactions": false
    }'::jsonb) as notifications,
    COALESCE(up.preferences->'privacy', '{
      "show_email": false,
      "show_location": true,
      "show_company": true,
      "profile_visibility": "public"
    }'::jsonb) as privacy,
    up.created_at,
    up.updated_at
  FROM user_profiles up
  WHERE up.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_profile_with_preferences(UUID) TO authenticated;

-- Function to create default user profile
CREATE OR REPLACE FUNCTION create_user_profile(
  user_uuid UUID,
  user_full_name VARCHAR DEFAULT '',
  user_email VARCHAR DEFAULT ''
)
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  INSERT INTO user_profiles (
    user_id,
    full_name,
    display_name,
    preferences
  ) VALUES (
    user_uuid,
    COALESCE(user_full_name, ''),
    COALESCE(user_full_name, ''),
    '{
      "theme": "system",
      "accentColor": "sky",
      "language": "en", 
      "timezone": "UTC",
      "notifications": {
        "email_comments": true,
        "email_mentions": true,
        "email_reactions": false,
        "push_comments": true,
        "push_mentions": true,
        "push_reactions": false
      },
      "privacy": {
        "show_email": false,
        "show_location": true,
        "show_company": true,
        "profile_visibility": "public"
      }
    }'::jsonb
  )
  RETURNING id INTO profile_id;
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, VARCHAR, VARCHAR) TO authenticated, service_role;

-- Create a trigger to automatically create user profile on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, display_name, preferences)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    '{
      "theme": "system",
      "accentColor": "sky",
      "language": "en",
      "timezone": "UTC", 
      "notifications": {
        "email_comments": true,
        "email_mentions": true,
        "email_reactions": false,
        "push_comments": true,
        "push_mentions": true,
        "push_reactions": false
      },
      "privacy": {
        "show_email": false,
        "show_location": true,
        "show_company": true,
        "profile_visibility": "public"
      }
    }'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Comments for documentation
COMMENT ON TABLE user_profiles IS 'Extended user profile information and preferences';
COMMENT ON COLUMN user_profiles.preferences IS 'JSONB storing user preferences like theme, notifications, privacy settings';
COMMENT ON COLUMN user_profiles.social_links IS 'JSONB storing social media links (twitter, linkedin, github, discord)';
COMMENT ON COLUMN user_profiles.skills IS 'Array of user skills/tags';
COMMENT ON FUNCTION get_user_profile_with_preferences(UUID) IS 'Returns user profile with flattened preferences for easy access';
COMMENT ON FUNCTION create_user_profile(UUID, VARCHAR, VARCHAR) IS 'Creates a new user profile with default preferences';