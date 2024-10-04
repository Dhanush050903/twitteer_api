/*KEY POINTS 
1.Authorization in headers starts with lower case
a i.e. "authorization"
2.payload={username} is sent while using jwt.sign, so on 
verifying it we can access payload and add it in request
and use it to retrive data in next() stage

*/
const express = require('express')
const bcrypt = require('bcrypt')
const sqlite = require('sqlite')
const {open} = sqlite
const sqlite3 = require('sqlite3')
const jwt = require('jsonwebtoken')
const token = 'heresthetokenforencryption'

const app = express()
const path = require('path')
const dbPath = path.join(__dirname, 'twitterClone.db')
app.use(express.json())

let db = null
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running')
    })
  } catch (e) {
    console.log(`Error encountered ${e}`)
  }
}
initializeDbAndServer()

//Register API
app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  const checkQuery = `select * from user where username=?;`
  const checking = await db.get(checkQuery, [username])
  if (checking !== undefined) {
    response.status(400).send(`User already exists`)
  } else {
    if (password.length < 6) {
      response.status(400).send(`Password is too short`)
    } else {
      const encryptedPassword = await bcrypt.hash(password, 10)
      const insertQuery = `insert into user(username,password,name,gender) values (?,?,?,?);`
      await db.run(insertQuery, [username, encryptedPassword, name, gender])
      response.status(200).send(`User created successfully`)
    }
  }
})
//Login API
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  console.log(password)
  const checkQuery = `select * from user where username =?;`
  const checking = await db.get(checkQuery, [username])
  if (!checking) {
    response.status(400).send(`Invalid user`)
  } else {
    const passwordCheck = await bcrypt.compare(password, checking.password)
    if (!passwordCheck) {
      response.status(400).send(`Invalid password`)
    } else {
      const payload = {username: username} //same as {username}
      const jwtToken = await jwt.sign(payload, token)
      response.status(200).send({jwtToken})
    }
  }
})
//Authentication middleware
const authentication = (request, response, next) => {
  const authenHeader = request.headers.authorization
  let jwtToken
  if (authenHeader !== undefined) {
    jwtToken = authenHeader.split(' ')[1]
  }

  if (jwtToken === undefined) {
    response.status(401).send(`Invalid JWT Token`)
  } else {
    jwt.verify(jwtToken, token, async (error, payload) => {
      if (error) {
        response.status(401).send(`Invalid JWT Token`)
      } else {
        console.log('Token verified')
        request.username = payload.username
        next()
      }
    })
  }
}

//Get the latest tweets of people whom the user follows. Return 4 tweets at a time API after verification
const toCamelCase = a => {
  return {
    username: a.username,
    tweet: a.tweet,
    dateTime: a.date_time,
  }
}

app.get('/user/tweets/feed/', authentication, async (request, response) => {
  const {username} = request
  const getUserIdQuery = `SELECT user_id FROM user WHERE username=?;`
  const {user_id} = await db.get(getUserIdQuery, [username])
  const getTweetQuery = `SELECT user.username, tweet.tweet, tweet.date_time
  FROM
  user INNER JOIN tweet ON user.user_id=tweet.user_id INNER JOIN
  follower on follower.following_user_id= user.user_id WHERE 
  follower.follower_user_id=? ORDER BY tweet.date_time DESC LIMIT 4;
  `
  const queryResponse = await db.all(getTweetQuery, [user_id])
  response.status(200).send(queryResponse.map(toCamelCase))
})

//Returns the list of all names of people whom the user follows API after verification

app.get('/user/following/', authentication, async (request, response) => {
  const {username} = request
  const getUserIdQuery = `SELECT user_id FROM user WHERE username=?;`
  const {user_id} = await db.get(getUserIdQuery, [username])
  const getFollowingQuery = `
  SELECT user.name 
  FROM user INNER JOIN follower 
  ON user.user_id=follower.following_user_id WHERE 
  follower.follower_user_id=?;
  `
  const queryResponse = await db.all(getFollowingQuery, [user_id])
  response.status(200).send(queryResponse)
})

//list of all names of people who follows the user API
app.get('/user/followers/', authentication, async (request, response) => {
  const {username} = request
  const getUserIdQuery = `SELECT user_id FROM user WHERE username=?;`
  const {user_id} = await db.get(getUserIdQuery, [username])
  const getFollwersQuery = `
  SELECT user.name 
  FROM user INNER JOIN follower 
  ON user.user_id=follower.follower_user_id 
  WHERE follower.following_user_id=?;
  `
  const queryResponse = await db.all(getFollwersQuery, [user_id])
  response.status(200).send(queryResponse)
})

//If the user requests a tweet of the user he is following, return the tweet, likes count, replies count and date-time API
app.get('/tweets/:tweetId/', authentication, async (request, response) => {
  const {tweetId} = request.params
  const getQuery = `
  SELECT tweet.tweet, COUNT(DISTINCT like.like_id) AS likes, COUNT(DISTINCT reply.reply_id) AS replies,tweet.date_time AS dateTime
  FROM tweet INNER JOIN follower ON 
  tweet.user_id = follower.following_user_id 
  LEFT JOIN like ON tweet.tweet_id = like.tweet_id 
  LEFT JOIN reply ON tweet.tweet_id = reply.tweet_id 
  WHERE follower.follower_user_id = ? 
  GROUP BY tweet.tweet_id ORDER BY tweet.date_time DESC
  LIMIT 1;
  `
  const queryResponse = await db.all(getQuery, [tweetId])
  if (Object.keys(queryResponse).length > 0) {
    response.status(200).send(queryResponse)
  } else {
    response.status(401).send(`Invalid Request`)
  }
})

//If the user requests a tweet of a user he is following, return the list of usernames who liked the tweet API
app.get(
  '/tweets/:tweetId/likes/',
  authentication,
  async (request, response) => {
    const {tweetId} = request.params;
    const getuery=
  },
)
