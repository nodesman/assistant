import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App);

app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err, info);
  // Optionally send error to main process
  // window.api.sendError(err.toString());
};

app.mount('#app');
