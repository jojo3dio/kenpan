/* ============================================================
   kenpan-nav.js — KENPAN 共通ナビゲーション
   FUJIWARA PRINTING.inc

   使い方：各ツール・各マニュアルの </body> 直前に次の1行を追加する。
     <script src="kenpan-nav.js"></script>

   ■ ツールのページ（「ハブに戻る」リンクが無いページ）
     画面右下に「ハブへ」ボタンを追加します。色はそのツール自身の
     メインカラー（--accent / --acc / --amber / --shu のいずれか）を
     そのまま使うので、テーマ切替にも自動で追従します。

     ハブが付けるクエリで挙動が変わります。
       ?hub=1    ハブが同じウインドウで開いた → 押すとハブへ戻る
       ?hub=tab  別タブ／別ウインドウで開いた → 押すとこのタブを閉じる
                                                （閉じられなければハブへ遷移）
       クエリ無し 直接ブックマークで開いた     → 押すとハブへ遷移

     設置先は .kp-strip → .foot → footer … の順に探し、その帯を
     右そろえにして最後に置きます。帯が画面外（スクロールしないと
     見えない）ページでは、右下に固定表示へ自動で切り替えます。
     位置を指定したいときは、置きたい要素に data-kenpan-nav を付けてください。

   ■ マニュアルのページ（a.back の「ハブに戻る」があるページ）
     ボタンは追加せず、既存リンクを賢くします。
       ・ハブのマニュアル枠（iframe）内では「ハブに戻る」を隠します
       ・「ツールを開く」はハブの設定に合わせて開き方を切り替えます
       ・iframe 内からツールを開くときは親のハブに依頼します

   ■ ウインドウサイズの記憶
     同じウインドウで使う設定のとき、ハブ用とツール用のウインドウサイズを
     別々に覚え、切り替え時に復元を試みます（アプリのウインドウのみ／
     ブラウザが拒否した場合は何も起きません）。

   ■ 作業中の離脱確認（任意）
     このスクリプトより前に次を定義しておくと、確認ダイアログが出ます。
       <script>window.KENPAN_HAS_WORK=function(){ return pdfDoc!==null; };</script>
   ============================================================ */
(function(){
  'use strict';

  if (window.__kenpanNavReady) return;
  window.__kenpanNavReady = true;

  var HUB = 'index.html';
  var K_NAVMODE = 'kenpan-hub-navmode';
  var K_WINMEM  = 'kenpan-hub-winmem';
  var K_WINTOOL = 'kenpan-win-tool';

  var inFrame = (function(){
    try { return window.self !== window.top; } catch(e){ return true; }
  })();

  /* ---------- 状態の取得 ---------- */

  function ls(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function lsSet(k,v){ try { localStorage.setItem(k,v); } catch(e){} }

  /* ハブがこのページを開いたときに付けたクエリ（'1' / 'tab' / '' ） */
  function hubParam(){
    try { return new URLSearchParams(location.search).get('hub') || ''; }
    catch(e){ return ''; }
  }

  function isStandalone(){
    try {
      return (window.matchMedia &&
              (matchMedia('(display-mode: standalone)').matches ||
               matchMedia('(display-mode: minimal-ui)').matches ||
               matchMedia('(display-mode: window-controls-overlay)').matches)) ||
             navigator.standalone === true;
    } catch(e){ return false; }
  }

  /* ハブ側の設定を読む（同一オリジンなので localStorage を共有できる） */
  function preferSameWindow(){
    var m = ls(K_NAVMODE) || 'auto';
    if (m === 'same') return true;
    if (m === 'tab' || m === 'win') return false;
    return isStandalone();
  }

  function withParam(url, key, val){
    if (!url) return url;
    var h = url.indexOf('#');
    var hash = h >= 0 ? url.slice(h) : '';
    var base = h >= 0 ? url.slice(0, h) : url;
    base += (base.indexOf('?') >= 0 ? '&' : '?') + key + '=' + val;
    return base + hash;
  }

  function hubUrl(){ return HUB + '?_v=' + Date.now() + '&hub=1'; }

  /* ---------- ウインドウサイズの記憶 ---------- */

  function winMemOn(){
    return ls(K_WINMEM) !== '0' && isStandalone() && hubParam() === '1';
  }
  function saveToolSize(){
    if (!winMemOn()) return;
    var w = window.outerWidth, h = window.outerHeight;
    if (w > 200 && h > 200) lsSet(K_WINTOOL, w + ',' + h);
  }
  function restoreToolSize(){
    if (!winMemOn()) return;
    var v = ls(K_WINTOOL); if (!v) return;
    var p = v.split(','), w = parseInt(p[0],10), h = parseInt(p[1],10);
    if (!(w > 200 && h > 200)) return;
    if (Math.abs(w - window.outerWidth) < 12 && Math.abs(h - window.outerHeight) < 12) return;
    /* アプリのウインドウ以外ではブラウザが黙って無視する */
    try { window.resizeTo(w, h); } catch(e){}
  }

  /* ---------- ハブへ戻る ---------- */

  function confirmLeave(){
    try {
      if (typeof window.KENPAN_HAS_WORK === 'function' && window.KENPAN_HAS_WORK()) {
        return confirm('読み込んだデータは破棄されます。ハブへ戻りますか？');
      }
    } catch(e){}
    return true;
  }

  function goHub(){
    if (!confirmLeave()) return;
    saveToolSize();

    if (hubParam() === 'tab') {
      /* 別タブ／別ウインドウ。スクリプトで開かれているので閉じられる。
         ブラウザ側で拒否された場合に備え、少し待ってからハブへ遷移する。 */
      try { window.close(); } catch(e){}
      setTimeout(function(){
        if (!window.closed) location.href = hubUrl();
      }, 250);
      return;
    }
    location.href = hubUrl();
  }

  /* ---------- スタイル ---------- */

  /* ツール自身のメインカラーを使う。var() の入れ子で「定義されている
     最初の変数」が選ばれるので、テーマ切替にもそのまま追従する。 */
  var ACCENT = 'var(--accent, var(--acc, var(--amber, var(--shu, #b9791a))))';

  function injectStyle(){
    if (document.getElementById('kenpan-nav-style')) return;
    var css = ''
      + '.kenpan-navbtn{--kn:' + ACCENT + ';'
      + 'display:inline-flex;align-items:center;gap:6px;'
      + 'font-family:inherit;font-size:12.5px;font-weight:700;line-height:1;'
      + 'cursor:pointer;padding:9px 15px;margin:0;vertical-align:middle;white-space:nowrap;'
      + 'border:0;border-radius:10px;background:var(--kn);color:#fff;'
      + 'box-shadow:0 2px 6px color-mix(in srgb, var(--kn) 34%, transparent),'
      + '0 0 0 1px color-mix(in srgb, var(--kn) 62%, transparent);'
      + 'transition:filter .15s,transform .15s,box-shadow .15s;'
      + '-webkit-appearance:none;appearance:none}'
      + '.kenpan-navbtn:hover{filter:brightness(1.08);transform:translateY(-1px);'
      + 'box-shadow:0 5px 14px color-mix(in srgb, var(--kn) 40%, transparent),'
      + '0 0 0 1px color-mix(in srgb, var(--kn) 70%, transparent)}'
      + '.kenpan-navbtn:active{transform:translateY(0);filter:brightness(.96)}'
      + '.kenpan-navbtn:focus-visible{outline:2px solid var(--kn);outline-offset:3px}'
      + '.kenpan-navbtn svg{width:14px;height:14px;flex:0 0 auto}'
      /* 設置先の帯を右そろえにする（ツールをまたいで見た目をそろえる） */
      + '.kenpan-navhost{display:flex!important;align-items:center;'
      + 'justify-content:flex-end!important;gap:12px;text-align:right!important}'
      /* 帯が画面下端まで来ないページ用：帯ごと下端に固定する。
         z-index は控えめにして、各ツールのモーダルが上に来るようにする */
      + '.kenpan-navhost.kenpan-pinned{position:fixed!important;left:0;right:0;bottom:0;'
      + 'z-index:60;margin:0!important;padding:8px 18px!important;'
      + 'background:var(--bg, #fff);'
      + 'border-top:1px solid var(--line, rgba(128,120,104,.22));'
      + 'backdrop-filter:saturate(1.05)}';
    var s = document.createElement('style');
    s.id = 'kenpan-nav-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function makeButton(){
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'kenpan-navbtn';
    b.id = 'kenpanNavBtn';
    b.title = 'KENPAN ハブへ戻る';
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
      + 'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M10 19l-7-7 7-7"/><path d="M3 12h13a5 5 0 0 1 5 5v2"/></svg>'
      + '<span>ハブへ</span>';
    b.addEventListener('click', goHub);
    return b;
  }

  /* 設置先を優先順に探し、その帯を右そろえに整える */
  var navHost = null;

  function mount(btn){
    var host = document.querySelector('[data-kenpan-nav]');
    var label = 'data-kenpan-nav';

    if (!host){
      var sels = ['.kp-strip', '.foot', 'footer', '.footer', '.statusbar'];
      for (var i = 0; i < sels.length; i++){
        var el = document.querySelector(sels[i]);
        if (el){ host = el; label = sels[i]; break; }
      }
    }

    if (!host){
      /* 帯が無いページ：自前の帯を作って body の末尾へ */
      host = document.createElement('div');
      host.className = 'kenpan-navstrip';
      document.body.appendChild(host);
      label = '自前の帯';
    }

    host.classList.add('kenpan-navhost');
    host.appendChild(btn);              /* 帯の右端＝画面の右下 */
    navHost = host;

    try {
      var cs = getComputedStyle(host);
      if ((parseFloat(cs.paddingRight) || 0) < 14) host.style.paddingRight = '18px';
      if ((parseFloat(cs.paddingBottom) || 0) < 6) host.style.paddingBottom = '8px';
    } catch(e){}

    return label;
  }

  /* 帯が画面の下端まで来ないページ（内容が短い・スクロールする作りの
     ページ）では、帯ごと下端に固定して「右下」をそろえる。 */
  function pinIfNeeded(){
    var host = navHost;
    if (!host) return false;
    try {
      var pinned = host.classList.contains('kenpan-pinned');
      if (pinned) return true;

      var vh = window.innerHeight || document.documentElement.clientHeight;
      var r = host.getBoundingClientRect();
      if (r.height > 0 && vh - r.bottom <= 48 && r.bottom <= vh + 4) return false;

      host.classList.add('kenpan-pinned');
      /* 固定した帯の下に本文が隠れないよう、その分だけ余白を足す */
      var h = host.getBoundingClientRect().height || 40;
      document.body.style.paddingBottom =
        ((parseFloat(getComputedStyle(document.body).paddingBottom) || 0) + h) + 'px';
      return true;
    } catch(e){ return false; }
  }

  /* ---------- マニュアルページの扱い ---------- */

  function backLink(){ return document.querySelector('a.back'); }
  function toolLink(){ return document.querySelector('.hero a.open[href], a.open[href$=".html"]'); }

  function relabel(a, text){
    if (!a) return;
    try { a.innerHTML = a.innerHTML.replace('（別タブ）', text); } catch(e){}
  }

  function setupManual(back){
    var tool = toolLink();

    if (inFrame){
      /* ハブのマニュアル枠の中。枠内にハブを開くと二重になるので隠す */
      back.style.display = 'none';
      relabel(tool, '');
      if (tool){
        var href = tool.getAttribute('href');
        tool.addEventListener('click', function(e){
          try {
            e.preventDefault();
            window.parent.postMessage({ kenpan: 'openTool', url: href }, location.origin);
          } catch(err){
            window.open(href, '_blank');
          }
        });
      }
      return 'manual(iframe)';
    }

    /* 独立したウインドウ／タブで開かれたマニュアル */
    if (hubParam() === 'tab'){
      back.setAttribute('href', '#');
      back.addEventListener('click', function(e){ e.preventDefault(); goHub(); });
    } else {
      back.setAttribute('href', hubUrl());
    }

    if (tool){
      var h = tool.getAttribute('href');
      if (preferSameWindow()){
        tool.setAttribute('href', withParam(h, 'hub', '1'));
        tool.removeAttribute('target');
        tool.removeAttribute('rel');
        relabel(tool, '');
      } else {
        tool.setAttribute('href', withParam(h, 'hub', 'tab'));
        tool.setAttribute('target', '_blank');
        tool.removeAttribute('rel'); /* ツール側で window.close() を使えるようにする */
      }
    }
    return 'manual(window)';
  }

  /* ---------- 初期化 ---------- */

  function init(){
    var back = backLink();
    var where;

    if (back){
      where = setupManual(back);
    } else {
      restoreToolSize();
      injectStyle();
      var btn = makeButton();
      where = mount(btn);
      /* レイアウト確定後に、帯が画面下端に来ているかを確認する */
      setTimeout(function(){ if (pinIfNeeded()) console.debug('[kenpan-nav] pinned'); }, 0);
      window.addEventListener('resize', pinIfNeeded);
      window.addEventListener('pagehide', saveToolSize);
    }

    if (window.console && console.debug){
      console.debug('[kenpan-nav] hub=' + (hubParam() || 'direct')
        + ' frame=' + inFrame + ' mount=' + where);
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
