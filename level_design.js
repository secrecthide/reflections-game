/* level_design.js - GAP FIX & CLIP FIX */
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// --- TEXTURE GENERATION SYSTEM (UPGRADED) ---
function createProceduralTexture(type, colorHex) {
    const s = 512;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');
    
    ctx.fillStyle = colorHex; ctx.fillRect(0,0,s,s);
    
    const iData = ctx.getImageData(0,0,s,s);
    for(let i=0; i<iData.data.length; i+=4) {
        const grain = (Math.random() - 0.5) * 30;
        if (type === 'roughness') {
            const v = Math.random() > 0.6 ? 255 : 50; 
            iData.data[i] = v; iData.data[i+1] = v; iData.data[i+2] = v; 
        } else {
            iData.data[i] = Math.max(0, Math.min(255, iData.data[i] + grain));
            iData.data[i+1] = Math.max(0, Math.min(255, iData.data[i+1] + grain));
            iData.data[i+2] = Math.max(0, Math.min(255, iData.data[i+2] + grain));
        }
        iData.data[i+3] = 255;
    }
    ctx.putImageData(iData, 0, 0);

    if (type !== 'roughness') {
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = '#443322';
        for(let k=0; k<20; k++) {
            const x = Math.random()*s; const y = Math.random()*s; const r = Math.random()*50;
            ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
        for(let k=0; k<40; k++) {
            const x = Math.random()*s;
            ctx.fillRect(x, 0, Math.random()*2, Math.random()*s);
        }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createTileMap() {
    const s = 512;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');
    
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0,0,s,s);
    
    const ts = 64; 
    for(let y=0; y<s; y+=ts) {
        for(let x=0; x<s; x+=ts) {
            if (Math.random() > 0.9) continue;
            const tint = 50 + Math.random() * 40;
            ctx.fillStyle = `rgb(${tint}, ${tint}, ${tint})`;
            ctx.fillRect(x+2, y+2, ts-4, ts-4);
        }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
}

function createDoorTexture(type) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512;
    const ctx = c.getContext('2d');
    
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(0,0,256,512);
    ctx.strokeStyle = '#521'; ctx.lineWidth = 15; ctx.strokeRect(0,0,256,512);
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(30, 50, 196, 180); ctx.fillRect(30, 260, 196, 200);
    
    if (type === 'face') {
        ctx.fillStyle = '#eee'; ctx.font = "20px Monospace"; ctx.textAlign="center";
        ctx.fillText("MIMIC", 128, 150);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(80, 100, 10, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(176, 100, 10, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(128, 160, 20, 40, 0, 0, Math.PI*2); ctx.stroke();
    } else if (type === 'hand') {
        ctx.fillStyle = '#800'; ctx.font = "bold 60px Arial"; ctx.fillText("✋", 128, 350);
        ctx.font = "15px Monospace"; ctx.fillStyle = "#f00"; ctx.fillText("ALIGN", 128, 380);
    }
    return new THREE.CanvasTexture(c);
}

function createPaperTexture() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ddd'; ctx.fillRect(0,0,128,128);
    ctx.fillStyle = '#000';
    for(let i=10; i<118; i+=10) ctx.fillRect(10, i, Math.random()*100, 1);
    return new THREE.CanvasTexture(c);
}

const mats = {
    wallBase: new THREE.MeshStandardMaterial({ 
        map: createProceduralTexture('diffuse', '#555555'),
        roughnessMap: createProceduralTexture('roughness', '#000000'),
        roughness: 0.8, bumpMap: createProceduralTexture('bump', '#888888'), bumpScale: 0.2
    }),
    floor: new THREE.MeshStandardMaterial({ map: createTileMap(), roughness: 0.2, metalness: 0.3 }),
    rust: new THREE.MeshStandardMaterial({ map: createProceduralTexture('diffuse', '#3f2a22'), roughness: 1.0 }),
    metalDark: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.8 }),
    emissiveRed: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff0000, emissiveIntensity: 3 }),
    emissiveGreen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x00ff00, emissiveIntensity: 3 }),
    emissiveBlue: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x0000ff, emissiveIntensity: 3 }),
    black: new THREE.MeshBasicMaterial({ color: 0x000000 }),
};

// --- BUILDER FUNCTIONS (WITH OVERLAP FIX) ---

// Added "Overlap" constant to prevent gaps
const OVL = 0.05;

function addBox(scene, walls, x, y, z, w, h, d, mat, name="wall", collision=true) {
    // We add OVL (Overlap) to dimensions to ensure walls fuse together visually
    const geo = new THREE.BoxGeometry(w + OVL, h + OVL, d + OVL);
    
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
        const u = uv.getX(i); const v = uv.getY(i);
        uv.setXY(i, u * (w+d)/2, v * h/2);
    }
    uv.needsUpdate = true;

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.name = name;
    scene.add(mesh);
    if (collision) walls.push(mesh);
    return mesh;
}

function addPipe(scene, x, y, z, len, axis='z') {
    const geo = new THREE.CylinderGeometry(0.15, 0.15, len, 8);
    const mesh = new THREE.Mesh(geo, mats.rust);
    if (axis === 'z') {
        mesh.rotation.x = Math.PI/2; mesh.position.set(x, y, z + len/2);
    } else {
        mesh.rotation.z = Math.PI/2; mesh.position.set(x + len/2, y, z);
    }
    mesh.castShadow = true; scene.add(mesh);
}

// --- MAIN LEVEL GENERATION ---

export function initLevel(scene, walls, batteries, State, mirrorTexture) {
    
    // 1. GLOBAL FLOORS & CEILINGS
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 300), mats.floor);
    floor.rotation.x = -Math.PI/2; floor.position.set(0, 0, 150); floor.receiveShadow = true;
    mats.floor.map.repeat.set(10, 100); scene.add(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(30, 300), mats.wallBase);
    ceil.rotation.x = Math.PI/2; ceil.position.set(0, 4.5, 150); ceil.receiveShadow = true;
    scene.add(ceil);

    // =========================================================
    // ZONE 1: THE CELLAR
    // =========================================================
    addBox(scene, walls, 0, 2.25, -5, 10, 4.5, 1, mats.wallBase);

    for (let z = -5; z < 15; z += 5) {
        // Thick Pillars (Block light leaks)
        addBox(scene, walls, -3, 2.25, z, 0.6, 4.5, 0.6, mats.rust);
        addBox(scene, walls, 3, 2.25, z, 0.6, 4.5, 0.6, mats.rust);
        
        // Walls recessed slightly
        addBox(scene, walls, -3.5, 2.25, z+2.5, 1, 4.5, 5, mats.wallBase);
        addBox(scene, walls, 3.5, 2.25, z+2.5, 1, 4.5, 5, mats.wallBase);
        
        const arch = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 0.5), mats.rust);
        arch.position.set(0, 4, z); scene.add(arch);
    }

    // THE EMOTION DOOR FRAME (FIXED: Created a hole for the door)
    // Left side of door frame
    addBox(scene, walls, -2.75, 2.25, 5, 3.5, 4.5, 0.5, mats.metalDark);
    // Right side of door frame
    addBox(scene, walls, 2.75, 2.25, 5, 3.5, 4.5, 0.5, mats.metalDark);
    // Top of door frame
    addBox(scene, walls, 0, 4.1, 5, 2, 0.8, 0.5, mats.metalDark);
    
    // The Door (Placed FREELY in the hole, no Z-fighting)
    const emoDoor = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.6, 0.2), new THREE.MeshStandardMaterial({ map: createDoorTexture('face'), roughness: 0.3 }));
    emoDoor.position.set(0, 1.8, 5); emoDoor.name = "emotion_door"; 
    scene.add(emoDoor); walls.push(emoDoor);
    
    const note1 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshBasicMaterial({map: createPaperTexture()}));
    note1.position.set(1.1, 2, 4.7); note1.rotation.y = -0.4; note1.name = "emotion_note"; scene.add(note1);

    // =========================================================
    // ZONE 2: INDUSTRIAL TUNNEL
    // =========================================================
    for(let z=15; z<40; z+=5) {
        addBox(scene, walls, -2.5, 2.25, z+2.5, 1, 4.5, 5, mats.rust);
        addBox(scene, walls, 2.5, 2.25, z+2.5, 1, 4.5, 5, mats.rust);
        addPipe(scene, -2.1, 1, z, 5, 'z'); addPipe(scene, -2.1, 1.2, z, 5, 'z'); addPipe(scene, 2.1, 3.5, z, 5, 'z');
    }

    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.2,8), mats.emissiveGreen);
    b1.position.set(-1, 0.2, 20); b1.rotation.z=Math.PI/2; b1.name="battery"; scene.add(b1); batteries.push(b1);
    const b2 = b1.clone(); b2.position.set(1, 0.2, 30); scene.add(b2); batteries.push(b2);

    addBox(scene, walls, 3, 2.25, 35, 2, 4.5, 3, mats.wallBase);
    if (mirrorTexture) {
        const mirrorMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), new THREE.MeshBasicMaterial({map: mirrorTexture}));
        mirrorMesh.position.set(1.9, 2, 35); mirrorMesh.rotation.y = -Math.PI/2; mirrorMesh.scale.x = -1; scene.add(mirrorMesh);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 0.1), mats.metalDark);
        frame.position.set(1.95, 2, 35); frame.rotation.y = -Math.PI/2; scene.add(frame);
    }

    // HAND DOOR (FIXED: Frame cut-out)
    addBox(scene, walls, -2.75, 2.25, 40, 3.5, 4.5, 1, mats.metalDark);
    addBox(scene, walls, 2.75, 2.25, 40, 3.5, 4.5, 1, mats.metalDark);
    addBox(scene, walls, 0, 4.25, 40, 2.0, 1.5, 1, mats.metalDark);

    const handDoor = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.8, 0.2), new THREE.MeshStandardMaterial({ map: createDoorTexture('hand') }));
    handDoor.position.set(0, 1.9, 40); handDoor.name = "hand_door"; 
    scene.add(handDoor); walls.push(handDoor);

    const ritualCursor = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color: 0x00ffff, transparent: true, opacity: 0.5}));
    scene.add(ritualCursor);
    const note2 = note1.clone(); note2.position.set(-1.1, 1.5, 39.4); note2.rotation.y=0.4; note2.name = "hand_note"; scene.add(note2);

    // =========================================================
    // ZONE 3: THE PILLAR GARDEN
    // =========================================================
    for (let z=45; z<95; z+=10) {
        addBox(scene, walls, -7, 2.25, z+5, 1, 4.5, 10, mats.wallBase);
        addBox(scene, walls, 7, 2.25, z+5, 1, 4.5, 10, mats.wallBase);
        const beam = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 0.5), mats.metalDark);
        beam.position.set(0, 4, z); scene.add(beam);
    }

    const pillarLocs = [[-2, 50], [2, 55], [-3, 62], [1, 68], [-1, 75], [3, 82], [-2, 88]];
    pillarLocs.forEach(pos => {
        addBox(scene, walls, pos[0], 2.25, pos[1], 1, 4.5, 1, mats.wallBase);
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 1.2), mats.metalDark);
        base.position.set(pos[0], 0.1, pos[1]); scene.add(base);
    });

    const statueGroup = new THREE.Group();
    const sBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.8, 6), mats.wallBase); sBody.position.y = 0.9;
    const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), new THREE.MeshStandardMaterial({color:0xdddddd, roughness:0.1})); sHead.position.y = 1.9;
    const sArmL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), mats.wallBase); sArmL.position.set(-0.4, 1.4, 0.3); sArmL.rotation.x = -0.5;
    const sArmR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), mats.wallBase); sArmR.position.set(0.4, 1.4, 0.3); sArmR.rotation.x = -0.5;
    statueGroup.add(sBody, sHead, sArmL, sArmR); statueGroup.position.set(0, 0, 85); scene.add(statueGroup);
    const note3 = note1.clone(); note3.position.set(0, 0.05, 60); note3.rotation.set(-Math.PI/2, 0, 0); note3.name = "statue_note"; scene.add(note3);

    // =========================================================
    // ZONE 4: THE VOID
    // =========================================================
    addBox(scene, walls, 0, 4, 98, 14, 2, 1, mats.black);
    addBox(scene, walls, -5, 2, 98, 4, 4, 1, mats.black);
    addBox(scene, walls, 5, 2, 98, 4, 4, 1, mats.black);

    const memoryHint = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), new THREE.MeshBasicMaterial({color:0xffffff}));
    memoryHint.position.set(0, 2, 95); scene.add(memoryHint);

    addBox(scene, walls, -4, 2.25, 110, 4, 4.5, 0.5, mats.wallBase);
    addBox(scene, walls, 4, 2.25, 110, 4, 4.5, 0.5, mats.wallBase);
    addBox(scene, walls, 0, 4, 110, 4, 1, 0.5, mats.wallBase);
    
    const alignPuzzle = new THREE.Mesh(new THREE.PlaneGeometry(3,3), new THREE.MeshStandardMaterial({
        map: createProceduralTexture('diffuse', '#000'), transparent:true, opacity:0.9, side: THREE.DoubleSide
    }));
    alignPuzzle.position.set(-2, 2, 110); alignPuzzle.rotation.y=Math.PI/2; alignPuzzle.name="align_puzzle"; scene.add(alignPuzzle);
    
    const hiddenSymbol = new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5), new THREE.MeshBasicMaterial({
        map: createDoorTexture('face'), transparent:true, opacity:0
    }));
    hiddenSymbol.position.set(-1.9, 2, 110); hiddenSymbol.rotation.y=Math.PI/2; scene.add(hiddenSymbol);

    for(let i=0; i<20; i++) {
        const debris = new THREE.Mesh(new THREE.BoxGeometry(Math.random(), Math.random(), Math.random()), mats.wallBase);
        debris.position.set((Math.random()-0.5)*15, (Math.random()-0.5)*10, 125 + Math.random()*20);
        debris.rotation.set(Math.random(), Math.random(), Math.random()); scene.add(debris);
    }
    
    const ghostBridge = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 22), new THREE.MeshStandardMaterial({
        color: 0x444444, transparent: true, opacity: 0.3, roughness: 0.1
    }));
    ghostBridge.position.set(0, 0, 136); scene.add(ghostBridge);

    if(mirrorTexture) {
        const mFrame = addBox(scene, walls, 0, 2.5, 160, 3, 4, 0.5, mats.rust);
        const m2 = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.5), new THREE.MeshBasicMaterial({map: mirrorTexture}));
        m2.position.set(0, 0, -0.3); m2.scale.x = -1; mFrame.add(m2);
        const clue = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), mats.emissiveGreen);
        clue.position.set(0, 4.6, 160); scene.add(clue);
    }

    // =========================================================
    // ZONE 5: INFINITE HALLWAY
    // =========================================================
    for(let z=170; z<230; z+=4) {
        addBox(scene, walls, -2.5, 2.25, z, 0.5, 4.5, 0.5, mats.black);
        addBox(scene, walls, 2.5, 2.25, z, 0.5, 4.5, 0.5, mats.black);
        const top = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.5, 0.5), mats.black);
        top.position.set(0, 4, z); scene.add(top);
        if(z % 8 === 0) {
            const lightStrip = new THREE.Mesh(new THREE.BoxGeometry(4, 0.05, 0.1), new THREE.MeshStandardMaterial({emissive: 0x112211, color:0x000000}));
            lightStrip.position.set(0, 0.02, z); scene.add(lightStrip);
        }
    }
    
    const stopRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 32), mats.emissiveRed);
    stopRing.rotation.x = -Math.PI/2; stopRing.position.set(0, 0.05, 198); scene.add(stopRing);

    // OBS DOOR (FIXED: Frame cut-out)
    addBox(scene, walls, -2.75, 2.25, 230, 3.5, 4.5, 0.5, mats.rust);
    addBox(scene, walls, 2.75, 2.25, 230, 3.5, 4.5, 0.5, mats.rust);
    addBox(scene, walls, 0, 4.25, 230, 2.0, 1.0, 0.5, mats.rust);

    const obsDoor = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.8, 0.2), mats.rust);
    obsDoor.position.set(0, 1.9, 230); scene.add(obsDoor); walls.push(obsDoor);

    // =========================================================
    // ZONE 6: FINAL DOORS
    // =========================================================
    const dGeo = new THREE.BoxGeometry(1.5, 3, 0.2);
    const doorL = new THREE.Mesh(dGeo, mats.emissiveRed);
    const doorC = new THREE.Mesh(dGeo, mats.emissiveGreen);
    const doorR = new THREE.Mesh(dGeo, mats.emissiveBlue);
    doorL.position.set(-3, 1.5, 245); doorC.position.set(0, 1.5, 245); doorR.position.set(3, 1.5, 245);
    scene.add(doorL, doorC, doorR); walls.push(doorL, doorC, doorR);
    
    addBox(scene, walls, 0, 2.25, 255, 20, 4.5, 1, mats.wallBase);
    [20, 60, 90, 110, 175, 210].forEach(z => {
        const b = b1.clone(); b.position.set((Math.random()-0.5)*4, 0.2, z); scene.add(b); batteries.push(b);
    });

    return {
        statue: statueGroup, ritualCursor, handDoor, emoDoor, finalDoor: null, obsDoor,
        doorL, doorC, doorR, memoryHint, hiddenSymbol, ghostBridge, 
        puzzleTextures: { hidden: mats.wallBase.map, revealed: mats.emissiveRed.map }
    };
}
