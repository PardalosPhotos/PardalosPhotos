// Standalone English pages only need header interactions, not gallery or translation code.
const toggle = document.querySelector('.nav-toggle');
const navigation = document.querySelector('.navlinks');
if (toggle && navigation) {
  const closeMenu = () => {
    navigation.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', () => {
    const open = navigation.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navigation.classList.contains('open')) {
      closeMenu();
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 761px)').addEventListener('change', event => {
    if (event.matches) closeMenu();
  });
}

// Keep language links on the complete bilingual page and persist the explicit choice.
document.querySelectorAll('.language-switcher a[hreflang]').forEach(link => {
  link.addEventListener('click', () => {
    const lang = link.getAttribute('hreflang');
    if (lang === 'el' || lang === 'en') {
      try { localStorage.setItem('pardalos-language-v1', lang); } catch { /* Storage may be unavailable. */ }
    }
  });
});
