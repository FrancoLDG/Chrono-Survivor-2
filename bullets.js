// =======================================================
// bullets.js — Sistema de balas (versión corregida)
// =======================================================

import * as THREE from "three";
import * as Audio from "../audio.js";
import { player } from "../core.js";
import { enemies } from "./enemies.js";
import { minibosses } from "./miniboss.js";
import { BossState } from "./boss.js";
import { floatingDamage } from "./particles_fx.js";
import { createImpactVisual } from "./particles_fx.js";
import { groups, getObstacleCollision } from "../world.js";
import { spawnGem } from "./drops.js";
import { createExplosion } from "./particles_fx.js";
import { endBossFight } from "../core.js";
import { addKill } from "../core.js";

import * as UI from "../ui.js";
// Lista activa de balas
export const bullets = [];

// =======================================================
// SPAWN DE BALAS
// =======================================================
function getNearestEnemy(x, z) {
    let best = null;
    let minDist = Infinity;

    // comunes
    for (const e of enemies) {
        const d = Math.hypot(e.x - x, e.z - z);
        if (d < minDist) {
            minDist = d;
            best = e;
        }
    }

    // miniboss
    for (const mb of minibosses) {
        const d = Math.hypot(mb.x - x, mb.z - z);
        if (d < minDist) {
            minDist = d;
            best = mb;
        }
    }

    // boss
    if (BossState.boss) {
        const boss = BossState.boss;
        const d = Math.hypot(boss.x - x, boss.z - z);
        if (d < minDist) best = boss;
    }

    return best;
}
export function spawnBullet(angle = null) {

    // AUTOAIM si angle es null
    const target = getNearestEnemy(player.x, player.z);

    if (target) {
        angle = Math.atan2(target.z - player.z, target.x - player.x);
    } else {
        angle = player.mesh.rotation.y; // fallback
    }

    const speed = player.bulletSpeed || 1.15;

    const mesh = new THREE.Mesh(
        player.bulletGeo || new THREE.BoxGeometry(0.2, 0.2, 0.8),
        player.bulletMat || new THREE.MeshStandardMaterial({ color: 0xffffff })
    );

    mesh.position.set(player.x, 1, player.z);
    mesh.rotation.y = angle;

    groups.bullets.add(mesh);

    const b = {
        mesh,
        x: player.x,
        z: player.z,
        vx: Math.cos(angle) * speed,
        vz: Math.sin(angle) * speed,
        life: 60,
        damage: player.damage * player.damageMult,
        pierce: player.pierce || 0,
        critChance: player.critChance || 0,
        critMult: player.critMult || 1.5,
        homing: player.homing || false,
    };

    bullets.push(b);
    return b;
}

// =======================================================
// HOMING (autoapuntado suave al enemigo más cercano)
// =======================================================

function applyHoming(b) {
    if (!b.homing) return;

    const target = getNearestEnemy(b.x, b.z);
    if (!target) return;

    const ang = Math.atan2(target.z - b.z, target.x - b.x);
    b.vx += Math.cos(ang) * 0.05;
    b.vz += Math.sin(ang) * 0.05;
}


// =======================================================
// DAÑO CRÍTICO
// =======================================================

function computeDamage(b) {
    let dmg = b.damage;
    if (Math.random() < b.critChance) dmg *= b.critMult;
    return dmg;
}

// =======================================================
// REMOVER BALA
// =======================================================

function removeBullet(index) {
    const b = bullets[index];
    if (!b) return;

    groups.bullets.remove(b.mesh);
    bullets.splice(index, 1);
}

// =======================================================
// FRAGMENTACIÓN (balas adicionales al morir)
// =======================================================

function spawnFragments(b) {
    if (!b.frag) return;

    const count = b.frag;
    const baseAngle = Math.random() * Math.PI * 2;

    for (let i = 0; i < count; i++) {

        const ang = baseAngle + (i * (Math.PI * 2)) / count;

        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.12, 0.12),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 })
        );

        const x = b.x;
        const z = b.z;
        mesh.position.set(x, 1, z);

        groups.particles.add(mesh);

        fxList.push({
            mesh,
            life: 0.35,
            type: "fragment",
            vx: Math.cos(ang) * 0.12,
            vz: Math.sin(ang) * 0.12
        });
    }
}

// =======================================================
// COLISIÓN CON ENEMIGOS
// =======================================================

function hitEnemies(b, bi) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (Math.hypot(b.x - e.x, b.z - e.z) < 1.2) {

            const dmg = computeDamage(b);
            e.hp -= dmg;
            createImpactVisual(b.x, b.z);
            floatingDamage(e.x, e.z, Math.floor(dmg));
            

            if (b.pierce > 0) {
                b.pierce--;
                return false; // la bala sigue
            }

            spawnFragments(b);
            removeBullet(bi);
            return true;
        }
    }
    return false;
}

// =======================================================
// COLISIÓN CON MINIBOSS
// =======================================================

function hitMiniBoss(b, bi) {
    for (let i = minibosses.length - 1; i >= 0; i--) {
        const mb = minibosses[i];
        if (Math.hypot(b.x - mb.x, b.z - mb.z) < 2.0) {

            const dmg = computeDamage(b);
            mb.hp -= dmg;
            createImpactVisual(b.x, b.z);

            if (mb.hp <= 0) {
                groups.enemies.remove(mb.mesh);
                minibosses.splice(i, 1);
            }

            if (b.pierce > 0) {
                b.pierce--;
                return false;
            }

            spawnFragments(b);
            removeBullet(bi);
            return true;
        }
    }
    return false;
}

// =======================================================
// COLISIÓN CON BOSS
// =======================================================

function hitBoss(b, bi) {
    if (!BossState.boss) return false;

    if (Math.hypot(b.x - BossState.boss.x, b.z - BossState.boss.z) < 3.0) {

        const dmg = computeDamage(b);
        BossState.boss.hp -= dmg;
        createImpactVisual(b.x, b.z);

        if (BossState.boss.hp <= 0) {
            groups.enemies.remove(BossState.boss.mesh);
            BossState.boss = null;
        }

        if (b.pierce > 0) {
            b.pierce--;
            return false;
        }

        spawnFragments(b);
        removeBullet(bi);

        return true;
    }

    return false;
}

// =======================================================
// UPDATE BULLETS — Loop principal
// =======================================================

export function updateBullets() {

    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];

        applyHoming(b);

        b.x += b.vx;
        b.z += b.vz;
        b.mesh.position.set(b.x, 1, b.z);

        // vida
        if (--b.life <= 0) {
            groups.bullets.remove(b.mesh);
            bullets.splice(i, 1);
            continue;
        }

        // paredes
        const wall = getObstacleCollision(b.x, b.z, 0.25);
        if (wall.hit) {
            createImpactVisual(b.x, b.z);
            groups.bullets.remove(b.mesh);
            bullets.splice(i, 1);
            continue;
        }

        // ==========================================================
        // HIT ENEMIGOS NORMALES
        // ==========================================================
        for (let e = enemies.length - 1; e >= 0; e--) {

            const enemy = enemies[e];
            if (Math.hypot(b.x - enemy.x, b.z - enemy.z) < 1.0) {

                const dmg = computeDamage(b);
                enemy.hp -= dmg;

                floatingDamage(enemy.x, enemy.z, Math.floor(dmg));
                createImpactVisual(enemy.x, enemy.z);
                Audio.play("hit");

                if (enemy.hp <= 0) {
                    addKill();
                    spawnGem(enemy.x, enemy.z);
                    groups.enemies.remove(enemy.mesh);
                    enemies.splice(e, 1);
                }

                groups.bullets.remove(b.mesh);
                bullets.splice(i, 1);
                break;
            }
        }

        if (!bullets[i]) continue;

        // ==========================================================
        // HIT MINIBOSS
        // ==========================================================
        for (let m = minibosses.length - 1; m >= 0; m--) {

            const mb = minibosses[m];
            if (Math.hypot(b.x - mb.x, b.z - mb.z) < 2.2) {

                const dmg = computeDamage(b);
                mb.hp -= dmg;

                floatingDamage(mb.x, mb.z, Math.floor(dmg));
                createImpactVisual(mb.x, mb.z);
                Audio.play("hit");

                if (mb.hp <= 0) {
                    createExplosion(mb.x, mb.z, 0xaa66ff);
                    groups.enemies.remove(mb.mesh);
                    minibosses.splice(m, 1);
                }

                groups.bullets.remove(b.mesh);
                bullets.splice(i, 1);
                break;
            }
        }

        if (!bullets[i]) continue;

        // ==========================================================
        // HIT BOSS
        // ==========================================================
        if (BossState.boss && Math.hypot(b.x - BossState.boss.x, b.z - BossState.boss.z) < 3.0) {

            const dmg = computeDamage(b);
            BossState.boss.hp -= dmg;

            floatingDamage(BossState.boss.x, BossState.boss.z, Math.floor(dmg));
            createImpactVisual(BossState.boss.x, BossState.boss.z);
            Audio.play("hit");

            if (BossState.boss.hp <= 0) {

                const container = document.getElementById("boss-container");
                const dialogue  = document.getElementById("boss-dialogue");

                createExplosion(BossState.boss.x, BossState.boss.z, 0xff0000);
                groups.enemies.remove(BossState.boss.mesh);
                Audio.play("bossDie");

                // mensaje final
                if (dialogue) {
                    dialogue.style.display = "block";
                    dialogue.textContent = "¡VOLVERÉ...!";
                    setTimeout(() => {
                        dialogue.style.display = "none";
                    }, 2500);
                }

                // animación de fade-out del HUD del jefe
                if (container) {
                    container.classList.add("fade-out");

                    setTimeout(() => {
                        container.style.display = "none";
                        container.classList.remove("fade-out");
                    }, 900);
                }

                BossState.boss = null;
                endBossFight(); // vuelve el spawn de enemigos
            }


            groups.bullets.remove(b.mesh);
            bullets.splice(i, 1);
            continue;
        }
    }
}

