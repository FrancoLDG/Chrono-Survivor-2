// =======================================================
// world.js — Sistema del mundo (compatible con core.js)
// =======================================================

import * as THREE from "three";

// Exportados
export let groups = null;
export let obstacles = [];

// =======================================================
// INICIALIZAR GRUPOS (SIN crear nueva escena/cámara)
// =======================================================

export function initWorld(scene) {

    groups = {
        floor: new THREE.Group(),
        obstacles: new THREE.Group(),
        bullets: new THREE.Group(),
        enemies: new THREE.Group(),
        drops: new THREE.Group(),
        particles: new THREE.Group(),
        indicators: new THREE.Group()
    };

    scene.add(
        groups.floor,
        groups.obstacles,
        groups.bullets,
        groups.enemies,
        groups.drops,
        groups.particles,
        groups.indicators
    );
}

// =======================================================
// CREAR PISO
// =======================================================

export function createFloor() {

    while (groups.floor.children.length > 0)
        groups.floor.remove(groups.floor.children[0]);

    // ============================================================
    // Canvas HD procedural (200x200)
    // ============================================================
    const size = 200;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");

    // Fondo general (piedra oscura)
    const grd = ctx.createLinearGradient(0, 0, size, size);
    grd.addColorStop(0, "#1c1b20");
    grd.addColorStop(1, "#25242a");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);

    // ============================================================
    // Textura tipo mosaico — "piedras" rectangulares claras/osc.
    // ============================================================
    for (let i = 0; i < 350; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const w = 3 + Math.random() * 6;
        const h = 3 + Math.random() * 6;

        const shade = Math.floor(40 + Math.random() * 60);
        ctx.fillStyle = `rgba(${shade},${shade},${shade},0.25)`;
        ctx.fillRect(x, y, w, h);
    }

    // ============================================================
    // "Manchas" orgánicas para romper la repetición
    // ============================================================
    for (let i = 0; i < 90; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;

        const r = 4 + Math.random() * 14;
        const alpha = 0.05 + Math.random() * 0.08;

        ctx.beginPath();
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // ============================================================
    // Líneas de grietas (cracks)
    // ============================================================
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;

    for (let i = 0; i < 25; i++) {
        let x = Math.random() * size;
        let y = Math.random() * size;

        ctx.beginPath();
        ctx.moveTo(x, y);

        for (let s = 0; s < 5; s++) {
            x += (Math.random() - 0.5) * 20;
            y += (Math.random() - 0.5) * 20;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // ============================================================
    // Aplicar como textura al piso
    // ============================================================
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 12);   // intensidad del mosaico
    tex.anisotropy = 8;

    const geo = new THREE.PlaneGeometry(220, 220);
    const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.85,
        metalness: 0.05,
        color: 0xffffff
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.1;

    groups.floor.add(mesh);
}

// =======================================================
// OBSTÁCULOS
// =======================================================

export function spawnObstacles(count = 25) {
    obstacles = [];

    while (groups.obstacles.children.length > 0)
        groups.obstacles.remove(groups.obstacles.children[0]);

    for (let i = 0; i < count; i++) {

        let x, z, tries = 0;
        let dist = 0;

        do {
            x = (Math.random() - 0.5) * 180;
            z = (Math.random() - 0.5) * 180;
            dist = Math.hypot(x, z);
            tries++;
        } while (dist < 12 && tries < 50);

        const size = 0.8 + Math.random() * 0.8;

        const mat = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.9
        });

        const geo = new THREE.BoxGeometry(size, size * 1.8, size);
        const mesh = new THREE.Mesh(geo, mat);

        mesh.position.set(x, size * 0.9, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        groups.obstacles.add(mesh);
        obstacles.push({ x, z, radius: size * 0.9 });
    }
}

// =======================================================
// COLISIÓN
// =======================================================

export function getObstacleCollision(x, z, radius = 0.6) {
    for (const o of obstacles) {
        const dx = o.x - x;
        const dz = o.z - z;
        const r = radius + o.radius;

        if (dx * dx + dz * dz < r * r) {
            return { hit: true, obstacle: o };
        }
    }
    return { hit: false };
}
