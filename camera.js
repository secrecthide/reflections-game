/* camera.js - USER LOGIC + GAME HOOKS (MediaPipe Utils) */

// Helper: Forces the browser to paint a frame before continuing.
// This ensures the "Loading..." text actually appears before the heavy AI loads.
const yieldToUI = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 100)));

function log(msg, progress) {
    const logDiv = document.getElementById('system-log');
    const bar = document.getElementById('progress-bar-fill');
    
    // Generate a cool "Hex Timestamp"
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
    const hex = "0x" + Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, '0');

    const formattedMsg = `<span style="color:#558855; font-family:'Courier New'; font-size:0.75rem;">[${time}::${hex}]</span> ${msg}`;

    if (logDiv) { 
        const entry = document.createElement('div');
        entry.innerHTML = formattedMsg;
        entry.style.borderBottom = "1px solid #112211";
        entry.style.padding = "2px 0";
        logDiv.appendChild(entry); 
        logDiv.scrollTop = logDiv.scrollHeight; 
    }
    if (bar && progress !== undefined) bar.style.width = progress + "%";
}

export const CameraAPI = {
    videoElement: document.getElementById('webcamVideo'),
    calibrationCanvas: document.getElementById('calibrationCanvas'),
    calCtx: null,
    
    // MOTION (Required for Stalker)
    motionCanvas: document.createElement('canvas'),
    motionCtx: null,
    lastFrameData: null,
    motionScore: 0,
    
    // RECORDING
    clips: [],
    isRecording: false,
    
    hands: null,
    faceMesh: null,
    camera: null,
    
    isReady: false,
    gameStarted: false,
    activeMode: 'calibration', 
    
    // DATA
    handDetected: false,
    handPosition: { x: 0.5, y: 0.5 }, 
    emotions: { isScared: false, smile: false },
    
    // VISUALIZATIONS
    currentHandLandmarks: null,
    currentFaceLandmarks: null,

    async init() {
        this.calCtx = this.calibrationCanvas.getContext('2d');
        this.motionCanvas.width = 32;
        this.motionCanvas.height = 24;
        this.motionCtx = this.motionCanvas.getContext('2d');
        
        // --- BOOT SEQUENCE ---
        
        log("Initializing Kernel...", 5);
        await yieldToUI();

        log("Mounting Virtual Environment...", 10);
        await yieldToUI();

        // 1. HAND TRACKING
        log("Loading Module: <span style='color:#00ff88'>HAND_TRACKING_V2.lib</span>", 15);
        
        if (typeof Hands === 'undefined') {
            log("<span style='color:red'>ERROR: AI Library (Hands) not found. Check Internet.</span>", 0);
            return;
        }

        log("<span style='color:#ffaa00'>[WARNING] HIGH CPU LOAD INCOMING...</span>", 20);
        await yieldToUI(); // Force paint before freeze

        try {
            this.hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
            this.hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
            this.hands.onResults(this.onHandResults.bind(this));
            log("Module HAND_TRACKING mounted successfully.", 40);
        } catch (e) {
            log(`<span style='color:red'>ERROR: Hand Module Failed: ${e.message}</span>`, 0);
        }
        await yieldToUI();

        // 2. FACE MESH
        log("Loading Module: <span style='color:#00ff88'>FACE_GEOMETRY_MESH.lib</span>", 50);
        log("Allocating Tensor Memory...", 55);
        await yieldToUI();

        try {
            this.faceMesh = new FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
            this.faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
            this.faceMesh.onResults(this.onFaceResults.bind(this));
            log("Module FACE_GEOMETRY mounted successfully.", 80);
        } catch (e) {
            log(`<span style='color:red'>ERROR: Face Module Failed: ${e.message}</span>`, 0);
        }
        await yieldToUI();

        // 3. CAMERA
        log("Requesting Optical Sensor Access...", 85);
        
        try {
            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    this.calculateMotion();

                    // Only run AI if game is running or in calibration
                    if (!this.gameStarted) {
                        // CALIBRATION PHASE
                        if(this.hands) await this.hands.send({image: this.videoElement});
                        if(this.faceMesh) await this.faceMesh.send({image: this.videoElement});
                        this.drawCalibration();
                        
                        if (!this.isReady && this.hands && this.faceMesh) { 
                            this.isReady = true; 
                            this.switchToCalibrationMode(); 
                        }
                    } else {
                        // GAMEPLAY PHASE (Optimization: Only run what's needed)
                        if (this.activeMode === 'hands' && this.hands) await this.hands.send({image: this.videoElement});
                        else if (this.activeMode === 'face' && this.faceMesh) await this.faceMesh.send({image: this.videoElement});
                    }
                },
                width: 320, height: 240
            });

            log("Starting Video Stream...", 95);
            await this.camera.start();
            log("<span style='color:#00ff88; font-weight:bold;'>SYSTEM ONLINE. WAITING FOR INPUT.</span>", 100);
            
        } catch(e) {
            log(`<span style='color:#ff3333'>[FATAL ERROR] OPTICAL SENSOR FAILED: ${e.message}</span>`, 100);
            console.error(e);
        }
    },

    calculateMotion() {
        if (!this.motionCtx) return;
        this.motionCtx.drawImage(this.videoElement, 0, 0, 32, 24);
        const frame = this.motionCtx.getImageData(0, 0, 32, 24);
        const data = frame.data;

        if (!this.lastFrameData) { this.lastFrameData = data; return; }

        let diff = 0;
        for (let i = 0; i < data.length; i += 4) diff += Math.abs(data[i+1] - this.lastFrameData[i+1]);
        this.motionScore = Math.min(100, diff / 1000); 
        this.lastFrameData = data;
    },

    recordScare(label) {
        const stream = this.videoElement.srcObject || this.videoElement.captureStream();
        if (!stream || this.isRecording) return;
        
        this.isRecording = true;
        const status = document.getElementById('camera-status');
        if(status) { status.style.color = "#00ff00"; status.innerText = "CAPTURING EVENT"; }

        const chunks = [];
        try {
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                this.clips.push({ time: new Date().toLocaleTimeString(), label: label, url: url, id: Date.now() });
                this.isRecording = false;
                if(status) { status.style.color = "#ff0000"; status.innerText = "● LIVE"; }
            };
            recorder.start();
            setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 3000);
        } catch (e) { this.isRecording = false; }
    },

    switchToCalibrationMode() {
        // Enable the start button
        const btn = document.getElementById('btn-start');
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = "<span class='btn-text'>ENTER THE SIMULATION</span>";
            btn.style.borderColor = "#00ff88";
            btn.style.color = "#00ff88";
            btn.style.cursor = "pointer";
        }

        // Swap UI
        if(window.stopPong) window.stopPong();
        const loadPhase = document.getElementById('loading-phase');
        const calPhase = document.getElementById('calibration-phase');
        if(loadPhase) loadPhase.style.display = 'none';
        if(calPhase) calPhase.style.display = 'block';
    },

    drawCalibration() {
        if (!this.calCtx) return;
        const width = this.calibrationCanvas.width;
        const height = this.calibrationCanvas.height;
        this.calCtx.save();
        this.calCtx.clearRect(0, 0, width, height);
        this.calCtx.drawImage(this.videoElement, 0, 0, width, height);
        if (this.currentHandLandmarks) {
            drawConnectors(this.calCtx, this.currentHandLandmarks, HAND_CONNECTIONS, {color: '#00ff88', lineWidth: 2});
            drawLandmarks(this.calCtx, this.currentHandLandmarks, {color: '#00ff88', lineWidth: 1, radius: 2});
        }
        if (this.currentFaceLandmarks) {
            drawConnectors(this.calCtx, this.currentFaceLandmarks, FACEMESH_TESSELATION, {color: '#00aaff', lineWidth: 0.5});
        }
        this.calCtx.restore();
    },

    setMode(mode) {
        if(this.activeMode !== mode) {
            this.activeMode = mode;
            const h = document.getElementById('hand-icon');
            const f = document.getElementById('face-icon');
            if(h) h.style.opacity = mode === 'hands' ? 1 : 0.2;
            if(f) f.style.opacity = mode === 'face' ? 1 : 0.2;
            this.handDetected = false;
            this.emotions.isScared = false;
        }
    },

    onHandResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            this.currentHandLandmarks = results.multiHandLandmarks[0];
            this.handDetected = true;
            const icon = document.getElementById('hand-icon');
            if(icon) icon.style.color = '#00ff88';
            const p = this.currentHandLandmarks[9]; 
            this.handPosition.x = p.x; 
            this.handPosition.y = p.y; 
        } else {
            this.currentHandLandmarks = null;
            this.handDetected = false;
            const icon = document.getElementById('hand-icon');
            if(icon) icon.style.color = '#ffffff';
        }
    },

    onFaceResults(results) {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const face = results.multiFaceLandmarks[0];
            this.currentFaceLandmarks = face;
            const icon = document.getElementById('face-icon');
            if(icon) icon.style.color = '#00ff88';
            
            const upperLip = face[13];
            const lowerLip = face[14];
            const forehead = face[10];
            const chin = face[152];

            const faceHeight = Math.abs(forehead.y - chin.y);
            const mouthOpen = Math.abs(upperLip.y - lowerLip.y);
            
            this.emotions.isScared = ((mouthOpen / faceHeight) > 0.10); 
        } else {
            this.currentFaceLandmarks = null;
            const icon = document.getElementById('face-icon');
            if(icon) icon.style.color = '#ffffff';
            this.emotions.isScared = false;
        }
    },

    panic() { window.location.reload(); }
};