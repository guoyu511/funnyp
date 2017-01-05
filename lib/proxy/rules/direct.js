'use strict';

var ProxyRule = require('./rule'),
  http = require('http'),
  https = require('https'),
  agent = require('../agent'),
  ignoreHeaders = ['prxoy-puthenticate',
    'proxy-Connection', 'transfer-encoding', 'upgrade'],
  reqTimeout = 10 * 1000;

class DirectRule extends ProxyRule {

  constructor(server, config) {
    super(server, config);
  }

  response(url, req, res, reporter) {
    let token = require('url').parse(url),
      secure = token.protocol == 'https:',
      nextHeaders = Object.assign({}, req.headers),
      options = {
        port: token.port || (secure ? 443 : 80),
        hostname: token.hostname,
        method: req.method,
        path: token.path,
        agent: secure ? agent.https() : agent.http()
      },
      targetReq,
      targetReqTimeout = setTimeout(() => {
        targetReq.abort();
      }, reqTimeout);
    ignoreHeaders.forEach((h) => delete nextHeaders[h]);
    options.headers = nextHeaders;
    req.hostname = token.hostname || host;
    targetReq = (secure ? https : http).request(options, (targetRes) => {
      clearTimeout(targetReqTimeout);
      res.writeHead(targetRes.statusCode, targetRes.headers);
      reporter.logStatus(targetRes.statusCode, targetRes.statusMessage);
      reporter.logResponseHeaders(targetRes.headers);
      targetRes.pipe(res);
      targetRes.on('data', (chunk) =>
        reporter.logResponseChunk(chunk));
    });
    targetReq.on('error', (e) => {
      clearTimeout(targetReqTimeout);
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
    req.on('data', (chunk) => reporter.logRequestChunk(chunk));
    res.on('finish', () => reporter.logFinish());
    return true;
  }

  get name() {
    return 'Direct';
  }

}

module.exports = DirectRule;