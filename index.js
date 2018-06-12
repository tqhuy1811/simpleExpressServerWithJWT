var express = require('express');
var app = express();
var paginate = require('express-paginate');
var moogose = require('mongoose');
var UserModel = require('./Model/User');
var bodyParser = require('body-parser');
var config = require('./config');
var jwt = require('jsonwebtoken');
var user = require('./user');

var port = process.env.PORT || 3000;

app.set("secret",config.secret);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

moogose.connect(config.connectionString);


var apiRoutes = express.Router();

/*
POST 'token', retrieve the token client_id and client_secret match the one 
in the database 
For the sake of simplicity, Password shall be in plain text
*/

apiRoutes.post('/token', (req,res) => {
  if(req.body.client_id.trim() === user.username && req.body.client_password.trim() === user.password){
    let token = jwt.sign({
      data: 'foobar'
    }, app.get("secret"), { expiresIn: 60 }); //1 minute
    res.json({
      token:token,
    })
  }
  else{
    res.json({
      error:"Username or Password is invalid"
    })
  }
})

/*
Order is very important here, because '/token' route doesn't need to be protected
*/

//JWT Middleware
apiRoutes.use((req,res,next) => {
  // check header or url parameters or post parameters for token
  let token = req.body.token || req.query.token || req.headers['x-access-token'];
  if(token){
    //verify token
    jwt.verify(token,app.get("secret"),(err,decoded) => {
      if(err){
        return res.json({
          error:"Failed to authenticate token"
        });
      }else{
        req.decoded = decoded;
        next();
      } 
    })
  }else{
    return res.json({
      error:"Invalid Access"
    });
  }
})


/*
  Return login info
*/

apiRoutes.get('/info',(req,res) => {
  res.json({
    client_id:user.username,
    client_password:user.password
  })
})


/*
Return list of clients based name,limit,offset
*/

app.use(paginate.middleware(10, 50));
apiRoutes.get('/clients', async(req,res) => {
  let name = req.query.name || req.body.name;
  let offset = req.query.offset || req.body.offset;
  let limit = req.query.limit || req.body.limit;
  if(name){
    try{
      let user = await UserModel.findOne({name:name});
      console.log(user) //Assume Username is unique
      if(user){
        res.json(user);
      }else{
        res.json({
          "error":"User is not exist"
        });
      }
    }catch(err){
      res.json({
        "error":"User Not Found"
      });
    }

  }
  else if(limit || offset ){
    try{
      let users = await UserModel.find({}).limit(limit).skip(parseInt(offset,10)).exec();
      if(users.length !== 0){
        const pageCount = Math.ceil(users.length / limit);
  
        res.json({
          object:'list',
          has_more: paginate.hasNextPages(req)(pageCount),
          data:users
        });
      }
      else{
        res.json({
          "error":"Users Not Found"
        })
      }
    }
    catch(err){
      res.json({
        "error":"Internal Server Error"
      })
    }
  }
})

/*
Return client based on their id
*/

apiRoutes.get('/client/:id?', async (req,res) => {
  if(req.params.id){
    try{
      let user =  await UserModel.findOne({ id:req.params.id });
      if(user){
        res.json(user);
      }
      else{
        res.json({
          "error":"User not exist"
        });
      }
    }catch(err){
      res.json({
        "error":"User not exist"
      })
    }
  }else{
    res.status(404,{
      error:"Not Found"
    });
  }
})


/*
prefixed route with /api
*/
app.use('/api',apiRoutes);

app.listen(port,() => {
  console.log(`Server is starting at port ${port}`)
});


