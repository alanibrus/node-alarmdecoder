# node-alarmdecoder
Node.JS client for listening and parsing AlarmDecoder events over ser2sock. Dependency-free.

Easily control and monitor DSC and Ademco / Honeywell Vista alarm systems with a PC, HA system, PLC or embedded device.

This project was originally created for my own purpose: monitoring and controlling my DSC home alarm system, paired with Raspberry PI and AlarmDecoder AD2PI.

AlarmDecoder products:
https://www.alarmdecoder.com/catalog/index.php

Installation
------------
```bash
npm install node-alarmdecoder
```

Usage
-----
```javascript
const alarmDecoder = require('node-alarmdecoder');
const myAlarm = new alarmDecoder(ip, port, zoneConfig);
```
Check example code below to understand zoneConfig.
If you run just `new alarmDecoder(ip, port)` without zone configuration, it will run in debug mode
and will help you to debug which expander and channel is used when you activate sensors (by moving around your house for example)

## Events

AlarmDecoder emits 4 events:
* 'connected' - Successfully connected to AlarmDecoder ser2sock interface
* 'disconnected' - You shall know
* 'zoneChanged' - Zone status has been changed (movement, door open/close, fire on/off)
* 'keypadMessage' - Keypad message events / panel status

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
  message: 'Secure System Before Arming', // System's message
  numeric: '000', //  Numeric Code: This number specifies which zone is affected by the message. For example, if this message is for CHECK ZONE 22 then the numeric code would be 022. Most of the time this is zero-padded base10, but there are rare occurrences where this may be base16, such as ECP bus failures.
  bits: {
    Ready: false, // Indicates if the panel is READY
    'Armed Away': false, // Indicates if the panel is ARMED AWAY
    'Armed Home': false, // Indicates if the panel is ARMED HOME
    'Backlight on': false, // Indicates if the keypad backlight is on
    Programming: false, // Indicates if the keypad is in programming mode
    Beeps: 0, // Number (1-7) indicating how many beeps are associated with the message
    'Zone bypassed': 0, // Indicates that a zone has been bypassed
    'AC power': true, // Indicates if the panel is on AC power
    'Chime enabled': false, // Indicates if the chime is enabled
    'Alarm occured': false, // Indicates that an alarm has occurred. This is sticky and will be cleared after a second disarm.
    'Alarm on': false, // Indicates that an alarm is currently sounding. This is cleared after the first disarm.
    'Battery low': false, // Indicates that the battery is low
    'Entry delay off': false, // Indicates that entry delay is off (ARMED INSTANT/MAX)
    Fire: false, // Indicates that there is a fire
    'System issue': false, // Indicates a system issue
    'Watching perimeter': false, // Indicates that the panel is only watching the perimeter (ARMED STAY/NIGHT)
    'Error report': false, // System specific bits. 4 bits packed into a HEX Nibble [0-9,A-F]
    'Device mode': 'DSC' // 'Ademco' or 'DSC' Mode
  }
}
```

## Methods

### sendKeys(string keys)
Send keys directly to alarm system.
`sendKeys('#')` will send only # to your alarm panel
`sendKeys('#5555')` will send #5555, in sequence (#, 5, 5, 5, 5) to your alarm panel

### enterCode(string code)
Just an convinient method.
You can use this to arm/disarm your panel with the code specified. enterCode('1234') sends keys #, 1, 2, 3, 4 to your alarm panel.

## Example code
```javascript
const alarmDecoder = require('node-alarmdecoder');
const config = {
  ip: '192.168.1.100',
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
      name: 'Yard door',
      type: 'contact'
    },
    '00:05': {
      name: 'Yard door 2',
      type: 'contact'
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
