RAPPORT DE VEILLE TECHNOLOGIQUE

Sujet : Génération et gestion de labyrinthes dans une application Electron
Auteur : Kenza’s Sirag Omar
Date : Juin 2025

Dans le cadre d’un projet de groupe, nous avons développé une application de bureau en utilisant Electron, combiné à une base de données locale SQLite. L’objectif était de permettre aux utilisateurs de créer, résoudre et gérer des labyrinthes, tout en bénéficiant d’un système d’authentification sécurisé.
Responsable de la partie backend, je me suis principalement occupé de la gestion des utilisateurs, de la connexion à la base de données, de l’authentification avec bcryptjs et jsonwebtoken, ainsi que de la structuration des données liées aux labyrinthes
## 1. Recherche sur les applications similaires 

Applications étudiées :
NomDescription rapidePoints fortsLimites
Maze Generator (Web)Générateur visuel en ligneInterface rapideAucun compte, pas de personnalisation
Maze Generator (GitHub)Génération via algos DFS, Prim (Python CLI)Code open-source, algos variésPas d’interface graphique
Labyrinthe.ioJeu en ligne compétitifMultijoueur, fluidePas d’authentification, usage limité
Maze Builder (Android)Application mobile avec génération de labyrinthesPortable, intuitivePas de gestion utilisateur

Constat : La plupart des applications n’ont pas de base de données ou de gestion d’utilisateurs. Certaines ont une bonne génération de labyrinthe, mais pas de vraie interface.
Du coup, notre projet se distingue parce qu’il combine génération, résolution, interface, et utilisateurs.



## 2. Analyse des algorithmes utilisés

Génération (DFS, Prim, Kruskal) 
•DFS (Depth-First Search) : rapide, facile à coder, bon pour un chemin unique.
•Prim : génère des labyrinthes plus ramifiés, équilibrés.
•Kruskal : méthode aléatoire créant des labyrinthes très ouverts.

Avantage :
•Génération rapide
•Différents niveaux de complexité
Inconvénients :
•DFS → chemins simples
•Kruskal/Prim → complexité de mise en œuvre plus élevée

Résolution (DFS, A*) 
•DFS : explore tous les chemins jusqu'à trouver la sortie. Simple mais lent.
•A* : plus intelligent, utilise une heuristique pour aller plus vite vers la sortie.
Avantage :
•A* → chemin optimal
•DFS → facile à coder
Inconvénients :
•A* → plus coûteux en calculs
•DFS → pas toujours optimal

## 3. Propositions d’amélioration

Afin de continuer à faire évoluer notre application, voici des pistes concrètes d’amélioration :
1.Mode multijoueur local (1v1)
oDeux joueurs sur le même appareil qui s'affrontent pour résoudre un labyrinthe plus vite.
2.Ajout de thèmes visuels
oThèmes personnalisés (clair/sombre, rétro, fantasy…) pour améliorer l’expérience utilisateur.
3.Système de score
oTemps de résolution, nombre de mouvements, difficulté → pour créer un classement.
4.Mode contre-la-montre
oRésolution sous pression du temps avec pénalités pour erreurs.

## 4. Sources utilisées
•« https://www.youtube.com/watch?v=dm7cjNqmXvk&pp=ygUlaW5zdGFsbGF0aW9uIGV0IGluaXRpYWxpc2F0aW9uIGVuIEpTIA%3D%3D » pour l’initialisation du projet et les package.json.
• Npmjs.com pour la documentation sur les packages (bcryptjs, sqlite3, etc.)

•« https://www.youtube.com/watch?v=5qNfPBcogCs&pp=ygUvTm9kZS5qcyBiY3J5cHRqcyBKV1QgQXV0aGVudGljYXRpb24gZXhwbGljYXRpb24%3D» pour les JWT 

•«https://www.youtube.com/watch?v=JcnWDjYwe_w&pp=ygUZZmljaGllciBtYWluLmpzIGQndW5lIGFwcA%3D%3D» pour le main.js.

•ChatGPT, pour les explications techniques, corrections, structuration du code

Conclusion
Cette veille technologique m’a permis de prendre du recul sur notre solution et de comparer objectivement notre projet à des solutions existantes.
Le fait qu’il regroupe plusieurs fonctionnalités rarement réunies dans une seule application (authentification, génération, résolution, interface admin) le rend à la fois original et modulable. Les idées d’amélioration identifiées offrent de belles opportunités pour continuer à enrichir le projet, notamment vers une expérience de jeu plus complète et interactive.