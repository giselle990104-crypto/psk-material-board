/* 합금시세 — 원소 구성비(GUESS) × 원소 월평균 시세(alloy.json) = 합금 원소 가치 (USD/t, 추정 원/kg)
   · 원소 시세: KOMIS(LME Cash·합금철·희유금속), SHFE 열연(철), Investing 환율
   · 구성비는 규격 공칭값 기준의 추정치(GUESS). 화면에서 바꾸면 이 브라우저에 저장 */
(()=>{
'use strict';
const trend=document.getElementById('trend'); if(!trend||document.getElementById('alloy')) return;

const EL={al:'Al 알루미늄',cu:'Cu 구리',zn:'Zn 아연',sn:'Sn 주석',pb:'Pb 납',ni:'Ni 니켈',mg:'Mg 마그네슘',si:'Si 규소',cr:'Cr 크롬',mo:'Mo 몰리브덴',mn:'Mn 망간',nb:'Nb 니오븀',w:'W 텅스텐',co:'Co 코발트',fe:'Fe 철(탄소강)'};
/* 합금 계열: names = 요청 목록의 이름(같은 조성끼리 묶음), comp = wt% (fe:'bal' 잔부), conf = GUESS 신뢰도 */
const FAM=[
 {id:'a5052', grp:'알루미늄', names:['A5052'], std:'AA/JIS 5052 · Mg 2.2–2.8, Cr 0.15–0.35', comp:{al:'bal',mg:2.5,cr:0.25}, conf:'높음', note:'공칭 범위의 중간값'},
 {id:'a5083', grp:'알루미늄', names:['AL5083'], std:'AA 5083 · Mg 4.0–4.9, Mn 0.4–1.0, Cr 0.05–0.25', comp:{al:'bal',mg:4.45,mn:0.7,cr:0.15}, conf:'높음', note:'공칭 범위의 중간값'},
 {id:'a6061', grp:'알루미늄', names:['AL6061','A6061','AL6061-T651','A6061-T651'], std:'AA 6061 · Mg 0.8–1.2, Si 0.4–0.8, Cu 0.15–0.4, Cr 0.04–0.35', comp:{al:'bal',mg:1.0,si:0.6,cu:0.28,cr:0.2}, conf:'높음', note:'T651은 열처리·응력제거 조건이라 조성은 6061과 같음'},
 {id:'c1020', grp:'구리', names:['C1020P'], std:'JIS C1020 무산소동 · Cu ≥99.96', comp:{cu:99.97}, conf:'높음', note:'P는 판재(Plate) 표기'},
 {id:'brass', grp:'구리', names:['BRASS'], std:'GUESS: 쾌삭황동 C3604 · Cu 57–61, Pb 1.8–3.7, Zn 잔부', comp:{cu:59.5,pb:2.8,zn:'bal'}, conf:'낮음', note:'황동 종류가 없어 가공부품에 흔한 C3604로 가정. 판재 C2600(Cu70·Zn30)·C2801(Cu60·Zn40)이면 바꿔 주세요'},
 {id:'c4250', grp:'구리', names:['C4250'], std:'JIS C4250 주석황동 · Cu 87–90, Sn 1.5–3.0, Zn 잔부', comp:{cu:88.5,sn:2.25,zn:'bal'}, conf:'높음', note:'공칭 범위의 중간값 (P ≤0.35 무시)'},
 {id:'cual', grp:'구리', names:['COPPER ALLOY'], std:'GUESS: 황동 C2600 · Cu 70, Zn 30', comp:{cu:70,zn:'bal'}, conf:'낮음', note:'구리합금 종류가 없어 70/30 황동으로 가정. 인청동(Cu94·Sn6)·베릴륨동 등이면 바꿔 주세요'},
 {id:'ss304', grp:'스테인리스', names:['SS304','SUS304','SUS'], std:'STS/SUS 304 · Cr 18–20, Ni 8–10.5, Mn ≤2, Si ≤1', comp:{cr:18.2,ni:8.1,mn:1.2,si:0.4,fe:'bal'}, conf:'중간', note:'제강사 실제 생산값(하한 근처)으로 가정. "SUS"는 가장 흔한 304로 가정'},
 {id:'ss316', grp:'스테인리스', names:['SS316L','SS316','SUS316'], std:'STS/SUS 316(L) · Cr 16–18, Ni 10–14, Mo 2–3', comp:{cr:16.8,ni:10.1,mo:2.05,mn:1.3,si:0.45,fe:'bal'}, conf:'중간', note:'316과 316L은 탄소량만 달라 원소 가치는 같음. 제강사 실제 생산값 기준'},
 {id:'sus303', grp:'스테인리스', names:['SUS303'], std:'SUS 303 · Cr 17–19, Ni 8–10, S ≥0.15', comp:{cr:17.5,ni:8.3,mn:1.6,si:0.5,fe:'bal'}, conf:'중간', note:'쾌삭용 황(S 0.15–0.35)은 값이 거의 없어 제외'},
 {id:'ss400', grp:'탄소강', names:['SS400'], std:'KS/JIS SS400 일반구조용 압연강재 · C ~0.2, Mn ~0.8', comp:{mn:0.8,fe:'bal'}, conf:'높음', note:'탄소(C)는 제외. 사실상 열연강판 가격 수준'},
 {id:'in625', grp:'니켈합금', names:['INCONEL'], std:'GUESS: Inconel 625 · Ni ≥58, Cr 20–23, Mo 8–10, Nb 3.15–4.15, Fe ≤5', comp:{ni:'bal',cr:21.5,mo:9.0,nb:3.65,fe:4.0}, conf:'낮음', note:'Inconel 종류가 없어 625로 가정. 600(Ni72·Cr15.5·Fe8)·718(Ni52.5·Cr19·Fe18.5·Nb5.1·Mo3)이면 바꿔 주세요'},
 {id:'c276', grp:'니켈합금', names:['HASTELLOY C-276'], std:'Hastelloy C-276 · Mo 15–17, Cr 14.5–16.5, Fe 4–7, W 3–4.5, Co ≤2.5, Ni 잔부', comp:{ni:'bal',mo:16,cr:15.5,fe:5.5,w:3.75,co:1.25,mn:0.5}, conf:'중간', note:'공칭 범위의 중간값'},
];
const LS='psk-alloy-comp-v1';
let custom={}; try{ custom=JSON.parse(localStorage.getItem(LS)||'{}')||{}; }catch(e){}
const saveC=()=>{ try{ localStorage.setItem(LS,JSON.stringify(custom)); }catch(e){} };
let D=null, cur='a6061', curName='AL6061', unit='usd', span=120;

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ok=Number.isFinite;
const f0=v=>ok(v)?Math.round(v).toLocaleString('ko-KR'):'—';
const f2=(v,d=2)=>ok(v)?v.toLocaleString('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const pc=v=>ok(v)?(v>0?'+':'')+(v*100).toFixed(1)+'%':'—';
const fam=id=>FAM.find(f=>f.id===id);
/* 실제 사용할 구성비(직접 바꾼 값 우선) → 잔부 계산 */
function comp(f){
  const c={...f.comp, ...(custom[f.id]||{})}; let sum=0, bal=null;
  Object.entries(c).forEach(([k,v])=>{ if(v==='bal') bal=k; else sum+=Number(v)||0; });
  const out={}; Object.entries(c).forEach(([k,v])=>{ out[k]= v==='bal' ? Math.max(0,100-sum) : Number(v)||0; });
  return {pct:out, bal};
}
/* 월별 합금 가치 USD/t */
function seriesOf(f){
  if(!D) return [];
  const {pct}=comp(f);
  return D.months.map((m,i)=>{ let usd=0, miss=false;
    Object.entries(pct).forEach(([k,p])=>{ const e=D.elements[k]; const v=e?.usd?.[i]; if(!ok(v)) { if(p>0) miss=true; return; } usd+=p/100*v; });
    const fx=D.fx[i]; return {m, usd:miss?NaN:usd, fx, krw: ok(fx)&&!miss? usd*fx/1000 : NaN}; });
}
const at=(s,k)=>{ const i=s.length-1-k; return i>=0?s[i]:null; };

const css=document.createElement('style');
css.textContent=`
#alloy .al-guess{display:flex;gap:10px;align-items:flex-start;border:1px dashed var(--warn);background:var(--warn-soft);border-radius:10px;padding:10px 14px;font-size:13px;line-height:1.6;color:var(--ink-2);margin:0 0 14px}
#alloy .al-guess b.tag{background:var(--warn);color:#fff;border-radius:6px;padding:1px 8px;font-size:12px;white-space:nowrap}
#alloy .al-pick{display:flex;flex-direction:column;gap:8px;margin:0 0 12px}
#alloy .al-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
#alloy .al-row>span{font-size:12px;color:var(--ink-3);width:64px}
#alloy .al-chip{border:1px solid var(--line);background:var(--panel);color:var(--ink-2);border-radius:999px;padding:5px 11px;font:500 12.5px var(--font-body);cursor:pointer}
#alloy .al-chip[aria-pressed="true"]{background:var(--ink);color:var(--panel);border-color:var(--ink)}
#alloy .al-ctl{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:4px 0 10px}
#alloy .al-seg{display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
#alloy .al-seg button{border:0;background:var(--panel);color:var(--ink-2);padding:6px 12px;font:500 12.5px var(--font-body);cursor:pointer}
#alloy .al-seg button[aria-pressed="true"]{background:var(--copper-soft);color:var(--copper);font-weight:600}
#alloy .al-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 10px}
#alloy .al-kpi div{background:var(--sunk);border-radius:10px;padding:10px 12px}
#alloy .al-kpi small{display:block;color:var(--ink-3);font-size:12px}
#alloy .al-kpi b{display:block;font:700 19px var(--font-display);margin:2px 0}
#alloy h3{font-size:15px;margin:18px 0 6px}
#alloy table.al-t{width:100%;border-collapse:collapse;font-size:12.5px}
#alloy .al-t th{text-align:left;color:var(--ink-2);font-weight:600;padding:7px 8px;border-bottom:1px solid var(--line);background:var(--sunk);white-space:nowrap}
#alloy .al-t td{padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}
#alloy .al-t td.n{text-align:right;font-family:var(--font-data);white-space:nowrap}
#alloy .al-t tr.click{cursor:pointer} #alloy .al-t tr.click:hover td{background:var(--sunk)} #alloy .al-t tr.on td{background:var(--copper-soft)}
#alloy .al-t input{width:72px;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;text-align:right}
#alloy .al-t small{color:var(--ink-3)}
#alloy .conf{font-size:11.5px;border-radius:999px;padding:1px 7px;white-space:nowrap}
#alloy .conf.높음{background:var(--good-soft);color:var(--good)} #alloy .conf.중간{background:var(--warn-soft);color:var(--warn)} #alloy .conf.낮음{background:var(--bad-soft);color:var(--bad)}
#alloy .up{color:var(--up)} #alloy .down{color:var(--down)}
#alloy .al-wrap{overflow-x:auto}
#alloy .al-note{font-size:12px;color:var(--ink-3);line-height:1.65}
#alloy details summary{cursor:pointer;font-size:13px;color:var(--copper);margin:12px 0 6px}
@media(max-width:800px){#alloy .al-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
document.head.appendChild(css);

const pane=document.createElement('section');
pane.className='pane'; pane.id='alloy'; pane.hidden=true; pane.setAttribute('role','tabpanel');
pane.dataset.label='합금시세'; pane.dataset.desc='합금을 원소 구성비로 나눠 원소별 시세로 계산한 10년 월별 합금 원소 가치 (USD/t · 추정 원/kg)';
pane.innerHTML=`
<div class="pane-h"><span class="tag">AL</span><h2>합금시세</h2><span class="sub" id="al-upd">불러오는 중…</span></div>
<div class="al-guess"><b class="tag">GUESS Data</b><div>합금 구성비는 규격의 공칭 범위로 정한 <b>추정치</b>입니다. 실제 로트별 성분(Mill Cert)과 다를 수 있고, 종류가 불분명한 이름(BRASS·COPPER ALLOY·INCONEL·SUS)은 흔한 규격으로 가정했습니다. 아래 구성비 표에서 직접 바꿀 수 있어요.
값은 <b>원소 시세 × 구성비로 계산한 원소 가치</b>이며, 제강·압연·가공비와 유통 마진이 빠져 있어 실제 소재 구매가보다 낮습니다. 시점별 변동과 합금 간 비교에 쓰세요.</div></div>
<div class="al-pick" id="al-pick"></div>
<div class="al-ctl">
  <div class="al-seg" id="al-unit"><button data-u="usd" aria-pressed="true">달러 USD/t</button><button data-u="krw" aria-pressed="false">추정 원화 원/kg</button></div>
  <div class="al-seg" id="al-span"><button data-s="12">1년</button><button data-s="36">3년</button><button data-s="60">5년</button><button data-s="120" aria-pressed="true">10년</button></div>
</div>
<div class="al-kpi" id="al-kpi"></div>
<div class="chart" id="al-chart"></div>
<p class="chart-note" id="al-cnote"></p>
<h3>구성비 (GUESS) · 원소별 기여</h3>
<div class="al-wrap"><table class="al-t" id="al-comp"></table></div>
<p class="al-note" id="al-std"></p>
<h3>합금 20종 비교</h3>
<div class="al-wrap"><table class="al-t" id="al-all"></table></div>
<details><summary>월별 데이터 보기 · 엑셀 저장</summary><div style="margin:6px 0"><button class="btn" type="button" id="al-xls">전체 합금 월별 데이터 저장 (.xlsx)</button></div><div class="al-wrap" style="max-height:420px;overflow:auto"><table class="al-t" id="al-month"></table></div></details>
<h3>원소 시세 출처</h3>
<div class="al-wrap"><table class="al-t" id="al-src"></table></div>
<p class="al-note">원화 시세는 각 달 원/달러 월평균 환율로 환산한 추정치(원/kg = USD/t × 환율 ÷ 1000)입니다. 탄소·인·황·티타늄 등 0.5% 미만의 미량 원소는 가치가 작아 제외했습니다. 합금철(페로크롬·페로몰리브덴 등)은 함유율로 나눠 순원소 가격으로 환산했고, 망간은 2020년 9월 이전 시세가 없어 첫 값으로 고정했습니다.</p>`;
trend.after(pane);
const $a=s=>pane.querySelector(s);

/* 선택 칩 */
function renderPick(){
  const groups=[...new Set(FAM.map(f=>f.grp))];
  $a('#al-pick').innerHTML=groups.map(g=>`<div class="al-row"><span>${g}</span>${FAM.filter(f=>f.grp===g).flatMap(f=>f.names.map(n=>`<button class="al-chip" data-f="${f.id}" data-n="${esc(n)}" aria-pressed="${n===curName}">${esc(n)}</button>`)).join('')}</div>`).join('');
}
$a('#al-pick').addEventListener('click',e=>{ const b=e.target.closest('[data-f]'); if(!b) return; cur=b.dataset.f; curName=b.dataset.n; render(); });
$a('#al-unit').addEventListener('click',e=>{ const b=e.target.closest('[data-u]'); if(!b) return; unit=b.dataset.u; render(); });
$a('#al-span').addEventListener('click',e=>{ const b=e.target.closest('[data-s]'); if(!b) return; span=+b.dataset.s; render(); });

function render(){
  renderPick();
  pane.querySelectorAll('#al-unit button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.u===unit));
  pane.querySelectorAll('#al-span button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.s===span));
  if(!D){ return; }
  const f=fam(cur), s=seriesOf(f), last=at(s,0), y1=at(s,12), y5=at(s,60);
  const key=unit==='usd'?'usd':'krw', fmtV=unit==='usd'?v=>'$'+f0(v)+'/t':v=>f0(v)+'원/kg';
  const vis=s.slice(-span).filter(p=>ok(p[key]));
  const hi=vis.reduce((a,p)=>p[key]>a[key]?p:a,vis[0]||{}), lo=vis.reduce((a,p)=>p[key]<a[key]?p:a,vis[0]||{});
  $a('#al-kpi').innerHTML=`
    <div><small>${esc(curName)} · ${esc(last?.m||'')} 월평균</small><b>$${f0(last?.usd)}/t</b><small>추정 ${f0(last?.krw)}원/kg (환율 ${f2(last?.fx,1)})</small></div>
    <div><small>1년 전 대비</small><b class="${(last?.[key]/y1?.[key]-1)>0?'up':'down'}">${pc(last?.[key]/y1?.[key]-1)}</b><small>${esc(y1?.m||'')} ${fmtV(y1?.[key])}</small></div>
    <div><small>5년 전 대비</small><b class="${(last?.[key]/y5?.[key]-1)>0?'up':'down'}">${pc(last?.[key]/y5?.[key]-1)}</b><small>${esc(y5?.m||'')} ${fmtV(y5?.[key])}</small></div>
    <div><small>기간 최고 / 최저</small><b>${fmtV(hi?.[key])}</b><small>${esc(hi?.m||'')} 최고 · ${esc(lo?.m||'')} 최저 ${fmtV(lo?.[key])}</small></div>`;
  const pts=vis.map(p=>({d:p.m+'-15', v:Math.round(key==='usd'?p.usd:p.krw*100)/(key==='usd'?1:100), n:`${curName} ${p.m.replace('-','.')} · $${f0(p.usd)}/t · ${f0(p.krw)}원/kg`}));
  try{ $a('#al-chart').innerHTML = pts.length>1 && typeof lineChart==='function' ? lineChart(pts,{unit:key==='usd'?' $/t':' 원/kg', yFmt:v=>key==='usd'?f0(v):f0(v)}) : `<p class="al-note">${typeof lineChart!=='function'?'데이터를 불러오는 중입니다.':'이 합금에 들어가는 원소 중 시세가 비어 있는 것이 있어 계산하지 못했습니다. 다음 자동 업데이트(하루 1회) 때 다시 채워집니다.'}</p>`; }catch(e){ $a('#al-chart').textContent='차트를 그리지 못했습니다.'; }
  $a('#al-cnote').textContent=`${f.names.join(' · ')} 원소 가치 월평균 (${unit==='usd'?'USD/t':'추정 원/kg, 각 달 환율 적용'}) · ${vis[0]?.m||''} ~ ${last?.m||''}`;
  /* 구성비 표 */
  const {pct,bal}=comp(f); const i=s.length-1;
  const rows=Object.entries(pct).map(([k,p])=>{ const pr=D.elements[k]?.usd?.[i]; const c=ok(pr)?p/100*pr:NaN; return {k,p,pr,c}; });
  const tot=rows.reduce((a,r)=>a+(ok(r.c)?r.c:0),0);
  $a('#al-comp').innerHTML=`<thead><tr><th>원소</th><th>구성비 wt% <span class="conf ${f.conf}">GUESS · 신뢰도 ${f.conf}</span></th><th>원소 시세 ${esc(last?.m||'')} (USD/t)</th><th>기여 USD/t</th><th>기여 원/kg</th><th>가치 비중</th></tr></thead><tbody>
    ${rows.map(r=>`<tr><td>${esc(EL[r.k]||r.k)}</td><td>${r.k===bal?`<b>${f2(r.p,2)}</b> <small>잔부(자동)</small>`:`<input type="number" step="0.01" min="0" max="100" data-k="${r.k}" value="${r.p}">`}</td>
      <td class="n">${f0(r.pr)}</td><td class="n">${f0(r.c)}</td><td class="n">${ok(r.c)&&ok(last?.fx)?f2(r.c*last.fx/1000,1):'—'}</td><td class="n">${tot?(r.c/tot*100).toFixed(1)+'%':'—'}</td></tr>`).join('')}
    <tr><td><b>합계</b></td><td class="n"><b>${f2(Object.values(pct).reduce((a,b)=>a+b,0),2)}%</b></td><td></td><td class="n"><b>${f0(tot)}</b></td><td class="n"><b>${ok(last?.fx)?f2(tot*last.fx/1000,0):'—'}</b></td><td></td></tr></tbody>`;
  $a('#al-std').innerHTML=`<b>${esc(f.names.join(' · '))}</b> — ${esc(f.std)}. ${esc(f.note)}. ${custom[f.id]?`<b style="color:var(--warn)">직접 바꾼 구성비 사용 중</b> <button class="btn" type="button" id="al-reset" style="padding:2px 10px;font-size:12px">기본값으로</button>`:''}`;
  /* 전체 비교 */
  $a('#al-all').innerHTML=`<thead><tr><th>합금</th><th>계열</th><th>GUESS 신뢰도</th><th>USD/t</th><th>추정 원/kg</th><th>1년</th><th>5년</th><th>10년 최저 ~ 최고 (USD/t)</th></tr></thead><tbody>`+
    FAM.flatMap(fm=>{ const ss=seriesOf(fm), L=at(ss,0), A=at(ss,12), B=at(ss,60), v=ss.filter(p=>ok(p.usd)); const mn=Math.min(...v.map(p=>p.usd)), mx=Math.max(...v.map(p=>p.usd));
      return fm.names.map(n=>`<tr class="click ${n===curName?'on':''}" data-f="${fm.id}" data-n="${esc(n)}"><td><b>${esc(n)}</b></td><td>${fm.grp}</td><td><span class="conf ${fm.conf}">${fm.conf}</span></td>
        <td class="n">${f0(L?.usd)}</td><td class="n">${f0(L?.krw)}</td><td class="n ${(L?.usd/A?.usd-1)>0?'up':'down'}">${pc(L?.usd/A?.usd-1)}</td><td class="n ${(L?.usd/B?.usd-1)>0?'up':'down'}">${pc(L?.usd/B?.usd-1)}</td><td class="n">${f0(mn)} ~ ${f0(mx)}</td></tr>`); }).join('')+'</tbody>';
  /* 월별 표 */
  $a('#al-month').innerHTML=`<thead><tr><th>월</th><th>${esc(curName)} USD/t</th><th>원/달러</th><th>추정 원/kg</th></tr></thead><tbody>`+s.slice().reverse().map(p=>`<tr><td>${p.m}</td><td class="n">${f0(p.usd)}</td><td class="n">${f2(p.fx,1)}</td><td class="n">${f2(p.krw,1)}</td></tr>`).join('')+'</tbody>';
  /* 출처 */
  $a('#al-src').innerHTML=`<thead><tr><th>원소</th><th>시세 기준</th><th>자료 시작</th><th>${esc(last?.m||'')} USD/t</th></tr></thead><tbody>`+Object.entries(D.elements).map(([k,e])=>`<tr><td>${esc(EL[k]||k)}</td><td>${esc(e.src)}</td><td>${esc(e.from||'')}</td><td class="n">${f0(e.usd?.[i])}</td></tr>`).join('')+`<tr><td>원/달러</td><td>Investing USD/KRW 월평균</td><td>${esc(D.months[0])}</td><td class="n">${f2(D.fx[i],1)}</td></tr></tbody>`;
  $a('#al-upd').textContent=`${D.months[0]} ~ ${D.months[D.months.length-1]} 월평균 · ${D.updatedAt||''} 갱신`;
}
pane.addEventListener('input',e=>{ const k=e.target.dataset.k; if(!k) return; const v=Number(e.target.value); if(!ok(v)) return; custom[cur]={...(custom[cur]||{}),[k]:v}; saveC(); const pos=e.target.selectionStart; render(); const el=pane.querySelector(`#al-comp input[data-k="${k}"]`); if(el){ el.focus(); try{ el.setSelectionRange(pos,pos); }catch(x){} } });
pane.addEventListener('click',e=>{
  if(e.target.id==='al-reset'){ delete custom[cur]; saveC(); render(); return; }
  const tr=e.target.closest('#al-all tr[data-f]'); if(tr){ cur=tr.dataset.f; curName=tr.dataset.n; render(); $a('#al-kpi').scrollIntoView({behavior:'smooth',block:'center'}); }
  if(e.target.id==='al-xls') exportXls();
});
function exportXls(){
  if(!D) return;
  const head=['월','원/달러'], cols=[];
  FAM.forEach(f=>{ head.push(`${f.names.join('/')} USD/t`, `${f.names.join('/')} 추정 원/kg`); cols.push(seriesOf(f)); });
  const aoa=[head, ...D.months.map((m,i)=>[m, D.fx[i], ...cols.flatMap(s=>[ok(s[i].usd)?Math.round(s[i].usd):'', ok(s[i].krw)?+s[i].krw.toFixed(1):''])])];
  const compSheet=[['합금(이름)','계열','규격·가정','GUESS 신뢰도','구성비 wt% (사용값)','비고'],...FAM.map(f=>{ const {pct}=comp(f); return [f.names.join(', '),f.grp,f.std,f.conf,Object.entries(pct).map(([k,p])=>`${k.toUpperCase()} ${p.toFixed(2)}`).join(' · '),f.note]; })];
  const srcSheet=[['원소','시세 기준','자료 시작'],...Object.entries(D.elements).map(([k,e])=>[EL[k]||k,e.src,e.from])];
  const name=`PSK_합금시세_${D.months[0]}_${D.months[D.months.length-1]}.xlsx`;
  if(typeof XLSX!=='undefined'){ const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(aoa),'월별 합금시세'); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(compSheet),'구성비(GUESS)'); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(srcSheet),'원소 시세 출처'); XLSX.writeFile(wb,name); }
  else { const csv='﻿'+aoa.map(r=>r.map(v=>/[",\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':v).join(',')).join('\r\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=name.replace('.xlsx','.csv'); a.click(); }
}
render();
/* 다른 화면(단가 인상 검토)에서 같은 계산을 쓰도록 공개 */
const ready=fetch('alloy.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{ if(j&&j.months){ D=j; render(); } else $a('#al-upd').textContent='합금 시세 데이터를 불러오지 못했습니다.'; return D; }).catch(()=>{ $a('#al-upd').textContent='합금 시세 데이터를 불러오지 못했습니다.'; return null; });
window.PSK_ALLOY={FAM, comp, seriesOf, data:()=>D, ready};
})();
