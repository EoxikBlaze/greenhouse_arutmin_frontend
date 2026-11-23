/* Penanda asal bacaan sensor: "Sensor membaca: Meja X · alat Y".
   Berdiri sendiri (tanpa mengubah bundle aplikasi); membaca /dashboard dan /meja dengan sesi yang sedang login. */
(function () {
  'use strict';
  var RUTE = ['/dashboard', '/sensor-realtime'];
  var info = null;
  var sedang = false;
  var jadwalPasang = false;

  function aktif() { return RUTE.indexOf(location.pathname) >= 0; }

  function json(url) {
    return fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function ambil() {
    if (sedang || !aktif()) return;
    sedang = true;
    Promise.all([json('/dashboard'), json('/meja')]).then(function (h) {
      var d = h[0], m = h[1];
      if (!d) return;
      var s = d.latest_sensor || null;
      var idMeja = s && s.id_meja != null ? String(s.id_meja) : null;
      var alat = d.iotStatus && d.iotStatus.perangkat ? d.iotStatus.perangkat : null;
      var nama = null;
      if (idMeja && Array.isArray(m)) {
        for (var i = 0; i < m.length; i++) {
          if (String(m[i].id_meja) === idMeja) { nama = m[i].meja; break; }
        }
      }
      info = (idMeja || alat) ? { idMeja: idMeja, nama: nama, alat: alat, online: !!(d.iotStatus && d.iotStatus.online) } : null;
      pasang();
    }).then(function () { sedang = false; }, function () { sedang = false; });
  }

  function isi(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    var a = document.createElement('span'); a.className = 't'; a.textContent = 'Sensor membaca:';
    var b = document.createElement('b');
    b.textContent = info.idMeja ? (info.nama || ('Meja #' + info.idMeja)) : 'meja belum ditentukan';
    el.appendChild(a); el.appendChild(b);
    if (info.alat) {
      var c = document.createElement('span'); c.className = 't'; c.textContent = '· alat ' + info.alat + (info.online ? '' : ' (terputus)');
      el.appendChild(c);
    }
    el.className = 'vsf-meja-label' + (info.online ? '' : ' putus');
  }

  function pasang() {
    jadwalPasang = false;
    var ada = document.getElementById('vsf-meja-label');
    if (!aktif() || !info) { if (ada && ada.parentNode) ada.parentNode.removeChild(ada); return; }
    var isiHalaman = document.querySelector('main > div');
    if (!isiHalaman) return;
    var el = ada || document.createElement('div');
    el.id = 'vsf-meja-label';
    el.setAttribute('role', 'status');
    isi(el);
    if (el.parentNode !== isiHalaman || isiHalaman.firstChild !== el) isiHalaman.insertBefore(el, isiHalaman.firstChild);
  }

  var rutaTerakhir = location.pathname;
  new MutationObserver(function () {
    if (location.pathname !== rutaTerakhir) { rutaTerakhir = location.pathname; ambil(); }
    if (!jadwalPasang) { jadwalPasang = true; requestAnimationFrame(pasang); }
  }).observe(document.documentElement, { childList: true, subtree: true });

  setInterval(ambil, 15000);
  ambil();
})();
