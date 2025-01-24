<template>
  <div>
    <div v-if="!isReady" class="loading">
      <div class="progress-bar">
        <div class="progress" :style="{ width: progress + '%' }"></div>
      </div>
      <div>正在加载资源：{{ loadingData.url }}</div>
      <div>已加载{{ loadingData.itemsLoaded || 0 }}/{{ loadingData.itemsTotal || 0 }}</div>
      <div v-if="loadingData.type === 'successLoad'">加载成功， 稍等片刻</div>
    </div>
    <GameGuide :show-mask="isReady && showGuide" :game-status="gameStatus" />
    <ScorePanel :score="score" :coin="coin" :mistake="mistake" />
    <div class="experience">
      <canvas ref="exp_canvas" class="experience__canvas"></canvas>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, computed, onUnmounted } from 'vue';
import ScorePanel from './components/ScorePanel.vue';
import GameGuide from './components/GameGuide.vue';
import Game from './Game';
// 模型是否加载完成
const isReady = ref(false);
// 比赛分数
const score = ref(0);
// 比赛金币
const coin = ref(0);
// 比赛小失误数量
const mistake = ref(0);
// 比赛的状态
const gameStatus = ref('ready');

let loadingData: any = ref({});
const exp_canvas = ref<HTMLElement>();
const showGuide = computed(() => {
  return gameStatus.value !== 'start';
});

const progress = computed(() => {
  if (!loadingData.value.itemsTotal) return 0;
  return (loadingData.value.itemsLoaded / loadingData.value.itemsTotal) * 100;
});

onMounted(() => {
  const game = new Game(exp_canvas.value);
  // 资源加载
  game.on('progress', (data: any) => {
    const { type } = data;
    if (type === 'successLoad') {
      loadingData.value.type = 'successLoad';
      isReady.value = true;
    }
    else {
      loadingData.value = data;
    }
  });
  game.on('gameStatus', (data: any) => {
    console.log(data);
    gameStatus.value = data;
  });
  game.on('gameData', (data: any) => {
    score.value = data.score;
    coin.value = data.coin;
    mistake.value = data.mistake;
  });
});
onUnmounted(() => {
  const game = new Game(exp_canvas.value);
  game?.disposeGame();
});
</script>

<style scoped>
.loading {
  position: fixed;
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  z-index: 999;
  background-color: #fff;
}

.progress-bar {
  width: 200px;
  height: 10px;
  background-color: #eee;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s ease;
}

.experience {
  position: fixed;
  height: 100vh;
  width: 100vw;
}

.experience__canvas {
  height: 100%;
  width: 100%;
}

canvas {
  width: 100vw;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
}
</style>