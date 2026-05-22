export default class Game extends Phaser.Scene {
    constructor() {
        super("Game");
    }

    preload() {
        // Sprites removed — placeholder rectangles used for now
        // this.load.spritesheet("bigSlime", "assets/BigSlime.png", { frameWidth: 64, frameHeight: 64 });
        // this.load.spritesheet("smallSlime", "assets/SmallSlime.png", { frameWidth: 32, frameHeight: 32 });
    }

    create() {
        this.activeBalls   = [];
        this.levelComplete = false;

        // ================= WORLD =================
        this.physics.world.gravity.y = 900;
        this.physics.world.setBounds(0, 0, 3200, 650);

        // ================= GROUPS =================
        this.platforms  = this.physics.add.staticGroup();
        this.slimeBalls = this.physics.add.group();
        this.breakWalls = this.physics.add.staticGroup();

        // ================= LEVEL =================
        this.buildLevel();

        // ================= BIG SLIME (Glob) =================
        this.glob = this.add.rectangle(80, 530, 54, 54, 0x33cc33);
        this.physics.add.existing(this.glob);
        this.glob.body.setCollideWorldBounds(true);
        this.glob.body.setSize(54, 54);
        this.glob.speed         = 180;
        this.glob.jumpPower     = -480;
        this.glob.jumpsUsed     = 0;
        this.glob.maxJumps      = 1;
        this.glob.facing        = 1;
        this.glob.shootCooldown = 0;

        // ================= SMALL SLIME (Pip) =================
        this.pip = this.add.rectangle(150, 530, 28, 28, 0x66ff66);
        this.physics.add.existing(this.pip);
        this.pip.body.setCollideWorldBounds(true);
        this.pip.body.setSize(28, 28);
        this.pip.speed         = 290;
        this.pip.jumpPower     = -380;
        this.pip.jumpsUsed     = 0;
        this.pip.maxJumps      = 2;
        this.pip.facing        = 1;
        this.pip.isCarried     = false;
        this.pip.isDiving      = false;
        this.pip.diveTimeLeft  = 10000;
        this.pip.diveCooldown  = false;
        this.pip.isCeiling     = false;

        // ================= DIVE BAR =================
        this.diveBarBg   = this.add.rectangle(0, 0, 60, 7, 0x333333)
            .setScrollFactor(0).setVisible(false).setDepth(10);
        this.diveBarFill = this.add.rectangle(0, 0, 60, 7, 0x44aaff)
            .setScrollFactor(0).setVisible(false).setDepth(11);

        // ================= INPUT =================
        const globControl = this.registry.get("globControl") || "wasd";
        const pipControl  = this.registry.get("pipControl")  || "arrows";

        this.keysGlob = this.input.keyboard.addKeys(
            globControl === "wasd"
                ? { left: "A", right: "D", up: "W", shoot: "ONE" }
                : { left: "LEFT", right: "RIGHT", up: "UP", shoot: "ONE" }
        );

        this.keysPip = this.input.keyboard.addKeys(
            pipControl === "wasd"
                ? { left: "A", right: "D", up: "W", down: "S", dive: "SHIFT" }
                : { left: "LEFT", right: "RIGHT", up: "UP", down: "DOWN", dive: "SHIFT" }
        );

        this.input.keyboard.on("keydown-ESC", () => {
            this.scene.launch("Pause");
            this.scene.pause("Game");
        });

        // ================= COLLISIONS =================
        this.physics.add.collider(this.glob, this.platforms);
        this.pipPlatformCollider = this.physics.add.collider(this.pip, this.platforms);

        this.physics.add.collider(this.slimeBalls, this.platforms, (ball) => {
            ball.destroy();
        });

        this.physics.add.overlap(this.slimeBalls, this.breakWalls, (ball, wall) => {
            ball.destroy();
            this.breakWall(wall);
        });

        this.globAtExit = false;
        this.pipAtExit  = false;

        this.physics.add.overlap(this.glob, this.exit, () => {
            this.globAtExit = true;
            this.checkLevelComplete();
        });
        this.physics.add.overlap(this.pip, this.exit, () => {
            this.pipAtExit = true;
            this.checkLevelComplete();
        });

        // ================= CAMERA =================
        this.cameras.main.setBounds(0, 0, 3200, 650);
        this.camTarget = this.add.rectangle(115, 530, 1, 1, 0x000000, 0);
        this.physics.add.existing(this.camTarget);
        this.camTarget.body.allowGravity = false;
        this.cameras.main.startFollow(this.camTarget, true, 0.08, 0.08);

        // ================= HUD =================
        this.hud = this.add.text(16, 16,
            "GLOB: move | jump | [1] shoot\nPIP: move | jump (x2) | SHIFT dive | touch ceiling to cling\nBoth reach exit  |  ESC pause",
            { fontSize: "14px", color: "#ddffdd" }
        ).setScrollFactor(0);
    }

    // ─────────────────────────────────────────────────────────────────
    //  LEVEL BUILDER
    // ─────────────────────────────────────────────────────────────────
    buildLevel() {
        const G = 0x556655;
        const B = 0xff5522;

        this.makeBlock(0,    600, 900,  50, G);
        this.makeBlock(1150, 600, 550,  50, G);
        this.makeBlock(1800, 600, 1400, 50, G);

        this.makeBlock(250, 530, 100, 18, G);
        this.makeBlock(420, 470, 100, 18, G);
        this.makeBlock(600, 410, 100, 18, G);
        this.makeBlock(600, 320, 130, 18, G);
        this.buttonShelf = this.makeActivationBlock(660, 295, 36, 26, 0xff3333, () => this.openGate());
        this.add.text(635, 260, "PIP\nSTEP ON", { fontSize: "12px", color: "#ff9999" }).setOrigin(0.5);

        this.gate = this.makeBlock(820, 470, 24, 130, 0xaa33ff);

        this.add.text(980, 555, "← WIDE GAP →\nGlob carries Pip!", {
            fontSize: "13px", color: "#ffff88"
        }).setOrigin(0.5);
        this.add.text(910, 490, "Pip: ride Glob!\nGlob: jump across", {
            fontSize: "12px", color: "#aaffaa"
        });

        this.makeBlock(1200, 540, 160, 18, G);
        this.makeBlock(1380, 490, 120, 18, G);

        this.makeBreakWall(1540, 430, 30, 170, B);
        this.add.text(1543, 390, "SHOOT\nWALL", { fontSize: "12px", color: "#ff8866" });

        this.makeBlock(1700, 480, 200, 16, G);
        this.makeBlock(1700, 415, 200, 16, G);
        this.add.text(1750, 440, "PIP\nONLY", { fontSize: "12px", color: "#aaffaa" }).setOrigin(0.5);

        this.makeBlock(1650, 370, 80,  16, G);
        this.makeBlock(1750, 310, 180, 16, G);
        this.makeBlock(1960, 370, 80,  16, G);

        this.makeBlock(2100, 540, 400, 18, G);
        this.makeBlock(2600, 490, 200, 18, G);
        this.makeBlock(2850, 430, 200, 18, G);

        this.exit = this.add.rectangle(3100, 555, 60, 90, 0x00ffaa).setOrigin(0.5);
        this.physics.add.existing(this.exit, true);
        this.add.text(3100, 495, "EXIT", { fontSize: "20px", color: "#00ffaa" }).setOrigin(0.5);
    }

    // ─────────────────────────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────────────────────────
    makeBlock(x, y, w, h, color) {
        const block = this.add.rectangle(x, y, w, h, color).setOrigin(0);
        this.physics.add.existing(block, true);
        this.platforms.add(block);
        return block;
    }

    makeBreakWall(x, y, w, h, color) {
        const wall = this.add.rectangle(x, y, w, h, color).setOrigin(0);
        this.physics.add.existing(wall, true);
        this.breakWalls.add(wall);
        return wall;
    }

    makeActivationBlock(x, y, w, h, color, onActivate) {
        const block = this.add.rectangle(x, y, w, h, color).setOrigin(0.5);
        this.physics.add.existing(block, true);
        this.platforms.add(block);
        block.activated  = false;
        block.onActivate = onActivate;
        return block;
    }

    breakWall(wall) {
        this.tweens.add({
            targets: wall,
            alpha: 0,
            duration: 180,
            onComplete: () => { this.breakWalls.remove(wall, true, true); }
        });
    }

    openGate() {
        if (this.gateOpen) return;
        this.gateOpen = true;
        this.tweens.add({
            targets: this.gate,
            alpha: 0,
            duration: 250,
            onComplete: () => { this.platforms.remove(this.gate, true, true); }
        });
        this.add.text(820, 440, "Gate open!", { fontSize: "15px", color: "#aaffaa" });
    }

    checkLevelComplete() {
        if (this.globAtExit && this.pipAtExit && !this.levelComplete) {
            this.levelComplete = true;
            this.time.delayedCall(800, () => this.scene.start("Start"));
        }
    }

    // ─────────────────────────────────────────────────────────────────
    //  SHOOTING
    // ─────────────────────────────────────────────────────────────────
    shootSlimeBall() {
        const now = this.time.now;
        if (now < this.glob.shootCooldown) return;
        this.glob.shootCooldown = now + 1500;

        const dir  = this.glob.facing;
        const ball = this.add.circle(this.glob.x + dir * 40, this.glob.y - 20, 13, 0x55ff55);
        this.activeBalls.push({ obj: ball, dir });
    }

    // ─────────────────────────────────────────────────────────────────
    //  UPDATE
    // ─────────────────────────────────────────────────────────────────
    update(time, delta) {

        // ── GLOB ─────────────────────────────────────────────────────
        {
            const onGround = this.glob.body.blocked.down;
            if (onGround) this.glob.jumpsUsed = 0;

            let moveX = 0;
            if (this.keysGlob.left.isDown)  moveX = -1;
            if (this.keysGlob.right.isDown) moveX =  1;
            if (moveX !== 0) this.glob.facing = moveX;

            this.glob.body.setVelocityX(moveX * this.glob.speed);

            if (Phaser.Input.Keyboard.JustDown(this.keysGlob.up) &&
                this.glob.jumpsUsed < 1 && onGround) {
                this.glob.body.setVelocityY(this.glob.jumpPower);
                this.glob.jumpsUsed = 1;
            }

            if (Phaser.Input.Keyboard.JustDown(this.keysGlob.shoot)) {
                this.shootSlimeBall();
            }
        }

        // ── PIP ──────────────────────────────────────────────────────
        {
            // ── Carried — most logic locked out ──────────────────────
            if (this.pip.isCarried) {
                this.pip.body.allowGravity = false;
                this.pip.body.setVelocity(0, 0);
                this.pip.setPosition(this.glob.x, this.glob.y - 41);
                this.pip.setFillStyle(0x66ff66);
                this.pip.setDisplaySize(28, 28);

                if (Phaser.Input.Keyboard.JustDown(this.keysPip.up)) {
                    this.pip.isCarried = false;
                    this.pip.body.allowGravity = true;
                    this.pip.body.setVelocityY(this.pip.jumpPower);
                    this.pip.jumpsUsed = 1;
                }

                this.diveBarBg.setVisible(false);
                this.diveBarFill.setVisible(false);

            } else {

                const onGround  = this.pip.body.blocked.down;
                const onCeiling = this.pip.body.blocked.up;
                const onWallL   = this.pip.body.blocked.left;
                const onWallR   = this.pip.body.blocked.right;

                if (onGround) {
                    this.pip.jumpsUsed = 0;
                    this.pip.isCeiling = false;
                    if (this.pip.isDiving) {
                        this.pip.isDiving = false;
                        this.pip.body.allowGravity = true;
                        this.pip.body.setSize(28, 28);
                        this.pip.setDisplaySize(28, 28);
                    }
                }

                let moveX = 0;
                if (this.keysPip.left.isDown)  moveX = -1;
                if (this.keysPip.right.isDown) moveX =  1;
                if (moveX !== 0) this.pip.facing = moveX;

                // ── FLOOR DIVE (Shift) ────────────────────────────────
                const divePressed = this.keysPip.dive.isDown;

                if (divePressed && !this.pip.diveCooldown && !this.pip.isDiving) {
                    this.pip.isDiving     = true;
                    this.pip.diveTimeLeft = 10000;
                    this.pip.body.setSize(28, 12);
                    this.pip.setDisplaySize(28, 12);
                    this.pip.body.allowGravity = false;
                }

                if (this.pip.isDiving) {
                    if (divePressed && this.pip.diveTimeLeft > 0) {
                        this.pip.diveTimeLeft -= delta;

                        this.pip.body.setVelocityX(moveX * this.pip.speed * 1.4);

                        // auto climb any wall encountered
                        if (onWallL || onWallR) {
                            this.pip.body.setVelocityY(-this.pip.speed * 0.8);
                        } else {
                            this.pip.body.setVelocityY(0);
                        }

                        this.pip.setFillStyle(0x66ff66);
                        this.pip.setDisplaySize(28, 12);

                        // ── dive bar ──
                        const fraction = Math.max(0, this.pip.diveTimeLeft / 10000);
                        const barWidth = 60;
                        const filled   = barWidth * fraction;
                        const sx = this.pip.x - this.cameras.main.scrollX;
                        const sy = this.pip.y - this.cameras.main.scrollY - 24;

                        this.diveBarBg.setPosition(sx, sy).setVisible(true);
                        this.diveBarFill
                            .setPosition(sx - (barWidth - filled) / 2, sy)
                            .setDisplaySize(Math.max(0, filled), 7)
                            .setVisible(true);

                        const r = Math.floor(187 * (1 - fraction));
                        const g = Math.floor(170 * fraction);
                        const b = Math.floor(255 * fraction);
                        this.diveBarFill.setFillStyle(
                            Phaser.Display.Color.GetColor(68 + r, g, b)
                        );

                    } else {
                        // time ran out or key released
                        this.pip.isDiving = false;
                        this.pip.body.allowGravity = true;
                        this.pip.body.setSize(28, 28);
                        this.pip.setDisplaySize(28, 28);
                        this.pip.diveTimeLeft = 0;
                        this.pip.diveCooldown = true;
                        this.time.delayedCall(1500, () => {
                            this.pip.diveCooldown = false;
                            this.pip.diveTimeLeft = 10000;
                        });
                        this.diveBarBg.setVisible(false);
                        this.diveBarFill.setVisible(false);
                    }

                } else {
                    // ── not diving ────────────────────────────────────
                    this.diveBarBg.setVisible(false);
                    this.diveBarFill.setVisible(false);

                    // ── CEILING CLING ─────────────────────────────────
                    if (onCeiling && !this.pip.isCeiling) {
                        this.pip.isCeiling = true;
                    }

                    if (this.pip.isCeiling && onCeiling) {
                        this.pip.body.allowGravity = false;
                        this.pip.body.setVelocityY(0);
                        this.pip.setFillStyle(0xaaff44);

                        if (Phaser.Input.Keyboard.JustDown(this.keysPip.up)) {
                            this.pip.isCeiling = false;
                            this.pip.body.allowGravity = true;
                            this.pip.body.setVelocityY(120);
                        }
                    } else if (!onCeiling) {
                        this.pip.isCeiling = false;
                        this.pip.body.allowGravity = true;
                        this.pip.setFillStyle(0x66ff66);
                    }

                    // ── WALL SLIDE ────────────────────────────────────
                    if ((onWallL || onWallR) && !onGround && !this.pip.isCeiling) {
                        this.pip.body.setVelocityY(Math.min(this.pip.body.velocity.y, 60));
                    }

                    this.pip.body.setVelocityX(moveX * this.pip.speed);

                    // ── JUMP ──────────────────────────────────────────
                    if (Phaser.Input.Keyboard.JustDown(this.keysPip.up) && !this.pip.isCeiling) {
                        if (this.pip.jumpsUsed < this.pip.maxJumps) {
                            this.pip.body.setVelocityY(this.pip.jumpPower);
                            this.pip.jumpsUsed++;
                        }
                    }
                }

                // ── CARRY — check if Pip lands on Glob ───────────────
                const pipFeetY  = this.pip.y + 14;
                const globTopY  = this.glob.y - 27;
                const horizDiff = Math.abs(this.pip.x - this.glob.x);

                const landingOnGlob =
                    pipFeetY >= globTopY - 6 &&
                    pipFeetY <= globTopY + 10 &&
                    horizDiff < 30 &&
                    this.pip.body.velocity.y >= 0 &&
                    !this.pip.isDiving;

                if (landingOnGlob) {
                    this.pip.isCarried = true;
                    this.pip.isDiving  = false;
                    this.pip.body.allowGravity = true;
                    this.pip.body.setSize(28, 28);
                    this.pip.setDisplaySize(28, 28);
                }
            }
        }

        // ── Button shelf check ────────────────────────────────────────
        if (this.buttonShelf && !this.buttonShelf.activated) {
            const bx = this.buttonShelf.x;
            const by = this.buttonShelf.y;
            if (
                Math.abs(this.pip.x - bx) < 30 &&
                Math.abs(this.pip.y - (by - 20)) < 20 &&
                this.pip.body.blocked.down
            ) {
                this.buttonShelf.activated = true;
                this.buttonShelf.setFillStyle(0x33ff33);
                this.buttonShelf.onActivate();
            }
        }

        // ── Camera midpoint ───────────────────────────────────────────
        const midX = (this.glob.x + this.pip.x) / 2;
        const midY = (this.glob.y + this.pip.y) / 2;
        this.camTarget.setPosition(midX, midY);

        // ── Fall reset ────────────────────────────────────────────────
        if (this.glob.y > 700) {
            this.glob.setPosition(80, 530);
            this.glob.body.setVelocity(0, 0);
        }
        if (this.pip.y > 700) {
            this.pip.setPosition(150, 530);
            this.pip.body.setVelocity(0, 0);
            this.pip.isCarried = false;
            this.pip.isDiving  = false;
            this.pip.isCeiling = false;
            this.pip.body.setSize(28, 28);
            this.pip.setDisplaySize(28, 28);
            this.pip.body.allowGravity = true;
            this.pipPlatformCollider.active = true;
            this.diveBarBg.setVisible(false);
            this.diveBarFill.setVisible(false);
        }

        // ── Balls ─────────────────────────────────────────────────────
        for (let i = this.activeBalls.length - 1; i >= 0; i--) {
            const b = this.activeBalls[i];
            b.obj.x += b.dir * (600 * delta / 1000);
            if (b.obj.x < 0 || b.obj.x > 3200) {
                b.obj.destroy();
                this.activeBalls.splice(i, 1);
            }
        }
    }
}