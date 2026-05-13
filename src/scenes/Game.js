export default class Game extends Phaser.Scene {
    constructor() {
        super("Game");
    }

    preload() {
        this.load.image("menuBG", "assets/menu_background.png");

        this.load.spritesheet("player", "assets/Bob.png", {
            frameWidth: 250,
            frameHeight: 250
        });
    }

    create() {
        this.levelComplete = false;
        this.pathOpen = false;

        this.physics.world.gravity.y = 850;
        this.physics.world.setBounds(0, 0, 2200, 600);

        // ================= BACKGROUND =================
        // to be reworked with parralax layers

        // ================= TEXT =================
        this.add.text(40, 25, "LEVEL 1: Slime & Shadow", {
            fontSize: "28px",
            color: "#ffffff"
        });

        this.add.text(40, 60,
            "A/D move | SPACE jump/double jump | E shoot slime | SHIFT swap | Shadow: hold S to phase",
            {
                fontSize: "16px",
                color: "#dddddd"
            }
        );

        // ================= ANIMATIONS =================
        if (!this.anims.exists("idle")) {
            this.anims.create({
                key: "idle",
                frames: [{ key: "player", frame: 0 }],
                frameRate: 1,
                repeat: -1
            });
        }

        if (!this.anims.exists("idleStretch")) {
            this.anims.create({
                key: "idleStretch",
                frames: [
                    { key: "player", frame: 0 },
                    { key: "player", frame: 1 },
                    { key: "player", frame: 3 },
                    { key: "player", frame: 2 },
                    { key: "player", frame: 0 }
                ],
                frameRate: 5,
                repeat: 0
            });
        }

        // ================= GROUPS =================
        this.platforms = this.physics.add.staticGroup();
        this.shadowWalls = this.physics.add.staticGroup();
        this.slimeBalls = this.physics.add.group();
        this.buttons = [];
        this.gates = [];

        // ================= LEVEL GEOMETRY =================
        this.makeBlock(0, 550, 2200, 50, 0x555555);          // ground

        this.makeBlock(230, 470, 140, 20, 0x777777);
        this.makeBlock(470, 410, 140, 20, 0x777777);
        this.makeBlock(720, 360, 140, 20, 0x777777);          // double jump route

        this.makeBlock(970, 550, 180, 50, 0x111111);          // fake pit cover / floor
        this.makeBlock(1200, 460, 170, 20, 0x777777);
        this.makeBlock(1450, 390, 150, 20, 0x777777);

        // Button wall / gate
        this.gate = this.makeBlock(880, 420, 50, 130, 0x8844ff);
        this.gates.push(this.gate);

        // Button that opens the gate
        this.button = this.makeButton(770, 325, 40, 40);

        // Shadow-only wall section
        this.makeShadowWall(1580, 360, 180, 190);

        // Final platform and exit
        this.makeBlock(1820, 470, 160, 20, 0x777777);
        this.makeBlock(2050, 550, 200, 50, 0x555555);
        this.exit = this.add.rectangle(2120, 490, 55, 80, 0x00ff99).setOrigin(0.5);
        this.physics.add.existing(this.exit, true);

        this.add.text(2075, 415, "END", {
            fontSize: "22px",
            color: "#00ff99"
        });

        // ================= PLAYER =================
        this.player = this.physics.add.sprite(70, 480, "player", 0);
        this.player.setDisplaySize(42, 60);
        this.player.setCollideWorldBounds(true);
        this.player.speed = 230;
        this.player.jumpPower = -430;
        this.player.jumpsUsed = 0;
        this.player.maxJumps = 2;
        this.player.facing = 1;
        this.player.play("idle");

        // ================= SHADOW =================
        this.shadow = this.add.rectangle(120, 480, 34, 54, 0x222222);
        this.physics.add.existing(this.shadow);
        this.shadow.body.setCollideWorldBounds(true);
        this.shadow.body.setSize(34, 54);
        this.shadow.speed = 250;
        this.shadow.phasing = false;

        this.isShadowActive = false;

        // ================= INPUT =================
        this.keys = this.input.keyboard.addKeys({
            a: "A",
            d: "D",
            w: "W",
            s: "S",
            space: "SPACE",
            shift: "SHIFT",
            e: "E"
        });

        this.input.keyboard.on("keydown-SHIFT", () => {
            this.toggleActiveCharacter();
        });

        this.input.keyboard.on("keydown-E", () => {
            if (!this.isShadowActive) {
                this.shootSlimeBall();
            }
        });

        // ================= COLLISIONS =================
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.shadow, this.platforms);

        this.physics.add.collider(this.slimeBalls, this.platforms);

        this.shadowWallColliderPlayer = this.physics.add.collider(
            this.player,
            this.shadowWalls
        );

        this.shadowWallColliderShadow = this.physics.add.collider(
            this.shadow,
            this.shadowWalls
        );

        this.physics.add.overlap(this.slimeBalls, this.button.rect, (ball) => {
            ball.destroy();
            this.openPath();
        });

        this.physics.add.overlap(this.player, this.exit, () => {
            this.finishLevel();
        });

        this.physics.add.overlap(this.shadow, this.exit, () => {
            this.finishLevel();
        });

        // ================= CAMERA =================
        this.cameras.main.setBounds(0, 0, 2200, 600);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // ================= IDLE STRETCH =================
        this.playerIdleStart = this.time.now;
        this.nextRandomIdleStretch = this.time.now + Phaser.Math.Between(3000, 7000);
        this.isStretching = false;

        this.player.on("animationcomplete-idleStretch", () => {
            this.isStretching = false;
            this.player.play("idle");
            this.playerIdleStart = this.time.now;
            this.nextRandomIdleStretch = this.time.now + Phaser.Math.Between(3000, 7000);
        });
    }

    makeBlock(x, y, w, h, color) {
        const block = this.add.rectangle(x, y, w, h, color).setOrigin(0);
        this.physics.add.existing(block, true);
        this.platforms.add(block);
        return block;
    }

    makeShadowWall(x, y, w, h) {
        const wall = this.add.rectangle(x, y, w, h, 0x151515).setOrigin(0);
        wall.setAlpha(0.85);
        this.physics.add.existing(wall, true);
        this.shadowWalls.add(wall);

        this.add.text(x + 10, y + 15, "SHADOW\nPHASE", {
            fontSize: "16px",
            color: "#999999"
        });

        return wall;
    }

    makeButton(x, y, w, h) {
        const rect = this.add.rectangle(x, y, w, h, 0xff3333).setOrigin(0);
        this.physics.add.existing(rect, true);

        this.add.text(x - 35, y - 35, "Shoot this", {
            fontSize: "16px",
            color: "#ffffff"
        });

        const button = {
            rect,
            on: false
        };

        this.buttons.push(button);
        return button;
    }

    toggleActiveCharacter() {
        this.isShadowActive = !this.isShadowActive;

        if (this.isShadowActive) {
            this.cameras.main.startFollow(this.shadow, true, 0.08, 0.08);
        } else {
            this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        }
    }

    
    
  shootSlimeBall() {
    const direction = this.player.facing || 1;

    const ball = this.add.circle(
        this.player.x + direction * 35,
        this.player.y,
        11,
        0x55ff55
    );

    this.physics.add.existing(ball);

    ball.body.setCircle(11);
    ball.body.allowGravity = true;
    ball.body.setVelocity(direction * 520, -130);
    ball.body.setBounce(0.2);

    this.slimeBalls.add(ball);

    this.time.delayedCall(2200, () => {
        if (ball && ball.body) {
            ball.destroy();
        }
    });
}


    openPath() {
        if (this.pathOpen) return;

        this.pathOpen = true;
        this.button.on = true;
        this.button.rect.setFillStyle(0x33ff33);

        for (const gate of this.gates) {
            gate.setVisible(false);
            gate.body.enable = false;
        }

        this.add.text(860, 375, "Path opened!", {
            fontSize: "20px",
            color: "#33ff33"
        });
    }

    finishLevel() {
        if (this.levelComplete) return;

        this.levelComplete = true;

        // Change "Start" if your menu scene key is named something else.
        this.scene.start("Start");
    }

    tryIdleStretch() {
        if (this.isStretching) return;
        if (this.isShadowActive) return;
        if (!this.player.body.blocked.down) return;

        this.isStretching = true;
        this.player.play("idleStretch");
    }

    update(time, delta) {
        const pad = this.input.gamepad.getPad(0);

        // ================= PLAYER CONTROL =================
        if (!this.isShadowActive) {
            this.player.setVelocityX(0);
            this.shadow.body.setVelocityX(0);

            let move = 0;

            if (this.keys.a.isDown) move = -1;
            if (this.keys.d.isDown) move = 1;

            if (pad) {
                const axis = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
                if (Math.abs(axis) > 0.1) move = axis;
            }

            if (move !== 0) {
                this.player.facing = move > 0 ? 1 : -1;
            }

            this.player.setVelocityX(move * this.player.speed);

            if (this.player.body.blocked.down) {
                this.player.jumpsUsed = 0;
            }

            const jumpPressed =
                Phaser.Input.Keyboard.JustDown(this.keys.space) ||
                !!(pad && pad.buttons[0].pressed);

            if (jumpPressed && this.player.jumpsUsed < this.player.maxJumps) {
                this.player.setVelocityY(this.player.jumpPower);
                this.player.jumpsUsed++;
            }

            const isMoving =
                Math.abs(this.player.body.velocity.x) > 1 ||
                Math.abs(this.player.body.velocity.y) > 1 ||
                !this.player.body.blocked.down;

            if (isMoving) {
                if (this.isStretching) {
                    this.player.stop();
                    this.player.setFrame(0);
                    this.isStretching = false;
                }

                this.player.play("idle", true);
                this.playerIdleStart = this.time.now;
                this.nextRandomIdleStretch = this.time.now + Phaser.Math.Between(3000, 7000);
            } else {
                const idleTime = this.time.now - this.playerIdleStart;

                if (idleTime >= 10000 || this.time.now >= this.nextRandomIdleStretch) {
                    this.tryIdleStretch();
                }
            }
        }

        // ================= SHADOW CONTROL =================
        if (this.isShadowActive) {
            this.player.setVelocityX(0);

            let move = 0;
            let vertical = 0;

            if (this.keys.a.isDown) move = -1;
            if (this.keys.d.isDown) move = 1;

            if (pad) {
                const axisX = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
                if (Math.abs(axisX) > 0.1) move = axisX;
            }

            const phasing =
                this.keys.s.isDown ||
                !!(pad && pad.buttons[5].pressed);

            this.shadow.phasing = phasing;
            this.shadowWallColliderShadow.active = !phasing;

            if (phasing) {
                this.shadow.body.allowGravity = false;

                if (this.keys.w.isDown) vertical = -1;
                if (this.keys.s.isDown) vertical = 1;

                if (pad) {
                    const axisY = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
                    if (Math.abs(axisY) > 0.1) vertical = axisY;
                }

                this.shadow.body.setVelocity(
                    move * this.shadow.speed,
                    vertical * this.shadow.speed
                );

                this.shadow.setFillStyle(0x666666);
                this.shadow.setAlpha(0.45);
            } else {
                this.shadow.body.allowGravity = true;
                this.shadow.body.setVelocityX(move * this.shadow.speed);

                this.shadow.setFillStyle(0x222222);
                this.shadow.setAlpha(1);
            }
        }

        // Safety reset if player falls
        if (this.player.y > 700) {
            this.player.setPosition(70, 480);
            this.player.setVelocity(0, 0);
        }

        if (this.shadow.y > 700) {
            this.shadow.setPosition(120, 480);
            this.shadow.body.setVelocity(0, 0);
        }
    }
}