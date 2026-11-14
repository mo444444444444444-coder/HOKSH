/* Noor Islam media portal: responsive in-page video browsing, no outbound watch links. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let active='الكل';
function render(){
 const host=$('mediaLibrary');if(!host)return;
 const videos=Array.isArray(window.NOOR_MEDIA)?window.NOOR_MEDIA:[];
 const q=($('mediaSearch')?.value||'').trim().toLowerCase();
 const topics=['الكل',...new Set(videos.map(v=>v.topic||'مواد عامة'))];
 const filters=$('mediaFilters');if(filters)filters.innerHTML=topics.map(t=>'<button type="button" class="media-filter '+(t===active?'active':'')+'" data-topic="'+esc(t)+'">'+esc(t)+'</button>').join('');
 const rows=videos.filter(v=>(active==='الكل'||v.topic===active)&&[v.title,v.topic,v.channel,v.note].join(' ').toLowerCase().includes(q));
 host.innerHTML=rows.map(v=>'<article class="content-card media-library-card"><small class="eyebrow">'+esc(v.topic||'مواد عامة')+'</small><h3>'+esc(v.title)+'</h3><div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/'+encodeURIComponent(v.id)+'?rel=0" title="'+esc(v.title)+'" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe></div><p>'+esc(v.note||'مادة مرئية مساعدة')+'</p><small class="ref">المصدر: '+esc(v.channel||'القناة الناشرة')+' · المشاهدة داخل صفحة نور الإسلام</small></article>').join('')||'<div class="empty-state">لا توجد فيديوهات مطابقة لهذا البحث. جرّب موضوعًا آخر.</div>';
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-topic]');if(!b)return;active=b.dataset.topic;render()});
document.addEventListener('DOMContentLoaded',()=>{render();$('mediaSearch')?.addEventListener('input',render)},{once:true});
if(document.readyState!=='loading'){render();$('mediaSearch')?.addEventListener('input',render)}
window.NoorMediaPortal={refresh:render};
})();