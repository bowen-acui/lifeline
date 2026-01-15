-- 为 analysis_logs 表添加 INSERT 和 DELETE 的 RLS 策略
-- 这样用户可以保存和删除自己的分析历史

-- 如果策略已存在，先删除
DROP POLICY IF EXISTS "Users can insert own analyses" ON analysis_logs;
DROP POLICY IF EXISTS "Users can delete own analyses" ON analysis_logs;

-- 创建 INSERT 策略
CREATE POLICY "Users can insert own analyses" ON analysis_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 创建 DELETE 策略  
CREATE POLICY "Users can delete own analyses" ON analysis_logs
  FOR DELETE USING (auth.uid() = user_id);
