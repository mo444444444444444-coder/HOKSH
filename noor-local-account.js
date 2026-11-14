(()=>{'use strict';
const KEY='noor.local.google.email';
const $=id=>document.getElementById(id);
const valid=v=>/^[^\\s@]+@gmail\\.com$/i.test(String(v||'').trim());
function draw(){
 const email=localStorage.getItem(KEY),form=$('localVisitorAuth'),saved=$('localVisitorAccount');
 if(!form||!saved)return;
 if(email){form.classList.add('hidden');saved.classList.remove('hidden');$('localVisitorIdentity').textContent='الحساب المحفوظ على هذا الجهاز: '+email;}
 else{form.classList.remove('hidden');saved.classList.add('hidden');}
}
function init(){
 const form=$('localAccountForm');if(!form)return;
 const input=$('localGoogleEmail');
 form.addEventListener('submit',e=>{e.preventDefault();const email=input.value.trim().toLowerCase();if(!valid(email)){ $('localAccountStatus').textContent='اكتب بريد Gmail صحيحًا ينتهي بـ gmail.com.';return;}localStorage.setItem(KEY,email);$('localAccountStatus').textContent='تم حفظ البريد على هذا الجهاز.';draw();});
 $('localAccountChange')?.addEventListener('click',()=>{const v=localStorage.getItem(KEY)||'';localStorage.removeItem(KEY);input.value=v;draw();input.focus();});
 $('localAccountForget')?.addEventListener('click',()=>{localStorage.removeItem(KEY);input.value='';$('localAccountStatus').textContent='تم نسيان البريد المحفوظ من هذا الجهاز.';draw();});
 draw();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();