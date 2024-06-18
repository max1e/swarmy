
let Scene = {
    width : 600, 
    height : 600, 
    walls : [], 
    swarm : [], 
    N : 200, 
    target : [300, 590],
    distance : Array.from({ length: 600 }, () => Array(600).fill(Infinity)),
    grid : Array.from({ length: 600 }, () => Array(600).fill(0))
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

    obstructsView(particle1, particle2) {
        
        // Bresenham's line algorithm
        let x0 = particle1.getX()
        let y0 = particle1.getY()
        let x1 = particle2.getX()
        let y1 = particle2.getY()
        
        let dx = Math.abs(x1 - x0)
        let dy = Math.abs(y1 - y0)
        let sx = (x0 < x1) ? 1 : -1
        let sy = (y0 < y1) ? 1 : -1
        let err = dx - dy

        while (true) {
            // Check if the current cell is a wall
            if (Scene.grid[y0][x0] === 1) {
                return true
            }
          
            // Check if we reached the particle
            if (x0 === x1 && y0 === y1) {
                break
            }

            // Idrk what this part does but it works
            let e2 = 2 * err
            if (e2 > -dy) {
                err -= dy
                x0 += sx
            }
            if (e2 < dx) {
                err += dx
                y0 += sy
            }
        }
        return false;
    }
}

class Particle {

    constructor() {
        this.size = 5
        this.FIELD_OF_VIEW = 100

        this.position = createVector(random(105, Scene.width - 105), random(105, Scene.height - 105));
        this.velocity = createVector(random(-1, 1), random(-1, 1));
        this.max_speed = 2;

        this.c1 = 1.5; // Cognitive coefficient: weight for particle's best
        this.c2 = 1; // Social coefficient: weight for region's best

        this.weight = 0.8; // Weight constant: how much particle keeps speed/direction

        this.personalBest = this.position.copy(); // Personal best position
        this.pbest_obj = objective_function(this.getX(), this.getY()); // Score of personal best position
    }

    step() {
        // Retention of motion
        const currentVelocityTerm = p5.Vector.mult(this.velocity, this.weight);

        // Particle cloud optimisation
        const r1 = random(0, 1);
        const r2 = random(0, 1);
        
        const personalBestTerm = p5.Vector.sub(this.personalBest, this.position).mult(this.c1 * r1);
        const regionalBestTerm = p5.Vector.sub(this.getRegionalBest(), this.position).mult(this.c2 * r2);

        // Social forces
        const A = 5;
        const B = 1.06;

        const particleRepulsionForce = this.calculateParticleRepulsiveForce(A, B)
        const wallRepulsionForce = this.calculateWallRepulsiveForce(A, B)

        this.velocity = p5.Vector.add(currentVelocityTerm, personalBestTerm)
                                .add(regionalBestTerm)
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

        let new_obj = objective_function(this.getX(), this.getY());
        if (new_obj < this.pbest_obj) {
            this.personalBest = this.position.copy();
            this.pbest_obj = new_obj;
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

    getRegionalBest() {
        const friends = this.getFriends(this.FIELD_OF_VIEW)
        
        if (friends.length == 0)
            return this.personalBest
        
        const bestFriend = friends.reduce((best, current) => current.pbest_obj < best.pbest_obj ? current : best);
        return bestFriend.personalBest
    }

    getFriends(fieldOfView) {
        return Scene.swarm
            .filter(it => it !== this)
            .filter(it => dist(this.position.x, this.position.y, it.position.x, it.position.y) <= fieldOfView)
            .filter(friend => Scene.walls.every(wall => !wall.obstructsView(this, friend)));
    }

    getX() {
        const roundedX = Math.round(this.position.x)
        return constrain(roundedX, 1, Scene.width - 1)
    }

    getY() {
        const roundedY = Math.round(this.position.y)
        return constrain(roundedY, 1, Scene.height - 1)
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
    return Scene.distance[x][y]
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
            
            if (nx >= 0 && nx < Scene.width && ny >= 0 && ny < Scene.height && Scene.grid[nx][ny] != 1) {
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
}

function drawTarget(){
    strokeWeight(0)
    fill( 255, 0, 0 )
    ellipse( Scene.target[0], Scene.target[1], 7, 7 )
}
