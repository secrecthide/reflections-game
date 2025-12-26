/* level_design.js - TEXTURES & GEOMETRY */
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// --- TEXTURE GENERATORS ---
function applyNoise(ctx, w, h, opacity) {
    const iData = ctx.getImageData(0,0,w,h);
    for(let i=0; i<iData.data.length; i+=4) {
        const grain = (Math.random() - 0.5) * 50 * opacity;
        iData.data[i] = Math.max(0, Math.min(255, iData.data[i] + grain));
        iData.data[i+1] = Math.max(0, Math.min(255, iData.data[i+1] + grain));
        iData.data[i+2] = Math.max(0, Math.min(255, iData.data[i+2] + grain));
    }
    ctx.putImageData(iData, 0, 0);
}

function createTexture(color) {
    const c = document.createElement('canvas'); c.width=64; c.height=64;
    const x = c.getContext('2d'); x.fillStyle=color; x.fillRect(0,0,64,64);
    applyNoise(x, 64, 64, 0.5);
    return new THREE.CanvasTexture(c);
}

function createFloorTexture() {
    const s = 512;
    const c = document.createElement('canvas'); c.width=s; c.height=s;
    const x = c.getContext('2d');
    x.fillStyle = '#1a1a1a'; x.fillRect(0,0,s,s);
    x.strokeStyle = '#0a0a0a'; x.lineWidth = 4;
    const tileS = 128;
    for(let i=0; i<=s; i+=tileS) {
        x.beginPath(); x.moveTo(i,0); x.lineTo(i,s); x.stroke();
        x.beginPath(); x.moveTo(0,i); x.lineTo(s,i); x.stroke();
    }
    applyNoise(x, s, s, 0.8);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; 
    tex.repeat.set(20, 120);
    return tex;
}

function createWallTexture() {
    const s = 512;
    const c = document.createElement('canvas'); c.width=s; c.height=s;
    const x = c.getContext('2d');
    x.fillStyle = '#151515'; x.fillRect(0,0,s,s);
    const iData = x.getImageData(0,0,s,s);
    for(let i=0; i<iData.data.length; i+=4) {
        const grain = (Math.random() - 0.5) * 50;
        const val = Math.max(0, Math.min(80, 21 + grain));
        iData.data[i] = val; iData.data[i+1] = val; iData.data[i+2] = val; iData.data[i+3] = 255; 
    }
    x.putImageData(iData, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16; 
    return tex;
}

function createDoorTexture(type) {
    const c = document.createElement('canvas'); c.width=256; c.height=512;
    const x = c.getContext('2d');
    x.fillStyle='#1a0f05'; x.fillRect(0,0,256,512);
    x.fillStyle='#2e1a0a'; for(let i=0; i<512; i+=4) x.fillRect(0, i, 256, 1); 
    applyNoise(x, 256, 512, 0.4);
    x.strokeStyle='#000'; x.lineWidth=10; x.strokeRect(10,10,236,492);

    if (type === 'face') {
        x.strokeStyle='#ddd'; x.lineWidth=5; x.lineCap='round';
        x.beginPath(); x.arc(80,200,25,0,Math.PI*2); x.stroke(); 
        x.beginPath(); x.arc(176,200,25,0,Math.PI*2); x.stroke(); 
        x.beginPath(); x.ellipse(128, 280, 40, 60, 0, 0, Math.PI*2); x.stroke(); 
        x.strokeStyle='#500'; x.beginPath(); x.moveTo(20,20); x.lineTo(230,490); x.stroke();
    } else if (type === 'hand') {
        x.fillStyle='#880000'; x.beginPath(); x.arc(128,256,60,0,Math.PI*2); x.fill();
    } else if (type === 'final') {
        x.fillStyle='#333'; x.fillRect(0,0,256,512);
        x.fillStyle='#521'; for(let i=0; i<20; i++) x.fillRect(Math.random()*256, Math.random()*512, 50, 50);
        applyNoise(x, 256, 512, 1);
        x.fillStyle='#f00'; x.font="50px Courier"; x.textAlign="center"; x.fillText("EXIT", 128, 256);
    }
    return new THREE.CanvasTexture(c);
}

function createEnemyTexture() {
    const s = 256;
    const c = document.createElement('canvas'); c.width=s; c.height=s;
    const x = c.getContext('2d');
    x.fillStyle = '#ccc'; x.fillRect(0,0,s,s);
    x.strokeStyle = '#555'; x.lineWidth = 2;
    for(let i=0; i<15; i++) {
        x.beginPath(); x.moveTo(Math.random()*s, Math.random()*s);
        x.bezierCurveTo(Math.random()*s, Math.random()*s, Math.random()*s, Math.random()*s, Math.random()*s, Math.random()*s);
        x.stroke();
    }
    x.fillStyle = '#000'; x.fillRect(60, 80, 40, 40); x.fillRect(160, 80, 40, 40); x.fillRect(80, 180, 100, 20); 
    applyNoise(x, s, s, 0.3);
    return new THREE.CanvasTexture(c);
}

function createNoteTexture() {
    const c = document.createElement('canvas'); c.width=256; c.height=350;
    const x = c.getContext('2d'); x.fillStyle='#eaddcf'; x.fillRect(0,0,256,350); 
    x.fillStyle='#111'; 
    for(let i=60; i<300; i+=20) {
        x.beginPath(); x.moveTo(20, i); x.lineTo(20 + Math.random()*200, i + (Math.random()-0.5)*5); x.stroke();
    }
    x.fillStyle = "rgba(150, 0, 0, 0.4)"; x.beginPath(); x.arc(200, 300, 40, 0, Math.PI*2); x.fill();
    return new THREE.CanvasTexture(c);
}

function createBatteryTexture() {
    const c = document.createElement('canvas'); c.width=64; c.height=128;
    const x = c.getContext('2d'); x.fillStyle='#000'; x.fillRect(0,0,64,128); 
    x.fillStyle='#0f0'; x.fillRect(2,10,60,100); x.fillStyle='#ccc'; x.fillRect(16,0,32,10); 
    x.fillStyle='#ff0'; x.font="30px Arial"; x.fillText("⚡", 15, 70);
    return new THREE.CanvasTexture(c);
}

function createBloodTexture() {
    const c = document.createElement('canvas'); c.width=128; c.height=128;
    const x = c.getContext('2d');
    x.fillStyle = '#8a0303';
    for(let i=0; i<20; i++) {
        x.globalAlpha = Math.random();
        x.beginPath();
        x.arc(64 + (Math.random()-0.5)*60, 64 + (Math.random()-0.5)*60, Math.random()*15, 0, Math.PI*2);
        x.fill();
    }
    return new THREE.CanvasTexture(c);
}

function createTextTexture(text, color) {
    const c = document.createElement('canvas'); c.width=256; c.height=128;
    const x = c.getContext('2d'); x.fillStyle = color; x.font = "bold 40px Courier";
    x.textAlign = "center"; x.fillText(text, 128, 64);
    return new THREE.CanvasTexture(c);
}

const puzzleTextures = {
    hidden: createTexture('#000'), 
    revealed: createTexture('#ff0000'), 
    glow: createTexture('#00ff00'), 
};

// --- BUILDER FUNCTIONS ---

function adjustBoxUVs(geometry) {
    const pos = geometry.attributes.position;
    const norm = geometry.attributes.normal;
    const uv = geometry.attributes.uv;
    const scale = 0.5; 
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i); const y = pos.getY(i); const z = pos.getZ(i);
        const nx = Math.abs(norm.getX(i)); const ny = Math.abs(norm.getY(i));
        if (nx > 0.5) uv.setXY(i, z * scale, y * scale);
        else if (ny > 0.5) uv.setXY(i, x * scale, z * scale);
        else uv.setXY(i, x * scale, y * scale);
    }
    uv.needsUpdate = true;
}

// --- MAIN INIT FUNCTION ---
// Returns an object containing critical interactables for the Game Logic
export function initLevel(scene, walls, batteries, State, mirrorTexture) {
    
    const wallMatCommon = new THREE.MeshStandardMaterial({ map: createWallTexture(), roughness: 0.9 });
    
    // Helpers encapsulated here to use the passed Scene/Arrays
    function createWall(x, y, z, w, h, d, color) {
        const geo = new THREE.BoxGeometry(w, h, d);
        adjustBoxUVs(geo);
        const mesh = new THREE.Mesh(geo, wallMatCommon);
        mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
        scene.add(mesh); walls.push(mesh);
        return mesh;
    }

    function createBattery(x, y, z) {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.3,16), new THREE.MeshStandardMaterial({map:createBatteryTexture()}));
        mesh.position.set(x,y,z); mesh.castShadow=true; mesh.name="battery"; scene.add(mesh); batteries.push(mesh);
    }

    function createLagMirror(x, y, z) {
        if(!mirrorTexture) return;
        const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2,3.2,0.2), new THREE.MeshStandardMaterial({color:0x333}));
        frame.position.set(x,y,z); frame.rotation.y = -Math.PI/2; frame.castShadow=true; scene.add(frame); walls.push(frame);
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(2,3), new THREE.MeshStandardMaterial({map:mirrorTexture, roughness:0.1, metalness:0.2, emissive:0x111111}));
        glass.position.set(0,0,0.11); glass.scale.x=-1; frame.add(glass);
    }

    function buildCorridor(startZ, endZ, width) {
        const length = endZ - startZ;
        const wallGeo = new THREE.BoxGeometry(1, 4.5, length);
        adjustBoxUVs(wallGeo);
        
        const leftW = new THREE.Mesh(wallGeo, wallMatCommon);
        leftW.position.set(-(width/2 + 0.5), 2.25, startZ + length/2);
        leftW.castShadow = true; leftW.receiveShadow = true;
        scene.add(leftW); walls.push(leftW);

        const rightW = new THREE.Mesh(wallGeo, wallMatCommon);
        rightW.position.set((width/2 + 0.5), 2.25, startZ + length/2);
        rightW.castShadow = true; rightW.receiveShadow = true;
        scene.add(rightW); walls.push(rightW);

        const ceilGeo = new THREE.PlaneGeometry(width, length);
        const uvs = ceilGeo.attributes.uv;
        for(let i=0; i<uvs.count; i++) uvs.setXY(i, uvs.getX(i) * (width/4), uvs.getY(i) * (length/4));
        const ceiling = new THREE.Mesh(ceilGeo, new THREE.MeshStandardMaterial({ color: 0x050505, side: THREE.DoubleSide }));
        ceiling.position.set(0, 4.5, startZ + length/2); ceiling.rotation.x = Math.PI / 2;
        scene.add(ceiling);
    }

    // --- CONSTRUCTION ---

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 600), new THREE.MeshStandardMaterial({map:createFloorTexture(), roughness:0.8}));
    floor.rotation.x = -Math.PI/2; floor.position.z = 200; floor.receiveShadow=true; scene.add(floor);

    buildCorridor(-10, 300, 8.5);

    // ACT I
    createWall(0, 2.25, -5, 14, 4.5, 1, 0x333333); createWall(-5, 2.25, 0, 1, 4.5, 14, 0x333333); 
    createWall(5, 2.25, 0, 1, 4.5, 14, 0x333333); createWall(0, 4, 5, 3, 1, 1, 0x333333);           
    createWall(-3.5, 2.25, 5, 4, 4.5, 1, 0x333333); createWall(3.5, 2.25, 5, 4, 4.5, 1, 0x333333);  

    const emoDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.15), new THREE.MeshStandardMaterial({ map: createDoorTexture('face') }));
    emoDoor.position.set(0, 1.9, 5); emoDoor.name = "emotion_door"; scene.add(emoDoor); walls.push(emoDoor);

    const note1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.02), new THREE.MeshStandardMaterial({ map: createNoteTexture(), emissive: 0x222222 }));
    note1.position.set(-2.0, 1.6, 4.45); note1.rotation.y = Math.PI/6; note1.name = "emotion_note"; scene.add(note1);

    // ACT II
    createWall(-3, 2.25, 25, 1, 4.5, 40, 0x222222); createWall(3, 2.25, 25, 1, 4.5, 40, 0x222222);  
    createBattery(0, 0.2, 15); createBattery(1, 0.2, 25); 
    createLagMirror(2.9, 1.8, 35); 
    createWall(-3.5, 2.25, 40, 4, 4.5, 1, 0x222222); createWall(3.5, 2.25, 40, 4, 4.5, 1, 0x222222); createWall(0, 4, 40, 3, 1, 1, 0x222222);

    // Clutter
    [-4.5, 4.5].forEach(x => {
        for(let z=185; z<=215; z+=5) createWall(x, 1.5, z, 1, 3, 0.5, 0x101010); 
    });

    const handDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.15), new THREE.MeshStandardMaterial({ map: createDoorTexture('hand') }));
    handDoor.position.set(0, 1.9, 40); handDoor.name = "hand_door"; scene.add(handDoor); walls.push(handDoor);

    const cursorMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0 }); 
    const ritualCursor = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), cursorMat);
    scene.add(ritualCursor);

    const note2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.02), new THREE.MeshStandardMaterial({ map: createNoteTexture(), emissive: 0x222222 }));
    note2.position.set(1.5, 1.6, 39.4); note2.rotation.y = -Math.PI/6; note2.name = "hand_note"; scene.add(note2);

    // ACT III
    createWall(-4, 2.25, 65, 1, 4.5, 50, 0x111111); createWall(4, 2.25, 65, 1, 4.5, 50, 0x111111); createWall(0, 4, 65, 9, 1, 50, 0x000000);        
    const statueMat = new THREE.MeshStandardMaterial({ map: createEnemyTexture(), roughness: 0.5 });
    const statue = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.8, 16), statueMat);
    statue.position.set(0, 0.9, 80); statue.castShadow = true; scene.add(statue);

    const finalDoor = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.15), new THREE.MeshStandardMaterial({ map: createDoorTexture('final') }));
    finalDoor.position.set(0, 2, 250); finalDoor.name = "final_door"; scene.add(finalDoor); walls.push(finalDoor);

    const note3 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.02), new THREE.MeshStandardMaterial({ map: createNoteTexture(), emissive: 0x222222 }));
    note3.position.set(-2.5, 1.6, 42.0); note3.rotation.y = Math.PI/4; note3.name = "statue_note"; scene.add(note3);

    // ACT IV
    const memoryHint = new THREE.Mesh(new THREE.BoxGeometry(1,1,0.1), new THREE.MeshStandardMaterial({color: 0xffffff}));
    const memColors = [0xff0000, 0x00ff00, 0x0000ff];
    memoryHint.material.color.setHex(memColors[State.memorySymbol]);
    memoryHint.position.set(0, 2, 95); scene.add(memoryHint);
    createWall(-4, 2.25, 100, 3, 4.5, 1, 0x111111); createWall(4, 2.25, 100, 3, 4.5, 1, 0x111111); createWall(0, 4, 100, 5, 1, 1, 0x111111);        
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.8), new THREE.MeshStandardMaterial({color: 0x111111}));
    stand.position.set(0, 0.75, 95); scene.add(stand);

    const alignWall = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({map: puzzleTextures.hidden, transparent:true, opacity: 0.8}));
    alignWall.position.set(-4, 2, 110); alignWall.rotation.y = Math.PI/2; alignWall.name = "align_puzzle"; scene.add(alignWall);
    const hiddenSymbol = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map: createTextTexture("👁️", "#fff"), transparent:true, opacity: 0}));
    hiddenSymbol.position.set(-3.9, 2, 110); hiddenSymbol.rotation.y = Math.PI/2; scene.add(hiddenSymbol);

    const pitCover = new THREE.Mesh(new THREE.PlaneGeometry(10, 20), new THREE.MeshBasicMaterial({color: 0x000000}));
    pitCover.rotation.x = -Math.PI/2; pitCover.position.set(0, 0.05, 135); scene.add(pitCover);
    const ghostBridge = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 24), new THREE.MeshBasicMaterial({color: 0x222222, transparent: true, opacity: 0}));
    ghostBridge.position.set(0, 0.1, 135); scene.add(ghostBridge);
    createWall(-5.5, 2.25, 135, 1, 4.5, 20, 0x111111); createWall(5.5, 2.25, 135, 1, 4.5, 20, 0x111111);  

    // Pit Sign
    const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.5, 0.15), new THREE.MeshStandardMaterial({color: 0x553311}));
    signPost.position.set(2, 0.75, 132.2); scene.add(signPost);
    const signTex = createTextTexture("⚠ ABYSS", "#880000"); // Reusing text texture logic somewhat
    const signFace = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.5), new THREE.MeshBasicMaterial({map: signTex, color: 0xffaaaa}));
    signFace.position.set(2, 1.3, 131.95); signFace.rotation.y = Math.PI; scene.add(signFace);

    createLagMirror(0, 2, 160); 
    const realWallCode = new THREE.Mesh(new THREE.PlaneGeometry(1,0.5), new THREE.MeshBasicMaterial({color:0x000000})); 
    realWallCode.position.set(0, 3.5, 159.5); scene.add(realWallCode);

    createWall(-3, 2.25, 190, 1, 4.5, 40, 0x111111); createWall(3, 2.25, 190, 1, 4.5, 40, 0x111111);
    const stopMarker = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 32), new THREE.MeshBasicMaterial({color: 0x880000, side: THREE.DoubleSide}));
    stopMarker.rotation.x = -Math.PI/2; stopMarker.position.set(0, 0.05, 198); scene.add(stopMarker);

    const obsDoor = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.2), new THREE.MeshStandardMaterial({color: 0x550000}));
    obsDoor.position.set(0, 2, 230); scene.add(obsDoor); walls.push(obsDoor);

    const doorGeo = new THREE.BoxGeometry(1.5, 3, 0.2);
    const doorL = new THREE.Mesh(doorGeo, new THREE.MeshStandardMaterial({color: 0xff0000})); 
    const doorC = new THREE.Mesh(doorGeo, new THREE.MeshStandardMaterial({color: 0x00ff00})); 
    const doorR = new THREE.Mesh(doorGeo, new THREE.MeshStandardMaterial({color: 0x0000ff})); 
    doorL.position.set(-3, 1.5, 245); doorC.position.set(0, 1.5, 245); doorR.position.set(3, 1.5, 245);
    scene.add(doorL); scene.add(doorC); scene.add(doorR);
    walls.push(doorL); walls.push(doorC); walls.push(doorR);

    // Decorate
    const locations = [[2, 55], [-2, 60], [0, 85], [3, 105], [-3, 115], [0, 150], [2, 170], [-2, 175], [-3, 190], [0, 195], [3, 200], [-2, 205], [0, 210], [2, 215], [-3, 220], [0, 225], [3, 230], [-3, 235], [3, 235]];
    locations.forEach(loc => createBattery(loc[0], 0.2, loc[1]));

    const junkGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5); const junkMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
    const canGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.25, 8); const canMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 });
    const bloodMat = new THREE.MeshBasicMaterial({ map: createBloodTexture(), transparent: true, opacity: 0.9, depthWrite: false });

    for(let z=-5; z<250; z+=2) {
        if (Math.random() < 0.1) {
            const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), bloodMat);
            decal.rotation.x = -Math.PI/2; decal.position.set((Math.random()-0.5)*6, 0.01, z); decal.rotation.z = Math.random() * Math.PI;
            scene.add(decal);
        }
        if (Math.random() < 0.05) {
            const box = new THREE.Mesh(junkGeo, junkMat);
            box.position.set((Math.random() > 0.5 ? 1 : -1) * (2 + Math.random()), 0.25, z); box.rotation.y = Math.random(); scene.add(box);
        }
        if (Math.random() < 0.1) {
            const can = new THREE.Mesh(canGeo, canMat);
            can.position.set((Math.random()-0.5) * 8, 0.125, z); can.rotation.z = Math.PI/2; can.rotation.y = Math.random(); scene.add(can);
        }
    }

    // Return object map for interaction
    return {
        statue, ritualCursor, handDoor, emoDoor, finalDoor, obsDoor,
        doorL, doorC, doorR, memoryHint, hiddenSymbol, ghostBridge, puzzleTextures
    };
}
