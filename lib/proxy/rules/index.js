/**
 * Created by guoyu on 15/11/9.
 */

'use strict';

var DirectRule = require('./direct'),
    classes = new Map(),
    logger = require('log4js').getLogger('ProxyRules');

class ProxyRules {

    constructor (server, configs) {
        this._rules = [];
        this._direct = new DirectRule(server);
        for (let config of configs) {
            let ProxyRule = classes.get(config.type);
            this._rules.push(new ProxyRule(server, config));
        }
    }

    *[Symbol.iterator] () {
        for (let rule of this._rules) {
            yield rule;
        }
    }

    dispatch (req, res) {
        try {
            for (let rule of this) {
                if (rule.process(req, res)) {
                    return;
                }
            }
            this._direct.process(req, res);
        } catch (e) {
            console.error(e.stack);
        }
    }

    static registerHandler (type, handler) {
        classes.set(type, handler);
    }

}

ProxyRules.registerHandler('file', require('./file'));
ProxyRules.registerHandler("direct", require('./direct'));

module.exports = ProxyRules;