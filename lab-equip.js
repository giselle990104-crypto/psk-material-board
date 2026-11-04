/* LAB · 장비별 원가 영향
   장비 BOM(장비코드·자재코드·소요량) + 자재 단가(기존·신규) + 연간 장비 생산계획
   → 장비 1대 원가 상승액, 인상 자재 수, 연간 영향액, 자재별 영향 순위 */
(()=>{
'use strict';
const root=document.getElementById('panes'); if(!root||document.getElementById('lab-equip')) return;
const LS='mib-equip-v1';
let S={bom:[],price:{},plan:{},eff:{},year:new Date().getFullYear(),useReview:true}, sel='', q='';
try{ const x=JSON.parse(localStorage.getItem(LS)||'null'); if(x&&Array.isArray(x.bom)) S={...S,...x}; }catch(e){}
if(!S.eff) S.eff={}; if(!S.year) S.year=new Date().getFullYear();
const save=()=>{ try{ localStorage.setItem(LS,JSON.stringify(S)); }catch(e){} };

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{ if(v===null||v===undefined) return NaN; if(typeof v==='number') return v; const s=String(v).replace(/[,\s원₩]/g,''); return s===''?NaN:Number(s); };
const ok=Number.isFinite;
const f0=v=>ok(v)?Math.round(v).toLocaleString('ko-KR'):'—';
const f1=v=>ok(v)?v.toLocaleString('ko-KR',{maximumFractionDigits:2}):'—';
const pc=v=>ok(v)?(v>0?'+':'')+(v*100).toFixed(1)+'%':'—';
const key=v=>String(v??'').trim().toUpperCase();
const won=v=>{ if(!ok(v)) return '—'; const a=Math.abs(v); return a>=1e8?(v/1e8).toFixed(2)+'억':a>=1e4?(v/1e4).toLocaleString('ko-KR',{maximumFractionDigits:0})+'만':f0(v); };

/* 단가 적용 시점: YYYY.MM (엑셀 날짜·2026-11-01·202611·2026.11 모두 허용) */
function ymOf(v){
  if(v===null||v===undefined||v==='') return '';
  if(v instanceof Date&&!isNaN(v)) return v.getFullYear()+'.'+String(v.getMonth()+1).padStart(2,'0');
  if(typeof v==='number'){ if(v>20000&&v<80000){ const d=new Date(Math.round((v-25569)*864e5)); return d.getUTCFullYear()+'.'+String(d.getUTCMonth()+1).padStart(2,'0'); }
    const y=Math.floor(v), m=Math.round((v-y)*100); if(y>1990&&y<2100&&m>=1&&m<=12) return y+'.'+String(m).padStart(2,'0'); return ''; }
  const t=String(v).trim().match(/^(\d{4})\s*[.\-\/년]?\s*(\d{1,2})/); if(!t) return '';
  const m=+t[2]; return m>=1&&m<=12?t[1]+'.'+String(m).padStart(2,'0'):'';
}
/* 계획 연도 중 신규 단가가 적용되는 비율: 11월 적용 → 2/12 */
function shareOf(ym){ if(!ym) return 1; const [y,m]=ym.split('.').map(Number), Y=+S.year; if(y<Y) return 1; if(y>Y) return 0; return (13-m)/12; }

/* 단가 인상 검토 목록(같은 브라우저)의 품목코드 → 기존/요청 단가 */
function reviewPrices(){ try{ const r=JSON.parse(localStorage.getItem('mib-pr-v2')||'null'); const m={}; (r?.rows||[]).forEach(x=>{ const k=key(x.code); if(k&&ok(num(x.oldPrice))) m[k]={o:num(x.oldPrice), n:ok(num(x.newPrice))?num(x.newPrice):num(x.oldPrice), src:'단가 인상 검토'}; }); return m; }catch(e){ return {}; } }

/* 계산 */
function calc(){
  const rv=S.useReview?reviewPrices():{};
  const lines=S.bom.map((b,bi)=>{
    const k=key(b.mat); let o=num(b.old), n=num(b.new), src='BOM';
    const P=S.price[k];
    if(!ok(o)&&P&&ok(P.o)){ o=P.o; src='단가표'; }
    if(!ok(n)&&P&&ok(P.n)){ n=P.n; if(src==='BOM'&&!ok(num(b.old))) src='단가표'; }
    if(!ok(o)&&rv[k]){ o=rv[k].o; src='단가 인상 검토'; }
    if(!ok(n)&&rv[k]){ n=rv[k].n; }
    if(ok(o)&&!ok(n)) n=o;                     // 신규 단가가 없으면 변동 없음
    const qty=num(b.qty);
    const d=ok(o)&&ok(n)?n-o:NaN;
    const eff=ymOf(b.eff)||S.eff[k]||(P&&P.eff)||'';
    return {...b, bi, k, eq:key(b.eq), qty, o, n, d, src, eff, share:shareOf(eff), up:ok(d)&&d>0, down:ok(d)&&d<0, miss:!ok(o)||!ok(qty)};
  });
  const eqs={};
  lines.forEach(l=>{ const e=eqs[l.eq]||(eqs[l.eq]={eq:l.eq, name:'', lines:[], old:0, now:0, dEff:0, up:0, down:0, miss:0});
    if(l.eqName&&!e.name) e.name=l.eqName; e.lines.push(l);
    if(l.miss){ e.miss++; return; }
    e.old+=l.qty*l.o; e.now+=l.qty*l.n; e.dEff+=l.qty*l.d*l.share; if(l.up) e.up++; if(l.down) e.down++; });
  Object.values(eqs).forEach(e=>{ e.delta=e.now-e.old; e.pct=e.old?e.delta/e.old:NaN; const p=num(S.plan[e.eq]); e.plan=p; e.annualFull=ok(p)?e.delta*p:NaN; e.annual=ok(p)?e.dEff*p:NaN; e.annualOld=ok(p)?e.old*p:NaN; });
  const mats={};
  lines.forEach(l=>{ if(l.miss) return; const m=mats[l.k]||(mats[l.k]={k:l.k, name:'', cat:'', o:l.o, n:l.n, eqs:new Set(), perUnit:0, annual:0, annualFull:0, noPlan:0, eff:l.eff});
    if(l.matName&&!m.name) m.name=l.matName; if(l.cat&&!m.cat) m.cat=l.cat; m.eqs.add(l.eq);
    const e=eqs[l.eq]; const p=e.plan; m.perUnit+=l.qty*l.d; if(ok(p)){ m.annual+=l.qty*l.d*p*l.share; m.annualFull+=l.qty*l.d*p; } else m.noPlan++; });
  return {lines, eqs:Object.values(eqs).sort((a,b)=>(b.annual||b.delta||0)-(a.annual||a.delta||0)), mats:Object.values(mats).filter(m=>m.o!==m.n).sort((a,b)=>Math.abs(b.annualFull)-Math.abs(a.annualFull))};
}

/* 화면 */
const css=document.createElement('style');
css.textContent=`
#lab-equip .eq-intro{color:var(--ink-2);font-size:14px;line-height:1.65;margin:0 0 14px}
#lab-equip .eq-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
#lab-equip .eq-bar .sp{flex:1}
#lab-equip .eq-sum{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:0 0 14px}
#lab-equip .eq-sum div{border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--panel)}
#lab-equip .eq-sum b{display:block;font:700 20px var(--font-display);margin-top:3px}
#lab-equip .eq-sum small{color:var(--ink-3);font-size:12px}
#lab-equip h3{font-size:15px;margin:18px 0 6px}
#lab-equip .eq-wrap{overflow:auto;border:1px solid var(--line);border-radius:10px;max-height:520px}
#lab-equip table.eq-t{width:100%;border-collapse:collapse;font-size:12.5px;min-width:860px}
#lab-equip .eq-t th{position:sticky;top:0;background:var(--sunk);text-align:left;color:var(--ink-2);font-weight:600;padding:8px;border-bottom:1px solid var(--line);white-space:nowrap;z-index:1}
#lab-equip .eq-t td{padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}
#lab-equip .eq-t td.n{text-align:right;font-family:var(--font-data);white-space:nowrap}
#lab-equip .eq-t tr.click{cursor:pointer} #lab-equip .eq-t tr.click:hover td{background:var(--sunk)} #lab-equip .eq-t tr.on td{background:var(--copper-soft)}
#lab-equip .eq-t tr.sub td{background:var(--sunk);font-weight:600}
#lab-equip .eq-t small{color:var(--ink-3);display:block}
#lab-equip .eq-t input{width:80px;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;text-align:right}
#lab-equip .eq-t input.ym{width:76px;text-align:center}
#lab-equip .eq-bar input.yr{width:70px;padding:5px 6px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);font:inherit;text-align:center}
#lab-equip .up{color:var(--up)} #lab-equip .down{color:var(--down)}
#lab-equip .tag{display:inline-block;font-size:11px;border-radius:999px;padding:1px 7px;background:var(--sunk);color:var(--ink-3)}
#lab-equip .tag.up{background:var(--up-soft);color:var(--up)} #lab-equip .tag.miss{background:var(--warn-soft);color:var(--warn)}
#lab-equip .eq-note{font-size:12px;color:var(--ink-3);line-height:1.65}
#lab-equip .eq-filter{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 8px;align-items:center}
#lab-equip .eq-filter input[type=search]{padding:7px 9px;border:1px solid var(--line);border-radius:7px;background:var(--panel);color:var(--ink);font:inherit;font-size:13px;min-width:220px}
#lab-equip .eq-add{border:1px solid var(--line);border-radius:10px;background:var(--panel);padding:12px;margin:0 0 14px}
#lab-equip .eq-add summary{cursor:pointer;font-weight:600;font-size:14px}
#lab-equip .eq-add .g{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:10px}
#lab-equip .eq-add label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--ink-3)}
#lab-equip .eq-add input{padding:7px 8px;border:1px solid var(--line);border-radius:7px;background:var(--panel);color:var(--ink);font:inherit;font-size:13px;min-width:0}
#lab-equip .eq-add .act{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap}
#lab-equip .eq-t input.nw{width:90px}
#lab-equip .eq-t .x{border:0;background:none;color:var(--ink-3);cursor:pointer;font-size:14px;padding:0 4px}
#lab-equip .eq-t .x:hover{color:var(--up)}
@media(max-width:900px){#lab-equip .eq-add .g{grid-template-columns:repeat(2,minmax(0,1fr))}}
#lab-equip .eq-empty{padding:26px;text-align:center;color:var(--ink-3)}
@media(max-width:900px){#lab-equip .eq-sum{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
document.head.appendChild(css);
const pane=document.createElement('section');
pane.id='lab-equip'; pane.className='pane lab-pane'; pane.hidden=true; pane.setAttribute('role','tabpanel');
pane.dataset.label='장비별 원가 영향'; pane.dataset.desc='장비 BOM과 자재 단가를 연결해 단가 인상이 장비 1대 원가와 연간 생산계획에 주는 영향을 계산';
pane.innerHTML=`
<p class="eq-intro">장비별 <b>BOM</b>(장비코드·자재코드·소요량)과 자재의 <b>기존·신규 단가</b>, <b>연간 장비 생산계획</b>, 그리고 자재별 <b>단가 적용 시점</b>을 넣으면 장비 1대 원가가 얼마나 오르는지, 생산계획 기준으로 1년에 얼마가 영향을 받는지 계산합니다.
엑셀 양식의 BOM·단가·생산계획 시트를 채워 한 번에 올리세요. BOM에 단가가 없으면 단가 시트에서, 그래도 없으면 <b>단가 인상 검토</b> 목록의 같은 품목코드에서 가져옵니다.</p>
<div class="eq-bar">
  <button class="btn" type="button" data-a="tpl">엑셀 양식 받기</button>
  <label class="btn" style="cursor:pointer">엑셀 올리기<input type="file" accept=".xlsx,.xls,.csv" hidden data-a="up"></label>
  <button class="btn primary" type="button" data-a="out">결과 엑셀 저장</button>
  <label class="eq-note" style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-a="rv"> 단가 인상 검토 목록의 단가 연결</label>
  <label class="eq-note" style="display:flex;gap:6px;align-items:center">계획 연도 <input class="yr" type="number" min="2000" max="2100" data-a="yr"></label>
  <span class="sp"></span>
  <button class="btn" type="button" data-a="clear">전체 삭제</button>
</div>
<details class="eq-add" id="eq-add"><summary>직접 입력 (엑셀 없이 한 줄씩 추가)</summary>
<p class="eq-note" style="margin:8px 0 0">장비 1대에 들어가는 자재를 한 줄씩 넣으세요. 같은 장비코드·자재코드를 다시 넣으면 그 줄이 고쳐집니다. 적용 시점을 비우면 연간 전체 적용.</p>
<div class="g">
<label>장비코드 *<input name="eq" list="eq-eqs" placeholder="A100" autocomplete="off"></label>
<label>장비명<input name="eqName" placeholder="SUPRA A"></label>
<label>자재코드 *<input name="mat" placeholder="QZ-01" autocomplete="off"></label>
<label>자재명<input name="matName" placeholder="석영 링"></label>
<label>분류<input name="cat" placeholder="석영"></label>
<label>소요량(대당) *<input name="qty" inputmode="decimal" placeholder="1"></label>
<label>기존 단가 *<input name="old" inputmode="decimal" placeholder="820000"></label>
<label>신규 단가<input name="new" inputmode="decimal" placeholder="910000"></label>
<label>단가 적용 시점<input name="eff" inputmode="decimal" placeholder="YYYY.MM"></label>
<label>연간 생산계획(대)<input name="plan" inputmode="decimal" placeholder="24"></label>
</div>
<div class="act"><button class="btn primary" type="button" data-a="add">추가</button><button class="btn" type="button" data-a="addclr">입력칸 비우기</button><span class="eq-note" id="eq-addmsg"></span></div>
<datalist id="eq-eqs"></datalist></details>
<p class="eq-note" id="eq-msg"></p>
<div class="eq-sum" id="eq-sum"></div>
<h3>장비별 원가 영향</h3>
<div class="eq-filter"><input type="search" id="eq-q" placeholder="장비코드·장비명 검색" aria-label="장비 검색"><span class="eq-note">생산계획(대/년) 칸은 바로 고칠 수 있어요. 행을 누르면 BOM 상세가 열립니다.</span></div>
<div class="eq-wrap"><table class="eq-t"><thead><tr><th>장비</th><th>BOM 자재</th><th>인상 자재</th><th>기존 원가/대</th><th>신규 원가/대</th><th>상승액/대</th><th>상승률</th><th>생산계획(대/년)</th><th>연간 영향액<small>적용 시점 반영</small></th></tr></thead><tbody id="eq-body"></tbody></table></div>
<div id="eq-det"></div>
<h3>영향이 큰 자재 순위 (전 장비 합계)</h3>
<p class="eq-note" style="margin:0 0 6px"><b>적용 시점</b> 칸에 신규 단가가 적용되는 달(YYYY.MM)을 넣으면 그달부터 계획 연도 말까지만 영향액에 반영합니다. 예) 2026.11 → 11·12월 2개월분(2/12). 비워 두면 연간 전체 적용.</p>
<div class="eq-wrap" style="max-height:420px"><table class="eq-t"><thead><tr><th>#</th><th>자재</th><th>분류</th><th>사용 장비</th><th>기존 단가</th><th>신규 단가</th><th>인상률</th><th>장비 1대씩 합계 상승</th><th>적용 시점</th><th>연간 전체 적용 시</th><th>연간 영향액<small>적용 시점 반영</small></th><th>비중</th></tr></thead><tbody id="eq-mat"></tbody></table></div>
<p class="eq-note" style="margin-top:10px">계산: 장비 1대 원가 = Σ(자재 소요량 × 단가). 상승액/대 = 신규 원가 − 기존 원가, 연간 영향액 = Σ(자재 상승액/대 × 연간 생산계획 × 적용 개월 수/12). 적용 시점이 계획 연도 이전이면 12개월, 이후면 0개월. 신규 단가가 비어 있는 자재는 변동 없음으로 봅니다. 데이터는 이 브라우저에 저장되며, 공유하려면 결과 엑셀을 저장하세요.</p>`;
root.appendChild(pane);
const $e=s=>pane.querySelector(s);
pane.querySelector('[data-a="rv"]').checked=!!S.useReview; pane.querySelector('[data-a="yr"]').value=S.year;

function render(){
  const R=calc();
  const totalAnnual=R.eqs.reduce((a,e)=>a+(ok(e.annual)?e.annual:0),0), totalFull=R.eqs.reduce((a,e)=>a+(ok(e.annualFull)?e.annualFull:0),0), totalAnnualOld=R.eqs.reduce((a,e)=>a+(ok(e.annualOld)?e.annualOld:0),0);
  const upMats=new Set(R.lines.filter(l=>l.up).map(l=>l.k)).size, allMats=new Set(R.lines.map(l=>l.k)).size;
  const noPlan=R.eqs.filter(e=>!ok(e.plan)).length, miss=R.lines.filter(l=>l.miss).length;
  $e('#eq-sum').innerHTML=`
    <div><small>장비</small><b>${R.eqs.length}</b><small>생산계획 미입력 ${noPlan}대 기종</small></div>
    <div><small>자재 (인상 / 전체)</small><b>${upMats} / ${allMats}</b><small>BOM ${R.lines.length}줄${miss?` · 단가·소요량 없음 ${miss}줄`:''}</small></div>
    <div><small>장비당 평균 상승액</small><b class="up">${won(R.eqs.length?R.eqs.reduce((a,e)=>a+e.delta,0)/R.eqs.length:NaN)}원</b><small>대당 원가 기준</small></div>
    <div><small>${S.year}년 총 영향액 (적용 시점 반영)</small><b class="up">${won(totalAnnual)}원</b><small>${Math.round(totalFull)!==Math.round(totalAnnual)?`연간 전체 적용 시 ${won(totalFull)}원`:'생산계획 기준'}</small></div>
    <div><small>연간 원가 상승률</small><b>${pc(totalAnnualOld?totalAnnual/totalAnnualOld:NaN)}</b><small>BOM 자재비 ${won(totalAnnualOld)}원 기준</small></div>`;
  const list=R.eqs.filter(e=>!q||(e.eq+' '+e.name).toLowerCase().includes(q));
  $e('#eq-body').innerHTML=list.length?list.map(e=>`<tr class="click ${e.eq===sel?'on':''}" data-e="${esc(e.eq)}">
    <td><b>${esc(e.eq)}</b><small>${esc(e.name)}</small></td><td class="n">${e.lines.length}</td>
    <td class="n">${e.up?`<span class="tag up">${e.up}종 인상</span>`:'0'}${e.down?` <span class="tag">${e.down}종 인하</span>`:''}${e.miss?` <span class="tag miss">${e.miss} 확인</span>`:''}</td>
    <td class="n">${f0(e.old)}</td><td class="n">${f0(e.now)}</td><td class="n ${e.delta>0?'up':e.delta<0?'down':''}"><b>${f0(e.delta)}</b></td><td class="n">${pc(e.pct)}</td>
    <td class="n"><input type="number" min="0" step="1" data-plan="${esc(e.eq)}" value="${ok(e.plan)?e.plan:''}" placeholder="입력"></td>
    <td class="n ${e.annual>0?'up':''}"><b>${ok(e.annual)?won(e.annual)+'원':'—'}</b>${ok(e.annual)&&Math.round(e.annual)!==Math.round(e.annualFull)?`<small>전체 적용 시 ${won(e.annualFull)}원</small>`:''}</td></tr>`).join('')
    :`<tr><td colspan="9" class="eq-empty">${S.bom.length?'검색 결과가 없습니다.':'아직 BOM이 없습니다. 위 "직접 입력"으로 한 줄씩 넣거나, "엑셀 양식 받기"로 양식을 받아 BOM·단가·생산계획 시트를 채운 뒤 "엑셀 올리기"를 누르세요.'}</td></tr>`;
  const tot=R.mats.reduce((a,m)=>a+Math.abs(m.annual),0);
  const effTxt=ym=>{ const s=shareOf(ym); return ym?`${Math.round(s*12)}개월 반영`:'연간 전체'; };
  $e('#eq-mat').innerHTML=R.mats.length?R.mats.slice(0,50).map((m,i)=>`<tr><td class="n">${i+1}</td><td><b>${esc(m.k)}</b><small>${esc(m.name)}</small></td><td>${esc(m.cat)}</td><td class="n">${m.eqs.size}</td>
    <td class="n">${f1(m.o)}</td><td class="n">${f1(m.n)}</td><td class="n ${m.n>m.o?'up':'down'}">${pc(m.n/m.o-1)}</td><td class="n">${f0(m.perUnit)}</td><td class="n"><input class="ym" type="text" inputmode="decimal" placeholder="YYYY.MM" data-eff="${esc(m.k)}" value="${esc(S.eff[m.k]||m.eff||'')}"><small>${effTxt(S.eff[m.k]||m.eff)}</small></td><td class="n">${won(m.annualFull)}원</td><td class="n"><b>${won(m.annual)}원</b>${m.noPlan?`<small>계획 없는 장비 ${m.noPlan}</small>`:''}</td><td class="n">${tot?(Math.abs(m.annual)/tot*100).toFixed(1)+'%':'—'}</td></tr>`).join('')
    :`<tr><td colspan="12" class="eq-empty">단가가 바뀐 자재가 없습니다.</td></tr>`;
  const dl=$e('#eq-eqs'); if(dl) dl.innerHTML=R.eqs.map(e=>`<option value="${esc(e.eq)}">${esc(e.name)}</option>`).join('');
  renderDet(R);
}
function renderDet(R){
  const box=$e('#eq-det'); const e=R.eqs.find(x=>x.eq===sel); if(!e){ box.innerHTML=''; return; }
  const cats={}; e.lines.forEach(l=>{ const c=l.cat||'(분류 없음)'; (cats[c]=cats[c]||[]).push(l); });
  const rows=Object.entries(cats).sort((a,b)=>b[1].reduce((s,l)=>s+(ok(l.d)?l.qty*l.d:0),0)-a[1].reduce((s,l)=>s+(ok(l.d)?l.qty*l.d:0),0)).map(([c,ls])=>{
    const up=ls.filter(l=>l.up).length, o=ls.reduce((s,l)=>s+(l.miss?0:l.qty*l.o),0), n=ls.reduce((s,l)=>s+(l.miss?0:l.qty*l.n),0);
    return `<tr class="sub"><td>${esc(c)}</td><td class="n">${ls.length}종 중 ${up}종 인상</td><td></td><td></td><td></td><td class="n">${f0(o)}</td><td class="n">${f0(n)}</td><td class="n ${n>o?'up':''}">${f0(n-o)}</td><td></td><td class="n">${ok(e.plan)?won(ls.reduce((s,l)=>s+(l.miss?0:l.qty*l.d*l.share),0)*e.plan)+'원':'—'}</td><td></td></tr>`+
      ls.sort((a,b)=>(b.qty*(b.d||0))-(a.qty*(a.d||0))).map(l=>`<tr><td><b>${esc(l.k)}</b><small>${esc(l.matName||'')}</small></td><td class="n">${f1(l.qty)} ${esc(l.unit||'')}</td><td class="n">${f1(l.o)}</td><td class="n"><input class="nw" inputmode="decimal" data-lnew="${l.bi}" value="${ok(l.n)&&l.n!==l.o?l.n:''}" placeholder="${ok(l.o)?f1(l.o):'입력'}"></td>
        <td class="n ${l.up?'up':l.down?'down':''}">${l.miss?'<span class="tag miss">단가·소요량 없음</span>':pc(l.n/l.o-1)}<small>${esc(l.src)}</small></td><td class="n">${f0(l.qty*l.o)}</td><td class="n">${f0(l.qty*l.n)}</td><td class="n ${l.up?'up':''}">${l.miss?'—':f0(l.qty*l.d)}</td><td class="n"><input class="ym" type="text" inputmode="decimal" placeholder="연간 전체" data-leff="${l.bi}" value="${esc(l.eff)}"></td><td class="n">${!l.miss&&ok(e.plan)?won(l.qty*l.d*e.plan*l.share)+'원':'—'}</td><td><button class="x" type="button" data-del="${l.bi}" title="이 줄 삭제" aria-label="이 줄 삭제">✕</button></td></tr>`).join('');
  }).join('');
  box.innerHTML=`<h3>${esc(e.eq)} ${esc(e.name)} · BOM 상세 <button class="btn" type="button" data-a="close" style="padding:2px 10px;font-size:12px;margin-left:6px">닫기</button></h3>
  <p class="eq-note">신규 단가·적용 시점 칸은 바로 고칠 수 있어요(Enter 또는 칸 밖 클릭).</p><p class="eq-note">BOM ${e.lines.length}종 중 <b class="up">${e.up}종 인상</b> → 장비 1대 <b>${f0(e.old)}원 → ${f0(e.now)}원 (${f0(e.delta)}원, ${pc(e.pct)})</b>${ok(e.plan)?` · 연 ${f0(e.plan)}대 생산 시 <b class="up">${won(e.annual)}원</b>${Math.round(e.annual)!==Math.round(e.annualFull)?` (적용 시점 반영, 연간 전체 적용 시 ${won(e.annualFull)}원)`:''}`:' · 생산계획을 넣으면 연간 영향액이 계산됩니다'}</p>
  <div class="eq-wrap"><table class="eq-t"><thead><tr><th>분류 / 자재</th><th>소요량</th><th>기존 단가</th><th>신규 단가</th><th>인상률·단가 출처</th><th>기존 금액/대</th><th>신규 금액/대</th><th>상승액/대</th><th>적용 시점</th><th>연간 영향</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
pane.addEventListener('click',e=>{
  if(e.target.closest('input')) return;
  const tr=e.target.closest('#eq-body tr[data-e]'); if(tr){ sel=tr.dataset.e===sel?'':tr.dataset.e; render(); if(sel) $e('#eq-det').scrollIntoView({behavior:'smooth',block:'start'}); return; }
  const a=e.target.dataset.a;
  if(e.target.dataset.del!==undefined){ const i=+e.target.dataset.del, b=S.bom[i]; if(b&&window.confirm(`${b.eq} · ${b.mat} 줄을 삭제할까요?`)){ S.bom.splice(i,1); save(); render(); } return; }
  if(a==='add') addManual();
  if(a==='addclr') pane.querySelectorAll('#eq-add input').forEach(i=>i.value='');
  if(a==='close'){ sel=''; render(); }
  if(a==='tpl') template();
  if(a==='out') exportOut();
  if(a==='clear'&&S.bom.length&&window.confirm('BOM·단가·생산계획을 모두 지울까요? 되돌릴 수 없습니다.')){ S={bom:[],price:{},plan:{},eff:{},year:S.year,useReview:S.useReview}; sel=''; save(); render(); }
});
pane.addEventListener('change',e=>{
  if(e.target.dataset.plan!==undefined){ const v=num(e.target.value); if(ok(v)) S.plan[e.target.dataset.plan]=v; else delete S.plan[e.target.dataset.plan]; save(); render(); }
  if(e.target.dataset.leff!==undefined){ const b=S.bom[+e.target.dataset.leff], v=e.target.value.trim(), ym=ymOf(v); if(!b) return;
    if(v&&!ym){ $e('#eq-msg').textContent='적용 시점은 YYYY.MM 형식으로 넣어 주세요. 예) 2026.11'; render(); return; }
    b.eff=ym; if(!ym){ delete S.eff[key(b.mat)]; if(S.price[key(b.mat)]) delete S.price[key(b.mat)].eff; } save(); render(); return; }
  if(e.target.dataset.lnew!==undefined){ const b=S.bom[+e.target.dataset.lnew], v=num(e.target.value); if(!b) return;
    if(ok(v)) b.new=v; else { b.new=''; const P=S.price[key(b.mat)]; if(P&&e.target.value.trim()==='') P.n=P.o; } save(); render(); return; }
  if(e.target.dataset.eff!==undefined){ const k=e.target.dataset.eff, v=e.target.value.trim(), ym=ymOf(v);
    if(v&&!ym){ $e('#eq-msg').textContent='적용 시점은 YYYY.MM 형식으로 넣어 주세요. 예) 2026.11'; e.target.value=S.eff[k]||''; return; }
    if(ym) S.eff[k]=ym; else { delete S.eff[k]; if(S.price[k]) delete S.price[k].eff; } S.bom.forEach(b=>{ if(key(b.mat)===k) b.eff=''; }); save(); render(); }
  if(e.target.dataset.a==='yr'){ const y=num(e.target.value); if(ok(y)&&y>1990&&y<2100){ S.year=y; save(); } e.target.value=S.year; render(); }
  if(e.target.dataset.a==='rv'){ S.useReview=e.target.checked; save(); render(); }
  if(e.target.dataset.a==='up'){ const f=e.target.files?.[0]; if(f) upload(f); e.target.value=''; }
});
$e('#eq-q').addEventListener('input',e=>{ q=e.target.value.trim().toLowerCase(); render(); });

/* 직접 입력 */
function addManual(){
  const F={}; pane.querySelectorAll('#eq-add input').forEach(i=>F[i.name]=i.value.trim());
  const m=$e('#eq-addmsg'), eq=key(F.eq), mat=key(F.mat), qty=num(F.qty), o=num(F.old), n=num(F.new), ym=ymOf(F.eff), plan=num(F.plan);
  if(!eq||!mat) return m.textContent='장비코드와 자재코드를 넣어 주세요.';
  if(!ok(qty)||qty<=0) return m.textContent='소요량을 숫자로 넣어 주세요.';
  if(!ok(o)) return m.textContent='기존 단가를 숫자로 넣어 주세요.';
  if(F.new&&!ok(n)) return m.textContent='신규 단가는 숫자로 넣어 주세요.';
  if(F.eff&&!ym) return m.textContent='적용 시점은 YYYY.MM 형식으로 넣어 주세요. 예) 2026.11';
  const prev=S.bom.find(b=>b.eq===eq&&key(b.mat)===mat), eqName=F.eqName||(S.bom.find(b=>b.eq===eq)?.eqName)||'';
  const row={eq, eqName, mat, matName:F.matName||prev?.matName||'', cat:F.cat||prev?.cat||'', qty, unit:prev?.unit||'EA', old:o, new:ok(n)?n:'', eff:ym};
  if(prev) Object.assign(prev,row); else S.bom.push(row);
  if(F.eqName) S.bom.forEach(b=>{ if(b.eq===eq) b.eqName=F.eqName; });
  if(ok(plan)) S.plan[eq]=plan;
  save(); render();
  m.textContent=`${prev?'고침':'추가'}: ${eq} · ${mat}${ok(n)&&n!==o?` (${f0(o)} → ${f0(n)}원${ym?`, ${ym} 적용`:''})`:''}`;
  ['mat','matName','cat','qty','old','new','eff'].forEach(k=>{ const i=pane.querySelector(`#eq-add input[name="${k}"]`); if(i) i.value=''; });
  pane.querySelector('#eq-add input[name="mat"]').focus();
}
pane.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.closest('#eq-add')){ e.preventDefault(); addManual(); } });

/* 엑셀 */
const N=h=>String(h??'').replace(/[\s()\/·_\-:.]/g,'').toLowerCase();
const HB={장비코드:'eq',장비:'eq',설비코드:'eq',모델:'eq',장비명:'eqName',설비명:'eqName',자재코드:'mat',품목코드:'mat',품번:'mat',partno:'mat',자재명:'matName',품목명:'matName',품명:'matName',분류:'cat',자재분류:'cat',구분:'cat',
  소요량:'qty',수량:'qty',usage:'qty',단위:'unit',기존단가:'old',기존단가원:'old',현재단가:'old',신규단가:'new',신규단가원:'new',요청단가:'new',인상단가:'new',연간생산계획:'plan',생산계획:'plan',연간생산대수:'plan',생산대수:'plan',연간계획:'plan',적용시점:'eff',적용일:'eff',적용월:'eff',단가적용일:'eff',단가적용시점:'eff',적용시작:'eff',적용시작월:'eff'};
const hk=h=>HB[N(h)]||null;
function sheetRows(wb,name){ const ws=wb.Sheets[name]; const aoa=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true}); const hi=aoa.findIndex(r=>r.filter(c=>hk(c)).length>=2); if(hi<0) return []; const h=aoa[hi].map(hk); return aoa.slice(hi+1).filter(r=>r.some(x=>x!==''&&x!=null)).map(r=>{ const o={}; h.forEach((k,i)=>{ if(k&&r[i]!==''&&r[i]!=null) o[k]=r[i]; }); return o; }); }
async function upload(file){
  const msg=$e('#eq-msg'); msg.textContent='읽는 중…';
  try{
    if(typeof XLSX==='undefined') throw Error('엑셀 라이브러리를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    const wb=XLSX.read(await file.arrayBuffer(),{cellDates:true});
    let bom=[], price={}, plan={}, effUp={};
    wb.SheetNames.forEach(n=>{ const rows=sheetRows(wb,n); if(!rows.length) return;
      const keys=new Set(rows.flatMap(r=>Object.keys(r)));
      if(keys.has('eq')&&keys.has('mat')) rows.forEach(r=>{ if(!r.eq||!r.mat) return; if(String(r.mat).startsWith('(예시)')) return; bom.push({eq:key(r.eq), eqName:r.eqName||'', mat:key(r.mat), matName:r.matName||'', cat:r.cat||'', qty:num(r.qty), unit:r.unit||'', old:ok(num(r.old))?num(r.old):'', new:ok(num(r.new))?num(r.new):'', eff:ymOf(r.eff)}); if(r.plan!==undefined&&ok(num(r.plan))) plan[key(r.eq)]=num(r.plan); });
      else if(keys.has('mat')&&(keys.has('old')||keys.has('new'))) rows.forEach(r=>{ if(!r.mat) return; price[key(r.mat)]={o:num(r.old), n:ok(num(r.new))?num(r.new):num(r.old), name:r.matName||''}; const ym=ymOf(r.eff); if(ym) effUp[key(r.mat)]=ym; });
      else if(keys.has('eq')&&keys.has('plan')) rows.forEach(r=>{ if(r.eq&&ok(num(r.plan))) plan[key(r.eq)]=num(r.plan); }); });
    const exN=bom.filter(b=>/^EX-/.test(b.eq)).length;
    bom=bom.filter(b=>!/^EX-/.test(b.eq));
    Object.keys(plan).forEach(k=>{ if(/^EX-/.test(k)) delete plan[k]; }); Object.keys(price).forEach(k=>{ if(String(price[k].name).startsWith('(예시)')) delete price[k]; });
    if(!bom.length&&!Object.keys(price).length&&!Object.keys(plan).length&&exN) throw Error('예시 줄(EX-)만 있어 올릴 내용이 없습니다. 예시를 지우고 실제 BOM을 채워 주세요.');
    if(!bom.length&&!Object.keys(price).length&&!Object.keys(plan).length) throw Error('BOM(장비코드·자재코드·소요량) 머리글을 찾지 못했습니다. 양식을 받아서 써주세요.');
    if(bom.length){ const eqsNew=new Set(bom.map(b=>b.eq)); S.bom=S.bom.filter(b=>!eqsNew.has(b.eq)).concat(bom); }  // 같은 장비는 새 BOM으로 교체
    Object.assign(S.price,price); Object.assign(S.plan,plan); Object.keys(effUp).forEach(k=>{ if(!/^\(예시\)/.test(price[k]?.name||'')) S.eff[k]=effUp[k]; }); save(); render();
    msg.textContent=`올리기 완료 · BOM ${bom.length}줄(${new Set(bom.map(b=>b.eq)).size}개 장비) · 단가 ${Object.keys(price).length}개 · 생산계획 ${Object.keys(plan).length}개 장비${Object.keys(effUp).length?` · 적용 시점 ${Object.keys(effUp).length}개 자재`:''}. 같은 장비코드의 BOM은 새 파일로 바뀝니다.`;
  }catch(err){ msg.textContent='올리기 실패: '+err.message; }
}
function template(){
  if(typeof XLSX==='undefined'){ $e('#eq-msg').textContent='엑셀 라이브러리를 불러오지 못했습니다.'; return; }
  const bom=[['장비코드','장비명','자재코드','자재명','분류','소요량','단위','기존 단가','신규 단가'],
    ['EX-A100','(예시) A 장비','PIPE-001','(예시) SUS316L EP 튜브 1/4"','배관',12,'EA',18500,19800],
    ['EX-A100','(예시) A 장비','VLV-210','(예시) 다이어프램 밸브','배관',8,'EA',152000,''],
    ['EX-A100','(예시) A 장비','QZ-RING-03','(예시) 석영 링','석영',1,'EA','','']];
  const price=[['자재코드','자재명','기존 단가','신규 단가','적용 시점'],['QZ-RING-03','(예시) 석영 링',820000,910000,'2026.11']];
  const plan=[['장비코드','연간 생산계획'],['EX-A100',24]];
  const how=[['작성 방법'],['· BOM 시트: 한 줄에 장비 1대에 들어가는 자재 1종. 필수 장비코드·자재코드·소요량'],['· 단가는 BOM 시트의 기존/신규 단가에 넣거나, 자재별로 "단가" 시트에 한 번만 넣어도 됩니다(BOM 칸이 우선)'],['· 신규 단가를 비우면 변동 없음으로 봅니다'],['· 적용 시점(YYYY.MM): 신규 단가가 적용되는 달. 그달부터 연말까지만 영향액에 반영(예: 2026.11 → 2/12). 비우면 연간 전체 적용. BOM 시트에 "적용 시점" 열을 추가해 줄별로 넣어도 됩니다'],['· 단가가 둘 다 없으면 "단가 인상 검토" 목록의 같은 품목코드 단가를 씁니다(체크 시)'],['· 생산계획 시트: 장비코드별 연간 생산 대수'],['· EX-로 시작하는 예시 줄은 올릴 때 무시됩니다']];
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(bom),'BOM'); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(price),'단가'); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(plan),'생산계획'); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(how),'작성방법');
  XLSX.writeFile(wb,'장비별원가영향_양식.xlsx');
}
function exportOut(){
  if(typeof XLSX==='undefined'){ $e('#eq-msg').textContent='엑셀 라이브러리를 불러오지 못했습니다.'; return; }
  const R=calc(); if(!R.lines.length){ $e('#eq-msg').textContent='저장할 BOM이 없습니다.'; return; }
  const s1=[['장비코드','장비명','BOM 자재 수','인상 자재 수','인하 자재 수','단가 확인 필요','기존 원가/대','신규 원가/대','상승액/대','상승률(%)','연간 생산계획','연간 전체 적용 시','연간 영향액(적용 시점 반영)']].concat(R.eqs.map(e=>[e.eq,e.name,e.lines.length,e.up,e.down,e.miss,Math.round(e.old),Math.round(e.now),Math.round(e.delta),ok(e.pct)?+(e.pct*100).toFixed(2):'',ok(e.plan)?e.plan:'',ok(e.annualFull)?Math.round(e.annualFull):'',ok(e.annual)?Math.round(e.annual):'']));
  const s2=[['장비코드','분류','자재코드','자재명','소요량','단위','기존 단가','신규 단가','인상률(%)','단가 출처','기존 금액/대','신규 금액/대','상승액/대','적용 시점','적용 개월','연간 영향액']].concat(R.lines.map(l=>{ const p=R.eqs.find(e=>e.eq===l.eq)?.plan; return [l.eq,l.cat,l.k,l.matName,ok(l.qty)?l.qty:'',l.unit,ok(l.o)?l.o:'',ok(l.n)?l.n:'',ok(l.o)&&ok(l.n)?+((l.n/l.o-1)*100).toFixed(2):'',l.miss?'단가·소요량 없음':l.src,l.miss?'':Math.round(l.qty*l.o),l.miss?'':Math.round(l.qty*l.n),l.miss?'':Math.round(l.qty*l.d),l.eff||'연간 전체',Math.round(l.share*12),!l.miss&&ok(p)?Math.round(l.qty*l.d*p*l.share):'']; }));
  const s3=[['순위','자재코드','자재명','분류','사용 장비 수','기존 단가','신규 단가','인상률(%)','장비 1대씩 합계 상승','적용 시점','연간 전체 적용 시','연간 영향액(적용 시점 반영)']].concat(R.mats.map((m,i)=>[i+1,m.k,m.name,m.cat,m.eqs.size,m.o,m.n,+((m.n/m.o-1)*100).toFixed(2),Math.round(m.perUnit),S.eff[m.k]||m.eff||'연간 전체',Math.round(m.annualFull),Math.round(m.annual)]));
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s1),'장비별 요약'); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s2),'BOM 상세'); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s3),'자재 영향 순위');
  const d=new Date(); XLSX.writeFile(wb,`장비별원가영향_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.xlsx`);
}
/* 다른 탭에서 단가 인상 검토 목록이 바뀌면 다시 계산 */
window.addEventListener('storage',e=>{ if(e.key==='mib-pr-v2'&&S.useReview) render(); });
document.addEventListener('click',e=>{ if(e.target.closest?.('#side button[data-id="lab-equip"]')) setTimeout(render,0); });
render();
})();
