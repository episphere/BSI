/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
let admin = require('firebase-admin');
let fetch = require('node-fetch');
admin.initializeApp();

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
    }
    //console.log(doc.id, '=>', doc.data());
  });
  return emails
}

async function processCall(req,res,role, emails){
  let url = req.url;
  if(url == "/addUser"){
    if(role == "admin"){
      //res.end(JSON.stringify({'response':Object.keys(emails).includes(req.body.email)}));
      
      if(Object.keys(emails).includes(req.body.email) == false){
        let db = admin.firestore();
        db.collection('BSIUsers').add({
          email:req.body.email,
          name:req.body.name,
          role:req.body.role
        })
        res.statusCode = 200;
        //res.send('user added!');
        res.end(JSON.stringify({'response':'User added!'}));
        
      }
      else{
        //res.statusCode = 500;
        //res.send('user already exists');
        res.end(JSON.stringify({'response':'User already exists!'}));
      }
      
      
      
    }
    else{
      res.statusCode = 500;
      res.end(JSON.stringify({'ERROR':'user does not have proper permissions!'}));
    }
    
  }
  else if(url == "/getUserRole"){
    res.statusCode = 200;
    res.end(JSON.stringify({'role':role}))
  }
  else if(url == "/bsiLogonPing"){
    fetch("https://rest-uat.bsisystems.com/api/rest/NCI/common/logon", {
      body: "user_name=" + process.env.username + "&password="+process.env.password,
      headers: {
        Accept: "text/plain",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      method: "POST"
    })
    .then(response => response.text())
    .then(sessionKey => {

        //sessionKey = session key
        console.log(sessionKey)
        fetch("https://rest-uat.bsisystems.com/api/rest/NCI/users/current", {
          headers: {
            Accept: "application/json",
            "BSI-SESSION-ID": sessionKey,
            "Content-Type": "application/json"
          },
          method: "GET"
        })
        .then(response => response.text())
        .then(data => {
          fetch("https://rest-uat.bsisystems.com/api/rest/common/logoff", {
            headers: {
              Accept: "text/plain",
              "BSI-SESSION-ID": sessionKey,
              "Content-Type": "application/json"
            },
            method: "POST"
          })
          .then(response => res.end(JSON.stringify({'properties': data})))
          .catch(function(error){
            res.end(JSON.stringify({'error':error}))
          });
        })
      })
    .catch(function(error) {
      res.end(JSON.stringify({'error':error}))
      // Handle error
      });
  }
  else{
    res.statusCode = 400;
    res.end(JSON.stringify({"ERROR":url + ' does not exist'}));
  }
}

exports.authenticationTesting = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'GET' || req.method === 'POST') {
        let token = ''
        if (req.method === 'GET') {
            token = req.headers.authorization.substring(6)
        }
        else {
            token = req.body.headers.authorization.substring(6)
        }
        admin.auth().verifyIdToken(token)
            .then(function (decodedToken) {
                getEmails()
                    .then(function (emails) {
                        if (emails.hasOwnProperty(decodedToken.email)) {
                            processCall(req,res,emails[decodedToken.email],emails)
                            /*
                            if(req.hasOwnProperty('body') && req.body.hasOwnProperty('callType')){
                              
                              if(req.body.callType == 'addUser'){

                                if(emails[decodedToken.email] == "admin"){
                                  let db = admin.firestore();
                                  db.collection('BSIUsers').add({
                                    email:req.body.email,
                                    name:req.body.name,
                                    role:req.body.role
                                  })
                                  res.end('user added!');
                                }
                                else{
                                  res.end('failed!');
                                }
                              }
                            }
                            res.end(JSON.stringify({ 'role': emails[decodedToken.email] }));
                            */

                        }
                        else {
                            res.end(JSON.stringify({ 'role': 'Sorry you do not have access to this!' }))
                        }
                    }).catch(function (error) {
                        //console.log(error)
                        res.end(JSON.stringify({ 'ERROR': error }))
                    })

            }).catch(function (error) {
                // Handle error
                res.end(JSON.stringify({ 'ERROR': error }))
            });

    }

    else {

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end(req.method);

    }
    
};
