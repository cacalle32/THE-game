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
        this.levelComplete = false;

        // ================= WORLD =================
        this.physics.world.gravity.y = 900;
        this.physics.world.setBounds(0, 0, 3200, 650);

        // ================= GROUPS =================
        this.platforms   = this.physics.add.staticGroup();
        this.slimeBalls  = this.physics.add.group();
        this.breakWalls  = this.physics.add.staticGroup(); // walls big slime can shoot

        // ================= LEVEL =================
        this.buildLevel();

        // ================= BIG SLIME (Glob) — Player 1: WASD =================
        this.glob = this.add.rectangle(80, 530, 54, 54, 0x33cc33);
        this.physics.add.existing(this.glob);
        this.glob.body.setCollideWorldBounds(true);
        this.glob.body.setSize(54, 54);
        this.glob.speed      = 180;
        this.glob.jumpPower  = -480;
        this.glob.jumpsUsed  = 0;
        this.glob.maxJumps   = 1;   // big slime: single jump only
        this.glob.facing     = 1;
        this.glob.shootCooldown = 0;
        this.glob.carrying   = false; // is Pip riding on top?

        // ================= SMALL SLIME (Pip) — Player 2: Arrow keys =================
        this.pip = this.add.rectangle(150, 530, 28, 28, 0x66ff66);
        this.physics.add.existing(this.pip);
        this.pip.body.setCollideWorldBounds(true);
        this.pip.body.setSize(28, 28);
        this.pip.speed      = 290;   // faster than Glob
        this.pip.jumpPower  = -520;
        this.pip.jumpsUsed  = 0;
        this.pip.maxJumps   = 2;     // small slime: double jump
        this.pip.facing     = 1;
        this.pip.wallClimbing = false;
        this.pip.onCeiling    = false;
        this.pip.isCarried    = false;

        // ================= INPUT =================
        // Player 1 (Glob): WASD + 1 to shoot
        this.keysGlob = this.input.keyboard.addKeys({
            left:  "A",
            right: "D",
            up:    "W",
            shoot: "ONE"    // key "1" to shoot
        });

        // Player 2 (Pip): Arrow keys
        this.keysPip = this.input.keyboard.addKeys({
            left:  "LEFT",
            right: "RIGHT",
            up:    "UP",
            down:  "DOWN"
        });

        // ESC to pause
        this.input.keyboard.on("keydown-ESC", () => {
            this.scene.launch("Pause");
            this.scene.pause("Game");
        });

        // ================= COLLISIONS =================
        this.physics.add.collider(this.glob, this.platforms);
        this.physics.add.collider(this.pip,  this.platforms);

        // Slimeballs vs platforms
        this.physics.add.collider(this.slimeBalls, this.platforms, (ball) => {
            ball.destroy();
        });

        // Slimeballs vs breakable walls
        this.physics.add.overlap(this.slimeBalls, this.breakWalls, (ball, wall) => {
            ball.destroy();
            this.breakWall(wall);
        });

        // Exit overlap — both slimes must reach the exit
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
        // Camera follows the midpoint between the two slimes
        this.cameras.main.setBounds(0, 0, 3200, 650);
        this.camTarget = this.add.rectangle(115, 530, 1, 1, 0x000000, 0);
        this.physics.add.existing(this.camTarget);
        this.camTarget.body.allowGravity = false;
        this.cameras.main.startFollow(this.camTarget, true, 0.08, 0.08);

        // ================= HUD =================
        this.hud = this.add.text(16, 16,
            "GLOB: WASD move | W jump | [1] shoot wall\nPIP:  Arrows move | UP jump (x2) | cling to ceilings\nBoth must reach the exit  |  ESC = pause",
            { fontSize: "14px", color: "#ddffdd" }
        ).setScrollFactor(0);
    }

    // ─────────────────────────────────────────────────────────────────
    //  LEVEL BUILDER
    // ─────────────────────────────────────────────────────────────────
    buildLevel() {
        const G = 0x556655;   // ground/platform colour
        const B = 0xff5522;   // breakable wall colour

        // Ground sections (gaps at 900-1150 for the carry-jump puzzle,
        // and at 1700-1750 for the narrow-gap section)
        this.makeBlock(0,    600, 900,  50, G);   // start ground
        this.makeBlock(1150, 600, 550,  50, G);   // mid ground
        this.makeBlock(1800, 600, 1400, 50, G);   // end ground

        // ── Section 1: small steps that only Pip can reach easily ──
        this.makeBlock(250, 530, 100, 18, G);
        this.makeBlock(420, 470, 100, 18, G);
        this.makeBlock(600, 410, 100, 18, G);
        // Button on the high shelf — Pip runs up and hits it to open gate below
        this.makeBlock(600, 320, 130, 18, G);
        this.buttonShelf = this.makeActivationBlock(660, 295, 36, 26, 0xff3333, () => this.openGate());
        this.add.text(635, 260, "PIP\nSTEP ON", { fontSize: "12px", color: "#ff9999" }).setOrigin(0.5);

        // ── Gate blocking Glob ──
        this.gate = this.makeBlock(820, 470, 24, 130, 0xaa33ff);

        // ── Section 2: WIDE GAP — Glob must carry Pip ──
        // Gap runs from x=900 to x=1150 (250px — too wide for either alone)
        this.add.text(980, 555, "← WIDE GAP →\nGlob carries Pip!", {
            fontSize: "13px", color: "#ffff88"
        }).setOrigin(0.5);

        // A low ceiling over the gap so Pip can cling and cross alone
        // (but Glob is too tall and can't fit — needs to carry Pip over)
        // hint sign
        this.add.text(910, 490, "Pip: ride Glob!\nGlob: W to jump", {
            fontSize: "12px", color: "#aaffaa"
        });

        // ── Section 3: mid platforms ──
        this.makeBlock(1200, 540, 160, 18, G);
        this.makeBlock(1380, 490, 120, 18, G);

        // ── Breakable wall blocking path ──
        this.makeBreakWall(1540, 430, 30, 170, B);
        this.add.text(1543, 390, "SHOOT\nWALL", { fontSize: "12px", color: "#ff8866" });

        // ── Section 4: ceiling-cling corridor for Pip ──
        // A low-roofed tunnel only Pip (28px tall) fits through;
        // Glob (54px) must go around via upper route
        this.makeBlock(1700, 480, 200, 16, G);    // floor of tunnel
        this.makeBlock(1700, 415, 200, 16, G);    // ceiling of tunnel (gap = 65px, Pip=28 fits, Glob=54 doesn't)
        this.add.text(1750, 440, "PIP\nONLY", { fontSize: "12px", color: "#aaffaa" }).setOrigin(0.5);

        // Upper route for Glob
        this.makeBlock(1650, 370, 80,  16, G);
        this.makeBlock(1750, 310, 180, 16, G);
        this.makeBlock(1960, 370, 80,  16, G);

        // ── Final stretch & exit ──
        this.makeBlock(2100, 540, 400, 18, G);
        this.makeBlock(2600, 490, 200, 18, G);
        this.makeBlock(2850, 430, 200, 18, G);

        // Exit zone
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

    // A pressure-plate style block: when Pip stands on it the callback fires
    makeActivationBlock(x, y, w, h, color, onActivate) {
        const block = this.add.rectangle(x, y, w, h, color).setOrigin(0.5);
        this.physics.add.existing(block, true);
        this.platforms.add(block);
        block.activated = false;
        block.onActivate = onActivate;
        return block;
    }

    breakWall(wall) {
        // Flash then destroy
        this.tweens.add({
            targets: wall,
            alpha: 0,
            duration: 180,
            onComplete: () => {
                this.breakWalls.remove(wall, true, true);
            }
        });
    }

    openGate() {
        if (this.gateOpen) return;
        this.gateOpen = true;
        this.tweens.add({
            targets: this.gate,
            alpha: 0,
            duration: 250,
            onComplete: () => {
                this.platforms.remove(this.gate, true, true);
            }
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
    //  SHOOTING  (Glob only, straight ahead, no gravity, 1.5s cooldown)
    // ─────────────────────────────────────────────────────────────────
    shootSlimeBall() {
        const now = this.time.now;
        if (now < this.glob.shootCooldown) return;
        this.glob.shootCooldown = now + 1500;

        const dir = this.glob.facing;
        const ball = this.add.circle(
            this.glob.x + dir * 34,
            this.glob.y,
            13,
            0x55ff55
        );
        this.physics.add.existing(ball);
        ball.body.allowGravity = false;
        ball.body.setCircle(13);
        ball.body.setVelocityX(dir * 620);

        this.slimeBalls.add(ball);

        // Auto-destroy after 3 s
        this.time.delayedCall(3000, () => {
            if (ball && ball.active) ball.destroy();
        });
    }

    // ─────────────────────────────────────────────────────────────────
    //  UPDATE
    // ─────────────────────────────────────────────────────────────────
    update(time) {

        // ── GLOB (Player 1 — WASD) ──────────────────────────────────
        {
            const onGround = this.glob.body.blocked.down;
            if (onGround) this.glob.jumpsUsed = 0;

            let moveX = 0;
            if (this.keysGlob.left.isDown)  moveX = -1;
            if (this.keysGlob.right.isDown) moveX =  1;
            if (moveX !== 0) this.glob.facing = moveX;

            // Glob can't move freely if Pip is riding (carry system)
            this.glob.body.setVelocityX(moveX * this.glob.speed);

            if (Phaser.Input.Keyboard.JustDown(this.keysGlob.up) &&
                this.glob.jumpsUsed < this.glob.maxJumps) {
                this.glob.body.setVelocityY(this.glob.jumpPower);
                this.glob.jumpsUsed++;
            }

            if (Phaser.Input.Keyboard.JustDown(this.keysGlob.shoot)) {
                this.shootSlimeBall();
            }
        }

        // ── PIP (Player 2 — Arrow keys) ─────────────────────────────
        {
            const onGround  = this.pip.body.blocked.down;
            const onCeiling = this.pip.body.blocked.up;
            const onWallL   = this.pip.body.blocked.left;
            const onWallR   = this.pip.body.blocked.right;

            if (onGround) this.pip.jumpsUsed = 0;

            let moveX = 0;
            if (this.keysPip.left.isDown)  moveX = -1;
            if (this.keysPip.right.isDown) moveX =  1;
            if (moveX !== 0) this.pip.facing = moveX;

            // ── Ceiling cling ──
            // If Pip is pressed against the ceiling, gravity is cancelled
            if (onCeiling) {
                this.pip.body.allowGravity = false;
                this.pip.body.setVelocityY(0);
                this.pip.setFillStyle(0xaaff44); // tint hint
            } else {
                this.pip.body.allowGravity = true;
                this.pip.setFillStyle(0x66ff66);
            }

            // ── Wall slide ──
            if ((onWallL || onWallR) && !onGround && !onCeiling) {
                this.pip.body.setVelocityY(
                    Math.min(this.pip.body.velocity.y, 60) // slow slide
                );
            }

            this.pip.body.setVelocityX(moveX * this.pip.speed);

            // Jump / wall-jump / ceiling drop
            if (Phaser.Input.Keyboard.JustDown(this.keysPip.up)) {
                if (onCeiling) {
                    // Drop off ceiling
                    this.pip.body.allowGravity = true;
                    this.pip.body.setVelocityY(100);
                } else if (this.pip.jumpsUsed < this.pip.maxJumps) {
                    this.pip.body.setVelocityY(this.pip.jumpPower);
                    this.pip.jumpsUsed++;
                }
            }

            // ── Carry system ──
            // If Pip stands on top of Glob, treat Pip as carried:
            // lock Pip's position to Glob's top and move with it.
            const pipFeetY  = this.pip.y + 14;
            const globTopY  = this.glob.y - 27;
            const horizDiff = Math.abs(this.pip.x - this.glob.x);

            const landingOnGlob =
                pipFeetY >= globTopY - 6 &&
                pipFeetY <= globTopY + 10 &&
                horizDiff < 30 &&
                this.pip.body.velocity.y >= 0;

            if (landingOnGlob) {
                this.pip.isCarried = true;
            }

            if (this.pip.isCarried) {
                // Pip rides Glob
                this.pip.body.allowGravity = false;
                this.pip.body.setVelocity(0, 0);
                this.pip.setPosition(this.glob.x, this.glob.y - 41);

                // Pip jumps off Glob
                if (Phaser.Input.Keyboard.JustDown(this.keysPip.up)) {
                    this.pip.isCarried = false;
                    this.pip.body.allowGravity = true;
                    this.pip.body.setVelocityY(this.pip.jumpPower);
                    this.pip.jumpsUsed = 1;
                }

                // Pip slides off if player moves away from Glob
                if (horizDiff > 32) {
                    this.pip.isCarried = false;
                    this.pip.body.allowGravity = true;
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
            this.pip.body.allowGravity = true;
        }
    }
}