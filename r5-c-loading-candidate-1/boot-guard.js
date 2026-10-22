(function(){
 'use strict';
 var panel=document.getElementById('boot-panel'),title=document.getElementById('boot-title'),detail=document.getElementById('boot-detail'),diagnostic=document.getElementById('boot-diagnostic'),canvas=document.getElementById('GameCanvas'),retry=document.getElementById('boot-retry');
 var failed=false,timer,slowTimer,engine=null,queuedReady=false;
 var labels={probe:'正在连接喵星乐园',modules:'正在搬运鱼干（下载引擎与资源）',engine:'猫咪正在准备（初始化引擎）',scene:'正在布置喵星棋盘',portraits:'正在搬运鱼干（加载猫咪与棋盘资源）',frame:'猫咪准备就绪（正在显示棋盘）',ready:'棋盘已显示，可以开始玩啦'};
 var state={version:'0.2.0-loading.candidate.1',webgl2:false,webgl1:false,stage:'probe',startedAtMs:performance.now(),events:[],errors:[],mainReadyAtMs:null,readyAtMs:null,firstDrawConfirmed:false,timeoutMs:30000};
 function cleanName(name){try{var u=new URL(name,location.href);return u.origin===location.origin?u.pathname.split('/').slice(-3).join('/'):'external-resource';}catch(_){return 'unknown-resource';}}
 function entries(type){try{return performance.getEntriesByType?performance.getEntriesByType(type):[];}catch(_){return [];}}
 function snapshot(){var nav=entries('navigation')[0];return JSON.parse(JSON.stringify({version:state.version,webgl2:state.webgl2,webgl1:state.webgl1,stage:state.stage,timeoutMs:state.timeoutMs,startedAtMs:state.startedAtMs,mainReadyAtMs:state.mainReadyAtMs,readyAtMs:state.readyAtMs,firstDrawConfirmed:state.firstDrawConfirmed,events:state.events,errors:state.errors,navigation:nav?{responseStartMs:nav.responseStart,responseEndMs:nav.responseEnd,domInteractiveMs:nav.domInteractive,type:nav.type}:null,resources:entries('resource').slice(0,64).map(function(r){return {name:cleanName(r.name),initiator:r.initiatorType,startMs:r.startTime,endMs:r.responseEnd,durationMs:r.duration,transferBytes:r.transferSize,encodedBytes:r.encodedBodySize,status:r.responseStatus||null};}),note:'本页本机诊断，不上传；0字节或未知状态不能单独证明缓存或网络失败。'}));}
 function refresh(){diagnostic.textContent=JSON.stringify(snapshot(),null,2);}
 function phase(stage){if(failed||state.stage==='ready'||!labels[stage])return;state.stage=stage;if(state.events.length<20)state.events.push({stage:stage,atMs:performance.now()});detail.textContent=labels[stage];refresh();}
 function report(code,heading,text,error){failed=true;clearTimeout(timer);clearTimeout(slowTimer);state.stage=code;if(state.errors.length<8)state.errors.push({code:code,message:String(error&&error.message||error||'').slice(0,400),atMs:performance.now()});panel.hidden=false;panel.setAttribute('data-failed','true');title.textContent=heading;detail.textContent=text;retry.hidden=false;refresh();}
 var boot=window.ncBoot={state:state,snapshot:snapshot,phase:phase,
  fail:function(error){report('INIT_FAILED','小伙伴还没准备好','加载或初始化暂未完成。可查看详情、检查连接后重试；当前无法确定具体原因。',error);},
  watchEngine:function(cc){engine=cc;phase('engine');cc.director.once(cc.Director.EVENT_AFTER_SCENE_LAUNCH,function(){phase('portraits');});},
  ready:function(){if(failed||queuedReady)return;queuedReady=true;state.mainReadyAtMs=performance.now();phase('frame');if(!engine){boot.fail('Engine observation was not attached');return;}engine.director.once(engine.Director.EVENT_AFTER_DRAW,function(){if(failed)return;if(!engine.director.getScene()||canvas.width<=0||canvas.height<=0){boot.fail('Scene or drawable canvas missing');return;}phase('ready');state.firstDrawConfirmed=true;state.readyAtMs=performance.now();clearTimeout(timer);clearTimeout(slowTimer);refresh();panel.hidden=true;});}
 };
 document.getElementById('boot-retry').onclick=function(){location.reload();};
 document.querySelector('#boot-panel details').addEventListener('toggle',refresh);
 document.getElementById('boot-copy').onclick=function(){refresh();var note=document.getElementById('boot-copy-note');if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(diagnostic.textContent).then(function(){note.textContent='详情已复制；未发送到服务器。';},function(){note.textContent='无法自动复制，可长按选择上方详情。';});else note.textContent='可长按选择上方详情复制。';};
 canvas.addEventListener('webglcontextlost',function(event){event.preventDefault();report('CONTEXT_LOST','图形连接暂时中断','浏览器丢失了绘图上下文，请重试并恢复最近的本机存档。');});
 canvas.addEventListener('webglcontextrestored',function(){report('CONTEXT_RESTORED','图形连接已恢复','请重新加载，从最近保存的稳定棋盘继续。');});
 var attributes={alpha:false,antialias:false,depth:true,stencil:true,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'default',failIfMajorPerformanceCaveat:false},gl=null;
 try{gl=canvas.getContext('webgl2',attributes);state.webgl2=!!gl;}catch(_){}
 if(!gl)try{gl=canvas.getContext('webgl',attributes);state.webgl1=!!gl;}catch(_){}
 if(!gl||gl.isContextLost()){report('NO_WEBGL','这个浏览器暂时无法绘制游戏','没有取得可用的 WebGL 上下文。可在已支持的手机 Chrome、Edge 或微信浏览器重试；此页尚不可玩。');return;}
 window.addEventListener('error',function(event){if(state.stage!=='ready')boot.fail(event.error||event.message||'Uncaught startup error');});
 window.addEventListener('unhandledrejection',function(event){if(state.stage!=='ready')boot.fail(event.reason||'Unhandled startup rejection');});
 timer=setTimeout(function(){report('START_TIMEOUT','加载暂未完成','等待超过了30秒。可检查连接后重新尝试；仅凭超时无法判断是网络、资源还是初始化问题。');},30000);
 slowTimer=setTimeout(function(){if(!failed&&state.stage!=='ready')document.getElementById('boot-tip').textContent='小伙伴还在准备中，首次或重新下载资源可能需要更久。';},10000);
 phase('modules');System.import('./index.js').catch(boot.fail);
}());
