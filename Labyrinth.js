class Labyrinth {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = this.initializeGrid();
        this.startNode = null;
        this.endNode = null;
    }

    initializeGrid() {
        const grid = [];
        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                row.push({
                    x,
                    y,
                    isWall: true,
                    visited: false,
                    parent: null,
                    gScore: Infinity,
                    fScore: Infinity,
                    isPath: false,
                    isStart: false,
                    isEnd: false,
                    walls: { top: true, right: true, bottom: true, left: true }
                });
            }
            grid.push(row);
        }
        return grid;
    }

    // Ajoutez ces méthodes à votre classe Labyrinth ou remplacez generateMaze :

generateMaze(startX = 0, startY = 0, difficulty = 5) {
    this.grid = this.initializeGrid();
    this.difficulty = difficulty;
    
    // Générer le labyrinthe de base
    this.generateBaseMaze(startX, startY);
    
    // Appliquer la difficulté
    this.applyDifficulty(difficulty);
    
    // Définir start et end
    this.setStartNode(0, 0);
    this.setEndNode(this.width - 1, this.height - 1);
    
    this.resetVisitedForSolving();
    return this.grid;
}

generateBaseMaze(startX, startY) {
    const stack = [];
    let current = this.grid[startY][startX];
    current.isWall = false;
    current.visited = true;
    stack.push(current);

    while (stack.length > 0) {
        current = stack.pop();
        const neighbors = this.getUnvisitedNeighborsForGeneration(current.x, current.y);

        if (neighbors.length > 0) {
            stack.push(current);
            const randomIndex = Math.floor(Math.random() * neighbors.length);
            const chosenNeighbor = neighbors[randomIndex];

            this.removeWall(current, chosenNeighbor);

            chosenNeighbor.isWall = false;
            chosenNeighbor.visited = true;
            stack.push(chosenNeighbor);
        }
    }
}

applyDifficulty(difficulty) {
    // Difficulté 1-3 : Facile - Créer des raccourcis
    if (difficulty <= 3) {
        this.createShortcuts(0.3 - (difficulty * 0.05)); // Plus de raccourcis pour difficulté 1
    }
    // Difficulté 4-6 : Moyen - Labyrinthe normal
    else if (difficulty <= 6) {
        this.createShortcuts(0.1); // Quelques raccourcis
    }
    // Difficulté 7-8 : Difficile - Créer des impasses
    else if (difficulty <= 8) {
        this.createDeadEnds(0.2 + (difficulty - 7) * 0.1);
    }
    // Difficulté 9-10 : Expert - Plus d'impasses et de complexité
    else {
        this.createDeadEnds(0.4);
        this.addComplexPaths();
    }
}

createShortcuts(percentage) {
    const wallCells = [];
    
    // Trouver tous les murs qui pourraient devenir des passages
    for (let y = 1; y < this.height - 1; y++) {
        for (let x = 1; x < this.width - 1; x++) {
            if (this.grid[y][x].isWall) {
                // Vérifier si créer un passage ici connecterait deux zones
                const neighbors = this.getAdjacentPassages(x, y);
                if (neighbors.length >= 2) {
                    wallCells.push(this.grid[y][x]);
                }
            }
        }
    }
    
    // Créer des raccourcis aléatoirement
    const shortcutsToCreate = Math.floor(wallCells.length * percentage);
    for (let i = 0; i < shortcutsToCreate; i++) {
        const randomWall = wallCells[Math.floor(Math.random() * wallCells.length)];
        if (randomWall && randomWall.isWall) {
            randomWall.isWall = false;
            // Retirer de la liste pour éviter les doublons
            const index = wallCells.indexOf(randomWall);
            if (index > -1) wallCells.splice(index, 1);
        }
    }
}

createDeadEnds(percentage) {
    const passages = [];
    
    // Trouver tous les passages
    for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
            if (!this.grid[y][x].isWall && !this.grid[y][x].isStart && !this.grid[y][x].isEnd) {
                passages.push(this.grid[y][x]);
            }
        }
    }
    
    // Créer des impasses en bloquant certains passages
    const deadEndsToCreate = Math.floor(passages.length * percentage);
    for (let i = 0; i < deadEndsToCreate; i++) {
        const randomPassage = passages[Math.floor(Math.random() * passages.length)];
        if (randomPassage && !randomPassage.isWall) {
            // Vérifier que ce n'est pas sur le chemin principal
            if (!this.isOnMainPath(randomPassage)) {
                this.createDeadEndAt(randomPassage.x, randomPassage.y);
            }
        }
    }
}

getAdjacentPassages(x, y) {
    const passages = [];
    const directions = [
        { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, 
        { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
    ];
    
    directions.forEach(dir => {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
            if (!this.grid[ny][nx].isWall) {
                passages.push(this.grid[ny][nx]);
            }
        }
    });
    
    return passages;
}

isOnMainPath(cell) {
    // Vérification simple : la cellule a-t-elle plus d'une connexion ?
    const connections = this.getAdjacentPassages(cell.x, cell.y);
    return connections.length > 1;
}

createDeadEndAt(x, y) {
    // Créer une impasse en ajoutant des murs autour sauf une direction
    const directions = [
        { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, 
        { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
    ];
    
    // Garder une seule sortie aléatoire
    const keepOpen = Math.floor(Math.random() * directions.length);
    
    directions.forEach((dir, index) => {
        if (index !== keepOpen) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            if (nx > 0 && nx < this.width - 1 && ny > 0 && ny < this.height - 1) {
                if (!this.grid[ny][nx].isStart && !this.grid[ny][nx].isEnd) {
                    this.grid[ny][nx].isWall = true;
                }
            }
        }
    });
}

addComplexPaths() {
    // Pour les niveaux experts, ajouter des chemins en spirale ou des boucles
    const centerX = Math.floor(this.width / 2);
    const centerY = Math.floor(this.height / 2);
    
    // Créer quelques chemins en spirale autour du centre
    for (let radius = 3; radius < Math.min(this.width, this.height) / 3; radius += 4) {
        this.createSpiralPath(centerX, centerY, radius);
    }
}

createSpiralPath(centerX, centerY, radius) {
    const points = [];
    const steps = radius * 8; // Nombre de points sur le cercle
    
    for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * 2 * Math.PI;
        const x = Math.round(centerX + radius * Math.cos(angle));
        const y = Math.round(centerY + radius * Math.sin(angle));
        
        if (x > 0 && x < this.width - 1 && y > 0 && y < this.height - 1) {
            points.push({ x, y });
        }
    }
    
    // Créer des passages pour quelques points aléatoires
    const pointsToCreate = Math.floor(points.length * 0.3);
    for (let i = 0; i < pointsToCreate; i++) {
        const point = points[Math.floor(Math.random() * points.length)];
        if (this.grid[point.y][point.x].isWall) {
            this.grid[point.y][point.x].isWall = false;
        }
    }
}

// Méthode utilitaire pour obtenir des informations sur la difficulté
getDifficultyInfo(difficulty) {
    const difficultyLevels = {
        1: { name: "Très Facile", description: "Beaucoup de raccourcis", color: "#10b981" },
        2: { name: "Facile", description: "Quelques raccourcis", color: "#22c55e" },
        3: { name: "Facile+", description: "Peu de raccourcis", color: "#84cc16" },
        4: { name: "Moyen-", description: "Labyrinthe équilibré", color: "#eab308" },
        5: { name: "Moyen", description: "Labyrinthe standard", color: "#f59e0b" },
        6: { name: "Moyen+", description: "Légèrement plus complexe", color: "#f97316" },
        7: { name: "Difficile", description: "Quelques impasses", color: "#ef4444" },
        8: { name: "Difficile+", description: "Plus d'impasses", color: "#dc2626" },
        9: { name: "Expert", description: "Très complexe", color: "#b91c1c" },
        10: { name: "Maître", description: "Extrêmement difficile", color: "#7f1d1d" }
    };
    
    return difficultyLevels[difficulty] || difficultyLevels[5];
}

    getUnvisitedNeighborsForGeneration(x, y) {
        const neighbors = [];
        // Vérifier les voisins à distance 2 pour créer des passages
        if (y > 1 && this.grid[y - 2][x].visited === false) neighbors.push(this.grid[y - 2][x]);
        if (x < this.width - 2 && this.grid[y][x + 2].visited === false) neighbors.push(this.grid[y][x + 2]);
        if (y < this.height - 2 && this.grid[y + 2][x].visited === false) neighbors.push(this.grid[y + 2][x]);
        if (x > 1 && this.grid[y][x - 2].visited === false) neighbors.push(this.grid[y][x - 2]);
        
        return neighbors;
    }

    removeWall(cellA, cellB) {
        const dx = cellA.x - cellB.x;
        const dy = cellA.y - cellB.y;

        // Enlever le mur entre cellA et cellB ET la cellule intermédiaire
        if (dx === 2) { // cellB est à gauche de cellA
            cellA.walls.left = false;
            cellB.walls.right = false;
            // Enlever aussi le mur de la cellule intermédiaire
            const middleCell = this.grid[cellA.y][cellA.x - 1];
            middleCell.isWall = false;
            middleCell.walls.left = false;
            middleCell.walls.right = false;
        } else if (dx === -2) { // cellB est à droite de cellA
            cellA.walls.right = false;
            cellB.walls.left = false;
            const middleCell = this.grid[cellA.y][cellA.x + 1];
            middleCell.isWall = false;
            middleCell.walls.left = false;
            middleCell.walls.right = false;
        }

        if (dy === 2) { // cellB est au-dessus de cellA
            cellA.walls.top = false;
            cellB.walls.bottom = false;
            const middleCell = this.grid[cellA.y - 1][cellA.x];
            middleCell.isWall = false;
            middleCell.walls.top = false;
            middleCell.walls.bottom = false;
        } else if (dy === -2) { // cellB est en-dessous de cellA
            cellA.walls.bottom = false;
            cellB.walls.top = false;
            const middleCell = this.grid[cellA.y + 1][cellA.x];
            middleCell.isWall = false;
            middleCell.walls.top = false;
            middleCell.walls.bottom = false;
        }

        cellA.isWall = false;
        cellB.isWall = false;
    }

    resetVisitedForSolving() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x].visited = false;
                this.grid[y][x].parent = null;
                this.grid[y][x].isPath = false;
            }
        }
    }

    // CORRECTION : Les paramètres sont x, y (pas y, x)
    setStartNode(x, y) {
        if (this.startNode) {
            this.grid[this.startNode.y][this.startNode.x].isStart = false;
        }
        this.startNode = this.grid[y][x];
        this.grid[y][x].isStart = true;
        this.grid[y][x].isWall = false;
    }

    setEndNode(x, y) {
        if (this.endNode) {
            this.grid[this.endNode.y][this.endNode.x].isEnd = false;
        }
        this.endNode = this.grid[y][x];
        this.grid[y][x].isEnd = true;
        this.grid[y][x].isWall = false;
    }

    solveMazeDFS() {
        if (!this.startNode || !this.endNode) {
            console.error("Start or end node not set.");
            return null;
        }

        this.resetVisitedForSolving();
        const stack = [];
        stack.push(this.startNode);
        this.startNode.visited = true;

        while (stack.length > 0) {
            const current = stack.pop();

            if (current === this.endNode) {
                return this.reconstructPath(current);
            }

            const neighbors = this.getValidNeighborsForSolving(current.x, current.y);
            for (const neighbor of neighbors) {
                if (!neighbor.visited) {
                    neighbor.visited = true;
                    neighbor.parent = current;
                    stack.push(neighbor);
                }
            }
        }
        return null;
    }

    getValidNeighborsForSolving(x, y) {
        const neighbors = [];
        const currentCell = this.grid[y][x];

        // Vérifier les 4 directions
        if (y > 0 && !currentCell.walls.top && !this.grid[y - 1][x].isWall) {
            neighbors.push(this.grid[y - 1][x]);
        }
        if (x < this.width - 1 && !currentCell.walls.right && !this.grid[y][x + 1].isWall) {
            neighbors.push(this.grid[y][x + 1]);
        }
        if (y < this.height - 1 && !currentCell.walls.bottom && !this.grid[y + 1][x].isWall) {
            neighbors.push(this.grid[y + 1][x]);
        }
        if (x > 0 && !currentCell.walls.left && !this.grid[y][x - 1].isWall) {
            neighbors.push(this.grid[y][x - 1]);
        }
        
        return neighbors.filter(n => !n.visited);
    }

    reconstructPath(endNode) {
        const path = [];
        let current = endNode;
        while (current !== null) {
            current.isPath = true;
            path.unshift(current);
            current = current.parent;
        }
        return path;
    }

    static getSizes() {
        return {
            petite: { width: 11, height: 11 },
            moyenne: { width: 21, height: 21 },
            grande: { width: 31, height: 31 }
        };
    }
}

module.exports = Labyrinth;