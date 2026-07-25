import joi from 'joi';
import React from 'react';
import MeiStudioIcon from './mei-studio-icon.js';
import cloneDeep from '@educandu/educandu/utils/clone-deep.js';
import { PLUGIN_GROUP } from '@educandu/educandu/domain/constants.js';
import { MAX_ZOOM_VALUE, MIN_ZOOM_VALUE, DEFAULT_SPACING_SYSTEM_VALUE, MAX_SPACING_SYSTEM_VALUE, MIN_SPACING_SYSTEM_VALUE,
  DEFAULT_MEASURES_PER_LINE_VALUE, MAX_MEASURES_PER_LINE_VALUE, MIN_MEASURES_PER_LINE_VALUE,
  DEFAULT_HIGHLIGHT_COLOR_VALUE, MIN_VOICE_VOLUME_VALUE, MAX_VOICE_VOLUME_VALUE,
  DEFAULT_TEMPO_VALUE, MIN_TEMPO_VALUE, MAX_TEMPO_VALUE, DEFAULT_REMOVE_SILENCE_VALUE } from './constants.js';
import GithubFlavoredMarkdown from '@educandu/educandu/common/github-flavored-markdown.js';
import { isInternalSourceType, couldAccessUrlFromRoom } from '@educandu/educandu/utils/source-utils.js';

class MeiStudioInfo {
  static dependencies = [GithubFlavoredMarkdown];

  static typeName = 'musikisum/educandu-plugin-mei-studio';

  constructor(gfm) {
    this.gfm = gfm;
  }

  getDisplayName(t) {
    return t('musikisum/educandu-plugin-mei-studio:name');
  }

  getIcon() {
    return <MeiStudioIcon />;
  }

  getGroups() {
    return [PLUGIN_GROUP.other];
  }

  async resolveDisplayComponent() {
    return (await import('./mei-studio-display.js')).default;
  }

  async resolveEditorComponent() {
    return (await import('./mei-studio-editor.js')).default;
  }

  getDefaultContent() {
    return {
      sourceUrl: '',
      zoom: 0.35,
      spacingSystem: DEFAULT_SPACING_SYSTEM_VALUE,
      measuresPerLine: DEFAULT_MEASURES_PER_LINE_VALUE,
      width: 100,
      caption: '',
      playbackEnabled: false,
      tempo: DEFAULT_TEMPO_VALUE,
      removeSilence: DEFAULT_REMOVE_SILENCE_VALUE,
      voiceVolumes: {},
      highlightColor: DEFAULT_HIGHLIGHT_COLOR_VALUE
    };
  }

  validateContent(content) {
    const schema = joi.object({
      sourceUrl: joi.string().allow('').required(),
      zoom: joi.number().min(MIN_ZOOM_VALUE).max(MAX_ZOOM_VALUE).required(),
      spacingSystem: joi.number().min(MIN_SPACING_SYSTEM_VALUE).max(MAX_SPACING_SYSTEM_VALUE).required(),
      measuresPerLine: joi.number().integer().min(MIN_MEASURES_PER_LINE_VALUE).max(MAX_MEASURES_PER_LINE_VALUE).required(),
      width: joi.number().min(0).max(100).required(),
      caption: joi.string().allow('').required(),
      playbackEnabled: joi.boolean().required(),
      tempo: joi.number().min(MIN_TEMPO_VALUE).max(MAX_TEMPO_VALUE).required(),
      removeSilence: joi.boolean().required(),
      voiceVolumes: joi.object().pattern(joi.string(), joi.number().min(MIN_VOICE_VOLUME_VALUE).max(MAX_VOICE_VOLUME_VALUE)).required(),
      highlightColor: joi.string().pattern(/^#[0-9a-fA-F]{6}$/).required()
    });

    joi.attempt(content, schema, { abortEarly: false, convert: false, noDefaults: true });
  }

  cloneContent(content) {
    return cloneDeep(content);
  }

  redactContent(content, targetRoomId) {
    const redactedContent = cloneDeep(content);

    redactedContent.caption = this.gfm.redactCdnResources(
      redactedContent.caption,
      url => couldAccessUrlFromRoom(url, targetRoomId) ? url : ''
    );

    if (!couldAccessUrlFromRoom(redactedContent.sourceUrl, targetRoomId)) {
      redactedContent.sourceUrl = '';
    }

    return redactedContent;
  }

  getCdnResources(content) {
    const cdnResources = [];

    cdnResources.push(...this.gfm.extractCdnResources(content.caption));

    if (isInternalSourceType({ url: content.sourceUrl })) {
      cdnResources.push(content.sourceUrl);
    }

    return [...new Set(cdnResources)].filter(cdnResource => cdnResource);
  }
}

export default MeiStudioInfo;
