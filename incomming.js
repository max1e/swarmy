let Scene = {
    width : 600, 
    height : 600, 
    walls : [], 
    swarm : [], 
    N : 200, 
    target : [300, 590], 
    globalBest : (0,0), 
    gbest_obj : Infinity,
    distance : Array.from({ length: 600 }, () => Array(600).fill(Infinity))
}

const fat = 1


class Wall {
    constructor(x1, y1, x2, y2){
        this.A = createVector(x1, y1)
        this.B = createVector(x2, y2)
    }

    draw() {
        strokeWeight(5)
        line(this.A.x, this.A.y, this.B.x, this.B.y)
    }
}

class Particle {

    constructor() {
        this.size = 5

        this.position = createVector(random(105, Scene.width - 105), random(105, Scene.height - 105));
        this.velocity = createVector(random(-1, 1), random(-1, 1));
        this.max_speed = 2;

        this.c1 = 1.5; // Cognitive coefficient: weight for particle's best
        this.c2 = 1.5; // Social coefficient: weight for swarm's best

        this.weight = 0.8; // Weight constant: how much particle keeps speed/direction

        this.personalBest = this.position.copy(); // Personal best position
        this.pbest_obj = objective_function(this.personalBest.x, this.personalBest.y); // Score of personal best position

        if (this.pbest_obj < Scene.gbest_obj) {
            Scene.gbest_obj = this.pbest_obj; // Global best score
            Scene.globalBest = this.personalBest.copy(); // Global best position
        }
    }
    
    draw() {
        strokeWeight(fat);
        fill(0);
        ellipse(this.position.x, this.position.y, this.size, this.size);
    }


    calculateParticleRepulsiveForce(A, B) {
        let repulsiveForce = createVector(0, 0);
    
        for (let other of Scene.swarm) {
            if (other === this)
                continue;
    
            const distance = dist(this.position.x, this.position.y, other.position.x, other.position.y);
    
            if (distance < this.size)  // Avoid division by zero or negative forces when too close
                continue;
    
            const direction = p5.Vector.sub(this.position, other.position).normalize();
            const strength = A * (distance - this.size) ** -B;
            const repulsion = p5.Vector.mult(direction, strength)
    
            repulsiveForce.add(repulsion);
        }

        return repulsiveForce;
    }

    calculateWallRepulsiveForce(A, B) {
        let nearestWall = this.findNearestWall();
        let distance = dist(this.position.x, this.position.y, nearestWall.x, nearestWall.y);

        if (distance < this.size / 2) {
            distance = this.size / 2;
        }

        const direction = p5.Vector.sub(this.position, nearestWall).normalize();
        const strength = A * (distance - this.size / 2) ** -B;
        const repulsion = p5.Vector.mult(direction, strength)

        return repulsion;
    }

    findNearestWall() {
        let closestWall = createVector(0, 0)
        for (let wall of Scene.walls) {
            const closestPoint = this.closestPointOnLine(wall.A, wall.B, this.position)
            if (dist(this.position.x, this.position.y, closestPoint.x, closestPoint.y) < dist(this.position.x, this.position.y, closestWall.x, closestWall.y)) {
                closestWall = closestPoint
            }
        }
        return closestWall
    }

    // Fucntion from ChatGPT
    closestPointOnLine(A, B, P) {
        // Vector AB
        let AB = p5.Vector.sub(B, A);
      
        // Vector AP
        let AP = p5.Vector.sub(P, A);
      
        // Project vector AP onto AB
        let t = AP.dot(AB) / AB.dot(AB);
      
        // Clamp t to the range [0, 1] to get the closest point on the line segment
        t = constrain(t, 0, 1);
      
        // Calculate the closest point
        let closest = p5.Vector.add(A, AB.mult(t));
        
        return closest;
      }

    step() {
        // Retention of motion
        const currentVelocityTerm = p5.Vector.mult(this.velocity, this.weight);

        // Particle cloud optimisation
        const r1 = random(0, 1);
        const r2 = random(0, 1);
        
        const personalBestTerm = p5.Vector.sub(this.personalBest, this.position).mult(this.c1 * r1);
        const globalBestTerm = p5.Vector.sub(Scene.globalBest, this.position).mult(this.c2 * r2);

        // Social forces
        const A = 5;
        const B = 1.06;

        const particleRepulsionForce = this.calculateParticleRepulsiveForce(A, B)
        const wallRepulsionForce = this.calculateWallRepulsiveForce(A, B)

        this.velocity = p5.Vector.add(currentVelocityTerm, personalBestTerm)
                                .add(globalBestTerm)
                                .add(particleRepulsionForce)
                                .add(wallRepulsionForce);
        
        // Restrictions
        this.velocity.limit(this.max_speed);
        // this.position.add(this.velocity)

        let new_x = this.position.x + this.velocity.x;
        let new_y = this.position.y + this.velocity.y;

        if (canUpdateX(new_x, this.position)) {
            this.position.x = new_x;
        }
        if (canUpdateY(new_y, this.position)) {
            this.position.y = new_y;
        }

        // Mob interaction
        // for (let other of Scene.swarm) {
        //     if (other === this) continue;

        //     const distance = dist(this.position.x, this.position.y, other.position.x, other.position.y);
        //     const minDist = 5;
        //     if (distance < this.size) {
        //         const overlap = this.size - distance;
        //         const angle = atan2(this.position.y - other.position.y, this.position.x - other.position.x);
        //         this.position.x += cos(angle) * overlap;
        //         this.position.y += sin(angle) * overlap;
        //     }
        // }

        this.position.x = constrain(this.position.x, 0, Scene.width);
        this.position.y = constrain(this.position.y, 0, Scene.height);

        let new_obj = objective_function(this.position.x, this.position.y);
        if (new_obj < this.pbest_obj) {
            this.personalBest = this.position.copy();
            this.pbest_obj = new_obj;

            if (this.pbest_obj < Scene.gbest_obj) {
                Scene.gbest_obj = this.pbest_obj;
                Scene.globalBest = this.personalBest.copy();
            }
        }
    }
}


// Check if X can be updated without collisions (assumes walls are defined with lowest values first)
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

// Check if Y can be updated without collisions (assumes walls are defined with lowest values first)
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


// Objective function: returns score based on position
function objective_function(x, y){
    //return dist( x, y, Scene.target[0], Scene.target[1] )
    return Scene.distance[Math.round(x)][Math.round(y)]
}

function getDistances(){
    Scene.distance[Scene.target[0]][Scene.target[1]] = 0
    
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  
    const queue = [[Scene.target[0], Scene.target[1]]]
    
    while(queue.length > 0) {
        const [x, y] =  queue.shift()
        for (const [dx, dy] of directions){
            const nx = x + dx
            const ny = y + dy
            
            if (nx >= 0 && nx < Scene.width && ny >= 0 && ny < Scene.height && Scene.distance[nx][ny] != 6666) {
                if (Scene.distance[nx][ny] > Scene.distance[x][y] + 1) {
                    Scene.distance[nx][ny] = Scene.distance[x][y] + 1
                    queue.push([nx, ny])
                }
            }
        }
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
                Scene.distance[x][y] = 6666 //idk
            }
        }
    }
}

function setup(){
	createCanvas( Scene.width, Scene.height )
    createWalls()  
  
    getDistances()
    print(Scene.distance)
  
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
}

function drawTarget(){
    strokeWeight(0)
    fill( 255, 0, 0 )
    ellipse( Scene.target[0], Scene.target[1], 7, 7 )
}