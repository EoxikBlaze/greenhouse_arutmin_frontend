import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_mobile_app/theme/tema.dart';
import 'package:flutter_mobile_app/theme/tokens.dart';
import 'package:flutter_mobile_app/widgets/kaca.dart' show PenyimpanNilai;

class _Memori implements PenyimpanNilai {
  String? nilai;

  @override
  Future<String?> baca() async => nilai;

  @override
  Future<void> tulis(String v) async => nilai = v;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('pilihan tema tersimpan dan mengubah token', () async {
    final memori = _Memori();
    PreferensiTema.penyimpan = memori;

    await PreferensiTema.atur(true);
    expect(memori.nilai, 'gelap');
    expect(Tok.gelap, isTrue);
    final tintaGelap = Tok.tinta;

    await PreferensiTema.atur(false);
    expect(memori.nilai, 'terang');
    expect(Tok.gelap, isFalse);
    expect(Tok.tinta, isNot(tintaGelap));
  });

  test('muat memakai pilihan tersimpan', () async {
    final memori = _Memori()..nilai = 'gelap';
    PreferensiTema.penyimpan = memori;
    await PreferensiTema.muat();
    expect(Tok.gelap, isTrue);

    memori.nilai = 'terang';
    await PreferensiTema.muat();
    expect(Tok.gelap, isFalse);
  });
}
