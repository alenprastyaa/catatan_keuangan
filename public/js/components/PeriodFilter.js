export default {
  props: {
    modelValue: { type: Object, required: true }, // { period, start, end }
  },
  emits: ['update:modelValue'],
  methods: {
    setPeriod(period) {
      this.$emit('update:modelValue', { ...this.modelValue, period });
    },
    setDate(field, value) {
      this.$emit('update:modelValue', { ...this.modelValue, period: 'custom', [field]: value });
    },
  },
  template: `
    <div class="period-filter" aria-label="Filter periode dashboard">
      <div class="period-presets">
        <button
          v-for="p in [['today','Hari ini'],['week','Minggu'],['month','Bulan'],['custom','Rentang']]"
          :key="p[0]"
          type="button"
          :class="{ active: modelValue.period === p[0] }"
          @click="setPeriod(p[0])"
        >{{ p[1] }}</button>
      </div>

      <div v-if="modelValue.period === 'custom'" class="period-custom-range">
        <label>
          <span>Dari tanggal</span>
          <input type="date" :value="modelValue.start"
            @change="setDate('start', $event.target.value)" />
        </label>
        <span class="period-range-arrow" aria-hidden="true">→</span>
        <label>
          <span>Sampai tanggal</span>
          <input type="date" :value="modelValue.end"
            @change="setDate('end', $event.target.value)" />
        </label>
      </div>
    </div>
  `,
};
