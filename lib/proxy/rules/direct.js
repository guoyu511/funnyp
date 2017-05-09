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
      targetReq;
    ignoreHeaders.forEach((h) => delete nextHeaders[h]);
    options.headers = nextHeaders;
    req.hostname = token.hostname || host;
    targetReq = (secure ? https : http).request(options, (targetRes) => {
      res.writeHead(targetRes.statusCode, targetRes.headers);
      reporter && reporter.logStatus(targetRes.statusCode, targetRes.statusMessage);
      reporter && reporter.logResponseHeaders(targetRes.headers);
      targetRes.pipe(res);
      targetRes.on('data', (chunk) =>
        reporter && reporter.logResponseChunk(chunk)
      );
    });
    targetReq.on('error', (e) => {
      if (!res.headersSent) {
        res.writeHead(502, 'Bad Gateway');
        reporter && reporter.logStatus(502, 'Bad Gateway');
      }
      res.end();
      reporter && reporter.logFinish();
    });
    targetReq.setTimeout(reqTimeout, () => {
      res.writeHead(504, 'Gateway Timeout');
      reporter && reporter.logStatus(504, 'Gateway Timeout');
      targetReq.abort();
    });
    req.pipe(targetReq);
    req.on('data', (chunk) => reporter && reporter.logRequestChunk(chunk));
    res.on('finish', () => reporter && reporter.logFinish());
    return true;
  }

  get name() {
    return 'Direct';
  }

}

module.exports = DirectRule;