// The resume remains readable and all links work without JavaScript.
const resumeSections=[...document.querySelectorAll('.resume-content>.resume-section')];
const resumeLinks=[...document.querySelectorAll('.resume-toc>a[href^="#"]')];
let resumeScrollPending=false;
function updateResumeNavigation(){
 resumeScrollPending=false;
 const threshold=parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)+40;
 let current=resumeSections[0];
 for(const section of resumeSections){if(section.getBoundingClientRect().top<=threshold)current=section;else break}
 if(scrollY+innerHeight>=document.documentElement.scrollHeight-3)current=resumeSections.at(-1);
 for(const link of resumeLinks){if(link.hash==='#'+current?.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')}
}
addEventListener('scroll',()=>{if(!resumeScrollPending){resumeScrollPending=true;requestAnimationFrame(updateResumeNavigation)}},{passive:true});
addEventListener('resize',updateResumeNavigation);
addEventListener('pageshow',updateResumeNavigation);
updateResumeNavigation();

const resumeContactTrigger=document.querySelector('#resume-contact-trigger');
const resumeContactDialog=document.querySelector('#resume-contact-dialog');
resumeContactTrigger.addEventListener('click',()=>{
 resumeContactDialog.showModal();
 resumeContactDialog.scrollTop=0;
 document.body.classList.add('dialog-open');
});
resumeContactDialog.querySelector('.dialog-close').addEventListener('click',()=>resumeContactDialog.close());
resumeContactDialog.addEventListener('click',event=>{
 if(event.target!==resumeContactDialog)return;
 const bounds=resumeContactDialog.getBoundingClientRect();
 if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)resumeContactDialog.close();
});
resumeContactDialog.addEventListener('close',()=>{
 document.body.classList.remove('dialog-open');
 resumeContactTrigger.focus({preventScroll:true});
});
