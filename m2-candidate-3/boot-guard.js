(function () {
  'use strict';
  var panel = document.getElementById('boot-panel');
  var title = document.getElementById('boot-title');
  var detail = document.getElementById('boot-detail');
  var diagnostic = document.getElementById('boot-diagnostic');
  var canvas = document.getElementById('GameCanvas');
  var state = {version:'0.2.0-candidate.3', webgl2:false, webgl1:false, stage:'probe'};
  var failed = false, timer;
  function report(code, heading, text) {
    failed = true; clearTimeout(timer); state.stage = code;
    panel.hidden = false; title.textContent = heading; detail.textContent = text;
    diagnostic.textContent = JSON.stringify(state);
  }
  var boot = window.ncBoot = {
    state:state,
    fail:function () { report('INIT_FAILED','画面没有成功启动','图形或资源初始化失败。可以重新加载，或在支持 WebGL 的浏览器打开此地址。当前没有进入游戏，也没有发送诊断数据。'); },
    ready:function () { if (!failed) {clearTimeout(timer);state.stage='ready';panel.hidden=true;} }
  };
  document.getElementById('boot-retry').onclick = function () { location.reload(); };
  canvas.addEventListener('webglcontextlost', function (event) {
    event.preventDefault(); report('CONTEXT_LOST','图形连接暂时中断','浏览器丢失了渲染上下文。当前操作的稳定结果会保存在本机；请重新加载恢复。');
  });
  canvas.addEventListener('webglcontextrestored', function () {
    report('CONTEXT_RESTORED','图形连接已恢复','为避免半帧状态，请重新加载游戏，从最近保存的稳定棋盘继续。');
  });
  var attributes = {alpha:false, antialias:false, depth:true, stencil:true, premultipliedAlpha:false, preserveDrawingBuffer:false, powerPreference:'default', failIfMajorPerformanceCaveat:false};
  var gl = null;
  try { gl=canvas.getContext('webgl2',attributes); state.webgl2=!!gl; } catch (_) {}
  if (!gl) { try {gl=canvas.getContext('webgl',attributes);state.webgl1=!!gl;} catch (_) {} }
  if (!gl || gl.isContextLost()) {
    report('NO_WEBGL','这个浏览器暂时无法绘制游戏','没有取得可用的 WebGL 2 或 WebGL 1 上下文。云浏览器可能没有提供图形能力；请在本地支持 WebGL 的浏览器打开同一地址。此页不是可玩游戏，不会改动浏览器安全设置。');
    return;
  }
  state.stage='loading'; diagnostic.textContent=JSON.stringify(state);
  window.addEventListener('error',function () { if(state.stage!=='ready')boot.fail(); });
  window.addEventListener('unhandledrejection',function () { if(state.stage!=='ready')boot.fail(); });
  timer=setTimeout(function () {report('START_TIMEOUT','启动比预期更久','资源尚未完成加载或初始化。请检查网络后重新加载；本页不会收集或上传诊断信息。');},30000);
  System.import('./index.js').catch(boot.fail);
}());
