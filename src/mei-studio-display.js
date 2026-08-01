import MeiDocument from './mei-document.js';
import { extractVoices } from './mei-voice-utils.js';
import CopyrightNotice from '@educandu/educandu/components/copyright-notice.js';
import ClientConfig from '@educandu/educandu/bootstrap/client-config.js';
import HttpClient from '@educandu/educandu/api-clients/http-client.js';
import { useIsMounted } from '@educandu/educandu/ui/hooks.js';
import React, { useEffect, useState } from 'react';
import MeiStudioPracticeControls from './mei-studio-practice-controls.js';
import { getAccessibleUrl, isInternalSourceType } from '@educandu/educandu/utils/source-utils.js';
import { useService } from '@educandu/educandu/components/container-context.js';
import { sectionDisplayProps } from '@educandu/educandu/ui/default-prop-types.js';
import { DEFAULT_HIGHLIGHT_COLOR_VALUE, DEFAULT_REMOVE_SILENCE_VALUE, DEFAULT_TEMPO_VALUE } from './constants.js';

export default function MeiStudioDisplay({ content }) {
  const isMounted = useIsMounted();
  const clientConfig = useService(ClientConfig);
  const httpClient = useService(HttpClient);
  const [voices, setVoices] = useState([]);

  const { sourceUrl, zoom, spacingSystem, measuresPerLine, width, copyrightNotice, soundEnabled, playbackEnabled, tempo, removeSilence, voiceVolumes, highlightColor, hiddenVoices } = content;
  const soundEnabledValue = soundEnabled ?? true;

  // Practice controls let learners try out ear-training settings without needing edit access -
  // seeded from the content's own values, then fully independent of them. Never written back to
  // content, so a page reload always returns to the author's saved settings.
  const [practiceTempo, setPracticeTempo] = useState(tempo ?? DEFAULT_TEMPO_VALUE);
  const [practiceRemoveSilence, setPracticeRemoveSilence] = useState(removeSilence ?? DEFAULT_REMOVE_SILENCE_VALUE);
  const [practiceVoiceVolumes, setPracticeVoiceVolumes] = useState(voiceVolumes || {});
  const [practiceHighlightColor, setPracticeHighlightColor] = useState(highlightColor || DEFAULT_HIGHLIGHT_COLOR_VALUE);
  const [practiceHiddenVoices, setPracticeHiddenVoices] = useState(hiddenVoices || []);

  const actualUrl = sourceUrl
    ? getAccessibleUrl({ url: sourceUrl, cdnRootUrl: clientConfig.cdnRootUrl })
    : null;
  // Only send along the user's session cookies for the app's own CDN-hosted content. External
  // URLs typically respond with a wildcard `Access-Control-Allow-Origin: *` (no
  // `Access-Control-Allow-Credentials`), which browsers reject outright for credentialed
  // requests - so a credentialed request there wouldn't just be unnecessary, it would fail.
  const withCredentials = isInternalSourceType({ url: sourceUrl, cdnRootUrl: clientConfig.cdnRootUrl });

  // Voices are only needed for the practice controls (voice mixer, hide-voice checkboxes) below,
  // which are ear-training tools and thus only relevant while playbackEnabled - fetched
  // independently from MeiDocument's own load (which keeps its raw MEI data private to avoid a
  // second, unrelated component reaching into the same Verovio toolkit singleton).
  useEffect(() => {
    setVoices([]);

    if (!soundEnabledValue || !playbackEnabled || !sourceUrl) {
      return () => {};
    }

    const abortController = new AbortController();

    (async () => {
      try {
        const res = await httpClient.get(actualUrl, {
          responseType: 'text',
          withCredentials,
          signal: abortController.signal
        });
        if (isMounted.current) {
          setVoices(extractVoices(res.data));
        }
      } catch {
        // Voice detection is a soft convenience feature for the practice controls - if the file
        // can't be fetched/parsed here, those controls simply won't have a voice list to offer.
      }
    })();

    return () => abortController.abort();
  }, [soundEnabledValue, playbackEnabled, sourceUrl, actualUrl, withCredentials, httpClient, isMounted]);

  return (
    <div className="EP_Musikisum_MeiStudio_Display">
      <div className={`EP_Musikisum_MeiStudio_Display-viewer u-horizontally-centered u-width-${width || 100}`}>
        <MeiDocument
          url={actualUrl}
          withCredentials={withCredentials}
          zoom={zoom}
          width={width}
          spacingSystem={spacingSystem}
          measuresPerLine={measuresPerLine}
          soundEnabled={soundEnabledValue}
          playbackEnabled={playbackEnabled}
          tempo={practiceTempo}
          removeSilence={practiceRemoveSilence}
          voiceVolumes={practiceVoiceVolumes}
          highlightColor={practiceHighlightColor}
          hiddenVoices={practiceHiddenVoices}
          />
      </div>
      {!!soundEnabledValue && !!sourceUrl && (
        <MeiStudioPracticeControls
          voices={voices}
          playbackEnabled={!!playbackEnabled}
          tempo={practiceTempo}
          removeSilence={practiceRemoveSilence}
          voiceVolumes={practiceVoiceVolumes}
          highlightColor={practiceHighlightColor}
          hiddenVoices={practiceHiddenVoices}
          onTempoChange={setPracticeTempo}
          onRemoveSilenceChange={setPracticeRemoveSilence}
          onVoiceVolumesChange={setPracticeVoiceVolumes}
          onHighlightColorChange={setPracticeHighlightColor}
          onHiddenVoicesChange={setPracticeHiddenVoices}
          />
      )}
      {!!copyrightNotice && (
        <div className={`EP_Musikisum_MeiStudio_Display-copyrightNotice u-horizontally-centered u-width-${width || 100}`}>
          <CopyrightNotice value={copyrightNotice} />
        </div>
      )}
    </div>
  );
}

MeiStudioDisplay.propTypes = {
  ...sectionDisplayProps
};
