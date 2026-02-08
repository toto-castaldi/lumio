// Lumio Landing Page - Language Toggle

(function () {
  'use strict';

  var STORAGE_KEY = 'lumio-lang';
  var SUPPORTED = ['en', 'it'];

  function detectLang() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.indexOf(stored) !== -1) {
      return stored;
    }
    var browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    return browserLang.indexOf('it') === 0 ? 'it' : 'en';
  }

  function setLang(lang) {
    document.documentElement.lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);

    var toggleBtn = document.getElementById('lang-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = lang === 'en' ? 'IT' : 'EN';
    }
  }

  function init() {
    var currentLang = detectLang();
    setLang(currentLang);

    var toggleBtn = document.getElementById('lang-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        var current = document.documentElement.lang;
        var next = current === 'en' ? 'it' : 'en';
        setLang(next);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
