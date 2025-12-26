/* level_design.js - SAFE MODE (Instant Load) */
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// --- SIMPLE TEXTURE GENERATORS (No Loops = No Lag) ---

function createSolidTexture(color, dirtLevel = 0) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    
    // Base Color
    ctx.fillStyle = color; ctx.fillRect(0,0,64,64);
    
    // Simple Dirt (Just one rect, no loop)
    if(dirtLevel > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 50, 64, 14); // Bottom grime
    }
    
    const tex = new THREE.CanvasTexture(c);
    return tex;
}

function createDoorTexture(type) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const ctx = c.getContext('2d');

    // Dark Metal
    ctx.fillStyle = '#111'; ctx.fillRect(0,0,128,256);
    ctx.strokeStyle = '#444'; ctx.lineWidth = 4; ctx.strokeRect(2,2,124,252);

    if (type === 'face') {
        ctx.fillStyle = '#a00'; ctx.font = '40px sans-serif'; ctx.textAlign='center';
        ctx.fillText("👁", 64, 140);
        ctx.font = '12px sans-serif'; ctx.fillStyle = '#ccc';
        ctx.fillText("OBSERVE", 64, 100);
    } else if (type === 'hand') {
        ctx.fillStyle = '#a00'; ctx.font = '40px sans-serif'; ctx.textAlign='center';
        ctx.fillText("✋", 64, 140);
        ctx.fillStyle = '#500'; ctx.fillRect(60, 160, 8, 40); // Blood drip
    }

    return new THREE.CanvasTexture(c);
}

function createNoteTexture() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ddc'; ctx.fillRect(0,0,64,64);
    ctx.fillStyle = '#000'; ctx.fillRect(10,10,44,2); ctx.fillRect(10,20,44,2);
    ctx.fillStyle = '#800'; ctx.beginPath(); ctx.arc(40,40,10,0,6.28); ctx.fill();
    return new THREE.CanvasTexture(c);
}

// --- MATERIALS ---
// Using standard materials with simple textures ensures stability
const mats = {
    wall: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 }),
    floor: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.5 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.8 }),
    black: new THREE.MeshStandardMaterial({ color: 0x000000 }),
    emissiveRed: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff0000, emissiveIntensity: 1.5 }),
    emissiveGreen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x00ff00, emissiveIntensity: 1.5 }),
    emissiveBlue: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x0000ff, emissiveIntensity: 1.5 }),
};

// --- INIT LEVEL ---
export function initLevel(scene, walls, batteries, State, mirrorTexture) {
    console.log("Level Generation Started..."); // Debug Log

    // 1. ENVIRONMENT
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 600), mats.floor);
    floor.rotation.x = -Math.PI/2; floor.position.set(0, 0, 200); floor.receiveShadow = true;
    scene.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(40, 600), mats.wall);
    ceiling.rotation.x = Math.PI/2; ceiling.position.set(0, 4.5, 200);
    scene.add(ceiling);

    // Helper: Add Wall
    function addWall(x, y, z, w, h, d, mat = mats.wall) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true; mesh.receiveShadow = true;
        scene.add(mesh);
        walls.push(mesh); // Physics
        return mesh;
    }

    // Helper: Door Frame (No Clipping)
    function addDoorway(z, totalW, doorW, doorObj) {
        const sideW = (totalW - doorW) / 2;
        addWall(-(doorW/2 + sideW/2), 2.25, z, sideW, 4.5, 1); // Left
        addWall((doorW/2 + sideW/2), 2.25, z, sideW, 4.5, 1);  // Right
        addWall(0, 4, z, doorW, 1, 1); // Top
        if(doorObj) {
            doorObj.position.set(0, 1.5, z);
            scene.add(doorObj); walls.push(doorObj);
        }
    }

    // --- ZONE 1: CELLAR ---
    addWall(-5, 2.25, 15, 1, 4.5, 60); 
    addWall(5, 2.25, 15, 1, 4.5, 60); 
    addWall(0, 2.25, -5, 10, 4.5, 1);

    const emoDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.2), new THREE.MeshStandardMaterial({ map: createDoorTexture('face') }));
    emoDoor.name = "emotion_door";
    addDoorway(5, 10, 2.8, emoDoor);

    const note1 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: createNoteTexture() }));
    note1.position.set(1.8, 1.8, 4.6); note1.rotation.y = Math.PI; note1.name = "emotion_note"; scene.add(note1);

    // --- ZONE 2: INDUSTRIAL ---
    // Narrow Hall
    addWall(-3, 2.25, 45, 1, 4.5, 40, mats.metal); 
    addWall(3, 2.25, 45, 1, 4.5, 40, mats.metal);

    const handDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.2), new THREE.MeshStandardMaterial({ map: createDoorTexture('hand') }));
    handDoor.name = "hand_door";
    addDoorway(40, 6, 2.8, handDoor);

    const note2 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: createNoteTexture() }));
    note2.position.set(2, 0.5, 38); note2.rotation.x = -Math.PI/2; note2.name = "hand_note"; scene.add(note2);

    const cursorMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0 }); 
    const ritualCursor = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), cursorMat);
    scene.add(ritualCursor);

    // Batteries
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.3,8), mats.emissiveGreen);
    b1.position.set(0,0.15,20); b1.name="battery"; scene.add(b1); batteries.push(b1);

    // --- ZONE 3: STATUE ---
    addWall(-6, 2.25, 80, 1, 4.5, 60); 
    addWall(6, 2.25, 80, 1, 4.5, 60);

    const statueGroup = new THREE.Group();
    const sBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.6), mats.wall);
    const sHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), mats.wall); sHead.position.y = 1.1;
    const sEye1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.05), mats.emissiveRed); sEye1.position.set(-0.1, 1.15, 0.21);
    const sEye2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.05), mats.emissiveRed); sEye2.position.set(0.1, 1.15, 0.21);
    statueGroup.add(sBody, sHead, sEye1, sEye2);
    statueGroup.position.set(0, 0.9, 80); 
    scene.add(statueGroup);

    const note3 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: createNoteTexture() }));
    note3.position.set(0, 0.02, 62); note3.rotation.x = -Math.PI/2; note3.name = "statue_note"; scene.add(note3);

    // --- ZONE 4: PUZZLES ---
    const memoryHint = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), new THREE.MeshStandardMaterial({color:0xffffff}));
    memoryHint.position.set(0, 2, 95); scene.add(memoryHint);
    
    addWall(0, 0.5, 95, 1, 1, 1, mats.black); // Pedestal
    addDoorway(100, 10, 4, null); // Open archway
    
    const alignWall = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({color: 0x000000, transparent:true, opacity: 0.9}));
    alignWall.position.set(-4, 2, 110); alignWall.rotation.y = Math.PI/2; alignWall.name = "align_puzzle"; scene.add(alignWall);
    
    const hiddenSymbol = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({color: 0xffffff, transparent:true, opacity: 0}));
    hiddenSymbol.position.set(-3.9, 2, 110); hiddenSymbol.rotation.y = Math.PI/2; scene.add(hiddenSymbol);

    // The Pit
    const pitCover = new THREE.Mesh(new THREE.PlaneGeometry(10, 20), mats.black);
    pitCover.rotation.x = -Math.PI/2; pitCover.position.set(0, 0.05, 135); scene.add(pitCover);
    
    const ghostBridge = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 20), new THREE.MeshStandardMaterial({color: 0x555555, transparent: true, opacity: 0.5}));
    ghostBridge.position.set(0, 0.06, 135); scene.add(ghostBridge);

    addWall(-5, 2.25, 135, 1, 4.5, 20); 
    addWall(5, 2.25, 135, 1, 4.5, 20);

    // --- ZONE 5: HALL ---
    for(let z=170; z<230; z+=15) {
        addWall(-4, 2.25, z, 1, 4.5, 1, mats.wall); 
        addWall(4, 2.25, z, 1, 4.5, 1, mats.wall);
    }
    addWall(-4.5, 2.25, 200, 1, 4.5, 60, mats.black); 
    addWall(4.5, 2.25, 200, 1, 4.5, 60, mats.black);

    const obsDoor = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.2), new THREE.MeshStandardMaterial({color:0x550000}));
    obsDoor.name = "obs_door";
    addDoorway(230, 8, 3, obsDoor);

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

    // END TRIGGER (Invisible wall to finish game)
    const endTrigger = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshBasicMaterial({visible:false}));
    endTrigger.position.set(0, 2, 255); endTrigger.name = "final_door";
    scene.add(endTrigger);
    
    addWall(0, 2.25, 260, 20, 4.5, 1); // Back wall

    console.log("Level Generation Complete.");

    return {
        statue: statueGroup, ritualCursor, handDoor, emoDoor, finalDoor: endTrigger, obsDoor,
        doorL, doorC, doorR, memoryHint, hiddenSymbol, ghostBridge, 
        puzzleTextures: { hidden: mats.wall.map, revealed: mats.wall.map }
    };
}
