# App-Bibliothek 2.0

## Projektstruktur
- `index.html` – Gerüst; `css/app.css` – Design; `sw.js` – Offline-Cache und Auslieferung lokaler Apps; `manifest.webmanifest`, `icon.svg`
- `js/` (Ladereihenfolge): `core` Hilfen/Fehleranzeige · `sources` Zustand, Quellen, GitHub-Laden · `metadata` app.json und HTML-Auslese · `ui` Karten, Navigation · `detail` Detailseite · `launcher` Vollbild, Zurück-Geste · `notify` Hinweise · `share` Links · `settings` Einstellungen, Systemcheck · `local` lokale Apps, ZIP-Export, QR · `main` Start
- `js/vendor/` – `qrcode.js` (qrcode-generator 1.4.4, MIT) und `jszip.min.js` (JSZip 3.10.1, MIT/GPLv3)
- `htmls/`, `webapps/`, `library-data/` – deine Inhalte (im Repository, nicht im ZIP)

## Installation & GitHub Pages
Inhalt des ZIPs in das Hauptverzeichnis des Repositories hochladen, unter Settings → Pages den Branch `main` (Ordner `/`) aktivieren. Auf dem iPad in Safari öffnen und „Zum Home-Bildschirm“ wählen. Service Worker und lokale Apps brauchen https.

## Repository hinzufügen
Einstellungen → Meine Quellen → „nutzer/repository“ eingeben. Das Repository braucht `htmls/` und/oder `webapps/NAME/index.html`. Direkte Webapp-URLs gehen ebenfalls.

## Metadaten (`library-data/NAME/app.json`)
NAME = Dateiname ohne `.html` bzw. Ordnername. Alle Felder optional, unbekannte werden ignoriert:
`name, description, type ("app"|"game"), category, tags[], icon, previews[], version, developer, published, modified, offline, color, changelog[]`
Icon liegt in `library-data/NAME/`, Vorschauen ohne Pfad in `library-data/NAME/previews/` (Bilder, GIF, mp4/webm).

## App importieren (lokal)
Einstellungen → Eigene Apps → HTML-Datei oder ZIP wählen. Die ZIP braucht `index.html` im Hauptordner; Pfade mit `..`, absolute Pfade und Laufwerke werden abgelehnt, es wird alles oder nichts gespeichert. Lokale Apps liegen in IndexedDB und werden vom Service Worker unter `local/<id>/` ausgeliefert. Sie lassen sich als ZIP exportieren und löschen, nie hochladen.

## Neue App veröffentlichen
Datei nach `htmls/` bzw. Ordner nach `webapps/` hochladen, optional `library-data/NAME/app.json` ergänzen. Beim nächsten Aktualisieren erscheint sie automatisch.

## Installieren, Updates, Archiv
In der Detailansicht von Repository-Apps: „Installieren“ lädt alle Dateien lokal (IndexedDB), prüft jede Datei gegen den Git-SHA aus der GitHub-API und startet die App künftig offline. Ein Update wird über geänderte SHAs erkannt. Beim Update: „Alte Version sichern und updaten“ (Archiv) oder „Updaten“, „Später“ verschiebt. Der Download läuft in einen Zwischenbereich und wird erst nach vollständiger Prüfung in einer Transaktion aktiviert; bei Fehlern bleibt die alte Version, abgebrochene Downloads werden fortgesetzt. Die Warnung „Inkompatible Daten werden unwiderruflich gelöscht“ erscheint nur, wenn die neue app.json `"migration": {"dataLoss": true, "deleteLocalStorage": ["prefix_"]}` enthält; gelöscht werden ausschließlich localStorage-Schlüssel mit diesen Präfixen. Archiv: öffnen, wiederherstellen (aktuelle Version wird archiviert), löschen.

## Bibliotheken als Quelle
In der anderen Bibliothek Einstellungen → Eigene Apps → „Bibliotheks-Export“, `library-export.json` ins Hauptverzeichnis legen. Hier Quelle „Bibliotheks-Repository“ hinzufügen.

## Ordner, Pins, Verlauf
Detailansicht → „Ordner“ legt Ordner an und ordnet Apps zu (Anzeige unter „Meine Apps“, Verwaltung in den Einstellungen). „Anpinnen“ sortiert Apps nach oben. Tags in der Detailansicht starten eine Suche. Der Nutzungsverlauf steht in den Einstellungen.

## Lokale Apps bearbeiten und aktualisieren
Detailansicht einer lokalen App: „Bearbeiten“ (Name, Beschreibung, Typ, Kategorie, Tags, Icon, Vorschau-Medien) und „Neue Version importieren“ (mit Archivierung der alten Version).

## Speicher, Sicherung, Notfallmodus
Einstellungen → Speicher zeigt Verbrauch pro App, Archiv und Gesamt und warnt ab 85 %. „Vorschauen und temporäre Daten entfernen“ löscht nur Zwischenspeicher. „Einstellungen exportieren“ sichert Quellen, Favoriten, Ordner und Verlauf (lokale Apps separat als ZIP). Lief der vorherige Start nicht stabil, wird der Notfallmodus automatisch aktiviert.

## Berechtigungen
app.json: `"permissions": ["camera","microphone","geolocation","clipboard","motion"]` und optional `"features": ["webgl","webaudio","indexeddb"]`. Genannte Rechte werden an die App delegiert, nur diese. Ohne Angabe gilt der Kompatibilitätsmodus; „Strenge Berechtigungen“ (Einstellungen) sperrt dann alles. Der Browser fragt weiterhin selbst nach.

## Sortierung, Wiederaufnahme
Sortierung „Manuell“: das Griff-Symbol auf der Karte ziehen, die Reihenfolge wird gespeichert. Die Update-Warteschlange und unterbrochene Downloads werden nach einem Neustart zur Fortsetzung angeboten. Solange die Bibliothek offen ist, wird alle 15 Minuten nach Updates gesucht (abschaltbar). „Reparieren“ in den Einstellungen baut Metadaten und defekte Cache-Einträge neu auf; fehlerhafte Einträge werden isoliert angezeigt.

## Stabilität und Tests
- Eine defekte Quelle, Karte oder Einstellung blockiert nicht den Rest; Anzeige-Fehler werden pro Karte isoliert. Beschädigte Einstellungen werden verworfen, installierte Apps bleiben auch ohne ihre Quelle benutzbar.
- Apps und Metadaten werden mit „Netzwerk zuerst“ geladen (Zwischenspeicher nur als Rückfall), die Bibliothek selbst mit „Zwischenspeicher zuerst“.
- Automatisch geprüft (jsdom mit simuliertem GitHub und IndexedDB): Laden und Anzeige, Detailansicht, QR-Code, Installieren, Update, Archiv und Wiederherstellen, Integritätsprüfung bei manipulierter Datei, Migrations-Dialog (Abbrechen und Fortfahren), Deep-Link, QR-Import, Bibliotheks-Quelle, lokaler Import und lokales Update, defekte Quelle, Ordner, Berechtigungen. Nicht automatisch prüfbar sind Service Worker, Kamera, Ziehen per Touch und das Verhalten auf iPadOS.

## Teilen
Link `?source=nutzer/repo&app=html:name` oder QR-Code (identischer Link) in der Detailseite. Der Link öffnet die Detailansicht, startet nichts.

## Offline-Modus
Die Bibliothek und alles, was einmal geöffnet wurde (gleiche Domain), liegt im Cache. Nicht besuchte Dateien einer Webapp sind offline nicht sicher da.

## Einschränkungen
- Alle Funktionen des Prompts sind umgesetzt, soweit im Browser möglich. Grenzen: keine echte Prozess- oder Origin-Trennung zwischen Apps derselben Domain, keine Updates im Hintergrund bei geschlossener Bibliothek (Browser-Beschränkung).
- Apps aus Bibliotheks-Quellen (`library-export.json`) lassen sich öffnen und per Direktlink teilen, aber nicht installieren.
- Apps derselben Domain teilen sich localStorage/IndexedDB; echte Trennung gibt es nur zwischen Domains.
- Lokale Apps: root-absolute Pfade werden über den Service Worker auf die App-Dateien abgebildet; Webapps mit eigenem Service Worker können Konflikte verursachen.
- Die Zurück-Ecke oben rechts (ca. 52 px) gehört der Bibliothek; Tippen dort erreicht die App nicht.
- GitHub-API ohne Key: 60 Anfragen pro Stunde und IP.

## Fehlerbehebung
Systemcheck unter Einstellungen → System. Bei Problemen Notfallmodus aktivieren oder „Cache leeren“. Seite nach einem Update des Service Workers einmal neu laden.

## Ordnerstruktur 
/                          ← Hauptverzeichnis des Repositories
├── index.html
├── sw.js
├── manifest.webmanifest
├── icon.svg
├── README.md
├── css/
│   └── app.css
├── js/
│   ├── core.js, sources.js, metadata.js, ui.js, detail.js,
│   │   launcher.js, notify.js, share.js, settings.js,
│   │   local.js, updater.js, scan.js, extras.js, main.js
│   └── vendor/
│       ├── qrcode.js, jszip.min.js, jsqr.js
│
├── htmls/                 ← deine HTML-Dateien (hast du schon)
│   └── mein-spiel.html
├── webapps/               ← deine Webapps (hast du schon)
│   └── rechner/
│       └── index.html
└── library-data/          ← optional, kommt neu dazu
    └── mein-spiel/        ← Name der Datei ohne .html bzw. Ordnername
        ├── app.json
        ├── icon.png
        └── previews/
            ├── screenshot-1.jpg
            └── gameplay.mp4
