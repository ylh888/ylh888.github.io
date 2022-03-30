/*****************************************************************************\
********************************** V I D A ************************************
*******************************************************************************


a_cam2sound_1.js : 2020-10-29 Thu


  p5.vida 0.3.00a by Paweł Janicki, 2017-2019
    https://tetoki.eu/vida | https://paweljanicki.jp

*******************************************************************************

  VIDA by Paweł Janicki is licensed under a Creative Commons
  Attribution-ShareAlike 4.0 International License
  (http://creativecommons.org/licenses/by-sa/4.0/). Based on a work at:
  https://tetoki.eu.

*******************************************************************************

  VIDA is a simple library that adds camera (or video) based motion detection
  and blob tracking functionality to p5js.

  The library allows motion detection based on a static or progressive
  background; defining rectangular zones in the monitored image, inside which
  the occurrence of motion triggers the reaction of the program; detection of
  moving objects ("blobs") with unique index, position, mass, rectangle,
  approximated polygon.

  The main guidelines of the library are to maintain the code in a compact
  form, easy to modify, hack and rework.

  VIDA is a part of the Tetoki! project (https://tetoki.eu) and is developed
  thanks to substantial help and cooperation with the WRO Art Center
  (https://wrocenter.pl) and HAT Research Center
  (http://artandsciencestudies.com).

  Notes:

    [1] Limitations: of course, the use of the camera from within web browser
    is subject to various restrictions mainly related to security settings (in
    particular, browsers differ significantly in terms of enabling access to
    the video camera for webpages (eg p5js sketches) loaded from local media or
    from the network - in the last case it is also important if the connection
    uses the HTTPS protocol [or HTTP]). Therefore, if there are problems with
    access to the video camera from within a web browser, it is worth testing a
    different one. During developement, for on-the-fly checks, VIDA is mainly
    tested with Firefox, which by default allows you to access the video camera
    from files loaded from local media. VIDA itself does not impose any
    additional specific restrictions related to the type and parameters of the
    camera - any video camera working with p5js should work with the library.
    You can find valuable information on this topic at https://webrtc.org and
    in the documentation of the web browser you use.
    
    [2] Also it is worth remembering that blob detection is rather expensive
    computationally, so it's worth to stick to the lowest possible video
    resolutions if you plan to run your programs on the hardware, the
    performance you are not sure. The efficiency in processing video from a
    video camera and video files should be similar.

    [3] VIDA is using (with a few exceptions) normalized coords instead of
    pixel-based. Thus, the coordinates of the active zones, the location of
    detected moving objects (and some of their other parameters) are
    represented by floating point numbers within the range from 0.0 to 1.0. The
    use of normalized coordinates and parameters allows to manipulate the
    resolution of the image being processed (eg from a video camera) without
    having to change eg the position of active zones. analogously, data
    describing moving objects is easier to use, if their values are not related
    to any specific resolution expressed in pixels. Names of all normalized
    parameters are preceded by the prefix "norm". The upper left corner of the
    image has the coordinates [0.0, 0.0]. The bottom right corner of the image
    has the coordinates [1.0, 1.0].

                      [0.0, 0.0]
                      +------------------------------|
                      |              [0.5, 0.2]      |
                      |              +               |
                      |                              |
                      |      [0.25, 0.5]             |
                      |      +                       |
                      |                              |
                      |                   [0.7, 0.8] |
                      |                   +          |
                      |                              |
                      |------------------------------+
                                                     [1.0, 1.0]
                                                     
\*****************************************************************************/
// vignettes
// moving dots 0-horizontal 1-vertical 2-random 3-current mouse
// scan channels 4 -
let nVignettes = 4
let output = "";
let DEBUG = true;
let AUDIOOUT = true;

let osc, envelope, reverb;
let sample = 0;
let vignette = 0; // 0=horizontal 1=vertical 2=random 3= centre point
let samplingRateSlider, advanceRateSlider;
let nextSample = 0

let uw, uh, mw, mh //local area of interest window min/max w h
let lheight = 400 // height minus menu area at the bottom

let thispixel, x, y

let myOutput, vocoder // midi handlers

var myCapture, // camera
  myVida;    // VIDA

/*
  We will use the sound in this example (so remember to add the p5.Sound
  library to your project if you want to recreate this). This array will be
  used to store oscillators.
*/
var synth = [];

/*
  Here we are trying to get access to the camera.
*/
function initCaptureDevice() {
  try {
    myCapture = createCapture(VIDEO);
    myCapture.size(320, 240);
    myCapture.elt.setAttribute('playsinline', '');
    myCapture.hide();
    console.log(
      '[initCaptureDevice] capture ready. Resolution: ' +
      myCapture.width + ' ' + myCapture.height
    );
  } catch (_err) {
    console.log('[initCaptureDevice] capture error: ' + _err);
  }
}

function setup() {

  // Enable WebMidi.js and trigger the onWebMidiEnabled() function when ready.
  WebMidi.enable()
    .then(onWebMidiEnabled)
    .catch(err => alert(err));

  createCanvas(640, 520); // we need some space...
  initCaptureDevice(); // and access to the camera

  /*
    VIDA stuff. One parameter - the current sketch - should be passed to the
    class constructor (thanks to this you can use Vida e.g. in the instance
    mode).
  */
  myVida = new Vida(this); // create the object
  /*
    Turn on the progressive background mode.
  */
  myVida.progressiveBackgroundFlag = true;
  /*
    The value of the feedback for the procedure that calculates the background
    image in progressive mode. The value should be in the range from 0.0 to 1.0
    (float). Typical values of this variable are in the range between ~0.9 and
    ~0.98.
  */
  myVida.imageFilterFeedback = 0.92;
  /*
    The value of the threshold for the procedure that calculates the threshold
    image. The value should be in the range from 0.0 to 1.0 (float).
  */
  myVida.imageFilterThreshold = 0.15;
  /*
    You may need a horizontal image flip when working with the video camera.
    If you need a different kind of mirror, here are the possibilities:
      [your vida object].MIRROR_NONE
      [your vida object].MIRROR_VERTICAL
      [your vida object].MIRROR_HORIZONTAL
      [your vida object].MIRROR_BOTH
    The default value is MIRROR_NONE.
  */
  myVida.mirror = myVida.MIRROR_NONE;
  /*
    In order for VIDA to handle active zones (it doesn't by default), we set
    this flag.
  */
  myVida.handleActiveZonesFlag = true;
  /*
    If you want to change the default sensitivity of active zones, use this
    function. The value (floating point number in the range from 0.0 to 1.0)
    passed to the function determines the movement intensity threshold which
    must be exceeded to trigger the zone (so, higher the parameter value =
    lower the zone sensitivity).
  */
  myVida.setActiveZonesNormFillThreshold(0.02);
  /*
    Let's create several active zones. VIDA uses normalized (in the range from
    0.0 to 1.0) instead of pixel-based. Thanks to this, the position and size
    of the zones are independent of any eventual changes in the captured image
    resolution.
  */
  var padding = 0.07; var n = 5;
  var zoneWidth = 0.1; var zoneHeight = 0.5;
  var hOffset = (1.0 - (n * zoneWidth + (n - 1) * padding)) / 2.0;
  var vOffset = 0.25;
  for (var i = 0; i < n; i++) {
    /*
      addActiveZone function (which, of course, adds active zones to the VIDA
      object) comes in two versions:
        [your vida object].addActiveZone(
          _id, // zone's identifier (integer or string)
          _normX, _normY, _normW, _normH, // normalized (!) rectangle
          _onChangeCallbackFunction // callback function (triggered on change)
        );
      and
        [your vida object].addActiveZone(
          _id, // zone's identifier (integer or string)
          _normX, _normY, _normW, _normH // normalized (!) rectangle
        );
      If we use the first version, we should define the function that will be
      called after the zone status changes. E.g.
        function onActiveZoneChange(_vidaActiveZone) {
          console.log(
            'zone: ' + _vidaActiveZone.id +
            ' status: ' + _vidaActiveZone.isMovementDetectedFlag
          );
        }
      Then the addActiveZone call can look like this:
        [your vida object].addActiveZone(
          'an_id', // id
          0.33, 0.33, 0.33, 0.33, // big square on the center of the image
          onActiveZoneChange // callback function
        );
      Note: It is also worth mentioning here that if you want, you can delete a
            zone (or zones) with a specific identifier (id) at any time. To do
            this, use the removeActiveZone function:
              [your vida object].removeActiveZone(id);
      But this time we just want to create our own function drawing the zones
      and we will check their statuses manually, so we can opt out of defining
      the callback function, and we will use the second, simpler version of the
      addActiveZone function.
    */
    myVida.addActiveZone(
      i,
      hOffset + i * (zoneWidth + padding), vOffset, zoneWidth, zoneHeight,
    );
    /*
      For each active zone, we will also create a separate oscillator that we
      will mute/unmute depending on the state of the zone. We use the standard
      features of the p5.Sound library here: the following code just creates an
      oscillator that generates a sinusoidal waveform and places the oscillator
      in the synth array.
    */
    var osc = new p5.Oscillator();
    osc.setType('sine');
    /*
      Let's assume that each subsequent oscillator will play 4 halftones higher
      than the previous one (from the musical point of view, it does not make
      much sense, but it will be enough for the purposes of this example). If
      you do not take care of the music and the calculations below seem unclear
      to you, you can ignore this part or access additional information , e.g.
      here: https://en.wikipedia.org/wiki/MIDI_tuning_standard
    */
    osc.freq(440.0 * Math.pow(2.0, (60 + (i * 4) - 69.0) / 12.0));
    osc.amp(0.0); osc.start();
    synth[i] = osc;
  }

  yosc = new p5.SinOsc();
  envelope = new p5.Envelope();
  envelope.setADSR(0.01, 0.4, 2, 0.1);
  envelope.setRange(20, 0);
  yosc.start();
  yosc.amp(0);
  reverb = new p5.Reverb();
  reverb.process(yosc, 2, 3);

  samplingRateSlider = createSlider(30, 1000, 120, 30);
  samplingRateSlider.position(50, 505);
  samplingRateSlider.style('width', '100px');
  advanceRateSlider = createSlider(1, 60, 7);
  advanceRateSlider.position(160, 505);
  advanceRateSlider.style('width', '100px');

  let isMobile = {
    Android: function () {
      return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function () {
      return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function () {
      return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function () {
      return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function () {
      return navigator.userAgent.match(/IEMobile/i);
    },
    any: function () {
      return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
  };
  if (isMobile.any()) {
    ismobile = true
  } else {
    ismobile = false
  }

  windowResized()

  keyPressed();
  disableScroll();

  frameRate(30); // set framerate
}

function draw() {
  if (myCapture !== null && myCapture !== undefined) { // safety first
    background(100);
    /*
      Call VIDA update function, to which we pass the current video frame as a
      parameter. Usually this function is called in the draw loop (once per
      repetition).
    */
    myVida.update(myCapture);
    /*
      Now we can display images: source video (mirrored) and subsequent stages
      of image transformations made by VIDA.
    */
    image(myVida.currentImage, 0, 0);
    image(myVida.backgroundImage, 320, 0);
    image(myVida.differenceImage, 0, 240);
    image(myVida.thresholdImage, 320, 240);
    // let's also describe the displayed images
    // noStroke(); fill(255, 255, 255);
    // text('not you, I hear hue', 10, 15);
    // text('vida: progressive background image', 340, 20);
    // text('vida: difference image', 20, 260);
    // text('vida: threshold image', 340, 260);
    /*
      VIDA has two built-in versions of the function drawing active zones:
        [your vida object].drawActiveZones(x, y);
      and
        [your vida object].drawActiveZones(x, y, w, h);
      But we want to create our own drawing function, which at the same time
      will be used for the current handling of zones and reading their statuses
      (we must also remember about controlling the sound).
    */
    // defint size of the drawing
    var temp_drawing_w = width / 2; var temp_drawing_h = height / 2;
    // offset from the upper left corner
    var offset_x = 320; var offset_y = 240;
    // pixel-based zone's coords
    var temp_x, temp_y, temp_w, temp_h;
    push(); // store current drawing style and font
    translate(offset_x, offset_y); // translate coords
    // set text style and font
    textFont('Helvetica', 10); textAlign(LEFT, BOTTOM); textStyle(NORMAL);
    // let's iterate over all active zones
    for (var i = 0; i < myVida.activeZones.length; i++) {
      /*
        Having access directly to objects that store active zone data, we can
        read or modify the values of individual parameters. Here is a list of
        parameters to which we have access:
          normX, normY, normW, normH - normalized coordinates of the rectangle
        in which active zone is contained (bounding box); you can change these
        parameters if you want to move the zone or change it's size;
          isEnabledFlag - if you want to disable the processing of a given
        active zone without deleting it, this flag will definitely be useful to
        you; if it's value is "true", the zone will be tested, if the variable
        value is "false", the zone will not be tested;
          isMovementDetectedFlag - the value of this flag will be "true"
        if motion is detected within the zone; otherwise, the flag value will
        be "false";
          isChangedFlag - this flag will be set to "true" if the status (value
        of isMovementDetectedFlag) of the zone has changed in the current
        frame; otherwise, the flag value will be "false";
          changedTime, changedFrameCount  - the moment - expressed in
        milliseconds and frames - in which the zone has recently changed it's
        status (value of isMovementDetectedFlag);
          normFillFactor - ratio of the area of the zone in which movement was
        detected to the whole surface of the zone
          normFillThreshold - ratio of the area of the zone in which movement
        was detected to the total area of the zone required to be considered
        that there was a movement detected in the zone; you can modify this
        parameter if you need to be able to set the threshold of the zone
        individually (as opposed to function
        [your vida object].setActiveZonesNormFillThreshold(normVal); 
        which sets the threshold value globally for all zones);
          id - zone identifier (integer or string);
          onChange - a function that will be called when the zone changes status
        (when value of this.isMovementDetectedFlag will be changed); the object
        describing the current zone will be passed to the function as a
        parameter.
      */
      // read and convert norm coords to pixel-based
      temp_x = Math.floor(myVida.activeZones[i].normX * temp_drawing_w);
      temp_y = Math.floor(myVida.activeZones[i].normY * temp_drawing_h);
      temp_w = Math.floor(myVida.activeZones[i].normW * temp_drawing_w);
      temp_h = Math.floor(myVida.activeZones[i].normH * temp_drawing_h);
      // draw zone rect (filled if movement detected)
      strokeWeight(1);
      if (myVida.activeZones[i].isEnabledFlag) {
        stroke(255, 0, 0);
        if (myVida.activeZones[i].isMovementDetectedFlag) fill(255, 0, 0, 128);
        else noFill();
      }
      else {
        stroke(0, 0, 255);
        /*
          Theoretically, movement should not be detected within the excluded
          zone, but VIDA is still in the testing phase, so this line will be
          useful for testing purposes.
        */
        if (myVida.activeZones[i].isMovementDetectedFlag) fill(0, 0, 255, 128);
        else noFill();
      }
      // rect(temp_x, temp_y, temp_w, temp_h);
      // print id
      noStroke();
      // if (myVida.activeZones[i].isEnabledFlag) fill(255, 0, 0);
      // else fill(0, 0, 255);
      // text(myVida.activeZones[i].id, temp_x, temp_y - 1);
      /*
        Using the isChangedFlag flag is very important if we want to trigger an
        behavior only when the zone has changed status.
      */
      if (myVida.activeZones[i].isChangedFlag) {
        // print zone id and status to console ... 
        // console.log(
        //   'zone: ' + myVida.activeZones[i].id +
        //   ' status: ' + myVida.activeZones[i].isMovementDetectedFlag
        // );
        //... and use this information to control the sound.
        // synth[myVida.activeZones[i].id].amp(
        //   0.1 * myVida.activeZones[i].isMovementDetectedFlag
        // )
      }
    }
    pop(); // restore memorized drawing style and font

    ylhWork();
  }
  else {
    /*
      If there are problems with the capture device (it's a simple mechanism so
      not every problem with the camera will be detected, but it's better than
      nothing) we will change the background color to alarmistically red.
    */
    background(255, 0, 0);
  }
}

function ylhWork() {

  // draw area of interest
  let localw = floor(mw - uw) + 1
  let localh = floor(mh - uh) + 1
  strokeWeight(0.5)
  stroke(0, 100, 100)
  noFill()
  rect(uw, uh, localw, localh)

  if (millis() > nextSample) {
    nextSample = millis() + samplingRateSlider.value()
    sample += advanceRateSlider.value()
    sample = sample % (localw * localh)
    if (vignette === 0) { // horizontal 
      x = (sample % localw) + uw
      y = (sample / localw) + uh
    } else if (vignette === 1) { // vertical
      x = (sample / localh) + uw
      y = (sample % localh) + uh
    } else if (vignette === 2 ) { // random
      x = random(0, localw) + uw
      y = random(0, localh) + uh
    } else if (vignette === 3) {
      uw=0,uh=0,mw=320,mh=240
      x=320/2
      y=240/2
    }
    resample = true;
  }

  push();
  // let c = get(mouseX, mouseY)

  let idx = sample % (320 * 240)

  // follow the mouse if it is in view
  if (mouseX > uw && mouseX < mw && mouseY > uh && mouseY < mh) {
    x = mouseX
    y = mouseY
    sample = mouseX + mouseY * mw
  }

  if (resample) {
    thispixel = get(x, y)
  }

  // moving dot
  if(vignette===3) {
   stroke(250,250,0)
   noFill()
   circle(x,y,20)
   stroke(20,20,20)
   line (x-15,y,x+15,y)
   line (x,y-15,x,y+15)
  } else {
    stroke(20, 20, 200)
    fill(250, 250, 0)
    circle(x, y, 10)
  }

  // circle on left - vignette
  fill(200);
  noStroke()
  fill(color(thispixel));
  circle(20, height - 20, 30)

  // triangle on right - play/pause
  strokeWeight(2)
  if (AUDIOOUT) {
    fill(240, 20, 20)
    rect(width - 30, height - 28, 8, 22)
    rect(width - 16, height - 28, 8, 22)
  }
  else {
    noStroke()
    fill(0, 0, 200)
    triangle(width - 30, height - 30, width - 5, height - 18, width - 30, height - 6)
  }

  // let hueV = 30 + (int)(hue(thispixel) / 2.0);
  // let satV = (int)(saturation(thispixel) * 1.27);
  // let brightV = (int)(brightness(thispixel) * 1.27);

  let midiNum, vol

  if (false) {
    // "not you I hear hue" 
    noStroke(); fill(255, 255, 255);
    text('not you I hear hue', 10, 15);
    vol = map(brightness(thispixel), 0, 100, 0.1, 1);
    midiNum = map(hue(thispixel), 0, 360, 43, 96)
  }
  else {
    // "I hear light"
    noStroke(); fill(255, 255, 255);
    text('what I hear along the light gradient', 10, 15);
    vol = map(brightness(thispixel), 0, 100, 0.1, 1);
    vol = 1.1 - vol
    midiNum = map(brightness(thispixel), 1, 100, 43, 90)
  }


  if(vocoder) {
    // vocoder.playNote(midiNum)
    myOutput.channels[1].playNote(midiNum)
  }


  getAudioContext().resume();
  yosc.freq(midiToFreq(midiNum))
  //yosc.amp(vol)

  if (!AUDIOOUT) {
    yosc.freq(0)
  }

  envelope.setRange(vol, 0.1);
  envelope.play(yosc)


  textSize(12);
  fill(200, 100, 50);
  text("<-- click to change  midi#hue" + floor(midiNum), 50, height - 24)
  text("" + samplingRateSlider.value() + "ms", 156, height - 10)
  text("+" + advanceRateSlider.value(), 304, height - 10)

  if (DEBUG) {
    dline = "v=" + vignette + " x=" + floor(mouseX) + " y=" + floor(mouseY) + " w" + localw + " h" + localh + " c=" + thispixel
    if (AUDIOOUT) dline += " Audio On"
    if (ismobile) dline += " Mobile"
    text(dline, 50, height - 40);
  }
  pop()

}

//* disable mobile feature : no dragging mouse to set up smaller area of interest
function mousePressed() {
  if (ismobile) return;
  if (mouseY < lheight) {
    uw = mouseX
    uh = mouseY
    if(mw===uw) mw=uw+1
    if(mh===uh) mh=uh+1
  }
}

function mouseDragged() {
  if (ismobile) return;
  if (mouseY < lheight) {
    mw = mouseX
    mh = mouseY
    if(mw===uw) mw=uw+1
    if(mh===uh) mh=uh+1
  }
}

function mouseReleased() {
  if (ismobile) return;
  if (mouseY < lheight) {
    mw = mouseX
    mh = mouseY
    if (mw < uw) {
      swap(mw, uw)
    }
    if (mh < uh) {
      swap(mh, uh)
    }
    if(mw===uw) mw=uw+1
    if(mh===uh) mh=uh+1
  }
}
//*/

function swap(a, b) {
  let z
  z = a
  a = b
  b = z
}

function mouseClicked() {
  if (mouseX > 0 && mouseX < 40 && mouseY > lheight && mouseY < height) {
    nextVignette()
  }
  if (mouseX > (width - 40) && mouseX < width && mouseY > lheight && mouseY < height) {
    AUDIOOUT = !AUDIOOUT
  }
  return false
}

// take care of mobile sound
function touchStarted() {
  if (ismobile && mouseX > 0 && mouseX < 40 && mouseY > lheight && mouseY < height) {
    nextVignette()
  }
  if (ismobile && mouseX > (width - 40) && mouseX < width && mouseY > lheight && mouseY < height) {
    AUDIOOUT = !AUDIOOUT
  }

  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
  //return false // must not return false here or slider will not work
}

/*
function touchMoved() {
  if (!clicked && mouseX > 0 && mouseX < 40 && mouseY > lheight && mouseY < height) {
    nextVignette()
  }
  getAudioContext().resume();
  return false
}
//*/

/*
function touchEnded() {
  if (!clicked && mouseX > 0 && mouseX < 40 && mouseY > lheight && mouseY < height) {
    nextVignette()
  }
  return false
}
//*/


function nextVignette() {
  vignette = (vignette + 1) % nVignettes;
}

function windowResized() {
  resizeCanvas(360*2, 240*2+100);
  lheight = height - 60
  uw = uh = 0
  mw = 320
  mh = 240
  samplingRateSlider.position(50, height - 20);
  advanceRateSlider.position(200, height - 20);

}
function keyPressed() {
  if (keyCode === 32) {
    AUDIOOUT = !AUDIOOUT;
  } else if (keyCode === RIGHT_ARROW) {
  }
  return false
}
function disableScroll() {
  document.body.style.overflow = 'hidden';
  document.querySelector('html').scrollTop = window.scrollY;
}

function enableScroll() {
  document.body.style.overflow = null;
}


function onWebMidiEnabled() {

  // Check if at least one MIDI input is detected. If not, display warning and quit.
  if (WebMidi.inputs.length < 1) {
    alert("No MIDI inputs detected.");
    return;
  } else {
    if(WebMidi.inputs.length>0) {
    WebMidi.inputs.forEach( input => console.log("INPUT: " + input.manufacturer + "|" +input.name));
    }

    if(WebMidi.outputs.length>0) {
    WebMidi.outputs.forEach(output => console.log("OUTPUT: " + output.manufacturer + "|" + output.name));
    }
  }

  // Add a listener on all the MIDI inputs that are detected
  WebMidi.inputs.forEach(input => {

    // When a "note on" is received on MIDI channel 1, generate a random color start
    input.channels[1].addListener("noteon", function() {
      fill(random(255), random(255), random(255));
      //circle(random(width), random(height), 100);
    });

  });

  // const myOutput = WebMidi.getOutputByName("Arduino Leonardo");
  // myOutput = WebMidi.getOutputByName("IAC Driver Bus 1");
  // vocoder = myOutput.channels[11];
  // vocoder = WebMidi.outputs[0].channels[11]
  vocoder = WebMidi.outputs[0].channels[10]
  myOutput = WebMidi.outputs[0]

  //vocoder.playNote("C4");

  //vocoder.sendPitchBend(-0.5);

}


/* from Cam2Music in Processing
void draw() {

  int x = floor(random(width));
  int y = floor(random(height));

  // If value of trigger is equal to the computer clock and if not all
  // notes have been played yet, the next note gets triggered.
  if ((millis() > trigger) ) { // ) {

    video.read();
    opencv.loadImage(video);
    opencv.useColor();
    src = opencv.getSnapshot();
    image(src, 0, 0);
    loadPixels();
    color c = pixels[mouseY*width+mouseX];
    int hueV = 30 + (int)( hue(c)/2.0);
    int satV = (int) (saturation(c)*1.27);
    int brightV = (int) (brightness(c)*1.27);
    print(hueV);
    print(" ");
    print(satV);
    print(" ");
    println(brightV);

    int channel = 1;
    int pitch = 0 + floor(hueV/3);
    int velocity = 0 + floor( brightV/3);


    myBus.sendNoteOn(0, hueV, brightV); // Send a Midi noteOn
    myBus.sendNoteOn(1, satV, brightV); // Send a Midi noteOn
    delay(50);
    myBus.sendNoteOff(0, hueV, brightV); // Send a Midi nodeOff
    myBus.sendNoteOff(1, satV, brightV); // Send a Midi nodeOff

    int number = 0;
    int value = 90;

    myBus.sendControllerChange(channel, number, value); // Send a controllerChange
    //myBus.sendControllerChange(1, number, value); // Send a controllerChange

    // midiToFreq transforms the MIDI value into a frequency in Hz which we use
     //to control the triangle oscillator with an amplitute of 0.8
     triOsc.play(midiToFreq(midiSequence[note]), 0.8);
     //triOsc.play(midiToFreq(midiSequence[floor(redValue)%12]), 0.8);

     // The envelope gets triggered with the oscillator as input and the times and
     // levels we defined earlier
     env.play(triOsc, attackTime+redValue/100.0, sustainTime+greenValue/100.0, sustainLevel, releaseTime+blueValue/100.0);


    // Create the new trigger according to predefined durations and speed
    trigger = millis() + duration;

    // Advance by one note in the midiSequence;
    note++;

    // Loop the sequence
    if (note == 12) {
      note = 0;
    }
  }
}

//set up
let osc, envelope, reverb;

{
    osc = new p5.SinOsc();
    envelope = new p5.Env();
    envelope.setADSR(0.01, 0.4, 2, 0.1);
    envelope.setRange(20, 0);
    osc.start();
    osc.amp(0);
    reverb = new p5.Reverb();
    reverb.process(osc, 2, 1);
}

function notes(midiNum){
  osc.freq(midiToFreq(midiNum))
  envelope.play(osc)
}
*/