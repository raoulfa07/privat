<?php
declare(strict_types=1);

function app_config(): array {
    static $config = null;
    if ($config !== null) return $config;
    $path = __DIR__ . '/config.php';
    if (!file_exists($path)) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'config.php fehlt. Kopiere private/config.example.php nach private/config.php.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $config = require $path;
    return $config;
}

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $config = app_config();
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_name']);
    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

function json_response(mixed $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function method(): string {
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function path_id(): string {
    $path = $_SERVER['PATH_INFO'] ?? '';
    if ($path === '') {
        $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
        $script = $_SERVER['SCRIPT_NAME'] ?? '';
        if ($script && str_starts_with($uriPath, $script)) {
            $path = substr($uriPath, strlen($script));
        } elseif (preg_match('~/api/memories/(.+)$~', $uriPath, $match)) {
            $path = '/' . $match[1];
        }
    }
    return trim(urldecode($path), '/');
}

function normalize_tags(string $value): array {
    return array_values(array_filter(array_map('trim', explode(',', $value))));
}

function normalize_date(?string $value): string {
    if (!$value) return '';
    return preg_match('/(\d{4})[:-](\d{2})[:-](\d{2})/', $value, $m) ? "{$m[1]}-{$m[2]}-{$m[3]}" : '';
}

function known_place_coords(string $place): ?array {
    $key = trim(preg_replace('/[,\s]+/u', ' ', mb_strtolower($place)));
    $places = [
        'berlin' => [52.52, 13.405, 'Berlin, Deutschland'],
        'hamburg' => [53.5511, 9.9937, 'Hamburg, Deutschland'],
        'muenster' => [51.9607, 7.6261, 'Muenster, Deutschland'],
        'münster' => [51.9607, 7.6261, 'Münster, Deutschland'],
        'gent' => [51.0543, 3.7174, 'Gent, Belgien'],
        'ghent' => [51.0543, 3.7174, 'Ghent, Belgium'],
        'gent belgien' => [51.0543, 3.7174, 'Gent, Belgien'],
        'gent belgium' => [51.0543, 3.7174, 'Gent, Belgien'],
    ];
    if (!isset($places[$key])) return null;
    [$lat, $lng, $label] = $places[$key];
    return ['lat' => $lat, 'lng' => $lng, 'label' => $label, 'source' => 'known-place'];
}

function geocode_place(string $place): ?array {
    if ($place === '' || $place === 'Unbekannter Ort') return null;
    $known = known_place_coords($place);
    if ($known) return $known;
    $url = 'https://nominatim.openstreetmap.org/search?' . http_build_query([
        'format' => 'jsonv2',
        'limit' => '1',
        'addressdetails' => '1',
        'accept-language' => 'de',
        'q' => $place,
    ]);
    $context = stream_context_create([
        'http' => [
            'header' => "User-Agent: charleen-raoul-erinnerungen/1.0 (ALL-INKL personal website)\r\nAccept: application/json\r\n",
            'timeout' => 8,
        ],
    ]);
    $body = @file_get_contents($url, false, $context);
    if (!$body) return null;
    $results = json_decode($body, true);
    if (!is_array($results) || !isset($results[0])) return null;
    return [
        'lat' => (float)$results[0]['lat'],
        'lng' => (float)$results[0]['lon'],
        'label' => (string)$results[0]['display_name'],
        'source' => 'nominatim',
    ];
}

function safe_file_name(string $name): string {
    $name = preg_replace('/[^a-zA-Z0-9._-]+/', '-', $name);
    return trim($name, '-_.') ?: 'upload';
}

function mime_from_name(string $name, string $fallback = 'application/octet-stream'): string {
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    return match ($ext) {
        'jpg', 'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'webp' => 'image/webp',
        'gif' => 'image/gif',
        'heic' => 'image/heic',
        'heif' => 'image/heif',
        'pdf' => 'application/pdf',
        'txt' => 'text/plain; charset=utf-8',
        default => $fallback,
    };
}

function is_image_mime(string $mime, string $name = ''): bool {
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    return str_starts_with($mime, 'image/') || in_array($ext, ['heic', 'heif', 'jpg', 'jpeg', 'png', 'webp'], true);
}

function memory_row_to_array(array $row): array {
    $stmt = db()->prepare('SELECT * FROM memory_files WHERE memory_id = ? ORDER BY sort_order ASC, id ASC');
    $stmt->execute([$row['id']]);
    $files = [];
    foreach ($stmt->fetchAll() as $file) {
        $files[] = [
            'id' => $file['id'],
            'name' => $file['original_name'],
            'url' => $file['url'],
            'previewUrl' => $file['preview_url'] ?: '',
            'mime' => $file['mime'],
            'size' => (int)$file['size_bytes'],
            'metadata' => json_decode($file['metadata_json'] ?: '{}', true) ?: [],
        ];
    }
    return [
        'id' => $row['id'],
        'title' => $row['title'],
        'date' => $row['memory_date'],
        'place' => $row['place'],
        'lat' => $row['lat'] !== null ? (float)$row['lat'] : null,
        'lng' => $row['lng'] !== null ? (float)$row['lng'] : null,
        'type' => $row['type'],
        'note' => $row['note'],
        'tags' => json_decode($row['tags_json'] ?: '[]', true) ?: [],
        'files' => $files,
        'metadata' => json_decode($row['metadata_json'] ?: '{}', true) ?: [],
        'createdAt' => $row['created_at'],
        'updatedAt' => $row['updated_at'],
    ];
}

function fetch_memories(): array {
    $rows = db()->query('SELECT * FROM memories ORDER BY memory_date DESC, created_at DESC')->fetchAll();
    return array_map('memory_row_to_array', $rows);
}

function filter_memories(array $memories): array {
    $q = mb_strtolower(trim($_GET['q'] ?? ''));
    $type = $_GET['type'] ?? 'all';
    return array_values(array_filter($memories, function ($memory) use ($q, $type) {
        $text = mb_strtolower(implode(' ', [
            $memory['title'],
            $memory['place'],
            $memory['date'],
            $memory['note'],
            implode(' ', $memory['tags']),
            implode(' ', array_map(fn($file) => $file['name'], $memory['files'])),
        ]));
        return ($q === '' || str_contains($text, $q)) && ($type === 'all' || $memory['type'] === $type);
    }));
}

function delete_memory_files(array $memory): void {
    $config = app_config();
    foreach ($memory['files'] as $file) {
        foreach ([$file['url'], $file['previewUrl'] ?? ''] as $url) {
            if (!$url || !str_starts_with($url, $config['upload_url'])) continue;
            $path = realpath($config['upload_dir'] . '/' . basename($url));
            $uploadRoot = realpath($config['upload_dir']);
            if ($path && $uploadRoot && str_starts_with($path, $uploadRoot) && is_file($path)) {
                @unlink($path);
            }
        }
    }
}
