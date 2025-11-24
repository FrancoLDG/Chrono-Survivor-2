// =======================================================
// particles_fx.js — FX globales (impactos, explosiones, cargas)
// =======================================================

import * as THREE from "three";
import { groups } from "../world.js";

// =======================================================
// LISTA GLOBAL DE FX
// =======================================================

const fxList = [];

// =======================================================
// IMPACTO — pequeño destello al golpear
// =======================================================

export function createImpactVisual(x, z) {

    const geo = new THREE.SphereGeometry(0.25, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 1.0, z);

    groups.particles.add(mesh);

    fxList.push({
        mesh,
        life: 0.18,
        type: "impact"
    });
}

export function createAuraRing(player, color = 0x00d2ff) {
    const geo = new THREE.RingGeometry(1.6, 1.8, 32);
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
    const mesh = new THREE.Mesh(geo, mat);

    mesh.rotation.x = -Math.PI / 2;

    groups.particles.add(mesh);

    return mesh;
}

// =======================================================
// EXPLOSIÓN — efecto de muerte (boss, miniboss)
// =======================================================

export function createExplosion(x, z, color = 0xff3333) {

    const geo = new THREE.SphereGeometry(1.5, 12, 12);
    const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 1.5, z);

    groups.particles.add(mesh);

    fxList.push({
        mesh,
        life: 0.45,
        type: "explosion",
        grow: 0.075
    });
}

// =======================================================
// BOSS CHARGE — energía que crece antes de una NOVA
// =======================================================

export function createBossChargeFX(x, z, chargePower = 0.1) {

    const size = 1.2 + chargePower * 1.8;

    const geo = new THREE.RingGeometry(size, size + 0.3, 24);
    const mat = new THREE.MeshBasicMaterial({
        color: 0xff0033,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 1, z);
    mesh.rotation.x = -Math.PI / 2;

    groups.particles.add(mesh);

    fxList.push({
        mesh,
        life: 0.12,
        type: "charge",
        shrink: 0.92
    });
}
export function createPaladinSlashFX(player, range, halfArc, facingAngle) {

    const steps = 48;
    const shape = new THREE.Shape();

    // inicio en el jugador
    shape.moveTo(0, 0);

    // arco
    for (let i = -halfArc; i <= halfArc; i += (halfArc * 2) / steps) {
        const x = Math.cos(i) * range;
        const y = Math.sin(i) * range;
        shape.lineTo(x, y);
    }

    shape.lineTo(0, 0);

    // Geometría PLANA, sin extrusión → no se tuerce NUNCA
    const geo = new THREE.ShapeGeometry(shape);

    // Material
    const mat = new THREE.MeshBasicMaterial({
        color: 0xff4411,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, mat);

    // ---- ROTACIÓN CORRECTA ----
    // 1) Acostar el cono arriba del plano
    mesh.rotation.x = -Math.PI / 2;

    // 2) Rotar hacia donde golpea el paladín
    mesh.rotation.y = facingAngle;

    // ---- EVITAR que toque el piso ----
    mesh.position.set(player.x, 0.12, player.z);

    groups.particles.add(mesh);

    fxList.push({
        mesh,
        type: "paladinSlash",
        life: 0.25,
        fade: 3.5,
        grow: 1.035
    });
}
export function triggerMageHandFX(player) {

    if (!player.mesh.armR) return;

    const geo = new THREE.SphereGeometry(0.18, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x99ddff,
        emissive: 0x66ccff,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.9
    });

    const fx = new THREE.Mesh(geo, mat);

    // Posición en la mano derecha
    const hand = player.mesh.armR;
    fx.position.copy(hand.getWorldPosition(new THREE.Vector3()));
    fx.position.y += 0.15; // elevar un poco

    // Añadir al mundo
    groups.particles.add(fx);

    fxList.push({
        mesh: fx,
        life: 0.18,
        type: "mageHandFX"
    });
}






export function createLightningFX(x1, z1, x2, z2) {

    const segments = 8;
    const amplitude = 0.6;
    const height = 1.4;

    const points = [];

    // Punto inicial
    points.push(new THREE.Vector3(x1, height, z1));

    // Zigzag intermedio
    for (let i = 1; i < segments; i++) {
        const t = i / segments;

        const px = x1 + (x2 - x1) * t;
        const pz = z1 + (z2 - z1) * t;

        const offX = (Math.random() - 0.5) * amplitude;
        const offZ = (Math.random() - 0.5) * amplitude;

        const point = new THREE.Vector3(px + offX, height, pz + offZ);
        points.push(point);

        // Crear chispa en cada segmento
        createSparkFX(point.x, point.y, point.z);
    }

    // Punto final
    points.push(new THREE.Vector3(x2, height, z2));

    // === GEOMETRÍA PRINCIPAL ===
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    // === MATERIAL DEL RAYO (fino) ===
    const matMain = new THREE.LineBasicMaterial({
        color: 0x66ccff,
        transparent: true,
        opacity: 1.0,
        linewidth: 2
    });

    // === MATERIAL GLOW (ancho y difuso) ===
    const matGlow = new THREE.LineBasicMaterial({
        color: 0x88e0ff,
        transparent: true,
        opacity: 0.35,
        linewidth: 8
    });

    // Línea principal
    const line = new THREE.Line(geometry, matMain);
    groups.particles.add(line);

    // Línea glow (segunda capa)
    const glow = new THREE.Line(geometry.clone(), matGlow);
    groups.particles.add(glow);

    fxList.push({ mesh: line, glow, life: 0.12, type: "lightning" });
}

export function createSparkFX(x, y, z) {

    const geo = new THREE.SphereGeometry(0.15, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x99ddff,
        transparent: true,
        opacity: 0.9
    });

    const spark = new THREE.Mesh(geo, mat);
    spark.position.set(x, y, z);

    groups.particles.add(spark);

    fxList.push({
        mesh: spark,
        life: 0.18,
        type: "spark",
        vy: 0.02 + Math.random() * 0.02
    });
}

export function floatingDamage(x, z, value) {

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;

    const ctx = canvas.getContext("2d");

    // Fondo transparente
    ctx.clearRect(0, 0, 256, 256);

    ctx.font = "bold 90px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Contorno negro (mejor visibilidad)
    ctx.lineWidth = 8;
    ctx.strokeStyle = "black";
    ctx.strokeText(value, 128, 128);

    // Texto principal
    ctx.fillStyle = "#ffec76";  // amarillo brillante
    ctx.fillText(value, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);

    sprite.position.set(x, 2.8, z);
    sprite.scale.set(2.4, 2.4, 2.4); // más grande

    groups.particles.add(sprite);

    fxList.push({
        mesh: sprite,
        life: 0.9,
        type: "float",
        yv: 0.035   // sube un poco más rápido
    });
}

export function createDashTrail(x, z) {

    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x8844ff,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.1, z);
    mesh.rotation.x = -Math.PI / 2;

    groups.particles.add(mesh);

    fxList.push({
        mesh,
        life: 0.4,
        type: "trail"
    });
}
export function createExplosionFX(x, z) {
    const geo = new THREE.SphereGeometry(0.5, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xff5522,
        emissive: 0xff2200,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.8
    });

    const fx = new THREE.Mesh(geo, mat);
    fx.position.set(x, 0.7, z);
    groups.particles.add(fx);

    fxList.push({
        mesh: fx,
        life: 0.35,
        type: "explosion"
    });
}
export function createFirePoof(x, z) {
    const geo = new THREE.SphereGeometry(0.35, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xff7722,
        emissive: 0xff4411,
        emissiveIntensity: 1.4,
        transparent: true,
        opacity: 0.85,
        roughness: 0.4,
        metalness: 0.0
    });

    const fx = new THREE.Mesh(geo, mat);
    fx.position.set(x, 0.4, z);
    groups.particles.add(fx);

    fxList.push({
        mesh: fx,
        life: 0.45,
        type: "firePoof",
        scaleVel: 2.6
    });
}

export function createMageStepFX(x, y, z) {

    const geo = new THREE.RingGeometry(0.1, 0.45, 16);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x6aaaff,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });

    const ring = new THREE.Mesh(geo, mat);
    ring.position.set(x, y, z);
    ring.rotation.x = -Math.PI / 2;

    groups.particles.add(ring);

    fxList.push({
        mesh: ring,
        life: 0.3,
        type: "mageStepFX"
    });
}





// =======================================================
// UPDATE — loop principal llamado desde core.js
// =======================================================

// =======================================================
// UPDATE — loop principal llamado desde core.js
// =======================================================

export function updateFX(dt = 1 / 60) {

    for (let i = fxList.length - 1; i >= 0; i--) {

        const f = fxList[i];
        f.life -= dt;

        // IMPACT
        if (f.type === "impact") {
            f.mesh.material.opacity -= dt * 4;
            f.mesh.scale.multiplyScalar(1 + dt * 2);
        }

        // BOSS CHARGE FX (esto no existe en tu código, pero lo dejo corregido)
        if (f.type === "boss_charge") {
            f.mesh.material.opacity -= dt * 0.6;
            f.mesh.rotation.z += dt * 2;
        }

        // EXPLOSION
        if (f.type === "explosion") {
            f.mesh.scale.multiplyScalar(1 + (f.grow || 0));
            f.mesh.material.opacity -= dt * 1.8;
        }

        // CHARGE RING
        if (f.type === "charge") {
            f.mesh.scale.multiplyScalar(f.shrink || 0.92);
            f.mesh.material.opacity -= dt * 2.5;
        }

        // FLOATING DAMAGE
        if (f.type === "float") {
            f.mesh.position.y += f.yv * (dt * 60);
            f.mesh.material.opacity -= dt * 1.2;
        }

        // TRAIL
        if (f.type === "trail") {
            f.mesh.material.opacity -= dt * 2;
        }

        // SLASH (lo tenías duplicado)
        if (f.type === "slash") {
            f.mesh.material.opacity -= dt * 6;
            f.mesh.scale.multiplyScalar(1.05);
        }

        // PALADIN SLASH
        if (f.type === "paladinSlash") {
            f.mesh.scale.multiplyScalar(f.grow);
            f.mesh.material.opacity -= dt * f.fade;

            if (f.mesh.material.opacity <= 0) {
                groups.particles.remove(f.mesh);
                fxList.splice(i, 1);
                continue;
            }
        }

        // LIGHTNING
        if (f.type === "lightning") {
            f.mesh.material.opacity -= dt * 10;
            f.glow.material.opacity -= dt * 6;

            if (f.mesh.material.opacity <= 0) {
                groups.particles.remove(f.mesh);
                groups.particles.remove(f.glow);
                fxList.splice(i, 1);
                continue;
            }
        }

        // SPARK
        if (f.type === "spark") {
            f.mesh.position.y += f.vy * (dt * 60);
            f.mesh.material.opacity -= dt * 5;

            if (f.mesh.material.opacity <= 0) {
                groups.particles.remove(f.mesh);
                fxList.splice(i, 1);
                continue;
            }
        }

        // MAGE HAND
        if (f.type === "mageHandFX") {
            f.mesh.scale.multiplyScalar(1.12);
            f.mesh.material.opacity -= dt * 6;

            if (f.mesh.material.opacity <= 0) {
                groups.particles.remove(f.mesh);
                fxList.splice(i, 1);
                continue;
            }
        }

        // MAGE STEP FX
        if (f.type === "mageStepFX") {
            f.mesh.scale.multiplyScalar(1.05);
            f.mesh.material.opacity -= dt * 3;

            if (f.mesh.material.opacity <= 0) {
                groups.particles.remove(f.mesh);
                fxList.splice(i, 1);
                continue;
            }
        }

        // FRAGMENT (balas rotas)
        if (f.type === "fragment") {
            f.mesh.position.x += f.vx;
            f.mesh.position.z += f.vz;
            f.mesh.material.opacity -= dt * 3;

            if (f.mesh.material.opacity <= 0) {
                groups.particles.remove(f.mesh);
                fxList.splice(i, 1);
                continue;
            }
        }

        // ELIMINAR FX MUERTO
        if (f.life <= 0 || f.mesh.material.opacity <= 0) {
            groups.particles.remove(f.mesh);
            fxList.splice(i, 1);
        }
    }
}


