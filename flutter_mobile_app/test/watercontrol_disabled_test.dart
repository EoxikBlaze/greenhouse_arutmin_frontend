import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_mobile_app/pages/watercontrol_page.dart';
import 'package:flutter_mobile_app/services/api_service.dart';

http.Response _json(Object body, int status) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json'},
);

void main() {
  testWidgets(
    'Water Control menampilkan status sebagai catatan dan tidak mengirim POST',
    (tester) async {
      final postPaths = <String>[];
      final api = ApiService(
        client: MockClient((request) async {
          if (request.method != 'GET') {
            postPaths.add(request.url.path);
            return _json({'message': 'unexpected write'}, 503);
          }
          if (request.url.path == '/watercontrol/status') {
            return _json({
              'mode': 'MANUAL',
              'valve_state': 'OPEN',
              'command': 'FILL',
              'updated_at': '2026-10-30T00:00:00.000Z',
            }, 200);
          }
          return _json([], 200);
        }),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: WaterControlPage(api: api)),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        find.textContaining('Kontrol air dinonaktifkan sementara'),
        findsOneWidget,
      );
      expect(find.text('Katup terbuka'), findsOneWidget);

      await tester.ensureVisible(find.text('Isi air'));
      await tester.pumpAndSettle();
      final isiAirInkWell = tester.widget<InkWell>(
        find
            .ancestor(of: find.text('Isi air'), matching: find.byType(InkWell))
            .first,
      );
      expect(isiAirInkWell.onTap, isNull);

      final tombolStop = find.widgetWithText(OutlinedButton, 'Hentikan');
      expect(tombolStop, findsOneWidget);
      expect(tester.widget<OutlinedButton>(tombolStop).onPressed, isNull);
      expect(postPaths, isEmpty);
    },
  );
}
