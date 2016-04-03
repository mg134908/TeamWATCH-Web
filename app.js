/**
 * This app js file give the global instruction how the this app should do
 *
 */

var express = require('express');
var clientSessions = require('client-sessions');/////////
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var requestIp = require('request-ip');//modlue for retrive client IP address
var routes = require('./routes/index');
var index = require('./routes/index');
var users = require('./routes/users');
var about = require('./routes/about');
var accessverify = require('./routes/accessverify');
var redirectwelcome = require('./routes/redirectwelcome');
var app = express();

console.log('App running...');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(clientSessions({secret: 'lkjwernLKJEWORNoeurOIWhqLKerwqLSqwopgDIqwUBwqwVqwXwtaAegetjOsfwNUPNJDbuwbncv',//this secret is created randomly
    duration: 15 * 60 * 1000,//15 min session
    activeDuration: 1000 * 60 * 5}));//

console.log("The path:" + __dirname);
var DIRPATH = __dirname;//.../teamwatchweb


/*READ SERVER RECORD WHEN START*/
var FS_SERVERINFO = require('fs');
var JSON_SERVERINFO;//Json serverinfo
var PAGEVISIT_COUNTERLOCAL;//For local debug
var PAGEVISIT_COUNTER;//For web visit
FS_SERVERINFO.readFile('./serverData/SERVERINFO.json', 'utf8', function (err, data) {
    if (err) {
        return console.log(err);
    } else {
        JSON_SERVERINFO = JSON.parse(data);
        PAGEVISIT_COUNTERLOCAL = JSON_SERVERINFO.RootPageVisitCountLocal;
        PAGEVISIT_COUNTER = JSON_SERVERINFO.RootPageVisitCount;
    }
    console.log('---------------------------------------------------------------------');
    console.log("Local Page visit number: " + PAGEVISIT_COUNTERLOCAL);
    console.log("Page visit number: " + PAGEVISIT_COUNTER);
    console.log('---------------------------------------------------------------------');

});


/**
 * ROOT PATH, SESSION EXIST, SHOW VIEW, OTHERWISE REDIRECT
 */
app.get('/', function (req, res) {
    //Check session when user Request our app via URL
    if (req.session_state.username) {
        console.log('Printout form get / request from username is:', req.session_state.username);
        /*
         * This line check Session existence.
         * If it existed will do some action.
         */
        res.redirect('/index');//main
    }
    else {
        res.redirect('/redirectwelcome');
        //res.redirect('/accessverify');//Use access code to control the amount of user to the website
    }

    //Updating ServerInfo
    var clientIp = requestIp.getClientIp(req); //
    var datetime = new Date();
    console.log('---------------------------------------------------------------------');
    console.log("Root Page GET Request from clientIP:" + clientIp + " " + "Timestamp: " + datetime);
    console.log('---------------------------------------------------------------------');
    console.log('---------------------------------------------------------------------');
    console.log('Current remote page visit count:'+PAGEVISIT_COUNTER);
    console.log('---------------------------------------------------------------------');


    if(clientIp=='127.0.0.1'){
        PAGEVISIT_COUNTERLOCAL++;
        JSON_SERVERINFO.RootPageVisitCountLocal = PAGEVISIT_COUNTERLOCAL;
    }else{
        PAGEVISIT_COUNTER++;
        JSON_SERVERINFO.RootPageVisitCount = PAGEVISIT_COUNTER;
        var tempclientIPInfo={
            clientIp:clientIp,
            timestamp:datetime
        };
        JSON_SERVERINFO.VisitRecord.push(tempclientIPInfo);
    }

    FS_SERVERINFO.writeFile(DIRPATH + '/serverData/SERVERINFO.json', JSON.stringify(JSON_SERVERINFO, null, 4), function (err) {
        if (err) {
            return console.log(err);
        } else {
            console.log('---------------------------------------------------------------------');
            console.log("ServerInfo Updated...");
            console.log('---------------------------------------------------------------------');
        }
    });

});

/**
 * PATH FOR RESETTING THE SESSION WHEN USER LOGOUT, ALSO DESTROY THE TEMP USER DATA.
 */
app.get('/oauthlogout', function (req, res) {
    /*User logout reset the session*/
    if (req.session_state.username) {
        console.log('---------------------------------------------------------------------');
        console.log('User ' + req.session_state.username + ' logging out...');
        console.log('---------------------------------------------------------------------');
        var userDirToRemove = DIRPATH + '/public/userDataStorage/' + req.session_state.username;
        req.session_state.reset();//destory the session
        /*CLEAN THE USER TEMP DATA*/
        rimraf(userDirToRemove, function (err) {
            if (err) {
                console.log(err);
                throw err;
            }
            // done
            else {
                /*SUCCESSFULLY REMOVED USER DATA REDIRECT*/
                console.log('---------------------------------------------------------------------');
                console.log('User temp data successfully cleaned,redirecting...');
                console.log('---------------------------------------------------------------------');

                res.redirect('/');
            }
        });

    }
    else {
        console.log('---------------------------------------------------------------------');
        console.log('User session ended...');
        console.log('---------------------------------------------------------------------');
        res.redirect('/redirectwelcome');
    }


});

/**
 * PATH FOR GET LAST OAUTH STEP CALLBACK URL,COLLECT USER ACCESS TOKEN AND STORE IT TEMPORARY
 */
app.get('/authed', function (req, res) {
    if (req.query.oauth_verifier == undefined || req.query.oauth_token == undefined) {
        res.send(403);//Block the access
    } else {
        /*=================================================================*/
        var OAuth = require('oauth-1.0a');
        var Request = require('request');
        var oauth;
        var request_data;

        /**
         *  Here process oauth step 4 to send a http POST request to get he access token with the token verifier========
         returned from last step
         */
        //READ KEY IN
        var fs_readkey = require('fs');
        var json_key;
        fs_readkey.readFile('./public/temp/key_data', 'utf8', function (err, data) {
            if (err) {
                return console.log(err);
            }
            json_key = JSON.parse(data);
            //FORMING URL
            oauth = OAuth({
                consumer: {
                    public: json_key.public_key,
                    secret: json_key.secret_key
                },
                signature_method: 'HMAC-SHA1',
                verifier: req.query.oauth_verifier
            });

            var token = {
                public: json_key.oauth_token,
                secret: json_key.oauth_token_secret
            };

            request_data = {
                url: 'https://bitbucket.org/api/1.0/oauth/access_token/',
                method: 'POST'
            };

            var oauth_data = oauth.authorize(request_data, token);
            var form_tosend = {oauth_version: oauth_data.oauth_version, oauth_nonce: oauth_data.oauth_nonce,
                oauth_timestamp: oauth_data.oauth_timestamp.toString(), oauth_consumer_key: oauth_data.oauth_consumer_key,
                oauth_signature_method: oauth_data.oauth_signature_method, oauth_signature: oauth_data.oauth_signature,
                oauth_verifier: req.query.oauth_verifier.toString(), oauth_token: oauth_data.oauth_token
            };

            Request({
                url: request_data.url,
                method: request_data.method,
                form: form_tosend
            }, function (error, response, body) {
                /*======================Save IMPORTANT access token the file locally=====================*/
                var bodydata = oauth.deParam(body);
                var json_datatosave = {
                    oauth_timestamp: form_tosend.oauth_timestamp,//for session time count
                    oauth_consumer_key: json_key.public_key,
                    oauth_consumer_secret: json_key.secret_key,
                    oauth_token: bodydata.oauth_token,//this step is the access token
                    oauth_token_secret: bodydata.oauth_token_secret//secret
                };
                //console.log(json_datatosave);

                var oauth_toauth = {
                    consumer_key: json_datatosave.oauth_consumer_key,
                    consumer_secret: json_datatosave.oauth_consumer_secret,
                    token: json_datatosave.oauth_token,
                    token_secret: json_datatosave.oauth_token_secret
                };
                if (bodydata.oauth_token != undefined) {//VALID URL WITH OAUTH DATA CALL BACK
                    /*=======================CALL API GET USER ID==========================*/
                    var Request_byAPI = require('request');
                    Request_byAPI.get({url: 'https://bitbucket.org/api/1.0/user/', oauth: oauth_toauth, json: true}, function (e, r, data_user) {
                       if(!e){//DATA FETCHED SUCCESSFULLY
                           /*GET THE USERNAME*/
                           var userinfo_json = (data_user).user;
                           var user_name = userinfo_json.username;
                           var dirToCreate = DIRPATH + '/public/userDataStorage/';
                           dirToCreate = dirToCreate + user_name;
                           /*CREATE DIR*/
                           mkdirp(dirToCreate, function (err) {
                               if (err) console.error(err);//ERROR CREATING DIR
                               else {
                                   console.log('---------------------------------------------------------------------');
                                   console.log('Directory Created' + dirToCreate);
                                   console.log('---------------------------------------------------------------------');
                                   /*STORE THE API CALL REQUIRED DATA*/
                                   var fs_write = require('fs');
                                   fs_write.writeFile(dirToCreate + '/access_data', JSON.stringify(json_datatosave, null, 4), function (err) {
                                       if (err) return console.log(err);
                                       console.log('---------------------------------------------------------------------');
                                       console.log("Form File saved to temp dir locally...");
                                       console.log('---------------------------------------------------------------------');

                                       /*OAUTH PART COMPLETE SET THE SESSION USERNAME*/
                                       req.session_state.username = user_name;
                                       console.log('---------------------------------------------------------------------');
                                       console.log(req.session_state.username + ' Authed in.......');
                                       console.log('---------------------------------------------------------------------');
                                       res.redirect('/');
                                   });
                               }
                           });
                       }else{//ERROR FETCHING DATA
                           console.log(e);
                           res.send('Error Fetching Data from Bitbucket.');
                       }
                    });
                } else {//INVALID URL WITH OAUTH VERIFIER AND OAUTH TOKEN
                    console.log('The body info:');
                    console.log(body);
                    res.send(403);//Block the access
                }
            });

        });
    }
});


/**
 * PATH FOR GET REPO JSON DATA
 */
app.get('/getjson', function (req, res) {


    if (req.session_state.username) {
        console.log('---------------------------------------------------------------------');
        console.log('GETJSON get request from username: ' + req.query.username);
        console.log('---------------------------------------------------------------------');
        var fs_readJSON = require('fs');
        fs_readJSON.readFile(DIRPATH + '/public/userDataStorage/' + req.query.username + '/repolist.json', 'utf8', function (err, data) {
            if (err) {//HANDLE ERROR WITH READING THE DATA
                console.log(err);
                res.send("Error,Could not read the data.");
            } else {
                var json_data = JSON.parse(data);
                res.send(json_data);
            }
        });

    }//END SESSION EXIST IF
    else {
        console.log('---------------------------------------------------------------------');
        console.log('User session ended...');
        console.log('---------------------------------------------------------------------');
        res.redirect('/redirectwelcome');
    }

});


/**
 * PATH FOR SENDING THE RENDERING SCRIPT
 */
app.get('/script', function (req, res) {
    //Check session when user Request our app via URL
    if (req.session_state.username) {
        console.log('---------------------------------------------------------------------');
        console.log('Ajax request for script form user ' + req.session_state.username);
        console.log('---------------------------------------------------------------------');
        res.sendfile('./public/javascripts/repo3Drender.js');//SEND THE RENDERING MODEL SCRIPT FILE
    }
    else {
        console.log('---------------------------------------------------------------------');
        console.log('User session ended...');
        console.log('---------------------------------------------------------------------');
        res.redirect('/redirectwelcome');
    }
});


app.post('/reposlug', function (req, res) {

    //Check session when user Request our app via URL
    if (req.session_state.username) {
        console.log('---------------------------------------------------------------------');
        console.log('Post request form user ' + req.session_state.username);
        console.log('---------------------------------------------------------------------');

        var repo_slug = req.body.repo_slug;
        var repo_name = req.body.repo_name;
        var repo_owner = req.body.repo_owner;
        var repo_callPath=repo_owner+"/"+repo_slug;

        console.log('repo_slug' + repo_slug);
        console.log('repo_owner' + repo_owner);
        var fs_write_REPOFINAL = require('fs');

        if (fs_write_REPOFINAL.existsSync(DIRPATH + '/public/userDataStorage/' + req.session_state.username + '/' + repo_slug + 'changeset.json')) {
            //File already exist.
            res.sendfile('./public/userDataStorage/' + req.session_state.username + '/' + repo_slug + 'changeset.json');

        }
        else {
            //File not exist request data
            /*===============================================================================================================*/
            var Request_byAPI = require('request');
            var fs_readAccessdata = require('fs');
            fs_readAccessdata.readFile('./public/userDataStorage/' + req.session_state.username + '/access_data', 'utf8', function (err, data) {
                if (err) {//HANDLE READING THE DATA
                    console.log(err);
                    res.send("Error,Could not read the data.");
                } else {
                    var json_data = JSON.parse(data);
                    /*GET OAUTH FINAL DATA READY*/
                    var oauth_toauth = {
                        consumer_key: json_data.oauth_consumer_key,
                        consumer_secret: json_data.oauth_consumer_secret,
                        token: json_data.oauth_token,
                        token_secret: json_data.oauth_token_secret
                    };

                    /*REPO CHANGESET DATA PRE FETCHING*/
                    Request_byAPI.get({url: 'https://bitbucket.org/api/1.0/repositories/' + repo_owner + '/' + repo_slug + '/changesets?limit=50', oauth: oauth_toauth, json: true}, function (e, r, data_repo) {
                        var repo_changesetData = data_repo;
                        var JSONCHANGESET_TOSAVE = [

                        ];

                        /*Record repo changeset information*/
                        var repo_changeset_info=[];
                        for (var i = 0; i < repo_changesetData.changesets.length; i++) {
                            var tempData={
                                node:repo_changesetData.changesets[i].node,
                                date:repo_changesetData.changesets[i].timestamp,
                                message:repo_changesetData.changesets[i].message

                            };
                            repo_changeset_info.push(tempData);

                        }


                        var JSONREPO_DATA_FINAL = {
                            repo_name: repo_name,
                            repo_callPath:repo_callPath,
                            repo_changeset_list:repo_changeset_info,
                            repo_file: [

                            ]

                        };


                        /*TESTING PRINT repo_changesetdata*/
                        //console.log(repo_changesetData);

                        /*ALL CHANGE SET FETCHED,SET THE FILE BLOCK AXIS*/
//                      if(repo_changesetData.count<repo_changesetData.limit){
                        if (repo_changesetData.count > 0) {//Right now we only focus the change set great than zero for at most latest 50 changesets
                            // console.log(repo_changesetData.changesets.length);
                            for (var i = 0; i < repo_changesetData.changesets.length; i++) {

                                var j = 0;
                                while (j != repo_changesetData.changesets[i].files.length) {
                                    if (repo_changesetData.changesets[i].files[j].type == "added") {
                                        if ((repo_changesetData.changesets[i].files[j].file).indexOf("/") == -1) {

                                            /*Check Existance*/
                                            var tempfilepath=repo_changesetData.changesets[i].files[j].file;;
                                            var is_exist = false;
                                            /*CHECK IF ALREADY EXIST DURING PREVIOUS CONSTRUCTION*/
                                            for (var n = 0; n < JSONREPO_DATA_FINAL.repo_file.length; n++) {
                                                if (tempfilepath == JSONREPO_DATA_FINAL.repo_file[n].filefullpath) {
                                                    is_exist = true;
                                                    break;
                                                }
                                            }

                                            if(!is_exist){
                                                var filename = (repo_changesetData.changesets[i].files[j].file);
                                                JSONCHANGESET_TOSAVE.push([repo_changesetData.changesets[i].files[j].file, "1", "1", "/"]);
                                                JSONREPO_DATA_FINAL.repo_file.push({
                                                    file_rawdata: [repo_changesetData.changesets[i].files[j].file, "1", "1", "/"],
                                                    filename: filename,
                                                    filefullpath: filename,
                                                    file_axis: "0 0",
                                                    file_block_level: [
                                                        {
                                                            operation: "created",
                                                            block_height: 10,
                                                            commit_time: repo_changesetData.changesets[i].timestamp,
                                                            raw_author:repo_changesetData.changesets[i].raw_author,
                                                            author:repo_changesetData.changesets[i].author
                                                        }
                                                    ]
                                                });

                                            }


                                        } else {
                                            /*Check Existance*/
                                            var tempfilepath=repo_changesetData.changesets[i].files[j].file;;
                                            var is_exist = false;
                                            /*CHECK IF ALREADY EXIST DURING PREVIOUS CONSTRUCTION*/
                                            for (var n = 0; n < JSONREPO_DATA_FINAL.repo_file.length; n++) {
                                                if (tempfilepath == JSONREPO_DATA_FINAL.repo_file[n].filefullpath) {
                                                    is_exist = true;
                                                    break;
                                                }
                                            }


                                            if(!is_exist){
                                                var filename = repo_changesetData.changesets[i].files[j].file.replace(/^.*[\\\/]/, '');
                                                var tmpindex = (repo_changesetData.changesets[i].files[j].file).search(filename);
                                                var truepath = (repo_changesetData.changesets[i].files[j].file).substring(0, tmpindex);
                                                JSONCHANGESET_TOSAVE.push([filename, "1", "1", truepath]);
                                                JSONREPO_DATA_FINAL.repo_file.push({
                                                    file_rawdata: [filename, "1", "1", truepath],
                                                    filename: filename,
                                                    filefullpath: repo_changesetData.changesets[i].files[j].file,
                                                    file_axis: "0 0",
                                                    file_block_level: [
                                                        {
                                                            operation: "created",
                                                            block_height: 10,
                                                            commit_time: repo_changesetData.changesets[i].timestamp,
                                                            raw_author:repo_changesetData.changesets[i].raw_author,
                                                            author:repo_changesetData.changesets[i].author

                                                        }
                                                    ]
                                                });
                                            }

                                        }//END ELSE ROOT FILE
                                    } else {
                                        //Handle modified
                                        var modifyfilepath = repo_changesetData.changesets[i].files[j].file;
                                        var is_exist = false;
                                        /*CHECK IF ALREADY EXIST DURING PREVIOUS CONSTRUCTION*/
                                        for (var n = 0; n < JSONREPO_DATA_FINAL.repo_file.length; n++) {
                                            if (modifyfilepath == JSONREPO_DATA_FINAL.repo_file[n].filefullpath) {
                                                is_exist = true;
                                                break;
                                            }
                                        }

                                        /*CREATE FILE BLOCK IF NOT EXIST*/
                                        if (is_exist == false) {
                                            var filename = repo_changesetData.changesets[i].files[j].file.replace(/^.*[\\\/]/, '');
                                            var tmpindex = (repo_changesetData.changesets[i].files[j].file).search(filename);
                                            var truepath = (repo_changesetData.changesets[i].files[j].file).substring(0, tmpindex);
                                            JSONCHANGESET_TOSAVE.push([filename, "1", "1", truepath]);
                                            JSONREPO_DATA_FINAL.repo_file.push({
                                                file_rawdata: [filename, "1", "1", truepath],
                                                filename: filename,
                                                filefullpath: repo_changesetData.changesets[i].files[j].file,
                                                file_axis: "0 0",
                                                file_block_level: [
                                                    {
                                                        operation: "created",
                                                        block_height: 10,
                                                        commit_time: repo_changesetData.changesets[i].timestamp,
                                                        raw_author:repo_changesetData.changesets[i].raw_author,
                                                        author:repo_changesetData.changesets[i].author

                                                    }
                                                ]
                                            });
                                        }

                                    }//END IF ADDED
                                    j++;
                                }//END WHILE
                            }//END FOR

                            /*================FILE SOTRE============*/
                        }


                        /*FORMING THE FILE BLOCK LEVEL*/
                        //console.log(repo_changesetData);
                        console.log('---------------------------------------------------------------------');
                        console.log('#####################################################################');
                        console.log("Repository changesets data fetched successfully...");
                        console.log('#####################################################################');
                        console.log('---------------------------------------------------------------------');


                        //LIST CONTAINER FOR HANDLING REQUEST RETURNING ORDER
                        var listChangesetRawNodeByTime = [];
                        for (var i = 0; i < repo_changesetData.changesets.length; i++) {
                            var tmpdata = {raw_node: repo_changesetData.changesets[i].raw_node,
                                raw_author: repo_changesetData.changesets[i].raw_author,
                                author:repo_changesetData.changesets[i].author,
                                commit_node: repo_changesetData.changesets[i].node,
                                commit_time: repo_changesetData.changesets[i].timestamp,
                                commit_message: repo_changesetData.changesets[i].message,
                                changeset: []};
                            listChangesetRawNodeByTime.push(tmpdata);
                        }


                        /*FETCHING ALL THE CHANGESET BY REQUEST*/
                        var statusCounter = 0;//COUNTER FOR STATUS POLLING CHECKING
                        for (var i = 0; i < listChangesetRawNodeByTime.length; i++) {
                            var rawnode = listChangesetRawNodeByTime[i].raw_node;
                            Request_byAPI.get({url: 'https://bitbucket.org/api/1.0/repositories/'
                                + repo_owner + '/' + repo_slug + '/changesets/'
                                + rawnode + '/diffstat/', oauth: oauth_toauth, json: true}, function (e, r, data_repo) {
                                var reqpath = r.socket._httpMessage.path;
                                var tempindex = reqpath.indexOf("changesets");
                                var reqrawnode = reqpath.substring(tempindex + 11, tempindex + 51);//40 char for a raw node
                                //PUT THEM IN RIGHT PLACE
                                for (var i = 0; i < listChangesetRawNodeByTime.length; i++) {
                                    if (reqrawnode == listChangesetRawNodeByTime[i].raw_node) {
                                        listChangesetRawNodeByTime[i].changeset = data_repo;
                                        statusCounter++;//INCREASE COUNTER
                                    }
                                }
                            });
                        }


                        /*POLLING PROCESS CHECK STATUS EVERY SECOND*/
                        var interval = setInterval(function () {
                            //IF ALL DATA BEEN FETCHED, BUILD THE COMMIT BLOCK LEVEL
                            if (statusCounter == listChangesetRawNodeByTime.length) {
                                clearInterval(interval);
//                                for (var i = 0; i < listChangesetRawNodeByTime.length; i++) {
//                                    console.log('==================================================');
//                                    console.log(listChangesetRawNodeByTime[i].changeset);
//                                }

                                for (var i = 0; i < listChangesetRawNodeByTime.length; i++) {
                                    for (var j = 0; j < listChangesetRawNodeByTime[i].changeset.length; j++) {
                                        for (var k = 0; k < JSONREPO_DATA_FINAL.repo_file.length; k++) {
                                            if (listChangesetRawNodeByTime[i].changeset[j].file == JSONREPO_DATA_FINAL.repo_file[k].filefullpath) {
                                                var tmpJSONblock = {
                                                    operation: listChangesetRawNodeByTime[i].changeset[j].type,
                                                    remove_height: listChangesetRawNodeByTime[i].changeset[j].diffstat.removed,
                                                    add_height: listChangesetRawNodeByTime[i].changeset[j].diffstat.added,
                                                    raw_node: listChangesetRawNodeByTime[i].raw_node,
                                                    raw_author: listChangesetRawNodeByTime[i].raw_author,//user name with email
                                                    author:listChangesetRawNodeByTime[i].author,//the id
                                                    commit_node: listChangesetRawNodeByTime[i].commit_node,
                                                    commit_time: listChangesetRawNodeByTime[i].commit_time,
                                                    commit_message: listChangesetRawNodeByTime[i].commit_message
                                                };
                                                JSONREPO_DATA_FINAL.repo_file[k].file_block_level.push(tmpJSONblock);
                                                break;
                                            }
                                        }

                                    }

                                }


                                /*SAVE FILE TO USER DIR*/
                                fs_write_REPOFINAL.writeFile(DIRPATH + '/public/userDataStorage/' + req.session_state.username + '/'
                                    + repo_slug + 'changeset.json', JSON.stringify(JSONREPO_DATA_FINAL, null, 4), function (err) {
                                    if (err) return console.log(err);
                                    console.log('---------------------------------------------------------------------');
                                    console.log("Form File saved to temp dir locally...");
                                    console.log('---------------------------------------------------------------------');
                                    res.sendfile('./public/userDataStorage/' + req.session_state.username + '/' + repo_slug + 'changeset.json');//SEND THE RENDERING MODEL SCRIPT FILE

                                });
                            }
                        }, 1000);


                    });//REQUEST CHANGESET
                }//END ELSE READING DATA ERROR
            });
        }//END FILE EXITS ELSE
    }//END SESSION EXIST IF
    else {
        console.log('User session ended...');
        res.redirect('/redirectwelcome');
    }

});


/**
 * PATH FOR SENDING THE RENDERING SCRIPT
 */
app.get('/repochangesetjson', function (req, res) {
    //Check session when user Request our app via URL
    if (req.session_state.username) {
        console.log('---------------------------------------------------------------------');
        console.log('Ajax request for script form user ' + req.session_state.username);
        console.log('---------------------------------------------------------------------');
        res.sendfile('./public/userDataStorage/' + req.query.username + '/repochangeset.json');//SEND THE RENDERING MODEL SCRIPT FILE
    }
    else {
        console.log('---------------------------------------------------------------------');
        console.log('User session ended...');
        console.log('---------------------------------------------------------------------');
        res.redirect('/redirectwelcome');
    }
});


/**
 * PATH FOR HANDLING THE POST REQUEST TO PROCESS THE FORM SENDING TO OAUTH PROCESS
 */
app.post('/send', function (req, res) {
    /*Record client request IP*/
    var clientIp = requestIp.getClientIp(req); //
    console.log('---------------------------------------------------------------------');
    console.log('Post Request from clientIP ###### :' + clientIp);
    console.log('---------------------------------------------------------------------');
    /*=============Process the oauth part to form the post url to get authorize==================================*/
    var Request = require('request');
    var OAuth = require('oauth-1.0a');
    var oauth = OAuth({
        consumer: {
            public: req.body.public_key,
            secret: req.body.secret_key
        },
        signature_method: 'HMAC-SHA1'
    });

    var request_data;
    if(clientIp=='127.0.0.1'){
        request_data = {
            url: 'https://bitbucket.org/api/1.0/oauth/request_token/',
            method: 'POST',
            data: {
                oauth_callback: "http://127.0.0.1:9000/authed"
            }
        };

    }else{
        request_data = {
            url: 'https://bitbucket.org/api/1.0/oauth/request_token/',
            method: 'POST',
            data: {
                oauth_callback: "http://teamwatchweb.herokuapp.com/authed"
            }
        };
    }

    var oauth_token;//This step is the request token
    var oauth_token_secret;
    var oauth_dataform = oauth.authorize(request_data);

    Request({
        url: request_data.url,
        method: request_data.method,
        form: oauth_dataform
    }, function (error, response, body) {
        var bodydata = oauth.deParam(body);//get the data from the body
        oauth_token = bodydata.oauth_token;//token before authorize
        oauth_token_secret = bodydata.oauth_token_secret;
        var oauth_url = "https://bitbucket.org/api/1.0/oauth/authenticate?oauth_token=";
        oauth_url = oauth_url + oauth_token;

        /*======================Save the file locally=====================*/
        var json_datatosave = {
            public_key: req.body.public_key,
            secret_key: req.body.secret_key,
            oauth_signature: oauth_dataform.oauth_signature,
            oauth_token: oauth_token,
            oauth_token_secret: oauth_token_secret
        };
        var fs_write = require('fs');
        /*store the temp key and signature*/
        fs_write.writeFile('./public/temp/key_data', JSON.stringify(json_datatosave, null, 4), function (err) {
            if (err) return console.log(err);
            console.log('---------------------------------------------------------------------');
            console.log("Form File saved to temp dir locally...");
            console.log('---------------------------------------------------------------------');
        });
        /*======================End save the file locally=====================*/
        /*Finally pass the URL to grant access*/
        res.render('oauthlogin', {oauth_redirect_link: oauth_url});
    });
    /*=============End processing the oauth part===========================================================*/

});


/**
 * PATH FOR HANDLING SIMPLE ACCESS CODE CONTROL
 */
app.post('/accesscode', function (req, res) {
    var clientIp = requestIp.getClientIp(req); //
    var datetime = new Date();
    console.log('---------------------------------------------------------------------');
    console.log("Post Request from clientIP:" + clientIp + " " + "Timestamp: " + datetime);
    console.log('---------------------------------------------------------------------');
    console.log('---------------------------------------------------------------------');
    console.log("Client attempted access code:");
    console.log(req.body.accesscode);
    console.log('---------------------------------------------------------------------');

    /*ACCESS CODE VALID*/
    if (req.body.accesscode =='vital755') {
        res.redirect('/redirectwelcome');
    } else {
        res.render('accessverify', {accessinfo: "Access Code Error, Please Retry."});
    }

});


//Tell the app how to use the route
app.use('/', routes);//'/' means use it on everything
app.use('/index', index);
app.use('/users', users);
app.use('/about', about);
app.use('/redirectwelcome', redirectwelcome);
app.use('/accessverify', accessverify);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
