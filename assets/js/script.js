const gallery = document.getElementById('gallery');
const categoryLabels = { wedding: 'ΓΑΜΟΣ', baptism: 'ΒΑΠΤΙΣΗ', travel: 'TRAVEL', 'love-story': 'LOVE STORY', families: 'FAMILIES', event: 'EVENT', 'airbnb-real-estate': 'AIRBNB – REAL ESTATE' };
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
      const seo = window.PARDALOS_IMAGE_SEO?.[item.name];
      if (seo) {
        img.width = seo.width; img.height = seo.height;
        img.dataset.seoEl = seo.el; img.dataset.seoEn = seo.en;
        img.dataset.fullSrc = photoPath(item.name);
        img.src = seo.thumbnail;
      } else {
        img.addEventListener('load', () => { img.width = img.naturalWidth; img.height = img.naturalHeight; }, { once: true });
      }
      img.alt = category === 'wedding'
        ? 'Wedding photography in Rhodes, Greece — Pardalos Photos & Videos — ' + displayNumber
        : category === 'baptism'
          ? 'Baptism photography in Rhodes, Greece — Pardalos Photos & Videos — ' + displayNumber
          : category === 'airbnb-real-estate'
            ? 'Real estate and Airbnb photography in Rhodes, Greece — ' + displayNumber
            : ({ families: 'Family photography', 'love-story': 'Couple photography', event: 'Event photography', travel: 'Travel photography' }[category] || categoryLabel) + ' — Pardalos Photos & Videos — ' + displayNumber;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.onerror = () => { if (img.dataset.fullSrc && img.src !== new URL(img.dataset.fullSrc, document.baseURI).href) { img.src = img.dataset.fullSrc; } else { card.remove(); } };

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
    translateSharedLanguage(document.documentElement.lang);
  }

  if (!gallery.children.length) gallery.textContent = document.documentElement.lang === 'en' ? 'Loading photos…' : 'Φόρτωση φωτογραφιών…';
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
    image.src = source.dataset.fullSrc || source.src;
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
    'albums.pending': 'Για δείγματα φωτογράφισης, επικοινωνήστε μαζί μας.',
    'collection.families': 'Families',
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
    'services.familiesTitle': 'FAMILIES',
    'services.families': 'Φωτογραφίσεις οικογενειών με φυσικό και αυθεντικό ύφος.',
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
    'about.googleProfile': 'Βρείτε μας στο Google Maps',
    'about.googleReview': 'Μοιραστείτε την εμπειρία σας στο Google',
    'about.kicker': 'ΣΧΕΤΙΚΑ',
    'about.title': 'ΒΡΕΙΤΕ ΜΑΣ ΣΤΗ ΡΟΔΟ',
    'about.copy': 'Το Pardalos Photos & Videos είναι η φωτογραφική και βιντεογραφική παρουσία του Tsampikos Pardalos, με βάση το Αφάντου της Ρόδου. Καλύπτουμε γάμους και destination weddings στη Ρόδο, βαπτίσεις και εκδηλώσεις, καθώς και φωτογραφίσεις ζευγαριών, οικογενειών και ακινήτων.',
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
    'collection.families': 'Families',
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
    'services.familiesTitle': 'FAMILIES',
    'services.families': 'Natural and authentic photography for families.',
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
    'about.googleProfile': 'Find us on Google Maps',
    'about.googleReview': 'Share your experience on Google',
    'about.kicker': 'ABOUT',
    'about.title': 'FIND US IN RHODES',
    'about.copy': 'Pardalos Photos & Videos is the photography and videography business of Tsampikos Pardalos, based in Afantou, Rhodes. We cover weddings and destination weddings in Rhodes, baptisms and events, as well as couple, family and property photography.',
    'about.details': 'You can find us at P. Rammou 186, Afantou, Rhodes. For appointments or information, call us or send an email.',
    'contact.title': 'Let\'s create<br>your memories together!'
  }
};
Object.assign(translations.el, {"seo.wedding.0":"ΓΑΜΟΙ ΣΤΗ ΡΟΔΟ","seo.wedding.1":"Φωτογράφιση και βιντεογράφηση γάμου στη Ρόδο","seo.wedding.2":"Το Pardalos Photos & Videos προσφέρει επαγγελματική φωτογράφιση και βιντεογράφηση γάμου και λήψεις με drone στη Ρόδο. Συνεργαζόμαστε με ζευγάρια από την Ελλάδα και το εξωτερικό που επιλέγουν τη Ρόδο για τον γάμο τους, δημιουργώντας φυσικές, κομψές εικόνες και ταινίες που κρατούν την ατμόσφαιρα, τα συναισθήματα και τις λεπτομέρειες της ημέρας.","seo.wedding.3":"Σχεδιάζετε τον γάμο σας στη Ρόδο; Δείτε παρακάτω τα άλμπουμ πραγματικών γάμων και επικοινωνήστε μαζί μας για να συζητήσουμε φωτογραφία, βίντεο και λήψεις με drone για τη γιορτή σας.","seo.wedding.4":"ΣΧΕΔΙΑΖΟΝΤΑΣ ΤΟΝ ΓΑΜΟ ΣΑΣ ΣΤΗ ΡΟΔΟ","seo.wedding.5":"Φωτογράφιση γάμου στη Ρόδο — Συχνές ερωτήσεις","seo.wedding.6":"Φωτογραφίζετε γάμους ζευγαριών που ταξιδεύουν στη Ρόδο;","seo.wedding.7":"Ναι. Συνεργαζόμαστε με ζευγάρια που επιλέγουν τη Ρόδο για τον γάμο τους και παρέχουμε φωτογραφική και βιντεογραφική κάλυψη στο νησί.","seo.wedding.8":"Μπορεί η κάλυψη του γάμου να περιλαμβάνει βίντεο και drone;","seo.wedding.9":"Ναι. Μπορούμε να συζητήσουμε μαζί τη φωτογραφία, τη βιντεογράφηση και τις λήψεις με drone, ανάλογα με τις ανάγκες και το πρόγραμμα της ημέρας.","seo.wedding.10":"Πώς μπορούμε να ελέγξουμε τη διαθεσιμότητα για την ημερομηνία του γάμου μας;","seo.wedding.11":"Επικοινωνήστε με το Pardalos Photos & Videos με την ημερομηνία του γάμου σας και την κάλυψη που σας ενδιαφέρει, για να συζητήσουμε τη διαθεσιμότητα και τις κατάλληλες επιλογές.","seo.baptism.0":"ΦΩΤΟΓΡΑΦΙΣΗ ΒΑΠΤΙΣΗΣ · ΡΟΔΟΣ","seo.baptism.1":"Φωτογράφιση και βιντεογράφηση βάπτισης στη Ρόδο","seo.baptism.2":"Το Pardalos Photos & Videos παρέχει επαγγελματική φωτογράφιση και βιντεογράφηση βάπτισης στη Ρόδο, αποτυπώνοντας το μυστήριο, τις οικογενειακές στιγμές και τις σημαντικές λεπτομέρειες με φυσικό και διαχρονικό ύφος.","seo.baptism.3":"Δείτε παρακάτω τα άλμπουμ βάπτισης και επικοινωνήστε μαζί μας για να συζητήσουμε τη φωτογραφική και βιντεογραφική κάλυψη της βάπτισης του παιδιού σας στη Ρόδο.","seo.baptism.4":"Συχνές ερωτήσεις","seo.baptism.5":"Παρέχετε φωτογραφία και βίντεο βάπτισης στη Ρόδο;","seo.baptism.6":"Το Pardalos Photos & Videos παρέχει φωτογράφιση και βιντεογράφηση βάπτισης στη Ρόδο, αποτυπώνοντας το μυστήριο, τις οικογενειακές στιγμές και τις λεπτομέρειες.","seo.baptism.7":"Πώς μπορούμε να ελέγξουμε τη διαθεσιμότητα για μια βάπτιση;","seo.baptism.8":"Επικοινωνήστε μαζί μας με την ημερομηνία και την τοποθεσία της βάπτισης και πείτε μας αν σας ενδιαφέρει φωτογραφία, βίντεο ή και τα δύο.","seo.travel.0":"ΤΑΞΙΔΙΩΤΙΚΗ ΦΩΤΟΓΡΑΦΙΑ","seo.travel.1":"Ταξιδιωτική φωτογραφία με βάση τη Ρόδο","seo.travel.2":"Ταξιδιωτική φωτογραφία από το Pardalos Photos & Videos, με βάση τη Ρόδο. Δημιουργούμε οπτικές ιστορίες που αποτυπώνουν προορισμούς, ανθρώπους, εμπειρίες και επαγγελματικά ταξίδια.","seo.travel.3":"Δείτε παρακάτω τα ταξιδιωτικά μας άλμπουμ και ανακαλύψτε ιστορίες από προορισμούς πέρα από τη Ρόδο και από διαφορετικές τοποθεσίες.","seo.love-story.0":"ΦΩΤΟΓΡΑΦΙΣΗ ΖΕΥΓΑΡΙΩΝ · ΡΟΔΟΣ","seo.love-story.1":"Φωτογράφιση ζευγαριών και ιστοριών αγάπης στη Ρόδο","seo.love-story.2":"Ρομαντικές φωτογραφίσεις ζευγαριών στη Ρόδο για αρραβώνες, διακοπές, προτάσεις γάμου και ιστορίες αγάπης, με φόντο τα τοπία και το φυσικό φως του νησιού.","seo.love-story.3":"Δείτε τα άλμπουμ ζευγαριών μας και επικοινωνήστε μαζί μας για να σχεδιάσουμε μια χαλαρή φωτογράφιση στη Ρόδο.","seo.love-story.4":"Συχνές ερωτήσεις","seo.love-story.5":"Προσφέρετε φωτογράφιση ζευγαριών;","seo.love-story.6":"Το Pardalos Photos & Videos προσφέρει ρομαντικές φωτογραφίσεις ζευγαριών στη Ρόδο.","seo.love-story.7":"Πώς μπορούμε να οργανώσουμε μια φωτογράφιση ζευγαριού;","seo.love-story.8":"Επικοινωνήστε μαζί μας με την ημερομηνία που προτιμάτε και τις ιδέες σας, για να συζητήσουμε την τοποθεσία και τη φωτογράφιση.","seo.event.0":"ΦΩΤΟΓΡΑΦΙΣΗ ΕΚΔΗΛΩΣΕΩΝ · ΡΟΔΟΣ","seo.event.1":"Φωτογράφιση και βιντεογράφηση εκδηλώσεων στη Ρόδο","seo.event.2":"Επαγγελματική φωτογράφιση και βιντεογράφηση εκδηλώσεων στη Ρόδο για ιδιωτικές γιορτές, πάρτι και ξεχωριστές περιστάσεις, με έμφαση στους ανθρώπους, την ατμόσφαιρα και τις λεπτομέρειες της εκδήλωσης.","seo.event.3":"Δείτε τις συλλογές εκδηλώσεων και επικοινωνήστε με το Pardalos Photos & Videos για φωτογραφική και βιντεογραφική κάλυψη στη Ρόδο.","seo.event.4":"Συχνές ερωτήσεις","seo.event.5":"Φωτογραφίζετε εκδηλώσεις στη Ρόδο;","seo.event.6":"Το Pardalos Photos & Videos παρέχει φωτογράφιση εκδηλώσεων στη Ρόδο.","seo.event.7":"Πώς μπορούμε να συζητήσουμε την κάλυψη της εκδήλωσής μας;","seo.event.8":"Επικοινωνήστε μαζί μας με την ημερομηνία, την τοποθεσία και το είδος της εκδήλωσης, για να συζητήσουμε διαθεσιμότητα και φωτογραφική ή βιντεογραφική κάλυψη.","seo.airbnb-real-estate.0":"ΦΩΤΟΓΡΑΦΙΣΗ ΑΚΙΝΗΤΩΝ · ΡΟΔΟΣ","seo.airbnb-real-estate.1":"Φωτογράφιση Airbnb και ακινήτων στη Ρόδο","seo.airbnb-real-estate.2":"Επαγγελματική φωτογράφιση ακινήτων στη Ρόδο για καταχωρίσεις Airbnb, βίλες, καταλύματα διακοπών και ακίνητα. Δημιουργούμε καθαρές, ελκυστικές εικόνες που παρουσιάζουν με σαφήνεια τον χώρο, τον σχεδιασμό και τον χαρακτήρα κάθε ακινήτου.","seo.airbnb-real-estate.3":"Δείτε τις φωτογραφίσεις ακινήτων μας και επικοινωνήστε μαζί μας για φωτογράφιση Airbnb, βίλας ή ακινήτου στη Ρόδο.","seo.airbnb-real-estate.4":"Συχνές ερωτήσεις","seo.airbnb-real-estate.5":"Τι είδη ακινήτων φωτογραφίζετε στη Ρόδο;","seo.airbnb-real-estate.6":"Φωτογραφίζουμε ακίνητα Airbnb, βίλες, καταλύματα διακοπών και ακίνητα στη Ρόδο.","seo.airbnb-real-estate.7":"Πώς μπορούμε να ζητήσουμε φωτογράφιση ακινήτου;","seo.airbnb-real-estate.8":"Επικοινωνήστε μαζί μας με την τοποθεσία και το είδος του ακινήτου, την ημερομηνία που προτιμάτε και τις εικόνες που χρειάζεστε για την καταχώρισή σας.","seo.families.0":"ΟΙΚΟΓΕΝΕΙΑΚΗ ΦΩΤΟΓΡΑΦΙΑ · ΡΟΔΟΣ","seo.families.1":"Οικογενειακή φωτογράφιση στη Ρόδο","seo.families.2":"Φυσικές οικογενειακές φωτογραφίσεις στη Ρόδο για οικογένειες που θέλουν χαλαρά, αυθεντικά πορτρέτα στις διακοπές, στις γιορτές ή στις καθημερινές στιγμές τους στο νησί.","seo.families.3":"Δείτε τις οικογενειακές μας συλλογές και επικοινωνήστε με το Pardalos Photos & Videos για να οργανώσουμε μια οικογενειακή φωτογράφιση στη Ρόδο.","seo.families.4":"Συχνές ερωτήσεις","seo.families.5":"Προσφέρετε οικογενειακές φωτογραφίσεις στη Ρόδο;","seo.families.6":"Προσφέρουμε φυσικά οικογενειακά πορτρέτα και φωτογραφίσεις διακοπών στη Ρόδο.","seo.families.7":"Πώς μπορούμε να κανονίσουμε μια οικογενειακή φωτογράφιση;","seo.families.8":"Επικοινωνήστε με το Pardalos Photos & Videos για να συζητήσουμε την ημερομηνία, την τοποθεσία και τις οικογενειακές φωτογραφίες που θα θέλατε.","hero.seo":"Φωτογράφος γάμου στη Ρόδο","portfolio.collection7":"07 / ΣΥΛΛΟΓΗ","contact.location":"Τοποθεσία","contact.city":"Αφάντου, Ρόδος","contact.address":"⌖   Π. Ράμμου 186","wedding.seo":"Φωτογράφος γάμου στη Ρόδο","collection.travel":"Ταξίδια","collection.loveStory":"Ζευγάρια","collection.families":"Οικογένειες","collection.event":"Εκδηλώσεις","collection.realestate":"Airbnb – Ακίνητα","services.travelTitle":"ΤΑΞΙΔΙΑ","services.loveTitle":"ΖΕΥΓΑΡΙΑ","services.familiesTitle":"ΟΙΚΟΓΕΝΕΙΕΣ","services.videoTitle":"ΒΙΝΤΕΟ & DRONE","services.realestateTitle":"AIRBNB – ΑΚΙΝΗΤΑ","portfolio.travel":"ΤΑΞΙΔΙΑ","portfolio.love":"ΖΕΥΓΑΡΙΑ","portfolio.event":"ΕΚΔΗΛΩΣΕΙΣ","portfolio.realestate":"AIRBNB<br>ΑΚΙΝΗΤΑ","services.love":"Ρομαντικές φωτογραφίσεις ζευγαριών σε όμορφα μέρη."});
Object.assign(translations.en, {"seo.wedding.0":"DESTINATION WEDDINGS · RHODES, GREECE","seo.wedding.1":"Wedding Photography & Videography in Rhodes","seo.wedding.2":"Pardalos Photos & Videos offers professional wedding photography, wedding videography and drone coverage in Rhodes, Greece. We work with local and international couples who choose Rhodes for their wedding, creating natural, elegant images and films that preserve the atmosphere, emotions and details of the day.","seo.wedding.3":"Planning a destination wedding in Rhodes? Explore our real wedding albums below and contact us to discuss photography, video and drone coverage for your celebration.","seo.wedding.4":"PLANNING A WEDDING IN RHODES","seo.wedding.5":"Wedding Photography in Rhodes — Frequently Asked Questions","seo.wedding.6":"Do you photograph destination weddings in Rhodes?","seo.wedding.7":"Yes. We work with couples who choose Rhodes for their wedding and provide photography and videography coverage on the island.","seo.wedding.8":"Can wedding coverage include both video and drone?","seo.wedding.9":"Yes. Photography, wedding videography and drone coverage can be discussed together according to the needs and schedule of the wedding day.","seo.wedding.10":"How can we check availability for our wedding date?","seo.wedding.11":"Contact Pardalos Photos & Videos with your wedding date and the coverage you are interested in, and we can discuss availability and the suitable options.","seo.baptism.0":"BAPTISM PHOTOGRAPHY · RHODES, GREECE","seo.baptism.1":"Baptism Photography & Videography in Rhodes","seo.baptism.2":"Pardalos Photos & Videos provides professional baptism photography and videography in Rhodes, capturing the ceremony, family moments and meaningful details with a natural and timeless approach.","seo.baptism.3":"Explore our baptism albums below and contact us to discuss photography and video coverage for your child’s baptism in Rhodes.","seo.baptism.4":"Frequently Asked Questions","seo.baptism.5":"Do you provide baptism photography and video in Rhodes?","seo.baptism.6":"Pardalos Photos & Videos provides baptism photography and videography in Rhodes, capturing the ceremony, family moments and details.","seo.baptism.7":"How can we check availability for a baptism?","seo.baptism.8":"Contact us with the date and location of the baptism and tell us whether you are interested in photography, video or both.","seo.travel.0":"TRAVEL & DESTINATION PHOTOGRAPHY","seo.travel.1":"Travel & Destination Photography from Rhodes","seo.travel.2":"Travel and destination photography by Pardalos Photos & Videos, based in Rhodes, Greece. We create visual stories that document destinations, people, experiences and professional trips.","seo.travel.3":"Explore our travel albums below to see destination stories photographed beyond Rhodes and across different locations.","seo.love-story.0":"COUPLES PHOTOGRAPHY · RHODES, GREECE","seo.love-story.1":"Couples & Love Story Photography in Rhodes","seo.love-story.2":"Romantic couples photography in Rhodes for engagements, holidays, proposals and love story sessions, created around the island’s landscapes and natural light.","seo.love-story.3":"Browse our love story albums and contact us to plan a relaxed couples photo session in Rhodes, Greece.","seo.love-story.4":"Frequently Asked Questions","seo.love-story.5":"Do you offer couple photography?","seo.love-story.6":"Pardalos Photos & Videos offers romantic couple photography in Rhodes.","seo.love-story.7":"How can we plan a couple photo session?","seo.love-story.8":"Contact us with your preferred date and ideas so we can discuss the location and photo session.","seo.event.0":"EVENT PHOTOGRAPHY · RHODES, GREECE","seo.event.1":"Event Photography & Videography in Rhodes","seo.event.2":"Professional event photography and videography in Rhodes for private celebrations, parties and special occasions, with attention to people, atmosphere and the details of the event.","seo.event.3":"Explore our event galleries and contact Pardalos Photos & Videos for photography and video coverage in Rhodes.","seo.event.4":"Frequently Asked Questions","seo.event.5":"Do you photograph events in Rhodes?","seo.event.6":"Pardalos Photos & Videos provides event photography in Rhodes.","seo.event.7":"How can we discuss coverage for our event?","seo.event.8":"Contact us with the event date, location and type of celebration to discuss availability and photography or video coverage.","seo.airbnb-real-estate.0":"PROPERTY PHOTOGRAPHY · RHODES, GREECE","seo.airbnb-real-estate.1":"Airbnb & Real Estate Photographer in Rhodes","seo.airbnb-real-estate.2":"Professional property photography in Rhodes for Airbnb listings, villas, holiday rentals and real estate. We create clean, inviting images that clearly present the space, design and character of each property.","seo.airbnb-real-estate.3":"Explore our property portfolio and contact us for Airbnb, villa or real estate photography in Rhodes.","seo.airbnb-real-estate.4":"Frequently Asked Questions","seo.airbnb-real-estate.5":"What types of properties do you photograph in Rhodes?","seo.airbnb-real-estate.6":"We photograph Airbnb properties, villas, holiday rentals and real estate in Rhodes.","seo.airbnb-real-estate.7":"How can we request property photography?","seo.airbnb-real-estate.8":"Contact us with the property location and type, your preferred date and the images you need for your listing.","seo.families.0":"FAMILY PHOTOGRAPHY · RHODES, GREECE","seo.families.1":"Family Photographer in Rhodes","seo.families.2":"Natural family photography in Rhodes for families who want relaxed, authentic portraits during holidays, celebrations or everyday moments on the island.","seo.families.3":"Explore our family galleries and contact Pardalos Photos & Videos to plan a family photo session in Rhodes.","seo.families.4":"Frequently Asked Questions","seo.families.5":"Do you offer family photo sessions in Rhodes?","seo.families.6":"We offer natural family portraits and holiday photo sessions in Rhodes.","seo.families.7":"How can we arrange a family photo session?","seo.families.8":"Contact Pardalos Photos & Videos to discuss your preferred date, location and the family photographs you would like.","hero.seo":"Wedding Photographer in Rhodes, Greece","portfolio.collection7":"07 / COLLECTION","contact.location":"Location","contact.city":"Afantou, Rhodes","contact.address":"⌖   P. Rammou 186","wedding.seo":"Wedding Photographer in Rhodes, Greece","albums.pending":"For photography samples, please contact us."});
Object.assign(translations.el,{"privacy.0":"Απόρρητο και στατιστικά επισκεψιμότητας","privacy.1":"Το Pardalos Photos & Videos χρησιμοποιεί το Google Analytics 4 για να κατανοεί πόσοι επισκέπτονται τον ιστότοπο, ποιες σελίδες βλέπουν, από ποιον σύνδεσμο έφτασαν εδώ (για παράδειγμα από Viber, Instagram ή Facebook) και βασικές αλληλεπιδράσεις όπως κύλιση της σελίδας και κλικ σε εξωτερικούς συνδέσμους.","privacy.2":"Η επιλογή σας","privacy.3":"Το Google Analytics φορτώνεται μόνο αν επιλέξετε «Αποδοχή» στο σχετικό μήνυμα. Αν επιλέξετε «Όχι, ευχαριστώ», δεν φορτώνεται. Η επιλογή αποθηκεύεται τοπικά στον browser σας, ώστε να μην εμφανίζεται το μήνυμα σε κάθε σελίδα. Μπορείτε να την αλλάξετε από τον σύνδεσμο «Ρυθμίσεις στατιστικών» στο κάτω μέρος του site.","privacy.4":"Τι μετράμε","privacy.5":"Οι αναφορές περιλαμβάνουν συγκεντρωτικά στοιχεία επισκέψεων, σελίδων και πηγής κίνησης. Οι σύνδεσμοι που κοινοποιούμε μπορεί να περιέχουν παραμέτρους <code>utm_source</code> και <code>utm_medium</code> για να ξεχωρίζουμε την εφαρμογή προέλευσης. Δεν χρησιμοποιούμε τα στατιστικά για να βλέπουμε ονόματα συγκεκριμένων επισκεπτών.","privacy.6":"Για περισσότερες πληροφορίες σχετικά με την επεξεργασία από την Google, δείτε την <a href=\"https://policies.google.com/privacy\" target=\"_blank\" rel=\"noopener noreferrer\">Πολιτική απορρήτου της Google</a>.","privacy.7":"Επικοινωνία","privacy.8":"Για ερωτήσεις σχετικά με τον ιστότοπο και τα στατιστικά μπορείτε να επικοινωνήσετε στο <a href=\"mailto:pardalosphotos@hotmail.com\">pardalosphotos@hotmail.com</a>.","privacy.9":"<a href=\"index.html\">← Επιστροφή στην αρχική σελίδα</a>"});
Object.assign(translations.en,{"privacy.0":"Privacy and visitor statistics","privacy.1":"Pardalos Photos & Videos uses Google Analytics 4 to understand how many people visit the website, which pages they view, which link brought them here (for example Viber, Instagram or Facebook) and basic interactions such as scrolling and clicking external links.","privacy.2":"Your choice","privacy.3":"Google Analytics loads only if you select “Accept” in the notice. If you select “No, thank you”, it does not load. Your choice is stored locally in your browser so the notice does not appear on every page. You can change it using “Analytics settings” at the bottom of the site.","privacy.4":"What we measure","privacy.5":"Reports include aggregate visits, pages and traffic sources. Shared links may contain <code>utm_source</code> and <code>utm_medium</code> parameters to identify the source app. We do not use analytics to view individual visitors’ names.","privacy.6":"For more information about Google’s processing, see the <a href=\"https://policies.google.com/privacy\" target=\"_blank\" rel=\"noopener noreferrer\">Google Privacy Policy</a>.","privacy.7":"Contact","privacy.8":"For questions about the website and analytics, contact <a href=\"mailto:pardalosphotos@hotmail.com\">pardalosphotos@hotmail.com</a>.","privacy.9":"<a href=\"index.html\">← Back to the home page</a>"});
Object.assign(translations.el, {
  'about.personKicker': 'Ο ΑΝΘΡΩΠΟΣ ΠΙΣΩ ΑΠΟ ΤΟΝ ΦΑΚΟ',
  'about.personCopy': 'Το Pardalos Photos & Videos είναι η φωτογραφική και βιντεογραφική δουλειά του Tsabickos Pardalos, με βάση το Αφάντου της Ρόδου. Στόχος μας είναι η φυσική, προσεγμένη αποτύπωση ανθρώπων και πραγματικών στιγμών, από γάμους και destination weddings μέχρι οικογενειακές φωτογραφίσεις και επαγγελματικούς χώρους.',
  'about.reviewKicker': 'ΕΜΠΙΣΤΟΣΥΝΗ & ΑΞΙΟΛΟΓΗΣΕΙΣ',
  'about.reviewTitle': 'Η εμπειρία των πελατών μας μετράει',
  'about.reviewCopy': 'Οι πραγματικές αξιολογήσεις βοηθούν τα νέα ζευγάρια και τους πελάτες μας να γνωρίσουν καλύτερα τον τρόπο που δουλεύουμε. Δείτε το προφίλ μας στη Google ή, αν έχουμε ήδη συνεργαστεί, μοιραστείτε τη δική σας εμπειρία.',
  'about.viewGoogle': 'ΔΕΙΤΕ ΜΑΣ ΣΤΟ GOOGLE',
  'about.leaveReview': 'ΓΡΑΨΤΕ ΑΞΙΟΛΟΓΗΣΗ'
});
Object.assign(translations.en, {
  'about.personKicker': 'BEHIND THE CAMERA',
  'about.personCopy': 'Pardalos Photos & Videos is the photography and videography work of Tsabickos Pardalos, based in Afantou, Rhodes. Our focus is natural, thoughtful storytelling for weddings, destination weddings, family sessions and professional spaces.',
  'about.reviewKicker': 'TRUST & REVIEWS',
  'about.reviewTitle': 'Real experiences from our clients',
  'about.reviewCopy': 'Real reviews help couples and clients understand how we work. Visit our Google profile or share your experience if we have already worked together.',
  'about.viewGoogle': 'VIEW ON GOOGLE',
  'about.leaveReview': 'LEAVE A REVIEW'
});
function readLanguagePreference() {
  try { return localStorage.getItem(languageKey); } catch { return null; }
}
function writeLanguagePreference(lang) {
  try { localStorage.setItem(languageKey, lang); } catch { /* Storage may be unavailable. */ }
}
function preferredLanguage() {
  const requested = new URLSearchParams(location.search).get('lang');
  if (requested === 'el' || requested === 'en') return requested;
  const saved = readLanguagePreference();
  if (saved === 'el' || saved === 'en') return saved;
  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return browserLanguages.some(lang => String(lang).toLowerCase().startsWith('el')) ? 'el' : 'en';
}
function applyPageLanguage(lang) {
  const english = lang === 'en';
  const galleryNode = document.getElementById('gallery');
  const path = location.pathname.toLowerCase();
  const category = galleryNode?.dataset.category || (path.match(/(wedding|baptism|travel|love-story|families|event|airbnb-real-estate)/)?.[1] || '');
  const copy = {
    families: { collection: english ? 'FAMILIES' : 'ΟΙΚΟΓΕΝΕΙΕΣ', intro: english ? 'Natural family portraits in Rhodes.' : 'Φυσικά οικογενειακά πορτρέτα στη Ρόδο.', album: english ? 'Family moments through our lens.' : 'Οικογενειακές στιγμές μέσα από τον φακό μας.' },
    wedding: { collection: english ? 'WEDDINGS' : 'ΓΑΜΟΣ', intro: english ? 'Choose an album to view the photographs.' : 'Επιλέξτε ένα άλμπουμ για να δείτε τις φωτογραφίες.', album: english ? 'Wedding moments through our lens.' : 'Στιγμές γάμου μέσα από τον φακό μας.' },
    baptism: { collection: english ? 'BAPTISM' : 'ΒΑΠΤΙΣΗ', intro: english ? 'Choose an album to view the photographs.' : 'Επιλέξτε ένα άλμπουμ για να δείτε τις φωτογραφίες.', album: english ? 'Tender moments and family memories.' : 'Τρυφερές στιγμές και οικογενειακές αναμνήσεις.' },
    travel: { collection: english ? 'TRAVEL' : 'ΤΑΞΙΔΙΑ', intro: english ? 'Images and stories from our professional journeys.' : 'Εικόνες και ιστορίες από τα επαγγελματικά μας ταξίδια.', album: english ? 'Places, people and stories from every journey.' : 'Τόποι, άνθρωποι και ιστορίες από κάθε ταξίδι.' },
    'love-story': { collection: english ? 'LOVE STORY' : 'ΖΕΥΓΑΡΙΑ', intro: english ? 'Choose an album to discover each love story.' : 'Επιλέξτε ένα άλμπουμ για να ανακαλύψετε κάθε ιστορία αγάπης.', album: english ? 'Romantic moments captured with care.' : 'Ρομαντικές στιγμές αποτυπωμένες με φροντίδα.' },
    event: { collection: english ? 'EVENTS' : 'ΕΚΔΗΛΩΣΕΙΣ', intro: english ? 'Memories from events made to last.' : 'Αναμνήσεις από εκδηλώσεις που μένουν.', album: english ? 'Special moments from every event.' : 'Ξεχωριστές στιγμές από κάθε εκδήλωση.' },
    'airbnb-real-estate': { collection: english ? 'AIRBNB – REAL ESTATE' : 'AIRBNB – ΑΚΙΝΗΤΑ', intro: english ? 'Photography that presents every property at its best.' : 'Φωτογραφίες που αναδεικνύουν κάθε ακίνητο.', album: english ? 'Property details through our lens.' : 'Οι λεπτομέρειες κάθε ακινήτου μέσα από τον φακό μας.' }
  }[category];
  const collectionLabels = {
    'wedding.html': english ? 'Wedding' : 'Γάμος',
    'baptism.html': english ? 'Baptism' : 'Βάπτιση',
    'travel.html': english ? 'Travel' : 'Ταξίδια',
    'love-story.html': english ? 'Love Story' : 'Ζευγάρια',
    'event.html': english ? 'Event' : 'Εκδηλώσεις',
    'airbnb-real-estate.html': english ? 'Airbnb – Real Estate' : 'Airbnb – Ακίνητα',
    'families.html': english ? 'Families' : 'Οικογένειες'
  };
  document.querySelectorAll('.collection-links a[href]').forEach(link => {
    const key = (link.getAttribute('href') || '').split('#')[0].split('?')[0];
    if (collectionLabels[key]) {
      link.textContent = collectionLabels[key];
      link.setAttribute('aria-label', collectionLabels[key]);
    }
  });
  if (!copy) {
    document.querySelectorAll('.gallery-back').forEach(node => { node.textContent = english ? '← Back to portfolio' : '← Πίσω στο portfolio'; });
    return;
  }
  if (document.title) {
    document.title = english
      ? document.title.replace(/ΑΛΜΠΟΥΜ/g, 'ALBUM').replace(/ΓΑΜΟΣ/g, 'WEDDING').replace(/ΒΑΠΤΙΣΗ/g, 'BAPTISM').replace(/Απόρρητο/g, 'Privacy')
      : document.title.replace(/ALBUM/g, 'ΑΛΜΠΟΥΜ').replace(/WEDDING/g, 'ΓΑΜΟΣ').replace(/BAPTISM/g, 'ΒΑΠΤΙΣΗ').replace(/Privacy/g, 'Απόρρητο');
  }
  const header = document.querySelector('.gallery-header');
  if (header) {
    const title = header.querySelector('h1');
    const intro = header.querySelector('div p');
    if (title && !galleryNode && !title.dataset.seoEl) title.textContent = copy.collection;
    const albumTotal = header.querySelector(':scope > p:not(#gallery-count)');
    if (albumTotal && /άλμπουμ|albums/.test(albumTotal.textContent)) { const number = (albumTotal.textContent.match(/\d+/) || [''])[0]; albumTotal.textContent = number + (english ? ' albums' : ' άλμπουμ'); }
    if (intro) intro.textContent = copy.intro;
  }
  if (galleryNode) {
    const albumIntro = document.querySelector('.gallery-header div p');
    if (albumIntro) albumIntro.textContent = copy.album;
    const albumTitle = document.querySelector('.gallery-header h1');
    if (albumTitle && !albumTitle.dataset.seoEl) {
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
    },
    families: {
      el: 'Οικογενειακές στιγμές γεμάτες φυσικότητα, χαμόγελα και αληθινή σύνδεση. Δημιουργούμε εικόνες που θα κρατήσετε για πάντα.',
      en: 'Family moments filled with natural emotion, smiles and connection. We create images you will treasure forever.'
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
  // Keep the selected language visible on links that do not carry data-i18n.
  document.querySelectorAll('.collection-links a[href]').forEach(link => {
    const key = (link.getAttribute('href') || '').split('#')[0].split('?')[0];
    if (collectionLabels[key]) link.textContent = collectionLabels[key];
  });
}

function translateSharedLanguage(lang) {
 const en = lang === 'en';
 document.querySelectorAll('[data-seo-el][data-seo-en]').forEach(node => { const text = en ? node.dataset.seoEn : node.dataset.seoEl; if (node.tagName === 'IMG') node.alt = text; else node.textContent = text; });
 document.querySelectorAll('[data-i18n-alt-el][data-i18n-alt-en]').forEach(node => { node.alt = en ? node.dataset.i18nAltEn : node.dataset.i18nAltEl; });
 if (document.querySelector('.privacy-main')) document.title = (en ? 'Privacy' : 'Απόρρητο') + ' | Pardalos Photos & Videos';
 document.querySelectorAll('[data-faq-schema]').forEach(node => {
  const schema = JSON.parse(node.textContent);
  schema.inLanguage = lang;
  schema.mainEntity = Array.from(document.querySelectorAll('.wedding-faq details')).map(item => ({
   '@type': 'Question', name: item.querySelector('summary').textContent,
   acceptedAnswer: { '@type': 'Answer', text: item.querySelector('p').textContent }
  }));
  node.textContent = JSON.stringify(schema);
 });
 const count = document.getElementById('gallery-count');
 if (count) { const n = count.textContent.match(/\d+/); if (n) count.textContent = n[0] + (en ? ' photos' : ' φωτογραφίες'); }
 document.querySelectorAll('.album-empty strong').forEach(n => { n.textContent = en ? 'The album is ready.' : 'Το άλμπουμ είναι έτοιμο.'; });
 document.querySelectorAll('.album-empty span').forEach(n => { n.textContent = en ? 'Photos will be added soon.' : 'Οι φωτογραφίες θα προστεθούν σύντομα.'; });
 document.querySelectorAll('.nav-toggle').forEach(n => n.setAttribute('aria-label', en ? 'Menu' : 'Μενού'));
 document.querySelectorAll('.header-phone').forEach(n => n.setAttribute('aria-label', en ? 'Call 694 643 3743' : 'Καλέστε στο 694 643 3743'));
 document.querySelectorAll('.collection-links').forEach(n => n.setAttribute('aria-label', en ? 'Portfolio categories' : 'Κατηγορίες Portfolio'));
 document.querySelectorAll('.lightbox-close, .lightbox button[aria-label="Κλείσιμο"], .lightbox button[aria-label="Close"]').forEach(n => n.setAttribute('aria-label', en ? 'Close' : 'Κλείσιμο'));
 document.querySelectorAll('.lightbox-prev').forEach(n => n.setAttribute('aria-label', en ? 'Previous photo' : 'Προηγούμενη φωτογραφία'));
 document.querySelectorAll('.lightbox-next').forEach(n => n.setAttribute('aria-label', en ? 'Next photo' : 'Επόμενη φωτογραφία'));
 const labels = en ? {wedding:'WEDDING', baptism:'BAPTISM', travel:'TRAVEL', 'love-story':'LOVE STORY', families:'FAMILIES', event:'EVENT', 'airbnb-real-estate':'AIRBNB – REAL ESTATE'} : {wedding:'ΓΑΜΟΣ', baptism:'ΒΑΠΤΙΣΗ', travel:'ΤΑΞΙΔΙΑ', 'love-story':'ΖΕΥΓΑΡΙΑ', families:'ΟΙΚΟΓΕΝΕΙΕΣ', event:'ΕΚΔΗΛΩΣΕΙΣ', 'airbnb-real-estate':'AIRBNB – ΑΚΙΝΗΤΑ'};
 document.querySelectorAll('.lightbox[role="dialog"]').forEach(n => n.setAttribute('aria-label', en ? 'Photo viewer' : 'Προβολή φωτογραφίας'));
 const category = document.getElementById('gallery')?.dataset.category;
 document.querySelectorAll('#gallery .portfolio-card').forEach(card => {
  const number = card.querySelector('.cap small')?.textContent || '';
  const cap = card.querySelector('.cap');
  if (cap?.firstChild) cap.firstChild.textContent = labels[category] || '';
  card.setAttribute('aria-label', (en ? 'Open photo ' : 'Άνοιγμα φωτογραφίας ') + number + ' — ' + (labels[category] || ''));
  const img = card.querySelector('img');
  if(img && !img.dataset.seoEl) img.alt = (labels[category] || '') + ' — Pardalos Photos & Videos — ' + number;
 });
 const eyebrow = document.querySelector('.gallery-header small');
 if (category && eyebrow) { const number = eyebrow.textContent.match(/\d+/)?.[0]; eyebrow.textContent = (labels[category] || '') + (number ? ' / ' + (en ? 'ALBUM ' : 'ΑΛΜΠΟΥΜ ') + number : ''); }
 document.querySelectorAll('footer .footer-row > span:first-child').forEach(n => n.textContent = '© 2026 Pardalos Photos & Videos · ' + (en ? 'Rhodes, Greece' : 'Ρόδος, Ελλάδα'));
}

// Android download card — bilingual text for the existing language switcher.
Object.assign(translations.el, {
  'app.kicker': 'PARDALOS PHOTOS APP',
  'app.title': 'Οι εκτυπώσεις σου, πιο εύκολα από ποτέ.',
  'app.description': 'Επίλεξε τις αγαπημένες σου φωτογραφίες, διάσταση και ποσότητα, και στείλε την παραγγελία σου απευθείας από το κινητό. Διάλεξε παραλαβή από το κατάστημα ή Delivery στον χώρο σου.',
  'app.pickup': 'Παραλαβή από το κατάστημα',
  'app.delivery': 'Delivery στον χώρο σου',
  'app.download': 'ΚΑΤΕΒΑΣΕ ΤΗΝ ΕΦΑΡΜΟΓΗ',
  'app.note': 'Για Android · Έκδοση 1.2.4 · Αρχείο APK'
});
Object.assign(translations.en, {
  'app.kicker': 'PARDALOS PHOTOS APP',
  'app.title': 'Your photo prints, made simple.',
  'app.description': 'Choose your favorite photos, print sizes and quantities, then place your order right from your phone. Select in-store pickup or delivery to your address.',
  'app.pickup': 'In-store pickup',
  'app.delivery': 'Delivery to your address',
  'app.download': 'DOWNLOAD THE APP',
  'app.note': 'For Android · Version 1.2.4 · APK file'
});

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
  translateSharedLanguage(lang);
  document.dispatchEvent(new CustomEvent('pardalos:language', { detail: { lang } }));
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

// Album cards use the same published file list as the galleries.
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
      // The first wedding album also contains the original photos stored in assets/images.
      const originalCount = match[1] === 'wedding-1' ? Number.parseInt(label.textContent, 10) || 0 : 0;
      const count = originalCount + folderCount;
      if (!count) { card.remove(); return; }
      label.dataset.photoCount = String(count);
      label.textContent = count ? count + (document.documentElement.lang === 'en' ? ' photos' : ' φωτογραφίες') : (document.documentElement.lang === 'en' ? 'Ready for photos' : 'Έτοιμο για φωτογραφίες');
      if (card.dataset.cover) { card.style.backgroundImage = `url("${card.dataset.cover}")`; return; }
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
