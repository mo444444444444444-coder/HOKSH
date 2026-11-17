(()=>{'use strict';
const cfg=window.NOOR_SUPABASE_CONFIG||{},$=id=>document.getElementById(id);
const form=$('aiChatForm');if(!form)return;
const messages=$('aiMessages'),prompt=$('aiPrompt'),status=$('aiStatus'),send=$('aiSend'),newChat=$('aiNewChat');
let history=[],busy=false,lastSent=0;
function bubble(text,kind='assistant'){const el=document.createElement('div');el.className='ai-bubble ai-bubble-'+kind;el.textContent=text;messages.appendChild(el);messages.scrollTop=messages.scrollHeight;return el}
function setBusy(v){busy=v;send.disabled=v;prompt.disabled=v;status.textContent=v?'المساعد يجهّز الإجابة…':'متصل وجاهز للأسئلة العامة'}
function start(){history=[];messages.replaceChildren();bubble('أهلًا بك في مساعد نور الإسلام. اسألني في العلوم والتقنية والدراسة والكتابة والتاريخ والحياة، وكذلك المعرفة الإسلامية. سأوضح لك عندما لا أكون متأكدًا.');prompt.focus()}
form.addEventListener('submit',async e=>{e.preventDefault();const text=prompt.value.trim();if(!text||busy)return;if(Date.now()-lastSent<1000){status.textContent='انتظر لحظة ثم أرسل سؤالك';return}lastSent=Date.now();
if(!cfg.url||!cfg.anonKey){bubble('إعداد الاتصال الآمن بالخادم غير مكتمل.','error');return}
bubble(text,'user');history.push({role:'user',content:text});prompt.value='';setBusy(true);const waiting=bubble('يفكر في سؤالك الآن…');
try{const response=await fetch(cfg.url+'/functions/v1/noor-ai-chat',{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.anonKey,'Authorization':'Bearer '+cfg.anonKey},body:JSON.stringify({messages:history.slice(-16)})});const data=await response.json().catch(()=>({}));if(!response.ok){if(response.status===503||data.setup_required)throw new Error(data.error||'المساعد يحتاج إلى إضافة مفتاح مزود الذكاء الاصطناعي في أسرار Supabase.');if(response.status===401)throw new Error('تعذر التحقق من الاتصال الآمن.');throw new Error(data.error||'تعذر الاتصال بالمساعد ('+response.status+').')}
const answer=String(data.reply||'لم يصل رد من النموذج.').slice(0,14000);waiting.remove();bubble(answer);history.push({role:'assistant',content:answer});if(history.length>20)history=history.slice(-20)
}catch(err){waiting.remove();bubble(err.message||'حدث خطأ أثناء الاتصال.','error');history.pop()}finally{setBusy(false);prompt.focus()}
});
newChat?.addEventListener('click',start);prompt.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
})();