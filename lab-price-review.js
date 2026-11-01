/* LAB · 단가 인상 검토 (일괄)
   - 품목 수백 개를 엑셀로 올려 한 번에 검토
   - 원재료를 고르면 보드 DB(data.json · lme_kna.json · sus316.json)에서 기존/신규 견적월의 월평균 시세를 자동으로 가져옴
   - 원가 항목별 기존/요청 금액을 넣으면 항목별로 시세·인건비 변동과 비교
   - 근거 단가 = 기존 단가 + Σ(기존 항목 금액 × 인정 변동률) → 요청 단가와 비교해 판정 */
(()=>{
'use strict';
const root=document.getElementById('panes'); if(!root||document.getElementById('lab-price-review')) return;

/* ---------- 기준 데이터 ---------- */
const MATS=[
  {id:'cu', name:'구리', cur:'USD', unit:'$/t', srcs:[['data','cu',v=>v*2204.62,'COMEX'],['lme','cu',v=>v,'LME']]},
  {id:'al', name:'알루미늄', cur:'USD', unit:'$/t', srcs:[['data','al',v=>v,'Investing'],['lme','al',v=>v,'LME']]},
  {id:'ni', name:'니켈', cur:'USD', unit:'$/t', srcs:[['data','ni',v=>v,'Investing'],['lme','ni',v=>v,'LME']]},
  {id:'st', name:'철강 (미국 열연 HRC)', cur:'USD', unit:'$/t', srcs:[['data','st',v=>v/0.907185,'Investing']]},
  {id:'io', name:'철광석 (62% Fe)', cur:'USD', unit:'$/t', srcs:[['data','io',v=>v,'KOMIS']]},
  {id:'ss', name:'스테인리스 SUS304 (SHFE)', cur:'CNY', unit:'¥/t', srcs:[['data','ss',v=>v,'SHFE']]},
  {id:'s316', name:'SUS316L 합금할증료', cur:'EUR', unit:'€/t', srcs:[['sus','s316l',v=>v*1000,'Acerinox']]},
  {id:'ao', name:'알루미나 (SHFE)', cur:'CNY', unit:'¥/t', srcs:[['data','ao',v=>v,'SHFE']]},
  {id:'qz', name:'고순도 석영사 (SMM)', cur:'CNY', unit:'¥/t', srcs:[['data','qz',v=>v,'SMM']]},
  {id:'zn', name:'아연 (LME)', cur:'USD', unit:'$/t', srcs:[['lme','zn',v=>v,'LME']]},
  {id:'pb', name:'납 (LME)', cur:'USD', unit:'$/t', srcs:[['lme','pb',v=>v,'LME']]},
  {id:'sn', name:'주석 (LME)', cur:'USD', unit:'$/t', srcs:[['lme','sn',v=>v,'LME']]},
  {id:'br', name:'브렌트유 (플라스틱 원가)', cur:'USD', unit:'$/bbl', perKg:false, srcs:[['data','pl',v=>v,'Investing']]},
  {id:'custom', name:'직접 입력 (DB에 없음)', cur:'', unit:'', srcs:[]},
];
/* 합금시세 탭의 합금(원소 구성비 GUESS × 원소 시세, 10년) */
const AL=window.PSK_ALLOY;
if(AL){ const at=MATS.length-1;
  MATS.splice(at,0,...AL.FAM.map(f=>({id:'x_'+f.id, name:'합금 · '+f.names.join(' / '), grp:'alloy', cur:'USD', unit:'$/t', srcs:[['alloy',f.id,v=>v,'합금시세(GUESS)']]}))); }
const MAT=Object.fromEntries(MATS.map(m=>[m.id,m]));
const nk=v=>String(v??'').toLowerCase().replace(/[\s()·_\-\/.]/g,'');
const ALIAS={'구리':'cu','동':'cu','copper':'cu','cu':'cu','알루미늄':'al','aluminum':'al','aluminium':'al','al':'al','니켈':'ni','nickel':'ni','ni':'ni',
  '철강':'st','강판':'st','열연':'st','steel':'st','hrc':'st','철광석':'io','ironore':'io','shfe304':'ss','스테인리스':'x_ss304','스테인레스':'x_ss304','stainless':'x_ss304','sus316할증료':'s316','316할증료':'s316',
  'sus316':'x_ss316','sus316l':'x_ss316','316l':'x_ss316','sts316':'x_ss316','sts316l':'x_ss316','sts304':'x_ss304','sus304':'x_ss304','ss304':'x_ss304','sus':'x_ss304','sus303':'x_sus303','sts303':'x_sus303',
  'a5052':'x_a5052','al5052':'x_a5052','5052':'x_a5052','al5083':'x_a5083','a5083':'x_a5083','5083':'x_a5083','al6061':'x_a6061','a6061':'x_a6061','6061':'x_a6061','al6061t6':'x_a6061','a6061t6':'x_a6061','al6061t651':'x_a6061','a6061t651':'x_a6061',
  'c1020':'x_c1020','c1020p':'x_c1020','무산소동':'x_c1020','ofc':'x_c1020','brass':'x_brass','황동':'x_brass','c3604':'x_brass','c4250':'x_c4250','copperalloy':'x_cual','구리합금':'x_cual','동합금':'x_cual',
  'ss400':'x_ss400','inconel':'x_in625','인코넬':'x_in625','inconel625':'x_in625','hastelloy':'x_c276','hastelloyc276':'x_c276','c276':'x_c276','하스텔로이':'x_c276','알루미나':'ao','alumina':'ao','석영':'qz','쿼츠':'qz','quartz':'qz','고순도석영':'qz','아연':'zn','zinc':'zn','납':'pb','lead':'pb',
  '주석':'sn','tin':'sn','브렌트유':'br','플라스틱':'br','수지':'br','brent':'br','직접입력':'custom','기타':'custom','custom':'custom'};
/* 합금시세 탭의 이름(SS316, A6061-T651 …)은 그대로 인식 */
if(AL) AL.FAM.forEach(f=>f.names.forEach(n=>{ ALIAS[nk(n)]='x_'+f.id; }));
const CATS=[['raw','원재료비'],['labor','인건비(노무비)'],['proc','가공·외주비'],['surf','표면처리·세정'],['util','경비(전력·유틸리티)'],['pack','포장비'],['logi','운송·물류비'],['admin','일반관리비'],['profit','이윤'],['etc','기타']];
/* 최저임금위원회 고시 시간급 */
const MW={2018:7530,2019:8350,2020:8590,2021:8720,2022:9160,2023:9620,2024:9860,2025:10030,2026:10320,2027:10700};
const LS='psk-pr-v2';
const DEF={tol:2, over:5, rawShare:40, laborShare:20};

/* ---------- 상태 ---------- */
let rows=[], sel=-1, cfg={...DEF}, filter={q:'',v:''}, DB={data:null,lme:null,sus:null};
try{ const s=JSON.parse(localStorage.getItem(LS)||'null'); if(s&&Array.isArray(s.rows)){ rows=s.rows; cfg={...DEF,...(s.cfg||{})}; } }catch(e){}
const save=()=>{ try{ localStorage.setItem(LS, JSON.stringify({rows,cfg})); }catch(e){} };

/* ---------- 유틸 ---------- */
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{ if(v===null||v===undefined) return NaN; if(typeof v==='number') return v; const s=String(v).replace(/[,\s원₩$%]/g,''); return s===''?NaN:Number(s); };
const ok=v=>Number.isFinite(v);
const f0=v=>ok(v)?Math.round(v).toLocaleString('ko-KR'):'—';
const f2=v=>ok(v)?v.toLocaleString('ko-KR',{maximumFractionDigits:2}):'—';
const pc=(v,d=1)=>ok(v)?(v>0?'+':'')+(v*100).toFixed(d)+'%':'—';
const dot=v=>String(v??'').replace('-','.');
const nowYm=()=>{ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
function ym(v){
  if(v===null||v===undefined||v==='') return '';
  if(v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}`;
  if(typeof v==='number' && v>20000 && v<80000){ const d=new Date(Math.round((v-25569)*864e5)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`; }
  const m=String(v).trim().match(/^(\d{4})\s*[-./년]\s*(\d{1,2})/); if(m) return `${m[1]}-${String(+m[2]).padStart(2,'0')}`;
  const m2=String(v).trim().match(/^(\d{4})(\d{2})/); if(m2) return `${m2[1]}-${m2[2]}`;
  return '';
}
const matId=v=>{ const k=nk(v); if(!k) return ''; if(MAT[k]) return k; if(ALIAS[k]&&MAT[ALIAS[k]]) return ALIAS[k];
  const byName=MATS.find(m=>nk(m.name)===k); if(byName) return byName.id;
  const hit=Object.keys(ALIAS).sort((a,b)=>b.length-a.length).find(a=>k.includes(a)&&MAT[ALIAS[a]]); return hit?ALIAS[hit]:'custom'; };
const blank=()=>({code:'',name:'',bp:'',mat:'cu',matName:'',oldYm:'',oldPrice:'',newYm:nowYm(),newPrice:'',qty:'',fx:'Y',weld:'N',rawShare:'',laborShare:'',
  idxOld:'',idxNew:'',laborPct:'',weight:'',yield:'',costs:{},basis:{},note:''});

/* ---------- 시세 조회 ---------- */
function series(kind,key){
  if(kind==='data'){ const h=DB.data?.history?.[key]; return h&&Array.isArray(h.avg)?{m0:h.m0,avg:h.avg}:null; }
  if(kind==='lme'){ const h=DB.lme?.series?.[key]; return h?{m0:h.m0,avg:h.avg}:null; }
  if(kind==='alloy'){ const D=AL?.data(); const f=AL?.FAM.find(x=>x.id===key); if(!D||!f) return null; return {m0:D.months[0], avg:AL.seriesOf(f).map(p=>Number.isFinite(p.usd)?p.usd:null)}; }
  if(kind==='sus'){ const r=DB.sus?.rows; if(!r?.length) return null; const m0=r[0].m, map=Object.fromEntries(r.map(x=>[x.m,x[key]]));
    const out=[]; let [y,m]=m0.split('-').map(Number); const last=r[r.length-1].m;
    while(`${y}-${String(m).padStart(2,'0')}`<=last){ out.push(map[`${y}-${String(m).padStart(2,'0')}`]??null); m++; if(m>12){m=1;y++;} }
    return {m0,avg:out}; }
  return null;
}
const idxOf=(s,mm)=>{ const [y0,m0]=s.m0.split('-').map(Number), [y,m]=mm.split('-').map(Number); return (y-y0)*12+(m-m0); };
/* 해당 월 값: 없으면 가까운 달(±2개월), 데이터 이후 월이면 최근값 */
function at(s,mm){
  if(!s||!mm) return {v:NaN};
  const i=idxOf(s,mm), n=s.avg.length;
  if(i<0) return {v:NaN, why:'데이터 이전'};
  if(i>=n){ for(let j=n-1;j>=0;j--) if(s.avg[j]!=null) return {v:+s.avg[j], near:true, why:'최근 월평균 사용'}; return {v:NaN}; }
  if(s.avg[i]!=null) return {v:+s.avg[i]};
  for(let d=1; d<=2; d++){ for(const j of [i-d,i+d]) if(j>=0&&j<n&&s.avg[j]!=null) return {v:+s.avg[j], near:true, why:'가까운 달 사용'}; }
  return {v:NaN, why:'해당 시점 시세 없음'};
}
const FXKEY={USD:'fx',CNY:'cnykrw',EUR:'eurkrw'};
function fxAt(cur,mm,kind){ if(kind==='alloy'&&cur==='USD'){ const D=AL?.data(); if(D) return at({m0:D.months[0],avg:D.fx},mm); }
  const k=FXKEY[cur]; if(!k) return {v:1}; const r=at(series('data',k),mm);
  if(!ok(r.v)&&cur==='USD'){ const D=AL?.data(); if(D) return at({m0:D.months[0],avg:D.fx},mm); } return r; }

/* 원재료 시세 변동: 두 시점을 모두 가진 소스를 우선 사용 */
function matMove(r){
  const m=MAT[r.mat]; if(!m) return null;
  if(r.mat==='custom'){ const a=num(r.idxOld), b=num(r.idxNew); return ok(a)&&ok(b)&&a>0?{pct:b/a-1, a, b, unit:'지수', src:'직접 입력', native:b/a-1}:{pct:NaN, why:'직접 입력 지수 필요'}; }
  if(!r.oldYm||!r.newYm) return {pct:NaN, why:'견적월 필요'};
  for(const [kind,key,conv,label] of m.srcs){
    const s=series(kind,key); if(!s) continue;
    const A=at(s,r.oldYm), B=at(s,r.newYm); if(!ok(A.v)||!ok(B.v)) continue;
    const a=conv(A.v), b=conv(B.v); let pct=b/a-1, krw=false, fxNote='';
    if(r.fx!=='N' && m.cur){ const FA=fxAt(m.cur,r.oldYm,kind), FB=fxAt(m.cur,r.newYm,kind);
      if(ok(FA.v)&&ok(FB.v)){ pct=(b*FB.v)/(a*FA.v)-1; krw=true; } else fxNote='환율 자료 없음 → 외화 기준'; }
    const notes=[A.near&&`기존 ${A.why}`, B.near&&`신규 ${B.why}`, fxNote].filter(Boolean);
    const perKg=m.perKg===false?null:(v,F)=>v/1000*(F||1);
    const FA=fxAt(m.cur,r.oldYm,kind).v, FB=fxAt(m.cur,r.newYm,kind).v;
    if(kind==='alloy') notes.push('합금 구성비는 GUESS(합금시세 탭에서 수정 가능)');
    return {pct, native:b/a-1, a, b, unit:m.unit, src:label, krw, notes,
      kgA: perKg&&ok(FA)?perKg(a,FA):NaN, kgB: perKg&&ok(FB)?perKg(b,FB):NaN};
  }
  return {pct:NaN, why:'해당 시점 시세 없음 (직접 입력 지수 사용 가능)'};
}
function laborMove(r){
  const o=num(r.laborPct); if(ok(o)) return {pct:o/100, src:'직접 입력'};
  if(r.weld==='Y'){ const C=window.PSK_COSTS, A=C?.wageAt('weld',r.oldYm), B=C?.wageAt('weld',r.newYm);
    if(A&&B) return {pct:B.v/A.v-1, src:`용접공 노임단가 ${dot(A.d)} ${A.v.toLocaleString('ko-KR')}원 → ${dot(B.d)} ${B.v.toLocaleString('ko-KR')}원`, weld:true};
    const ya=+String(r.oldYm).slice(0,4), yb=+String(r.newYm).slice(0,4);
    if(MW[ya]&&MW[yb]) return {pct:MW[yb]/MW[ya]-1, src:`용접공 노임단가는 2019.01부터 있어 최저임금 ${ya}→${yb}로 대신 계산`, weld:true};
  }
  const ya=+String(r.oldYm).slice(0,4), yb=+String(r.newYm).slice(0,4);
  if(MW[ya]&&MW[yb]) return {pct:MW[yb]/MW[ya]-1, src:`최저임금 ${ya}→${yb}`};
  return {pct:0, src:'최저임금 자료 없음'};
}

/* ---------- 계산 ---------- */
function calc(r){
  const P0=num(r.oldPrice), P1=num(r.newPrice), q=num(r.qty);
  const out={P0,P1,req:ok(P0)&&ok(P1)&&P0>0?P1/P0-1:NaN};
  const mv=matMove(r), lb=laborMove(r); out.mv=mv; out.lb=lb;
  const C=r.costs||{}, oldAmt={}, newAmt={}; let sumOld=0, sumNew=0, hasNew=false;
  CATS.forEach(([k])=>{ const a=num(C[k]?.[0]), b=num(C[k]?.[1]); if(ok(a)){oldAmt[k]=a; sumOld+=a;} if(ok(b)){newAmt[k]=b; sumNew+=b; hasNew=true;} });
  const hasBreak=sumOld>0; out.hasBreak=hasBreak; out.sumOld=sumOld; out.sumNew=sumNew;
  const matOK=mv&&ok(mv.pct);
  /* 각 항목 기존 금액: 원가표가 있으면 기존 단가에 맞춰 비례 배분, 없으면 비중으로 추정 */
  const base={};
  if(hasBreak&&ok(P0)){ CATS.forEach(([k])=>{ if(oldAmt[k]) base[k]=oldAmt[k]/sumOld*P0; }); }
  else if(ok(P0)){ const rs=num(r.rawShare), ls=num(r.laborShare); base.raw=P0*(ok(rs)?rs:cfg.rawShare)/100; base.labor=P0*(ok(ls)?ls:cfg.laborShare)/100; }
  const w=num(r.weight), y=num(r.yield);
  const useW=ok(w)&&w>0&&matOK&&ok(mv.kgA)&&ok(mv.kgB);
  const lines=[]; let just=ok(P0)?P0:NaN;
  CATS.forEach(([k,label])=>{
    if(!(k in base)&&!(k in newAmt)) return;
    const b0=base[k]||0; const ov=num(r.basis?.[k]);
    let pct = ok(ov)?ov/100 : k==='raw'?(matOK?mv.pct:0) : k==='labor'?lb.pct : 0;
    let delta=b0*pct, how=ok(ov)?'직접 지정':k==='raw'?(matOK?`${mv.src} 시세${mv.krw?'(원화)':''}`:'시세 없음 → 0%'):k==='labor'?lb.src:'변동 인정 안 함';
    if(k==='raw'&&useW&&!ok(ov)){ const used=w/((ok(y)&&y>0?y:100)/100); delta=used*(mv.kgB-mv.kgA); pct=b0?delta/b0:NaN; how=`중량 ${w}kg·수율 ${ok(y)?y:100}% × 시세`; }
    const reqAmt=newAmt[k], reqPct=ok(reqAmt)&&oldAmt[k]?reqAmt/oldAmt[k]-1:NaN;
    just+=delta;
    lines.push({k,label,old:oldAmt[k],base:b0,pct,delta,how,req:reqAmt,reqPct,
      flag: ok(reqPct)&&ok(pct)&&reqPct-pct>0.03 && (reqAmt-oldAmt[k])>0 ? `요청 ${pc(reqPct)} > 근거 ${pc(pct)}`:''});
  });
  out.lines=lines; out.just=just; out.gap=ok(P1)&&ok(just)&&just>0?P1/just-1:NaN; out.justPct=ok(just)&&ok(P0)&&P0>0?just/P0-1:NaN;
  out.save=ok(P1)&&ok(just)&&P1>just?(P1-just)*(ok(q)?q:1):0; out.qty=q;
  out.flags=lines.filter(l=>l.flag).map(l=>`${l.label}: ${l.flag}`);
  if(hasBreak&&ok(P0)&&Math.abs(sumOld/P0-1)>0.02) out.flags.push(`기존 원가표 합계 ${f0(sumOld)}원 ≠ 기존 단가 ${f0(P0)}원`);
  if(hasNew&&ok(P1)&&Math.abs(sumNew/P1-1)>0.02) out.flags.push(`요청 원가표 합계 ${f0(sumNew)}원 ≠ 요청 단가 ${f0(P1)}원`);
  /* 판정 */
  let v='', cls='';
  if(!ok(P0)||!ok(P1)){ v='입력 필요'; cls='na'; }
  else if(!matOK&&!hasBreak&&!(ok(num(r.rawShare))&&num(r.rawShare)===0)){ v='시세 확인'; cls='na'; }
  else if(out.req<=0){ v='인하·동결'; cls='good'; }
  else if(out.gap<=cfg.tol/100){ v='적정'; cls='good'; }
  else if(out.gap<=cfg.over/100){ v='협상 검토'; cls='warn'; }
  else { v='과다 요청'; cls='bad'; }
  out.v=v; out.cls=cls;
  return out;
}

/* ---------- 화면 ---------- */
const css=document.createElement('style');
css.textContent=`
#lab-price-review .pr-intro{color:var(--ink-2);font-size:14px;line-height:1.65;margin:0 0 14px}
#lab-price-review .pr-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
#lab-price-review .pr-bar .sp{flex:1}
#lab-price-review .pr-set{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;font-size:12.5px;color:var(--ink-2);background:var(--sunk);border-radius:10px;padding:10px 12px;margin:0 0 12px}
#lab-price-review .pr-set input{width:62px;padding:5px 6px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit}
#lab-price-review .pr-sum{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:0 0 12px}
#lab-price-review .pr-sum div{border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--panel)}
#lab-price-review .pr-sum b{display:block;font-size:20px;margin-top:3px;font-family:var(--font-display)}
#lab-price-review .pr-sum small{color:var(--ink-3);font-size:12px}
#lab-price-review .pr-filter{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 8px}
#lab-price-review .pr-filter input,#lab-price-review .pr-filter select{padding:7px 9px;border:1px solid var(--line);border-radius:7px;background:var(--panel);color:var(--ink);font:inherit;font-size:13px}
#lab-price-review .pr-wrap{overflow:auto;max-height:560px;border:1px solid var(--line);border-radius:10px}
#lab-price-review table.pr-t{width:100%;border-collapse:collapse;font-size:12.5px;min-width:1060px}
#lab-price-review .pr-t th{position:sticky;top:0;background:var(--sunk);text-align:left;font-weight:600;color:var(--ink-2);padding:8px;border-bottom:1px solid var(--line);white-space:nowrap;z-index:1}
#lab-price-review .pr-t td{padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}
#lab-price-review .pr-t td.n{text-align:right;font-family:var(--font-data);white-space:nowrap}
#lab-price-review .pr-t tr{cursor:pointer}
#lab-price-review .pr-t td:nth-child(2){min-width:170px}
#lab-price-review .pr-t td:nth-child(4){min-width:120px}
#lab-price-review .pr-t tr:hover td{background:var(--sunk)}
#lab-price-review .pr-t tr.on td{background:var(--copper-soft)}
#lab-price-review .pr-t small{color:var(--ink-3);display:block}
#lab-price-review .vb{display:inline-block;padding:2px 8px;border-radius:999px;font-weight:600;font-size:12px;white-space:nowrap}
#lab-price-review .vb.good{background:var(--good-soft);color:var(--good)}
#lab-price-review .vb.warn{background:var(--warn-soft);color:var(--warn)}
#lab-price-review .vb.bad{background:var(--bad-soft);color:var(--bad)}
#lab-price-review .vb.na{background:var(--sunk);color:var(--ink-3)}
#lab-price-review .up{color:var(--up)} #lab-price-review .down{color:var(--down)}
#lab-price-review .pr-det{border:1px solid var(--line);border-radius:12px;padding:16px;margin-top:14px;background:var(--panel)}
#lab-price-review .pr-det h3{margin:0 0 4px;font-size:16px}
#lab-price-review .pr-g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 12px;margin:12px 0}
#lab-price-review .pr-g label{display:grid;gap:4px;font-size:12px;color:var(--ink-2)}
#lab-price-review .pr-g input,#lab-price-review .pr-g select,#lab-price-review .pr-c input{width:100%;min-width:0;padding:7px 8px;border:1px solid var(--line);border-radius:7px;background:var(--panel);color:var(--ink);font:inherit;font-size:13px}
#lab-price-review .pr-g .wide{grid-column:span 2}
#lab-price-review .pr-mkt{background:var(--sunk);border-radius:9px;padding:10px 12px;font-size:13px;line-height:1.6;color:var(--ink-2)}
#lab-price-review .pr-c{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:6px}
#lab-price-review .pr-c th,#lab-price-review .pr-c td{padding:6px;border-bottom:1px solid var(--line);text-align:left}
#lab-price-review .pr-c td.n{text-align:right;font-family:var(--font-data)}
#lab-price-review .pr-c input{padding:5px 6px;text-align:right}
#lab-price-review .pr-res{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0 4px}
#lab-price-review .pr-res div{background:var(--sunk);border-radius:9px;padding:10px 12px}
#lab-price-review .pr-res b{display:block;font-size:18px;font-family:var(--font-display)}
#lab-price-review .pr-res small{color:var(--ink-3);font-size:12px}
#lab-price-review .pr-flags{margin:8px 0 0;padding-left:18px;color:var(--bad);font-size:13px}
#lab-price-review .pr-note{font-size:12px;color:var(--ink-3);line-height:1.6}
#lab-price-review .pr-empty{padding:28px;text-align:center;color:var(--ink-3)}
@media(max-width:900px){#lab-price-review .pr-sum{grid-template-columns:repeat(2,minmax(0,1fr))}#lab-price-review .pr-g,#lab-price-review .pr-res{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){#lab-price-review .pr-g,#lab-price-review .pr-res{grid-template-columns:1fr}#lab-price-review .pr-g .wide{grid-column:auto}}
`;
document.head.appendChild(css);

const pane=document.createElement('section');
pane.id='lab-price-review'; pane.className='pane lab-pane'; pane.hidden=true; pane.setAttribute('role','tabpanel');
pane.dataset.label='단가 인상 검토'; pane.dataset.desc='여러 품목의 견적 인상 요청을 원재료 시세·인건비 변동과 비교해 한 번에 검토';
pane.innerHTML=`
<p class="pr-intro">품목별로 <b>기존 단가·견적월</b>과 <b>요청 단가·견적월</b>, <b>원재료</b>를 넣으면 보드에 쌓인 시세로 두 시점의 원재료 가격 변동을 자동으로 가져와
<b>근거 단가</b>(시세·인건비 변동만큼 오른 단가)를 계산하고 요청 단가와 비교합니다. 원가 항목(원재료비·인건비·가공비…)을 기존/요청으로 넣으면 항목별로 따져봅니다. 엑셀로 수백 개를 한 번에 올릴 수 있어요.</p>
<div class="pr-bar">
  <button class="btn" type="button" data-a="add">+ 품목 추가</button>
  <button class="btn" type="button" data-a="tpl">엑셀 양식 받기</button>
  <label class="btn" style="cursor:pointer">엑셀 올리기<input type="file" accept=".xlsx,.xls,.csv" hidden data-a="up"></label>
  <button class="btn primary" type="button" data-a="out">검토 결과 엑셀 저장</button>
  <button class="btn primary" type="button" data-a="pdf">검토 보고서 PDF</button>
  <span class="sp"></span>
  <button class="btn" type="button" data-a="clear">전체 삭제</button>
</div>
<div class="pr-set">
  <span>판정 기준 · 근거 단가 대비</span>
  <label>적정 ≤ <input type="number" step="0.5" data-cfg="tol">%</label>
  <label>과다 &gt; <input type="number" step="0.5" data-cfg="over">%</label>
  <span>· 원가표가 없을 때 기본 비중</span>
  <label>원재료 <input type="number" step="1" data-cfg="rawShare">%</label>
  <label>인건비 <input type="number" step="1" data-cfg="laborShare">%</label>
  <span class="pr-note" id="pr-dbnote">시세 DB 불러오는 중…</span>
</div>
<div class="pr-sum" id="pr-sum"></div>
<div class="pr-filter">
  <input type="search" id="pr-q" placeholder="품목·코드·BP 검색" aria-label="검색">
  <select id="pr-v" aria-label="판정 필터"><option value="">판정 전체</option><option>과다 요청</option><option>협상 검토</option><option>적정</option><option>인하·동결</option><option>시세 확인</option><option>입력 필요</option></select>
  <span class="pr-note" id="pr-msg"></span>
</div>
<div class="pr-wrap"><table class="pr-t"><thead><tr>
  <th>#</th><th>품목</th><th>BP</th><th>원재료</th><th>기존 단가</th><th>요청 단가</th><th>요청 인상</th><th>원재료 시세</th><th>인건비</th><th>근거 단가</th><th>근거 대비</th><th>판정</th><th>초과액(연)</th>
</tr></thead><tbody id="pr-body"></tbody></table></div>
<div id="pr-det"></div>
<p class="pr-note" style="margin-top:12px">계산 방법: 근거 단가 = 기존 단가 + 원재료비 × 원재료 시세 변동률 + 인건비 × 인건비 변동률 (+ 직접 지정한 항목별 인정 변동률). 원재료 시세는 기존·신규 견적월의 월평균이고, 외화 시세는 같은 달 환율로 원화 환산해 비교합니다(환율 반영 N이면 외화 기준). 인건비는 기본으로 최저임금 인상률을 쓰고 직접 바꿀 수 있습니다. 검토 목록은 이 브라우저에 저장되며, 다른 사람과 공유하려면 결과 엑셀을 저장하세요.</p>`;
root.appendChild(pane);
const $p=s=>pane.querySelector(s);

pane.querySelectorAll('[data-cfg]').forEach(i=>{ i.value=cfg[i.dataset.cfg]; i.addEventListener('input',()=>{ const v=num(i.value); if(ok(v)){ cfg[i.dataset.cfg]=v; save(); renderAll(); } }); });
$p('#pr-q').addEventListener('input',e=>{ filter.q=e.target.value.trim().toLowerCase(); renderTable(); });
$p('#pr-v').addEventListener('change',e=>{ filter.v=e.target.value; renderTable(); });

function renderSummary(res){
  const c={}; let reqSum=0, justSum=0, over=0, nq=0;
  res.forEach(({o})=>{ c[o.v]=(c[o.v]||0)+1; if(ok(o.P1)&&ok(o.just)&&ok(o.P0)){ const q=ok(o.qty)?o.qty:1; reqSum+=(o.P1-o.P0)*q; justSum+=(o.just-o.P0)*q; over+=o.save; if(ok(o.qty)) nq++; } });
  $p('#pr-sum').innerHTML=`
    <div><small>검토 품목</small><b>${rows.length}</b><small>${nq?`연간수량 입력 ${nq}개`:'연간수량 미입력 → 개당 기준'}</small></div>
    <div><small>과다 요청</small><b class="up">${c['과다 요청']||0}</b><small>근거 대비 +${cfg.over}% 초과</small></div>
    <div><small>협상 검토</small><b style="color:var(--warn)">${c['협상 검토']||0}</b><small>+${cfg.tol}~${cfg.over}%</small></div>
    <div><small>적정·인하</small><b class="down">${(c['적정']||0)+(c['인하·동결']||0)}</b><small>입력·시세 확인 ${(c['입력 필요']||0)+(c['시세 확인']||0)}</small></div>
    <div><small>요청 인상액 vs 근거</small><b>${f0(reqSum)}</b><small>근거 ${f0(justSum)} · 초과 ${f0(over)}원</small></div>`;
}
function renderTable(res){
  res=res||rows.map((r,i)=>({r,i,o:calc(r)}));
  const q=filter.q, v=filter.v;
  const list=res.filter(({r,o})=>(!v||o.v===v)&&(!q||[r.code,r.name,r.bp,r.matName,MAT[r.mat]?.name].join(' ').toLowerCase().includes(q)));
  $p('#pr-body').innerHTML=list.length?list.map(({r,i,o})=>`<tr data-i="${i}" class="${i===sel?'on':''}">
    <td class="n">${i+1}</td>
    <td><b>${esc(r.name||'(품목명 없음)')}</b><small>${esc(r.code)}</small></td>
    <td>${esc(r.bp)}</td>
    <td>${esc(r.mat==='custom'?(r.matName||'직접 입력'):(MAT[r.mat]?.name||r.mat))}</td>
    <td class="n">${f0(o.P0)}<small>${esc(dot(r.oldYm))}</small></td>
    <td class="n">${f0(o.P1)}<small>${esc(dot(r.newYm))}</small></td>
    <td class="n ${o.req>0?'up':o.req<0?'down':''}">${pc(o.req)}</td>
    <td class="n">${o.mv&&ok(o.mv.pct)?`<span class="${o.mv.pct>0?'up':'down'}">${pc(o.mv.pct)}</span><small>${esc(o.mv.src)}${o.mv.krw?' 원화':''}</small>`:`<small>${esc(o.mv?.why||'—')}</small>`}</td>
    <td class="n">${pc(o.lb.pct)}<small>${o.lb.weld?'용접공':r.laborPct!==''&&r.laborPct!=null?'직접':'최저임금'}</small></td>
    <td class="n">${f0(o.just)}<small>${pc(o.justPct)}</small></td>
    <td class="n ${o.gap>0?'up':o.gap<0?'down':''}">${pc(o.gap)}</td>
    <td><span class="vb ${o.cls}">${o.v}</span>${o.flags.length?`<small>⚠ ${o.flags.length}건</small>`:''}</td>
    <td class="n">${o.save?f0(o.save):'—'}</td></tr>`).join('')
    :`<tr><td colspan="13" class="pr-empty">${rows.length?'조건에 맞는 품목이 없습니다.':'아직 품목이 없습니다. "엑셀 양식 받기"로 양식을 받아 채운 뒤 "엑셀 올리기"를 누르거나, "+ 품목 추가"로 하나씩 넣으세요.'}</td></tr>`;
}
$p('#pr-body').addEventListener('click',e=>{ const tr=e.target.closest('tr[data-i]'); if(!tr) return; sel=+tr.dataset.i; renderTable(); renderDetail(); $p('#pr-det').scrollIntoView({behavior:'smooth',block:'start'}); });

function ymField(k,label,val){ return `<label>${label}<input data-f="${k}" data-ym="1" type="text" inputmode="decimal" placeholder="YYYY.MM" maxlength="7" value="${esc(dot(val))}"></label>`; }
function field(k,label,val,type='text',extra=''){ return `<label${extra}>${label}<input data-f="${k}" type="${type}" value="${esc(val)}"${type==='number'?' step="any"':''}></label>`; }
function renderDetail(){
  const box=$p('#pr-det'); if(sel<0||!rows[sel]){ box.innerHTML=''; return; }
  const r=rows[sel], o=calc(r), mv=o.mv;
  const opt=m=>`<option value="${m.id}"${m.id===r.mat?' selected':''}>${esc(m.name.replace(/^합금 · /,''))}</option>`;
  const matOpts=`<optgroup label="원자재 시세">${MATS.filter(m=>!m.grp&&m.id!=='custom').map(opt).join('')}</optgroup>`+
    (MATS.some(m=>m.grp==='alloy')?`<optgroup label="합금시세 (원소 구성비 GUESS × 원소 시세, 10년)">${MATS.filter(m=>m.grp==='alloy').map(opt).join('')}</optgroup>`:'')+
    `<optgroup label="기타">${opt(MAT.custom)}</optgroup>`;
  const mkt = r.mat==='custom'
    ? `DB에 없는 원재료입니다. 기존·신규 견적월의 시세(또는 지수)를 직접 넣으세요. ${ok(mv?.pct)?`→ 변동 <b>${pc(mv.pct)}</b>`:''}`
    : mv&&ok(mv.pct)
      ? `<b>${esc(MAT[r.mat].name)}</b> · ${esc(mv.src)} 월평균 ${esc(dot(r.oldYm))} <b>${f2(mv.a)} ${esc(mv.unit)}</b> → ${esc(dot(r.newYm))} <b>${f2(mv.b)} ${esc(mv.unit)}</b> (외화 ${pc(mv.native)})${mv.krw?` · 같은 달 환율로 원화 환산하면 <b>${pc(mv.pct)}</b>`:''}${ok(mv.kgA)?` · 원화 kg당 ${f0(mv.kgA)} → ${f0(mv.kgB)}원`:''}${mv.notes?.length?`<br><span class="pr-note">${esc(mv.notes.join(' · '))}</span>`:''}`
      : `시세를 찾지 못했습니다: ${esc(mv?.why||'')}. 원재료를 "직접 입력"으로 바꾸고 지수를 넣거나, 원재료비 인정 변동률을 직접 지정하세요.`;
  const C=r.costs||{};
  const L=Object.fromEntries(o.lines.map(l=>[l.k,l]));
  box.innerHTML=`
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start">
    <div><h3>#${sel+1} ${esc(r.name||'새 품목')}</h3><span class="vb ${o.cls}">${o.v}</span> <span class="pr-note">요청 ${pc(o.req)} · 근거 ${pc(o.justPct)} · 근거 대비 ${pc(o.gap)}</span></div>
    <div class="pr-bar" style="margin:0"><button class="btn" type="button" data-d="dup">복제</button><button class="btn" type="button" data-d="del">삭제</button><button class="btn" type="button" data-d="close">닫기</button></div>
  </div>
  <div class="pr-res">
    <div><small>기존 단가</small><b>${f0(o.P0)}원</b><small>${esc(r.oldYm||'견적월 미입력')}</small></div>
    <div><small>요청 단가</small><b class="${o.req>0?'up':''}">${f0(o.P1)}원</b><small>${pc(o.req)} · ${esc(r.newYm||'')}</small></div>
    <div><small>근거 단가 (협상 목표)</small><b>${f0(o.just)}원</b><small>${pc(o.justPct)}</small></div>
    <div><small>요청 − 근거</small><b class="${o.gap>0?'up':'down'}">${ok(o.P1)&&ok(o.just)?f0(o.P1-o.just):'—'}원</b><small>${pc(o.gap)}${o.save&&ok(o.qty)?` · 연 ${f0(o.save)}원`:''}</small></div>
  </div>
  ${o.flags.length?`<ul class="pr-flags">${o.flags.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
  <div class="pr-g">
    ${field('code','품목코드',r.code)}${field('name','품목명',r.name)}${field('bp','BP(공급사)',r.bp)}${field('qty','연간 수량(선택)',r.qty,'number')}
    ${ymField('oldYm','기존 견적월',r.oldYm)}${field('oldPrice','기존 단가(원)',r.oldPrice,'number')}${ymField('newYm','신규 견적월',r.newYm)}${field('newPrice','요청 단가(원)',r.newPrice,'number')}
    <label class="wide">원재료<select data-f="mat">${matOpts}</select></label>
    ${r.mat==='custom'?field('matName','원재료명',r.matName)+field('idxOld','기존월 시세·지수',r.idxOld,'number'):`<label>환율 반영<select data-f="fx"><option value="Y"${r.fx!=='N'?' selected':''}>Y (원화 환산)</option><option value="N"${r.fx==='N'?' selected':''}>N (외화 기준)</option></select></label>${field('weight','원재료 중량 kg/개(선택)',r.weight,'number')}`}
    ${r.mat==='custom'?field('idxNew','신규월 시세·지수',r.idxNew,'number'):''}
    ${r.mat!=='custom'?field('yield','수율 %(선택)',r.yield,'number'):''}
    <label>용접 공정 필요<select data-f="weld"><option value="N"${r.weld!=='Y'?' selected':''}>N · 인건비=최저임금 변동</option><option value="Y"${r.weld==='Y'?' selected':''}>Y · 인건비=용접공 노임단가 변동</option></select></label>
    ${field('laborPct','인건비 변동률 %(비우면 위 기준)',r.laborPct,'number')}
    ${o.hasBreak?'':field('rawShare',`원재료 비중 %(기본 ${cfg.rawShare})`,r.rawShare,'number')+field('laborShare',`인건비 비중 %(기본 ${cfg.laborShare})`,r.laborShare,'number')}
  </div>
  <div class="pr-mkt">${mkt}<br>인건비: ${esc(o.lb.src)} <b>${pc(o.lb.pct)}</b></div>
  <h3 style="margin-top:16px">원가 항목 (기존 / 요청)</h3>
  <p class="pr-note">공급사 원가표 금액(원/개)을 넣으세요. 비워두면 위의 기본 비중으로 원재료비·인건비만 추정합니다. "인정 변동률"을 비워두면 원재료비=시세, 인건비=인건비 변동, 나머지=0%로 봅니다.</p>
  <div style="overflow-x:auto"><table class="pr-c"><thead><tr><th>항목</th><th>기존(원)</th><th>요청(원)</th><th>요청 변동</th><th>인정 변동률 %</th><th>근거 반영액</th><th>근거</th></tr></thead><tbody>
  ${CATS.map(([k,label])=>{ const l=L[k];
    return `<tr><td>${label}</td>
      <td><input data-c="${k}" data-j="0" type="number" step="any" value="${esc(C[k]?.[0]??'')}"></td>
      <td><input data-c="${k}" data-j="1" type="number" step="any" value="${esc(C[k]?.[1]??'')}"></td>
      <td class="n ${l&&l.reqPct>0?'up':''}">${l?pc(l.reqPct):'—'}</td>
      <td><input data-b="${k}" type="number" step="any" placeholder="${l&&ok(l.pct)?(l.pct*100).toFixed(1):'0'}" value="${esc(r.basis?.[k]??'')}"></td>
      <td class="n">${l?f0(l.delta):'—'}</td><td class="pr-note">${l?esc(l.how):''}${l?.flag?` <b style="color:var(--bad)">⚠ ${esc(l.flag)}</b>`:''}</td></tr>`; }).join('')}
  <tr><td><b>합계</b></td><td class="n">${f0(o.sumOld)}</td><td class="n">${f0(o.sumNew)}</td><td></td><td></td><td class="n"><b>${ok(o.just)&&ok(o.P0)?f0(o.just-o.P0):'—'}</b></td><td></td></tr>
  </tbody></table></div>
  <label class="pr-g" style="display:grid;grid-template-columns:1fr"><span style="font-size:12px;color:var(--ink-2)">비고</span><input data-f="note" type="text" value="${esc(r.note)}"></label>`;
}
const det=$p('#pr-det');
function onDetail(e){
  if(sel<0) return; const r=rows[sel], t=e.target;
  if(t.dataset.ym){ const v=ym(t.value); if(v) r[t.dataset.f]=v; else if(e.type==='change'){ t.value=dot(r[t.dataset.f]); return; } else return; }
  else if(t.dataset.f){ r[t.dataset.f]=t.value; if((t.dataset.f==='mat'||t.dataset.f==='weld')&&e.type==='change'){ renderAll(); return; } }
  else if(t.dataset.c){ r.costs=r.costs||{}; const a=r.costs[t.dataset.c]||['','']; a[+t.dataset.j]=t.value; r.costs[t.dataset.c]=a; }
  else if(t.dataset.b){ r.basis=r.basis||{}; r.basis[t.dataset.b]=t.value; }
  else return;
  save();
  if(e.type==='change'){ const y=window.scrollY, id=document.activeElement&&document.activeElement.dataset; renderAll(); window.scrollTo(0,y); }
  else { renderTable(); renderSummary(rows.map((r,i)=>({r,i,o:calc(r)}))); }
}
det.addEventListener('input',onDetail); det.addEventListener('change',onDetail);
det.addEventListener('click',e=>{ const a=e.target.dataset.d; if(!a) return;
  if(a==='close'){ sel=-1; }
  if(a==='del'){ rows.splice(sel,1); sel=-1; }
  if(a==='dup'){ rows.splice(sel+1,0,JSON.parse(JSON.stringify(rows[sel]))); sel++; }
  save(); renderAll(); });

function renderAll(){ const res=rows.map((r,i)=>({r,i,o:calc(r)})); renderSummary(res); renderTable(res); renderDetail(); }

/* ---------- 엑셀 ---------- */
const COLS=[['code','품목코드'],['name','품목명'],['bp','BP(공급사)'],['mat','원재료'],['matName','원재료명(직접입력)'],['oldYm','기존 견적월'],['oldPrice','기존 단가'],['newYm','신규 견적월'],['newPrice','요청 단가'],['qty','연간 수량'],['fx','환율 반영(Y/N)'],['weld','용접 필요(Y/N)'],
  ...CATS.flatMap(([k,l])=>[[`c:${k}:0`,`기존 ${l}`],[`c:${k}:1`,`요청 ${l}`]]),
  ['rawShare','원재료 비중(%)'],['laborShare','인건비 비중(%)'],['idxOld','기존월 시세(직접입력)'],['idxNew','신규월 시세(직접입력)'],['laborPct','인건비 변동률(%)'],['weight','원재료 중량(kg/개)'],['yield','수율(%)'],['note','비고']];
const normH=h=>String(h??'').replace(/[\s()\/·_\-:]/g,'').replace(/원$/,'').toLowerCase();
const HMAP=Object.fromEntries(COLS.map(([k,h])=>[normH(h),k]));
Object.assign(HMAP,{[normH('용접')]:'weld',[normH('용접여부')]:'weld',[normH('용접 필요')]:'weld',[normH('품번')]:'code',[normH('품목')]:'name',[normH('공급사')]:'bp',[normH('BP')]:'bp',[normH('업체')]:'bp',[normH('재질')]:'mat',[normH('기존단가(원)')]:'oldPrice',[normH('신규단가')]:'newPrice',[normH('요청단가(원)')]:'newPrice',[normH('견적단가')]:'newPrice',[normH('수량')]:'qty'});
function cellVal(r,k){ if(k==='oldYm'||k==='newYm') return dot(r[k]); if(k==='weld') return r.weld==='Y'?'Y':'N'; if(k.startsWith('c:')){ const [,c,j]=k.split(':'); return r.costs?.[c]?.[+j]??''; } if(k==='mat') return MAT[r.mat]?.name||r.mat; return r[k]??''; }
function rowFrom(obj){
  const r=blank(); r.newYm='';
  Object.entries(obj).forEach(([h,v])=>{ const k=HMAP[normH(h)]; if(!k||v===''||v==null) return;
    if(k.startsWith('c:')){ const [,c,j]=k.split(':'); r.costs[c]=r.costs[c]||['','']; r.costs[c][+j]=num(v); return; }
    if(k==='mat'){ r.mat=matId(v); if(r.mat==='custom'&&!r.matName) r.matName=String(v); return; }
    if(k==='oldYm'||k==='newYm'){ r[k]=ym(v); return; }
    if(k==='fx'){ r.fx=/^n|아니|미반영/i.test(String(v))?'N':'Y'; return; }
    if(k==='weld'){ r.weld=/^(y|o|예|필요|있|용접)/i.test(String(v).trim())?'Y':'N'; return; }
    if(['oldPrice','newPrice','qty','rawShare','laborShare','idxOld','idxNew','laborPct','weight','yield'].includes(k)){ const n=num(v); r[k]=ok(n)?n:''; return; }
    r[k]=String(v); });
  if(!r.newYm) r.newYm=nowYm();
  return r;
}
const libReady=()=>typeof XLSX!=='undefined';
function download(name,blob){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); }
function toCSV(aoa){ return '﻿'+aoa.map(r=>r.map(v=>{ const s=String(v??''); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }).join(',')).join('\r\n'); }
function template(){
  const head=COLS.map(c=>c[1]);
  const ex1=blank(); Object.assign(ex1,{code:'P-10234',name:'(예시) RF 케이블 어셈블리',bp:'OO전선',mat:'cu',oldYm:'2025-10',oldPrice:48000,newYm:'2026-10',weld:'N',newPrice:56000,qty:1200,costs:{raw:[19000,25500],labor:[9000,10000],proc:[8000,9000],pack:[1500,1800],admin:[5000,5500],profit:[5500,4200]}});
  const ex2=blank(); Object.assign(ex2,{code:'Q-55120',name:'(예시) 석영 링',bp:'OO쿼츠',mat:'custom',matName:'합성 석영 잉곳',idxOld:100,idxNew:104,oldYm:'2025-04',weld:'Y',oldPrice:820000,newYm:'2026-10',newPrice:910000,qty:40,rawShare:45,laborShare:25});
  const aoa=[head,...[ex1,ex2].map(r=>COLS.map(([k])=>cellVal(r,k)))];
  const mats=[['원재료(이 이름 그대로 쓰기)','단위','DB 출처','비고'],...MATS.map(m=>[m.name,m.unit,m.srcs.map(s=>s[3]).join(' / ')||'직접 입력', m.id==='custom'?'"원재료명(직접입력)"과 기존월/신규월 시세 칸을 채우세요':''])];
  const how=[['작성 방법'],['· 한 줄에 한 품목. 필수: 품목명, 원재료, 기존 견적월, 기존 단가, 신규 견적월, 요청 단가'],['· 견적월은 2025.10처럼 YYYY.MM (2025-10이나 날짜를 넣어도 인식합니다)'],['· 용접 필요(Y/N): Y면 인건비 변동을 용접공 노임단가(대한건설협회)로, N이면 최저임금으로 계산합니다'],['· 원재료는 "원재료목록" 시트의 이름이나 구리·SUS316L·석영처럼 써도 인식합니다. 목록에 없으면 원재료명과 기존/신규월 시세(직접입력)를 채우세요'],['· 원가 항목(기존/요청 원재료비·인건비…)은 원가표가 있을 때만 채우세요. 없으면 원재료·인건비 비중(%)으로 추정합니다'],['· 인건비 변동률을 비우면 최저임금 인상률을 씁니다'],['· 예시 두 줄은 지우고 쓰세요']];
  if(libReady()){ const wb=XLSX.utils.book_new(); const ws=XLSX.utils.aoa_to_sheet(aoa); ws['!cols']=head.map(h=>({wch:Math.max(10,h.length*2)})); XLSX.utils.book_append_sheet(wb,ws,'검토목록'); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(mats),'원재료목록'); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(how),'작성방법'); XLSX.writeFile(wb,'PSK_단가인상검토_양식.xlsx'); }
  else download('PSK_단가인상검토_양식.csv',new Blob([toCSV(aoa)],{type:'text/csv;charset=utf-8'}));
}
function parseCSV(t){ const out=[]; let row=[],cur='',q=false; for(let i=0;i<t.length;i++){ const c=t[i]; if(q){ if(c==='"'){ if(t[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=c; } else if(c==='"') q=true; else if(c===','){row.push(cur);cur='';} else if(c==='\n'){row.push(cur.replace(/\r$/,''));out.push(row);row=[];cur='';} else cur+=c; } if(cur||row.length){row.push(cur);out.push(row);} return out; }
async function upload(file){
  const msg=$p('#pr-msg'); msg.textContent='읽는 중…';
  try{
    let objs=[];
    if(/\.csv$/i.test(file.name)||!libReady()){
      if(!/\.csv$/i.test(file.name)) throw Error('엑셀 라이브러리를 불러오지 못했습니다. CSV로 저장해서 올려주세요.');
      const aoa=parseCSV((await file.text()).replace(/^﻿/,'')); const h=aoa.shift()||[]; objs=aoa.filter(r=>r.some(x=>x!=='')).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));
    } else {
      const wb=XLSX.read(await file.arrayBuffer(),{cellDates:true}); const name=wb.SheetNames.find(n=>/검토|목록|list/i.test(n))||wb.SheetNames[0];
      const aoa=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:true});
      const hi=aoa.findIndex(r=>r.filter(c=>HMAP[normH(c)]).length>=3); if(hi<0) throw Error('머리글(품목명·기존 단가 등)을 찾지 못했습니다. 양식을 받아서 써주세요.');
      const h=aoa[hi]; objs=aoa.slice(hi+1).filter(r=>r.some(x=>x!==''&&x!=null)).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));
    }
    const add=objs.map(rowFrom).filter(r=>r.name||r.code||ok(num(r.oldPrice)));
    const dropEx=add.filter(r=>!String(r.name).startsWith('(예시)'));
    rows=rows.concat(dropEx); sel=-1; save(); renderAll();
    const res=dropEx.map(calc); const miss=res.filter(o=>o.v==='입력 필요'||o.v==='시세 확인').length;
    msg.textContent=`${dropEx.length}개 품목을 추가했습니다${add.length>dropEx.length?` (예시 ${add.length-dropEx.length}줄 제외)`:''}.${miss?` 입력·시세 확인 필요 ${miss}개`:''}`;
  }catch(err){ msg.textContent='올리기 실패: '+err.message; }
}
function exportOut(){
  if(!rows.length){ $p('#pr-msg').textContent='저장할 품목이 없습니다.'; return; }
  const extra=['요청 인상률','원재료 시세 출처','기존월 시세','신규월 시세','시세 단위','원재료 시세 변동(원화)','인건비 변동','근거 단가','근거 인상률','요청-근거(원/개)','근거 대비','판정','초과액(연)','확인 사항'];
  const head=COLS.map(c=>c[1]).concat(extra);
  const aoa=[head,...rows.map(r=>{ const o=calc(r), mv=o.mv||{}; const pr=v=>ok(v)?+(v*100).toFixed(2):'';
    return COLS.map(([k])=>cellVal(r,k)).concat([pr(o.req),mv.src||mv.why||'',ok(mv.a)?+mv.a.toFixed(2):'',ok(mv.b)?+mv.b.toFixed(2):'',mv.unit||'',pr(mv.pct),pr(o.lb.pct),ok(o.just)?Math.round(o.just):'',pr(o.justPct),ok(o.P1)&&ok(o.just)?Math.round(o.P1-o.just):'',pr(o.gap),o.v,o.save?Math.round(o.save):'',o.flags.join(' / ')]); })];
  const d=new Date(), stamp=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  if(libReady()){ const wb=XLSX.utils.book_new(); const ws=XLSX.utils.aoa_to_sheet(aoa); ws['!cols']=head.map(h=>({wch:Math.max(10,Math.min(28,h.length*2))})); XLSX.utils.book_append_sheet(wb,ws,'검토결과');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['판정 기준'],[`적정: 근거 단가 대비 +${cfg.tol}% 이하`],[`협상 검토: +${cfg.tol}~${cfg.over}%`],[`과다 요청: +${cfg.over}% 초과`],[`원가표 없을 때 기본 비중: 원재료 ${cfg.rawShare}% · 인건비 ${cfg.laborShare}%`],['근거 단가 = 기존 단가 + 원재료비×시세 변동률 + 인건비×인건비 변동률 (+직접 지정 항목)'],['시세: PSK Material Intelligence Board DB 월평균 (Investing·LME·SHFE·KOMIS·SMM·Acerinox)']]),'기준');
    XLSX.writeFile(wb,`PSK_단가인상검토_결과_${stamp}.xlsx`); }
  else download(`PSK_단가인상검토_결과_${stamp}.csv`,new Blob([toCSV(aoa)],{type:'text/csv;charset=utf-8'}));
}
const won=v=>{ if(!ok(v)) return '—'; const a=Math.abs(v); return a>=1e8?(v/1e8).toFixed(2)+'억':a>=1e4?Math.round(v/1e4).toLocaleString('ko-KR')+'만':f0(v); };
/* ---------- 검토 보고서 PDF (A4 가로) ---------- */
const RPT_CSS=`
.prr{position:fixed;left:-20000px;top:0;z-index:-1}
.prr .pg{width:1123px;height:794px;box-sizing:border-box;padding:34px 42px 0;background:#fff;color:#1d1b26;font-family:"IBM Plex Sans KR","Pretendard","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif;font-size:12px;line-height:1.45;position:relative;overflow:hidden}
.prr .hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #6b3fc4;padding-bottom:8px;margin-bottom:16px}
.prr .hd .t{font-size:17px;font-weight:700} .prr .hd .s{font-size:11px;color:#6b3fc4;letter-spacing:.06em;font-weight:600}
.prr .hd .r{font-size:11px;color:#7d7894;text-align:right}
.prr .ft{position:absolute;left:42px;right:42px;bottom:16px;display:flex;justify-content:space-between;font-size:10px;color:#9a96ad;border-top:1px solid #e6e3ee;padding-top:6px}
.prr .cover-t{font-size:30px;font-weight:800;letter-spacing:-.01em;margin:6px 0 2px} .prr .cover-s{color:#5c5872;font-size:13px;margin-bottom:18px}
.prr .kp{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:16px}
.prr .kp div{border:1px solid #e6e3ee;border-radius:10px;padding:11px 13px;background:#faf9fd}
.prr .kp small{display:block;color:#7d7894;font-size:10.5px} .prr .kp b{display:block;font-size:22px;font-weight:700;margin:2px 0;font-family:"Sora","IBM Plex Sans KR",sans-serif} .prr .kp i{font-style:normal;color:#7d7894;font-size:10.5px}
.prr h4{font-size:13px;margin:0 0 7px;font-weight:700;color:#1d1b26} .prr h4 span{color:#7d7894;font-weight:400;font-size:11px;margin-left:6px}
.prr .bar{display:flex;height:16px;border-radius:8px;overflow:hidden;margin:4px 0 6px;background:#eee}
.prr .lg{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:#5c5872} .prr .lg i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:4px;vertical-align:-1px}
.prr .cols{display:grid;grid-template-columns:1.55fr 1fr;gap:22px}
.prr table{width:100%;border-collapse:collapse;table-layout:fixed}
.prr th{background:#f3f1f8;color:#5c5872;font-weight:600;font-size:10.5px;text-align:left;padding:6px 6px;border-bottom:1px solid #dcd8e6;white-space:nowrap;overflow:hidden}
.prr td{padding:0 6px;height:29px;border-bottom:1px solid #eeecf3;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:middle}
.prr td.n,.prr th.n{text-align:right;font-variant-numeric:tabular-nums}
.prr td small{display:block;color:#9a96ad;font-size:9.5px;line-height:1.2;overflow:hidden;text-overflow:ellipsis}
.prr td b{font-weight:600;display:block;overflow:hidden;text-overflow:ellipsis}
.prr .up{color:#c62f3a} .prr .dn{color:#2f6fb5}
.prr .vb{display:inline-block;padding:2px 8px;border-radius:999px;font-weight:600;font-size:10.5px}
.prr .vb.bad{background:#fde8ea;color:#c62f3a} .prr .vb.warn{background:#fdf1dc;color:#a8650f} .prr .vb.good{background:#e3f4ea;color:#2f8a57} .prr .vb.na{background:#efeef3;color:#7d7894}
.prr .note{font-size:10.5px;color:#7d7894;line-height:1.6}
.prr .box{border:1px solid #e6e3ee;border-radius:10px;padding:12px 14px}
.prr .dets{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.prr .card{border:1px solid #e6e3ee;border-radius:12px;padding:14px 16px;max-height:640px;box-sizing:border-box;overflow:hidden}
.prr .card .top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px}
.prr .card .nm{font-size:15px;font-weight:700;line-height:1.3} .prr .card .cd{font-size:10.5px;color:#7d7894}
.prr .fig{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
.prr .fig div{background:#f6f5fa;border-radius:8px;padding:7px 9px} .prr .fig small{display:block;font-size:9.5px;color:#7d7894} .prr .fig b{font-size:14px;font-weight:700;font-variant-numeric:tabular-nums}
.prr .card td{height:24px;font-size:10.5px} .prr .card th{font-size:9.5px;padding:5px}
.prr .pt{background:#f4effd;border-left:3px solid #6b3fc4;border-radius:6px;padding:9px 11px;font-size:11px;line-height:1.6;margin-top:10px}
.prr .fl{color:#c62f3a;font-size:10.5px;margin:8px 0 0;padding-left:16px}
`;
function exportPdf(){
  const msg=$p('#pr-msg');
  if(!rows.length){ msg.textContent='보고서로 만들 품목이 없습니다.'; return; }
  if(!window.jspdf||!window.html2canvas){ msg.textContent='PDF 도구를 불러오지 못했습니다. 페이지를 새로고침해 주세요.'; return; }
  return makePdf().catch(err=>{ console.error(err); msg.textContent='PDF를 만들지 못했습니다: '+String(err?.message||err).slice(0,80); });
}
async function makePdf(){
  const msg=$p('#pr-msg'), btn=pane.querySelector('[data-a="pdf"]'); btn.disabled=true; msg.textContent='보고서 만드는 중…';
  const V=['과다 요청','협상 검토','적정','인하·동결','시세 확인','입력 필요'], VC={'과다 요청':'#c62f3a','협상 검토':'#e0a03a','적정':'#2f8a57','인하·동결':'#6fb38a','시세 확인':'#b9b6c6','입력 필요':'#dcdae3'};
  const res=rows.map((r,i)=>({r,i,o:calc(r)}));
  const d=new Date(), ymd=`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  let who=''; try{ who=(typeof ME!=='undefined'&&ME?.name)||''; }catch(e){}
  const matName=r=>r.mat==='custom'?(r.matName||'직접 입력'):(MAT[r.mat]?.name||r.mat||'');
  const vb=o=>`<span class="vb ${o.cls}">${o.v}</span>`;
  const cnt={}; V.forEach(v=>cnt[v]=0); let reqSum=0, justSum=0, over=0, nq=0, base=0; const reqs=[], justs=[];
  res.forEach(({o})=>{ cnt[o.v]=(cnt[o.v]||0)+1; if(ok(o.P1)&&ok(o.just)&&ok(o.P0)){ const q=ok(o.qty)?o.qty:1; reqSum+=(o.P1-o.P0)*q; justSum+=(o.just-o.P0)*q; base+=o.P0*q; over+=o.save; if(ok(o.qty)) nq++; reqs.push(o.req); justs.push(o.justPct); } });
  const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;
  const sev={'과다 요청':0,'협상 검토':1,'시세 확인':2,'입력 필요':3,'적정':4,'인하·동결':5};
  const sorted=res.slice().sort((a,b)=>(sev[a.o.v]-sev[b.o.v])||((b.o.gap||0)-(a.o.gap||0)));
  const unit=nq?'원(연간)':'원(개당)';
  const top=res.filter(x=>x.o.save>0).sort((a,b)=>b.o.save-a.o.save).slice(0,8);
  const bps={}; res.forEach(({r,o})=>{ const k=r.bp||'(BP 미입력)'; const B=bps[k]||(bps[k]={n:0,bad:0,warn:0,over:0,req:[]}); B.n++; if(o.cls==='bad')B.bad++; if(o.cls==='warn')B.warn++; B.over+=o.save||0; if(ok(o.req)) B.req.push(o.req); });
  const bpList=Object.entries(bps).sort((a,b)=>b[1].over-a[1].over||b[1].n-a[1].n).slice(0,8);
  const pages=[]; const head=(t)=>`<div class="hd"><div><div class="s">PSK MATERIAL INTELLIGENCE BOARD</div><div class="t">${t}</div></div><div class="r">단가 인상 검토 보고서<br>${ymd}${who?` · ${esc(who)}`:''}</div></div>`;
  /* 1. 요약 */
  pages.push(`<div class="hd" style="border:0;margin:0"><div class="s">PSK MATERIAL INTELLIGENCE BOARD · LAB</div><div class="r">${ymd}${who?`<br>작성 ${esc(who)}`:''}</div></div>
  <div class="cover-t">단가 인상 검토 보고서</div>
  <div class="cover-s">공급사 단가 인상 요청 ${rows.length}건을 원재료 시세·인건비 변동으로 계산한 근거 단가와 비교한 결과입니다.</div>
  <div class="kp">
    <div><small>검토 품목</small><b>${rows.length}</b><i>BP ${Object.keys(bps).length}곳</i></div>
    <div><small>평균 요청 인상률</small><b class="up">${pc(avg(reqs))}</b><i>품목 단순 평균</i></div>
    <div><small>평균 근거 인상률</small><b>${pc(avg(justs))}</b><i>시세·인건비 반영</i></div>
    <div><small>과다 요청 · 협상 검토</small><b><span class="up">${cnt['과다 요청']}</span> · <span style="color:#a8650f">${cnt['협상 검토']}</span></b><i>전체의 ${rows.length?Math.round((cnt['과다 요청']+cnt['협상 검토'])/rows.length*100):0}%</i></div>
    <div><small>근거 초과 요청액</small><b class="up">${won(over)}원</b><i>${unit} · 협상 여지</i></div>
  </div>
  <div class="cols"><div>
    <h4>판정 분포</h4>
    <div class="bar">${V.filter(v=>cnt[v]).map(v=>`<div style="width:${cnt[v]/rows.length*100}%;background:${VC[v]}"></div>`).join('')}</div>
    <div class="lg">${V.filter(v=>cnt[v]).map(v=>`<span><i style="background:${VC[v]}"></i>${v} ${cnt[v]}</span>`).join('')}</div>
    <h4 style="margin-top:18px">근거 초과액 상위 품목 <span>요청 단가 − 근거 단가${nq?' × 연간수량':''}</span></h4>
    <table><colgroup><col style="width:30%"><col style="width:16%"><col style="width:12%"><col style="width:12%"><col style="width:13%"><col style="width:17%"></colgroup>
    <thead><tr><th>품목</th><th>BP</th><th class="n">요청 인상</th><th class="n">근거 인상</th><th>판정</th><th class="n">초과액</th></tr></thead><tbody>
    ${top.length?top.map(({r,o})=>`<tr><td><b>${esc(r.name||'(품목명 없음)')}</b><small>${esc(r.code)}</small></td><td>${esc(r.bp)}</td><td class="n up">${pc(o.req)}</td><td class="n">${pc(o.justPct)}</td><td>${vb(o)}</td><td class="n"><b>${f0(o.save)}원</b></td></tr>`).join(''):`<tr><td colspan="6" style="color:#7d7894">근거 단가를 넘는 요청이 없습니다.</td></tr>`}
    </tbody></table>
  </div><div>
    <h4>BP별 요약</h4>
    <table><colgroup><col style="width:34%"><col style="width:12%"><col style="width:20%"><col style="width:14%"><col style="width:20%"></colgroup>
    <thead><tr><th>BP</th><th class="n">품목</th><th class="n">평균 요청</th><th class="n">과다·협상</th><th class="n">초과액</th></tr></thead><tbody>
    ${bpList.map(([k,B])=>`<tr><td><b>${esc(k)}</b></td><td class="n">${B.n}</td><td class="n">${pc(avg(B.req))}</td><td class="n">${B.bad+B.warn?`<span class="up">${B.bad}</span> · ${B.warn}`:'—'}</td><td class="n">${B.over?won(B.over)+'원':'—'}</td></tr>`).join('')}
    </tbody></table>
    <div class="box" style="margin-top:16px">
      <h4>요청 vs 근거 인상액 합계</h4>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin:4px 0"><span>요청 인상액</span><b>${f0(reqSum)}원</b></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin:4px 0"><span>근거 인상액</span><b>${f0(justSum)}원</b></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin:4px 0" class="up"><span>근거 초과</span><b>${f0(over)}원</b></div>
      <div class="note">${unit} 기준${base?` · 기존 구매액 ${won(base)}원 대비 요청 ${pc(reqSum/base)}, 근거 ${pc(justSum/base)}`:''}</div>
    </div>
  </div></div>
  <div class="note" style="margin-top:14px">판정 기준(근거 단가 대비): 적정 +${cfg.tol}% 이하 · 협상 검토 +${cfg.tol}~${cfg.over}% · 과다 요청 +${cfg.over}% 초과. 근거 단가 = 기존 단가 + 원재료비 × 원재료 시세 변동률 + 인건비 × 인건비 변동률(+직접 지정 항목). 원가표가 없으면 원재료 ${cfg.rawShare}% · 인건비 ${cfg.laborShare}% 비중으로 추정합니다.</div>`);
  /* 2. 전체 검토표 */
  const PER=19, tp=Math.ceil(sorted.length/PER);
  for(let p=0;p<tp;p++){ const part=sorted.slice(p*PER,(p+1)*PER);
    pages.push(head(`전체 품목 검토표 <span style="font-size:12px;color:#7d7894;font-weight:400">${p*PER+1}–${p*PER+part.length} / ${sorted.length} · 판정 심각도순</span>`)+`
    <table><colgroup><col style="width:3%"><col style="width:17%"><col style="width:10%"><col style="width:10%"><col style="width:8.5%"><col style="width:8.5%"><col style="width:6.5%"><col style="width:9%"><col style="width:6.5%"><col style="width:8.5%"><col style="width:6.5%"><col style="width:8.5%"></colgroup>
    <thead><tr><th class="n">#</th><th>품목</th><th>BP</th><th>원재료</th><th class="n">기존 단가</th><th class="n">요청 단가</th><th class="n">요청 인상</th><th class="n">원재료 시세</th><th class="n">인건비</th><th class="n">근거 단가</th><th class="n">근거 대비</th><th>판정</th></tr></thead><tbody>
    ${part.map(({r,i,o})=>`<tr><td class="n">${i+1}</td><td><b>${esc(r.name||'(품목명 없음)')}</b><small>${esc(r.code)}</small></td><td>${esc(r.bp)}</td><td>${esc(matName(r))}</td>
      <td class="n">${f0(o.P0)}<small>${esc(dot(r.oldYm))}</small></td><td class="n">${f0(o.P1)}<small>${esc(dot(r.newYm))}</small></td><td class="n ${o.req>0?'up':o.req<0?'dn':''}">${pc(o.req)}</td>
      <td class="n">${o.mv&&ok(o.mv.pct)?`<span class="${o.mv.pct>0?'up':'dn'}">${pc(o.mv.pct)}</span><small>${esc(o.mv.src)}</small>`:'<small>시세 없음</small>'}</td><td class="n">${pc(o.lb.pct)}</td>
      <td class="n">${f0(o.just)}<small>${pc(o.justPct)}</small></td><td class="n ${o.gap>0?'up':''}"><b>${pc(o.gap)}</b></td><td>${vb(o)}</td></tr>`).join('')}
    </tbody></table>`);
  }
  /* 3. 품목별 상세 (과다 요청·협상 검토) */
  const flag=sorted.filter(x=>x.o.cls==='bad'||x.o.cls==='warn'), MAXD=40, shown=flag.slice(0,MAXD);
  for(let p=0;p<shown.length;p+=2){
    pages.push(head(`협상 대상 품목 상세 <span style="font-size:12px;color:#7d7894;font-weight:400">${p+1}–${Math.min(p+2,shown.length)} / ${flag.length}${flag.length>MAXD?` (상위 ${MAXD}건만 수록)`:''}</span>`)+`<div class="dets">${shown.slice(p,p+2).map(({r,i,o})=>{
      const target=ok(o.just)?o.just*(1+cfg.tol/100):NaN, q=ok(o.qty)?o.qty:NaN;
      const mv=o.mv||{};
      return `<div class="card"><div class="top"><div><div class="nm">${esc(r.name||'(품목명 없음)')}</div><div class="cd">#${i+1} · ${esc(r.code)} · ${esc(r.bp)} · ${esc(matName(r))}${ok(q)?` · 연 ${f0(q)}개`:''}</div></div>${vb(o)}</div>
      <div class="fig"><div><small>기존 단가 · ${esc(dot(r.oldYm))}</small><b>${f0(o.P0)}</b></div><div><small>요청 단가 · ${esc(dot(r.newYm))}</small><b class="up">${f0(o.P1)}</b><small>${pc(o.req)}</small></div>
        <div><small>근거 단가</small><b>${f0(o.just)}</b><small>${pc(o.justPct)}</small></div><div><small>근거 대비</small><b class="up">${pc(o.gap)}</b><small>초과 ${f0(o.P1-o.just)}원/개</small></div></div>
      <h4>원가 항목별 검토</h4>
      <table><colgroup><col style="width:22%"><col style="width:15%"><col style="width:13%"><col style="width:15%"><col style="width:15%"><col style="width:20%"></colgroup>
      <thead><tr><th>항목</th><th class="n">기존 금액</th><th class="n">인정 변동</th><th class="n">인정 증가액</th><th class="n">요청 금액</th><th>근거</th></tr></thead><tbody>
      ${o.lines.map(l=>`<tr><td><b>${esc(l.label)}</b></td><td class="n">${f0(l.base)}</td><td class="n ${l.pct>0?'up':''}">${pc(l.pct)}</td><td class="n">${f0(l.delta)}</td><td class="n ${l.flag?'up':''}">${ok(l.req)?f0(l.req):'—'}${ok(l.reqPct)?`<small>${pc(l.reqPct)}</small>`:''}</td><td title="${esc(l.how)}"><small style="color:#5c5872;font-size:10px;white-space:normal;max-height:24px">${esc(l.how)}</small></td></tr>`).join('')}
      </tbody></table>
      ${o.hasBreak?'':`<div class="note" style="margin-top:4px">원가표 미입력 → 기본 비중(원재료 ${ok(num(r.rawShare))?num(r.rawShare):cfg.rawShare}% · 인건비 ${ok(num(r.laborShare))?num(r.laborShare):cfg.laborShare}%)으로 추정</div>`}
      <div class="note" style="margin-top:8px"><b style="color:#1d1b26">원재료 시세</b> ${ok(mv.pct)?`${esc(mv.src)} ${f2(mv.a)} → ${f2(mv.b)} ${esc(mv.unit||'')} (${pc(mv.native)}${mv.krw?`, 원화 환산 ${pc(mv.pct)}`:''})`:esc(mv.why||'자료 없음')}<br><b style="color:#1d1b26">인건비</b> ${esc(o.lb.src)} (${pc(o.lb.pct)})</div>
      ${o.flags.length?`<ul class="fl">${o.flags.slice(0,3).map(f=>`<li>${esc(f)}</li>`).join('')}</ul>`:''}
      <div class="pt"><b>협상 포인트</b><br>요청 단가 ${f0(o.P1)}원은 근거 단가 ${f0(o.just)}원보다 ${pc(o.gap)} 높습니다. 목표 단가 <b>${f0(target)}원 이하</b>(근거 +${cfg.tol}%)를 제시하세요.${o.save?` 연간 초과액 ${f0(o.save)}원.`:''}${o.lines.filter(l=>l.flag).length?` 특히 ${o.lines.filter(l=>l.flag).map(l=>l.label).join('·')} 요청 인상률이 근거보다 큽니다.`:''}</div>
      ${r.note?`<div class="note" style="margin-top:6px">메모: ${esc(r.note)}</div>`:''}</div>`; }).join('')}</div>`);
  }
  /* 그리기 */
  const st=document.createElement('style'); st.textContent=RPT_CSS; const box=document.createElement('div'); box.className='prr';
  box.innerHTML=pages.map((h,i)=>`<div class="pg">${h}<div class="ft"><span>PSK Material Intelligence Board · 단가 인상 검토 보고서 · 시세 출처: Investing·LME·SHFE·KOMIS·SMM·Acerinox 월평균</span><span>${i+1} / ${pages.length}</span></div></div>`).join('');
  document.head.appendChild(st); document.body.appendChild(box);
  try{
    if(document.fonts?.ready) await document.fonts.ready;
    const { jsPDF }=window.jspdf; const pdf=new jsPDF({unit:'mm',format:'a4',orientation:'landscape'});
    const els=[...box.children];
    for(let i=0;i<els.length;i++){ msg.textContent=`보고서 그리는 중… ${i+1}/${els.length}쪽`;
      const c=await html2canvas(els[i],{scale:1.7,backgroundColor:'#ffffff',logging:false,width:1123,height:794,windowWidth:1123});
      if(i) pdf.addPage('a4','landscape'); pdf.addImage(c.toDataURL('image/jpeg',0.86),'JPEG',0,0,297,210); }
    pdf.save(`PSK_Price_Review_Report_${ymd.replace(/\./g,'')}.pdf`);
    msg.textContent=`검토 보고서 PDF를 저장했습니다 (${els.length}쪽).`;
  }finally{ box.remove(); st.remove(); btn.disabled=false; }
}
pane.querySelector('.pr-bar').addEventListener('click',e=>{ const a=e.target.dataset.a; if(!a) return;
  if(a==='add'){ const r=blank(); if(rows[sel]) { r.oldYm=rows[sel].oldYm; r.newYm=rows[sel].newYm; r.bp=rows[sel].bp; } rows.push(r); sel=rows.length-1; save(); renderAll(); $p('#pr-det').scrollIntoView({behavior:'smooth'}); }
  if(a==='tpl') template();
  if(a==='out') exportOut();
  if(a==='pdf') exportPdf();
  if(a==='clear'){ if(rows.length&&window.confirm(`검토 목록 ${rows.length}개를 모두 지울까요? 되돌릴 수 없습니다.`)){ rows=[]; sel=-1; save(); renderAll(); } } });
pane.querySelector('[data-a="up"]').addEventListener('change',e=>{ const f=e.target.files?.[0]; if(f) upload(f); e.target.value=''; });

/* ---------- DB 불러오기 ---------- */
async function loadDB(){
  const get=u=>fetch(u+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
  const [d,l,s]=await Promise.all([get('data.json'),get('lme_kna.json'),get('sus316.json')]);
  if(!d){ try{ const e=JSON.parse(document.getElementById('snap')?.textContent||'{}'); if(e.history) DB.data=e; }catch(e){} } else DB.data=d;
  DB.lme=l; DB.sus=s;
  try{ await AL?.ready; }catch(e){}
  const n=MATS.filter(m=>m.srcs.some(([k,key])=>series(k,key))).length;
  $p('#pr-dbnote').textContent=DB.data?`시세 DB 연결됨 · 원재료 ${n}종 · ${DB.data.prices?.finishedAt||''} 기준`:'시세 DB를 불러오지 못했습니다';
  renderAll();
}
renderAll(); loadDB();
})();
