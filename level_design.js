/* level_design.js - OPTIMIZED TEXTURES (No Freeze) */
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// --- FAST TEXTURE GENERATORS (No heavy loops) ---

function createNoiseCanvas(color) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color; ctx.fillRect(0,0,64,64);
    
    // Simple "fake" noise using small rects instead of pixel loops
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    for(let i=0; i<20; i++) {
        ctx.fillRect(Math.random()*64, Math.random()*64, 2, 2);
    }
    return c;
}

function createWallTexture() {
    const c = createNoiseCanvas('#333333');
    const ctx = c.getContext('2d');
    
    // Bottom grime gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0.5, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = grad; ctx.fillRect(0,0,64,64);

    return new THREE.CanvasTexture(c);
}

function createFloorTexture() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    
    // Dark Tiles
    ctx.fillStyle = '#111'; ctx.fillRect(0,0,128,128);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
    ctx.strokeRect(0,0,128,128); // Tile border

    return new THREE.CanvasTexture(c);
}

function createDoorTexture(type) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const ctx = c.getContext('2d');
    
    // Wood/Metal Base
    ctx.fillStyle = '#221100'; ctx.fillRect(0,0,128,256);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 6; ctx.strokeRect(4,4,120,248);

    if (type === 'face') {
        ctx.fillStyle = '#800'; ctx.font = '50px monospace'; ctx.textAlign = 'center';
        ctx.fillText("👁", 64, 140);
    } else if (type === 'hand') {
        ctx.fillStyle = '#800'; ctx.font = '50px monospace'; ctx.textAlign = 'center';
        ctx.fillText("✋", 64, 140);
        ctx.fillStyle = '#500'; ctx.fillRect(60, 160, 8, 40); // Blood drip
    } else if (type === 'final') {
        ctx.fillStyle = '#222'; ctx.fillRect(0,0,128,256);
        ctx.fillStyle = '#f00'; ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center';
        ctx.fillText("EXIT", 64, 120);
    }
    return new THREE.CanvasTexture(c);
}

function createNoteTexture() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ddccaa'; ctx.fillRect(0,0,128,128);
    ctx.fillStyle = '#000'; 
    for(let i=20; i<110; i+=10) ctx.fillRect(10, i, 100 + Math.random()*8, 1);
    ctx.fillStyle = 'rgba(150,0,0,0.5)'; ctx.beginPath(); ctx.arc(100, 100, 20, 0, Math.PI*2); ctx.fill();
    return new THREE.CanvasTexture(c);
}

function createBatteryTexture() {
    const c = document.createElement('canvas'); c.width = 32; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0f0'; ctx.fillRect(0,0,32,64);
    ctx.fillStyle = '#000'; ctx.fillRect(0,10,32,44); // Stripe
    return new THREE.CanvasTexture(c);
}

function createBloodTexture() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(100,0,0,0.8)';
    ctx.beginPath(); ctx.arc(32, 32, 20, 0, Math.PI*2); ctx.fill();
    return new THREE.CanvasTexture(c);
}

// --- MATERIALS ---
const mats = {
    wall: new THREE.MeshStandardMaterial({ map: createWallTexture(), roughness: 0.9 }),
    floor: new THREE.MeshStandardMaterial({ map: createFloorTexture(), roughness: 0.5 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.4 }),
    black: new THREE.MeshStandardMaterial({ color: 0x000000 }),
    emissiveRed: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff0000, emissiveIntensity: 2 }),
    emissiveGreen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x00ff00, emissiveIntensity: 2 }),
    emissiveBlue: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x0000ff, emissiveIntensity: 2 }),
};

// --- INIT LEVEL ---
export function initLevel(scene, walls, batteries, State, mirrorTexture) {
    
    // Helpers
    function addWall(x, y, z, w, h, d, mat = mats.wall) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
        scene.add(mesh); walls.push(mesh);
    }
    function addDoorway(z, doorObj) {
        addWall(-3.5, 2.25, z, 3, 4.5, 1); 
        addWall(3.5, 2.25, z, 3, 4.5, 1); 
        addWall(0, 4, z, 4, 1, 1);
        if(doorObj) {
            doorObj.position.set(0, 1.5, z);
            scene.add(doorObj); walls.push(doorObj);
        }
    }
    function addBat(x, z) {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.3,8), new THREE.MeshStandardMaterial({map:createBatteryTexture()}));
        mesh.position.set(x, 0.15, z); mesh.name="battery"; scene.add(mesh); batteries.push(mesh);
    }

    // Floor/Ceiling
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 600), mats.floor);
    floor.rotation.x = -Math.PI/2; floor.position.z = 200; scene.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(100, 600), mats.wall);
    ceil.rotation.x = Math.PI/2; ceil.position.set(0, 4.5, 200); scene.add(ceil);

    // ACT I
    addWall(-5, 2.25, 15, 1, 4.5, 60); addWall(5, 2.25, 15, 1, 4.5, 60); addWall(0, 2.25, -5, 10, 4.5, 1);
    const emoDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.2), new THREE.MeshStandardMaterial({ map: createDoorTexture('face') }));
    emoDoor.name = "emotion_door"; addDoorway(5, emoDoor);
    const n1 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({map: createNoteTexture()}));
    n1.position.set(1.8, 1.8, 4.6); n1.rotation.y = Math.PI; n1.name="emotion_note"; scene.add(n1);

    // ACT II
    addWall(-3, 2.25, 45, 1, 4.5, 40, mats.metal); addWall(3, 2.25, 45, 1, 4.5, 40, mats.metal);
    addBat(0, 15); addBat(1, 25);
    const handDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.2), new THREE.MeshStandardMaterial({ map: createDoorTexture('hand') }));
    handDoor.name = "hand_door"; addDoorway(40, handDoor);
    const n2 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({map: createNoteTexture()}));
    n2.position.set(2, 0.5, 38); n2.rotation.x = -Math.PI/2; n2.name="hand_note"; scene.add(n2);
    
    const cursorMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0 }); 
    const ritualCursor = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), cursorMat);
    scene.add(ritualCursor);

    // ACT III
    addWall(-6, 2.25, 80, 1, 4.5, 60); addWall(6, 2.25, 80, 1, 4.5, 60);
    const statue = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.8, 12), mats.wall);
    statue.position.set(0, 0.9, 80); scene.add(statue);
    const n3 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({map: createNoteTexture()}));
    n3.position.set(0, 0.02, 62); n3.rotation.x = -Math.PI/2; n3.name="statue_note"; scene.add(n3);

    // ACT IV
    const memoryHint = new THREE.Mesh(new THREE.BoxGeometry(1,1,0.1), new THREE.MeshStandardMaterial({color: 0xffffff}));
    memoryHint.position.set(0, 2, 95); scene.add(memoryHint);
    addWall(0, 0.5, 95, 1, 1, 1, mats.black); 
    addDoorway(100, null);

    const alignWall = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({color: 0x000000, transparent:true, opacity: 0.9}));
    alignWall.position.set(-4, 2, 110); alignWall.rotation.y = Math.PI/2; alignWall.name = "align_puzzle"; scene.add(alignWall);
    const hiddenSymbol = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity: 0}));
    hiddenSymbol.position.set(-3.9, 2, 110); hiddenSymbol.rotation.y = Math.PI/2; scene.add(hiddenSymbol);

    // PIT
    addWall(-5.5, 2.25, 135, 1, 4.5, 20); addWall(5.5, 2.25, 135, 1, 4.5, 20);
    const pitCover = new THREE.Mesh(new THREE.PlaneGeometry(10, 20), mats.black);
    pitCover.rotation.x = -Math.PI/2; pitCover.position.set(0, 0.05, 135); scene.add(pitCover);
    const ghostBridge = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 20), new THREE.MeshStandardMaterial({color: 0x444444, transparent: true, opacity: 0.5}));
    ghostBridge.position.set(0, 0.06, 135); scene.add(ghostBridge);

    // HALL
    for(let z=170; z<230; z+=10) { addWall(-4, 2.25, z, 1, 4.5, 1); addWall(4, 2.25, z, 1, 4.5, 1); }
    addWall(-4.5, 2.25, 200, 1, 4.5, 60); addWall(4.5, 2.25, 200, 1, 4.5, 60);
    const obsDoor = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.2), new THREE.MeshStandardMaterial({color:0x550000}));
    obsDoor.name = "obs_door"; addDoorway(230, obsDoor);

    // FINAL
    const dL = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 0.2), mats.emissiveRed); 
    const dC = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 0.2), mats.emissiveGreen); 
    const dR = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 0.2), mats.emissiveBlue); 
    dL.position.set(-3, 1.5, 245); dC.position.set(0, 1.5, 245); dR.position.set(3, 1.5, 245);
    scene.add(dL); scene.add(dC); scene.add(dR); walls.push(dL); walls.push(dC); walls.push(dR);
    addWall(-4, 2.25, 245, 1, 4.5, 1); addWall(4, 2.25, 245, 1, 4.5, 1);
    const finalDoor = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshBasicMaterial({visible:false}));
    finalDoor.position.set(0, 2, 255); finalDoor.name = "final_door"; scene.add(finalDoor);
    addWall(0, 2.25, 260, 20, 4.5, 1);

    // DEBRIS
    const bloodMat = new THREE.MeshBasicMaterial({ map: createBloodTexture(), transparent: true, opacity: 0.8, depthWrite: false });
    for(let z=-5; z<250; z+=10) {
        if(z>120 && z<150) continue;
        if(Math.random()>0.5) {
            const b = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), bloodMat);
            b.rotation.x = -Math.PI/2; b.position.set((Math.random()-0.5)*4, 0.05, z); scene.add(b);
        }
    }

    return { statue, ritualCursor, handDoor, emoDoor, finalDoor, obsDoor, doorL, doorC, doorR, memoryHint, hiddenSymbol, ghostBridge, puzzleTextures: {hidden:null, revealed:null} };
}
