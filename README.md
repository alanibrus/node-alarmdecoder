# node-alarmdecoder
Node.JS client for listening and parsing AlarmDecoder events over ser2sock.

Easily control and monitor DSC and Ademco / Honeywell Vista alarm systems with a PC, HA system, PLC or embedded device.

This project was created for my own purpose: monitoring and controlling my DSC home alarm system, paired with Raspberry PI and AlarmDecoder AD2PI.

AlarmDecoder products:
https://www.alarmdecoder.com/catalog/index.php

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
* 'zoneChanged' - Zone status has been changed (movement, door open/close, fire on/off)
* 'keypadMessage' - Keypad message events / panel status

And one method:
* enterCode(code) - You can use this to arm/disarm your panel with the code specified

## Events

### zoneChanged(data)
```javascript
data = {
  zone: {
    name: 'Zone name',
    type: 'Zone type' // one of movement, contact, fire
  },
  state: 0/1 // 0 = closed (movement stopped, door closed, fire off), 1 = opened (movement began, door opened, fire on)
}
```

### keypadMessage(data)
```javascript
data = {
  message: 'Secure System Before Arming',
  numeric: '000', //  Numeric Code: This number specifies which zone is affected by the message. For example, if this message is for CHECK ZONE 22 then the numeric code would be 022. Most of the time this is zero-padded base10, but there are rare occurrences where this may be base16, such as ECP bus failures. 
  bits: {
    Ready: false,
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
    'Device mode': 'DSC'
  }
}
```

## Example code
```javascript
const AlarmDecoder = require('node-alarmdecoder');
const config = { 
  ip: 'alarmdecoder', 
  port: 10000,
  zones: {
    // 'expander:channel': { name: 'String', type: '{contact/motion/fire}' }
    '00:01': {
      name: 'Front Door',
      type: 'contact'
    },
    '00:02': {
      name: 'Hallway',
      type: 'motion'
    },
    '00:03': {
      name: 'Living room',
      type: 'motion'
    },
    '00:04': {
      name: 'Dining room',
      type: 'motion'
    },
    '00:05': {
      name: 'Yard door',
      type: 'contact'
    },
    '00:06': {
      name: 'Yard door 2',
      type: 'contact'
    },
    '00:07': {
      name: 'Hallway II',
      type: 'motion'
    }
  // ... more zones
  }
};

const myAlarm = new alarmDecoder(config.ip, config.port, config.zones);

myAlarm.events.on('connected', () => console.log('Connected'));
myAlarm.events.on('disconnected', () => console.log('Disconnected'));
myAlarm.events.on('zoneChanged', (data) => {
  if (data.zone.type === 'motion') {
    console.log('Movement' + (data.state ? '' : ' ended') + ' at ' + data.zone.name);
  } else if (data.zone.type === 'fire') {
    console.log('FIRE ' + (data.state ? 'ON' : 'OFF') + ' @ ' + data.zone.name);
  } else if (data.zone.type === 'contact') { 
    console.log(data.zone.name + (data.state ? ' opened' : ' closed'));
  }
});

let lastMsg = '';
myAlarm.events.on('keypadMessage', (data) => {
  let str = JSON.stringify(data);
  if (lastMsg !== str) { // log only changes
    lastMsg = str;
    console.log('Keypad: ' + data.message);
  }
});

// myAlarm.enterCode('0000');
```
### Output of example code
```
Keypad: System Is Ready To Arm
Movement at Hallway II
Keypad: Secure System Before Arming
Movement ended at Hallway II
Keypad: System Is Ready To Arm
Front Door opened
Keypad: Secure System Before Arming
Front Door Closed
Keypad: System Is Ready To Arm
// myAlarm.enterCode('0000');
Keypad: Exit Delay In Progress
Keypad: System Is Armed In Away Mode
// myAlarm.enterCode('0000');
Keypad: System Disarmed No Alarm Memory
Keypad: System Is Ready To Arm
```
