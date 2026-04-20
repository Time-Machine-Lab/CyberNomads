import { createApp } from 'vue'

import App from '@/app/App.vue'
import { pinia } from '@/app/providers/pinia'
import { router } from '@/app/router'
import '@/shared/styles/tokens.css'
import '@/app/styles/index.scss'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.mount('#app')
