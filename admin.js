// admin.js - Module d'administration pour l'application Electron
const db = require('./database');

class AdminService {
    // Récupérer tous les utilisateurs
    static getAllUsers() {
        return new Promise((resolve, reject) => {
            db.all(
                "SELECT id, username, role, created_at FROM users ORDER BY created_at DESC", 
                [], 
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }

    // Supprimer un utilisateur
    static deleteUser(userId) {
        return new Promise((resolve, reject) => {
            // D'abord supprimer les labyrinthes de l'utilisateur
            db.run("DELETE FROM labyrinthes WHERE user_id = ?", [userId], (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Puis supprimer l'utilisateur (sauf admin)
                db.run(
                    "DELETE FROM users WHERE id = ? AND role != 'admin'", 
                    [userId], 
                    function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({ changes: this.changes });
                        }
                    }
                );
            });
        });
    }

    // Modifier un utilisateur
    static updateUser(userId, userData) {
        return new Promise((resolve, reject) => {
            const { username, role } = userData;
            db.run(
                "UPDATE users SET username = ?, role = ? WHERE id = ?",
                [username, role, userId],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ changes: this.changes });
                    }
                }
            );
        });
    }

    // Récupérer tous les labyrinthes avec info utilisateur
    static getAllLabyrinths() {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    l.id,
                    l.nom,
                    l.taille,
                    l.difficulté,
                    l.created_at,
                    u.username,
                    u.id as user_id
                FROM labyrinthes l
                JOIN users u ON l.user_id = u.id
                ORDER BY l.created_at DESC
            `, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Supprimer un labyrinthe
    static deleteLabyrinth(labyrinthId) {
        return new Promise((resolve, reject) => {
            db.run(
                "DELETE FROM labyrinthes WHERE id = ?",
                [labyrinthId],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ changes: this.changes });
                    }
                }
            );
        });
    }

    // Obtenir les statistiques globales
    static getGlobalStats() {
        return new Promise((resolve, reject) => {
            // Compter les utilisateurs
            db.get("SELECT COUNT(*) as count FROM users", [], (err, userCount) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Compter les labyrinthes
                db.get("SELECT COUNT(*) as count FROM labyrinthes", [], (err, labCount) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Calculer la moyenne
                    const totalUsers = userCount.count;
                    const totalLabyrinths = labCount.count;
                    const avgLabyrinthsPerUser = totalUsers > 0 ? totalLabyrinths / totalUsers : 0;

                    // Statistiques par difficulté
                    db.all(`
                        SELECT difficulté, COUNT(*) as count 
                        FROM labyrinthes 
                        GROUP BY difficulté 
                        ORDER BY difficulté
                    `, [], (err, difficultyStats) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        // Statistiques par taille
                        db.all(`
                            SELECT taille, COUNT(*) as count 
                            FROM labyrinthes 
                            GROUP BY taille 
                            ORDER BY taille
                        `, [], (err, sizeStats) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve({
                                    totalUsers,
                                    totalLabyrinths,
                                    avgLabyrinthsPerUser,
                                    difficultyStats,
                                    sizeStats
                                });
                            }
                        });
                    });
                });
            });
        });
    }

    // Rechercher des utilisateurs
    static searchUsers(searchTerm) {
        return new Promise((resolve, reject) => {
            db.all(
                "SELECT id, username, role, created_at FROM users WHERE username LIKE ? ORDER BY username",
                [`%${searchTerm}%`],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }

    // Rechercher des labyrinthes
    static searchLabyrinths(searchTerm) {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    l.id,
                    l.nom,
                    l.taille,
                    l.difficulté,
                    l.created_at,
                    u.username
                FROM labyrinthes l
                JOIN users u ON l.user_id = u.id
                WHERE l.nom LIKE ? OR u.username LIKE ?
                ORDER BY l.created_at DESC
            `, [`%${searchTerm}%`, `%${searchTerm}%`], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Promouvoir un utilisateur en admin
    static promoteToAdmin(userId) {
        return new Promise((resolve, reject) => {
            db.run(
                "UPDATE users SET role = 'admin' WHERE id = ?",
                [userId],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ changes: this.changes });
                    }
                }
            );
        });
    }

    // Rétrograder un admin en utilisateur normal
    static demoteFromAdmin(userId) {
        return new Promise((resolve, reject) => {
            // Vérifier qu'il reste au moins un admin
            db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'", [], (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (result.count <= 1) {
                    reject(new Error("Impossible de supprimer le dernier administrateur"));
                    return;
                }

                db.run(
                    "UPDATE users SET role = 'user' WHERE id = ?",
                    [userId],
                    function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({ changes: this.changes });
                        }
                    }
                );
            });
        });
    }

    // Obtenir les labyrinthes d'un utilisateur spécifique
    static getUserLabyrinths(userId) {
        return new Promise((resolve, reject) => {
            db.all(
                "SELECT * FROM labyrinthes WHERE user_id = ? ORDER BY created_at DESC",
                [userId],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }

    // Exporter les données pour sauvegarde
    static exportData() {
        return new Promise(async (resolve, reject) => {
            try {
                const users = await this.getAllUsers();
                const labyrinths = await this.getAllLabyrinths();
                const stats = await this.getGlobalStats();

                const exportData = {
                    exportDate: new Date().toISOString(),
                    users: users.map(user => ({
                        ...user,
                        password: undefined // Ne pas exporter les mots de passe
                    })),
                    labyrinths,
                    stats,
                    version: "1.0.0"
                };

                resolve(exportData);
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = AdminService;