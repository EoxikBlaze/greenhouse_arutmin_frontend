import 'package:flutter/material.dart';
import 'package:flutter_mobile_app/widgets/kaca.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> _pasang(
  WidgetTester tester,
  KacaVarian varian, {
  bool kontras = false,
  ModeKaca mode = ModeKaca.standar,
  List<Color>? warna,
}) {
  return tester.pumpWidget(
    MaterialApp(
      home: MediaQuery(
        data: MediaQueryData(highContrast: kontras),
        child: KacaScope(
          mode: mode,
          child: Scaffold(
            body: KacaCair(
              varian: varian,
              warna: warna,
              child: const Text('isi'),
            ),
          ),
        ),
      ),
    ),
  );
}

BackdropFilter _filter(WidgetTester tester) =>
    tester.widget<BackdropFilter>(find.byType(BackdropFilter));

/// Alpha warna pertama gradasi permukaan kaca.
double _alphaTint(WidgetTester tester) {
  final c = tester
      .widgetList<Container>(find.byType(Container))
      .map((c) => c.decoration)
      .whereType<BoxDecoration>()
      .firstWhere((d) => d.gradient is LinearGradient);
  return (c.gradient! as LinearGradient).colors.first.a;
}

class _PenyimpanTiruan implements PenyimpanNilai {
  String? isi;
  bool rusak = false;

  @override
  Future<String?> baca() async {
    if (rusak) throw Exception('rusak');
    return isi;
  }

  @override
  Future<void> tulis(String nilai) async {
    if (rusak) throw Exception('rusak');
    isi = nilai;
  }
}

void main() {
  testWidgets('chrome memakai blur sendiri (tidak ikut BackdropGroup)', (
    tester,
  ) async {
    await _pasang(tester, KacaVarian.chrome);
    expect(find.byType(BackdropFilter), findsOneWidget);
    expect(_filter(tester).backdropGroupKey, isNull);
  });

  testWidgets('panel dan bening ikut grup blur bersama, solid tanpa blur', (
    tester,
  ) async {
    for (final v in [KacaVarian.panel, KacaVarian.bening]) {
      await tester.pumpWidget(
        MaterialApp(
          home: BackdropGroup(
            child: Scaffold(
              body: KacaCair(varian: v, child: const Text('isi')),
            ),
          ),
        ),
      );
      expect(find.byType(BackdropFilter), findsOneWidget);
      // grouped: kunci bersama diambil dari BackdropGroup saat render, bukan disimpan di widget
      expect(_filter(tester).backdropGroupKey, isNull);
    }
    await _pasang(tester, KacaVarian.solid);
    expect(find.byType(BackdropFilter), findsNothing);
  });

  testWidgets('panel buram:false tidak memakai blur', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: KacaCair(buram: false, child: Text('isi'))),
      ),
    );
    expect(find.byType(BackdropFilter), findsNothing);
  });

  testWidgets('kontras tinggi: chrome jadi solid tanpa blur', (tester) async {
    await _pasang(tester, KacaVarian.chrome, kontras: true);
    expect(find.byType(BackdropFilter), findsNothing);
    expect(find.text('isi'), findsOneWidget);
  });

  testWidgets('mode Pekat: semua kaca solid tanpa blur', (tester) async {
    for (final v in [KacaVarian.chrome, KacaVarian.panel, KacaVarian.bening]) {
      await _pasang(tester, v, mode: ModeKaca.pekat);
      expect(find.byType(BackdropFilter), findsNothing, reason: '$v');
    }
  });

  testWidgets(
    'mode Pekat dengan tint kustom: warna dibuat penuh (teks putih tetap terbaca)',
    (tester) async {
      await _pasang(
        tester,
        KacaVarian.bening,
        mode: ModeKaca.pekat,
        warna: const [Color(0x806B9D4A), Color(0x802D452F)],
      );
      final d = tester
          .widgetList<DecoratedBox>(find.byType(DecoratedBox))
          .map((b) => b.decoration)
          .whereType<BoxDecoration>()
          .firstWhere((d) => d.gradient != null);
      expect(
        (d.gradient! as LinearGradient).colors.every((c) => c.a == 1),
        isTrue,
      );
    },
  );

  testWidgets('mode Jernih: tint lebih tipis dari Standar', (tester) async {
    await _pasang(tester, KacaVarian.panel);
    final standar = _alphaTint(tester);
    await _pasang(tester, KacaVarian.panel, mode: ModeKaca.jernih);
    final jernih = _alphaTint(tester);
    expect(jernih, lessThan(standar));
  });

  group('PreferensiKaca', () {
    late _PenyimpanTiruan simpan;
    setUp(() {
      simpan = _PenyimpanTiruan();
      PreferensiKaca.penyimpan = simpan;
      PreferensiKaca.mode.value = ModeKaca.standar;
    });

    test('memuat pilihan tersimpan', () async {
      simpan.isi = 'pekat';
      await PreferensiKaca.muat();
      expect(PreferensiKaca.mode.value, ModeKaca.pekat);
    });

    test('nilai tak dikenal atau penyimpanan rusak → standar', () async {
      simpan.isi = 'transparan';
      await PreferensiKaca.muat();
      expect(PreferensiKaca.mode.value, ModeKaca.standar);
      simpan.rusak = true;
      await PreferensiKaca.muat();
      expect(PreferensiKaca.mode.value, ModeKaca.standar);
    });

    test('atur menyimpan dan tetap berlaku walau penyimpanan gagal', () async {
      await PreferensiKaca.atur(ModeKaca.jernih);
      expect(simpan.isi, 'jernih');
      simpan.rusak = true;
      await PreferensiKaca.atur(ModeKaca.pekat);
      expect(PreferensiKaca.mode.value, ModeKaca.pekat);
    });
  });
}
