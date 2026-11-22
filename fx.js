/* 灯守りの夜明け エフェクトとカットイン（版 0.7.0・2026-11-06・セッション3。0.7.0 で戦いの場面を見ないときのクリティカルの印。0.6.1 で呼び戻しの光の柱をやめ、影が白く輝いていく形に）
   ルールの計算はしない。乱数（Math.random）も使わない（ゆれや光のちらつきは時刻から作る）。
   ・マップ：灯台の光の筋のなぞり（光を回したとき・ターンの始め）
   ・マップ：戦いの場面を「見ない」にしたとき、ダメージの数字・命中の光・画面ゆれ・MISS をマップの上に出す
   ・カットイン：影を呼び戻したとき（毎回・11/6 ヒロさん）と、夜明け
   ・「動きを減らす」では、点滅・ゆれ・すべり込み・流れる線を止める（字と顔は出る）
   ・押す・Enter・Esc・戻るで次へ（何もしなくても進む） */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const now=()=>performance.now();
const ease=p=>1-(1-p)*(1-p), clamp01=p=>p<0?0:p>1?1:p, lerp=(a,b,p)=>a+(b-a)*p;
function calm(){ return typeof isCalm==='function'&&isCalm(); }
function fastK(){ return typeof btSpd==='function'?1/btSpd():1; }   /* 0.94.0 設定の「戦いの場面の速さ」 */
/* 乱数を使わないゆれ（時刻から作るので、ゲームの乱数の順番に触れない） */
function wob(t,s){ return Math.sin(t*0.091+s*1.7)*0.6+Math.sin(t*0.173+s*4.1)*0.4; }
function pixText(c,s,x,y,k,col){ if(window.BTL&&BTL.pixText) BTL.pixText(c,s,x,y,k,col); }

/* =========================================================
   マップのエフェクト（index.html の draw() の最後で FX.drawMap(ctx) を呼ぶ）
   ========================================================= */
const M={list:[],iv:0,q:null};
function kick(){
  if(M.iv) return;
  M.iv=setInterval(()=>{
    const t=now(); M.list=M.list.filter(e=>t-e.t0<e.ms);
    quakeStep(t);
    if(typeof draw==='function'&&typeof G!=='undefined'&&G&&G.units) draw();
    if(!M.list.length&&!M.q){ clearInterval(M.iv); M.iv=0; if(typeof draw==='function'&&G&&G.units) draw(); }
  },33);
}
function add(kind,o){ M.list.push(Object.assign({kind,t0:now()},o)); kick(); }
function tileC(x,y){ return [x*TS+8, tileY(y)+8]; }
/* 画面ゆれ：マップの枠（#mapbox）を CSS で少し動かす。拡大の位置（canvas の transform）には触れない */
function quake(amp,ms){ if(calm()) return; M.q={amp,ms,t0:now()}; kick(); }
function quakeStep(t){
  const box=$('mapbox'); if(!box) return;
  if(!M.q||calm()){ if(box.style.transform) box.style.transform=''; M.q=null; return; }
  const p=(t-M.q.t0)/M.q.ms; if(p>=1){ box.style.transform=''; M.q=null; return; }
  const a=M.q.amp*(1-p); box.style.transform=`translate(${(wob(t,1)*a).toFixed(1)}px,${(wob(t,2)*a*0.6).toFixed(1)}px)`;
}

/* 灯台の光の筋のなぞり：前の向きから新しい向きへ光の扇が回り、光の頭が筋をたどって遠くまで走る */
function beam(fromIdx,toIdx){
  if(calm()||typeof G==='undefined'||!G||G.dawn||G.over) return;   // 動きを減らす：なぞらない（照らされたマスはいつもどおり出る）
  if(typeof lightOn==='function'&&!lightOn()) return;   // 0.36.0 中継灯を直すまでは光がない
  const L=RULES.light, N=typeof lightNow==='function'?lightNow():L, [ox,oy]=tileC(N.origin[0],N.origin[1]);   // 0.36.0 第2部は中継灯から
  add('beam',{ms:1100,ox,oy:oy-6,a0:fromIdx==null?N.beams[toIdx]:N.beams[fromIdx],a1:N.beams[toIdx],len:(typeof litFar==='function'?litFar():L.far)*TS,hw:L.halfWidth});   // 0.34.0 8章の煤で縮んだ遠さまで
}
function drawBeam(c,e,p){
  const sw=clamp01(p/0.35), tr=clamp01((p-0.25)/0.6), fade=p>0.8?(1-p)/0.2:1;
  const a=lerp(e.a0,e.a1,ease(sw))*Math.PI/180, hw=e.hw*Math.PI/180;
  c.save(); c.globalCompositeOperation='lighter';
  // 回る光の扇
  const g=c.createRadialGradient(e.ox,e.oy,4,e.ox,e.oy,e.len);
  g.addColorStop(0,`rgba(255,240,170,${0.42*fade})`); g.addColorStop(1,'rgba(255,230,150,0)');
  c.fillStyle=g; c.beginPath(); c.moveTo(e.ox,e.oy); c.arc(e.ox,e.oy,e.len,a-hw,a+hw); c.closePath(); c.fill();
  // 筋をたどる光の頭と、そのあとに残る線
  if(tr>0){
    const a1=e.a1*Math.PI/180, d=ease(tr)*e.len, cx=Math.cos(a1), cy=Math.sin(a1);
    const hx=e.ox+cx*d, hy=e.oy+cy*d, tail=Math.max(0,d-70);
    const lg=c.createLinearGradient(e.ox+cx*tail,e.oy+cy*tail,hx,hy);
    lg.addColorStop(0,'rgba(255,240,180,0)'); lg.addColorStop(1,`rgba(255,250,215,${0.9*fade})`);
    c.strokeStyle=lg; c.lineWidth=3; c.beginPath(); c.moveTo(e.ox+cx*tail,e.oy+cy*tail); c.lineTo(hx,hy); c.stroke();
    c.strokeStyle=`rgba(255,255,255,${0.8*fade})`; c.lineWidth=1; c.beginPath(); c.moveTo(e.ox+cx*Math.max(0,d-30),e.oy+cy*Math.max(0,d-30)); c.lineTo(hx,hy); c.stroke();
    c.fillStyle=`rgba(255,255,255,${fade})`; c.fillRect(Math.round(hx)-2,Math.round(hy)-2,5,5);
    c.fillStyle=`rgba(255,240,160,${0.7*fade})`; c.fillRect(Math.round(hx)-4,Math.round(hy),9,1); c.fillRect(Math.round(hx),Math.round(hy)-4,1,9);
  }
  c.restore();
}
/* 命中の光：白い芯→ふくらむ輪→8本の筋 */
function drawBurst(c,e,p){
  const r=2+ease(p)*(e.big?14:10), al=1-p;
  c.save(); c.globalCompositeOperation='lighter';
  if(p<0.3){ c.fillStyle=`rgba(255,255,255,${1-p/0.3})`; c.beginPath(); c.arc(e.x,e.y,e.big?7:5,0,7); c.fill(); }
  c.strokeStyle=`rgba(255,240,170,${al})`; c.lineWidth=2; c.beginPath(); c.arc(e.x,e.y,r,0,7); c.stroke();
  c.fillStyle=`rgba(255,250,220,${al})`;
  for(let i=0;i<8;i++){ const an=i*Math.PI/4+0.39, r1=r+2, r2=r+4+(i%2)*3; for(let s=r1;s<r2;s++) c.fillRect(Math.round(e.x+Math.cos(an)*s),Math.round(e.y+Math.sin(an)*s),1,1); }
  c.restore();
}
function drawGlow(c,e,p){
  const al=Math.sin(p*Math.PI);
  c.save(); c.globalCompositeOperation='lighter';
  const g=c.createRadialGradient(e.x,e.y,1,e.x,e.y,16); g.addColorStop(0,`rgba(255,220,240,${0.8*al})`); g.addColorStop(1,'rgba(255,200,230,0)');
  c.fillStyle=g; c.fillRect(e.x-16,e.y-16,32,32); c.restore();
}
function drawNum(c,e,p){
  const up=p<0.25?ease(p/0.25)*9:9+Math.sin(Math.min(1,(p-0.25)/0.2)*Math.PI)*-1.5;   // 少しはねて止まる
  c.globalAlpha=p>0.75?(1-p)/0.25:1; pixText(c,e.text,e.x,Math.round(e.y-up),1,e.col); c.globalAlpha=1;
}
function drawMap(c){
  if(!M.list.length) return; const t=now();
  for(const e of M.list){ const p=clamp01((t-e.t0)/e.ms);
    if(e.kind==='beam') drawBeam(c,e,p);
    else if(e.kind==='burst'){ if(!calm()) drawBurst(c,e,p); }
    else if(e.kind==='glow') drawGlow(c,e,p);
    else if(e.kind==='num') drawNum(c,e,p); }
}
/* 戦いの場面を「見ない」にしたときに、記録（REC）をマップの上で見せる。待たずに流す（操作は止めない） */
function mapRec(rec){
  let d=0;
  for(const ev of rec){
    const t=ev.t; if(!t) continue;
    setTimeout(()=>{
      const [x,y]=tileC(t.x,t.y);
      if(window.Sound) Sound.se(ev.k==='atk'?(ev.hit?(ev.crit?'crit':'hit'):'miss'):ev.ok?(ev.calm?'calm':ev.crit?'crit':'talkHit'):'miss');   // 0.15.0 場面を見ないときの効果音
      if(ev.k==='atk'){
        if(ev.hit){ add('burst',{ms:360,x,y:y-4,big:!!ev.down||!!ev.crit}); add('num',{ms:1000,x,y:y-10,text:ev.net?'止めた':'-'+ev.dmg,col:t.side==='enemy'?'#ffe060':'#ff8a7a'}); quake(ev.down||ev.crit?4:2.5,ev.down||ev.crit?380:260); }
        else add('num',{ms:900,x,y:y-10,text:'MISS',col:'#9ae0ff'});
      } else if(ev.ok){ add('glow',{ms:ev.calm?900:600,x,y:y-4}); add('num',{ms:1000,x,y:y-10,text:'-'+ev.v,col:'#ff9ad8'}); }
      if(ev.crit) add('num',{ms:1100,x,y:y-18,text:'CRITICAL!',col:'#ffd25a'});   // 0.7.0 クリティカル

    },d);
    d+=420;
  }
}

/* =========================================================
   カットイン
   ========================================================= */
const CI={on:false,skip:false,iv:0,prev:null,draw:null};
const css=`
#ci{position:fixed;inset:0;z-index:30;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:8px}
#ci.show{display:flex}
#cibox{width:min(100%,560px);background:#0b0e20;border:2px solid var(--key,#ffd25a);border-radius:10px;padding:6px}
#cic{display:block;width:100%;aspect-ratio:16/9;image-rendering:pixelated;border-radius:6px;background:#000}
#ciTx{min-height:3.3em;padding:6px 6px 2px;font-size:1.05rem;line-height:1.5}
#ciNm{display:block;font-size:.8rem;color:var(--key,#ffd25a)}
#ciNm.p{color:#ffb060}#ciNm.n{color:#cfd6f0}
#ciLn{font-weight:bold}
#ciSkip{font-size:.72rem;color:#aab;text-align:center}
@media (orientation:landscape) and (max-height:560px){
  #cibox{width:min(100%,900px);display:grid;grid-template-columns:1fr minmax(160px,240px);gap:0 8px;align-items:center}
  #cic{width:min(100%,calc((100dvh - 40px) * 1.78));grid-row:1 / 3}
  #ciTx{padding:4px}
}`;
function build(){
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  const d=document.createElement('div'); d.id='ci'; d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true'); d.setAttribute('aria-label','カットイン'); d.tabIndex=-1;
  d.innerHTML='<div id="cibox"><canvas id="cic" width="256" height="144"></canvas><div id="ciTx" aria-live="assertive"><b id="ciNm"></b><span id="ciLn"></span></div><div id="ciSkip">押すと次へ</div></div>';
  document.body.appendChild(d);
  if(window.Tap) Tap.bind(d,()=>{ CI.skip=true; },{silent:true});
}
if(document.body) build(); else document.addEventListener('DOMContentLoaded',build);

function open(){
  CI.on=true; CI.skip=false; CI.prev=document.activeElement;
  const box=$('ci'); box.classList.add('show'); try{ box.focus({preventScroll:true}); }catch(_){}
  CI.iv=setInterval(()=>{ if(CI.draw) CI.draw(now()); },33);
}
function close(){
  clearInterval(CI.iv); CI.iv=0; CI.draw=null; CI.on=false; CI.skip=false; $('ci').classList.remove('show'); line('','');
  if(window.BTL&&BTL.on){ try{ $('bt').focus({preventScroll:true}); }catch(_){} }
  else if(CI.prev&&document.contains(CI.prev)) try{ CI.prev.focus({preventScroll:true}); }catch(_){}
}
/* ひとつの「場」。ms たつか、押されたら終わる。fn(p,t) で毎コマ描く */
function beat(ms,fn){
  return new Promise(r=>{ CI.skip=false; const t0=now(), d=ms*fastK();
    CI.draw=t=>{ const p=clamp01((t-t0)/d); fn(p,t-t0); if(p>=1||CI.skip){ CI.draw=null; if(CI.skip) fn(1,d); r(); } };
    CI.draw(now()); });
}
function line(name,text,cls){ const n=$('ciNm'), l=$('ciLn'); if(!n) return; n.textContent=name; n.className=cls||''; l.textContent=text; }
/* 字を順に出す（動きを減らすでは一度に） */
function typed(text,p){ if(calm()) return text; const n=Math.ceil(clamp01(p/0.55)*text.length); return text.slice(0,n); }

/* 顔：ART.face(人,表情,0,口,向き)。向きは符号だけ（正＝右向き・負＝左向き） */
function faceCanvas(u,ex,talk,dir){
  if(!u) return null;
  const id=ART.FACE_ID&&ART.FACE_ID[u.name];
  if(u.kind==='person'&&u.sub!=='shadow'&&id) return ART.face(id,ex,0,talk,dir);
  return ART.portrait(u,ex,0,talk,dir);
}
function speaker(u){ if(u&&u.kind==='machine'&&u.seats&&u.seats[0]) return u.seats[0]; return u; }
const COLOR={'ノア':['#e8a040','#7a4a18'],'イネス':['#4fa0d0','#1c3e66']};

/* 帯（左から、または右から）に顔をのせて描く。p はすべり込みの進み、t は経った時間 */
function band(c,side,p,t,cols,face){
  const W=256, y0=30, y1=116, sk=26, slide=calm()?1:ease(clamp01(p));
  const off=(1-slide)*(side>0?-W:W);
  c.save(); c.translate(Math.round(off),0);
  c.beginPath(); c.moveTo(-10,y0+sk*0.3); c.lineTo(W+10,y0-sk*0.3+ (side>0?0:sk*0.6)); c.lineTo(W+10,y1-(side>0?sk*0.6:0)); c.lineTo(-10,y1); c.closePath();
  const g=c.createLinearGradient(0,y0,0,y1); g.addColorStop(0,cols[0]); g.addColorStop(1,cols[1]); c.fillStyle=g; c.fill();
  c.save(); c.clip();
  // 流れる線（動きを減らすでは止まったまま）
  for(let i=0;i<16;i++){ const yy=y0+4+((i*37)%(y1-y0-6)), len=18+(i*13)%40, sp=calm()?0:(t*0.45*(1+(i%3)*0.4));
    const xx=((i*71+sp)%(W+80))-40; const x=side>0?xx:W-xx-len; c.fillStyle=`rgba(255,255,255,${0.10+(i%4)*0.05})`; c.fillRect(Math.round(x),yy,len,1); }
  c.restore();
  c.strokeStyle='rgba(255,255,255,.85)'; c.lineWidth=2; c.stroke();
  if(face){ c.imageSmoothingEnabled=false; const fx=side>0?20:W-20-96; c.drawImage(face,0,0,face.width,face.height,fx,y1-96-2,96,96); }
  c.restore();
}
function skyNight(c,t){
  const g=c.createLinearGradient(0,0,0,144); g.addColorStop(0,'#0a1030'); g.addColorStop(1,'#1c2450'); c.fillStyle=g; c.fillRect(0,0,256,144);
  for(let i=0;i<30;i++){ const x=(i*97+13)%256, y=(i*53+7)%120, tw=calm()?0.6:0.45+0.35*Math.sin(t*0.004+i); c.fillStyle=`rgba(220,230,255,${tw})`; c.fillRect(x,y,1,1); }
}

/* ---------- 影を呼び戻したとき（毎回） ---------- */
const LINES={
  'ノア':['聞こえる？　灯は、ここにあるよ','大丈夫。こっちだよ','一緒に、灯台のほうへ帰ろう'],
  'イネス':['ずれてただけ。もう戻れるよ','こっち。灯の向き、合わせてある','大丈夫。わたしたちがいる'],
  '_':['こっちだよ','大丈夫。灯はここにある','一緒に帰ろう']};
const BACK=['……あったかい。灯が見える','……ここ、港だ。帰ってこられた','……ありがとう。もう歩ける'];
function wantsCutin(ev){ return typeof SET!=='undefined'&&SET.cutin!==false&&ev&&ev.k==='per'&&ev.ok&&ev.calm&&!ev.m; }
async function persuadeCutin(ev){
  if(!wantsCutin(ev)) return;
  const sp=speaker(ev.p), nm=sp?sp.name:ev.pn, i=Math.max(0,((typeof G!=='undefined'&&G.stats?G.stats.calm:1)-1))%3;
  const cols=COLOR[nm]||['#8a6ab0','#3a2a5a'], say=(LINES[nm]||LINES._)[i];
  const shadow=ART.tall?ART.tall(ev.t,'idle',0,true):null;   /* 0.51.0 カットインの影は今までの大きさ */
  open();
  const c=$('cic').getContext('2d'); c.imageSmoothingEnabled=false;
  // 1：呼びかける人の帯
  await beat(1500,(p,t)=>{
    skyNight(c,t);
    const talk=calm()?0:(p<0.6?(Math.floor(t/120)%2):0);
    band(c,1,p/0.25,t,cols,faceCanvas(sp,'resolve',talk,1));
    line(nm,'「'+typed(say,p)+'」','p');
  });
  // 2：影が白く輝いていく（0.6.1 ヒロさん「光の柱は要らない。影が白く輝いていく感じ」）
  // 影の姿のまま、すそから上へ白く染まり、まわりに白い光がにじむ。消えずに最後まで残る
  let sil=null, wsil=null;
  if(shadow){ sil=document.createElement('canvas'); sil.width=shadow.width; sil.height=shadow.height; const q=sil.getContext('2d');
    q.translate(sil.width,0); q.scale(-1,1); q.drawImage(shadow,0,0);   // 右側なので左向き
    wsil=document.createElement('canvas'); wsil.width=sil.width; wsil.height=sil.height; const w=wsil.getContext('2d');
    w.drawImage(sil,0,0); w.globalCompositeOperation='source-in'; w.fillStyle='#fffaf0'; w.fillRect(0,0,wsil.width,wsil.height); }
  await beat(1700,(p,t)=>{
    skyNight(c,t+1500);
    const cx=176, fy=124, wh=clamp01((p-0.05)/0.55), pulse=calm()?1:0.85+0.15*Math.sin(t*0.008);
    if(sil){
      const ax=shadow._cx!=null?sil.width-shadow._cx:sil.width/2, foot=shadow._foot!=null?shadow._foot:sil.height-2;
      const X=Math.round(cx-ax), Y=Math.round(fy-foot), Hs=sil.height;
      // まわりににじむ白い光（姿の形のまま、少しずらして重ねる）
      c.save(); c.globalCompositeOperation='lighter';
      const gl=0.22*ease(wh)*pulse;
      for(const [dx,dy] of [[-2,0],[2,0],[0,-2],[0,2],[-1,-1],[1,-1],[-1,1],[1,1],[-3,0],[3,0],[0,-3]]){ c.globalAlpha=gl; c.drawImage(wsil,X+dx,Y+dy); }
      c.globalAlpha=1;
      const g=c.createRadialGradient(cx,fy-Hs*0.5,2,cx,fy-Hs*0.5,Hs*0.8); g.addColorStop(0,`rgba(255,250,235,${0.35*ease(wh)*pulse})`); g.addColorStop(1,'rgba(255,250,235,0)');
      c.fillStyle=g; c.fillRect(cx-Hs,fy-Hs*1.4,Hs*2,Hs*1.6);
      c.restore();
      // 影の姿：すそから上へ白く染まる
      c.drawImage(sil,X,Y);
      const cut=Math.round(Hs*ease(wh));   // 下から白い部分の高さ
      if(cut>0) c.drawImage(wsil,0,Hs-cut,sil.width,cut,X,Y+Hs-cut,sil.width,cut);
    }
    // 霧のつぶが外へ散って、白い光のつぶに変わる（動きを減らすでは出さない）
    if(!calm()) for(let k=0;k<26;k++){ const a=k*0.97, r=8+ease(wh)*(30+(k%5)*8), x=cx+Math.cos(a)*r*0.9, y=fy-46+Math.sin(a)*r*0.8-wh*10;
      c.fillStyle=k%3?`rgba(120,90,150,${0.8*(1-wh)})`:`rgba(255,250,235,${0.9*(1-wh*0.6)})`; c.fillRect(Math.round(x),Math.round(y),2,2); }
    // 呼びかけた人は小さく左に（笑顔）
    const f=faceCanvas(sp,'smile',0,1); if(f){ c.drawImage(f,0,0,f.width,f.height,14,58,72,72); }
    if(p<0.5) line('','影が、白く輝いていく……','n'); else line('戻った人','「'+typed(BACK[i],(p-0.5)*2)+'」','n');
  });
  close();
}

/* ---------- 夜明け ---------- */
async function dawnCutin(){
  if(typeof SET!=='undefined'&&SET.cutin===false) return;
  const al=G.units.filter(u=>u.side==='ally'&&u.kind==='person');
  const noa=al.find(u=>u.name==='ノア'), ines=al.find(u=>u.name==='イネス');
  const resting=G.units.some(u=>u.side==='ally'&&(u.out==='ryoyo'||u.out==='seibi'));
  open();
  const c=$('cic').getContext('2d'); c.imageSmoothingEnabled=false;
  const R=ART.RAMP||{};
  const scene=(p,t)=>{   // p：夜（0）→朝（1）
    const sky=c.createLinearGradient(0,0,0,96);
    const top=[lerp(10,90,p),lerp(16,120,p),lerp(48,190,p)], bot=[lerp(30,250,p),lerp(36,190,p),lerp(80,130,p)];
    sky.addColorStop(0,`rgb(${top.map(v=>v|0)})`); sky.addColorStop(1,`rgb(${bot.map(v=>v|0)})`); c.fillStyle=sky; c.fillRect(0,0,256,96);
    for(let i=0;i<30;i++){ const x=(i*97+13)%256, y=(i*53+7)%80; c.fillStyle=`rgba(230,235,255,${0.7*(1-p)})`; c.fillRect(x,y,1,1); }
    // 日：水平線から上る
    const sy=lerp(108,74,ease(p)), sx=168;
    c.save(); c.globalCompositeOperation='lighter';
    const hg=c.createRadialGradient(sx,sy,4,sx,sy,90); hg.addColorStop(0,`rgba(255,210,140,${0.75*p})`); hg.addColorStop(1,'rgba(255,170,100,0)'); c.fillStyle=hg; c.fillRect(0,0,256,96);
    c.restore();
    c.save(); c.beginPath(); c.rect(0,0,256,96); c.clip(); c.fillStyle='#fff2c8'; c.beginPath(); c.arc(sx,sy,14,0,7); c.fill(); c.fillStyle='#ffd890'; c.beginPath(); c.arc(sx,sy,14,0.2,Math.PI-0.2); c.fill(); c.restore();
    // 海
    for(let y=96;y<144;y++){ const d=(y-96)/48; c.fillStyle=`rgb(${lerp(lerp(16,60,d),lerp(150,40,d),p)|0},${lerp(lerp(30,50,d),lerp(130,70,d),p)|0},${lerp(lerp(70,90,d),lerp(150,110,d),p)|0})`; c.fillRect(0,y,256,1); }
    // 日の道（水面の光）。動きを減らすでは、ちらつかない
    for(let y=98;y<144;y+=2){ const w=6+(y-96)*0.5, sh=calm()?0:wob(t*0.5,y)*3; c.fillStyle=`rgba(255,226,160,${0.55*p*(1-(y-96)/60)})`; c.fillRect(Math.round(sx-w/2+sh),y,Math.round(w),1); }
    // 灯台（左の岬）。光は朝になると消えていく
    c.fillStyle=`rgb(${lerp(20,60,p)|0},${lerp(22,52,p)|0},${lerp(40,70,p)|0})`; c.beginPath(); c.moveTo(0,104); c.lineTo(70,104); c.lineTo(52,96); c.lineTo(0,92); c.fill();
    c.fillStyle=`rgb(${lerp(200,240,p)|0},${lerp(200,232,p)|0},${lerp(210,220,p)|0})`; c.fillRect(26,52,10,44); c.fillStyle='#b8423a'; c.fillRect(26,64,10,6); c.fillRect(26,80,10,6);
    c.fillStyle='#2a2a3a'; c.fillRect(24,46,14,6); c.fillRect(28,40,6,6);
    const lamp=1-p; c.fillStyle=`rgba(255,236,150,${0.4+0.6*lamp})`; c.fillRect(28,47,6,4);
    if(lamp>0.02){ c.save(); c.globalCompositeOperation='lighter'; const a=calm()?-0.15:-0.15+Math.sin(t*0.0015)*0.12;
      const bg=c.createLinearGradient(31,49,200,49); bg.addColorStop(0,`rgba(255,240,170,${0.6*lamp})`); bg.addColorStop(1,'rgba(255,240,170,0)'); c.fillStyle=bg;
      c.beginPath(); c.moveTo(31,49); c.lineTo(31+Math.cos(a-0.1)*200,49+Math.sin(a-0.1)*200); c.lineTo(31+Math.cos(a+0.1)*200,49+Math.sin(a+0.1)*200); c.fill(); c.restore(); }
    // 霧が右へ流れて晴れていく
    for(let i=0;i<9;i++){ const drift=calm()?p*60:p*120+t*0.01, x=((i*53)%256)+drift, y=70+(i*11)%40; c.fillStyle=`rgba(190,196,220,${0.32*(1-p)})`; c.beginPath(); c.ellipse(x,y,26+(i%3)*8,6,0,0,7); c.fill(); }
  };
  // 1：夜が明ける
  await beat(2400,(p,t)=>{ scene(ease(p),t); if(p>0.35) line('','夜が明けた','n'); else line('',''); });
  // 2：ノア（左から・右向き）
  const say1='……夜が、明けた';
  if(noa) await beat(1800,(p,t)=>{ scene(1,t+2400); band(c,1,p/0.25,t,COLOR['ノア'],faceCanvas(noa,'smile',calm()?0:(p<0.5?Math.floor(t/120)%2:0),1)); line('ノア','「'+typed(say1,p)+'」','p'); });
  // 3：イネス（右から・左向き）
  const say2=resting?'休むのも番のうち。みんな、朝まで来たよ':'みんなの灯、ちゃんと朝まで残ったね';
  if(ines) await beat(2000,(p,t)=>{ scene(1,t+4200); band(c,-1,p/0.25,t,COLOR['イネス'],faceCanvas(ines,'smile',calm()?0:(p<0.5?Math.floor(t/120)%2:0),-1)); line('イネス','「'+typed(say2,p)+'」','p'); });
  close();
}
/* 戦いの場面を見ないとき：カットインだけ順に */
async function cutinsFor(rec){ for(const ev of rec) if(wantsCutin(ev)) await persuadeCutin(ev); }

window.FX={drawMap,beam,mapRec,quake,persuadeCutin,dawnCutin,cutinsFor,wantsCutin,
  get ciOn(){ return CI.on; }, skip(){ if(CI.on) CI.skip=true; }};
})();
