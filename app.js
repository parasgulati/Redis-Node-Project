// Modules
const express=require('express');
const bodyParser=require('body-parser');
const mongoose=require('mongoose');
const cors=require('cors');
const API=express();

API.use(cors());
API.use(bodyParser.json({limit: "50mb"}));
API.use(bodyParser.urlencoded({extended: false, limit: "50mb"}));

const redis = require("redis");
const client = redis.createClient();
var redisSearch = require('redisearch');

var postSearch = redisSearch.createSearch('mypostsearch', [client]);

client.on("error", function(error) {
  console.error("Error While Connecting to Redis => "+error);
});
client.on("connect", function() { 
  console.log("Connection Successfully established to Redis"); 
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
  });
})



port = 5000;
API.listen(port,()=>{
    console.log("server listening at "+port);
})
