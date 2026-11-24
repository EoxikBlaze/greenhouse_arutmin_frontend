import 'package:http/http.dart' as http;

import 'client_factory_stub.dart'
    if (dart.library.io) 'client_factory_io.dart'
    as pabrik;

/// Klien HTTP bawaan aplikasi.
///
/// Di platform berbasis VM (Android, iOS, desktop) sengaja MENGABAIKAN
/// `HTTP_PROXY`/`HTTPS_PROXY`: backend ada di localhost/LAN (`http://IP:8000`)
/// dan melewati proxy justru membuat request lokal dijawab `400` sehingga
/// aplikasi terlihat "tidak bisa konek" padahal server hidup.
///
/// Di web, klien bawaan `package:http` (browser) dipakai apa adanya —
/// variabel proxy lingkungan tidak relevan untuk `fetch()` browser.
http.Client buatKlienHttp() => pabrik.buatKlienHttp();
