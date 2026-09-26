const gallery = document.getElementById('gallery');
const categoryLabels = { wedding: 'ΓΑΜΟΣ', baptism: 'ΒΑΠΤΙΣΗ', travel: 'TRAVEL', 'love-story': 'LOVE STORY', event: 'EVENT', 'airbnb-real-estate': 'AIRBNB – REAL ESTATE' };
const photoOrder = new Intl.Collator('el', { numeric: true, sensitivity: 'base' });

async function publishedPhotos() {
  const response = await fetch('album-files.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('Could not load the published photo list');
  const paths = await response.json();
  if (!Array.isArray(paths)) throw new Error('Invalid published photo list');
  const prefix = '/assets/images/';
  return paths
    .filter(path => typeof path === 'string' && path.startsWith(prefix) && /\.(jpe?g|png|webp)$/i.test(path))
    .map(path => path.slice(prefix.length));
}

function photoPath(name) {
  return 'assets/images/' + encodeURIComponent(name).replace(/%2F/g, '/');
}

if (gallery) {
  const photos = Array.isArray(window.PARDALOS_PHOTOS) ? window.PARDALOS_PHOTOS : [];
  const baptismNumbers = new Set(window.PARDALOS_BAPTISM_NUMBERS || []);
  const category = gallery.dataset.category;
  const categoryLabel = categoryLabels[category] || category.toUpperCase();
  const albumKey = gallery.dataset.album;
  const album = albumKey && window.PARDALOS_ALBUMS?.[albumKey];
  const allowedAlbumNumbers = Array.isArray(album?.numbers) ? new Set(album.numbers) : null;
  const allowedAlbumFiles = Array.isArray(album?.files) ? new Set(album.files) : null;
  const legacyPhotos = photos
    .map(name => {
      const filename = name.split('/').pop();
      return { name, number: Number(filename.slice(0, 3)) };
    })
    .filter(item => {
      if (allowedAlbumFiles) return allowedAlbumFiles.has(item.name);
      if (allowedAlbumNumbers) return allowedAlbumNumbers.has(item.number);
      return category === 'baptism' ? baptismNumbers.has(item.number) : !baptismNumbers.has(item.number);
    });

  function renderGallery(selected) {
    const count = document.getElementById('gallery-count');
    if (count) count.textContent = selected.length + ' φωτογραφίες';

    const fragment = document.createDocumentFragment();
    selected.forEach((item, index) => {
      const displayNumber = Number.isFinite(item.number) ? String(item.number).padStart(3, '0') : String(index + 1).padStart(3, '0');
      const card = document.createElement('figure');
      card.className = 'portfolio-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'Άνοιγμα φωτογραφίας ' + displayNumber + ' — ' + categoryLabel);

      const img = document.createElement('img');
      img.src = photoPath(item.name);
      img.alt = categoryLabel + ' — φωτογραφία ' + displayNumber;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.onerror = () => card.remove();

      const cap = document.createElement('figcaption');
      cap.className = 'cap';
      cap.textContent = categoryLabel;
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
  }

  gallery.textContent = 'Φόρτωση φωτογραφιών…';
  publishedPhotos().then(files => {
    if (!albumKey) return renderGallery(legacyPhotos);
    const folderKey = album?.folder || albumKey;
    const prefix = folderKey + '/';
    const fromFolder = files
      .filter(name => name.startsWith(prefix) && !name.slice(prefix.length).includes('/'))
      .sort(photoOrder.compare)
      .map(name => ({ name, number: Number(name.split('/').pop().slice(0, 3)) }));
    const published = new Set(files);
    const originalWeddingPhotos = albumKey === 'wedding-1'
      ? legacyPhotos.filter(item => published.has(item.name))
      : [];
    renderGallery([...originalWeddingPhotos, ...fromFolder]);
  }).catch(() => renderGallery(legacyPhotos));

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

// ΔΙΟΡΘΩΜΕΝΟ: Αποφυγή infinite loop όταν λείπουν τα εξώφυλλα
const topbar = document.querySelector('.topbar');
function updateStickyOffset() {
  document.documentElement.style.setProperty('--sticky-offset', `${Math.ceil(topbar?.getBoundingClientRect().height || 0)}px`);
}
function scrollToTarget(hash, pushState = true) {
  updateStickyOffset();
  const targetHash = hash || '#top';
  if (targetHash === '#top') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (pushState) history.replaceState(null, '', `${location.pathname}${location.search}`);
    return;
  }
  const target = document.getElementById(decodeURIComponent(targetHash.slice(1)));
  if (!target) return;
  const offset = Math.ceil(topbar?.getBoundingClientRect().height || 0) + 24;
  const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
  window.scrollTo({ top, behavior: 'smooth' });
  if (pushState) history.pushState(null, '', targetHash);
}

updateStickyOffset();
window.addEventListener('resize', updateStickyOffset);

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', event => {
    const hash = link.getAttribute('href');
    if (!hash || hash === '#') return;
    event.preventDefault();
    document.querySelector('.navlinks')?.classList.remove('open');
    scrollToTarget(hash);
  });
});

window.addEventListener('load', () => {
  const isReload = performance.getEntriesByType?.('navigation')?.[0]?.type === 'reload';
  const isHome = /(^|\/)(index\.html)?$/.test(location.pathname);
  if (isHome && isReload && location.hash) {
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    window.scrollTo(0, 0);
    return;
  }
  if (location.hash) setTimeout(() => scrollToTarget(location.hash, false), 0);
});

window.addEventListener('hashchange', () => {
  if (location.hash) scrollToTarget(location.hash, false);
});

const languageKey = 'pardalos-language-v1';
const translations = {
  el: {
    'nav.home': 'ΑΡΧΙΚΗ',
    'nav.services': 'ΥΠΗΡΕΣΙΕΣ',
    'nav.about': 'ΣΧΕΤΙΚΑ',
    'nav.contact': 'ΕΠΙΚΟΙΝΩΝΙΑ',
    'nav.portfolio': 'PORTFOLIO',
    'collection.portfolio': 'PORTFOLIO',
    'collection.wedding': 'Γάμος',
    'collection.baptism': 'Βάπτιση',
    'collection.travel': 'Travel',
    'collection.loveStory': 'Love Story',
    'collection.event': 'Event',
    'collection.realestate': 'Airbnb – Real Estate',
    'hero.intro': 'Ένα κλικ της φωτογραφικής μηχανής κρατάει κάποια κλάσματα του δευτερολέπτου... η στιγμή που τράβηξε παντοτινά... μπορείς να την δεις και να την εκτυπώσεις ξανά και ξανά και ξανά... δεν μπορείς όμως να ζήσεις στην ίδια στιγμή ποτέ ξανά... γι\' αυτό ζήσε την στιγμή... και άφησε τα κλικ σε εμάς!!!',
    'hero.title': 'Ιστορίες που<br><span>μένουν...</span>',
    'hero.portfolio': '▣   ΔΕΙΤΕ ΤΟ PORTFOLIO',
    'hero.contact': '✉   ΕΠΙΚΟΙΝΩΝΗΣΤΕ ΜΑΖΙ ΜΑΣ',
    'services.kicker': 'ΟΛΟΚΛΗΡΩΜΕΝΕΣ ΥΠΗΡΕΣΙΕΣ',
    'services.title': 'ΑΠΟ ΤΗ ΣΤΙΓΜΗ ΣΤΗΝ ΑΝΑΜΝΗΣΗ',
    'services.travel': 'Εικόνες και ιστορίες από τα επαγγελματικά μας ταξίδια.',
    'services.realestate': 'Φωτογράφιση καταλυμάτων και ακινήτων στη Ρόδο.',
    'services.weddingTitle': 'ΓΑΜΟΣ',
    'services.wedding': 'Ολοκληρωμένη κάλυψη γάμου με φωτογραφία και βίντεο.',
    'services.baptismTitle': 'ΒΑΠΤΙΣΗ',
    'services.baptism': 'Φυσικές οικογενειακές εικόνες και λεπτομέρειες μυστηρίου.',
    'services.travelTitle': 'TRAVEL',
    'services.loveTitle': 'LOVE STORY',
    'services.love': 'Ρομαντικές και couple φωτογραφίσεις σε όμορφα μέρη.',
    'services.boothTitle': '360 VIDEO BOOTH',
    'services.booth': 'Μοναδική εμπειρία 360° για γάμους, πάρτι και εκδηλώσεις.',
    'services.realestateTitle': 'AIRBNB – REAL ESTATE',
    'services.coupleTitle': 'ΖΕΥΓΑΡΙ & ΟΙΚΟΓΕΝΕΙΑ',
    'services.couple': 'Φωτογραφίσεις ζευγαριών και οικογενειών με φυσικό και αυθεντικό ύφος.',
    'services.videoTitle': 'VIDEO & DRONE',
    'services.video': 'Κινηματογραφική βιντεογράφηση και εντυπωσιακές εναέριες λήψεις.',
    'portfolio.kicker': 'ΦΩΤΟΓΡΑΦΙΕΣ',
    'portfolio.copy': 'Επιλέξτε μια συλλογή για να δείτε τις φωτογραφίες.',
    'portfolio.title': 'PORTFOLIO',
    'portfolio.collection1': '01 / ΣΥΛΛΟΓΗ',
    'portfolio.collection2': '02 / ΣΥΛΛΟΓΗ',
    'portfolio.collection3': '03 / ΣΥΛΛΟΓΗ',
    'portfolio.collection4': '04 / ΣΥΛΛΟΓΗ',
    'portfolio.collection5': '05 / ΣΥΛΛΟΓΗ',
    'portfolio.collection6': '06 / ΣΥΛΛΟΓΗ',
    'portfolio.wedding': 'ΓΑΜΟΣ',
    'portfolio.weddingCopy': 'Φωτογραφίες γάμου',
    'portfolio.baptism': 'ΒΑΠΤΙΣΗ',
    'portfolio.baptismCopy': 'Φωτογραφίες βάπτισης',
    'portfolio.travelCopy': 'Επαγγελματικά ταξίδια',
    'portfolio.loveCopy': 'Ιστορίες αγάπης',
    'portfolio.eventCopy': 'Εκδηλώσεις και ξεχωριστές στιγμές',
    'portfolio.realestate': 'AIRBNB<br>REAL ESTATE',
    'portfolio.realestateCopy': 'Φωτογράφιση καταλυμάτων και ακινήτων στη Ρόδο',
    'portfolio.openCollection': 'ΔΕΙΤΕ ΤΗ ΣΥΛΛΟΓΗ →',
    'about.kicker': 'ΣΧΕΤΙΚΑ',
    'about.title': 'ΒΡΕΙΤΕ ΜΑΣ ΣΤΗ ΡΟΔΟ',
    'about.copy': 'Αποτυπώνουμε τις πιο σημαντικές στιγμές της ζωής σας με επαγγελματισμό, δημιουργικότητα και αγάπη για τη λεπτομέρεια.',
    'about.details': 'Θα μας βρείτε στην Π. Ράμμου 186, Αφάντου, Ρόδος. Για ραντεβού ή πληροφορίες μπορείτε να καλέσετε ή να στείλετε email.',
    'contact.title': 'Ας δημιουργήσουμε<br>μαζί τις αναμνήσεις σας!'
  },
  en: {
    'nav.home': 'HOME',
    'nav.services': 'SERVICES',
    'nav.about': 'ABOUT',
    'nav.contact': 'CONTACT',
    'nav.portfolio': 'PORTFOLIO',
    'collection.portfolio': 'PORTFOLIO',
    'collection.wedding': 'Wedding',
    'collection.baptism': 'Baptism',
    'collection.travel': 'Travel',
    'collection.loveStory': 'Love Story',
    'collection.event': 'Event',
    'collection.realestate': 'Airbnb – Real Estate',
    'hero.intro': 'A camera click lasts only a fraction of a second. The moment it captures stays forever. You can see it and print it again and again, but you can never live the exact same moment twice. So live the moment and leave the clicks to us.',
    'hero.title': 'Stories that<br><span>remain...</span>',
    'hero.portfolio': '▣   VIEW PORTFOLIO',
    'hero.contact': '✉   CONTACT US',
    'services.kicker': 'COMPLETE SERVICES',
    'services.title': 'FROM THE MOMENT TO THE MEMORY',
    'services.travel': 'Images and stories from our professional trips.',
    'services.realestate': 'Photography for Airbnb stays and real estate in Rhodes.',
    'services.weddingTitle': 'WEDDING',
    'services.wedding': 'Complete wedding coverage with photography and video.',
    'services.baptismTitle': 'BAPTISM',
    'services.baptism': 'Natural family images and meaningful ceremony details.',
    'services.travelTitle': 'TRAVEL',
    'services.loveTitle': 'LOVE STORY',
    'services.love': 'Romantic couple photography in beautiful places.',
    'services.boothTitle': '360 VIDEO BOOTH',
    'services.booth': 'A unique 360° experience for weddings, parties and events.',
    'services.realestateTitle': 'AIRBNB – REAL ESTATE',
    'services.coupleTitle': 'COUPLES & FAMILIES',
    'services.couple': 'Natural and authentic photography for couples and families.',
    'services.videoTitle': 'VIDEO & DRONE',
    'services.video': 'Cinematic video production and impressive aerial footage.',
    'portfolio.kicker': 'PHOTOGRAPHY',
    'portfolio.copy': 'Choose a collection to view the photographs.',
    'portfolio.title': 'PORTFOLIO',
    'portfolio.collection1': '01 / COLLECTION',
    'portfolio.collection2': '02 / COLLECTION',
    'portfolio.collection3': '03 / COLLECTION',
    'portfolio.collection4': '04 / COLLECTION',
    'portfolio.collection5': '05 / COLLECTION',
    'portfolio.collection6': '06 / COLLECTION',
    'portfolio.wedding': 'WEDDING',
    'portfolio.weddingCopy': 'Wedding photography',
    'portfolio.baptism': 'BAPTISM',
    'portfolio.baptismCopy': 'Baptism photography',
    'portfolio.travelCopy': 'Professional trips',
    'portfolio.loveCopy': 'Love stories',
    'portfolio.eventCopy': 'Events and special moments',
    'portfolio.realestate': 'AIRBNB<br>REAL ESTATE',
    'portfolio.realestateCopy': 'Photography for Airbnb stays and real estate in Rhodes',
    'portfolio.openCollection': 'VIEW COLLECTION →',
    'about.kicker': 'ABOUT',
    'about.title': 'FIND US IN RHODES',
    'about.copy': 'We capture your most important moments with professionalism, creativity and attention to detail.',
    'about.details': 'You can find us at P. Rammou 186, Afantou, Rhodes. For appointments or information, call us or send an email.',
    'contact.title': 'Let\'s create<br>your memories together!'
  }
};
function readLanguagePreference() {
  try { return localStorage.getItem(languageKey); } catch { return null; }
}
function writeLanguagePreference(lang) {
  try { localStorage.setItem(languageKey, lang); } catch { /* Storage may be unavailable. */ }
}
function preferredLanguage() {
  const saved = readLanguagePreference();
  if (saved === 'el' || saved === 'en') return saved;
  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return browserLanguages.some(lang => String(lang).toLowerCase().startsWith('el')) ? 'el' : 'en';
}
function applyLanguage(lang, save = false) {
  const dictionary = translations[lang] || translations.el;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(node => {
    const value = dictionary[node.dataset.i18n];
    if (value) node.textContent = value;
  });
  document.querySelectorAll('[data-i18n-html]').forEach(node => {
    const value = dictionary[node.dataset.i18nHtml];
    if (value) node.innerHTML = value;
  });
  document.querySelectorAll('[data-lang-choice]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.langChoice === lang));
  });
  if (save) writeLanguagePreference(lang);
}
document.querySelectorAll('[data-lang-choice]').forEach(button => {
  button.addEventListener('click', () => applyLanguage(button.dataset.langChoice, true));
});
applyLanguage(preferredLanguage());

// A cover named after each collection URL overrides its current image.
// Missing covers leave the existing photograph or gradient unchanged.
document.querySelectorAll('a.portfolio-category[href]').forEach(card => {
  const match = /^([a-z0-9-]+)\.html$/i.exec(card.getAttribute('href') || '');
  if (!match) return;
  const extension = card.dataset.coverExt === 'png' ? 'png' : 'jpg';
  const coverPath = `assets/images/covers/${match[1]}.${extension}`;
  const legacyCoverPath = `assets/images/covers/${match[1].replace(/-/g, ' ')}.${extension}`;
  const cover = new Image();
  cover.onload = () => { card.style.backgroundImage = `url("${cover.src}")`; };
  cover.onerror = () => {
    if (cover.src.endsWith(coverPath)) cover.src = legacyCoverPath;
  };
  cover.src = coverPath;
});

const albumCards = document.querySelectorAll('.album-grid a.album-card[href]');
if (albumCards.length) {
  publishedPhotos().then(files => {
    albumCards.forEach(card => {
      const match = /^([a-z0-9-]+)\.html$/i.exec(card.getAttribute('href') || '');
      if (!match) return;
      const prefix = (card.dataset.folder || match[1]) + '/';
      const folderCount = files.filter(name => name.startsWith(prefix) && !name.slice(prefix.length).includes('/')).length;
      const label = card.querySelector('p');
      if (!label) return;
      const originalCount = match[1] === 'wedding-1' ? Number.parseInt(label.textContent, 10) || 0 : 0;
      const count = originalCount + folderCount;
      label.textContent = count ? count + ' φωτογραφίες' : 'Έτοιμο για φωτογραφίες';
      if (!card.style.backgroundImage && folderCount) {
        const first = files.find(name => name.startsWith(prefix) && !name.slice(prefix.length).includes('/'));
        if (first) card.style.backgroundImage = `url("${photoPath(first)}")`;
      }
    });
  }).catch(() => {});
}
