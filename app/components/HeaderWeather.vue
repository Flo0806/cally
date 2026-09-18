<script setup lang="ts">
import { Temporal } from "temporal-polyfill";
import { WEEKDAY_LABELS } from "~/utils/calendar";
import { weatherInfo } from "~/utils/weather";
import { useApi } from "~/utils/api";

const REFRESH_MS = 15 * 60 * 1000;

const { data, error, refresh } = await useApi("/api/weather");

// The tablet stays on for days, so keep the forecast moving without a reload.
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  timer = setInterval(refresh, REFRESH_MS);
});
onUnmounted(() => clearInterval(timer));

const now = computed(() => {
  if (!data.value) return null;
  return {
    ...weatherInfo(data.value.current.code, data.value.current.isDay),
    temp: data.value.current.temp,
    today: data.value.days[0],
  };
});

const upcoming = computed(() =>
  (data.value?.days.slice(1) ?? []).map((day) => ({
    ...day,
    ...weatherInfo(day.code),
    weekday: WEEKDAY_LABELS[Temporal.PlainDate.from(day.date).dayOfWeek - 1],
  })),
);
</script>

<template>
  <div class="weather">
    <p v-if="error" class="unavailable">Wetter nicht verfügbar</p>

    <template v-else-if="now">
      <div class="now">
        <WeatherIcon :name="now.icon" class="now-icon" />
        <span class="now-temp tabular">{{ now.temp }}°</span>
        <div class="now-text">
          <span class="now-label">{{ now.label }}</span>
          <span v-if="now.today" class="now-range tabular">
            {{ now.today.max }}° / {{ now.today.min }}°
            <template v-if="now.today.rain > 0">, {{ now.today.rain }}% Regen</template>
          </span>
        </div>
      </div>

      <ul class="days">
        <li v-for="day in upcoming" :key="day.date" class="day">
          <span class="day-name">{{ day.weekday }}</span>
          <WeatherIcon :name="day.icon" class="day-icon" />
          <span class="day-temp tabular"
            >{{ day.max }}°<span class="day-min">/{{ day.min }}°</span></span
          >
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.weather {
  display: flex;
  align-items: center;
  gap: var(--space-6);
}

.unavailable {
  font-size: var(--text-sm);
  color: var(--ink-faint);
}

.now {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.now-icon {
  font-size: 44px;
  color: var(--accent);
}

.now-temp {
  font-size: var(--text-2xl);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
}

.now-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.now-label {
  font-weight: 600;
}

.now-range {
  font-size: var(--text-sm);
  color: var(--ink-muted);
}

.days {
  display: flex;
  gap: var(--space-4);
  padding-left: var(--space-6);
  border-left: 1px solid var(--line);
}

.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 48px;
  line-height: 1.2;
}

.day-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ink-muted);
}

.day-icon {
  font-size: 22px;
  color: var(--accent);
}

.day-temp {
  font-size: var(--text-sm);
  font-weight: 600;
}

.day-min {
  font-weight: 400;
  color: var(--ink-muted);
}
</style>
