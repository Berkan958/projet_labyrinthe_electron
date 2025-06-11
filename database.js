const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./labyrinthes.db', (err) => {
    if (err) {
        console.error("Erreur de connexion à SQLite:", err.message);
    } else {
        console.log("Connexion réussie avec la base");

        db.run("PRAGMA foreign_keys = ON");

        // Table users avec colonnes manquantes
        db.run(`             
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error("Erreur de création de la table users:", err.message);
            } else {
                console.log("Table users créée");
                
                // Créer un utilisateur admin par défaut
                db.get("SELECT * FROM users WHERE role = 'admin'", [], (err, admin) => {
                    if (!admin) {
                        const bcrypt = require('bcryptjs');
                        const hashedPassword = bcrypt.hashSync('admin123', 10);
                        
                        db.run(
                            "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                            ['admin', hashedPassword, 'admin'],
                            (err) => {
                                if (err) {
                                    console.error("Erreur création admin:", err.message);
                                } else {
                                    console.log("Utilisateur admin créé (admin/admin123)");
                                }
                            }
                        );
                    }
                });
            }
        });

        // Table labyrinthes corrigée
        db.run(`
            CREATE TABLE IF NOT EXISTS labyrinthes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                nom TEXT NOT NULL,
                taille TEXT NOT NULL,
                difficulté INTEGER NOT NULL,
                description TEXT,
                grid_data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) {
                console.error("Erreur de création de la table labyrinthes:", err.message);
            } else {
                console.log("Table labyrinthes créée");
            }
        });
    }
});

setTimeout(() => {
    db.run("UPDATE users SET role = 'admin' WHERE username = 'berkan'", (err) => {
        if (err) console.error("Erreur:", err);
        else console.log("✅ berkan est maintenant admin !");
    });
}, 2000);

module.exports = db;