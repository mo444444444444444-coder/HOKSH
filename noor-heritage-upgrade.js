/* Noor Islam visual and interaction upgrade v54 */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const K=window.NOOR_KNOWLEDGE||{},L=window.NOOR_LESSONS||{};
function renderHadithBooks(){
 const host=$('hadithBooks'),books=window.NoorHadith?.books||[];if(!host||!books.length)return;
 host.innerHTML=books.map((b,i)=>'<button type="button" class="heritage-book-card" data-book="'+esc(b.id)+'"><span class="book-mark" aria-hidden="true">۞</span><span class="book-copy"><span class="book-kicker">'+esc(b.kind)+' · مكتبة السنة</span><b class="book-title">'+esc(b.name)+'</b><small class="book-note">'+esc(b.note)+'</small><span class="book-open">افتح الكتاب ←</span></span><span class="book-index">'+String(i+1).padStart(2,'0')+'</span></button>').join('');
}
function renderProphets(){
 const host=$('prophetsGrid'),items=K.prophets||[];if(!host||!items.length)return;
 host.innerHTML=items.map(([name,desc,ref],i)=>{
  const plain=String(name).replace(/ عليه السلام/g,'').replace('محمد ﷺ','محمد ﷺ');
  const parts=String(desc||'').split(/[،؛.]/).map(x=>x.trim()).filter(Boolean);
  const fact1=parts[0]||'نبي كريم ذكره الله في كتابه';
  const fact2=parts[1]||'نتعرّف إلى قصته من القرآن الكريم';
  const title=name==='محمد ﷺ'?'محمد ﷺ':plain+' عليه السلام';
  const available=!!L[title];
  return '<article class="prophet-art-card"><div class="prophet-card-art prophet-art-'+(i%6)+'"><span>۞</span><small>من قصص الوحي</small></div><div class="prophet-card-body"><span class="prophet-card-kicker">النبي رقم '+(i+1).toLocaleString('ar-EG')+' · سيرة وعبرة</span><h3>'+esc(name)+'</h3><p>'+esc(fact1)+'</p><p class="prophet-second-fact">'+esc(fact2)+'</p><div class="prophet-card-fact">'+esc(ref||'من القرآن الكريم')+'</div><button type="button" class="prophet-card-open" data-prophet-topic="'+esc(plain)+'" '+(available?'':'aria-label="القصة تحتاج إلى استكمال"')+'>'+(available?'اقرأ القصة والأدلة كاملة ←':'عرض المعلومات المتاحة')+'</button></div></article>';
 }).join('');
}
function renderSeerah(){
 const timeline=$('seerahTimeline'),items=K.seerah||[];if(!timeline||!items.length)return;
 let active=0;
 const shell=document.createElement('div');shell.className='seerah-explorer';
 shell.innerHTML='<div class="seerah-explorer-intro"><div class="seerah-photo"><img src="https://commons.wikimedia.org/wiki/Special:FilePath/Masjid-Al-Nabawi%20Madinah.jpg?width=1200" alt="صورة فوتوغرافية للمسجد النبوي في المدينة المنورة" loading="lazy"><span>المدينة المنورة · معالم السيرة</span></div><div class="seerah-progress-card"><small>رحلة عبر السيرة</small><b id="seerahStepCount"></b><div class="seerah-progress"><i id="seerahProgressFill"></i></div><p>اختر محطة لتقرأ ملخصها ودليلها، أو انتقل بالتتابع بين الأحداث.</p></div></div><div class="seerah-interactive"><div class="seerah-steps" id="seerahSteps" aria-label="محطات السيرة"></div><article class="seerah-detail" id="seerahDetail" aria-live="polite"></article><div class="seerah-controls"><button type="button" class="btn btn-outline" id="seerahPrev">المحطة السابقة</button><button type="button" class="btn btn-gold" id="seerahNext">المحطة التالية ←</button></div></div>';
 timeline.replaceWith(shell);
 const steps=shell.querySelector('#seerahSteps'),detail=shell.querySelector('#seerahDetail');
 steps.innerHTML=items.map(([t],i)=>'<button type="button" class="seerah-step" data-step="'+i+'"><span class="seerah-step-number">'+(i+1).toLocaleString('ar-EG')+'</span><span><small>المحطة '+(i+1).toLocaleString('ar-EG')+'</small><b>'+esc(t)+'</b></span></button>').join('');
 function show(n){active=Math.max(0,Math.min(items.length-1,n));const [title,body,ref]=items[active];steps.querySelectorAll('.seerah-step').forEach((b,i)=>{b.classList.toggle('active',i===active);b.setAttribute('aria-current',i===active?'step':'false')});$('seerahStepCount').textContent=(active+1).toLocaleString('ar-EG')+' من '+items.length.toLocaleString('ar-EG');$('seerahProgressFill').style.width=((active+1)/items.length*100)+'%';detail.innerHTML='<small class="detail-index">المحطة '+(active+1).toLocaleString('ar-EG')+' من '+items.length.toLocaleString('ar-EG')+'</small><h3>'+esc(title)+'</h3><p>'+esc(body)+'</p><div class="detail-evidence">✦ '+esc(ref||'يراجع في مصادر السيرة المعتمدة')+'</div><div class="detail-progress"><i style="width:'+((active+1)/items.length*100)+'%"></i></div>';shell.querySelector('#seerahPrev').disabled=active===0;shell.querySelector('#seerahNext').disabled=active===items.length-1;}
 steps.addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(b)show(Number(b.dataset.step))});
 shell.querySelector('#seerahPrev').addEventListener('click',()=>show(active-1));shell.querySelector('#seerahNext').addEventListener('click',()=>show(active+1));show(0);
}
function setupLibrary(){
 const grid=$('libraryGrid');if(!grid)return;
 const bar=document.createElement('div');bar.className='library-categories';bar.id='libraryCategories';
 const cats=[['all','كل المكتبة'],['quran','القرآن وعلومه'],['hadith','السنة والحديث'],['prophets','الأنبياء والسيرة'],['aqeedah','العقيدة'],['fiqh','الفقه والعبادات'],['ethics','الأخلاق والأسرة'],['history','التاريخ الإسلامي']];
 bar.innerHTML=cats.map(([id,label],i)=>'<button type="button" class="library-category-chip '+(!i?'active':'')+'" data-library-category="'+id+'">'+label+'</button>').join('');
 grid.before(bar);
 let current='all';
 function categoryFor(text){if(/حديث|سنة|بخاري|مسلم|ترمذي|أبي داود|نسائي|ابن ماجه|النووية|رياض الصالحين|الشمائل/.test(text))return'hadith';if(/نبي|أنبياء|سيرة|هجرة|غزوة|مكة|المدينة|صحابة|صحابي/.test(text))return'prophets';if(/قرآن|تفسير|نزول|تجويد|قراءات|مصحف/.test(text))return'quran';if(/عقيدة|إيمان|توحيد|قدر|ملائكة|جن|غيب/.test(text))return'aqeedah';if(/فقه|صلاة|زكاة|صيام|حج|بيع|نكاح|ميراث/.test(text))return'fiqh';if(/تاريخ|خلافة|حضارة|دولة|عصر/.test(text))return'history';return'ethics'}
 function apply(){const cards=[...grid.querySelectorAll('.content-card')];let shown=0;cards.forEach(card=>{const cat=categoryFor(card.textContent);const ok=current==='all'||cat===current;card.hidden=!ok;if(ok)shown++});const sum=$('librarySummary');if(sum)sum.dataset.visible=shown.toLocaleString('ar-EG');}
 bar.addEventListener('click',e=>{const b=e.target.closest('[data-library-category]');if(!b)return;current=b.dataset.libraryCategory;bar.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));apply()});
 const observer=new MutationObserver(()=>apply());observer.observe(grid,{childList:true,subtree:false});apply();
}
function improveQandA(){
 const page=$('community');if(!page)return;
 const head=page.querySelector('.page-head p');if(head)head.textContent='اسأل عن مسألة شرعية، واكتب سؤالك بوضوح؛ تُراجع الأسئلة قبل نشر الإجابات، ولا تُعد الإجابات العامة بديلًا عن سؤال أهل الاختصاص في الحالات الخاصة.';
 const form=page.querySelector('.community-form');if(form)form.classList.add('community-form-refined');
 page.querySelectorAll('#publishedAnswers .content-card').forEach(c=>c.classList.add('answer-card-refined'));
}
function init(){renderHadithBooks();renderProphets();renderSeerah();setupLibrary();improveQandA();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();