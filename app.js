// app.js — Sistema de Metas (Firestore em tempo real, sem Storage)
// v1.1 — UX de modais (ESC, clique no backdrop, travar scroll), atalhos de teclado e toasts visuais
// Autor: Horizon (Lucas) + GPT
// Observações importantes:
// - Usa Firebase Compat (importado no index.html) e firebase.js para config/serviços.
// - SINCRONIZAÇÃO EM TEMPO REAL via onSnapshot() nas coleções.
// - NÃO usa Firebase Storage: arquivos podem ser salvos em Base64 no Firestore (para itens pequenos).
// - Organização por abas: Metas, Ações, Vendas, Importar, Calendário.
// - CRUD de Metas e Colaboradores; Vendas e Ações com estrutura pronta para estender.

(function () {
  'use strict';

  // ==== Referências Firebase (expostas em window.firebaseApp no firebase.js) ====
  const { auth, db } = window.firebaseApp;

  // ==== Estado Global ====
  const state = {
    user: null,
    role: null, // 'admin' | 'gerente' | 'vendedor' | null
    filialId: 'default',
    metas: [],
    acoes: [],
    vendas: [],
    colaboradores: [],
    listeners: [], // para desfazer onSnapshot quando necessário
    currentDate: new Date(), // referência para calendário
  };

  // ==== Elementos do DOM ====
  const el = {};

  function qs(id) { return document.getElementById(id); }

  function cacheDom() {
    // Header / usuário
    el.branchSelect = qs('branch-select');
    el.userArea = qs('user-area');
    el.userEmail = qs('user-email');
    el.btnLogout = qs('btn-logout');
    el.btnOpenLogin = qs('btn-open-login');

    // Abas
    el.tabs = qs('tabs');
    el.tabPanes = document.querySelectorAll('.tab-pane');

    // Metas
    el.tabMetas = qs('tab-metas');
    el.listaMetas = qs('lista-metas');
    el.btnNovaMeta = qs('btn-nova-meta');

    // Ações
    el.tabAcoes = qs('tab-acoes');
    el.listaAcoes = qs('lista-acoes');

    // Vendas
    el.tabVendas = qs('tab-vendas');
    el.listaVendas = qs('lista-vendas');
    el.btnNovaVenda = qs('btn-nova-venda');

    // Importar
    el.tabImportar = qs('tab-importar');
    el.fileImport = qs('file-import');
    el.btnImport = qs('btn-import');
    el.importStatus = qs('import-status');

    // Calendário
    el.tabCalendario = qs('tab-calendario');
    el.calendarGrid = qs('calendar-grid');
    el.prevMonth = qs('prev-month');
    el.nextMonth = qs('next-month');
    el.currentMonth = qs('current-month');

    // Modal Login
    el.modalLogin = qs('modal-login');
    el.closeLogin = qs('close-login');
    el.loginForm = qs('login-form');
    el.loginEmail = qs('login-email');
    el.loginPassword = qs('login-password');
    el.loginRemember = qs('login-remember');
    el.btnLogin = qs('btn-login');
    el.loginMsg = qs('login-msg');

    // Modal Meta
    el.modalMeta = qs('modal-meta');
    el.closeMeta = qs('close-meta');
    el.formMeta = qs('form-meta');
    el.metaTitulo = qs('meta-titulo');
    el.metaNivel = qs('meta-nivel');
    el.metaInicio = qs('meta-inicio');
    el.metaFim = qs('meta-fim');
    el.metaValor = qs('meta-valor');
    el.btnSalvarMeta = qs('btn-salvar-meta');
    el.metaMsg = qs('meta-msg');

    // Modal Colaboradores
    el.modalColab = qs('modal-colab');
    el.closeColab = qs('close-colab');
    el.btnAbrirColab = qs('btn-abrir-colab');
    el.formColab = qs('form-colab');
    el.colabNome = qs('colab-nome');
    el.colabEmail = qs('colab-email');
    el.colabCargo = qs('colab-cargo');
    el.btnAddColab = qs('btn-add-colab');
    el.listaColab = qs('lista-colab');
  }

  // ==== Utilitários UI ====
  function show(elm) { elm.classList.remove('hidden'); }
  function hide(elm) { elm.classList.add('hidden'); }
  function toggleModal(elm, open) {
    if (open) {
      show(elm);
      elm.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden'; // trava scroll ao abrir modal
    } else {
      hide(elm);
      elm.setAttribute('aria-hidden', 'true');
      // Se nenhum modal estiver aberto, libera o scroll
      const anyOpen = [el.modalLogin, el.modalMeta, el.modalColab].some(m => m && !m.classList.contains('hidden'));
      if (!anyOpen) document.body.style.overflow = '';
    }
  }

  // Toast visual simples (sem dependências)
  function toast(msg, type = 'info') {
    if (!document.getElementById('toast-stack')) {
      const stack = document.createElement('div');
      stack.id = 'toast-stack';
      stack.className = 'fixed z-[100] top-4 right-4 flex flex-col gap-2';
      document.body.appendChild(stack);
    }
    const toastEl = document.createElement('div');
    const base = 'px-4 py-2 rounded-xl shadow-lg border text-sm bg-white';
    const byType = {
      info: 'border-slate-200',
      success: 'border-emerald-300',
      error: 'border-rose-300',
      warning: 'border-amber-300',
    };
    toastEl.className = `${base} ${byType[type] || byType.info}`;
    toastEl.textContent = String(msg || '');
    document.getElementById('toast-stack').appendChild(toastEl);
    setTimeout(() => {
      toastEl.style.opacity = '0';
      toastEl.style.transition = 'opacity .2s ease';
      setTimeout(() => toastEl.remove(), 200);
    }, 2500);
  }

  // ==== Tabs ====
  function attachTabs() {
    if (!el.tabs) return;
    const btns = el.tabs.querySelectorAll('.tab-btn');
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        setActiveTab(target);
      });
    });
    // abrir primeira aba por padrão
    const first = btns[0];
    if (first) setActiveTab(first.getAttribute('data-tab'));
  }

  function setActiveTab(tabId) {
    el.tabPanes.forEach((pane) => hide(pane));
    const target = qs(tabId);
    if (target) show(target);
  }

  // ==== UX Global (fechar modal por backdrop, ESC e atalhos) ====
  function attachGlobalModalUX() {
    // fecha modal ao clicar no backdrop
    [el.modalLogin, el.modalMeta, el.modalColab].forEach((m) => {
      if (!m) return;
      m.addEventListener('click', (e) => {
        if (e.target === m) toggleModal(m, false);
      });
    });

    // ESC fecha o modal aberto + atalhos
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        [el.modalMeta, el.modalColab, el.modalLogin].forEach((m) => {
          if (m && !m.classList.contains('hidden')) toggleModal(m, false);
        });
      }

      // Atalhos rápidos (ignora se focado em input/textarea)
      const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable;
      if (typing) return;

      if (e.key.toLowerCase() === 'm') {
        // abrir Nova Meta
        if (el.btnNovaMeta) el.btnNovaMeta.click();
      }
      if (e.key.toLowerCase() === 'c') {
        // abrir Colaboradores
        if (el.btnAbrirColab) el.btnAbrirColab.click();
      }
    });
  }

  // ==== Auth ====
  function attachAuthUI() {
    // abrir/fechar modal
    el.btnOpenLogin.addEventListener('click', () => toggleModal(el.modalLogin, true));
    el.closeLogin.addEventListener('click', () => toggleModal(el.modalLogin, false));

    // submit login
    el.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      el.loginMsg.textContent = 'Entrando...';
      try {
        const email = el.loginEmail.value.trim();
        const pass = el.loginPassword.value;
        await auth.signInWithEmailAndPassword(email, pass);
        if (el.loginRemember.checked) {
          await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        } else {
          await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
        }
        el.loginMsg.textContent = '';
        toggleModal(el.modalLogin, false);
        toast('Login realizado', 'success');
      } catch (err) {
        console.error(err);
        el.loginMsg.textContent = 'Erro ao entrar: ' + (err.message || err);
      }
    });

    // logout
    el.btnLogout.addEventListener('click', async () => {
      await auth.signOut();
    });

    // onAuthStateChanged
    auth.onAuthStateChanged(async (user) => {
      state.user = user || null;
      updateUserUI();
      if (state.user) {
        await fetchUserRole(state.user.uid);
        bindRealtime();
      } else {
        unbindRealtime();
        clearLists();
      }
    });
  }

  function updateUserUI() {
    if (state.user) {
      show(el.userArea);
      hide(el.btnOpenLogin);
      el.userEmail.textContent = state.user.email || '(sem e-mail)';
    } else {
      hide(el.userArea);
      show(el.btnOpenLogin);
      el.userEmail.textContent = '';
    }
  }

  async function fetchUserRole(uid) {
    try {
      const docRef = db.collection('roles').doc(uid);
      const snap = await docRef.get();
      state.role = snap.exists ? (snap.data().role || null) : null;
    } catch (e) {
      console.warn('Erro ao buscar role:', e);
      state.role = null;
    }
  }

  function canWrite() {
    // ajuste fino de permissões depois, por enquanto: logado pode escrever
    return !!state.user; // ou: return ['admin','gerente'].includes(state.role)
  }

  // ==== Bind Realtime Firestore ====
  function unbindRealtime() {
    state.listeners.forEach((unsub) => { try { unsub(); } catch (_) {} });
    state.listeners = [];
  }

  function bindRealtime() {
    unbindRealtime();

    const baseQuery = (col) => {
      // filtro por filial, se não "default" mostra todas
      if (state.filialId && state.filialId !== 'default') {
        return db.collection(col).where('filialId', '==', state.filialId);
      }
      return db.collection(col);
    };

    // Metas
    const unsubMetas = baseQuery('metas').orderBy('createdAt', 'desc').onSnapshot((snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      state.metas = arr;
      renderMetas();
      renderCalendar();
    });
    state.listeners.push(unsubMetas);

    // Ações
    const unsubAcoes = baseQuery('acoes').orderBy('data', 'desc').onSnapshot((snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      state.acoes = arr;
      renderAcoes();
    });
    state.listeners.push(unsubAcoes);

    // Vendas
    const unsubVendas = baseQuery('vendas').orderBy('data', 'desc').onSnapshot((snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      state.vendas = arr;
      renderVendas();
    });
    state.listeners.push(unsubVendas);

    // Colaboradores (para lista e também para popular filiais)
    const unsubColab = baseQuery('colaboradores').orderBy('createdAt', 'desc').onSnapshot((snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      state.colaboradores = arr;
      renderColaboradores();
      refreshBranchesFromColab();
    });
    state.listeners.push(unsubColab);
  }

  function clearLists() {
    state.metas = [];
    state.acoes = [];
    state.vendas = [];
    state.colaboradores = [];
    renderMetas();
    renderAcoes();
    renderVendas();
    renderColaboradores();
    renderCalendar();
  }

  // ==== Filiais (branch-select) ====
  function attachBranchSelect() {
    el.branchSelect.addEventListener('change', () => {
      state.filialId = el.branchSelect.value || 'default';
      if (state.user) bindRealtime();
    });
  }

  function refreshBranchesFromColab() {
    const current = el.branchSelect.value;
    const set = new Set(['default']);
    state.colaboradores.forEach(c => { if (c.filialId) set.add(c.filialId); });

    // rebuild options
    el.branchSelect.innerHTML = '';
    Array.from(set).forEach((fid) => {
      const opt = document.createElement('option');
      opt.value = fid;
      opt.textContent = (fid === 'default') ? 'Todas as Filiais' : fid;
      el.branchSelect.appendChild(opt);
    });

    // manter seleção anterior, se existir
    if (Array.from(set).includes(current)) {
      el.branchSelect.value = current;
      state.filialId = current;
    } else {
      el.branchSelect.value = 'default';
      state.filialId = 'default';
    }
  }

  // ==== CRUD: Metas ====
  function attachMetasUI() {
    el.btnNovaMeta.addEventListener('click', () => {
      el.formMeta.reset();
      el.metaMsg.textContent = '';
      toggleModal(el.modalMeta, true);
    });

    el.closeMeta.addEventListener('click', () => toggleModal(el.modalMeta, false));

    el.formMeta.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!canWrite()) return toast('Sem permissão para criar meta', 'error');

      const doc = {
        titulo: (el.metaTitulo.value || '').trim(),
        nivel: Number(el.metaNivel.value || 1),
        inicio: el.metaInicio.value ? new Date(el.metaInicio.value).toISOString() : null,
        fim: el.metaFim.value ? new Date(el.metaFim.value).toISOString() : null,
        valor: Number(el.metaValor.value || 0),
        filialId: state.filialId === 'default' ? null : state.filialId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      try {
        await db.collection('metas').add(doc);
        el.metaMsg.textContent = 'Meta criada com sucesso!';
        setTimeout(() => toggleModal(el.modalMeta, false), 500);
      } catch (e) {
        console.error(e);
        el.metaMsg.textContent = 'Erro ao criar meta: ' + (e.message || e);
      }
    });
  }

  function renderMetas() {
    el.listaMetas.innerHTML = '';
    if (!state.metas.length) {
      el.listaMetas.innerHTML = `<div class="text-sm text-slate-500">Nenhuma meta cadastrada.</div>`;
      return;
    }

    state.metas.forEach((m) => {
      const card = document.createElement('div');
      card.className = 'border border-slate-200 rounded-2xl p-4 flex flex-col gap-2';

      const periodo = `${m.inicio ? formatDateISO(m.inicio) : '—'} → ${m.fim ? formatDateISO(m.fim) : '—'}`;
      const header = document.createElement('div');
      header.className = 'flex items-center justify-between gap-3';
      header.innerHTML = `
        <div>
          <div class="text-sm text-slate-500">Meta ${m.nivel || 1}</div>
          <div class="font-semibold">${m.titulo || '(sem título)'}</div>
          <div class="text-sm text-slate-500">${periodo}</div>
        </div>
        <div class="text-right">
          <div class="text-sm text-slate-500">Valor</div>
          <div class="font-semibold">${formatCurrency(m.valor)}</div>
        </div>`;

      const actions = document.createElement('div');
      actions.className = 'flex items-center gap-2 mt-2';

      const btnEdit = document.createElement('button');
      btnEdit.className = 'px-3 py-1.5 text-sm rounded-xl border border-slate-300 hover:bg-slate-100';
      btnEdit.textContent = 'Editar';
      btnEdit.addEventListener('click', () => openEditMeta(m));

      const btnDel = document.createElement('button');
      btnDel.className = 'px-3 py-1.5 text-sm rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50';
      btnDel.textContent = 'Excluir';
      btnDel.addEventListener('click', () => deleteMeta(m.id));

      actions.append(btnEdit, btnDel);
      card.append(header, actions);
      el.listaMetas.appendChild(card);
    });
  }

  function openEditMeta(meta) {
    el.metaTitulo.value = meta.titulo || '';
    el.metaNivel.value = String(meta.nivel || 1);
    el.metaInicio.value = meta.inicio ? formatDateISO(meta.inicio) : '';
    el.metaFim.value = meta.fim ? formatDateISO(meta.fim) : '';
    el.metaValor.value = (meta.valor != null) ? meta.valor : '';
    el.metaMsg.textContent = '';
    toggleModal(el.modalMeta, true);

    // trocar handler de submit temporariamente para update
    const submitHandler = async (e) => {
      e.preventDefault();
      if (!canWrite()) return toast('Sem permissão para editar meta', 'error');
      const doc = {
        titulo: (el.metaTitulo.value || '').trim(),
        nivel: Number(el.metaNivel.value || 1),
        inicio: el.metaInicio.value ? new Date(el.metaInicio.value).toISOString() : null,
        fim: el.metaFim.value ? new Date(el.metaFim.value).toISOString() : null,
        valor: Number(el.metaValor.value || 0),
        updatedAt: new Date().toISOString(),
      };
      try {
        await db.collection('metas').doc(meta.id).update(doc);
        el.metaMsg.textContent = 'Meta atualizada!';
        setTimeout(() => toggleModal(el.modalMeta, false), 500);
      } catch (e) {
        console.error(e);
        el.metaMsg.textContent = 'Erro ao atualizar meta: ' + (e.message || e);
      } finally {
        // restaurar submit original
        el.formMeta.removeEventListener('submit', submitHandler);
        el.formMeta.addEventListener('submit', createMetaSubmitFallback, { once: true });
      }
    };

    // remover submit padrão (se existir) e colocar temporário com {once:true}
    el.formMeta.removeEventListener('submit', createMetaSubmitFallback);
    el.formMeta.addEventListener('submit', submitHandler, { once: true });
  }

  // usado para restaurar o submit do create após editar
  function createMetaSubmitFallback(e) {
    e.preventDefault();
  }

  async function deleteMeta(id) {
    if (!canWrite()) return toast('Sem permissão para excluir meta', 'error');
    if (!confirm('Excluir esta meta?')) return;
    try {
      await db.collection('metas').doc(id).delete();
      toast('Meta excluída', 'success');
    } catch (e) {
      console.error(e);
      toast('Erro ao excluir meta: ' + (e.message || e), 'error');
    }
  }

  // ==== Ações (estrutura básica) ====
  function renderAcoes() {
    el.listaAcoes.innerHTML = '';
    if (!state.acoes.length) {
      el.listaAcoes.innerHTML = `<div class="text-sm text-slate-500">Nenhuma ação cadastrada.</div>`;
      return;
    }
    state.acoes.forEach((a) => {
      const row = document.createElement('div');
      row.className = 'border border-slate-200 rounded-xl p-3 flex items-center justify-between';
      row.innerHTML = `
        <div class="text-sm">
          <div class="font-medium">${a.titulo || '(sem título)'}</div>
          <div class="text-slate-500">${formatDateISO(a.data)} — ${a.descricao || ''}</div>
        </div>
        <div class="text-xs text-slate-500">${a.filialId || '—'}</div>`;
      el.listaAcoes.appendChild(row);
    });
  }

  // ==== Vendas (estrutura básica) ====
  function attachVendasUI() {
    el.btnNovaVenda.addEventListener('click', async () => {
      if (!canWrite()) return toast('Sem permissão para registrar', 'error');
      const valor = prompt('Valor da venda (R$):', '0');
      if (valor == null) return;
      const n = Number(valor);
      const doc = {
        colaboradorId: state.user?.uid || null,
        valor: isNaN(n) ? 0 : n,
        data: new Date().toISOString(),
        filialId: state.filialId === 'default' ? null : state.filialId,
        createdAt: new Date().toISOString(),
      };
      try {
        await db.collection('vendas').add(doc);
        toast('Venda registrada');
      } catch (e) {
        console.error(e);
        toast('Erro ao registrar venda: ' + (e.message || e), 'error');
      }
    });
  }

  function renderVendas() {
    el.listaVendas.innerHTML = '';
    if (!state.vendas.length) {
      el.listaVendas.innerHTML = `<div class="text-sm text-slate-500">Nenhuma venda registrada.</div>`;
      return;
    }
    state.vendas.forEach((v) => {
      const row = document.createElement('div');
      row.className = 'border border-slate-200 rounded-xl p-3 flex items-center justify-between';
      row.innerHTML = `
        <div class="text-sm">
          <div class="font-medium">${formatCurrency(v.valor)}</div>
          <div class="text-slate-500">${formatDateISO(v.data)}</div>
        </div>
        <div class="text-xs text-slate-500">${v.filialId || '—'}</div>`;
      el.listaVendas.appendChild(row);
    });
  }

  // ==== Importação CSV (sem XLS/XLSX por enquanto) ====
  function attachImportUI() {
    el.btnImport.addEventListener('click', async () => {
      const file = el.fileImport.files?.[0];
      if (!file) {
        el.importStatus.textContent = 'Selecione um arquivo (.csv)';
        return;
      }
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext !== 'csv') {
        el.importStatus.textContent = 'Por enquanto, suporte apenas para CSV. (XLS/XLSX em breve)';
        return;
      }
      try {
        const text = await file.text();
        const rows = parseCSV(text);
        // Exemplo: tentar importar como vendas: header esperado: valor;data;filialId
        let imported = 0;
        for (let i = 1; i < rows.length; i++) {
          const [valor, data, filialId] = rows[i];
          if (!valor) continue;
          await db.collection('vendas').add({
            colaboradorId: state.user?.uid || null,
            valor: Number(valor || 0),
            data: data ? new Date(data).toISOString() : new Date().toISOString(),
            filialId: filialId || null,
            createdAt: new Date().toISOString(),
          });
          imported++;
        }
        el.importStatus.textContent = `Importação concluída: ${imported} registros.`;
      } catch (e) {
        console.error(e);
        el.importStatus.textContent = 'Erro na importação: ' + (e.message || e);
      }
    });
  }

  function parseCSV(text) {
    // Parser simples para CSV separado por ; ou ,
    const lines = text.split(/\r?\n/).filter(Boolean);
    return lines.map(line => {
      const sep = line.includes(';') ? ';' : ',';
      // divide respeitando aspas simples
      const parts = [];
      let cur = '', inside = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inside = !inside; continue; }
        if (!inside && ch === sep) { parts.push(cur); cur = ''; continue; }
        cur += ch;
      }
      parts.push(cur);
      return parts.map(s => s.trim());
    });
  }

  // ==== Colaboradores ====
  function attachColabUI() {
    el.btnAbrirColab.addEventListener('click', () => toggleModal(el.modalColab, true));
    el.closeColab.addEventListener('click', () => toggleModal(el.modalColab, false));

    el.btnAddColab.addEventListener('click', async () => {
      if (!canWrite()) return toast('Sem permissão', 'error');
      const nome = (el.colabNome.value || '').trim();
      const email = (el.colabEmail.value || '').trim();
      const cargo = el.colabCargo.value || 'vendedor';
      if (!nome || !email) return toast('Preencha nome e e-mail');
      try {
        await db.collection('colaboradores').add({
          nome, email, cargo,
          filialId: state.filialId === 'default' ? null : state.filialId,
          userUid: null, // podemos vincular depois ao UID real
          createdAt: new Date().toISOString(),
        });
        el.formColab.reset();
        toast('Colaborador adicionado');
      } catch (e) {
        console.error(e);
        toast('Erro ao adicionar: ' + (e.message || e), 'error');
      }
    });
  }

  function renderColaboradores() {
    el.listaColab.innerHTML = '';
    if (!state.colaboradores.length) {
      el.listaColab.innerHTML = '<div class="text-sm text-slate-500">Nenhum colaborador.</div>';
      return;
    }
    state.colaboradores.forEach((c) => {
      const row = document.createElement('div');
      row.className = 'border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center';
      row.innerHTML = `
        <div class="font-medium">${c.nome || '(sem nome)'}<div class="text-xs text-slate-500">${c.cargo || ''}</div></div>
        <div class="text-sm sm:col-span-2">${c.email || ''}</div>
        <div class="text-xs text-slate-500">${c.filialId || '—'}</div>
        <div class="flex gap-2 justify-end">
          <button class="btn-del px-3 py-1.5 text-sm rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50">Excluir</button>
        </div>`;

      row.querySelector('.btn-del').addEventListener('click', async () => {
        if (!canWrite()) return toast('Sem permissão', 'error');
        if (!confirm('Excluir colaborador?')) return;
        try {
          await db.collection('colaboradores').doc(c.id).delete();
          toast('Colaborador excluído');
        } catch (e) {
          console.error(e);
          toast('Erro ao excluir: ' + (e.message || e), 'error');
        }
      });

      el.listaColab.appendChild(row);
    });
  }

  // ==== Calendário ====
  function attachCalendarUI() {
    el.prevMonth.addEventListener('click', () => { shiftMonth(-1); });
    el.nextMonth.addEventListener('click', () => { shiftMonth(1); });
    renderCalendar();
  }

  function shiftMonth(delta) {
    const d = new Date(state.currentDate);
    d.setMonth(d.getMonth() + delta);
    state.currentDate = d;
    renderCalendar();
  }

  function startOfMonth(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), 1);
    return x;
  }
  function endOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }

  function renderCalendar() {
    const d = new Date(state.currentDate);
    const monthName = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    el.currentMonth.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const start = startOfMonth(d);
    const end = endOfMonth(d);

    const startWeekday = start.getDay(); // 0=Domingo ... 6=Sábado
    const daysInMonth = end.getDate();

    el.calendarGrid.innerHTML = '';

    // Preenche dias vazios antes do início do mês
    for (let i = 0; i < startWeekday; i++) {
      const cell = document.createElement('div');
      cell.className = 'h-24 border border-slate-200 rounded-xl bg-slate-50/60';
      el.calendarGrid.appendChild(cell);
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(d.getFullYear(), d.getMonth(), day);
      const cell = document.createElement('div');
      const today = new Date();
      const isToday = today.getFullYear() === cellDate.getFullYear() &&
                      today.getMonth() === cellDate.getMonth() &&
                      today.getDate() === cellDate.getDate();
      cell.className = 'h-24 border rounded-xl p-2 flex flex-col gap-1 text-left bg-white ' + (isToday ? 'border-slate-300 ring-2 ring-slate-900/10' : 'border-slate-200');

      // header do dia
      const head = document.createElement('div');
      head.className = 'text-xs font-medium text-slate-500 flex items-center justify-between';
      head.innerHTML = `<span>${String(day).padStart(2, '0')}</span>`;
      cell.appendChild(head);

      // metas ativas neste dia
      const metasDoDia = state.metas.filter((m) => {
        const ini = m.inicio ? new Date(m.inicio) : null;
        const fim = m.fim ? new Date(m.fim) : null;
        if (!ini && !fim) return false;
        const x = cellDate.setHours(0,0,0,0);
        const a = ini ? ini.setHours(0,0,0,0) : x;
        const b = fim ? fim.setHours(0,0,0,0) : x;
        return x >= a && x <= b;
      });

      metasDoDia.slice(0, 3).forEach((m) => {
        const tag = document.createElement('div');
        tag.className = 'text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 truncate';
        tag.textContent = `M${m.nivel}: ${m.titulo}`;
        cell.appendChild(tag);
      });

      if (metasDoDia.length > 3) {
        const more = document.createElement('div');
        more.className = 'text-[11px] text-slate-500';
        more.textContent = `+${metasDoDia.length - 3} metas`;
        cell.appendChild(more);
      }

      el.calendarGrid.appendChild(cell);
    }
  }

  // ==== Inicialização ====
  function init() {
    cacheDom();
    attachTabs();
    attachAuthUI();
    attachBranchSelect();
    attachMetasUI();
    attachVendasUI();
    attachImportUI();
    attachColabUI();
    attachCalendarUI();
    attachGlobalModalUX();

    // Habilita submit de criação de meta por padrão (para o fallback de edição funcionar)
    el.formMeta.addEventListener('submit', async (e) => {
      // este é o handler "padrão" de criar meta (pode ser substituído temporariamente no editar)
      e.preventDefault();
      if (!canWrite()) return toast('Sem permissão', 'error');
      const doc = {
        titulo: (el.metaTitulo.value || '').trim(),
        nivel: Number(el.metaNivel.value || 1),
        inicio: el.metaInicio.value ? new Date(el.metaInicio.value).toISOString() : null,
        fim: el.metaFim.value ? new Date(el.metaFim.value).toISOString() : null,
        valor: Number(el.metaValor.value || 0),
        filialId: state.filialId === 'default' ? null : state.filialId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      try {
        await db.collection('metas').add(doc);
        el.metaMsg.textContent = 'Meta criada com sucesso!';
        setTimeout(() => toggleModal(el.modalMeta, false), 500);
      } catch (e) {
        console.error(e);
        el.metaMsg.textContent = 'Erro ao criar meta: ' + (e.message || e);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
