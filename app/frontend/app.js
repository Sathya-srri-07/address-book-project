(function () {
  "use strict";
  const API = "/api/contacts";

  let contacts = [];
  let selectedId = null;
  let mode = "view"; // view | edit | new | confirmDelete
  let searchTerm = "";
  let filterFav = false;
  let sortMode = "name-asc";

  const indexList = document.getElementById('indexList');
  const stage = document.getElementById('stage');
  const countLine = document.getElementById('countLine');
  const searchInput = document.getElementById('searchInput');
  const toast = document.getElementById('toast');
  let toastTimer = null;

  function showToast(msg) {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  async function api(path, options) {
    const res = await fetch(API + path, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error((data.errors && data.errors[0]) || data.error || "Request failed.");
      err.details = data;
      throw err;
    }
    return data;
  }

  async function refresh() {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (filterFav) params.set('favorite', 'true');
    params.set('sort', sortMode);
    try {
      contacts = await api('?' + params.toString());
    } catch (e) {
      showToast('Could not reach the server.');
      contacts = [];
    }
    renderIndex();
  }

  function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function renderIndex() {
    countLine.textContent = contacts.length === 1 ? "1 card on file" : contacts.length + " cards on file";
    indexList.innerHTML = "";

    if (contacts.length === 0) {
      const p = document.createElement('div');
      p.className = 'mono';
      p.style.cssText = 'padding:10px 16px;color:var(--ink-soft);font-size:0.82rem;';
      p.textContent = "no matching cards.";
      indexList.appendChild(p);
      return;
    }

    let lastLetter = null;
    const grouped = sortMode === 'recent';
    contacts.forEach(c => {
      if (!grouped) {
        const letter = c.name.trim()[0]?.toUpperCase() || '#';
        if (letter !== lastLetter) {
          lastLetter = letter;
          const tab = document.createElement('div');
          tab.className = 'letter-tab'; tab.textContent = letter;
          indexList.appendChild(tab);
        }
      }
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'card-row' + (c.id === selectedId ? ' active' : '');
      row.innerHTML =
        '<span class="r-text"><span class="r-name">' + escapeHtml(c.name) + '</span>' +
        '<span class="r-phone">' + escapeHtml(c.phone) + '</span></span>' +
        (c.favorite ? '<span class="star-mark">★</span>' : '');
      row.addEventListener('click', () => { selectedId = c.id; mode = 'view'; renderStage(); renderIndex(); });
      indexList.appendChild(row);
    });
  }

  function field(label, value) {
    return '<div class="field"><label>' + label + '</label><div class="value">' + escapeHtml(value || '—') + '</div></div>';
  }
  function mkBtn(text, cls, onClick) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = cls; b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  }

  function renderStage() {
    stage.innerHTML = "";
    if (mode === 'new' || mode === 'edit') { renderFormCard(); return; }

    const contact = contacts.find(c => c.id === selectedId);
    if (!contact) {
      stage.innerHTML = '<div class="empty-stage"><p>NO CARD SELECTED</p><div>Pick a name from the drawer, or file a new card to begin.</div></div>';
      return;
    }

    const card = document.createElement('div');
    card.className = 'index-card';

    const top = document.createElement('div');
    top.className = 'card-top';
    const star = document.createElement('button');
    star.type = 'button'; star.className = 'star-toggle' + (contact.favorite ? ' on' : '');
    star.textContent = contact.favorite ? '★' : '☆';
    star.addEventListener('click', async () => {
      try {
        await api('/' + contact.id + '/favorite', { method: 'PATCH' });
        await refresh(); renderStage();
      } catch (e) { showToast(e.message); }
    });
    top.appendChild(star);
    card.appendChild(top);

    card.insertAdjacentHTML('beforeend',
      field('Name', contact.name) + field('Phone', contact.phone) +
      field('Email', contact.email) + field('Address', contact.address) + field('Notes', contact.notes)
    );

    if (mode === 'confirmDelete') {
      const row = document.createElement('div');
      row.className = 'confirm-row';
      row.innerHTML = '<span>Remove this card for good?</span>';
      row.appendChild(mkBtn('Yes, delete it', 'btn danger', async () => {
        try {
          await api('/' + contact.id, { method: 'DELETE' });
          selectedId = null; mode = 'view'; await refresh(); renderStage();
          showToast('Card deleted.');
        } catch (e) { showToast(e.message); }
      }));
      row.appendChild(mkBtn('Keep it', 'btn', () => { mode = 'view'; renderStage(); }));
      card.appendChild(row);
    } else {
      const actions = document.createElement('div');
      actions.className = 'card-actions';
      actions.appendChild(mkBtn('Edit card', 'btn', () => { mode = 'edit'; renderStage(); }));
      actions.appendChild(mkBtn('Delete card', 'btn danger', () => { mode = 'confirmDelete'; renderStage(); }));
      const vcardLink = document.createElement('a');
      vcardLink.href = API + '/' + contact.id + '/vcard';
      vcardLink.className = 'btn small'; vcardLink.textContent = 'Export vCard';
      actions.appendChild(vcardLink);
      card.appendChild(actions);
    }
    stage.appendChild(card);
  }

  function inputField(label, value, multiline) {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const lab = document.createElement('label'); lab.textContent = label;
    const input = document.createElement(multiline ? 'textarea' : 'input');
    if (!multiline) input.type = 'text'; else input.rows = 2;
    input.value = value || ''; input.className = 'mono';
    wrap.appendChild(lab); wrap.appendChild(input);
    return { wrap, input };
  }

  function renderFormCard() {
    const editing = mode === 'edit';
    const existing = editing ? contacts.find(c => c.id === selectedId) : null;
    const card = document.createElement('div');
    card.className = 'index-card';

    const nameField = inputField('Name', existing?.name);
    const phoneField = inputField('Phone', existing?.phone);
    const emailField = inputField('Email (optional)', existing?.email);
    const addrField = inputField('Address (optional)', existing?.address);
    const notesField = inputField('Notes (optional)', existing?.notes, true);
    [nameField, phoneField, emailField, addrField, notesField].forEach(f => card.appendChild(f.wrap));

    const errorBox = document.createElement('div');
    errorBox.className = 'error-msg'; errorBox.style.display = 'none';
    card.appendChild(errorBox);

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    actions.appendChild(mkBtn(editing ? 'Save changes' : 'File this card', 'btn primary', async () => {
      const payload = {
        name: nameField.input.value.trim(),
        phone: phoneField.input.value.trim(),
        email: emailField.input.value.trim(),
        address: addrField.input.value.trim(),
        notes: notesField.input.value.trim()
      };
      try {
        if (editing) {
          await api('/' + existing.id, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
          const created = await api('', { method: 'POST', body: JSON.stringify(payload) });
          selectedId = created.id;
        }
        mode = 'view'; await refresh(); renderStage();
        showToast(editing ? 'Changes saved.' : 'Card filed.');
      } catch (e) {
        errorBox.textContent = e.message; errorBox.style.display = 'block';
      }
    }));
    actions.appendChild(mkBtn('Cancel', 'btn', () => { mode = 'view'; renderStage(); }));
    card.appendChild(actions);
    stage.appendChild(card);
    nameField.input.focus();
  }

  // ---- toolbar ----
  const filterAllBtn = document.getElementById('filterAll');
  const filterFavBtn = document.getElementById('filterFav');
  function updateFilterBtns() {
    filterAllBtn.classList.toggle('active', !filterFav);
    filterFavBtn.classList.toggle('active', filterFav);
  }
  filterAllBtn.addEventListener('click', () => { filterFav = false; updateFilterBtns(); refresh(); });
  filterFavBtn.addEventListener('click', () => { filterFav = true; updateFilterBtns(); refresh(); });
  document.getElementById('sortSelect').addEventListener('change', e => { sortMode = e.target.value; refresh(); });
  searchInput.addEventListener('input', e => { searchTerm = e.target.value; refresh(); });
  document.getElementById('newCardBtn').addEventListener('click', () => { selectedId = null; mode = 'new'; renderStage(); });

  document.getElementById('exportBtn').addEventListener('click', () => {
    window.location.href = API + '/export';
  });
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const incoming = JSON.parse(reader.result);
        const result = await api('/import', { method: 'POST', body: JSON.stringify(incoming) });
        await refresh();
        showToast(result.added + ' imported, ' + result.skipped + ' skipped.');
      } catch (err) { showToast('Could not read that file.'); }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  // ---- theme ----
  const themeBtn = document.getElementById('themeBtn');
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  try { const saved = localStorage.getItem('addressbook_theme'); if (saved) applyTheme(saved); } catch (e) {}
  themeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const next = !current ? (prefersDark ? 'light' : 'dark') : (current === 'dark' ? 'light' : 'dark');
    applyTheme(next);
    try { localStorage.setItem('addressbook_theme', next); } catch (e) {}
  });

  // ---- keyboard shortcuts ----
  document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName;
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); searchInput.focus(); }
    else if (e.key === 'n' && tag !== 'INPUT' && tag !== 'TEXTAREA') { selectedId = null; mode = 'new'; renderStage(); }
  });

  updateFilterBtns();
  refresh();
})();
