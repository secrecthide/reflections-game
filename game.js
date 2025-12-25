/* level_design.js - POLISHED ARCHITECTURE */
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// --- HIGH QUALITY TEXTURE GENERATORS ---

// 1. Concrete (Walls) - Cleaner, darker, less "static noise"
function createConcreteTexture() {
    const s = 512;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');

    // Base
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(0, 0, s, s);

    // Subtle Noise
    for(let i=0; i<40000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#333' : '#222';
        ctx.fillRect(Math.random()*s, Math.random()*s, 2, 2);
    }
    
    // Seams (Brutalist style panels)
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, s/2); ctx.lineTo(s, s/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s/2, 0); ctx.lineTo(s/2, s); ctx.stroke();

    // Drips (Stains)
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for(let i=0; i<20; i++) {
        const x = Math.random() * s;
        ctx.fillRect(x, 0, Math.random()*4+2, Math.random()*(s/1.5));
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

// 2. Tiled Floor - Sharp, reflective
function createTileTexture() {
    const s = 512;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');

    // Grout
    ctx.fillStyle = '#111'; ctx.fillRect(0,0,s,s);

    // Tiles
    const tileS = 128; // Larger tiles
    const gap = 4;
    for(let y=0; y<s; y+=tileS) {
        for(let x=0; x<s; x+=tileS) {
            // Checkered subtle variation
            const isDark = (x+y)%(tileS*2) === 0;
            ctx.fillStyle = isDark ? '#1a1a1a' : '#222';
            ctx.fillRect(x+gap, y+gap, tileS-gap*2, tileS-gap*2);
        }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 20); // High density tiling
    return tex;
}

// 3. Door Texture - Industrial Metal
function createDoorTexture(type) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512;
    const ctx = c.getContext('2d');

    // Base Metal
    ctx.fillStyle = '#151515'; ctx.fillRect(0,0,256,512);
    
    // Rust Edges
    const grad = ctx.createRadialGradient(128, 256, 100, 128, 256, 300);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(60,30,20,0.5)');
    ctx.fillStyle = grad; ctx.fillRect(0,0,256,512);

    // Frame
    ctx.strokeStyle = '#333'; ctx.lineWidth = 8;
    ctx.strokeRect(4,4,248,504);

    // Details
    if (type === 'face') {
        ctx.fillStyle = '#eee'; ctx.font = '20px monospace'; ctx.textAlign = 'center';
        ctx.fillText("OBSERVATION", 128, 150);
        ctx.fillStyle = '#300'; ctx.font = '80px monospace';
        ctx.fillText("👁", 128, 280);
    } else if (type === 'hand') {
        ctx.fillStyle = '#500';
        ctx.beginPath(); ctx.arc(128, 250, 40, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#300'; 
        ctx.fillRect(118, 290, 20, 60); // "Drip"
    } else if (type === 'final') {
        ctx.fillStyle = '#a00'; ctx.font = "bold 60px monospace"; ctx.textAlign="center"; 
        ctx.fillText("EXIT", 128, 100);
        ctx.fillStyle = '#aa0'; // Hazard stripes
        for(let i=400; i<512; i+=40) ctx.fillRect(20, i, 216, 10);
    }

    return new THREE.CanvasTexture(c);
}

// 4. Note Paper
function createNotePaper() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 300;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#eaddcf'; ctx.fillRect(0,0,256,300);
    ctx.fillStyle = '#111';
    ctx.font = '10px monospace';
    for(let i=40; i<280; i+=20) {
        ctx.fillText("---------------------------", 10, i);
    }
    // Blood stamp
    ctx.fillStyle = 'rgba(120,0,0,0.4)';
    ctx.beginPath(); ctx.arc(200, 250, 30, 0, Math.PI*2); ctx.fill();
    return new THREE.CanvasTexture(c);
}

// --- MATERIALS ---
const mats = {
    concrete: new THREE.MeshStandardMaterial({ map: createConcreteTexture(), roughness: 0.8, bumpScale: 0.2 }),
    floor: new THREE.MeshStandardMaterial({ map: createTileTexture(), roughness: 0.4, metalness: 0.3 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7, metalness: 0.6 }),
    black: new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1.0 }),
    emissiveRed: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff0000, emissiveIntensity: 2 }),
    emissiveGreen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x00ff00, emissiveIntensity: 2 }),
    emissiveBlue: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x0000ff, emissiveIntensity: 2 }),
};

// --- GEOMETRY HELPERS ---

function adjustUVs(geometry, scaleX=1, scaleY=1) {
    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i); const y = pos.getY(i); const z = pos.getZ(i);
        // Planar mapping based on position
        if(Math.abs(x) > Math.abs(z)) uv.setXY(i, z * 0.5 * scaleX, y * 0.5 * scaleY);
        else uv.setXY(i, x * 0.5 * scaleX, y * 0.5 * scaleY);
    }
    uv.needsUpdate = true;
}

// --- MAIN INIT ---
export function initLevel(scene, walls, batteries, State, mirrorTexture) {

    // 1. FLOOR & CEILING (One solid piece for performance)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 600), mats.floor);
    floor.rotation.x = -Math.PI/2; floor.position.set(0, 0, 200); floor.receiveShadow = true;
    scene.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(30, 600), mats.concrete);
    ceiling.rotation.x = Math.PI/2; ceiling.position.set(0, 4.5, 200);
    scene.add(ceiling);

    // HELPER: Solid Wall
    function addWall(x, y, z, w, h, d, mat = mats.concrete) {
        const geo = new THREE.BoxGeometry(w, h, d);
        adjustUVs(geo);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true; mesh.receiveShadow = true;
        scene.add(mesh);
        walls.push(mesh); // Physics collision
        return mesh;
    }

    // HELPER: Doorway (Calculates gaps to prevent clipping)
    // doorWidth is the hole size. totalWidth is the corridor width.
    function addDoorway(z, totalWidth, doorWidth, doorHeight, doorObj) {
        const sideW = (totalWidth - doorWidth) / 2;
        const xLeft = -(doorWidth/2 + sideW/2);
        const xRight = (doorWidth/2 + sideW/2);
        
        // Left Wall
        addWall(xLeft, 2.25, z, sideW, 4.5, 1);
        // Right Wall
        addWall(xRight, 2.25, z, sideW, 4.5, 1);
        // Header (Top)
        addWall(0, 4.5 - (4.5-doorHeight)/2, z, doorWidth, 4.5-doorHeight, 1);

        // Place the actual door object in the gap
        if(doorObj) {
            doorObj.position.set(0, doorHeight/2, z);
            scene.add(doorObj);
            walls.push(doorObj);
        }
    }

    // HELPER: Beams (Decor)
    function addBeams(startZ, endZ, spacing) {
        for(let z=startZ; z<=endZ; z+=spacing) {
            const beam = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 0.5), mats.metal);
            beam.position.set(0, 4.25, z);
            scene.add(beam);
            // Side pillars
            const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.5, 0.5), mats.metal); p1.position.set(-4.5, 2.25, z); scene.add(p1);
            const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.5, 0.5), mats.metal); p2.position.set(4.5, 2.25, z); scene.add(p2);
        }
    }

    // ============================
    // ZONE 1: THE CELLAR (Start)
    // ============================
    
    // Main Corridor Walls (Long strips)
    addWall(-5, 2.25, 15, 1, 4.5, 60); // Left
    addWall(5, 2.25, 15, 1, 4.5, 60);  // Right
    addWall(0, 2.25, -5, 10, 4.5, 1); // Back wall

    // Emotion Door
    const emoDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.2), new THREE.MeshStandardMaterial({ map: createDoorTexture('face') }));
    emoDoor.name = "emotion_door";
    addDoorway(5, 10, 2.8, 3.8, emoDoor);

    const note1 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: createNotePaper() }));
    note1.position.set(1.8, 1.8, 4.9); note1.rotation.y = Math.PI; note1.name = "emotion_note"; scene.add(note1);

    addBeams(0, 30, 10);

    // ============================
    // ZONE 2: INDUSTRIAL (Middle)
    // ============================
    
    // Narrow section
    addWall(-3, 2.25, 45, 1, 4.5, 40, mats.metal);
    addWall(3, 2.25, 45, 1, 4.5, 40, mats.metal);

    function addBat(x, z) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.3,16), new THREE.MeshStandardMaterial({color:0x44ff44, emissive:0x004400}));
        m.position.set(x, 0.15, z); m.name = "battery"; m.castShadow=true; scene.add(m); batteries.push(m);
    }
    addBat(0, 15); addBat(1, 25);

    // Hand Door
    const handDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.2), new THREE.MeshStandardMaterial({ map: createDoorTexture('hand') }));
    handDoor.name = "hand_door";
    addDoorway(40, 6, 2.8, 3.8, handDoor);

    // Note 2 (On a pedestal)
    const pedestal = addWall(2, 0.5, 38, 1, 1, 1, mats.metal);
    const note2 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: createNotePaper() }));
    note2.position.set(2, 1.01, 38); note2.rotation.x = -Math.PI/2; note2.name = "hand_note"; scene.add(note2);

    // Ritual Cursor
    const cursorMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0 }); 
    const ritualCursor = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), cursorMat);
    scene.add(ritualCursor);

    // ============================
    // ZONE 3: THE GALLERY (Statue)
    // ============================
    
    addWall(-6, 2.25, 80, 1, 4.5, 60);
    addWall(6, 2.25, 80, 1, 4.5, 60);

    // Statue
    const statueGroup = new THREE.Group();
    const sBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.6), mats.concrete);
    const sHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), mats.concrete); sHead.position.y = 1.1;
    // Eyes
    const sEye1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.05), mats.emissiveRed); sEye1.position.set(-0.1, 1.15, 0.21);
    const sEye2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.05), mats.emissiveRed); sEye2.position.set(0.1, 1.15, 0.21);
    statueGroup.add(sBody, sHead, sEye1, sEye2);
    statueGroup.position.set(0, 0.9, 80); 
    scene.add(statueGroup);

    const note3 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: createNotePaper() }));
    note3.position.set(0, 0.02, 62); note3.rotation.x = -Math.PI/2; note3.name = "statue_note"; scene.add(note3);

    // ============================
    // ZONE 4: THE VOID (Puzzle)
    // ============================
    
    // Memory Hint Block
    const memoryHint = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), new THREE.MeshStandardMaterial({color:0xffffff}));
    memoryHint.position.set(0, 2, 95); scene.add(memoryHint);
    addWall(0, 0.5, 95, 1, 1, 1, mats.black); 

    // Alignment Puzzle Wall
    addDoorway(100, 10, 4, 4, null); // Just the gap, no door object
    
    const puzzleTextures = { hidden: createConcreteTexture(), revealed: createConcreteTexture() }; // Placeholders
    const alignWall = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({color: 0x000000, transparent:true, opacity: 0.9}));
    alignWall.position.set(-4, 2, 110); alignWall.rotation.y = Math.PI/2; alignWall.name = "align_puzzle"; scene.add(alignWall);
    const hiddenSymbol = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({map: createDoorTexture('face'), transparent:true, opacity: 0}));
    hiddenSymbol.position.set(-3.9, 2, 110); hiddenSymbol.rotation.y = Math.PI/2; scene.add(hiddenSymbol);

    // The Pit
    const pitStart = 125; const pitEnd = 145;
    const pitCover = new THREE.Mesh(new THREE.PlaneGeometry(10, 20), mats.black);
    pitCover.rotation.x = -Math.PI/2; pitCover.position.set(0, 0.05, 135); scene.add(pitCover);
    
    const ghostBridge = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 20), new THREE.MeshStandardMaterial({
        color: 0x666666, transparent: true, opacity: 0.5, roughness: 0.2
    }));
    ghostBridge.position.set(0, 0.06, 135); scene.add(ghostBridge);

    addWall(-5, 2.25, 135, 1, 4.5, 20);
    addWall(5, 2.25, 135, 1, 4.5, 20);

    // ============================
    // ZONE 5: INFINITE HALL
    // ============================
    
    // Repetitive clean structure
    for(let z=170; z<230; z+=10) {
        // Pillars
        addWall(-4, 2.25, z, 1, 4.5, 1, mats.concrete);
        addWall(4, 2.25, z, 1, 4.5, 1, mats.concrete);
        // Ceiling lights (fake)
        const light = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 0.5), mats.emissiveRed);
        light.position.set(0, 4.4, z); scene.add(light);
    }
    // Backing walls
    addWall(-4.5, 2.25, 200, 1, 4.5, 60);
    addWall(4.5, 2.25, 200, 1, 4.5, 60);

    const obsDoor = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.2), new THREE.MeshStandardMaterial({color:0x550000}));
    obsDoor.name = "obs_door";
    addDoorway(230, 8, 3, 4, obsDoor);

    // ============================
    // ZONE 6: FINAL CHOICE
    // ============================
    
    const doorGeo = new THREE.BoxGeometry(1.5, 3, 0.2);
    const doorL = new THREE.Mesh(doorGeo, mats.emissiveRed); 
    const doorC = new THREE.Mesh(doorGeo, mats.emissiveGreen); 
    const doorR = new THREE.Mesh(doorGeo, mats.emissiveBlue); 
    
    // Create 3 Doorways manually
    const finalZ = 245;
    // Left
    addWall(-4, 2.25, finalZ, 1, 4.5, 1);
    doorL.position.set(-3, 1.5, finalZ); scene.add(doorL); walls.push(doorL);
    addWall(-2, 2.25, finalZ, 1, 4.5, 1); // Divider
    // Center
    doorC.position.set(0, 1.5, finalZ); scene.add(doorC); walls.push(doorC);
    addWall(2, 2.25, finalZ, 1, 4.5, 1); // Divider
    // Right
    doorR.position.set(3, 1.5, finalZ); scene.add(doorR); walls.push(doorR);
    addWall(4, 2.25, finalZ, 1, 4.5, 1);

    // Backstop
    addWall(0, 2.25, 255, 20, 4.5, 1);

    return {
        statue: statueGroup, ritualCursor, handDoor, emoDoor, finalDoor: null, obsDoor,
        doorL, doorC, doorR, memoryHint, hiddenSymbol, ghostBridge, puzzleTextures
    };
}
