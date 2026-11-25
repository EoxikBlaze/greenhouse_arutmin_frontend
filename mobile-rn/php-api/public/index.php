<?php
declare(strict_types=1);

/**
 * Gateway PHP untuk app GARAP Petani (React Native).
 * Meneruskan permintaan ke backend GARAP (Node.js) dan menggabungkan beberapa
 * panggilan menjadi satu (/v1/beranda) agar HP hemat permintaan.
 * Tidak menyimpan data dan tidak menyentuh database: sumber data tetap backend GARAP.
 *
 *   GARAP_UPSTREAM  alamat backend (default https://garap.net)
 */

const IZIN_AWALAN = [
    'tanam', 'monitoring', 'laporan', 'profil', 'kalibrasi', 'iot-v41', 'cctv',
    'alert-logs', 'dosing', 'api/ai', 'api/aktuator', 'api/latest-sensor', 'dashboard',
];
const BATAS_BADAN = 262144; // sama dengan batas backend (256 KB)

function upstream(): string
{
    return rtrim(getenv('GARAP_UPSTREAM') ?: 'https://garap.net', '/');
}

function balas(int $kode, mixed $isi, array $header = []): never
{
    http_response_code($kode);
    foreach ($header as $k => $v) {
        header("$k: $v");
    }
    if (!headers_sent() && !in_array('Content-Type', array_keys($header), true)) {
        header('Content-Type: application/json; charset=utf-8');
    }
    echo is_string($isi) ? $isi : json_encode($isi, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function galat(int $kode, string $pesan): never
{
    balas($kode, ['message' => $pesan]);
}

/** Bangun handle curl ke backend; token hanya diteruskan, tidak dicatat. */
function siapkan(string $metode, string $path, ?string $badan, ?string $auth, string $terima = 'application/json')
{
    $ch = curl_init(upstream() . $path);
    $h = ['Accept: ' . $terima, 'X-Requested-With: garap-mobile-gateway'];
    if ($auth) {
        $h[] = 'Authorization: ' . $auth;
    }
    if ($badan !== null && $badan !== '') {
        $h[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, $badan);
    }
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $metode,
        CURLOPT_HTTPHEADER => $h,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_FOLLOWLOCATION => false,
    ]);
    return $ch;
}

function jalankan($ch): array
{
    $isi = curl_exec($ch);
    $kode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    return [$kode ?: 502, $isi === false ? '' : (string) $isi, (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE)];
}

function path_aman(string $p): ?string
{
    $p = trim($p, '/');
    if ($p === '' || str_contains($p, '..') || str_contains($p, '\\') || preg_match('/[^A-Za-z0-9_\-\/.]/', $p)) {
        return null;
    }
    foreach (IZIN_AWALAN as $a) {
        if ($p === $a || str_starts_with($p, $a . '/')) {
            return $p;
        }
    }
    return null;
}

function badan_masuk(): string
{
    $b = file_get_contents('php://input', false, null, 0, BATAS_BADAN + 1) ?: '';
    if (strlen($b) > BATAS_BADAN) {
        galat(413, 'Permintaan terlalu besar.');
    }
    return $b;
}

function auth_masuk(): ?string
{
    $a = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    return preg_match('/^Bearer [A-Za-z0-9._\-]+$/', $a) ? $a : null;
}

/** Beranda: 4 panggilan sekaligus; bagian yang gagal bernilai null, sisanya tetap tampil. */
function beranda(?string $auth): never
{
    if (!$auth) {
        galat(401, 'Tidak terautentikasi.');
    }
    $bagian = [
        'sensor' => '/api/latest-sensor',
        'kebun' => '/tanam',
        'peringatan' => '/alert-logs',
        'alat' => '/iot-v41/state',
    ];
    $mh = curl_multi_init();
    $ch = [];
    foreach ($bagian as $nama => $path) {
        $ch[$nama] = siapkan('GET', $path, null, $auth);
        curl_multi_add_handle($mh, $ch[$nama]);
    }
    do {
        $st = curl_multi_exec($mh, $aktif);
        if ($aktif) {
            curl_multi_select($mh, 1.0);
        }
    } while ($aktif && $st === CURLM_OK);

    $hasil = [];
    $kodeSesi = null;
    foreach ($ch as $nama => $h) {
        $kode = (int) curl_getinfo($h, CURLINFO_RESPONSE_CODE);
        $json = json_decode((string) curl_multi_getcontent($h), true);
        if ($kode === 401) {
            $kodeSesi = 401;
        }
        $hasil[$nama] = ($kode >= 200 && $kode < 300 && $json !== null) ? $json : null;
        curl_multi_remove_handle($mh, $h);
        curl_close($h);
    }
    curl_multi_close($mh);
    if ($kodeSesi === 401) {
        galat(401, 'Sesi habis. Silakan masuk lagi.');
    }
    balas(200, $hasil + ['waktu' => gmdate('c')], ['Cache-Control' => 'no-store']);
}

$metode = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = '/' . trim((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
$path = preg_replace('#^/index\.php#', '', $path) ?: '/';

if ($path === '/v1/sehat') {
    balas(200, ['status' => 'ok']);
}
if ($path === '/v1/login' && $metode === 'POST') {
    [$kode, $isi, $tipe] = jalankan(siapkan('POST', '/login', badan_masuk(), null));
    balas($kode, $isi, ['Content-Type' => $tipe ?: 'application/json']);
}
if ($path === '/v1/beranda' && $metode === 'GET') {
    beranda(auth_masuk());
}
if (str_starts_with($path, '/v1/p/') && in_array($metode, ['GET', 'POST', 'PUT', 'DELETE'], true)) {
    $p = path_aman(substr($path, 6));
    if ($p === null) {
        galat(404, 'Rute tidak tersedia.');
    }
    $auth = auth_masuk();
    if (!$auth) {
        galat(401, 'Tidak terautentikasi.');
    }
    $qs = (string) ($_SERVER['QUERY_STRING'] ?? '');
    $badan = $metode === 'GET' || $metode === 'DELETE' ? null : badan_masuk();
    $accept = ($_SERVER['HTTP_ACCEPT'] ?? '') === 'application/x-ndjson' ? 'application/x-ndjson' : 'application/json';
    [$kode, $isi, $tipe] = jalankan(siapkan($metode, '/' . $p . ($qs !== '' ? '?' . $qs : ''), $badan, $auth, $accept));
    balas($kode, $isi, ['Content-Type' => $tipe ?: 'application/json']);
}
galat(404, 'Rute tidak ditemukan.');
