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
    <div class="toolbar">
      <button
        v-for="p in [['today','Hari Ini'],['week','Minggu Ini'],['month','Bulan Ini']]"
        :key="p[0]"
        :class="modelValue.period === p[0] ? 'btn-primary' : 'btn-secondary'"
        class="btn-sm"
        @click="setPeriod(p[0])"
      >{{ p[1] }}</button>

      <input type="date" :value="modelValue.start"
        @change="setDate('start', $event.target.value)" />
      <span class="text-muted">s/d</span>
      <input type="date" :value="modelValue.end"
        @change="setDate('end', $event.target.value)" />
    </div>
  `,
};
