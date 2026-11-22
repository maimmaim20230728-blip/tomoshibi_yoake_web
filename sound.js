/* 灯守りの夜明け 音（版 0.84.0・2026-11-15 タイトルの曲を倍の長さで作り直し、前奏・ビブラート・こだま・タム・シンバル・小節ごとの打楽器を足した。版 0.19.0・2026-11-07。0.19.0 で和音の3度と5度をのばす音（pad）を足した。版 0.18.0。0.18.0 で旋律の下にハモりを1音足し、戦いの曲 battleAtk・battleTalk を足した。版 0.15.0・2026-11-06）
   ヒロさん「音楽とかサウンドは作ったの？ マップ音楽は最低3種類＋部の最終マップ＋最終マップ。タイトルグラと音楽もいる。インターミッションのBGMもいる」
   ヒロさんの答え：全部ゲームの中で作る・マップの曲は昼・夜・特別の章・部の最終マップは1曲を共通で。
   ・音のファイルは使わない。Web Audio で、ドット絵に合うチップチューン風（矩形波2つ・三角波のベース・雑音の打楽器）をその場で鳴らす
   ・🔴 Math.random は使わない（戦いの乱数の順番を変えないため）。曲は決まった楽譜、雑音は決まった式で作る
   ・🔴 起動しただけでは鳴らさない。最初に押したとき（Sound.tap）から鳴らす（Capacitor は自動再生の制限を外すため）
   ・🔴 画面を離れている間は止める（visibilitychange・pagehide）
   ・🔴 音を切ったら、すぐ（約0.2秒で）消す。予約した音も止める
   曲：title タイトル／day 昼の章／night 夜の章／special 特別の章／partFinal 部の最終マップ（8・16・24・32章）／final 最終マップ（40章）／interlude 幕間と準備画面
   短い曲：clear クリア／lose 負け。効果音：Sound.se(名前) */
(function(){
'use strict';
const NOTE={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function midi(s){ const m=/^([A-G])([#b]?)(-?\d)$/.exec(s); if(!m) return null; return 12*(+m[3]+1)+NOTE[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0); }
function hz(n){ return 440*Math.pow(2,(n-69)/12); }
/* 和音：根音＋種類（'' 長・m 短・7 属七・m7・maj7・sus4） */
const QUAL={'':[0,4,7],'m':[0,3,7],'7':[0,4,7,10],'m7':[0,3,7,10],'maj7':[0,4,7,11],'sus4':[0,5,7]};
function chordOf(s){ const m=/^([A-G][#b]?)(.*)$/.exec(s); const r=midi(m[1]+'2'); return {root:r,iv:QUAL[m[2]]||QUAL['']}; }

/* ---------- 楽譜（1小節＝16きざみ。旋律は「音名オクターブ.長さ」、休みは r.長さ。小節は | で区切る） ---------- */
const SONGS={
  /* 0.84.0 タイトルの曲を作り直した（11/15 ヒロさん「倍くらいの長さにしてループし、もっとタイトルらしいかっこいい音楽」）。
     前奏4小節（初めの1回だけ）のあと、16小節（約32秒・前の倍）をくり返す。前奏は短調で霧の夜、本編はニ長調で夜明けへ向かう。
     本編の前半は灯台の主題、後半は短調で溜めてから高い音で頂上へ。旋律はビブラートとこだま（ディレイ）つき、ベースは駆け足の刻み */
  title:{name:'タイトル「灯守りの夜明け」',bpm:120,bass:'gallop',introBass:'long',arp:'arp16',introArp:'arp8',lead:'hero',echo:true,loopBar:4,
    drumSeq:'none,none,pulse,build|crash,heroA,heroA,heroFill|crash,heroA,heroA,snareFill|half,half,half,tomBuild|crash,heroA,heroA,snareFill',
    chords:'Dm|Bb|C|Asus4,A|D|A|Bm|G,A|D|C|Bb,C|D|Bm|G|Em|F#|G|A|Bb,C|D',
    mel:'D5.6 A4.2 D5.4 F5.4|F5.6 D5.2 Bb4.8|E5.6 C5.2 G5.4 E5.4|D5.8 C#5.4 E5.4|'+
        'A4.2 D5.2 F#5.4 A5.6 F#5.2|G5.4 F#5.2 E5.2 C#5.4 E5.4|F#5.2 B5.2 D6.4 C#6.4 B5.4|A5.6 G5.2 F#5.4 E5.4|A4.2 D5.2 F#5.4 A5.6 D6.2|E6.4 D6.2 C6.2 G5.8|F5.4 Bb5.4 A5.4 G5.2 E5.2|D5.4 F#5.2 A5.2 D6.8|'+
        'B5.6 A5.2 F#5.4 D5.4|G5.6 F#5.2 D5.4 B4.4|E5.4 G5.4 B5.4 E6.4|C#6.6 A#5.2 F#5.8|D6.4 B5.2 D6.2 G6.8|E6.4 C#6.2 E6.2 A6.8|F6.4 D6.4 E6.4 G6.4|F#6.12 r.4'},
  day:{name:'昼の章「港の昼」',bpm:126,bass:'bounce',arp:'stab',drum:'pop',
    chords:'C|G|Am|F|C|G|F,G|C|Am|Em|F|C|Dm|G|Em,Am|Dm,G',
    mel:'E5.4 G5.2 E5.2 D5.4 C5.4|D5.4 B4.2 D5.2 G5.6 r.2|A5.4 G5.2 E5.2 C5.4 E5.4|F5.6 E5.2 D5.4 C5.4|E5.2 E5.2 G5.4 C6.4 G5.4|B5.4 A5.2 G5.2 D5.8|A5.4 F5.4 G5.2 B5.2 D6.4|C6.8 G5.4 r.4|'+
        'C6.4 B5.2 A5.2 E5.8|G5.4 B5.4 E6.8|F5.2 A5.2 C6.4 A5.4 F5.4|E5.6 G5.2 C6.8|D5.4 F5.4 A5.4 D6.4|B5.6 A5.2 G5.8|E6.4 D6.4 C6.4 A5.4|B5.4 A5.4 G5.4 D5.4'},
  night:{name:'夜の章「霧の夜」',bpm:92,bass:'long',arp:'arp8',drum:'soft',
    chords:'Am|F|Dm|E|Am|F|Dm,E|Am|F|G|Em|Am|Dm|E|F,G|E',
    mel:'r.4 E5.4 A5.4 C6.4|B5.6 A5.2 F5.8|r.4 D5.4 F5.4 A5.4|G#5.8 E5.8|r.4 C6.4 B5.4 A5.4|E6.6 D6.2 C6.8|B5.4 A5.4 G#5.4 B5.4|A5.12 r.4|'+
        'A5.6 C6.2 F5.8|D6.6 B5.2 G5.8|r.4 E5.4 G5.4 B5.4|C6.12 r.4|A5.4 D6.4 F6.4 E6.4|D6.6 C6.2 B5.8|C6.4 A5.4 D6.4 B5.4|G#5.4 B5.4 E5.8'},
  special:{name:'特別の章「灯台からの光」',bpm:104,bass:'march',arp:'stab',drum:'march',
    chords:'D|A|Bm|G|D|A|G,A|D',
    mel:'F#5.8 A5.8|E5.8 C#5.4 E5.4|F#5.4 D5.4 B4.8|G5.6 F#5.2 E5.8|F#5.4 A5.4 D6.8|C#6.6 B5.2 A5.8|B5.4 G5.4 A5.4 C#6.4|D6.12 r.4'},
  partFinal:{name:'部の最終マップ「長い夜」',bpm:138,bass:'drive',arp:'arp16',drum:'rock',
    chords:'Dm|Bb|C|A|Dm|Bb|Gm,A|Dm',
    mel:'D5.2 F5.2 A5.4 D6.2 C6.2 A5.4|Bb5.4 A5.2 F5.2 D5.8|E5.2 G5.2 C6.4 E6.2 D6.2 C6.4|C#6.8 A5.8|D6.2 D6.2 A5.4 F5.2 A5.2 D6.4|F6.4 E6.2 D6.2 Bb5.8|G5.4 Bb5.4 A5.4 C#6.4|D6.8 r.8'},
  final:{name:'最終マップ「夜明けへ」',bpm:146,bass:'drive',arp:'arp16',drum:'rock',
    chords:'Em|C|G|D|Em|C|D|E',
    mel:'E5.2 G5.2 B5.4 E6.4 D6.4|C6.4 B5.2 A5.2 G5.4 E5.4|D5.2 G5.2 B5.4 D6.4 B5.4|A5.8 F#5.8|G5.2 B5.2 E6.4 G6.4 F#6.4|E6.4 D6.2 C6.2 G5.8|A5.4 B5.4 C6.4 D6.4|E6.4 G#5.4 B5.4 E6.4'},
  interlude:{name:'幕間と準備「灯台の夜」',bpm:76,bass:'long',arp:'arp8',drum:'none',lead:'soft',
    chords:'F|Am|Bb|C|F|Dm|Bb,C|F|Bb|C|Am|Dm|Gm|C|Am,Dm|Gm,C',
    mel:'A5.6 G5.2 F5.8|E5.6 F5.2 C5.8|D5.4 F5.4 Bb5.4 A5.4|G5.12 r.4|A5.4 C6.4 A5.4 F5.4|D5.6 E5.2 F5.8|G5.4 F5.4 E5.4 G5.4|F5.12 r.4|'+
        'D6.6 C6.2 Bb5.8|C6.4 G5.4 E5.8|A5.6 G5.2 E5.8|F5.4 A5.4 D6.8|Bb5.6 A5.2 G5.8|E5.4 G5.4 C6.8|C6.4 A5.4 F5.4 D5.4|G5.8 E5.4 C5.4'},
  /* 0.75.0 最終章の前夜でアマラが歌う、少しさびしい歌（設計書「アマラの歌」・旋律は私の下書き） */
  zenya:{name:'前夜・アマラの歌',bpm:68,bass:'long',arp:'arp8',drum:'none',lead:'soft',
    chords:'Am|F|C|G|Am|Dm|E|Am|F|G|Em|Am|Dm|Am|E|Am',
    mel:'E5.6 D5.2 C5.8|A4.6 C5.2 F5.8|E5.4 G5.4 E5.4 C5.4|D5.12 r.4|C5.6 B4.2 A4.8|F5.6 E5.2 D5.8|E5.4 G#4.4 B4.8|A4.12 r.4|'+
        'C6.6 A5.2 F5.8|B5.6 G5.2 D5.8|E5.4 G5.4 B5.4 G5.4|A5.12 r.4|F5.6 E5.2 D5.8|C5.6 B4.2 A4.8|B4.4 D5.4 G#5.8|A5.12 r.4'},
  /* 0.18.0 戦いの曲（11/7 ヒロさん「戦闘音楽 攻撃と説得の二種類」）。戦いの場面のあいだだけ流れる */
  battleAtk:{name:'戦い・攻撃「霧を払え」',bpm:150,bass:'drive',arp:'arp16',drum:'rock',
    chords:'Am|F|G|E|Am|F|Dm,E|Am',
    mel:'A5.2 C6.2 E6.4 D6.2 C6.2 B5.4|C6.4 A5.2 F5.2 A5.8|B5.2 D6.2 G6.4 F6.2 E6.2 D6.4|E6.8 G#5.8|A5.2 A5.2 E6.4 A6.4 G6.4|F6.4 E6.2 D6.2 C6.8|D6.4 F6.4 E6.4 B5.4|A5.12 r.4'},
  battleTalk:{name:'戦い・説得「心に灯を」',bpm:108,bass:'bounce',arp:'arp8',drum:'soft',lead:'soft',
    chords:'G|Em|C|D|G|Em|C,D|G',
    mel:'D5.4 G5.4 B5.6 A5.2|G5.4 E5.4 B4.8|C5.4 E5.4 G5.4 C6.4|B5.6 A5.2 F#5.8|G5.4 B5.4 D6.6 C6.2|B5.4 G5.4 E5.8|E5.4 G5.4 A5.4 F#5.4|G5.12 r.4'},
  clear:{name:'クリア',bpm:132,once:true,bass:'none',arp:'none',drum:'none',
    mel:'C5.2 E5.2 G5.2 C6.6 B5.2 C6.2 D6.2 E6.12',bassMel:'C3.8 G2.8 C3.14'},
  lose:{name:'負け',bpm:72,once:true,bass:'none',arp:'none',drum:'none',
    mel:'E5.4 D#5.4 D5.4 C#5.14',bassMel:'A2.12 A2.14'}
};
const ORDER=['title','day','night','special','partFinal','final','interlude','battleAtk','battleTalk'];

/* 旋律の文字を音の並びに */
function parseLine(s){ const out=[]; let t=0; for(const tok of s.replace(/\|/g,' ').split(/\s+/)){ if(!tok) continue; const [n,d]=tok.split('.'); const len=+d||1; if(n!=='r') out.push({t,d:len,n:midi(n)}); t+=len; } return {ev:out,len:t}; }
/* 和音の列から、ベース・分散和音・打楽器を作る */
const DRUM={ none:'', soft:'k...............|........h.......', pop:'k.......k.......|....s.......s...|h.h.h.h.h.h.h.h.', march:'k.......k.......|....s.......s.s.|h...h...h...h...', rock:'k.....k.k.......|....s.......s...|hhhhhhhhhhhhhhhh',
  /* 0.84.0 タイトル用（小節ごとに drumSeq で選ぶ）。c シンバル・t 高いタム・l 低いタム */
  pulse:'k.......k.......', build:'k.......k.......|........t.t.l.ll',
  crash:'c...............|k.....k.k.......|....s.......s...|..h.h.h.h.h.h.h.', heroA:'k.....k.k.......|....s.......s...|h.h.h.h.h.h.h.h.',
  heroFill:'k.....k.k.......|....s.......s.ss|h.h.h.h.h.h.....', snareFill:'k.......k.......|....s...s.s.ssss|h.h.h.h.........',
  half:'k.........k.....|........s.......|h...h...h...h...', tomBuild:'k.......k.......|t...t...l.l.l.l.|............ssss' };
function build(S){
  const mel=parseLine(S.mel), ch=[];
  if(S.lead==='hero'){ ch.push({inst:'p25',vol:0.075,ev:mel.ev,vib:true,echo:!!S.echo}); ch.push({inst:'tri2',vol:0.09,ev:mel.ev.map(e=>({t:e.t,d:e.d,n:e.n-12})),vib:true}); }   /* 0.84.0 旋律と、その1オクターブ下の重ね */
  else ch.push({inst:S.lead==='soft'?'tri2':'p25',vol:S.lead==='soft'?0.16:0.085,ev:mel.ev});
  let len=mel.len;
  if(S.bassMel){ const b=parseLine(S.bassMel); ch.push({inst:'tri',vol:0.2,ev:b.ev}); len=Math.max(len,b.len); }
  if(S.chords){
    const bars=S.chords.split('|'), bass=[], arp=[], stab=[], pad=[];
    bars.forEach((bar,i)=>{ const parts=bar.split(','), w=16/parts.length;
      const intro=S.loopBar&&i<S.loopBar, BS=(intro&&S.introBass)||S.bass, AS=(intro&&S.introArp)||S.arp;   /* 0.84.0 前奏だけ別の刻み */
      parts.forEach((c,j)=>{ const C=chordOf(c.trim()), t0=i*16+j*w, r=C.root, fifth=r+7, tones=C.iv.map(x=>r+24+x);
        /* 0.19.0 さらに1音（11/7 ヒロさん「もう1音増やして重厚に」）：ベースの1オクターブ上で、和音の3度と5度をのばす */
        for(const x of C.iv.slice(1,3)) pad.push({t:t0,d:w,n:r+12+x});
        if(BS==='long') bass.push({t:t0,d:w,n:r});
        else if(BS==='gallop') for(let k=0;k<w;k+=4){ bass.push({t:t0+k,d:2,n:r}); bass.push({t:t0+k+2,d:1,n:r}); bass.push({t:t0+k+3,d:1,n:r+12}); }   /* 0.84.0 駆け足 */
        else if(BS==='bounce') for(let k=0;k<w;k+=4){ bass.push({t:t0+k,d:2,n:r}); bass.push({t:t0+k+2,d:2,n:(k/4)%2?fifth:r+12}); }
        else if(BS==='march') for(let k=0;k<w;k+=4) bass.push({t:t0+k,d:3,n:(k/4)%2?fifth:r});
        else if(BS==='drive') for(let k=0;k<w;k+=2) bass.push({t:t0+k,d:2,n:(k/2)%4===3?r+12:r});
        if(AS==='arp8') for(let k=0,q=0;k<w;k+=2,q++) arp.push({t:t0+k,d:2,n:tones[q%tones.length]+12});
        else if(AS==='arp16') for(let k=0,q=0;k<w;k++,q++) arp.push({t:t0+k,d:1,n:tones[q%tones.length]+12});
        else if(AS==='stab') for(let k=2;k<w;k+=4) for(const n of tones) stab.push({t:t0+k,d:1,n:n+12}); }); });
    ch.push({inst:'tri',vol:0.2,ev:bass});
    /* 0.18.0 もう1音（11/7 ヒロさん「音楽をもう1音増やして」）：旋律の下で、そのときの和音の音を重ねるハモり。
       旋律の音より3〜9半音下にある和音の音のうち、いちばん高いものを選ぶ（なければ鳴らさない） */
    const harm=[];
    for(const e of mel.ev){ const bi=Math.floor(e.t/16), bar=bars[bi]; if(!bar) continue; const parts=bar.split(','), C=chordOf(parts[Math.min(parts.length-1,Math.floor((e.t%16)/(16/parts.length)))].trim());
      let best=null; for(let o=24;o<=72;o+=12) for(const x of C.iv){ const n=C.root+o+x, d=e.n-n; if(d>=3&&d<=9&&(best==null||n>best)) best=n; }
      if(best!=null) harm.push({t:e.t,d:e.d,n:best}); }
    if(harm.length) ch.push({inst:S.lead==='soft'?'tri2':'p50',vol:S.lead==='soft'?0.09:0.04,ev:harm});
    if(pad.length) ch.push({inst:'pad',vol:0.06,ev:pad});
    if(arp.length) ch.push({inst:'p125',vol:S.arp==='arp16'?0.03:0.04,ev:arp,echo:S.lead==='hero'&&!!S.echo});
    if(stab.length) ch.push({inst:'p50',vol:0.022,ev:stab});
    len=Math.max(len,bars.length*16);
    const seq=S.drumSeq?S.drumSeq.split(/[|,]/):null, dr=[];   /* 0.84.0 drumSeq があれば小節ごとに型を選ぶ */
    for(let b=0;b<bars.length;b++){ const D=DRUM[seq?seq[b%seq.length]:(S.drum||'none')]; if(!D) continue;
      for(const row of D.split('|')) for(let k=0;k<16;k++){ const c=row[k]; if(c&&'kshctl'.includes(c)) dr.push({t:b*16+k,d:1,dr:c}); } }
    dr.sort((x,y)=>x.t-y.t); if(dr.length) ch.push({inst:'drum',vol:1,ev:dr});
  }
  return {ch,len,step:60/S.bpm/4,once:!!S.once,lf:S.loopBar?S.loopBar*16:0};
}
const BUILT={}; function song(n){ return BUILT[n]||(BUILT[n]=build(SONGS[n])); }

/* ---------- 音を出すところ ---------- */
let ctx=null, master=null, musicG=null, seG=null, bgmVG=null, waves={}, noiseBuf=null;
let bgmOn=true, seOn=true, unlocked=false, want=null, cur=null, timer=0, live=[];
/* 0.39.5 ヒロさん「ゲームの設定内で各種音量調整できるようにしてほしい（音量スライダー）」：全体・音楽・効果音の音量（0〜100）。耳の感じ方に合わせて2乗で効かせる。100＝これまでの大きさ */
let vol={all:100,bgm:100,se:100};
const vg=v=>{ const x=Math.max(0,Math.min(100,+v||0))/100; return x*x; };
function applyVol(){ if(!ctx) return; const t=ctx.currentTime;
  for(const [g,v] of [[master,0.6*vg(vol.all)],[bgmVG,vg(vol.bgm)],[seG,vg(vol.se)]]){ try{ g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(Math.max(0.0001,v),t,0.02); }catch(_){ g.gain.value=v; } } }
function ensure(){
  if(!ctx){ try{ ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(_){ ctx=null; return; }
    master=ctx.createGain(); master.gain.value=0.6*vg(vol.all); master.connect(ctx.destination);
    bgmVG=ctx.createGain(); bgmVG.gain.value=vg(vol.bgm); bgmVG.connect(master);   /* 0.39.5 音楽の音量（曲を変えても残る） */
    musicG=ctx.createGain(); musicG.gain.value=1; musicG.connect(bgmVG);
    seG=ctx.createGain(); seG.gain.value=vg(vol.se); seG.connect(master);
    for(const [k,d] of [['p125',0.125],['p25',0.25],['p50',0.5]]){ const N=32, re=new Float32Array(N), im=new Float32Array(N); for(let i=1;i<N;i++) re[i]=2*Math.sin(i*Math.PI*d)/(i*Math.PI); waves[k]=ctx.createPeriodicWave(re,im); }
    /* 雑音：決まった式（線形合同法）で作る。Math.random は使わない */
    const L=ctx.sampleRate|0; noiseBuf=ctx.createBuffer(1,L,ctx.sampleRate); const a=noiseBuf.getChannelData(0); let x=12345; for(let i=0;i<L;i++){ x=(x*1103515245+12345)&0x7fffffff; a[i]=(x/0x3fffffff)-1; } }
  if(ctx&&ctx.state==='suspended'){ try{ ctx.resume().then(kick).catch(()=>{}); }catch(_){} }
}
function trackNode(o){ live.push(o); o.onended=()=>{ const i=live.indexOf(o); if(i>=0) live.splice(i,1); }; }
function tone(dest,inst,f,t,dur,vol,vib){
  const o=ctx.createOscillator(), g=ctx.createGain();
  if(inst==='tri'||inst==='tri2'||inst==='pad') o.type='triangle'; else o.setPeriodicWave(waves[inst]||waves.p50);
  o.frequency.setValueAtTime(f,t);
  const P=inst==='pad', a=P?Math.min(0.15,dur*0.25):0.006, rel=P?Math.min(0.2,dur*0.3):Math.min(0.06,dur*0.3), sus=P?vol*0.85:inst==='tri2'?vol*0.75:vol*0.7;   // 0.19.0 pad はふわっと入って長くのびる
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+a); g.gain.linearRampToValueAtTime(sus,t+Math.max(a+0.01,Math.min(dur*0.5,0.12))); g.gain.setValueAtTime(sus,t+Math.max(a,dur-rel)); g.gain.linearRampToValueAtTime(0.0001,t+dur);
  if(vib&&dur>0.3){ const l=ctx.createOscillator(), lg=ctx.createGain(); l.frequency.value=5.5; lg.gain.setValueAtTime(0,t); lg.gain.setValueAtTime(0,t+0.15); lg.gain.linearRampToValueAtTime(f*0.008,t+Math.min(0.45,dur*0.7));   /* 0.84.0 長い音にだけ、あとからかかるビブラート */
    l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t+dur+0.02); trackNode(l); }
  o.connect(g); g.connect(dest); o.start(t); o.stop(t+dur+0.02); trackNode(o); return o;
}
function drum(dest,k,t,vol){
  if(k==='k'){ const o=ctx.createOscillator(), g=ctx.createGain(); o.type='sine'; o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(45,t+0.12);
    g.gain.setValueAtTime(0.32*vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.16); o.connect(g); g.connect(dest); o.start(t); o.stop(t+0.18); trackNode(o); return; }
  if(k==='t'||k==='l'){ const o=ctx.createOscillator(), g=ctx.createGain(), f0=k==='t'?210:140; o.type='triangle'; o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(f0*0.5,t+0.2);   /* 0.84.0 タム */
    g.gain.setValueAtTime(0.34*vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.26); o.connect(g); g.connect(dest); o.start(t); o.stop(t+0.28); trackNode(o); return; }
  if(k==='c'){ const s=ctx.createBufferSource(), f=ctx.createBiquadFilter(), g=ctx.createGain(); s.buffer=noiseBuf; f.type='highpass'; f.frequency.value=4500;   /* 0.84.0 シンバル */
    g.gain.setValueAtTime(0.11*vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.9); s.connect(f); f.connect(g); g.connect(dest); s.start(t,(t*7919)%0.05,0.92); trackNode(s); return; }
  const s=ctx.createBufferSource(), f=ctx.createBiquadFilter(), g=ctx.createGain(); s.buffer=noiseBuf;
  if(k==='s'){ f.type='bandpass'; f.frequency.value=1800; g.gain.setValueAtTime(0.16*vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.13); }
  else { f.type='highpass'; f.frequency.value=7000; g.gain.setValueAtTime(0.045*vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.04); }
  s.connect(f); f.connect(g); g.connect(dest); const off=(t*7919)%0.8; s.start(t,off,0.2); trackNode(s);
}
/* 先読みで予約する（25ms ごとに、0.3秒先まで） */
function startSong(name){
  stopNow();
  if(!ctx||!bgmOn||!unlocked||ctx.state!=='running') return;
  const S=song(name);
  cur={name,S,t0:ctx.currentTime+0.08,loop:0,base:0,idx:S.ch.map(()=>0),done:false,bus:null};
  musicG.gain.cancelScheduledValues(ctx.currentTime); musicG.gain.setValueAtTime(1,ctx.currentTime);
  if(S.ch.some(c=>c.echo)){ const bus=ctx.createGain(), d=ctx.createDelay(1), fb=ctx.createGain(), lp=ctx.createBiquadFilter(), wet=ctx.createGain();   /* 0.84.0 こだま（付点8分おくれ） */
    d.delayTime.value=S.step*3; fb.gain.value=0.32; lp.type='lowpass'; lp.frequency.value=2600; wet.gain.value=0.4;
    bus.connect(musicG); bus.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(musicG); cur.bus=bus; }
  pump(); timer=setInterval(pump,25);
}
function pump(){
  if(!cur||!ctx) return;
  const S=cur.S, ahead=ctx.currentTime+0.3;
  for(;;){
    let any=false;
    const off=cur.loop>0?S.lf:0;   /* 0.84.0 2回目からは前奏（lf より前）をとばす */
    S.ch.forEach((c,ci)=>{ for(;;){ const e=c.ev[cur.idx[ci]]; if(!e) break; const t=cur.t0+(cur.base+e.t-off)*S.step; if(t>ahead) break;
      if(t>=ctx.currentTime-0.02){ const dst=c.echo&&cur.bus?cur.bus:musicG; if(c.inst==='drum') drum(dst,e.dr,t,c.vol); else tone(dst,c.inst,hz(e.n),t,e.d*S.step*0.92,c.vol,c.vib); }
      cur.idx[ci]++; any=true; } });
    const endT=cur.t0+(cur.base+S.len-off)*S.step, allDone=S.ch.every((c,ci)=>cur.idx[ci]>=c.ev.length);
    if(allDone){ if(S.once){ if(!cur.done){ cur.done=true; const nm=cur.name; setTimeout(()=>{ if(cur&&cur.name===nm&&cur.done){ clearInterval(timer); timer=0; cur=null; } },(endT-ctx.currentTime)*1000+200); } return; }
      if(endT-0.3<=ahead){ cur.base+=S.len-off; cur.loop++; cur.idx=S.ch.map(c=>{ let i=0; while(i<c.ev.length&&c.ev[i].t<S.lf) i++; return i; }); continue; } }
    if(!any) return;
  }
}
function stopNow(){
  clearInterval(timer); timer=0; cur=null;
  if(!ctx) return; const now=ctx.currentTime;
  try{ musicG.gain.cancelScheduledValues(now); musicG.gain.setValueAtTime(musicG.gain.value,now); musicG.gain.linearRampToValueAtTime(0.0001,now+0.15); }catch(_){}
  for(const o of live.slice()){ try{ o.stop(now+0.16); }catch(_){} }
  live=[];
  const g=musicG; musicG=ctx.createGain(); musicG.gain.value=1; musicG.connect(bgmVG); setTimeout(()=>{ try{ g.disconnect(); }catch(_){} },300);
}
function kick(){ if(bgmOn&&unlocked&&want&&ctx&&ctx.state==='running'&&(!cur||cur.name!==want)) startSong(want); }

/* ---------- 効果音（短い楽譜。決まった音だけ） ---------- */
const SE={
  press:[['p50',72,0.03,0.035]],
  hit:[['drum','s',0,1],['p50',45,0.06,0.07],['p50',40,0.08,0.06,0.05]],
  crit:[['drum','s',0,1.4],['drum','k',0,1],['p25',76,0.05,0.07],['p25',83,0.05,0.07,0.05],['p25',88,0.12,0.07,0.1]],
  miss:[['drum','h',0,2],['p125',88,0.04,0.03],['p125',81,0.05,0.03,0.04]],
  talk:[['tri2',74,0.08,0.12],['tri2',79,0.1,0.12,0.09]],
  talkHit:[['p25',79,0.07,0.06],['p25',84,0.09,0.06,0.07]],
  calm:[['p25',72,0.1,0.06],['p25',76,0.1,0.06,0.09],['p25',79,0.1,0.06,0.18],['p25',84,0.3,0.06,0.27],['tri',60,0.5,0.18]],
  down:[['p50',64,0.1,0.05],['p50',60,0.1,0.05,0.1],['p50',55,0.25,0.05,0.2]],
  levelup:[['p25',67,0.07,0.06],['p25',71,0.07,0.06,0.07],['p25',74,0.07,0.06,0.14],['p25',79,0.25,0.07,0.21]],
  heal:[['tri2',72,0.08,0.14],['tri2',76,0.08,0.14,0.07],['tri2',79,0.08,0.14,0.14],['tri2',84,0.2,0.14,0.21]],
  found:[['p25',76,0.08,0.06],['p25',79,0.08,0.06,0.09],['p25',84,0.22,0.07,0.18]],
  turn:[['tri2',69,0.1,0.13],['tri2',76,0.18,0.13,0.11]],
  enemyTurn:[['tri2',64,0.1,0.13],['tri2',57,0.18,0.13,0.11]],
  light:[['p125',84,0.05,0.04],['p125',91,0.12,0.04,0.05]]
};
function se(name){
  if(!seOn||!unlocked) return; ensure(); if(!ctx||ctx.state!=='running') return;
  const L=SE[name]; if(!L) return; const t0=ctx.currentTime+0.01;
  for(const [inst,n,dur,vol,at] of L){ const t=t0+(at||0);
    if(inst==='drum') drum(seG,n,t,vol); else { const o=tone(seG,inst,hz(n),t,dur,vol); const i=live.indexOf(o); if(i>=0) live.splice(i,1); } }
}

/* 画面を離れている間は鳴らさない */
document.addEventListener('visibilitychange',()=>{ if(!ctx) return; if(document.hidden){ try{ ctx.suspend(); }catch(_){} } else if(unlocked&&(bgmOn||seOn)){ try{ ctx.resume().then(kick).catch(()=>{}); }catch(_){} } });
window.addEventListener('pagehide',()=>{ if(ctx) try{ ctx.suspend(); }catch(_){} });

window.Sound={
  /* Tap.js から：押した瞬間（press）と、押したあと（tap）。tap が「音を出してよくなった」合図 */
  press(){ if(unlocked) se('press'); },
  tap(){ if(!bgmOn&&!seOn) return; unlocked=true; ensure(); kick(); },
  se,
  /* 場面の曲を決める。まだ押していなければ、決めておくだけ */
  play(name){ want=SONGS[name]?name:null; if(!want){ stopNow(); return; } if(cur&&cur.name===want) return; if(bgmOn&&unlocked){ ensure(); kick(); } },
  /* 短い曲（クリア・負け）。終わったら静かになる */
  jingle(name){ want=null; if(!bgmOn||!unlocked||!SONGS[name]) { stopNow(); return; } ensure(); if(ctx&&ctx.state==='running') startSong(name); },
  stop(){ want=null; stopNow(); },
  setBgm(v,startNow){ bgmOn=!!v; if(!bgmOn){ stopNow(); return; } if(startNow!==false&&unlocked){ ensure(); kick(); } },
  setSe(v){ seOn=!!v; },
  setVol(o){ for(const k of ['all','bgm','se']) if(o&&o[k]!=null) vol[k]=+o[k]; applyVol(); },   /* 0.39.5 */
  get playing(){ return cur?cur.name:null; },
  get wanted(){ return want; },
  get unlocked(){ return unlocked; },
  LIST:ORDER.map(k=>({key:k,name:SONGS[k].name})),
  _songs:SONGS, _build:build
};
})();
