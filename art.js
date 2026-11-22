/* 灯守りの夜明け 絵（版 0.9.0・2026-11-06。0.9.0 で4章の絵：アマラ（イネスの形の色違い）・ウタカタ（コモリの形の色違い）のマップの絵と戦いの場面の立ち絵。顔の描き方と、いままでの人と機械の絵は変えていない。0.8.0 で3章の絵：水辺（浅瀬 w）・漁師の船（ART.drawBoat）・ダグニ（イネスの形の色違い）・ケンタ（ノアの形の色違い）・ミズハ（コモリの形の色違い）のマップの絵と戦いの場面の立ち絵。顔の描き方と、いままでの人と機械の絵は変えていない。0.7.0 で戦いの場面の立ち絵にキラン（ノアの形の色違い・ランタンのない長い棒）とカモメ（コモリの形の色違い）。コモリ・カモメの席のキランは黒い髪と赤い布。ノア・イネス・コモリの立ち絵と顔の描き方は変えていない。0.6.0 で2章の絵：キラン（ノアの形の色違い）・カモメ（コモリの形の色違い・止まっているときは灯が消える）・倉庫（B）と戸口（D）と石だたみ。顔の描き方は変えていない。版 0.5.9・セッション2。0.5.9 で斜めの顔をリアル寄りに（目を小さく細い線に・目の位置を少し上に・あごにえらの角）。0.5.8 で斜めの顔をイネスと仲間22人にも広げ、角度を人ごとに（25〜45度）。伸び縮みの向きと上下の向きはやめた。0.5.7 でノアの顔グラを、最初から斜めの形で描く一人一角度に（FE・スパロボ型。左向きは左右反転。まずノアだけ）。0.5.6 で顔グラに向き（ART.face の5つ目と6つ目：yaw -2〜2・pitch -1〜1）を足した。0.5.4 で戦いの場面の7頭身の立ち絵 ART.tall を足した。0.5.5 で機械の立ち絵も足した。0.5.1 でイネスの顔グラと ART.portrait を足した。0.5.2 で顔グラを描き直し、イネスを女の子らしく、ノアを男の子らしく分けた。0.5.3 で仲間22人の顔グラを足した）
   すべてコードで描く（外部の画像は使わない）。
   ・キャラ：16×24（頭の8ドットが上のマスへ）。男型・女型で描き分け。影は「光・明・中・暗」の4段
   ・輪郭：肌のまわりはこげ茶、服や髪のまわりはその色の暗い段
   ・地形：マスは16×16。海と砂浜、草と森、道と草の境目をつなぐ。高い物（木・家・灯台）は上のマスへはみ出す
   ・動き：波・灯台の灯・たき火・窓の灯・キャラの息（2コマ）。ART.tick を進めない限り止まる（「動きを減らす」）
   ・顔グラ：64×64（1.2・0.32.0 で 48×48 から）。ART.face(表情, まばたき, 口, 向き)。向きは 0 正面・正の数 右向き・負の数 左向き（0.5.8）。ゲームではまばたきは使わない（0.5.6） */
(function(){
'use strict';
const ART={tick:0};

/* ---------- 小さな道具 ---------- */
const HEXC={};
function rgb(c){ let v=HEXC[c]; if(v) return v; const n=parseInt(c.slice(1),16); v=[n>>16&255,n>>8&255,n&255]; HEXC[c]=v; return v; }
function lum(c){ const [r,g,b]=rgb(c); return r*0.3+g*0.59+b*0.11; }
function hash(x,y,s){ let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul((s|0)+1,1274126177); h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; }
function vnoise(x,y,sc,s){ const fx=x/sc,fy=y/sc,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);
  const a=hash(ix,iy,s),b=hash(ix+1,iy,s),c=hash(ix,iy+1,s),d=hash(ix+1,iy+1,s); return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy; }
function fbm(x,y,sc,s){ return vnoise(x,y,sc,s)*0.6+vnoise(x,y,sc/2,s+7)*0.3+vnoise(x,y,sc/4,s+13)*0.1; }
function canvas(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function rows2grid(rows){ return rows.map(r=>r.split('')); }
const D4=[[0,-1],[-1,0],[1,0],[0,1]];

/* ---------- キャラの描き方（区域の図＋自動の4段の影＋選んだ色の輪郭） ----------
   pal の書き方
     '#rrggbb'            … 決まった色（まわりに輪郭）
     {c:'#..', nol:true}   … 決まった色、輪郭を付けない（湯気など）
     {r:[光,明,中,暗], ol:'#..', cast:true}  … 4段で自動の影。ol＝輪郭の色（なければ「暗」）。cast＝下へ影を落とす（髪・えりなど）
   opt.fn(x,y,ch,lvl) … 段を手で変えたいときに返す（屋根の瓦など） */
function bake(rows,pal,opt){
  opt=opt||{};
  const g=Array.isArray(rows[0])?rows:rows2grid(rows);
  const H=g.length,W=g[0].length, cv=canvas(W,H), c=cv.getContext('2d'), img=c.createImageData(W,H), d=img.data;
  const at=(x,y)=>(x<0||y<0||x>=W||y>=H)?'.':g[y][x];
  const put=(x,y,col)=>{ const [r,gg,b]=rgb(col),i=(y*W+x)*4; d[i]=r; d[i+1]=gg; d[i+2]=b; d[i+3]=255; };
  const run=(x,y,dx,dy,ch)=>{ let n=0; while(at(x+dx*(n+1),y+dy*(n+1))===ch) n++; return n; };
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const ch=at(x,y); if(ch==='.') continue; const p=pal[ch]; if(p==null) continue;
    if(typeof p==='string'){ put(x,y,p); continue; }
    if(p.c){ put(x,y,p.c); continue; }
    const u=run(x,y,0,-1,ch),dn=run(x,y,0,1,ch),l=run(x,y,-1,0,ch),r=run(x,y,1,0,ch);
    const t=0.62*(dn+0.5)/(u+dn+1)+0.38*(r+0.5)/(l+r+1);
    let lvl=t>0.74?0:t>0.5?1:t>0.27?2:3;
    const ab=at(x,y-1); if(ab!=='.'&&ab!==ch&&pal[ab]&&pal[ab].cast) lvl=Math.min(3,lvl+1);
    if(p.min!=null) lvl=Math.max(lvl,p.min); if(p.max!=null) lvl=Math.min(lvl,p.max);
    if(opt.fn){ const v=opt.fn(x,y,ch,lvl); if(v!=null) lvl=v; }
    put(x,y,p.r[lvl]);
  }
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    if(at(x,y)!=='.') continue; let best=null,bl=1e9;
    for(const [dx,dy] of D4){ const ch=at(x+dx,y+dy); if(ch==='.') continue; const p=pal[ch]; if(p==null||p.nol) continue;
      const ol=typeof p==='string'?(opt.ol||'#2a1a20'):(p.ol||(p.r?p.r[3]:(opt.ol||'#2a1a20'))); const L=lum(ol); if(L<bl){ bl=L; best=ol; } }
    if(best) put(x,y,best);
  }
  c.putImageData(img,0,0); return cv;
}
/* 息（上半身を1ドット下げる2コマ目） */
function bob(src,split){ split=Math.round(split*TSC); const W=src.width,H=src.height,cv=canvas(W,H),c=cv.getContext('2d');   /* 0.51.0 縮めた人は区切りの行も縮める */
  c.drawImage(src,0,split,W,H-split,0,split,W,H-split); c.drawImage(src,0,0,W,split,0,1,W,split); return cv; }
function colorCount(cv){ const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,s=new Set(); for(let i=0;i<d.length;i+=4) if(d[i+3]) s.add(d[i]<<16|d[i+1]<<8|d[i+2]); return s.size; }
ART.colorCount=colorCount;

/* ---------- 1章の3人と敵（16×24） ---------- */
const SKIN_OL='#4a2418';
/* ノア（男型・肩が広い・まっすぐの胴・ズボン）。おでこにゴーグル、首に赤いえり巻き、右手に灯のランタン */
const NOA=[
"................",
".....hhhhhh.....",
"...hhhhhhhhhh...",
"..hhhhhhhhhhhh..",
"..hgllghhgllgh..",
"..hhsshsshsshh..",
"..hssssssssssh..",
"..hssessssessh..",
"..hssessssessh..",
"..hscsssssscsh..",
"...ssssmmssss...",
".....ssssss.....",
".....rrrrrr.....",
"..jjjjrrrrjjjj..",
".aajjjjrrjjjjaa.",
".aajjjjrjjjjjaa.",
".aajjjjjjjjjjaa.",
".ssjbbbbbbbbjss.",
"...jjjjjjjjjjy..",
"....ppppppppyfy.",
"....ppp..pppyfy.",
"....ppp..ppp.y..",
"...ttt....ttt...",
"................"];
const BRASS=['#fff0a0','#e8b850','#b07a30','#6a4420'];
const PAL_NOA={
  h:{r:['#d09a5a','#a06a3a','#764628','#4a2a1c'],cast:true},
  s:{r:['#ffeedd','#fcd2a8','#e6a87e','#b8785a'],ol:SKIN_OL},
  e:'#3a1c1c', c:'#f49a8a', m:'#a83c34',
  g:{r:BRASS}, l:{r:['#e8fcff','#e8fcff','#58b8e8','#58b8e8'],ol:BRASS[3]},
  r:{r:['#ff8a70','#ff8a70','#d84838','#8a2430'],cast:true},
  j:{r:['#ffd890','#f4a848','#cc7428','#84441c']}, a:{r:['#ffd890','#f4a848','#cc7428','#84441c']},
  b:{r:['#8a5a36','#8a5a36','#5a3824','#33201a']},
  p:{r:['#6e86c4','#6e86c4','#46589a','#283058']},
  t:{r:['#8a5a36','#8a5a36','#5a3824','#33201a']},
  y:{r:BRASS}, f:'#fffbe0'};
/* イネス（女型・肩が細い・くびれ・広がる裾・まつげ・ポニーテール）。頭に青緑のバンダナ、手にスパナ */
const INES=[
"................",
"................",
".....hhhhhh.....",
"...dddddddddd...",
"..hddddddddddhh.",
"..hhsshhhsshhhh.",
"..hsssssssssshh.",
"..hseesssseeshh.",
"..hssessssesshh.",
"..hscsssssscshh.",
"...ssssmmssss.h.",
".....ssssss...h.",
".......ss.....h.",
"....wwwoowww....",
"...wwooooooww...",
"...wwooooooww...",
"...ww.oooo.wwk..",
"...ss.oooo.ssk..",
"....oooooooo.k..",
"...oooooooooo...",
".....qq..qq.....",
".....qq..qq.....",
"....ttt..ttt....",
"................"];
const PAL_INES={
  h:{r:['#9a6a5a','#6a4038','#48282a','#2a161c'],cast:true},
  d:{r:['#a8f0d8','#48c8a8','#2a9480','#1a5a54'],cast:true},
  s:{r:['#fff0dc','#f4c89c','#d89a6c','#a86a48'],ol:SKIN_OL},
  e:'#2a1418', c:'#f08a80', m:'#b04040',
  w:{r:['#fffcf0','#f4ead2','#d4c4a0','#8a7a60']},
  o:{r:['#a8dcf8','#5aa8dc','#3a7cb4','#24507e'],cast:true},
  q:{r:['#6a5a7a','#6a5a7a','#463c58','#2a2238']},
  t:{r:['#9a6038','#9a6038','#643c26','#3a2218']},
  k:{r:['#eef4fa','#b4c0cc','#7a8898','#46505e']}};
/* コモリ（救助の機械・前と後ろの2席・頭の灯） */
const KOMORI=[
"................",
"................",
"................",
".......aa.......",
".......mm.......",
".....bbbbbb.....",
"...bbbbbbbbbb...",
"..bbggggggggbb..",
"..bggggggggggb..",
"..bggggggggggb..",
"..bggggggggggb..",
"..bbggggggggbb..",
".mbbbbbbbbbbbbm.",
".mrrrrrrrrrrrrm.",
".mbbbbbeebbbbbm.",
".mbbbbbbbbbbbbm.",
".m.bbbbbbbbbb.m.",
".mm.bbbbbbbb.mm.",
"....llllllll....",
"...ll......ll...",
"..lll......lll..",
"..llll....llll..",
"................",
"................"];
const PAL_KOMORI={
  b:{r:['#fffdf0','#ece4c6','#c4b892','#80745a']},
  r:{r:['#ffc070','#f09030','#c86420','#7a3c16']},
  g:{r:['#d8f4ff','#7ec0e4','#4a88b8','#2a4e78'],ol:'#3a4250'},
  m:{r:['#d4d8e0','#9aa0ac','#6a7080','#3a3e4a']},
  l:{r:['#8a90a0','#5a6070','#3e4250','#24262e']},
  e:'#fff4b0', a:'#ffd25a'};
/* 0.6.0 2章の2人。キラン（ノアの形・黒い髪・浅黒い肌・赤い上着と額の赤い布・手に棒）と、カモメ（コモリの形・白い胴に黄色の帯・頭の灯は青） */
const PAL_KIRAN=Object.assign({},PAL_NOA,{
  h:{r:['#4a4a52','#2a2a30','#18181c','#0c0c10'],cast:true},
  s:{r:['#f0c8a0','#d49a6c','#b0744c','#7e5034'],ol:SKIN_OL},
  g:{r:['#ff8a7a','#e04a40','#a8303a','#6a1e2a']}, l:{r:['#ff8a7a','#ff8a7a','#e04a40','#e04a40'],ol:'#6a1e2a'},
  r:{r:['#fff0dc','#f0dcc0','#c8b090','#8a7458'],cast:true},
  j:{r:['#ff9a8a','#d8544c','#a83a3a','#6a2028']}, a:{r:['#ff9a8a','#d8544c','#a83a3a','#6a2028']},
  p:{r:['#7a7064','#7a7064','#544c44','#342e2a']},
  y:{r:['#d8a868','#b07a44','#86582e','#5a3a1e']}, f:'#d8a868'});
const PAL_KAMOME=Object.assign({},PAL_KOMORI,{
  b:{r:['#ffffff','#e4ecf4','#b4c2d2','#6e7c90']},
  r:{r:['#fff4a0','#ffd84a','#e0a828','#8a6418']},
  a:'#9ae4ff'});
/* 0.8.0 3章の3人。ダグニ（イネスの形・金の三つ編み・赤い鉢巻き・青い上着・手に櫂）、
   ケンタ（ノアの形・黒いつんつん頭・日焼け・黄色い雨合羽・手に竿）、ミズハ（コモリの形・青い胴に白い帯・頭の灯は水色） */
const WOOD=['#e0b07a','#c08a56','#946640','#5e3e28'];
const PAL_DAGNY=Object.assign({},PAL_INES,{
  h:{r:['#fff4b8','#e8d070','#b89a40','#7a6228'],cast:true},
  d:{r:['#ff9a8a','#d84a3a','#a8303a','#6a1e2a'],cast:true},
  o:{r:['#8ab4e8','#4a74b4','#2e4c84','#1a2c56'],cast:true},
  q:{r:['#5a5048','#5a5048','#3e3630','#26201c']},
  k:{r:WOOD}});
const PAL_KENTA=Object.assign({},PAL_NOA,{
  h:{r:['#5a4a42','#3a2e2a','#241c1a','#140e0c'],cast:true},
  s:{r:['#f8d8b0','#e0aa78','#bc8458','#8a5a3a'],ol:SKIN_OL},
  g:{r:['#5a4a42','#3a2e2a','#241c1a','#140e0c']}, l:{r:['#5a4a42','#3a2e2a','#241c1a','#140e0c']},
  r:{r:['#d8f4ff','#7ec0e4','#4a88b8','#2a4e78'],cast:true},
  j:{r:['#fff4a0','#ffd84a','#e0a828','#8a6418']}, a:{r:['#fff4a0','#ffd84a','#e0a828','#8a6418']},
  p:{r:['#4a5a7a','#4a5a7a','#2e3a56','#1a2238']},
  y:{r:WOOD}, f:'#c08a56'});
const PAL_MIZUHA=Object.assign({},PAL_KOMORI,{
  b:{r:['#d8f0ff','#8ac4ec','#5a90c8','#2e5688']},
  r:{r:['#ffffff','#e4ecf4','#b4c2d2','#6e7c90']},
  a:'#9af4ff'});
/* 0.9.0 4章の2人。アマラ（イネスの形の色違い・黒い髪・濃い肌・桃色の髪飾り・山吹の上着・紫のすそ・手に金の鈴）、
   ウタカタ（コモリの形の色違い・薄紫の胴に桃色の帯・頭の灯は桃色） */
const PAL_AMARA=Object.assign({},PAL_INES,{
  h:{r:['#4a3a3a','#2a2020','#181212','#0c0808'],cast:true},
  s:{r:['#d8a07a','#a8704a','#7e4e30','#52301c'],ol:SKIN_OL},
  d:{r:['#ffc0d0','#f06a8a','#c03a5a','#7a2038'],cast:true},
  o:{r:['#fff0a0','#f0b440','#c07a20','#7a4a14'],cast:true},
  q:{r:['#9a5aaa','#9a5aaa','#6a3a7a','#3e1e4a']},
  k:{r:['#fff4a0','#ffd84a','#e0a828','#8a6418']}});
const PAL_UTAKATA=Object.assign({},PAL_KOMORI,{
  b:{r:['#f8f0ff','#dcccf4','#ac98d4','#6a5a92']},
  r:{r:['#ffd0e0','#f088b0','#c85888','#7a2a50']},
  a:'#ffb4dc'});
/* 0.17.0 5章の2人。エリフ（イネスの形の色違い・顔グラに合わせて明るい茶の髪・明るい肌・青緑の上着・濃い灰のすそ・手に真ちゅうの小さな灯。髪留めは髪の色で目立たせない）、
   アカリ（コモリの形の色違い・紺の胴に金の帯・頭の灯は明るい黄） */
const PAL_ELIF=Object.assign({},PAL_INES,{
  h:{r:['#c08a5a','#9a6038','#6e4024','#42240f'],cast:true},
  s:{r:['#f8dcc0','#e8c09c','#c49670','#8a6444'],ol:SKIN_OL},
  d:{r:['#c08a5a','#9a6038','#6e4024','#42240f'],cast:true},
  o:{r:['#a8d4d0','#6aa4a0','#467a78','#2a4e4e'],cast:true},
  q:{r:['#4a4a6a','#4a4a6a','#30304a','#1c1c30']},
  k:{r:['#fff4a0','#ffd84a','#e0a828','#8a6418']}});
const PAL_AKARI=Object.assign({},PAL_KOMORI,{
  b:{r:['#c8d4f0','#7a8cc4','#4a5c94','#2a3660']},
  r:{r:['#fff4a0','#ffd84a','#e0a828','#8a6418']},
  a:'#fff070'});
/* 0.32.0 6章のスパナ（コモリの形・銅色の胴に鋼の帯・頭の灯はだいだい）。今まではコモリと同じ色だった */
const PAL_SPANA=Object.assign({},PAL_KOMORI,{
  b:{r:['#f4cc94','#d49c5c','#a46c38','#64401e']},
  r:{r:['#d4dce8','#94a4b8','#64748a','#38404e']},
  a:'#ffb048'});
/* 0.33.0 7章の3人。シオネ（ノアの形・黒い短い髪・濃い肌・紺の上着・水色のえり巻き・手に櫂）、
   ナミノリ（コモリの形・青緑の胴に白い帯・頭の灯は水色・背中に波乗りの板）、イカリ（コモリの形・鉄色の胴に赤さびの帯・頭の灯はだいだい・背中に巻いた綱・胸に錨のしるし）。形と色は仮 */
const PAL_SIONE=Object.assign({},PAL_KENTA,{
  h:{r:['#4a4a52','#2a2a30','#18181c','#0c0c10'],cast:true},
  s:{r:['#e0a878','#b07a4c','#86582e','#5a3a1e'],ol:SKIN_OL},
  g:{r:['#4a4a52','#2a2a30','#18181c','#0c0c10']}, l:{r:['#4a4a52','#2a2a30','#18181c','#0c0c10']},
  r:{r:['#b0f4ff','#4cc4e4','#2a8cb4','#185a7c'],cast:true},
  j:{r:['#7c94bc','#425884','#2a3c5e','#16223a']}, a:{r:['#7c94bc','#425884','#2a3c5e','#16223a']},
  p:{r:['#5a5248','#5a5248','#3e3830','#26221e']}});
const PAL_NAMINORI=Object.assign({},PAL_KOMORI,{
  b:{r:['#d0fbf4','#7ad8d0','#40a8a8','#22686e']},
  r:{r:['#ffffff','#e4ecf4','#b4c2d2','#6e7c90']},
  a:'#a8f0ff'});
const PAL_IKARI=Object.assign({},PAL_KOMORI,{
  b:{r:['#c8d0dc','#8a96aa','#5a6478','#343a48']},
  r:{r:['#f4a080','#c8603e','#94402a','#5a2418']},
  a:'#ffc070'});
/* 0.34.0 8章のモリヒト（コモリの形・深い青の胴に白い帯・頭の灯は水色・背中の大きなしずく砲・胸に二重のしずく・腕の先に太い筒先）。形と色は仮 */
const PAL_MORIHITO=Object.assign({},PAL_KOMORI,{   /* 0.87.0 胴を設計書の「深い青」に近づけて濃く（ミズハ・シャボンと見分けやすく・仮） */
  b:{r:['#8cc0e8','#2e78c0','#1c5290','#0e2e5a']},
  r:{r:['#ffffff','#e8eef4','#b8c4d0','#707c8c']},
  a:'#9ae8ff'});
/* 0.36.0 9章の4人。ルカ（ノアの形・銅色のはね髪・オリーブの肌・緑の帽子・クリーム色の上着に緑のえり巻き・茶の配達かばんの肩ひも）、
   ルチア（イネスの形・銅色の髪と髪留め・オリーブの肌・若葉色の上着で兄と見分ける・手に黄の小包）、
   ツバメ（コモリの形・濃い紺の胴に白い帯・頭の灯は水色・尾の二又）、カササギ（コモリの形・黒い胴に白い帯・青緑の差し色・胸の前に光る品の籠・細い脚）。色は仮 */
const PAL_LUCA=Object.assign({},PAL_NOA,{   // 0.36.0 ルカ
  h:{r:['#f0a870','#c8703c','#94481f','#5a2a12'],cast:true},
  s:{r:['#f4d4a0','#d4a870','#a87c4c','#76502e'],ol:SKIN_OL},
  g:{r:['#a8f0a0','#58c860','#34944a','#1e5e32']}, l:{r:['#a8f0a0','#a8f0a0','#58c860','#58c860'],ol:'#163a18'},
  r:{r:['#b8f8b0','#58c860','#34944a','#1e5e32'],cast:true},
  j:{r:['#fffbe8','#f0e4b8','#c8b47c','#84703c']}, a:{r:['#fffbe8','#f0e4b8','#c8b47c','#84703c']},
  p:{r:['#4a6a64','#4a6a64','#30484a','#1c2e30']},
  y:{r:['#fff07a','#f0c838','#d8a020','#8a6418']}, f:'#fff07a'});
const PAL_LUCIA=Object.assign({},PAL_INES,{   // 0.36.0 ルチア
  h:{r:['#f0a870','#c8703c','#94481f','#5a2a12'],cast:true},
  d:{r:['#f0a870','#c8703c','#94481f','#5a2a12'],cast:true},
  s:{r:['#f4d4a0','#d4a870','#a87c4c','#76502e'],ol:SKIN_OL},
  o:{r:['#c8f4b0','#78d070','#48a050','#2a6a38'],cast:true},
  q:{r:['#4a6a64','#4a6a64','#30484a','#1c2e30']},
  k:{r:['#fff07a','#f0c838','#d8a020','#8a6418']}});
/* 0.37.0 10章の2人。ペマ（イネスの形・黒い髪・日焼けした肌・赤いえり巻きと赤茶の上着・手に小さな白い鳥）、
   フェリクス（ノアの形・灰色がかった明るい髪・白い肌・深緑の上着に茶のえり巻き・牧人の杖）。色は仮 */
const PAL_PEMA=Object.assign({},PAL_INES,{   // 0.37.0 ペマ
  h:{r:['#4a4440','#2a2420','#181412','#0c0a08'],cast:true},
  d:{r:['#ff9a8a','#e84a4a','#b0303a','#6a1e2a'],cast:true},
  s:{r:['#f4d0a0','#d8a470','#b07a4c','#7a5232'],ol:SKIN_OL},
  o:{r:['#f0a888','#c8604a','#984036','#5e2622'],cast:true},
  q:{r:['#5a4a3a','#5a4a3a','#3e3228','#26201a']},
  k:{r:['#ffffff','#eef2f6','#c0c8d4','#7a8494']}});
const PAL_FELIX=Object.assign({},PAL_NOA,{   // 0.37.0 フェリクス
  h:{r:['#e8e4d8','#c4beb0','#9a9486','#6a6458'],cast:true},
  s:{r:['#fff4e8','#f8dcc4','#e0b498','#b08068'],ol:SKIN_OL},
  g:{r:['#c8a878','#9a7a4c','#6e5434','#46341e']}, l:{r:['#c8a878','#c8a878','#9a7a4c','#9a7a4c'],ol:'#46341e'},
  r:{r:['#d8b890','#b08a5a','#86643c','#5a4024'],cast:true},
  j:{r:['#a8c890','#6a8a5a','#4a6a3e','#2e4426']}, a:{r:['#a8c890','#6a8a5a','#4a6a3e','#2e4426']},
  p:{r:['#6a6058','#6a6058','#4a423c','#2e2824']},
  y:{r:['#d8a868','#b07a44','#86582e','#5a3a1e']}, f:'#d8a868'});
const PAL_TSUBAME=Object.assign({},PAL_KOMORI,{   // 0.36.0 ツバメ
  b:{r:['#8aa4d8','#3e5a9c','#24366a','#121c40']},
  r:{r:['#ffffff','#f0f4fa','#c4d0e0','#7a8aa4']},
  a:'#a8e4ff'});
const PAL_KASASAGI=Object.assign({},PAL_KOMORI,{   // 0.36.0 カササギ
  b:{r:['#6a6e7c','#363842','#1e2028','#0e1014']},
  r:{r:['#ffffff','#eef2f4','#bcc8cc','#76848a']},
  a:'#44e8cc',
  k:{r:['#fffbb0','#ffe650','#f0b820','#a87810']},
  n:{r:['#d8a870','#a87844','#7a5230','#4a3018']}});
/* 0.39.0 11章の3人。オユナ（イネスの形・ポニーテールをなくして灰色のまとめ髪・日焼けした肌・深い青の長い上着に金の帯・手に薬草の束）、
   ハナ（イネスの形・濃い茶の髪・白い肌・すもも色の服にクリーム色の前掛け・腰に紫の香り袋）、
   シャボン（コモリの形・淡い水色の胴にうす紫の帯・胴に小さな泡の丸・右の肩に泡の吹き口・頭の灯は水色）。色は仮 */
const OYUNA=INES.map((r,i)=>i>=10&&i<=12?r.replace('h','.'):i===15?"...wwzzzzzzww...":r);   /* 0.39.0 オユナ 後ろの結びをなくして胴に帯 */
const HANA=INES.map((r,i)=>i===16?"...ww.oaao.wwk..":i===17?"...ss.oaao.ssk..":i===18?"....ooaaaaoo.k..":i===19?"...oooaaaaooo...":r);   /* 0.39.0 ハナ 前掛け */
const PAL_OYUNA=Object.assign({},PAL_INES,{   /* 0.39.0 オユナ */
  h:{r:['#ffffff','#d6d8e0','#a6aab8','#707686'],cast:true},
  d:{r:['#ffffff','#d6d8e0','#a6aab8','#707686'],cast:true},
  s:{r:['#f8dcb4','#e6b47c','#c88c56','#a06a3e'],ol:SKIN_OL},
  o:{r:['#f0b480','#c87a4a','#9a5432','#5e301c'],cast:true},
  w:{r:['#cce4a4','#8aac5c','#5e7c3c','#384e24']},
  z:{r:['#cce4a4','#8aac5c','#5e7c3c','#384e24']},
  q:{r:['#5e301c','#5e301c','#40200e','#26120a']},
  k:{r:['#d8f0a0','#88c058','#5a9038','#34601e']}});   /* 0.39.0 顔の表(FSPEC)に合わせた色：灰の髪・日焼けの肌・だいだいの上着・緑のショールと帯 */
const PAL_HANA=Object.assign({},PAL_INES,{   /* 0.39.0 ハナ */
  h:{r:['#88a0d0','#44507e','#2c3458','#1c203a'],cast:true},
  d:{r:['#88a0d0','#44507e','#2c3458','#1c203a'],cast:true},
  s:{r:['#fff2e4','#fcd6b0','#eeb488','#d08c66'],ol:SKIN_OL},
  o:{r:['#e8d8ff','#b49ae0','#8070b4','#4e447a'],cast:true},
  w:{r:['#ffffff','#e4e8f0','#c4c8d4','#8a8ea0']},
  a:{r:['#ffffff','#e4e8f0','#c4c8d4','#8a8ea0']},
  q:{r:['#4e447a','#4e447a','#34305a','#201c38']},
  k:{r:['#c8ee9c','#5ea04a','#2c5a2a','#183418']}});   /* 0.39.0 顔の表(FSPEC)に合わせた色：青黒い髪・白い肌・薄紫の服・白い前掛けと袖・緑の香り袋 */
/* 0.40.0 12章 ジュン（旅人・無口な青年。ノアの形・黒い乱れ髪・白い肌・灰色の旅の外套と高い襟・明るいボタン。ゴーグルは付けず髪の色に溶かす。色は顔の表FSPECに合わせた仮） */
const PAL_JUN=Object.assign({},PAL_NOA,{
  h:{r:['#4a4a56','#2a2a32','#1a1a20','#0c0c10'],cast:true},
  s:{r:['#fff2e8','#fcdcc4','#e8b898','#b8826a'],ol:SKIN_OL},
  g:{r:['#4a4a56','#2a2a32','#1a1a20','#0c0c10']}, l:{r:['#4a4a56','#2a2a32','#1a1a20','#0c0c10'],ol:'#0c0c10'},
  r:{r:['#c8ccd8','#a4a8b4','#666c7c','#42464f'],cast:true},
  j:{r:['#a4a8b4','#666c7c','#42464f','#26282f']}, a:{r:['#a4a8b4','#666c7c','#42464f','#26282f']},
  b:{r:['#5a5e6c','#5a5e6c','#3c404c','#24262e']},
  p:{r:['#5a5e6c','#5a5e6c','#3c404c','#24262e']},
  t:{r:['#4a4048','#4a4048','#32282e','#1e181c']},
  y:{r:['#ffffff','#e0e4f0','#b4bad0','#7a809a']}, f:'#e0e4f0'});
/* 0.41.0 13章 クワメ（森の食堂の主人・料理番。ノアの形を作り替え：上の段を白いコック帽に・頬からあごに黒いひげ・胴の前に白い前かけ。
   濃い肌・短く刈った黒髪・赤茶の上着・からし色の首巻き。色は顔の表FSPECに合わせた仮） */
const KWAME=NOA.slice();
KWAME[0]=".....WWWWWW.....";KWAME[1]="...WWWWWWWWWW...";KWAME[2]="..WWWWWWWWWWWW..";KWAME[3]="..WWWWWWWWWWWW..";KWAME[4]="..hhhhhhhhhhhh..";
KWAME[9]="..hscshhhhscsh..";KWAME[10]="...shhhmmhhhs...";KWAME[11]=".....shhhhs.....";
KWAME[15]=".aajjjWWWWjjjaa.";KWAME[16]=".aajjjWWWWjjjaa.";KWAME[17]=".ssjWWWWWWWWjss.";KWAME[18]="...jjWWWWWWjjy..";
const PAL_KWAME=Object.assign({},PAL_NOA,{
  h:{r:['#4a4a52','#2a2a30','#18181c','#0c0c10'],cast:true},
  s:{r:['#c08460','#8a5636','#643a22','#402414'],ol:SKIN_OL},
  g:{r:['#4a4a52','#2a2a30','#18181c','#0c0c10']}, l:{r:['#4a4a52','#2a2a30','#18181c','#0c0c10'],ol:'#0c0c10'},
  W:{r:['#ffffff','#eef0f6','#c8ccdc','#8e94a8']},
  r:{r:['#fff0a0','#f0c040','#c08a20','#7a5410'],cast:true},
  j:{r:['#e89070','#b85a38','#8a3c24','#58241a']}, a:{r:['#e89070','#b85a38','#8a3c24','#58241a']},
  b:{r:['#8a5a36','#8a5a36','#5a3824','#33201a']},
  p:{r:['#5a5e6c','#5a5e6c','#3c404c','#24262e']},
  t:{r:['#4a4048','#4a4048','#32282e','#1e181c']}});
/* 0.49.0 デウィ（14章・料理番・屋台をひく元気な女の人。イネスの形を作り替え：ポニーテールをなくして頭の上におだんご・だいだいのヘアバンド・黄色い上着に赤いエプロン・手に小さな鉄べら。
   日焼けした肌・黒っぽい髪。色は顔の表FSPECに合わせた仮） */
const DEWI=INES.slice();
DEWI[0]="................";DEWI[1]="......hhhh......";DEWI[2]=".....hhhhhh.....";DEWI[3]="...hhhhhhhhhh...";DEWI[4]="..dddddddddddd..";
DEWI[5]="..hhsshhhsshhh..";DEWI[6]="..hssssssssssh..";DEWI[7]="..hseesssseesh..";DEWI[8]="..hssessssessh..";DEWI[9]="..hscsssssscsh..";
DEWI[10]="...ssssmmssss...";DEWI[11]=".....ssssss.....";DEWI[12]=".......ss.......";
const PAL_DEWI=Object.assign({},PAL_INES,{
  h:{r:['#5a4038','#34241e','#201410','#100a08'],cast:true},
  d:{r:['#ffd0b0','#f88850','#d05a30','#8a3418'],cast:true},
  s:{r:['#f4c890','#d49c62','#a8703e','#76482a'],ol:SKIN_OL},
  w:{r:['#fff0b0','#f4d060','#d0a438','#8c6c1c']},
  o:{r:['#ffaca4','#f05c54','#c03a3c','#7a2028'],cast:true},
  q:{r:['#7a5a4a','#7a5a4a','#523c32','#322320']}});
/* 0.53.0 17章 ミレイユ（記録係。デウィの形を作り替え：ヘアバンドをなくして赤茶のおだんご・赤い縁の眼鏡・青灰の上着に白い襟と赤いタイ・紺のスカート・手に記録帳。
   色は顔の表FSPECに合わせた仮） */
const MIREILLE=DEWI.slice();
MIREILLE[4]="..hhhhhhhhhhhh..";MIREILLE[7]="..hgeeggggeegh..";
MIREILLE[13]="....wwwyywww....";MIREILLE[14]="...wwwwrrwwww...";MIREILLE[15]="...wwwwrrwwww...";
const PAL_MIREILLE=Object.assign({},PAL_INES,{
  h:{r:['#ffac80','#dc6440','#a8402a','#74281e'],cast:true},
  d:{r:['#ffac80','#dc6440','#a8402a','#74281e'],cast:true},
  s:{r:['#fff4ec','#fcdcc8','#ecb8a0','#c08a74'],ol:SKIN_OL},
  g:'#6a2a3a', y:'#f4f6fc', r:'#c83448',
  w:{r:['#a8b8d8','#6a7ca8','#465878','#2a344c']},
  o:{r:['#6a7ca8','#465878','#2e3a58','#1c2438'],cast:true},
  q:{r:['#2e3a58','#2e3a58','#1e2840','#121828']},
  k:{r:['#f8eccc','#d8b884','#a8844e','#6a5030']}});
/* 0.54.0 18章 ライラ（記録係・夜回りの人。INES の形を作り替え：バンダナをなくして夜色のうねる長い髪・小麦色の肌・藍の上着・右手に小さな手提げランタン）。色は顔の表FSPECの layla に合わせた仮 */
const LAYLA=INES.slice();
LAYLA[3]="...hhhhhhhhhh...";LAYLA[4]="..hhhhhhhhhhhh..";
LAYLA[10]="..hssssmmssss.hh";LAYLA[11]=".hh..ssssss..hh.";LAYLA[12]=".hh....ss....hh.";
LAYLA[13]=".hh.wwwoowww.hh.";LAYLA[14]=".hhwwooooooww.h.";LAYLA[15]="..hwwooooooww.h.";
LAYLA[16]=".hhww.oooo.wwk..";LAYLA[17]="..hss.oooo.ssy..";LAYLA[18]="..h.oooooooo.k..";
const PAL_LAYLA=Object.assign({},PAL_INES,{
  h:{r:['#5c4e94','#3a3264','#241e42','#120e22'],cast:true},
  d:{r:['#5c4e94','#3a3264','#241e42','#120e22'],cast:true},
  s:{r:['#ecbc8c','#cc8e5c','#a8683c','#804a28'],ol:SKIN_OL},
  w:{r:['#c0c6f4','#8c94d4','#5c64b0','#3c407e']},
  o:{r:['#5c64b0','#3c407e','#2c3068','#1a1c3c'],cast:true},
  q:{r:['#22244e','#22244e','#181a38','#0e1022']},
  t:{r:['#5a4a3a','#5a4a3a','#3a2e24','#221a14']},
  y:'#ffe890',
  k:{r:['#fff0a0','#ffd84a','#e0a828','#8a6418']}});
/* 0.56.0 19章 ゾエ（旅の案内人。INES の形を作り替え：バンダナをなくして濃い茶の巻き毛と左うしろの短いポニーテール・笑顔（口角を上げる）・橙の旅の上着に生成りのシャツ・肩からななめの革のかばんの帯と腰のかばん・茶のズボンと長靴・右手に先が矢印の板になった木の杖（道しるべ）。色は顔の表FSPECの zoe に合わせた仮） */
const ZOE=INES.slice();
ZOE[3]="...hhhhhhhhhh...";
ZOE[4]="..hhhhhhhhhhhh..";
ZOE[5]="..hhsshhhsshhh..";
ZOE[6]="..hssssssssssh..";
ZOE[7]=".hhseesssseesh..";
ZOE[8]=".hhssessssessh..";
ZOE[9]=".hhscsmssmscsh..";
ZOE[10]=".hhssssmmssss...";
ZOE[11]=".hh..ssssss...a.";
ZOE[12]=".......ss..aaaaa";
ZOE[13]="....gwwyywww.ka.";
ZOE[14]="...wwgyyyyowwk..";
ZOE[15]="...wwogyyoowwk..";
ZOE[16]="...ww.ogoo.wwk..";
ZOE[17]="...ss.ooog.ssk..";
ZOE[18]="....oooooggg.k..";
ZOE[19]="....qqqqqggg.k..";
ZOE[20]=".....qq..qq..k..";
ZOE[21]=".....tt..tt..k..";
ZOE[22]="....ttt..ttt.k..";
const PAL_ZOE=Object.assign({},PAL_INES,{
  h:{r:['#6a4430','#4a2c1c','#321c10','#1c0e08'],cast:true},
  d:{r:['#6a4430','#4a2c1c','#321c10','#1c0e08'],cast:true},
  s:{r:['#f2cca0','#e0b088','#bc8860','#926440'],ol:SKIN_OL},
  e:'#8a4c1c', c:'#ee8c6c', m:'#a8382c',
  w:{r:['#f8bc80','#e08a3a','#b8602a','#7c3c18']},
  o:{r:['#e08a3a','#c8702c','#a05020','#6a3414'],cast:true},
  y:{r:['#fffbea','#f2e6c8','#d0bf98','#8a7a5c']},
  g:{r:['#c08850','#9a6234','#6a4020','#402412']},
  q:{r:['#8a5c38','#8a5c38','#5e3c22','#3a2414']},
  t:{r:['#5a3a22','#5a3a22','#3a2414','#20140c']},
  a:{r:['#f4d8a0','#d8aa64','#a8783a','#6a4a22']},
  k:{r:['#d8a468','#a8743c','#7a4e24','#46281a']}});
/* 0.57.0 20章 リン（旅芸人の一座の先頭・歌い手。INES の形を作り替え：バンダナをなくして黒髪のまとめ髪（頭の上に小さなまげ）・白っぽい舞台化粧（頬の紅と目元の赤い影）・深い紅の長い衣装に金の帯・右手に開いた扇。色は index.html の body と hair に合わせた仮） */
const LINH=[
"................",
"................",
"......hhhh......",
"...hhhhhhhhhh...",
"..hhhhhhhhhhhh..",
"..hhsshhhsshhh..",
"..hspssssssphh..",
"..hseesssseesh..",
"..hssessssessh..",
"..hscsssssscsh..",
"...ssssmmssss...",
".....ssssss.fff.",
".......ss...fff.",
"....wwwoowww.kf.",
"...wwoooooowwk..",
"...wwooyyoowwk..",
"...ww.oooo.wwk..",
"...ss.oooo.ssk..",
"....oooooooo....",
"...oooooooooo...",
"...oooooooooo...",
".....qq..qq.....",
"....ttt..ttt...."];
const PAL_LINH=Object.assign({},PAL_INES,{
  h:{r:['#4a4058','#2c2438','#1a1424','#0c0810'],cast:true},
  d:{r:['#4a4058','#2c2438','#1a1424','#0c0810'],cast:true},
  s:{r:['#ffffff','#fff4ee','#f2d8d0','#c8a09c'],ol:SKIN_OL},
  e:'#1a1018', c:'#ec5a74', m:'#b8203c', p:'#d8344a',
  w:{r:['#e890b0','#cc5a86','#b8406e','#7c2448']},
  o:{r:['#d8709a','#b8406e','#8c2a52','#5a1a36'],cast:true},
  y:{r:['#fff0a0','#f4cc48','#c89420','#8a6418']},
  f:{r:['#ffffff','#fff4dc','#ecd090','#a88a48']},
  a:{r:['#ffffff','#fff4dc','#ecd090','#a88a48']},
  q:{r:['#6a2040','#6a2040','#4a1430','#2c0a1c']},
  t:{r:['#3a2a30','#3a2a30','#241a20','#140e12']},
  k:{r:['#d8a468','#a8743c','#7a4e24','#46281a']}});
/* 0.61.0 25章 ベルタ（北の街道の宿の料理番・たのもしく温かい30代後半の女の人。デウィの形を作り替え：ヘアバンドをなくして赤茶のゆったりしたおだんご・深緑の服に生成りのエプロン・右手にお玉（鉄）。
   肌は明るい色・頬の紅と口もとの笑み。色は index.html の body（深緑）と hair（赤茶）に合わせた仮） */
const BERTA=DEWI.slice();
BERTA[0]=".....hhhhhh.....";BERTA[1]="....hhhhhhhh....";BERTA[2]="....hhhhhhhh....";BERTA[3]="...hhhhhhhhhh...";BERTA[4]="..hhhhhhhhhhhh..";
BERTA[13]="....wwwaawww....";BERTA[14]="...wwwaaaawww...";BERTA[15]="...wwwaaaawww...";
BERTA[16]="...ww.aaaa.wwk..";BERTA[17]="...ss.aaaa.ssk..";BERTA[18]="....wwaaaaww.k..";BERTA[19]="...wwwaaaawww...";
const PAL_BERTA=Object.assign({},PAL_INES,{
  h:{r:['#c8704a','#8a3a22','#64281a','#3c160c'],cast:true},
  d:{r:['#c8704a','#8a3a22','#64281a','#3c160c'],cast:true},
  s:{r:['#fff2e4','#fcd6b0','#eeb488','#d08c66'],ol:SKIN_OL},
  e:'#2a1418', c:'#f08a80', m:'#a83a3a',
  w:{r:['#86b896','#3e6a4a','#2a4c34','#183020']},
  o:{r:['#6a9c78','#34583e','#24402c','#142a1c'],cast:true},
  a:{r:['#fffbea','#f2e6c8','#d0bf98','#8a7a5c']},
  q:{r:['#6a4a3a','#6a4a3a','#4a3228','#2c1e18']},
  t:{r:['#4a3626','#4a3626','#32241a','#1e140e']},
  k:{r:['#eef4fa','#b4c0cc','#7a8898','#46505e']}});
/* 0.54.0 18章 トモシビ（コモリの形・灯台の機械・迎え撃ち型で攻撃は灯線（光）・深い青の胴に真鍮の帯と金物・頭に灯台のレンズ（ふち・光の輪つき）・太い短い脚・胸に灯台のしるし）。色は仮（真鍮と深い青） */
const PAL_TOMOSHIBI=Object.assign({},PAL_KOMORI,{   /* 0.87.0 胴を紺から灯台の赤に（アカリ・ツバメ・ツツミと見分けやすく・仮） */
  b:{r:['#f8b4a4','#d4584a','#a03432','#5e1c20']},
  r:{r:['#fff0b0','#e8c060','#b08430','#6e4c18']},
  m:{r:['#fff0b0','#e8c060','#b08430','#6e4c18']},
  l:{r:['#6a7aae','#44528a','#2c3866','#181e40']},
  a:'#fff6c0'});
/* 0.49.0 14章 カザミ（コモリの形・風の機械・無防備型で攻撃は突風・薄い若葉色からミントの胴に白い帯・頭の灯は黄緑・背中に風車（4枚の羽根）・胸に風のうずのしるし）。色は仮（ゲーム側 #7ac8b0） */
const PAL_KAZAMI=Object.assign({},PAL_KOMORI,{
  b:{r:['#e4fff4','#a8ecd4','#7ac8b0','#3e8470']},
  r:{r:['#ffffff','#f0f6ec','#c4d4c4','#788c80']},
  a:'#e8ff9a'});
/* 0.50.0 15章 ワタリ（コモリの形・渡り鳥の機械・逃げ守り型で攻撃は羽ばたき（音）・砂色からこげ茶の胴に白っぽいおなか・頭の灯は温かい黄色・背中に大きな鳥の翼（左右に広がる2枚・羽先が少し欠けている）・胸に渡り鳥（Vの字）が2羽・腕の先は羽根）。色は仮（ゲーム側 #c89a5a） */
const PAL_WATARI=Object.assign({},PAL_KOMORI,{
  b:{r:['#f0dcae','#dcb878','#c89a5a','#7a5636']},
  r:{r:['#ffffff','#f8f2e0','#e0d4b4','#9c9078']},
  a:'#ffd860'});
/* 0.41.0 13章 ハリネズミ（コモリの形・迎え撃ち型の重い守り・栗色からこげ茶の胴に銀の板・頭の灯はだいだい・背中にとがったはね返し板が並ぶ）。色は仮 */
const PAL_HARINEZUMI=Object.assign({},PAL_KOMORI,{
  b:{r:['#d8a070','#a8683c','#7a4426','#4a2a18']},
  r:{r:['#f0f2f8','#c4c8d4','#8a8ea0','#585c6c']},
  m:{r:['#f0f2f8','#c4c8d4','#8a8ea0','#585c6c']},
  l:{r:['#8a6a58','#5e4438','#40302a','#241a16']},
  a:'#ff9a30'});
/* 0.61.0 ソルヴェイ（ノルウェーの村の歌い手・20代後半。デウィの形を作り替え：おだんごをなくして亜麻色の長い髪・左の肩から前へ一本の三つ編み（先に赤い結び）・
   藍のワンピースに生成りで赤い模様の毛糸のショールを肩に。肌は明るい色・目は青。攻撃はショール。色は index.html の body（藍）と hair（亜麻色）に合わせた仮） */
const SOLVEIG=DEWI.slice();
SOLVEIG[0]="................";SOLVEIG[1]=".....hhhhhh.....";SOLVEIG[2]="....hhhhhhhh....";SOLVEIG[3]="...hhhhhhhhhh...";SOLVEIG[4]="..hhhhhhhhhhhh..";
SOLVEIG[10]="..hhsssmmssss...";SOLVEIG[11]="..hd.ssssss.....";SOLVEIG[12]="..hd...ss.......";
SOLVEIG[13]="..dh.ayaooaya...";SOLVEIG[14]="..hdaayaooyaaa..";SOLVEIG[15]="..dhaayaooyaaa..";
SOLVEIG[16]="...wh.oooo.wwk..";SOLVEIG[17]="...sd.oooo.ssk..";SOLVEIG[18]="....hdoooooo.k..";SOLVEIG[19]="...oocoooooooo..".slice(0,16);
const PAL_SOLVEIG=Object.assign({},PAL_INES,{
  h:{r:['#f4e4a8','#e0cc8a','#b8a062','#7c6a3a'],cast:true},
  d:{r:['#e8d698','#c8b476','#9c8a50','#685828'],cast:true},
  s:{r:['#fff2e4','#fcd6b0','#eeb488','#d08c66'],ol:SKIN_OL},
  e:'#1c2a4a', c:'#d8344a', m:'#b0545a',
  w:{r:['#5a78b0','#3a5a94','#2e4a7a','#1c2e52']},
  o:{r:['#4a68a0','#34548a','#2e4a7a','#1c2e52'],cast:true},
  a:{r:['#fffbea','#f2e6c8','#d0bf98','#8a7a5c']},
  y:{r:['#e8584a','#c8342c','#962420','#5e1414']},
  q:{r:['#3a4a6a','#3a4a6a','#28344e','#161e32']},
  t:{r:['#4a3626','#4a3626','#32241a','#1e140e']},
  k:{r:['#fffbea','#f2e6c8','#d0bf98','#8a7a5c']}});
/* 0.61.0 27章 トゥヤ（モンゴルの山の中継灯の若い番人・17歳くらいの見習い灯守り。デウィの形を作り替え：あごの高さで切りそろえた黒い短い髪と前髪・橙のデール（長い上着）に青い帯・濃い色のズボンと革の長靴・首に小さな金の灯の鈴・手に木の番の杖。
   肌は日焼け・目は茶。色は index.html の body（橙）と hair（黒）に合わせた仮） */
const TUYA=DEWI.slice();
TUYA[0]="................";TUYA[1]="....hhhhhhhh....";TUYA[2]="...hhhhhhhhhh...";TUYA[3]="..hhhhhhhhhhhh..";TUYA[4]="..hhhhhhhhhhhh..";
TUYA[5]="..hhhhhhhhhhhh..";TUYA[6]="..hhsssssssshh..";TUYA[7]="..hseesssseesh..";TUYA[8]="..hssessssessh..";TUYA[9]="..hscsssssscsh..";
TUYA[10]="..hh.ssmmss.hh..";TUYA[11]=".....ssssss.....";TUYA[12]=".......gg.......";
TUYA[13]="....wwwoowww....";TUYA[14]="...wwooooooww...";TUYA[15]="...wwooooooww...";TUYA[16]="...ww.oooo.wwk..";TUYA[17]="...ss.yyyy.ssk..";TUYA[18]="....oooooooo.k..";TUYA[19]="...oooooooooo...";
const PAL_TUYA=Object.assign({},PAL_INES,{
  h:{r:['#4a4a56','#2a2a34','#1a1a22','#0c0c12'],cast:true},
  d:{r:['#4a4a56','#2a2a34','#1a1a22','#0c0c12'],cast:true},
  s:{r:['#fce8d0','#e8b888','#cc9060','#a06840'],ol:SKIN_OL},
  e:'#2a1810', c:'#e8806a', m:'#a8503c',
  w:{r:['#e8924e','#d07838','#c0622a','#8a3e18']},
  o:{r:['#d8803c','#c0622a','#a24c1e','#6e2e10']},
  y:{r:['#6a98e0','#3c6cc0','#2a4c94','#18305e']},
  g:{r:['#fff0a0','#ffd84a','#e0a828','#8a6418']},
  q:{r:['#3c3440','#3c3440','#282230','#161220']},
  t:{r:['#7a4a2a','#7a4a2a','#52301a','#301c10']},
  k:{r:['#e0b07a','#c08a56','#946640','#5e3e28']}});
/* 0.62.0 28章 ヤスミン（記録係・北の町の記録所の人。INES の形を作り替え：バンダナとポニーテールをなくして肩までのまっすぐな赤茶の髪（右の耳にかけて耳が見える）・丸い眼鏡（真鍮色）・苔色の外套に生成りの襟もと・首からさげた帳面（胸の茶色の四角）・手に物差し。
   肌は明るい色・目は茶。色は index.html の body（苔色 #3e5e52）と hair（赤茶 #6a3a22）に合わせた仮） */
const YASMIN=INES.slice();
YASMIN[1]="................";YASMIN[2]=".....hhhhhh.....";YASMIN[3]="...hhhhhhhhhh...";YASMIN[4]="..hhhhhhhhhhhh..";
YASMIN[5]="..hhsshhhsshhh..";YASMIN[6]="..hsggssssggsh..";YASMIN[7]="..hgeeggggeegsh.";YASMIN[8]="..hgsegssgesgsh.";YASMIN[9]="..hsggssssggsh..";
YASMIN[10]=".hhssssmmssss.h.";YASMIN[11]=".hh..ssssss...h.";YASMIN[12]=".hh....ss.....h.";
YASMIN[13]="..h.wwwyywww....";YASMIN[14]="..hwwoonnoowwh..";YASMIN[15]="...wwoonnooww...";
const PAL_YASMIN=Object.assign({},PAL_INES,{
  h:{r:['#a8643c','#6a3a22','#4a2616','#2a140c'],cast:true},
  d:{r:['#a8643c','#6a3a22','#4a2616','#2a140c'],cast:true},
  s:{r:['#fff2e6','#fadcc0','#e8b896','#c08a70'],ol:SKIN_OL},
  e:'#3a2218', c:'#f0988a', m:'#b0545a', g:'#b88a3c',
  w:{r:['#8cb09c','#5e8a74','#3e5e52','#243a32']},
  o:{r:['#5e8a74','#3e5e52','#2c463c','#18281f'],cast:true},
  y:{r:['#fffaea','#f2ead0','#d0c498','#8a7e5c']},
  n:{r:['#a87240','#7a4a2a','#52301a','#301c10']},
  a:{r:['#fffaea','#f2ead0','#d0c498','#8a7e5c']}, r:'#c8483c',
  q:{r:['#2c3a34','#2c3a34','#1e2a24','#101814']},
  t:{r:['#6a4a30','#6a4a30','#46301e','#2a1c12']},
  k:{r:['#e8d09a','#c8a468','#98763e','#5e4624']}});
/* 0.60.0 22章 イワオ（コモリの形・踏ん張り型の大きく重い雪かきの機械・くすんだ鋼の灰緑の胴・前の雪かきの板は黄色からだいだいの注意の帯・頭の灯は他の機械と同じ形・どっしり幅広で低い）。色と形は仮 */
const PAL_IWAO=Object.assign({},PAL_KOMORI,{
  b:{r:['#c8d6c0','#94aa92','#6a826c','#3e5044']},
  r:{r:['#ffe880','#f4bc38','#d48220','#7e4812']},
  m:{r:['#c4ccc8','#8a9692','#5a6662','#343e3c']},
  l:{r:['#7a8884','#525e5a','#38423e','#20282a']},
  a:'#ffd25a'});
/* 0.68.0 33章 ツツミ（コモリの形・踏ん張り型・雪に埋もれた村をひとりで守ってきたずんぐりした盾の機械。落ち着いた藍色の胴・正面に大きな丸い盾板（くすんだ銀）・頭の上に丸いランプのドーム（琥珀色の灯）・肩や盾のふちに小さな琥珀の灯。どっしり幅広）。色と形は仮 */
const PAL_TSUTSUMI=Object.assign({},PAL_KOMORI,{
  b:{r:['#7e90c4','#4a5a8a','#343f68','#202844']},
  r:{r:['#ffe8a8','#ffd27a','#c8903a','#7a5018']},
  m:{r:['#e0e4ea','#aab0bc','#7a8294','#464c5c']},
  l:{r:['#5a6690','#3c4670','#2a3254','#181e38']},
  a:'#ffd27a'});
const PAL_SHABON=Object.assign({},PAL_KOMORI,{   /* 0.39.0 シャボン。0.87.0 胴を水色から淡い桃色に（ミズハ・モリヒトと見分けやすく・仮） */
  b:{r:['#fff0f6','#f4bcd4','#d08aaa','#8e5274']},
  r:{r:['#f4eaff','#d0b8f0','#a088c8','#6a5090']},
  a:'#c8f0ff',
  k:{r:['#ffffff','#e8f8ff','#a8d8f0','#6a9cc0']}});
/* 0.32.0 味方の機械ごとの姿（11/7 ヒロさん「機械のグラフィックにも個性が欲しい」）。形はコモリと同じで、背中・頭・胸のしるし・腕の先を変える（仮）。
   コモリ＝救助のしるしと二本爪・カモメ＝背中の翼板と三本指の手・ミズハ＝背中の水タンクと筒先・ウタカタ＝頭のラッパと胸のスピーカー・アカリ＝頭の大きな照らし灯・スパナ＝背中の道具箱と腕のスパナ */
const MACH_LOOK={'コモリ':'komori','カモメ':'kamome','ミズハ':'mizuha','ウタカタ':'utakata','アカリ':'akari','スパナ':'spana','ナミノリ':'naminori','イカリ':'ikari','モリヒト':'morihito','ツバメ':'tsubame','カササギ':'kasasagi','シャボン':'shabon','ハリネズミ':'harinezumi','カザミ':'kazami','ワタリ':'watari','トモシビ':'tomoshibi','イワオ':'iwao','ツツミ':'tsutsumi'};   /* 0.68.0 33章 ツツミ */   /* 0.60.0 イワオ */   /* 0.54.0 トモシビ */   /* 0.41.0 ハリネズミ */   // 0.33.0 ナミノリ・イカリ・0.34.0 モリヒト・0.36.0 ツバメ・カササギ・0.39.0 シャボン
/* 地図の小さな絵も少しだけ変える：カモメ＝翼と細い脚・ウタカタ＝頭のラッパ・アカリ＝頭の大きな灯・スパナ＝太い脚 */
function machRows(lk){ const r=KOMORI.slice();
  if(lk==='kamome'){ r[5]="b....bbbbbb....b"; r[6]="bb.bbbbbbbbbb.bb"; r[7]=".bbbggggggggbbb."; r[18]="....ll....ll...."; r[19]="....l......l...."; r[20]="....l......l...."; r[21]="..ll.ll..ll.ll.."; }
  else if(lk==='utakata'){ r[1]="..........aa...."; r[2]=".........maa...."; r[3]="........mm......"; }
  else if(lk==='akari'){ r[2]="......mmmm......"; r[3]="......maam......"; }
  else if(lk==='spana'){ r[19]="...lll....lll..."; r[20]="..llll....llll.."; r[21]=".lllll....lllll."; }
  else if(lk==='tsutsumi'){ r[2]="......aaaa......"; r[3]=".....aaaaaa....."; r[4]="......mmmm......"; r[12]=".abbbbbbbbbbbba."; r[14]=".mbbbmmmmmmbbbm."; r[15]=".mbbmmmmmmmmbbm."; r[16]=".m.bbmmmmmmbb.m."; }   /* 0.68.0 33章 ツツミ 頭の上の丸いランプと、胸の丸い盾・肩の灯 */
  else if(lk==='naminori'){ r[22]=".rrrrrrrrrrrrrr."; }   // 0.33.0 足の下に波乗りの板
  else if(lk==='ikari'){ r[18]="....llllllll..m."; r[19]="...ll......ll.m."; r[20]="..lll......lmmm."; }   // 0.33.0 右手に錨
  else if(lk==='morihito'){ r[1]="mm.............."; r[2]="mmm............."; r[3]=".mmm...aa......."; r[4]="..mmm..mm......."; }   // 0.34.0 背中から上へのびるしずく砲
  else if(lk==='tsubame'){ r[8]="b.bggggggggggb.."; r[9]="bbbggggggggggb.."; }   // 0.36.0 ツバメ 背中の二又の尾
  else if(lk==='kasasagi'){ r[14]=".mbbkbkkbkbbbbm."; r[15]=".mbbnnnnnnnnbbm."; r[16]=".m.nnnnnnnnnn.m."; r[18]="....llllllll...."; r[19]="....l......l...."; r[20]="....l......l...."; r[21]="...ll......ll..."; }   // 0.36.0 カササギ 胸の籠と細い脚
  else if(lk==='shabon'){ r[1]="..............k."; r[2]="............k..."; r[3]=".......aa....k.."; r[7]="..bbggggggggbb.k"; r[9]="..bggggggggggbmk"; r[15]=".mbbkkbbbbbbkbm."; r[16]=".m.bkkbbbbbbb.m."; }   /* 0.39.0 シャボン 右肩の泡の吹き口と、飛ぶ泡と、胴の泡の丸 */
  else if(lk==='harinezumi'){ r[6]="m..bbbbbbbbbb..."; r[7]="m.bbggggggggbb.."; r[8]="mmbggggggggggb.."; r[9]="m.bggggggggggb.."; r[10]="mmbggggggggggb.."; r[11]="m.bbggggggggbb.."; r[12]="mmbbbbbbbbbbbbm."; }   /* 0.41.0 ハリネズミ 背中に並ぶとがった板 */
  else if(lk==='kazami'){ r[1]="...r............"; r[2]="...r............"; r[3]=".rrmrr.aa......."; r[4]="...r...mm......."; r[5]="...m.bbbbbb....."; }   /* 0.49.0 カザミ 背中の風車（4枚の羽根） */
  else if(lk==='watari'){ r[1]="b.b............."; r[2]="bbb............."; r[3]=".bbb...aa......."; r[4]="..bb...mm......."; r[16]="bb.bbbbbbbbbb.m."; r[17]="bbb.bbbbbbbb.mm."; }   /* 0.50.0 ワタリ 背中の翼（上と下に広がる2枚） */
  else if(lk==='tomoshibi'){ r[0]="....a......a...."; r[1]="...a.mmmmmm.a..."; r[2]="......maam......"; r[3]="....mmmmmmmm...."; r[4]=".....mmmmmm....."; r[18]="...llllllllll..."; r[19]="..llll....llll.."; r[20]=".lllll....lllll."; r[21]=".llllll..llllll."; }   /* 0.54.0 トモシビ 頭の灯台のレンズ（ふちと光の輪）と、太く短い脚 */
  else if(lk==='iwao'){ r[5]="....bbbbbbbb...."; r[6]="..bbbbbbbbbbbb.."; r[7]=".bbbggggggggbbb."; r[8]=".bbggggggggggbb."; r[9]=".bbggggggggggbb."; r[10]=".bbggggggggggbbr"; r[11]=".bbbggggggggbbbr"; r[12]="mbbbbbbbbbbbbbbr"; r[13]="mrrrrrrrrrrrrrrr"; r[14]="mbbbbbeebbbbbbrr"; r[15]="mbbbbbbbbbbbbbrr"; r[16]="mbbbbbbbbbbbbbrr"; r[17]=".bbbbbbbbbbbbbrr"; r[18]="...llllllllll.rr"; r[19]="..llll....llllr."; r[20]=".lllll....lllll.."; r[21]=".lllll....lllll.."; }   /* 0.60.0 イワオ 幅広の胴・太く短い脚・前の雪かきの板 */
  /* 0.87.0 地図で機械を見分けやすく（11/19 ヒロさん「マップ上で機械の区別がつきにくい」）。窓を小さくして胴の色が多く見えるように（7行目は胴・8行目は6マス・9〜11行目は8マス。乗っている人の頭は9〜11行目の4〜11列に入る）。戦いの場面の絵は変えない（仮） */
  for(let y=7;y<=11;y++){ const lo=y===7?99:y===8?5:4, hi=y===7?-1:y===8?10:11;
    r[y]=r[y].split('').map((ch,x)=>ch==='g'&&(x<lo||x>hi)?'b':ch).join(''); }
  /* 0.87.0 胸の帯を2段に（帯の色でも見分けられるように）。13行目が帯のマスの真上の胴だけを帯にする（仮） */
  r[12]=r[12].split('').map((ch,x)=>ch==='b'&&r[13][x]==='r'?'r':ch).join('');
  return r; }
/* 0.8.0 3章の漁師の船（16×16・1マス）。木の船体・白い小屋・帆柱・へさきの灯。k＝0,1,2 で帆の色だけ変える（見分けやすく） */
/* 0.37.0 10章の羊（16×16・左向き・白い毛と黒い顔と脚・首の鈴・首のひもの色で見分ける）。歩くと脚が入れ替わる。形と色は仮 */
ART.drawSheep=function(ctx,px,py,k,calm){
  const R=(x,y,w,h,c)=>{ ctx.fillStyle=c; ctx.fillRect(px+x,py+y,w,h); };
  const st=(!calm&&((ART.tick>>1)+k)%4<2)?1:0, rib=['#e84a4a','#4a8ae8','#e8c040','#58c060','#c060d8'][k%5];
  R(3,14,11,2,'rgba(10,8,20,.38)');   // 足元の影
  R(5,11,1,3-st,'#2a2420'); R(7,11,1,2+st,'#2a2420'); R(10,11,1,3-st,'#2a2420'); R(12,11,1,2+st,'#2a2420');   // 脚
  R(4,5,10,6,'#8a8a80'); R(3,6,12,4,'#8a8a80');   // 毛の輪郭
  R(5,5,8,6,'#f4f2e8'); R(4,6,10,4,'#f4f2e8'); R(5,10,8,1,'#d4d2c4'); R(12,7,2,3,'#d4d2c4');   // 毛と影
  R(6,5,3,1,'#ffffff'); R(5,6,2,1,'#ffffff'); R(9,6,2,1,'#ffffff');   // 毛の光
  R(1,6,4,4,'#2a2420'); R(0,7,1,2,'#2a2420'); R(2,5,2,1,'#2a2420');   // 顔と耳
  R(2,7,1,1,'#f4f2e8');   // 目の光
  R(4,10,2,1,rib); R(4,11,1,1,'#ffe060');   // 首のひもと鈴
};
ART.drawBoat=function(ctx,px,py,k,calm){
  const R=(x,y,w,h,c)=>{ ctx.fillStyle=c; ctx.fillRect(px+x,py+y,w,h); };
  const bob=(!calm&&((ART.tick>>1)+k)%4<2)?0:1, y=bob;
  const sail=[['#fff4d0','#e8d4a0'],['#d8f0ff','#a8cce8'],['#ffd8c8','#e8a890']][k%3];
  R(2,13+y,12,2,'rgba(10,30,60,.45)');   // 水の影
  R(7,1+y,1,9,'#5e3e28');                  // 帆柱
  R(8,2+y,4,6,sail[0]); R(8,7+y,4,1,sail[1]); R(11,2+y,1,6,sail[1]);   // 帆
  R(3,7+y,4,3,'#f4f0e4'); R(3,7+y,4,1,'#ffffff'); R(4,8+y,2,1,'#ffe890');   // 小屋と窓の灯
  R(1,10+y,14,1,'#3a2618'); R(1,11+y,14,2,'#946640'); R(2,13+y,12,1,'#5e3e28'); R(1,11+y,14,1,'#c08a56');   // 船体
  R(0,10+y,2,2,'#3a2618'); R(14,10+y,2,2,'#3a2618');
  R(14,8+y,1,2,'#3a2618'); R(14,7+y,1,1,ART.tick%4<2?'#ffe890':'#fff4c0');   // へさきの灯
  if(!calm){ ctx.save(); ctx.globalCompositeOperation='lighter'; const g=ctx.createRadialGradient(px+14.5,py+7.5+y,0,px+14.5,py+7.5+y,7); g.addColorStop(0,'rgba(255,230,140,.45)'); g.addColorStop(1,'rgba(255,230,140,0)'); ctx.fillStyle=g; ctx.fillRect(px+7,py+y,16,16); ctx.restore(); }
};
/* 影（霧で灯を失った人）。すそが2コマでゆれる */
const SHADOW=[
"................",
"................",
"......ssss......",
".....ssssss.....",
"....ssssssss....",
"....ssssssss....",
"...sseesseess...",
"...ssssssssss...",
"....ssssssss....",
"...ssssssssss...",
"..ssssssssssss..",
".sss.ssssss.sss.",
".ss..ssssss..ss.",
".ww..ssssss..ww.",
".....ssssss.....",
"....ssssssss....",
"....ssssssss....",
"...ssssssssss...",
"...ssswsswsss...",
"..sswsswsswss...",
"..w.ww.ww.ww.w..",
"...w..w..w..w...",
"................",
"................"];
const SHADOW2=SHADOW.slice(); SHADOW2[19]="...sswsswsswss.."; SHADOW2[20]="...w.ww.ww.ww.w."; SHADOW2[21]="..w..w..w..w....";
function palShadow(eye,base){ const B=base||['#7a5a9a','#4e3868','#33244a','#1e1430'];
  return {s:{r:B,ol:'#120a1c'}, w:{r:['#a894c8','#7a68a0','#56467a','#3a2c56'],ol:'#120a1c'}, e:eye||'#ff6080',
    h:{r:['#d8b08a','#a87c5c','#7a5440','#4e3428'],ol:'#120a1c'}, g:{c:'#ffd060',nol:true}}; }
/* 0.18.0 名無しの影の種類（11/7 ヒロさん「似ててもいいので5パターン」）。色と、形を少しだけ変える。
   fast はぐれ影（青・うしろへ流れる霧）・heavy うずくまる影（くすんだ色・すそが広い）・far 霧吹きの影（緑・手もとに霧の玉）・mute 黙りこむ影（灰色・目を閉じた線）。
   名前のある影（5章の先頭）は named：長い髪と、胸に消えかけの灯 */
const SHADOW_LOOK={
  fast: {base:['#6aa0c8','#3e6a96','#284a70','#162c48'],eye:'#80f0ff'},
  heavy:{base:['#7a6a78','#4e4252','#322a36','#1c1620'],eye:'#ff8040'},
  far:  {base:['#7a9a8a','#4e6a5e','#344a42','#1e2c28'],eye:'#c8ff70'},
  mute: {base:['#8a8a98','#5c5c6a','#3c3c48','#22222c'],eye:'#d0d0e0'}};
function shadowRows(rows,look,named){ const r=rows.slice();
  if(look==='fast'){ r[15]="w...ssssssss...."; r[16]=".w..ssssssss...."; r[17]="w..ssssssssss..."; }
  else if(look==='heavy'){ r[15]="...ssssssssss..."; r[16]="..ssssssssssss.."; r[17]="..ssssssssssss.."; r[18]="..sssswsswssss.."; }
  else if(look==='far'){ r[12]=".ss..ssssss..ssw"; r[13]=".ww..ssssss..www"; r[14]=".....ssssss...w."; }
  else if(look==='mute'){ r[6]="...ssseeeesss..."; }
  if(named){ r[5]="...hssssssssh..."; r[6]="..hsseesseessh.."; r[7]="..hssssssssssh.."; r[8]="...hssssssssh..."; r[9]="..hssssssssssh.."; r[10]="..sssssggsssss.."; }
  return r; }
/* 0.61.0 24章 霧の壁（北の門をふさぐ大きな霧のかたまり・ボス。look==='kiri' のときだけ。人でも機械でもない：青灰のうねる塊に、中でぼんやり光る目が2つ）。
   マップの絵は16×24の枠いっぱいに横にふくらませ、ほかの影（細い人影）より大きく見せる。ふつうの影の絵には触らない */
const KIRI=[
"................",
"................",
"....w.ww.w......",
"...wsswsswsw....",
"..wsssssssssw.w.",
".wssssssssssssw.",
".ssssssssssssssw",
"wsssssssssssssss",
"sssseesssseesssw",
"sssseesssseessss",
"ssssssszsssssssw",
"wsssszzzzsssssss",
"ssssssssssssszsw",
"wsszsssssssssssw",
"sssssssswsssssss",
"wssssssssssssssw",
".sssssssssssssw.",
".wssssssssssssw.",
"..sswssswsssswsw",
"..wsssswsssswsw.",
"...w.wswsw.sw...",
"....w.w.w.w.....",
"................",
"................"];
const KIRI2=KIRI.slice(); KIRI2[2]=".....ww.w.w......"; KIRI2[3]="..wsswsswssw....";
KIRI2[18]="..wssswssswssswsw".slice(0,16); KIRI2[19]="..sswsssswsssswsw".slice(0,16); KIRI2[20]="...wsw.ws.wsw..."; KIRI2[21]=".....w.w.w.w....";
function palKiri(eye){ return {s:{r:['#a0acce','#7c88b0','#5e6a92','#444d74'],ol:'#2a3252'}, w:{r:['#d0d8f0','#a0acd0','#7480a8','#4c5680'],ol:'#2a3252'},
  z:{r:['#7c88b0','#5e6a92','#444d74','#2c3354'],ol:'#2a3252'}, e:{c:eye||'#c8d0ff',nol:true}}; }
/* 0.68.0 33章 雪のかたまり（look==='yuki'・敵の側の動かない置き物・中にツツミが埋もれている。白からうすい水色のこんもり丸い雪の山・青い陰・中ほどに琥珀色の灯が2つぼんやり透ける・すそは少し崩れた雪）。揺れはなし。色と形は仮 */
const YUKI=[
"................",
"................",
"................",
"................",
"................",
"................",
"......wwww......",
"....wwwwwwww....",
"...wwwwwwwwws...",
"..wwwwwwwwwwws..",
"..wwwwwwwwwwsss.",
".wwwwwwwwwwwssss",
".wwweewwwweesszz",
".wwweewwwweessz.",
".wwwwwwwwwwsszz.",
"wwwwwwwwwwssszzz",
"wwwwwwwwsssszzzz",
"wwwwwwwsssszzzzz",
"wwwwwwwwsssszzzz",
".wwwwwwsssssszz.",
"..wwwwwsssszw...",
".ww.wsw.sw.wz.w.",
"................",
"................"];
function palYuki(eye){ return {s:{r:['#ffffff','#e8f2fa','#bcd2e8','#8aa6c8'],ol:'#5a7498'}, w:{r:['#ffffff','#f4f9fd','#d6e6f4','#a8c0dc'],ol:'#5a7498'},
  z:{r:['#aac4e0','#7e9cc4','#5e7aa6','#445c88'],ol:'#5a7498'}, e:{c:eye||'#ffd27a',nol:true}}; }
/* 0.18.0 暴走した機械の種類（色違い）。cart 運搬車（黄土）・heavy 重機（くすんだ緑）・crane 荷揚げ機（青）・watch 見張り機（紫） */
const BEAST_LOOK={
  cart: {r:['#f8d890','#d8a848','#a07428','#5e4418'],e:'#ffb030'},
  heavy:{r:['#a8c098','#6e8a60','#4a5e40','#2a3626'],e:'#ff5030'},
  crane:{r:['#a8c8e8','#6890c0','#44608c','#283a5a'],e:'#ff60a0'},
  watch:{r:['#d0a8e8','#9a68c0','#6a4490','#40285a'],e:'#ffe040'},
  mori: {r:['#a8c8dc','#5a88a8','#3a5a7a','#22384e'],e:'#ff6040'},
  hari: {r:['#b88070','#7a4438','#52281f','#2e1612'],e:'#ff2030'},
  kane: {r:['#e0c088','#b08a48','#7a5a2a','#46321a'],e:'#ffd040'},
  tomo: {r:['#b88a9e','#744c68','#4a3050','#2a1a32'],e:'#ff2030'},
  iwao: {r:['#9aa898','#5e7062','#3c4c40','#222c26'],e:'#ff2030'},
  turara:{r:['#d8ecf8','#9cc0dc','#5a7a9a','#2e4660'],e:'#80e0ff'},
  toban:{r:['#c4bcd8','#8a82aa','#5a5478','#33304a'],e:'#ffb040'},
  yoake:{r:['#f0e0b0','#c8a860','#8a6c38','#4e3c20'],e:'#fff0b8'}};   /* 0.76.0 40章 ヨアケ（古い真鍮色・やわらかい白い目・背中の鐘は鐘番の形・色は仮） */   /* 0.75.0 39章 塔の番機（塔の石の灰紫・琥珀の目・色は仮） */   /* 0.67.0 32章 ツララ（雪の白と氷の青・水色の目・背中に下がる氷柱・色と形は仮） */   /* 0.60.0 22章 暴走したイワオ（くすんだ暗い灰緑・赤い目・前の雪かきの板） */
/* 0.54.0 18章 暴走したトモシビ（赤みがかった暗い紫紺・赤い目・背中の割れたレンズ塔） */   /* 0.52.0 16章 鐘番（青銅色・背中の鐘の枠と小さな鐘・色と形は仮） */   /* 0.41.0 13章 暴走したハリネズミ（暗い赤茶・赤い目・背中の板） */   // 0.34.0 8章の暴走したモリヒト（深い青・背中の大きなしずく砲）
/* 暴走した作業機（さびた赤・ひとつ目・湯気） */
const BEAST=[
"................",
"................",
"................",
"..........s.....",
".........s.s....",
"..........mm....",
"....rrrrrrmm....",
"...rrrrrrrrrr...",
"..rrrmmmmmrrrr..",
"..rrmeeemmrrrr..",
"..rrmmmmmmrrrr..",
"..rrrrrrrrrrrr..",
".mmyryryryryrmm.",
".mrrrrrrrrrrrrm.",
".mrrrrrrrrrrrrm.",
".mm.rrrrrrrr.mm.",
".m.m.rrrrrr.m.m.",
".....mmmmmm.....",
"....mmmmmmmm....",
"...mm.mmmm.mm...",
"..mmm......mmm..",
"..mmmm....mmmm..",
"................",
"................"];
const BEAST2=BEAST.slice(); BEAST2[3]=".........s......"; BEAST2[4]="..........s.s...";
const PAL_BEAST={
  r:{r:['#f0a080','#c85c40','#8e3a30','#5a2026']},
  m:{r:['#9a9aa4','#64646e','#42424c','#26262e']},
  y:'#f0c040', e:'#ff4848', s:{c:'#dfe4ee',nol:true}};

const SPR={};
/* 0.83.0 マップの人を少しすらりと（11/15 ヒロさん「ずんぐりむっくりなのでちょっとだけスマートに」）。型の文字図をそのまま使い、焼く前に変える：
   ・頭と胴を左右1ドットずつ細く（3列目と12列目を、となりと同じ文字のときだけ抜く。抜けない行は外の空き列を抜くので、ランタンなどの位置はずれない）
   ・同じ行が2つ続く目の行を1つにする（目が細く、頭が1ドット低くなる）
   ・いちばん上の空き行を抜き、脚の行を足して足もとの高さはそのまま（脚が長くなる） */
function slimP(rows){ let g=rows.map(r=>Array.isArray(r)?r.slice():r.split(''));
  g=g.map(r=>{ let L=0,R=0; const cut=(cs,edge)=>{ for(const c of cs){ if(r[c]!=='.'&&(r[c]===r[c+1]||r[c]===r[c-1])){ r.splice(c,1); return 1; } } if(r[edge]==='.'){ r.splice(edge,1); return 1; } return 0; };
    R=cut([12,11,13],15); L=cut([3,4,2],0); return Array(L).fill('.').concat(r,Array(R).fill('.')); });
  const H=g.length, J=r=>r.join(''), empty=r=>!/[^.]/.test(J(r)); let lost=0;
  for(let y=3;y<12&&y<g.length-1;y++) if(J(g[y])===J(g[y+1])&&/e/.test(J(g[y]))){ g.splice(y,1); lost++; break; }
  if(empty(g[0])){ g.shift(); lost++; }
  let last=g.length-1; while(last>0&&empty(g[last])) last--;
  for(let i=0;i<lost;i++) g.splice(last,0,g[last-1].slice());
  while(g.length<H) g.unshift(Array(16).fill('.'));
  return g.slice(0,H); }
function sprite(key){ if(SPR[key]) return SPR[key]; let f0,f1;
  switch(key){
    case 'noa':    f0=bake(slimP(NOA),PAL_NOA); f1=bob(f0,16); break;
    case 'ines':   f0=bake(slimP(INES),PAL_INES); f1=bob(f0,17); break;
    case 'komori': f0=bake(machRows('komori'),PAL_KOMORI); f1=f0; break;
    case 'komoriOff': f0=bake(machRows('komori'),Object.assign({},PAL_KOMORI,{a:'#5a5e6a'})); f1=f0; break;
    case 'beast':  f0=bake(BEAST,PAL_BEAST); f1=bake(BEAST2,PAL_BEAST); break;
    case 'kiran':  f0=bake(slimP(NOA),PAL_KIRAN); f1=bob(f0,16); break;
    case 'kamome': f0=bake(machRows('kamome'),PAL_KAMOME); f1=f0; break;   // 0.32.0 機械ごとの形（machRows）
    case 'kamomeOff': f0=bake(machRows('kamome'),Object.assign({},PAL_KAMOME,{a:'#5a5e6a',e:'#6a6e78'})); f1=f0; break;
    case 'dagny':  f0=bake(slimP(INES),PAL_DAGNY); f1=bob(f0,17); break;   // 0.8.0
    case 'kenta':  f0=bake(slimP(NOA),PAL_KENTA); f1=bob(f0,16); break;
    case 'mizuha': f0=bake(machRows('komori'),PAL_MIZUHA); f1=f0; break;
    case 'mizuhaOff': f0=bake(machRows('komori'),Object.assign({},PAL_MIZUHA,{a:'#5a5e6a'})); f1=f0; break;
    case 'amara':  f0=bake(slimP(INES),PAL_AMARA); f1=bob(f0,17); break;   // 0.9.0
    case 'utakata': f0=bake(machRows('utakata'),PAL_UTAKATA); f1=f0; break;
    case 'utakataOff': f0=bake(machRows('utakata'),Object.assign({},PAL_UTAKATA,{a:'#5a5e6a'})); f1=f0; break;
    case 'elif':   f0=bake(slimP(INES),PAL_ELIF); f1=bob(f0,17); break;   // 0.17.0
    case 'akari':  f0=bake(machRows('akari'),PAL_AKARI); f1=f0; break;
    case 'akariOff': f0=bake(machRows('akari'),Object.assign({},PAL_AKARI,{a:'#5a5e6a'})); f1=f0; break;
    case 'spana':  f0=bake(machRows('spana'),PAL_SPANA); f1=f0; break;   // 0.32.0
    case 'spanaOff': f0=bake(machRows('spana'),Object.assign({},PAL_SPANA,{a:'#5a5e6a'})); f1=f0; break;
    case 'sione':  f0=bake(slimP(NOA),PAL_SIONE); f1=bob(f0,16); break;   // 0.33.0
    case 'naminori': f0=bake(machRows('naminori'),PAL_NAMINORI); f1=f0; break;
    case 'naminoriOff': f0=bake(machRows('naminori'),Object.assign({},PAL_NAMINORI,{a:'#5a5e6a'})); f1=f0; break;
    case 'ikari':  f0=bake(machRows('ikari'),PAL_IKARI); f1=f0; break;
    case 'ikariOff': f0=bake(machRows('ikari'),Object.assign({},PAL_IKARI,{a:'#5a5e6a'})); f1=f0; break;
    case 'morihito': f0=bake(machRows('morihito'),PAL_MORIHITO); f1=f0; break;   // 0.34.0
    case 'morihitoOff': f0=bake(machRows('morihito'),Object.assign({},PAL_MORIHITO,{a:'#5a5e6a'})); f1=f0; break;
    case 'luca':   f0=bake(slimP(NOA),PAL_LUCA); f1=bob(f0,16); break;   // 0.36.0 ルカ
    case 'lucia':  f0=bake(slimP(INES),PAL_LUCIA); f1=bob(f0,17); break;   // 0.36.0 ルチア
    case 'pema':   f0=bake(slimP(INES),PAL_PEMA); f1=bob(f0,17); break;   // 0.37.0 ペマ
    case 'felix':  f0=bake(slimP(NOA),PAL_FELIX); f1=bob(f0,16); break;   // 0.37.0 フェリクス
    case 'oyuna':  f0=bake(slimP(OYUNA),PAL_OYUNA); f1=bob(f0,17); break;   /* 0.39.0 オユナ */
    case 'hana':   f0=bake(slimP(HANA),PAL_HANA); f1=bob(f0,17); break;   /* 0.39.0 ハナ */
    case 'jun':    f0=bake(slimP(NOA),PAL_JUN); f1=bob(f0,16); break;   /* 0.40.0 ジュン */
    case 'shabon': f0=bake(machRows('shabon'),PAL_SHABON); f1=f0; break;   /* 0.39.0 シャボン */
    case 'shabonOff': f0=bake(machRows('shabon'),Object.assign({},PAL_SHABON,{a:'#5a5e6a'})); f1=f0; break;
    case 'harinezumi': f0=bake(machRows('harinezumi'),PAL_HARINEZUMI); f1=f0; break;   /* 0.41.0 ハリネズミ */
    case 'harinezumiOff': f0=bake(machRows('harinezumi'),Object.assign({},PAL_HARINEZUMI,{a:'#5a5e6a'})); f1=f0; break;
    case 'iwao': f0=bake(machRows('iwao'),PAL_IWAO); f1=f0; break;   /* 0.60.0 イワオ */
    case 'iwaoOff': f0=bake(machRows('iwao'),Object.assign({},PAL_IWAO,{a:'#5a5e6a'})); f1=f0; break;
    case 'tsutsumi': f0=bake(machRows('tsutsumi'),PAL_TSUTSUMI); f1=f0; break;   /* 0.68.0 33章 ツツミ */
    case 'tsutsumiOff': f0=bake(machRows('tsutsumi'),Object.assign({},PAL_TSUTSUMI,{a:'#5a5e6a'})); f1=f0; break;
    case 'kazami': f0=bake(machRows('kazami'),PAL_KAZAMI); f1=f0; break;   /* 0.49.0 カザミ */
    case 'kazamiOff': f0=bake(machRows('kazami'),Object.assign({},PAL_KAZAMI,{a:'#5a5e6a'})); f1=f0; break;
    case 'watari': f0=bake(machRows('watari'),PAL_WATARI); f1=f0; break;   /* 0.50.0 ワタリ */
    case 'watariOff': f0=bake(machRows('watari'),Object.assign({},PAL_WATARI,{a:'#5a5e6a'})); f1=f0; break;
    case 'dewi':   f0=bake(slimP(DEWI),PAL_DEWI); f1=bob(f0,17); break;   /* 0.49.0 デウィ */
    case 'mireille': f0=bake(slimP(MIREILLE),PAL_MIREILLE); f1=bob(f0,17); break;   /* 0.53.0 ミレイユ */
    case 'layla':  f0=bake(slimP(LAYLA),PAL_LAYLA); f1=bob(f0,17); break;   /* 0.54.0 ライラ */
    case 'zoe':    f0=bake(slimP(ZOE),PAL_ZOE); f1=bob(f0,17); break;   /* 0.56.0 19章 ゾエ */
    case 'berta':  f0=bake(slimP(BERTA),PAL_BERTA); f1=bob(f0,17); break;
    case 'yasmin': f0=bake(slimP(YASMIN),PAL_YASMIN); f1=bob(f0,17); break;   /* 0.62.0 28章 ヤスミン */
    case 'tuya':   f0=bake(slimP(TUYA),PAL_TUYA); f1=bob(f0,17); break;   /* 0.61.0 27章 トゥヤ */
    case 'solveig': f0=bake(slimP(SOLVEIG),PAL_SOLVEIG); f1=bob(f0,17); break;   /* 0.61.0 ソルヴェイ */   /* 0.61.0 25章 ベルタ */
    case 'linh':   f0=bake(slimP(LINH),PAL_LINH); f1=bob(f0,17); break;   /* 0.57.0 20章 リン */
    case 'tomoshibi': f0=bake(machRows('tomoshibi'),PAL_TOMOSHIBI); f1=f0; break;   /* 0.54.0 トモシビ */
    case 'tomoshibiOff': f0=bake(machRows('tomoshibi'),Object.assign({},PAL_TOMOSHIBI,{a:'#5a5e6a'})); f1=f0; break;
    case 'kwame':  f0=bake(slimP(KWAME),PAL_KWAME); f1=bob(f0,16); break;   /* 0.41.0 クワメ */
    case 'tsubame': f0=bake(machRows('tsubame'),PAL_TSUBAME); f1=f0; break;   // 0.36.0 ツバメ
    case 'tsubameOff': f0=bake(machRows('tsubame'),Object.assign({},PAL_TSUBAME,{a:'#5a5e6a'})); f1=f0; break;
    case 'kasasagi': f0=bake(machRows('kasasagi'),PAL_KASASAGI); f1=f0; break;   // 0.36.0 カササギ
    case 'kasasagiOff': f0=bake(machRows('kasasagi'),Object.assign({},PAL_KASASAGI,{a:'#5a5e6a'})); f1=f0; break;
    default:
      if(key.startsWith('yuki|')){ const eye=key.slice(5); f0=bake(YUKI,palYuki(eye)); f1=f0; }   /* 0.68.0 33章 雪のかたまり */
      else if(key.startsWith('kiri|')){ const eye=key.slice(5); f0=bake(KIRI,palKiri(eye)); f1=bake(KIRI2,palKiri(eye)); }   /* 0.61.0 24章 霧の壁 */
      else if(key.startsWith('shadow')){ const [,eye,b0,b1,b2,b3,look,nm]=key.split('|'); const base=b0?[b0,b1,b2,b3]:null; f0=bake(shadowRows(SHADOW,look,nm==='n'),palShadow(eye,base)); f1=bake(shadowRows(SHADOW2,look,nm==='n'),palShadow(eye,base)); }
      else if(key.startsWith('beast|')){ const L=BEAST_LOOK[key.slice(6)]||{}, p=Object.assign({},PAL_BEAST,L.r?{r:{r:L.r}}:{},L.e?{e:L.e}:{}); f0=bake(BEAST,p); f1=bake(BEAST2,p); }   // 0.18.0
  }
  return SPR[key]=[f0,f1];
}
ART.sprite=sprite;

/* マップのキャラを描く。px,py は 16×24 の左上（足元のマスの上8ドット） */
ART.drawUnit=function(ctx,u,px,py,o){
  o=o||{}; const f=(ART.tick>>1)&1;
  ctx.fillStyle='rgba(10,8,20,.38)'; ctx.fillRect(px+4,py+22,8,2); ctx.fillRect(px+3,py+22,10,1);   // 足元の影
  let key;
  if(u.kind==='person'){
    if(u.look==='yuki'){ key='yuki|'+(u.eye||'#ffd27a'); }   /* 0.68.0 33章 雪のかたまり（影の分岐より前で拾う） */
    else if(u.sub==='shadow'&&u.look==='kiri'){ key='kiri|'+(u.eye||'#c8d0ff'); }   /* 0.61.0 24章 霧の壁（名前のある影の姿にしない） */
    else if(u.sub==='shadow'){ const L=SHADOW_LOOK[u.look];   // 0.18.0 種類（look）と、名前のある影の姿
      key=u.named?'shadow|'+(u.eye||'#ffd060')+'|#9a78b8|#62487e|#3e2a58|#24163a||n':L?'shadow|'+L.eye+'|'+L.base.join('|')+'|'+u.look:'shadow|'+(u.eye||'#ff6080'); }
    else key=u.name==='イネス'?'ines':u.name==='キラン'?'kiran':u.name==='ダグニ'?'dagny':u.name==='ケンタ'?'kenta':u.name==='アマラ'?'amara':u.name==='エリフ'?'elif':u.name==='シオネ'?'sione':u.name==='ルカ'?'luca':u.name==='ルチア'?'lucia':u.name==='ペマ'?'pema':u.name==='フェリクス'?'felix':u.name==='オユナ'?'oyuna':u.name==='ハナ'?'hana':u.name==='ジュン'?'jun':u.name==='クワメ'?'kwame':u.name==='デウィ'?'dewi':u.name==='ミレイユ'?'mireille':u.name==='ライラ'?'layla':u.name==='ゾエ'?'zoe':u.name==='リン'?'linh':u.name==='ベルタ'?'berta':u.name==='ソルヴェイ'?'solveig':u.name==='トゥヤ'?'tuya':u.name==='ヤスミン'?'yasmin':'noa';   /* 0.62.0 28章 ヤスミン */   /* 0.61.0 27章 トゥヤ */   /* 0.61.0 ソルヴェイ */   /* 0.61.0 25章 ベルタ */   /* 0.57.0 20章 リン */   /* 0.56.0 19章 ゾエ */   /* 0.54.0 ライラ */   /* 0.53.0 ミレイユ */   /* 0.49.0 デウィ */   /* 0.40.0 ジュン・0.41.0 クワメ */   // 0.17.0 エリフ・0.33.0 シオネ・0.36.0 ルカ・ルチア・0.37.0 ペマ・フェリクス・0.39.0 オユナ・ハナ
  } else { const base=u.side!=='enemy'&&MACH_LOOK[u.name]||'komori'; key=u.side==='enemy'?(BEAST_LOOK[u.look]?'beast|'+u.look:'beast'):(o.active===false?base+'Off':base); }   // 0.32.0 スパナも
  const fr=sprite(key); ctx.drawImage(fr[f]||fr[0],px,py);
  { const bs=bandsOf(u); if(bs.length){ const w=12/bs.length;   // 0.34.1 改造5段の色の帯（地図の小さな絵：胴の下のほうに2ドットの帯）
      bs.forEach((k,i)=>{ const a=Math.round(2+w*i), b=Math.round(2+w*(i+1)), C=BAND_COL[k]; ctx.fillStyle=C[1]; ctx.fillRect(px+a,py+15,b-a,1); ctx.fillStyle=C[2]; ctx.fillRect(px+Math.max(3,a),py+16,Math.min(13,b)-Math.max(3,a),1); }); } }
  if(ornOf(u)){ const t=(ART.tick>>3)%2; ctx.fillStyle='#6a5030'; ctx.fillRect(px+2,py+4,1,5); ctx.fillStyle=t?'#fff0b0':'#ffd25a'; ctx.fillRect(px+1,py+2,3,2); ctx.fillStyle='#b07820'; ctx.fillRect(px+2,py+4,1,1); }   /* 0.80.0 灯の飾り（地図の小さな絵） */
  if(u.kind==='machine'&&u.side!=='enemy'&&u.seats){   // 窓の中に乗っている人
    const HC={'イネス':'#6a4038','キラン':'#18181c','ダグニ':'#e8d070','ケンタ':'#241c1a','アマラ':'#181212','エリフ':'#9a6038','シオネ':'#18181c','ルカ':'#c8703c','ルチア':'#c8703c','ペマ':'#181412','フェリクス':'#c4beb0','オユナ':'#d6d8e0','ハナ':'#44507e','ジュン':'#1a1a20','クワメ':'#18181c','デウィ':'#34241e','ミレイユ':'#dc6440','ライラ':'#3a3264','ゾエ':'#4a2c1c','リン':'#1a1424','ベルタ':'#8a3a22','ソルヴェイ':'#e0cc8a','トゥヤ':'#1a1a22','ヤスミン':'#6a3a22'}, SC={'ヤスミン':'#fadcc0','トゥヤ':'#e8b888','ソルヴェイ':'#fcdcc4','ベルタ':'#f4c8a4','リン':'#fff0e8','ゾエ':'#e0b088','ライラ':'#cc8e5c','ミレイユ':'#fcdcc8','イネス':'#f4c89c','キラン':'#d49a6c','ダグニ':'#f4c89c','ケンタ':'#e0aa78','アマラ':'#a8704a','エリフ':'#e8c09c','シオネ':'#b07a4c','ルカ':'#d4a870','ルチア':'#d4a870','ペマ':'#d8a470','フェリクス':'#f8dcc4','オユナ':'#e6b47c','ハナ':'#fcd6b0','ジュン':'#fcdcc4','クワメ':'#8a5636','デウィ':'#d49c62'};   /* 0.37.0 ペマ・フェリクス・0.39.0 オユナ・ハナ */   // 0.36.0 ルカ・ルチア（座席の髪と肌）   // 0.33.0 シオネ  // 0.8.0 ダグニ・ケンタ・0.9.0 アマラ・0.17.0 エリフ
    u.seats.forEach((s,i)=>{ const x=px+(i?9:4),y=py+9;
      if(s){ const hc=HC[s.name]||'#a06a3a', sk=SC[s.name]||'#fcd2a8';
        ctx.fillStyle=hc; ctx.fillRect(x,y,3,1); ctx.fillStyle=sk; ctx.fillRect(x,y+1,3,2); ctx.fillStyle=hc; ctx.fillRect(x,y+1,1,1); ctx.fillRect(x+2,y+1,1,1); ctx.fillStyle='#3a1c1c'; ctx.fillRect(x+1,y+1,1,1); }
      else { ctx.fillStyle='#2a3a58'; ctx.fillRect(x,y+1,3,2); }
    });
    ctx.fillStyle='#ffffff'; ctx.fillRect(px+5,py+8,2,1);   // ガラスの光（0.87.0 窓が小さくなったので右へ）
  }
  if(key.startsWith('beast')&&!o.calm){ ctx.fillStyle=f?'rgba(255,80,60,.35)':'rgba(255,80,60,.2)'; ctx.fillRect(px+4,py+8,5,3); }
};

/* ---------- 戦いの場面の立ち絵（0.5.4・7頭身ほど） ----------
   11/5 ヒロさん「戦闘はディフォルメではなく6〜8頭身・顔は描かなくてもいい・表情は顔グラで伝わる」
   区域の図を図形（だ円・太さの変わる線・多角形）で塗ってから bake で4段の影と輪郭を付ける。
   右向きで描く（味方は戦いの場面で左右を返す）。奥の手足は1段暗い色で前と分ける。
   ART.tall(u,構え,コマ)：構え＝'idle'（立つ）・'atk'（打つ）・'hurt'（受ける）。描けない相手は null（機械は今までの絵を大きくする） */
const TW=44, TH=80;
/* 0.51.0 TSC＝人の立ち絵を描くときの縮み（11/10 ヒロさん「戦闘シーンの人間をもう少し小さく・頭身は6〜8のまま」）。
   形（だ円・線・多角形・点）の座標と太さに掛けるので、ドットの細かさは機械と同じまま、人だけが小さくなる。機械を描くときは1。
   TFR＝走る構えの足の運び（コマ） */
var TSC=1, TFR=0;
const PSC=0.75;   /* 人の大きさ（仮） */
function tgrid(w,h){ return Array.from({length:Math.ceil((h||TH)*TSC)},()=>Array(Math.ceil((w||TW)*TSC)).fill('.')); }
/* only＝その区域の上にだけ塗る（帯やもようを胴からはみ出させない） */
function tput(g,x,y,ch,only){ if(x>=0&&y>=0&&y<g.length&&x<g[0].length&&(!only||only.includes(g[y][x]))) g[y][x]=ch; }
function tset(g,x,y,ch,only){ tput(g,Math.round(x*TSC),Math.round(y*TSC),ch,only); }
function tell(g,ch,cx,cy,rx,ry,only){ if(TSC!==1){ cx*=TSC; cy*=TSC; rx=Math.max(0.6,rx*TSC); ry=Math.max(0.6,ry*TSC); } for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){ const X=x+0.5,Y=y+0.5; if(((X-cx)/rx)**2+((Y-cy)/ry)**2<=1) tput(g,x,y,ch,only); } }
function tlim(g,ch,a,b,r1,r2,only){ if(TSC!==1){ a=[a[0]*TSC,a[1]*TSC]; b=[b[0]*TSC,b[1]*TSC]; r1=Math.max(0.6,r1*TSC); r2=Math.max(0.6,r2*TSC); } const [x1,y1]=a,[x2,y2]=b,R=Math.max(r1,r2)+1,dx=x2-x1,dy=y2-y1,L2=dx*dx+dy*dy||1;
  for(let y=Math.floor(Math.min(y1,y2)-R);y<=Math.ceil(Math.max(y1,y2)+R);y++)for(let x=Math.floor(Math.min(x1,x2)-R);x<=Math.ceil(Math.max(x1,x2)+R);x++){
    const X=x+0.5,Y=y+0.5,t=Math.max(0,Math.min(1,((X-x1)*dx+(Y-y1)*dy)/L2)),r=r1+(r2-r1)*t;
    if((X-x1-dx*t)**2+(Y-y1-dy*t)**2<=r*r) tput(g,x,y,ch,only); } }
function tpoly(g,ch,pts,only){ if(TSC!==1) pts=pts.map(([x,y])=>[x*TSC,y*TSC]); const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
  for(let y=Math.floor(Math.min(...ys));y<=Math.ceil(Math.max(...ys));y++)for(let x=Math.floor(Math.min(...xs));x<=Math.ceil(Math.max(...xs));x++){
    const X=x+0.5,Y=y+0.5; let inn=false;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++){ const [xi,yi]=pts[i],[xj,yj]=pts[j]; if((yi>Y)!==(yj>Y)&&X<(xj-xi)*(Y-yi)/(yj-yi)+xi) inn=!inn; }
    if(inn) tput(g,x,y,ch,only); } }
const dk=r=>[r[1],r[2],r[3],mixC(r[3],'#000000',0.35)];
/* 人の形の道具：u＝上半身を前へ出す量（打つ）・後ろへ引く量（受ける）。腰より下は動かさない */
function body(g,u){
  const sh=y=>u*Math.max(0,Math.min(1,(44-y)/36));
  return { sh,
    P:pts=>pts.map(([x,y])=>[x+sh(y),y]),
    E:(ch,cx,cy,rx,ry)=>tell(g,ch,cx+sh(cy),cy,rx,ry),
    L:(ch,a,b,r1,r2)=>tlim(g,ch,[a[0]+sh(a[1]),a[1]],[b[0]+sh(b[1]),b[1]],r1,r2),
    G:(ch,pts)=>tpoly(g,ch,pts.map(([x,y])=>[x+sh(y),y])),
    S:(ch,x,y)=>tset(g,x+sh(y),y,ch),
    boot:(ch,ax,ay)=>tpoly(g,ch,[[ax-2.6,ay-1.5],[ax+2.4,ay-1.5],[ax+3,ay+3],[ax+6,ay+5],[ax+6,ay+7],[ax-2.8,ay+7]]),
    leg:(ch,hip,knee,ank,r)=>{ tlim(g,ch,hip,knee,r[0],r[1]); tlim(g,ch,knee,ank,r[1],r[2]); } };
}
/* 持ち物の棒：手の位置 h（上半身ずれ込み）から向き d へ、上に up・下に dn */
function rod(g,ch,h,d,up,dn,r){ const n=Math.hypot(d[0],d[1]),ux=d[0]/n,uy=d[1]/n; const top=[h[0]+ux*up,h[1]+uy*up]; tlim(g,ch,[h[0]-ux*dn,h[1]-uy*dn],top,r,r); return top; }

/* ノア（男・肩幅が広い・短い上着とズボン・赤いえり巻き・おでこにゴーグル・灯のランタンを下げた杖） */
const PAL_NOA_T=Object.assign({},PAL_NOA,{
  A:{r:dk(PAL_NOA.j.r)}, P:{r:dk(PAL_NOA.p.r)}, T:{r:dk(PAL_NOA.t.r)}, S:{r:dk(PAL_NOA.s.r),ol:SKIN_OL},
  w:{r:['#d8a468','#a8743e','#7a4e2a','#4a2c1a']}, R:{r:dk(PAL_NOA.r.r)}});
/* 0.7.0 キラン（ノアの形の色違い・黒い髪・額の赤い布・白いえり巻き・赤い上着・手に長い棒）。o を省くとノアのまま */
const PAL_KIRAN_T=Object.assign({},PAL_KIRAN,{
  A:{r:dk(PAL_KIRAN.j.r)}, P:{r:dk(PAL_KIRAN.p.r)}, T:{r:dk(PAL_KIRAN.t.r)}, S:{r:dk(PAL_KIRAN.s.r),ol:SKIN_OL},
  w:{r:['#c89868','#9a6a40','#6e4628','#42281a']}, R:{r:dk(PAL_KIRAN.r.r)}});
/* 0.51.0 構えを増やした（11/10 ヒロさん「小さくなる分アクションを増やして、もっとわかりやすく」）。
   'wind'＝ふりかぶる・'run'＝走る（TFR で足を入れかえる）・'kick'＝前の足を高く・'jump'＝ひざをかかえて跳ぶ・'cheer'＝両手を上げて呼びかける。
   idle・atk・hurt は今までと同じ数。決めていない構えは立つ形。fa＝奥の腕・lf＝奥の脚・ln＝前の脚・na＝前のひじ・hand＝前の手・dir/up/dn＝ランタンの杖・sd/sup/sdn＝長い棒 */
const NOA_POSE={
  idle:{u:0,fa:[[14,21],[12,29],[13,37]],lf:[[16,42],[14,57],[13,71]],ln:[[20,42],[22,57],[23,71]],na:[23,28],hand:[27,34],dir:[0.03,-1],up:22,dn:43,sd:[0.03,-1],sup:24,sdn:43},
  atk:{u:2.5,fa:[[14,21],[11,28],[10,35]],lf:[[16,42],[13,57],[9,71]],ln:[[20,42],[25,55],[28,70]],na:[25,23],hand:[28,25],dir:[0.5,-0.9],up:17,dn:11,sd:[1,-0.12],sup:16,sdn:14},
  hurt:{u:-2.5,fa:[[14,21],[11,29],[9,36]],lf:[[16,42],[14,57],[12,71]],ln:[[20,42],[21,57],[21,71]],na:[22,28],hand:[24,35],dir:[-0.18,-1],up:22,dn:32,sd:[-0.18,-1],sup:24,sdn:30},
  wind:{u:-2,fa:[[14,21],[17,28],[21,33]],lf:[[16,42],[12,56],[8,71]],ln:[[20,42],[25,56],[27,71]],na:[18,13],hand:[15,9],dir:[-0.55,-0.85],up:18,dn:12,sd:[-0.7,-0.7],sup:18,sdn:16},
  run0:{u:4,fa:[[14,21],[9,27],[7,33]],lf:[[16,42],[11,54],[4,64]],ln:[[20,42],[28,50],[27,62]],na:[25,27],hand:[27,31],dir:[0.45,-0.9],up:18,dn:14,sd:[1,-0.35],sup:16,sdn:14},
  run1:{u:4,fa:[[14,21],[17,27],[20,32]],lf:[[16,42],[16,56],[14,70]],ln:[[20,42],[23,55],[20,67]],na:[24,28],hand:[25,33],dir:[0.45,-0.9],up:18,dn:14,sd:[1,-0.35],sup:16,sdn:14},
  kick:{u:-2,fa:[[14,21],[8,22],[4,18]],lf:[[16,42],[14,57],[13,71]],ln:[[20,42],[30,41],[40,40]],na:[25,25],hand:[26,28],dir:[0.2,-1],up:20,dn:18,sd:[0.3,-1],sup:22,sdn:20,kick:true},
  jump:{u:1,fa:[[14,21],[12,14],[13,7]],lf:[[16,42],[22,50],[15,58]],ln:[[20,42],[27,49],[21,57]],na:[24,15],hand:[24,10],dir:[0.3,-1],up:18,dn:14,sd:[0.6,-0.8],sup:18,sdn:16},
  cheer:{u:-1,fa:[[14,21],[11,15],[10,8]],lf:[[16,42],[14,57],[13,71]],ln:[[20,42],[22,57],[23,71]],na:[24,14],hand:[25,8],dir:[0.1,-1],up:18,dn:12,sd:[0.1,-1],sup:20,sdn:14}};
const poseOf=(T,pose)=>T[pose==='run'?'run'+(TFR&1):pose]||T.idle;
function figNoa(pose,o){
  const Q=poseOf(NOA_POSE,pose), g=tgrid(), u=Q.u, B=body(g,u), fist=!!(o&&o.fist);
  // 後ろへ流れるえり巻きの端
  B.G('R',[[15,17],[9,18.5],[5,22],[3.5,26],[6,25],[9,22.5],[15,21]]);
  // 奥の腕
  const fa=Q.fa;
  B.L('A',fa[0],fa[1],2.5,2.2); B.L('A',fa[1],fa[2],2.2,1.8); B.E('S',fa[2][0],fa[2][1]+1,fist?2.1:1.6,fist?2.2:1.8);
  // 脚（奥・前）
  const lf=Q.lf, ln=Q.ln;
  B.leg('P',lf[0],lf[1],lf[2],[3.3,2.6,2.0]); B.boot('T',lf[2][0],lf[2][1]);
  tpoly(g,'p',[[14,38],[23,38],[24,45],[13,45]]);
  B.leg('p',ln[0],ln[1],ln[2],[3.5,2.8,2.1]);
  if(Q.kick){ const [ax,ay]=ln[2]; tpoly(g,'t',[[ax-1,ay-2.6],[ax+4,ay-2.6],[ax+5.5,ay+2.4],[ax-1,ay+2.4]]); }   /* 0.51.0 けり出した足（横向きの靴） */
  else B.boot('t',ln[2][0],ln[2][1]);
  // 胴（短い上着）・ベルト
  B.G('j',[[12,19.5],[15,17.5],[21,17.5],[24,19.5],[24,27],[23,34],[23,41],[24.5,46.5],[18,45],[12,46.5],[13,41],[13,34],[12,27]]);
  B.G('b',[[13,38],[23.2,38],[23.2,39.8],[13,39.8]]); B.G('y',[[20.5,37.8],[22.5,37.8],[22.5,40],[20.5,40]]);
  B.G('j',[[17.5,18],[18.5,18],[18.5,37.8],[17.5,37.8]]);   // 前の合わせ（1段明るく見える）
  // 首・頭
  B.G('s',[[16.5,13],[19.5,13],[19.5,18],[16.5,18]]);
  B.E('s',18.3,10.6,4.3,5.1);
  B.G('s',[[14.5,11],[22.3,11],[22.6,13.6],[20,16.2],[16.5,16],[14.5,14]]);
  B.G('h',[[13,12],[12.8,7],[14.2,4.4],[16.8,3],[19.8,3],[22.3,4.8],[23.2,8],[21.6,7.4],[20.6,8.6],[19,7.6],[17.4,9.2],[16.6,12.4],[15.2,14.2],[13.6,13.8]]);
  B.G('h',[[13.4,5.6],[10.2,6.8],[13,9.2]]); B.G('h',[[13,9.5],[10.6,11.6],[13.4,12.4]]); B.G('h',[[15.6,3.8],[16.6,1.4],[18.2,3.4]]);
  B.E('s',16.4,11.4,0.9,1.3);                       // 耳
  B.L('g',[13.2,6.4],[22.2,6.2],0.9,0.9); B.E('l',20.6,6.2,1.4,1.2);   // ゴーグル
  B.S('e',21,10); B.S('s',23,10.6);                 // 目のしるしと鼻（顔は描かない）
  if(TSC>1){ B.S('e',21,10.7); B.S('h',20.4,9); B.S('h',21.1,9); B.S('m',22.1,13.4); }   /* 0.83.0 細かく描くときは目を2ドット・眉・口 */
  if(o&&o.cook){   /* 0.41.0 クワメ：コック帽（帯とふくらみ）と、あごのひげ。ゴーグルは帽子の帯で隠れる */
    B.G('W',[[13,8],[23.4,8],[23.2,4.8],[13.2,4.8]]); B.E('W',18.2,3.2,5.4,3.2);
    B.G('h',[[15.6,13.2],[21.6,13.8],[21.2,16.2],[18.6,17.6],[16.6,16.2]]); }
  B.G('r',[[15.3,15.6],[21,15.6],[21.6,18.8],[14.8,18.8]]);   // えり巻き
  // 杖とランタン（手の前に）
  const hand=Q.hand, dir=Q.dir;
  const H=[hand[0]+B.sh(hand[1]),hand[1]];
  if(fist){}   /* 0.51.0 パブロ：何も持たない（こぶし） */
  else if(o&&o.staff){   // キラン：ランタンのない長い棒（両はしに金具）。打つときは前へ突き出す
    const sd=Q.sd, n=Math.hypot(sd[0],sd[1]), ux=sd[0]/n, uy=sd[1]/n, up=Q.sup, dn=Q.sdn;
    rod(g,'w',H,sd,up,dn,0.9);
    tell(g,'y',H[0]+ux*up,H[1]+uy*up,1.1,1.1); tell(g,'y',H[0]-ux*dn,H[1]-uy*dn,1.1,1.1);
  } else {
  const top=rod(g,'w',H,dir,Q.up,Q.dn,0.8);
  tell(g,'y',top[0],top[1],1.3,1.3); const lx=Math.round(top[0]), ly=Math.round(top[1]);
  tset(g,lx+1,ly+1,'y'); tset(g,lx+2,ly+2,'y');
  tpoly(g,'y',[[lx+0.5,ly+3],[lx+4.5,ly+3],[lx+4.5,ly+9],[lx+0.5,ly+9]]); tpoly(g,'f',[[lx+1.5,ly+4],[lx+3.5,ly+4],[lx+3.5,ly+8],[lx+1.5,ly+8]]);
  }
  // 前の腕
  const na=[[21,21],Q.na,hand];
  B.L('a',na[0],na[1],2.7,2.3); B.L('a',na[1],[na[2][0]-1,na[2][1]-1],2.3,1.9); B.E('s',na[2][0],na[2][1],fist?2.3:1.7,fist?2.4:1.8);
  return bake(g,(o&&o.pal)||PAL_NOA_T);
}
/* イネス（女・肩が細い・長い首・白いブラウスと青いジャンパースカート・紫の脚・高いポニーテール・バンダナ・スパナ） */
const PAL_INES_T=Object.assign({},PAL_INES,{
  W:{r:dk(PAL_INES.w.r)}, Q:{r:dk(PAL_INES.q.r)}, T:{r:dk(PAL_INES.t.r)}, S:{r:dk(PAL_INES.s.r),ol:SKIN_OL},
  O:{r:dk(PAL_INES.o.r)}, H:{r:dk(PAL_INES.h.r)}});
/* 0.51.0 イネスの形の構え（ノアの形と同じ名前）。hand・dir＝スパナを持つ手と向き・na＝前のひじ */
const INES_POSE={
  idle:{u:0,fa:[[15.5,22],[14,29],[14.5,36]],lf:[[16.5,45],[15.5,58],[14.5,71]],ln:[[19.5,45],[21,58],[21.5,71]],na:[22.5,28],hand:[24.5,33],dir:[0.25,1],len:10},
  atk:{u:2,fa:[[15.5,22],[13,28],[12,34]],lf:[[16.5,45],[14,58],[11,71]],ln:[[19.5,45],[24,57],[26,70]],na:[23,19],hand:[25,17],dir:[0.55,-0.85],len:11},
  hurt:{u:-2.5,fa:[[15.5,22],[13,29],[11,35]],lf:[[16.5,45],[15,58],[13,71]],ln:[[19.5,45],[20,58],[20,71]],na:[22,27.5],hand:[22,33],dir:[-0.25,1],len:10},
  wind:{u:-2,fa:[[15.5,22],[18,28],[21,32]],lf:[[16.5,45],[13,58],[9.5,71]],ln:[[19.5,45],[24,58],[26,71]],na:[17.5,14],hand:[15,8],dir:[-0.5,-0.85],len:10},
  run0:{u:4,fa:[[15.5,22],[11,27],[9,32]],lf:[[16.5,45],[12,56],[6,65]],ln:[[19.5,45],[27,52],[26,63]],na:[24,26],hand:[25,30],dir:[0.7,0.7],len:10},
  run1:{u:4,fa:[[15.5,22],[18,27],[21,31]],lf:[[16.5,45],[17,58],[15,70]],ln:[[19.5,45],[22.5,57],[20,68]],na:[23,27],hand:[23.5,32],dir:[0.5,0.85],len:10},
  kick:{u:-2,fa:[[15.5,22],[10,22],[6,18]],lf:[[16.5,45],[15.5,58],[14.5,71]],ln:[[19.5,45],[29,44],[38,43]],na:[24,23],hand:[24,26],dir:[0.6,-0.8],len:10,kick:true},
  jump:{u:1,fa:[[15.5,22],[13.5,15],[14,8]],lf:[[16.5,45],[22,52],[16,59]],ln:[[19.5,45],[26,51],[21,58]],na:[23,15],hand:[23,9],dir:[0.3,-0.95],len:10},
  cheer:{u:-1,fa:[[15.5,22],[12.5,16],[11.5,9]],lf:[[16.5,45],[15.5,58],[14.5,71]],ln:[[19.5,45],[21,58],[21.5,71]],na:[23.5,15],hand:[24,8],dir:[0.2,-1],len:10}};
function figInes(pose,f,pal,o){   // 0.8.0 pal を渡すと色違い（ダグニ）。省くとイネスのまま。0.49.0 o＝{bun,spatula}（デウィ：おだんごと鉄べら。省くと今までと同じ）
  const Q=poseOf(INES_POSE,pose), g=tgrid(), u=Q.u, B=body(g,u), sw=f?1:0, bun=!!(o&&o.bun), sp=!!(o&&o.spatula), sg=!!(o&&o.sign), fn=!!(o&&o.fan), ld=!!(o&&o.ladle), ap=!!(o&&o.apron), bd=!!(o&&(o.braid||o.crop)), sash=!!(o&&o.sash), stf=!!(o&&o.staff), shw=!!(o&&o.shawl), bk=!!(o&&o.book), spc=!!(o&&o.spec), rl=!!(o&&o.ruler);   /* 0.62.0 o.book・o.spec・o.ruler＝ヤスミン（首からさげた帳面・丸い眼鏡・物差し） */   /* 0.61.0 o.braid・o.shawl＝ソルヴェイ（前に垂らす三つ編みとショール） */   /* 0.61.0 25章 o.ladle・o.apron＝ベルタ（お玉と生成りのエプロン） */   /* 0.57.0 20章 o.fan＝リン（杖の先に開いた扇） */   /* 0.56.0 19章 o.sign＝ゾエ（先が矢印の板の杖） */
  // ポニーテール（後ろ・ゆれる）
  if(!bun&&!bd) B.G('H',[[15,8],[12,8.5],[8.5,12],[6.5+sw,18],[6+sw,24],[8.5+sw,27],[8.6+sw,21],[10.6,15.5],[14.6,12]]);
  // 奥の腕
  const fa=Q.fa;
  B.L('W',fa[0],fa[1],2.1,1.9); B.L('S',fa[1],fa[2],1.5,1.3); B.E('S',fa[2][0],fa[2][1]+1,1.3,1.5);
  // 脚
  const lf=Q.lf, ln=Q.ln;
  B.leg('Q',lf[0],lf[1],lf[2],[2.6,2.1,1.6]); B.boot('T',lf[2][0]-0.3,lf[2][1]);
  B.leg('q',ln[0],ln[1],ln[2],[2.8,2.2,1.7]);
  if(Q.kick){ const [ax,ay]=ln[2]; tpoly(g,'t',[[ax-1,ay-2.4],[ax+3.6,ay-2.4],[ax+5,ay+2.2],[ax-1,ay+2.2]]); }   /* 0.51.0 けり出した足 */
  else B.boot('t',ln[2][0],ln[2][1]);
  // ブラウス・スカート
  B.G('w',[[14,21.5],[16,19.8],[20.5,19.8],[22.5,21.5],[22,28],[21,33],[16,33],[14.5,28]]);
  B.G('o',[[15.4,24.5],[21.3,24.5],[21,33.5],[25.5,50],[22,51.3],[18.5,50.6],[15,51.3],[11.6,50],[15.8,33.5]]);
  B.L('o',[16,20.2],[16,24.6],0.6,0.6); B.L('o',[20.4,20.2],[20.4,24.6],0.6,0.6);   // 肩ひも
  if(ap) B.G('a',[[15.9,24.8],[20.9,24.8],[20.6,33.5],[22.8,49.4],[14.2,49.4],[15.6,33.5]]);   /* 0.61.0 ベルタ 生成りのエプロン */
  if(sash){ B.G('y',[[15.2,32.6],[21.4,32.6],[21.5,35.8],[15,35.8]]); B.G('y',[[16,35.6],[17.6,35.6],[17,40],[15.6,40]]); B.E('g',19.6,20.6,0.9,0.9); }   /* 0.61.0 トゥヤ 青い帯と首の金の鈴 */
  if(shw){ B.G('a',[[13.4,20.2],[22.8,20.4],[23.4,26.4],[20.6,31.6],[18.4,29],[16.4,31.6],[13.2,26.6]]); B.L('y',[14,25.4],[22.6,25.6],0.5,0.5,['a']); B.L('y',[15.6,29.6],[21.4,29.8],0.5,0.5,['a']); for(const x of [15.4,18.4,21.2]) B.L('y',[x,21.4],[x,24.2],0.4,0.4,['a']); }   /* 0.61.0 ソルヴェイ 生成りに赤い模様のショール */
  if(bk){ B.L('n',[16.6,20.2],[17.4,25],0.4,0.4); B.L('n',[20.6,20.2],[20,25],0.4,0.4); B.G('n',[[16.4,24.6],[21.8,24.6],[21.8,31],[16.4,31]]); B.G('a',[[21.4,25],[21.9,25],[21.9,30.6],[21.4,30.6]]); B.G('r',[[18,24.6],[19,24.6],[19,31.4],[18,31.4]]); }   /* 0.62.0 ヤスミン 首からさげた帳面（茶の表紙・赤いしおり） */
  B.G('O',[[12,49.4],[25,49.4],[25.6,50.2],[22,51.3],[18.5,50.6],[15,51.3],[11.5,50.2]]);   // すその折り返し
  // 首・頭（顔は小さめ・あごは細い）
  B.G('s',[[17,13.5],[19.6,13.5],[19.6,20],[17,20]]);
  B.E('s',18.6,11.4,3.9,4.7);
  B.G('s',[[15.4,11.5],[22.3,11.5],[22.2,13.8],[19.8,16],[17.4,15.6],[15.4,13.6]]);
  B.G('h',[[14.4,13.4],[14,8.6],[15.4,6],[18.4,5.2],[21,6],[22.6,8.6],[21.4,8.6],[19.6,8.1],[17.6,9.6],[16.8,13],[16.2,17.5],[14.8,17.5]]);
  if(bun){ B.E('h',18.2,3.8,3.9,3.4); B.E('H',19.2,4.6,1.5,1.2); }   /* 0.49.0 デウィ 頭の上のおだんご */
  B.G('d',[[14.1,7.4],[15.6,5],[18.6,4.2],[21.4,5],[22.9,7.6],[22,8.4],[18.6,7.4],[14.8,8.6]]);   // バンダナ（デウィではヘアバンド）
  if(!bun&&!bd) B.G('d',[[14.4,7],[11.4,5.2],[10.6,7.4],[12.6,8.6],[11.2,10.2],[14.2,9]]);                         // 結び目の端
  if(spc){ B.E('g',21.6,10.9,2.7,2.7); B.E('s',21.6,10.9,1.8,1.8); B.L('g',[19,10.6],[15.6,10.4],0.35,0.35); }   /* 0.62.0 ヤスミン 丸い眼鏡（真鍮色の輪とつる） */
  B.S('e',21,11); B.S('e',21,10); B.S('s',23,11.6);   // 目としるしのまつげ・鼻
  if(TSC>1) B.S('m',22,13.9);   /* 0.83.0 細かく描くときは口 */
  if(bd&&!(o&&o.crop)){ const bp=[[17.4,15],[19.2,20],[19.8,27],[19.6,34],[19.2,40]]; for(let i=0;i<bp.length-1;i++) B.L(i%2?'H':'h',bp[i],bp[i+1],1.7,1.6); B.E('y',19.2,41.4,1.5,1.9); B.E('H',18.8,44,1.1,1.8); }   /* 0.61.0 ソルヴェイ 前に垂らす三つ編み（赤い結び） */
  // 前の腕とスパナ
  const hand=Q.hand;
  const H=[hand[0]+B.sh(hand[1]),hand[1]];
  const dir=Q.dir, top=rod(g,(sp||ld||stf||rl)?'v':shw?'a':'k',H,dir,Q.len,1,0.8), atk=pose==='atk', upw=dir[1]<0;
  const jx=Math.round(top[0]),jy=Math.round(top[1]);
  if(sp){ tpoly(g,'k',[[jx-2.6,jy-1.4],[jx+2.6,jy-1.4],[jx+2.6,jy+4],[jx-2.6,jy+4]]); tpoly(g,'v',[[jx-1,jy-2],[jx+1,jy-2],[jx+1,jy-0.4],[jx-1,jy-0.4]]); }   /* 0.49.0 デウィ 手に小さな鉄べら（平たい刃） */
  else if(ld){ tpoly(g,'k',[[jx-2.8,jy-0.6],[jx+2.8,jy-0.6],[jx+3,jy+1.4],[jx+1.8,jy+3.6],[jx-1.8,jy+3.6],[jx-3,jy+1.4]]); tpoly(g,'v',[[jx-1,jy-2],[jx+1,jy-2],[jx+1,jy-0.4],[jx-1,jy-0.4]]); }   /* 0.61.0 25章 ベルタ 手にお玉（丸い鉄のおわん） */
  else if(stf){ tpoly(g,'v',[[jx-1.6,jy-1.8],[jx+1.6,jy-1.8],[jx+1.6,jy+1.6],[jx-1.6,jy+1.6]]); tpoly(g,'g',[[jx-0.8,jy+1.6],[jx+0.8,jy+1.6],[jx+0.8,jy+3],[jx-0.8,jy+3]]); }   /* 0.61.0 トゥヤ 木の番の杖（先にちいさな金の鈴） */
  else if(shw){ tpoly(g,'a',[[jx-2.6,jy-1.4],[jx+2.6,jy-1.4],[jx+3,jy+3],[jx-3,jy+3]]); tpoly(g,'y',[[jx-2.8,jy+0.4],[jx+2.8,jy+0.4],[jx+2.9,jy+1.4],[jx-2.9,jy+1.4]]); tpoly(g,'y',[[jx-2,jy+3],[jx-1,jy+3],[jx-1,jy+5],[jx-2,jy+5]]); tpoly(g,'y',[[jx+1,jy+3],[jx+2,jy+3],[jx+2,jy+5],[jx+1,jy+5]]); }   /* 0.61.0 ソルヴェイ 手にショール（たたんだ毛糸の布と赤いふさ） */
  else if(rl){ tpoly(g,'v',[[jx-1.1,jy-4.4],[jx+1.1,jy-4.4],[jx+1.1,jy+4.4],[jx-1.1,jy+4.4]]); for(const dy of [-3,-1,1,3]) tset(g,jx+1,jy+dy,'e'); }   /* 0.62.0 ヤスミン 手に物差し（細長い板・目盛り） */
  else if(sg){ tpoly(g,'a',[[jx-3,jy-2.2],[jx+3,jy-2.2],[jx+6.4,jy],[jx+3,jy+2.2],[jx-3,jy+2.2]]); tpoly(g,'k',[[jx-0.9,jy-0.6],[jx+0.9,jy-0.6],[jx+0.9,jy+0.6],[jx-0.9,jy+0.6]]); }   /* 0.56.0 19章 ゾエ 杖の先の矢印の板（道しるべ） */
  else if(fn){ tpoly(g,'a',[[jx-5,jy-3],[jx-2,jy-6],[jx+2,jy-6],[jx+5,jy-3],[jx+1,jy+1],[jx-1,jy+1]]); tpoly(g,'k',[[jx-0.6,jy-4],[jx+0.6,jy-4],[jx+0.6,jy+1],[jx-0.6,jy+1]]); }   /* 0.57.0 20章 リン 手に開いた扇 */
  else { tpoly(g,'k',[[jx-2,jy-2],[jx+2,jy-2],[jx+2,jy+2],[jx-2,jy+2]]); tset(g,jx+(atk?1:0),jy+(upw?-1:1),'.'); tset(g,jx+(atk?2:0),jy+(upw?-2:2),'.'); }
  const na=[[20.5,22],Q.na,hand];
  B.L('w',na[0],na[1],2.2,1.9); B.L('s',na[1],na[2],1.5,1.3); B.E('s',na[2][0],na[2][1],1.4,1.5);
  return bake(g,pal||PAL_INES_T);
}
/* 影（フードをかぶった背の高い人の形・すそが霧になってゆれる・目だけ光る） */
function figShadow(pose,f,eye,base,look,named){
  const g=tgrid(), atk=pose==='atk', hurt=pose==='hurt', u=atk?3:hurt?-3:0, B=body(g,u);
  if(look==='heavy') B.G('s',[[12,20],[25,19],[30,36],[33,55],[35,71],[5,71],[6,55],[8,36]]);   // 0.18.0 うずくまる影：すそが広い
  B.G('s',[[14,17],[23,16],[26.5,24],[27,40],[29,57],[31,71],[8,71],[9.5,56],[10.5,38],[11.5,24]]);
  B.L('z',[16,24],[14,68],0.6,1.2); B.L('z',[21,24],[24,68],0.6,1.2);   // 衣のひだ
  B.G('s',[[12,11],[14,6.5],[18,4.5],[22,6],[24.8,10],[24.5,16],[21,18.5],[14,18.5],[11.5,15]]);   // フード
  B.E('k',21.4,12.2,2.5,3.4);
  if(look==='mute') B.L('e',[19.8,12],[23.6,12],0.4,0.4);   // 0.18.0 黙りこむ影：目を閉じた線
  else { B.S('e',20.6,11.6); B.S('e',23,11.6); }
  if(named){ B.L('h',[13,11],[10.5,36],1.8,1.1); B.L('h',[15,9],[13.5,30],1.2,0.8); B.L('h',[24.5,13],[26.5,30],1.4,0.9);   // 0.18.0 名前のある影：フードからこぼれる長い髪と、胸の消えかけの灯
    B.E('g',18.5,30,1.8,1.8); B.S('G',18.5,29.5); }
  const hand=atk?[35,24]:hurt?[27,35]:[30,33];
  B.L('s',[23,21],atk?[29,22]:[27,27],2.8,2.4); B.L('s',atk?[29,22]:[27,27],hand,2.4,1.8);
  for(let i=-1;i<=1;i++) B.L('w',hand,[hand[0]+3,hand[1]+i*1.6+1],0.5,0.5);   // 爪のような指
  if(look==='far'){ B.E('w',hand[0]+5,hand[1]-1,2.6,2.2); B.E('w',hand[0]+8.5,hand[1]-3,1.6,1.4); }   // 0.18.0 霧吹きの影：手もとの霧の玉
  if(look==='fast') for(const [y,l] of [[30,9],[40,12],[50,8],[60,11]]) B.L('w',[8,y],[8-l,y+2],0.5,0.4);   // 0.18.0 はぐれ影：うしろへ流れる霧
  for(let x=8;x<=31;x++){ if(x%3===2) continue; const n=[2,5,1,6,3,1,4,2][(x+f*3)%8]; for(let k=0;k<n;k++) tset(g,x+(k>2?(f?1:-1):0),71+k,k<2?'s':'w'); }   // すそは霧の筋（長さをばらばらに・2コマでなびく）
  if(look==='heavy') for(let x=5;x<=34;x+=4) tset(g,x,71+(x%3),'w');
  const b=base||['#7a5a9a','#4e3868','#33244a','#1e1430'];
  return bake(g,{s:{r:b,ol:'#120a1c'}, z:{r:dk(b),ol:'#120a1c'}, w:{r:['#a894c8','#7a68a0','#56467a','#3a2c56'],ol:'#120a1c'}, k:{c:'#0c0614',nol:true}, e:{c:eye||'#ff6080',nol:true},
    h:{r:['#d8b08a','#a87c5c','#7a5440','#4e3428'],ol:'#120a1c'}, g:{c:'#ffc040',nol:true}, G:{c:'#fff4c0',nol:true}});
}
/* 0.61.0 24章 霧の壁（look==='kiri'・北の門をふさぐ大きな霧のかたまり。幅いっぱいにうねる塊・中でぼんやり光る目が2つ・すそは霧の筋）。攻めるとき前へせり出す */
function figKiri(pose,f,eye){
  const g=tgrid(), atk=pose==='atk', hurt=pose==='hurt', u=atk?3:hurt?-3:0, B=body(g,u), o=f?1:0;
  B.E('s',20,46,15,23); B.E('s',20,25,10,8);
  for(let i=0;i<16;i++){ const a=i*Math.PI/8+f*0.12, r=1+0.05*Math.sin(i*2.3+f*2.1); B.E('s',20+Math.cos(a)*15.5*r,46+Math.sin(a)*22.5*r,4.2+(i*7%3)*0.9,4.6+(i*5%3)*0.9); }   /* 縁をまるい塊でうねらせる（式で決める・2コマでゆれる） */
  B.L('s',[32,40],atk?[42,32]:[39,46],3.2,1.8);
  B.E('w',14,16+o*0.5,3,2.2); B.E('w',25,15-o*0.5,3.4,2.4); B.E('w',4,28,2.6,2.2);
  B.E('w',10,44,5,3.4); B.E('w',29,47,6,3.2); B.E('w',17,60,7,3); B.E('w',33,30,4,3); B.E('w',7,32,3.2,2.6); B.E('w',20,13+o*0.6,3.6,2.4); B.E('w',24,53,4,2.4); B.E('w',12,22,3.4,2.4);
  B.E('h',14,34,5.6,6.4); B.E('h',27,33,5.6,6.4);   /* 目のまわりのぼんやりした光 */
  B.E('k',14,34.2,3.6,4.4); B.E('k',27,33.2,3.6,4.4);
  B.E('e',14,34.6,2.3,3.1); B.E('e',27,33.6,2.3,3.1);
  for(let x=4;x<=37;x++){ if(x%3===2) continue; const n=[2,5,1,6,3,1,4,2][(x+f*3)%8]; for(let k=0;k<n;k++) tset(g,x+(k>2?(f?1:-1):0),71+k,k<2?'s':'w'); }   // すそは霧の筋（2コマでなびく）
  return bake(g,Object.assign({},palKiri(eye),{k:{c:'#1c2040',nol:true}, h:{c:'#6a78b4',nol:true}}));
}
/* 0.68.0 33章 雪のかたまり（look==='yuki'・こんもり丸い雪の山。青い陰・中ほどに琥珀色の灯が2つ透ける・すそは崩れた雪）。動かないのでポーズも揺れもなし */
function figYuki(eye){
  const g=tgrid(), B=body(g,0);
  B.E('s',20,58,17.5,13); B.E('s',20,44,13.5,15); B.E('s',20,35,9,8);
  B.E('w',15,35,6,5); B.E('w',11,47,5,7); B.E('w',9,60,6,5); B.E('w',22,28,3.5,2.4);
  B.E('z',29,52,6,10,['s']); B.E('z',27,64,8,5,['s']); B.E('z',32,42,3,6,['s']);
  B.E('h',13,44,5.6,5.6); B.E('h',27,44,5.6,5.6);   /* 灯のまわりのぼんやりした光 */
  B.E('e',13,44,2.4,2.4); B.E('e',27,44,2.4,2.4);
  B.E('w',6,69,4.4,2.8); B.E('s',33,70,4.6,2.8); B.E('w',17,72,3.4,2); B.E('z',26,71,4,2); B.E('w',2,65,2,1.6); B.E('w',37,66,2.2,1.6);   /* すその崩れた雪 */
  return bake(g,Object.assign({},palYuki(eye),{h:{c:'#f6e4b8',nol:true}}));
}
/* 機械（0.5.5・ヒロさん「機械も描き直して」）：72×100。人の立ち絵より3割ほど高い。同じドットの細かさで描く */
const MW=72, MH=100;
function mach(g,u){   // 腰より上を u だけ前後へ。脚は根もとから少しだけ
  const sh=y=>y<72?u:u*Math.max(0,(92-y)/20);
  return { sh,
    E:(ch,cx,cy,rx,ry,o)=>tell(g,ch,cx+sh(cy),cy,rx,ry,o),
    L:(ch,a,b,r1,r2,o)=>tlim(g,ch,[a[0]+sh(a[1]),a[1]],[b[0]+sh(b[1]),b[1]],r1,r2,o),
    G:(ch,pts,o)=>tpoly(g,ch,pts.map(([x,y])=>[x+sh(y),y]),o),
    S:(ch,x,y,o)=>tset(g,x+sh(y),y,ch,o) };
}
/* コモリ（救助の機械・クリーム色の胴にだいだいの帯・前と後ろの2席のガラス屋根・頭の灯・救助アーム・2本脚） */
const PAL_KOMORI_T=Object.assign({},PAL_KOMORI,{
  L:{r:dk(PAL_KOMORI.l.r)}, M:{r:dk(PAL_KOMORI.m.r)}, c:{r:PAL_KOMORI.m.r}, q:'#2a3044', w:'#fffdf0',
  s:{r:PAL_NOA.s.r,ol:'#3a4250'}, n:{r:PAL_NOA.h.r,ol:'#3a4250'}, i:{r:PAL_INES.h.r,ol:'#3a4250'}, d:{r:PAL_INES.d.r,ol:'#3a4250'},
  G:{c:'#f4fcff',nol:true}, A:'#5a5e6a', K:{r:PAL_KIRAN.h.r,ol:'#3a4250'}, D:{r:PAL_KIRAN.g.r,ol:'#3a4250'}, Y:{r:PAL_DAGNY.h.r,ol:'#3a4250'},
  B:{r:dk(PAL_KOMORI.b.r)}, R:{r:dk(PAL_KOMORI.r.r)}});   // 0.32.0 B・R＝胴と帯の1段暗い色（背中の付け足し）
const machT=p=>Object.assign({},PAL_KOMORI_T,{b:p.b, r:p.r, a:p.a, B:{r:dk(p.b.r)}, R:{r:dk(p.r.r)}});
/* 0.7.0 カモメ（コモリの形の色違い・白い胴に黄色の帯・頭の灯は青） */
const PAL_KAMOME_T=machT(PAL_KAMOME);
/* 0.8.0 ミズハ（コモリの形の色違い・青い胴に白い帯）・ダグニ（イネスの形）・ケンタ（ノアの形・長い竿） */
const PAL_MIZUHA_T=machT(PAL_MIZUHA);
/* 0.9.0 アマラ（イネスの形）・ウタカタ（コモリの形） */
const PAL_UTAKATA_T=machT(PAL_UTAKATA);
const PAL_AMARA_T=Object.assign({},PAL_AMARA,{
  W:{r:dk(PAL_AMARA.w.r)}, Q:{r:dk(PAL_AMARA.q.r)}, T:{r:dk(PAL_AMARA.t.r)}, S:{r:dk(PAL_AMARA.s.r),ol:SKIN_OL},
  O:{r:dk(PAL_AMARA.o.r)}, H:{r:dk(PAL_AMARA.h.r)}});
/* 0.17.0 エリフ（イネスの形）・アカリ（コモリの形） */
const PAL_AKARI_T=machT(PAL_AKARI), PAL_SPANA_T=machT(PAL_SPANA);   // 0.32.0 スパナ
const PAL_TOMOSHIBI_T=Object.assign({},machT(PAL_TOMOSHIBI),{m:{r:PAL_TOMOSHIBI.m.r}, M:{r:dk(PAL_TOMOSHIBI.m.r)}, c:{r:PAL_TOMOSHIBI.m.r}, l:{r:PAL_TOMOSHIBI.l.r}, L:{r:dk(PAL_TOMOSHIBI.l.r)}});   /* 0.54.0 トモシビ（真鍮の金物と藍の脚） */
const MACH_T={tomoshibi:PAL_TOMOSHIBI_T,komori:PAL_KOMORI_T,kamome:PAL_KAMOME_T,mizuha:PAL_MIZUHA_T,utakata:PAL_UTAKATA_T,akari:PAL_AKARI_T,spana:PAL_SPANA_T,naminori:machT(PAL_NAMINORI),ikari:machT(PAL_IKARI),morihito:machT(PAL_MORIHITO),tsubame:machT(PAL_TSUBAME),kasasagi:machT(PAL_KASASAGI),shabon:machT(PAL_SHABON),harinezumi:machT(PAL_HARINEZUMI),iwao:machT(PAL_IWAO),tsutsumi:Object.assign({},machT(PAL_TSUTSUMI),{m:{r:PAL_TSUTSUMI.m.r}, M:{r:dk(PAL_TSUTSUMI.m.r)}, c:{r:PAL_TSUTSUMI.m.r}, l:{r:PAL_TSUTSUMI.l.r}, L:{r:dk(PAL_TSUTSUMI.l.r)}}),kazami:machT(PAL_KAZAMI),watari:machT(PAL_WATARI)};   // 0.33.0・0.34.0 モリヒト・0.36.0 ツバメ・カササギ・0.39.0 シャボン
const PAL_ELIF_T=Object.assign({},PAL_ELIF,{
  W:{r:dk(PAL_ELIF.w.r)}, Q:{r:dk(PAL_ELIF.q.r)}, T:{r:dk(PAL_ELIF.t.r)}, S:{r:dk(PAL_ELIF.s.r),ol:SKIN_OL},
  O:{r:dk(PAL_ELIF.o.r)}, H:{r:dk(PAL_ELIF.h.r)}});
const PAL_DAGNY_T=Object.assign({},PAL_DAGNY,{
  W:{r:dk(PAL_DAGNY.w.r)}, Q:{r:dk(PAL_DAGNY.q.r)}, T:{r:dk(PAL_DAGNY.t.r)}, S:{r:dk(PAL_DAGNY.s.r),ol:SKIN_OL},
  O:{r:dk(PAL_DAGNY.o.r)}, H:{r:dk(PAL_DAGNY.h.r)}});
const PAL_KENTA_T=Object.assign({},PAL_KENTA,{
  A:{r:dk(PAL_KENTA.j.r)}, P:{r:dk(PAL_KENTA.p.r)}, T:{r:dk(PAL_KENTA.t.r)}, S:{r:dk(PAL_KENTA.s.r),ol:SKIN_OL},
  w:{r:WOOD}, R:{r:dk(PAL_KENTA.r.r)}});
const PAL_SIONE_T=Object.assign({},PAL_SIONE,{   // 0.33.0 シオネ（ノアの形・櫂）
  A:{r:dk(PAL_SIONE.j.r)}, P:{r:dk(PAL_SIONE.p.r)}, T:{r:dk(PAL_SIONE.t.r)}, S:{r:dk(PAL_SIONE.s.r),ol:SKIN_OL},
  w:{r:WOOD}, R:{r:dk(PAL_SIONE.r.r)}});
const PAL_LUCA_T=Object.assign({},PAL_LUCA,{   // 0.36.0 ルカ（ノアの形）
  A:{r:dk(PAL_LUCA.j.r)}, P:{r:dk(PAL_LUCA.p.r)}, T:{r:dk(PAL_LUCA.t.r)}, S:{r:dk(PAL_LUCA.s.r),ol:SKIN_OL},
  w:{r:WOOD}, R:{r:dk(PAL_LUCA.r.r)}});
const PAL_LUCIA_T=Object.assign({},PAL_LUCIA,{   // 0.36.0 ルチア（イネスの形）
  W:{r:dk(PAL_LUCIA.w.r)}, Q:{r:dk(PAL_LUCIA.q.r)}, T:{r:dk(PAL_LUCIA.t.r)}, S:{r:dk(PAL_LUCIA.s.r),ol:SKIN_OL},
  O:{r:dk(PAL_LUCIA.o.r)}, H:{r:dk(PAL_LUCIA.h.r)}});
const PAL_PEMA_T=Object.assign({},PAL_PEMA,{   // 0.37.0 ペマ（イネスの形）
  W:{r:dk(PAL_PEMA.w.r)}, Q:{r:dk(PAL_PEMA.q.r)}, T:{r:dk(PAL_PEMA.t.r)}, S:{r:dk(PAL_PEMA.s.r),ol:SKIN_OL},
  O:{r:dk(PAL_PEMA.o.r)}, H:{r:dk(PAL_PEMA.h.r)}});
const PAL_FELIX_T=Object.assign({},PAL_FELIX,{   // 0.37.0 フェリクス（ノアの形・杖）
  A:{r:dk(PAL_FELIX.j.r)}, P:{r:dk(PAL_FELIX.p.r)}, T:{r:dk(PAL_FELIX.t.r)}, S:{r:dk(PAL_FELIX.s.r),ol:SKIN_OL},
  w:{r:WOOD}, R:{r:dk(PAL_FELIX.r.r)}});
const PAL_JUN_T=Object.assign({},PAL_JUN,{   /* 0.40.0 ジュン（ノアの形・旅の杖） */
  A:{r:dk(PAL_JUN.j.r)}, P:{r:dk(PAL_JUN.p.r)}, T:{r:dk(PAL_JUN.t.r)}, S:{r:dk(PAL_JUN.s.r),ol:SKIN_OL},
  w:{r:WOOD}, R:{r:dk(PAL_JUN.r.r)}});
const PAL_KWAME_T=Object.assign({},PAL_KWAME,{   /* 0.41.0 クワメ（ノアの形・コック帽とひげ・お玉のつもりの杖） */
  A:{r:dk(PAL_KWAME.j.r)}, P:{r:dk(PAL_KWAME.p.r)}, T:{r:dk(PAL_KWAME.t.r)}, S:{r:dk(PAL_KWAME.s.r),ol:SKIN_OL},
  w:{r:WOOD}, R:{r:dk(PAL_KWAME.r.r)}});
const PAL_DEWI_T=Object.assign({},PAL_DEWI,{   /* 0.49.0 デウィ（イネスの形・おだんご・鉄べら） */
  W:{r:dk(PAL_DEWI.w.r)}, Q:{r:dk(PAL_DEWI.q.r)}, T:{r:dk(PAL_DEWI.t.r)}, S:{r:dk(PAL_DEWI.s.r),ol:SKIN_OL},
  O:{r:dk(PAL_DEWI.o.r)}, H:{r:dk(PAL_DEWI.h.r)}, v:{r:WOOD}});
const PAL_MIREILLE_T=Object.assign({},PAL_MIREILLE,{   /* 0.53.0 ミレイユ（イネスの形・おだんご・手に記録帳のつもりの小さな角） */
  W:{r:dk(PAL_MIREILLE.w.r)}, Q:{r:dk(PAL_MIREILLE.q.r)}, T:{r:dk(PAL_MIREILLE.t.r)}, S:{r:dk(PAL_MIREILLE.s.r),ol:SKIN_OL},
  O:{r:dk(PAL_MIREILLE.o.r)}, H:{r:dk(PAL_MIREILLE.h.r)}});
const PAL_LAYLA_T=Object.assign({},PAL_LAYLA,{   /* 0.54.0 ライラ（イネスの形・長い髪・手に小さな手提げランタン） */
  W:{r:dk(PAL_LAYLA.w.r)}, Q:{r:dk(PAL_LAYLA.q.r)}, T:{r:dk(PAL_LAYLA.t.r)}, S:{r:dk(PAL_LAYLA.s.r),ol:SKIN_OL},
  O:{r:dk(PAL_LAYLA.o.r)}, H:{r:dk(PAL_LAYLA.h.r)}});
const PAL_ZOE_T=Object.assign({},PAL_ZOE,{   /* 0.56.0 19章 ゾエ（イネスの形・短いポニーテール・手に先が矢印の板の杖＝道しるべ） */
  W:{r:dk(PAL_ZOE.w.r)}, Q:{r:dk(PAL_ZOE.q.r)}, T:{r:dk(PAL_ZOE.t.r)}, S:{r:dk(PAL_ZOE.s.r),ol:SKIN_OL},
  O:{r:dk(PAL_ZOE.o.r)}, H:{r:dk(PAL_ZOE.h.r)}});
const PAL_LINH_T=Object.assign({},PAL_LINH,{   /* 0.57.0 20章 リン（イネスの形・まとめ髪・手に開いた扇） */
  W:{r:dk(PAL_LINH.w.r)}, Q:{r:dk(PAL_LINH.q.r)}, T:{r:dk(PAL_LINH.t.r)}, S:{r:dk(PAL_LINH.s.r),ol:SKIN_OL},
  O:{r:dk(PAL_LINH.o.r)}, H:{r:dk(PAL_LINH.h.r)}});
/* 0.61.0 ソルヴェイ（デウィの形・三つ編み・藍のワンピースに生成りで赤い模様のショール） */
/* 0.61.0 27章 トゥヤ（デウィの形・短い黒髪・橙のデールに青い帯・金の鈴・木の番の杖） */
const PAL_TUYA_T=Object.assign({},PAL_TUYA,{
  W:{r:dk(PAL_TUYA.w.r)}, Q:{r:dk(PAL_TUYA.q.r)}, T:{r:dk(PAL_TUYA.t.r)}, S:{r:dk(PAL_TUYA.s.r),ol:SKIN_OL},
  O:{r:dk(PAL_TUYA.o.r)}, H:{r:dk(PAL_TUYA.h.r)}, v:{r:WOOD}});
const PAL_SOLVEIG_T=Object.assign({},PAL_SOLVEIG,{
  W:{r:dk(PAL_SOLVEIG.w.r)}, Q:{r:dk(PAL_SOLVEIG.q.r)}, T:{r:dk(PAL_SOLVEIG.t.r)}, S:{r:dk(PAL_SOLVEIG.s.r),ol:SKIN_OL},
  O:{r:dk(PAL_SOLVEIG.o.r)}, H:{r:dk(PAL_SOLVEIG.h.r)}});
const PAL_YASMIN_T=Object.assign({},PAL_YASMIN,{   /* 0.62.0 ヤスミン（肩までの髪・丸い眼鏡・首からさげた帳面・手に物差し） */
  W:{r:dk(PAL_YASMIN.w.r)}, Q:{r:dk(PAL_YASMIN.q.r)}, T:{r:dk(PAL_YASMIN.t.r)}, S:{r:dk(PAL_YASMIN.s.r),ol:SKIN_OL},
  O:{r:dk(PAL_YASMIN.o.r)}, H:{r:dk(PAL_YASMIN.h.r)}, v:{r:WOOD}});
const PAL_BERTA_T=Object.assign({},PAL_BERTA,{   /* 0.61.0 25章 ベルタ（デウィの形・おだんご・深緑の服に生成りのエプロン・お玉） */
  W:{r:dk(PAL_BERTA.w.r)}, Q:{r:dk(PAL_BERTA.q.r)}, T:{r:dk(PAL_BERTA.t.r)}, S:{r:dk(PAL_BERTA.s.r),ol:SKIN_OL},
  O:{r:dk(PAL_BERTA.o.r)}, H:{r:dk(PAL_BERTA.h.r)}, v:{r:WOOD}});
const PAL_OYUNA_T=Object.assign({},PAL_OYUNA,{   /* 0.39.0 オユナ（イネスの形） */
  W:{r:dk(PAL_OYUNA.w.r)}, Q:{r:dk(PAL_OYUNA.q.r)}, T:{r:dk(PAL_OYUNA.t.r)}, S:{r:dk(PAL_OYUNA.s.r),ol:SKIN_OL},
  O:{r:dk(PAL_OYUNA.o.r)}, H:{r:dk(PAL_OYUNA.h.r)}});
const PAL_HANA_T=Object.assign({},PAL_HANA,{   /* 0.39.0 ハナ（イネスの形） */
  W:{r:dk(PAL_HANA.w.r)}, Q:{r:dk(PAL_HANA.q.r)}, T:{r:dk(PAL_HANA.t.r)}, S:{r:dk(PAL_HANA.s.r),ol:SKIN_OL},
  O:{r:dk(PAL_HANA.o.r)}, H:{r:dk(PAL_HANA.h.r)}});
/* 0.51.0 ボグダン（白い髪・茶色の作業着）とパブロ（黒い髪・緑の作業着）。ノアの形の色違い。立ち絵がなく大きく出ていたので足した（色は仮） */
const noaPal=(h,j,p,r)=>{ const b=Object.assign({},PAL_NOA,{h:{r:h,cast:true},j:{r:j},a:{r:j},p:{r:p},r:{r:r,cast:true}});
  return Object.assign(b,{A:{r:dk(j)}, P:{r:dk(p)}, T:{r:dk(b.t.r)}, S:{r:dk(b.s.r),ol:SKIN_OL}, w:{r:WOOD}, R:{r:dk(r)}}); };
const PAL_BOGDAN_T=noaPal(['#f0f0f0','#c8c8c8','#9a9a9e','#66666c'],['#c8a880','#8a6a48','#64482e','#3e2a1a'],['#6a6458','#6a6458','#48443c','#2e2a26'],['#e8d8b0','#c8b48a','#9a845c','#64543a']);
const PAL_PABLO_T=noaPal(['#5a4634','#2a1e14','#1a120c','#0c0806'],['#a0d080','#5a8a40','#3e6a2c','#24441a'],['#5a5468','#5a5468','#3e3a4a','#26242e'],['#e8e0c8','#c8bca0','#9a8e74','#6a604c']);
/* 0.34.1 改造5段の色の帯（設計書 §10「5段で機体に色の帯が入り」）。5段目に届いた系統ごとに、その系統の色を1本の帯に並べる。
   色は私の仮：耐久＝緑・装甲＝紺・機動＝水色・照準＝赤・出力＝金・後ろの席＝紫。10段の灯の飾りはまだ作っていない */
const BAND_KEYS=['hp','def','mob','aim','pow','ep','back'];   /* 0.59.0 EP＝だいだい（仮） */
const BAND_COL={hp:['#a8f0a0','#58c860','#34944a','#1e5e32'], def:['#a8b8f8','#5a70d8','#3a48a4','#222c6a'], mob:['#c0f4ff','#5ad0f0','#2e98c0','#1a5e80'],
  aim:['#ffb0a0','#e85848','#b03030','#6e1a20'], pow:['#fff0a0','#f0c838','#c08a1c','#7a5410'], ep:['#ffd0a0','#f08c38','#c0601c','#7a3a10'], back:['#e4c0ff','#b070e0','#8048b0','#4c2870']};
/* 0.80.0 灯の飾り（設計書 §10「10段で灯の飾りが付きます」）：どれかの系統が10段の機械。形は私の仮（背中から立てた細い竿の先の小さな灯） */
function ornOf(u){ return !!(u&&u.side!=='enemy'&&u.kind==='machine'&&u.mod&&Object.keys(u.mod).some(k=>(u.mod[k]||0)>=10)); }
ART.ornOf=ornOf;
function bandsOf(u){ if(!u||u.side==='enemy'||u.kind!=='machine'||!u.mod) return []; return BAND_KEYS.filter(k=>(u.mod[k]||0)>=5); }
ART.bandsOf=bandsOf; ART.BAND_COL=BAND_COL;
function figKomori(pose,f,seats,lit,pal,look,bands,orn){   /* 0.80.0 orn＝灯の飾り */
  const g=tgrid(MW,MH), atk=pose==='atk', hurt=pose==='hurt', M=mach(g,atk?3:hurt?-3:0), lk=look||'komori';
  // 0.32.0 背中の付け足し（胴より奥）
  if(lk==='kamome'){ M.G('B',[[26,40],[18,25],[9,13],[7,19],[2,18],[4,25],[-1,26],[3,32],[-1,35],[6,40],[3,44],[14,50]]); M.L('R',[22,40],[9,18],0.7,0.5,['B']); M.L('R',[17,43],[3,29],0.6,0.5,['B']); }   // 翼板
  if(lk==='mizuha'){ M.E('B',10,44,6,11.5); for(const y of [37,50]) M.L('R',[3,y],[17,y],0.9,0.9,['B']); M.E('m',10,32.5,2.4,1.5); }   // 水のタンク
  if(lk==='spana'){ M.L('m',[6,38],[6,33],0.6,0.6); M.L('m',[6,33],[13,33],0.6,0.6); M.L('m',[13,33],[13,38],0.6,0.6);   // 道具箱の取っ手
    M.L('c',[16,38],[19,27],0.7,0.7); M.E('M',19.4,26,1.4,1.2);   // 箱から出ているねじ回し
    M.G('B',[[2,38],[18,38],[18,59],[2,59]]); M.L('R',[2,46],[18,46],0.8,0.8,['B']); M.E('m',10,46,1.6,1.2); }
  if(lk==='naminori'){ M.E('B',9,46,5.5,17); M.L('R',[9,31],[9,61],0.8,0.8,['B']); M.E('w',9,33,2,2.5,['B']); }   // 0.33.0 背中の波乗りの板
  if(lk==='ikari'){ M.E('B',10,46,8,8); M.E('R',10,46,5.4,5.4,['B']); M.E('B',10,46,3,3,['R']); M.E('m',10,46,1.2,1.2,['B']); }   // 0.33.0 背中に巻いた綱
  if(lk==='tsubame'){ M.G('B',[[22,42],[13,31],[4,25],[6,31],[1,35],[8,39],[5,47],[16,52]]); M.L('R',[20,42],[6,28],0.6,0.5,['B']);   // 0.36.0 ツバメ 背中の翼板
    M.G('B',[[18,58],[3,60],[1,66],[9,64],[3,71],[2,76],[16,67]]); }   // 二又の尾
  if(lk==='shabon'){ M.E('w',9,44,6,6); M.E('G',9,44,4.2,4.2,['w']); M.E('w',14,31,3.4,3.4); M.E('G',14,31,2,2,['w']); M.E('w',4,33,2,2); }   /* 0.39.0 シャボン 背中にただよう泡 */
  if(lk==='harinezumi'){ M.E('B',12,52,5.5,16); for(const y of [36,43,50,57,64]){ M.G('c',[[18,y-3.6],[18,y+3.6],[1,y-6]]); M.L('M',[17,y+0.5],[4,y-4.5],0.5,0.3); } }   /* 0.41.0 ハリネズミ 背中に並ぶはね返し板（とがった銀の板） */
  if(lk==='iwao'){ M.G('B',[[2,38],[17,36],[19,64],[2,66]]); M.L('R',[3,46],[18,46],0.8,0.8,['B']); M.L('R',[3,54],[18,54],0.8,0.8,['B']); M.L('m',[11,38],[9,22],2.2,1.8); M.E('M',8.6,21,2.6,1.8); }   /* 0.60.0 イワオ 背中の大きな箱と、雪を飛ばす太い筒 */
  if(lk==='tsutsumi'){ M.G('B',[[3,42],[17,40],[19,64],[3,66]]); M.L('R',[4,53],[18,53],0.8,0.8,['B']); for(const y of [46,59]) M.E('a',10,y,1.1,1.1,['B']); }   /* 0.68.0 33章 ツツミ 背中の小さな箱と琥珀の灯 */
  if(lk==='kazami'){ M.L('m',[9,38],[16,52],1.2,1.6); for(let i=0;i<4;i++){ const an=i*Math.PI/2+0.45, dx=Math.cos(an), dy=Math.sin(an); M.G(i%2?'c':'w',[[9,38],[9+dx*11,38+dy*11],[9+dx*7-dy*4.4,38+dy*7+dx*4.4]]); } M.E('M',9,38,1.9,1.9); M.S('q',9,38); }   /* 0.49.0 カザミ 背中の風車（4枚の羽根） */
  if(lk==='watari'){ M.G('B',[[24,46],[16,36],[8,28],[1,19],[0,10],[6,13],[8,5],[13,13],[17,6],[20,16],[27,27],[30,40]]); M.L('R',[22,44],[4,14],0.7,0.5,['B']); M.L('R',[23,42],[11,12],0.6,0.5,['B']); M.L('R',[24,40],[18,14],0.5,0.4,['B']);   /* 0.50.0 ワタリ 背中の上の翼（羽先が欠けている） */
    M.G('B',[[24,50],[13,52],[4,57],[1,64],[7,64],[4,72],[11,69],[14,77],[19,68],[27,60]]); M.L('R',[22,52],[3,63],0.7,0.5,['B']); M.L('R',[24,55],[10,72],0.6,0.5,['B']); }   /* 下の翼 */
  if(lk==='morihito'){ M.E('B',11,46,6.5,11); M.L('m',[16,40],[4,16],3.4,2.8); M.E('M',3.6,15,3.6,3.6); M.E('q',3.2,14.6,1.9,1.9); M.L('R',[6,40],[16,40],0.9,0.9,['B']); }   // 0.34.0 背中の水のタンクと、上へのびる大きなしずく砲
  if(lk==='tomoshibi'){ M.L('L',[18,64],[7,84],4.6,4); tpoly(g,'L',[[0,92],[13,92],[15,98],[-1,98]].map(([x,y])=>[x+M.sh(y),y])); }   /* 0.54.0 トモシビ 三脚の3本目（後ろへ踏ん張る脚） */
  // 奥の脚と腕（0.32.0 カモメは細い鳥の脚と三本の指・スパナは太い脚と広い足）
  const leg=(ch,hip,knee,ank,r,foot)=>{ if(lk==='kamome'){ M.L(ch,hip,knee,r*0.55,r*0.45); M.L(ch,knee,ank,r*0.45,r*0.4); for(const t of [[-6,6],[2,6.5],[8,5]]) tlim(g,ch,ank,[ank[0]+t[0],ank[1]+t[1]],1.3,1); return; }
    const stout=lk==='spana'||lk==='tomoshibi'||lk==='iwao'||lk==='tsutsumi', k=stout?1.3:1; M.L(ch,hip,knee,r*k,r*0.82*k); M.L(ch,knee,ank,r*0.82*k,r*0.72*k); tpoly(g,ch,stout?foot.map(([x,y],i)=>[x+(i===0||i===3?-4:3),y-1]):foot); };
  leg('L',[26,68],[21,81],[24,91],5,[[17,90],[29,90],[31,98],[16,98]]);
  M.L('M',[24,56],[17,65],3.5,3); M.L('M',[17,65],[19,73],3,2.5);
  // 胴
  M.E('b',14,50,5,8); M.E('b',33,52,22,15.5); M.G('b',[[14,54],[52,54],[49,66],[18,66]]);
  if(lk==='iwao'||lk==='tsutsumi'){ M.E('b',33,57,25.5,15); M.G('b',[[9,58],[57,58],[55,70],[11,70]]); }   /* 0.60.0 イワオ 低く幅広の胴 */
  M.G('r',[[6,49],[62,49],[62,53],[6,53]],['b']);                 // だいだいの帯
  M.G('m',[[8,63],[62,63],[62,66],[8,66]],['b']);                 // すその金物
  if(lk==='komori'){ M.E('w',23,58,2.8,2.8,['b']); M.L('r',[23,56.2],[23,59.8],0.5,0.5,['w']); M.L('r',[21.2,58],[24.8,58],0.5,0.5,['w']); }   // 救助のしるし
  else if(lk==='kamome'){ for(const [a,b] of [[[20,59],[22,57]],[[22,57],[23,58.5]],[[23,58.5],[24,57]],[[24,57],[26,59]]]) M.L('q',a,b,0.5,0.5,['b']); }   // かもめのしるし
  else if(lk==='mizuha'){ M.E('w',23,59,2.2,2.2,['b']); M.G('w',[[23,54.8],[20.9,58.6],[25.1,58.6]],['b']); }   // しずくのしるし
  else if(lk==='utakata'){ M.E('m',23,58,3.6,3.6,['b']); M.E('q',23,58,2.4,2.4,['m']); M.E('M',23,58,1,1,['q']); }   // 胸のスピーカー
  else if(lk==='akari'){ M.E('m',23,58,3.2,3.2,['b']); M.E(lit?'a':'A',23,58,2.2,2.2,['m']); if(lit) M.S('G',22,57); }   // 胸の小さな灯
  else if(lk==='spana'){ for(const [x,y] of [[23,54],[23,62],[19,58],[27,58],[20.2,55.2],[25.8,55.2],[20.2,60.8],[25.8,60.8]]) M.E('m',x,y,0.9,0.9,['b']); M.E('m',23,58,3,3,['b']); M.E('q',23,58,1.1,1.1,['m']); }   // 歯車のしるし
  else if(lk==='naminori'){ for(const [a,b] of [[[19,59],[21,56.5]],[[21,56.5],[23,58.5]],[[23,58.5],[25,56.5]],[[25,56.5],[27,59]]]) M.L('w',a,b,0.55,0.55,['b']); }   // 0.33.0 波のしるし
  else if(lk==='ikari'){ M.L('w',[23,54.5],[23,61.5],0.55,0.55,['b']); M.L('w',[21,56],[25,56],0.5,0.5,['b']); M.L('w',[19.8,59.4],[23,61.8],0.5,0.5,['b']); M.L('w',[26.2,59.4],[23,61.8],0.5,0.5,['b']); M.E('w',23,54,0.9,0.9,['b']); }   // 0.33.0 錨のしるし
  else if(lk==='morihito'){ M.E('w',23,59,3,3,['b']); M.G('w',[[23,53.4],[20.2,58.2],[25.8,58.2]],['b']); M.E('b',23,59.4,1.5,1.5,['w']); }   // 0.34.0 二重のしずくのしるし
  else if(lk==='harinezumi'){ M.E('w',23,59,1.8,1.8,['b']); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[0.7,0.7],[-0.7,0.7],[0.7,-0.7],[-0.7,-0.7]]) M.L('w',[23+dx*2.6,59+dy*2.6],[23+dx*4.6,59+dy*4.6],0.5,0.4,['b']); }   /* 0.41.0 ハリネズミ 小さな針の丸 */
  else if(lk==='iwao'){ M.G('w',[[17,64],[29,64],[26,56],[20,56]],['b']); for(const x of [19,23,27]) M.L('K',[x,57],[x-1.5,63],0.5,0.5,['w']); M.L('K',[17,64],[29,64],0.5,0.5,['w']); }   /* 0.60.0 イワオ 胸の雪かきの板のしるし */
  else if(lk==='tsutsumi'){ M.E('m',23,58,7.6,7.6); M.E('M',23,58,6.4,6.4,['m']); M.E('c',23,58,5.4,5.4); M.E('m',23,58,3.6,3.6,['c']); M.E('M',23,58,1.6,1.6,['m']);   /* 0.68.0 33章 ツツミ 胸の大きな丸い盾板（ふちに琥珀の灯・中心にこぶ） */
    for(let i=0;i<8;i++){ const an=i*Math.PI/4+0.4; M.E('a',23+Math.cos(an)*6.1,58+Math.sin(an)*6.1,0.9,0.9); }
    for(const [x,y] of [[10,60],[56,60],[12,41.5]]) M.E('a',x,y,0.9,0.9,['b']); }   /* 肩と胴のはしの小さな灯 */
  else if(lk==='kazami'){ let sx=23.6,sy=59; for(let t=0.6;t<=9.6;t+=0.45){ const rr=0.3+t*0.46, x=23+Math.cos(t)*rr, y=59+Math.sin(t)*rr; M.L('w',[sx,sy],[x,y],0.5,0.5,['b']); sx=x; sy=y; } }   /* 0.49.0 カザミ 風のうずのしるし */
  else if(lk==='watari'){ for(const [x,y] of [[21,57],[26,61]]){ M.L('w',[x-3,y-2.2],[x,y],0.55,0.55,['b']); M.L('w',[x,y],[x+3,y-2.2],0.55,0.55,['b']); } }   /* 0.50.0 ワタリ 渡り鳥（Vの字）2羽のしるし */
  else if(lk==='tsubame'){ M.L('w',[18,56.5],[23,59],0.55,0.55,['b']); M.L('w',[28,56.5],[23,59],0.55,0.55,['b']); M.L('w',[23,59],[21,62.5],0.5,0.5,['b']); M.L('w',[23,59],[25,62.5],0.5,0.5,['b']); }   // 0.36.0 ツバメ 燕のしるし
  else if(lk==='tomoshibi'){ M.G('w',[[21.6,63],[24.4,63],[24,57],[22,57]],['b']); M.G('m',[[21,56.4],[25,56.4],[24,54.6],[22,54.6]],['b']); M.E(lit?'a':'A',23,53,1.5,1.5,['b']); M.L('w',[19.4,53.4],[17,52.4],0.4,0.4,['b']); M.L('w',[26.6,53.4],[29,52.4],0.4,0.4,['b']); }   /* 0.54.0 トモシビ 灯台のしるし（しま入りの塔と灯） */
  else if(lk==='shabon'){ for(const [x,y,r] of [[20,58.5,2.6],[26,55.5,1.7],[26.5,61.5,1.3]]){ M.E('w',x,y,r,r,['b']); M.E('G',x-0.4,y-0.4,r*0.45,r*0.45,['w']); } }   /* 0.39.0 シャボン 泡のしるし */
  // 0.34.1 改造5段の色の帯（だいだいの帯のすぐ下・腕より上・胸のしるしは残して胴の上にだけ塗る）
  const bs=bands||[]; if(bs.length){ const x0=7,x1=63,wd=(x1-x0)/bs.length; M.G('q',[[x0,53],[x1,53],[x1,58],[x0,58]],['b']); bs.forEach((k,i)=>M.G(String(i+1),[[x0+wd*i,54],[x0+wd*(i+1),54],[x0+wd*(i+1),57],[x0+wd*i,57]],['q'])); }   // 上下に1ドットの暗い縁（青い胴でも帯が見えるように）
  // ガラス屋根と2つの席
  M.G('g',[[17,46],[19,39],[24,32],[33,28.5],[43,29],[50,33],[54,40],[55,46]]);
  M.L('G',[23,37],[27,32.5],0.6,0.6); M.L('G',[41,31],[46,32.5],0.6,0.6);
  [[27,seats&&seats[1]],[44,seats&&seats[0]]].forEach(([x,s])=>{
    M.E('q',x-2.5,41,2.2,4);
    if(s){ const ines=s.name==='イネス', kiran=s.name==='キラン', hc=ines?'i':kiran||s.name==='ケンタ'||s.name==='アマラ'||s.name==='シオネ'?'K':s.name==='ダグニ'?'Y':'n'; M.E(hc,x,40.5,2.8,3.1); M.E('s',x+0.9,41.2,2.1,2.6); M.S('q',x+2,41);
      if(ines) M.G('d',[[x-2.6,38.6],[x-1,37.2],[x+2.2,37.4],[x+3,39.2]]); else if(kiran) M.L('D',[x-2.6,38.6],[x+2.8,38.6],0.6,0.6); else M.S('n',x+1,38); }
  });
  M.L('m',[17,46],[55,46],0.8,0.8); M.L('m',[35.5,29],[35.5,46],0.7,0.7);
  // 頭の灯と前の灯
  if(lk==='utakata'){ M.L('m',[29,29],[29,24],0.9,0.9); M.L('m',[29,24],[38,13],1.2,5.5); M.E('M',38.6,12.4,4.3,4.3); M.E(lit?'a':'A',39.2,11.8,3,3); }   // 0.32.0 頭のラッパ
  else if(lk==='akari'){ M.L('m',[29,29],[29,23],1.5,1.5); M.E('m',29,18,6.5,5.5); M.E('M',25,18,2.4,4.2,['m']); M.E(lit?'a':'A',33.4,18,2.8,4.4); if(lit){ M.S('G',34,16); M.S('G',34,17);
      for(const dy of [-5,0,5]) M.L('G',[38.5,18+dy*0.35],[46,18+dy],0.45,0.45); } }   // 0.32.0 頭の大きな照らし灯（点いていると前へ光の筋）
  else if(lk==='tsutsumi'){ M.L('m',[29,29],[29,25],1,1); M.E('m',29,25.4,6.6,1.8); M.E(lit?'a':'A',29,21,5.6,5.2); M.E('M',29,25.8,6.6,1.2,['m']);   /* 0.68.0 33章 ツツミ 頭の上の丸いランプのドーム */
    if(lit){ M.S('G',27,18.5); M.S('G',27.8,18); M.S('G',26.4,19.6); for(let i=0;i<10;i++){ const an=-Math.PI+i*Math.PI/9; M.S('G',29+Math.cos(an)*8.4,22+Math.sin(an)*8); } } }
  else if(lk==='tomoshibi'){ M.G('m',[[21,28.4],[37,28.4],[35,24.6],[23,24.6]]); M.G('M',[[23,24.6],[35,24.6],[34,22.8],[24,22.8]]);   /* 0.54.0 灯台の頭：足場・レンズ・ふち・屋根・光の輪 */
    M.E(lit?'a':'A',29,16.6,5.4,6.2); M.L('m',[24.2,11],[24.2,22.8],0.6,0.6); M.L('m',[29,10.4],[29,22.8],0.6,0.6); M.L('m',[33.8,11],[33.8,22.8],0.6,0.6);
    M.G('M',[[22,11.2],[36,11.2],[29,4.6]]); M.E('m',29,3.6,1.3,1.3);
    if(lit){ M.S('G',27.4,14.4); M.S('G',27.4,15.4); for(let i=0;i<12;i++){ const an=i*Math.PI/6; M.S('G',29+Math.cos(an)*11.4,16.6+Math.sin(an)*9); } } }
  else { M.L('m',[29,29],[28,21],0.8,0.8); M.E(lit?'a':'A',28,18.5,2.6,2.6); }
  M.E('e',55.5,53.5,2.2,2);
  // 前の脚と腕
  leg('l',[40,68],[45,81],[42,91],5.5,[[36,90],[50,90],[53,98],[35,98]]); M.E('m',45,81,lk==='kamome'?2:3,lk==='kamome'?2:3);
  M.E('m',44,58,4.5,4.5);
  const a=atk?[[44,58],[55,56],[64,52]]:hurt?[[44,58],[49,67],[53,73]]:[[44,58],[53,66],[59,60]];
  M.L('m',a[0],a[1],3.5,3); M.L('m',a[1],a[2],3,2.6); M.E('M',a[1][0],a[1][1],1.6,1.6);
  const [cx,cy]=a[2], d=atk?[1,-0.25]:hurt?[0.3,1]:[1,-0.4], n=[-d[1],d[0]];
  const P=(k,s=0)=>[cx+d[0]*k+n[0]*s,cy+d[1]*k+n[1]*s];   // 腕の先から d の向きへ k・横へ s
  if(lk==='kamome'){ M.E('M',...P(1.5),2.6,2.6); for(const s of [-3.2,0,3.2]) M.L('c',P(2),P(6,s*1.3),1.2,0.9); }   // 0.32.0 三本指の大きな手（つかんで運ぶ）
  else if(lk==='mizuha'){ M.L('m',P(0),P(6),1.8,2.5); M.L('r',P(5),P(6.5),2.7,2.7); M.E('q',...P(7),1,1); }   // 筒先
  else if(lk==='utakata'){ M.L('m',P(0),P(5.5),1,3.2); M.E(lit?'a':'A',...P(6),1.6,2.2); }   // 小さなラッパ
  else if(lk==='akari'){ M.L('m',P(0),P(4),2.2,2.2); M.E(lit?'a':'A',...P(4.8),1.6,2.2); }   // 手持ちの灯
  else if(lk==='tomoshibi'){ M.L('m',P(0),P(4),2.2,2.6); M.E('M',...P(5),3,3); M.E(lit?'a':'A',...P(6),1.8,1.8); if(atk&&lit) M.L('G',P(7.6),P(11),0.5,0.5); }   /* 0.54.0 トモシビ 腕の先の小さなレンズ砲 */
  else if(lk==='spana'){ M.L('c',P(0),P(5),1.7,1.7); M.E('c',...P(6.5),3.4,3.4); M.L('c',P(7),P(10.5,2.2),1.2,1.1); M.L('c',P(7),P(10.5,-2.2),1.2,1.1); M.E('q',...P(8.6),1.2,1.2); }   // スパナ
  else if(lk==='naminori'){ M.L('m',P(0),P(5),1.5,1.8); M.E('r',...P(5.8),1.8,1.8); M.E('q',...P(6.4),0.8,0.8); }   // 0.33.0 水鉄砲の筒先
  else if(lk==='ikari'){ M.L('c',P(0),P(6),1.3,1.3); M.L('c',P(6,-3.5),P(6,3.5),1,1); M.L('c',P(6,-3.5),P(3.5,-4.5),1,0.9); M.L('c',P(6,3.5),P(3.5,4.5),1,0.9); }   // 0.33.0 腕の先の錨
  else if(lk==='morihito'){ M.L('m',P(0),P(6),2.2,3); M.E('r',...P(6.6),3,3); M.E('q',...P(7.2),1.5,1.5); }   // 0.34.0 太い筒先
  else if(lk==='harinezumi'){ M.L('m',P(0),P(3),2.2,2.6); M.G('c',[P(3,-4.2),P(8,-3.4),P(8,3.4),P(3,4.2)]); M.L('M',P(3.5),P(8),0.5,0.5); }   /* 0.41.0 ハリネズミ 腕の先の平たい板 */
  else if(lk==='iwao'){ M.L('m',P(0),P(4),2.6,3); }   /* 0.60.0 イワオ 腕の先は板の支え */
  else if(lk==='tsutsumi'){ M.L('m',P(0),P(4),2.6,3); M.E(lit?'a':'A',...P(5),1.6,1.6);   /* 0.68.0 33章 ツツミ 腕の先の小さな灯（攻撃のときは灯の結界の光の輪） */
    if(atk&&lit) for(let i=0;i<12;i++){ const an=i*Math.PI/6; M.S('G',cx+d[0]*8+Math.cos(an)*7,cy+d[1]*8+Math.sin(an)*7); } }
  else if(lk==='kazami'){ M.L('m',P(0),P(3),1.6,1.8); M.G('w',[P(3),P(8,-4.6),P(9.2,0),P(8,4.6)]); for(const s of [-2.4,0,2.4]) M.L('M',P(3.5),P(8.6,s),0.4,0.4); }   /* 0.49.0 カザミ 腕の先の小さな扇 */
  else if(lk==='watari'){ M.L('m',P(0),P(3),1.6,1.8); M.G('b',[P(3),P(8,-3.6),P(9.4,-1.4),P(8.6,0.4),P(10,2.2),P(8,3.6)]); M.L('B',P(3),P(9.6,0.4),0.5,0.4); for(const s of [-2.2,2]) M.L('B',P(4),P(8,s),0.4,0.3); }   /* 0.50.0 ワタリ 腕の先の羽根（先が欠けている） */
  else if(lk==='tsubame'){ M.L('c',P(0),P(8.5),1.5,0.4); M.L('c',P(5),P(8,1.6),0.6,0.4); }   // 0.36.0 ツバメ 細いくちばし状の先端
  else if(lk==='shabon'){ M.L('c',P(0),P(3),1,1); M.E('c',...P(4.2),2.6,2.6); M.E('G',...P(4.2),1.5,1.5,['c']); M.E('w',...P(5,-5.5),1.1,1.1); }   /* 0.39.0 シャボン 泡の吹き輪 */
  else { M.L('c',[cx,cy],[cx+d[0]*5+n[0]*3,cy+d[1]*5+n[1]*3],1.3,1); M.L('c',[cx,cy],[cx+d[0]*5-n[0]*3,cy+d[1]*5-n[1]*3],1.3,1); }
  if(lk==='iwao'){ M.G('r',[[61,38],[66,35],[70,38],[71,62],[71,92],[66,97],[61,93],[61,52]]); for(const y of [50,63,76,89]) M.G('B',[[61,y],[71,y-6],[71,y-2],[61,y+4]],['r']); M.L('B',[61,40],[61,92],0.5,0.5); M.L('M',[56,60],[61,60],1.6,1.6); M.L('M',[56,76],[61,76],1.6,1.6); }   /* 0.60.0 イワオ 前の大きな雪かきの板（注意の帯のしま） */
  if(lit&&f&&lk!=='utakata'&&lk!=='akari'&&lk!=='tomoshibi'){ M.E('G',28,17.6,0.8,0.8); }   // 灯がまたたく
  if(orn){ M.L('c',[14,44],[9,20],0.7,0.6); M.L('c',[9,20],[13,17],0.5,0.5); M.E('M',13.5,19.5,2,0.8); M.E(lit?'a':'A',13.5,22,1.8,2.2); M.E('M',13.5,24.4,1.4,0.6); if(lit) M.E('G',13.5,22,0.8,0.8); }   /* 0.80.0 灯の飾り（背中の竿の先の小さな灯・仮） */
  const P0=pal||PAL_KOMORI_T; return bake(g,bs.length?Object.assign({},P0,...bs.map((k,i)=>({[String(i+1)]:{r:BAND_COL[k]}}))):P0);
}
/* 暴走した作業機（さびた赤の大きな胴・前かがみ・ひとつ目・長い腕と三本爪・背中の煙突から湯気） */
const BM=PAL_BEAST.m.r;
const PAL_BEAST_T=Object.assign({},PAL_BEAST,{
  R:{r:dk(PAL_BEAST.r.r)}, M:{r:dk(BM)}, l:{r:BM}, L:{r:dk(BM)}, h:{r:BM}, J:{r:dk(dk(BM))},
  c:{r:['#e4e4ec','#a8a8b2','#70707a','#3a3a44']}, K:'#2a2228', E:{c:'#1a1418'}, p:{r:BM}, P:{r:dk(BM)},
  W:{c:'#ffd0c0',nol:true}, S:{c:'#dfe4ee',nol:true}, s:{c:'#b8c0cc',nol:true}});
function figBeast(pose,f,look){
  const g=tgrid(MW,MH), atk=pose==='atk', hurt=pose==='hurt', M=mach(g,atk?3:hurt?-3:0);
  // 0.18.0 種類ごとの付け足し（奥に描くもの）：荷揚げ機は背中の腕木とかぎ・見張り機は頭のアンテナ
  if(look==='crane'){ M.L('m',[26,34],[10,8],1.8,1.4); M.L('c',[10,8],[10,16],0.5,0.5); M.E('c',10,18,1.8,2.2); }
  if(look==='watch'){ M.L('m',[55,28],[57,14],0.8,0.8); M.E('e',57,12,2.2,2.2); }
  if(look==='mori'){ M.E('r',14,48,7,12); M.L('m',[22,36],[6,10],3.8,3.2); M.E('J',5.4,9,4,4); M.E('K',5,8.6,2.2,2.2); }   // 0.34.0 モリヒト：背中のタンクと、上へのびる大きなしずく砲
  if(look==='kane'||look==='yoake'){ M.L('M',[22,40],[12,8],1.6,1.4); M.L('M',[34,30],[28,6],1.6,1.4); M.L('M',[10,7],[30,5],1.8,1.8); M.L('c',[19,6],[19,10],0.6,0.6); M.G('y',[[15,11],[23,11],[25,24],[13,24]]); M.E('y',19,12,4,2.2); M.L('K',[13,22],[25,22],0.5,0.5); M.E('K',19,26,1.4,1.4); }   /* 0.52.0 鐘番：背中に組んだ鐘の枠と、つり下げた小さな鐘 */
  if(look==='turara'){ M.L('m',[24,36],[10,14],1.8,1.6); M.L('m',[10,14],[30,10],1.6,1.6); for(const x of [12,17,22,27]){ M.G('c',[[x-2,12+(x%5)*0.2],[x+2,11.6],[x,24+(x%3)*3]]); } M.E('c',8,50,5,8); M.G('c',[[5,56],[11,56],[8,68]]); }   /* 0.67.0 ツララ：背中の腕木に下がる氷柱と、腰の氷のかたまり */
  if(look==='hari'){ M.E('r',14,52,6,13); for(const y of [34,41,48,55,62,69]){ M.G('c',[[21,y-3.8],[21,y+3.8],[1,y-7]]); M.L('M',[20,y+0.5],[4,y-5],0.5,0.3); } }   /* 0.41.0 ハリネズミ：背中に並ぶとがった板 */
  if(look==='iwao'){ M.G('r',[[3,38],[18,36],[20,66],[3,68]]); M.L('K',[4,46],[19,46],0.7,0.7,['r']); M.L('K',[4,56],[19,56],0.7,0.7,['r']); M.L('m',[12,38],[8,22],2.4,2); M.E('J',7.6,21,2.8,2); }   /* 0.60.0 暴走したイワオ：背中の大きな箱と太い筒 */
  if(look==='tomo'){ M.L('m',[22,38],[10,18],3.2,2.8); M.G('c',[[2,10],[16,10],[14,24],[4,24]]); M.E('J',9,17,5.4,6.4); M.E('e',9,17,3,3.6); M.S('W',8,15.4); M.L('K',[9,11],[8,24],0.4,0.4,['J']);   /* 0.54.0 トモシビ：背中のレンズ塔（暴走して赤く光り、ひびが入っている）と、まわりの光の粒 */
    for(let i=0;i<8;i++){ const an=i*Math.PI/4+0.4; M.S('e',9+Math.cos(an)*10.4,17+Math.sin(an)*8.6); } }
  // 煙突と湯気
  M.L('p',[23,36],[17,19],2.3,2.3); M.E('P',17,18.5,3.2,1.6);
  for(const [x,y,r] of (f?[[16,12,3],[12,6,3.6],[17,3,2.4]]:[[18,13,2.6],[14,8,3.4],[10,3,2.8]])){ M.E('s',x+0.6,y+0.6,r,r*0.85); M.E('S',x,y,r*0.8,r*0.7); }
  // 奥の腕と脚
  M.L('M',[28,42],[20,60],5,4.5); M.L('M',[20,60],[22,78],4.5,5); M.E('M',22,82,5,4.5);
  M.L('L',[30,70],[26,82],6,5); M.L('L',[26,82],[28,91],5,4); tpoly(g,'L',[[20,90],[34,90],[36,98],[19,98]]);
  // 胴（前かがみ）
  M.G('r',[[16,52],[18,40],[26,30],[40,26],[52,30],[58,40],[57,54],[50,66],[42,72],[26,73],[18,64]]);
  M.G('K',[[14,43],[60,43],[60,48],[14,48]],['r']);
  for(let x=14;x<62;x+=6) M.G('y',[[x,43],[x+3,43],[x+0.5,48],[x-2.5,48]],['K']);   // 黄と黒のしま
  M.E('m',38,60,10,8,['r']); for(const [x,y] of [[31,55],[45,55],[31,65],[45,65],[38,52]]) M.S('K',x,y,['m']);
  for(const [x,y,r] of [[24,36,1.6],[34,32,1.3],[48,35,1.8],[22,58,1.5],[52,52,1.4],[28,68,1.6],[46,68,1.2],[20,50,1.1]]) M.E('R',x,y,r,r*0.8,['r']);   // さび
  // 頭とひとつ目
  M.G('h',[[44,32],[52,26],[61,28],[64,35],[62,42],[52,44],[45,40]]);
  M.E('E',57,35,4,4); M.E('e',58,35,2.4,2.4); M.S('W',59,34);
  for(let x=51;x<=59;x+=2) M.L('K',[x,40.5],[x,42.5],0.4,0.4,['h']);
  // 前の脚
  M.L('l',[44,70],[48,82],6.5,5.5); M.L('l',[48,82],[46,91],5.5,4.5); tpoly(g,'l',[[38,90],[54,90],[57,98],[37,98]]); M.E('J',48,82,3,3);
  if(look==='iwao'){ M.G('y',[[61,40],[66,37],[70,40],[71,62],[71,92],[66,97],[61,93],[61,54]]); for(const y of [52,65,78,91]) M.G('K',[[61,y],[71,y-6],[71,y-2],[61,y+4]],['y']); M.L('K',[61,42],[61,92],0.5,0.5); }   /* 0.60.0 暴走したイワオ：前の雪かきの板（黄と黒のしま） */
  // 前の腕と三本爪
  M.E('J',50,42,6.5,6.5);
  const a=atk?[[50,44],[60,48],[67,40]]:hurt?[[50,44],[54,60],[52,76]]:[[50,44],[58,60],[60,78]];
  M.L('m',a[0],a[1],5.5,4.5); M.L('m',a[1],a[2],4.5,5.5); M.E('J',a[1][0],a[1][1],2.6,2.6);
  const [cx,cy]=a[2], fs=atk?[[70,33],[71,39],[70,45]]:hurt?[[47,82],[52,84],[57,82]]:[[55,87],[60,89],[65,87]];
  for(const t of fs) M.L('c',[cx,cy],t,1.8,1.1);
  // 0.18.0 運搬車は足の車輪・重機は肩の厚い板
  if(look==='cart') for(const x of [27,47]){ M.E('K',x,93,5,4.5); M.E('c',x,93,1.6,1.6); }
  if(look==='heavy') M.G('h',[[20,40],[30,29],[46,25],[50,30],[40,34],[26,44]]);
  const L=BEAST_LOOK[look];
  return bake(g,L?Object.assign({},PAL_BEAST_T,{r:{r:L.r},R:{r:dk(L.r)},e:L.e}):PAL_BEAST_T);
}
const TALL={};
ART.tall=function(u,pose,frame,full){   /* 0.51.0 full＝人を縮めずに描く（カットインの影） */
  if(!u) return null;
  if(u.kind==='machine'&&u.side!=='enemy'&&!MACH_LOOK[u.name]) return null;   // 0.7.0 カモメも立ち絵（コモリの色違い）。0.8.0 ミズハも。0.9.0 ウタカタも。0.17.0 アカリも。0.32.0 スパナも
  if(u.kind==='machine'){ pose=pose||'idle'; const f=frame&1; let key,mk;
    if(u.side==='enemy'){ const lk=BEAST_LOOK[u.look]?u.look:''; key='bm|'+lk+'|'+pose+'|'+f; mk=()=>{ const c=figBeast(pose,f,lk); return f?bob(c,60):c; }; }   // 0.18.0 種類
    else { const s=u.seats||[], sk=s.map(x=>x?x.name:'-').join(','), lk=MACH_LOOK[u.name], bs=bandsOf(u), on=ornOf(u); key='m|'+lk+'|'+pose+'|'+f+'|'+sk+'|'+bs.join(',')+(on?'|o':''); mk=()=>figKomori(pose,f,s,true,MACH_T[lk],lk,bs,on); }   /* 0.80.0 灯の飾り */   // 0.32.0 機械ごとの姿・0.34.1 色の帯
    const c=TALL[key]||(TALL[key]=mk()); c._cx=34; c._foot=98; return c; }
  if(u.kind!=='person') return null;
  pose=pose||'idle'; const f=frame&1;
  let key,mk;
  if(u.look==='yuki'){ const eye=u.eye||'#ffd27a'; key='yk|'+eye; mk=()=>figYuki(eye); }   /* 0.68.0 33章 雪のかたまり（動かないのでポーズ・揺れなし・影の分岐より前） */
  else if(u.sub==='shadow'&&u.look==='kiri'){ const eye=u.eye||'#c8d0ff'; key='ki|'+eye+'|'+pose+'|'+f; mk=()=>{ const c=figKiri(pose,f,eye); return f?bob(c,40):c; }; }   /* 0.61.0 24章 霧の壁 */
  else if(u.sub==='shadow'){ const L=!u.named&&SHADOW_LOOK[u.look], lk=L?u.look:'', eye=u.named?(u.eye||'#ffd060'):L?L.eye:(u.eye||'#ff6080'), base=u.named?['#9a78b8','#62487e','#3e2a58','#24163a']:L?L.base:null;   // 0.18.0 種類と名前のある影
    key='sh|'+eye+'|'+(base?1:0)+'|'+lk+'|'+(u.named?'n':'')+'|'+pose+'|'+f; mk=()=>{ const c=figShadow(pose,f,eye,base,lk,!!u.named); return f?bob(c,40):c; }; }
  else if(u.name==='ノア'){ key='noa|'+pose+'|'+f; mk=()=>{ const c=figNoa(pose); return f?bob(c,44):c; }; }
  else if(u.name==='イネス'){ key='ines|'+pose+'|'+f; mk=()=>{ const c=figInes(pose,f); return f?bob(c,46):c; }; }
  else if(u.name==='キラン'){ key='kiran|'+pose+'|'+f; mk=()=>{ const c=figNoa(pose,{staff:true,pal:PAL_KIRAN_T}); return f?bob(c,44):c; }; }   // 0.7.0
  else if(u.name==='ダグニ'){ key='dagny|'+pose+'|'+f; mk=()=>{ const c=figInes(pose,f,PAL_DAGNY_T); return f?bob(c,46):c; }; }   // 0.8.0
  else if(u.name==='ケンタ'){ key='kenta|'+pose+'|'+f; mk=()=>{ const c=figNoa(pose,{staff:true,pal:PAL_KENTA_T}); return f?bob(c,44):c; }; }
  else if(u.name==='アマラ'){ key='amara|'+pose+'|'+f; mk=()=>{ const c=figInes(pose,f,PAL_AMARA_T); return f?bob(c,46):c; }; }   // 0.9.0
  else if(u.name==='エリフ'){ key='elif|'+pose+'|'+f; mk=()=>{ const c=figInes(pose,f,PAL_ELIF_T); return f?bob(c,46):c; }; }   // 0.17.0
  else if(u.name==='シオネ'){ key='sione|'+pose+'|'+f; mk=()=>{ const c=figNoa(pose,{staff:true,pal:PAL_SIONE_T}); return f?bob(c,44):c; }; }   // 0.33.0
  else if(u.name==='ルカ'){ key='luca|'+pose+'|'+f; mk=()=>{ const c=figNoa(pose,{pal:PAL_LUCA_T}); return f?bob(c,44):c; }; }   // 0.36.0 ルカ（staff なし＝ノアと同じランタン）
  else if(u.name==='ルチア'){ key='lucia|'+pose+'|'+f; mk=()=>{ const c=figInes(pose,f,PAL_LUCIA_T); return f?bob(c,46):c; }; }   // 0.36.0 ルチア
  else if(u.name==='ペマ'){ key='pema|'+pose+'|'+f; mk=()=>{ const c=figInes(pose,f,PAL_PEMA_T); return f?bob(c,46):c; }; }   // 0.37.0 ペマ
  else if(u.name==='フェリクス'){ key='felix|'+pose+'|'+f; mk=()=>{ const c=figNoa(pose,{staff:true,pal:PAL_FELIX_T}); return f?bob(c,44):c; }; }   // 0.37.0 フェリクス（牧人の杖）
  else if(u.name==='オユナ'){ key='oyuna|'+pose+'|'+f; mk=()=>{ const c=figInes(pose,f,PAL_OYUNA_T); return f?bob(c,46):c; }; }   /* 0.39.0 オユナ */
  else if(u.name==='ジュン'){ key='jun|'+pose+'|'+f; mk=()=>{ const c=figNoa(pose,{staff:true,pal:PAL_JUN_T}); return f?bob(c,44):c; }; }   /* 0.40.0 ジュン（旅の杖） */
  else if(u.name==='クワメ'){ key='kwame|'+pose+'|'+f; mk=()=>{ const c=figNoa(pose,{staff:true,cook:true,pal:PAL_KWAME_T}); return f?bob(c,44):c; }; }   /* 0.41.0 クワメ（お玉のつもりの杖・コック帽とひげ） */
  else if(u.name==='デウィ'){ key='dewi|'+pose+'|'+f; mk=()=>{ const c=figInes(pose,f,PAL_DEWI_T,{bun:true,spatula:true}); return f?bob(c,46):c; }; }   /* 0.49.0 デウィ（おだんご・鉄べら） */
  else if(u.name==='ミレイユ'){ key='mireille|'+pose+'|'+f; mk=()=>{ const c=figInes(pose,f,PAL_MIREILLE_T,{bun:true}); return f?bob(c,46):c; }; }   /* 0.53.0 ミレイユ（おだんご） */
  else if(u.name==='ライラ'){ key='layla|'+pose+'|'+f; mk=()=>{ const c=figInes(pose,f,PAL_LAYLA_T); return f?bob(c,46):c; }; }   /* 0.54.0 ライラ（長い髪・手に小さなランタン） */
  else if(u.name==='ゾエ'){ key='zoe|'+pose+'|'+f; mk=()=>{ const c=figInes(pose,f,PAL_ZOE_T,{sign:true}); return f?bob(c,46):c; }; }   /* 0.56.0 19章 ゾエ（ポニーテール・手に道しるべの杖） */
  else if(u.name==='ベルタ'){ key='berta|'+pose+'|'+f; mk=()=>{ const c=figInes(pose,f,PAL_BERTA_T,{bun:true,ladle:true,apron:true}); return f?bob(c,46):c; }; }   /* 0.61.0 25章 ベルタ（おだんご・お玉・エプロン） */
  else if(u.name==='ソルヴェイ'){ key='solveig|'+pose+'|'+f; mk=()=>{ const c=figInes(pose,f,PAL_SOLVEIG_T,{braid:true,shawl:true}); return f?bob(c,46):c; }; }   /* 0.61.0 ソルヴェイ（三つ編み・ショール） */
  else if(u.name==='ヤスミン'){ key='yasmin|'+pose+'|'+f; mk=()=>{ const c=figInes(pose,f,PAL_YASMIN_T,{crop:true,book:true,spec:true,ruler:true}); return f?bob(c,46):c; }; }   /* 0.62.0 28章 ヤスミン（肩までの髪・丸い眼鏡・帳面・物差し） */
  else if(u.name==='トゥヤ'){ key='tuya|'+pose+'|'+f; mk=()=>{ const c=figInes(pose,f,PAL_TUYA_T,{crop:true,sash:true,staff:true}); return f?bob(c,46):c; }; }   /* 0.61.0 27章 トゥヤ（短い髪・帯・番の杖） */
  else if(u.name==='リン'){ key='linh|'+pose+'|'+f; mk=()=>{ const c=figInes(pose,f,PAL_LINH_T,{fan:true}); return f?bob(c,46):c; }; }   /* 0.57.0 20章 リン（手に扇） */
  else if(u.name==='ハナ'){ key='hana|'+pose+'|'+f; mk=()=>{ const c=figInes(pose,f,PAL_HANA_T); return f?bob(c,46):c; }; }   /* 0.39.0 ハナ */
  else if(u.name==='ボグダン'){ key='bogdan|'+pose+'|'+f; mk=()=>{ const c=figNoa(pose,{pal:PAL_BOGDAN_T}); return f?bob(c,44):c; }; }   /* 0.51.0 ボグダン（ノアの形・色は仮） */
  else if(u.name==='パブロ'){ key='pablo|'+pose+'|'+f; mk=()=>{ const c=figNoa(pose,{fist:true,pal:PAL_PABLO_T}); return f?bob(c,44):c; }; }   /* 0.51.0 パブロ（ノアの形・こぶし・色は仮） */
  else return null;
  /* 0.51.0 人は PSC だけ縮めて描く（足もとと体のまん中も同じだけ） */
  const s=typeof full==='number'?full:full?1:PSC; key+='|'+s;   /* 0.83.0 full に数を渡すとその倍率（戦いの場面は細かく描く） */
  let c=TALL[key]; if(!c){ TSC=s; TFR=f; try{ c=TALL[key]=mk(); } finally { TSC=1; TFR=0; } }
  c._cx=Math.round(18*s); c._foot=Math.round(78*s); return c;
};
ART.PSC=PSC;
ART.TALL_W=TW; ART.TALL_H=TH;

/* ---------- 地形 ---------- */
const RAMP={
  grass:['#b4e078','#86c454','#5ea23e','#3c7a34'],
  floor:['#6aa448','#4a8638','#346a30','#22502a'],
  sand: ['#fbf0c4','#ecd8a0','#d4b87a','#a68a58'],
  wet:  ['#c8b07a','#b49a68','#967e56','#6e5c44'],
  sea:  ['#9adcf8','#4aa4e0','#2a74c4','#1a4a98','#123272'],
  foam: '#f4fcff',
  dirt: ['#e4c48c','#c8a06a','#a07a4c','#6e5234'],
  stone:['#e6e0d4','#c4bcae','#968e84','#5e5a58'],
  rock: ['#c8bca8','#9a8c7a','#6e6258','#463e3c']};
ART.RAMP=RAMP;   // 戦いの場面の地面にも使う（0.5.1）
let MP=null;   // {MAP,W,H,TS,OY}
ART.init=function(o){ MP=o; MAPC={}; };
let MAPC={};
function T(x,y){ x=Math.max(0,Math.min(MP.W-1,x)); y=Math.max(0,Math.min(MP.H-1,y)); return MP.MAP[y][x]; }
function field(fn,gx,gy){ const fx=(gx-7.5)/16,fy=(gy-7.5)/16,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy;
  const a=fn(T(ix,iy)),b=fn(T(ix+1,iy)),c=fn(T(ix,iy+1)),d=fn(T(ix+1,iy+1)); return (a*(1-tx)+b*tx)*(1-ty)+(c*(1-tx)+d*tx)*ty; }
/* 0.8.0 w＝3章の水辺（浅瀬）。海と岸のあいだの明るい水になる */
const isLand=t=>(t==='~'?0:t==='w'?0.4:1), isForest=t=>(t==='T'?1:0), isShelter=t=>(t==='H'?1:0), isLight=t=>(t==='L'?1:0);
const isRock=t=>(t==='R'?1:0);   /* 0.50.0 R＝15章の岩場（通れない高い岩）。1〜14章の地図には R がない */
const isYard=t=>(t==='B'||t==='D'?1:0);   // 0.6.0 2章の倉庫（B）と戸口（D）のまわりは石だたみ
function shelterInfo(){ const hs=[]; for(let y=0;y<MP.H;y++)for(let x=0;x<MP.W;x++) if(MP.MAP[y][x]==='H') hs.push([x,y]);
  if(!hs.length) return null; let c=hs[0],bn=-1; for(const h of hs){ const n=D4.filter(([dx,dy])=>T(h[0]+dx,h[1]+dy)==='H').length; if(n>bn){ bn=n; c=h; } }
  return {c,all:hs}; }
function pathDist(gx,gy){   // 避難所から浜へ向かう小道（見た目だけ。歩数は草地と同じ）
  const S=shelterInfo(); if(!S) return 99; const [cx,cy]=S.c; const y0=cy*16+8+Math.sin(gx/9)*1.6, x1=cx*16-16, x0=x1-52;
  if(gx<x0-4||gx>x1+2) return 99; const taper=gx<x0?(x0-gx)*0.8:0; return Math.abs(gy-y0)+taper; }

function bakeGround(frame){
  const Wp=MP.W*16,Hp=MP.H*16,OY=MP.OY,cv=canvas(Wp,Hp+OY),c=cv.getContext('2d'),img=c.createImageData(Wp,Hp),d=img.data;
  const put=(x,y,col)=>{ const [r,g,b]=rgb(col),i=(y*Wp+x)*4; d[i]=r; d[i+1]=g; d[i+2]=b; d[i+3]=255; };
  const ph=frame%4, foamT=0.5-0.035*(1+Math.sin(ph*Math.PI/2));
  const S=shelterInfo(), hasRock=MP.MAP.some(r=>r.includes('R'));
  for(let y=0;y<Hp;y++)for(let x=0;x<Wp;x++){
    const n=fbm(x,y,9,1)-0.5;
    const v=field(isLand,x,y)+n*0.26;
    const lt=field(isLight,x,y);
    if(lt>0.42+n*0.2){   // 灯台の小島（岩）
      const h=k=>fbm(x+k,y+k,5,21); const e=(h(-1)-h(1))*9; const lv=e>0.35?0:e>0.05?1:e>-0.25?2:3;
      put(x,y,RAMP.rock[lt<0.5?Math.max(lv,2):lv]); continue; }
    if(v<0.5){   // 海
      if(v>foamT-0.04&&v<=0.5&&hash(x>>1,y,ph+40)>0.25){ put(x,y,v>foamT?RAMP.foam:RAMP.sea[0]); continue; }
      let lv=v>0.3?1:v>0.12?2:3; if(v<0.03) lv=4;
      // 波がしら：横に短い明るい線。frame で右へ流れる
      const w=fbm(x*0.5+ph*3,y*1.6,10,5); const crest=((y+Math.floor(fbm(x,y,20,9)*10))%7===0)&&w>0.55;
      if(crest) lv=Math.max(0,lv-1); else if(((y+Math.floor(fbm(x,y,20,9)*10))%7===1)&&w>0.6) lv=Math.min(4,lv+1);
      put(x,y,RAMP.sea[lv]); continue; }
    if(v<0.53){ put(x,y,RAMP.wet[hash(x,y,3)>0.7?1:2]); continue; }   // ぬれた砂
    if(v<0.76){ const s=fbm(x,y,4,4); put(x,y,RAMP.sand[s>0.62?0:s>0.4?1:s>0.25?2:3]); continue; }   // 砂浜
    // 倉庫のまわりの石だたみ（0.6.0。1章には B と D がないので、ここは通らない）
    { const yv=field(isYard,x,y)+n*0.12;
      if(yv>0.5){ const row=Math.floor(y/4), off=(row%2)*3, col=Math.floor((x+off)/6), lx=(x+off)%6, ly=y%4;
        const tone=hash(col,row,9); let lv=ly===0||lx===0?0:(ly===3||lx===5)?3:tone>0.6?1:2; if(ly===3&&lx===0) lv=3;
        put(x,y,RAMP.stone[lv]); continue; }
      if(yv>0.42){ put(x,y,RAMP.dirt[2]); continue; } }
    // 避難所の石だたみ
    if(S){ const hv=field(isShelter,x,y)+n*0.12;
      if(hv>0.5){ const row=Math.floor(y/4), off=(row%2)*3, col=Math.floor((x+off)/6), lx=(x+off)%6, ly=y%4;
        const tone=hash(col,row,8); let lv=ly===0||lx===0?0:(ly===3||lx===5)?3:tone>0.6?1:2; if(ly===3&&lx===0) lv=3;
        put(x,y,RAMP.stone[lv]); continue; }
      if(hv>0.42){ put(x,y,RAMP.dirt[2]); continue; } }
    /* 岩場（R）。つながった R は1つの崖に見える：上の面は明るく、下のふちは暗く、少し苔 */
    if(hasRock){ const rv=field(isRock,x,y)+n*0.22;
      if(rv>0.5){ const tx=x>>4, ty=y>>4, ly=y&15, up=T(tx,ty-1)==='R', dn=T(tx,ty+1)==='R';
        const e=(fbm(x-2,y-2,12,41)-fbm(x+2,y+2,12,41))*6;   /* 大きな面の明暗（左上から光） */
        const tn=-e*0.3+(up?0.12+(ly/16-0.5)*0.3:(ly/16-0.15)*0.7)+(dn?0:(ly>10?0.45:0))+(hash(x,y,44)-0.5)*0.14;
        let lv=tn<-0.05?0:tn<0.26?1:tn<0.66?2:3;
        if(hash(x>>2,y>>3,43)>0.93&&(x&3)===0&&lv>0) lv=Math.min(3,lv+1);   /* 縦のひび */
        lv=Math.max(0,Math.min(3,lv)); if(rv<0.56) lv=3;   /* ふちは暗く */
        const ms=fbm(x,y,6,47);
        if(ms>0.66&&lv<3&&(up||ly<9)){ put(x,y,['#b4d27c','#86ae5c','#628f4a'][Math.min(2,lv)]); continue; }   /* 苔 */
        put(x,y,RAMP.rock[lv]); continue; } }
    // 小道
    const pd=pathDist(x,y)+n*1.2;
    if(pd<2.6){ const s=fbm(x,y,3,6); put(x,y,RAMP.dirt[pd>1.9?2:s>0.6?0:s>0.35?1:2]); continue; }
    if(pd<3.4){ put(x,y,RAMP.grass[3]); continue; }
    // 森の下の地面と草
    const fv=field(isForest,x,y)+n*0.3;
    if(fv>0.55){ const s=fbm(x,y,5,11); put(x,y,RAMP.floor[s>0.62?1:s>0.38?2:3]); continue; }
    if(fv>0.45){ put(x,y,RAMP.grass[3]); continue; }
    const s=fbm(x,y,14,12)+(hash(x,y,13)-0.5)*0.04;
    put(x,y,RAMP.grass[s>0.6?1:s>0.3?2:s>0.26?(hash(x,y,14)>0.5?2:3):3]);
  }
  // 草のふさ・花（草地だけ）
  for(let cy=0;cy<Hp;cy+=4)for(let cx=0;cx<Wp;cx+=4){
    const r=hash(cx,cy,30); if(r<0.78) continue; const x=cx+Math.floor(hash(cx,cy,31)*3),y=cy+Math.floor(hash(cx,cy,32)*3)+1;
    if(x<1||y<1||x>=Wp-1||y>=Hp) continue; const i=(y*Wp+x)*4, here=(d[i]<<16|d[i+1]<<8|d[i+2]);
    const gset=RAMP.grass.slice(1).map(cc=>{const [a,b,e]=rgb(cc); return a<<16|b<<8|e;}); if(!gset.includes(here)) continue;
    if(r>0.975){ put(x,y,hash(cx,cy,33)>0.5?'#fff8e8':'#ffe070'); put(x,y-1,'#fffff8'); continue; }   // 小さな花
    put(x,y,RAMP.grass[3]); put(x-1,y,RAMP.grass[3]); put(x,y-1,RAMP.grass[0]); put(x+1,y-1,RAMP.grass[1]);
  }
  c.putImageData(img,0,OY); return cv;
}

/* 木（16×24・上のマスへ8ドットはみ出す） */
const LEAF=['#a8e070','#68b448','#3c8c3a','#24622e'], LEAF_OL='#123620';
const PINE=['#86d0a0','#46a070','#2c7656','#1a4e3c'], PINE_OL='#0e2a22';
const BARK=['#b88a5a','#86603c','#5e4028','#3a2618'];
function bakeTree(kind,seed){
  const W=16,H=24,g=[]; for(let y=0;y<H;y++) g.push(new Array(W).fill('.'));
  const lv=[]; for(let y=0;y<H;y++) lv.push(new Array(W).fill(0));
  const Lx=-0.55,Ly=-0.62,Lz=0.56;
  const trunk=(x0,x1,y0,y1)=>{ for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){ g[y][x]='b'; lv[y][x]=x===x0?1:x===x1?3:2; } };
  if(kind==='pine'){
    trunk(7,8,18,21); g[21][6]='b'; lv[21][6]=2; g[21][9]='b'; lv[21][9]=3;
    const tiers=[[1,8,3.2],[5,13,5.2],[9,18,6.6]];
    for(const [y0,y1,w] of tiers) for(let y=y0;y<=y1;y++){ const hw=w*(y-y0+1)/(y1-y0+1); for(let x=0;x<W;x++){ const dx=x-7.5; if(Math.abs(dx)<=hw+0.2){
      g[y][x]='p'; let L=dx<-hw*0.35?1:dx<hw*0.35?2:3; if(y===y1) L=3; if(dx<0&&Math.abs(dx)>hw-1.2&&y<y1) L=dx<-hw*0.6?0:1; if(hash(x,y,seed)>0.86&&L>0) L--; lv[y][x]=L; } } }
  } else {
    const C=kind==='round'?[[7.5,9,6.6],[4.2,12,4.2],[11,12,4.2],[7.5,5,4.6]]:[[6,10,5.4],[10.5,8,5],[8,13,5],[7,4.6,3.8]];
    trunk(7,8,15,21); g[21][6]='b'; lv[21][6]=2; g[21][9]='b'; lv[21][9]=3; g[20][9]='b'; lv[20][9]=3;
    for(let y=0;y<18;y++)for(let x=0;x<W;x++){ let best=null,bv=0; for(const k of C){ const dd=k[2]-Math.hypot(x+0.5-k[0],y+0.5-k[1]); if(dd>bv){ bv=dd; best=k; } }
      if(!best) continue; const nx=(x+0.5-best[0])/best[2],ny=(y+0.5-best[1])/best[2],nz=Math.sqrt(Math.max(0.05,1-nx*nx-ny*ny));
      let lam=-(nx*Lx+ny*Ly)*0.9+nz*Lz*0.7+(y<9?0.12:0)+(fbm(x,y,2.5,seed)-0.5)*0.5;
      let L=lam>0.95?0:lam>0.6?1:lam>0.28?2:3; if(hash(x,y,seed+5)>0.9&&L>0&&L<3) L--;
      g[y][x]='l'; lv[y][x]=L; }
  }
  const pal={l:{r:LEAF,ol:LEAF_OL},p:{r:PINE,ol:PINE_OL},b:{r:BARK}};
  return bake(g,pal,{fn:(x,y)=>lv[y][x]});
}
/* 避難所の家（屋根が上のマスへ） */
const HOUSE=[
"..........cc....",
"..........cc....",
"...rrrrrrrccrr..",
"..rrrrrrrrrrrr..",
".rrrrrrrrrrrrrr.",
".rrrrrrrrrrrrrr.",
".rrrrrrrrrrrrrr.",
".rrrrrrrrrrrrrr.",
".RRRRRRRRRRRRRR.",
"..wwwwwwwwwwww..",
"..wwwwwwwwwwww..",
"..wyywwddwwyyw..",
"..wyywwddwwyyw..",
"..wwwwwddwwwww..",
"..wwwwwddwwwww..",
"..sssssddsssss..",
"..ssssppppssss..",
"................"];
const PAL_HOUSE={
  r:{r:['#f49070','#d05a44','#a43c34','#6e2428']}, R:{r:['#a43c34','#a43c34','#6e2428','#4a1a20']},
  c:{r:['#c4bcae','#968e84','#6e6862','#46423e']},
  w:{r:['#e0b07a','#c08a56','#946640','#5e3e28']},
  y:{r:['#fff8c8','#ffe080','#ffc040','#c08020']},
  d:{r:['#8a5a36','#8a5a36','#5a3824','#33201a']},
  s:{r:RAMP.stone}, p:{r:RAMP.stone}};
function bakeHouse(){ return bake(HOUSE,PAL_HOUSE,{fn:(x,y,ch,l)=>{
  if(ch==='r'){ if(y%2===0&&(x+(y>>1)*2)%4===0) return 3; if(y===2||y===3) return Math.min(l,1); return l; }
  if(ch==='w'){ if(x%3===1&&y>8) return Math.max(l,2); return l; }
  if(ch==='s'){ return (x+(y%2)*2)%4===0?3:l; }
  return null; }}); }
/* 灯台（上へ2マスはみ出す） */
const LIGHTHOUSE=[
"................",
"................",
"................",
".......kk.......",
"......kkkk......",
".....kkkkkk.....",
".....gggggg.....",
".....gggggg.....",
".....gggggg.....",
"....mmmmmmmm....",
"....m.m..m.m....",
".....wwwwww.....",
".....wwwwww.....",
".....rrrrrr.....",
".....rrrrrr.....",
".....wwwwww.....",
".....wwdwww.....",
".....wwwwww.....",
"....wwwwwwww....",
"....rrrrrrrr....",
"....rrrrrrrr....",
"....wwwwwwww....",
"....wwwwwwww....",
"....wwwwwwww....",
"....wwwwwwww....",
"...rrrrrrrrrr...",
"...rrrrrrrrrr...",
"...wwwwwwwwww...",
"...wwwwddwwww...",
"...wwwwddwwww...",
"...ssssddssss...",
"..ssssssssssss..",
"..ssssssssssss..",
"................"];
const PAL_LH={
  k:{r:['#7a3a3a','#5a2a30','#3e1e26','#26121a']}, g:{r:['#fffbe0','#ffe890','#ffc850','#c88a28'],ol:'#3e1e26'},
  m:{r:['#6a6e7a','#4a4e5a','#34363e','#202228']},
  w:{r:['#ffffff','#eef0f4','#c4cad6','#868ea0']}, r:{r:['#ff8a7a','#e04a40','#a8303a','#6a1e2a']},
  d:{r:['#5a6070','#5a6070','#3a3e4a','#24262e']}, s:{r:RAMP.rock}};

/* 地形の絵（波のコマごとに1枚。キャッシュする） */
let OBJ=null;
function objects(){
  if(OBJ) return OBJ; OBJ={trees:[bakeTree('round',3),bakeTree('round2',7),bakeTree('pine',11),bakeTree('round',19),bakeTree('pine',23)],house:bakeHouse(),lh:bake(LIGHTHOUSE,PAL_LH)}; return OBJ; }
function decor(c,S){   // 避難所まわりの小物（木箱・たる・井戸・たき火の台・灯の柱）
  const OY=MP.OY,[cx,cy]=S.c, X=x=>x*16, Y=y=>OY+y*16;
  const R=(x,y,w,h,col)=>{ c.fillStyle=col; c.fillRect(x,y,w,h); };
  for(const [hx,hy] of S.all){ const dx=hx-cx,dy=hy-cy, x=X(hx),y=Y(hy);
    if(dx===-1&&dy===0){   // 西：木箱とたる
      R(x+2,y+5,7,7,'#3a2618'); R(x+3,y+6,5,5,'#c08a56'); R(x+3,y+6,5,1,'#e0b07a'); R(x+3,y+8,5,1,'#946640'); R(x+7,y+6,1,5,'#946640');
      R(x+10,y+4,5,9,'#3a2618'); R(x+11,y+5,3,7,'#a06a3a'); R(x+11,y+5,1,7,'#c89060'); R(x+11,y+7,3,1,'#5a5e6a'); R(x+11,y+10,3,1,'#5a5e6a'); }
    else if(dx===1&&dy===0){   // 東：井戸
      R(x+4,y+4,9,9,'#3a3638'); R(x+5,y+5,7,7,'#968e84'); R(x+5,y+5,7,1,'#c4bcae'); R(x+6,y+6,5,5,'#1a3a6a'); R(x+6,y+6,5,1,'#4aa4e0');
      R(x+4,y,1,5,'#5e4028'); R(x+12,y,1,5,'#5e4028'); R(x+4,y-1,9,1,'#86603c'); }
    else if(dx===0&&dy===1){   // 南：たき火の石と薪
      R(x+4,y+8,8,4,'#46423e'); R(x+5,y+9,6,2,'#2a2018'); R(x+3,y+9,2,2,'#968e84'); R(x+11,y+9,2,2,'#968e84'); R(x+5,y+11,6,1,'#6e5234');
      R(x+5,y+9,6,1,'#86603c'); }
    else if(dx===0&&dy===-1){   // 北：灯の柱
      R(x+11,y+1,1,12,'#3a2618'); R(x+10,y+1,3,1,'#5e4028'); R(x+10,y+2,3,3,'#46423e'); R(x+10,y+12,3,1,'#46423e'); }
  }
}
/* 0.6.0 2章の倉庫。つながった B のかたまりを1つの建物に（屋根は上のマスへ8ドット）。すぐ下が D の列に戸を描く */
function sheds(){ const seen=new Set(), out=[];
  for(let y=0;y<MP.H;y++)for(let x=0;x<MP.W;x++){ if(MP.MAP[y][x]!=='B'||seen.has(x+','+y)) continue;
    const q=[[x,y]], b={x0:x,x1:x,y0:y,y1:y}; seen.add(x+','+y);
    while(q.length){ const [cx,cy]=q.pop(); b.x0=Math.min(b.x0,cx); b.x1=Math.max(b.x1,cx); b.y0=Math.min(b.y0,cy); b.y1=Math.max(b.y1,cy);
      for(const [dx,dy] of D4){ const nx=cx+dx,ny=cy+dy; if(nx<0||ny<0||nx>=MP.W||ny>=MP.H||MP.MAP[ny][nx]!=='B'||seen.has(nx+','+ny)) continue; seen.add(nx+','+ny); q.push([nx,ny]); } }
    /* 0.58.1 描く目印＝いちばん下の行の、いちばん左の B（左下が戸口 D の小屋も描けるように） */
    b.ax=null; for(let ax=b.x0;ax<=b.x1;ax++) if(MP.MAP[b.y1][ax]==='B'&&seen.has(ax+','+b.y1)){ b.ax=ax; break; }
    out.push(b); }
  return out; }
function drawShed(c,b){
  const OY=MP.OY, R=(x,y,w,h,col)=>{ c.fillStyle=col; c.fillRect(x,y,w,h); };
  const x0=b.x0*16, w=(b.x1-b.x0+1)*16, top=OY+b.y0*16-8, bot=OY+(b.y1+1)*16, H=bot-top, roofH=Math.round(H*0.52);
  R(x0+1,bot-2,w-2,3,'rgba(10,20,30,.35)');   // 足元の影
  R(x0,top,w,roofH,'#2a3442');
  for(let y=1;y<roofH-1;y++) R(x0+1,top+y,w-2,1,y<3?'#b8c8d8':y%3===0?'#5a6a80':'#7a8ca4');   // 波板の屋根
  R(x0,top+roofH-1,w,1,'#2a3442');
  R(x0+1,top+roofH,w-2,H-roofH-1,'#3a2618');
  for(let x=x0+2;x<x0+w-2;x++) R(x,top+roofH+1,1,H-roofH-3,(x-x0)%4===0?'#946640':(x-x0)%4===1?'#e0b07a':'#c08a56');   // 板の壁
  for(let tx=b.x0;tx<=b.x1;tx++){ if(T(tx,b.y1+1)!=='D') continue; const dx=tx*16;
    R(dx+3,bot-11,10,10,'#3a2618'); R(dx+4,bot-10,8,9,'#5a3824'); R(dx+7,bot-10,2,9,'#33201a'); R(dx+4,bot-10,8,1,'#8a5a36'); R(dx+10,bot-6,1,1,'#f0c040'); }   // 戸
  /* 0.58.1 小屋の並びの中にある戸口は、小屋の上から踏み石を描き直す（左が戸口でも右が戸口でも同じ見た目に） */
  for(let tx=b.x0;tx<=b.x1;tx++) if(T(tx,b.y1)==='D') drawDoorStep(c,tx,b.y1);
}
function drawDoorStep(c,x,y){ const px=x*16, py=MP.OY+y*16;   // 戸口の前の踏み石と木箱
  c.fillStyle='#968e84'; c.fillRect(px+3,py+1,10,3); c.fillStyle='#c4bcae'; c.fillRect(px+3,py+1,10,1);
  c.fillStyle='#3a2618'; c.fillRect(px+10,py+8,5,5); c.fillStyle='#c08a56'; c.fillRect(px+11,py+9,3,3); c.fillStyle='#e0b07a'; c.fillRect(px+11,py+9,3,1); }
ART.map=function(frame){
  const k=frame%4; if(MAPC[k]) return MAPC[k];
  const cv=bakeGround(k),c=cv.getContext('2d'),O=objects(),OY=MP.OY,S=shelterInfo();
  if(S) decor(c,S);
  const SH=sheds();
  // 高い物は上の行から順に。はみ出す分は上のマスへ
  for(let y=0;y<MP.H;y++)for(let x=0;x<MP.W;x++){ const t=MP.MAP[y][x], px=x*16, py=OY+y*16;
    if(t==='B'){ const b=SH.find(s=>s.y1===y&&s.ax===x); if(b) drawShed(c,b); }
    else if(t==='D') drawDoorStep(c,x,y);
    else if(t==='T'){ const v=Math.floor(hash(x,y,77)*O.trees.length); c.fillStyle='rgba(10,30,14,.35)'; c.fillRect(px+3,py+13,10,2); c.drawImage(O.trees[v],px,py-8); }
    else if(t==='L') c.drawImage(O.lh,px,py+16-34);
    else if(S&&x===S.c[0]&&y===S.c[1]) c.drawImage(O.house,px,py+16-24); }
  return MAPC[k]=cv;
};
/* 夜の暗さの上から描く灯（灯台・窓・たき火・灯の柱）。tick で光がゆれる */
ART.drawLights=function(ctx,dawn){
  if(!MP) return; const OY=MP.OY,t=ART.tick,S=shelterInfo();
  const glow=(x,y,r,a,col)=>{ const g=ctx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,`rgba(${col},${a})`); g.addColorStop(1,`rgba(${col},0)`); ctx.fillStyle=g; ctx.fillRect(x-r,y-r,r*2,r*2); };
  ctx.save();
  for(let y=0;y<MP.H;y++)for(let x=0;x<MP.W;x++) if(MP.MAP[y][x]==='L'){ const lx=x*16,ly=OY+y*16+16-34;
    ctx.fillStyle='#fffbe0'; ctx.fillRect(lx+6,ly+6,4,3); ctx.fillStyle=t%4<2?'#ffe890':'#fff4c0'; ctx.fillRect(lx+5,ly+6,1,3); ctx.fillRect(lx+10,ly+6,1,3);
    ctx.globalCompositeOperation='lighter'; glow(lx+8,ly+7,dawn?10:(t%4<2?16:19),dawn?0.25:0.45,'255,230,140'); ctx.globalCompositeOperation='source-over'; }
  if(S){ const [cx,cy]=S.c, hx=cx*16, hy=OY+cy*16+16-24;
    ctx.fillStyle='#ffe890'; ctx.fillRect(hx+3,hy+11,2,2); ctx.fillRect(hx+11,hy+11,2,2);
    ctx.globalCompositeOperation='lighter'; glow(hx+4,hy+12,7,dawn?0.1:0.3,'255,200,110'); glow(hx+12,hy+12,7,dawn?0.1:0.3,'255,200,110'); ctx.globalCompositeOperation='source-over';
    for(const [ax,ay] of S.all){ const dx=ax-cx,dy=ay-cy,x=ax*16,y=OY+ay*16;
      if(dx===0&&dy===1){ const f=t%3; ctx.fillStyle='#ff7a30'; ctx.fillRect(x+6,y+5+(f===1?1:0),4,4-(f===1?1:0)); ctx.fillStyle='#ffd040'; ctx.fillRect(x+7,y+6+(f===2?1:0),2,3-(f===2?1:0)); ctx.fillStyle='#fff6c0'; ctx.fillRect(x+7+(f===0?1:0),y+8,1,1);
        ctx.globalCompositeOperation='lighter'; glow(x+8,y+8,dawn?8:(f===1?13:15),dawn?0.15:0.4,'255,150,60'); ctx.globalCompositeOperation='source-over'; }
      if(dx===0&&dy===-1){ ctx.fillStyle=t%6<3?'#ffe890':'#fff4c0'; ctx.fillRect(x+11,y+3,1,1);
        ctx.globalCompositeOperation='lighter'; glow(x+11,y+3,8,dawn?0.1:0.35,'255,220,130'); ctx.globalCompositeOperation='source-over'; } } }
  ctx.restore();
};

/* ---------- 顔グラ 64×64（ノア） ----------
   表情：normal ふつう / smile 笑う / angry 怒る / sad 悲しい / surprise 驚く / resolve 決意
   blink：0 開く / 1 半分 / 2 閉じる。talk：0 閉じる / 1 開く
   1.2（0.32.0）：ヒロさん「顔グラが少し良くなった。しかし、不充分。もっとドット数を増やしてもいいかも」→ 64×64 に。
   形の式（輪郭・髪・服・帽子）は今までの 48 の座標のまま書き、64 の格子のドットごとに X=(x+0.5)*FK・Y=(y+0.5)*FK（FK=48/64）で取り直す。
   点で置く物（目・眉・口・鼻・頬・耳のくぼみ・小物）は 64 の細かさで描き直した。 */
const FN=64, FK=48/FN;
function gridF(){ const L=[]; for(let y=0;y<FN;y++) L.push(new Array(FN).fill(null)); return L; }
function eachF(f,y0,y1){ for(let y=y0||0;y<(y1||FN);y++)for(let x=0;x<FN;x++) f(x,y,(x+0.5)*FK,(y+0.5)*FK); }
const f64=v=>Math.floor(v/FK);   // 48 の座標 → 64 の格子の番号
const lnD=(v,p)=>{ const d=((v%p)+p)%p; return Math.min(d,p-d); };   // 周期 p の線までの距離（毛すじ・ぬい目を 64 の1ドットの太さで引く）
/* 数字の絵（'.' は置かない）を 64 の格子に置く。数字は肌の段（skinRamp の番号）、文字は map の色 */
function dots(g,x0,y0,rows,map,reg){ rows.forEach((r,j)=>{ for(let i=0;i<r.length;i++){ const ch=r[i]; if(ch==='.'||ch===' ') continue; const c=map[ch]; if(!c) continue; const x=x0+i,y=y0+j; if(x>=0&&y>=0&&x<FN&&y<FN) g[y][x]=Object.assign({c,r:reg||'skin'},/\d/.test(ch)?{k:+ch}:{}); } }); }
/* 鼻（正面）：光は左上なので、鼻すじの右と鼻の下に影。n：1 小さい・2 ふつう・3 大きい */
const NOSE_F={
  1:{x:31,y:41,rows:['..3','..3','...4','.135','.34.']},
  2:{x:30,y:40,rows:['...3','...3','...4','....5','..1.5','3456']},
  3:{x:29,y:40,rows:['....3','....3','....4','.....5','...1.5','34566.','.4.5']}};
function noseFront(g,P,n){ const R=skinRamp(P), N=NOSE_F[n]||NOSE_F[2], m={}; for(let i=0;i<8;i++) m[i]=R[i]; dots(g,N.x,N.y,N.rows,m,'skin'); }
const FACE_PAL={
  skin:['#fff2e4','#fcd6b0','#eeb488','#d08c66','#a86448'], skinOL:'#4a2418',
  hair:['#f0c890','#c08850','#94603a','#6a4028','#432618'],
  brass:['#fff0a0','#e8b850','#b07a30','#6a4420'], lens:['#f4feff','#a8e8ff','#58b8e8','#2a78b0'], strap:['#7a5236','#5a3824','#3a2218'],
  jacket:['#ffd890','#f4a848','#cc7428','#84441c'], scarf:['#ff9a80','#e84a3a','#b0303a','#701c2c'], shirt:['#fffaf0','#e8dcc4'],
  eyeLine:'#2a1418', eyeW:'#ffffff', eyeWs:'#d4dcec', iris:['#e8b048','#b0702a','#6a3818'], pupil:'#2a1418', brow:'#5a3420',
  mouth:'#8a2c2c', mouthIn:'#c04848', tongue:'#f08888', teeth:'#ffffff', blush:'#f8a090', tear:'#bfeaff'};
ART.FACE_PAL=FACE_PAL;
FACE_PAL.clothOL='#5a2018'; FACE_PAL.gearOL=FACE_PAL.brass[3];
/* イネスの色（マップの絵と同じ髪・バンダナ・つなぎ。瞳は青緑）0.5.1 */
const FACE_PAL_INES=Object.assign({},FACE_PAL,{
  skin:['#fff4e8','#f8d4b0','#e6aa84','#c4805e','#985a40'],
  hair:['#d8a490','#a8705c','#7a4a3e','#52302c','#30181c'],
  band:['#c8fbe8','#5cd4b4','#2a9a84','#18605a'],
  shirt:['#fffcf0','#f0e4c8','#c8b490','#8a7a60'], over:['#b8e2fa','#64ace0','#3a7cb4','#24507e'],
  iris:['#a0ecd0','#3a9a84','#1a5a54'], brow:'#3e1c22', mouth:'#c04860', mouthIn:'#d86070', blush:'#f48c98', cheek:'#f8b8b0', eyeLine:'#30141c',
  clothOL:'#24304e', gearOL:'#18605a'});
let FP=FACE_PAL, WHO='noa', JAW=null, ST=null, SPEC=null, COVER=[];   // ST：目・眉・口の描き方（0.5.3）。SPEC：仲間の顔の指定
function faceBase(){
  if(WHO==='ines') return faceBaseInes();
  if(SPEC) return faceBaseGen(SPEC);
  const N=FN,P=FACE_PAL,g=gridF();
  const set=(x,y,col,reg)=>{ if(x>=0&&y>=0&&x<N&&y<N) g[y][x]={c:col,r:reg}; };
  const jaw=y=>13-7.6*Math.pow(Math.max(0,y-27)/13.5,2.3);   // 0.5.2：あごを角ばらせて広く
  JAW={f:jaw,bot:40.5};
  const inFace=(X,Y)=>{ if(Y<=27) return ((X-24)/13.4)**2+((Y-25)/14)**2<=1; if(Y<=40.5) return Math.abs(X-24)<=jaw(Y); return false; };
  // 肩と上着（1.2：肩は丸く、えりもとから腕へ下がる）
  const shW=Y=>Y<40?0:12+(Y-40.5)*2.6-Math.max(0,2.4-(Y-40))*1.1;
  eachF((x,y,X,Y)=>{ const hw=shW(Y), ax=Math.abs(X-24); if(!hw||ax>hw) return;
    let l=X<24-hw*0.55?1:X>24+hw*0.55?2:1; if(ax>hw-1.2) l=3; if(Y<42) l=Math.min(3,l+1); if(Math.abs(ax-7.6)<0.38&&Y>44) l=3; else if(Math.abs(ax-8.35)<0.38&&Y>44.4&&l<2) l=0;   // 上着の前のふち
    if(ax>hw-3.6&&ax<=hw-1.2&&Math.abs(ax-(hw-2.6)-(Y-46)*0.3)<0.4&&Y>44.5) l=Math.min(3,l+1);   // 腕の付け根のしわ
    if(hash(x,y,90)>0.95&&l<3) l++;
    set(x,y,P.jacket[l],'cloth'); },f64(40));
  eachF((x,y,X,Y)=>{ if(Y<42||Math.abs(X-24)>1.5+(Y-42)*0.5) return; set(x,y,P.shirt[Y>45?1:0],'cloth'); },f64(42));
  // 首
  eachF((x,y,X,Y)=>{ if(Y<35||Y>44||Math.abs(X-24)>5.4) return; set(x,y,P.skin[X>27.4?4:Y<40.2?3:2],'skin'); },f64(35));   // 首は太め
  // えり巻き
  eachF((x,y,X,Y)=>{ const top=39+Math.abs(X-24)*0.12, bot=43.2+Math.abs(X-24)*0.06;
    if(Y>=top&&Y<=bot&&Math.abs(X-24)<=10.5){ let l=Y<top+1.2?0:Y>bot-1.2?3:X>28?2:1; if(lnD(X*1.2+Y*0.9,4.2)<0.34&&l<3&&l>0) l++; set(x,y,P.scarf[l],'cloth'); } },f64(39));
  eachF((x,y,X,Y)=>{ if(Y<43||Math.abs(X-30)>1.6+(Y-43.5)*0.3) return; set(x,y,P.scarf[Y>46?3:X>31?2:1],'cloth'); },f64(43));
  // 耳
  for(const [ex,s] of [[10.6,-1],[37.4,1]]) earFront(g,P,ex,s,2.4,3.6,27.8);
  // 顔（1.0：面の向きで明るさを決める）
  skinFront(g,P,{in:inFace,rx:13.4,ry:14,cy:25,jaw,bot:40.5},16);
  noseFront(g,P,2);   // 鼻
  // 髪
  const bang=x=>{ const k=((x-3)%6+6)%6; return 18+Math.abs(k-3)*1.3+(x>30?0.6:0); };   // x は 48 の座標の連続な値（X-0.5）
  const hairAt=(X,Y)=>{ const xb=X-0.5;
    if(Y<=bang(xb)&&((X-24)/17.5)**2+((Y-21)/17)**2<=1) return true;
    if(Y>14&&Y<=36&&((X<12.2-(Y-20)*0.12&&X>6.2+(Y-18)*0.18)||(X>35.8+(Y-20)*0.12&&X<41.8-(Y-18)*0.18))) return true;   // 横の髪
    if(Y<8&&(Math.abs(X-15)<3.4-(8-Y)*0.55&&Y>2.6||Math.abs(X-25)<3.8-(8-Y)*0.5&&Y>1||Math.abs(X-34)<3.2-(8-Y)*0.6&&Y>3.4)) return true;   // はね
    return false; };
  const HR=hairRamp(P);
  eachF((x,y,X,Y)=>{ if(!hairAt(X,Y)) return; const xb=X-0.5;
    const nx=(X-24)/18,ny=(Y-17)/18,nz=Math.sqrt(Math.max(0.05,1-nx*nx-ny*ny)), lam=-nx*0.55-ny*0.62+nz*0.5;
    let l=lam>0.86?1:lam>0.62?2:lam>0.42?3:lam>0.24?4:lam>0.08?5:6;   // 1.2：髪も7段
    const ring=Math.hypot(X-22,Y-20)-11.2; if(Math.abs(ring)<0.8&&X<30&&Y<17&&(Math.floor(X/2.6)%2===0)) l=0; else if(Math.abs(ring)<1.8&&X<30&&Y<17&&l>2) l=Math.max(1,l-2);   // つやの帯
    if(Y>bang(xb)-1.6&&Y<26&&X>8&&X<40) l=Math.max(l,Y>bang(xb)-0.8?5:4);   // 毛先の下側
    if(lnD(X+0.5,6)<0.38&&Y>12&&Y<bang(xb)-0.6) l=Math.max(l,4); else if(lnD(X+0.5+0.75,6)<0.38&&Y>12&&Y<bang(xb)-2&&l>1) l--;    // 毛すじと、その横の光
    set(x,y,HR[l],'hair'); });
  // 髪の落とす影（おでこ）
  hairShadow(g,P);
  // ゴーグル（おでこの上）
  eachF((x,y,X,Y)=>{ const bandY=12.6+((X-24)/18)**2*3;
    if(Math.abs(Y-bandY)<=1.3&&hairAt(X,Y)) set(x,y,FACE_PAL.strap[Y<bandY-0.4?0:Y>bandY+0.6?2:1],'gear'); },f64(8),f64(20));
  for(const [gx,gy] of [[17.5,13],[30.5,13]]) eachF((x,y,X,Y)=>{ const r=Math.hypot(X-gx,Y-gy);
    if(r<=4.3){ if(r>3.15){ const a=Math.atan2(Y-gy,X-gx); set(x,y,FACE_PAL.brass[a<-1.2&&a>-2.8?0:a>0.6&&a<2.6?3:a>-0.4&&a<0.6?2:1],'gear'); }
      else if(r>2.75) set(x,y,FACE_PAL.brass[3],'gear');   // レンズのふちの内側の影
      else { const l=(X-gx)+(Y-gy)<-1.6?0:(X-gx)+(Y-gy)<0.5?1:(X-gx)+(Y-gy)<2.2?2:3; set(x,y,FACE_PAL.lens[l],'gear'); } } },f64(7),f64(20));
  for(const [hx,hy] of [[20,14],[37,14]]){ set(hx,hy,'#ffffff','gear'); set(hx+1,hy,'#ffffff','gear'); set(hx,hy+1,'#ffffff','gear'); set(hx+4,hy+4,FACE_PAL.lens[0],'gear'); }
  return g;
}
/* イネスの顔（女型：細いあご・流した前髪・ポニーテール・バンダナ・まつげ・つなぎ）0.5.1 */
function faceBaseInes(){
  const N=FN,P=FP,g=gridF();
  const set=(x,y,col,reg)=>{ if(x>=0&&y>=0&&x<N&&y<N) g[y][x]={c:col,r:reg}; };
  const jaw=y=>11.8-9.4*Math.pow(Math.max(0,y-27)/13,1.6);   // 0.5.2：小さめの丸い顔から細いあごへ
  JAW={f:jaw,bot:40};
  const inFace=(X,Y)=>{ if(Y<=27) return ((X-24)/12.2)**2+((Y-25.4)/13.4)**2<=1; if(Y<=40) return Math.abs(X-24)<=jaw(Y); return false; };
  const HR=hairRamp(P);
  // ポニーテール（頭の後ろ、右へ流れる）
  const tc=Y=>37.5+6.4*Math.sin(Math.min(1,Math.max(0,(Y-8)/30))*Math.PI*0.62);
  const tw=Y=>Y<10?3.2+(Y-6)*0.4:Math.max(0.6,5.4-Math.pow(Math.max(0,Y-14)/26,1.4)*4.8);
  eachF((x,y,X,Y)=>{ if(Y<6||Y>45||X<28) return; const dx=X-tc(Y),w=tw(Y); if(Math.abs(dx)>w) return;
    let l=dx<-w*0.35?1:dx<-w*0.05?2:dx<w*0.3?3:dx<w*0.6?4:5; if(Math.abs(dx)>w-0.8) l=6; if(lnD(dx*1.6+Y*0.8,3.4)<0.4&&l<6&&l>1) l++; if(Y>40&&l<4) l=4;
    set(x,y,HR[l],'hair'); });
  eachF((x,y,X,Y)=>{ if(Math.abs(X-tc(Y))<=tw(Y)+0.4&&Y>9.6&&Y<12.4) set(x,y,P.band[Y<10.4?0:Y>11.7?3:X>tc(Y)+1?2:1],'gear'); },f64(9),f64(13));   // 髪どめ
  // 肩・シャツ・つなぎ
  const shW=Y=>Y<40?0:10+(Y-40.5)*2.3-Math.max(0,2.4-(Y-40))*0.9;
  eachF((x,y,X,Y)=>{ const hw=shW(Y),ax=Math.abs(X-24); if(!hw||ax>hw) return;
    let c=P.shirt[X<24-hw*0.5?0:X>24+hw*0.55?2:1]; if(ax>hw-1.1) c=P.shirt[3];
    if(Y>=44&&ax<=5.6) c=P.over[ax>4.8?3:X>26?2:Y<44.8?0:1];   // 胸当て
    if(ax>=6.4&&ax<=8.4&&Y>=41) c=P.over[ax>8?3:X>24?2:1];   // つりひも
    set(x,y,c,'cloth'); },f64(40));
  for(const bx of [27,36]){ set(bx,60,P.band[0],'gear'); set(bx+1,60,P.band[1],'gear'); set(bx,61,P.band[1],'gear'); set(bx+1,61,P.band[2],'gear'); }   // ボタン
  eachF((x,y,X,Y)=>{ if(Y<40||Y>44) return; if(Math.abs(X-24)<=2+(Y-40)*1.2&&Math.abs(X-24)>=(Y-40)*0.9) set(x,y,P.shirt[Y<41.5?0:Math.abs(X-24)>(Y-40)*0.9+1.5?1:2],'cloth'); },f64(40));   // えり
  // 首
  eachF((x,y,X,Y)=>{ if(Y<35||Y>43||Math.abs(X-24)>3.9) return; if(Y>=41.5&&Math.abs(X-24)>3.1-(Y-41.5)) return; set(x,y,P.skin[X>26.2?4:Y<39.5?3:2],'skin'); },f64(35));
  // 耳（髪から少しだけ出る）
  for(const [ex,s] of [[11.4,-1],[36.6,1]]) earFront(g,P,ex,s,2.1,3.2,28);
  // 顔（1.0：面の向きで明るさを決める）
  skinFront(g,P,{in:inFace,rx:12.2,ry:13.4,cy:25.4,jaw,bot:40},16.5);
  noseFront(g,P,1);   // 鼻（小さめ）
  // 髪：流した前髪（右から左へ）・横の長い房
  // 0.5.2：前髪は毛先をとがらせ、横の房は耳をかくして肩まで
  const bang=x=>16.2+(x<24?(24-x)*0.3:(x-24)*-0.05)+jg(x+2,[1.6,0.4,-0.6,-0.6,0.4]);
  const hairAt=(X,Y)=>{ const xb=X-0.5;
    if(Y<=bang(xb)&&((X-24)/16.8)**2+((Y-21.5)/16.4)**2<=1) return true;
    if(Y>14&&Y<=44&&X>6.6+(Y-16)*0.1-(Y>36?(Y-36)*0.15:0)&&X<12.8-(Y-18)*0.04-(Y>37?(Y-37)*0.42:0)) return true;   // 左の長い房
    if(Y>14&&Y<=41&&X<41.2-(Y-16)*0.06+(Y>36?(Y-36)*0.15:0)&&X>35.2+(Y-18)*0.04+(Y>34?(Y-34)*0.42:0)) return true;  // 右の房
    return false; };
  eachF((x,y,X,Y)=>{ if(!hairAt(X,Y)) return; const xb=X-0.5;
    const nx=(X-24)/17,ny=(Y-18)/17,nz=Math.sqrt(Math.max(0.05,1-nx*nx-ny*ny)); const lam=-nx*0.55-ny*0.62+nz*0.5;
    let l=lam>0.86?1:lam>0.62?2:lam>0.42?3:lam>0.24?4:lam>0.08?5:6;
    const ring=Math.hypot(X-21,Y-19)-10.6; if(Math.abs(ring)<0.8&&X<31&&Y<16&&(Math.floor(X/2.6)%2===0)) l=0; else if(Math.abs(ring)<1.8&&X<31&&Y<16&&l>2) l=Math.max(1,l-2);
    if(Y>bang(xb)-1.5&&Y<26&&X>9&&X<39) l=Math.max(l,Y>bang(xb)-0.8?5:4);
    if(lnD(X+2.5,5)<0.38&&Y>11&&Y<bang(xb)-0.6) l=Math.max(l,4);
    if(X<12.4&&Y>20&&lnD(X-0.5,3)<0.38) l=Math.max(l,5);
    set(x,y,HR[l],'hair'); });
  hairShadow(g,P);
  // バンダナ（頭の上・左に結び目）
  eachF((x,y,X,Y)=>{ const bY=9.6+((X-24)/16.5)**2*5.2;
    if(Math.abs(Y-bY)<=2&&hairAt(X,Y)){ let l=Y<bY-1.1?0:Y>bY+1.1?3:X>30?2:1; if(lnD(X*0.9-Y*0.6,3.2)<0.3&&l<3) l++; set(x,y,P.band[l],'gear'); } },f64(4),f64(20));
  eachF((x,y,X,Y)=>{ if(X>12) return;
    const knot=((X-8.4)/2.2)**2+((Y-14.6)/2)**2<=1, t1=Math.abs(X-(6.2-(Y-15)*0.5))<=1.1&&Y>15&&Y<21, t2=Math.abs(X-(9.2-(Y-16)*0.15))<=0.9&&Y>16&&Y<21.5;
    if(knot) set(x,y,P.band[Y<13.8?0:X>9.2?2:Math.hypot(X-8.4,Y-14.6)<0.8?0:1],'gear'); else if(t1||t2){ const e=t1?Math.abs(X-(6.2-(Y-15)*0.5))>0.7:Math.abs(X-(9.2-(Y-16)*0.15))>0.5; set(x,y,P.band[e?3:t1?2:1],'gear'); } },f64(12),f64(22));
  return g;
}
const OL_OF={skin:'skinOL',hair:'hair',cloth:'clothOL',gear:'gearOL'};
function olCol(r){ const k=OL_OF[r]; if(!k) return FP.skinOL; return k==='hair'?FP.hair[4]:FP[k]; }
/* 目の形（0.5.2）：ノアは細めで横長・小さい瞳・太い線。イネスは大きく縦長・大きい瞳・まつげ */
const EYEB={noa:{rx:3.9,ry:2.5,ir:2.0,cy:29},ines:{rx:3.8,ry:4.3,ir:3.1,cy:28}};
/* 0.5.3：目・眉・口の描き方を人ごとの ST にまとめた。ノアとイネスは前と1ドットも変わらない */
const STY_NOA={fem:false,lash:false,eye:EYEB.noa,brow:{dy:-0.6,arc:0.25,from:-3,rows:2,inner:1},mouth:2,cheek:false,lid:0,droop:0};
const STY_INES={fem:true,lash:true,eye:EYEB.ines,brow:{dy:-3.3,arc:1.4,from:-2,rows:1,inner:1},mouth:1,cheek:true,lid:0,droop:0};
ST=STY_NOA;
/* 1.2：目・眉・口は 64 の格子に描く。cx・cy は 64 の番号。ST の大きさ（rx・ry・ir・眉の dy など）は 48 の座標のまま書いてあるので Q 倍する。
   線の太さは 1〜2 ドットのまま（顔に対して細くなるぶん、形がはっきりする） */
const p64=p=>Math.round((p+0.5)/FK-0.5);   // 48 の格子の番号 → 64 の格子の番号（ドットの中心どうし）
function eye(g,cx,cy,side,o){   // side：-1 画面の左の目、1 右の目。外側は side の向き
  const P=FP, fem=ST.fem, lash=ST.lash, B=ST.eye, Q=1/FK, set=(x,y,c)=>{ x=Math.round(x); y=Math.round(y); if(x>=0&&y>=0&&x<FN&&y<FN) g[y][x]={c,r:'face'}; };
  const X=dx=>cx+dx*side, L=P.eyeLine;   // dx>0 が外側
  const rx=B.rx*Q, D=Math.round(rx);   // D：目の半分の幅（ドット）
  if(o.closed==='happy'){ for(let dx=-D+1;dx<=D-1;dx++){ const y=cy-Math.round(3*(1-(dx/(D+0.3))**2)); set(X(dx),y,L); if(Math.abs(dx)<D-2) set(X(dx),y+1,L); } set(X(D),cy,L); set(X(-D),cy,L);   // 笑った目は「へ」の字を逆さに
    if(lash){ set(X(D+1),cy+1,L); set(X(D+2),cy+1,L); } return; }
  if(o.closed==='blink'){ for(let dx=-D+1;dx<=D-1;dx++){ const y=cy+1+Math.round(1.3*(dx/(D-0.2))**2); set(X(dx),y,L); if(Math.abs(dx)<D-1) set(X(dx),y-1,L); } set(X(D),cy+2,L);
    if(lash){ set(X(D+1),cy+2,L); set(X(D+1),cy+4,L); set(X(D-1),cy+4,L); set(X(D-3),cy+4,P.skin[3]); } return; }
  const ry=(B.ry+(o.ry?o.ry-3.4:0))*Q, top=((o.top||0)+(o.ry?0:ST.lid))*Q, slant=(o.slant||0)+ST.droop, ir=Math.max(1.75,(B.ir+(o.ir?o.ir-2.5:0))*Q), oy=0.4;   // 驚いた目でも瞳は 3 ドットより小さくしない（十字に見えないように）
  const lidY=dx=>cy-ry+top+slant*(-dx)/3.5;   // slant>0：内側が下がる（怒り）、<0：内側が上がる（悲しみ）
  const inEye=(dx,dy)=>fem?(dx/rx)**2+((dy+oy)/ry)**2<=1:Math.abs(dx/rx)**2.8+Math.abs((dy+oy)/ry)**2<=1;   // ノアたちは角ばった目
  const ex=cx+(o.ix||0)*Q*side, ey=cy+(o.iy||0)*Q;
  /* 0.83.0 目の描き直し：白目は肌になじむ白（上のふちはまぶたの影・下のふちと目頭は少し影）。
     瞳は上から暗・中・明の3段で、ふち（横と下）は1本のつながった濃い線。まぶたにかかる上の行はさらに暗く。瞳孔は縦長 */
  const vis=(dx,dy)=>inEye(dx,dy)&&cy+dy>=lidY(dx), Sc=P.eyeSc||P.eyeW, Wd=mixC(P.iris[2],P.pupil,0.45);
  for(let dy=-8;dy<=8;dy++)for(let dx=-D-1;dx<=D+1;dx++){ const x=X(dx),y=cy+dy;
    if(!vis(dx,dy)) continue;
    const topR=!vis(dx,dy-1), top2=!topR&&!vis(dx,dy-2)&&ry>3.2, botR=!vis(dx,dy+1);
    let c=topR?mixC(Sc,P.skin[3],0.6):top2?P.eyeWs:botR&&P.eyeSb?P.eyeSb:Sc;   /* まぶたのすぐ下はいちばん暗い */
    if(dx<=-D+1) c=P.eyeWs;   // 目頭は少し影
    const iv=fem&&!o.ir?Math.max(ir,ry*0.92):ir, ih=fem&&!o.ir?Math.max(ir*0.88,iv*0.8):ir*0.88;   /* 0.83.0 女の人の瞳は目の高さいっぱいに近く（白目が瞳を輪のように囲まないように） */
    const ix=dx-(o.ix||0)*Q, iy=dy-(o.iy||0)*Q, e=(ix/ih)**2+(iy/iv)**2;
    if(e<=1){ const t=(iy+iv)/(2*iv);
      c=t<0.42?P.iris[2]:t<0.78?P.iris[1]:P.iris[0];
      if(e>0.66&&t>=0.42) c=P.iris[2];   // ふち
      if(topR||(top2&&t<0.3)) c=Wd;      // まぶたの影
      if((ix/(fem?1.75:1.2))**2+((iy+(fem?0.15:0.27))/(fem?2.5:1.75))**2<=1) c=P.pupil; }
    set(x,y,c); }
  if(fem){   // 光：左上に大きく2×2、右下に小さく
    const hy=Math.round(ey-ir*0.62), hx=Math.round(ex-ir*0.5*side);
    for(const [a,b] of [[0,0],[-1,0],[0,1],[-1,1]]) if(hy+b>=lidY(a)+0.5) set(hx+a*side,hy+b,P.eyeW);
    set(Math.round(ex+ir*0.45*side),Math.round(ey+ir*0.55),P.eyeW); }
  else { const hy=Math.round(ey-ir*0.55); if(hy>=lidY(-1)+0.5){ set(ex-side,hy,P.eyeW); set(ex-2*side,hy,P.eyeW); } else set(ex-side,hy+1,P.eyeW); }   // 光は2ドット
  // まぶたの線（白目の上のふちに沿わせる）
  const topAt=dx=>cy-oy-ry*Math.sqrt(Math.max(0,fem?1-(dx/rx)**2:1-Math.abs(dx/rx)**2.8));
  const lineY=dx=>Math.ceil(Math.max(lidY(dx),topAt(dx))-0.01)-1;
  const ly0=cy+Math.floor(ry-oy)+1+(o.lowerUp||0);   // 下まぶたの行
  const Li=mixC(L,P.skin[3],0.45), Lc=mixC(P.skin[2],P.skin[3],0.65);   /* 0.83.0 目頭の側の線と、二重の線 */
  if(fem&&lash){   // 上は太く、外へはねるまつげ。下まつげは外の角に
    for(let dx=-D;dx<=D;dx++){ const y=lineY(dx); if(dx>=-D+1){ set(X(dx),y,dx<=-D+2?Li:L); if(dx>=-D+2&&dx<=D-1) set(X(dx),y-1,dx<=-D+3?Li:L); } }
    if(!o.slant||o.slant>-0.5) for(let dx=-1;dx<=D-1;dx++){ const y=lineY(dx)-3; const q=g[Math.round(y)]&&g[Math.round(y)][Math.round(X(dx))]; if(q&&q.r==='skin') set(X(dx),y,Lc); }
    const yo=lineY(D); set(X(D+1),yo,L); set(X(D+1),yo-1,L); set(X(D+2),yo-2,L); set(X(D+3),yo-3,L);
    if(!o.noLower){ const Ll=mixC(P.skin[3],L,0.3); for(let dx=-2;dx<=D-2;dx++) set(X(dx),ly0,dx>=D-3?mixC(P.skin[3],L,0.55):Ll); set(X(D-1),ly0-1,L); set(X(D),ly0-2,L); } }   /* 0.83.0 下のふちは1本の線で外の角へ濃く */
  else if(fem){   // まつげを描かない女の人（年配など）
    for(let dx=-D;dx<=D;dx++){ const y=lineY(dx); if(dx>=-D+1){ set(X(dx),y,L); if(dx>=-2&&dx<=D-2) set(X(dx),y-1,L); } }
    set(X(D+1),lineY(D)+1,L);
    if(!o.noLower){ for(let dx=-D+2;dx<=D-1;dx++) set(X(dx),ly0,P.skin[3]); } }
  else {   // 線は横にまっすぐ、外の角は下へ
    for(let dx=-D;dx<=D;dx++){ const y=lineY(dx); if(dx<=D-1){ set(X(dx),y,dx<=-D+1?Li:L); if(dx>-D) set(X(dx),y-1,dx<=-D+1?Li:L); } }
    const yo=lineY(D-1); set(X(D),yo+1,L); set(X(D),yo+2,L); set(X(D+1),yo+2,L);
    if(!o.noLower){ for(let dx=-D+1;dx<=D-1;dx++) set(X(dx),ly0,P.skin[3]); set(X(D),ly0-1,L); } }
}
function brow(g,cx,by,side,inner,outer){ const set=(x,y)=>{ if(x>=0&&y>=0&&x<FN&&y<FN) g[y][x]={c:FP.brow,r:'face'}; }, bs=ST.brow, Q=1/FK;
  // ノア：太く、低く、まっすぐ。イネス：細く、高く、弓なり（0.5.2）。0.5.3 から人ごとに ST.brow で決める
  // 1.2：64 では、太い眉は眉頭から 3 ドット・眉尻で 2 ドットに細く。細い眉は 1 ドット（眉頭だけ 2）
  const y0=by+bs.dy*Q, arc=bs.arc*Q, tilt=bs.tilt||0, from=Math.round(bs.from*Q), to=Math.round(4*Q);
  for(let dx=from;dx<=to;dx++){ const t=(dx+4)/9.3, y=Math.round(y0+(inner+tilt)*Q*(1-t)+outer*Q*t-Math.sin(t*Math.PI)*arc), x=Math.round(cx+dx*side);
    const rows=bs.rows>=2?(t<0.72?3:2):1;
    for(let r=0;r<rows;r++) set(x,y+r); if(bs.inner&&dx<=0) set(x,y+rows); if(bs.bushy&&dx>0&&dx%2===1) set(x,y-1); } }
function mouth(g,type){ const P=FP,set=(x,y,c)=>{ if(y>=0&&y<FN&&x>=0&&x<FN) g[y][x]={c,r:'face'}; };
  const cx=32,cy=48, h=ST.mouth, a=h===1?2:3, sh=skinRamp(P);   // イネスは口を小さく（h=1）
  const lip=()=>{ set(cx-1,cy+2,sh[3]); set(cx,cy+2,sh[3]); set(cx+1,cy+2,sh[4]); };   // 下くちびるの下の影
  if(type==='smile'&&ST.smile){ for(let dx=-a+1;dx<=a-1;dx++) set(cx+dx,cy+1,P.mouth); set(cx-a,cy,P.mouth); set(cx+a,cy,P.mouth); set(cx-a-1,cy-1,P.mouth); set(cx+a+1,cy-1,P.mouth); set(cx-a-1,cy-2,P.skin[3]); set(cx+a+1,cy-2,P.skin[3]); lip(); }   /* 0.56.0 19章 ゾエ ふだんから口角が上がった笑顔（口の両はしが上へそる） */
  else if(type==='smile'){ for(let dx=-a;dx<=a;dx++) set(cx+dx,cy,P.mouth); set(cx-a-1,cy-1,P.mouth); set(cx+a+1,cy-1,P.mouth); lip(); }
  else if(type==='line'){ for(let dx=-a;dx<=a;dx++) set(cx+dx,cy,P.mouth); lip(); }
  else if(type==='firm'){ for(let dx=-a;dx<=a;dx++) set(cx+dx,cy,P.mouth); set(cx-a-1,cy+1,P.mouth); set(cx+a+1,cy+1,P.skin[3]); lip(); }
  else if(type==='frown'){ for(let dx=-a+1;dx<=a-1;dx++) set(cx+dx,cy,P.mouth); set(cx-a,cy+1,P.mouth); set(cx+a,cy+1,P.mouth); set(cx-a-1,cy+2,P.skin[3]); set(cx+a+1,cy+2,P.skin[3]); }
  else if(type==='open'&&h===1){ const W=[3,3,2,1]; for(let dy=0;dy<W.length;dy++)for(let dx=-3;dx<=3;dx++){ const w=W[dy]; if(Math.abs(dx)>w) continue; set(cx+dx,cy-1+dy,(dy===0||dy===W.length-1||Math.abs(dx)===w)?P.mouth:dy===2?P.tongue:P.mouthIn); } }   // イネスは歯を見せない
  else if(type==='open'){ const W=[4,4,4,3,2]; for(let dy=0;dy<W.length;dy++)for(let dx=-4;dx<=4;dx++){ const w=W[dy]; if(Math.abs(dx)>w) continue; set(cx+dx,cy-1+dy,(dy===0||dy===W.length-1||Math.abs(dx)===w)?P.mouth:dy===1?P.teeth:dy===2?P.mouthIn:P.tongue); } set(cx-3,cy,P.mouthIn); set(cx+3,cy,P.mouthIn); }
  else if(type==='talk'){ const W=[a-1,a,a,a-1]; for(let dy=0;dy<W.length;dy++)for(let dx=-a;dx<=a;dx++){ const w=W[dy]; if(Math.abs(dx)>w) continue; set(cx+dx,cy-1+dy,(Math.abs(dx)===w||dy===0||dy===W.length-1)?P.mouth:dy===2&&Math.abs(dx)<w-1?P.tongue:P.mouthIn); } }
  else if(type==='o'){ const r=h===1?2.2:2.8; for(let dy=-3;dy<=4;dy++)for(let dx=-3;dx<=3;dx++){ const e=(dx/r)**2+((dy-0.5)/(r-0.1))**2; if(e>1) continue; set(cx+dx,cy+dy,e>0.5?P.mouth:dy>1?P.tongue:P.mouthIn); } }
  else if(type==='grit'){ const a2=a+1; for(let dx=-a2;dx<=a2;dx++){ set(cx+dx,cy-1,P.mouth); set(cx+dx,cy+2,P.mouth); const e=Math.abs(dx)===a2; set(cx+dx,cy,e?P.mouth:P.teeth); set(cx+dx,cy+1,e?P.mouth:P.teeth); }
    for(const dx of [-2,0,2]){ set(cx+dx,cy,'#d8d0d4'); set(cx+dx,cy+1,'#d8d0d4'); } }   // 歯のすきま
}
/* 頬の赤み（いつも赤い人は cx2・cy、笑うと赤くなる人は bx2・by）と涙。64 の格子 */
function faceCheek(g,E,cx2,cy,bx2,by){ const put=(x,y,c)=>{ if(g[y]&&x>=0&&x<FN) g[y][x]={c,r:'face'}; };
  if(ST.cheek){ for(const bx of cx2) for(let d=0;d<4;d++){ put(bx+d,cy,E.blush?FP.blush:FP.cheek); if(E.blush&&d<3) put(bx+d+(bx<32?1:0),cy+1,FP.cheek); } }   // いつも頬に赤み
  else if(E.blush){ for(const bx of bx2){ for(let d=0;d<4;d++) put(bx+d,by,FP.blush); for(let d=1;d<3;d++) put(bx+d,by+1,FP.cheek||FP.blush); } } }
function faceTear(g,x,y){ const put=(xx,yy,c)=>{ if(g[yy]&&xx>=0&&xx<FN) g[yy][xx]={c,r:'face'}; }; put(x,y,FP.tear); put(x,y+1,FP.tear); put(x-1,y+2,FP.tear); put(x-1,y+3,'#ffffff'); }
/* ---------- 仲間の顔グラ（0.5.3）----------
   ノアとイネスのほかの22人（設計書 §6・§12・§13）。型・肌・髪型・目・服・小物を下の DEF に書き、同じ道具で描く。
   呼び方は ART.face('kiran','smile',0,0)。表情・まばたき・口はノアとイネスと同じ。機械は話さないので顔グラなし。
   見た目は設計書に書かれていないので、役どころと性格から決めた（ヒロさんの指定があれば DEF を直す） */
function mixC(a,b,t){ const A=rgb(a),B=rgb(b); return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join(''); }
/* 1.0 顔グラの描き直し（ヒロさん「輪郭が崩れている」「色数を増やしてしっかりした顔グラに」）
   肌は8段（5色とその間の色）。0 つや・1 明るい所・2 地の色・3〜6 影・7 いちばん暗い影。
   光は、正面の顔は左上の手前から、斜めの顔は向いている側の上の手前から（左向きは左右反転なので同じ考え） */
const SRC={};
function skinRamp(P){ const k=P.skin.join(); if(SRC[k]) return SRC[k]; const s=P.skin;
  return SRC[k]=[s[0],mixC(s[0],s[1],0.5),s[1],mixC(s[1],s[2],0.5),s[2],mixC(s[2],s[3],0.5),s[3],s[4]]; }
function skK(P,c){ const R=skinRamp(P); let i=R.indexOf(c); if(i<0){ i=P.skin.indexOf(c); i=i<0?-1:[0,2,4,6,7][i]; } return i; }
function litK(lam){ return lam>0.9?1:lam>0.56?2:lam>0.38?3:lam>0.2?4:lam>0.03?5:6; }
const HRC={};
function hairRamp(P){ const k=P.hair.join(); if(HRC[k]) return HRC[k]; const h=P.hair;
  return HRC[k]=[h[0],h[1],mixC(h[1],h[2],0.5),h[2],mixC(h[2],h[3],0.5),h[3],h[4]]; }
/* 正面の顔の肌：丸い頭とあごの面の向きから明るさを決める（縦の板のような影にしない） */
function skinFront(g,P,F,hlx){ const R=skinRamp(P);
  for(let y=0;y<FN;y++)for(let x=0;x<FN;x++){ const X=(x+0.5)*FK,Y=(y+0.5)*FK; if(!F.in(X,Y)) continue; let nx,ny;
    if(Y<=27){ nx=(X-24)/(F.rx+0.6); ny=(Y-F.cy)/(F.ry+4); }
    else { const t=Math.min(1,(Y-27)/(F.bot-27)); nx=(X-24)/(F.jaw(Y)+1.3+(1-t)*0.5); ny=(27-F.cy)/(F.ry+4)+Math.pow(t,1.6)*0.82; }
    nx=Math.max(-0.97,Math.min(0.97,nx)); const nz=Math.sqrt(Math.max(0.03,1-nx*nx-ny*ny));
    let k=litK(-0.4*nx-0.36*ny+0.84*nz); if((X-hlx)**2+(Y-30.6)**2<2.2&&k<=2) k=0;
    g[y][x]={c:R[k],r:'skin',k}; } }
/* 耳（正面）：s=-1 光の側（画面の左）、1 影の側 */
function earFront(g,P,ex,s,a,b,cy){ const R=skinRamp(P);
  eachF((x,y,X,Y)=>{ const e=((X-ex)/a)**2+((Y-cy)/b)**2; if(e>1) return; let k=s<0?3:5;
    if(s*(X-ex)<-0.3) k++; if(Y>cy+b*0.5) k++;
    if(e<0.42&&s*(X-ex)>-0.5&&Y<cy+b*0.45) k++;   // 耳のくぼみ
    if(e<0.42&&s*(X-ex)>-0.5&&Y>cy-b*0.15&&Y<cy+b*0.3&&s*(X-ex)<0.3) k++;   // くぼみの奥（耳の穴のまわり）
    if(e>0.62&&s*(X-ex)>0.2&&Y<cy+b*0.2) k=Math.max(s<0?2:4,k-1);   // 耳のふちは明るく
    k=Math.min(7,k); g[y][x]={c:R[k],r:'skin',k}; },Math.max(0,f64(cy-b-1)),Math.min(FN,f64(cy+b+1)+1)); }
/* 髪の落とす影：髪のすぐ下の肌は2段、その下の2行は1段暗く（1.2：64 では影の帯を3行に） */
function hairShadow(g,P){ const R=skinRamp(P);
  for(let y=FN-1;y>=1;y--)for(let x=0;x<FN;x++){ const p=g[y][x]; if(!p||p.r!=='skin') continue; const a=g[y-1][x],b=y>1?g[y-2][x]:null,c=y>2?g[y-3][x]:null;
    const add=(a&&a.r==='hair')?2:(b&&b.r==='hair')||(c&&c.r==='hair')?1:0; if(!add) continue; const k0=skK(P,p.c); if(k0<0) continue;
    const k=Math.min(7,Math.max(add===2?4:3,k0+add)); g[y][x]={c:R[k],r:'skin',k}; } }
/* 仕上げ：1ドットのはみ出しを消し、穴をうめ、肌と髪の境の段差をならし、顔の横の髪との境に細い線を引く */
function polish(g,P){ const N=FN, at=(x,y)=>(x>=0&&y>=0&&x<N&&y<N)?g[y][x]:null, SOFT={skin:1,hair:1,cloth:1}, DG=[[-1,-1],[1,-1],[-1,1],[1,1]];
  for(let pass=0;pass<2;pass++){ const del=[];
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){ const p=g[y][x]; if(!p||!SOFT[p.r]) continue; let n4=0,n8=0;
      for(const [dx,dy] of D4) if(at(x+dx,y+dy)) n4++; for(const [dx,dy] of DG) if(at(x+dx,y+dy)) n8++;
      if(n4<=1&&n4+n8<=2&&y<59) del.push([x,y]); }
    for(const [x,y] of del) g[y][x]=null; }
  const fill=[];
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){ if(g[y][x]) continue; const nb=D4.map(([dx,dy])=>at(x+dx,y+dy)).filter(Boolean); if(nb.length<3) continue;
    const cnt={}; for(const q of nb) cnt[q.r]=(cnt[q.r]||0)+1; const best=nb.reduce((a,q)=>cnt[q.r]>cnt[a.r]?q:a,nb[0]); fill.push([x,y,best]); }
  for(const [x,y,q] of fill) g[y][x]={c:q.c,r:q.r,k:q.k};
  for(let pass=0;pass<2;pass++){ const ch=[];
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){ const p=g[y][x]; if(!p||(p.r!=='skin'&&p.r!=='hair')) continue; const o=p.r==='skin'?'hair':'skin'; let n=0,q=null;
      for(const [dx,dy] of D4){ const t=at(x+dx,y+dy); if(t&&t.r===o){ n++; if(!q) q=t; } } if(n>=3) ch.push([x,y,q]); }
    for(const [x,y,q] of ch) g[y][x]={c:q.c,r:q.r,k:q.k}; }
  const R=skinRamp(P), line=mixC(R[6],P.skinOL,0.3), L=[];
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){ const p=g[y][x]; if(!p||p.r!=='skin') continue; const l=at(x-1,y),r=at(x+1,y);
    if((l&&l.r==='hair')||(r&&r.r==='hair')) L.push([x,y]); }
  for(const [x,y] of L) g[y][x]={c:line,r:'skin',k:7}; }
const SKIN={
  fair: {skin:['#fff4ec','#fbdcc8','#efbca2','#d4947e','#a8685a'],skinOL:'#4a2420',blush:'#f8989a',cheek:'#fbc0b4',mouth:'#a83a44',mouthIn:'#cc5058'},
  light:{skin:['#fff2e4','#fcd6b0','#eeb488','#d08c66','#a86448'],skinOL:'#4a2418',blush:'#f8a090',cheek:'#f8bca8',mouth:'#9a3038',mouthIn:'#c44a52'},
  olive:{skin:['#fcefd8','#efcc9e','#d8a676','#b47e54','#84573a'],skinOL:'#42220f',blush:'#ec9478',cheek:'#f2b494',mouth:'#8a3026',mouthIn:'#b8463c'},
  tan:  {skin:['#f8dcb4','#e6b47c','#c88c56','#a06a3e','#704828'],skinOL:'#38200e',blush:'#e0806a',cheek:'#eca084',mouth:'#7a2a22',mouthIn:'#a84034'},
  brown:{skin:['#ecbc8c','#cc8e5c','#a8683c','#804a28','#583018'],skinOL:'#2a140a',blush:'#c86450',cheek:'#d47e60',mouth:'#5e2018',mouthIn:'#94382c'},
  deep: {skin:['#c48e66','#94603e','#744428','#56301a','#3a1e10'],skinOL:'#1c0c06',blush:'#a8483c',cheek:'#a45640',mouth:'#3e140e',mouthIn:'#7e2c26',eyeW:'#f8f0e8',eyeWs:'#cdbcb2'}};
const HC={
  blackw:['#9a8a80','#4e4440','#342c2c','#221c1e','#120e10'], black:['#8a90a8','#4a4e64','#2e3044','#1e1e2e','#100e18'],
  blackb:['#88a0d0','#44507e','#2c3458','#1c203a','#0e1022'], night:['#b0a0e0','#5c4e94','#3a3264','#241e42','#120e22'],
  dark:['#a07860','#6a4632','#4a2e22','#321c16','#1c0e0c'], dark2:['#8e6c5a','#523628','#38241c','#241614','#140a0a'],
  chest:['#e0a478','#a8683e','#7c4628','#542c1a','#32180e'], copper:['#f8bc84','#d8884c','#a85e30','#743e1e','#462410'],
  auburn:['#ffac80','#dc6440','#a8402a','#74281e','#481414'], blonde:['#fff6c8','#f6dc88','#d6b25a','#a8843a','#6c5222'],
  ash:['#f4e4bc','#d4bc8c','#ac9064','#7c6446','#4e3c2a'], gray:['#ffffff','#d6d8e0','#a6aab8','#707686','#42464f'],
  silver:['#ffffff','#e8e4f8','#c0b8e0','#8c84b4','#58507e'], zoe:['#8a5c44','#6a4430','#4a2c1c','#321c10','#1c0e08'],
  flax:['#fff8dc','#f0e0a8','#d8c488','#b0a066','#78683c'],
  berta:['#c8704a','#8a3a22','#64281a','#44180e','#260c06'],
  yasmin:['#b87a52','#8a5232','#6a3a22','#4a2616','#2a140c']};   /* 0.62.0 28章 ヤスミン 赤茶 #6a3a22 */   /* 0.61.0 25章 ベルタ 赤茶 */
const IR={ brown:['#d8a070','#8a5430','#44241a'], amber:['#ffd890','#e0963c','#94501c'], amber2:['#f0b868','#b06a2a','#5a2c10'], dark:['#9a8a86','#4e3c38','#241818'],
  blue:['#b8e2ff','#4e92da','#244c8c'], green:['#c8ee9c','#5ea04a','#2c5a2a'], hazel:['#e0c878','#94803c','#4c401e'], gray:['#d8e0ea','#7e8c9e','#3e4a5c'], gold:['#fff4a8','#ecbc30','#906414']};
/* 型：m 男・f 女・kid 子ども・big 大柄・oldm 年配の男・oldf 年配の女 */
const HEAD={
  m:   {rx:13.2,ry:13.8,cy:25,  jaw:y=>12.9-7.4*Math.pow(Math.max(0,y-27)/13.5,2.3),bot:40.5,neck:5.0,sh:12,  sk:2.6,cap:[17.4,16.8,21.2],ear:[2.4,3.6],nose:2},
  f:   {rx:12.2,ry:13.4,cy:25.4,jaw:y=>11.8-9.4*Math.pow(Math.max(0,y-27)/13,1.6),  bot:40,  neck:3.9,sh:10,  sk:2.3,cap:[16.8,16.4,21.5],ear:[2.1,3.2],nose:1},
  kid: {rx:12.6,ry:13.2,cy:25.6,jaw:y=>12.3-8.4*Math.pow(Math.max(0,y-27)/12.5,1.8),bot:39.5,neck:3.6,sh:9.4, sk:2.2,cap:[17,16.6,21.6], ear:[2.2,3.2],nose:1},
  big: {rx:14.3,ry:14,  cy:25,  jaw:y=>14.1-6.6*Math.pow(Math.max(0,y-27)/14,2.6),  bot:41,  neck:6.6,sh:14.5,sk:3.0,cap:[18.4,17,21.2], ear:[2.5,3.7],nose:3},
  oldm:{rx:13,  ry:13.8,cy:25,  jaw:y=>12.6-7.6*Math.pow(Math.max(0,y-27)/13.5,1.9),bot:40.5,neck:4.8,sh:11.6,sk:2.6,cap:[17.2,16.8,21.2],ear:[2.6,3.8],nose:2},
  oldf:{rx:12.6,ry:13.4,cy:25.4,jaw:y=>12.2-8.8*Math.pow(Math.max(0,y-27)/13,1.7),  bot:40,  neck:4.0,sh:10.4,sk:2.3,cap:[17,16.4,21.6], ear:[2.2,3.4],nose:2}};
const inCapE=(X,Y,C)=>((X-24)/C[0])**2+((Y-C[2])/C[1])**2<=1;
const jg=(x,a)=>{ const n=a.length, i=Math.floor(x), t=x-i, A=a[((i%n)+n)%n]; return t?A+(a[(((i+1)%n)+n)%n]-A)*t:A; };   // 1.2：x は連続な値でもよい（間は直線でつなぐ＝毛先がとがる）
/* 髪型：front は顔より前に描く髪、back は顔と服の後ろに描く髪、bang は前髪の下の端。
   1.2：front(X,Y,x) と bang(x) の x は 48 の座標の連続な値（X-0.5）。lv(X,Y,x,y,l) の x・y は 64 の格子の番号 */
const HAIR={
  spiky:(S,H)=>{ const C=H.cap, bang=x=>18.4+Math.abs(jg(x+1,[0,1,2,3,4])-2)*1.3+(x>30?0.4:0);
    return {C,bang,front:(X,Y,x)=>(Y<=bang(x)&&inCapE(X,Y,C))||(Y>14&&Y<=30.5&&((X<11.6-(Y-20)*0.1&&X>6.8+(Y-18)*0.2)||(X>36.4+(Y-20)*0.1&&X<41.2-(Y-18)*0.2)))
      ||(!S.hat&&Y<7.6&&Y>0.4&&Math.abs(X-(25.6+(7.6-Y)*1.1-(Y<2.6?(2.6-Y)*1.6:0)))<(Y-0.4)*0.36)}; },   // はね毛は1本（帽子のときはなし）
  neat:(S,H)=>{ const C=H.cap, p=S.part||19, bang=x=>Math.min(21.2,(x<p?14.8+(p-x)*0.42:14.8+(x-p)*0.42)+jg(x,[0.7,0,-0.3,0.3]));
    return {C,bang,front:(X,Y,x)=>(Y<=bang(x)&&inCapE(X,Y,C))||(Y>14&&Y<=27&&((X<11.8&&X>6.8+(Y-16)*0.3)||(X>36.2&&X<41.2-(Y-16)*0.3)))}; },
  soft:(S,H)=>{ const C=[H.cap[0]+0.4,H.cap[1]+0.4,H.cap[2]], bang=x=>17.6+(x-12)*0.15+Math.sin(x*0.9)*0.9;
    const rr=(X,Y)=>Math.hypot((X-24)/C[0],(Y-C[2])/C[1])<=1+0.035*Math.sin(Math.atan2(Y-C[2],X-24)*10);
    return {C,bang,front:(X,Y,x)=>(Y<=bang(x)&&rr(X,Y))||(Y>14&&Y<=31&&((X<12.2+Math.sin(Y*0.7)*0.4&&X>6.4+(Y-16)*0.18)||(X>35.8-Math.sin(Y*0.7)*0.4&&X<41.6-(Y-16)*0.18)))}; },
  crop:(S,H)=>{ const C=[H.rx+2.2,H.ry+1.8,H.cy-1.4], hl=X=>13.2+((X-24)/11.5)**2*4.4, kn=S.knot?[24,5.2,4.2]:null;
    return {C,tex:S.tight?2:0,comb:!S.tight,bun:kn,front:(X,Y)=>(inCapE(X,Y,C)&&(Y<=hl(X)||(Math.abs(X-24)>H.rx-1.4&&Y<=27.5)))||(!!kn&&Math.hypot(X-kn[0],Y-kn[1])<=kn[2])}; },
  curly:(S,H)=>{ const k=S.vol||0, B2=[H.cap[0]+0.8+k*3.6,H.cap[1]+0.6+k*2.6,H.cap[2]+k*1.2], C=H.cap;
    const rr=(X,Y,c)=>{ const a=Math.atan2(Y-c[2],X-24); return Math.hypot((X-24)/c[0],(Y-c[2])/c[1])<=1+0.07*Math.sin(a*11)+0.03*Math.sin(a*17+1); };
    const bang=x=>17.2+Math.abs(Math.sin(x*0.8))*1.8+(x>28?0.5:0);
    return {C,curly:true,bang,back:k>0?(X,Y)=>rr(X,Y,B2)&&Y<B2[2]+B2[1]*0.9:null,
      front:(X,Y,x)=>(Y<=bang(x)&&rr(X,Y,C))||(k===0&&Y>14&&Y<=27&&((X<11.8&&X>6.6+(Y-14)*0.25)||(X>36.2&&X<41.4-(Y-14)*0.25)))}; },
  long:(S,H)=>{ const C=H.cap, t=S.bang||'side', wv=S.wavy?1.1:0, cut=S.cut||46.5;
    const bang=t==='blunt'?x=>(S.bangY||20.4)+jg(x,[0,0.7,0.2,-0.3]):t==='center'?x=>12.8+Math.pow(Math.abs(x+0.5-24),1.3)*0.36+jg(x,[0.4,-0.2,0]):x=>16.2+(x<24?(24-x)*0.3:(x-24)*-0.05)+jg(x+2,[1.6,0.4,-0.6,-0.6,0.4]);
    const w=Y=>wv*Math.sin(Y*0.55);
    const lk=(X,Y)=>Y>14&&Y<=cut&&((X>6.4+w(Y)-(Y>30?(Y-30)*0.12:0)&&X<12.8+w(Y)-(Y>34?(Y-34)*0.3:0))||(!S.tuck&&X<41.6+w(Y)+(Y>30?(Y-30)*0.12:0)&&X>35.2+w(Y)+(Y>34?(Y-34)*0.3:0)));
    return {C,bang,back:(X,Y)=>Y>12&&Y<=47.5&&Math.abs(X-24-w(Y)*0.6)<=16.2+(Y-20)*0.12&&(Y>21||inCapE(X,Y,C)),front:(X,Y,x)=>(Y<=bang(x)&&inCapE(X,Y,C))||lk(X,Y)}; },
  bob:(S,H)=>{ const C=H.cap, bang=x=>17.6+(x<20?(20-x)*0.1:(x-20)*0.14)+jg(x,[1.2,0.2,-0.5,0.3]);
    const sd=(X,Y)=>Y>14&&Y<=37&&((X>6.6+(Y>31?(Y-31)*0.6:0)&&X<12.8)||(X<41.4-(Y>31?(Y-31)*0.6:0)&&X>35.2));
    return {C,bang,back:(X,Y)=>Y>12&&Y<=36.5&&Math.abs(X-24)<=16.8-(Y>31?(Y-31)*0.5:0)&&(Y>21||inCapE(X,Y,C)),front:(X,Y,x)=>(Y<=bang(x)&&inCapE(X,Y,C))||sd(X,Y)}; },
  bun:(S,H)=>{ const C=H.cap, hl=X=>13.8+((X-24)/12.6)**2*5.6, b=S.bun||[24,4.6,5];
    return {C,bun:b,comb:true,front:(X,Y)=>(inCapE(X,Y,C)&&(Y<=hl(X)||(Math.abs(X-24)>H.rx-1.2&&Y<=26)||(!!S.sweep&&X<24.5&&Y<=19.6-(X-11.5)*0.42)))||Math.hypot(X-b[0],Y-b[1])<=b[2]
      ||(!!S.locks&&Y>16&&Y<=33&&((X>9.4&&X<12.6-(Y>27?(Y-27)*0.4:0))||(X<38.6&&X>35.4+(Y>27?(Y-27)*0.4:0))))}; },
  braid2:(S,H)=>{ const C=H.cap, bang=x=>(S.bangY||18.8)+jg(x,[0.6,0,-0.4,0.2])-(Math.abs(x+0.5-24)<1.2?1.6:0);
    const bc=(Y,s)=>24+s*(14.4-(Y-30)*0.08), br=(X,Y,s)=>Y>27&&Y<=45.6&&Math.abs(X-bc(Y,s))<=2-(Y>42.5?(Y-42.5)*0.25:0);
    return {C,bang,front:(X,Y,x)=>(Y<=bang(x)&&inCapE(X,Y,C))||(Y>14&&Y<=30&&((X<12.2&&X>6.8+(Y-14)*0.18)||(X>35.8&&X<41.2-(Y-14)*0.18)))||br(X,Y,-1)||br(X,Y,1),
      lv:(X,Y,x,y,l)=>{ if(Y<=29.5) return l; const s=X<24?-1:1, d=X-bc(Y,s), u=((Y+Math.abs(d)*0.9+(s>0?1:0))%3+3)%3; return u<1?4:d<0?2:3; },
      ties:[[bc(42.5,-1),42.5],[bc(42.5,1),42.5]]}; },
  braid1:(S,H)=>{ const C=H.cap, bang=x=>15.8+(x<26?(26-x)*0.32:(x-26)*0.05)+jg(x+1,[1.4,0.3,-0.5,-0.2,0.5]);
    const bx=Y=>37-(Y-25)*0.2, br=(X,Y)=>Y>23&&Y<=47.5&&Math.abs(X-bx(Y))<=2.7-(Y>44?(Y-44)*0.3:0);
    return {C,bang,front:(X,Y,x)=>(Y<=bang(x)&&inCapE(X,Y,C))||(Y>14&&Y<=29&&X<11.8&&X>6.8+(Y-14)*0.2)||(Y>14&&Y<=25&&X>36.2&&X<41.2)||br(X,Y),
      lv:(X,Y,x,y,l)=>{ if(Y<=24||!br(X,Y)) return l; const d=X-bx(Y), u=((Y+Math.abs(d)*0.9)%3+3)%3; return u<1?4:d<0?2:3; }, ties:[[bx(44),44]]}; },
  braidC:(S,H)=>{ const C=H.cap, bang=x=>12.8+Math.pow(Math.abs(x+0.5-24),1.3)*0.36+jg(x,[0.4,-0.2,0]);   /* 0.61.0 ソルヴェイ 真ん中わけ・前へ垂らす太めの三つ編み */
    const bx=Y=>34-(Y-25)*0.15, br=(X,Y)=>Y>23&&Y<=47.5&&Math.abs(X-bx(Y))<=3-(Y>44?(Y-44)*0.3:0);
    return {C,bang,front:(X,Y,x)=>(Y<=bang(x)&&inCapE(X,Y,C))||(Y>14&&Y<=29&&X<11.8&&X>6.8+(Y-14)*0.2)||(Y>14&&Y<=25&&X>36.2&&X<41.2)||br(X,Y),
      lv:(X,Y,x,y,l)=>{ if(Y<=24||!br(X,Y)) return l; const d=X-bx(Y), u=((Y+Math.abs(d)*0.9)%3+3)%3; return u<1?4:d<0?2:3; }, ties:[[bx(44),44]]}; },
  bald:(S,H)=>{ const C=[H.rx+1.2,H.ry+1.6,H.cy-1.8], E=[C[0]+2.2,C[1]+1.2,C[2]+0.6];
    return {C,skull:(X,Y)=>inCapE(X,Y,C)&&Y<27,front:(X,Y)=>Y>17.5&&Y<=27.5&&inCapE(X,Y,E)&&(X<12.2||X>35.8)&&!(Y<20.5&&Math.abs(X-24)<13)}; },
  messy:(S,H)=>{ const C=H.cap, bang=x=>{ const b=18.4+jg(x,[1.4,0,0.8,-0.4]); return x>=27&&x<=37?Math.max(b,b+9.8-Math.abs(x-32.5)*1.6):b; };
    return {C,bang,back:(X,Y)=>Y>18&&Y<=38&&Math.abs(X-24)<=15.4&&(Y>21||inCapE(X,Y,C)),
      front:(X,Y,x)=>(Y<=bang(x)&&inCapE(X,Y,C))||(Y>14&&Y<=34&&((X<12.2&&X>6.6+(Y-14)*0.16)||(X>35.8&&X<41.4-(Y-14)*0.16)))}; },
  pony:(S,H)=>{ const C=H.cap, bang=x=>16.4+(x>22?(x-22)*0.16:0)+jg(x+3,[1.4,0.2,-0.6,0.2,0.6]);
    const tc=Y=>11-6*Math.sin(Math.min(1,Math.max(0,(Y-3)/36))*Math.PI*0.62), tw=Y=>Y<7?2.4+(Y-3)*0.55:Math.max(0.6,4.6-Math.pow(Math.max(0,Y-9)/31,1.3)*4);
    return {C,bang,tie:[11.4,6.2],back:(X,Y)=>Y>2.6&&Y<=42&&Math.abs(X-tc(Y))<=tw(Y),
      front:(X,Y,x)=>(Y<=bang(x)&&inCapE(X,Y,C))||(Y>15&&Y<=34&&((X>8.8&&X<11.8-(Y>30?(Y-30)*0.5:0))||(X<39.2&&X>36.2+(Y>30?(Y-30)*0.5:0))))}; },
  tail:(S,H)=>{ const C=H.cap, bang=x=>Math.min(23,14.6+Math.pow(Math.abs(x+0.5-26),1.25)*0.42+jg(x,[0.6,-0.2,0.2]));
    const tx=Y=>12.6-(Y-30)*0.22, tl=(X,Y)=>Y>29&&Y<=47.6&&Math.abs(X-tx(Y))<=2.3+Math.sin(Math.min(1,(Y-29)/18)*Math.PI)*1.1;
    return {C,bang,tie:[tx(31.5),31.5],back:(X,Y)=>Y>14&&Y<=33&&Math.abs(X-24)<=15.8&&(Y>21||inCapE(X,Y,C)),
      front:(X,Y,x)=>(Y<=bang(x)&&inCapE(X,Y,C))||(Y>14&&Y<=31&&((X<12.6&&X>6.8+(Y-14)*0.12)||(X>35.4&&X<41.2-(Y-14)*0.14)))||tl(X,Y),
      lv:(X,Y,x,y,l)=>Y>31&&tl(X,Y)?((X<tx(Y)-0.6?1:X<tx(Y)+1?2:3)+(x%3===0?1:0)):l}; }};
function stamp(g,x0,y0,rows,map,reg){ rows.forEach((r,j)=>{ for(let i=0;i<r.length;i++){ const c=map[r[i]]; if(!c) continue; const x=x0+i,y=y0+j; if(x>=0&&y>=0&&x<FN&&y<FN) g[y][x]={c,r:reg||'gear'}; } }); }   // 1.2：x0・y0 は 64 の格子の番号
/* 顔の肌に乗る点（64 の格子）：そばかす・ほうれい線・はげ頭のおでこのしわ */
const FRECKLE64=[[19,43],[22,44],[24,43],[20,45],[17,45],[44,43],[42,44],[40,43],[43,45],[46,45]];
const OLDLINE64=[[27,45],[26,46],[26,47],[27,48],[37,45],[38,46],[38,47],[37,48]];
function skullLines64(set,c){ for(const [y,x0,x1] of [[22,25,39],[25,27,37]]) for(let x=x0;x<=x1;x++) if(x!==31&&x!==32) set(x,y+(Math.abs(x-31.5)>5?1:0),c); }
const CURL=['.LL.','L...','...D','.DD.'];   // 巻き毛は小さな「C」の形をならべる
function curlF(x,y,l,n,mx){ if(n===2) return (x%2===0&&y%2===0)?Math.max(0,l-1):l; const o=(Math.floor(y/4)%2)*2, c=CURL[y%4][(x+o)%4]; return c==='L'?Math.max(0,l-1):c==='D'?Math.min(mx||4,l+1):l; }
const strandF=(X,Y)=>lnD(X-0.5+Math.floor(Y/7),4)<0.38;   // まっすぐな髪の毛すじ（64 の1ドットの太さ）
const H75=[0,1,1,2,2,3,4], H57=[0,1,3,5,6];   // 髪の段：7段（hairRamp）→ 5段（P.hair）と、その逆
function faceBaseGen(S){
  const N=FN,P=FP,H=HEAD[S.base],g=gridF();
  const set=(x,y,col,reg)=>{ if(x>=0&&y>=0&&x<N&&y<N) g[y][x]={c:col,r:reg}; }, each=eachF;
  const jaw=H.jaw; JAW={f:jaw,bot:H.bot};
  const inFace=(X,Y)=>{ if(Y<=27) return ((X-24)/H.rx)**2+((Y-H.cy)/H.ry)**2<=1; if(Y<=H.bot) return Math.abs(X-24)<=jaw(Y); return false; };
  const HS=HAIR[S.hs](S,H), C=HS.C||H.cap;
  const HRf=hairRamp(P), curl=(x,y,l,n)=>curlF(x,y,l,n,6);
  // 後ろ髪（1.2：7段の髪の色で、奥ほど暗く）
  if(HS.back) each((x,y,X,Y)=>{ if(!HS.back(X,Y)) return; let l=X<24?4:5; if(Math.abs(X-24)>14.5) l++; if(HS.curly) l=curl(x,y,l,4); else if(strandF(X+1,Y)) l++; set(x,y,HRf[Math.min(6,l)],'hair'); });
  clothGen(g,S,H,P);
  // 耳
  for(const s of [-1,1]) earFront(g,P,24+s*(H.rx+0.1),s,H.ear[0],H.ear[1],28);
  const R=skinRamp(P);
  // はげ頭（1.0：丸い頭の向きで明るさを決める）
  if(HS.skull) each((x,y,X,Y)=>{ if(!HS.skull(X,Y)) return; const nx=Math.max(-0.97,Math.min(0.97,(X-24)/(C[0]+0.4))), ny=(Y-C[2])/(C[1]+0.6), nz=Math.sqrt(Math.max(0.03,1-nx*nx-ny*ny));
    let k=litK(-0.42*nx-0.5*ny+0.76*nz); if(Math.hypot(X-19.5,Y-12.5)<2.4) k=0; else if(Math.hypot(X-19.5,Y-12.5)<4.2&&k>1) k=1; g[y][x]={c:R[k],r:'skin',k}; });
  // 顔（1.0：面の向きで明るさを決める）
  skinFront(g,P,{in:inFace,rx:H.rx,ry:H.ry,cy:H.cy,jaw,bot:H.bot},16.2);
  // 鼻
  noseFront(g,P,H.nose);
  // そばかす・しわ・ひげ
  if(S.freckle) for(const [x,y] of FRECKLE64) set(x,y,P.skin[3],'skin');
  if(S.old) for(const [x,y] of OLDLINE64) set(x,y,mixC(P.skin[2],P.skin[3],0.5),'skin');
  if(HS.skull) skullLines64((x,y,c)=>set(x,y,c,'skin'),P.skin[2]);
  if(S.stub) each((x,y,X,Y)=>{ if(!inFace(X,Y)||Y<34.2) return; const ax=Math.abs(X-24),j=jaw(Math.max(27,Y)); if(!(ax>=j-4.4||Y>=38.2||(Y<=35.2&&ax<=3.4))) return; const p=g[y][x]; if(p&&p.r==='skin') set(x,y,mixC(p.c,P.hair[2],hash(x,y,7)>0.5?0.26:0.18),'skin'); });
  if(S.beard==='goatee') each((x,y,X,Y)=>{ if(Y>=37.8&&Y<=H.bot+0.6&&Math.abs(X-24)<=2.6-(Y>40?(Y-40)*1.5:0)) set(x,y,HRf[X<23.2?3:X<24.8?4:5],'hair'); });
  if(S.beard==='jaw') each((x,y,X,Y)=>{ if(Y<29||Y>H.bot+0.8) return; const ax=Math.abs(X-24),j=jaw(Math.max(27,Math.min(Y,H.bot)));
    if((ax<=j&&ax>=j-1.8)||(Y>=38.4&&ax<=j+0.3)||(Y>=33.9&&Y<=34.9&&ax<=3.4&&ax>=0.6)) set(x,y,HRf[(X<24?3:5)+(hash(x,y,5)>0.72?1:0)],'hair'); });
  // 前髪
  const ring0=C[0]*0.64, cov=(S.post||[]).includes('cover');
  each((x,y,X,Y)=>{ const xb=X-0.5; if(!HS.front(X,Y,xb)) return; let l;   // l：7段（0 つや〜6 いちばん暗い）
    if(Y>C[2]+2&&Math.abs(X-24)>H.rx-3){ l=X<24?3:5; if(strandF(X,Y)) l++; else if(strandF(X-0.75,Y)&&l>1) l--; }   // 下へ流れる房
    else { const nx=(X-24)/18,ny=(Y-(C[2]-4))/18,nz=Math.sqrt(Math.max(0.05,1-nx*nx-ny*ny)),v=-nx*0.55-ny*0.62+nz*0.5;
      l=v>0.86?1:v>0.62?2:v>0.42?3:v>0.24?4:v>0.1?5:6;   // 1.0：間の色も使う（7段）
      const ring=Math.hypot(X-22,Y-(C[2]-1.5))-ring0, onR=X<31&&Y<C[2]-4;
      if(!HS.curly&&!HS.tex){ if(Math.abs(ring)<0.8&&onR&&(Math.floor(X/2.6)%2===0)) l=0; else if(Math.abs(ring)<1.8&&onR&&l>2) l=Math.max(1,l-2); }
      else if(Math.abs(ring)<2&&onR&&l>2) l=Math.max(1,l-2);
      if(HS.bang&&Y>HS.bang(xb)-1.5&&Y<27&&X>9&&X<39) l=Math.max(l,Y>HS.bang(xb)-0.8?5:4);
      if(!HS.curly&&!HS.tex&&HS.bang&&Y>11&&Y<HS.bang(xb)-0.6){ if(lnD(X+2.5,5)<0.38) l=Math.max(l,4); else if(lnD(X+1.75,5)<0.38&&l>1) l--; }   // 毛すじと、その横の光
      if(HS.comb&&l<=3&&l>0&&Math.floor((X-24)*14/(Y+4)+100)%3===0) l+=2; }   // なでつけた髪の筋
    if(HS.curly) l=curl(x,y,l,4); else if(HS.tex) l=curl(x,y,l,HS.tex);
    if(HS.lv){ const l5=H75[l], l2=HS.lv(X,Y,x,y,l5); if(l2!==l5) l=H57[Math.max(0,Math.min(4,l2))]; }   // 三つ編みなどの模様（5段で書いてある）
    set(x,y,HRf[Math.min(6,l)],'hair');
    if(cov&&Y>=21&&X>25&&X<37&&inFace(X,Y)) COVER.push([x,y,g[y][x]]); });
  // 髪の落とす影（おでこ）
  hairShadow(g,P);
  hatGen(g,S,H,HS,P);
  return g;
}
/* 服：首まわりの形（neck）と、前かけ・肩かけ・首飾りなど */
function clothGen(g,S,H,P){
  const set=(x,y,c,r)=>{ if(x>=0&&y>=0&&x<FN&&y<FN) g[y][x]={c,r:r||'cloth'}; }, each=f=>eachF(f,f64(33));
  const D=S.cl,B=D.b,K=D.col||B,nk=H.neck,nt=D.neck||'round', ss=1/H.sk;
  // 1.2：肩の上の線。首のつけ根からゆるく下がり、腕のつけ根で丸く下へ（前はまっすぐな台形で、箱のように見えた）
  const topY=ax=>{ const a=ax-(H.sh-4); let y=39.8; if(a>0) y+=a<8?ss*a*a/16:ss*(a-4); const b=ax-(H.sh+7); if(b>0) y+=b*b*0.05; return y; };
  const WC={}, hw=Y=>{ const k=Math.round(Y*64); if(WC[k]!=null) return WC[k]; if(Y<topY(0)) return WC[k]=0; let lo=0,hi=40; for(let i=0;i<22;i++){ const m=(lo+hi)/2; if(topY(m)<=Y) lo=m; else hi=m; } return WC[k]=lo; };
  each((x,y,X,Y)=>{ if(Y<40) return; const w=hw(Y),ax=Math.abs(X-24); if(ax>w) return;
    const d=Y-topY(ax), R=X>24+w*0.42;
    let l=R?2:1;
    if(d<1&&ax>nk+1.8) l=R?2:X<24?0:1;   // 肩の上は光を受ける
    if(Y<43&&X<24-w*0.3&&ax<w-1.2) l=0;
    if(ax>w-1.2) l=3;   // 腕のつけ根
    if(Y<41&&ax<nk+2.4&&l<3) l++;   // えりもとの影
    const cr=ax-(nk+1.6)-(Y-41.2)*1.25; if(Y>41.6&&Math.abs(cr)<0.42&&ax<w-1.6) l=Math.min(3,l+1);   // 胸から腕へのしわ
    else if(Y>41.6&&Math.abs(cr+0.75)<0.42&&ax<w-1.6&&!R&&l>0) l--;   // しわの横の光
    set(x,y,D.stripe&&y%5>=3&&ax<w-1.2?D.stripe[R?1:0]:B[l]); });
  if(nt==='hood') each((x,y,X,Y)=>{ if(Y<36.4||Y>44.6) return; const ax=Math.abs(X-24),w=nk+4.8-(Y<39.5?(39.5-Y)*1.2:0); if(ax>w) return; set(x,y,ax<nk+1.6?K[3]:ax>w-0.75?K[3]:Y<38.6+ (ax-nk)*0.1&&X<24?K[0]:K[X<24?1:2]); });
  if(D.towel) each((x,y,X,Y)=>{ if(Y<37.6||Y>41.2) return; if(Math.abs(X-24)<=nk+2.4) set(x,y,D.towel[X<24?0:1]); });
  // 首
  each((x,y,X,Y)=>{ if(Y<35||Y>43) return; const ax=Math.abs(X-24); if(ax>nk) return; if(Y>=40&&ax>nk+0.4-(Y-40)*0.95) return; set(x,y,P.skin[X>24+nk*0.45?4:Y<39?3:2],'skin'); });
  if(nt==='v') each((x,y,X,Y)=>{ if(Y<40||Y>47) return; const ax=Math.abs(X-24),v=nk-0.4-(Y-40.5)*0.75; if(ax<=v) set(x,y,P.skin[Y<42?3:2],'skin'); else if(ax<=v+2.4&&Y<45) set(x,y,K[ax>v+1.7?(X<24?1:3):X<24?0:2]); });
  if(nt==='round'){ const T=D.trim||(D.in?D.in[0]:B[0]), T2=mixC(T,'#000000',0.2); each((x,y,X,Y)=>{ if(Y<40||Y>44) return; const ax=Math.abs(X-24),u=nk+0.4-(Y-40)*0.95; if(ax>u&&ax<=u+1.4) set(x,y,X>25&&Y>42?T2:ax>u+0.9?T2:T); }); }
  if(nt==='high') each((x,y,X,Y)=>{ if(Y<37.2||Y>41.8) return; const ax=Math.abs(X-24); if(ax>nk+1.4+(Y>40?(Y-40)*1.4:0)) return; set(x,y,Y<38.3?K[0]:K[X<23?1:X>24+nk*0.5?3:2]); });
  if(nt==='roll') each((x,y,X,Y)=>{ if(Y<37.2||Y>42.6) return; const ax=Math.abs(X-24); if(ax>nk+2-(Y<38?0.6:0)) return; let l=y%2===0?1:2; if(X>24+nk*0.5) l++; if(Y<38.2) l=0; set(x,y,K[Math.min(3,l)]); });
  if(nt==='ruff') each((x,y,X,Y)=>{ if(Y<36.6||Y>43.6) return; const ax=Math.abs(X-24),sc=Math.abs(Math.sin((X-24)*1.05)); if(ax>nk+4.4-(Y>41.6?(Y-41.6)*2.2:0)||Y<37.2+sc*0.9) return; let l=sc<0.3?2:Y<39?0:1; if(X>27&&l<3) l++; set(x,y,K[l]); });
  if(nt==='wool') each((x,y,X,Y)=>{ if(Y<37.6||Y>44.4) return; const ax=Math.abs(X-24); if(ax>nk+5.4-(Y>42.6?(Y-42.6)*1.8:0)||Y<38+Math.abs(Math.sin((X-0.5)*1.4))*0.9) return; let l=hash(x,y,31)>0.6?1:0; if(X>27) l++; if(Y>42.4) l++; set(x,y,K[Math.min(3,l)]); });
  if(nt==='lapel') each((x,y,X,Y)=>{ if(Y<38) return; const ax=Math.abs(X-24),I=D.in;
    if(Y<40){ if(ax<=nk+2.4&&ax>nk-0.6) set(x,y,B[X<24?1:2]); return; }
    const v=(Y-40.1)*0.72; if(ax<=v+0.4){ if(Y<46) set(x,y,I[Y<42?0:1]); return; } if(ax<=v+2.8&&Y<47) set(x,y,ax>v+2.1?B[3]:X<24?B[0]:B[2]); });
  if(nt==='shawl') each((x,y,X,Y)=>{ if(Y<39) return; const w=hw(Math.max(40.5,Y))+0.6,ax=Math.abs(X-24); if(ax>w) return; const v=nk-0.8+(Y-39.5)*0.55; if(ax<v) return; if(Y<40&&ax>nk+3.4) return; let l=X<24?1:2; if(ax<v+1) l=3; if(ax>w-1.2) l=3; if(lnD(X*1.1+Y*1.1,4)<0.36&&l<3) l++; set(x,y,(D.pat&&l<3&&((Math.floor(X/2.2)+Math.floor(Y/2.2))%2===0))?D.pat[l]:K[l]); });   /* 0.61.0 D.pat＝ショールの赤い模様 */
  if(nt==='kerchief'){ each((x,y,X,Y)=>{ const ax=Math.abs(X-24); if(Y>=38.6&&Y<=40.8&&ax<=nk+1){ set(x,y,K[Y<39.4?0:X>25?2:1]); return; } if(Y>40.8&&Y<=46&&ax<=3.4-(Y-40.8)*0.66) set(x,y,K[ax>2.9-(Y-40.8)*0.66?3:X>24.5?2:1]); });
    stamp(g,30,53,['.ab.','abba','.bb.'],{a:K[2],b:K[3]},'cloth'); }   // 結び目
  if(nt==='scarf') each((x,y,X,Y)=>{ const ax=Math.abs(X-24),top=38.6+ax*0.1,bot=42.2+ax*0.05; if(Y>=top&&Y<=bot&&ax<=nk+4.6){ let l=Y<top+1?0:Y>bot-1?3:X>27?2:1; if(lnD(X*1.2+Y*0.9,4.2)<0.34&&l<3&&l>0) l++; set(x,y,K[l]); return; }
    if(Y>42&&Y<=47.6&&Math.abs(X-28.6)<=1.4+(Y-42)*0.22) set(x,y,K[Y>45.4?3:X>29?2:1]); });
  if(D.towel) each((x,y,X,Y)=>{ if(Y<40.4||Y>47.6) return; const d=Math.abs(X-24)-(nk+0.2); if(d>=-1.4&&d<=1.4) set(x,y,D.towel[d<0?0:d<0.8?1:2]); });
  if(D.apron){ const A=D.apron; each((x,y,X,Y)=>{ const ax=Math.abs(X-24); if(Y>=42&&ax<=6.6) set(x,y,A[ax>5.9?3:Y<42.9?0:X>26?2:1]); else if(Y>=37&&Y<42&&Math.abs(ax-(nk+1.2+(41.5-Y)*0.25))<0.8) set(x,y,A[X<24?1:2]); }); }
  if(D.strap){ const T=D.strap; each((x,y,X,Y)=>{ if(Y<40||Math.abs(X-24)>hw(Y)-0.6) return; const ly=40.2+(36.5-X)*0.36; if(Math.abs(Y-ly)<=1.1) set(x,y,T[Y<ly-0.45?0:Y>ly+0.55?2:1]); }); }
  if(D.lace) for(let x=24;x<=40;x+=2){ const X=(x+0.5)*FK; set(x,f64(42.9+((X-24)/6)**2*1.2),D.lace,'gear'); }
  if(D.pend==='lamp') stamp(g,31,57,['.b.','bAb','bAb','bab','.b.'],{b:'#8a5a20',A:'#ffe8a0',a:'#e8a040'});
  if(D.pend==='book'){ stamp(g,28,56,['bbbbbb','bBBBBp','bBrBBp','bBrBBp','bBBBBp','bbbbbb'],{b:'#3a2414',B:'#7a4a2a',p:'#f4ecd4',r:'#c8483c'}); stamp(g,30,52,['c','c','c','c'],{c:'#3a2414'}); stamp(g,33,52,['c','c','c','c'],{c:'#3a2414'}); }   /* 0.62.0 ヤスミン 首からさげた帳面 */
  if(D.pend==='star') stamp(g,30,56,['..s..','..S..','sSSSs','..S..','..s..'],{s:'#c8d0f0',S:'#ffffff'});
  if(D.tie) stamp(g,29,53,['Rr...rR','RRr.rRR','RRRkRRR','RRr.rRR','Rr...rR'],{R:D.tie[0],r:D.tie[1],k:D.tie[2]},'cloth');
  if(D.btns) for(const [bx,by] of D.btns){ const x=f64(bx+0.5)-1,y=f64(by+0.5), dk=mixC(D.btn,'#000000',0.3); set(x,y,D.btn,'gear'); set(x+1,y,D.btn,'gear'); set(x,y+1,dk,'gear'); set(x+1,y+1,dk,'gear'); }
}
/* かぶり物と髪の小物 */
function hatGen(g,S,H,HS,P){
  const set=(x,y,c,r)=>{ x=Math.round(x); y=Math.round(y); if(x>=0&&y>=0&&x<FN&&y<FN) g[y][x]={c,r:r||'gear'}; }, each=eachF;   // set は 64 の格子の番号
  const A=S.hatC, C=HS.C||H.cap, t=S.hat, HR=hairRamp(P);
  if(HS.bun){ const [bx,by,br]=HS.bun; each((x,y,X,Y)=>{ const d=Math.hypot(X-bx,Y-by); if(d>br) return; const v=-(X-bx)/br*0.6-(Y-by)/br*0.7+0.35; let l=v>0.7?1:v>0.4?2:v>0.1?3:v>-0.2?4:5;
      if(Math.sin(Math.atan2(Y-by,X-bx)*2+d*1.1)>0.8) l=Math.min(6,l+2); if(d<1.2&&v>0.3) l=0; if(d>br-0.7&&l<5) l++; set(x,y,HR[l],'hair'); });
    if(S.knot) each((x,y,X,Y)=>{ if(Math.abs(Y-(by+br-0.5))<0.55&&Math.abs(X-(bx-0.5))<=2.6) set(x,y,Y>by+br-0.5?mixC(S.tieC||'#d8b070','#000000',0.25):S.tieC||'#d8b070'); }); }
  if(HS.ties&&S.tieC) for(const [tx,ty] of HS.ties){ const x0=f64(tx)-3,y0=f64(ty); for(let dx=0;dx<5;dx++) for(let dy=0;dy<3;dy++){ const x=x0+dx,y=y0+dy; if(g[y]&&g[y][x]&&g[y][x].r==='hair') set(x,y,dy===2?mixC(S.tieC,'#000000',0.3):dy===0&&dx<2?mixC(S.tieC,'#ffffff',0.3):S.tieC); } }
  if(t==='band'){ each((x,y,X,Y)=>{ const bY=15.8+((X-24)/15)**2*2.6; if(Math.abs(Y-bY)>1.3||!inCapE(X,Y,[C[0]+0.8,C[1]+0.8,C[2]])) return; set(x,y,A[Y<bY-0.55?0:Y>bY+0.65?2:X>31?2:1]); });
    each((x,y,X,Y)=>{ if(X<38||X>46||Y<15||Y>27) return; const k=Math.hypot(X-40.4,Y-18.2)<=1.7, t1=Math.abs(X-(41.6+(Y-19)*0.35))<=0.9&&Y>19&&Y<26.5, t2=Math.abs(X-(43.4+(Y-19)*0.12))<=0.8&&Y>18.6&&Y<24;
      if(k) set(x,y,Math.hypot(X-40.4,Y-18.2)>1.15?A[2]:A[1]); else if(t1||t2) set(x,y,A[t1?(Math.abs(X-(41.6+(Y-19)*0.35))>0.5?3:2):1]); }); }
  if(t==='cap'){ const D=[C[0]+0.7,C[1]+0.7,C[2]];
    each((x,y,X,Y)=>{ if(Y>15.4||!inCapE(X,Y,D)) return; const nx=(X-24)/18; let l=nx<-0.3?0:nx<0.32?1:2; if(Y<8&&l>0&&nx<0) l--; if(Math.abs(X-24.5)<0.4&&Y>6&&Y<14.6) l=Math.min(3,l+1); if(Y>14.4) l=Math.min(3,l+1); set(x,y,A[l]); });
    each((x,y,X,Y)=>{ if(Y<14.8||Y>17.8) return; if(Math.abs(X-22.6)>15.6-(Y-14.8)*0.9) return; set(x,y,Y>16.9?A[3]:Y<15.4&&X<30?A[0]:A[X<24?1:2]); });
    stamp(g,30,12,['.yyy.','yYYYy','yYOYy','yYYYy','.yyy.'],{y:S.badge[1],Y:S.badge[0],O:'#ffffff'}); }
  if(t==='cook') each((x,y,X,Y)=>{ const ax=Math.abs(X-24), band=Y>=11&&Y<=15.8&&ax<=C[0]-0.6-(15.8-Y)*0.1, puff=Y<=11.6&&(Math.hypot(X-15.4,Y-8.4)<=5.8||Math.hypot(X-24,Y-6.2)<=6.8||Math.hypot(X-32.6,Y-8.4)<=5.8);
    if(!band&&!puff) return; let l; if(band){ l=X<18?0:X>31?2:1; if(Y>15) l=2; if(lnD(X-0.5,3)<0.38) l=Math.min(3,l+1); }
    else { const v=-(X-24)/14*0.6-(Y-6)/7*0.6+0.4; l=v>0.6?0:v>0.15?1:2; if(Y>10.6) l=Math.max(l,2);
      if(l<2&&Y>3&&(Math.abs(Math.hypot(X-15.4,Y-8.4)-5.8)<0.45||Math.abs(Math.hypot(X-32.6,Y-8.4)-5.8)<0.45)&&Math.hypot(X-24,Y-6.2)<6.8) l++; }   // ふくらみの重なりの線
    set(x,y,A[l]); });
  if(t==='hat'){ each((x,y,X,Y)=>{ const ax=Math.abs(X-24), brim=((X-24)/21.6)**2+((Y-14.4)/3.1)**2<=1&&Y>=12.6, crown=Y>=2.4&&Y<=13.6&&ax<=10.6+(Y-2.4)*0.14&&!(ax>8.6&&Y<4.4);
      if(crown){ if(Y>=10.6&&Y<=12.8){ set(x,y,Y<11.4?S.bandC[0]:S.bandC[1]); return; } set(x,y,A[Y<3.4?0:X<19?0:X>29?2:Math.abs(X-24)<0.4&&Y<6?2:1]); } else if(brim) set(x,y,A[Y>15.4?3:Y<13.2&&X<22?0:X<20?1:2]); });
    each((x,y,X,Y)=>{ const tt=(12-Y)/10; if(tt<0||tt>1) return; const cx=32.6+tt*6.8+Math.sin(tt*3)*0.8; if(Math.abs(X-cx)<=0.6+Math.sin(tt*Math.PI)*1.1&&!(Y>10.6&&X<34)) set(x,y,Math.abs(X-cx)<0.4?S.featherC[1]:S.featherC[0]); }); }
  if(t==='hband'){ each((x,y,X,Y)=>{ const bY=10.2+((X-24)/16)**2*5.4; if(Math.abs(Y-bY)>1.25||!(g[y][x]&&g[y][x].r==='hair')) return; set(x,y,A[Y<bY-0.45?0:Y>bY+0.6?2:X>30?2:1]); });
    stamp(g,42,7,['.aa....','aAAa...','aAAAaa.','.aaAAAa','...aAAa','....aa.'],{a:A[2],A:A[1]}); }
  if(t==='bird') stamp(g,36,0,['.......hhhh...','......hHHHHh..','......hHHEHhk.','......hHHHHhkk','...bbbhHHHHh..','.tbBBBBbhhh...','tbBBBWWWBBb...','tbBWWWWWBBb...','.tbBWWWWBb....','...bbbbbb.....'],
    {h:'#7cc4ec',H:'#c4ecff',E:'#1a1a2a',k:'#f8a030',b:'#5aa0d0',B:'#8ad0f4',W:'#fff4dc',t:'#4a88b8'});
  // 小物（1.2：64 の細かさで描き直し）
  const acc=S.acc||[], ex=[f64(Math.round(24-H.rx-0.6)+0.5),f64(Math.round(24+H.rx-0.4)+0.5)];
  if(acc.includes('flower')) stamp(g,9,13,['.pp.pp.','pppcppp','ppcccpp','.ccocc.','ppcccpp','pppcppp','.pp.pp.'],{p:'#fff6f0',c:'#f8c030',o:'#d08818'});
  if(acc.includes('hoops')) for(const e of ex) stamp(g,e-1,43,['.gg.','g..g','g..G','.GG.'],{g:'#f8d048',G:'#c09020'});
  if(acc.includes('clip')) stamp(g,41,20,['YOYYYY','yyyyyy'],{Y:'#fff07a',y:'#e0b020',O:'#ffffff'});
  if(acc.includes('leaf')) stamp(g,13,19,['...L','..LL','.LLl','LLl.','l...'],{L:'#7ed060',l:'#3c8a34'});
  if(acc.includes('moon')) stamp(g,44,16,['.MMM.','MM...','M....','MM...','.MMM.'],{M:'#ffe070'});
  if(acc.includes('pin')&&HS.bun){ const [bx,by]=HS.bun; for(let i=-6;i<=6;i+=0.5) set(f64(bx+i+0.5),f64(by+1.5-i*0.3),i>4.4?'#c03838':i<-5?'#5a3a20':'#8a5a30'); }
  if(acc.includes('orn')&&HS.tie){ const [tx,ty]=HS.tie; stamp(g,f64(tx+0.5)-2,f64(ty+0.5)-2,['.GG.','GOGG','GGGG','.GG.','.rr.','rRRr','.RR.','.Rr.','..r.'],{G:'#f4cc48',O:'#fff4b0',r:'#a8203a',R:'#e03c50'}); }
  if(acc.includes('ribbon')&&HS.tie){ const [tx,ty]=HS.tie; stamp(g,f64(tx+0.5)-3,f64(ty+0.5)-2,['RRR.RRR','RrRRRrR','RRRrRRR','.r...r.','.r...r.'],{R:S.ribbonC[0],r:S.ribbonC[1]}); }
  if(acc.includes('lantern')) for(const e of ex) stamp(g,e,43,['b.','AA','Aa','.a'],{b:'#c89030',A:'#ffe090',a:'#e8a040'});
  if(acc.includes('earring')) for(const e of ex){ set(e,44,'#f0c048'); set(e,45,'#c89020'); }
}
/* 目・眉・口のあとに重ねる物：めがね・口ひげ・化粧・ばんそうこう・目にかかる前髪・目じりのしわ */
function facePost(g,S){
  const P=FP,B=ST.eye,post=S.post||[],Q=1/FK,set=(x,y,c,r)=>{ x=Math.round(x); y=Math.round(y); if(x>=0&&y>=0&&x<FN&&y<FN) g[y][x]={c,r:r||'face'}; };
  const cy=p64(B.cy), rx=B.rx*Q, ry=B.ry*Q, EX=[24,40];   // 1.2：64 の目の位置
  if(S.old){ const wc=mixC(P.skin[2],P.skin[3],0.5); for(const s of [-1,1]){ const cx=EX[s<0?0:1]; set(cx+s*7,cy-3,wc); set(cx+s*8,cy-1,wc); set(cx+s*8,cy+1,wc); set(cx+s*7,cy+2,wc); } }
  if(post.includes('cover')) for(const [x,y,p] of COVER) g[y][x]=p;
  if(post.includes('glasses')){ const gc=S.glassC,ga=S.glass||[1.6,1.2], gl=mixC(gc,'#ffffff',0.35);
    for(const s of [-1,1]){ const cx=EX[s<0?0:1],a=rx+ga[0]*Q,b=ry+ga[1]*Q,E=(x,y)=>((x-cx)/a)**2+((y-cy)/b)**2;
      for(let y=Math.floor(cy-b-1);y<=Math.ceil(cy+b+1);y++)for(let x=Math.floor(cx-a-1);x<=Math.ceil(cx+a+1);x++){ if(E(x,y)>1) continue; if(E(x+1,y)>1||E(x-1,y)>1||E(x,y+1)>1||E(x,y-1)>1) set(x,y,(y<cy-b*0.5&&(x-cx)*s<0)?gl:gc,'gear'); }   // ふちの上の内側は明るく
      for(let k=1;k<=4;k++) set(cx+s*(Math.ceil(a)+k),cy-1,gc,'gear'); }
    for(let x=Math.ceil(EX[0]+rx+ga[0]*Q);x<=Math.floor(EX[1]-rx-ga[0]*Q);x++) set(x,cy-1-(Math.abs(x-32)<2?1:0),gc,'gear'); }
  if(post.includes('mustache')) eachF((x,y,X,Y)=>{ const ax=Math.abs(X-24);
    if(!(Y>=33.4+(ax<1.1?0.9:0)&&Y<=35.2+(ax>3?(ax-3)*0.45:0)&&ax<=6.4-(Y<34.4?(34.4-Y)*1.6:0))) return;
    let l=X<24?1:2; if(Y>35.2) l=3; if(lnD(X*1.3-Y*0.5,2)<0.4&&l<3&&Y>34) l++; if(ax<1.4&&Y<34.6&&l<3) l++; set(x,y,P.hair[l],'hair'); },f64(32),f64(39)+1);
  if(post.includes('paint')){ const R=S.paintC||'#d8344a', R2=mixC(R,'#000000',0.25); for(const s of [-1,1]){ const cx=EX[s<0?0:1];   // 舞台の化粧：目じりの上に赤い影
      for(let dx=3;dx<=6;dx++){ const t=cy-0.4-ry*Math.sqrt(Math.max(0,1-(Math.min(dx,rx)/rx)**2)); const yy=Math.ceil(t-0.01)-3-(dx>5?1:0); set(cx+s*dx,yy,R); if(dx>=4) set(cx+s*dx,yy-1,R2); } set(cx+s*7,cy-4,R); set(cx+s*8,cy-5,R); set(cx+s*7,cy-5,R2); } }
  if(post.includes('plaster')) stamp(g,17,45,['.oooooooo.','oeeeQQeeeo','oPPQqqQPPo','oPPPQQPPPo','.oooooooo.'],{o:'#8a5a34',e:'#fff6e4',P:'#f0d2a4',Q:'#d8a878',q:'#c08c5c'},'face');   // 左の頬に横向き（0.5.3：目立つように白く・輪郭つき）
}
/* 22人の見た目（設計書の役どころと性格から決めた。国の型にははめず、服は役どころで選んだ） */
const FSPEC={};
(function(){
  const G4=['#bcf0a4','#6cc050','#3e8a34','#235422'], LEATHER=['#a87448','#74482a','#46281a'], W4=['#ffffff','#eef0f6','#c8ccdc','#8e94a8'];
  const DEF={
   kiran:{name:'キラン',base:'m',skin:'brown',hs:'neat',hair:'blackw',iris:'brown',eye:[3.9,2.8,2.2,29],hat:'band',hatC:['#ff9a8a','#d8443c','#9a2a30','#5a1820'],gearOL:'#3a1018',
     cl:{b:['#f4d88c','#d4a848','#9c7228','#5e4218'],neck:'hood',col:['#a8c890','#6a9050','#465e34','#28381e'],strap:LEATHER}},
   dagny:{name:'ダグニ',base:'f',fem:1,skin:'fair',hs:'braid1',hair:'blonde',iris:'blue',eye:[3.9,3.5,2.6,28],br:{dy:-2.8,arc:1.0,from:-3,rows:2,inner:0},mouth:2,freckle:1,tieC:'#d84a3a',
     cl:{b:['#8ab4e8','#4a74b4','#2e4c84','#1a2c56'],neck:'roll'}},
   kenta:{name:'ケンタ',base:'kid',skin:'tan',hs:'spiky',hair:'dark',iris:'brown',eye:[3.6,3.3,2.5,29],post:['plaster'],
     cl:{b:['#ffffff','#f2f2f6','#ccd0dc','#8a90a4'],stripe:['#3a5cb0','#24387a'],neck:'round',trim:'#3a5cb0'}},
   amara:{name:'アマラ',base:'f',fem:1,skin:'deep',hs:'curly',vol:1,hair:'dark2',iris:'amber2',eye:[3.9,4.4,3.4,28],br:{dy:-1.6,rows:2,inner:0},acc:['flower','hoops'],
     cl:{b:['#ffc4a4','#f47c5c','#c44c3c','#7c2c28'],neck:'round',lace:'#f8d048'}},
   elif:{name:'エリフ',base:'f',fem:1,skin:'olive',hs:'long',bang:'center',hair:'chest',iris:'green',eye:[3.8,3.9,2.9,28],lid:0.9,
     cl:{b:['#b8d4d4','#76a2a2','#4e7676','#2e4a4c'],neck:'hood',col:['#9cc0c0','#5e8888','#3e6060','#223a3a'],pend:'lamp'}},
   bogdan:{name:'ボグダン',base:'oldm',skin:'fair',hs:'bald',hair:'gray',iris:'gray',eye:[3.6,2.3,1.8,29],br:{dy:-1.2,arc:0.6,from:-3,rows:2,inner:1,bushy:1},browC:'#9a9eaa',old:1,post:['glasses','mustache'],glassC:'#9a6a24',glass:[1.3,1.7],
     cl:{b:['#d4d4cc','#a4a49a','#76766c','#4a4a42'],neck:'v',apron:['#c89060','#9a6438','#6c4224','#42260e']}},
   pablo:{name:'パブロ',base:'big',skin:'tan',hs:'curly',vol:0,hair:'dark',iris:'brown',eye:[3.8,2.7,2.2,29],br:{tilt:-0.8},droop:-0.6,stub:1,
     cl:{b:['#d0e098','#98ac58','#6a7c38','#404c20'],neck:'v',towel:['#ffffff','#e4e8ee','#b4bcc8']}},
   sione:{name:'シオネ',base:'m',skin:'brown',hs:'crop',knot:1,tieC:'#e8c070',hair:'black',iris:'dark',eye:[4.0,2.2,1.8,29],lid:0.3,beard:'goatee',
     cl:{b:['#7c94bc','#425884','#2a3c5e','#16223a'],neck:'kerchief',col:['#b0f4ff','#4cc4e4','#2a8cb4','#185a7c']}},
   luca:{name:'ルカ',base:'kid',skin:'olive',hs:'spiky',hair:'copper',iris:'hazel',eye:[3.6,3.3,2.5,29],hat:'cap',hatC:G4,badge:['#fff07a','#d8a020'],gearOL:'#163a18',
     cl:{b:G4,neck:'round',trim:'#f8d048',strap:LEATHER}},
   lucia:{name:'ルチア',base:'kid',fem:1,skin:'olive',hs:'bob',hair:'copper',iris:'hazel',eye:[3.7,4.2,3.0,28],cheek:1,acc:['clip'],
     cl:{b:G4,neck:'round',trim:'#f8d048',strap:LEATHER}},
   pema:{name:'ペマ',base:'kid',fem:1,skin:'tan',hs:'braid2',bangY:18.0,hair:'black',iris:'dark',eye:[3.8,4.5,3.3,28],br:{dy:-2.0},cheek:1,hat:'bird',tieC:'#e84a4a',gearOL:'#22324e',
     cl:{b:['#f4a4a4','#c4545c','#8c3442','#581e2c'],neck:'wool',col:['#fffcf0','#f0e6d0','#d4c4a4','#a8987a']}},
   felix:{name:'フェリクス',base:'m',skin:'fair',hs:'soft',hair:'ash',iris:'green',eye:[3.9,2.4,2.0,29],lid:0.5,br:{rows:1,inner:1,dy:-1.0,arc:0.5},
     cl:{b:['#c8a078','#946c48','#6a4a30','#40281a'],neck:'scarf',col:['#bce4a4','#5e9c4e','#3c6c34','#223e20']}},
   oyuna:{name:'オユナ',base:'oldf',fem:1,lash:0,skin:'tan',hs:'bun',bun:[24,5.4,5.4],hair:'gray',iris:'dark',eye:[3.4,2.8,2.5,28],old:1,acc:['pin','earring'],
     cl:{b:['#f0b480','#c87a4a','#9a5432','#5e301c'],neck:'shawl',col:['#cce4a4','#8aac5c','#5e7c3c','#384e24']}},
   hana:{name:'ハナ',base:'f',fem:1,skin:'light',hs:'long',bang:'blunt',bangY:19.2,cut:36,hair:'blackb',iris:'gray',eye:[3.8,4.0,2.9,28],lid:1.0,br:{dy:-1.8},acc:['leaf'],
     cl:{b:['#e8d8ff','#b49ae0','#8070b4','#4e447a'],neck:'round',in:['#ffffff','#e4e8f0']}},
   jun:{name:'ジュン',base:'m',skin:'light',hs:'messy',hair:'black',iris:'dark',eye:[4.0,2.2,1.9,29],post:['cover'],
     cl:{b:['#a4a8b4','#666c7c','#42464f','#26282f'],neck:'high',btns:[[24,41]],btn:'#e0e4f0'}},
   kwame:{name:'クワメ',base:'big',skin:'deep',hs:'crop',tight:1,hair:'black',iris:'amber2',eye:[3.9,2.8,2.3,29],beard:'jaw',hat:'cook',hatC:W4,gearOL:'#4a5064',
     cl:{b:W4,neck:'kerchief',col:['#fff0a0','#f0c040','#c08a20','#7a5410'],btns:[[19,44],[19,47],[29,44],[29,47]],btn:'#b8bccc'}},
   dewi:{name:'デウィ',base:'f',fem:1,skin:'tan',hs:'bun',bun:[24,4.2,4.6],hair:'dark',iris:'brown',eye:[3.8,4.0,3.0,28],mouth:2,cheek:1,hat:'hband',hatC:['#ffd0b0','#f88850','#d05a30','#8a3418'],
     cl:{b:['#fff0b0','#f4d060','#d0a438','#8c6c1c'],neck:'round',apron:['#ffaca4','#f05c54','#c03a3c','#7a2028']}},
   mireille:{name:'ミレイユ',base:'f',fem:1,skin:'fair',hs:'bun',bun:[24,5.2,4.8],locks:1,sweep:1,hair:'auburn',iris:'blue',eye:[3.6,3.8,2.8,28],post:['glasses'],glassC:'#6a2a3a',
     cl:{b:['#a8b8d8','#6a7ca8','#465878','#2a344c'],neck:'high',col:['#ffffff','#f0f2f8','#c8ccdc','#8a90a4'],tie:['#ff7a84','#c83448','#7a1828']}},
   layla:{name:'ライラ',base:'f',fem:1,skin:'brown',hs:'long',bang:'center',wavy:1,hair:'night',iris:'gold',eye:[3.8,4.0,3.0,28],lid:1.0,acc:['moon'],
     cl:{b:['#a4ace8','#5c64b0','#3c407e','#22244e'],neck:'high',col:['#7c84cc','#464c94','#2e3266','#1a1c3c'],pend:'star'}},
   zoe:{name:'ゾエ',base:'f',fem:1,skin:'olive',hs:'pony',hair:'zoe',iris:'amber',eye:[3.9,4.2,3.0,28],br:{dy:-2.0},mouth:2,cheek:1,smile:1,
     cl:{b:['#ffc890','#e08a3a','#b0602a','#703818'],neck:'v',in:['#fffbea','#f2e6c8'],strap:LEATHER}},
   linh:{name:'リン',base:'f',fem:1,skin:'fair',hs:'pony',hair:'black',iris:'brown',eye:[3.9,3.6,2.7,28],br:{dy:-2.0},cheek:1,post:['paint'],acc:['orn'],pal:{mouth:'#b8203c',mouthIn:'#d83a50'},
     cl:{b:['#ff9ca4','#e0444e','#a82434','#661424'],neck:'ruff',col:['#ffffff','#f4f0ec','#d8d0cc','#a8a09c'],btns:[[24,44],[24,46]],btn:'#f4cc48'}},
   berta:{name:'ベルタ',base:'f',fem:1,skin:'light',hs:'bun',bun:[24,4.6,5.0],hair:'berta',iris:'hazel',eye:[3.8,3.9,2.9,28],br:{dy:-2.4},mouth:2,cheek:1,smile:1,
     cl:{b:['#86b896','#3e6a4a','#2a4c34','#183020'],neck:'round',apron:['#fffbea','#f2e6c8','#d0bf98','#8a7a5c']}},
   tuya:{name:'トゥヤ',base:'f',fem:1,skin:'tan',hs:'bob',hair:'black',iris:'brown',eye:[3.8,3.9,2.9,28],br:{dy:-2.0},cheek:1,
     cl:{b:['#e8924e','#c0622a','#a24c1e','#6e2e10'],neck:'roll',col:['#8cb4f0','#4a78c8','#2e529a','#1a3060']}},   /* 0.61.0 27章 トゥヤ 黒い短い髪・橙のデールに青い襟 */
   solveig:{name:'ソルヴェイ',base:'f',fem:1,skin:'light',hs:'braidC',hair:'flax',iris:'blue',eye:[3.8,3.9,2.9,28],br:{dy:-2.0,inner:0},tieC:'#d8344a',
     cl:{b:['#5a78b0','#3a5a94','#2e4a7a','#1c2e52'],neck:'shawl',col:['#fffbea','#f2e6c8','#d0bf98','#8a7a5c'],pat:['#e8584a','#c8342c','#962420','#5e1414']}},   /* 0.61.0 ソルヴェイ 亜麻色の三つ編み・藍の服に生成りに赤い模様のショール */
   yasmin:{name:'ヤスミン',base:'f',fem:1,skin:'light',hs:'long',bang:'side',cut:42,tuck:1,hair:'yasmin',iris:'brown',eye:[3.7,3.8,2.8,28],br:{dy:-2.0},post:['glasses'],glassC:'#b88a3c',glass:[1.9,1.9],
     cl:{b:['#8cb09c','#5e8a74','#3e5e52','#243a32'],neck:'lapel',in:['#fffaea','#e8dcc0'],pend:'book'}},   /* 0.62.0 28章 ヤスミン 肩までのまっすぐな赤茶の髪（右の耳にかける）・丸い眼鏡・苔色の外套・首からさげた帳面 */
   yura:{name:'ユラ',base:'f',fem:1,skin:'light',hs:'tail',hair:'silver',iris:'amber',eye:[3.8,4.0,2.9,28],lid:0.6,acc:['ribbon','lantern'],ribbonC:['#5a74b8','#34488a'],
     cl:{b:['#8aa0cc','#465e94','#2c3e68','#182442'],neck:'lapel',in:['#ffffff','#e6eaf2'],btns:[[21,44],[21,46]],btn:'#f0c050'}}};
  for(const [id,s] of Object.entries(DEF)){ const hair=HC[s.hair], fem=!!s.fem;
    const pal=Object.assign({},FACE_PAL,SKIN[s.skin],{hair,iris:IR[s.iris],brow:s.browC||mixC(hair[3],hair[4],0.3),clothOL:mixC(s.cl.b[3],'#000000',0.35),gearOL:s.gearOL||'#2e1c18'},s.pal||{});
    const brow=Object.assign(fem?{dy:-3.3,arc:1.4,from:-2,rows:1,inner:1}:{dy:s.base==='kid'?-1.6:-0.6,arc:0.25,from:-3,rows:2,inner:1},s.br||{});
    const st={fem,lash:s.lash===undefined?fem:!!s.lash,eye:{rx:s.eye[0],ry:s.eye[1],ir:s.eye[2],cy:s.eye[3]},brow,mouth:s.mouth||(fem?1:2),smile:!!s.smile,cheek:!!s.cheek,lid:s.lid||0,droop:s.droop||0};
    FSPEC[id]=Object.assign({},s,{id,pal,st}); }
})();
const EXPR={
  normal:  {eye:{},              brow:[0,-1],  m:'smile', mt:'talk'},
  smile:   {eye:{closed:'happy'},brow:[-1,-2], m:'open',  mt:'open', blush:true},
  angry:   {eye:{slant:1.6,top:0.6,ir:2.3},brow:[2.5,-1.2],m:'grit',mt:'grit'},
  sad:     {eye:{slant:-1.2,top:1.2,iy:0.8,ix:0.5},brow:[-2.4,0.6],m:'frown',mt:'talk',tear:true},
  surprise:{eye:{ry:3.8,ir:1.8},brow:[-3,-3],m:'o',mt:'o'},
  resolve: {eye:{slant:0.8,top:0.8,ir:2.6},brow:[1.3,-0.8],m:'firm',mt:'talk'}};
ART.EXPR_NAMES={normal:'ふつう',smile:'笑う',angry:'怒る',sad:'悲しい',surprise:'驚く',resolve:'決意'};
const FACEC={};
/* ART.face(表情, まばたき, 口) はノア。ART.face('ines', 表情, まばたき, 口) でイネス（0.5.1） */
ART.FACES=['noa','ines'].concat(Object.keys(FSPEC));
ART.FACE_SIZE=FN;   // 1.2：顔グラの大きさ（64）。使う側は canvas.width を見るか、これを使う
ART.FACE_NAMES=Object.assign({noa:'ノア',ines:'イネス'},Object.fromEntries(Object.keys(FSPEC).map(k=>[k,FSPEC[k].name])));
ART.FACE_ID=Object.fromEntries(Object.entries(ART.FACE_NAMES).map(([k,v])=>[v,k]));
/* 0.5.6 の「正面の絵を伸び縮みさせる向き」は 0.5.8 でやめた（みんな下の斜めの顔に） */
/* ---------- 斜めの顔（0.5.7・まずノア）----------
   FE やスパロボの顔グラのように、最初から斜め（右向き）の形で描く。左向きは左右反転。
   輪郭・耳・鼻・髪・ゴーグル・首・肩は斜めの形で描き、目・眉・口は正面と同じ道具で描いてから置く。
   手前の目はそのまま、奥の目は細く、口は少し細くする。光は顔の向く側（右上）から */
const N34={eyeN:28,eyeF:43,sxF:0.72,mouth:39,sxM:0.84,blushN:22,blushF:44,tearX:21};   // 1.2：64 の格子の番号
function lerpPts(P,v){ if(v<=P[0][0]) return P[0][1]; for(let i=1;i<P.length;i++) if(v<=P[i][0]){ const [a,b]=P[i-1],[c,d]=P[i]; return b+(d-b)*(v-a)/(c-a); } return P[P.length-1][1]; }
function faceBaseNoa34(){
  const N=FN,P=FACE_PAL,g=gridF();
  const set=(x,y,col,reg)=>{ if(x>=0&&y>=0&&x<N&&y<N) g[y][x]={c:col,r:reg}; };
  const up=Y=>Math.sqrt(Math.max(0,1-((Y-25)/14)**2));
  // 0.5.9：えらの角（35あたり）まではまっすぐ下り、そこからあご先へ
  // 1.1（0.31.1）：えらの角から少しずつ曲がり、あご先は丸く広く（前は V の字で尖っていた）
  const farX=Y=>Y<=27?25.4+12.4*up(Y):lerpPts([[27,37.8],[30,37.6],[33,37.0],[35,36.4],[37,35.5],[39,34.2],[40.5,32.6]],Y);
  const nearX=Y=>Y<=27?25.4-12.6*up(Y):lerpPts([[27,13.0],[30,13.2],[33,13.7],[35,14.6],[37,16.4],[39,19.4],[40.5,23.0]],Y);
  const inFace=(X,Y)=>Y>=11&&Y<=40.5&&X>=nearX(Y)&&X<=farX(Y);
  // 肩と上着（体は顔よりもう少し横を向く。手前の肩が広い）
  const XB=21;
  eachF((x,y,X,Y)=>{ if(Y<40) return; const hl=12.6+(Y-40.5)*2.9-Math.max(0,2-(Y-40))*0.8, hr=10.6+(Y-40.5)*2.1-Math.max(0,2-(Y-40))*0.6; if(X<XB-hl||X>XB+hr) return;
    let l=X<XB-hl*0.45?2:1; if(X<XB-hl+1.2||X>XB+hr-1.2) l=3; if(Y<42) l=Math.min(3,l+1); if((Math.abs(X-11.5)<0.38||Math.abs(X-29.5)<0.38)&&Y>44) l=3; else if(Math.abs(X-30.25)<0.38&&Y>44.4&&l<2) l=0; if(hash(x,y,90)>0.95&&l<3) l++;
    set(x,y,P.jacket[l],'cloth'); },f64(40));
  eachF((x,y,X,Y)=>{ if(Y<42||Math.abs(X-26)>1.5+(Y-42)*0.5) return; set(x,y,P.shirt[Y>45?1:0],'cloth'); },f64(42));
  // 首（あごの下は影）
  const neck=(X,Y)=>Y>=31&&Y<44&&X>=16.6+(Y-33)*0.15&&X<=27.6;
  eachF((x,y,X,Y)=>{ if(!neck(X,Y)) return; set(x,y,P.skin[X<20.6||X>26.4?3:2],'skin'); },f64(31),f64(44)+1);
  // えり巻き
  eachF((x,y,X,Y)=>{ const top=39+Math.abs(X-22)*0.12, bot=43.2+Math.abs(X-22)*0.06;
    if(Y>=top&&Y<=bot&&Math.abs(X-22)<=10.5){ let l=Y<top+1.2?0:Y>bot-1.2?3:X<16?2:1; if(lnD(X*1.2+Y*0.9,4.2)<0.34&&l<3&&l>0) l++; set(x,y,P.scarf[l],'cloth'); } },f64(39),f64(46)+1);
  eachF((x,y,X,Y)=>{ if(Y<43||Math.abs(X-29)>1.6+(Y-43.5)*0.3) return; set(x,y,P.scarf[Y>46?3:X>30?1:2],'cloth'); },f64(43));
  // 耳（手前だけ）
  { const R=skinRamp(P); eachF((x,y,X,Y)=>{ const e=((X-12.4)/2.5)**2+((Y-28.4)/3.7)**2; if(e>1) return; let k=X<11.4?3:Y>30.5?5:3; if(e>0.6&&X>12.6&&Y<29.5) k=2; set(x,y,R[k],'skin'); },f64(24),f64(33));
    dots(g,14,35,['5..','56.','.6.','.65','..5'],{5:R[5],6:R[6]},'skin'); }   // 耳のくぼみ
  // 顔：手前の横の面（耳からほお骨の手前まで）は少し影。あごの下の面も影
  { const R=skinRamp(P);   // 1.0：頭の丸みから明るさを決める（光は向いている側の上の手前から）
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){ const X=(x+0.5)*FK,Y=(y+0.5)*FK; if(!inFace(X,Y)) continue;
      const a=Y<=27?Math.min(nearX(Y),25.4-12.6):nearX(Y), b=Y<=27?Math.max(farX(Y),25.4+12.4):farX(Y), nx=Math.max(-0.97,Math.min(0.97,((X-a)/(b-a))*2-1.15));
      const ny=Y<=27?(Y-25)/18:(27-25)/18+Math.pow((Y-27)/13.5,1.6)*0.82, nz=Math.sqrt(Math.max(0.04,1-nx*nx-ny*ny));
      let k=litK(0.3*nx-0.4*ny+0.87*nz); if(Y>37.6&&X<nearX(Y)+2.4) k=Math.max(k,5);
      if((X-21)**2+(Y-32.4)**2<1.5&&k<=2) k=1;   // 手前のほおの光
      g[y][x]={c:R[k],r:'skin',k}; } }
  // 鼻：鼻すじの影は手前（左）に落ちる（1.2：64 で描き直し。数字は肌の段）
  { const R=skinRamp(P), m={}; for(let i=0;i<8;i++) m[i]=R[i]; dots(g,37,40,['3...','4.0.','.40.','.50.','..5.','..66','...6'],m,'skin'); }
  // あごの線（顔と首の境）：顔の下か左が首なら濃い線
  const c64=v=>(v+0.5)*FK;
  for(let y=f64(28);y<f64(42);y++)for(let x=f64(12);x<f64(34);x++){ if(!inFace(c64(x),c64(y))) continue; const nb=(xx,yy)=>{ const q=g[yy]&&g[yy][xx]; return q&&q.r==='skin'&&!inFace(c64(xx),c64(yy))&&neck(c64(xx),c64(yy)); };
    if(nb(x,y+1)||nb(x-1,y)) set(x,y,P.skin[4],'skin'); }
  // 髪：頭は少し後ろ（左）へふくらむ。前髪は顔にかかり、後ろ髪は耳の後ろまで
  const bang=x=>{ const k=((x-1)%6+6)%6; return 18+Math.abs(k-3)*1.3+(x>33?-0.8:0); };   // x は 48 の座標の連続な値
  const hairAt=(X,Y)=>{ const x=X-0.5;
    if(Y<=bang(x)&&((X-22.4)/17.6)**2+((Y-21)/17)**2<=1) return true;
    if(Y>13&&Y<=34&&X<11.2-(Y-24)*0.16&&X>4.6+Math.max(0,Y-15)*0.3) return true;   // 後ろ髪（耳の後ろ）
    if(Y>13&&Y<=27.5&&X<16.4-(Y-17)*0.36&&X>9) return true;                         // 手前のもみあげ（こめかみを隠す）
    if(Y>13&&Y<=25.5&&X>35.4+(Y-14)*0.18&&X<39.8-(Y-14)*0.3) return true;          // 奥のこめかみの房
    if(Y<8&&(Math.abs(X-12.5)<3.4-(8-Y)*0.55&&Y>2.6||Math.abs(X-21.5)<3.8-(8-Y)*0.5&&Y>1||Math.abs(X-30.5)<3.2-(8-Y)*0.6&&Y>3.4)) return true;   // はね
    return false; };
  const HR=hairRamp(P);
  eachF((x,y,X,Y)=>{ if(!hairAt(X,Y)) return; const xb=X-0.5;
    const nx=(X-23)/18,ny=(Y-17)/18,nz=Math.sqrt(Math.max(0.05,1-nx*nx-ny*ny)); const lam=nx*0.5-ny*0.62+nz*0.5;
    let l=lam>0.86?1:lam>0.62?2:lam>0.42?3:lam>0.24?4:lam>0.08?5:6;
    const ring=Math.hypot(X-25,Y-20)-11.2; if(Math.abs(ring)<0.8&&X>16&&X<37&&Y<17&&(Math.floor(X/2.6)%2===0)) l=0; else if(Math.abs(ring)<1.8&&X>16&&X<37&&Y<17&&l>2) l=Math.max(1,l-2);   // つやの帯
    if(Y>bang(xb)-1.6&&Y<26&&X>12&&X<40) l=Math.max(l,Y>bang(xb)-0.8?5:4);   // 毛先の下側
    if(lnD(X+1.5,6)<0.38&&Y>12&&Y<bang(xb)-0.6) l=Math.max(l,4); else if(lnD(X+0.75,6)<0.38&&Y>12&&Y<bang(xb)-2&&l>1) l--;    // 毛すじと、その横の光
    if(X<11.4&&Y>14) l=Math.max(l,5);                       // 後ろ髪は影
    set(x,y,HR[l],'hair'); });
  // 髪の落とす影（おでこ）
  hairShadow(g,P);
  // ゴーグル：手前のレンズは丸、奥は細い
  eachF((x,y,X,Y)=>{ const bandY=12.6+((X-26)/18)**2*3.2;
    if(Math.abs(Y-bandY)<=1.3&&hairAt(X,Y)) set(x,y,P.strap[Y<bandY-0.4?0:Y>bandY+0.6?2:1],'gear'); },f64(8),f64(20));
  for(const [gx,gy,rx] of [[19.5,13,4.3],[31.6,13,2.9]]) eachF((x,y,X,Y)=>{ const r=Math.hypot((X-gx)*4.3/rx,Y-gy);
    if(r<=4.3){ if(r>3.15){ const a=Math.atan2(Y-gy,X-gx); set(x,y,P.brass[a<-1.2&&a>-2.8?0:a>0.6&&a<2.6?3:a>-0.4&&a<0.6?2:1],'gear'); }
      else if(r>2.75) set(x,y,P.brass[3],'gear');
      else { const k=(X-gx)*4.3/rx+(Y-gy), l=k<-1.6?0:k<0.5?1:k<2.2?2:3; set(x,y,P.lens[l],'gear'); } } },f64(7),f64(20));
  set(23,14,'#ffffff','gear'); set(24,14,'#ffffff','gear'); set(23,15,'#ffffff','gear'); set(40,14,'#ffffff','gear');
  return g;
}
/* 0.5.9：リアル寄りの目（ヒロさん「目が大きい」「昭和のアニメみたい」）。幅7・高さ3ほどのアーモンド形、細い線、小さめの瞳。
   斜めの顔で使う。side：-1 画面の左の目、1 右の目。外側は side の向き */
function eyeR(g,cx,cy,side,o){
  const P=FP, fem=ST.fem, set=(x,y,c)=>{ x=Math.round(x); y=Math.round(y); if(x>=0&&y>=0&&x<FN&&y<FN) g[y][x]={c,r:'face'}; }, X=dx=>cx+dx*side, L=P.eyeLine;
  // 1.2：64 では幅9・高さ4ほど（dx：-4 内側〜4 外側）
  if(o.closed==='happy'){ for(let dx=-4;dx<=4;dx++) set(X(dx),cy-(Math.abs(dx)<=1?2:Math.abs(dx)<=3?1:0),L); set(X(5),cy+1,L); if(fem){ set(X(5),cy,L); set(X(6),cy,L); } return; }
  if(o.closed==='blink'){ for(let dx=-4;dx<=4;dx++) set(X(dx),cy+(Math.abs(dx)<=2?1:0),L); set(X(5),cy,L); if(fem){ set(X(5),cy-1,L); set(X(6),cy-1,L); } return; }
  // 開いた目の上下
  const top=[0,-1,-1,-2,-2,-2,-2,-2,-1], bot=[0,0,1,1,1,1,1,0,0];
  const sl=o.slant||0, lo=Math.round(Math.max(0,(o.top||0)/FK-0.3)), big=(o.ry||0)>3.6;
  for(let i=0;i<9;i++){ const dx=i-4; if(big&&i>=1&&i<=7) top[i]--; if(big&&i>=2&&i<=6) bot[i]=Math.max(bot[i],i>=3&&i<=5?2:1);
    top[i]+=lo; if(sl>1&&dx<=-1) top[i]++; if(sl>0.5&&dx<=-2) top[i]++; if(sl>1.2&&dx<=-3) top[i]++; if(sl<-0.5&&dx>=1) top[i]++; if(sl<-0.5&&dx>=3) top[i]++; if(top[i]>bot[i]) top[i]=bot[i]; }
  const ic=Math.round((o.ix||0)*1.6), small=(o.ir||2.5)<2;   // 瞳の中心（内外へのずれ）と、驚いたときの小さい瞳
  for(let i=0;i<9;i++){ const dx=i-4; for(let r=top[i];r<=bot[i];r++){ const y=cy+r; let c=r===top[i]?P.eyeWs:r===bot[i]&&P.eyeSb?P.eyeSb:(P.eyeSc||P.eyeW);   /* 0.83.0 */
      if(i===0) c=P.eyeWs;
      const d=dx-ic; if(small?(d===0||d===1):Math.abs(d)<=1){ c=r===top[i]?P.iris[2]:r===bot[i]?P.iris[0]:P.iris[1]; if(d===0&&r===Math.min(bot[i],top[i]+1)) c=P.pupil; if(!small&&d!==0&&r===top[i]+1&&r<bot[i]) c=P.iris[2]; }   // 驚いた目の瞳は2ドット
      set(X(dx),y,c); } }
  // 光（画面の右上・1ドット）
  { const i=4+ic, y=cy+top[Math.max(0,Math.min(8,i))]; set(cx+ic*side+1,y,P.eyeW); }
  // 上まぶたの線。女の人は外側を太く、まつげを外へはねる。男の人は外の角を少し下へ
  for(let i=0;i<9;i++){ const dx=i-4; set(X(dx),cy+top[i]-1,dx<=-3?mixC(L,P.skin[3],0.45):L); if(fem&&dx>=0) set(X(dx),cy+top[i]-2,L); }   /* 0.83.0 目頭の側は細く見せる */
  if(fem){ set(X(5),cy+top[8]-2,L); set(X(5),cy+top[8]-1,L); set(X(6),cy+top[8]-3,L); set(X(6),cy+top[8]-2,L); }
  else { set(X(5),cy+top[8],L); for(let dx=-1;dx<=3;dx++) set(X(dx),cy+top[dx+4]-3,P.skin[3]); }   // 男の人は二重の線をうすく
  if(!o.noLower) for(let dx=0;dx<=4;dx++) set(X(dx),cy+bot[dx+4]+1,P.skin[3]);
}
/* 正面の道具で描いた部品（L）を、横に sx 倍して dc を中心に置く（64 の格子） */
function placeFeat(g,L,sc,dc,sx){ for(let y=0;y<FN;y++) for(let xt=dc-14;xt<=dc+14;xt++){ if(xt<0||xt>=FN) continue; const xs=sc+Math.round((xt-dc)/sx); if(xs<0||xs>=FN) continue; const p=L[y][xs]; if(p) g[y][xt]=p; } }
function face34(E,blink,talk){
  const g=faceBaseNoa34(), B=ST.eye, cyR=p64(B.cy-2);   // 0.5.9：目は小さく、少し上に
  for(const side of [-1,1]){ const L=gridF(), cx=side<0?24:40;
    let o=Object.assign({},E.eye);
    if(!o.closed&&blink===1) o.top=Math.max(o.top||0,1), o.noLower=false;
    if(!o.closed&&blink===2) o={closed:'blink'};
    eyeR(L,cx,cyR,side,o); brow(L,cx,23/FK-0.5,side,E.brow[0],E.brow[1]);
    if(side<0) placeFeat(g,L,24,N34.eyeN,1); else placeFeat(g,L,40,N34.eyeF,N34.sxF); }
  if(E.blush){ for(let dx=0;dx<4;dx++) g[44][N34.blushN+dx]={c:FP.blush,r:'face'}; for(let dx=0;dx<3;dx++) g[44][N34.blushF+dx]={c:FP.blush,r:'face'}; }
  if(E.tear&&blink!==2) faceTear(g,N34.tearX,cyR+4);
  const M=gridF(); mouth(M,talk?E.mt:E.m); placeFeat(g,M,32,N34.mouth,N34.sxM);
  return g;
}
/* ---------- 斜めの顔・みんな（0.5.8）----------
   ノアと同じ考えを、型・髪型・服の指定（DEF）から描く。頭は横の輪切りの重なりと見て、人ごとの角度（ANG34）だけ回す。
   輪郭・耳・鼻・首は斜めの形で描き、髪・帽子・服・ひげは正面の形を回して置き、目・眉・口は正面の道具で描いてから置く。
   光は顔の向く側（右上）から。角度は人ごとに変える（ヒロさん「向きの角度でも個性が出る」）。ノアは 0.5.7 の手描きのまま */
const ANG34={ines:30,kiran:35,dagny:38,kenta:25,amara:32,elif:42,bogdan:38,pablo:30,sione:42,luca:25,lucia:25,pema:28,felix:45,oyuna:36,hana:45,jun:45,kwame:32,dewi:30,mireille:40,layla:45,zoe:33,linh:42,berta:34,solveig:36,tuya:34,yasmin:36,yura:38};   // 25 正面より・35 ノアと同じ・45 横向き
ART.ANG34=Object.assign({noa:35},ANG34);
const FLIP34={dagny:'hair',lucia:'hat',layla:'hat',ines:'hat'};   // 目じるしの髪や小物が奥に隠れる人は、正面の形を左右反転してから回す
const SPEC_INES34={id:'ines',base:'f',fem:1,hs:'pony',hat:'band',hatC:FACE_PAL_INES.band,cl:{b:FACE_PAL_INES.shirt,neck:'round',apron:FACE_PAL_INES.over}};
function model34(H,deg){
  const th=deg*Math.PI/180, c=Math.cos(th), s=Math.sin(th), X0=24-2*s, r=s/0.574;
  const wf=Y=>{ if(Y<=27){ const q=1-((Y-H.cy)/H.ry)**2; return q>0?H.rx*Math.sqrt(q):0; } return Y<=H.bot?Math.max(0.6,H.jaw(Y)):0; };
  // 0.5.9：あごは、耳の下からえらの角（Yg）まではほぼまっすぐ下り、そこからあご先へ向かう（ヒロさん「あごの形がおかしい」）
  // 1.1（0.31.1）：ヒロさん「斜め向きのほほから顎にかけての輪郭がおかしい。あごが尖りすぎている」。
  //   前は、えらの角でいきなり折れて、まっすぐな斜めの線であご先へ細くなっていた（V の字）。
  //   いまは、えらの角から少しずつ曲がり、あご先に近いほど横へ流れて、丸いあご先（幅を広く・下の面も少し見える）に着く
  const w27=wf(27), Yg=H.bot-7, wg=Math.max(H.jaw(Yg),w27*0.86), cw=Math.max(3.6,H.jaw(H.bot)*0.95), F27=w27*1.02-1.5;
  const sec=Y=>{
    if(Y<=27){ const w=wf(Y); return {w,z0:-1.5,d:w*1.02,p:2.2}; }
    if(Y<=Yg){ const t=(Y-27)/(Yg-27), w=w27+(wg-w27)*t*t, F=F27+(11.5-F27)*t; return {w,z0:-1.5,d:F+1.5,p:2.2-0.3*t}; }
    const t=Math.min(1,(Y-Yg)/(H.bot-Yg)), w=wg+(cw-wg)*Math.pow(t,1.7), F=11.5-2*Math.pow(t,2.5), z0=-1.5+(F-1.7)*Math.pow(t,1.6);
    return {w,z0,d:F-z0,p:1.9}; };
  const zf=(u,S)=>S.z0+S.d*Math.pow(Math.max(0,1-Math.pow(Math.min(1,Math.abs(u)/S.w),S.p)),1/S.p);
  const px=(u,z)=>X0+u*c+z*s;
  return {c,s,X0,sec,zf,px,cb:24-3*r,kn:1+0.08*r,kf:1-0.18*r};
}
function face34Table(M,H){ const T=[];   // 1.2：行・列は 64 の格子。near・far・U（正面の横の位置 u）は 48 の座標
  for(let y=0;y<FN;y++){ const Y=(y+0.5)*FK, S=M.sec(Y); if(S.w<0.6||Y<H.cy-H.ry+1||Y>H.bot){ T.push(null); continue; }
    const U=new Array(FN).fill(null); let mx=-1e9, near=1e9, far=-1e9;
    for(let u=-S.w;u<=S.w+1e-6;u+=0.04){ const x=M.px(u,M.zf(u,S)); if(x<near) near=x; if(x>far) far=x; if(x>mx){ mx=x; const xi=Math.floor(x/FK); if(xi>=0&&xi<FN&&U[xi]==null) U[xi]=u; } }
    for(let x=1;x<FN;x++) if(U[x]==null&&U[x-1]!=null&&(x+0.5)*FK<=far) U[x]=U[x-1];
    T.push({near,far,U,S}); }
  return T; }
/* 正面の形の層 L を、頭の丸み（C の楕円）に沿って回して g に置く。front：顔側の面、back：後ろ頭の面。丸みの外は板として置く */
function warpCap(g,L,M,C,mode,opt){
  for(let y=0;y<FN;y++){ const Y=(y+0.5)*FK, q=1-((Y-C[2])/C[1])**2, wh=q>0?C[0]*Math.sqrt(q):0, dh=Math.min(wh,13.5), inv=new Array(FN).fill(null);
    const Sf=opt.H&&Y>=opt.H.cy-opt.H.ry+1&&Y<=opt.H.bot?M.sec(Y):null, wF=Sf&&Sf.w>0.6?Sf.w:0;   // 顔のある行では、髪は顔の面から 1.5 より前に出さない
    if(wh>0.5){ let ext=mode==='front'?-1e9:1e9;
      for(let u=-wh;u<=wh+1e-6;u+=0.05){ const k=Math.sqrt(Math.max(0,1-(u/wh)**2)); let z=mode==='front'?-1.5+dh*k:-1.5-1.15*wh*k;
        if(mode==='front'&&wF){ const lim=(Math.abs(u)<wF?M.zf(u,Sf):Sf.z0)+1.5; if(z>lim) z=lim; }
        const x=M.px(u,z);
        if(mode==='front'?x>ext:x<ext){ ext=x; const xi=Math.floor(x/FK); if(xi>=0&&xi<FN&&inv[xi]==null) inv[xi]=u; } } }
    for(let x=0;x<FN;x++){ let p=null; const u=inv[x], Xc=(x+0.5)*FK;
      if(opt.trim&&wF&&Y>opt.trim&&Y<34&&((u!=null&&u<0&&u>-wF+0.9&&u<-wF+3.6)||(u==null&&Xc<M.X0&&Xc>M.px(-wF+0.9,M.zf(-wF+0.9,Sf))))){ continue; }   // 1.0：手前のこめかみを覆う横の房は描かない（板のように見えるため）
      if(u!=null){ const xi=Math.floor((24+u)/FK); if(xi>=0&&xi<FN) p=L[y][xi];
        if(p&&opt.farLow&&wF&&u>wF-1.5&&Y>24){ const t=g[y][x]; if(t&&(t.r==='skin'||t.r==='face')) p=null; } }   // 奥のほおの横の髪は顔の後ろ
      if(!p){ const zs=mode==='front'?0:-3, us=(Xc-M.X0-zs*M.s)/M.c;
        if(Math.abs(us)>=wh){ const xi=Math.floor((24+us)/FK); if(xi>=0&&xi<FN) p=L[y][xi];
          if(p&&opt.farLow&&us>0&&Y>24){ const t=g[y][x]; if(t&&(t.r==='skin'||t.r==='face')) p=null; } } }   // 奥の下へ垂れる髪は顔の後ろ
      if(p){ g[y][x]=p; if(p.cov&&opt.cov) opt.cov.push([x,y,p]); } } } }
const CURL34=['.LL.','L...','...D','.DD.'];
function curl34(x,y,l,n){ if(n===2) return (x%2===0&&y%2===0)?Math.max(0,l-1):l; const o=(Math.floor(y/4)%2)*2, c=CURL34[y%4][(x+o)%4]; return c==='L'?Math.max(0,l-1):c==='D'?Math.min(4,l+1):l; }
/* 正面の形で、前髪（F）・後ろ髪（B）・はげ頭（K）の層を作る。lightR のときは光を右上からにする */
function hair34Layers(S,H,HS,P,lightR){
  const C=HS.C||H.cap, F=gridF(), B=gridF(), K=gridF(), each=eachF;
  const strand=(X,Y)=>strandF(X,Y), L=X=>lightR?48-X:X;
  const inF=(X,Y)=>Y<=27?((X-24)/H.rx)**2+((Y-H.cy)/H.ry)**2<=1:Y<=H.bot&&Math.abs(X-24)<=H.jaw(Y);
  if(HS.back) each((x,y,X,Y)=>{ if(!HS.back(X,Y)) return; let l=3; if(HS.curly) l=curl34(x,y,l,4); else if(strand(X+1,Y)) l++; B[y][x]={c:P.hair[Math.min(4,l)],r:'hair',h:1,bk:1}; });
  if(HS.skull) each((x,y,X,Y)=>{ if(!HS.skull(X,Y)) return; const Xl=L(X); let l=1; if(Math.hypot(Xl-19,Y-13)<3.4) l=0; if(Xl>24+C[0]*0.55) l=2; if(Xl>24+C[0]*0.86) l=3; K[y][x]={c:P.skin[l],r:'skin'}; });
  const ring0=C[0]*0.64, cov=(S.post||[]).includes('cover');
  each((x,y,X,Y)=>{ const xb=X-0.5; if(!HS.front(X,Y,xb)) return; let l; const Xl=L(X);
    if(Y>C[2]+2&&Math.abs(X-24)>H.rx-3){ l=Xl<24?2:3; if(strand(X,Y)) l++; }
    else { const nx=(Xl-24)/18,ny=(Y-(C[2]-4))/18,nz=Math.sqrt(Math.max(0.05,1-nx*nx-ny*ny)),v=-nx*0.55-ny*0.62+nz*0.5; l=v>0.72?1:v>0.4?2:v>0.12?3:4;
      const ring=Math.hypot(Xl-22,Y-(C[2]-1.5))-ring0, onR=Xl<31&&Y<C[2]-4;
      if(!HS.curly&&!HS.tex){ if(Math.abs(ring)<0.9&&onR&&(Math.floor(Xl/3)%2===0)) l=0; else if(Math.abs(ring)<1.9&&onR&&l>1) l=1; }
      else if(Math.abs(ring)<2&&onR&&l>1) l=1;
      if(HS.bang&&Y>HS.bang(xb)-1.5&&Y<27&&X>9&&X<39) l=Math.max(l,3);
      if(!HS.curly&&!HS.tex&&HS.bang&&lnD(X+2.5,5)<0.38&&Y>11&&Y<HS.bang(xb)) l=Math.max(l,3);
      if(HS.comb&&l<=2&&l>0&&Math.floor((X-24)*14/(Y+4)+100)%3===0) l++; }
    if(HS.curly) l=curl34(x,y,l,4); else if(HS.tex) l=curl34(x,y,l,HS.tex);
    let keep=0; if(HS.lv){ const l2=HS.lv(X,Y,x,y,l); if(l2!==l) keep=1; l=l2; }   // 三つ編みなどの模様はそのまま
    F[y][x]={c:keep?hairRamp(P)[H57[Math.max(0,Math.min(4,l))]]:P.hair[Math.min(4,l)],r:'hair',h:1,keep,cov:cov&&Y>=21&&X>25&&X<37&&inF(X,Y)}; });
  return {F,B,K};
}
/* 顔の肌に乗る物（そばかす・しわ・ひげ）を正面の形で（64 の格子） */
function tex34(S,H,HS,P){
  const T=gridF(), set=(x,y,c,r,o)=>{ if(x>=0&&y>=0&&x<FN&&y<FN) T[y][x]=Object.assign({c,r},o||{}); }, each=eachF;
  const inF=(X,Y)=>Y<=27?((X-24)/H.rx)**2+((Y-H.cy)/H.ry)**2<=1:Y<=H.bot&&Math.abs(X-24)<=H.jaw(Y);
  if(S.freckle) for(const [x,y] of FRECKLE64) set(x,y,P.skin[3],'skin');
  if(S.old) for(const [x,y] of OLDLINE64) set(x,y,mixC(P.skin[2],P.skin[3],0.5),'skin');
  if(HS.skull) skullLines64((x,y,c)=>set(x,y,c,'skin'),P.skin[2]);
  if(S.stub) each((x,y,X,Y)=>{ if(!inF(X,Y)||Y<34.2) return; const ax=Math.abs(X-24),j=H.jaw(Math.max(27,Y)); if(!(ax>=j-4.4||Y>=38.2||(Y<=35.2&&ax<=3.4))) return; set(x,y,null,'skin',{stub:1}); });
  if(S.beard==='goatee') each((x,y,X,Y)=>{ if(Y>=37.8&&Y<=H.bot+0.6&&Math.abs(X-24)<=2.6-(Y>40?(Y-40)*1.5:0)) set(x,y,P.hair[X<24?3:2],'hair'); });
  if(S.beard==='jaw') each((x,y,X,Y)=>{ if(Y<29||Y>H.bot+0.8) return; const ax=Math.abs(X-24),j=H.jaw(Math.max(27,Math.min(Y,H.bot)));
    if((ax<=j&&ax>=j-1.8)||(Y>=38.4&&ax<=j+0.3)||(Y>=33.9&&Y<=34.9&&ax<=3.4&&ax>=0.6)) set(x,y,P.hair[(X<24?3:2)+(hash(x,y,5)>0.72?1:0)],'hair'); });
  return T;
}
/* 後ろ頭：頭の手前のふちより後ろを、髪（はげ頭は肌、帽子の人は帽子）でうめる */
function backFill34(g,M,C,H,HS,P,Hl,nape){
  for(let y=0;y<FN;y++){ const Y=(y+0.5)*FK, q=1-((Y-C[2])/C[1])**2; let wh=q>0?C[0]*Math.sqrt(q):0;
    if(Y>C[2]&&Y<=nape) wh=Math.max(wh,H.rx*0.82); if(Y>nape||wh<0.5) continue;
    const xn=M.X0-wh*M.c-1.5*M.s, xb=M.X0-1.5*M.s-Math.sqrt((wh*M.c)**2+(1.15*wh*M.s)**2), hs=Hl[y][Math.max(0,f64(Math.floor(24-wh+0.6)+0.5))];
    for(let x=Math.max(0,Math.floor(xb/FK));x<=Math.min(FN-1,Math.ceil((xn+1.5)/FK));x++){ const X=(x+0.5)*FK; if(X<xb||X>xn+1.5) continue; let p;
      const t=(X-xb)/Math.max(1,xn+1.5-xb);   // 0 後ろのふち（影）〜1 顔の側
      if(hs) p={c:hs.c,r:hs.r};
      else if(HS.skull&&(Y<18.6+t*2.4||(t>0.82&&Y<25))){ const R=skinRamp(P); let k=t<0.22?6:t<0.5?5:4; if(Y<C[2]-C[1]*0.62&&k>3) k--; p={c:R[k],r:'skin',k}; }   // 1.0：はげ頭の後ろは肌の影（灰色の四角にしない）
      else { const HR=hairRamp(P); let l=t<0.2?6:t<0.45?5:t<0.8?4:3; if(Y<C[2]-C[1]*0.55&&l>2) l-=2; else if(Y<C[2]-C[1]*0.2&&l>2) l--;
        if(lnD(X-0.5+Math.floor(Y/5),5)<0.38&&l<6) l++; p={c:HR[l],r:'hair',h:1,bk:1}; }
      g[y][x]=p; } } }
/* 1.0：斜めの髪は、正面の形を回して置いたあと、画面の上で頭の丸みから塗り直す（正面の影の境が四角いかたまりにならないように）。
   光は向いている側の上の手前から。巻き毛・短い縮れ毛は小さな模様、まっすぐな髪は毛すじとつやの帯。三つ編みの模様は残す */
function reshade34(g,M,C,HS,P){ const HR=hairRamp(P), Xc=M.X0-1.5*M.s, r0=C[0]*0.64;
  for(let y=0;y<FN;y++)for(let x=0;x<FN;x++){ const p=g[y][x]; if(!p||!p.h||p.keep) continue; const X=(x+0.5)*FK,Y=(y+0.5)*FK;
    let nx=(X-Xc)/(C[0]+1.5), ny=(Y-C[2])/(C[1]+1.5); if(nx*nx+ny*ny>0.94) ny=Math.min(ny,0.2);   // 頭の外（下へ垂れる髪）は筒のように
    nx=Math.max(-0.97,Math.min(0.97,nx)); ny=Math.max(-0.97,Math.min(0.97,ny)); const nz=Math.sqrt(Math.max(0.04,1-nx*nx-ny*ny));
    const lam=0.2*nx-0.5*ny+0.84*nz; let l=lam>0.84?2:lam>0.6?3:lam>0.36?4:lam>0.14?5:6;
    if(p.bk) l=Math.max(l,X<Xc-C[0]*0.55?4:3);   // 1.2：後ろ頭でも、こめかみに近い所は暗くしすぎない（黒い四角に見えないように）
    if(HS.skull) l=Math.max(1,l-2);   // はげ頭の横の白髪は明るく
    if(!HS.curly&&!HS.tex){ const rg=Math.hypot(X-(Xc+2),Y-(C[2]-1.5))-r0;
      if(Y<C[2]-3.5&&X>Xc-7&&!p.bk){ if(Math.abs(rg)<0.7) l=(Math.floor(X/2.6)%2===0)?0:1; else if(Math.abs(rg)<1.6&&l>2) l=2; }
      // 1.2：毛すじは頭のてっぺんから放射状に流す（前は縦の線で、横の髪がすだれのように見えた）
      const ax=X-(Xc+1), ay=Y-(C[2]-C[1]*0.85), rr=Math.hypot(ax,ay), an=Math.atan2(ax,ay);
      if(l>0&&l<6&&rr>3){ const w=0.36/rr; if(lnD(an,0.36)<w) l++; else if(lnD(an+0.75/rr,0.36)<w&&l>1) l--; } }   // 毛すじと、その横の光
    else if(HS.curly){ const o=(Math.floor(y/4)%2)*2, c=CURL34[y%4][(x+o)%4]; if(c==='L') l=Math.max(1,l-1); else if(c==='D') l=Math.min(6,l+2); }
    else if(x%2===0&&y%2===0) l=Math.max(1,l-1);
    const dn=y<FN-1?g[y+1][x]:null; if(dn&&(dn.r==='skin'||dn.r==='face')&&l<6) l++;   // 毛先の下側
    g[y][x]={c:HR[l],r:'hair',h:1}; } }
function face34Gen(who,E,blink,talk){
  const S=who==='ines'?SPEC_INES34:FSPEC[who], H=HEAD[S.base], P=FP, M=model34(H,ANG34[who]||35), N=FN, g=gridF(), c64=v=>(v+0.5)*FK;
  const HS=HAIR[S.hs](S,H), C=HS.C||H.cap, fl=FLIP34[who]||'', fH=fl==='hair', mir=L=>L.map(r=>r.slice().reverse());
  // 正面の形で髪・帽子・はげ頭の層を作る（帽子は前髪の層との差分）
  const Ly=hair34Layers(S,H,HS,P,!fH), G2=Ly.F.map(r=>r.slice()); hatGen(G2,S,H,HS,P);
  let Hl=G2.map((r,y)=>r.map((p,x)=>p!==Ly.F[y][x]?p:null)), Fh=Ly.F, Bh=Ly.B, Kh=Ly.K;
  if(fH){ Fh=mir(Fh); Bh=mir(Bh); Kh=mir(Kh); Hl=mir(Hl); } else if(fl==='hat') Hl=mir(Hl);
  if(HS.skull) Fh=gridF();   // 1.0：はげ頭の横の髪は、正面の房を回さず、後ろ頭の髪の帯（backFill34）で描く
  // 後ろ頭・後ろ髪
  backFill34(g,M,C,H,HS,P,Hl,HS.skull?27.5:32);
  if(HS.back) warpCap(g,Bh,M,C,'back',{});
  // 首（あごの下は影）
  const nk=H.neck, nl=Y=>M.cb-nk*M.kn+0.6+(Y-33)*0.15, nr=M.cb+nk*M.kf+2.4, neck=(X,Y)=>Y>=30&&Y<44&&X>=nl(Y)&&X<=nr;
  { const R=skinRamp(P); eachF((x,y,X,Y)=>{ if(!neck(X,Y)) return; const k=X<nl(Y)+2?6:X>nr-1.2?5:Y<H.bot+1.5?6:5; g[y][x]={c:R[k],r:'skin',k}; },f64(30),f64(44)+1); }   // 首はあごの影の中
  // 服（体は顔より少し横を向く。手前の肩が広い。光が右から当たるよう正面の服を左右反転して使う）
  const Lc=gridF(); clothGen(Lc,S,H,P); const Lm=mir(Lc);
  eachF((x,y,X,Y)=>{ const xi=f64(24+(X-M.cb)/(X<M.cb?M.kn:M.kf)); if(xi<0||xi>=FN) return; const p=Lm[y][xi]; if(!p||(p.r==='skin'&&Y<40)) return; g[y][x]=p; },f64(33));
  if(HS.skull) warpCap(g,Kh,M,C,'front',{H});
  // 顔：手前の横の面は少し影。あごの下も影
  const FT=face34Table(M,H), inF=(x,y)=>{ const t=FT[y]; if(!t) return false; const X=c64(x); return X>=t.near&&X<=t.far; };
  const Sc=M.sec(31.5), xcl=M.px(-5.5,M.zf(-5.5,Sc)), R=skinRamp(P);
  // 1.0：面の向き（頭の輪切りの傾き）から明るさを決める。板のような影にしない
  for(let y=0;y<N;y++){ const t=FT[y]; if(!t) continue; const Y=c64(y), Sx=t.S;
    const ny=Y<=27?(Y-H.cy)/(H.ry+4):(27-H.cy)/(H.ry+4)+Math.pow(Math.min(1,(Y-27)/(H.bot-27)),1.6)*0.82, f=Math.sqrt(Math.max(0.05,1-ny*ny));
    for(let x=0;x<N;x++){ if(!inF(x,y)) continue; const X=c64(x); let u=t.U[x]; if(u==null) u=X<24?-Sx.w:Sx.w;
      const d=0.45, dz=(M.zf(Math.min(Sx.w,u+d),Sx)-M.zf(Math.max(-Sx.w,u-d),Sx))/(Math.min(Sx.w,u+d)-Math.max(-Sx.w,u-d)||1);
      const nl=Math.hypot(dz,1), nu=-dz/nl, nz=1/nl, nxs=nu*M.c+nz*M.s, nzs=-nu*M.s+nz*M.c;
      let k=litK(0.3*nxs*f-0.4*ny+0.87*nzs*f);
      if(Y>H.bot-1.8&&X<t.near+2.6) k=Math.max(k,5);
      if((X-xcl)**2+(Y-31.6)**2<1.6&&k<=2) k=1;   // 手前のほおの光
      g[y][x]={c:R[k],r:'skin',k}; } }
  // 耳（手前だけ）
  const Se=M.sec(28.5), ex=M.px(-Se.w,Se.z0)-0.9, ey=28.4, erx=H.ear[0]*(0.75+0.55*M.s), ery=H.ear[1]*1.03;
  if(HS.skull) eachF((x,y,X,Y)=>{ const p=g[y][x]; if(!p||p.r!=='skin'||inF(x,y)) return;   // はげ頭：耳の後ろから後ろ頭へ、横の髪の帯
    if(X<ex+erx*0.2-(Y<21?(21-Y)*1.6:0)) g[y][x]={c:P.hair[2],r:'hair',h:1}; },f64(19),f64(28));
  eachF((x,y,X,Y)=>{ if(X>26) return; const e=((X-ex)/erx)**2+((Y-ey)/ery)**2; if(e>1) return;   // 1.0：耳はふち・くぼみ・顔との境の3段で、ほおと見分けられるように
    let k=e>0.5?3:5; if(X>ex+erx*0.45) k=6; else if(Y>ey+ery*0.55) k=4; if(e<0.18) k=6;
    if(e>0.62&&X<ex-erx*0.2&&Y<ey+ery*0.3) k=2;   // 1.2：耳のふち（外側の上）は光
    g[y][x]={c:R[k],r:'skin',k}; },f64(22),f64(35));
  // 鼻：鼻すじの影は手前（左）に落ちる。横を向くほど鼻先が輪郭から出る（1.2：64 で描き直し）
  const mX=M.px(0,M.zf(0,M.sec(31.5))), m=Math.floor(mX/FK), ns=(0.7+0.3*H.nose)*2*M.s, tip0=Math.floor(mX)+1;
  eachF((x,y,X,Y)=>{ if(X<mX-0.8||inF(x,y)) return; const k=lerpPts([[30.6,0],[31.5,0.3],[32.5,0.7],[33.5,1.15],[34.3,0.9],[35,0.2]],Y); if(Y<30.6||Y>35||X>tip0+k*ns) return; g[y][x]={c:R[X>tip0+k*ns-0.8&&Y>33?3:2],r:'skin',k:2}; },f64(30.6),f64(35)+1);
  const noseShade=()=>{ const mm={}; for(let i=0;i<8;i++) mm[i]=R[i];
    if(H.nose>=2) dots(g,m-1,41,H.nose===3?['4....','4....','5.0..','.50..','56...','.7666']:['4...','4...','5.0.','.50.','.6..','.766'],mm,'skin');
    else dots(g,m-1,42,['4...','.5..','.50.','..66'],mm,'skin'); };
  // あごの線（顔の下か左が首なら濃い線）
  for(let y=f64(28);y<f64(43);y++)for(let x=1;x<N-1;x++){ if(!inF(x,y)) continue; const nb=(xx,yy)=>{ const q=g[yy]&&g[yy][xx]; return q&&q.r==='skin'&&!inF(xx,yy)&&neck(c64(xx),c64(yy)); };
    if(nb(x,y+1)||nb(x-1,y)) g[y][x]={c:P.skin[4],r:'skin'}; }
  // そばかす・しわ・ひげ（顔の面に沿って置く）
  const Tx=tex34(S,H,HS,P);
  for(let y=0;y<N;y++){ const t=FT[y]; if(!t) continue; for(let x=0;x<N;x++){ if(!inF(x,y)) continue; const u=t.U[x]; if(u==null) continue; const xi=f64(24+u), q=xi>=0&&xi<FN?Tx[y][xi]:null; if(!q) continue;
    if(q.stub){ const p=g[y][x]; if(p&&p.r==='skin') g[y][x]={c:mixC(p.c,P.hair[2],hash(x,y,7)>0.5?0.26:0.18),r:'skin'}; } else g[y][x]={c:q.c,r:q.r}; }
    if(S.beard==='jaw'&&c64(y)>=29) for(let x=0;x<N;x++) if(inF(x,y)&&c64(x)>t.far-1.8) g[y][x]={c:P.hair[3],r:'hair'}; }
  // 前髪・横の髪
  const TRIM34={neat:1,soft:1,curly:1,crop:1,bun:1,spiky:1,messy:1};   // 短い髪：手前のこめかみの房は描かず、耳を見せる
  // 1.2：短い髪は、こめかみから下の手前の房を描かない範囲を広げ（25.5→20）、耳の前に細いもみあげを置く（フェリクス・キランのこめかみのかたまり）
  let cov=[]; warpCap(g,Fh,M,C,'front',{farLow:true,cov,H,trim:TRIM34[S.hs]?20:0});
  if(TRIM34[S.hs]&&!S.hat) for(let y=f64(16);y<=f64(ey-ery*0.3);y++){ const t=FT[y]; if(!t) continue; const Y=c64(y), w=1.7-(Y-16)*0.07;
    for(let x=0;x<N;x++){ const X=c64(x), p=g[y][x]; if(X<t.near-0.3||X>t.near+w||!p||p.r!=='skin') continue; g[y][x]={c:P.hair[3],r:'hair',h:1}; } }
  reshade34(g,M,C,HS,P); cov=cov.map(([x,y])=>[x,y,g[y][x]]);
  // 髪の落とす影（おでこ）
  hairShadow(g,P);
  // 帽子・小物
  warpCap(g,Hl,M,C,'front',{farLow:true,H});
  // 目・眉・口
  feat34(g,M,S,E,blink,talk,FT[f64(Math.floor(ST.eye.cy-1.5)+0.5)].far);
  noseShade();   // 鼻は奥の目より手前なので、目のあとに
  for(const [x,y,p] of cov) g[y][x]=p;   // 目にかかる前髪
  return g;
}
function feat34(g,M,S,E,blink,talk,farE){
  const B=ST.eye, cy=Math.floor(B.cy-1.5), Sy=M.sec(cy+0.5), ue=6.5;   // 0.5.9：目は小さく、少し上に
  const ex=u=>M.px(u,M.zf(u,Sy)-1.2), dx=u=>(ex(u+0.2)-ex(u-0.2))/0.4, dN=dx(-ue);
  const sxF=Math.max(0.42,Math.min(1,Math.pow(Math.max(0.01,dx(ue))/dN,0.4)));
  let eN=ex(-ue), eF=ex(ue); eF=Math.max(eF,eN+4.2+4.2*sxF+0.6);
  eF=Math.min(eF,farE-1.5-3.6*sxF); eN=Math.min(eN,eF-(3.6+3.6*sxF+1.2));   // 奥の目は輪郭の内側に。手前の目はその分左へ
  const to64=v=>Math.round((v+0.5)/FK-0.5);   // 48 の座標（ドットの左の端）→ 64 の番号
  eN=to64(Math.round(eN)); eF=to64(Math.round(eF));
  const F=gridF(), cy64=p64(cy);
  for(const side of [-1,1]){ const cx=side<0?24:40; let o=Object.assign({},E.eye);
    if(!o.closed&&blink===1) o.top=Math.max(o.top||0,1), o.noLower=false;
    if(!o.closed&&blink===2) o={closed:'blink'};
    eyeR(F,cx,cy64,side,o); brow(F,cx,(ST.fem?25:23)/FK-0.5,side,E.brow[0],E.brow[1]); }
  faceCheek(F,E,[22,40],46,[20,42],44);
  if(E.tear&&blink!==2) faceTear(F,20,cy64+4);
  const st0=ST; ST=Object.assign({},ST,{eye:Object.assign({},B,{cy,rx:3.3,ry:1.6})});   // めがね・化粧は小さい目に合わせる
  facePost(F,Object.assign({},S,{post:(S.post||[]).filter(k=>k!=='mustache'&&k!=='cover')})); ST=st0;
  // 顔か髪の上にだけ置く。奥を先に、手前をあとに
  const put=(L,sc,dc,sx,half)=>{ for(let y=0;y<FN;y++) for(let xt=dc-18;xt<=dc+18;xt++){ if(xt<0||xt>=FN) continue; const xs=sc+Math.round((xt-dc)/sx); if(xs<0||xs>=FN) continue;
    if((half<0&&xs>=32)||(half>0&&xs<32)) continue; const p=L[y][xs]; if(!p) continue; const t=g[y][xt]; if(!t||t.r==='cloth') continue; g[y][xt]=p; } };
  put(F,40,eF,sxF,1); put(F,24,eN,1,-1);
  const Mo=gridF(); mouth(Mo,talk?E.mt:E.m); if((S.post||[]).includes('mustache')) facePost(Mo,{post:['mustache']});
  const mC=to64(Math.round(M.px(0,M.zf(0,M.sec(36.5)))-0.4-1.3*M.s)), sxM=Math.max(0.55,Math.min(1,Math.pow(M.c/dN,0.6)));
  put(Mo,32,mC,sxM,0);
}
/* 0.83.0 顔グラの仕上げ（11/15 ヒロさん「顔グラフィックを徹底的にブラッシュアップ」）。全員に同じ道具でかける
   ・白目の上と目頭の影を、青灰色から肌になじむ色に（目のまわりが四角い枠に見えないように）
   ・まつげの線は目頭の側を肌の影に寄せて細く見せる（目が判子のように見えないように）
   ・髪のつや：頭の丸みに沿った明るい帯（下のふちはぎざぎざ。光の側を強く）
   ・頬の赤みは、下の肌と混ぜたやわらかい色に
   ・輪郭の色：上と光の側（正面は左・斜めは向いている側）は、中の色に寄せて明るく。影の側は今までの濃い線 */
const FPX=new Map();
function finePal(P){ let q=FPX.get(P); if(!q){ q=Object.assign({},P,{eyeWs:mixC('#ffffff',P.skin[2],0.5),eyeSc:mixC('#ffffff',P.skin[1],0.22),eyeSb:mixC('#ffffff',P.skin[2],0.3)}); FPX.set(P,q); } return q; }
function nearIdx(R,c){ let bi=0,bd=1e9; const L=lum(c); for(let i=0;i<R.length;i++){ const d=Math.abs(lum(R[i])-L); if(d<bd){ bd=d; bi=i; } } return bi; }
function hairSheen(g,P,lit,S){
  if(S&&(S.hat==='cook'||S.hat==='cap'||S.hs==='bald')) return;
  const R=hairRamp(P), N=FN; let top=N;
  for(let x=Math.floor(N*0.3);x<N*0.7;x++) for(let y=0;y<N;y++){ const p=g[y][x]; if(!p) continue; if(p.r==='hair'&&y<top) top=y; break; }   /* 列のいちばん上が髪のときだけ */
  if(top>=N*0.42) return;
  const row=top+8; let xl=N,xr=-1; for(let x=0;x<N;x++){ const p=g[row]&&g[row][x]; if(p&&p.r==='hair'){ if(x<xl) xl=x; if(x>xr) xr=x; } }
  if(xr-xl<14) return;
  const hw=(xr-xl)/2, cx=(xl+xr)/2+lit*hw*0.12;
  for(let x=xl;x<=xr;x++){ const u=(x-cx)/hw; if(Math.abs(u)>0.8) continue;
    const y0=Math.round(top+4+u*u*10), t=[2,3,2,1][x&3]+(Math.abs(u)<0.4?1:0), st=lit*u>-0.3?2:1;
    for(let y=y0;y<y0+t;y++){ const p=g[y]&&g[y][x]; if(!p||p.r!=='hair') continue; const k=nearIdx(R,p.c), d=(y===y0+t-1&&t>1)?1:st; g[y][x]={c:R[Math.max(0,k-d)],r:'hair',h:p.h}; } } }
function softBlush(g,P){ const N=FN, B=[P.blush,P.cheek].filter(Boolean), L=[];
  for(let y=1;y<N-1;y++)for(let x=1;x<N-1;x++){ const p=g[y][x]; if(!p||p.r!=='face'||!B.includes(p.c)) continue; let base=null;
    for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1],[-1,1],[1,1],[0,-2],[0,2]]){ const q=g[y+dy]&&g[y+dy][x+dx]; if(q&&q.r==='skin'){ base=q.c; break; } }
    if(base) L.push([x,y,mixC(base,P.blush||p.c,p.c===P.blush?0.55:0.38),base]); }
  for(const [x,y,c,b] of L){ g[y][x]={c,r:'face'}; for(const dx of [-1,1]){ const q=g[y][x+dx]; if(q&&q.r==='skin') g[y][x+dx]={c:mixC(q.c,P.blush||c,0.2),r:'skin',k:q.k}; } } }
ART.face=function(...a){
  let who='noa'; if(ART.FACES.includes(a[0])) who=a.shift();
  let [ex,blink,talk,yaw]=a; yaw=Math.sign(yaw|0); const E=EXPR[ex]||EXPR.normal;   // 0.5.8：向きは 0 正面・1 右向き・-1 左向き（2 や -2 も受ける）。上下の向きはやめた
  const key=who+'|'+ex+'|'+(blink||0)+'|'+(talk||0)+'|'+yaw; if(FACEC[key]) return FACEC[key];
  WHO=who; SPEC=FSPEC[who]||null; COVER=[];
  FP=finePal(who==='ines'?FACE_PAL_INES:SPEC?SPEC.pal:FACE_PAL); ST=who==='ines'?STY_INES:SPEC?SPEC.st:STY_NOA;   /* 0.83.0 finePal */
  const S83=who==='ines'?SPEC_INES34:SPEC, lit=yaw>0?1:-1;
  { const e=ST.eye, f=ST.fem; ST=Object.assign({},ST,{eye:Object.assign({},e,{rx:e.rx*(f?0.86:0.9),ry:e.ry*(f?0.62:0.82),ir:e.ir*(f?0.72:0.85),cy:e.cy+(f?0.4:0.2)})}); }   /* 0.83.0 目を小さく細く（11/15 ヒロさん「眼球が大きすぎる・子供向きすぎる」） */
  let g;
  if(yaw){ g=who==='noa'?face34(E,blink,talk):face34Gen(who,E,blink,talk); hairSheen(g,FP,1,S83); softBlush(g,FP); if(yaw<0) g=g.map(r=>r.slice().reverse()); }   /* 0.83.0 つやと頬は左右反転の前に */   // 一人一角度の斜めの顔。左向きは左右反転
  else { g=faceBase();
  const B=ST.eye, cy=p64(B.cy);
  for(const side of [-1,1]){ const cx=side<0?24:40;
    let o=Object.assign({},E.eye);
    if(!o.closed&&blink===1) o.top=Math.max(o.top||0,B.ry*0.72), o.noLower=false;
    if(!o.closed&&blink===2) o={closed:'blink'};
    eye(g,cx,cy,side,o);
    brow(g,cx,23.5/FK-0.5,side,E.brow[0],E.brow[1]); }
  faceCheek(g,E,[22,40],46,[20,42],44);
  if(E.tear&&blink!==2) faceTear(g,18,cy+3);
  mouth(g,talk?E.mt:E.m);
  hairSheen(g,FP,-1,S83); softBlush(g,FP);   /* 0.83.0 */
  if(SPEC) facePost(g,SPEC);   // めがね・口ひげ・化粧・目にかかる前髪など（0.5.3）
  // 内側の線：首とあごの境（0.5.6 で向きを変える前に描くようにした。正面の絵は前と同じ）
  function inChin(x,y){ const Y=(y+0.5)*FK,X=(x+0.5)*FK; if(Y<27||Y>JAW.bot) return false; return Math.abs(X-24)<=JAW.f(Y); }
  for(let y=1;y<FN-1;y++)for(let x=1;x<FN-1;x++){ const p=g[y][x]; if(!p||p.r!=='skin') continue; const up=g[y-1][x];
    if(y>48&&up&&up.r==='skin'&&!inChin(x,y-1)&&inChin(x,y-2)) g[y-1][x]={c:FP.skin[4],r:'skin'}; } }
  polish(g,FP);   // 1.0：はみ出し・穴・段差をならし、顔の横の髪との境に線
  // 輪郭（外側）
  const N=FN,cv=canvas(N,N),c=cv.getContext('2d'),img=c.createImageData(N,N),d=img.data;
  const put=(x,y,col)=>{ const [r,gg,b]=rgb(col),i=(y*N+x)*4; d[i]=r; d[i+1]=gg; d[i+2]=b; d[i+3]=255; };
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){ const p=g[y][x]; if(p){ put(x,y,p.c); continue; }
    let best=null,bl=1e9,bq=null,bd=null; for(const [dx,dy] of D4){ const q=g[y+dy]&&g[y+dy][x+dx]; if(!q) continue; const ol=olCol(q.r); const L=lum(ol); if(L<bl){ bl=L; best=ol; bq=q; bd=[dx,dy]; } }
    if(best){ if(bd[1]===1||(bd[0]!==0&&bd[0]===-lit)) best=mixC(best,bq.c,bq.r==='skin'?0.3:0.42); put(x,y,best); } }   /* 0.83.0 光の側の輪郭は明るく */
  c.putImageData(img,0,0); WHO='noa'; FP=FACE_PAL; ST=STY_NOA; SPEC=null; return FACEC[key]=cv;
};
/* 顔グラのない相手（コモリ・影・作業機）は、マップの絵を2倍にして胸から上を見せる（0.5.1） */
const PORC={};
/* 0.85.0 機械の顔（11/19 ヒロさん「機械の顔グラも少し区別付くように細かくして欲しい」）。
   マップの絵（16×24）を4倍にするのをやめ、戦いの場面の立ち絵（72×100・機械ごとの背中の付け足し・頭の灯・胸のしるし・腕の先・改造の帯と灯の飾り）から
   頭から腰までを 64×64 にそのまま（拡大なし）切り出す。左右は絵の真ん中に合わせ、上は絵のいちばん上の3ドット上から。向きが負（左向き）なら左右反転 */
const PORM=new Map();
function machPortrait(u,yaw){
  const src=ART.tall(u,'idle',0); if(!src) return null;
  let m=PORM.get(src); if(!m){ m={}; PORM.set(src,m); }
  const fl=(yaw||0)<0?1:0; if(m[fl]) return m[fl];
  const W=src.width,H=src.height,d=src.getContext('2d').getImageData(0,0,W,H).data; let x0=W,x1=-1,y0=H;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++) if(d[(y*W+x)*4+3]){ if(x<x0) x0=x; if(x>x1) x1=x; if(y<y0) y0=y; }
  const N=FN, sx=Math.max(0,Math.min(W-N,Math.round((x0+x1+1)/2-N/2))), sy=Math.max(0,Math.min(H-N,y0-3));
  const cv=canvas(N,N), c=cv.getContext('2d'); c.imageSmoothingEnabled=false;
  if(fl){ c.translate(N,0); c.scale(-1,1); }
  c.drawImage(src,sx,sy,N,N,0,0,N,N);
  return m[fl]=cv;
}
ART.portrait=function(u,ex,blink,talk,yaw,pitch){
  if(u.kind==='person'&&u.sub!=='shadow'&&ART.FACE_ID[u.name]) return ART.face(ART.FACE_ID[u.name],ex||'normal',blink||0,talk||0,yaw||0,pitch);
  if(u.kind==='machine'){ const mp=machPortrait(u,yaw); if(mp) return mp; }   /* 0.85.0 */
  const tmp=canvas(16,24), t=tmp.getContext('2d'); const s=ART.tick; ART.tick=0; ART.drawUnit(t,u,0,0,{active:true,calm:true}); ART.tick=s;
  const key=tmp.toDataURL(); if(PORC[key]) return PORC[key];
  const cv=canvas(48,48), c=cv.getContext('2d'); c.imageSmoothingEnabled=false; c.drawImage(tmp,0,0,16,24,-8,-2,64,96);
  return PORC[key]=cv;
};

window.ART=ART;
})();
