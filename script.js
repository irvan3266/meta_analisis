const form = document.getElementById('searchForm');
const resultCards = document.getElementById('resultCards');
const resultCount = document.getElementById('resultCount');
const insightBody = document.getElementById('insightBody');
const queryInput = document.getElementById('query');
const top3 = document.getElementById('top3');
const downloadWordBtn = document.getElementById('downloadWord');

const reputedJournals = ['Nature','Science','The Lancet','Cell','IEEE Access','PLOS ONE','BMJ','JAMA','Elsevier','Springer'];
const quickKeywords = ['climate change adaptation','renewable energy policy','machine learning healthcare','circular economy','food security','public health intervention'];
const suggestionBox = document.createElement('div'); suggestionBox.className = 'suggestions brutal-box'; suggestionBox.hidden = true; queryInput.insertAdjacentElement('afterend', suggestionBox);
const selectedFacets = () => [...document.querySelectorAll('.facet:checked')].map(x => x.value);
const cap = (t,n=180)=>!t?'-':(t.length>n?`${t.slice(0,n)}...`:t);

function renderSuggestions(keyword){const q=keyword.trim().toLowerCase(); if(!q){suggestionBox.hidden=true;return;} const m=quickKeywords.filter(k=>k.includes(q)).slice(0,6); if(!m.length){suggestionBox.hidden=true;return;} suggestionBox.innerHTML=m.map(s=>`<button type="button" class="s-item" data-value="${s}">${s}</button>`).join(''); suggestionBox.hidden=false; suggestionBox.querySelectorAll('.s-item').forEach(b=>b.onclick=()=>{queryInput.value=b.dataset.value; suggestionBox.hidden=true; form.requestSubmit();});}
function makeInsights(item){const p=(item.abstract||'').split('.').filter(Boolean); return {tldr:p[0]||'Ringkasan cepat tidak tersedia.',conclusion:p[1]||'Conclusion belum diekstrak penuh.',sabstract:p[0]||'-',results:p[1]||'-',sintro:p[2]||'-',methods:p[3]||'-',lit:p[4]||'-',limitations:p[5]||'Limitasi tidak tersedia.',contrib:p[2]||'-',implications:p[3]||'-',objectives:p[0]||'-',findings:p[1]||'-'};}
function apaCitation(item){return `${item.author||'Anonim'}. (${item.year||'n.d.'}). ${item.title}. ${item.source}. ${item.url}`;}

function renderTop3(items){top3.innerHTML=''; items.slice(0,3).forEach((it,i)=>{const inx=makeInsights(it); const el=document.createElement('article'); el.className='card'; el.innerHTML=`<h3>#${i+1} ${it.title}</h3><p><strong>TL;DR:</strong> ${cap(inx.tldr,140)}</p><p><strong>Findings:</strong> ${cap(inx.findings,140)}</p><p><strong>Conclusion:</strong> ${cap(inx.conclusion,140)}</p><p><strong>APA:</strong> ${apaCitation(it)}</p>`; top3.appendChild(el);});}
function renderInsight(item){const f=selectedFacets(); const i=makeInsights(item); const show=(k)=>f.includes(k)?cap(i[k],170):'-'; if (insightBody.querySelector('.placeholder')) insightBody.innerHTML=''; insightBody.insertAdjacentHTML('beforeend',`<tr><td>${item.title}</td><td>${item.year||'-'}</td><td>${show('tldr')}</td><td>${show('results')}</td><td>${show('conclusion')}</td><td>${show('limitations')}</td><td>${apaCitation(item)}</td><td><a href="${item.pdf}" target="_blank">Buka PDF</a></td></tr>`);}
function cardTemplate(item, idx){return `<article class="card"><span class="badge">${item.type}</span><h3>${item.title}</h3><div class="meta"><span>${item.year||'-'}</span><span>${item.sourceName||item.source}</span></div><p>${cap(item.abstract||'Tidak ada abstrak di metadata.',220)}</p><button class="pick" data-idx="${idx}">Tambah ke Tabel</button></article>`;}

function fromReputed(name=''){const n=name.toLowerCase(); return reputedJournals.some(j=>n.includes(j.toLowerCase()));}
async function fetchOpenAlex(query){const res=await fetch(`https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=is_oa:true,has_fulltext:true,type:article&per-page=20`); const json=await res.json(); return (json.results||[]).map(w=>{const pdf=w.open_access?.oa_url||w.primary_location?.pdf_url; const sourceName=w.primary_location?.source?.display_name||''; if(!pdf||!pdf.toLowerCase().includes('pdf')) return null; if(!fromReputed(sourceName)) return null; return {title:w.title,year:w.publication_year,author:w.authorships?.[0]?.author?.display_name,abstract:w.abstract_inverted_index?Object.keys(w.abstract_inverted_index).join(' '):'',url:w.id,pdf,source:'OpenAlex',sourceName,type:'Jurnal/Artikel (Scopus-indexed candidate)',rawType:'article'};}).filter(Boolean);}
async function fetchOpenLibrary(query){const res=await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&has_fulltext=true&limit=8`); const json=await res.json(); return (json.docs||[]).map(d=>({title:d.title,year:d.first_publish_year,author:d.author_name?.[0],abstract:`Buku terkait ${query}.`,url:`https://openlibrary.org${d.key}`,pdf:`https://openlibrary.org${d.key}`,source:'OpenLibrary',sourceName:'OpenLibrary',type:'Buku',rawType:'book'}));}

downloadWordBtn.addEventListener('click',()=>{const html=`<html><head><meta charset="utf-8"></head><body><h2>Vannn Researcher - Tabel Analisis</h2>${document.querySelector('.table-wrap table').outerHTML}</body></html>`; const blob=new Blob(['\ufeff',html],{type:'application/msword'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='vannn-researcher-tabel.doc'; a.click(); URL.revokeObjectURL(a.href);});
queryInput.oninput=e=>renderSuggestions(e.target.value); queryInput.onfocus=()=>renderSuggestions(queryInput.value);
document.addEventListener('click',e=>{if(!suggestionBox.contains(e.target)&&e.target!==queryInput) suggestionBox.hidden=true;});

let latestItems=[];
form.addEventListener('submit', async(e)=>{e.preventDefault(); const q=queryInput.value.trim(); const ct=document.getElementById('contentType').value; resultCards.innerHTML='<p>Loading...</p>'; let items=[]; try{if(ct!=='book') items=items.concat(await fetchOpenAlex(q)); if(ct!=='article'&&ct!=='other') items=items.concat(await fetchOpenLibrary(q));}catch(err){resultCards.innerHTML=`<p>Gagal: ${err.message}</p>`; return;} if(ct==='book') items=items.filter(i=>i.rawType==='book'); if(ct==='other') items=[]; latestItems=items; resultCount.textContent=`${items.length} item`; resultCards.innerHTML=items.length?items.map(cardTemplate).join(''):'<p>Tidak ada hasil (coba keyword lain).</p>'; renderTop3(items); document.querySelectorAll('.pick').forEach(btn=>btn.onclick=()=>renderInsight(latestItems[Number(btn.dataset.idx)]));});
