/* level_design.js - OVERHAULED ATMOSPHERE & GEOMETRY */
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// --- TEXTURE GENERATION SYSTEM (UPGRADED) ---

// Helper: Generates noise for diffuse, roughness, and bump maps
function createProceduralTexture(type, colorHex) {
    const s = 512;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');
    
    // Fill Base
    ctx.fillStyle = colorHex; ctx.fillRect(0,0,s,s);
    
    // Noise Generation
    const iData = ctx.getImageData(0,0,s,s);
    for(let i=0; i<iData.data.length; i+=4) {
        const grain = (Math.random() - 0.5) * 30;
        if (type === 'roughness') {
            // High contrast for wet spots
            const v = Math.random() > 0.6 ? 255 : 50; 
            iData.data[i] = v; iData.data[i+1] = v; iData.data[i+2] = v; 
        } else {
            // Standard Grunge
            iData.data[i] = Math.max(0, Math.min(255, iData.data[i] + grain));
            iData.data[i+1] = Math.max(0, Math.min(255, iData.data[i+1] + grain));
            iData.data[i+2] = Math.max(0, Math.min(255, iData.data[i+2] + grain));
        }
        iData.data[i+3] = 255;
    }
    ctx.putImageData(iData, 0, 0);

    // Overlay Grime Details
    if (type !== 'roughness') {
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = '#443322';
        for(let k=0; k<20; k++) {
            const x = Math.random()*s; const y = Math.random()*s; const r = Math.random()*50;
            ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
        }
        // Drips
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
    
    // Dark grout
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0,0,s,s);
    
    // Tiles
    const ts = 64; 
    for(let y=0; y<s; y+=ts) {
        for(let x=0; x<s; x+=ts) {
            // Broken tiles
            if (Math.random() > 0.9) continue;
            
            const tint = 50 + Math.random() * 40;
            ctx.fillStyle = `rgb(${tint}, ${tint}, ${tint})`;
            ctx.fillRect(x+2, y+2, ts-4, ts-4);
            
            // Cracks
            if (Math.random() > 0.7) {
                ctx.strokeStyle = '#000'; ctx.beginPath();
                ctx.moveTo(x+2, y+2); ctx.lineTo(x+ts-2, y+ts-2); ctx.stroke();
            }
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
    
    // Base Metal
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(0,0,256,512);
    
    // Rust Borders
    ctx.strokeStyle = '#521'; ctx.lineWidth = 15;
    ctx.strokeRect(0,0,256,512);
    
    // Inner Panels
    ctx.fillStyle = '#1a1a1a'; 
    ctx.fillRect(30, 50, 196, 180);
    ctx.fillRect(30, 260, 196, 200);
    
    if (type === 'face') {
        ctx.fillStyle = '#eee'; ctx.font = "20px Monospace"; ctx.textAlign="center";
        ctx.fillText("MIMIC", 128, 150);
        // Scratch eyes
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(80, 100, 10, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(176, 100, 10, 0, Math.PI*2); ctx.stroke();
        // Screaming mouth
        ctx.beginPath(); ctx.ellipse(128, 160, 20, 40, 0, 0, Math.PI*2); ctx.stroke();
    } else if (type === 'hand') {
        ctx.fillStyle = '#800'; 
        ctx.font = "bold 60px Arial"; ctx.fillText("✋", 128, 350);
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

// --- MATERIALS LIBRARY ---
// We create materials that interact with light (StandardMaterial) to make the flashlight feel real
const mats = {
    // Wet Concrete: High roughness contrast
    wallBase: new THREE.MeshStandardMaterial({ 
        map: createProceduralTexture('diffuse', '#555555'),
        roughnessMap: createProceduralTexture('roughness', '#000000'),
        roughness: 0.8,
        bumpMap: createProceduralTexture('bump', '#888888'),
        bumpScale: 0.2
    }),
    floor: new THREE.MeshStandardMaterial({ 
        map: createTileMap(), 
        roughness: 0.2, // Shiny tiles
        metalness: 0.3
    }),
    rust: new THREE.MeshStandardMaterial({ 
        map: createProceduralTexture('diffuse', '#3f2a22'),
        roughness: 1.0
    }),
    metalDark: new THREE.MeshStandardMaterial({
        color: 0x111111, roughness: 0.4, metalness: 0.8
    }),
    emissiveRed: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff0000, emissiveIntensity: 3 }),
    emissiveGreen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x00ff00, emissiveIntensity: 3 }),
    emissiveBlue: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x0000ff, emissiveIntensity: 3 }),
    black: new THREE.MeshBasicMaterial({ color: 0x000000 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.0, metalness: 0.9, transparent: true, opacity: 0.3 })
};

// --- BUILDER FUNCTIONS ---

function addBox(scene, walls, x, y, z, w, h, d, mat, name="wall", collision=true) {
    const geo = new THREE.BoxGeometry(w, h, d);
    
    // UV Mapping Adjustment for tiling
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
        const u = uv.getX(i); const v = uv.getY(i);
        uv.setXY(i, u * (w+d)/2, v * h/2);
    }
    uv.needsUpdate = true;

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true; 
    mesh.receiveShadow = true;
    mesh.name = name;
    scene.add(mesh);
    if (collision) walls.push(mesh);
    return mesh;
}

function addPipe(scene, x, y, z, len, axis='z') {
    const geo = new THREE.CylinderGeometry(0.15, 0.15, len, 8);
    const mesh = new THREE.Mesh(geo, mats.rust);
    if (axis === 'z') {
        mesh.rotation.x = Math.PI/2;
        mesh.position.set(x, y, z + len/2);
    } else {
        mesh.rotation.z = Math.PI/2;
        mesh.position.set(x + len/2, y, z);
    }
    mesh.castShadow = true;
    scene.add(mesh);
}

// --- MAIN LEVEL GENERATION ---

export function initLevel(scene, walls, batteries, State, mirrorTexture) {
    
    // 1. GLOBAL FLOORS & CEILINGS (Broken up for better lighting)
    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 300), mats.floor);
    floor.rotation.x = -Math.PI/2; floor.position.set(0, 0, 150); floor.receiveShadow = true;
    // Tiling texture
    mats.floor.map.repeat.set(10, 100);
    scene.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(30, 300), mats.wallBase);
    ceil.rotation.x = Math.PI/2; ceil.position.set(0, 4.5, 150); ceil.receiveShadow = true;
    scene.add(ceil);

    // =========================================================
    // ZONE 1: THE CELLAR (Tight, uneven, claustrophobic)
    // =========================================================
    
    // Back wall
    addBox(scene, walls, 0, 2.25, -5, 10, 4.5, 1, mats.wallBase);

    // Left/Right Walls with pillars
    for (let z = -5; z < 15; z += 5) {
        // Pillars
        addBox(scene, walls, -3, 2.25, z, 0.5, 4.5, 0.5, mats.rust);
        addBox(scene, walls, 3, 2.25, z, 0.5, 4.5, 0.5, mats.rust);
        
        // Wall panels
        addBox(scene, walls, -3.5, 2.25, z+2.5, 1, 4.5, 5, mats.wallBase);
        addBox(scene, walls, 3.5, 2.25, z+2.5, 1, 4.5, 5, mats.wallBase);
        
        // Ceiling Arches
        const arch = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 0.5), mats.rust);
        arch.position.set(0, 4, z); scene.add(arch);
    }

    // THE EMOTION DOOR FRAME
    addBox(scene, walls, -2, 2.25, 5, 3, 4.5, 0.2, mats.metalDark);
    addBox(scene, walls, 2, 2.25, 5, 3, 4.5, 0.2, mats.metalDark);
    addBox(scene, walls, 0, 4, 5, 1.5, 1, 0.2, mats.metalDark);
    
    const emoDoor = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.8, 0.1), new THREE.MeshStandardMaterial({ map: createDoorTexture('face'), roughness: 0.3 }));
    emoDoor.position.set(0, 1.9, 5); emoDoor.name = "emotion_door"; 
    scene.add(emoDoor); walls.push(emoDoor);
    
    const note1 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshBasicMaterial({map: createPaperTexture()}));
    note1.position.set(1.2, 2, 4.9); note1.rotation.y = -0.2; note1.name = "emotion_note"; scene.add(note1);

    // =========================================================
    // ZONE 2: INDUSTRIAL TUNNEL (Pipes, Mirror, Hand Door)
    // =========================================================
    
    // Narrower tunnel (Width 4 -> 3)
    for(let z=15; z<40; z+=5) {
        addBox(scene, walls, -2.5, 2.25, z+2.5, 1, 4.5, 5, mats.rust);
        addBox(scene, walls, 2.5, 2.25, z+2.5, 1, 4.5, 5, mats.rust);
        
        // Horizontal Pipes running along walls
        addPipe(scene, -2.1, 1, z, 5, 'z');
        addPipe(scene, -2.1, 1.2, z, 5, 'z');
        addPipe(scene, 2.1, 3.5, z, 5, 'z');
    }

    // Batteries
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.2,8), mats.emissiveGreen);
    b1.position.set(-1, 0.2, 20); b1.rotation.z=Math.PI/2; b1.name="battery"; scene.add(b1); batteries.push(b1);
    
    const b2 = b1.clone(); b2.position.set(1, 0.2, 30); scene.add(b2); batteries.push(b2);

    // Mirror Alcove
    addBox(scene, walls, 3, 2.25, 35, 2, 4.5, 3, mats.wallBase); // Pop-out wall
    if (mirrorTexture) {
        const mirrorGeo = new THREE.PlaneGeometry(2, 3);
        const mirrorMesh = new THREE.Mesh(mirrorGeo, new THREE.MeshBasicMaterial({map: mirrorTexture}));
        mirrorMesh.position.set(1.9, 2, 35); mirrorMesh.rotation.y = -Math.PI/2; mirrorMesh.scale.x = -1;
        scene.add(mirrorMesh);
        
        // Frame
        const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 0.1), mats.metalDark);
        frame.position.set(1.95, 2, 35); frame.rotation.y = -Math.PI/2; scene.add(frame);
    }

    // HAND DOOR
    const handDoor = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.8, 0.1), new THREE.MeshStandardMaterial({ map: createDoorTexture('hand') }));
    handDoor.position.set(0, 1.9, 40); handDoor.name = "hand_door"; 
    scene.add(handDoor); walls.push(handDoor);
    
    addBox(scene, walls, -2.5, 2.25, 40, 3, 4.5, 1, mats.metalDark);
    addBox(scene, walls, 2.5, 2.25, 40, 3, 4.5, 1, mats.metalDark);
    addBox(scene, walls, 0, 4.25, 40, 2.5, 1, 1, mats.metalDark);

    const ritualCursor = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color: 0x00ffff, transparent: true, opacity: 0.5}));
    scene.add(ritualCursor);
    
    const note2 = note1.clone(); note2.position.set(-1.5, 1.5, 39.9); note2.name = "hand_note"; scene.add(note2);

    // =========================================================
    // ZONE 3: THE PILLAR GARDEN (Statue Area)
    // Changed from empty hall to forest of columns for LOS breaking
    // =========================================================
    
    // Wider Room
    for (let z=45; z<95; z+=10) {
        addBox(scene, walls, -7, 2.25, z+5, 1, 4.5, 10, mats.wallBase);
        addBox(scene, walls, 7, 2.25, z+5, 1, 4.5, 10, mats.wallBase);
        
        // Cross Beams overhead
        const beam = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 0.5), mats.metalDark);
        beam.position.set(0, 4, z); scene.add(beam);
    }

    // THE PILLARS (Crucial for gameplay)
    // Random offsets to make it disorienting
    const pillarLocs = [
        [-2, 50], [2, 55], [-3, 62], [1, 68], [-1, 75], [3, 82], [-2, 88]
    ];
    
    pillarLocs.forEach(pos => {
        addBox(scene, walls, pos[0], 2.25, pos[1], 1, 4.5, 1, mats.wallBase);
        // Scuff marks at base
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 1.2), mats.metalDark);
        base.position.set(pos[0], 0.1, pos[1]); scene.add(base);
    });

    // The Statue
    const statueGroup = new THREE.Group();
    // Body
    const sBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.8, 6), mats.wallBase);
    sBody.position.y = 0.9;
    // Head (Creepy smooth)
    const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), new THREE.MeshStandardMaterial({color:0xdddddd, roughness:0.1}));
    sHead.position.y = 1.9;
    // Arms (Reaching)
    const sArmL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), mats.wallBase); sArmL.position.set(-0.4, 1.4, 0.3); sArmL.rotation.x = -0.5;
    const sArmR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), mats.wallBase); sArmR.position.set(0.4, 1.4, 0.3); sArmR.rotation.x = -0.5;
    
    statueGroup.add(sBody, sHead, sArmL, sArmR);
    statueGroup.position.set(0, 0, 85);
    scene.add(statueGroup);

    const note3 = note1.clone(); note3.position.set(0, 0.05, 60); note3.rotation.x = -Math.PI/2; note3.name = "statue_note"; scene.add(note3);

    // =========================================================
    // ZONE 4: THE VOID (Z=100 to 150)
    // Surreal, floating geometry
    // =========================================================
    
    // Transition Arch
    addBox(scene, walls, 0, 4, 98, 14, 2, 1, mats.black);
    addBox(scene, walls, -5, 2, 98, 4, 4, 1, mats.black);
    addBox(scene, walls, 5, 2, 98, 4, 4, 1, mats.black);

    // Memory Hint
    const memoryHint = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), new THREE.MeshBasicMaterial({color:0xffffff}));
    memoryHint.position.set(0, 2, 95); scene.add(memoryHint);

    // Hidden Symbol Wall (Z=110)
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

    // THE PIT AREA (Z 125-145)
    // Floor cuts out here.
    // We add "Floating Islands" debris to make it look like the world exploded
    for(let i=0; i<20; i++) {
        const debris = new THREE.Mesh(new THREE.BoxGeometry(Math.random(), Math.random(), Math.random()), mats.wallBase);
        debris.position.set((Math.random()-0.5)*15, (Math.random()-0.5)*10, 125 + Math.random()*20);
        debris.rotation.set(Math.random(), Math.random(), Math.random());
        scene.add(debris);
    }
    
    // The Invisible Bridge (Visual cue)
    const ghostBridge = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 22), new THREE.MeshStandardMaterial({
        color: 0x444444, transparent: true, opacity: 0.3, roughness: 0.1
    }));
    ghostBridge.position.set(0, 0, 136);
    scene.add(ghostBridge);

    // Mirror 2 (Suspended in void)
    if(mirrorTexture) {
        const mFrame = addBox(scene, walls, 0, 2.5, 160, 3, 4, 0.5, mats.rust);
        const m2 = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.5), new THREE.MeshBasicMaterial({map: mirrorTexture}));
        m2.position.set(0, 0, -0.3); m2.scale.x = -1; mFrame.add(m2);
        
        // Clue painted on wall above
        const clue = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), mats.emissiveGreen);
        clue.position.set(0, 4.6, 160); scene.add(clue);
    }

    // =========================================================
    // ZONE 5: INFINITE HALLWAY (Z 180-230)
    // Ribcage design
    // =========================================================
    
    for(let z=170; z<230; z+=4) {
        // Vertical Ribs
        addBox(scene, walls, -2.5, 2.25, z, 0.5, 4.5, 0.5, mats.black);
        addBox(scene, walls, 2.5, 2.25, z, 0.5, 4.5, 0.5, mats.black);
        
        // Top Rib
        const top = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.5, 0.5), mats.black);
        top.position.set(0, 4, z); scene.add(top);
        
        // Floor Light Strips (Dim)
        if(z % 8 === 0) {
            const lightStrip = new THREE.Mesh(new THREE.BoxGeometry(4, 0.05, 0.1), new THREE.MeshStandardMaterial({emissive: 0x112211, color:0x000000}));
            lightStrip.position.set(0, 0.02, z); scene.add(lightStrip);
        }
    }
    
    // Stop Marker
    const stopRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 32), mats.emissiveRed);
    stopRing.rotation.x = -Math.PI/2; stopRing.position.set(0, 0.05, 198); scene.add(stopRing);

    // Observation Door
    const obsDoor = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.2), mats.rust);
    obsDoor.position.set(0, 2, 230); scene.add(obsDoor); walls.push(obsDoor);

    // =========================================================
    // ZONE 6: FINAL DOORS (Z 245)
    // =========================================================
    
    const dGeo = new THREE.BoxGeometry(1.5, 3, 0.2);
    const doorL = new THREE.Mesh(dGeo, mats.emissiveRed);
    const doorC = new THREE.Mesh(dGeo, mats.emissiveGreen);
    const doorR = new THREE.Mesh(dGeo, mats.emissiveBlue);
    
    doorL.position.set(-3, 1.5, 245); doorC.position.set(0, 1.5, 245); doorR.position.set(3, 1.5, 245);
    scene.add(doorL, doorC, doorR); walls.push(doorL, doorC, doorR);
    
    // Labels
    const lText = new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.5), new THREE.MeshBasicMaterial({map:createProceduralTexture('diffuse', '#f00')}));
    lText.position.set(-3, 3.2, 245); scene.add(lText);

    // End Wall
    addBox(scene, walls, 0, 2.25, 255, 20, 4.5, 1, mats.wallBase);
    
    // Scatter more batteries
    [20, 60, 90, 110, 175, 210].forEach(z => {
        const b = b1.clone(); 
        b.position.set((Math.random()-0.5)*4, 0.2, z); 
        scene.add(b); batteries.push(b);
    });

    return {
        statue: statueGroup, ritualCursor, handDoor, emoDoor, finalDoor: null, obsDoor,
        doorL, doorC, doorR, memoryHint, hiddenSymbol, ghostBridge, 
        puzzleTextures: { hidden: mats.wallBase.map, revealed: mats.emissiveRed.map } // Placeholder for logic
    };
}
