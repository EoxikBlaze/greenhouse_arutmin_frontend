import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';
import 'dart:convert';

import 'package:webview_flutter/webview_flutter.dart';

import 'peringatan.dart';

export 'peringatan.dart' show garapUrl;
const navy = Color(0xFF0A1F38);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.light);
  await siapkanNotifikasi();
  runApp(const GarapApp());
  unawaited(mintaIzinNotifikasi());
  unawaited(jadwalkanLatarBelakang());
}

class GarapApp extends StatelessWidget {
  const GarapApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'GARAP',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(colorSchemeSeed: const Color(0xFF2D452F), useMaterial3: true),
        home: const Cangkang(),
      );
}

class Cangkang extends StatefulWidget {
  const Cangkang({super.key});
  @override
  State<Cangkang> createState() => _CangkangState();
}

class _CangkangState extends State<Cangkang> {
  late final WebViewController _web;
  final Uri _asal = Uri.parse(garapUrl);
  // Mulai di /dashboard: web melompat ke /login bila sesi kosong, dan tetap masuk bila sesi masih ada.
  late final Uri _mulai = _asal.replace(path: '/dashboard');
  int _persen = 0;
  bool _galat = false;
  Timer? _tiapMenit;

  @override
  void dispose() {
    _tiapMenit?.cancel();
    super.dispose();
  }

  /// Salin token sesi web untuk notifikasi, dan tandai halaman sebagai app (CSS garap-app di server).
  Future<void> _sinkronSesi() async {
    try {
      await _web.runJavaScript("document.documentElement.classList.add('garap-app')");
      final r = await _web.runJavaScriptReturningResult(
          "localStorage.getItem('vsf-auth') || sessionStorage.getItem('vsf-auth') || ''");
      var mentah = r is String ? r : '$r';
      if (mentah.startsWith('"')) mentah = jsonDecode(mentah) as String; // Android membungkus string sebagai JSON
      final sesi = mentah.isEmpty ? null : jsonDecode(mentah);
      final token = sesi is Map && sesi['token'] is String ? sesi['token'] as String : null;
      await simpanToken(token);
      if (token != null) unawaited(cekPeringatan());
    } catch (_) {
      // halaman belum siap / sesi rusak: dicoba lagi saat halaman berikutnya selesai dimuat
    }
  }

  @override
  void initState() {
    super.initState();
    _web = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(navy)
      ..setNavigationDelegate(NavigationDelegate(
        // Hanya domain GARAP yang boleh dibuka di dalam app.
        onNavigationRequest: (r) {
          final u = Uri.tryParse(r.url);
          final boleh = u != null && u.scheme == _asal.scheme && u.host == _asal.host;
          return boleh ? NavigationDecision.navigate : NavigationDecision.prevent;
        },
        onProgress: (p) => setState(() => _persen = p),
        onPageStarted: (_) => setState(() => _galat = false),
        onPageFinished: (_) => _sinkronSesi(),
        onUrlChange: (_) => _sinkronSesi(),
        onWebResourceError: (e) {
          if (e.isForMainFrame ?? false) setState(() => _galat = true);
        },
      ))
      ..loadRequest(_mulai);
    _tiapMenit = Timer.periodic(const Duration(minutes: 1), (_) => cekPeringatan());
  }

  Future<void> _kembali() async {
    if (await _web.canGoBack()) {
      await _web.goBack();
    } else {
      SystemNavigator.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _kembali();
      },
      child: Scaffold(
        backgroundColor: navy,
        body: SafeArea(
          child: Stack(children: [
            RefreshIndicator(
              onRefresh: () => _web.reload(),
              child: WebViewWidget(controller: _web),
            ),
            if (_persen < 100 && !_galat)
              LinearProgressIndicator(value: _persen / 100, minHeight: 3, color: const Color(0xFFE9CD53), backgroundColor: navy),
            if (_galat)
              Container(
                color: navy,
                alignment: Alignment.center,
                padding: const EdgeInsets.all(24),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.wifi_off, color: Colors.white, size: 48),
                  const SizedBox(height: 12),
                  const Text('Tidak dapat terhubung ke GARAP', style: TextStyle(color: Colors.white, fontSize: 18)),
                  const SizedBox(height: 16),
                  FilledButton(onPressed: () => _web.loadRequest(_mulai), child: const Text('Coba lagi')),
                ]),
              ),
          ]),
        ),
      ),
    );
  }
}
