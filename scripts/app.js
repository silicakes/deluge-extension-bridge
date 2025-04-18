/** @type {MIDIAccess} */
let midi = null;
/** @type {MIDIInput} */
let delugeIn = null;
/** @type {MIDIOutput} */
let delugeOut = null;
let theInterval = null;
let debugInterval = null;
let monitorModeActive = false;
let autoConnectEnabled = true; // Default state for auto-connect toggle
let isFullscreenActive = false; // Track fullscreen state
let previousPixelWidth = 0;  // Store previous pixel width before fullscreen
let previousPixelHeight = 0; // Store previous pixel height before fullscreen
let lastOled = null;         // Store last OLED data for redrawing
let lastSevenSeg = null;     // Store last 7-segment data for redrawing
let lastDots = 0;            // Store last 7-segment dots for redrawing

let did_oled = false;

// Default OLED display settings
let displaySettings = {
  pixelWidth: 5,
  pixelHeight: 5,
  foregroundColor: "#eeeeee",
  backgroundColor: "#111111",
  resizeStep: 1,         // Step size for resizing (in pixels)
  minSize: 1,            // Minimum pixel size
  maxSize: 32,            // Maximum pixel size
  use7SegCustomColors: false // Added for 7-segment custom colors
};

// Add fullscreen settings to track state
let fullscreenSettings = {
  active: false,
  pixelWidth: 0,
  pixelHeight: 0,
  previousPixelWidth: 0,
  previousPixelHeight: 0
};

function $(name) {
  return document.getElementById(name)
}

function setstatus(text) {
  const midiStatus = $("midiStatus");
  midiStatus.innerText = text;
  
  // Remove any existing status classes
  midiStatus.classList.remove('connected', 'error');
  
  // Add appropriate class based on status text
  if (text === "webmidi ready") {
    midiStatus.classList.add('connected');
  } else if (text.includes("Failed") || text.includes("unavailable") || text.includes("error")) {
    midiStatus.classList.add('error');
  }
}

function setInput(input) {
  if (delugeIn == input) {
    return;
  }
  if (delugeIn != null) {
    delugeIn.removeEventListener("midimessage", handleData);
  }
  delugeIn = input;
  if (input != null) {
    input.addEventListener("midimessage", handleData);
  }
}

function populateDevices() {
  for (const entry of midi.inputs) {
    const port = entry[1];
    const opt = new Option(port.name, port.id);
    $("chooseIn").appendChild(opt);
    if (port.name.includes("Deluge Port 3") && autoConnectEnabled) {
      opt.selected = true;
      setInput(port);
    }
  }
  for (const entry of midi.outputs) {
    const port = entry[1];
    const opt = new Option(port.name, port.id);
    $("chooseOut").appendChild(opt);
    if (port.name.includes("Deluge Port 3") && autoConnectEnabled) {
      opt.selected = true;
      delugeOut = port;
    }
  }
}

function onChangeIn(ev) {
  const id = ev.target.value;
  setInput(midi.inputs.get(id))
}

function onChangeOut(ev) {
  const id = ev.target.value;
  console.log("choose the id:" + id)
  delugeOut = midi.outputs.get(id) || null;
  console.log("choose the port:" + delugeOut)
}

function onStateChange(ev) {
  const port = ev.port;
  const delet = (port.state == "disconnected");
  if (port.type == "input") {
    let found = false;
    let children = $("chooseIn").childNodes;
    for (let i=0; i < children.length; i++) {
      if (children[i].value == port.id) {
        found = true;
        if (delet) {
          children[i].remove();
          if (port == delugeIn) {
            $("noneInput").selected = true;
            // or maybe not, if id: are preserved during a disconnect/connect cycle
            setInput(null);
          }
          break;
        }
      }
    }
    if (!found && !delet) {
      const opt = new Option(port.name, port.id);
      $("chooseIn").appendChild(opt);
    }
  } else {
    let found = false;
    let children = $("chooseOut").childNodes;
    for (let i=0; i < children.length; i++) {
      if (children[i].value == port.id) {
        found = true;
        if (delet) {
          children[i].remove();
          if (port == delugeOut) {
            $("noneOutput").selected = true;
            // or maybe not, if id: are preserved during a disconnect/connect cycle
            delugeOut = null;
          }
          break;
        }
      }
    }
    if (!found && !delet) {
      const opt = new Option(port.name, port.id);
      $("chooseOut").appendChild(opt);
    }
  }
}

function onMIDISuccess(midiAccess) {
  setstatus("webmidi ready");
  midi = midiAccess;
  
  // Load auto-connect setting from localStorage
  const savedAutoConnect = localStorage.getItem('autoConnectEnabled');
  if (savedAutoConnect !== null) {
    autoConnectEnabled = (savedAutoConnect === 'true');
    $('autoConnectToggle').checked = autoConnectEnabled;
  }
  
  populateDevices();
  midi.addEventListener("statechange", onStateChange);
  
  // Add event listener to the auto-connect toggle
  $('autoConnectToggle').addEventListener('change', (event) => {
    autoConnectEnabled = event.target.checked;
    localStorage.setItem('autoConnectEnabled', autoConnectEnabled.toString());
  });
  
  // Automatically start monitoring if auto-connect is enabled
  if (autoConnectEnabled && delugeOut !== null && delugeIn !== null) {
    // Start monitoring UI changes automatically
    toggleMonitorMode();
  }
}

function onMIDIFailure(msg) {
  setstatus(`Failed to get MIDI access :( - ${msg}`);
}

window.addEventListener('load', function() {
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({ sysex: true }).then( onMIDISuccess, onMIDIFailure );
  } else {
    setstatus("webmidi unavailable, check browser permissions");
  }

  $("pingButton").addEventListener("click", pingTest)
  $("getOledButton").addEventListener("click", getOled)
  $("get7segButton").addEventListener("click", get7seg)
  $("flipButton").addEventListener("click", flipscreen)
  $("getDebugButton").addEventListener("click", getDebug)
  $("intervalButton").addEventListener("click", setRefresh)
  $("testDecodeButton").addEventListener("click", () => decode(testdata))
  $("test7segButton").addEventListener("click", () => draw7Seg([47,3,8,19], 3))
  $("clearDebugButton").addEventListener("click", clearDebug)
  $("autoDebugButton").addEventListener("click", toggleAutoDebug)
  $("getFeaturesButton").addEventListener("click", getFeatures)
  $("getVersionButton").addEventListener("click", getVersion)
  $("sendCustomButton").addEventListener("click", sendCustomSysEx)
  $("monitorModeButton").addEventListener("click", toggleMonitorMode)
  $("canvasIncreaseButton").addEventListener("click", increaseCanvasSize)
  $("canvasDecreaseButton").addEventListener("click", decreaseCanvasSize)
  $("fullscreenButton").addEventListener("click", toggleFullScreen)
  
  // Add input event listeners for OLED display settings
  $("pixelWidth").addEventListener("input", handleSettingChange)
  $("pixelHeight").addEventListener("input", handleSettingChange)
  $("foregroundColor").addEventListener("input", handleSettingChange)
  $("backgroundColor").addEventListener("input", handleSettingChange)
  $("use7SegCustomColors").addEventListener("change", handleSettingChange)
  
  // Debug drawer toggle buttons
  $("toggleDebugDrawerButton").addEventListener("click", toggleDebugDrawer)
  $("closeDebugDrawerButton").addEventListener("click", closeDebugDrawer)
  
  // Add document click listener to detect clicks outside the debug drawer
  document.addEventListener("click", handleClickOutside)

  $("chooseIn").addEventListener("change", onChangeIn)
  $("chooseOut").addEventListener("change", onChangeOut)
  
  // First load saved settings (if any)
  initDisplaySettings();
  
  // Then set initial canvas size based on current settings (loaded or defaults)
  initCanvasSize();
  
  // Setup fullscreen change event listener
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  
  // Add keyboard shortcut for fullscreen toggle
  document.addEventListener('keydown', handleKeyDown);
  
  return;
});

// Toggle debug drawer visibility
function toggleDebugDrawer() {
  const debugDrawer = $("debugDrawer");
  const settingsBtn = $("toggleDebugDrawerButton");
  
  debugDrawer.classList.toggle("visible");
  settingsBtn.classList.toggle("active");
}

// Close debug drawer
function closeDebugDrawer() {
  const debugDrawer = $("debugDrawer");
  const settingsBtn = $("toggleDebugDrawerButton");
  
  debugDrawer.classList.remove("visible");
  settingsBtn.classList.remove("active");
}

// Handle clicks outside the debug drawer
function handleClickOutside(event) {
  const debugDrawer = $("debugDrawer");
  const toggleButton = $("toggleDebugDrawerButton");
  
  // Only act if the drawer is currently visible
  if (debugDrawer.classList.contains("visible")) {
    // Check if the click is outside the drawer and not on the toggle button
    if (!debugDrawer.contains(event.target) && !toggleButton.contains(event.target)) {
      closeDebugDrawer();
    }
  }
}

function pingTest() {
    delugeOut.send([0xf0, 0x7d, 0x00, 0xf7]);
}

function oldCodes() {
   for (const entry of midi.inputs) {
    const input = entry[1];
    console.log(
      `Input port [type:'${input.type}']` +
        ` id:'${input.id}'` +
        ` manufacturer:'${input.manufacturer}'` +
        ` name:'${input.name}'` +
        ` version:'${input.version}'`,
    );
  }

  for (const entry of midi.outputs) {
    const output = entry[1];
    console.log(
      `Output port [type:'${output.type}'] id:'${output.id}' manufacturer:'${output.manufacturer}' name:'${output.name}' version:'${output.version}'`,
    );
  }
}

function getOled() {
    delugeOut.send([0xf0, 0x7d, 0x02, 0x00, 0x01, 0xf7]);
}

function get7seg() {
    delugeOut.send([0xf0, 0x7d, 0x02, 0x01, 0x00, 0xf7]);
}

function getDisplay(force) {
    delugeOut.send([0xf0, 0x7d, 0x02, 0x00, force ? 0x03 : 0x02, 0xf7]);
}

function getDebug() {
    delugeOut.send([0xf0, 0x7d, 0x03, 0x00, 0x01, 0xf7]);
    addDebugMessage("Requested debug messages from device");
}

function getFeatures() {
    // Request community features status
    addDebugMessage("Requesting community features status...");
    delugeOut.send([0xf0, 0x7d, 0x03, 0x01, 0x01, 0xf7]);
}

function getVersion() {
    // Request firmware version
    addDebugMessage("Requesting firmware version...");
    delugeOut.send([0xf0, 0x7d, 0x03, 0x02, 0x01, 0xf7]);
}

function sendCustomSysEx() {
    const customCmd = $('customSysExInput').value;
    
    if (!customCmd.trim()) {
        addDebugMessage("ERROR: Please enter a valid SysEx command");
        return;
    }
    
    try {
        // Parse hex string into bytes
        const parts = customCmd.trim().split(/\s+/);
        const bytes = parts.map(p => parseInt(p, 16));
        
        if (bytes.some(isNaN)) {
            throw new Error("Invalid hex values");
        }
        
        // Ensure it starts with F0 and ends with F7
        if (bytes[0] !== 0xF0 || bytes[bytes.length - 1] !== 0xF7) {
            throw new Error("SysEx must start with F0 and end with F7");
        }
        
        addDebugMessage(`Sending custom SysEx: ${customCmd}`);
        delugeOut.send(bytes);
    } catch (e) {
        addDebugMessage(`ERROR: ${e.message}`);
    }
}

function addDebugMessage(message) {
    const timestamp = new Date().toLocaleTimeString();
    const debugOutput = $('debugOutput');
    debugOutput.insertAdjacentHTML('beforeend', `[${timestamp}] ${message}<br>`);
    scrollDebugToBottom();
}

function clearDebug() {
    $('debugOutput').innerHTML = '';
}

function toggleAutoDebug() {
    const btn = $('autoDebugButton');
    
    if (debugInterval) {
        clearInterval(debugInterval);
        debugInterval = null;
        btn.textContent = 'Auto Debug';
        btn.classList.remove('active');
    } else {
        debugInterval = setInterval(getDebug, 1000); // Request debug every second
        btn.textContent = 'Stop Auto Debug';
        btn.classList.add('active');
    }
}

function scrollDebugToBottom() {
    const debugOutput = $('debugOutput');
    debugOutput.scrollTop = debugOutput.scrollHeight;
}

function flipscreen() {
    delugeOut.send([0xf0, 0x7d, 0x02, 0x00, 0x04, 0xf7]);
    addDebugMessage("Display orientation flipped");
}

function setRefresh() {
  const btn = $('intervalButton');
  
  if (theInterval != null) {
    clearInterval(theInterval);
    theInterval = null;
    btn.textContent = 'Refresh';
    btn.classList.remove('active');
  } else {
    theInterval = setInterval(function() { getDisplay(false); }, 1000);
    getDisplay(true);
    btn.textContent = 'Pause';
    btn.classList.add('active');
  }
}

let lastmsg

/** @param {MIDIMessageEvent} msg */
function handleData(msg) {
  lastmsg = msg
  window.lastmsg = msg
  // console.log(msg.data);
  if (msg.data.length > 8) {
    $("dataLog").innerText = "size: " + msg.data.length
  }
  decode(msg.data)
}

/** @param {Uint8Array} data */
function decode(data) {
  if (data.length < 3 || data[0] != 0xf0 || data[1] != 0x7d) {
    console.log("foreign sysex?")
    return;
  }

  if (data.length >= 5 && data[2] == 0x02 && data[3] == 0x40) {
    // console.log("found OLED!")

    if (data[4] == 1) {
      drawOled(data)
    } else if (data[4] == 2) {
      drawOledDelta(data)
    } else {
      console.log("DO NOT DO THAT")
    }

  } else if (data.length >= 5 && data[2] == 0x02 && data[3] == 0x41) {
    console.log("found 7seg!")

    if (data[4] != 0) {
      console.log("DO NOT DO THAT")
      return;
    }

    draw7Seg(data.subarray(7,11), data[6])
  } else if (data.length >= 5 && data[2] == 0x03 && data[3] == 0x40) {
    console.log("found debug!")
    // data[4]: unused category

    let msgbuf = data.subarray(5, data.length-1);
    let message = new TextDecoder().decode(msgbuf)
    let timestamp = new Date().toLocaleTimeString();
    
    // Add timestamp to each line
    let chunks = message.split('\n')
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i].trim() !== '') {
        $('debugOutput').insertAdjacentText('beforeend', `[${timestamp}] ${chunks[i]}`);
        if (i < chunks.length-1) {
          $('debugOutput').insertAdjacentElement('beforeend', document.createElement("br"));
        }
      }
    }
    scrollDebugToBottom();
  } else if (data.length >= 5 && data[2] == 0x03 && data[3] == 0x01) {
    // Community features status response
    console.log("found features status!");
    
    let msgbuf = data.subarray(5, data.length-1);
    let message = new TextDecoder().decode(msgbuf);
    addDebugMessage(`FEATURES STATUS: ${message}`);
  } else if (data.length >= 5 && data[2] == 0x03 && data[3] == 0x02) {
    // Version information response
    console.log("found version info!");
    
    let msgbuf = data.subarray(5, data.length-1);
    let message = new TextDecoder().decode(msgbuf);
    addDebugMessage(`VERSION INFO: ${message}`);
  } else {
    // Unknown SysEx message
    let hexData = Array.from(data).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    addDebugMessage(`UNKNOWN SYSEX: ${hexData}`);
  }
}

let oledData = new Uint8Array(6*128);
let lastOledData = new Uint8Array(6*128);

function drawOled(data) {
  let packed = data.subarray(6,data.length-1)

  let unpacked;
  try {
    unpacked = unpack_7to8_rle(packed);
    console.log(`reset ${unpacked.length} as ${packed.length}`);
  } catch (e) {
      console.error("Failed to unpack OLED data:", e);
      addDebugMessage(`ERROR unpacking OLED: ${e.message}`)
      return; // Don't proceed if unpacking failed
  }

  if (unpacked.length == oledData.length) {
    oledData = unpacked;
  }
  drawOleddata(unpacked);
  detectScreenChanges();
}

function drawOledDelta(data) {
  let first = data[5];
  let len = data[6];
  let packed = data.subarray(7,data.length-1)
  //console.log("packed size "+ packed.length);

  let unpacked;
  try {
     unpacked = unpack_7to8_rle(packed);
     console.log(`first ${first}, len ${len}, delta size ${unpacked.length} as ${packed.length}`);
  } catch (e) {
      console.error("Failed to unpack OLED delta data:", e);
      addDebugMessage(`ERROR unpacking OLED delta: ${e.message}`)
      return; // Don't proceed if unpacking failed
  }

  oledData.subarray(8*first,8*(first+len)).set(unpacked)
  drawOleddata(oledData);
  detectScreenChanges();
}

let offx = 10;
let offy = 5;

function drawOleddata(data, customPixelWidth, customPixelHeight) {
  /** @type {CanvasRenderingContext2D} */
  let ctx = $("screenCanvas").getContext("2d");

  // Determine which pixel size to use
  let px_width, px_height;
  if (customPixelWidth !== undefined && customPixelHeight !== undefined) {
    // Explicit pixel sizes passed in
    px_width = customPixelWidth;
    px_height = customPixelHeight;
  } else if (fullscreenSettings.active) {
    // Use fullscreen settings if in fullscreen
    px_width = fullscreenSettings.pixelWidth;
    px_height = fullscreenSettings.pixelHeight;
  } else {
    // Use normal display settings
    px_width = displaySettings.pixelWidth;
    px_height = displaySettings.pixelHeight;
  }
  
  let indist = 0.5;
  let blk_width = 128;
  
  ctx.fillStyle = displaySettings.backgroundColor;
  ctx.fillRect(offx, offy, px_width*128, px_height*48);
  did_oled = true;

  ctx.fillStyle = displaySettings.foregroundColor;
  for (let blk = 0; blk < 6; blk++) {
    for (let rstride = 0; rstride < 8; rstride++) {
      let mask = 1 << (rstride);
      for (let j = 0; j < blk_width; j++) {
        if ((blk*blk_width+j) > data.length) {
          break;
        }
        let idata = (data[blk*blk_width+j] & mask);

        let y = blk*8 + rstride;

        if (idata > 0) {
          ctx.fillRect(offx+j*px_width+indist, offy+y*px_height+indist, 
                      px_width-2*indist, px_height-2*indist);
        }
      }
    }
  }
  
  // Store the last OLED data for later use
  lastOled = data;
}

function draw7Seg(digits, dots, customPixelWidth, customPixelHeight) {
  /** @type {CanvasRenderingContext2D} */
  let ctx = $("screenCanvas").getContext("2d");

  // Determine which pixel size to use
  let px_width, px_height;
  if (customPixelWidth !== undefined && customPixelHeight !== undefined) {
    // Explicit pixel sizes passed in
    px_width = customPixelWidth;
    px_height = customPixelHeight;
  } else if (fullscreenSettings.active) {
    // Use fullscreen settings if in fullscreen
    px_width = fullscreenSettings.pixelWidth;
    px_height = fullscreenSettings.pixelHeight;
  } else {
    // Use normal display settings
    px_width = displaySettings.pixelWidth;
    px_height = displaySettings.pixelHeight;
  }

  ctx.fillStyle = displaySettings.backgroundColor;
  if (did_oled) {
    // If we're switching from OLED to 7-segment, clear the previous display
    ctx.fillRect(offx, offy, px_width*128, px_height*48);
    did_oled = false;
  } else {
    // Otherwise, just clear the whole canvas
    ctx.fillRect(offx, offy, ctx.canvas.width - 2*offx, ctx.canvas.height - 2*offy);
  }

  // Use color settings for the 7-segment display
  // Default red LED-like colors, but allow for customization
  const activeColor = displaySettings.use7SegCustomColors ? displaySettings.foregroundColor : "#CC3333";
  const inactiveColor = displaySettings.use7SegCustomColors ? displaySettings.backgroundColor : "#331111";

  // Calculate dimensions based on pixel size
  const scale = Math.min(px_width, px_height) / 5;
  
  // Scale all dimensions proportionally
  const digit_height = 120 * scale;
  const digit_width = 60 * scale;
  const stroke_thick = 9 * scale;
  const half_height = digit_height / 2;
  const out_adj = 0.5 * scale;
  const in_adj = 1.5 * scale;
  const dot_size = 6.5 * scale;
  const digit_spacing = 13 * scale;

  let off_y = offy + 6 * scale;

  let topbot = [[out_adj,0],[stroke_thick+in_adj, stroke_thick],[digit_width-(stroke_thick+in_adj), stroke_thick], [digit_width-out_adj, 0]];
  let halfside = [[0,out_adj],[stroke_thick, stroke_thick+in_adj],[stroke_thick, half_height-stroke_thick*0.5-in_adj], [0, half_height-out_adj]];
  let h = half_height;
  let ht = stroke_thick;
  let hta = stroke_thick/2;
  let midline = [
    [out_adj,h],[ht,h-hta], [digit_width-ht,h-hta],
    [digit_width-out_adj, h], [digit_width-ht,h+hta], [ht,h+hta]
  ];

  for (let d = 0; d < 4; d++) {
    let digit = digits[d];
    let dot = (dots & (1 << d)) != 0;

    let off_x = offx + 8 * scale + (digit_spacing + digit_width) * d;

    for (let s = 0; s < 7; s++) {
      ctx.beginPath();
      let path;
      if (s == 0) { path = midline; }
      else if (s == 3 || s == 6) { path = topbot; }
      else  { path = halfside; }
      for (let i = 0; i < path.length; i++) {
        let c = path[i];
        if (s == 2 || s == 3 || s == 4 ) { c = [c[0], digit_height-c[1]]; } // flip horiz
        if (s == 4 || s == 5) { c = [digit_width-c[0], c[1]]; } // flip vert
        if (i == 0) {
          ctx.moveTo(off_x+c[0], off_y+c[1]);
        } else {
          ctx.lineTo(off_x+c[0], off_y+c[1]);
        }
      }

      ctx.closePath();

      if (digit & (1<<s)) { 
        ctx.fillStyle = activeColor;
      } else {
        ctx.fillStyle = inactiveColor;
      }
      ctx.fill();
    }

    // the dot
    ctx.beginPath();
    ctx.rect(off_x+digit_width+3*scale, off_y+digit_height+3*scale, dot_size, dot_size);
    if (dot) {
      ctx.fillStyle = activeColor;
    } else {
      ctx.fillStyle = inactiveColor;
    }
    ctx.fill();
  }
  
  // Store the last drawn state
  lastSevenSeg = digits;
  lastDots = dots;
}

let testdata = new Uint8Array([
    240, 125, 2, 64, 1, 0, 126, 127, 0, 102, 0, 66, 76, 71, 18, 44, 100, 0, 6, 8, 112, 36, 8, 6, 0, 126, 8, 16, 16, 32, 126, 0, 68, 2, 67, 126, 68, 2, 2, 0, 126, 70, 16, 67, 126, 126, 127, 0, 114, 0, 71, 64, 72, 0, 69, 124, 68, 108, 3, 124, 120, 68, 0, 67, 96, 69, 120, 70, 12, 69, 120, 57, 96, 0, 0, 112, 124, 27, 28, 124, 112, 0, 68, 0, 69, 124, 69, 76, 5, 124, 120, 48, 68, 0, 69, 124, 68, 12, 10, 28, 120, 112,
    68, 0, 20, 48, 120, 124, 108, 69, 76, 67, 0, 84, 0, 67, 96, 69, 120, 70, 12, 69, 120, 67, 96, 68, 0, 69, 124, 71, 76, 66, 12, 86, 0, 69, 124, 68, 12, 10, 28, 120, 112, 70, 0, 69, 124, 70, 108, 66, 12, 70, 0, 69, 124, 98, 0, 68, 7, 68, 6, 0, 7, 3, 70, 0, 68, 3, 70, 6, 68, 3, 12, 0, 4, 7, 3, 70, 1, 12, 3, 7, 4, 0, 68, 7, 28, 0, 1, 7, 6, 4, 68, 0, 68, 7, 68, 6, 4, 7, 3, 1,
    68, 0, 66, 2, 70, 6, 4, 7, 3, 1, 86, 0, 68, 3, 70, 6, 68, 3, 70, 0, 68, 7, 94, 0, 68, 7, 68, 6, 4, 7, 3, 1, 70, 0, 68, 7, 72, 6, 70, 0, 68, 7, 72, 6, 126, 98, 0, 247
]);

function toggleMonitorMode() {
  monitorModeActive = !monitorModeActive;
  const btn = $('monitorModeButton');
  
  if (monitorModeActive) {
    btn.textContent = 'Stop Monitoring';
    btn.classList.add('active');
    addDebugMessage("UI Monitor activated - watching for screen changes");
    
    // Take initial snapshot
    lastOledData = new Uint8Array(oledData);
    
    // Start a polling interval for the display if not already running
    if (!theInterval) {
      setRefresh();
    }
  } else {
    btn.textContent = 'Monitor';
    btn.classList.remove('active');
    addDebugMessage("UI Monitor deactivated");
  }
}

function detectScreenChanges() {
  if (!monitorModeActive) return;
  
  // Compare with last screen state
  let changedPixels = 0;
  let changedRegions = [];
  
  for (let blk = 0; blk < 6; blk++) {
    let blockHasChanges = false;
    let blockChangedPixels = 0;
    
    for (let j = 0; j < 128; j++) {
      if (oledData[blk*128+j] !== lastOledData[blk*128+j]) {
        changedPixels++;
        blockChangedPixels++;
        blockHasChanges = true;
      }
    }
    
    if (blockHasChanges) {
      changedRegions.push(`Block ${blk}: ${blockChangedPixels} pixels`);
    }
  }
  
  if (changedPixels > 0) {
    const now = new Date().toLocaleTimeString();
    addDebugMessage(`SCREEN CHANGE at ${now}: ${changedPixels} pixels changed (${changedRegions.join(', ')})`);
    
    // If there's a significant change (more than just a cursor blinking)
    if (changedPixels > 10) {
      // Try to detect specific UI elements
      detectUIElements();
    }
    
    // Update last screen state
    lastOledData = new Uint8Array(oledData);
  }
}

function detectUIElements() {
  // This is a placeholder for future implementation
  // Here you would analyze the screen to detect UI elements like:
  // - Menu items being highlighted
  // - Parameter values changing
  // - Mode indicators
  
  // For now, we'll focus on collecting data about screen changes
  
  // Example of what this could do in the future:
  // if (detectTextInRegion(oledData, "SYNTH", 0, 0, 32, 8)) {
  //   addDebugMessage("SYNTH mode detected");
  // }
}

// Initialize display settings controls with default values
function initDisplaySettings() {
  // Try to load saved settings from localStorage
  try {
    const savedSettings = localStorage.getItem('DExDisplaySettings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      // Update displaySettings with saved values
      displaySettings.pixelWidth = parsedSettings.pixelWidth || displaySettings.pixelWidth;
      displaySettings.pixelHeight = parsedSettings.pixelHeight || displaySettings.pixelHeight;
      displaySettings.foregroundColor = parsedSettings.foregroundColor || displaySettings.foregroundColor;
      displaySettings.backgroundColor = parsedSettings.backgroundColor || displaySettings.backgroundColor;
      displaySettings.use7SegCustomColors = parsedSettings.use7SegCustomColors || displaySettings.use7SegCustomColors;
      
      addDebugMessage("Loaded saved display settings");
    }
  } catch (error) {
    console.error("Error loading saved display settings:", error);
    addDebugMessage("Error loading saved settings, using defaults");
    // Continue with defaults if loading fails
  }
  
  // Update UI controls with current settings (either loaded or defaults)
  $("pixelWidth").value = displaySettings.pixelWidth;
  $("pixelHeight").value = displaySettings.pixelHeight;
  $("foregroundColor").value = displaySettings.foregroundColor;
  $("backgroundColor").value = displaySettings.backgroundColor;
  $("use7SegCustomColors").checked = displaySettings.use7SegCustomColors;
  
  // Initialize resize button states
  updateResizeButtonStates();
  
  // Initialize dimensions display
  updateCanvasDimensionsDisplay();
}

// Update canvas dimensions display
function updateCanvasDimensionsDisplay() {
  const width = displaySettings.pixelWidth;
  const height = displaySettings.pixelHeight;
  $("canvasDimensions").textContent = `${width}×${height}`;
}

// Simple debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Debounced function for saving settings
const debouncedSaveSettings = debounce(() => {
  try {
    const settingsToSave = {
      pixelWidth: displaySettings.pixelWidth,
      pixelHeight: displaySettings.pixelHeight,
      foregroundColor: displaySettings.foregroundColor,
      backgroundColor: displaySettings.backgroundColor,
      use7SegCustomColors: displaySettings.use7SegCustomColors
    };
    localStorage.setItem('DExDisplaySettings', JSON.stringify(settingsToSave));
  } catch (error) {
    console.error("Error saving display settings:", error);
    addDebugMessage("Error saving display settings");
  }
}, 300); // 300ms delay

// Handle real-time setting changes
function handleSettingChange() {
  // Get values from input controls
  const pixelWidth = parseInt($("pixelWidth").value, 10);
  const pixelHeight = parseInt($("pixelHeight").value, 10);
  const foregroundColor = $("foregroundColor").value;
  const backgroundColor = $("backgroundColor").value;
  const use7SegCustomColors = $("use7SegCustomColors").checked;

  // Validate values
  if (isNaN(pixelWidth) || pixelWidth < displaySettings.minSize || pixelWidth > displaySettings.maxSize) {
    addDebugMessage(`Invalid Pixel Width: ${$("pixelWidth").value}. Must be between ${displaySettings.minSize}-${displaySettings.maxSize}.`);
    $("pixelWidth").value = displaySettings.pixelWidth; // Revert to last valid
    return; 
  }
  if (isNaN(pixelHeight) || pixelHeight < displaySettings.minSize || pixelHeight > displaySettings.maxSize) {
    addDebugMessage(`Invalid Pixel Height: ${$("pixelHeight").value}. Must be between ${displaySettings.minSize}-${displaySettings.maxSize}.`);
    $("pixelHeight").value = displaySettings.pixelHeight; // Revert to last valid
    return;
  }

  // Update settings object
  displaySettings.pixelWidth = pixelWidth;
  displaySettings.pixelHeight = pixelHeight;
  displaySettings.foregroundColor = foregroundColor;
  displaySettings.backgroundColor = backgroundColor;
  displaySettings.use7SegCustomColors = use7SegCustomColors;

  // Save settings (debounced)
  debouncedSaveSettings();

  // Resize canvas 
  const canvas = $("screenCanvas");
  canvas.width = offx * 2 + 128 * displaySettings.pixelWidth;
  canvas.height = offy * 2 + 48 * displaySettings.pixelHeight;

  // Update resize button states
  updateResizeButtonStates();

  // Update dimensions display
  updateCanvasDimensionsDisplay();

  // Redraw the display with new settings
  if (oledData && oledData.length > 0 && did_oled) {
    drawOleddata(oledData);
  } else if (!did_oled) {
    // If currently in 7-segment mode, redraw it
    // Use the last known test data (the current state being displayed)
    // This is just a test handler, in reality the app would maintain the last state
    draw7Seg([47,3,8,19], 3); // Default test values
  }
}

function applyDisplaySettings() {
  // Get values from input controls
  const pixelWidth = parseInt($("pixelWidth").value, 10);
  const pixelHeight = parseInt($("pixelHeight").value, 10);
  const foregroundColor = $("foregroundColor").value;
  const backgroundColor = $("backgroundColor").value;
  const use7SegCustomColors = $("use7SegCustomColors").checked;
  
  // Validate values
  if (pixelWidth < displaySettings.minSize || pixelHeight < displaySettings.minSize) {
    addDebugMessage(`ERROR: Pixel dimensions must be at least ${displaySettings.minSize}`);
    return;
  }
  
  if (pixelWidth > displaySettings.maxSize || pixelHeight > displaySettings.maxSize) {
    addDebugMessage(`ERROR: Pixel dimensions must not exceed ${displaySettings.maxSize}`);
    return;
  }
  
  // Update settings
  displaySettings.pixelWidth = pixelWidth;
  displaySettings.pixelHeight = pixelHeight;
  displaySettings.foregroundColor = foregroundColor;
  displaySettings.backgroundColor = backgroundColor;
  displaySettings.use7SegCustomColors = use7SegCustomColors;
  
  // Save settings to localStorage
  try {
    const settingsToSave = {
      pixelWidth,
      pixelHeight,
      foregroundColor,
      backgroundColor,
      use7SegCustomColors
    };
    localStorage.setItem('DExDisplaySettings', JSON.stringify(settingsToSave));
    addDebugMessage("Display settings saved");
  } catch (error) {
    console.error("Error saving display settings:", error);
    addDebugMessage("Error saving display settings");
  }
  
  // Resize canvas based on new pixel dimensions
  const canvas = $("screenCanvas");
  canvas.width = offx * 2 + 128 * pixelWidth;
  canvas.height = offy * 2 + 48 * pixelHeight;
  
  addDebugMessage(`Applied display settings: ${pixelWidth}×${pixelHeight} pixels, FG: ${foregroundColor}, BG: ${backgroundColor}`);
  
  // Update resize button states
  updateResizeButtonStates();
  
  // Update dimensions display
  updateCanvasDimensionsDisplay();
  
  // Redraw the display with new settings
  if (oledData.length > 0 && did_oled) {
    drawOleddata(oledData);
  } else if (!did_oled) {
    // If currently in 7-segment mode, redraw it
    draw7Seg([47,3,8,19], 3); // Default test values
  }
}

// Initialize the canvas size based on display settings
function initCanvasSize() {
  const canvas = $("screenCanvas");
  canvas.width = offx * 2 + 128 * displaySettings.pixelWidth;
  canvas.height = offy * 2 + 48 * displaySettings.pixelHeight;
}

function increaseCanvasSize() {
  const currentWidth = parseInt($("pixelWidth").value, 10);
  const currentHeight = parseInt($("pixelHeight").value, 10);
  
  // Check if maximum size would be exceeded
  if (currentWidth + displaySettings.resizeStep <= displaySettings.maxSize) {
    // Update the input fields
    $("pixelWidth").value = currentWidth + displaySettings.resizeStep;
    $("pixelHeight").value = currentHeight + displaySettings.resizeStep;
    
    // Apply the settings to update the canvas and sync the changes
    handleSettingChange();
  }
  
  // Update button states
  updateResizeButtonStates();
}

function decreaseCanvasSize() {
  const currentWidth = parseInt($("pixelWidth").value, 10);
  const currentHeight = parseInt($("pixelHeight").value, 10);
  
  // Check if minimum size would be exceeded
  if (currentWidth - displaySettings.resizeStep >= displaySettings.minSize) {
    // Update the input fields
    $("pixelWidth").value = currentWidth - displaySettings.resizeStep;
    $("pixelHeight").value = currentHeight - displaySettings.resizeStep;
    
    // Apply the settings to update the canvas and sync the changes
    handleSettingChange();
  }
  
  // Update button states
  updateResizeButtonStates();
}

function updateResizeButtonStates() {
  const currentSize = parseInt($("pixelWidth").value, 10);
  
  // Disable the increase button if at or above max size
  $("canvasIncreaseButton").disabled = (currentSize + displaySettings.resizeStep > displaySettings.maxSize);
  
  // Disable the decrease button if at or below min size
  $("canvasDecreaseButton").disabled = (currentSize - displaySettings.resizeStep < displaySettings.minSize);
}

// Toggle fullscreen mode
function toggleFullScreen() {
  const elem = document.documentElement;
  const fullscreenButton = $("fullscreenButton");
  
  if (!document.fullscreenElement) {
    // Enter fullscreen
    elem.requestFullscreen({ navigationUI: 'hide' }).catch(err => {
      console.error('Fullscreen request failed:', err);
      alert('Fullscreen mode failed to activate: ' + err.message);
    });
  } else {
    // Exit fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

// Handle fullscreen change event
function handleFullscreenChange() {
  const fullscreenButton = $("fullscreenButton");
  const body = document.body;
  const canvas = $("screenCanvas");
  
  if (document.fullscreenElement) {
    // Entered fullscreen mode
    fullscreenSettings.active = true;
    fullscreenSettings.previousPixelWidth = displaySettings.pixelWidth;
    fullscreenSettings.previousPixelHeight = displaySettings.pixelHeight;
    
    fullscreenButton.textContent = "Exit Full Screen";
    fullscreenButton.classList.add("active");
    fullscreenButton.setAttribute("aria-pressed", "true");
    body.classList.add("fullscreen-mode");
    
    // Resize canvas to fit screen
    resizeCanvasToFit();
    
    // Add resize listener only when in fullscreen
    window.addEventListener('resize', resizeCanvasToFit);
    
  } else {
    // Exited fullscreen mode
    fullscreenSettings.active = false;
    
    fullscreenButton.textContent = "Full Screen";
    fullscreenButton.classList.remove("active");
    fullscreenButton.setAttribute("aria-pressed", "false");
    body.classList.remove("fullscreen-mode");
    
    // Remove resize listener when not in fullscreen
    window.removeEventListener('resize', resizeCanvasToFit);
    
    // COMPLETELY reset all canvas styles we added in fullscreen mode
    canvas.removeAttribute('style');
    
    // Restore previous pixel sizes
    if (fullscreenSettings.previousPixelWidth > 0 && fullscreenSettings.previousPixelHeight > 0) {
      displaySettings.pixelWidth = fullscreenSettings.previousPixelWidth;
      displaySettings.pixelHeight = fullscreenSettings.previousPixelHeight;
      
      // Update input field values
      $("pixelWidth").value = displaySettings.pixelWidth;
      $("pixelHeight").value = displaySettings.pixelHeight;
      
      // Update canvas dimensions with previous values
      canvas.width = offx*2 + 128*displaySettings.pixelWidth;
      canvas.height = offy*2 + 48*displaySettings.pixelHeight;
      
      // Redraw with restored settings
      redrawDisplay();
      
      // Update dimensions display
      updateCanvasDimensionsDisplay();
      
      // Update resize button states
      updateResizeButtonStates();
    }
  }
}

// Resize canvas to fit screen in fullscreen mode
function resizeCanvasToFit() {
  if (!fullscreenSettings.active) return;
  
  const canvas = $("screenCanvas");
  
  // Detect mobile devices
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // Clear any previous styles
  canvas.removeAttribute('style');
  
  // Log screen dimensions for debugging
  console.log(`Window inner: ${window.innerWidth}x${window.innerHeight}`);
  console.log(`Document client: ${document.documentElement.clientWidth}x${document.documentElement.clientHeight}`);
  console.log(`Mobile: ${isMobile}`);
  
  // MOBILE: Use simpler fixed-size approach with CSS scaling
  if (isMobile) {
    // Set a fixed size for the canvas - make it BIG
    canvas.width = 1280;  // 10x the Deluge screen width
    canvas.height = 480;  // 10x the Deluge screen height
    
    // Use CSS to make it fit the screen properly
    canvas.style.position = 'fixed';
    canvas.style.left = '50%';
    canvas.style.top = '50%';
    canvas.style.transform = 'translate(-50%, -50%)';
    canvas.style.maxWidth = '90vw';
    canvas.style.maxHeight = '80vh';
    canvas.style.width = 'auto';
    canvas.style.height = 'auto';
    
    // Set the fullscreen pixel size
    fullscreenSettings.pixelWidth = 10;  // Works with our 10x canvas size
    fullscreenSettings.pixelHeight = 10;
  }
  // DESKTOP: Calculate optimal size
  else {
    // Get screen dimensions
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Use available space with margins
    const margin = 40;
    const availableWidth = screenWidth - margin;
    const availableHeight = screenHeight - margin;
    
    // Calculate pixel size
    const pixelSizeFromWidth = Math.floor(availableWidth / 128);
    const pixelSizeFromHeight = Math.floor(availableHeight / 48);
    const pixelSize = Math.max(1, Math.min(pixelSizeFromWidth, pixelSizeFromHeight));
    
    console.log(`Desktop pixel size: ${pixelSize}`);
    
    // Set the fullscreen pixel size
    fullscreenSettings.pixelWidth = pixelSize;
    fullscreenSettings.pixelHeight = pixelSize;
    
    // Set canvas dimensions
    canvas.width = 128 * pixelSize + 2 * offx;
    canvas.height = 48 * pixelSize + 2 * offy;
    
    // Center canvas
    canvas.style.position = 'absolute';
    canvas.style.left = '50%';
    canvas.style.top = '50%';
    canvas.style.transform = 'translate(-50%, -50%)';
  }
  
  // Redraw with fullscreen settings
  redrawDisplay();
}

// Centralized function to redraw the display
function redrawDisplay() {
  // Determine which pixel size to use
  let pixelWidth, pixelHeight;
  
  if (fullscreenSettings.active) {
    pixelWidth = fullscreenSettings.pixelWidth;
    pixelHeight = fullscreenSettings.pixelHeight;
  } else {
    pixelWidth = displaySettings.pixelWidth;
    pixelHeight = displaySettings.pixelHeight;
  }
  
  // Draw with the appropriate settings
  if (did_oled && lastOled) {
    drawOleddata(lastOled, pixelWidth, pixelHeight);
  } else if (lastSevenSeg && lastDots !== undefined) {
    draw7Seg(lastSevenSeg, lastDots, pixelWidth, pixelHeight);
  }
}

// Handle keyboard shortcuts
function handleKeyDown(event) {
  // Ignore if typing in text input
  if (event.target.tagName === 'INPUT' && 
      (event.target.type === 'text' || event.target.type === 'number')) {
    return;
  }
  
  // 'f' key to toggle fullscreen
  if (event.key === 'f' || event.key === 'F') {
    toggleFullScreen();
    event.preventDefault();
  }
}
