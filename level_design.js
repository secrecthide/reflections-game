/* level_design.js - HIGH PERFORMANCE ARCHITECTURE */
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// --- FAST TEXTURE GENERATORS (Instant Load) ---

function createNoiseCanvas(color, density = 20) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color; ctx.fillRect(0,0,128,128);
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    for(let i=0; i<density; i++) ctx.fillRect(Math.random()*128, Math.random()*128, 2, 2);
    return c;
}

function createWallTexture() {
    const c = createNoiseCanvas('#444444', 50);
    const ctx = c.getContext('2d');
    // Vertical grunge streaks
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    for(let i=0; i<5; i++) ctx.fillRect(Math.random()*128, 0, Math.random()*4, 128);
    // Bottom grime gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0.5, "rgba(0,0,0,0)"); grad.addColorStop(1, "rgba(0,0,0,0.8)");
    ctx.fillStyle = grad; ctx.fillRect(0,0,128,128);
    return new THREE.CanvasTexture(c);
}

function createFloorTexture() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    // Tiles
    ctx.fillStyle = '#111'; ctx.fillRect(0,0,128,128);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.strokeRect(0,0,128,128);
    // Checkered pattern subtle
    ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.fillRect(0,0,64,64); ctx.fillRect(64,64,64,64);
    return new THREE.CanvasTexture(c);
}

function createDoorTexture(type) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0,0,128,256);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 4; ctx.strokeRect(4,4,120,248);

    if (type === 'face') {
        ctx.fillStyle = '#800'; ctx.font = '50px monospace'; ctx.textAlign='center'; 
        ctx.fillText("👁", 64, 120);
        ctx.font = '12px monospace'; ctx.fillStyle = '#aaa'; ctx.fillText("OBSERVE", 64, 150);
    } else if (type === 'hand') {
        ctx.fillStyle = '#800'; ctx.font = '50px monospace'; ctx.textAlign='center'; 
        ctx.fillText("✋", 64, 120);
        ctx.font = '12px monospace'; ctx.fillStyle = '#aaa'; ctx.fillText("TOUCH", 64, 150);
    }
    return new THREE.CanvasTexture(c);
}

// --- MATERIALS ---
const mats = {
    wall: new THREE.MeshStandardMaterial({ map: createWallTexture(), roughness: 0.9 }),
    floor: new THREE.MeshStandardMaterial({ map: createFloorTexture(), roughness: 0.6, metalness: 0.2 }),
    black: new THREE.MeshStandardMaterial({ color: 0x000000 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.8 }),
    red: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff0000, emissiveIntensity: 2 }),
    green: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x00ff00, emissiveIntensity: 2 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x0000ff, emissiveIntensity: 2 }),
    paper: new THREE.MeshBasicMaterial({ color: 0xddddcc })
};

// --- MAIN BUILDER ---
export function initLevel(scene, walls, batteries, State, mirrorTexture) {
    
    // 1. GLOBAL GEOMETRY
    const f = new THREE.Mesh(new THREE.PlaneGeometry(50, 600), mats.floor); 
    f.rotation.x = -Math.PI/2; f.position.set(0,0,200); f.receiveShadow = true; scene.add(f);
    
    const c = new THREE.Mesh(new THREE.PlaneGeometry(50, 600), mats.wall); 
    c.rotation.x = Math.PI/2; c.position.set(0,4.5,200); scene.add(c);

    // HELPER: Solid Wall
    function addWall(x,y,z,w,h,d, mat=mats.wall) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat); 
        m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true;
        scene.add(m); walls.push(m); return m;
    }

    // HELPER: Non-Clipping Doorway
    function addDoorway(z, doorObj) {
        // Left Piece
        addWall(-3.5, 2.25, z, 3, 4.5, 1);
        // Right Piece
        addWall(3.5, 2.25, z, 3, 4.5, 1);
        // Top Header
        addWall(0, 3.85, z, 4, 1.3, 1); 
        
        if(doorObj) {
            doorObj.position.set(0, 1.6, z); // Center in gap
            scene.add(doorObj); walls.push(doorObj);
        }
    }

    // HELPER: Overhead Beam
    function addBeam(z) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 0.4), mats.metal);
        b.position.set(0, 4.3, z); scene.add(b);
    }

    // --- ZONE 1: THE ASYLUM (Start) ---
    addWall(-5, 2.25, 15, 1, 4.5, 60); // Left Hall
    addWall(5, 2.25, 15, 1, 4.5, 60);  // Right Hall
    addWall(0, 2.25, -5, 12, 4.5, 1); // Back Wall

    // Door 1
    const emoDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.2, 0.2), new THREE.MeshStandardMaterial({map:createDoorTexture('face')}));
    emoDoor.name = "emotion_door"; 
    addDoorway(5, emoDoor);

    const n1 = new THREE.Mesh(new THREE.PlaneGeometry(0.4,0.5), mats.paper); 
    n1.position.set(1.8, 1.5, 4.45); n1.rotation.y = Math.PI; n1.name="emotion_note"; scene.add(n1);

    for(let z=0; z<40; z+=8) addBeam(z);

    // --- ZONE 2: INDUSTRIAL (Middle) ---
    // Narrower, darker walls
    addWall(-3, 2.25, 45, 1, 4.5, 40, mats.metal); 
    addWall(3, 2.25, 45, 1, 4.5, 40, mats.metal);

    // Batteries
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.3,8), mats.green);
    b1.position.set(0,0.15,15); b1.name="battery"; scene.add(b1); batteries.push(b1);

    // Door 2
    const handDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.2, 0.2), new THREE.MeshStandardMaterial({map:createDoorTexture('hand')}));
    handDoor.name = "hand_door"; 
    addDoorway(40, handDoor);

    const n2 = new THREE.Mesh(new THREE.PlaneGeometry(0.4,0.5), mats.paper); 
    n2.position.set(2, 0.5, 38); n2.rotation.x = -Math.PI/2; n2.name="hand_note"; scene.add(n2);
    
    // Hand Puzzle Cursor
    const cursor = new THREE.Mesh(new THREE.SphereGeometry(0.1,8,8), new THREE.MeshBasicMaterial({color:0x00ffff, transparent:true, opacity:0}));
    scene.add(cursor);

    // --- ZONE 3: THE GALLERY (Statue) ---
    addWall(-6, 2.25, 80, 1, 4.5, 60); 
    addWall(6, 2.25, 80, 1, 4.5, 60);

    const stat = new THREE.Group();
    const sb = new THREE.Mesh(new THREE.BoxGeometry(0.6,1.8,0.6), mats.wall);
    const sh = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.5,0.4), mats.wall); sh.position.y=1.1;
    stat.add(sb, sh); stat.position.set(0,0.9,80); stat.name="statue"; scene.add(stat);
    
    const n3 = new THREE.Mesh(new THREE.PlaneGeometry(0.4,0.5), mats.paper); 
    n3.position.set(0, 0.02, 62); n3.rotation.x = -Math.PI/2; n3.name="statue_note"; scene.add(n3);

    // --- ZONE 4: THE VOID (Pit) ---
    addWall(0, 0.5, 95, 1, 1, 1, mats.black); 
    const align = new THREE.Mesh(new THREE.PlaneGeometry(4,4), new THREE.MeshStandardMaterial({color:0x000000, transparent:true, opacity:0.9}));
    align.position.set(-4,2,110); align.rotation.y = Math.PI/2; align.name="align_puzzle"; scene.add(align);
    
    const mh = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.1), new THREE.MeshBasicMaterial({color:0xffffff}));
    mh.position.set(0,2,95); scene.add(mh);

    // The Pit
    addWall(-5, 2.25, 135, 1, 4.5, 20); 
    addWall(5, 2.25, 135, 1, 4.5, 20);
    const pit = new THREE.Mesh(new THREE.PlaneGeometry(10,20), mats.black); 
    pit.rotation.x=-Math.PI/2; pit.position.set(0,0.05,135); scene.add(pit);
    
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(2,0.1,20), new THREE.MeshStandardMaterial({color:0x444444, transparent:true, opacity:0.5}));
    bridge.position.set(0,0.06,135); scene.add(bridge);

    // --- ZONE 5: HALL OF DOORS ---
    for(let z=170; z<230; z+=15) { 
        addWall(-4, 2.25, z, 1, 4.5, 1); 
        addWall(4, 2.25, z, 1, 4.5, 1); 
        addBeam(z);
    }
    // Long backing walls
    addWall(-4.5, 2.25, 200, 1, 4.5, 60, mats.black); 
    addWall(4.5, 2.25, 200, 1, 4.5, 60, mats.black);

    const obsDoor = new THREE.Mesh(new THREE.BoxGeometry(3,4,0.2), mats.wall); 
    obsDoor.name="obs_door"; addDoorway(230, obsDoor);

    // --- FINAL CHOICE ---
    const finalZ = 245;
    const dL = new THREE.Mesh(new THREE.BoxGeometry(1.5,3,0.2), mats.red); 
    dL.position.set(-3, 1.5, finalZ); scene.add(dL); walls.push(dL);

    const dC = new THREE.Mesh(new THREE.BoxGeometry(1.5,3,0.2), mats.green); 
    dC.position.set(0, 1.5, finalZ); scene.add(dC); walls.push(dC);

    const dR = new THREE.Mesh(new THREE.BoxGeometry(1.5,3,0.2), mats.blue); 
    dR.position.set(3, 1.5, finalZ); scene.add(dR); walls.push(dR);

    // Door Frames
    addWall(-4, 2.25, finalZ, 1, 4.5, 1); 
    addWall(-1.5, 2.25, finalZ, 1, 4.5, 1); 
    addWall(1.5, 2.25, finalZ, 1, 4.5, 1); 
    addWall(4, 2.25, finalZ, 1, 4.5, 1);
    addWall(0, 2.25, 260, 20, 4.5, 1); // Back Wall

    // End Trigger (Invisible)
    const endTrigger = new THREE.Mesh(new THREE.PlaneGeometry(10,5), new THREE.MeshBasicMaterial({visible:false}));
    endTrigger.position.set(0,2,255); endTrigger.name="final_door"; scene.add(endTrigger);

    const symbol = new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0}));
    symbol.position.set(-3.9,2,110); symbol.rotation.y = Math.PI/2; scene.add(symbol);

    return { 
        statue: stat, 
        ritualCursor: cursor, 
        handDoor, 
        emoDoor, 
        finalDoor: endTrigger, 
        obsDoor, 
        doorL: dL, // EXPORTED PROPERLY
        doorC: dC, 
        doorR: dR, 
        memoryHint: mh, 
        hiddenSymbol: symbol, 
        ghostBridge: bridge 
    };
}
