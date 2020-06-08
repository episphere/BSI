//console.log('index.js loaded')
const port = 8000;
const fs = require('fs');
const http = require('http')

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


async function getEmails() {

  
  let db = admin.firestore();
  let emails = {};
  let refs = db.collection('BSIUsers');
  let allUsers = await refs.get()
  allUsers.forEach(doc => {
    let currData = doc.data()
    if (currData.hasOwnProperty('email') && !emails.hasOwnProperty(currData.email)) {
      if(currData.hasOwnProperty('role')){
        emails[currData.email] = currData.role
      }
      //default is reader
      else{
        emails[currData.email] = 'reader'
      }
      
      emails.push(currData.email);
    }
    //console.log(doc.id, '=>', doc.data());
  });
  console.log(emails)
  return emails
}


exports.testing = (req, res) => {

  if (req.method === 'POST') {
    let body = [];
    req.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.concat(body).toString();
      console.log(body)
      let currJSON = JSON.parse(body);
      if(currJSON.hasOwnProperty('id')){
        let currId = currJSON['id'];
        admin.auth().verifyIdToken(currId)
        .then(function(decodedToken) {
          console.log(decodedToken)
          let currEmail = decodedToken.email;
          let allEmails = getEmails()
          .then((emails) => {
            console.log(emails)
          })
          console.log(allEmails)
        }).catch(function(error) {
          
        });
      }
      res.end(body);
    });
  }
  else {
    
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello World');

  }

}






const hostname = '127.0.0.1';

const server = http.createServer(async (req, res) => {

  
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  console.log(req.method)
  /*
  if (req.method === 'POST') {
    let body = [];
    req.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.concat(body).toString();
      console.log(body)
      let currJSON = JSON.parse(body);
      if(currJSON.hasOwnProperty('id')){
        let currId = currJSON['id'];
        admin.auth().verifyIdToken(currId)
        .then(function(decodedToken) {
          console.log(decodedToken)
          let currEmail = decodedToken.email;
          let allEmails = getEmails()
          .then((emails) => {
            console.log(emails)
          })
          console.log(allEmails)
        }).catch(function(error) {
          
        });
      }
      res.end(body);
    });
  }
  else {*/
    
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello World');

  //}

});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});