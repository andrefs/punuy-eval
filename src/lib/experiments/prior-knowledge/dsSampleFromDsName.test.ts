
import { describe, expect, test } from '@jest/globals';
import dsSampleFromDsName from './dsSampleFromDsName';
import { Model } from '../../models/model';
import { DatasetProfile } from '../../types';

const createMockDataset = () => ({
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
      measureType: 'similarity' as const,
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
});

const createMockModel = (result: string) => new Model('test', jest.fn(() => Promise.resolve({
  type: 'openai', data: {
    id: 'test',
    model: 'test',
    object: 'chat.completion',
    created: 0,
    choices: [{
      finish_reason: 'function_call',
      index: 0,
      message: {
        content: null,
        role: 'assistant',
        tool_calls: [{
          id: 'test',
          type: 'function',
          function: {
            name: 'test',
            arguments: result
          }
        }]
      }
    }]
  }
})));


describe('dsSampleFromDsName', () => {
  describe('genPrompt', () => {
    test('should generate a prompt', () => {
      const ds: DatasetProfile = createMockDataset();

      const prompt = dsSampleFromDsName.genPrompt(ds);
      expect(prompt).toEqual(expect.stringContaining('Dataset Name'));
      expect(prompt).toEqual(expect.stringContaining('2021'));
    });
  });

  describe('run', () => {
    test('should call model.makeRequest', async () => {
      const ds: DatasetProfile = createMockDataset();

      const model = createMockModel('this is the result');

      await dsSampleFromDsName.run(ds, model);
      expect(model.makeRequest).toHaveBeenCalled();
    });

    test('should return model.makeRequest result', async () => {
      const ds: DatasetProfile = createMockDataset();

      const model = createMockModel('this is the result');

      const result = await dsSampleFromDsName.run(ds, model);
      expect(result).toEqual('this is the result');
    });


    test('should return empty string if model.makeRequest returns no data', async () => {
      const ds: DatasetProfile = createMockDataset();

      const model = createMockModel('');

      const result = await dsSampleFromDsName.run(ds, model);
      expect(model.makeRequest).toHaveBeenCalled();
      expect(result).toEqual('');
    });
  });
});

