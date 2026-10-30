// Pasang tema sebelum cat pertama (mencegah kedipan terang→gelap). Logika sama dengan src/lib/tema.ts.
(function () {
  try {
    var t = localStorage.getItem('vsf-tema');
    if (t !== 'gelap' && t !== 'terang') t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'gelap' : 'terang';
    var e = document.documentElement;
    e.dataset.tema = t;
    e.style.colorScheme = t === 'gelap' ? 'dark' : 'light';
  } catch { /* tema bawaan: terang */ }
})();
