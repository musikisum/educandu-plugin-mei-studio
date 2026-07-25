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

// Matches verovio's own midiTempoAdjustment option range (see mei-document.js) - applied at MIDI
// rendering time, not as post-hoc playback-rate resampling, so there are no pitch/time-stretching
// artifacts.
export const MIN_TEMPO_VALUE = 0.2;
export const MAX_TEMPO_VALUE = 4;
export const DEFAULT_TEMPO_VALUE = 1;

export const DEFAULT_REMOVE_SILENCE_VALUE = true;
