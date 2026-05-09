const form = document.getElementById('searchForm');
const resultCards = document.getElementById('resultCards');
const resultCount = document.getElementById('resultCount');
const insightBody = document.getElementById('insightBody');

function limitText(t, n = 240) {
  if (!t) return '-';
  return t.length > n ? `${t.slice(0, n)}...` : t;
}

function fakeInsights(item) {
  const abstract = item.abstract || '';
  const pieces = abstract.split('.').filter(Boolean);
  return {
    hasil: pieces[0] || 'Hasil utama belum tersedia dari metadata. Buka PDF untuk detail penuh.',
    conclusion: pieces[1] || 'Conclusion belum ter-ekstrak otomatis. Perlu model NLP untuk akurasi.',
    limitasi: pieces[2] || 'Keterbatasan tidak tersedia pada metadata API publik.'
  };
}

function renderInsight(item) {
  const insight = fakeInsights(item);
  insightBody.innerHTML = `
    <tr>
      <td>${item.title}</td>
      <td>${item.year || '-'}</td>
      <td>${limitText(insight.hasil, 180)}</td>
      <td>${limitText(insight.conclusion, 180)}</td>
      <td>${limitText(insight.limitasi, 180)}</td>
      <td><a href="${item.pdf}" target="_blank" rel="noopener">Buka PDF</a></td>
    </tr>
  `;
}

function cardTemplate(item, idx) {
  return `
    <article class="card">
      <span class="badge">${item.type}</span>
      <h3>${item.title}</h3>
      <div class="meta">
        <span>${item.year || '-'}</span>
        <span>${item.source}</span>
      </div>
      <p>${limitText(item.abstract || 'Tidak ada abstrak di metadata.', 260)}</p>
      <div class="linkrow">
        <a href="${item.url}" target="_blank" rel="noopener">Landing Page</a>
        <a href="${item.pdf}" target="_blank" rel="noopener">PDF</a>
      </div>
      <button class="pick" data-idx="${idx}">PILIH KE TABEL</button>
    </article>
  `;
}

async function fetchOpenAlex(query) {
  const endpoint = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=is_oa:true,has_fulltext:true&per-page=10`;
  const res = await fetch(endpoint);
  const json = await res.json();
  return (json.results || [])
    .map(w => {
      const pdf = w.open_access?.oa_url || w.primary_location?.pdf_url;
      if (!pdf || !pdf.toLowerCase().includes('pdf')) return null;
      return {
        title: w.title,
        year: w.publication_year,
        abstract: w.abstract_inverted_index ? Object.keys(w.abstract_inverted_index).join(' ') : '',
        url: w.id,
        pdf,
        source: 'OpenAlex',
        type: 'Jurnal/Artikel'
      };
    })
    .filter(Boolean);
}

async function fetchOpenLibrary(query) {
  const endpoint = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&has_fulltext=true&limit=8`;
  const res = await fetch(endpoint);
  const json = await res.json();
  return (json.docs || []).map(doc => ({
    title: doc.title,
    year: doc.first_publish_year,
    abstract: `Buku terkait ${query}. Gunakan halaman OpenLibrary untuk akses file tersedia.`,
    url: `https://openlibrary.org${doc.key}`,
    pdf: `https://openlibrary.org${doc.key}`,
    source: 'OpenLibrary',
    type: 'Buku'
  }));
}

let latestItems = [];
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  resultCards.innerHTML = '<p>Loading open access sources...</p>';

  const q = document.getElementById('query').value.trim();
  const wantArticle = document.getElementById('typeArticle').checked;
  const wantBook = document.getElementById('typeBook').checked;

  let items = [];
  try {
    if (wantArticle) items = items.concat(await fetchOpenAlex(q));
    if (wantBook) items = items.concat(await fetchOpenLibrary(q));
  } catch (err) {
    resultCards.innerHTML = `<p>Gagal mengambil data API: ${err.message}</p>`;
    return;
  }

  latestItems = items;
  resultCount.textContent = `${items.length} item`;

  if (!items.length) {
    resultCards.innerHTML = '<p>Tidak ada hasil OA + PDF untuk kueri ini.</p>';
    return;
  }

  resultCards.innerHTML = items.map((it, i) => cardTemplate(it, i)).join('');
  document.querySelectorAll('.pick').forEach(btn => {
    btn.addEventListener('click', () => renderInsight(latestItems[Number(btn.dataset.idx)]));
  });
});
