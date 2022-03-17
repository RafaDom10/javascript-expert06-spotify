import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Controller } from '../../../server/controller.js';
import { Service } from '../../../server/service.js';
import TestUtil from '../_util/testUtil.js';

describe('# Controller - test suite for intermediate layer', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('should get file stream from server', async () => {
    const mockFileStream = TestUtil.generateReadableStream(['anything']);
    const expectedType = '.html';
    const controller = new Controller();

    jest.spyOn(
      Service.prototype,
      Service.prototype.getFileStream.name
    ).mockResolvedValue({
      stream: mockFileStream,
      type: expectedType
    });

    const fileStream = await controller.getFileStream('anything');

    expect(Service.prototype.getFileStream).toBeCalledWith('anything');
    expect(fileStream).toStrictEqual({
      stream: mockFileStream,
      type: expectedType
    });
  });
});
