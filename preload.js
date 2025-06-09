// preload.js
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
    getStatistics: () => ipcRenderer.invoke('admin:get-stats')
});