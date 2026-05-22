import Start from "./scenes/Start.js";
import Game from "./scenes/Game.js";
import GameOver from "./scenes/GameOver.js";
import Pause from "./scenes/Pause.js";
import CharSelect from "./scenes/CharSelect.js";
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 400 },
            debug: false
        }
    },
    input: {
    gamepad: true
},
    scene: [Start, Game, GameOver, Pause, CharSelect]
};

new Phaser.Game(config);