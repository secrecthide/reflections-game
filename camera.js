/* camera.js - POLISHED TEXT & PERMISSIONS */

function log(msg, progress) {
    const logDiv = document.getElementById('system-log');
    const bar = document.getElementById('progress-bar-fill');
    if (logDiv) { logDiv.innerHTML += `> ${msg}<br>`; logDiv.scrollTop = logDiv.scrollHeight; }
    if (bar && progress !== null) bar.style.width = progress + "%";
}

export const CameraAPI = {
    videoElement: document.getElementById('webcamVideo'),
    calibrationCanvas: document.getElementById('calibrationCanvas'),
    calCtx: null,
    
    motionCanvas: document.createElement('canvas'),
    motionCtx: null,
    lastFrameData: null,
    motionScore: 0,
    
    clips: [],
    isRecording: false,
    
    hands: null,
    faceMesh: null,
    camera: null,
    
    isReady: false,
    gameStarted: false,
    activeMode: 'calibration', 
    
    handDetected: false,
    handPosition: { x: 0.5, y: 0.5 }, 
    emotions: { isScared: false, smile: false },
    
    currentHandLandmarks: null,
    currentFaceLandmarks: null,

    async init() {
        this.calCtx = this.calibrationCanvas.getContext('2d');
        this.motionCanvas.width = 32;
        this.motionCanvas.height = 24;
        this.motionCtx = this.motionCanvas.getContext('2d');
        
        return new Promise((resolve) => {
            log("System Boot...", 5);

            setTimeout(() => {
                log("Loading Hand Tracking...", 20);
                
                if(typeof Hands === 'undefined') {
                    this.showError("AI LIB MISSING. CHECK INTERNET.");
                    return;
                }

                this.hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
                this.hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
                this.hands.onResults(this.onHandResults.bind(this));
                
                setTimeout(() => {
                    log("Loading Face Metrics...", 50);
                    this.faceMesh = new FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
                    this.faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
                    this.faceMesh.onResults(this.onFaceResults.bind(this));
                    
                    setTimeout(() => {
                        log("Acquiring Optical Feed...", 80);
                        
                        try {
                            this.camera = new Camera(this.videoElement, {
                                onFrame: async () => {
                                    this.calculateMotion();
                                    if (!this.gameStarted) {
                                        // CALIBRATION PHASE
                                        await this.hands.send({image: this.videoElement});
                                        await this.faceMesh.send({image: this.videoElement});
                                        this.drawCalibration();
                                        
                                        // Only unlock if we haven't already
                                        if (!this.isReady) { 
                                            this.isReady = true; 
                                            this.switchToCalibrationMode(); 
                                        }
                                    } else {
                                        // GAME MODE
                                        if (this.activeMode === 'hands') await this.hands.send({image: this.videoElement});
                                        else if (this.activeMode === 'face') await this.faceMesh.send({image: this.videoElement});
                                    }
                                },
                                width: 320, height: 240
                            });

                            this.camera.start()
                                .then(() => {
                                    // UPDATED TEXT: Clarifies we are waiting for AI, not the user
                                    log("CAMERA ACTIVE. SYNCHRONIZING AI...", 95);
                                })
                                .catch(error => {
                                    console.error(error);
                                    this.showError("CAMERA BLOCKED: " + error.message);
                                });

                        } catch(e) {
                            console.error(e);
                            this.showError("INIT FAILED: " + e.message);
                        }
                    }, 500);
                }, 500);
            }, 500);
        });
    },

    showError(msg) {
        log("<span style='color:red'>" + msg + "</span>", 100);
        const btn = document.getElementById('btn-start');
        btn.innerText = "ERROR - SEE LOGS";
        btn.style.borderColor = "red";
        btn.style.color = "red";
        
        const box = document.getElementById('error-box');
        if(box) {
            box.style.display = 'block';
            box.innerHTML += `FATAL ERROR:<br>${msg}<br>----------------<br>`;
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
        // Only verify completion here
        log("<span style='color:#00ff88'>NEURAL LINK ESTABLISHED.</span>", 100);
        
        if(window.stopPong) window.stopPong();
        
        document.getElementById('loading-phase').style.display = 'none';
        document.getElementById('calibration-phase').style.display = 'block';
        
        const btn = document.getElementById('btn-start');
        btn.disabled = false;
        btn.innerText = "ENTER THE DARKNESS";
        btn.style.borderColor = "#00ff88";
        btn.style.color = "#00ff88";
        btn.style.cursor = "pointer";
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
            document.getElementById('hand-icon').style.color = '#00ff88';
            const p = this.currentHandLandmarks[9]; 
            this.handPosition.x = p.x; 
            this.handPosition.y = p.y; 
        } else {
            this.currentHandLandmarks = null;
            this.handDetected = false;
            document.getElementById('hand-icon').style.color = '#ffffff';
        }
    },

    onFaceResults(results) {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const face = results.multiFaceLandmarks[0];
            this.currentFaceLandmarks = face;
            document.getElementById('face-icon').style.color = '#00ff88';
            const upperLip = face[13];
            const lowerLip = face[14];
            const forehead = face[10];
            const chin = face[152];
            const faceHeight = Math.abs(forehead.y - chin.y);
            const mouthOpen = Math.abs(upperLip.y - lowerLip.y);
            this.emotions.isScared = ((mouthOpen / faceHeight) > 0.10); 
        } else {
            this.currentFaceLandmarks = null;
            document.getElementById('face-icon').style.color = '#ffffff';
            this.emotions.isScared = false;
        }
    },

    panic() { window.location.reload(); }
};
