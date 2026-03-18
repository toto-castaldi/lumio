// Lumio Landing Page - Language Toggle & Popular Decks

(function () {
  'use strict';

  var STORAGE_KEY = 'lumio-lang';
  var SUPPORTED = ['en', 'it'];

  var SUPABASE_URL = '__SUPABASE_URL__';
  var SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';

  var LANG_FLAGS = {
    en: '\uD83C\uDDEC\uD83C\uDDE7',
    it: '\uD83C\uDDEE\uD83C\uDDF9',
    es: '\uD83C\uDDEA\uD83C\uDDF8',
    fr: '\uD83C\uDDEB\uD83C\uDDF7',
    de: '\uD83C\uDDE9\uD83C\uDDEA',
    pt: '\uD83C\uDDF5\uD83C\uDDF9',
    ja: '\uD83C\uDDEF\uD83C\uDDF5',
    zh: '\uD83C\uDDE8\uD83C\uDDF3'
  };

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

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

  function loadPopularDecks() {
    // Dev mode guard: if placeholders not replaced by CI, skip fetch
    if (SUPABASE_URL.indexOf('__') !== -1) {
      return;
    }

    try {
      fetch(SUPABASE_URL + '/rest/v1/rpc/top_decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
        }
      })
      .then(function (response) {
        if (!response.ok) { return; }
        return response.json();
      })
      .then(function (decks) {
        if (!decks || !Array.isArray(decks) || decks.length === 0) {
          return;
        }

        var html = '<section class="popular-decks">' +
          '<h2><span lang="en">Popular Decks</span><span lang="it">Mazzi Popolari</span></h2>' +
          '<ol class="leaderboard-list">';

        decks.forEach(function (deck, i) {
          var flag = LANG_FLAGS[deck.language] || '\uD83C\uDDEC\uD83C\uDDE7';
          var tags = (deck.tags || []).slice(0, 3);
          var count = deck.subscriber_count || 0;
          var enLabel = count === 1 ? 'subscriber' : 'subscribers';
          var itLabel = count === 1 ? 'iscritto' : 'iscritti';

          html += '<li class="leaderboard-entry">' +
            '<span class="entry-rank">#' + (i + 1) + '</span>' +
            '<div class="entry-info">' +
              '<span class="entry-name">' + escapeHtml(deck.display_name) + '</span>' +
              '<div class="entry-meta">' +
                '<span class="entry-subscribers" aria-label="' + count + ' subscribers">' +
                  count + ' <span lang="en">' + enLabel + '</span><span lang="it">' + itLabel + '</span>' +
                '</span>' +
                '<span class="entry-lang" aria-hidden="true">' + flag + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="entry-tags">' +
              tags.map(function (t) { return '<span class="tag-chip">' + escapeHtml(t) + '</span>'; }).join('') +
            '</div>' +
          '</li>';
        });

        html += '</ol></section>';

        var anchor = document.getElementById('popular-decks-anchor');
        if (anchor) {
          anchor.innerHTML = html;
        }
      })
      .catch(function () {
        // Fail silently -- section never appears on error
      });
    } catch (e) {
      // Fail silently -- section never appears on error
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

    loadPopularDecks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
