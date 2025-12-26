/* level_design.js - GEOMETRY FIX & UV MAPPING ENGINE */
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// --- TEXTURE ENGINE ---
function createPsychWall() {
    const s = 512;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');
    
    // Base: Sickly Plaster
    ctx.fillStyle = '#222'; ctx.fillRect(0,0,s,s);
    
    // Noise
    const iData = ctx.getImageData(0,0,s,s);
    for(let i=0; i<iData.data.length; i+=4) {
        const v = (Math.random()-0.5)*20;
        iData.data[i]+=v; iData.data[i+1]+=v; iData.data[i+2]+=v;
    }
    ctx.putImageData(iData,0,0);
    
    // Mold/Rot
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#111';
    for(let i=0; i<20; i++) {
        ctx.beginPath(); ctx.arc(Math.random()*s, Math.random()*s, Math.random()*50, 0, Math.PI*2); ctx.fill();
    }
    
    // Water Trails
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2;
    for(let i=0; i<15; i++) {
        const x = Math.random()*s;
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,s); ctx.stroke();
    }
    
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
    return t;
}

function createTraumaFloor() {
    const s = 512;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0,0,s,s);
    
    // Tiles
    const ts = 64; 
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    for(let y=0; y<s; y+=ts) {
        for(let x=0; x<s; x+=ts) {
            const v = 20 + Math.random()*10;
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.fillRect(x,y,ts,ts);
            ctx.strokeRect(x,y,ts,ts);
        }
    }
    // Grime
    ctx.fillStyle = 'rgba(20,10,0,0.3)';
    ctx.beginPath(); ctx.arc(256,256,200,0,Math.PI*2); ctx.fill();
    
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
    return t;
}

function createDoorTexture(type) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#2a2222'; ctx.fillRect(0,0,256,512);
    ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.strokeRect(0,0,256,512);
    
    ctx.font = '30px Courier'; ctx.textAlign = 'center'; ctx.fillStyle = '#800';
    if(type === 'face') {
        ctx.fillText("OBSERVE", 128, 200);
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
        for(let i=0; i<40; i++) {
            ctx.beginPath(); ctx.moveTo(Math.random()*256, Math.random()*512); 
            ctx.lineTo(Math.random()*256, Math.random()*512); ctx.stroke();
        }
    } else if (type === 'hand') {
        ctx.fillText("RITUAL", 128, 200);
        ctx.fillStyle = '#400'; ctx.beginPath(); ctx.arc(128,300,50,0,Math.PI*2); ctx.fill();
    }
    return new THREE.CanvasTexture(c);
}

// --- MATERIALS ---
const textures = {
    wall: createPsychWall(),
    floor: createTraumaFloor(),
    doorFace: createDoorTexture('face'),
    doorHand: createDoorTexture('hand')
};

const mats = {
    concrete: new THREE.MeshStandardMaterial({ map: textures.wall, roughness: 0.9, color: 0x888888 }),
    floor: new THREE.MeshStandardMaterial({ map: textures.floor, roughness: 0.6 }),
    rust: new THREE.MeshStandardMaterial({ color: 0x443333, roughness: 0.8 }),
    black: new THREE.MeshStandardMaterial({ color: 0x000000 }),
    emissiveRed: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x880000 }),
    emissiveGreen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x008800 }),
    emissiveBlue: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x000088 })
};

// --- GEOMETRY ENGINE (FIXED UVs) ---
function fixUVs(geometry, w, h, d) {
    const pos = geometry.attributes.position;
    const norm = geometry.attributes.normal;
    const uv = geometry.attributes.uv;
    const scale = 0.5;

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i); const y = pos.getY(i); const z = pos.getZ(i);
        const nx = Math.abs(norm.getX(i)); const ny = Math.abs(norm.getY(i)); const nz = Math.abs(norm.getZ(i));

        // Automatic Planar Mapping based on Face Normal
        if (nx > 0.5) { // Side Face (X-facing) -> Use Z/Y
            uv.setXY(i, z * scale, y * scale);
        } else if (ny > 0.5) { // Top/Bottom Face (Y-facing) -> Use X/Z
            uv.setXY(i, x * scale, z * scale);
        } else { // Front/Back Face (Z-facing) -> Use X/Y
            uv.setXY(i, x * scale, y * scale);
        }
    }
    uv.needsUpdate = true;
}

// --- LEVEL BUILDER ---
export function initLevel(scene, walls, batteries, State, mirrorTexture) {

    // Floor & Ceiling
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 600), mats.floor);
    floor.rotation.x = -Math.PI/2; floor.position.z = 200; 
    // Manual repeat for large floor
    floor.geometry.attributes.uv.array.forEach((v,i) => floor.geometry.attributes.uv.array[i] *= 20);
    scene.add(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(100, 600), mats.concrete);
    ceil.rotation.x = Math.PI/2; ceil.position.set(0, 4.5, 200);
    scene.add(ceil);

    function addWall(x, y, z, w, h, d, mat = mats.concrete, name="wall") {
        const geo = new THREE.BoxGeometry(w, h, d);
        fixUVs(geo, w, h, d);
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.castShadow = true; m.receiveShadow = true; m.name = name;
        scene.add(m);
        walls.push(m);
        return m;
    }

    // ================= ACT I: CELLAR =================
    // SEGMENTED WALLS (To prevent overlapping the Door Frame at Z=5)
    // Segment 1: Start to Door
    addWall(-5.5, 2.25, -2.5, 1, 4.5, 25); // Ends at Z=10 roughly? No, center -2.5, depth 25 -> -15 to +10.
    // Wait, let's be precise. Door is at Z=5.
    // Wall 1: -10 to 4. Center = -3. Depth = 14.
    addWall(-5.5, 2.25, -3, 1, 4.5, 14); 
    addWall(5.5, 2.25, -3, 1, 4.5, 14);

    // Wall 2: 6 to 15. Center = 10.5. Depth = 9.
    addWall(-5.5, 2.25, 10.5, 1, 4.5, 9);
    addWall(5.5, 2.25, 10.5, 1, 4.5, 9);

    // Back Wall
    addWall(0, 2.25, -10, 12, 4.5, 1);

    // EMOTION DOOR FRAME (Z=5)
    // Left Frame (Center -4. Right Edge -1.5)
    addWall(-4.0, 2.25, 5, 5, 4.5, 1); 
    // Right Frame (Center 4. Left Edge 1.5)
    addWall(4.0, 2.25, 5, 5, 4.5, 1);
    // Header (Center 0. Bottom > 3.8. Door top is 3.8)
    // Y=4.2, Height=0.4. Bottom=4.0. Safe gap.
    addWall(0, 4.2, 5, 3, 0.4, 1);

    const emoDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.15), new THREE.MeshStandardMaterial({ map: textures.doorFace }));
    emoDoor.position.set(0, 1.9, 5); emoDoor.name = "emotion_door"; 
    scene.add(emoDoor); walls.push(emoDoor);

    const note1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.6), new THREE.MeshBasicMaterial({color:0xddddaa}));
    note1.position.set(1.6, 2.0, 4.9); note1.rotation.z = -0.1; note1.name = "emotion_note"; scene.add(note1);

    // ================= ACT II: TUNNEL =================
    // SEGMENTED WALLS (Door is at Z=40)
    // Segment 1: Z 15 to 39. Center 27. Depth 24.
    addWall(-4.5, 2.25, 27, 2, 4.5, 24, mats.rust);
    addWall(4.5, 2.25, 27, 2, 4.5, 24, mats.rust);

    // Segment 2: Z 41 to 50. Center 45.5. Depth 9.
    addWall(-4.5, 2.25, 45.5, 2, 4.5, 9, mats.rust);
    addWall(4.5, 2.25, 45.5, 2, 4.5, 9, mats.rust);

    function addBat(x, z) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.3,8), new THREE.MeshStandardMaterial({color:0x222, emissive:0x004400}));
        b.position.set(x,0.15,z); b.name="battery"; scene.add(b); batteries.push(b);
    }
    addBat(0, 15); addBat(1, 25);

    // Mirror (Z=35)
    const mFrame = addWall(3.2, 2.25, 35, 0.2, 3.5, 2.5, mats.rust);
    if(mirrorTexture) {
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), new THREE.MeshBasicMaterial({map:mirrorTexture, color:0x88aa88}));
        glass.position.set(-0.11,0,0); glass.rotation.y = -Math.PI/2; glass.scale.x = -1; mFrame.add(glass);
    }

    // HAND DOOR FRAME (Z=40)
    addWall(-4.0, 2.25, 40, 5, 4.5, 1.2); // Thicker frame to hide seams
    addWall(4.0, 2.25, 40, 5, 4.5, 1.2);
    addWall(0, 4.2, 40, 3, 0.4, 1.2); // Header

    const handDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.15), new THREE.MeshStandardMaterial({ map: textures.doorHand }));
    handDoor.position.set(0, 1.9, 40); handDoor.name = "hand_door";
    scene.add(handDoor); walls.push(handDoor);

    const note2 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshBasicMaterial({color:0xddddaa}));
    note2.position.set(2.5, 1.01, 38); note2.rotation.x = -Math.PI/2; note2.name = "hand_note"; scene.add(note2);

    // ================= ACT III: STATUE =================
    addWall(-6, 2.25, 70, 1, 4.5, 60);
    addWall(6, 2.25, 70, 1, 4.5, 60);

    const statue = new THREE.Group();
    const sBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.7, 8), mats.rust);
    const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.3), mats.rust); sHead.position.y = 1;
    const eyes = new THREE.Mesh(new THREE.SphereGeometry(0.05), mats.emissiveRed); 
    const eyes2 = eyes.clone(); eyes.position.set(-0.1, 1.1, 0.25); eyes2.position.set(0.1, 1.1, 0.25);
    statue.add(sBody, sHead, eyes, eyes2); statue.position.set(0, 0.9, 80);
    scene.add(statue);

    const note3 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshBasicMaterial({color:0xddddaa}));
    note3.position.set(0, 0.02, 62); note3.rotation.x = -Math.PI/2; note3.name = "statue_note"; scene.add(note3);

    // ================= ACT IV: VOID =================
    const memHint = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.2,0.2), new THREE.MeshStandardMaterial({color:0xffffff}));
    memHint.position.set(0, 2, 95); scene.add(memHint);
    
    addWall(0, 0.5, 95, 1, 1, 1, mats.black); 

    // Align Puzzle
    addWall(-4.5, 2.25, 100, 4, 4.5, 1);
    addWall(4.5, 2.25, 100, 4, 4.5, 1);
    addWall(0, 4.0, 100, 5, 1, 1); // This is a puzzle wall, distinct from doors

    const alignP = new THREE.Mesh(new THREE.PlaneGeometry(4,4), new THREE.MeshStandardMaterial({map: textures.wall, transparent:true, opacity:0.9}));
    alignP.position.set(-4, 2, 110); alignP.rotation.y = Math.PI/2; alignP.name = "align_puzzle"; scene.add(alignP);
    const hiddenSym = new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.MeshBasicMaterial({color:0xff0000, transparent:true, opacity:0}));
    hiddenSym.position.set(-3.9, 2, 110); hiddenSym.rotation.y = Math.PI/2; scene.add(hiddenSym);

    // Pit
    addWall(-6, 2.25, 135, 1, 4.5, 20); addWall(6, 2.25, 135, 1, 4.5, 20);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 22), new THREE.MeshStandardMaterial({color:0x333333, transparent:true, opacity:0.6}));
    bridge.position.set(0,0.1,135); scene.add(bridge);

    // ================= ACT V: FINAL =================
    const locs = [[2, 55], [-2, 60], [0, 85], [3, 105], [-3, 115], [0, 150], [2, 170], [-2, 175], [-3, 190], [0, 195], [3, 200]];
    locs.forEach(l => addBat(l[0], l[1]));

    const obsDoor = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.2), mats.rust);
    obsDoor.position.set(0, 2, 230); scene.add(obsDoor); walls.push(obsDoor);

    const dL = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 0.2), mats.emissiveRed); dL.position.set(-3, 1.5, 245);
    const dC = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 0.2), mats.emissiveGreen); dC.position.set(0, 1.5, 245);
    const dR = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 0.2), mats.emissiveBlue); dR.position.set(3, 1.5, 245);
    scene.add(dL, dC, dR); walls.push(dL, dC, dR);
    
    addWall(0, 2.25, 250, 20, 4.5, 1);

    const ritualCursor = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color:0x00ff00, transparent:true, opacity:0}));
    scene.add(ritualCursor);

    return {
        statue, ritualCursor, handDoor, emoDoor, finalDoor: null, obsDoor,
        doorL: dL, doorC: dC, doorR: dR, memoryHint: memHint, hiddenSymbol: hiddenSym, ghostBridge: bridge,
        puzzleTextures: { hidden: mats.concrete.map, revealed: mats.rust.map }
    };
}
