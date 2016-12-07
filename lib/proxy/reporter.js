'use strict';

var uuid = require('node-uuid'),
  EventEmitter = require('events').EventEmitter,
  url = require('url'),
  mime = require('mime-types'),
  baseDir = require('./directory'),
  fs = require('fs-extra'),
  path = require('path'),
  captureDir = path.join(baseDir, 'capture'),
  cleaning = false,
  MAXLENGTH = 1024;

if (fs.existsSync(captureDir)) {
  fs.removeSync(captureDir);
}

fs.mkdirSync(captureDir);

setInterval(function () {

  let now = Date.now();

  if (cleaning) {
    return;
  }

  cleaning = true;

  fs.walk(captureDir)
    .on('data', (item) => {
      let mtime = item.stats.mtime;
      if ((now - mtime.getTime()) > 3600 * 1000) {
        fs.unlink(item.path);
      }
    })
    .on('end', () => {
      cleaning = false;
    });

}, 60 * 1000);

class Report {

  constructor(id, req, reporter) {
    this._id = id;
    this._req = req;
    this._statusCode = 200;
    this._statusMessage = 'OK';
    this._reporter = reporter;
    this._ts = Date.now();
    this._requestCaptureFile = path.join(baseDir, 'capture', this._id + '-request');
    this._responseCaptureFile = path.join(baseDir, 'capture', this._id + '-response');
  }

  logRequestHeaders (headers) {
    this._requestHeaders = headers;
    fs.writeFile(this._requestCaptureFile + '.json', JSON.stringify(headers));
  }

  logRequestChunk (chunk) {
    if (!this._requestCaptureStream) {
      this._requestCaptureStream =
        fs.createWriteStream(
          this._requestCaptureFile + '.bin',
          {
            flags : 'w',
            autoClose : true
          });
    }
    this._requestCaptureStream.write(chunk);
  }

  logResponseHeaders (headers) {
    this._responseHeaders = headers;
    fs.writeFile(this._responseCaptureFile + '.json', JSON.stringify(headers));
  }

  logResponseChunk (chunk) {
    if (!this._responseCaptureStream) {
      this._responseCaptureStream =
        fs.createWriteStream(
          this._responseCaptureFile + '.bin',
          {
            flags : 'w',
            autoClose : true
          });
    }
    this._responseCaptureStream.write(chunk);
  }

  logFinish() {
    if (this._requestCaptureStream) {
      this._requestCaptureStream.end();
      this._requestCaptureFile = null;
    }
    if (this._responseCaptureStream) {
      this._responseCaptureStream.end();
    } else {
      this._responseCaptureFile = null;
    }
    this._latency = Date.now() - this._ts;
    this._reporter.emit('finish', this);
  }

  logStatus(code, message) {
    this._statusCode = code;
    this._statusMessage = message;
  }

  toJSON() {
    var token = url.parse(this._req.url);
    return {
      id: this._id,
      url: this._req.url,
      hostname: this._req.hostname || token.hostname,
      path: token.path,
      method: this._req.method,
      requestHeaders: this._requestHeaders,
      responseHeaders: this._responseHeaders,
      responseCapture : this._responseCaptureFile ? path.basename(this._responseCaptureFile) : null,
      statusCode: this._statusCode,
      statusMessage: this._statusMessage,
      latency: this._latency ? this._latency : null
    }
  }

}

class ProxyReporter extends EventEmitter {

  constructor() {
    super();
    this._reports = [];
  }

  create(req) {
    let report = new Report(uuid.v4(), req, this);
    this._reports.push(report);
    if (this._reports.length > MAXLENGTH) {
      this._reports.shift();
    }
    this.emit('create', report);
    return report;
  }

  * [Symbol.iterator]() {
    for (let r of this._reports) {
      yield r;
    }
  }

}

module.exports = ProxyReporter;