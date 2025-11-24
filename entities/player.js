// =======================================================
// player.js — Sistema del jugador
// =======================================================

import * as THREE from "three";
import { createAuraRing } from "./particles_fx.js";
import { getObstacleCollision } from "../world.js";
import * as UI from "../ui.js";
import { frameCount } from "../core.js";
import { createMageStepFX } from "./particles_fx.js";
// =======================================================
// CREAR JUGADOR
// =======================================================

export const BASE_STATS = {
    maxHp: 100,
    damage: 8,
    damageMult: 1.0,
    baseSpeed: 0.42,
    fireRate: 45,
    regen: 0,
    critChance: 0.05,
    critMult: 1.5,
    chain: 1,
    pickupRange: 6.5,
    magnetPower: 0.20
};


export function createPlayer(classType = "ranger") {

    const player = {
        x: 0,
        z: 0,
        hp: BASE_STATS.maxHp,
        maxHp: BASE_STATS.maxHp,
        damage: BASE_STATS.damage,
        damageMult: BASE_STATS.damageMult,
        baseSpeed: BASE_STATS.baseSpeed,
        fireRate: BASE_STATS.fireRate,
        regen: BASE_STATS.regen,
        critChance: BASE_STATS.critChance,
        critMult: BASE_STATS.critMult,
        chain: BASE_STATS.chain,
        xp: 0,
        nextLevelXP: 40,
        level: 1,
        pickupRange: BASE_STATS.pickupRange,
        magnetPower: BASE_STATS.magnetPower,
        cooldown: 0,
        classType,
        dead: false,
        mesh: null,
        auras: {},
        skills: {}
    };

    // ============================================================
    // LAS CLASES SOLO DEFINEN EL “MODO DE ATAQUE”, NO LOS STATS
    // ============================================================
    if (classType === "ranger") {
        player.mesh = createHumanoidRanger();
        player.attackType = "bullet";
    }

    if (classType === "mage") {
        player.mesh = createHumanoidMage();
        player.attackType = "chainLightning";
        player.chain = 3;
    }

    if (classType === "knight") {
        player.mesh = createHumanoidPaladin();
        player.attackType = "slashCone";
    }

    // AURA UNIVERSAL
    player.auraRing = createAuraRing(player);

    return player;
}


// =======================================================
// MESH
// =======================================================

function buildPlayerMesh() {
    const g = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1.5, 1),
        new THREE.MeshStandardMaterial({ color: 0x6ad9ff })
    );
    body.position.y = 0.75;
    g.add(body);

    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.7, 0.7),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    head.position.y = 1.6;
    g.add(head);

    return g;
}
export function createHumanoidRanger() {

    const group = new THREE.Group();

    // ====== CABEZA (con capucha) ======
    const hoodGeo = new THREE.SphereGeometry(0.45, 8, 8);
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0x333366 });
    const hood = new THREE.Mesh(hoodGeo, hoodMat);
    hood.position.set(0, 1.45, 0);
    group.add(hood);

    // ====== CAPUCHA TRASERA ======
    const backHoodGeo = new THREE.ConeGeometry(0.55, 0.9, 6);
    const backHoodMat = new THREE.MeshStandardMaterial({ color: 0x22224a });
    const backHood = new THREE.Mesh(backHoodGeo, backHoodMat);
    backHood.position.set(0, 0.9, -0.2);
    backHood.rotation.x = Math.PI * 0.35;
    group.add(backHood);

    // ====== CUERPO ======
    const bodyGeo = new THREE.BoxGeometry(0.75, 1.1, 0.45);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4b3e2a });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.8, 0);
    group.add(body);

    // ====== BRAZOS ======
    const armGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x554433 });

    const armL = new THREE.Mesh(armGeo, armMat);
    armL.position.set(-0.55, 0.85, 0);
    group.add(armL);
    group.armL = armL;

    const armR = new THREE.Mesh(armGeo, armMat);
    armR.position.set(0.55, 0.85, 0);
    group.add(armR);
    group.armR = armR;
    
    // ====== PIERNAS ======
    const legGeo = new THREE.BoxGeometry(0.3, 0.9, 0.3);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2f2b26 });

    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.25, 0.15, 0);
    group.add(legL);
    group.legL = legL;

    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.25, 0.15, 0);
    group.add(legR);
    group.legR = legR;

    // ====== CINTURÓN ======
    const beltGeo = new THREE.BoxGeometry(0.85, 0.2, 0.45);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.set(0, 0.5, 0);
    group.add(belt);

    // ====== DETALLE PECHO (placa ligera) ======
    const plateGeo = new THREE.BoxGeometry(0.55, 0.6, 0.15);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xaaa27a });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(0, 1, 0.25);
    group.add(plate);

    // ===== ESCALA Y SOMBRAS =====
    group.traverse(obj => {
        obj.castShadow = true;
        obj.receiveShadow = true;
    });
    group.walkTime = 0;

    return group;
}

export function createHumanoidPaladin() {

    const group = new THREE.Group();

    // ===== CABEZA =====
    const headGeo = new THREE.BoxGeometry(0.55, 0.7, 0.55);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xd0c7b5 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.5, 0);
    group.add(head);

    // ===== CASCO =====
    const helmetGeo = new THREE.CylinderGeometry(0.4, 0.55, 0.5, 8);
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.6, roughness: 0.3 });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.set(0, 1.7, 0);
    group.add(helmet);

    // ===== PECHO ARMADURA =====
    const chestGeo = new THREE.BoxGeometry(0.9, 1.2, 0.5);
    const chestMat = new THREE.MeshStandardMaterial({ color: 0xb0a890, metalness: 0.4 });
    const chest = new THREE.Mesh(chestGeo, chestMat);
    chest.position.set(0, 0.9, 0);
    group.add(chest);

    // ===== HOMBRERAS =====
    const shoulderGeo = new THREE.BoxGeometry(0.45, 0.25, 0.8);
    const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
    
    const shoulderL = new THREE.Mesh(shoulderGeo, shoulderMat);
    shoulderL.position.set(-0.6, 1.2, 0);
    group.add(shoulderL);

    const shoulderR = new THREE.Mesh(shoulderGeo, shoulderMat);
    shoulderR.position.set(0.6, 1.2, 0);
    group.add(shoulderR);

    // ===== BRAZOS =====
    const armGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x6d6a63 });

    const armL = new THREE.Mesh(armGeo, armMat);
    armL.position.set(-0.6, 0.85, 0);
    group.add(armL);

    const armR = new THREE.Mesh(armGeo, armMat);
    armR.position.set(0.6, 0.85, 0);
    group.add(armR);

    // ===== PIERNAS =====
    const legGeo = new THREE.BoxGeometry(0.3, 1, 0.3);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x3b352e });

    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.25, 0.2, 0);
    group.add(legL);

    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.25, 0.2, 0);
    group.add(legR);

    // ===== GUARDAR REFERENCIAS (para animación) =====
    group.legL = legL;
    group.legR = legR;
    group.armL = armL;
    group.armR = armR;
    group.walkTime = 0;

    return group;
}

export function createHumanoidMage() {
    
    const group = new THREE.Group();
    
    // ============================================
    // 1) CAPUCHA PROFUNDA
    // ============================================
    const hoodGeo = new THREE.ConeGeometry(0.85, 1.6, 16);
    const hoodMat = new THREE.MeshStandardMaterial({ 
        color: 0x3b1b5b,
        roughness: 0.5,
        metalness: 0.1
    });
    const hood = new THREE.Mesh(hoodGeo, hoodMat);
    hood.position.set(0, 1.75, 0);
    group.add(hood);

    // ============================================
    // 2) CABEZA (más oculta dentro de la capucha)
    // ============================================
    const headGeo = new THREE.SphereGeometry(0.38, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xd6c9b3 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.42, 0.02);
    group.add(head);

    // ============================================
    // 3) TÚNICA ARCANA (cuerpo completamente nuevo)
    // ============================================
    const robeGeo = new THREE.CylinderGeometry(0.5, 1.0, 2.0, 12, 1, false);
    const robeMat = new THREE.MeshStandardMaterial({
        color: 0x5a2ca0,
        roughness: 0.65,
        metalness: 0.15
    });

    const robe = new THREE.Mesh(robeGeo, robeMat);
    robe.position.set(0, 0.6, 0);
    group.add(robe);

    // ============================================
    // 4) CINTURÓN + GEMA MÁGICA
    // ============================================
    const beltGeo = new THREE.BoxGeometry(1.05, 0.18, 0.55);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x1f1a36 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.set(0, 0.8, 0);
    group.add(belt);

    const gemGeo = new THREE.SphereGeometry(0.12, 10, 10);
    const gemMat = new THREE.MeshStandardMaterial({
        color: 0x99ddff,
        emissive: 0x66aaff,
        emissiveIntensity: 0.8
    });
    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.set(0, 0.8, 0.3);
    group.add(gem);

    // ============================================
    // 5) MANGAS LARGAS (más elegantes)
    // ============================================
    const sleeveGeo = new THREE.CylinderGeometry(0.22, 0.45, 1.1, 10);
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x4e1f82 });

    const armL = new THREE.Mesh(sleeveGeo, sleeveMat);
    armL.position.set(-0.65, 1.0, 0);
    group.add(armL);

    const armR = new THREE.Mesh(sleeveGeo, sleeveMat);
    armR.position.set(0.65, 1.0, 0);
    group.add(armR);

    // ============================================
    // 6) ORBE MÁGICO FLOTANTE (más brillante)
    // ============================================
    const orbGeo = new THREE.SphereGeometry(0.32, 16, 16);
    const orbMat = new THREE.MeshStandardMaterial({
        color: 0x9ae6ff,
        emissive: 0x7dd0ff,
        emissiveIntensity: 1.2,
        roughness: 0.1,
        metalness: 0.3
    });

    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(0.92, 1.25, 0);
    group.add(orb);

    // ============================================
    // 7) PIERNAS (ocultas detrás de la túnica)
    // ============================================
    const legGeo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x221133 });

    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.22, -0.35, 0);
    group.add(legL);

    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.22, -0.35, 0);
    group.add(legR);

    // ============================================
    // 8) REFERENCIAS PARA ANIMACIÓN DE CAMINAR
    // ============================================
    group.armL = armL;
    group.armR = armR;
    group.legL = legL;
    group.legR = legR;
    group.walkTime = 0;
    group.orb = orb;
    group.robe = robe;
    return group;
}


// =======================================================
// UPDATE PLAYER
// =======================================================

export function updatePlayer(player, dt, mx, mz) {

    if (player.dead) return;

    const speed = player.baseSpeed * dt * 60;

    const nx = player.x + mx * speed;
    const nz = player.z + mz * speed;

    const col = getObstacleCollision(nx, nz, 0.6);
    if (!col.hit) {
        player.x = nx;
        player.z = nz;
    }

    player.mesh.position.set(player.x, 0, player.z);
    player.auraRing.position.set(player.x, 0.1, player.z);
    player.auraRing.rotation.z += 0.01;

    if (mx !== 0 || mz !== 0) {
        player.mesh.rotation.y = Math.atan2(mx, mz);
    }
    if (Math.abs(mx) > 0.01 || Math.abs(mz) > 0.01) {
        // Orientar al frente hacia el movimiento
        player.mesh.rotation.y = Math.atan2(mx, mz);
    }
    if (player.regen > 0 && player.hp < player.maxHp) {
        player.hp += player.regen * dt;
        if (player.hp > player.maxHp) player.hp = player.maxHp;
    }
    // =========================
    // ANIMACIÓN DE CAMINAR
    // =========================
    const moving = (Math.abs(mx) > 0.01 || Math.abs(mz) > 0.01);

    if (moving) {
        player.mesh.walkTime += dt * 10;

        const w = player.mesh.walkTime;

        // Piernas
        player.mesh.legL.rotation.x = Math.sin(w) * 0.6;
        player.mesh.legR.rotation.x = Math.sin(w + Math.PI) * 0.6;

        // Brazos (contrarios)
        player.mesh.armL.rotation.x = Math.sin(w + Math.PI) * 0.4;
        player.mesh.armR.rotation.x = Math.sin(w) * 0.4;

    } else {
        // Volver a idle lentamente
        player.mesh.legL.rotation.x *= 0.7;
        player.mesh.legR.rotation.x *= 0.7;
        player.mesh.armL.rotation.x *= 0.7;
        player.mesh.armR.rotation.x *= 0.7;
    }
    if (player.mesh.orb) {

        // Levitación suave
        player.mesh.orb.position.y = 1.25 + Math.sin(frameCount * 0.12) * 0.1;

        // Pulso de luz
        const pulse = 0.8 + Math.sin(frameCount * 0.18) * 0.25;
        player.mesh.orb.material.emissiveIntensity = pulse;
    }
    if (moving && player.classType === "mage") {
    if (frameCount % 15 === 0) {
        createMageStepFX(player.x, 0.05, player.z);
    }
    if (player.mesh.robe) {
        const pulse = Math.sin(frameCount * 0.08) * 0.06;
        player.mesh.robe.scale.x = 1 + pulse;
        player.mesh.robe.scale.z = 1 + pulse;
    }
}
}

// =======================================================
// DAÑO y MUERTE
// =======================================================

export function damagePlayer(player, amount) {

    if (player.dead) return;

    player.hp -= amount;

    // HUD shake
    const ui = document.getElementById("ui-layer");
    ui.classList.add("hud-shake");
    setTimeout(() => ui.classList.remove("hud-shake"), 250);

    // CHEQUEO DE MUERTE
    if (player.hp <= 0) {
        player.hp = 0;
        player.dead = true;

        // Apagar visual del jugador
        player.mesh.visible = false;
        if (player.auraRing) player.auraRing.visible = false;

        // Mostrar pantalla
        import("../ui.js").then(UI => UI.showGameOver(player));

        // Detener juego
        import("../core.js").then(core => {
            core.stopGame();
        });

        return;
    }
}


// =======================================================
// XP
// =======================================================

export function addXP(player, amount) {
    player.xp += amount;

    let leveledUp = false;

    while (player.xp >= player.nextLevelXP) {
        player.xp -= player.nextLevelXP;
        player.level++;
        player.nextLevelXP = Math.floor(player.nextLevelXP * 1.25);
        leveledUp = true;
    }

    return leveledUp;
}
