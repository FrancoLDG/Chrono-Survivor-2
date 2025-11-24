// =======================================================
// damage_system.js — Daño pasivo (auras + efectos)
// =======================================================

import { enemies } from "./enemies.js";
import { minibosses } from "./miniboss.js";
import { BossState } from "./boss.js";

import { createImpactVisual } from "./particles_fx.js";
import * as Sound from "../audio.js";

// =======================================================
// AURAS (definidas en skills.js, pero aplicadas aquí)
// =======================================================

export function applyAuraDamage(player, dt) {
    if (!player.auras) return;

    const auraList = player.auras;
    const dmgFactor = dt * 60;

    for (const id in auraList) {
        const a = auraList[id];

        const r2 = a.range * a.range;

        // Enemigos
        for (const e of enemies) {
            const dx = e.x - player.x;
            const dz = e.z - player.z;

            if (dx * dx + dz * dz < r2) {
                e.hp -= a.dmg * dmgFactor;
                createImpactVisual(e.x, e.z);

                if (e.hp <= 0) {
                    e.hp = 0;
                    Sound.play("kill");
                }
            }
        }

        // MiniBoss
        for (const mb of minibosses) {
            const dx = mb.x - player.x;
            const dz = mb.z - player.z;

            if (dx * dx + dz * dz < r2) {
                mb.hp -= a.dmg * dmgFactor;
                createImpactVisual(mb.x, mb.z);

                if (mb.hp <= 0) {
                    mb.hp = 0;
                    Sound.play("kill");
                }
            }
        }

        // Boss
        if (BossState.boss) {
            const dx = BossState.boss.x - player.x;
            const dz = BossState.boss.z - player.z;

            if (dx * dx + dz * dz < r2) {
                BossState.boss.hp -= a.dmg * dmgFactor;
                createImpactVisual(BossState.boss.x, BossState.boss.z);

                if (BossState.boss.hp <= 0) {
                    Sound.play("kill");
                }
            }
        }
    }
}

// =======================================================
// EFECTOS ESPECIALES (queman, ralentizan, congelan)
// =======================================================

// Quemadura (fire)
export function applyBurn(target, amountPerSec, dt) {
    target.hp -= amountPerSec * dt;
    createImpactVisual(target.x, target.z);
}

// Ralentización (ice)
export function applySlow(target, factor, duration) {
    if (target.slow < duration) {
        target.slow = duration;
        target.speed *= factor; // se reduce temporalmente
    }
}

// Congelación (ice fuerte)
export function applyFreeze(target, duration) {
    if (target.stunned < duration) {
        target.stunned = duration;
        target.vx = 0;
        target.vz = 0;
    }
}
