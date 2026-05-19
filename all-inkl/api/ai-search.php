<?php
declare(strict_types=1);
require __DIR__ . '/../private/bootstrap.php';

const GEMINI_MODEL = 'gemini-2.5-flash';

function memory_search_text(array $memory): string {
    return mb_strtolower(implode(' ', [
        $memory['title'],
        $memory['place'],
        $memory['date'],
        $memory['note'],
        implode(' ', $memory['tags']),
        implode(' ', array_map(fn($file) => $file['name'], $memory['files'])),
    ]));
}

function fallback_ai_search(string $question, array $memories, bool $configured = false): array {
    $terms = array_values(array_filter(preg_split('/[\s,.;:!?()]+/u', mb_strtolower($question)), fn($term) => mb_strlen($term) > 2));
    $scored = [];
    foreach ($memories as $memory) {
        $text = memory_search_text($memory);
        $score = 0;
        foreach ($terms as $term) {
            if (str_contains($text, $term)) $score += 2;
        }
        if ($score > 0 || !$terms) $scored[] = ['memory' => $memory, 'score' => $score];
    }
    usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);
    $found = array_slice(array_map(fn($item) => $item['memory'], $scored), 0, 6);
    return [
        'answer' => $found ? 'Ich habe ' . count($found) . ' passende Erinnerung' . (count($found) === 1 ? '' : 'en') . ' gefunden.' : 'Ich habe noch keine passende Erinnerung gefunden.',
        'memories' => $found,
        'source' => 'local',
        'configured' => $configured,
    ];
}

function summarize_memory(array $memory): array {
    return [
        'id' => $memory['id'],
        'title' => $memory['title'],
        'date' => $memory['date'],
        'place' => $memory['place'],
        'type' => $memory['type'],
        'note' => $memory['note'],
        'tags' => $memory['tags'],
        'files' => array_map(fn($file) => ['name' => $file['name'], 'mime' => $file['mime']], $memory['files']),
    ];
}

function gemini_search(string $question, array $memories): array {
    $config = app_config();
    $apiKey = trim((string)($config['gemini_api_key'] ?? ''));
    if ($apiKey === '') return fallback_ai_search($question, $memories, false);

    $candidates = array_slice(array_map('summarize_memory', $memories), 0, 80);
    $prompt = implode("\n\n", [
        'Du bist die Such-KI fuer eine private Jahrestags-Webseite von Charleen und Raoul.',
        'Nutze ausschliesslich die folgenden Erinnerungs-Metadaten. Erfinde keine Erinnerungen.',
        'Antworte warm, kurz und konkret auf Deutsch.',
        'Gib ausschliesslich valides JSON im Format {"answer":"...","memoryIds":["..."]} zurueck.',
        "Frage: $question",
        'Erinnerungen: ' . json_encode($candidates, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);

    $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . GEMINI_MODEL . ':generateContent';
    $payload = json_encode([
        'system_instruction' => ['parts' => [['text' => 'Du findest passende Erinnerungen in privaten Metadaten und antwortest nur als JSON.']]],
        'contents' => [['parts' => [['text' => $prompt]]]],
        'generationConfig' => ['temperature' => 0.2, 'responseMimeType' => 'application/json'],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nx-goog-api-key: $apiKey\r\n",
            'content' => $payload,
            'timeout' => 20,
        ],
    ]);
    $body = @file_get_contents($url, false, $context);
    if (!$body) {
        $fallback = fallback_ai_search($question, $memories, true);
        $fallback['warning'] = 'Gemini war nicht erreichbar.';
        return $fallback;
    }
    $data = json_decode($body, true);
    $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '{}';
    $parsed = json_decode(trim($text), true);
    if (!is_array($parsed)) return fallback_ai_search($question, $memories, true);
    $ids = array_slice($parsed['memoryIds'] ?? [], 0, 8);
    $byId = [];
    foreach ($memories as $memory) $byId[$memory['id']] = $memory;
    $selected = array_values(array_filter(array_map(fn($id) => $byId[$id] ?? null, $ids)));
    return [
        'answer' => (string)($parsed['answer'] ?? 'Ich habe passende Erinnerungen herausgesucht.'),
        'memories' => $selected ?: fallback_ai_search($question, $memories, true)['memories'],
        'source' => 'gemini',
        'configured' => true,
    ];
}

try {
    if (method() !== 'POST') json_response(['error' => 'Method not allowed'], 405);
    $payload = json_decode(file_get_contents('php://input') ?: '{}', true) ?: [];
    $question = trim((string)($payload['question'] ?? ''));
    if ($question === '') json_response(['error' => 'Bitte stelle eine Frage.'], 400);
    json_response(gemini_search($question, fetch_memories()));
} catch (Throwable $error) {
    json_response(['error' => $error->getMessage()], 500);
}
