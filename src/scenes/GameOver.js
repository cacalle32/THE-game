export default class GameOver extends Phaser.Scene {
  constructor() {
    super("GameOver");
  }

  init(data) {
    this.timeLasted = data.timeLasted || 0;
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x050505).setOrigin(0);

    this.add.text(width / 2, height / 2 - 140, "GAME OVER", {
      fontSize: "64px",
      color: "#ff3333",
      fontFamily: "Arial",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 60, `You lasted: ${this.formatTime(this.timeLasted)}`, {
      fontSize: "30px",
      color: "#ffffff",
      fontFamily: "Arial"
    }).setOrigin(0.5);

    const restartText = this.add.text(width / 2, height / 2 + 30, "START GAME NOW", {
      fontSize: "32px",
      color: "#00ff88",
      fontFamily: "Arial",
      backgroundColor: "#111111",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const menuText = this.add.text(width / 2, height / 2 + 100, "RETURN TO MENU", {
      fontSize: "32px",
      color: "#66ccff",
      fontFamily: "Arial",
      backgroundColor: "#111111",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    restartText.on("pointerdown", () => {
      this.scene.start("Game");
    });

    menuText.on("pointerdown", () => {
      this.scene.start("Start");
    });

    this.input.keyboard.on("keydown-ENTER", () => {
      this.scene.start("Game");
    });

    this.input.keyboard.on("keydown-ESC", () => {
      this.scene.start("Start");
    });

    this.add.text(width / 2, height - 60, "ENTER = Restart    ESC = Menu", {
      fontSize: "20px",
      color: "#aaaaaa",
      fontFamily: "Arial"
    }).setOrigin(0.5);
  }

  formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}