/* level_design.js - "SILENT HILL" AESTHETIC OVERHAUL */
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// --- HORROR TEXTURE GENERATOR ---

// Helper: Generates frantic scratch marks (The "Claw" effect)
function drawScratches(ctx, width, height) {
    ctx.strokeStyle = 'rgba(20, 0, 0, 0.3)'; // Dried blood color
    ctx.lineWidth = 1;
    
    // Create 5-10 "clusters" of scratching
    for(let c=0; c<8; c++) {
        const cx = Math.random() * width;
        const cy = Math.random() * height;
        
        // In each cluster, draw 10-20 manic lines
        ctx.beginPath();
        for(let i=0; i<15; i++) {
            const ox = (Math.random() - 0.5) * 40;
            const oy = (Math.random() - 0.5) * 40;
            ctx.moveTo(cx + ox, cy + oy);
            ctx.lineTo(cx + ox + (Math.random()-0.5)*20, cy + oy + 50); // Downward drag
        }
        ctx.stroke();
    }
}

// Helper: Generates biological veins/roots
function drawVeins(ctx, width, height) {
    ctx.strokeStyle = 'rgba(30, 10, 10, 0.15)'; // Faint bruising
    ctx.lineWidth = 2;
    
    for(let i=0; i<10; i++) {
        let x = Math.random() * width;
        let y = Math.random() * height;
        ctx.beginPath();
        ctx.moveTo(x, y);
        
        // Random walker algorithm
        for(let s=0; s<50; s++) {
            x += (Math.random() - 0.5) * 20;
            y += (Math.random() - 0.5) * 20;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}

// Helper: Rorschach Test (Symmetrical stains trigger face-recognition fear)
function drawRorschach(ctx, width, height) {
    const cx = width / 2;
    const cy = height / 2;
    
    const size = 100 + Math.random() * 100;
    const points = [];
    
    // Generate organic blob shape
    for(let i=0; i<20; i++) {
        points.push({
            x: (Math.random() - 0.5) * size,
            y: (Math.random() - 0.5) * size * 2
        });
    }
    
    ctx.fillStyle = 'rgba(10, 5, 0, 0.4)'; // Black rot
    
    // Draw Left
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    points.forEach(p => ctx.lineTo(cx + p.x, cy + p.y));
    ctx.fill();
    
    // Draw Right (Mirror)
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    points.forEach(p => ctx.lineTo(cx - p.x, cy + p.y));
    ctx.fill();
}

// 1. WALLS: "The Bruised Plaster"
function createSilentHillWall() {
    const s = 512;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');

    // Base: Sickly Skin Tone (Pale Yellow/Grey)
    ctx.fillStyle = '#b0a090'; 
    ctx.fillRect(0, 0, s, s);

    // Layer 1: Noise (Pores/Grit)
    const iData = ctx.getImageData(0,0,s,s);
    for(let i=0; i<iData.data.length; i+=4) {
        const grain = (Math.random() - 0.5) * 40;
        iData.data[i] -= grain;     // Subtract to make it look dirty
        iData.data[i+1] -= grain;
        iData.data[i+2] -= grain;
    }
    ctx.putImageData(iData, 0, 0);

    // Layer 2: Bruising (Large soft purple/brown spots)
    ctx.globalCompositeOperation = 'multiply';
    for(let i=0; i<5; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const r = 50 + Math.random() * 100;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, 'rgba(60, 30, 30, 0.4)'); // Deep bruise
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0,0,s,s);
    }

    // Layer 3: Veins & Scratches
    drawVeins(ctx, s, s);
    drawScratches(ctx, s, s);

    // Layer 4: The Waterline (Bottom is darker/wetter)
    const waterGrd = ctx.createLinearGradient(0, 0, 0, s);
    waterGrd.addColorStop(0, 'rgba(0,0,0,0)');
    waterGrd.addColorStop(0.7, 'rgba(20,10,5,0.2)');
    waterGrd.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = waterGrd;
    ctx.fillRect(0,0,s,s);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

// 2. FLOOR: Industrial Grating over Void
function createIndustrialFloor() {
    const s = 512;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');

    // Base: Dark Rusted Metal
    ctx.fillStyle = '#1a1515'; ctx.fillRect(0,0,s,s);

    // Grid Pattern (Rusty Metal Grate)
    const step = 64;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#3a2a2a'; // Rust color

    for(let i=0; i<=s; i+=step) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
    }

    // Blood Stains (Splotches on the grate)
    ctx.fillStyle = 'rgba(50, 0, 0, 0.6)';
    ctx.globalCompositeOperation = 'multiply';
    drawRorschach(ctx, s, s); // Symmetrical stain on the floor

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

// 3. DOORS: The "Flesh" Metal
function createNightmareDoor(type) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512;
    const ctx = c.getContext('2d');

    // Base: Rusted Iron
    ctx.fillStyle = '#221111'; ctx.fillRect(0,0,256,512);

    // Rust Texture
    for(let i=0; i<100; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#3a1a1a' : '#1a0a0a';
        ctx.fillRect(Math.random()*256, Math.random()*512, Math.random()*20, Math.random()*20);
    }

    // The "Symbol"
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = 'bold 40px Courier New'; 
    ctx.textAlign = 'center'; 
    ctx.fillStyle = '#800'; // Blood red text
    
    // Distorted Text Effect
    ctx.save();
    ctx.translate(128, 150);
    ctx.rotate((Math.random()-0.5)*0.2); // Tilted text
    
    if (type === 'face') {
        ctx.fillText("DON'T", 0, 0);
        ctx.fillText("LOOK", 0, 40);
        // Scratching over the text
        drawScratches(ctx, 200, 200);
    } else if (type === 'hand') {
        ctx.fillText("TOUCH", 0, 0);
        // Bloody Handprint logic
        ctx.fillStyle = 'rgba(100, 0, 0, 0.5)';
        ctx.beginPath(); ctx.arc(0, 150, 60, 0, Math.PI*2); ctx.fill();
        // Fingers
        ctx.fillRect(-50, 80, 20, 80); ctx.fillRect(-20, 70, 20, 90); ctx.fillRect(10, 75, 20, 85);
    }
    ctx.restore();

    return new THREE.CanvasTexture(c);
}

// --- MATERIALS ---
const textures = {
    wall: createSilentHillWall(),
    floor: createIndustrialFloor(),
    doorFace: createNightmareDoor('face'),
    doorHand: createNightmareDoor('hand')
};

const mats = {
    // Wall: High roughness (absorbs light), weird bump map
    concrete: new THREE.MeshStandardMaterial({ 
        map: textures.wall, 
        roughness: 1.0, 
        color: 0x888888 
    }),
    floor: new THREE.MeshStandardMaterial({ 
        map: textures.floor, 
        roughness: 0.5, 
        metalness: 0.8 // Metal grate feeling
    }),
    rust: new THREE.MeshStandardMaterial({ color: 0x442222, roughness: 0.9 }), // Darker rust
    black: new THREE.MeshStandardMaterial({ color: 0x000000 }),
    emissiveRed: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x660000 }), // Deep red light
    emissiveGreen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x004400 }),
    emissiveBlue: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x000044 })
};

// --- GEOMETRY ENGINE (Preserving the Fixes) ---
function fixUVs(geometry, w, h, d) {
    const pos = geometry.attributes.position;
    const norm = geometry.attributes.normal;
    const uv = geometry.attributes.uv;
    const scale = 0.4; // Slightly tighter texture repeat for more detail

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i); const y = pos.getY(i); const z = pos.getZ(i);
        const nx = Math.abs(norm.getX(i)); const ny = Math.abs(norm.getY(i));
        
        if (nx > 0.5) uv.setXY(i, z * scale, y * scale);
        else if (ny > 0.5) uv.setXY(i, x * scale, z * scale);
        else uv.setXY(i, x * scale, y * scale);
    }
    uv.needsUpdate = true;
}

// --- LEVEL BUILDER ---
export function initLevel(scene, walls, batteries, State, mirrorTexture) {

    // Floor (Grating)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 600), mats.floor);
    floor.rotation.x = -Math.PI/2; floor.position.z = 200; 
    floor.geometry.attributes.uv.array.forEach((v,i) => floor.geometry.attributes.uv.array[i] *= 15);
    scene.add(floor);

    // Ceiling (Oppressive Darkness)
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

    // ================= ACT I: THE CELLAR =================
    // Broken into segments to allow door frame insertion
    addWall(-5.5, 2.25, -3, 1, 4.5, 14); 
    addWall(5.5, 2.25, -3, 1, 4.5, 14);
    addWall(-5.5, 2.25, 10.5, 1, 4.5, 9);
    addWall(5.5, 2.25, 10.5, 1, 4.5, 9);
    addWall(0, 2.25, -10, 12, 4.5, 1); // Back Wall

    // EMOTION DOOR FRAME (Z=5)
    addWall(-4.0, 2.25, 5, 5, 4.5, 1); 
    addWall(4.0, 2.25, 5, 5, 4.5, 1);
    addWall(0, 4.2, 5, 3, 0.4, 1); // Header

    const emoDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.15), new THREE.MeshStandardMaterial({ map: textures.doorFace }));
    emoDoor.position.set(0, 1.9, 5); emoDoor.name = "emotion_door"; 
    scene.add(emoDoor); walls.push(emoDoor);

    // Note 1
    const note1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.6), new THREE.MeshBasicMaterial({color:0xddddaa}));
    note1.position.set(1.6, 2.0, 4.9); note1.rotation.z = -0.1; note1.name = "emotion_note"; scene.add(note1);

    // ================= ACT II: RUST TUNNEL =================
    // Walls switch to Rusty Metal here
    addWall(-4.5, 2.25, 27, 2, 4.5, 24, mats.rust);
    addWall(4.5, 2.25, 27, 2, 4.5, 24, mats.rust);
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
    addWall(-4.0, 2.25, 40, 5, 4.5, 1.2); 
    addWall(4.0, 2.25, 40, 5, 4.5, 1.2);
    addWall(0, 4.2, 40, 3, 0.4, 1.2); 

    const handDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.15), new THREE.MeshStandardMaterial({ map: textures.doorHand }));
    handDoor.position.set(0, 1.9, 40); handDoor.name = "hand_door";
    scene.add(handDoor); walls.push(handDoor);

    const note2 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshBasicMaterial({color:0xddddaa}));
    note2.position.set(2.5, 1.01, 38); note2.rotation.x = -Math.PI/2; note2.name = "hand_note"; scene.add(note2);

    // ================= ACT III: STATUE =================
    // Back to Flesh Walls
    addWall(-6, 2.25, 70, 1, 4.5, 60);
    addWall(6, 2.25, 70, 1, 4.5, 60);

    const statue = new THREE.Group();
    // Statue is now twisted and dark
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
    addWall(0, 4.0, 100, 5, 1, 1); 

    const alignP = new THREE.Mesh(new THREE.PlaneGeometry(4,4), new THREE.MeshStandardMaterial({map: textures.wall, transparent:true, opacity:0.9}));
    alignP.position.set(-4, 2, 110); alignP.rotation.y = Math.PI/2; alignP.name = "align_puzzle"; scene.add(alignP);
    const hiddenSym = new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.MeshBasicMaterial({color:0xff0000, transparent:true, opacity:0}));
    hiddenSym.position.set(-3.9, 2, 110); hiddenSym.rotation.y = Math.PI/2; scene.add(hiddenSym);

    // Pit
    addWall(-6, 2.25, 135, 1, 4.5, 20); addWall(6, 2.25, 135, 1, 4.5, 20);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 22), new THREE.MeshStandardMaterial({color:0x222222, transparent:true, opacity:0.7}));
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
