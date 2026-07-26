# Changelog

Entwicklungsnotizen für `musikisum/educandu-plugin-mei-studio`. Nicht auf
Nutzer:innen ausgerichtet, sondern als Gedächtnisstütze für künftige
Weiterentwicklung — was wurde gebaut, warum, und welche Fallstricke gab es.

## 2026-07-26 (8) — Vor-Release-Aufräumen: Crash-Sicherheit, Dateigröße, Testabdeckung

Vor dem ersten Versions-Tag noch einmal gezielt durchgesehen (nicht als
allgemeine Suche, sondern mit der konkreten Frage "kann dieses Plugin die
ganze Seite lahmlegen").

**Crash-Sicherheit:** Bestätigt, dass die eine Stelle, an der so gut wie
alles passiert (`mei-document.js`s Lade-Effekt: Verovio, DOM-Manipulation,
Netzwerk) komplett in try/catch/finally sitzt - jeder synchrone Fehler dort
landet als `hasError`-Anzeige, nicht als Seitenabsturz (educandu hat wie
schon früher festgestellt keine Error Boundary). Ein echtes Loch gefunden
und geschlossen: `mei-studio-editor.js` destrukturierte `voiceVolumes = {}`
und `hiddenVoices = []` direkt aus `content` - ein Destructuring-Default
greift aber nur bei `undefined`, nicht bei einem tatsächlich gespeicherten
`null`. Bei so einem (unwahrscheinlichen, aber durch das Joi-Schema nicht
ausgeschlossenen) Content-Zustand hätte `voiceVolumes[voice.key]` synchron
im Render geworfen - kein Try/Catch fängt das im Editor ab. Auf
`voiceVolumesValue = voiceVolumes || {}` (wie in `mei-studio-display.js`
schon vorhanden) umgestellt.

**Dateigröße/Duplizierung:** `mei-studio-editor.js` und
`mei-studio-practice-controls.js` hatten fast wortgleiche Handler
(`handleVoiceVolumesChange`, `handleHiddenVoiceChange`,
`handleHighlightColorChange`) und JSX für die Gehörbildungswerkzeuge
(Ausblenden-Checkboxen, Lautstärke-Mixer, Farbe) - zwei Stellen, die bei
einer künftigen Änderung leicht hätten auseinanderlaufen können. Extrahiert
nach `mei-studio-voice-tools.js` (`MeiStudioVoiceTools`): eine
Komponente, die nur den Inhalt rendert (mit einem `classNamePrefix`-Prop
für die unterschiedlichen CSS-Klassen), während Editor/Display-Panel
weiterhin ihre eigene, unterschiedliche Verpackung drumherum bauen
(FormItem-Grid vs. eigenes Flex-Panel).

**Testabdeckung:** `mei-document.js` (0 % Testabdeckung, weil ein einziger
großer Effekt) hatte zwei reine Teilstücke, die keinen echten
Verovio-Toolkit brauchen: die Opazitäts-Berechnung pro Note
(`buildNoteOpacitiesById`) und das Anwenden von Opazität/Farbe/Ausblenden
auf das gerenderte SVG (`applyVoiceStyling`) - beide nach
`mei-voice-utils.js` verschoben, mit Unit-Tests (jsdom). Dabei einen
kleinen, aber echten Verbesserungspunkt gefunden: `applyVoiceStyling` nutzte
`container.querySelector('#' + CSS.escape(id))` pro ID - `CSS.escape` ist in
jsdom nicht vorhanden, der erste Testlauf schlug deshalb fehl. Statt die
Tests künstlich um das Browser-API herumzubauen, die Implementierung
robuster gemacht: ein einziger `querySelectorAll('[id]')`-Durchlauf mit
String-Vergleich statt einer CSS-Selektor-Konstruktion pro ID - schneller
(ein Durchlauf statt N Abfragen) und unabhängig von `CSS.escape`, das
ohnehin nur für IDs mit CSS-Sonderzeichen nötig gewesen wäre (bei
Verovio-generierten IDs nie der Fall).

## 2026-07-26 (7) — Neuer `soundEnabled`-Schalter: Wiedergabe an/aus

Neues Content-Feld `soundEnabled` (Default `true`), ersetzt die reine
Text-Überschrift "Wiedergabe" durch einen echten Schalter - exakt das
gleiche Muster wie "Gehörbildung" schon für seinen Abschnitt nutzt (der
Schalter *ist* die Überschrift, keine zusätzliche Textzeile nötig). Bei
`soundEnabled = false` verschwinden Tempo, Stille entfernen und die
Auslastungswarnung aus dem Editor, und die Audio-Erzeugung selbst
(`noteEvents` in `mei-document.js`) läuft gar nicht erst.

Da Gehörbildungswerkzeuge (Lautstärke-Mixer, Hervorhebung, Stimmen
ausblenden) ohne Audio ohnehin bedeutungslos wären, sitzt der
Gehörbildungs-Schalter jetzt selbst *innerhalb* des `soundEnabled`-Blocks -
Gehörbildung lässt sich also gar nicht erst anschalten, wenn Wiedergabe aus
ist. Muting einzelner Stimmen bleibt bewusst nur über den bestehenden
Lautstärke-Regler pro Stimme lösbar (auf 0 stellen) - kein zusätzlicher
Mechanismus dafür, da das schon vollständig abgedeckt ist.

## 2026-07-26 (6) — Legende durch Copyright-Feld ersetzt; kleine Editor-Aufräumarbeiten

`caption` (freies Markdown-Textfeld, 1:1 aus dem eng verwandten
`music-xml-viewer`-Plugin übernommen) ersetzt durch `copyrightNotice` -
Standardmuster aus `image`/`audio`/`video`/`abc-notation`
(`CopyrightNoticeEditor`/`CopyrightNotice`, unverändert aus dem educandu-Kern
übernommen): bei einer Datei aus der Medienbibliothek werden Lizenz und
Kurzbeschreibung automatisch eingetragen, bei YouTube/Wikimedia ein
Standardtext, bei sonstigen Uploads bleibt es leer. Reiner Feld-Tausch ohne
Rückwärtskompatibilitäts-Vorkehrung für Altinhalte (auf Wunsch des
Auftraggebers - das Plugin ist noch nicht produktiv im Einsatz, lokale/Staging-
Inhalte mit altem `caption`-Feld werden bei Bedarf einfach neu angelegt statt
migriert).

Außerdem: Überschrift "Gehörbildungswerkzeuge" im Editor entfernt (im Display-
Übungspanel bleibt sie, dort nicht als überflüssig empfunden) - im Editor
selbsterklärend, da die Gruppe ohnehin nur erscheint, wenn der
Gehörbildungs-Schalter gerade eingeschaltet wurde.

## 2026-07-26 (5) — Wiedergabe von Gehörbildung entkoppelt; Editor-Layout-Lehre

### Wiedergabe ist jetzt immer verfügbar, nicht mehr an "Gehörbildung" gebunden

Konzeptionelle Korrektur: Tempo und "Stille entfernen" betreffen die Audio-Wiedergabe
allgemein (auch sinnvoll, wenn man ein Stück einfach in einem angenehmen Tempo
anhören will), nicht nur Gehörbildungsübungen. `playbackEnabled` ("Gehörbildung")
gated jetzt nur noch die eigentlichen Gehörbildungswerkzeuge (Stimmlautstärke-Mixer,
Hervorhebungsfarbe, Stimmen ausblenden) - die Audio-Erzeugung selbst
(`noteEvents`/MIDI-Export in `mei-document.js`) läuft jetzt immer, sobald eine Datei
geladen ist, unabhängig vom Schalter. Bei ausgeschalteter Gehörbildung bekommt
`MeiPlayback` `voiceVolumes={}` übergeben (alle Stimmen auf volle, gleiche Lautstärke),
statt eventuell noch gespeicherte Mixer-Werte "unsichtbar" weiterwirken zu lassen,
während die zugehörige Bedienoberfläche ausgeblendet ist.

Der Content-Feldname `playbackEnabled` musste dafür nicht geändert werden - seine
Übersetzung war schon immer "Gehörbildung"/"Ear training", was jetzt (enger gefasst)
sogar noch besser passt als vorher. `playbackEnabledInfo`/`hiddenVoicesInfo` trotzdem
angepasst, da sie Wiedergabe fälschlich noch als "optional"/"falls aktiviert"
beschrieben.

Im Editor sitzt "Wiedergabe" (Tempo, Stille entfernen, Auslastungs-Warnung) jetzt vor
dem Gehörbildung-Schalter, unbedingt sichtbar. Im Display läuft dieselbe Trennung:
Tempo/Stille entfernen im Übungspanel sind immer da, die
Gehörbildungswerkzeuge-Gruppe nur bei aktiver Gehörbildung.

Bewusst nicht umgesetzt (nur als Idee genannt, nicht angefragt): ein Schalter, um
statt generierter Audio-Wiedergabe eine externe Datei (z. B. YouTube-Link) zu
hinterlegen, ähnlich einem Muster, an das sich der Auftraggeber aus einem anderen
educandu-Plugin erinnerte (im tatsächlichen `abc-notation`-Plugin allerdings nicht so
vorgefunden - dort gibt es nur einen einfachen Wiedergabe-An/Aus-Schalter, keine
Quellenwahl). Würde eine eigene Content-Feld-Erweiterung brauchen (Quelltyp +
externe URL) und macht den Stimmlautstärke-Mixer bedeutungslos, sobald eine externe
Datei gewählt ist - beides für eine spätere Sitzung.

### Layout-Lehre: FormItem übernimmt Ausrichtung, eigenes CSS nur für den Feininhalt

Ein zwischenzeitlicher eigener Versuch, die "Ausblenden"/"Lautstärke"/"Farbe"-Zeile
komplett außerhalb von antds `Form.Item`/`FORM_ITEM_LAYOUT` zu bauen (eigene
`margin`-Werte für Ausrichtung), lag am linken Rand nicht mehr auf einer Linie mit
den übrigen, regulären `Form.Item`-Zeilen des Formulars. Zurückgebaut auf: jede
Gruppe steckt in einem `FormItem` mit `label={' '} colon={false}` (Muster, das im
Editor für die Warnungs-Alerts schon existierte) - das übernimmt denselben linken
Versatz und denselben Zeilenabstand wie jedes andere Formularfeld automatisch.
Die eigenen `-columns`/`-column`/`-row`-Klassen bleiben bestehen, regeln aber nur
noch das Nebeneinander/den Nicht-Stretch *innerhalb* dieses Wrappers, nicht mehr die
Positionierung der Gruppe selbst. (Ein zwischenzeitlicher, inzwischen wieder
entfernter manueller Zwischenstand hatte das Gruppen-`FormItem` versehentlich in ein
zweites, verschachteltes `<Form>` gepackt statt es direkt ins äußere `Form` zu
hängen - verschachtelte `<form>`-Elemente sind ungültiges HTML.)

## 2026-07-26 (4) — Korrektur: "Stimmen ausblenden" doch an Gehörbildung gebunden

Rückbau einer eigenmächtigen Erweiterung von mir: "Stimmen ausblenden" wurde
zunächst so gebaut, dass es *unabhängig* von `playbackEnabled` sichtbar und
wirksam ist (Begründung damals: auch für reine Lese-/Druckübungen ohne Audio
nützlich). Das war nie angefragt — das Feature ist ursprünglich als reines
Gehörbildungswerkzeug entstanden ("hören ohne Noten, Noten einblenden zur
Kontrolle"), und die "Gehörbildungswerkzeuge"-Überschrift aus der
vorherigen Sitzung wirkte dadurch widersprüchlich (Abschnitt sichtbar, obwohl
Gehörbildung aus).

Zurückgebaut auf: Sichtbarkeit *und* Wirkung ausschließlich bei aktivem
`playbackEnabled` — in allen drei Stellen konsistent:
- `mei-document.js`: `hiddenElementIds`-Berechnung wieder nur innerhalb des
  `if (playbackEnabled)`-Zweigs (vorher zusätzlich `|| hiddenVoices.length`
  als eigener Auslöser).
- `mei-studio-editor.js`: Stimmenerkennungs-Effekt wieder an `playbackEnabled`
  gekoppelt (wie vor der letzten Sitzung), Checkboxen nur noch innerhalb des
  `playbackEnabled`-Blocks gerendert.
- `mei-studio-display.js` / `mei-studio-practice-controls.js`: dieselbe
  Kopplung; das Übungspanel rendert jetzt komplett nichts mehr, wenn
  Gehörbildung aus ist (vorher: Panel blieb für die Stimmen-Ausblenden-Sektion
  allein sichtbar).

`hiddenVoices` bleibt als Content-Feld/Schema unverändert bestehen (Autor:innen
können es weiterhin im Editor bei aktiver Gehörbildung setzen) - nur seine
Sichtbarkeit/Wirkung ist jetzt wieder an die Gehörbildung gebunden.

## 2026-07-26 (3) — Nachbesserungen: Hilfslinien-Grenze, ValidationError, Panel-Layout

**Hilfslinien werden beim Stimmen-Ausblenden nicht mitausgeblendet — bewusste,
dokumentierte Grenze, keine offene Baustelle.** Empirisch geprüft (Wegwerf-Skript
gegen `toolkit.renderToSVG()`): `<g class="ledgerLines above/below">` liegt als
Geschwister-Element von `<g class="layer">` direkt im `<g class="staff">`, nicht
in einem `.layer` verschachtelt — und bei zwei Stimmen auf einer Notenzeile
(Divisi, z. B. Sopran+Alt auf einer Zeile) existiert dafür pro Notenzeile/Takt
**eine gemeinsame** Hilfslinien-Gruppe für beide Stimmen, ohne jede
Stimmen-Zuordnung im SVG (kein Bezug zu einer bestimmten Note/ID). Eine exakte
Zuordnung "diese Hilfslinie gehört zu Stimme X" ist aus der SVG-Ausgabe damit
grundsätzlich nicht ableitbar; ein Versuch über die Position (z. B. "Hilfslinie
direkt vor einer ausgeblendeten `.layer`-Gruppe ausblenden") wäre eine
Heuristik, die bei geteilter Nutzung durch beide Stimmen die weiterhin
sichtbare Stimme mit-ausblenden könnte — genau die Art von instabiler Lösung,
die hier bewusst vermieden wird. Sauber lösbar nur über einen grundsätzlich
anderen Ansatz (zweiter, separater Render-Durchlauf aus einer MEI-Kopie ohne
die ausgeblendete Stimme, getrennt vom für die Wiedergabe genutzten Toolkit-Stand) -
deutlich größerer Eingriff, aktuell nicht umgesetzt.

**`hiddenVoices` in `validateContent()` von `.required()` auf optional
umgestellt.** Grund: `joi.attempt(..., { noDefaults: true })` verhindert, dass
`joi.default([])` greift — ein `.required()`-Feld lässt sich damit nicht
nachträglich rückwirkend für alten, bereits gespeicherten Content ergänzen.
Jede Stelle, die `hiddenVoices` liest, hat ohnehin schon einen
Laufzeit-Fallback auf `[]` (analog zu `voiceVolumes`/`tempo`/`removeSilence`),
die Schema-Änderung macht die Validierung nur konsistent dazu.
(Educandu-Core selbst löst neue Pflichtfelder in Bundle-Plugins stattdessen
über eine umzug-Migration in `node_modules/@educandu/educandu/migrations/`,
die alte Dokumente in der DB nachträglich befüllt, bei `.required()` im
Schema bleibend — für dieses Plugin ohne bisherigen Produktiveinsatz
unverhältnismäßig; die Laufzeit-Fallback-Variante ist hier ausreichend.)

**Übungseinstellungen-Panel:** `Info`-Icons lagen außerhalb des Kastens bzw.
auf den Reglerlinien — Ursache war nicht zu wenig Padding, sondern dass `Info`
sein Icon standardmäßig absolut nach links außerhalb der eigenen Komponente
positioniert (`left: -offset`) und sich auf ein umgebendes
`.ant-form-item-label`-Padding verlässt, das in diesem Panel (kein antd
`Form.Item`) gar nicht existiert. Fix: `iconAfterContent`-Prop (vom
`Info`-Component selbst für genau diesen Fall vorgesehen) statt eigener
Padding-Vergrößerung. Panel-Padding trotzdem angehoben (mehr Luft insgesamt).
"Stimmen ausblenden" und "Stimmlautstärke" stehen jetzt in einer gemeinsamen
Flex-Reihe (`display:flex; flex-wrap:wrap`) nebeneinander und brechen erst bei
zu wenig Platz automatisch untereinander um — keine feste Breakpoint-Grenze,
reagiert stufenlos auf die tatsächliche Panel-Breite.

## 2026-07-26 (2) — Stimmen ausblenden, Live-Übungsregler im Display

### Stimmen aus der Notation ausblenden (`hiddenVoices`)

Neues, von der Wiedergabe unabhängiges Feature: eine oder mehrere Stimmen
lassen sich rein visuell aus der Notenansicht ausblenden, während sie in der
Audiodatei (falls Gehörbildung aktiv ist) weiterhin erklingen — bewusst
*nicht* über `voiceVolumes = 0` gelöst, da Lautstärke 0 in `mei-playback.js`
schon bisher auch `piano.start()` übersprungen hätte (Audio stumm). Stattdessen
ein eigenes, rein darstellungsbezogenes Feld.

**Wie eine Stimme im gerenderten SVG tatsächlich verschwindet, wurde vorher
empirisch an beiden Testdateien in `assets/` geprüft** (Skript gegen
`toolkit.renderToSVG()`, danach verworfen), nicht angenommen:

- Verovio vergibt `<g class="staff">`/`<g class="layer">` **kein** `n`/`data-n`-Attribut
  im SVG — anders als zunächst erwartet. Wenn die Quelldatei bereits eigene
  `xml:id`s auf `<staff>`/`<layer>` hatte (z. B. `CRIM_Mass_0001_1.mei`), landen
  genau diese IDs unverändert im SVG; ohne eigene IDs generiert Verovio ein
  vorhersagbares `m{Takt}s{Staff}l{Layer}`-Schema. Beides ist nicht
  verlässlich genug, um eine Stimme direkt über eine ID-Konvention zu finden.
- Verlässlich ist dagegen `buildVoiceKeyByNoteId()` (liest `toolkit.getMEI()`,
  bereits für den Lautstärke-Mixer im Einsatz) — jede Note trägt im SVG
  dieselbe `xml:id` wie im MEI. Von dort aus: `closest('.layer')` auf das
  SVG-Element der Note liefert zuverlässig genau den Container, der alles zu
  dieser Stimme/diesem Takt gehörende enthält (auch Balken/`beam`, die
  Verovio als Geschwister-Element *um* die zugehörigen Noten herum im
  `.layer` platziert, nicht als Kind einer einzelnen Note — nur die Note
  ausblenden hätte einen frei schwebenden Balken hinterlassen).
- Bindebögen/Legatobögen (`<tie>`/`<slur>`) liegen dagegen **außerhalb** jedes
  `.layer`-Elements, direkt als Kind von `<measure>` — `closest('.layer')`
  greift für sie ins Leere. Gelöst über den eigenen `startid` des
  Tie/Slur-Elements (aufgelöst gegen `voiceKeyByNoteId`), das Verovio in
  `getMEI()` *immer* bereitstellt, auch wenn die Quelldatei das kürzere
  `@tie="i/m/t"`-Attribut auf `<note>` statt eines expliziten `<tie>`-Elements
  verwendet hat (empirisch verifiziert: Verovio normalisiert das beim
  Rundtrip durch `getMEI()` auf ein vollständiges `<tie startid endid>`).
- Neue Funktion `findVoiceHiddenElementIds()` in `mei-voice-utils.js`
  kapselt genau das: liefert Note-IDs (→ Aufrufer blendet den
  `.layer`-Vorfahren aus) und Tie/Slur-IDs (→ Aufrufer blendet das Element
  direkt aus) für die gewählten Stimmen. Auf beiden Testdateien exakt
  gegengeprüft: Anzahl ausgeblendeter Noten entspricht exakt der Anzahl an
  Noten, die laut `voiceKeyByNoteId` zur ausgeblendeten Stimme gehören.
- Editor: Checkboxen pro erkannter Stimme, unabhängig vom
  Gehörbildungsschalter sichtbar (dafür musste die Stimmenerkennung in
  `mei-studio-editor.js` von `playbackEnabled` entkoppelt werden — sie lief
  vorher nur, wenn Wiedergabe aktiv war).

### Live-Übungsregler im Display (`mei-studio-practice-controls.js`)

Tempo, Stille entfernen, Stimmlautstärke, Hervorhebungsfarbe und
Stimmen-Ausblenden sind jetzt auch direkt im Display bedienbar (Zahnrad-Button
unter der Notation), nicht mehr nur im Editor. Bewusst **nicht** in den
Content geschrieben — reiner `useState` in `mei-studio-display.js`, aus den
Content-Werten vorbelegt, nach einem Seiten-Reload wieder auf dem
gespeicherten Autor:innen-Stand. Die Datei-Auswahl (`sourceUrl`) bleibt davon
komplett unberührt und bewusst nur im Editor änderbar.

Technisch überraschend wenig Neuland nötig: `MeiDocument` berechnet
`noteEvents` bereits reaktiv aus `tempo`/`removeSilence`/`voiceVolumes`
(Props im Dependency-Array des Lade-Effekts), und `MeiPlayback` rendert die
Wiedergabe-WAV bereits neu, sobald sich `noteEvents`/`voiceVolumes` ändern
(sobald einmal auf Play gedrückt wurde) — die Live-Reaktivität von Audio auf
Regler-Änderungen im Display war also schon vorhanden, nur nie an
Display-seitige Regler angeschlossen. Die Regler selbst sind nur sichtbar,
wenn `content.playbackEnabled` (Gehörbildung) an ist — die
Stimmen-Ausblenden-Checkboxen dagegen immer, wenn Stimmen erkannt wurden
(unabhängig von der Wiedergabe, analog zum Editor).

**Bewusst nicht gelöst / offen für eine kommende Sitzung:**
- Bei einer Regler-Änderung während des Abspielens wird die neue
  Wiedergabe-URL an `MediaPlayer` durchgereicht, was die Abspielposition
  vermutlich auf 0 zurücksetzt (nicht im Browser verifiziert) — für ein
  nahtloses Weiterhören müsste man die Position vorher merken und nach dem
  Neu-Rendern zurückspulen.
- Kein Debouncing beim Ziehen an Tempo-/Lautstärke-Reglern — jede
  Zwischenposition löst potenziell ein Neu-Rendern der Audiodatei aus
  (Piano-Samples laden, Offline-Rendering). Für die meisten Stücke unter
  `MAX_NOTE_COUNT_FOR_PLAYBACK` vermutlich unproblematisch, bei größeren
  Stücken ggf. spürbar — noch nicht im Browser gemessen.
- Noch nicht im Browser getestet (nur Unit-Tests, Lint, Build/Bundling via
  esbuild und ein eigenständiges Verifikationsskript gegen Verovios
  SVG-Ausgabe liefen grün) — vor dem nächsten Staging-Deploy einmal
  durchklicken: Stimme im Editor dauerhaft ausblenden, im Display zusätzlich
  live ein-/ausblenden, Tempo/Lautstärke während der Wiedergabe ändern.

## 2026-07-26 — v1.0.1: Postinstall-Patch fehlte im npm-Paket

**Bug (in v1.0.0):** In oma-web schlug `yarn add` mit
`Cannot find module '.../scripts/patch-verovio.mjs'` fehl. Ursache: `files`
in `package.json` listete nur `"dist"`, das `postinstall`-Script braucht
aber `scripts/patch-verovio.mjs` — npm hat das Verzeichnis beim Publish
also gar nicht mit ins Paket gepackt. Lokal/per `yarn link` fiel das nie
auf, weil dort das komplette Repo sichtbar ist, nicht nur die publizierte
Teilmenge.

Fix: `"scripts"` zu `files` hinzugefügt.

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
