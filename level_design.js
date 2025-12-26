/* level_design.js - v4 - FIXING TILING & DOORS */
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// --- TEXTURE GENERATORS ---

function fillBase(ctx, w, h, c) { ctx.fillStyle=c; ctx.fillRect(0,0,w,h); }

function addNoise(ctx, w, h, a=20) {
    const d = ctx.getImageData(0,0,w,h);
    for(let i=0; i<d.data.length; i+=4) {
        const n = (Math.random()-0.5)*a;
        d.data[i]+=n; d.data[i+1]+=n; d.data[i+2]+=n;
    }
    ctx.putImageData(d,0,0);
}

// NEW: Soft clouds instead of streaks to prevent "Barcode" look
function addGrimClouds(ctx, w, h, op=0.4) {
    for(let i=0; i<8; i++) {
        const x = Math.random()*w;
        const y = Math.random()*h;
        const r = 100 + Math.random()*200; // Large radius
        const grd = ctx.createRadialGradient(x,y, 0, x,y, r);
        grd.addColorStop(0, `rgba(20,15,10, ${op})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle=grd; 
        ctx.fillRect(0,0,w,h); // Fill whole canvas to blend
    }
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
            const mag = Math.sqrt(dx*dx + dy*dy + 1.0);
            img.data[i] = (dx/mag*0.5+0.5)*255;
            img.data[i+1] = (dy/mag*0.5+0.5)*255;
            img.data[i+2] = (1.0/mag*0.5+0.5)*255;
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
        // Lighter = Rougher. Darker = Shinier.
        const v = Math.min(255, 80 + (src[i]+src[i+1]+src[i+2])/3); 
        img.data[i]=v; img.data[i+1]=v; img.data[i+2]=v; img.data[i+3]=255;
    }
    ctx.putImageData(img,0,0);
    return new THREE.CanvasTexture(out);
}

// --- UV MAPPING FIX ---
function fixUVs(geometry, scaleX = 1.0, scaleY = 1.0, isDoor = false) {
    const pos = geometry.attributes.position;
    const norm = geometry.attributes.normal;
    const uv = geometry.attributes.uv;

    geometry.computeBoundingBox();
    const boxSize = geometry.boundingBox.getSize(new THREE.Vector3());
    const boxMin = geometry.boundingBox.min;

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i); const y = pos.getY(i); const z = pos.getZ(i);
        const nx = Math.abs(norm.getX(i)); const ny = Math.abs(norm.getY(i));
        const nz = Math.abs(norm.getZ(i));

        let u = 0, v = 0;

        if (isDoor) {
            // FORCE FIT: Map X/Y relative to the object's local bounds
            // This ensures the face is centered on the door regardless of world position
            if (nz > 0.5 || nx > 0.5) { 
                // Front/Back/Side faces
                // Map local width/height to 0..1
                if (nx > 0.5) u = (z - boxMin.z) / boxSize.z;
                else u = (x - boxMin.x) / boxSize.x;
                v = (y - boxMin.y) / boxSize.y;
            } else {
                // Top/Bottom
                u = 0; v = 0; // Don't care
            }
        } else {
            // WORLD TILING: Standard box mapping for walls
            if (nx >= ny && nx >= nz) { u = z; v = y; }
            else if (ny >= nx && ny >= nz) { u = x; v = z; }
            else { u = x; v = y; }
            
            u *= scaleX;
            v *= scaleY;
        }

        uv.setXY(i, u, v);
    }
    uv.needsUpdate = true;
}

// --- MATERIALS ---

const MatFactory = {
    Wall: () => {
        const s = 512;
        const c = document.createElement('canvas'); c.width=s; c.height=s;
        const ctx = c.getContext('2d');
        
        // Base: Dirty Plaster
        fillBase(ctx, s, s, '#5a5855'); 
        addNoise(ctx, s, s, 30);
        addGrimClouds(ctx, s, s, 0.6); // Soft clouds, no streaks
        
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        
        return new THREE.MeshStandardMaterial({
            map: tex, 
            normalMap: genNormal(c, 0.5), // Lower strength for smoother look
            roughnessMap: genRough(c)
        });
    },

    Floor: () => {
        const s = 512;
        const c = document.createElement('canvas'); c.width=s; c.height=s;
        const ctx = c.getContext('2d');
        fillBase(ctx, s, s, '#252525');
        addNoise(ctx, s, s, 40);
        // Subtle Grid
        ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 6;
        for(let i=0; i<=s; i+=128) {
             ctx.strokeRect(0, i, s, 2); ctx.strokeRect(i, 0, 2, s);
        }
        
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return new THREE.MeshStandardMaterial({
            map: tex, normalMap: genNormal(c, 1.5), roughnessMap: genRough(c)
        });
    },

    Door: (type) => {
        const w = 256; const h = 512;
        const c = document.createElement('canvas'); c.width=w; c.height=h;
        const ctx = c.getContext('2d');
        
        // Wood Base
        fillBase(ctx, w, h, '#3b2d24'); 
        addNoise(ctx, w, h, 30);
        
        // Panels (Inset)
        ctx.strokeStyle = '#1f1612'; ctx.lineWidth = 8;
        ctx.strokeRect(20, 20, 216, 200);
        ctx.strokeRect(20, 240, 216, 250);

        // ARTWORK (Emissive to pop)
        const emC = document.createElement('canvas'); emC.width=w; emC.height=h;
        const emCtx = emC.getContext('2d');
        emCtx.fillStyle = '#000'; emCtx.fillRect(0,0,w,h); // Black background

        if (type === 'face') {
            // White scratched face
            ctx.strokeStyle = '#ccc'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(80, 150, 20, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.arc(176, 150, 20, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(60, 220); ctx.quadraticCurveTo(128, 180, 196, 220); ctx.stroke();
            
            // Emissive Map (Glowing scratches)
            emCtx.strokeStyle = '#444'; emCtx.lineWidth = 5;
            emCtx.stroke(new Path2D(ctx)); // Copy path
        } 
        else if (type === 'hand') {
            ctx.fillStyle = '#600'; 
            ctx.beginPath(); ctx.arc(128, 300, 60, 0, Math.PI*2); ctx.fill();
            // Fingers
            ctx.fillRect(80, 200, 20, 100); ctx.fillRect(110, 180, 20, 120); 
            ctx.fillRect(140, 200, 20, 100);
        }
        else if (type === 'final') {
            ctx.fillStyle = '#a0a'; ctx.font = "bold 50px Courier"; 
            ctx.textAlign = "center"; ctx.fillText("EXIT", 128, 200);
            
            emCtx.fillStyle = '#505'; emCtx.font = "bold 50px Courier"; 
            emCtx.textAlign = "center"; emCtx.fillText("EXIT", 128, 200);
        }

        const albedo = new THREE.CanvasTexture(c);
        const emissive = new THREE.CanvasTexture(emC);
        
        return new THREE.MeshStandardMaterial({
            map: albedo, 
            normalMap: genNormal(c, 2.0),
            roughness: 0.6,
            emissiveMap: emissive,
            emissive: 0xffffff
        });
    },

    Battery: () => {
        const c = document.createElement('canvas'); c.width=64; c.height=128;
        const ctx = c.getContext('2d');
        const g = ctx.createLinearGradient(0,0,64,0);
        g.addColorStop(0,'#222'); g.addColorStop(0.5,'#666'); g.addColorStop(1,'#222');
        ctx.fillStyle=g; ctx.fillRect(0,0,64,128);
        ctx.fillStyle='#0f0'; ctx.fillRect(10,30,44,10); ctx.fillRect(10,50,44,10);
        return new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(c), metalness:0.8, roughness:0.2});
    },

    Blood: () => {
        const c = document.createElement('canvas'); c.width=128; c.height=128;
        const ctx = c.getContext('2d');
        ctx.fillStyle='#500'; 
        for(let i=0; i<12; i++) {
            ctx.globalAlpha=Math.random()*0.5+0.5;
            ctx.beginPath(); ctx.arc(64+(Math.random()-0.5)*50, 64+(Math.random()-0.5)*50, Math.random()*20, 0, Math.PI*2); ctx.fill();
        }
        return new THREE.MeshStandardMaterial({
            map: new THREE.CanvasTexture(c), transparent:true, opacity:0.9,
            depthWrite:false, polygonOffset:true, polygonOffsetFactor:-1
        });
    }
};

// --- INIT ---

export function initLevel(scene, walls, batteries, State, mirrorTexture) {
    const mats = {
        wall: MatFactory.Wall(),
        floor: MatFactory.Floor(),
        doorFace: MatFactory.Door('face'),
        doorHand: MatFactory.Door('hand'),
        doorFinal: MatFactory.Door('final'),
        battery: MatFactory.Battery(),
        blood: MatFactory.Blood(),
        note: new THREE.MeshStandardMaterial({color:0xffffee})
    };

    function createWall(x, y, z, w, h, d, col=null) {
        const geo = new THREE.BoxGeometry(w, h, d);
        // Scale 0.5 = 1 texture repeat every 2 units.
        fixUVs(geo, 0.5, 0.5, false); 
        let m = mats.wall;
        if(col) { m = m.clone(); m.color.setHex(col); }
        const mesh = new THREE.Mesh(geo, m);
        mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
        scene.add(mesh); walls.push(mesh);
        return mesh;
    }

    function createDoor(x, y, z, mat, name) {
        const geo = new THREE.BoxGeometry(2.8, 3.8, 0.15);
        // FORCE DOOR UVs (IsDoor = true)
        fixUVs(geo, 1, 1, true);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z); mesh.name = name; 
        scene.add(mesh); walls.push(mesh);
        return mesh;
    }

    // --- BUILD ---

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 600), mats.floor);
    floor.rotation.x = -Math.PI/2; floor.position.z = 200; 
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

    // DOORS (Now using helper)
    const emoDoor = createDoor(0, 1.9, 5, mats.doorFace, "emotion_door");

    // Act II
    createWall(-3.5, 2.25, 40, 4, 4.5, 1); createWall(3.5, 2.25, 40, 4, 4.5, 1); createWall(0, 4, 40, 3, 1, 1);
    const handDoor = createDoor(0, 1.9, 40, mats.doorHand, "hand_door");

    // Finale
    const finalDoor = createDoor(0, 2, 250, mats.doorFinal, "final_door");

    // Decor & Batteries
    [[2,15],[0,25],[-2,55],[3,85],[-3,115]].forEach(l=>{
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.35,12), mats.battery);
        b.position.set(l[0], 0.2, l[1]); b.castShadow=true; b.name="battery";
        scene.add(b); batteries.push(b);
    });

    const junkGeo = new THREE.BoxGeometry(0.6,0.6,0.6); fixUVs(junkGeo, 0.5, 0.5);
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

    // Objects
    const ritualCursor = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshBasicMaterial({color:0x00ffff, opacity:0, transparent:true})); scene.add(ritualCursor);
    const statue = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,1.8,16), mats.wall); statue.position.set(0,0.9,80); fixUVs(statue.geometry, 0.5); scene.add(statue);
    
    // Colored Doors
    const dGeo=new THREE.BoxGeometry(1.5,3,0.2); fixUVs(dGeo, 0.5);
    const dL=new THREE.Mesh(dGeo,mats.wall.clone()); dL.material.color.setHex(0xff0000); dL.position.set(-3,1.5,245);
    const dC=new THREE.Mesh(dGeo,mats.wall.clone()); dC.material.color.setHex(0x00ff00); dC.position.set(0,1.5,245);
    const dR=new THREE.Mesh(dGeo,mats.wall.clone()); dR.material.color.setHex(0x0000ff); dR.position.set(3,1.5,245);
    scene.add(dL, dC, dR); walls.push(dL, dC, dR);

    // Other required
    const ghostBridge = new THREE.Mesh(new THREE.BoxGeometry(3,0.2,24), new THREE.MeshBasicMaterial({color:0x222222, transparent:true, opacity:0}));
    ghostBridge.position.set(0,0.1,135); scene.add(ghostBridge);
    const obsDoor = new THREE.Mesh(new THREE.BoxGeometry(3,4,0.2), mats.wall.clone()); obsDoor.material.color.setHex(0x550000); obsDoor.position.set(0,2,230); scene.add(obsDoor); walls.push(obsDoor);

    return { statue, ritualCursor, handDoor, emoDoor, finalDoor, ghostBridge, doorL:dL, doorC:dC, doorR:dR, puzzleTextures:{ hidden:mats.wall.map, revealed:mats.wall.map } };
}
