# BluDood Accounts API Library

Official JavaScript library for interfacing with the BluDood Accounts API

## Installation

```bash
npm install @bludood/accountsapi
```

## Usage

[Example](https://github.com/BluDood/AccountsAPI/tree/main/example)

Note: All functions are documented with JSDoc

### Create instance

Parameters:

- `id`: Application ID
- `secret`: Application secret
- `options.baseURL?`: Base URL for the API
- `options.cacheTimeout?`: Cache timeout in milliseconds

```js
import AccountsAPI from '@bludood/accountsapi'

const api = new AccountsAPI(id, secret)
```

### Get application info

```js
await api.getAppInfo() // -> { id: "...", name: "..." }
```

### Get user info

Only works after user has authorized

Parameters:

- `id`: User ID
- `force`: Force fetch instead of getting from cache

```js
await api.getUser(id, force) // -> user object depending on scope
```

### Get multiple users' info

Only works after users has authorized

Parameters:

- `ids`: Array of user IDs. Maximum 100
- `force`: Force fetch instead of getting from cache

```js
await api.getUsers(ids, force) // -> array of user objects depending on scopes
```

### Verify user authorization

Parameters:

- `code`: Authorization code

```js
await api.verifyUser(id)
// -> {
// ->   user: user object depending on scope,
// ->   scope: scope
// -> }
```

### Generate authorization URL

Parameters:

- `options.scope`: Scope
- `options.redirect_uri`: Redirect URI
- `options.prompt`: Whether to prompt user with authorization screen if already authorized

```js
await api.generateAuthURL(options) // -> https://accounts.bludood.com/auth/authorize...
```

## Help

https://accounts.bludood.com/developers/help
