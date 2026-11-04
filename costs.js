/* 원료 외 추세 — 에너지 · 인건비 · 물류비 · 유류비 10년 월별
   자동 수집: costs.json (FRED·Investing·KOMIS, 하루 1회)
   공식 발표값(아래 고정): 국가별 최저임금, 한국 용접공 노임단가, 한국 산업용 전기 판매단가·SMP */
(()=>{
'use strict';
const after=document.getElementById('alloy')||document.getElementById('trend'); if(!after||document.getElementById('costs')) return;

/* ---------- 공식 발표값 ---------- */
const WAGES=[
 {id:'kr', name:'한국 최저임금', cur:'KRW', unit:'원/시간', hours:1, src:'최저임금위원회 고시 (매년 1/1)', url:'https://www.minimumwage.go.kr/',
  pts:[['2016-01',6030],['2017-01',6470],['2018-01',7530],['2019-01',8350],['2020-01',8590],['2021-01',8720],['2022-01',9160],['2023-01',9620],['2024-01',9860],['2025-01',10030],['2026-01',10320]], next:'2027.1 ₩10,700 (+3.7%) 확정'},
 {id:'weld', name:'한국 용접공 노임단가', cur:'KRW', unit:'원/일(8시간)', hours:8, src:'대한건설협회 건설업 시중노임단가 · 용접공(직종 1012, 1/1·9/1 공표)', url:'https://www.cak.or.kr/',
  pts:[['2019-01',198711],['2019-09',209394],['2020-01',223094],['2020-09',224357],['2021-09',230706],['2022-01',234564],['2022-09',238739],['2023-01',249748],['2023-09',262551],['2024-01',267021],['2024-09',270724],['2025-01',278326],['2025-09',280178],['2026-01',282536],['2026-09',286330]],
  next:'2019년 이전·2021.1 공표분은 원문을 확보하지 못해 비어 있거나 직전 값 유지'},
 {id:'jp', name:'일본 최저임금(전국 가중평균)', cur:'JPY', unit:'엔/시간', hours:1, src:'후생노동성 지역별 최저임금 전국 가중평균 (매년 10월경 적용)', url:'https://www.mhlw.go.jp/',
  pts:[['2015-10',798],['2016-10',823],['2017-10',848],['2018-10',874],['2019-10',901],['2020-10',902],['2021-10',930],['2022-10',961],['2023-10',1004],['2024-10',1055],['2025-10',1121],['2026-10',1176]], next:'2026년도 ¥1,176 (+55엔, +4.9%) · 지역별로 10월 이후 순차 적용'},
 {id:'vn', name:'베트남 최저임금(1지역 하노이·호치민)', cur:'VND', unit:'동/월', hours:208, src:'베트남 정부령 지역 최저임금 (Decree 293/2025/ND-CP 등)', url:'https://www.aseanbriefing.com/vietnam-news/vietnams-new-minimum-wage-january-1-2026',
  pts:[['2016-01',3500000],['2017-01',3750000],['2018-01',3980000],['2019-01',4180000],['2020-01',4420000],['2022-07',4680000],['2024-07',4960000],['2026-01',5310000]], next:'시간 환산은 월 208시간(26일×8시간) 기준'},
 {id:'chi', name:'미국 시카고 최저임금', cur:'USD', unit:'$/시간', hours:1, src:'Chicago Minimum Wage Ordinance (매년 7/1)', url:'https://www.chicago.gov/city/en/depts/bacp/supp_info/minimumwageinformation.html',
  pts:[['2015-07',10],['2016-07',10.5],['2017-07',11],['2018-07',12],['2019-07',13],['2020-07',14],['2021-07',15],['2022-07',15.4],['2023-07',15.8],['2024-07',16.2],['2025-07',16.6],['2026-07',17.05]], next:'일리노이주 전체는 2025년부터 $15'},
 {id:'bos', name:'미국 보스턴 최저임금(매사추세츠주)', cur:'USD', unit:'$/시간', hours:1, src:'Massachusetts 주 최저임금 (1/1) · 보스턴 시 별도 최저임금 없음', url:'https://www.mass.gov/minimum-wage-program',
  pts:[['2015-01',9],['2016-01',10],['2017-01',11],['2019-01',12],['2020-01',12.75],['2021-01',13.5],['2022-01',14.25],['2023-01',15]], next:'2023년 $15 이후 추가 인상 예정 없음'},
 {id:'my', name:'말레이시아 최저임금', cur:'MYR', unit:'링깃/월', hours:208, src:'Minimum Wages Order (반도 말레이시아·도시 지역)', url:'https://www.freemalaysiatoday.com/category/leisure/2024/11/15/minimum-wage-in-malaysia-an-overview',
  pts:[['2013-01',900],['2016-07',1000],['2019-01',1100],['2020-02',1200],['2022-05',1500],['2025-02',1700]], next:'시간 환산은 월 208시간 기준(RM1,700 ≈ RM8.17/시간) · RM2,000 인상 논의 중'},
 {id:'gva', name:'스위스 제네바 최저임금', cur:'CHF', unit:'CHF/시간', hours:1, src:'제네바 주 최저임금 (2020.11 도입) · 스위스는 전국 최저임금이 없어 가장 높은 제네바 기준', url:'https://www.ge.ch/appliquer-salaire-minimum-genevois/montant-calcul-du-salaire-minimum',
  pts:[['2020-11',23.00],['2021-01',23.14],['2022-01',23.27],['2023-01',24.00],['2024-01',24.32],['2025-01',24.48],['2026-01',24.59]], next:'2020.11 이전에는 최저임금 제도 없음'},
];
/* 다른 화면(단가 인상 검토)에서 쓰도록 공개: 해당 월에 적용 중인 임금 */
window.PSK_COSTS={WAGES, wageAt:(id,ym)=>{ const w=WAGES.find(x=>x.id===id); if(!w||!ym) return null; let v=null, d=null; for(const [m,x] of w.pts) if(m<=ym){ v=x; d=m; } return v==null?null:{v,d,unit:w.unit,name:w.name}; }};
const KR_ELEC={2015:107.41,2016:107.11,2017:107.41,2018:106.46,2019:106.56,2020:107.35,2021:105.48,2022:118.66,2023:153.71,2024:168.17,2025:181.9};
const KR_SMP={2016:76.91,2017:81.39,2018:94.64,2019:90.09,2020:68.52,2021:93.98,2022:196.04,2023:167.0,2024:128.33,2025:112.73};
const CATS=[['labor','인건비'],['energy','에너지(전력)'],['logi','물류비'],['fuel','유류비']];

let D=null, cat='labor', cur='kr', view='krw', span=120;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ok=Number.isFinite;
const fmtN=(v,d)=>ok(v)?v.toLocaleString('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const auto=v=>!ok(v)?'—':Math.abs(v)>=1000?fmtN(v,0):Math.abs(v)>=100?fmtN(v,1):fmtN(v,2);
const pc=v=>ok(v)?(v>0?'+':'')+(v*100).toFixed(1)+'%':'—';

/* 모든 지표를 같은 월 축으로 */
function build(){
  const M=D.months, L=[];
  const step=pts=>M.map(m=>{ let v=null; for(const [d,x] of pts) if(d<=m) v=x; return v; });
  WAGES.forEach(w=>L.push({id:w.id, cat:'labor', name:w.name, unit:w.unit, cur:w.cur, kind:'wage', hours:w.hours, src:w.src, url:w.url, note:w.next, v:step(w.pts)}));
  L.push({id:'kr_elec', cat:'energy', name:'한국 산업용 전기 판매단가', unit:'원/kWh', cur:'KRW', kind:'price', src:'한국전력 용도별 판매단가 (연평균 · 한국에너지공단 EG-TIPS, 2025년은 한전 발표)', url:'https://tips.energy.or.kr/statistics/statistics_view0703.do', note:'연간 평균값이라 한 해 동안 같은 값', v:M.map(m=>KR_ELEC[+m.slice(0,4)]??null)});
  L.push({id:'kr_smp', cat:'energy', name:'한국 전력 도매가격(SMP, 육지)', unit:'원/kWh', cur:'KRW', kind:'price', src:'전력거래소 연도별 계통한계가격 (연평균)', url:'https://new.kpx.or.kr/smpYearly.es?mid=a10606080400&device=pc', note:'연간 평균값 · 2026년은 연말 확정 후 반영', v:M.map(m=>KR_SMP[+m.slice(0,4)]??null)});
  Object.entries(D.series).forEach(([id,s])=>L.push({id, cat:s.cat, name:s.name, unit:s.unit, cur:s.cur, kind:s.cur?'price':'index', src:s.src, v:s.v}));
  const order={labor:0,energy:1,logi:2,fuel:3};
  return L.sort((a,b)=>order[a.cat]-order[b.cat]);
}
let IND=[];
const fxv=(c,i)=>c==='KRW'?1:(D.fx?.[c]?.[i]??null);
/* 표시 값: native / krw(원화 환산, 인건비는 원/시간) / idx(기간 시작=100) */
function values(s,mode){
  return s.v.map((x,i)=>{ if(x==null) return null;
    if(mode==='native') return x;
    if(mode==='krw'){ if(!s.cur) return x; const f=fxv(s.cur,i); if(f==null) return null; return s.kind==='wage'? x/(s.hours||1)*f : x*f; }
    return x; });
}
function stats(s,mode){
  const v=values(s,mode), n=v.length; let li=n-1; while(li>=0&&v[li]==null) li--;
  const at=k=>{ const i=li-k; return i>=0&&v[i]!=null?v[i]:null; };
  const first=v.findIndex(x=>x!=null);
  const yrs=(li-first)/12;
  return {last:v[li], lastM:D.months[li], y1:at(12), y5:at(60), y10:at(120), first:v[first], firstM:D.months[first], cagr: yrs>=1&&v[first]>0? Math.pow(v[li]/v[first],1/yrs)-1 : NaN};
}
function krwUnit(s){ if(s.kind==='wage') return '원/시간'; if(!s.cur||s.cur==='KRW') return s.unit; return '원'+s.unit.replace(/^\$/,''); }

const css=document.createElement('style');
css.textContent=`
#costs .co-row{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}
#costs .co-chip{border:1px solid var(--line);background:var(--panel);color:var(--ink-2);border-radius:999px;padding:5px 12px;font:500 12.5px var(--font-body);cursor:pointer}
#costs .co-chip[aria-pressed="true"]{background:var(--ink);color:var(--panel);border-color:var(--ink)}
#costs .co-cat .co-chip{font-size:13.5px;padding:7px 15px}
#costs .co-cat .co-chip[aria-pressed="true"]{background:var(--copper);border-color:var(--copper)}
#costs .co-ctl{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 10px}
#costs .co-seg{display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
#costs .co-seg button{border:0;background:var(--panel);color:var(--ink-2);padding:6px 12px;font:500 12.5px var(--font-body);cursor:pointer}
#costs .co-seg button[aria-pressed="true"]{background:var(--copper-soft);color:var(--copper);font-weight:600}
#costs .co-seg button:disabled{opacity:.4;cursor:default}
#costs .co-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 10px}
#costs .co-kpi div{background:var(--sunk);border-radius:10px;padding:10px 12px}
#costs .co-kpi small{display:block;color:var(--ink-3);font-size:12px}
#costs .co-kpi b{display:block;font:700 19px var(--font-display);margin:2px 0}
#costs h3{font-size:15px;margin:18px 0 6px}
#costs table.co-t{width:100%;border-collapse:collapse;font-size:12.5px}
#costs .co-t th{text-align:left;color:var(--ink-2);font-weight:600;padding:7px 8px;border-bottom:1px solid var(--line);background:var(--sunk);white-space:nowrap}
#costs .co-t td{padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}
#costs .co-t td.n{text-align:right;font-family:var(--font-data);white-space:nowrap}
#costs .co-t tr.click{cursor:pointer} #costs .co-t tr.click:hover td{background:var(--sunk)} #costs .co-t tr.on td{background:var(--copper-soft)}
#costs .co-t small{color:var(--ink-3)}
#costs .up{color:var(--up)} #costs .down{color:var(--down)}
#costs .co-wrap{overflow-x:auto}
#costs .co-note{font-size:12px;color:var(--ink-3);line-height:1.65}
#costs .co-src{font-size:12.5px;color:var(--ink-2);background:var(--sunk);border-radius:9px;padding:9px 12px;margin:8px 0;line-height:1.6}
@media(max-width:800px){#costs .co-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
document.head.appendChild(css);

const pane=document.createElement('section');
pane.className='pane'; pane.id='costs'; pane.hidden=true; pane.setAttribute('role','tabpanel');
pane.dataset.label='원료 외 추세'; pane.dataset.desc='에너지(전력)·인건비(국가별 최저임금·용접공)·물류비·유류비 10년 월별 추세와 원화 환산';
pane.innerHTML=`
<div class="co-row co-cat" id="co-cat"></div>
<div class="co-row" id="co-ind"></div>
<div class="co-ctl">
  <div class="co-seg" id="co-view"><button data-v="native">현지 단위</button><button data-v="krw">원화 환산</button><button data-v="idx">지수(시작=100)</button></div>
  <div class="co-seg" id="co-span"><button data-s="36">3년</button><button data-s="60">5년</button><button data-s="120">10년</button></div>
  <span class="co-note" id="co-upd">불러오는 중…</span>
</div>
<div class="co-kpi" id="co-kpi"></div>
<div class="chart" id="co-chart"></div>
<div class="co-src" id="co-src"></div>
<h3 id="co-th">비교</h3>
<div class="co-wrap"><table class="co-t" id="co-cmp"></table></div>
<p class="co-note" id="co-foot"></p>
<details><summary style="cursor:pointer;font-size:13px;color:var(--copper);margin:12px 0 6px">월별 데이터 · 엑셀 저장</summary><div style="margin:6px 0"><button class="btn" type="button" id="co-xls">전체 지표 월별 데이터 저장 (.xlsx)</button></div><div class="co-wrap" style="max-height:420px;overflow:auto"><table class="co-t" id="co-month"></table></div></details>`;
after.after(pane);
const $c=s=>pane.querySelector(s);

$c('#co-cat').addEventListener('click',e=>{ const b=e.target.closest('[data-c]'); if(!b) return; cat=b.dataset.c; cur=(IND.find(s=>s.cat===cat)||{}).id; render(); });
$c('#co-ind').addEventListener('click',e=>{ const b=e.target.closest('[data-i]'); if(!b) return; cur=b.dataset.i; render(); });
$c('#co-view').addEventListener('click',e=>{ const b=e.target.closest('[data-v]'); if(!b||b.disabled) return; view=b.dataset.v; render(); });
$c('#co-span').addEventListener('click',e=>{ const b=e.target.closest('[data-s]'); if(!b) return; span=+b.dataset.s; render(); });
pane.addEventListener('click',e=>{ const tr=e.target.closest('#co-cmp tr[data-i]'); if(tr){ cur=tr.dataset.i; render(); $c('#co-kpi').scrollIntoView({behavior:'smooth',block:'center'}); } if(e.target.id==='co-xls') exportXls(); });

function render(){
  $c('#co-cat').innerHTML=CATS.map(([k,l])=>`<button class="co-chip" data-c="${k}" aria-pressed="${k===cat}">${l}</button>`).join('');
  if(!D){ return; }
  const list=IND.filter(s=>s.cat===cat); if(!list.find(s=>s.id===cur)) cur=list[0]?.id;
  const s=IND.find(x=>x.id===cur);
  $c('#co-ind').innerHTML=list.map(x=>`<button class="co-chip" data-i="${x.id}" aria-pressed="${x.id===cur}">${esc(x.name)}</button>`).join('');
  const canKrw=!!s.cur; if(!canKrw&&view==='krw') view='native';
  pane.querySelectorAll('#co-view button').forEach(b=>{ b.disabled=b.dataset.v==='krw'&&!canKrw; b.setAttribute('aria-pressed',b.dataset.v===view); });
  pane.querySelectorAll('#co-span button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.s===span));
  const mode=view==='idx'?'krw':view;
  let v=values(s, view==='idx'?(canKrw?'krw':'native'):mode);
  const M=D.months, from=Math.max(0,M.length-span);
  let pts=v.map((x,i)=>({i,x})).filter(p=>p.i>=from&&p.x!=null);
  let unit=view==='native'?s.unit:view==='krw'?krwUnit(s):'(시작=100)';
  if(view==='idx'&&pts.length){ const b=pts[0].x; pts=pts.map(p=>({i:p.i,x:p.x/b*100})); }
  const st=stats(s, view==='native'||!canKrw?'native':'krw');
  const fmtU=x=>`${auto(x)} ${view==='idx'?'':unit}`;
  const L=pts[pts.length-1], F=pts[0];
  $c('#co-kpi').innerHTML=`
    <div><small>${esc(s.name)} · ${esc(st.lastM||'')}</small><b>${auto(st.last)}</b><small>${esc(view==='native'||!canKrw?s.unit:krwUnit(s))}${s.cur&&s.cur!=='KRW'&&view!=='krw'?` · 원화 ${auto(stats(s,'krw').last)} ${esc(krwUnit(s))}`:''}</small></div>
    <div><small>1년 전 대비</small><b class="${st.last/st.y1>1?'up':'down'}">${pc(st.last/st.y1-1)}</b><small>${auto(st.y1)}</small></div>
    <div><small>5년 전 대비</small><b class="${st.last/st.y5>1?'up':'down'}">${pc(st.last/st.y5-1)}</b><small>${auto(st.y5)}</small></div>
    <div><small>연평균 상승률 (${esc(st.firstM||'')}~)</small><b class="${st.cagr>0?'up':'down'}">${pc(st.cagr)}</b><small>${esc(st.firstM||'')} ${auto(st.first)} → ${auto(st.last)}</small></div>`;
  const series=pts.map(p=>({d:M[p.i]+'-15', v:+p.x.toFixed(4), n:`${s.name} ${M[p.i].replace('-','.')} · ${auto(s.v[p.i])} ${s.unit}${s.cur&&s.cur!=='KRW'?` · ${auto(values(s,'krw')[p.i])} ${krwUnit(s)}`:''}`}));
  try{ $c('#co-chart').innerHTML=series.length>1&&typeof lineChart==='function'?lineChart(series,{unit:' '+(view==='idx'?'':unit), yFmt:auto}):'<p class="co-note">이 기간에는 데이터가 부족합니다.</p>'; }catch(e){ $c('#co-chart').textContent='차트를 그리지 못했습니다.'; }
  $c('#co-src').innerHTML=`<b>출처</b> ${esc(s.src)}${s.url?` · <a href="${esc(s.url)}" target="_blank" rel="noopener">원문</a>`:''}${s.note?`<br>${esc(s.note)}`:''}${s.cur&&s.cur!=='KRW'?`<br>원화 환산: 각 달 ${s.cur}/KRW 월평균 환율 적용${s.kind==='wage'&&s.hours>1?` · 시간당 = ${s.unit.includes('월')?'월 금액 ÷ '+s.hours+'시간':'일급 ÷ 8시간'}`:''}`:s.kind==='wage'&&s.hours>1?`<br>원화 환산 보기는 시간당(일급 ÷ 8시간)으로 표시`:''}`;
  /* 비교 표 */
  const rows=list.map(x=>{ const a=stats(x,'native'), k=x.cur?stats(x,'krw'):null; return {x,a,k}; });
  if(cat==='labor'){
    $c('#co-th').textContent='국가·직종별 인건비 비교 (원화는 각 달 환율 · 시간당)';
    $c('#co-cmp').innerHTML=`<thead><tr><th>지표</th><th>현재 (현지)</th><th>원화 시간당</th><th>월 환산(209시간)</th><th>1년</th><th>5년</th><th>10년(현지)</th><th>연평균(현지)</th><th>10년(원화)</th></tr></thead><tbody>`+
      rows.map(({x,a,k})=>`<tr class="click ${x.id===cur?'on':''}" data-i="${x.id}"><td><b>${esc(x.name)}</b><small style="display:block">${esc(a.lastM||'')} 기준</small></td><td class="n">${auto(a.last)} <small>${esc(x.unit)}</small></td><td class="n">${fmtN(k?.last,0)}원</td><td class="n">${fmtN(k?.last*209,0)}원</td>
        <td class="n ${a.last/a.y1>1?'up':''}">${pc(a.last/a.y1-1)}</td><td class="n">${pc(a.last/a.y5-1)}</td><td class="n">${pc(a.last/a.y10-1)}</td><td class="n">${pc(a.cagr)}</td><td class="n">${pc(k?.last/k?.y10-1)}</td></tr>`).join('')+'</tbody>';
    $c('#co-foot').textContent='한국 기준 최저임금 대비 배수로 보면 인건비 수준 차이를 가늠할 수 있습니다. 최저임금은 법정 하한이라 실제 제조업 임금(숙련공·수당 포함)보다 낮습니다. 10년 상승률이 "—"인 지표는 10년치 공식 자료가 없는 경우입니다.';
  } else {
    $c('#co-th').textContent=({energy:'에너지 지표 비교',logi:'물류비 지표 비교',fuel:'유류비 지표 비교'})[cat];
    $c('#co-cmp').innerHTML=`<thead><tr><th>지표</th><th>현재</th><th>원화 환산</th><th>1년</th><th>5년</th><th>10년</th><th>연평균</th><th>10년 최저 ~ 최고</th></tr></thead><tbody>`+
      rows.map(({x,a,k})=>{ const vv=x.v.filter(z=>z!=null); return `<tr class="click ${x.id===cur?'on':''}" data-i="${x.id}"><td><b>${esc(x.name)}</b><small style="display:block">${esc(a.lastM||'')} · ${esc(x.unit)}</small></td><td class="n">${auto(a.last)}</td><td class="n">${k&&x.cur!=='KRW'?auto(k.last)+' <small>'+esc(krwUnit(x))+'</small>':'—'}</td>
        <td class="n ${a.last/a.y1>1?'up':'down'}">${pc(a.last/a.y1-1)}</td><td class="n">${pc(a.last/a.y5-1)}</td><td class="n">${pc(a.last/a.y10-1)}</td><td class="n">${pc(a.cagr)}</td><td class="n">${auto(Math.min(...vv))} ~ ${auto(Math.max(...vv))}</td></tr>`; }).join('')+'</tbody>';
    $c('#co-foot').textContent=({energy:'한국 산업용 전기요금과 SMP는 연평균 값이라 해마다 계단 모양으로 표시됩니다. 미국 전력 물가지수는 전기요금 흐름을 보는 참고지표입니다.',
      logi:'운임 물가지수는 미국 노동통계국(BLS) 생산자물가지수로, 운임 수준의 흐름을 보는 지표입니다(지수 기준시점이 서로 달라 수치끼리 직접 비교하지 마세요). BDI는 벌크선 운임이라 컨테이너 운임과는 다릅니다.',
      fuel:'원화 환산은 각 달 원/달러 월평균 환율을 적용했습니다. 런던 가스오일은 아시아·유럽 경유 가격의 기준 지표입니다.'})[cat];
  }
  $c('#co-month').innerHTML=`<thead><tr><th>월</th><th>${esc(s.name)} (${esc(s.unit)})</th>${s.cur&&s.cur!=='KRW'?`<th>${esc(s.cur)}/KRW</th><th>원화 (${esc(krwUnit(s))})</th>`:''}</tr></thead><tbody>`+
    M.map((m,i)=>`<tr><td>${m}</td><td class="n">${auto(s.v[i])}</td>${s.cur&&s.cur!=='KRW'?`<td class="n">${auto(fxv(s.cur,i))}</td><td class="n">${auto(values(s,'krw')[i])}</td>`:''}</tr>`).reverse().join('')+'</tbody>';
  $c('#co-upd').textContent=`${M[0]} ~ ${M[M.length-1]} 월별 · ${D.updatedAt||''} 갱신`;
}
function exportXls(){
  if(!D) return;
  const head=['월']; const cols=[];
  IND.forEach(s=>{ head.push(`${s.name} (${s.unit})`); cols.push(s.v); if(s.cur&&s.cur!=='KRW'){ head.push(`${s.name} 원화 (${krwUnit(s)})`); cols.push(values(s,'krw')); } });
  ['USD','JPY','CHF','MYR','VND'].forEach(c=>{ head.push(`${c}/KRW`); cols.push(D.fx[c]||[]); });
  const aoa=[head,...D.months.map((m,i)=>[m,...cols.map(c=>c[i]==null?'':+(+c[i]).toFixed(4))])];
  const src=[['지표','분류','단위','출처','비고'],...IND.map(s=>[s.name,(CATS.find(c=>c[0]===s.cat)||[])[1],s.unit,s.src,s.note||''])];
  const name=`원료외추세_${D.months[0]}_${D.months[D.months.length-1]}.xlsx`;
  if(typeof XLSX!=='undefined'){ const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(aoa),'월별'); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(src),'출처'); XLSX.writeFile(wb,name); }
  else { const csv='﻿'+aoa.map(r=>r.map(v=>/[",\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':v).join(',')).join('\r\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=name.replace('.xlsx','.csv'); a.click(); }
}
render();
fetch('costs.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{ if(j&&j.months){ D=j; IND=build(); render(); } else $c('#co-upd').textContent='데이터를 불러오지 못했습니다.'; }).catch(()=>{ $c('#co-upd').textContent='데이터를 불러오지 못했습니다.'; });
})();
