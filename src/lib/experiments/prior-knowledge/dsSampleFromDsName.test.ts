
import { describe, expect, test } from '@jest/globals';
import dsSampleFromDsName from './dsSampleFromDsName';
import { DatasetProfile } from '../../types';

describe('dsSampleFromDsName', () => {
  describe('genPrompt', () => {
    test('should generate a prompt', () => {
      const ds: DatasetProfile = {
        id: 'test',
        metadata: {
          name: 'Dataset Name',
          description: 'test',
          papers: [],
          urls: [],
          date: '2021-01-01',
          downloadUrls: [],
          measureTypes: [],
        },
        partitions: [
          {
            id: 'test',
            measureType: 'similarity',
            data: [
              {
                word1: 'test',
                word2: 'test',
                value: 0.5,
                values: [0.5],
              },
            ],
          },
        ],
      };

      const prompt = dsSampleFromDsName.genPrompt(ds);
      expect(prompt).toEqual(expect.stringContaining('Dataset Name'));
      expect(prompt).toEqual(expect.stringContaining('2021'));
    });
  });
});

