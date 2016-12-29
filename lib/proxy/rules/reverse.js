'use strict';

var ProxyRule = require('./rule'),
  fs = require('fs'),
  path = require('path'),
  logger = require('log4js').getLogger('ReverseProxy'),
  http = require('http'),
  agent = require('../agent'),
  reqTimeout = 5000;

class ReverseRule extends ProxyRule {

  constructor(server, config) {
    super(server, config);
  }

  response(url, req, res, reporter) {
    let upstream = super.replaceWithRegExp(url, this._config['upstream']),
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
        agent : secure ? agent.https() : agent.http(),
        timeout : reqTimeout
      },
      targetReq;
    req.hostname = token.hostname;
    targetReq = http.request(options, (targetRes) => {
      res.writeHead(targetRes.statusCode, targetRes.headers);
      reporter.logStatus(targetRes.statusCode, targetRes.statusMessage);
      reporter.logResponseHeaders(targetRes.headers);
      targetRes.pipe(res);
      targetRes.on('data', (chunk) =>
        reporter.logResponseChunk(chunk));
    });
    targetReq.setTimeout(reqTimeout);
    targetReq.on('error', () => {
      if (!res.headersSent) {
        let headers = {
          'Content-Type': 'text/plain'
        };
        res.writeHead(502, 'Bad Gateway', headers);
        reporter.logResponseHeaders(headers);
      }
      res.end();
      reporter.logStatus(502, 'Bad Gateway');
      reporter.logFinish();
    });
    req.pipe(targetReq);
    res.on('finish', () => reporter.logFinish());
    logger.debug(`ProxyPass: ${upstream}`);
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