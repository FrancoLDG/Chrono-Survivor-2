// =======================================================
// controls.js — Input unificado (WASD + joystick + follow cam)
// =======================================================
import * as THREE from "three";
import * as core from "./core.js";
import { getPaused } from "./core.js";
let isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Estado de teclas
const keys = { w: false, a: false, s: false, d: false };

// Estado joystick móvil
let joyActive = false;
let joyStartX = 0;
let joyStartY = 0;
let joyCurrentX = 0;
let joyCurrentY = 0;
let joyBase = null;
let joyStick = null;

// Fuerza final del joystick normalizada
let joyX = 0;
let joyZ = 0;

// =======================================================
// EVENTOS DE TECLADO
// =======================================================
if (!isMobile) {
    window.addEventListener("keydown", (e) => {
        const k = e.key.toLowerCase();
        if (k === "w") keys.w = true;
        if (k === "a") keys.a = true;
        if (k === "s") keys.s = true;
        if (k === "d") keys.d = true;
    });

    window.addEventListener("keyup", (e) => {
        const k = e.key.toLowerCase();
        if (k === "w") keys.w = false;
        if (k === "a") keys.a = false;
        if (k === "s") keys.s = false;
        if (k === "d") keys.d = false;
    });
}

// =======================================================
// JOYSTICK MÓVIL
// =======================================================
export function initJoystick() {
    if (!isMobile) return;

    joyBase = document.createElement("div");
    joyStick = document.createElement("div");

    joyBase.style.position = "absolute";
    joyBase.style.left = "80px";
    joyBase.style.bottom = "80px";
    joyBase.style.width = "140px";
    joyBase.style.height = "140px";
    joyBase.style.borderRadius = "50%";
    joyBase.style.background = "rgba(255,255,255,0.08)";
    joyBase.style.border = "2px solid rgba(255,255,255,0.25)";
    joyBase.style.touchAction = "none";
    joyBase.style.zIndex = "20";

    joyStick.style.position = "absolute";
    joyStick.style.width = "70px";
    joyStick.style.height = "70px";
    joyStick.style.borderRadius = "50%";
    joyStick.style.transform = "translate(35px, 35px)";
    joyStick.style.background = "rgba(255,255,255,0.25)";
    joyStick.style.zIndex = "21";

    joyBase.appendChild(joyStick);
    document.body.appendChild(joyBase);

    joyBase.addEventListener("touchstart", joyStart, { passive: false });
    joyBase.addEventListener("touchmove", joyMove, { passive: false });
    joyBase.addEventListener("touchend", joyEnd, { passive: false });
}

function joyStart(e) {
    e.preventDefault();
    joyActive = true;
    const t = e.touches[0];
    joyStartX = t.clientX;
    joyStartY = t.clientY;
}

function joyMove(e) {
    e.preventDefault();
    if (!joyActive) return;

    const t = e.touches[0];
    const dx = t.clientX - joyStartX;
    const dy = t.clientY - joyStartY;

    const max = 50;
    const d = Math.hypot(dx, dy);
    const clamped = d > max ? max : d;

    let nx = (dx / (d || 1)) * clamped;
    let nz = (dy / (d || 1)) * clamped;

    joyStick.style.transform = `translate(${35 + nx}px, ${35 + nz}px)`;

    joyX = nx / max;
    joyZ = nz / max;
}

function joyEnd() {
    joyActive = false;
    joyX = 0;
    joyZ = 0;
    joyStick.style.transform = "translate(35px, 35px)";
}

// =======================================================
// UPDATE CONTROLS FINAL (con follow cam)
// =======================================================
export function updateControls(camera, player) {
    if (getPaused()) return { x: 0, z: 0 };
    let ix = 0;
    let iz = 0;

    // WASD
    if (keys.w) iz -= 1;
    if (keys.s) iz += 1;
    if (keys.a) ix -= 1;
    if (keys.d) ix += 1;

    // Joystick móvil
    ix += joyX;
    iz += joyZ;

    // Normalizar
    const len = Math.hypot(ix, iz);
    if (len > 0) {
        ix /= len;
        iz /= len;
    }

    // Movimiento relativo a la orientación del mapa (TU SISTEMA)
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);

    const forwardX = camDir.x;
    const forwardZ = camDir.z;
    const rightX = camDir.z;
    const rightZ = -camDir.x;

    const moveX = forwardX * -iz + rightX * -ix;
    const moveZ = forwardZ * -iz + rightZ * -ix;

    // =======================================================
    // CAMERA FOLLOW PERFECTA
    // =======================================================
    camera.position.x = player.x + 20;
    camera.position.z = player.z + 20;
    camera.lookAt(player.x, 0, player.z);

    return { x: moveX, z: moveZ };
}

// Utilidad
export function isMoving() {
    return Math.abs(joyX) > 0.01 || Math.abs(joyZ) > 0.01 ||
           keys.w || keys.a || keys.s || keys.d;
}
