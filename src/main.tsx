import { render } from 'preact'
import { App } from './app'
import { requestPersist } from './db/persist'
import './styles/theme.css'

void requestPersist()
render(<App />, document.getElementById('app')!)
