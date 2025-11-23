// =======================================================
// attack_system.js — Sistema unificado de ataques
// =======================================================

import { spawnBullet } from "./entities/bullets.js";
import { enemies, damageEnemy } from "./entities/enemies.js";
import { minibosses, damageMiniBoss } from "./entities/miniboss.js";
import { BossState, damageBoss } from "./entities/boss.js";
import {
    createLightningFX,
    triggerMageHandFX,
    createPaladinSlashFX
} from "./entities/particles_fx.js";


// =======================================================
// ATAQUE RANGER — proyectiles
// =======================================================

function attack_bullet(player) {

    const angle = player.mesh.rotation.y;

    const shots = 1 + (player.multiShot || 0);
    const sides = player.sideShots || 0;

    // FRONT SHOTS
    for (let i = 0; i < shots; i++) {
        const offset = (i - (shots - 1) / 2) * 0.18;
        spawnBullet(angle + offset);
    }

    // SIDE SHOTS
    for (let s = 1; s <= sides; s++) {
        spawnBullet(angle + Math.PI / 2 * s);
        spawnBullet(angle - Math.PI / 2 * s);
    }

    // DOUBLE SHOT
    if (player.doubleShot && Math.random() < player.doubleShot) {
        setTimeout(() => spawnBullet(angle), 60);
    }
}


// =======================================================
// ATAQUE MAGO — CADENA DE RAYOS
// =======================================================

function attack_chainLightning(player) {

    const jumps = player.chain || 1;
    let target = nearestEnemy(player);
    if (!target) return;

    triggerMageHandFX(player);
    createLightningFX(player.x, player.z, target.x, target.z);
    dealMagicDamage(target, player);

    let prev = target;
    for (let i = 1; i < jumps; i++) {
        let next = nearestTo(prev);
        if (!next) break;

        createLightningFX(prev.x, prev.z, next.x, next.z);
        dealMagicDamage(next, player);
        prev = next;
    }
}


function nearestEnemy(player) {
    let best = null, dmin = Infinity;

    for (const e of enemies) {
        const d = Math.hypot(e.x - player.x, e.z - player.z);
        if (d < dmin) { dmin = d; best = e; }
    }

    for (const mb of minibosses) {
        const d = Math.hypot(mb.x - player.x, mb.z - player.z);
        if (d < dmin) { dmin = d; best = mb; }
    }

    if (BossState.boss) {
        const d = Math.hypot(BossState.boss.x - player.x, BossState.boss.z - player.z);
        if (d < dmin) best = BossState.boss;
    }

    return best;
}


function nearestTo(prev) {

    let best = null;
    let dmin = Infinity;

    // Buscar en enemigos normales
    for (const e of enemies) {

        // evitar encadenar al mismo enemigo (aunque esté muerto)
        if (Math.abs(e.x - prev.x) < 0.01 && Math.abs(e.z - prev.z) < 0.01) continue;

        const d = Math.hypot(e.x - prev.x, e.z - prev.z);

        // rango máximo del salto
        if (d < dmin && d <= 10) {
            dmin = d;
            best = e;
        }
    }

    // Buscar en minibosses
    for (const mb of minibosses) {
        if (Math.abs(mb.x - prev.x) < 0.01 && Math.abs(mb.z - prev.z) < 0.01) continue;

        const d = Math.hypot(mb.x - prev.x, mb.z - prev.z);

        if (d < dmin && d <= 12) {
            dmin = d;
            best = mb;
        }
    }

    // Boss
    if (BossState.boss) {
        const b = BossState.boss;
        const d = Math.hypot(b.x - prev.x, b.z - prev.z);

        if (d < dmin && d <= 15) {
            best = b;
        }
    }

    return best;
}



function dealMagicDamage(target, player) {
    const dmg = player.damage * player.damageMult;

    if (enemies.includes(target)) damageEnemy(target, dmg);
    if (minibosses.includes(target)) damageMiniBoss(target, dmg);
    if (target === BossState.boss) damageBoss(dmg);
}


// =======================================================
// ATAQUE KNIGHT — SLASH EN CONO
// =======================================================

function attack_slashCone(player) {

    const range = 8.5;
    const halfArc = Math.PI / 5;

    const facing = player.mesh.rotation.y;

    createPaladinSlashFX(player, range, halfArc, facing);

    const dmg = player.damage * player.damageMult * 2.4;

    // Enemigos
    for (const e of enemies) {
        if (hitCone(player, e, range, halfArc, facing)) damageEnemy(e, dmg);
    }
    // MiniBoss
    for (const mb of minibosses) {
        if (hitCone(player, mb, range, halfArc, facing)) damageMiniBoss(mb, dmg);
    }
    // Boss
    if (BossState.boss && hitCone(player, BossState.boss, range, halfArc, facing)) {
        damageBoss(dmg);
    }
}

function hitCone(player, target, range, arc, facing) {
    const dx = target.x - player.x;
    const dz = target.z - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist > range) return false;

    const ang = Math.atan2(dz, dx);
    let diff = Math.abs(normalize(ang - facing));
    return diff < arc;
}

function normalize(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
}


// =======================================================
// SISTEMA PRINCIPAL — Mapa de ataques
// =======================================================

export const ATTACK_BEHAVIORS = {
    bullet: attack_bullet,
    chainLightning: attack_chainLightning,
    slashCone: attack_slashCone
};


// =======================================================
// FUNCIÓN UNIVERSAL DE ATAQUE
// =======================================================

export function performAttack(player) {
    if (player.cooldown > 0) {
        player.cooldown--;
        return;
    }

    player.cooldown = player.fireRate;

    const attack = ATTACK_BEHAVIORS[player.attackType];
    if (attack) attack(player);
}
