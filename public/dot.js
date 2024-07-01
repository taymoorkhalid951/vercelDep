
class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
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

    toward(other) {
        let dx = other.x - this.x;
        let dy = other.y - this.y;
        let magnitude = Math.sqrt(dx*dx + dy*dy);
        return new Vector2(dx/magnitude, dy/magnitude);
    }
}

class Dot {
    
    static clans           = {0: 'Red'    , 1: 'Cyan'    , 2: 'Green'    };
    static colors          = {0: '#ff0000', 1: '#00ffff' , 2: '#00ff00'  };
    static dots            = [];

    constructor(pos, radius, clan) {
        this.pos    = pos;
        this.radius = radius;
        this.clan   = clan;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = Dot.colors[this.clan];
        ctx.fill();
        ctx.closePath();
    }
}

