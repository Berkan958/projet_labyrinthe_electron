
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./database");

const secretKey = "s3cr3t_@pp_L@byr1nth_2025"; 

function inscrireUtilisateur(username, password, callback) {
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => { 
        if (err) return callback("Erreur SQL : " + err.message);
        if (row) return callback("Utilisateur déjà existant"); 

        const hashedPassword = bcrypt.hashSync(password, 10); 
        db.run(
            "INSERT INTO users (username, password) VALUES (?, ?)", 
            [username, hashedPassword],
            function (err) {
                if (err) return callback(err.message);
                return callback(null, "Utilisateur inscrit avec succès");
            }
        );
    });
}

function connecterUtilisateur(username, password, callback) {
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => { 
        if (err) return callback("Erreur SQL : " + err.message);
        if (!user) return callback("Utilisateur non trouvé");

        const passwordCorrect = bcrypt.compareSync(password, user.password);
        if (!passwordCorrect) return callback("Mot de passe incorrect");

        const token = jwt.sign(
            { id: user.id, username: user.username },
            secretKey,
            { expiresIn: "1h" }
        );
        return callback(null, token);
    });
}

// pr Exporter les fonctions en gros les rendre réutilisables.s
module.exports = {
    inscrireUtilisateur,
    connecterUtilisateur
};

