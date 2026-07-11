export default {
  props: {
    total: { type: Number, default: 0 },
    page: { type: Number, default: 1 },
    limit: { type: Number, default: 20 },
  },
  emits: ['update:page'],
  computed: {
    totalPages() {
      return Math.max(1, Math.ceil(this.total / this.limit));
    },
    fromItem() {
      return this.total === 0 ? 0 : (this.page - 1) * this.limit + 1;
    },
    toItem() {
      return Math.min(this.page * this.limit, this.total);
    },
  },
  template: `
    <div class="pagination">
      <span class="text-muted">Menampilkan {{ fromItem }}-{{ toItem }} dari {{ total }}</span>
      <button class="btn-secondary btn-sm" :disabled="page <= 1" @click="$emit('update:page', page - 1)">Sebelumnya</button>
      <span class="text-muted">Hal {{ page }} / {{ totalPages }}</span>
      <button class="btn-secondary btn-sm" :disabled="page >= totalPages" @click="$emit('update:page', page + 1)">Berikutnya</button>
    </div>
  `,
};
