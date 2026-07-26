import DOMPurify from 'dompurify';

const SANITIZE_SVG_CONFIG = { USE_PROFILES: { svg: true, svgFilters: true }, ADD_TAGS: ['use'] };

let isUseHookRegistered = false;

// Sanitizes SVG markup rendered by Verovio from MEI data before it gets inserted via innerHTML
// (see mei-document.js) - the MEI file can come from anyone who can upload/link a file, so it has
// to be treated as untrusted input. Verovio's own XML serialization already escapes text/attribute
// content correctly (verified empirically against injected <script>/event-handler payloads before
// this was added), but this stays in as a defense-in-depth layer independent of that: it doesn't
// require trusting every past and future Verovio version to always get escaping right.
export function sanitizeNotationSvg(svg) {
  // Registered lazily on first actual (client-only, called from mei-document.js's effect) call
  // rather than as a module-load side effect: DOMPurify's default export auto-invokes itself
  // against whatever "window" it detects at import time, and educandu also imports/renders
  // display components during server-side rendering (no real DOM there) - calling DOMPurify
  // methods at module scope broke with "addHook is not a function" under SSR, since the
  // auto-detected non-browser instance doesn't have the full hook machinery set up.
  if (!isUseHookRegistered) {
    // <use> is excluded from DOMPurify's default SVG profile (it can reference external
    // documents), but Verovio uses it for essentially every visible glyph (noteheads, clefs,
    // accidentals - all drawn as <use href="#glyph-id"> pointing into the document's own <defs>).
    // Re-allow the tag, but only let its href stay a same-document fragment reference ("#..."),
    // which is the only form Verovio ever emits - anything else (e.g. a reference to an external
    // document) is stripped.
    DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
      if (node.tagName?.toLowerCase() === 'use' && (data.attrName === 'href' || data.attrName === 'xlink:href') && !data.attrValue.startsWith('#')) {
        data.keepAttr = false;
      }
    });
    isUseHookRegistered = true;
  }

  return DOMPurify.sanitize(svg, SANITIZE_SVG_CONFIG);
}

function findLabel(defElement) {
  if (!defElement) {
    return null;
  }

  const attributeLabel = defElement.getAttribute('label');
  if (attributeLabel) {
    return attributeLabel;
  }

  const labelChild = [...defElement.children].find(child => child.localName === 'label');
  return labelChild?.textContent.trim() || null;
}

export function countNotes(meiXmlString) {
  const doc = new DOMParser().parseFromString(meiXmlString, 'application/xml');
  return doc.querySelectorAll('note').length;
}

export function extractVoices(meiXmlString) {
  const doc = new DOMParser().parseFromString(meiXmlString, 'application/xml');

  const staffDefsByN = new Map();
  for (const staffDef of doc.querySelectorAll('staffDef')) {
    staffDefsByN.set(staffDef.getAttribute('n'), staffDef);
  }

  const voices = [];
  const seenKeys = new Set();

  for (const staff of doc.querySelectorAll('staff')) {
    const staffN = staff.getAttribute('n');
    for (const layer of staff.querySelectorAll('layer')) {
      const layerN = layer.getAttribute('n');
      const key = `${staffN}-${layerN}`;
      if (!seenKeys.has(key) && layer.querySelector('note')) {
        seenKeys.add(key);

        const staffDef = staffDefsByN.get(staffN) || null;
        const layerDef = staffDef
          ? [...staffDef.querySelectorAll('layerDef')].find(def => def.getAttribute('n') === layerN)
          : null;

        voices.push({ key, staffN, layerN, label: findLabel(layerDef) || findLabel(staffDef) });
      }
    }
  }

  return voices;
}

export function buildVoiceKeyByNoteId(processedMeiXmlString) {
  const doc = new DOMParser().parseFromString(processedMeiXmlString, 'application/xml');

  const voiceKeyById = new Map();
  for (const staff of doc.querySelectorAll('staff')) {
    const staffN = staff.getAttribute('n');
    for (const layer of staff.querySelectorAll('layer')) {
      const layerN = layer.getAttribute('n');
      const voiceKey = `${staffN}-${layerN}`;
      for (const note of layer.querySelectorAll('note')) {
        const id = note.getAttribute('xml:id');
        if (id) {
          voiceKeyById.set(id, voiceKey);
        }
      }
    }
  }

  return voiceKeyById;
}

// Returns the xml:ids of every SVG element that has to be hidden to visually hide the given
// voices. Two kinds of ids come out of this:
// - note ids: the caller resolves these to their rendered <g class="note"> element and hides its
//   closest <g class="layer"> ancestor instead of the note itself, because Verovio nests beams,
//   tuplets etc. as siblings of the notes they group *inside* that layer group - hiding only the
//   note leaves a floating beam/tuplet bracket behind. The layer group is the smallest container
//   guaranteed to hold everything belonging to one staff/layer within one measure.
// - tie/slur ids: rendered as their own top-level SVG group directly under <g class="measure">,
//   not nested inside any <g class="layer"> - hiding the layer does nothing for them, so they're
//   resolved (via their startid, which Verovio normalizes onto every tie/slur regardless of
//   whether the source MEI used an explicit <tie>/<slur> element or the shorthand @tie attribute)
//   and returned to be hidden directly by id instead.
export function findVoiceHiddenElementIds(processedMeiXmlString, voiceKeyByNoteId, hiddenVoiceKeys) {
  if (!hiddenVoiceKeys.length) {
    return new Set();
  }

  const hiddenVoiceKeySet = new Set(hiddenVoiceKeys);
  const idsToHide = new Set();

  for (const [noteId, voiceKey] of voiceKeyByNoteId) {
    if (hiddenVoiceKeySet.has(voiceKey)) {
      idsToHide.add(noteId);
    }
  }

  const doc = new DOMParser().parseFromString(processedMeiXmlString, 'application/xml');
  for (const connector of doc.querySelectorAll('tie, slur')) {
    const startId = (connector.getAttribute('startid') || '').replace(/^#/, '');
    if (hiddenVoiceKeySet.has(voiceKeyByNoteId.get(startId))) {
      const connectorId = connector.getAttribute('xml:id');
      if (connectorId) {
        idsToHide.add(connectorId);
      }
    }
  }

  return idsToHide;
}

// Maps each note id to an opacity (0..1, clamped) reflecting its voice's volume, for the
// ear-training note-highlighting feature. Falls back to defaultVolume for any voice missing from
// voiceVolumes (e.g. content saved before that voice was added to the mixer).
export function buildNoteOpacitiesById(voiceKeyByNoteId, voiceVolumes, defaultVolume) {
  return new Map(
    [...voiceKeyByNoteId].map(([id, voiceKey]) => {
      const volume = voiceVolumes[voiceKey] ?? defaultVolume;
      return [id, Math.min(1, Math.max(0, volume))];
    })
  );
}

// Applies the ear-training note-opacity/highlight-color styling and voice-hiding to an already
// rendered SVG (a container element holding Verovio's renderToSVG() output). Pure DOM
// manipulation given its inputs, kept separate from mei-document.js so it can be unit-tested
// without a real Verovio toolkit.
export function applyVoiceStyling(container, { noteOpacitiesById, highlightColor, hiddenElementIds }) {
  if (noteOpacitiesById) {
    for (const noteGroup of container.querySelectorAll('.note')) {
      if (noteOpacitiesById.has(noteGroup.id)) {
        noteGroup.style.fill = highlightColor;
        noteGroup.style.stroke = highlightColor;
        noteGroup.style.opacity = noteOpacitiesById.get(noteGroup.id);
      }
    }
  }

  if (hiddenElementIds?.size) {
    // Beams, tuplets etc. are nested as siblings of the notes they group *inside* the
    // <g class="layer"> for that voice/measure, not inside any single note's own group - hiding
    // just the note would leave a floating beam/tuplet bracket behind, so the whole layer group
    // is hidden instead. Ties/slurs live outside any layer group (see findVoiceHiddenElementIds),
    // so closest('.layer') is null for those ids and the element itself is hidden directly.
    // A single querySelectorAll('[id]') pass (rather than one query per id) sidesteps CSS.escape
    // entirely - not just cheaper, but ids are compared by plain string equality instead of being
    // built into a CSS selector, so an id containing a CSS-meta character couldn't break the query.
    const elementsToHide = new Set();
    for (const element of container.querySelectorAll('[id]')) {
      if (hiddenElementIds.has(element.id)) {
        elementsToHide.add(element.closest('.layer') || element);
      }
    }
    for (const element of elementsToHide) {
      element.style.display = 'none';
    }
  }
}

// Shortens any silent gap longer than maxSilenceMs (during which no voice sounds at all) down to
// exactly maxSilenceMs, shifting every later event earlier by the difference. Shorter gaps (normal
// musical rests) are left untouched.
export function collapseLongSilences(noteEvents, maxSilenceMs) {
  const sortedEvents = [...noteEvents].sort((a, b) => a.startMs - b.startMs);

  let soundingUntilMs = 0;
  let shiftMs = 0;

  return sortedEvents.map(event => {
    const silenceMs = event.startMs - soundingUntilMs;
    if (silenceMs > maxSilenceMs) {
      shiftMs += silenceMs - maxSilenceMs;
    }
    soundingUntilMs = Math.max(soundingUntilMs, event.startMs + event.durationMs);
    return { ...event, startMs: event.startMs - shiftMs };
  });
}
