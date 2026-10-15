const content=document.querySelector('#content');
const params=new URLSearchParams(location.search);
const file=params.get('file');
const projectId=params.get('project');
const removedProjects=new Set(['n04','n20','n37']);
const validFile=file==='resursproekt-portfolio.pdf'||/^p(0[1-9]|[1-4]\d|5[0-3])\.pdf$/.test(file||'');
const validProject=/^n(0[1-9]|[12]\d|3[0-8])$/.test(projectId||'')&&!removedProjects.has(projectId);
if(window.self===window.top)document.body.classList.add('standalone');
const primaryDownload=document.querySelector('#download-pdf');
const sourceURL=file==='resursproekt-portfolio.pdf'?file+'?v=6':file;
if(validFile)primaryDownload.href=sourceURL;else primaryDownload.hidden=true;

function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node}
function metadata(label,value){const row=element('div');row.append(element('dt','',label),element('dd','',value));return row}
function photograph(photo,index,title,eager=false){
  const figure=element('figure','photo'+(photo.wide??photo.width/photo.height>1.95?' wide':''));
  const link=element('a');link.href=photo.src;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','Открыть фото '+index+' в полном размере');
  const image=element('img');image.src=photo.src;image.alt=photo.caption||title+'. Фото '+index;image.width=photo.width;image.height=photo.height;image.decoding='async';image.loading=eager?'eager':'lazy';
  if(eager)image.fetchPriority='high';link.append(image);figure.append(link);if(photo.caption)figure.append(element('figcaption','',photo.caption));return figure;
}

async function renderGallery(){
  const id=validProject?projectId:file==='p13.pdf'?'p08':file.slice(0,-4),response=await fetch('galleries/'+id+'.json?v=6');
  if(!response.ok)throw new Error('Gallery unavailable');
  const doc=await response.json();document.title=doc.title+' — РесурсПроект';document.body.dataset.mode='gallery';document.body.dataset.photoCount=String(doc.photoCount);
  const page=element('article','document-page');
  const head=element('header','project-head'),description=element('div','project-description');
  description.append(element('p','eyebrow',doc.type+' / '+doc.photoCount+' фото'),element('h1','',doc.title),element('p','brief',doc.summary));
  const meta=element('dl','project-meta');if(doc.object)meta.append(metadata('Объект',doc.object));if(doc.address)meta.append(metadata('Адрес',doc.address));if(doc.customer)meta.append(metadata(doc.customerLabel||'Заказчик',doc.customer));if(doc.period)meta.append(metadata('Период',doc.period));meta.append(metadata('Раздел',doc.group));description.append(meta);head.append(description);
  const cover=doc.sections.flatMap(section=>section.photos)[0];let photoNumber=1;
  if(cover){const photo=photograph(cover,photoNumber++,doc.title,true);photo.classList.add('cover');head.append(photo)}page.append(head);
  if(doc.details?.length){const details=element('details','description-details');if(doc.detailsOpen)details.open=true;details.append(element('summary','',doc.detailsTitle||'Подробное описание и статус работ'),element('div','source-description',doc.details.join('\n')));page.append(details)}
  for(const section of doc.sections){
    const photos=section.photos.filter(photo=>photo!==cover);if(!photos.length)continue;
    const block=element('section','gallery-section');block.append(element('h2','',section.title));if(section.notes?.length)block.append(element('p','section-notes',section.notes.join('\n')));
    const grid=element('div','gallery-grid');for(const photo of photos)grid.append(photograph(photo,photoNumber++,doc.title));block.append(grid);page.append(block);
  }
  const footer=element('footer','gallery-footer');footer.append(element('p','','РесурсПроект / +7 (499) 404-11-67 / resprog@mail.ru'));
  if(doc.pdf){const download=element('a','','Скачать исходную презентацию в PDF ↓');download.href=doc.pdf;download.download='';footer.append(download)}
  for(const related of doc.relatedPdfs||[]){const row=element('p'),link=element('a','',related.title+' ↓');link.href=related.file;link.download='';row.append(link);footer.append(row)}
  page.append(footer);
  content.replaceChildren(page);
}

async function renderPortfolio(){
  const pdfjs=await import('./pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc='./pdf.worker.mjs';
  const pdf=await pdfjs.getDocument({url:sourceURL,isEvalSupported:false,isImageDecoderSupported:false,useSystemFonts:true}).promise;
  const firstPage=await pdf.getPage(1),base=firstPage.getViewport({scale:1});
  document.body.dataset.mode='continuous-pdf';document.body.dataset.totalPages=String(pdf.numPages);document.title='Портфолио РесурсПроекта';
  const page=element('article','document-page portfolio-viewer'),heading=element('header','portfolio-heading');heading.append(element('h1','','Портфолио РесурсПроекта'),element('p','','Все материалы расположены одной лентой. Прокручивайте вниз.'));page.append(heading);
  const strip=element('div','pdf-strip');page.append(strip);const states=[],queue=[];let active=0;
  for(let number=1;number<=pdf.numPages;number++){const holder=element('section','pdf-page');holder.style.aspectRatio=base.width+' / '+base.height;holder.dataset.number=String(number);holder.setAttribute('aria-label','Лист '+number+' портфолио');strip.append(holder);states.push({number,holder,visible:false,queued:false,task:null,dirty:false})}
  content.replaceChildren(page);
  function release(state){if(state.task)return;const canvas=state.holder.querySelector('canvas');if(canvas){canvas.width=0;canvas.height=0}state.holder.replaceChildren();state.holder.dataset.rendered='false'}
  function enqueue(state){if(state.queued||state.task||!state.visible)return;if(state.holder.dataset.rendered==='true'&&!state.dirty)return;state.queued=true;queue.push(state);processQueue()}
  async function draw(state){
    const pdfPage=await pdf.getPage(state.number);if(!state.visible)return;
    const original=pdfPage.getViewport({scale:1}),viewport=pdfPage.getViewport({scale:state.holder.clientWidth/original.width}),dpr=Math.min(devicePixelRatio||1,2);
    const canvas=element('canvas');canvas.width=Math.floor(viewport.width*dpr);canvas.height=Math.floor(viewport.height*dpr);canvas.dataset.renderWidth=String(state.holder.clientWidth);canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Лист '+state.number+' портфолио');state.holder.replaceChildren(canvas);state.dirty=false;
    state.task=pdfPage.render({canvasContext:canvas.getContext('2d'),viewport,transform:dpr===1?null:[dpr,0,0,dpr,0,0]});
    try{await state.task.promise;state.holder.dataset.rendered='true'}finally{state.task=null;if(!state.visible)release(state)}
  }
  function processQueue(){while(active<2&&queue.length){const state=queue.shift();state.queued=false;if(!state.visible)continue;active++;draw(state).catch(()=>{state.holder.classList.add('error');state.holder.textContent='Не удалось показать этот лист. Исходный PDF доступен для скачивания.'}).finally(()=>{active--;processQueue()})}}
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){const state=states[Number(entry.target.dataset.number)-1];state.visible=entry.isIntersecting;if(state.visible)enqueue(state);else release(state)}},{rootMargin:'1000px 0px'});
  for(const state of states)observer.observe(state.holder);
  let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{for(const state of states){if(!state.visible)continue;const canvas=state.holder.querySelector('canvas');if(!canvas||Math.abs(Number(canvas.dataset.renderWidth)-state.holder.clientWidth)>30){state.dirty=true;enqueue(state)}}},200)});
}

function reportError(){const message=element('p','status',removedProjects.has(projectId)?'Этот материал удалён из презентации.':'Не удалось загрузить материал.');const link=element('a','error-link',validFile?'Открыть PDF':'Вернуться к каталогу');link.href=validFile?sourceURL:'index.html#presentations';content.replaceChildren(message,link)}
try{if(!validFile&&!validProject)throw new Error('Invalid document');if(file==='resursproekt-portfolio.pdf')await renderPortfolio();else await renderGallery()}catch(error){reportError()}
