import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PromptStack } from './promptstack.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const ps = new PromptStack();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  ps.reload();
  next();
});

app.get('/api/prompts', (_req, res) => {
  res.json(ps.getAll());
});

app.post('/api/prompts', (req, res) => {
  const { name, description, category, content, tags, model } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  const prompt = ps.create(
    name, 
    description || '', 
    category || 'general', 
    content || '',
    tags || []
  );
  
  // If model is provided, update the first version's metadata
  if (model && prompt.versions[0]) {
    prompt.versions[0].metadata.model = model;
    ps.saveData();
  }
  
  res.json(prompt);
});

app.get('/api/prompts/:id', (req, res) => {
  const prompt = ps.get(req.params.id);
  if (!prompt) {
    res.status(404).json({ error: 'Prompt not found' });
    return;
  }
  res.json(prompt);
});

app.delete('/api/prompts/:id', (req, res) => {
  const success = ps.delete(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Prompt not found' });
    return;
  }
  res.json({ success: true });
});

app.post('/api/prompts/:id/versions', (req, res) => {
  const { content, notes, model } = req.body;
  const version = ps.addVersion(req.params.id, content || '', { notes, model });
  if (!version) {
    res.status(404).json({ error: 'Prompt not found' });
    return;
  }
  res.json(version);
});

app.post('/api/prompts/:id/versions/:version/rate', (req, res) => {
  const { rating } = req.body;
  const success = ps.rateVersion(req.params.id, parseInt(req.params.version), rating);
  if (!success) {
    res.status(400).json({ error: 'Failed to rate version' });
    return;
  }
  res.json({ success: true });
});

app.get('/api/prompts/:id/compare/:v1/:v2', (req, res) => {
  const result = ps.compare(req.params.id, parseInt(req.params.v1), parseInt(req.params.v2));
  if (!result) {
    res.status(404).json({ error: 'Could not compare versions' });
    return;
  }
  res.json(result);
});

app.get('/api/search', (req, res) => {
  const query = (req.query.q as string) || '';
  res.json(ps.search(query));
});

app.get('/api/stats', (_req, res) => {
  res.json(ps.stats());
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`PromptStack GUI running on http://0.0.0.0:${PORT}`);
});
