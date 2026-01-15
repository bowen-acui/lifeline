-- ==================== 用户埋点事件 ====================
CREATE TABLE IF NOT EXISTS user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  anon_id TEXT,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  page TEXT,
  component TEXT,
  dom_path TEXT,
  element_text TEXT,
  element_tag TEXT,
  element_id TEXT,
  element_class TEXT,
  position JSONB,
  metadata JSONB,
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  client_timestamp TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own events" ON user_events;
CREATE POLICY "Users can view own events" ON user_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_anon_id ON user_events(anon_id);
CREATE INDEX IF NOT EXISTS idx_user_events_session_id ON user_events(session_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event_name ON user_events(event_name);
CREATE INDEX IF NOT EXISTS idx_user_events_event_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON user_events(created_at DESC);

