import 'package:http/http.dart' as http;

/// Implementasi cadangan (web/kompilasi JS): pakai klien bawaan `package:http`
/// — proxy diatur oleh browser, bukan oleh `HTTP_PROXY` proses.
http.Client buatKlienHttp() => http.Client();
