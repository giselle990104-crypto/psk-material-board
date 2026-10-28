/* Export actual monthly board history to Excel; do not manufacture missing months. */
(()=>{
'use strict';
const panel=document.getElementById('trend'),period=document.getElementById('period');
if(!panel||!period||document.getElementById('trendExportExcel'))return;
const style=document.createElement('style');
style.textContent='.trend-export-tools{display:flex;align-items:center;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin:8px 0}.trend-export-note{font-size:12px;color:var(--ink-3);margin:0}.trend-export-tools .btn{white-space:nowrap}';
document.head.appendChild(style);
const controls=document.createElement('div');controls.className='trend-export-tools no-pdf';
controls.innerHTML='<span class="trend-export-note">5년 조회 지원 · 2022~2023년 미수집 시 빈칸 표시</span><button class="btn primary" id="trendExportExcel" type="button">엑셀 다운로드 (.xlsx)</button>';
period.after(controls);
for(const id of ['pFromY','pToY']){const select=document.getElementById(id);for(const y of [2022,2023]){if(![...select.options].some(o=>o.value===String(y))){const opt=new Option(y+'년',String(y));select.add(opt);}}}
const note=document.createElement('p');note.className='trend-export-note no-pdf';note.id='trendExportStatus';controls.after(note);
const status=s=>{note.textContent=s;};

function monthsBetween(from,to){
 const result=[];let [y,m]=from.split('-').map(Number);const [endY,endM]=to.split('-').map(Number);
 if(!Number.isFinite(y)||!Number.isFinite(m)||!Number.isFinite(endY)||!Number.isFinite(endM))return result;
 while(y<endY||(y===endY&&m<=endM)){result.push(y+'-'+String(m).padStart(2,'0'));if(++m>12){y++;m=1;}if(result.length>=120)break;}
 return result;
}
function makeRows(){
 if(typeof TREND==='undefined'||typeof RANGE==='undefined'||typeof curTrend==='undefined')throw Error('차트 데이터를 불러오지 못했습니다.');
 const series=TREND[curTrend];
 if(!series)throw Error('원자재를 선택해 주세요.');
 const map=new Map(series.s.filter(p=>Number.isFinite(+p.v)).map(p=>[p.d.slice(0,7),+p.v]));
 const start=RANGE.from,end=RANGE.to;
 const rows=monthsBetween(start,end).map(month=>({'연월':month,'원자재':series.label,'월평균 가격':map.has(month)?map.get(month):null,'단위':series.unit.trim(),'데이터 상태':map.has(month)?'수집 완료':'데이터 미확보'}));
 return {rows,series,start,end,available:rows.filter(x=>x['월평균 가격']!==null).length};
}
function saveCSV(out){
 const cols=['연월','원자재','월평균 가격','단위','데이터 상태'];
 const csv=[cols.join(','),...out.rows.map(r=>cols.map(k=>{let v=r[k]??'';return '"'+String(v).replace(/"/g,'""')+'"';}).join(','))].join('\r\n');
 const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='PSK_'+out.series.label+'_'+out.start+'_'+out.end+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
document.getElementById('trendExportExcel').addEventListener('click',()=>{
 try{
 const out=makeRows();if(!out.rows.length)throw Error('조회 기간을 확인해 주세요.');
 if(typeof XLSX==='undefined'){saveCSV(out);status('Excel 라이브러리를 로드하지 못해 Excel에서 열 수 있는 CSV로 저장했습니다.');return;}
 const ws=XLSX.utils.json_to_sheet(out.rows,{header:['연월','원자재','월평균 가격','단위','데이터 상태'],cellDates:false});
 ws['!cols']=[{wch:14},{wch:19},{wch:19},{wch:14},{wch:18}];
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'월별 시세');
 const info=XLSX.utils.aoa_to_sheet([['원자재',out.series.label],['조회 기간',out.start+' ~ '+out.end],['보유 데이터',out.available+' / '+out.rows.length+'개월'],['원래 데이터 설명',out.series.note],['주의사항','미확보한 과거 시세는 공란으로 두었습니다. 임의 추정값이 아닙니다.']]);
 XLSX.utils.book_append_sheet(wb,info,'데이터 안내');
 XLSX.writeFile(wb,'PSK_'+out.series.label+'_'+out.start+'_'+out.end+'.xlsx');
 status('엑셀 다운로드 완료 · 실제 월평균 '+out.available+'개월 / 조회 범위 '+out.rows.length+'개월');
 }catch(e){status('다운로드 오류: '+e.message);}
});
})();