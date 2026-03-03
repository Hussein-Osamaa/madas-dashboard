<template>
  <div
    class="wheel-container bg-white shadow-2xl rounded-3xl p-8 w-full max-w-md flex flex-col items-center relative"
  >
    <div class="sparkle" ref="sparkle"></div>
    <h1 class="modern-title mb-2 tracking-tight">
      🎁 Spin the Luxury Discount Wheel!
    </h1>
    <p class="modern-desc">
      Try your luck and win a special discount!<br />Enjoy our exclusive Friday
      experience, now available for testing anytime.
    </p>
    <div class="flex flex-col items-center w-full">
      <div
        class="relative mb-4"
        :style="{ width: wheelSize + 'px', height: wheelSize + 'px' }"
      >
        <canvas
          ref="canvas"
          :width="wheelSize"
          :height="wheelSize"
          class="drop-shadow-lg rounded-full"
        ></canvas>
        <div class="gloss"></div>
        <div class="lux-pointer">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <polygon
              points="40,10 60,40 40,70 20,40"
              fill="#FFD700"
              stroke="#bfa100"
              stroke-width="3"
            />
            <polygon
              points="40,20 52,40 40,60 28,40"
              fill="#fffbe6"
              stroke="#FFD700"
              stroke-width="2"
            />
            <circle
              cx="40"
              cy="40"
              r="10"
              fill="#FFD700"
              stroke="#bfa100"
              stroke-width="2"
            />
            <circle cx="40" cy="40" r="5" fill="#fffbe6" />
          </svg>
        </div>
      </div>
      <button class="modern-btn mt-2" :disabled="spinning" @click="spin">
        Spin!
      </button>
      <div class="resultMsg mt-6 text-center" v-if="result">
        <div class="text-center">
          <p class="text-lg">Congratulations!</p>
          <p class="text-2xl font-bold text-green-600">
            Your Code: {{ result.code }}
          </p>
          <p class="text-lg">{{ result.description }}</p>
          <p class="text-sm text-red-500 mt-2">Valid for 7 days only</p>
          <p class="text-xs text-gray-500 mt-1">Use this code at checkout</p>
        </div>
      </div>
    </div>
    <audio
      ref="spinSound"
      src="https://cdn.pixabay.com/audio/2022/07/26/audio_124bfae3e2.mp3"
      preload="auto"
    ></audio>
    <audio
      ref="tickSound"
      src="https://cdn.pixabay.com/audio/2022/10/16/audio_124bfae3e2.mp3"
      preload="auto"
    ></audio>
    <audio
      ref="winSound"
      src="https://cdn.pixabay.com/audio/2022/07/26/audio_124bfae3e2.mp3"
      preload="auto"
    ></audio>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from "vue";

const props = defineProps({
  prizes: {
    type: Array,
    default: () => [
      {
        code: "SUMMER10",
        percent: 10,
        winPercent: 20,
        color: "#FFD300",
        description: "10% Off on Summer Collection",
      },
      {
        code: "FREESHIP",
        percent: 0,
        winPercent: 15,
        color: "#F0CAE1",
        description: "Free Shipping on Your Order",
      },
      {
        code: "WELCOME5",
        percent: 5,
        winPercent: 25,
        color: "#F4F4F4",
        description: "5% Off Welcome Discount",
      },
      {
        code: "SPECIAL20",
        percent: 20,
        winPercent: 10,
        color: "#27491F",
        description: "20% Off Special Offer",
      },
      {
        code: "FLASH15",
        percent: 15,
        winPercent: 15,
        color: "#F0CAE1",
        description: "15% Flash Sale",
      },
      {
        code: "BIG30",
        percent: 30,
        winPercent: 5,
        color: "#27491F",
        description: "30% Off Big Discount",
      },
    ],
  },
});

const wheelSize = 520;
const canvas = ref(null);
const sparkle = ref(null);
const spinSound = ref(null);
const tickSound = ref(null);
const winSound = ref(null);
const spinning = ref(false);
const result = ref(null);
let currentAngle = 0;

function drawWheel() {
  const ctx = canvas.value.getContext("2d");
  ctx.clearRect(0, 0, wheelSize, wheelSize);
  const totalWeight = props.prizes.reduce(
    (sum, prize) => sum + prize.winPercent,
    0
  );
  let angle = 0;
  for (let i = 0; i < props.prizes.length; i++) {
    const prize = props.prizes[i];
    const segmentAngle = 2 * Math.PI * (prize.winPercent / totalWeight);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(wheelSize / 2, wheelSize / 2);
    ctx.arc(
      wheelSize / 2,
      wheelSize / 2,
      wheelSize / 2 - 15,
      angle,
      angle + segmentAngle
    );
    ctx.closePath();
    ctx.fillStyle = prize.color;
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(wheelSize / 2, wheelSize / 2);
    ctx.arc(
      wheelSize / 2,
      wheelSize / 2,
      wheelSize / 2 - 15,
      angle,
      angle + segmentAngle
    );
    ctx.closePath();
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    // Add text
    if (segmentAngle > 0.1) {
      ctx.save();
      ctx.translate(wheelSize / 2, wheelSize / 2);
      ctx.rotate(angle + segmentAngle / 2);
      ctx.textAlign = "right";
      ctx.font = "bold 18px Playfair Display, serif";
      ctx.fillStyle = "#333";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.strokeText(prize.percent + "%", wheelSize / 2 - 30, 8);
      ctx.fillText(prize.percent + "%", wheelSize / 2 - 30, 8);
      ctx.restore();
    }
    angle += segmentAngle;
  }
  // Draw center circle
  ctx.beginPath();
  ctx.arc(wheelSize / 2, wheelSize / 2, 30, 0, 2 * Math.PI);
  ctx.fillStyle = "#fffbe6";
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 5;
  ctx.stroke();
}

function createSparkles() {
  const s = sparkle.value;
  s.innerHTML = "";
  for (let i = 0; i < 16; i++) {
    const span = document.createElement("span");
    const angle = Math.random() * 2 * Math.PI;
    const radius = 180 + Math.random() * 60;
    span.style.left = wheelSize / 2 + Math.cos(angle) * radius + "px";
    span.style.top = wheelSize / 2 + Math.sin(angle) * radius + "px";
    span.style.animationDelay = Math.random() * 2 + "s";
    s.appendChild(span);
  }
}

function generateCode(percent) {
  const words = [
    "SUMMER",
    "WINTER",
    "SPRING",
    "FALL",
    "FLASH",
    "SPECIAL",
    "BIG",
    "HAPPY",
    "LUCKY",
    "GOLD",
  ];
  const randomWord = words[Math.floor(Math.random() * words.length)];
  return randomWord + percent;
}

function spin() {
  if (spinning.value) return;
  spinning.value = true;
  result.value = null;
  spinSound.value.currentTime = 0;
  spinSound.value.play();
  // Pick winner by weight
  const totalWeight = props.prizes.reduce(
    (sum, prize) => sum + prize.winPercent,
    0
  );
  let rand = Math.random() * totalWeight;
  let winnerIdx = 0;
  let acc = 0;
  for (let i = 0; i < props.prizes.length; i++) {
    acc += props.prizes[i].winPercent;
    if (rand < acc) {
      winnerIdx = i;
      break;
    }
  }
  // Angles
  let angles = [];
  let angleSum = 0;
  for (let i = 0; i < props.prizes.length; i++) {
    let segAngle = 360 * (props.prizes[i].winPercent / totalWeight);
    angles.push({
      start: angleSum,
      end: angleSum + segAngle,
      mid: angleSum + segAngle / 2,
    });
    angleSum += segAngle;
  }
  // Stop with winner at 90deg (right)
  let winnerAngle = (angles[winnerIdx].mid + 90) % 360;
  let angularVelocity = 0;
  let maxVelocity = 30 + Math.random() * 10;
  let acceleration = 1.2;
  let deceleration = 0.15;
  let phase = "accel";
  let constantFrames = 40 + Math.floor(Math.random() * 20);
  let framesAtMax = 0;
  let totalRotation = 360 * (6 + Math.random() * 2);
  let targetFinal = totalRotation + winnerAngle;
  let tickInterval = 360 / props.prizes.length;
  let nextTick = tickInterval;
  function animate() {
    if (phase === "accel") {
      angularVelocity += acceleration;
      if (angularVelocity >= maxVelocity) {
        angularVelocity = maxVelocity;
        phase = "constant";
      }
    } else if (phase === "constant") {
      framesAtMax++;
      if (framesAtMax > constantFrames) {
        phase = "decel";
      }
    } else if (phase === "decel") {
      let remaining = targetFinal - currentAngle;
      let requiredVel = Math.sqrt(2 * deceleration * Math.max(0, remaining));
      if (angularVelocity > requiredVel) {
        angularVelocity -= deceleration;
        if (angularVelocity < requiredVel) angularVelocity = requiredVel;
      } else {
        angularVelocity = requiredVel;
      }
    }
    currentAngle += angularVelocity;
    canvas.value.style.transform = `rotate(${currentAngle}deg)`;
    if (currentAngle >= nextTick && spinning.value) {
      tickSound.value.currentTime = 0;
      tickSound.value.play();
      nextTick += tickInterval;
    }
    if (phase === "decel" && currentAngle >= targetFinal - 0.5) {
      spinning.value = false;
      canvas.value.style.transform = `rotate(${targetFinal}deg)`;
      spinSound.value.pause();
      spinSound.value.currentTime = 0;
      winSound.value.currentTime = 0;
      winSound.value.play();
      let winner = props.prizes[winnerIdx];
      const code =
        winner.percent > 0 ? generateCode(winner.percent) : winner.code;
      result.value = {
        code,
        description: winner.description,
      };
      return;
    }
    requestAnimationFrame(animate);
  }
  animate();
}

onMounted(() => {
  drawWheel();
  createSparkles();
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap");
</style>
