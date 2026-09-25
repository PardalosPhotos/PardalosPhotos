(() => {
  // Add the Google Analytics 4 Measurement ID (G-...) after creating the web stream.
  // No Google script or request is loaded while this value is empty.
  const measurementId = 'G-SBRCC58KJ0';
  if (!/^G-[A-Z0-9]+$/.test(measurementId)) return;

  const choiceKey = 'pardalos-analytics-choice-v1';
  let started = false;
  let banner;

  function readChoice() {
    try { return localStorage.getItem(choiceKey); } catch { return null; }
  }

  function writeChoice(choice) {
    try { localStorage.setItem(choiceKey, choice); } catch { /* Storage may be blocked. */ }
  }

  function loadAnalytics() {
    if (started) return;
    started = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { allow_google_signals: false, allow_ad_personalization_signals: false });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.appendChild(tag);
  }

  function choose(choice) {
    const wasStarted = started;
    writeChoice(choice);
    banner.hidden = true;
    if (choice === 'accepted') loadAnalytics();
    // A reload stops an already loaded tag after consent is withdrawn.
    if (choice === 'rejected' && wasStarted) location.reload();
  }

  function showChoices() {
    banner.hidden = false;
  }

  function buildChoices() {
    banner = document.createElement('aside');
    banner.className = 'analytics-consent';
    banner.setAttribute('aria-label', 'Επιλογές στατιστικών επισκεψιμότητας');
    banner.innerHTML = `
      <p><strong>Στατιστικά επισκεψιμότητας</strong></p>
      <p>Με την άδειά σας χρησιμοποιούμε το Google Analytics για να βλέπουμε πόσοι επισκέπτονται το site, από πού έρχονται και πώς αλληλεπιδρούν με βασικά στοιχεία της σελίδας. Αν επιλέξετε «Όχι», δεν φορτώνεται το Google Analytics. <a href="privacy.html">Περισσότερες πληροφορίες</a>.</p>
      <div class="analytics-consent-actions">
        <button type="button" data-analytics-choice="rejected">Όχι, ευχαριστώ</button>
        <button type="button" data-analytics-choice="accepted">Αποδοχή</button>
      </div>`;
    banner.addEventListener('click', event => {
      const choice = event.target.closest('button[data-analytics-choice]')?.dataset.analyticsChoice;
      if (choice) choose(choice);
    });
    document.body.appendChild(banner);

    const footer = document.querySelector('footer .footer-row');
    if (footer) {
      const tools = document.createElement('span');
      tools.className = 'analytics-footer-links';
      tools.innerHTML = '<a href="privacy.html">Απόρρητο</a> · ';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Ρυθμίσεις στατιστικών';
      button.addEventListener('click', showChoices);
      tools.appendChild(button);
      footer.appendChild(tools);
    }
  }

  function init() {
    buildChoices();
    const choice = readChoice();
    if (choice === 'accepted') {
      banner.hidden = true;
      loadAnalytics();
    } else if (choice === 'rejected') {
      banner.hidden = true;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
