const gallery = document.getElementById('gallery');
const categoryLabels = { wedding: 'ΓΑΜΟΣ', baptism: 'ΒΑΠΤΙΣΗ', travel: 'TRAVEL', 'love-story': 'LOVE STORY', event: 'EVENT' };

function photoPath(name) {
  return 'assets/images/' + encodeURIComponent(name).replace(/%2F/g, '/');
}

if (gallery) {
  const photos = Array.isArray(window.PARDALOS_PHOTOS) ? window.PARDALOS_PHOTOS : [];
  const baptismNumbers = new Set(window.PARDALOS_BAPTISM_NUMBERS || []);
  const category = gallery.dataset.category;
  const albumKey = gallery.dataset.album;
  const album = albumKey && window.PARDALOS_ALBUMS?.[albumKey];
  const allowedAlbumNumbers = Array.isArray(album?.numbers) ? new Set(album.numbers) : null;
  const allowedAlbumFiles = Array.isArray(album?.files) ? new Set(album.files) : null;
  const selected = photos
    .map(name => {
      const filename = name.split('/').pop();
      return { name, number: Number(filename.slice(0, 3)) };
    })
    .filter(item => {
      if (allowedAlbumFiles) return allowedAlbumFiles.has(item.name);
      if (allowedAlbumNumbers) return allowedAlbumNumbers.has(item.number);
      return category === 'baptism' ? baptismNumbers.has(item.number) : !baptismNumbers.has(item.number);
    });

  const count = document.getElementById('gallery-count');
  if (count) count.textContent = selected.length + ' φωτογραφίες';

  const fragment = document.createDocumentFragment();
  selected.forEach((item, index) => {
    const displayNumber = Number.isFinite(item.number) ? String(item.number).padStart(3, '0') : String(index + 1).padStart(3, '0');
    const card = document.createElement('figure');
    card.className = 'portfolio-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Άνοιγμα φωτογραφίας ' + displayNumber + ' — ' + categoryLabels[category]);

    const img = document.createElement('img');
    img.src = photoPath(item.name);
    img.alt = categoryLabels[category] + ' — φωτογραφία ' + displayNumber;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onerror = () => card.remove();

    const cap = document.createElement('figcaption');
    cap.className = 'cap';
    cap.textContent = categoryLabels[category];
    const number = document.createElement('small');
    number.textContent = displayNumber;
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

  const lightbox = document.querySelector('.lightbox');
  let activeCard = null;

  function showPhoto(card) {
    const source = card.querySelector('img');
    const image = lightbox?.querySelector('img');
    if (!source || !image) return;
    image.src = source.src;
    image.alt = source.alt;
    activeCard = card;
  }

  function openLightbox(card) {
    if (!lightbox) return;
    showPhoto(card);
    lightbox.classList.add('open');
    lightbox.querySelector('.lightbox-close')?.focus();
  }

  function movePhoto(direction) {
    if (!lightbox?.classList.contains('open')) return;
    const cards = Array.from(gallery.querySelectorAll('.portfolio-card'));
    if (cards.length < 2) return;
    const currentIndex = cards.indexOf(activeCard);
    const nextIndex = (currentIndex + direction + cards.length) % cards.length;
    showPhoto(cards[nextIndex]);
  }

  function closeLightbox() {
    if (!lightbox?.classList.contains('open')) return;
    lightbox.classList.remove('open');
    if (activeCard?.isConnected) activeCard.focus();
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

  lightbox?.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
  lightbox?.querySelector('.lightbox-prev')?.addEventListener('click', () => movePhoto(-1));
  lightbox?.querySelector('.lightbox-next')?.addEventListener('click', () => movePhoto(1));
  lightbox?.addEventListener('click', event => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', event => {
    if (!lightbox?.classList.contains('open')) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') { event.preventDefault(); movePhoto(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); movePhoto(1); }
  });
}

document.querySelector('.nav-toggle')?.addEventListener('click', () => document.querySelector('.navlinks').classList.toggle('open'));
document.querySelectorAll('.navlinks a').forEach(link => link.addEventListener('click', () => document.querySelector('.navlinks').classList.remove('open')));
// A cover named after each collection URL overrides its current image.
// Missing covers leave the existing photograph or gradient unchanged.
document.querySelectorAll('a.portfolio-category[href]').forEach(card => {
  const match = /^([a-z0-9-]+)\.html$/i.exec(card.getAttribute('href') || '');
  if (!match) return;
  const extension = card.dataset.coverExt === 'png' ? 'png' : 'jpg';
  const coverPath = `assets/images/covers/${match[1]}.${extension}`;
  const cover = new Image();
  cover.onload = () => { card.style.backgroundImage = `url("${coverPath}")`; };
  cover.src = coverPath;
});