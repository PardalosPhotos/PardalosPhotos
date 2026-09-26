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
    .map(path => {
      if (typeof path !== 'string') return null;
      const normalized = decodeURIComponent(path);
      const index = normalized.indexOf(prefix);
      return index >= 0 ? normalized.slice(index + prefix.length) : null;
    })
    .filter(path => path && /\.(jpe?g|png|webp)$/i.test(path));
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
    'portfolio.travel': 'TRAVEL',
    'portfolio.love': 'LOVE STORY',
    'portfolio.event': 'EVENT',
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
    'portfolio.travel': 'TRAVEL',
    'portfolio.love': 'LOVE STORY',
    'portfolio.event': 'EVENT',
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
function applyPageLanguage(lang) {
  const english = lang === 'en';
  const galleryNode = document.getElementById('gallery');
  const path = location.pathname.toLowerCase();
  const category = galleryNode?.dataset.category || (path.match(/(wedding|baptism|travel|love-story|event|airbnb-real-estate)/)?.[1] || '');
  const copy = {
    wedding: { collection: english ? 'WEDDINGS' : 'ΓΑΜΟΣ', intro: english ? 'Choose an album to view the photographs.' : 'Επιλέξτε ένα άλμπουμ για να δείτε τις φωτογραφίες.', album: english ? 'Wedding moments through our lens.' : 'Στιγμές γάμου μέσα από τον φακό μας.' },
    baptism: { collection: english ? 'BAPTISM' : 'ΒΑΠΤΙΣΗ', intro: english ? 'Choose an album to view the photographs.' : 'Επιλέξτε ένα άλμπουμ για να δείτε τις φωτογραφίες.', album: english ? 'Tender moments and family memories.' : 'Τρυφερές στιγμές και οικογενειακές αναμνήσεις.' },
    travel: { collection: english ? 'TRAVEL' : 'TRAVEL', intro: english ? 'Images and stories from our professional journeys.' : 'Εικόνες και ιστορίες από τα επαγγελματικά μας ταξίδια.', album: english ? 'Places, people and stories from every journey.' : 'Τόποι, άνθρωποι και ιστορίες από κάθε ταξίδι.' },
    'love-story': { collection: english ? 'LOVE STORY' : 'LOVE STORY', intro: english ? 'Choose an album to discover each love story.' : 'Επιλέξτε ένα άλμπουμ για να ανακαλύψετε κάθε ιστορία αγάπης.', album: english ? 'Romantic moments captured with care.' : 'Ρομαντικές στιγμές αποτυπωμένες με φροντίδα.' },
    event: { collection: english ? 'EVENTS' : 'EVENT', intro: english ? 'Memories from events made to last.' : 'Αναμνήσεις από εκδηλώσεις που μένουν.', album: english ? 'Special moments from every event.' : 'Ξεχωριστές στιγμές από κάθε εκδήλωση.' },
    'airbnb-real-estate': { collection: english ? 'AIRBNB – REAL ESTATE' : 'AIRBNB – REAL ESTATE', intro: english ? 'Photography that presents every property at its best.' : 'Φωτογραφίες που αναδεικνύουν κάθε ακίνητο.', album: english ? 'Property details through our lens.' : 'Οι λεπτομέρειες κάθε ακινήτου μέσα από τον φακό μας.' }
  }[category];
  if (!copy) return;
  const collectionLabels = {
    'wedding.html': english ? 'Wedding' : 'Γάμος',
    'baptism.html': english ? 'Baptism' : 'Βάπτιση',
    'travel.html': 'Travel',
    'love-story.html': 'Love Story',
    'event.html': 'Event',
    'airbnb-real-estate.html': 'Airbnb – Real Estate'
  };
  document.querySelectorAll('.collection-links a[href]').forEach(link => {
    const key = (link.getAttribute('href') || '').split('#')[0];
    if (collectionLabels[key]) link.textContent = collectionLabels[key];
  });
  if (document.title) {
    document.title = english
      ? document.title.replace(/ΑΛΜΠΟΥΜ/g, 'ALBUM').replace(/ΓΑΜΟΣ/g, 'WEDDING').replace(/ΒΑΠΤΙΣΗ/g, 'BAPTISM').replace(/Απόρρητο/g, 'Privacy')
      : document.title.replace(/ALBUM/g, 'ΑΛΜΠΟΥΜ').replace(/WEDDING/g, 'ΓΑΜΟΣ').replace(/BAPTISM/g, 'ΒΑΠΤΙΣΗ').replace(/Privacy/g, 'Απόρρητο');
  }
  const header = document.querySelector('.gallery-header');
  if (header) {
    const title = header.querySelector('h1');
    const intro = header.querySelector('div p');
    if (title && !galleryNode) title.textContent = copy.collection;
    const albumTotal = header.querySelector(':scope > p:not(#gallery-count)');
    if (albumTotal && /άλμπουμ|albums/.test(albumTotal.textContent)) { const number = (albumTotal.textContent.match(/\d+/) || [''])[0]; albumTotal.textContent = number + (english ? ' albums' : ' άλμπουμ'); }
    if (intro) intro.textContent = copy.intro;
  }
  if (galleryNode) {
    const albumIntro = document.querySelector('.gallery-header div p');
    if (albumIntro) albumIntro.textContent = copy.album;
    const albumTitle = document.querySelector('.gallery-header h1');
    if (albumTitle) {
      const number = (albumTitle.textContent.match(/\d+/) || [''])[0];
      if (number) albumTitle.textContent = english ? `ALBUM ${number}` : `ΑΛΜΠΟΥΜ ${number}`;
    }
    const eyebrow = document.querySelector('.gallery-header small');
    if (eyebrow) eyebrow.textContent = english ? eyebrow.textContent.replace(/ΓΑΜΟΣ|ΒΑΠΤΙΣΗ|ΑΛΜΠΟΥΜ/g, m => m === 'ΓΑΜΟΣ' ? 'WEDDING' : m === 'ΒΑΠΤΙΣΗ' ? 'BAPTISM' : 'ALBUM') : eyebrow.textContent.replace(/WEDDING|BAPTISM|ALBUM/g, m => m === 'WEDDING' ? 'ΓΑΜΟΣ' : m === 'BAPTISM' ? 'ΒΑΠΤΙΣΗ' : 'ΑΛΜΠΟΥΜ');
  }
  const portfolioDescriptions = {
    wedding: {
      el: 'Κάθε γάμος είναι μια μοναδική ιστορία. Από την προετοιμασία μέχρι τη γιορτή, αποτυπώνουμε τις αυθεντικές στιγμές, τα συναισθήματα και τις λεπτομέρειες που θα θέλετε να θυμάστε για πάντα.',
      en: 'Every wedding is a unique story. From the preparations to the celebration, we capture the authentic moments, emotions and details you will want to remember forever.'
    },
    baptism: {
      el: 'Η βάφτιση είναι μια ξεχωριστή οικογενειακή στιγμή γεμάτη χαμόγελα, συγκίνηση και αγάπη. Κρατάμε ζωντανές όλες τις όμορφες λεπτομέρειες της ημέρας.',
      en: 'A baptism is a special family celebration filled with smiles, emotion and love. We preserve every beautiful detail of the day.'
    },
    travel: {
      el: 'Τα ταξίδια μας γεμίζουν εικόνες, ανθρώπους και ιστορίες. Ανακαλύψτε μέσα από τις φωτογραφίες μας τους προορισμούς και τις εμπειρίες που ξεχωρίσαμε.',
      en: 'Our journeys are filled with images, people and stories. Discover the destinations and experiences we found along the way.'
    },
    'love-story': {
      el: 'Οι πιο όμορφες ιστορίες αγάπης γράφονται στις μικρές στιγμές. Δημιουργούμε τρυφερές και αυθεντικές εικόνες που μιλούν για κάθε ζευγάρι.',
      en: 'The most beautiful love stories are written in the small moments. We create tender, authentic images that speak about every couple.'
    },
    event: {
      el: 'Κάθε εκδήλωση έχει τον δικό της ρυθμό και τη δική της ενέργεια. Αποτυπώνουμε τις στιγμές που κάνουν κάθε γιορτή πραγματικά ξεχωριστή.',
      en: 'Every event has its own rhythm and energy. We capture the moments that make each celebration truly special.'
    },
    'airbnb-real-estate': {
      el: 'Αναδεικνύουμε κάθε χώρο με καθαρές, φωτεινές και επαγγελματικές εικόνες που παρουσιάζουν την πραγματική του αξία.',
      en: 'We showcase every property with clean, bright and professional images that present its true value.'
    }
  };
  const descriptionHost = document.querySelector('.album-grid');
  if (descriptionHost && portfolioDescriptions[category]) {
    let description = document.querySelector('.portfolio-description');
    if (!description) {
      description = document.createElement('p');
      description.className = 'portfolio-description';
      descriptionHost.parentNode.insertBefore(description, descriptionHost);
    }
    description.textContent = portfolioDescriptions[category][english ? 'en' : 'el'];
  }
  document.querySelectorAll('.gallery-back').forEach(node => {
    node.textContent = galleryNode
      ? (english ? '← Back to albums' : '← Πίσω στα άλμπουμ')
      : (english ? '← Back to portfolio' : '← Πίσω στο portfolio');
  });
  document.querySelectorAll('.gallery-contact .btn').forEach(node => { node.textContent = english ? 'CONTACT US' : 'ΕΠΙΚΟΙΝΩΝΗΣΤΕ ΜΑΖΙ ΜΑΣ'; });
  document.querySelectorAll('.gallery-contact p').forEach(node => { if (node.textContent.trim()) node.textContent = english ? 'Would you like to create your next story with us?' : 'Θέλετε να δημιουργήσουμε μαζί την επόμενη ιστορία σας;'; });
  document.querySelectorAll('.album-card small').forEach(node => { node.textContent = node.textContent.replace(/^(ΑΛΜΠΟΥΜ|ALBUM)/, english ? 'ALBUM' : 'ΑΛΜΠΟΥΜ'); });
  document.querySelectorAll('.album-card h2').forEach(node => { const number = (node.textContent.match(/\d+/) || [''])[0]; node.textContent = english ? `ALBUM ${number}` : `ΑΛΜΠΟΥΜ ${number}`; });
  document.querySelectorAll('.album-card p').forEach(node => { const count = node.dataset.photoCount || (node.textContent.match(/\d+/) || [''])[0]; if (count) node.textContent = count + (english ? ' photos' : ' φωτογραφίες'); else node.textContent = english ? 'Ready for photos' : 'Έτοιμο για φωτογραφίες'; });
  document.querySelectorAll('.album-card span').forEach(node => { node.textContent = english ? 'OPEN ALBUM →' : 'ΑΝΟΙΞΤΕ ΤΟ ΑΛΜΠΟΥΜ →'; });
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
  applyPageLanguage(lang);
  if (save) writeLanguagePreference(lang);
}
document.querySelectorAll('[data-lang-choice]').forEach(button => {
  button.addEventListener('click', () => applyLanguage(button.dataset.langChoice, true));
});
applyLanguage(preferredLanguage());

// A cover named after each collection URL overrides its current image.
// Missing covers leave the existing photograph or gradient unchanged.
document.querySelectorAll('a.portfolio-category[href]:not(.album-card)').forEach(card => {
  if (card.classList.contains('wedding-cover') || card.classList.contains('baptism-cover') || card.classList.contains('event-cover')) return;
  const match = /^([a-z0-9-]+)\.html$/i.exec(card.getAttribute('href') || '');
  if (!match) return;
  const extension = card.dataset.coverExt === 'png' ? 'png' : 'jpg';
  const coverPath = `assets/images/covers/${match[1]}.${extension}`;
  const legacyCoverPath = `assets/images/covers/${match[1].replace(/-/g, ' ')}.${extension}`;
  const candidates = [...new Set([coverPath, legacyCoverPath])];
  const cover = new Image();
  let attempt = 0;
  const loadNextCover = () => {
    if (attempt >= candidates.length) return;
    cover.src = candidates[attempt++];
  };
  cover.onload = () => { card.style.backgroundImage = `url("${cover.src}")`; };
  cover.onerror = loadNextCover;
  loadNextCover();
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
      label.dataset.photoCount = String(count);
      label.textContent = count ? count + (document.documentElement.lang === 'en' ? ' photos' : ' φωτογραφίες') : (document.documentElement.lang === 'en' ? 'Ready for photos' : 'Έτοιμο για φωτογραφίες');
      const first = files.find(name => name.startsWith(prefix) && !name.slice(prefix.length).includes('/'));
      const coverCandidates = [`assets/images/covers/${match[1]}.jpg`, `assets/images/covers/${match[1]}.png`];
      let coverIndex = 0;
      const cover = new Image();
      const loadAlbumCover = () => {
        if (coverIndex < coverCandidates.length) cover.src = coverCandidates[coverIndex++];
        else if (first) card.style.backgroundImage = `url("${photoPath(first)}")`;
      };
      cover.onload = () => { card.style.backgroundImage = `url("${cover.src}")`; };
      cover.onerror = loadAlbumCover;
      loadAlbumCover();
    });
  }).catch(() => {});
}
