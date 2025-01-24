<template>
  <div class="score_container">
      <div class="score_panel">
          <div>
              <span style="font-weight: 700;">分数:{{ Math.floor(score) }}</span>
          </div>
          <div>
              <span style="font-weight: 700;">金币数:{{ coin }}</span>
          </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import {defineProps} from 'vue';
const props = defineProps({
  score: {type: Number, default: 0},
  coin: {type: Number, default: 0},
  mistake: {type: Number, default: 0},
});
</script>

<style scoped>
.score_container {
  width: 100vw;
  height: 100vh;
  position: relative;
  z-index: 999;
}

.score_panel {
  height: 80px;
  width: 250px;
  position: absolute;
  right: 10px;
  top: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(to bottom, #3498db, #2980b9);
  color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  padding: 5px;
}

.score_panel > div {
  margin: 3px 0;
  font-size: 16px;
}
</style>
