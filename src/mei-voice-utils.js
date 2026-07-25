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
