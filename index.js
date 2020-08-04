/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
let admin = require('firebase-admin');
let fetch = require('node-fetch');
admin.initializeApp();

async function getSessionKey(){
  let response = await fetch("https://rest-uat.bsisystems.com/api/rest/NCI/common/logon", {
      body: "user_name=" + process.env.username + "&password="+process.env.password,
      headers: {
        Accept: "text/plain",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      method: "POST"
    })
    let sessionKey = await response.text();
    return sessionKey;
}

async function logoff(sessionKey){
  await fetch("https://rest-uat.bsisystems.com/api/rest/common/logoff", {
    headers: {
      Accept: "text/plain",
      "BSI-SESSION-ID": sessionKey,
      "Content-Type": "application/json"
    },
    method: "POST"
  })
  return "done";
}

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

  else{
    if(role == "admin" || role == "user" || role == "moderator" || role == "editor"){
      let sessionKey = await getSessionKey()
      let reqheader = req.headers;
      if(reqheader !== undefined){
        if(reqheader.hasOwnProperty('host')){
          delete reqheader.host;
        }
        if(reqheader.hasOwnProperty('user-agent')){
          delete reqheader['user-agent'];
        }
      }
      reqheader["BSI-SESSION-ID"] = sessionKey;
      //await logoff(sessionKey)
      //res.end(JSON.stringify(reqheader))
      if(typeof req.body.hasOwnProperty('batch.type')){
        res.end(JSON.stringify({'type':'String'}))
      }
      else if(req.body !== undefined && Object.keys(req.body).length != 0){
        if(req.body.hasOwnProperty('headers')){
          delete req.body.headers;
        }
        let response = await fetch("https://rest-uat.bsisystems.com/api/rest"+url, {

          headers: reqheader,
          method: req.method,
          body:req.body,
        })
        let data = await response.text()
        await logoff(sessionKey)
        
        res.end(data)
        
      }

      else{
        
        let response = await fetch("https://rest-uat.bsisystems.com/api/rest"+url, {

          headers: reqheader,
          method: req.method,
    
        })
        let data = await response.text()
        await logoff(sessionKey)
        res.end(data)
      }
  
    }
    else{
      res.end(JSON.stringify({'ERROR':'user does not have proper permissions! your role is ' + role}));
    }
  }
/*
  else if(url == "/bsiLogonPing"){
    let sessionKey = await getSessionKey()
    //sessionKey = session key
    console.log("session key: " + sessionKey)
    let response = await fetch("https://rest-uat.bsisystems.com/api/rest/common/ping", {
      headers: {
        Accept: "text/plain",
        "BSI-SESSION-ID": sessionKey,
        "Content-Type": "application/json"
      },
      method: "POST"
    })
    let data = await response.text()
    await logoff(sessionKey)
    res.end(JSON.stringify({'ping': data}))
  }
  else{
    res.statusCode = 400;
    res.end(JSON.stringify({"ERROR":url + ' does not exist'}));
  }*/
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
            token = req.headers.authorization.substring(6)
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
