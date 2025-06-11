// preload.js - Version corrigée
const { contextBridge, ipcRenderer } = require('electron');

// Exposer les APIs sécurisées au renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // Authentification
    login: (username, password) => ipcRenderer.invoke('auth:login', { username, password }),
    register: (username, password) => ipcRenderer.invoke('auth:register', { username, password }),
    logout: () => ipcRenderer.invoke('auth:logout'),
    checkAuthToken: () => ipcRenderer.invoke('auth:check-token'),

    // Labyrinthes
    getUserLabyrinths: (userId) => ipcRenderer.invoke('labyrinth:get-user', userId),
    createLabyrinth: (data) => ipcRenderer.invoke('labyrinth:create', data),
    updateLabyrinth: (id, data) => ipcRenderer.invoke('labyrinth:update', { id, data }),
    deleteLabyrinth: (id) => ipcRenderer.invoke('labyrinth:delete', id),
    generateLabyrinth: (options) => ipcRenderer.invoke('labyrinth:generate', options),
    solveLabyrinth: (id) => ipcRenderer.invoke('labyrinth:solve', id),

    // Administration
    getAllUsers: () => ipcRenderer.invoke('admin:get-users'),
    getAllLabyrinths: () => ipcRenderer.invoke('admin:get-labyrinths'),
    deleteUser: (userId) => ipcRenderer.invoke('admin:delete-user', userId),
    deleteAdminLabyrinth: (labyrinthId) => ipcRenderer.invoke('admin:delete-labyrinth', labyrinthId), // ← AJOUTÉ
    getStatistics: () => ipcRenderer.invoke('admin:get-stats'),
    
    // Fonctions de test temporaires
    testCheckLabyrinth: (id) => ipcRenderer.invoke('test:check-labyrinth', id), // ← AJOUTÉ pour test
    
    // Fonction générique invoke pour les tests
    invoke: (channel, data) => ipcRenderer.invoke(channel, data) // ← AJOUTÉ pour flexibilité
});