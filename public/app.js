const ORIGIN_LABELS = {
  retour_experience: "Retour d'expérience (REX)",
  cartographie_risques: 'Cartographie des risques',
  audit: 'Audit',
  incident: 'Incident / Non-conformité',
  autre: 'Autre',
};

const STATUS_LABELS = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé',
};

const PRIORITY_LABELS = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
};

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return iso;
  }
}

function badge(text, variant) {
  const cls = ['badge'];
  if (variant) cls.push(`badge--${variant}`);
  return `<span class="${cls.join(' ')}">${escapeHtml(text)}</span>`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function api(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || `Erreur HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function setStatus(text, ok) {
  const el = document.querySelector('#connectionStatus');
  el.textContent = text;
  el.style.borderColor = ok ? 'rgba(124, 92, 255, 0.55)' : 'rgba(255, 77, 109, 0.55)';
}

function buildQuery() {
  const origin = document.querySelector('#filterOrigin').value;
  const status = document.querySelector('#filterStatus').value;
  const q = document.querySelector('#filterQ').value.trim();

  const params = new URLSearchParams();
  if (origin) params.set('origin', origin);
  if (status) params.set('status', status);
  if (q) params.set('q', q);

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function renderStats(actions) {
  const total = actions.length;
  const byStatus = actions.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    },
    { todo: 0, in_progress: 0, done: 0 }
  );

  const stats = document.querySelector('#stats');
  stats.textContent = `${total} action(s) — ${STATUS_LABELS.todo}: ${byStatus.todo} • ${STATUS_LABELS.in_progress}: ${byStatus.in_progress} • ${STATUS_LABELS.done}: ${byStatus.done}`;
}

function renderList(actions) {
  const list = document.querySelector('#list');

  if (!actions.length) {
    list.innerHTML = `<div class="card">Aucune action avec ces filtres.</div>`;
    return;
  }

  list.innerHTML = actions
    .map((a) => {
      const originLabel = ORIGIN_LABELS[a.origin] || a.origin;
      const statusLabel = STATUS_LABELS[a.status] || a.status;
      const priorityLabel = PRIORITY_LABELS[a.priority] || a.priority;

      const due = a.dueDate ? `Échéance: ${escapeHtml(a.dueDate)}` : 'Échéance: —';

      const priorityVariant = a.priority === 'high' ? 'danger' : a.priority === 'low' ? '' : 'primary';
      const statusVariant = a.status === 'done' ? '' : a.status === 'in_progress' ? 'primary' : 'danger';

      return `
        <article class="card" data-id="${a.id}">
          <div class="card__top">
            <div>
              <h3 class="card__title">${escapeHtml(a.title)}</h3>
              <div class="badges">
                ${badge(`Origine: ${originLabel}`, 'primary')}
                ${badge(`Statut: ${statusLabel}`, statusVariant)}
                ${badge(`Priorité: ${priorityLabel}`, priorityVariant)}
                ${badge(due, '')}
              </div>
            </div>
            <button class="button button--danger" data-action="delete" type="button">Supprimer</button>
          </div>

          ${a.description ? `<p class="card__desc">${escapeHtml(a.description)}</p>` : ''}

          <div class="card__bottom">
            <div class="badge">Créée: ${escapeHtml(formatDate(a.createdAt))}</div>

            <div class="card__controls">
              <label>
                <span class="field__label">Statut</span>
                <select class="inline-select" data-action="set-status">
                  <option value="todo" ${a.status === 'todo' ? 'selected' : ''}>À faire</option>
                  <option value="in_progress" ${a.status === 'in_progress' ? 'selected' : ''}>En cours</option>
                  <option value="done" ${a.status === 'done' ? 'selected' : ''}>Terminé</option>
                </select>
              </label>

              <label>
                <span class="field__label">Priorité</span>
                <select class="inline-select" data-action="set-priority">
                  <option value="low" ${a.priority === 'low' ? 'selected' : ''}>Basse</option>
                  <option value="medium" ${a.priority === 'medium' ? 'selected' : ''}>Moyenne</option>
                  <option value="high" ${a.priority === 'high' ? 'selected' : ''}>Haute</option>
                </select>
              </label>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

async function load() {
  setStatus('Connexion…', true);
  try {
    await api('/api/health');
    setStatus('Connecté', true);
  } catch {
    setStatus('API indisponible', false);
  }

  const { actions } = await api(`/api/actions${buildQuery()}`);
  renderStats(actions);
  renderList(actions);
}

function wire() {
  document.querySelector('#refreshBtn').addEventListener('click', () => load());

  document.querySelector('#filterOrigin').addEventListener('change', () => load());
  document.querySelector('#filterStatus').addEventListener('change', () => load());

  const q = document.querySelector('#filterQ');
  let t;
  q.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => load(), 250);
  });

  document.querySelector('#createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload = {
      title: String(fd.get('title') || ''),
      origin: String(fd.get('origin') || ''),
      status: String(fd.get('status') || 'todo'),
      priority: String(fd.get('priority') || 'medium'),
      dueDate: String(fd.get('dueDate') || ''),
      description: String(fd.get('description') || ''),
    };

    if (!payload.dueDate) payload.dueDate = null;

    try {
      await api('/api/actions', { method: 'POST', body: JSON.stringify(payload) });
      form.reset();
      form.querySelector('[name=status]').value = 'todo';
      form.querySelector('[name=priority]').value = 'medium';
      await load();
    } catch (err) {
      alert(err.message);
    }
  });

  document.querySelector('#list').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action="delete"]');
    if (!btn) return;

    const card = e.target.closest('.card');
    const id = card?.dataset?.id;
    if (!id) return;

    if (!confirm('Supprimer cette action ?')) return;

    try {
      await api(`/api/actions/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      alert(err.message);
    }
  });

  document.querySelector('#list').addEventListener('change', async (e) => {
    const select = e.target.closest('select[data-action]');
    if (!select) return;

    const card = e.target.closest('.card');
    const id = card?.dataset?.id;
    if (!id) return;

    const action = select.dataset.action;
    const value = select.value;

    const payload =
      action === 'set-status'
        ? { status: value }
        : action === 'set-priority'
          ? { priority: value }
          : null;

    if (!payload) return;

    try {
      await api(`/api/actions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      await load();
    } catch (err) {
      alert(err.message);
      await load();
    }
  });
}

wire();
load();
