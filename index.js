/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
let admin = require('firebase-admin');
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
                        console.log(emails)
                        console.log(decodedToken.email)
                        if (emails.hasOwnProperty(decodedToken.email)) {
                            console.log(emails[decodedToken.email])
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
                console.log(error)
                res.end(JSON.stringify({ 'ERROR': error }))
            });

    }

    else {

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end(req.method);

    }
    
};