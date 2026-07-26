// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { applyVoiceStyling, buildNoteOpacitiesById, buildVoiceKeyByNoteId, collapseLongSilences, countNotes, extractVoices, findVoiceHiddenElementIds, sanitizeNotationSvg } from './mei-voice-utils.js';

const MEI_NAMESPACE = 'http://www.music-encoding.org/ns/mei';

const TWO_STAFF_TWO_LAYER_MEI = `<?xml version="1.0" encoding="UTF-8"?>
<mei xmlns="${MEI_NAMESPACE}">
  <music><body><mdiv><score>
    <scoreDef>
      <staffGrp>
        <staffDef n="1" lines="5" label="Sopran/Alt">
          <layerDef n="1" label="Sopran"/>
          <layerDef n="2" label="Alt"/>
        </staffDef>
        <staffDef n="2" lines="5"/>
      </staffGrp>
    </scoreDef>
    <section>
      <measure n="1">
        <staff n="1">
          <layer n="1"><note xml:id="s1" pname="c" oct="5" dur="4"/></layer>
          <layer n="2"><note xml:id="a1" pname="e" oct="4" dur="4"/></layer>
        </staff>
        <staff n="2">
          <layer n="1"><note xml:id="t1" pname="c" oct="4" dur="4"/></layer>
        </staff>
      </measure>
    </section>
  </score></mdiv></body></music>
</mei>`;

describe('countNotes', () => {
  it('counts every note element in the document', () => {
    expect(countNotes(TWO_STAFF_TWO_LAYER_MEI)).toBe(3);
  });
});

describe('extractVoices', () => {
  it('finds every staff/layer combination that contains notes, in document order', () => {
    const voices = extractVoices(TWO_STAFF_TWO_LAYER_MEI);
    expect(voices.map(v => v.key)).toStrictEqual(['1-1', '1-2', '2-1']);
  });

  it('reads the label from layerDef, falling back to staffDef', () => {
    const voices = extractVoices(TWO_STAFF_TWO_LAYER_MEI);
    expect(voices.find(v => v.key === '1-1').label).toBe('Sopran');
    expect(voices.find(v => v.key === '1-2').label).toBe('Alt');
  });

  it('returns null as label when neither layerDef nor staffDef has one', () => {
    const voices = extractVoices(TWO_STAFF_TWO_LAYER_MEI);
    expect(voices.find(v => v.key === '2-1').label).toBeNull();
  });

  it('ignores layers without any note', () => {
    const mei = `<mei xmlns="${MEI_NAMESPACE}"><music><body><mdiv><score><section>
      <measure n="1"><staff n="1"><layer n="1"><rest dur="4"/></layer></staff></measure>
    </section></score></mdiv></body></music></mei>`;
    expect(extractVoices(mei)).toStrictEqual([]);
  });

  it('does not list the same voice twice across multiple measures', () => {
    const mei = `<mei xmlns="${MEI_NAMESPACE}"><music><body><mdiv><score><section>
      <measure n="1"><staff n="1"><layer n="1"><note pname="c" oct="4" dur="4"/></layer></staff></measure>
      <measure n="2"><staff n="1"><layer n="1"><note pname="d" oct="4" dur="4"/></layer></staff></measure>
    </section></score></mdiv></body></music></mei>`;
    expect(extractVoices(mei).map(v => v.key)).toStrictEqual(['1-1']);
  });
});

describe('buildVoiceKeyByNoteId', () => {
  it('maps each note id to its voice key', () => {
    const voiceKeyByNoteId = buildVoiceKeyByNoteId(TWO_STAFF_TWO_LAYER_MEI);
    expect(voiceKeyByNoteId.get('s1')).toBe('1-1');
    expect(voiceKeyByNoteId.get('a1')).toBe('1-2');
    expect(voiceKeyByNoteId.get('t1')).toBe('2-1');
  });
});

describe('findVoiceHiddenElementIds', () => {
  const MEI_WITH_TIE_AND_SLUR = `<?xml version="1.0" encoding="UTF-8"?>
<mei xmlns="${MEI_NAMESPACE}">
  <music><body><mdiv><score>
    <section>
      <measure n="1">
        <staff n="1">
          <layer n="1"><note xml:id="s1" pname="c" oct="5" dur="4"/></layer>
          <layer n="2"><note xml:id="a1" pname="e" oct="4" dur="4"/></layer>
        </staff>
        <tie xml:id="tie1" startid="#s1" endid="#s2"/>
        <slur xml:id="slur1" startid="#a1" endid="#a2"/>
      </measure>
      <measure n="2">
        <staff n="1">
          <layer n="1"><note xml:id="s2" pname="c" oct="5" dur="4"/></layer>
          <layer n="2"><note xml:id="a2" pname="e" oct="4" dur="4"/></layer>
        </staff>
      </measure>
    </section>
  </score></mdiv></body></music>
</mei>`;

  it('returns an empty set when no voice is hidden', () => {
    const voiceKeyByNoteId = buildVoiceKeyByNoteId(MEI_WITH_TIE_AND_SLUR);
    expect(findVoiceHiddenElementIds(MEI_WITH_TIE_AND_SLUR, voiceKeyByNoteId, [])).toStrictEqual(new Set());
  });

  it('returns the note ids of the hidden voice', () => {
    const voiceKeyByNoteId = buildVoiceKeyByNoteId(MEI_WITH_TIE_AND_SLUR);
    const ids = findVoiceHiddenElementIds(MEI_WITH_TIE_AND_SLUR, voiceKeyByNoteId, ['1-1']);
    expect(ids.has('s1')).toBe(true);
    expect(ids.has('s2')).toBe(true);
    expect(ids.has('a1')).toBe(false);
    expect(ids.has('a2')).toBe(false);
  });

  it('resolves a tie/slur to its starting note\'s voice and includes its own id when hidden', () => {
    const voiceKeyByNoteId = buildVoiceKeyByNoteId(MEI_WITH_TIE_AND_SLUR);
    const idsForVoice1 = findVoiceHiddenElementIds(MEI_WITH_TIE_AND_SLUR, voiceKeyByNoteId, ['1-1']);
    expect(idsForVoice1.has('tie1')).toBe(true);
    expect(idsForVoice1.has('slur1')).toBe(false);

    const idsForVoice2 = findVoiceHiddenElementIds(MEI_WITH_TIE_AND_SLUR, voiceKeyByNoteId, ['1-2']);
    expect(idsForVoice2.has('slur1')).toBe(true);
    expect(idsForVoice2.has('tie1')).toBe(false);
  });

  it('hides both voices when both are given', () => {
    const voiceKeyByNoteId = buildVoiceKeyByNoteId(MEI_WITH_TIE_AND_SLUR);
    const ids = findVoiceHiddenElementIds(MEI_WITH_TIE_AND_SLUR, voiceKeyByNoteId, ['1-1', '1-2']);
    expect(ids).toStrictEqual(new Set(['s1', 's2', 'a1', 'a2', 'tie1', 'slur1']));
  });
});

describe('buildNoteOpacitiesById', () => {
  it('maps each note id to its voice volume, clamped to [0, 1]', () => {
    const voiceKeyByNoteId = new Map([['n1', '1-1'], ['n2', '1-2'], ['n3', '2-1']]);
    const voiceVolumes = { '1-1': 0.5, '1-2': -3, '2-1': 7 };
    const result = buildNoteOpacitiesById(voiceKeyByNoteId, voiceVolumes, 1);
    expect(result.get('n1')).toBe(0.5);
    expect(result.get('n2')).toBe(0);
    expect(result.get('n3')).toBe(1);
  });

  it('falls back to the default volume for a voice missing from voiceVolumes', () => {
    const voiceKeyByNoteId = new Map([['n1', '1-1']]);
    const result = buildNoteOpacitiesById(voiceKeyByNoteId, {}, 0.75);
    expect(result.get('n1')).toBe(0.75);
  });
});

describe('applyVoiceStyling', () => {
  // @vitest-environment jsdom is set for the whole file, so plain DOM APIs (not real SVG
  // namespacing) are enough here - class/id selectors don't care about the SVG namespace.
  function createContainer(html) {
    const container = document.createElement('div');
    container.innerHTML = html;
    return container;
  }

  it('does nothing when neither noteOpacitiesById nor hiddenElementIds are given', () => {
    const container = createContainer('<g id="n1" class="note"></g>');
    expect(() => applyVoiceStyling(container, {})).not.toThrow();
    expect(container.querySelector('#n1').style.opacity).toBe('');
  });

  it('sets fill/stroke/opacity on notes present in noteOpacitiesById, leaves others untouched', () => {
    const container = createContainer(`
      <g id="n1" class="note"></g>
      <g id="n2" class="note"></g>
    `);
    const noteOpacitiesById = new Map([['n1', 0.3]]);
    applyVoiceStyling(container, { noteOpacitiesById, highlightColor: '#ff0000' });
    expect(container.querySelector('#n1').style.opacity).toBe('0.3');
    expect(container.querySelector('#n1').style.fill).toBe('#ff0000');
    expect(container.querySelector('#n2').style.opacity).toBe('');
  });

  it('hides the closest .layer ancestor of a hidden note instead of just the note', () => {
    const container = createContainer(`
      <g class="layer">
        <g id="n1" class="note"></g>
        <g class="beam"><g id="n2" class="note"></g></g>
      </g>
    `);
    applyVoiceStyling(container, { hiddenElementIds: new Set(['n1']) });
    expect(container.querySelector('.layer').style.display).toBe('none');
  });

  it('hides a connector id (tie/slur) directly when it has no .layer ancestor', () => {
    const container = createContainer('<g id="tie1" class="tie"></g>');
    applyVoiceStyling(container, { hiddenElementIds: new Set(['tie1']) });
    expect(container.querySelector('#tie1').style.display).toBe('none');
  });

  it('ignores hidden ids that have no matching element', () => {
    const container = createContainer('<g id="n1" class="note"></g>');
    expect(() => applyVoiceStyling(container, { hiddenElementIds: new Set(['does-not-exist']) })).not.toThrow();
  });
});

describe('sanitizeNotationSvg', () => {
  it('leaves ordinary Verovio-shaped SVG content untouched', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><defs><path id="g1"/></defs>'
      + '<g id="n1" class="note"><use xlink:href="#g1" transform="translate(1,2)"/></g></svg>';
    const sanitized = sanitizeNotationSvg(svg);
    expect(sanitized).toContain('<use');
    expect(sanitized).toContain('xlink:href="#g1"');
    expect(sanitized).toContain('id="n1"');
    expect(sanitized).toContain('class="note"');
  });

  it('strips a <use> that references something other than a same-document fragment', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://evil.example/x.svg#y"/></svg>';
    const sanitized = sanitizeNotationSvg(svg);
    expect(sanitized).not.toContain('evil.example');
  });

  it('strips a script tag', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script></svg>';
    const sanitized = sanitizeNotationSvg(svg);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert(document.cookie)');
  });

  it('strips an inline event handler attribute', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><g id="n1" class="note"/></svg>';
    const sanitized = sanitizeNotationSvg(svg);
    expect(sanitized).not.toContain('onload');
    expect(sanitized).toContain('id="n1"');
  });

  it('strips a javascript: URI', () => {
    // eslint-disable-next-line no-script-url
    const dangerousUri = 'javascript:alert(1)';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><a href="${dangerousUri}"><text>click</text></a></svg>`;
    const sanitized = sanitizeNotationSvg(svg);
    // eslint-disable-next-line no-script-url
    expect(sanitized).not.toContain('javascript:');
  });
});

describe('collapseLongSilences', () => {
  it('leaves gaps at or below the threshold untouched', () => {
    const noteEvents = [
      { startMs: 0, durationMs: 500 },
      { startMs: 2000, durationMs: 500 }
    ];
    expect(collapseLongSilences(noteEvents, 1500)).toStrictEqual(noteEvents);
  });

  it('shortens a gap above the threshold to exactly the threshold, shifting later events', () => {
    const noteEvents = [
      { startMs: 0, durationMs: 500 },
      { startMs: 12000, durationMs: 500 },
      { startMs: 12500, durationMs: 500 }
    ];
    expect(collapseLongSilences(noteEvents, 1500)).toStrictEqual([
      { startMs: 0, durationMs: 500 },
      { startMs: 2000, durationMs: 500 },
      { startMs: 2500, durationMs: 500 }
    ]);
  });

  it('does not shift simultaneous or overlapping notes relative to each other', () => {
    const noteEvents = [
      { startMs: 0, durationMs: 1000 },
      { startMs: 0, durationMs: 500 },
      { startMs: 500, durationMs: 500 }
    ];
    expect(collapseLongSilences(noteEvents, 1500)).toStrictEqual(noteEvents);
  });

  it('accumulates shifts across multiple long gaps', () => {
    const noteEvents = [
      { startMs: 0, durationMs: 500 },
      { startMs: 12000, durationMs: 500 },
      { startMs: 24000, durationMs: 500 }
    ];
    expect(collapseLongSilences(noteEvents, 1500)).toStrictEqual([
      { startMs: 0, durationMs: 500 },
      { startMs: 2000, durationMs: 500 },
      { startMs: 4000, durationMs: 500 }
    ]);
  });

  it('returns an empty array unchanged', () => {
    expect(collapseLongSilences([], 1500)).toStrictEqual([]);
  });
});
