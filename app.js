// app.js — Sistema de Metas (Firestore em tempo real, sem Storage)
// v1.2 — Calendário primeiro + valores de vendas por filial no calendário,
//        dashboard de KPIs, coleção FILIAIS (CRUD admin), foco/UX e filtros.
// Autor: Horizon (Lucas) + GPT

(function () {
  'use strict';

  // ==== Firebase (exposto em window.firebaseApp no firebase.js) ====
  const { auth, db } = window.firebaseApp;

  // ==== Estado Global ====
  const state = {
    user: null,
    role: null, // 'admin' | 'gerente' | 'vendedor' | null
    filialId: 'default',
    filiais: [],            // [{id, nome, codigo, cor, ativa}]
    filiaisByCodigo: {},    // { codigo: {id, nome, cor} }
    metas: [],
    acoes: [],
    vendas: [],
    colaboradores: [],
    listeners: [],
    currentDate: new Date(), // calendário
  };

  // ==== DOM ====
  const el = {};
  const qs = (id) => document.getElementById(id);

  function cacheDom() {
    // Header / usuário
    el.branchSelect = qs('branch-select');
    el.btnFiliais = qs('btn-filiais');
    el.userArea = qs('user-area');
    el.userEmail = qs('user-email');
    el.btnLogout = qs('btn-logout');
    el.btnOpenLogin = qs('btn-open-login');

    // Abas
    el.tabs = qs('tabs');
    el.tabPanes = document.querySelectorAll('.tab-pane');

    // Dashboard
    el.kpiVendasHoje = qs('kpi-vendas-hoje');
    el.kpiVendasMes = qs('kpi-vendas-mes');
    el.kpiProgressoBar = qs('kpi-progresso-bar');
    el.kpiProgressoLabel = qs('kpi-progresso-label');
    el.kpiAcoes = qs('kpi-acoes');

    // Calendário
    el.tabCalendario = qs('tab-calendario');
    el.calendarGrid = qs('calendar-grid');
    el.prevMonth = qs('prev-month');
    el.nextMonth = qs('next-month');
    el.currentMonth = qs('current-month');

    // Metas
    el.tabMetas = qs('tab-metas');
    el.listaMetas = qs('lista-metas');
    el.btnNovaMeta = qs('btn-nova-meta');
    el.filtroNivel = qs('filtro-nivel');

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

    // Modal Login
    el.modalLogin = qs('modal-login');
    el.closeLogin = qs('close-login');
    el.loginForm = qs('login-form');
    el.loginEmail = qs('login-email');
    el.loginPassword = qs('login-password');
    el.loginRemember = qs('login-remember');
    el.btnLogin = qs('btn-login');
    el.btnSignup = qs('btn-signup');
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
    el.btnCancelMeta = qs('btn-cancel-meta');
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

    // Modal Filiais (admin)
    el.modalFiliais = qs('modal-filiais');
    el.closeFiliais = qs('close-filiais');
    el.formFilial = qs('form-filial');
    el.filialNome = qs('filial-nome');
    el.filialCodigo = qs('filial-codigo');
    el.filialCor = qs('filial-cor');
    el.btnAddFilial = qs('btn-add-filial');
    el.listaFiliais = qs('lista-filiais');
  }

  // ==== Util ====
  function show(elm) { elm?.classList.remove('hidden'); }
  function hide(elm) { elm?.classList.add('hidden'); }
  function toggleModal(elm, open) {
    if (!elm) return;
    if (open) {
      show(elm); elm.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      // autofoco no primeiro input
      setTimeout(() => elm.querySelector('input,select,button,textarea')?.focus(), 50);
    } else {
      hide(elm); elm.setAttribute('aria-hidden', 'true');
      const anyOpen = [el.modalLogin, el.modalMeta, el.modalColab, el.modalFiliais].some(m => m && !m.classList.contains('hidden'));
      if (!anyOpen) document.body.style.overflow = '';
    }
  }

  // Toast visual
  function toast(msg, type = 'info') {
    if (!document.getElementById('toast-stack')) {
      const stack = document.createElement('div');
      stack.id = 'toast-stack';
      stack.className = 'fixed z-[100] top-4 right-4 flex flex-col gap-2';
      document.body.appendChild(stack);
    }
    const elToast = document.createElement('div');
    const base = 'px-4 py-2 rounded-xl shadow-lg border text-sm bg-white';
    const color = { info:'border-slate-200', success:'border-emerald-300', error:'border-rose-300', warning:'border-amber-300' }[type] || 'border-slate-200';
    elToast.className = `${base} ${color}`; elToast.textContent = String(msg || '');
    document.getElementById('toast-stack').appendChild(elToast);
    setTimeout(() => { elToast.style.opacity = '0'; elToast.style.transition = 'opacity .2s'; setTimeout(() => elToast.remove(), 200); }, 2600);
  }

  function formatCurrency(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function formatDateISO(d){ if(!d) return ''; const dt=(d instanceof Date)?d:new Date(d); const y=dt.getFullYear(); const m=String(dt.getMonth()+1).padStart(2,'0'); const day=String(dt.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }

  // ==== Tabs ====
  function attachTabs(){
    if (!el.tabs) return;
    const btns = el.tabs.querySelectorAll('.tab-btn');
    btns.forEach((btn)=> btn.addEventListener('click',()=> setActiveTab(btn.getAttribute('data-tab'))));
    // Calendário deve abrir primeiro
    const calBtn = Array.from(btns).find(b=>b.getAttribute('data-tab')==='tab-calendario') || btns[0];
    if (calBtn) setActiveTab(calBtn.getAttribute('data-tab'));
  }
  function setActiveTab(tabId){ el.tabPanes.forEach(p=>hide(p)); const t = qs(tabId); if(t) show(t); }

  function attachGlobalModalUX(){
    [el.modalLogin, el.modalMeta, el.modalColab, el.modalFiliais].forEach((m)=> m?.addEventListener('click',(e)=>{ if(e.target===m) toggleModal(m,false); }));
    document.addEventListener('keydown',(e)=>{
      if (e.key==='Escape') [el.modalMeta, el.modalColab, el.modalFiliais, el.modalLogin].forEach(m=>{ if(m && !m.classList.contains('hidden')) toggleModal(m,false); });
    });
  }

  // ==== Auth ====
  function attachAuthUI(){
    el.btnOpenLogin.addEventListener('click',()=> toggleModal(el.modalLogin,true));
    el.closeLogin.addEventListener('click',()=> toggleModal(el.modalLogin,false));

    el.loginForm.addEventListener('submit', async (e)=>{
      e.preventDefault(); el.loginMsg.textContent='Entrando...';
      try{
        const email = el.loginEmail.value.trim(); const pass = el.loginPassword.value;
        await auth.signInWithEmailAndPassword(email, pass);
        await auth.setPersistence(el.loginRemember.checked ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
        el.loginMsg.textContent=''; toggleModal(el.modalLogin,false); toast('Login realizado','success');
      }catch(err){ console.error(err); el.loginMsg.textContent='Erro ao entrar: '+(err.message||err); }
    });

    // criar conta teste
    el.btnSignup?.addEventListener('click', async ()=>{
      el.loginMsg.textContent='Criando conta...';
      try{
        const email = el.loginEmail.value.trim(); const pass = el.loginPassword.value;
        if(!email||!pass){ el.loginMsg.textContent='Informe e-mail e senha'; return; }
        await auth.createUserWithEmailAndPassword(email, pass);
        await auth.setPersistence(el.loginRemember.checked ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
        el.loginMsg.textContent='Conta criada!'; setTimeout(()=> toggleModal(el.modalLogin,false), 500);
      }catch(err){ console.error(err); el.loginMsg.textContent='Erro ao criar: '+(err.message||err); }
    });

    el.btnLogout.addEventListener('click', async ()=>{ await auth.signOut(); });

    auth.onAuthStateChanged(async (user)=>{
      state.user = user || null; updateUserUI();
      if (state.user){ await fetchUserRole(state.user.uid); bindRealtime(); }
      else { unbindRealtime(); clearLists(); }
    });
  }

  function updateUserUI(){
    if (state.user){ show(el.userArea); hide(el.btnOpenLogin); el.userEmail.textContent = state.user.email || '(sem e-mail)'; }
    else { hide(el.userArea); show(el.btnOpenLogin); el.userEmail.textContent=''; }
    // botão Filiais visível só pra admin
    if (state.role==='admin') show(el.btnFiliais); else hide(el.btnFiliais);
  }

  async function fetchUserRole(uid){
    try{ const snap = await db.collection('roles').doc(uid).get(); state.role = snap.exists ? (snap.data().role||null) : null; updateUserUI(); }
    catch(e){ console.warn('role:',e); state.role=null; }
  }

  const canWrite = ()=> !!state.user; // depois podemos refinar por cargo/filial
  const isAdmin = ()=> state.role==='admin';

  // ==== Realtime Bindings ====
  function unbindRealtime(){ state.listeners.forEach((u)=>{ try{u();}catch(_){} }); state.listeners = []; }
  function bindRealtime(){
    unbindRealtime();

    // Filiais (admin e geral para seletor)
    const unsubFiliais = db.collection('filiais').orderBy('nome','asc').onSnapshot((snap)=>{
      const arr=[]; snap.forEach(d=>arr.push({id:d.id, ...d.data()}));
      state.filiais = arr; state.filiaisByCodigo = Object.fromEntries(arr.filter(f=>f.codigo).map(f=>[f.codigo,{id:f.id, nome:f.nome, cor:f.cor||'#0ea5e9'}]));
      refreshBranchesFromFiliais(); renderFiliaisAdminList(); renderCalendar(); computeKPIs();
    });
    state.listeners.push(unsubFiliais);

    const baseQuery = (col)=> (state.filialId && state.filialId!=='default') ? db.collection(col).where('filialId','==',state.filialId) : db.collection(col);

    // Metas
    const unsubMetas = baseQuery('metas').orderBy('createdAt','desc').onSnapshot((snap)=>{
      const arr=[]; snap.forEach(d=>arr.push({id:d.id, ...d.data()})); state.metas = arr; renderMetas(); renderCalendar(); computeKPIs();
    }); state.listeners.push(unsubMetas);

    // Ações
    const unsubAcoes = baseQuery('acoes').orderBy('data','desc').onSnapshot((snap)=>{
      const arr=[]; snap.forEach(d=>arr.push({id:d.id, ...d.data()})); state.acoes = arr; renderAcoes(); computeKPIs();
    }); state.listeners.push(unsubAcoes);

    // Vendas
    const unsubVendas = baseQuery('vendas').orderBy('data','desc').onSnapshot((snap)=>{
      const arr=[]; snap.forEach(d=>arr.push({id:d.id, ...d.data()})); state.vendas = arr; renderVendas(); renderCalendar(); computeKPIs();
    }); state.listeners.push(unsubVendas);

    // Colaboradores
    const unsubColab = baseQuery('colaboradores').orderBy('createdAt','desc').onSnapshot((snap)=>{
      const arr=[]; snap.forEach(d=>arr.push({id:d.id, ...d.data()})); state.colaboradores = arr; renderColaboradores();
    }); state.listeners.push(unsubColab);
  }

  function clearLists(){ state.metas=[]; state.acoes=[]; state.vendas=[]; state.colaboradores=[]; renderMetas(); renderAcoes(); renderVendas(); renderColaboradores(); renderCalendar(); computeKPIs(); }

  // ==== Filiais (select + modal admin) ====
  function attachBranchSelect(){ el.branchSelect.addEventListener('change',()=>{ state.filialId = el.branchSelect.value||'default'; if(state.user) bindRealtime(); }); }
  function refreshBranchesFromFiliais(){
    const current = el.branchSelect.value; const set = new Set(['default']);
    state.filiais.forEach(f=>{ if(f.codigo) set.add(f.codigo); });
    el.branchSelect.innerHTML='';
    Array.from(set).forEach((fid)=>{ const opt=document.createElement('option'); opt.value=fid; opt.textContent=(fid==='default')?'Todas as Filiais':fid; el.branchSelect.appendChild(opt); });
    if(Array.from(set).includes(current)){ el.branchSelect.value=current; state.filialId=current; } else { el.branchSelect.value='default'; state.filialId='default'; }
  }

  function attachFiliaisAdmin(){
    el.btnFiliais.addEventListener('click',()=>{ if(!isAdmin()) return toast('Apenas administradores','error'); toggleModal(el.modalFiliais,true); });
    el.closeFiliais.addEventListener('click',()=> toggleModal(el.modalFiliais,false));
    el.btnAddFilial.addEventListener('click', async ()=>{
      if(!isAdmin()) return toast('Apenas administradores','error');
      const nome=(el.filialNome.value||'').trim(); const codigo=(el.filialCodigo.value||'').trim(); const cor=el.filialCor.value||'#0ea5e9';
      if(!nome||!codigo) return toast('Informe nome e código');
      try{
        // se existir um com mesmo código, atualiza; senão cria
        const snap = await db.collection('filiais').where('codigo','==',codigo).get();
        if(!snap.empty){ await snap.docs[0].ref.update({nome, codigo, cor}); toast('Filial atualizada','success'); }
        else { await db.collection('filiais').add({nome, codigo, cor, ativa:true, createdAt:new Date().toISOString()}); toast('Filial criada','success'); }
        el.formFilial.reset();
      }catch(e){ console.error(e); toast('Erro ao salvar filial: '+(e.message||e),'error'); }
    });
  }

  function renderFiliaisAdminList(){
    if(!el.listaFiliais) return; el.listaFiliais.innerHTML='';
    if(!state.filiais.length){ el.listaFiliais.innerHTML='<div class="text-sm text-slate-500">Nenhuma filial.</div>'; return; }
    state.filiais.forEach((f)=>{
      const row=document.createElement('div'); row.className='border border-slate-200 rounded-xl p-3 flex items-center justify-between';
      row.innerHTML=`<div class="flex items-center gap-3"><span class="w-3 h-3 rounded-full" style="background:${f.cor||'#0ea5e9'}"></span>
        <div class="text-sm"><div class="font-medium">${f.nome||''}</div><div class="text-slate-500">${f.codigo||''}</div></div></div>
        <div class="flex gap-2">
          <button class="btn-edit px-3 py-1.5 text-sm rounded-xl border border-slate-300 hover:bg-slate-100">Editar</button>
          <button class="btn-del px-3 py-1.5 text-sm rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50">Excluir</button>
        </div>`;
      row.querySelector('.btn-edit').addEventListener('click',()=>{
        el.filialNome.value=f.nome||''; el.filialCodigo.value=f.codigo||''; el.filialCor.value=f.cor||'#0ea5e9';
        toast('Preencha/ajuste o formulário acima e clique Salvar');
      });
      row.querySelector('.btn-del').addEventListener('click', async ()=>{
        if(!isAdmin()) return toast('Apenas administradores','error');
        if(!confirm('Excluir filial?')) return; try{ await db.collection('filiais').doc(f.id).delete(); toast('Filial excluída','success'); }catch(e){ console.error(e); toast('Erro: '+(e.message||e),'error'); }
      });
      el.listaFiliais.appendChild(row);
    });
  }

  // ==== Metas ====
  function attachMetasUI(){
    el.btnNovaMeta.addEventListener('click',()=>{ el.formMeta.reset(); el.metaMsg.textContent=''; toggleModal(el.modalMeta,true); el.metaTitulo.focus(); });
    el.closeMeta.addEventListener('click',()=> toggleModal(el.modalMeta,false));
    el.btnCancelMeta.addEventListener('click',()=> toggleModal(el.modalMeta,false));
    el.filtroNivel?.addEventListener('change', ()=> renderMetas());

    el.formMeta.addEventListener('submit', async (e)=>{
      e.preventDefault(); if(!canWrite()) return toast('Sem permissão','error');
      const doc={
        titulo:(el.metaTitulo.value||'').trim(),
        nivel:Number(el.metaNivel.value||1),
        inicio: el.metaInicio.value? new Date(el.metaInicio.value).toISOString() : null,
        fim: el.metaFim.value? new Date(el.metaFim.value).toISOString() : null,
        valor: Number(el.metaValor.value||0),
        filialId: state.filialId==='default'? null : state.filialId,
        createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
      };
      try{ await db.collection('metas').add(doc); el.metaMsg.textContent='Meta criada!'; setTimeout(()=> toggleModal(el.modalMeta,false), 500); }
      catch(e){ console.error(e); el.metaMsg.textContent='Erro: '+(e.message||e); }
    });
  }

  function renderMetas(){
    if(!el.listaMetas) return; el.listaMetas.innerHTML='';
    let metas = [...state.metas];
    const nivel = el.filtroNivel?.value || '';
    if (nivel) metas = metas.filter(m=> String(m.nivel||1)===String(nivel));
    if(!metas.length){ el.listaMetas.innerHTML='<div class="text-sm text-slate-500">Nenhuma meta.</div>'; return; }

    metas.forEach((m)=>{
      const badgeColor = (m.nivel==1?'bg-emerald-100 text-emerald-700 border-emerald-200': m.nivel==2?'bg-amber-100 text-amber-700 border-amber-200':'bg-sky-100 text-sky-700 border-sky-200');
      const card=document.createElement('div'); card.className='border border-slate-200 rounded-2xl p-4 flex flex-col gap-2';
      const periodo=`${m.inicio?formatDateISO(m.inicio):'—'} → ${m.fim?formatDateISO(m.fim):'—'}`;
      card.innerHTML=`
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="inline-flex items-center gap-2 text-xs">
              <span class="px-2 py-0.5 rounded-lg border ${badgeColor}">M${m.nivel||1}</span>
              <span class="text-slate-500">${periodo}</span>
            </div>
            <div class="font-semibold">${m.titulo||'(sem título)'}</div>
          </div>
          <div class="text-right">
            <div class="text-sm text-slate-500">Valor</div>
            <div class="font-semibold">${formatCurrency(m.valor)}</div>
          </div>
        </div>
        <div class="flex items-center gap-2 mt-2">
          <button class="btn-edit px-3 py-1.5 text-sm rounded-xl border border-slate-300 hover:bg-slate-100">Editar</button>
          <button class="btn-del px-3 py-1.5 text-sm rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50">Excluir</button>
        </div>`;

      card.querySelector('.btn-edit').addEventListener('click',()=> openEditMeta(m));
      card.querySelector('.btn-del').addEventListener('click',()=> deleteMeta(m.id));
      el.listaMetas.appendChild(card);
    });
  }

  function openEditMeta(meta){
    el.metaTitulo.value=meta.titulo||''; el.metaNivel.value=String(meta.nivel||1);
    el.metaInicio.value = meta.inicio? formatDateISO(meta.inicio):''; el.metaFim.value = meta.fim? formatDateISO(meta.fim):''; el.metaValor.value = meta.valor!=null? meta.valor: '';
    el.metaMsg.textContent=''; toggleModal(el.modalMeta,true);

    const submitHandler = async (e)=>{
      e.preventDefault(); if(!canWrite()) return toast('Sem permissão','error');
      const doc={
        titulo:(el.metaTitulo.value||'').trim(), nivel:Number(el.metaNivel.value||1),
        inicio: el.metaInicio.value? new Date(el.metaInicio.value).toISOString(): null,
        fim: el.metaFim.value? new Date(el.metaFim.value).toISOString(): null,
        valor: Number(el.metaValor.value||0), updatedAt:new Date().toISOString(),
      };
      try{ await db.collection('metas').doc(meta.id).update(doc); el.metaMsg.textContent='Meta atualizada!'; setTimeout(()=> toggleModal(el.modalMeta,false), 500); }
      catch(e){ console.error(e); el.metaMsg.textContent='Erro: '+(e.message||e); }
      finally{ el.formMeta.removeEventListener('submit', submitHandler); }
    };

    el.formMeta.addEventListener('submit', submitHandler, { once:true });
  }

  async function deleteMeta(id){ if(!canWrite()) return toast('Sem permissão','error'); if(!confirm('Excluir esta meta?')) return; try{ await db.collection('metas').doc(id).delete(); toast('Meta excluída','success'); }catch(e){ console.error(e); toast('Erro ao excluir: '+(e.message||e),'error'); } }

  // ==== Ações ====
  function renderAcoes(){
    if(!el.listaAcoes) return; el.listaAcoes.innerHTML='';
    if(!state.acoes.length){ el.listaAcoes.innerHTML='<div class="text-sm text-slate-500">Nenhuma ação.</div>'; return; }
    state.acoes.forEach((a)=>{
      const row=document.createElement('div'); row.className='border border-slate-200 rounded-xl p-3 flex items-center justify-between';
      row.innerHTML=`<div class="text-sm"><div class="font-medium">${a.titulo||'(sem título)'}</div><div class="text-slate-500">${formatDateISO(a.data)} — ${a.descricao||''}</div></div><div class="text-xs text-slate-500">${a.filialId||'—'}</div>`;
      el.listaAcoes.appendChild(row);
    });
  }

  // ==== Vendas ====
  function attachVendasUI(){
    el.btnNovaVenda.addEventListener('click', async ()=>{
      if(!canWrite()) return toast('Sem permissão','error');
      const valor = prompt('Valor da venda (R$):','0'); if(valor==null) return; const n = Number(valor);
      const doc = { colaboradorId: state.user?.uid||null, valor: isNaN(n)?0:n, data:new Date().toISOString(), filialId: state.filialId==='default'? null : state.filialId, createdAt:new Date().toISOString() };
      try{ await db.collection('vendas').add(doc); toast('Venda registrada'); }catch(e){ console.error(e); toast('Erro: '+(e.message||e),'error'); }
    });
  }
  function renderVendas(){
    if(!el.listaVendas) return; el.listaVendas.innerHTML='';
    if(!state.vendas.length){ el.listaVendas.innerHTML='<div class="text-sm text-slate-500">Nenhuma venda.</div>'; return; }
    state.vendas.forEach((v)=>{
      const row=document.createElement('div'); row.className='border border-slate-200 rounded-xl p-3 flex items-center justify-between';
      row.innerHTML=`<div class="text-sm"><div class="font-medium">${formatCurrency(v.valor)}</div><div class="text-slate-500">${formatDateISO(v.data)}</div></div><div class="text-xs text-slate-500">${v.filialId||'—'}</div>`;
      el.listaVendas.appendChild(row);
    });
  }

  // ==== Importação CSV ====
  function attachImportUI(){
    el.btnImport.addEventListener('click', async ()=>{
      const file = el.fileImport.files?.[0]; if(!file){ el.importStatus.textContent='Selecione um arquivo (.csv)'; return; }
      const ext = file.name.toLowerCase().split('.').pop(); if(ext!=='csv'){ el.importStatus.textContent='Por enquanto, apenas CSV.'; return; }
      try{
        const text = await file.text(); const rows = parseCSV(text); let imported=0;
        for(let i=1;i<rows.length;i++){ const [valor,data,filialId] = rows[i]; if(!valor) continue; await db.collection('vendas').add({ colaboradorId: state.user?.uid||null, valor:Number(valor||0), data: data? new Date(data).toISOString(): new Date().toISOString(), filialId: filialId||null, createdAt:new Date().toISOString() }); imported++; }
        el.importStatus.textContent = `Importação concluída: ${imported} registros.`;
      }catch(e){ console.error(e); el.importStatus.textContent='Erro: '+(e.message||e); }
    });
  }
  function parseCSV(text){ const lines=text.split(/\r?\n/).filter(Boolean); return lines.map(line=>{ const sep = line.includes(';')?';':','; const parts=[]; let cur='', inside=false; for(let i=0;i<line.length;i++){ const ch=line[i]; if(ch==='"'){ inside=!inside; continue;} if(!inside && ch===sep){ parts.push(cur); cur=''; continue;} cur+=ch; } parts.push(cur); return parts.map(s=>s.trim()); }); }

  // ==== Colaboradores ====
  function attachColabUI(){
    el.btnAbrirColab.addEventListener('click',()=> toggleModal(el.modalColab,true));
    el.closeColab.addEventListener('click',()=> toggleModal(el.modalColab,false));
    el.btnAddColab.addEventListener('click', async ()=>{
      if(!canWrite()) return toast('Sem permissão','error');
      const nome=(el.colabNome.value||'').trim(); const email=(el.colabEmail.value||'').trim(); const cargo=el.colabCargo.value||'vendedor';
      if(!nome||!email) return toast('Preencha nome e e-mail');
      try{ await db.collection('colaboradores').add({ nome, email, cargo, filialId: state.filialId==='default'? null: state.filialId, userUid:null, createdAt:new Date().toISOString() }); el.formColab.reset(); toast('Colaborador adicionado'); }
      catch(e){ console.error(e); toast('Erro ao adicionar: '+(e.message||e),'error'); }
    });
  }
  function renderColaboradores(){ if(!el.listaColab) return; el.listaColab.innerHTML=''; if(!state.colaboradores.length){ el.listaColab.innerHTML='<div class="text-sm text-slate-500">Nenhum colaborador.</div>'; return;} state.colaboradores.forEach((c)=>{ const row=document.createElement('div'); row.className='border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center'; row.innerHTML=`<div class="font-medium">${c.nome||'(sem nome)'}<div class="text-xs text-slate-500">${c.cargo||''}</div></div><div class="text-sm sm:col-span-2">${c.email||''}</div><div class="text-xs text-slate-500">${c.filialId||'—'}</div><div class="flex gap-2 justify-end"><button class="btn-del px-3 py-1.5 text-sm rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50">Excluir</button></div>`; row.querySelector('.btn-del').addEventListener('click', async ()=>{ if(!canWrite()) return toast('Sem permissão','error'); if(!confirm('Excluir colaborador?')) return; try{ await db.collection('colaboradores').doc(c.id).delete(); toast('Colaborador excluído'); }catch(e){ console.error(e); toast('Erro ao excluir: '+(e.message||e),'error'); } }); el.listaColab.appendChild(row); }); }

  // ==== Calendário (metas + vendas por filial) ====
  function attachCalendarUI(){ el.prevMonth.addEventListener('click',()=> shiftMonth(-1)); el.nextMonth.addEventListener('click',()=> shiftMonth(1)); renderCalendar(); }
  function shiftMonth(delta){ const d=new Date(state.currentDate); d.setMonth(d.getMonth()+delta); state.currentDate=d; renderCalendar(); }
  function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
  function endOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }

  function renderCalendar(){
    if(!el.calendarGrid) return;
    const d=new Date(state.currentDate); const monthName=d.toLocaleString('pt-BR',{month:'long',year:'numeric'}); el.currentMonth.textContent = monthName.charAt(0).toUpperCase()+monthName.slice(1);

    const start=startOfMonth(d); const end=endOfMonth(d); const startWeekday=start.getDay(); const daysInMonth=end.getDate();
    el.calendarGrid.innerHTML='';

    for(let i=0;i<startWeekday;i++){ const cell=document.createElement('div'); cell.className='h-28 border border-slate-200 rounded-xl bg-slate-50/60'; el.calendarGrid.appendChild(cell); }

    for(let day=1; day<=daysInMonth; day++){
      const cellDate = new Date(d.getFullYear(), d.getMonth(), day);
      const today = new Date(); const isToday = today.getFullYear()===cellDate.getFullYear() && today.getMonth()===cellDate.getMonth() && today.getDate()===cellDate.getDate();
      const cell=document.createElement('div'); cell.className='h-28 border rounded-xl p-2 flex flex-col gap-1 text-left bg-white '+(isToday?'border-slate-300 ring-2 ring-slate-900/10':'border-slate-200');

      // cabeçalho
      const head=document.createElement('div'); head.className='text-xs font-medium text-slate-500 flex items-center justify-between'; head.innerHTML=`<span>${String(day).padStart(2,'0')}</span>`; cell.appendChild(head);

      // metas do dia (chips)
      const metasDoDia = state.metas.filter((m)=>{ const ini=m.inicio? new Date(m.inicio):null; const fim=m.fim? new Date(m.fim):null; if(!ini&&!fim) return false; const x=cellDate.setHours(0,0,0,0); const a=ini? ini.setHours(0,0,0,0): x; const b=fim? fim.setHours(0,0,0,0): x; return x>=a && x<=b; });
      metasDoDia.slice(0,2).forEach((m)=>{ const tag=document.createElement('div'); const badgeColor=(m.nivel==1?'bg-emerald-100 border-emerald-200': m.nivel==2?'bg-amber-100 border-amber-200':'bg-sky-100 border-sky-200'); tag.className='text-[11px] px-2 py-0.5 rounded-lg border truncate'; tag.className+=` ${badgeColor}`; tag.textContent=`M${m.nivel}: ${m.titulo}`; cell.appendChild(tag); });
      if(metasDoDia.length>2){ const more=document.createElement('div'); more.className='text-[11px] text-slate-500'; more.textContent=`+${metasDoDia.length-2} metas`; cell.appendChild(more); }

      // vendas do dia por filial (agrupado)
      const dayKey = formatDateISO(cellDate);
      const vendasDoDia = state.vendas.filter(v=> formatDateISO(v.data)===dayKey);
      if (vendasDoDia.length){
        const sumByFilial = {};
        vendasDoDia.forEach(v=>{ const key = v.filialId||'Geral'; sumByFilial[key] = (sumByFilial[key]||0) + Number(v.valor||0); });
        const total = Object.values(sumByFilial).reduce((a,b)=>a+b,0);
        const totalEl = document.createElement('div'); totalEl.className='text-[11px] mt-auto font-semibold'; totalEl.textContent = `Total: ${formatCurrency(total)}`; cell.appendChild(totalEl);
        // mostrar até 3 filiais com cor
        Object.entries(sumByFilial).slice(0,3).forEach(([fid, val])=>{
          const line=document.createElement('div'); line.className='text-[11px] flex items-center gap-2';
          const color = state.filiaisByCodigo[fid]?.cor || '#94a3b8';
          const dot = `<span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${color}"></span>`;
          line.innerHTML = `${dot} <span class="truncate">${fid}</span> <span class="ml-auto font-medium">${formatCurrency(val)}</span>`;
          cell.appendChild(line);
        });
        if(Object.keys(sumByFilial).length>3){ const moreF=document.createElement('div'); moreF.className='text-[11px] text-slate-500'; moreF.textContent = `+${Object.keys(sumByFilial).length-3} fil.`; cell.appendChild(moreF); }
      }

      el.calendarGrid.appendChild(cell);
    }
  }

  // ==== KPIs do Dashboard ====
  function computeKPIs(){
    // Vendas Hoje e Mês (respeitando filtro de filial)
    const todayKey = formatDateISO(new Date());
    const current = new Date(state.currentDate);
    const y=current.getFullYear(), m=current.getMonth();
    const startM = new Date(y,m,1), endM = new Date(y,m+1,0);

    const vendas = state.vendas;
    const vendasHoje = vendas.filter(v=> formatDateISO(v.data)===todayKey).reduce((s,v)=> s+Number(v.valor||0), 0);
    const vendasMes = vendas.filter(v=> { const d=new Date(v.data); return d>=startM && d<=endM; }).reduce((s,v)=> s+Number(v.valor||0), 0);
    el.kpiVendasHoje && (el.kpiVendasHoje.textContent = formatCurrency(vendasHoje));
    el.kpiVendasMes && (el.kpiVendasMes.textContent = formatCurrency(vendasMes));

    // Ações próximos 7 dias
    const now = new Date(); const plus7 = new Date(now); plus7.setDate(plus7.getDate()+7);
    const acoes7 = state.acoes.filter(a=>{ const d=new Date(a.data); return d>=now && d<=plus7; }).length;
    el.kpiAcoes && (el.kpiAcoes.textContent = String(acoes7));

    // Progresso das metas (vendas do mês / soma metas do mês)
    const metasMes = state.metas.filter(m=>{
      const ini = m.inicio? new Date(m.inicio): null; const fim = m.fim? new Date(m.fim): null; if(!ini&&!fim) return false;
      const start=startM.getTime(), end=endM.getTime();
      const a= ini? ini.getTime(): start; const b= fim? fim.getTime(): end; // overlap simples
      return !(b<start || a>end);
    });
    const alvo = metasMes.reduce((s,m)=> s + Number(m.valor||0), 0);
    const pct = alvo>0 ? Math.min(100, Math.round((vendasMes/alvo)*100)) : 0;
    if (el.kpiProgressoBar){ el.kpiProgressoBar.style.width = pct+'%'; el.kpiProgressoBar.classList.remove('bg-emerald-500','bg-amber-500','bg-rose-500'); el.kpiProgressoBar.classList.add(pct<50?'bg-rose-500': pct<80?'bg-amber-500':'bg-emerald-500'); }
    if (el.kpiProgressoLabel) el.kpiProgressoLabel.textContent = pct+'%';
  }

  // ==== Inicialização ====
  function init(){
    cacheDom(); attachTabs(); attachGlobalModalUX(); attachAuthUI(); attachBranchSelect(); attachFiliaisAdmin(); attachMetasUI(); attachVendasUI(); attachImportUI(); attachColabUI(); attachCalendarUI();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
