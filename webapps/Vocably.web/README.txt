Vocably - Browser-Version
========================

Deployment
----------
1. Entpacke alle Dateien in einen Ordner auf deinem Webserver.
2. Rufe https://deine-domain.example/ordner/ auf.
3. Die App kann auch in einem Unterordner betrieben werden.
4. Für Service Worker, Offline-Cache und PWA-Installation ist HTTPS erforderlich
   (Ausnahme: localhost für lokale Entwicklung).

Lokale Daten
------------
- Vokabeln, Ordner, Einstellungen, Lernfortschritt und Statistiken werden lokal
  im Browser gespeichert.
- Primärer Speicher: IndexedDB.
- Rückfalllösung: localStorage, falls IndexedDB nicht verfügbar ist.
- Daten sind an Browser, Gerät und Domain gebunden. Sie werden nicht automatisch
  zwischen Geräten synchronisiert.
- Regelmäßige und manuelle Backups können als JSON exportiert werden.
- Browserdaten löschen oder privates Surfen kann lokale Daten entfernen.
  Deshalb regelmäßig ein Backup exportieren.

Browserfunktionen
-----------------
- Dateiimport: HTML-Dateiauswahl des Browsers.
- Export: Browser-Download.
- Sprachausgabe: Web Speech API, abhängig von Browser und installierten Stimmen.
- Haptik: Vibration API, falls vom Gerät und Browser unterstützt.
- Offline-App: Service Worker cached die App nach dem ersten Online-Aufruf.

Hinweis
-------
Optionale Online-Hilfe der App kann Texte an externe Übersetzungs- bzw.
Prüfdienste senden. Die eigentlichen App-Daten werden lokal gespeichert.
