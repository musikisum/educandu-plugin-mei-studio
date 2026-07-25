# TODO: Checkliste für die Einbindung von MEI-Studio in oma-web

## 1. Noch nicht auf npm veröffentlicht

`package.json` steht noch auf Version `0.0.0`. Bevor `oma-web` per `yarn add
@musikisum/educandu-plugin-mei-studio` installieren kann, muss das Paket
zuerst veröffentlicht werden (`npm publish`, mit passender Versionsnummer,
z. B. `1.0.0`). Zum Vorab-Testen ohne echte Veröffentlichung geht auch ein
lokaler Pfad- oder Git-Verweis in `oma-web/package.json`
(`"@musikisum/educandu-plugin-mei-studio": "file:../educandu-plugin-mei-studio"`
oder ein Git-Tag).

## 2. Plugin registrieren (Server-Config)

Kein eigener Server-Controller nötig (die README hatte das fälschlich
erwähnt, ist jetzt korrigiert) - nur Plugin-Liste und Übersetzungen:

```js
import educandu from '@educandu/educandu';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const meiStudioPluginTranslationsPath = require.resolve('@musikisum/educandu-plugin-mei-studio/translations.json');

educandu({
  plugins: [/* eure anderen Plugins */, 'musikisum/educandu-plugin-mei-studio'],
  resources: [/* eure anderen Übersetzungen */, meiStudioPluginTranslationsPath],
  /* restliche Server-Config */
});
```

Der `resolveCustomPluginInfos`-Eintrag (siehe README) bleibt unverändert
nötig.

## 3. LESS-Import nicht vergessen

```less
@import url('@musikisum/educandu-plugin-mei-studio/mei-studio.less');
```

(Dateiname hat sich mit der Umbenennung von `mei-import.less` geändert.)

## 4. Verovio/esbuild-Fix sollte automatisch greifen

Verovios WASM-Loader enthält einen Node-Fallback-Zweig
(`await import("node:module")`), den esbuild beim Bündeln nicht auflösen
kann. Der Fix (`scripts/patch-verovio.mjs`, per `postinstall` verdrahtet)
sitzt im Plugin-Paket selbst und sollte bei jedem `yarn install` in
`oma-web` automatisch mitlaufen, auch als normale Dependency. Trotzdem
prüfen:

1. Nutzt `oma-web` `yarn install --ignore-scripts` (z. B. in CI)? Dann läuft
   der Patch nicht automatisch, müsste separat aufgerufen werden.
2. Bündelt `oma-web` verovio selbst neu (eigenes esbuild)? Einmal frisch
   installieren und bauen, dann gegenprüfen
   (`grep 'join(":")' node_modules/verovio/dist/verovio-module.mjs` sollte
   nach dem Install den Patch zeigen).

## 5. Peer-Dependencies gegenchecken

Das Plugin erwartet mindestens: `@educandu/educandu >=4.0.0`,
`antd >=5.21.2`, `@ant-design/icons >=5.5.1`, `react`/`react-dom >=18.2.0`,
`react-i18next >=13.5.0`, `joi >=17.11.0`. Falls `oma-web` ältere Versionen
davon nutzt, vorher abgleichen.

## 6. Bundle-Größe im Blick behalten

Verovio bringt ein ~7 MB WASM-Modul mit. Es wird bei uns nur per
dynamischem `import('verovio/wasm')` nachgeladen, wenn tatsächlich eine
MEI-Sektion angezeigt wird (nicht Teil des initialen Bundles) - trotzdem
einmal die tatsächliche Bundle-Analyse von `oma-web` nach der Integration
anschauen, falls das eigene Chunking anders funktioniert als bei uns.

## 7. Kein Migrationsbedarf für bestehenden Content

Da das Plugin noch nirgends produktiv im Einsatz war, gibt es keine
gespeicherten Dokumente mit dem alten `typeName`
(`musikisum/educandu-plugin-mei-import`) zu migrieren. Falls doch irgendwo
Testinhalte mit dem alten Typnamen existieren sollten: die würden nach der
Umbenennung nicht mehr auflösen (kein Absturz, die Sektion zeigt einfach
nichts an - das haben wir gegengetestet), müssten aber neu angelegt werden.

## 8. Einmal grundlegend smoke-testen

Die heutigen Fixes (Absturzsicherheit bei fehlendem `voiceVolumes`,
CSS-Overflow-Fix bei schmalen Viewports, Resize-Hinweis-Banner) wurden nur
in der eigenen Test-App verifiziert, noch nicht innerhalb von `oma-web`
selbst. Nach der Integration einmal durchklicken: Dokument mit
MEI-Studio-Sektion anlegen, Gehörbildungsmodus aktivieren, Fenstergröße
ändern.
