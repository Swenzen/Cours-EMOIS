import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createAction,
  deleteAction,
  getActions,
  initDb,
  updateAction,
} from './src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

initDb();

app.use(express.json({ limit: '200kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/actions', (req, res) => {
  const { status, origin, q } = req.query;
  const actions = getActions({
    status: typeof status === 'string' ? status : undefined,
    origin: typeof origin === 'string' ? origin : undefined,
    q: typeof q === 'string' ? q : undefined,
  });
  res.json({ actions });
});

app.post('/api/actions', (req, res) => {
  const payload = req.body;

  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Payload JSON invalide.' });
  }

  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const description =
    typeof payload.description === 'string' ? payload.description.trim() : '';
  const origin = typeof payload.origin === 'string' ? payload.origin.trim() : '';
  const status = typeof payload.status === 'string' ? payload.status.trim() : 'todo';
  const priority =
    typeof payload.priority === 'string' ? payload.priority.trim() : 'medium';
  const dueDate = typeof payload.dueDate === 'string' ? payload.dueDate.trim() : null;

  if (!title) {
    return res.status(400).json({ error: 'Le titre est obligatoire.' });
  }
  if (!origin) {
    return res.status(400).json({ error: "L'origine est obligatoire." });
  }

  const action = createAction({
    title,
    description,
    origin,
    status,
    priority,
    dueDate,
  });

  res.status(201).json({ action });
});

app.patch('/api/actions/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'ID invalide.' });
  }

  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Payload JSON invalide.' });
  }

  const fields = {
    title: typeof payload.title === 'string' ? payload.title.trim() : undefined,
    description:
      typeof payload.description === 'string' ? payload.description.trim() : undefined,
    origin: typeof payload.origin === 'string' ? payload.origin.trim() : undefined,
    status: typeof payload.status === 'string' ? payload.status.trim() : undefined,
    priority:
      typeof payload.priority === 'string' ? payload.priority.trim() : undefined,
    dueDate: typeof payload.dueDate === 'string' ? payload.dueDate.trim() : undefined,
  };

  const updated = updateAction(id, fields);
  if (!updated) {
    return res.status(404).json({ error: 'Action introuvable.' });
  }

  res.json({ action: updated });
});

app.delete('/api/actions/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'ID invalide.' });
  }

  const ok = deleteAction(id);
  if (!ok) {
    return res.status(404).json({ error: 'Action introuvable.' });
  }

  res.status(204).end();
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Serveur: http://localhost:${port}`);
});
