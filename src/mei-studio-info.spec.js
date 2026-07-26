import MeiStudioInfo from './mei-studio-info.js';
import { beforeEach, describe, expect, it } from 'vitest';
import GithubFlavoredMarkdown from '@educandu/educandu/common/github-flavored-markdown.js';

describe('mei-studio-info', () => {
  let sut;

  beforeEach(() => {
    sut = new MeiStudioInfo(new GithubFlavoredMarkdown());
  });

  describe('redactContent', () => {
    it('redacts room-media resources from the copyright notice from different rooms', () => {
      const result = sut.redactContent({
        sourceUrl: '',
        copyrightNotice: '![Some image](cdn://room-media/63cHjt3BAhGnNxzJGrTsN1/some-image.png)'
      }, 'rebhjf4MLq7yjeoCnYfn7E');
      expect(result).toStrictEqual({
        sourceUrl: '',
        copyrightNotice: '![Some image]()'
      });
    });

    it('leaves room-media resources in the copyright notice from the same room intact', () => {
      const result = sut.redactContent({
        sourceUrl: '',
        copyrightNotice: '![Some image](cdn://room-media/63cHjt3BAhGnNxzJGrTsN1/some-image.png)'
      }, '63cHjt3BAhGnNxzJGrTsN1');
      expect(result).toStrictEqual({
        sourceUrl: '',
        copyrightNotice: '![Some image](cdn://room-media/63cHjt3BAhGnNxzJGrTsN1/some-image.png)'
      });
    });

    it('leaves non room-media resources in the copyright notice intact', () => {
      const result = sut.redactContent({
        sourceUrl: '',
        copyrightNotice: '![Some image](cdn://media-library/JgTaqob5vqosBiHsZZoh1/some-image.png)'
      }, 'rebhjf4MLq7yjeoCnYfn7E');
      expect(result).toStrictEqual({
        sourceUrl: '',
        copyrightNotice: '![Some image](cdn://media-library/JgTaqob5vqosBiHsZZoh1/some-image.png)'
      });
    });

    it('redacts a sourceUrl pointing to room-media from a different room', () => {
      const result = sut.redactContent({
        sourceUrl: 'cdn://room-media/63cHjt3BAhGnNxzJGrTsN1/some-file.mei',
        copyrightNotice: ''
      }, 'rebhjf4MLq7yjeoCnYfn7E');
      expect(result).toStrictEqual({
        sourceUrl: '',
        copyrightNotice: ''
      });
    });

    it('leaves a sourceUrl pointing to room-media from the same room intact', () => {
      const result = sut.redactContent({
        sourceUrl: 'cdn://room-media/63cHjt3BAhGnNxzJGrTsN1/some-file.mei',
        copyrightNotice: ''
      }, '63cHjt3BAhGnNxzJGrTsN1');
      expect(result).toStrictEqual({
        sourceUrl: 'cdn://room-media/63cHjt3BAhGnNxzJGrTsN1/some-file.mei',
        copyrightNotice: ''
      });
    });
  });

  describe('getCdnResources', () => {
    it('returns media-library and room-media CDN resources from the copyright notice and the sourceUrl', () => {
      const result = sut.getCdnResources({
        sourceUrl: 'cdn://room-media/63cHjt3BAhGnNxzJGrTsN1/some-file.mei',
        copyrightNotice: [
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
        copyrightNotice: ''
      });
      expect(result).toStrictEqual([]);
    });
  });
});
