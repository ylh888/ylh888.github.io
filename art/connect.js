
"use strict";

const REPORT_MODE = 'Q'.charCodeAt(0);
const RUN_SENSACT = 'R'.charCodeAt(0);
const START_OF_SENSOR_DATA = 'S'.charCodeAt(0);
const START_OF_TRIGGER_BLOCK = 'T'.charCodeAt(0);
const REQUEST_TRIGGERS = 'U'.charCodeAt(0);
const GET_VERSION = 'V'.charCodeAt(0);
const MIN_COMMAND = 'Q'.charCodeAt(0);
const MAX_COMMAND = 'V'.charCodeAt(0);
const MOUSE_SPEED_DATA = 'Y'.charCodeAt(0);

// -- Data block separators -- //
const TRIGGER_START = 't'.charCodeAt(0);
const TRIGGER_END = 'z'.charCodeAt(0);
const END_OF_BLOCK = 'Z'.charCodeAt(0);

var NUMBER_MASK = 0x60;
var ID_MASK = 0x40;
var CONDITION_MASK = '0'.charCodeAt(0);
var BOOL_TRUE = 'p'.charCodeAt(0);
var BOOL_FALSE = 'q'.charCodeAt(0);

// Concatination for 2 Uint8Array structures.
//var concat = function (buffer1, buffer2) {
function localconcat(buffer1, buffer2) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp;
};

var connection = {
    connected: false,
    thePort: null,
    theReader: null,
    theWriter: null,
    version: null,

    isSupported: function () {
        return ("serial" in navigator);
    },

    open: async function () {
        const filters = [
            { usbVendorId: 0x2341, usbProductId: 0x8036 },
            { usbVendorId: 0x10c4, usbProductId: 0xea60 }
        ];
        this.thePort = await navigator.serial.requestPort();
        // this.thePort = await navigator.serial.requestPort(filters);
        //await this.thePort.open({ baudRate: 9600 });
        await this.thePort.open({ baudRate: 115200 });
        this.theReader = this.thePort.readable.getReader();
        this.theWriter = this.thePort.writable.getWriter();

        this.startReader();
        console.log("Open successful.");
        this.connected = true;
        return;
    },

    checkVersion: function () {
        this.version = null;
        this.sendCommand(GET_VERSION);
        let p1 = new Promise((resolve) => {
            setTimeout(
                () => { resolve(this.version); }, 1000);
        });
        return p1;
    },

    startReader: async function () {
        // var buffer = new Uint8Array();
        var buffer = ""
        // Listen to data coming from the serial device.
        let cnt = 0


        const decoder = new TextDecoder()

        try {
            while (true) {
                const { value, done } = await this.theReader.read();
                if (done) {
                    // Allow the serial port to be closed later.
                    this.theReader.releaseLock();
                    console.log("Reader cancelled.");
                    break;
                }
                // value is a Uint8Array.
                // console.log(value);
                // buffer = localconcat(buffer, value);
                // buffer += value
                /*
                if (cnt++ < 20)
                    console.log(value + " . " + decoder.decode(value))
                    */

                buffer = decoder.decode(value)
                console.log(buffer)
                let xd = parseInt(buffer)
                vl53dist = isNaN(xd) ? 0 : xd
                /*
                    for (let i = 0; i < buffer.length; i++) {
                        console.log(buffer.charCodeAt(i) + " " + buffer[i])
                    }
                    */

                // Look for end of response
                //console.log("Buffer:", buffer, "\n");

                //  console.log(buffer)

                /*
                if (buffer[buffer.length - 1] === END_OF_BLOCK) {
                    console.log("Buffer complete." + buffer);
                    //console.log(new TextDecoder().decode(buffer));
                    if (buffer[0] === GET_VERSION) {
                        this.processVersion(buffer);
                    } else if (buffer[0] === START_OF_TRIGGER_BLOCK) {
                        inputStream.init(buffer);
                        loadTriggers(inputStream);
                    }
                    buffer = new Uint8Array();
                }
                */
            }
            //   */
        } catch (e) {
            console.log("Read Error: " + e);
            this.close();
        }

        console.log("Read Exit");
    },

    processVersion: function (buffer) {
        var ver = buffer.slice(1, buffer.length - 1);
        this.version = new TextDecoder().decode(ver);
    },

    sendCommand: function (cmd) {
        console.log("Send command", cmd);
        var data = new Uint8Array([cmd]);
        this.write(data);
    },

    write: async function (data) {
        if (!this.connected) return;
        await this.theWriter.write(data);
    },

    close: async function () {
        console.log("Connection Close");
        if (!this.connected) return;
        try {
            await this.theReader.cancel();
            this.theReader.releaseLock();
            this.theWriter.releaseLock();
            await this.thePort.close();
        } catch (e) {
            console.log("Close error: " + e);
        }
        this.theReader = null;
        this.theWriter = null;
        this.thePort = null;
        this.version = null;
        this.connected = false;
        console.log("Port closed.");
    }
};

// === General Purpose Input Stream === //
var inputStream = {
    dataStream: null,  // A Uint8Array iterator.

    init: function (newData) {
        this.dataStream = newData.values();
    },

    getByte: function () {
        let tmp = this.dataStream.next().value;
        // Filter out newlines  and CR that may have been added for readability.
        while (tmp === 10 || tmp === 13) {
            tmp = this.dataStream.next();
        }
        return tmp;
    },

    // Read a number. Count is the byte-length of the number.
    getNum: function (count) {
        count = count * 2;  // Bytes to nibbles
        var value = 0;
        for (var i = 0; i < count; i++) {
            var tmp = this.getByte() - NUMBER_MASK;
            if (tmp < 0 || tmp > 15) {
                throw "Invalid Number";
            }
            value = (value << 4) + tmp;
        }
        return value;
    },

    getID: function (count) {
        var value = 0;
        for (var i = 0; i < count; i++) {
            var tmp = this.getByte() - ID_MASK;
            if (tmp < 0 || tmp > 15) {
                throw "Invalid ID";
            }
            value = (value << 4) + tmp;
        }
        return value;
    },

    getCondition: function () {
        var tmp = this.getByte();
        tmp -= '0'.charCodeAt(0);
        if (tmp >= 1 && tmp <= 3) return tmp;  // repeat off
        else if (tmp >= 5 && tmp <= 7) return tmp;  // repeat on
        else throw "Invalid condition";
    }
};

// === General Purpose Output Stream === //
var outputStream = {
    data: null,
    outputFunction: null,

    init: function (outFunc) {
        this.data = [];
        this.outputFunction = outFunc;
    },

    putByte: function (aByte) {
        this.data.push(aByte);
    },

    // Write a number.  
    putNum: function (n, length) {
        switch (length) { // Length is the number of bytes to send
            case 4:		 // All cases fall through
                this.putByte(((n >> 28) & 0xf) | NUMBER_MASK);
                this.putByte(((n >> 24) & 0xf) | NUMBER_MASK);
            case 3:
                this.putByte(((n >> 20) & 0xf) | NUMBER_MASK);
                this.putByte(((n >> 16) & 0xf) | NUMBER_MASK);
            case 2:
                this.putByte(((n >> 12) & 0xf) | NUMBER_MASK);
                this.putByte(((n >> 8) & 0xf) | NUMBER_MASK);
            case 1:
                this.putByte(((n >> 4) & 0xf) | NUMBER_MASK);
                this.putByte((n & 0xf) | NUMBER_MASK);
        }
    },

    putID: function (n, length) {
        switch (length) { // Length is the number of bytes to send
            case 2:
                this.putByte(((n >> 4) & 0xf) | ID_MASK);
            case 1:
                this.putByte((n & 0xf) | ID_MASK);
        }
    },

    putCondition: function (cond) {
        this.putByte(cond + CONDITION_MASK);
    },

    flush: function () {
        var output = new Uint8Array(this.data);
        this.outputFunction(output);
    }

};

