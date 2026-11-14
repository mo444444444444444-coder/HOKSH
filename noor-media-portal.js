/* بوابة المرئيات: تصنيف واضح وتغذية رأسية قابلة للتمرير، مع نسبة كل مادة لمصدرها. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
let active='الكل';
const categories=['الكل','قصص الأنبياء','السيرة النبوية','السنة والحديث','علوم شرعية'];
function categoryOf(v){
 if(v.category)return v.category;
 const t=String(v.topic||'');
 if(t.includes('عليه السلام')||t.includes('النبي')&&t!=='السيرة النبوية')return 'قصص الأنبياء';
 if(t.includes('السيرة'))return 'السيرة النبوية';
 if(t.includes('حديث')||t.includes('الحديث')||t.includes('الأربعين'))return 'السنة والحديث';
 return 'علوم شرعية';
}
function render(){
 const host=$('mediaLibrary');if(!host)return;
 const videos=Array.isArray(window.NOOR_MEDIA)?window.NOOR_MEDIA:[];
 const q=($('mediaSearch')?.value||'').trim().toLowerCase();
 const filters=$('mediaFilters');
 if(filters)filters.innerHTML=categories.map(t=>'<button type="button" class="media-filter '+(t===active?'active':'')+'" data-media-category="'+esc(t)+'">'+esc(t)+'</button>').join('');
 const rows=videos.filter(v=>(active==='الكل'||categoryOf(v)===active)&&[v.title,v.topic,v.channel,v.note].join(' ').toLowerCase().includes(q));
 const count=$('mediaCount');if(count)count.textContent='المواد المتاحة: '+rows.length;
 host.className='media-feed';
 host.innerHTML=rows.map((v,i)=>'<article class="media-feed-item" id="media-item-'+i+'"><div class="media-feed-meta"><span>'+esc(categoryOf(v))+'</span><small>مادة '+(i+1)+' من '+rows.length+'</small></div><h3>'+esc(v.title)+'</h3><div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/'+encodeURIComponent(v.id)+'?rel=0" title="'+esc(v.title)+'" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe></div><p>'+esc(v.note||'مادة مرئية مساعدة')+'</p><small class="ref">المصدر: '+esc(v.channel||'القناة الناشرة')+' · تُعرض داخل نور الإسلام مع حفظ نسبة المادة لصاحبها</small></article>').join('')||'<div class="empty-state">لا توجد مواد مطابقة لهذا البحث أو التصنيف. جرّب تصنيفًا آخر.</div>';
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-media-category]');if(!b)return;active=b.dataset.mediaCategory;render()});
document.addEventListener('DOMContentLoaded',()=>{$('mediaSearch')?.addEventListener('input',render);render()},{once:true});
if(document.readyState!=='loading'){$('mediaSearch')?.addEventListener('input',render);render()}
window.NoorMediaPortal={refresh:render};
})();