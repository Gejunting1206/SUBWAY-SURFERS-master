import Game from '.';
import {GAME_STATUS, Obstacal, playerStatus} from './const';
import Environment, {roadLength, roadWidth} from './environment';
// import {SceneOctree} from './octree';
import * as THREE from 'three';
import {EventEmitter} from 'events';
import Player from './player';
// @ts-ignore
import showToast from '../components/Toast/index.js';
// 定义射线的方向枚举
enum Side {
    FRONT, // 前方
    BACK, // 后方
    LEFT, // 左侧
    RIGHT, // 右侧
    DOWN, // 下方
    FRONTDOWN, // 前下方
    UP // 上方
}
class AudioPlayer {
    private audio: HTMLAudioElement;
    
    constructor(audioPath: string) {
      this.audio = new Audio(audioPath);
    }
    
    play() {
      this.audio.play();
    }
    
    pause() {
      this.audio.pause();
    }
    
    stop() {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    
    setCurrentTime(time: number) {
      this.audio.currentTime = time;
    }
    
    getDuration(): number {
      return this.audio.duration;
    }
    
    getIsPlaying(): boolean {
      return !this.audio.paused;
    }
  }
export class ControlPlayer extends EventEmitter {
    model: THREE.Group; // 玩家模型
    mixer: THREE.AnimationMixer; // 动画混合器
    status!: string; // 玩家状态
    renderer!: THREE.WebGLRenderer; // 渲染器
    score: number = 0; // 分数
    coin: number = 0; // 金币数量
    allAnimate: Record<string, THREE.AnimationAction>; // 所有动画
    // velocity = new THREE.Vector3(0, 0, 0);
    runVelocity: number; // 跑步速度
    jumpHight: number; // 跳跃高度
    targetPosition!: number; // 目标位置
    // 当前轨道
    way!: number;
    lastPosition!: number; // 上一个位置
    // sceneOctree!: SceneOctree;
    isJumping: boolean = false; // 是否正在跳跃
    capsule!: THREE.Mesh<THREE.CapsuleGeometry, THREE.MeshNormalMaterial>; // 胶囊体
    game: Game;
    player: Player;
    scene: THREE.Scene = new THREE.Scene(); // 场景
    smallMistake!: number; // 小错误次数
    far: number; // 射线长度
    key!: string; // 按键
    // 原来的轨道
    originLocation!: THREE.Vector3;
    // 存储单次左右碰撞的
    removeHandle: boolean = true;
    lastAnimation!: string; // 上一个动画
    // 是否在执行滚动的动作
    roll!: boolean;
    // 是否在执行回头看的动作
    runlookback!: boolean;
    // 玩家跑步距离
    playerRunDistance!: number;
    environement: Environment = new Environment(); // 环境
    // 当前所在地板块
    currentPlane: number = -1;
    // 是否加地板
    isAddPlane: boolean = false;
    fallingSpeed: number = 0; // 下降速度
    downCollide: boolean = false; // 角色是否着地
    gameStatus: GAME_STATUS = GAME_STATUS.READY; // 比赛状态
    gameStart: boolean = false; // 游戏是否开始
    raycasterDown: THREE.Raycaster; // 向下的射线
    raycasterFrontDown: THREE.Raycaster; // 向前下的射线
    raycasterFront: THREE.Raycaster; // 向前的射线
    raycasterRight: THREE.Raycaster; // 向右的射线
    raycasterLeft: THREE.Raycaster; // 向左的射线
    frontCollide: boolean; // 是否向前碰撞
    firstFrontCollide: Record<string, any> = {isCollide: true, collideInfo: null}; // 第一次向前碰撞
    frontCollideInfo: any; // 向前碰撞信息
    leftCollide: boolean; // 是否向左碰撞
    rightCollide: boolean; // 是否向右碰撞
    upCollide: boolean; // 是否向上碰撞
    constructor(
        model: THREE.Group,
        mixer: THREE.AnimationMixer,
        currentAction: string = 'run',
        allAnimate: Record<string, THREE.AnimationAction>
    ) {
        super();
        this.model = model;
        this.mixer = mixer;
        this.game = new Game();
        this.player = new Player();
        this.scene = this.game.scene;
        this.allAnimate = allAnimate;
        // 跑步速度
        this.runVelocity = 20;
        // 跳跃高度
        this.jumpHight = 3.3;
        this.gameStart = false;
        this.far = 2.5; // 人物身高
        this.raycasterDown = new THREE.Raycaster();
        this.raycasterFrontDown = new THREE.Raycaster();
        this.raycasterFront = new THREE.Raycaster();
        this.raycasterRight = new THREE.Raycaster();
        this.raycasterLeft = new THREE.Raycaster();
        this.frontCollide = false;
        this.leftCollide = false;
        this.rightCollide = false;
        this.downCollide = true;
        this.upCollide = false;
        this.isJumping = false;
        this.startGame(currentAction, model);
        this.addAnimationListener();
        this.initRaycaster();
    }
    // 开始游戏初始化
    startGame(currentAction: string, model: THREE.Group) {
        this.status = currentAction;
        this.allAnimate[currentAction].play();
        this.lastAnimation = currentAction;
        // 当前道路
        this.way = 2;
        // 是否在滚动
        this.roll = false;
        // 是否向后看
        this.runlookback = false;
        this.playerRunDistance = model.position.z;
        this.smallMistake = 0;
        this.key = '';
        this.originLocation = model.position;
        this.lastPosition = model.position.x;
        this.targetPosition = 0;
    }
    // 初始化射线
    initRaycaster() {
        // 创建一个初始方向，例如指向Z轴
        const initialDirection = new THREE.Vector3(0, -1, 0);
        // 使用Quaternion进行旋转，创建一个30度的旋转
        const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 6); // 30度是弧度制的
        // 将初始方向旋转约30度
        const direction = initialDirection.clone().applyQuaternion(rotation).normalize();
        this.raycasterFrontDown.ray.direction = new THREE.Vector3(0, 1, 0);
        // 斜向下的射线
        this.raycasterDown.ray.direction = new THREE.Vector3(0, -1, 0);
        this.raycasterFrontDown.ray.direction = direction;
        this.raycasterLeft.ray.direction = new THREE.Vector3(-1, 0, 0);
        this.raycasterRight.ray.direction = new THREE.Vector3(1, 0, 0);
        this.raycasterDown.far = 5.8;
        this.raycasterFrontDown.far = 3;
    }
    // 添加键盘事件监听
    // @ts-ignore
    addAnimationListener() {
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            const key = e.key;
            // 开始游戏
            if (key === 'p') {
                if (!this.gameStart) {
                    this.gameStart = true;
                    this.gameStatus = GAME_STATUS.START;
                    this.key === 'p';
                    this.game.emit('gameStatus', this.gameStatus);
                }
            }
            else if (
                key === 'ArrowUp'  // 上箭头
                && this.status !== playerStatus.JUMP
                && this.status !== playerStatus.FALL
                && this.downCollide
            ) {
                if (!this.gameStart || this.status === playerStatus.DIE) {
                    return;
                }
                const path = "public/assets/audio/jump.mp3"
                const audio_player = new AudioPlayer(path)
                audio_player.play()
                this.key = 'ArrowUp';
                this.downCollide = false;
                this.isJumping = true;
                setTimeout(() => {
                    this.isJumping = false;
                }, 50);
                this.fallingSpeed += this.jumpHight * 0.1;
            }
            else if (key === 'ArrowDown' && !this.roll && this.status !== playerStatus.ROLL) {  // 下箭头
                if (!this.gameStart || this.status === playerStatus.DIE) {
                    return;
                }
                this.roll = true;
                setTimeout(() => {
                    this.roll = false;
                }, 620);
                this.key = 'ArrowDown';
                this.fallingSpeed = -5 * 0.1;
            }
            else if (key === 'ArrowLeft') {  // 左箭头
                if (!this.gameStart || this.status === playerStatus.DIE) {
                    return;
                }
                // 位于最左边的道路
                if (this.way === 1) {
                    this.runlookback = true;
                    this.emit('collision');
                    showToast('撞到障碍物！请注意！！！');
                    setTimeout(() => {
                        this.runlookback = false;
                    }, 1040);
                    const auduo_player = new AudioPlayer("public/assets/audio/bump.mp3")
                    auduo_player.play()
                    this.smallMistake += 1;
                    return;
                }
                this.way -= 1;
                this.originLocation = this.model.position.clone();
                this.lastPosition = this.model.position.clone().x;
                this.targetPosition -= roadWidth / 3;
            }
            else if (key === 'ArrowRight') {  // 右箭头
                if (!this.gameStart || this.status === playerStatus.DIE) {
                    return;
                }
                if (this.way === 3) {
                    this.runlookback = true;
                    this.emit('collision');
                    showToast('撞到障碍物！请注意！！！');
                    setTimeout(() => {
                        this.runlookback = false;
                    }, 1040);
                    this.smallMistake += 1;
                    return;
                }
                const auduo_player = new AudioPlayer("public/assets/audio/bump.mp3")
                auduo_player.play()
                this.originLocation = this.model.position.clone();
                this.lastPosition = this.model.position.clone().x;
                this.targetPosition += roadWidth / 3;
                this.way += 1;
            }
            else if (key === 'r') {
                this.gameStatus = GAME_STATUS.READY;
                this.game.emit('gameStatus', this.gameStatus);
                this.smallMistake = 0;
                while (this.scene.children.length > 0) {
                    this.scene.remove(this.scene.children[0]);
                }
                // disposeNode(this.scene);
                this.environement.startGame();
                this.player.createPlayer(false);
            }
        });
    }
// 左右移动控制
handleLeftRightMove() {
    const targetPosition = this.targetPosition;
    const lastPosition = this.lastPosition;
    if (Math.abs(targetPosition - lastPosition) < 1) {
        this.removeHandle = true;
    }
    if (targetPosition !== lastPosition) {
        // removehandle处理单次碰撞
        // 处理左右碰撞回弹效果
        if ((this.leftCollide || this.rightCollide) && this.removeHandle) {
            const auduo_player = new AudioPlayer("public/assets/audio/bump.mp3")
            auduo_player.play()
            this.smallMistake += 1;
            this.emit('collision');
            showToast('撞到障碍物！请注意！！！');
            this.targetPosition = this.originLocation.x;
            this.removeHandle = false;
            if (targetPosition > lastPosition) {
                this.way -= 1;
            }
            else {
                this.way += 1;
            }
        }
        // 平滑移动逻辑
        const moveSpeed = 0.15; // 移动速度
        const diff = targetPosition - lastPosition;
        if (Math.abs(diff) > 0.0001) {
            this.model.position.x += diff * moveSpeed;
            this.lastPosition += diff * moveSpeed;
        }
    }
}
    // 上下移动控制
    handleUpdownMove() {
    }
    // 全部射线碰撞检测
    collideCheckAll() {
        const position = this.model.position.clone();
        try {
            // 地面检测  far射线长度
            this.collideCheck(Side.DOWN, position, 5);
            this.collideCheck(Side.FRONTDOWN, position, 3);
            this.collideCheck(Side.FRONT, position, 2);
            this.collideCheck(Side.LEFT, position, 1);
            this.collideCheck(Side.RIGHT, position, 1);
        }
        catch (error) {
            console.log(error);
        }
    }
    // 单个射线碰撞检测
    collideCheck(
        side: Side,
        position: THREE.Vector3,
        far: number = 2.5
    ) {
        let coinCollected = false; // 新增标志，表示是否已经收集到金币
        const {x, y, z} = position;
        switch (side) {
            case Side.DOWN:
                // 设置向下射线的起点和长度
                this.raycasterDown.ray.origin = new THREE.Vector3(x, y + 4, z + 0.5);
                this.raycasterDown.far = far;
                break;
            case Side.FRONTDOWN:
                // 设置前下方射线的起点和长度
                this.raycasterFrontDown.ray.origin = new THREE.Vector3(x, y + 2, z);
                this.raycasterFrontDown.far = far;
                break;
            case Side.FRONT:
                // 设置向前射线的起点和长度
                this.raycasterFront.ray.origin = new THREE.Vector3(x, y + 2, z - 1);
                this.raycasterFront.far = far;
            case Side.LEFT:
                // 设置向左射线的起点和长度
                this.raycasterLeft.ray.origin = new THREE.Vector3(x + 0.5, y + 2, z);
                this.raycasterLeft.far = far;
            case Side.RIGHT:
                // 设置向右射线的起点和长度
                this.raycasterRight.ray.origin = new THREE.Vector3(x - 0.5, y + 2, z);
                this.raycasterRight.far = far;
        }
        // const arrowHelper = new THREE.ArrowHelper(
        //     this.raycasterFront.ray.direction,
        //     this.raycasterFront.ray.origin,
        //     this.raycasterFront.far,
        //     0xff0000
        // );
        // this.scene.add(arrowHelper);
        const ds = this.playerRunDistance;
        // 当前所在的地板块
        const nowPlane = Math.floor(ds / roadLength);
        const intersectPlane = this.environement.plane?.[nowPlane];
        const intersectObstacal = this.environement.obstacal?.[nowPlane];
        const intersectCoin = this.environement.coin?.[nowPlane];
        if (!intersectObstacal && !intersectPlane) {
            return;
        }
        // update collide
        const origin = new THREE.Vector3(x, position.y + 3, z);
        const originDown = new THREE.Vector3(x, position.y + 4.6, z - 0.5);
        switch (side) {
            case Side.DOWN: {
                if (!intersectPlane) {
                    return;
                }
                // 检测是否撞到地面或障碍物
                const c1 = this.raycasterDown.intersectObjects(
                    [intersectPlane, intersectObstacal]
                )[0]?.object.name;
                this.raycasterDown.ray.origin = originDown;
                const c2 = this.raycasterDown.intersectObjects(
                    [intersectPlane, intersectObstacal]
                )[0]?.object.name;
                c1 || c2 ? (this.downCollide = true) : (this.downCollide = false);
                break;
            }
            case Side.FRONT: {
                // 检测是否撞到金币
                const r1 = this.raycasterFront.intersectObjects([intersectObstacal, intersectCoin])[0];
                const r1Name = r1?.object.name;
                if (r1Name === 'coin' && !coinCollected) {
                    r1.object.visible = false;
                    this.coin += 1;
                    coinCollected = true; // 标记已收集到金币
                }
                const c1 = r1Name && r1Name !== 'coin';
                this.raycasterFront.far = 1.5;
                // 检测是否撞到障碍物
                const r2 = this.raycasterFront.intersectObjects([intersectObstacal, intersectCoin])[0];
                const r2Name = r2?.object.name;
                if (r2Name === 'coin' && !coinCollected) {
                    r2.object.visible = false;
                    this.coin += 1;
                    coinCollected = true; // 标记已收集到金币
                }
                // 撞击点信息
                const c2 = r2Name && r2Name !== 'coin';
                this.frontCollideInfo = r1 || r2;
                c1 || c2 ? (this.frontCollide = true) : (this.frontCollide = false);
                break;
            }
            case Side.FRONTDOWN: {
                // 检测是否撞到金币
                const r1 = this.raycasterFrontDown.intersectObjects([intersectObstacal, intersectCoin])[0];
                const r1Name = r1?.object.name;
                if (r1Name === 'coin' && !coinCollected) {
                    r1.object.visible = false;
                    this.coin += 1;
                    coinCollected = true; // 标记已收集到金币
                }
                // 检测是否撞到障碍物
                const c1 = r1Name && r1Name !== 'coin';
                c1 ? (this.frontCollide = true) : (this.frontCollide = false);
                break;
            }
            case Side.LEFT: {
                // 检测是否撞到金币
                const r1 = this.raycasterLeft.intersectObjects([intersectObstacal, intersectCoin])[0];
                const r1Name = r1?.object.name;
                if (r1Name === 'coin' && !coinCollected) {
                    r1.object.visible = false;
                    this.coin += 1;
                    coinCollected = true; // 标记已收集到金币
                }
                const c1 = r1Name && r1Name !== 'coin';
                this.raycasterLeft.ray.origin = origin;
                // 检测是否撞到障碍物
                const r2 = this.raycasterLeft.intersectObjects([intersectObstacal, intersectCoin])[0];
                const r2Name = r2?.object.name;
                if (r2Name === 'coin' && !coinCollected) {
                    r2.object.visible = false;
                    this.coin += 1;
                    coinCollected = true; // 标记已收集到金币
                }
                // 撞击点信息
                const c2 = r2Name && r2Name !== 'coin';
                c1 || c2 ? (this.leftCollide = true) : (this.leftCollide = false);
                break;
            }
            case Side.RIGHT: {
                // 检测是否撞到金币
                const r1 = this.raycasterRight.intersectObjects([intersectObstacal, intersectCoin])[0];
                const r1Name = r1?.object.name;
                if (r1Name === 'coin' && !coinCollected) {
                    r1.object.visible = false;
                    this.coin += 1;
                    coinCollected = true; // 标记已收集到金币
                }
                const c1 = r1Name && r1Name !== 'coin';
                this.raycasterRight.ray.origin = origin;
                // 检测是否撞到障碍物
                const r2 = this.raycasterRight.intersectObjects([intersectObstacal, intersectCoin])[0];
                const r2Name = r2?.object.name;
                if (r2Name === 'coin' && !coinCollected) {
                    r2.object.visible = false;
                    this.coin += 1;
                    coinCollected = true; // 标记已收集到金币
                }
                // 撞击点信息
                const c2 = r2Name && r2Name !== 'coin';
                c1 || c2 ? (this.rightCollide = true) : (this.rightCollide = false);
                break;
            }
        }
        if (coinCollected){
            const auduo_player = new AudioPlayer("public/assets/audio/jump.mp3")
            auduo_player.play()
        }
    }
    // 控制人物的动作变化
    changeStatus(delta: number) {
        if (!this.gameStart) {
            return;
        }
        const moveZ = this.runVelocity * delta;
        if (!this.frontCollide) {
            if (this.status !== playerStatus.DIE) {
                this.playerRunDistance += moveZ;
                this.model.position.z -= moveZ;
            }
        }
        if (this.status === playerStatus.DIE) {
            this.status = playerStatus.DIE;
        }
        else if (this.fallingSpeed > 0) {
            this.status = playerStatus.JUMP;
        }
        else if (this.fallingSpeed < 0 && this.key !== 's') {
            this.status = playerStatus.FALL;
        }
        else if (this.roll) {
            this.status = playerStatus.ROLL;
        }
        else if (this.key === 'p') {
            this.status = playerStatus.RUN;
        }
        else if (!this.roll && this.fallingSpeed === 0 && !this.runlookback) {
            this.status = playerStatus.RUN;
        }
        else if (this.runlookback) {
            this.status = playerStatus.RUNLOOKBACK;
        }
        // 重复动画不执行
        if (this.status === this.lastAnimation) {
            return;
        }
        this.lastAnimation && this.allAnimate[this.lastAnimation].fadeOut(0.1);
        this.allAnimate[this.status].reset().fadeIn(0.1).play();
        this.lastAnimation = this.status;
    }
    // 检查玩家距离
    checkPlayerDistance() {
        const ds = this.playerRunDistance;
        // 当前所在的地板块
        const nowPlane = Math.floor(ds / roadLength) + 1;
        // 当前走的路程站总长度的百分比
        // 当到达45%的时候动态添加场景  无限地图
        const runToLength = (ds - roadLength * (nowPlane - 1)) / roadLength;
        if (runToLength > 0.45 && this.currentPlane !== nowPlane) {
            console.log('添加下一个地板');
            this.currentPlane = nowPlane;
            this.environement.z -= roadLength;
            const newZ = this.environement.z;
            // 放置在z轴方向上
            this.environement.setGroupScene(newZ, -5 - nowPlane * roadLength, false);
        }
    }
    // 向前的碰撞检测判定
    frontCollideCheckStatus() {
        if (this.frontCollide && this.firstFrontCollide.isCollide) {
            const {object} = this.frontCollideInfo;
            const {y} = this.frontCollideInfo.point;
            const point = Number(y - 2);
            const obstacal = Number(Obstacal[object.name]?.y);
            // 计算撞击面积百分比
            const locateObstacal = point / obstacal;
            console.log('障碍物', object.name, '障碍物的百分比', locateObstacal);
            this.firstFrontCollide = {isCollide: false, name: object.name};
            // 障碍物撞击面积大于0.75，直接判定游戏结束 播放角色死亡动画
            if (locateObstacal < 0.75) {
                this.status = playerStatus.DIE;
                this.gameStatus = GAME_STATUS.END;
                const auduo_player = new AudioPlayer("public/assets/audio/gameover.mp3")
                auduo_player.play()
                showToast('你死了！请重新开始游戏！');
                this.game.emit('gameStatus', this.gameStatus);
            }
            else {
                this.fallingSpeed += 0.4;
                this.model.position.y += obstacal * (1 - locateObstacal);
                const auduo_player = new AudioPlayer("public/assets/audio/bump.mp3")
                auduo_player.play()
                this.smallMistake += 1;
                this.emit('collision');
                showToast('撞到障碍物！请注意！！！');
                this.firstFrontCollide.isCollide = false;
                setTimeout(() => {
                    this.firstFrontCollide.isCollide = true;
                }, 400); 
            }
        }
    }
    // 金币旋转
    coinRotate() {
        const ds = this.playerRunDistance;
        // 当前所在的地板块
        const nowPlane = Math.floor(ds / roadLength);
        const nowPlane1 = nowPlane + 1;
        const intersectCoin = this.environement.coin?.[nowPlane];
        const intersectCoin1 = this.environement.coin?.[nowPlane1];
        // 使得两个场景的硬币做旋转动画
        intersectCoin && intersectCoin.traverse(mesh => {
            if (mesh.name === 'coin') {
                mesh.rotation.z += Math.random() * 0.1;
            }
        });
        intersectCoin1 && intersectCoin1.traverse(mesh => {
            if (mesh.name === 'coin') {
                mesh.rotation.z += Math.random() * 0.1;
            }
        });
    }
    // 检查比赛状态
    checkGameStatus() {
        const mistake = this.smallMistake;
        // 小错误到达两次则直接终止比赛
        if (mistake >= 2 && this.gameStatus !== GAME_STATUS.END) {
            this.status = playerStatus.DIE;
            this.gameStatus = GAME_STATUS.END;
            const auduo_player = new AudioPlayer("public/assets/audio/gameover.mp3")
            auduo_player.play()
            this.game.emit('gameStatus', this.gameStatus);
        }
    }
    // 更新玩家状态
    update(delta: number) {
        this.changeStatus(delta);
        this.handleLeftRightMove();
        this.checkPlayerDistance();
        this.collideCheckAll();
        this.frontCollideCheckStatus();
        this.coinRotate();
        this.checkGameStatus();
        if (this.gameStatus === GAME_STATUS.START) {
            this.game.emit('gameData', {score: this.score += 0.01, coin: this.coin, mistake: this.smallMistake});
        }
        // 重力或者跳跃
        if (this.isJumping || !this.downCollide) {
            const ratio = 0.1;
            this.fallingSpeed += -9.2 * ratio * delta;
            this.model.position.add(new THREE.Vector3(0, this.fallingSpeed, 0));
        }
        else {
            this.fallingSpeed = 0;
        }
    }
}