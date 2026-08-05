/* ============================================================
   kenpan-nav.js — KENPAN 共通ナビゲーション
   FUJIWARA PRINTING.inc

   使い方：各ツール・各マニュアルの </body> 直前に次の1行を追加する。
     <script src="kenpan-nav.js"></script>

   ■ ツールのページ（「ハブに戻る」リンクが無いページ）
     「ハブへ」ボタンを自動で追加します。ハブが付けるクエリで挙動が変わります。
       ?hub=1    ハブが同じウインドウで開いた → 押すとハブへ戻る
       ?hub=tab  ハブが別タブで開いた         → 押すとこのタブを閉じる
                                                （閉じられなければハブへ遷移）
       クエリ無し 直接ブックマークで開いた     → 押すとハブへ遷移

     設置場所は .kp-strip → .foot → footer → .top → .bar … の順に自動で探します。
     位置を指定したいときは、置きたい要素に data-kenpan-nav 属性を付けてください。

   ■ マニュアルのページ（a.back の「ハブに戻る」があるページ）
     ボタンは追加せず、既存リンクを賢くします。
       ・ハブのマニュアル枠（iframe）内では「ハブに戻る」を隠します
         （枠の中にハブが二重表示されるのを防ぐため）
       ・「ツールを開く」は、ハブの設定に合わせて同じウインドウ／別タブを切り替えます
       ・iframe 内からツールを開くときは、親のハブに依頼して開きます

   ■ 作業中の離脱確認（任意）
     このスクリプトより前に次を定義しておくと、確認ダイアログが出ます。
       <script>window.KENPAN_HAS_WORK=function(){ return pdfDoc!==null; };</script>
   ============================================================ */
(function(){
  'use strict';

  if (window.__kenpanNavReady) return;
  window.__kenpanNavReady = true;

  var HUB = 'index.html';
  var NAVMODE_KEY = 'kenpan-hub-navmode';

  var inFrame = (function(){
    try { return window.self !== window.top; } catch(e){ return true; }
  })();

  /* ---------- 状態の取得 ---------- */

  /* ハブがこのページを開いたときに付けたクエリ（'1' / 'tab' / '' ） */
  function hubParam(){
    try { return new URLSearchParams(location.search).get('hub') || ''; }
    catch(e){ return ''; }
  }

  function isStandalone(){
    try {
      return (window.matchMedia &&
              (matchMedia('(display-mode: standalone)').matches ||
               matchMedia('(display-mode: minimal-ui)').matches)) ||
             navigator.standalone === true;
    } catch(e){ return false; }
  }

  /* ハブ側の設定を読む（同一オリジンなので localStorage を共有できる） */
  function preferSameWindow(){
    var m = 'auto';
    try { m = localStorage.getItem(NAVMODE_KEY) || 'auto'; } catch(e){}
    if (m === 'same') return true;
    if (m === 'tab')  return false;
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

  function hubUrl(){
    return HUB + '?_v=' + Date.now() + '&hub=1';
  }

  function confirmLeave(){
    try {
      if (typeof window.KENPAN_HAS_WORK === 'function' && window.KENPAN_HAS_WORK()) {
        return confirm('読み込んだデータは破棄されます。ハブへ戻りますか？');
      }
    } catch(e){}
    return true;
  }

  /* ---------- ハブへ戻る ---------- */
  function goHub(){
    if (!confirmLeave()) return;

    if (hubParam() === 'tab') {
      /* ハブが別タブで開いたウインドウ。スクリプトで開かれているので閉じられる。
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
  function injectStyle(){
    if (document.getElementById('kenpan-nav-style')) return;
    var css = ''
      + '.kenpan-navbtn{display:inline-flex;align-items:center;gap:5px;'
      + 'font-family:inherit;font-size:12px;line-height:1;cursor:pointer;'
      + 'padding:6px 11px;margin:0 10px 0 0;vertical-align:middle;'
      + 'border:1px solid rgba(128,120,104,.45);border-radius:8px;'
      + 'background:rgba(255,255,255,.75);color:#3a3226;'
      + 'transition:border-color .15s,background .15s;-webkit-appearance:none;appearance:none}'
      + '.kenpan-navbtn:hover{border-color:#b9791a;background:#f6ead2;color:#2b2419}'
      + '.kenpan-navbtn:focus-visible{outline:2px solid #b9791a;outline-offset:2px}'
      + '.kenpan-navbtn svg{width:13px;height:13px;flex:0 0 auto}'
      + '[data-theme="dark"] .kenpan-navbtn{border-color:rgba(200,190,170,.35);'
      + 'background:rgba(255,255,255,.07);color:#ece5d8}'
      + '[data-theme="dark"] .kenpan-navbtn:hover{border-color:#e8a33d;'
      + 'background:rgba(232,163,61,.16);color:#fff}'
      + '.kenpan-navstrip{flex:0 0 auto;padding:8px 16px;text-align:right;'
      + 'border-top:1px solid rgba(128,120,104,.22)}';
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
      + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M10 19l-7-7 7-7"/><path d="M3 12h13a5 5 0 0 1 5 5v2"/></svg>'
      + '<span>ハブへ</span>';
    b.addEventListener('click', goHub);
    return b;
  }

  /* 設置先を優先順に探す。固定オーバーレイは各ツールのズーム操作パネルと
     干渉するため使わない。 */
  function mount(btn){
    var explicit = document.querySelector('[data-kenpan-nav]');
    if (explicit){ explicit.insertBefore(btn, explicit.firstChild); return 'data-kenpan-nav'; }

    var sels = ['.kp-strip', '.foot', 'footer', '.footer', '.statusbar',
                '.top', '.topbar', '.bar', '.toolbar', '.head', 'header'];
    for (var i = 0; i < sels.length; i++){
      var el = document.querySelector(sels[i]);
      if (el){ el.insertBefore(btn, el.firstChild); return sels[i]; }
    }

    /* フォールバック：.app（100vh flex）の最後、または body の末尾に帯を追加 */
    var strip = document.createElement('div');
    strip.className = 'kenpan-navstrip';
    strip.appendChild(btn);
    var app = document.querySelector('.app');
    if (app){ app.appendChild(strip); return '.app（自前の帯）'; }
    document.body.appendChild(strip);
    return 'body（自前の帯）';
  }

  /* ---------- マニュアルページの扱い ---------- */

  function backLink(){
    return document.querySelector('a.back[href*="index.html"], a.back[href="./"], a.back');
  }

  /* マニュアル内の「ツールを開く」ボタン */
  function toolLink(){
    return document.querySelector('.hero a.open[href], a.open[href$=".html"]');
  }

  function relabel(a, text){
    /* 「（別タブ）」の表記だけを差し替える。文言が無ければ何もしない */
    try {
      a.innerHTML = a.innerHTML.replace('（別タブ）', text);
    } catch(e){}
  }

  function setupManual(back){
    var tool = toolLink();

    if (inFrame){
      /* ハブのマニュアル枠の中。枠内にハブを開くと二重になるので隠す */
      back.style.display = 'none';
      relabel(tool || document.createElement('a'), '');
      if (tool){
        var href = tool.getAttribute('href');
        tool.addEventListener('click', function(e){
          try {
            e.preventDefault();
            window.parent.postMessage({ kenpan: 'openTool', url: href }, location.origin);
          } catch(err){
            /* 親に渡せなければ従来どおり別タブで開く */
            window.open(href, '_blank');
          }
        });
      }
      return 'manual(iframe)';
    }

    /* 独立したウインドウ／タブで開かれたマニュアル */
    var tabbed = (hubParam() === 'tab');
    if (tabbed){
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
      injectStyle();
      where = mount(makeButton());
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
