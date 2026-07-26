import { Checkbox, ColorPicker, Space } from 'antd';
import PropTypes from 'prop-types';
import Info from '@educandu/educandu/components/info.js';
import { useTranslation } from 'react-i18next';
import React, { Fragment } from 'react';
import TrackMixerDisplay from '@educandu/educandu/components/media-player/track-mixer-display.js';
import { DEFAULT_VOICE_VOLUME_VALUE } from './constants.js';

// Ear-training voice tools (hide-voice checkboxes, per-voice volume mixer, highlight color) -
// identical content and behavior in the editor and in the display's practice panel. Only the
// surrounding chrome differs (a Form.Item grid vs a plain flex panel), so callers wrap this in
// their own container and just pass a `classNamePrefix` for the shared columns/row layout.
function MeiStudioVoiceTools({
  classNamePrefix,
  voices,
  hiddenVoices,
  voiceVolumes,
  highlightColor,
  onHiddenVoicesChange,
  onVoiceVolumesChange,
  onHighlightColorChange
}) {
  const { t } = useTranslation('musikisum/educandu-plugin-mei-studio');

  const handleVoiceVolumesChange = newTrackVolumes => {
    const newVoiceVolumes = {};
    voices.forEach((voice, index) => {
      newVoiceVolumes[voice.key] = newTrackVolumes[index];
    });
    onVoiceVolumesChange(newVoiceVolumes);
  };

  const handleHiddenVoiceChange = (voiceKey, isHidden) => {
    onHiddenVoicesChange(isHidden ? [...hiddenVoices, voiceKey] : hiddenVoices.filter(key => key !== voiceKey));
  };

  const handleHighlightColorChange = color => {
    onHighlightColorChange(color.toHexString());
  };

  const voiceMixerTracks = voices.map((voice, index) => ({
    key: voice.key,
    name: voice.label || t('voiceFallbackLabel', { voiceNumber: index + 1 })
  }));

  const voiceMixerVolumes = voices.map(voice => voiceVolumes[voice.key] ?? DEFAULT_VOICE_VOLUME_VALUE);

  return (
    <Fragment>
      <div className={`${classNamePrefix}-columns`}>
        <div className={`${classNamePrefix}-column`}>
          <Info tooltip={t('hiddenVoicesInfo')} iconAfterContent>{t('hiddenVoices')}</Info>
          <Space direction="vertical">
            {voices.map((voice, index) => (
              <Checkbox
                key={voice.key}
                checked={hiddenVoices.includes(voice.key)}
                onChange={event => handleHiddenVoiceChange(voice.key, event.target.checked)}
                >
                {voice.label || t('voiceFallbackLabel', { voiceNumber: index + 1 })}
              </Checkbox>
            ))}
          </Space>
        </div>
        {!!voiceMixerTracks.length && (
          <div className={`${classNamePrefix}-column`}>
            <Info tooltip={t('voiceVolumesInfo')} iconAfterContent>{t('voiceVolumes')}</Info>
            <TrackMixerDisplay
              tracks={voiceMixerTracks}
              volumes={voiceMixerVolumes}
              volumePresets={[]}
              selectedVolumePresetIndex={0}
              onVolumesChange={handleVoiceVolumesChange}
              onSelectedVolumePresetIndexChange={() => {}}
              />
          </div>
        )}
      </div>
      <div className={`${classNamePrefix}-row ${classNamePrefix}-row--inline`}>
        <span>{t('highlightColor')}</span>
        <ColorPicker value={highlightColor} onChange={handleHighlightColorChange} disabledAlpha />
      </div>
    </Fragment>
  );
}

MeiStudioVoiceTools.propTypes = {
  classNamePrefix: PropTypes.string.isRequired,
  voices: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string
  })).isRequired,
  hiddenVoices: PropTypes.arrayOf(PropTypes.string).isRequired,
  voiceVolumes: PropTypes.objectOf(PropTypes.number).isRequired,
  highlightColor: PropTypes.string.isRequired,
  onHiddenVoicesChange: PropTypes.func.isRequired,
  onVoiceVolumesChange: PropTypes.func.isRequired,
  onHighlightColorChange: PropTypes.func.isRequired
};

export default MeiStudioVoiceTools;
