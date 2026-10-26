(()=>{
'use strict';
const root=document.getElementById('panes');if(!root||document.getElementById('lab-cost'))return;
const meta={cu:['구리','USD/lb'],ni:['니켈','USD/t'],al:['알루미늄','USD/t'],st:['철강','USD/t'],pl:['브렌트유 (플라스틱 참고)','USD/bbl']};
const choices=Object.entries(meta).map(([k,v])=>'<option value="'+k+'">'+v[0]+'</option>').join('');
const style=document.createElement('style');
style.textContent='.lab-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.lab-card{border:1px solid var(--line);background:var(--panel);padding:18px;border-radius:12px}.lab-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.lab-fields label{display:grid;gap:5px;font-size:13px;color:var(--ink-2)}.lab-fields input,.lab-fields select{padding:10px;min-width:0;width:100%;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:8px;font:inherit}.lab-result{background:var(--copper-soft);padding:16px;border-radius:10px;margin:14px 0}.lab-value{font:700 clamp(23px,3vw,34px) var(--font-display);overflow-wrap:anywhere}.lab-muted{font-size:13px;color:var(--ink-3);line-height:1.6}.lab-table{width:100%;border-collapse:collapse}.lab-table th,.lab-table td{padding:10px 8px}.lab-heading{margin:0 0 10px}.lab-status{font-size:12px;padding:3px 8px;border-radius:8px;background:var(--sunk)}.side .lab-group{font:700 12px var(--font-data);letter-spacing:.1em;color:var(--copper);padding:12px 12px 6px}@media(max-width:800px){.lab-grid,.lab-fields{grid-template-columns:1fr}}';
document.head.appendChild(style);
function panel(id,title,desc,html){const p=document.createElement('section');p.className='pane lab-pane';p.id=id;p.hidden=true;p.setAttribute('role','tabpanel');p.dataset.label=title;p.dataset.desc=desc;p.innerHTML=html;root.appendChild(p);return p;}
const cost=panel('lab-cost','원가 영향 시뮬레이터','원자재 시세 및 환율 변화 기반 구매원가 영향 계산',
'<h2 class="lab-heading">LAB / COST IMPACT</h2><p class="lab-muted">구매금액, 원자재 원가비중, 시세 반영률을 입력해 이론적 원가 영향을 계산합니다. 실제 계약단가 변동을 예측하는 수치는 아닙니다.</p><div class="lab-grid"><div class="lab-card"><h3>분석 조건</h3><div class="lab-fields">'+
'<label>대상 원자재<select id="lc-mat">'+choices+'</select></label>'+
'<label>기준 구매금액 (원)<input type="number" id="lc-amount" min="0" value="10000000"></label>'+
'<label>원자재 원가 비중 (%)<input type="number" id="lc-share" min="0" max="100" value="40"></label>'+
'<label>가격 반영률 (%)<input type="number" id="lc-pass" min="0" max="100" value="100"></label>'+
'<label>비교기간<select id="lc-months"><option value="1">전월 대비</option><option value="3" selected>최근 3개월 vs 직전 3개월</option><option value="6">최근 6개월 vs 직전 6개월</option></select></label>'+
'<label>환율 반영<select id="lc-fx"><option value="yes">USD/KRW 반영</option><option value="no">원자재 USD 시세만</option></select></label>'+
'</div><p class="lab-muted">반영률은 계약·협상·재고 영향 등을 고려해 사용자가 가정하는 비율입니다.</p></div>'+
'<div class="lab-card"><h3>예상 원가 영향</h3><div class="lab-result"><div class="lab-muted">예상 영향액</div><div class="lab-value" id="lc-result">데이터 로딩 중…</div><div id="lc-pct" class="lab-muted"></div></div><table class="lab-table"><tbody><tr><td>이전 기준 평균</td><td class="num" id="lc-before">—</td></tr><tr><td>최근 기준 평균</td><td class="num" id="lc-after">—</td></tr><tr><td>적용 가격 변동률</td><td class="num" id="lc-delta">—</td></tr></tbody></table><p class="lab-muted" id="lc-date"></p><p class="lab-muted">산식: 구매금액 × 원자재 비중 × 기준시세 변동률 × 반영률. 환율 반영 시 월별 USD 시세 × 월별 USD/KRW 값을 평균 비교합니다. 가공비·물류비·계약통화·재고시차는 별도 검토해야 합니다.</p></div></div>');
const timing=panel('lab-timing','BP 협상 타이밍','원자재 월평균 변화를 기준으로 협상 검토 신호 확인',
'<h2 class="lab-heading">LAB / BP NEGOTIATION</h2><p class="lab-muted">실제 공급사 가격이나 원가명세가 아닌 원자재 월평균 지표 기반의 검토 신호입니다. 3개월 평균이 직전 3개월보다 3% 이상 하락하면 협상 검토로 표시합니다.</p>'+
'<div class="lab-card"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><h3>원자재별 협상 검토 신호</h3><button class="btn" type="button" id="lt-refresh">새로고침</button></div><p class="lab-muted" id="lt-date">불러오는 중…</p><div class="tbl-wrap"><table class="lab-table"><thead><tr><th>원자재</th><th class="num">3개월 추세</th><th class="num">전월 대비</th><th>신호</th></tr></thead><tbody id="lt-table"></tbody></table></div></div>'+
'<div class="lab-card" style="margin-top:16px"><h3>개별 BP 단가 검토</h3><div class="lab-fields">'+
'<label>원자재<select id="lt-mat">'+choices+'</select></label>'+
'<label>현재 BP 단가 (원/개)<input type="number" id="lt-price" min="0" placeholder="직접 입력"></label>'+
'<label>원자재 원가 비중 (%)<input type="number" id="lt-share" min="0" max="100" value="40"></label>'+
'<label>시세 반영률 (%)<input type="number" id="lt-pass" min="0" max="100" value="100"></label></div>'+
'<div class="lab-result"><div class="lab-muted">시세 기반 개당 단가 영향 참고액 (환율 영향 제외)</div><div id="lt-result" class="lab-value">BP 단가를 입력해 주세요</div><div class="lab-muted" id="lt-pct"></div></div><p class="lab-muted">BP 단가 인하 가능 금액이나 계약상 권리가 아닙니다. BOM, 실제 투입중량, 재고, 계약 시점, 환율, 공급사 가공원가를 검증해야 합니다.</p></div>');
const el=id=>document.getElementById(id),format=(x,n=2)=>Number.isFinite(x)?x.toLocaleString('ko-KR',{maximumFractionDigits:n}):'—';
const percent=x=>Number.isFinite(x)?(x>0?'+':'')+format(x)+'%':'—';
let data=null;
function trend(id,months,fx){
const v=data?.history?.[id]?.avg,x=data?.history?.fx?.avg;
if(!Array.isArray(v)||v.length<months*2||(fx&&(!Array.isArray(x)||x.length<v.length)))return null;
const vals=v.map((p,i)=>Number(p)*(fx?Number(x[i]):1));
const part=vals.slice(-months*2);if(part.some(z=>!Number.isFinite(z)||z<=0))return null;
const avg=a=>a.reduce((p,q)=>p+q,0)/a.length,old=avg(part.slice(0,months)),recent=avg(part.slice(months));
return {old,recent,delta:(recent/old-1)*100};
}
function valid(x,limit){return Number.isFinite(x)&&x>=0&&(limit===undefined||x<=limit);}
function renderCost(){
const k=el('lc-mat').value,t=trend(k,+el('lc-months').value,el('lc-fx').value==='yes'),amount=Number(el('lc-amount').value),share=Number(el('lc-share').value),pass=Number(el('lc-pass').value);
if(!t||![valid(amount),valid(share,100),valid(pass,100)].every(Boolean)){el('lc-result').textContent='데이터 또는 입력값을 확인해 주세요';return;}
const n=amount*share/100*t.delta/100*pass/100;
el('lc-result').textContent=(n>0?'+':'')+format(Math.round(n),0)+'원';el('lc-result').style.color=n>0?'var(--bad)':n<0?'var(--good)':'var(--ink)';
el('lc-pct').textContent=n>0?'이론적 원가 증가':n<0?'이론적 원가 감소':'변동 없음';
el('lc-before').textContent=format(t.old);el('lc-after').textContent=format(t.recent);el('lc-delta').textContent=percent(t.delta);
el('lc-date').textContent='지표 단위: '+(el('lc-fx').value==='yes'?'KRW 환산 ('+meta[k][1]+' × USD/KRW)':meta[k][1])+' · 저장 데이터: '+(data.history.updatedAt||'월평균');
}
function renderTiming(){
el('lt-date').textContent=data?'기준: '+(data.history.updatedAt||data.prices.finishedAt||'저장된 월평균'):'data.json을 불러올 수 없습니다.';
el('lt-table').innerHTML=Object.entries(meta).map(([k,v])=>{const a=trend(k,3,false),b=trend(k,1,false);return '<tr><td>'+v[0]+'</td><td class="num">'+(a?percent(a.delta):'—')+'</td><td class="num">'+(b?percent(b.delta):'—')+'</td><td><span class="lab-status">'+(!a?'자료 부족':a.delta<=-3?'협상 검토':a.delta>=3?'상승 위험':'관찰')+'</span></td></tr>';}).join('');
const k=el('lt-mat').value,t=trend(k,3,false),raw=el('lt-price').value,price=Number(raw),share=Number(el('lt-share').value),pass=Number(el('lt-pass').value);
if(!t||raw===''||![valid(price),valid(share,100),valid(pass,100)].every(Boolean)){el('lt-result').textContent=raw===''?'BP 단가를 입력해 주세요':'입력값 또는 데이터를 확인해 주세요';el('lt-pct').textContent=t?'원자재 지표 '+percent(t.delta):'';return;}
const n=price*share/100*t.delta/100*pass/100;el('lt-result').textContent=(n>0?'+':'')+format(Math.round(n),0)+'원/개';el('lt-result').style.color=n>0?'var(--bad)':n<0?'var(--good)':'var(--ink)';el('lt-pct').textContent='3개월 원자재 지표 '+percent(t.delta)+' · 환율 미반영';
}
async function reload(){
try{const r=await fetch('./data.json?lab='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();if(!j.history||!j.prices)throw Error('월평균 데이터 누락');data=j;}
catch(e){data=null;el('lt-date').textContent='데이터 로드 실패: '+e.message;}
renderCost();renderTiming();
}
cost.addEventListener('input',renderCost);cost.addEventListener('change',renderCost);
timing.addEventListener('input',renderTiming);timing.addEventListener('change',renderTiming);el('lt-refresh').addEventListener('click',reload);
reload();
})();