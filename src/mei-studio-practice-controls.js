import { Button, Divider, Switch } from 'antd';
import PropTypes from 'prop-types';
import Info from '@educandu/educandu/components/info.js';
import { SettingOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import React, { Fragment, useState } from 'react';
import StepSlider from '@educandu/educandu/components/step-slider.js';
import MeiStudioVoiceTools from './mei-studio-voice-tools.js';
import { usePercentageFormat } from '@educandu/educandu/components/locale-context.js';
import { MAX_TEMPO_VALUE, MIN_TEMPO_VALUE } from './constants.js';

// Practice-only controls shown in the display (never persisted to content, reset on reload) -
// lets learners adjust playback (tempo, remove silence) and, while ear training is enabled,
// per-voice volume/highlight color and hiding voices from the notation, without needing edit
// access. Only the values, never the source file, can be changed here - picking a different MEI
// file stays an editor-only action.
function MeiStudioPracticeControls({
  voices,
  playbackEnabled,
  tempo,
  removeSilence,
  voiceVolumes,
  highlightColor,
  hiddenVoices,
  onTempoChange,
  onTempoChangeComplete,
  onRemoveSilenceChange,
  onVoiceVolumesChange,
  onHighlightColorChange,
  onHiddenVoicesChange
}) {
  const { t } = useTranslation('musikisum/educandu-plugin-mei-studio');
  const percentageFormatter = usePercentageFormat();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="EP_Musikisum_MeiStudio_PracticeControls">
      <Button
        type="text"
        size="small"
        icon={<SettingOutlined />}
        onClick={() => setIsOpen(previousValue => !previousValue)}
        >
        {t('practiceControls')}
      </Button>
      {!!isOpen && (
        <div className="EP_Musikisum_MeiStudio_PracticeControls-panel">
          <div className="EP_Musikisum_MeiStudio_PracticeControls-hint">{t('practiceControlsRerenderHint')}</div>
          <div className="EP_Musikisum_MeiStudio_PracticeControls-group">
            <div className="EP_Musikisum_MeiStudio_PracticeControls-groupTitle">{t('playbackSettings')}</div>
            <div className="EP_Musikisum_MeiStudio_PracticeControls-row">
              <Info tooltip={t('tempoInfo')} iconAfterContent>{t('tempo')}</Info>
              <StepSlider
                step={0.05}
                value={tempo}
                marksStep={0.25}
                labelsStep={0.25}
                min={MIN_TEMPO_VALUE}
                max={MAX_TEMPO_VALUE}
                onChange={onTempoChange}
                onChangeComplete={onTempoChangeComplete}
                formatter={percentageFormatter}
                />
            </div>
            <div className="EP_Musikisum_MeiStudio_PracticeControls-row EP_Musikisum_MeiStudio_PracticeControls-row--inline">
              <Info tooltip={t('removeSilenceInfo')} iconAfterContent>{t('removeSilence')}</Info>
              <Switch checked={removeSilence} onChange={onRemoveSilenceChange} />
            </div>
          </div>
          {!!playbackEnabled && !!voices.length && (
            <Fragment>
              <Divider />
              <div className="EP_Musikisum_MeiStudio_PracticeControls-group">
                <div className="EP_Musikisum_MeiStudio_PracticeControls-groupTitle">{t('earTrainingTools')}</div>
                <MeiStudioVoiceTools
                  classNamePrefix="EP_Musikisum_MeiStudio_PracticeControls"
                  voices={voices}
                  hiddenVoices={hiddenVoices}
                  voiceVolumes={voiceVolumes}
                  highlightColor={highlightColor}
                  onHiddenVoicesChange={onHiddenVoicesChange}
                  onVoiceVolumesChange={onVoiceVolumesChange}
                  onHighlightColorChange={onHighlightColorChange}
                  />
              </div>
            </Fragment>
          )}
        </div>
      )}
    </div>
  );
}

MeiStudioPracticeControls.propTypes = {
  voices: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string
  })).isRequired,
  playbackEnabled: PropTypes.bool.isRequired,
  tempo: PropTypes.number.isRequired,
  removeSilence: PropTypes.bool.isRequired,
  voiceVolumes: PropTypes.objectOf(PropTypes.number).isRequired,
  highlightColor: PropTypes.string.isRequired,
  hiddenVoices: PropTypes.arrayOf(PropTypes.string).isRequired,
  onTempoChange: PropTypes.func.isRequired,
  onTempoChangeComplete: PropTypes.func.isRequired,
  onRemoveSilenceChange: PropTypes.func.isRequired,
  onVoiceVolumesChange: PropTypes.func.isRequired,
  onHighlightColorChange: PropTypes.func.isRequired,
  onHiddenVoicesChange: PropTypes.func.isRequired
};

export default MeiStudioPracticeControls;
