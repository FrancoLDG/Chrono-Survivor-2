// =======================================================
// drops.js — Sistema de XP / gemas (VERSIÓN CORRECTA)
// =======================================================

import * as THREE from "three";
import { groups } from "../world.js";
import { addXP } from "./player.js";
import { showLevelUp } from "../skills.js";
import * as Sound from "../audio.js";
import * as UI from "../ui.js";
// Lista global
export const gems = [];

// =======================================================
// SPAWN GEMA NORMAL
// =======================================================

export function spawnGem(x, z) {

    const geo = new THREE.OctahedronGeometry(0.32, 0);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xff66cc,
        emissive: 0xff2288,
        emissiveIntensity: 0.7,
        roughness: 0.25,
        metalness: 0.5
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.5, z);

    groups.drops.add(mesh);

    gems.push({
        mesh,
        x,
        z,
        special: false,
        forcePull: false
    });
}

// =======================================================
// SPAWN GEMA ESPECIAL
// =======================================================

export function spawnSpecialGem(x, z) {

    const geo = new THREE.IcosahedronGeometry(0.45, 0);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xffe055,
        emissive: 0xaa8800,
        roughness: 0.25
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.5, z);

    groups.drops.add(mesh);

    gems.push({
        mesh,
        x,
        z,
        special: true,
        forcePull: false
    });
}

// =======================================================
// ATTRACT ALL GEMS
// =======================================================

export function attractAllGems() {
    for (const g of gems) g.forcePull = true;
}

// =======================================================
// UPDATE
// =======================================================

export function updateGems(player, frameCount) {
    if (!player) return;

    for (let i = gems.length - 1; i >= 0; i--) {
        const g = gems[i];

        // animación
        if (frameCount % 2 === 0)
            g.mesh.rotation.y += 0.08;

        // distancia REAL usando mesh.position
        const dx = g.mesh.position.x - player.x;
        const dz = g.mesh.position.z - player.z;

        const distSq = dx * dx + dz * dz;
        const magnetSq = player.pickupRange * player.pickupRange;

        // magnet extra
        if (g.special && distSq < magnetSq * 4) g.forcePull = true;

        // atracción
        if (distSq < magnetSq || g.forcePull) {
            const pullForce = g.forcePull ? 0.35 : player.magnetPower;

            g.mesh.position.x += (player.x - g.mesh.position.x) * pullForce;
            g.mesh.position.z += (player.z - g.mesh.position.z) * pullForce;
        }

        // distancia actualizada
        const dist = Math.sqrt(distSq);

        // Pickup
        if (dist < 1.6) {

            const xpAmount = 3 + Math.floor(player.level * 0.55);

            //console.log("🟦 PICKUP DETECTADO");
            //console.log("XP Ganada:", xpAmount);
            //console.log("XP ANTES:", player.xp, "NextLevel:", player.nextLevelXP);

            const leveled = addXP(player, xpAmount);

            //console.log("XP DESPUES:", player.xp, "NextLevel:", player.nextLevelXP);
            //console.log("Llego a LevelUp?", leveled);

            UI.updateXPBar(player);
            Sound.play("xp");

            if (leveled) {
                //console.log("🟩 SUBIÓ DE NIVEL — MOSTRAR MENÚ");

                Sound.play("levelup");
                showLevelUp(player);
            }

            groups.drops.remove(g.mesh);
            gems.splice(i, 1);
        }
    }
}



// =======================================================
// RESET
// =======================================================

export function resetDrops() {
    for (let g of gems) groups.drops.remove(g.mesh);
    gems.length = 0;
}
