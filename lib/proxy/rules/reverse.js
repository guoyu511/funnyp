'use strict';

const ProxyRule = require('./rule'),
  fs = require('fs'),
  path = require('path'),
  http = require('http'),
  agent = require('../agent'),
  reqTimeout = 5000;

class ReverseRule extends ProxyRule {

  constructor(server, config) {
    super(server, config);
  }

  response(url, req, res, reporter) {
    let upstream = super.replaceWithRegExp(url.href, this._config['upstream']),
      token = require('url').parse(upstream),
      secure = token.protocol == 'https:',
      options = {
        protocol: token.protocol,
        port: token.port || (secure ? 443 : 80),
        hostname: token.hostname,
        method: req.method,
        path: token.path,
        headers: Object.assign({
          'X-Forwarded-For': req.socket.remoteAddress
        }, req.headers, this.overrideHeaders()),
        agent: secure ? agent.https() : agent.http(),
        timeout: reqTimeout
      },
      targetReq;
    targetReq = http.request(options, (targetRes) => {
      res.writeHead(targetRes.statusCode, targetRes.headers);
      reporter.logStatus(targetRes.statusCode, targetRes.statusMessage);
      reporter.logResponseHeaders(targetRes.headers);
      targetRes.pipe(res);
      targetRes.on('data', (chunk) =>
        reporter.logResponseChunk(chunk));
    });
    targetReq.on('error', (e) => {
      this.logger.error(e);
      if (!res.headersSent) {
        res.writeHead(502, 'Bad Gateway');
        reporter.logStatus(502, 'Bad Gateway');
      }
      res.end();
      reporter.logFinish();
    });
    targetReq.setTimeout(reqTimeout, () => {
      res.writeHead(504, 'Gateway Timeout');
      reporter.logStatus(504, 'Gateway Timeout');
      targetReq.abort();
    });
    req.pipe(targetReq);
    req.on('data', (chunk) => reporter.logRequestChunk(chunk));
    res.on('finish', () => reporter.logFinish());
    this.logger.debug(`ProxyPass: ${url.href} to ${upstream}`);
    return true;
  }

  overrideHeaders() {
    if (!this._config['override']) {
      return {};
    }
    if (!this._config['headers']) {
      return {};
    }
    let headers = {};
    for (let header of this._config['headers']) {
      headers[header['name']] = header['value'] || '';
    }
    return headers;
  }

  get name() {
    return 'ReverseProxy';
  }

}

module.exports = ReverseRule;