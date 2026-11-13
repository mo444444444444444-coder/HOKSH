(()=>{
const BASE='https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/';const BASE_AHMED='https://cdn.jsdelivr.net/gh/AhmedBaset/hadith-json@v1.2.0/db/by_book/';
const books=[
{id:'bukhari',name:'صحيح البخاري',edition:'ara-bukhari',kind:'صحيح',note:'أصل من أصول الحديث الصحيح'},
{id:'muslim',name:'صحيح مسلم',edition:'ara-muslim',kind:'صحيح',note:'أصل من أصول الحديث الصحيح'},
{id:'abudawud',name:'سنن أبي داود',edition:'ara-abudawud',kind:'سنن',note:'يضم أحاديث بأحكام متفاوتة'},
{id:'tirmidhi',name:'جامع الترمذي',edition:'ara-tirmidhi',kind:'سنن',note:'يذكر الترمذي أحكامًا على عدد من الروايات'},
{id:'nasai',name:'سنن النسائي',edition:'ara-nasai',kind:'سنن',note:'من كتب السنن المعتمدة'},
{id:'ibnmajah',name:'سنن ابن ماجه',edition:'ara-ibnmajah',kind:'سنن',note:'يحتاج كل حديث إلى النظر في درجته'},
{id:'malik',name:'موطأ الإمام مالك',edition:'ara-malik',kind:'موطأ',note:'يضم المرفوع والآثار والبلاغات'},
{id:'ahmad',name:'مسند الإمام أحمد',edition:'the_9_books/ahmed.json',source:'ahmed',kind:'مسند',note:'متن عربي؛ توجد فجوات معروفة في بعض الأبواب'},
{id:'darimi',name:'سنن الدارمي',edition:'the_9_books/darimi.json',source:'ahmed',kind:'سنن',note:'متن عربي؛ تُراجع الروايات وأحكامها'},
{id:'nawawi',name:'الأربعون النووية',edition:'forties/nawawi40.json',source:'ahmed',kind:'مختارات',note:'أحاديث جامعة في أصول الدين والأخلاق'},
{id:'qudsi',name:'الأحاديث القدسية الأربعون',edition:'forties/qudsi40.json',source:'ahmed',kind:'مختارات',note:'تُراجع درجة كل حديث على حدة'},
{id:'riyad',name:'رياض الصالحين',edition:'other_books/riyad_assalihin.json',source:'ahmed',kind:'تزكية وآداب',note:'أبواب في العبادات والأخلاق والآداب'},
{id:'shamail',name:'الشمائل المحمدية',edition:'other_books/shamail_muhammadiyah.json',source:'ahmed',kind:'شمائل',note:'صفات النبي ﷺ وأحواله'},
{id:'adab',name:'الأدب المفرد',edition:'other_books/aladab_almufrad.json',source:'ahmed',kind:'آداب',note:'آثار وأحاديث في الآداب'},
{id:'bulugh',name:'بلوغ المرام',edition:'other_books/bulugh_almaram.json',source:'ahmed',kind:'أحكام',note:'أحاديث الأحكام مع الحاجة إلى التخريج'},
{id:'mishkat',name:'مشكاة المصابيح',edition:'other_books/mishkat_almasabih.json',source:'ahmed',kind:'جامع',note:'مجموعة حديثية واسعة'}
];
const $=id=>document.getElementById(id);let active=null,cache=new Map(),all=[];
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function notify(s){const t=$('toast');t.textContent=s;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2000)}
function renderBooks(){$('hadithBooks').innerHTML=books.map(b=>'<button class="book-button '+(active===b.id?'active':'')+'" data-book="'+b.id+'"><span><b>'+b.name+'</b><small>'+b.note+'</small></span><small>'+b.kind+'</small></button>').join('')}
async function fetchEdition(id){const book=books.find(b=>b.edition===id),urls=book?.source==='ahmed'?[BASE_AHMED+id]:[BASE+id+'.min.json',BASE+id+'.json'];let error;for(const url of urls)try{const r=await fetch(url);if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();let items=Array.isArray(j)?j:Array.isArray(j.hadiths)?j.hadiths:Array.isArray(j.data)?j.data:Array.isArray(j.items)?j.items:[];if(!items.length)throw Error('لا توجد متون في استجابة المصدر');return {items,metadata:j.metadata||j.info||{}}}catch(e){error=e}throw error||Error('تعذر تحميل الكتاب')}
function getText(h){return h.text||h.hadith||h.arabic||h.body||''}
function getNumber(h,i){return h.hadithnumber??h.number??h.idInBook??h.id??(i+1)}
function getGrade(h){const grades=h.grades||h.grade||h.status||'';if(Array.isArray(grades))return grades.map(g=>typeof g==='string'?g:(g.grade||g.name||'')).filter(Boolean).join('، ');return typeof grades==='string'?grades:(grades?.grade||'')}
async function loadBook(id){const b=books.find(x=>x.id===id);if(!b)return;active=id;renderBooks();$('hadithBookTitle').textContent=b.name;$('hadithResults').innerHTML='<div class="loading">جارٍ تحميل نصوص الكتاب من مصدر البيانات…</div>';$('hadithStatus').textContent='تحميل '+b.name;try{let data=cache.get(id);if(!data){data=await fetchEdition(b.edition);cache.set(id,data)}all=data.items;$('hadithBookCount').textContent=all.length.toLocaleString('ar-EG')+' رواية متاحة';$('hadithStatus').textContent='تم تحميل الفهرس';renderResults();}catch(e){$('hadithResults').innerHTML='<div class="notice">تعذر تحميل هذا الكتاب من مصدر البيانات حاليًا. قد تختلف التغطية بين الكتب. أعد المحاولة لاحقًا.</div><button class="btn btn-outline" id="retryHadith">إعادة المحاولة</button>';$('retryHadith').onclick=()=>{cache.delete(id);loadBook(id)};$('hadithStatus').textContent='تعذر التحميل';console.error(e)}}
function renderResults(){const q=$('hadithSearch').value.trim().toLowerCase();const found=all.map((h,i)=>({h,i})).filter(({h})=>!q||(getText(h)+' '+getNumber(h,0)+' '+(h.reference||'')).toLowerCase().includes(q));const shown=found.slice(0,80);$('hadithResults').innerHTML=shown.length?shown.map(({h,i})=>{const num=getNumber(h,i),text=getText(h),grade=getGrade(h),narrator=h.narrator||h.english?.narrator||h.rawi||'';return '<article class="hadith-card"><small>حديث رقم '+esc(num)+(h.reference?' · '+esc(h.reference):'')+'</small><p>'+esc(text)+'</p><small>'+(narrator?'الراوي: '+esc(narrator)+' · ':'')+(grade?'الدرجة كما وردت في المصدر: '+esc(grade):'لم تُرفق درجة في سجل البيانات')+'</small><div class="ayah-tools"><button data-hadith-copy="'+i+'">نسخ المتن</button><button data-hadith-save="'+i+'">♡ حفظ</button></div></article>'}).join(''):'<div class="empty-state">لا توجد نتائج مطابقة في البيانات المحمّلة.</div>';if(found.length>80)$('hadithResults').insertAdjacentHTML('beforeend','<p class="source-note">عُرض أول 80 نتيجة من أصل '+found.length+'. ضيّق البحث لإظهار نتائج أخرى.</p>')}
$('hadithBooks').addEventListener('click',e=>{const b=e.target.closest('[data-book]');if(b)loadBook(b.dataset.book)});
$('hadithSearchBtn').onclick=renderResults;$('hadithSearch').addEventListener('keydown',e=>{if(e.key==='Enter')renderResults()});
$('hadithResults').addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;const i=Number(b.dataset.hadithCopy??b.dataset.hadithSave),h=all[i];if(!h)return;const text=getText(h);if(b.dataset.hadithCopy!==undefined){try{await navigator.clipboard.writeText(text);notify('تم نسخ الحديث')}catch{notify('تعذر النسخ')}}if(b.dataset.hadithSave!==undefined){let a=[];try{a=JSON.parse(localStorage.getItem('noor.savedHadith')||'[]')}catch{};const item={book:books.find(x=>x.id===active)?.name,number:getNumber(h,i),text};a.unshift(item);localStorage.setItem('noor.savedHadith',JSON.stringify(a.slice(0,100)));notify('تم حفظ الحديث على هذا الجهاز')}});
window.NoorHadith={init:renderBooks,loadBook,books};
document.addEventListener('DOMContentLoaded',renderBooks);
})();