// =======================================================
// miniboss.js — LOWPOLY VOID GOLEM (Soulstone Survivors Style)
// =======================================================

import * as THREE from "three";
import { groups } from "../world.js";
import { player } from "../core.js";
import { spawnGem } from "./drops.js";
import { floatingDamage } from "./particles_fx.js";
import { damagePlayer } from "./player.js";
import { createImpactVisual } from "./particles_fx.js";
import * as Audio from "../audio.js";

export const minibosses = [];

// =======================================================
// LOWPOLY VOID GOLEM MODEL
// =======================================================

function createVoidGolem() {

    const group = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({
        color: 0x442255,
        roughness: 0.9,
        emissive: 0x220044,
        emissiveIntensity: 0.45,
    });

    // Torso grande
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 3.2, 1.9),
        mat
    );
    body.position.y = 3.2;

    // Cabeza
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.4, 1.6),
        mat
    );
    head.position.y = 5;

    group.add(body, head);

    // Animación
    group.userData.anim = (t) => {
        group.position.y = Math.sin(t * 2) * 0.12;
        head.rotation.y = Math.sin(t * 1.5) * 0.1;
    };

    group.scale.set(2.5, 2.5, 2.5);
    return group;
}

// =======================================================
// SPAWN MINIBOSS
// =======================================================

export function spawnMiniBoss() {

    const mesh = createVoidGolem();

    const ang = Math.random() * Math.PI * 2;
    const dist = 38 + Math.random() * 12;

    const x = player.x + Math.cos(ang) * dist;
    const z = player.z + Math.sin(ang) * dist;

    mesh.position.set(x, 3, z);
    groups.enemies.add(mesh);

    // Base stats
    let hp = 1400;
    let dmg = 28;
    let speed = 0.045;

    // Soulstone Survivors scaling
    const L = player.level;
    hp *= 1 + L * 0.2;
    dmg *= 1 + L * 0.13;
    speed *= 1 + L * 0.015;

    const mb = {
        mesh,
        x,
        z,
        vx: 0,
        vz: 0,
        hp,
        maxHp: hp,
        damage: dmg,
        speed,
        hitCooldown: 0,

        state: "chasing",
        stateTimer: 0,

        attackCooldown: 2.2,
        dashCooldown: 7,
    };

    minibosses.push(mb);
    return mb;
}

// =======================================================
// UPDATE MINIBOSSES
// =======================================================

export function updateMiniBosses(dt) {

    const t = performance.now() * 0.001;

    for (let i = minibosses.length - 1; i >= 0; i--) {

        const mb = minibosses[i];
        const m = mb.mesh;

        if (m.userData.anim) m.userData.anim(t);

        const dx = player.x - mb.x;
        const dz = player.z - mb.z;
        const dist = Math.hypot(dx, dz);

        mb.attackCooldown -= dt;
        mb.dashCooldown -= dt;
        mb.stateTimer -= dt;

        // --------------------------------------------------
        // STATE: CHASING
        // --------------------------------------------------
        if (mb.state === "chasing") {

            const vel = mb.speed * (dt * 60);
            mb.x += (dx / dist) * vel;
            mb.z += (dz / dist) * vel;
            m.position.set(mb.x, 3, mb.z);

            // Golpe normal
            if (dist < 2.2 && mb.attackCooldown <= 0) {
                damagePlayer(player, mb.damage);
                createImpactVisual(player.x, player.z);
                Audio.play("hit");
                mb.attackCooldown = 1.2;
            }

            // Preparar dash
            if (mb.dashCooldown <= 0) {
                mb.state = "dashWindup";
                mb.stateTimer = 0.5;
            }
        }

        // --------------------------------------------------
        // STATE: DASH WINDUP
        // --------------------------------------------------
        else if (mb.state === "dashWindup") {

            m.traverse((node) => {
                if (node.isMesh && node.material) {
                    node.material.emissiveIntensity = 1.0;
                }
            });

            if (mb.stateTimer <= 0) {

                mb.state = "dashing";
                mb.stateTimer = 0.45;

                const dashVel = mb.speed * (dt * 60) * 6;
                mb.vx = (dx / dist) * dashVel;
                mb.vz = (dz / dist) * dashVel;

                Audio.play("bossShoot");
            }
        }

        // --------------------------------------------------
        // STATE: DASHING
        // --------------------------------------------------
        else if (mb.state === "dashing") {

            mb.x += mb.vx;
            mb.z += mb.vz;
            m.position.set(mb.x, 3, mb.z);

            // Daño si toca al jugador
            if (dist < 3) {
                damagePlayer(player, mb.damage * 1.3);
                createImpactVisual(player.x, player.z);
            }

            if (mb.stateTimer <= 0) {
                mb.state = "chasing";
                mb.dashCooldown = 6 + Math.random() * 2;
                m.traverse((node) => {
                    if (node.isMesh && node.material) {
                        node.material.emissiveIntensity = 0.45;
                    }
                });
            }
        }

        // --------------------------------------------------
        // DEATH
        // --------------------------------------------------
        if (mb.hp <= 0) {
            groups.enemies.remove(m);
            minibosses.splice(i, 1);
            spawnGem(mb.x, mb.z);
        }
    }
}

// =======================================================
// DAMAGE HANDLER
// =======================================================

export function damageMiniBoss(mb, amount) {
    mb.hp -= amount;
    floatingDamage(mb.x, mb.z, Math.floor(amount));
    createImpactVisual(mb.x, mb.z);
}

// =======================================================
// RESET SYSTEM
// =======================================================

export function resetMiniBosses() {
    for (let mb of minibosses) {
        groups.enemies.remove(mb.mesh);
    }
    minibosses.length = 0;
}
