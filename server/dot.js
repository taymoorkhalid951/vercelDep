


export class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    equals(other) {
        this.x = other.x
        this.y = other.y;
        return this;
    }

    add(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }

    subtract(other) {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }

    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    divide(scalar) {
        this.x /= scalar;
        this.y /= scalar;
        return this;
    }

    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    reverse() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    static reversed() {
        return new Vector2(-this.x, -this.y);
    }

    // takes in an angle in radians
    rotate(angle)  {
        let x = this.x * Math.cos(angle) - this.y * Math.sin(angle);
        let y = this.x * Math.sin(angle) + this.y * Math.cos(angle);
        this.x = x;
        this.y = y;
        return this;
    }

    rotateByDegrees(degrees) {
        return this.rotate(degrees * Math.PI / 180);
    }

    toAngle() {
        if (this.x >= 0 && this.y >= 0) {
            return Math.atan(this.y / this.x);
        } else if (this.x < 0 && this.y >= 0) {
            return Math.PI + Math.atan(this.y / this.x);
        } else if (this.x < 0 && this.y < 0) {
            return Math.PI + Math.atan(this.y / this.x);
        } else if (this.x >= 0 && this.y < 0) {
            return 2 * Math.PI + Math.atan(this.y / this.x);
        }
        return 0;
    }

    toward(other) {
        let dx = other.x - this.x;
        let dy = other.y - this.y;
        let magnitude = Math.sqrt(dx*dx + dy*dy);
        if (magnitude === 0 || magnitude === NaN) {
            return new Vector2(0.1, 0.1);
        }
        return new Vector2(dx/magnitude, dy/magnitude);
    }
}

function angleDifference(theta1, theta2) {
    let diff = theta2 - theta1;
    while (diff < -Math.PI) {
        diff += 2 * Math.PI;
    }
    while (diff > Math.PI) {
        diff -= 2 * Math.PI;
    }
    return diff;
}

// Dot.clans           = {0: 'red'    , 1: 'yellow'    , 2: 'green'    };
// Dot.colors          = {0: '#ff0000', 1: '#ffff00'   , 2: '#00ff00'  };
// Dot.dominated       = {0: [2], 1: [0], 2: [1]};
// Dot.dots            = [];

// calculate dominators based on Dot.dominated
// Dot.dominator = {};
// for (let clan in Dot.dominated) { Dot.dominator[clan] = [];}

// for (let clan in Dot.dominated) {
//     for (let dom of Dot.dominated[clan]) {
//         Dot.dominator[dom].push(clan);
//     }
// }

export class Dot {
    static id = 0;

    constructor(pos, radius, clan, speed, turnSpeed) {
        if (Dot.id === undefined) {
            Dot.id = 0;
        }
        this.id         = Dot.id++;
        this.ticks      = 0;
        this.avoidTicks = Math.floor(Math.random() * 240 * 1 + 240 * 1);
        this.avoid  = false; // false means left, true means right
        this.state  = 0; // 0 = wander, 1 = persuit, 2 = evade
        this.angle  = Math.random() * Math.PI * 2;
        this.pos    = pos;
        this.radius = radius;
        this.clan   = clan;
        this.speed  = speed;
        this.turnSpeed = turnSpeed;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = Dot.colors[this.clan];
        ctx.fill();
        ctx.closePath();
    }

    closestDominated() {
        let closest = null;
        let distance = Infinity;

        // first filter dots that are dominated by this dot's clan
        let dominateds = Dot.dots.filter(dot => Dot.dominator[this.clan].includes(dot.clan));
        
        for (let dot of dominateds) {
            if (dot === this) {
                continue;
            }
            let d = this.pos.distanceTo(dot.pos);
            if (d < distance) {
                distance = d;
                closest  = dot;
            }
        }
        return closest;
    }

    closestDominator() {
        let closest = null;
        let distance = Infinity;

        // first filter dots that are dominators of this dot's clan
        let dominators = Dot.dots.filter(dot => Dot.dominated[this.clan].includes(dot.clan));
        
        for (let dot of dominators) {
            if (dot === this) {
                continue;
            }
            let d = this.pos.distanceTo(dot.pos);
            if (d < distance) {
                distance = d;
                closest  = dot;
            }
        }
        return closest;
    }

    smartMovement(canvas, deltaTime) {
        let wanderDifference = (Math.random() * Math.PI / 6 - Math.PI / 12);

        let center = this.pos.toward(new Vector2(Math.round(canvas.width / 2), Math.round(canvas.height / 2)));
        center.y = -center.y;
        let centerAngle = center.toAngle();
        let vector;

        let dominated = this.closestDominated();
        let pursueAngle = null;
        if (dominated) {
            vector = this.pos.toward(dominated.pos);
            vector.y = -vector.y;
            pursueAngle = vector.toAngle();
        }

        let dominator = this.closestDominator();
        let evadeAngle = null;
        if (dominator) {
            if (this.avoidTicks > 0) {
                this.avoidTicks--;
            } else {
                this.avoidTicks = Math.floor(Math.random() * 240 * 1 + 240 * 1);
                this.avoid = !this.avoid;
            }
            vector = this.pos.toward(dominator.pos)
            vector.y = -vector.y;
            if (this.avoid) {
                vector.rotateByDegrees(135);
            } else {
                vector.rotateByDegrees(-135);
            }
            evadeAngle = vector.toAngle();
        }

        if (evadeAngle === null) {
            evadeAngle = pursueAngle;
        }

        if (pursueAngle === null) {
            pursueAngle = evadeAngle;
        }

        this.angle = angleDifference(0, this.angle + (wanderDifference * 0.08 + angleDifference(this.angle, centerAngle) * 0.02 + angleDifference(this.angle, pursueAngle) * 0.6  + angleDifference(this.angle, evadeAngle) * 0.3) * this.turnSpeed * deltaTime);
        
        let unit = new Vector2(Math.cos(this.angle), -Math.sin(this.angle));
        this.pos.add(unit.multiply(this.speed * deltaTime));
    }

    move(canvas, deltaTime) {
        this.smartMovement(canvas, deltaTime);
        // this.ticks++;
        // if (this.ticks > this.stateTicks) {
        //     this.ticks = 0;
        //     this.state = Math.floor(Math.random() * 3);
        //     // set ticks to stay in each state
        //     switch (this.state) {
        //         case 0:
        //             this.stateTicks = Math.floor(Math.random() * 240 * 7 + 240 * 0.5);
        //             break;
        //         case 1:
        //             this.stateTicks = Math.floor(Math.random() * 240 * 2 + 240 * 0.5);
        //             break;
        //         case 2:
        //             this.stateTicks = Math.floor(Math.random() * 240 * 1.5);
        //             break;
        //     }
        // }

        // switch (this.state) {
        // case 0:
        //     this.wander(canvas, deltaTime);
        //     break;
        // case 1:
        //     if (!this.pursuit(canvas, deltaTime)) {
        //         this.wander(canvas, deltaTime);
        //     }
        //     break;
        // case 2:
        //     if (!this.evade(canvas, deltaTime)) {
        //         this.wander(canvas, deltaTime);
        //     }
        //     break;
        // }
        this.handleWall(canvas);
    }

    pursuit(canvas, deltaTime) {
        let closest = this.closestDominated();
        if (closest) {
            let unit = this.pos.toward(closest.pos);
            this.pos.add(unit.multiply(this.speed * deltaTime));
            return true;
        }
        return false;
    }

    evade(canvas, deltaTime) {
        let closest = this.closestDominator();
        if (closest) {
            let center = this.pos.toward(new Vector2(Math.round(canvas.width / 2), Math.round(canvas.height / 2)));
            center.y = -center.y;
            let unit = this.pos.toward(closest.pos).multiply(0.15).add(center.multiply(0.85));
            this.pos.subtract(unit.multiply(this.speed * deltaTime));
            return true;
        }
        return false;
    }

    wander(canvas, deltaTime) {
        // move the angle slightly and move toward that
        this.angle += (Math.random() * Math.PI * 32 - Math.PI * 16) * deltaTime;
        this.angle %= Math.PI * 2;
        if (this.angle < 0) {
            this.angle += Math.PI * 2;
        }
        if (this.angle > Math.PI * 2) {
            this.angle -= Math.PI * 2;
        }
        let center = this.pos.toward(new Vector2(Math.round(canvas.width / 2), Math.round(canvas.height / 2)));
        center.y = -center.y;
        let centerAngle = Math.atan2(center.y, center.x);
        if (centerAngle < 0) {
            centerAngle += Math.PI * 2;
        }
        if (this.angle == NaN) {
            angle = Math.random() * Math.PI * 2;
        }
        if (centerAngle == NaN) {
            centerAngle = this.angle;
        }
        
        this.angle = 0.995 * this.angle + 0.005 * centerAngle;
        let unit = new Vector2(Math.cos(this.angle), -Math.sin(this.angle));
        this.pos.add(unit.multiply(this.speed * deltaTime));
    }

    handleWall(canvas) {
        if (this.pos.x + this.radius > canvas.width) {
            this.pos.x = canvas.width - this.radius;
        }
        if (this.pos.x - this.radius < 0) {
            this.pos.x = this.radius;
        }
        if (this.pos.y + this.radius > canvas.height) {
            this.pos.y = canvas.height - this.radius;
        }
        if (this.pos.y - this.radius < 0) {
            this.pos.y = this.radius;
        }
    }

    static handleCollision(dotA, dotB, canvas, deltaTime) {
        dotB.attachedOutOf(dotA);
        if (dotA.clan === dotB.clan) {
            return;
        }
        if (Dot.dominator[dotA.clan].includes(dotB.clan)) {
            dotB.clan = dotA.clan;
        } else if (Dot.dominator[dotB.clan].includes(dotA.clan)) {
            dotA.clan = dotB.clan;
        }
        dotA.handleWall(canvas);
        dotB.handleWall(canvas);
    }

    isCollidingWith(other) {
        const dx = this.pos.x - other.pos.x;
        const dy = this.pos.y - other.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + other.radius - 0.0001;
    }

    attachedOutOf(other) {
        let unit     = this.pos.toward(other.pos);
        let distance = this.radius + other.radius;
        this.pos.equals(other.pos).subtract(unit.multiply(distance));
    }
}
