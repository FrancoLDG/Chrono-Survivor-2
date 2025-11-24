// =======================================================
// boss.js — SHADOW DRAGON + UI + DIALOGUES
// =======================================================

import * as THREE from "three";
import { groups } from "../world.js";
import { player } from "../core.js";
import { damagePlayer } from "./player.js";
import { floatingDamage } from "./particles_fx.js";
import { createImpactVisual, createExplosion } from "./particles_fx.js";
import { spawnGem } from "./drops.js";
import * as Audio from "../audio.js";
import { core_spawnedBossPending } from "../core.js";

// UI hooks expected by ui.js
export function showBossDialogue(text) {
    const el = document.getElementById("boss-dialogue");
    if (!el) return;

    el.innerText = text;
    el.style.opacity = 1;
    el.style.transform = "translate(-50%, -50%) scale(1)";

    setTimeout(() => {
        el.style.opacity = 0;
        el.style.transform = "translate(-50%, -50%) scale(0.8)";
    }, 2600);
}

export function showBossUI(bossObj) {
    const bar = document.getElementById("boss-container");
    const t = document.getElementById("boss-name");
    const fill = document.getElementById("boss-hp-fill");

    if (!bossObj || !bar || !t || !fill) return;

    t.innerText = "DRAGÓN DE SOMBRAS";
    fill.style.width = "100%";
    bar.style.display = "flex";
    bar.style.opacity = 1;
}

export function hideBossUI() {
    const bar = document.getElementById("boss-container");
    if (bar) bar.style.opacity = 0;
}

export function updateBossHP(hp, maxHp) {
    const fill = document.getElementById("boss-hp-fill");
    if (!fill) return;
    const pct = Math.max(0, hp / maxHp);
    fill.style.width = (pct * 100) + "%";
}

export const BossState = {
    boss: null,
    state: "idle",
    hp: 0,
    maxHp: 0,
    attackCooldown: 0,
    novaCooldown: 0,
    breathCooldown: 0,
    projectileCooldown: 0,
    spawnLocked: true,  // waits until skill menu closes
};

// =======================================================
// CREATE DRAGON LOWPOLY
// =======================================================

export function createShadowDragon() {
    const group = new THREE.Group();

    // --- MATERIALS ---
    const matBody = new THREE.MeshStandardMaterial({
        color: 0x1d1b2f,
        roughness: 0.9,
        metalness: 0.1,
        emissive: 0x331144,
        emissiveIntensity: 0.25,
        flatShading: true
    });

    const matEye = new THREE.MeshBasicMaterial({
        color: 0x88ffee
    });

    const matWing = new THREE.MeshStandardMaterial({
        color: 0x3e2d68,
        roughness: 1,
        metalness: 0,
        emissive: 0x552288,
        emissiveIntensity: 0.5,
        flatShading: true,
        side: THREE.DoubleSide
    });

    // BODY
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.2, 3.0),
        matBody
    );
    body.position.set(0, 0.4, 0);
    group.add(body);

    // NECK
    const neck = new THREE.Mesh(
        new THREE.ConeGeometry(0.8, 1.4, 6),
        matBody
    );
    neck.position.set(0, 0.9, 1.5);
    neck.rotation.x = -Math.PI / 3;
    body.add(neck);

    // HEAD
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1.0, 1.6),
        matBody
    );
    head.position.set(0, 0.7, 1.1);
    neck.add(head);

    const snout = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.5, 1.0),
        matBody
    );
    snout.position.set(0, -0.1, 0.95);
    head.add(snout);

    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.1), matEye);
    eyeL.position.set(-0.45, 0.1, 0.55);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.45;
    head.add(eyeL, eyeR);

    // HORNS
    const hornGeo = new THREE.ConeGeometry(0.22, 0.9, 4);
    const hornL = new THREE.Mesh(hornGeo, matBody);
    hornL.position.set(-0.45, 0.45, -0.2);
    hornL.rotation.set(-0.4, 0, 0.4);

    const hornR = hornL.clone();
    hornR.position.x = 0.45;
    hornR.rotation.z = -0.4;

    head.add(hornL, hornR);

    // LEGS
    const legGeo = new THREE.BoxGeometry(0.7, 1.0, 0.9);
    const fl = new THREE.Mesh(legGeo, matBody);
    const fr = new THREE.Mesh(legGeo, matBody);
    const bl = new THREE.Mesh(legGeo, matBody);
    const br = new THREE.Mesh(legGeo, matBody);

    fl.position.set(-1.0, -0.4,  1.0);
    fr.position.set( 1.0, -0.4,  1.0);
    bl.position.set(-1.1, -0.4, -0.9);
    br.position.set( 1.1, -0.4, -0.9);

    body.add(fl, fr, bl, br);

    // WINGS
    function createWing(sign = 1) {
        const geo = new THREE.BufferGeometry();
        const verts = new Float32Array([
            0, 0, 0,
            3 * sign, 2.5, 0,
            4 * sign, -2.0, 0,

            0, 0, 0,
            4 * sign, -2.0, 0,
            1.5 * sign, -0.6, 0
        ]);
        geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
        geo.computeVertexNormals();

        const pivot = new THREE.Group();
        const mesh = new THREE.Mesh(geo, matWing);

        pivot.position.set(1.4 * sign, 0.7, 0.2);
        pivot.add(mesh);
        body.add(pivot);

        return pivot;
    }

    const wingL = createWing(-1);
    const wingR = createWing(1);

    // TAIL
    const tailSegments = [];
    for (let i = 0; i < 4; i++) {
        const seg = new THREE.Mesh(
            new THREE.BoxGeometry(0.7 - 0.15 * i, 0.7 - 0.15 * i, 1.0),
            matBody
        );
        seg.position.set(0, 0.1, -1.4 - i * 0.8);
        body.add(seg);
        tailSegments.push(seg);
    }

    const tailTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.45, 1.0, 4),
        matBody
    );
    tailTip.position.set(0, 0.1, -4.1);
    body.add(tailTip);

    // ANIMATION
    group.userData.anim = (t) => {
        const flap = Math.sin(t * 3) * 0.7;

        wingL.rotation.z = flap + 0.2;
        wingR.rotation.z = -flap - 0.2;

        tailSegments.forEach((s, i) => {
            s.rotation.y = Math.sin(t * 2 + i * 0.5) * 0.4;
        });

        head.position.y = 0.7 + Math.sin(t * 2) * 0.08;
    };

    // === EXPOSE PARTS FOR UPDATEBOSS ===
    group.userData.head = head;
    group.userData.body = body;

    group.scale.set(1.5, 1.5, 1.5);
    return group;
}




// =======================================================
// SPAWN BOSS
// =======================================================

export function spawnBoss() {
    const bossMesh = createShadowDragon();

    const spawnX = player.x + 20;
    const spawnZ = player.z + 20;

    bossMesh.position.set(spawnX, 2, spawnZ);
    groups.enemies.add(bossMesh);

    const hp = 3500 + player.level * 200;
    const dmg = 45 + player.level * 5;

    BossState.boss = {
        mesh: bossMesh,
        x: spawnX,
        z: spawnZ,
        hp,
        maxHp: hp,
        damage: dmg
    };

    BossState.attackCooldown = 2.5;
    BossState.projectileCooldown = 2.2;
    BossState.breathCooldown = 6.5;
    BossState.novaCooldown = 9;
    BossState.spawnLocked = true; // waits until menu closes

    return BossState.boss;
}

// =======================================================
// PROJECTILES
// =======================================================

const bossProjectiles = [];

function spawnBossProjectile(x, z, angle, damage) {
    const geo = new THREE.IcosahedronGeometry(0.3, 0);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x9900ff,
        emissive: 0x6600aa,
        emissiveIntensity: 0.7,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 2.5, z);

    groups.projectiles.add(mesh);

    bossProjectiles.push({
        mesh,
        x,
        z,
        vx: Math.cos(angle) * 0.6,
        vz: Math.sin(angle) * 0.6,
        damage,
        life: 240
    });
}

export function updateBossProjectiles(dt) {
    for (let i = bossProjectiles.length - 1; i >= 0; i--) {
        const p = bossProjectiles[i];
        p.x += p.vx * (dt * 60);
        p.z += p.vz * (dt * 60);
        p.mesh.position.set(p.x, 2.5, p.z);

        const dx = player.x - p.x;
        const dz = player.z - p.z;
        if (dx*dx + dz*dz < 1.2) {
            damagePlayer(player, p.damage);
            createImpactVisual(p.x, p.z);
            groups.projectiles.remove(p.mesh);
            bossProjectiles.splice(i, 1);
            continue;
        }

        p.life--;
        if (p.life <= 0) {
            groups.projectiles.remove(p.mesh);
            bossProjectiles.splice(i, 1);
        }
    }
}

// =======================================================
// VOID ZONES
// =======================================================

const voidZones = [];

function spawnVoidZones(boss) {
    for (let i = 0; i < 6; i++) {
        const rx = boss.x + (Math.random() * 18 - 9);
        const rz = boss.z + (Math.random() * 18 - 9);

        createExplosion(rx, rz, 0x550088);

        voidZones.push({
            x: rx,
            z: rz,
            r: 3.4,
            life: 400
        });
    }
}

function updateVoidZones(dt) {
    for (let i = voidZones.length - 1; i >= 0; i--) {
        const vz = voidZones[i];
        vz.life--;

        const dx = player.x - vz.x;
        const dz = player.z - vz.z;

        if (dx*dx + dz*dz < vz.r*vz.r) {
            damagePlayer(player, BossState.boss.damage * 0.35);
        }

        if (vz.life <= 0) voidZones.splice(i, 1);
    }
}

// =======================================================
// ATTACKS
// =======================================================

function breathAttack(boss) {
    const angle = Math.atan2(player.z - boss.z, player.x - boss.x);
    for (let i = -4; i <= 4; i++) {
        spawnBossProjectile(boss.x, boss.z, angle + i * 0.12, boss.damage * 0.55);
    }
    Audio.play("bossShoot");
}

function novaAttack(boss) {
    spawnVoidZones(boss);
}

// =======================================================
// UPDATE BOSS
// =======================================================

export function updateBoss(dt) {
    const boss = BossState.boss;
    if (!boss) return;

    // Wait for UI lock (skill menu)
    if (BossState.spawnLocked && !core_spawnedBossPending) {
        showBossUI(BossState.boss);
        showBossDialogue("¡ENFRENTA TU DESTINO!");
        BossState.spawnLocked = false;
    }

    const m = boss.mesh;
    const t = performance.now() * 0.001;

    if (m.userData.anim) m.userData.anim(t);

    const dx = player.x - boss.x;
    const dz = player.z - boss.z;
    const dist = Math.hypot(dx, dz);

    boss.x += (dx / dist) * 0.05 * (dt * 60);
    boss.z += (dz / dist) * 0.05 * (dt * 60);
    m.position.set(boss.x, 2, boss.z);
    m.rotation.y = Math.atan2(player.x - boss.x, player.z - boss.z);
    if (m.userData.head) {
        m.userData.head.rotation.y =
            Math.atan2(player.x - boss.x, player.z - boss.z) * 0.5;
    };
    BossState.projectileCooldown -= dt;
    BossState.breathCooldown -= dt;
    BossState.novaCooldown -= dt;
    // Si el dragón está cerca, se enfurece y acelera
    if (dist < 10) {
        boss.x += (dx / dist) * 0.09 * (dt * 60);
        boss.z += (dz / dist) * 0.09 * (dt * 60);
    }

    // Empujón cuerpo-a-cuerpo (embestida)
    if (dist < 3 && Math.random() < 0.015) {
        // salto hacia adelante
        boss.x += (dx / dist) * 1.6;
        boss.z += (dz / dist) * 1.6;

        // daño pesado
        damagePlayer(player, boss.damage * 1.2);
        createImpactVisual(player.x, player.z);
        Audio.play("bossHit");
    }

    // Rage mode cuando está bajo de HP
    if (boss.hp < boss.maxHp * 0.25) {

        // + velocidad
        boss.x += (dx / dist) * 0.12 * (dt * 60);
        boss.z += (dz / dist) * 0.12 * (dt * 60);

        // Disparo en espiral permanente
        if (Math.random() < 0.15) {
            const angleBase = performance.now() * 0.001 * 5;
            for (let i = 0; i < 8; i++) {
                spawnBossProjectile(
                    boss.x,
                    boss.z,
                    angleBase + i * (Math.PI / 4),
                    boss.damage * 0.45
                );
            }
        }
    }
    // Projectile burst
    if (BossState.projectileCooldown <= 0) {
        BossState.projectileCooldown = 2.2;
        const base = Math.atan2(dz, dx);
        for (let i = 0; i < 10; i++) {
            spawnBossProjectile(
                boss.x,
                boss.z,
                base + (i * Math.PI * 2) / 10,
                boss.damage * 0.4
            );
        }
    }

    // Breath
    if (BossState.breathCooldown <= 0) {
        BossState.breathCooldown = 6.5;
        breathAttack(boss);
    }

    // Nova
    if (BossState.novaCooldown <= 0) {
        BossState.novaCooldown = 6.5;
        novaAttack(boss);
    }

    updateVoidZones(dt);

    if (dist < 4) {
        damagePlayer(player, boss.damage * 0.45);
        createImpactVisual(player.x, player.z);
    }

    // DEAD
    if (boss.hp <= 0) {
        groups.enemies.remove(m);
        spawnGem(boss.x, boss.z);
        BossState.boss = null;
        hideBossUI();
    }

    updateBossHP(boss.hp, boss.maxHp);
}

// =======================================================
// DAMAGE
// =======================================================

export function damageBoss(amount) {
    if (!BossState.boss) return;
    BossState.boss.hp -= amount;
    floatingDamage(BossState.boss.x, BossState.boss.z, Math.floor(amount));
}
