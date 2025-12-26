/* level_design.js - v3 - FIXED UVS & DOORS */
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// --- TEXTURE UTILS (Keep v2 Logic) ---
function fillBase(ctx, w, h, c) { ctx.fillStyle=c; ctx.fillRect(0,0,w,h); }

function addNoise(ctx, w, h, a=20) {
    const d = ctx.getImageData(0,0,w,h);
    for(let i=0; i<d.data.length; i+=4) {
        const n = (Math.random()-0.5)*a;
        d.data[i]+=n; d.data[i+1]+=n; d.data[i+2]+=n;
    }
    ctx.putImageData(d,0,0);
}

function addGrimStreaks(ctx, w, h, op=0.5) {
    ctx.globalCompositeOperation='multiply';
    for(let i=0; i<15; i++) {
        const x = Math.random()*w;
        const grd = ctx.createLinearGradient(0,0,0,h);
        grd.addColorStop(0, `rgba(50,40,30,${op})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle=grd; ctx.fillRect(x,0, 10+Math.random()*30, h);
    }
    ctx.globalCompositeOperation='source-over';
}

function genNormal(c, str=1.0) {
    const w=c.width; const h=c.height;
    const src = c.getContext('2d').getImageData(0,0,w,h).data;
    const out = document.createElement('canvas'); out.width=w; out.height=h;
    const ctx = out.getContext('2d'); const img = ctx.createImageData(w,h);
    for(let y=0; y<h; y++) {
        for(let x=0; x<w; x++) {
            const i=(y*w+x)*4;
            const getV = (ox,oy) => src[(((y+oy+h)%h)*w + ((x+ox+w)%w))*4]/255;
            const dx = (getV(1,0)-getV(-1,0))*str;
            const dy = (getV(0,1)-getV(0,-1))*str;
            const dz = 1.0/str;
            const mag = Math.sqrt(dx*dx+dy*dy+dz*dz);
            img.data[i] = (dx/mag*0.5+0.5)*255;
            img.data[i+1] = (dy/mag*0.5+0.5)*255;
            img.data[i+2] = (dz/mag*0.5+0.5)*255;
            img.data[i+3] = 255;
        }
    }
    ctx.putImageData(img,0,0);
    return new THREE.CanvasTexture(out);
}

function genRough(c) {
    const w=c.width; const h=c.height;
    const src = c.getContext('2d').getImageData(0,0,w,h).data;
    const out = document.createElement('canvas'); out.width=w; out.height=h;
    const ctx = out.getContext('2d'); const img = ctx.createImageData(w,h);
    for(let i=0; i<src.length; i+=4) {
        // Bright = Rough, Dark = Shiny
        const v = Math.min(255, 60 + (src[i]+src[i+1]+src[i+2])/3);
        img.data[i]=v; img.data[i+1]=v; img.data[i+2]=v; img.data[i+3]=255;
    }
    ctx.putImageData(img,0,0);
    return new THREE.CanvasTexture(out);
}

// --- CORE FIX: WORLD SPACE UV MAPPING ---
// This ensures textures are never stretched. 
// 1 unit in 3D space = 1 unit in UV space (approx 1 meter).
function fixUVs(geometry, scale = 0.5) {
    // If geometry has no index, we can access position directly
    const pos = geometry.attributes.position;
    const norm = geometry.attributes.normal;
    const uv = geometry.attributes.uv;

    geometry.computeBoundingBox();
    const sz = geometry.boundingBox.getSize(new THREE.Vector3());

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);

        const nx = Math.abs(norm.getX(i));
        const ny = Math.abs(norm.getY(i));
        const nz = Math.abs(norm.getZ(i));

        // Box Mapping Logic
        if (nx >= ny && nx >= nz) {
            // Facing X (Side walls) -> Map Z/Y
            uv.setXY(i, z * scale, y * scale);
        } else if (ny >= nx && ny >= nz) {
            // Facing Y (Floor/Ceil) -> Map X/Z
            uv.setXY(i, x * scale, z * scale);
        } else {
            // Facing Z (Front/Back) -> Map X/Y
            uv.setXY(i, x * scale, y * scale);
        }
    }
    uv.needsUpdate = true;
}

// --- MATERIALS ---

const MatFactory = {
    Wall: () => {
        const c = document.createElement('canvas'); c.width=512; c.height=512;
        const ctx = c.getContext('2d');
        fillBase(ctx, 512, 512, '#6b6963'); // Plaster
        addNoise(ctx, 512, 512, 20);
        addGrimStreaks(ctx, 512, 512, 0.4);
        
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return new THREE.MeshStandardMaterial({
            map: tex, 
            normalMap: genNormal(c, 0.8), 
            roughnessMap: genRough(c)
        });
    },

    Floor: () => {
        const c = document.createElement('canvas'); c.width=512; c.height=512;
        const ctx = c.getContext('2d');
        fillBase(ctx, 512, 512, '#333');
        addNoise(ctx, 512, 512, 30);
        // Grid
        ctx.strokeStyle='#222'; ctx.lineWidth=4;
        for(let i=0; i<=512; i+=128) {
            ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,512); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(512,i); ctx.stroke();
        }
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return new THREE.MeshStandardMaterial({
            map: tex, normalMap: genNormal(c, 2.0), roughnessMap: genRough(c),
            color: 0xaaaaaa
        });
    },

    // CUSTOM DOOR TEXTURES RESTORED
    Door: (type) => {
        const c = document.createElement('canvas'); c.width=256; c.height=512;
        const ctx = c.getContext('2d');
        
        // Base Metal
        fillBase(ctx, 256, 512, '#2e2622'); 
        addNoise(ctx, 256, 512, 40);
        
        // Panels
        ctx.strokeStyle = '#1a1512'; ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, 236, 492);
        ctx.strokeRect(30, 30, 196, 200); // Upper
        ctx.strokeRect(30, 260, 196, 220); // Lower

        // Details
        if (type === 'face') {
            ctx.strokeStyle = '#666'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.arc(80, 130, 20, 0, Math.PI*2); ctx.stroke(); // Left Eye
            ctx.beginPath(); ctx.arc(176, 130, 20, 0, Math.PI*2); ctx.stroke(); // Right Eye
            ctx.beginPath(); ctx.arc(128, 180, 30, 0, Math.PI); ctx.stroke(); // Sad Mouth
        } else if (type === 'hand') {
            ctx.fillStyle = '#600'; 
            ctx.beginPath(); ctx.arc(128, 256, 50, 0, Math.PI*2); ctx.fill();
            // Drag marks
            ctx.fillRect(100, 256, 10, 100); ctx.fillRect(130, 256, 10, 120);
        } else if (type === 'final') {
            ctx.fillStyle = '#a0a'; ctx.font="40px Courier"; ctx.textAlign="center";
            ctx.fillText("EXIT", 128, 150);
        }

        const tex = new THREE.CanvasTexture(c);
        const norm = genNormal(c, 3.0);
        
        // Metallic look for doors
        return new THREE.MeshStandardMaterial({
            map: tex, normalMap: norm, roughness: 0.7, metalness: 0.4
        });
    },

    Battery: () => {
        const c = document.createElement('canvas'); c.width=64; c.height=128;
        const ctx = c.getContext('2d');
        // Metal Body
        const g = ctx.createLinearGradient(0,0,64,0);
        g.addColorStop(0,'#333'); g.addColorStop(0.5,'#777'); g.addColorStop(1,'#333');
        ctx.fillStyle=g; ctx.fillRect(0,10,64,118);
        // Cap
        ctx.fillStyle='#999'; ctx.fillRect(10,0,44,10);
        // Charge
        ctx.fillStyle='#0f0'; ctx.shadowBlur=5; ctx.shadowColor='#0f0';
        ctx.fillRect(10, 40, 44, 10); ctx.fillRect(10, 60, 44, 10);
        
        const tex = new THREE.CanvasTexture(c);
        return new THREE.MeshStandardMaterial({
            map: tex, metalness: 0.8, roughness: 0.3, emissive: 0x002200
        });
    },

    Blood: () => {
        const c=document.createElement('canvas'); c.width=128; c.height=128;
        const ctx=c.getContext('2d');
        ctx.fillStyle='#400'; 
        for(let i=0;i<10;i++){
            ctx.globalAlpha=Math.random()*0.8+0.2;
            ctx.beginPath(); ctx.arc(64+(Math.random()-0.5)*60, 64+(Math.random()-0.5)*60, Math.random()*20, 0, Math.PI*2); ctx.fill();
        }
        return new THREE.MeshStandardMaterial({
            map: new THREE.CanvasTexture(c), transparent:true, opacity:0.9, 
            roughness:0, color:0x550000, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-1
        });
    }
};

// --- INIT ---

export function initLevel(scene, walls, batteries, State, mirrorTexture) {
    const mats = {
        floor: MatFactory.Floor(),
        wall: MatFactory.Wall(),
        doorFace: MatFactory.Door('face'),
        doorHand: MatFactory.Door('hand'),
        doorFinal: MatFactory.Door('final'),
        battery: MatFactory.Battery(),
        blood: MatFactory.Blood(),
        note: new THREE.MeshStandardMaterial({color: 0xffffee})
    };

    function createWall(x, y, z, w, h, d, col=null) {
        const geo = new THREE.BoxGeometry(w, h, d);
        fixUVs(geo, 0.5); // 0.5 = 1 tile per 2 units (good density)
        let m = mats.wall;
        if (col) { m = m.clone(); m.color.setHex(col); }
        const mesh = new THREE.Mesh(geo, m);
        mesh.position.set(x, y, z); 
        mesh.castShadow = true; mesh.receiveShadow = true;
        scene.add(mesh); walls.push(mesh);
        return mesh;
    }

    function createBattery(x, y, z) {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.35, 12), mats.battery);
        mesh.position.set(x, y, z); mesh.castShadow = true; mesh.name="battery";
        scene.add(mesh); batteries.push(mesh);
    }

    // --- GEOMETRY ---

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 600), mats.floor);
    floor.rotation.x = -Math.PI/2; floor.position.z = 200; 
    // Fix floor UVs manually since it's a Plane not a Box
    const fUV = floor.geometry.attributes.uv;
    for(let i=0; i<fUV.count; i++) fUV.setXY(i, fUV.getX(i)*20, fUV.getY(i)*120);
    floor.receiveShadow=true; scene.add(floor);

    // Corridor
    createWall(-4.75, 2.25, 145, 1, 4.5, 310);
    createWall(4.75, 2.25, 145, 1, 4.5, 310);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 310), new THREE.MeshStandardMaterial({color:0x111111}));
    ceil.position.set(0, 4.5, 145); ceil.rotation.x = Math.PI/2; scene.add(ceil);

    // Act I
    createWall(0, 2.25, -5, 14, 4.5, 1);
    createWall(-3.5, 2.25, 5, 4, 4.5, 1); createWall(3.5, 2.25, 5, 4, 4.5, 1);
    createWall(0, 4, 5, 3, 1, 1);
    
    // NOTE: using specific door material now
    const emoDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.15), mats.doorFace);
    fixUVs(emoDoor.geometry, 1.0); // Reset UVs for this specific texture fit
    emoDoor.position.set(0, 1.9, 5); emoDoor.name = "emotion_door"; scene.add(emoDoor); walls.push(emoDoor);

    const note1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.02), mats.note);
    note1.position.set(-2, 1.6, 4.45); note1.rotation.y = Math.PI/6; note1.name="emotion_note"; scene.add(note1);

    // Act II
    createWall(-3.5, 2.25, 40, 4, 4.5, 1); createWall(3.5, 2.25, 40, 4, 4.5, 1); createWall(0, 4, 40, 3, 1, 1);
    
    const handDoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.8, 0.15), mats.doorHand);
    fixUVs(handDoor.geometry, 1.0);
    handDoor.position.set(0, 1.9, 40); handDoor.name="hand_door"; scene.add(handDoor); walls.push(handDoor);

    const note2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.02), mats.note);
    note2.position.set(1.5, 1.6, 39.4); note2.rotation.y = -Math.PI/6; note2.name="hand_note"; scene.add(note2);

    // Act III / Finale
    const finalDoor = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.15), mats.doorFinal);
    fixUVs(finalDoor.geometry, 1.0);
    finalDoor.position.set(0, 2, 250); finalDoor.name="final_door"; scene.add(finalDoor); walls.push(finalDoor);

    const obsDoor = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.2), mats.wall.clone());
    obsDoor.material.color.setHex(0x550000); fixUVs(obsDoor.geometry, 0.5);
    obsDoor.position.set(0, 2, 230); scene.add(obsDoor); walls.push(obsDoor);

    // Batteries
    [[2,15],[0,25],[-2,55],[3,85],[-3,115]].forEach(l=>createBattery(l[0],0.2,l[1]));

    // Clutter
    const junkGeo = new THREE.BoxGeometry(0.6,0.6,0.6); fixUVs(junkGeo, 0.5);
    const junkMat = mats.wall.clone(); junkMat.color.setHex(0x504030);
    
    for(let z=-5; z<250; z+=1.5) {
        if(Math.random()<0.3) {
            const d = new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5), mats.blood);
            d.rotation.x=-Math.PI/2; d.position.set((Math.random()-0.5)*6, 0.02, z+Math.random());
            d.rotation.z=Math.random()*6; scene.add(d);
        }
        if(Math.random()<0.15) {
            const b = new THREE.Mesh(junkGeo, junkMat);
            b.position.set((Math.random()>0.5?1:-1)*(2+Math.random()), 0.3, z);
            b.rotation.y=Math.random(); scene.add(b);
        }
    }

    // Required Objects
    const ritualCursor = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshBasicMaterial({color:0x00ffff, transparent:true, opacity:0}));
    scene.add(ritualCursor);
    const statue = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,1.8,16), mats.wall);
    statue.position.set(0,0.9,80); fixUVs(statue.geometry, 0.5); scene.add(statue);
    
    const ghostBridge = new THREE.Mesh(new THREE.BoxGeometry(3,0.2,24), new THREE.MeshBasicMaterial({color:0x222222, transparent:true, opacity:0}));
    ghostBridge.position.set(0,0.1,135); scene.add(ghostBridge);
    const pitCover = new THREE.Mesh(new THREE.PlaneGeometry(10,20), new THREE.MeshBasicMaterial({color:0x000000}));
    pitCover.rotation.x=-Math.PI/2; pitCover.position.set(0,0.05,135); scene.add(pitCover);

    // Colored doors
    const dGeo = new THREE.BoxGeometry(1.5,3,0.2); fixUVs(dGeo, 0.5);
    const dL=new THREE.Mesh(dGeo,mats.wall.clone()); dL.material.color.setHex(0xff0000); dL.position.set(-3,1.5,245);
    const dC=new THREE.Mesh(dGeo,mats.wall.clone()); dC.material.color.setHex(0x00ff00); dC.position.set(0,1.5,245);
    const dR=new THREE.Mesh(dGeo,mats.wall.clone()); dR.material.color.setHex(0x0000ff); dR.position.set(3,1.5,245);
    scene.add(dL); scene.add(dC); scene.add(dR); walls.push(dL, dC, dR);

    // Puzzle textures return
    const pTex = { hidden: new THREE.CanvasTexture(document.createElement('canvas')), revealed: new THREE.CanvasTexture(document.createElement('canvas')) };

    return { statue, ritualCursor, handDoor, emoDoor, finalDoor, ghostBridge, doorL:dL, doorC:dC, doorR:dR, puzzleTextures:pTex };
}
