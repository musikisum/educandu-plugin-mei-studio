import React from 'react';
import MeiDocument from './mei-document.js';
import Markdown from '@educandu/educandu/components/markdown.js';
import ClientConfig from '@educandu/educandu/bootstrap/client-config.js';
import { getAccessibleUrl, isInternalSourceType } from '@educandu/educandu/utils/source-utils.js';
import { useService } from '@educandu/educandu/components/container-context.js';
import { sectionDisplayProps } from '@educandu/educandu/ui/default-prop-types.js';

export default function MeiStudioDisplay({ content }) {
  const clientConfig = useService(ClientConfig);

  const { sourceUrl, zoom, spacingSystem, measuresPerLine, width, caption, playbackEnabled, tempo, removeSilence, voiceVolumes, highlightColor } = content;
  const actualUrl = sourceUrl
    ? getAccessibleUrl({ url: sourceUrl, cdnRootUrl: clientConfig.cdnRootUrl })
    : null;
  // Only send along the user's session cookies for the app's own CDN-hosted content. External
  // URLs typically respond with a wildcard `Access-Control-Allow-Origin: *` (no
  // `Access-Control-Allow-Credentials`), which browsers reject outright for credentialed
  // requests - so a credentialed request there wouldn't just be unnecessary, it would fail.
  const withCredentials = isInternalSourceType({ url: sourceUrl, cdnRootUrl: clientConfig.cdnRootUrl });

  return (
    <div className="EP_Musikisum_MeiStudio_Display">
      <div className={`EP_Musikisum_MeiStudio_Display-viewer u-width-${width || 100}`}>
        <MeiDocument
          url={actualUrl}
          withCredentials={withCredentials}
          zoom={zoom}
          width={width}
          spacingSystem={spacingSystem}
          measuresPerLine={measuresPerLine}
          playbackEnabled={playbackEnabled}
          tempo={tempo}
          removeSilence={removeSilence}
          voiceVolumes={voiceVolumes}
          highlightColor={highlightColor}
          />
      </div>
      {!!caption && (
        <div className={`EP_Musikisum_MeiStudio_Display-caption u-width-${width || 100}`}>
          <Markdown inline>{caption}</Markdown>
        </div>
      )}
    </div>
  );
}

MeiStudioDisplay.propTypes = {
  ...sectionDisplayProps
};
