(()=>{
const p=document.getElementById('lab-price-review');if(!p)return;
const anchor=p.querySelector('#pr-cost-rows')?.closest('.pr-card');if(!anchor)return;
const d=document.createElement('div');d.className='pr-card';
d.innerHTML='<h3>추가 원가 검토 · 중량 / 수율 / 공수 / 이윤</h3><p class="pr-note">확인 불가를 선택하면 민감도 분석용 예시값을 사용합니다. 실제 부품·공급사에 대한 사실이 아닙니다.</p><div class="pr-grid" id="extraInputs"></div><p id="extraResult" class="pr-note"></p>';
anchor.after(d);
const defs=[['weight','부품 순중량 (kg/개)',0.5],['yield','소재 수율 (%)',85],['hours','가공 공수 (M/H·개)',1.5],['wage','시간당 임률 (원/M/H)',20000],['margin','공급사 이윤율 (%)',10]];
const g=d.querySelector('#extraInputs');
defs.forEach(([key,label,num])=>{const l=document.createElement('label');l.className='pr-input';l.textContent=label;const s=document.createElement('select');s.dataset.sel=key;[['manual','직접 입력'],['estimated','확인 불가 → 예시 '+num]].forEach(([v,t])=>s.add(new Option(t,v)));const i=document.createElement('input');i.type='number';i.step='any';i.min='0';i.dataset.val=key;l.append(s,i);g.append(l);});
const val=k=>{const sel=g.querySelector('[data-sel="'+k+'"]'),inp=g.querySelector('[data-val="'+k+'"]');return sel.value==='estimated'?defs.find(x=>x[0]===k)[2]:(inp.value===''?NaN:Number(inp.value));};
let history=null;fetch('./data.json?scenario='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(j=>{history=j.history;calc();}).catch(()=>{});
const monthValue=(key,date)=>{const z=history?.[key];if(!z?.avg?.length||!date)return NaN;const [y,m]=z.m0.split('-').map(Number),[Y,M]=date.split('-').map(Number),i=(Y-y)*12+M-m;return Number(z.avg[i]);};
function calc(){const w=val('weight'),y=val('yield'),h=val('hours'),r=val('wage'),m=val('margin');const used=w>0&&y>0&&y<=100?w/y*100:NaN,labor=h>=0&&r>=0?h*r:NaN,price=Number(p.querySelector('#pr-newPrice')?.value||NaN),preProfit=Number.isFinite(price)&&m>=0&&m<100?price*(1-m/100):NaN;const material=p.querySelector('#pr-material')?.value,oldMonth=p.querySelector('#pr-oldDate')?.value,newMonth=p.querySelector('#pr-newDate')?.value;
const conversion=material==='cu'?2.20462:material==='st'?1/907.18474:material==='ni'||material==='al'?1/1000:NaN;
const rawCost=month=>{const base=monthValue(material,month),fx=monthValue('fx',month);return Number.isFinite(base)&&Number.isFinite(fx)&&Number.isFinite(used)&&Number.isFinite(conversion)?base*conversion*used*fx:NaN;};
const priorRaw=rawCost(oldMonth),currentRaw=rawCost(newMonth);
const rawComparison=Number.isFinite(priorRaw)&&Number.isFinite(currentRaw)?' · 소재 시세·중량 기반 이론비용 '+Math.round(priorRaw).toLocaleString()+'원 → '+Math.round(currentRaw).toLocaleString()+'원 (증감 '+Math.round(currentRaw-priorRaw).toLocaleString()+'원, 환율 반영)':' · 소재 시세 기반 계산: 동일 월 지표 부족 또는 별도 규격';
const est=defs.filter(x=>g.querySelector('[data-sel="'+x[0]+'"]').value==='estimated').map(x=>x[1]);d.querySelector('#extraResult').textContent='소재 투입량 '+(Number.isFinite(used)?used.toFixed(3)+'kg':'미입력')+' · 직접노무비 '+(Number.isFinite(labor)?Math.round(labor).toLocaleString()+'원':'미입력')+' · 이윤 제외 신규 단가 '+(Number.isFinite(preProfit)?Math.round(preProfit).toLocaleString()+'원':'미입력')+' · 예시 적용: '+(est.join(', ')||'없음')+' (검증 필요)'+rawComparison;}
g.addEventListener('change',e=>{if(e.target.dataset.sel){const k=e.target.dataset.sel;g.querySelector('[data-val="'+k+'"]').disabled=e.target.value==='estimated';}calc();});g.addEventListener('input',calc);p.addEventListener('input',e=>{if(['pr-newPrice','pr-oldDate','pr-newDate','pr-material'].includes(e.target.id))calc();});calc();
const note=document.createElement('p');note.className='pr-note';note.textContent='예시값은 부품별 가정치이며 제조업 공식 임금 통계가 아닙니다. 이 추가 시나리오는 아직 엑셀 일괄 분석·기존 적정성 판정식에 반영되지 않습니다.';d.append(note);
})();