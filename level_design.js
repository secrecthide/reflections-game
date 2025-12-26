/* level_design.js - FIXED GEOMETRY & TEXTURE MAPPING */
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// --- TEXTURE GENERATORS (IMPROVED REALISM) ---

// 1. WALLS: Heavy industrial decay (Soot, Mold, peeling paint)
function createPsychWall() {
    const s = 512;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');

    // Base: Dark, sickly plaster
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(0, 0, s, s);

    // Layer 1: High frequency noise (Concrete grain)
    const iData = ctx.getImageData(0,0,s,s);
    for(let i=0; i<iData.data.length; i+=4) {
        const grain = (Math.random() - 0.5) * 30;
        iData.data[i] += grain; iData.data[i+1] += grain; iData.data[i+2] += grain;
    }
    ctx.putImageData(iData, 0, 0);

    // Layer 2: Black Mold Clusters (The "Rot")
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#151515';
    for(let i=0; i<15; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const r = 20 + Math.random() * 60;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.fill();
    }
    
    // Layer 3: Vertical Water Stains (Subtle, not cartoonish)
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 40;
    for(let i=0; i<10; i++) {
        const x = Math.random() * s;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, s); ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

// 2. FLOOR: Scratched, dirty tiles
function createTraumaFloor() {
    const s = 512;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#111'; ctx.fillRect(0,0,s,s);

    // Tiles
    const tileS = 128;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    
    for(let y=0; y<s; y+=tileS) {
        for(let x=0; x<s; x+=tileS) {
            // Random dark grey variations
            const v = 20 + Math.random() * 10;
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.fillRect(x,y,tileS,tileS);
            ctx.strokeRect(x,y,tileS,tileS);
        }
    }
    
    // Grime Overlay
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(50, 40, 30, 0.2)';
    ctx.fillRect(0,0,s,s);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createDoorTexture(type) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512;
    const ctx = c.getContext('2d');
    
    // Base: Rusted Metal
    ctx.fillStyle = '#2a1a1a'; ctx.fillRect(0,0,256,512);
    
    // Frame
    ctx.lineWidth = 10; ctx.strokeStyle = '#110'; ctx.strokeRect(0,0,256,512);
    
    ctx.font = 'bold 30px Courier New'; ctx.textAlign = 'center'; ctx.fillStyle = '#800';
    
    if (type === 'face') {
        ctx.fillText("OBSERVE", 128, 150);
        // Scratch marks
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
        for(let i=0; i<50; i++) {
            ctx.beginPath(); ctx.moveTo(Math.random()*256, 200+Math.random()*200);
            ctx.lineTo(Math.random()*256, 200+Math.random()*200); ctx.stroke();
        }
    } else if (type === 'hand') {
        ctx.fillText("RITUAL", 128, 150);
        ctx.fillStyle = 'rgba(100,0,0,0.5)';
        ctx.beginPath(); ctx.arc(128, 300, 60, 0, Math.PI*2); ctx.fill();
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
    concrete: new THREE.MeshStandardMaterial({ map: textures.wall, roughness: 0.9, bumpScale: 0.1, color: 0x888888 }),
    floor: new THREE.MeshStandardMaterial({ map: textures.floor, roughness: 0.6, bumpScale: 0.05 }),
    rust: new THREE.MeshStandardMaterial({ color: 0x3d2e2e, roughness: 0.8 }),
    black: new THREE.MeshStandardMaterial({ color: 0x000000 }),
    emissiveRed: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xaa0000 }), 
    emissiveGreen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x00aa00 }),
    emissiveBlue: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x0000aa }),
};

// --- GEOMETRY HELPERS ---

// NEW: World-Aligned UV Mapping (Fixes "Funny" stretched textures)
function autoMapUVs(geometry, width, height, depth) {
    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    const scale = 0.5; // Controls texture density (higher = more repeats)

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        
        // Simple planar mapping logic
        // If the face is mostly vertical (Walls), map X/Y or Z/Y
        // If the face is flat (Floor/Ceiling), map X/Z
        
        // This is a simplified box mapping approximation:
        // For a wall varying in width (x) and height (y), we use x/y.
        // For a wall varying in depth (z) and height (y), we use z/y.
        
        if (width > depth) {
            // Wide wall (Faces Z)
            uv.setXY(i, (x + width/2) * scale, y * scale);
        } else {
            // Deep wall (Faces X)
            uv.setXY(i, (z + depth/2) * scale, y * scale);
        }
    }
    uv.needsUpdate = true;
}

export function initLevel(scene, walls, batteries, State, mirrorTexture) {

    // FLOOR & CEILING
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 600), mats.floor);
    floor.rotation.x = -Math.PI/2; floor.position.z = 200; 
    // Fix floor UVs manually for repeating
    floor.geometry.attributes.uv.array.forEach((v,i) => { floor.geometry.attributes.uv.array[i] *= 20; });
    scene.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(100, 600), mats.concrete);
    ceiling.rotation.x = Math.PI/2; ceiling.position.set(0, 4.5, 200);
    scene.add(ceiling);

    // BUILDER
    function addWall(x, y, z, w, h, d, mat = mats.concrete, name="wall") {
        const geo = new THREE.BoxGeometry(w, h, d);
        autoMapUVs(geo, w, h, d); // Apply fix
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.castShadow = true; m.receiveShadow = true; m.name = name;
        scene.add(m);
        walls.push(m);
        return m;
    }

    // --- ACT I: CELLAR ---
    // Start Room
    addWall(-5.5, 2.25, 0, 1, 4.5, 30);
    addWall(5.5, 2.25, 0, 1, 4.5, 30);
    addWall(0, 2.25, -10, 12, 4.5, 1);

    // EMOTION DOOR FRAME (Z=5)
    // Door Width: 2.8. Required Gap: > 2.8. Let's use 3.0.
    // Left Wall: Ends at -1.5. Center at -4. Width 5. (-6.5 to -1.5)
    addWall(-4.0, 2.25, 5, 5, 4.5, 0.5); 
    // Right Wall: Starts at 1.5. Center at 4. Width 5. (1.5 to 6.5)
    addWall(4.0, 2.25, 5, 5, 4.5, 0.5);
    // Header: Width 3 (spans gap). Height 1. Center Y = 4.5 - 0.5 = 4.0? 
    // Door Top is 1.9 + 1.9 = 3.8. Header bottom must be > 3.8.
    // Let's place header center at Y=4.25, Height 0.5. (Range 4.0 to 4.5)
    addWall(0, 4.25, 5, 3, 0.5, 0.5); 

    const emoDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.15), new THREE.MeshStandardMaterial({ map: textures.doorFace }));
    emoDoor.position.set(0, 1.9, 5); emoDoor.name = "emotion_door"; 
    scene.add(emoDoor); walls.push(emoDoor);

    const note1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.6), new THREE.MeshBasicMaterial({color:0xddddaa}));
    note1.position.set(1.6, 2.0, 4.9); note1.rotation.z = -0.1; note1.name = "emotion_note"; scene.add(note1);

    // --- ACT II: TUNNEL ---
    addWall(-4.5, 2.25, 30, 2, 4.5, 40, mats.rust);
    addWall(4.5, 2.25, 30, 2, 4.5, 40, mats.rust);

    function addBat(x, z) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.3,8), new THREE.MeshStandardMaterial({color:0x333333, emissive:0x004400}));
        b.position.set(x,0.15,z); b.name="battery"; scene.add(b); batteries.push(b);
    }
    addBat(0, 15); addBat(1, 25);

    // HAND DOOR FRAME (Z=40)
    // Gap 3.0.
    addWall(-4.0, 2.25, 40, 5, 4.5, 1);
    addWall(4.0, 2.25, 40, 5, 4.5, 1);
    // Header Y=4.25, Height 0.5 (Bottom at 4.0). Door Top at 3.8. SAFE.
    addWall(0, 4.25, 40, 3, 0.5, 1);

    const handDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.15), new THREE.MeshStandardMaterial({ map: textures.doorHand }));
    handDoor.position.set(0, 1.9, 40); handDoor.name = "hand_door";
    scene.add(handDoor); walls.push(handDoor);
    
    // Note 2
    const crate = addWall(2.5, 0.5, 38, 1, 1, 1, mats.rust);
    const note2 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshBasicMaterial({color:0xddddaa}));
    note2.position.set(2.5, 1.01, 38); note2.rotation.x = -Math.PI/2; note2.name = "hand_note"; scene.add(note2);

    // --- ACT III: STATUE ---
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

    // --- ACT IV: VOID ---
    addWall(0, 0.5, 95, 1, 1, 1, mats.black);
    const memHint = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.2,0.2), new THREE.MeshStandardMaterial({color:0xffffff}));
    memHint.position.set(0, 2, 95); scene.add(memHint);

    // Alignment Puzzle (Z=110)
    addWall(-4.5, 2.25, 100, 4, 4.5, 1); // Left (-6.5 to -2.5)
    addWall(4.5, 2.25, 100, 4, 4.5, 1);  // Right (2.5 to 6.5)
    addWall(0, 4.0, 100, 5, 1, 1); // Header
    
    // Hidden Symbol
    const alignP = new THREE.Mesh(new THREE.PlaneGeometry(4,4), new THREE.MeshStandardMaterial({map: textures.wall, transparent:true, opacity:0.9}));
    alignP.position.set(-4, 2, 110); alignP.rotation.y = Math.PI/2; alignP.name = "align_puzzle"; scene.add(alignP);
    const hiddenSym = new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.MeshBasicMaterial({color:0xff0000, transparent:true, opacity:0}));
    hiddenSym.position.set(-3.9, 2, 110); hiddenSym.rotation.y = Math.PI/2; scene.add(hiddenSym);

    // Bridge
    addWall(-6, 2.25, 135, 1, 4.5, 20); addWall(6, 2.25, 135, 1, 4.5, 20);
    const pit = new THREE.Mesh(new THREE.PlaneGeometry(10,20), mats.black); 
    pit.rotation.x = -Math.PI/2; pit.position.set(0,0.05,135); scene.add(pit);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 22), new THREE.MeshStandardMaterial({color:0x333333, transparent:true, opacity:0.6}));
    bridge.position.set(0,0.1,135); scene.add(bridge);

    // --- ACT V: FINAL DOORS (Z=245) ---
    const locs = [[2, 55], [-2, 60], [0, 85], [3, 105], [-3, 115], [0, 150], [2, 170], [-2, 175], [-3, 190], [0, 195], [3, 200]];
    locs.forEach(l => addBat(l[0], l[1]));

    const obsDoor = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.2), mats.rust);
    obsDoor.position.set(0, 2, 230); scene.add(obsDoor); walls.push(obsDoor);

    const dL = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 0.2), mats.emissiveRed); dL.position.set(-3, 1.5, 245);
    const dC = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 0.2), mats.emissiveGreen); dC.position.set(0, 1.5, 245);
    const dR = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 0.2), mats.emissiveBlue); dR.position.set(3, 1.5, 245);
    scene.add(dL, dC, dR); walls.push(dL, dC, dR);
    
    addWall(0, 2.25, 250, 20, 4.5, 1);

    // Common Objects
    const ritualCursor = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color:0x00ff00, transparent:true, opacity:0}));
    scene.add(ritualCursor);

    return {
        statue, ritualCursor, handDoor, emoDoor, finalDoor: null, obsDoor,
        doorL: dL, doorC: dC, doorR: dR, memoryHint: memHint, hiddenSymbol: hiddenSym, ghostBridge: bridge,
        puzzleTextures: { hidden: mats.concrete.map, revealed: mats.rust.map }
    };
}
