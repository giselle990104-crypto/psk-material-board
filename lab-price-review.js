(()=>{
'use strict';
const root=document.getElementById('panes');if(!root||document.getElementById('lab-price-review'))return;
const pane=document.createElement('section');pane.id='lab-price-review';pane.className='pane lab-pane';pane.hidden=true;pane.setAttribute('role','tabpanel');pane.dataset.label='단가 인상 검토';pane.dataset.desc='As-is / To-be 견적 원가 및 시점별 원자재 지표 비교';
const fields=[['raw','원재료비'],['labor','직접노무비'],['processing','가공·외주비'],['energy','에너지·유틸리티'],['packing','포장비'],['logistics','운송·물류비'],['overhead','제조경비'],['other','기타']];
const mat=[['cu','구리 · COMEX USD/lb'],['al','알루미늄 · USD/t'],['st','철강(미국 HRC) · USD/st'],['ni','니켈 · USD/t'],['pl','플라스틱 참고(브렌트유) · USD/bbl'],['custom','직접 입력 (외부 시세 없음)']];
const names={cu:'구리',al:'알루미늄',st:'철강',ni:'니켈',pl:'브렌트유(대용 지표)',custom:'직접 입력'};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=1)=>Number.isFinite(v)?v.toLocaleString('ko-KR',{maximumFractionDigits:d}):'—';
const n=v=>v===''||v===null||v===undefined?NaN:Number(v);
const initial=()=>({name:'',bp:'',oldDate:'2025-10',newDate:'2026-10',oldPrice:'',newPrice:'',material:'cu',customName:'',oldIndex:'',newIndex:'',old:{},new:{},note:''});
let items=[initial()],active=0,history=null;
const css=document.createElement('style');css.textContent='.pr-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}.pr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.pr-input{display:grid;gap:5px;font-size:12px;color:var(--ink-2)}.pr-input input,.pr-input select,.pr-input textarea{width:100%;min-width:0;padding:9px;border:1px solid var(--line);border-radius:7px;background:var(--panel);color:var(--ink);font:inherit}.pr-card{border:1px solid var(--line);border-radius:12px;padding:16px;margin:14px 0}.pr-table{width:100%;border-collapse:collapse;font-size:13px}.pr-table td,.pr-table th{padding:9px;border-bottom:1px solid var(--line);text-align:left}.pr-table td input{width:100%;min-width:0;padding:8px;background:var(--panel);border:1px solid var(--line);border-radius:6px;color:var(--ink)}.pr-actions{display:flex;flex-wrap:wrap;gap:8px}.pr-note{font-size:12px;line-height:1.7;color:var(--ink-3)}.pr-big{font-size:22px;font-weight:700}.pr-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:10px}.pr-summary>div{padding:13px;border-radius:9px;background:var(--sunk)}.pr-wrap{overflow-x:auto}.pr-status{font-weight:600}@media(max-width:700px){.pr-grid{grid-template-columns:1fr}}';document.head.appendChild(css);
const fieldHTML=(key,label,type='number')=>'<label class="pr-input">'+label+'<input id="pr-'+key+'" type="'+type+'" '+(type==='number'?'min="0" step="any"':'')+'></label>';
pane.innerHTML='<div class="pr-head"><div><h2>LAB / 단가 인상 검토</h2><p class="pr-note">기존 단가와 신규 견적을 원가 항목별로 비교하고, 과거 원자재 월평균 시세 변동을 대조합니다.</p></div><div class="pr-actions"><button class="btn" id="pr-add" type="button">+ 품목 추가</button><button class="btn" id="pr-template" type="button">엑셀 양식</button><button class="btn" id="pr-import" type="button">엑셀 불러오기</button><button class="btn primary" id="pr-export" type="button">검토 결과 엑셀</button><input id="pr-file" type="file" accept=".xlsx,.xls,.csv" hidden></div></div>'+
'<div class="pr-card"><label class="pr-input">검토 품목 선택<select id="pr-select"></select></label><div class="pr-grid" style="margin-top:13px">'+fieldHTML('name','품목명','text')+fieldHTML('bp','BP(공급사)','text')+fieldHTML('oldDate','기존 견적 기준월','month')+fieldHTML('newDate','신규 견적 기준월','month')+fieldHTML('oldPrice','기존 견적단가 (원/개)')+fieldHTML('newPrice','신규 견적단가 (원/개)')+'</div></div>'+
'<div class="pr-card"><h3>원재료 가격 비교</h3><div class="pr-grid"><label class="pr-input">기준 원자재<select id="pr-material">'+mat.map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></label>'+fieldHTML('customName','직접 입력 원자재명','text')+fieldHTML('oldIndex','기존 원자재 지표 (자동 또는 수동)')+fieldHTML('newIndex','신규 원자재 지표 (자동 또는 수동)')+'</div><p class="pr-note" id="pr-source"></p><p class="pr-note">월평균은 견적 월과 일치하는 월 데이터를 사용합니다. <strong>시세 반영률은 원재료비 100%로 가정</strong>하며, 실제 투입중량·수율·계약시차·환율·재고 등은 별도 검증이 필요합니다. 비상장 원자재와 시세 없는 월은 직접 입력하세요.</p></div>'+
'<div class="pr-card"><h3>원가 구성 비교 · 원/개</h3><div class="pr-wrap"><table class="pr-table"><thead><tr><th>원가 항목</th><th>As-is (기존)</th><th>To-be (신규)</th><th>증감액</th></tr></thead><tbody id="pr-cost-rows"></tbody><tfoot><tr><th>원가 구성 합계</th><th id="pr-oldsum">—</th><th id="pr-newsum">—</th><th id="pr-sumdelta">—</th></tr></tfoot></table></div><p class="pr-note">원가 항목은 견적단가와 별개로 입력합니다. 제조경비에 포함된 항목을 에너지비·물류비로 다시 입력하면 중복 계산이 발생하므로 구분하세요. 단가에는 이윤 등이 추가될 수 있습니다.</p></div>'+
'<div class="pr-card"><h3>인상 적정성 검토</h3><div class="pr-summary"><div><span class="pr-note">견적단가 인상</span><div class="pr-big" id="pr-quote">—</div></div><div><span class="pr-note">원가명세 증감</span><div class="pr-big" id="pr-costdelta">—</div></div><div><span class="pr-note">원자재 시세 변동</span><div class="pr-big" id="pr-indexdelta">—</div></div><div><span class="pr-note">시세 기반 원재료비 영향</span><div class="pr-big" id="pr-explained">—</div></div></div><p class="pr-note" id="pr-conclusion"></p><label class="pr-input">검토 메모 / BP 증빙 요청 사항<textarea id="pr-note" rows="3"></textarea></label></div>'+
'<div class="pr-card"><h3>품목별 검토 현황</h3><div class="pr-wrap"><table class="pr-table"><thead><tr><th>품목</th><th>BP</th><th>기존 → 신규</th><th>단가 인상률</th><th>시세 영향 참고</th><th>상태</th></tr></thead><tbody id="pr-list"></tbody></table></div></div>';
root.appendChild(pane);
const $=id=>document.getElementById(id);
fields.forEach(([k,label])=>{$('pr-cost-rows').insertAdjacentHTML('beforeend','<tr><th>'+label+'</th><td><input type="number" min="0" step="any" data-stage="old" data-cost="'+k+'" aria-label="'+label+' 기존"></td><td><input type="number" min="0" step="any" data-stage="new" data-cost="'+k+'" aria-label="'+label+' 신규"></td><td id="pr-d-'+k+'">—</td></tr>');});
const sample=k=>{const i=items[active],date=k==='old'?i.oldDate:i.newDate;
if(i.material==='custom')return n(k==='old'?i.oldIndex:i.newIndex);
const entry=history?.[i.material];
if(!entry||!date)return NaN;
const [y,m]=(entry.m0||'2024-01').split('-').map(Number),[ty,tm]=date.split('-').map(Number);
const idx=(ty-y)*12+tm-m;return idx>=0&&idx<entry.avg?.length?n(entry.avg[idx]):NaN;};
const metrics=i=>{
const old=n(i.oldPrice),newp=n(i.newPrice),sum=stage=>fields.reduce((a,[k])=>a+(Number(i[stage][k])||0),0);
const filled=stage=>fields.some(([k])=>i[stage][k]!==''&&i[stage][k]!==undefined);
const os=sum('old'),ns=sum('new'),o=sampleFor(i,'old'),v=sampleFor(i,'new'),change=Number.isFinite(o)&&o>0&&Number.isFinite(v)?v/o-1:NaN;
const explained=Number.isFinite(change)&&i.old.raw!==undefined&&i.old.raw!==''?Number(i.old.raw)*change:NaN;
const quote=Number.isFinite(old)&&old>0&&Number.isFinite(newp)?newp-old:NaN;
return {os,ns,filledOld:filled('old'),filledNew:filled('new'),change,explained,quote,quotePct:Number.isFinite(quote)?quote/old*100:NaN};
};
function sampleFor(i,k){
if(i.material==='custom')return n(k==='old'?i.oldIndex:i.newIndex);
const entry=history?.[i.material],date=k==='old'?i.oldDate:i.newDate;
if(!entry?.avg||!date)return NaN;
const [y,m]=(entry.m0||'2024-01').split('-').map(Number),[ty,tm]=date.split('-').map(Number);
const idx=(ty-y)*12+tm-m;return idx>=0&&idx<entry.avg.length?n(entry.avg[idx]):NaN;
}
function sync(){
const i=items[active];$('pr-select').replaceChildren();items.forEach((x,j)=>$('pr-select').add(new Option((j+1)+'. '+(x.name||'미입력 품목'),String(j))));
$('pr-select').value=String(active);
for(const key of ['name','bp','oldDate','newDate','oldPrice','newPrice','material','customName','note']){const el=$(key==='note'?'pr-note':'pr-'+key);if(el)el.value=i[key]??'';}
document.querySelectorAll('[data-cost]').forEach(el=>el.value=i[el.dataset.stage][el.dataset.cost]??'');
draw();
}
function draw(){
const i=items[active],m=metrics(i),isCustom=i.material==='custom',old=sampleFor(i,'old'),newp=sampleFor(i,'new');
$('pr-customName').disabled=!isCustom;
for(const [k,v] of [['oldIndex',old],['newIndex',newp]]){const el=$('pr-'+k);el.readOnly=!isCustom;el.value=Number.isFinite(v)?v:'';el.placeholder=isCustom?'직접 입력':'데이터 없는 월';}
$('pr-source').textContent=isCustom?'사용자 직접 입력 자료 · 동일한 단위의 원재료 가격 사용': 'data.json 월평균 지표 · '+(names[i.material]||'원자재')+' · 기존 '+i.oldDate+': '+fmt(old,4)+' / 신규 '+i.newDate+': '+fmt(newp,4)+' (단위·환율이 다를 수 있음)';
for(const [k] of fields){const a=n(i.old[k]),b=n(i.new[k]);$('pr-d-'+k).textContent=Number.isFinite(a)&&Number.isFinite(b)?fmt(b-a,0)+'원':'—';}
$('pr-oldsum').textContent=m.filledOld?fmt(m.os,0)+'원':'—';$('pr-newsum').textContent=m.filledNew?fmt(m.ns,0)+'원':'—';$('pr-sumdelta').textContent=m.filledOld&&m.filledNew?fmt(m.ns-m.os,0)+'원':'—';
$('pr-quote').textContent=fmt(m.quotePct)+'%';$('pr-costdelta').textContent=m.filledOld&&m.filledNew?fmt(m.ns-m.os,0)+'원':'—';
$('pr-indexdelta').textContent=Number.isFinite(m.change)?fmt(m.change*100)+'%':'시세 없음';$('pr-explained').textContent=Number.isFinite(m.explained)?fmt(m.explained,0)+'원':'계산 불가';
const warnings=[];if(!Number.isFinite(m.quote))warnings.push('기존·신규 견적단가 필요');if(!Number.isFinite(m.change))warnings.push('동일 단위의 원자재 양 시점 가격 필요');if(!m.filledOld||!m.filledNew)warnings.push('양 시점의 원가명세 필요');
const unexplained=Number.isFinite(m.quote)&&Number.isFinite(m.explained)?m.quote-m.explained:NaN;
$('pr-conclusion').textContent=warnings.length?'검토 보류: '+warnings.join(' / '):'견적 인상액 '+fmt(m.quote,0)+'원 중 원자재 시장시세만으로 설명되는 참고액 '+fmt(m.explained,0)+'원, 차액 '+fmt(unexplained,0)+'원. 차액은 노무·가공·포장·물류·수율·제조경비·이윤·계약 시차 등을 증빙으로 검토해야 합니다. 적정 단가 확정값이 아닙니다.';
$('pr-list').replaceChildren();items.forEach((x,j)=>{const z=metrics(x),tr=document.createElement('tr');const vals=[x.name||'미입력 품목',x.bp||'—',(x.oldDate||'—')+' → '+(x.newDate||'—'),fmt(z.quotePct)+'%',Number.isFinite(z.explained)?fmt(z.explained,0)+'원':'—',Number.isFinite(z.quote)&&Number.isFinite(z.explained)?'검토 가능':'자료 보완'];vals.forEach((v,col)=>{const td=document.createElement('td');td.textContent=v;if(!col){const btn=document.createElement('button');btn.type='button';btn.className='btn';btn.textContent=v;btn.addEventListener('click',()=>{active=j;sync();});td.replaceChildren(btn);}tr.appendChild(td);});$('pr-list').appendChild(tr);});
}
pane.addEventListener('input',e=>{
const t=e.target;if(t.id==='pr-select')return;
const i=items[active];if(t.dataset.cost){i[t.dataset.stage][t.dataset.cost]=t.value;draw();return;}
if(t.id?.startsWith('pr-')){const key=t.id.slice(3);if(key in i){i[key]=t.value;if(['oldDate','newDate','material','oldIndex','newIndex'].includes(key))draw();else if(key==='name'){$('pr-select').options[active].text=(active+1)+'. '+(i.name||'미입력 품목');draw();}else draw();}}
});
$('pr-select').addEventListener('change',e=>{active=Number(e.target.value);sync();});
$('pr-add').addEventListener('click',()=>{items.push(initial());active=items.length-1;sync();});
const headers=['품목명','BP','기존견적월','신규견적월','기존단가','신규단가','원자재코드','직접원자재명','기존원자재지표','신규원자재지표',...fields.flatMap(([k,label])=>['기존_'+label,'신규_'+label]),'메모'];
const rowOf=i=>[i.name,i.bp,i.oldDate,i.newDate,i.oldPrice,i.newPrice,i.material,i.customName,i.oldIndex,i.newIndex,...fields.flatMap(([k])=>[i.old[k]??'',i.new[k]??'']),i.note];
function parseRows(rows){const imported=[];rows.forEach(row=>{if(!row||!row.some(v=>v!==''&&v!=null))return;const i=initial();[i.name,i.bp,i.oldDate,i.newDate,i.oldPrice,i.newPrice,i.material,i.customName,i.oldIndex,i.newIndex]=row.slice(0,10).map(v=>v==null?'':String(v));if(!mat.some(x=>x[0]===i.material))i.material='custom';fields.forEach(([k],j)=>{i.old[k]=row[10+j*2]==null?'':String(row[10+j*2]);i.new[k]=row[11+j*2]==null?'':String(row[11+j*2]);});i.note=String(row[10+fields.length*2]??'');if(!/^\d{4}-\d{2}$/.test(i.oldDate)||!/^\d{4}-\d{2}$/.test(i.newDate))return;imported.push(i);});return imported;}
function workbook(rows,file){if(typeof XLSX==='undefined'){alert('엑셀 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');return;}const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=headers.map(()=>({wch:18}));XLSX.utils.book_append_sheet(wb,ws,'단가인상검토');XLSX.writeFile(wb,file);}
$('pr-template').addEventListener('click',()=>{workbook([headers,rowOf(initial())],'PSK_단가인상검토_입력양식.xlsx');});
$('pr-export').addEventListener('click',()=>{const results=['단가차이','인상률(%)','시세변동률(%)','시세기준 원재료영향(원)','미설명 인상분(원)','검토상태'];workbook([[...headers,...results],...items.map(i=>{const m=metrics(i);return [...rowOf(i),Number.isFinite(m.quote)?m.quote:'',Number.isFinite(m.quotePct)?m.quotePct:'',Number.isFinite(m.change)?m.change*100:'',Number.isFinite(m.explained)?m.explained:'',Number.isFinite(m.quote)&&Number.isFinite(m.explained)?m.quote-m.explained:'',Number.isFinite(m.quote)&&Number.isFinite(m.explained)?'증빙 검토 필요':'자료 보완'];})],'PSK_단가인상검토_결과.xlsx');});
$('pr-import').addEventListener('click',()=>$('pr-file').click());
$('pr-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(typeof XLSX==='undefined')throw Error('엑셀 라이브러리 없음');const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false}),arr=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''});if(JSON.stringify(arr[0])!==JSON.stringify(headers))throw Error('입력양식의 첫 행(열 이름)이 다릅니다. 양식을 먼저 다운로드해 주세요.');const imported=parseRows(arr.slice(1));if(!imported.length)throw Error('가져올 유효한 품목이 없습니다. 날짜는 YYYY-MM으로 입력하세요.');items=[...items.filter(i=>i.name||i.bp||i.oldPrice||i.newPrice),...imported];active=items.length-imported.length;sync();alert(imported.length+'개 품목을 불러왔습니다.');}catch(err){alert('엑셀 읽기 오류: '+err.message);}e.target.value='';});
fetch('./data.json?pr='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(d=>{history=d.history||null;draw();}).catch(()=>{$('pr-source').textContent='시세 DB를 불러오지 못했습니다. 직접 입력 자료로 검토 가능합니다.';});
sync();
})();