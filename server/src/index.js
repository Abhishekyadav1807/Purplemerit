require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectDatabase } = require('./config/db');
const siteRoutes = require('./routes/siteRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173'
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'stylesync-server' });
});

app.use('/api', siteRoutes);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Unexpected server error.' });
});

connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
