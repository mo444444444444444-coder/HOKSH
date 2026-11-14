(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function norm(s){return String(s||'').replace(/[ًٌٍَُِّْـٰ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').trim();}
function reader(){let el=$('prophetReader');if(!el){const page=$('prophets');if(!page)return null;el=document.createElement('article');el.id='prophetReader';el.className='panel hidden';const grid=$('prophetsGrid');grid?.after(el);}return el;}
async function open(name){
 const all=window.NOOR_LESSONS||{}, keys=Object.keys(all);let key=keys.find(k=>k===name)||keys.find(k=>norm(k)===norm(name));
 let item=key?all[key]:null;
 if(!item){const row=(window.NOOR_KNOWLEDGE?.prophets||[]).find(x=>norm(x[0])===norm(name));if(row)item={intro:row[1],sections:[['القصة والدعوة',row[2]]],evidenceRefs:[],sources:['القرآن الكريم في المواضع المشار إليها ضمن المادة']};}
 const host=reader();if(!host)return;
 if(!item){host.classList.remove('hidden');host.innerHTML='<p>المادة التفصيلية لهذا النبي غير متاحة حاليًا. لم نعرض صفحة فارغة.</p><button class="btn btn-outline" id="closeProphetReader">إغلاق</button>';return;}
 const sections=(item.sections||[]).map(s=>Array.isArray(s)?'<section class="prophet-story-section"><h3>'+esc(s[0])+'</h3><p>'+esc(s[1])+'</p></section>':'<p>'+esc(s)+'</p>').join('');
 const media=Array.isArray(window.NOOR_MEDIA)?window.NOOR_MEDIA:[];
 const video=media.find(v=>norm(v.topic)===norm(key||name)||((norm(key||name)==='محمد ﷺ'||norm(key||name)==='محمد')&&norm(v.topic).includes('السيرة النبوية')));
 const pIndex=(window.NOOR_KNOWLEDGE?.prophets||[]).findIndex(x=>norm(x[0])===norm(key||name));const pPhotos=window.NOOR_HERITAGE_PHOTOS||[];const pPhoto=pPhotos.length?pPhotos[Math.max(0,pIndex)%pPhotos.length]:'';
 const videoBlock=video?'<section class="prophet-video-block"><h3>مادة مرئية مرتبطة بالقصة</h3><article class="media-inline"><h4>'+esc(video.title)+'</h4><div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/'+encodeURIComponent(video.id)+'?rel=0" title="'+esc(video.title)+'" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe></div><small class="ref">المصدر: '+esc(video.channel)+' — '+esc(video.note)+'</small></article></section>':'<div class="notice">لا يوجد حاليًا فيديو موثّق مخصص لهذه القصة. لن نضع رابطًا عشوائيًا أو ننسب فيديو غير متعلق بالنبي.</div>';
 host.classList.remove('hidden');host.innerHTML='<button class="btn btn-outline" id="closeProphetReader">إغلاق القصة</button>'+(pPhoto?'<div class="prophet-reader-art"><img src="'+pPhoto+'" alt="معلم من العمارة الإسلامية لصفحة '+esc(key||name)+'" loading="lazy"><span>سيرة نبي من أنبياء الله</span></div>':'')+'<h2>'+esc(key||name)+'</h2><p class="prophet-story-intro">'+esc(item.intro||'')+'</p>'+(item.points?.length?'<h3>محاور القصة</h3><ul>'+item.points.map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul>':'')+sections+videoBlock+'<div id="prophetEvidence"></div>'+(item.sources?.length?'<h3>المراجع</h3><ul>'+item.sources.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':'')+'<p class="source-note">نعرض ما ثبت في الوحي، ونتجنب الجزم بالتفاصيل التي لا دليل معتبر عليها.</p>';
 $('closeProphetReader').onclick=()=>host.classList.add('hidden');
 host.scrollIntoView({behavior:'smooth',block:'start'});
 const refs=item.evidenceRefs||[];const box=$('prophetEvidence');
 if(refs.length){box.innerHTML='<h3>الآيات القرآنية ذات الصلة</h3><div class="loading">جارٍ تحميل نصوص الآيات…</div>';try{const rows=await Promise.all(refs.map(async ref=>{const r=await fetch('https://api.alquran.cloud/v1/ayah/'+encodeURIComponent(ref));if(!r.ok)throw Error();const j=await r.json();if(j.code!==200||!j.data)throw Error();return j.data;}));box.innerHTML=rows.map(v=>'<article class="evidence-verse"><p class="arabic" dir="rtl">'+esc(v.text)+'</p><small class="ref">'+esc(v.surah.name)+' — الآية '+v.numberInSurah+'</small></article>').join('');}catch(e){box.innerHTML='<p class="notice">تعذر تحميل نص الآيات الآن. أعد المحاولة عند توفر الاتصال.</p>';}}
}
document.addEventListener('click',e=>{const b=e.target.closest('#prophetsGrid [data-noor-lesson],#prophetsGrid [data-prophet-topic]');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();open(b.dataset.noorLesson||b.dataset.prophetTopic);},true);
})();