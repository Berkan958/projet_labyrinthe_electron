// === VARIABLES GLOBALES ===
let currentUser = null;
let currentLabyrinths = [];
let selectedLabyrinth = null;
let gameTimer = null;
let gameStartTime = null;

// === GESTIONNAIRE DE THÈME ===
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.initEventListeners();
        this.applyTheme();
    }

    initEventListeners() {
        document.getElementById('theme-btn')?.addEventListener('click', () => {
            this.toggleTheme();
        });
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        localStorage.setItem('theme', this.currentTheme);
    }

    applyTheme() {
        document.body.className = this.currentTheme;
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
        }
    }
}

// === GESTIONNAIRE DE NOTIFICATIONS ===
class NotificationManager {
    constructor() {
        this.container = document.getElementById('notifications');
    }

    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        notification.innerHTML = `
            <span class="notification-icon">${icons[type] || icons.info}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        `;

        this.container.appendChild(notification);

        // Auto-remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);

        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    success(message) { this.show(message, 'success'); }
    error(message) { this.show(message, 'error'); }
    warning(message) { this.show(message, 'warning'); }
    info(message) { this.show(message, 'info'); }
}

// === GESTIONNAIRE DE CHARGEMENT ===
class LoadingManager {
    constructor() {
        this.element = document.getElementById('loading');
    }

    show(message = 'Chargement...') {
        const messageElement = this.element.querySelector('p');
        if (messageElement) {
            messageElement.textContent = message;
        }
        this.element.classList.add('active');
    }

    hide() {
        this.element.classList.remove('active');
    }
}

// === GESTIONNAIRE D'AUTHENTIFICATION ===
class AuthManager {
    constructor() {
        this.initEventListeners();
    }

    initEventListeners() {
        // Formulaire de connexion
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Formulaire d'inscription
        document.getElementById('register-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Bouton de déconnexion
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.handleLogout();
        });
    }

    async handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            notifications.warning('Veuillez remplir tous les champs');
            return;
        }

        loading.show('Connexion en cours...');

        try {
            const result = await window.electronAPI.login(username, password);
            
            if (result.success) {
                currentUser = result.user;
                notifications.success(`Bienvenue ${currentUser.username} !`);
                
                // Afficher le nom d'utilisateur
                document.getElementById('username-display').textContent = currentUser.username;
                
                if (currentUser.role === 'admin') {
                    navigationManager.showAdminInterface();
                }
                
                navigationManager.switchTab('dashboard');
                await labyrinthManager.loadUserLabyrinths();
            } else {
                notifications.error(result.message || 'Identifiants incorrects');
            }
        } catch (error) {
            console.error('Erreur de connexion:', error);
            notifications.error('Erreur de connexion au serveur');
        } finally {
            loading.hide();
        }
    }

    async handleRegister() {
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;

        if (!username || !password || !confirmPassword) {
            notifications.warning('Veuillez remplir tous les champs');
            return;
        }

        if (password !== confirmPassword) {
            notifications.error('Les mots de passe ne correspondent pas');
            return;
        }

        if (password.length < 6) {
            notifications.error('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        loading.show('Création du compte...');

        try {
            const result = await window.electronAPI.register(username, password);
            
            if (result.success) {
                currentUser = result.user;
                notifications.success('Compte créé avec succès !');
                
                // Afficher le nom d'utilisateur
                document.getElementById('username-display').textContent = currentUser.username;
                
                navigationManager.switchTab('dashboard');
                await labyrinthManager.loadUserLabyrinths();
            } else {
                notifications.error(result.message || 'Erreur lors de la création du compte');
            }
        } catch (error) {
            console.error('Erreur d\'inscription:', error);
            notifications.error('Erreur de connexion au serveur');
        } finally {
            loading.hide();
        }
    }

    handleLogout() {
        currentUser = null;
        currentLabyrinths = [];
        selectedLabyrinth = null;
        
        // Nettoyer les timers
        if (gameTimer) {
            clearInterval(gameTimer);
            gameTimer = null;
        }

        notifications.info('Déconnexion réussie');
        navigationManager.switchTab('auth');
    }
}

// === GESTIONNAIRE DE NAVIGATION ===
class NavigationManager {
    constructor() {
        this.currentTab = 'auth';
        this.initEventListeners();
    }

    initEventListeners() {
        // Navigation principale
        document.querySelectorAll('[data-tab]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Modales
        document.querySelectorAll('.modal-close, .modal-backdrop').forEach(element => {
            element.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-close') || 
                    e.target.classList.contains('modal-backdrop')) {
                    this.closeAllModals();
                }
            });
        });
    }

    switchTab(tabName) {
        console.log('🔄 Changement vers l\'onglet:', tabName);
        
        // 1. D'abord, cacher tous les onglets
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
            console.log('🔒 Masqué:', tab.id);
        });

        // 2. Afficher l'onglet demandé
        const targetTab = document.getElementById(tabName);
        if (targetTab) {
            targetTab.classList.add('active');
            console.log('✅ Affiché:', tabName);
        } else {
            console.error('❌ Onglet non trouvé:', tabName);
            return;
        }

        // 3. Gérer l'affichage du header
        const header = document.querySelector('.app-header');
        if (header) {
            if (tabName === 'auth') {
                header.style.display = 'none';
                console.log('🔒 Header masqué');
            } else {
                header.style.display = 'block';
                console.log('👁️ Header affiché');
            }
        }

        // 4. Gérer les boutons de navigation
        document.querySelectorAll('[data-tab]').forEach(btn => {
            btn.classList.remove('active');
        });

        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        // 5. Mettre à jour l'état
        this.currentTab = tabName;

        // 6. Actions spécifiques
        switch (tabName) {
            case 'dashboard':
                if (window.labyrinthManager && currentUser) {
                    setTimeout(() => {
                        labyrinthManager.loadUserLabyrinths();
                    }, 100);
                }
                break;
            case 'admin':
                if (currentUser?.role === 'admin' && window.adminManager) {
                    setTimeout(() => {
                        adminManager.loadAdminData();
                    }, 100);
                }
                break;
        }
    }

    showAdminInterface() {
        const adminBtn = document.getElementById('admin-tab-btn');
        if (adminBtn) {
            adminBtn.style.display = 'block';
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
}

// === GESTIONNAIRE DES LABYRINTHES ===
class LabyrinthManager {
    constructor() {
        this.initEventListeners();
        this.gameKeyHandler = null;
        this.gameGrid = null;
        this.playerPosition = null;
    }
    
    async autoPlaySolution() {
    if (!selectedLabyrinth) {
        notifications.warning('Veuillez sélectionner un labyrinthe');
        return;
    }
    
    console.log('🤖 Démarrage de la résolution automatique');
    loading.show('Calcul de la solution...');
    
    try {
        // 1. Obtenir la solution
        const result = await window.electronAPI.solveLabyrinth(selectedLabyrinth.id);
        
        if (!result.success || !result.solution) {
            notifications.error('Impossible de résoudre ce labyrinthe');
            loading.hide();
            return;
        }
        
        loading.hide();
        
        // 2. Démarrer le jeu s'il n'est pas déjà démarré
        if (!gameStartTime) {
            this.startGame();
            await new Promise(resolve => setTimeout(resolve, 500)); // Attendre que le jeu se lance
        }
        
        // 3. Désactiver les contrôles manuels temporairement
        if (this.gameKeyHandler) {
            document.removeEventListener('keydown', this.gameKeyHandler);
        }
        
        // 4. Animation de la solution
        notifications.success('🤖 Résolution automatique en cours...');
        
        let stepIndex = 0;
        const solution = result.solution;
        
        const animateNextStep = () => {
            if (stepIndex >= solution.length) {
                // Fin de l'animation
                console.log('✅ Résolution automatique terminée');
                this.winGame();
                return;
            }
            
            const currentStep = solution[stepIndex];
            
            // Vérifier si c'est la fin
            if (this.gameGrid[currentStep.y][currentStep.x].isEnd) {
                this.playerPosition = currentStep;
                this.drawGameCanvas();
                this.winGame();
                return;
            }
            
            // Déplacer le joueur
            this.playerPosition = { x: currentStep.x, y: currentStep.y };
            this.drawGameCanvas();
            
            // Afficher le numéro de l'étape
            const canvas = document.getElementById('labyrinth-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                const cellSize = canvas.width / this.gameGrid[0].length;
                
                // Afficher temporairement le numéro de l'étape
                ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
                ctx.font = `${Math.floor(cellSize / 3)}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText(
                    stepIndex + 1,
                    currentStep.x * cellSize + cellSize / 2,
                    currentStep.y * cellSize + cellSize / 2 + 5
                );
            }
            
            stepIndex++;
            
            // Programmer la prochaine étape
            setTimeout(animateNextStep, 300); // 300ms entre chaque étape
        };
        
        // Démarrer l'animation
        setTimeout(animateNextStep, 500);
        
    } catch (error) {
        console.error('Erreur résolution auto:', error);
        notifications.error('Erreur lors de la résolution automatique');
        loading.hide();
    }
}

    initEventListeners() {
        // Génération automatique
        document.getElementById('generate-auto')?.addEventListener('click', () => {
            this.generateAutoLabyrinth();
        });

        // Création manuelle
        document.getElementById('create-manual')?.addEventListener('click', () => {
            this.createManualLabyrinth();
        });

        // Actualiser la liste
        document.getElementById('refresh-list')?.addEventListener('click', () => {
            this.loadUserLabyrinths();
        });

        // Slider de difficulté
        document.getElementById('labyrinth-difficulty')?.addEventListener('input', (e) => {
            document.querySelector('#create-labyrinth .difficulty-value').textContent = e.target.value;
        });

        document.getElementById('edit-difficulty')?.addEventListener('input', (e) => {
            document.querySelector('#edit-modal .difficulty-value').textContent = e.target.value;
        });

        // Sélection de labyrinthe pour jouer
        document.getElementById('select-labyrinth')?.addEventListener('change', (e) => {
            this.selectLabyrinthForGame(e.target.value);
        });

        // Résolution automatique
        document.getElementById('solve-auto')?.addEventListener('click', () => {
            if (selectedLabyrinth) {
                this.autoPlaySolution();
            }
        });

        // Reset du jeu
        document.getElementById('reset-game')?.addEventListener('click', () => {
            this.resetGame();
        });
    }

    async loadUserLabyrinths() {
        if (!currentUser) return;

        loading.show('Chargement des labyrinthes...');

        try {
            const result = await window.electronAPI.getUserLabyrinths(currentUser.id);
            
            if (result.success) {
                currentLabyrinths = result.labyrinths;
                this.renderLabyrinthGrid();
                this.updateGameSelect();
            } else {
                notifications.error('Erreur lors du chargement des labyrinthes');
            }
        } catch (error) {
            console.error('Erreur chargement labyrinthes:', error);
            notifications.error('Erreur de connexion');
        } finally {
            loading.hide();
        }
    }

    renderLabyrinthGrid() {
        const grid = document.getElementById('labyrinth-grid');
        if (!grid) return;

        if (currentLabyrinths.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🏗️</div>
                    <h3>Aucun labyrinthe créé</h3>
                    <p>Commencez par créer votre premier labyrinthe !</p>
                    <button class="btn btn-primary" data-tab="create-labyrinth">Créer maintenant</button>
                </div>
            `;
            
            // Re-attacher l'événement
            grid.querySelector('[data-tab]')?.addEventListener('click', (e) => {
                navigationManager.switchTab(e.target.dataset.tab);
            });
        } else {
            grid.innerHTML = currentLabyrinths.map(lab => `
                <div class="labyrinth-card">
                    <div class="card-header">
                        <h3>${lab.nom}</h3>
                        <div class="card-actions">
                            <button onclick="labyrinthManager.editLabyrinth(${lab.id})" class="btn btn-sm btn-outline">✏️</button>
                            <button onclick="labyrinthManager.deleteLabyrinth(${lab.id})" class="btn btn-sm btn-danger">🗑️</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="labyrinth-info">
                            <span class="info-badge">Taille: ${lab.taille}</span>
                            <span class="difficulty-badge difficulty-${lab.difficulté}">Difficulté: ${lab.difficulté}/10</span>
                        </div>
                        <p class="labyrinth-description">${lab.description || 'Aucune description'}</p>
                        <div class="card-footer">
                            <small>Créé le ${this.formatDate(lab.created_at)}</small>
                            <button onclick="labyrinthManager.playLabyrinth(${lab.id})" class="btn btn-sm btn-primary">🎮 Jouer</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    updateGameSelect() {
        const select = document.getElementById('select-labyrinth');
        if (!select) return;

        select.innerHTML = '<option value="">Choisir un labyrinthe</option>';
        currentLabyrinths.forEach(lab => {
            select.innerHTML += `<option value="${lab.id}">${lab.nom} (${lab.taille}, ${lab.difficulté}/10)</option>`;
        });
    }

    async generateAutoLabyrinth() {
        const name = document.getElementById('labyrinth-name').value.trim();
        const size = document.getElementById('labyrinth-size').value;
        const difficulty = parseInt(document.getElementById('labyrinth-difficulty').value);

        if (!name) {
            notifications.warning('Veuillez donner un nom au labyrinthe');
            return;
        }

        if (!size) {
            notifications.warning('Veuillez choisir une taille');
            return;
        }

        loading.show('Génération du labyrinthe...');

        try {
            const result = await window.electronAPI.generateLabyrinth({
                name,
                size,
                difficulty,
                userId: currentUser.id
            });

            if (result.success) {
                notifications.success('Labyrinthe généré avec succès !');
                document.getElementById('create-form').reset();
                document.querySelector('#create-labyrinth .difficulty-value').textContent = '5';
                await this.loadUserLabyrinths();
                navigationManager.switchTab('dashboard');
            } else {
                notifications.error(result.message || 'Erreur lors de la génération');
            }
        } catch (error) {
            console.error('Erreur génération:', error);
            notifications.error('Erreur de connexion au serveur');
        } finally {
            loading.hide();
        }
    }

    createManualLabyrinth() {
        const name = document.getElementById('labyrinth-name').value.trim();
        const size = document.getElementById('labyrinth-size').value;
        const difficulty = parseInt(document.getElementById('labyrinth-difficulty').value);

        if (!name) {
            notifications.warning('Veuillez donner un nom au labyrinthe');
            return;
        }

        if (!size) {
            notifications.warning('Veuillez choisir une taille');
            return;
        }

        // Créer une modale pour l'éditeur manuel
        this.openManualEditor(name, size, difficulty);
    }

    openManualEditor(name, size, difficulty) {
        // Créer la modale d'édition
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'manual-editor-modal';
    
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h3>✏️ Éditeur Manuel - ${name}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="editor-instructions">
                        <p><strong>Instructions :</strong></p>
                        <ul>
                            <li>🟦 <strong>Clic gauche</strong> : Placer/enlever un mur</li>
                            <li>🟢 <strong>Shift + Clic</strong> : Placer le point de départ</li>
                            <li>🔴 <strong>Ctrl + Clic</strong> : Placer l'arrivée</li>
                        </ul>
                    </div>
                    <div class="manual-editor-container">
                        <canvas id="manual-editor-canvas" width="600" height="600"></canvas>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline modal-close">Annuler</button>
                    <button type="button" id="save-manual-maze" class="btn btn-primary">Sauvegarder</button>
                </div>
            </div>
        `;
    
        document.body.appendChild(modal);
    
        // Initialiser l'éditeur
        this.initManualEditor(name, size, difficulty);
    
        // Gestionnaires d'événements
        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });
    
        document.getElementById('save-manual-maze').addEventListener('click', () => {
            this.saveManualMaze(name, size, difficulty);
            document.body.removeChild(modal);
        });
    }

    initManualEditor(name, size, difficulty) {
        const canvas = document.getElementById('manual-editor-canvas');
        const ctx = canvas.getContext('2d');
    
        // Déterminer la taille de la grille
        const gridSize = size === 'small' ? 15 : size === 'medium' ? 25 : 35;
        const cellSize = Math.min(canvas.width / gridSize, canvas.height / gridSize);
    
        // Créer une grille vide
        this.editorGrid = [];
        for (let y = 0; y < gridSize; y++) {
            const row = [];
            for (let x = 0; x < gridSize; x++) {
                row.push({
                    x: x,
                    y: y,
                    isWall: false,
                    isStart: x === 0 && y === 0,
                    isEnd: x === gridSize - 1 && y === gridSize - 1,
                    walls: { top: false, right: false, bottom: false, left: false }
                });
            }
            this.editorGrid.push(row);
        }
    
        // Dessiner la grille initiale
        this.drawEditorGrid();
    
        // Ajouter les gestionnaires de clic
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / cellSize);
            const y = Math.floor((e.clientY - rect.top) / cellSize);
        
            if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
                const cell = this.editorGrid[y][x];
            
                if (e.shiftKey) {
                    // Placer le départ
                    this.editorGrid.forEach(row => {
                        row.forEach(c => c.isStart = false);
                    });
                    cell.isStart = true;
                    cell.isWall = false;
                } else if (e.ctrlKey) {
                    // Placer l'arrivée
                    this.editorGrid.forEach(row => {
                        row.forEach(c => c.isEnd = false);
                    });
                    cell.isEnd = true;
                    cell.isWall = false;
                } else {
                    // Basculer le mur
                    if (!cell.isStart && !cell.isEnd) {
                        cell.isWall = !cell.isWall;
                    }
                }
            
                this.drawEditorGrid();
            }
        });
    }

    drawEditorGrid() {
        const canvas = document.getElementById('manual-editor-canvas');
        const ctx = canvas.getContext('2d');
        const gridSize = this.editorGrid.length;
        const cellSize = canvas.width / gridSize;
    
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const cell = this.editorGrid[y][x];
            
                // Couleurs des cellules
                if (cell.isStart) {
                    ctx.fillStyle = '#10b981'; // Vert
                } else if (cell.isEnd) {
                    ctx.fillStyle = '#ef4444'; // Rouge
                } else if (cell.isWall) {
                    ctx.fillStyle = '#374151'; // Gris foncé
                } else {
                    ctx.fillStyle = '#f9fafb'; // Blanc
                }
            
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            
                // Bordures
                ctx.strokeStyle = '#d1d5db';
                ctx.lineWidth = 1;
                ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }

    async saveManualMaze(name, size, difficulty) {
        if (!this.editorGrid) {
            notifications.error('Aucune grille à sauvegarder');
            return;
        }
    
        // Vérifier qu'il y a un départ et une arrivée
        const hasStart = this.editorGrid.some(row => row.some(cell => cell.isStart));
        const hasEnd = this.editorGrid.some(row => row.some(cell => cell.isEnd));
    
        if (!hasStart || !hasEnd) {
            notifications.error('Le labyrinthe doit avoir un point de départ et d\'arrivée');
            return;
        }
    
        loading.show('Sauvegarde du labyrinthe...');
    
        try {
            const result = await window.electronAPI.createLabyrinth({
                name: name,
                size: size,
                difficulty: difficulty,
                description: document.getElementById('labyrinth-description').value,
                gridData: this.editorGrid,
                userId: currentUser.id
            });
        
            if (result.success) {
                notifications.success('Labyrinthe créé avec succès !');
                document.getElementById('create-form').reset();
                document.querySelector('#create-labyrinth .difficulty-value').textContent = '5';
                await this.loadUserLabyrinths();
                navigationManager.switchTab('dashboard');
            } else {
                notifications.error(result.message || 'Erreur lors de la création');
            }
        } catch (error) {
            console.error('Erreur création manuelle:', error);
            notifications.error('Erreur de connexion au serveur');
        } finally {
            loading.hide();
        }
    }

    async deleteLabyrinth(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce labyrinthe ?')) return;

        try {
            const result = await window.electronAPI.deleteLabyrinth(id);
            
            if (result.success) {
                notifications.success('Labyrinthe supprimé');
                await this.loadUserLabyrinths();
            } else {
                notifications.error('Erreur lors de la suppression');
            }
        } catch (error) {
            console.error('Erreur suppression:', error);
            notifications.error('Erreur de connexion');
        }
    }

    editLabyrinth(id) {
        const labyrinth = currentLabyrinths.find(lab => lab.id === id);
        if (!labyrinth) return;

        // Remplir le formulaire d'édition
        document.getElementById('edit-name').value = labyrinth.nom;
        document.getElementById('edit-size').value = labyrinth.taille;
        document.getElementById('edit-difficulty').value = labyrinth.difficulté;
        document.querySelector('#edit-modal .difficulty-value').textContent = labyrinth.difficulté;

        // Afficher la modale
        document.getElementById('edit-modal').classList.add('active');

        // Gérer la sauvegarde
        document.getElementById('save-edit').onclick = async () => {
            await this.saveLabyrinthEdit(id);
        };
    }

    async saveLabyrinthEdit(id) {
        const name = document.getElementById('edit-name').value.trim();
        const size = document.getElementById('edit-size').value;
        const difficulty = parseInt(document.getElementById('edit-difficulty').value);

        if (!name) {
            notifications.warning('Le nom est requis');
            return;
        }

        try {
            const result = await window.electronAPI.updateLabyrinth(id, {
                nom: name,
                taille: size,
                difficulté: difficulty
            });

            if (result.success) {
                notifications.success('Labyrinthe modifié');
                navigationManager.closeAllModals();
                await this.loadUserLabyrinths();
            } else {
                notifications.error('Erreur lors de la modification');
            }
        } catch (error) {
            console.error('Erreur modification:', error);
            notifications.error('Erreur de connexion');
        }
    }

    selectLabyrinthForGame(labyrinthId) {
        if (!labyrinthId) {
            selectedLabyrinth = null;
            this.clearGameDisplay();
            return;
        }

        selectedLabyrinth = currentLabyrinths.find(lab => lab.id == labyrinthId);
        if (selectedLabyrinth) {
            this.displayLabyrinthForGame();
        }
    }

    displayLabyrinthForGame() {
        if (!selectedLabyrinth) return;

        document.getElementById('current-labyrinth-name').textContent = selectedLabyrinth.nom;
        document.getElementById('current-difficulty').textContent = `${selectedLabyrinth.difficulté}/10`;
        
        // Réinitialiser le timer
        this.resetTimer();
        
        // Créer le canvas pour afficher le labyrinthe - CORRECTION ICI
        const display = document.getElementById('labyrinth-display');
        display.innerHTML = `
            <div class="labyrinth-canvas-container">
                <canvas id="labyrinth-canvas" width="600" height="600"></canvas>
                <div class="game-controls-overlay">
                    <button onclick="labyrinthManager.startGame()" class="btn btn-primary">▶️ Commencer</button>
                    <button onclick="labyrinthManager.showSolution()" class="btn btn-secondary">💡 Voir la solution</button>
                </div>
                <div class="game-instructions" style="display: none;">
                    <p><strong>🎮 Contrôles :</strong> Utilisez les flèches ↑ ↓ ← → pour vous déplacer</p>
                </div>
            </div>
        `;
        
        // IMPORTANT : Attendre que le DOM soit mis à jour
        setTimeout(() => {
            // Afficher le labyrinthe s'il a des données de grille
            if (selectedLabyrinth.grid_data) {
                try {
                    this.gameGrid = JSON.parse(selectedLabyrinth.grid_data);
                    this.drawGameCanvas();
                } catch (e) {
                    console.error('Erreur parsing grid_data:', e);
                    this.generateDemoMaze();
                }
            } else {
                // Si pas de données de grille, en créer une pour la démo
                this.generateDemoMaze();
            }
        }, 100);
    }

    clearGameDisplay() {
        document.getElementById('current-labyrinth-name').textContent = 'Aucun sélectionné';
        document.getElementById('current-difficulty').textContent = '-';
        document.getElementById('labyrinth-display').innerHTML = `
            <div class="no-labyrinth">
                <div class="no-labyrinth-icon">🎯</div>
                <p>Sélectionnez un labyrinthe pour commencer à jouer</p>
            </div>
        `;
        this.resetTimer();
    }

    startGame() {
        if (!selectedLabyrinth) {
            notifications.error('Aucun labyrinthe sélectionné');
            return;
        }

        // Vérifier que le canvas existe
        const canvas = document.getElementById('labyrinth-canvas');
        if (!canvas) {
            notifications.error('Erreur d\'affichage du labyrinthe');
            return;
        }

        gameStartTime = Date.now();
        this.startTimer();
        
        // Initialiser la position du joueur
        this.playerPosition = { x: 0, y: 0 };
        
        // S'assurer qu'on a une grille
        if (!this.gameGrid) {
            if (selectedLabyrinth.grid_data) {
                try {
                    this.gameGrid = JSON.parse(selectedLabyrinth.grid_data);
                } catch (e) {
                    console.error('Erreur parsing grid:', e);
                    this.generateDemoMaze();
                }
            } else {
                this.generateDemoMaze();
            }
        }
        
        if (this.gameGrid) {
            // Trouver la vraie position de départ
            let startFound = false;
            for (let y = 0; y < this.gameGrid.length && !startFound; y++) {
                for (let x = 0; x < this.gameGrid[0].length && !startFound; x++) {
                    if (this.gameGrid[y][x].isStart) {
                        this.playerPosition = { x, y };
                        startFound = true;
                    }
                }
            }
            
            if (!startFound) {
                // Si pas de start trouvé, mettre à 0,0
                this.playerPosition = { x: 0, y: 0 };
                this.gameGrid[0][0].isStart = true;
                this.gameGrid[0][0].isWall = false;
            }
        }
        
        // Redessiner avec le joueur
        this.drawGameCanvas();
        
        // Afficher les instructions
        const instructions = document.querySelector('.game-instructions');
        if (instructions) {
            instructions.style.display = 'block';
        }
        
        // Masquer le bouton commencer
        const startBtn = document.querySelector('button[onclick="labyrinthManager.startGame()"]');
        if (startBtn) {
            startBtn.style.display = 'none';
        }
        
        notifications.success('🎮 Jeu commencé ! Utilisez les flèches pour vous déplacer');
        
        // Ajouter les contrôles - CORRECTION ICI
        this.addGameControls();
        
        // Focus sur le canvas pour les événements clavier
        canvas.focus();
        canvas.setAttribute('tabindex', '0');
    }

    addGameControls() {
        console.log('🎮 Ajout des contrôles de jeu');
        
        // Supprimer les anciens gestionnaires pour éviter les doublons
        if (this.gameKeyHandler) {
            document.removeEventListener('keydown', this.gameKeyHandler);
            console.log('🗑️ Ancien gestionnaire supprimé');
        }
        
        // Nouveau gestionnaire
        this.gameKeyHandler = (e) => {
            // Vérifier que le jeu est actif
            if (!gameStartTime || !this.gameGrid || !this.playerPosition) {
                console.log('❌ Jeu non actif:', { gameStartTime, hasGrid: !!this.gameGrid, hasPlayer: !!this.playerPosition });
                return;
            }
            
            console.log('⌨️ Touche pressée:', e.key);
            
            let newX = this.playerPosition.x;
            let newY = this.playerPosition.y;
            let moved = false;
            
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    newY = Math.max(0, newY - 1);
                    moved = true;
                    console.log('⬆️ Mouvement vers le haut');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    newY = Math.min(this.gameGrid.length - 1, newY + 1);
                    moved = true;
                    console.log('⬇️ Mouvement vers le bas');
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    newX = Math.max(0, newX - 1);
                    moved = true;
                    console.log('⬅️ Mouvement vers la gauche');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    newX = Math.min(this.gameGrid[0].length - 1, newX + 1);
                    moved = true;
                    console.log('➡️ Mouvement vers la droite');
                    break;
                default:
                    return;
            }
            
            if (moved) {
                console.log('🔄 Tentative de mouvement:', { from: this.playerPosition, to: { x: newX, y: newY } });
                
                // Vérifier si le mouvement est valide (pas dans un mur)
                if (this.canMoveTo(newX, newY)) {
                    this.playerPosition.x = newX;
                    this.playerPosition.y = newY;
                    
                    console.log('✅ Mouvement réussi vers:', this.playerPosition);
                    
                    // Redessiner le canvas
                    this.drawGameCanvas();
                    
                    // Vérifier si le joueur a gagné
                    if (this.gameGrid[newY][newX].isEnd) {
                        console.log('🎉 Victoire !');
                        this.winGame();
                    }
                } else {
                    console.log('❌ Mouvement bloqué - mur détecté');
                    // Optionnel : feedback visuel ou sonore
                    notifications.warning('🚧 Mouvement bloqué !');
                }
            }
        };
        
        // Attacher le gestionnaire
        document.addEventListener('keydown', this.gameKeyHandler);
        console.log('✅ Gestionnaire d\'événements attaché');
        
        // Ajouter des gestionnaires de click pour mobile/debug
        const canvas = document.getElementById('labyrinth-canvas');
        if (canvas) {
            canvas.addEventListener('click', (e) => {
                const rect = canvas.getBoundingClientRect();
                const x = Math.floor((e.clientX - rect.left) / (canvas.width / this.gameGrid[0].length));
                const y = Math.floor((e.clientY - rect.top) / (canvas.height / this.gameGrid.length));
                console.log('🖱️ Click sur:', { x, y });
            });
        }
    }

    canMoveTo(x, y) {
        if (!this.gameGrid) {
            console.log('❌ Pas de grille pour vérifier le mouvement');
            return false;
        }
        
        if (y < 0 || y >= this.gameGrid.length || x < 0 || x >= this.gameGrid[0].length) {
            console.log('❌ Mouvement hors limites:', { x, y, gridSize: [this.gameGrid[0].length, this.gameGrid.length] });
            return false;
        }
        
        const cell = this.gameGrid[y][x];
        const canMove = !cell.isWall;
        
        console.log('🔍 Vérification mouvement:', { 
            position: { x, y }, 
            isWall: cell.isWall, 
            canMove,
            cellInfo: cell
        });
        
        return canMove;
    }

    drawGameCanvas() {
        const canvas = document.getElementById('labyrinth-canvas');
        if (!canvas) {
            console.error('❌ Canvas non trouvé pour le dessin');
            return;
        }
        
        if (!this.gameGrid) {
            console.error('❌ Pas de grille à dessiner');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        const CELL_SIZE = Math.min(canvas.width / this.gameGrid[0].length, canvas.height / this.gameGrid.length);
        
        // Redimensionner le canvas
        canvas.width = this.gameGrid[0].length * CELL_SIZE;
        canvas.height = this.gameGrid.length * CELL_SIZE;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Dessiner la grille
        for (let y = 0; y < this.gameGrid.length; y++) {
            for (let x = 0; x < this.gameGrid[0].length; x++) {
                const cell = this.gameGrid[y][x];
                
                // Couleurs des cellules
                if (cell.isStart) {
                    ctx.fillStyle = '#10b981'; // Vert pour le début
                } else if (cell.isEnd) {
                    ctx.fillStyle = '#ef4444'; // Rouge pour la fin
                } else if (cell.isWall) {
                    ctx.fillStyle = '#374151'; // Gris foncé pour les murs
                } else {
                    ctx.fillStyle = '#f9fafb'; // Blanc pour les passages
                }
                
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                
                // Bordures
                ctx.strokeStyle = '#d1d5db';
                ctx.lineWidth = 1;
                ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
        
        // Dessiner le joueur SI la position existe
        if (this.playerPosition && gameStartTime) {
            ctx.fillStyle = '#3b82f6'; // Bleu pour le joueur
            const playerSize = CELL_SIZE * 0.6;
            
            ctx.beginPath();
            ctx.arc(
                this.playerPosition.x * CELL_SIZE + CELL_SIZE / 2,
                this.playerPosition.y * CELL_SIZE + CELL_SIZE / 2,
                playerSize / 2,
                0,
                2 * Math.PI
            );
            ctx.fill();
            
            // Ajouter un contour blanc pour la visibilité
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        console.log('🎨 Canvas redessiné avec joueur à:', this.playerPosition);
    }

    generateDemoMaze() {
        console.log('🎲 Génération d\'un labyrinthe de démonstration');
        
        // Créer un labyrinthe de démonstration simple
        const size = 15;
        const demoGrid = [];
        
        for (let y = 0; y < size; y++) {
            const row = [];
            for (let x = 0; x < size; x++) {
                row.push({
                    x: x,
                    y: y,
                    isWall: Math.random() < 0.3, // 30% de chance d'être un mur
                    isStart: x === 0 && y === 0,
                    isEnd: x === size - 1 && y === size - 1,
                    isPath: false,
                    walls: {
                        top: y === 0,
                        right: x === size - 1,
                        bottom: y === size - 1,
                        left: x === 0
                    }
                });
            }
            demoGrid.push(row);
        }
        
        // S'assurer que le début et la fin ne sont pas des murs
        demoGrid[0][0].isWall = false;
        demoGrid[size - 1][size - 1].isWall = false;
        
        // Créer un chemin simple du début à la fin
        for (let i = 0; i < size - 1; i++) {
            demoGrid[0][i].isWall = false; // Ligne horizontale en haut
            demoGrid[i][size - 1].isWall = false; // Ligne verticale à droite
        }
        
        this.gameGrid = demoGrid;
        this.drawGameCanvas();
    }

    winGame() {
        // Arrêter le timer
        if (gameTimer) {
            clearInterval(gameTimer);
            gameTimer = null;
        }
        
        // Supprimer les contrôles
        if (this.gameKeyHandler) {
            document.removeEventListener('keydown', this.gameKeyHandler);
            this.gameKeyHandler = null;
        }
        
        const finalTime = document.getElementById('game-timer').textContent;
        notifications.success(`🎉 Félicitations ! Vous avez terminé en ${finalTime} !`);
        
        // Afficher les boutons de fin
        const display = document.getElementById('labyrinth-display');
        const canvas = document.getElementById('labyrinth-canvas');
        
        if (canvas) {
            const overlay = document.createElement('div');
            overlay.className = 'win-overlay';
            overlay.innerHTML = `
                <div class="win-message">
                    <h3>🎉 Victoire !</h3>
                    <p>Temps: ${finalTime}</p>
                    <button onclick="labyrinthManager.resetGame()" class="btn btn-primary">🔄 Rejouer</button>
                    <button onclick="navigationManager.switchTab('dashboard')" class="btn btn-outline">📋 Retour au Dashboard</button>
                </div>
            `;
            
            if (display) {
                display.appendChild(overlay);
            }
        }
    }

    resetGame() {
        console.log('🔄 Reset du jeu');
        
        // Nettoyer les gestionnaires d'événements
        if (this.gameKeyHandler) {
            document.removeEventListener('keydown', this.gameKeyHandler);
            this.gameKeyHandler = null;
        }
        
        // Réinitialiser les variables
        if (gameTimer) {
            clearInterval(gameTimer);
            gameTimer = null;
        }
        
        gameStartTime = null;
        this.playerPosition = null;
        this.resetTimer();
        
        // Supprimer l'overlay de victoire s'il existe
        const overlay = document.querySelector('.win-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // Réafficher l'interface de jeu
        if (selectedLabyrinth) {
            this.displayLabyrinthForGame();
        } else {
            this.clearGameDisplay();
        }
    }

    startTimer() {
        if (gameTimer) clearInterval(gameTimer);
        
        gameTimer = setInterval(() => {
            if (gameStartTime) {
                const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                document.getElementById('game-timer').textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    resetTimer() {
        document.getElementById('game-timer').textContent = '00:00';
        gameStartTime = null;
        if (gameTimer) {
            clearInterval(gameTimer);
            gameTimer = null;
        }
    }

    playLabyrinth(id) {
        // Changer d'onglet et sélectionner le labyrinthe
        navigationManager.switchTab('play-labyrinth');
        document.getElementById('select-labyrinth').value = id;
        this.selectLabyrinthForGame(id);
    }

    async showSolution() {
        if (!selectedLabyrinth) return;
        
        try {
            const result = await window.electronAPI.solveLabyrinth(selectedLabyrinth.id);
            
            if (result.success && result.solution) {
                // Afficher le chemin de la solution sur le canvas
                this.highlightSolutionPath(result.solution);
                notifications.success('Solution affichée !');
            } else {
                notifications.warning('Impossible de résoudre ce labyrinthe');
            }
        } catch (error) {
            console.error('Erreur résolution:', error);
            notifications.error('Erreur lors de la résolution');
        }
    }

    highlightSolutionPath(solution) {
        const canvas = document.getElementById('labyrinth-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const grid = JSON.parse(selectedLabyrinth.grid_data);
        const CELL_SIZE = canvas.width / grid[0].length;
        
        // Dessiner le chemin de solution
        ctx.fillStyle = '#fbbf24'; // Jaune pour le chemin
        solution.forEach(cell => {
            ctx.fillRect(cell.x * CELL_SIZE + 2, cell.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        });
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('fr-FR');
    }
}

// === GESTIONNAIRE ADMINISTRATEUR ===
class AdminManager {
    constructor() {
        this.initEventListeners();
    }

    initEventListeners() {
        document.getElementById('refresh-admin')?.addEventListener('click', () => {
            this.loadAdminData();
        });
    }

    async loadAdminData() {
        if (currentUser?.role !== 'admin') {
            notifications.error('Accès non autorisé');
            return;
        }

        loading.show('Chargement des données administrateur...');

        try {
            const [usersResult, labyrinthsResult, statsResult] = await Promise.all([
                window.electronAPI.getAllUsers(),
                window.electronAPI.getAllLabyrinths(),
                window.electronAPI.getStatistics()
            ]);

            if (usersResult.success) {
                this.renderUsersTable(usersResult.users);
            }

            if (labyrinthsResult.success) {
                this.renderLabyrinthsTable(labyrinthsResult.labyrinths);
            }

            if (statsResult.success) {
                this.renderStatistics(statsResult.stats);
            }

        } catch (error) {
            console.error('Erreur admin:', error);
            notifications.error('Erreur lors du chargement des données');
        } finally {
            loading.hide();
        }
    }

    renderUsersTable(users) {
        const tbody = document.querySelector('#users-table tbody');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>
                    <span class="role-badge role-${user.role}">${user.role}</span>
                </td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>
                    <button onclick="adminManager.deleteUser(${user.id})" 
                            class="btn btn-danger btn-sm"
                            ${user.role === 'admin' ? 'disabled' : ''}>
                        🗑️ Supprimer
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderLabyrinthsTable(labyrinths) {
        const tbody = document.querySelector('#admin-labyrinths-table tbody');
        if (!tbody) return;

        tbody.innerHTML = labyrinths.map(lab => `
            <tr>
                <td>${lab.id}</td>
                <td>${lab.nom}</td>
                <td>${lab.username}</td>
                <td>
                    <span class="difficulty-badge difficulty-${lab.difficulté}">
                        ${lab.difficulté}/10
                    </span>
                </td>
                <td>${this.formatDate(lab.created_at)}</td>
                <td>
                    <button onclick="adminManager.deleteLabyrinth(${lab.id})" 
                            class="btn btn-danger btn-sm">
                        🗑️ Supprimer
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderStatistics(stats) {
        document.getElementById('total-users').textContent = stats.totalUsers;
        document.getElementById('total-labyrinths').textContent = stats.totalLabyrinths;
        document.getElementById('avg-labyrinths').textContent = stats.avgLabyrinthsPerUser.toFixed(1);
    }

    async deleteUser(userId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

        try {
            const result = await window.electronAPI.deleteUser(userId);
            
            if (result.success) {
                notifications.success('Utilisateur supprimé');
                this.loadAdminData();
            } else {
                notifications.error(result.message || 'Erreur lors de la suppression');
            }
        } catch (error) {
            console.error('Erreur suppression utilisateur:', error);
            notifications.error('Erreur de connexion');
        }
    }

    async deleteLabyrinth(labyrinthId) {
        if (!confirm('Supprimer ce labyrinthe ?')) return;

        try {
            const result = await window.electronAPI.deleteAdminLabyrinth(labyrinthId);
            
            if (result.success) {
                notifications.success('Labyrinthe supprimé');
                this.loadAdminData();
            } else {
                notifications.error(result.message || 'Erreur lors de la suppression');
            }
        } catch (error) {
            console.error('Erreur suppression labyrinthe:', error);
            notifications.error('Erreur de connexion');
        }
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('fr-FR');
    }
}

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser tous les gestionnaires
    window.themeManager = new ThemeManager();
    window.notifications = new NotificationManager();
    window.loading = new LoadingManager();
    window.navigationManager = new NavigationManager();
    window.authManager = new AuthManager();
    window.labyrinthManager = new LabyrinthManager();
    window.adminManager = new AdminManager();

    // Vérifier si l'utilisateur est déjà connecté
    checkAutoLogin();
});

async function checkAutoLogin() {
    try {
        const result = await window.electronAPI.checkAuthToken();
        if (result.success && result.user) {
            currentUser = result.user;
            document.getElementById('username-display').textContent = currentUser.username;
            navigationManager.switchTab('dashboard');
            
            if (currentUser.role === 'admin') {
                navigationManager.showAdminInterface();
            }
        }
    } catch (error) {
        console.log('Pas de connexion automatique');
    }
}

function debugNavigation() {
    console.log('=== DEBUG NAVIGATION ===');
    console.log('Utilisateur connecté:', currentUser);
    
    const allTabs = document.querySelectorAll('.tab-content');
    console.log('Onglets trouvés:', allTabs.length);
    
    allTabs.forEach(tab => {
        console.log(`- ${tab.id}: ${tab.classList.contains('active') ? 'ACTIF' : 'inactif'}`);
    });
    
    const header = document.querySelector('.app-header');
    console.log('Header visible:', header ? header.style.display !== 'none' : 'non trouvé');
    
    const authSection = document.getElementById('auth');
    console.log('Section auth active:', authSection ? authSection.classList.contains('active') : 'non trouvé');
    
    const dashboardSection = document.getElementById('dashboard');
    console.log('Section dashboard active:', dashboardSection ? dashboardSection.classList.contains('active') : 'non trouvé');
}

// Exposer la fonction globalement pour les tests
window.debugNavigation = debugNavigation;