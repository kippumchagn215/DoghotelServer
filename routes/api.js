var express = require('express');
var router = express.Router();





// var db = null // global variable to hold the connection

// MongoClient.connect('mongodb://localhost:27017/', function(err, client) {
//
//     if(err) { console.error(err) }
//     db = client.db('users') // once connected, assign the connection to the global variable
// })

//
router.get("/",function(req,res,next){
  res.json({
    user : ["chris","ben"],
    num : 46464646464
  });
})



router.post("/",function(req,res,next){
  console.log(req.body);
  const user1 = req.body;
})
// const user1 =({
//   email:"kippumchang@gmail.comdddddddd",
//   pw:"Family3wkd!",
//   fname:"kippum",
//   lname:"chang"
// })
module.exports = router;
