// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { buildVoiceKeyByNoteId, collapseLongSilences, countNotes, extractVoices } from './mei-voice-utils.js';

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
