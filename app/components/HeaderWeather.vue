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

const open = ref(false);

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
      <button class="now" type="button" aria-label="Wetter im Detail" @click="open = true">
        <WeatherIcon :name="now.icon" class="now-icon" />
        <span class="now-temp tabular">{{ now.temp }}°</span>
        <span class="now-text">
          <span class="now-label">{{ now.label }}</span>
          <span v-if="now.today" class="now-range tabular">
            {{ now.today.max }}° / {{ now.today.min }}°
            <template v-if="now.today.rain > 0">, {{ now.today.rain }}% Regen</template>
          </span>
        </span>
      </button>

      <ul class="days">
        <li v-for="day in upcoming" :key="day.date" class="day">
          <span class="day-name">{{ day.weekday }}</span>
          <WeatherIcon :name="day.icon" class="day-icon" />
          <span class="day-temp tabular">
            {{ day.max }}°<span class="day-min">/{{ day.min }}°</span>
          </span>
        </li>
      </ul>

      <AppDialog v-model="open" title="Wetter" width="440px">
        <div class="detail-now">
          <WeatherIcon :name="now.icon" class="detail-icon" />
          <div>
            <div class="detail-temp tabular">{{ now.temp }}°</div>
            <div class="detail-label">{{ now.label }}</div>
            <div v-if="now.today" class="text-muted tabular">
              Heute {{ now.today.max }}° / {{ now.today.min }}°
              <template v-if="now.today.rain > 0">, {{ now.today.rain }}% Regen</template>
            </div>
          </div>
        </div>
        <ul class="detail-days">
          <li v-for="day in upcoming" :key="day.date" class="detail-day">
            <span class="detail-day-name">{{ day.weekday }}</span>
            <WeatherIcon :name="day.icon" class="detail-day-icon" />
            <span class="detail-day-label">{{ day.label }}</span>
            <span class="detail-day-temp tabular">
              {{ day.max }}° <span class="text-muted">/ {{ day.min }}°</span>
            </span>
            <span class="detail-day-rain text-muted tabular">
              {{ day.rain > 0 ? `${day.rain}%` : "" }}
            </span>
          </li>
        </ul>
      </AppDialog>
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
  padding: 0 var(--space-2) 0 0;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.now:active {
  background: var(--surface-muted);
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

/* Below the tablet width only icon and temperature stay, the rest is in the dialog */
@media (max-width: 1279px) {
  .days,
  .now-text {
    display: none;
  }

  .now-icon {
    font-size: 36px;
  }

  .now-temp {
    font-size: var(--text-xl);
  }
}

.detail-now {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.detail-icon {
  font-size: 64px;
  color: var(--accent);
}

.detail-temp {
  font-size: var(--text-2xl);
  font-weight: 700;
  line-height: 1;
}

.detail-label {
  font-weight: 600;
}

.detail-days {
  display: flex;
  flex-direction: column;
}

.detail-day {
  display: grid;
  grid-template-columns: 40px 32px 1fr auto 48px;
  align-items: center;
  gap: var(--space-3);
  min-height: 52px;
  border-top: 1px solid var(--line);
}

.detail-day-name {
  font-weight: 700;
}

.detail-day-icon {
  font-size: 26px;
  color: var(--accent);
}

.detail-day-temp {
  font-weight: 600;
}

.detail-day-rain {
  text-align: right;
  font-size: var(--text-sm);
}
</style>
