function mulberry32(a) {
    return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

const rand = mulberry32(Date.now());

const {
    Engine, Render, Runner, Composites, Common, MouseConstraint, Mouse,
    Composite, Bodies, Events, Query,
} = Matter;

const wallPad = 64;
const loseHeight = 84;
const statusBarHeight = 48;
const previewBallHeight = 32;
const friction = {
    friction: 0.006,
    frictionStatic: 0.006,
    frictionAir: 0,
    restitution: 0.1
};

const GameStates = {
    MENU: 0,
    READY: 1,
    DROP: 2,
    LOSE: 3,
};

const Game = {
    width: 640,
    height: 960,
    elements: {
        canvas: document.getElementById('game-canvas'),
        ui: document.getElementById('game-ui'),
        score: document.getElementById('game-score'),
        end: document.getElementById('game-end-container'),
        endTitle: document.getElementById('game-end-title'),
        statusValue: document.getElementById('game-highscore-value'),
        nextFruitImg: document.getElementById('game-next-fruit'),
        previewBall: null,
    },
    cache: { highscore: 0 },
    sounds: {
        click: new Audio('./assets/click.mp3'),
        pop0: new Audio('./assets/pop0.mp3'),
        pop1: new Audio('./assets/pop1.mp3'),
        pop2: new Audio('./assets/pop2.mp3'),
        pop3: new Audio('./assets/pop3.mp3'),
        pop4: new Audio('./assets/pop4.mp3'),
        pop5: new Audio('./assets/pop5.mp3'),
        pop6: new Audio('./assets/pop6.mp3'),
        pop7: new Audio('./assets/pop7.mp3'),
        pop8: new Audio('./assets/pop8.mp3'),
        pop9: new Audio('./assets/pop9.mp3'),
        pop10: new Audio('./assets/pop10.mp3'),
    },
    globalVolume: 0.5, // Уровень громкости (0.0 - 1.0)

    stateIndex: GameStates.MENU,

    score: 0,
    fruitsMerged: [],
    calculateScore: function () {
        const score = Game.fruitsMerged.reduce((total, count, sizeIndex) => {
            const value = Game.fruitSizes[sizeIndex].scoreValue * count;
            return total + value;
        }, 0);

        Game.score = score;
        Game.elements.score.innerText = Game.score;
    },

    fruitSizes: [
        { radius: 24,  scoreValue: 1,  img: './assets/img/circle0.png'  },
        { radius: 32,  scoreValue: 3,  img: './assets/img/circle1.png'  },
        { radius: 40,  scoreValue: 6,  img: './assets/img/circle2.png'  },
        { radius: 56,  scoreValue: 10, img: './assets/img/circle3.png'  },
        { radius: 64,  scoreValue: 15, img: './assets/img/circle4.png'  },
        { radius: 72,  scoreValue: 21, img: './assets/img/circle5.png'  },
        { radius: 84,  scoreValue: 28, img: './assets/img/circle6.png'  },
        { radius: 96,  scoreValue: 36, img: './assets/img/circle7.png'  },
        { radius: 128, scoreValue: 45, img: './assets/img/circle8.png'  },
        { radius: 160, scoreValue: 55, img: './assets/img/circle9.png'  },
        { radius: 192, scoreValue: 66, img: './assets/img/circle10.png' },
    ],
    currentFruitSize: 0,
    nextFruitSize: 0,
    setNextFruitSize: function () {
        Game.nextFruitSize = Math.floor(rand() * 5);
        Game.elements.nextFruitImg.src = Game.fruitSizes[Game.nextFruitSize].img;
    },

    showHighscore: function () {
        Game.elements.statusValue.innerText = Game.cache.highscore;
    },
    loadHighscore: function () {
        const gameCache = localStorage.getItem('suika-game-cache-v2');
        if (gameCache === null) {
            Game.saveHighscore();
            return;
        }

        Game.cache = JSON.parse(gameCache);
        Game.showHighscore();
    },
    saveHighscore: function () {
        Game.calculateScore();
        if (Game.score < Game.cache.highscore) return;

        Game.cache.highscore = Game.score;
        Game.showHighscore();
        Game.elements.endTitle.innerText = 'Новый рекорд!';

        localStorage.setItem('suika-game-cache-v2', JSON.stringify(Game.cache));
    },

    randomizeTextures: function() {
        const allTextures = Array.from({length: 22}, (_, i) => `./assets/img/circle${i}.png`);
        const shuffled = [...allTextures].sort(() => 0.5 - rand());
        return shuffled.slice(0, 11);
    },

    setVolume: function(volume) {
        Game.globalVolume = Math.max(0, Math.min(1, volume));
        Object.values(Game.sounds).forEach(sound => {
            sound.volume = Game.globalVolume;
        });
    },

    initGame: function () {
        if (!Game.elements.canvas) {
            console.error('Game canvas container (#game-canvas) not found!');
            return;
        }

        Game.setVolume(0.1);

        Render.run(render);
        Runner.run(runner, engine);

        const menuTextures = Game.randomizeTextures();
        const circles = Array.from({length: 11}, (_, index) => {
            const x = (Game.width / 2) + 192 * Math.cos((Math.PI * 2 * index)/12);
            const y = (Game.height * 0.4) + 192 * Math.sin((Math.PI * 2 * index)/12);
            const r = 64;
            return Bodies.circle(x, y, r, {
                isStatic: true,
                render: {
                    sprite: {
                        texture: menuTextures[index],
                        xScale: r / 1024,
                        yScale: r / 1024,
                    },
                },
            });
        });

        menuStatics.length = 0;
        menuStatics.push(
            Bodies.rectangle(Game.width / 2, Game.height * 0.4, 512, 512, {
                isStatic: true,
                render: { sprite: { texture: './assets/img/bg-menu.png' } },
            }),
            ...circles,
            Bodies.rectangle(Game.width / 2, Game.height * 0.75, 512, 96, {
                isStatic: true,
                label: 'btn-start',
                render: { sprite: { texture: './assets/img/btn-start.png' } },
            })
        );

        Composite.add(engine.world, menuStatics);

        Game.loadHighscore();
        Game.elements.ui.style.display = 'none';
        Game.fruitsMerged = Array.apply(null, Array(Game.fruitSizes.length)).map(() => 0);

        const menuMouseDown = function () {
            if (mouseConstraint.body === null || mouseConstraint.body?.label !== 'btn-start') {
                return;
            }

            Events.off(mouseConstraint, 'mousedown', menuMouseDown);
            Game.startGame();
        }

        Events.on(mouseConstraint, 'mousedown', menuMouseDown);

        Events.on(mouseConstraint, 'mousemove', function (e) {
            if (Game.stateIndex === GameStates.MENU) {
                const bodiesUnderMouse = Query.point(Composite.allBodies(engine.world), e.mouse.position);
                const overButton = bodiesUnderMouse.some(body => body.label === 'btn-start');
                render.canvas.style.cursor = overButton ? 'pointer' : 'default';
            }
        });
    },

    startGame: function () {
        Game.sounds.click.play();

        const gameTextures = Game.randomizeTextures();
        Game.fruitSizes.forEach((size, index) => {
            size.img = gameTextures[index];
        });

        Composite.remove(engine.world, menuStatics);
        Composite.add(engine.world, gameStatics);

        Game.calculateScore();
        Game.elements.endTitle.innerText = 'Игра окончена!';
        Game.elements.ui.style.display = 'block';
        Game.elements.end.style.display = 'none';
        Game.elements.previewBall = Game.generateFruitBody(Game.width / 2, previewBallHeight, 0, { isStatic: true });
        Composite.add(engine.world, Game.elements.previewBall);

        setTimeout(() => {
            Game.stateIndex = GameStates.READY;
        }, 250);

        Events.on(mouseConstraint, 'mouseup', function (e) {
            Game.addFruit(e.mouse.position.x);
        });

        Events.on(mouseConstraint, 'mousemove', function (e) {
            if (Game.stateIndex !== GameStates.READY) return;
            if (Game.elements.previewBall === null) return;

            Game.elements.previewBall.position.x = e.mouse.position.x;
        });

        Events.on(engine, 'collisionStart', function (e) {
            for (let i = 0; i < e.pairs.length; i++) {
                const { bodyA, bodyB } = e.pairs[i];

                if (bodyA.isStatic || bodyB.isStatic) continue;

                const aY = bodyA.position.y + bodyA.circleRadius;
                const bY = bodyB.position.y + bodyB.circleRadius;

                if (aY < loseHeight || bY < loseHeight) {
                    Game.loseGame();
                    return;
                }

                if (bodyA.sizeIndex !== bodyB.sizeIndex) continue;

                if (bodyA.popped || bodyB.popped) continue;

                let newSize = bodyA.sizeIndex + 1;

                if (bodyA.circleRadius >= Game.fruitSizes[Game.fruitSizes.length - 1].radius) {
                    newSize = 0;
                }

                Game.fruitsMerged[bodyA.sizeIndex] += 1;

                const midPosX = (bodyA.position.x + bodyB.position.x) / 2;
                const midPosY = (bodyA.position.y + bodyB.position.y) / 2;

                bodyA.popped = true;
                bodyB.popped = true;

                Game.sounds[`pop${bodyA.sizeIndex}`].play();
                Composite.remove(engine.world, [bodyA, bodyB]);
                Composite.add(engine.world, Game.generateFruitBody(midPosX, midPosY, newSize));
                Game.addPop(midPosX, midPosY, bodyA.circleRadius);
                Game.calculateScore();
            }
        });
    },

    addPop: function (x, y, r) {
        const circle = Bodies.circle(x, y, r, {
            isStatic: true,
            collisionFilter: { mask: 0x0040 },
            angle: rand() * (Math.PI * 2),
            render: {
                sprite: {
                    texture: './assets/img/pop.png',
                    xScale: r / 384,
                    yScale: r / 384,
                }
            },
        });

        Composite.add(engine.world, circle);
        setTimeout(() => {
            Composite.remove(engine.world, circle);
        }, 100);
    },

    loseGame: function () {
        Game.stateIndex = GameStates.LOSE;
        Game.elements.end.style.display = 'flex';
        runner.enabled = false;
        Game.saveHighscore();
        const nickname = prompt("Введите ваш ник (до 16 символов):", "Игрок");
        if (nickname) {
            fetch("assets/save_score.php", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `nickname=${encodeURIComponent(nickname)}&score=${Game.score}`
            }).then(() => loadLeaderboard());
        }
    },

    lookupFruitIndex: function (radius) {
        const sizeIndex = Game.fruitSizes.findIndex(size => size.radius == radius);
        if (sizeIndex === undefined) return null;
        if (sizeIndex === Game.fruitSizes.length - 1) return null;

        return sizeIndex;
    },

    generateFruitBody: function (x, y, sizeIndex, extraConfig = {}) {
        const size = Game.fruitSizes[sizeIndex];
        const circle = Bodies.circle(x, y, size.radius, {
            ...friction,
            ...extraConfig,
            render: { sprite: { texture: size.img, xScale: size.radius / 512, yScale: size.radius / 512 } },
        });
        circle.sizeIndex = sizeIndex;
        circle.popped = false;

        return circle;
    },

    addFruit: function (x) {
        if (Game.stateIndex !== GameStates.READY) return;

        Game.sounds.click.play();

        Game.stateIndex = GameStates.DROP;
        const latestFruit = Game.generateFruitBody(x, previewBallHeight, Game.currentFruitSize);
        Composite.add(engine.world, latestFruit);

        Game.currentFruitSize = Game.nextFruitSize;
        Game.setNextFruitSize();
        Game.calculateScore();

        Composite.remove(engine.world, Game.elements.previewBall);
        Game.elements.previewBall = Game.generateFruitBody(render.mouse.position.x, previewBallHeight, Game.currentFruitSize, {
            isStatic: true,
            collisionFilter: { mask: 0x0040 }
        });

        setTimeout(() => {
            if (Game.stateIndex === GameStates.DROP) {
                Composite.add(engine.world, Game.elements.previewBall);
                Game.stateIndex = GameStates.READY;
            }
        }, 500);
    }
}

const engine = Engine.create();
const runner = Runner.create();
const render = Render.create({
    element: Game.elements.canvas,
    engine,
    options: {
        width: Game.width,
        height: Game.height,
        wireframes: false,
        background: 'rgba(0, 0, 0, 0.33)'
    }
});

const menuStatics = [
    Bodies.rectangle(Game.width / 2, Game.height * 0.4, 512, 512, {
        isStatic: true,
        render: { sprite: { texture: './assets/img/bg-menu.png' } },
    }),
    Bodies.rectangle(Game.width / 2, Game.height * 0.75, 512, 96, {
        isStatic: true,
        label: 'btn-start',
        render: { sprite: { texture: './assets/img/btn-start.png' } },
    }),
];

const wallProps = {
    isStatic: true,
    render: { fillStyle: '#FFEEDB' },
    ...friction,
};

const gameStatics = [
    Bodies.rectangle(-(wallPad / 2), Game.height / 2, wallPad, Game.height, wallProps),
    Bodies.rectangle(Game.width + (wallPad / 2), Game.height / 2, wallPad, Game.height, wallProps),
    Bodies.rectangle(Game.width / 2, Game.height + (wallPad / 2) - statusBarHeight, Game.width, wallPad, wallProps),
];

const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: {
            visible: false,
        },
    },
});
render.mouse = mouse;

Game.initGame();

const resizeCanvas = () => {
    const screenWidth = document.body.clientWidth;
    const screenHeight = document.body.clientHeight;

    let newWidth = Game.width;
    let newHeight = Game.height;
    let scaleUI = 1;

    if (screenWidth * 1.5 > screenHeight) {
        newHeight = Math.min(Game.height, screenHeight);
        newWidth = newHeight / 1.5;
        scaleUI = newHeight / Game.height;
    } else {
        newWidth = Math.min(Game.width, screenWidth);
        newHeight = newWidth * 1.5;
        scaleUI = newWidth / Game.width;
    }

    render.canvas.style.width = `${newWidth}px`;
    render.canvas.style.height = `${newHeight}px`;

    Game.elements.ui.style.width = `${Game.width}px`;
    Game.elements.ui.style.height = `${Game.height}px`;
    Game.elements.ui.style.transform = `scale(${scaleUI})`;
};


async function loadLeaderboard(period = "day") {
    const res = await fetch("assets/get_top.php");
    const data = await res.json();

    const list = document.getElementById("leaderboard-list");
    list.innerHTML = "";
    data[period].forEach((row, i) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${i+1}. ${row.nickname}</span><span>${row.best_score}</span>`;
        list.appendChild(li);
    });
}

document.querySelectorAll("#leaderboard button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#leaderboard button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    loadLeaderboard(btn.dataset.tab);
  });
});

document.querySelector('#leaderboard button[data-tab="day"]').classList.add("active");
loadLeaderboard("day");




document.body.onload = resizeCanvas;
document.body.onresize = resizeCanvas;