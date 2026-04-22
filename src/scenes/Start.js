export default class Start extends Phaser.Scene {
    constructor() {
        super("Start");
    }

    preload() {
        this.load.spritesheet("player", "assets/Bob.png", {
            frameWidth: 250,
            frameHeight: 250
        });
    }

    create() {
        this.input.gamepad.once("connected", (pad) => {
            console.log("Controller connected:", pad.id);
        });

        // ================= ANIMATIONS =================
        this.anims.create({
            key: "idle",
            frames: [{ key: "player", frame: 0 }],
            frameRate: 1,
            repeat: -1
        });

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

        // ================= PLAYER =================
        this.player = this.physics.add.sprite(50, 300, "player", 0);
        this.player.setDisplaySize(40, 60);
        this.player.speed = 200;
        this.player.jumpPower = -300;
        this.player.coyoteTime = 6;
        this.player.coyoteTimer = 0;

        // idle behavior tracking
        this.playerIdleStart = this.time.now;
        this.nextRandomIdleStretch = this.time.now + Phaser.Math.Between(3000, 7000);
        this.isStretching = false;

        this.player.play("idle");

        // ================= SHADOW =================
        this.shadow = this.physics.add.sprite(100, 300, null)
            .setDisplaySize(30, 50)
            .setTint(0x555555);

        this.shadow.speed = 220;
        this.shadow.active = false;
        this.shadow.phasing = false;

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
            this.shadow.active = !this.shadow.active;
        });

        this.switchPressedLastFrame = false;

        // ================= WORLD =================
        this.world = [
            { x: 0, y: 350, w: 800, h: 50, kind: "solid" },
            { x: 260, y: 300, w: 100, h: 10, kind: "solid" },
            { x: 150, y: 200, w: 60, h: 150, kind: "shadowWall" },
            { x: 180, y: 320, w: 20, h: 20, kind: "switch", on: false, cooldown: 0 }
        ];

        this.platforms = this.physics.add.staticGroup();
        this.shadowWalls = this.physics.add.staticGroup();
        this.switches = [];

        for (let obj of this.world) {
            let rect = this.add.rectangle(obj.x, obj.y, obj.w, obj.h, 0xffffff)
                .setOrigin(0);

            if (obj.kind === "solid") {
                rect.setFillStyle(0x777777);
                this.physics.add.existing(rect, true);
                this.platforms.add(rect);
            }

            if (obj.kind === "shadowWall") {
                rect.setFillStyle(0x222222);
                this.physics.add.existing(rect, true);
                this.shadowWalls.add(rect);
                obj.rect = rect;
            }

            if (obj.kind === "switch") {
                rect.setFillStyle(0xff4444);
                this.physics.add.existing(rect, true);
                obj.rect = rect;
                this.switches.push(obj);
            }
        }

        // ================= COLLISIONS =================
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.shadow, this.platforms);

        this.shadowWallColliderPlayer =
            this.physics.add.collider(this.player, this.shadowWalls);

        this.shadowWallColliderShadow =
            this.physics.add.collider(this.shadow, this.shadowWalls);

        // ================= CAMERA =================
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // ================= ANIMATION COMPLETE =================
        this.player.on("animationcomplete-idleStretch", () => {
            this.isStretching = false;
            this.player.play("idle");

            this.playerIdleStart = this.time.now;
            this.nextRandomIdleStretch = this.time.now + Phaser.Math.Between(3000, 7000);
        });
    }

    isSwitchOn() {
        return this.switches.some(s => s.on);
    }

    tryIdleStretch() {
        if (this.isStretching) return;
        if (this.shadow.active) return;
        if (!this.player.body.blocked.down) return;

        this.isStretching = true;
        this.player.play("idleStretch");
    }

    update() {
        let pad = this.input.gamepad.getPad(0);
        let switchPressed = pad && pad.buttons[3].pressed;

        if (switchPressed && !this.switchPressedLastFrame) {
            this.shadow.active = !this.shadow.active;
        }
        this.switchPressedLastFrame = switchPressed;

        // STOP inactive horizontal movement only
        if (this.shadow.active) {
            this.player.setVelocity(0, this.player.body.velocity.y);
        } else {
            this.shadow.setVelocity(0, this.shadow.body.velocity.y);
        }

        // ================= CAMERA =================
        let active = this.shadow.active ? this.shadow : this.player;
        this.cameras.main.startFollow(active, true, 0.1, 0.1);

        // =====================================================
        // PLAYER
        // =====================================================
        if (!this.shadow.active) {
            this.player.setVelocityX(0);

            let move = 0;

            if (this.keys.a.isDown) move = -1;
            if (this.keys.d.isDown) move = 1;

            if (pad) {
                let axis = pad.axes[0].getValue();
                if (Math.abs(axis) > 0.1) move = axis;
            }

            this.player.setVelocityX(move * this.player.speed);

            let jumpPressed = this.keys.space.isDown ||
                              (pad && pad.buttons[0].pressed);

            if (this.player.body.blocked.down) {
                this.player.coyoteTimer = this.player.coyoteTime;
            } else {
                this.player.coyoteTimer--;
            }

            if (jumpPressed && this.player.coyoteTimer > 0) {
                this.player.setVelocityY(this.player.jumpPower);
                this.player.coyoteTimer = 0;
            }

            // ================= IDLE STRETCH LOGIC =================
            let isMoving =
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
                if (!this.isStretching && this.player.anims.currentAnim?.key !== "idle") {
                    this.player.play("idle", true);
                }

                let idleTime = this.time.now - this.playerIdleStart;

                if (
                    idleTime >= 10000 ||
                    this.time.now >= this.nextRandomIdleStretch
                ) {
                    this.tryIdleStretch();
                }
            }
        }

        // =====================================================
        // SHADOW
        // =====================================================
        if (this.shadow.active) {
            this.shadow.setVelocity(0);

            let move = 0;

            if (this.keys.a.isDown) move = -1;
            if (this.keys.d.isDown) move = 1;

            if (pad) {
                let axis = pad.axes[0].getValue();
                if (Math.abs(axis) > 0.1) move = axis;
            }

            this.shadow.setVelocityX(move * this.shadow.speed);

            let phasing = this.keys.s.isDown ||
                          (pad && pad.buttons[5].pressed);

            this.shadow.phasing = phasing;
            this.shadowWallColliderShadow.active = !phasing;

            if (phasing) {
                this.shadow.body.allowGravity = false;

                let vertical = 0;

                if (this.keys.w.isDown) vertical = -1;
                if (this.keys.s.isDown) vertical = 1;

                if (pad) {
                    let axisY = pad.axes[1].getValue();
                    if (Math.abs(axisY) > 0.1) vertical = axisY;
                }

                this.shadow.setVelocityY(vertical * this.shadow.speed);
            } else {
                this.shadow.body.allowGravity = true;
            }

            // ================= SWITCH =================
            let interact = this.keys.e.isDown ||
                           (pad && pad.buttons[2].pressed);

            for (let sw of this.switches) {
                if (Phaser.Geom.Intersects.RectangleToRectangle(
                    this.shadow.getBounds(),
                    sw.rect.getBounds()
                )) {
                    if (interact && sw.cooldown <= 0) {
                        sw.on = !sw.on;
                        sw.cooldown = 15;
                        sw.rect.setFillStyle(sw.on ? 0x00ff66 : 0xff4444);
                    }
                }

                if (sw.cooldown > 0) sw.cooldown--;
            }
        }

        // ================= SHADOW WALL VISIBILITY =================
        let on = this.isSwitchOn();

        this.shadowWalls.children.iterate(wall => {
            wall.setVisible(!on);
            wall.body.enable = !on;
        });
    }
}