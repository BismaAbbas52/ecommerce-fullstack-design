const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
require('dotenv').config();
const app = express();
app.use(cors());
app.use(express.json());
const DB_FILE = './db.json';
const getDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const saveDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'Invalid token' }); }
};
app.post('/api/auth/register', async (req, res) => {
  try {
    const db = getDB();
    const { name, email, password, isAdmin } = req.body;
    if (db.users.find(u => u.email === email)) return res.status(400).json({ message: 'User exists' });
    const hashed = await bcrypt.hash(password, 10);
    db.users.push({ id: Date.now().toString(), name, email, password: hashed, isAdmin: isAdmin || false });
    saveDB(db);
    res.json({ message: 'User created' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
app.post('/api/auth/login', async (req, res) => {
  try {
    const db = getDB();
    const { email, password } = req.body;
    const user = db.users.find(u => u.email === email);
    const isMatch = await bcrypt.compare(password, user.password);
    const token = jwt.sign({ id: user.id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
app.get('/api/products', (req, res) => {
  const db = getDB();
  let products = db.products;
  const { search, category } = req.query;
  if (search) products = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  if (category && category !== 'All') products = products.filter(p => p.category === category);
  res.json(products);
});
app.get('/api/products/:id', (req, res) => {
  const db = getDB();
  const product = db.products.find(p => p.id === req.params.id);
  res.json(product);
});
app.post('/api/products', auth, (req, res) => {
  const db = getDB();
  const product = { id: Date.now().toString(), ...req.body };
  db.products.push(product);
  saveDB(db);
  res.status(201).json(product);
});
app.put('/api/products/:id', auth, (req, res) => {
  const db = getDB();
  const i = db.products.findIndex(p => p.id === req.params.id);
  if (i === -1) return res.status(404).json({ message: 'Not found' });
  db.products[i] = { ...db.products[i], ...req.body };
  saveDB(db);
  res.json(db.products[i]);
});
app.delete('/api/products/:id', auth, (req, res) => {
  const db = getDB();
  db.products = db.products.filter(p => p.id !== req.params.id);
  saveDB(db);
  res.json({ message: 'Deleted' });
});
app.listen(5000, () => console.log('Server running on port 5000!'));