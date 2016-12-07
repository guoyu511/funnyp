'use strict';

var DirectRule = require('./direct'),
  classes = new Map(),
  logger = require('log4js').getLogger('ProxyRules');

class ProxyRules {

  constructor(server, configs) {
    this._rules = [];
    this._direct = new DirectRule(server);
    for (let config of configs) {
      let ProxyRule = classes.get(config.type);
      this._rules.push(new ProxyRule(server, config));
    }
  }

  *[Symbol.iterator]() {
    for (let rule of this._rules) {
      yield rule;
    }
  }

  dispatch(req, res, report) {
    try {
      for (let rule of this) {
        if (rule.process(req, res, report)) {
          return;
        }
      }
      this._direct.process(req, res, report);
    } catch (e) {
      console.error(e.stack);
    }
  }

  static registerHandler(type, handler) {
    classes.set(type, handler);
  }

}

ProxyRules.registerHandler('file', require('./file'));
ProxyRules.registerHandler("redirect", require('./redirect'));
ProxyRules.registerHandler("reverse", require('./reverse'));
ProxyRules.registerHandler("direct", require('./direct'));

module.exports = ProxyRules;