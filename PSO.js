let Scene = {
    width : 600, 
    height : 600, 
    walls : [], 
    swarm : [], 
    N : 200, 
    target : [590, 300], 
    globalBest : (0,0), 
    gbest_obj : Infinity
}

const fat = 1


class Wall {
    constructor(x1, y1, x2, y2){
        this.x1 = x1
        this.y1 = y1
        this.x2 = x2
        this.y2 = y2
    }

    draw(){
        strokeWeight(5)
        line(this.x1, this.y1, this.x2, this.y2)
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


    calculateParticleRepulsiveForce() {
        const A = 0.36;
        const B = 1.06;
        let repulsiveForce = createVector(0, 0);  // Initialize force as a 2D vector
    
        for (let other of Scene.swarm) {
            if (other === this)
                continue;
    
            const distance = dist(this.position.x, this.position.y, other.position.x, other.position.y);
    
            if (distance < this.size)  // Avoid division by zero or negative forces when too close
                continue;
    
            const repulsive_component = A * B * Math.pow(distance - this.size, -B - 1);

            const direction = p5.Vector.sub(this.position, other.position).normalize();
            const repulsion = p5.Vector.mult(direction, repulsive_component)
    
            repulsiveForce.add(repulsion);  // Sum up the forces
        }
        return repulsiveForce;
    }

    calculateWallRepulsiveForce() {
        
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
        const particleRepulsionForce = this.calculateParticleRepulsiveForce()
        const wallRepulsionForce = 0

        this.velocity = p5.Vector.add(currentVelocityTerm, personalBestTerm).add(globalBestTerm).add(particleRepulsionForce);


        // Restrictions
        this.avoidWalls();
        
        this.velocity.limit(this.max_speed);
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
        //     if (distance < minDist) {
        //         const overlap = minDist - distance;
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

        // let acceleration = mass * (((this.max_speed * direction) - velocity) / relaxation_time)
        // const A = 1
        // const B = 1

        // const distance = dist(this.position.x, this.position.y, other.position.x, other.position.y);

        // let particle_repulsion = 0
        // for (other in Scene.swarm) {
        //     if (other === this) continue;
        //     summie += -A*(distance - fat)^-B
        // }
    }

    avoidWalls() {
        for (let wall of Scene.walls) {
            let wallCenter = createVector((wall.x1 + wall.x2) / 2, (wall.y1 + wall.y2) / 2);
            let distance = dist(this.position.x, this.position.y, wallCenter.x, wallCenter.y);
            let minDist = 50; // Distance threshold for wall avoidance
            if (distance < minDist) {
                let repulseForce = p5.Vector.sub(this.position, wallCenter);
                repulseForce.setMag((minDist - distance) / minDist * this.max_speed * 2); // Increase the strength of the repulsive force
                this.velocity.add(repulseForce);
            }
        }
    }
}


// Check if X can be updated without collisions (assumes walls are defined with lowest values first)
function canUpdateX(new_x, current_pos) {
    for (let wall of Scene.walls) {
        if (current_pos.y > wall.y1 - 5 && current_pos.y < wall.y2 + 5) {
            if (new_x > wall.x1 - 5 && new_x < wall.x2 + 5) {
                return false;
            }
        }
    }
    return true;
}

// Check if Y can be updated without collisions (assumes walls are defined with lowest values first)
function canUpdateY(new_y, current_pos) {
    for (let wall of Scene.walls) {
        if (current_pos.x > wall.x1 - 5 && current_pos.x < wall.x2 + 5) {
            if (new_y > wall.y1 - 5 && new_y < wall.y2 + 5) {
                return false;
            }
        }
    }
    return true;
}


// Objective function: returns score based on position
function objective_function(x, y){
    return dist( x, y, Scene.target[0], Scene.target[1] )
}

function setup(){
    Scene.swarm = []
    Scene.walls = []
  
	createCanvas( Scene.width, Scene.height )
    
    // Create walls
    Scene.walls.push (new Wall(100, 100, 500, 100))
    Scene.walls.push (new Wall(100, 100, 100, 500))
    Scene.walls.push (new Wall(100, 500, 500, 500))
    
    Scene.walls.push (new Wall(500, 100, 500, 275))
    Scene.walls.push (new Wall(500, 325, 500, 500))
  
	for (let i = 0; i < Scene.N; i++){
        Scene.swarm.push(new Particle())
	}
}

function draw(){
	background(220)
    
    run_model()
}

function run_model(){
    for(let particle of Scene.swarm){
        particle.step()
        particle.draw()
    }
      
    for (let wall of Scene.walls) {
        wall.draw()
    }
      
    // Print the target spot as a red dot
    strokeWeight(0)
    fill( 255, 0, 0 )
    ellipse( Scene.target[0], Scene.target[1], 7, 7 )
}