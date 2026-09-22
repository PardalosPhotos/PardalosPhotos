const gallery = document.getElementById('gallery');
const categoryLabels = { wedding: 'ΓΑΜΟΣ', baptism: 'ΒΑΠΤΙΣΗ' };

function photoPath(name) {
  return 'assets/images/' + encodeURIComponent(name).replace(/%2F/g, '/');
}

if (gallery) {
  const photos = Array.isArray(window.PARDALOS_PHOTOS) ? window.PARDALOS_PHOTOS : [];
  const baptismNumbers = new Set(window.PARDALOS_BAPTISM_NUMBERS || []);
  const category = gallery.dataset.category;
  const albumKey = gallery.dataset.album;
  const albumNumbers = albumKey && window.PARDALOS_ALBUMS?.[albumKey]?.numbers;
  const allowedAlbumNumbers = Array.isArray(albumNumbers) ? new Set(albumNumbers) : null;
  const selected = photos
    .map(name => ({ name, number: Number(name.slice(0, 3)) }))
    .filter(item => {
      if (allowedAlbumNumbers) return allowedAlbumNumbers.has(item.number);
      return category === 'baptism' ? baptismNumbers.has(item.number) : !baptismNumbers.has(item.number);
    });

  const count = document.getElementById('gallery-count');
  if (count) count.textContent = selected.length + ' φωτογραφίες';

  const fragment = document.createDocumentFragment();
  selected.forEach(item => {
    const card = document.createElement('figure');
    card.className = 'portfolio-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Άνοιγμα φωτογραφίας ' + String(item.number).padStart(3, '0') + ' — ' + categoryLabels[category]);

    const img = document.createElement('img');
    img.src = photoPath(item.name);
    img.alt = categoryLabels[category] + ' — φωτογραφία ' + String(item.number).padStart(3, '0');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onerror = () => card.remove();

    const cap = document.createElement('figcaption');
    cap.className = 'cap';
    cap.textContent = categoryLabels[category];
    const number = document.createElement('small');
    number.textContent = String(item.number).padStart(3, '0');
    cap.appendChild(number);
    card.append(img, cap);
    fragment.appendChild(card);
  });
  if (!selected.length) {
    const empty = document.createElement('div');
    empty.className = 'album-empty';
    empty.innerHTML = '<strong>Το άλμπουμ είναι έτοιμο.</strong><span>Οι φωτογραφίες θα προστεθούν σύντομα.</span>';
    fragment.appendChild(empty);
  }
  gallery.replaceChildren(fragment);

  function openLightbox(card) {
    const lightbox = document.querySelector('.lightbox');
    if (!lightbox) return;
    const image = lightbox.querySelector('img');
    image.src = card.querySelector('img').src;
    image.alt = card.querySelector('img').alt;
    lightbox.classList.add('open');
    lightbox.querySelector('button').focus();
  }

  function closeLightbox() {
    document.querySelector('.lightbox')?.classList.remove('open');
  }

  gallery.addEventListener('click', event => {
    const card = event.target.closest('.portfolio-card');
    if (card) openLightbox(card);
  });
  gallery.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('.portfolio-card');
    if (!card) return;
    event.preventDefault();
    openLightbox(card);
  });

  document.querySelector('.lightbox button')?.addEventListener('click', closeLightbox);
  document.querySelector('.lightbox')?.addEventListener('click', event => {
    if (event.target.classList.contains('lightbox')) closeLightbox();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeLightbox();
  });
}

document.querySelector('.nav-toggle')?.addEventListener('click', () => document.querySelector('.navlinks').classList.toggle('open'));
document.querySelectorAll('.navlinks a').forEach(link => link.addEventListener('click', () => document.querySelector('.navlinks').classList.remove('open')));
