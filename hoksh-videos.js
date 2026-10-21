/* HOKSH Video Classroom: authenticated video posts and public student feed.
   Requires the video schema section in supabase-schema.sql to be applied in Supabase. */
(() => {
 'use strict';
 const $=(s,r=document)=>r.querySelector(s);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const account=window.HOKSHAccount;
 if(!account)return;
 let client=null,user=null,profile=null,posts=[];
 const style=document.createElement('style');
 style.textContent=`
 #hoksh-video-room{max-width:1150px;margin:22px auto;color:var(--ink,#152238);font-family:inherit}
 .hv-head{border-radius:20px;padding:20px;background:linear-gradient(125deg,#102b47,#145b69);color:#fff;display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap}
 .hv-head h2{margin:0;font-size:22px}.hv-head p{margin:6px 0 0;line-height:1.8;font-size:13px;color:#d5e9f4}
 .hv-btn{border:0;border-radius:11px;background:#12b9a5;color:#042d35;padding:11px 15px;font:inherit;font-weight:800;cursor:pointer}
 .hv-btn.secondary{background:#e8f1fa;color:#16416a;border:1px solid #d0dfed}
 .hv-feed{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,310px),1fr));gap:14px;margin-top:14px}
 .hv-card{background:#fff;border:1px solid #dce6ee;border-radius:17px;overflow:hidden;box-shadow:0 8px 24px #132f4210;color:#17283b}
 .hv-card video{width:100%;max-height:420px;background:#071421;display:block;aspect-ratio:16/9;object-fit:contain}
 .hv-copy{padding:14px}.hv-copy h3{margin:0 0 7px;font-size:16px}.hv-copy p{margin:0;white-space:pre-wrap;line-height:1.8;font-size:13px;color:#617286;overflow-wrap:anywhere}
 .hv-meta{font-size:11px;color:#8091a2;margin-top:10px;display:flex;justify-content:space-between;gap:8px}
 .hv-empty{background:#fff;border:1px dashed #b9cbd9;border-radius:16px;padding:25px;text-align:center;line-height:1.9;color:#607487;grid-column:1/-1}
 #hv-modal{position:fixed;inset:0;z-index:1300;background:#071321bb;display:none;align-items:center;justify-content:center;padding:12px}
 #hv-modal.open{display:flex}.hv-dialog{width:min(580px,100%);max-height:94dvh;overflow:auto;background:#fff;color:#152238;border-radius:20px;padding:20px}
 .hv-dialog h3{margin:0 0 14px}.hv-field{display:grid;gap:6px;margin:12px 0;font-size:13px}.hv-field input,.hv-field textarea{border:1px solid #ccd9e5;border-radius:10px;padding:11px;font:inherit;width:100%}.hv-field textarea{min-height:90px}
 .hv-small{font-size:11px;line-height:1.8;color:#617286}.hv-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
 @media(max-width:600px){.hv-head{padding:16px}.hv-head h2{font-size:19px}}
 `;
 document.head.appendChild(style);
 function isPublisher(){return !!user&&!!profile&&['owner','admin','teacher'].includes(profile.role)&&!profile.is_suspended}
 function mount(){
  const home=$('#home');if(!home||$('#hoksh-video-room'))return;
  const room=document.createElement('section');room.id='hoksh-video-room';room.innerHTML=`
   <header class="hv-head"><div><h2>🎬 فصول حوكش المرئية</h2><p>دروس وشروحات بالفيديو داخل المنصة — للطلاب والمدرسين في مكان واحد.</p></div><button class="hv-btn" id="hv-add" style="display:none">＋ نشر فيديو</button></header>
   <div id="hv-feed" class="hv-feed"><div class="hv-empty">جارٍ تحميل الفيديوهات…</div></div>`;
  const platform=$('#hoksh-platform',home);if(platform)platform.insertAdjacentElement('afterend',room);else home.appendChild(room);
  $('#hv-add').onclick=openComposer;
 }
 function toast(t){if(typeof window.toast==='function')window.toast(t);else alert(t)}
 function modal(){
  let m=$('#hv-modal');if(m)return m;
  m=document.createElement('div');m.id='hv-modal';m.innerHTML='<section class="hv-dialog" role="dialog" aria-modal="true"><div style="display:flex;justify-content:space-between;align-items:center"><h3>نشر درس فيديو</h3><button id="hv-close" class="hv-btn secondary">إغلاق ✕</button></div><form id="hv-form"><label class="hv-field">عنوان الدرس<input id="hv-title" maxlength="140" required placeholder="مثلاً: شرح الدرس الأول"></label><label class="hv-field">وصف مختصر<textarea id="hv-description" maxlength="1200" placeholder="اكتب تفاصيل الدرس أو اسم المادة والصف"></textarea></label><label class="hv-field">ملف الفيديو<input id="hv-file" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" required></label><p class="hv-small">الرفع يحتاج اتصال إنترنت. الحد المبدئي 200 ميجابايت لكل فيديو؛ التخزين المجاني محدود حسب خطة Supabase. لا ترفع محتوى لا تملك حق نشره.</p><div class="hv-actions"><button class="hv-btn" id="hv-submit" type="submit">رفع ونشر الفيديو</button></div><p class="hv-small" id="hv-status" aria-live="polite"></p></form></section>';
  document.body.appendChild(m);$('#hv-close',m).onclick=()=>m.classList.remove('open');m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')});
  $('#hv-form',m).onsubmit=uploadVideo;return m;
 }
 function openComposer(){if(!user){toast('سجّل الدخول أولاً لنشر الفيديو.');return}if(!isPublisher()){toast('النشر متاح لحسابات المدرسين أو الإدارة بعد منح الصلاحية.');return}modal().classList.add('open')}
 async function loadPosts(){
  const root=$('#hv-feed');if(!root)return;
  if(!client){root.innerHTML='<div class="hv-empty">خدمة الحسابات السحابية غير متصلة حالياً.</div>';return}
  const {data,error}=await client.from('video_posts').select('id,title,description,storage_path,created_at,user_id').eq('published',true).order('created_at',{ascending:false}).limit(60);
  if(error){root.innerHTML='<div class="hv-empty">لم تُفعّل قاعدة بيانات الفيديوهات بعد. يلزم تطبيق قسم الفيديوهات الموجود في ملف supabase-schema.sql داخل Supabase. <br>'+esc(error.message)+'</div>';return}
  posts=data||[];
  if(!posts.length){root.innerHTML='<div class="hv-empty">لسه مفيش فيديوهات منشورة. عند إضافة أول درس هيظهر هنا للطلاب.</div>';return}
  root.innerHTML=posts.map(p=>'<article class="hv-card" data-video-card="'+esc(p.id)+'"><video controls playsinline preload="metadata" aria-label="'+esc(p.title)+'"></video><div class="hv-copy"><h3>'+esc(p.title)+'</h3><p>'+esc(p.description||'')+'</p><div class="hv-meta"><span>'+esc(new Date(p.created_at).toLocaleDateString('ar-EG'))+'</span>'+(isPublisher()?'<button class="hv-btn secondary" data-hv-delete="'+esc(p.id)+'">حذف</button>':'')+'</div></div></article>').join('');
  for(const p of posts){const {data,error}=await client.storage.from('hoksh-videos').createSignedUrl(p.storage_path,3600);const v=$('[data-video-card="'+p.id+'"] video');if(v&&data?.signedUrl)v.src=data.signedUrl;else if(v)v.replaceWith(Object.assign(document.createElement('div'),{className:'hv-empty',textContent:'تعذر تشغيل هذا الفيديو حالياً.'}));}
  root.querySelectorAll('[data-hv-delete]').forEach(b=>b.onclick=()=>deletePost(b.dataset.hvDelete));
 }
 async function uploadVideo(e){
  e.preventDefault();if(!client||!user||!isPublisher())return;
  const file=$('#hv-file').files?.[0],title=$('#hv-title').value.trim(),description=$('#hv-description').value.trim(),status=$('#hv-status'),button=$('#hv-submit');
  if(!file||!title)return;
  if(!/^video\/(mp4|webm|quicktime|x-m4v)$/.test(file.type)){toast('اختر فيديو MP4 أو WebM أو MOV.');return}
  if(file.size>200*1024*1024){toast('حجم الفيديو أكبر من الحد المبدئي 200 ميجابايت.');return}
  button.disabled=true;status.textContent='جارٍ رفع الفيديو… لا تغلق الصفحة حتى يكتمل الرفع.';
  const ext=({ 'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov','video/x-m4v':'m4v'})[file.type]||'mp4';
  const path=user.id+'/'+crypto.randomUUID()+'.'+ext;
  try{
   const up=await client.storage.from('hoksh-videos').upload(path,file,{contentType:file.type,upsert:false});
   if(up.error)throw up.error;
   const ins=await client.from('video_posts').insert({user_id:user.id,title,description,storage_path:path,published:true});
   if(ins.error){await client.storage.from('hoksh-videos').remove([path]);throw ins.error}
   status.textContent='تم النشر.';$('#hv-modal').classList.remove('open');e.target.reset();toast('تم نشر الفيديو داخل حوكش.');await loadPosts();
  }catch(err){status.textContent='فشل الرفع: '+(err.message||'خطأ غير معروف');}
  finally{button.disabled=false}
 }
 async function deletePost(id){
  if(!isPublisher()||!confirm('هل تريد حذف هذا الفيديو نهائياً؟'))return;
  const p=posts.find(x=>x.id===id);if(!p)return;
  const del=await client.from('video_posts').delete().eq('id',id);
  if(del.error){toast('تعذر حذف الفيديو: '+del.error.message);return}
  await client.storage.from('hoksh-videos').remove([p.storage_path]);toast('تم حذف الفيديو.');loadPosts();
 }
 async function refresh(){
  client=account.getClient();user=account.getUser();profile=null;
  if(client&&user){const r=await client.from('profiles').select('id,display_name,role,is_suspended').eq('id',user.id).maybeSingle();profile=r.data||null}
  const b=$('#hv-add');if(b)b.style.display=isPublisher()?'inline-block':'none';
  await loadPosts();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mount();refresh()});else{mount();refresh()}
 if(client)client.auth.onAuthStateChange(()=>setTimeout(refresh,0));
 window.HOKSHVideos={refresh};
})();