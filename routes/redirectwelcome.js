/**
 * Created by mgao on 1/11/15.
 */

/**
 * Send the redirect page
 * @type {exports}
 */
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
    res.render('redirectwelcome', { title: 'TeamWatchWeb',aboutpage_extra_info:'Welcome to TeamWATCH web page. This is an ongoing project in ' +
        'Ohio University.TeamWATCH is tool ' +
        'designed for visualizing source code repository status. Acknowledgement: The 3D render part is based on' +
        'THREE.js library and modifying the provided example code. Menu bar is from cssmenumaker.com.', contact_info:' Developer: Minyuan Gao , email: mg134908@ohio.edu , 【 VitalLab , Ohio University 】',is_dataready: 2 });
});

module.exports = router;


