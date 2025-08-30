import express from 'express';
import cors from 'cors';
import {
  initDatabase,
  getUserByEmail,
  getUserById,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  verifyPassword,
  getUserSession,
  createSession,
  updateSession,
  getSubscriptionPlans,
  getAllSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getUserPurchases,
  createPurchase,
  getSystemStats,
  logLoginAttempt,
  isIPBanned,
  isDatabaseReady
} from './database.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Get client IP helper
const getClientIP = (req: express.Request): string => {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         '127.0.0.1';
};

// Initialize database on startup
initDatabase().then(() => {
  console.log('✅ Database initialized successfully');
}).catch(error => {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
});

// Health check
app.get('/api/health', (req, res) => {
  const dbReady = isDatabaseReady();
  res.json({ 
    status: dbReady ? 'ok' : 'error', 
    database: dbReady ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString() 
  });
});

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = getClientIP(req);

    // Check if IP is banned
    const banned = await isIPBanned(ipAddress);
    if (banned) {
      await logLoginAttempt(ipAddress, email, false);
      return res.status(429).json({ error: 'IP temporariamente bloqueado devido a muitas tentativas falhadas' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      await logLoginAttempt(ipAddress, email, false);
      return res.status(401).json({ error: 'Email não encontrado' });
    }

    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      await logLoginAttempt(ipAddress, email, false);
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    if (user.is_banned) {
      await logLoginAttempt(ipAddress, email, false);
      return res.status(403).json({ error: 'Conta banida' });
    }

    await logLoginAttempt(ipAddress, email, true);

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// User routes
app.get('/api/users', async (req, res) => {
  try {
    const users = await getUsers();
    const usersWithoutPasswords = users.map(({ password_hash, ...user }) => user);
    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const user = await createUser(req.body);
    const { password_hash, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao criar usuário' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await updateUser(req.params.id, req.body);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const { password_hash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await deleteUser(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

// Session routes
app.get('/api/sessions/:userId', async (req, res) => {
  try {
    let session = await getUserSession(req.params.userId);
    if (!session) {
      session = await createSession(req.params.userId);
    }
    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Erro ao buscar sessão' });
  }
});

app.put('/api/sessions/:id', async (req, res) => {
  try {
    const session = await updateSession(req.params.id, req.body);
    res.json(session);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Erro ao atualizar sessão' });
  }
});

// Subscription plan routes
app.get('/api/plans', async (req, res) => {
  try {
    const plans = await getSubscriptionPlans();
    res.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Erro ao buscar planos' });
  }
});

app.get('/api/plans/all', async (req, res) => {
  try {
    const plans = await getAllSubscriptionPlans();
    res.json(plans);
  } catch (error) {
    console.error('Error fetching all plans:', error);
    res.status(500).json({ error: 'Erro ao buscar todos os planos' });
  }
});

app.post('/api/plans', async (req, res) => {
  try {
    const plan = await createSubscriptionPlan(req.body);
    res.status(201).json(plan);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ error: 'Erro ao criar plano' });
  }
});

app.put('/api/plans/:id', async (req, res) => {
  try {
    const plan = await updateSubscriptionPlan(req.params.id, req.body);
    if (!plan) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }
    res.json(plan);
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ error: 'Erro ao atualizar plano' });
  }
});

app.delete('/api/plans/:id', async (req, res) => {
  try {
    await deleteSubscriptionPlan(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ error: 'Erro ao deletar plano' });
  }
});

// Purchase routes
app.get('/api/purchases/:userId', async (req, res) => {
  try {
    const purchases = await getUserPurchases(req.params.userId);
    res.json(purchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ error: 'Erro ao buscar compras' });
  }
});

app.post('/api/purchases', async (req, res) => {
  try {
    const purchase = await createPurchase(req.body);
    res.status(201).json(purchase);
  } catch (error) {
    console.error('Error creating purchase:', error);
    res.status(500).json({ error: 'Erro ao criar compra' });
  }
});

// Stats route
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getSystemStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Database: SQLite (server/terramail.db)`);
  console.log(`🔐 Admin padrão: admin@terramail.com / admin123`);
});