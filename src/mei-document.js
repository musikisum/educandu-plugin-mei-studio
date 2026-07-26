import { Alert, Spin } from 'antd';
import MeiPlayback from './mei-playback.js';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef, useState } from 'react';
import { useIsMounted } from '@educandu/educandu/ui/hooks.js';
import { applyMeasuresPerLine } from './mei-layout-utils.js';
import HttpClient from '@educandu/educandu/api-clients/http-client.js';
import { useService } from '@educandu/educandu/components/container-context.js';
import { applyVoiceStyling, buildNoteOpacitiesById, buildVoiceKeyByNoteId, collapseLongSilences, countNotes, findVoiceHiddenElementIds, sanitizeNotationSvg } from './mei-voice-utils.js';
import { DEFAULT_HIGHLIGHT_COLOR_VALUE, DEFAULT_MEASURES_PER_LINE_VALUE, DEFAULT_SPACING_SYSTEM_VALUE, DEFAULT_VOICE_VOLUME_VALUE, MAX_NOTE_COUNT_FOR_DISPLAY, MAX_SILENCE_MS } from './constants.js';

// Verovio reports the specific reason a file failed to load (e.g. "No <body> element found in
// the MEI data") only via console.error/console.warn, not via a return value or thrown error.
// Capturing those messages lets the UI show that specific reason instead of a generic
// "not a valid MEI file" message, which is misleading for files that are well-formed XML/MEI but
// simply contain no notation (e.g. metadata-only exports).
/* eslint-disable no-console */
function captureVerovioMessages(callback) {
  const messages = [];
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = (...args) => messages.push(args.join(' ').trim());
  console.warn = (...args) => messages.push(args.join(' ').trim());
  try {
    return { result: callback(), messages };
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }
  /* eslint-enable no-console */
}

let verovioToolkitPromise = null;

function loadVerovioToolkit() {
  verovioToolkitPromise ??= Promise.all([
    import('verovio/wasm'),
    import('verovio/esm')
  ]).then(async ([{ default: createVerovioModule }, { VerovioToolkit }]) => {
    const verovioModule = await createVerovioModule();
    return new VerovioToolkit(verovioModule);
  });

  return verovioToolkitPromise;
}

function MeiDocument({ url, withCredentials, zoom, width, spacingSystem, measuresPerLine, soundEnabled, playbackEnabled, tempo, removeSilence, voiceVolumes, highlightColor, hiddenVoices }) {
  const divRef = useRef(null);
  const isMounted = useIsMounted();
  const lastLoadedUrl = useRef(null);
  const lastRawMeiData = useRef(null);
  const lastLoadedMeasuresPerLine = useRef(null);
  const httpClient = useService(HttpClient);
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [noteEvents, setNoteEvents] = useState([]);
  const [showResizeHint, setShowResizeHint] = useState(false);
  const initialWindowWidth = useRef(null);
  const { t } = useTranslation('musikisum/educandu-plugin-mei-studio');

  // The notation's width is only measured once per layout pass (see below), not tracked reactively
  // via a ResizeObserver - an earlier attempt at that caused a runaway relayout loop (a resize
  // observer reacting to a vertical scrollbar appearing/disappearing as a side effect of its own
  // relayout, ad infinitum), which is a worse failure mode than the original "stale width after
  // resize" issue it was meant to fix. So resizing the window (wider or narrower) after the
  // notation has already rendered doesn't adjust it live in either direction - just point the user
  // at the one thing that reliably does fix it. The threshold avoids false positives from a
  // vertical scrollbar appearing/disappearing, which shifts window.innerWidth by its own width
  // without the user actually resizing anything.
  useEffect(() => {
    const RESIZE_HINT_THRESHOLD_PX = 20;
    initialWindowWidth.current = window.innerWidth;

    const handleWindowResize = () => {
      if (Math.abs(window.innerWidth - initialWindowWidth.current) > RESIZE_HINT_THRESHOLD_PX) {
        setShowResizeHint(true);
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  useEffect(() => {
    // A resize can fire many effect runs in quick succession while the previous one is still
    // awaiting the toolkit/a fetch. Without this guard, an older run can finish *after* a newer
    // one and overwrite its correct, up-to-date layout with its own stale (wrong-width) result.
    let isStale = false;

    (async () => {
      if (!url) {
        lastLoadedUrl.current = null;
        lastRawMeiData.current = null;
        lastLoadedMeasuresPerLine.current = null;
        if (isMounted.current && divRef.current) {
          divRef.current.innerHTML = '';
        }
        setHasError(false);
        setErrorDetails('');
        setIsLoading(false);
        setNoteEvents([]);
        return;
      }

      // Only show the loading indicator when a new file has to be fetched and parsed, not when
      // just re-laying out the already loaded file for a changed zoom/spacing/width value.
      const isNewFile = url !== lastLoadedUrl.current;
      // A measuresPerLine change needs the (cached) MEI data to be re-parsed and reloaded into
      // the toolkit (it changes the actual document content via injected system breaks), unlike
      // zoom/spacing/width changes, which only need a cheap redoLayout on the already-loaded data.
      const needsReload = isNewFile || measuresPerLine !== lastLoadedMeasuresPerLine.current;

      try {
        if (isNewFile) {
          setIsLoading(true);
        }

        const toolkit = await loadVerovioToolkit();
        if (isStale || !isMounted.current || !divRef.current) {
          return;
        }

        const scale = Math.round(zoom * 100);
        const containerWidth = divRef.current.clientWidth;

        // Verovio lays out systems for the given pageWidth *before* applying scale, so the
        // container's actual pixel width has to be inflated by the inverse of the scale
        // factor, otherwise scaled-down/up content would wrap at the wrong point.
        // pageHeight is set to the toolkit's maximum and adjustPageHeight shrinks the result
        // back down to the actual content height, so the whole piece renders as a single,
        // non-paginated page instead of being cut off after the first page.
        toolkit.setOptions({
          scale,
          adjustPageHeight: true,
          pageWidth: Math.round(containerWidth * 100 / scale),
          pageHeight: 60000,
          spacingSystem,
          breaks: measuresPerLine > 0 ? 'encoded' : 'auto',
          midiTempoAdjustment: tempo
        });

        if (needsReload) {
          if (isNewFile) {
            const res = await httpClient.get(url, { responseType: 'text', withCredentials });
            if (isStale || !isMounted.current) {
              return;
            }
            // eslint-disable-next-line require-atomic-updates
            lastRawMeiData.current = res.data;
            // eslint-disable-next-line require-atomic-updates
            lastLoadedUrl.current = url;
          }

          // Verovio lays out the whole document on the main thread - an extremely large or
          // adversarially crafted file could hang the browser tab during that step. Checking the
          // note count upfront (a cheap DOMParser pass) avoids ever starting that expensive step
          // for a file far beyond what's practical to display at all.
          if (countNotes(lastRawMeiData.current) > MAX_NOTE_COUNT_FOR_DISPLAY) {
            throw new Error(t('renderTooLargeError'));
          }

          const meiData = applyMeasuresPerLine(lastRawMeiData.current, measuresPerLine);
          const { result: isLoaded, messages } = captureVerovioMessages(() => toolkit.loadData(meiData));
          if (!isLoaded) {
            throw new Error(messages.join(' ') || 'Verovio could not load the given file as MEI data');
          }
          // eslint-disable-next-line require-atomic-updates
          lastLoadedMeasuresPerLine.current = measuresPerLine;
        } else {
          toolkit.redoLayout();
        }

        // Note events (and with them, audio playback) only exist while soundEnabled - ear
        // training (per-voice mixing/highlighting, voice hiding) additionally requires it, since
        // none of those tools mean anything without audio to begin with. All of this is derived
        // from the toolkit's *currently loaded* document, so it can be (re-)computed here
        // regardless of whether this run reloaded the data or just redid the layout.
        let newNoteEvents = [];
        let noteOpacitiesById = null;
        let hiddenElementIds = null;
        if (soundEnabled) {
          const processedMei = toolkit.getMEI();
          const voiceKeyByNoteId = buildVoiceKeyByNoteId(processedMei);

          // Getting pitch, start time and duration straight from Verovio's own MIDI export
          // (rather than re-deriving them from the raw MEI, e.g. pitch names/accidentals)
          // ensures they reflect whatever Verovio actually resolved - key signatures, gestural
          // accidentals encoded as child <accid> elements, etc. - instead of a re-implementation
          // of that logic that only covers the cases it was tested against.
          toolkit.renderToMIDI();
          const rawNoteEvents = [];
          for (const [id, voiceKey] of voiceKeyByNoteId) {
            const midiValues = toolkit.getMIDIValuesForElement(id);
            if (typeof midiValues.pitch === 'number') {
              rawNoteEvents.push({
                midiNumber: midiValues.pitch,
                voiceKey,
                startMs: midiValues.time,
                durationMs: midiValues.duration
              });
            }
          }
          // Verovio reserves playback time for structures it can't resolve without an explicit
          // MEI <expansion> element (e.g. a written-out repeat with no duplicated/expanded
          // content) as a silent gap rather than actual notes - shorten those down so playback
          // doesn't sit through dead air, unless the author wants those gaps kept as-is.
          newNoteEvents = removeSilence ? collapseLongSilences(rawNoteEvents, MAX_SILENCE_MS) : rawNoteEvents;

          if (playbackEnabled) {
            if (hiddenVoices.length) {
              hiddenElementIds = findVoiceHiddenElementIds(processedMei, voiceKeyByNoteId, hiddenVoices);
            }

            noteOpacitiesById = buildNoteOpacitiesById(voiceKeyByNoteId, voiceVolumes, DEFAULT_VOICE_VOLUME_VALUE);
          }
        }

        const svg = toolkit.renderToSVG(1);
        if (isMounted.current && divRef.current) {
          // The MEI file can come from anyone who can upload/link a file - sanitize Verovio's
          // SVG output before inserting it, rather than trusting it as safe just because it comes
          // from a notation-rendering library rather than directly from user input.
          divRef.current.innerHTML = sanitizeNotationSvg(svg);
          applyVoiceStyling(divRef.current, { noteOpacitiesById, highlightColor, hiddenElementIds });
        }
        setNoteEvents(newNoteEvents);
        setHasError(false);
        setErrorDetails('');
      } catch (error) {
        // eslint-disable-next-line require-atomic-updates
        lastLoadedUrl.current = null;
        // eslint-disable-next-line require-atomic-updates
        lastRawMeiData.current = null;
        // eslint-disable-next-line require-atomic-updates
        lastLoadedMeasuresPerLine.current = null;
        if (!isStale && isMounted.current) {
          setHasError(true);
          setErrorDetails(error.message || '');
          setNoteEvents([]);
          if (divRef.current) {
            divRef.current.innerHTML = '';
          }
        }
      } finally {
        if (!isStale && isMounted.current) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isStale = true;
    };
  }, [url, withCredentials, zoom, width, spacingSystem, measuresPerLine, soundEnabled, playbackEnabled, tempo, removeSilence, voiceVolumes, highlightColor, hiddenVoices, httpClient, isMounted, t]);

  return (
    <div className="EP_Musikisum_MeiStudio_Document">
      {!!showResizeHint && (
        <Alert
          type="info"
          showIcon
          closable
          message={t('resizeHint')}
          onClose={() => setShowResizeHint(false)}
          className="EP_Musikisum_MeiStudio_Document-resizeHint"
          />
      )}
      {!!isLoading && (
        <div className="EP_Musikisum_MeiStudio_Document-spinner">
          <Spin size="large" />
        </div>
      )}
      {!!hasError && (
        <div className="EP_Musikisum_MeiStudio_Document-error">
          <div>{t('renderError')}</div>
          {!!errorDetails && (
            <div className="EP_Musikisum_MeiStudio_Document-errorDetails">{errorDetails}</div>
          )}
        </div>
      )}
      <div ref={divRef} />
      {!!noteEvents.length && (
        <MeiPlayback noteEvents={noteEvents} voiceVolumes={playbackEnabled ? voiceVolumes : {}} />
      )}
    </div>
  );
}

MeiDocument.propTypes = {
  url: PropTypes.string,
  withCredentials: PropTypes.bool,
  zoom: PropTypes.number,
  width: PropTypes.number,
  spacingSystem: PropTypes.number,
  measuresPerLine: PropTypes.number,
  soundEnabled: PropTypes.bool,
  playbackEnabled: PropTypes.bool,
  tempo: PropTypes.number,
  removeSilence: PropTypes.bool,
  voiceVolumes: PropTypes.objectOf(PropTypes.number),
  highlightColor: PropTypes.string,
  hiddenVoices: PropTypes.arrayOf(PropTypes.string)
};

MeiDocument.defaultProps = {
  url: null,
  withCredentials: true,
  zoom: 1,
  width: 100,
  spacingSystem: DEFAULT_SPACING_SYSTEM_VALUE,
  measuresPerLine: DEFAULT_MEASURES_PER_LINE_VALUE,
  soundEnabled: true,
  playbackEnabled: false,
  tempo: 1,
  removeSilence: true,
  voiceVolumes: {},
  highlightColor: DEFAULT_HIGHLIGHT_COLOR_VALUE,
  hiddenVoices: []
};

export default MeiDocument;
