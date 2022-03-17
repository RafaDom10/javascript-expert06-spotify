import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { join } from 'path';
import config from '../../../server/config.js';
import { Service } from '../../../server/service.js';
import TestUtil from '../_util/testUtil.js';

const { dir: { publicDirectory } } = config;

describe('# Service - test suite for business and processing rules', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('should create a file stream and return it', async () => {
    const mockFileStream = TestUtil.generateReadableStream(['anything']);
    const service = new Service();

    jest.spyOn(
      fs,
      fs.createReadStream.name
    ).mockReturnValue(mockFileStream);

    const fileStream = service.createFileStream('anyfile');

    expect(fileStream).toStrictEqual(mockFileStream);
  });

  test('should get the file info including name and type', async () => {
    const fileName = 'anyfile.html';
    const service = new Service();

    jest.spyOn(
      fsPromises,
      fs.promises.access.name
    ).mockResolvedValue();

    const fileInfo = await service.getFileInfo(fileName);

    expect(fileInfo).toStrictEqual({
      name: join(publicDirectory, fileName),
      type: '.html'
    });
  });
  test('should get a file stream from file info', async () => {
    const mockFileStream = TestUtil.generateReadableStream(['anything']);
    const service = new Service();

    jest.spyOn(
      Service.prototype,
      Service.prototype.getFileInfo.name
    ).mockResolvedValue({
      name: 'index.html',
      type: '.html'
    });

    jest.spyOn(
      Service.prototype,
      Service.prototype.createFileStream.name
    ).mockReturnValue(mockFileStream);

    const fileStream = await service.getFileStream('anyFile');

    expect(fileStream).toStrictEqual({
      stream: mockFileStream,
      type: '.html'
    });
  });
});
