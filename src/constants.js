export const MIN_ZOOM_VALUE = 0.1;
export const MAX_ZOOM_VALUE = 1.5;
export const DEFAULT_ZOOM_VALUE = 1;

export const MIN_SPACING_SYSTEM_VALUE = 0;
export const MAX_SPACING_SYSTEM_VALUE = 48;
export const DEFAULT_SPACING_SYSTEM_VALUE = 4;

export const MIN_MEASURES_PER_LINE_VALUE = 0;
export const MAX_MEASURES_PER_LINE_VALUE = 16;
export const DEFAULT_MEASURES_PER_LINE_VALUE = 0;

export const LARGE_FILE_SIZE_WARNING_THRESHOLD_IN_BYTES = 3 * 1000 * 1000;

// Rough, adjustable safety ceiling: audio playback renders every note as an individually
// scheduled piano sample offline, which gets impractically slow for very large/dense pieces
// (e.g. full orchestral movements). Not derived from a precise measurement - tune based on
// real-world experience.
export const MAX_NOTE_COUNT_FOR_PLAYBACK = 800;

// Separate, much higher ceiling for the notation display itself (layout/SVG rendering), which
// Verovio runs on the main thread - an extremely large or adversarially crafted file could hang
// the browser tab while it lays out. Deliberately far above MAX_NOTE_COUNT_FOR_PLAYBACK: per-note
// audio synthesis is far more expensive than per-note notation layout, so a piece well beyond
// what's practical for playback (e.g. a large multi-voice mass, ~300-500 notes) should still
// display normally. A rough safety ceiling, not derived from a precise measurement - tune based
// on real-world experience.
export const MAX_NOTE_COUNT_FOR_DISPLAY = 20000;

export const DEFAULT_HIGHLIGHT_COLOR_VALUE = '#000000';

// Verovio reserves playback time for structures it can't resolve without an explicit MEI
// <expansion> element (e.g. a written-out repeat barline with no duplicated/expanded content,
// first/second endings, D.C./D.S.), leaving a silent gap of exactly that length instead of actual
// notes. Gaps up to this length are left alone (normal musical rests/breaths); anything longer is
// shortened down to this length so playback doesn't sit through dead air.
export const MAX_SILENCE_MS = 1500;

export const MIN_VOICE_VOLUME_VALUE = 0;
export const MAX_VOICE_VOLUME_VALUE = 1;
export const DEFAULT_VOICE_VOLUME_VALUE = 1;

// Applied at MIDI rendering time (see mei-document.js's use of verovio's midiTempoAdjustment
// option), not as post-hoc playback-rate resampling, so there are no pitch/time-stretching
// artifacts. Verovio's own option range goes up to 4x, but a musically sensible UI range is much
// narrower - capped at 25%-200% here so the same slider width gives finer control over it.
export const MIN_TEMPO_VALUE = 0.25;
export const MAX_TEMPO_VALUE = 2;
export const DEFAULT_TEMPO_VALUE = 1;

export const DEFAULT_REMOVE_SILENCE_VALUE = true;
