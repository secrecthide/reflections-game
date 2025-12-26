/* level_design.js - HORROR TEXTURE OVERHAUL */
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// --- HELPERS: GENERIC GENERATORS ---

function fillBase(ctx, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
}

// Adds noise to texture for "Old/Grainy" feel
function addNoise(ctx, width, height, amount = 20) {
    const iData = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < iData.data.length; i += 4) {
        const grain = (Math.random() - 0.5) * amount;
        iData.data[i] = Math.max(0, Math.min(255, iData.data[i] + grain));
        iData.data[i + 1] = Math.max(0, Math.min(255, iData.data[i + 1] + grain));
        iData.data[i + 2] = Math.max(0, Math.min(255, iData.data[i + 2] + grain));
    }
    ctx.putImageData(iData, 0, 0);
}

// Adds vertical streaks (water damage/gravity)
function addGrimStreaks(ctx, width, height, intensity = 0.5) {
    ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * width;
        const w = 5 + Math.random() * 20;
        const grd = ctx.createLinearGradient(0, 0, 0, height);
        grd.addColorStop(0, `rgba(10,15,10, ${intensity})`);
        grd.addColorStop(1, `rgba(0,0,0,0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(x, 0, w, height);
    }
    ctx.globalCompositeOperation = 'source-over';
}

// Generates a normal map from the Albedo brightness (Cheap Height-to-Normal)
function generateNormalMap(sourceCanvas, strength = 5.0) {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const srcCtx = sourceCanvas.getContext('2d');
    const srcData = srcCtx.getImageData(0, 0, w, h).data;
    
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = w; normalCanvas.height = h;
    const ctx = normalCanvas.getContext('2d');
    const imgData = ctx.createImageData(w, h);
    
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            
            // Get neighbors (wrap around)
            const xR = ((x + 1) % w);
            const xL = ((x - 1 + w) % w);
            const yD = ((y + 1) % h);
            const yU = ((y - 1 + h) % h);

            // Get brightness (Height)
            const hR = srcData[(y * w + xR) * 4] / 255.0;
            const hL = srcData[(y * w + xL) * 4] / 255.0;
            const hD = srcData[(yD * w + x) * 4] / 255.0;
            const hU = srcData[(yU * w + x) * 4] / 255.0;

            // Sobel filter-ish
            const dx = (hR - hL) * strength;
            const dy = (hD - hU) * strength;
            const dz = 1.0 / strength;

            // Normalize
            let mag = Math.sqrt(dx*dx + dy*dy + dz*dz);
            let nx = dx/mag; let ny = dy/mag; let nz = dz/mag;

            // Map -1..1 to 0..255
            imgData.data[i] = (nx * 0.5 + 0.5) * 255;
            imgData.data[i+1] = (ny * 0.5 + 0.5) * 255;
            imgData.data[i+2] = (nz * 0.5 + 0.5) * 255;
            imgData.data[i+3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    return new THREE.CanvasTexture(normalCanvas);
}

// Generates roughness: Darker albedo = Shinier/Wetter (0), Lighter = Rougher (1)
function generateRoughnessMap(sourceCanvas, invert = false) {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const srcCtx = sourceCanvas.getContext('2d');
    const srcData = srcCtx.getImageData(0, 0, w, h).data;
    
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const imgData = ctx.createImageData(w, h);

    for (let i = 0; i < srcData.length; i+=4) {
        // Brightness
        const val = (srcData[i] + srcData[i+1] + srcData[i+2]) / 3;
        // Wet look: Dark colors (dirt/blood) are glossy (low roughness)
        // Dry look: Light colors are matte (high roughness)
        let r = invert ? 255 - val : val;
        // Contrast curve
        r = Math.min(255, Math.max(0, (r - 100) * 2)); 
        
        imgData.data[i] = r; imgData.data[i+1] = r; imgData.data[i+2] = r; imgData.data[i+3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    return new THREE.CanvasTexture(c);
}

// --- MATERIAL GENERATORS ---

const MatFactory = {
    // 1. FLOOR: Tiled, Grimy, Wet Grout
    Floor: () => {
        const s = 512;
        const c = document.createElement('canvas'); c.width = s; c.height = s;
        const ctx = c.getContext('2d');

        // Base: Cold dark concrete
        fillBase(ctx, s, s, '#1a1c1e');
        addNoise(ctx, s, s, 30);

        // Grid (Tiles)
        ctx.strokeStyle = '#050505'; ctx.lineWidth = 6;
        const tile = 128;
        for (let y=0; y<=s; y+=tile) {
            for (let x=0; x<=s; x+=tile) {
                ctx.strokeRect(x, y, tile, tile);
                // Vignette per tile (grime in corners)
                const grd = ctx.createRadialGradient(x+tile/2, y+tile/2, 10, x+tile/2, y+tile/2, tile/1.5);
                grd.addColorStop(0, 'rgba(0,0,0,0)');
                grd.addColorStop(1, 'rgba(0,5,10,0.5)'); // Blueish grime
                ctx.fillStyle = grd; ctx.fillRect(x,y,tile,tile);
            }
        }
        
        // General Grime
        addGrimStreaks(ctx, s, s, 0.3);

        const albedo = new THREE.CanvasTexture(c);
        albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
        albedo.repeat.set(20, 120);

        const normal = generateNormalMap(c, 8.0); // Strong depth for tiles
        normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
        normal.repeat.set(20, 120);

        const rough = generateRoughnessMap(c, false); // Dark lines = Wet/Shiny
        rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
        rough.repeat.set(20, 120);

        return new THREE.MeshStandardMaterial({
            map: albedo, normalMap: normal, roughnessMap: rough,
            color: 0x888888 // Tint down
        });
    },

    // 2. WALL: Plaster, Water Stains, Mold
    Wall: () => {
        const s = 512;
        const c = document.createElement('canvas'); c.width = s; c.height = s;
        const ctx = c.getContext('2d');

        // Base: Sickly Desaturated Green/Gray
        fillBase(ctx, s, s, '#2b302e');
        addNoise(ctx, s, s, 60); // Heavy grain

        // Mold/Damp patches
        for(let i=0; i<5; i++) {
            const x = Math.random()*s; const y = Math.random()*s; const r = Math.random()*100 + 50;
            const grd = ctx.createRadialGradient(x,y,0,x,y,r);
            grd.addColorStop(0, 'rgba(10,20,10,0.6)');
            grd.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grd; ctx.fillRect(0,0,s,s);
        }

        // Heavy vertical water streaks
        addGrimStreaks(ctx, s, s, 0.8);

        const albedo = new THREE.CanvasTexture(c);
        albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
        
        const normal = generateNormalMap(c, 3.0);
        normal.wrapS = normal.wrapT = THREE.RepeatWrapping;

        const rough = generateRoughnessMap(c, false); // Streaks are shiny
        rough.wrapS = rough.wrapT = THREE.RepeatWrapping;

        return new THREE.MeshStandardMaterial({
            map: albedo, normalMap: normal, roughnessMap: rough,
            roughness: 1.0
        });
    },

    // 3. DOORS: Rusted Metal with Emissive Paint
    Door: (type) => {
        const w = 256; const h = 512;
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d');

        // Base: Rusted Metal
        fillBase(ctx, w, h, '#3d2e24'); // Brown/Rust
        addNoise(ctx, w, h, 40);
        
        // Panels
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(20, 20, 216, 200); // Top panel
        ctx.fillRect(20, 240, 216, 250); // Bottom panel

        // Scratches
        ctx.strokeStyle = '#554433'; ctx.lineWidth = 1;
        for(let i=0; i<30; i++) {
            ctx.beginPath(); 
            ctx.moveTo(Math.random()*w, Math.random()*h); 
            ctx.lineTo(Math.random()*w, Math.random()*h); 
            ctx.stroke();
        }

        const albedo = new THREE.CanvasTexture(c);
        const normal = generateNormalMap(c, 2.0);

        // Emissive Layer
        const eC = document.createElement('canvas'); eC.width = w; eC.height = h;
        const eCtx = eC.getContext('2d');
        eCtx.fillStyle = '#000000'; eCtx.fillRect(0,0,w,h);
        
        // Emissive Logic
        if (type === 'face') {
            eCtx.strokeStyle = '#00ffaa'; // Sick Green
            eCtx.lineWidth = 4; eCtx.shadowBlur = 10; eCtx.shadowColor = '#00ffaa';
            eCtx.beginPath(); eCtx.arc(80,200,20,0,Math.PI*2); eCtx.stroke();
            eCtx.beginPath(); eCtx.arc(176,200,20,0,Math.PI*2); eCtx.stroke();
            eCtx.beginPath(); eCtx.moveTo(60,280); eCtx.quadraticCurveTo(128, 350, 196, 280); eCtx.stroke();
        } else if (type === 'hand') {
            eCtx.fillStyle = '#aa0000'; // Blood Red Glow
            eCtx.shadowBlur = 20; eCtx.shadowColor = '#ff0000';
            eCtx.beginPath(); eCtx.arc(128,256,50,0,Math.PI*2); eCtx.fill();
        } else if (type === 'final') {
            eCtx.fillStyle = '#ff00ff'; // Weak Magenta
            eCtx.font = "bold 60px Courier"; eCtx.textAlign = "center";
            eCtx.shadowBlur = 15; eCtx.shadowColor = '#ff00ff';
            eCtx.fillText("EXIT", 128, 260);
        }

        const emissive = new THREE.CanvasTexture(eC);

        return new THREE.MeshStandardMaterial({
            map: albedo, normalMap: normal, roughnessMap: generateRoughnessMap(c),
            emissiveMap: emissive, emissive: 0xffffff, emissiveIntensity: 2.0
        });
    },

    // 4. NOTES: High Contrast, Papery
    Note: () => {
        const w=256; const h=350;
        const c = document.createElement('canvas'); c.width=w; c.height=h;
        const ctx = c.getContext('2d');

        // Old Paper
        fillBase(ctx, w, h, '#d4cdba');
        addNoise(ctx, w, h, 20);
        
        // Stains
        ctx.fillStyle = 'rgba(50,30,10,0.1)';
        ctx.beginPath(); ctx.arc(200, 300, 60, 0, Math.PI*2); ctx.fill();

        // Scribbles
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
        for(let y=60; y<300; y+=25) {
            ctx.beginPath(); ctx.moveTo(20, y);
            ctx.bezierCurveTo(80, y-5, 160, y+5, 230, y); ctx.stroke();
        }

        const albedo = new THREE.CanvasTexture(c);
        return new THREE.MeshStandardMaterial({
            map: albedo, roughness: 0.8, emissive: 0x111111 // Slight glow to be readable
        });
    },

    // 5. BLOOD: High Gloss, Dark
    Blood: () => {
        const s = 128;
        const c = document.createElement('canvas'); c.width=s; c.height=s;
        const ctx = c.getContext('2d');
        // Transparent Background
        ctx.fillStyle = '#500000';
        for(let i=0; i<15; i++) {
            ctx.globalAlpha = Math.random() * 0.8 + 0.2;
            ctx.beginPath();
            ctx.arc(64 + (Math.random()-0.5)*50, 64 + (Math.random()-0.5)*50, Math.random()*20, 0, Math.PI*2);
            ctx.fill();
        }
        const albedo = new THREE.CanvasTexture(c);
        return new THREE.MeshStandardMaterial({
            map: albedo, transparent: true, opacity: 0.9,
            roughness: 0.05, // Wet
            metalness: 0.1,
            color: 0x8a0303,
            depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1
        });
    },

    // 6. ENEMY: Organic/Stone Mix
    Enemy: () => {
        const s = 256;
        const c = document.createElement('canvas'); c.width=s; c.height=s;
        const ctx = c.getContext('2d');
        fillBase(ctx, s, s, '#777'); // Grey
        addNoise(ctx, s, s, 50);
        // Veins
        ctx.strokeStyle = '#422'; ctx.lineWidth = 3;
        for(let i=0; i<10; i++) {
            ctx.beginPath(); ctx.moveTo(Math.random()*s, Math.random()*s);
            ctx.bezierCurveTo(Math.random()*s, Math.random()*s, Math.random()*s, Math.random()*s, Math.random()*s, Math.random()*s);
            ctx.stroke();
        }
        const albedo = new THREE.CanvasTexture(c);
        const normal = generateNormalMap(c, 10.0); // Very Bumpy
        return new THREE.MeshStandardMaterial({ map: albedo, normalMap: normal, roughness: 0.4 });
    }
};

// --- PUZZLE & UTILS ---

function adjustBoxUVs(geometry) {
    const pos = geometry.attributes.position;
    const norm = geometry.attributes.normal;
    const uv = geometry.attributes.uv;
    const scale = 0.5; 
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i); const y = pos.getY(i); const z = pos.getZ(i);
        const nx = Math.abs(norm.getX(i)); const ny = Math.abs(norm.getY(i));
        if (nx > 0.5) uv.setXY(i, z * scale, y * scale);
        else if (ny > 0.5) uv.setXY(i, x * scale, z * scale);
        else uv.setXY(i, x * scale, y * scale);
    }
    uv.needsUpdate = true;
}

const puzzleTextures = {
    hidden: new THREE.CanvasTexture((()=>{const c=document.createElement('canvas');c.width=64;c.height=64;c.getContext('2d').fillStyle='#000';c.getContext('2d').fillRect(0,0,64,64);return c})()),
    revealed: new THREE.CanvasTexture((()=>{const c=document.createElement('canvas');c.width=64;c.height=64;c.getContext('2d').fillStyle='#500';c.getContext('2d').fillRect(0,0,64,64);return c})()),
};

// --- MAIN INIT FUNCTION ---

export function initLevel(scene, walls, batteries, State, mirrorTexture) {
    
    // Generate Materials ONCE
    const mats = {
        floor: MatFactory.Floor(),
        wall: MatFactory.Wall(),
        doorFace: MatFactory.Door('face'),
        doorHand: MatFactory.Door('hand'),
        doorFinal: MatFactory.Door('final'),
        note: MatFactory.Note(),
        blood: MatFactory.Blood(),
        enemy: MatFactory.Enemy()
    };

    function createWall(x, y, z, w, h, d, colorOverride = null) {
        const geo = new THREE.BoxGeometry(w, h, d);
        adjustBoxUVs(geo);
        // If color override is requested, clone the material to tint it, else use base wall
        let mat = mats.wall;
        if(colorOverride) {
            mat = mats.wall.clone();
            mat.color.setHex(colorOverride);
        }
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
        scene.add(mesh); walls.push(mesh);
        return mesh;
    }

    function createBattery(x, y, z) {
        // Simple texture for battery
        const c = document.createElement('canvas'); c.width=64; c.height=64;
        const ctx = c.getContext('2d'); ctx.fillStyle='#0f0'; ctx.fillRect(0,0,64,64);
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.3,16), new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(c), emissive: 0x00ff00, emissiveIntensity: 0.5}));
        mesh.position.set(x,y,z); mesh.castShadow=true; mesh.name="battery"; scene.add(mesh); batteries.push(mesh);
    }

    function createLagMirror(x, y, z) {
        if(!mirrorTexture) return;
        const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2,3.2,0.2), mats.wall);
        frame.position.set(x,y,z); frame.rotation.y = -Math.PI/2; frame.castShadow=true; scene.add(frame); walls.push(frame);
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(2,3), new THREE.MeshStandardMaterial({map:mirrorTexture, roughness:0.1, metalness:0.2, emissive:0x111111}));
        glass.position.set(0,0,0.11); glass.scale.x=-1; frame.add(glass);
    }

    function buildCorridor(startZ, endZ, width) {
        const length = endZ - startZ;
        const wallGeo = new THREE.BoxGeometry(1, 4.5, length);
        adjustBoxUVs(wallGeo);
        
        const leftW = new THREE.Mesh(wallGeo, mats.wall);
        leftW.position.set(-(width/2 + 0.5), 2.25, startZ + length/2);
        leftW.castShadow = true; leftW.receiveShadow = true;
        scene.add(leftW); walls.push(leftW);

        const rightW = new THREE.Mesh(wallGeo, mats.wall);
        rightW.position.set((width/2 + 0.5), 2.25, startZ + length/2);
        rightW.castShadow = true; rightW.receiveShadow = true;
        scene.add(rightW); walls.push(rightW);

        const ceilGeo = new THREE.PlaneGeometry(width, length);
        const uvs = ceilGeo.attributes.uv;
        for(let i=0; i<uvs.count; i++) uvs.setXY(i, uvs.getX(i) * (width/4), uvs.getY(i) * (length/4));
        const ceiling = new THREE.Mesh(ceilGeo, new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 1.0, side: THREE.DoubleSide }));
        ceiling.position.set(0, 4.5, startZ + length/2); ceiling.rotation.x = Math.PI / 2;
        scene.add(ceiling);
    }

    // --- CONSTRUCTION ---

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 600), mats.floor);
    floor.rotation.x = -Math.PI/2; floor.position.z = 200; floor.receiveShadow=true; scene.add(floor);

    buildCorridor(-10, 300, 8.5);

    // ACT I
    createWall(0, 2.25, -5, 14, 4.5, 1); createWall(-5, 2.25, 0, 1, 4.5, 14); 
    createWall(5, 2.25, 0, 1, 4.5, 14); createWall(0, 4, 5, 3, 1, 1);            
    createWall(-3.5, 2.25, 5, 4, 4.5, 1); createWall(3.5, 2.25, 5, 4, 4.5, 1);  

    const emoDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.15), mats.doorFace);
    emoDoor.position.set(0, 1.9, 5); emoDoor.name = "emotion_door"; scene.add(emoDoor); walls.push(emoDoor);

    const note1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.02), mats.note);
    note1.position.set(-2.0, 1.6, 4.45); note1.rotation.y = Math.PI/6; note1.name = "emotion_note"; scene.add(note1);

    // ACT II
    createWall(-3, 2.25, 25, 1, 4.5, 40); createWall(3, 2.25, 25, 1, 4.5, 40);  
    createBattery(0, 0.2, 15); createBattery(1, 0.2, 25); 
    createLagMirror(2.9, 1.8, 35); 
    createWall(-3.5, 2.25, 40, 4, 4.5, 1); createWall(3.5, 2.25, 40, 4, 4.5, 1); createWall(0, 4, 40, 3, 1, 1);

    // Clutter
    [-4.5, 4.5].forEach(x => {
        for(let z=185; z<=215; z+=5) createWall(x, 1.5, z, 1, 3, 0.5); 
    });

    const handDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.15), mats.doorHand);
    handDoor.position.set(0, 1.9, 40); handDoor.name = "hand_door"; scene.add(handDoor); walls.push(handDoor);

    const cursorMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0 }); 
    const ritualCursor = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), cursorMat);
    scene.add(ritualCursor);

    const note2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.02), mats.note);
    note2.position.set(1.5, 1.6, 39.4); note2.rotation.y = -Math.PI/6; note2.name = "hand_note"; scene.add(note2);

    // ACT III
    createWall(-4, 2.25, 65, 1, 4.5, 50); createWall(4, 2.25, 65, 1, 4.5, 50); createWall(0, 4, 65, 9, 1, 50);        
    
    const statue = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.8, 16), mats.enemy);
    statue.position.set(0, 0.9, 80); statue.castShadow = true; scene.add(statue);

    const finalDoor = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.15), mats.doorFinal);
    finalDoor.position.set(0, 2, 250); finalDoor.name = "final_door"; scene.add(finalDoor); walls.push(finalDoor);

    const note3 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.02), mats.note);
    note3.position.set(-2.5, 1.6, 42.0); note3.rotation.y = Math.PI/4; note3.name = "statue_note"; scene.add(note3);

    // ACT IV
    const memoryHint = new THREE.Mesh(new THREE.BoxGeometry(1,1,0.1), new THREE.MeshStandardMaterial({color: 0xffffff}));
    const memColors = [0xff0000, 0x00ff00, 0x0000ff];
    memoryHint.material.color.setHex(memColors[State.memorySymbol]);
    memoryHint.position.set(0, 2, 95); scene.add(memoryHint);
    createWall(-4, 2.25, 100, 3, 4.5, 1); createWall(4, 2.25, 100, 3, 4.5, 1); createWall(0, 4, 100, 5, 1, 1);        
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.8), mats.wall);
    stand.position.set(0, 0.75, 95); scene.add(stand);

    const alignWall = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({map: puzzleTextures.hidden, transparent:true, opacity: 0.8}));
    alignWall.position.set(-4, 2, 110); alignWall.rotation.y = Math.PI/2; alignWall.name = "align_puzzle"; scene.add(alignWall);
    
    const hiddenTex = new THREE.CanvasTexture((()=>{const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');x.font="bold 80px Arial";x.fillStyle="white";x.textAlign="center";x.fillText("👁️",128,90);return c})());
    const hiddenSymbol = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map: hiddenTex, transparent:true, opacity: 0}));
    hiddenSymbol.position.set(-3.9, 2, 110); hiddenSymbol.rotation.y = Math.PI/2; scene.add(hiddenSymbol);

    const pitCover = new THREE.Mesh(new THREE.PlaneGeometry(10, 20), new THREE.MeshBasicMaterial({color: 0x000000}));
    pitCover.rotation.x = -Math.PI/2; pitCover.position.set(0, 0.05, 135); scene.add(pitCover);
    const ghostBridge = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 24), new THREE.MeshBasicMaterial({color: 0x222222, transparent: true, opacity: 0}));
    ghostBridge.position.set(0, 0.1, 135); scene.add(ghostBridge);
    createWall(-5.5, 2.25, 135, 1, 4.5, 20); createWall(5.5, 2.25, 135, 1, 4.5, 20);  

    createLagMirror(0, 2, 160); 
    const realWallCode = new THREE.Mesh(new THREE.PlaneGeometry(1,0.5), new THREE.MeshBasicMaterial({color:0x000000})); 
    realWallCode.position.set(0, 3.5, 159.5); scene.add(realWallCode);

    createWall(-3, 2.25, 190, 1, 4.5, 40); createWall(3, 2.25, 190, 1, 4.5, 40);
    const stopMarker = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 32), new THREE.MeshBasicMaterial({color: 0x880000, side: THREE.DoubleSide}));
    stopMarker.rotation.x = -Math.PI/2; stopMarker.position.set(0, 0.05, 198); scene.add(stopMarker);

    const obsDoor = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.2), mats.wall.clone());
    obsDoor.material.color.setHex(0x550000);
    obsDoor.position.set(0, 2, 230); scene.add(obsDoor); walls.push(obsDoor);

    const doorGeo = new THREE.BoxGeometry(1.5, 3, 0.2);
    const doorL = new THREE.Mesh(doorGeo, mats.wall.clone()); doorL.material.color.setHex(0xff0000);
    const doorC = new THREE.Mesh(doorGeo, mats.wall.clone()); doorC.material.color.setHex(0x00ff00);
    const doorR = new THREE.Mesh(doorGeo, mats.wall.clone()); doorR.material.color.setHex(0x0000ff);
    doorL.position.set(-3, 1.5, 245); doorC.position.set(0, 1.5, 245); doorR.position.set(3, 1.5, 245);
    scene.add(doorL); scene.add(doorC); scene.add(doorR);
    walls.push(doorL); walls.push(doorC); walls.push(doorR);

    // Decorate
    const locations = [[2, 55], [-2, 60], [0, 85], [3, 105], [-3, 115], [0, 150], [2, 170], [-2, 175], [-3, 190], [0, 195], [3, 200], [-2, 205], [0, 210], [2, 215], [-3, 220], [0, 225], [3, 230], [-3, 235], [3, 235]];
    locations.forEach(loc => createBattery(loc[0], 0.2, loc[1]));

    const junkGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5); const junkMat = mats.wall.clone(); junkMat.color.setHex(0x654321);
    const canGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.25, 8); const canMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.3 });
    
    for(let z=-5; z<250; z+=2) {
        if (Math.random() < 0.1) {
            const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), mats.blood);
            decal.rotation.x = -Math.PI/2; decal.position.set((Math.random()-0.5)*6, 0.01, z); decal.rotation.z = Math.random() * Math.PI;
            scene.add(decal);
        }
        if (Math.random() < 0.05) {
            const box = new THREE.Mesh(junkGeo, junkMat);
            box.position.set((Math.random() > 0.5 ? 1 : -1) * (2 + Math.random()), 0.25, z); box.rotation.y = Math.random(); scene.add(box);
        }
        if (Math.random() < 0.1) {
            const can = new THREE.Mesh(canGeo, canMat);
            can.position.set((Math.random()-0.5) * 8, 0.125, z); can.rotation.z = Math.PI/2; can.rotation.y = Math.random(); scene.add(can);
        }
    }

    // Return object map for interaction
    return {
        statue, ritualCursor, handDoor, emoDoor, finalDoor, obsDoor,
        doorL, doorC, doorR, memoryHint, hiddenSymbol, ghostBridge, puzzleTextures
    };
}
