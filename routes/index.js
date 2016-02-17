/**
 * This js file has nothing to do with the app
 * @type {exports}
 */

var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
    //console.log(req.session_state.username+'Print form index.js');
    /*=============IF SESSION EXIST DISPAY=================*/
    if (req.session_state.username) {
        var userDATAPATH = './public/userDataStorage/' + req.session_state.username;
        displayBasicData(res, userDATAPATH);
    }
    /*==============SESSION EXPIRE, BLOCK ACCESS=============*/
    else {
        res.send(403);
    }
});


function displayBasicData(res, userDATAPATH) {
    var fs_readAccessdata = require('fs');
    fs_readAccessdata.readFile(userDATAPATH+'/access_data', 'utf8', function (err, data) {
        if (err) {//HANDLE READING THE DATA
            console.log(err);
            res.send("Error,Could not read the data.");
        }
        else {//IF FILE EXIST, USER ALREADY AUTHORIZED DISPLAY THE DATA.
            var json_data = JSON.parse(data);
            var Request_byAPI = require('request');

            /*GET OAUTH FINAL DATA READY*/
            var oauth_toauth = {
                consumer_key: json_data.oauth_consumer_key,
                consumer_secret: json_data.oauth_consumer_secret,
                token: json_data.oauth_token,
                token_secret: json_data.oauth_token_secret
            };

            /**
             * HERE,A DIFFERENT WAY OF USING REQUEST TO GET AUTH TO THE BITBUCKET SERVER FOR DATA,OLD WAY NOT WORKING
             * WELL,THE 'URL' PART IS THE ACTUAL API TO FILL IN FOR THE CALL
             */

            var user_dataToPass;
            var repo_dataTopass;

            /*HERE FORMATING THE CODE IN A BLOCK WAY SINCE DATA NEEDS TO BE ALL READY*/
            /*=======================Now ready to call the API=====================================*/
            Request_byAPI.get({url: 'https://bitbucket.org/api/1.0/user/', oauth: oauth_toauth, json: true}, function (e, r, data_user) {
                Request_byAPI.get({url: 'https://bitbucket.org/api/1.0/user/repositories/', oauth: oauth_toauth, json: true}, function (e, r, data_repo) {
                    //console.log(data_user);
                    console.log('---------------------------------------------------------------------');
                    console.log("User and repository data fetched successfully...");
                    console.log('---------------------------------------------------------------------');
                    user_dataToPass = data_user;
                    repo_dataTopass = data_repo;
                    var accountrepoNumbers=data_repo.length;
                    var fs_write = require('fs');
                    /*store the temp key and signature*/
                    fs_write.writeFile(userDATAPATH+'/repolist.json', JSON.stringify(repo_dataTopass, null, 4), function (err) {
                        if (err) return console.log(err);
                        console.log('---------------------------------------------------------------------');
                        console.log("Form File saved to temp dir locally...");
                        console.log('---------------------------------------------------------------------');
                        /*==================DATA IS READY DISPLAY IT================================*/
                        var userinfo_json = (user_dataToPass).user;
                        var username = userinfo_json.username;
                        var displayname = userinfo_json.display_name;
                        var isStaff = userinfo_json.is_staff;
                        var isTeam = userinfo_json.is_team;
                        res.render('index', { title: 'TeamWatchWeb',uidForJSON:username, user_name: username, display_name: displayname,
                            is_staff: isStaff, is_team: isTeam,account_reponumber:"   "+ accountrepoNumbers, is_dataready: 1 });
                        /*==================END DATA DISPLAY =======================================*/
                    });
                });
            });
            /*=======================End calling the bitbucket API==================================*/

        }
    });

}


/**
 * This is the return value of this whole file
 * called by     var routes = require('./routes/index');
 * in app.js with the parameter passed in of ./routes/index
 * The router here declared at the top get adjust by our routes
 * and return as module exports
 */

module.exports = router;
