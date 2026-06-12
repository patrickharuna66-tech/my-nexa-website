require('dotenv').config();
const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true
}));

if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

const limiter = rateLimit({ windowMs: 15*60*1000, max: 100,
  message: { message: 'Too many requests. Try again later.' } });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 10,
  message: { message: 'Too many login attempts. Wait 15 minutes.' } });

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/customer', require('./routes/customer'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/public',   require('./routes/public'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    message: process.env.NODE_ENV === 'production' && status >= 500
      ? 'An internal error occurred.' : err.message
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`\n NexaHost API on port ${PORT}\n`));
module.exports = app;
