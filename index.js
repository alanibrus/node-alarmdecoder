/**
 * 2017 Alan Ibrus (alanibrus@gmail.com)
 * https://alan.ibrus.ee/
 */

'use strict';
const net = require('net');
const EventEmitter = require('events');

class AlarmDecoder {
  constructor(ip, port, zoneConfig) {
    if (!zoneConfig || typeof zoneConfig !== 'object') {
      console.warn('No Zones configured, debug mode activated (listening to zones)');
      this.DEBUG_LISTEN_ZONES = true;
    }

    this.ip = ip || 'alarmdecoder';
    this.port = port || 10000;
    this.zones = zoneConfig;

    this.bits = {
      '1': 'Ready',
      '2': 'Armed Away',
      '3': 'Armed Home',
      '4': 'Backlight on',
      '5': 'Programming',
      '6': 'Beeps',
      '7': 'Zone bypassed',
      '8': 'AC power',
      '9': 'Chime enabled',
      '10': 'Alarm occured',
      '11': 'Alarm on',
      '12': 'Battery low',
      '13': 'Entry delay off',
      '14': 'Fire',
      '15': 'System issue',
      '16': 'Watching perimeter',
      '17': 'Error report',
      '18': 'Device mode'
    };

    this.bitStatus = {};
    for (let i in this.bits) {
      if (i === '6' || i === '7') {
        this.bitStatus[i] = 0;
      } else if (i === '18') {
        this.bitStatus[i] = '-';
      } else {
        this.bitStatus[i] = false;
      }
    }

    this.events = new EventEmitter();

    this.connect();
  }

  getBitStatus() {
    const data = {};
    for (let i in this.bits) {
      data[this.bits[i]] = this.bitStatus[i];
    }
    return data;
  }

  connect() {
    if (this.client) {
      this.client.destroy();
    }
    this.client = new net.Socket();
    this.client.connect(this.port, this.ip, () => {
      this.events.emit('connected');
    });

    let buffer = '';
    this.client.on('data', (data) => {
      let prev = 0;
      let next;

      data = data.toString('utf8');
      while ((next = data.indexOf('\n', prev)) > -1) {
        buffer += data.substring(prev, next);

        this.parseBuffer(buffer);

        buffer = '';
        prev = next + 1;
      }
      buffer += data.substring(prev);
    });

    this.client.on('close', () => this.onDisconnect());
  }

  onDisconnect() {
    this.client.destroy();
    this.events.emit('disconnected');
    setTimeout(this.connect.bind(this), 5000); // FIXME: configureable reconnect
  }

  parseBuffer(buffer) {
    if (buffer.substr(0, 4) === '!EXP') { // Zone changed
      // buffer = !EXP:00,07,01
      const zone = buffer.trim().split(':')[1].split(',');
      const expander = zone[0]; // 00-01
      const channel = zone[1]; // 01-08
      const status = zone[2]; // 00 = restored; 01 = faulted
      this.zoneChanged(expander, channel, status);
    } else {
      // buffer = [10000001000000000D--],000,[000200000000000000000000],"System Is       Ready To Arm    "
      if (buffer.indexOf('[') === 0 && buffer.indexOf(',') > -1) {
        const splitted = buffer.split(',');
        if (splitted.length <= 2) return; // FIXME: do something with unknown message

        // splitted[0] = bit field
        // splitted[1] = numeric code
        // splitted[2] = raw data
        // splitted[3] = keypad message

        // lets refresh all status bits:
        this.updateStatusBits(splitted[0]);

        this.keypadMessage(splitted[1], (splitted.length >= 3 ? splitted[3] : ''));
      }
    }
  }

  zoneChanged(expander, channel, status) {
    status = (status == '00' ? 0 : 1);
    if (this.zones && this.zones[expander + ':' + channel]) { // if we have this zone binded
      this.events.emit('zoneChanged', {
        zone: this.zones[expander + ':' + channel],
        state: (status == '00' ? 0 : 1)
      });
    }
    if (this.DEBUG_LISTEN_ZONES) {
      console.log('DEBUG: Zone changed: ' + JSON.stringify({ expander, channel, status }));
    }
  }

  updateStatusBits(bitField) {
    for (let i in this.bits) {
      if (i === '6' || i === '7') {
        this.bitStatus[i] = parseInt(bitField[i], 10);
      } else if (i === '18') {
        this.bitStatus[i] = (bitField[i] === 'D' ? 'DSC' : 'Ademco');
      } else {
        this.bitStatus[i] = (bitField[i] == '0' ? false : true);
      }
    }
  }

  keypadMessage(numeric, keypadMessage) {
    keypadMessage = keypadMessage || '';
    keypadMessage = keypadMessage.trim().replace(/\s\s+/g, ' ').replace(' "', '').replace('"', '');
    this.events.emit('keypadMessage', {
      numeric: numeric,
      bits: this.getBitStatus(),
      message: keypadMessage
    });
  }

  sendKeys(keys) {
    this.client.write(keys);
  }

  enterCode(code) {
    this.sendKeys('#' + code);
  }
}

module.exports = AlarmDecoder;
