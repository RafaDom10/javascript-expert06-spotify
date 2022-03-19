import fs from 'fs';
import fsPromises from 'fs/promises';
import { randomUUID } from 'crypto';
import config from './config.js';
import { PassThrough, Writable } from 'stream';
import { once } from 'events';
import streamsPromise from 'stream/promises';
import Throttle from 'throttle';
import childProcess from 'child_process';
import { join, extname } from 'path';
import { logger } from './util.js';

const {
  dir: {
    publicDirectory
  },
  constants: {
    fallbackBiteRate,
    englishConversation,
    bitRateDivisor
  }
} = config;

export class Service {
  constructor() {
    this.clientStreams = new Map();
    this.currentSong = englishConversation;
    this.currentBitRate = 0;
    this.throttleTransform = {};
    this.currentReadable = {};
  }

  createClientStream() {
    const id = randomUUID();
    const clientStream = new PassThrough();
    this.clientStreams.set(id, clientStream);

    return {
      id,
      clientStream
    }
  }

  removeClientStream(id) {
    this.clientStreams.delete(id);
  }

  _executeSoxCommand(args) {
    return childProcess.spawn('sox', args);
  }

  async getBitRate(song) {
    try {
      const args = [
        '--i', // info
        '-B', // bitrate
        song
      ];

      const {
        stderr, // tudo que é error
        stdout, // tudo que é log
        //stdin // enviar dados como stream
      } = this._executeSoxCommand(args);

      await Promise.all([
        once(stderr, 'readable'),
        once(stdout, 'readable'),
      ])

      const [success, error] = [stdout, stderr].map(stream => stream.read());
      if (error) return await Promise.reject(error);

      return success.toString().trim().replace(/k/, '000');

    } catch (error) {
      logger.error(`deu ruim no bitrate: ${error}`);
      return fallbackBiteRate;
    }
  }

  broadCast() {
    return new Writable({
      write: (chunk, enc, cb) => {
        for (const [id, stream] of this.clientStreams) {
          // se o cliente desconectou nao devemos mais mandar dados para ele
          if (stream.writableEnded) {
            this.clientStreams.delete(id);
            continue;
          }

          stream.write(chunk)
        }

        cb();
      }
    })
  }

  async startStreaming() {
    logger.info(`starting with ${this.currentSong}`);
    const bitRate = this.currentBitRate = (await this.getBitRate(this.currentSong)) / bitRateDivisor;
    const throttleTransform = new Throttle(bitRate);
    const songReadable = this.currentReadable = this.createFileStream(this.currentSong);
    return streamsPromise.pipeline(
      songReadable,
      throttleTransform,
      this.broadCast()
    );
  }

  stopStreaming() {
    this.throttleTransform?.end?.();
  }

  createFileStream(filename) {
    return fs.createReadStream(filename);
  }

  async getFileInfo(file) {
    const fullFilePath = join(publicDirectory, file);

    //* valida se existe se não estoura um erro
    await fsPromises.access(fullFilePath);

    const fileType = extname(fullFilePath);

    return {
      type: fileType,
      name: fullFilePath
    }
  }

  async getFileStream(file) {
    const { name, type } = await this.getFileInfo(file);
    return {
      stream: this.createFileStream(name),
      type
    }
  }
}
