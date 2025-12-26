/* level_design.js - OPTIMIZED ARCHITECTURE */
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// --- OPTIMIZED TEXTURE GENERATORS ---

function createConcreteTexture() {
    const s = 512;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');

    // Base
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(0, 0, s, s);

    // Optimized Noise (Faster)
    for(let i=0; i<5000; i++) { // Reduced from 40k to 5k
        ctx.fillStyle = Math.random() > 0.5 ? '#333' : '#222';
        const size = Math.random() * 4;
        ctx.fillRect(Math.random()*s, Math.random()*s, size, size);
    }
    
    // Panels
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, s/2); ctx.lineTo(s, s/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s/2, 0); ctx.lineTo(s/2, s); ctx.stroke();

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createTileTexture() {
    const s = 512;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');

    // Grout
    ctx.fillStyle = '#111'; ctx.fillRect(0,0,s,s);

    // Tiles
    const tileS = 128; 
    const gap = 4;
    for(let y=0; y<s; y+=tileS) {
        for(let x=0; x<s; x+=tileS) {
            const isDark = (x+y)%(tileS*2) === 0;
            ctx.fillStyle = isDark ? '#1a1a1a' : '#222';
            ctx.fillRect(x+gap, y+gap, tileS-gap*2, tileS-gap*2);
        }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 20); 
    return tex;
}

function createDoorTexture(type) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512;
    const ctx = c.getContext('2d');

    // Base Metal
    ctx.fillStyle = '#151515'; ctx.fillRect(0,0,256,512);
    
    // Rust
    const grad = ctx.createRadialGradient(128, 256, 100, 128, 256, 300);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(60,30,20,0.5)');
    ctx.fillStyle = grad; ctx.fillRect(0,0,256,512);

    // Frame
    ctx.strokeStyle = '#333'; ctx.lineWidth = 8; ctx.strokeRect(4,4,248,504);

    if (type === 'face') {
        ctx.fillStyle = '#eee'; ctx.font = '20px monospace'; ctx.textAlign = 'center';
        ctx.fillText("OBSERVATION", 128, 150);
        // Removed Emoji for safety
        ctx.strokeStyle = '#500'; ctx.lineWidth = 4; 
        ctx.beginPath(); ctx.arc(128, 280, 40, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(128, 280, 10, 0, Math.PI*2); ctx.fill();
    } else if (type === 'hand') {
        ctx.fillStyle = '#500';
        ctx.beginPath(); ctx.arc(128, 250, 40, 0, Math.PI*2); ctx.fill();
        ctx.fillRect(118, 290, 20, 60); 
    } 

    return new THREE.CanvasTexture(c);
}

function createNotePaper() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 300;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#eaddcf'; ctx.fillRect(0,0,256,300);
    ctx.fillStyle = '#111'; ctx.font = '10px monospace';
    for(let i=40; i<280; i+=20) ctx.fillText("---------------------------", 10, i);
    ctx.fillStyle = 'rgba(120,0,0,0.4)'; ctx.beginPath(); ctx.arc(200, 250, 30, 0, Math.PI*2); ctx.fill();
    return new THREE.CanvasTexture(c);
}

// --- MATERIALS ---
// Defined outside initLevel to prevent recreation lag
const mats = {
    concrete: new THREE.MeshStandardMaterial({ map: createConcreteTexture(), roughness: 0.8 }),
    floor: new THREE.MeshStandardMaterial({ map: createTileTexture(), roughness: 0.4, metalness: 0.3 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7, metalness: 0.6 }),
    black: new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1.0 }),
    emissiveRed: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff0000, emissiveIntensity: 2 }),
    emissiveGreen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x00ff00, emissiveIntensity: 2 }),
    emissiveBlue: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x0000ff, emissiveIntensity: 2 }),
};

// --- MAIN INIT ---
export function initLevel(scene, walls, batteries, State, mirrorTexture) {

    // Floor & Ceiling
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 600), mats.floor);
    floor.rotation.x = -Math.PI/2; floor.position.set(0, 0, 200); floor.receiveShadow = true;
    scene.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(30, 600), mats.concrete);
    ceiling.rotation.x = Math.PI/2; ceiling.position.set(0, 4.5, 200);
    scene.add(ceiling);

    // Helpers inside function to access Scene/Walls
    function addWall(x, y, z, w, h, d, mat = mats.concrete) {
        const geo = new THREE.BoxGeometry(w, h, d);
        // Simple UV adjust
        const uv = geo.attributes.uv;
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
             const px = pos.getX(i); const py = pos.getY(i); const pz = pos.getZ(i);
             if(Math.abs(px) > Math.abs(pz)) uv.setXY(i, pz*0.5, py*0.5); else uv.setXY(i, px*0.5, py*0.5);
        }
        uv.needsUpdate = true;
        
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true; mesh.receiveShadow = true;
        scene.add(mesh); walls.push(mesh);
        return mesh;
    }

    function addDoorway(z, totalWidth, doorWidth, doorHeight, doorObj) {
        const sideW = (totalWidth - doorWidth) / 2;
        const xLeft = -(doorWidth/2 + sideW/2);
        const xRight = (doorWidth/2 + sideW/2);
        addWall(xLeft, 2.25, z, sideW, 4.5, 1);
        addWall(xRight, 2.25, z, sideW, 4.5, 1);
        addWall(0, 4.5 - (4.5-doorHeight)/2, z, doorWidth, 4.5-doorHeight, 1);
        if(doorObj) {
            doorObj.position.set(0, doorHeight/2, z);
            scene.add(doorObj); walls.push(doorObj);
        }
    }

    function addBat(x, z) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.3,16), new THREE.MeshStandardMaterial({color:0x44ff44, emissive:0x004400}));
        m.position.set(x, 0.15, z); m.name = "battery"; m.castShadow=true; scene.add(m); batteries.push(m);
    }

    // --- ZONE 1: CELLAR ---
    addWall(-5, 2.25, 15, 1, 4.5, 60); addWall(5, 2.25, 15, 1, 4.5, 60); addWall(0, 2.25, -5, 10, 4.5, 1);

    const emoDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.2), new THREE.MeshStandardMaterial({ map: createDoorTexture('face') }));
    emoDoor.name = "emotion_door";
    addDoorway(5, 10, 2.8, 3.8, emoDoor);

    const note1 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: createNotePaper() }));
    note1.position.set(1.8, 1.8, 4.9); note1.rotation.y = Math.PI; note1.name = "emotion_note"; scene.add(note1);

    // --- ZONE 2: INDUSTRIAL ---
    addWall(-3, 2.25, 45, 1, 4.5, 40, mats.metal); addWall(3, 2.25, 45, 1, 4.5, 40, mats.metal);
    addBat(0, 15); addBat(1, 25);

    const handDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.2), new THREE.MeshStandardMaterial({ map: createDoorTexture('hand') }));
    handDoor.name = "hand_door";
    addDoorway(40, 6, 2.8, 3.8, handDoor);

    const note2 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: createNotePaper() }));
    note2.position.set(2, 1.01, 38); note2.rotation.x = -Math.PI/2; note2.name = "hand_note"; scene.add(note2);

    const cursorMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0 }); 
    const ritualCursor = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), cursorMat);
    scene.add(ritualCursor);

    // --- ZONE 3: STATUE ---
    addWall(-6, 2.25, 80, 1, 4.5, 60); addWall(6, 2.25, 80, 1, 4.5, 60);

    const statueGroup = new THREE.Group();
    const sBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.6), mats.concrete);
    const sHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), mats.concrete); sHead.position.y = 1.1;
    const sEye1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.05), mats.emissiveRed); sEye1.position.set(-0.1, 1.15, 0.21);
    const sEye2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.05), mats.emissiveRed); sEye2.position.set(0.1, 1.15, 0.21);
    statueGroup.add(sBody, sHead, sEye1, sEye2);
    statueGroup.position.set(0, 0.9, 80); 
    scene.add(statueGroup);

    const note3 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: createNotePaper() }));
    note3.position.set(0, 0.02, 62); note3.rotation.x = -Math.PI/2; note3.name = "statue_note"; scene.add(note3);

    // --- ZONE 4: PUZZLES ---
    const memoryHint = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), new THREE.MeshStandardMaterial({color:0xffffff}));
    memoryHint.position.set(0, 2, 95); scene.add(memoryHint);
    addWall(0, 0.5, 95, 1, 1, 1, mats.black); 
    addDoorway(100, 10, 4, 4, null);
    
    const alignWall = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({color: 0x000000, transparent:true, opacity: 0.9}));
    alignWall.position.set(-4, 2, 110); alignWall.rotation.y = Math.PI/2; alignWall.name = "align_puzzle"; scene.add(alignWall);
    const hiddenSymbol = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({map: createDoorTexture('face'), transparent:true, opacity: 0}));
    hiddenSymbol.position.set(-3.9, 2, 110); hiddenSymbol.rotation.y = Math.PI/2; scene.add(hiddenSymbol);

    // Pit
    const pitCover = new THREE.Mesh(new THREE.PlaneGeometry(10, 20), mats.black);
    pitCover.rotation.x = -Math.PI/2; pitCover.position.set(0, 0.05, 135); scene.add(pitCover);
    const ghostBridge = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 20), new THREE.MeshStandardMaterial({color: 0x666666, transparent: true, opacity: 0.5}));
    ghostBridge.position.set(0, 0.06, 135); scene.add(ghostBridge);
    addWall(-5, 2.25, 135, 1, 4.5, 20); addWall(5, 2.25, 135, 1, 4.5, 20);

    // --- ZONE 5: HALL ---
    for(let z=170; z<230; z+=10) {
        addWall(-4, 2.25, z, 1, 4.5, 1); addWall(4, 2.25, z, 1, 4.5, 1);
    }
    addWall(-4.5, 2.25, 200, 1, 4.5, 60); addWall(4.5, 2.25, 200, 1, 4.5, 60);
    const obsDoor = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.2), new THREE.MeshStandardMaterial({color:0x550000}));
    obsDoor.name = "obs_door";
    addDoorway(230, 8, 3, 4, obsDoor);

    // --- ZONE 6: FINAL ---
    const doorGeo = new THREE.BoxGeometry(1.5, 3, 0.2);
    const doorL = new THREE.Mesh(doorGeo, mats.emissiveRed); 
    const doorC = new THREE.Mesh(doorGeo, mats.emissiveGreen); 
    const doorR = new THREE.Mesh(doorGeo, mats.emissiveBlue); 
    
    const finalZ = 245;
    addWall(-4, 2.25, finalZ, 1, 4.5, 1);
    doorL.position.set(-3, 1.5, finalZ); scene.add(doorL); walls.push(doorL);
    addWall(-2, 2.25, finalZ, 1, 4.5, 1); 
    doorC.position.set(0, 1.5, finalZ); scene.add(doorC); walls.push(doorC);
    addWall(2, 2.25, finalZ, 1, 4.5, 1);
    doorR.position.set(3, 1.5, finalZ); scene.add(doorR); walls.push(doorR);
    addWall(4, 2.25, finalZ, 1, 4.5, 1);

    // GAME END TRIGGER
    // The player walks through the open door and hits this invisible wall to win
    const endTrigger = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({visible: false}));
    endTrigger.position.set(0, 2, 255);
    endTrigger.name = "final_door"; // Matches game.js logic to trigger end screen
    scene.add(endTrigger);
    
    // Visual Backstop
    addWall(0, 2.25, 260, 20, 4.5, 1);

    return {
        statue: statueGroup, ritualCursor, handDoor, emoDoor, finalDoor: endTrigger, obsDoor,
        doorL, doorC, doorR, memoryHint, hiddenSymbol, ghostBridge, 
        puzzleTextures: { hidden: mats.concrete.map, revealed: mats.concrete.map }
    };
}
