import { reactive } from 'vue';

export const toasts = reactive([]);
let nextId = 0;

function push(type, message) {
  const t = { id: ++nextId, type, message };
  toasts.push(t);
  setTimeout(() => {
    const i = toasts.indexOf(t);
    if (i >= 0) toasts.splice(i, 1);
  }, 3400);
}

export const toast = {
  success: (m) => push('success', m),
  error: (m) => push('error', m),
};

export const ToastContainer = {
  setup() {
    return { toasts };
  },
  template: `
    <div class="toast-wrap">
      <transition-group name="toast">
        <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">
          <span class="toast-icon">{{ t.type === 'success' ? '✓' : '!' }}</span>
          <span>{{ t.message }}</span>
        </div>
      </transition-group>
    </div>
  `,
};
