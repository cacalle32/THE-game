export default class Pause extends Phaser.Scene {
    constructor() {
        super("Pause");
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // ── dim overlay ──────────────────────────────────────────────
        this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55);

        // ── panel ────────────────────────────────────────────────────
        this.add.rectangle(W / 2, H / 2, 340, 260, 0x111111, 0.92)
            .setStrokeStyle(2, 0x8855ff);

        // ── title ────────────────────────────────────────────────────
        this.add.text(W / 2, H / 2 - 95, "PAUSED", {
            fontSize: "36px",
            color: "#ffffff",
            fontStyle: "bold"
        }).setOrigin(0.5);

        // ── buttons ──────────────────────────────────────────────────
        this.makeButton(W / 2, H / 2 - 20, "Resume",  () => this.resume());
        this.makeButton(W / 2, H / 2 + 55, "Restart", () => this.restart());
        this.makeButton(W / 2, H / 2 + 115, "Main Menu", () => this.mainMenu());

        // ── keyboard shortcut ────────────────────────────────────────
        this.input.keyboard.once("keydown-ESC", () => this.resume());
        this.input.keyboard.once("keydown-P",   () => this.resume());
    }

    // ── helper ───────────────────────────────────────────────────────
    makeButton(x, y, label, callback) {
        const btn = this.add.rectangle(x, y, 220, 44, 0x333333)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(1, 0x8855ff);

        const txt = this.add.text(x, y, label, {
            fontSize: "20px",
            color: "#dddddd"
        }).setOrigin(0.5);

        btn.on("pointerover", () => {
            btn.setFillStyle(0x8855ff);
            txt.setColor("#ffffff");
        });

        btn.on("pointerout", () => {
            btn.setFillStyle(0x333333);
            txt.setColor("#dddddd");
        });

        btn.on("pointerdown", callback);
    }

    // ── actions ──────────────────────────────────────────────────────
    resume() {
        this.scene.resume("Game");
        this.scene.stop("Pause");
    }

    restart() {
        this.scene.stop("Pause");
        this.scene.stop("Game");
        this.scene.start("Game");
    }

    mainMenu() {
        this.scene.stop("Pause");
        this.scene.stop("Game");
        this.scene.start("Start");
    }
}