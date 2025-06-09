const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Importer les modules backend
const auth = require('./auth');
const db = require('./database');
const Labyrinth = require('./Labyrinth');
const AdminService = require('./admin');

let mainWindow;
let currentUser = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png'), // Optionnel
        title: 'Labyrinthe Master'
    });

    mainWindow.loadFile('renderer/index.html');
    
    // Ouvrir DevTools en développement (commentez en production)
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // Gérer la fermeture de la fenêtre
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Test de la classe Labyrinth au démarrage
console.log('🧪 Test de la classe Labyrinth...');
try {
    const testLab = new Labyrinth(15, 15);
    console.log('✅ Classe Labyrinth créée');
    
    if (typeof testLab.generateMaze === 'function') {
        console.log('✅ Méthode generateMaze trouvée');
    } else {
        console.error('❌ Méthode generateMaze non trouvée');
        console.log('Méthodes disponibles:', Object.getOwnPropertyNames(testLab));
    }
} catch (error) {
    console.error('❌ Erreur test Labyrinth:', error);
}

// === GESTIONNAIRES IPC POUR L'AUTHENTIFICATION ===
ipcMain.handle('auth:login', async (event, { username, password }) => {
    console.log('🔐 Tentative de connexion pour:', username);
    
    return new Promise((resolve) => {
        auth.connecterUtilisateur(username, password, (error, token) => {
            if (error) {
                console.error('❌ Erreur connexion:', error);
                resolve({ success: false, message: error });
            } else {
                // Récupérer les infos utilisateur depuis la DB
                db.get("SELECT id, username, role FROM users WHERE username = ?", [username], (err, user) => {
                    if (err || !user) {
                        console.error('❌ Erreur récupération utilisateur:', err);
                        resolve({ success: false, message: "Erreur utilisateur" });
                    } else {
                        currentUser = user;
                        console.log('✅ Connexion réussie pour:', user.username, '- Rôle:', user.role);
                        resolve({ 
                            success: true, 
                            user: user,
                            token: token 
                        });
                    }
                });
            }
        });
    });
});

ipcMain.handle('auth:register', async (event, { username, password }) => {
    console.log('📝 Tentative d\'inscription pour:', username);
    
    return new Promise((resolve) => {
        auth.inscrireUtilisateur(username, password, (error, message) => {
            if (error) {
                console.error('❌ Erreur inscription:', error);
                resolve({ success: false, message: error });
            } else {
                console.log('✅ Inscription réussie pour:', username);
                
                // Auto-login après inscription
                auth.connecterUtilisateur(username, password, (loginError, token) => {
                    if (loginError) {
                        console.error('❌ Erreur auto-login:', loginError);
                        resolve({ success: false, message: loginError });
                    } else {
                        db.get("SELECT id, username, role FROM users WHERE username = ?", [username], (err, user) => {
                            if (err || !user) {
                                console.error('❌ Erreur récupération utilisateur après inscription:', err);
                                resolve({ success: false, message: "Erreur utilisateur" });
                            } else {
                                currentUser = user;
                                console.log('✅ Auto-connexion réussie pour:', user.username);
                                resolve({ 
                                    success: true, 
                                    user: user,
                                    token: token 
                                });
                            }
                        });
                    }
                });
            }
        });
    });
});

ipcMain.handle('auth:logout', async () => {
    console.log('👋 Déconnexion de:', currentUser?.username);
    currentUser = null;
    return { success: true };
});

ipcMain.handle('auth:check-token', async () => {
    if (currentUser) {
        console.log('🔍 Token valide pour:', currentUser.username);
        return { success: true, user: currentUser };
    }
    console.log('🔍 Aucun token valide');
    return { success: false };
});

// === GESTIONNAIRES IPC POUR LES LABYRINTHES ===
ipcMain.handle('labyrinth:get-user', async (event, userId) => {
    console.log('📋 Récupération des labyrinthes pour utilisateur:', userId);
    
    return new Promise((resolve) => {
        db.all(
            "SELECT * FROM labyrinthes WHERE user_id = ? ORDER BY created_at DESC", 
            [userId], 
            (err, rows) => {
                if (err) {
                    console.error('❌ Erreur récupération labyrinthes:', err);
                    resolve({ success: false, message: err.message });
                } else {
                    console.log('✅ Labyrinthes récupérés:', rows.length);
                    resolve({ success: true, labyrinths: rows });
                }
            }
        );
    });
});

ipcMain.handle('labyrinth:create', async (event, data) => {
    if (!currentUser) {
        console.error('❌ Tentative de création sans authentification');
        return { success: false, message: "Non authentifié" };
    }

    console.log('🛠️ Création manuelle de labyrinthe:', data.name);

    return new Promise((resolve) => {
        const { name, size, difficulty, description, gridData } = data;
        
        db.run(
            "INSERT INTO labyrinthes (user_id, nom, taille, difficulté, description, grid_data, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
            [currentUser.id, name, size, difficulty, description || '', JSON.stringify(gridData)],
            function(err) {
                if (err) {
                    console.error('❌ Erreur sauvegarde création manuelle:', err);
                    resolve({ success: false, message: err.message });
                } else {
                    console.log('✅ Labyrinthe créé manuellement avec ID:', this.lastID);
                    resolve({ 
                        success: true, 
                        labyrinth: { 
                            id: this.lastID, 
                            name, 
                            size, 
                            difficulty,
                            description 
                        } 
                    });
                }
            }
        );
    });
});

ipcMain.handle('labyrinth:generate', async (event, options) => {
    if (!currentUser) {
        console.error('❌ Tentative de génération sans authentification');
        return { success: false, message: "Non authentifié" };
    }

    try {
        const { name, size, difficulty } = options;
        
        console.log('🎲 Génération automatique de labyrinthe:', { name, size, difficulty });
        
        // Convertir les tailles en dimensions (toujours impaires pour les algorithmes de labyrinthe)
        let dimensions;
        switch(size) {
            case 'small':
                dimensions = { width: 15, height: 15 };
                break;
            case 'medium':
                dimensions = { width: 25, height: 25 };
                break;
            case 'large':
                dimensions = { width: 35, height: 35 };
                break;
            default:
                dimensions = { width: 25, height: 25 };
        }
        
        console.log('📐 Dimensions du labyrinthe:', dimensions);
        
        // Créer le labyrinthe avec la classe Labyrinth
        const labyrinth = new Labyrinth(dimensions.width, dimensions.height);
        
        // Générer le labyrinthe avec la difficulté spécifiée
        console.log('⚙️ Génération avec difficulté:', difficulty);
        const grid = labyrinth.generateMaze(0, 0, difficulty);
        
        // Vérifications
        const startFound = grid.some(row => row.some(cell => cell.isStart));
        const endFound = grid.some(row => row.some(cell => cell.isEnd));
        const wallCount = grid.flat().filter(cell => cell.isWall).length;
        const totalCells = grid.length * grid[0].length;
        const wallPercentage = ((wallCount / totalCells) * 100).toFixed(1);
        
        console.log('✅ Labyrinthe généré:', {
            size: `${dimensions.width}x${dimensions.height}`,
            difficulty: difficulty,
            gridSize: `${grid.length}x${grid[0].length}`,
            startFound,
            endFound,
            wallPercentage: wallPercentage + '%',
            totalCells,
            wallCount
        });

        if (!startFound || !endFound) {
            console.warn('⚠️ Point de départ ou d\'arrivée manquant, correction...');
            
            // Forcer un point de départ et d'arrivée si manquants
            if (!startFound) {
                grid[0][0].isStart = true;
                grid[0][0].isWall = false;
            }
            if (!endFound) {
                const lastY = grid.length - 1;
                const lastX = grid[0].length - 1;
                grid[lastY][lastX].isEnd = true;
                grid[lastY][lastX].isWall = false;
            }
        }

        // Sauvegarder en base de données
        return new Promise((resolve) => {
            db.run(
                "INSERT INTO labyrinthes (user_id, nom, taille, difficulté, grid_data, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
                [currentUser.id, name, size, difficulty, JSON.stringify(grid)],
                function(err) {
                    if (err) {
                        console.error('❌ Erreur sauvegarde génération:', err);
                        resolve({ success: false, message: err.message });
                    } else {
                        console.log('✅ Labyrinthe généré et sauvegardé avec ID:', this.lastID);
                        resolve({ 
                            success: true, 
                            labyrinth: { 
                                id: this.lastID, 
                                name, 
                                size, 
                                difficulty,
                                grid,
                                stats: {
                                    wallPercentage,
                                    totalCells,
                                    wallCount
                                }
                            } 
                        });
                    }
                }
            );
        });
    } catch (error) {
        console.error('❌ Erreur génération labyrinthe:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('labyrinth:solve', async (event, labyrinthId) => {
    console.log('🧠 Résolution automatique du labyrinthe:', labyrinthId);
    
    if (!currentUser) {
        return { success: false, message: "Non authentifié" };
    }

    return new Promise((resolve) => {
        db.get(
            "SELECT * FROM labyrinthes WHERE id = ? AND user_id = ?", 
            [labyrinthId, currentUser.id], 
            (err, row) => {
                if (err || !row) {
                    console.error('❌ Labyrinthe non trouvé:', err);
                    resolve({ success: false, message: "Labyrinthe introuvable" });
                } else {
                    try {
                        console.log('🔍 Analyse du labyrinthe pour résolution...');
                        const grid = JSON.parse(row.grid_data);
                        const labyrinth = new Labyrinth(grid[0].length, grid.length);
                        labyrinth.grid = grid;
                        
                        // Retrouver les points de départ et d'arrivée
                        let startNode = null;
                        let endNode = null;
                        
                        for (let y = 0; y < grid.length; y++) {
                            for (let x = 0; x < grid[0].length; x++) {
                                if (grid[y][x].isStart) {
                                    startNode = grid[y][x];
                                    labyrinth.startNode = startNode;
                                }
                                if (grid[y][x].isEnd) {
                                    endNode = grid[y][x];
                                    labyrinth.endNode = endNode;
                                }
                            }
                        }

                        if (!startNode || !endNode) {
                            console.error('❌ Points de départ/arrivée non trouvés');
                            resolve({ success: false, message: "Points de départ/arrivée non trouvés" });
                            return;
                        }

                        console.log('🎯 Départ:', startNode, 'Arrivée:', endNode);

                        // Résoudre le labyrinthe
                        const solution = labyrinth.solveMazeDFS();
                        
                        if (solution) {
                            console.log('✅ Solution trouvée avec', solution.length, 'étapes');
                            resolve({ 
                                success: true, 
                                solution: solution.map(cell => ({ x: cell.x, y: cell.y })),
                                steps: solution.length
                            });
                        } else {
                            console.log('❌ Aucune solution trouvée');
                            resolve({ 
                                success: false, 
                                message: "Aucune solution trouvée pour ce labyrinthe" 
                            });
                        }
                    } catch (error) {
                        console.error('❌ Erreur résolution:', error);
                        resolve({ success: false, message: error.message });
                    }
                }
            }
        );
    });
});

ipcMain.handle('labyrinth:update', async (event, { id, data }) => {
    if (!currentUser) {
        console.error('❌ Tentative de modification sans authentification');
        return { success: false, message: "Non authentifié" };
    }

    console.log('📝 Modification du labyrinthe:', id, data);

    return new Promise((resolve) => {
        const { nom, taille, difficulté } = data;
        
        db.run(
            "UPDATE labyrinthes SET nom = ?, taille = ?, difficulté = ? WHERE id = ? AND user_id = ?",
            [nom, taille, difficulté, id, currentUser.id],
            function(err) {
                if (err) {
                    console.error('❌ Erreur modification:', err);
                    resolve({ success: false, message: err.message });
                } else {
                    console.log('✅ Labyrinthe modifié:', id);
                    resolve({ success: true });
                }
            }
        );
    });
});

ipcMain.handle('labyrinth:delete', async (event, id) => {
    if (!currentUser) {
        console.error('❌ Tentative de suppression sans authentification');
        return { success: false, message: "Non authentifié" };
    }

    console.log('🗑️ Suppression du labyrinthe:', id);

    return new Promise((resolve) => {
        db.run(
            "DELETE FROM labyrinthes WHERE id = ? AND user_id = ?", 
            [id, currentUser.id], 
            function(err) {
                if (err) {
                    console.error('❌ Erreur suppression:', err);
                    resolve({ success: false, message: err.message });
                } else {
                    console.log('✅ Labyrinthe supprimé:', id);
                    resolve({ success: true });
                }
            }
        );
    });
});

// === GESTIONNAIRES IPC POUR L'ADMINISTRATION ===
ipcMain.handle('admin:get-users', async () => {
    if (currentUser?.role !== 'admin') {
        console.error('❌ Accès admin refusé pour:', currentUser?.username);
        return { success: false, message: "Accès non autorisé" };
    }

    console.log('👥 Récupération de tous les utilisateurs (admin)');

    try {
        const users = await AdminService.getAllUsers();
        console.log('✅ Utilisateurs récupérés:', users.length);
        return { success: true, users: users };
    } catch (error) {
        console.error('❌ Erreur récupération utilisateurs:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('admin:get-labyrinths', async () => {
    if (currentUser?.role !== 'admin') {
        console.error('❌ Accès admin refusé pour:', currentUser?.username);
        return { success: false, message: "Accès non autorisé" };
    }

    console.log('🏗️ Récupération de tous les labyrinthes (admin)');

    try {
        const labyrinths = await AdminService.getAllLabyrinths();
        console.log('✅ Labyrinthes récupérés:', labyrinths.length);
        return { success: true, labyrinths: labyrinths };
    } catch (error) {
        console.error('❌ Erreur récupération labyrinthes admin:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('admin:delete-user', async (event, userId) => {
    if (currentUser?.role !== 'admin') {
        console.error('❌ Accès admin refusé pour suppression utilisateur');
        return { success: false, message: "Accès non autorisé" };
    }

    console.log('🗑️ Suppression utilisateur (admin):', userId);

    try {
        await AdminService.deleteUser(userId);
        console.log('✅ Utilisateur supprimé:', userId);
        return { success: true };
    } catch (error) {
        console.error('❌ Erreur suppression utilisateur:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('admin:delete-labyrinth', async (event, labyrinthId) => {
    if (currentUser?.role !== 'admin') {
        console.error('❌ Accès admin refusé pour suppression labyrinthe');
        return { success: false, message: "Accès non autorisé" };
    }

    console.log('🗑️ Suppression labyrinthe (admin):', labyrinthId);

    try {
        await AdminService.deleteLabyrinth(labyrinthId);
        console.log('✅ Labyrinthe supprimé (admin):', labyrinthId);
        return { success: true };
    } catch (error) {
        console.error('❌ Erreur suppression labyrinthe admin:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('admin:get-stats', async () => {
    if (currentUser?.role !== 'admin') {
        console.error('❌ Accès admin refusé pour statistiques');
        return { success: false, message: "Accès non autorisé" };
    }

    console.log('📊 Récupération des statistiques (admin)');

    try {
        const stats = await AdminService.getGlobalStats();
        console.log('✅ Statistiques récupérées:', stats);
        return { success: true, stats: stats };
    } catch (error) {
        console.error('❌ Erreur récupération statistiques:', error);
        return { success: false, message: error.message };
    }
});

// === ÉVÉNEMENTS ELECTRON ===
app.whenReady().then(() => {
    console.log('🚀 Application Electron démarrée');
    createWindow();
    
    // Logs de démarrage
    console.log('📁 Répertoire de travail:', process.cwd());
    console.log('🔧 Mode:', process.env.NODE_ENV || 'development');
});

app.on('window-all-closed', () => {
    console.log('🔒 Toutes les fenêtres fermées');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    console.log('🔄 Application activée');
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    console.log('👋 Fermeture de l\'application');
});

// Gérer les erreurs non capturées
process.on('uncaughtException', (error) => {
    console.error('💥 Erreur non capturée:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Promesse rejetée non gérée:', reason);
});