let Scene = {
    width: 600,
    height: 600,
    walls: [],
    swarm: [],
    N: 200,
    target: [
        [300, 10],
        [300, 590]
    ],
    distance: [
        Array.from({ length: 600 }, () => Array(600).fill(Infinity)),
        Array.from({ length: 600 }, () => Array(600).fill(Infinity))
    ],
    grid: Array.from({ length: 600 }, () => Array(600).fill(0))
};

const FAT = 1;
let halftime = false;
let finished = false;

class Wall {
    constructor(x1, y1, x2, y2) {
        this.A = createVector(x1, y1);
        this.B = createVector(x2, y2);
    }

    draw() {
        strokeWeight(5);
        line(this.A.x, this.A.y, this.B.x, this.B.y);
    }

    obstructsView(particle1, particle2) {
        let x0 = particle1.getX();
        let y0 = particle1.getY();
        let x1 = particle2.getX();
        let y1 = particle2.getY();

        let dx = Math.abs(x1 - x0);
        let dy = Math.abs(y1 - y0);
        let sx = (x0 < x1) ? 1 : -1;
        let sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;

        while (true) {
            if (Scene.grid[y0][x0] === 1) {
                return true;
            }
            if (x0 === x1 && y0 === y1) {
                break;
            }
            let e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }
        return false;
    }
}

class Particle {
    constructor() {
        this.SIZE = 5;
        this.FIELD_OF_VIEW = 100;

        this.WEIGHT = 0.8;
        this.MAX_SPEED = 2;

        this.C1 = 1.5;
        this.C2 = 1;

        this.A = 5;
        this.B = 1.06;

        this.position = createVector(random(105, Scene.width - 105), random(105, Scene.height - 105));
        this.velocity = createVector(random(-1, 1), random(-1, 1));

        this.personalBest = this.position.copy();
        this.pbest_obj = objective_function(this.getX(), this.getY());
    }

    step() {
        this.velocity = this.calculateVelocity();

        let new_x = this.position.x + this.velocity.x;
        let new_y = this.position.y + this.velocity.y;

        if (canUpdateX(new_x, this.position)) {
            this.position.x = new_x;
        }
        if (canUpdateY(new_y, this.position)) {
            this.position.y = new_y;
        }

        this.position.x = constrain(this.position.x, 0, Scene.width);
        this.position.y = constrain(this.position.y, 0, Scene.height);

        let new_obj = objective_function(this.getX(), this.getY());
        if (new_obj < this.pbest_obj) {
            this.personalBest = this.position.copy();
            this.pbest_obj = new_obj;
        }
    }

    calculateVelocity() {
        const currentVelocityTerm = p5.Vector.mult(this.velocity, this.WEIGHT);

        const r1 = random(0, 1);
        const r2 = random(0, 1);

        const personalBestTerm = p5.Vector.sub(this.personalBest, this.position).mult(this.C1 * r1);
        const regionalBestTerm = p5.Vector.sub(this.getRegionalBest(), this.position).mult(this.C2 * r2);

        const particleRepulsionForce = this.calculateParticleRepulsiveForce(this.A, this.B);
        const wallRepulsionForce = this.calculateWallRepulsiveForce(this.A, this.B);

        const velocity = p5.Vector.add(currentVelocityTerm, personalBestTerm)
            .add(regionalBestTerm)
            .add(particleRepulsionForce)
            .add(wallRepulsionForce);

        return velocity.limit(this.MAX_SPEED);
    }

    draw() {
        strokeWeight(FAT);
        fill(0);
        ellipse(this.position.x, this.position.y, this.SIZE, this.SIZE);
    }

    calculateParticleRepulsiveForce(A, B) {
        let repulsiveForce = createVector(0, 0);

        for (let other of Scene.swarm) {
            if (other === this)
                continue;

            const distance = dist(this.position.x, this.position.y, other.position.x, other.position.y);

            if (distance < this.SIZE)
                continue;

            const direction = p5.Vector.sub(this.position, other.position).normalize();
            const strength = A * (distance - this.SIZE) ** -B;
            const repulsion = p5.Vector.mult(direction, strength);

            repulsiveForce.add(repulsion);
        }

        return repulsiveForce;
    }

    calculateWallRepulsiveForce(A, B) {
        let nearestWall = this.findNearestWall();
        let distance = dist(this.position.x, this.position.y, nearestWall.x, nearestWall.y);

        if (distance < this.SIZE / 2) {
            distance = this.SIZE / 2;
        }

        const direction = p5.Vector.sub(this.position, nearestWall).normalize();
        const strength = A * (distance - this.SIZE / 2) ** -B;
        const repulsion = p5.Vector.mult(direction, strength);

        return repulsion;
    }

    findNearestWall() {
        let closestWall = createVector(0, 0);
        for (let wall of Scene.walls) {
            const closestPoint = this.closestPointOnLine(wall.A, wall.B, this.position);
            if (dist(this.position.x, this.position.y, closestPoint.x, closestPoint.y) < dist(this.position.x, this.position.y, closestWall.x, closestWall.y)) {
                closestWall = closestPoint;
            }
        }
        return closestWall;
    }

    closestPointOnLine(A, B, P) {
        let AB = p5.Vector.sub(B, A);
        let AP = p5.Vector.sub(P, A);
        let t = AP.dot(AB) / AB.dot(AB);
        t = constrain(t, 0, 1);
        let closest = p5.Vector.add(A, AB.mult(t));
        return closest;
    }

    getRegionalBest() {
        const friends = this.getFriends(this.FIELD_OF_VIEW);

        if (friends.length == 0)
            return this.personalBest;

        const bestFriend = friends.reduce((best, current) => current.pbest_obj < best.pbest_obj ? current : best);
        return bestFriend.personalBest;
    }

    getFriends(fieldOfView) {
        return Scene.swarm
            .filter(it => it !== this)
            .filter(it => dist(this.position.x, this.position.y, it.position.x, it.position.y) <= fieldOfView)
            .filter(friend => Scene.walls.every(wall => !wall.obstructsView(this, friend)));
    }

    getX() {
        const roundedX = Math.round(this.position.x);
        return constrain(roundedX, 1, Scene.width - 1);
    }

    getY() {
        const roundedY = Math.round(this.position.y);
        return constrain(roundedY, 1, Scene.height - 1);
    }
}

function canUpdateX(new_x, current_pos) {
    for (let wall of Scene.walls) {
        if (current_pos.y > wall.A.y - 5 && current_pos.y < wall.B.y + 5) {
            if (new_x > wall.A.x - 5 && new_x < wall.B.x + 5) {
                return false;
            }
        }
    }
    return true;
}

function canUpdateY(new_y, current_pos) {
    for (let wall of Scene.walls) {
        if (current_pos.x > wall.A.x - 5 && current_pos.x < wall.B.x + 5) {
            if (new_y > wall.A.y - 5 && new_y < wall.B.y + 5) {
                return false;
            }
        }
    }
    return true;
}

function objective_function(x, y) {
    return Math.min(Scene.distance[0][x][y], Scene.distance[1][x][y]);
}

function getDistances() {
    Scene.distance = [
        Array.from({ length: Scene.width }, () => Array(Scene.height).fill(Infinity)),
        Array.from({ length: Scene.width }, () => Array(Scene.height).fill(Infinity))
    ];

    function calculateDistances(targetIndex) {
        const target = Scene.target[targetIndex];
        Scene.distance[targetIndex][target[0]][target[1]] = 0;

        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const queue = [[target[0], target[1]]];

        while (queue.length > 0) {
            const [x, y] = queue.shift();
            for (const [dx, dy] of directions) {
                const nx = x + dx;
                const ny = y + dy;

                if (nx >= 0 && nx < Scene.width && ny >= 0 && ny < Scene.height && Scene.grid[nx][ny] != 1) {
                    if (Scene.distance[targetIndex][nx][ny] > Scene.distance[targetIndex][x][y] + 1) {
                        Scene.distance[targetIndex][nx][ny] = Scene.distance[targetIndex][x][y] + 1;
                        queue.push([nx, ny]);
                    }
                }
            }
        }
    }

    // Calculate distances for each target
    for (let i = 0; i < Scene.target.length; i++) {
        calculateDistances(i);
    }
}


function createWalls(){
    Scene.walls = [
        new Wall(100, 100, 500, 100),
        new Wall(100, 100, 100, 500),
        new Wall(100, 500, 500, 500),
        new Wall(500, 100, 500, 275),
        new Wall(500, 325, 500, 500)
    ]
  
    for (let wall of Scene.walls) {
        for (let x = wall.A.x ; x <=wall.B.x ; x++) {
            for (let y = wall.A.y ; y <=wall.B.y ; y++) {
                Scene.grid[x][y] = 1
            }
        }
    }
}

function setup(){
	createCanvas( Scene.width, Scene.height )
    createWalls()  
  
    getDistances()
  
    Scene.swarm = []

	for (let i = 0; i < Scene.N; i++){
        Scene.swarm.push(new Particle())
	}
}

function draw(){
	background(220)

    for (let wall of Scene.walls) {
        wall.draw()
    }
    
    for(let particle of Scene.swarm){
        particle.step()
        particle.draw()
    }

    drawTarget()
    
    recordMetrics()
}

function recordMetrics() {
    const escapedParticles = Scene.swarm.filter(it => it.position.x > 500).length
    if (!halftime && escapedParticles >= Scene.N / 2) {
        print('Halftime: ' + millis() / 1000 + ' sec')
        halftime = true
    }
    if (!finished && escapedParticles >= Scene.N) {
        print('Finished: ' + millis() / 1000 + ' sec')
        finished = true
    }
}

function drawTarget(){
    strokeWeight(0);
    fill(255, 0, 0);
    for (let target of Scene.target) {
        ellipse(target[0], target[1], 7, 7);
    }
}