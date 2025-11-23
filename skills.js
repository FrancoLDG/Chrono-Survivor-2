// =======================================================
// skills.js — EXPANDIDO + REBALANCEADO + AURAS AVANZADAS
// =======================================================

import { spawnBullet } from "./entities/bullets.js";
import { performAttack as attackSystemPerform } from "./attack_system.js";
import * as core from "./core.js";
import * as UI from "./ui.js";
import * as Audio from "./audio.js";
import { createExplosion } from "./entities/particles_fx.js";


// =======================================================
// HARD CAPS GLOBALES
// =======================================================

const CAPS = {
    maxCritChance: 0.60,
    maxCritMult: 3.0,
    maxDoubleShot: 0.30,
    maxMultishot: 3,
    maxSideShots: 2,
    minFireRate: 12, // fireRate se interpreta como frames entre disparos
};


// =======================================================
// 1) POOLS DE HABILIDADES — COMPLETO
// =======================================================

// -------------------------------------------------------
// *** COMMON POOL (BASE + 15 NUEVAS)
// -------------------------------------------------------

export const COMMON_POOL = [

    // ======== Comunes originales rebalanceadas ========

    { id: "hp_up", name: "Vitalidad", icon: "❤️", desc: "+10 HP",
      apply(p){ p.maxHp += 10; p.hp += 10; } },

    { id: "regen", name: "Regeneración", icon: "🩸", desc: "+2 HP/5s",
      apply(p){ p.regen += (2/300)*60; } },

    { id: "dmg_up", name: "Daño", icon: "⚔️", desc: "+5% daño",
      apply(p){ p.damageMult += 0.05; } },

    { id: "movespeed", name: "Velocidad", icon: "👟", desc: "+0.04 vel.",
      apply(p){ p.baseSpeed += 0.04; } },

    { id: "firerate", name: "Cadencia", icon: "⏱️", desc: "Dispara más rápido",
      apply(p){ p.fireRate = Math.max(CAPS.minFireRate, p.fireRate - 3); } },

    { id: "pickup", name: "Atraer Ítems", icon: "🧲", desc: "+20% rango xp",
      apply(p){ p.pickupRange *= 1.20; p.magnetPower += 0.03; } },

    // ======== 15 NUEVAS COMUNES ========

    { id: "endurance", name: "Resistencia", icon: "🛡️", desc: "+5% RED",
      apply(p){ p.damageReduction = Math.min((p.damageReduction||0)+0.05, 0.30); }},

    { id: "focus", name: "Precisión", icon: "🎯", desc: "+4% crit dmg",
      apply(p){ p.critMult = Math.min(p.critMult + 0.04, CAPS.maxCritMult); }},

    { id: "warmup", name: "Calentamiento", icon: "🔥", desc: "+2% APS",
      apply(p){ p.fireRate = Math.max(CAPS.minFireRate, p.fireRate - 1); }},

    { id: "conditioning", name: "Condición Física", icon: "💪", desc: "+15 HP",
      apply(p){ p.maxHp += 15; p.hp += 15; }},

    { id: "fleet", name: "Ligereza", icon: "🦶", desc: "+3% velocidad",
      apply(p){ p.baseSpeed += 0.025; }},

    { id: "steady", name: "Estabilidad", icon: "🧿", desc: "- recoil (futuro)",
      apply(p){ p.stability = true; }},

    { id: "gathering", name: "Recolector", icon: "🧲+", desc: "+10% pickup speed",
      apply(p){ p.magnetPower += 0.015; }},

    { id: "hardened", name: "Piel Dura", icon: "🐢", desc: "+8 ARMOR",
      apply(p){ p.armor = (p.armor||0) + 8; }},

    { id: "willpower", name: "Voluntad", icon: "🔮", desc: "+1 regen",
      apply(p){ p.regen += 1/60; }},

    { id: "discipline", name: "Disciplina", icon: "📘", desc: "-5% cooldown skill",
      apply(p){ p.skillCDR = (p.skillCDR||0) + 0.05; }},

    { id: "agile", name: "Manos Ágiles", icon: "✋", desc: "+7% velocidad bala",
      apply(p){ p.bulletSpeed = (p.bulletSpeed||1.15) * 1.07; }},

    { id: "heartbeat", name: "Último Aliento", icon: "💓", desc: "Regen x2 <30% HP",
      apply(p){ p.lowHpRegen = true; }},

    { id: "spirit", name: "Espíritu", icon: "👻", desc: "+15 xp ganado",
      apply(p){ p.xpBonus = (p.xpBonus||0)+15; }},

    { id: "reflex", name: "Reflejos", icon: "⚡", desc: "+5% dodge",
      apply(p){ p.dodge = Math.min((p.dodge||0)+0.05,0.40); }},

    { id: "insight", name: "Conocimiento", icon: "🧠", desc: "+1 nivel skill random",
      apply(p){ p.skillLevelUpRandom = true; }}
];


// -------------------------------------------------------
// *** RARE POOL (BASE + 8 NUEVAS)
// -------------------------------------------------------

export const RARE_POOL = [

    // originales rebalanceadas
    { id: "crit_up", name: "Crítico +10%", icon: "💢", desc: "+10% crit",
      apply(p){ p.critChance = Math.min((p.critChance||0)+0.10, CAPS.maxCritChance); }},

    { id: "crit_dmg", name: "Crit DMG +15%", icon: "💥", desc: "+15% crit dmg",
      apply(p){ p.critMult = Math.min(p.critMult + 0.15, CAPS.maxCritMult); }},

    { id: "multi_shot", name: "Multishot", icon: "✨", desc: "+1 proyectil",
      apply(p){ p.multiShot = Math.min((p.multiShot||0)+1, CAPS.maxMultishot); }},

    { id: "side_shot", name: "Laterales", icon: "➡️", desc: "+1 side shot",
      apply(p){ p.sideShots = Math.min((p.sideShots||0)+1, CAPS.maxSideShots); }},

    { id: "double", name: "Doble Disparo", icon: "🎯", desc: "+6% double-hit",
      apply(p){ p.doubleShot = Math.min((p.doubleShot||0)+0.06, CAPS.maxDoubleShot); }},

    // ======== NUEVAS RARAS ========

    { id: "frostbite", name: "Congelamiento", icon: "❄️🗡️", desc: "Ralentiza 25%",
      apply(p){ p.inflictSlow = 0.25; }},

    { id: "combust", name: "Combustión", icon: "🔥🩹", desc: "Quemadura (2 DPS)",
      apply(p){ p.inflictBurn = 2; }},

    { id: "overcharged", name: "Sobrecarga", icon: "⚡🔋", desc: "+20% daño si no te movés",
      apply(p){ p.stillBoost = true; }},

    { id: "tempo", name: "Tempo", icon: "🎼", desc: "-10 fireRate",
      apply(p){ p.fireRate = Math.max(CAPS.minFireRate, p.fireRate - 10); }},

    { id: "hypersense", name: "Hipersentidos", icon: "👁️⚡", desc: "+15% xp pickup speed",
      apply(p){ p.magnetPower += 0.04; }},

    { id: "steelbones", name: "Huesos de Acero", icon: "🦴🛡️", desc: "+12 armor",
      apply(p){ p.armor = (p.armor||0) + 12; }},

    { id: "echo_edge", name: "Eco Cortante", icon: "🔊⚔️", desc: "+10% eco extra",
      apply(p){ p.echoChanceExtra = (p.echoChanceExtra||0) + 0.10; }},

    { id: "arcane_loop", name: "Bucle Arcano", icon: "🔁✨", desc: "5% reset de ataque",
      apply(p){ p.attackReset = true; }}
];


// -------------------------------------------------------
// *** LEGENDARY POOL (BASE + 5 NUEVAS)
// -------------------------------------------------------

export const LEGENDARY_POOL = [

    // originales rework
    { id: "giga", name: "Gigaproyectil", icon: "🌋",
      desc: "Cada 8 tiros uno gigante 2.5x daño",
      apply(p){ p.gigaShot = true; p._gigaCount = 0; }},

    { id: "echo", name: "Eco Arcano", icon: "🔊",
      desc: "10% chance repetir ataque",
      apply(p){ p.echoShot = true; p.echoChance = 0.10; }},

    { id: "chain_master", name: "Cadena Suprema", icon: "⚡",
      desc: "+1 encadenamiento",
      apply(p){ p.chain = (p.chain||1)+1; }},

    // ======== NUEVAS LEGENDARIAS ========

    { id: "reality_split", name: "Ruptura de Realidad", icon: "🌌✂️",
      desc: "Crea un clon que repite ataques (40% daño)",
      apply(p){ p.realitySplit = true; }},

    { id: "meteor", name: "Meteoro", icon: "☄️",
      desc: "Cada 8s cae un meteorito 300% daño",
      apply(p){ p.meteor = true; p._meteorTimer = 0; }},

    { id: "infinity_pulse", name: "Pulso Infinito", icon: "♾️✨",
      desc: "Ataques emiten ondas expansivas",
      apply(p){ p.infinityPulse = true; }},

    { id: "soul_link", name: "Vínculo de Alma", icon: "🔗👻",
      desc: "20% daño rebota a otro enemigo",
      apply(p){ p.soulLink = true; }},

    { id: "arcane_rift", name: "Grieta Arcana", icon: "🌀💜",
      desc: "Cada 5s emite un estallido mágico",
      apply(p){ p.arcaneRift = true; p._riftTimer = 0; }}
];


// -------------------------------------------------------
// *** AURAS AVANZADAS (SOULSTONE STYLE)
// -------------------------------------------------------

export const AURA_POOL = [
    { id: "a_fire", name: "Aura de Fuego", icon: "🔥",
      apply(p){ addAura(p,"fire"); }},

    { id: "a_ice", name: "Aura de Hielo", icon: "❄️",
      apply(p){ addAura(p,"ice"); }},

    { id: "a_holy", name: "Aura Sagrada", icon: "🌟",
      apply(p){ addAura(p,"holy"); }},

    { id: "a_storm", name: "Aura Tormentosa", icon: "⚡",
      apply(p){ addAura(p,"storm"); }},

    { id: "a_blood", name: "Aura Sangrienta", icon: "🩸",
      apply(p){ addAura(p,"blood"); }},

    { id: "a_gravity", name: "Aura de Gravedad", icon: "🌀",
      apply(p){ addAura(p,"gravity"); }},

    { id: "a_poison", name: "Aura Venenosa", icon: "☠️",
      apply(p){ addAura(p,"poison"); }},
];


// -------------------------------------------------------
// Datos internos de AURAS
// -------------------------------------------------------

const AURAS = {

    fire:   { dmg: 2,   range: 3,   },
    ice:    { dmg: 1.5, range: 3.5, slow: 0.25 },

    holy:   { dmg: 5,   range: 2.8, smite: 0.10 },

    storm:  { dmg: 4,   range: 3.5, shockChance: 0.10 },

    blood:  { dmg: 3,   range: 3,   bleed: 1.5 },

    gravity:{ dmg: 1.5, range: 3.2, slow: 0.30, pull: 0.08 },

    poison: { dmg: 2,   range: 3.2, vuln: 0.10 }
};


// -------------------------------------------------------
// Función: agregar aura
// -------------------------------------------------------

function addAura(player, type){
    if(!player.auras) player.auras = {};

    if(!player.auras[type]){
        player.auras[type] = { ...AURAS[type], level: 1 };
    } else {
        player.auras[type].level++;
        player.auras[type].dmg *= 1.35;
        player.auras[type].range *= 1.12;
    }
}


// =======================================================
// 3) LEVEL UP — UI
// =======================================================

export function showLevelUp(player){

    let pool = [
        ...COMMON_POOL,
        ...RARE_POOL,
        ...AURA_POOL,
        ...LEGENDARY_POOL,
    ];

    const picks = [];
    while(picks.length < 3){
        const s = pool[Math.floor(Math.random()*pool.length)];
        if(!picks.includes(s)) picks.push(s);
    }

    core.setPaused(true);
    UI.showUpgradeMenu(picks, chosen=>{
        applySkill(player, chosen);
        UI.hideUpgradeMenu();
        core.setPaused(false);
    });
}


// =======================================================
// Aplicación del skill
// =======================================================

export function applySkill(player, skill){
    if(!player.skills) player.skills = {};

    if(!player.skills[skill.id]){
        player.skills[skill.id] = { data: skill, level:1 };
    } else {
        player.skills[skill.id].level++;
    }

    if(skill.apply) skill.apply(player);

    UI.updateSkillsHUD(player.skills);
    UI.updateStatsHUD(player);
}


// =======================================================
// ATAQUE + EFECTOS LEGENDARIOS
// =======================================================

export function handleAttack(player){
    attackSystemPerform(player);
    processLegendaryShots(player);
}


// =======================================================
// EFECTOS LEGENDARIOS
// =======================================================

function processLegendaryShots(p){

    // ECO
    if(p.echoShot){
        const chance = p.echoChance + (p.echoChanceExtra||0);
        if(Math.random() < chance){
            setTimeout(()=> attackSystemPerform(p), 150);
        }
    }

    // GIGA
    if(p.gigaShot){
        p._gigaCount++;
        if(p._gigaCount >= 8){
            p._gigaCount = 0;
            const b = spawnBullet(p.mesh.rotation.y);
            b.damage *= 2.5;
            b.mesh.scale.set(1.8,1.8,1.8);
        }
    }

    // METEOR (cooldown)
    if(p.meteor){
        p._meteorTimer++;
        if(p._meteorTimer >= 60*8){
            p._meteorTimer = 0;
            createExplosion(p.x, p.z, 0xff5500);
        }
    }

    // ARCANE RIFT
    if(p.arcaneRift){
        p._riftTimer++;
        if(p._riftTimer >= 60*5){
            p._riftTimer = 0;
            createExplosion(p.x, p.z, 0xaa66ff);
        }
    }
}


// =======================================================
// HABILIDADES ACTIVAS (E)
// =======================================================

export function useClassSkill(p){

    if(p._skillCooldown && p._skillCooldown > 0) return;

    if(p.classType === "ranger") burstRanger(p);
    if(p.classType === "mage")   novaMage(p);
    if(p.classType === "knight") berserkKnight(p);

    let baseCD = 60*20;
    if(p.skillCDR) baseCD *= (1 - p.skillCDR);

    p._skillCooldown = baseCD;
    UI.showSkillCooldown(p._skillCooldown);
}

// RANGER
function burstRanger(p){
    for(let i=0; i<5; i++)
        spawnBullet(p.mesh.rotation.y + i*0.25);
    Audio.play("hit");
}

// MAGE
function novaMage(p){
    createExplosion(p.x, p.z, 0x66aaff);
    Audio.play("levelup");
}

// KNIGHT
function berserkKnight(p){
    p.damageMult *= 1.30;
    p.baseSpeed *= 1.20;

    setTimeout(()=>{
        p.damageMult /= 1.30;
        p.baseSpeed /= 1.20;
    },6000);

    Audio.play("levelup");
}
