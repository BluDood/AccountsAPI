import axios from 'axios'
import { base } from './constants.js'
import { Cache } from './cache.js'

class AccountsAPIError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

export class AccountsAPI {
  #token
  #cache
  #request
  #baseURL
  #id

  /**
   * ## Create a new AccountsAPI instance
   * @param {string} id Application ID
   * @param {string} secret Application secret
   * @param {object} options Options
   * @param {string} options.baseURL Base URL for API
   * @param {number} options.cacheTimeout Cache timeout in milliseconds
   */
  constructor(id, secret, options = {}) {
    this.#baseURL = options.baseURL || base
    this.#id = id
    this.#token = Buffer.from(`${id}:${secret}`).toString('base64')

    this.#request = axios.create({
      baseURL: this.#baseURL + '/api',
      headers: {
        Authorization: `Basic ${this.#token}`
      }
    })

    this.#cache = new Cache(options.cacheTimeout || 300000)

    this.#request.interceptors.response.use(
      res => res,
      err => {
        if (err.response) {
          throw new AccountsAPIError(err.response.data.message, err.response.status)
        } else {
          throw err
        }
      }
    )

    this.getAppInfo()
  }

  /**
   * ## Get application info
   * @typedef {object} AppInfo
   * @property {string} id App ID
   * @property {string} name App name
   * @property {string} image App image
   * @property {string[]} redirect_uris App redirect URIs
   * @property {string[]} flags App flags
   * @property {number} created_at App creation timestamp
   *
   * @returns {Promise<AppInfo>} App info
   */
  async getAppInfo() {
    const res = await this.#request.get('/me')
    return res.data
  }

  /**
   * ## Get user info
   * @param {string} id User ID
   * @param {string} force Force fetch instead of getting from cache
   * @returns {Promise<object>} User object
   */
  async getUser(id, force = false) {
    if (this.#cache.has(id) && !force) return this.#cache.get(id)
    const res = await this.#request.get(`/users/${id}`)
    this.#cache.set(id, res.data)
    return res.data
  }

  /**
   * ## Get multiple users' info
   * @param {string[]} ids User IDs
   * @param {boolean} force Force fetch instead of getting from cache
   * @returns {Promise<object[]>} User objects
   */
  async getUsers(ids, force = false) {
    if (ids.length > 100) throw new Error('Cannot get more than 100 users at once')

    const notInCache = []
    const users = []

    for (const id of ids) {
      if (this.#cache.has(id) && !force) {
        users.push(this.#cache.get(id))
      } else {
        notInCache.push(id)
      }
    }
    if (notInCache.length > 0) {
      const res = await this.#request.get('/users/multiple', {
        params: {
          ids: notInCache.join(',')
        }
      })
      for (const user of res.data) {
        this.#cache.set(user.id, user)
        users.push(user)
      }
    }
    return users
  }

  /**
   * ## Verify user authorization
   * @typedef {object} VerifyUserResponse
   * @property {object} user User object
   * @property {string} scope Authorization scope
   *
   * @param {string} code Authorization code
   * @returns {Promise<VerifyUserResponse>} Verification response
   */
  async verifyUser(code) {
    const res = await this.#request.post('/users/verify', {
      code
    })
    this.#cache.set(res.data.user.id, res.data.user)
    return res.data
  }

  /**
   * ## Generate authorization URL
   * @typedef {"basic" | "email" | "roles" | "metadata" | "security"} Scope
   * @param {object} options Options
   * @param {Scope[]} options.scope Scope
   * @param {string} options.redirect_uri Redirect URI
   * @param {boolean} options.prompt Whether to prompt user with authorization screen if already authorized
   * @returns {Promise<string>} Authorization URL
   */
  async generateAuthURL(options = {}) {
    let { scope, redirect_uri, prompt = false } = options
    if (!scope) scope = ['basic']
    if (!redirect_uri) throw new Error('Redirect URI is required')
    const app = await this.getAppInfo()
    if (!app.redirect_uris.includes(redirect_uri)) throw new Error('Redirect URI is not allowed')
    return `${this.#baseURL}/auth/authorize?id=${this.#id}&scope=${encodeURIComponent(scope.join(','))}&redirect_uri=${encodeURIComponent(redirect_uri)}${
      !prompt ? '&prompt=none' : ''
    }`
  }
}
