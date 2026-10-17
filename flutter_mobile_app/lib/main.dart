import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

/// GARAP — monitoring greenhouse hidroponik (Arutmin Light).
/// Terhubung ke backend Node.js lokal: http://127.0.0.1:8000
/// (di iOS Simulator, 127.0.0.1 = Mac host — tidak perlu konfigurasi tambahan).

// ── Token tema Arutmin Light (satu sumber kebenaran) ──────────────────
const Color forest = Color(0xFF2D452F);
const Color olive = Color(0xFF4C6A4B);
const Color moss = Color(0xFF6B9D4A);
const Color mint = Color(0xFFCFE2CE);
const Color pageBg = Color(0xFFF4F7F2);
const Color cardBorder = Color(0xFFE2E8DD);
const Color danger = Color(0xFFC0392B);
const Color warning = Color(0xFFE0A42B);

const String apiBase = 'http://127.0.0.1:8000';

void main() {
  runApp(const GarapApp());
}

class GarapApp extends StatelessWidget {
  const GarapApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GARAP',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: pageBg,
        colorScheme: ColorScheme.fromSeed(
          seedColor: forest,
          primary: forest,
          secondary: moss,
          surface: Colors.white,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: forest,
          foregroundColor: Colors.white,
          elevation: 0,
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: const BorderSide(color: cardBorder),
          ),
        ),
      ),
      home: const MonitoringPage(),
    );
  }
}

class MonitoringPage extends StatefulWidget {
  const MonitoringPage({super.key});

  @override
  State<MonitoringPage> createState() => _MonitoringPageState();
}

class _MonitoringPageState extends State<MonitoringPage> {
  Timer? _timer;
  Map<String, dynamic>? _payload;
  String? _error;

  @override
  void initState() {
    super.initState();
    _refresh();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => _refresh());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    try {
      final res = await http
          .get(Uri.parse('$apiBase/api/latest-sensor'))
          .timeout(const Duration(seconds: 5));
      if (!mounted) return;
      if (res.statusCode == 200) {
        setState(() {
          _payload = jsonDecode(res.body) as Map<String, dynamic>;
          _error = null;
        });
      } else {
        setState(() => _error = 'HTTP ${res.statusCode}');
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Backend tidak terjangkau';
        _payload = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final online = _payload?['is_online'] == true;
    final sensor =
        (_payload?['sensor'] as Map<String, dynamic>?) ?? const {};
    final water =
        (_payload?['water_control'] as Map<String, dynamic>?) ?? const {};

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'GARAP',
          style: TextStyle(fontWeight: FontWeight.w600, letterSpacing: 0.2),
        ),
        actions: [
          IconButton(
            onPressed: _refresh,
            icon: const Icon(Icons.refresh),
            tooltip: 'Segarkan',
          ),
        ],
      ),
      body: RefreshIndicator(
        color: moss,
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _StatusCard(online: online, error: _error),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.7,
              children: [
                _MetricCard(
                    label: 'pH Air',
                    value: _fmt(sensor['ph']),
                    icon: Icons.science_outlined),
                _MetricCard(
                    label: 'Suhu Air',
                    value: '${_fmt(sensor['waterTemp'])} °C',
                    icon: Icons.thermostat_outlined),
                _MetricCard(
                    label: 'TDS',
                    value: '${_fmt(sensor['tds'])} ppm',
                    icon: Icons.grain_outlined),
                _MetricCard(
                    label: 'Suhu Udara',
                    value: '${_fmt(sensor['airTemp'])} °C',
                    icon: Icons.air_outlined),
                _MetricCard(
                    label: 'Kelembapan',
                    value: '${_fmt(sensor['humidity'])} %',
                    icon: Icons.water_drop_outlined),
                _MetricCard(
                    label: 'Level Air',
                    value: '${sensor['water_level'] ?? '-'}',
                    icon: Icons.waves_outlined),
              ],
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Kontrol Air',
                        style: TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 16)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _Chip(
                            label: 'Mode: ${water['mode'] ?? '-'}',
                            color: olive),
                        const SizedBox(width: 8),
                        _Chip(
                            label: 'Katup: ${water['valve_state'] ?? '-'}',
                            color: (water['valve_state'] == 'ON')
                                ? moss
                                : forest),
                        const SizedBox(width: 8),
                        _Chip(
                            label: 'Cmd: ${water['command'] ?? '-'}',
                            color: warning),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Backend: $apiBase · pembaruan otomatis tiap 5 detik',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF6B7A69), fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  String _fmt(dynamic v) {
    if (v == null) return '-';
    final d = double.tryParse(v.toString());
    return d == null ? v.toString() : d.toStringAsFixed(1);
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({required this.online, this.error});

  final bool online;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final Color color = error != null
        ? danger
        : online
            ? moss
            : warning;
    final String text = error != null
        ? 'Terputus — $error'
        : online
            ? 'Terhubung — perangkat aktif'
            : 'Perangkat tidak merespons (>2 menit)';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(text,
                  style: const TextStyle(fontWeight: FontWeight.w500)),
            ),
            Icon(online ? Icons.check_circle_outline : Icons.error_outline,
                color: color),
          ],
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard(
      {required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              children: [
                Icon(icon, size: 16, color: olive),
                const SizedBox(width: 6),
                Text(label,
                    style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF6B7A69),
                        fontWeight: FontWeight.w500)),
              ],
            ),
            const SizedBox(height: 6),
            Text(value,
                style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: forest)),
          ],
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: mint.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Text(label,
          style: TextStyle(
              fontSize: 12, fontWeight: FontWeight.w600, color: color)),
    );
  }
}
