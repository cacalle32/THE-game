export default class CharSelect extends Phaser.Scene {
    constructor() {
        super("CharSelect");
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.globClaim = null;
        this.pipClaim  = null;
        this.globReady = false;
        this.pipReady  = false;

        // selecting = "glob" means we're waiting for glob to be claimed first
        this.selecting = "glob";

        // ── background ───────────────────────────────────────────────
        this.add.rectangle(W / 2, H / 2, W, H, 0x111111);

        // ── title ────────────────────────────────────────────────────
        this.add.text(W / 2, 60, "CHOOSE YOUR SLIME", {
            fontSize: "32px",
            color: "#ffffff",
            fontStyle: "bold"
        }).setOrigin(0.5);

        this.instructionText = this.add.text(W / 2, 100,
            "Player 1: press WASD or ARROW KEYS to claim GLOB", {
            fontSize: "16px",
            color: "#ffff55"
        }).setOrigin(0.5);

        // ── cards ────────────────────────────────────────────────────
        this.globCardObj = this.makeCard(W * 0.28, H * 0.5, 0x33cc33, "GLOB", [
            "Big & slow",
            "Single jump",
            "Shoots slimeballs",
            "Breaks walls",
            "Carries Pip"
        ]);

        this.pipCardObj = this.makeCard(W * 0.72, H * 0.5, 0x66ff66, "PIP", [
            "Small & fast",
            "Double jump",
            "Wall slide",
            "Ceiling cling",
            "Rides on Glob"
        ]);

        // ── claim labels ─────────────────────────────────────────────
        this.globLabel = this.add.text(W * 0.28, H * 0.5 + 175, "Unclaimed", {
            fontSize: "18px", color: "#888888"
        }).setOrigin(0.5);

        this.pipLabel = this.add.text(W * 0.72, H * 0.5 + 175, "Unclaimed", {
            fontSize: "18px", color: "#888888"
        }).setOrigin(0.5);

        // ── start prompt ─────────────────────────────────────────────
        this.startPrompt = this.add.text(W / 2, H - 60,
            "Both players press their UP key to start!", {
            fontSize: "20px", color: "#ffff55", fontStyle: "bold"
        }).setOrigin(0.5).setVisible(false);

        // ── highlight Glob first ─────────────────────────────────────
        this.setHighlight("glob");

        // ── pulse tween on highlighted card ──────────────────────────
        this.highlightTween = this.tweens.add({
            targets: this.globCardObj.list[0],
            scaleX: 1.03,
            scaleY: 1.03,
            duration: 600,
            yoyo: true,
            repeat: -1
        });

        this.input.keyboard.on("keydown", (e) => this.handleKey(e.code));
    }

    makeCard(x, y, color, name, traits) {
        const card = this.add.container(x, y);
        card.add(this.add.rectangle(0, 0, 260, 320, 0x222222)
            .setStrokeStyle(2, color));
        card.add(this.add.rectangle(0, -105, 60, 60, color));
        card.add(this.add.text(0, -60, name, {
            fontSize: "26px", color: "#ffffff", fontStyle: "bold"
        }).setOrigin(0.5));
        traits.forEach((t, i) => {
            card.add(this.add.text(0, -20 + i * 30, "• " + t, {
                fontSize: "14px", color: "#cccccc"
            }).setOrigin(0.5));
        });
        return card;
    }

    setHighlight(which) {
        // Glob card panel is index 0 in each container
        const globPanel = this.globCardObj.list[0];
        const pipPanel  = this.pipCardObj.list[0];

        if (which === "glob") {
            globPanel.setStrokeStyle(5, 0xffff00);
            globPanel.setFillStyle(0x2a3a1a);
            pipPanel.setStrokeStyle(2, 0x66ff66);
            pipPanel.setFillStyle(0x222222);
        } else if (which === "pip") {
            pipPanel.setStrokeStyle(5, 0xffff00);
            pipPanel.setFillStyle(0x1a3a2a);
            globPanel.setStrokeStyle(2, 0x33cc33);
            globPanel.setFillStyle(0x222222);
        } else {
            // both claimed — no highlight
            globPanel.setStrokeStyle(4, 0x33cc33);
            pipPanel.setStrokeStyle(4, 0x66ff66);
        }
    }

    handleKey(code) {
        const wasdKeys  = ["KeyA", "KeyD", "KeyW", "KeyS"];
        const arrowKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
        const isWASD    = wasdKeys.includes(code);
        const isArrow   = arrowKeys.includes(code);
        if (!isWASD && !isArrow) return;

        const input = isWASD ? "wasd" : "arrows";

        // ── Step 1: claim Glob ───────────────────────────────────────
        if (this.selecting === "glob") {
            this.globClaim = input;
            this.globLabel
                .setText(input === "wasd" ? "Player 1 (WASD)" : "Player 1 (Arrows)")
                .setColor(input === "wasd" ? "#33cc33" : "#66ff66");

            // stop pulse, lock glob card
            if (this.highlightTween) this.highlightTween.stop();
            this.globCardObj.list[0].setScale(1);
            this.globCardObj.list[0].setFillStyle(0x2a3a1a);
            this.globCardObj.list[0].setStrokeStyle(4, 0x33cc33);

            // highlight Pip next
            this.selecting = "pip";
            this.setHighlight("pip");

            const other = input === "wasd" ? "ARROW KEYS" : "WASD";
            this.instructionText.setText(
                `Player 2: press ${other} to claim PIP`
            );

            // pulse Pip card
            this.highlightTween = this.tweens.add({
                targets: this.pipCardObj.list[0],
                scaleX: 1.03,
                scaleY: 1.03,
                duration: 600,
                yoyo: true,
                repeat: -1
            });
            return;
        }

        // ── Step 2: claim Pip (must be different input) ──────────────
        if (this.selecting === "pip") {
            if (input === this.globClaim) return; // same keys, ignore

            this.pipClaim = input;
            this.pipLabel
                .setText(input === "wasd" ? "Player 2 (WASD)" : "Player 2 (Arrows)")
                .setColor(input === "wasd" ? "#33cc33" : "#66ff66");

            if (this.highlightTween) this.highlightTween.stop();
            this.pipCardObj.list[0].setScale(1);
            this.setHighlight("none");

            this.selecting = "ready";
            this.instructionText.setText("Both claimed! Press your UP key to start.");
            this.startPrompt.setVisible(true);
            return;
        }

        // ── Step 3: both press UP to launch ─────────────────────────
        if (this.selecting === "ready") {
            const upKey = isWASD ? "KeyW" : "ArrowUp";
            if (code !== upKey) return;

            if (input === this.globClaim) this.globReady = true;
            if (input === this.pipClaim)  this.pipReady  = true;

            // flash the relevant label green when ready
            if (input === this.globClaim) this.globLabel.setColor("#ffff55");
            if (input === this.pipClaim)  this.pipLabel.setColor("#ffff55");

            if (this.globReady && this.pipReady) {
                this.registry.set("globControl", this.globClaim);
                this.registry.set("pipControl",  this.pipClaim);
                this.scene.start("Game");
            }
        }
    }
}