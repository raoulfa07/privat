<?php
declare(strict_types=1);
require __DIR__ . '/../private/bootstrap.php';

try {
    db()->query('SELECT 1');
    json_response([
        'ok' => true,
        'php' => PHP_VERSION,
        'database' => true,
        'uploadsWritable' => is_writable(app_config()['upload_dir']) || mkdir(app_config()['upload_dir'], 0755, true),
        'geminiConfigured' => trim((string)(app_config()['gemini_api_key'] ?? '')) !== '',
    ]);
} catch (Throwable $error) {
    json_response(['ok' => false, 'error' => $error->getMessage()], 500);
}
