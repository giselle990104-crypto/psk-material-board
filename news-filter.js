(()=>{
'use strict';
const news=document.getElementById('newsFilter'), list=document.getElementById('newsList');
if(!news||!list||document.getElementById('newsYear'))return;
const style=document.createElement('style');
style.textContent='.news-datebar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px}.news-datebar select{min-width:105px}.news-datebar label{font-weight:600;color:var(--ink-2)}.news-date-count{margin-left:auto;color:var(--ink-3);font-size:13px}';
document.head.appendChild(style);
const wrap=document.createElement('div');wrap.className='news-datebar no-pdf';
wrap.innerHTML='<label for="newsYear">기사 조회</label><select id="newsYear" aria-label="조회 연도"></select><span>년</span><select id="newsMonth" aria-label="조회 월"></select><span>월</span><span class="news-date-count" id="newsDateCount"></span>';
news.before(wrap);
const year=document.getElementById('newsYear'),month=document.getElementById('newsMonth'),count=document.getElementById('newsDateCount');
let original=Array.from(list.children).map(li=>li.cloneNode(true));
const dates=()=>{
const vals=Array.from(list.querySelectorAll('li time')).map(t=>t.textContent.trim());
if(vals.length>original.length)original=Array.from(list.children).map(li=>li.cloneNode(true));
return vals;
};
const select=(node,entries,previous)=>{
node.replaceChildren();
entries.forEach(([value,title])=>node.add(new Option(title,value)));
if(entries.some(x=>x[0]===previous))node.value=previous;
};
function populate(){
const prev=year.value||'all';
const years=[...new Set(dates().map(x=>x.slice(0,4)).filter(x=>/^\d{4}$/.test(x)))].sort().reverse();
select(year,[['all','전체 연도'],...years.map(y=>[y,y])],prev);
if(!month.options.length)select(month,[['all','전체 월'],...Array.from({length:12},(_,i)=>[String(i+1).padStart(2,'0'),String(i+1).padStart(2,'0')])],'all');
}
function filter(){
const rows=Array.from(list.children);
let visible=0;
for(const li of rows){
const date=li.querySelector('time')?.textContent.trim()||'';
const ok=(year.value==='all'||date.slice(0,4)===year.value)&&(month.value==='all'||date.slice(5,7)===month.value);
li.hidden=!ok;if(ok)visible++;
}
count.textContent=visible+'건';
let empty=document.getElementById('newsArchiveEmpty');
if(!empty){empty=document.createElement('p');empty.id='newsArchiveEmpty';empty.className='chart-note';list.after(empty);}
empty.textContent=visible?'':'선택한 기간의 기사가 없습니다.';
}
function update(){populate();filter();}
year.addEventListener('change',filter);month.addEventListener('change',filter);
const obs=new MutationObserver(()=>{requestAnimationFrame(update);});
obs.observe(list,{childList:true});
update();
})();