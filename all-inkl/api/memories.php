<?php
declare(strict_types=1);
require __DIR__ . '/../private/bootstrap.php';

try {
    if (method() === 'GET') {
        json_response(filter_memories(fetch_memories()));
    }

    $id = path_id();

    if (method() === 'DELETE' && $id !== '') {
        $memory = null;
        foreach (fetch_memories() as $item) {
            if ($item['id'] === $id) {
                $memory = $item;
                break;
            }
        }
        if (!$memory) json_response(['error' => 'Erinnerung nicht gefunden'], 404);
        delete_memory_files($memory);
        $stmt = db()->prepare('DELETE FROM memories WHERE id = ?');
        $stmt->execute([$id]);
        json_response(['ok' => true, 'id' => $id]);
    }

    if (method() === 'PUT' && $id !== '') {
        $payload = json_decode(file_get_contents('php://input') ?: '{}', true) ?: [];
        $stmt = db()->prepare('SELECT * FROM memories WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) json_response(['error' => 'Erinnerung nicht gefunden'], 404);

        $place = array_key_exists('place', $payload) ? (string)$payload['place'] : $existing['place'];
        $hasLat = isset($payload['lat']) && $payload['lat'] !== '';
        $hasLng = isset($payload['lng']) && $payload['lng'] !== '';
        $geocoded = (!$hasLat || !$hasLng) && $place !== $existing['place'] ? geocode_place($place) : null;
        $metadata = json_decode($existing['metadata_json'] ?: '{}', true) ?: [];
        if ($geocoded) $metadata['geocoding'] = ['label' => $geocoded['label'], 'source' => $geocoded['source']];

        $stmt = db()->prepare('
            UPDATE memories
            SET title = ?, memory_date = ?, place = ?, lat = ?, lng = ?, type = ?, note = ?, tags_json = ?, metadata_json = ?, updated_at = NOW()
            WHERE id = ?
        ');
        $stmt->execute([
            $payload['title'] ?? $existing['title'],
            normalize_date($payload['date'] ?? '') ?: ($payload['date'] ?? $existing['memory_date']),
            $place,
            $hasLat ? (float)$payload['lat'] : ($geocoded['lat'] ?? $existing['lat']),
            $hasLng ? (float)$payload['lng'] : ($geocoded['lng'] ?? $existing['lng']),
            $payload['type'] ?? $existing['type'],
            $payload['note'] ?? $existing['note'],
            array_key_exists('tags', $payload) ? json_encode(normalize_tags((string)$payload['tags']), JSON_UNESCAPED_UNICODE) : $existing['tags_json'],
            json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            $id,
        ]);

        $stmt = db()->prepare('SELECT * FROM memories WHERE id = ?');
        $stmt->execute([$id]);
        json_response(memory_row_to_array($stmt->fetch()));
    }

    if (method() === 'POST') {
        $config = app_config();
        if (!is_dir($config['upload_dir'])) mkdir($config['upload_dir'], 0755, true);
        $memoryId = 'memory-' . bin2hex(random_bytes(12));
        $files = [];
        $uploads = $_FILES['files'] ?? null;
        $previews = $_FILES['previews'] ?? null;

        $count = is_array($uploads['name'] ?? null) ? count($uploads['name']) : 0;
        for ($i = 0; $i < $count; $i++) {
            if (($uploads['error'][$i] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) continue;
            $original = (string)$uploads['name'][$i];
            $mime = mime_from_name($original, (string)($uploads['type'][$i] ?? 'application/octet-stream'));
            $stored = time() . '-' . bin2hex(random_bytes(8)) . '-' . safe_file_name($original);
            $target = rtrim($config['upload_dir'], '/') . '/' . $stored;
            if (!move_uploaded_file($uploads['tmp_name'][$i], $target)) continue;
            $previewUrl = '';

            if (is_array($previews['name'] ?? null) && isset($previews['name'][$i]) && ($previews['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                $previewStored = 'preview-' . time() . '-' . bin2hex(random_bytes(8)) . '-' . safe_file_name((string)$previews['name'][$i]);
                $previewTarget = rtrim($config['upload_dir'], '/') . '/' . $previewStored;
                if (move_uploaded_file($previews['tmp_name'][$i], $previewTarget)) {
                    $previewUrl = rtrim($config['upload_url'], '/') . '/' . $previewStored;
                }
            }

            $files[] = [
                'id' => 'file-' . bin2hex(random_bytes(12)),
                'memory_id' => $memoryId,
                'original_name' => $original,
                'stored_name' => $stored,
                'url' => rtrim($config['upload_url'], '/') . '/' . $stored,
                'preview_url' => $previewUrl,
                'mime' => $mime,
                'size_bytes' => (int)$uploads['size'][$i],
                'metadata_json' => json_encode([], JSON_UNESCAPED_UNICODE),
                'sort_order' => $i,
            ];
        }

        $primaryImage = null;
        foreach ($files as $file) {
            if (is_image_mime($file['mime'], $file['original_name'])) {
                $primaryImage = $file;
                break;
            }
        }

        $fields = $_POST;
        $geocoded = empty($fields['lat']) || empty($fields['lng']) ? geocode_place((string)($fields['place'] ?? '')) : null;
        $date = normalize_date($fields['date'] ?? '') ?: date('Y-m-d');
        $place = (string)($fields['place'] ?? '') ?: 'Unbekannter Ort';
        $tags = normalize_tags((string)($fields['tags'] ?? ''));
        if ($primaryImage) $tags[] = 'foto';
        $tags = array_values(array_unique($tags));

        $metadata = [
            'source' => $primaryImage ? 'image' : 'manual',
            'takenAt' => '',
            'camera' => '',
            'dimensions' => null,
            'geocoding' => $geocoded ? ['label' => $geocoded['label'], 'source' => $geocoded['source']] : null,
        ];

        db()->beginTransaction();
        $stmt = db()->prepare('
            INSERT INTO memories (id, title, memory_date, place, lat, lng, type, note, tags_json, metadata_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ');
        $stmt->execute([
            $memoryId,
            (string)($fields['title'] ?? '') ?: "$place · $date",
            $date,
            $place,
            $fields['lat'] !== '' ? (float)$fields['lat'] : ($geocoded['lat'] ?? null),
            $fields['lng'] !== '' ? (float)$fields['lng'] : ($geocoded['lng'] ?? null),
            (string)($fields['type'] ?? '') ?: ($primaryImage ? 'photo' : 'note'),
            (string)($fields['note'] ?? ''),
            json_encode($tags, JSON_UNESCAPED_UNICODE),
            json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);

        $stmt = db()->prepare('
            INSERT INTO memory_files (id, memory_id, original_name, stored_name, url, preview_url, mime, size_bytes, metadata_json, sort_order, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ');
        foreach ($files as $file) {
            $stmt->execute([
                $file['id'], $file['memory_id'], $file['original_name'], $file['stored_name'], $file['url'],
                $file['preview_url'], $file['mime'], $file['size_bytes'], $file['metadata_json'], $file['sort_order'],
            ]);
        }
        db()->commit();

        $stmt = db()->prepare('SELECT * FROM memories WHERE id = ?');
        $stmt->execute([$memoryId]);
        json_response(memory_row_to_array($stmt->fetch()), 201);
    }

    json_response(['error' => 'Method not allowed'], 405);
} catch (Throwable $error) {
    if (db()->inTransaction()) db()->rollBack();
    json_response(['error' => $error->getMessage()], 500);
}
