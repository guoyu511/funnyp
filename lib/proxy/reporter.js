'use strict';

const uuid = require('uuid'),
  EventEmitter = require('events').EventEmitter,
  url = require('url'),
  mime = require('mime-types'),
  fs = require('fs-extra'),
  path = require('path'),
  MAX_LENGTH = 1024,
  CAPTURE_TYPES = [
    /application\/json/,
    /application\/javascript/,
    /application\/x-www-form-urlencoded/,
    /text\/(.+)/
  ];

class Report {

  constructor(id, url, req, reporter) {
    this._id = id;
    this._url = url;
    this._req = req;
    this._statusMessage = '';
    this._reporter = reporter;
    this._ts = Date.now();
    this._requestHeaders = req.headers;
  }

  logRequestChunk(chunk) {
    if (!CAPTURE_TYPES.some((exp) => exp.test(this._requestHeaders['content-type']))) {
      return;
    }
    if (!this._requestBuffer) {
      this._requestBuffer = [];
    }
    this._requestBuffer.push(chunk);
  }

  logResponseHeaders(headers) {
    this._responseHeaders = headers;
  }

  logResponseChunk(chunk) {
    if (!this._responseHeaders) {
      return;
    }
    if (!CAPTURE_TYPES.some((exp) => exp.test(this._responseHeaders['content-type']))) {
      return;
    }
    if (!this._responseBuffer) {
      this._responseBuffer = [];
    }
    this._responseBuffer.push(chunk);
  }

  logFinish() {
    this._latency = Date.now() - this._ts;
    this._reporter.emit('finish', this);
  }

  logStatus(code, message) {
    this._statusCode = code;
    this._statusMessage = message;
  }

  cleanup() {
    this._expired = true;
  }

  getCapturedRequest() {
    if (!this._requestBuffer) {
      return null;
    }
    return Buffer.concat(this._requestBuffer);
  }

  getCapturedResponse() {
    if (!this._responseBuffer) {
      return null;
    }
    return Buffer.concat(this._responseBuffer);
  }

  get id() {
    return this._id;
  }

  toJSON() {
    var token = url.parse(this._req.url);
    return {
      id: this._id,
      url: this._url,
      hostname: this._req.hostname || token.hostname,
      path: token.path,
      method: this._req.method,
      requestHeaders: this._requestHeaders,
      requestCaptured: this._requestBuffer != null,
      responseHeaders: this._responseHeaders,
      responseCaptured: this._responseBuffer != null,
      statusCode: this._statusCode,
      statusMessage: this._statusMessage,
      secure: this._req.connection.encrypted,
      latency: this._latency ? this._latency : null
    }
  }

}

class ConnectReport {

  constructor(req, id, hostname, port, reporter) {
    this._requestHeaders = req.headers;
    this._id = id;
    this._hostname = hostname;
    this._port = port;
    this._reporter = reporter;
    this._ts = Date.now();
  }

  logFinish() {
    this._latency = Date.now() - this._ts;
    this._status = 200;
    this._statusMesssage = 'OK';
    this._reporter.emit('finish', this);
  }

  logError() {
    this._latency = Date.now() - this._ts;
    this._status = 502;
    this._statusMesssage = 'Bad Gateway';
    this._reporter.emit('finish', this);
  }

  cleanup() {
    this._expired = true;
  }

  toJSON() {
    return {
      id: this._id,
      url: this._hostname + ':' + this._port,
      hostname: this._hostname,
      path: '/',
      method: 'CONNECT',
      requestHeaders: this._requestHeaders,
      responseHeaders: {},
      statusCode: this._status,
      statusMessage: this._statusMesssage || '',
      secure: false,
      latency: this._latency ? this._latency : null,
      expired: this._expired
    }
  }

}

class ProxyReporter extends EventEmitter {

  constructor() {
    super();
    this._reports = [];
  }

  create(url, req) {
    let report = new Report(uuid.v4(), url, req, this);
    this._reports.unshift(report);
    this.removeOldest();
    this.emit('create', report);
    return report;
  }

  createConnect(req, hostname, port) {
    let report = new ConnectReport(req, uuid.v4(), hostname, port, this);
    this._reports.unshift(report);
    this.removeOldest();
    this.emit('create', report);
    return report;
  }

  removeOldest() {
    while (this._reports.length > MAX_LENGTH) {
      let removed = this._reports.pop();
      removed.cleanup();
      this.emit('expired', removed);
    }
  }

  getReports() {
    return this._reports;
  }

}

module.exports = ProxyReporter;