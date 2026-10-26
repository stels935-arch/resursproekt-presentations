"use strict";
const scenes=[...document.querySelectorAll('.scene')];
const nav=[...document.querySelectorAll('[data-chapter-link]')];
const masthead=document.querySelector('.masthead');
const prev=document.querySelector('#prev'),next=document.querySelector('#next');
const counter=document.querySelector('#page-counter'),progress=document.querySelector('#read-progress');
let active=0,frame=false;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function measureHeader(){const h=Math.ceil(masthead.getBoundingClientRect().height);document.documentElement.style.setProperty('--head-height',h+'px');update();}
function update(){frame=false;const threshold=masthead.getBoundingClientRect().bottom+45;let found=0;for(let i=0;i<scenes.length;i++){if(scenes[i].getBoundingClientRect().top<=threshold)found=i;}active=found;counter.textContent=String(active+1).padStart(2,'0')+' / '+scenes.length;prev.href='#'+scenes[Math.max(0,active-1)].id;next.href='#'+scenes[Math.min(scenes.length-1,active+1)].id;prev.setAttribute('aria-disabled',String(active===0));next.setAttribute('aria-disabled',String(active===scenes.length-1));prev.tabIndex=active===0?-1:0;next.tabIndex=active===scenes.length-1?-1:0;progress.style.width=((active+1)/scenes.length*100)+'%';for(const a of nav){if(a.dataset.chapterLink===scenes[active].dataset.chapter)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');}}
function go(index){index=Math.min(scenes.length-1,Math.max(0,index));const s=scenes[index];history.replaceState(null,'','#'+s.id);s.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'start'});}

addEventListener('scroll',()=>{if(!frame){frame=true;requestAnimationFrame(update);}},{passive:true});
addEventListener('resize',measureHeader);addEventListener('hashchange',()=>requestAnimationFrame(update));
document.fonts.ready.then(measureHeader);measureHeader();

const box=document.querySelector('#lightbox'),boxImage=document.querySelector('#lightbox-image'),boxCaption=document.querySelector('#lightbox-caption');
const boxPrev=document.querySelector('#lightbox-prev'),boxNext=document.querySelector('#lightbox-next'),boxClose=document.querySelector('#lightbox-close'),boxCount=document.querySelector('#lightbox-count');
let group=[],photoIndex=0,opener=null;
function showPhoto(index){photoIndex=Math.max(0,Math.min(group.length-1,index));const p=group[photoIndex];boxImage.src=p.dataset.src;boxImage.alt=p.dataset.caption;boxCaption.textContent=p.dataset.caption;boxCount.textContent=(photoIndex+1)+' / '+group.length;boxPrev.disabled=photoIndex===0;boxNext.disabled=photoIndex===group.length-1;}
for(const button of document.querySelectorAll('[data-gallery]')){button.addEventListener('click',()=>{opener=button;group=[...document.querySelectorAll('[data-gallery]')].filter(p=>p.dataset.gallery===button.dataset.gallery);showPhoto(group.indexOf(button));box.showModal();document.body.classList.add('lightbox-open');boxClose.focus();});}
boxClose.addEventListener('click',()=>box.close());boxPrev.addEventListener('click',()=>showPhoto(photoIndex-1));boxNext.addEventListener('click',()=>showPhoto(photoIndex+1));
box.addEventListener('close',()=>{document.body.classList.remove('lightbox-open');if(opener)opener.focus({preventScroll:true});});
addEventListener('keydown',event=>{if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.target.closest('input,textarea,select,[contenteditable=true],.scroll-table'))return;if(box.open){if(event.key==='ArrowRight'){event.preventDefault();showPhoto(photoIndex+1);}if(event.key==='ArrowLeft'){event.preventDefault();showPhoto(photoIndex-1);}return;}if(['ArrowRight','PageDown'].includes(event.key)){event.preventDefault();go(active+1);}else if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();go(active-1);}});

document.querySelector('#copy-link').addEventListener('click',async()=>{const status=document.querySelector('#copy-status');const url=document.querySelector('link[rel=canonical]').href;try{await navigator.clipboard.writeText(url);status.textContent='Ссылка скопирована. Можно переслать заказчику.';}catch{status.textContent=url;}});
