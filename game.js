/* game.js - LOGIC & ENGINE */
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';
import { PointerLockControls } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/PointerLockControls.js';
import { CameraAPI } from './camera.js';
import { initLevel } from './level_design.js';

// --- CONFIG ---
const CONFIG = {
    walkSpeed: 5.0, eyeHeight: 1.8, collisionDist: 0.6, interactDist: 4.0, drainRate: 2.5, rechargeRate: 1.5    
};

// --- STATE ---
const State = {
    gameActive: false, isFalling: false, stepTimer: 0, heartTimer: 0, fallVelocity: 0, readingNote: false, 
    puzzles: { handDoor: false, emotionDoor: false, finalDoorOpened: false, observationDone: false, darkness: false, observationTime: 0, loopCount: 0 },
    keys: { w: false, s: false, a: false, d: false },
    flashlight: { on: true, battery: 100, maxIntensity: 2.5, dimIntensity: 0.8, flickerTimer: 0 },
    sanity: 100,
    currentSpeed: new THREE.Vector3(),
    memorySymbol: Math.floor(Math.random() * 3)
};

// --- FLASHLIGHT SWING STATE ---
const Swing = { x: 0, y: 0 };

const memColors = [0xff0000, 0x00ff00, 0x0000ff];

// --- AUDIO ENGINE (BALANCED MIX) ---
const AudioSys = {
    ctx: new (window.AudioContext || window.webkitAudioContext)(),
    masterGain: null, 
    ambienceNode: null,
    ambienceFilter: null,
    ambienceGain: null,
    droneOsc: null,
    droneGain: null,

    init() {
        this.masterGain = this.ctx.createGain(); 
        // CHANGED: Lowered Master to 0.5 to prevent clipping when multiple sounds overlap
        this.masterGain.gain.value = 0.5; 
        this.masterGain.connect(this.ctx.destination);
    },

    resume() { 
        if (this.ctx.state === 'suspended') this.ctx.resume(); 
        if (!this.ambienceNode) this.startAmbience();
    },

    startAmbience() {
        // 1. Create Brown Noise (Deep Rumble)
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02; 
            lastOut = output[i];
            output[i] *= 3.5; // Gain compensation
        }

        this.ambienceNode = this.ctx.createBufferSource();
        this.ambienceNode.buffer = noiseBuffer;
        this.ambienceNode.loop = true;

        // 2. Filter (Muffles the sound)
        this.ambienceFilter = this.ctx.createBiquadFilter(); 
        this.ambienceFilter.type = 'lowpass'; 
        this.ambienceFilter.frequency.value = 200; 

        // 3. Gain (Volume)
        this.ambienceGain = this.ctx.createGain();
        this.ambienceGain.gain.value = 0.3;

        // Connect Chain: Source -> Filter -> Gain -> Master
        this.ambienceNode.connect(this.ambienceFilter); 
        this.ambienceFilter.connect(this.ambienceGain); 
        this.ambienceGain.connect(this.masterGain);
        this.ambienceNode.start();

        // 4. Drone (Secondary Tension Sound)
        this.droneOsc = this.ctx.createOscillator();
        this.droneOsc.type = 'triangle'; 
        this.droneOsc.frequency.value = 40; 
        
        this.droneGain = this.ctx.createGain();
        this.droneGain.gain.value = 0.0; // Starts silent

        this.droneOsc.connect(this.droneGain);
        this.droneGain.connect(this.masterGain);
        this.droneOsc.start();
    },

updateAmbience(z) {
        // SAFETY: Force wake up audio if browser muted it
        if (this.ctx.state === 'suspended') this.ctx.resume();
        if (!this.ambienceFilter) return;

        const t = this.ctx.currentTime;
        const rampTime = 0.5; // Fast, smooth transition (0.5 seconds)

        let targetFreq = 150; 
        let targetDrone = 0.0;

        // ZONE 1: Start & Basement (z < 25)
        if (z <= 25) {
            targetFreq = 150; // Muffled
            targetDrone = 0.0; 
        }
        // ZONE 2: Hallway (z 25 to 65)
        else if (z > 25 && z < 65) { 
            targetFreq = 400; // Open/Windy
            targetDrone = 0.05; 
        }
        // ZONE 3: Statue (z 65 to 100)
        else if (z >= 65 && z < 100) { 
            targetFreq = 80; // Deep/Oppressive
            targetDrone = 0.2; // Loud Drone
        }
        // ZONE 4: The Void (z > 100)
        else { 
            targetFreq = 800; // Hissing
            targetDrone = 0.05; 
        }

        // Apply changes immediately using linearRamp (Fixes "Broken" feeling)
        this.ambienceFilter.frequency.linearRampToValueAtTime(targetFreq, t + rampTime);
        this.droneGain.gain.linearRampToValueAtTime(targetDrone, t + rampTime);
    },

    // PAPER RUSTLE
    playPaper() {
        const t = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.5; 
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        
        const noise = this.ctx.createBufferSource(); 
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter(); 
        filter.type = 'bandpass'; 
        filter.frequency.value = 400; 
        
        const gain = this.ctx.createGain();
        // CHANGED: 1.5 -> 0.4 (Crisp, but not deafening)
        gain.gain.setValueAtTime(0.4, t); 
        gain.gain.linearRampToValueAtTime(0.01, t + 0.4); 
        
        noise.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
        noise.start(t);
    },

    // DOOR SOUND
    playDoorOpen() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth'; 
        osc.frequency.setValueAtTime(50, t);
        osc.frequency.linearRampToValueAtTime(60, t + 2.0);

        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 10;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 500;
        lfo.connect(lfoGain); lfoGain.connect(osc.detune);
        lfo.start(t);

        gain.gain.setValueAtTime(0.0, t);
        // CHANGED: 0.4 -> 0.3 (Slight reduction)
        gain.gain.linearRampToValueAtTime(0.1, t + 0.2); 
        gain.gain.linearRampToValueAtTime(0.0, t + 2.0); 

        osc.connect(gain); gain.connect(this.masterGain);
        osc.start(t); osc.stop(t + 2.0);
    },

    // FOOTSTEPS (Fixed the excessive volume)
    playFootstep() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;
        // Impact
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
        const noise = this.ctx.createBufferSource(); noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(600, t); 
        const gain = this.ctx.createGain(); 
        
        // CHANGED: 5.0 -> 0.25 (This was the main problem!)
        gain.gain.setValueAtTime(1, t); 
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        
        noise.connect(filter); filter.connect(gain); gain.connect(this.masterGain); noise.start(t);
        
        // Bass (Thud)
        const osc = this.ctx.createOscillator(); const oscGain = this.ctx.createGain();
        osc.frequency.setValueAtTime(50, t); osc.frequency.exponentialRampToValueAtTime(10, t + 0.15);
        
        // CHANGED: 2.0 -> 0.2 (Subtle thud, not a bass drop)
        oscGain.gain.setValueAtTime(0.2, t); 
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        
        osc.connect(oscGain); oscGain.connect(this.masterGain); osc.start(t); osc.stop(t + 0.2);
    },

    // PICKUP
    playPickup() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
        // CHANGED: 0.3 -> 0.2
        gain.gain.setValueAtTime(0.2, t); 
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.connect(gain); gain.connect(this.masterGain); osc.start(t); osc.stop(t + 0.2);
    },
    
    // UI CLICK
    playClick() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(2000, t);
        // CHANGED: 0.1 -> 0.05
        gain.gain.setValueAtTime(0.05, t); 
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        osc.connect(gain); gain.connect(this.masterGain); osc.start(t); osc.stop(t + 0.05);
    },
    
    // HEARTBEAT
    playHeartbeat() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(60, t); osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        // CHANGED: 1.0 -> 0.6 (Should be felt, not heard over everything)
        gain.gain.setValueAtTime(0.6, t); 
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.connect(gain); gain.connect(this.masterGain); osc.start(t); osc.stop(t + 0.2);
    },
    
    // SCREECH (Jumpscare)
    playScreech() {
        const t = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator(); const osc2 = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc1.type = 'sawtooth'; osc1.frequency.setValueAtTime(100, t); osc1.frequency.linearRampToValueAtTime(800, t + 0.4); 
        osc2.type = 'square'; osc2.frequency.setValueAtTime(150, t); osc2.frequency.linearRampToValueAtTime(750, t + 0.4); 
        
        // CHANGED: 0.5 -> 0.8 (This SHOULD be the loudest thing in the game)
        gain.gain.setValueAtTime(0.5, t); 
        gain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);
        
        osc1.connect(gain); osc2.connect(gain); gain.connect(this.masterGain);
        osc1.start(t); osc2.start(t); osc1.stop(t + 1.5); osc2.stop(t + 1.5);
    },
    
    playHum(pitchInput) { 
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(400 + (pitchInput * 10), t); 
        // 0.02 is fine for a subtle hum
        gain.gain.setValueAtTime(0.02, t);
        osc.connect(gain); gain.connect(this.masterGain); osc.start(t); osc.stop(t + 0.1);
    }
};
AudioSys.init();

const Stalker = {
    aggression: 0, cooldown: 0, activeScare: null, scareTimer: 0,
    update(delta, zPos) {
        if (zPos < 5 || zPos > 35) return;
        if (this.scareTimer > 0) { this.scareTimer -= delta; if (this.scareTimer <= 0) this.activeScare = null; return; }
        if (this.cooldown > 0) { this.cooldown -= delta; return; }
        const fear = CameraAPI.motionScore; 
        if (fear > 20) State.sanity -= delta * 2; 
        if (fear > 40) { this.triggerScare('mirror'); this.cooldown = 20; } 
        else if (fear < 2) { if (Math.random() < 0.005) { this.triggerScare('sound'); this.cooldown = 15; } }
    },
    triggerScare(type) {
        this.activeScare = type; this.scareTimer = 4.0; State.sanity = Math.max(0, State.sanity - 10);
        const prompt = document.getElementById('interaction-prompt');
        CameraAPI.recordScare(type === 'mirror' ? "Mirror Glitch" : "Stalker Sound");
        if (type === 'sound') {
            prompt.style.opacity = 1;
            prompt.innerHTML = `<span style='color:#ffaa00; font-style:italic;'>[ Breath behind you... ]</span>`;
            setTimeout(() => { prompt.style.opacity = 0; }, 3000);
            State.flashlight.flickerTimer = 1.5; 
        }
    }
};

// --- INIT CORE ---
const collisionRay = new THREE.Raycaster();
const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x020202, 0.12); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// STARTING POSITION
camera.position.set(0, CONFIG.eyeHeight, 0); 
scene.add(camera); // Camera goes directly into the scene

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const walls = []; const batteries = []; 
const ambientLight = new THREE.AmbientLight(0x050505); scene.add(ambientLight);
// IN game.js - REPLACE THE PLAYER/FLASHLIGHT SETUP:

const flashlight = new THREE.SpotLight(0xffffff, State.flashlight.maxIntensity, 60, Math.PI/4, 0.5, 1);
flashlight.position.set(0,0,0); 
// CHANGED: Target is now Negative Z (Forward in new map)
flashlight.target.position.set(0,0,-1); 
flashlight.castShadow=true;
camera.add(flashlight); camera.add(flashlight.target);

// --- CONTROLS ---
const controls = new PointerLockControls(camera, document.body);

// 1. SENSITIVITY: Lower this number. 
// Standard is 1.0. Try 0.1 or 0.2 for slower movement.
controls.pointerSpeed = 0.2; 

// 2. PREVENT FLIPPING: This limits looking up/down to 180 degrees total
controls.minPolarAngle = 0.1; // Don't look perfectly straight up (prevents glitches)
controls.maxPolarAngle = Math.PI - 0.1; // Don't look perfectly straight down

// EVENT: Lock cursor on click
document.addEventListener('click', () => { 
    if (State.gameActive && !controls.isLocked) {
        controls.lock(); 
        AudioSys.resume(); 
    }
});
// --- MIRROR SYSTEM ---
let mirrorCanvas, mirrorCtx, mirrorTexture;
const mirrorBuffer = []; const MIRROR_LAG_FRAMES = 30; 
// Initialize Mirror Texture for passing to Level Builder
mirrorCanvas = document.createElement('canvas'); mirrorCanvas.width=512; mirrorCanvas.height=512;
mirrorCtx = mirrorCanvas.getContext('2d'); mirrorTexture = new THREE.CanvasTexture(mirrorCanvas);
for(let i=0; i<MIRROR_LAG_FRAMES; i++) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 512; mirrorBuffer.push(c);
}

function updateMirror() {
    if (!CameraAPI.videoElement || CameraAPI.videoElement.readyState !== 4) return;
    const recycledCanvas = mirrorBuffer.shift(); 
    const ctx = recycledCanvas.getContext('2d');
    ctx.clearRect(0,0,512,512); 
    ctx.save(); ctx.translate(512, 0); ctx.scale(-1, 1);
    ctx.drawImage(CameraAPI.videoElement, 0, 0, 512, 512); ctx.restore();
    mirrorBuffer.push(recycledCanvas);
    mirrorCtx.clearRect(0,0,512,512); 
    mirrorCtx.drawImage(mirrorBuffer[0], 0, 0); 
    mirrorTexture.needsUpdate = true;
}

// --- BUILD LEVEL ---
const levelObjects = initLevel(scene, walls, batteries, State, mirrorTexture);

// --- GAME LOGIC ---
const raycaster = new THREE.Raycaster();
const prompt = document.getElementById('interaction-prompt');

function updateStatue(delta) {
    if (camera.position.z < 42 || camera.position.z > 92) return;
    const dist = levelObjects.statue.position.distanceTo(camera.position);
    AudioSys.playHum(dist); 
    let isWatched = false;
    if (State.flashlight.on) {
        const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir);
        const toStatue = new THREE.Vector3().subVectors(levelObjects.statue.position, camera.position).normalize();
        if (camDir.dot(toStatue) > 0.6) isWatched = true; 
    }
    if (!isWatched) {
        const speed = 6.5; 
        const dir = new THREE.Vector3().subVectors(camera.position, levelObjects.statue.position).normalize(); dir.y = 0; 
        levelObjects.statue.position.addScaledVector(dir, speed * delta);
        if (Math.random() < 0.02) AudioSys.playScreech();
        if (dist < 1.5) {
            camera.lookAt(levelObjects.statue.position);
            triggerDeath("Statue Death");
            setTimeout(() => {
                camera.position.set(0, 1.8, 42); levelObjects.statue.position.set(0, 0.9, 85); 
                State.sanity = 100; scene.fog.color.setHex(0x020202); State.flashlight.battery = 100;
            }, 200);
        }
    }
}

function triggerDeath(reason) {
    const flash = document.createElement('div');
    flash.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;background:red;z-index:999";
    document.body.appendChild(flash);
    AudioSys.playScreech(); CameraAPI.recordScare(reason);
    setTimeout(() => { if(flash) flash.remove(); }, 200);
}

function updateSanity(delta) {
    if (CameraAPI.fearLevel < 10 && State.sanity < 100) State.sanity += delta * 0.5;
    const sanityFactor = (100 - State.sanity) / 100; 
    
    // FIX: Removed the FOV sine wave math. 
    // Instead of zooming the camera in/out, we just tint the fog.
    // This keeps mouse sensitivity consistent.
    camera.fov = 75; 
    camera.updateProjectionMatrix();

    if (sanityFactor > 0.5) scene.fog.color.setRGB(sanityFactor * 0.1, 0, 0); else scene.fog.color.setHex(0x020202);
}

function updateFlashlight(delta) {
    const battBar = document.getElementById('battery-fill');
    if (State.flashlight.battery <= 0 && State.flashlight.on) State.flashlight.on = false; 
    if (State.flashlight.on) {
        State.flashlight.battery -= CONFIG.drainRate * delta;
        let flicker = 1.0;
        if (State.flashlight.battery < 20) {
            flicker = 0.8 + Math.sin(Date.now()*0.02) * 0.2; 
            if(Math.random() < 0.1) flicker = 0.0; 
        }
        flashlight.intensity = State.flashlight.maxIntensity * flicker;
    } else {
        flashlight.intensity = State.flashlight.dimIntensity;
    }
    battBar.style.width = Math.max(0, State.flashlight.battery) + "%";
    if (State.flashlight.battery < 20) battBar.style.background = "#ff0000"; else battBar.style.background = "#00ff00";
}

function checkCollision(pos, dir, dist) {
    // Clone position so we don't modify the actual camera
    const rayOrigin = pos.clone(); 
    
    // LOWER the origin to waist level (e.g., 1.0 unit high)
    // The camera is at 1.8, so we lower it by 0.8
    rayOrigin.y -= 0.8; 

    raycaster.set(rayOrigin, dir);
    const intersects = raycaster.intersectObjects(walls);
    return (intersects.length > 0 && intersects[0].distance < dist);
}

function updateInteractions(delta) {
    const interactRay = new THREE.Raycaster();
    interactRay.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = interactRay.intersectObjects(scene.children, true); 
    
    let hit = null;
    for (let i = 0; i < intersects.length; i++) {
        const n = intersects[i].object.name;
        if ((n.includes("door") || n.includes("note") || n === "battery") && intersects[i].distance < CONFIG.interactDist) {
            hit = { object: intersects[i].object, name: n }; break;
        }
    }

    const z = camera.position.z;
    if (z < 10) CameraAPI.setMode('face'); else if (z >= 10 && z < 40) CameraAPI.setMode('hands'); else CameraAPI.setMode('none'); 
    levelObjects.ritualCursor.material.opacity = 0;

    if (!hit) { State.readingNote = false; prompt.style.opacity = 0; return; }

    if (hit.name.includes("note")) {
        prompt.style.opacity = 1;
        if (State.readingNote) {
            let text = "";
            if(hit.name === "emotion_note") text = "📝 <i>SUBJECT #42.<br>MIMICRY TEST.<br><b>MIMIC THE FACE OF TERROR.</b></i>";
            else if(hit.name === "hand_note") text = "📝 <i>SYSTEM LOCKED.<br>RITUAL REQUIRED.<br><b>ALIGN THE SPARK.</b></i>";
            else text = "📝 <i>IT ONLY MOVES WHEN YOU DON'T LOOK.<br><b>KEEP THE LIGHT ON IT.</b></i>";
            prompt.innerHTML = `<div style='background:#111; color:#ccc; padding:20px; border: 1px solid #444;'>${text}<br><br>[Walk away to Close]</div>`;
        } else prompt.innerHTML = "[E] Read Note";
    } 
    else if (hit.name === "battery") { prompt.style.opacity = 1; prompt.innerHTML = "[E] Take Battery"; }
    
    else if (hit.name === "emotion_door" && !State.puzzles.emotionDoor) {
        prompt.style.opacity = 1;
        if (!CameraAPI.emotions.isScared) prompt.innerHTML = "<span style='color:#f00; font-size:1.5rem;'>[ LOCKED ]</span>";
        else {
             prompt.innerHTML = "<span style='color:#0f0;'>TERROR DETECTED.</span>";
             openDoorSequence(hit.object, "emotionDoor");
        }
    }
    
    else if (hit.name === "hand_door" && !State.puzzles.handDoor) {
        prompt.style.opacity = 1;
        if (CameraAPI.handDetected) {
            levelObjects.ritualCursor.material.opacity = 0.9; 
            const mapX = (CameraAPI.handPosition.x - 0.5) * 2.8; 
            const mapY = (1.0 - CameraAPI.handPosition.y) * 3.8; 
            levelObjects.ritualCursor.position.set(levelObjects.handDoor.position.x + mapX, mapY, levelObjects.handDoor.position.z - 0.2);
            
            if (levelObjects.ritualCursor.position.distanceTo(new THREE.Vector3(0, 1.9, 39.8)) < 0.5) {
                prompt.innerHTML = "<span style='color:#ff0;'>HOLD...</span>";
                levelObjects.ritualCursor.material.color.setHex(0x00ff00);
                if(!hit.object.userData.timer) hit.object.userData.timer = 0;
                hit.object.userData.timer++;
                if(hit.object.userData.timer > 60) {
                    State.puzzles.handDoor = true;
                    AudioSys.playDoorOpen();
                    const idx = walls.indexOf(hit.object); if (idx > -1) walls.splice(idx, 1);
                    const interval = setInterval(() => { hit.object.position.x += 0.05; if(hit.object.position.x > 2.5) clearInterval(interval); }, 16);
                    CameraAPI.recordScare("Hand Door");
                }
            } else {
                prompt.innerHTML = "<span style='color:#f00;'>[ LOCKED ]</span>";
                levelObjects.ritualCursor.material.color.setHex(0x00ffff);
            }
        } else prompt.innerHTML = "<span style='color:#f00;'>[ LOCKED ]</span>";
    }
    
    else if (hit.name === "final_door") { prompt.style.opacity = 1; prompt.innerHTML = "[E] ESCAPE"; }
}


function openDoorSequence(doorObj, puzzleKey) {
    State.puzzles[puzzleKey] = true;
    AudioSys.playDoorOpen();
    const idx = walls.indexOf(doorObj); if (idx > -1) walls.splice(idx, 1);
    const interval = setInterval(() => { doorObj.position.x += 0.05; if(doorObj.position.x > 2.5) clearInterval(interval); }, 16);
    CameraAPI.recordScare("Puzzle Solved"); 
}


function handleInteraction() {
    const interactRay = new THREE.Raycaster();
    interactRay.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = interactRay.intersectObjects(scene.children, true); 
    for (let i = 0; i < intersects.length; i++) {
        const obj = intersects[i].object;
        if (intersects[i].distance < CONFIG.interactDist) {
            if (obj.name === "battery") {
                State.flashlight.battery = 100; scene.remove(obj);
                AudioSys.playPickup();
                const idx = batteries.indexOf(obj); if (idx > -1) batteries.splice(idx, 1);
                const p = document.getElementById('interaction-prompt');
                p.innerHTML = "<span style='color:#0f0'>BATTERY REPLACED</span>";
                p.style.opacity = 1; setTimeout(() => { p.style.opacity = 0; }, 1000);
                return;
            }
            if (obj.name.includes("note")) { 
                AudioSys.playPaper();
                State.readingNote = !State.readingNote;
                return; 

            }
            if (obj.name === "final_door") showEndScreen();
        }
    }
}

function updateActIV(delta) {
    const z = camera.position.z;
    if (z < 90) return;

    if (State.flashlight.on) levelObjects.ghostBridge.material.opacity = 0; else levelObjects.ghostBridge.material.opacity = 0.6;

    // 1. Hidden Symbol Puzzle
    if (z > 105 && z < 115) {
        const toWall = new THREE.Vector3(-1, 0, 0); const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir);
        if (State.flashlight.on && camDir.dot(toWall) > 0.9) levelObjects.hiddenSymbol.material.opacity = Math.min(1, levelObjects.hiddenSymbol.material.opacity + delta);
        else levelObjects.hiddenSymbol.material.opacity = Math.max(0, levelObjects.hiddenSymbol.material.opacity - delta * 2);
    }

    // 2. The Pit / Falling
    if (z > 126 && z < 144) {
        if (State.isFalling) {
            State.fallVelocity += delta * 20; camera.position.y -= State.fallVelocity * delta; 
            camera.rotation.z += delta * 2; camera.rotation.x -= delta; return; 
        }
        let shouldFall = false;
        if (State.flashlight.on) shouldFall = true; else if (camera.position.x < -1.4 || camera.position.x > 1.4) shouldFall = true; 
        if (shouldFall) {
            State.isFalling = true; State.fallVelocity = 5.0; prompt.innerHTML = ""; 
            setTimeout(() => {
                State.isFalling = false; State.sanity -= 20; camera.position.set(0, 1.8, 120); camera.rotation.set(0, 0, 0); 
                scene.fog.color.setHex(0x020202); scene.fog.density = 0.12; AudioSys.playScreech();
            }, 2000);
        }
    }

    // 3. INFINITE HALLWAY & OBSERVATION PUZZLE
    if (z > 180 && z < 210) { // Expanded zone slightly to catch the loop

        // Check if player is pressing ANY move keys
        const isMoving = State.keys.w || State.keys.s || State.keys.a || State.keys.d;

        // Logic: You must stand still between Z=195 and Z=200
        if (z > 195 && z < 200 && !State.puzzles.observationDone) {
            
            if (isMoving) {
                // RESET timer if moving
                State.puzzles.observationTime = 0;
                prompt.style.opacity = 0;
            } 
            else {
                // COUNT UP if keys are not pressed
                State.puzzles.observationTime += delta; 
                scene.fog.density = 0.12 + (State.puzzles.observationTime * 0.1); 
                

                if (State.puzzles.observationTime > 5.0) {
                    if (!State.puzzles.observationDone) AudioSys.playDoorOpen();
                    State.puzzles.observationDone = true; 
                    prompt.innerHTML = "<span style='color:lime'>REALITY STABILIZED</span>";
                    prompt.style.opacity = 1; 
                    scene.fog.density = 0.12; 
                    AudioSys.playHum(0); 
                }
            }
        }
        
        // LOOP LOGIC: If you walk past 205 without solving it, TP back
        if (z > 200 && !State.puzzles.observationDone) {
             camera.position.z = 170; // Teleport back to start of hallway section
             State.puzzles.loopCount++;
             
             // Reset Fog
             scene.fog.density = 0.12;
             
             if(State.puzzles.loopCount === 1) { 
                 prompt.innerHTML = "LOOP DETECTED"; 
                 prompt.style.opacity = 1; 
                 setTimeout(()=>prompt.style.opacity=0, 2000); 
             }
        }
    }
    
    // Open the door if solved
    if (State.puzzles.observationDone && levelObjects.obsDoor.position.x < 3) levelObjects.obsDoor.position.x += 0.05;

    // 4. Final Doors
    if (z > 240 && z < 250) {
        if (camera.position.distanceTo(levelObjects.doorL.position) < 2) checkDoor(0);
        else if (camera.position.distanceTo(levelObjects.doorC.position) < 2) checkDoor(1);
        else if (camera.position.distanceTo(levelObjects.doorR.position) < 2) checkDoor(2);
    }
}

// In game.js - REPLACE the entire checkDoor function
function checkDoor(index) {
    if (State.puzzles.finalDoorOpened) return; 
    if (index === State.memorySymbol) {
        State.puzzles.finalDoorOpened = true; prompt.innerHTML = "<span style='color:lime; font-size:2rem'>PATH CLEAR</span>";
        prompt.style.opacity = 1; AudioSys.playHum(0);
        AudioSys.playDoorOpen();
        const doors = [levelObjects.doorL, levelObjects.doorC, levelObjects.doorR];
        const correctDoor = doors[index];
        const wallIdx = walls.indexOf(correctDoor); if (wallIdx > -1) walls.splice(wallIdx, 1);
        const interval = setInterval(() => { correctDoor.position.y -= 0.1; if(correctDoor.position.y < -3) clearInterval(interval); }, 16);
    } else {
        const doors = [levelObjects.doorL, levelObjects.doorC, levelObjects.doorR];
        camera.lookAt(doors[index].position);
        triggerDeath("Wrong Door Death");
        setTimeout(() => {
            camera.position.set(0, 1.8, 95); camera.rotation.set(0, 0, 0); 
            State.sanity = 100; State.flashlight.battery = 100; 
            State.memorySymbol = Math.floor(Math.random() * 3); 
            levelObjects.memoryHint.material.color.setHex(memColors[State.memorySymbol]);
        }, 200);
    }
}

function showEndScreen() {
    State.gameActive = false; document.exitPointerLock();
    document.getElementById('hud').style.display = 'none';
    document.getElementById('end-screen').classList.add('active');
    const reel = document.getElementById('reaction-reel'); reel.innerHTML = '';
    CameraAPI.clips.forEach(clip => {
        const card = document.createElement('div'); card.className = 'clip-card';
        const vid = document.createElement('video'); vid.src = clip.url; vid.controls = true;
        const label = document.createElement('div'); label.className = 'clip-label'; label.innerText = `${clip.time}`;
        const btn = document.createElement('a'); btn.className = 'clip-btn'; btn.innerText = "SAVE"; btn.href = clip.url; btn.download = `Reflections_${clip.id}.webm`;
        card.append(label, vid, btn); reel.appendChild(card);
    });
}

// --- STANDARD FPS GAME LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    // 1. FIXED DELTA: Prevents glitching through walls if frames drop
    const rawDelta = clock.getDelta();
    const delta = Math.min(rawDelta, 0.1); 

    if (State.gameActive) {
        
        // --- MOVEMENT (The "Normal" Way) ---
        // 1. Get WASD Input
        let moveForward = 0;
        let moveRight = 0;
        
        if (State.keys.w) moveForward = 1; 
        if (State.keys.s) moveForward = -1;
        if (State.keys.a) moveRight = -1; 
        if (State.keys.d) moveRight = 1;

        // 2. Calculate Direction
        // We move RELATIVE to where the camera is looking
        const direction = new THREE.Vector3();
        
        // Get camera's forward/right vectors
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
        
        camera.getWorldDirection(forward);
        forward.y = 0; // Flatten it (so looking up doesn't make you fly)
        forward.normalize();

        right.crossVectors(forward, camera.up).normalize();

        // Combine inputs
        direction.addScaledVector(forward, moveForward);
        direction.addScaledVector(right, moveRight);
        direction.normalize(); // Ensure diagonal movement isn't faster

        // 3. Apply Speed (INSTANTLY)
        // No lerp. No acceleration. Just speed.
        const velocity = direction.multiplyScalar(CONFIG.walkSpeed * delta);

        // 4. Move & Collide (X Axis)
        if (velocity.x !== 0) {
            const dirX = new THREE.Vector3(Math.sign(velocity.x), 0, 0);
            if (!checkCollision(camera.position, dirX, CONFIG.collisionDist)) {
                camera.position.x += velocity.x;
            }
        }

        // 5. Move & Collide (Z Axis)
        if (velocity.z !== 0) {
            const dirZ = new THREE.Vector3(0, 0, Math.sign(velocity.z));
            if (!checkCollision(camera.position, dirZ, CONFIG.collisionDist)) {
                camera.position.z += velocity.z;
            }
        }

        // --- HEAD BOB (Visuals Only) ---
        if (moveForward !== 0 || moveRight !== 0) {
            State.stepTimer += delta * CONFIG.walkSpeed * 2.5;
            // Play footstep at the bottom of the bob
            if (State.stepTimer > Math.PI) {
                State.stepTimer = 0;
                AudioSys.playFootstep();
            }
            camera.position.y = CONFIG.eyeHeight + Math.sin(State.stepTimer * 2) * 0.08;
        } else {
            // Reset to standing height instantly when stopped
            camera.position.y = THREE.MathUtils.lerp(camera.position.y, CONFIG.eyeHeight, delta * 10);
        }

        // --- GAME LOGIC UPDATES ---
        const z = camera.position.z;
        AudioSys.updateAmbience(z);
        Stalker.update(delta, z);
        updateStatue(delta);
        updateFlashlight(delta);
        updateSanity(delta); 
        updateMirror(); 
        batteries.forEach(bat => bat.rotation.y += delta);
        updateInteractions(delta); updateActIV(delta);
        
        // --- FLASHLIGHT SWAY (Keep this, it's cool and doesn't break movement) ---
        Swing.x = THREE.MathUtils.lerp(Swing.x, 0, 10 * delta);
        Swing.y = THREE.MathUtils.lerp(Swing.y, 0, 10 * delta);
        flashlight.target.position.x = -Swing.x * 0.003;
        flashlight.target.position.y = Swing.y * 0.003;
    }

    renderer.render(scene, camera);
}

document.addEventListener('mousemove', (e) => {
    if (State.gameActive && controls.isLocked) {
        // WE REMOVED THE CAMERA ROTATION CODE HERE (It caused the flipping)

        // Keep the flashlight sway logic:
        Swing.x += e.movementX;
        Swing.y += e.movementY;
        
        // Clamp sway
        Swing.x = Math.max(-150, Math.min(150, Swing.x));
        Swing.y = Math.max(-150, Math.min(150, Swing.y));
    }
});
document.addEventListener('keydown', (e) => { 
    if(e.code === 'KeyW') State.keys.w = true; 
    if(e.code === 'KeyS') State.keys.s = true;
    if(e.code === 'KeyA') State.keys.a = true; 
    if(e.code === 'KeyD') State.keys.d = true;
    
    if(e.code === 'KeyE') handleInteraction();
    
    if (e.code === 'KeyF') { 
        State.flashlight.on = !State.flashlight.on; 
        AudioSys.playClick(); 
    }

    // --- DEV TOOL: SKELETON KEY ---
    if (e.code === 'KeyK') {
        const prompt = document.getElementById('interaction-prompt');
        prompt.style.opacity = 1;
        prompt.innerHTML = "<span style='color:orange'>[ DEV TOOL: UNLOCKING... ]</span>";
        setTimeout(() => prompt.style.opacity = 0, 1000);

        // 1. Force Open Emotion Door
        const emoDoor = scene.getObjectByName("emotion_door");
        if (emoDoor && !State.puzzles.emotionDoor) {
            openDoorSequence(emoDoor, "emotionDoor");
        }
        
        // 2. Force Open Foyer Door
        const foyerDoor = scene.getObjectByName("door_foyer");
        if (foyerDoor) {
            openDoorSequence(foyerDoor, "foyerDoor");
        }
    }
});
// --- DEV TOOL: ULTRA BYPASS ---
    // Press 'P' to teleport to the next level/zone instantly
    if (e.code === 'KeyP') {
        const z = camera.position.z;
        let targetZ = 0;
        let msg = "";

        if (z < 10) { targetZ = 35; msg = "WARP >> INDUSTRIAL"; }
        else if (z < 42) { targetZ = 60; msg = "WARP >> STATUE"; }
        else if (z < 90) { targetZ = 105; msg = "WARP >> THE VOID"; }
        else if (z < 160) { targetZ = 190; msg = "WARP >> HALLWAY"; }
        else { targetZ = 242; msg = "WARP >> FINALE"; }

        camera.position.set(0, 1.8, targetZ);
        
        // Reset state for safety
        State.isFalling = false;
        camera.rotation.set(0, 0, 0); 
        scene.fog.color.setHex(0x020202);

        const prompt = document.getElementById('interaction-prompt');
        prompt.style.opacity = 1;
        prompt.innerHTML = `<span style='color:#ff00ff; font-weight:bold; letter-spacing:2px;'>[ DEV: ${msg} ]</span>`;
        setTimeout(() => prompt.style.opacity = 0, 1500);
    }
document.addEventListener('click', () => { if (State.gameActive) { controls.lock(); AudioSys.resume(); } });
document.getElementById('btn-start').addEventListener('click', () => { 
    document.getElementById('start-screen').classList.remove('active'); 
    AudioSys.resume(); controls.lock(); CameraAPI.gameStarted = true; CameraAPI.setMode('none'); State.gameActive = true; animate(); 
});
CameraAPI.init();
document.getElementById('btn-panic').addEventListener('click', () => CameraAPI.panic());
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
