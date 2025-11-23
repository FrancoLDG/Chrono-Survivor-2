// =======================================================
// audio.js — Sistema de sonido modular (versión optimizada)
// =======================================================

// Banco de sonidos precargados
const sounds = {};

// Configuración persistente
let settings = {
    volume: 1,
    music: 1,
    sfx: 1
};

// Anti-spam impactos
let lastHit = 0;

// =======================================================
// 1) CARGAR CONFIGURACIÓN
// =======================================================

(function loadSettings() {
    try {
        const saved = localStorage.getItem("audio_settings");
        if (saved) Object.assign(settings, JSON.parse(saved));
    } catch (e) {
        console.warn("Audio settings corruptos, reseteando.");
    }
})();

function saveSettings() {
    try {
        localStorage.setItem("audio_settings", JSON.stringify(settings));
    } catch (e) {}
}

// =======================================================
// 2) SISTEMA DE CARGA
// =======================================================

export function initAudio() {
    loadSound("hit", "hitHurt.wav", 0.7);
    loadSound("xp", "retro-coin-4-236671.mp3", 0.7);
    loadSound("levelup", "powerUp.wav", 1.0);
    loadSound("bossLaugh", "risaboss.mp3", 1.0);

    // Música
    loadSound("music", "Pixelated Carnage.mp3", 0.35, true);
}

function loadSound(name, file, volume = 1, loop = false) {
    const audio = new Audio(file);
    audio.baseVolume = volume;
    audio.loop = loop;
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";

    // iOS fix: loop sometimes ignored
    audio.onended = () => {
        if (audio.loop) {
            audio.currentTime = 0;
            audio.play().catch(()=>{});
        }
    };

    sounds[name] = audio;
}

// =======================================================
// 3) REPRODUCIR SFX
// =======================================================

export function play(name) {
    const s = sounds[name];
    if (!s) return;

    // Anti-spam para impacto
    if (name === "hit") {
        const now = Date.now();
        if (now - lastHit < 70) return;
        lastHit = now;
    }

    // Volumen final combinado
    s.volume = (s.baseVolume || 1) * settings.volume * settings.sfx;

    try {
        s.currentTime = 0;
        s.play();
    } catch (e) {
        // Sonido bloqueado hasta interacción: común en Chrome/iOS
    }
}

// =======================================================
// 4) MÚSICA
// =======================================================

export function playMusic() {
    const m = sounds["music"];
    if (!m) return;

    m.volume = m.baseVolume * settings.volume * settings.music;

    try {
        m.play();
    } catch (e) {
        console.warn("Reproducción bloqueada hasta interacción del usuario.");
    }
}

export function stopMusic() {
    const m = sounds["music"];
    if (m) m.pause();
}

// =======================================================
// 5) VOLUMEN
// =======================================================

export function setGlobalVolume(v) {
    settings.volume = v;
    saveSettings();
    updateMusicVolume();
}

export function setMusicVolume(v) {
    settings.music = v;
    saveSettings();
    updateMusicVolume();
}

export function setSfxVolume(v) {
    settings.sfx = v;
    saveSettings();
}

function updateMusicVolume() {
    const m = sounds["music"];
    if (m) {
        m.volume = m.baseVolume * settings.volume * settings.music;
    }
}

// =======================================================
// 6) API GET
// =======================================================

export function getVolume() {
    return settings.volume;
}

export function getSettings() {
    return settings;
}

// =======================================================
// 7) EXTRAS — FADES (Opcionales)
// =======================================================

export function fadeMusicIn(duration = 1.2) {
    const m = sounds["music"];
    if (!m) return;

    m.volume = 0;
    playMusic();

    const target = m.baseVolume * settings.volume * settings.music;
    const steps = 24;
    let step = 0;

    const interval = setInterval(() => {
        step++;
        m.volume = (target * step) / steps;
        if (step >= steps) clearInterval(interval);
    }, (duration * 1000) / steps);
}

export function fadeMusicOut(duration = 1.2) {
    const m = sounds["music"];
    if (!m) return;

    const start = m.volume;
    const steps = 24;
    let step = 0;

    const interval = setInterval(() => {
        step++;
        m.volume = start * (1 - step / steps);
        if (step >= steps) {
            clearInterval(interval);
            m.pause();
        }
    }, (duration * 1000) / steps);
}
