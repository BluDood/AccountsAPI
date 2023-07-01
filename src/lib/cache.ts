export class Cache {
  #cache: Map<string, { value: unknown; expires: number }> = new Map()
  #timeout: number

  constructor(timeout: number) {
    this.#timeout = timeout
  }

  get(key: string) {
    if (this.#cache.has(key)) {
      const found = this.#cache.get(key)
      if (!found) return null
      const { value, expires } = found
      if (expires > Date.now()) return value
      this.#cache.delete(key)
    }
    return null
  }

  set(key: string, value: unknown, timeout: number = this.#timeout) {
    this.#cache.set(key, {
      value,
      expires: Date.now() + timeout
    })
  }

  delete(key: string) {
    this.#cache.delete(key)
  }

  clear() {
    this.#cache.clear()
  }

  has(key: string) {
    if (this.#cache.has(key)) {
      const found = this.#cache.get(key)
      if (!found) return false
      const { expires } = found
      if (expires > Date.now()) return true
      this.#cache.delete(key)
    }
    return false
  }
}
