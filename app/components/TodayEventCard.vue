<script setup lang="ts">
import {
  Car,
  ChevronDown,
  Construction,
  Loader2,
  MapPin,
  Smartphone,
  TrafficCone,
  Umbrella,
} from "@lucide/vue";
import { Temporal } from "temporal-polyfill";
import type { TodayEvent } from "#shared/types";
import { formatDuration, formatTime } from "~/utils/calendar";
import { ApiError, api } from "~/utils/api";
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

// One line, joined here: Vue condenses whitespace between spans and eats the separators
const travelLine = computed(() => {
  const e = props.event;
  if (e.travelMinutes === null) return "";
  const parts = [`${e.travelMinutes} Min + ${e.bufferMinutes} Min Puffer`];
  if (e.travelSource === "tomtom") {
    parts.push(
      e.trafficDelayMinutes
        ? `mit Verkehr, davon ${e.trafficDelayMinutes} Min Stau`
        : "mit Verkehr",
    );
  } else {
    parts.push("ohne Verkehrslage");
  }
  return parts.join(" · ");
});

const worstIncident = computed(() => props.event.incidents[0] ?? null);

// "Aufs Handy": push this event to the phones it concerns
const sending = ref(false);
const sentTo = ref<string[]>([]);
const sendError = ref("");

async function sendToPhone() {
  sending.value = true;
  sendError.value = "";
  try {
    const result = await api<{ sent: string[] }>("/api/today/notify", {
      method: "POST",
      body: { key: props.event.key },
    });
    sentTo.value = result.sent;
  } catch (e) {
    sendError.value = (e as ApiError).message;
  } finally {
    sending.value = false;
  }
}

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
          <span v-if="event.rainWarning" class="depart-pill"><Umbrella :size="14" /> Regen</span>
          <span v-if="(event.trafficDelayMinutes ?? 0) >= 5" class="depart-pill traffic">
            <TrafficCone :size="14" /> +{{ event.trafficDelayMinutes }} Min Verkehr
          </span>
          <span
            v-if="worstIncident"
            class="depart-pill"
            :class="{ traffic: worstIncident.severity !== 'info' }"
          >
            <Construction :size="14" />
            {{ worstIncident.kind }}{{ worstIncident.road ? ` ${worstIncident.road}` : "" }}
          </span>
        </span>
      </span>
      <ChevronDown :size="20" class="chevron" />
    </button>

    <div v-if="open" class="details">
      <dl class="facts">
        <template v-if="travelLine">
          <dt>Fahrzeit</dt>
          <dd>{{ travelLine }}</dd>
        </template>
        <template v-if="event.incidents.length">
          <dt>Strecke</dt>
          <dd>
            <ul class="incidents">
              <li
                v-for="(incident, i) in event.incidents"
                :key="i"
                class="incident"
                :class="incident.severity"
              >
                <strong>{{ incident.kind }}</strong>
                <span v-if="incident.road"> {{ incident.road }}</span>
                <span v-if="incident.from && incident.to" class="text-muted">
                  , {{ incident.from }} bis {{ incident.to }}
                </span>
                <span v-if="incident.delayMinutes" class="text-muted">
                  , +{{ incident.delayMinutes }} Min
                </span>
              </li>
            </ul>
          </dd>
        </template>
        <template v-if="departure && !departure.urgent && event.departAt">
          <dt>Abfahrt</dt>
          <dd>in {{ formatDuration(minutesUntil(event.departAt)) }}</dd>
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

      <div v-if="event.location" class="actions">
        <button class="btn" type="button" :disabled="sending" @click="sendToPhone">
          <Loader2 v-if="sending" :size="18" class="spin" />
          <Smartphone v-else :size="18" />
          Aufs Handy
        </button>
        <span v-if="sentTo.length" class="sent text-muted"
          >Gesendet an {{ sentTo.join(", ") }}</span
        >
        <span v-else-if="sendError" class="sent error">{{ sendError }}</span>
      </div>
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

.depart-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  font-size: var(--text-sm);
  font-weight: 600;
}

.depart-pill.traffic {
  background: var(--danger-soft);
  color: var(--danger);
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
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
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

.actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.sent {
  font-size: var(--text-sm);
}

.sent.error {
  color: var(--danger);
}

.incidents {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.incident.closure strong {
  color: var(--danger);
}

.incident.warning strong {
  color: var(--event-amber);
}
</style>
