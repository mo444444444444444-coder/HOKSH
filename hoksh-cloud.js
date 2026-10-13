/* HOKSH cloud storage + owner/admin panel.
   Requires a configured Supabase project, the supplied SQL schema, and a private "hoksh-files" bucket. */
(function(){
  'use strict';
  const byId=id=>document.getElementById(id);
  const account=window.HOKSHAccount;
  if(!account) return;
  const client=account.getClient();
  if(!client){
    // Still show a clear status/action without pretending the cloud backend is connected.
  }
  let signedUser=null, profile=null, cloudFileId=null, cloudOwnerId=null, panel=null, currentTab='files';
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>{n=Number(n||0);return n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(2)+' MB'};
  const msg=t=>{if(typeof window.toast==='function')window.toast(t);else alert(t)};
  function injectStyle(){
    if(byId('hokshCloudStyle'))return;
    const st=document.createElement('style');st.id='hokshCloudStyle';st.textContent=`
      #hokshCloudBtn,#hokshAdminBtn{height:38px;border:1px solid #cbdcf4;border-radius:11px;background:#eff6ff;color:#1d4ed8;padding:0 11px;font-weight:800}
      #hokshAdminBtn{background:#d1fae5;color:#065f46;border-color:#a7f3d0;display:none}
      #hokshCloudPanel{position:fixed;inset:0;z-index:1200;background:#071321b8;display:none;align-items:center;justify-content:center;padding:14px}
      #hokshCloudPanel.open{display:flex}
      .hc-card{width:min(1050px,100%);max-height:92dvh;overflow:auto;background:#fff;color:#132238;border-radius:22px;box-shadow:0 28px 100px #0007}
      .hc-head{position:sticky;top:0;z-index:3;background:#fff;border-bottom:1px solid #dbe5f2;padding:16px 18px;display:flex;align-items:center;gap:10px}
      .hc-head h2{font-size:18px;margin:0;flex:1}.hc-close{border:0;border-radius:10px;background:#edf3fb;padding:8px 12px;color:#1d4ed8}
      .hc-body{padding:16px 18px}.hc-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:15px}.hc-tab{border:1px solid #d7e2ef;background:#f8fbff;border-radius:10px;padding:9px 13px;color:#334155}.hc-tab.active{background:#dbeafe;color:#1d4ed8;border-color:#93c5fd;font-weight:900}
      .hc-note{background:#eff6ff;border:1px solid #dbeafe;color:#36516e;padding:12px;border-radius:12px;font-size:12px;line-height:1.8;margin-bottom:12px}
      .hc-actions{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}.hc-btn{border:1px solid #cbdcf4;background:#eff6ff;color:#1d4ed8;border-radius:10px;padding:9px 12px;font-weight:800}.hc-btn.good{background:#d1fae5;color:#065f46;border-color:#a7f3d0}.hc-btn.warn{background:#fff1f2;color:#be123c;border-color:#fecdd3}.hc-tablewrap{overflow:auto;border:1px solid #e2e8f0;border-radius:12px}.hc-table{border-collapse:collapse;width:100%;font-size:12px;min-width:600px}.hc-table th,.hc-table td{padding:10px;border-bottom:1px solid #edf2f7;text-align:right;vertical-align:middle}.hc-table th{background:#f8fafc;color:#475569}.hc-table tr:last-child td{border-bottom:0}.hc-field{display:block;margin:10px 0}.hc-field span{display:block;font-size:12px;color:#64748b;margin-bottom:5px}.hc-field input,.hc-field textarea,.hc-field select{width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font:inherit}.hc-field textarea{min-height:95px}.hc-empty{padding:20px;text-align:center;color:#64748b;font-size:13px}
      @media(max-width:600px){#hokshCloudBtn{font-size:12px;padding:0 8px}#hokshCloudPanel{padding:6px}.hc-card{max-height:96dvh;border-radius:16px}.hc-head,.hc-body{padding:12px}.hc-head h2{font-size:16px}}
    `;document.head.appendChild(st);
  }
  function makePanel(){
    if(panel)return panel;
    injectStyle();
    const b=document.createElement('div');b.id='hokshCloudPanel';b.setAttribute('role','dialog');b.setAttribute('aria-modal','true');
    b.innerHTML='<section class="hc-card"><header class="hc-head"><h2 id="hcTitle">ملفاتي السحابية</h2><button class="hc-close" id="hcClose">إغلاق ✕</button></header><div class="hc-body"><div class="hc-tabs" id="hcTabs"></div><div id="hcContent"></div></div></section>';
    document.body.appendChild(b);panel=b;
    byId('hcClose').onclick=closePanel;
    b.addEventListener('click',e=>{if(e.target===b)closePanel()});
    return panel;
  }
  function openPanel(tab='files'){
    makePanel();currentTab=tab;panel.classList.add('open');renderPanel();
  }
  function closePanel(){panel?.classList.remove('open')}
  function isAdmin(){return profile&&['admin','owner'].includes(profile.role)&&!profile.is_suspended}
  function renderTabs(){
    const tabs=[['files','ملفاتي السحابية']];
    if(isAdmin())tabs.push(['users','إدارة الحسابات'],['tickets','الدعم'],['settings','الإعدادات']);
    byId('hcTabs').innerHTML=tabs.map(([id,label])=>'<button class="hc-tab '+(id===currentTab?'active':'')+'" data-hctab="'+id+'">'+label+'</button>').join('');
    byId('hcTabs').querySelectorAll('[data-hctab]').forEach(x=>x.onclick=()=>{currentTab=x.dataset.hctab;renderPanel()});
    byId('hcTitle').textContent=isAdmin()&&currentTab!=='files'?'لوحة المدير الرئيسي':'ملفاتي السحابية';
  }
  async function renderPanel(){
    renderTabs();const root=byId('hcContent');
    if(!client||!signedUser){root.innerHTML='<div class="hc-note">يلزم إعداد Supabase وتسجيل الدخول بحساب مؤكد حتى تعمل الخدمات السحابية. هذه اللوحة لا تحفظ بيانات بنفسها.</div>';return}
    if(currentTab==='users'&&isAdmin())return renderUsers(root);
    if(currentTab==='tickets'&&isAdmin())return renderTickets(root);
    if(currentTab==='settings'&&isAdmin())return renderSettings(root);
    return renderFiles(root);
  }
  async function renderFiles(root){
    root.innerHTML='<div class="hc-note">الملفات المحفوظة هنا مرتبطة بحسابك. الملفات التي لم ترفعها بعد تظل على هذا الجهاز فقط.</div><div class="hc-actions"><button class="hc-btn good" id="hcSaveCurrent">☁️ حفظ المستند الحالي سحابياً</button><button class="hc-btn" id="hcReloadFiles">تحديث القائمة</button><button class="hc-btn" id="hcSupport">✉ إرسال طلب دعم</button></div><div id="hcFileList" class="hc-empty">جارٍ تحميل الملفات…</div>';
    byId('hcSaveCurrent').onclick=()=>saveCurrent();
    byId('hcReloadFiles').onclick=()=>renderFiles(root);\n    byId('hcSupport').onclick=submitSupport;
    const {data,error}=await client.from('user_files').select('id,user_id,file_name,storage_path,mime_type,file_size,last_page,last_opened_at,created_at').order('last_opened_at',{ascending:false}).limit(isAdmin()?100:50);
    if(error){byId('hcFileList').innerHTML='<div class="hc-empty">تعذر تحميل القائمة: '+safe(error.message)+'<br>تأكد من تشغيل ملف supabase-schema.sql وإنشاء bucket خاص باسم hoksh-files.</div>';return}
    if(!data?.length){byId('hcFileList').innerHTML='<div class="hc-empty">لا توجد ملفات سحابية حتى الآن. افتح ملفاً ثم اضغط «حفظ المستند الحالي سحابياً».</div>';return}
    byId('hcFileList').className='hc-tablewrap';
    byId('hcFileList').innerHTML='<table class="hc-table"><thead><tr><th>اسم الملف</th><th>الحجم</th><th>آخر تحديث</th><th>إجراء</th></tr></thead><tbody>'+data.map(f=>'<tr><td>'+safe(f.file_name)+'</td><td>'+fmt(f.file_size)+'</td><td>'+safe(new Date(f.updated_at||f.created_at).toLocaleString('ar-EG'))+'</td><td><button class="hc-btn" data-loadfile="'+f.id+'">فتح</button> <button class="hc-btn warn" data-delfile="'+f.id+'">حذف</button></td></tr>').join('')+'</tbody></table>';
    byId('hcFileList').querySelectorAll('[data-loadfile]').forEach(btn=>btn.onclick=()=>loadCloudFile(data.find(f=>f.id===btn.dataset.loadfile)));
    byId('hcFileList').querySelectorAll('[data-delfile]').forEach(btn=>btn.onclick=()=>deleteCloudFile(data.find(f=>f.id===btn.dataset.delfile)));
  }
  async function saveCurrent(){
    if(!client||!signedUser){msg('سجّل الدخول بعد تفعيل Supabase أولاً.');return}
    try{
      const now=Date.now(),name=(typeof docName==='string'&&docName.trim()?docName.trim():'مستند حوكش');
      let mime='application/json',blob,path,extra={};
      if(typeof pdfBytes!=='undefined'&&pdfBytes){
        mime='application/pdf';blob=new Blob([pdfBytes],{type:mime});
      }else{
        const data={format:'hoksh-whiteboard-v1',docName:name,pages:pages.map(p=>({w:p.w,h:p.h,strokes:p.strokes||[],image:p.image||null,infinite:!!p.infinite})),activePage,zoom,pageMode,updatedAt:new Date().toISOString()};
        blob=new Blob([JSON.stringify(data)],{type:mime});
      }
      if(cloudFileId && cloudOwnerId===signedUser.id){
        const {data:old}=await client.from('user_files').select('id,user_id,storage_path').eq('id',cloudFileId).maybeSingle();
        if(old&&old.user_id===signedUser.id)path=old.storage_path;
      } else { cloudFileId=null; }
      if(!path)path=signedUser.id+'/'+now+'-'+name.replace(/[^\\p{L}\\p{N}._-]+/gu,'_').slice(0,90);
      if(!path)path=signedUser.id+'/'+now+'-'+name.replace(/[^\p{L}\p{N}._-]+/gu,'_').slice(0,90);
      const {error:upErr}=await client.storage.from('hoksh-files').upload(path,blob,{upsert:true,contentType:mime});
      if(upErr)throw upErr;
      const {data:row,error:dbErr}=await client.from('user_files').upsert({...(cloudFileId?{id:cloudFileId}:{}),user_id:signedUser.id,file_name:name,storage_path:path,mime_type:mime,file_size:blob.size,last_page:(typeof activePage==='number'?activePage+1:1),last_opened_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'id'}).select().single();
      if(dbErr)throw dbErr;
      cloudFileId=row.id;cloudOwnerId=signedUser.id;
      await client.from('user_annotations').delete().eq('file_id',row.id);
      if(mime==='application/pdf'){
        const rows=(pages||[]).map((p,i)=>({user_id:signedUser.id,file_id:row.id,page_number:i+1,annotation_data:{strokes:p.strokes||[],w:p.w,h:p.h}}));
        if(rows.length){const {error}=await client.from('user_annotations').insert(rows);if(error)throw error}
      }
      msg('تم حفظ المستند سحابياً في حسابك.');
      if(panel?.classList.contains('open'))renderPanel();
    }catch(e){console.error('HOKSH cloud save failed',e);msg('فشل الحفظ السحابي: '+(e?.message||'تحقق من إعداد Supabase والـ bucket والسياسات.'))}
  }
  async function loadCloudFile(f){
    if(!f||!client)return;
    try{
      const {data:obj,error}=await client.storage.from('hoksh-files').download(f.storage_path);if(error)throw error;
      cloudFileId=f.id;cloudOwnerId=f.user_id;
      if(f.mime_type==='application/pdf'){
        const buf=await obj.arrayBuffer();
        await openPdfBytes(new Uint8Array(buf),f.file_name,f.file_size);
        const {data:anns,error:annErr}=await client.from('user_annotations').select('page_number,annotation_data').eq('file_id',f.id).order('page_number');
        if(annErr)throw annErr;
        for(const a of (anns||[])){if(pages[a.page_number-1])pages[a.page_number-1].strokes=a.annotation_data?.strokes||[]}
        if(typeof renderPages==='function')renderPages();if(typeof saveState==='function')saveState();
      }else{
        const data=JSON.parse(await obj.text());
        if(data.format!=='hoksh-whiteboard-v1')throw new Error('نوع ملف غير مدعوم');
        docName=data.docName||f.file_name;pages=data.pages||[];activePage=data.activePage||0;zoom=data.zoom||1;pageMode=data.pageMode||'vertical';
        if(typeof pdfBytes!=='undefined')pdfBytes=null;
        document.body.classList.remove('focusPdf');byId('home').style.display='none';byId('workspace').classList.add('active');
        byId('renameFile').textContent=docName;renderPages();saveState();
      }
      await client.from('user_files').update({last_opened_at:new Date().toISOString()}).eq('id',f.id);
      closePanel();msg('تم فتح الملف السحابي.');
    }catch(e){console.error('HOKSH cloud load failed',e);msg('تعذر فتح الملف: '+(e?.message||'خطأ غير معروف'))}
  }
  async function deleteCloudFile(f){
    if(!f||!confirm('حذف الملف السحابي «'+f.file_name+'» نهائياً؟'))return;
    try{
      const {error}=await client.storage.from('hoksh-files').remove([f.storage_path]);if(error)throw error;
      const {error:dbError}=await client.from('user_files').delete().eq('id',f.id);if(dbError)throw dbError;
      if(cloudFileId===f.id){cloudFileId=null;cloudOwnerId=null;}
      msg('تم حذف الملف السحابي.');renderPanel();
    }catch(e){msg('تعذر حذف الملف: '+(e?.message||''))}
  }
  async function renderUsers(root){
    root.innerHTML='<div class="hc-note">صلاحيات المدير محمية بقاعدة البيانات. تغيير الأدوار متاح للمالك الرئيسي فقط؛ المدير يستطيع تعليق الحسابات وإعادتها.</div><div id="hcUsers" class="hc-empty">جارٍ تحميل الحسابات…</div>';
    const {data,error}=await client.from('profiles').select('id,display_name,role,is_suspended,created_at').order('created_at',{ascending:false}).limit(200);
    if(error){byId('hcUsers').textContent='تعذر جلب الحسابات: '+error.message;return}
    byId('hcUsers').className='hc-tablewrap';
    byId('hcUsers').innerHTML='<table class="hc-table"><thead><tr><th>الاسم</th><th>معرّف الحساب</th><th>الدور</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>'+data.map(u=>{ 
      let actions='المالك الرئيسي';
      if(u.role!=='owner' && u.id!==signedUser.id){
        actions='<button class="hc-btn '+(u.is_suspended?'good':'warn')+'" data-suspend="'+u.id+'" data-value="'+(!u.is_suspended)+'">'+(u.is_suspended?'إعادة تفعيل':'تعليق')+'</button>';
        if(profile.role==='owner') actions+=' <select data-role="'+u.id+'" aria-label="دور المستخدم"><option value="user" '+(u.role==='user'?'selected':'')+'>مستخدم</option><option value="admin" '+(u.role==='admin'?'selected':'')+'>مدير</option></select>';
      } else if(u.id===signedUser.id) actions='حسابك';
      return '<tr><td>'+safe(u.display_name||'بدون اسم')+'</td><td style="direction:ltr;text-align:left">'+safe(u.id.slice(0,8))+'…</td><td>'+safe(u.role)+'</td><td>'+(u.is_suspended?'موقوف':'نشط')+'</td><td>'+actions+'</td></tr>';
    }).join('')+'</tbody></table>';
    byId('hcUsers').querySelectorAll('[data-suspend]').forEach(btn=>btn.onclick=async()=>{const {error}=await client.rpc('hoksh_admin_set_suspended',{target_user_id:btn.dataset.suspend,suspended:btn.dataset.value==='true'});if(error)msg('تعذر تغيير حالة الحساب: '+error.message);else{msg('تم تحديث حالة الحساب.');renderPanel()}});
    byId('hcUsers').querySelectorAll('[data-role]').forEach(sel=>sel.onchange=async()=>{if(!confirm('تأكيد تغيير دور هذا الحساب؟')){renderPanel();return}const {error}=await client.rpc('hoksh_admin_set_role',{target_user_id:sel.dataset.role,new_role:sel.value});if(error)msg('تعذر تغيير الدور: '+error.message);else{msg('تم تحديث الدور.');renderPanel()}});
  }
  async function renderTickets(root){
    root.innerHTML='<div class="hc-note">تظهر هنا رسائل الدعم المرسلة من المستخدمين.</div><div id="hcTickets" class="hc-empty">جارٍ تحميل الطلبات…</div>';
    const {data,error}=await client.from('support_tickets').select('id,user_id,subject,message,status,admin_reply,created_at').order('created_at',{ascending:false}).limit(100);
    if(error){byId('hcTickets').textContent='تعذر جلب الطلبات: '+error.message;return}
    if(!data?.length){byId('hcTickets').innerHTML='<div class="hc-empty">لا توجد طلبات دعم حالياً.</div>';return}
    byId('hcTickets').innerHTML=data.map(t=>'<article style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:10px"><b>'+safe(t.subject)+'</b><p>'+safe(t.message)+'</p><small>حالة الطلب: '+safe(t.status)+' · '+safe(new Date(t.created_at).toLocaleString('ar-EG'))+'</small><label class="hc-field"><span>رد المدير</span><textarea id="reply-'+t.id+'">'+safe(t.admin_reply||'')+'</textarea></label><div class="hc-actions"><select id="status-'+t.id+'" class="hc-btn"><option value="open" '+(t.status==='open'?'selected':'')+'>مفتوح</option><option value="in_progress" '+(t.status==='in_progress'?'selected':'')+'>قيد المتابعة</option><option value="closed" '+(t.status==='closed'?'selected':'')+'>مغلق</option></select><button class="hc-btn good" data-ticket="'+t.id+'">حفظ الرد والحالة</button></div></article>').join('');
    byId('hcTickets').querySelectorAll('[data-ticket]').forEach(btn=>btn.onclick=async()=>{const id=btn.dataset.ticket;const {error}=await client.rpc('hoksh_admin_update_ticket',{ticket_id:id,new_status:byId('status-'+id).value,reply_text:byId('reply-'+id).value});if(error)msg('تعذر حفظ الرد: '+error.message);else msg('تم حفظ الرد.');});
  }
  async function renderSettings(root){
    const {data,error}=await client.from('app_settings').select('key,value').eq('key','announcement').maybeSingle();
    const announcement=data?.value?.text||'';
    root.innerHTML='<div class="hc-note">إعداد عام محفوظ في قاعدة البيانات ويمكن عرضه لاحقاً للمستخدمين داخل التطبيق.</div>'+(error?'<div class="hc-note">تنبيه: '+safe(error.message)+'</div>':'')+'<label class="hc-field"><span>رسالة عامة داخل حوكش</span><textarea id="hcAnnouncement" placeholder="اكتب رسالة الصيانة أو إعلاناً عاماً">'+safe(announcement)+'</textarea></label><button class="hc-btn good" id="hcSaveSetting">حفظ الإعداد</button>';
    byId('hcSaveSetting').onclick=async()=>{const value={text:byId('hcAnnouncement').value.trim()};const {error}=await client.from('app_settings').upsert({key:'announcement',value,updated_by:signedUser.id,updated_at:new Date().toISOString()});if(error)msg('تعذر حفظ الإعداد: '+error.message);else msg('تم حفظ الإعداد في قاعدة البيانات.')};
  }
  async function submitSupport(){
    if(!client||!signedUser){msg('سجّل الدخول أولاً.');return}
    const subject=prompt('عنوان طلب الدعم:','مساعدة في ملف');if(!subject?.trim())return;
    const messageText=prompt('اشرح المشكلة أو الطلب:','');if(!messageText?.trim())return;
    const {error}=await client.from('support_tickets').insert({user_id:signedUser.id,subject:subject.trim(),message:messageText.trim()});
    msg(error?'تعذر إرسال طلب الدعم: '+error.message:'تم إرسال طلب الدعم.');
  }
  async function refreshUser(user){
    signedUser=user||null;profile=null;cloudFileId=null;cloudOwnerId=null;
    const adminBtn=byId('hokshAdminBtn');if(adminBtn)adminBtn.style.display='none';
    const cloudBtn=byId('hokshCloudBtn');if(cloudBtn)cloudBtn.style.display=user?'inline-block':'none';
    if(user&&client){
      try{const {data,error}=await client.from('profiles').select('id,display_name,role,is_suspended').eq('id',user.id).maybeSingle();if(!error)profile=data}
      catch(e){console.warn('HOKSH profile fetch',e)}
    }
    if(adminBtn&&isAdmin())adminBtn.style.display='inline-block';
    if(profile?.is_suspended){
      msg('هذا الحساب موقوف من إدارة حوكش. تواصل مع الدعم.');
      try{await client.auth.signOut()}catch(e){}
    }
    if(panel?.classList.contains('open'))renderPanel();
  }
  function addButtons(){
    const top=document.querySelector('.topBtns');
    if(top&&!byId('hokshCloudBtn')){
      const cloud=document.createElement('button');cloud.id='hokshCloudBtn';cloud.type='button';cloud.textContent='☁️ السحابة';cloud.style.display='none';cloud.onclick=()=>openPanel('files');top.insertBefore(cloud,top.firstChild);
    }
    const logged=byId('accountLoggedActions');
    if(logged&&!byId('hokshAdminBtn')){
      const admin=document.createElement('button');admin.id='hokshAdminBtn';admin.type='button';admin.textContent='لوحة المدير الرئيسي';admin.style.margin='8px 0';admin.style.width='100%';admin.onclick=()=>openPanel('users');logged.appendChild(admin);
    }
    const support=byId('supportBtn');if(support&&!support.dataset.cloudSupport){support.dataset.cloudSupport='1';support.addEventListener('click',()=>setTimeout(()=>{const existing=byId('supportSubmitCloud');if(!existing){const b=document.createElement('button');b.id='supportSubmitCloud';b.className='btn primary';b.textContent='إرسال طلب دعم إلى حسابي';b.onclick=submitSupport;const modal=byId('supportModal');(modal||document.body).appendChild(b)}},0))}
    const homeSupport=byId('homeSupportBtn');if(homeSupport&&!homeSupport.dataset.cloudSupport){homeSupport.dataset.cloudSupport='1';homeSupport.dataset.cloudSupport='1';homeSupport.addEventListener('click',()=>setTimeout(()=>{const existing=byId('supportSubmitCloud');if(!existing){const b=document.createElement('button');b.id='supportSubmitCloud';b.className='btn primary';b.textContent='إرسال طلب دعم إلى حسابي';b.onclick=submitSupport;(byId('supportModal')||document.body).appendChild(b)}},0))}
  }
  injectStyle();addButtons();
  document.addEventListener('click',e=>{if(e.target?.id==='accountSignOut')setTimeout(()=>refreshUser(null),50)});
  if(client){
    client.auth.getSession().then(({data})=>refreshUser(data?.session?.user||null));
    client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>refreshUser(session?.user||null),0)});
  }
  window.HOKSHCloud={openPanel,saveCurrent,submitSupport,refresh:()=>refreshUser(account.getUser())};
})();