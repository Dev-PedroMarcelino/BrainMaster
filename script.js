/* =============================================================
   BrainMaster — App Logic
   Stack: PDF.js, D3 (custom mind map), html2canvas, jsPDF
   ============================================================= */

(() => {
  'use strict';

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const state = {
    files: [],
    rawText: '',
    extractedTexts: [],
    markdown: '',
    root: null,
    rootData: null,
    customBg: null,
    deleteMode: false,
    selectedNode: null,
    aiConfig: {
      enabled: false,
      preset: '',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
    },
    lastSource: 'local',
  };

  const $ = (id) => document.getElementById(id);
  const dom = {
    bgLayer: $('bgLayer'),
    themeToggle: $('themeToggle'),
    resetAllBtn: $('resetAllBtn'),
    dropzone: $('dropzone'),
    fileInput: $('fileInput'),
    fileList: $('fileList'),
    fileCount: $('fileCount'),
    generateBtn: $('generateBtn'),
    customPanel: $('customPanel'),
    exportPanel: $('exportPanel'),
    branchColor: $('branchColor'),
    branchColorHex: $('branchColorHex'),
    textColor: $('textColor'),
    textColorHex: $('textColorHex'),
    bgImage: $('bgImage'),
    bgImageCustom: $('bgImageCustom'),
    mapDensity: $('mapDensity'),
    showIcons: $('showIcons'),
    enableGradient: $('enableGradient'),
    emptyState: $('emptyState'),
    emptyCta: $('emptyCta'),
    mindmapWrap: $('mindmapWrap'),
    mapStage: $('mapStage'),
    markmapSvg: $('markmap'),
    mapTitle: $('mapTitle'),
    mapStats: $('mapStats'),
    zoomIn: $('zoomIn'),
    zoomOut: $('zoomOut'),
    zoomReset: $('zoomReset'),
    fitBtn: $('fitBtn'),
    toggleDelete: $('toggleDelete'),
    redoBtn: $('redoBtn'),
    exportPNG: $('exportPNG'),
    exportPDF: $('exportPDF'),
    loadingOverlay: $('loadingOverlay'),
    loaderText: $('loaderText'),
    loaderBar: $('loaderBar'),
    loaderSteps: $('loaderSteps'),
    toastStack: $('toastStack'),
    contextMenu: $('contextMenu'),
    aiEnabled: $('aiEnabled'),
    aiConfigBox: $('aiConfig'),
    aiBaseUrl: $('aiBaseUrl'),
    aiApiKey: $('aiApiKey'),
    aiModel: $('aiModel'),
    aiKeyToggle: $('aiKeyToggle'),
    aiTestBtn: $('aiTestBtn'),
    aiPreset: $('aiPreset'),
  };

  // ============================================================
  // TOASTS
  // ============================================================
  function toast(message, type = 'info', duration = 3500) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = {
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    };
    el.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    dom.toastStack.appendChild(el);
    setTimeout(() => {
      el.classList.add('fadeOut');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  // ============================================================
  // THEME
  // ============================================================
  const savedTheme = localStorage.getItem('bm_theme') || 'dark';
  document.body.dataset.theme = savedTheme;
  dom.themeToggle.addEventListener('click', () => {
    const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = next;
    localStorage.setItem('bm_theme', next);
    render();
  });

  // ============================================================
  // BACKGROUND IMAGE
  // ============================================================
  function setBackground(src) {
    if (!src || src === 'default') {
      dom.bgLayer.style.backgroundImage = '';
      return;
    }
    const url = src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http')
      ? src
      : `assets/backgrounds/${src}`;
    dom.bgLayer.style.backgroundImage = `url("${url}")`;
    dom.bgLayer.style.backgroundSize = 'cover';
    dom.bgLayer.style.backgroundPosition = 'center';
  }
  dom.bgImage.addEventListener('change', (e) => {
    const v = e.target.value;
    if (v === 'custom') dom.bgImageCustom.click();
    else { state.customBg = null; setBackground(v); }
  });
  dom.bgImageCustom.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      state.customBg = ev.target.result;
      setBackground(state.customBg);
      toast('Imagem de fundo aplicada', 'success');
    };
    reader.readAsDataURL(f);
  });
  setBackground('default');

  // ============================================================
  // AI CONFIG
  // ============================================================
  try {
    const savedAI = JSON.parse(localStorage.getItem('bm_ai') || 'null');
    if (savedAI && typeof savedAI === 'object') {
      state.aiConfig = { ...state.aiConfig, ...savedAI };
    }
  } catch (_) {}
  const persistAI = () => {
    try { localStorage.setItem('bm_ai', JSON.stringify(state.aiConfig)); } catch (_) {}
  };
  function applyAIConfigToUI() {
    dom.aiEnabled.checked = !!state.aiConfig.enabled;
    dom.aiBaseUrl.value = state.aiConfig.baseUrl || '';
    dom.aiApiKey.value = state.aiConfig.apiKey || '';
    dom.aiModel.value = state.aiConfig.model || '';
    dom.aiConfigBox.hidden = !state.aiConfig.enabled;
    dom.aiPreset.value = state.aiConfig.preset || '';
  }
  applyAIConfigToUI();
  dom.aiEnabled.addEventListener('change', () => {
    state.aiConfig.enabled = dom.aiEnabled.checked;
    dom.aiConfigBox.hidden = !state.aiConfig.enabled;
    persistAI();
  });

  const AI_PRESETS = {
    groq:      { baseUrl: 'https://api.groq.com/openai/v1',  model: 'llama-3.1-8b-instant' },
    openrouter:{ baseUrl: 'https://openrouter.ai/api/v1',    model: 'meta-llama/llama-3.1-8b-instruct:free' },
    gemini:    { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash' },
    openai:    { baseUrl: 'https://api.openai.com/v1',       model: 'gpt-4o-mini' },
    together:  { baseUrl: 'https://api.together.xyz/v1',     model: 'meta-llama/Llama-3.1-8B-Instruct' },
  };
  dom.aiPreset.addEventListener('change', () => {
    const v = dom.aiPreset.value;
    if (!v) return;
    const p = AI_PRESETS[v];
    if (!p) return;
    state.aiConfig.preset = v;
    state.aiConfig.baseUrl = p.baseUrl;
    state.aiConfig.model = p.model;
    dom.aiBaseUrl.value = p.baseUrl;
    dom.aiModel.value = p.model;
    persistAI();
  });
  dom.aiBaseUrl.addEventListener('input', () => { state.aiConfig.baseUrl = dom.aiBaseUrl.value.trim(); persistAI(); });
  dom.aiApiKey.addEventListener('input', () => { state.aiConfig.apiKey = dom.aiApiKey.value.trim(); persistAI(); });
  dom.aiModel.addEventListener('input', () => { state.aiConfig.model = dom.aiModel.value.trim(); persistAI(); });
  dom.aiKeyToggle.addEventListener('click', () => {
    dom.aiApiKey.type = dom.aiApiKey.type === 'password' ? 'text' : 'password';
  });
  dom.aiTestBtn.addEventListener('click', async () => {
    showLoading('Testando conexão com a IA...');
    try {
      await testAIConnection();
      hideLoading();
      toast('Conexão com IA OK!', 'success');
    } catch (err) {
      hideLoading();
      toast('Falha: ' + (err.message || err), 'error', 5000);
    }
  });

  async function testAIConnection() {
    const base = state.aiConfig.baseUrl.replace(/\/+$/, '');
    const key = state.aiConfig.apiKey;
    if (!key) throw new Error('Informe a API key');
    const model = state.aiConfig.model;
    const url = `${base}/chat/completions`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Responda apenas com a palavra: ok' },
        ],
        max_tokens: 5,
        temperature: 0,
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error(`HTTP ${r.status} — ${t.slice(0, 160)}`);
    }
    return true;
  }

  async function callAIForHierarchy(text, density) {
    const base = state.aiConfig.baseUrl.replace(/\/+$/, '');
    const key = state.aiConfig.apiKey;
    const model = state.aiConfig.model;
    if (!key) throw new Error('API key não configurada');

    const maxRoots = Math.max(3, Math.min(5, Math.ceil(density * 1.2)));
    const subCount = Math.max(1, Math.ceil(density / 2));

    const truncated = text.length > 24000 ? text.slice(0, 24000) + '\n\n[...texto truncado...]' : text;

    const systemPrompt = `Você é um especialista em resumir conteúdo acadêmico (slides de aula, artigos, PDFs) em mapas mentais hierárquicos em português.

REGRAS OBRIGATÓRIAS:
- Responda EXCLUSIVAMENTE com um JSON válido, sem markdown, sem explicações antes ou depois.
- O JSON deve seguir EXATAMENTE este formato:
  {"name":"<título central curto, máx 7 palavras>","children":[{"name":"<tópico principal>","children":[{"name":"<detalhe curto, máx 12 palavras>"}]}]}
- Máximo de ${maxRoots} tópicos principais em "children".
- Cada tópico principal tem no máximo ${subCount} sub-itens.
- Use português do Brasil.
- Foque nos conceitos centrais. Ignore exemplos repetitivos, números de página, referências bibliográficas.
- Seja conciso: títulos curtos e informativos.`;

    const userPrompt = `Analise o texto abaixo (de ${truncated.length > 0 ? 'múltiplos PDFs acadêmicos' : 'um PDF'}) e gere o mapa mental em JSON.\n\nTEXTO:\n"""\n${truncated}\n"""`;

    const url = `${base}/chat/completions`;
    const body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1800,
    };
    if (/openai|gpt|o1|o3|o4/i.test(model) || /openai\.com/.test(base)) {
      body.response_format = { type: 'json_object' };
    }

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error(`IA HTTP ${r.status} — ${t.slice(0, 200)}`);
    }
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const json = extractJSON(content);
    if (!json) throw new Error('IA não retornou JSON válido');
    return normalizeAIData(json);
  }

  function extractJSON(s) {
    if (!s) return null;
    try {
      const trimmed = s.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);
    } catch (_) {}
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
      try { return JSON.parse(fence[1].trim()); } catch (_) {}
    }
    const first = s.indexOf('{');
    const last = s.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try { return JSON.parse(s.slice(first, last + 1)); } catch (_) {}
    }
    return null;
  }

  function normalizeAIData(obj) {
    if (!obj || typeof obj !== 'object') return { name: 'Conteúdo', children: [] };
    const name = String(obj.name || obj.title || 'Conteúdo').slice(0, 60);
    const children = Array.isArray(obj.children) ? obj.children : [];
    const clean = children
      .filter((c) => c && (c.name || c.title))
      .slice(0, 8)
      .map((c) => {
        const cn = String(c.name || c.title).slice(0, 70);
        const subs = Array.isArray(c.children) ? c.children : [];
        const cs = subs
          .filter((s) => s && (s.name || s.title))
          .slice(0, 5)
          .map((s) => ({ name: String(s.name || s.title).slice(0, 140) }));
        return { name: cn, children: cs };
      })
      .filter((c) => c.children.length > 0);
    return { name, children: clean };
  }

  // ============================================================
  // FILE UPLOAD
  // ============================================================
  dom.dropzone.addEventListener('click', () => dom.fileInput.click());
  dom.emptyCta.addEventListener('click', () => dom.fileInput.click());
  ['dragenter', 'dragover'].forEach((ev) => {
    dom.dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dom.dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach((ev) => {
    dom.dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dom.dropzone.classList.remove('dragover');
    });
  });
  dom.dropzone.addEventListener('drop', (e) => {
    handleFiles([...(e.dataTransfer.files || [])]);
  });
  dom.fileInput.addEventListener('change', (e) => {
    handleFiles([...e.target.files]);
    e.target.value = '';
  });

  function handleFiles(files) {
    const pdfs = files.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) { toast('Apenas arquivos PDF são suportados', 'warn'); return; }
    pdfs.forEach((f) => state.files.push(f));
    renderFileList();
    toast(`${pdfs.length} PDF(s) adicionado(s)`, 'success');
  }

  function renderFileList() {
    dom.fileList.innerHTML = '';
    state.files.forEach((f, idx) => {
      const li = document.createElement('li');
      li.className = 'file-item';
      li.innerHTML = `
        <div class="file-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="file-info">
          <div class="file-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
          <div class="file-size">${formatSize(f.size)}</div>
        </div>
        <button class="file-remove" data-idx="${idx}" title="Remover">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>`;
      dom.fileList.appendChild(li);
    });
    dom.fileCount.textContent = state.files.length;
    dom.generateBtn.disabled = state.files.length === 0;
  }

  dom.fileList.addEventListener('click', (e) => {
    const btn = e.target.closest('.file-remove');
    if (!btn) return;
    state.files.splice(+btn.dataset.idx, 1);
    renderFileList();
  });

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  // ============================================================
  // LOADING
  // ============================================================
  function showLoading(text = 'Processando...') {
    dom.loadingOverlay.hidden = false;
    dom.loaderText.textContent = text;
    dom.loaderBar.style.width = '0%';
    [...dom.loaderSteps.children].forEach((s) => s.classList.remove('active', 'done'));
    dom.loaderSteps.children[0].classList.add('active');
  }
  function updateLoading(progress, text, stepIdx) {
    dom.loaderBar.style.width = progress + '%';
    if (text) dom.loaderText.textContent = text;
    if (stepIdx != null) {
      [...dom.loaderSteps.children].forEach((s, i) => {
        s.classList.remove('active', 'done');
        if (i < stepIdx) s.classList.add('done');
        else if (i === stepIdx) s.classList.add('active');
      });
    }
  }
  function hideLoading() { dom.loadingOverlay.hidden = true; }

  // ============================================================
  // PDF TEXT EXTRACTION
  // ============================================================
  async function extractTextFromPDF(file) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const pages = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      const linesMap = new Map();
      tc.items.forEach((it) => {
        if (!it.str) return;
        const y = Math.round(it.transform[5]);
        if (!linesMap.has(y)) linesMap.set(y, []);
        linesMap.get(y).push(it.str);
      });
      const sortedY = [...linesMap.keys()].sort((a, b) => b - a);
      const paragraphs = [];
      let buf = [];
      let prevY = null;
      for (const y of sortedY) {
        const line = linesMap.get(y).join(' ').replace(/\s+/g, ' ').trim();
        if (!line) continue;
        if (prevY !== null && (prevY - y) > 30) {
          if (buf.length) paragraphs.push(buf.join(' ').replace(/\s+/g, ' ').trim());
          buf = [];
        }
        buf.push(line);
        prevY = y;
      }
      if (buf.length) paragraphs.push(buf.join(' ').replace(/\s+/g, ' ').trim());
      pages.push(paragraphs.join('\n\n'));
    }
    const full = pages.join('\n\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    return { name: file.name.replace(/\.pdf$/i, ''), text: full, pages: pdf.numPages };
  }

  // ============================================================
  // NLP / HIERARCHY
  // ============================================================
  const STOPWORDS = new Set((
    'a,à,as,o,os,um,uma,uns,umas,e,ou,mas,que,de,do,da,dos,das,no,na,nos,nas,em,por,para,com,sem,sob,sobre,entre,até,após,desde,foi,é,são,ser,estar,está,ter,tem,tinha,terá,será,se,sua,seu,suas,seus,isso,isto,aquilo,este,esta,estes,estas,aquele,aquela,aqueles,aquelas,eu,você,ele,ela,nós,vós,eles,elas,me,te,se,lhe,nos,vos,them,my,your,his,her,its,our,their,the,a,an,and,or,but,of,in,on,at,to,for,with,without,by,from,is,are,was,were,be,been,being,have,has,had,do,does,did,will,would,should,could,may,might,can,this,that,these,those,i,you,he,she,it,we,they,what,which,who,whom,as,if,than,then,so,because,while,such,not,no,yes,muito,mais,menos,também,como,quando,onde,aos,após,através,contra,desde,entre,perante,segundo,sobre,trás,fora,dentro,tal,qual,quais,quem,são,foi'
  ).split(','));

  function tokenize(text) {
    return (text.toLowerCase().match(/[a-záàâãéèêíïóôõöúçñ0-9][a-záàâãéèêíïóôõöúçñ0-9-]{2,}/g) || [])
      .filter((w) => !STOPWORDS.has(w) && w.length > 2);
  }

  function splitSentences(text) {
    return text.split(/(?<=[.!?])\s+(?=[A-ZÁÀÂÃÉÊÍÏÓÔÕÚÇ0-9])/).map((s) => s.trim()).filter((s) => s.length > 12);
  }

  function topKeywords(tokens, n = 25) {
    const freq = new Map();
    tokens.forEach((t) => freq.set(t, (freq.get(t) || 0) + 1));
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k, v]) => ({ word: k, count: v }));
  }

  function bigrams(tokens) {
    const m = new Map();
    for (let i = 0; i < tokens.length - 1; i++) {
      const a = tokens[i], b = tokens[i + 1];
      if (STOPWORDS.has(a) || STOPWORDS.has(b)) continue;
      const k = `${a} ${b}`;
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].filter(([_, c]) => c >= 2).sort((a, b) => b[1] - a[1]);
  }

  function isLikelyTitle(line) {
    const t = line.trim();
    if (!t) return false;
    if (t.length > 90) return false;
    if (t.length < 4) return false;
    const words = t.split(/\s+/);
    if (words.length < 1 || words.length > 10) return false;
    const caps = (t.match(/[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/g) || []).length;
    const letters = (t.match(/[A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÊÍÏÓÔÕÖÚÇÑ]/g) || []).length || 1;
    if (caps / letters > 0.4 && words.length <= 7) return true;
    if (/^\d+(\.\d+)*\s+/.test(t) && words.length <= 9) return true;
    if (/^(chapter|capítulo|section|seção|parte|part|introdução|introduction|conclusão|conclusion|resumo|summary|abstract|sumário|appendix|anexo|prefácio|preface)\b/i.test(t)) return true;
    if (/^(cap[íi]tulo|se[cç][ãa]o)\s+\d+/i.test(t)) return true;
    return false;
  }

  // Split a paragraph by inline title patterns
  function splitParagraphByTitles(para) {
    const t = para.trim();
    if (t.length < 30) return [{ title: null, content: [t] }];

    // Find marker positions
    const markerRegex = /(\d+\.\d+(?:\.\d+)?|Cap[íi]tulo\s+\d+|Chapter\s+\d+|Se[çc][ãa]o\s+\d+|Section\s+\d+|Parte\s+\d+|Part\s+\d+|Appendix\s+\w+|Anexo\s+\w+)/gi;
    const markers = [];
    let m;
    while ((m = markerRegex.exec(t)) !== null) {
      markers.push({ idx: m.index, marker: m[1] });
      if (markers.length > 30) break;
    }
    if (markers.length === 0) return [{ title: null, content: [t] }];

    const isArticle = (w) => /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(w) && w.length <= 4 && /^(O|A|E|Os|As|Um|Uma|No|Na|Nos|Nas|Do|Da|Dos|Das|Que|Se|The|Of|In|To|For|Is|Are|And|Or|It|He|She|We|They)$/.test(w);

    function buildTitle(text, startIdx, markerLen) {
      // Get the text after marker, keeping punctuation
      const afterRaw = text.slice(startIdx + markerLen);
      // Strip leading whitespace and basic punctuation but keep the colon
      const afterTrimmed = afterRaw.replace(/^[\s]+/, '');
      const words = afterTrimmed.split(/\s+/).filter(Boolean);
      const out = [];
      for (const w of words) {
        const clean = w.replace(/[,;]+$/, '');
        if (!clean) continue;
        if (isArticle(clean)) {
          if (out.length === 0) continue;
          break;
        }
        out.push(clean);
        if (out.length >= 4) break;
      }
      // Build title text including any colon
      let titleStr = (text.slice(startIdx, startIdx + markerLen) + (out.length ? ' ' + out.join(' ') : '')).replace(/\s+/g, ' ').trim();
      // Clean up "X :" -> "X:"
      titleStr = titleStr.replace(/\s+:/g, ':');
      // Compute consumed length: the raw slice up to the end of consumed words
      const consumedRaw = out.join(' ');
      const consumedLen = (text.slice(startIdx + markerLen).match(new RegExp('^\\s*' + consumedRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').split(' ').map(w => '(?:' + w + '\\s*)').join(''))) || [''])[0].length;
      return { title: titleStr, consumedLen };
    }

    const sections = [];

    // Content before first marker
    if (markers[0].idx > 5) {
      const before = t.slice(0, markers[0].idx).trim();
      const tokens = before.split(/\s+/).filter(Boolean);
      const isArticle = (w) => /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(w) && w.length <= 4 && /^(O|A|E|Os|As|Um|Uma|No|Na|Nos|Nas|Do|Da|Dos|Das)$/.test(w);
      const leadOut = [];
      for (const tk of tokens) {
        if (leadOut.length >= 1 && isArticle(tk)) break;
        if (leadOut.length >= 4) break;
        leadOut.push(tk);
      }
      if (leadOut.length > 0) {
        const leadTitle = leadOut.join(' ');
        const leadContent = before.slice(leadTitle.length).trim().replace(/^[.!?]\s*/, '');
        sections.push({ title: leadTitle, content: leadContent ? [leadContent] : [] });
      } else {
        sections.push({ title: null, content: [before] });
      }
    }

    for (let i = 0; i < markers.length; i++) {
      const cur = markers[i];
      const next = markers[i + 1];
      const { title, consumedLen } = buildTitle(t, cur.idx, cur.marker.length);
      const titleEnd = cur.idx + cur.marker.length + consumedLen;
      const contentEnd = next ? next.idx : t.length;
      const content = t.slice(titleEnd, contentEnd).trim().replace(/^[.!?]\s*/, '');
      sections.push({ title, content: content ? [content] : [] });
    }

    return sections.length > 0 ? sections : [{ title: null, content: [t] }];
  }

  function buildHierarchy(text, density) {
    const allText = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    const paragraphs = allText.split(/\n+/).map((p) => p.trim()).filter(Boolean);

    const sections = [];
    let current = { title: null, content: [] };
    for (const para of paragraphs) {
      // Try to split paragraph by inline section markers
      const inlineSections = splitParagraphByTitles(para);
      if (inlineSections.length > 1) {
        if (current.title || current.content.length) sections.push(current);
        inlineSections.forEach((s) => sections.push(s));
        current = { title: null, content: [] };
      } else if (isLikelyTitle(para)) {
        if (current.title || current.content.length) sections.push(current);
        current = { title: para, content: [] };
      } else {
        current.content.push(para);
      }
    }
    if (current.title || current.content.length) sections.push(current);

    let workingSections = sections.filter((s) => s.title || s.content.length);
    if (workingSections.length <= 1 && paragraphs.length > 0) {
      workingSections = paragraphs.slice(0, 20).map((p) => {
        const inlineSplit = splitParagraphByTitles(p);
        if (inlineSplit.length > 1) return inlineSplit;
        const firstWords = p.split(/\s+/).slice(0, 6).join(' ');
        return [{
          title: firstWords.length > 12 ? firstWords.slice(0, 60) + (firstWords.length > 60 ? '...' : '') : firstWords,
          content: [p],
        }];
      }).flat();
    }

    if (workingSections.length === 0) {
      workingSections = [{ title: 'Conteúdo', content: paragraphs }];
    }

    const totalTokens = workingSections.flatMap((s) => tokenize((s.title || '') + ' ' + s.content.join(' ')));
    const topGlobal = topKeywords(totalTokens, Math.max(6, density * 3));
    const topBigrams = bigrams(totalTokens).slice(0, 5);

    const seen = new Set();
    const rootTerms = [];
    const maxRoots = Math.max(3, Math.min(5, Math.ceil(density * 1.2)));
    topBigrams.forEach(([bg]) => {
      if (rootTerms.length >= maxRoots) return;
      const key = bg.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        rootTerms.push({ term: bg, bigram: true });
      }
    });
    topGlobal.forEach((k) => {
      if (rootTerms.length >= maxRoots) return;
      const key = k.word.toLowerCase();
      if (!seen.has(key) && k.word.length > 3) {
        seen.add(key);
        rootTerms.push({ term: k.word, bigram: false });
      }
    });

    const result = { name: 'BrainMaster', children: [] };
    const used = new Set();

    rootTerms.forEach(({ term }) => {
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const node = { name: capitalize(term), children: [] };
      workingSections.forEach((s, idx) => {
        if (used.has(idx)) return;
        const content = (s.title || '') + ' ' + s.content.join(' ');
        if (!regex.test(content)) return;

        const sentences = splitSentences(s.content.join(' '));
        const subs = [];
        sentences.forEach((sent) => {
          if (regex.test(sent) && sent.length < 240) {
            const clean = sent.trim();
            if (clean) subs.push(clean);
          }
        });

        if (subs.length > 0) {
          const childTitle = s.title || capitalize(term);
          const subCount = Math.max(1, Math.ceil(density / 2));
          node.children.push({
            name: childTitle.length > 60 ? childTitle.slice(0, 57) + '...' : childTitle,
            children: subs.slice(0, subCount).map((x) => ({ name: x.length > 110 ? x.slice(0, 107) + '...' : x })),
          });
          used.add(idx);
        } else if (s.title) {
          node.children.push({ name: s.title.length > 60 ? s.title.slice(0, 57) + '...' : s.title });
          used.add(idx);
        }
      });
      if (node.children.length > 0) result.children.push(node);
    });

    const remaining = workingSections.filter((_, i) => !used.has(i));
    if (remaining.length > 0) {
      const others = { name: 'Outros Tópicos', children: [] };
      remaining.slice(0, 3).forEach((s) => {
        if (s.title) {
          const sub = splitSentences(s.content.join(' ')).slice(0, 2).map((x) => ({ name: x.length > 110 ? x.slice(0, 107) + '...' : x }));
          if (sub.length) others.children.push({ name: s.title.length > 60 ? s.title.slice(0, 57) + '...' : s.title, children: sub });
          else others.children.push({ name: s.title.length > 60 ? s.title.slice(0, 57) + '...' : s.title });
        } else if (s.content[0]) {
          others.children.push({ name: s.content[0].slice(0, 60) + (s.content[0].length > 60 ? '...' : '') });
        }
      });
      if (others.children.length > 0) result.children.push(others);
    }

    if (result.children.length === 0) {
      const sents = splitSentences(allText).slice(0, 8);
      result.children = sents.map((s) => ({ name: s.length > 90 ? s.slice(0, 87) + '...' : s }));
    }

    return result;
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ============================================================
  // D3 MIND MAP RENDERER
  // ============================================================
  const svg = d3.select(dom.markmapSvg);
  const gRoot = svg.append('g').attr('class', 'mm-root');
  const gLinks = gRoot.append('g').attr('class', 'mm-links');
  const gNodes = gRoot.append('g').attr('class', 'mm-nodes');

  const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      const t = event.transform;
      if (!isFinite(t.k) || !isFinite(t.x) || !isFinite(t.y)) return;
      gRoot.attr('transform', t);
    });
  svg.call(zoom);

  let currentRoot = null;

  function getBranchColors() {
    const base = dom.branchColor.value;
    if (!dom.enableGradient.checked) {
      return Array(8).fill(base);
    }
    return [
      dom.branchColor.value,
      mix(base, '#ec4899', 0.5),
      '#ec4899',
      mix(base, '#06b6d4', 0.5),
      '#06b6d4',
      mix(base, '#10b981', 0.5),
      '#10b981',
      mix(base, '#f59e0b', 0.5),
    ];
  }

  function getTextColor() { return dom.textColor.value; }

  function mix(c1, c2, t) {
    const a = hexToRgb(c1), b = hexToRgb(c2);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return `rgb(${r}, ${g}, ${bl})`;
  }
  function hexToRgb(h) {
    const v = h.replace('#', '');
    return { r: parseInt(v.slice(0, 2), 16), g: parseInt(v.slice(2, 4), 16), b: parseInt(v.slice(4, 6), 16) };
  }

  function escapeXml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[m]));
  }

  const NODE_ICONS = {
    root: '🧠',
    intelligence: '🤖',
    neural: '⚡',
    data: '📊',
    learning: '📚',
    tech: '⚙️',
    ethics: '⚖️',
    chapter: '📑',
    section: '🔹',
    general: '•',
  };

  function getIconForName(name) {
    if (!name) return NODE_ICONS.general;
    const lower = name.toLowerCase();
    if (lower.includes('inteligência') || lower.includes('artificial') || lower.includes('ia ')) return NODE_ICONS.intelligence;
    if (lower.includes('rede') || lower.includes('neural')) return NODE_ICONS.neural;
    if (lower.includes('dado') || lower.includes('data')) return NODE_ICONS.data;
    if (lower.includes('aprend') || lower.includes('machine') || lower.includes('trein')) return NODE_ICONS.learning;
    if (lower.includes('ética') || lower.includes('responsabilid') || lower.includes('tendências') || lower.includes('futuro')) return NODE_ICONS.ethics;
    if (lower.includes('capítulo') || lower.includes('chapter') || lower.includes('1.') || lower.includes('2.') || lower.includes('3.')) return NODE_ICONS.chapter;
    if (lower.includes('seção') || lower.includes('section')) return NODE_ICONS.section;
    if (lower.includes('arquitetura') || lower.includes('tecnolog') || lower.includes('otimizaç')) return NODE_ICONS.tech;
    return NODE_ICONS.general;
  }

  function wrapText(text, maxCharsPerLine = 28, maxLines = 4) {
    const words = text.split(/\s+/);
    const lines = [];
    let current = '';
    for (const w of words) {
      if ((current + ' ' + w).trim().length > maxCharsPerLine) {
        if (current) lines.push(current.trim());
        current = w.length > maxCharsPerLine ? w.slice(0, maxCharsPerLine - 1) + '-' : w;
      } else {
        current = (current + ' ' + w).trim();
      }
    }
    if (current) lines.push(current);
    return lines.slice(0, maxLines);
  }

  function buildHierarchyData(data) {
    return d3.hierarchy(data);
  }

  function render() {
    if (!state.root) return;
    renderMindMap(state.root);
  }

  function renderMindMap(root) {
    currentRoot = root;
    gLinks.selectAll('*').remove();
    gNodes.selectAll('*').remove();

    const treeLayout = d3.tree()
      .nodeSize([180, 240])
      .separation((a, b) => (a.parent === b.parent ? 1.1 : 1.8));

    const tree = treeLayout(root);
    const nodes = tree.descendants();
    const links = tree.links();

    const textColor = getTextColor();
    const colors = getBranchColors();
    const isLight = document.body.dataset.theme === 'light';

    // Links (vertical curved paths — root on top, children below)
    gLinks.selectAll('path')
      .data(links)
      .join('path')
      .attr('d', d3.linkVertical()
        .x((d) => d.x)
        .y((d) => d.y))
      .attr('fill', 'none')
      .attr('stroke', (d) => colors[d.target.depth % colors.length])
      .attr('stroke-width', (d) => Math.max(1.5, 4 - d.target.depth))
      .attr('stroke-opacity', 0.7)
      .attr('stroke-linecap', 'round');

    // Nodes
    const node = gNodes.selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'mm-node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .attr('data-depth', (d) => d.depth)
      .style('cursor', 'pointer');

    const showIcons = dom.showIcons.checked;
    const fontSize = (d) => d.depth === 0 ? 18 : d.depth === 1 ? 15 : 13;
    const lineHeight = (d) => d.depth === 0 ? 22 : d.depth === 1 ? 19 : 17;
    const charW = (d) => d.depth === 0 ? 9.5 : d.depth === 1 ? 8.0 : 7.0;
    const maxChars = (d) => d.depth === 0 ? 22 : d.depth === 1 ? 26 : 32;
    const maxLines = (d) => d.depth === 0 ? 2 : 3;
    const padX = 14, padY = 10;

    // First pass: compute layout for each node
    const layout = nodes.map((d) => {
      const lines = wrapText(String(d.data.name || ''), maxChars(d), maxLines(d));
      const icon = showIcons ? (d.depth === 0 ? '🧠 ' : getIconForName(d.data.name) + ' ') : '';
      const measured = lines.map((ln, i) => (i === 0 ? icon + ln : ln));
      const longest = measured.reduce((m, s) => Math.max(m, s.length), 0);
      const w = Math.max(80, longest * charW(d) + padX * 2);
      const h = lines.length * lineHeight(d) + padY * 2;
      return { d, lines, icon, w, h };
    });

    // SVG defs for shadow
    if (!svg.select('defs').node()) svg.append('defs');
    const defs = svg.select('defs');
    if (!defs.select('#mm-shadow').node()) {
      const f = defs.append('filter').attr('id', 'mm-shadow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
      f.append('feGaussianBlur').attr('in', 'SourceAlpha').attr('stdDeviation', '3');
      f.append('feOffset').attr('dx', 0).attr('dy', 2).attr('result', 'offsetblur');
      f.append('feComponentTransfer').append('feFuncA').attr('type', 'linear').attr('slope', 0.35);
      const merge = f.append('feMerge');
      merge.append('feMergeNode');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    }

    // Draw rects
    const nodeByDatum = new Map();
    node.each(function (d) { nodeByDatum.set(d, this); });
    layout.forEach((info) => {
      const el = nodeByDatum.get(info.d);
      if (!el) return;
      const g = d3.select(el);
      const color = colors[info.d.depth % colors.length];
      const isRoot = info.d.depth === 0;
      const isLevel1 = info.d.depth === 1;

      const rectX = -info.w / 2;
      const rectY = -info.h / 2;

      g.append('rect')
        .attr('class', 'mm-card')
        .attr('x', rectX)
        .attr('y', rectY)
        .attr('width', info.w)
        .attr('height', info.h)
        .attr('rx', isRoot ? 12 : 8)
        .attr('ry', isRoot ? 12 : 8)
        .attr('fill', isRoot
          ? color
          : (isLight ? 'rgba(255,255,255,0.92)' : 'rgba(15, 19, 32, 0.92)'))
        .attr('stroke', color)
        .attr('stroke-width', isRoot ? 0 : (isLevel1 ? 1.8 : 1.2))
        .attr('stroke-opacity', isRoot ? 0 : 0.9)
        .attr('filter', isRoot ? 'url(#mm-shadow)' : null);
    });

    // Draw text
    layout.forEach((info) => {
      const el = nodeByDatum.get(info.d);
      if (!el) return;
      const g = d3.select(el);
      const color = colors[info.d.depth % colors.length];
      const isRoot = info.d.depth === 0;
      const isLevel1 = info.d.depth === 1;
      const fill = isRoot ? '#0b0f1a' : (isLevel1 ? color : textColor);

      const textX = 0;
      const lh = lineHeight(info.d);
      const totalH = info.lines.length * lh;
      const startY = -totalH / 2 + lh / 2 + 3;

      const text = g.append('text')
        .attr('class', 'mm-text')
        .attr('x', textX)
        .attr('y', startY)
        .attr('text-anchor', 'middle')
        .attr('fill', fill)
        .attr('font-family', 'Inter, sans-serif')
        .attr('font-weight', isRoot ? 800 : isLevel1 ? 700 : 500)
        .attr('font-size', fontSize(info.d))
        .text('');

      info.lines.forEach((line, i) => {
        text.append('tspan')
          .attr('x', textX)
          .attr('y', startY + i * lh)
          .text((i === 0 ? info.icon : '') + line);
      });
    });

    // Click handlers
    node.on('click', function (event, d) {
      event.stopPropagation();
      if (state.deleteMode) deleteNode(d);
      else showContextMenu(event.clientX, event.clientY, d);
    });
    node.on('mouseenter', function (_, d) {
      const sel = d3.select(this);
      const info = layout.find((x) => x.d === d);
      if (!info) return;
      sel.select('rect.mm-card').transition().duration(150).attr('stroke-width', info.d.depth === 0 ? 0 : 2.5);
    });
    node.on('mouseleave', function (_, d) {
      const sel = d3.select(this);
      const info = layout.find((x) => x.d === d);
      if (!info) return;
      const isRoot = info.d.depth === 0;
      const isLevel1 = info.d.depth === 1;
      sel.select('rect.mm-card').transition().duration(150).attr('stroke-width', isRoot ? 0 : (isLevel1 ? 1.8 : 1.2));
    });

    updateMapStats();

    setTimeout(() => {
      gRoot.attr('transform', '');
      fit();
    }, 50);
  }

  function fit() {
    if (!currentRoot) return;
    const linksNode = gLinks.node();
    const nodesNode = gNodes.node();
    if (!linksNode || !nodesNode) return;
    let bb;
    try {
      const lb = linksNode.getBBox();
      const nb = nodesNode.getBBox();
      const x1 = Math.min(lb.x, nb.x);
      const y1 = Math.min(lb.y, nb.y);
      const x2 = Math.max(lb.x + lb.width, nb.x + nb.width);
      const y2 = Math.max(lb.y + lb.height, nb.y + nb.height);
      bb = { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
    } catch (e) { return; }
    if (!isFinite(bb.x) || !isFinite(bb.y) || !isFinite(bb.width) || !isFinite(bb.height)) return;
    if (bb.width <= 0 || bb.height <= 0) return;
    const stageRect = dom.mapStage.getBoundingClientRect();
    const w = stageRect.width || 800;
    const h = stageRect.height || 600;
    const pad = 60;
    const safeW = Math.max(bb.width, 1);
    const safeH = Math.max(bb.height, 1);
    const scale = Math.max(0.05, Math.min(
      (w - pad * 2) / safeW,
      (h - pad * 2) / safeH,
      1.6
    ));
    const cx = bb.x + bb.width / 2;
    const cy = bb.y + bb.height / 2;
    const tx = w / 2 - cx * scale;
    const ty = h / 2 - cy * scale;
    if (!isFinite(tx) || !isFinite(ty) || !isFinite(scale)) return;
    svg.transition().duration(400).call(
      zoom.transform,
      d3.zoomIdentity.translate(tx, ty).scale(scale)
    );
  }

  function updateMapStats() {
    if (!currentRoot) return;
    let n = 0;
    currentRoot.each(() => n++);
    dom.mapStats.textContent = `${n} nós`;
  }

  // ============================================================
  // NODE DELETION + CONTEXT MENU
  // ============================================================
  function deleteNode(d) {
    if (!d || !d.parent) {
      toast('Não é possível deletar a raiz', 'warn');
      return;
    }
    const parentData = d.parent.data;
    if (parentData.__children) {
      parentData.__children = parentData.__children.filter((c) => c !== d.data);
    } else {
      parentData.children = (parentData.children || []).filter((c) => c !== d.data);
    }
    state.markdown = toMarkdown(state.rootData);
    state.root = buildHierarchyData(state.rootData);
    render();
    toast('Nó removido', 'success');
  }

  function showContextMenu(x, y, d) {
    state.selectedNode = d;
    dom.contextMenu.style.left = x + 'px';
    dom.contextMenu.style.top = y + 'px';
    dom.contextMenu.hidden = false;
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu')) dom.contextMenu.hidden = true;
  });
  dom.contextMenu.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn || !state.selectedNode) return;
    const action = btn.dataset.action;
    const d = state.selectedNode;
    if (action === 'delete') deleteNode(d);
    else if (action === 'collapse' && d.children) {
      d.data.__children = d.data.__children || d.data.children;
      d.data.children = null;
      render();
    } else if (action === 'expand' && d.data.__children) {
      d.data.children = d.data.__children;
      d.data.__children = null;
      render();
    }
    dom.contextMenu.hidden = true;
  });

  dom.toggleDelete.addEventListener('click', () => {
    state.deleteMode = !state.deleteMode;
    dom.toggleDelete.classList.toggle('active', state.deleteMode);
    dom.markmapSvg.classList.toggle('markmap-node-delete-mode', state.deleteMode);
    toast(state.deleteMode ? 'Modo deletar ativado — clique em um nó' : 'Modo deletar desativado', 'info', 2200);
  });

  // ============================================================
  // ZOOM
  // ============================================================
  dom.zoomIn.addEventListener('click', () => svg.transition().duration(200).call(zoom.scaleBy, 1.3));
  dom.zoomOut.addEventListener('click', () => svg.transition().duration(200).call(zoom.scaleBy, 0.7));
  dom.zoomReset.addEventListener('click', fit);
  dom.fitBtn.addEventListener('click', fit);

  // ============================================================
  // COLOR PICKERS
  // ============================================================
  function bindColor(picker, hex) {
    picker.addEventListener('input', (e) => {
      hex.value = e.target.value;
      render();
    });
    hex.addEventListener('input', (e) => {
      if (/^#[0-9a-f]{6}$/i.test(e.target.value)) {
        picker.value = e.target.value;
        render();
      }
    });
  }
  bindColor(dom.branchColor, dom.branchColorHex);
  bindColor(dom.textColor, dom.textColorHex);
  dom.enableGradient.addEventListener('change', render);

  // ============================================================
  // MARKDOWN CONVERSION (for state.markdown, not used for rendering)
  // ============================================================
  function toMarkdown(node, depth = 0) {
    const prefix = '#'.repeat(depth + 1);
    let out = `${prefix} ${node.name}\n`;
    if (node.children) node.children.forEach((c) => { out += toMarkdown(c, depth + 1); });
    return out;
  }

  // ============================================================
  // GENERATE
  // ============================================================
  dom.generateBtn.addEventListener('click', () => generate());
  dom.redoBtn.addEventListener('click', () => {
    if (state.extractedTexts.length) {
      shuffle(state.extractedTexts);
      generate(true);
    }
  });

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  async function generate(isRedo = false) {
    if (state.files.length === 0) return;
    showLoading(isRedo ? 'Refazendo mapa...' : 'Lendo seus PDFs...');
    try {
      updateLoading(10, 'Extraindo texto dos PDFs...', 0);
      const texts = [];
      for (let i = 0; i < state.files.length; i++) {
        const f = state.files[i];
        updateLoading(10 + (i / state.files.length) * 30, `Lendo ${f.name}...`, 0);
        const t = await extractTextFromPDF(f);
        texts.push(t);
      }
      if (!isRedo) state.extractedTexts = texts;

      const combined = state.extractedTexts.map((t) => `[Documento: ${t.name}]\n${t.text}`).join('\n\n');
      state.rawText = combined;

      const density = +dom.mapDensity.value;
      let tree;
      let source;

      if (state.aiConfig.enabled && state.aiConfig.apiKey) {
        updateLoading(50, 'IA analisando conteúdo...', 1);
        try {
          tree = await callAIForHierarchy(combined, density);
          source = 'ia';
        } catch (aiErr) {
          console.warn('IA falhou, usando NLP local:', aiErr);
          updateLoading(55, 'IA falhou, usando NLP local...', 1);
          await delay(400);
          tree = buildHierarchy(combined, density);
          source = 'local-fallback';
          toast('IA falhou, usando NLP local: ' + (aiErr.message || aiErr), 'warn', 4500);
        }
      } else {
        updateLoading(45, 'Identificando conceitos-chave...', 1);
        tree = buildHierarchy(combined, density);
        source = 'local';
      }

      await delay(150);
      updateLoading(75, 'Construindo hierarquia...', 2);
      state.rootData = tree;

      updateLoading(90, 'Renderizando mapa mental...', 3);
      state.markdown = toMarkdown(tree);
      state.root = buildHierarchyData(tree);

      await delay(200);
      updateLoading(100, 'Concluído!', 3);
      [...dom.loaderSteps.children].forEach((s) => s.classList.add('done'));

      dom.emptyState.hidden = true;
      dom.mindmapWrap.hidden = false;
      dom.customPanel.hidden = false;
      dom.exportPanel.hidden = false;

      render();

      const title = state.files.length === 1 ? state.files[0].name.replace(/\.pdf$/i, '') : `Mapa de ${state.files.length} documentos`;
      if (source === 'ia' && tree.name) dom.mapTitle.textContent = tree.name;
      else dom.mapTitle.textContent = title;

      state.lastSource = source;
      await delay(300);
      hideLoading();
      const srcLabel = source === 'ia' ? 'via IA' : (source === 'local-fallback' ? 'via NLP local (IA falhou)' : 'via NLP local');
      toast((isRedo ? 'Mapa refeito' : 'Mapa mental gerado') + ` ${srcLabel}!`, 'success');
    } catch (err) {
      console.error(err);
      hideLoading();
      toast('Erro ao gerar mapa: ' + (err.message || err), 'error', 5000);
    }
  }

  function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

  // ============================================================
  // EXPORT PNG
  // ============================================================
  dom.exportPNG.addEventListener('click', async () => {
    if (!state.root) return;
    showLoading('Gerando PNG...');
    try {
      const node = gNodes.node();
      const linksNode = gLinks.node();
      const bbox1 = node.getBBox();
      const bbox2 = linksNode.getBBox();
      const minX = Math.min(bbox1.x, bbox2.x);
      const minY = Math.min(bbox1.y, bbox2.y);
      const maxX = Math.max(bbox1.x + bbox1.width, bbox2.x + bbox2.width);
      const maxY = Math.max(bbox1.y + bbox1.height, bbox2.y + bbox2.height);
      const padding = 80;
      const w = Math.ceil(maxX - minX + padding * 2);
      const h = Math.ceil(maxY - minY + padding * 2);

      const clone = svg.node().cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', w);
      clone.setAttribute('height', h);
      clone.setAttribute('viewBox', `${minX - padding} ${minY - padding} ${w} ${h}`);

      const style = document.createElement('style');
      style.textContent = `text { font-family: 'Inter', sans-serif !important; }`;
      clone.insertBefore(style, clone.firstChild);

      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('x', minX - padding);
      bg.setAttribute('y', minY - padding);
      bg.setAttribute('width', w);
      bg.setAttribute('height', h);
      const isLight = document.body.dataset.theme === 'light';
      bg.setAttribute('fill', isLight ? '#ffffff' : '#0b0f1a');
      clone.insertBefore(bg, clone.firstChild);

      const transform = gRoot.attr('transform');
      if (transform) {
        const innerG = clone.querySelector('.mm-root');
        if (innerG) innerG.setAttribute('transform', 'translate(0,0) scale(1)');
      }

      const svgStr = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `brainmaster-${Date.now()}.png`;
        a.click();
        hideLoading();
        toast('PNG exportado!', 'success');
      }, 'image/png');
    } catch (err) {
      console.error(err);
      hideLoading();
      toast('Erro ao exportar PNG: ' + err.message, 'error');
    }
  });

  // ============================================================
  // EXPORT PDF
  // ============================================================
  dom.exportPDF.addEventListener('click', async () => {
    if (!state.root) return;
    showLoading('Gerando PDF...');
    try {
      const node = gNodes.node();
      const linksNode = gLinks.node();
      const bbox1 = node.getBBox();
      const bbox2 = linksNode.getBBox();
      const minX = Math.min(bbox1.x, bbox2.x);
      const minY = Math.min(bbox1.y, bbox2.y);
      const maxX = Math.max(bbox1.x + bbox1.width, bbox2.x + bbox2.width);
      const maxY = Math.max(bbox1.y + bbox1.height, bbox2.y + bbox2.height);
      const padding = 100;
      const w = Math.ceil(maxX - minX + padding * 2);
      const h = Math.ceil(maxY - minY + padding * 2);

      const clone = svg.node().cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', w);
      clone.setAttribute('height', h);
      clone.setAttribute('viewBox', `${minX - padding} ${minY - padding} ${w} ${h}`);

      const style = document.createElement('style');
      style.textContent = `text { font-family: 'Inter', sans-serif !important; }`;
      clone.insertBefore(style, clone.firstChild);

      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('x', minX - padding);
      bg.setAttribute('y', minY - padding);
      bg.setAttribute('width', w);
      bg.setAttribute('height', h);
      const isLight = document.body.dataset.theme === 'light';
      bg.setAttribute('fill', isLight ? '#ffffff' : '#0b0f1a');
      clone.insertBefore(bg, clone.firstChild);

      const innerG = clone.querySelector('.mm-root');
      if (innerG) innerG.setAttribute('transform', 'translate(0,0) scale(1)');

      const svgStr = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const canvas = document.createElement('canvas');
      canvas.width = w * 2;
      canvas.height = h * 2;
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const png = canvas.toDataURL('image/png');

      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) { hideLoading(); toast('jsPDF não carregou', 'error'); return; }
      const orientation = w > h ? 'l' : 'p';
      const pdf = new jsPDF({ orientation, unit: 'px', format: [w, h] });
      pdf.addImage(png, 'PNG', 0, 0, w, h);
      pdf.save(`brainmaster-${Date.now()}.pdf`);

      hideLoading();
      toast('PDF exportado!', 'success');
    } catch (err) {
      console.error(err);
      hideLoading();
      toast('Erro ao exportar PDF: ' + err.message, 'error');
    }
  });

  // ============================================================
  // RESET
  // ============================================================
  dom.resetAllBtn.addEventListener('click', () => {
    if (!confirm('Limpar tudo e começar de novo?')) return;
    state.files = [];
    state.rawText = '';
    state.extractedTexts = [];
    state.markdown = '';
    state.root = null;
    gLinks.selectAll('*').remove();
    gNodes.selectAll('*').remove();
    dom.mindmapWrap.hidden = true;
    dom.emptyState.hidden = false;
    dom.customPanel.hidden = true;
    dom.exportPanel.hidden = true;
    state.deleteMode = false;
    dom.toggleDelete.classList.remove('active');
    dom.markmapSvg.classList.remove('markmap-node-delete-mode');
    renderFileList();
    toast('Tudo limpo', 'info');
  });

  // ============================================================
  // KEYBOARD
  // ============================================================
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'o') { e.preventDefault(); dom.fileInput.click(); }
      if (e.key === 'Enter' && !dom.generateBtn.disabled) { e.preventDefault(); generate(); }
      if (e.key === 's' && state.root) { e.preventDefault(); dom.exportPNG.click(); }
    }
    if (e.key === 'Escape') {
      dom.contextMenu.hidden = true;
      if (state.deleteMode) dom.toggleDelete.click();
    }
  });

  // ============================================================
  // INIT
  // ============================================================
  function resize() {
    const stage = dom.mapStage;
    dom.markmapSvg.setAttribute('width', stage.clientWidth);
    dom.markmapSvg.setAttribute('height', stage.clientHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  renderFileList();
  console.log('%cBrainMaster%c pronto!', 'background:linear-gradient(135deg,#818cf8,#ec4899);color:#fff;padding:4px 10px;border-radius:4px;font-weight:600;', 'color:#94a3b8;');
})();
