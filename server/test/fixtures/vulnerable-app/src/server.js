// Intentionally vulnerable fixture used by the scanner integration tests. Never deploy.
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
const pool = new Pool();

const MAILGUN_API_KEY = 'key-3ax6xnjp29jd6fds4gc373sgvjxteol0';
const JWT_SECRET = 'super-secret-jwt-key';

app.get('/orders/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM orders WHERE id = ' + req.params.id);
  res.json(result.rows);
});

app.get('/ping', (req, res) => {
  exec('ping -c 1 ' + req.query.host, (error, stdout) => {
    res.send(stdout);
  });
});

app.get('/files', (req, res) => {
  const content = fs.readFileSync(path.join(__dirname, 'uploads', req.query.name));
  res.send(content);
});

app.get('/greet', (req, res) => {
  res.send('<h1>Hello ' + req.query.name + '</h1>');
});

app.post('/calc', express.json(), (req, res) => {
  res.json({ value: eval(req.body.expression) });
});

app.get('/token', (req, res) => {
  const token = jwt.sign({ user: req.query.user }, JWT_SECRET);
  const decoded = jwt.verify(req.query.token, JWT_SECRET, { algorithms: ['none', 'HS256'] });
  res.json({ token, decoded, key: MAILGUN_API_KEY.length });
});

app.listen(3000);
