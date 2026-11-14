(()=>{'use strict';
const cfg=window.NOOR_SUPABASE_CONFIG||{},$=id=>document.getElementById(id);
const form=$('aiChatForm');if(!form)return;
const messages=$('aiMessages'),prompt=$('aiPrompt'),status=$('aiStatus'),send=$('aiSend');
let history=[],busy=false,lastSent=0;
function bubble(text,kind='assistant'){const el=document.createElement('div');el.className='ai-bubble ai-bubble-'+kind;el.textContent=text;messages.appendChild(el);messages.scrollTop=messages.scrollHeight;return el}
function setBusy(v){busy=v;send.disabled=v;prompt.disabled=v;status.textContent=v?'يفكر ويكتب الآن…':'جاهز للمحادثة'}
form.addEventListener('submit',async e=>{e.preventDefault();const text=prompt.value.trim();if(!text||busy)return;if(Date.now()-lastSent<1200){status.textContent='انتظر لحظة قبل إرسال سؤال آخر';return}lastSent=Date.now();if(!cfg.url||!cfg.anonKey){bubble('إعداد الاتصال بالخادم غير مكتمل.','error');return}
bubble(text,'user');history.push({role:'user',content:text});prompt.value='';setBusy(true);const waiting=bubble('جارٍ التفكير…');
try{const response=await fetch(cfg.url+'/functions/v1/noor-ai-chat',{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.anonKey,'Authorization':'Bearer '+cfg.anonKey},body:JSON.stringify({messages:history.slice(-16)})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'تعذر الاتصال بالمساعد ('+response.status+')');const answer=String(data.reply||'لم يصل رد.').slice(0,12000);waiting.remove();bubble(answer);history.push({role:'assistant',content:answer});if(history.length>20)history=history.slice(-20)}catch(err){waiting.remove();bubble(err.message||'حدث خطأ أثناء الاتصال.','error');history.pop()}finally{setBusy(false);prompt.focus()}
});
$('aiNewChat').addEventListener('click',()=>{history=[];messages.replaceChildren();bubble('بدأنا محادثة جديدة. اسألني في أي موضوع.');prompt.focus()});
prompt.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
})();