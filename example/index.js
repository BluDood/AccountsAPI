import express from 'express'
import AccountsAPI from '@bludood/accountsapi'

const id = 'your app id here'
const secret = 'your app secret here'

const api = new AccountsAPI(id, secret)

const app = express()

app.get('/callback', async (req, res) => {
  const { code } = req.query

  const user = await api.verifyUser(code)

  console.log(user)

  res.send(user)
})

app.listen(3000, async () => {
  console.log('Server listening on port 3000')

  const url = await api.generateAuthURL({
    scope: ['basic', 'email', 'roles', 'metadata', 'security'],
    redirect_uri: 'http://localhost:3000/callback'
  })

  console.log(`Authorize with the following URL: ${url}`)
})
