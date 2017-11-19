'use strict';
class Vector {
  constructor(x=0, y=0) {
    this.x = x;
    this.y = y;
  }
  
  plus(vector) {
  	if (!(vector instanceof Vector)) {
  		throw new Error('Можно прибавлять к вектору только вектор типа Vector')
  	}

    return new Vector(this.x + vector.x, this.y + vector.y);
  }
  
  times(number) {
    return new Vector(this.x * number, this.y * number);
  }
}

class Actor {
  constructor(pos=new Vector(0,0), size=new Vector(1,1), speed=new Vector(0,0)) {
    if (!(pos instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
        throw new Error('pos, size, speed are not instanceof Actor');
    }
    
    this.pos = pos;
    this.size = size;
    this.speed = speed;
  }
  
  act() {}
  
  get left() {
    return this.pos.x;
  }
  
  get top() {
      return this.pos.y;    
  }
  
  get right() {
    return this.pos.x + this.size.x;
  }
  
  get bottom() {
    return this.pos.y + this.size.y;
  }
  
  get type() {
    return 'actor';
  }
  
  isIntersect(actor) {
    if (!(actor instanceof Actor)) {
      throw new Error('actor is not instanceof Actor');
    }
    
    if (actor === this) {
        return false;
    }

    if (this.left === actor.right
    	|| this.right === actor.left
    	|| this.top === actor.bottom
    	|| this.bottom === actor.top) {
    	return false;
    }

    if ((this.left === actor.left
    	|| this.right === actor.right
    	|| this.top === actor.top
    	|| this.bottom === this.bottom) && actor.bottom < 0 && actor.right < 0 ) {
    	return false;
    }

    return (
      (
        ( this.left>=actor.left && this.left<=actor.right )
        ||( this.right>=actor.left && this.right<=actor.right  )
      ) && (
        ( this.top>=actor.top && this.top<=actor.bottom )
        ||( this.bottom>=actor.top && this.bottom<=actor.bottom )
      )
    )||(
      (
        ( actor.left>=this.left && actor.left<=this.right )
        ||( actor.right>=this.left && actor.right<=this.right  )
      ) && (
        ( actor.top>=this.top && actor.top<=this.bottom )
        ||( actor.bottom>=this.top && actor.bottom<=this.bottom )
      ) 
  	)||(
    (
      (
        ( this.left>=actor.left && this.left<=actor.right )
        ||( this.right>=actor.left && this.right<=actor.right  )
      ) && (
        ( actor.top>=this.top && actor.top<=this.bottom )
        ||( actor.bottom>=this.top && actor.bottom<=this.bottom )
      )
    )||(
      (
        ( actor.left>=this.left && actor.left<=this.right )
        ||( actor.right>=this.left && actor.right<=this.right  )
      ) && (
        ( this.top>=actor.top && this.top<=actor.bottom )
        ||( this.bottom>=actor.top && this.bottom<=actor.bottom )
      )
    )
  );
  }
}

class Level {
  constructor(grid, actors) {
    this._grid = grid || [];
    this.actors = actors || [];
    
    this.actors.forEach(actor => {
        if (actor.type === 'player') {
          this._player = actor;
        }
    });
    
    this.status = null;
    this.finishDelay = 1;
  }
  
  get grid() {
    return this._grid;
  }
  
  set grid(newValue) {
    this._grid = newValue;
  }
  
  get player() {
    return this._player;
  }
  
  get height() {
    return this.grid.length;
  }
  
  get width() {
    let rowWidths = this.grid.map(row => {
      return row.length;
    });
    
    return rowWidths.length === 0 ? 0 : Math.max(...rowWidths);
  }
  
  isFinished() {
    return this.status !== null && this.finishDelay < 0;
  }
  
  actorAt(actor) {
    if (!actor || !(actor instanceof Actor)) {
      throw new Error('actor is not instanceof Actor');
    }
    
    let result;
    this.actors.forEach(a => {
      if (actor.isIntersect(a)) {
        result = a;
        return;
      }
    })
    
    return result;
  }
  
  obstacleAt(pos, size) {
    if (!(pos instanceof Vector) || !(size instanceof Vector)) {
      throw new Error('pos or size are not instanceof Vector');
    }

    if (pos.x < 0 || (pos.x + size.x >= this.width) || pos.y < 0 )  {
      return 'wall';
    } else if (pos.y + size.y >= this.height) {
      return 'lava';
    }
    
    let rowStart = Math.floor(pos.y);
    let rowEnd = Math.ceil(pos.y + size.y);
    let colStart = Math.floor(pos.x);
    let colEnd = Math.ceil(pos.x + size.x);

    for (let rowIndex = rowStart; rowIndex < rowEnd; rowIndex++) {
      for (let colIndex = colStart; colIndex < colEnd; colIndex++) {
        let row = this.grid[rowIndex];
        if (row) {
        	let obj = row[colIndex];
        	if (obj) return obj;
        }
      }
    }

    return undefined;
  }
  
  removeActor(actor) {
    let indexActor = this.actors.indexOf(actor);
    if (indexActor > -1) {
      this.actors.splice(indexActor, 1);
    }
  }
  
  noMoreActors(type) {
    let actors = [];
    this.actors.forEach(actor => {
        if (actor.type === type) {
          actors.push(actor);
        }
    })
    
    return actors.length === 0;
  }
  
  playerTouched(type, actor=undefined) {
    if (this.status !== null) {
      return;
    }
    
    if (type === 'lava' || type === 'fireball') {
      this.status = 'lost';
    }
    
    if (type === 'coin' && actor.type === 'coin') {
      this.removeActor(actor);
      
      if (this.noMoreActors('coin')) {
        this.status = 'won';
      }
    }
  }
}

class LevelParser {
  constructor(actorsMap) {
    this.actorsMap = actorsMap;
    
    this._symbolMap = new Map();
    this._symbolMap
      .set('x', 'wall')
      .set('!', 'lava')
      .set('@', 'Player')
      .set('o', 'Coin')
      .set('=', 'HorizontalFireball')
      .set('|', 'VerticalFireball')
      .set('v', 'Fireball');
  }
  
  actorFromSymbol(symbol) {
  	if (!symbol) {
  		return undefined;
  	}

    return this.actorsMap[symbol];
  }
  
  obstacleFromSymbol(symbol) {
    return this._symbolMap.get(symbol);
  }
  
  createGrid(data) {
    if (Array.isArray(data)) {
      return data.map(row => {
        return row.split('').map(elem => {
          let value = this._symbolMap.get(elem);
          if (value === 'wall' || value === 'lava') {
            return value;
          } else {
            return undefined;
          }
        })
      })
    }
  }
  
  createActors(data) {
    if (Array.isArray(data)) {
      let result = [];

      data.forEach((row, i) => {
          row.split('').forEach((symbol, j) => {
            if (this.actorsMap) {
              let value = this.actorsMap[symbol];
              if (Actor === value || Actor.isPrototypeOf(value)) {
                result.push(new value(new Vector(j, i)));
              }
            }
        })
      })
      
      return result;
    }
  }
  
  parse(data) {
    return new Level(this.createGrid(data), this.createActors(data));
  }
}

class Player extends Actor {
  constructor(pos) {
    super(pos);
		this.pos = this.pos.plus(new Vector(0, -0.5));
    this.size = new Vector(0.8, 1.5);
  }

	set pos(value) {
		this._pos = value;
	}

  get pos() {
  	return this._pos;
  }
  
  get type() {
    return 'player';
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
    super();
    this.pos = pos;
    this.speed = speed;
  }
  
  get type() {
    return 'fireball';
  }
  
  getNextPosition(number = 1) {
  	if (this.speed.x === 0 && this.speed.y === 0) {
  		return this.pos;
  	}

    return this.pos.plus(this.speed.times(number));
  }
  
  handleObstacle() {
    this.speed = this.speed.times(-1);
  }
  
  act(time, level) {
    let nextPosition = this.getNextPosition(time);
    let isIntersect = level.obstacleAt(nextPosition, this.size);
    if (!isIntersect) {
      this.pos = nextPosition;
    } else {
    	this.handleObstacle();
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos) {
    super(pos);
    this.size = new Vector(1, 1);
    this.speed = new Vector(2, 0);
  }
}

class VerticalFireball extends Fireball {
  constructor(pos) {
    super(pos);
    this.size = new Vector(1, 1);
    this.speed = new Vector(0, 2);
  }
}

class FireRain extends Fireball {
  constructor(pos) {
    super(pos);
    this._pos = pos;
    this.size = new Vector(1, 1);
    this.speed = new Vector(0, 3);
  }
  
  handleObstacle() {
     this.pos = this._pos;
  }
}

class Coin extends Actor {
  constructor(pos) {
    super(pos);
    this.pos = this.pos.plus(new Vector(0.2, 0.1));
    this._pos = this.pos;
    this.size = new Vector(0.6, 0.6);
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * 2 * Math.PI;
  }
  
  get type() {
    return 'coin';
  }
  
  updateSpring(time=1) {
    this.spring = this.spring + this.springSpeed * time;
  }
  
  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }
  
  getNextPosition(time=1) {
  	this.updateSpring(time);
  	let newPosition = new Vector(this._pos.x, this._pos.y);
    return newPosition.plus(this.getSpringVector());
  }
  
  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

const actorDict = {
  '@': Player,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball,
  'v': Fireball
}
const parser = new LevelParser(actorDict);

loadLevels().then(schemasStr => {
	let schemas = JSON.parse(schemasStr);
  return runGame(schemas, parser, DOMDisplay);
}).then(() => {
	alert('Вы выиграли!')
});