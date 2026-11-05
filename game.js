// Konfigurasi Karakter (Starter & Unlockable)
const CHARACTERS = {
    foxy: { name: "Foxy", color: 0xff6600, ability: "Double Jump", price: 0, unlocked: true },
    bunny: { name: "Bunny", color: 0xffffff, ability: "High Jump", price: 0, unlocked: true },
    kitty: { name: "Kitty", color: 0x333333, ability: "Dash", price: 0, unlocked: true },
    panda: { name: "Panda", color: 0xeeeeee, ability: "Shield", price: 10, unlocked: false },
    owl: { name: "Owl", color: 0x8b4513, ability: "Glide", price: 10, unlocked: false },
    bear: { name: "Bear", color: 0xa52a2a, ability: "Break", price: 15, unlocked: false },
    penguin: { name: "Penguin", color: 0x1e90ff, ability: "Ice Slide", price: 15, unlocked: false },
    cheetah: { name: "Cheetah", color: 0xffd700, ability: "Magnet", price: 20, unlocked: false }
};

// Data Profil (Disimpan di LocalStorage)
let playerData = {
    coins: 0,
    selectedChar: 'foxy',
    unlockedChars: ['foxy', 'bunny', 'kitty'],
    wardrobe: { hat: null, glasses: null }
};

// State Game Global
let gameState = {
    keys: 0,
    difficulty: 'easy',
    correctStreak: 0,
    wrongStreak: 0,
    currentQuestion: null,
    quizCallback: null,
    isMultiplayer: false,
    networkPeers: {} // Menyimpan sprite pemain lain
};

// Memuat/Inisialisasi Save Data
function loadData() {
    try {
        let sd = localStorage.getItem('edupaw_save');
        if (sd) {
            let parsed = JSON.parse(sd);
            playerData.coins = parsed.coins || 0;
            playerData.selectedChar = parsed.selectedChar || 'foxy';
            playerData.unlockedChars = parsed.unlockedChars || ['foxy', 'bunny', 'kitty'];
        }
    } catch (e) { console.warn("Save data rusak, menggunakan default."); }
    updateMenuUI();
}

function saveData() {
    localStorage.setItem('edupaw_save', JSON.stringify(playerData));
    updateMenuUI();
}

// UI Menu Logic
function updateMenuUI() {
    document.getElementById('menu-coins').innerText = playerData.coins;
    document.getElementById('hud-coins').innerText = playerData.coins;
    
    const cs = document.getElementById('char-select');
    cs.innerHTML = '';
    for (let key in CHARACTERS) {
        let char = CHARACTERS[key];
        let isUnlocked = playerData.unlockedChars.includes(key);
        let div = document.createElement('div');
        div.className = `char-card ${playerData.selectedChar === key ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`;
        div.innerHTML = `<b>${char.name}</b><br><span style="font-size:10px">${char.ability}</span><br>${!isUnlocked ? char.price + ' Koin' : 'Tersedia'}`;
        
        div.onclick = () => {
            if (isUnlocked) {
                playerData.selectedChar = key;
                updateMenuUI();
            } else if (playerData.coins >= char.price) {
                playerData.coins -= char.price;
                playerData.unlockedChars.push(key);
                saveData();
            } else {
                alert("Koin tidak cukup!");
            }
        };
        cs.appendChild(div);
    }
}

// ================= PHASER SCENES =================

class MainScene extends Phaser.Scene {
    constructor() { super({ key: 'MainScene' }); }

    preload() {
        // Menggunakan grafis internal, tidak butuh external URL
    }

    create() {
        this.generateTextures();
        this.buildLevel();
        this.setupPlayer();
        this.setupCamera();
        this.setupInput();
        this.loadQuestions();
        
        this.cooldowns = { ability: 0 };
        this.checkpoints = { x: 100, y: 300 };
        gameState.keys = 0;
        this.updateHUD();

        // Register Global event listener untuk multiplayer update
        window.updateNetworkPeers = this.updateNetworkPeers.bind(this);
    }

    generateTextures() {
        // Membuat tekstur secara prosedural via Canvas
        let g = this.make.graphics({ x: 0, y: 0, add: false });
        
        // Block Tanah
        g.fillStyle(0x4CAF50, 1).fillRect(0,0,40,40);
        g.generateTexture('ground', 40, 40);
        g.clear();

        // Block Retak (Bisa dihancurkan Bear)
        g.fillStyle(0x795548, 1).fillRect(0,0,40,40).lineStyle(2, 0x000000).moveTo(0,0).lineTo(40,40);
        g.generateTexture('cracked', 40, 40);
        g.clear();

        // Koin
        g.fillStyle(0xFFD700, 1).fillCircle(10,10,10);
        g.generateTexture('coin', 20, 20);
        g.clear();

        // Quiz Block
        g.fillStyle(0xFF9800, 1).fillRect(0,0,40,40).fillStyle(0xffffff).fillText("?", 15, 25);
        // Fallback untuk tanda tanya
        g.fillStyle(0xffffff, 1).fillRect(15,10,10,10).fillRect(15,25,10,5); 
        g.generateTexture('quizblock', 40, 40);
        g.clear();

        // Kunci
        g.fillStyle(0x00BCD4, 1).fillRect(0,5,20,10).fillRect(15,15,5,10);
        g.generateTexture('key', 20, 25);
        g.clear();
        
        // Musuh
        g.fillStyle(0xF44336, 1).fillCircle(15,15,15);
        g.generateTexture('enemy', 30, 30);
        g.clear();

        // Checkpoint / Bendera
        g.fillStyle(0xFFFFFF, 1).fillRect(0,0,5,40).fillStyle(0x03A9F4).fillRect(5,0,25,20);
        g.generateTexture('flag', 30, 40);
        g.clear();

        // Bos
        g.fillStyle(0x880000, 1).fillRect(0,0,80,80);
        g.generateTexture('boss', 80, 80);
        g.clear();

        // Pemain dinamis berdasarkan data karakter
        for (let key in CHARACTERS) {
            g.fillStyle(CHARACTERS[key].color, 1).fillRect(0,0,32,32);
            g.fillStyle(0x000000).fillRect(5,5,5,5).fillRect(22,5,5,5); // Mata
            g.generateTexture('char_' + key, 32, 32);
            g.clear();
        }
    }

    buildLevel() {
        this.platforms = this.physics.add.staticGroup();
        this.coins = this.physics.add.group({ allowGravity: false });
        this.quizBlocks = this.physics.add.staticGroup();
        this.crackedBlocks = this.physics.add.staticGroup();
        this.enemies = this.physics.add.group();
        this.checkpointsGroup = this.physics.add.staticGroup();
        
        // Peta teks sederhana: . = Kosong, X = Tanah, ? = Kuis, C = Koin, B = Retak, E = Musuh, F = Checkpoint, K = Bos
        const levelMap = [
            "................................................................",
            "................................................................",
            "....................?..........C.C.C............................",
            "..................XXXXX........XXXXX.........K..................",
            "........C.C.............................?.......................",
            "......X.X.X.X...............B.........XXXXX.....................",
            ".........................XXXX...................................",
            ".................................................F..............",
            ".....?.........E......................E.........................",
            "XXXXXXXXXXXXXXXXXXX...XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
            "XXXXXXXXXXXXXXXXXXX...XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        ];

        for (let y = 0; y < levelMap.length; y++) {
            for (let x = 0; x < levelMap[y].length; x++) {
                let px = x * 40 + 20;
                let py = y * 40 + 20;
                let char = levelMap[y][x];
                
                if (char === 'X') this.platforms.create(px, py, 'ground');
                if (char === '?') {
                    let qb = this.quizBlocks.create(px, py, 'quizblock');
                    qb.used = false;
                }
                if (char === 'B') this.crackedBlocks.create(px, py, 'cracked');
                if (char === 'C') this.coins.create(px, py, 'coin');
                if (char === 'E') {
                    let e = this.enemies.create(px, py, 'enemy');
                    e.setVelocityX(50);
                    e.setBounceX(1);
                }
                if (char === 'F') this.checkpointsGroup.create(px, py, 'flag');
                if (char === 'K') {
                    this.boss = this.physics.add.sprite(px, py, 'boss');
                    this.boss.hp = 3;
                    this.boss.setImmovable(true);
                    this.boss.body.allowGravity = false;
                    this.boss.dir = 1;
                }
            }
        }
    }

    setupPlayer() {
        let cKey = 'char_' + playerData.selectedChar;
        this.player = this.physics.add.sprite(100, 200, cKey);
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(true);
        this.physics.world.setBounds(0, 0, 64*40, 11*40);

        this.playerState = {
            jumps: 0,
            isDashing: false,
            isShielded: false,
            isGliding: false
        };

        // Collisions
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.player, this.crackedBlocks, this.handleCrackedBlock, null, this);
        this.physics.add.collider(this.enemies, this.platforms);
        
        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
        this.physics.add.overlap(this.player, this.checkpointsGroup, this.hitCheckpoint, null, this);
        this.physics.add.collider(this.player, this.quizBlocks, this.hitQuizBlock, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
    }

    setupCamera() {
        this.cameras.main.setBounds(0, 0, 64*40, 11*40);
        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
    }

    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W,A,S,D,E,SHIFT,SPACE');
        
        // Mobile UI bindings
        this.mInput = { left: false, right: false, jump: false, ability: false };
        const bindBtn = (id, key) => {
            const el = document.getElementById(id);
            el.addEventListener('touchstart', (e) => { e.preventDefault(); this.mInput[key] = true; });
            el.addEventListener('touchend', (e) => { e.preventDefault(); this.mInput[key] = false; });
        };
        bindBtn('btn-left', 'left');
        bindBtn('btn-right', 'right');
        bindBtn('btn-jump', 'jump');
        bindBtn('btn-ability', 'ability');
    }

    async loadQuestions() {
        try {
            // Karena ini file statis, gunakan jalur relatif. HTTP Server diperlukan.
            const response = await fetch('./data/questions.json');
            this.questionBank = await response.json();
        } catch (error) {
            console.error("Gagal memuat pertanyaan via Fetch. Memastikan berjalan di Local HTTP Server?", error);
            // Fallback memori jika Fetch gagal karena policy file://
            this.questionBank = {
                easy: [{ q: "1 + 1?", options: ["1","2","3","4"], answer: 1, hint: "Dasar hitungan." }],
                medium: [{ q: "5 x 5?", options: ["20","25","30","35"], answer: 1, hint: "Perkalian 5." }],
                hard: [{ q: "100 / 4?", options: ["20","25","30","50"], answer: 1, hint: "Bagi seperempat." }]
            };
        }
    }

    update(time, delta) {
        if (this.physics.world.isPaused) return;

        // Gerak Boss
        if (this.boss && this.boss.active) {
            this.boss.x += 1 * this.boss.dir;
            if (this.boss.x > this.boss.startX + 100) this.boss.dir = -1;
            if (this.boss.x < this.boss.startX - 100) this.boss.dir = 1;
        }

        let speed = this.playerState.isDashing ? 500 : 160;
        let leftPressed = this.cursors.left.isDown || this.keys.A.isDown || this.mInput.left;
        let rightPressed = this.cursors.right.isDown || this.keys.D.isDown || this.mInput.right;
        let jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.W) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || this.mInput.jump;
        let abilityPressed = Phaser.Input.Keyboard.JustDown(this.keys.E) || Phaser.Input.Keyboard.JustDown(this.keys.SHIFT) || this.mInput.ability;
        
        // Reset jump mInput after one frame manually
        if (this.mInput.jump) this.mInput.jump = false;
        if (this.mInput.ability) this.mInput.ability = false;

        // Magnet COIN (Cheetah pasif/aktif)
        if (playerData.selectedChar === 'cheetah') {
            this.coins.children.iterate((coin) => {
                if (Phaser.Math.Distance.Between(this.player.x, this.player.y, coin.x, coin.y) < 150) {
                    this.physics.moveToObject(coin, this.player, 200);
                }
            });
        }

        // Horizontal
        if (leftPressed) { this.player.setVelocityX(-speed); }
        else if (rightPressed) { this.player.setVelocityX(speed); }
        else { this.player.setVelocityX(0); }

        // Jumping Logic (Foxy Double Jump)
        let isGrounded = this.player.body.blocked.down;
        if (isGrounded) {
            this.playerState.jumps = 0;
            this.playerState.isGliding = false;
            this.player.body.setGravityY(0);
        }

        if (jumpPressed) {
            let maxJumps = playerData.selectedChar === 'foxy' ? 2 : 1;
            let jumpVelocity = playerData.selectedChar === 'bunny' ? -450 : -330;
            
            if (isGrounded || this.playerState.jumps < maxJumps) {
                this.player.setVelocityY(jumpVelocity);
                this.playerState.jumps++;
            }
        }

        // Glide (Owl)
        if (playerData.selectedChar === 'owl' && !isGrounded && this.player.body.velocity.y > 0) {
            if (this.cursors.up.isDown || this.keys.W.isDown) {
                this.player.body.setGravityY(-800); // Lawan gravitasi
                this.player.setVelocityY(50); // Turun lambat
            } else {
                this.player.body.setGravityY(0);
            }
        }

        // Abilities (Cooldown logic)
        let now = time;
        if (abilityPressed && now > this.cooldowns.ability) {
            this.activateAbility();
            this.cooldowns.ability = now + 8000; // 8 detik CD
            document.getElementById('hud-cooldown').innerText = "Cooldown...";
            this.time.delayedCall(8000, () => {
                document.getElementById('hud-cooldown').innerText = "Siap";
            });
        }

        // Jatuh ke jurang
        if (this.player.y > 11 * 40 - 20) {
            this.die();
        }

        // Network broadcast (jika multiplayer)
        if (gameState.isMultiplayer) {
            sendNetworkData({
                type: 'pos',
                x: this.player.x,
                y: this.player.y,
                char: playerData.selectedChar
            });
        }
    }

    activateAbility() {
        let char = playerData.selectedChar;
        if (char === 'kitty') {
            this.playerState.isDashing = true;
            this.time.delayedCall(300, () => { this.playerState.isDashing = false; });
        } else if (char === 'panda') {
            this.playerState.isShielded = true;
            this.player.setTint(0x00ff00);
            this.time.delayedCall(5000, () => { 
                this.playerState.isShielded = false; 
                this.player.clearTint(); 
            });
        } else if (char === 'penguin') {
            // Ice slide (menghancurkan musuh yg kena)
            this.playerState.isDashing = true; 
            this.player.body.setSize(32, 16).setOffset(0, 16);
            this.time.delayedCall(500, () => { 
                this.playerState.isDashing = false; 
                this.player.body.setSize(32, 32).setOffset(0, 0);
            });
        }
    }

    collectCoin(player, coin) {
        coin.destroy();
        playerData.coins++;
        this.updateHUD();
        saveData();
    }

    hitCheckpoint(player, flag) {
        this.checkpoints.x = flag.x;
        this.checkpoints.y = flag.y - 20;
        flag.setTint(0x00FF00); // Tanda aktif
    }

    hitEnemy(player, enemy) {
        // Injak dari atas?
        if (player.body.velocity.y > 0 && player.y < enemy.y - 10) {
            enemy.destroy();
            player.setVelocityY(-200);
        } else {
            // Jika dash penguin atau shield panda
            if (this.playerState.isShielded || (playerData.selectedChar === 'penguin' && this.playerState.isDashing)) {
                enemy.destroy();
            } else {
                this.die();
            }
        }
    }

    handleCrackedBlock(player, block) {
        if (playerData.selectedChar === 'bear' && player.body.blocked.up) {
            // Hancurkan dari bawah
            block.destroy();
        }
    }

    hitQuizBlock(player, block) {
        // Cek sundulan dari bawah
        if (player.body.blocked.up && block.body.touching.down && !block.used) {
            block.used = true;
            block.setTint(0x888888); // Abu-abu
            this.triggerQuiz(block);
        }
    }

    die() {
        this.cameras.main.shake(200, 0.01);
        this.player.setPosition(this.checkpoints.x, this.checkpoints.y);
        this.player.setVelocity(0,0);
        // Hukuman ringan
        playerData.coins = Math.max(0, playerData.coins - 2);
        this.updateHUD();
    }

    triggerQuiz(blockContext) {
        this.physics.pause(); // Hentikan dunia fisik
        
        let pool = this.questionBank[gameState.difficulty];
        if(!pool || pool.length === 0) pool = this.questionBank['easy'];
        
        let qIndex = Phaser.Math.Between(0, pool.length - 1);
        let qData = pool[qIndex];
        
        gameState.currentQuestion = qData;
        gameState.quizCallback = (isCorrect) => {
            document.getElementById('quiz-panel').classList.remove('active');
            this.physics.resume();
            
            if(isCorrect) {
                // Beri Kunci / Reward
                gameState.keys++;
                gameState.correctStreak++;
                gameState.wrongStreak = 0;
                
                // DDA (Dynamic Difficulty Adjustment)
                if (gameState.correctStreak >= 3) {
                    if (gameState.difficulty === 'easy') gameState.difficulty = 'medium';
                    else if (gameState.difficulty === 'medium') gameState.difficulty = 'hard';
                    gameState.correctStreak = 0;
                }
                
                // Animasi Kunci Naik
                let k = this.add.sprite(blockContext.x, blockContext.y - 30, 'key');
                this.tweens.add({ targets: k, y: k.y - 50, alpha: 0, duration: 1000, onComplete: () => k.destroy() });
                
                // Cek Bos Hit
                if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss?.x||0, this.boss?.y||0) < 300) {
                     this.boss.hp--;
                     if(this.boss.hp <= 0) {
                         this.boss.destroy();
                         this.showMessage("Bos Kalah!", "Kamu berhasil mengalahkan bos angka!");
                     }
                }
                
            } else {
                gameState.wrongStreak++;
                gameState.correctStreak = 0;
                
                if (gameState.wrongStreak >= 2) {
                    if (gameState.difficulty === 'hard') gameState.difficulty = 'medium';
                    else if (gameState.difficulty === 'medium') gameState.difficulty = 'easy';
                    gameState.wrongStreak = 0;
                }
                
                // Hukuman ringan (pantul)
                this.player.setVelocityY(-150);
            }
            this.updateHUD();
        };

        // Render UI
        document.getElementById('quiz-question').innerText = qData.q;
        document.getElementById('quiz-hint').style.display = (gameState.wrongStreak > 0) ? 'block' : 'none';
        document.getElementById('quiz-hint').innerText = "Petunjuk: " + (qData.hint || "-");
        
        for (let i = 0; i < 4; i++) {
            document.getElementById('ans-' + i).innerText = qData.options[i] || "";
        }
        document.getElementById('quiz-panel').classList.add('active');
    }

    updateHUD() {
        document.getElementById('hud-coins').innerText = playerData.coins;
        document.getElementById('hud-keys').innerText = gameState.keys;
        document.getElementById('hud-diff').innerText = gameState.difficulty.toUpperCase();
        
        // Cek Finish
        if (gameState.keys >= 3) {
            document.getElementById('hud-keys').style.color = '#00ff00';
            // Aktifkan finish line jika ada
        }
    }

    showMessage(title, desc) {
        document.getElementById('msg-title').innerText = title;
        document.getElementById('msg-desc').innerText = desc;
        document.getElementById('msg-panel').classList.add('active');
    }

    // Multiplayer Render Player Lain
    updateNetworkPeers(peerId, data) {
        if (!gameState.networkPeers[peerId]) {
            // Buat sprite baru
            let sprite = this.add.sprite(data.x, data.y, 'char_' + data.char);
            sprite.setAlpha(0.6); // Transparan sedikit
            gameState.networkPeers[peerId] = sprite;
        } else {
            // Update posisi
            let sprite = gameState.networkPeers[peerId];
            sprite.setTexture('char_' + data.char);
            this.tweens.add({ targets: sprite, x: data.x, y: data.y, duration: 50 });
        }
    }
}

// ================= INISIALISASI UTAMA =================
function submitAnswer(idx) {
    if (gameState.currentQuestion && gameState.quizCallback) {
        let isCorrect = (idx === gameState.currentQuestion.answer);
        gameState.quizCallback(isCorrect);
        // Sync ke network jika multiplayer
        if(gameState.isMultiplayer) sendNetworkData({ type: 'quiz_result', correct: isCorrect });
    }
}

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game-container',
        width: '100%',
        height: '100%'
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 600 }, debug: false }
    },
    scene: [MainScene]
};

let game;

// Setup Menu
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    document.getElementById('btn-start').onclick = () => {
        document.getElementById('menu-panel').classList.remove('active');
        game = new Phaser.Game(config);
    };
});