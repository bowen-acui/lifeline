import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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

// ==================== 健康检查 ====================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== 获取用户quota ====================
app.get('/api/quota', authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const userEmail = (req as any).user.email;

    // 先尝试获取用户记录
    let { data, error } = await supabase
      .from('users')
      .select('remaining_calls')
      .eq('id', userId)
      .maybeSingle(); // 使用 maybeSingle 避免多条记录错误

    // 如果用户不存在，自动创建
    if (!data) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ 
          id: userId, 
          email: userEmail,
          remaining_calls: 19 
        })
        .select('remaining_calls')
        .single();

      if (insertError) {
        console.error('创建用户记录失败:', insertError);
        throw insertError;
      }

      data = newUser;
    }

    res.json({ 
      remainingCalls: data?.remaining_calls ?? 19,
      userId 
    });
  } catch (error: any) {
    console.error('获取quota失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== AI分析接口 ====================
app.post('/api/analyze', authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const userEmail = (req as any).user.email;
    const { messages, callType, metadata } = req.body;

    // 1. 检查剩余次数（如果用户不存在则创建）
    let { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('remaining_calls')
      .eq('id', userId)
      .maybeSingle();

    // 如果用户不存在，自动创建
    if (!userData) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ 
          id: userId, 
          email: userEmail,
          remaining_calls: 19 
        })
        .select('remaining_calls')
        .single();

      if (insertError) throw insertError;
      userData = newUser;
    }

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
    const { error: updateError } = await supabase
      .from('users')
      .update({ remaining_calls: userData.remaining_calls - 1 })
      .eq('id', userId);

    if (updateError) throw updateError;

    // 4. 记录调用日志
    await supabase.from('call_logs').insert({
      user_id: userId,
      call_type: callType || 'unknown',
      metadata: metadata || {}
    });

    // 5. 如果有分析内容，记录到analysis_logs
    if (callType === 'report' && metadata) {
      await supabase.from('analysis_logs').insert({
        user_id: userId,
        analysis_type: callType,
        input_data: metadata,
        output_data: { content: aiMessage }
      });
    }

    res.json({ 
      message: aiMessage, 
      remainingCalls: userData.remaining_calls - 1 
    });

  } catch (error: any) {
    console.error('AI分析失败:', error);
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
