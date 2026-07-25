import MeiStudioInfo from './mei-studio-info.js';
import { beforeEach, describe, expect, it } from 'vitest';
import GithubFlavoredMarkdown from '@educandu/educandu/common/github-flavored-markdown.js';

describe('mei-studio-info', () => {
  let sut;

  beforeEach(() => {
    sut = new MeiStudioInfo(new GithubFlavoredMarkdown());
  });

  describe('redactContent', () => {
    it('redacts room-media resources from the caption from different rooms', () => {
      const result = sut.redactContent({
        sourceUrl: '',
        caption: '![Some image](cdn://room-media/63cHjt3BAhGnNxzJGrTsN1/some-image.png)'
      }, 'rebhjf4MLq7yjeoCnYfn7E');
      expect(result).toStrictEqual({
        sourceUrl: '',
        caption: '![Some image]()'
      });
    });

    it('leaves room-media resources in the caption from the same room intact', () => {
      const result = sut.redactContent({
        sourceUrl: '',
        caption: '![Some image](cdn://room-media/63cHjt3BAhGnNxzJGrTsN1/some-image.png)'
      }, '63cHjt3BAhGnNxzJGrTsN1');
      expect(result).toStrictEqual({
        sourceUrl: '',
        caption: '![Some image](cdn://room-media/63cHjt3BAhGnNxzJGrTsN1/some-image.png)'
      });
    });

    it('leaves non room-media resources in the caption intact', () => {
      const result = sut.redactContent({
        sourceUrl: '',
        caption: '![Some image](cdn://media-library/JgTaqob5vqosBiHsZZoh1/some-image.png)'
      }, 'rebhjf4MLq7yjeoCnYfn7E');
      expect(result).toStrictEqual({
        sourceUrl: '',
        caption: '![Some image](cdn://media-library/JgTaqob5vqosBiHsZZoh1/some-image.png)'
      });
    });

    it('redacts a sourceUrl pointing to room-media from a different room', () => {
      const result = sut.redactContent({
        sourceUrl: 'cdn://room-media/63cHjt3BAhGnNxzJGrTsN1/some-file.mei',
        caption: ''
      }, 'rebhjf4MLq7yjeoCnYfn7E');
      expect(result).toStrictEqual({
        sourceUrl: '',
        caption: ''
      });
    });

    it('leaves a sourceUrl pointing to room-media from the same room intact', () => {
      const result = sut.redactContent({
        sourceUrl: 'cdn://room-media/63cHjt3BAhGnNxzJGrTsN1/some-file.mei',
        caption: ''
      }, '63cHjt3BAhGnNxzJGrTsN1');
      expect(result).toStrictEqual({
        sourceUrl: 'cdn://room-media/63cHjt3BAhGnNxzJGrTsN1/some-file.mei',
        caption: ''
      });
    });
  });

  describe('getCdnResources', () => {
    it('returns media-library and room-media CDN resources from the caption and the sourceUrl', () => {
      const result = sut.getCdnResources({
        sourceUrl: 'cdn://room-media/63cHjt3BAhGnNxzJGrTsN1/some-file.mei',
        caption: [
          '![Some image](cdn://media-library/JgTaqob5vqosBiHsZZoh1/some-image.png)',
          '![Some image](cdn://room-media/63cHjt3BAhGnNxzJGrTsN1/some-image.png)',
          '![Some image](https://external-domain.org/some-image.png)'
        ].join('\n')
      });
      expect(result).toStrictEqual([
        'cdn://media-library/JgTaqob5vqosBiHsZZoh1/some-image.png',
        'cdn://room-media/63cHjt3BAhGnNxzJGrTsN1/some-image.png',
        'cdn://room-media/63cHjt3BAhGnNxzJGrTsN1/some-file.mei'
      ]);
    });

    it('does not return an external sourceUrl', () => {
      const result = sut.getCdnResources({
        sourceUrl: 'https://external-domain.org/some-file.mei',
        caption: ''
      });
      expect(result).toStrictEqual([]);
    });
  });
});
