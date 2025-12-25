/* level_design.js - TEXTURES & GEOMETRY REDESIGN */
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// --- ADVANCED TEXTURE GENERATORS ---

function createNoiseCanvas(width, height, opacity = 0.2) {
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, width, height);
    const iData = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < iData.data.length; i += 4) {
        const v = Math.random() * 255;
        iData.data[i] = v; iData.data[i+1] = v; iData.data[i+2] = v; iData.data[i+3] = 255 * opacity;
    }
    ctx.putImageData(iData, 0, 0);
    return c;
}

function createGrungeTexture(colorHex, type = 'wall') {
    const s = 512;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');

    // Base
    ctx.fillStyle = colorHex; ctx.fillRect(0, 0, s, s);

    // Overlay Noise
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(createNoiseCanvas(s, s, 0.4), 0, 0);

    // Grime/Drips
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#000';
    for(let i=0; i<30; i++) {
        const x = Math.random() * s;
        const w = Math.random() * 5 + 1;
        const h = Math.random() * (s/2) + (s/4);
        ctx.fillRect(x, 0, w, h);
    }
    
    // Water damage at bottom
    const grad = ctx.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.8, 'rgba(0,0,0,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, s, s);

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
    const tileS = 64;
    for(let y=0; y<s; y+=tileS) {
        for(let x=0; x<s; x+=tileS) {
            // Random tile color variation
            const val = 30 + Math.random() * 20;
            ctx.fillStyle = `rgb(${val},${val},${val})`;
            
            // Draw tile with gap
            if (Math.random() > 0.05) { // 5% missing tiles
                ctx.fillRect(x+2, y+2, tileS-4, tileS-4);
            }
        }
    }
    
    // Blood splatter
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#400';
    ctx.beginPath();
    ctx.arc(s/2, s/2, 100, 0, Math.PI*2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 20);
    return tex;
}

function createDetailedDoor(type) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512;
    const ctx = c.getContext('2d');

    // Base Wood/Metal
    ctx.fillStyle = type === 'final' ? '#111' : '#321'; 
    ctx.fillRect(0,0,256,512);

    // Panels
    ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
    ctx.strokeRect(20, 20, 216, 200);
    ctx.strokeRect(20, 240, 216, 250);

    // Context specific details
    if (type === 'face') {
        ctx.fillStyle = '#fff'; ctx.font = '20px Arial'; ctx.textAlign = 'center';
        ctx.fillText("OBSERVE", 128, 150);
        // Scratch marks
        ctx.strokeStyle = '#666'; ctx.lineWidth = 1;
        for(let i=0; i<100; i++) {
            ctx.beginPath(); ctx.moveTo(Math.random()*256, 200 + Math.random()*100);
            ctx.lineTo(Math.random()*256, 200 + Math.random()*100); ctx.stroke();
        }
    } else if (type === 'hand') {
        ctx.fillStyle = '#500';
        // Bloody handprints
        for(let i=0; i<5; i++) {
            ctx.beginPath(); ctx.arc(50 + Math.random()*150, 250 + Math.random()*100, 20, 0, Math.PI*2); ctx.fill();
        }
    } else if (type === 'final') {
        ctx.fillStyle = '#f00'; ctx.font = "bold 50px Courier"; ctx.textAlign="center"; 
        ctx.fillText("EXIT", 128, 100);
        // Warning stripes
        ctx.fillStyle = '#aa0';
        for(let i=0; i<512; i+=40) ctx.fillRect(0, i, 256, 10);
    }

    // Dirt overlay
    ctx.drawImage(createNoiseCanvas(256, 512, 0.5), 0, 0);

    return new THREE.CanvasTexture(c);
}

function createNotePaper() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ddccaa'; ctx.fillRect(0,0,256,256);
    // Writing
    ctx.fillStyle = '#000';
    for(let i=40; i<240; i+=20) ctx.fillRect(20, i, 200 + Math.random()*16, 2);
    // Blood stain
    ctx.fillStyle = 'rgba(100,0,0,0.5)';
    ctx.beginPath(); ctx.arc(200, 200, 40, 0, Math.PI*2); ctx.fill();
    return new THREE.CanvasTexture(c);
}

// --- MATERIALS ---
const mats = {
    concrete: new THREE.MeshStandardMaterial({ map: createGrungeTexture('#333'), roughness: 0.9, bumpScale: 0.5 }),
    floor: new THREE.MeshStandardMaterial({ map: createTileTexture(), roughness: 0.5, metalness: 0.2 }),
    rust: new THREE.MeshStandardMaterial({ map: createGrungeTexture('#421', 'rust'), roughness: 0.8, color: 0x885544 }),
    black: new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1.0 }),
    emissiveRed: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff0000, emissiveIntensity: 2 }),
    emissiveGreen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x00ff00, emissiveIntensity: 2 }),
    emissiveBlue: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x0000ff, emissiveIntensity: 2 }),
};

// --- GEOMETRY HELPERS ---

function createPipe(scene, x, y, z, length, axis='z') {
    const geo = new THREE.CylinderGeometry(0.1, 0.1, length, 8);
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
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i); const y = pos.getY(i); const z = pos.getZ(i);
        // Simple planar projection based on normal would be better, but this works for boxes
        uv.setXY(i, (x+z)*0.5, y*0.5);
    }
    uv.needsUpdate = true;
}

// --- MAIN INIT ---
export function initLevel(scene, walls, batteries, State, mirrorTexture) {

    // 1. THE FLOOR (Continuous)
    const floorGeo = new THREE.PlaneGeometry(100, 600);
    const floor = new THREE.Mesh(floorGeo, mats.floor);
    floor.rotation.x = -Math.PI/2; 
    floor.position.z = 200; 
    floor.receiveShadow = true; 
    scene.add(floor);

    // 2. CEILING (Continuous to hide skybox)
    const ceilGeo = new THREE.PlaneGeometry(100, 600);
    const ceiling = new THREE.Mesh(ceilGeo, mats.concrete);
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
        walls.push(mesh); // IMPORTANT: Add to logic array
        return mesh;
    }

    // HELPER: Visual Detail Builder (No Collision)
    function addDetail(geo, mat, x, y, z, rotX=0, rotY=0, rotZ=0) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.rotation.set(rotX, rotY, rotZ);
        scene.add(mesh);
        return mesh;
    }

    // =========================================================
    // ACT I: THE CELLAR (Start to Z=15)
    // =========================================================
    
    // Main Corridor Structure
    addWall(-5.5, 2.25, 0, 1, 4.5, 30); // Left
    addWall(5.5, 2.25, 0, 1, 4.5, 30);  // Right
    
    // Start Room (Back wall)
    addWall(0, 2.25, -10, 12, 4.5, 1);
    
    // The Emotion Door Frame
    addWall(-2.5, 2.25, 5, 4, 4.5, 0.5); 
    addWall(2.5, 2.25, 5, 4, 4.5, 0.5);
    addWall(0, 4, 5, 2, 1, 0.5);

    // Atmosphere: Pipes
    createPipe(scene, -4.8, 4, -10, 40, 'z');
    createPipe(scene, 4.8, 0.5, -10, 40, 'z');

    // OBJECTS
    const emoDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.15), new THREE.MeshStandardMaterial({ map: createDetailedDoor('face') }));
    emoDoor.position.set(0, 1.9, 5); emoDoor.name = "emotion_door"; scene.add(emoDoor); walls.push(emoDoor);

    const note1 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: createNotePaper(), side: THREE.DoubleSide }));
    note1.position.set(1.6, 2.0, 4.95); note1.rotation.z = -0.1; note1.name = "emotion_note"; scene.add(note1);

    // =========================================================
    // ACT II: INDUSTRIAL TUNNEL (Z=15 to Z=40)
    // =========================================================
    
    // Narrowing the path visually
    addWall(-4.5, 2.25, 30, 2, 4.5, 40, mats.rust);
    addWall(4.5, 2.25, 30, 2, 4.5, 40, mats.rust);

    // Batteries
    function addBat(x, z) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.3,16), new THREE.MeshStandardMaterial({color:0x00ff00, emissive:0x005500}));
        m.position.set(x, 0.15, z); m.name = "battery"; m.castShadow=true; scene.add(m); batteries.push(m);
    }
    addBat(0, 15); addBat(1, 25);

    // Lag Mirror
    const mirrorFrame = addWall(3.2, 2.25, 35, 0.2, 3.5, 2.5, mats.rust);
    if (mirrorTexture) {
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), new THREE.MeshBasicMaterial({ map: mirrorTexture }));
        glass.position.set(-0.11, 0, 0); glass.rotation.y = -Math.PI/2; glass.scale.x = -1; // Flip for reflection
        mirrorFrame.add(glass);
    }

    // Hand Door Area
    addWall(-3.5, 2.25, 40, 4, 4.5, 1); 
    addWall(3.5, 2.25, 40, 4, 4.5, 1); 
    addWall(0, 4, 40, 3, 1, 1);

    const handDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.15), new THREE.MeshStandardMaterial({ map: createDetailedDoor('hand') }));
    handDoor.position.set(0, 1.9, 40); handDoor.name = "hand_door"; scene.add(handDoor); walls.push(handDoor);

    // Clutter/Crate for Note 2
    const crate = addWall(2.5, 0.5, 38, 1, 1, 1, mats.rust);
    const note2 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: createNotePaper() }));
    note2.position.set(2.5, 1.01, 38); note2.rotation.x = -Math.PI/2; note2.rotation.z = 0.2; note2.name = "hand_note"; scene.add(note2);

    const cursorMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0 }); 
    const ritualCursor = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), cursorMat);
    scene.add(ritualCursor);

    // =========================================================
    // ACT III: THE GALLERY (Z=40 to Z=100)
    // =========================================================
    
    // Wider Hall
    addWall(-6, 2.25, 70, 1, 4.5, 60, mats.concrete);
    addWall(6, 2.25, 70, 1, 4.5, 60, mats.concrete);
    
    // Pillars to hide behind
    for(let z=50; z<90; z+=10) {
        addWall(-2, 2.25, z, 0.5, 4.5, 0.5, mats.concrete);
        addWall(2, 2.25, z, 0.5, 4.5, 0.5, mats.concrete);
    }

    // The Statue (Scary)
    const statueGroup = new THREE.Group();
    const sBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.7, 12), mats.concrete);
    const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), mats.concrete); sHead.position.y = 1;
    // Glowing Eyes
    const sEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05), mats.emissiveRed); sEyeL.position.set(-0.1, 1.1, 0.25);
    const sEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.05), mats.emissiveRed); sEyeR.position.set(0.1, 1.1, 0.25);
    statueGroup.add(sBody, sHead, sEyeL, sEyeR);
    statueGroup.position.set(0, 0.9, 80); 
    scene.add(statueGroup);
    
    // Note 3 on floor
    const note3 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: createNotePaper() }));
    note3.position.set(0, 0.02, 62); note3.rotation.x = -Math.PI/2; note3.name = "statue_note"; scene.add(note3);

    // =========================================================
    // ACT IV: THE VOID (Z=100+)
    // =========================================================
    
    // Memory Puzzle Hint
    const memoryHint = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), new THREE.MeshStandardMaterial({color:0xffffff}));
    memoryHint.position.set(0, 2, 95); scene.add(memoryHint);
    
    // Pedestal
    addWall(0, 0.5, 95, 1, 1, 1, mats.black); 
    
    // Puzzle Alignment Wall (Must be at Z=110)
    addWall(-4, 2.25, 100, 3, 4.5, 1); addWall(4, 2.25, 100, 3, 4.5, 1); addWall(0, 4, 100, 5, 1, 1);
    
    const puzzleTextures = {
        hidden: createGrungeTexture('#000'), 
        revealed: createGrungeTexture('#220000') 
    };
    
    const alignWall = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({map: puzzleTextures.hidden, transparent:true, opacity: 0.9}));
    alignWall.position.set(-4, 2, 110); alignWall.rotation.y = Math.PI/2; alignWall.name = "align_puzzle"; scene.add(alignWall);
    
    const hiddenSymbol = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({map: createDetailedDoor('face'), transparent:true, opacity: 0}));
    hiddenSymbol.position.set(-3.9, 2, 110); hiddenSymbol.rotation.y = Math.PI/2; scene.add(hiddenSymbol);

    // THE PIT (Z=125 to 145)
    const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 0.1), mats.rust);
    signPost.position.set(1.5, 1, 125); scene.add(signPost);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.05), mats.emissiveRed);
    sign.position.set(1.5, 1.8, 125); scene.add(sign); // "Danger"

    // The bridge (invisible or barely visible)
    const pitCover = new THREE.Mesh(new THREE.PlaneGeometry(10, 20), mats.black);
    pitCover.rotation.x = -Math.PI/2; pitCover.position.set(0, 0.05, 135); scene.add(pitCover);
    
    const ghostBridge = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 24), new THREE.MeshStandardMaterial({
        color: 0x444444, roughness: 0.2, transparent: true, opacity: 0.5
    }));
    ghostBridge.position.set(0, 0.1, 135); scene.add(ghostBridge);

    // Walls around pit
    addWall(-5.5, 2.25, 135, 1, 4.5, 20); 
    addWall(5.5, 2.25, 135, 1, 4.5, 20); 

    // Mirror 2
    const mirrorFrame2 = addWall(0, 2.25, 160.5, 2.5, 3.5, 0.5, mats.rust);
    const realWallCode = new THREE.Mesh(new THREE.PlaneGeometry(1,0.5), mats.emissiveGreen); 
    realWallCode.position.set(0, 3.5, 159.5); scene.add(realWallCode); // Clue above mirror

    if(mirrorTexture) {
        const m2 = new THREE.Mesh(new THREE.PlaneGeometry(2,3), new THREE.MeshBasicMaterial({map:mirrorTexture}));
        m2.position.set(0,0,0.3); m2.scale.x = -1; mirrorFrame2.add(m2);
    }

    // =========================================================
    // ACT V: INFINITE HALLWAY (Z=180 to 210)
    // =========================================================
    
    // Repetitive patterns
    for(let z=170; z<230; z+=5) {
        addWall(-3, 2.25, z, 1, 4.5, 1, mats.concrete); // Ribs
        addWall(3, 2.25, z, 1, 4.5, 1, mats.concrete);
        createPipe(scene, -2.5, 3, z, 5, 'z');
    }
    // Main walls backing the ribs
    addWall(-3.5, 2.25, 200, 1, 4.5, 60, mats.black);
    addWall(3.5, 2.25, 200, 1, 4.5, 60, mats.black);

    // The "Stop" Marker
    const stopMarker = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 32), mats.emissiveRed);
    stopMarker.rotation.x = -Math.PI/2; stopMarker.position.set(0, 0.05, 198); scene.add(stopMarker);

    // Observation Door
    const obsDoor = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.2), mats.rust);
    obsDoor.position.set(0, 2, 230); scene.add(obsDoor); walls.push(obsDoor);

    // =========================================================
    // ACT VI: FINAL DOORS (Z=245)
    // =========================================================
    
    // Batteries scattered
    const locs = [[2, 55], [-2, 60], [0, 85], [3, 105], [-3, 115], [0, 150], [2, 170], [-2, 175], [-3, 190], [0, 195], [3, 200]];
    locs.forEach(l => addBat(l[0], l[1]));

    const doorGeo = new THREE.BoxGeometry(1.5, 3, 0.2);
    const doorL = new THREE.Mesh(doorGeo, mats.emissiveRed); 
    const doorC = new THREE.Mesh(doorGeo, mats.emissiveGreen); 
    const doorR = new THREE.Mesh(doorGeo, mats.emissiveBlue); 
    doorL.position.set(-3, 1.5, 245); doorC.position.set(0, 1.5, 245); doorR.position.set(3, 1.5, 245);
    scene.add(doorL); scene.add(doorC); scene.add(doorR);
    walls.push(doorL); walls.push(doorC); walls.push(doorR);

    // Final Wall
    addWall(0, 2.25, 250, 20, 4.5, 1, mats.concrete);

    // --- DEBRIS SYSTEM ---
    const junkGeo = new THREE.BoxGeometry(Math.random()*0.5, Math.random()*0.5, Math.random()*0.5);
    for(let z=-5; z<240; z+=4) {
        if(z > 120 && z < 145) continue; // Skip pit
        if(Math.random() > 0.7) {
            const rock = new THREE.Mesh(junkGeo, mats.concrete);
            rock.position.set((Math.random()-0.5)*6, 0.2, z + Math.random());
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            scene.add(rock);
        }
    }

    return {
        statue: statueGroup, ritualCursor, handDoor, emoDoor, finalDoor: null, obsDoor,
        doorL, doorC, doorR, memoryHint, hiddenSymbol, ghostBridge, puzzleTextures
    };
}