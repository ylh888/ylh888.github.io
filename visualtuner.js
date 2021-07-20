/*
visualtuner.js : 2021-07-16 Fri

vl53dist contains the frequency in this case

derived from vl53 distance sensor 'air' keyboard
tonerings.js : 2021-06-12 Sun
                                                     
*/

let nVignettes = 5
let nPalettes = 100 //70 or 360 HSL

let vignette = 3 // 0=x, 1=y, 2=random 3=grid 4=spiral

let output = ""
let dline = ""
let DEBUG = false;
let AUDIOOUT = true;
let ismobile = false;
let yosc, yosc1, yosc2, yosc3, osc, env, env1, env2, env3, reverb;
let sample;
let externalSlider, onScreenSlider, registerSlider, wavetableSlider;
let currentRegister = 0, currentWavetable = -1;
let nextSample = -1

let uw, uh, mw, mh //local area of interest window min/max w h
let lheight = 400 // height minus menu area at the bottom

let circleDim // size of each pot of the palette
let thispixel, x, y

let grid = []

var vl53dist = 0


let displayStyle = 2

//let tPos = [[2,0], [2,2], [0,3], [2,4], [2,6], [4,5], [6,6], [6,4], [8,3], [6,2], [6,0], [4,1]]
// let tPos = [[0, 2], [2, 2], [3, 0], [4, 2], [6, 2], [5, 4], [6, 6], [4, 6], [3, 8], [2, 6], [0, 6], [1, 4]]
// let Keys = ["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B"]
// octave starts with C
// piano key starts with A
let tPos = [[3, 8], [2, 6], [0, 6], [1, 4], [0, 2], [2, 2], [3, 0], [4, 2], [6, 2], [5, 4], [6, 6], [4, 6], [3, 8]]
let Keys = ["A", "A#/Bb", "B", "C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab"]


function calculateDim() {
  circleDim = floor(Math.pow(width * lheight / nPalettes, 0.5)) - 2
}
function calculateDim4Square() {
  let x = min(width, lheight)
  circleDim = floor(Math.pow(x * x / nPalettes, 0.5)) - 2
}

function setup() {

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
  }

  if (isMobile.any()) {
    ismobile = true
  } else {
    ismobile = false
  }

  createCanvas(windowWidth, windowHeight)


  yosc = new p5.Oscillator('sine');
  yosc1 = new p5.Oscillator('triangle')
  yosc2 = new p5.Oscillator('square')
  yosc3 = new p5.Oscillator('triangle')
  env = new p5.Envelope();
  env.setADSR(0.01, 0.4, 2, 0.1);
  env.setRange(20, 0);
  env1 = new p5.Envelope();
  env1.setADSR(0.01, 0.4, 2, 0.1);
  env1.setRange(20, 0);
  env2 = new p5.Envelope();
  env2.setADSR(0.01, 0.4, 2, 0.1);
  env2.setRange(20, 0);
  env3 = new p5.Envelope();
  env3.setADSR(0.01, 0.4, 2, 0.1);
  env3.setRange(20, 0);
  yosc.start();
  yosc.amp(0);
  yosc1.start();
  yosc1.amp(0);
  yosc2.start();
  yosc2.amp(0);
  yosc3.start();
  yosc3.amp(0);
  reverb = new p5.Reverb();
  /*
  reverb.process(yosc, 2, 1);
  reverb.process(yosc1, 2, 1);
  reverb.process(yosc2, 2, 1);
  //*/

  /*
    externalSlider = createSlider(0, 450, 0, 1);
    externalSlider.position(width * 0.125, (height / 4) * 3 + 20)
    externalSlider.style('width', '75%')
  */

  onScreenSlider = createSlider(0, 8800, 0, 1) // or use A: 4900, 1);
  onScreenSlider.position(width * 0.125, (height / 4) * 3)
  onScreenSlider.style('width', '75%')

  registerSlider = createSlider(1, 3, 2, 1) // or use A: 4900, 1);
  registerSlider.position(width * 0.125 + width * 0.75, (height / 4) * 3 + 20)
  registerSlider.style('width', '15%')

  wavetableSlider = createSlider(0, 7, 0, 1) // or use A: 4900, 1);
  wavetableSlider.position(width * 0.125, (height / 4) * 3 + 20)
  wavetableSlider.style('width', '50%')

  sample = width * 4;
  keyPressed()
  windowResized()

  disableScroll()


  if (connection.isSupported()) {
    console.log("Web Serial is supported")
    setTimeout(() => { connection.open() }, 2000)
  } else {
    console.log("Web Serial NOT supported")
  }


  frameRate(30); // set framerate

  grid = makeGrid(nPalettes)
}

function disableScroll() {
  document.body.style.overflow = 'hidden';
  document.querySelector('html').scrollTop = window.scrollY;
}

function enableScroll() {
  document.body.style.overflow = null;
}


async function showMessageBox(title, message, buttonList) {
  let p = new Promise(function (resolve, reject) {
    console.log(message)
    /*
      let box = document.getElementById("infoBox");
      let heading = document.getElementById("infoHeading");
      let content = document.getElementById("infoContent");
      var buttons = document.getElementById("infoButtons");
      
      heading.innerHTML = title;
      content.innerHTML = message;
      
      // Clear any old buttons
      while(buttons.firstChild) {
          buttons.removeChild(buttons.lastChild);
      }
      
      for (let b of buttonList) {
          let btn = document.createElement("input");
          btn.type = "button";
          btn.value = b;
          btn.onclick = function() {
              box.style.display = "none";
              resolve(b);
          }
          buttons.appendChild(btn);
      }
      box.style.display = "block";
      */
  });
  return p;
}

let nRes = 100.0
let nOct = nRes * 12
let oldfreq = 0, midinote = 0

function draw() {

  background(200)
  push()
  let ydim = 1

  stroke(50)
  strokeWeight(0.5)

  noStroke()

  let pos = onScreenSlider.value() // use position directly to calculate freq
  let freq
  let xd

  if (currentRegister != registerSlider.value()) {
    currentRegister = registerSlider.value()
    console.log("Cur R:" + currentRegister)
    xd = new Uint8Array(['$'.charCodeAt(0)]);
    connection.write(xd)
    xd = new Uint8Array(['R'.charCodeAt(0)]);
    connection.write(xd)
    xd = "" + (4 - currentRegister)
    xd = new Uint8Array([xd.charCodeAt(0)]);
    connection.write(xd)
  }
  if (currentWavetable != wavetableSlider.value()) {
    currentWavetable = wavetableSlider.value()
    console.log("Cur W:" + currentWavetable)
    
    xd = new Uint8Array(['$'.charCodeAt(0)]);
    connection.write(xd)
    xd = new Uint8Array(['W'.charCodeAt(0)]);
    connection.write(xd)
    xd = "" + currentWavetable
    xd = new Uint8Array([xd.charCodeAt(0)]);
    connection.write(xd)
  }
  // externalSlider.value(vl53dist)

  // console.log( vl53dist)

  let donotplay = false

  if (pos < 5) { // if onscreen slider is ~0 then use the external value
    freq = vl53dist
    if (freq < 30) freq = 30

    // re-assign pos according to freq; mapping to the 88 keys
    //pos = 49.0*nRes + Math.log2(freq/440.0) * 12.0 * nRes
    pos = 1 + 12 * Math.log2(freq / 27.5)
    pos = pos * nRes

  } else { // use onscreen slider's value
    freq = 440.0 * (2 ** ((pos - 49.0 * nRes) / (12.0 * nRes))) // A4 = 49th key
  }


  let xOct = Math.floor((pos + 850) / nOct)
  let xStep = Math.floor(pos / nRes) % 12
  let xRes = pos % nRes
  freq = Math.floor(freq * 100) / 100


  fill(140)
  textSize(12)
  text("Oct " + xOct, 50, height - 90)
  text("Key " + Keys[xRes < nRes / 2 ? (xStep + 11) % 12 : xStep], 50, height - 75)
  text("pos " + pos, 50, height - 60)
  text("hRes " + xRes, 50, height - 45)
  text("freq " + freq, 50, height - 30)
  text("input " + vl53dist, 50, height - 10)



  getAudioContext().resume();

  if (freq != oldfreq) {
    yosc.freq(freq)
    if (!AUDIOOUT) {
      yosc.freq(0)
    }

    env.setRange(1, 0.1);
    env.play(yosc)

    //*
    yosc1.freq(freq * 2)
    env1.setRange(0.5, 0.1);
    env1.play(yosc1)

    yosc2.freq(freq * 4)
    env2.setRange(0.4, 0.1);
    env2.play(yosc2)

    yosc3.freq(freq * 7)
    env3.setRange(0.4, 0.1);
    env3.play(yosc3) //*/
  }

  oldfreq = freq

  circleDim = width / 20
  let radius = width * 0.3

  let c1, c2, s1
  s1 = xRes / nRes
  c1 = (xStep + 1) % 12
  c2 = xStep % 12

  let tuner_diameter = width > height ? height * 0.85 : width * 0.85

  if (displayStyle == 2) {
    fill(220)
    translate(tuner_diameter / 2, tuner_diameter / 2)

    fill(160)
    textSize(tuner_diameter / 5)
    text(xOct, -tuner_diameter / 20, tuner_diameter / 15)

    rotate(PI * 3 / 4 - PI / 12) // rotates to start at 9 o'clock = Note A

    strokeWeight(1)
    stroke(160)
    let inner = tuner_diameter * 0.5
    let outter = tuner_diameter * 0.75
    noFill()
    circle(0, 0, inner)
    circle(0, 0, outter)

    fill(160)
    let hour_angle = 2 * PI / 12
    for (i = 0; i < 12; i++) {
      rotate(hour_angle)
      rect(inner / 2, 0, (outter - inner) / 2, 1) // clock mark
      push();
      translate(inner / 2, 0) // + (outter - inner)/6,0)
      rotate(-hour_angle * (i + 11) - PI)
      textSize(height / 50 + 4)
      text(Keys[(i + 11) % 12], 0, 0)
      pop();
    }
    rotate(hour_angle * (c1 + s1))
    noStroke()

    s1 = s1 >= 0.5 ? 0.99 - s1 : s1 //tuning: 0 closest; 0.5 farthest
    fill(s1 * 2 * 255, (1 - s1) * 255, 0)
    rect(inner / 2, 0, (outter - inner) / 2, 20)

  } else
    if (displayStyle == 1) {

      fill(220)
      translate(width / 2, height / 3)

      fill(160)
      textSize(height / 5)
      text(xOct, -height / 20, height / 15)

      rotate(PI * 3 / 4 - PI / 12) // rotates to start at 9 o'clock = Note A

      for (i = 0; i < 12; i++) {

        rotate(2 * PI / 12)

        fill(207)
        circle(radius, 0, circleDim * 2)

        if (i == c1) {
          fill(120, 160, 180)
          circle(radius, 0, circleDim * 3 * s1)
        } else if (i == c2) {
          fill(120, 160, 180)
          if (s1 != 1) circle(radius, 0, circleDim * 3 * (1 - s1))
        }

      }
    } else { // display style == 0

      fill(160)
      textSize(height / 5)
      text(xOct, width * 0.10, height * 0.45)

      fill(220)
      translate(width / 4, height / 5)

      tPos.forEach((c) => {
        circle(c[0] * circleDim, c[1] * circleDim, circleDim * 2)
      })
      let s
      s = xRes / nRes
      c = tPos[(xStep + 1) % 12]
      fill(207)
      circle(c[0] * circleDim, c[1] * circleDim, circleDim * 2)
      fill(120, 160, 180)
      circle(c[0] * circleDim, c[1] * circleDim, circleDim * 2 * s)

      s = 1 - s
      c = tPos[xStep % 12]
      fill(207)
      if (s > 0) circle(c[0] * circleDim, c[1] * circleDim, circleDim * 2)
      fill(120, 160, 180)
      circle(c[0] * circleDim, c[1] * circleDim, circleDim * 2 * s)
    }

  pop()

  return

  translate(width / 2, height / 2)
  let size = 5
  let last = [0, 0]
  ydim = 1
  grid.forEach((c) => {
    line(last[0] * size, last[1] * size, c[0] * size, c[1] * size)
    last = c
  })   //*/

  pop()

  background(200)

  // push()

  colorMode(HSB)

  noStroke()
  let idx = 0;

  calculateDim()

  if (vignette < 3) {

    for (let j = circleDim / 2 + 2; j < lheight; j += circleDim + 2) {
      for (let i = circleDim / 2 + 2; i < width; i += circleDim + 2) {
        fill((idx++ / nPalettes) * 360, 100, 100)
        circle(i, j, circleDim)
        if (idx >= nPalettes) break // 360
      }
      // lheight = (circleDim+2)*j
      if (idx >= nPalettes) break
    }
  } else if (vignette === 3) { //grid
    calculateDim4Square()
    push()
    translate(width / 2 - circleDim, lheight / 2 - 0.5 * circleDim)
    let adj = -6
    for (let idx = 0; idx < nPalettes; idx++) {
      fill((idx / nPalettes) * 360, 100, 100)
      circle(grid[idx][0] * (circleDim + adj), grid[idx][1] * (circleDim + adj), circleDim + adj)
    }
    pop()
  }
  else if (vignette === 4) {  //spiral
    push()
    for (let idx = 0; idx < nPalettes; idx++) {
      fill((idx / nPalettes) * 360, 100, 100)
      let xx = width / 2 + cos(idx / 2.5) * idx * circleDim / 18
      let yy = lheight / 2 + sin(idx / 2.5) * idx * circleDim / 18
      circle(xx, yy, circleDim)
    }
    pop()
  }
  // pop(); // restore memorized drawing style and font

  // draw area of interest
  let localw = floor(mw - uw) + 1
  let localh = floor(mh - uh) + 1
  strokeWeight(0.5)
  stroke(0, 100, 100)
  noFill()
  rect(uw, uh, localw, localh)

  let resample = false

  colorMode(RGB)

  if (millis() > nextSample) {
    nextSample = millis() + 100 // externalSlider.value()
    sample += onScreenSlider.value()
    sample = sample % (localw * localh)
    if (vignette === 0) { // horizontal 
      x = (sample % localw) + uw
      y = (sample / localw) + uh
    } else if (vignette === 1) { // vertical
      x = (sample / localh) + uw
      y = (sample % localh) + uh
    } else if (vignette === 2 || vignette === 3 || vignette === 4) {
      x = random(0, localw) + uw
      y = random(0, localh) + uh
    }
    resample = true;
  }

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
  stroke(20, 20, 200)
  fill(250, 250, 0)
  circle(x, y, 15)

  let hueV = 30 + (int)(hue(thispixel) / 2.0);
  let satV = (int)(saturation(thispixel) * 1.27);
  let brightV = (int)(brightness(thispixel) * 1.27);


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

  // circle(width - 20, height - 20, 30)
  noStroke()


  let midiNum = map(hue(thispixel), 0, 359, 40, 110)
  getAudioContext().resume();

  yosc.freq(midiToFreq(midiNum))
  if (!AUDIOOUT) {
    yosc.freq(0)
  }
  env.setRange(1, 0.1);
  env.play(yosc)

  textSize(12);
  fill(200, 100, 50);
  text("<-- click to change  midi#hue" + floor(midiNum), 50, height - 24)
  // text("" + externalSlider.value() + "ms", 156, height - 10)
  text("+" + onScreenSlider.value(), 304, height - 10)

  if (DEBUG) {
    dline = " x=" + floor(mouseX) + " y=" + floor(mouseY) + " w" + localw + " h" + localh + " c=" + thispixel
    if (AUDIOOUT) dline += " Audio On"
    if (ismobile) dline += " Mobile"
    text(dline, 50, height - 40);
  }

  // image (pg,0,0)
}

//* disable mobile feature : no dragging mouse to set up smaller area of interest
function mousePressed() {
  if (ismobile) return;
  if (mouseY < lheight) {
    uw = mw = mouseX
    uh = mh = mouseY
  }
}

function mouseDragged() {
  if (ismobile) return;
  if (mouseY < lheight) {
    mw = mouseX
    mh = mouseY
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
  resizeCanvas(windowWidth, windowHeight);
  lheight = height - 60
  uw = uh = 0
  mw = width
  mh = lheight
  calculateDim()
  // externalSlider.position(width * 0.125, (height / 4) * 3 + 20)
  onScreenSlider.position(width * 0.075, (height / 4) * 3)
  wavetableSlider.position(width * 0.075, (height / 4) * 3 + 20)
  registerSlider.position(width * 0.075 + width * 0.60, (height / 4) * 3 + 20)
}

function keyPressed() {
  if (keyCode === 32) {
    AUDIOOUT = !AUDIOOUT;
  } else if (keyCode === RIGHT_ARROW) {
  }
  return false
}


// makeGrid (#points) : 2020-11-02 Mon : spiral square
// see Notes:p5.js walk the grid for drawing of algorithm's development
function makeGrid(max) {
  let step = 1, cnt = 0
  let x = 0, y = 0
  let lastx = 0, lasty = 0
  let g = [[0, 0]]

  while (true) {
    for (let k = 1; k <= 2; k++) {
      let sign = Math.pow(-1, k)
      for (let i = 0; i < x; i++) {
        lastx = lastx + sign
        g.push([lastx, lasty])
        if (++cnt >= max) break
      }
      if (cnt > max) break
      for (let j = 0; j < y; j++) {
        lasty = lasty + sign
        g.push([lastx, lasty])
        if (++cnt >= max) break
      }
      x = y = step++

      if (cnt >= max) break
    }
    if (cnt >= max) break
  }
  return g
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

     // The env gets triggered with the oscillator as input and the times and
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
let osc, env, reverb;

{
    osc = new p5.SinOsc();
    env = new p5.Envelope();
    env.setADSR(0.01, 0.4, 2, 0.1);
    env.setRange(20, 0);
    osc.start();
    osc.amp(0);
    reverb = new p5.Reverb();
    reverb.process(osc, 2, 1);
}

function notes(midiNum){
  osc.freq(midiToFreq(midiNum))
  env.play(osc)
}
*/