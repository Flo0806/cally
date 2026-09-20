<script setup lang="ts">
import { Car, ChevronDown, MapPin, Umbrella } from "@lucide/vue";
import { Temporal } from "temporal-polyfill";
import type { TodayEvent } from "#shared/types";
import { formatTime } from "~/utils/calendar";
import { weatherInfo } from "~/utils/weather";
import { useEventColor } from "~/composables/useEventColor";
import { useLookups } from "~/composables/useLookups";

const props = defineProps<{ event: TodayEvent; now: string }>();

const open = ref(false);
const colorOf = useEventColor();
const members = useLookups("members").items;

const color = computed(() => {
  const c = colorOf(props.event);
  return c ? `var(--event-${c})` : "var(--accent)";
});

const people = computed(() =>
  props.event.memberIds
    .map((id) => members.value.find((m) => m.id === id))
    .filter((m) => m !== undefined),
);

// Past events step back, a passed departure time turns into "jetzt"
const isOver = computed(() => !props.event.allDay && props.event.end <= props.now);
const started = computed(() => !props.event.allDay && props.event.start <= props.now);
const departure = computed(() => {
  if (!props.event.departAt || started.value) return null;
  if (props.event.departAt <= props.now) return { label: "Jetzt losfahren", urgent: true };
  return { label: `Losfahren um ${formatTime(props.event.departAt)}`, urgent: false };
});

const when = computed(() =>
  props.event.allDay
    ? "Ganztägig"
    : `${formatTime(props.event.start)} – ${formatTime(props.event.end)}`,
);

const weather = computed(() =>
  props.event.weather ? weatherInfo(props.event.weather.code) : null,
);

function minutesUntil(dateTime: string): number {
  return Math.round(
    Temporal.PlainDateTime.from(dateTime)
      .since(Temporal.PlainDateTime.from(props.now))
      .total("minutes"),
  );
}
</script>

<template>
  <article class="card event" :class="{ over: isOver, open }" :style="{ '--event': color }">
    <button class="head" type="button" :aria-expanded="open" @click="open = !open">
      <span class="head-when tabular">{{ when }}</span>
      <span class="head-main">
        <span class="head-title">{{ event.title }}</span>
        <span v-if="event.location" class="head-location">
          <MapPin :size="14" /> {{ event.location }}
        </span>
        <span v-if="departure" class="depart" :class="{ urgent: departure.urgent }">
          <Car :size="16" /> {{ departure.label }}
          <span v-if="event.rainWarning" class="depart-rain"><Umbrella :size="14" /> Regen</span>
        </span>
      </span>
      <ChevronDown :size="20" class="chevron" />
    </button>

    <div v-if="open" class="details">
      <dl class="facts">
        <template v-if="event.travelMinutes !== null">
          <dt>Fahrzeit</dt>
          <dd>
            {{ event.travelMinutes }} Min
            <span class="text-muted">+ {{ event.bufferMinutes }} Min Puffer</span>
          </dd>
        </template>
        <template v-if="departure && !departure.urgent && event.departAt">
          <dt>Abfahrt</dt>
          <dd>in {{ minutesUntil(event.departAt) }} Min</dd>
        </template>
        <template v-if="event.weather && weather">
          <dt>Wetter dort</dt>
          <dd class="weather">
            <WeatherIcon :name="weather.icon" class="weather-icon" />
            {{ event.weather.temp }}°, {{ weather.label }}
            <span v-if="event.weather.rain > 0" class="text-muted">
              · {{ event.weather.rain }}% Regen
            </span>
          </dd>
        </template>
        <template v-if="people.length">
          <dt>Wer</dt>
          <dd class="people">
            <span
              v-for="member in people"
              :key="member.id"
              class="person"
              :style="{ background: `var(--event-${member.color})` }"
            >
              {{ member.name }}
            </span>
          </dd>
        </template>
        <template v-if="event.notes">
          <dt>Notizen</dt>
          <dd class="notes">{{ event.notes }}</dd>
        </template>
      </dl>
      <p v-if="!event.location && !event.notes && !people.length" class="text-muted">
        Keine weiteren Angaben.
      </p>
    </div>
  </article>
</template>

<style scoped>
.event {
  --event: var(--accent);
  overflow: hidden;
  box-shadow: inset 4px 0 0 var(--event);
}

.event.over {
  opacity: 0.55;
}

.head {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  width: 100%;
  min-height: 64px;
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
  border: 0;
  background: transparent;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}

.head:active {
  background: var(--surface-muted);
}

.head-when {
  flex: none;
  width: 104px;
  padding-top: 2px;
  font-weight: 700;
}

.head-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.head-title {
  font-size: var(--text-lg);
  font-weight: 600;
  line-height: 1.2;
}

.head-location {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-sm);
  color: var(--ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.depart {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-weight: 700;
  color: var(--accent-strong);
}

.depart.urgent {
  color: var(--danger);
}

.depart-rain {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  font-size: var(--text-sm);
  font-weight: 600;
}

.chevron {
  flex: none;
  margin-top: 4px;
  color: var(--ink-faint);
  transition: transform 160ms ease;
}

.open .chevron {
  transform: rotate(180deg);
}

.details {
  padding: 0 var(--space-4) var(--space-4) var(--space-4);
  border-top: 1px solid var(--line);
}

.facts {
  display: grid;
  grid-template-columns: 104px 1fr;
  gap: var(--space-2) var(--space-3);
  margin: var(--space-3) 0 0;
}

.facts dt {
  color: var(--ink-muted);
  font-size: var(--text-sm);
  font-weight: 600;
  padding-top: 2px;
}

.facts dd {
  margin: 0;
}

.weather {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.weather-icon {
  font-size: 22px;
  color: var(--accent);
}

.people {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.person {
  padding: 2px 10px;
  border-radius: 999px;
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 600;
}

.notes {
  white-space: pre-wrap;
}
</style>
