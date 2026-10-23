import 'package:flutter/material.dart';

import '../models/monitoring_entry.dart';
import '../services/api_service.dart';

/// Riwayat monitoring — GET /monitoring/chart-data (butuh token).
class RiwayatMonitoringPage extends StatefulWidget {
  const RiwayatMonitoringPage({super.key, required this.api});

  final ApiService api;

  @override
  State<RiwayatMonitoringPage> createState() => _RiwayatMonitoringPageState();
}

class _RiwayatMonitoringPageState extends State<RiwayatMonitoringPage>
    with AutomaticKeepAliveClientMixin {
  List<MonitoringEntry>? _items;
  String? _error;
  bool _loading = false;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final items = await widget.api.fetchMonitoring();
      if (!mounted) return;
      setState(() {
        _items = items;
        _error = null;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  String _fmt(num? v, {int desimal = 1}) {
    if (v == null) return '-';
    return v is int ? v.toString() : v.toStringAsFixed(desimal);
  }

  String _waktu(String? iso) {
    if (iso == null || iso.isEmpty) return '-';
    final d = DateTime.tryParse(iso)?.toLocal();
    if (d == null) return iso;
    String two(int n) => n.toString().padLeft(2, '0');
    return '${d.year}-${two(d.month)}-${two(d.day)} '
        '${two(d.hour)}:${two(d.minute)}';
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final scheme = Theme.of(context).colorScheme;

    Widget body;
    if (_loading && _items == null && _error == null) {
      body = const Center(child: CircularProgressIndicator());
    } else if (_error != null) {
      body = Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_outlined,
                  size: 40, color: Color(0xFFC0392B)),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Coba lagi'),
              ),
            ],
          ),
        ),
      );
    } else if (_items == null || _items!.isEmpty) {
      body = const Center(child: Text('Belum ada data monitoring.'));
    } else {
      body = RefreshIndicator(
        color: scheme.secondary,
        onRefresh: _load,
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: _items!.length + 1,
          itemBuilder: (context, i) {
            if (i == 0) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text('${_items!.length} catatan sensor terbaru',
                    style: Theme.of(context).textTheme.bodySmall),
              );
            }
            final e = _items![i - 1];
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.monitor_heart_outlined,
                            size: 16, color: scheme.primary),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(_waktu(e.createdAt),
                              style: const TextStyle(
                                  fontWeight: FontWeight.w600)),
                        ),
                        if (e.idMeja != null)
                          Text('Meja ${e.idMeja}',
                              style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 14,
                      runSpacing: 4,
                      children: [
                        _kv('pH', _fmt(e.ph, desimal: 2)),
                        _kv('Suhu air', '${_fmt(e.waterTemp)} °C'),
                        _kv('TDS', '${_fmt(e.tds, desimal: 0)} ppm'),
                        _kv('Suhu udara', '${_fmt(e.airTemp)} °C'),
                        _kv('Kelembapan', '${_fmt(e.humidity, desimal: 0)} %'),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Riwayat Monitoring')),
      body: body,
    );
  }

  Widget _kv(String label, String nilai) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label,
              style:
                  const TextStyle(fontSize: 11, color: Color(0xFF6B7A69))),
          Text(nilai,
              style:
                  const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        ],
      );
}
