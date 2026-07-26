import { Alert, Form, Switch } from 'antd';
import { countNotes, extractVoices } from './mei-voice-utils.js';
import { useTranslation } from 'react-i18next';
import Info from '@educandu/educandu/components/info.js';
import UrlInput from '@educandu/educandu/components/url-input.js';
import StepSlider from '@educandu/educandu/components/step-slider.js';
import { useIsMounted } from '@educandu/educandu/ui/hooks.js';
import React, { Fragment, useEffect, useState } from 'react';
import HttpClient from '@educandu/educandu/api-clients/http-client.js';
import MeiStudioVoiceTools from './mei-studio-voice-tools.js';
import {
  MAX_ZOOM_VALUE, MIN_ZOOM_VALUE,
  MAX_SPACING_SYSTEM_VALUE, MIN_SPACING_SYSTEM_VALUE,
  MAX_MEASURES_PER_LINE_VALUE, MIN_MEASURES_PER_LINE_VALUE,
  LARGE_FILE_SIZE_WARNING_THRESHOLD_IN_BYTES,
  MAX_NOTE_COUNT_FOR_PLAYBACK,
  MAX_TEMPO_VALUE, MIN_TEMPO_VALUE, DEFAULT_TEMPO_VALUE, DEFAULT_REMOVE_SILENCE_VALUE
} from './constants.js';
import CopyrightNoticeEditor from '@educandu/educandu/components/copyright-notice-editor.js';
import ClientConfig from '@educandu/educandu/bootstrap/client-config.js';
import { ensureAreExcluded } from '@educandu/educandu/utils/array-utils.js';
import { sectionEditorProps } from '@educandu/educandu/ui/default-prop-types.js';
import ObjectWidthSlider from '@educandu/educandu/components/object-width-slider.js';
import { useService } from '@educandu/educandu/components/container-context.js';
import { usePercentageFormat } from '@educandu/educandu/components/locale-context.js';
import { FORM_ITEM_LAYOUT, SOURCE_TYPE } from '@educandu/educandu/domain/constants.js';
import { getAccessibleUrl, isInternalSourceType } from '@educandu/educandu/utils/source-utils.js';

const FormItem = Form.Item;

export default function MeiStudioEditor({ content, onContentChanged }) {
  const { t } = useTranslation('musikisum/educandu-plugin-mei-studio');
  const isMounted = useIsMounted();
  const clientConfig = useService(ClientConfig);
  const httpClient = useService(HttpClient);
  const percentageFormatter = usePercentageFormat();
  const [isFileTooLarge, setIsFileTooLarge] = useState(false);
  const [voices, setVoices] = useState([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [isTooLargeForPlayback, setIsTooLargeForPlayback] = useState(false);

  const { sourceUrl, zoom, spacingSystem, measuresPerLine, width, copyrightNotice, soundEnabled, playbackEnabled, tempo, removeSilence, voiceVolumes, highlightColor, hiddenVoices } = content;
  // Content saved before these fields existed doesn't have them yet, so fall back to the same
  // defaults getDefaultContent() uses for new content - otherwise the controls would show a value
  // that doesn't match what's actually being played back. `||`/`??` rather than a destructuring
  // default: a destructuring default only kicks in for `undefined`, not a stored `null`.
  const soundEnabledValue = soundEnabled ?? true;
  const tempoValue = tempo ?? DEFAULT_TEMPO_VALUE;
  const removeSilenceValue = removeSilence ?? DEFAULT_REMOVE_SILENCE_VALUE;
  const voiceVolumesValue = voiceVolumes || {};
  const hiddenVoicesValue = hiddenVoices || [];

  useEffect(() => {
    setIsFileTooLarge(false);

    if (!sourceUrl) {
      return () => {};
    }

    const actualUrl = getAccessibleUrl({ url: sourceUrl, cdnRootUrl: clientConfig.cdnRootUrl });
    // Only send the user's session cookies for the app's own CDN-hosted content - external hosts
    // typically respond with a wildcard Access-Control-Allow-Origin, which browsers reject for
    // credentialed requests.
    const withCredentials = isInternalSourceType({ url: sourceUrl, cdnRootUrl: clientConfig.cdnRootUrl });
    const abortController = new AbortController();

    (async () => {
      try {
        const res = await fetch(actualUrl, {
          method: 'HEAD',
          credentials: withCredentials ? 'include' : 'omit',
          signal: abortController.signal
        });
        const contentLength = Number(res.headers.get('content-length'));
        if (isMounted.current && contentLength > LARGE_FILE_SIZE_WARNING_THRESHOLD_IN_BYTES) {
          setIsFileTooLarge(true);
        }
      } catch {
        // The file size is only used for a soft warning, so a failed HEAD request (e.g. no
        // CORS support on an external host) is not worth surfacing as an error to the user.
      }
    })();

    return () => abortController.abort();
  }, [sourceUrl, clientConfig, isMounted]);

  // isTooLargeForPlayback needs this regardless of playbackEnabled - audio playback itself is a
  // general feature (see mei-document.js), not an ear-training-only one, so it only depends on
  // soundEnabled. voices is used further down only for the ear-training tools (hide-voice
  // checkboxes, volume mixer), which stay gated behind playbackEnabled - fetching it here
  // regardless just means it goes unused in that case, which is cheap (a client-side XML parse)
  // compared to what MeiDocument itself already does for audio generation while sound is on.
  useEffect(() => {
    setVoices([]);
    setIsTooLargeForPlayback(false);

    if (!soundEnabledValue || !sourceUrl) {
      return () => {};
    }

    const actualUrl = getAccessibleUrl({ url: sourceUrl, cdnRootUrl: clientConfig.cdnRootUrl });
    const withCredentials = isInternalSourceType({ url: sourceUrl, cdnRootUrl: clientConfig.cdnRootUrl });
    const abortController = new AbortController();

    (async () => {
      setIsLoadingVoices(true);
      try {
        const res = await httpClient.get(actualUrl, {
          responseType: 'text',
          withCredentials,
          signal: abortController.signal
        });
        if (isMounted.current) {
          setVoices(extractVoices(res.data));
          setIsTooLargeForPlayback(countNotes(res.data) > MAX_NOTE_COUNT_FOR_PLAYBACK);
        }
      } catch {
        // Voice detection is a soft convenience feature for the dropdown below - if the file
        // can't be fetched/parsed here, the user simply won't get a voice list to pick from.
      } finally {
        if (isMounted.current) {
          setIsLoadingVoices(false);
        }
      }
    })();

    return () => abortController.abort();
  }, [soundEnabledValue, sourceUrl, clientConfig, httpClient, isMounted]);

  const triggerContentChanged = newContentValues => {
    onContentChanged({ ...content, ...newContentValues });
  };

  const handleSourceUrlChange = value => {
    triggerContentChanged({ sourceUrl: value });
  };

  const handleZoomChange = newValue => {
    triggerContentChanged({ zoom: newValue });
  };

  const handleSpacingSystemChange = newValue => {
    triggerContentChanged({ spacingSystem: newValue });
  };

  const handleMeasuresPerLineChange = newValue => {
    triggerContentChanged({ measuresPerLine: newValue });
  };

  const formatMeasuresPerLine = value => value === 0 ? t('automatic') : value.toString();

  const handleWidthChange = newValue => {
    triggerContentChanged({ width: newValue });
  };

  const handleCopyrightNoticeChange = value => {
    triggerContentChanged({ copyrightNotice: value });
  };

  const handleSoundEnabledChange = newValue => {
    triggerContentChanged({ soundEnabled: newValue });
  };

  const handlePlaybackEnabledChange = newValue => {
    triggerContentChanged({ playbackEnabled: newValue });
  };

  const handleTempoChange = newValue => {
    triggerContentChanged({ tempo: newValue });
  };

  const handleRemoveSilenceChange = newValue => {
    triggerContentChanged({ removeSilence: newValue });
  };

  const handleVoiceVolumesChange = newVoiceVolumes => {
    triggerContentChanged({ voiceVolumes: newVoiceVolumes });
  };

  const handleHighlightColorChange = hexColor => {
    triggerContentChanged({ highlightColor: hexColor });
  };

  const handleHiddenVoicesChange = newHiddenVoices => {
    triggerContentChanged({ hiddenVoices: newHiddenVoices });
  };

  const allowedSourceTypes = ensureAreExcluded(Object.values(SOURCE_TYPE), [SOURCE_TYPE.youtube, SOURCE_TYPE.wikimedia]);

  return (
    <div className="EP_Musikisum_MeiStudio_Editor">
      <Form layout="horizontal" labelAlign="left">
        <FormItem {...FORM_ITEM_LAYOUT} label={t('common:url')}>
          <UrlInput value={sourceUrl} onChange={handleSourceUrlChange} allowedSourceTypes={allowedSourceTypes} />
        </FormItem>
        {!!isFileTooLarge && (
          <FormItem {...FORM_ITEM_LAYOUT} label={' '} colon={false}>
            <Alert type="warning" showIcon message={t('largeFileWarning')} />
          </FormItem>
        )}
        <Form.Item label={t('common:copyrightNotice')} {...FORM_ITEM_LAYOUT}>
          <CopyrightNoticeEditor value={copyrightNotice} sourceUrl={sourceUrl} onChange={handleCopyrightNoticeChange} />
        </Form.Item>
        <Form.Item label={t('zoom')} {...FORM_ITEM_LAYOUT}>
          <StepSlider
            step={0.05}
            value={zoom}
            marksStep={0.05}
            labelsStep={0.25}
            min={MIN_ZOOM_VALUE}
            max={MAX_ZOOM_VALUE}
            onChange={handleZoomChange}
            formatter={percentageFormatter}
            />
        </Form.Item>
        <Form.Item label={t('spacingSystem')} {...FORM_ITEM_LAYOUT}>
          <StepSlider
            step={1}
            value={spacingSystem}
            marksStep={6}
            labelsStep={12}
            min={MIN_SPACING_SYSTEM_VALUE}
            max={MAX_SPACING_SYSTEM_VALUE}
            onChange={handleSpacingSystemChange}
            />
        </Form.Item>
        <Form.Item
          label={<Info tooltip={t('measuresPerLineInfo')}>{t('measuresPerLine')}</Info>}
          {...FORM_ITEM_LAYOUT}
          >
          <StepSlider
            step={1}
            value={measuresPerLine}
            marksStep={2}
            labelsStep={4}
            min={MIN_MEASURES_PER_LINE_VALUE}
            max={MAX_MEASURES_PER_LINE_VALUE}
            onChange={handleMeasuresPerLineChange}
            formatter={formatMeasuresPerLine}
            />
        </Form.Item>
        <Form.Item
          label={<Info tooltip={t('common:widthInfo')}>{t('common:width')}</Info>}
          {...FORM_ITEM_LAYOUT}
          >
          <ObjectWidthSlider value={width} onChange={handleWidthChange} />
        </Form.Item>
        <Form.Item
          label={<Info tooltip={t('soundEnabledInfo')}>{t('playbackSettings')}</Info>}
          {...FORM_ITEM_LAYOUT}
          >
          <Switch checked={soundEnabledValue} onChange={handleSoundEnabledChange} />
        </Form.Item>
        {!!soundEnabledValue && (
          <Fragment>
            <Form.Item label={<Info tooltip={t('tempoInfo')}>{t('tempo')}</Info>} {...FORM_ITEM_LAYOUT}>
              <StepSlider
                step={0.05}
                value={tempoValue}
                marksStep={0.2}
                labelsStep={1}
                min={MIN_TEMPO_VALUE}
                max={MAX_TEMPO_VALUE}
                onChange={handleTempoChange}
                formatter={percentageFormatter}
                />
            </Form.Item>
            <Form.Item label={<Info tooltip={t('removeSilenceInfo')}>{t('removeSilence')}</Info>} {...FORM_ITEM_LAYOUT}>
              <Switch checked={removeSilenceValue} onChange={handleRemoveSilenceChange} />
            </Form.Item>
            {!!isTooLargeForPlayback && (
              <FormItem {...FORM_ITEM_LAYOUT} label={' '} colon={false}>
                <Alert type="warning" showIcon message={t('playbackTooLargeWarning')} />
              </FormItem>
            )}
            <Form.Item
              label={<Info tooltip={t('playbackEnabledInfo')}>{t('playbackEnabled')}</Info>}
              {...FORM_ITEM_LAYOUT}
              >
              <Switch checked={playbackEnabled} onChange={handlePlaybackEnabledChange} />
            </Form.Item>
            {!!playbackEnabled && !isLoadingVoices && !!voices.length && (
              <FormItem {...FORM_ITEM_LAYOUT} label={' '} colon={false}>
                <MeiStudioVoiceTools
                  classNamePrefix="EP_Musikisum_MeiStudio_Editor"
                  voices={voices}
                  hiddenVoices={hiddenVoicesValue}
                  voiceVolumes={voiceVolumesValue}
                  highlightColor={highlightColor}
                  onHiddenVoicesChange={handleHiddenVoicesChange}
                  onVoiceVolumesChange={handleVoiceVolumesChange}
                  onHighlightColorChange={handleHighlightColorChange}
                  />
              </FormItem>
            )}
          </Fragment>
        )}
      </Form>
    </div>
  );
}

MeiStudioEditor.propTypes = {
  ...sectionEditorProps
};
