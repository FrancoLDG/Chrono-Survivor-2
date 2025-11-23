// =======================================================
// core.js — Soulstone Survivors Engine (Lowpoly Edition)
// =======================================================

import * as THREE from "three";
import * as Audio from "./audio.js";
import { updateGems } from "./entities/drops.js";
import { initWorld } from "./world.js";
import { createPlayer, updatePlayer } from "./entities/player.js";
import { updateEnemies, spawnEnemy } from "./entities/enemies.js";
import { updateMiniBosses, spawnMiniBoss } from "./entities/miniboss.js";
import { updateBullets } from "./entities/bullets.js";
import { spawnBoss, updateBoss, updateBossProjectiles, BossState } from "./entities/boss.js";
import { updateFX } from "./entities/particles_fx.js";
import { createFloor } from "./world.js";
import { updateControls } from "./controls.js";
import * as UI from "./ui.js";
import { performAttack as handleAttack } from "./attack_system.js";
import { updateMageProjectiles } from "./entities/enemies.js";
export let player = null;

// GLOBAL STATE
export let frameCount = 0;
export let scene, camera, renderer;
export let isGameActive = false;
let _isGamePaused = false;

export function getPaused() { return _isGamePaused; }
export function setPaused(v) { _isGamePaused = v; }

export let core_spawnedBossPending = false;
let nextEnemySpawn = 0;
let nextEliteSpawn = 0;
let nextMiniBoss = 1200;
let nextHorde = 600;
let nextBossLevel = 10;
export let activeBoss = null;

const clock = new THREE.Clock();

let aspect;
const WORLD_SIZE = 24;

// =======================================================
// THREE INIT
// =======================================================
function initThree() {

    scene = new THREE.Scene();
    const bg = 0x110b15;
    scene.background = new THREE.Color(bg);
    scene.fog = new THREE.Fog(bg, 25, 80);

    aspect = window.innerWidth / window.innerHeight;

    camera = new THREE.OrthographicCamera(
        -WORLD_SIZE * aspect,
        WORLD_SIZE * aspect,
        WORLD_SIZE,
        -WORLD_SIZE,
        1,
        1000
    );

    camera.position.set(20, 25, 20);
    camera.lookAt(0, 0, 0);

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    renderer = new THREE.WebGLRenderer({
        antialias: !isMobile,
        powerPreference: "high-performance"
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));

    renderer.shadowMap.enabled = !isMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(15, 30, 10);
    dir.castShadow = !isMobile;
    scene.add(dir);
}

// =======================================================
// SPAWN CURVE — Soulstone Survivors Balanced
// =======================================================

function getSpawnCount(lvl) {

    if (lvl <= 3) return 1 + Math.floor(lvl * 0.3);
    if (lvl <= 7) return 2 + Math.floor((lvl - 3) * 0.5);
    if (lvl <= 12) return 4 + Math.floor((lvl - 7) * 0.8);
    if (lvl <= 18) return 8 + Math.floor((lvl - 12) * 1.2);
    if (lvl <= 25) return 15 + Math.floor((lvl - 18) * 1.6);
    if (lvl <= 35) return 26 + Math.floor((lvl - 25) * 2.2);

    return 48 + Math.floor((lvl - 35) * 3.0); // late-game caos
}

function spawnWave() {

    const lvl = player.level;

    const baseRate = 40;
    const rate = Math.max(12, baseRate - lvl * 1.2);
    nextEnemySpawn = frameCount + rate;

    const count = getSpawnCount(lvl);

    for (let i = 0; i < count; i++) spawnEnemy();
}

// =======================================================
// ELITE SYSTEM
// =======================================================

function spawnEliteEnemies() {

    const lvl = player.level;
    const chance = Math.min(0.02 + lvl * 0.002, 0.22);

    if (Math.random() < chance) {
        const n = 1 + Math.floor(lvl / 15);
        for (let i = 0; i < n; i++) spawnEnemy(true);
    }

    nextEliteSpawn = frameCount + 380 + Math.floor(Math.random() * 180);
}

// =======================================================
// HORDE EVENTS
// =======================================================

function spawnHorde() {
    const lvl = player.level;
    const amount = Math.floor(getSpawnCount(lvl) * 1.5);

    for (let i = 0; i < amount; i++) spawnEnemy();
    nextHorde = frameCount + 550 + Math.floor(Math.random() * 200);
}

// =======================================================
// GAME LOOP
// =======================================================

function gameLoop() {
    requestAnimationFrame(gameLoop);

    const dt = clock.getDelta();
    updateFX(dt);

    if (!isGameActive) return;

    if (getPaused()) {
        renderer.render(scene, camera);
        return;
    }

    frameCount++;

    const { x: mx, z: mz } = updateControls(camera, player);
    updatePlayer(player, dt, mx, mz);
    handleAttack(player);

    updateBullets(dt);
    updateEnemies(dt);
    updateMageProjectiles(dt);
    updateGems(player, frameCount);
    updateMiniBosses(dt);

    updateBoss(dt);
    updateBossProjectiles(dt);

    UI.updateHud(player);
    UI.updateStatsHUD(player);

    // Enemy wave spawn
    if (!BossState.boss && frameCount > nextEnemySpawn) {
        spawnWave();
    }

    // Elite spawns
    if (!BossState.boss && frameCount > nextEliteSpawn) {
        spawnEliteEnemies();
    }

    // Horde events
    if (!BossState.boss && frameCount > nextHorde) {
        spawnHorde();
    }

    // MiniBoss spawn
    if (!BossState.boss && frameCount > nextMiniBoss) {
        nextMiniBoss = frameCount + 900 + Math.floor(Math.random() * 800);
        spawnMiniBoss();
    }

    // Boss spawn at each milestone (10, 20, 30…)
    if (!BossState.boss && player.level >= nextBossLevel) {
        activeBoss = spawnBoss();
        nextBossLevel += 10;
        core_spawnedBossPending = true;
    }

    renderer.render(scene, camera);
}

export function endBossFight() {
    BossState.boss = null;
}
export let killCount = 0;

export function addKill() {
    killCount++;
    if (UI && UI.updateKillCounter) {
        UI.updateKillCounter(killCount);
    }
}
// =======================================================
// START GAME
// =======================================================

export function startGame(classType) {

    if (isGameActive) return;

    UI.hideStart();
    isGameActive = true;

    player = createPlayer(classType);
    scene.add(player.mesh);
    scene.add(player.auraRing);

    UI.setSkillIcon(classType);
    UI.updateHud(player);

    Audio.playMusic();
    gameLoop();
}

// =======================================================
// PAUSE
// =======================================================

export function togglePause() {
    if (!isGameActive) return;

    setPaused(!getPaused());
    if (getPaused()) UI.showPause();
    else UI.hidePause();
}

// =======================================================
// INIT
// =======================================================

function init() {
    initThree();
    initWorld(scene);
    createFloor();
    UI.initUIEvents(startGame, togglePause);
}

export function stopGame() {
    isGameActive = false;
}

init();
