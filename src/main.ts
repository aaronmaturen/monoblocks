import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Import Font Awesome kit CSS
import '@awesome.me/kit-d20ba098c9/icons/css/all.min.css'

import App from './App.vue'

const app = createApp(App)

app.use(createPinia())

app.mount('#app')
