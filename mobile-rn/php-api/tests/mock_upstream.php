<?php
// Backend GARAP tiruan untuk uji gateway.
$p = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$a = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
header('Content-Type: application/json');
if ($p === '/login') { echo json_encode(['status' => true, 'token' => 'abc.def', 'echo' => file_get_contents('php://input')]); return; }
if ($a !== 'Bearer abc.def') { http_response_code(401); echo '{"message":"Tidak terautentikasi."}'; return; }
if ($p === '/alert-logs') { http_response_code(500); echo '{}'; return; }
echo json_encode(['path' => $p, 'method' => $_SERVER['REQUEST_METHOD'], 'qs' => $_SERVER['QUERY_STRING'] ?? '', 'accept' => $_SERVER['HTTP_ACCEPT'] ?? '']);
