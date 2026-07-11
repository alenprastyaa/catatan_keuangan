export default {
  props: {
    show: { type: Boolean, default: false },
    title: { type: String, default: '' },
    size: { type: String, default: 'md' },
  },
  emits: ['close'],
  template: `
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-box" :class="{ 'modal-lg': size === 'lg' }">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="modal-close" @click="$emit('close')">&times;</button>
        </div>
        <div>
          <slot></slot>
        </div>
        <div class="modal-footer" v-if="$slots.footer">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  `,
};
