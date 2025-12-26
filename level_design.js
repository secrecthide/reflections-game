/* level_design.js - PSYCHOLOGICAL HORROR TEXTURE OVERHAUL */
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// --- PSYCHOLOGICAL PALETTE ---
const COLORS = {
    mold: '#2a2e26',
    plasterOld: '#4a4842',
    driedBlood: '#1a0505',
    rustDark: '#1a120b',
    void: '#080808',
    stain: 'rgba(0, 0, 0, 0.6)',
    highlight: 'rgba(50, 60, 50, 0.1)'
};

// --- PROCEDURAL TEXTURE GENERATORS ---

// Helper: Generates uncomfortable, high-frequency noise
function applyNoise(ctx, width, height, intensity = 0.1) {
    const iData = ctx.getImageData(0, 0, width, height);
    const data = iData.data;
    for (let i = 0; i < data.length; i += 4) {
        const grain = (Math.random() - 0.5) * intensity * 255;
        data[i] += grain;
        data[i+1] += grain;
        data[i+2] += grain;
    }
    ctx.putImageData(iData, 0, 0);
}

// Helper: Draws organic, uncomfortable shapes (water damage/rot)
function drawRotSplotch(ctx, x, y, radius, color) {
    const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grd.addColorStop(0, color);
    grd.addColorStop(0.5, color.replace('1)', '0.5)')); // Fade out
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = grd;
    ctx.beginPath();
    
    // Jagged circle
    for (let i = 0; i <= Math.PI * 2; i += 0.1) {
        const r = radius + (Math.random() * radius * 0.4);
        ctx.lineTo(x + Math.cos(i) * r, y + Math.sin(i) * r);
    }
    ctx.fill();
}

// 1. THE WALLS: Suffocating, stained plaster
function createPsychWall() {
    const s = 512;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');

    // Base: Sickly uneven grey/green
    ctx.fillStyle = COLORS.plasterOld;
    ctx.fillRect(0, 0, s, s);

    // Layer 1: Vertical Drips (The "Weeping" effect)
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = COLORS.stain;
    ctx.lineWidth = 2;
    for(let i=0; i<40; i++) {
        const x = Math.random() * s;
        const len = Math.random() * s;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        // Jittery line downwards
        let cy = 0;
        while(cy < len) {
            cy += Math.random() * 10;
            ctx.lineTo(x + (Math.random() - 0.5) * 4, cy);
        }
        ctx.globalAlpha = Math.random() * 0.3;
        ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Layer 2: Mold Clusters (Pareidolia triggers)
    // We create shapes that *almost* look like eyes but aren't
    ctx.fillStyle = '#111';
    for(let i=0; i<5; i++) {
        const cx = Math.random() * s;
        const cy = Math.random() * s;
        drawRotSplotch(ctx, cx, cy, 30 + Math.random() * 50, 'rgba(10, 15, 10, 0.4)');
        // The "Pupil" dot
        drawRotSplotch(ctx, cx + (Math.random()-0.5)*10, cy + (Math.random()-0.5)*10, 5, 'rgba(0,0,0,0.6)');
    }

    // Layer 3: Cracks
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 1;
    for(let i=0; i<8; i++) {
        let x = Math.random() * s;
        let y = Math.random() * s;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for(let j=0; j<20; j++) {
            x += (Math.random() - 0.5) * 30;
            y += (Math.random() - 0.5) * 30;
            ctx.lineTo(x, y);
        }
        ctx.globalAlpha = 0.6;
        ctx.stroke();
    }

    // Layer 4: Heavy Grain
    applyNoise(ctx, s, s, 0.15);

    // Vignette (Dark corners)
    const grd = ctx.createRadialGradient(s/2, s/2, s/3, s/2, s/2, s);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = grd;
    ctx.fillRect(0,0,s,s);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

// 2. THE FLOOR: Uneven, damp, dragged
function createTraumaFloor() {
    const s = 512;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');

    // Base: Dark concrete
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0,0,s,s);

    const tileS = 128;

    // Tiles (Broken symmetry)
    for(let y=0; y<s; y+=tileS) {
        for(let x=0; x<s; x+=tileS) {
            // Offset tiles slightly to feel "wrong"
            const offX = (Math.random() - 0.5) * 5;
            const offY = (Math.random() - 0.5) * 5;
            
            // Random variation in tile color (desaturated rot)
            const val = 20 + Math.random() * 15;
            ctx.fillStyle = `rgb(${val}, ${val+2}, ${val})`;
            
            // Draw tile (Gaps are dark void)
            ctx.fillRect(x + offX + 2, y + offY + 2, tileS - 6, tileS - 6);
        }
    }

    // Drag Marks (History of violence)
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const startX = Math.random() * s;
    const startY = 0;
    for(let i=0; i<3; i++) { // 3 parallel scratches
        ctx.moveTo(startX + i*10, startY);
        ctx.bezierCurveTo(startX+50, s/2, startX-50, s/2, startX + (Math.random()-0.5)*100, s);
    }
    ctx.stroke();

    // Spills (Shiny/Wet patches in roughness map context)
    drawRotSplotch(ctx, s/2, s/2, 120, 'rgba(0,0,0,0.5)');

    applyNoise(ctx, s, s, 0.2);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 8); // Stretch it
    return tex;
}

// 3. OBJECTS: Rusted, neglected metal
function createNeglectedMetal() {
    const s = 256;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');

    // Base: Blackened iron
    ctx.fillStyle = '#151010';
    ctx.fillRect(0,0,s,s);

    // Rust Patches (Dried blood color, not bright orange)
    ctx.globalCompositeOperation = 'source-over';
    for(let i=0; i<20; i++) {
        drawRotSplotch(ctx, Math.random()*s, Math.random()*s, Math.random()*40, '#3a1a1a');
    }

    // Scratches (exposure of raw metal)
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<50; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random()-0.5)*20, y + (Math.random()-0.5)*20);
    }
    ctx.stroke();

    applyNoise(ctx, s, s, 0.3);

    return new THREE.CanvasTexture(c);
}

function createNoteTexture() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    // Yellowed, brittle paper
    ctx.fillStyle = '#bbaa88'; ctx.fillRect(0,0,256,256);
    
    // Grime edges
    const grd = ctx.createRadialGradient(128,128, 80, 128,128, 160);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(50,30,10,0.8)');
    ctx.fillStyle = grd; ctx.fillRect(0,0,256,256);

    // Scribbles
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
    for(let i=30; i<230; i+=15) {
        ctx.beginPath();
        ctx.moveTo(30, i);
        ctx.lineTo(220 + Math.random()*10, i);
        ctx.stroke();
    }
    return new THREE.CanvasTexture(c);
}

function createDoorTexture(type) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512;
    const ctx = c.getContext('2d');
    
    // Heavy Metal Base
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0,0,256,512);
    
    // Framing
    ctx.strokeStyle = '#000'; ctx.lineWidth = 8;
    ctx.strokeRect(0,0,256,512);
    
    // Symbolism
    ctx.fillStyle = '#800000'; 
    ctx.font = '30px Courier'; ctx.textAlign = 'center';
    
    if (type === 'face') {
        // Scratched out eyes
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(128, 150, 40, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#500'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(100, 130); ctx.lineTo(156, 170); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(156, 130); ctx.lineTo(100, 170); ctx.stroke();
    } else if (type === 'hand') {
        // Multiple small handprints (smears)
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#411';
        for(let i=0; i<6; i++) {
            ctx.beginPath(); ctx.arc(50+Math.random()*150, 200+Math.random()*200, 25, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    } else if (type === 'final') {
        ctx.fillStyle = '#900';
        ctx.fillText("DO NOT", 128, 200);
        ctx.fillText("ENTER", 128, 240);
    }
    
    // Overlay grime
    applyNoise(ctx, 256, 512, 0.4);
    
    return new THREE.CanvasTexture(c);
}


// --- MATERIALS REDESIGN ---
const MAT_SETTINGS = {
    wall: { roughness: 0.9, metalness: 0.1, bumpScale: 0.05 },
    floor: { roughness: 0.7, metalness: 0.2, bumpScale: 0.02 }, // Slightly shiny (wet)
    metal: { roughness: 0.6, metalness: 0.6 },
};

const textures = {
    wall: createPsychWall(),
    floor: createTraumaFloor(),
    metal: createNeglectedMetal(),
    note: createNoteTexture()
};

const mats = {
    concrete: new THREE.MeshStandardMaterial({ 
        map: textures.wall, 
        color: 0x888888, // Tint slightly
        ...MAT_SETTINGS.wall 
    }),
    floor: new THREE.MeshStandardMaterial({ 
        map: textures.floor,
        ...MAT_SETTINGS.floor 
    }),
    rust: new THREE.MeshStandardMaterial({ 
        map: textures.metal, 
        color: 0x886666,
        ...MAT_SETTINGS.metal 
    }),
    black: new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1.0 }),
    emissiveRed: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x550000, emissiveIntensity: 1 }), // Dimmer red
    emissiveGreen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x004400, emissiveIntensity: 1 }),
    emissiveBlue: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x000044, emissiveIntensity: 1 }),
};

// --- GEOMETRY HELPERS ---

function createPipe(scene, x, y, z, length, axis='z') {
    const geo = new THREE.CylinderGeometry(0.15, 0.15, length, 6); // Thicker pipes
    const mesh = new THREE.Mesh(geo, mats.rust);
    if (axis === 'z') {
        mesh.rotation.x = Math.PI/2;
        mesh.position.set(x, y, z + length/2);
    } else {
        mesh.rotation.z = Math.PI/2;
        mesh.position.set(x + length/2, y, z);
    }
    scene.add(mesh);
    return mesh;
}

function adjustUVs(geometry) {
    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    // World-aligned UVs to prevent stretching and ensure texture continuity
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i); const y = pos.getY(i); const z = pos.getZ(i);
        // Map X/Z to UV based on normals ideally, but here we just map planar
        // Adding randomness to UVs per object to break repetition
        uv.setXY(i, (x+z)*0.4, y*0.4);
    }
    uv.needsUpdate = true;
}

// --- MAIN INIT ---
export function initLevel(scene, walls, batteries, State, mirrorTexture) {

    // 1. THE FLOOR (Infinite expanse of rot)
    const floorGeo = new THREE.PlaneGeometry(100, 600);
    const floor = new THREE.Mesh(floorGeo, mats.floor);
    floor.rotation.x = -Math.PI/2; 
    floor.position.z = 200; 
    floor.receiveShadow = true; 
    scene.add(floor);

    // 2. CEILING (Oppressive and low)
    const ceiling = new THREE.Mesh(floorGeo, mats.concrete);
    ceiling.rotation.x = Math.PI/2;
    ceiling.position.set(0, 4.5, 200);
    scene.add(ceiling);

    // HELPER: Physical Wall Builder
    function addWall(x, y, z, w, h, d, mat = mats.concrete, name = "wall") {
        const geo = new THREE.BoxGeometry(w, h, d);
        adjustUVs(geo);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.name = name;
        scene.add(mesh);
        walls.push(mesh); 
        return mesh;
    }

    // =========================================================
    // ACT I: THE CELLAR
    // =========================================================
    
    // Narrow, claustrophobic start
    addWall(-5.5, 2.25, 0, 1, 4.5, 30); 
    addWall(5.5, 2.25, 0, 1, 4.5, 30);  
    addWall(0, 2.25, -10, 12, 4.5, 1);
    
    // Door Frame
    addWall(-2.5, 2.25, 5, 4, 4.5, 0.5); 
    addWall(2.5, 2.25, 5, 4, 4.5, 0.5);
    addWall(0, 4, 5, 2, 1, 0.5);

    // Low hanging pipes (Force player to look at details)
    createPipe(scene, -4.8, 3.5, -10, 40, 'z');
    createPipe(scene, 4.8, 1.0, -10, 40, 'z'); // Knee height pipe

    // OBJECTS
    const emoDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.15), new THREE.MeshStandardMaterial({ map: createDoorTexture('face') }));
    emoDoor.position.set(0, 1.9, 5); emoDoor.name = "emotion_door"; scene.add(emoDoor); walls.push(emoDoor);

    const note1 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: textures.note, side: THREE.DoubleSide }));
    note1.position.set(1.6, 2.0, 4.95); note1.rotation.z = -0.1; note1.name = "emotion_note"; scene.add(note1);

    // =========================================================
    // ACT II: INDUSTRIAL TUNNEL
    // =========================================================
    
    // Rusted metal walls
    addWall(-4.5, 2.25, 30, 2, 4.5, 40, mats.rust);
    addWall(4.5, 2.25, 30, 2, 4.5, 40, mats.rust);

    // Batteries
    function addBat(x, z) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.3,16), new THREE.MeshStandardMaterial({color:0x444444, emissive:0x003300}));
        m.position.set(x, 0.15, z); m.name = "battery"; m.castShadow=true; scene.add(m); batteries.push(m);
    }
    addBat(0, 15); addBat(1, 25);

    // Mirror Frame (Rotted wood look)
    const mirrorFrame = addWall(3.2, 2.25, 35, 0.2, 3.5, 2.5, mats.rust);
    if (mirrorTexture) {
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), new THREE.MeshBasicMaterial({ map: mirrorTexture, color: 0x88aa88 })); // Green tint on mirror
        glass.position.set(-0.11, 0, 0); glass.rotation.y = -Math.PI/2; glass.scale.x = -1; 
        mirrorFrame.add(glass);
    }

    // Hand Door
    addWall(-3.5, 2.25, 40, 4, 4.5, 1); 
    addWall(3.5, 2.25, 40, 4, 4.5, 1); 
    addWall(0, 4, 40, 3, 1, 1);

    const handDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.15), new THREE.MeshStandardMaterial({ map: createDoorTexture('hand') }));
    handDoor.position.set(0, 1.9, 40); handDoor.name = "hand_door"; scene.add(handDoor); walls.push(handDoor);

    const crate = addWall(2.5, 0.5, 38, 1, 1, 1, mats.rust);
    const note2 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: textures.note }));
    note2.position.set(2.5, 1.01, 38); note2.rotation.x = -Math.PI/2; note2.rotation.z = 0.2; note2.name = "hand_note"; scene.add(note2);

    const cursorMat = new THREE.MeshBasicMaterial({ color: 0x005500, transparent: true, opacity: 0 }); // Darker cursor
    const ritualCursor = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), cursorMat);
    scene.add(ritualCursor);

    // =========================================================
    // ACT III: THE GALLERY
    // =========================================================
    
    // Irregular walls to break sightlines
    addWall(-6, 2.25, 70, 1, 4.5, 60, mats.concrete);
    addWall(6, 2.25, 70, 1, 4.5, 60, mats.concrete);
    
    for(let z=50; z<90; z+=10) {
        // Pillars are darker
        addWall(-2, 2.25, z, 0.5, 4.5, 0.5, mats.rust);
        addWall(2, 2.25, z, 0.5, 4.5, 0.5, mats.rust);
    }

    const statueGroup = new THREE.Group();
    // Statue is now made of "meat" colors (rust mat)
    const sBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.7, 12), mats.rust);
    const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), mats.rust); sHead.position.y = 1;
    const sEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05), mats.emissiveRed); sEyeL.position.set(-0.1, 1.1, 0.25);
    const sEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.05), mats.emissiveRed); sEyeR.position.set(0.1, 1.1, 0.25);
    statueGroup.add(sBody, sHead, sEyeL, sEyeR);
    statueGroup.position.set(0, 0.9, 80); 
    scene.add(statueGroup);
    
    const note3 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: textures.note }));
    note3.position.set(0, 0.02, 62); note3.rotation.x = -Math.PI/2; note3.name = "statue_note"; scene.add(note3);

    // =========================================================
    // ACT IV: THE VOID
    // =========================================================
    
    const memoryHint = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), new THREE.MeshStandardMaterial({color:0xaaaaaa}));
    memoryHint.position.set(0, 2, 95); scene.add(memoryHint);
    
    addWall(0, 0.5, 95, 1, 1, 1, mats.black); 
    
    addWall(-4, 2.25, 100, 3, 4.5, 1); addWall(4, 2.25, 100, 3, 4.5, 1); addWall(0, 4, 100, 5, 1, 1);
    
    const puzzleTextures = {
        hidden: mats.concrete.map, 
        revealed: mats.rust.map 
    };
    
    const alignWall = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({map: puzzleTextures.hidden, transparent:true, opacity: 0.9, color: 0x555555}));
    alignWall.position.set(-4, 2, 110); alignWall.rotation.y = Math.PI/2; alignWall.name = "align_puzzle"; scene.add(alignWall);
    
    const hiddenSymbol = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({map: createDoorTexture('face'), transparent:true, opacity: 0, color: 0xff0000}));
    hiddenSymbol.position.set(-3.9, 2, 110); hiddenSymbol.rotation.y = Math.PI/2; scene.add(hiddenSymbol);

    // THE PIT
    const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 0.1), mats.rust);
    signPost.position.set(1.5, 1, 125); scene.add(signPost);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.05), mats.emissiveRed);
    sign.position.set(1.5, 1.8, 125); scene.add(sign);

    const pitCover = new THREE.Mesh(new THREE.PlaneGeometry(10, 20), mats.black);
    pitCover.rotation.x = -Math.PI/2; pitCover.position.set(0, 0.05, 135); scene.add(pitCover);
    
    const ghostBridge = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 24), new THREE.MeshStandardMaterial({
        color: 0x222222, roughness: 0.9, transparent: true, opacity: 0.5
    }));
    ghostBridge.position.set(0, 0.1, 135); scene.add(ghostBridge);

    addWall(-5.5, 2.25, 135, 1, 4.5, 20); 
    addWall(5.5, 2.25, 135, 1, 4.5, 20); 

    const mirrorFrame2 = addWall(0, 2.25, 160.5, 2.5, 3.5, 0.5, mats.rust);
    const realWallCode = new THREE.Mesh(new THREE.PlaneGeometry(1,0.5), mats.emissiveGreen); 
    realWallCode.position.set(0, 3.5, 159.5); scene.add(realWallCode); 

    if(mirrorTexture) {
        const m2 = new THREE.Mesh(new THREE.PlaneGeometry(2,3), new THREE.MeshBasicMaterial({map:mirrorTexture, color: 0x558855}));
        m2.position.set(0,0,0.3); m2.scale.x = -1; mirrorFrame2.add(m2);
    }

    // =========================================================
    // ACT V: INFINITE HALLWAY
    // =========================================================
    
    for(let z=170; z<230; z+=5) {
        addWall(-3, 2.25, z, 1, 4.5, 1, mats.concrete);
        addWall(3, 2.25, z, 1, 4.5, 1, mats.concrete);
        // Cross beams to make it feel like a ribcage
        createPipe(scene, 0, 4, z, 6, 'x'); 
    }
    addWall(-3.5, 2.25, 200, 1, 4.5, 60, mats.black);
    addWall(3.5, 2.25, 200, 1, 4.5, 60, mats.black);

    const stopMarker = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 32), mats.emissiveRed);
    stopMarker.rotation.x = -Math.PI/2; stopMarker.position.set(0, 0.05, 198); scene.add(stopMarker);

    const obsDoor = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.2), mats.rust);
    obsDoor.position.set(0, 2, 230); scene.add(obsDoor); walls.push(obsDoor);

    // =========================================================
    // ACT VI: FINAL DOORS
    // =========================================================
    
    const locs = [[2, 55], [-2, 60], [0, 85], [3, 105], [-3, 115], [0, 150], [2, 170], [-2, 175], [-3, 190], [0, 195], [3, 200]];
    locs.forEach(l => addBat(l[0], l[1]));

    const doorGeo = new THREE.BoxGeometry(1.5, 3, 0.2);
    const doorL = new THREE.Mesh(doorGeo, mats.emissiveRed); 
    const doorC = new THREE.Mesh(doorGeo, mats.emissiveGreen); 
    const doorR = new THREE.Mesh(doorGeo, mats.emissiveBlue); 
    doorL.position.set(-3, 1.5, 245); doorC.position.set(0, 1.5, 245); doorR.position.set(3, 1.5, 245);
    scene.add(doorL); scene.add(doorC); scene.add(doorR);
    walls.push(doorL); walls.push(doorC); walls.push(doorR);

    addWall(0, 2.25, 250, 20, 4.5, 1, mats.concrete);

    // --- DEBRIS SYSTEM (More chaotic) ---
    const junkGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    for(let z=-5; z<240; z+=3) {
        if(z > 120 && z < 145) continue;
        if(Math.random() > 0.6) {
            const rock = new THREE.Mesh(junkGeo, mats.concrete);
            rock.position.set((Math.random()-0.5)*6, 0.25, z + Math.random());
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            rock.scale.set(Math.random()*0.5 + 0.5, Math.random()*0.3, Math.random()*0.5 + 0.5);
            scene.add(rock);
        }
    }

    return {
        statue: statueGroup, ritualCursor, handDoor, emoDoor, finalDoor: null, obsDoor,
        doorL, doorC, doorR, memoryHint, hiddenSymbol, ghostBridge, puzzleTextures
    };
}
