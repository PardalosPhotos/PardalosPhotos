const photos = Array.isArray(window.PARDALOS_PHOTOS) ? window.PARDALOS_PHOTOS : [];
const hero = document.querySelector('.hero');
const gallery = document.getElementById('gallery');
const filterButtons = document.querySelectorAll('[data-portfolio-filter]');

// Φωτογραφίες 001–040: οι παρακάτω είναι βάπτιση, οι υπόλοιπες γάμος.
const baptismNumbers = new Set([10, 23, 26, 32, 36, 37, 39]);
const categoryLabels = { wedding: 'ΓΑΜΟΣ', baptism: 'ΒΑΠΤΙΣΗ' };

function photoPath(name) {
  return 'assets/images/' + encodeURIComponent(name).replace(/%2F/g, '/');
}

if (hero && photos.length) hero.style.backgroundImage = 'url("' + photoPath(photos[0]) + '")';

const photoItems = photos.map(name => {
  const number = Number(name.slice(0, 3));
  return { name, number, category: baptismNumbers.has(number) ? 'baptism' : 'wedding' };
});

const counts = {
  all: photoItems.length,
  wedding: photoItems.filter(item => item.category === 'wedding').length,
  baptism: photoItems.filter(item => item.category === 'baptism').length
};

filterButtons.forEach(button => {
  const filter = button.dataset.portfolioFilter;
  button.textContent = button.dataset.label + ' (' + counts[filter] + ')';
  button.addEventListener('click', () => {
    filterButtons.forEach(other => {
      const active = other === button;
      other.classList.toggle('active', active);
      other.setAttribute('aria-pressed', String(active));
    });
    renderGallery(filter);
  });
});

function renderGallery(filter) {
  if (!gallery) return;
  const fragment = document.createDocumentFragment();
  photoItems.filter(item => filter === 'all' || item.category === filter).forEach(item => {
    const card = document.createElement('figure');
    card.className = 'portfolio-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Άνοιγμα φωτογραφίας ' + String(item.number).padStart(3, '0') + ' — ' + categoryLabels[item.category]);

    const img = document.createElement('img');
    img.src = photoPath(item.name);
    img.alt = categoryLabels[item.category] + ' — φωτογραφία ' + String(item.number).padStart(3, '0');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onerror = () => card.remove();

    const cap = document.createElement('figcaption');
    cap.className = 'cap';
    cap.textContent = categoryLabels[item.category];
    const number = document.createElement('small');
    number.textContent = String(item.number).padStart(3, '0');
    cap.appendChild(number);

    card.append(img, cap);
    fragment.appendChild(card);
  });
  gallery.replaceChildren(fragment);
}

renderGallery('all');

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

gallery?.addEventListener('click', event => {
  const card = event.target.closest('.portfolio-card');
  if (card) openLightbox(card);
});
gallery?.addEventListener('keydown', event => {
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
document.querySelector('.nav-toggle')?.addEventListener('click', () => document.querySelector('.navlinks').classList.toggle('open'));
document.querySelectorAll('.navlinks a').forEach(link => link.addEventListener('click', () => document.querySelector('.navlinks').classList.remove('open')));
