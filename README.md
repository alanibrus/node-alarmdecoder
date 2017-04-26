# node-alarmdecoder
Node.JS client for listening and parsing AlarmDecoder events over ser2sock.

Easily control and monitor DSC and Ademco / Honeywell Vista alarm systems with a PC, HA system, PLC or embedded device.

This project was created for my own purpose: monitoring and controlling my DSC home alarm system, paired with Raspberry PI and AlarmDecoder AD2PI.

AlarmDecoder products:
https://www.alarmdecoder.com/catalog/index.php

**Documentation is Work In Progress**

Installation
------------
```bash
npm install node-alarmdecoder
```

Usage
-----
AlarmDecoder emits 4 events:
* 'connected' - Successfully connected to AlarmDecoder ser2sock interface
* 'disconnected' - You shall know
* 'zoneChanged' - Zone status has been changed. Scroll down to output example. 
"state": 1 = movement started, door opened or there's a fire, 0 = movement stopped, door closed or no more fire, yay!
Example in case of Front Door is opened:
```json
{
  "zone": {
    "name": "Front Door",
    "type": "contact"
  },
  "state": 1
}
```
* 'keypadMessage' - Keypad message events / panel status bits. To be documented.

And currently one method:
* enterCode(code) - You can use this to arm/disarm your panel with the code specified

## Usage example
```javascript
const AlarmDecoder = require('node-alarmdecoder');
const myAlarm = new AlarmDecoder('alarmdecoder', 10000, {
  '00:01': {
    name: 'Front Door',
    type: 'contact'
  },
  '00:02': {
    name: 'Hallway',
    type: 'motion'
  },
  '00:03': {
    name: 'Livingroom',
    type: 'motion'
  },
  '00:04': {
    name: 'Yard door',
    type: 'contact'
  },
  '00:05': {
    name: 'Garage',
    type: 'fire'
  },
  // ... more zones
});

myAlarm.events.on('connected', () => console.log('connected'));
myAlarm.events.on('disconnected', () => console.log('disconnected'));
myAlarm.events.on('zoneChanged', (data) => console.log('zone Change', data));
myAlarm.events.on('keypadMessage', (data) => console.log('keypadMessage', data));
// myAlarm.enterCode('0000');
```
### Output of example
```
zone Change {
  zone: {
    name: 'Hallway',
    type: 'motion'
  },
  state: 1
} // movement in Hallway

keypadMessage { numeric: '000',
  bits:
   { Ready: false,
     'Armed Away': false,
     'Armed Home': false,
     'Backlight on': false,
     Programming: false,
     Beeps: 0,
     'Zone bypassed': 0,
     'AC power': true,
     'Chime enabled': false,
     'Alarm occured': false,
     'Alarm on': false,
     'Battery low': false,
     'Entry delay off': false,
     Fire: false,
     'System issue': false,
     'Watching perimeter': false,
     'Error report': false,
     'Device mode': 'DSC' },
    message: 'Secure System Before Arming' }

zone Change {
  zone: {
    name: 'Hallway',
    type: 'motion'
  },
  state: 0
} // no more movement in Hallway II

keypadMessage { numeric: '000',
  bits:
   { Ready: true,
     'Armed Away': false,
     'Armed Home': false,
     'Backlight on': false,
     Programming: false,
     Beeps: 0,
     'Zone bypassed': 0,
     'AC power': true,
     'Chime enabled': false,
     'Alarm occured': false,
     'Alarm on': false,
     'Battery low': false,
     'Entry delay off': false,
     Fire: false,
     'System issue': false,
     'Watching perimeter': false,
     'Error report': false,
     'Device mode': 'DSC' },
    message: 'System Is Ready To Arm' }

zone Change {
  zone: {
    name: 'Front Door',
    type: 'contact'
  },
  state: 1
} // front door opened
```
