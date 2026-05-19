# ALL-INKL Deployment

Dieses Verzeichnis enthaelt die PHP/MySQL-Version fuer klassischen Webspace.

## 1. Paket bauen

Lokal im Projekt:

```bash
npm run build:all-inkl
```

Das erzeugt:

```text
dist/all-inkl/
```

Diesen Ordnerinhalt per SFTP/FTP in den Webspace hochladen.

## 2. Datenbank anlegen

Im ALL-INKL KAS eine MySQL/MariaDB-Datenbank anlegen und dann `schema.sql` importieren, z. B. ueber phpMyAdmin.

## 3. Config anlegen

Auf dem Server:

```text
private/config.example.php
```

kopieren zu:

```text
private/config.php
```

Dann Datenbankdaten und optional Gemini-Key eintragen.

`private/config.php` niemals in GitHub committen.

## 4. Schreibrechte

Der Ordner muss vom Webserver beschreibbar sein:

```text
uploads/
```

## 5. Test

Nach dem Upload im Browser aufrufen:

```text
https://deine-domain.de/api/health
```

Wenn dort `ok: true` steht, funktionieren PHP, Datenbank und Upload-Ordner.

Danach die Webseite normal oeffnen und eine Test-Erinnerung hochladen.
