# Labyrinthe Master

**Application Desktop de Création et de Résolution de Labyrinthes**

Application desktop multiplateforme développée avec Electron permettant la création, résolution et gestion complète de labyrinthes avec interface d'administration.

---

## Installation

```bash
# 1. Cloner le projet
git clone "https://github.com/Berkan958/projet_labyrinthe_electron"
cd projet_labyrinthe_electron/FORUM

# 2. Installer les dépendances
npm install

# 3. Lancer l'application
npm start
```

---

## Technologies Utilisées

- Frontend : HTML5, CSS3, JavaScript
- Backend : Node.js + Electron
- Base de données : SQLite
- Authentification : bcryptjs + JWT
- Sécurité : Hachage des mots de passe, sessions sécurisées

---

## Fonctionnalités Principales

### Authentification
- Inscription avec hachage sécurisé des mots de passe
- Connexion et vérification des identifiants
- Gestion des sessions avec JWT

### Gestion des Labyrinthes (CRUD)
- Création : Automatique ou manuelle
- Édition : Modification des paramètres
- Suppression : Gestion des droits utilisateur
- Stockage : Format JSON dans SQLite

###  Génération Automatique
- Tailles : Petite (15×15), Moyenne (25×25), Grande (35×35)
- Difficulté : Échelle de 1 à 10
- Algorithmes : DFS, Prim, Kruskal

### Résolution Intelligente
- Algorithmes : DFS (simple), A* (optimal)
- Visualisation : Animation du chemin + surlignage
- Modes : Résolution automatique ou affichage de solution

### Interface Administrateur
- Gestion complète des utilisateurs
- Modération des labyrinthes
- Statistiques globales et export de données

---

## Architecture du Projet

### Backend (Racine)

#### `main.js`
- Point d'entrée de l'application Electron
- Création de la fenêtre principale
- Gestion du cycle de vie de l'application

#### `auth.js`
- Vérification de l'existence des utilisateurs
- Hachage des mots de passe avec bcrypt
- Comparaison des identifiants à la connexion
- Gestion des callbacks de résultat

#### `database.js`
- Initialisation SQLite avec clés étrangères
- Création automatique des tables (`users`, `labyrinthes`)
- Gestion des connexions et transactions

#### `Labyrinth.js`
- Génération : Algorithmes DFS, Prim, Kruskal
- Difficulté : Système 1-10 (facile → expert)
- Résolution : DFS simple, A* optimal
- Export : Coordonnées pour visualisation

#### `admin.js`
- Utilisateurs : Liste, suppression, édition, rôles
- Labyrinthes : Vue globale, modération
- Statistiques : Métriques et export de données
- Sécurité : Protection des privilèges admin

### Frontend (Renderer)

#### `index.html`
- Structure principale de l'application
- Sections : Auth, Dashboard, Création, Jeu, Admin
- Navigation par onglets dynamique
- Système de modales intégré

#### `app.js`
- Gestionnaires : Auth, Navigation, Labyrinthes, Admin
- Jeu : Contrôles clavier, rendu canvas, timer
- Communication* : API IPC avec le backend
- UX : Notifications et feedback utilisateur

#### `style.css`
- Thèmes : Mode sombre/clair
- Responsive : Adaptation multi-écrans
- Composants : Interface moderne et fluide
- Animations : Transitions et effets visuels

---

## Guide d'Utilisation

### Interface Utilisateur
1. Connexion/Inscription : Création de compte sécurisée
2. Dashboard : Vue d'ensemble des labyrinthes personnels
3. Création : Générateur automatique ou éditeur manuel
4. Jeu : Navigation au clavier avec timer intégré
5. Admin : Panel de gestion (utilisateurs privilégiés)

### Contrôles de Jeu
- ↑ ↓ ← → : Déplacement du personnage
- Résolution Auto : Animation automatique de la solution
- Voir Solution : Affichage du chemin optimal
- Reset : Redémarrage de la partie

---

## Équipe de Développement

| Développeur | Responsabilités |
|-------------|-----------------|
| Kenza's| Authentification, Base de données, Sécurité |
| Berkan | Algorithmes de génération & résolution |
| Mayles | Interface utilisateur, UX, Panel admin |

---

## Sécurité

- Hachage : bcryptjs pour les mots de passe
- Sessions : JWT pour l'authentification
- Isolation : Context isolation Electron
- Validation : Contrôle des permissions par rôle
- IPC : Communication sécurisée entre processus

---

## Fonctionnalités Techniques

### Génération de Labyrinthes
- Algorithmes de génération parfaite (sans cycles)
- Système de difficulté adaptatif
- Optimisation pour grandes grilles

### Résolution Automatique
- Pathfinding intelligent
- Visualisation temps réel
- Export des coordonnées de solution

### Interface d'Administration
- Gestion centralisée des utilisateurs
- Modération de contenu
- Analytics et statistiques détaillées