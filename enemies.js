// =======================================================
// enemies.js — LOWPOLY COMPLETE PACK (Tiers + Elites)
// =======================================================

import * as THREE from "three";
import { groups } from "../world.js";
import { player } from "../core.js";
import { spawnGem } from "./drops.js";
import { floatingDamage } from "./particles_fx.js";
import { damagePlayer } from "./player.js";
import * as Audio from "../audio.js";
import { createImpactVisual } from "./particles_fx.js";
// Lista global de enemigos
export const enemies = [];

// =======================================================
// LOWPOLY MODELS — TIER 1
// =======================================================
// =====================================================
// UNIVERSAL WALK CYCLE (Lowpoly AAA locomotion system)
// =====================================================
export function applyWalkCycle(group, t, speed, dirX, dirZ) {

    // Normalizar velocidad (0–1)
    const s = Math.min(speed * 1.5, 1);
    if (s < 0.01) return; // NO animar si no se mueve

    // Intensidad del paso
    const step = Math.sin(t * (8 + s * 18));

    // Bob vertical fijo (NO acumular)
    if (group.userData.baseY === undefined) {
        group.userData.baseY = group.position.y;
    }

    group.position.y = group.userData.baseY + Math.sin(t * 12 * s) * 0.02 * s;

    // Rotación ligera del torso durante paso
    if (group.userData.torso) {
        group.userData.torso.rotation.y = Math.sin(t * 6 * s) * 0.15 * s;
    }

    // Piernas (alternando)
    if (group.userData.legs) {
        const [L1, R1, L2, R2] = group.userData.legs;

        const amp1 = 10.1 * s; // antes 0.5
        const amp2 = 10.9 * s; // antes 0.4

        if (L1) L1.rotation.x = step * amp1;
        if (R1) R1.rotation.x = -step * amp1;

        if (L2) L2.rotation.x = -step * amp2;
        if (R2) R2.rotation.x = step * amp2;
    }

    // Brazos
    if (group.userData.arms) {
        const [armL, armR] = group.userData.arms;
        armL.rotation.x = -step * 0.3 * s;
        armR.rotation.x = step * 0.3 * s;
    }

    // Cabeza
    if (group.userData.head) {
        group.userData.head.rotation.y = Math.sin(t * 4) * 0.1 * s;
        group.userData.head.rotation.x = Math.sin(t * 3) * 0.05 * s;
    }

    // Cola
    if (group.userData.tail) {
        group.userData.tail.rotation.z = Math.sin(t * 8) * 0.25 * s;
    }

    // Alineación con dirección real
    const angle = Math.atan2(dirX, dirZ);
    group.rotation.y = angle;
}

// =======================================================
// MAGIC PROJECTILES (para enemy: mage)
// =======================================================
const mageProjectiles = [];

function spawnMageProjectile(x, z, angle, damage) {

    const geo = new THREE.SphereGeometry(0.45, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x66ccff,
        emissive: 0x3399ff,
        emissiveIntensity: 1.6,
        roughness: 0.2,
        metalness: 0.1
    });

    // PRIMERO se crea el mesh
    const mesh = new THREE.Mesh(geo, mat);

    // LUEGO se posiciona
    mesh.position.set(x, 2.0, z);

    // LUEGO se agrega al grupo
    groups.bullets.add(mesh);

    // Y recién después se agrega al array
    mageProjectiles.push({
        mesh: mesh,       // <-- asegurate de usar clave:valor
        x,
        z,
        vx: Math.cos(angle) * 0.8,
        vz: Math.sin(angle) * 0.8,
        life: 160,
        damage
    });
}



function createSlime() {
    const group = new THREE.Group();

    // ========= SLIME BODY (Facetado + translúcido) =========
    const bodyGeo = new THREE.IcosahedronGeometry(1.2, 0);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x66ff99,
        roughness: 0.2,
        metalness: 0.0,
        transparent: true,
        opacity: 0.8,
        emissive: 0x33ff88,
        emissiveIntensity: 0.35
    });

    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = false;
    body.receiveShadow = false;
    group.add(body);

    // ========= EYES (Triangulares, estilo lowpoly) =========
    const eyeGeo = new THREE.ConeGeometry(0.15, 0.35, 3);
    const eyeMat = new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 0.9,
        metalness: 0
    });

    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);

    // rotar para que apunten hacia adelante
    eyeL.rotation.x = -Math.PI / 2;
    eyeR.rotation.x = -Math.PI / 2;

    eyeL.position.set(-0.35, 0.1, 0.8);
    eyeR.position.set(0.35, 0.1, 0.8);

    group.add(eyeL, eyeR);

    // ========= ANIMATION =========
    group.userData.anim = (t) => {
        // Squish
        const squish = 1 + Math.sin(t * 4) * 0.08;
        body.scale.set(1, squish, 1);

        // Glow pulsante
        body.material.emissiveIntensity = 0.32 + Math.sin(t * 3) * 0.1;
        
        // Micro-tilt lowpoly
        group.rotation.z = Math.sin(t * 1.5) * 0.05;
        group.rotation.x = Math.sin(t * 2.0) * 0.03;
    };

    return group;
}


function createSkeleton() {
    const group = new THREE.Group();

    // MATERIAL GENERAL (piedra/hueso)
    const boneMat = new THREE.MeshStandardMaterial({
        color: 0xd8d2c2,
        roughness: 0.9,
        metalness: 0.1
    });

    const darkMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9
    });

    // ===============================
    // SKULL
    // ===============================

    const skull = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.55, 0),
        boneMat
    );
    skull.position.y = 2.3;

    // Eye hollows (black tetrahedrons)
    const eyeL = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.35, 4),
        darkMat
    );
    const eyeR = eyeL.clone();

    eyeL.rotation.x = -Math.PI / 2;
    eyeR.rotation.x = -Math.PI / 2;

    eyeL.position.set(-0.25, 2.2, 0.35);
    eyeR.position.set(0.25, 2.2, 0.35);

    group.add(skull, eyeL, eyeR);

    // Jaw
    const jaw = new THREE.Mesh(
        new THREE.ConeGeometry(0.4, 0.5, 5),
        boneMat
    );
    jaw.rotation.x = Math.PI;
    jaw.position.set(0, 1.95, 0.05);
    group.add(jaw);

    // ===============================
    // HELMET + HORNS
    // ===============================
    const helm = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.7, 0),
        boneMat
    );
    helm.position.y = 2.6;

    const hornL = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, 0.9, 5),
        boneMat
    );
    hornL.position.set(-0.45, 2.7, 0.2);
    hornL.rotation.z = Math.PI * 0.6;

    const hornR = hornL.clone();
    hornR.position.x = 0.45;
    hornR.rotation.z = -Math.PI * 0.6;

    group.add(helm, hornL, hornR);

    // ===============================
    // TORSO ARMOR
    // ===============================
    const chest = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 1.1, 0.7),
        boneMat
    );
    chest.position.y = 1.3;

    const shoulderL = new THREE.Mesh(
        new THREE.ConeGeometry(0.45, 0.6, 5),
        boneMat
    );
    shoulderL.position.set(-0.8, 1.7, 0);

    const shoulderR = shoulderL.clone();
    shoulderR.position.x = 0.8;

    group.add(chest, shoulderL, shoulderR);

    // ===============================
    // ARMS
    // ===============================
    const armGeo = new THREE.CapsuleGeometry(0.15, 0.5, 2, 4);

    const armL = new THREE.Mesh(armGeo, boneMat);
    const armR = new THREE.Mesh(armGeo, boneMat);

    armL.position.set(-0.7, 1.3, 0);
    armR.position.set(0.7, 1.3, 0);

    // ===============================
    // LEGS
    // ===============================
    const legGeo = new THREE.CapsuleGeometry(0.18, 0.7, 2, 4);

    const legL = new THREE.Mesh(legGeo, boneMat);
    const legR = new THREE.Mesh(legGeo, boneMat);

    legL.position.set(-0.35, 0.4, 0);
    legR.position.set(0.35, 0.4, 0);

    group.add(armL, armR, legL, legR);

    // ===============================
    // SWORD
    // ===============================
    const swordBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 1.1, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xcfcfcf, metalness: 0.7, roughness: 0.2 })
    );
    swordBlade.position.set(0.9, 1.3, 0);

    const swordHilt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.3, 5),
        darkMat
    );
    swordHilt.position.set(0.9, 1.0, 0);

    group.add(swordBlade, swordHilt);

    // ===============================
    // SHIELD
    // ===============================
    const shield = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 0.1, 6),
        boneMat
    );
    shield.rotation.z = Math.PI / 2;
    shield.position.set(-0.9, 1.3, 0);

    group.add(shield);

    // ===============================
    // ANIMATION (RATTLE + HEAD SWAY)
    // ===============================
    group.userData.anim = (t) => {
        // shaking bones
        const shake = Math.sin(t * 10) * 0.03;
        armL.rotation.z = shake;
        armR.rotation.z = -shake;
        legL.rotation.z = -shake * 0.5;
        legR.rotation.z = shake * 0.5;

        // head tilt
        skull.rotation.y = Math.sin(t * 2) * 0.1;

        // whole body wobble
        group.position.y = Math.sin(t * 3) * 0.05;
    };
    group.userData.head = skull;
    group.userData.torso = chest;
    group.userData.legs = [legL, legR];
    group.userData.arms = [armL, armR];
    return group;
}


function createImp() {
    const group = new THREE.Group();

    // =======================================================
    // MATERIAL DEMONÍACO (ROJO OSCURO + EMISSIVE)
    // =======================================================
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x992222,
        roughness: 0.55,
        emissive: 0x330000,
        emissiveIntensity: 0.4
    });

    const darkMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9
    });

    const glowMat = new THREE.MeshStandardMaterial({
        color: 0xaa0000,
        emissive: 0xff2222,
        emissiveIntensity: 0.8,
        roughness: 0.3
    });

    // =======================================================
    // HEAD (tetrahedral demon head)
    // =======================================================
    const headGeo = new THREE.TetrahedronGeometry(0.55, 0);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.y = 1.7;
    head.rotation.y = Math.PI / 4;
    group.add(head);

    // EYES (triangular lowpoly)
    const eyeGeo = new THREE.ConeGeometry(0.12, 0.28, 4);
    const eyeL = new THREE.Mesh(eyeGeo, glowMat);
    const eyeR = eyeL.clone();

    eyeL.rotation.x = -Math.PI / 2;
    eyeR.rotation.x = -Math.PI / 2;

    eyeL.position.set(-0.22, 1.62, 0.4);
    eyeR.position.set(0.22, 1.62, 0.4);

    group.add(eyeL, eyeR);

    // =======================================================
    // HORNS (curved cones)
    // =======================================================
    const hornGeo = new THREE.ConeGeometry(0.18, 0.7, 5);
    const hornL = new THREE.Mesh(hornGeo, bodyMat);
    const hornR = new THREE.Mesh(hornGeo, bodyMat);

    hornL.position.set(-0.38, 1.95, 0.05);
    hornR.position.set(0.38, 1.95, 0.05);

    hornL.rotation.z = Math.PI * 0.7;
    hornR.rotation.z = -Math.PI * 0.7;

    group.add(hornL, hornR);

    // =======================================================
    // BODY (capsule lowpoly)
    // =======================================================
    const torso = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.45, 0.9, 3, 6),
        bodyMat
    );
    torso.position.y = 0.9;
    group.add(torso);

    // =======================================================
    // ARMS (thin capsule bones)
    // =======================================================
    const armGeo = new THREE.CapsuleGeometry(0.12, 0.5, 2, 4);

    const armL = new THREE.Mesh(armGeo, bodyMat);
    const armR = new THREE.Mesh(armGeo, bodyMat);

    armL.position.set(-0.55, 0.9, 0);
    armR.position.set(0.55, 0.9, 0);

    armL.rotation.z = Math.PI / 9;
    armR.rotation.z = -Math.PI / 9;

    group.add(armL, armR);

    // =======================================================
    // LEGS
    // =======================================================
    const legGeo = new THREE.CapsuleGeometry(0.15, 0.65, 2, 4);

    const legL = new THREE.Mesh(legGeo, bodyMat);
    const legR = new THREE.Mesh(legGeo, bodyMat);

    legL.position.set(-0.3, 0.3, 0);
    legR.position.set(0.3, 0.3, 0);

    group.add(legL, legR);

    // =======================================================
    // FEET (sharp triangular)
    // =======================================================
    const footGeo = new THREE.ConeGeometry(0.18, 0.4, 4);
    const footL = new THREE.Mesh(footGeo, darkMat);
    const footR = new THREE.Mesh(footGeo, darkMat);

    footL.rotation.x = -Math.PI / 2;
    footR.rotation.x = -Math.PI / 2;

    footL.position.set(-0.3, 0.05, 0.25);
    footR.position.set(0.3, 0.05, 0.25);

    group.add(footL, footR);

    // =======================================================
    // WINGS (demonic bat wings)
    // =======================================================
    const wingMat = new THREE.MeshStandardMaterial({
        color: 0x551111,
        side: THREE.DoubleSide,
        roughness: 0.8
    });

    const wingGeo = new THREE.PlaneGeometry(1.4, 1.1);

    const wingL = new THREE.Mesh(wingGeo, wingMat);
    const wingR = new THREE.Mesh(wingGeo, wingMat);

    wingL.position.set(-0.6, 1.1, -0.1);
    wingR.position.set(0.6, 1.1, -0.1);

    wingL.rotation.y = Math.PI / 2.8;
    wingR.rotation.y = -Math.PI / 2.8;

    wingL.rotation.z = 0.3;
    wingR.rotation.z = -0.3;

    group.add(wingL, wingR);

    // =======================================================
    // TAIL (triangle tip)
    // =======================================================
    const tail = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.8, 4),
        bodyMat
    );
    tail.position.set(0, 0.6, -0.5);
    tail.rotation.x = Math.PI * 1.2;
    group.add(tail);

    // =======================================================
    // ANIMATION (hover + wing flap + head tilt)
    // =======================================================
    group.userData.anim = (t) => {
        // hovering
        group.position.y = Math.sin(t * 4) * 0.1;

        // wings
        wingL.rotation.z = Math.sin(t * 15) * 0.2 + 0.3;
        wingR.rotation.z = -Math.sin(t * 15) * 0.2 - 0.3;

        // head tilt
        head.rotation.y = Math.sin(t * 3) * 0.2;

        // arms slight sway
        armL.rotation.z = Math.sin(t * 8) * 0.1 + Math.PI/9;
        armR.rotation.z = -Math.sin(t * 8) * 0.1 - Math.PI/9;
    };
    group.userData.head = head;
    group.userData.legs = [legL, legR];
    group.userData.arms = [armL, armR];
    group.userData.tail = tail;
    group.userData.torso = torso;
    return group;
}


// =======================================================
// LOWPOLY MODELS — TIER 2
// =======================================================

function createWolf() {
    const group = new THREE.Group();

    // ===============================
    // MATERIAL
    // ===============================
    const furMat = new THREE.MeshStandardMaterial({
        color: 0x554433,
        roughness: 0.8,
        metalness: 0.1
    });

    const darkMat = new THREE.MeshStandardMaterial({
        color: 0x1a130d,
        roughness: 0.7
    });

    const eyeMat = new THREE.MeshStandardMaterial({
        color: 0xdd5533,
        emissive: 0xff3311,
        emissiveIntensity: 0.8
    });

    // ===============================
    // BODY (elongated faceted shape)
    // ===============================
    const bodyGeo = new THREE.IcosahedronGeometry(1.1, 0);
    const body = new THREE.Mesh(bodyGeo, furMat);
    body.scale.set(1.8, 1, 0.9);
    body.position.y = 0.9;
    group.add(body);

    // ===============================
    // HEAD
    // ===============================
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.6, 1.1),
        furMat
    );
    head.position.set(0, 1.3, 1.2);
    group.add(head);

    // SNOUT
    const snout = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.8, 5),
        furMat
    );
    snout.rotation.x = -Math.PI / 2;
    snout.position.set(0, 1.1, 1.9);
    group.add(snout);

    // NOSE
    const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.2, 4),
        darkMat
    );
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 1.05, 2.05);
    group.add(nose);

    // EYES
    const eyeL = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.24, 4),
        eyeMat
    );
    const eyeR = eyeL.clone();
    eyeL.rotation.x = -Math.PI / 2;
    eyeR.rotation.x = -Math.PI / 2;

    eyeL.position.set(-0.25, 1.35, 1.65);
    eyeR.position.set(0.25, 1.35, 1.65);

    group.add(eyeL, eyeR);

    // EARS
    const earGeo = new THREE.ConeGeometry(0.3, 0.6, 4);
    const earL = new THREE.Mesh(earGeo, furMat);
    const earR = new THREE.Mesh(earGeo, furMat);

    earL.position.set(-0.35, 1.6, 0.9);
    earR.position.set(0.35, 1.6, 0.9);

    earL.rotation.z = Math.PI / 10;
    earR.rotation.z = -Math.PI / 10;

    group.add(earL, earR);

    // ===============================
    // LEGS (capsule lowpoly)
    // ===============================
    const legGeo = new THREE.CapsuleGeometry(0.15, 0.6, 2, 4);

    const legFL = new THREE.Mesh(legGeo, furMat);
    const legFR = new THREE.Mesh(legGeo, furMat);
    const legBL = new THREE.Mesh(legGeo, furMat);
    const legBR = new THREE.Mesh(legGeo, furMat);

    legFL.position.set(-0.45, 0.35, 0.55);
    legFR.position.set(0.45, 0.35, 0.55);
    legBL.position.set(-0.45, 0.35, -0.45);
    legBR.position.set(0.45, 0.35, -0.45);

    group.add(legFL, legFR, legBL, legBR);

    // ===============================
    // FEET (sharp lowpoly)
    // ===============================
    const footGeo = new THREE.ConeGeometry(0.15, 0.25, 4);

    const footFL = new THREE.Mesh(footGeo, darkMat);
    const footFR = new THREE.Mesh(footGeo, darkMat);
    const footBL = new THREE.Mesh(footGeo, darkMat);
    const footBR = new THREE.Mesh(footGeo, darkMat);

    footFL.rotation.x = -Math.PI / 2;
    footFR.rotation.x = -Math.PI / 2;
    footBL.rotation.x = -Math.PI / 2;
    footBR.rotation.x = -Math.PI / 2;

    footFL.position.set(-0.45, 0.1, 0.65);
    footFR.position.set(0.45, 0.1, 0.65);
    footBL.position.set(-0.45, 0.1, -0.35);
    footBR.position.set(0.45, 0.1, -0.35);

    group.add(footFL, footFR, footBL, footBR);

    // ===============================
    // TAIL
    // ===============================
    const tail = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 1.2, 5),
        furMat
    );
    tail.position.set(0, 1.1, -1.0);
    tail.rotation.x = Math.PI * 1.15;
    group.add(tail);

    // ===============================
    // ANIMATION
    // ===============================
    group.userData.anim = (t) => {
        // galloping movement
        const s = Math.sin(t * 7);

        legFL.rotation.x = s * 0.6;
        legBR.rotation.x = s * 0.6;

        legFR.rotation.x = -s * 0.6;
        legBL.rotation.x = -s * 0.6;

        head.position.z = 1.2 + Math.sin(t * 7) * 0.12;
        tail.rotation.x = Math.PI * 1.15 + Math.sin(t * 5) * 0.12;

        group.position.y = Math.sin(t * 8) * 0.06;
    };
    group.userData.head = head;
    group.userData.legs = [legFL, legFR, legBL, legBR];
    group.userData.tail = tail;
    group.userData.torso = body;
    return group;
}


function createMage() {
    const group = new THREE.Group();
    group.userData.type = "mage";
    // ===============================
    // MATERIALS
    // ===============================
    const robeMat = new THREE.MeshStandardMaterial({
        color: 0x443366,
        roughness: 0.7,
        metalness: 0.1
    });

    const innerRobeMat = new THREE.MeshStandardMaterial({
        color: 0x332255,
        roughness: 0.6
    });

    const stoneMat = new THREE.MeshStandardMaterial({
        color: 0x999aaa,
        roughness: 0.95
    });

    const glowMat = new THREE.MeshStandardMaterial({
        color: 0x66aaff,
        emissive: 0x3377ff,
        emissiveIntensity: 0.8,
        roughness: 0.3
    });

    const darkMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9
    });

    // ===============================
    // ROBE (Outer + Inner)
    // ===============================
    const robeOuter = new THREE.Mesh(
        new THREE.ConeGeometry(1.2, 2.4, 6),
        robeMat
    );
    robeOuter.position.y = 1.2;

    const robeInner = new THREE.Mesh(
        new THREE.ConeGeometry(0.9, 2.4, 5),
        innerRobeMat
    );
    robeInner.position.y = 1.2;

    group.add(robeOuter, robeInner);

    // ===============================
    // SHOULDERS (stone armor)
    // ===============================
    const shoulderL = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.55, 0),
        stoneMat
    );
    const shoulderR = shoulderL.clone();

    shoulderL.position.set(-0.95, 2.1, 0);
    shoulderR.position.set(0.95, 2.1, 0);

    group.add(shoulderL, shoulderR);

    // ===============================
    // HEAD (floating stone)
    // ===============================
    const head = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.6, 0),
        stoneMat
    );
    head.position.y = 2.5;
    group.add(head);

    // eyes
    const eyeL = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.25, 4),
        glowMat
    );
    const eyeR = eyeL.clone();

    eyeL.rotation.x = -Math.PI / 2;
    eyeR.rotation.x = -Math.PI / 2;

    eyeL.position.set(-0.22, 2.45, 0.4);
    eyeR.position.set(0.22, 2.45, 0.4);

    group.add(eyeL, eyeR);

    // ===============================
    // ARMS
    // ===============================
    const armGeo = new THREE.CapsuleGeometry(0.15, 0.6, 2, 4);

    const armL = new THREE.Mesh(armGeo, stoneMat);
    const armR = new THREE.Mesh(armGeo, stoneMat);

    armL.position.set(-0.7, 1.5, 0.1);
    armR.position.set(0.7, 1.5, 0.1);

    group.add(armL, armR);

    // HANDS (claws)
    const handGeo = new THREE.ConeGeometry(0.17, 0.3, 4);

    const handL = new THREE.Mesh(handGeo, darkMat);
    const handR = new THREE.Mesh(handGeo, darkMat);

    handL.rotation.x = -Math.PI / 2;
    handR.rotation.x = -Math.PI / 2;

    handL.position.set(-0.7, 1.05, 0.35);
    handR.position.set(0.7, 1.05, 0.35);

    group.add(handL, handR);

    // ===============================
    // STAFF (magic rod)
    // ===============================
    const staff = new THREE.Group();

    const shaft = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 1.4, 0.15),
        darkMat
    );
    shaft.position.y = 0.8;

    const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.35, 0),
        glowMat
    );
    crystal.position.y = 1.6;

    staff.add(shaft, crystal);
    staff.position.set(0.85, 1.1, 0.1);

    group.add(staff);

    // ===============================
    // RUNES (floating around head)
    // ===============================
    const runeGeo = new THREE.TetrahedronGeometry(0.18, 0);
    const runes = [];

    for (let i = 0; i < 3; i++) {
        const rune = new THREE.Mesh(runeGeo, glowMat);
        rune.position.set(
            Math.cos(i * 2.1) * 0.9,
            2.6 + Math.sin(i * 2.1) * 0.2,
            Math.sin(i * 2.1) * 0.9
        );
        runes.push(rune);
        group.add(rune);
    }

    // ===============================
    // ANIMATION
    // ===============================
    group.userData.anim = (t) => {
        // floating
        group.position.y = Math.sin(t * 2.5) * 0.1;

        // head float
        head.position.y = 2.5 + Math.sin(t * 3) * 0.05;

        // arms hover motion
        armL.rotation.z = Math.sin(t * 3) * 0.1 + 0.2;
        armR.rotation.z = -Math.sin(t * 3) * 0.1 - 0.2;

        // runes orbit
        for (let i = 0; i < runes.length; i++) {
            const rune = runes[i];
            rune.position.x = Math.cos(t * 2 + i * 2.1) * 0.9;
            rune.position.z = Math.sin(t * 2 + i * 2.1) * 0.9;
            rune.position.y = 2.55 + Math.sin(t * 4 + i) * 0.08;
        }

        // staff sway
        staff.rotation.z = Math.sin(t * 2) * 0.15;
    };
    group.userData.head = head;
    group.userData.arms = [armL, armR];
    group.userData.torso = robeOuter;
    return group;
}


function createSkeletonArcher() {
    const group = new THREE.Group();

    // =====================================
    // MATERIALS
    // =====================================
    const boneMat = new THREE.MeshStandardMaterial({
        color: 0xd8d2c2,
        roughness: 0.9,
        metalness: 0.1
    });

    const darkMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9
    });

    const eyeMat = new THREE.MeshStandardMaterial({
        color: 0x55aaff,
        emissive: 0x2288ff,
        emissiveIntensity: 1.1
    });

    // =====================================
    // HEAD
    // =====================================
    const skull = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.55, 0),
        boneMat
    );
    skull.position.y = 2.2;

    const jaw = new THREE.Mesh(
        new THREE.ConeGeometry(0.4, 0.45, 5),
        boneMat
    );
    jaw.rotation.x = Math.PI;
    jaw.position.set(0, 1.95, 0.05);

    // eyes
    const eyeL = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.25, 4),
        eyeMat
    );
    const eyeR = eyeL.clone();
    eyeL.rotation.x = -Math.PI / 2;
    eyeR.rotation.x = -Math.PI / 2;

    eyeL.position.set(-0.22, 2.1, 0.35);
    eyeR.position.set(0.22, 2.1, 0.35);

    group.add(skull, jaw, eyeL, eyeR);

    // =====================================
    // TORSO
    // =====================================
    const chest = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.1, 0.6),
        boneMat
    );
    chest.position.y = 1.3;
    group.add(chest);

    // =====================================
    // ARMS (one extended, one pulling)
    // =====================================
    const armGeo = new THREE.CapsuleGeometry(0.14, 0.6, 2, 4);

    const armL = new THREE.Mesh(armGeo, boneMat);  // holding bow
    const armR = new THREE.Mesh(armGeo, boneMat);  // pulling

    armL.position.set(-0.65, 1.3, 0.05);
    armR.position.set(0.65, 1.3, 0.05);

    // rotate to be expressive
    armL.rotation.z = Math.PI / 8;
    armR.rotation.z = -Math.PI / 6;

    group.add(armL, armR);

    // HANDS
    const handGeo = new THREE.ConeGeometry(0.15, 0.3, 4);

    const handL = new THREE.Mesh(handGeo, darkMat);
    const handR = new THREE.Mesh(handGeo, darkMat);

    handL.rotation.x = -Math.PI / 2;
    handR.rotation.x = -Math.PI / 2;

    handL.position.set(-0.75, 1.0, 0.25);
    handR.position.set(0.75, 1.0, 0.25);

    group.add(handL, handR);

    // =====================================
    // LEGS
    // =====================================
    const legGeo = new THREE.CapsuleGeometry(0.18, 0.65, 2, 4);

    const legL = new THREE.Mesh(legGeo, boneMat);
    const legR = new THREE.Mesh(legGeo, boneMat);

    legL.position.set(-0.3, 0.4, 0);
    legR.position.set(0.3, 0.4, 0);

    group.add(legL, legR);

    // =====================================
    // BOW
    // =====================================
    const bowMat = new THREE.MeshStandardMaterial({
        color: 0x332200,
        roughness: 0.8
    });

    const bow = new THREE.Group();

    const bowArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.9, 0.08, 4, 8, Math.PI),
        bowMat
    );
    bowArc.rotation.y = Math.PI / 2;
    bowArc.position.y = 1.0;

    // bow string
    const string = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 1.8, 6),
        darkMat
    );
    string.rotation.z = Math.PI / 2;
    string.position.set(0, 1.0, 0);

    bow.add(bowArc, string);
    bow.position.set(-0.9, 1.1, 0.1);

    group.add(bow);

    // =====================================
    // QUIVER (arrows)
    // =====================================
    const quiver = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 1.0, 0.35),
        darkMat
    );
    quiver.position.set(0.45, 1.6, -0.4);
    quiver.rotation.x = -Math.PI / 5;

    // arrows (3)
    for (let i = 0; i < 3; i++) {
        const arrow = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 1.0, 0.08),
            boneMat
        );
        arrow.position.set(
            0.45,
            1.6 + i * 0.15,
            -0.4 - i * 0.05
        );
        arrow.rotation.x = -Math.PI / 5;
        group.add(arrow);
    }

    group.add(quiver);

    // =====================================
    // ANIMATION
    // =====================================
    group.userData.anim = (t) => {
        // breathing
        group.position.y = Math.sin(t * 2) * 0.05;

        // slight rotation (aiming)
        chest.rotation.y = Math.sin(t * 0.8) * 0.1;

        // bow string vibration
        string.scale.z = 1 + Math.sin(t * 15) * 0.04;

        // aiming arm motions
        armL.rotation.z = Math.PI / 8 + Math.sin(t * 3) * 0.05;
        armR.rotation.z = -Math.PI / 6 + Math.sin(t * 3 + 1) * 0.05;
    };

    return group;
}


// =======================================================
// LOWPOLY MODELS — TIER 3
// =======================================================

function createGolem() {
    const group = new THREE.Group();

    // ======================================================
    // MATERIALS
    // ======================================================
    const rockMat = new THREE.MeshStandardMaterial({
        color: 0x4b4b4b,        // roca oscura
        roughness: 0.95,
        metalness: 0.1
    });

    const coreMat = new THREE.MeshStandardMaterial({
        color: 0x33ff99,        // verde esmeralda
        emissive: 0x22ff88,
        emissiveIntensity: 1.0,
        roughness: 0.3
    });

    const runeMat = new THREE.MeshStandardMaterial({
        color: 0x66ffbb,
        emissive: 0x33ff99,
        emissiveIntensity: 1.2
    });

    // ======================================================
    // HEAD (floating stone + core glow)
    // ======================================================
    const head = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.9, 0),
        rockMat
    );
    head.position.y = 3.8;
    group.add(head);

    const headCore = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.45, 0),
        coreMat
    );
    headCore.position.y = 3.8;
    group.add(headCore);

    // ======================================================
    // RUNES (floating around head)
    // ======================================================
    const runeGeo = new THREE.TetrahedronGeometry(0.35, 0);
    const runes = [];

    for (let i = 0; i < 4; i++) {
        const r = new THREE.Mesh(runeGeo, runeMat);
        r.position.set(
            Math.cos(i * 1.5) * 1.8,
            3.9 + Math.sin(i * 1.5) * 0.4,
            Math.sin(i * 1.5) * 1.8
        );
        runes.push(r);
        group.add(r);
    }

    // ======================================================
    // TORSO (segmentos flotantes de roca)
    // ======================================================
    const torsoTop = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.2, 1.6),
        rockMat
    );
    torsoTop.position.y = 2.8;

    const torsoBot = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 1.0, 1.4),
        rockMat
    );
    torsoBot.position.y = 1.7;

    // grieta con energía interna
    const chestCore = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.9, 0),
        coreMat
    );
    chestCore.position.y = 2.1;

    group.add(torsoTop, torsoBot, chestCore);

    // ======================================================
    // SHOULDERS — huge facet rocks
    // ======================================================
    const shoulderGeo = new THREE.OctahedronGeometry(0.9, 0);
    const shoulderL = new THREE.Mesh(shoulderGeo, rockMat);
    const shoulderR = new THREE.Mesh(shoulderGeo, rockMat);

    shoulderL.position.set(-1.8, 2.9, 0);
    shoulderR.position.set(1.8, 2.9, 0);

    group.add(shoulderL, shoulderR);

    // ======================================================
    // ARMS — segmented floating rocks
    // ======================================================
    const armUpperGeo = new THREE.BoxGeometry(0.7, 1.2, 0.7);
    const armLowerGeo = new THREE.BoxGeometry(0.6, 1.1, 0.6);

    const armL1 = new THREE.Mesh(armUpperGeo, rockMat);
    const armL2 = new THREE.Mesh(armLowerGeo, rockMat);

    const armR1 = new THREE.Mesh(armUpperGeo, rockMat);
    const armR2 = new THREE.Mesh(armLowerGeo, rockMat);

    armL1.position.set(-1.4, 2.2, 0);
    armL2.position.set(-1.4, 1.2, 0);

    armR1.position.set(1.4, 2.2, 0);
    armR2.position.set(1.4, 1.2, 0);

    group.add(armL1, armL2, armR1, armR2);

    // ENERGY KNOTS
    const armCoreL = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), coreMat);
    armCoreL.position.set(-1.4, 1.7, 0);

    const armCoreR = armCoreL.clone();
    armCoreR.position.set(1.4, 1.7, 0);

    group.add(armCoreL, armCoreR);

    // ======================================================
    // LEGS — massive pillars
    // ======================================================
    const legGeo = new THREE.BoxGeometry(0.9, 1.8, 0.9);

    const legL = new THREE.Mesh(legGeo, rockMat);
    const legR = new THREE.Mesh(legGeo, rockMat);

    legL.position.set(-0.9, 0.9, 0);
    legR.position.set(0.9, 0.9, 0);

    group.add(legL, legR);

    // glowing core between legs
    const legCore = new THREE.Mesh(new THREE.TetrahedronGeometry(0.6, 0), coreMat);
    legCore.position.y = 0.6;
    group.add(legCore);

    // ======================================================
    // ANIMATION — heavy floating guardian
    // ======================================================
    group.userData.anim = (t) => {

        // floating heavy body
        const lift = Math.sin(t * 1.4) * 0.15;
        group.position.y = lift;

        // head slight rotation
        head.rotation.y = Math.sin(t * 0.7) * 0.2;
        head.rotation.x = Math.sin(t * 0.5) * 0.1;
        headCore.rotation.y = -Math.sin(t * 1.5) * 0.4;

        // torso pieces vibration
        torsoTop.position.y = 2.8 + Math.sin(t * 3) * 0.05;
        torsoBot.position.y = 1.7 - Math.sin(t * 2.7) * 0.05;

        // runes orbiting
        for (let i = 0; i < runes.length; i++) {
            const r = runes[i];
            r.position.x = Math.cos(t * 1.2 + i * 1.5) * 1.8;
            r.position.z = Math.sin(t * 1.2 + i * 1.5) * 1.8;
            r.position.y = 3.9 + Math.sin(t * 3 + i) * 0.12;
        }

        // arms slow drift
        armL1.position.x = -1.4 + Math.sin(t * 1.5) * 0.1;
        armR1.position.x = 1.4 - Math.sin(t * 1.5) * 0.1;
        armL2.position.x = -1.4 + Math.sin(t * 2.5) * 0.1;
        armR2.position.x = 1.4 - Math.sin(t * 2.5) * 0.1;
    };

    group.scale.set(2.6, 2.6, 2.6);
        // === MARK ANIMATABLE PARTS FOR WALK CYCLE ===
    group.userData.head = head;
    group.userData.torso = torsoTop;

    group.userData.legs = [ legL, legR ];
    group.userData.arms = [ armL1, armR1 ];
    return group;
}


function createCrystal() {
    const group = new THREE.Group();

    // ======================================================
    // MATERIALS
    // ======================================================
    const crystalMat = new THREE.MeshStandardMaterial({
        color: 0x88ddff,
        roughness: 0.02,           // cristal más limpio
        metalness: 0.0,            // reduce turbidez
        transparent: true,
        opacity: 0.35,             // MUCHO más translúcido
        emissive: 0x44ccff,
        emissiveIntensity: 0.4,
        depthWrite: false,         // clave para transparencia real
        depthTest: true
    });

    const coreMat = new THREE.MeshStandardMaterial({
        color: 0x99eeff,
        emissive: 0x66ddff,
        emissiveIntensity: 1.3,
        roughness: 0.3
    });

    const darkMat = new THREE.MeshStandardMaterial({
        color: 0x223344,
        roughness: 0.8
    });

    // ======================================================
    // HEAD (massive crystal skull)
    // ======================================================
    const head = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.0, 0),
        crystalMat
    );
    head.position.y = 2.6;
    head.position.z = 1.2;
    group.add(head);

    // inner core behind head
    const headCore = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.55, 0),
        coreMat
    );
    headCore.position.copy(head.position);
    group.add(headCore);

    // jaws (two crystal plates)
    const jawUpper = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.4, 0.8),
        crystalMat
    );
    jawUpper.position.set(0, 2.4, 1.8);

    const jawLower = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.35, 0.7),
        crystalMat
    );
    jawLower.position.set(0, 2.1, 1.75);

    group.add(jawUpper, jawLower);

    // EYES — bright cyan slits
    const eyeGeo = new THREE.ConeGeometry(0.18, 0.35, 4);
    const eyeL = new THREE.Mesh(eyeGeo, coreMat);
    const eyeR = eyeL.clone();

    eyeL.rotation.x = -Math.PI / 2;
    eyeR.rotation.x = -Math.PI / 2;

    eyeL.position.set(-0.38, 2.45, 1.7);
    eyeR.position.set(0.38, 2.45, 1.7);

    group.add(eyeL, eyeR);

    // ======================================================
    // HORNS (long crystal spears)
    // ======================================================
    const hornGeo = new THREE.ConeGeometry(0.35, 1.4, 6);
    const hornL = new THREE.Mesh(hornGeo, crystalMat);
    const hornR = new THREE.Mesh(hornGeo, crystalMat);

    hornL.position.set(-0.6, 3.0, 1.0);
    hornR.position.set(0.6, 3.0, 1.0);

    hornL.rotation.z = Math.PI * 0.25;
    hornR.rotation.z = -Math.PI * 0.25;

    group.add(hornL, hornR);

    // ======================================================
    // BODY (large fractured crystal cluster)
    // ======================================================
    const torso = new THREE.Mesh(
        new THREE.DodecahedronGeometry(2.1, 0),
        crystalMat
    );
    torso.scale.set(1.6, 1.3, 1.4);
    torso.position.y = 1.4;
    group.add(torso);

    // core inside torso
    const torsoCore = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.0, 0),
        coreMat
    );
    torsoCore.position.y = 1.4;
    group.add(torsoCore);

    // ======================================================
    // BACK SPIKES
    // ======================================================
    for (let i = 0; i < 4; i++) {
        const spike = new THREE.Mesh(
            new THREE.ConeGeometry(0.4, 1.3, 6),
            crystalMat
        );

        spike.position.set(
            Math.sin(i * 1.2) * 1.2,
            2.0 + Math.sin(i * 2) * 0.2,
            -0.3 - i * 0.4
        );

        spike.rotation.x = Math.PI / 1.6;
        group.add(spike);
    }

    // ======================================================
    // LEGS (massive crystal pillars)
    // ======================================================
    const legGeo = new THREE.BoxGeometry(0.9, 1.8, 0.9);

    const legFL = new THREE.Mesh(legGeo, darkMat);
    const legFR = new THREE.Mesh(legGeo, darkMat);
    const legBL = new THREE.Mesh(legGeo, darkMat);
    const legBR = new THREE.Mesh(legGeo, darkMat);

    legFL.position.set(-1.1, 0.0, 0.8);
    legFR.position.set(1.1, 0.0, 0.8);
    legBL.position.set(-1.1, 0.0, -0.8);
    legBR.position.set(1.1, 0.0, -0.8);

    group.add(legFL, legFR, legBL, legBR);

    // claws
    const clawGeo = new THREE.ConeGeometry(0.22, 0.5, 5);

    for (let pair of [
        { x: -1.1, z: 0.9 },
        { x: 1.1, z: 0.9 },
        { x: -1.1, z: -0.9 },
        { x: 1.1, z: -0.9 }
    ]) {
        const claw = new THREE.Mesh(clawGeo, coreMat);
        claw.rotation.x = -Math.PI / 2;
        claw.position.set(pair.x, -0.6, pair.z);
        group.add(claw);
    }

    // ======================================================
    // TAIL (crystal blade)
    // ======================================================
    const tail = new THREE.Mesh(
        new THREE.ConeGeometry(0.4, 1.8, 6),
        crystalMat
    );
    tail.position.set(0, 0.7, -1.8);
    tail.rotation.x = Math.PI * 1.2;
    group.add(tail);

    // ======================================================
    // ANIMATION (heavy crystalline beast)
    // ======================================================
    group.userData.anim = (t) => {

        // beast low breathing
        group.position.y = Math.sin(t * 2) * 0.08;

        // head slight bobbing
        head.position.y = 2.6 + Math.sin(t * 3) * 0.06;
        headCore.position.y = 2.6 + Math.sin(t * 4) * 0.05;

        // jaw open/close light motion
        jawLower.rotation.x = Math.sin(t * 5) * 0.1;
        jawUpper.rotation.x = -Math.sin(t * 5) * 0.05;

        // back spikes sway
        group.children.forEach(child => {
            if (child.geometry instanceof THREE.ConeGeometry && child !== tail) {
                child.rotation.z = Math.sin(t * 2.5) * 0.08;
            }
        });

        // legs shift weight
        legFL.rotation.x = Math.sin(t * 1.3) * 0.1;
        legFR.rotation.x = -Math.sin(t * 1.4) * 0.1;
        legBL.rotation.x = -Math.sin(t * 1.2) * 0.1;
        legBR.rotation.x = Math.sin(t * 1.5) * 0.1;

        // tail sway
        tail.rotation.z = Math.sin(t * 1.8) * 0.12;

        // torso core pulsing
        torsoCore.scale.setScalar(1.0 + Math.sin(t * 4) * 0.08);
    };

    group.scale.set(2.4, 2.4, 2.4);
    return group;
}

// =======================================================
// ENEMY TYPE TABLE
// =======================================================

const enemyTable = [
    { name: "slime", hp: 14, dmg: 5, speed: 0.05, model: createSlime },
    { name: "skeleton", hp: 16, dmg: 6, speed: 0.048, model: createSkeleton },
    { name: "imp", hp: 20, dmg: 8, speed: 0.06, model: createImp },

    // TIER 2
    { name: "wolf", hp: 26, dmg: 11, speed: 0.075, model: createWolf },
    { name: "mage", hp: 30, dmg: 14, speed: 0.045, model: createMage },
    { name: "archer", hp: 24, dmg: 9, speed: 0.055, model: createSkeletonArcher },

    // TIER 3
    { name: "golem", hp: 55, dmg: 20, speed: 0.035, model: createGolem },
    { name: "crystal", hp: 40, dmg: 18, speed: 0.052, model: createCrystal },
];

// =======================================================
// SPAWN ENEMY
// =======================================================
// SISTEMA DE PROBABILIDADES POR TIER
function pickEnemyWeighted() {
    const weighted = [];

    for (const t of enemyTable) {
        let w = 1;

        // TIER DEFINIDO POR NOMBRE:
        if (t.name === "slime" || t.name === "skeleton" || t.name === "imp") {
            w = 70; // TIER 1 - muy comunes
        }
        else if (t.name === "wolf" || t.name === "mage" || t.name === "archer") {
            w = 25; // TIER 2 - poco frecuentes
        }
        else if (t.name === "golem" || t.name === "crystal") {
            w = 5;  // TIER 3 - muy raros
        }

        weighted.push({ type: t, weight: w });
    }

    const total = weighted.reduce((s, w) => s + w.weight, 0);
    let r = Math.random() * total;

    for (const w of weighted) {
        if (r < w.weight) return w.type;
        r -= w.weight;
    }
    return weighted[0].type;
}
export function spawnEnemy(isElite = false) {

    const t = pickEnemyWeighted();

    const mesh = t.model();
    mesh.castShadow = true;

    // Elite upgrade
    if (isElite) {

        mesh.scale.multiplyScalar(1.4);

        mesh.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.emissive = new THREE.Color(0xff5500);
                child.material.emissiveIntensity = 0.7;
            }
        });
    }

    // Spawn around the player
    const ang = Math.random() * Math.PI * 2;
    const dist = 26 + Math.random() * 12;

    const x = player.x + Math.cos(ang) * dist;
    const z = player.z + Math.sin(ang) * dist;

    mesh.position.set(x, 1, z);
    groups.enemies.add(mesh);

    // BASE STATS
    let hp = t.hp;
    let dmg = t.dmg;
    let spd = t.speed;

    // SOULSTONE SCALING
    const L = player.level;
    hp *= 1 + L * 0.09;
    dmg *= 1 + L * 0.065;
    spd *= 1 + L * 0.012;

    if (isElite) {
        hp *= 2.5;
        dmg *= 1.4;
        spd *= 1.2;
    }

    const e = {
        mesh,
        x,
        z,
        vx: 0,
        vz: 0,
        hp,
        maxHp: hp,
        damage: dmg,
        speed: spd,
        hitCooldown: 0,
        elite: isElite,
    };

    enemies.push(e);
    return e;
}

// =======================================================
// UPDATE ENEMIES
// =======================================================
export function updateEnemies(dt) {

    const time = performance.now() * 0.001;

    for (let i = enemies.length - 1; i >= 0; i--) {

        const e = enemies[i];
        const m = e.mesh;

        // Animación idle/hover propia del modelo
        if (m.userData.anim) m.userData.anim(time);

        // dirección hacia el player
        const dx = player.x - e.x;
        const dz = player.z - e.z;
        const dist = Math.hypot(dx, dz);

        // evitar división por cero
        if (dist < 0.001) continue;

        // normalizar
        const nx = dx / dist;
        const nz = dz / dist;

        // velocidad REAL del frame
        const vel = e.speed * (dt * 60);

        // guardar velocidad REAL para locomotion
        e.vx = nx * vel;
        e.vz = nz * vel;

        // movimiento real
        e.x += e.vx;
        e.z += e.vz;

        // aplicar posición
        m.position.set(e.x, 1, e.z);

        // LOCOMOCIÓN PREMIUM (usa vel real)
        applyWalkCycle(
            m,
            time,
            vel,     // velocidad real
            e.vx,
            e.vz
        );
        if (e.mesh.userData.type === "mage") {

            if (!e.attackCooldown) e.attackCooldown = 0;

            e.attackCooldown -= dt;

            // rango de ataque
            if (dist < 30 && e.attackCooldown <= 0) {

                const angle = Math.atan2(dz, dx);
                spawnMageProjectile(e.x, e.z, angle, e.damage);

                Audio.play("bossShoot"); // o crea un sonido exclusivo "mageShoot"

                e.attackCooldown = 4.2; // cada 2.2s dispara
            }
        }
        // COLISIÓN CON PLAYER
        if (dist < 1.4 && e.hitCooldown <= 0) {
            damagePlayer(player, e.damage);
            createImpactVisual(player.x, player.z);
            Audio.play("hit");
            e.hitCooldown = 0.6;
        }

        if (e.hitCooldown > 0) e.hitCooldown -= dt;

        // MUERTE
        if (e.hp <= 0) {
            groups.enemies.remove(m);
            enemies.splice(i, 1);
            spawnGem(e.x, e.z);
        }
    }
}


// =======================================================
// DAMAGE FROM PLAYER/BULLETS
// =======================================================

export function damageEnemy(e, amount) {
    e.hp -= amount;
    floatingDamage(e.x, e.z, Math.floor(amount));
}

// =======================================================
// RESET SYSTEM
// =======================================================

export function resetEnemies() {
    for (let e of enemies) {
        groups.enemies.remove(e.mesh);
    }
    enemies.length = 0;
}
export function updateMageProjectiles(dt) {
    for (let i = mageProjectiles.length - 1; i >= 0; i--) {
        const p = mageProjectiles[i];
        p.x += p.vx * (dt * 60);
        p.z += p.vz * (dt * 60);
        p.mesh.position.set(p.x, 1.4, p.z);

        // Hit player
        const dx = player.x - p.x;
        const dz = player.z - p.z;
        if (dx*dx + dz*dz < 1.3) {
            damagePlayer(player, p.damage);
            createImpactVisual(p.x, p.z);
            groups.bullets.remove(p.mesh);
            mageProjectiles.splice(i, 1);
            continue;
        }

        // Lifetime
        p.life--;
        if (p.life <= 0) {
            groups.bullets.remove(p.mesh);
            mageProjectiles.splice(i, 1);
        }
    }
}
