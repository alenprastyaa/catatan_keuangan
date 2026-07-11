export default {
  props: {
    columns: { type: Array, required: true },
    rows: { type: Array, required: true },
    loading: { type: Boolean, default: false },
  },
  template: `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th v-for="c in columns" :key="c.key" :class="c.align === 'right' ? 'text-right' : ''">{{ c.label }}</th>
            <th v-if="$slots.actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="columns.length + ($slots.actions ? 1 : 0)" class="empty-state">Memuat data...</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td :colspan="columns.length + ($slots.actions ? 1 : 0)" class="empty-state">Tidak ada data.</td>
          </tr>
          <tr v-for="row in rows" :key="row.id">
            <td v-for="c in columns" :key="c.key" :class="c.align === 'right' ? 'text-right' : ''">
              <slot :name="'cell-' + c.key" :row="row">{{ row[c.key] }}</slot>
            </td>
            <td v-if="$slots.actions" class="text-right">
              <slot name="actions" :row="row"></slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
};
