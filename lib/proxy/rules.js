/**
 * Created by guoyu on 15/11/9.
 */

'use strict';

var DirectHandler = require('./handler/direct'),
    matcherClasses = new Map(),
    handlerClasses = new Map();

class ProxyRule {

    constructor(matcher, handler) {
        this._matcher = matcher;
        this._handler = handler;
    }

    process(req, res) {
        if (!this._matcher.test(req)) {
            return false;
        }
        this._handler.process(req, res);
        return true;
    }

}

class ProxyRules {

    constructor (server, configs) {
        this._rules = [];
        this._default = new DirectHandler(server);
        for (let config of configs) {
            let Matcher = matcherClasses.get(config['matcher']['type']),
                Handler = handlerClasses.get(config['handler']['type']);
            this._rules.push(new ProxyRule(
                new Matcher(config['matcher']),
                new Handler(server, config['handler'])));
        }
    }

    dispatch (req, res) {
        for (let rule of this._rules) {
            if (rule.process(req, res)) {
                return;
            }
        }
        this._default.process(req, res);
    }

    static registerMatcher (type, matcher) {
        matcherClasses.set(type, matcher);
    }

    static registerHandler (type, handler) {
        handlerClasses.set(type, handler);
    }

}

module.exports = ProxyRules;