import { afterEach } from 'vitest'

afterEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.removeAttribute('data-contrast')
  document.documentElement.removeAttribute('dir')
})
