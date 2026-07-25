# Changelog

Entwicklungsnotizen für `musikisum/educandu-plugin-mei-studio`. Nicht auf
Nutzer:innen ausgerichtet, sondern als Gedächtnisstütze für künftige
Weiterentwicklung — was wurde gebaut, warum, und welche Fallstricke gab es.

## 2026-07-25/26 — Umbenennung zu MEI-Studio, Tempo/Lautstärke-Mixer, v1.0.0-Vorbereitung

### Umbenennung: `mei-import` → `mei-studio`

Der alte Name suggerierte reines Importieren/Anzeigen; das Plugin kann
inzwischen deutlich mehr (Wiedergabe, Stimmen-Mix, Hervorhebung). Komplette
Umbenennung *vor* dem ersten npm-Publish (danach wäre ein Paket-Rename
deutlich aufwändiger): Dateinamen (`mei-import-*.js` → `mei-studio-*.js`),
Klassennamen (`MeiImport*` → `MeiStudio*`), `typeName`/i18n-Namespace
(`musikisum/educandu-plugin-mei-import` → `-mei-studio`), CSS-Präfix
(`EP_Musikisum_MeiImport_*` → `EP_Musikisum_MeiStudio_*`), npm-Paketname,
GitHub-Repo. `mei-document.js`/`mei-playback.js`/`mei-voice-utils.js`
behalten ihre Namen (waren nie an "Import" gebunden).

### Verovio/esbuild-Kompatibilität: Postinstall-Patch statt Gulp-Hack

Verovios WASM-Loader enthält einen Node-Fallback-Zweig
(`await import("node:module")`), den esbuild beim Bündeln nicht auflösen
kann (Fehler: `Could not resolve "node:module"`), obwohl der Zweig im
Browser nie ausgeführt wird. Ursprünglich per `external: ['node:module']`
in `gulpfile.js` umgangen — das hätte aber bedeutet, dass jedes Projekt,
das dieses Plugin einbindet (z.B. oma-web), dieselbe Gulp-Änderung
manuell nachziehen muss.

Stattdessen: `scripts/patch-verovio.mjs`, per `postinstall`-Script
verdrahtet, patcht `verovio/dist/verovio-module.mjs` direkt nach jedem
`yarn install` (String-Splitting `["node","module"].join(":")` versteckt
die Stelle vor esbuilds statischer Analyse, ohne das Laufzeitverhalten in
echtem Node zu ändern). Läuft automatisch mit, auch wenn dieses Plugin nur
als normale Dependency in einem anderen Projekt installiert wird — dort
werden `postinstall`-Skripte von Dependencies ausgeführt.

`patch-package` wurde bewusst *nicht* verwendet: verovio bettet den
kompletten WASM-Kern (~7 MB) als eine einzige Zeile in die Datei ein, git
erkennt das als Binärdatei, ein funktionierender Patch dafür wäre ~14 MB
groß gewesen (getestet, technisch machbar, aber unverhältnismäßig).

### Tonhöhenberechnung: eigene MEI-Auswertung durch Verovios MIDI-Export ersetzt

Bug gefunden: `getMidiNumberForNote()` (eigene Pitch-Klassen-/Akzidenzien-
Berechnung aus `pname`/`oct`/`accid`-Attributen) prüfte nur Attribute
direkt auf `<note>`, nicht das alternative `<accid>`-Kind-Element, in dem
manche Exporttools den klingenden Halbton (z.B. aus der
Generalvorzeichnung resultierend) ablegen — Ergebnis: falsche Tonhöhe in
der Wiedergabe, ohne jeden Hinweis.

Fix: komplette eigene Tonhöhenberechnung entfernt
(`PITCH_CLASS_OFFSETS`/`ACCIDENTAL_OFFSETS`/`getMidiNumberForNote`).
Stattdessen `toolkit.renderToMIDI()` + `toolkit.getMIDIValuesForElement(id)`
je Note — liefert Pitch, Start- und Dauerzeit direkt von Verovio, korrekt
für jede Art der Akzidenzien-Kodierung (Attribut, Kind-Element,
reine Vorzeichen-Interpretation), da die Fehlerklasse damit komplett an
die Notationsengine delegiert ist statt selbst nachgebaut zu werden.
`buildVoiceInfoByNoteId` → `buildVoiceKeyByNoteId` (liefert nur noch den
Stimmen-Key, keine Tonhöhe mehr).

### Stimmen-Lautstärke-Mixer statt Einzelstimmen-Dropdown

`highlightedVoice` (eine Stimme auswählen, binär hervorgehoben/nicht) ersetzt
durch `voiceVolumes` (Objekt `{ [stimmenKey]: 0..1 }`) — stufenlose
Lautstärke pro Stimme statt einer einzelnen Auswahl. Editor-UI:
`TrackMixerDisplay` aus `@educandu/educandu/components/media-player/`
(dieselbe Komponente wie im Mehrspurplayer, inkl. Solo-Button, kostenlos
mitgekommen) statt eines `Select`-Dropdowns.

Wiedergabe: kontinuierliche MIDI-Velocity zwischen 45–100 statt binärer
Stufen, Lautstärke 0 mutet die Stimme beim Rendern komplett (kein
`piano.start()`-Aufruf), nicht nur leiser. Noten-Einfärbung: Deckkraft
(`opacity`, nicht RGB-Mischung Richtung Schwarz — erste Version dazu wurde
verworfen, siehe unten) proportional zur Lautstärke, `highlightColor` ist
jetzt eine reine Akzentfarbe statt "Hervorhebung vs. Standard".

**Verworfener Zwischenschritt:** `blendColorWithVolume()` (RGB-Kanäle
Richtung Schwarz skaliert) wurde zuerst gebaut, dann wieder entfernt —
Deckkraft-basierter Ansatz überzeugte mehr (bei Schwarz als Akzentfarbe
hätte die RGB-Mischung keinen sichtbaren Unterschied zwischen
Lautstärkestufen ergeben, Deckkraft schon).

### Tempo- und "Stille entfernen"-Regler

- **Tempo:** Verovios Toolkit-Option `midiTempoAdjustment` (0.2×–4×,
  getestet und korrekt), direkt beim Rendern angewendet — keine
  Tonhöhen-/Zeitdehnungs-Artefakte wie bei nachträglichem `playbackRate`
  auf der fertigen Aufnahme (der TODO-Punkt aus der letzten Sitzung war
  richtig geraten: `MediaPlayer`s `allowPlaybackRate` funktioniert bereits
  nativ; `midiTempoAdjustment` ist trotzdem die sauberere Lösung, weil sie
  am Ursprung ansetzt statt am Ergebnis).
- **Stille entfernen (`removeSilence`, Standard: an):** Verovio reserviert
  für Strukturen, die es ohne explizites `<expansion>`-Element nicht
  auflösen kann (typischerweise eine ausgeschriebene Wiederholung ohne
  verdoppelten Notentext für den zweiten Durchgang), stille Zeit in der
  MIDI-Ausgabe, statt sie mit Noten zu füllen — bestätigt per direkter
  Messung an einer echten Testdatei (~11,5s Lücke exakt an der
  Wiederholungsstelle). `collapseLongSilences()` (reine, getestete
  Funktion in `mei-voice-utils.js`) kürzt Lücken über `MAX_SILENCE_MS`
  (1500ms) auf diesen Wert, kürzere (normale musikalische Pausen) bleiben
  unangetastet. Schalter vorhanden, falls eine Datei bewusst eine lange
  Pause haben soll.

### CSS-Overflow-Fix + Lehren aus einer gescheiterten Live-Reflow-Lösung

**Bug:** Notenansicht bekam unter ~1200px Breite einen Scrollbalken für
die ganze Seite. Ursache: `.DocumentPage-document` (educandu-Kernklasse,
CSS-Grid-Item) hat `min-width: auto` (Browser-Standard) — ein Grid-/
Flex-Item darf sich nie unter die Breite seines "nicht schrumpfbaren"
Inhalts verkleinern, und Verovios SVG hat eine feste Pixelbreite. Fix
(dauerhaft, bewährt): `min-width: 0; overflow-x: auto;` auf dem eigenen
`.EP_Musikisum_MeiStudio_Document`-Wrapper — kappt die Weitergabe der
Mindestbreite nach oben, ohne educandus Kern-CSS anzufassen.

**Verworfen: `DimensionsProvider` (ResizeObserver) für Live-Reflow bei
Fenstergrößenänderung.** Mehrere Anläufe (Stale-Guard gegen Async-Races,
Breiten-Dämpfung gegen vermutete Scrollbalken-Oszillation) führten
letztlich zu einem **Dauerflackern** — schlimmer als der ursprüngliche
"Notenansicht passt sich nicht an"-Bug, und genau das Szenario, vor dem
im Rahmen der Absturzsicherheits-Besprechung gewarnt wurde (siehe unten).
Komplett zurückgebaut auf die ursprüngliche einmalige
`divRef.current.clientWidth`-Messung pro Layout-Durchlauf. Stattdessen:
ein simpler `window.resize`-Listener zeigt einen dismissable Hinweis
("Bitte Seite neu laden"), wenn sich die Fensterbreite nach dem ersten
Rendern um mehr als 20px ändert (in beide Richtungen) — kein Live-Fix,
aber stabil, und laut Rückmeldung des Auftraggebers für die Praxis
ausreichend (Fenster-Verkleinern kommt außerhalb von Tests kaum vor).
**Lehre:** ResizeObserver-getriebene Neuberechnungen, die selbst die
Layout-Höhe verändern (und damit potenziell einen vertikalen
Scrollbalken samt dessen Breite beeinflussen), sind ein reales
Rückkopplungsrisiko — im Zweifel lieber eine einfache, statische Lösung
plus Nutzerhinweis als ein fragiles Live-System.

### Absturzsicherheit: educandu hat keine Error Boundary

Bestätigt per vollständiger Quellcode-Durchsicht: educandu wrapt
Sektionen (Display *und* Editor) nirgends in eine React Error Boundary,
weder pro Sektion noch für die ganze Seite — ein einziger synchroner
Fehler im Render-Pfad *irgendeines* Plugins reißt laut React-Verhalten
den gesamten Seitenbaum ab einer einzigen `hydrateRoot`-Root ein, alle
nicht gespeicherten Änderungen auf der Seite gehen verloren. Async-Fehler
(in `useEffect`, Promises, Handlern) sind davon nicht betroffen — nur ein
synchroner Throw *während* des Renderns.

Ein konkreter, damals bestehender Fall gefunden und gefixt:
`voiceVolumes[voice.key]` in `mei-studio-editor.js` ohne Fallback — bei
Content, der vor Einführung des `voiceVolumes`-Felds gespeichert wurde,
wäre das ein synchroner `TypeError` im Render gewesen. Fix:
`voiceVolumes = {}` als Default in der Destrukturierung (Analog-Fix schon
vorher für `tempo`/`removeSilence` im selben File).

### Sonstiges

- `README.md` korrigiert: erwähnte einen `MeiStudioController`/
  `mei-studio-controller.js`, den es nie gab (Altlast aus der Zeit vor der
  Vereinfachung auf reinen Client-Code).
- `TODO-oma-web-integration.md` komplett überarbeitet als Checkliste für
  die tatsächliche Einbindung (npm-Publish-Status, Postinstall-Patch,
  Peer-Dependencies, Bundle-Größe, fehlender Migrationsbedarf, Smoke-Test).

### TODO für eine kommende Sitzung

- Alle heutigen Fixes (Absturzsicherheit, CSS-Overflow, Resize-Hinweis)
  wurden nur in der eigenen Test-App verifiziert, noch nicht innerhalb
  von oma-web selbst — nach der echten Integration einmal grundlegend
  gegentesten.

## 2026-07-16/17 — Takte pro Zeile, Gehörbildungsmodus, diverse Fixes

### Takte pro Zeile (`measuresPerLine`)

Verovio hat keine native "N Takte pro Zeile"-Option (nur breitenbasiertes
Auto-Layout oder encodierte `<sb/>`/`<pb/>`-Umbrüche). Neuer Editor-Regler
(0 = Automatisch/Default, 1–16 = feste Taktanzahl), der bei aktivem Wert
selbst `<sb/>`-Elemente in die MEI-Daten injiziert:

- `src/mei-layout-utils.js` — `applyMeasuresPerLine()`, reine DOM-Funktion
  (DOMParser/XMLSerializer), entfernt vorhandene `<sb/>`/`<pb/>` und fügt
  neue nach jedem N-ten Takt ein. Zählung läuft durchgehend über
  Section-/Ending-/mdiv-Grenzen (keine Sonderbehandlung von Wiederholungen/
  Auftakten — bekannte v1-Einschränkung).
- `src/mei-document.js` cached den rohen MEI-Text zusätzlich zur URL
  (`lastRawMeiData`-Ref), damit ein reiner Regler-Wechsel kein neues
  Netzwerk-Fetch auslöst, aber trotzdem `toolkit.loadData()` (nicht nur
  `redoLayout()`) durchführt.

### Gehörbildungsmodus (Stimme hervorheben: Farbe + Wiedergabe)

Neuer, standardmäßig deaktivierter Editor-Bereich (`playbackEnabled`,
Switch), der eine Stimme farblich markiert (`highlightColor`, per
`ColorPicker`, Default `#00ff00`) und akustisch hervorhebt.

**Architektur:**
- `src/mei-voice-utils.js` — `extractVoices()` (Editor: Stimmen-Dropdown,
  liest Staff/Layer + `<label>` aus der Rohdatei), `countNotes()`
  (Größen-Check), `buildVoiceInfoByNoteId()`/`buildNoteEvents()` (Display:
  laufen gegen `toolkit.getMEI()`, **nicht** die Rohdatei — Verovio vergibt
  fehlende `xml:id`s automatisch, nur `getMEI()` enthält garantiert
  dieselben IDs wie `renderToTimemap()`/`renderToSVG()`-Output).
- `src/mei-document.js` berechnet Note-Events/Stimmen-Zuordnung im
  bestehenden Lade-Effekt (nicht in einer separaten Komponente — der
  Verovio-Toolkit ist ein modulweites Singleton, ein zweiter unabhängiger
  Zugriff würde mit dem angezeigten Inhalt kollidieren) und färbt die
  gewählte Stimme per Post-Render-DOM-Pass ein (Inline-Style `fill`/
  `stroke`, nicht CSS-Klasse — Farbe ist pro Dokument konfigurierbar).
- `src/mei-playback.js` — kopiert die Struktur von
  `@educandu/educandu/components/abc-player.js` (Offline-Rendering zu
  WAV-Blob → bestehender `MediaPlayer` mit Seek/Loop/Download/
  Playback-Rate). Instrument: `smplr`s `SplendidGrandPiano` (aktiv
  gepflegt, im Gegensatz zum veralteten `soundfont-player`).
  Sample-Fetch (externe Ressource, `smpldsnds.github.io`) passiert
  bewusst erst nach Klick auf "Play", nie automatisch — DSGVO-Erwägung,
  gleicher Standard wie beim schon vorhandenen `abc-player` (lädt von
  `educandu.github.io`).

**Zwei nicht-offensichtliche Bugs unterwegs gefunden und gefixt:**
1. **Nur eine Note hörbar, dann Stille:** `smplr`s Standard-Scheduler
   dispatcht nur Events innerhalb eines kurzen (200ms) Echtzeit-Lookahead-
   Fensters sofort; alles Spätere landet in einer Warteschlange, die per
   `setInterval` gegen `context.currentTime` abgeglichen wird. Bei
   `renderOffline()` läuft die Zeit nicht in Echtzeit — die Warteschlange
   holt nie auf. Fix: eigener `Scheduler` mit `lookaheadMs`, das die
   gesamte Stückdauer abdeckt, wird der Piano-Instanz mitgegeben.
2. **Sehr lange Ladezeit bei großen Stücken:** `SplendidGrandPiano` lädt
   sonst den vollen Tonumfang + alle Velocity-Layer. Fix: `notesToLoad`
   auf die im Stück tatsächlich vorkommenden Tonhöhen + nur die zwei
   verwendeten Velocity-Stufen beschränkt.

**Sicherheitsgrenze:** `MAX_NOTE_COUNT_FOR_PLAYBACK` (800, grober
Schätzwert, in `constants.js` leicht anpassbar) — oberhalb dieser
Notenzahl wird die Wiedergabe deaktiviert (mit Erklärung statt endlosem
Laden), Anzeige und Farbmarkierung bleiben unberührt. Editor warnt schon
vorher analog zur bestehenden Dateigrößen-Warnung.

### Bugfixes an bestehender Funktionalität

- **CORS-Bug bei externen Dateien:** Alle drei Fetch-Stellen (Anzeige,
  Editor-Dateigrößen-Check, Editor-Stimmenerkennung) haben pauschal
  `withCredentials: true` gesendet. Nach CORS-Spezifikation blockieren
  Browser aber jede credentialed Anfrage gegen eine Antwort mit
  `Access-Control-Allow-Origin: *` (Wildcard) — eine sehr verbreitete
  Konfiguration bei offenen externen Angeboten (z.B. Bach Digital). Fix:
  `withCredentials`/`credentials` wird jetzt per
  `isInternalSourceType({ url, cdnRootUrl })` bestimmt (Cookies nur für
  eigene CDN-Inhalte) — Muster aus dem educandu-Core übernommen
  (`media-player.js`, `pdf-viewer-display.js` u.a. machen das schon so).
- **Bessere Fehlermeldung:** Verovio meldet den genauen Grund eines
  fehlgeschlagenen `loadData()` (z.B. "No `<body>` element found in the
  MEI data") nur über `console.error`/`console.warn`, nicht über
  Rückgabewert oder Exception. `mei-document.js` fängt das jetzt ab
  (`captureVerovioMessages()`, temporäre Console-Interception um den
  `loadData()`-Aufruf) und zeigt es zusätzlich zur generischen
  Fehlermeldung an. Ausgelöst durch eine Bach-Digital-Datei, die zwar
  valides MEI-XML war, aber ein leeres `<music/>`-Element hatte
  (Werk-Datensatz ohne hinterlegte Transkription).

### Sonstiges

- `jsdom` als Dev-Dependency (Unit-Tests für DOM-basierte Utilities,
  `// @vitest-environment jsdom` nur in den betroffenen Spec-Dateien).
- `smplr` als Runtime-Dependency (lazy per `import()`, wie Verovio selbst).
- `/assets/**` in `.gitignore` — lokaler Ablageort für Test-MEI-Dateien,
  nie Teil des Repos.

### TODO für eine kommende Sitzung

- **Tempo-/Geschwindigkeitsänderung bei der Wiedergabe:** `MediaPlayer`
  wird bereits mit `allowPlaybackRate` eingebunden — die Standard-Player-
  Steuerung bringt dafür schon eine fertige Auswahl mit (`MEDIA_PLAYBACK_RATES`
  in `@educandu/educandu/domain/constants.js`: 0.25×–2×, feine Stufen um 1×),
  läuft über die browsernative `playbackRate` (i.d.R. tonhöhenerhaltend).
  Vermutlich funktioniert das schon ohne weiteren Code — **noch nicht im
  Browser bestätigt**, das ist der offene Punkt für nächstes Mal.

### Bewusst nicht umgesetzt

- **XML ansehen/bearbeiten im Editor** (für Nutzer:innen mit MEI-Kenntnissen):
  durchdacht und explizit verworfen. Echtes Bearbeiten+Zurückspeichern
  bräuchte Schreibzugriff auf den CDN/Upload, den das Plugin nicht hat —
  spürbar größerer Scope als bisher. Eine reine Nur-Lese-Ansicht wurde
  ebenfalls verworfen: der Diagnosenutzen ("warum lädt das nicht") ist
  durch die neue detaillierte Fehlermeldung bereits abgedeckt, und wer die
  Datei sowieso schon hat (hochgeladen oder externe URL), kann sie genauso
  gut am Original ansehen — eine Kopie im Plugin hätte keinen
  eigenständigen Mehrwert gehabt.
