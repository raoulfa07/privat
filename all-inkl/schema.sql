CREATE TABLE IF NOT EXISTS memories (
  id VARCHAR(80) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  memory_date DATE NOT NULL,
  place VARCHAR(255) NOT NULL DEFAULT '',
  lat DECIMAL(10, 7) NULL,
  lng DECIMAL(10, 7) NULL,
  type VARCHAR(40) NOT NULL DEFAULT 'photo',
  note TEXT NOT NULL,
  tags_json JSON NOT NULL,
  metadata_json JSON NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_memory_date (memory_date),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS memory_files (
  id VARCHAR(80) PRIMARY KEY,
  memory_id VARCHAR(80) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  preview_url VARCHAR(500) NOT NULL DEFAULT '',
  mime VARCHAR(120) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  metadata_json JSON NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  INDEX idx_memory_id (memory_id),
  CONSTRAINT fk_memory_files_memory
    FOREIGN KEY (memory_id) REFERENCES memories(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO memories (
  id, title, memory_date, place, lat, lng, type, note, tags_json, metadata_json, created_at, updated_at
) VALUES (
  'memory-first-date',
  'Unser erstes kleines Abenteuer',
  '2024-07-12',
  'Berlin',
  52.5200000,
  13.4050000,
  'note',
  'Ein Beispiel-Eintrag. Ersetze ihn mit euren echten Momenten, Fotos, Chat-Screenshots und Orten.',
  JSON_ARRAY('anfang', 'lieblingsmoment'),
  JSON_OBJECT('source', 'manual'),
  NOW(),
  NOW()
);
