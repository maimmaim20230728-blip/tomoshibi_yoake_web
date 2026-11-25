/* 灯守りの夜明け 戦いの場面（版 0.21.0・2026-11-07。0.21.0 で攻撃方法ごとのモーション（杖・スパナの弧、棒術の三段、竿の糸、手拍子の音の輪、霧の手、体当たり・急降下・跳ねる、羽ばたきの風、つつき、つかむ・持ち上げ投げ・たたきつけ、放水・霧吹き・しずく・泡、音波・子守歌、照射の光線、針・ボルト・部品、ワイヤー、網、突風・竜巻、灯の粒・結界）。版 0.18.0・2026-11-07。0.18.0 で1.5倍ゆっくり・説得は心の光が相手を包んで味方へ戻る・戦いの曲（攻撃／説得）。版 0.7.0・2026-11-06。0.7.0 でクリティカル：数字の上に「CRITICAL!」・字を大きく・強いゆれと白い光。説得のクリティカルも同じ。0.6.1 で空の明るさをマップの夜の深さ（dawnProgress）にそろえた。0.6.0 でエフェクトを足した：場面全体のゆれ・命中の光の輪・数字が少しはねる（大きいダメージは大きい字）・影を呼び戻すとカットイン（fx.js）。前からある数字・MISS・白く光ってゆれる・手に入れた物は作り直さず、そのまま使う。0.5.9 で顔をリアル寄りに。0.5.8 でみんな斜めに描いた顔（角度は人ごと）。0.5.7 でノアは斜めに描いた顔（右向きと左右反転）。0.5.4 で人を7頭身ほどの立ち絵に・打つ／受ける構え。0.5.5 で機械も同じ細かさの立ち絵に。0.5.6 で顔は相手のほうを斜めに向き、まばたきをやめた）
   ルールの計算はしない。index.html の doAttack・persuade が残した記録（REC）を、あとから見せるだけ。
   ・左に霧の側、右に味方。顔グラ（ない相手は絵の胸から上）と、耐久・闇の心の数字と棒
   ・当たった：白く光ってゆれる・数字が上がる・棒が減る。外れた：よける・「MISS」
   ・倒した・呼び戻した：光って消える。最後に「手に入れた物」（経験値・レベル・部品・宝石・灯のかけら）
   ・押す・Enter・Esc・戻るで早送り（もう一度で閉じる）。「動きを減らす」では、動きなしで結果を順に出す
   ・設定の「戦いの場面」をオフ、または霧の側の早送り中は出さない */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const CW=256,CH=144, LX=72, RX=184, FY=112;
const BT={on:false,skip:false,S:null,iv:0,prevFocus:null,f:0};
const FONT={'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],'3':['111','001','111','001','111'],
  '4':['101','101','111','001','001'],'5':['111','100','111','001','111'],'6':['111','100','111','101','111'],'7':['111','001','010','010','010'],
  '8':['111','101','111','101','111'],'9':['111','101','111','001','111'],'-':['000','000','111','000','000'],'+':['000','010','111','010','000'],
  'M':['10001','11011','10101','10001','10001'],'I':['111','010','010','010','111'],'S':['111','100','111','001','111'],
  'C':['111','100','100','100','111'],'R':['110','101','110','101','101'],'T':['111','010','010','010','010'],'A':['010','101','111','101','101'],'L':['100','100','100','100','111'],'!':['1','1','1','0','1']};
function textW(s,k){ let w=-1; for(const ch of s) w+=((FONT[ch]?FONT[ch][0].length:3)+1); return w*k; }
function pixText(c,s,x,y,k,col){
  const x0=Math.round(x-textW(s,k)/2);
  for(const pass of [0,1]){ let px=x0;
    for(const ch of s){ const f=FONT[ch]; if(!f){ px+=4*k; continue; }
      for(let r=0;r<5;r++)for(let q=0;q<f[r].length;q++){ if(f[r][q]!=='1') continue;
        if(pass===0){ c.fillStyle='#1a0a14'; c.fillRect(px+q*k-1,y+r*k-1,k+2,k+2); }
        else { c.fillStyle=col; c.fillRect(px+q*k,y+r*k,k,k); if(r===0||f[r-1][q]!=='1'){ c.fillStyle='rgba(255,255,255,.55)'; c.fillRect(px+q*k,y+r*k,k,1); } } }
      px+=(f[0].length+1)*k; } }
}
const now=()=>performance.now();
const lerp=(a,b,p)=>a+(b-a)*p, ease=p=>1-(1-p)*(1-p);
function k(){ return 1.5/(typeof btSpd==='function'?btSpd():1); }   /* 0.94.0 設定の「戦いの場面の速さ」（0.25倍〜3倍）で割る */   // 0.18.0 戦いの場面を1.5倍ゆっくり（11/7 ヒロさん「1.5倍くらい」）
function calm(){ return typeof isCalm==='function'&&isCalm(); }
function wait(ms){ return new Promise(r=>{ if(BT.skip) return r(); const end=now()+ms*k(); const f=()=>{ if(BT.skip||now()>=end) r(); else setTimeout(f,16); }; setTimeout(f,16); }); }
function tween(ms,fn,motion){ return new Promise(r=>{ if(BT.skip||(motion&&calm())){ fn(1); return r(); } const t0=now(),d=ms*k();
  const f=()=>{ const p=BT.skip?1:Math.min(1,(now()-t0)/d); fn(p); if(p>=1) r(); else setTimeout(f,16); }; f(); }); }

/* 顔：ノア・イネスは顔グラ。機械は前の席の人の顔（いなければ機械の絵）。ほかは絵の胸から上 */
function faceUnit(u){ if(u&&u.kind==='machine'&&u.side==='ally'&&u.seats&&u.seats[0]) return u.seats[0]; return u; }
const URLC=new WeakMap();
function url(cv){ let s=URLC.get(cv); if(!s){ s=cv.toDataURL(); URLC.set(cv,s); } return s; }
function faceURL(u,ex,blink,talk,yaw,pitch){ return url(ART.portrait(faceUnit(u),ex,blink,talk,yaw,pitch)); }
window.faceURL=faceURL;

function sideState(u,snap){
  const s=snap.units.get(u)||{name:u.name,hp:u.hp,maxHp:u.maxHp,mp:u.mp,maxMp:u.maxMp,ep:u.ep,maxEp:u.maxEp,lv:u.lv};
  const ep=s.maxMp==null&&s.maxEp!=null;   /* 0.95.0 味方の機械は EP を同じ棒で見せる（11/22 ヒロさん「戦闘画面でこちらのEPバーが無い」） */
  return {u,name:s.name,lv:s.lv,hp:s.hp,maxHp:s.maxHp,mp:ep?s.ep:s.mp,maxMp:ep?s.maxEp:s.maxMp,off:0,dy:0,fl:0,sh:0,alpha:1,glow:0,white:0,expr:'normal',talk:0,_key:''};
}
function plate(el,P){
  const isM=P.u.kind==='machine', fu=P.faceU||faceUnit(P.u), sub=P.faceU?`<small>${fu.name}が乗ったまま</small>`:isM&&fu!==P.u?`<small>${fu.name}が操縦</small>`:'';
  el.innerHTML=`<img class="bpf" alt=""><div class="bpt"><b class="${P.u.side==='enemy'?'e':isM?'m':'p'}">${P.name}</b>${P.lv!=null?` <small>Lv${P.lv}</small>`:''}${sub}`+
    `<div class="bbar"><i class="hpb"></i></div><div class="bnum"><span>耐久</span> <b class="hpn"></b></div>`+
    (P.maxMp!=null?`<div class="bbar"><i class="mpb${P.u.side==='ally'?' epb':''}"></i></div><div class="bnum"><span>${typeof resName==='function'?resName(P.u):'闇の心'}</span> <b class="mpn"></b></div>`:'')+`</div>`;
  P.el=el; P._key='';
}
function updPlate(P){
  if(!P.el) return;
  const hb=P.el.querySelector('.hpb'), r=Math.max(0,P.hp)/P.maxHp; hb.style.width=(100*r)+'%'; hb.style.background=P.u.side==='enemy'?'#f06a5a':(r<0.35?'#f0c040':'#5cd46a');
  P.el.querySelector('.hpn').textContent=`${Math.max(0,Math.round(P.hp))} / ${P.maxHp}`;
  if(P.maxMp!=null){ P.el.querySelector('.mpb').style.width=(100*Math.max(0,P.mp)/P.maxMp)+'%'; P.el.querySelector('.mpn').textContent=`${Math.max(0,Math.round(P.mp))} / ${P.maxMp}`; }
  // 0.5.6：まばたきはやめ、顔は相手のほうを斜めに向く（左の人は右へ、右の人は左へ）
  const yaw=P===BT.S.L?2:-2, key=P.expr+'|'+P.talk;
  if(key!==P._key){ P._key=key; P.el.querySelector('.bpf').src=faceURL(P.faceU||P.u,P.expr,0,P.talk,yaw); }   // 0.27.0 faceU＝乗ったまま声を出す人
}

/* ---------- 場面を描く ---------- */
const STARS=[]; for(let i=0;i<34;i++) STARS.push([(i*97+13)%CW,(i*53+7)%56,i%3]);
function terrAt(u){ try{ return terrain(u.x,u.y); }catch(_){ return '.'; } }
/* 0.5.4：人は7頭身ほどの立ち絵（ART.tall・顔は描かない）。味方は右にいるので左右を返す。機械は今までの絵を5倍 */
const TALL_CX=18;   // 立ち絵の中で体のまん中にあたる列（右向き）
/* 0.51.0 人は ART.PSC だけ小さい（11/10 ヒロさん「機械との差の少なさが気になる」）。走る構えは足を速く入れかえる */
const PS=(window.ART&&ART.PSC)||1;
function sprite(P,frame){
  if(P.pose==='run') frame=((now()/110)|0)&1;
  const hd=P.u.kind==='person', tall=ART.tall&&ART.tall(P.u,P.pose||'idle',frame,hd?PS*2:undefined), W=tall?tall.width:16, H=tall?tall.height:24;   /* 0.83.0 人は倍の細かさで描いて半分の大きさで置く（11/15 ヒロさん「戦闘シーンの人間もよりハイクオリティに」） */
  const t=document.createElement('canvas'); t.width=W; t.height=H; const c=t.getContext('2d');
  if(tall){ if(P===BT.S.R){ c.translate(W,0); c.scale(-1,1); } c.drawImage(tall,0,0); c.setTransform(1,0,0,1,0,0); }
  else { const s=ART.tick; ART.tick=frame*2; ART.drawUnit(c,P.u,0,0,{active:true,calm:false}); ART.tick=s; }
  if(P.white>0){ c.globalCompositeOperation='source-atop'; c.fillStyle=`rgba(255,255,255,${P.white})`; c.fillRect(0,0,W,H); }
  t._tall=!!tall; t._k=hd&&tall?2:1; if(tall){ t._cx=tall._cx; t._foot=tall._foot; } return t;
}
function drawScene(){
  const S=BT.S; if(!S) return; const c=$('btc').getContext('2d'); c.imageSmoothingEnabled=false; c.setTransform(2,0,0,2,0,0);   /* 0.83.0 画面は 512×288。絵は今までの 256×144 の座標で描く */
  const R=ART.RAMP, dawn=G.dawn||G.day, tt=dawn?1:(typeof dawnProgress==='function'?dawnProgress():(G.turn-1)/Math.max(1,G.maxTurn-1));   // 0.6.1 マップと同じ夜の深さ
  // 0.6.0 場面全体のゆれ（乱数は使わず時刻から。動きを減らすでは止める）
  const qt=now(), qa=(S.qk>0&&!calm())?S.qk:0;
  c.save(); if(qa){ c.fillStyle='#000'; c.fillRect(0,0,CW,CH); c.translate(Math.round((Math.sin(qt*0.09)*0.6+Math.sin(qt*0.17)*0.4)*qa),Math.round((Math.sin(qt*0.11+2)*0.6+Math.sin(qt*0.21)*0.4)*qa*0.6)); }
  // 空（夜から夜明けへ）
  const g=c.createLinearGradient(0,0,0,70); g.addColorStop(0,dawn?'#5a6ab0':`rgb(${8+30*tt|0},${12+26*tt|0},${40+40*tt|0})`); g.addColorStop(1,dawn?'#f8c080':`rgb(${30+70*tt|0},${36+40*tt|0},${80+30*tt|0})`);
  c.fillStyle=g; c.fillRect(0,0,CW,70);
  if(!dawn) for(const [x,y,b] of STARS){ c.fillStyle=(BT.f+b)%5===0?'#ffffff':'rgba(220,230,255,.6)'; c.fillRect(x,y,1,1); }
  // 遠く：森なら木の列、ほかは海
  const terr=S.terr;
  if(terr==='T'){ for(let x=-8;x<CW+8;x+=11){ const h=10+((x*7)%9); c.fillStyle='#1c3a2c'; c.beginPath(); c.arc(x,70-h*0.4,h*0.7,0,7); c.fill(); c.fillStyle='#2a5038'; c.fillRect(x-1,62,3,10); } c.fillStyle='#1c3a2c'; c.fillRect(0,66,CW,8); }
  else { for(let y=58;y<74;y++){ c.fillStyle=y<62?R.sea[3]:y<67?R.sea[2]:R.sea[1]; c.fillRect(0,y,CW,1); }
    for(let i=0;i<14;i++){ const x=(i*41+BT.f*3)%(CW+20)-10, y=60+(i*5)%12; c.fillStyle='rgba(240,250,255,.7)'; c.fillRect(x,y,4+(i%3)*2,1); } }
  // 地面
  const gr=terr==='T'?R.floor:terr==='H'?R.stone:R.grass;
  for(let y=72;y<CH;y++){ const d=(y-72)/(CH-72); c.fillStyle=gr[d<0.15?3:d<0.45?2:1]; c.fillRect(0,y,CW,1); }
  for(let i=0;i<60;i++){ const x=(i*67+11)%CW, y=76+(i*29)%64; c.fillStyle=gr[i%2?0:3]; c.fillRect(x,y,i%3?1:2,1); if(terr!=='H'&&i%4===0){ c.fillRect(x+1,y-1,1,1); } }
  // 足場（だ円）
  for(const x of [LX,RX]){ c.fillStyle='rgba(10,8,20,.35)'; c.beginPath(); c.ellipse(x,FY,36,8,0,0,7); c.fill(); c.fillStyle=gr[2]; c.beginPath(); c.ellipse(x,FY-1,32,6,0,0,7); c.fill(); c.fillStyle=gr[0]; c.fillRect(x-20,FY-6,40,1); }
  /* 0.99.5 機械の威力の高い攻撃：まわりを暗くする。2段は、技を出す側の後ろへ流れる線も（人より奥に描く） */
  if(S.dim>0){ c.fillStyle=`rgba(4,6,22,${S.dim})`; c.fillRect(-8,-8,CW+16,CH+16);
    if(S.big&&S.big.lv>1&&!calm()){ const B=S.big, tq=now()-B.t0, W2=CW+80; for(let i=0;i<18;i++){ const y=4+((i*37)%132), len=18+(i*13)%44, x=(((i*71-tq*0.5*B.d)%W2)+W2)%W2-40;
      c.fillStyle=`rgba(${B.col},${(0.22+0.2*(i%3===0))*S.dim/0.62})`; c.fillRect(Math.round(x),y,len,i%4?1:2); } } }
  // 人
  for(const P of [S.L,S.R]){ if(P.alpha<=0) continue;
    const sx=(P.sh>0&&!calm())?Math.round((Math.random()*2-1)*3*P.sh):0;
    const sp=sprite(P,BT.f), mid=Math.round((P===S.L?LX:RX)+P.off+sx), dy=Math.round(P.dy);
    c.globalAlpha=P.alpha;
    if(sp._tall){ const k2=sp._k||1, cx0=sp._cx!=null?sp._cx:TALL_CX, ax=P===S.R?sp.width-cx0:cx0; c.drawImage(sp,mid-ax/k2,FY+2-(sp._foot!=null?sp._foot:78)/k2+dy,sp.width/k2,sp.height/k2); }
    else if(P.u.kind==='machine') c.drawImage(sp,0,0,16,24,mid-40,FY+2-23*5+dy,80,120);   // 機械は5倍（11/5 ヒロさん「機械を少し大きめに」・人の立ち絵より3割ほど高い）
    else c.drawImage(sp,0,0,16,24,mid-24,FY-68+dy,48,72);   // 立ち絵のまだ無い人は今までどおり3倍
    c.globalAlpha=1;
    const gx=mid, gy=FY-32+dy;
    if(P.glow>0){ const gc=P.gcol||'255,220,140'; c.globalCompositeOperation='lighter'; const rg=c.createRadialGradient(gx,gy,2,gx,gy,46); rg.addColorStop(0,`rgba(${gc},${0.8*P.glow})`); rg.addColorStop(1,`rgba(${gc},0)`);   /* 0.99.5 gcol＝大技のときの属性の色 */ c.fillStyle=rg; c.fillRect(gx-48,gy-48,96,96); c.globalCompositeOperation='source-over'; } }
  // 当たった印・光の粒
  for(const h of S.fx){ const p=(now()-h.t0)/(h.ms*k()); if(p>1||p<0) continue;
    if(h.draw){ c.save(); h.draw(c,p); c.restore(); }   // 0.21.0 攻撃方法ごとの絵
    else if(h.kind==='slash'){ c.strokeStyle=`rgba(255,250,210,${1-p})`; c.lineWidth=2; for(let i=-1;i<=1;i++){ c.beginPath(); c.moveTo(h.x-18+i*9,h.y-22); c.lineTo(h.x-18+i*9+36*Math.min(1,p*3),h.y-22+40*Math.min(1,p*3)); c.stroke(); } }
    else if(h.kind==='spark'){ for(let i=0;i<10;i++){ const a=i*0.63, r=6+p*22; c.fillStyle=i%2?'#fff4a0':'#ffffff'; c.fillRect(Math.round(h.x+Math.cos(a)*r),Math.round(h.y+Math.sin(a)*r),2,2); } }
    else if(h.kind==='shot'){ const x=lerp(h.x,h.x2,ease(p)), y=lerp(h.y,h.y2,ease(p))-Math.sin(p*Math.PI)*14; c.fillStyle='#fff8c0'; c.fillRect(Math.round(x)-2,Math.round(y)-2,5,5); c.fillStyle='#ffd25a'; c.fillRect(Math.round(x)-1,Math.round(y)-1,3,3); }
    else if(h.kind==='burst'){ if(calm()) continue;   // 0.6.0 命中の光：白い芯→ふくらむ輪→8本の筋
      c.save(); c.globalCompositeOperation='lighter'; const r=3+ease(p)*(h.big?30:22);
      if(p<0.3){ c.fillStyle=`rgba(255,255,255,${1-p/0.3})`; c.beginPath(); c.arc(h.x,h.y,h.big?14:10,0,7); c.fill(); }
      c.strokeStyle=`rgba(255,236,160,${1-p})`; c.lineWidth=3; c.beginPath(); c.arc(h.x,h.y,r,0,7); c.stroke();
      c.fillStyle=`rgba(255,250,220,${1-p})`; for(let i=0;i<8;i++){ const a=i*Math.PI/4+0.39; for(let s=r+3;s<r+8+(i%2)*5;s++) c.fillRect(Math.round(h.x+Math.cos(a)*s)-1,Math.round(h.y+Math.sin(a)*s)-1,2,2); }
      c.restore(); }
    else if(h.kind==='orb'){ for(let i=0;i<5;i++){ const q=Math.min(1,Math.max(0,p*1.4-i*0.1)); const x=lerp(h.x,h.x2,q), y=lerp(h.y,h.y2,q)-Math.sin(q*Math.PI)*(10+i*4); c.fillStyle=i%2?'#ffd8f0':'#fff2b0'; c.fillRect(Math.round(x)-1,Math.round(y)-1,3,3); } } }
  // 数字：0.6.0 で少しはねてから止まる（動きを減らすでは、はねずにまっすぐ上がる）
  for(const p of S.pops){ const q=(now()-p.t0)/(900*k()); if(q>1.4) continue;
    const rise=Math.min(1,q*2.5)*12, hop=(!calm()&&q>0.4&&q<0.7)?Math.sin((q-0.4)/0.3*Math.PI)*3:0;
    const y=Math.round(p.y-rise-hop); c.globalAlpha=q>1?Math.max(0,1.4-q)/0.4:1; pixText(c,p.text,p.x,y,p.k||3,p.col); c.globalAlpha=1; }
  // 0.18.0 説得の心の光（やわらかい光の玉と、まわりをめぐる粒）
  if(S.lt&&S.lt.a>0&&S.lt.r>0.5){ const L=S.lt; c.save(); c.globalCompositeOperation='lighter';
    const rg=c.createRadialGradient(L.x,L.y,0,L.x,L.y,L.r); rg.addColorStop(0,`rgba(255,244,210,${0.9*L.a})`); rg.addColorStop(0.45,`rgba(255,200,232,${0.5*L.a})`); rg.addColorStop(1,'rgba(255,190,225,0)');
    c.fillStyle=rg; c.beginPath(); c.arc(L.x,L.y,L.r,0,7); c.fill();
    if(!calm()) for(let i=0;i<12;i++){ const an=i*0.5236+qt*0.0016*(i%2?1:-1), rr=L.r*(0.5+0.4*((i*7)%10)/10); c.fillStyle=i%2?`rgba(255,250,225,${L.a})`:`rgba(255,215,240,${L.a})`; c.fillRect(Math.round(L.x+Math.cos(an)*rr),Math.round(L.y+Math.sin(an)*rr*0.85),2,2); }
    c.restore(); }
  c.restore();
  /* 0.99.5 機械の威力60以上の攻撃の名前の帯（技を出す側から流れ込む） */
  if(S.big&&S.big.lv>1){ const B=S.big, q=(now()-B.t0)/(1150*k()); if(q<1.2){ const inn=calm()?1:ease(clamp01(q*4)), out=q>0.9?Math.max(0,1-(q-0.9)/0.3):1, ox=Math.round((1-inn)*(B.side==='R'?CW:-CW));
    c.save(); c.globalAlpha=out; c.fillStyle='rgba(8,10,30,.88)'; c.beginPath(); c.moveTo(ox,14); c.lineTo(ox+CW,8); c.lineTo(ox+CW,32); c.lineTo(ox,38); c.closePath(); c.fill();
    c.fillStyle=`rgb(${B.col})`; c.beginPath(); c.moveTo(ox,13); c.lineTo(ox+CW,7); c.lineTo(ox+CW,9); c.lineTo(ox,15); c.closePath(); c.fill(); c.beginPath(); c.moveTo(ox,37); c.lineTo(ox+CW,31); c.lineTo(ox+CW,33); c.lineTo(ox,39); c.closePath(); c.fill();
    c.font='bold 14px sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.lineJoin='round'; c.lineWidth=4; c.strokeStyle=`rgb(${B.col})`; c.strokeText(B.name+'！',CW/2+ox,23); c.fillStyle='#ffffff'; c.fillText(B.name+'！',CW/2+ox,23);
    c.restore(); } }
  if(S.flash>0){ c.fillStyle=`rgba(255,255,255,${S.flash})`; c.fillRect(0,0,CW,CH); }   /* 0.99.5 威力60以上が当たったときの白い光 */
  if(S.scr>0){ c.fillStyle=`rgba(255,255,255,${S.scr})`; c.fillRect(0,0,CW,CH); }
  updPlate(S.L); updPlate(S.R);
}

/* ---------- 記録を順に見せる ---------- */
function say(s){ $('btMsg').textContent=s; }
function sideOf(u){ const S=BT.S; return S.L.u===u?S.L:S.R.u===u?S.R:null; }
function cx(P){ return (P===BT.S.L?LX:RX)+P.off; }
function fx(kind,x,y,ms,o){ BT.S.fx.push(Object.assign({kind,x,y,ms,t0:now()},o||{})); }
function pop(P,text,col,kk,dy){ BT.S.pops.push({x:cx(P),y:FY-(isM(P)?80:Math.round(80*PS))+(dy||0),text,col,t0:now(),k:kk}); }   /* 0.51.0 小さい人は数字も低く */
/* 0.7.0 クリティカルの印（数字の上に CRITICAL!・強めのゆれと白い光） */
function critMark(T){ pop(T,'CRITICAL!','#ffd25a',2,-22); quake(5,460); fx('burst',cx(T),FY-40,520,{big:true}); }
/* 0.15.0 効果音（sound.js）。乱数は使わない */
function sfx(n){ if(window.Sound) Sound.se(n); }
/* 0.6.0 場面全体のゆれ（amp ドット、ms で弱まる） */
function quake(amp,ms){ if(calm()) return; const S=BT.S; tween(ms,p=>{ if(BT.S===S) S.qk=amp*(1-p); },false); }
function hasFace(P){ const u=P.faceU||faceUnit(P.u); return u.kind==='person'&&(u.name==='ノア'||u.name==='イネス'); }
function ex(P,e){ if(hasFace(P)) P.expr=e; }
/* ---------- 0.21.0 攻撃方法ごとのモーション ----------
   11/7 ヒロさん「攻撃のモーションが少なすぎる。攻撃方法に合わせたものを作って。全てが体当たりと白い球を発射では悲し過ぎる」。
   攻撃の名前から動きの型を決める（ない名前は属性と距離で）。型ごとに「近づく・放つ」と「当たったときの印」を描く。
   計算はしない（記録を見せるだけ）。乱数は使わない（ばらつきは番号から作る）。「動きを減らす」では体は動かさず、印だけ出す */
const MO={
  '杖':'staff','灯の杖':'staff','工具アーム':'swing','アーム':'swing','傘払い':'swing','櫂':'oar',
  '棒術':'combo','竿':'rod','手拍子':'clap','打ち返し':'shield','はね返し板':'shield',
  '霧の手':'claw','霧のつぶて':'mist',
  '体当たり':'dash','突進':'dash','押し込み':'dash','急降下':'dive','跳ねる':'hop','蹴り上げ':'kick',
  '羽ばたき払い':'flap','羽ばたき':'flap','急旋回':'turn','つつき':'peck',   /* 0.100.1 急旋回は turn */
  '持ち上げ投げ':'lift','救助アーム':'grab','締め上げ':'grab','錨打ち':'smash','岩崩し':'smash',
  '放水':'jet','水鉄砲':'jet','水圧砲':'jetBig','高圧水':'jetBig','散水':'spray','波しぶき':'spray','泡の雨':'spray',
  'しずく砲':'drop','大しずく':'drop','泡':'bubble','大泡':'bubble',
  '鐘槌':'smash','鐘の響き':'sound',   /* 0.52.0 16章の鐘番 */
  '音波':'sound','共鳴':'sound','空からの声':'sound','子守歌':'lullaby',
  '照射':'beam','集光':'beamBig','灯線':'beam','大灯線':'beamBig','夜目の光':'beamBlue',
  '灯の針':'needle','夜の矢':'needleBlue','針飛ばし':'needleMetal','ボルト撃ち':'needleMetal','部品とばし':'gears',
  'ワイヤー':'wire','鉤づめ':'wire','捕獲網':'net','投げ網':'net','突風':'wind','そよ風':'wind','竜巻':'tornado',
  '灯の粒':'orb','灯の玉':'orb','灯の結界':'ring',
  /* 0.51.0 人ごと・職業ごとの動き（11/10 ヒロさん「人か職業で動きが違うくらいだといいね」）。
     機械いじり＝スパナを投げて受け取る・こぶしの連打と突き上げ。配達人＝走って跳びげり・かばんを回して打つ。牧人＝石投げひもを回す・牧杖で引っかける。
     薬草摘み＝跳んですりこぎ・薬草をまく。料理番＝お玉で熱いスープ・鉄べらですくい上げる。旅人のジュン＝ふっと消えて目の前に出る */
  'スパナ':'wrench','こぶし':'punch','蹴り':'flyKick','かばん':'bag','つぶて':'sling','牧杖':'hook',
  'すりこぎ':'pestle','草かご':'herbs','お玉':'ladle','鉄べら':'flip','旅の杖':'vanish','記録帳':'bag','ランタン':'staff','道しるべ':'staff','扇':'staff'};   /* 0.57.0 20章 リンの扇は、杖と同じ弧を描く振り方（仮） */   /* 0.56.0 19章 ゾエの道しるべ（先が矢印の板の杖）は、杖と同じ振り方（仮） */   /* 0.53.0 ミレイユの記録帳は、かばんと同じ振り方（仮） */
function motionOf(ev,A){
  const n=ev.w&&ev.w.n, e=(ev.w&&ev.w.e)||A.u.elem, far=ev.dist>1;
  if(n==='霧吹き') return A.u.sub==='shadow'?'mist':'spray';   // ミズハの霧吹きと、霧吹きの影
  if(MO[n]) return MO[n];
  if(e==='水') return far?'jet':'spray'; if(e==='光') return 'beam'; if(e==='音') return 'sound'; if(e==='網') return 'net';
  return far?'needleMetal':isM(A)?'dash':'swing';
}
function dirOf(P){ return P===BT.S.L?1:-1; }
function isM(P){ return P.u.kind==='machine'; }
function hand(P){ return {x:cx(P)+dirOf(P)*(isM(P)?26:Math.round(12*PS)),y:FY-(isM(P)?62:Math.round(46*PS))+P.dy}; }
function chest(P){ return {x:cx(P),y:FY-(isM(P)?40:Math.round(40*PS))+P.dy}; }
/* 0.51.0 立ち絵のある人（構えを変えられる） */
function isP(P){ return P.u.kind==='person'&&!!(ART.tall&&ART.tall(P.u,'idle',0)); }
async function poseFor(P,pose,ms){ if(!isP(P)||calm()) return; P.pose=pose; if(ms) await wait(ms); }
function fxd(ms,draw){ BT.S.fx.push({kind:'draw',draw,ms,t0:now()}); }
function dot(c,x,y,s,col){ c.fillStyle=col; c.fillRect(Math.round(x-s/2),Math.round(y-s/2),s,s); }
function seg(c,x1,y1,x2,y2,w,col){ c.strokeStyle=col; c.lineWidth=w; c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke(); }
function glowAt(c,x,y,r,a,col){ c.globalCompositeOperation='lighter'; const g=c.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,`rgba(${col},${a})`); g.addColorStop(1,`rgba(${col},0)`); c.fillStyle=g; c.fillRect(x-r,y-r,r*2,r*2); c.globalCompositeOperation='source-over'; }
const hs=i=>((i*2654435761)>>>0)%1000/1000;   // 番号から 0〜1 のばらつき（乱数の代わり）
const clamp01=v=>v<0?0:v>1?1:v;
const REACH=P=>isM(P)?50:62;   // 大きい機械は踏み込みを浅く（相手に重ならないように）
/* 0.51.0 人は走って近づき、一度ふりかぶってから打つ */
async function stepIn(A,ms,r){ const d=dirOf(A), o0=A.off, R=r==null?REACH(A):r, run=isP(A)&&!calm(), pz=A.pose;
  if(run) A.pose='run';
  await tween(ms||240,p=>{ A.off=lerp(o0,d*R,ease(p)); },true);
  if(run){ A.pose='wind'; await wait(100); A.pose=pz==='run'||pz==='wind'?'atk':pz; } }
/* 0.51.0 人はよけるとき、跳んで下がる */
function dodge(T){ const dt=T===BT.S.L?-1:1, jp=isP(T)&&!calm(), pz=T.pose; if(jp) T.pose='jump';
  return tween(jp?340:300,p=>{ T.off=dt*Math.sin(p*Math.PI)*(jp?24:20); T.dy=-Math.sin(p*Math.PI)*(jp?12:6); },true).then(()=>{ T.off=0; T.dy=0; if(jp) T.pose=pz==='jump'?'idle':pz; }); }
/* 飛ぶもの。外れたときは相手の後ろへ抜け、相手は途中でよける */
async function launch(A,T,ev,ms,draw){
  const d=dirOf(A), a=hand(A), b0=chest(T), b=ev.hit?b0:{x:b0.x+d*36,y:b0.y-8};
  fxd(ms,(c,p)=>draw(c,p,a,b));
  if(ev.hit) return wait(ms);
  await wait(ms*0.45); BT.S.dodgeP=dodge(T); await wait(ms*0.55);
}
const arcPt=(a,b,q,h)=>({x:lerp(a.x,b.x,q),y:lerp(a.y,b.y,q)-Math.sin(q*Math.PI)*(h||0)});
/* 武器をふる弧（人の杖・スパナ・櫂、機械のアーム） */
function swingArc(A,ms,col,glow,tip){   /* 0.51.0 tip(c,x,y,fade)＝弧の先に持ち物を描く（かばん・お玉など） */
  fxd(ms,(c,p)=>{ const d=dirOf(A), h=hand(A), R=isM(A)?30:20, ox=h.x-d*6, oy=h.y+6, cur=lerp(-2.3,0.7,ease(clamp01(p*1.7))), fade=p<0.55?1:1-(p-0.55)/0.45;
    for(let i=0;i<14;i++){ const a=cur-i*0.12; if(a<-2.3) break; const ang=d>0?a:Math.PI-a, w=i<3?3:i<8?2:1;
      c.globalAlpha=fade*(1-i/14); for(const rr of [R,R-3]) dot(c,ox+Math.cos(ang)*rr,oy+Math.sin(ang)*rr,w,i===0?'#ffffff':col); }
    c.globalAlpha=1; const ang=d>0?cur:Math.PI-cur; if(glow&&!calm()) glowAt(c,ox+Math.cos(ang)*R,oy+Math.sin(ang)*R,10,0.7*fade,glow);
    if(tip){ c.globalAlpha=fade; tip(c,ox+Math.cos(ang)*R,oy+Math.sin(ang)*R,fade); c.globalAlpha=1; } });
}
const MOT={
  /* 近くで武器をふる */
  async swing(A,T,ev){ await stepIn(A); await tween(90,p=>{ A.off=dirOf(A)*(REACH(A)-p*8); },true); swingArc(A,240,isM(A)?'#c8d4e4':'#e8eef8'); await wait(120); return 'slash'; },
  async staff(A,T,ev){ await stepIn(A); await tween(90,p=>{ A.off=dirOf(A)*(REACH(A)-p*8); },true); swingArc(A,260,'#fff0b0','255,230,150'); await wait(130); return 'lightHit'; },
  async oar(A,T,ev){ await stepIn(A); await tween(110,p=>{ A.off=dirOf(A)*(REACH(A)-p*10); },true); swingArc(A,260,'#e0c088');
    const h=hand(A), d=dirOf(A); fxd(520,(c,p)=>{ for(let i=0;i<9;i++){ const q=clamp01(p*1.3-i*0.04), x=h.x+d*(6+i*3)*q*2, y=h.y-10+(-14+i*2)*q+40*q*q; dot(c,x,y,i%3?1:2,i%2?'#9fd8ff':'#e8f8ff'); } });
    await wait(130); return 'blunt'; },
  async combo(A,T,ev){ await stepIn(A); const d=dirOf(A), t=chest(T);   // 棒術：三段（0.51.0 突く・ふりかぶる・突くと構えを変える）
    for(let i=0;i<3;i++){ poseFor(A,i===1?'wind':'atk'); await tween(80,p=>{ A.off=d*(REACH(A)-6+Math.sin(p*Math.PI)*8); },true);
      fxd(200,(c,p)=>{ const y=t.y-10+i*10, L=22*ease(clamp01(p*2)); c.globalAlpha=1-p; seg(c,t.x-d*L,y-(i-1)*6,t.x+d*L,y+(i-1)*6,2,'#ffffff'); c.globalAlpha=1; });
      if(i<2&&ev.hit){ fx('spark',t.x,t.y-10+i*10,220); sfx('hit'); } }
    return 'blunt'; },
  async rod(A,T,ev){ await stepIn(A,200,REACH(A)*0.35); await poseFor(A,'wind',160); poseFor(A,'atk'); const a=hand(A), t=chest(T), d=dirOf(A);   // 竿：糸と針を投げる（0.51.0 竿を後ろへ引いてから投げる）
    fxd(560,(c,p)=>{ const q=ease(clamp01(p*2)), ex=lerp(a.x,ev.hit?t.x:t.x+d*30,q), ey=lerp(a.y-24,ev.hit?t.y:t.y-16,q), mx=(a.x+ex)/2, my=Math.min(a.y,ey)-30*(1-q*0.6);
      c.globalAlpha=p<0.8?1:(1-p)/0.2; c.strokeStyle='#d8e0f0'; c.lineWidth=1; c.beginPath(); c.moveTo(a.x,a.y-24); c.quadraticCurveTo(mx,my,ex,ey); c.stroke();
      seg(c,a.x,a.y,a.x+d*4,a.y-24,2,'#a07040'); dot(c,ex,ey,3,'#f0f0f0'); dot(c,ex,ey+2,2,'#ff7060'); c.globalAlpha=1; });
    if(!ev.hit){ await wait(260); BT.S.dodgeP=dodge(T); await wait(200); } else await wait(400);
    return 'blunt'; },
  async clap(A,T,ev){ poseFor(A,'cheer'); const h=hand(A);   // 手拍子：2回たたいて、音の輪を飛ばす（0.51.0 両手を上げて、跳ねながら）
    for(let i=0;i<2;i++){ await tween(110,p=>{ A.dy=-Math.sin(p*Math.PI)*(isP(A)?7:3); },true); fxd(260,(c,p)=>{ c.globalAlpha=1-p; c.strokeStyle='#ffe6a0'; c.lineWidth=1; c.beginPath(); c.arc(h.x,h.y-4,3+p*10,0,7); c.stroke();
      for(let j=0;j<6;j++){ const a=j*1.047; dot(c,h.x+Math.cos(a)*(5+p*9),h.y-4+Math.sin(a)*(5+p*9),2,'#fff6c8'); } c.globalAlpha=1; }); sfx('press'); }
    poseFor(A,'atk'); await launch(A,T,ev,420,(c,p,a,b)=>drawRings(c,p,a,b,'255,214,140',dirOf(A))); return 'ring'; },
  async shield(A,T,ev){ await stepIn(A); const d=dirOf(A);   // 板で押し返す
    await tween(120,p=>{ A.off=d*(REACH(A)+Math.sin(p*Math.PI)*10); },true);
    const t=chest(T); fxd(260,(c,p)=>{ c.globalAlpha=1-p; c.fillStyle='rgba(220,235,255,.85)'; c.fillRect(Math.round(t.x-d*16)-2,t.y-16,5,30); c.globalAlpha=1; }); return 'blunt'; },
  /* 影：霧の手がのびて、つかむ */
  async claw(A,T,ev){ await stepIn(A,200,18); const d=dirOf(A);
    fxd(620,(c,p)=>{ const a=chest(A), t=chest(T), b=ev.hit?t:{x:t.x+d*30,y:t.y-10}, ext=ease(clamp01(p*2.2)), ret=p>0.75?1-(p-0.75)/0.25:1;
      for(let j=0;j<3;j++){ c.beginPath(); for(let i=0;i<=16;i++){ const q=i/16*ext, x=lerp(a.x+d*8,b.x,q), y=lerp(a.y-6+j*6,b.y-8+j*8,q)+Math.sin(q*9+now()*0.012+j*2)*3*(1-q*0.5); i?c.lineTo(x,y):c.moveTo(x,y); }
        c.globalAlpha=ret; c.strokeStyle='#3a1848'; c.lineWidth=4; c.stroke(); c.strokeStyle='#9050b0'; c.lineWidth=1; c.stroke(); } c.globalAlpha=1;
      if(!calm()) glowAt(c,lerp(a.x,b.x,ext),lerp(a.y,b.y,ext),8,0.5*ret,'200,90,220'); });
    if(!ev.hit){ await wait(300); BT.S.dodgeP=dodge(T); await wait(160); } else await wait(380);
    return 'claw'; },
  async mist(A,T,ev){ await tween(120,p=>{ A.off=-dirOf(A)*ease(p)*6; },true);   // 霧のつぶて・霧吹きの影：黒い霧のかたまり
    await launch(A,T,ev,480,(c,p,a,b)=>{ for(let i=0;i<3;i++){ const q=clamp01(p*1.5-i*0.25); if(q<=0||q>=1) continue; const pt=arcPt(a,b,q,10+i*6);
      dot(c,pt.x,pt.y,7,'#2a1236'); dot(c,pt.x-1,pt.y-1,4,'#6a3a88'); dot(c,pt.x-2,pt.y-2,1,'#ff9ad8');
      for(let j=1;j<4;j++){ const pq=arcPt(a,b,Math.max(0,q-j*0.05),10+i*6); c.globalAlpha=0.5-j*0.12; dot(c,pq.x,pq.y,5-j,'#4a2860'); } c.globalAlpha=1; } });
    return 'mistHit'; },
  /* ぶつかる */
  async dash(A,T,ev){ const d=dirOf(A); await tween(160,p=>{ A.off=-d*ease(p)*10; },true);
    fxd(360,(c,p)=>{ const a=chest(A); c.globalAlpha=1-p; for(let i=0;i<5;i++){ const y=a.y-20+i*10, x=a.x-d*(26+hs(i+3)*10); seg(c,x,y,x-d*(14+i%2*8),y,1,'#e8f0ff'); } c.globalAlpha=1; });
    await tween(170,p=>{ A.off=lerp(-d*10,d*(REACH(A)+6),p*p); },true); return 'bump'; },
  async dive(A,T,ev){ const d=dirOf(A); await tween(260,p=>{ A.off=-d*ease(p)*20; A.dy=-ease(p)*54; },true);
    fxd(320,(c,p)=>{ const a=chest(A); c.globalAlpha=1-p; for(let i=0;i<4;i++){ const x=a.x-d*(10+i*6), y=a.y-24-i*6; seg(c,x,y,x-d*14,y-14,1,'#e8f0ff'); } c.globalAlpha=1; });
    await tween(200,p=>{ A.off=lerp(-d*20,d*REACH(A),p*p); A.dy=lerp(-54,0,p*p); },true); return 'bump'; },
  async hop(A,T,ev){ const d=dirOf(A); await tween(320,p=>{ A.off=d*REACH(A)*p; A.dy=-Math.sin(p*Math.PI)*28; },true); return 'bump'; },
  async kick(A,T,ev){ const d=dirOf(A); await tween(300,p=>{ A.off=d*REACH(A)*p; A.dy=-Math.sin(p*Math.PI)*24; },true); await tween(90,p=>{ A.dy=-p*6; },true); return 'launch'; },
  async peck(A,T,ev){ await stepIn(A,200,REACH(A)-10); const d=dirOf(A), t=chest(T);
    for(let i=0;i<3;i++){ await tween(70,p=>{ A.off=d*(REACH(A)-10+Math.sin(p*Math.PI)*12); },true); if(ev.hit&&i<2) fx('spark',t.x-d*6,t.y-6+i*8,200); }
    return 'pierce'; },
  async flap(A,T,ev){ for(let i=0;i<2;i++) await tween(140,p=>{ A.dy=-Math.sin(p*Math.PI)*8; },true);   // 羽ばたき：風の弧と羽
    await launch(A,T,ev,440,(c,p,a,b)=>{ const d=dirOf(A); for(let i=0;i<3;i++){ const q=clamp01(p*1.4-i*0.18); if(q<=0||q>=1) continue; const x=lerp(a.x,b.x,q), y=lerp(a.y,b.y,q)-6+i*6;
      c.globalAlpha=1-q*0.4; c.strokeStyle='#e0fff4'; c.lineWidth=2; c.beginPath(); c.arc(x-d*8,y,10,-0.9+(d<0?Math.PI:0),0.9+(d<0?Math.PI:0)); c.stroke(); }
      for(let j=0;j<4;j++){ const q=clamp01(p*1.2-j*0.1), x=lerp(a.x,b.x,q)+Math.sin(q*12+j)*4, y=lerp(a.y,b.y,q)-14+j*8+q*10; c.globalAlpha=1-p; dot(c,x,y,2,'#ffffff'); } c.globalAlpha=1; });
    return 'wind'; },
  /* 0.100.1 急旋回（ツバメ）：後ろ上へ抜けて小さく宙返りし、斜め上から切りつけて相手の後ろへ抜ける。通った道に白い弧を残す。
     外れたときは相手がよける（切りつけは相手の少し上を通る）。乱数は使わない */
  async turn(A,T,ev){ const d=dirOf(A), tr=[], rec=()=>{ const c0=chest(A); tr.push({x:c0.x,y:c0.y-6,t:now()}); if(tr.length>40) tr.shift(); };
    fxd(1200,(c,p)=>{ const n=tr.length; for(let i=1;i<n;i++){ const a=tr[i-1], b=tr[i], age=(now()-b.t)/260, f=clamp01(1-age)*(i/n); if(f<=0) continue;
        c.globalAlpha=f; seg(c,a.x,a.y,b.x,b.y,i>n-6?3:2,i>n-4?'#ffffff':'#d8ecff'); } c.globalAlpha=1; });
    await tween(180,p=>{ A.off=-d*ease(p)*20; A.dy=-ease(p)*10; rec(); },true);
    const ox=-d*20, oy=-10, R=9;   /* 宙返り（大きな機械なので、画面の上に出ないくらいに小さく）：いまの位置を円の下にして、後ろ回りに1周 */
    await tween(340,p=>{ const an=Math.PI/2+p*Math.PI*2; A.off=ox-d*Math.cos(an)*R; A.dy=oy-R+Math.sin(an)*R; rec(); },true);
    const x0=A.off, y0=A.dy, x1=d*(REACH(A)+(ev.hit?4:30)), y1=ev.hit?-4:-14;
    if(!ev.hit) BT.S.dodgeP=dodge(T);
    await tween(150,p=>{ const q=p*p; A.off=lerp(x0,x1,q); A.dy=lerp(y0,y1,q); rec(); },true);
    if(ev.hit){ const t=chest(T); fxd(260,(c,p)=>{ c.globalAlpha=1-p; for(let k=0;k<2;k++) seg(c,t.x-d*(18-k*6),t.y-22+k*4,t.x+d*(14+k*6),t.y+14+k*4,k?1:2,k?'#d8ecff':'#ffffff'); c.globalAlpha=1; }); }
    return 'slash'; },
  /* つかむ・持ち上げる・たたきつける */
  async grab(A,T,ev){ await stepIn(A); const d=dirOf(A);
    fxd(480,(c,p)=>{ const t=chest(T), g=ease(clamp01(p*2)), w=24-g*12, f=p>0.8?(1-p)/0.2:1; c.globalAlpha=f; c.strokeStyle='#c8d4e4'; c.lineWidth=3;
      c.beginPath(); c.arc(t.x-w,t.y,12,-1.1,1.1); c.stroke(); c.beginPath(); c.arc(t.x+w,t.y,12,Math.PI-1.1,Math.PI+1.1); c.stroke(); c.globalAlpha=1; });
    await wait(260); return 'squeeze'; },
  async lift(A,T,ev){ await stepIn(A); swingArc(A,200,'#c8d4e4'); await wait(120); return 'lift'; },
  async smash(A,T,ev){ const d=dirOf(A); await stepIn(A,220,REACH(A)-8); await tween(220,p=>{ A.dy=-ease(p)*36; },true); await wait(80);
    await tween(120,p=>{ A.dy=lerp(-36,0,p*p); A.off=d*(REACH(A)-8+p*8); },true); return 'smash'; },
  /* 水 */
  async jet(A,T,ev){ await tween(120,p=>{ A.off=-dirOf(A)*ease(p)*4; },true); await launch(A,T,ev,560,(c,p,a,b)=>drawJet(c,p,a,b,3)); return 'splash'; },
  async jetBig(A,T,ev){ await tween(160,p=>{ A.off=-dirOf(A)*ease(p)*8; },true); quake(1.5,400); await launch(A,T,ev,600,(c,p,a,b)=>drawJet(c,p,a,b,5)); return 'splashBig'; },
  async spray(A,T,ev){ await tween(110,p=>{ A.off=-dirOf(A)*ease(p)*4; },true);
    await launch(A,T,ev,480,(c,p,a,b)=>{ for(let i=0;i<18;i++){ const sp=0.75+hs(i)*0.5, q=clamp01(p*1.25*sp-hs(i+40)*0.15); if(q<=0||q>=1) continue; const off=(hs(i+9)-0.5)*26*q;
      dot(c,lerp(a.x,b.x,q),lerp(a.y,b.y,q)+off-Math.sin(q*Math.PI)*6,i%4?2:3,i%3?'#9fd8ff':'#ffffff'); }
      if(p>0.6&&!calm()) glowAt(c,b.x,b.y,16,0.5*(1-p)/0.4,'190,230,255'); });
    return 'splash'; },
  async drop(A,T,ev){ await tween(140,p=>{ A.off=-dirOf(A)*ease(p)*6; },true);
    await launch(A,T,ev,520,(c,p,a,b)=>{ const pt=arcPt(a,b,ease(p),34), big=ev.w&&ev.w.n==='大しずく'?1.5:1;
      dot(c,pt.x,pt.y,Math.round(8*big),'#4a98e0'); dot(c,pt.x,pt.y-Math.round(5*big),Math.round(4*big),'#4a98e0'); dot(c,pt.x-2,pt.y-2,2,'#e8f8ff'); });
    return 'splashBig'; },
  async bubble(A,T,ev){ await tween(120,p=>{ A.dy=-Math.sin(p*Math.PI)*3; },true); const big=ev.w&&ev.w.n==='大泡';
    await launch(A,T,ev,620,(c,p,a,b)=>{ for(let i=0;i<(big?3:6);i++){ const q=clamp01(p*1.3-i*0.08); if(q<=0||q>=1) continue; const r=(big?7:3)+hs(i)*3, x=lerp(a.x,b.x,q), y=lerp(a.y,b.y,q)+Math.sin(q*10+i)*5-(i%3)*6;
      c.strokeStyle='#cdeeff'; c.lineWidth=1; c.beginPath(); c.arc(x,y,r,0,7); c.stroke(); dot(c,x-r/2,y-r/2,1,'#ffffff'); } });
    return 'pop'; },
  /* 音 */
  async sound(A,T,ev){ await tween(140,p=>{ A.dy=-Math.sin(p*Math.PI)*3; },true); await launch(A,T,ev,480,(c,p,a,b)=>drawRings(c,p,a,b,'216,200,255',dirOf(A))); return 'ring'; },
  async lullaby(A,T,ev){ await tween(160,p=>{ A.dy=-Math.sin(p*Math.PI)*2; },true);
    await launch(A,T,ev,700,(c,p,a,b)=>{ for(let i=0;i<5;i++){ const q=clamp01(p*1.3-i*0.08); if(q<=0||q>=1) continue; const x=lerp(a.x,b.x,q), y=lerp(a.y,b.y,q)+Math.sin(q*Math.PI*3+i)*8-8;
      const col=i%2?'#ffc0e0':'#fff0b0'; c.fillStyle=col; c.fillRect(Math.round(x),Math.round(y),3,2); c.fillRect(Math.round(x)+2,Math.round(y)-6,1,7); c.fillRect(Math.round(x)+3,Math.round(y)-6,2,1); } });
    return 'ringSoft'; },
  /* 光 */
  async beam(A,T,ev){ return beamGo(A,T,ev,4,'255,236,150','#fff2b0'); },
  async beamBig(A,T,ev){ return beamGo(A,T,ev,7,'255,226,130','#ffe890'); },
  async beamBlue(A,T,ev){ return beamGo(A,T,ev,3,'170,200,255','#d8e6ff'); },
  async needle(A,T,ev){ return needles(A,T,ev,'#fff2a0',3); },
  async needleBlue(A,T,ev){ return needles(A,T,ev,'#cfe0ff',2); },
  async needleMetal(A,T,ev){ return needles(A,T,ev,'#e0e8f0',ev.w&&ev.w.n==='ボルト撃ち'?2:3); },
  async gears(A,T,ev){ await tween(140,p=>{ A.off=-dirOf(A)*ease(p)*6; },true);
    await launch(A,T,ev,560,(c,p,a,b)=>{ for(let i=0;i<3;i++){ const q=clamp01(p*1.4-i*0.18); if(q<=0||q>=1) continue; const pt=arcPt(a,b,q,20+i*8), r=now()*0.02+i;
      dot(c,pt.x,pt.y,4,'#a0a8b8'); for(let j=0;j<4;j++){ const an=r+j*Math.PI/2; dot(c,pt.x+Math.cos(an)*3,pt.y+Math.sin(an)*3,2,'#d0d8e4'); } dot(c,pt.x,pt.y,1,'#404858'); } });
    return 'blunt'; },
  async orb(A,T,ev){ await tween(120,p=>{ A.dy=-Math.sin(p*Math.PI)*3; },true); const a=hand(A), b=chest(T);
    fx('orb',a.x,a.y,520,{x2:ev.hit?b.x:b.x+dirOf(A)*36,y2:b.y}); if(!ev.hit){ await wait(240); BT.S.dodgeP=dodge(T); await wait(280); } else await wait(520); return 'lightHit'; },
  async ring(A,T,ev){ const a=chest(A), b=chest(T), R=Math.abs(b.x-a.x)+12;   // 灯の結界：まわりへ広がる光の輪
    await tween(200,p=>{ A.glow=p; },false);
    fxd(560,(c,p)=>{ const r=6+ease(p)*R; c.globalCompositeOperation='lighter'; c.strokeStyle=`rgba(255,226,140,${1-p})`; c.lineWidth=4; c.beginPath(); c.ellipse(a.x,a.y+8,r,r*0.45,0,0,7); c.stroke();
      c.strokeStyle=`rgba(255,255,230,${1-p})`; c.lineWidth=1; c.beginPath(); c.ellipse(a.x,a.y+8,r-3,(r-3)*0.45,0,0,7); c.stroke(); c.globalCompositeOperation='source-over'; });
    if(!ev.hit){ await wait(250); BT.S.dodgeP=dodge(T); await wait(200); } else await wait(420); A.glow=0; return 'lightHit'; },
  /* 線と網と風 */
  async wire(A,T,ev){ const d=dirOf(A);
    fxd(620,(c,p)=>{ const a=hand(A), t=chest(T), b=ev.hit?t:{x:t.x+d*30,y:t.y-12}, q=p<0.45?ease(p/0.45):p<0.7?1:1-(p-0.7)/0.3, x=lerp(a.x,b.x,q), y=lerp(a.y,b.y,q);
      seg(c,a.x,a.y,x,y,1,'#d0d8e4'); seg(c,x,y,x+d*4,y+4,2,'#e8eef8'); seg(c,x+d*4,y+4,x+d*1,y+7,2,'#e8eef8'); dot(c,x,y,2,'#ffffff'); });
    if(!ev.hit){ await wait(200); BT.S.dodgeP=dodge(T); await wait(160); } else await wait(300); return 'pull'; },
  async net(A,T,ev){ await tween(140,p=>{ A.off=-dirOf(A)*ease(p)*6; },true);
    await launch(A,T,ev,520,(c,p,a,b)=>{ const pt=arcPt(a,b,ease(p),26); drawNet(c,pt.x,pt.y,4+ease(p)*20,1); });
    return 'net'; },
  async wind(A,T,ev){ await tween(160,p=>{ A.dy=-Math.sin(p*Math.PI)*4; },true);
    await launch(A,T,ev,460,(c,p,a,b)=>{ const d=dirOf(A); for(let i=0;i<6;i++){ const q=clamp01(p*1.5-hs(i)*0.4); if(q<=0||q>=1) continue; const x=lerp(a.x,b.x,q), y=lerp(a.y,b.y,q)-18+i*7+Math.sin(q*8+i)*2;
      c.globalAlpha=Math.sin(q*Math.PI); seg(c,x-d*(10+i%3*5),y,x,y,1,'#e8fff8'); dot(c,x,y,2,'#ffffff'); } c.globalAlpha=1; });
    return 'wind'; },
  async tornado(A,T,ev){ await tween(200,p=>{ A.dy=-Math.sin(p*Math.PI)*6; },true); const b0=chest(T), d=dirOf(A), b=ev.hit?b0:{x:b0.x+d*30,y:b0.y};
    fxd(760,(c,p)=>{ const f=p<0.15?p/0.15:p>0.8?(1-p)/0.2:1; c.globalAlpha=f; for(let j=0;j<8;j++){ const y=FY-4-j*9, r=5+j*2.6, ph=now()*0.018+j*0.7;
      c.strokeStyle=j%2?'#d8f4ec':'#a8d8cc'; c.lineWidth=1; c.beginPath(); c.ellipse(b.x+Math.sin(ph)*3,y,r,r*0.3,0,ph%6.28,ph%6.28+4.2); c.stroke(); } c.globalAlpha=1; });
    if(!ev.hit){ await wait(200); BT.S.dodgeP=dodge(T); await wait(300); } else await wait(520); return 'wind'; },
  /* ---------- 0.51.0 人ごと・職業ごと ---------- */
  /* 機械いじり：スパナをふりかぶって投げ、回りながら飛んで手もとへ戻る */
  async wrench(A,T,ev){ await poseFor(A,'wind',180); poseFor(A,'atk'); await tween(100,p=>{ A.off=dirOf(A)*ease(p)*4; },true);
    const d=dirOf(A), a=hand(A), b0=chest(T), b=ev.hit?b0:{x:b0.x+d*30,y:b0.y-14};
    fxd(900,(c,p)=>{ const go=p<0.45, q=go?ease(p/0.45):1-ease((p-0.45)/0.55), pt=arcPt(a,b,q,go?12:-8), an=now()*0.03*d;
      for(let j=-2;j<=2;j++) dot(c,pt.x+Math.cos(an)*j*1.6,pt.y+Math.sin(an)*j*1.6,2,'#c8d0dc');
      dot(c,pt.x+Math.cos(an)*4.5,pt.y+Math.sin(an)*4.5,3,'#9aa4b4'); dot(c,pt.x-Math.cos(an)*4.5,pt.y-Math.sin(an)*4.5,3,'#9aa4b4'); });
    sfx('press');
    if(!ev.hit){ await wait(200); BT.S.dodgeP=dodge(T); await wait(205); } else await wait(405);
    return 'blunt'; },
  /* 機械いじりのパブロ：走りこんで2回打ち、しゃがんでから跳んで突き上げる */
  async punch(A,T,ev){ const d=dirOf(A), R=REACH(A)-4, t=chest(T); await stepIn(A,240,R);
    for(let i=0;i<2;i++){ poseFor(A,'atk'); await tween(80,p=>{ A.off=d*(R+Math.sin(p*Math.PI)*7); },true);
      if(ev.hit){ fx('spark',t.x-d*4,t.y-6+i*6,200); sfx('hit'); } poseFor(A,'idle'); await wait(50); }
    await poseFor(A,'wind',110); poseFor(A,'jump'); await tween(200,p=>{ A.dy=-Math.sin(p*Math.PI*0.5)*16; A.off=d*(R+p*6); },true); poseFor(A,'atk');
    return 'launch'; },
  /* 配達人のルカ：走って跳び、空中でけり出す */
  async flyKick(A,T,ev){ const d=dirOf(A), R=REACH(A); await stepIn(A,200,R*0.45); poseFor(A,'jump');
    await tween(170,p=>{ A.dy=-ease(p)*22; A.off=d*lerp(R*0.45,R*0.7,p); },true); poseFor(A,'kick');
    fxd(300,(c,p)=>{ const a=chest(A); c.globalAlpha=1-p; for(let i=0;i<4;i++){ const y=a.y+4+i*5, x=a.x-d*(8+i*3); seg(c,x,y,x-d*(12+i%2*6),y-4,1,'#e8f0ff'); } c.globalAlpha=1; });
    await tween(150,p=>{ A.dy=lerp(-22,-8,p); A.off=d*lerp(R*0.7,R+2,p); },true);
    return 'launch'; },
  /* 配達人のルチア：かばんを大きく回して打つ */
  async bag(A,T,ev){ await stepIn(A,240,REACH(A)-4); poseFor(A,'atk');
    swingArc(A,300,'#e8d0a0',null,(c,x,y)=>{ c.fillStyle='#7a4e2a'; c.fillRect(Math.round(x)-4,Math.round(y)-3,8,7); c.fillStyle='#c8945a'; c.fillRect(Math.round(x)-3,Math.round(y)-2,6,5); c.fillStyle='#4a2c1a'; c.fillRect(Math.round(x)-2,Math.round(y)-5,4,2); });
    await tween(140,p=>{ A.off=dirOf(A)*(REACH(A)-4+Math.sin(p*Math.PI)*6); },true);
    return 'bump'; },
  /* 牧人のペマ：石投げのひもを頭の上で回して、石を放つ */
  async sling(A,T,ev){ await poseFor(A,'wind'); const d=dirOf(A), c0={x:cx(A)-d*3,y:FY-Math.round(64*PS)+A.dy};
    fxd(560,(c,p)=>{ const an=p*Math.PI*4*d, x=c0.x+Math.cos(an)*9, y=c0.y+Math.sin(an)*4; seg(c,c0.x,c0.y+4,x,y,1,'#d8c8a0'); dot(c,x,y,3,'#b0a898'); dot(c,x-1,y-1,1,'#ffffff'); });
    await wait(560); poseFor(A,'atk'); sfx('press');
    await launch(A,T,ev,400,(c,p,a,b)=>{ const q=ease(p), pt=arcPt(a,b,q,18); for(let j=1;j<4;j++){ const r=arcPt(a,b,Math.max(0,q-j*0.05),18); c.globalAlpha=0.5-j*0.12; dot(c,r.x,r.y,2,'#e8e0d0'); } c.globalAlpha=1; dot(c,pt.x,pt.y,3,'#b0a898'); dot(c,pt.x-1,pt.y-1,1,'#ffffff'); });
    return 'blunt'; },
  /* 牧人のフェリクス：牧杖の曲がった先で引っかけて、こちらへ引く */
  async hook(A,T,ev){ await stepIn(A,220,REACH(A)*0.5); poseFor(A,'atk'); const d=dirOf(A);
    fxd(620,(c,p)=>{ const a=hand(A), t=chest(T), b=ev.hit?{x:t.x-d*2,y:t.y-10}:{x:t.x+d*26,y:t.y-20}, q=p<0.4?ease(p/0.4):p<0.7?1:1-(p-0.7)/0.3*0.7, x=lerp(a.x,b.x,q), y=lerp(a.y,b.y,q);
      seg(c,a.x,a.y,x,y,2,'#a07040'); c.strokeStyle='#c8a060'; c.lineWidth=2; c.beginPath(); c.arc(x+d*3,y,3.5,Math.PI,Math.PI*2); c.stroke(); seg(c,x+d*6.5,y,x+d*6.5,y+3,2,'#c8a060'); });
    if(!ev.hit){ await wait(240); BT.S.dodgeP=dodge(T); await wait(200); } else await wait(420);
    return 'pull'; },
  /* 薬草摘みのオユナ：跳んで、すりこぎをふり下ろす（薬草の粉が舞う） */
  async pestle(A,T,ev){ const d=dirOf(A), R=REACH(A)-6; await stepIn(A,240,R); poseFor(A,'jump');
    await tween(180,p=>{ A.dy=-ease(p)*18; },true); await poseFor(A,'wind',90); poseFor(A,'atk');
    await tween(120,p=>{ A.dy=lerp(-18,0,p*p); A.off=d*(R+p*6); },true);
    return 'herb'; },
  /* 薬草摘みのハナ：かごから薬草をつかんで、ぱっとまく */
  async herbs(A,T,ev){ await poseFor(A,'wind'); await tween(160,p=>{ A.off=-dirOf(A)*ease(p)*4; },true); poseFor(A,'atk');
    await launch(A,T,ev,560,(c,p,a,b)=>{ for(let i=0;i<12;i++){ const q=clamp01(p*1.3-hs(i)*0.3); if(q<=0||q>=1) continue; const pt=arcPt(a,b,q,16+hs(i+5)*14), w=Math.sin(q*10+i)*3;
      c.fillStyle=i%3?'#7ac850':'#b8e878'; c.fillRect(Math.round(pt.x+w),Math.round(pt.y+(hs(i+9)-0.5)*14),i%2?3:2,i%2?1:2); } });
    return 'herb'; },
  /* 料理番のクワメ：お玉をふりかぶって、熱いスープをかける */
  async ladle(A,T,ev){ await stepIn(A,240,REACH(A)*0.55); poseFor(A,'atk');
    await launch(A,T,ev,460,(c,p,a,b)=>{ for(let i=0;i<9;i++){ const q=clamp01(p*1.3-i*0.04); if(q<=0||q>=1) continue; const pt=arcPt(a,b,q,22); dot(c,pt.x+(hs(i)-0.5)*8,pt.y+(hs(i+3)-0.5)*8,i%3?2:3,i%2?'#f0a040':'#ffd080'); } });
    return 'soup'; },
  /* 料理番のデウィ：低く走りこみ、鉄べらで下からすくい上げる */
  async flip(A,T,ev){ const d=dirOf(A); await stepIn(A,220,REACH(A)); await poseFor(A,'wind'); await tween(100,p=>{ A.dy=p*3; },true); poseFor(A,'atk');
    const t=chest(T); fxd(320,(c,p)=>{ c.globalAlpha=1-p; for(let i=0;i<3;i++){ const x=t.x-d*(6-i*4); seg(c,x,FY-2,x+d*2,FY-2-ease(clamp01(p*2))*(26+i*6),1,'#fff6d0'); } c.globalAlpha=1; });
    await tween(120,p=>{ A.dy=3-p*9; },true);
    return 'launch'; },
  /* 旅人のジュン：ふっと消えて、目の前に現れて打つ */
  async vanish(A,T,ev){ const d=dirOf(A), x0=cx(A);
    fxd(520,(c,p)=>{ c.globalAlpha=0.6*(1-p); for(let i=0;i<6;i++) dot(c,x0+(hs(i)-0.5)*16,FY-6-p*16-hs(i+4)*Math.round(50*PS),2,'#b8c0d0'); c.globalAlpha=1; });
    await tween(220,p=>{ A.alpha=1-p*0.95; },false);
    if(!calm()) A.off=d*REACH(A); await poseFor(A,'wind');
    await tween(160,p=>{ A.alpha=0.05+0.95*p; },false); A.alpha=1; poseFor(A,'atk');
    swingArc(A,220,'#d0d8e8'); await wait(120);
    return 'slash'; }
};
function drawJet(c,p,a,b,w){
  const h=Math.min(1,p*1.8), t=Math.max(0,p*1.8-0.8); if(h<=t) return; const P=q=>arcPt(a,b,q,6);
  c.lineCap='round'; for(const [lw,col] of [[w+2,'#2f78c8'],[w,'#7cc8ff'],[Math.max(1,w-2),'#e8f8ff']]){ c.strokeStyle=col; c.lineWidth=lw; c.beginPath();
    for(let i=0;i<=12;i++){ const pt=P(lerp(t,h,i/12)); i?c.lineTo(pt.x,pt.y):c.moveTo(pt.x,pt.y); } c.stroke(); }
  const ph=now()*0.004; for(let i=0;i<8;i++){ const pt=P(lerp(t,h,(i/8+ph)%1)); dot(c,pt.x+Math.sin(i*2.1)*w,pt.y+Math.cos(i*1.3)*w,1,'#ffffff'); }
}
function drawRings(c,p,a,b,col,d){ for(let i=0;i<4;i++){ const q=clamp01(p*1.4-i*0.14); if(q<=0||q>=1) continue; const x=lerp(a.x,b.x,q), y=lerp(a.y,b.y,q), r=6+q*8;
  c.strokeStyle=`rgba(${col},${1-q*0.5})`; c.lineWidth=2; c.beginPath(); c.arc(x-d*r,y,r,-0.8+(d<0?Math.PI:0),0.8+(d<0?Math.PI:0)); c.stroke(); } }
function drawNet(c,x,y,s,a){ c.globalAlpha=a; c.strokeStyle='#e8e0c0'; c.lineWidth=1; c.strokeRect(Math.round(x-s),Math.round(y-s),Math.round(s*2),Math.round(s*2));
  c.beginPath(); for(let i=1;i<4;i++){ const o=-s+s*2*i/4; c.moveTo(x+o,y-s); c.lineTo(x+o,y+s); c.moveTo(x-s,y+o); c.lineTo(x+s,y+o); } c.stroke();
  for(const [ox,oy] of [[-1,-1],[1,-1],[-1,1],[1,1]]) dot(c,x+ox*s,y+oy*s,2,'#b09060'); c.globalAlpha=1; }
async function beamGo(A,T,ev,w,col,core){
  const a=hand(A);   // ためる→光の線
  fxd(320,(c,p)=>{ glowAt(c,a.x,a.y,4+p*10,0.9*p,col); for(let i=0;i<8;i++){ const an=i*0.785+p*2, r=18*(1-p); dot(c,a.x+Math.cos(an)*r,a.y+Math.sin(an)*r,1,core); } });
  await tween(320,p=>{ A.glow=0.5*p; },false);
  const b0=chest(T), d=dirOf(A), b=ev.hit?b0:{x:b0.x+d*44,y:b0.y-16};
  if(!ev.hit) BT.S.dodgeP=dodge(T);
  sfx('light');
  fxd(460,(c,p)=>{ const f=p<0.12?p/0.12:1-(p-0.12)/0.88, ww=w*f*(1+0.15*Math.sin(now()*0.08)); if(ww<=0.2) return;
    c.globalCompositeOperation='lighter'; c.lineCap='round'; seg(c,a.x,a.y,b.x,b.y,ww+5,`rgba(${col},.25)`); seg(c,a.x,a.y,b.x,b.y,ww,`rgba(${col},.9)`); seg(c,a.x,a.y,b.x,b.y,Math.max(1,ww/2.5),'rgba(255,255,255,.95)');
    c.globalCompositeOperation='source-over'; });
  await wait(240); A.glow=0; return 'lightHit';
}
async function needles(A,T,ev,col,n){
  await tween(120,p=>{ A.off=-dirOf(A)*ease(p)*5; },true);
  await launch(A,T,ev,380,(c,p,a,b)=>{ for(let i=0;i<n;i++){ const q=clamp01((p-i*0.16)/0.6); if(q<=0||q>=1) continue; const y0=(i-(n-1)/2)*5,
    x1=lerp(a.x,b.x,q), y1=lerp(a.y+y0,b.y+y0*0.4,q), x2=lerp(a.x,b.x,Math.max(0,q-0.18)), y2=lerp(a.y+y0,b.y+y0*0.4,Math.max(0,q-0.18));
    seg(c,x2,y2,x1,y1,1,col); dot(c,x1,y1,2,'#ffffff'); } });
  return 'pierce';
}
/* 当たったときの印（型ごと） */
function impact(kind,A,T,ev){
  const t=chest(T), d=dirOf(A), big=ev.dmg>=8||ev.down, x=t.x, y=t.y+4;
  const blunt=()=>{ fx('spark',x,y-4,360); fxd(320,(c,p)=>{ c.globalAlpha=1-p; for(let i=0;i<8;i++){ const an=i*0.785, r1=6+p*10, r2=r1+5+(i%2)*5; seg(c,x+Math.cos(an)*r1,y-4+Math.sin(an)*r1,x+Math.cos(an)*r2,y-4+Math.sin(an)*r2,2,'#fff6c0'); } c.globalAlpha=1; }); };
  const dust=n=>fxd(520,(c,p)=>{ for(let i=0;i<n;i++){ const s=i%2?1:-1, q=ease(p), xx=x+s*(6+i*3)*q, yy=FY-2-Math.sin(q*Math.PI)*(6+i%3*4); c.globalAlpha=1-p; dot(c,xx,yy,i%3?2:3,'#c8b898'); } c.globalAlpha=1; });
  const splash=k2=>fxd(560,(c,p)=>{ for(let i=0;i<10*k2;i++){ const an=-Math.PI*(0.1+0.8*hs(i)), v=(14+hs(i+20)*16)*k2, xx=x+Math.cos(an)*v*p, yy=y-6+Math.sin(an)*v*p+30*p*p; c.globalAlpha=1-p; dot(c,xx,yy,i%3?2:3,i%2?'#9fd8ff':'#ffffff'); } c.globalAlpha=1; });
  switch(kind){
    case 'slash': fx('slash',x,y-4,300); fx('spark',x,y-4,360); break;
    case 'lightHit': fx('spark',x,y-4,360); if(!calm()) fxd(420,(c,p)=>glowAt(c,x,y-4,10+p*24,0.9*(1-p),'255,236,170')); break;
    case 'claw': fxd(420,(c,p)=>{ const L=ease(clamp01(p*2.5)); c.globalAlpha=1-Math.max(0,p-0.5)*2; for(let i=0;i<3;i++){ const ox=x-10+i*8; seg(c,ox,y-20,ox+d*12*L,y-20+26*L,3,'#3a1848'); seg(c,ox,y-20,ox+d*12*L,y-20+26*L,1,'#ff9ad8'); } c.globalAlpha=1; }); break;
    case 'mistHit': fxd(560,(c,p)=>{ for(let i=0;i<7;i++){ const an=i*0.9, r=4+ease(p)*16; c.globalAlpha=0.8*(1-p); dot(c,x+Math.cos(an)*r,y-6+Math.sin(an)*r*0.7,6-Math.round(p*3),i%2?'#3a1a4a':'#6a3a88'); } c.globalAlpha=1; }); break;
    case 'bump': blunt(); dust(6); if(!calm()) tween(260,p=>{ T.off=-dirOf(T)*Math.sin(p*Math.PI)*10; },true).then(()=>{ T.off=0; }); break;
    case 'launch': blunt(); tween(420,p=>{ T.dy=-Math.sin(p*Math.PI)*18; },true).then(()=>{ T.dy=0; }); break;
    case 'pierce': fx('spark',x,y-4,320); fxd(240,(c,p)=>{ c.globalAlpha=1-p; seg(c,x-d*14,y-8,x+d*6,y-2,1,'#ffffff'); seg(c,x-d*12,y+2,x+d*8,y+2,1,'#ffffff'); c.globalAlpha=1; }); break;
    case 'squeeze': blunt(); tween(360,p=>{ T.off=Math.sin(p*Math.PI*6)*2*(1-p); },true).then(()=>{ T.off=0; }); break;
    case 'lift': tween(460,p=>{ T.dy=p<0.5?-30*ease(p/0.5):-30*(1-((p-0.5)/0.5)**2); },true).then(()=>{ T.dy=0; quake(4,300); dust(10); blunt(); }); break;
    case 'smash': blunt(); dust(14); quake(5,420); fxd(620,(c,p)=>{ for(let i=0;i<8;i++){ const s=i%2?1:-1, v=10+hs(i)*14, xx=x+s*v*p*1.6, yy=FY-6-v*p*2+50*p*p; c.globalAlpha=1-p; dot(c,xx,yy,3,i%3?'#8a7a68':'#b0a088'); } c.globalAlpha=1; }); break;
    case 'splash': splash(1); break;
    case 'splashBig': splash(1.5); fxd(420,(c,p)=>{ c.globalAlpha=1-p; c.strokeStyle='#bfe6ff'; c.lineWidth=2; c.beginPath(); c.ellipse(x,FY-2,6+p*24,2+p*6,0,0,7); c.stroke(); c.globalAlpha=1; }); break;
    case 'pop': fxd(360,(c,p)=>{ for(let i=0;i<10;i++){ const an=i*0.63, r=4+p*14; c.globalAlpha=1-p; dot(c,x+Math.cos(an)*r,y-6+Math.sin(an)*r,1,'#ffffff'); } c.globalAlpha=1; }); splash(0.6); break;
    case 'ring': case 'ringSoft': { const col=kind==='ring'?'216,200,255':'255,200,232'; fxd(480,(c,p)=>{ for(let i=0;i<3;i++){ const q=clamp01(p*1.4-i*0.2); if(q<=0||q>=1) continue; c.strokeStyle=`rgba(${col},${1-q})`; c.lineWidth=2; c.beginPath(); c.ellipse(x,y-6,6+q*20,4+q*14,0,0,7); c.stroke(); } });
      tween(380,p=>{ T.off=Math.sin(p*Math.PI*8)*2*(1-p); },true).then(()=>{ T.off=0; }); break; }
    case 'wind': fxd(520,(c,p)=>{ c.globalAlpha=1-p; for(let i=0;i<3;i++){ const an=now()*0.02+i*2.09; c.strokeStyle='#e0fff4'; c.lineWidth=1; c.beginPath(); c.ellipse(x,y-6+i*4,14+i*2,5,0,an,an+2.4); c.stroke(); } for(let j=0;j<4;j++) dot(c,x+Math.sin(p*9+j)*14,y-16+j*7-p*10,2,j%2?'#9ad870':'#ffffff'); c.globalAlpha=1; }); break;
    case 'pull': blunt(); tween(300,p=>{ T.off=-d*Math.sin(p*Math.PI)*8; },true).then(()=>{ T.off=0; }); break;
    case 'net': fxd(900,(c,p)=>drawNet(c,x,y-4,24,p<0.75?1:(1-p)/0.25)); fx('spark',x,y-4,260); break;
    case 'herb': blunt(); fxd(620,(c,p)=>{ for(let i=0;i<10;i++){ const an=i*0.63+0.3, r=4+ease(p)*18; c.globalAlpha=0.9*(1-p); dot(c,x+Math.cos(an)*r,y-6+Math.sin(an)*r*0.7-p*8,i%3?2:3,i%2?'#8ad860':'#d8f0a0'); } c.globalAlpha=1; }); break;   /* 0.51.0 薬草の粉 */
    case 'soup': splash(0.8); fxd(800,(c,p)=>{ for(let i=0;i<4;i++){ const q=clamp01(p*1.3-i*0.12), xx=x-6+i*4+Math.sin(q*8+i)*2, yy=y-8-q*26; c.globalAlpha=0.7*Math.sin(q*Math.PI); dot(c,xx,yy,3,'#f4f4f4'); } c.globalAlpha=1; });   /* 0.51.0 熱いスープと湯気 */
      fxd(400,(c,p)=>{ for(let i=0;i<8;i++){ const an=-Math.PI*(0.15+0.7*hs(i)), v=10+hs(i+7)*12; c.globalAlpha=1-p; dot(c,x+Math.cos(an)*v*p,y-4+Math.sin(an)*v*p+20*p*p,2,i%2?'#f0a040':'#ffd080'); } c.globalAlpha=1; }); break;
    default: blunt();
  }
  fx('burst',x,y-8,380,{big});
}
/* 0.99.5 機械の威力の高い攻撃は派手に（11/25 ヒロさん「特に機械の攻撃アニメーションが地味。威力の高いものだけでも派手にしてほしい」「演出の派手さは中盤くらいの威力が30超えたあたりからでいいかもしれない」「60超えたらさらに派手にする感じがいいかな」「最初は今まで通り地味で良いよ」）。
   威力は攻撃方法の画面と同じ「力＋武装の強さ」。30未満＝今までどおり。
   1段（30以上）：ため＝少し暗くなり、機械が属性の色に光って粒が集まる。当たる＝属性の色の衝撃の輪・破片・強めのゆれ。
   2段（60以上）：ため＝もっと暗く、後ろへ流れる光の線、技の名前の帯。当たる＝画面が白く光る・光の柱・3重の輪・集中線・大きなゆれ・一瞬の間。
   「動きを減らす」では、暗くなるのと名前の帯と色の輪だけ（白い光・ゆれ・流れる線・集中線・光の柱なし）。乱数は使わない */
const ECOL={'打':'255,186,110','水':'120,200,255','光':'255,236,150','音':'214,190,255','網':'230,220,180'};
/* 0.101.0 段は与えたダメージで決める（11/25 ヒロさん「演出は50と100と150で変化するようにしよう。大技にかかわらずすべての攻撃がダメージで演出が派手になる。これは闇側も一緒」）。
   機械も生身も、味方も霧の側も。当たったら本当のダメージ（クリティカル込み）、外れたら当たったときの見込み（ev.pv）。3段（150以上）は2段に、2度目の白い光・地をはう衝撃・4重の輪・もっと大きなゆれを足す */
const BIG_POW=[50,100,150];
function bigLv(A,ev){ if(!ev.w||ev.net) return 0; const v=ev.hit?(ev.dmg||0):(ev.pv||0); return v>=BIG_POW[2]?3:v>=BIG_POW[1]?2:v>=BIG_POW[0]?1:0; }
function ecol(A,ev){ return ECOL[(ev.w&&ev.w.e)||A.u.elem]||'255,220,160'; }
async function bigCharge(A,T,ev,lv){
  const S=BT.S, col=ecol(A,ev), ms=lv>1?640:420, n=lv>1?16:10;
  S.big={name:ev.w.n,col,lv,t0:now(),d:dirOf(A),side:A===S.L?'L':'R'}; A.gcol=col; sfx('charge');
  fxd(ms,(c,p)=>{ const h=chest(A); for(let i=0;i<n;i++){ const an=i*6.283/n+hs(i)*0.3, r=(1-ease(clamp01(p*1.3-hs(i+3)*0.3)))*(40+hs(i+7)*26); if(r<=1) continue;
      c.globalAlpha=Math.min(1,p*3); dot(c,h.x+Math.cos(an)*r,h.y-6+Math.sin(an)*r*0.8,i%3?2:3,i%2?`rgb(${col})`:'#ffffff'); } c.globalAlpha=1;
    if(!calm()) glowAt(c,h.x,h.y-6,8+p*(lv>1?20:12),(lv>1?0.8:0.6)*p,col); });
  await tween(ms,p=>{ S.dim=(lv>1?0.62:0.35)*ease(p); A.glow=(lv>1?0.9:0.6)*p; },false);
}
function bigHit(A,T,ev,lv){
  const S=BT.S, col=ecol(A,ev), t=chest(T), x=t.x, y=t.y-4, L2=lv>1;
  sfx('big'); const L3=lv>2;
  if(!calm()){ quake(L3?11:L2?8:5,L3?900:L2?680:460);
    if(L3){ setTimeout(()=>{ if(BT.S===S) tween(260,p=>{ S.flash=0.5*(1-p); },false); },260*k());
      fxd(760,(c,p)=>{ c.globalCompositeOperation='lighter'; for(const s of [-1,1]){ const xx=x+s*ease(p)*150, w=Math.max(1,(1-p)*14); c.fillStyle=`rgba(${col},${0.8*(1-p)})`; c.fillRect(Math.round(xx-w/2),FY-6-w/3,Math.round(w),Math.round(6+w/3)); c.fillStyle=`rgba(255,255,255,${0.7*(1-p)})`; c.fillRect(Math.round(xx-w/6),FY-4,Math.max(1,Math.round(w/3)),4); } c.globalCompositeOperation='source-over'; }); }
    if(L2){ tween(300,p=>{ if(BT.S===S) S.flash=0.65*(1-p); },false);
      fxd(400,(c,p)=>{ c.globalAlpha=1-p; for(let i=0;i<22;i++){ const an=i*0.2856+hs(i)*0.2, r1=30+hs(i+5)*16+p*24, r2=r1+40+hs(i+9)*50; seg(c,x+Math.cos(an)*r1,y+Math.sin(an)*r1,x+Math.cos(an)*r2,y+Math.sin(an)*r2,i%3?1:2,i%2?'#ffffff':`rgb(${col})`); } c.globalAlpha=1; });
      fxd(620,(c,p)=>{ const w=Math.max(0,(1-ease(p))*22); if(w<1) return; c.globalCompositeOperation='lighter'; const g=c.createLinearGradient(x-w,0,x+w,0); g.addColorStop(0,`rgba(${col},0)`); g.addColorStop(0.5,`rgba(${col},${0.85*(1-p)})`); g.addColorStop(1,`rgba(${col},0)`); c.fillStyle=g; c.fillRect(x-w,0,w*2,FY+4);
        c.fillStyle=`rgba(255,255,255,${0.8*(1-p)})`; c.fillRect(Math.round(x-w/5),0,Math.max(1,Math.round(w/2.5)),FY+4); c.globalCompositeOperation='source-over'; }); } }
  const rings=L3?4:L2?3:2;
  fxd(720,(c,p)=>{ c.globalCompositeOperation='lighter'; for(let i=0;i<rings;i++){ const q=clamp01(p*1.5-i*0.18); if(q<=0||q>=1) continue; c.strokeStyle=`rgba(${col},${1-q})`; c.lineWidth=4-i; c.beginPath(); c.ellipse(x,y,8+q*(L3?80:L2?62:44),5+q*(L3?42:L2?34:24),0,0,7); c.stroke(); } c.globalCompositeOperation='source-over'; });
  const nd=L3?24:L2?16:10;
  fxd(780,(c,p)=>{ for(let i=0;i<nd;i++){ const an=-Math.PI*(0.05+0.9*hs(i)), v=(L2?20:14)+hs(i+30)*(L2?34:24), xx=x+Math.cos(an)*v*p*1.4, yy=y+Math.sin(an)*v*p+60*p*p; c.globalAlpha=1-p; dot(c,xx,yy,i%3?2:3,i%2?`rgb(${col})`:'#ffffff'); } c.globalAlpha=1; });
  fx('burst',x,y,560,{big:true}); if(L2) setTimeout(()=>{ if(BT.S===S) fx('burst',x,y-10,520,{big:true}); },140*k()); if(L3) setTimeout(()=>{ if(BT.S===S) fx('burst',x,y+6,560,{big:true}); },300*k());
}
function bigEnd(A){ const S=BT.S, d0=S.dim||0; return tween(320,p=>{ S.dim=d0*(1-p); },false).then(()=>{ S.dim=0; S.big=null; A.gcol=null; }); }
async function runAtk(ev){
  const A=sideOf(ev.a), T=sideOf(ev.t); if(!A||!T) return;
  ex(A,'resolve'); say(`${ev.an}の ${ev.w.n}！`); A.pose='atk'; BT.S.dodgeP=null;
  { const m0=A.mp; if(ev.mpA1!=null&&m0!=null&&ev.mpA1!==m0) await tween(220,p=>{ A.mp=lerp(m0,ev.mpA1,p); },false); }   /* 0.95.0 いまの棒から（ツバメの2回目で戻って見えないように） */
  const st=motionOf(ev,A); BT.S.motion=st;   // 0.21.0 型（試験で見る）
  const big=bigLv(A,ev); BT.S.bigMove=big; if(big) await bigCharge(A,T,ev,big);   /* 0.99.5 */
  const imp=await (MOT[st]||MOT.swing)(A,T,ev);
  if(ev.hit&&ev.net){   // 0.33.0 イカリの網：ダメージなしで止める
    sfx('hit'); impact(imp,A,T,ev); pop(T,ev.stun>1?`${ev.stun}ターン止めた`:'止めた','#e8f4ff',3); ex(T,'surprise'); T.pose='hurt';
    say(`${ev.tn}を 網で${ev.stun>1?` ${ev.stun}ターン`:''}止めた！`); await tween(480,()=>{},false); ex(T,'angry');
  } else if(ev.hit){
    sfx(ev.crit?'crit':'hit');
    impact(imp,A,T,ev);
    if(big){ bigHit(A,T,ev,big); await wait(big>2?260:big>1?170:80); }   /* 0.99.5 一瞬の間 */
    pop(T,'-'+ev.dmg,T.u.side==='enemy'?'#ffe060':'#ff8a7a',ev.crit?5:ev.dmg>=8||big>1?4:3); if(!big) quake(ev.dmg>=8?4:2.5,360);
    const sc=ev.crit?0.55:0.3; if(ev.crit) critMark(T);
    T.white=1; T.sh=1; BT.S.scr=calm()?0:sc; ex(T,'surprise'); T.pose='hurt';
    say((ev.crit?`クリティカル！ ${ev.tn}に ${ev.dmg} のダメージ！`:`${ev.tn}に ${ev.dmg} のダメージ！`)+(ev.guard==='def'?'（防御で半分）':''));   /* 0.44.0 */
    tween(320,p=>{ T.white=1-p; T.sh=1-p; BT.S.scr=calm()?0:sc*(1-p); },false);
    await tween(480,p=>{ T.hp=lerp(ev.hp0,ev.hp1,ease(p)); },false);
    ex(T,ev.hp1/T.maxHp<0.35?'sad':'angry');
    if(ev.mpA2!=null&&ev.mpA2>ev.mpA1){ pop(A,'+'+(ev.mpA2-ev.mpA1),'#ff9ad8'); say(`${ev.an}の${ev.res}が ${ev.mpA2-ev.mpA1} 戻った`); await tween(260,p=>{ A.mp=lerp(ev.mpA1,ev.mpA2,p); },false); }
    if(ev.cool){ pop(T,'-'+ev.cool,'#ff9ad8',3,-22); say(`${ev.tn}の${ev.tres}も ${ev.cool} 下がった`); await tween(360,p=>{ T.mp=lerp(ev.mpT0,ev.mpT1,ease(p)); },false); }   // 0.23.0 放水
    if(ev.push) say(`${ev.tn}を 1マス押し戻した`);
  } else {
    sfx('miss'); pop(T,'MISS','#9ae0ff'); say(`${ev.tn}は ${ev.guard==='eva'?'構えて ':''}かわした！`); ex(T,'smile'); ex(A,'surprise');
    if(BT.S.dodgeP) await BT.S.dodgeP; else await dodge(T);   // 飛ぶものは、途中でよけている
    BT.S.dodgeP=null; T.off=0; T.dy=0;
  }
  const o0=A.off, y0=A.dy; await tween(220,p=>{ A.off=o0*(1-ease(p)); A.dy=y0*(1-ease(p)); },true); A.off=0; A.dy=0; A.glow=0; A.pose='idle'; if(!ev.down) T.pose='idle';
  if(big) await bigEnd(A);   /* 0.99.5 */
  T.off=0; T.dy=0;
  await wait(380);
  if(ev.cooled){ sfx('calm'); ex(A,'smile'); say(`${ev.tn}の熱が下がり、灯が戻った！`);   // 0.23.0 放水で熱が0に
    await tween(800,p=>{ T.glow=Math.sin(p*Math.PI)+p*0.3; T.alpha=1-Math.max(0,p-0.5)*1.6; },false); T.glow=0; await wait(350); }
  if(ev.down){
    if(T.u.side==='enemy'||ev.tside==='enemy'){ say(`${ev.tn}を 倒した！ 霧が晴れていく`); ex(A,'smile'); ex(T,'sad'); poseFor(A,'cheer');   /* 0.51.0 倒したら両手を上げる */
      BT.S.scr=calm()?0:0.5; quake(5,520); fx('burst',cx(T),FY-40,520,{big:true}); await tween(700,p=>{ T.white=Math.min(1,p*2); T.alpha=1-p; BT.S.scr=calm()?0:0.5*(1-p); },false); }
    else { sfx('down'); say(`${ev.tn}は 倒れた……`); ex(T,'sad'); await tween(600,p=>{ T.alpha=1-p*0.6; },false); }
    await wait(350);
  }
}
/* 0.18.0 説得の光（11/7 ヒロさん「心の光を浴びせている感じ。味方が光る→光が大きくなり相手を包む→相手も薄く光り心ダメージ表示→光が味方にすっと収まる」）。
   S.lt＝場面に浮かぶ心の光（x,y＝まん中・r＝大きさ・a＝濃さ）。乱数は使わない */
async function runPer(ev){
  const P=sideOf(ev.via||ev.p), T=sideOf(ev.t); if(!P||!T) return;   // 0.27.0 大声は乗っている機械から
  const S=BT.S, Y=FY-40;
  ex(P,'resolve'); say(ev.via?`${ev.pn}の 大声！（${ev.via.name}に乗ったまま）`:`${ev.pn}の ${ev.m?'呼びかけ':'説得'}！`); sfx('talk');
  // ① 味方が光る（0.51.0 人は両手を上げて呼びかける）
  poseFor(P,'cheer');
  await tween(480,p=>{ P.glow=ease(p); P.white=0.35*p; P.talk=hasFace(P)?(Math.floor(p*5)%2):0; },false); P.talk=0;
  // ② 光が大きくなり、相手を包む
  S.lt={x:cx(P),y:Y,r:10,a:1};
  await tween(700,p=>{ const q=ease(p); S.lt.x=lerp(cx(P),cx(T),q); S.lt.r=lerp(12,58,q); P.glow=1-0.55*q; P.white=0.35*(1-q); },true);
  S.lt.x=cx(T); S.lt.r=58; P.white=0;
  if(ev.ok){
    // ③ 相手も薄く光り、心のダメージ
    await tween(320,p=>{ T.glow=0.45*p; },false);
    sfx(ev.crit?'crit':'talkHit'); pop(T,'-'+ev.v,'#ff9ad8',ev.crit?5:3); if(ev.crit){ critMark(T); ex(P,'smile'); }
    say(ev.crit?`クリティカル！ ${ev.tn}の${ev.res}が ${ev.v} 下がった`:`${ev.tn}の${ev.res}が ${ev.v} 下がった`);
    await tween(520,p=>{ T.mp=lerp(ev.mp0,ev.mp1,ease(p)); },false);
  } else { ex(P,'sad'); say(`${ev.pn}の声は、まだ届かなかった`); await tween(420,p=>{ T.off=Math.sin(p*Math.PI*3)*3; S.lt.a=1-0.45*p; },true); T.off=0; }
  // ④ 光が味方へ、すっと収まる
  const a0=S.lt.a;
  await tween(600,p=>{ const q=ease(p); S.lt.x=lerp(cx(T),cx(P),q); S.lt.r=lerp(58,7,q); S.lt.a=lerp(a0,0.8,q); T.glow=(ev.ok?0.45:0)*(1-q); },true);
  await tween(300,p=>{ P.glow=0.45+0.4*Math.sin(p*Math.PI); S.lt.a=0.8*(1-p); S.lt.r=7*(1-p); },false);
  S.lt=null; T.glow=0; P.glow=0; if(P.pose==='cheer') P.pose='idle';
  if(ev.ok){
    if(ev.calm){ sfx('calm'); ex(P,'smile'); say(ev.elif?'先頭の人が 霧から戻った！':`${ev.tn}を 呼び戻した！`);
      if(window.FX&&FX.wantsCutin(ev)){ const sk=BT.skip; BT.skip=false; await FX.persuadeCutin(ev); BT.skip=sk; }   // 0.6.0 影を呼び戻すたびにカットイン（11/6 ヒロさん）
      await tween(800,p=>{ T.glow=Math.sin(p*Math.PI)+p*0.3; T.alpha=1-Math.max(0,p-0.5)*1.6; },false); T.glow=0; }
  }
  await wait(400);
}
function rewardLines(pre){
  const out=[], R=pre.res;
  const add=(n,a,b)=>{ if(b>a) out.push(`<div class="rw"><span>${n}</span><b>+${b-a}</b></div>`); };
  add('灯のかけら',R.shards,G.shards); add('宝石',R.gems,G.gems); add('部品',R.parts,G.parts);
  for(const u of G.units){ const s=pre.units.get(u); if(!s||u.side!=='ally'||s.side!=='ally'||u.lv==null) continue;
    const got=(u.lv-s.lv)*RULES.exp.toNext+u.exp-s.exp; if(got<=0) continue;
    out.push(`<div class="rw"><span>${u.name} 経験値</span><b>+${got}</b><small>あと ${RULES.exp.toNext-u.exp} で Lv${u.lv+1}</small></div>`);
    if(u.lv>s.lv){ const up=LV_KEYS.filter(k=>s.stats[k]!=null&&u[k]>s.stats[k]).map(k=>`${LV_NAME[k]}+${u[k]-s.stats[k]}`);
      out.push(`<div class="rw lv"><span>${u.name}</span><b>Lv${u.lv} に上がった！</b><small>${up.join('　')}</small></div>`); } }
  return out;
}

/* 行動の前に、みんなの数字を写しておく */
window.btSnap=function(){
  const units=new Map(); for(const u of G.units){ const st={}; for(const k of LV_KEYS) if(u[k]!=null) st[k]=u[k];
    units.set(u,{name:u.name,side:u.side,hp:u.hp,maxHp:u.maxHp,mp:u.mp,maxMp:u.maxMp,ep:u.ep,maxEp:u.maxEp,lv:u.lv,exp:u.exp,stats:st}); }   /* 0.95.0 ep */
  return {units,res:{parts:G.parts,gems:G.gems,shards:G.shards}};
};
/* 0.6.0：カットイン（fx.js）が出ているあいだも on。押すとカットインだけ次へ進む */
window.BTL={get on(){ return BT.on||!!(window.FX&&FX.ciOn); }, get motion(){ return BT.S&&BT.S.motion||null; }, get big(){ return BT.S&&BT.S.bigMove||0; },   /* 0.99.11 big＝いまの攻撃の演出の段（試験で見る） */ skipNow(){ if(window.FX&&FX.ciOn) FX.skip(); else if(BT.on) BT.skip=true; }, pixText};
window.playBattle=async function(rec,pre){
  if(!rec||!rec.length) return;
  if(G.fast) return;
  if(SET.battle===false){ if(window.FX){ FX.mapRec(rec); await FX.cutinsFor(rec); } return; }   // 0.6.0 場面を見ないときは、マップの上にエフェクト＋カットインだけ
  const first=rec[0], a=first.k==='atk'?first.a:(first.via||first.p), t=first.t, sa=pre.units.get(a);   // 0.27.0 ケンタの大声は乗っている機械が場に立つ
  const L=(sa?sa.side:a.side)==='enemy'?a:t, R=L===a?t:a;
  BT.S={L:sideState(L,pre),R:sideState(R,pre),fx:[],pops:[],scr:0,terr:terrAt(t)};
  if(first.via){ const V=BT.S.L.u===first.via?BT.S.L:BT.S.R; V.faceU=first.p; }   // 顔と名札の下は、声を出している人
  plate($('bpL'),BT.S.L); plate($('bpR'),BT.S.R); $('btRw').innerHTML=''; $('btRw').classList.remove('show'); say('');
  /* 0.18.0 戦いの曲（11/7 ヒロさん「攻撃と説得の二種類」）。最初の行動で決める。終わったら前の曲へ（その間にクリアや負けの曲に変わっていたら戻さない） */
  const song=first.k==='atk'?'battleAtk':'battleTalk', prevSong=window.Sound?Sound.wanted:null;
  if(window.Sound) Sound.play(song);
  BT.on=true; BT.skip=false; BT.f=0; BT.prevFocus=document.activeElement;
  const box=$('bt'); box.classList.add('show'); try{ box.focus({preventScroll:true}); }catch(_){}
  let last=now(); BT.iv=setInterval(()=>{ if(now()-last>250){ BT.f++; last=now(); } drawScene(); },33); drawScene();
  await wait(calm()?150:350);
  for(const ev of rec){ if(ev.k==='atk') await runAtk(ev); else await runPer(ev); }
  BT.skip=false;
  const lines=rewardLines(pre);
  if(lines.length){ if(lines.some(l=>/class="rw lv"/.test(l))) sfx('levelup'); ex(BT.S.R,'smile'); $('btRw').innerHTML='<div class="rwh">手に入れた物</div>'+lines.join(''); $('btRw').classList.add('show'); say('手に入れた物（押すと閉じます）'); await wait(2600); }
  else await wait(500);
  clearInterval(BT.iv); BT.on=false; BT.skip=false; BT.S=null; box.classList.remove('show');
  if(window.Sound&&Sound.wanted===song){ const back=prevSong||(typeof sceneSong==='function'?sceneSong():null); if(back) Sound.play(back); else Sound.stop(); }
  if(BT.prevFocus&&document.contains(BT.prevFocus)) try{ BT.prevFocus.focus({preventScroll:true}); }catch(_){}
};
})();
