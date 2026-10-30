const express = require('express');
const { Firestore } = require('@google-cloud/firestore');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const db = new Firestore();
const todos = db.collection('todos');

// Open route, used for load testing
app.get('/health', (req, res) => res.send('ok'));

// Every /api route requires the PIN header
app.use('/api', (req, res, next) => {
  if (req.get('X-Access-Pin') !== process.env.APP_PIN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// CREATE
app.post('/api/todos', async (req, res) => {
  try {
    const title = (req.body.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Title required' });
    const data = { title, done: false, createdAt: Date.now() };
    const ref = await todos.add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// READ
app.get('/api/todos', async (req, res) => {
  try {
    const snap = await todos.orderBy('createdAt', 'desc').limit(100).get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// UPDATE
app.put('/api/todos/:id', async (req, res) => {
  try {
    const changes = {};
    if (typeof req.body.done === 'boolean') changes.done = req.body.done;
    if (typeof req.body.title === 'string') changes.title = req.body.title.trim();
    await todos.doc(req.params.id).update(changes);
    res.json({ updated: req.params.id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// DELETE
app.delete('/api/todos/:id', async (req, res) => {
  try {
    await todos.doc(req.params.id).delete();
    res.json({ deleted: req.params.id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log('Running on ' + PORT));
