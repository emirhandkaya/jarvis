import { render } from 'preact'
import { App } from './app'
import { db } from './db/schema'
import { requestPersist } from './db/persist'
import { registerUpdates } from './ui/UpdateBanner'
import { FatalError } from './ui/FatalError'
import './styles/theme.css'

const root = document.getElementById('app')!

async function start() {
  try {
    await db.open()
  } catch (err) {
    render(<FatalError error={err} />, root)
    return
  }
  void requestPersist()
  registerUpdates()
  render(<App />, root)
}

void start()
