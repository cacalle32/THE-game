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

        // ================= PLAYER =================
        this.player = this.physics.add.sprite(50, 300, "player", 0);
        this.player.setDisplaySize(40, 60);
        this.player.speed = 200;
        this.player.jumpPower = -300;
        this.player.coyoteTimeMs = 100;
        this.player.coyoteTimerMs = 0;

        this.player.play("idle");

        // idle behavior tracking
        this.playerIdleStart = this.time.now;
        this.nextRandomIdleStretch = this.time.now + Phaser.Math.Between(3000, 7000);
        this.isStretching = false;

        // ================= SHADOW =================
        this.shadow = this.physics.add.sprite(100, 300, null)
            .setDisplaySize(30, 50)
            .setTint(0x555555);

        this.shadow.speed = 220;
        this.shadow.phasing = false;

        // this is the actual "which character am I controlling?" flag
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

        this.switchPressedLastFrame = false;

        this.input.keyboard.on("keydown-SHIFT", () => {
            this.toggleActiveCharacter();
        });

        // ================= WORLD =================
        this.world = [
            { x: 0, y: 350, w: 800, h: 50, kind: "solid" },
            { x: 260, y: 300, w: 100, h: 10, kind: "solid" },
            { x: 150, y: 200, w: 60, h: 150, kind: "shadowWall" },
            { x: 180, y: 320, w: 20, h: 20, kind: "switch", on: false, cooldownMs: 0 }
        ];

        this.platforms = this.physics.add.staticGroup();
        this.shadowWalls = this.physics.add.staticGroup();
        this.switches = [];

        for (const obj of this.world) {
            const rect = this.add.rectangle(obj.x, obj.y, obj.w, obj.h, 0xffffff)
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
        this.cameras.main.startFollow(this.player, true, 1, 1);

        // ================= ANIMATION COMPLETE =================
        this.player.on("animationcomplete-idleStretch", () => {
            this.isStretching = false;
            this.player.play("idle");

            this.playerIdleStart = this.time.now;
            this.nextRandomIdleStretch = this.time.now + Phaser.Math.Between(3000, 7000);
        });
    }

    toggleActiveCharacter() {
        this.isShadowActive = !this.isShadowActive;

        const followTarget = this.isShadowActive ? this.shadow : this.player;
        this.cameras.main.startFollow(followTarget, true, 1, 1);
    }

    isSwitchOn() {
        return this.switches.some(s => s.on);
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
        const switchPressed = !!(pad && pad.buttons[3].pressed);

        if (switchPressed && !this.switchPressedLastFrame) {
            this.toggleActiveCharacter();
        }
        this.switchPressedLastFrame = switchPressed;

        // STOP inactive character horizontal movement only
        if (this.isShadowActive) {
            this.player.setVelocityX(0);
        } else {
            this.shadow.setVelocityX(0);
        }

        // =====================================================
        // PLAYER
        // =====================================================
        if (!this.isShadowActive) {
            this.player.setVelocityX(0);

            let move = 0;

            if (this.keys.a.isDown) move = -1;
            if (this.keys.d.isDown) move = 1;

            if (pad) {
                const axis = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
                if (Math.abs(axis) > 0.1) move = axis;
            }

            this.player.setVelocityX(move * this.player.speed);

            const jumpPressed =
                this.keys.space.isDown ||
                !!(pad && pad.buttons[0].pressed);

            if (this.player.body.blocked.down) {
                this.player.coyoteTimerMs = this.player.coyoteTimeMs;
            } else {
                this.player.coyoteTimerMs = Math.max(0, this.player.coyoteTimerMs - delta);
            }

            if (jumpPressed && this.player.coyoteTimerMs > 0) {
                this.player.setVelocityY(this.player.jumpPower);
                this.player.coyoteTimerMs = 0;
            }

            // ================= IDLE STRETCH LOGIC =================
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
                if (!this.isStretching && this.player.anims.currentAnim?.key !== "idle") {
                    this.player.play("idle", true);
                }

                const idleTime = this.time.now - this.playerIdleStart;

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
        if (this.isShadowActive) {
            this.shadow.setVelocity(0);

            let move = 0;

            if (this.keys.a.isDown) move = -1;
            if (this.keys.d.isDown) move = 1;

            if (pad) {
                const axis = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
                if (Math.abs(axis) > 0.1) move = axis;
            }

            this.shadow.setVelocityX(move * this.shadow.speed);

            const phasing =
                this.keys.s.isDown ||
                !!(pad && pad.buttons[5].pressed);

            this.shadow.phasing = phasing;
            this.shadowWallColliderShadow.active = !phasing;

            if (phasing) {
                this.shadow.body.allowGravity = false;

                let vertical = 0;

                if (this.keys.w.isDown) vertical = -1;
                if (this.keys.s.isDown) vertical = 1;

                if (pad) {
                    const axisY = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
                    if (Math.abs(axisY) > 0.1) vertical = axisY;
                }

                this.shadow.setVelocityY(vertical * this.shadow.speed);
            } else {
                this.shadow.body.allowGravity = true;
            }

            // ================= SWITCH =================
            const interact =
                this.keys.e.isDown ||
                !!(pad && pad.buttons[2].pressed);

            for (const sw of this.switches) {
                if (
                    Phaser.Geom.Intersects.RectangleToRectangle(
                        this.shadow.getBounds(),
                        sw.rect.getBounds()
                    )
                ) {
                    if (interact && sw.cooldownMs <= 0) {
                        sw.on = !sw.on;
                        sw.cooldownMs = 250;
                        sw.rect.setFillStyle(sw.on ? 0x00ff66 : 0xff4444);
                    }
                }

                if (sw.cooldownMs > 0) {
                    sw.cooldownMs = Math.max(0, sw.cooldownMs - delta);
                }
            }
        }

        // ================= SHADOW WALL VISIBILITY =================
        const on = this.isSwitchOn();

        this.shadowWalls.children.iterate((wall) => {
            wall.setVisible(!on);
            wall.body.enable = !on;
        });
    }
}