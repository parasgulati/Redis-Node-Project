// Modules
const express=require('express');
const bodyParser=require('body-parser');
const cors=require('cors');
const API=express();

API.use(cors());
API.use(bodyParser.json());
API.use(bodyParser.urlencoded({extended: false}));

const redis = require("redis");
const client = redis.createClient();

const Redis = require('ioredis');
const redisJ = new Redis();
const JSONCache = require('redis-json'); 
const jsonCache = new JSONCache(redisJ, {prefix: 'cache:'});

var Search = require('redis-search');
var search = Search.createSearch('user_search');

// Redis Base
client.on("error", function(error) {
  console.error("Error While Connecting to Redis => "+error);
});
client.on("connect", function() { 
  console.log("Connection Successfully established to Redis Base"); 
}); 

API.post('/create-user',(req,res,next)=>{
  var post = req.body;
  var temp = client.get(post.email);
  if(temp==true)
  {
    res.json({
      status:500,
      message:"User with this Email Already Exists"
    })
  }
  else
  {
    client.set(post.email, JSON.stringify({
      id:post.id,
      name:post.name,
      email:post.email,
      mobNo:post.mobNo
    }));
    
    res.json({
      status:200,
      message:"Success"
    })
  }

})

API.post('/establish-session',(req,res,next)=>{
  var post = req.body;
  var temp = client.get(post.email)
  if(temp==true)
  { 
    client.set(post.id,new Date(), redis.print);
    res.json({
      status:200,
      message:"Success"
    })
  }
  else
  {
    res.json({
      status:404,
      message:"Wrong Email"
    })
  }
})

API.post('/fetch-user-data',(req,res,next)=>{
  var post = req.body;
  
  client.keys(post.email, function (err, keys) {
    if (err)
    {
      res.json({
        status:500,
        message:"Error Caught",
        description:err
      })
    }
    else
    {
        client.get(keys[0],function(err1,data1){
          if(err1)
          {
            res.json({
              status:500,
              message:"Error Caught",
              description:err1
            })
          }
          else
          {
            res.json({
              status:200,
              message:"Success",
              data:JSON.parse(data1)
            })
          }
        })
    }
  })
})


// Redis JSON 
API.post('/user-store',(req,res,next)=>{
  var post = req.body;
 
  jsonCache.get(post.email).then((data)=>{
    if(data==undefined)
    {
      const user = {
        name: post.name,
        age: post.age,
        address: {
          locality: post.locality,
          pincode: post.pincode
        },
        mobile:post.mobile
      }
       
      jsonCache.set(post.email, user)
      .then(()=>{
        search.index(post.name,post.email);
        res.json({
          status:200,
          message:"User Created Successfully"
        })
      })
      .catch((error)=>{
        res.json({
          status:500,
          message:"Internal Server Error"
        })
      })
    }
    else
    {
      res.json({
        status:409,
        message:"User Already Exists"
      })
    }
  })
  .catch((error)=>{
    res.json({
      status:500,        
      message:"Internal Server Error"
    })
  })
})

API.post('/user-get',(req,res,next)=>{
  var post = req.body;
  jsonCache.get(post.email).then((data)=>{
    if(data==undefined)
    {
      res.json({
        status:404,        
        message:"Not Found"
      })
    }
    else
    {
      res.json({
        status:200,        
        message:"User Found",
        user:data
      })
    }
  })
  .catch((error)=>{
    res.json({
      status:500,        
      message:"Internal Server Error"
    })
  })
})

// Redis Search
API.post("/search",(req,res,next)=>{
  var post = req.body;
  search
  .type('and')
  .query(query = post.searchQuery, function(err, ids) {
      if (err) throw err;
      else
      {
        res.json({
          status:200,
          message:"Success",
          users:ids
        })    
      }
  });
})

port = 5000;
API.listen(port,()=>{
    console.log("server listening at "+port);
})
