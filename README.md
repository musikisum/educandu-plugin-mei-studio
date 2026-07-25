# educandu-plugin-mei-studio

An [educandu](https://github.com/educandu/educandu) plugin to import MEI (Music Encoding Initiative) files and display musical notation.

## Prerequisites

* node.js ^20.0.0
* optional: globally installed gulp: `npm i -g gulp-cli`

The output of this repository is an npm package (`@musikisum/educandu-plugin-mei-studio`).

## Installation

```sh
npm install @musikisum/educandu-plugin-mei-studio
```

## Usage

Add the plugin info to the application's custom resolvers module:

```js
import MeiStudioPlugin from '@musikisum/educandu-plugin-mei-studio';

export default {
  resolveCustomPageTemplate: null,
  resolveCustomHomePageTemplate: null,
  resolveCustomSiteLogo: null,
  resolveCustomPluginInfos: () => [MeiStudioPlugin]
};
```

Add the plugin name and its translations to your server config (no additional controller is needed - the plugin has no server-side code):

```js
import educandu from '@educandu/educandu';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const meiStudioPluginTranslationsPath = require.resolve('@musikisum/educandu-plugin-mei-studio/translations.json');

educandu({
  plugins: [/* your other plugins here */, 'musikisum/educandu-plugin-mei-studio'],
  resources: [/* your other translations here */, meiStudioPluginTranslationsPath],
  /* your other server config here */
});
```

Import the plugin styles to your main LESS entry point:

```less
// Base styles from Educandu:
@import url('@educandu/educandu/styles/main.less');

// Styles for the plugin:
@import url('@musikisum/educandu-plugin-mei-studio/mei-studio.less');

// Other styles here
```

## Development

```sh
git clone git@github.com:musikisum/educandu-plugin-mei-studio.git
cd educandu-plugin-mei-studio
yarn install
npx gulp
```

---

## OER learning platform for music

Funded by 'Stiftung Innovation in der Hochschullehre'

<img src="https://stiftung-hochschullehre.de/wp-content/uploads/2020/07/logo_stiftung_hochschullehre_screenshot.jpg)" alt="Logo der Stiftung Innovation in der Hochschullehre" width="200"/>

A Project of the 'Hochschule für Musik und Theater München' (University for Music and Performing Arts)

<img src="https://upload.wikimedia.org/wikipedia/commons/d/d8/Logo_Hochschule_f%C3%BCr_Musik_und_Theater_M%C3%BCnchen_.png" alt="Logo der Hochschule für Musik und Theater München" width="200"/>

Project owner: Hochschule für Musik und Theater München\
Project management: Ulrich Kaiser
