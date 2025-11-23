// =======================================================
// ui.js — Sistema de UI (HUD + Menús + Boss UI)
// =======================================================

import { BossState } from "./entities/boss.js";
import * as core from "./core.js";
import { showBossUI, showBossDialogue } from "./entities/boss.js";



// =======================================================
// REFERENCIAS A ELEMENTOS DEL DOM
// =======================================================

const startScreen        = document.getElementById("start-screen");
const uiLayer            = document.getElementById("ui-layer");

const hpFill             = document.getElementById("hp-bar-fill");
const hpText             = document.getElementById("hp-text");

const xpFill             = document.getElementById("xp-bar-fill");
const levelDisplay       = document.getElementById("level-display");

const killCountDisplay   = document.getElementById("kill-count");

const pauseBtn           = document.getElementById("pause-btn");
const pauseScreen        = document.getElementById("pause-screen");
const resumeBtn          = document.getElementById("resume-btn");

const skillButton        = document.getElementById("skill-button");
const skillIcon          = document.getElementById("skill-icon");
const skillCooldownBar   = document.getElementById("skill-cooldown");

const upgradeScreen      = document.getElementById("upgrade-screen");
const cardsContainer     = document.getElementById("cards-container");

const bossContainer      = document.getElementById("boss-container");
const bossName           = document.getElementById("boss-name");
const bossHPFill         = document.getElementById("boss-hp-fill");
const bossPowersList     = document.getElementById("boss-powers-list");
const bossDialogue       = document.getElementById("boss-dialogue");

// =======================================================
// INICIALIZACIÓN DE EVENTOS
// =======================================================

export function initUIEvents(startGameFn, pauseFn) {

    // START
    startScreen.addEventListener("click", () => {
        startScreen.style.display = "none";
        uiLayer.style.display = "block";
    });

    // PAUSA
    pauseBtn.addEventListener("click", () => pauseFn());
    resumeBtn.addEventListener("click", () => pauseFn());
}

// =======================================================
// HUD DEL JUGADOR
// =======================================================

export function updateHud(player) {

    // HP
    hpFill.style.width = `${(player.hp / player.maxHp) * 100}%`;
    hpText.textContent = `${Math.floor(player.hp)}/${player.maxHp}`;

    // XP
    xpFill.style.width = `${(player.xp / player.nextLevelXP) * 100}%`;

    // Nivel
    levelDisplay.textContent = player.level;
    killCountDisplay.textContent = core.killCount;
    // parpadeo de pantalla baja de HP
    const body = document.body;
    if (player.hp / player.maxHp < 0.2)
        body.classList.add("low-hp-alert");
    else
        body.classList.remove("low-hp-alert");

    // Pulso al subir de nivel
    if (!updateHud.lastLevel) updateHud.lastLevel = player.level;
    if (player.level !== updateHud.lastLevel) {
        levelDisplay.classList.add("level-up-pulse");
        setTimeout(() => levelDisplay.classList.remove("level-up-pulse"), 600);
        updateHud.lastLevel = player.level;
    }
}

// =======================================================
// START SCREEN
// =======================================================

export function hideStart() {
    startScreen.style.display = "none";
    uiLayer.style.display = "block";
}

// =======================================================
// SKILLS HUD
// =======================================================

export function setSkillIcon(classType) {
    if (classType === "ranger") skillIcon.src = "img/skill_ranger.png";
    if (classType === "mage")   skillIcon.src = "img/skill_mage.png";
    if (classType === "knight") skillIcon.src = "img/skill_knight.png";
}

export function showSkillCooldown(frames) {

    let total = frames;
    let current = frames;

    const tick = () => {
        current--;

        const ratio = current / total;
        skillCooldownBar.style.height = `${ratio * 100}%`;

        if (current > 0) {
            requestAnimationFrame(tick);
        } else {
            skillCooldownBar.style.height = "0%";
        }
    };

    tick();
}

// =======================================================
// LEVEL UP MENU
// =======================================================

export function showUpgradeMenu(options, onSelect) {
    upgradeScreen.style.display = "flex";
    cardsContainer.innerHTML = "";

    options.forEach(skill => {
        const wrapper = document.createElement("div");
        wrapper.className = "card-wrapper";

        const card = document.createElement("div");
        card.className = "card";

        // Asignar rareza visual
        if (skill.rarity) {
            card.classList.add(skill.rarity);
        } else if (skill.id.startsWith("a_")) {
            card.classList.add("aura");
        } else {
            card.classList.add("common");
        }

        // Contenido
        card.innerHTML = `
            <h3>${skill.icon} ${skill.name}</h3>
            <p>${skill.desc}</p>
        `;

        // Evento
        card.onclick = () => onSelect(skill);

        // ARMADO DEL ELEMENTO
        wrapper.appendChild(card);
        cardsContainer.appendChild(wrapper);   // <--- 🔥 FALTABA ESTO
    });

}

export function hideUpgradeMenu() {
    upgradeScreen.style.display = "none";
    core.setPaused(false);

    // SI hay un jefe activo → mostrar HUD siempre.
    if (BossState.boss) {
        showBossUI(BossState.boss);
        showBossDialogue("¡ENFRENTA TU DESTINO!");
        core.core_spawnedBossPending = false; // 🔥 muy importante
    }
}
export function isUpgradeMenuOpen() {
    return upgradeScreen.style.display === "flex";
}
// =======================================================
// PAUSA
// =======================================================

export function showPause() {
    pauseScreen.style.display = "flex";
}

export function hidePause() {
    pauseScreen.style.display = "none";
}

// =======================================================
// GAME OVER
// =======================================================

export function showGameOver(player) {
    const over = document.getElementById("game-over-screen");
    const lvl  = document.getElementById("final-level");

    lvl.textContent = player.level;
    over.style.display = "flex";
}

// =======================================================
// BOSS UI
// =======================================================




export function updateBossUI() {
    if (!BossState.boss) return;

    const boss = BossState.boss;
    const ratio = boss.hp / boss.maxHp;

    bossHPFill.style.width = `${ratio * 100}%`;
}

export function updateSkillsHUD(skills) {
    const panel = document.getElementById("skills-hud");
    panel.innerHTML = "";

    for (const id in skills) {
        const entry = skills[id];
        const skill = entry.data;

        const div = document.createElement("div");
        div.className = "skill-entry";

        div.innerHTML = `
            <span>${skill.icon} ${skill.name}</span>
            <span>Lv ${entry.level}</span>
        `;

        panel.appendChild(div);
    }
}
export function updateStatsHUD(player) {
    const panel = document.getElementById("stats-hud");
    panel.innerHTML = `
        <div class="stat-line"><span>❤️ HP</span><span>${Math.floor(player.hp)}/${player.maxHp}</span></div>
        <div class="stat-line"><span>⚔️ Daño</span><span>${(player.damage * player.damageMult).toFixed(1)}</span></div>
        <div class="stat-line"><span>👟 Velocidad</span><span>${player.baseSpeed.toFixed(2)}</span></div>
        <div class="stat-line"><span>⏱️ Cadencia</span><span>${player.fireRate.toFixed(1)}</span></div>
        <div class="stat-line"><span>🎯 Crítico</span><span>${(player.critChance * 100).toFixed(0)}%</span></div>
        <div class="stat-line"><span>💥 Crit DMG</span><span>${player.critMult.toFixed(2)}x</span></div>
        <div class="stat-line"><span>🔄 Encadena</span><span>${player.chain || 1}</span></div>
        <div class="stat-line"><span>🧲 Pickup</span><span>${player.pickupRange.toFixed(1)}</span></div>
    `;
}
export function updateXPBar(player) {
    const fill = document.getElementById("xp-bar-fill");
    const pct = (player.xp / player.nextLevelXP) * 100;
    fill.style.width = pct + "%";
}