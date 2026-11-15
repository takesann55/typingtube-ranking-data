// ==UserScript==
// @name         TypingTube アシスト＋曲ID検索
// @namespace    https://typing-tube.net/
// @version      8.1.3
// @description  チャット識別・フォロー、ユーザーのオンライン確認・ブロック関連機能・コメントリアクション表示切替・コメントメニュー・ライブリアクション・過去ランキング(公開日時付き)から検索・拡張プレイリスト
// @match        https://typing-tube.net/*
// @match        https://www.typing-tube.net/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_addStyle
// @connect      raw.githubusercontent.com
// @connect      api.github.com
// @updateURL    https://raw.githubusercontent.com/takesann55/typingtube-ranking-data/main/TypingTube_Assist_Combined.user.js
// @downloadURL  https://raw.githubusercontent.com/takesann55/typingtube-ranking-data/main/TypingTube_Assist_Combined.user.js
// @homepageURL  https://github.com/takesann55/typingtube-ranking-data
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';
  if (window.top !== window || document.documentElement.hasAttribute('data-tt-extended-playlist')) return;
  document.documentElement.setAttribute('data-tt-extended-playlist', '8.1.3');

  const KEY = 'tt-extended-playlist-v1';
  const MODAL = '[data-battle-room-target~="songSearchModal"]';
  const TARGET = name => `[data-battle-room-target~="${name}"]`;
  const ROOM_TABS = '.room-search-tabs';
  const ROOM_SEARCH_OPENER = '.room-browse-songs-btn';
  const LATER_PANEL = '[data-play-later-target~="panel"]';
  const LATER_LIST = '[data-play-later-target~="list"]';
  const DETAIL_ADD = '[data-play-later-movie-id-param]';
  const DETAIL_CTA = '[data-movie-detail-target~="ctaSection"]';
  const ROOT = '';
  const VIEWS = [['browse', '選択'], ['search', '検索'], ['more', 'その他']];
  const mounted = new Map();
  let serial = 0;
  let activePicker = null;
  let positioningPicker = false;
  let mounting = false;
  let suspended = false;
  let writes = Promise.resolve();

  GM_addStyle(`
    .tt-pl-modal[data-tt-pl-room-open] :is([data-battle-room-target~="songSearchPane"], [data-battle-room-target~="songSearchStatus"], [data-battle-room-target~="songSearchResults"], .room-search-status, .room-search-results) { display: none !important; }
    .tv-modal-content[data-tt-pl-wide] { box-sizing: border-box; width: min(1200px, calc(100vw - 24px)) !important; max-width: 100% !important; min-width: 0; }
    .tv-modal-content[data-tt-pl-wide] .tv-modal-body { min-width: 0; }
    .tt-pl-modal .room-search-tabs { flex-wrap: wrap; min-width: 0; }
    .tt-pl-modal .room-search-tabs > .room-search-tab { flex: 1 1 0; min-width: 0; white-space: normal; padding-inline: clamp(.25rem, 1vw, .8rem); }
    .tt-pl-standard[data-tt-pl-show-saved] :is([data-play-later-target~="list"], [data-play-later-target~="emptyMsg"], [data-play-later-target~="sortBtn"], [data-play-later-target~="count"], [data-action~="click->play-later#clearAll"], [data-action~="play-later#clearAll"]) { display: none !important; }
    .tt-pl-nav { display: flex; flex-wrap: wrap; gap: .4rem; padding: .45rem .65rem; }
    .tt-pl-tab[aria-pressed="true"], .tt-pl-nav .tt-pl-btn[aria-pressed="true"] { font-weight: 700; }
    .tt-pl-panel { --tt-pl-line: color-mix(in srgb, currentColor 22%, transparent); --tt-pl-fill: color-mix(in srgb, currentColor 7%, transparent); display: grid; grid-template-columns: minmax(0, 1fr); gap: .65rem; min-width: 0; }
    .tt-pl-panel[hidden], .tt-pl-panel [hidden] { display: none !important; }
    .tt-pl-panel .tt-pl-tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .25rem; padding: .2rem; border-radius: .5rem; background: var(--tt-pl-fill); }
    .tt-pl-panel .tt-pl-tabs .tt-pl-btn { border-color: transparent; min-width: 0; padding-inline: .25rem; }
    .tt-pl-panel .tt-pl-tabs .tt-pl-btn[aria-selected="true"] { border-color: var(--tt-pl-line); background: var(--tt-pl-fill); box-shadow: inset 0 -2px #dc7935; font-weight: 700; }
    .tt-pl-standard .tt-pl-panel, .tt-pl-detail .tt-pl-panel { padding: .6rem; }
    .tt-pl-detail { margin: .45rem 0; }
    .tt-pl-panel-content { display: grid; grid-template-columns: minmax(0, 1fr); gap: .55rem; min-width: 0; }
    .tt-pl-panel .tt-pl-toolbar { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; }
    .tt-pl-panel .tt-pl-toolbar input[type="search"] { flex: 1 1 10rem; min-width: 0; }
    .tt-pl-panel .tt-pl-list { max-height: min(48vh, 26rem); overflow: auto; display: grid; grid-template-columns: minmax(0, 1fr); gap: .3rem; min-width: 0; }
    .tt-pl-panel .tt-pl-song-list { display: grid; grid-template-columns: minmax(0, 1fr); gap: .3rem; }
    .tt-pl-panel .tt-pl-list .room-search-result-row { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; padding: .4rem; min-width: 0; }
    .tt-pl-panel .tt-pl-list .tt-pl-song-actions { min-width: 0; max-width: 100%; margin-inline-start: auto; justify-content: flex-end; }
    .tt-pl-panel .tt-pl-list .room-search-result-info { flex: 1 1 8rem; min-width: 0; }
    .tt-pl-panel .room-search-result-thumb img { display: block; width: 68px; aspect-ratio: 16 / 9; object-fit: cover; }
    .tt-pl-panel .room-search-result-title { overflow-wrap: anywhere; }
    .tt-pl-panel .room-search-result-meta { display: flex; flex-wrap: wrap; gap: .45em; }
    .tt-pl-panel .tt-pl-choices label { display: flex; align-items: baseline; gap: .5rem; padding: .25rem; min-width: 0; overflow-wrap: anywhere; }
    .tt-pl-panel .tt-pl-choices input { flex: none; }
    :is(.tt-pl-panel, .tt-pl-nav, .tt-pl-detail) .tt-pl-btn { cursor: pointer; background: transparent; color: inherit; border: 1px solid currentColor; border-radius: .35rem; padding: .3rem .55rem; font: inherit; text-decoration: none; }
    .tt-pl-panel .tt-pl-btn:disabled { opacity: .55; cursor: default; }
    .tt-pl-panel .tt-pl-select { appearance: auto; padding: .3rem .35rem; white-space: nowrap; max-width: 100%; }
    .tt-pl-panel .tt-pl-select option { color: CanvasText; background: Canvas; }
    .tt-pl-panel .tt-pl-btn.tt-pl-icon { display: inline-flex; align-items: center; justify-content: center; gap: .18rem; min-width: 2.1rem; min-height: 2.1rem; border-color: var(--tt-pl-line); padding: .2rem .38rem; }
    .tt-pl-panel .tt-pl-btn.tt-pl-icon:hover, .tt-pl-panel .tt-pl-btn.tt-pl-icon[aria-expanded="true"] { background: var(--tt-pl-fill); border-color: currentColor; }
    .tt-pl-panel .tt-pl-btn.tt-pl-trash:hover { color: var(--danger-color, #dd533e); }
    .tt-pl-panel .tt-pl-breadcrumb { display: flex; align-items: baseline; flex-wrap: wrap; gap: .25rem .4rem; min-width: 0; overflow-wrap: anywhere; }
    .tt-pl-panel .tt-pl-breadcrumb [aria-current="location"] { font-weight: 700; }
    .tt-pl-panel .tt-pl-folder-row { display: flex; align-items: center; justify-content: space-between; gap: .5rem; padding: .3rem .45rem; border-bottom: 1px solid var(--tt-pl-line); min-width: 0; }
    .tt-pl-panel .tt-pl-folder-name { display: flex; gap: .4rem; min-width: 0; overflow-wrap: anywhere; }
    .tt-pl-panel .tt-pl-folder-row button { flex: none; }
    .tt-pl-panel .tt-pl-picker { box-sizing: border-box; display: grid; gap: .45rem; flex: 1 1 100%; width: 100%; min-width: 0; padding: .6rem; border: 1px solid var(--tt-pl-line); border-radius: .45rem; background: var(--tt-pl-fill); }
    .tt-pl-panel .tt-pl-picker-children { display: grid; gap: .2rem; max-height: min(28vh, 13rem); overflow: auto; }
    .tt-pl-panel .tt-pl-picker-nav { display: flex; align-items: center; gap: .45rem; min-width: 0; }
    .tt-pl-panel .tt-pl-picker-nav button { flex: none; }
    .tt-pl-panel .tt-pl-picker-path { min-width: 0; overflow-wrap: anywhere; font-weight: 700; }
    .tt-pl-panel.tt-pl-flyout { position: fixed; inset: auto; z-index: 2147483000; box-sizing: border-box; width: min(320px, calc(100vw - 16px)); min-height: 0; margin: 0; padding: .55rem; gap: .4rem; overflow: auto; align-content: start; border: 1px solid #68646e; border-radius: .55rem; background: #222126; color: #f5f3f6; color-scheme: dark; box-shadow: 0 .35rem 1.2rem #0008; }
    .tt-pl-panel.tt-pl-flyout[data-tt-pl-above] { transform: translateY(-100%); }
    .tt-pl-panel.tt-pl-flyout .tt-pl-btn { font-size: .9em; }
    .tt-pl-panel.tt-pl-flyout .tt-pl-picker-children { max-height: min(30vh, 10rem); }
    .tt-pl-panel .tt-pl-random-folders { min-width: 0; margin: 0; padding: .3rem .55rem; border: 1px solid var(--tt-pl-line); border-radius: .4rem; }
    .tt-pl-panel .tt-pl-random-folders legend { padding: 0 .25rem; }
    .tt-pl-panel .tt-pl-random-count { display: inline-flex; gap: .35rem; align-items: center; }
    .tt-pl-panel .tt-pl-random-count input { box-sizing: border-box; width: 5.5rem; padding: .3rem; }
    .tt-pl-panel .tt-pl-more { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(12rem, 100%), 1fr)); gap: .45rem; }
    .tt-pl-panel .tt-pl-more .tt-pl-btn { text-align: start; }
    .tt-pl-panel .tt-pl-note { margin: 0; font-size: .85em; overflow-wrap: anywhere; }
    .tt-pl-panel .tt-pl-status:empty { display: none; }
    .tt-pl-panel input[type="file"] { display: none; }
  `);

  function el(tag, cls = '', label) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (label !== undefined) node.textContent = label;
    return node;
  }

  function button(label, action, cls = 'tt-pl-btn') {
    const node = el('button', cls, label);
    node.type = 'button';
    if (action) node.addEventListener('click', action);
    return node;
  }

  function iconButton(label, icon, action, extra = '') {
    const node = button(undefined, action, `tt-pl-btn tt-pl-icon ${extra}`);
    node.setAttribute('aria-label', label);
    node.title = label;
    icon.setAttribute('aria-hidden', 'true');
    node.append(icon);
    return node;
  }

  function emptyDb() {
    return { format: 'tt-extended-playlist', version: 1, folders: [], songs: [] };
  }

  function textValue(value, limit) {
    return typeof value === 'string' ? value.trim().slice(0, limit) : '';
  }

  function movieId(value) {
    const id = typeof value === 'number' || typeof value === 'string' ? String(value).trim() : '';
    return /^[1-9]\d{0,14}$/.test(id) ? id : '';
  }

  function thumbUrl(value) {
    if (typeof value !== 'string' || value.length > 500) return '';
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' && !url.username && !url.password &&
          ['i.ytimg.com', 'img.youtube.com', 'd2kibbevux4y1g.cloudfront.net'].includes(url.hostname)) return url.href;
    } catch {}
    return '';
  }

  function positiveNumber(value, limit = Number.MAX_SAFE_INTEGER) {
    if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= limit ? n : null;
  }

  function movie(raw) {
    const id = movieId(raw?.id);
    if (!id) return null;
    const vid = textValue(raw.video_id, 30);
    return {
      id,
      title: textValue(raw.title, 500) || `譜面 ${id}`,
      channel_name: textValue(raw.creator_name, 200) || textValue(raw.channel_name, 200),
      video_id: /^[A-Za-z0-9_-]{11}$/.test(vid) ? vid : '',
      thumbnail_url: thumbUrl(raw.thumbnail_url),
      level: positiveNumber(raw.level, 100),
      sec: positiveNumber(raw.sec),
      play_count: positiveNumber(raw.play_count),
      line_count: positiveNumber(raw.line_count),
      total_type_roma: positiveNumber(raw.total_type_roma),
      type_per_min: positiveNumber(raw.type_per_min)
    };
  }

  function moviesFrom(payload) {
    const source = Array.isArray(payload) ? payload : payload?.movies;
    if (!Array.isArray(source)) throw new Error('曲一覧の形式を読み取れませんでした。');
    return [...new Map(source.map(movie).filter(Boolean).map(song => [song.id, song])).values()];
  }

  function storeSong(db, song, dest = ROOT) {
    needFolder(db, dest);
    let target = db.songs.find(s => s.id === song.id);
    if (!target) {
      target = { ...song, folders: [], savedAt: Date.now() };
      db.songs.push(target);
    } else {
      for (const [key, value] of Object.entries(movie(song))) {
        if (value == null || value === '' || (key === 'title' && value === `譜面 ${song.id}`)) continue;
        target[key] = value;
      }
    }
    if (dest && !target.folders.includes(dest)) target.folders.push(dest);
    return target;
  }

  function validate(raw) {
    if (raw?.format !== 'tt-extended-playlist' || raw.version !== 1 ||
        !Array.isArray(raw.folders) || !Array.isArray(raw.songs)) {
      throw new Error('拡張プレイリストのバックアップ形式を確認してください。');
    }
    const folders = new Map();
    for (const f of raw.folders) {
      const name = textValue(f?.name, 80);
      if (!f || typeof f.id !== 'string' || !/^f-[a-zA-Z0-9-]{1,80}$/.test(f.id) ||
          folders.has(f.id) || !name || typeof f.parent !== 'string') {
        throw new Error('フォルダの情報が不正です。');
      }
      folders.set(f.id, { id: f.id, parent: f.parent, name });
    }
    for (const f of folders.values()) {
      const seen = new Set([f.id]);
      let parent = f.parent;
      while (parent !== ROOT) {
        if (!folders.has(parent) || seen.has(parent)) throw new Error('フォルダの階層が不正です。');
        seen.add(parent);
        parent = folders.get(parent).parent;
      }
    }
    const songs = new Map();
    for (const rawSong of raw.songs) {
      const song = movie(rawSong);
      if (!song || songs.has(song.id) || !Array.isArray(rawSong.folders) ||
          rawSong.folders.some(id => !folders.has(id))) throw new Error('譜面の登録情報が不正です。');
      songs.set(song.id, { ...song, folders: [...new Set(rawSong.folders)],
        savedAt: Number.isFinite(rawSong.savedAt) ? rawSong.savedAt : 0 });
    }
    return { ...emptyDb(), folders: [...folders.values()], songs: [...songs.values()] };
  }

  function readDb() {
    const raw = GM_getValue(KEY, null);
    return raw === null ? emptyDb() : validate(raw);
  }

  function change(fn) {
    const task = writes.then(async () => {
      const db = readDb();
      await GM_setValue(KEY, validate(fn(db) ?? db));
      redrawAll();
    });
    writes = task.catch(() => {});
    return task;
  }

  function trailOf(db, id) {
    const trail = [];
    const folders = new Map(db.folders.map(f => [f.id, f]));
    while (folders.has(id)) {
      const folder = folders.get(id);
      trail.push(folder);
      id = folder.parent;
    }
    return trail.reverse();
  }

  function pathOf(db, id) {
    return trailOf(db, id).map(folder => folder.name).join(' ／ ');
  }

  function children(db, parent) {
    return db.folders.filter(f => f.parent === parent).sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }

  function sameName(db, parent, name, except) {
    return db.folders.some(f => f.parent === parent && f.id !== except && f.name === name);
  }

  function needFolder(db, id) {
    if (id !== ROOT && !db.folders.some(f => f.id === id)) throw new Error('フォルダが見つかりません。');
  }

  function say(ctx, message) {
    ctx.status.textContent = message;
  }

  function report(ctx, error) {
    say(ctx, error?.message || '操作に失敗しました。');
  }

  function act(ctx, fn) {
    return async event => {
      try { await fn(event); } catch (error) { report(ctx, error); }
    };
  }

  function openFolder(ctx, id) {
    stopRandomBatch(ctx);
    ctx.folder = id;
    ctx.query = '';
    ctx.view = 'browse';
    say(ctx, '');
    redraw(ctx);
  }

  function breadcrumb(db, id, open) {
    const nav = el('nav', 'tt-pl-breadcrumb');
    nav.setAttribute('aria-label', 'フォルダの場所');
    const entries = [{ id: ROOT, name: '一番上' }, ...trailOf(db, id)];
    for (const [index, folder] of entries.entries()) {
      if (index) {
        const separator = el('span', '', '›');
        separator.setAttribute('aria-hidden', 'true');
        nav.append(separator);
      }
      if (index === entries.length - 1) {
        const here = el('span', '', folder.name);
        here.setAttribute('aria-current', 'location');
        nav.append(here);
      } else nav.append(button(folder.name, () => open(folder.id)));
    }
    return nav;
  }

  function folderRow(folder, open, label) {
    const row = el('div', 'tt-pl-folder-row');
    const go = button('開く', () => open(folder.id));
    go.setAttribute('aria-label', `「${folder.name}」を開く`);
    if (!label) {
      const icon = el('span', '', '📁');
      icon.setAttribute('aria-hidden', 'true');
      label = el('span', 'tt-pl-folder-name');
      label.append(icon, el('span', '', folder.name));
    }
    row.append(label, go);
    return row;
  }

  async function createFolder(ctx) {
    const name = textValue(window.prompt('新しいフォルダ名（80文字まで）'), 80);
    if (!name) return;
    const parent = ctx.folder;
    const id = `f-${crypto.randomUUID()}`;
    await change(db => {
      needFolder(db, parent);
      if (sameName(db, parent, name)) throw new Error('同じ場所にその名前のフォルダがあります。');
      db.folders.push({ id, parent, name });
    });
    openFolder(ctx, id);
    say(ctx, 'フォルダを作成しました。');
  }

  async function renameFolder(ctx, folder) {
    const name = textValue(window.prompt('フォルダ名を変更（80文字まで）', folder.name), 80);
    if (!name || name === folder.name) return;
    await change(db => {
      const current = db.folders.find(f => f.id === folder.id);
      if (!current) throw new Error('フォルダが見つかりません。');
      if (sameName(db, current.parent, name, current.id)) throw new Error('同じ場所にその名前のフォルダがあります。');
      current.name = name;
    });
    say(ctx, 'フォルダ名を変更しました。');
  }

  async function deleteFolder(ctx, folder) {
    if (readDb().folders.some(f => f.parent === folder.id)) {
      throw new Error('先に子フォルダを移動または削除してください。');
    }
    if (!window.confirm(`「${folder.name}」を削除しますか？ 譜面の保存は残ります。`)) return;
    await change(db => {
      if (db.folders.some(f => f.parent === folder.id)) throw new Error('子フォルダがあります。');
      db.folders = db.folders.filter(f => f.id !== folder.id);
      for (const song of db.songs) song.folders = song.folders.filter(id => id !== folder.id);
    });
    openFolder(ctx, folder.parent);
    say(ctx, 'フォルダを削除しました。');
  }

  function possibleParent(db, id, candidate) {
    const byId = new Map(db.folders.map(f => [f.id, f]));
    while (candidate !== ROOT) {
      if (candidate === id || !byId.has(candidate)) return false;
      candidate = byId.get(candidate).parent;
    }
    return true;
  }

  function renderMove(ctx, db, folder) {
    const here = possibleParent(db, folder.id, ctx.moveFolder) ? ctx.moveFolder : folder.parent;
    const open = id => { ctx.moveFolder = id; redraw(ctx); };
    const list = el('div', 'tt-pl-list');
    for (const child of children(db, here)) {
      if (possibleParent(db, folder.id, child.id)) list.append(folderRow(child, open));
    }
    const controls = el('div', 'tt-pl-toolbar');
    const move = button('ここへ移動', act(ctx, async () => {
      await change(current => {
        const next = current.folders.find(f => f.id === folder.id);
        if (!next || !possibleParent(current, next.id, here)) throw new Error('その場所には移動できません。');
        if (sameName(current, here, next.name, next.id)) throw new Error('移動先に同じ名前のフォルダがあります。');
        next.parent = here;
      });
      openFolder(ctx, folder.id);
      say(ctx, 'フォルダを移動しました。');
    }));
    move.disabled = here === folder.parent;
    controls.append(move, button('キャンセル', () => openFolder(ctx, folder.id)));
    ctx.content.append(el('p', 'tt-pl-note', `「${folder.name}」の移動先`), breadcrumb(db, here, open), list, controls);
  }

  function checkbox(label, checked, onChange) {
    const node = el('label');
    const check = el('input');
    check.type = 'checkbox';
    check.checked = checked;
    check.addEventListener('change', () => onChange(check.checked));
    node.append(check, el('span', '', label));
    return node;
  }

  function membershipState(saved, here) {
    return { here, chosen: new Set(saved?.folders || (here ? [here] : [])), saving: false };
  }

  function renderPicker(ctx, area, db, state, song, kind, saved, close) {
    const paint = () => {
      const allowed = new Set(db.folders.map(f => f.id));
      for (const id of state.chosen) if (!allowed.has(id)) state.chosen.delete(id);
      const folder = db.folders.find(f => f.id === state.here);
      if (!folder) state.here = ROOT;
      const here = state.here;
      const open = id => {
        state.here = id;
        paint();
        const next = area.querySelector('.tt-pl-picker-back');
        (next.disabled ? area.querySelector('.tt-pl-folder-row button') || area.querySelector('.tt-pl-picker-save') : next)
          ?.focus({ preventScroll: true });
      };
      const nav = el('div', 'tt-pl-picker-nav');
      const path = el('span', 'tt-pl-picker-path', pathOf(db, here) || '一番上');
      path.setAttribute('aria-current', 'location');
      const back = button('戻す', () => { if (folder) open(folder.parent); }, 'tt-pl-btn tt-pl-picker-back');
      back.disabled = !folder;
      back.setAttribute('aria-label', 'ひとつ上の階層に戻す');
      nav.append(back, path);
      const choices = el('div', 'tt-pl-picker-children tt-pl-choices');
      const summary = el('p', 'tt-pl-note');
      const update = () => {
        summary.textContent = state.chosen.size ? `${state.chosen.size}個のフォルダを選択中（複数可）` : '選択なし：一番上に未分類で保存';
      };
      const choose = (id, label) => checkbox(label, state.chosen.has(id), on => {
        if (on) state.chosen.add(id); else state.chosen.delete(id);
        update();
      });
      if (folder) choices.append(choose(folder.id, 'このフォルダに登録'));
      for (const child of children(db, here)) choices.append(folderRow(child, open, choose(child.id, child.name)));
      if (!db.folders.length) choices.append(el('p', 'tt-pl-note', 'フォルダは「選択」タブの「新規フォルダ」から作れます。'));
      const controls = el('div', 'tt-pl-toolbar');
      const save = button(saved ? '登録先を保存' : 'この譜面を保存', act(ctx, async () => {
        if (state.saving) return;
        state.saving = save.disabled = true;
        const picked = [...state.chosen];
        try {
          await change(current => {
            const target = kind === 'browse' ? current.songs.find(s => s.id === song.id) : storeSong(current, song);
            if (!target) throw new Error('この譜面は削除されています。');
            const existing = new Set(current.folders.map(f => f.id));
            target.folders = picked.filter(id => existing.has(id));
          });
          say(ctx, saved ? '登録先を保存しました。' : '拡張プレイリストに保存しました。');
        } finally {
          state.saving = save.disabled = false;
          if (kind === 'detail' && ctx.detailPicker === state && !ctx.panel.hidden) redraw(ctx);
        }
      }), 'tt-pl-btn tt-pl-picker-save');
      save.disabled = state.saving;
      controls.append(save, button('閉じる', close));
      update();
      area.replaceChildren(nav, choices, summary, controls);
    };
    paint();
  }

  async function openImport(ctx) {
    ctx.view = 'import';
    ctx.importState = { loading: true, movies: [], selected: new Set(), error: '' };
    const pending = ctx.importState;
    redraw(ctx);
    try {
      const response = await fetch('/api/play_later', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`標準リストを読み込めませんでした（HTTP ${response.status}）。`);
      const data = await response.json();
      pending.movies = moviesFrom(data);
    } catch (error) {
      pending.error = error.message || '標準リストを読み込めませんでした。';
    }
    pending.loading = false;
    if (ctx.view !== 'import' || ctx.importState !== pending || !ctx.panel.isConnected) return;
    redraw(ctx);
    say(ctx, pending.error);
  }

  function renderImport(ctx, db) {
    const state = ctx.importState;
    const dest = ctx.folder;
    ctx.content.append(el('p', 'tt-pl-note', `残したい譜面を選択してください。保存先：${dest ? pathOf(db, dest) : '未分類'}`));
    if (state.loading) {
      ctx.content.append(el('p', 'tt-pl-note', '標準の「あとでプレイ」を読み込み中…'));
      return;
    }
    if (state.error) {
      ctx.content.append(el('p', 'tt-pl-note', state.error), button('再読み込み', act(ctx, () => openImport(ctx))));
      return;
    }
    const saved = new Map(db.songs.map(s => [s.id, s]));
    const choices = el('div', 'tt-pl-list tt-pl-choices');
    const tools = el('div', 'tt-pl-toolbar');
    const save = button('選択した譜面を保存', act(ctx, async () => {
      const selected = state.movies.filter(s => state.selected.has(s.id));
      if (!selected.length) return;
      await change(current => {
        for (const song of selected) storeSong(current, song, dest);
      });
      openFolder(ctx, ctx.folder);
      say(ctx, `${selected.length}件を保存しました。`);
    }));
    const available = state.movies.filter(s => !saved.has(s.id) || (dest && !saved.get(s.id).folders.includes(dest)));
    const update = () => {
      save.disabled = !state.selected.size;
      save.textContent = `選択した${state.selected.size}件を保存`;
    };
    for (const s of state.movies) {
      const existing = saved.get(s.id);
      const already = !!existing && (!dest || existing.folders.includes(dest));
      if (already) state.selected.delete(s.id);
      const row = checkbox(`${s.title}（#${s.id}）${already ? '・保存済み' : ''}`, already || state.selected.has(s.id), on => {
        if (on) state.selected.add(s.id); else state.selected.delete(s.id);
        update();
      });
      row.querySelector('input').disabled = already;
      choices.append(row);
    }
    if (!state.movies.length) choices.append(el('p', 'tt-pl-note', '現在、標準リストに譜面がありません。'));
    tools.append(button('未登録を全選択', () => { state.selected = new Set(available.map(s => s.id)); redraw(ctx); }),
      button('選択を解除', () => { state.selected.clear(); redraw(ctx); }), save);
    ctx.content.append(tools, choices);
    update();
  }

  async function addById(ctx) {
    const value = window.prompt('譜面ID、または TypingTube の譜面URLを入力してください。');
    if (value === null) return;
    const id = movieId(value) || linkedMovieId(value);
    if (!id) throw new Error('譜面IDまたはURLを確認してください。');
    const before = readDb().songs.find(s => s.id === id);
    const title = before?.title ?? window.prompt('譜面名（空欄ならIDで表示）', '');
    if (title === null) return;
    const dest = ctx.folder;
    await change(db => { storeSong(db, movie({ id, title }), dest); });
    say(ctx, '譜面を保存しました。');
  }

  function exportBackup() {
    const json = JSON.stringify(readDb(), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = el('a');
    link.href = url;
    link.download = `typingtube-playlist-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function restoreBackup(ctx, file) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) throw new Error('20 MB以下のバックアップを選んでください。');
    const restored = validate(JSON.parse(await file.text()));
    if (!window.confirm(`拡張プレイリストをバックアップで上書きしますか？ 譜面${restored.songs.length}件・フォルダ${restored.folders.length}個`)) return;
    await change(() => restored);
    openFolder(ctx, ROOT);
    say(ctx, 'バックアップを復元しました。');
  }

  function normalize(value) {
    return value.normalize('NFKC').toLocaleLowerCase('ja-JP');
  }

  function linkedMovieId(value) {
    try {
      const url = new URL(value.trim(), location.origin);
      if (!['typing-tube.net', 'www.typing-tube.net'].includes(url.hostname) || !/^https?:$/.test(url.protocol)) return '';
      return movieId(url.pathname.match(/^\/(?:movie\/show|play\/typing)\/(\d+)\/?$/)?.[1]);
    } catch { return ''; }
  }

  function roomIdFor(node) {
    const route = movieId(location.pathname.match(/^\/battle\/(\d+)\/?$/)?.[1]);
    const controller = node.closest('[data-controller~="battle-room"]');
    return route || movieId(controller?.getAttribute('data-battle-room-room-id-value'));
  }

  function requireRoom(ctx) {
    if (!ctx.roomId || !ctx.panel.isConnected || roomIdFor(ctx.host) !== ctx.roomId) {
      throw new Error('対戦ルームを開き直してからお試しください。');
    }
    return `/api/battle_rooms/${ctx.roomId}`;
  }

  async function lookupSongPage(id, signal) {
    const path = `/movie/show/${id}`;
    const response = await fetch(path, { credentials: 'same-origin', headers: { Accept: 'text/html' }, signal });
    if (!response.ok) return [];
    if (response.url) {
      const final = new URL(response.url);
      if (final.origin !== location.origin || final.pathname.replace(/\/$/, '') !== path) return [];
    }
    const page = new DOMParser().parseFromString(await response.text(), 'text/html');
    if (!page.querySelector(DETAIL_CTA) && !page.querySelector(`[data-play-later-movie-id-param="${id}"]`)) return [];
    return [detailSong(id, page)];
  }

  async function searchSongs(ctx, query, signal) {
    const endpoint = ctx.roomId ? requireRoom(ctx) : '/api/live_events';
    const response = await fetch(`${endpoint}/search_songs?q=${encodeURIComponent(query)}`, {
      credentials: 'same-origin', headers: { Accept: 'application/json' }, signal
    });
    if (!response.ok) throw new Error(`曲を検索できませんでした（HTTP ${response.status}）。`);
    const found = moviesFrom(await response.json());
    const id = movieId(query);
    if (!id) return found;
    const exact = found.filter(song => song.id === id);
    return exact.length || ctx.roomId ? exact : lookupSongPage(id, signal);
  }

  function paintProposalButton(ctx, target, id) {
    const state = ctx.proposals.get(id);
    const waiting = ctx.randomBatch && !ctx.randomBatch.cancelled && ctx.randomBatch.waiting.has(id);
    target.disabled = !!state || !!ctx.randomBatch;
    target.classList.toggle('proposed', state === 'done');
    target.textContent = state === 'pending' ? '提案中…' : state === 'done' ? '提案済み' : waiting ? '提案待ち' : '提案';
  }

  function syncProposalButtons(ctx, id) {
    const selector = id ? `[data-tt-pl-propose="${id}"]` : '[data-tt-pl-propose]';
    for (const target of ctx.panel.querySelectorAll(selector)) paintProposalButton(ctx, target, target.getAttribute('data-tt-pl-propose'));
  }

  async function proposeSong(ctx, song, batch) {
    if ((ctx.randomBatch && ctx.randomBatch !== batch) || ctx.proposals.has(song.id)) return false;
    const endpoint = requireRoom(ctx);
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
    if (!csrf) throw new Error('提案するには、ログインした状態でページを読み直してください。');
    const body = { movie_id: song.id };
    const modal = ctx.host.closest(MODAL);
    const room = ctx.host.closest('[data-controller~="battle-room"]');
    const zone = (modal || ctx.host).querySelector(TARGET('proposalZoneLayout')) || room?.querySelector(TARGET('proposalZoneLayout'));
    if (zone?.value) body.zone_layout = zone.value;
    ctx.proposals.set(song.id, 'pending');
    syncProposalButtons(ctx, song.id);
    if (!batch) say(ctx, '');
    try {
      const response = await fetch(`${endpoint}/propose_song`, {
        method: 'POST', credentials: 'same-origin',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify(body)
      });
      if (response.redirected) throw new Error('提案するには、ログインした状態でページを読み直してください。');
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        const message = textValue(error?.error, 500) || textValue(error?.message, 500) ||
          (Array.isArray(error?.errors) ? error.errors.filter(e => typeof e === 'string').join('・').slice(0, 500) : '');
        throw new Error(message || `提案できませんでした（HTTP ${response.status}）。`);
      }
      ctx.proposals.set(song.id, 'done');
      if (!batch) say(ctx, `「${song.title}」を提案しました。`);
      return true;
    } catch (error) {
      ctx.proposals.delete(song.id);
      throw error;
    } finally {
      syncProposalButtons(ctx, song.id);
    }
  }

  function proposalButton(ctx, song) {
    const node = button('', act(ctx, () => proposeSong(ctx, song)), 'room-search-propose-btn');
    node.setAttribute('data-tt-pl-propose', song.id);
    node.dataset.movieId = song.id;
    paintProposalButton(ctx, node, song.id);
    return node;
  }

  function songCard(song) {
    const row = el('div', 'room-search-result-row');
    const fallbackThumb = song.video_id ? `https://i.ytimg.com/vi/${song.video_id}/mqdefault.jpg` : '';
    if (song.thumbnail_url || fallbackThumb) {
      const thumb = el('div', 'room-search-result-thumb');
      const img = el('img');
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => {
        if (fallbackThumb && img.src !== fallbackThumb) img.src = fallbackThumb;
        else thumb.remove();
      });
      img.src = song.thumbnail_url || fallbackThumb;
      thumb.append(img);
      row.append(thumb);
    }
    const info = el('div', 'room-search-result-info');
    info.append(el('div', 'room-search-result-title', song.title));
    const meta = el('div', 'room-search-result-meta');
    if (song.channel_name) meta.append(el('span', '', song.channel_name));
    if (song.level !== null) meta.append(el('span', '', `Lv.${song.level}`));
    if (song.sec !== null) {
      const seconds = Math.floor(song.sec);
      meta.append(el('span', '', `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`));
    }
    if (song.line_count !== null) meta.append(el('span', '', `${song.line_count}行`));
    if (song.total_type_roma !== null) meta.append(el('span', '', `${song.total_type_roma}打鍵`));
    if (song.type_per_min !== null) meta.append(el('span', '', `${Math.round(song.type_per_min)}打/分`));
    if (song.play_count !== null) meta.append(el('span', '', `${song.play_count.toLocaleString('ja-JP')}回プレイ`));
    meta.append(el('span', '', `#${song.id}`));
    info.append(meta);
    const actions = el('div', 'tt-pl-toolbar tt-pl-song-actions');
    const view = el('select', 'tt-pl-btn tt-pl-select tt-pl-view-select');
    view.setAttribute('aria-label', `「${song.title}」の閲覧先`);
    const options = [['', '閲覧'], [`/movie/show/${song.id}`, '曲ページ'], [`/my/works/${song.id}/edit`, '譜面ページ']];
    for (const [value, label] of options) {
      const option = el('option', '', label);
      option.value = value;
      option.disabled = !value;
      view.append(option);
    }
    view.value = '';
    view.addEventListener('change', () => {
      const path = view.value;
      view.value = '';
      if (path && options.some(([value]) => value === path)) window.open(`https://typing-tube.net${path}`, '_blank', 'noopener');
    });
    actions.append(view);
    row.append(info, actions);
    return { row, info, actions };
  }

  function closePicker(ctx, focus = false) {
    if (!activePicker || (ctx && activePicker.ctx !== ctx)) return;
    const { trigger, popup } = activePicker;
    activePicker = null;
    popup.hidden = true;
    popup.remove();
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-controls');
    if (focus && trigger.isConnected) trigger.focus({ preventScroll: true });
  }

  function positionPicker() {
    if (!activePicker) return;
    const { ctx, trigger, popup } = activePicker;
    if (ctx.panel.hidden || !trigger.isConnected || !trigger.getClientRects().length) { closePicker(ctx); return; }
    const rect = trigger.getBoundingClientRect();
    const list = trigger.closest('.tt-pl-list')?.getBoundingClientRect();
    const w = document.documentElement.clientWidth || window.innerWidth;
    const h = document.documentElement.clientHeight || window.innerHeight;
    if (rect.bottom <= 0 || rect.top >= h || rect.right <= 0 || rect.left >= w ||
        (list && (rect.bottom <= list.top || rect.top >= list.bottom))) { closePicker(ctx); return; }
    const spaceAbove = rect.top - 14;
    const spaceBelow = h - rect.bottom - 14;
    const above = spaceAbove >= 150 || spaceAbove >= spaceBelow;
    const width = Math.max(0, Math.min(320, w - 16));
    popup.toggleAttribute('data-tt-pl-above', above);
    popup.style.width = `${width}px`;
    popup.style.left = `${Math.max(8, Math.min(rect.right - width, w - width - 8))}px`;
    popup.style.top = `${above ? rect.top - 6 : rect.bottom + 6}px`;
    popup.style.maxHeight = `${Math.max(0, Math.min(300, above ? spaceAbove : spaceBelow))}px`;
  }

  function queuePickerPosition() {
    if (!activePicker || positioningPicker) return;
    positioningPicker = true;
    requestAnimationFrame(() => { positioningPicker = false; positionPicker(); });
  }

  function attachSongPicker(ctx, actions, song, db, kind, saved) {
    const popupId = `${ctx.uid}-picker-${song.id}`;
    const trigger = iconButton(`「${song.title}」の登録先を選ぶ`, el('span', '', '📁'), () => {
      if (activePicker?.trigger === trigger) { closePicker(ctx); return; }
      closePicker();
      const popup = el('div', 'tt-pl-panel tt-pl-flyout');
      popup.id = popupId;
      popup.setAttribute('role', 'dialog');
      popup.setAttribute('aria-label', `「${song.title}」の登録先`);
      popup.tabIndex = -1;
      popup.addEventListener('keydown', escape);
      activePicker = { ctx, trigger, popup };
      renderPicker(ctx, popup, db, membershipState(saved, ctx.folder), song, kind, saved, () => closePicker(ctx, true));
      trigger.setAttribute('aria-expanded', 'true');
      trigger.setAttribute('aria-controls', popupId);
      if (typeof popup.showPopover === 'function') {
        popup.setAttribute('popover', 'manual');
        ctx.panel.append(popup);
        try { popup.showPopover(); } catch {
          popup.removeAttribute('popover');
          document.body.append(popup);
        }
      } else document.body.append(popup);
      positionPicker();
      if (activePicker?.popup === popup) popup.focus({ preventScroll: true });
    });
    const arrow = el('span', '', '▾');
    arrow.setAttribute('aria-hidden', 'true');
    trigger.append(arrow);
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    const escape = event => {
      if (event.key !== 'Escape' || activePicker?.trigger !== trigger) return;
      event.preventDefault();
      event.stopPropagation();
      closePicker(ctx, true);
    };
    trigger.addEventListener('keydown', escape);
    actions.append(trigger);
  }

  function songRow(ctx, song, db) {
    const { row, actions } = songCard(song);
    if (ctx.roomId) actions.prepend(proposalButton(ctx, song));
    attachSongPicker(ctx, actions, song, db, 'browse', song);
    actions.append(iconButton(`「${song.title}」を拡張プレイリストから削除`, el('i', 'bi bi-trash'), act(ctx, async () => {
      if (!window.confirm(`「${song.title}」を拡張プレイリストとすべての登録先から削除しますか？`)) return;
      await change(current => { current.songs = current.songs.filter(s => s.id !== song.id); });
      say(ctx, '拡張プレイリストから削除しました。');
    }), 'tt-pl-trash'));
    return row;
  }

  async function runSearch(ctx, value) {
    if (!value) {
      say(ctx, '曲名・URL・譜面IDのいずれかを入力してください。');
      return;
    }
    const query = linkedMovieId(value) || movieId(value.normalize('NFKC')) || value;
    ctx.remote?.request?.abort();
    const state = { label: value, movies: [], request: new AbortController(), loading: true };
    ctx.remote = state;
    ctx.searchText = value;
    say(ctx, '');
    redraw(ctx);
    try {
      state.movies = await searchSongs(ctx, query, state.request.signal);
    } catch (error) {
      if (error.name === 'AbortError') return;
      state.error = error.message || '曲を検索できませんでした。';
    } finally {
      state.loading = false;
    }
    if (ctx.remote !== state || ctx.view !== 'search' || !ctx.panel.isConnected) return;
    redraw(ctx);
  }

  function renderSearch(ctx, db) {
    const bar = el('div', 'tt-pl-toolbar');
    bar.setAttribute('role', 'search');
    const input = el('input', 'form-input');
    input.type = 'search';
    input.placeholder = '曲名・URL・譜面IDで検索';
    input.setAttribute('aria-label', '曲名・URL・譜面IDの検索');
    input.value = ctx.searchText;
    input.addEventListener('input', () => { ctx.searchText = input.value; });
    const submit = () => runSearch(ctx, input.value.trim());
    input.addEventListener('keydown', act(ctx, event => {
      if (event.isComposing || event.key !== 'Enter') return;
      event.preventDefault();
      return submit();
    }));
    bar.append(input, button('曲を検索', act(ctx, submit)));
    const dest = ctx.folder;
    ctx.content.append(bar, el('p', 'tt-pl-note', `登録先：${dest ? pathOf(db, dest) : '未分類'}。📁から別の場所も選べます。`));
    const { label, movies, error, loading } = ctx.remote || {};
    const result = el('p', 'tt-pl-note', !movies ? '曲名や譜面IDで探して、見つかった曲を登録できます。' : loading ? '曲を検索中…' : error || `「${label}」の検索結果：${movies.length}件`);
    result.setAttribute('role', 'status');
    ctx.content.append(result);
    if (!movies?.length || loading || error) return;
    const list = el('div', 'tt-pl-list');
    const savedSongs = new Map(db.songs.map(song => [song.id, song]));
    for (const song of movies) {
      const { row, info, actions } = songCard(song);
      const saved = savedSongs.get(song.id);
      if (ctx.roomId) actions.prepend(proposalButton(ctx, song));
      if (saved && (!dest || saved.folders.includes(dest))) info.append(el('span', 'tt-pl-note', '登録済み'));
      else actions.append(button('登録', act(ctx, async () => {
        await change(current => { storeSong(current, song, dest); });
        say(ctx, `「${song.title}」を登録しました。`);
      })));
      attachSongPicker(ctx, actions, song, db, 'search', saved);
      list.append(row);
    }
    ctx.content.append(list);
  }

  function folderOperations(ctx, db, folder) {
    const menu = el('select', 'tt-pl-btn tt-pl-select tt-pl-folder-operations');
    menu.setAttribute('aria-label', 'フォルダ操作');
    const choices = [['', 'フォルダ操作'], ['random', 'ランダム選曲…']];
    if (folder) choices.push(['rename', '名前を変更'], ['move', 'フォルダを移動'], ['delete', 'フォルダを削除']);
    for (const [value, label] of choices) {
      const option = el('option', '', label);
      option.value = value;
      option.disabled = !value;
      menu.append(option);
    }
    menu.value = '';
    menu.addEventListener('change', act(ctx, async () => {
      const op = menu.value;
      menu.value = '';
      if (op === 'random') {
        const here = ctx.folder;
        const hasChildren = db.folders.some(f => f.parent === here);
        ctx.randomChoice = { folder: here, selected: new Set(hasChildren ? [] : [here]), count: '1', nested: false, drawn: [] };
        selectView(ctx, 'random');
        ctx.content.querySelector('.tt-pl-random-title')?.focus({ preventScroll: true });
      } else if (folder && op === 'rename') await renameFolder(ctx, folder);
      else if (folder && op === 'move') {
        ctx.moveFolder = folder.parent;
        selectView(ctx, 'move');
      } else if (folder && op === 'delete') await deleteFolder(ctx, folder);
    }));
    return menu;
  }

  function randomCandidates(db, state) {
    const wanted = new Set([...state.selected].filter(id => id !== state.folder));
    if (state.nested && wanted.size) {
      const tree = new Map();
      for (const folder of db.folders) {
        if (!tree.has(folder.parent)) tree.set(folder.parent, []);
        tree.get(folder.parent).push(folder.id);
      }
      for (const id of wanted) for (const child of tree.get(id) || []) wanted.add(child);
    }
    if (state.selected.has(state.folder)) wanted.add(state.folder);
    return db.songs.filter(song => song.folders.length ? song.folders.some(id => wanted.has(id)) : wanted.has(ROOT));
  }

  function sampleSongs(pool, count) {
    const chosen = pool.slice();
    const size = Math.min(count, chosen.length);
    for (let i = 0; i < size; i++) {
      const j = i + Math.floor(Math.random() * (chosen.length - i));
      [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
    }
    return chosen.slice(0, size);
  }

  function batchStatus(ctx, batch, message) {
    if (ctx.view === 'random' && ctx.randomChoice === batch.choice && ctx.panel.isConnected) say(ctx, message);
  }

  function stopRandomBatch(ctx, announce = false) {
    const batch = ctx.randomBatch;
    if (!batch || batch.cancelled) return;
    batch.cancelled = true;
    syncProposalButtons(ctx);
    ctx.randomChoice?.syncControls?.();
    if (announce) batchStatus(ctx, batch, '残りの曲の自動提案を停止します。');
  }

  async function runRandomBatch(ctx, batch) {
    const total = batch.songs.length;
    let sent = 0;
    let skipped = 0;
    let failure = '';
    batchStatus(ctx, batch, `${total}曲を選びました。表示順に提案します。`);
    try {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      for (const [index, song] of batch.songs.entries()) {
        if (batch.cancelled || ctx.panel.hidden || !ctx.panel.isConnected || ctx.host.hidden ||
            ctx.host.classList.contains('is-hidden') || ctx.view !== 'random' || ctx.randomChoice !== batch.choice ||
            roomIdFor(ctx.host) !== ctx.roomId) {
          batch.cancelled = true;
          break;
        }
        batch.waiting.delete(song.id);
        if (ctx.proposals.has(song.id)) { skipped++; continue; }
        batchStatus(ctx, batch, `${index + 1}/${total}曲目を提案中：${song.title}（送信済み${sent}曲）`);
        try {
          if (await proposeSong(ctx, song, batch)) sent++;
          else skipped++;
        } catch (error) {
          failure = `「${song.title}」の提案で停止しました：${error?.message || '送信できませんでした。'}`;
          break;
        }
        if (index + 1 < total && !batch.cancelled) await new Promise(resolve => setTimeout(resolve, 300));
      }
    } finally {
      ctx.randomBatch = null;
      syncProposalButtons(ctx);
      ctx.randomChoice?.syncControls?.();
      const left = total - sent - skipped;
      const heading = failure || (left ? '残りの自動提案を停止しました。' : '自動提案が完了しました。');
      const summary = `提案${sent}曲${skipped ? `・すでに提案済み${skipped}曲` : ''}${left ? `・未完了${left}曲` : ''}`;
      batchStatus(ctx, batch, `${heading}（${summary}）`);
    }
  }

  function renderRandom(ctx, db) {
    const state = ctx.randomChoice;
    const folders = children(db, ctx.folder);
    const visible = new Set([ctx.folder, ...folders.map(folder => folder.id)]);
    for (const id of state.selected) if (!visible.has(id)) state.selected.delete(id);
    const heading = el('div', 'tt-pl-toolbar');
    const title = el('strong', 'tt-pl-random-title', `ランダム選曲：${pathOf(db, ctx.folder) || '一番上'}`);
    title.tabIndex = -1;
    heading.append(button('フォルダに戻る', () => selectView(ctx, 'browse')), title);
    const field = el('fieldset', 'tt-pl-random-folders');
    const choices = el('div', 'tt-pl-picker-children tt-pl-choices');
    const addChoice = (id, label) => choices.append(checkbox(label, state.selected.has(id), on => {
      if (ctx.randomBatch) return;
      if (on) state.selected.add(id); else state.selected.delete(id);
      resetDraw();
    }));
    addChoice(ctx.folder, ctx.folder === ROOT ? '一番上の未分類曲' : '現在のフォルダ直下の曲');
    for (const folder of folders) addChoice(folder.id, folder.name);
    field.append(el('legend', '', '選曲元'), choices);
    const nested = checkbox('チェックした子フォルダの下の階層も含める', state.nested, on => {
      if (ctx.randomBatch) return;
      state.nested = on;
      resetDraw();
    });
    if (folders.length) choices.append(nested);
    const controls = el('div', 'tt-pl-toolbar');
    const label = el('label', 'tt-pl-random-count');
    const number = el('input', 'form-input');
    number.type = 'number';
    number.min = '1';
    number.step = '1';
    number.value = state.count;
    number.setAttribute('aria-label', '選曲する曲数');
    label.append(el('span', '', '曲数'), number);
    const status = el('p', 'tt-pl-note');
    status.setAttribute('role', 'status');
    const list = el('div', 'tt-pl-list');
    list.setAttribute('role', 'group');
    list.setAttribute('aria-label', 'ランダム選曲の結果');
    let pool = [];
    const draw = act(ctx, async () => {
      if (ctx.randomBatch || !pool.length) return;
      state.count = number.value;
      const n = Number(state.count);
      if (!Number.isInteger(n) || n < 1) throw new Error('曲数に1以上の整数を入力してください。');
      if (ctx.roomId && [...ctx.proposals.values()].includes('pending')) throw new Error('送信中の提案が完了してからもう一度押してください。');
      state.drawn = sampleSongs(pool, n);
      say(ctx, '');
      const batch = ctx.roomId ? { choice: state, songs: state.drawn, waiting: new Set(state.drawn.map(song => song.id)), cancelled: false } : null;
      if (batch) ctx.randomBatch = batch;
      showResults();
      if (batch) await runRandomBatch(ctx, batch);
    });
    const start = button(ctx.roomId ? 'ランダム選曲して自動提案' : 'ランダム選曲', draw);
    const stop = button('残りを停止', () => stopRandomBatch(ctx, true));
    controls.append(label, start);
    if (ctx.roomId) controls.append(stop);
    state.syncControls = () => {
      const batch = ctx.randomBatch;
      field.disabled = number.disabled = !!batch;
      start.disabled = !pool.length || !!batch;
      stop.hidden = !batch;
      stop.disabled = !!batch?.cancelled;
    };
    number.addEventListener('input', () => {
      if (ctx.randomBatch) return;
      state.count = number.value;
      resetDraw();
    });
    number.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        return draw(event);
      }
    });
    function showResults() {
      const drawn = state.drawn;
      state.syncControls();
      status.textContent = drawn.length ? `候補${pool.length}曲から${drawn.length}曲を選びました。` :
        !state.selected.size ? '選曲元にチェックを入れてください。' : pool.length ? `候補は${pool.length}曲です。` : '選曲できる曲がありません。';
      list.replaceChildren(...drawn.map(song => {
        const { row, actions } = songCard(song);
        if (ctx.roomId) actions.prepend(proposalButton(ctx, song));
        return row;
      }));
      list.hidden = !drawn.length;
    }
    function resetDraw() {
      say(ctx, '');
      state.drawn = [];
      pool = randomCandidates(db, state);
      showResults();
    }
    ctx.content.append(heading, field, controls, status, list);
    pool = randomCandidates(db, state);
    showResults();
  }

  function renderBrowse(ctx, db) {
    const open = id => openFolder(ctx, id);
    const folder = db.folders.find(f => f.id === ctx.folder);
    ctx.content.append(breadcrumb(db, ctx.folder, open));
    const controls = el('div', 'tt-pl-toolbar');
    if (folder) controls.append(button('上へ', () => open(folder.parent)));
    controls.append(button('新規フォルダ', act(ctx, () => createFolder(ctx))), folderOperations(ctx, db, folder));
    ctx.content.append(controls);
    const childFolders = children(db, ctx.folder);
    const list = el('div', 'tt-pl-list');
    if (childFolders.length) {
      const sub = el('div');
      sub.setAttribute('role', 'group');
      sub.setAttribute('aria-label', 'この場所のフォルダ');
      for (const f of childFolders) sub.append(folderRow(f, open));
      list.append(sub);
    }
    const stored = db.songs.filter(s => folder ? s.folders.includes(folder.id) : s.folders.length === 0)
      .sort((a, b) => b.savedAt - a.savedAt || a.title.localeCompare(b.title, 'ja'));
    if (!stored.length) {
      if (childFolders.length) ctx.content.append(list);
      ctx.content.append(el('p', 'tt-pl-note', folder ? 'このフォルダに登録された譜面はありません。' : '一番上に未分類の譜面はありません。'));
      return;
    }
    const tools = el('div', 'tt-pl-toolbar');
    const search = el('input', 'form-input');
    search.type = 'search';
    search.placeholder = 'この場所の曲を絞り込む';
    search.setAttribute('aria-label', search.placeholder);
    search.value = ctx.query;
    search.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
    const count = el('span', 'tt-pl-note');
    tools.append(search, count);
    const songList = el('div', 'tt-pl-song-list');
    list.append(songList);
    const drawSongs = () => {
      closePicker(ctx);
      ctx.query = search.value;
      const words = normalize(ctx.query).trim().split(/\s+/).filter(Boolean);
      const songs = stored.filter(s => words.every(word => normalize(`${s.title} ${s.channel_name} ${s.id}`).includes(word)));
      count.textContent = `${songs.length}件`;
      songList.replaceChildren(...songs.map(song => songRow(ctx, song, db)));
      if (!songs.length) songList.append(el('p', 'tt-pl-note', '表示する譜面がありません。'));
    };
    search.addEventListener('input', drawSongs);
    drawSongs();
    ctx.content.append(tools, list);
  }

  function renderMore(ctx, db) {
    const menu = el('div', 'tt-pl-more');
    const file = el('input');
    file.type = 'file';
    file.accept = '.json,application/json';
    file.addEventListener('change', act(ctx, async () => {
      const selected = file.files?.[0];
      file.value = '';
      await restoreBackup(ctx, selected);
    }));
    menu.append(button('標準リストから取り込む', act(ctx, () => openImport(ctx))),
      button('ID・URLで保存', act(ctx, () => addById(ctx))),
      button('バックアップを書き出す', act(ctx, exportBackup)),
      button('バックアップから復元', () => file.click()), file);
    ctx.content.append(el('p', 'tt-pl-note', `取り込み・ID指定の保存先：${pathOf(db, ctx.folder) || '未分類'}`), menu);
    if (ctx.view === 'import') {
      renderImport(ctx, db);
      ctx.content.append(button('取り込みを閉じる', () => selectView(ctx, 'more')));
    }
  }

  function selectView(ctx, view) {
    if (view !== 'random') stopRandomBatch(ctx);
    ctx.view = view;
    say(ctx, '');
    redraw(ctx);
  }

  function redraw(ctx) {
    closePicker(ctx);
    ctx.content.replaceChildren();
    try {
      const db = readDb();
      if (ctx.kind === 'detail') {
        const saved = db.songs.find(s => s.id === ctx.song.id);
        ctx.tab.textContent = saved ? '拡張プレイリストの登録先' : '拡張プレイリストに保存';
        if (!ctx.panel.hidden) {
          ctx.detailPicker ||= membershipState(saved, ROOT);
          const area = el('div', 'tt-pl-picker');
          ctx.content.append(el('p', 'tt-pl-note', 'フォルダを開いて、保存先にチェックを入れてください。'), area);
          renderPicker(ctx, area, db, ctx.detailPicker, saved || ctx.song, 'detail', saved, () => toggleDetail(ctx, false));
        }
        return;
      }
      const folder = db.folders.find(f => f.id === ctx.folder);
      if (!folder) ctx.folder = ROOT;
      if ((ctx.view === 'move' && !folder) || (ctx.view === 'random' && ctx.randomChoice.folder !== ctx.folder)) {
        stopRandomBatch(ctx);
        ctx.view = 'browse';
      }
      const selected = ctx.view === 'import' ? 'more' : ['move', 'random'].includes(ctx.view) ? 'browse' : ctx.view;
      for (const [view, tab] of ctx.innerTabs) {
        tab.setAttribute('aria-selected', String(view === selected));
        tab.tabIndex = view === selected ? 0 : -1;
      }
      ctx.content.setAttribute('aria-labelledby', ctx.innerTabs.get(selected).id);
      if (ctx.view === 'search') renderSearch(ctx, db);
      else if (selected === 'more') renderMore(ctx, db);
      else if (ctx.view === 'move') renderMove(ctx, db, folder);
      else if (ctx.view === 'random') renderRandom(ctx, db);
      else renderBrowse(ctx, db);
    } catch (error) {
      report(ctx, error);
    }
  }

  function redrawAll() {
    for (const ctx of mounted.values()) {
      if (ctx.panel.isConnected && (ctx.rendered || ctx.kind === 'detail')) redraw(ctx);
    }
  }

  function panelContext(kind, key, host) {
    const panel = el('section', 'tt-pl-panel');
    panel.setAttribute('aria-label', '拡張プレイリスト');
    panel.hidden = true;
    const status = el('p', 'tt-pl-note tt-pl-status');
    status.setAttribute('role', 'status');
    const content = el('div', 'tt-pl-panel-content');
    const uid = `tt-pl-${++serial}`;
    const ctx = { kind, key, host, uid, panel, status, content, folder: ROOT, view: 'browse', query: '', searchText: '' };
    if (kind !== 'detail') {
      content.id = `${uid}-view`;
      content.setAttribute('role', 'tabpanel');
      const nav = el('div', 'tt-pl-tabs');
      nav.setAttribute('role', 'tablist');
      nav.setAttribute('aria-label', '拡張プレイリストの操作');
      ctx.innerTabs = new Map();
      for (const [index, [view, label]] of VIEWS.entries()) {
        const tab = button(label, () => selectView(ctx, view));
        tab.id = `${uid}-${view}`;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', content.id);
        tab.addEventListener('keydown', event => {
          const next = { ArrowLeft: (index + VIEWS.length - 1) % VIEWS.length, ArrowRight: (index + 1) % VIEWS.length,
            Home: 0, End: VIEWS.length - 1 }[event.key];
          if (!Number.isInteger(next)) return;
          event.preventDefault();
          const nextView = VIEWS[next][0];
          selectView(ctx, nextView);
          ctx.innerTabs.get(nextView).focus();
        });
        ctx.innerTabs.set(view, tab);
        nav.append(tab);
      }
      panel.append(nav);
    }
    panel.append(status, content);
    mounted.set(key, ctx);
    return ctx;
  }

  function showPanel(ctx, show) {
    if (!show) {
      closePicker(ctx);
      stopRandomBatch(ctx);
    }
    if (ctx.kind === 'room') ctx.host.toggleAttribute('data-tt-pl-room-open', show);
    ctx.panel.hidden = !show;
    ctx.tab.setAttribute('aria-pressed', String(show));
    if (show && !ctx.rendered) {
      ctx.rendered = true;
      redraw(ctx);
    }
  }

  function hasAction(node, name) {
    return (node.getAttribute('data-action') || '').split(/\s+/).some(token => {
      const action = token.split('->').pop();
      return action === name || action.startsWith(name + ':');
    });
  }

  function mountRoom(tabs) {
    if (mounted.has(tabs)) return;
    const nativeTabs = [...tabs.querySelectorAll('button.room-search-tab')];
    const search = nativeTabs.find(b => hasAction(b, 'battle-room#switchToSearch'));
    const later = nativeTabs.find(b => hasAction(b, 'battle-room#switchToPlayLater'));
    if (!search || !later) return;
    const modalContent = tabs.closest('.tv-modal-content');
    const host = tabs.closest(MODAL) || modalContent ||
      tabs.closest('.tv-modal-body') || tabs.parentElement;
    if (!host) return;
    tabs.querySelectorAll('.tt-pl-tab').forEach(stale => stale.remove());
    if (tabs.nextElementSibling?.hasAttribute('data-tt-pl-room-panel')) tabs.nextElementSibling.remove();
    const ctx = panelContext('room', tabs, host);
    ctx.anchor = tabs;
    ctx.nativeTabs = [search, later];
    ctx.roomId = roomIdFor(host);
    ctx.proposals = new Map();
    ctx.previous = search;
    const tab = button('拡張プレイリスト', () => {
      ctx.previous = ctx.nativeTabs.find(b => b.classList.contains('active')) || ctx.previous;
      for (const b of ctx.nativeTabs) b.classList.remove('active');
      tab.classList.add('active');
      showPanel(ctx, true);
    }, 'room-search-tab tt-pl-tab');
    tab.setAttribute('aria-pressed', 'false');
    ctx.tab = tab;
    host.classList.add('tt-pl-modal');
    modalContent?.setAttribute('data-tt-pl-wide', '');
    if (later.parentElement === tabs) later.after(tab);
    else tabs.append(tab);
    ctx.panel.setAttribute('data-tt-pl-room-panel', '');
    tabs.after(ctx.panel);
    const listener = new MutationObserver(() => {
      if (host.hidden || host.classList.contains('is-hidden')) {
        closePicker(ctx);
        stopRandomBatch(ctx);
      }
      showPanel(ctx, tab.classList.contains('active'));
    });
    listener.observe(tab, { attributes: true, attributeFilter: ['class'] });
    listener.observe(host, { attributes: true, attributeFilter: ['class', 'hidden'] });
    const leave = () => {
      tab.classList.remove('active');
      showPanel(ctx, false);
    };
    search.addEventListener('click', leave);
    later.addEventListener('click', leave);
    ctx.disconnect = () => {
      listener.disconnect();
      search.removeEventListener('click', leave);
      later.removeEventListener('click', leave);
      if (tab.classList.contains('active') && ctx.previous?.isConnected) ctx.previous.classList.add('active');
      host.removeAttribute('data-tt-pl-room-open');
      host.classList.remove('tt-pl-modal');
      modalContent?.removeAttribute('data-tt-pl-wide');
    };
  }

  function mountStandard(host) {
    if (mounted.has(host)) return;
    const list = host.querySelector(LATER_LIST);
    if (!list) return;
    const ctx = panelContext('standard', host, host);
    ctx.anchor = list;
    host.classList.add('tt-pl-standard');
    const nav = el('div', 'tt-pl-nav');
    nav.setAttribute('aria-label', 'あとでプレイの表示');
    const select = show => {
      host.toggleAttribute('data-tt-pl-show-saved', show);
      stock.setAttribute('aria-pressed', String(!show));
      showPanel(ctx, show);
    };
    const stock = button('標準リスト', () => select(false));
    const tab = button('拡張プレイリスト', () => select(true), 'tt-pl-btn tt-pl-tab');
    ctx.tab = tab;
    ctx.nav = nav;
    select(false);
    nav.append(stock, tab);
    list.before(nav);
    list.after(ctx.panel);
    ctx.disconnect = () => {
      host.classList.remove('tt-pl-standard');
      host.removeAttribute('data-tt-pl-show-saved');
    };
  }

  function detailId() {
    return movieId(location.pathname.match(/^\/movie\/show\/(\d+)\/?$/)?.[1]);
  }

  function detailAnchor(id) {
    const native = [...document.querySelectorAll(DETAIL_ADD)].find(node =>
      node.getAttribute('data-play-later-movie-id-param') === id &&
      (node.matches('[data-play-later-target~="addBtn"]') || hasAction(node, 'play-later#toggle')));
    return document.querySelector(DETAIL_CTA) || native || document.querySelector('main h1, h1');
  }

  function detailSong(id, page = document) {
    return movie({
      id,
      title: page.querySelector('meta[property="og:title"]')?.content ||
        page.querySelector('main h1, h1')?.textContent || page.title,
      thumbnail_url: page.querySelector('meta[property="og:image"]')?.content
    });
  }

  function toggleDetail(ctx, open) {
    if (open) ctx.song = detailSong(ctx.song.id);
    ctx.detailPicker = null;
    ctx.panel.hidden = !open;
    ctx.tab.setAttribute('aria-expanded', String(open));
    say(ctx, '');
    redraw(ctx);
  }

  function mountDetail(anchor, id) {
    if (!anchor || mounted.has(anchor)) return;
    const ctx = panelContext('detail', anchor, anchor.parentElement);
    ctx.anchor = anchor;
    ctx.song = detailSong(id);
    const wrap = el('div', 'tt-pl-detail');
    ctx.nav = wrap;
    ctx.tab = button('拡張プレイリストに保存', act(ctx, () => {
      try {
        toggleDetail(ctx, ctx.panel.hidden);
      } catch (error) {
        ctx.panel.hidden = false;
        ctx.tab.setAttribute('aria-expanded', 'true');
        report(ctx, error);
      }
    }));
    ctx.tab.setAttribute('aria-expanded', 'false');
    wrap.append(ctx.tab, ctx.panel);
    anchor.after(wrap);
    redraw(ctx);
  }

  function remove(ctx) {
    closePicker(ctx);
    stopRandomBatch(ctx);
    ctx.remote?.request?.abort();
    ctx.disconnect?.();
    ctx.nav?.remove();
    ctx.tab.remove();
    ctx.panel.remove();
    mounted.delete(ctx.key);
  }

  function mount() {
    if (suspended) return;
    const id = detailId();
    const anchor = id ? detailAnchor(id) : null;
    for (const ctx of mounted.values()) {
      if (!ctx.key.isConnected || !ctx.host.isConnected || !ctx.anchor.isConnected ||
          !ctx.tab.isConnected || !ctx.panel.isConnected ||
          (ctx.kind === 'detail' && (ctx.anchor !== anchor || ctx.song.id !== id)) ||
          (ctx.kind === 'room' && (roomIdFor(ctx.host) !== ctx.roomId ||
            !ctx.key.contains(ctx.tab) || ctx.nativeTabs.some(tab => !ctx.key.contains(tab))))) remove(ctx);
    }
    document.querySelectorAll(ROOM_TABS).forEach(mountRoom);
    document.querySelectorAll(LATER_PANEL).forEach(mountStandard);
    if (anchor) mountDetail(anchor, id);
  }

  function scheduleMount() {
    if (mounting || suspended) return;
    mounting = true;
    requestAnimationFrame(() => { mounting = false; mount(); });
  }

  const mountNodes = [ROOM_TABS, MODAL, '.room-search-tab', '[data-tt-pl-room-panel]',
    LATER_PANEL, LATER_LIST, DETAIL_ADD, DETAIL_CTA, 'h1', '.tt-pl-nav', '.tt-pl-tab', '.tt-pl-detail'].join(', ');
  function touchesMount(element) {
    return element instanceof Element && (element.matches(mountNodes) || !!element.querySelector(mountNodes));
  }

  new MutationObserver(records => {
    if (records.some(record => record.type === 'attributes' ||
      [...record.addedNodes, ...record.removedNodes].some(touchesMount))) scheduleMount();
  }).observe(document.documentElement, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ['data-battle-room-target', 'data-play-later-target', 'data-movie-detail-target',
      'data-play-later-movie-id-param', 'data-battle-room-room-id-value', 'data-action']
  });
  document.addEventListener('click', event => {
    if (activePicker && !activePicker.trigger.contains(event.target) && !activePicker.popup.contains(event.target)) closePicker();
    const target = event.target instanceof Element && event.target.closest(ROOM_SEARCH_OPENER);
    if (!target || !hasAction(target, 'battle-room#openSongSearch')) return;
    suspended = false;
    scheduleMount();
  }, true);
  document.addEventListener('scroll', queuePickerPosition, { capture: true, passive: true });
  window.addEventListener('resize', queuePickerPosition);
  for (const event of ['turbo:render', 'turbo:load']) {
    document.addEventListener(event, () => { suspended = false; scheduleMount(); });
  }
  document.addEventListener('turbo:before-cache', () => {
    suspended = true;
    for (const ctx of mounted.values()) remove(ctx);
  });
  GM_addValueChangeListener(KEY, (_key, _old, _new, remote) => { if (remote) redrawAll(); });
  mount();
})();

(() => {
  'use strict';
  if (window.top !== window) return;
  const monthly = path => /^\/discover\/monthly\/?$/.test(path);
  const links = 'nav.pagination-plate a.page-link[href]';
  const applied = new WeakMap();

  function preserveFilters(nodes) {
    const current = new URL(location.href);
    if (!monthly(current.pathname)) return;
    const carry = current.searchParams;
    carry.delete('page');
    const hasFilters = !!carry.toString();
    for (const node of nodes) {
      const href = node.getAttribute('href');
      if (!href || href.startsWith('#')) continue;
      const before = applied.get(node);
      const source = before?.next === href ? before.source : href;
      if (!hasFilters) {
        applied.delete(node);
        if (href !== source) node.setAttribute('href', source);
        continue;
      }
      let target;
      try { target = new URL(source, current.href); } catch { continue; }
      if (target.origin !== current.origin || !monthly(target.pathname)) continue;
      const page = target.searchParams.get('page');
      if (page !== null && !/^[1-9]\d*$/.test(page)) continue;
      const query = new URLSearchParams(carry);
      for (const [name, value] of target.searchParams) {
        if (name !== 'page' && !carry.has(name)) query.append(name, value);
      }
      if (page !== null && page !== '1') query.set('page', page);
      target.search = query.toString();
      const next = target.pathname + target.search + target.hash;
      if (next === source) applied.delete(node);
      else applied.set(node, { source, next });
      if (next !== href) node.setAttribute('href', next);
    }
  }

  const observer = new MutationObserver(records => {
    const changed = new Set();
    for (const record of records) {
      if (record.type === 'attributes') {
        if (record.target.matches(links)) changed.add(record.target);
      } else {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches(links)) changed.add(node);
          for (const link of node.querySelectorAll(links)) changed.add(link);
        }
      }
    }
    if (changed.size) preserveFilters(changed);
  });

  function refresh() {
    observer.disconnect();
    if (!monthly(location.pathname)) return;
    preserveFilters(document.querySelectorAll(links));
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['href'] });
  }

  document.addEventListener('turbo:render', refresh);
  document.addEventListener('turbo:load', refresh);
  refresh();
})();

GM_addStyle(String.raw`
html[data-tt-hide-chat-reactions] :is(
  .lobby-chat-msg-reactions,
  .lobby-chat-msg-react-btn,
  .le-chat-msg-reactions,
  .le-chat-msg-react-btn,
  .room-chat-msg-reactions,
  .room-chat-msg-react-btn
) {
  display: none !important;
}
.lobby-chat-msg-user[data-tt-user-color-id],
.le-chat-msg-user[data-tt-user-color-id],
.room-chat-msg-user[data-tt-user-color-id] {
  display: inline-block;
  box-sizing: border-box;
  margin-inline: 1px 3px;
  padding: 1px 6px;
  border: 1px solid hsl(var(--tt-user-hue) 68% 38%);
  border-radius: 999px;
  background-color: hsl(var(--tt-user-hue) 78% 86%);
  color: hsl(var(--tt-user-hue) 72% 20%) !important;
  font-weight: 700;
  line-height: 1.45;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 35%);
}
.lobby-chat-msg-user[data-tt-user-color-id]:hover,
.le-chat-msg-user[data-tt-user-color-id]:hover,
.room-chat-msg-user[data-tt-user-color-id]:hover {
  background-color: hsl(var(--tt-user-hue) 82% 79%);
}
.lobby-chat-msg-user[data-tt-following]::after,
.le-chat-msg-user[data-tt-following]::after,
.room-chat-msg-user[data-tt-following]::after {
  content: "★";
  color: #b16a00;
  text-shadow: 0 1px 0 rgb(255 255 255 / 60%);
}
.tt-user-profile-button {
  display: inline-block;
  box-sizing: border-box;
  margin-inline: 4px;
  padding: 2px 7px;
  border: 1px solid #54708f;
  border-radius: 5px;
  background: #f4f8fc;
  color: #244b73 !important;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.3;
  text-decoration: none !important;
  vertical-align: middle;
  cursor: pointer;
}
.tt-user-profile-button:hover {
  background: #dcecff;
  border-color: #315f8e;
}
.tt-user-profile-button:focus-visible {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
}
.tt-reaction-quantity-controls {
  display: flex !important;
  flex-wrap: wrap;
  align-items: center;
  flex: 0 0 100%;
  box-sizing: border-box;
  width: 100%;
  gap: 8px;
  margin: 0 0 8px;
  padding: 8px 10px;
  border: 1px solid #6b7280;
  border-radius: 6px;
  background: #f4f8fc;
  color: #111827;
  font-size: 0.82rem;
}
.tt-reaction-quantity-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
  white-space: nowrap;
}
.tt-reaction-quantity-input {
  box-sizing: border-box;
  width: 72px;
  padding: 4px 6px;
  border: 1px solid #6b7280;
  border-radius: 5px;
  background: #fff;
  color: #111827;
  font: inherit;
  text-align: right;
}
.tt-reaction-quantity-input:focus-visible {
  outline: 2px solid #1976d2;
  outline-offset: 1px;
}
.tt-reaction-quantity-status {
  min-width: 6em;
  color: #256029;
  font-weight: 600;
}
.tt-reaction-quantity-status.is-error {
  color: #b42318;
}
.tt-reaction-quantity-controls.is-sending {
  opacity: 0.7;
  pointer-events: none;
}
.tt-prepurchase-bulk-controls {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 5px;
}
.tt-prepurchase-bulk-input {
  box-sizing: border-box;
  width: 72px;
  padding: 4px 6px;
  border: 1px solid #61705a;
  border-radius: 5px;
  background: #11180f;
  color: #f2f7ef;
  font: inherit;
  text-align: right;
}
.tt-prepurchase-bulk-button {
  box-sizing: border-box;
  padding: 5px 8px;
  border: 1px solid #5f843d;
  border-radius: 5px;
  background: #172611;
  color: #cfeeaf;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
}
.tt-prepurchase-bulk-button:hover {
  background: #263c1b;
}
.tt-prepurchase-bulk-input:focus-visible,
.tt-prepurchase-bulk-button:focus-visible {
  outline: 2px solid #8dcc56;
  outline-offset: 1px;
}
.tt-prepurchase-bulk-status {
  max-width: 13em;
  color: #a9dc7f;
  font-size: 0.72rem;
  font-weight: 600;
}
.tt-prepurchase-bulk-status.is-error {
  color: #ff8b82;
}
.tt-prepurchase-bulk-controls.is-sending {
  opacity: 0.65;
  pointer-events: none;
}
.tt-user-profile-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  vertical-align: middle;
}
.tt-user-follow-button,
.tt-user-nickname-button {
  box-sizing: border-box;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
}
.tt-user-follow-button {
  border: 1px solid #3478bd;
  background: #eaf4ff;
  color: #17578f;
}
.tt-user-follow-button:hover {
  background: #d5eaff;
}
.tt-user-follow-button.is-following {
  border-color: #9a7318;
  background: #ffedb8;
  color: #694800;
}
.tt-user-follow-button.is-following::before {
  content: "★";
}
.tt-user-nickname-button {
  border: 1px solid #6b7280;
  background: #f7f7f8;
  color: #374151;
}
.tt-user-nickname-button:hover,
.tt-user-nickname-button.has-nickname {
  background: #e8eaed;
  border-color: #4b5563;
}
.tt-user-follow-button:focus-visible,
.tt-user-nickname-button:focus-visible {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
}
.lobby-chat-msg[data-tt-blocked],
.le-chat-msg[data-tt-blocked],
.room-chat-msg[data-tt-blocked] {
  display: none !important;
}
.tt-user-block-button {
  box-sizing: border-box;
  padding: 5px 10px;
  border: 1px solid #b33a3a;
  border-radius: 6px;
  background: #fff0f0;
  color: #8f2020;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
}
.tt-user-block-button:hover {
  background: #ffe0e0;
}
.tt-user-block-button.is-blocked {
  border-color: #555;
  background: #e8e8e8;
  color: #333;
}
.tt-user-block-button:focus-visible {
  outline: 2px solid #d33;
  outline-offset: 2px;
}
.tt-user-list-panel {
  position: fixed;
  top: 52px;
  right: 12px;
  z-index: 2147483001;
  width: min(360px, calc(100vw - 24px));
  max-height: min(70vh, 560px);
  overflow: auto;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid #bbb;
  border-radius: 10px;
  background: #fff;
  color: #222;
  font-family: sans-serif;
  font-size: 13px;
  box-shadow: 0 6px 24px rgba(0,0,0,.18);
  user-select: none;
}
.tt-user-list-panel[hidden] {
  display: none !important;
}
.tt-user-list-panel h3 {
  margin: 0 0 8px;
  padding: 3px 0 6px;
  font-size: 15px;
}
.tt-user-list-search {
  box-sizing: border-box;
  width: 100%;
  margin: 0 0 8px;
  padding: 7px 9px;
  border: 1px solid #aaa;
  border-radius: 6px;
  background: #fff;
  color: #222;
  font: inherit;
}
.tt-user-list-search:focus-visible {
  outline: 2px solid #1976d2;
  outline-offset: 1px;
}
.tt-user-list-search-status {
  margin: 0 0 7px;
  color: #666;
  font-size: 11px;
}
.tt-user-list-empty {
  margin: 8px 0;
  color: #666;
}
.tt-user-list-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 0;
  border-top: 1px solid #eee;
}
.tt-user-list-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tt-user-list-name-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.tt-user-online-status {
  flex: none;
  font-size: 11px;
  font-weight: 700;
}
.tt-user-online-status.is-online {
  color: #16833a;
}
.tt-user-online-status.is-offline {
  color: #8a8a8a;
}
.tt-user-list-name-line > span:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tt-user-list-name small {
  display: block;
  color: #777;
  font-size: 11px;
}
.tt-user-list-action {
  flex: none;
  padding: 4px 7px;
  border: 1px solid #999;
  border-radius: 5px;
  background: #f8f8f8;
  cursor: pointer;
  font-size: 11px;
}
.tt-user-list-action:hover {
  background: #eaeaea;
}
@media (max-width: 700px) {
  .tt-user-profile-actions {
    display: flex;
    width: fit-content;
    margin-top: 7px;
    margin-left: 0;
  }
  .tt-reaction-quantity-controls {
    width: 100%;
    margin-top: 6px;
    margin-left: 0;
    padding-left: 0;
  }
  .tt-prepurchase-bulk-controls {
    flex-wrap: wrap;
  }
}
`);

(() => {
"use strict";
if(window.top!==window||document.documentElement.hasAttribute("data-tt-assist-combined-v006"))return;
document.documentElement.setAttribute("data-tt-assist-combined-v006","");
const MESSAGE_SELECTOR=[".lobby-chat-msg",".le-chat-msg",".room-chat-msg"].join(", ");
const USER_SELECTOR=[".lobby-chat-msg-user",".le-chat-msg-user",".room-chat-msg-user"].join(", ");
const REPORT_SELECTOR=[".chat-report-btn[data-reported-user-id]",".room-chat-report-btn[data-reported-user-id]"].join(", ");
const PROFILE_BUTTON_CLASS="tt-user-profile-button";
const OLD_FAVORITE_BUTTON_CLASS="tt-user-favorite-button";
const PROFILE_ACTIONS_CLASS="tt-user-profile-actions";
const FOLLOW_BUTTON_CLASS="tt-user-follow-button";
const NICKNAME_BUTTON_CLASS="tt-user-nickname-button";
const BLOCK_BUTTON_CLASS="tt-user-block-button";
const LISTS_TOOLBAR_CLASS="tt-user-lists-toolbar";
const LIST_PANEL_CLASS="tt-user-list-panel";
const REACTION_SHOP_SELECTOR='[data-live-event-target~="reactionShop"]';
const REACTION_CARD_SELECTOR=".lh-reaction-card[data-slot-id]";
const REACTION_CONTROLS_CLASS="tt-reaction-quantity-controls";
const REACTION_QUANTITY_CLASS="tt-reaction-quantity-input";
const REACTION_STATUS_CLASS="tt-reaction-quantity-status";
const MAX_REACTION_QUANTITY=10;
const PREPURCHASE_SECTION_SELECTOR=".lh-prepurchase-section[data-live-event-prepurchase-event-id-value]";
const PREPURCHASE_ITEM_SELECTOR=".lh-prepurchase-item";
const PREPURCHASE_CONTROLS_CLASS="tt-prepurchase-bulk-controls";
const PREPURCHASE_INPUT_CLASS="tt-prepurchase-bulk-input";
const PREPURCHASE_BUTTON_CLASS="tt-prepurchase-bulk-button";
const PREPURCHASE_STATUS_CLASS="tt-prepurchase-bulk-status";
const PROCESSED_ATTRIBUTE="data-tt-user-color-id";
const ORIGINAL_NAME_ATTRIBUTE="data-tt-original-user-name";
const FOLLOWING_ATTRIBUTE="data-tt-following";
const STORAGE_KEY="ttFollowedUsers";
const LEGACY_STORAGE_KEY="ttUserFavorites";
const BLOCKED_STORAGE_KEY="ttBlockedUsers";
const USER_NAMES_STORAGE_KEY="ttUserNames";
const HIDE_CHAT_REACTIONS_KEY="ttHideChatReactions";
let followedUsers={};
let blockedUsers={};
let hideChatReactions=false;
const knownUserNames=new Map();
const lastSeenByUser=new Map();
const wsOnlineUsers=new Set();
let wsPresenceAvailable=false;
let wsHookInstalled=false;
let userListsPanel=null;
let reactionRequestPending=false;
let prepurchaseRequestPending=false;

function colorFromUserId(userId) {
  const numericId=Number(userId);
  if(Number.isSafeInteger(numericId)&&numericId>=0)return(numericId*137.50776405003785)%360;
  let hash=2166136261;
  for(const character of String(userId)){
    hash^=character.codePointAt(0);
    hash=Math.imul(hash,16777619);
  }
  return(hash>>>0)%360;
}

function getUserState(userId) {
  const storedState=followedUsers[userId];
  return{
    following:storedState?.following===true,
    nickname:typeof storedState?.nickname==="string"?storedState.nickname.trim():""
  };
}

function isUserBlocked(userId) {
  return blockedUsers[userId]===true;
}

function applyBlockState(message,userId) {
  if(!(message instanceof Element)||!userId)return;
  const blocked=isUserBlocked(userId);
  message.hidden=blocked;
  message.toggleAttribute("data-tt-blocked",blocked);
  if(blocked&&activeUserMenu?.trigger.closest(MESSAGE_SELECTOR)===message)closeUserMenu();
  const button=message.querySelector(`.${BLOCK_BUTTON_CLASS}`);
  if(button){
    button.textContent=blocked?"ブロック解除":"ブロック";
    button.classList.toggle("is-blocked",blocked);
    button.setAttribute("aria-pressed",String(blocked));
    button.title=blocked?"このユーザーのブロックを解除します":"このユーザーのチャット発言を非表示にします";
  }
}

function getOriginalName(userName) {
  let originalName=userName.getAttribute(ORIGINAL_NAME_ATTRIBUTE);
  if(originalName===null){
    originalName=userName.textContent.trim();
    userName.setAttribute(ORIGINAL_NAME_ATTRIBUTE,originalName);
  }
  return originalName;
}

function applyUserState(userName,userId) {
  const originalName=getOriginalName(userName);
  const state=getUserState(userId);
  if(state.nickname){
    userName.textContent=`${originalName}/${state.nickname}${state.following?" ":""}`;
  }else if(state.following){
    userName.textContent=`${originalName}/`;
  }else{
    userName.textContent=originalName;
  }
  userName.toggleAttribute(FOLLOWING_ATTRIBUTE,state.following);
  const titleLines=[`TypingTube上の名前: ${originalName}`,`ユーザーID: ${userId}`];
  if(state.following)titleLines.unshift("フォロー中");
  if(state.nickname)titleLines.splice(state.following?1:0,0,`独自の名前: ${state.nickname}`);
  userName.title=titleLines.join("\n");
  userName.setAttribute("aria-label",`${originalName}`+`${state.nickname?`、独自の名前は${state.nickname}`:""}`+`${state.following?"、フォロー中":""}、ユーザーID ${userId}`);
}

function rememberUserName(userId,userNameElement) {
  if(!userId||!(userNameElement instanceof Element))return;
  const originalName=getOriginalName(userNameElement).trim();
  if(!originalName)return;
  const key=String(userId);
  knownUserNames.set(key,originalName);
  try{
    const savedNames=GM_getValue(USER_NAMES_STORAGE_KEY,{});
    if(savedNames[key]!==originalName){
      GM_setValue(USER_NAMES_STORAGE_KEY,{...(savedNames&&typeof savedNames==="object"?savedNames:{}),[key]:originalName});
    }
  }catch(error){
    console.warn("TypingTubeのユーザー名を保存できませんでした。",error);
  }
}

function markUserOnline(userId) {
  if(!userId)return;
  lastSeenByUser.set(String(userId),Date.now());
  renderUserLists();
}

function isUserOnline(userId) {
  const key=String(userId);
  if(wsPresenceAvailable)return wsOnlineUsers.has(key);
  const lastSeen=lastSeenByUser.get(key);
  return Number.isFinite(lastSeen)&&Date.now()-lastSeen<=5*60*1000;
}

function getOnlineSortKey(userId) {
  const lastSeen=lastSeenByUser.get(String(userId));
  return Number.isFinite(lastSeen)?lastSeen:0;
}

function getKnownUserName(userId) {
  return knownUserNames.get(String(userId))||`ユーザーID ${userId}`;
}

function normalizeWsUserId(value) {
  if(value==null)return null;
  if(typeof value==="number"&&Number.isSafeInteger(value)&&value>=0)return String(value);
  if(typeof value==="string"&&/^\d+$/.test(value.trim()))return value.trim();
  return null;
}

function collectWsUserIds(value,output=new Set()) {
  if(value==null)return output;
  if(Array.isArray(value)){
    value.forEach(item=>collectWsUserIds(item,output));
    return output;
  }
  if(typeof value!=="object")return output;
  const directKeys=["userId","user_id","userid","uid","memberId","member_id","playerId","player_id"];
  for(const key of directKeys){
    const id=normalizeWsUserId(value[key]);
    if(id)output.add(id);
  }
  for(const key of Object.keys(value)){
    if(/^\d+$/.test(key)&&value[key]===true)output.add(key);
  }
  const collectionKeys=["users","online","onlineUsers","online_users","participants","members","players","userList","user_list"];
  for(const[key,child]of Object.entries(value)){
    if(collectionKeys.includes(key))collectWsUserIds(child,output);
  }
  return output;
}

function classifyPresenceEvent(root) {
  if(!root||typeof root!=="object")return null;
  const text=JSON.stringify(root).toLowerCase();
  const typeText=[root.type,root.event,root.action,root.kind,root.name,root.topic].filter(value=>typeof value==="string").join(" ").toLowerCase();
  const hasPresenceWord=/presence|online|offline|connect|disconnect|join|leave|member|participant/.test(typeText);
  if(!hasPresenceWord&&!/("online"|"offline"|"onlineusers"|"online_users"|"participants"|"members")/.test(text))return null;
  const ids=collectWsUserIds(root);
  if(!ids.size)return null;
  const isOffline=/offline|disconnect|disconnected|leave|left|removed/.test(typeText);
  const isSnapshot=/snapshot|onlineusers|online_users|participants|members|userlist|user_list/.test(typeText)||Object.prototype.hasOwnProperty.call(root,"online")||Object.prototype.hasOwnProperty.call(root,"onlineUsers")||Object.prototype.hasOwnProperty.call(root,"online_users");
  return{ids,isOffline,isSnapshot};
}

function handleWebSocketPayload(raw) {
  if(typeof raw!=="string"||!raw.trim())return;
  let parsed;
  try{
    parsed=JSON.parse(raw);
  }catch(_){
    return;
  }
  const candidates=Array.isArray(parsed)?parsed:[parsed];
  let changed=false;
  for(const root of candidates){
    const event=classifyPresenceEvent(root);
    if(!event)continue;
    wsPresenceAvailable=true;
    if(event.isSnapshot)wsOnlineUsers.clear();
    for(const id of event.ids){
      if(event.isOffline){
        if(wsOnlineUsers.delete(id))changed=true;
      }else if(!wsOnlineUsers.has(id)){
        wsOnlineUsers.add(id);
        changed=true;
      }
    }
  }
  if(changed||wsPresenceAvailable)renderUserLists();
}

function installWebSocketMonitor() {
  window.addEventListener("message",event=>{
    if(event.source!==window||!event.data||event.data.source!=="TT_WS_MONITOR")return;
    if(event.data.kind==="hook_installed"){
      wsHookInstalled=event.data.payload?.ok===true;
      renderUserLists();
      return;
    }
    if(event.data.kind==="message")handleWebSocketPayload(event.data.payload?.data);
  });
}

function normalizeUserSearch(value) {
  return String(value??"").normalize("NFKC").toLocaleLowerCase("ja-JP").trim();
}

function getUserListIds(mode) {
  return mode==="follow"?Object.entries(followedUsers).filter(([,state])=>state?.following===true).map(([userId])=>userId):Object.keys(blockedUsers);
}

function filterUserListIds(ids,query) {
  const normalizedQuery=normalizeUserSearch(query);
  if(!normalizedQuery)return ids;
  return ids.filter(userId=>{
    const name=getKnownUserName(userId);
    return normalizeUserSearch(name).includes(normalizedQuery)||String(userId).includes(normalizedQuery);
  });
}

function createUserListItem(userId,type) {
  const item=document.createElement("div");
  item.className="tt-user-list-item";
  const name=document.createElement("div");
  name.className="tt-user-list-name";
  const nameLine=document.createElement("div");
  nameLine.className="tt-user-list-name-line";
  const status=document.createElement("span");
  status.className=isUserOnline(userId)?"tt-user-online-status is-online":"tt-user-online-status is-offline";
  status.textContent=isUserOnline(userId)?"● オンライン":"● オフライン";
  status.title=wsPresenceAvailable?"TypingTubeのWebSocket通信からオンライン状態を判定しています":(isUserOnline(userId)?"WebSocketのオンライン情報が見つかるまで、5分以内の発言を基準にしています":"WebSocketのオンライン情報が見つかるまで、5分以内の発言を確認できていません");
  const displayName=document.createElement("span");
  displayName.textContent=getKnownUserName(userId);
  nameLine.append(status,displayName);
  const id=document.createElement("small");
  id.textContent=`ID: ${userId}`;
  name.append(nameLine,id);
  const profile=document.createElement("a");
  profile.className="tt-user-list-action";
  profile.href=`/user/${encodeURIComponent(userId)}`;
  profile.target="_blank";
  profile.rel="noopener noreferrer";
  profile.textContent="プロフィール";
  const action=document.createElement("button");
  action.type="button";
  action.className="tt-user-list-action";
  action.textContent="解除";
  if(type==="follow"){
    action.title="フォローを解除";
    action.addEventListener("click",async()=>{
      await toggleFollow(userId);
      renderUserLists();
    });
  }else{
    action.title="ブロックを解除";
    action.addEventListener("click",async()=>{
      await toggleBlock(userId);
      renderUserLists();
    });
  }
  item.append(name,profile,action);
  return item;
}

function renderUserLists() {
  if(!userListsPanel)return;
  const mode=userListsPanel.dataset.mode||"follow";
  const title=userListsPanel.querySelector(".tt-user-list-title");
  const body=userListsPanel.querySelector(".tt-user-list-body");
  const search=userListsPanel.querySelector(".tt-user-list-search");
  const searchStatus=userListsPanel.querySelector(".tt-user-list-search-status");
  if(!title||!body)return;
  const query=search?.value||"";
  const allIds=getUserListIds(mode);
  const ids=filterUserListIds(allIds,query);
  const titleText=title.querySelector(".tt-user-list-title-text");
  if(titleText)titleText.textContent=mode==="follow"?"フォローしている人":"ブロックしている人";
  if(searchStatus)searchStatus.textContent=query.trim()?`${ids.length}人 / ${allIds.length}人`:`${allIds.length}人`;
  body.replaceChildren();
  ids.sort((a,b)=>{
    const aOnline=isUserOnline(a);
    const bOnline=isUserOnline(b);
    if(aOnline!==bOnline)return aOnline?-1:1;
    const aSeen=getOnlineSortKey(a);
    const bSeen=getOnlineSortKey(b);
    if(aSeen!==bSeen)return bSeen-aSeen;
    return getKnownUserName(a).localeCompare(getKnownUserName(b),"ja");
  });
  if(allIds.length===0){
    const empty=document.createElement("p");
    empty.className="tt-user-list-empty";
    empty.textContent=mode==="follow"?"フォローしている人はいません。":"ブロックしている人はいません。";
    body.append(empty);
    return;
  }
  if(ids.length===0){
    const empty=document.createElement("p");
    empty.className="tt-user-list-empty";
    empty.textContent=`「${query}」に一致するユーザーはいません。`;
    body.append(empty);
    return;
  }
  ids.forEach(userId=>body.append(createUserListItem(userId,mode)));
}

let activeUserMenu=null;
let commentPopup=null;
let listsPopup=null;
let composerScanPending=false;
let menuEventsStarted=false;
const composerMenus=new Map();
const CHAT_MENU_FIELDS='input[placeholder], textarea[placeholder]';
let composerResizeObserver=null;

function applyChatReactionVisibility() {
  document.documentElement.toggleAttribute('data-tt-hide-chat-reactions',hideChatReactions);
  const button=listsPopup?.querySelector('.tt-chat-reactions-toggle');
  if(button){
    button.textContent=hideChatReactions?'リアクションを表示':'リアクションを非表示';
    button.setAttribute('aria-pressed',String(hideChatReactions));
    button.title=hideChatReactions?'コメントのリアクションと＋ボタンを表示します':'すべてのコメントのリアクションと＋ボタンを非表示にします';
  }
}

async function toggleChatReactionVisibility() {
  const next=!hideChatReactions;
  try{
    await GM_setValue(HIDE_CHAT_REACTIONS_KEY,next);
    hideChatReactions=next;
    applyChatReactionVisibility();
    positionUserMenu();
  }catch(error){
    console.error('コメントのリアクション表示設定を保存できませんでした。',error);
    window.alert('リアクション表示の設定を保存できませんでした。');
  }
}

function makeMenuButton(text,className,label) {
  const button=document.createElement('button');
  button.type='button';
  button.className=className;
  button.textContent=text;
  button.title=label;
  button.setAttribute('aria-label',label);
  button.setAttribute('aria-haspopup','menu');
  button.setAttribute('aria-expanded','false');
  return button;
}

function closeUserMenu(returnFocus=false) {
  if(!activeUserMenu)return;
  const{trigger,popup}=activeUserMenu;
  popup.hidden=true;
  trigger.setAttribute('aria-expanded','false');
  activeUserMenu=null;
  if(returnFocus&&trigger.isConnected)trigger.focus();
}

function positionUserMenu() {
  if(!activeUserMenu)return;
  const{trigger,popup}=activeUserMenu;
  if(!trigger.isConnected||trigger.getClientRects().length===0||trigger.closest('[hidden], [data-tt-blocked]')){
    closeUserMenu();
    return;
  }
  const rect=trigger.getBoundingClientRect();
  const width=Math.min(popup.offsetWidth||220,window.innerWidth-16);
  const height=popup.offsetHeight||90;
  const below=window.innerHeight-rect.bottom-14;
  const above=rect.top-14;
  const useAbove=below<Math.min(height,160)&&above>below;
  popup.style.maxHeight=`${Math.max(40,useAbove?above:below)}px`;
  popup.style.left=`${Math.max(8,Math.min(rect.right-width,window.innerWidth-width-8))}px`;
  popup.style.top=`${Math.max(8,useAbove?rect.top-Math.min(height,above)-6:rect.bottom+6)}px`;
}

function showUserMenu(trigger,popup) {
  closeUserMenu();
  if(!popup.isConnected)document.body.append(popup);
  popup.style.removeProperty('display');
  popup.hidden=false;
  trigger.setAttribute('aria-expanded','true');
  if(popup.id)trigger.setAttribute('aria-controls',popup.id);
  activeUserMenu={trigger,popup};
  positionUserMenu();
}

function getCommentPopup() {
  if(commentPopup)return commentPopup;
  const popup=document.createElement('div');
  popup.className='tt-user-popup tt-comment-popup';
  popup.id='tt-comment-user-menu';
  popup.hidden=true;
  popup.setAttribute('role','menu');
  const profile=document.createElement('a');
  profile.className='tt-menu-item';
  profile.textContent='プロフィール';
  profile.target='_blank';
  profile.rel='noopener noreferrer';
  profile.setAttribute('role','menuitem');
  profile.addEventListener('click',()=>closeUserMenu());
  const block=document.createElement('button');
  block.type='button';
  block.className='tt-menu-item';
  block.setAttribute('role','menuitem');
  block.addEventListener('click',event=>{
    event.preventDefault();
    const id=popup.dataset.userId;
    closeUserMenu();
    void toggleBlock(id);
  });
  popup.append(profile,block);
  document.body.append(popup);
  commentPopup=popup;
  return popup;
}

function openUserList(mode) {
  if(!userListsPanel)createUserListsToolbar();
  if(!userListsPanel)return;
  const trigger=activeUserMenu?.trigger||document.querySelector('.tt-composer-meatball');
  if(!trigger)return;
  userListsPanel.dataset.mode=mode;
  const search=userListsPanel.querySelector('.tt-user-list-search');
  if(search)search.value='';
  renderUserLists();
  showUserMenu(trigger,userListsPanel);
  search?.focus();
}

function createUserListsToolbar() {
  if(!userListsPanel||!userListsPanel.isConnected){
    const panel=document.createElement('div');
    panel.className=LIST_PANEL_CLASS+' tt-user-popup';
    panel.id='tt-user-list-popup';
    panel.hidden=true;
    panel.dataset.mode='follow';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label','フォロー・ブロック一覧');
    const title=document.createElement('h3');
    title.className='tt-user-list-title';
    const titleText=document.createElement('span');
    titleText.className='tt-user-list-title-text';
    const close=document.createElement('button');
    close.type='button';
    close.className='tt-user-list-action';
    close.textContent='閉じる';
    close.addEventListener('click',()=>closeUserMenu(true));
    title.append(titleText,close);
    const tabs=document.createElement('div');
    tabs.className='tt-list-tabs';
    for(const[mode,label]of[['follow','フォロー一覧'],['block','ブロック一覧']]){
      const tab=document.createElement('button');
      tab.type='button';
      tab.className='tt-user-list-action';
      tab.textContent=label;
      tab.addEventListener('click',()=>{
        panel.dataset.mode=mode;
        search.value='';
        renderUserLists();
        positionUserMenu();
      });
      tabs.append(tab);
    }
    const search=document.createElement('input');
    search.type='search';
    search.className='tt-user-list-search';
    search.placeholder='ユーザー名・IDで検索';
    search.setAttribute('aria-label','ユーザー名・IDで検索');
    search.addEventListener('input',()=>{
      renderUserLists();
      positionUserMenu();
    });
    const count=document.createElement('div');
    count.className='tt-user-list-search-status';
    count.setAttribute('aria-live','polite');
    const body=document.createElement('div');
    body.className='tt-user-list-body';
    panel.append(title,tabs,search,count,body);
    document.body.append(panel);
    userListsPanel=panel;
  }
  if(!listsPopup||!listsPopup.isConnected){
    const popup=document.createElement('div');
    popup.className='tt-user-popup tt-lists-popup';
    popup.id='tt-follow-block-menu';
    popup.hidden=true;
    popup.setAttribute('role','menu');
    for(const[mode,label]of[['follow','★ フォロー一覧'],['block','ブロック一覧']]){
      const button=document.createElement('button');
      button.type='button';
      button.className='tt-menu-item';
      button.textContent=label;
      button.setAttribute('role','menuitem');
      button.addEventListener('click',()=>openUserList(mode));
      popup.append(button);
    }
    document.body.append(popup);
    listsPopup=popup;
    const reactionsButton=document.createElement('button');
    reactionsButton.type='button';
    reactionsButton.className='tt-menu-item tt-chat-reactions-toggle';
    reactionsButton.setAttribute('role','menuitem');
    reactionsButton.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      void toggleChatReactionVisibility();
    });
    popup.append(reactionsButton);
  }
  applyChatReactionVisibility();
  decorateChatComposers();
}

function editableTextboxRect(input) {
    if(
      !input.matches(CHAT_MENU_FIELDS)||
      (input.tagName==='INPUT'&&input.type!=='text')||
      (input.getAttribute('placeholder')||'').normalize('NFKC').trim()!=='メッセージを入力...'||
      input.disabled||
      input.readOnly||
      input.matches(':disabled')||
      input.closest('[role="search"], [role="searchbox"], [hidden], [inert], [aria-hidden="true"]')
    )return null;

    if(!input.isConnected||!input.getClientRects().length)return null;
  
    const style=window.getComputedStyle(input);
    if(
      style.display==='none'||
      style.visibility==='hidden'||
      style.visibility==='collapse'||
      Number(style.opacity)===0
    )return null;
  
    const rect=input.getBoundingClientRect();
    if(rect.width<48||rect.height<20)return null;
  
    for(let parent=input.parentElement;parent;parent=parent.parentElement){
      const parentStyle=window.getComputedStyle(parent);
      if(
        parentStyle.display==='none'||
        parentStyle.visibility==='hidden'||
        parentStyle.visibility==='collapse'||
        Number(parentStyle.opacity)===0
      )return null;
    }

  return rect;
}

function positionTextboxMenus() {
  for(const[input,entry]of composerMenus){
    const rect=editableTextboxRect(input);
    let visible=!!rect;
    if(rect){
      const size=Math.min(32,rect.height-4);
      const left=rect.right-size-3;
      const top=rect.top+Math.min(4,(rect.height-size)/2);
      let clipLeft=0;
      let clipTop=0;
      let clipRight=window.innerWidth;
      let clipBottom=window.innerHeight;

      for(let parent=input.parentElement;parent;parent=parent.parentElement){
        const style=window.getComputedStyle(parent);
        const bounds=parent.getBoundingClientRect();

        if(/auto|scroll|hidden|clip/.test(style.overflowX)){
          clipLeft=Math.max(clipLeft,bounds.left);
          clipRight=Math.min(clipRight,bounds.right);
        }

        if(/auto|scroll|hidden|clip/.test(style.overflowY)){
          clipTop=Math.max(clipTop,bounds.top);
          clipBottom=Math.min(clipBottom,bounds.bottom);
        }
      }

      visible=left>=clipLeft&&top>=clipTop&&left+size<=clipRight&&top+size<=clipBottom;

      if(visible&&typeof document.elementsFromPoint==='function'){
        const hit=document.elementsFromPoint(left+size/2,top+size/2)
          .find(element=>!element.classList.contains('tt-composer-meatball'));
        visible=hit===input||!!(hit&&input.contains(hit));
      }

      entry.button.style.left=`${left}px`;
      entry.button.style.top=`${top}px`;
      entry.button.style.setProperty('--tt-textbox-menu-size',`${size}px`);
    }

    if(entry.button.hidden!==!visible)entry.button.hidden=!visible;
    if(!visible&&activeUserMenu?.trigger===entry.button)closeUserMenu();
  }
}

function decorateChatComposers() {
  for(const element of document.querySelectorAll('[data-tt-chat-composer-row]')){
    element.toggleAttribute('data-tt-chat-composer-row',false);
  }

  for(const className of['tt-chat-composer-row','tt-chat-composer-field','tt-chat-composer-send']){
    for(const element of document.querySelectorAll('.'+className)){
      element.classList.toggle(className,false);
    }
  }

  for(const input of document.querySelectorAll('.tt-textbox-menu-field, [data-tt-textbox-menu]')){
    if(composerMenus.has(input))continue;
    input.classList.remove('tt-textbox-menu-field');
    input.removeAttribute('data-tt-textbox-menu');
    input.style.removeProperty('--tt-textbox-original-padding');
  }

  const retained=new Set(Array.from(composerMenus.values(),entry=>entry.button));

  for(const button of document.querySelectorAll('.tt-composer-meatball')){
    if(!retained.has(button)){
      if(activeUserMenu?.trigger===button)closeUserMenu();
      button.remove();
    }
  }

  for(const[input,entry]of composerMenus){
    if(editableTextboxRect(input)&&entry.button.isConnected)continue;
    if(activeUserMenu?.trigger===entry.button)closeUserMenu();
    entry.button.remove();
    input.classList.remove('tt-textbox-menu-field');
    input.removeAttribute('data-tt-textbox-menu');

    if(entry.paddingValue){
      input.style.setProperty('--tt-textbox-original-padding',entry.paddingValue,entry.paddingPriority);
    }else{
      input.style.removeProperty('--tt-textbox-original-padding');
    }

    composerResizeObserver?.unobserve(input);
    composerMenus.delete(input);
  }

  if(!composerResizeObserver&&typeof ResizeObserver==='function'){
    composerResizeObserver=new ResizeObserver(scheduleComposerMenus);
  }

  for(const input of document.querySelectorAll(CHAT_MENU_FIELDS)){
    if(composerMenus.has(input)||!editableTextboxRect(input))continue;

    const paddingValue=input.style.getPropertyValue('--tt-textbox-original-padding');
    const paddingPriority=input.style.getPropertyPriority('--tt-textbox-original-padding');
    const padding=window.getComputedStyle(input).paddingRight||'0px';

    input.style.setProperty('--tt-textbox-original-padding',padding);
    input.classList.add('tt-textbox-menu-field');
    input.setAttribute('data-tt-textbox-menu','');

    const button=makeMenuButton('…','tt-composer-meatball','フォロー・ブロック一覧');
    button.hidden=true;
    document.body.append(button);

    composerMenus.set(input,{button,paddingValue,paddingPriority});
    composerResizeObserver?.observe(input);

    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();

      if(!editableTextboxRect(input)){
        scheduleComposerMenus();
        return;
      }

      if(activeUserMenu?.trigger===button){
        closeUserMenu();
        return;
      }

      showUserMenu(button,listsPopup);
    });
  }

  positionTextboxMenus();
}

function scheduleComposerMenus() {
  if(composerScanPending)return;
  composerScanPending=true;
  window.requestAnimationFrame(()=>{
    composerScanPending=false;
    decorateChatComposers();
    if(activeUserMenu)positionUserMenu();
  });
}

function startUserMenuEvents() {
  if(menuEventsStarted)return;
  menuEventsStarted=true;

  document.addEventListener('pointerdown',event=>{
    if(
      activeUserMenu&&
      !activeUserMenu.trigger.contains(event.target)&&
      !activeUserMenu.popup.contains(event.target)
    )closeUserMenu();
  });

  document.addEventListener('keydown',event=>{
    if(!activeUserMenu)return;

    if(event.key==='Escape'){
      event.preventDefault();
      closeUserMenu(true);
    }else if(
      ['ArrowDown','ArrowUp','Home','End'].includes(event.key)&&
      (activeUserMenu.trigger===event.target||activeUserMenu.popup.contains(event.target))&&
      !event.target.matches('input, textarea')
    ){
      const items=Array.from(activeUserMenu.popup.querySelectorAll('[role="menuitem"]'));
      if(!items.length)return;
      event.preventDefault();
      const index=items.indexOf(document.activeElement);
      const next=event.key==='Home'?0:event.key==='End'?items.length-1:
        (index+(event.key==='ArrowUp'?-1:1)+items.length)%items.length;
      items[next].focus();
    }
  });

  window.addEventListener('resize',positionUserMenu);
  window.addEventListener('resize',scheduleComposerMenus);
  window.addEventListener('scroll',positionTextboxMenus,true);
  window.addEventListener('scroll',positionUserMenu,true);
  document.addEventListener('turbo:before-cache',()=>closeUserMenu());
}

function getProfileUserId() {
  const match=location.pathname.match(/^\/user\/(\d+)\/?$/);
  return match?match[1]:null;
}

function getProfileUserName(profileUsername) {
  const directText=Array.from(profileUsername.childNodes)
    .filter(node=>node.nodeType===Node.TEXT_NODE)
    .map(node=>node.textContent.trim())
    .filter(Boolean)
    .join(" ");
  return directText||"このユーザー";
}

function updateProfileActions(actions,userId) {
  const state=getUserState(userId);
  const followButton=actions.querySelector(`.${FOLLOW_BUTTON_CLASS}`);
  const nicknameButton=actions.querySelector(`.${NICKNAME_BUTTON_CLASS}`);
  const blockButton=actions.querySelector(`.${BLOCK_BUTTON_CLASS}`);

  if(followButton){
    followButton.textContent=state.following?"フォロー中":"フォロー";
    followButton.classList.toggle("is-following",state.following);
    followButton.setAttribute("aria-pressed",String(state.following));
    followButton.title=state.following?"フォローを解除します":"ユーザーをフォローします(★マークで強調)";
  }

  if(nicknameButton){
    nicknameButton.textContent=state.nickname?"独自の名前を変更":"独自の名前を設定";
    nicknameButton.classList.toggle("has-nickname",Boolean(state.nickname));
    nicknameButton.title=state.nickname?`現在の独自名: ${state.nickname}（空欄で解除）`:"自分のブラウザ内だけで表示する名前を設定";
  }

  if(blockButton){
    const blocked=isUserBlocked(userId);
    blockButton.textContent=blocked?"ブロック解除":"ブロック";
    blockButton.classList.toggle("is-blocked",blocked);
    blockButton.setAttribute("aria-pressed",String(blocked));
    blockButton.title=blocked?"このユーザーのブロックを解除します":"このユーザーのチャット発言を非表示にします";
  }
}

function refreshUser(userId) {
  document.querySelectorAll(`[${PROCESSED_ATTRIBUTE}]`).forEach(userName=>{
    if(userName.getAttribute(PROCESSED_ATTRIBUTE)===userId){
      applyUserState(userName,userId);
      const message=userName.closest(MESSAGE_SELECTOR);
      if(message)applyBlockState(message,userId);
    }
  });
  document.querySelectorAll(`.${PROFILE_ACTIONS_CLASS}`).forEach(actions=>{
    if(actions.dataset.userId===userId)updateProfileActions(actions,userId);
  });
}

function refreshAllUsers() {
  document.querySelectorAll(`[${PROCESSED_ATTRIBUTE}]`).forEach(userName=>{
    const userId=userName.getAttribute(PROCESSED_ATTRIBUTE);
    if(userId){
      applyUserState(userName,userId);
      const message=userName.closest(MESSAGE_SELECTOR);
      if(message)applyBlockState(message,userId);
    }
  });
  document.querySelectorAll(`.${PROFILE_ACTIONS_CLASS}`).forEach(actions=>{
    if(actions.dataset.userId)updateProfileActions(actions,actions.dataset.userId);
  });
  renderUserLists();
}

async function saveUserState(userId,nextState) {
  const updatedUsers={...followedUsers};
  const normalizedState={
    following:nextState.following===true,
    nickname:typeof nextState.nickname==="string"?nextState.nickname.trim():"",
    updatedAt:new Date().toISOString()
  };
  if(!normalizedState.following&&!normalizedState.nickname){
    delete updatedUsers[userId];
  }else{
    updatedUsers[userId]=normalizedState;
  }
  await GM_setValue(STORAGE_KEY,updatedUsers);
  followedUsers=updatedUsers;
  refreshUser(userId);
  renderUserLists();
}

async function toggleFollow(userId) {
  const state=getUserState(userId);
  try{
    await saveUserState(userId,{following:!state.following,nickname:state.nickname});
  }catch(error){
    console.error("TypingTubeのフォロー情報を保存できませんでした。",error);
    window.alert("フォロー情報を保存できませんでした。拡張機能を再読み込みして、もう一度お試しください。");
  }
}

async function editNickname(userId,typingTubeName) {
  const state=getUserState(userId);
  const input=window.prompt([
    "このユーザーの新しい名前を入力してください。",
    "空欄でも大丈夫です。",
    "フォロー状態には影響しません。",
    "",
    `TypingTube上の名前: ${typingTubeName}`,
    `ユーザーID: ${userId}`
  ].join("\n"),state.nickname);

  if(input===null)return;
  const nickname=input.trim();
  if(Array.from(nickname).length>20){
    window.alert("独自の名前は20文字以内にしてください。");
    return;
  }
  try{
    await saveUserState(userId,{following:state.following,nickname});
  }catch(error){
    console.error("TypingTubeの独自名を保存できませんでした。",error);
    window.alert("独自の名前を保存できませんでした。拡張機能を再読み込みしてください");
  }
}

async function toggleBlock(userId) {
  if(!/^\d+$/.test(String(userId)))return;
  const nextBlocked=!isUserBlocked(userId);
  const updatedBlocks={...blockedUsers};
  if(nextBlocked){
    updatedBlocks[userId]=true;
  }else{
    delete updatedBlocks[userId];
  }
  try{
    await GM_setValue(BLOCKED_STORAGE_KEY,updatedBlocks);
    blockedUsers=updatedBlocks;
    refreshUser(userId);
    renderUserLists();
  }catch(error){
    console.error("TypingTubeのブロック情報を保存できませんでした。",error);
    window.alert("ブロック情報を保存できませんでした。拡張機能を再読み込みして、もう一度お試しください。");
  }
}

function decorateProfilePage() {
  const userId=getProfileUserId();
  const profileUsername=document.querySelector(".profile-header .profile-username");
  if(!userId||!profileUsername)return;

  let actions=profileUsername.querySelector(`.${PROFILE_ACTIONS_CLASS}`);
  if(actions&&actions.dataset.userId!==userId){
    actions.remove();
    actions=null;
  }

  if(!actions){
    const typingTubeName=getProfileUserName(profileUsername);
    rememberUserName(userId,profileUsername);
    actions=document.createElement("span");
    actions.className=PROFILE_ACTIONS_CLASS;
    actions.dataset.userId=userId;

    const followButton=document.createElement("button");
    followButton.type="button";
    followButton.className=FOLLOW_BUTTON_CLASS;
    followButton.addEventListener("click",()=>toggleFollow(userId));

    const nicknameButton=document.createElement("button");
    nicknameButton.type="button";
    nicknameButton.className=NICKNAME_BUTTON_CLASS;
    nicknameButton.addEventListener("click",()=>editNickname(userId,typingTubeName));

    const blockButton=document.createElement("button");
    blockButton.type="button";
    blockButton.className=BLOCK_BUTTON_CLASS;
    blockButton.addEventListener("click",()=>toggleBlock(userId));

    actions.append(followButton,nicknameButton,blockButton);

    const ratingBadge=profileUsername.querySelector(".battle-rating-badge");
    if(ratingBadge){
      ratingBadge.insertAdjacentElement("afterend",actions);
    }else{
      profileUsername.append(actions);
    }
  }

  updateProfileActions(actions,userId);
}

function decorateMessage(message) {
  if(!(message instanceof Element)||!message.matches(MESSAGE_SELECTOR))return;
  const userName=message.querySelector(USER_SELECTOR);
  const reportButton=message.querySelector(REPORT_SELECTOR);
  const userId=reportButton?.dataset.reportedUserId?.trim();

  message.querySelectorAll(`.${OLD_FAVORITE_BUTTON_CLASS}, .${PROFILE_BUTTON_CLASS}, .${BLOCK_BUTTON_CLASS}`)
    .forEach(button=>button.remove());

  if(!userName||!reportButton||!userId)return;

  let trigger=message.querySelector('.tt-comment-kebab');

  if(!trigger){
    trigger=makeMenuButton('⋮','tt-comment-kebab','このコメントのユーザーメニュー');
    reportButton.insertAdjacentElement('afterend',trigger);

    trigger.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();

      if(activeUserMenu?.trigger===trigger){
        closeUserMenu();
        return;
      }

      const id=trigger.dataset.userId;
      const popup=getCommentPopup();
      popup.dataset.userId=id;

      const profile=popup.querySelector('a');
      profile.href=`/user/${encodeURIComponent(id)}`;
      profile.setAttribute('aria-label',`${trigger.dataset.userName}のプロフィールを開く`);

      const block=popup.querySelector('button');
      block.textContent=isUserBlocked(id)?'ブロック解除':'ブロック';
      block.setAttribute('aria-pressed',String(isUserBlocked(id)));

      showUserMenu(trigger,popup);
    });
  }

  trigger.dataset.userId=userId;
  trigger.dataset.userName=getOriginalName(userName);

  if(userName.getAttribute(PROCESSED_ATTRIBUTE)!==userId){
    userName.style.setProperty('--tt-user-hue',colorFromUserId(userId).toFixed(2));
    userName.setAttribute(PROCESSED_ATTRIBUTE,userId);
    getOriginalName(userName);
  }

  rememberUserName(userId,userName);
  markUserOnline(userId);
  applyUserState(userName,userId);
  applyBlockState(message,userId);
}

function decorateMessagesInside(root) {
  if(!(root instanceof Element||root instanceof Document))return;
  if(root instanceof Element&&root.matches(MESSAGE_SELECTOR))decorateMessage(root);
  root.querySelectorAll(MESSAGE_SELECTOR).forEach(decorateMessage);
}

function getLiveEventId() {
  const match=location.pathname.match(/\/live_events\/(\d+)(?:\/|$)/);
  return match?match[1]:null;
}

function readReactionQuantity(input) {
  const quantity=Number(input.value);
  if(!Number.isInteger(quantity)||quantity<1||quantity>MAX_REACTION_QUANTITY){
    window.alert(`個数は1～${MAX_REACTION_QUANTITY}の整数で指定してください。`);
    input.focus();
    return null;
  }
  return quantity;
}

function setReactionStatus(controls,text,isError=false) {
  const status=controls.querySelector(`.${REACTION_STATUS_CLASS}`);
  if(!status)return;
  status.textContent=text;
  status.classList.toggle("is-error",isError);
}

function decorateReactionShop(shop) {
  if(!(shop instanceof Element)||shop.querySelector(`.${REACTION_CONTROLS_CLASS}`))return;

  const controls=document.createElement("div");
  controls.className=REACTION_CONTROLS_CLASS;

  const label=document.createElement("label");
  label.className="tt-reaction-quantity-label";
  label.textContent="まとめて購入 ";

  const input=document.createElement("input");
  input.type="number";
  input.className=REACTION_QUANTITY_CLASS;
  input.min="1";
  input.max=String(MAX_REACTION_QUANTITY);
  input.step="1";
  input.value="1";
  input.inputMode="numeric";
  input.setAttribute("aria-label","まとめて購入するリアクションの個数");
  input.title="1個の場合はTypingTube標準の通信方法を使用します";

  const unit=document.createElement("span");
  unit.textContent="個";

  const status=document.createElement("span");
  status.className=REACTION_STATUS_CLASS;
  status.setAttribute("role","status");
  status.setAttribute("aria-live","polite");

  label.append(input,unit);

  const hint=document.createElement("span");
  hint.textContent=`1～${MAX_REACTION_QUANTITY}個。個数を指定してアイテムをクリック`;
  hint.style.cssText="font-size:0.75rem;color:#4b5563;";

  controls.append(label,hint,status);
  shop.prepend(controls);
}

function decorateReactionShopsInside(root) {
  if(!(root instanceof Element||root instanceof Document))return;
  if(root instanceof Element){
    const shop=root.closest(REACTION_SHOP_SELECTOR);
    if(shop)decorateReactionShop(shop);
  }
  root.querySelectorAll(REACTION_SHOP_SELECTOR).forEach(decorateReactionShop);
}

async function sendBulkReaction(card,controls,quantity) {
  if(reactionRequestPending){
    setReactionStatus(controls,"送信中です。",true);
    return;
  }

  const eventId=getLiveEventId();
  const slotId=card.dataset.slotId?.trim();
  const slotCost=Number(card.dataset.slotCost);
  const csrfToken=document.querySelector('meta[name="csrf-token"]')?.content;

  if(!eventId||!slotId){
    window.alert("ライブイベント、リアクションIDを取得できませんでした。");
    return;
  }

  if(!csrfToken){
    window.alert("送信用のCSRFトークンを取得できませんでした。");
    return;
  }

  const totalCost=Number.isFinite(slotCost)?slotCost*quantity:null;
  const costText=totalCost===null?"":`\n必要Beat: ${totalCost}`;
  const confirmed=window.confirm(
    `このリアクションを${quantity}個まとめて購入しますか？${costText}`+
    "\n\n複数購入リクエストは1回だけ送信されます。"
  );

  if(!confirmed)return;

  reactionRequestPending=true;
  controls.classList.add("is-sending");
  setReactionStatus(controls,`${quantity}個を送信中…`);

  try{
    const response=await fetch(`/api/live_events/${encodeURIComponent(eventId)}/reactions`,{
      method:"POST",
      credentials:"same-origin",
      headers:{
        Accept:"application/json",
        "Content-Type":"application/json",
        "X-CSRF-Token":csrfToken
      },
      body:JSON.stringify({slot_id:slotId,quantity})
    });

    let responseData=null;
    try{
      responseData=await response.json();
    }catch(_error){}

    if(!response.ok){
      const message=responseData?.error||responseData?.message||`${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    setReactionStatus(controls,`${quantity}個の購入が受理されました。`);
  }catch(error){
    console.error("リアクションのまとめて購入に失敗しました。",error);
    setReactionStatus(controls,"送信に失敗しました。",true);
    window.alert(`リアクションを購入できませんでした。\n${error.message||error}`);
  }finally{
    reactionRequestPending=false;
    controls.classList.remove("is-sending");
  }
}

function startReactionQuantityHandler() {
  document.addEventListener("click",event=>{
    const card=event.target.closest?.(REACTION_CARD_SELECTOR);
    if(!card)return;

    const shop=card.closest(REACTION_SHOP_SELECTOR);
    const controls=shop?.querySelector(`.${REACTION_CONTROLS_CLASS}`);
    const input=controls?.querySelector(`.${REACTION_QUANTITY_CLASS}`);
    if(!controls||!input)return;

    const quantity=readReactionQuantity(input);

    if(quantity===null){
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if(quantity===1)return;

    event.preventDefault();
    event.stopImmediatePropagation();
    void sendBulkReaction(card,controls,quantity);
  },true);
}

function getPrepurchaseQuantity(item) {
  const text=item.querySelector(".lh-prepurchase-item-qty")?.textContent||"";
  const match=text.match(/(\d+)/);
  return match?Number(match[1]):0;
}

function getPrepurchaseUnitCost(section,slotId) {
  const card=Array.from(section.querySelectorAll(".lh-reaction-card[data-slot-id][data-slot-cost]"))
    .find(candidate=>candidate.dataset.slotId===slotId);
  const cost=Number(card?.dataset.slotCost);
  return Number.isFinite(cost)&&cost>=0?cost:null;
}

function setPrepurchaseStatus(controls,text,isError=false) {
  const status=controls.querySelector(`.${PREPURCHASE_STATUS_CLASS}`);
  if(!status)return;
  status.textContent=text;
  status.classList.toggle("is-error",isError);
}

function readPrepurchaseAddQuantity(input) {
  const quantity=Number(input.value);
  if(!Number.isSafeInteger(quantity)||quantity<1){
    window.alert("追加数は1以上の整数で指定してください。");
    input.focus();
    return null;
  }
  return quantity;
}

function syncPrepurchaseDisplay(section,responseData,slotId,previousQuantity,unitCost) {
  if(!responseData||!Array.isArray(responseData.prepurchases))return false;

  const activePurchases=responseData.prepurchases.filter(purchase=>purchase?.active!==false);
  const updated=activePurchases.find(purchase=>String(purchase.slot_id)===slotId);
  if(!updated||!Number.isSafeInteger(Number(updated.quantity)))return false;

  const plusButton=Array.from(section.querySelectorAll(".lh-prepurchase-plus[data-slot-id]"))
    .find(button=>button.dataset.slotId===slotId);

  const item=plusButton?.closest(PREPURCHASE_ITEM_SELECTOR);
  const newQuantity=Number(updated.quantity);

  if(item){
    const quantityDisplay=item.querySelector(".lh-prepurchase-item-qty");
    const costDisplay=item.querySelector(".lh-prepurchase-item-cost");
    const removeButton=item.querySelector(".lh-prepurchase-remove");

    if(quantityDisplay)quantityDisplay.textContent=`×${newQuantity}`;

    if(costDisplay&&Number.isFinite(Number(updated.beat_cost_total))){
      costDisplay.innerHTML=`<i class="bi bi-coin"></i> ${Number(updated.beat_cost_total)}`;
    }

    if(removeButton){
      removeButton.dataset.quantity=String(newQuantity);
      if(Number.isFinite(Number(updated.beat_cost_total))){
        removeButton.dataset.refund=String(Number(updated.beat_cost_total));
      }
    }
  }

  const mineCount=section.querySelector('[data-live-event-prepurchase-target="mineCount"]');
  if(mineCount)mineCount.textContent=`(${activePurchases.length})`;

  const addedQuantity=Math.max(0,newQuantity-previousQuantity);
  const balanceDisplay=section.querySelector('[data-live-event-prepurchase-target="balance"]');
  const currentBalance=Number(balanceDisplay?.textContent.replace(/[^0-9-]/g,""));

  if(balanceDisplay&&unitCost!==null&&Number.isFinite(currentBalance)){
    const nextBalance=Math.max(0,currentBalance-addedQuantity*unitCost);
    balanceDisplay.textContent=String(nextBalance);
    section.dataset.liveEventPrepurchaseBeatBalanceValue=String(nextBalance);
  }

  return true;
}

async function addPrepurchaseQuantity(item,controls,quantity) {
  if(prepurchaseRequestPending){
    setPrepurchaseStatus(controls,"※別の事前購入を送信中です。",true);
    return;
  }

  const section=item.closest(PREPURCHASE_SECTION_SELECTOR);
  const plusButton=item.querySelector(".lh-prepurchase-plus[data-slot-id]");
  const eventId=section?.dataset.liveEventPrepurchaseEventIdValue?.trim();
  const slotId=plusButton?.dataset.slotId?.trim();
  const csrfToken=document.querySelector('meta[name="csrf-token"]')?.content;

  if(!section||!eventId||!slotId){
    window.alert("イベントID、リアクションIDを取得できませんでした。");
    return;
  }

  if(!csrfToken){
    window.alert("送信用のCSRFトークンを取得できませんでした。");
    return;
  }

  const previousQuantity=getPrepurchaseQuantity(item);
  const unitCost=getPrepurchaseUnitCost(section,slotId);
  const costText=unitCost===null?"":`\n必要Beat: ${unitCost*quantity}`;
  const confirmed=window.confirm(
    `この事前リアクションを${quantity}個追加しますか？${costText}`+
    "\n\nまとめて購入リクエストは1回だけ送信します。"
  );

  if(!confirmed)return;

  prepurchaseRequestPending=true;
  controls.classList.add("is-sending");
  setPrepurchaseStatus(controls,`${quantity}個を追加中…`);

  const endpoint=`/api/live_events/${encodeURIComponent(eventId)}/prepurchases`;

  try{
    const response=await fetch(endpoint,{
      method:"POST",
      credentials:"same-origin",
      headers:{
        Accept:"application/json",
        "Content-Type":"application/json",
        "X-CSRF-Token":csrfToken
      },
      body:JSON.stringify({slot_id:slotId,quantity})
    });

    let responseData=null;
    try{
      responseData=await response.json();
    }catch(_error){}

    if(!response.ok){
      const message=responseData?.error||responseData?.message||`${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    const refreshResponse=await fetch(endpoint,{
      method:"GET",
      credentials:"same-origin",
      headers:{Accept:"application/json"},
      cache:"no-store"
    });

    if(refreshResponse.ok)responseData=await refreshResponse.json();

    const synced=syncPrepurchaseDisplay(section,responseData,slotId,previousQuantity,unitCost);
    const actual=responseData?.prepurchases?.find(purchase=>String(purchase.slot_id)===slotId);
    const added=actual?Math.max(0,Number(actual.quantity)-previousQuantity):quantity;

    controls.querySelector(`.${PREPURCHASE_INPUT_CLASS}`).value="1";
    setPrepurchaseStatus(
      controls,
      synced?`${added}個追加しました。`:"追加しました。表示更新にはページを再読み込みしてください"
    );
  }catch(error){
    console.error("事前リアクションのまとめて追加に失敗しました。",error);
    setPrepurchaseStatus(controls,"追加に失敗しました。",true);
    window.alert(`事前リアクションを追加できませんでした。\n${error.message||error}`);
  }finally{
    prepurchaseRequestPending=false;
    controls.classList.remove("is-sending");
  }
}

function decoratePrepurchaseItem(item) {
  if(!(item instanceof Element)||item.querySelector(`.${PREPURCHASE_CONTROLS_CLASS}`))return;
  const plusButton=item.querySelector(".lh-prepurchase-plus[data-slot-id]");
  const actions=item.querySelector(".lh-prepurchase-item-actions");
  if(!plusButton||!actions)return;

  const controls=document.createElement("span");
  controls.className=PREPURCHASE_CONTROLS_CLASS;

  const input=document.createElement("input");
  input.type="number";
  input.className=PREPURCHASE_INPUT_CLASS;
  input.min="1";
  input.step="1";
  input.value="1";
  input.inputMode="numeric";
  input.setAttribute("aria-label","追加する事前リアクションの個数");

  const addButton=document.createElement("button");
  addButton.type="button";
  addButton.className=PREPURCHASE_BUTTON_CLASS;
  addButton.textContent="指定数を追加";

  const status=document.createElement("span");
  status.className=PREPURCHASE_STATUS_CLASS;
  status.setAttribute("role","status");
  status.setAttribute("aria-live","polite");

  addButton.addEventListener("click",()=>{
    const quantity=readPrepurchaseAddQuantity(input);
    if(quantity!==null)void addPrepurchaseQuantity(item,controls,quantity);
  });

  controls.append(input,addButton,status);
  plusButton.insertAdjacentElement("afterend",controls);
}

function decoratePrepurchaseItemsInside(root) {
  if(!(root instanceof Element||root instanceof Document))return;
  if(root instanceof Element&&root.matches(PREPURCHASE_ITEM_SELECTOR))decoratePrepurchaseItem(root);
  root.querySelectorAll(PREPURCHASE_ITEM_SELECTOR).forEach(decoratePrepurchaseItem);
}

function startObserver() {
  const observer=new MutationObserver(mutations=>{
    let profileHeaderAdded=false;
    let composerChanged=false;

    for(const mutation of mutations){
      if(
        mutation.target instanceof Element&&
        mutation.target.closest('.tt-composer-meatball, .tt-user-popup, #tt-cloud-id-search-v006')
      )continue;

      composerChanged=true;

      if(mutation.target instanceof Element){
        const shop=mutation.target.closest(REACTION_SHOP_SELECTOR);
        if(shop)decorateReactionShop(shop);

        if(
          mutation.type==="attributes"&&
          mutation.attributeName==="data-live-event-target"
        ){
          decorateReactionShopsInside(mutation.target);
        }
      }

      for(const node of mutation.addedNodes){
        if(!(node instanceof Element))continue;
        decorateMessagesInside(node);
        decorateReactionShopsInside(node);
        decoratePrepurchaseItemsInside(node);
        if(node.matches(".profile-header")||node.querySelector(".profile-header")){
          profileHeaderAdded=true;
        }
      }

      if(mutation.type==="attributes"&&mutation.attributeName==="data-reported-user-id"){
        const message=mutation.target.closest?.(MESSAGE_SELECTOR);
        if(message)decorateMessage(message);
      }
    }

    if(composerChanged)scheduleComposerMenus();
    if(profileHeaderAdded)decorateProfilePage();
  });

  observer.observe(document.documentElement,{
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:[
      "data-reported-user-id",
      "data-live-event-target",
      "data-lobby-chat-target",
      "data-room-chat-target",
      "data-battle-room-target",
      "data-battle-lobby-target",
      "data-battle-play-target",
      "data-action",
      "id",
      "name",
      "type",
      "disabled",
      "placeholder",
      "class",
      "style",
      "hidden",
      "readonly",
      "inert",
      "aria-hidden",
      "aria-label",
      "role"
    ]
  });
}

function normalizeStoredUsers(value) {
  if(!value||typeof value!=="object"||Array.isArray(value))return{};
  const normalized={};
  for(const[userId,state]of Object.entries(value)){
    if(!/^\d+$/.test(userId)||!state||typeof state!=="object")continue;
    const following=state.following===true;
    const nickname=typeof state.nickname==="string"?state.nickname.trim():"";
    if(following||nickname)normalized[userId]={following,nickname};
  }
  return normalized;
}

function migrateLegacyFavorites(legacyFavorites) {
  if(!legacyFavorites||typeof legacyFavorites!=="object"||Array.isArray(legacyFavorites))return{};
  const migrated={};
  for(const[userId,favorite]of Object.entries(legacyFavorites)){
    if(!/^\d+$/.test(userId)||!favorite||typeof favorite!=="object")continue;
    migrated[userId]={
      following:true,
      nickname:typeof favorite.nickname==="string"?favorite.nickname.trim():"",
      migratedAt:new Date().toISOString()
    };
  }
  return migrated;
}

function normalizeBlockedUsers(value) {
  if(!value||typeof value!=="object"||Array.isArray(value))return{};
  const normalized={};
  for(const[userId,blocked]of Object.entries(value)){
    if(/^\d+$/.test(userId)&&blocked===true)normalized[userId]=true;
  }
  return normalized;
}

async function initialize() {
  hideChatReactions=GM_getValue(HIDE_CHAT_REACTIONS_KEY,false)===true;
  applyChatReactionVisibility();

  try{
    const current=GM_getValue(STORAGE_KEY,null);
    const blocked=GM_getValue(BLOCKED_STORAGE_KEY,{});
    const savedNames=GM_getValue(USER_NAMES_STORAGE_KEY,{});

    if(savedNames&&typeof savedNames==="object"){
      Object.entries(savedNames).forEach(([userId,name])=>{
        if(/^\d+$/.test(String(userId))&&typeof name==="string"&&name.trim()){
          knownUserNames.set(String(userId),name.trim());
        }
      });
    }

    const stored={
      [STORAGE_KEY]:current,
      [LEGACY_STORAGE_KEY]:GM_getValue(LEGACY_STORAGE_KEY,null)
    };

    const hasNewStorage=current!==null;
    blockedUsers=normalizeBlockedUsers(blocked);

    if(hasNewStorage){
      followedUsers=normalizeStoredUsers(stored[STORAGE_KEY]);
    }else{
      followedUsers=migrateLegacyFavorites(stored[LEGACY_STORAGE_KEY]);
      if(Object.keys(followedUsers).length>0){
        await GM_setValue(STORAGE_KEY,followedUsers);
      }
    }
  }catch(error){
    console.error("TypingTubeのフォロー情報を読み込めませんでした。",error);
  }

  createUserListsToolbar();
  startUserMenuEvents();

  window.setInterval(()=>{
    if(userListsPanel&&!userListsPanel.hidden)renderUserLists();
  },30*1000);

  decorateMessagesInside(document);
  decorateProfilePage();
  decorateReactionShopsInside(document);
  decoratePrepurchaseItemsInside(document);
  startReactionQuantityHandler();
  startObserver();

  document.addEventListener("turbo:load",()=>{
    closeUserMenu();
    createUserListsToolbar();
    decorateMessagesInside(document);
    decorateProfilePage();
    decorateReactionShopsInside(document);
    decoratePrepurchaseItemsInside(document);
  });

  GM_addValueChangeListener(HIDE_CHAT_REACTIONS_KEY,(_key,_oldValue,newValue)=>{
    hideChatReactions=newValue===true;
    applyChatReactionVisibility();
  });

  GM_addValueChangeListener(STORAGE_KEY,(_key,_oldValue,newValue)=>{
    followedUsers=normalizeStoredUsers(newValue);
    refreshAllUsers();
  });

  GM_addValueChangeListener(BLOCKED_STORAGE_KEY,(_key,_oldValue,newValue)=>{
    blockedUsers=normalizeBlockedUsers(newValue);
    refreshAllUsers();
  });

  GM_addValueChangeListener(USER_NAMES_STORAGE_KEY,(_key,_oldValue,newValue)=>{
    knownUserNames.clear();
    if(newValue&&typeof newValue==="object"){
      Object.entries(newValue).forEach(([userId,name])=>{
        if(/^\d+$/.test(String(userId))&&typeof name==="string"&&name.trim()){
          knownUserNames.set(String(userId),name.trim());
        }
      });
    }
    renderUserLists();
  });
}

initialize();
})();

GM_addStyle(`
.tt-comment-kebab, .tt-composer-meatball {
  box-sizing: border-box !important; display: inline-flex !important;
  flex: 0 0 32px !important; width: 32px !important; height: 32px !important;
  align-items: center; justify-content: center; padding: 0 !important;
  border: 1px solid #9ba5af !important; border-radius: 4px !important;
  background: #fff !important; color: #263544 !important;
  font: 700 22px/1 sans-serif !important; cursor: pointer;
  vertical-align: middle; margin: 0 3px; touch-action: manipulation;
}
.tt-comment-kebab { flex-basis: 24px !important; width: 24px !important; height: 26px !important; }
.tt-comment-kebab:hover, .tt-composer-meatball:hover { background: #edf3fa !important; }
.tt-comment-kebab:focus-visible, .tt-composer-meatball:focus-visible, .tt-menu-item:focus-visible {
  outline: 2px solid #1976d2 !important; outline-offset: 2px;
}
.tt-textbox-menu-field[data-tt-textbox-menu] {
  box-sizing: border-box !important;
  padding-right: calc(var(--tt-textbox-original-padding, 0px) + 38px) !important;
}
.tt-composer-meatball {
  position: fixed !important; z-index: 2147483099 !important;
  flex: none !important; margin: 0 !important;
  width: var(--tt-textbox-menu-size, 32px) !important;
  height: var(--tt-textbox-menu-size, 32px) !important;
}
.tt-composer-meatball[hidden] { display: none !important; }
.tt-user-popup {
  position: fixed !important; right: auto !important; bottom: auto !important;
  z-index: 2147483100 !important; width: min(220px, calc(100vw - 16px));
  box-sizing: border-box; padding: 5px; margin: 0; overflow: auto;
  border: 1px solid #b6c2ce; border-radius: 7px; background: #fff; color: #22313f;
  box-shadow: 0 5px 20px #0003; font: 13px/1.5 sans-serif;
}
.tt-user-popup[hidden] { display: none !important; }
.tt-user-popup .tt-menu-item {
  box-sizing: border-box !important; display: flex !important; width: 100% !important;
  min-height: 38px !important; height: 38px !important; align-items: center !important;
  justify-content: flex-start !important; padding: 8px 12px !important; margin: 0 !important;
  border: 0 !important; border-radius: 4px !important; background: #fff !important;
  color: #22313f !important; font: 13px/1.5 sans-serif !important;
  text-decoration: none !important; text-align: left !important; cursor: pointer;
}
.tt-user-popup .tt-menu-item:hover { background: #edf3fa !important; }
.tt-user-list-panel.tt-user-popup { width: min(380px, calc(100vw - 16px)); padding: 12px; user-select: text; }
.tt-user-list-panel .tt-user-list-title {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  cursor: default !important; touch-action: auto !important;
}
.tt-list-tabs { display: flex; gap: 6px; margin-bottom: 8px; }
`);

(() => {
'use strict';

if(window.top!==window||document.getElementById('tt-cloud-id-search-v006'))return;

const DEFAULT_DATA_URL='https://raw.githubusercontent.com/takesann55/typingtube-ranking-data/main/typingtube_rankings_v001.bin';
const STORAGE_KEY='tt-cloud-rank-data-url-v006';
const CHOICE_KEY='tt-cloud-rank-choice-v080';
const CATALOG_KEY='tt-cloud-rank-catalog-v080';
const DATE_KEY='tt-cloud-rank-dates-v080';
const CACHE_TTL=60*60*1000;
const MAX_RESULTS=100;
const FILE_PATTERN=/^typingtube_rankings_v(\d+)\.bin$/;

let rows=[],anchor=null,open=false,settingsOpen=false;
let catalog=[],catalogIdentity='',catalogPromise=null,catalogGeneration=0;
let loadGeneration=0,loadedLabel='',loadedURL='',datesPromise=null;
let apiBlockedUntil=0;

const oldURL=GM_getValue(STORAGE_KEY,DEFAULT_DATA_URL);
let choice=GM_getValue(CHOICE_KEY,null);

if(!choice||!['latest','file','custom'].includes(choice.mode)||typeof choice.url!=='string'){
  choice={mode:oldURL===DEFAULT_DATA_URL?'latest':'custom',url:oldURL||DEFAULT_DATA_URL};
}

let dateCache=GM_getValue(DATE_KEY,{});
if(!dateCache||typeof dateCache!=='object'||Array.isArray(dateCache))dateCache={};

const normalize=value=>String(value).normalize('NFKC').toLocaleLowerCase('ja-JP');

const make=(tag,className,label)=>{
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(label!==undefined)element.textContent=label;
  return element;
};

const safeSave=async(key,value)=>{
  try{
    await GM_setValue(key,value);
  }catch(error){
    console.warn('TypingTube設定の保存に失敗しました。',error);
  }
};

function parseRawURL(value) {
  const url=new URL(value);
  if(url.protocol!=='https:'||url.hostname!=='raw.githubusercontent.com'){
    throw new Error('GitHubのRaw URLを指定してください');
  }
  const parts=url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if(parts.length<4||parts.some(part=>part==='.'||part==='..')){
    throw new Error('ファイルのURLが不正です');
  }
  const[owner,repo,ref,...rest]=parts;
  const path=rest.join('/');
  const slash=path.lastIndexOf('/');
  return{
    owner,repo,ref,path,
    dir:slash<0?'':path.slice(0,slash),
    identity:`${owner}/${repo}/${ref}/${slash<0?'':path.slice(0,slash)}`
  };
}

function rawFileURL(source,path) {
  return`https://raw.githubusercontent.com/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/${encodeURIComponent(source.ref)}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

function apiBase(source) {
  return`https://api.github.com/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}`;
}

function dateText(value) {
  const date=new Date(value);
  return value&&Number.isFinite(date.getTime())?
    new Intl.DateTimeFormat('ja-JP',{
      timeZone:'Asia/Tokyo',
      year:'numeric',
      month:'2-digit',
      day:'2-digit',
      hour:'2-digit',
      minute:'2-digit',
      hour12:false
    }).format(date)+'（日本時間）':
    '取得できませんでした';
}

function captureText(file) {
  return file.url===DEFAULT_DATA_URL?'収集日：2026年9月25日':'収集日：未登録';
}

function versionText(file) {
  return`v${file.version} ／ ${captureText(file).replace('収集日：','')}`;
}

const host=make('div');
host.id='tt-cloud-id-search-v006';
const root=host.attachShadow({mode:'open'});
const css=make('style');

css.textContent=`
    :host { all: initial; } * { box-sizing: border-box; }
    button, input, select { font: inherit; }
    .search-row { display: flex; gap: 5px; align-items: center; height: 100%; font: 14px sans-serif; }
    .query { flex: 1; min-width: 0; width: 100%; height: 100%; padding: 0 10px;
      border: 1px solid #aab6c1; border-radius: 6px; background: #fff; color: #17202a; }
    .query:focus { outline: 2px solid #2680c2; }
    button { border: 1px solid #aab6c1; border-radius: 6px; background: #fff; color: #17202a;
      cursor: pointer; padding: 5px 8px; }
    button:hover { background: #edf3fa; } button:disabled { opacity: .6; cursor: wait; }
    .gear { height: 100%; flex: none; }
    .drop { position: absolute; top: calc(100% + 6px); right: 0;
      width: min(480px, calc(100vw - 24px)); max-height: min(650px, calc(100vh - 100px));
      overflow: auto; background: #fff; color: #17202a; border: 1px solid #bbc8d3;
      border-radius: 10px; box-shadow: 0 8px 28px #0005; padding: 12px; font: 14px/1.5 sans-serif; }
    [hidden] { display: none !important; }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .head strong { font-size: 15px; } .head-actions { display: flex; align-items: center; gap: 8px; }
    .status, .catalog-status { color: #425568; margin: 8px 0; overflow-wrap: anywhere; }
    .settings { border: 1px solid #d9e2ea; border-radius: 7px; padding: 10px; margin: 8px 0; }
    label { display: block; font-size: 12px; margin: 6px 0 4px; }
    .settings-row { display: flex; gap: 6px; align-items: center; }
    .version-select, .url { min-width: 0; flex: 1; width: 100%; padding: 6px;
      border: 1px solid #aab6c1; border-radius: 5px; background: #fff; color: #17202a; }
    .note { color: #586a7a; font-size: 12px; margin: 7px 0; }
    .history { list-style: none; margin: 0 0 10px; padding: 0; max-height: 250px; overflow: auto; }
    .history-item { border-top: 1px solid #dce5ee; padding: 9px 0; }
    .history-item.is-selected { background: #edf5ff; }
    .history-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .history-date, .history-file { font-size: 12px; color: #506273; overflow-wrap: anywhere; }
    summary { cursor: pointer; font-size: 12px; }
    .results { list-style: none; padding: 0; margin: 0; }
    .item { border-top: 1px solid #e1e7ed; padding: 9px 0; overflow-wrap: anywhere; }
    .title { font-weight: 600; } .meta { color: #425568; margin: 4px 0; }
    .actions { display: flex; align-items: center; gap: 10px; }
    a { color: #07569d; text-decoration: underline; }
`;

root.append(css);

const searchRow=make('div','search-row');
const query=make('input','query');
query.type='search';
query.placeholder='ランキングから曲ID検索';
query.autocomplete='off';
query.setAttribute('aria-label','月間ランキングの曲名からIDを検索');

const gear=make('button','gear','⚙');
gear.type='button';
gear.title='ランキングの版・更新履歴';

searchRow.append(query,gear);

const drop=make('div','drop');
drop.hidden=true;

const head=make('div','head');
const repoLink=make('a','','GitHubの更新履歴');
repoLink.href='https://github.com/takesann55/typingtube-ranking-data';
repoLink.target='_blank';
repoLink.rel='noopener noreferrer';

const close=make('button','close','×');
close.type='button';
close.setAttribute('aria-label','検索結果を閉じる');

const headActions=make('div','head-actions');
headActions.append(repoLink,close);
head.append(make('strong','','月間ランキング 曲ID検索'),headActions);

const status=make('div','status','ランキングを読み込み中…');
status.setAttribute('aria-live','polite');

const settings=make('section','settings');
settings.hidden=true;

const versionLabel=make('label','','検索するランキングの版');
versionLabel.htmlFor='tt-ranking-version';

const versionSelect=make('select','version-select');
versionSelect.id='tt-ranking-version';

const refresh=make('button','','履歴を更新');
refresh.type='button';

const selectRow=make('div','settings-row');
selectRow.append(versionSelect,refresh);

const catalogStatus=make('div','catalog-status','公開されている版を確認中…');
catalogStatus.setAttribute('aria-live','polite');

const history=make('ol','history');
const explanation=make('p','note','収集日はランキングを記録した日です。GitHub追加・最終変更はコミット記録の日時で、収集日とは異なります。');

const advanced=make('details');
advanced.append(make('summary','','詳細設定：別のRaw URLを使う'));

const urlInput=make('input','url');
urlInput.type='url';
urlInput.value=choice.url;
urlInput.setAttribute('aria-label','ランキングデータのGitHub Raw URL');

const load=make('button','load','読込');
load.type='button';

const advancedRow=make('div','settings-row');
advancedRow.append(urlInput,load);
advanced.append(advancedRow);

settings.append(versionLabel,selectRow,catalogStatus,explanation,history,advanced);

const results=make('ul','results');
drop.append(head,status,settings,results);
root.append(searchRow,drop);
document.body.append(host);

function showDrop() {
  open=true;
  drop.hidden=false;
}

function hideDrop() {
  open=false;
  drop.hidden=true;
}

function toggleSettings() {
  settingsOpen=!settingsOpen;
  settings.hidden=!settingsOpen;
  showDrop();
  if(settingsOpen){
    versionSelect.focus();
    void refreshCatalog().then(()=>hydrateDates()).catch(showCatalogError);
  }
}

function position() {
  const found=document.querySelector('#topbarSearchInput.topbar-search-input');

  if(!found?.isConnected||!found.getClientRects().length){
    anchor=null;
    host.style.display='none';
    hideDrop();
    return;
  }

  anchor=found;
  const rect=found.getBoundingClientRect();
  const width=Math.min(265,window.innerWidth-rect.right-20);
  host.style.position='fixed';
  host.style.zIndex='2147483000';

  const left=width>=160?rect.right+8:Math.max(8,rect.left);

  host.style.left=`${Math.round(left)}px`;
  host.style.top=`${Math.round(width>=160?rect.top:rect.bottom+5)}px`;
  host.style.width=`${Math.round(width>=160?width:Math.max(120,Math.min(265,window.innerWidth-left-12)))}px`;
  host.style.height=`${Math.max(30,Math.round(rect.height))}px`;
  host.style.display='block';

  drop.style.right='auto';
  drop.style.left=`${Math.min(0,window.innerWidth-left-Math.min(480,window.innerWidth-24)-12)}px`;
  drop.style.maxHeight=`${Math.max(100,window.innerHeight-parseFloat(host.style.top)-rect.height-18)}px`;
}

function requestGitHub(url,responseType='json') {
  const parsed=new URL(url);

  if(parsed.protocol!=='https:'||!['api.github.com','raw.githubusercontent.com'].includes(parsed.hostname)){
    return Promise.reject(new Error('対応していないデータ取得先です'));
  }

  const isAPI=parsed.hostname==='api.github.com';

  if(isAPI&&Date.now()<apiBlockedUntil){
    return Promise.reject(new Error('GitHubの取得制限中です。時間をおいて履歴を更新してください。'));
  }

  return new Promise((resolve,reject)=>{
    GM_xmlhttpRequest({
      method:'GET',
      url:parsed.href,
      responseType,
      timeout:30000,
      anonymous:true,
      nocache:true,
      headers:isAPI?{
        Accept:'application/vnd.github+json',
        'X-GitHub-Api-Version':'2022-11-28'
      }:{},

      onload:response=>{
        if(response.status!==200){
          if(isAPI&&[403,429].includes(response.status)){
            const reset=response.responseHeaders?.match(/^x-ratelimit-reset:\s*(\d+)/im)?.[1];
            apiBlockedUntil=Math.max(
              Date.now()+60*1000,
              reset?Number(reset)*1000:Date.now()+15*60*1000
            );
          }

          reject(new Error(
            isAPI&&[403,429].includes(response.status)?
              'GitHubの取得制限中です。時間をおいて再試行してください。':
              `HTTP ${response.status}`
          ));
          return;
        }

        try{
          const data=responseType==='json'?
            (
              typeof response.response==='string'?
                JSON.parse(response.response):
                response.response??JSON.parse(response.responseText)
            ):
            response.response;

          resolve({data,headers:response.responseHeaders||''});
        }catch(_){
          reject(new Error('データを読み取れませんでした'));
        }
      },

      onerror:()=>reject(new Error('通信に失敗しました')),
      ontimeout:()=>reject(new Error('読込が時間切れになりました'))
    });
  });
}

function catalogFromEntries(entries,source) {
  if(!Array.isArray(entries))throw new Error('ランキング一覧の形式が不正です');

  return entries
    .filter(entry=>entry.type==='file'||entry.type==='blob')
    .map(entry=>{
      const path=entry.path;
      if(typeof path!=='string')return null;

      const slash=path.lastIndexOf('/');
      if((slash<0?'':path.slice(0,slash))!==source.dir)return null;

      const name=slash<0?path:path.slice(slash+1);
      const match=name.match(FILE_PATTERN);
      if(!match||!Number.isSafeInteger(Number(match[1])))return null;

      return{
        name,
        path,
        sha:entry.sha,
        version:Number(match[1]),
        url:rawFileURL(source,path)
      };
    })
    .filter(Boolean)
    .sort((a,b)=>b.version-a.version||a.name.localeCompare(b.name));
}

function renderCatalog() {
  versionSelect.replaceChildren();

  const latest=make('option','',catalog.length?
    `最新版を自動選択（v${catalog[0].version}）`:
    '最新版を自動選択'
  );
  latest.value='latest';
  versionSelect.append(latest);

  for(const file of catalog){
    const date=dateCache[`${catalogIdentity}/${file.path}/${file.sha}`]?.added;
    const option=make('option','',versionText(file)+(date?` ／ 公開 ${dateText(date).split(' ')[0]}`:''));
    option.value=file.url;
    versionSelect.append(option);
  }

  if(choice.mode!=='latest'&&!catalog.some(file=>file.url===choice.url)){
    const option=make('option','',choice.mode==='custom'?
      '個別のURLを使用中':
      '保存済みの版（一覧未取得）'
    );
    option.value=choice.url;
    versionSelect.append(option);
  }

  versionSelect.value=choice.mode==='latest'?'latest':choice.url;
  history.replaceChildren();

  for(const file of catalog){
    const item=make('li','history-item');
    item.dataset.url=file.url;
    item.classList.toggle('is-selected',loadedURL===file.url);

    const heading=make('div','history-header');
    const button=make('button','',loadedURL===file.url?'使用中':'この版を使う');
    button.type='button';
    button.addEventListener('click',()=>{void loadData(file.url,'file');});

    heading.append(make('strong','',`バージョン ${file.version}`),button);

    const dates=make('div','history-date');
    dates.dataset.path=file.path;

    item.append(
      heading,
      make('div','history-file',file.name),
      make('div','history-date',captureText(file)),
      dates
    );

    history.append(item);
    renderFileDates(file);
  }
}

function renderFileDates(file,error='') {
  const target=Array.from(history.querySelectorAll('[data-path]'))
    .find(element=>element.dataset.path===file.path);

  if(!target)return;

  const info=dateCache[`${catalogIdentity}/${file.path}/${file.sha}`];

  target.textContent=info?
    `GitHub追加：${dateText(info.added)} ／ 最終変更：${dateText(info.updated)}`:
    error?`公開日時：${error}`:'公開日時を確認中…';
}

function showCatalogError(error) {
  catalogStatus.textContent=`履歴の取得に失敗：${error.message}。読込済みのランキングは引き続き検索できます。`;
}

function refreshCatalog(force=false) {
  if(catalogPromise)return catalogPromise;

  const source=parseRawURL(urlInput.value.trim()||choice.url);
  const generation=++catalogGeneration;

  catalogPromise=(async()=>{
    refresh.disabled=true;
    catalogStatus.textContent='公開されているランキングの版を確認中…';

    try{
      const cached=GM_getValue(CATALOG_KEY,null);
      let files;

      if(
        !force&&
        cached?.identity===source.identity&&
        Date.now()-cached.time<CACHE_TTL&&
        Array.isArray(cached.files)
      ){
        files=cached.files;
      }else{
        const dir=source.dir.split('/').filter(Boolean).map(encodeURIComponent).join('/');
        const result=await requestGitHub(
          `${apiBase(source)}/contents/${dir}?ref=${encodeURIComponent(source.ref)}`
        );

        let entries=result.data;

        if(Array.isArray(entries)&&entries.length>=1000){
          const tree=await requestGitHub(
            `${apiBase(source)}/git/trees/${encodeURIComponent(source.ref)}?recursive=1`
          );
          if(tree.data.truncated){
            throw new Error('ファイルが多いため、全版を確認できませんでした');
          }
          entries=tree.data.tree;
        }

        files=catalogFromEntries(entries,source);
        if(!files.length){
          throw new Error('このフォルダにランキングの版が見つかりません');
        }

        await safeSave(CATALOG_KEY,{
          identity:source.identity,
          time:Date.now(),
          files
        });
      }

      if(generation!==catalogGeneration)return;

      catalog=files;
      catalogIdentity=source.identity;
      catalogStatus.textContent=`利用できるランキング：${catalog.length}版（新しい版から表示）`;
      renderCatalog();
    }finally{
      refresh.disabled=false;
    }
  })().finally(()=>{
    catalogPromise=null;
  });

  return catalogPromise;
}

async function fileCommitDates(file,source) {
  const base=`${apiBase(source)}/commits?sha=${encodeURIComponent(source.ref)}&path=${encodeURIComponent(file.path)}&per_page=1`;
  const newest=await requestGitHub(base);

  if(!Array.isArray(newest.data)||!newest.data.length){
    throw new Error('コミット履歴なし');
  }

  const updated=newest.data[0].commit?.committer?.date||newest.data[0].commit?.author?.date;
  let added=updated;

  const link=newest.headers.match(/^link:\s*(.+)$/im)?.[1]||'';
  const last=link.split(',')
    .map(part=>part.match(/<([^>]+)>;\s*rel="last"/))
    .find(Boolean)?.[1];

  if(last){
    const lastURL=new URL(last);
    const expected=new URL(base);

    if(lastURL.origin!==expected.origin||lastURL.pathname!==expected.pathname){
      throw new Error('履歴リンクが不正です');
    }

    const oldest=await requestGitHub(lastURL.href);
    added=oldest.data?.[0]?.commit?.committer?.date||oldest.data?.[0]?.commit?.author?.date;
  }

  if(!added||!updated)throw new Error('日時が登録されていません');
  return{added,updated};
}

function hydrateDates() {
  if(datesPromise)return datesPromise;

  const identity=catalogIdentity;
  const files=[...catalog];
  const source=parseRawURL(urlInput.value.trim()||choice.url);

  datesPromise=(async()=>{
    for(const file of files){
      if(catalogIdentity!==identity)break;

      const key=`${identity}/${file.path}/${file.sha}`;

      if(dateCache[key]){
        renderFileDates(file);
        continue;
      }

      try{
        dateCache[key]=await fileCommitDates(file,source);
        await safeSave(DATE_KEY,dateCache);
        renderFileDates(file);
      }catch(error){
        renderFileDates(file,error.message);

        if(Date.now()<apiBlockedUntil){
          for(const remaining of files){
            if(!dateCache[`${identity}/${remaining.path}/${remaining.sha}`]){
              renderFileDates(remaining,'GitHubの取得制限中。後で「履歴を更新」を押してください。');
            }
          }
          break;
        }
      }

      await new Promise(resolve=>window.setTimeout(resolve,300));
    }

    if(catalogIdentity===identity)renderCatalogOptions();
  })().finally(()=>{
    datesPromise=null;
  });

  return datesPromise;
}

function renderCatalogOptions() {
  for(const option of versionSelect.options){
    const file=catalog.find(entry=>entry.url===option.value);
    if(!file)continue;

    const date=dateCache[`${catalogIdentity}/${file.path}/${file.sha}`]?.added;
    option.textContent=versionText(file)+(date?` ／ 公開 ${dateText(date).split(' ')[0]}`:'');
  }
}

async function loadData(url,mode=choice.mode) {
  const generation=++loadGeneration;
  const target=url||urlInput.value.trim();

  try{
    parseRawURL(target);
  }catch(error){
    status.textContent=error.message;
    showDrop();
    return;
  }

  status.textContent='ランキングを読み込み中…';
  load.disabled=true;

  try{
    const{data:bytes}=await requestGitHub(target,'arraybuffer');
    if(!(bytes instanceof ArrayBuffer))throw new Error('不正なバイナリ');

    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const data=JSON.parse(await new Response(stream).text());

    if(data.format!=='typingtube-rankings'||data.version!==1||!Array.isArray(data.rows)){
      throw new Error('対応していないデータ形式です');
    }

    if(generation!==loadGeneration)return;

    const nextRows=data.rows.filter(row=>
      Array.isArray(row)&&
      typeof row[0]==='string'&&
      Number.isSafeInteger(row[1])&&
      row[1]>0
    );

    rows=nextRows;
    loadedURL=target;

    const file=catalog.find(entry=>entry.url===target);
    const match=parseRawURL(target).path.split('/').pop().match(FILE_PATTERN);

    loadedLabel=file?
      versionText(file):
      match?
        `v${Number(match[1])}`+(target===DEFAULT_DATA_URL?' ／ 2026年9月25日収集':''):
        '個別データ';

    choice={mode,url:target};
    urlInput.value=target;

    await safeSave(STORAGE_KEY,target);
    await safeSave(CHOICE_KEY,choice);

    if(generation!==loadGeneration)return;

    renderCatalog();
    search();
  }catch(error){
    if(generation!==loadGeneration)return;

    status.textContent=`読込失敗：${error.message}`+
      (rows.length?`（${loadedLabel}は引き続き検索できます）`:'');

    renderCatalog();
    showDrop();
  }finally{
    if(generation===loadGeneration)load.disabled=false;
  }
}

function search() {
  results.replaceChildren();
  const terms=normalize(query.value).trim().split(/\s+/).filter(Boolean);

  if(!terms.length){
    if(loadedURL){
      status.textContent=`${loadedLabel}：${rows.length.toLocaleString()}件。曲名を入力してください。`;
    }
    return;
  }

  showDrop();

  if(!loadedURL){
    status.textContent='ランキングを読み込んでから検索できます。⚙で版を選んでください。';
    return;
  }

  let total=0;

  for(const[title,id,rank,level]of rows){
    if(!terms.every(term=>normalize(title).includes(term)))continue;
    total++;
    if(total>MAX_RESULTS)continue;

    const item=make('li','item');
    const info=make('div','meta',
      `譜面ID: ${id}`+
      (Number.isInteger(rank)?` ／ 順位: ${rank}`:'')+
      (level?` ／ 難易度: ${level}`:'')
    );

    const actions=make('div','actions');
    const link=make('a','','譜面を開く');
    link.href=`https://typing-tube.net/movie/show/${id}`;
    link.target='_blank';
    link.rel='noopener noreferrer';

    const copy=make('button','','IDをコピー');
    copy.type='button';
    copy.addEventListener('click',async()=>{
      try{
        await navigator.clipboard.writeText(String(id));
        copy.textContent='コピーしました';
      }catch(_){
        copy.textContent='コピーできませんでした';
      }
    });

    actions.append(link,copy);
    item.append(make('div','title',title),info,actions);
    results.append(item);
  }

  status.textContent=`${loadedLabel}：${total}件が一致`+
    (total>MAX_RESULTS?`（先頭${MAX_RESULTS}件を表示）`:'');
}

query.addEventListener('focus',()=>{
  showDrop();
  if(query.value.trim())search();
});

query.addEventListener('input',search);

query.addEventListener('keydown',event=>{
  if(['Enter','Escape'].includes(event.key)){
    event.preventDefault();
    event.stopPropagation();
    if(event.key==='Escape')hideDrop();
    else search();
  }
});

gear.addEventListener('click',toggleSettings);
close.addEventListener('click',hideDrop);

load.addEventListener('click',()=>{
  void loadData(urlInput.value.trim(),'custom');
});

urlInput.addEventListener('keydown',event=>{
  if(event.key==='Enter'){
    event.preventDefault();
    void loadData(urlInput.value.trim(),'custom');
  }
});

versionSelect.addEventListener('change',async()=>{
  const value=versionSelect.value;

  if(value!=='latest'){
    await loadData(value,'file');
    return;
  }

  try{
    await refreshCatalog();
    if(catalog[0])await loadData(catalog[0].url,'latest');
  }catch(error){
    showCatalogError(error);
    renderCatalog();
  }
});

refresh.addEventListener('click',async()=>{
  try{
    await refreshCatalog(true);
    if(choice.mode==='latest'&&catalog[0]?.url!==loadedURL){
      await loadData(catalog[0].url,'latest');
    }
    await hydrateDates();
  }catch(error){
    showCatalogError(error);
  }
});

document.addEventListener('pointerdown',event=>{
  if(open&&!host.contains(event.target))hideDrop();
});

document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&open)hideDrop();
});

window.addEventListener('resize',position);
window.addEventListener('scroll',position,true);
document.addEventListener('turbo:load',position);

const observer=new MutationObserver(()=>{
  if(!anchor?.isConnected||document.querySelector('#topbarSearchInput.topbar-search-input')!==anchor){
    position();
  }
});

observer.observe(document.documentElement,{
  childList:true,
  subtree:true
});

renderCatalog();
position();

void(async()=>{
  if(choice.mode!=='latest'){
    await loadData(choice.url,choice.mode);
    return;
  }

  const generation=loadGeneration;

  try{
    await refreshCatalog();
    if(generation===loadGeneration){
      await loadData(catalog[0].url,'latest');
    }
  }catch(error){
    showCatalogError(error);
    if(generation===loadGeneration){
      await loadData(choice.url||DEFAULT_DATA_URL,'latest');
    }
  }
})();
})();

