export default class Start extends Phaser.Scene {

    constructor() {
        super("Start");
    }

    create() {

        this.add.text(
            400,
            300,
            "Press ENTER to Start",
            {
                fontSize: "32px",
                color: "#ffffff"
            }
        ).setOrigin(0.5);

        this.input.keyboard.on("keydown-ENTER", () => {
            this.scene.start("CharSelect");
        });

    }

}