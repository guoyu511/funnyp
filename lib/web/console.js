'use strict';

const EventEmitter = require('events');

const buffer = [];

class WebConsole extends EventEmitter {

  append(str) {
    buffer.push(str);
    this.emit('append', str);
    while (buffer.length > 50) {
      buffer.shift();
    }
  }

  get buffer() {
    return buffer;
  }

}

module.exports = new WebConsole;