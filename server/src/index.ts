import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const DAILY_QUOTA = Number(process.env.DAILY_QUOTA || 19);
const QUOTA_TIMEZONE = process.env.QUOTA_TIMEZONE || 'Asia/Shanghai';

// Supabase客户端（使用service role key可以绕过RLS）
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

function getQuotaDateString() {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: QUOTA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function ensureDailyQuota(userId: string, userEmail: string | undefined | null) {
  const today = getQuotaDateString();
  let { data: userData, error: fetchError } = await supabase
    .from('users')
    .select('remaining_calls, last_quota_reset')
    .eq('id', userId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (!userData) {
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: userEmail,
        remaining_calls: DAILY_QUOTA,
        last_quota_reset: today
      })
      .select('remaining_calls, last_quota_reset')
      .single();

    if (insertError) throw insertError;
    userData = newUser;
  }

  if (userData.last_quota_reset !== today) {
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        remaining_calls: DAILY_QUOTA,
        last_quota_reset: today
      })
      .eq('id', userId)
      .select('remaining_calls, last_quota_reset')
      .single();

    if (updateError) throw updateError;
    userData = updatedUser;
  }

  return userData;
}

async function decrementRemainingCalls(userId: string, currentRemaining: number, retries = 2) {
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({ remaining_calls: currentRemaining - 1 })
    .eq('id', userId)
    .eq('remaining_calls', currentRemaining)
    .select('remaining_calls')
    .maybeSingle();

  if (updateError) throw updateError;
  if (updatedUser) return updatedUser.remaining_calls;
  if (retries <= 0) throw new Error('扣减次数失败，请稍后重试');

  const { data: refreshedUser, error: refreshError } = await supabase
    .from('users')
    .select('remaining_calls')
    .eq('id', userId)
    .single();

  if (refreshError || !refreshedUser) throw refreshError;
  if (refreshedUser.remaining_calls <= 0) {
    throw new Error('调用次数已用完');
  }

  return decrementRemainingCalls(userId, refreshedUser.remaining_calls, retries - 1);
}

// ==================== 认证中间件 ====================
async function authenticateUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }

  const token = authHeader.substring(7);
  
  // 验证JWT token
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: '登录已过期' });
  }

  // 将用户信息挂载到req上
  (req as any).user = user;
  next();
}

// 可选认证（埋点允许匿名）
async function attachUserIfPresent(req: express.Request, _res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    (req as any).user = null;
    return next();
  }

  const token = authHeader.substring(7);
  const { data: { user } } = await supabase.auth.getUser(token);
  (req as any).user = user ?? null;
  next();
}

// ==================== 健康检查 ====================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== 埋点事件 ====================
app.post('/api/events', attachUserIfPresent, async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      eventName,
      eventType,
      page,
      component,
      domPath,
      elementText,
      elementTag,
      elementId,
      elementClass,
      position,
      metadata,
      sessionId,
      anonId,
      clientTimestamp,
      pageUrl,
      referrer
    } = req.body || {};

    if (!eventName || !eventType || !sessionId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    if (!user && !anonId) {
      return res.status(400).json({ error: '缺少匿名标识' });
    }

    await supabase.from('user_events').insert({
      user_id: user?.id ?? null,
      anon_id: anonId ?? null,
      session_id: sessionId,
      event_name: eventName,
      event_type: eventType,
      page,
      component,
      dom_path: domPath,
      element_text: elementText,
      element_tag: elementTag,
      element_id: elementId,
      element_class: elementClass,
      position: position ?? null,
      metadata: metadata ?? null,
      page_url: pageUrl ?? null,
      referrer: referrer ?? null,
      user_agent: req.headers['user-agent'] || null,
      client_timestamp: clientTimestamp ?? null
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('埋点写入失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 获取用户quota ====================
app.get('/api/quota', authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const userEmail = (req as any).user.email;

    const data = await ensureDailyQuota(userId, userEmail);

    res.json({ 
      remainingCalls: data?.remaining_calls ?? DAILY_QUOTA,
      userId 
    });
  } catch (error: any) {
    console.error('获取quota失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== AI分析接口 ====================
app.post('/api/analyze', authenticateUser, async (req, res) => {
  const startAt = Date.now();
  const requestIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
  const userAgent = req.headers['user-agent'] || '';
  try {
    const userId = (req as any).user.id;
    const userEmail = (req as any).user.email;
    const { messages, callType, metadata } = req.body;
    const messageCount = Array.isArray(messages) ? messages.length : 0;
    const totalChars = Array.isArray(messages)
      ? messages.reduce((sum, m) => sum + (m?.content?.length || 0), 0)
      : 0;

    // 1. 检查并刷新每日剩余次数（如有需要）
    let userData = await ensureDailyQuota(userId, userEmail);

    if (userData.remaining_calls <= 0) {
      return res.status(403).json({ 
        error: '调用次数已用完',
        message: '请关注我的小红书/公众号私信获取更多次数'
      });
    }

    // 2. 调用DeepSeek API
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API错误: ${response.statusText}`);
    }

    const result = await response.json();
    const aiMessage = result.choices[0].message.content;

    // 3. 扣除次数
    const remainingCallsAfter = await decrementRemainingCalls(userId, userData.remaining_calls);

    // 4. 记录调用日志
    await supabase.from('call_logs').insert({
      user_id: userId,
      call_type: callType || 'unknown',
      metadata: {
        ...(metadata || {}),
        messageCount,
        totalChars,
        ip: requestIp,
        userAgent,
        durationMs: Date.now() - startAt,
        success: true,
        deducted: 1
      }
    });

    res.json({ 
      message: aiMessage, 
      remainingCalls: remainingCallsAfter 
    });

  } catch (error: any) {
    console.error('AI分析失败:', error);
    try {
      const userId = (req as any).user?.id;
      if (userId) {
        await supabase.from('call_logs').insert({
          user_id: userId,
          call_type: req.body?.callType || 'unknown',
          metadata: {
            ...(req.body?.metadata || {}),
            messageCount: Array.isArray(req.body?.messages) ? req.body.messages.length : 0,
            totalChars: Array.isArray(req.body?.messages)
              ? req.body.messages.reduce((sum: number, m: any) => sum + (m?.content?.length || 0), 0)
              : 0,
            ip: requestIp,
            userAgent,
            durationMs: Date.now() - startAt,
            success: false,
            error: error?.message || 'unknown'
          }
        });
      }
    } catch (logError) {
      console.error('记录调用日志失败:', logError);
    }
    res.status(500).json({ error: error.message });
  }
});

// ==================== 调用记录（扣分明细） ====================
app.get('/api/usage', authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const { data, error } = await supabase
      .from('call_logs')
      .select('id, call_type, created_at, metadata')
      .eq('user_id', userId)
      .eq('metadata->>success', 'true')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ logs: data || [] });
  } catch (error: any) {
    console.error('获取调用记录失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 记录用户输入 ====================
app.post('/api/log-input', authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { inputData } = req.body;

    await supabase.from('user_inputs').insert({
      user_id: userId,
      input_data: inputData
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('记录输入失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 用户反馈 ====================
app.post('/api/feedback', authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { feedbackType, targetId, content } = req.body;

    await supabase.from('user_feedback').insert({
      user_id: userId,
      feedback_type: feedbackType, // 'like' | 'dislike'
      target_id: targetId,
      content
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('提交反馈失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 管理员：手动添加次数 ====================
app.post('/api/admin/add-quota', async (req, res) => {
  try {
    const { adminToken, userEmail, addCount } = req.body;

    // 简单验证（生产环境应该用更安全的方式）
    if (adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(403).json({ error: '无权限' });
    }

    // 根据email查找用户
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('id, remaining_calls')
      .eq('email', userEmail)
      .single();

    if (fetchError || !userData) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 增加次数
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        remaining_calls: userData.remaining_calls + addCount 
      })
      .eq('id', userData.id);

    if (updateError) throw updateError;

    res.json({ 
      success: true, 
      newTotal: userData.remaining_calls + addCount 
    });

  } catch (error: any) {
    console.error('添加次数失败:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
