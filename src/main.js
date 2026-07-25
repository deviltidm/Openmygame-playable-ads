// прототип геймплея

options.__soundDisabled = 0;

var level
 , rubber
 , blocks = []
 , big_blocks = 0
 , bullets_used = 0
 , LEVELS = ['level_1', 'level_2', 'level_3']
 , currentLevelIndex = 0;

function looperPostOne(f, delay) {
 if (f.__posted > 0) {
  f.__posted = _clearTimeout(f.__posted);
 }

 if (!f.__posted) {
  if (delay) {
   f.__posted = _setTimeout(() => {
    f.__posted = 0;
    f();
   }, delay);
  } else {
   f.__posted = -1;
   looperPost(() => {
    f.__posted = 0;
    f();
   });
  };
 }
}

function relImpactSpeed(bodyA, bodyB) {
 var va = bodyA.velocity, vb = bodyB.velocity
  , v = new Vector2(va.x - vb.x, va.y - vb.y);
 return v.__length();
}

function addBreakBlock(x, y, velocity){
 var breack_block = level.__addChildBox({
  __img: 'break_' + randomInt(1, 9),
  __ofs: [x, y, -20],
  __rotate: randomInt(0, 360),
  __physics: {
   __isStatic: false,
   __friction: 10,
   __frictionAir: 1,
   __frictionStatic: 50,
   __restitution: 0,
   __density: 1,
   __bodyType: 1
  }
 });
 looperPost(a => {
  if (breack_block.__ph_body){
   ph_Body.setVelocity(breack_block.__ph_body, new Vector2(velocity.x + randomFloat(-10, 10),velocity.y + randomFloat(-8, 3)));
   _setTimeout(() => {
    if (breack_block.__ph_body) {
     initCollision(breack_block.__ph_body, breack_block, 50);
     _setTimeout(() => {
      if (!breack_block.__destructed) {
       removeBlock(breack_block);
      }
     }, randomFloat(5, 10));
    }
   }, 1);
  }
 });
}

function awakeBlocks(){
 $each(blocks, b => {
  b.__ph_awake();
 });
}

function removeBlock(block){
 removeFromArray(block, blocks);
 var size = block.__size, v = block.__ph_body.velocity;
 block.__removeFromParent();
 looperPostOne(awakeBlocks);
 if (block.__needBreaks) {
  playSound('break_' + randomInt(1, 4), 0, 0, 0.5);
  var step = 50,
   bx = block.__x - size.x/2,
   by = block.__y - size.y/2;
  for (var x = 0; x < size.x; x += step) {
   for (var y = 0; y < size.y; y += step) {
    addBreakBlock(bx + x, by + y, v);
   }
  }
  big_blocks--;
  if (big_blocks == 0) {
   _setTimeout(() => {
    show_win();
   }, 1);
  }
 } else {
  if (random() > 0.5 && !windowManager.__hasOpenedWindow()) {
   playSound('break_' + randomInt(1, 4), 0, 0, 0.5);
  }
 }
}

function initCollision(body, node, hp){
 blocks.push(node);
 body.__hp = hp;
 body.__onCollision = (speed) => {
  var dmg = floor(clamp((speed - 1) * (speed - 2), 0, 100));
  if (dmg && body.__hp) {
   body.__hp = mmax(0, body.__hp - dmg);
   if (!body.__hp) {
    body.__onCollision = 0;
    looperPost(a => {
     removeBlock(node);
    });
   }
  }
 }
}

function calculateStars() {
 if (bullets_used <= 1) return 3;
 if (bullets_used === 2) return 2;
 return 1;
}

function show_win() {
 playSound('win');
 consoleLog('ВЫЗВАН show_win, big_blocks=', big_blocks);

 var stars = calculateStars();

 showWindow('win', wnd => {
  consoleLog('showWindow callback сработал, wnd=', wnd);
  wnd.__setAliasesData({
   star_1(node) {
    node.__visible = stars >= 1;
   },
   star_2(node) {
    node.__visible = stars >= 2;
   },
   star_3(node) {
    node.__visible = stars >= 3;
   },
  button: {
 __onTap(){
  consoleLog('КЛИК ПО КНОПКЕ');
  windowManager.__closeAllWindows();
  goToNextLevel();
 },
 __onTapHighlight: 1
}
  })
 })
}

function goToNextLevel() {
 consoleLog('НАЖАТА КНОПКА, текущий индекс:', currentLevelIndex);
 currentLevelIndex++;
 if (currentLevelIndex >= LEVELS.length) {
  currentLevelIndex = 0;
 }
 consoleLog('НОВЫЙ индекс:', currentLevelIndex, 'загружаю уровень:', LEVELS[currentLevelIndex]);
 bullets_used = 0;
 big_blocks = 0;
 blocks = [];
 if (level) level.__removeFromParent();
 initLevel(LEVELS[currentLevelIndex]);
}

function initLevel(levelName){
 levelName = levelName || LEVELS[currentLevelIndex];

 level = scene
  .__addChildBox(levelName)
  .__setAliasesData({
   rubber(node) {
    rubber = node;
   },
   userInputArea: {
 __dragDist: 1,
 __drag(x, y, dx, dy) {
  var dmouse = this.__dmouse = this.__worldPosition.__clone().sub(new Vector2(x, y));
  
  var maxDrag = 150;
  var len = Math.sqrt(dmouse.x * dmouse.x + dmouse.y * dmouse.y);
  if (len > maxDrag) {
   var scale = maxDrag / len;
   dmouse.x *= scale;
   dmouse.y *= scale;
   this.__dmouse = dmouse;
  }
  
  rubber.__parent.__rotate = -dmouse.__angle() * RAD2DEG;
  rubber.__width = dmouse.__length();
 },
 __dragStart() {
  rubber.__killAllAnimations();
 },
 __dragEnd() {
  playSound('punch');
  bullets_used++;
  rubber.__anim({
   __width: 10
  }, 0.4, 0, easeElasticO);

  var wp = this.__worldPosition
   , bullet = level.__addChildBox({
    __effect: 'tail',
    __img: 'circle1',
    __size: [28, 28],
    __ofs: [wp.x, wp.y, -20],
    __physics: {
     __isStatic: false,
     __friction: 130,
     __frictionAir: 0.2,
     __frictionStatic: 500,
     __restitution: 10,
     __density: 4,
     __bodyType: 1
    }
   }).update()
   , velocity = this.__dmouse.__multiplyScalar(0.2);

  if (bullet.__ph_body) {
   ph_Body.setVelocity(bullet.__ph_body, velocity);
  }

  _setTimeout(() => {
   bullet.__removeFromParent();
  }, 2);
 }
}
  });

 _setTimeout(a => {
  level.update(1);

  ph_Events.on(ph_Engine, 'collisionStart', (event) => {
   var pairs = event.pairs, i, pair, bodyA, bodyB, speed;
   for (i = 0; i < pairs.length; i++) {
    pair = pairs[i];
    bodyA = pair.bodyA;
    bodyB = pair.bodyB;
    speed = relImpactSpeed(bodyA, bodyB);
    if (bodyA && bodyA.__onCollision) bodyA.__onCollision(speed);
    if (bodyB && bodyB.__onCollision) bodyB.__onCollision(speed);
   }
  });

  level.__traverse(node => {
   var body = node.__ph_body;
   if (body && !body.isStatic) {
    node.__needBreaks = 1;
    big_blocks++;
    initCollision(body, node, 100);
   }
  });
 }, 0.01);
}

BUS.__addEventListener(
 __ON_GAME_LOADED, a => {
  initLevel();
  return 1;
 }
);
console.log(typeof showWindow)
console.log(windowManager)
console.log(Object.getOwnPropertyNames(windowManager))
console.log(windowManager.__topWindow())
