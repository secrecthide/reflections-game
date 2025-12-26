/* level_design.js - PURE HORROR AESTHETIC */
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// --- HORROR TEXTURE ENGINE ---

function createHorrorTexture(type) {
    const s = 512;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');
    
    // 1. BASE: Sickly colors
    if (type === 'flesh_wall') ctx.fillStyle = '#2a1a1a'; // Dark bloody flesh
    else if (type === 'rust_metal') ctx.fillStyle = '#1a1005'; // Deep rust
    else if (type === 'asylum_tile') ctx.fillStyle = '#111811'; // Moldy hospital
    else ctx.fillStyle = '#050505'; // Void
    
    ctx.fillRect(0,0,s,s);
    
    // 2. NOISE: High contrast grain
    const iData = ctx.getImageData(0,0,s,s);
    for(let i=0; i<iData.data.length; i+=4) {
        const grain = (Math.random() - 0.5) * 40;
        iData.data[i] += grain; iData.data[i+1] += grain; iData.data[i+2] += grain;
    }
    ctx.putImageData(iData, 0, 0);

    // 3. GRIME LAYERS (The "Scary" part)
    ctx.globalCompositeOperation = 'overlay';
    
    // Blood / Rust Stains
    for(let k=0; k<15; k++) {
        const x = Math.random()*s; const y = Math.random()*s; const r = Math.random()*100 + 20;
        const grad = ctx.createRadialGradient(x,y,0, x,y,r);
        if (type === 'flesh_wall') {
            grad.addColorStop(0, 'rgba(80, 0, 0, 0.8)'); // Fresh blood
            grad.addColorStop(1, 'rgba(30, 0, 0, 0)');
        } else {
            grad.addColorStop(0, 'rgba(40, 20, 0, 0.9)'); // Deep rust
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }
    
    // Scratches / Cracks
    ctx.globalCompositeOperation = 'color-dodge';
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let k=0; k<50; k++) {
        const x = Math.random()*s; const y = Math.random()*s;
        ctx.moveTo(x,y); ctx.lineTo(x + (Math.random()-0.5)*50, y + (Math.random()-0.5)*50);
    }
    ctx.stroke();

    // Drips (Black goo)
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    for(let k=0; k<20; k++) {
        const x = Math.random()*s;
        const len = Math.random()*s;
        ctx.fillRect(x, 0, Math.random()*3, len);
        ctx.beginPath(); ctx.arc(x+1, len, 3, 0, Math.PI*2); ctx.fill(); // Drip tip
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createScaryTile() {
    const s = 512;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d');
    
    // Grimy grout
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0,0,s,s);
    
    const ts = 128; // Large tiles
    for(let y=0; y<s; y+=ts) {
        for(let x=0; x<s; x+=ts) {
            // Checkered dirty tiles
            const val = Math.random() > 0.5 ? 40 : 20;
            ctx.fillStyle = `rgb(${val}, ${val+5}, ${val})`; // Slight green tint
            ctx.fillRect(x+2, y+2, ts-4, ts-4);
            
            // Shattered tiles
            if(Math.random() > 0.8) {
                ctx.fillStyle = '#000'; ctx.beginPath();
                ctx.moveTo(x+ts/2, y+ts/2);
                ctx.lineTo(x+ts, y); ctx.lineTo(x+ts, y+ts); ctx.fill();
            }
        }
    }
    // Heavy blood pool in center
    const grad = ctx.createRadialGradient(256,256, 50, 256,256, 300);
    grad.addColorStop(0, 'rgba(100,0,0,0.4)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0,0,s,s);
    
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
}

function createRitualDoor(type) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512;
    const ctx = c.getContext('2d');
    
    // Rusted Iron Base
    ctx.fillStyle = '#1a0505'; ctx.fillRect(0,0,256,512);
    
    // Texture
    const iData = ctx.getImageData(0,0,256,512);
    for(let i=0; i<iData.data.length; i+=4) {
        if(Math.random()>0.8) { iData.data[i]=100; iData.data[i+3]=50; }
    }
    ctx.putImageData(iData,0,0);

    ctx.strokeStyle = '#521'; ctx.lineWidth = 20; ctx.strokeRect(0,0,256,512);
    
    if (type === 'face') {
        // SCRATCHED EYES
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        // Messy scribbles
        for(let i=0; i<200; i++) {
            const cx = 128 + (Math.random()-0.5)*100;
            const cy = 200 + (Math.random()-0.5)*100;
            ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+10, cy+10); ctx.stroke();
        }
        ctx.fillStyle = '#fff'; ctx.font = "30px Courier"; ctx.textAlign="center";
        ctx.fillText("DON'T LOOK", 128, 400);
    } 
    else if (type === 'hand') {
        // BLOODY HANDPRINTS
        ctx.fillStyle = 'rgba(150,0,0,0.8)';
        for(let i=0; i<10; i++) {
            ctx.beginPath(); ctx.arc(Math.random()*256, Math.random()*512, 30, 0, Math.PI*2); ctx.fill();
        }
        ctx.font = "bold 40px Courier"; ctx.fillStyle = "#f00"; ctx.textAlign="center";
        ctx.fillText("TOUCH", 128, 256);
    }
    return new THREE.CanvasTexture(c);
}

// --- MATERIALS (SCARY SETTINGS) ---
const mats = {
    // Wall: Low Roughness (Wet/Slimy), Dark
    wall: new THREE.MeshStandardMaterial({ 
        map: createHorrorTexture('flesh_wall'),
        roughness: 0.3, // Wet
        metalness: 0.1,
        color: 0x888888 
    }),
    // Floor: Reflective, Bloodstained
    floor: new THREE.MeshStandardMaterial({ 
        map: createScaryTile(), 
        roughness: 0.1, // Very Wet
        metalness: 0.4 
    }),
    // Rust: Dry, dark
    rust: new THREE.MeshStandardMaterial({ 
        map: createHorrorTexture('rust_metal'), 
        roughness: 0.9,
        color: 0x553333
    }),
    // Black Void
    void: new THREE.MeshBasicMaterial({ color: 0x000000 }),
    // Emissives (The only bright things)
    lightRed: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff0000, emissiveIntensity: 5 }),
    lightGreen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x00ff00, emissiveIntensity: 2 }),
};

// --- BUILDERS ---
const OVL = 0.1; // Fix gaps

function addBox(scene, walls, x, y, z, w, h, d, mat, name="wall", col=true) {
    const geo = new THREE.BoxGeometry(w+OVL, h+OVL, d+OVL);
    // Auto-UV
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, uv.getX(i) * ((w+d)*0.5), uv.getY(i) * (h*0.5));
    }
    uv.needsUpdate = true;
    
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.name = name;
    scene.add(mesh);
    if(col) walls.push(mesh);
    return mesh;
}

// --- LEVEL GEN ---
export function initLevel(scene, walls, batteries, State, mirrorTexture) {
    
    // 1. FLOOR (Infinite reflection)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 400), mats.floor);
    floor.rotation.x = -Math.PI/2; floor.position.set(0, 0, 150); 
    mats.floor.map.repeat.set(10, 40);
    scene.add(floor);

    // 2. CEILING (Oppressive/Low)
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(50, 400), mats.wall);
    ceil.rotation.x = Math.PI/2; ceil.position.set(0, 4.2, 150); 
    scene.add(ceil);

    // =========================================================
    // ZONE 1: THE CELLAR (Tight, uneven, wet)
    // =========================================================
    addBox(scene, walls, 0, 2.25, -6, 12, 4.5, 1, mats.rust); // Back

    for (let z = -5; z < 15; z += 4) {
        // Jagged Walls
        const off = (Math.random()-0.5)*0.5;
        addBox(scene, walls, -3.2+off, 2.25, z, 1, 4.5, 4.2, mats.wall);
        addBox(scene, walls, 3.2+off, 2.25, z, 1, 4.5, 4.2, mats.wall);
        
        // Ceiling Beams (Low)
        if(z % 8 === 0) {
            const beam = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 0.4), mats.rust);
            beam.position.set(0, 3.5, z); scene.add(beam);
        }
    }

    // EMOTION DOOR
    addBox(scene, walls, -3, 2.25, 5, 4, 4.5, 0.5, mats.rust);
    addBox(scene, walls, 3, 2.25, 5, 4, 4.5, 0.5, mats.rust);
    addBox(scene, walls, 0, 4.2, 5, 2.2, 1, 0.5, mats.rust);

    const emoDoor = new THREE.Mesh(new THREE.BoxGeometry(2, 3.8, 0.2), new THREE.MeshStandardMaterial({map: createRitualDoor('face')}));
    emoDoor.position.set(0, 1.9, 5); emoDoor.name = "emotion_door";
    scene.add(emoDoor); walls.push(emoDoor);

    // =========================================================
    // ZONE 2: RUST TUNNELS (Claustrophobic)
    // =========================================================
    for(let z=15; z<40; z+=4) {
        // Narrowing
        addBox(scene, walls, -2.8, 2.25, z+2, 1, 4.5, 4.2, mats.rust);
        addBox(scene, walls, 2.8, 2.25, z+2, 1, 4.5, 4.2, mats.rust);
        
        // Piping (Broken)
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,4), mats.wall);
        p.rotation.x=Math.PI/2; p.position.set(-2, 3, z+2); scene.add(p);
        if(Math.random()>0.7) {
            p.rotation.z = Math.random(); // Broken pipe hanging down
            p.position.y = 2.5;
        }
    }

    // Batteries (Glow)
    const bGeo = new THREE.CylinderGeometry(0.05,0.05,0.2);
    [20, 32].forEach(z => {
        const b = new THREE.Mesh(bGeo, mats.lightGreen);
        b.position.set(0, 0.2, z); b.rotation.z=Math.PI/2; b.name="battery";
        scene.add(b); batteries.push(b);
    });

    // Mirror Frame
    addBox(scene, walls, 3, 2.25, 35, 2, 4.5, 3, mats.rust);
    if (mirrorTexture) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), new THREE.MeshBasicMaterial({map: mirrorTexture}));
        m.position.set(1.9, 2, 35); m.rotation.y = -Math.PI/2; m.scale.x = -1; scene.add(m);
    }

    // HAND DOOR
    addBox(scene, walls, -2.8, 2.25, 40, 3.5, 4.5, 1, mats.rust);
    addBox(scene, walls, 2.8, 2.25, 40, 3.5, 4.5, 1, mats.rust);
    addBox(scene, walls, 0, 4.2, 40, 2.2, 1.5, 1, mats.rust);

    const handDoor = new THREE.Mesh(new THREE.BoxGeometry(2, 3.8, 0.2), new THREE.MeshStandardMaterial({map: createRitualDoor('hand')}));
    handDoor.position.set(0, 1.9, 40); handDoor.name="hand_door";
    scene.add(handDoor); walls.push(handDoor);

    const ritualCursor = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color: 0xff0000, transparent: true, opacity: 0.5}));
    scene.add(ritualCursor);

    // =========================================================
    // ZONE 3: THE PILLAR FOREST (Disorienting)
    // =========================================================
    for (let z=45; z<95; z+=8) {
        addBox(scene, walls, -8, 2.25, z+4, 1, 4.5, 8.2, mats.wall);
        addBox(scene, walls, 8, 2.25, z+4, 1, 4.5, 8.2, mats.wall);
    }

    // Random Pillars (Obstacles)
    for(let i=0; i<15; i++) {
        const x = (Math.random()-0.5)*12;
        const z = 50 + Math.random()*40;
        addBox(scene, walls, x, 2.25, z, 0.8, 4.5, 0.8, mats.rust);
    }

    // The Statue (Crude)
    const statueGroup = new THREE.Group();
    const sBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1.8, 5), mats.rust); sBody.position.y = 0.9;
    const sHead = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3), new THREE.MeshStandardMaterial({color:0x333333, roughness:0.1})); sHead.position.y = 1.9;
    statueGroup.add(sBody, sHead); statueGroup.position.set(0,0,85); scene.add(statueGroup);

    // =========================================================
    // ZONE 4: THE VOID (Glitchy)
    // =========================================================
    addBox(scene, walls, 0, 4, 98, 16, 2, 1, mats.void);
    
    // Floating Debris
    for(let i=0; i<30; i++) {
        const d = new THREE.Mesh(new THREE.BoxGeometry(Math.random(), Math.random(), Math.random()), mats.rust);
        d.position.set((Math.random()-0.5)*20, Math.random()*10 - 2, 100 + Math.random()*50);
        d.rotation.set(Math.random(), Math.random(), Math.random());
        scene.add(d);
    }

    const memoryHint = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.1), mats.lightRed);
    memoryHint.position.set(0,2,95); scene.add(memoryHint);

    const hiddenSymbol = new THREE.Mesh(new THREE.PlaneGeometry(1,1), mats.lightRed);
    hiddenSymbol.position.set(-1.9, 2, 110); hiddenSymbol.rotation.y=Math.PI/2; 
    hiddenSymbol.material.transparent=true; hiddenSymbol.material.opacity=0; scene.add(hiddenSymbol);

    // Invisible Bridge
    const ghostBridge = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 25), new THREE.MeshStandardMaterial({color:0x220000, transparent:true, opacity:0.4}));
    ghostBridge.position.set(0,0,135); scene.add(ghostBridge);

    // =========================================================
    // ZONE 5: RIB CAGE HALLWAY
    // =========================================================
    for(let z=170; z<230; z+=3) {
        // Ribs
        const ribL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 0.4), mats.rust);
        ribL.position.set(-2.5, 2, z); ribL.rotation.z = 0.2; scene.add(ribL);
        const ribR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 0.4), mats.rust);
        ribR.position.set(2.5, 2, z); ribR.rotation.z = -0.2; scene.add(ribR);
        walls.push(ribL); walls.push(ribR); // Collision
    }

    const obsDoor = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.8, 0.2), mats.rust);
    obsDoor.position.set(0, 1.9, 230); scene.add(obsDoor); walls.push(obsDoor);

    // =========================================================
    // ZONE 6: FINALE
    // =========================================================
    const dGeo = new THREE.BoxGeometry(1.5, 3, 0.2);
    const dL = new THREE.Mesh(dGeo, mats.lightRed);
    const dC = new THREE.Mesh(dGeo, mats.lightGreen);
    const dR = new THREE.Mesh(dGeo, new THREE.MeshStandardMaterial({color:0x0000ff, emissive:0x0000aa, emissiveIntensity:2}));
    dL.position.set(-3, 1.5, 245); dC.position.set(0, 1.5, 245); dR.position.set(3, 1.5, 245);
    scene.add(dL, dC, dR); walls.push(dL, dC, dR);

    // End wall
    addBox(scene, walls, 0, 2.25, 255, 30, 4.5, 1, mats.void);
    
    // Extra batteries
    [60, 90, 110, 180, 210].forEach(z => {
        const b = new THREE.Mesh(bGeo, mats.lightGreen);
        b.position.set((Math.random()-0.5)*4, 0.2, z); scene.add(b); batteries.push(b);
    });

    return {
        statue: statueGroup, ritualCursor, handDoor, emoDoor, finalDoor: null, obsDoor,
        doorL: dL, doorC: dC, doorR: dR, memoryHint, hiddenSymbol, ghostBridge, 
        puzzleTextures: { hidden: mats.wall.map, revealed: mats.lightRed.map }
    };
}
