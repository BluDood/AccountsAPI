export class Cache {
  constructor(timeout) {
    this.timeout = timeout
    this.cache = new Map()
  }

  get(key) {
    if (this.cache.has(key)) {
      const { value, expires } = this.cache.get(key)
      if (expires > Date.now()) return value
      this.cache.delete(key)
    }
    return null
  }

  set(key, value, timeout = this.timeout) {
    this.cache.set(key, {
      value,
      expires: Date.now() + timeout
    })
  }

  delete(key) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  has(key) {
    if (this.cache.has(key)) {
      const { expires } = this.cache.get(key)
      if (expires > Date.now()) return true
      this.cache.delete(key)
    }
    return false
  }
}
