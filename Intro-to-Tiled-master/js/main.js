//Create Phaser game config
var config = {
    type: Phaser.AUTO,
    width: 512,
    height: 512,
    scene: {
        preload: preload,
        create: create,
        update: update
    },

    pixelArt: true,

    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 400 }
        }
    }, input: {
        gamepad: true
    }
};

//Initialise game
var game = new Phaser.Game(config);

//Initialise variables
var player;
var cursors;
var bats;
var jewels;
var VEL_X = 100;
var VEL_Y = 200;
var pad;
var score = 0;
var scoreText;
var padAOnce;
var keyW, keyA, keyD;
var music = {}, SFX = {};

//***************** PHASER.SCENE BUILT-IN FUNCTIONS ************//

function preload() {
    console.log(this);

    //Load images
    this.load.image("background", "../assets/background.png");
    this.load.image("landscape", "../assets/landscape-tileset.png");
    this.load.image("props", "../assets/props-tileset.png");
    this.load.spritesheet("bat", "../assets/bat.png", { frameWidth: 64, frameHeight: 38 });

    this.load.tilemapTiledJSON("tilemap", "../assets/level1.json");
    //Load spritesheets
    this.load.spritesheet(
        "player",
        "../assets/player.png",
        { frameWidth: 24, frameHeight: 24 }

    );
    this.load.image("jewel", "../assets/jewel.png");
    //load music
    this.load.audio('overgroundMusic', '../assets/audio/music/Lightmusic.mp3');
    this.load.audio('undergroundMusic', '../assets/audio/music/Darkmusic.mp3');
    //load sound effects
    this.load.audio('collectSFX','../assets/audio/sfx/Collect.mp3');
    this.load.audio('jumpSFX','../assets/audio/sfx/Jump1.mp3');
    this.load.audio('hurtSFX','../assets/audio/sfx/Hurt.mp3');
}

function create() {
    createBackground.call(this);

    //Start loading in the tilemap here
    var map = this.make.tilemap({ key: "tilemap" });
    var landscape = map.addTilesetImage("landscape-tileset", "landscape");
    var props = map.addTilesetImage("props", "props")

    map.createStaticLayer("backgroundlayer2", [landscape, props], 0, 0);
    map.createStaticLayer("backgroundlayer", [landscape, props], 0, 0);

    var playerSpawn = map.findObject("ObjectLayer", function (object) {
        if (object.name === "playerSpawn") {
            return object;
        }
    });

    player = this.physics.add.sprite(playerSpawn.x, playerSpawn.y, "player", 0)
    createPlayerAnimations.call(this);
    var collisionlayer = map.createStaticLayer("collisionlayer", [landscape, props], 0, 0);
    console.log(collisionlayer)
    player.setCollideWorldBounds(true);
    collisionlayer.setCollisionBetween(0, 1000);
    this.physics.add.collider(player, collisionlayer);

    scoreText = this.add.text(16, 200, 'score: 0', { fontSize: '32px', fill: '#FFFFFF' }).setScrollFactor(0);

    jewels = this.physics.add.staticGroup();

    map.findObject("ObjectLayer", function (object) {
        if (object.type === "pickUp" && object.name === "jewel") {
            jewels.create(object.x + map.tileWidth / 2, object.y - map.tileHeight / 2, "jewel");
        }

    });
  
    this.anims.create({
        key: 'flap',
        frames: this.anims.generateFrameNumbers('bat', { start: 0, end: 2 }),
        frameRate: 10,
        repeat: -1
    });
    //bats
    bats = this.physics.add.group();

    //bat variables with current spawn to destination shown in tiled.
    var batSpawn, batDest, line, bat;
    var batPoints = findPoints.call(this, map, "ObjectLayer", 'bat');
    //divided by 2 as I have two points
    var len = batPoints.length / 2;
    for (var i = 1; i < len + 1; i++) {
        batSpawn = findPoint.call(this, map, "ObjectLayer", "bat", "batSpawn" + i);
        batDest = findPoint.call(this, map, "ObjectLayer", "bat", "batDest" + i);
        line = new Phaser.Curves.Line(batSpawn, batDest);
        var bat = this.add.follower(line, batSpawn.x, batSpawn.y, "bat");
        bat.startFollow({
            duration: Phaser.Math.Between(1500, 2500),
            repeat: -1,
            yoyo: true,
            ease: "Sine.easeInOut"
        });
        bat.anims.play("flap", true)
        bats.add(bat);
        bat.body.allowGravity = false;

    }
  
    //check for overlap between player and beta
    this.physics.add.overlap(player, bats, batAttack, null, this);


    //Change camera settings

    var camera = this.cameras.getCamera("");
    camera.zoom = 2;
    camera.startFollow(player);
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    createCollision.call(this);
    createObjectAnimations.call(this);
    createKeys.call(this);

    keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    addMusic.call(this);
    addSound.call(this);


}



function update() {
    checkPlayerMovement();

    // underground
    if (!music.underground.isPlaying && player.body.y > 256) {
        music.underground.play();
        music.overground.stop();
    } else if (!music.overground.isPlaying && player.body.y < 228) {
        music.overground.play();
        music.underground.stop();
    } 

    //gamepad code must go last
   /* if (this.input.gamepad.total === 0) {
        return
    }
    pad = this.input.gamepad.getPad(0);
    if (pad.axes.length) {
        var axisH = pad.axes[0].getValue();
        console.log('axisH =' + axisH);
        if (axisH < 0) {
            player.setVelocityX(-VEL_X);
            //player.anims.play('walk', true);
            player.flipX = true;
        } else if (axisH > 0) {
            player.setVelocityX(VEL_X);
            //player.anims.play('walk', true);
            player.flipX = false;
        }
        else {
            player.anims.play('idle', true);
        }
    }
    if (!pad.A) {
        padAOnce = false;
    }
    if (pad.A && !padAOnce && player.body.blocked.down) {
        player.jumpCount = 0;
        player.setVelocityY(-VEL_Y);
        padAOnce = true;
        //player.anims.play('jump', true);
    }
    */

}


//current_anim_state = 0,1,2,3,4,5
// 0 = idle.
// 1 = jump
// 2 = walking
// 3 = falling

//change_state(state_to_change)
    //if current_anim_state == state_to_change // don't do anything.

    //else 
        //current_anim_state = state_to_change
        //if current_anim_state == 0 
            //play idle
        //else if etc.
    






//***************** NON PHASER.SCENE FUNCTIONS ************//
//*************** CREATE FUNCTIONS*************************//

//Create the background image
function createBackground() {
    var background = this.add.image(256, 256, "background");
    background.setScale(2.2, 2.5);
}

//Create the player object from the playerSpawn location
function createPlayer(playerSpawn) {
    player = this.physics.add.sprite(playerSpawn.x, playerSpawn.y, 'player', 4);
    player.setCollideWorldBounds(true);

    createPlayerAnimations.call(this);
}

function addMusic() {
    music.overground = this.sound.add('overgroundMusic', { loop: true, volume: 0.3 });
    music.underground = this.sound.add('undergroundMusic', { loop: true, volume: 0.3 });
}

function addSound() {
    SFX.jump = this.sound.add('jumpSFX', { loop: false, volume: 0.2 });
    SFX.collect = this.sound.add('collectSFX', { loop: false, volume: 0.7 });
    SFX.hurt = this.sound.add('hurtSFX', { loop: false, volume: 0.5 });
}

function findPoints(map, layer, type) {
    //var locs = map.filterObjects(layer, obj => obj.type === type);
    var locs = map.filterObjects(layer, function (object) {
        if (object.type === type) {
            return object
        }
    });
    return locs
}
function findPoint(map, layer, type, name) {
    var loc = map.findObject(layer, function (object) {
        if (object.type === type && object.name === name) {
            //console.log(object);
            return object;
        }
    });
    return loc
}

//Create the collision and overlap events
function createCollision() {
    this.physics.add.overlap(player, jewels, collectJewels, null, this);
}
function collectJewels(player, jewel) {
    console.log("hello")
    SFX.collect.play();
    jewel.disableBody(true, true);
    score += 10;
    scoreText.setText('Score: ' + score);
}

//Create the cursor keys
function createKeys() {
    cursors = this.input.keyboard.createCursorKeys();
}

//*************** ANIMATION FUNCTIONS*************************//

//Create the animations that the player will use
function createPlayerAnimations() {
    this.anims.create({
        key: 'walk',
        frames: this.anims.generateFrameNumbers('player', {start: 5, end: 10}),
        frameRate: 15,
        repeat: -1
    });

    this.anims.create({
        key: 'idle',
        frames: this.anims.generateFrameNumbers('player', {frames: [1, 4]}),
        frameRate: 3,
        repeat: -1
    });

    this.anims.create({
        key: 'jump',
        frames: [{key: 'player', frame: 3}],
        frameRate: 15
    });

    this.anims.create({
        key: 'fall',
        frames: [{key: 'player', frame: 2}],
        frameRate: 15
    });
}
function batAttack(player, bat) {
    SFX.hurt.play();
    this.physics.pause();
    player.setTint(0xff0000);
    bats.children.each(function (bat) {
        bat.stopFollow();
        bat.anims.stop();
    }, this);
}

//Create the animations for any objects that are not the player or enemies
function createObjectAnimations() {

}

//*************** GAMEPLAY FUNCTIONS *************//

//Check for cursor key presses and move the player accordingly
function checkPlayerMovement() {
    //Right
    if (cursors.right.isDown || keyD.isDown) {
        player.setVelocityX(VEL_X);
        player.anims.play('walk', true);
        player.flipX = false;

        //Changes the size and position of the hitbox (no longer floating on your tail!)
        player.setSize(14, 24);
        player.setOffset(7, 0);
    }
    //Left
    else if (cursors.left.isDown || keyA.isDown) {
        player.setVelocityX(-VEL_X);
        player.anims.play('walk', true);
        player.flipX = true;

        //Changes the size and position of the hitbox (no longer floating on your tail!)
        player.setSize(14, 24);
        player.setOffset(3, 0);
    }
    //Down
    else if (cursors.down.isDown) {
        player.setVelocityX(0);
        player.anims.play('down', true);
    }
    //Idle
    else {
        player.setVelocityX(0);
        if (!pad) {
            player.anims.play('idle', true);
        }

    }

    //Reset jumpCount. Important for double jumping.
    if (cursors.space.isDown && player.body.blocked.down) {
        SFX.jump.play();
        player.jumpCount = 0;
        player.setVelocityY(-VEL_Y);
    }

    //Check for the spacebar having JUST been pressed, and whether the player has any jumps left - Important for double jumping.
    //Then, jump.
    if (Phaser.Input.Keyboard.JustDown(cursors.space) && player.jumpCount < player.maxJump) {
        player.jumpCount++;

        player.setVelocityY(-VEL_Y);
    }

    //Display jumping or falling animations
    if (player.body.velocity.y < 0) {
        player.anims.play('jump', true);

    } else if (player.body.velocity.y > 0) {
        player.anims.play('fall', true);

    }

}

