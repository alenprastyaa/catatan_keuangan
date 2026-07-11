import { ToastContainer } from './toast.js';

export default {
  components: { ToastContainer },
  template: `
    <router-view />
    <ToastContainer />
  `,
};
