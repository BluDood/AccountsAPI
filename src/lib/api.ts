import * as axios from 'axios'
import { base } from './constants.js'
import { Cache } from './cache.js'
import { AccountsAPIError } from './utils.js'

interface AccountsOptions {
  baseURL?: string
  cacheTimeout?: number
}

interface AppInfo {
  id: string
  name: string
  image: string
  redirect_uris: string[]
  flags: string[]
  created_at: number
}

interface User {
  id?: string
  username?: string
  email?: string
  roles?: string[]
  flags?: string[]
  created_at?: number
  metadata?: UserMetadata
}

interface UserMetadata {
  avatar?: string
}

type Scope = 'basic' | 'email' | 'roles' | 'metadata' | 'security'

interface VerifyUserResponse {
  user: User
  scope: Scope
}

interface GenerateAuthURLOptions {
  redirect_uri?: string
  scope?: Scope[]
  prompt?: boolean
}

export class AccountsAPI {
  #token: string
  #cache: Cache
  #request: axios.AxiosInstance = axios.default.create()
  #baseURL: string
  #id: string

  /**
   * ## Create a new AccountsAPI instance
   * @param id Application ID
   * @param secret Application secret
   * @param options Options
   * @param options.baseURL Base URL for API
   * @param options.cacheTimeout Cache timeout in milliseconds
   */
  constructor(id: string, secret: string, options: AccountsOptions = {}) {
    this.#baseURL = options.baseURL || base
    this.#id = id
    this.#token = Buffer.from(`${id}:${secret}`).toString('base64')

    this.#cache = new Cache(options.cacheTimeout || 300000)

    this.#request.defaults.baseURL = `${this.#baseURL}/api`

    this.#request.defaults.headers.Authorization = `Basic ${this.#token}`

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
   * @property id App ID
   * @property name App name
   * @property image App image
   * @property redirect_uris App redirect URIs
   * @property flags App flags
   * @property created_at App creation timestamp
   *
   * @returns {Promise<AppInfo>} App info
   */
  async getAppInfo() {
    const res = await this.#request?.get('/me')
    return res.data as AppInfo
  }

  /**
   * ## Get user info
   * @param id User ID
   * @param force Force fetch instead of getting from cache
   * @returns User object
   */
  async getUser(id: string, force = false) {
    if (this.#cache.has(id) && !force) return this.#cache.get(id)
    const res = await this.#request?.get(`/users/${id}`)
    this.#cache.set(id, res.data)
    return res.data
  }

  /**
   * ## Get multiple users' info
   * @param ids User IDs
   * @param force Force fetch instead of getting from cache
   * @returns User objects
   */
  async getUsers(ids: string[], force = false) {
    if (ids.length > 100) throw new Error('Cannot get more than 100 users at once')

    const notInCache: string[] = []
    const users: User[] = []

    for (const id of ids) {
      if (this.#cache.has(id) && !force) {
        users.push(this.#cache.get(id) as User)
      } else {
        notInCache.push(id)
      }
    }
    if (notInCache.length > 0) {
      const res = await this.#request?.get('/users/multiple', {
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
   * @property user User object
   * @property scope Authorization scope
   *
   * @param code Authorization code
   * @returns {Promise<VerifyUserResponse>} Verification response
   */
  async verifyUser(code: string) {
    const res = await this.#request?.post('/users/verify', {
      code
    })
    this.#cache.set(res.data.user.id, res.data.user)
    return res.data as VerifyUserResponse
  }

  /**
   * ## Generate authorization URL
   * @param options Options
   * @param {Scope[]} options.scope Scope
   * @param options.redirect_uri Redirect URI
   * @param {boolean} options.prompt Whether to prompt user with authorization screen if already authorized
   * @returns {Promise<string>} Authorization URL
   */
  async generateAuthURL(options: GenerateAuthURLOptions = {}) {
    const { scope, redirect_uri, prompt = false } = options
    if (!scope) throw new Error('Scope is required')
    if (!redirect_uri) throw new Error('Redirect URI is required')
    const app = await this.getAppInfo()
    if (!app.redirect_uris.includes(redirect_uri)) throw new Error('Redirect URI is not allowed')
    return `${this.#baseURL}/auth/authorize?id=${this.#id}&scope=${encodeURIComponent(scope.join(','))}&redirect_uri=${encodeURIComponent(redirect_uri)}${
      !prompt ? '&prompt=none' : ''
    }`
  }
}
