'use strict';

var ProxyRule = require('./rule'),
  url = require('url'),
  http = require('http'),
  agent = require('../agent'),
  ignoreHeaders = ['prxoy-puthenticate',
    'proxy-Connection', 'transfer-encoding', 'upgrade'];

class DirectRule extends ProxyRule {

  constructor(server) {
    super(server, {
      regexp: '.*'
    });
  }

  response(req, res, reporter) {

    let token = url.parse(req.url),
      nextHeaders = Object.assign({}, req.headers),
      options = {
        port: token.port || 80,
        hostname: token.hostname,
        method: req.method,
        path: token.path,
        agent: agent
      },
      targetReq;
    ignoreHeaders.forEach((h) => delete nextHeaders[h]);
    options.headers = nextHeaders;
    req.hostname = token.hostname;
    reporter.logRequestHeaders(nextHeaders);
    req.on('data', (chunk) =>
      reporter.logRequestChunk(chunk));
    targetReq = http.request(options, (targetRes) => {
      res.writeHead(targetRes.statusCode, targetRes.headers);
      reporter.logStatus(targetRes.statusCode, targetRes.statusMessage);
      reporter.logResponseHeaders(targetRes.headers);
      targetRes.pipe(res);
      targetRes.on('data', (chunk) =>
        reporter.logResponseChunk(chunk));
    });
    targetReq.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(502, {
          'Content-Type': 'text/plain'
        });
      }
      res.end();
      reporter.logStatus(502, 'Bad Gateway');
    });
    req.pipe(targetReq);
    res.on('finish', () => reporter.logFinish());
  }

  get name() {
    return 'Direct';
  }

}

module.exports = DirectRule;