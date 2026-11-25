#!/usr/bin/env bash
# Uji gateway terhadap backend tiruan. Pakai: bash tests/smoke.sh
cd "$(dirname "$0")/.." || exit 1
php -S 127.0.0.1:18081 tests/mock_upstream.php >/dev/null 2>&1 & U=$!
GARAP_UPSTREAM=http://127.0.0.1:18081 php -S 127.0.0.1:18080 -t public >/dev/null 2>&1 & G=$!
trap 'kill $U $G 2>/dev/null' EXIT; sleep 1
B=http://127.0.0.1:18080; T='Authorization: Bearer abc.def'; gagal=0
cek() { if [[ "$2" == *"$3"* ]]; then echo "ok   $1"; else echo "GAGAL $1 -> $2"; gagal=1; fi; }
cek sehat      "$(curl -s $B/v1/sehat)" '"ok"'
cek login      "$(curl -s -XPOST -d '{"username":"a"}' $B/v1/login)" 'abc.def'
cek tanpa-token "$(curl -s -o /dev/null -w %{http_code} $B/v1/p/tanam)" 401
cek teruskan   "$(curl -s -H "$T" "$B/v1/p/tanam/pilihan?x=1")" '"qs":"x=1"'
cek metode-put "$(curl -s -H "$T" -XPUT -d '{}' $B/v1/p/iot-v41/saklar)" '"method":"PUT"'
cek ndjson     "$(curl -s -H "$T" -H 'Accept: application/x-ndjson' -XPOST -d '{}' $B/v1/p/api/ai/chat)" 'x-ndjson'
cek luar-izin  "$(curl -s -o /dev/null -w %{http_code} -H "$T" $B/v1/p/user)" 404
cek traversal  "$(curl -s -o /dev/null -w %{http_code} -H "$T" --path-as-is "$B/v1/p/tanam/../user")" 404
cek beranda    "$(curl -s -H "$T" $B/v1/beranda)" '"peringatan":null'
cek beranda-ok "$(curl -s -H "$T" $B/v1/beranda)" '"/tanam"'
cek beranda401 "$(curl -s -o /dev/null -w %{http_code} -H 'Authorization: Bearer salah' $B/v1/beranda)" 401
exit $gagal
